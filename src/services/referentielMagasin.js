/**
 * Service de gestion du référentiel magasin (liaison EAN ↔ ITM)
 *
 * Charge un fichier Excel exporté du SI magasin (format Mercalys "LISTE PLU PDV")
 * et construit une table de liaison EAN → ITM8 spécifique au point de vente.
 *
 * Ce fichier est OPTIONNEL : si le magasin ne le fournit pas, l'app fonctionne
 * normalement avec les niveaux 1-3 (ITM8 direct, fuzzy, mots-clés).
 *
 * Structure du fichier attendu :
 *   Ligne 1 : "SAS XXXXX - Numéro point de vente : XXXXX"
 *   Ligne 2 : "LISTE PLU PDV"
 *   Ligne 3 : "Date : DD/MM/YYYY HH:MM:SS"
 *   Ligne 5 : En-têtes (Section Balance | Code PLU | Libellé PLU | Touche Balance | ITM | EAN | Prix vente | ...)
 *   Lignes 6+ : Données produits
 */

import * as XLSX from 'xlsx';
import { getReferentielCache, mapFamilleV2VersRayon } from './referentielITM8';
import { classifierProduit } from './productClassifier';

/**
 * Normalise un code ITM brut (13 chiffres avec zéros de tête) en ITM8
 * Ex: "0000047416080" → 47416080 (nombre)
 *     "0000018345348" → 18345348 (nombre)
 *
 * @param {string|number} itmBrut - Code ITM brut du fichier magasin
 * @returns {number|null} Code ITM8 normalisé (nombre) ou null si invalide
 */
export const normaliserITM = (itmBrut) => {
  const s = String(itmBrut || '').trim();
  if (!s || s === '0') return null;

  // Retirer les zéros de tête
  const stripped = s.replace(/^0+/, '');
  if (!stripped) return null;

  const num = Number(stripped);
  return isNaN(num) ? null : num;
};

/**
 * Normalise un code EAN pour comparaison
 * Garde le format string car les EAN peuvent commencer par "0"
 *
 * @param {string|number} ean - Code EAN brut
 * @returns {string} EAN normalisé (string trimmé)
 */
const normaliserEAN = (ean) => {
  return String(ean || '').trim();
};

/**
 * Détecte si un fichier Excel est un fichier de type "LISTE PLU PDV" (Mercalys)
 * en vérifiant les premières lignes.
 *
 * @param {Array<Array>} rows - Lignes brutes du fichier (sheet_to_json header:1)
 * @returns {boolean}
 */
const detecterFormatMercalys = (rows) => {
  if (!rows || rows.length < 5) return false;

  // Ligne 1 ou 2 doit contenir "PLU" ou "LISTE PLU"
  const ligne1 = String(rows[0]?.[0] || '').toUpperCase();
  const ligne2 = String(rows[1]?.[0] || '').toUpperCase();
  if (ligne1.includes('LISTE PLU') || ligne2.includes('LISTE PLU')) return true;

  // Ou vérifier les en-têtes (ligne 5 = index 4)
  const headers = rows[4] || [];
  const headersStr = headers.map(h => String(h || '').toUpperCase());
  return headersStr.some(h => h.includes('ITM')) && headersStr.some(h => h.includes('EAN'));
};

/**
 * Trouve l'index d'une colonne par recherche de mots-clés dans les en-têtes.
 *
 * @param {Array<string>} headers - En-têtes normalisés (uppercase)
 * @param {Array<string>} motsCles - Mots-clés à chercher
 * @returns {number} Index de la colonne trouvée, ou -1
 */
const trouverColonne = (headers, motsCles) => {
  for (let i = 0; i < headers.length; i++) {
    const h = (headers[i] || '').toUpperCase().trim();
    for (const mot of motsCles) {
      if (h.includes(mot.toUpperCase())) return i;
    }
  }
  return -1;
};

/**
 * Charge et parse un fichier de référentiel magasin (LISTE PLU PDV Mercalys).
 *
 * @param {File} file - Fichier Excel sélectionné par l'utilisateur
 * @returns {Object|null} Référentiel magasin parsé, ou null si erreur/format invalide
 *
 * Retour : {
 *   eanToItm8: Map<string, number>,      // EAN (string) → ITM8 (nombre)
 *   eanToLibelle: Map<string, string>,    // EAN → Libellé PLU du magasin
 *   eanToPrixVente: Map<string, number>,  // EAN → Prix de vente unitaire TTC
 *   itm8ToEans: Map<number, string[]>,    // ITM8 → liste d'EAN
 *   itm8ToLibelle: Map<number, string>,   // ITM8 → Libellé du premier EAN trouvé
 *   magasin: { nom: string, code: string },
 *   dateExtraction: string,
 *   stats: { totalLignes, itmUniques, eanUniques }
 * }
 */
