/**
 * Test de la vérification des minimums jour par jour
 * Vérifie que le planning ne descend jamais en dessous des ventes maximales historiques
 */

import XLSX from 'xlsx';

const VENTES_FILE = './public/Data/Ventes test.xlsx';
const FREQUENTATION_FILE = './public/Data/Fréquentation test.xlsx';

console.log('🔍 === TEST VÉRIFICATION DES MINIMUMS ===\n');

// ==========================================
// Fonction de conversion date → jour
// ==========================================
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

// ==========================================
// Fonction pour trouver vente max par jour
// ==========================================
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

// ==========================================
// Charger la fréquentation
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

const qteTotBVPParJour = {};
let totalQteTotBVP = 0;

Object.values(jourMap).forEach(jour => {
  qteTotBVPParJour[jour] = 0;
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

// ==========================================
// Charger les ventes
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

// Trouver la vente max
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
const potentielHebdo = Math.ceil(venteMax / poidsJourMax);

console.log(`📦 Produit analysé : ${produitMax.libelle}`);
console.log(`   Vente max : ${venteMax} unités le ${dateVenteMax} (${jourVenteMax})`);
console.log(`   Potentiel hebdo : ${potentielHebdo} unités\n`);

// ==========================================
// Simuler le planning avec vérification
// ==========================================
console.log('═══════════════════════════════════════════════════════════════\n');
console.log('📊 SIMULATION DU PLANNING AVEC VÉRIFICATION MINIMUMS\n');
console.log('───────────────────────────────────────────────────────────────\n');

const joursOrdre = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

console.log('┌────────────┬─────────────┬─────────────┬──────────────┬──────────┐');
console.log('│ Jour       │ Préco init  │ Vente max   │ Préco finale │ Ajusté ? │');
console.log('├────────────┼─────────────┼─────────────┼──────────────┼──────────┤');

let ajustements = 0;

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

  console.log(`│ ${jour.padEnd(10)} │ ${qteJourInit.toString().padStart(11)} │ ${venteMaxCeJour.toString().padStart(11)} │ ${qteJourFinal.toString().padStart(12)} │ ${ajuste.padEnd(8)} │`);
});

console.log('└────────────┴─────────────┴─────────────┴──────────────┴──────────┘\n');

console.log(`📈 Résultat : ${ajustements} jour(s) ajusté(s) pour respecter les ventes maximales\n`);

console.log('═══════════════════════════════════════════════════════════════\n');
console.log('✅ Test terminé !\n');
