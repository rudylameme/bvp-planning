/**
 * Script de simulation du planning BVP
 * Compare les 3 méthodes de calcul : Mathématique, +20%, +10%
 */

import XLSX from 'xlsx';
import { readFileSync } from 'fs';

// Chemins des fichiers
const VENTES_FILE = './public/Data/Ventes test.xlsx';
const FREQUENTATION_FILE = './public/Data/Fréquentation test.xlsx';

console.log('🚀 === SIMULATION PLANNING BVP ===\n');

// ==========================================
// ÉTAPE 1 : Charger et analyser les ventes
// ==========================================
console.log('📊 Étape 1 : Analyse du fichier de ventes...\n');

const ventesWorkbook = XLSX.readFile(VENTES_FILE);
const ventesSheet = ventesWorkbook.Sheets[ventesWorkbook.SheetNames[0]];
const ventesData = XLSX.utils.sheet_to_json(ventesSheet, { header: 1, defval: '' });

// Trouver la ligne d'en-tête avec ITM8
let headerRowIndex = -1;
for (let i = 0; i < ventesData.length; i++) {
  if (ventesData[i] && ventesData[i][0] && ventesData[i][0].toString().toLowerCase().includes('itm8')) {
    headerRowIndex = i;
    break;
  }
}

const headers = ventesData[headerRowIndex];
const dataRows = ventesData.slice(headerRowIndex + 1);

// Trouver les indices des colonnes
const itm8Index = headers.findIndex(h => h && h.toString().toLowerCase().includes('itm8'));
const libelleIndex = headers.findIndex(h => h && h.toString().toLowerCase().includes('libellé'));
const dateIndex = headers.findIndex(h => h && h.toString().toLowerCase() === 'date');
const quantiteIndex = headers.findIndex(h => h && h.toString().toLowerCase().includes('quantité'));

console.log(`✅ Colonnes détectées : ITM8=${itm8Index}, Libellé=${libelleIndex}, Date=${dateIndex}, Quantité=${quantiteIndex}\n`);

// Regrouper par produit
const produitsMap = new Map();

dataRows.forEach(row => {
  const itm8Raw = row[itm8Index];
  const libelle = row[libelleIndex];
  const date = row[dateIndex];
  const quantite = parseFloat(row[quantiteIndex]) || 0;

  if (!libelle || !date || libelle.toString().trim() === '' || libelle.toString() === 'BOULANGERIE PATISSERIE') return;

  const libelleStr = libelle.toString().trim();

  let itm8 = null;
  if (itm8Raw !== undefined && itm8Raw !== null && itm8Raw !== '') {
    const itm8Num = parseInt(itm8Raw);
    if (!isNaN(itm8Num)) {
      itm8 = itm8Num;
    }
  }

  if (!produitsMap.has(libelleStr)) {
    produitsMap.set(libelleStr, {
      ventesParJour: {},
      itm8: itm8,
      totalVentes: 0
    });
  }

  const dateStr = date.toString();
  const produitData = produitsMap.get(libelleStr);
  produitData.ventesParJour[dateStr] = (produitData.ventesParJour[dateStr] || 0) + quantite;
  produitData.totalVentes += quantite;

  if (itm8 && !produitData.itm8) {
    produitData.itm8 = itm8;
  }
});

console.log(`📦 Nombre de produits détectés : ${produitsMap.size}\n`);

// Trouver le produit le plus vendu
let produitMax = null;
let maxVentes = 0;

for (const [libelle, data] of produitsMap) {
  if (data.totalVentes > maxVentes) {
    maxVentes = data.totalVentes;
    produitMax = { libelle, ...data };
  }
}

console.log(`🏆 Produit le plus vendu : ${produitMax.libelle}`);
console.log(`   ITM8 : ${produitMax.itm8 || 'Non reconnu'}`);
console.log(`   Total ventes : ${produitMax.totalVentes} unités`);
console.log(`   Nombre de jours : ${Object.keys(produitMax.ventesParJour).length} jours\n`);

// Afficher l'historique jour par jour
console.log('📅 Historique des ventes jour par jour :\n');
const ventesArray = Object.entries(produitMax.ventesParJour)
  .map(([date, qte]) => ({ date, qte }))
  .sort((a, b) => a.date.localeCompare(b.date));

ventesArray.forEach(({ date, qte }) => {
  console.log(`   ${date} : ${qte} unités`);
});
console.log('');

// ==========================================
// ÉTAPE 2 : Calculer les potentiels
// ==========================================
console.log('🧮 Étape 2 : Calcul des potentiels hebdomadaires...\n');

