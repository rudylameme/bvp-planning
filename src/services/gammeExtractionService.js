/**
 * Service d'extraction des données de gamme depuis les fichiers "Comparatif Ventes/Casse"
 *
 * Ce service permet de :
 * - Charger un fichier Excel de ventes/casse par produit
 * - Extraire les données par produit avec ventes et casse
 * - Agréger par semaine basé sur les dates
 * - Calculer les taux de casse par produit
 *
 * Structure du fichier Excel attendu :
 * - Headers à la ligne 9 (index 8)
 * - Une ligne par produit par date
 * - Lignes sans date = totaux de la période
 *
 * Colonnes importantes :
 * | Col | Index | Contenu          |
 * | A   | 0     | Code EAN         |
 * | B   | 1     | Libellé EAN      |
 * | G   | 6     | Date             |
 * | H   | 7     | Ventes (Qté)     |
 * | K   | 10    | Ventes PV TTC    |
 * | N   | 13    | Casse (Qté)      |
 * | O   | 14    | Casse PA HT      |
 * | T   | 19    | Taux de Casse %  |
 */

import * as XLSX from 'xlsx';
import { rechercherParLibelle, rechercherParLibelleFuzzy, rechercherParEAN, isReferentielCharge, mapRayonVersFamille } from './referentielITM8';
import { nettoyerGamme } from './nettoyageGamme';
import { construireIdCanonique } from './idCanonique';

// Cache pour éviter de relire les fichiers
const cache = {
  fichiers: new Map(),
  produitsExtraits: new Map(),
};

// Configuration des colonnes
const CONFIG = {
  // Ligne d'en-tête par défaut (0-indexed) - sera auto-détectée si possible
  headerRow: 6,

  // Index des colonnes importantes
  colonnes: {
    CODE_EAN: 0,      // A
    LIBELLE: 1,       // B
    DATE: 6,          // G
    VENTES_QTE: 7,    // H
    VENTES_PV_TTC: 10, // K
    CASSE_QTE: 13,    // N
    CASSE_PA_HT: 14,  // O
    TAUX_CASSE: 19,   // T
    CDT_ACHAT: 5,     // F (CDT achat / conditionnement)
  },

  // Noms des colonnes attendus (pour validation)
  nomsColonnes: {
    CODE_EAN: ['Code EAN', 'EAN', 'Code'],
    LIBELLE: ['Libellé EAN', 'Libellé', 'Désignation', 'Produit'],
    DATE: ['Date'],
    VENTES_QTE: ['Ventes Qté', 'Ventes (Qté)', 'Qté Vendue', 'Qté'],
    VENTES_PV_TTC: ['Ventes PV TTC', 'CA TTC', 'PV TTC'],
    // Format "Dons, Casse et Stickage" utilisé par certains exports
    CASSE_QTE: ['Casse Qté', 'Qté Casse', 'Dons, Casse et Stickage (Qté)'],
    CASSE_PA_HT: ['Casse PA HT', 'PA HT Casse', 'Dons, Casse et Stickage PA HT'],
    TAUX_CASSE: ['Taux de Casse', 'Taux Casse', '% Casse', 'Taux de Dons, Casse et Stickage'],
    CDT_ACHAT: ['CDT achat', 'CDT', 'Conditionnement', 'Cdt achat'],
  },

  // Patterns pour détecter les fichiers de ventes/casse
  filePatterns: [
    /^\d+\s+AU\s+\d+\s+\w+\s+\d{4}\.xlsx$/i,  // "1 AU 25 JANVIER 2026.xlsx"
    /^Comparatif.*Ventes.*Casse/i,
    /^Ventes.*Casse/i,
  ],
};

/**
 * Vérifie si un fichier est un fichier de ventes/casse
 * @param {string} fileName - Nom du fichier
 * @returns {boolean}
 */
export function estFichierVentesCasse(fileName) {
  return CONFIG.filePatterns.some(pattern => pattern.test(fileName));
}

/**
 * Liste les fichiers de ventes/casse disponibles dans le dossier DATA
 * @param {FileSystemDirectoryHandle} dirHandle - Handle du dossier
 * @returns {Promise<Array>} Liste des fichiers détectés
 */
export async function listerFichiersVentesCasse(dirHandle) {
  const fichiers = [];

  try {
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.xlsx')) {
        if (estFichierVentesCasse(entry.name)) {
          // Extraire la période du nom du fichier
          const match = entry.name.match(/^(\d+)\s+AU\s+(\d+)\s+(\w+)\s+(\d{4})/i);
          if (match) {
            fichiers.push({
              nom: entry.name,
              debut: parseInt(match[1]),
              fin: parseInt(match[2]),
              mois: match[3],
              annee: match[4],
              periode: `${match[1]} au ${match[2]} ${match[3]} ${match[4]}`,
            });
          } else {
            fichiers.push({
              nom: entry.name,
              periode: entry.name.replace('.xlsx', ''),
            });
          }
        }
      }
    }
  } catch (error) {
    // TODO: logger professionnel
  }

  return fichiers;
}

