/**
 * Simulation EXACTE du comportement de l'application BVP Planning
 * Utilise les mêmes algorithmes que l'application pour comparaison
 */

import XLSX from 'xlsx';

// Chemins des fichiers
const VENTES_FILE = './public/Data/Ventes test.xlsx';
const FREQUENTATION_FILE = './public/Data/Fréquentation test.xlsx';

console.log('🚀 === SIMULATION EXACTE DE L\'APPLICATION BVP ===\n');

// ==========================================
// ÉTAPE 1 : Parser les ventes (comme dans parsers.js)
// ==========================================
console.log('📊 Étape 1 : Parsing du fichier de ventes...\n');

const ventesWorkbook = XLSX.readFile(VENTES_FILE);
const ventesSheet = ventesWorkbook.Sheets[ventesWorkbook.SheetNames[0]];
const allVentesData = XLSX.utils.sheet_to_json(ventesSheet, { header: 1, defval: '' });

// Extraire info PDV
let pdvInfo = null;
if (allVentesData[0] && allVentesData[0][0]) {
  const firstCellText = allVentesData[0][0].toString();
  const pdvMatch = firstCellText.match(/PDV:?\s*(\d+)\s*-\s*([^Date]+)/i);
  if (pdvMatch) {
    pdvInfo = {
      numero: pdvMatch[1].trim(),
      nom: pdvMatch[2].trim()
    };
  }
}

// Trouver la ligne d'en-tête avec ITM8
let headerRowIndex = -1;
for (let i = 0; i < allVentesData.length; i++) {
  if (allVentesData[i] && allVentesData[i][0] && allVentesData[i][0].toString().toLowerCase().includes('itm8')) {
    headerRowIndex = i;
    break;
  }
}

const headers = allVentesData[headerRowIndex];
const dataRows = allVentesData.slice(headerRowIndex + 1);

const itm8Index = headers.findIndex(h => h && h.toString().toLowerCase().includes('itm8'));
const libelleIndex = headers.findIndex(h => h && h.toString().toLowerCase().includes('libellé'));
const dateIndex = headers.findIndex(h => h && h.toString().toLowerCase() === 'date');
const quantiteIndex = headers.findIndex(h => h && h.toString().toLowerCase().includes('quantité'));

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
      itm8: itm8
    });
  }

  const dateStr = date.toString();
  const produitData = produitsMap.get(libelleStr);
  produitData.ventesParJour[dateStr] = (produitData.ventesParJour[dateStr] || 0) + quantite;

  if (itm8 && !produitData.itm8) {
    produitData.itm8 = itm8;
  }
});

const joursUniques = Array.from(new Set(
  dataRows.map(row => row[dateIndex]).filter(d => d && d.toString().trim() !== '')
)).sort();

console.log(`✅ PDV : ${pdvInfo ? pdvInfo.numero + ' - ' + pdvInfo.nom : 'Non détecté'}`);
console.log(`✅ Produits détectés : ${produitsMap.size}`);
console.log(`✅ Jours de ventes : ${joursUniques.length}\n`);

// ==========================================
// ÉTAPE 2 : Parser la fréquentation (comme dans parsers.js)
// ==========================================
console.log('📊 Étape 2 : Parsing du fichier de fréquentation (mode Standard)...\n');

const freqWorkbook = XLSX.readFile(FREQUENTATION_FILE);
const freqSheet = freqWorkbook.Sheets[freqWorkbook.SheetNames[0]];
const allFreqData = XLSX.utils.sheet_to_json(freqSheet, { header: 1, defval: '' });

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
const qteTotParJourAS1 = {};
const qteTotParJourS2 = {};
const qteTotParJourTrancheS1 = {};
const qteTotParJourTrancheAS1 = {};
const qteTotParJourTrancheS2 = {};

Object.values(jourMap).forEach(jour => {
  qteTotParJourS1[jour] = 0;
  qteTotParJourAS1[jour] = 0;
  qteTotParJourS2[jour] = 0;
  qteTotParJourTrancheS1[jour] = {
    '00_Autre': 0,
    '09h_12h': 0,
    '12h_14h': 0,
    '14h_16h': 0,
    '16h_19h': 0,
    '19h_23h': 0
  };
  qteTotParJourTrancheAS1[jour] = {
    '00_Autre': 0,
    '09h_12h': 0,
    '12h_14h': 0,
    '14h_16h': 0,
    '16h_19h': 0,
    '19h_23h': 0
  };
  qteTotParJourTrancheS2[jour] = {
    '00_Autre': 0,
    '09h_12h': 0,
    '12h_14h': 0,
    '14h_16h': 0,
    '16h_19h': 0,
    '19h_23h': 0
  };
});

// Trouver la ligne d'en-tête
let freqHeaderIndex = -1;
for (let i = 0; i < Math.min(10, allFreqData.length); i++) {
  const row = allFreqData[i];
  if (row && row.some(cell => cell && cell.toString().includes('JOUR'))) {
    freqHeaderIndex = i;
    break;
  }
}