// Extraire les quantités pour calcul
const quantites = ventesArray.map(v => v.qte);
const venteMax = Math.max(...quantites);
const moyenne = quantites.reduce((sum, q) => sum + q, 0) / quantites.length;

// Calcul de l'écart-type
const variance = quantites.reduce((sum, q) => sum + Math.pow(q - moyenne, 2), 0) / quantites.length;
const ecartType = Math.sqrt(variance);

// Méthode 1 : Mathématique (Moyenne + Écart-type × 1.5)
const potentielMath = Math.ceil(moyenne + (ecartType * 1.5));
const potentielHebdoMath = potentielMath * 7;

// Méthode 2 : Fort (+20%)
const potentielFort = Math.ceil(venteMax * 1.2);
const potentielHebdoFort = potentielFort * 7;

// Méthode 3 : Faible (+10%)
const potentielFaible = Math.ceil(venteMax * 1.1);
const potentielHebdoFaible = potentielFaible * 7;

console.log(`📊 Statistiques des ventes :`);
console.log(`   Vente maximale : ${venteMax} unités`);
console.log(`   Vente moyenne : ${moyenne.toFixed(1)} unités`);
console.log(`   Écart-type : ${ecartType.toFixed(1)}\n`);

console.log(`📈 Potentiels calculés :`);
console.log(`   ┌────────────────────┬──────────────┬──────────────────┐`);
console.log(`   │ Méthode            │ Potentiel/j  │ Potentiel Hebdo  │`);
console.log(`   ├────────────────────┼──────────────┼──────────────────┤`);
console.log(`   │ Mathématique       │ ${potentielMath.toString().padEnd(12)} │ ${potentielHebdoMath.toString().padEnd(16)} │`);
console.log(`   │ Fort (+20%)        │ ${potentielFort.toString().padEnd(12)} │ ${potentielHebdoFort.toString().padEnd(16)} │`);
console.log(`   │ Faible (+10%)      │ ${potentielFaible.toString().padEnd(12)} │ ${potentielHebdoFaible.toString().padEnd(16)} │`);
console.log(`   └────────────────────┴──────────────┴──────────────────┘\n`);

// ==========================================
// ÉTAPE 3 : Charger la fréquentation
// ==========================================
console.log('📊 Étape 3 : Analyse de la fréquentation...\n');

const freqWorkbook = XLSX.readFile(FREQUENTATION_FILE);
const freqSheet = freqWorkbook.Sheets[freqWorkbook.SheetNames[0]];
const freqData = XLSX.utils.sheet_to_json(freqSheet, { header: 1, defval: '' });

// Mapping jours
const jourMap = {
  '1-lundi': 'lundi',
  '2-mardi': 'mardi',
  '3-mercredi': 'mercredi',
  '4-jeudi': 'jeudi',
  '5-vendredi': 'vendredi',
  '6-samedi': 'samedi',
  '7-dimanche': 'dimanche'
};

// Initialisation
const qteTotParJourS1 = {};
const qteTotParJourTrancheS1 = {};

Object.values(jourMap).forEach(jour => {
  qteTotParJourS1[jour] = 0;
  qteTotParJourTrancheS1[jour] = {
    '00_Autre': 0,
    '09h_12h': 0,
    '12h_14h': 0,
    '14h_16h': 0,
    '16h_19h': 0,
    '19h_23h': 0
  };
});

// Trouver la ligne d'en-tête avec JOUR
let freqHeaderIndex = -1;
for (let i = 0; i < Math.min(10, freqData.length); i++) {
  const row = freqData[i];
  if (row && row.some(cell => cell && cell.toString().includes('JOUR'))) {
    freqHeaderIndex = i;
    break;
  }
}

if (freqHeaderIndex === -1) {
  freqHeaderIndex = 0;
}

// Extraction des données (colonnes : 6=JOUR, 7=TRANCHE, 12=M (S-1 Qte Tot))
for (let i = freqHeaderIndex + 1; i < freqData.length; i++) {
  const row = freqData[i];
  if (!row || row.length < 26) continue;

  const jourCell = row[6];
  const trancheCell = row[7];
  const qteTotS1 = parseFloat(row[12]) || 0;  // Colonne M

  if (!jourCell || !trancheCell) continue;

  const jourStr = jourCell.toString().toLowerCase();
  const tranche = trancheCell.toString();

  let jourKey = null;
  for (const [key, value] of Object.entries(jourMap)) {
    if (jourStr.includes(key) || jourStr.includes(value)) {
      jourKey = value;
      break;
    }
  }

  if (jourKey) {
    qteTotParJourS1[jourKey] += qteTotS1;

    if (qteTotParJourTrancheS1[jourKey][tranche] !== undefined) {
      qteTotParJourTrancheS1[jourKey][tranche] += qteTotS1;
    }
  }
}

