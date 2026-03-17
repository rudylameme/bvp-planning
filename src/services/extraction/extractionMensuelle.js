/**
 * Extraction positionnelle des données depuis les fichiers Excel MENSUELS
 *
 * Les fichiers mensuels (Vente_Mensuelle_BVP_M*.xlsx) ont une structure différente
 * des fichiers hebdomadaires :
 * - Les colonnes de données sont dupliquées avec les mêmes noms ("Ca", "Qte", "Ticket")
 * - Elles sont identifiées par leur POSITION, pas par leur nom
 * - Les groupes de colonnes sont décrits par les en-têtes de la ligne 2
 *
 * Ce module parse ces fichiers et retourne des objets avec les MÊMES noms de propriétés
 * que l'extraction hebdo (ex: 'Ca Tot BVP', 'Nb Ticket BVP_An1', 'HORAIRE', etc.)
 * pour assurer la compatibilité avec les services de calcul existants.
 */

import * as XLSX from 'xlsx';
import { chargerFichierExcel, getCodePDV } from './validationDonnees.js';

// ========================
// CONFIGURATION MENSUELLE
// ========================

/**
 * Mapping positionnel pour la feuille "Total Pdv" (18 colonnes)
 *
 * Cols 0-5 : Enseigne, Région, Vocation, CP, Pdv, Ville
 * Cols 6-8 : Total BVP courant (Ca, Qte, Ticket)
 * Cols 9-11 : Total PDV courant (Ca, Qte, Ticket)
 * Cols 12-14 : Total BVP An-1 (Ca, Qte, Ticket)
 * Cols 15-17 : Total PDV An-1 (Ca, Qte, Ticket)
 */
const MAPPING_TOTAL_PDV = {
  meta: [
    { index: 0, nom: 'ENSEIGNE' },
    { index: 1, nom: 'REGION' },
    { index: 2, nom: 'VOCATION' },
    { index: 3, nom: 'CP' },
    { index: 4, nom: 'Pdv' },      // Code PDV
    { index: 5, nom: 'VILLE' },
  ],
  // BVP courant → mêmes noms que l'hebdo
  bvpCourant: [
    { index: 6, nom: 'Ca Tot BVP' },
    { index: 7, nom: 'Qte Tot BVP' },
    { index: 8, nom: 'Nb Ticket BVP' },
  ],
  // PDV courant → mêmes noms que l'hebdo
  pdvCourant: [
    { index: 9, nom: 'Ca Tot' },
    { index: 10, nom: 'Qte Tot' },
    { index: 11, nom: 'Nb Ticket' },
  ],
  // BVP An-1 → mêmes noms avec suffixe _An1
  bvpAn1: [
    { index: 12, nom: 'Ca Tot BVP_An1' },
    { index: 13, nom: 'Qte Tot BVP_An1' },
    { index: 14, nom: 'Nb Ticket BVP_An1' },
  ],
  // PDV An-1 → mêmes noms avec suffixe _An1
  pdvAn1: [
    { index: 15, nom: 'Ca Tot_An1' },
    { index: 16, nom: 'Qte Tot_An1' },
    { index: 17, nom: 'Nb Ticket_An1' },
  ],
};

/**
 * Mapping positionnel pour la feuille "Ventes Moyennes Horaire" (43 colonnes)
 *
 * Cols 0-6 : Enseigne, Région, Vocation, CP, Pdv, Ville, Tr_HEURE
 *
 * Puis 12 groupes de 3 colonnes (Ca, Qte, Ticket) :
 * Groupes 1-6 = Période courante
 * Groupes 7-12 = Période An-1
 *
 * On utilise les groupes "Total BVP mois complet" et "Total PDV mois complet"
 * (groupes 5-6 pour courant, 11-12 pour An-1)
 */
const MAPPING_VENTE_HEURE = {
  meta: [
    { index: 0, nom: 'ENSEIGNE' },
    { index: 1, nom: 'REGION' },
    { index: 2, nom: 'VOCATION' },
    { index: 3, nom: 'CP' },
    { index: 4, nom: 'Pdv' },
    { index: 5, nom: 'VILLE' },
    { index: 6, nom: 'HORAIRE' },   // "Tr_HEURE" dans le fichier, mappé vers "HORAIRE" pour compatibilité
  ],
  // Groupe 5 : Total BVP mois complet (courant)
  bvpCourant: [
    { index: 19, nom: 'Ca Tot BVP' },
    { index: 20, nom: 'Qte Tot BVP' },
    { index: 21, nom: 'Nb Ticket BVP' },
  ],
  // Groupe 6 : Total PDV mois complet (courant)
  pdvCourant: [
    { index: 22, nom: 'Ca Tot' },
    { index: 23, nom: 'Qte Tot' },
    { index: 24, nom: 'Nb Ticket' },
  ],
  // Groupe 11 : Total BVP mois complet (An-1)
  bvpAn1: [
    { index: 37, nom: 'Ca Tot BVP_An1' },
    { index: 38, nom: 'Qte Tot BVP_An1' },
    { index: 39, nom: 'Nb Ticket BVP_An1' },
  ],
  // Groupe 12 : Total PDV mois complet (An-1)
  pdvAn1: [
    { index: 40, nom: 'Ca Tot_An1' },
    { index: 41, nom: 'Qte Tot_An1' },
    { index: 42, nom: 'Nb Ticket_An1' },
  ],
};

