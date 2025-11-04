/**
 * Test avec méthode Prudent pour voir les ajustements en action
 */

import XLSX from 'xlsx';

const VENTES_FILE = './public/Data/Ventes test.xlsx';
const FREQUENTATION_FILE = './public/Data/Fréquentation test.xlsx';

console.log('🔍 === TEST VÉRIFICATION MINIMUMS (MÉTHODE PRUDENT) ===\n');

const getJourSemaine = (dateStr) => {
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

const trouverVenteMaxPourJour = (ventesParJour, jourCible) => {
  let venteMax = 0;
  for (const [date, quantite] of Object.entries(ventesParJour)) {
    const jourDeDate = getJourSemaine(date);
    if (jourDeDate === jourCible && quantite > venteMax) {
      venteMax = quantite;
    }
  }
  return venteMax;
};

// Charger fréquentation
const freqWorkbook = XLSX.readFile(FREQUENTATION_FILE);
const freqSheet = freqWorkbook.Sheets[freqWorkbook.SheetNames[0]];
const freqData = XLSX.utils.sheet_to_json(freqSheet, { header: 1, defval: '' });

const jourMap = {
  '1-lundi': 'lundi', '2-mardi': 'mardi', '3-mercredi': 'mercredi',
  '4-jeudi': 'jeudi', '5-vendredi': 'vendredi', '6-samedi': 'samedi', '7-dimanche': 'dimanche'
};

const qteTotBVPParJour = {};
let totalQteTotBVP = 0;
Object.values(jourMap).forEach(jour => { qteTotBVPParJour[jour] = 0; });

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
  if (!row || row.length < 22) continue;

  const jourCell = row[6];
  const qteTotBVPS1 = parseFloat(row[9]) || 0;

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
    qteTotBVPParJour[jourKey] += qteTotBVPS1;
    totalQteTotBVP += qteTotBVPS1;
  }
}

const poidsJours = {};
Object.keys(qteTotBVPParJour).forEach(jour => {
  poidsJours[jour] = qteTotBVPParJour[jour] / totalQteTotBVP;
});

// Charger ventes
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
    produitsMap.set(libelleStr, { ventesParJour: {}, totalVentes: 0 });
  }

  const dateStr = date.toString();
  const produitData = produitsMap.get(libelleStr);
  produitData.ventesParJour[dateStr] = (produitData.ventesParJour[dateStr] || 0) + quantite;
  produitData.totalVentes += quantite;
});

// Trouver produit max
let produitMax = null;
let maxVentes = 0;

for (const [libelle, data] of produitsMap) {
  if (data.totalVentes > maxVentes) {
    maxVentes = data.totalVentes;
    produitMax = { libelle, ...data };
  }
}

// Trouver vente max
let venteMax = 0;
let dateVenteMax = null;

for (const [date, qte] of Object.entries(produitMax.ventesParJour)) {
  if (qte > venteMax) {
    venteMax = qte;
    dateVenteMax = date;
  }
}

const jourVenteMax = getJourSemaine(dateVenteMax);
const poidsJourMax = poidsJours[jourVenteMax];

// MÉTHODE PRUDENT (+10% max)
const volumeActuel = produitMax.totalVentes;
const potentielMath = Math.ceil(venteMax / poidsJourMax);
const progressionMath = (potentielMath - volumeActuel) / volumeActuel;

let potentielHebdo;
if (progressionMath > 0.10) {
  potentielHebdo = Math.ceil(volumeActuel * 1.10);
  console.log(`⚠️  Méthode PRUDENT : Progression limitée à +10%`);
} else if (progressionMath < 0) {
  potentielHebdo = volumeActuel;
} else {
  potentielHebdo = potentielMath;
}

console.log(`📦 Produit analysé : ${produitMax.libelle}`);
console.log(`   Volume actuel : ${volumeActuel} unités`);
console.log(`   Potentiel mathématique : ${potentielMath} unités`);
console.log(`   Potentiel PRUDENT : ${potentielHebdo} unités (+${((potentielHebdo - volumeActuel) / volumeActuel * 100).toFixed(1)}%)\n`);

console.log('═══════════════════════════════════════════════════════════════\n');
console.log('📊 PLANNING AVEC VÉRIFICATION DES MINIMUMS\n');
console.log('───────────────────────────────────────────────────────────────\n');

const joursOrdre = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

console.log('┌────────────┬─────────────┬─────────────┬──────────────┬──────────┐');
console.log('│ Jour       │ Préco init  │ Vente max   │ Préco finale │ Ajusté ? │');
console.log('├────────────┼─────────────┼─────────────┼──────────────┼──────────┤');

let ajustements = 0;
let totalPrecoInit = 0;
let totalPrecoFinal = 0;

joursOrdre.forEach(jour => {
  const qteHebdo = Math.ceil(potentielHebdo * 1.1);
  const poids = poidsJours[jour];
  let qteJourInit = Math.ceil(qteHebdo * poids);

  const venteMaxCeJour = trouverVenteMaxPourJour(produitMax.ventesParJour, jour);

  let qteJourFinal = qteJourInit;
  let ajuste = '';

  if (venteMaxCeJour > qteJourInit) {
    qteJourFinal = venteMaxCeJour;
    ajuste = '✅ OUI';
    ajustements++;
  } else {
    ajuste = '-';
  }

  totalPrecoInit += qteJourInit;
  totalPrecoFinal += qteJourFinal;

  console.log(`│ ${jour.padEnd(10)} │ ${qteJourInit.toString().padStart(11)} │ ${venteMaxCeJour.toString().padStart(11)} │ ${qteJourFinal.toString().padStart(12)} │ ${ajuste.padEnd(8)} │`);
});

console.log('└────────────┴─────────────┴─────────────┴──────────────┴──────────┘\n');

console.log(`📈 Résultat :`);
console.log(`   ${ajustements} jour(s) ajusté(s) pour respecter les ventes maximales`);
console.log(`   Total préco initiale : ${totalPrecoInit} unités`);
console.log(`   Total préco finale : ${totalPrecoFinal} unités`);
console.log(`   Différence : +${totalPrecoFinal - totalPrecoInit} unités (+${((totalPrecoFinal - totalPrecoInit) / totalPrecoInit * 100).toFixed(1)}%)\n`);

console.log('═══════════════════════════════════════════════════════════════\n');
console.log('✅ Test terminé !\n');