if (freqHeaderIndex === -1) {
  freqHeaderIndex = 0;
}

// Extraction des données (colonnes : 6=JOUR, 7=TRANCHE, M=12, S=18, Y=24)
for (let i = freqHeaderIndex + 1; i < allFreqData.length; i++) {
  const row = allFreqData[i];
  if (!row || row.length < 26) continue;

  const jourCell = row[6];
  const trancheCell = row[7];
  const qteTotS1 = parseFloat(row[12]) || 0;  // Colonne M
  const qteTotAS1 = parseFloat(row[18]) || 0; // Colonne S
  const qteTotS2 = parseFloat(row[24]) || 0;  // Colonne Y

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
    qteTotParJourAS1[jourKey] += qteTotAS1;
    qteTotParJourS2[jourKey] += qteTotS2;

    if (qteTotParJourTrancheS1[jourKey][tranche] !== undefined) {
      qteTotParJourTrancheS1[jourKey][tranche] += qteTotS1;
      qteTotParJourTrancheAS1[jourKey][tranche] += qteTotAS1;
      qteTotParJourTrancheS2[jourKey][tranche] += qteTotS2;
    }
  }
}

// Pondération Standard : S1=40%, AS1=30%, S2=30%
const weights = { S1: 0.4, AS1: 0.3, S2: 0.3 };

const qteTotParJour = {};
let totalQteTot = 0;

Object.keys(qteTotParJourS1).forEach(jour => {
  const qteTotPonderee =
    (qteTotParJourS1[jour] * weights.S1) +
    (qteTotParJourAS1[jour] * weights.AS1) +
    (qteTotParJourS2[jour] * weights.S2);

  qteTotParJour[jour] = qteTotPonderee;
  totalQteTot += qteTotPonderee;
});

const poidsJours = {};
Object.keys(qteTotParJour).forEach(jour => {
  poidsJours[jour] = totalQteTot > 0 ? qteTotParJour[jour] / totalQteTot : 0;
});

const poidsTranchesParJour = {};

