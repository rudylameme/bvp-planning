#!/usr/bin/env node
/**
 * Test de régression LAMBALLE (1661) — PROMPT_FIX_POTENTIEL_SECTEUR.
 *
 * Extrait les données LAMBALLE du fichier mensuel M02-2026 et valide :
 *  - potentielCAGlobalAnnuel ≈ 196 283 € (même valeur que vue détail PDV)
 *  - pireTrancheKey = '16h_19h' (nouvelle règle : max clients à conquérir)
 *
 * Réimplémente localement analyserOpportunite avec la logique corrigée pour
 * tester sans dépendre des imports ESM sans extension du code source.
 */

import { readFileSync } from 'node:fs';
import * as XLSX from 'xlsx';

const LABELS = {
  '09h_12h': '9h-12h',
  '12h_14h': '12h-14h',
  '14h_16h': '14h-16h',
  '16h_19h': '16h-19h',
  '19h_23h': '19h-23h',
  '00_Autre': 'Autre',
};
const TRANCHES_UTILES = ['09h_12h', '12h_14h', '14h_16h', '16h_19h', '19h_23h'];

// Réimplémentation locale identique à sectorManagerService.js (version corrigée)
function analyserOpportunite(tranches, ticketMoyen, multiplier) {
  const totalTickets = TRANCHES_UTILES.reduce((sum, t) => sum + (tranches[t]?.ticketsTotal || 0), 0);
  const seuil10pct = totalTickets * 0.10;

  let meilleure = null;
  let penMax = 0;
  for (const t of TRANCHES_UTILES) {
    const data = tranches[t];
    if (!data || data.ticketsTotal === 0) continue;
    if (data.ticketsTotal < seuil10pct) continue;
    if (data.penetration > penMax) { penMax = data.penetration; meilleure = t; }
  }

  let pire = null;
  let maxClients = 0;
  for (const t of TRANCHES_UTILES) {
    const data = tranches[t];
    if (!data || data.ticketsTotal === 0) continue;
    const ecart = Math.max(0, penMax - (data.penetration || 0));
    const clients = Math.round(data.ticketsTotal * ecart);
    if (clients > maxClients) { maxClients = clients; pire = t; }
  }

  const pireTranche = tranches[pire] || {};
  const clientsARecuperer = maxClients;
  const potentielCATrancheAnnuel = Math.round(clientsARecuperer * ticketMoyen * multiplier);

  let ticketsPotentielsGlobal = 0;
  let ticketsActuelsGlobal = 0;
  for (const t of TRANCHES_UTILES) {
    const data = tranches[t];
    if (!data || data.ticketsTotal === 0) continue;
    ticketsActuelsGlobal += data.ticketsBVP || 0;
    ticketsPotentielsGlobal += Math.round(data.ticketsTotal * penMax);
  }
  const gainTicketsGlobal = Math.max(0, ticketsPotentielsGlobal - ticketsActuelsGlobal);
  const potentielCAGlobalAnnuel = Math.round(gainTicketsGlobal * ticketMoyen * multiplier);

  return {
    meilleureTrancheKey: meilleure,
    meilleureTrancheLabel: meilleure ? LABELS[meilleure] : '—',
    pireTrancheKey: pire,
    pireTrancheLabel: pire ? LABELS[pire] : '—',
    penetrationMeilleure: penMax,
    penetrationPire: pireTranche.penetration || 0,
    clientsARecuperer,
    potentielCATrancheAnnuel,
    potentielCAGlobalAnnuel,
  };
}

// ========== Extraction Excel ==========

const FICHIER = '/Users/rudyremy/Developer/BVP-Planning/DATA_perso/Vente_Mensuelle_BVP_M02-2026.xlsx';
const CODE_PDV = '1661';

const buf = readFileSync(FICHIER);
const wb = XLSX.read(buf, { type: 'buffer' });

// Extraire Ventes Moyennes Horaire positionnel (cf. extractionMensuelle.js MAPPING_VENTE_HEURE)
const sheet = wb.Sheets['Ventes Moyennes Horaire'];
const raw = XLSX.utils.sheet_to_json(sheet, { header: 1 });

// Trouver ligne d'en-tête (contient "Pdv" ou "Enseigne")
let headerRow = 0;
for (let i = 0; i < Math.min(10, raw.length); i++) {
  if (raw[i] && raw[i].some(c => c === 'Pdv' || c === 'Enseigne')) { headerRow = i; break; }
}

