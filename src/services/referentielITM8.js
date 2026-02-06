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
 *   ean13: string (code EAN13, peut contenir plusieurs codes séparés par ";"),
 *   libelle: string,
 *   rayon: string,
 *   programme: string,
 *   famille: string,
 *   sousFamille: string,
 *   poids: number,
 *   unitesParVente: number (nombre d'unités dans 1 vente, ex: Constance x3+1 = 4),
 *   unitesParPlaque: number (nombre d'unités dans 1 plaque de cuisson),
 *   codePLU: string (code PLU pour les étiquettes)
 * }
 */

/**
 * Charge le référentiel ITM8 depuis le fichier Excel
 */
export const chargerReferentielITM8 = async (filePath) => {
  try {
    console.log('📚 Chargement du référentiel ITM8...');

    // Ajouter un timestamp pour éviter le cache du navigateur
    const timestamp = new Date().getTime();
    const response = await fetch(`${filePath}?t=${timestamp}`);
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📊 ${data.length} produits chargés depuis le référentiel`);

    // DEBUG: Afficher les noms de colonnes du premier produit
    if (data.length > 0) {
      console.log('🔍 Colonnes détectées dans le référentiel:', Object.keys(data[0]));
    }

    // Fonction pour trouver une colonne par recherche floue
    const trouverColonne = (row, motsCles) => {
      const keys = Object.keys(row);
      for (const key of keys) {
        // Normaliser: minuscules, sans espaces, sans apostrophes
        const keyNormalized = key.toLowerCase()
          .replace(/\s+/g, '')
          .replace(/['\']/g, '');

        for (const motCle of motsCles) {
          const motCleNormalized = motCle.toLowerCase()
            .replace(/\s+/g, '')
            .replace(/['\']/g, '');

          if (keyNormalized.includes(motCleNormalized)) {
            return row[key];
          }
        }
      }
      return null;
    };

    // Créer le map ITM8 -> Infos produit
    const itm8Map = new Map();
    const rayonsSet = new Set();
    const programmesSet = new Set();

    data.forEach((row, index) => {
      const itm8 = row['ITM8'];
      const rayon = (row['RAYON'] || '').trim();
      const programme = (row['Programme de cuisson'] || '').trim();

      // unit/lot = nombre d'unités dans 1 vente (ex: Constance x3+1 = 4 unités)
      // Chercher avec plusieurs variantes
      const unitesParVenteRaw = trouverColonne(row, ['unit/lot', 'unit / lot', 'unitlot', 'unit par lot']);
      const unitesParVente = Number(unitesParVenteRaw) || 1;

      // Nombre d'unités par plaque de cuisson
      // Chercher DIRECTEMENT par le nom exact de la colonne
      const unitesParPlaqueRaw = row["Nombre d'unit par plaque"];
      const unitesParPlaque = Number(unitesParPlaqueRaw) || 0;

      // Code PLU pour les étiquettes
      const codePLU = (row['Code PLU'] || row['PLU'] || '').toString().trim();

      // Code EAN13 (peut contenir plusieurs codes séparés par ";")
      const ean13Raw = (row['EAN13'] || '').toString().trim();

      // DEBUG: Afficher les 3 premiers produits avec leurs valeurs
      if (index < 3) {
        console.log(`🔍 Produit ${index + 1}: "${row['Libellé produit']}"`);
        console.log(`   - unit / lot (raw): "${unitesParVenteRaw}" → ${unitesParVente}`);
        console.log(`   - Nombre d'unit par plaque (raw): "${unitesParPlaqueRaw}" → ${unitesParPlaque}`);
        console.log(`   - Code PLU: "${codePLU}"`);
        console.log(`   - EAN13: "${ean13Raw}"`);

        // DEBUG SUPPLÉMENTAIRE: afficher TOUTES les colonnes pour le produit 1
        if (index === 0) {
          console.log(`   📋 TOUTES LES COLONNES du produit 1:`);
          Object.keys(row).forEach(key => {
            console.log(`      - "${key}" = "${row[key]}"`);
          });
        }
      }

      if (itm8 && rayon && programme) {
        itm8Map.set(itm8, {
          itm8,
          ean13: ean13Raw,
          libelle: row['Libellé produit'] || '',
          rayon,
          programme,
          famille: row['Libellé Fam'] || '',
          sousFamille: row['Libellé SFam'] || '',
          poids: row['Poids (produit fini)'] || 0,
          unitesParVente: Number(unitesParVente) || 1,
          unitesParPlaque: Number(unitesParPlaque) || 0,
          codePLU: codePLU
        });

        rayonsSet.add(rayon);
        programmesSet.add(programme);
      }
    });

    // Créer un index par libellé normalisé pour la recherche par nom
    const libelleMap = new Map();
    itm8Map.forEach((info) => {
      const libelleNorm = info.libelle.toLowerCase().trim();
      if (libelleNorm && !libelleMap.has(libelleNorm)) {
        libelleMap.set(libelleNorm, info);
      }
    });

    // Créer un index par EAN13 pour la recherche par code EAN
    const eanMap = new Map();
    itm8Map.forEach((info) => {
      if (info.ean13) {
        // Gérer les EAN multiples séparés par ";"
        const eanCodes = info.ean13.split(';').map(e => e.trim()).filter(e => e);
        eanCodes.forEach(ean => {
          eanMap.set(ean, info);
        });
      }
    });

    referentielCache = {
      itm8Map,
      libelleMap,
      eanMap,
      rayons: Array.from(rayonsSet).sort(),
      programmes: Array.from(programmesSet).sort()
    };

    console.log('✅ Référentiel chargé avec succès');
    console.log(`   - ${itm8Map.size} ITM8 uniques`);
    console.log(`   - ${eanMap.size} EAN13 indexés`);
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
 * Recherche un produit par son code EAN13
 * @param {string|number} ean - Code EAN13
 * @returns {ProductInfo|null}
 */