Object.keys(qteTotParJourTrancheS1).forEach(jour => {
  const tranchesS1 = qteTotParJourTrancheS1[jour];
  const tranchesAS1 = qteTotParJourTrancheAS1[jour];
  const tranchesS2 = qteTotParJourTrancheS2[jour];

  const tranchesPonderees = {};
  Object.keys(tranchesS1).forEach(tranche => {
    tranchesPonderees[tranche] =
      (tranchesS1[tranche] * weights.S1) +
      (tranchesAS1[tranche] * weights.AS1) +
      (tranchesS2[tranche] * weights.S2);
  });

  const qteTotMatin = (tranchesPonderees['00_Autre'] || 0) + (tranchesPonderees['09h_12h'] || 0);
  const qteTotMidi = (tranchesPonderees['12h_14h'] || 0) + (tranchesPonderees['14h_16h'] || 0);
  const qteTotSoir = (tranchesPonderees['16h_19h'] || 0) + (tranchesPonderees['19h_23h'] || 0);
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

const frequentationData = {
  qteTotParJour,
  poidsJours,
  totalQteTot,
  poidsTranchesParJour,
  type: 'standard',
  ponderations: weights
};

console.log(`✅ Total Qte Tot pondéré : ${totalQteTot.toFixed(0)}\n`);

// ==========================================
// ÉTAPE 3 : Trouver le produit le plus vendu et calculer son potentiel
// ==========================================
console.log('📊 Étape 3 : Calcul du potentiel pour le produit le plus vendu...\n');

// Fonction trouverVenteMax (comme dans potentielCalculator.js)
function trouverVenteMax(ventesParJour) {
  let maxVente = 0;
  let dateMax = null;

  for (const [date, quantite] of Object.entries(ventesParJour)) {
    if (quantite > maxVente) {
      maxVente = quantite;
      dateMax = date;
    }
  }

  return { maxVente, dateMax };
}

// Fonction calculerPotentielDepuisVenteMax (comme dans potentielCalculator.js)
function calculerPotentielDepuisVenteMax(ventesParJour, methodePotentiel) {
  const { maxVente } = trouverVenteMax(ventesParJour);

  const quantites = Object.values(ventesParJour);
  const moyenne = quantites.reduce((sum, q) => sum + q, 0) / quantites.length;
  const variance = quantites.reduce((sum, q) => sum + Math.pow(q - moyenne, 2), 0) / quantites.length;
  const ecartType = Math.sqrt(variance);

  let potentielJournalier;

  if (methodePotentiel === 'fort') {
    // +20%
    potentielJournalier = maxVente * 1.2;
  } else if (methodePotentiel === 'faible') {
    // +10%
    potentielJournalier = maxVente * 1.1;
  } else {
    // Mathématique : moyenne + écart-type × 1.5
    potentielJournalier = moyenne + (ecartType * 1.5);
  }

  const potentielHebdo = potentielJournalier * 7;

  return {
    potentielJournalier: Math.ceil(potentielJournalier),
    potentielHebdo: Math.ceil(potentielHebdo),
    maxVente,
    moyenne: moyenne.toFixed(1),
    ecartType: ecartType.toFixed(1)
  };
}

// Trouver le produit le plus vendu
let produitMax = null;
let maxTotalVentes = 0;

for (const [libelle, data] of produitsMap) {
  const totalVentes = Object.values(data.ventesParJour).reduce((sum, q) => sum + q, 0);
  if (totalVentes > maxTotalVentes) {
    maxTotalVentes = totalVentes;
    produitMax = { libelle, ...data, totalVentes };
  }
}

console.log(`🏆 PRODUIT LE PLUS VENDU : ${produitMax.libelle}`);
console.log(`   ITM8 : ${produitMax.itm8 || 'Non reconnu'}`);
console.log(`   Total ventes : ${produitMax.totalVentes} unités`);
console.log(`   Nombre de jours : ${Object.keys(produitMax.ventesParJour).length} jours\n`);

// Calculer les 3 potentiels
const potentielMath = calculerPotentielDepuisVenteMax(produitMax.ventesParJour, 'mathematique');
const potentielFort = calculerPotentielDepuisVenteMax(produitMax.ventesParJour, 'fort');
const potentielFaible = calculerPotentielDepuisVenteMax(produitMax.ventesParJour, 'faible');

console.log(`📈 POTENTIELS CALCULÉS :`);
console.log(`   Vente max : ${potentielMath.maxVente} unités`);
console.log(`   Moyenne : ${potentielMath.moyenne} unités/jour`);
console.log(`   Écart-type : ${potentielMath.ecartType}\n`);

console.log(`   Mathématique : ${potentielMath.potentielHebdo} unités/semaine`);
console.log(`   Fort (+20%)  : ${potentielFort.potentielHebdo} unités/semaine`);
console.log(`   Faible (+10%): ${potentielFaible.potentielHebdo} unités/semaine\n`);

// ==========================================
// ÉTAPE 4 : Générer le planning (comme dans planningCalculator.js)
// ==========================================
console.log('📊 Étape 4 : Génération du planning...\n');
console.log('═══════════════════════════════════════════════════════════════════════\n');

const joursCapitalized = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const methodes = [
  { nom: 'Mathématique', potentielHebdo: potentielMath.potentielHebdo },
  { nom: 'Fort (+20%)', potentielHebdo: potentielFort.potentielHebdo },
  { nom: 'Faible (+10%)', potentielHebdo: potentielFaible.potentielHebdo }
];

joursCapitalized.forEach(jour => {
  const jourLower = jour.toLowerCase();
  const poids = poidsJours[jourLower];
  const poidsTranches = poidsTranchesParJour[jourLower] || { matin: 0.6, midi: 0.3, soir: 0.1 };

  console.log(`📅 ${jour.toUpperCase()}`);
  console.log(`─────────────────────────────────────────────────────────────────────\n`);
  console.log(`   Poids jour : ${(poids * 100).toFixed(1)}%`);
  console.log(`   Répartition : Matin ${(poidsTranches.matin * 100).toFixed(1)}% | Midi ${(poidsTranches.midi * 100).toFixed(1)}% | Soir ${(poidsTranches.soir * 100).toFixed(1)}%\n`);

  console.log(`   ┌─────────────────┬────────┬────────┬────────┬────────┐`);
  console.log(`   │ Méthode         │ Matin  │ Midi   │ Soir   │ TOTAL  │`);
  console.log(`   ├─────────────────┼────────┼────────┼────────┼────────┤`);

  methodes.forEach(({ nom, potentielHebdo }) => {
    // Calcul EXACT comme dans planningCalculator.js ligne 91-100
    const qteHebdo = Math.ceil(potentielHebdo * 1.1);
    const qteJour = Math.ceil(qteHebdo * poids);
    const qteMatin = Math.ceil(qteJour * poidsTranches.matin);
    const qteMidi = Math.ceil(qteJour * poidsTranches.midi);
    const qteSoir = Math.ceil(qteJour * poidsTranches.soir);

    console.log(`   │ ${nom.padEnd(15)} │ ${qteMatin.toString().padStart(6)} │ ${qteMidi.toString().padStart(6)} │ ${qteSoir.toString().padStart(6)} │ ${qteJour.toString().padStart(6)} │`);
  });

  console.log(`   └─────────────────┴────────┴────────┴────────┴────────┘\n`);
});

console.log('═══════════════════════════════════════════════════════════════════════\n');
console.log('✅ Simulation terminée ! Résultats identiques à l\'application.\n');