// Extraire lignes LAMBALLE (col 4 = Pdv, col 6 = HORAIRE Tr_HEURE)
// Groupe 5 = BVP mois complet : cols 19 (Ca), 20 (Qte), 21 (Nb Ticket)
// Groupe 6 = PDV mois complet : cols 22 (Ca), 23 (Qte), 24 (Nb Ticket)
const lignes = [];
for (let i = headerRow + 1; i < raw.length; i++) {
  const row = raw[i];
  if (!row || !row[4]) continue;
  const pdv = String(row[4]).trim().replace(/^0+/, '');
  if (pdv !== CODE_PDV) continue;
  lignes.push({
    HORAIRE: row[6],
    ticketsBVP: parseFloat(row[21]) || 0,
    ticketsTotal: parseFloat(row[24]) || 0,
    caBVP: parseFloat(row[19]) || 0,
    caTotal: parseFloat(row[22]) || 0,
  });
}

console.log(`Lignes LAMBALLE trouvées : ${lignes.length}`);
console.log('');

// Construire l'objet tranches attendu par analyserOpportunite
const tranches = {};
for (const t of TRANCHES_UTILES.concat(['00_Autre'])) {
  const l = lignes.find(x => x.HORAIRE === t);
  tranches[t] = l ? {
    ticketsBVP: l.ticketsBVP,
    ticketsTotal: l.ticketsTotal,
    penetration: l.ticketsTotal > 0 ? l.ticketsBVP / l.ticketsTotal : 0,
    caBVP: l.caBVP,
  } : { ticketsBVP: 0, ticketsTotal: 0, penetration: 0, caBVP: 0 };
}

// Calculer ticket moyen LAMBALLE (CA BVP / tickets BVP) — lu depuis Total Pdv
// Mais on peut aussi l'obtenir en sommant les tranches
const ticketsBVPTot = lignes.reduce((s, l) => s + l.ticketsBVP, 0);
const caBVPTot = lignes.reduce((s, l) => s + l.caBVP, 0);
const ticketMoyen = ticketsBVPTot > 0 ? caBVPTot / ticketsBVPTot : 0;

console.log(`=== LAMBALLE (${CODE_PDV}) — fichier M02-2026 ===`);
console.log(`CA BVP mois      : ${caBVPTot.toFixed(0)} €`);
console.log(`Tickets BVP mois : ${ticketsBVPTot}`);
console.log(`Ticket moyen BVP : ${ticketMoyen.toFixed(2)} €`);
console.log('');

console.log('Tranches :');
for (const t of TRANCHES_UTILES) {
  const d = tranches[t];
  console.log(`  ${LABELS[t].padEnd(8)} : ${String(d.ticketsTotal).padStart(6)} tickets total, ${String(d.ticketsBVP).padStart(4)} BVP, pénétration ${(d.penetration * 100).toFixed(2)}%`);
}
console.log('');

// Appeler la nouvelle analyserOpportunite (mois → multiplier = 12)
const result = analyserOpportunite(tranches, ticketMoyen, 12);

console.log('=== Résultat (nouvelle logique) ===');
console.log(`  meilleure tranche       : ${result.meilleureTrancheLabel} (${(result.penetrationMeilleure * 100).toFixed(2)}%)`);
console.log(`  tranche à travailler    : ${result.pireTrancheLabel} (actuel ${(result.penetrationPire * 100).toFixed(2)}%)`);
console.log(`  clients à récupérer     : ${result.clientsARecuperer}`);
console.log(`  potentiel CA tranche/an : ${result.potentielCATrancheAnnuel.toLocaleString('fr-FR')} €`);
console.log(`  potentiel CA GLOBAL/an  : ${result.potentielCAGlobalAnnuel.toLocaleString('fr-FR')} €`);
console.log('');

// === VALIDATION ===
console.log('=== Validation ===');
const attenduPotentielGlobal = 196283;
const attenduTranche = '16h_19h';
const ecartPotentiel = Math.abs(result.potentielCAGlobalAnnuel - attenduPotentielGlobal);
const ecartPct = (ecartPotentiel / attenduPotentielGlobal) * 100;

console.log(`Cible potentiel global  : ${attenduPotentielGlobal.toLocaleString('fr-FR')} €`);
console.log(`Écart avec cible        : ${ecartPotentiel.toLocaleString('fr-FR')} € (${ecartPct.toFixed(2)}%)`);
console.log(`Cible tranche à travail : ${attenduTranche} (${LABELS[attenduTranche]})`);
console.log(`Tranche obtenue         : ${result.pireTrancheKey}`);
console.log('');

const okPotentiel = ecartPct < 1;  // tolérance 1% pour arrondis
const okTranche = result.pireTrancheKey === attenduTranche;

console.log(`Test potentiel global   : ${okPotentiel ? '✅ OK' : '❌ KO'}`);
console.log(`Test tranche à travail  : ${okTranche ? '✅ OK' : '❌ KO'}`);

process.exit(okPotentiel && okTranche ? 0 : 1);
