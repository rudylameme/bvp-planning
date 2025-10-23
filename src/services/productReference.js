import XLSX from 'xlsx';

/**
 * Service de chargement et gestion du référentiel produits
 */

let produitsReference = new Map(); // Map<ITM8, infoProduit>

/**
 * Charge le fichier Excel de référence des produits
 */
export const chargerReferentielProduits = async (filePath = './Data/liste des produits BVP treville.xlsx') => {
  try {
    const response = await fetch(filePath);
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    produitsReference.clear();

    for (const row of data) {
      const itm8 = row['ITM8'];
      if (itm8) {
        produitsReference.set(itm8, {
          itm8,
          libelle: row['Libellé produit'] || '',
          rayon: row['RAYON']?.trim() || 'AUTRE',
          programmeCuisson: row['Programme de cuisson'] || '',
          poids: row['Poids (produit fini)'] || 0,
          famille: row['Libellé Fam'] || '',
          sousFamille: row['Libellé SFam'] || '',
          segment: row['Libellé Seg'] || ''
        });
      }
    }

    console.log(`✅ Référentiel produits chargé : ${produitsReference.size} produits`);
    return true;
  } catch (error) {
    console.error('❌ Erreur lors du chargement du référentiel:', error);
    return false;
  }
};

/**
 * Recherche un produit par son code ITM8
 */
export const rechercherParITM8 = (itm8) => {
  return produitsReference.get(itm8) || null;
};

/**
 * Obtenir tous les produits du référentiel
 */
export const getTousLesProduits = () => {
  return Array.from(produitsReference.values());
};

/**
 * Obtenir les statistiques du référentiel
 */
export const getStatsReferentiel = () => {
  const rayons = new Map();
  const programmes = new Map();

  for (const produit of produitsReference.values()) {
    // Comptage par rayon
    const rayon = produit.rayon;
    rayons.set(rayon, (rayons.get(rayon) || 0) + 1);

    // Comptage par programme
    const prog = produit.programmeCuisson;
    if (prog) {
      programmes.set(prog, (programmes.get(prog) || 0) + 1);
    }
  }

  return {
    total: produitsReference.size,
    rayons: Object.fromEntries(rayons),
    programmes: Object.fromEntries(programmes)
  };
};
