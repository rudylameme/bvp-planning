import * as XLSX from 'xlsx';

/**
 * Service de gestion des conditionnements (CDT)
 * Charge le fichier de référence et permet la recherche par ITM8
 * Le CDT représente le nombre d'unités par carton de commande
 */

let conditionnementCache = null;

/**
 * Structure du cache:
 * {
 *   itm8Map: Map<string, { itm8: string, libelle: string, libelleCommercial: string, cdt: number, ulv: number }>,
 *   loaded: boolean
 * }
 */

/**
 * Normalise un ITM8 (supprime les zéros au début)
 * @param {string|number} itm8 - Code ITM8
 * @returns {string} ITM8 normalisé
 */
export const normaliserITM8 = (itm8) => {
  if (!itm8) return '';
  return String(itm8).replace(/^0+/, '');
};

/**
 * Charge le référentiel des conditionnements depuis le fichier Excel
 * @param {string} filePath - Chemin vers le fichier Excel (par défaut: /Data/liste des conditionements.xlsx)
 * @returns {Promise<Object|null>} Cache des conditionnements ou null en cas d'erreur
 */
export const chargerConditionnements = async (filePath = '/Data/liste des conditionements.xlsx') => {
  try {
    console.log('📦 Chargement des conditionnements...');

    // Ajouter un timestamp pour éviter le cache du navigateur
    const timestamp = new Date().getTime();
    const response = await fetch(`${filePath}?t=${timestamp}`);

    if (!response.ok) {
      throw new Error(`Fichier non trouvé: ${filePath}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📊 ${data.length} produits chargés depuis le fichier conditionnements`);

    // DEBUG: Afficher les noms de colonnes
    if (data.length > 0) {
      console.log('🔍 Colonnes détectées:', Object.keys(data[0]));
    }

    // Fonction pour trouver une colonne par recherche floue
    const trouverColonne = (row, motsCles) => {
      const keys = Object.keys(row);
      for (const key of keys) {
        const keyLower = key.toLowerCase().trim();
        for (const motCle of motsCles) {
          if (keyLower.includes(motCle.toLowerCase())) {
            return row[key];
          }
        }
      }
      return null;
    };

    // Créer le map ITM8 -> Conditionnement
    const itm8Map = new Map();
    let produitsAvecCDT = 0;

    data.forEach((row, index) => {
      // Accès direct aux colonnes (noms exacts du fichier Excel)
      // Colonnes: ITM8, Libellé produit, Libellé commercial, CDT, ULV
      const itm8Raw = row['ITM8'] || row['itm8'] || trouverColonne(row, ['itm8', 'itm 8', 'code itm']);
      const libelle = row['Libellé produit'] || row['Libelle produit'] || trouverColonne(row, ['libellé', 'libelle', 'designation']);
      const libelleCommercial = row['Libellé commercial'] || row['Libelle commercial'] || trouverColonne(row, ['lib commercial']);
      const cdtRaw = row['CDT'] || row['cdt'] || trouverColonne(row, ['conditionnement', 'colisage', 'nb par carton']);
      const ulvRaw = row['ULV'] || row['ulv'];

      if (!itm8Raw) return;

      const itm8 = normaliserITM8(itm8Raw);
      const cdt = Number(cdtRaw) || 0;
      const ulv = typeof ulvRaw === 'number' ? ulvRaw : 1; // ULV peut être un texte

      // DEBUG: Afficher les premiers produits
      if (index < 3) {
        console.log(`🔍 Produit ${index + 1}: ITM8="${itm8}", CDT=${cdt}, Libellé="${libelle}"`);
      }

      if (itm8 && cdt > 0) {
        itm8Map.set(itm8, {
          itm8,
          libelle: String(libelle || '').trim(),
          libelleCommercial: String(libelleCommercial || '').trim(),
          cdt,
          ulv
        });
        produitsAvecCDT++;
      }
    });

    conditionnementCache = {
      itm8Map,
      loaded: true
    };

    console.log('✅ Conditionnements chargés avec succès');
    console.log(`   - ${itm8Map.size} ITM8 avec CDT valide`);
    console.log(`   - ${data.length - produitsAvecCDT} produits ignorés (CDT manquant ou invalide)`);

    return conditionnementCache;
  } catch (error) {
    console.error('❌ Erreur lors du chargement des conditionnements:', error);
    return null;
  }
};

/**
 * Recherche le conditionnement par ITM8
 * @param {string|number} itm8 - Code ITM8
 * @returns {Object|null} { itm8, libelle, libelleCommercial, cdt, ulv } ou null si non trouvé
 */
export const rechercherConditionnement = (itm8) => {
  if (!conditionnementCache || !conditionnementCache.loaded) {
    console.warn('⚠️ Conditionnements non chargés');
    return null;
  }

  const itm8Normalise = normaliserITM8(itm8);
  return conditionnementCache.itm8Map.get(itm8Normalise) || null;
};

/**
 * Obtenir le CDT (unités par carton) pour un produit
 * @param {string|number} itm8 - Code ITM8
 * @returns {number} CDT ou 0 si non trouvé
 */
export const getCDT = (itm8) => {
  const info = rechercherConditionnement(itm8);
  return info ? info.cdt : 0;
};

/**
 * Vérifier si les conditionnements sont chargés
 * @returns {boolean}
 */
export const isConditionnementCharge = () => {
  return conditionnementCache !== null && conditionnementCache.loaded;
};

/**
 * Obtenir le nombre de produits dans le référentiel
 * @returns {number}
 */
export const getNombreProduitsConditionnement = () => {
  if (!conditionnementCache || !conditionnementCache.loaded) return 0;
  return conditionnementCache.itm8Map.size;
};

/**
 * Calculer les besoins en cartons pour une liste de produits
 * @param {Array} produits - Liste de produits avec { itm8, quantiteNecessaire }
 * @returns {Array} Liste de produits avec besoins en cartons { ...produit, cdt, cartonsNecessaires, unitesSurplus }
 */
export const calculerBesoinsCartons = (produits) => {
  if (!conditionnementCache || !conditionnementCache.loaded) {
    console.warn('⚠️ Conditionnements non chargés');
    return produits.map(p => ({ ...p, cdt: 0, cartonsNecessaires: 0, unitesSurplus: 0 }));
  }

  return produits.map(produit => {
    const info = rechercherConditionnement(produit.itm8);
    const cdt = info ? info.cdt : 0;

    if (cdt <= 0) {
      return {
        ...produit,
        cdt: 0,
        cartonsNecessaires: 0,
        unitesSurplus: 0,
        cdtManquant: true
      };
    }

    const quantite = produit.quantiteNecessaire || 0;
    const cartonsNecessaires = Math.ceil(quantite / cdt);
    const unitesCommandees = cartonsNecessaires * cdt;
    const unitesSurplus = unitesCommandees - quantite;

    return {
      ...produit,
      cdt,
      cartonsNecessaires,
      unitesCommandees,
      unitesSurplus,
      cdtManquant: false
    };
  });
};

/**
 * Enrichir les produits avec leurs informations de conditionnement
 * @param {Array} produits - Liste de produits (avec itm8)
 * @returns {Array} Produits enrichis avec { ...produit, cdt, libelleCommercial }
 */
export const enrichirProduitsAvecCDT = (produits) => {
  if (!conditionnementCache || !conditionnementCache.loaded) {
    return produits.map(p => ({ ...p, cdt: 0 }));
  }

  return produits.map(produit => {
    const info = rechercherConditionnement(produit.itm8);
    return {
      ...produit,
      cdt: info ? info.cdt : 0,
      libelleCommercial: info ? info.libelleCommercial : ''
    };
  });
};

/**
 * Exporter les données de conditionnement pour le fichier .bvp.json
 * Retourne un objet simplifié pour chaque produit
 * @param {Array} produits - Liste de produits à exporter
 * @returns {Object} Map ITM8 -> CDT pour l'export
 */
export const exporterConditionnementsPourBVP = (produits) => {
  const result = {};

  produits.forEach(produit => {
    if (produit.itm8) {
      const info = rechercherConditionnement(produit.itm8);
      if (info && info.cdt > 0) {
        result[normaliserITM8(produit.itm8)] = info.cdt;
      }
    }
  });

  return result;
};
