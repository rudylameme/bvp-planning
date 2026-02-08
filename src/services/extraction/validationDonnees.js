/**
 * Validation et parsing des données Excel
 *
 * Ce module gère :
 * - La configuration des colonnes et feuilles Excel
 * - Le chargement et le parsing des fichiers Excel
 * - La détection des codes PDV dans les différents formats de colonnes
 * - L'extraction des feuilles avec gestion des colonnes dupliquées
 */

import * as XLSX from 'xlsx';

// Cache pour les fichiers Excel chargés
const cachesFichiers = new Map();

// Configuration
export const CONFIG = {
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
 * Charge un fichier Excel et le parse
 * @param {File} file - Fichier Excel
 * @returns {Promise<Object>} Workbook parsé
 */
export async function chargerFichierExcel(file) {
  const cacheKey = file.name;

  // Vérifier le cache
  if (cachesFichiers.has(cacheKey)) {
    return cachesFichiers.get(cacheKey);
  }

  const startTime = performance.now();

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  // Mettre en cache
  cachesFichiers.set(cacheKey, workbook);

  return workbook;
}

/**
 * Trouve la valeur du code PDV dans un objet (gère les différents noms de colonnes)
 */
export function getCodePDV(obj) {
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
export function extraireFeuille(workbook, sheetName) {
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
 * Construit un Set de codes PDV normalisés (avec et sans zéros préfixes)
 * pour permettre le matching entre différents formats de codes
 * @param {Array<string>} codes - Liste de codes PDV
 * @returns {Set<string>} Set de tous les formats possibles
 */
export function construireSetCodesPDV(codes) {
  const set = new Set();
  codes.forEach(code => {
    set.add(code);
    set.add(code.replace(/^0+/, ''));
    set.add(code.padStart(5, '0'));
  });
  return set;
}

/**
 * Filtre un tableau de lignes en ne gardant que celles dont le code PDV
 * fait partie du set de codes fourni
 * @param {Array} rows - Lignes à filtrer
 * @param {Set<string>} codesSet - Set de codes PDV acceptés
 * @returns {Array} Lignes filtrées
 */
export function filtrerParCodesComparables(rows, codesSet) {
  return rows.filter(row => {
    const code = row._codePDV || getCodePDV(row);
    const codeNormalise = code.replace(/^0+/, '');
    return codesSet.has(code) ||
           codesSet.has(codeNormalise) ||
           codesSet.has(code.padStart(5, '0'));
  });
}

/**
 * Vide le cache des fichiers Excel
 */
export function viderCacheFichiers() {
  cachesFichiers.clear();
}