export const chargerReferentielMagasin = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    // Prendre la première feuille non vide
    let worksheet = null;
    let sheetName = '';
    for (const name of workbook.SheetNames) {
      const ws = workbook.Sheets[name];
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      if (range.e.r > 5) { // Au moins 6 lignes
        worksheet = ws;
        sheetName = name;
        break;
      }
    }

    if (!worksheet) return null;

    // Lire comme tableau 2D (sans headers auto-détectés)
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (!detecterFormatMercalys(rows)) {
      // Pas un fichier LISTE PLU PDV → null
      return null;
    }

    // Extraire les métadonnées des premières lignes
    const ligne1 = String(rows[0]?.[0] || '');
    const ligne3 = String(rows[2]?.[0] || '');

    // Nom et code magasin depuis ligne 1 : "SAS CANAMAST - Numéro point de vente : 9839"
    let nomMagasin = '';
    let codeMagasin = '';
    const matchMagasin = ligne1.match(/^(.+?)\s*-\s*Num[eé]ro\s+point\s+de\s+vente\s*:\s*(\d+)/i);
    if (matchMagasin) {
      nomMagasin = matchMagasin[1].trim();
      codeMagasin = matchMagasin[2].trim();
    }

    // Date d'extraction depuis ligne 3
    let dateExtraction = '';
    const matchDate = ligne3.match(/Date\s*:\s*(.+)/i);
    if (matchDate) {
      dateExtraction = matchDate[1].trim();
    }

    // Trouver la ligne d'en-têtes (normalement ligne 5 = index 4)
    let headerRowIdx = 4;
    // Recherche flexible : la première ligne contenant "ITM" et "EAN"
    for (let i = 0; i < Math.min(10, rows.length); i++) {
      const rowStr = (rows[i] || []).map(c => String(c || '').toUpperCase());
      if (rowStr.some(c => c.includes('ITM')) && rowStr.some(c => c.includes('EAN'))) {
        headerRowIdx = i;
        break;
      }
    }

    const headers = (rows[headerRowIdx] || []).map(h => String(h || ''));

    // Identifier les colonnes
    const colITM = trouverColonne(headers, ['ITM']);
    const colEAN = trouverColonne(headers, ['EAN']);
    const colLibelle = trouverColonne(headers, ['Libellé PLU', 'LIBELLE PLU', 'Libelle PLU', 'LIBELLE']);
    const colPLU = trouverColonne(headers, ['Code PLU', 'CODE PLU']);
    const colPrix = trouverColonne(headers, ['Prix vente', 'PRIX VENTE', 'PV']);
    const colSection = trouverColonne(headers, ['Section', 'SECTION']);

    if (colITM === -1 || colEAN === -1) {
      // Colonnes essentielles non trouvées
      return null;
    }

    // Construire les Maps de liaison
    const eanToItm8 = new Map();
    const eanToLibelle = new Map();
    const eanToPrixVente = new Map();
    const itm8ToEans = new Map();
    const itm8ToLibelle = new Map();
    const eanSet = new Set();
    const itm8Set = new Set();

    let totalLignes = 0;

    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const itmBrut = row[colITM];
      const eanBrut = row[colEAN];

      if (!itmBrut || !eanBrut) continue;

      const itm8 = normaliserITM(itmBrut);
      const ean = normaliserEAN(eanBrut);

      if (!itm8 || !ean) continue;

      totalLignes++;

      // EAN → ITM8
      eanToItm8.set(ean, itm8);
      eanSet.add(ean);
      itm8Set.add(itm8);

      // EAN → Libellé
      if (colLibelle !== -1) {
        const libelle = String(row[colLibelle] || '').trim();
        if (libelle) {
          eanToLibelle.set(ean, libelle);
        }
      }

      // EAN → Prix vente
      if (colPrix !== -1) {
        const prix = Number(row[colPrix]);
        if (!isNaN(prix) && prix > 0) {
          eanToPrixVente.set(ean, prix);
        }
      }

      // ITM8 → EAN (liste)
      if (!itm8ToEans.has(itm8)) {
        itm8ToEans.set(itm8, []);
      }
      itm8ToEans.get(itm8).push(ean);

      // ITM8 → Libellé (premier trouvé)
      if (!itm8ToLibelle.has(itm8) && colLibelle !== -1) {
        const libelle = String(row[colLibelle] || '').trim();
        if (libelle) {
          itm8ToLibelle.set(itm8, libelle);
        }
      }
    }

    return {
      eanToItm8,
      eanToLibelle,
      eanToPrixVente,
      itm8ToEans,
      itm8ToLibelle,
      magasin: { nom: nomMagasin, code: codeMagasin },
      dateExtraction,
      stats: {
        totalLignes,
        itmUniques: itm8Set.size,
        eanUniques: eanSet.size,
      },
    };
  } catch (error) {
    console.error('[referentielMagasin] Erreur chargement:', error);
    return null;
  }
};

