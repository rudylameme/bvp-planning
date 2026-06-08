/**
 * Service Benchmark Multi-Niveaux (National → Région → Secteur → Magasin).
 *
 * Fournit les 13 KPIs en 5 blocs à chaque niveau géographique, à partir des
 * fichiers mensuels Vente_Mensuelle_BVP_Mxx-20xx.xlsx.
 *
 * BLOCS DE KPIs (session Rudy 20/04/2026) :
 *   Bloc 1 — CA BVP (3)       : CA BVP · Progression CA BVP · Écart progression CA vs PDV
 *   Bloc 2 — Quantité BVP (3) : Qté BVP · Progression Qté BVP · Écart progression Qté vs PDV
 *   Bloc 3 — Moyennes (2)     : PV moyen · Ticket moyen
 *   Bloc 4 — Pénétration (3)  : Pén moyen · Pén Matin 9-12 · Pén Soir 16-19
 *   Bloc 5 — Objectif (2)     : Nb tickets à aller chercher · CA additionnel €/an
 *
 * RÈGLE PEN_MAX UNIFIÉE (IMPORTANT, décision Rudy 20/04/2026) :
 *   1. Candidates pour pen_max PDV : tranches avec ≥ 10 % du total tickets PDV
 *      du PDV ET ≠ "00_Autre".
 *   2. pen_max = max(pénétration) parmi ces candidates.
 *   3. pen_max appliquée à TOUTES les 6 tranches (y compris 00_Autre) pour
 *      calculer le delta tickets. La tranche 00_Autre est cible mais jamais
 *      candidate de référence.
 *   Cette règle est unifiée entre National/Région/Secteur/Magasin.
 *
 * ARCHITECTURE : consomme une abstraction `DataSource` (cf. plus bas) au lieu
 * de `dirHandle` direct, pour permettre un swap futur (API distante, upload
 * direct, etc.) sans refactor.
 */

import { chargerFichierExcel } from './extraction/validationDonnees.js';
import { extraireTotalPdvMensuel, extraireVenteHeureMensuel } from './extraction/extractionMensuelle.js';

// ============================================================================
// Constantes
// ============================================================================

// Toutes les tranches horaires du fichier Excel (dans l'ordre de la journée)
const TOUTES_TRANCHES = ['00_Autre', '09h_12h', '12h_14h', '14h_16h', '16h_19h', '19h_23h'];

// Tranches éligibles comme CANDIDATES pour pen_max
// (on exclut 00_Autre : contenu variable selon les PDV, pas comparable)
const TRANCHES_CANDIDATES = ['09h_12h', '12h_14h', '14h_16h', '16h_19h', '19h_23h'];

const TRANCHE_MATIN = '09h_12h';
const TRANCHE_AM = '16h_19h';

const SEUIL_CANDIDATE = 0.10; // 10 % du total tickets PDV du PDV

// ============================================================================
// Abstraction DataSource
// ============================================================================

/**
 * Implémentation DataSource basée sur un FileSystemDirectoryHandle local.
 * @param {FileSystemDirectoryHandle} dirHandle
 * @returns {Object} DataSource
 */
export function createLocalDirDataSource(dirHandle) {
  return {
    async listerFichiers() {
      const fichiers = [];
      for await (const entry of dirHandle.values()) {
        if (entry.kind !== 'file') continue;
        const nom = entry.name;
        let type = 'autre';
        if (nom.startsWith('Vente_Mensuelle_BVP_M')) type = 'mois';
        else if (nom.startsWith('Vente_Hebdo_BVP_S')) type = 'semaine';
        else if (nom === 'info_PDV.json') type = 'info';
        fichiers.push({ nom, type });
      }
      return fichiers;
    },
    async lireFichierExcel(nom) {
      const fh = await dirHandle.getFileHandle(nom);
      const file = await fh.getFile();
      return chargerFichierExcel(file);
    },
    async lireInfoPDV() {
      try {
        const fh = await dirHandle.getFileHandle('info_PDV.json');
        const file = await fh.getFile();
        const text = await file.text();
        return JSON.parse(text);
      } catch {
        return null;
      }
    },
  };
}

// ============================================================================
// Utilitaires
// ============================================================================

