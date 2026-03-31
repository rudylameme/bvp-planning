/**
 * Service Responsable Secteur
 *
 * Agrège les données de ventes au niveau secteur :
 * - Liste des secteurs disponibles depuis info_PDV.json
 * - Extraction et calcul des KPIs pour tous les PDV d'un secteur
 * - Potentiel d'amélioration par PDV avec détail par tranche horaire
 */

import { chargerFichierExcel, extraireFeuille, getCodePDV, CONFIG, construireSetCodesPDV } from './extraction/validationDonnees.js';
import { extraireTotalPdvMensuel, extraireVenteHeureMensuel } from './extraction/extractionMensuelle.js';
import { calculerMoyenneSecteur } from './extraction/ventesExtractor.js';

// Labels lisibles pour les tranches horaires
const LABELS_TRANCHES = {
  '09h_12h': '9h-12h',
  '12h_14h': '12h-14h',
  '14h_16h': '14h-16h',
  '16h_19h': '16h-19h',
  '19h_23h': '19h-23h',
  '00_Autre': 'Autre',
};

// Tranches pertinentes (on exclut "00_Autre")
const TRANCHES_UTILES = ['09h_12h', '12h_14h', '14h_16h', '16h_19h', '19h_23h'];

/**
 * Liste les secteurs uniques depuis info_PDV.json
 * @param {Object} infoPDV - Dictionnaire code → infos du PDV
 * @returns {Array<{code: number, libelle: string, count: number}>}
 */
export function listerSecteurs(infoPDV) {
  if (!infoPDV) return [];

  const unique = {};
  Object.values(infoPDV).forEach(pdv => {
    const code = pdv.secteurCode;
    if (code && !unique[code]) {
      unique[code] = {
        code,
        libelle: pdv.secteurLibelle || `Secteur ${code}`,
        count: 0,
      };
    }
    if (code && unique[code]) {
      unique[code].count++;
    }
  });

  return Object.values(unique).sort((a, b) => a.code - b.code);
}

/**
 * Extrait la pénétration par tranche horaire pour un PDV donné
 * @param {string} codeNorm - Code PDV normalisé (sans zéros)
 * @param {Array} venteHeure - Données brutes feuille Vente heure
 * @returns {Object} { '09h_12h': { penetration, ticketsBVP, ticketsTotal }, ... }
 */
function extraireTranchesHoraires(codeNorm, venteHeure) {
  const result = {};

  // Filtrer les lignes pour ce magasin
  const lignesMagasin = venteHeure.filter(row => {
    const rowCode = row._codePDV || getCodePDV(row);
    return rowCode && rowCode.replace(/^0+/, '') === codeNorm;
  });

  for (const tranche of TRANCHES_UTILES) {
    const lignes = lignesMagasin.filter(row => {
      const horaire = row.HORAIRE || row.Horaire || row.Tr_horaire;
      return horaire === tranche;
    });

    const ticketsBVP = lignes.reduce((acc, row) => acc + (parseFloat(row['Nb Ticket BVP']) || 0), 0);
    const ticketsTotal = lignes.reduce((acc, row) => acc + (parseFloat(row['Nb Ticket']) || 0), 0);

    result[tranche] = {
      ticketsBVP,
      ticketsTotal,
      penetration: ticketsTotal > 0 ? ticketsBVP / ticketsTotal : 0,
    };
  }

  return result;
}

/**
 * Analyse les tranches horaires pour identifier l'opportunité principale
 * @param {Object} tranches - Résultat de extraireTranchesHoraires
 * @param {number} ticketMoyen - Panier moyen BVP du PDV
 * @param {number} multiplier - 12 (mois) ou 52 (semaine)
 * @returns {Object} { meilleureTrancheLabel, pireTrancheLabel, penetrationMeilleure, penetrationPire, clientsARecuperer, potentielCATrancheAnnuel }
 */