/**
 * Résout un produit via la liaison EAN → ITM → Référentiel V2.
 *
 * Niveau 0 de la hiérarchie d'identification :
 *   1. EAN du produit → ITM8 via le référentiel magasin
 *   2. ITM8 → infos produit via le référentiel V2
 *   3. Si pas dans ref V2 : classification par mots-clés du libellé Confolens
 *      + estimation unités/plaque par rapprochement désignation avec ref V2
 *
 * @param {string} ean - Code EAN du produit (depuis l'historique des ventes)
 * @param {Object} refMagasin - Référentiel magasin chargé (sortie de chargerReferentielMagasin)
 * @returns {Object|null} Infos produit enrichies, ou null si pas trouvé
 *
 * Retour si trouvé : {
 *   itm8, libelle, rayon, programme, famille, sousFamille,
 *   unitesParPlaque, unitesParVente, poids, marque,
 *   sourceIdentification: 'niveau0-refV2' | 'niveau0-classification',
 *   libelleMagasin: string,   // Libellé du fichier magasin
 *   prixVenteMagasin: number, // Prix de vente TTC du magasin
 * }
 */
export const resoudreParLiaisonEAN = (ean, refMagasin) => {
  if (!refMagasin || !ean) return null;

  const eanNorm = normaliserEAN(ean);
  const itm8 = refMagasin.eanToItm8.get(eanNorm);

  if (!itm8) return null;

  const libelleMagasin = refMagasin.eanToLibelle.get(eanNorm) || '';
  const prixVenteMagasin = refMagasin.eanToPrixVente.get(eanNorm) || 0;

  // Chercher dans le référentiel V2
  const refCache = getReferentielCache();
  if (refCache && refCache.itm8Map) {
    const refInfo = refCache.itm8Map.get(itm8);
    if (refInfo) {
      return {
        itm8,
        libelle: refInfo.libelle, // Désignation officielle du référentiel V2
        rayon: refInfo.rayon,
        programme: refInfo.programme,
        famille: refInfo.famille,
        sousFamille: refInfo.sousFamille,
        unitesParPlaque: refInfo.unitesParPlaque,
        unitesParVente: refInfo.unitesParVente,
        poids: refInfo.poids,
        marque: refInfo.marque,
        codePLU: refInfo.codePLU,
        ean13: refInfo.ean13,
        sourceIdentification: 'niveau0-refV2',
        libelleMagasin,
        prixVenteMagasin,
      };
    }
  }

  // ITM trouvé dans le fichier magasin mais PAS dans le référentiel V2
  // → Classification par mots-clés du libellé magasin
  // → Estimation unités/plaque par rapprochement avec le ref V2
  const libelleSource = libelleMagasin || '';
  if (!libelleSource) return null;

  const classification = classifierProduit(libelleSource);
  const rayon = classification.rayon;

  // Chercher un produit similaire dans le ref V2 pour estimer unités/plaque
  const unitesParPlaqueEstimees = estimerUnitesParPlaque(libelleSource, refCache);

  return {
    itm8,
    libelle: libelleSource, // Libellé du fichier magasin (meilleur que le fichier de ventes)
    rayon,
    programme: classification.programme,
    famille: rayon, // famille = rayon pour compatibilité
    sousFamille: '',
    unitesParPlaque: unitesParPlaqueEstimees,
    unitesParVente: 1,
    poids: 0,
    marque: '',
    codePLU: '',
    ean13: eanNorm,
    sourceIdentification: 'niveau0-classification',
    libelleMagasin,
    prixVenteMagasin,
  };
};

/**
 * Estime les unités par plaque en cherchant un produit similaire dans le référentiel V2.
 *
 * Logique : si le libellé magasin contient "CROISSANT", on cherche dans le ref V2
 * un produit dont le libellé contient aussi "CROISSANT" et on prend ses unités/plaque.
 * On vérifie aussi le grammage si mentionné.
 *
 * @param {string} libelle - Libellé du produit (fichier magasin)
 * @param {Object|null} refCache - Cache du référentiel V2
 * @returns {number} Unités par plaque estimées (0 si non trouvé)
 */