const normCode = (code) => String(code || '').replace(/^0+/, '');

/**
 * Extrait les libellés régions depuis la colonne REGION de Total Pdv mensuel.
 * Format lu : "1 - NORD", "4 - OUEST"… Le code numérique est le préfixe.
 * @param {Array} totalPdv
 * @returns {Map<number, string>} code → libellé
 */
export function extraireLibellesRegions(totalPdv) {
  const map = new Map();
  for (const row of totalPdv) {
    const libelle = String(row.REGION || '').trim();
    if (!libelle) continue;
    const match = libelle.match(/^(\d+)/);
    if (!match) continue;
    const code = parseInt(match[1], 10);
    if (!map.has(code)) map.set(code, libelle);
  }
  return map;
}

/**
 * Agrège un ensemble de lignes Total Pdv sur un périmètre. Conserve les
 * données par PDV (nécessaire pour calculer les KPIs 12 et 13).
 * @param {Array} totalPdv
 * @param {Set<string>} codesPerimetre - codes PDV normalisés
 * @returns {{ agreg, parPdv }}
 */
function agregerTotalPdv(totalPdv, codesPerimetre) {
  let caBVP = 0, qteBVP = 0, ticketsBVP = 0;
  let caTotal = 0, ticketsTotal = 0;
  let caBVP_An1 = 0, qteBVP_An1 = 0, ticketsBVP_An1 = 0;
  let caTotal_An1 = 0, ticketsTotal_An1 = 0;
  let qteTotal = 0, qteTotal_An1 = 0;
  const parPdv = new Map();

  for (const row of totalPdv) {
    const code = normCode(row._codePDV || row.Pdv);
    if (!codesPerimetre.has(code)) continue;
    const caBVPRow = parseFloat(row['Ca Tot BVP']) || 0;
    const qteBVPRow = parseFloat(row['Qte Tot BVP']) || 0;
    const ticketsBVPRow = parseFloat(row['Nb Ticket BVP']) || 0;
    const caTotalRow = parseFloat(row['Ca Tot']) || 0;
    const qteTotalRow = parseFloat(row['Qte Tot']) || 0;
    const ticketsTotalRow = parseFloat(row['Nb Ticket']) || 0;
    const caBVP_An1Row = parseFloat(row['Ca Tot BVP_An1']) || 0;
    const qteBVP_An1Row = parseFloat(row['Qte Tot BVP_An1']) || 0;
    const ticketsBVP_An1Row = parseFloat(row['Nb Ticket BVP_An1']) || 0;
    const caTotal_An1Row = parseFloat(row['Ca Tot_An1']) || 0;
    const qteTotal_An1Row = parseFloat(row['Qte Tot_An1']) || 0;
    const ticketsTotal_An1Row = parseFloat(row['Nb Ticket_An1']) || 0;

    caBVP += caBVPRow; qteBVP += qteBVPRow; ticketsBVP += ticketsBVPRow;
    caTotal += caTotalRow; qteTotal += qteTotalRow; ticketsTotal += ticketsTotalRow;
    caBVP_An1 += caBVP_An1Row; qteBVP_An1 += qteBVP_An1Row; ticketsBVP_An1 += ticketsBVP_An1Row;
    caTotal_An1 += caTotal_An1Row; qteTotal_An1 += qteTotal_An1Row; ticketsTotal_An1 += ticketsTotal_An1Row;

    parPdv.set(code, {
      caBVP: caBVPRow, qteBVP: qteBVPRow, ticketsBVP: ticketsBVPRow,
      ticketsTotal: ticketsTotalRow,
      // Ticket moyen BVP par PDV (pour KPI 13)
      ticketMoyen: ticketsBVPRow > 0 ? caBVPRow / ticketsBVPRow : 0,
    });
  }

  return {
    agreg: {
      nbPdv: parPdv.size,
      caBVP, qteBVP, ticketsBVP, caTotal, qteTotal, ticketsTotal,
      caBVP_An1, qteBVP_An1, ticketsBVP_An1, caTotal_An1, qteTotal_An1, ticketsTotal_An1,
    },
    parPdv,
  };
}

