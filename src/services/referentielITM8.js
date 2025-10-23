import * as XLSX from 'xlsx';

/**
 * Service de gestion du référentiel ITM8
 * Charge le fichier de référence et permet la recherche par ITM8
 */

let referentielCache = null;

/**
 * Structure du référentiel:
 * {
 *   itm8Map: Map<number, ProductInfo>,
 *   rayons: string[],
 *   programmes: string[]
 * }
 *
 * ProductInfo: {
 *   itm8: number,
 *   libelle: string,
 *   rayon: string,
 *   programme: string,
 *   famille: string,
 *   sousFamille: string,
 *   poids: number
 * }
 */

/**
 * Charge le référentiel ITM8 depuis le fichier Excel
 */
export const chargerReferentielITM8 = async (filePath) => {
  try {
    console.log('📚 Chargement du référentiel ITM8...');

    const response = await fetch(filePath);
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📊 ${data.length} produits chargés depuis le référentiel`);

    // Créer le map ITM8 -> Infos produit
    const itm8Map = new Map();
    const rayonsSet = new Set();
    const programmesSet = new Set();

    data.forEach(row => {
      const itm8 = row['ITM8'];
      const rayon = (row['RAYON'] || '').trim();
      const programme = (row['Programme de cuisson'] || '').trim();

      if (itm8 && rayon && programme) {
        itm8Map.set(itm8, {
          itm8,
          libelle: row['Libellé produit'] || '',
          rayon,
          programme,
          famille: row['Libellé Fam'] || '',
          sousFamille: row['Libellé SFam'] || '',
          poids: row['Poids (produit fini)'] || 0
        });

        rayonsSet.add(rayon);
        programmesSet.add(programme);
      }
    });

    referentielCache = {
      itm8Map,
      rayons: Array.from(rayonsSet).sort(),
      programmes: Array.from(programmesSet).sort()
    };

    console.log('✅ Référentiel chargé avec succès');
    console.log(`   - ${itm8Map.size} ITM8 uniques`);
    console.log(`   - ${rayonsSet.size} rayons: ${Array.from(rayonsSet).join(', ')}`);
    console.log(`   - ${programmesSet.size} programmes: ${Array.from(programmesSet).join(', ')}`);

    return referentielCache;
  } catch (error) {
    console.error('❌ Erreur lors du chargement du référentiel:', error);
    return null;
  }
};

/**
 * Recherche un produit par son ITM8
 * @param {number} itm8 - Code ITM8
 * @returns {ProductInfo|null}
 */
export const rechercherParITM8 = (itm8) => {
  if (!referentielCache) {
    console.warn('⚠️ Référentiel non chargé');
    return null;
  }

  return referentielCache.itm8Map.get(itm8) || null;
};

/**
 * Obtenir la liste des rayons disponibles
 */
export const getListeRayons = () => {
  if (!referentielCache) return [];
  return referentielCache.rayons;
};

/**
 * Obtenir la liste des programmes de cuisson disponibles
 */
export const getListeProgrammes = () => {
  if (!referentielCache) return [];
  return referentielCache.programmes;
};

/**
 * Vérifier si le référentiel est chargé
 */
export const isReferentielCharge = () => {
  return referentielCache !== null;
};

/**
 * Mapper le rayon vers l'ancienne famille (BOULANGERIE, VIENNOISERIE, PATISSERIE)
 */
export const mapRayonVersFamille = (rayon) => {
  const rayonNormalized = rayon.toUpperCase().trim();

  // Mapping rayon -> famille
  if (rayonNormalized.includes('BOULANGERIE')) {
    return 'BOULANGERIE';
  }
  if (rayonNormalized.includes('VIENNOISERIE')) {
    return 'VIENNOISERIE';
  }
  if (rayonNormalized.includes('PATISSERIE') || rayonNormalized.includes('PÂTISSERIE')) {
    return 'PATISSERIE';
  }

  // Par défaut
  return 'AUTRE';
};