const estimerUnitesParPlaque = (libelle, refCache) => {
  if (!refCache || !refCache.itm8Map) {
    // Fallback : estimation par le classifieur (mots-clés)
    const classification = classifierProduit(libelle);
    return classification.unitesParPlaque;
  }

  const libUpper = (libelle || '').toUpperCase();

  // Extraire le grammage du libellé si présent (ex: "300G", "250GR")
  const matchPoids = libUpper.match(/(\d+)\s*(?:G|GR|KG)\b/);
  const poidsLibelle = matchPoids ? Number(matchPoids[1]) : 0;

  // Mots-clés principaux pour le matching (premiers tokens significatifs)
  const tokens = libUpper
    .replace(/[*]/g, '')
    .replace(/\bX\d+\b/gi, '') // Retirer les conditionnements (X2, X5)
    .replace(/\d+\s*(?:G|GR|KG)\b/gi, '') // Retirer les poids
    .split(/\s+/)
    .filter(t => t.length > 2);

  if (tokens.length === 0) {
    const classification = classifierProduit(libelle);
    return classification.unitesParPlaque;
  }

  // Chercher dans le ref V2 le meilleur match
  let bestMatch = null;
  let bestScore = 0;

  refCache.itm8Map.forEach((info) => {
    if (!info.unitesParPlaque || info.unitesParPlaque === 0) return;

    const refUpper = (info.libelle || '').toUpperCase();
    let score = 0;

    // Compter les tokens en commun
    for (const token of tokens) {
      if (refUpper.includes(token)) score++;
    }

    if (score === 0) return;

    // Bonus si même grammage
    if (poidsLibelle > 0 && info.poids > 0) {
      // Tolérance ±10%
      const ratio = poidsLibelle / info.poids;
      if (ratio >= 0.9 && ratio <= 1.1) score += 0.5;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = info;
    }
  });

  // Exiger au moins 1 token en commun
  if (bestMatch && bestScore >= 1) {
    return bestMatch.unitesParPlaque;
  }

  // Fallback : estimation par le classifieur
  const classification = classifierProduit(libelle);
  return classification.unitesParPlaque;
};

/**
 * Génère un rapport de matching entre le référentiel magasin et le ref V2.
 *
 * @param {Object} refMagasin - Référentiel magasin chargé
 * @returns {Object} Rapport détaillé
 */
export const genererRapportMatching = (refMagasin) => {
  if (!refMagasin) return null;

  const refCache = getReferentielCache();
  let matchesRefV2 = 0;
  let matchesClassification = 0;
  let nonTrouves = 0;
  const detailsNonTrouves = [];

  refMagasin.itm8ToEans.forEach((eans, itm8) => {
    if (refCache && refCache.itm8Map && refCache.itm8Map.has(itm8)) {
      matchesRefV2++;
    } else {
      // Vérifier si on a au moins un libellé pour classifier
      const libelle = refMagasin.itm8ToLibelle.get(itm8);
      if (libelle) {
        matchesClassification++;
      } else {
        nonTrouves++;
        detailsNonTrouves.push({ itm8, eans });
      }
    }
  });

  return {
    totalITMUniques: refMagasin.stats.itmUniques,
    totalEANUniques: refMagasin.stats.eanUniques,
    matchesRefV2,
    matchesClassification,
    nonTrouves,
    tauxMatchRefV2: refMagasin.stats.itmUniques > 0
      ? Math.round((matchesRefV2 / refMagasin.stats.itmUniques) * 100)
      : 0,
    detailsNonTrouves: detailsNonTrouves.slice(0, 10), // Limiter pour l'affichage
  };
};

/**
 * Vérifie si les quantités vendues sont en lots ou en unités
 * en croisant le prix de vente magasin avec le CA de l'historique.
 *
 * @param {number} prixVenteMagasin - Prix de vente unitaire TTC (ref magasin)
 * @param {number} quantiteVendue - Quantité du fichier de ventes
 * @param {number} caVendu - Chiffre d'affaires du fichier de ventes
 * @returns {Object} { estEnLots: boolean, quantiteUnites: number, facteurConversion: number }
 */
export const verifierQuantiteLot = (prixVenteMagasin, quantiteVendue, caVendu) => {
  if (!prixVenteMagasin || prixVenteMagasin <= 0 || !quantiteVendue || !caVendu) {
    return { estEnLots: false, quantiteUnites: quantiteVendue || 0, facteurConversion: 1 };
  }

  // Nombre d'unités vendues calculé = CA / prix unitaire
  const unitesCalculees = caVendu / prixVenteMagasin;

  // Si quantité fichier ≈ unités calculées (tolérance 5%), c'est en unités
  const ratio = quantiteVendue / unitesCalculees;

  if (ratio >= 0.95 && ratio <= 1.05) {
    return { estEnLots: false, quantiteUnites: quantiteVendue, facteurConversion: 1 };
  }

  // Si le ratio est un entier ou quasi-entier, c'est la taille du lot
  const facteur = Math.round(unitesCalculees / quantiteVendue);
  if (facteur > 1 && Math.abs((unitesCalculees / quantiteVendue) - facteur) < 0.1) {
    return {
      estEnLots: true,
      quantiteUnites: Math.round(quantiteVendue * facteur),
      facteurConversion: facteur,
    };
  }

  // Cas ambigu — retourner tel quel
  return { estEnLots: false, quantiteUnites: quantiteVendue, facteurConversion: 1 };
};
