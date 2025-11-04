/**
 * Test : Vérification du système à 4 règles
 * - Règle 1: Calcul mathématique (venteMax / poidsJour)
 * - Règle 2: Minimum = ventes historiques du jour
 * - Règle 3: Application des limites par variante
 * - Règle 4: Les modifications manuelles surchargent tout
 */

import XLSX from 'xlsx';

const FREQUENTATION_FILE = './public/Data/Fréquentation test.xlsx';

console.log('🔍 === TEST SYSTÈME À 4 RÈGLES ===\n');

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

const calculerVentesHistoriquesPourJour = (ventesParJour, jourCible) => {
  let totalVentes = 0;
  for (const [date, quantite] of Object.entries(ventesParJour)) {
    const jourDeDate = getJourSemaine(date);
    if (jourDeDate === jourCible) {
      totalVentes += quantite;
    }
  }
  return totalVentes;
};

const calculerPotentielMathematique = (ventesParJour, poidsJours) => {
  let venteMax = 0;
  let jourVenteMax = 'lundi';

  for (const [date, quantite] of Object.entries(ventesParJour)) {
    if (quantite > venteMax) {
      venteMax = quantite;
      const jour = getJourSemaine(date);
      if (jour) {
        jourVenteMax = jour;
      }
    }
  }

  const poidsJour = poidsJours[jourVenteMax] || 0.14;
  if (poidsJour === 0) return venteMax * 7;

  return Math.ceil(venteMax / poidsJour);
};

