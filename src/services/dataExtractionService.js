/**
 * Service d'extraction de données depuis les fichiers Excel hebdomadaires
 *
 * Ce service permet de :
 * - Charger un fichier Excel hebdomadaire
 * - Extraire uniquement les données d'un magasin spécifique
 * - Mettre en cache les résultats pour éviter les relectures
 * - Fournir les données au module Benchmark ET au module Planning
 */

import * as XLSX from 'xlsx';

// Cache pour éviter de relire les fichiers Excel
const cache = {
  fichiers: new Map(),      // Cache des fichiers Excel complets
  extractions: new Map(),   // Cache des extractions par magasin
  infoPDV: null,            // Cache du fichier de référence info_PDV.json
};

// Configuration
const CONFIG = {
  // Chemin vers le dossier DATA_perso (sera configurable)
  dataPath: '/DATA_perso',

  // Mapping des feuilles Excel
  feuilles: {
    TOTAL_PDV: 'Total Pdv',
    VENTE_HEURE: 'Vente heure',
    VENTE_JOUR_HEURE: 'Vente jour heure',
    PARAMETRES: 'PARAMETRES',
  },

  // Colonnes possibles pour le code PDV (selon les feuilles)
  colonnesPDV: ['CODE_PDV', 'Pdv', 'Code PDV', 'Numero', 'code_pdv'],

  // Colonnes de données (noms réels dans les fichiers Excel)
  // Note: Les colonnes peuvent être dupliquées (Sem N, N-1, etc.)
  colonnesData: {
    CA_BVP: 'Ca Tot BVP',
    QTE_BVP: 'Qte Tot BVP',
    TICKETS_BVP: 'Nb Ticket BVP',
    CA_TOTAL: 'Ca Tot',
    QTE_TOTAL: 'Qte Tot',
    TICKETS_TOTAL: 'Nb Ticket',
    HORAIRE: 'HORAIRE',
  },

  // Colonnes importantes pour le regroupement
  colonnes: {
    CODE_PDV: 'CODE_PDV',
    VOCATION: 'VOCATION',   // Utilisé pour grouper les magasins comparables
    REGION: 'REGION',
    VILLE: 'VILLE',
    ENSEIGNE: 'ENSEIGNE',
  }
};

/**
 * Charge le fichier de référence info_PDV.json
 * Contient les infos stables de chaque magasin : secteur, modèle, etc.
 * @param {FileSystemDirectoryHandle} dirHandle - Handle du dossier DATA_perso
 * @returns {Promise<Object>} Dictionnaire code PDV -> infos magasin
 */