/**
 * Extrait les tranches horaires par PDV depuis Ventes Moyennes Horaire.
 * Structure retournée : Map<codePdv, { [tranche]: { ticketsBVP, ticketsTotal } }>
 * @param {Array} venteHeure
 * @param {Set<string>} codesPerimetre
 */
function extraireTranchesParPdv(venteHeure, codesPerimetre) {
  const parPdv = new Map();
  for (const row of venteHeure) {
    const code = normCode(row._codePDV || row.Pdv);
    if (!codesPerimetre.has(code)) continue;
    const horaire = row.HORAIRE;
    if (!horaire) continue;
    if (!parPdv.has(code)) parPdv.set(code, {});
    const tBVP = parseFloat(row['Nb Ticket BVP']) || 0;
    const tPDV = parseFloat(row['Nb Ticket']) || 0;
    parPdv.get(code)[horaire] = { ticketsBVP: tBVP, ticketsTotal: tPDV };
  }
  return parPdv;
}

/**
 * Calcule pen_max d'un PDV selon la règle unifiée :
 *   - Candidates : tranches ≠ 00_Autre ET tickets ≥ 10 % du total PDV
 *   - pen_max = max(pénétration) parmi candidates
 * @param {Object} tranchesPdv - { [tranche]: { ticketsBVP, ticketsTotal } }
 * @returns {{ penMax: number, meilleureTrancheKey: string|null }}
 */
function calculerPenMaxPdv(tranchesPdv) {
  if (!tranchesPdv) return { penMax: 0, meilleureTrancheKey: null };
  let totalPDV = 0;
  for (const t of TOUTES_TRANCHES) totalPDV += (tranchesPdv[t]?.ticketsTotal || 0);
  if (totalPDV <= 0) return { penMax: 0, meilleureTrancheKey: null };
  const seuil = totalPDV * SEUIL_CANDIDATE;
  let penMax = 0, meilleure = null;
  for (const t of TRANCHES_CANDIDATES) {
    const d = tranchesPdv[t];
    if (!d || d.ticketsTotal < seuil) continue;
    const pen = d.ticketsTotal > 0 ? d.ticketsBVP / d.ticketsTotal : 0;
    if (pen > penMax) { penMax = pen; meilleure = t; }
  }
  return { penMax, meilleureTrancheKey: meilleure };
}

/**
 * Calcule le delta tickets d'un PDV = somme sur les 6 tranches de
 * max(0, ticketsPDV × penMax − ticketsBVP).
 */
function calculerDeltaTicketsPdv(tranchesPdv, penMax) {
  if (!tranchesPdv || penMax <= 0) return 0;
  let delta = 0;
  for (const t of TOUTES_TRANCHES) {
    const d = tranchesPdv[t];
    if (!d) continue;
    const cible = Math.round(d.ticketsTotal * penMax);
    delta += Math.max(0, cible - d.ticketsBVP);
  }
  return delta;
}

/**
 * Agrège les pénétrations Matin (9-12) et AM (16-19) sur un périmètre.
 */
function agregerPenetrationsMatinAM(venteHeure, codesPerimetre) {
  let tckBVPMatin = 0, tckTotMatin = 0;
  let tckBVPAM = 0, tckTotAM = 0;
  for (const row of venteHeure) {
    const code = normCode(row._codePDV || row.Pdv);
    if (!codesPerimetre.has(code)) continue;
    if (row.HORAIRE === TRANCHE_MATIN) {
      tckBVPMatin += parseFloat(row['Nb Ticket BVP']) || 0;
      tckTotMatin += parseFloat(row['Nb Ticket']) || 0;
    } else if (row.HORAIRE === TRANCHE_AM) {
      tckBVPAM += parseFloat(row['Nb Ticket BVP']) || 0;
      tckTotAM += parseFloat(row['Nb Ticket']) || 0;
    }
  }
  return {
    penetrationMatin: tckTotMatin > 0 ? tckBVPMatin / tckTotMatin : 0,
    penetrationAM: tckTotAM > 0 ? tckBVPAM / tckTotAM : 0,
  };
}

