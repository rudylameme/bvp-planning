import XLSX from 'xlsx';
import fs from 'fs';

// Lire le fichier Excel
const filePath = './Data/liste des produits BVP treville.xlsx';
const workbook = XLSX.readFile(filePath);

// Obtenir la première feuille
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convertir en JSON
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('=== ANALYSE DU FICHIER EXCEL ===\n');
console.log(`Nombre total de lignes: ${data.length}\n`);

// Afficher les 5 premières lignes pour comprendre la structure
console.log('=== 5 PREMIÈRES LIGNES ===');
console.log(JSON.stringify(data.slice(0, 5), null, 2));

// Afficher les noms des colonnes
if (data.length > 0) {
  console.log('\n=== COLONNES DÉTECTÉES ===');
  Object.keys(data[0]).forEach((key, index) => {
    console.log(`Colonne ${String.fromCharCode(65 + index)} : "${key}"`);
  });
}

// Analyser les rayons uniques
const rayons = [...new Set(data.map(row => row['RAYON']).filter(Boolean))];
console.log('\n=== RAYONS UNIQUES ===');
rayons.forEach(rayon => console.log(`- ${rayon}`));

// Analyser les programmes de cuisson uniques
const programmes = [...new Set(data.map(row => row['Programme de cuisson']).filter(Boolean))];
console.log('\n=== PROGRAMMES DE CUISSON UNIQUES ===');
programmes.forEach(prog => console.log(`- ${prog}`));

// Sauvegarder un échantillon en JSON pour inspection
fs.writeFileSync('./Data/analyse-sample.json', JSON.stringify(data.slice(0, 20), null, 2));
console.log('\n✅ Échantillon sauvegardé dans ./Data/analyse-sample.json');