export async function chargerInfoPDV(dirHandle) {
  // Vérifier le cache
  if (cache.infoPDV) {
    return cache.infoPDV;
  }

  try {
    const fileHandle = await dirHandle.getFileHandle('info_PDV.json');
    const file = await fileHandle.getFile();
    const content = await file.text();
    const data = JSON.parse(content);

    // Mettre en cache
    cache.infoPDV = data;

    return data;
  } catch (error) {
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
 * Charge un fichier Excel et le parse
 * @param {File} file - Fichier Excel
 * @returns {Promise<Object>} Workbook parsé
 */
async function chargerFichierExcel(file) {
  const cacheKey = file.name;

  // Vérifier le cache
  if (cache.fichiers.has(cacheKey)) {
    return cache.fichiers.get(cacheKey);
  }

  const startTime = performance.now();

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  // Mettre en cache
  cache.fichiers.set(cacheKey, workbook);

  return workbook;
}

/**
 * Trouve la valeur du code PDV dans un objet (gère les différents noms de colonnes)
 */
function getCodePDV(obj) {
  for (const col of CONFIG.colonnesPDV) {
    if (obj[col] !== undefined && obj[col] !== null && obj[col] !== '') {
      return String(obj[col]);
    }
  }
  return null;
}

/**
 * Extrait les données d'une feuille en tableau d'objets
 * @param {Object} workbook - Workbook XLSX
 * @param {string} sheetName - Nom de la feuille
 * @returns {Array} Données de la feuille
 */
function extraireFeuille(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    return [];
  }

  // Convertir en JSON avec headers
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  if (data.length < 2) return [];

  // Trouver la ligne d'en-tête (chercher des colonnes connues)
  let headerRowIndex = 0;
  const colonnesARechercher = [...CONFIG.colonnesPDV, 'ENSEIGNE', 'Enseigne', 'VILLE', 'Ville', 'REGION', 'Region'];

  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (row && row.some(cell => colonnesARechercher.includes(cell))) {
      headerRowIndex = i;
      break;
    }
  }

  const headers = data[headerRowIndex];
  if (!headers) {
    return [];
  }

  // Colonnes historiques pour debug
  const colonnesHistoriques = headers.filter(h => h && (h.includes('_1') || h.includes('_2') || h.includes('N-1') || h.includes('An-1')));

  const result = [];

  // Gérer les colonnes dupliquées en ajoutant des suffixes _1, _2, etc.
  // Structure du fichier Total_PDV :
  // - Colonnes 0-5 : ENSEIGNE, REGION, VOCATION, CP, CODE_PDV, VILLE
  // - Colonnes 6-11 : Semaine courante (Ca Tot BVP, Qte Tot BVP, Nb Ticket BVP, Ca Tot, Qte Tot, Nb Ticket)
  // - Colonnes 12-17 : An-1 (même semaine année précédente) - suffixe _An1
  // - Colonnes 18-23 : S-1 (semaine précédente) - suffixe _S1
  const headerCounts = {};
  const headersWithSuffixes = headers.map((header, index) => {
    if (!header) return header;

    // Colonnes de données qui sont dupliquées
    const colonnesDupliquees = ['Ca Tot BVP', 'Qte Tot BVP', 'Nb Ticket BVP', 'Ca Tot', 'Qte Tot', 'Nb Ticket'];

    if (colonnesDupliquees.includes(header)) {
      if (!headerCounts[header]) {
        headerCounts[header] = 0;
      }
      const count = headerCounts[header];
      headerCounts[header]++;

      // Première occurrence = semaine courante (pas de suffixe)
      // Deuxième occurrence = An-1 (suffixe _An1)
      // Troisième occurrence = S-1 (suffixe _S1)
      if (count === 0) return header;
      if (count === 1) return `${header}_An1`;
      if (count === 2) return `${header}_S1`;
      return `${header}_${count}`;
    }

    return header;
  });

  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const obj = {};
    headersWithSuffixes.forEach((header, index) => {
      if (header && row[index] !== undefined) {
        obj[header] = row[index];
      }
    });

    // Ne garder que les lignes avec un code PDV valide
    const codePdv = getCodePDV(obj);
    if (codePdv) {
      obj._codePDV = codePdv; // Stocker le code PDV normalisé
      result.push(obj);
    }
  }

  return result;
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

    // Créer un Set de tous les formats possibles des codes comparables
    const codesComparablesSet = new Set();
    codesComparables.forEach(code => {
      codesComparablesSet.add(code);
      codesComparablesSet.add(code.replace(/^0+/, ''));
      codesComparablesSet.add(code.padStart(5, '0'));
    });

    // Matcher en gérant les zéros préfixes
    magasinsComparables = totalPdv.filter(row => {
      const code = row._codePDV || getCodePDV(row);
      const codeNormalise = code.replace(/^0+/, '');
      // Essayer plusieurs formats de code
      return codesComparablesSet.has(code) ||
             codesComparablesSet.has(codeNormalise) ||
             codesComparablesSet.has(code.padStart(5, '0'));
    });

    modeComparaison = 'Secteur + Modèle';
  } else if (infoPDV && secteurCode) {
    // Mode intermédiaire : utiliser uniquement le Secteur (quand modèle est null)
    const codesComparables = Object.keys(infoPDV).filter(code => {
      const info = infoPDV[code];
      return info.secteurCode === secteurCode;
    });

    // Créer un Set de tous les formats possibles des codes comparables
    const codesComparablesSet = new Set();
    codesComparables.forEach(code => {
      codesComparablesSet.add(code);
      codesComparablesSet.add(code.replace(/^0+/, ''));
      codesComparablesSet.add(code.padStart(5, '0'));
    });

    // Matcher en gérant les zéros préfixes
    magasinsComparables = totalPdv.filter(row => {
      const code = row._codePDV || getCodePDV(row);
      const codeNormalise = code.replace(/^0+/, '');
      return codesComparablesSet.has(code) ||
             codesComparablesSet.has(codeNormalise) ||
             codesComparablesSet.has(code.padStart(5, '0'));
    });

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
    const codesComparablesSet = new Set();
    codesComparables.forEach(code => {
      codesComparablesSet.add(code);
      codesComparablesSet.add(code.replace(/^0+/, ''));
      codesComparablesSet.add(code.padStart(5, '0'));
    });
    venteHeureSecteur = venteHeure.filter(row => {
      const code = row._codePDV || getCodePDV(row);
      const codeNormalise = code.replace(/^0+/, '');
      return codesComparablesSet.has(code) ||
             codesComparablesSet.has(codeNormalise) ||
             codesComparablesSet.has(code.padStart(5, '0'));
    });
  } else if (infoPDV && secteurCode) {
    // Mode Secteur seul (quand modèle est null)
    const codesComparables = Object.keys(infoPDV).filter(code => {
      const info = infoPDV[code];
      return info.secteurCode === secteurCode;
    });
    const codesComparablesSet = new Set();
    codesComparables.forEach(code => {
      codesComparablesSet.add(code);
      codesComparablesSet.add(code.replace(/^0+/, ''));
      codesComparablesSet.add(code.padStart(5, '0'));
    });
    venteHeureSecteur = venteHeure.filter(row => {
      const code = row._codePDV || getCodePDV(row);
      const codeNormalise = code.replace(/^0+/, '');
      return codesComparablesSet.has(code) ||
             codesComparablesSet.has(codeNormalise) ||
             codesComparablesSet.has(code.padStart(5, '0'));
    });
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

  // 1. Calculer les données de tous les magasins du SECTEUR (pas juste Secteur+Modèle)
  let magasinsSecteur = [];
  if (infoPDV && secteurCode) {
    // Tous les magasins du même secteur (tous modèles confondus)
    const codesSecteur = Object.keys(infoPDV).filter(code => {
      const info = infoPDV[code];
      return info.secteurCode === secteurCode;
    });

    // Créer un Set de tous les formats possibles des codes secteur
    const codesSecteurSet = new Set();
    codesSecteur.forEach(code => {
      codesSecteurSet.add(code);
      codesSecteurSet.add(code.replace(/^0+/, ''));
      codesSecteurSet.add(code.padStart(5, '0'));
    });

    magasinsSecteur = totalPdv
      .filter(row => {
        const code = row._codePDV || getCodePDV(row);
        const codeNormalise = code.replace(/^0+/, '');
        // Matcher en gérant les zéros préfixes
        return codesSecteurSet.has(code) ||
               codesSecteurSet.has(codeNormalise) ||
               codesSecteurSet.has(code.padStart(5, '0'));
      })
      .map(row => {
        const code = row._codePDV || getCodePDV(row);
        // Trouver l'info avec différents formats de code
        const info = infoPDV[code] || infoPDV[code.replace(/^0+/, '')] || infoPDV[code.padStart(5, '0')] || {};
        const caBVPMag = parseFloat(row['Ca Tot BVP']) || 0;
        const ticketsBVPMag = parseFloat(row['Nb Ticket BVP']) || 0;
        const ticketsTotalMag = parseFloat(row['Nb Ticket']) || 0;
        const penetrationMag = ticketsTotalMag > 0 ? ticketsBVPMag / ticketsTotalMag : 0;

        return {
          code: code,
          ville: info.ville || row.VILLE || row.Ville || 'Inconnu',
          enseigne: info.enseigne || row.ENSEIGNE || row.Enseigne || 'INTERMARCHE',
          vocation: info.vocation || row.VOCATION || row.Vocation || 'NC',
          secteurLibelle: info.secteurLibelle || secteurLibelle || 'NC',
          modele: info.modele || 'NC',
          surface: info.surface || null,
          caBVP: caBVPMag,
          qteBVP: parseFloat(row['Qte Tot BVP']) || 0,
          ticketsBVP: ticketsBVPMag,
          ticketsTotal: ticketsTotalMag,
          penetration: penetrationMag,
          ticketMoyen: ticketsBVPMag > 0 ? caBVPMag / ticketsBVPMag : 0,
          prixMoyenArticle: (parseFloat(row['Qte Tot BVP']) || 0) > 0 ? caBVPMag / (parseFloat(row['Qte Tot BVP']) || 1) : 0,
          estMemeModele: info.modele === modele,
          estMagasinCourant: code === codePdvStr ||
                             code.replace(/^0+/, '') === codePdvStr.replace(/^0+/, '') ||
                             code.padStart(5, '0') === codePdvStr.padStart(5, '0'),
        };
      });

    // Trier par taux de pénétration décroissant
    magasinsSecteur.sort((a, b) => b.penetration - a.penetration);
  }

  // 2. Trouver la position du magasin courant dans le classement
  const positionSecteur = magasinsSecteur.findIndex(m => m.estMagasinCourant) + 1;
  const totalSecteur = magasinsSecteur.length;

  // 3. Top 10 du secteur
  const top10Secteur = magasinsSecteur.slice(0, 10);

  // 4. Classement autour du PDV (+5 / -5 positions)
  let classementAutour = [];
  if (positionSecteur > 0) {
    const indexCourant = positionSecteur - 1;
    const debut = Math.max(0, indexCourant - 5);
    const fin = Math.min(magasinsSecteur.length, indexCourant + 6);
    classementAutour = magasinsSecteur.slice(debut, fin).map((m, i) => ({
      ...m,
      position: debut + i + 1,
    }));
  }

  // 5. Détails des magasins comparables (même Secteur + même Modèle)
  const detailsComparables = magasinsSecteur
    .filter(m => m.estMemeModele)
    .map((m, i) => ({ ...m, position: i + 1 }));

  // Ajouter au résultat
  result.classement = {
    positionSecteur,
    totalSecteur,
    top10Secteur,
    classementAutour,
    detailsComparables,
  };

  // ========== FIN CLASSEMENT ==========

  const endTime = performance.now();
  result.metadata.tempsExtraction = Math.round(endTime - startTime);

  // Mettre en cache
  cache.extractions.set(cacheKey, result);

  return result;
}