/**
 * Charge et parse un fichier Excel de ventes/casse
 * @param {File} file - Fichier Excel
 * @returns {Promise<Object>} Workbook parsé
 */
async function chargerFichierExcel(file) {
  const cacheKey = file.name;

  if (cache.fichiers.has(cacheKey)) {
    return cache.fichiers.get(cacheKey);
  }

  const startTime = performance.now();

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

  const endTime = performance.now();

  cache.fichiers.set(cacheKey, workbook);
  return workbook;
}

/**
 * Parse une date Excel ou string
 * @param {any} value - Valeur de date
 * @returns {Date|null}
 */
function parseDate(value) {
  if (!value) return null;

  // Si c'est déjà une Date
  if (value instanceof Date) return value;

  // Si c'est un nombre (date Excel)
  if (typeof value === 'number') {
    // Convertir le numéro de série Excel en Date
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + value * 86400000);
  }

  // Si c'est une string, essayer de parser
  if (typeof value === 'string') {
    // Format DD/MM/YYYY (français)
    const matchDMY = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (matchDMY) {
      const [, jour, mois, annee] = matchDMY;
      return new Date(parseInt(annee), parseInt(mois) - 1, parseInt(jour));
    }
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

/**
 * Calcule le numéro de semaine ISO d'une date (YYYYWW)
 * @param {Date} date - Date
 * @returns {string} Numéro de semaine au format YYYYWW
 */
function getNumeroSemaine(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}${String(weekNo).padStart(2, '0')}`;
}

/**
 * Jours fériés fixes en France (mois et jour, 1-indexed)
 */
const JOURS_FERIES_FIXES = [
  { mois: 1, jour: 1 },   // Jour de l'An
  { mois: 5, jour: 1 },   // Fête du Travail
  { mois: 5, jour: 8 },   // Victoire 1945
  { mois: 7, jour: 14 },  // Fête nationale
  { mois: 8, jour: 15 },  // Assomption
  { mois: 11, jour: 1 },  // Toussaint
  { mois: 11, jour: 11 }, // Armistice
  { mois: 12, jour: 25 }, // Noël
];

/**
 * Vérifie si une semaine ISO contient un jour férié français
 * @param {string} semaineKey - Clé de semaine au format "YYYYWW" (ex: "202601")
 * @returns {{ contient: boolean, feries: string[] }} Résultat avec les dates fériées trouvées
 */
function semaineContientJourFerie(semaineKey) {
  // Extraire l'année et le numéro de semaine
  const annee = parseInt(semaineKey.substring(0, 4), 10);
  const semaine = parseInt(semaineKey.substring(4), 10);

  // Trouver le lundi de cette semaine ISO
  // Le 4 janvier est toujours dans la semaine 1
  const jan4 = new Date(Date.UTC(annee, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7; // 1=lundi..7=dimanche
  const lundi = new Date(jan4);
  lundi.setUTCDate(jan4.getUTCDate() - (dayOfWeek - 1) + (semaine - 1) * 7);

  const feries = [];
  for (let d = 0; d < 7; d++) {
    const jour = new Date(lundi);
    jour.setUTCDate(lundi.getUTCDate() + d);
    const m = jour.getUTCMonth() + 1;
    const j = jour.getUTCDate();
    if (JOURS_FERIES_FIXES.some(f => f.mois === m && f.jour === j)) {
      feries.push(`${String(j).padStart(2, '0')}/${String(m).padStart(2, '0')}`);
    }
  }

  return { contient: feries.length > 0, feries };
}

/**
 * Calcule les poids de pondération par semaine en fonction des jours fériés
 * Les semaines avec jours fériés ont un poids réduit (facteurReduction)
 * @param {Map} ventesParSemaine - Map des ventes par semaine
 * @param {number} facteurReduction - Facteur de réduction pour les semaines fériées (défaut: 0.7)
 * @returns {{ poids: Map<string, number>, semainesFeriees: string[] }}
 */
function calculerPoidsJoursFeries(ventesParSemaine, facteurReduction = 0.7) {
  const poids = new Map();
  const semainesFeriees = [];

  for (const semaineKey of ventesParSemaine.keys()) {
    const { contient, feries } = semaineContientJourFerie(semaineKey);
    if (contient) {
      poids.set(semaineKey, facteurReduction);
      semainesFeriees.push(`${semaineKey} (${feries.join(', ')})`);
    } else {
      poids.set(semaineKey, 1.0);
    }
  }

  return { poids, semainesFeriees };
}

/**
 * Poids par défaut par jour de semaine (0=dim..6=sam)
 * Utilisé quand les données de fréquentation ne sont pas disponibles
 */
const POIDS_JOURS_DEFAUT = {
  0: 0.09,  // dimanche
  1: 0.12,  // lundi
  2: 0.14,  // mardi
  3: 0.14,  // mercredi
  4: 0.14,  // jeudi
  5: 0.17,  // vendredi
  6: 0.20,  // samedi
};

/**
 * Convertit les poids de jours du format noms (lundi, mardi...) vers index (0-6)
 * @param {Object} poidsParNom - { lundi: 0.12, mardi: 0.14, ... }
 * @returns {Object} { 1: 0.12, 2: 0.14, ... } (0=dim..6=sam)
 */
function convertirPoidsJoursNomsVersIndex(poidsParNom) {
  const mapping = {
    dimanche: 0, lundi: 1, mardi: 2, mercredi: 3,
    jeudi: 4, vendredi: 5, samedi: 6,
  };
  const result = {};
  Object.entries(poidsParNom).forEach(([nom, poids]) => {
    const index = mapping[nom.toLowerCase()];
    if (index !== undefined) result[index] = poids;
  });
  return result;
}

/**
 * Détermine les index de colonnes à partir des en-têtes
 * @param {Array} headers - Ligne d'en-têtes
 * @returns {Object} Mapping des colonnes
 */
function detecterColonnes(headers) {
  const mapping = {};

  for (const [key, noms] of Object.entries(CONFIG.nomsColonnes)) {
    const index = headers.findIndex(h =>
      h && noms.some(nom => String(h).toLowerCase().includes(nom.toLowerCase()))
    );
    if (index !== -1) {
      mapping[key] = index;
    } else {
      // Utiliser l'index par défaut
      mapping[key] = CONFIG.colonnes[key];
    }
  }

  return mapping;
}

/**
 * Extrait les données de produits depuis le fichier Excel
 * @param {File} file - Fichier Excel
 * @param {Object} options - Options d'extraction
 * @param {boolean} options.inclureTotaux - Inclure les lignes totaux (sans date)
 * @param {Date} options.dateDebut - Filtrer à partir de cette date
 * @param {Date} options.dateFin - Filtrer jusqu'à cette date
 * @returns {Promise<Object>} Données extraites avec produits et statistiques
 */
export async function extraireProduitsVentesCasse(file, options = {}) {
  const {
    inclureTotaux = false,
    dateDebut = null,
    dateFin = null,
    poidsJoursFrequentation = null, // { lundi: 0.12, mardi: 0.14, ... } depuis la fréquentation
  } = options;

  // Vider le cache pour forcer un re-parse (important après changement de logique)
  cache.fichiers.delete(file.name);
  cache.produitsExtraits.clear();

  const startTime = performance.now();

  const workbook = await chargerFichierExcel(file);

  // Prendre la première feuille
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error('Aucune feuille trouvée dans le fichier');
  }

  // Convertir en tableau 2D
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });

  // Auto-détecter la ligne d'en-tête (cherche "Code EAN" ou "EAN")
  let headerRow = CONFIG.headerRow;
  for (let i = 0; i < Math.min(data.length, 15); i++) {
    const row = data[i];
    if (row && row.some(cell => cell && String(cell).toLowerCase().includes('code ean'))) {
      headerRow = i;
      break;
    }
  }

  if (data.length < headerRow + 2) {
    throw new Error('Fichier trop court, en-têtes non trouvés');
  }

  // Récupérer les en-têtes
  const headers = data[headerRow];

  // Détecter les colonnes
  const colonnes = detecterColonnes(headers);

  // Extraire les lignes de données
  const produitsBruts = [];
  const produitsAgreges = new Map(); // Agrégation par EAN

  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const codeEAN = row[colonnes.CODE_EAN];
    const libelle = row[colonnes.LIBELLE];
    const dateCell = row[colonnes.DATE];
    const ventesQte = parseFloat(row[colonnes.VENTES_QTE]) || 0;
    const ventesPVTTC = parseFloat(row[colonnes.VENTES_PV_TTC]) || 0;
    const casseQte = parseFloat(row[colonnes.CASSE_QTE]) || 0;
    const cassePAHT = parseFloat(row[colonnes.CASSE_PA_HT]) || 0;
    const cdtAchat = parseInt(row[colonnes.CDT_ACHAT]) || 0;

    // Ignorer les lignes sans EAN ou sans libellé
    if (!codeEAN || !libelle) continue;

    const date = parseDate(dateCell);
    const hasDate = date !== null;

    // Si on ne veut pas les totaux et qu'il n'y a pas de date, ignorer
    if (!inclureTotaux && !hasDate) continue;

    // Filtrer par date si spécifié
    if (hasDate && dateDebut && date < dateDebut) continue;
    if (hasDate && dateFin && date > dateFin) continue;

    // Toujours calculer le taux de casse : PA HT Casse / PV TTC Ventes × 100
    // Ne pas utiliser la valeur du fichier car elle est souvent incorrecte (100%)
    const tauxCasse = ventesPVTTC > 0 ? (cassePAHT / ventesPVTTC) * 100 : 0;

    const produit = {
      codeEAN: String(codeEAN).trim(),
      libelle: String(libelle).trim(),
      date: date,
      hasDate: hasDate,
      ventesQte,
      ventesPVTTC,
      casseQte,
      cassePAHT,
      tauxCasse,
      cdtAchat,
    };

    produitsBruts.push(produit);

    // Agréger par EAN (seulement les lignes avec date pour éviter les doubles)
    if (hasDate) {
      const ean = produit.codeEAN;
      if (!produitsAgreges.has(ean)) {
        produitsAgreges.set(ean, {
          codeEAN: ean,
          libelle: produit.libelle,
          cdtAchat: produit.cdtAchat || 0,
          ventesQte: 0,
          ventesPVTTC: 0,
          casseQte: 0,
          cassePAHT: 0,
          nombreJours: 0,
          dates: [],
          // Ventes quotidiennes brutes — INDISPENSABLE pour la fusion/association
          // Chaque entrée : { date, jourSemaine, ventesQte, ventesPVTTC, casseQte, cassePAHT }
          ventesQuotidiennes: [],
          // Pour calcul potentiel et tendance par semaine
          ventesParSemaine: new Map(),
          // Pour calcul moyenne hebdo par jour de semaine
          ventesParJourDetail: {}, // { jourIndex: { total, count } }
          // Pour calcul CA hebdo et casse hebdo par jour
          caParJourDetail: {}, // { jourIndex: { total, count } }
          casseParJourDetail: {}, // { jourIndex: { total, count } }
        });
      }

      const agg = produitsAgreges.get(ean);
      agg.ventesQte += ventesQte;
      agg.ventesPVTTC += ventesPVTTC;
      agg.casseQte += casseQte;
      agg.cassePAHT += cassePAHT;
      agg.nombreJours += 1;
      agg.dates.push(date);

      // Stocker la ligne brute quotidienne (pour fusion/association ultérieure)
      agg.ventesQuotidiennes.push({
        date: date.toISOString().slice(0, 10), // "YYYY-MM-DD" pour sérialisation
        jourSemaine: date.getDay(), // 0=dim..6=sam
        ventesQte,
        ventesPVTTC,
        casseQte,
        cassePAHT,
      });

      // Agréger par jour de la semaine (0=dim..6=sam) pour moyenne hebdo
      const jourSemaine = date.getDay();
      if (!agg.ventesParJourDetail[jourSemaine]) {
        agg.ventesParJourDetail[jourSemaine] = { total: 0, count: 0 };
      }
      agg.ventesParJourDetail[jourSemaine].total += ventesQte;
      agg.ventesParJourDetail[jourSemaine].count += 1;

      // CA et casse par jour de semaine
      if (!agg.caParJourDetail[jourSemaine]) {
        agg.caParJourDetail[jourSemaine] = { total: 0, count: 0 };
      }
      agg.caParJourDetail[jourSemaine].total += ventesPVTTC;
      agg.caParJourDetail[jourSemaine].count += 1;

      if (!agg.casseParJourDetail[jourSemaine]) {
        agg.casseParJourDetail[jourSemaine] = { total: 0, count: 0 };
      }
      agg.casseParJourDetail[jourSemaine].total += cassePAHT;
      agg.casseParJourDetail[jourSemaine].count += 1;

      // Agréger par semaine pour potentiel et tendance
      const semaineNum = getNumeroSemaine(date);
      if (!agg.ventesParSemaine.has(semaineNum)) {
        agg.ventesParSemaine.set(semaineNum, { ventesQte: 0, ventesPVTTC: 0, cassePAHT: 0, casseQte: 0 });
      }
      const semaine = agg.ventesParSemaine.get(semaineNum);
      semaine.ventesQte += ventesQte;
      semaine.ventesPVTTC += ventesPVTTC;
      semaine.cassePAHT += cassePAHT;
      semaine.casseQte += casseQte;
    }
  }

  // Calculer les taux de casse agrégés et autres métriques
  const produitsFinaux = Array.from(produitsAgreges.values()).map(p => {
    // Taux de casse = PA HT Casse / PV TTC Ventes * 100
    const tauxCasse = p.ventesPVTTC > 0 ? (p.cassePAHT / p.ventesPVTTC) * 100 : 0;

    // Prix moyen unitaire
    const prixMoyen = p.ventesQte > 0 ? p.ventesPVTTC / p.ventesQte : 0;

    // Moyenne journalière
    const moyenneJournaliereQte = p.nombreJours > 0 ? p.ventesQte / p.nombreJours : 0;
    const moyenneJournaliereCA = p.nombreJours > 0 ? p.ventesPVTTC / p.nombreJours : 0;

    // Analyse par semaine
    const semaines = Array.from(p.ventesParSemaine.entries())
      .sort((a, b) => a[0].localeCompare(b[0])); // Trier par numéro de semaine

    const nombreSemaines = semaines.length;

    // --- Pondération des jours fériés ---
    const { poids: poidsSemaines, semainesFeriees } = calculerPoidsJoursFeries(p.ventesParSemaine);

    // Moyenne hebdomadaire par jour de semaine (pondérée par jours fériés)
    // Pour chaque jour (lun, mar...), on fait : somme ventes du jour / nombre d'occurrences
    // Puis on somme les moyennes de tous les jours → gère les semaines incomplètes
    let moyHebdo;
    if (p.ventesParJourDetail && Object.keys(p.ventesParJourDetail).length > 0) {
      // Somme des moyennes de chaque jour
      moyHebdo = Math.round(
        Object.values(p.ventesParJourDetail).reduce((sum, { total, count }) => {
          return sum + (count > 0 ? total / count : 0);
        }, 0)
      );
    } else {
      // Fallback : moyenne pondérée par semaine (les semaines fériées comptent moins)
      let totalPondere = 0;
      let totalPoids = 0;
      semaines.forEach(([sKey, s]) => {
        const w = poidsSemaines.get(sKey) || 1.0;
        totalPondere += s.ventesQte * w;
        totalPoids += w;
      });
      moyHebdo = totalPoids > 0 ? Math.round(totalPondere / totalPoids) : Math.round(p.ventesQte);
    }

    // --- Potentiel = Règle des 5B ---
    // Pour chaque jour qui a des ventes, calculer : vente_du_jour / poids_du_jour
    // Le potentiel final = MAX de ces potentiels journaliers
    // Utiliser les poids de fréquentation si fournis, sinon les poids par défaut
    const poidsJoursActifs = poidsJoursFrequentation
      ? convertirPoidsJoursNomsVersIndex(poidsJoursFrequentation)
      : POIDS_JOURS_DEFAUT;

    let potentiel;
    if (p.ventesParJourDetail && Object.keys(p.ventesParJourDetail).length > 0) {
      // Pour chaque jour : on prend la moyenne du jour (pas le max brut, pour lisser les fériés)
      // puis on divise par le poids du jour → potentiel journalier projeté
      const potentielsJournaliers = Object.entries(p.ventesParJourDetail).map(([jourIdx, { total, count }]) => {
        const moyJour = count > 0 ? total / count : 0;
        const poidsJour = poidsJoursActifs[parseInt(jourIdx)] || POIDS_JOURS_DEFAUT[parseInt(jourIdx)] || 0.14;
        return poidsJour > 0 ? moyJour / poidsJour : 0;
      });
      potentiel = potentielsJournaliers.length > 0
        ? Math.round(Math.max(...potentielsJournaliers))
        : Math.round(p.ventesQte);
    } else {
      // Fallback : MAX des ventes par semaine (ancien comportement)
      potentiel = semaines.length > 0
        ? Math.round(Math.max(...semaines.map(([, s]) => s.ventesQte)))
        : Math.round(p.ventesQte);
    }

    // Plancher : le potentiel ne peut pas descendre en dessous de 95% de la moyenne hebdo
    const plancher = moyHebdo > 0 ? Math.ceil(moyHebdo * 0.95) : 0;
    potentiel = Math.max(potentiel, plancher);

    // Tendance : comparaison première moitié vs deuxième moitié
    let tendance = 'stable';
    let tendancePourcent = 0;
    if (nombreSemaines >= 2) {
      const mid = Math.ceil(nombreSemaines / 2);
      const premiereSemaines = semaines.slice(0, mid);
      const dernieresSemaines = semaines.slice(mid);

      const moyPremiere = premiereSemaines.reduce((sum, [, s]) => sum + s.ventesQte, 0) / premiereSemaines.length;
      const moyDerniere = dernieresSemaines.reduce((sum, [, s]) => sum + s.ventesQte, 0) / dernieresSemaines.length;

      if (moyPremiere > 0) {
        tendancePourcent = Math.round(((moyDerniere - moyPremiere) / moyPremiere) * 100);
        if (tendancePourcent > 5) {
          tendance = 'croissance';
        } else if (tendancePourcent < -5) {
          tendance = 'declin';
        } else {
          tendance = 'stable';
        }
      }
    }

    // Fiabilité basée sur la consistance (écart-type relatif)
    let fiabilite = 50; // Par défaut
    if (nombreSemaines >= 2) {
      const ventesParSemaine = semaines.map(([, s]) => s.ventesQte);
      const moyenne = ventesParSemaine.reduce((a, b) => a + b, 0) / ventesParSemaine.length;
      const variance = ventesParSemaine.reduce((sum, v) => sum + Math.pow(v - moyenne, 2), 0) / ventesParSemaine.length;
      const ecartType = Math.sqrt(variance);
      const coeffVariation = moyenne > 0 ? ecartType / moyenne : 1;
      // Plus le coefficient de variation est faible, plus la fiabilité est haute
      // CV de 0 = 100%, CV de 1 = 0%
      fiabilite = Math.max(0, Math.min(100, Math.round((1 - coeffVariation) * 100)));
    } else if (p.nombreJours >= 5) {
      fiabilite = 60;
    } else if (p.nombreJours >= 3) {
      fiabilite = 40;
    } else {
      fiabilite = 20;
    }

    return {
      ...p,
      tauxCasse: Math.round(tauxCasse * 10) / 10,
      prixMoyen: Math.round(prixMoyen * 100) / 100,
      moyenneJournaliereQte: Math.round(moyenneJournaliereQte * 10) / 10,
      moyenneJournaliereCA: Math.round(moyenneJournaliereCA * 100) / 100,
      moyHebdo,
      // CA hebdo moyen (même logique par jour)
      caHebdo: p.caParJourDetail && Object.keys(p.caParJourDetail).length > 0
        ? Math.round(Object.values(p.caParJourDetail).reduce((sum, { total, count }) => sum + (count > 0 ? total / count : 0), 0) * 100) / 100
        : (nombreSemaines > 0 ? Math.round(p.ventesPVTTC / nombreSemaines * 100) / 100 : p.ventesPVTTC),
      // Casse PA HT hebdo moyen
      cassePAHTHebdo: p.casseParJourDetail && Object.keys(p.casseParJourDetail).length > 0
        ? Math.round(Object.values(p.casseParJourDetail).reduce((sum, { total, count }) => sum + (count > 0 ? total / count : 0), 0) * 100) / 100
        : (nombreSemaines > 0 ? Math.round(p.cassePAHT / nombreSemaines * 100) / 100 : p.cassePAHT),
      potentiel,
      tendance,
      tendancePourcent,
      fiabilite,
      nombreSemaines,
    };
  });

  // Trier par CA décroissant
  produitsFinaux.sort((a, b) => b.ventesPVTTC - a.ventesPVTTC);

  // Calculer le nombre de semaines ISO distinctes (global, toutes produits confondus)
  const semainesGlobales = new Set();
  produitsFinaux.forEach(p => {
    if (p.ventesParSemaine) {
      for (const semKey of p.ventesParSemaine.keys()) {
        semainesGlobales.add(semKey);
      }
    }
  });
  const nombreSemainesGlobal = semainesGlobales.size;

  // Détecter les semaines avec jours fériés (log global)
  const semainesGlobalesMap = new Map();
  semainesGlobales.forEach(s => semainesGlobalesMap.set(s, { ventesQte: 0 }));
  const { semainesFeriees: ferieesGlobal } = calculerPoidsJoursFeries(semainesGlobalesMap);

  // Calculer les statistiques globales
  const totalVentesQte = produitsFinaux.reduce((acc, p) => acc + p.ventesQte, 0);
  const totalVentesPVTTC = produitsFinaux.reduce((acc, p) => acc + p.ventesPVTTC, 0);
  const totalCasseQte = produitsFinaux.reduce((acc, p) => acc + p.casseQte, 0);
  const totalCassePAHT = produitsFinaux.reduce((acc, p) => acc + p.cassePAHT, 0);
  const tauxCasseGlobal = totalVentesPVTTC > 0 ? (totalCassePAHT / totalVentesPVTTC) * 100 : 0;

  const endTime = performance.now();

  const result = {
    produits: produitsFinaux,

    statistiques: {
      nombreProduits: produitsFinaux.length,
      nombreLignesBrutes: produitsBruts.length,
      nombreSemaines: nombreSemainesGlobal,
      totalVentesQte,
      totalVentesPVTTC,
      totalCasseQte,
      totalCassePAHT,
      tauxCasseGlobal: Math.round(tauxCasseGlobal * 10) / 10,
    },

    metadata: {
      fichierSource: file.name,
      dateExtraction: new Date().toISOString(),
      tempsExtraction: Math.round(endTime - startTime),
      periodeDebut: dateDebut,
      periodeFin: dateFin,
    },
  };

  cache.produitsExtraits.set(file.name, result);
  return result;
}

/**
 * Extrait les produits et les catégorise par rayon/famille
 * (basé sur les préfixes EAN ou une table de correspondance)
 * @param {File} file - Fichier Excel
 * @param {Object} catalogueRayons - Mapping EAN -> Rayon (optionnel)
 * @returns {Promise<Object>} Données avec produits groupés par rayon
 */
export async function extraireProduitsParRayon(file, catalogueRayons = null) {
  const { produits, statistiques, metadata } = await extraireProduitsVentesCasse(file);

  // Grouper par rayon
  const rayons = new Map();

  produits.forEach(produit => {
    // Déterminer le rayon
    let rayon = 'AUTRES';

    if (catalogueRayons && catalogueRayons[produit.codeEAN]) {
      rayon = catalogueRayons[produit.codeEAN];
    } else {
      // Heuristique basée sur le libellé
      const lib = produit.libelle.toLowerCase();
      if (lib.includes('baguette') || lib.includes('pain') || lib.includes('boule') || lib.includes('ficelle')) {
        rayon = 'BOULANGERIE';
      } else if (lib.includes('croissant') || lib.includes('pain au chocolat') || lib.includes('brioche') || lib.includes('chocolatine')) {
        rayon = 'VIENNOISERIE';
      } else if (lib.includes('tarte') || lib.includes('éclair') || lib.includes('mille') || lib.includes('gâteau') || lib.includes('flan')) {
        rayon = 'PATISSERIE';
      } else if (lib.includes('sandwich') || lib.includes('pizza') || lib.includes('quiche') || lib.includes('croque')) {
        rayon = 'SNACKING';
      }
    }

    if (!rayons.has(rayon)) {
      rayons.set(rayon, {
        nom: rayon,
        produits: [],
        totalVentesQte: 0,
        totalVentesPVTTC: 0,
        totalCasseQte: 0,
        totalCassePAHT: 0,
      });
    }

    const r = rayons.get(rayon);
    r.produits.push(produit);
    r.totalVentesQte += produit.ventesQte;
    r.totalVentesPVTTC += produit.ventesPVTTC;
    r.totalCasseQte += produit.casseQte;
    r.totalCassePAHT += produit.cassePAHT;
  });

  // Calculer le taux de casse par rayon
  rayons.forEach(r => {
    r.tauxCasse = r.totalVentesPVTTC > 0
      ? Math.round((r.totalCassePAHT / r.totalVentesPVTTC) * 1000) / 10
      : 0;
    r.nombreProduits = r.produits.length;
  });

  return {
    rayons: Array.from(rayons.values()).sort((a, b) => b.totalVentesPVTTC - a.totalVentesPVTTC),
    produits,
    statistiques,
    metadata,
  };
}

/**
 * Convertit les données extraites en format compatible avec Etape4PilotageCA
 * @param {Object} data - Données extraites par extraireProduitsVentesCasse
 * @returns {Array} Tableau de produits formatés pour le pilotage CA
 */
export function formaterPourPilotageCA(data, options = {}) {
  const { semaineNumero, moisPlanning, refMagasin, bbdNationale = null, skipNettoyage = false } = options;
  const { produits, statistiques } = data;

  // Compteur pour dédupliquer les clés canoniques identiques (collision rare entre produits
  // distincts qui partagent le même PLU/ITM8 — on suffixe par EAN pour garder la stabilité)
  const idCount = {};

  const produitsFormates = produits.map((p, index) => {
    // Chercher dans le référentiel : priorité EAN, puis libellé exact, puis libellé fuzzy
    let infoRef = null;
    if (isReferentielCharge()) {
      // Priorité 1 : lookup par EAN (fiable, correspondance exacte)
      if (p.codeEAN) {
        infoRef = rechercherParEAN(p.codeEAN);
      }
      // Priorité 2 : libellé exact (case-insensitive)
      if (!infoRef) {
        infoRef = rechercherParLibelle(p.libelle);
      }
      // Priorité 3 : libellé fuzzy (gère les libellés tronqués dans les fichiers ventes)
      if (!infoRef) {
        infoRef = rechercherParLibelleFuzzy(p.libelle);
      }
    }

    // Déterminer le rayon : priorité au référentiel, sinon heuristique
    let rayon = 'AUTRE';
    if (infoRef && infoRef.rayon) {
      rayon = mapRayonVersFamille(infoRef.rayon);
    } else {
      const lib = p.libelle.toLowerCase();
      if (lib.includes('baguette') || lib.includes('pain') || lib.includes('boule') || lib.includes('ficelle') || lib.includes('campagne') || lib.includes('tradition') || lib.includes('cereale') || lib.includes('céréale') || lib.includes('constance') || lib.includes('buchette')) {
        rayon = 'BOULANGERIE';
      } else if (lib.includes('croissant') || lib.includes('pain au chocolat') || lib.includes('brioche') || lib.includes('chocolatine') || lib.includes('chausson') || lib.includes('viennois') || lib.includes('pain raisin') || lib.includes('suisse')) {
        rayon = 'VIENNOISERIE';
      } else if (lib.includes('tarte') || lib.includes('éclair') || lib.includes('eclair') || lib.includes('mille') || lib.includes('gâteau') || lib.includes('gateau') || lib.includes('flan') || lib.includes('paris') || lib.includes('beignet') || lib.includes('donut') || lib.includes('cookie') || lib.includes('brownie') || lib.includes('muffin') || lib.includes('macaron') || lib.includes('palmier') || lib.includes('galette') || lib.includes('buche') || lib.includes('bûche') || lib.includes('canele') || lib.includes('canelé') || lib.includes('meringuette') || lib.includes('meringue') || lib.includes('moelleux') || lib.includes('mouna') || lib.includes('opera') || lib.includes('opéra') || lib.includes('tropezienne') || lib.includes('tropézienne') || lib.includes('fraisier') || lib.includes('paris brest') || lib.includes('millefeuille') || lib.includes('mille-feuille') || lib.includes('religieuse') || lib.includes('gaufre') || lib.includes('craquotant') || lib.includes('fondant') || lib.includes('tiramisu')) {
        rayon = 'PATISSERIE';
      } else if (lib.includes('sandwich') || lib.includes('pizza') || lib.includes('quiche') || lib.includes('croque') || lib.includes('salade') || lib.includes('wrap') || lib.includes('panini') || lib.includes('hot dog') || lib.includes('focaccia') || lib.includes('empanada')) {
        rayon = 'SNACKING';
      } else if (lib.includes('pave') || lib.includes('pavé') || lib.includes('miche') || lib.includes('boule') || lib.includes('campagn')) {
        rayon = 'BOULANGERIE';
      }
    }

    // Calculer le poids CA (% du CA total)
    const poidsCA = statistiques.totalVentesPVTTC > 0
      ? (p.ventesPVTTC / statistiques.totalVentesPVTTC) * 100
      : 0;

    // ID canonique stable : CODE_PLU national → PLU local → ITM8 → EAN → hash(libellé+famille)
    // Ne dépend plus de l'ordre d'itération des ventes. Cf. idCanonique.js.
    const ean = infoRef ? infoRef.ean13 : p.codeEAN;
    const produitPourId = {
      ean13: ean,
      codeEAN: p.codeEAN,
      itm8: infoRef?.itm8 || '',
      codePLU: infoRef?.codePLU || '',
      libelle: p.libelle,
      famille: rayon,
      rayon,
    };
    const idBase = construireIdCanonique(produitPourId, { refMagasin, bbdNationale });
    // Collision rare : deux produits distincts partageant même PLU/ITM8 → discriminer par EAN
    idCount[idBase] = (idCount[idBase] || 0) + 1;
    const idStable = idCount[idBase] > 1 && ean
      ? `${idBase}__${ean}`
      : idCount[idBase] > 1
        ? `${idBase}__${index + 1}`
        : idBase;

    return {
      id: idStable,
      codeEAN: p.codeEAN,
      ean13: ean,
      itm8: infoRef ? infoRef.itm8 : '',
      plu: infoRef && infoRef.codePLU ? infoRef.codePLU : '',
      codePLU: infoRef ? infoRef.codePLU : '',
      libelle: p.libelle,
      rayon,
      famille: rayon,
      // Données du référentiel (programme cuisson, unités)
      programme: infoRef ? infoRef.programme : '',
      unitesParVente: infoRef ? infoRef.unitesParVente : 1,
      unitesParPlaque: infoRef ? infoRef.unitesParPlaque : 0,
      // Flag de reconnaissance
      reconnu: !!infoRef,
      // Nouvelles colonnes selon le mockup
      moyHebdo: p.moyHebdo || Math.round(p.ventesQte),
      potentiel: p.potentiel || Math.round(p.ventesQte),
      caSemaine: p.caHebdo || Math.round(p.ventesPVTTC * 100) / 100,
      tauxCasse: p.tauxCasse,
      cassePAHTSemaine: p.cassePAHTHebdo || Math.round(p.cassePAHT * 100) / 100,
      // Casse quantité hebdo (moyenne depuis ventesParSemaine si disponible)
      casseQteSemaine: p.ventesParSemaine && p.ventesParSemaine.size > 0
        ? Math.round(Array.from(p.ventesParSemaine.values()).reduce((sum, s) => sum + (s.casseQte || 0), 0) / p.ventesParSemaine.size * 10) / 10
        : Math.round((p.casseQte || 0) / (p.nombreSemaines || 1) * 10) / 10,
      // Tendance et fiabilité calculées
      tendance: p.tendance || 'stable',
      tendancePourcent: p.tendancePourcent || 0,
      fiabilite: p.fiabilite || 50,
      // Données additionnelles
      prixMoyen: p.prixMoyen,
      prixMoyenUnitaire: p.prixMoyen,
      moyenneHebdo: p.moyHebdo || Math.round(p.ventesQte),
      poidsCA: Math.round(poidsCA * 10) / 10,
      nombreJours: p.nombreJours,
      nombreSemaines: p.nombreSemaines || 1,
      // Historique par semaine pour graphiques (casse, ventes)
      historiqueParSemaine: p.ventesParSemaine
        ? Array.from(p.ventesParSemaine.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([semaine, data]) => ({
              semaine,
              semaineLabel: `S${semaine.substring(4)}`,
              ventesQte: data.ventesQte,
              ventesPVTTC: Math.round(data.ventesPVTTC * 100) / 100,
              cassePAHT: Math.round((data.cassePAHT || 0) * 100) / 100,
              casseQte: data.casseQte || 0,
              tauxCasse: data.ventesPVTTC > 0 ? Math.round(((data.cassePAHT || 0) / data.ventesPVTTC) * 1000) / 10 : 0,
            }))
        : [],
      cdt: p.cdtAchat || 0, // CDT achat depuis le fichier ventes
      // Ventes quotidiennes brutes par EAN — nécessaire pour fusion/association correcte
      ventesQuotidiennes: p.ventesQuotidiennes || [],
      actif: true, // Tous les produits actifs par défaut
    };
  });

  // Si skipNettoyage, retourner les produits bruts (tous actifs par défaut)
  if (skipNettoyage) {
    return produitsFormates;
  }

  // Nettoyage intelligent de la gamme (avec référentiel magasin si disponible)
  const { produits: produitsNettoyes, rapportIdentification } = nettoyerGamme(
    produitsFormates, semaineNumero, moisPlanning, refMagasin || null
  );

  // Attacher le rapport d'identification aux résultats (accessible via le dernier élément)
  produitsNettoyes._rapportIdentification = rapportIdentification;

  return produitsNettoyes;
}

/**
 * Vide le cache
 */
export function viderCache() {
  cache.fichiers.clear();
  cache.produitsExtraits.clear();
}

/**
 * Obtient les statistiques du cache
 */
export function getStatistiquesCache() {
  return {
    fichiers: cache.fichiers.size,
    extractions: cache.produitsExtraits.size,
  };
}

export default {
  estFichierVentesCasse,
  listerFichiersVentesCasse,
  extraireProduitsVentesCasse,
  extraireProduitsParRayon,
  formaterPourPilotageCA,
  viderCache,
  getStatistiquesCache,
};