// Calcul des poids par jour
const totalQteTot = Object.values(qteTotParJourS1).reduce((sum, q) => sum + q, 0);
const poidsJours = {};

Object.keys(qteTotParJourS1).forEach(jour => {
  poidsJours[jour] = qteTotParJourS1[jour] / totalQteTot;
});

// Calcul des poids par tranche horaire
const poidsTranchesParJour = {};

Object.keys(qteTotParJourTrancheS1).forEach(jour => {
  const tranches = qteTotParJourTrancheS1[jour];

  const qteTotMatin = (tranches['00_Autre'] || 0) + (tranches['09h_12h'] || 0);
  const qteTotMidi = (tranches['12h_14h'] || 0) + (tranches['14h_16h'] || 0);
  const qteTotSoir = (tranches['16h_19h'] || 0) + (tranches['19h_23h'] || 0);
  const totalJour = qteTotMatin + qteTotMidi + qteTotSoir;

  if (totalJour > 0) {
    poidsTranchesParJour[jour] = {
      matin: qteTotMatin / totalJour,
      midi: qteTotMidi / totalJour,
      soir: qteTotSoir / totalJour
    };
  } else {
    poidsTranchesParJour[jour] = {
      matin: 0.6,
      midi: 0.3,
      soir: 0.1
    };
  }
});

console.log(`✅ Total Qte Tot S-1 : ${totalQteTot.toFixed(0)}\n`);

console.log(`📊 Poids par jour (% de l'activité hebdomadaire) :\n`);
const joursOrdre = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
joursOrdre.forEach(jour => {
  const poids = poidsJours[jour];
  const pct = (poids * 100).toFixed(1);
  const qte = qteTotParJourS1[jour].toFixed(0);
  console.log(`   ${jour.padEnd(10)} : ${pct.padStart(5)}% (${qte} produits)`);
});
console.log('');

// ==========================================
// ÉTAPE 4 : Générer les plannings
// ==========================================
console.log('🎯 Étape 4 : Génération des plannings comparatifs...\n');
console.log('═══════════════════════════════════════════════════════════════════════\n');

const potentiels = [
  { nom: 'Mathématique', hebdo: potentielHebdoMath },
  { nom: 'Fort (+20%)', hebdo: potentielHebdoFort },
  { nom: 'Faible (+10%)', hebdo: potentielHebdoFaible }
];

joursOrdre.forEach(jour => {
  const jourCap = jour.charAt(0).toUpperCase() + jour.slice(1);
  console.log(`📅 ${jourCap.toUpperCase()}`);
  console.log(`─────────────────────────────────────────────────────────────────────\n`);

  const poids = poidsJours[jour];
  const poidsTranches = poidsTranchesParJour[jour];

  console.log(`   Poids jour : ${(poids * 100).toFixed(1)}%`);
  console.log(`   Répartition horaire : Matin ${(poidsTranches.matin * 100).toFixed(1)}% | Midi ${(poidsTranches.midi * 100).toFixed(1)}% | Soir ${(poidsTranches.soir * 100).toFixed(1)}%\n`);

  // Tableau comparatif
  console.log(`   ┌─────────────────┬────────┬────────┬────────┬────────┐`);
  console.log(`   │ Méthode         │ Matin  │ Midi   │ Soir   │ TOTAL  │`);
  console.log(`   ├─────────────────┼────────┼────────┼────────┼────────┤`);

  potentiels.forEach(({ nom, hebdo }) => {
    const qteJour = Math.ceil(hebdo * poids * 1.1);
    const qteMatin = Math.ceil(qteJour * poidsTranches.matin);
    const qteMidi = Math.ceil(qteJour * poidsTranches.midi);
    const qteSoir = Math.ceil(qteJour * poidsTranches.soir);

    console.log(`   │ ${nom.padEnd(15)} │ ${qteMatin.toString().padStart(6)} │ ${qteMidi.toString().padStart(6)} │ ${qteSoir.toString().padStart(6)} │ ${qteJour.toString().padStart(6)} │`);
  });

  console.log(`   └─────────────────┴────────┴────────┴────────┴────────┘\n`);
});

console.log('═══════════════════════════════════════════════════════════════════════\n');
console.log('✅ Simulation terminée !\n');