/**
 * Calcule la moyenne du secteur
 */
function calculerMoyenneSecteur(magasins) {
  if (!magasins || magasins.length === 0) {
    return {
      caBVP: 0,
      qteBVP: 0,
      ticketsBVP: 0,
      caTotal: 0,
      qteTotal: 0,
      ticketsTotal: 0,
      penetration: 0,
      ticketMoyen: 0,
    };
  }

  const count = magasins.length;

  // Utiliser les vrais noms de colonnes du fichier Excel
  const sum = (arr, key) => arr.reduce((acc, row) => acc + (parseFloat(row[key]) || 0), 0);

  const caBVP = sum(magasins, 'Ca Tot BVP') / count;
  const qteBVP = sum(magasins, 'Qte Tot BVP') / count;
  const ticketsBVP = sum(magasins, 'Nb Ticket BVP') / count;
  const caTotal = sum(magasins, 'Ca Tot') / count;
  const qteTotal = sum(magasins, 'Qte Tot') / count;
  const ticketsTotal = sum(magasins, 'Nb Ticket') / count;

  // Calculer pénétration et ticket moyen à partir des valeurs
  const penetration = ticketsTotal > 0 ? ticketsBVP / ticketsTotal : 0;
  const ticketMoyen = ticketsBVP > 0 ? caBVP / ticketsBVP : 0;

  return {
    caBVP,
    qteBVP,
    ticketsBVP,
    caTotal,
    qteTotal,
    ticketsTotal,
    penetration,
    ticketMoyen,
  };
}

