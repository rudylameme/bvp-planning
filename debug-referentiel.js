// Script de debug pour vérifier le référentiel ITM8
import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';

const filePath = './Data/liste des produits BVP treville.xlsx';

try {
  console.log('📚 Lecture du référentiel...\n');

  const buffer = readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  console.log(`📊 ${data.length} lignes trouvées\n`);

  // Afficher les colonnes
  if (data.length > 0) {
    console.log('🔍 COLONNES DÉTECTÉES:');
    Object.keys(data[0]).forEach(col => console.log(`   - "${col}"`));
    console.log('\n');
  }

  // Afficher les 5 premiers produits
  console.log('🔍 5 PREMIERS PRODUITS:\n');
  data.slice(0, 5).forEach((row, index) => {
    console.log(`Produit ${index + 1}: "${row['Libellé produit']}"`);
    console.log(`   ITM8: ${row['ITM8']}`);
    console.log(`   RAYON: ${row['RAYON']}`);
    console.log(`   Programme: ${row['Programme de cuisson']}`);

    // Chercher colonnes unités
    const unitLotKey = Object.keys(row).find(k =>
      k.toLowerCase().includes('unit') && k.toLowerCase().includes('lot')
    );
    const unitPlaqueKey = Object.keys(row).find(k =>
      k.toLowerCase().includes('unit') && k.toLowerCase().includes('plaque')
    );

    console.log(`   unit/lot (colonne: "${unitLotKey}"): ${row[unitLotKey]}`);
    console.log(`   unit/plaque (colonne: "${unitPlaqueKey}"): ${row[unitPlaqueKey]}`);
    console.log('');
  });

} catch (error) {
  console.error('❌ Erreur:', error.message);
}
