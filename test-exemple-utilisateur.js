/**
 * Test avec l'exemple exact de l'utilisateur
 * Méthode Prudent : potentiel 317, lundi devrait être 42 (pas 40)
 */

import XLSX from 'xlsx';

const VENTES_FILE = './public/Data/Ventes test.xlsx';
const FREQUENTATION_FILE = './public/Data/Fréquentation test.xlsx';

console.log('🔍 === TEST EXEMPLE UTILISATEUR ===\n');

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
  const ventesDeceJour = [];

  for (const [date, quantite] of Object.entries(ventesParJour)) {
    const jourDeDate = getJourSemaine(date);
    if (jourDeDate === jourCible) {
      ventesDeceJour.push({ date, quantite });
      if (quantite > venteMax) {
        venteMax = quantite;
      }
    }
  }

  return { venteMax, ventesDeceJour };
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

console.log(`📦 Produit : ${produitMax.libelle}`);
console.log(`   Total ventes sur la période : ${produitMax.totalVentes} unités\n`);

// Afficher toutes les ventes par jour avec leur jour de semaine
console.log('📅 Historique des ventes avec jours de la semaine :\n');
const ventesArray = Object.entries(produitMax.ventesParJour)
  .map(([date, qte]) => ({ date, qte, jour: getJourSemaine(date) }))
  .sort((a, b) => a.date.localeCompare(b.date));

ventesArray.forEach(({ date, qte, jour }) => {
  console.log(`   ${date} (${jour.padEnd(9)}) : ${qte} unités`);
});

console.log('\n═══════════════════════════════════════════════════════════════\n');
console.log('🧪 TEST MÉTHODE PRUDENT (comme dans votre Excel)\n');

// Méthode Prudent : 288 x 1.10 = 317 (comme dans votre Excel)
const potentielPrudent = 317;
const qteHebdoAvecMarge = Math.ceil(potentielPrudent * 1.1);

console.log(`Potentiel hebdo Prudent : ${potentielPrudent} unités`);
console.log(`Avec marge +10% : ${qteHebdoAvecMarge} unités\n`);

console.log('Poids par jour (Qte Tot BVP) :\n');
Object.entries(poidsJours).forEach(([jour, poids]) => {
  console.log(`   ${jour.padEnd(10)} : ${(poids * 100).toFixed(1)}%`);
});

console.log('\n───────────────────────────────────────────────────────────────\n');
console.log('📊 CALCUL POUR LUNDI (votre exemple) :\n');

const { venteMax: venteMaxLundi, ventesDeceJour: ventesLundis } = trouverVenteMaxPourJour(produitMax.ventesParJour, 'lundi');

console.log(`Tous les lundis dans l'historique :`);
ventesLundis.forEach(({ date, quantite }) => {
  console.log(`   ${date} : ${quantite} unités`);
});

const poidsLundi = poidsJours['lundi'];
const precoInitLundi = Math.ceil(qteHebdoAvecMarge * poidsLundi);

console.log(`\nCalcul de la préconisation :`);
console.log(`   ${qteHebdoAvecMarge} × ${(poidsLundi * 100).toFixed(1)}% = ${precoInitLundi} unités`);

console.log(`\nVente maximale des lundis : ${venteMaxLundi} unités`);

let precoFinaleLundi = precoInitLundi;
if (venteMaxLundi > precoInitLundi) {
  console.log(`\n⚠️  ${precoInitLundi} < ${venteMaxLundi} → Ajusté à ${venteMaxLundi} unités`);
  precoFinaleLundi = venteMaxLundi;
} else {
  console.log(`\n✅ ${precoInitLundi} ≥ ${venteMaxLundi} → Pas d'ajustement nécessaire`);
}

console.log(`\n🎯 PRÉCONISATION FINALE LUNDI : ${precoFinaleLundi} unités`);

console.log('\n═══════════════════════════════════════════════════════════════\n');
console.log('✅ Test terminé !\n');