/**
 * Extrait les données par créneau horaire (regroupés en 3 blocs : matin, midi, après-midi)
 * La colonne HORAIRE contient: '00_Autre', '09h_12h', '12h_14h', '14h_16h', '16h_19h', '19h_23h'
 */
function extraireDonneesParCreneau(venteHeure) {
  const creneaux = {
    matin: { tranches: ['00_Autre', '09h_12h'] },
    midi: { tranches: ['12h_14h'] },
    apresMidi: { tranches: ['14h_16h', '16h_19h', '19h_23h'] },
  };

  const result = {};

  for (const [creneau, config] of Object.entries(creneaux)) {
    // Filtrer par la colonne HORAIRE
    const lignes = venteHeure.filter(row => {
      const horaire = row.HORAIRE || row.Horaire || row.Tr_horaire;
      return config.tranches.includes(horaire);
    });

    // Données semaine courante
    const ticketsBVP = lignes.reduce((acc, row) => acc + (parseFloat(row['Nb Ticket BVP']) || 0), 0);
    const ticketsTotal = lignes.reduce((acc, row) => acc + (parseFloat(row['Nb Ticket']) || 0), 0);

    // Données An-1 (même semaine année précédente)
    const ticketsBVP_An1 = lignes.reduce((acc, row) => acc + (parseFloat(row['Nb Ticket BVP_An1']) || 0), 0);
    const ticketsTotal_An1 = lignes.reduce((acc, row) => acc + (parseFloat(row['Nb Ticket_An1']) || 0), 0);

    // Données S-1 (semaine précédente)
    const ticketsBVP_S1 = lignes.reduce((acc, row) => acc + (parseFloat(row['Nb Ticket BVP_S1']) || 0), 0);
    const ticketsTotal_S1 = lignes.reduce((acc, row) => acc + (parseFloat(row['Nb Ticket_S1']) || 0), 0);

    result[creneau] = {
      caBVP: lignes.reduce((acc, row) => acc + (parseFloat(row['Ca Tot BVP']) || 0), 0),
      qteBVP: lignes.reduce((acc, row) => acc + (parseFloat(row['Qte Tot BVP']) || 0), 0),
      ticketsBVP: ticketsBVP,
      caTotal: lignes.reduce((acc, row) => acc + (parseFloat(row['Ca Tot']) || 0), 0),
      qteTotal: lignes.reduce((acc, row) => acc + (parseFloat(row['Qte Tot']) || 0), 0),
      ticketsTotal: ticketsTotal,
      // Pénétration semaine courante
      penetration: ticketsTotal > 0 ? ticketsBVP / ticketsTotal : 0,
      // Pénétration An-1
      penetrationAn1: ticketsTotal_An1 > 0 ? ticketsBVP_An1 / ticketsTotal_An1 : 0,
      // Pénétration S-1
      penetrationS1: ticketsTotal_S1 > 0 ? ticketsBVP_S1 / ticketsTotal_S1 : 0,
    };
  }

  return result;
}

