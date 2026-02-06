/**
 * Script de vérification de la correction du bug de conversion date → jour
 * Compare AVANT et APRÈS la correction
 */

import XLSX from 'xlsx';

// Chemins des fichiers
const VENTES_FILE = './public/Data/Ventes test.xlsx';
const FREQUENTATION_FILE = './public/Data/Fréquentation test.xlsx';

console.log('🔍 === VÉRIFICATION DE LA CORRECTION DU BUG ===\n');

// ==========================================
// Fonction AVANT (buggée)
// ==========================================
const getJourSemaineAVANT = (dateStr) => {
  let date;
  const numValue = Number(dateStr);
  if (Number.isFinite(numValue)) {
    const excelEpoch = new Date(1899, 11, 30);
    date = new Date(excelEpoch.getTime() + numValue * 86400000);
  } else {
    date = new Date(dateStr); // ❌ BUG : ne gère pas DD/MM/YYYY
  }
  const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  return jours[date.getDay()];
};

// ==========================================
// Fonction APRÈS (corrigée)
// ==========================================
const getJourSemaineAPRES = (dateStr) => {
  let date;
  const numValue = Number(dateStr);
  if (Number.isFinite(numValue)) {
    const excelEpoch = new Date(1899, 11, 30);
    date = new Date(excelEpoch.getTime() + numValue * 86400000);
  } else {
    const dateStrTrimmed = dateStr.toString().trim();
    const ddmmyyyyMatch = dateStrTrimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyyMatch) {
      const jour = parseInt(ddmmyyyyMatch[1], 10);
      const mois = parseInt(ddmmyyyyMatch[2], 10);
      const annee = parseInt(ddmmyyyyMatch[3], 10);
      date = new Date(annee, mois - 1, jour);
    } else {
      date = new Date(dateStrTrimmed);
    }
  }
  if (!Number.isFinite(date.getTime())) {
    return null;
  }
  const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  return jours[date.getDay()];
};

// ==========================================
// ÉTAPE 1 : Charger la fréquentation
// ==========================================
const freqWorkbook = XLSX.readFile(FREQUENTATION_FILE);
const freqSheet = freqWorkbook.Sheets[freqWorkbook.SheetNames[0]];
const freqData = XLSX.utils.sheet_to_json(freqSheet, { header: 1, defval: '' });

const jourMap = {
  '1-lundi': 'lundi',
  '2-mardi': 'mardi',
  '3-mercredi': 'mercredi',
  '4-jeudi': 'jeudi',
  '5-vendredi': 'vendredi',
  '6-samedi': 'samedi',
  '7-dimanche': 'dimanche'
};

const qteTotParJourS1 = {};
Object.values(jourMap).forEach(jour => {
  qteTotParJourS1[jour] = 0;
});

let freqHeaderIndex = -1;
for (let i = 0; i < Math.min(10, freqData.length); i++) {
  const row = freqData[i];
  if (row && row.some(cell => cell && cell.toString().includes('JOUR'))) {
    freqHeaderIndex = i;
    break;
  }
}

if (freqHeaderIndex === -1) freqHeaderIndex = 0;

for (let i = freqHeaderIndex + 1; i < freqData.length; i++) {
  const row = freqData[i];
  if (!row || row.length < 26) continue;

  const jourCell = row[6];
  const qteTotS1 = parseFloat(row[12]) || 0;

  if (!jourCell) continue;

  const jourStr = jourCell.toString().toLowerCase();
  let jourKey = null;
  for (const [key, value] of Object.entries(jourMap)) {
    if (jourStr.includes(key) || jourStr.includes(value)) {
      jourKey = value;
      break;
    }
  }

  if (jourKey) {
    qteTotParJourS1[jourKey] += qteTotS1;
  }
}

const totalQteTot = Object.values(qteTotParJourS1).reduce((sum, q) => sum + q, 0);
const poidsJours = {};

Object.keys(qteTotParJourS1).forEach(jour => {
  poidsJours[jour] = qteTotParJourS1[jour] / totalQteTot;
});

console.log('📊 Poids par jour (fréquentation) :\n');
const joursOrdre = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
joursOrdre.forEach(jour => {
  const poids = poidsJours[jour];
  const pct = (poids * 100).toFixed(1);
  console.log(`   ${jour.padEnd(10)} : ${pct.padStart(5)}%`);
});
console.log('');

// ==========================================
// ÉTAPE 2 : Charger les ventes
// ==========================================
const ventesWorkbook = XLSX.readFile(VENTES_FILE);
const ventesSheet = ventesWorkbook.Sheets[ventesWorkbook.SheetNames[0]];
const allVentesData = XLSX.utils.sheet_to_json(ventesSheet, { header: 1, defval: '' });

let headerRowIndex = -1;
for (let i = 0; i < allVentesData.length; i++) {
  if (allVentesData[i] && allVentesData[i][0] && allVentesData[i][0].toString().toLowerCase().includes('itm8')) {
    headerRowIndex = i;
    break;
  }
}

