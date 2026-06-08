#!/usr/bin/env node
/**
 * Test de régression Phase 1 bis (Rudy 20/04/2026) sur LAMBALLE M03-2026.
 *
 * Valide :
 *  - Libellé région "4 - OUEST" lu de la colonne B de Total Pdv
 *  - Règle pen_max unifiée (candidates ≠ 00_Autre, cible toutes 6 tranches)
 *  - KPI 12 (nb tickets à aller chercher) ≈ 5 416
 *  - KPI 13 (CA additionnel annuel) ≈ 223 817 € (marge ~40 € acceptée)
 *
 * Réimplémente localement la règle pour tester sans dépendre des imports ESM.
 */

import { readFileSync } from 'node:fs';
import * as XLSX from 'xlsx';

const FICHIER = '/Users/rudyremy/Developer/BVP-Planning/DATA_perso/Vente_Mensuelle_BVP_M03-2026.xlsx';
const CODE_PDV = '1661';

const TOUTES_TRANCHES = ['00_Autre', '09h_12h', '12h_14h', '14h_16h', '16h_19h', '19h_23h'];
const TRANCHES_CANDIDATES = ['09h_12h', '12h_14h', '14h_16h', '16h_19h', '19h_23h'];

const buf = readFileSync(FICHIER);
const wb = XLSX.read(buf, { type: 'buffer' });

// ============ Libellé région depuis Total Pdv ============
const totalSheet = wb.Sheets['Total Pdv'];
const totalRaw = XLSX.utils.sheet_to_json(totalSheet, { header: 1 });
let headerT = 0;
for (let i = 0; i < 10; i++) {
  if (totalRaw[i] && totalRaw[i].some(c => c === 'Pdv' || c === 'Enseigne')) { headerT = i; break; }
}

let regionLibelle = null;
let caBVPLamb = 0, tckBVPLamb = 0;
for (let i = headerT + 1; i < totalRaw.length; i++) {
  const r = totalRaw[i];
  if (!r || !r[4]) continue;
  if (String(r[4]).trim().replace(/^0+/, '') !== CODE_PDV) continue;
  regionLibelle = String(r[1] || '').trim();
  caBVPLamb = parseFloat(r[6]) || 0;
  tckBVPLamb = parseFloat(r[8]) || 0;
  break;
}

console.log(`=== LAMBALLE (${CODE_PDV}) / M03-2026 ===`);
console.log(`Région (colonne B)    : "${regionLibelle}"`);
console.log(`CA BVP mois           : ${caBVPLamb.toFixed(0)} €`);
console.log(`Tck BVP mois          : ${tckBVPLamb}`);
console.log(`Ticket moyen BVP      : ${(caBVPLamb / tckBVPLamb).toFixed(2)} €`);
console.log('');

// ============ Tranches horaires ============
const vhSheet = wb.Sheets['Ventes Moyennes Horaire'];
const vhRaw = XLSX.utils.sheet_to_json(vhSheet, { header: 1 });
let headerV = 0;
for (let i = 0; i < 10; i++) {
  if (vhRaw[i] && vhRaw[i].some(c => c === 'Pdv' || c === 'Enseigne')) { headerV = i; break; }
}

const lignes = [];
for (let i = headerV + 1; i < vhRaw.length; i++) {
  const r = vhRaw[i];
  if (!r || !r[4]) continue;
  if (String(r[4]).trim().replace(/^0+/, '') !== CODE_PDV) continue;
  lignes.push({
    horaire: r[6],
    caBVP: parseFloat(r[19]) || 0,
    tckBVP: parseFloat(r[21]) || 0,
    tckPDV: parseFloat(r[24]) || 0,
  });
}

// ============ Règle pen_max unifiée ============
const tranches = {};
for (const t of TOUTES_TRANCHES) {
  const l = lignes.find(x => x.horaire === t) || { tckBVP: 0, tckPDV: 0 };
  tranches[t] = {
    ticketsBVP: l.tckBVP,
    ticketsTotal: l.tckPDV,
    penetration: l.tckPDV > 0 ? l.tckBVP / l.tckPDV : 0,
  };
}

const totalTickets = TOUTES_TRANCHES.reduce((s, t) => s + tranches[t].ticketsTotal, 0);
const seuil10pct = totalTickets * 0.10;
let penMax = 0, meilleure = null;
for (const t of TRANCHES_CANDIDATES) {
  const d = tranches[t];
  if (d.ticketsTotal < seuil10pct) continue;
  if (d.penetration > penMax) { penMax = d.penetration; meilleure = t; }
}

console.log(`Total tickets PDV     : ${totalTickets}`);
console.log(`Seuil 10 %            : ${seuil10pct.toFixed(0)}`);
console.log(`pen_max candidates    : ${(penMax * 100).toFixed(2)} % sur ${meilleure}`);
console.log('');

// Delta tickets sur toutes tranches (y compris 00_Autre)
console.log('Delta par tranche (cible = penMax × Tck_PDV) :');
let totalDelta = 0;
for (const t of TOUTES_TRANCHES) {
  const d = tranches[t];
  const cible = Math.round(d.ticketsTotal * penMax);
  const delta = Math.max(0, cible - d.ticketsBVP);
  totalDelta += delta;
  const marker = t === '00_Autre' ? ' (inclu cible)' : '';
  console.log(`  ${t.padEnd(8)} : cible=${String(cible).padStart(5)}, actuel=${String(d.ticketsBVP).padStart(5)}, delta=${String(delta).padStart(5)}${marker}`);
}

const ticketMoyen = tckBVPLamb > 0 ? caBVPLamb / tckBVPLamb : 0;
const caAdditionnelMensuel = totalDelta * ticketMoyen;
const caAdditionnelAnnuel = Math.round(caAdditionnelMensuel * 12);

console.log('');
console.log(`Total delta tickets   : ${totalDelta}`);
console.log(`CA additionnel mens.  : ${caAdditionnelMensuel.toFixed(0)} €`);
console.log(`CA additionnel annuel : ${caAdditionnelAnnuel.toLocaleString('fr-FR')} €`);
console.log('');

// ============ Validation ============
const cibleDelta = 5416;
const cibleCA = 223817;

const okRegion = regionLibelle === '4 - OUEST';
const okDelta = Math.abs(totalDelta - cibleDelta) <= 5;
const okCA = Math.abs(caAdditionnelAnnuel - cibleCA) <= 200;

console.log('=== Validation ===');
console.log(`Région = "4 - OUEST"  : ${okRegion ? '✅' : '❌ (got "' + regionLibelle + '")'}`);
console.log(`Delta ≈ ${cibleDelta}         : ${okDelta ? '✅' : '❌ (got ' + totalDelta + ')'}`);
console.log(`CA annuel ≈ ${cibleCA} € : ${okCA ? '✅' : '❌ (got ' + caAdditionnelAnnuel + ')'}`);

process.exit(okRegion && okDelta && okCA ? 0 : 1);