/**
 * Extrait les données par tranche horaire individuelle (6 tranches)
 * Pour le diagnostic personnalisé qui identifie le créneau avec le plus de clients perdus
 */
function extraireDonneesParTrancheHoraire(venteHeure) {
  // Configuration des 6 tranches horaires du fichier Excel
  const tranches = {
    '00_Autre': {
      label: 'en dehors des horaires classiques',
      cause: 'Des clients passent avant l\'ouverture ou après la fermeture habituelle (boulangerie donnant sur l\'extérieur ?)',
      action: 'Vérifier les horaires réels d\'affluence et adapter les cuissons',
      horaireCuisson: null,
    },
    '09h_12h': {
      label: 'le matin',
      cause: 'Rayons pas encore garnis à l\'ouverture',
      action: 'Cuisson prête dès l\'ouverture',
      horaireCuisson: 'dès l\'ouverture',
    },
    '12h_14h': {
      label: 'le midi',
      cause: 'Cuisson du matin épuisée au pic du déjeuner',
      action: 'Cuisson vers 11h30',
      horaireCuisson: '11h30',
    },
    '14h_16h': {
      label: 'en début d\'après-midi',
      cause: 'Rayons vides après le rush du midi',
      action: 'Cuisson vers 13h30',
      horaireCuisson: '13h30',
    },
    '16h_19h': {
      label: 'en fin d\'après-midi',
      cause: 'Clients sortie école/travail trouvent rayons vides',
      action: 'Cuisson vers 15h30',
      horaireCuisson: '15h30',
    },
    '19h_23h': {
      label: 'le soir',
      cause: 'Derniers clients n\'ont plus de choix',
      action: 'Cuisson vers 18h30 ou réserve',
      horaireCuisson: '18h30',
    },
  };

  const result = {};

  for (const [trancheKey, config] of Object.entries(tranches)) {
    // Filtrer par la colonne HORAIRE
    const lignes = venteHeure.filter(row => {
      const horaire = row.HORAIRE || row.Horaire || row.Tr_horaire;
      return horaire === trancheKey;
    });

    // Données semaine courante
    const ticketsBVP = lignes.reduce((acc, row) => acc + (parseFloat(row['Nb Ticket BVP']) || 0), 0);
    const ticketsTotal = lignes.reduce((acc, row) => acc + (parseFloat(row['Nb Ticket']) || 0), 0);
    const caBVP = lignes.reduce((acc, row) => acc + (parseFloat(row['Ca Tot BVP']) || 0), 0);

    // Clients perdus = clients passés en caisse SANS acheter BVP
    const clientsPerdus = ticketsTotal - ticketsBVP;

    result[trancheKey] = {
      ...config,
      key: trancheKey,
      ticketsBVP,
      ticketsTotal,
      caBVP,
      clientsPerdus: Math.max(0, clientsPerdus),
      penetration: ticketsTotal > 0 ? ticketsBVP / ticketsTotal : 0,
    };
  }

  return result;
}