/**
 * Calcule les objectifs factuels (KPI 12 et 13) sur un périmètre.
 * KPI 12 (nb tickets) = Σ(PDV) Σ(tranches) max(0, Tck_PDV_t × penMax_PDV − Tck_BVP_t)
 * KPI 13 (CA annuel)  = Σ(PDV) delta_PDV × ticket_moyen_BVP_PDV × 12
 *
 * @param {Map<string, {...}>} parPdvTotal - Map code → totaux PDV (ticketMoyen, etc.)
 * @param {Map<string, Object>} tranchesParPdv - Map code → tranches horaires
 * @returns {{ nbTicketsAChercher: number, caAdditionnelAnnuel: number }}
 */
function calculerObjectifFactuel(parPdvTotal, tranchesParPdv) {
  let nbTicketsAChercher = 0;
  let caAdditionnelAnnuel = 0;
  for (const [code, totaux] of parPdvTotal) {
    const tranches = tranchesParPdv.get(code);
    if (!tranches) continue;
    const { penMax } = calculerPenMaxPdv(tranches);
    const delta = calculerDeltaTicketsPdv(tranches, penMax);
    nbTicketsAChercher += delta;
    caAdditionnelAnnuel += delta * totaux.ticketMoyen * 12;
  }
  return { nbTicketsAChercher, caAdditionnelAnnuel: Math.round(caAdditionnelAnnuel) };
}

/**
 * Construit les 13 KPIs à partir des agrégats + pénétrations + objectifs factuels.
 */
function construireKPIs(agreg, penetrations, objectifFactuel) {
  const {
    caBVP, qteBVP, ticketsBVP, ticketsTotal,
    caBVP_An1, qteBVP_An1, caTotal, caTotal_An1,
    qteTotal, qteTotal_An1,
  } = agreg;

  // Progressions
  const evolCA_BVP = caBVP_An1 > 0 ? (caBVP - caBVP_An1) / caBVP_An1 : null;
  const evolQte_BVP = qteBVP_An1 > 0 ? (qteBVP - qteBVP_An1) / qteBVP_An1 : null;
  const evolCA_PDV = caTotal_An1 > 0 ? (caTotal - caTotal_An1) / caTotal_An1 : null;
  const evolQte_PDV = qteTotal_An1 > 0 ? (qteTotal - qteTotal_An1) / qteTotal_An1 : null;

  // Écarts de progression (en points)
  const ecartProgressionCA = (evolCA_BVP != null && evolCA_PDV != null)
    ? (evolCA_BVP - evolCA_PDV) * 100 : null;
  const ecartProgressionQte = (evolQte_BVP != null && evolQte_PDV != null)
    ? (evolQte_BVP - evolQte_PDV) * 100 : null;

  return {
    // --- Bloc 1 — CA BVP ---
    caBVP,                                                  // KPI 1
    evolCA_BVP,                                             // KPI 2 (proportion)
    ecartProgressionCA,                                     // KPI 3 (points)

    // --- Bloc 2 — Quantité BVP ---
    qteBVP,                                                 // KPI 4
    evolQte_BVP,                                            // KPI 5 (proportion)
    ecartProgressionQte,                                    // KPI 6 (points)

    // --- Bloc 3 — Moyennes ---
    pvMoyen: qteBVP > 0 ? caBVP / qteBVP : 0,              // KPI 7
    ticketMoyen: ticketsBVP > 0 ? caBVP / ticketsBVP : 0,  // KPI 8

    // --- Bloc 4 — Pénétration ---
    penetrationGlobale: ticketsTotal > 0 ? ticketsBVP / ticketsTotal : 0, // KPI 9
    penetrationMatin: penetrations.penetrationMatin,                      // KPI 10
    penetrationAM: penetrations.penetrationAM,                            // KPI 11

    // --- Bloc 5 — Objectif factuel ---
    nbTicketsAChercher: objectifFactuel.nbTicketsAChercher,               // KPI 12
    caAdditionnelAnnuel: objectifFactuel.caAdditionnelAnnuel,             // KPI 13

    // Contexte (utile pour sous-titres et Top/Flop)
    evolCA_PDV,
    evolQte_PDV,
    ticketsBVP,
    ticketsTotal,
    nbPdv: agreg.nbPdv,
  };
}

// ============================================================================
// Liste des régions (déduite de infoPDV + libellés Excel)
// ============================================================================

