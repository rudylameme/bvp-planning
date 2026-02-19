/**
 * Service d'extraction de données depuis les fichiers Excel hebdomadaires
 *
 * Ce service permet de :
 * - Charger un fichier Excel hebdomadaire
 * - Extraire uniquement les données d'un magasin spécifique
 * - Mettre en cache les résultats pour éviter les relectures
 * - Fournir les données au module Benchmark ET au module Planning
 *
 * Ce fichier est le point d'entrée principal. Les fonctions internes
 * sont réparties dans les sous-modules de ./extraction/
 */

// Sous-modules
import { CONFIG, chargerFichierExcel, getCodePDV, extraireFeuille, viderCacheFichiers, construireSetCodesPDV, filtrerParCodesComparables } from './extraction/validationDonnees.js';
import { calculerMoyenneSecteur, calculerEcarts, calculerPotentiel, calculerClassementSecteur, construireDictionnaireMagasins } from './extraction/ventesExtractor.js';
import {
  extraireDonneesParCreneau,
  extraireDonneesParTrancheHoraire,
  calculerMoyenneSecteurParCreneau,
  calculerMoyenneSecteurParTrancheHoraire,
} from './extraction/frequentationExtractor.js';

// Cache pour éviter de relire les fichiers Excel
const cache = {
  extractions: new Map(),   // Cache des extractions par magasin
  infoPDV: null,            // Cache du fichier de référence info_PDV.json
};

/**
 * Charge le fichier de référence info_PDV.json
 * Contient les infos stables de chaque magasin : secteur, modèle, etc.
 * @param {FileSystemDirectoryHandle} dirHandle - Handle du dossier DATA_perso
 * @returns {Promise<Object>} Dictionnaire code PDV -> infos magasin
 */
export async function chargerInfoPDV(dirHandle) {
  // Vérifier le cache — mais seulement s'il contient les VRAIES données (avec modèle)
  // Le fallback Excel (extraireListeMagasins) met en cache des données incomplètes (modele: '')
  // Il faut toujours tenter de charger info_PDV.json si le cache vient du fallback
  if (cache.infoPDV && cache._infoPDVSource === 'json') {
    return cache.infoPDV;
  }

  try {
    const fileHandle = await dirHandle.getFileHandle('info_PDV.json');
    const file = await fileHandle.getFile();
    const content = await file.text();
    const data = JSON.parse(content);

    // Mettre en cache avec marqueur de source
    cache.infoPDV = data;
    cache._infoPDVSource = 'json';

    return data;
  } catch (error) {
    return null;
  }
}

/**
 * Extrait la liste de tous les magasins depuis un fichier Vente_Hebdo Excel.
 * Utile quand info_PDV.json n'est pas disponible (dossier OneDrive partagé).
 * Lit la feuille "Total Pdv" et retourne un objet au même format que infoPDV.
 * @param {File} file - Fichier Excel Vente_Hebdo
 * @returns {Promise<Object|null>} Dictionnaire code PDV -> {code, ville, enseigne}
 */