/**
 * Calcule la moyenne du secteur par créneau
 */
function calculerMoyenneSecteurParCreneau(venteHeureSecteur) {
  const creneaux = {
    matin: { tranches: ['00_Autre', '09h_12h'] },
    midi: { tranches: ['12h_14h'] },
    apresMidi: { tranches: ['14h_16h', '16h_19h', '19h_23h'] },
  };

  const result = {};

  // Grouper par magasin d'abord (utiliser _codePDV qui est normalisé)
  const magasins = [...new Set(venteHeureSecteur.map(row => row._codePDV))].filter(Boolean);

  for (const [creneau, config] of Object.entries(creneaux)) {
    const valeursParMagasin = magasins.map(codePdv => {
      const lignes = venteHeureSecteur.filter(row => {
        const horaire = row.HORAIRE || row.Horaire || row.Tr_horaire;
        return row._codePDV === codePdv && config.tranches.includes(horaire);
      });

      return {
        caBVP: lignes.reduce((acc, row) => acc + (parseFloat(row['Ca Tot BVP']) || 0), 0),
        qteBVP: lignes.reduce((acc, row) => acc + (parseFloat(row['Qte Tot BVP']) || 0), 0),
        ticketsBVP: lignes.reduce((acc, row) => acc + (parseFloat(row['Nb Ticket BVP']) || 0), 0),
        ticketsTotal: lignes.reduce((acc, row) => acc + (parseFloat(row['Nb Ticket']) || 0), 0),
      };
    });

    const count = valeursParMagasin.length || 1;

    result[creneau] = {
      caBVP: valeursParMagasin.reduce((acc, v) => acc + v.caBVP, 0) / count,
      qteBVP: valeursParMagasin.reduce((acc, v) => acc + v.qteBVP, 0) / count,
      ticketsBVP: valeursParMagasin.reduce((acc, v) => acc + v.ticketsBVP, 0) / count,
      ticketsTotal: valeursParMagasin.reduce((acc, v) => acc + v.ticketsTotal, 0) / count,
    };

    result[creneau].penetration = result[creneau].ticketsTotal > 0
      ? result[creneau].ticketsBVP / result[creneau].ticketsTotal
      : 0;
  }

  return result;
}

/**
 * Calcule la moyenne du secteur par tranche horaire individuelle (6 tranches)
 * Pour la comparaison dans BarresPenetration
 */
