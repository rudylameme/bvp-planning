/**
 * Test : Que se passe-t-il si l'utilisateur réduit manuellement le potentiel ?
 */

import XLSX from 'xlsx';

const FREQUENTATION_FILE = './public/Data/Fréquentation test.xlsx';

console.log('🔍 === TEST MODIFICATION MANUELLE DU POTENTIEL ===\n');

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

console.log('📅 Historique des ventes :\n');
Object.entries(ventesParJour).forEach(([date, qte]) => {
  const jour = getJourSemaine(date);
  console.log(`   ${date} (${jour.padEnd(9)}) : ${qte} unités`);
});

console.log('\n═══════════════════════════════════════════════════════════════\n');

// SCÉNARIO 1 : Potentiel normal (Prudent = 317)
console.log('📊 SCÉNARIO 1 : Potentiel PRUDENT (317 unités)\n');

const potentielNormal = 317;
const joursOrdre = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

console.log('┌────────────┬───────────┬─────────────┬──────────────┬──────────┐');
console.log('│ Jour       │ Préco     │ Vente max   │ Préco finale │ Ajusté ? │');
console.log('├────────────┼───────────┼─────────────┼──────────────┼──────────┤');

joursOrdre.forEach(jour => {
  const poids = poidsJours[jour];
  let qteJour = Math.ceil(potentielNormal * poids);
  const venteMax = trouverVenteMaxPourJour(ventesParJour, jour);

  let qteFinale = qteJour;
  let ajuste = '-';
  if (venteMax > qteJour) {
    qteFinale = venteMax;
    ajuste = '✅ OUI';
  }

  console.log(`│ ${jour.padEnd(10)} │ ${qteJour.toString().padStart(9)} │ ${venteMax.toString().padStart(11)} │ ${qteFinale.toString().padStart(12)} │ ${ajuste.padEnd(8)} │`);
});

console.log('└────────────┴───────────┴─────────────┴──────────────┴──────────┘\n');

// SCÉNARIO 2 : Utilisateur réduit à 200
console.log('═══════════════════════════════════════════════════════════════\n');
console.log('📊 SCÉNARIO 2 : Utilisateur RÉDUIT à 200 unités\n');
console.log('⚠️  Attention : Potentiel très bas par rapport aux ventes historiques !\n');

const potentielReduit = 200;

console.log('┌────────────┬───────────┬─────────────┬──────────────┬──────────┐');
console.log('│ Jour       │ Préco     │ Vente max   │ Préco finale │ Ajusté ? │');
console.log('├────────────┼───────────┼─────────────┼──────────────┼──────────┤');

let totalPrecoInit = 0;
let totalPrecoFinale = 0;
let nbAjustements = 0;

joursOrdre.forEach(jour => {
  const poids = poidsJours[jour];
  let qteJour = Math.ceil(potentielReduit * poids);
  const venteMax = trouverVenteMaxPourJour(ventesParJour, jour);

  totalPrecoInit += qteJour;

  let qteFinale = qteJour;
  let ajuste = '-';
  if (venteMax > qteJour) {
    qteFinale = venteMax;
    ajuste = '✅ OUI';
    nbAjustements++;
  }

  totalPrecoFinale += qteFinale;

  console.log(`│ ${jour.padEnd(10)} │ ${qteJour.toString().padStart(9)} │ ${venteMax.toString().padStart(11)} │ ${qteFinale.toString().padStart(12)} │ ${ajuste.padEnd(8)} │`);
});

console.log('└────────────┴───────────┴─────────────┴──────────────┴──────────┘\n');

console.log(`📈 Résumé :`);
console.log(`   Potentiel saisi par l'utilisateur : ${potentielReduit} unités`);
console.log(`   Total préco initiale : ${totalPrecoInit} unités`);
console.log(`   Total préco finale : ${totalPrecoFinale} unités`);
console.log(`   Ajustements : ${nbAjustements} jours sur 7`);
console.log(`   Différence : +${totalPrecoFinale - totalPrecoInit} unités (+${((totalPrecoFinale - totalPrecoInit) / totalPrecoInit * 100).toFixed(1)}%)\n`);

console.log(`💡 Conclusion :`);
console.log(`   ✅ Le système protège contre les ruptures de stock`);
console.log(`   ✅ Même si l'utilisateur réduit trop, les ventes max sont respectées\n`);

console.log('═══════════════════════════════════════════════════════════════\n');
console.log('✅ Test terminé !\n');
