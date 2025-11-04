/**
 * Test pour vérifier la différence entre Qte Tot (colonnes M, S, Y)
 * et Qte Tot BVP (colonnes J, P, V)
 */

import XLSX from 'xlsx';

const FREQUENTATION_FILE = './public/Data/Fréquentation test.xlsx';

console.log('🔍 === COMPARAISON Qte Tot vs Qte Tot BVP ===\n');

// Charger le fichier
const workbook = XLSX.readFile(FREQUENTATION_FILE);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const allData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

const jourMap = {
  '1-lundi': 'lundi',
  '2-mardi': 'mardi',
  '3-mercredi': 'mercredi',
  '4-jeudi': 'jeudi',
  '5-vendredi': 'vendredi',
  '6-samedi': 'samedi',
  '7-dimanche': 'dimanche'
};

// Trouver la ligne d'en-tête
let headerRowIndex = -1;
for (let i = 0; i < Math.min(10, allData.length); i++) {
  const row = allData[i];
  if (row && row.some(cell => cell && cell.toString().includes('JOUR'))) {
    headerRowIndex = i;
    break;
  }
}

if (headerRowIndex === -1) headerRowIndex = 0;

// Initialisation pour Qte Tot (anciennes colonnes)
const qteTotParJourAncien = {};
let totalQteTotAncien = 0;

// Initialisation pour Qte Tot BVP (nouvelles colonnes)
const qteTotBVPParJour = {};
let totalQteTotBVP = 0;

Object.values(jourMap).forEach(jour => {
  qteTotParJourAncien[jour] = 0;
  qteTotBVPParJour[jour] = 0;
});

// Extraction des données
for (let i = headerRowIndex + 1; i < allData.length; i++) {
  const row = allData[i];
  if (!row || row.length < 26) continue;

  const jourCell = row[6];

  // Anciennes colonnes (Qte Tot)
  const qteTotS1 = parseFloat(row[12]) || 0;  // Colonne M

  // Nouvelles colonnes (Qte Tot BVP)
  const qteTotBVPS1 = parseFloat(row[9]) || 0; // Colonne J

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
    qteTotParJourAncien[jourKey] += qteTotS1;
    qteTotBVPParJour[jourKey] += qteTotBVPS1;
    totalQteTotAncien += qteTotS1;
    totalQteTotBVP += qteTotBVPS1;
  }
}

// Calcul des poids
const poidsJoursAncien = {};
const poidsJoursBVP = {};

Object.keys(qteTotParJourAncien).forEach(jour => {
  poidsJoursAncien[jour] = qteTotParJourAncien[jour] / totalQteTotAncien;
  poidsJoursBVP[jour] = qteTotBVPParJour[jour] / totalQteTotBVP;
});

console.log('📊 COMPARAISON DES DEUX MÉTHODES\n');
console.log('═══════════════════════════════════════════════════════════════\n');

const joursOrdre = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

console.log('┌──────────────┬──────────────────┬──────────────────┬────────────┐');
console.log('│ Jour         │ Qte Tot (M,S,Y)  │ Qte Tot BVP (J,P,V)│ Différence │');
console.log('├──────────────┼──────────────────┼──────────────────┼────────────┤');

joursOrdre.forEach(jour => {
  const poidsAncien = poidsJoursAncien[jour];
  const poidsBVP = poidsJoursBVP[jour];
  const diff = ((poidsBVP - poidsAncien) / poidsAncien * 100);

  const pctAncien = (poidsAncien * 100).toFixed(1);
  const pctBVP = (poidsBVP * 100).toFixed(1);
  const diffStr = (diff >= 0 ? '+' : '') + diff.toFixed(1) + '%';

  console.log(`│ ${jour.padEnd(12)} │ ${pctAncien.padStart(7)}%`.padEnd(19) + `│ ${pctBVP.padStart(7)}%`.padEnd(19) + `│ ${diffStr.padStart(10)} │`);
});

console.log('└──────────────┴──────────────────┴──────────────────┴────────────┘\n');

console.log(`📈 Total quantités :\n`);
console.log(`   Qte Tot (colonne M)     : ${totalQteTotAncien.toFixed(0)} unités`);
console.log(`   Qte Tot BVP (colonne J) : ${totalQteTotBVP.toFixed(0)} unités`);
console.log(`   Différence : ${((totalQteTotBVP - totalQteTotAncien) / totalQteTotAncien * 100).toFixed(1)}%\n`);

console.log('═══════════════════════════════════════════════════════════════\n');
console.log('✅ Comparaison terminée !\n');