/**
 * Liste les régions présentes dans infoPDV, enrichies avec les libellés lus
 * depuis l'Excel mensuel (colonne REGION de Total Pdv).
 * @param {Object} infoPDV
 * @param {Map<number, string>} [libellesRegions] - Map code → libellé (ex. "4 - OUEST")
 * @returns {Array<{ code, libelle, nbPdv, nbSecteurs }>}
 */
export function listerRegions(infoPDV, libellesRegions = null) {
  if (!infoPDV) return [];
  const map = new Map();
  for (const pdv of Object.values(infoPDV)) {
    const r = pdv.region;
    if (r == null) continue;
    if (!map.has(r)) {
      const libelle = libellesRegions?.get(r) || `Région ${r}`;
      map.set(r, { code: r, libelle, nbPdv: 0, secteurs: new Set() });
    }
    const entry = map.get(r);
    entry.nbPdv++;
    if (pdv.secteurCode) entry.secteurs.add(pdv.secteurCode);
  }
  return [...map.values()]
    .map(r => ({ code: r.code, libelle: r.libelle, nbPdv: r.nbPdv, nbSecteurs: r.secteurs.size }))
    .sort((a, b) => a.code - b.code);
}

/**
 * Liste les secteurs d'une région donnée depuis infoPDV.
 */
export function listerSecteursRegion(infoPDV, regionCode) {
  if (!infoPDV) return [];
  const map = new Map();
  for (const pdv of Object.values(infoPDV)) {
    if (pdv.region !== regionCode) continue;
    const code = pdv.secteurCode;
    if (!code) continue;
    if (!map.has(code)) {
      map.set(code, { code, libelle: pdv.secteurLibelle || `Secteur ${code}`, nbPdv: 0 });
    }
    map.get(code).nbPdv++;
  }
  return [...map.values()].sort((a, b) => a.code - b.code);
}

// ============================================================================
// Fonction commune d'agrégation sur un périmètre
// ============================================================================

function calculerAgregatsPerimetre(totalPdv, venteHeure, codesPerimetre) {
  const { agreg, parPdv } = agregerTotalPdv(totalPdv, codesPerimetre);
  const tranchesParPdv = extraireTranchesParPdv(venteHeure, codesPerimetre);
  const penetrations = agregerPenetrationsMatinAM(venteHeure, codesPerimetre);
  const objectifFactuel = calculerObjectifFactuel(parPdv, tranchesParPdv);
  return construireKPIs(agreg, penetrations, objectifFactuel);
}

// ============================================================================
// Niveau 1 — National
// ============================================================================

/**
 * Charge les données agrégées du niveau National + répartition par région.
 * Retourne aussi les Top 10 régions sur progression CA BVP et sur quantité BVP
 * (plus de Flop — décision Rudy 20/04/2026).
 */
export async function chargerDonneesNational({ dataSource, fichier, infoPDV, filtres = {} }) {
  const startTime = performance.now();

  const workbook = await dataSource.lireFichierExcel(fichier);
  const totalPdv = extraireTotalPdvMensuel(workbook);
  const venteHeure = extraireVenteHeureMensuel(workbook);
  const libellesRegions = extraireLibellesRegions(totalPdv);

  // Périmètre filtré (Phase 3 ajoutera vocation / modèle)
  const codesFiltres = new Set(
    Object.keys(infoPDV)
      .filter(code => {
        const pdv = infoPDV[code];
        if (filtres.vocation && filtres.vocation !== 'toutes' && pdv.vocation !== filtres.vocation) return false;
        if (filtres.modele && filtres.modele !== 'tous' && pdv.modele !== filtres.modele) return false;
        return true;
      })
      .map(normCode),
  );

  const kpis = calculerAgregatsPerimetre(totalPdv, venteHeure, codesFiltres);

  // Répartition par région (avec libellés Excel)
  const regionsBrutes = listerRegions(infoPDV, libellesRegions);
  const regions = regionsBrutes.map(region => {
    const codesRegion = new Set(
      Object.keys(infoPDV)
        .filter(code => infoPDV[code].region === region.code && codesFiltres.has(normCode(code)))
        .map(normCode),
    );
    const kpisR = calculerAgregatsPerimetre(totalPdv, venteHeure, codesRegion);
    return { ...region, kpis: kpisR, nbPdvFiltres: kpisR.nbPdv };
  });

  // Top 10 régions — Progression CA BVP (plus élevé en premier)
  const regionsAvecEvolCA = regions.filter(r => r.kpis.evolCA_BVP != null);
  const topRegionsProgCA = [...regionsAvecEvolCA]
    .sort((a, b) => (b.kpis.evolCA_BVP ?? 0) - (a.kpis.evolCA_BVP ?? 0))
    .slice(0, 10);

  // Top 10 régions — Quantité BVP (plus grosse quantité en premier)
  const topRegionsQuantite = [...regions]
    .sort((a, b) => (b.kpis.qteBVP ?? 0) - (a.kpis.qteBVP ?? 0))
    .slice(0, 10);

  const tempsExtraction = Math.round(performance.now() - startTime);

  return {
    kpis,
    regions,
    topRegionsProgCA,
    topRegionsQuantite,
    libellesRegions,
    metadata: {
      fichier,
      nbPdv: kpis.nbPdv,
      tempsExtraction,
      filtres,
    },
  };
}

