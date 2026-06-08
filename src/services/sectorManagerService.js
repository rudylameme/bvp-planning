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

// Toutes les tranches horaires du fichier Excel (dans l'ordre de la journée)
// RÈGLE UNIFIÉE (Rudy 20/04/2026) :
//  - 00_Autre est INCLUE dans le calcul du delta tickets/CA (cible appliquée)
//  - 00_Autre n'est PAS CANDIDATE pour le calcul de pen_max (contenu variable
//    selon les PDV, pas comparable : ventes non-horodatées, ouvertures 7h30…)
const TOUTES_TRANCHES = ['00_Autre', '09h_12h', '12h_14h', '14h_16h', '16h_19h', '19h_23h'];
const TRANCHES_CANDIDATES = ['09h_12h', '12h_14h', '14h_16h', '16h_19h', '19h_23h'];

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

  // On extrait les 6 tranches (y compris 00_Autre) — nécessaire pour le calcul
  // delta tickets/CA qui applique pen_max à toutes les tranches.
  for (const tranche of TOUTES_TRANCHES) {
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
  // Règle unifiée Rudy 20/04/2026 :
  //   Seuil 10 % sur le total tickets PDV du PDV (toutes tranches, y compris 00_Autre)
  //   Candidates pen_max = tranches ≠ "00_Autre" ET ≥ seuil 10 %
  //   Cible = pen_max appliquée aux 6 tranches (y compris 00_Autre) pour le delta
  const totalTickets = TOUTES_TRANCHES.reduce((sum, t) => sum + (tranches[t]?.ticketsTotal || 0), 0);
  const seuil10pct = totalTickets * 0.10;

  // 1. Calcul de la référence (penMax) : uniquement parmi TRANCHES_CANDIDATES
  //    (sans "00_Autre"), qui portent ≥ 10 % du trafic PDV.
  let meilleure = null;
  let penMax = 0;
  for (const tranche of TRANCHES_CANDIDATES) {
    const data = tranches[tranche];
    if (!data || data.ticketsTotal === 0) continue;
    if (data.ticketsTotal < seuil10pct) continue;
    if (data.penetration > penMax) {
      penMax = data.penetration;
      meilleure = tranche;
    }
  }

  // 2. Tranche à travailler (règle Rudy 17/04/2026) : plus gros volume absolu de
  //    clients à conquérir. Formule :
  //      clientsARecuperer_tranche = ticketsTotal × max(0, penMax − penetration)
  //    Toutes les 6 tranches sont éligibles comme cible (y compris 00_Autre).
  let pire = null;
  let maxClients = 0;
  for (const tranche of TOUTES_TRANCHES) {
    const data = tranches[tranche];
    if (!data || data.ticketsTotal === 0) continue;
    const ecart = Math.max(0, penMax - (data.penetration || 0));
    const clients = Math.round(data.ticketsTotal * ecart);
    if (clients > maxClients) {
      maxClients = clients;
      pire = tranche;
    }
  }

  // Données exposées sur la pire tranche (même noms pour le composant d'affichage)
  const pireTranche = tranches[pire] || {};
  const clientsARecuperer = maxClients;
  const potentielCATrancheAnnuel = Math.round(clientsARecuperer * ticketMoyen * multiplier);

  // 3. Potentiel GLOBAL : appliquer penMax à TOUTES les 6 tranches (y compris
  //    00_Autre). Garantit la cohérence liste secteur ↔ détail magasin.
  let ticketsPotentielsGlobal = 0;
  let ticketsActuelsGlobal = 0;
  for (const tranche of TOUTES_TRANCHES) {
    const data = tranches[tranche];
    if (!data || data.ticketsTotal === 0) continue;
    ticketsActuelsGlobal += data.ticketsBVP || 0;
    ticketsPotentielsGlobal += Math.round(data.ticketsTotal * penMax);
  }
  const gainTicketsGlobal = Math.max(0, ticketsPotentielsGlobal - ticketsActuelsGlobal);
  const potentielCAGlobalAnnuel = Math.round(gainTicketsGlobal * ticketMoyen * multiplier);

  return {
    meilleureTrancheKey: meilleure,
    meilleureTrancheLabel: meilleure ? LABELS_TRANCHES[meilleure] : '—',
    pireTrancheKey: pire,
    pireTrancheLabel: pire ? LABELS_TRANCHES[pire] : '—',
    penetrationMeilleure: penMax,
    penetrationPire: pireTranche.penetration || 0,
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
