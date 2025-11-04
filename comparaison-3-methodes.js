/**
 * Comparaison des 3 méthodes de calcul du potentiel
 * Avec la correction du bug de conversion date → jour
 */

import XLSX from 'xlsx';

// Chemins des fichiers
const VENTES_FILE = './public/Data/Ventes test.xlsx';
const FREQUENTATION_FILE = './public/Data/Fréquentation test.xlsx';

console.log('🚀 === COMPARAISON DES 3 MÉTHODES (avec correction) ===\n');

// ==========================================
// Fonction corrigée getJourSemaine
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

// ==========================================
// ÉTAPE 3 : Calculer avec les 3 méthodes
// ==========================================

console.log('📦 Produit analysé : ' + produitMax.libelle);
console.log('   Total ventes : ' + produitMax.totalVentes + ' unités\n');

// Historique des ventes
const ventesArray = Object.entries(produitMax.ventesParJour)
  .map(([date, qte]) => ({ date, qte }))
  .sort((a, b) => a.date.localeCompare(b.date));

console.log('📅 Historique des ventes :\n');
ventesArray.forEach(({ date, qte }) => {
  const jour = getJourSemaine(date);
  console.log(`   ${date} (${jour.padEnd(9)}) : ${qte.toString().padStart(2)} unités`);
});
console.log('');

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

console.log('📊 Analyse de la vente maximale :');
console.log(`   Date : ${dateVenteMax}`);
console.log(`   Jour : ${jourVenteMax}`);
console.log(`   Quantité : ${venteMax} unités`);
console.log(`   Poids du jour : ${(poidsJourMax * 100).toFixed(1)}%\n`);

// Statistiques pour méthode mathématique
const quantites = ventesArray.map(v => v.qte);
const moyenne = quantites.reduce((sum, q) => sum + q, 0) / quantites.length;
const variance = quantites.reduce((sum, q) => sum + Math.pow(q - moyenne, 2), 0) / quantites.length;
const ecartType = Math.sqrt(variance);

console.log('═══════════════════════════════════════════════════════════════\n');
console.log('🧮 COMPARAISON DES 3 MÉTHODES DE CALCUL\n');
console.log('───────────────────────────────────────────────────────────────\n');

// Méthode 1 : Mathématique (Vente Max ÷ Poids du jour)
const potentielMathematique = Math.ceil(venteMax / poidsJourMax);

console.log('📐 MÉTHODE 1 : Mathématique');
console.log(`   Formule : Vente Max ÷ Poids du jour`);
console.log(`   Calcul : ${venteMax} ÷ ${(poidsJourMax * 100).toFixed(1)}% = ${potentielMathematique}`);
console.log(`   ➜ Potentiel hebdo : ${potentielMathematique} unités/semaine\n`);

// Méthode 2 : Forte progression (+20% max)
const volumeActuel = produitMax.totalVentes;
const progressionMath = (potentielMathematique - volumeActuel) / volumeActuel;

let potentielForte;
let limiteAtteinte = false;

if (progressionMath > 0.20) {
  potentielForte = Math.ceil(volumeActuel * 1.20);
  limiteAtteinte = true;
} else if (progressionMath < 0) {
  potentielForte = volumeActuel;
  limiteAtteinte = true;
} else {
  potentielForte = potentielMathematique;
}

console.log('📈 MÉTHODE 2 : Forte progression (+20% max)');
console.log(`   Volume actuel : ${volumeActuel} unités`);
console.log(`   Potentiel mathématique : ${potentielMathematique} unités`);
console.log(`   Progression : ${(progressionMath * 100).toFixed(1)}%`);
if (limiteAtteinte) {
  console.log(`   ⚠️  Limite atteinte ! Progression plafonnée à +20%`);
  console.log(`   Calcul : ${volumeActuel} × 1.20 = ${potentielForte}`);
} else {
  console.log(`   ✅ Progression acceptable, potentiel mathématique conservé`);
}
console.log(`   ➜ Potentiel hebdo : ${potentielForte} unités/semaine\n`);

// Méthode 3 : Prudent (+10% max)
let potentielPrudent;
let limitePrudentAtteinte = false;

if (progressionMath > 0.10) {
  potentielPrudent = Math.ceil(volumeActuel * 1.10);
  limitePrudentAtteinte = true;
} else if (progressionMath < 0) {
  potentielPrudent = volumeActuel;
  limitePrudentAtteinte = true;
} else {
  potentielPrudent = potentielMathematique;
}

console.log('🔒 MÉTHODE 3 : Prudent (+10% max)');
console.log(`   Volume actuel : ${volumeActuel} unités`);
console.log(`   Potentiel mathématique : ${potentielMathematique} unités`);
console.log(`   Progression : ${(progressionMath * 100).toFixed(1)}%`);
if (limitePrudentAtteinte) {
  console.log(`   ⚠️  Limite atteinte ! Progression plafonnée à +10%`);
  console.log(`   Calcul : ${volumeActuel} × 1.10 = ${potentielPrudent}`);
} else {
  console.log(`   ✅ Progression acceptable, potentiel mathématique conservé`);
}
console.log(`   ➜ Potentiel hebdo : ${potentielPrudent} unités/semaine\n`);

console.log('═══════════════════════════════════════════════════════════════\n');
console.log('📊 TABLEAU RÉCAPITULATIF\n');
console.log('┌──────────────────────┬─────────────────┬──────────────────┐');
console.log('│ Méthode              │ Potentiel/sem   │ vs Volume actuel │');
console.log('├──────────────────────┼─────────────────┼──────────────────┤');
console.log(`│ Volume actuel        │ ${volumeActuel.toString().padStart(15)} │                  │`);
console.log('├──────────────────────┼─────────────────┼──────────────────┤');
console.log(`│ Mathématique         │ ${potentielMathematique.toString().padStart(15)} │ ${((potentielMathematique - volumeActuel) >= 0 ? '+' : '') + ((potentielMathematique - volumeActuel) / volumeActuel * 100).toFixed(1)}%`.padEnd(16) + ' │');
console.log(`│ Forte (+20% max)     │ ${potentielForte.toString().padStart(15)} │ ${((potentielForte - volumeActuel) >= 0 ? '+' : '') + ((potentielForte - volumeActuel) / volumeActuel * 100).toFixed(1)}%`.padEnd(16) + ' │');
console.log(`│ Prudent (+10% max)   │ ${potentielPrudent.toString().padStart(15)} │ ${((potentielPrudent - volumeActuel) >= 0 ? '+' : '') + ((potentielPrudent - volumeActuel) / volumeActuel * 100).toFixed(1)}%`.padEnd(16) + ' │');
console.log('└──────────────────────┴─────────────────┴──────────────────┘\n');

console.log('✅ Comparaison terminée !\n');