// ============================================================================
// Niveau 2 — Région
// ============================================================================

/**
 * Charge les données agrégées d'une région + liste des secteurs avec mini-KPIs.
 */
export async function chargerDonneesRegion({ dataSource, fichier, infoPDV, regionCode, filtres = {} }) {
  const startTime = performance.now();

  const workbook = await dataSource.lireFichierExcel(fichier);
  const totalPdv = extraireTotalPdvMensuel(workbook);
  const venteHeure = extraireVenteHeureMensuel(workbook);
  const libellesRegions = extraireLibellesRegions(totalPdv);

  // Périmètre région + filtres
  const codesRegion = new Set(
    Object.keys(infoPDV)
      .filter(code => {
        const pdv = infoPDV[code];
        if (pdv.region !== regionCode) return false;
        if (filtres.vocation && filtres.vocation !== 'toutes' && pdv.vocation !== filtres.vocation) return false;
        if (filtres.modele && filtres.modele !== 'tous' && pdv.modele !== filtres.modele) return false;
        return true;
      })
      .map(normCode),
  );

  const kpis = calculerAgregatsPerimetre(totalPdv, venteHeure, codesRegion);

  // Secteurs de la région
  const secteursBruts = listerSecteursRegion(infoPDV, regionCode);
  const secteurs = secteursBruts.map(secteur => {
    const codesSecteur = new Set(
      Object.keys(infoPDV)
        .filter(code => infoPDV[code].secteurCode === secteur.code && codesRegion.has(normCode(code)))
        .map(normCode),
    );
    const kpisS = calculerAgregatsPerimetre(totalPdv, venteHeure, codesSecteur);
    return { ...secteur, kpis: kpisS, nbPdvFiltres: kpisS.nbPdv };
  });

  // Compteur magasins sous la performance région (KPI CA BVP progression)
  const perfRegion = kpis.evolCA_BVP;
  let nbMagasinsSousPerf = 0;
  if (perfRegion != null) {
    for (const row of totalPdv) {
      const code = normCode(row._codePDV || row.Pdv);
      if (!codesRegion.has(code)) continue;
      const caBVP = parseFloat(row['Ca Tot BVP']) || 0;
      const caBVP_An1 = parseFloat(row['Ca Tot BVP_An1']) || 0;
      if (caBVP_An1 <= 0) continue;
      const evolPdv = (caBVP - caBVP_An1) / caBVP_An1;
      if (evolPdv < perfRegion) nbMagasinsSousPerf++;
    }
  }

  const tempsExtraction = Math.round(performance.now() - startTime);
  const regionInfo = listerRegions(infoPDV, libellesRegions).find(r => r.code === regionCode);

  return {
    region: regionInfo || {
      code: regionCode,
      libelle: libellesRegions.get(regionCode) || `Région ${regionCode}`,
      nbPdv: kpis.nbPdv,
      nbSecteurs: secteurs.length,
    },
    kpis,
    secteurs,
    nbMagasinsSousPerf,
    nbMagasinsTotal: kpis.nbPdv,
    metadata: {
      fichier,
      regionCode,
      tempsExtraction,
      filtres,
    },
  };
}