export async function extraireListeMagasins(file) {
  try {
    const workbook = await chargerFichierExcel(file);
    const totalPdv = extraireFeuille(workbook, CONFIG.feuilles.TOTAL_PDV);
    if (!totalPdv || totalPdv.length === 0) return null;

    const result = {};
    for (const row of totalPdv) {
      const code = getCodePDV(row);
      if (!code) continue;
      const codeStr = String(code).trim();
      if (!codeStr || result[codeStr]) continue;

      result[codeStr] = {
        code: codeStr,
        ville: row.VILLE || row.Ville || 'Inconnu',
        enseigne: row.ENSEIGNE || row.Enseigne || 'INTERMARCHE',
        region: row.REGION || row.Region || '',
        vocation: row.VOCATION || row.Vocation || '',
        secteurLibelle: '',
        modele: '',
        surface: null,
      };
    }

    // Mettre en cache comme infoPDV pour que le reste du code fonctionne
    // Mais ne pas écraser si les vraies données (info_PDV.json) sont déjà chargées
    if (Object.keys(result).length > 0) {
      if (cache._infoPDVSource !== 'json') {
        cache.infoPDV = result;
        cache._infoPDVSource = 'fallback';
      }
      return cache.infoPDV; // Retourner les données les plus complètes disponibles
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Récupère les infos d'un magasin depuis le fichier de référence
 * Gère les différents formats de code (2023 vs 02023)
 * @param {string} codePdv - Code du magasin
 * @returns {Object|null} Infos du magasin ou null
 */
export function getInfoMagasin(codePdv) {
  if (!cache.infoPDV) return null;
  const codeStr = String(codePdv).trim();

  // Essayer avec le code tel quel
  if (cache.infoPDV[codeStr]) return cache.infoPDV[codeStr];

  // Essayer sans les zéros préfixes
  const codeSansZero = codeStr.replace(/^0+/, '');
  if (cache.infoPDV[codeSansZero]) return cache.infoPDV[codeSansZero];

  // Essayer avec zéros préfixes (5 chiffres)
  const codeAvecZero = codeStr.padStart(5, '0');
  if (cache.infoPDV[codeAvecZero]) return cache.infoPDV[codeAvecZero];

  return null;
}

/**
 * Génère le nom du fichier Excel pour une semaine donnée
 * @param {string} semaine - Format "2025-S30" ou "S30"
 * @param {number} annee - Année (optionnel si incluse dans semaine)
 * @returns {string} Nom du fichier
 */
export function getNomFichier(semaine, annee = null) {
  // Parse la semaine
  let sem, an;

  if (semaine.includes('-S')) {
    // Format "2025-S30"
    const parts = semaine.split('-S');
    an = parts[0];
    sem = parts[1].padStart(2, '0');
  } else if (semaine.startsWith('S')) {
    // Format "S30"
    sem = semaine.substring(1).padStart(2, '0');
    an = annee || new Date().getFullYear();
  } else {
    // Format "30"
    sem = semaine.padStart(2, '0');
    an = annee || new Date().getFullYear();
  }

  return `Vente_Hebdo_BVP_S${an}-${sem}.xlsx`;
}

/**
 * Liste les semaines disponibles dans le dossier DATA_perso
 * @param {FileSystemDirectoryHandle} dirHandle - Handle du dossier
 * @returns {Promise<Array>} Liste des semaines disponibles
 */
export async function listerSemainesDisponibles(dirHandle) {
  const semaines = [];

  try {
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file' && entry.name.startsWith('Vente_Hebdo_BVP_S')) {
        // Extraire la semaine du nom de fichier
        const match = entry.name.match(/Vente_Hebdo_BVP_S(\d{4})-(\d{2})\.xlsx/);
        if (match) {
          semaines.push({
            annee: match[1],
            semaine: match[2],
            code: `${match[1]}-S${match[2]}`,
            fichier: entry.name,
          });
        }
      }
    }
  } catch (error) {
    // TODO: logger professionnel
  }

  // Trier par date décroissante
  return semaines.sort((a, b) => {
    if (a.annee !== b.annee) return b.annee - a.annee;
    return parseInt(b.semaine) - parseInt(a.semaine);
  });
}

/**
 * Extrait les données d'un magasin spécifique
 * @param {File} file - Fichier Excel
 * @param {string} codePdv - Code du point de vente
 * @param {FileSystemDirectoryHandle} dirHandle - Handle du dossier (pour charger info_PDV.json)
 * @returns {Promise<Object>} Données extraites pour ce magasin
 */
export async function extraireDonneesMagasin(file, codePdv, dirHandle = null) {
  const cacheKey = `${file.name}_${codePdv}`;

  // Vérifier le cache
  if (cache.extractions.has(cacheKey)) {
    return cache.extractions.get(cacheKey);
  }

  const startTime = performance.now();

  // Charger le fichier de référence si disponible
  let infoPDV = null;
  if (dirHandle) {
    infoPDV = await chargerInfoPDV(dirHandle);
  }

  // Charger le fichier Excel
  const workbook = await chargerFichierExcel(file);

  // Normaliser le code PDV en string (supprimer zéros préfixes pour comparaison)
  const codePdvStr = String(codePdv).trim();
  const codePdvNormalise = codePdvStr.replace(/^0+/, ''); // "02023" -> "2023"

  // Extraire les feuilles nécessaires
  const totalPdv = extraireFeuille(workbook, CONFIG.feuilles.TOTAL_PDV);
  const venteHeure = extraireFeuille(workbook, CONFIG.feuilles.VENTE_HEURE);

  // Fonction de comparaison qui gère les différents formats de code (2023 vs 02023)
  const matchCodePDV = (row) => {
    const code = row._codePDV || getCodePDV(row);
    if (!code) return false;
    // Normaliser en supprimant les zéros préfixes pour comparer
    const codeNormalise = String(code).replace(/^0+/, '');
    return codeNormalise === codePdvNormalise || code === codePdvStr;
  };

  // Filtrer pour ce magasin en utilisant le code normalisé
  const magasinTotalPdv = totalPdv.find(matchCodePDV);

  const magasinVenteHeure = venteHeure.filter(matchCodePDV);

  // Récupérer les infos du magasin depuis le fichier de référence
  // Gérer les codes avec zéros en préfixe (07499 vs 7499)
  let infoMagasin = null;
  if (infoPDV) {
    // Essayer d'abord avec le code tel quel
    infoMagasin = infoPDV[codePdvStr];

    // Si non trouvé et commence par 0, essayer sans le zéro
    if (!infoMagasin && codePdvStr.startsWith('0')) {
      const codeSansZero = codePdvStr.replace(/^0+/, '');
      infoMagasin = infoPDV[codeSansZero];
    }

    // Si non trouvé, essayer avec zéro préfixe
    if (!infoMagasin) {
      const codeAvecZero = codePdvStr.padStart(5, '0');
      infoMagasin = infoPDV[codeAvecZero];
    }
  }

  // Utiliser les infos de référence ou celles du fichier hebdo
  const secteurCode = infoMagasin?.secteurCode || null;
  const secteurLibelle = infoMagasin?.secteurLibelle || null;
  const modele = infoMagasin?.modele || null;
  const vocation = infoMagasin?.vocation || magasinTotalPdv?.VOCATION || magasinTotalPdv?.Vocation;
  const region = infoMagasin?.region || magasinTotalPdv?.REGION || magasinTotalPdv?.Region;

  // Calculer la moyenne du secteur (même secteur + même modèle, ou secteur seul si pas de modèle)
  let magasinsComparables = [];
  let modeComparaison = '';

  if (infoPDV && secteurCode && modele) {
    // Mode optimal : utiliser Secteur + Modèle
    const codesComparables = Object.keys(infoPDV).filter(code => {
      const info = infoPDV[code];
      return info.secteurCode === secteurCode && info.modele === modele;
    });

    const codesComparablesSet = construireSetCodesPDV(codesComparables);
    magasinsComparables = filtrerParCodesComparables(totalPdv, codesComparablesSet);

    modeComparaison = 'Secteur + Modèle';
  } else if (infoPDV && secteurCode) {
    // Mode intermédiaire : utiliser uniquement le Secteur (quand modèle est null)
    const codesComparables = Object.keys(infoPDV).filter(code => {
      const info = infoPDV[code];
      return info.secteurCode === secteurCode;
    });

    const codesComparablesSet = construireSetCodesPDV(codesComparables);
    magasinsComparables = filtrerParCodesComparables(totalPdv, codesComparablesSet);

    modeComparaison = 'Secteur';
  } else {
    // Mode dégradé : utiliser uniquement la vocation
    magasinsComparables = totalPdv.filter(row => {
      const rowVocation = row.VOCATION || row.Vocation;
      return rowVocation === vocation && rowVocation;
    });
    modeComparaison = 'Vocation (dégradé)';
  }

  const moyenneSecteur = calculerMoyenneSecteur(magasinsComparables);

  // Extraire les données par créneau horaire (3 blocs)
  const donneesParCreneau = extraireDonneesParCreneau(magasinVenteHeure);

  // Extraire les données par tranche horaire individuelle (6 tranches) pour le diagnostic
  const donneesParTrancheHoraire = extraireDonneesParTrancheHoraire(magasinVenteHeure);

  // Calculer la moyenne secteur par créneau (mêmes magasins comparables)
  let venteHeureSecteur = [];
  if (infoPDV && secteurCode && modele) {
    const codesComparables = Object.keys(infoPDV).filter(code => {
      const info = infoPDV[code];
      return info.secteurCode === secteurCode && info.modele === modele;
    });
    const codesComparablesSet = construireSetCodesPDV(codesComparables);
    venteHeureSecteur = filtrerParCodesComparables(venteHeure, codesComparablesSet);
  } else if (infoPDV && secteurCode) {
    // Mode Secteur seul (quand modèle est null)
    const codesComparables = Object.keys(infoPDV).filter(code => {
      const info = infoPDV[code];
      return info.secteurCode === secteurCode;
    });
    const codesComparablesSet = construireSetCodesPDV(codesComparables);
    venteHeureSecteur = filtrerParCodesComparables(venteHeure, codesComparablesSet);
  } else {
    venteHeureSecteur = venteHeure.filter(row => {
      const rowVocation = row.VOCATION || row.Vocation;
      return rowVocation === vocation;
    });
  }
  const moyenneSecteurParCreneau = calculerMoyenneSecteurParCreneau(venteHeureSecteur);

  // Calculer la moyenne secteur par tranche horaire individuelle (6 tranches)
  const moyenneSecteurParTrancheHoraire = calculerMoyenneSecteurParTrancheHoraire(venteHeureSecteur);

  // Récupérer le nom de la ville
  const villeNom = infoMagasin?.ville ||
                   magasinTotalPdv?.VILLE || magasinTotalPdv?.Ville ||
                   magasinVenteHeure[0]?.VILLE || magasinVenteHeure[0]?.Ville ||
                   'Inconnu';

  // Extraire les valeurs avec les bons noms de colonnes
  const caBVP = parseFloat(magasinTotalPdv?.['Ca Tot BVP']) || 0;
  const qteBVP = parseFloat(magasinTotalPdv?.['Qte Tot BVP']) || 0;
  const ticketsBVP = parseFloat(magasinTotalPdv?.['Nb Ticket BVP']) || 0;
  const caTotal = parseFloat(magasinTotalPdv?.['Ca Tot']) || 0;
  const qteTotal = parseFloat(magasinTotalPdv?.['Qte Tot']) || 0;
  const ticketsTotal = parseFloat(magasinTotalPdv?.['Nb Ticket']) || 0;

  // Calculer la pénétration et le ticket moyen
  const penetration = ticketsTotal > 0 ? ticketsBVP / ticketsTotal : 0;
  const ticketMoyen = ticketsBVP > 0 ? caBVP / ticketsBVP : 0;

  // ========== DONNÉES HISTORIQUES (S-1 et An-1) ==========
  // Structure du fichier Excel Total_PDV :
  // - Colonnes sans suffixe = Semaine courante (ex: S02-2026)
  // - Colonnes avec _An1 = Même semaine année précédente (ex: S02-2025)
  // - Colonnes avec _S1 = Semaine précédente (ex: S01-2026)

  // Données An-1 (même semaine année précédente) - 2ème groupe de colonnes
  const caBVP_An1 = parseFloat(magasinTotalPdv?.['Ca Tot BVP_An1']) || 0;
  const qteBVP_An1 = parseFloat(magasinTotalPdv?.['Qte Tot BVP_An1']) || 0;
  const ticketsBVP_An1 = parseFloat(magasinTotalPdv?.['Nb Ticket BVP_An1']) || 0;
  const ticketsTotal_An1 = parseFloat(magasinTotalPdv?.['Nb Ticket_An1']) || 0;
  const penetration_An1 = ticketsTotal_An1 > 0 ? ticketsBVP_An1 / ticketsTotal_An1 : 0;
  const ticketMoyen_An1 = ticketsBVP_An1 > 0 ? caBVP_An1 / ticketsBVP_An1 : 0;

  // Données S-1 (semaine précédente) - 3ème groupe de colonnes
  const caBVP_S1 = parseFloat(magasinTotalPdv?.['Ca Tot BVP_S1']) || 0;
  const qteBVP_S1 = parseFloat(magasinTotalPdv?.['Qte Tot BVP_S1']) || 0;
  const ticketsBVP_S1 = parseFloat(magasinTotalPdv?.['Nb Ticket BVP_S1']) || 0;
  const ticketsTotal_S1 = parseFloat(magasinTotalPdv?.['Nb Ticket_S1']) || 0;
  const penetration_S1 = ticketsTotal_S1 > 0 ? ticketsBVP_S1 / ticketsTotal_S1 : 0;
  const ticketMoyen_S1 = ticketsBVP_S1 > 0 ? caBVP_S1 / ticketsBVP_S1 : 0;

  const result = {
    magasin: {
      code: codePdv,
      nom: villeNom,
      enseigne: infoMagasin?.enseigne || magasinTotalPdv?.ENSEIGNE || magasinTotalPdv?.Enseigne || 'INTERMARCHE',
      vocation: vocation,
      region: region,
      codePostal: infoMagasin?.codePostal || magasinTotalPdv?.CP,
      secteurCode: secteurCode,
      secteurLibelle: secteurLibelle,
      modele: modele,
      surface: infoMagasin?.surface,
    },

    comparaison: {
      nombreMagasinsComparables: magasinsComparables.length,
      filtreSecteur: secteurCode,
      filtreModele: modele,
      modeComparaison: modeComparaison,
    },

    indicateurs: {
      global: {
        pdv: {
          caBVP: caBVP,
          qteBVP: qteBVP,
          ticketsBVP: ticketsBVP,
          caTotal: caTotal,
          qteTotal: qteTotal,
          ticketsTotal: ticketsTotal,
          penetration: penetration,
          ticketMoyen: ticketMoyen,
        },
        // Données S-1 (semaine précédente)
        pdvS1: {
          caBVP: caBVP_S1,
          qteBVP: qteBVP_S1,
          ticketsBVP: ticketsBVP_S1,
          ticketsTotal: ticketsTotal_S1,
          penetration: penetration_S1,
          ticketMoyen: ticketMoyen_S1,
        },
        // Données An-1 (même semaine année précédente)
        pdvAn1: {
          caBVP: caBVP_An1,
          qteBVP: qteBVP_An1,
          ticketsBVP: ticketsBVP_An1,
          ticketsTotal: ticketsTotal_An1,
          penetration: penetration_An1,
          ticketMoyen: ticketMoyen_An1,
        },
        moyenneSecteur: moyenneSecteur,
        ecart: calculerEcarts(
          { caBVP, qteBVP, ticketsBVP, caTotal, qteTotal, ticketsTotal, penetration, ticketMoyen },
          moyenneSecteur
        ),
      },
      parCreneau: {
        matin: {
          pdv: donneesParCreneau.matin,
          moyenneSecteur: moyenneSecteurParCreneau.matin,
        },
        midi: {
          pdv: donneesParCreneau.midi,
          moyenneSecteur: moyenneSecteurParCreneau.midi,
        },
        apresMidi: {
          pdv: donneesParCreneau.apresMidi,
          moyenneSecteur: moyenneSecteurParCreneau.apresMidi,
        },
      },
      // Données détaillées par tranche horaire (6 tranches) pour le diagnostic personnalisé
      parTrancheHoraire: donneesParTrancheHoraire,
      // Moyenne secteur par tranche horaire (6 tranches) pour la comparaison
      moyenneSecteurParTrancheHoraire: moyenneSecteurParTrancheHoraire,
    },

    // Données brutes pour le planning (fréquentation)
    frequentation: {
      parHeure: magasinVenteHeure,
      totalSemaine: magasinTotalPdv,
    },

    // Métadonnées
    metadata: {
      fichierSource: file.name,
      dateExtraction: new Date().toISOString(),
      tempsExtraction: 0, // Sera mis à jour
    },
  };

  // Calculer le potentiel
  result.potentiel = calculerPotentiel(result.indicateurs);

  // ========== CLASSEMENT ET DÉTAILS DES MAGASINS DU SECTEUR ==========
  result.classement = calculerClassementSecteur({
    infoPDV, secteurCode, secteurLibelle, modele, codePdvStr, totalPdv,
  });
  // ========== FIN CLASSEMENT ==========

  // ========== DICTIONNAIRE TOUS MAGASINS (pour magasin cible) ==========
  result.dictionnaireMagasins = construireDictionnaireMagasins(totalPdv, infoPDV);
  result._venteHeureRaw = venteHeure;

  const endTime = performance.now();
  result.metadata.tempsExtraction = Math.round(endTime - startTime);

  // Mettre en cache
  cache.extractions.set(cacheKey, result);

  return result;
}

/**
 * Vide le cache
 */
export function viderCache() {
  viderCacheFichiers();
  cache.extractions.clear();
  cache.infoPDV = null;
  cache._infoPDVSource = null;
}

/**
 * Obtient les statistiques du cache
 */
export function getStatistiquesCache() {
  return {
    fichiers: 0, // Le cache fichiers est maintenant dans validationDonnees
    extractions: cache.extractions.size,
    infoPDV: cache.infoPDV ? Object.keys(cache.infoPDV).length : 0,
  };
}

export default {
  getNomFichier,
  listerSemainesDisponibles,
  extraireDonneesMagasin,
  chargerInfoPDV,
  getInfoMagasin,
  viderCache,
  getStatistiquesCache,
};