function calculerMoyenneSecteurParTrancheHoraire(venteHeureSecteur) {
  const tranches = ['00_Autre', '09h_12h', '12h_14h', '14h_16h', '16h_19h', '19h_23h'];

  const result = {};

  // Grouper par magasin d'abord
  const magasins = [...new Set(venteHeureSecteur.map(row => row._codePDV))].filter(Boolean);

  for (const trancheKey of tranches) {
    const valeursParMagasin = magasins.map(codePdv => {
      const lignes = venteHeureSecteur.filter(row => {
        const horaire = row.HORAIRE || row.Horaire || row.Tr_horaire;
        return row._codePDV === codePdv && horaire === trancheKey;
      });

      const ticketsBVP = lignes.reduce((acc, row) => acc + (parseFloat(row['Nb Ticket BVP']) || 0), 0);
      const ticketsTotal = lignes.reduce((acc, row) => acc + (parseFloat(row['Nb Ticket']) || 0), 0);

      return {
        ticketsBVP,
        ticketsTotal,
        penetration: ticketsTotal > 0 ? ticketsBVP / ticketsTotal : 0,
      };
    }).filter(v => v.ticketsTotal > 0); // Ne garder que les magasins avec du trafic sur cette tranche

    const count = valeursParMagasin.length || 1;

    // Moyenne des pénétrations (pas la pénétration des moyennes)
    result[trancheKey] = {
      ticketsBVP: valeursParMagasin.reduce((acc, v) => acc + v.ticketsBVP, 0) / count,
      ticketsTotal: valeursParMagasin.reduce((acc, v) => acc + v.ticketsTotal, 0) / count,
      penetration: valeursParMagasin.reduce((acc, v) => acc + v.penetration, 0) / count,
    };
  }

  return result;
}

/**
 * Calcule les écarts entre PDV et moyenne secteur
 * @param {Object} pdv - Données du PDV avec propriétés normalisées (caBVP, etc.)
 * @param {Object} moyenne - Moyenne du secteur
 */
function calculerEcarts(pdv, moyenne) {
  if (!pdv || !moyenne) return {};

  const ecartPourcent = (valPdv, valMoy) => {
    if (!valMoy || valMoy === 0) return 0;
    return ((valPdv - valMoy) / valMoy) * 100;
  };

  return {
    caBVP: {
      valeur: (pdv.caBVP || 0) - moyenne.caBVP,
      pourcent: ecartPourcent(pdv.caBVP, moyenne.caBVP),
    },
    qteBVP: {
      valeur: (pdv.qteBVP || 0) - moyenne.qteBVP,
      pourcent: ecartPourcent(pdv.qteBVP, moyenne.qteBVP),
    },
    ticketsBVP: {
      valeur: (pdv.ticketsBVP || 0) - moyenne.ticketsBVP,
      pourcent: ecartPourcent(pdv.ticketsBVP, moyenne.ticketsBVP),
    },
    penetration: {
      points: ((pdv.penetration || 0) - moyenne.penetration) * 100,
    },
    ticketMoyen: {
      valeur: (pdv.ticketMoyen || 0) - moyenne.ticketMoyen,
      pourcent: ecartPourcent(pdv.ticketMoyen, moyenne.ticketMoyen),
    },
  };
}

/**
 * Calcule le potentiel d'amélioration
 */
function calculerPotentiel(indicateurs) {
  const creneaux = indicateurs.parCreneau;

  // Trouver la meilleure pénétration parmi les créneaux
  const penetrationMax = Math.max(
    creneaux.matin?.pdv?.penetration || 0,
    creneaux.midi?.pdv?.penetration || 0,
    creneaux.apresMidi?.pdv?.penetration || 0
  );

  const ticketsTotal = indicateurs.global.pdv.ticketsTotal || 0;
  const ticketsActuels = indicateurs.global.pdv.ticketsBVP || 0;
  const ticketsPotentiels = Math.round(ticketsTotal * penetrationMax);
  const ticketMoyen = indicateurs.global.pdv.ticketMoyen || 0;

  // Identifier le créneau prioritaire (plus gros écart avec le max)
  let creneauPrioritaire = 'matin';
  let maxEcart = 0;

  for (const [nom, data] of Object.entries(creneaux)) {
    const ecart = penetrationMax - (data?.pdv?.penetration || 0);
    if (ecart > maxEcart) {
      maxEcart = ecart;
      creneauPrioritaire = nom;
    }
  }

  return {
    tauxPenetrationMax: penetrationMax,
    ticketsActuels,
    ticketsPotentiels,
    gainTickets: ticketsPotentiels - ticketsActuels,
    gainCaEstime: (ticketsPotentiels - ticketsActuels) * ticketMoyen,
    creneauPrioritaire,
  };
}

/**
 * Vide le cache
 */
export function viderCache() {
  cache.fichiers.clear();
  cache.extractions.clear();
  cache.infoPDV = null;
}

/**
 * Obtient les statistiques du cache
 */
export function getStatistiquesCache() {
  return {
    fichiers: cache.fichiers.size,
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