function analyserOpportunite(tranches, ticketMoyen, multiplier) {
  let meilleure = null;
  let pire = null;
  let penMax = 0;
  let penMin = 1;

  for (const tranche of TRANCHES_UTILES) {
    const data = tranches[tranche];
    if (!data || data.ticketsTotal === 0) continue;

    if (data.penetration > penMax) {
      penMax = data.penetration;
      meilleure = tranche;
    }
    if (data.penetration < penMin) {
      penMin = data.penetration;
      pire = tranche;
    }
  }

  // Clients à récupérer sur la pire tranche = écart vs meilleure × tickets total de cette tranche
  const pireTranche = tranches[pire] || {};
  const ecart = penMax - (pireTranche.penetration || 0);
  const clientsARecuperer = Math.round((pireTranche.ticketsTotal || 0) * ecart);
  const potentielCATrancheAnnuel = Math.round(clientsARecuperer * ticketMoyen * multiplier);

  // Potentiel GLOBAL : appliquer la meilleure pénétration du PDV à TOUTES les tranches
  // (même logique que Bloc6Potentiel dans TopFlopProduits.jsx)
  // Seuil 10% : les tranches sous ce seuil gardent leur pénétration actuelle
  const totalTickets = TRANCHES_UTILES.reduce((sum, t) => sum + (tranches[t]?.ticketsTotal || 0), 0);
  const seuil10pct = totalTickets * 0.10;
  let ticketsPotentielsGlobal = 0;
  let ticketsActuelsGlobal = 0;
  for (const tranche of TRANCHES_UTILES) {
    const data = tranches[tranche];
    if (!data || data.ticketsTotal === 0) continue;
    ticketsActuelsGlobal += data.ticketsBVP || 0;
    // Tranches significatives → pénétration cible = penMax ; petites tranches → garder l'actuelle
    const penCible = data.ticketsTotal >= seuil10pct ? penMax : data.penetration;
    ticketsPotentielsGlobal += Math.round(data.ticketsTotal * penCible);
  }
  const gainTicketsGlobal = Math.max(0, ticketsPotentielsGlobal - ticketsActuelsGlobal);
  const potentielCAGlobalAnnuel = Math.round(gainTicketsGlobal * ticketMoyen * multiplier);

  return {
    meilleureTrancheKey: meilleure,
    meilleureTrancheLabel: meilleure ? LABELS_TRANCHES[meilleure] : '—',
    pireTrancheKey: pire,
    pireTrancheLabel: pire ? LABELS_TRANCHES[pire] : '—',
    penetrationMeilleure: penMax,
    penetrationPire: penMin,
    clientsARecuperer,
    potentielCATrancheAnnuel,
    potentielCAGlobalAnnuel,
  };
}

/**
 * Charge et agrège les données d'un secteur entier
 * @param {Object} params
 * @param {File} params.fichierExcel - Fichier Excel (hebdo ou mensuel)
 * @param {Object} params.infoPDV - Dictionnaire info_PDV.json
 * @param {number} params.secteurCode - Code du secteur sélectionné
 * @param {string} params.secteurLibelle - Libellé du secteur
 * @param {string} params.typePeriode - 'semaine' ou 'mois'
 * @returns {Promise<Object>} { secteur, moyenne, pdvs, metadata }
 */