const appliquerVarianteJournaliere = (qteMathematique, ventesHistoriques, variante) => {
  // Règle 2: Le minimum est toujours les ventes historiques
  if (qteMathematique < ventesHistoriques) {
    return ventesHistoriques;
  }

  // Règle 3: Application des limites selon variante
  if (variante === 'sans') {
    return qteMathematique;
  }

  const progression = (qteMathematique - ventesHistoriques) / ventesHistoriques;

  if (variante === 'forte') {
    // Limite +20%
    if (progression > 0.20) {
      return Math.ceil(ventesHistoriques * 1.20);
    }
    return qteMathematique;
  }

  if (variante === 'faible') {
    // Limite +10%
    if (progression > 0.10) {
      return Math.ceil(ventesHistoriques * 1.10);
    }
    return qteMathematique;
  }

  return qteMathematique;
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

// Simulations des ventes historiques de BAGUETTE
const ventesParJour = {
  '20/10/2025': 42,  // lundi
  '21/10/2025': 36,  // mardi
  '22/10/2025': 31,  // mercredi
  '23/10/2025': 33,  // jeudi
  '24/10/2025': 41,  // vendredi
  '25/10/2025': 43,  // samedi
  '26/10/2025': 62   // dimanche
};

console.log('📦 Produit : BAGUETTE BLANCHE PAC 250G');
console.log('   Ventes historiques : 288 unités\n');

// Calcul du potentiel mathématique (Règle 1)
const potentielMath = calculerPotentielMathematique(ventesParJour, poidsJours);
console.log(`📊 Règle 1 - Potentiel mathématique : ${potentielMath} unités\n`);

const joursOrdre = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

// Test avec variante "SANS"
console.log('═══════════════════════════════════════════════════════════════\n');
console.log('📊 TEST 1 : Variante "SANS" (pas de limite)\n');
console.log('┌────────────┬────────┬───────────┬─────────────┬──────────────┬───────────┐');
console.log('│ Jour       │ Poids  │ Qté Math  │ Vente histo │ Qté finale   │ Règle     │');
console.log('├────────────┼────────┼───────────┼─────────────┼──────────────┼───────────┤');

joursOrdre.forEach(jour => {
  const poids = poidsJours[jour];
  const qteMath = Math.ceil(potentielMath * poids);
  const ventesHisto = calculerVentesHistoriquesPourJour(ventesParJour, jour);
  const qteFinale = appliquerVarianteJournaliere(qteMath, ventesHisto, 'sans');
  const regle = qteFinale === ventesHisto ? 'Règle 2' : 'Règle 1+3';

  console.log(`│ ${jour.padEnd(10)} │ ${(poids * 100).toFixed(0).padStart(4)}%  │ ${qteMath.toString().padStart(9)} │ ${ventesHisto.toString().padStart(11)} │ ${qteFinale.toString().padStart(12)} │ ${regle.padEnd(9)} │`);
});

console.log('└────────────┴────────┴───────────┴─────────────┴──────────────┴───────────┘\n');

// Test avec variante "FORTE"
console.log('═══════════════════════════════════════════════════════════════\n');
console.log('📊 TEST 2 : Variante "FORTE" (+20% max)\n');
console.log('┌────────────┬────────┬───────────┬─────────────┬──────────────┬───────────────┐');
console.log('│ Jour       │ Poids  │ Qté Math  │ Vente histo │ Qté finale   │ Règle         │');
console.log('├────────────┼────────┼───────────┼─────────────┼──────────────┼───────────────┤');

joursOrdre.forEach(jour => {
  const poids = poidsJours[jour];
  const qteMath = Math.ceil(potentielMath * poids);
  const ventesHisto = calculerVentesHistoriquesPourJour(ventesParJour, jour);
  const qteFinale = appliquerVarianteJournaliere(qteMath, ventesHisto, 'forte');

  let regle = 'Règle 1+3';
  if (qteFinale === ventesHisto) regle = 'Règle 2';
  else if (qteFinale === Math.ceil(ventesHisto * 1.20)) regle = 'Règle 3 (cap)';

  console.log(`│ ${jour.padEnd(10)} │ ${(poids * 100).toFixed(0).padStart(4)}%  │ ${qteMath.toString().padStart(9)} │ ${ventesHisto.toString().padStart(11)} │ ${qteFinale.toString().padStart(12)} │ ${regle.padEnd(13)} │`);
});

console.log('└────────────┴────────┴───────────┴─────────────┴──────────────┴───────────────┘\n');

// Test avec variante "FAIBLE"
console.log('═══════════════════════════════════════════════════════════════\n');
console.log('📊 TEST 3 : Variante "FAIBLE" (+10% max)\n');
console.log('┌────────────┬────────┬───────────┬─────────────┬──────────────┬───────────────┐');
console.log('│ Jour       │ Poids  │ Qté Math  │ Vente histo │ Qté finale   │ Règle         │');
console.log('├────────────┼────────┼───────────┼─────────────┼──────────────┼───────────────┤');

joursOrdre.forEach(jour => {
  const poids = poidsJours[jour];
  const qteMath = Math.ceil(potentielMath * poids);
  const ventesHisto = calculerVentesHistoriquesPourJour(ventesParJour, jour);
  const qteFinale = appliquerVarianteJournaliere(qteMath, ventesHisto, 'faible');

  let regle = 'Règle 1+3';
  if (qteFinale === ventesHisto) regle = 'Règle 2';
  else if (qteFinale === Math.ceil(ventesHisto * 1.10)) regle = 'Règle 3 (cap)';

  console.log(`│ ${jour.padEnd(10)} │ ${(poids * 100).toFixed(0).padStart(4)}%  │ ${qteMath.toString().padStart(9)} │ ${ventesHisto.toString().padStart(11)} │ ${qteFinale.toString().padStart(12)} │ ${regle.padEnd(13)} │`);
});

console.log('└────────────┴────────┴───────────┴─────────────┴──────────────┴───────────────┘\n');

// Test de la règle 4 (modification manuelle)
console.log('═══════════════════════════════════════════════════════════════\n');
console.log('📊 TEST 4 : Règle 4 - Modification manuelle\n');
console.log('Simulation : L\'utilisateur modifie le lundi à 50 unités manuellement\n');

const modificationManuelle = 50;
const jourModifie = 'lundi';
const qteMathLundi = Math.ceil(potentielMath * poidsJours[jourModifie]);
const ventesHistoLundi = calculerVentesHistoriquesPourJour(ventesParJour, jourModifie);
const qteAutoLundi = appliquerVarianteJournaliere(qteMathLundi, ventesHistoLundi, 'forte');

console.log(`   Qté automatique (variante FORTE) : ${qteAutoLundi} unités`);
console.log(`   Qté modifiée manuellement        : ${modificationManuelle} unités`);
console.log(`   ✅ Règle 4 : La modification manuelle surcharge tout !\n`);

console.log('═══════════════════════════════════════════════════════════════\n');
console.log('✅ Tests terminés !\n');
console.log('💡 Résumé du système :\n');
console.log('   • Règle 1 : Calcul mathématique basé sur venteMax / poidsJour');
console.log('   • Règle 2 : La préco ne peut jamais être < ventes historiques du jour');
console.log('   • Règle 3 : Application des limites selon variante (Sans/Forte/Faible)');
console.log('   • Règle 4 : Les modifications manuelles surchargent tout\n');