// ========================
// FONCTIONS D'EXTRACTION
// ========================

/**
 * Extrait les données d'une feuille mensuelle en utilisant un mapping positionnel.
 * Retourne un tableau d'objets avec les mêmes noms de propriétés que l'extraction hebdo.
 *
 * @param {Object} workbook - Workbook XLSX parsé
 * @param {string} sheetName - Nom de la feuille ("Total Pdv" ou "Ventes Moyennes Horaire")
 * @param {Object} mapping - Mapping positionnel (MAPPING_TOTAL_PDV ou MAPPING_VENTE_HEURE)
 * @returns {Array<Object>} Données avec propriétés nommées compatibles hebdo
 */
export function extraireFeuilleMensuelle(workbook, sheetName, mapping) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    return [];
  }

  // Convertir en tableau brut (lignes de valeurs)
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  if (data.length < 4) return []; // Au moins headers + 1 ligne de données

  // Trouver la ligne d'en-tête (chercher "Pdv" ou "Enseigne")
  let headerRowIndex = 0;
  const marqueurs = ['Pdv', 'Enseigne', 'CODE_PDV'];

  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (row && row.some(cell => marqueurs.includes(cell))) {
      headerRowIndex = i;
      break;
    }
  }

  // Construire le mapping complet (aplatir tous les groupes)
  const allMappings = [
    ...mapping.meta,
    ...mapping.bvpCourant,
    ...mapping.pdvCourant,
    ...mapping.bvpAn1,
    ...mapping.pdvAn1,
  ];

  // Extraire les données ligne par ligne
  const result = [];

  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const obj = {};

    // Mapper chaque colonne vers son nom sémantique
    for (const { index, nom } of allMappings) {
      const val = row[index];
      if (val !== undefined && val !== null) {
        obj[nom] = val;
      }
    }

    // Ajouter les colonnes S-1 vides (pas de données S-1 dans le mensuel)
    obj['Ca Tot BVP_S1'] = 0;
    obj['Qte Tot BVP_S1'] = 0;
    obj['Nb Ticket BVP_S1'] = 0;
    obj['Ca Tot_S1'] = 0;
    obj['Qte Tot_S1'] = 0;
    obj['Nb Ticket_S1'] = 0;

    // Ne garder que les lignes avec un code PDV valide
    const codePdv = getCodePDV(obj);
    if (codePdv) {
      obj._codePDV = codePdv;
      result.push(obj);
    }
  }

  return result;
}

/**
 * Extrait la feuille "Total Pdv" d'un fichier mensuel
 * @param {Object} workbook - Workbook XLSX
 * @returns {Array<Object>} Données compatibles avec le format hebdo
 */
export function extraireTotalPdvMensuel(workbook) {
  return extraireFeuilleMensuelle(workbook, 'Total Pdv', MAPPING_TOTAL_PDV);
}

/**
 * Extrait la feuille "Ventes Moyennes Horaire" d'un fichier mensuel
 * @param {Object} workbook - Workbook XLSX
 * @returns {Array<Object>} Données compatibles avec le format hebdo (HORAIRE, Ca Tot BVP, etc.)
 */
export function extraireVenteHeureMensuel(workbook) {
  return extraireFeuilleMensuelle(workbook, 'Ventes Moyennes Horaire', MAPPING_VENTE_HEURE);
}

/**
 * Liste les mois disponibles dans un dossier
 * @param {FileSystemDirectoryHandle} dirHandle - Handle du dossier DATA_perso
 * @returns {Promise<Array>} Liste des mois disponibles, triés par date décroissante
 */
export async function listerMoisDisponibles(dirHandle) {
  const NOMS_MOIS = [
    '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  ];

  const mois = [];

  try {
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file' && entry.name.startsWith('Vente_Mensuelle_BVP_M')) {
        const match = entry.name.match(/Vente_Mensuelle_BVP_M(\d{2})-(\d{4})\.xlsx/);
        if (match) {
          const moisNum = match[1];
          const annee = match[2];
          mois.push({
            annee: annee,
            mois: moisNum,
            code: `${annee}-M${moisNum}`,
            fichier: entry.name,
            label: `${NOMS_MOIS[parseInt(moisNum, 10)]} ${annee}`,
          });
        }
      }
    }
  } catch (error) {
    // Silently handle errors
  }

  // Trier par date décroissante (année DESC, puis mois DESC)
  return mois.sort((a, b) => {
    if (a.annee !== b.annee) return parseInt(b.annee) - parseInt(a.annee);
    return parseInt(b.mois) - parseInt(a.mois);
  });
}