export const rechercherParEAN = (ean) => {
  if (!referentielCache || !referentielCache.eanMap) return null;
  const eanNorm = (ean || '').toString().trim();
  return referentielCache.eanMap.get(eanNorm) || null;
};

/**
 * Recherche un produit par son libellé (correspondance exacte normalisée)
 * @param {string} libelle - Libellé du produit
 * @returns {ProductInfo|null}
 */
export const rechercherParLibelle = (libelle) => {
  if (!referentielCache || !referentielCache.libelleMap) return null;
  const libelleNorm = (libelle || '').toLowerCase().trim();
  return referentielCache.libelleMap.get(libelleNorm) || null;
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
  if (rayonNormalized.includes('SNACK')) {
    return 'SNACKING';
  }

  // Par défaut
  return 'AUTRE';
};

/**
 * ========================================
 * GESTION DES PROGRAMMES PERSONNALISÉS
 * ========================================
 */

const STORAGE_KEY_PROGRAMMES = 'bvp_programmes_personnalises';

/**
 * Charger les programmes personnalisés depuis localStorage
 * @returns {Object} { renommages: Map<string, string>, custom: string[] }
 */
export const chargerProgrammesPersonnalises = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PROGRAMMES);
    if (saved) {
      const data = JSON.parse(saved);
      return {
        renommages: new Map(Object.entries(data.renommages || {})),
        custom: data.custom || []
      };
    }
  } catch (error) {
    console.error('Erreur chargement programmes personnalisés:', error);
  }
  return { renommages: new Map(), custom: [] };
};

/**
 * Sauvegarder les programmes personnalisés dans localStorage
 */
export const sauvegarderProgrammesPersonnalises = (renommages, custom) => {
  try {
    const data = {
      renommages: Object.fromEntries(renommages),
      custom: custom
    };
    localStorage.setItem(STORAGE_KEY_PROGRAMMES, JSON.stringify(data));
  } catch (error) {
    console.error('Erreur sauvegarde programmes personnalisés:', error);
  }
};

/**
 * Renommer un programme existant
 */
export const renommerProgramme = (programmeOriginal, nouveauNom) => {
  const { renommages, custom } = chargerProgrammesPersonnalises();
  renommages.set(programmeOriginal, nouveauNom);
  sauvegarderProgrammesPersonnalises(renommages, custom);
};

/**
 * Ajouter un programme personnalisé
 */
export const ajouterProgrammeCustom = (nomProgramme) => {
  const { renommages, custom } = chargerProgrammesPersonnalises();
  if (!custom.includes(nomProgramme)) {
    custom.push(nomProgramme);
    sauvegarderProgrammesPersonnalises(renommages, custom);
  }
};

/**
 * Supprimer un programme personnalisé
 */
export const supprimerProgrammeCustom = (nomProgramme) => {
  const { renommages, custom } = chargerProgrammesPersonnalises();
  const index = custom.indexOf(nomProgramme);
  if (index > -1) {
    custom.splice(index, 1);
    sauvegarderProgrammesPersonnalises(renommages, custom);
  }
};

/**
 * Obtenir le nom affiché d'un programme (prend en compte les renommages)
 */
export const getNomProgrammeAffiche = (programmeOriginal) => {
  const { renommages } = chargerProgrammesPersonnalises();
  return renommages.get(programmeOriginal) || programmeOriginal;
};

/**
 * Réinitialiser tous les programmes personnalisés (renommages et custom)
 * À appeler lors du "Recommencer" pour revenir aux paramètres par défaut
 */
export const reinitialiserProgrammes = () => {
  localStorage.removeItem(STORAGE_KEY_PROGRAMMES);
};

/**
 * Obtenir la liste complète des programmes (référentiel + custom)
 * Retourne les identifiants originaux (pas les noms affichés)
 */
export const getListeProgrammesComplets = () => {
  const programmesRef = getListeProgrammes(); // Programmes du référentiel
  const { custom } = chargerProgrammesPersonnalises();

  // Retourner les identifiants originaux + custom
  return [...programmesRef, ...custom].sort();
};