export async function chargerDonneesSecteur({ fichierExcel, infoPDV, secteurCode, secteurLibelle, typePeriode = 'semaine' }) {
  const startTime = performance.now();

  // 1. Charger le workbook
  const workbook = await chargerFichierExcel(fichierExcel);

  // 2. Extraire la feuille Total PDV (tous les magasins)
  let totalPdv, venteHeure;
  if (typePeriode === 'mois') {
    totalPdv = extraireTotalPdvMensuel(workbook);
    venteHeure = extraireVenteHeureMensuel(workbook);
  } else {
    totalPdv = extraireFeuille(workbook, CONFIG.feuilles.TOTAL_PDV);
    venteHeure = extraireFeuille(workbook, CONFIG.feuilles.VENTE_HEURE);
  }

  if (!totalPdv || totalPdv.length === 0) {
    throw new Error('Aucune donnée trouvée dans la feuille Total Pdv');
  }

  // 3. Identifier les codes PDV du secteur
  const codesSecteur = Object.keys(infoPDV).filter(code => {
    return infoPDV[code].secteurCode === secteurCode;
  });

  const codesSecteurSet = construireSetCodesPDV(codesSecteur);

  // 4. Filtrer les PDV du secteur dans les données Excel
  const pdvsSecteur = totalPdv.filter(row => {
    const code = row._codePDV || getCodePDV(row);
    if (!code) return false;
    const codeNorm = code.replace(/^0+/, '');
    return codesSecteurSet.has(code) ||
           codesSecteurSet.has(codeNorm) ||
           codesSecteurSet.has(code.padStart(5, '0'));
  });

  const multiplier = typePeriode === 'mois' ? 12 : 52;

  // 5. Normaliser chaque PDV avec ses métriques + tranches horaires
  const pdvs = pdvsSecteur.map(row => {
    const code = row._codePDV || getCodePDV(row);
    const codeNorm = code.replace(/^0+/, '');
    const info = infoPDV[code] || infoPDV[codeNorm] || infoPDV[code.padStart(5, '0')] || {};

    const caBVP = parseFloat(row['Ca Tot BVP']) || 0;
    const qteBVP = parseFloat(row['Qte Tot BVP']) || 0;
    const ticketsBVP = parseFloat(row['Nb Ticket BVP']) || 0;
    const caTotal = parseFloat(row['Ca Tot']) || 0;
    const ticketsTotal = parseFloat(row['Nb Ticket']) || 0;
    const penetration = ticketsTotal > 0 ? ticketsBVP / ticketsTotal : 0;
    const ticketMoyen = ticketsBVP > 0 ? caBVP / ticketsBVP : 0;

    // Extraire données par tranche horaire
    const tranches = venteHeure ? extraireTranchesHoraires(codeNorm, venteHeure) : {};
    const opportunite = venteHeure ? analyserOpportunite(tranches, ticketMoyen, multiplier) : null;

    return {
      code: codeNorm,
      ville: info.ville || row.VILLE || row.Ville || 'Inconnu',
      enseigne: info.enseigne || row.ENSEIGNE || row.Enseigne || 'INTERMARCHE',
      modele: info.modele || 'NC',
      surface: info.surface || null,
      vocation: info.vocation || row.VOCATION || row.Vocation || 'NC',
      caBVP,
      qteBVP,
      ticketsBVP,
      caTotal,
      ticketsTotal,
      penetration,
      ticketMoyen,
      tranches,
      opportunite,
    };
  });

  // 6. Calculer la moyenne secteur
  const moyenneSecteur = calculerMoyenneSecteur(pdvsSecteur);

  // 7. Trier par pénétration décroissante
  pdvs.sort((a, b) => b.penetration - a.penetration);

  // 8. Rang + potentiel (utiliser le potentiel tranche déjà calculé par analyserOpportunite)
  const pdvsAvecRangEtPotentiel = pdvs.map((pdv, idx) => ({
    ...pdv,
    rang: idx + 1,
    potentielCA: pdv.opportunite?.potentielCAGlobalAnnuel || 0,
    potentielTickets: pdv.opportunite?.clientsARecuperer || 0,
  }));

  // 9. KPIs synthèse
  const penetrationMax = pdvs.length > 0 ? pdvs[0].penetration : 0;
  const nbSousLaMoyenne = pdvs.filter(p => p.penetration < moyenneSecteur.penetration).length;
  const potentielTotal = pdvsAvecRangEtPotentiel.reduce((acc, p) => acc + p.potentielCA, 0);
  const caTotalSecteur = pdvs.reduce((acc, p) => acc + p.caBVP, 0);

  const tempsExtraction = Math.round(performance.now() - startTime);

  return {
    secteur: {
      code: secteurCode,
      libelle: secteurLibelle,
      nbPdv: pdvsAvecRangEtPotentiel.length,
      nbPdvExcel: pdvsSecteur.length,
      nbPdvReference: codesSecteur.length,
    },
    moyenne: moyenneSecteur,
    kpis: {
      penetrationMoyenne: moyenneSecteur.penetration,
      penetrationMax,
      caTotalSecteur: Math.round(caTotalSecteur),
      potentielTotal: Math.round(potentielTotal),
      nbSousLaMoyenne,
    },
    pdvs: pdvsAvecRangEtPotentiel,
    metadata: {
      typePeriode,
      multiplier,
      fichierSource: fichierExcel.name,
      tempsExtraction,
    },
  };
}