const headers = allVentesData[headerRowIndex];
const dataRows = allVentesData.slice(headerRowIndex + 1);

const libelleIndex = headers.findIndex(h => h && h.toString().toLowerCase().includes('libellé'));
const dateIndex = headers.findIndex(h => h && h.toString().toLowerCase() === 'date');
const quantiteIndex = headers.findIndex(h => h && h.toString().toLowerCase().includes('quantité'));

const produitsMap = new Map();

dataRows.forEach(row => {
  const libelle = row[libelleIndex];
  const date = row[dateIndex];
  const quantite = parseFloat(row[quantiteIndex]) || 0;

  if (!libelle || !date || libelle.toString().trim() === '' || libelle.toString() === 'BOULANGERIE PATISSERIE') return;

  const libelleStr = libelle.toString().trim();

  if (!produitsMap.has(libelleStr)) {
    produitsMap.set(libelleStr, {
      ventesParJour: {},
      totalVentes: 0
    });
  }

  const dateStr = date.toString();
  const produitData = produitsMap.get(libelleStr);
  produitData.ventesParJour[dateStr] = (produitData.ventesParJour[dateStr] || 0) + quantite;
  produitData.totalVentes += quantite;
});

// Trouver le produit le plus vendu
let produitMax = null;
let maxVentes = 0;

for (const [libelle, data] of produitsMap) {
  if (data.totalVentes > maxVentes) {
    maxVentes = data.totalVentes;
    produitMax = { libelle, ...data };
  }
}

// Trouver la vente max et son jour
let venteMax = 0;
let dateVenteMax = null;

for (const [date, qte] of Object.entries(produitMax.ventesParJour)) {
  if (qte > venteMax) {
    venteMax = qte;
    dateVenteMax = date;
  }
}

console.log('🎯 Produit analysé : ' + produitMax.libelle);
console.log('   Total ventes : ' + produitMax.totalVentes + ' unités');
console.log('   Vente max : ' + venteMax + ' unités le ' + dateVenteMax + '\n');

// ==========================================
// COMPARAISON AVANT / APRÈS
// ==========================================
console.log('═══════════════════════════════════════════════════════════════\n');
console.log('📊 COMPARAISON : AVANT vs APRÈS LA CORRECTION\n');
console.log('───────────────────────────────────────────────────────────────\n');

// AVANT
const jourAvant = getJourSemaineAVANT(dateVenteMax);
const poidsAvant = jourAvant ? poidsJours[jourAvant] : Math.max(...Object.values(poidsJours));
const potentielAvant = Math.ceil(venteMax / poidsAvant);

console.log('❌ AVANT LA CORRECTION (avec le bug) :');
console.log(`   Date de vente max : ${dateVenteMax}`);
console.log(`   Jour détecté : ${jourAvant || 'undefined'} ${!jourAvant ? '← BUG !' : ''}`);
console.log(`   Poids utilisé : ${(poidsAvant * 100).toFixed(1)}% ${!jourAvant ? '(fallback = max)' : ''}`);
console.log(`   Calcul : ${venteMax} ÷ ${(poidsAvant * 100).toFixed(1)}% = ${potentielAvant}`);
console.log(`   ➜ Potentiel hebdo : ${potentielAvant} unités\n`);

// APRÈS
const jourApres = getJourSemaineAPRES(dateVenteMax);
const poidsApres = jourApres ? poidsJours[jourApres] : Math.max(...Object.values(poidsJours));
const potentielApres = Math.ceil(venteMax / poidsApres);

console.log('✅ APRÈS LA CORRECTION (bug corrigé) :');
console.log(`   Date de vente max : ${dateVenteMax}`);
console.log(`   Jour détecté : ${jourApres} ← CORRECT !`);
console.log(`   Poids utilisé : ${(poidsApres * 100).toFixed(1)}%`);
console.log(`   Calcul : ${venteMax} ÷ ${(poidsApres * 100).toFixed(1)}% = ${potentielApres}`);
console.log(`   ➜ Potentiel hebdo : ${potentielApres} unités\n`);

console.log('───────────────────────────────────────────────────────────────\n');

const diff = potentielApres - potentielAvant;
const diffPct = ((diff / potentielAvant) * 100).toFixed(1);

if (diff !== 0) {
  console.log(`🔄 IMPACT DE LA CORRECTION :`);
  console.log(`   Différence : ${diff > 0 ? '+' : ''}${diff} unités (${diff > 0 ? '+' : ''}${diffPct}%)`);
  console.log(`   ${diff > 0 ? '⬆️  Le potentiel a augmenté' : '⬇️  Le potentiel a diminué'}`);
} else {
  console.log('✅ Pas de différence dans ce cas (la vente max n\'était pas un jour critique)');
}

console.log('\n═══════════════════════════════════════════════════════════════\n');
console.log('✅ Vérification terminée !\n');
