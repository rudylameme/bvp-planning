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
 *   codePLU: string (code PLU pour les étiquettes),
 *   marque: string (marque produit, ex: "P&C", "ARGRU", "DOTS")
 * }
 */

/**
 * Mapping famille V2 → rayon (le V2 n'a plus de colonne RAYON)
 */
const mapFamilleV2VersRayon = (libelleFamille) => {
  const f = (libelleFamille || '').toUpperCase();
  if (f.includes('PAIN')) return 'BOULANGERIE';
  if (f.includes('VIENNOISERIE')) return 'VIENNOISERIE';
  if (f.includes('PATISSERIE')) return 'PATISSERIE';
  if (f.includes('SNACKING') || f.includes('TRAITEUR')) return 'SNACKING';
  return 'AUTRE';
};

/**
 * Auto-détecte le format du référentiel (V1 ou V2)
 * V1 : colonne "ITM8" (sans espace)
 * V2 : colonne "ITM 8" (avec espace)
 */
const detecterFormatReferentiel = (headers) => {
  if (headers.some(h => h === 'ITM 8')) return 'V2';
  if (headers.some(h => h === 'ITM8')) return 'V1';
  // Fallback par recherche souple
  if (headers.some(h => String(h).trim() === 'ITM 8')) return 'V2';
  return 'V1';
};

/**
 * Charge le référentiel ITM8 depuis le fichier Excel (auto-détection V1/V2)
 */
export const chargerReferentielITM8 = async (filePath) => {
  try {
    // Ajouter un timestamp pour éviter le cache du navigateur
    const timestamp = new Date().getTime();
    const response = await fetch(`${filePath}?t=${timestamp}`);
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (!data.length) {
      return null;
    }

    // Auto-détecter le format
    const headers = Object.keys(data[0]);
    const format = detecterFormatReferentiel(headers);

    // Fonction pour trouver une colonne par recherche floue (V1 uniquement)
    const trouverColonne = (row, motsCles) => {
      const keys = Object.keys(row);
      for (const key of keys) {
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

    if (format === 'V2') {
      // ── FORMAT V2 (enrichi avec données V1 : programme, unités, poids) ──
      data.forEach((row) => {
        const itm8 = row['ITM 8'];
        const libelle = (row['LIBELLE CODE PLU'] || '').toString().trim();
        const famille = (row['LIBELLE FAMILLE'] || '').toString().trim();
        // Attention : trailing space possible sur LIBELLE SOUS FAMILLE
        const sousFamille = (row['LIBELLE SOUS FAMILLE'] || row['LIBELLE SOUS FAMILLE '] || '').toString().trim();
        const ean13Raw = (row['EAN PPV'] || '').toString().trim();
        const codePLU = (row['PLU'] || '').toString().trim();
        const marque = (row['MARQUE'] || '').toString().trim();
        const rayon = mapFamilleV2VersRayon(famille);

        // Colonnes V1 intégrées dans V2 (programme cuisson, conditionnement)
        const programme = (row['Programme de cuisson'] || '').toString().trim();
        const unitesParPlaqueRaw = row["Nombre d'unit par plaque"];
        const unitesParPlaque = Number(unitesParPlaqueRaw) || 0;
        const unitesParVenteRaw = trouverColonne(row, ['unit / lot', 'unit/lot', 'unitlot', 'unit par lot']);
        const unitesParVente = Number(unitesParVenteRaw) || 1;
        const poids = Number(row['Poids (produit fini)']) || 0;

        if (itm8 && libelle) {
          itm8Map.set(itm8, {
            itm8,
            ean13: ean13Raw,
            libelle,
            rayon,
            programme,
            famille,
            sousFamille,
            poids,
            unitesParVente,
            unitesParPlaque,
            codePLU,
            marque,
          });

          rayonsSet.add(rayon);
          if (programme) programmesSet.add(programme);
        }
      });
    } else {
      // ── FORMAT V1 (ancien treville) ──
      data.forEach((row) => {
        const itm8 = row['ITM8'];
        const rayon = (row['RAYON'] || '').trim();
        const programme = (row['Programme de cuisson'] || '').trim();

        const unitesParVenteRaw = trouverColonne(row, ['unit/lot', 'unit / lot', 'unitlot', 'unit par lot']);
        const unitesParVente = Number(unitesParVenteRaw) || 1;

        const unitesParPlaqueRaw = row["Nombre d'unit par plaque"];
        const unitesParPlaque = Number(unitesParPlaqueRaw) || 0;

        const codePLU = (row['Code PLU'] || row['PLU'] || '').toString().trim();
        const ean13Raw = (row['EAN13'] || '').toString().trim();

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
            codePLU,
            marque: '',
          });

          rayonsSet.add(rayon);
          programmesSet.add(programme);
        }
      });
    }

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

    return referentielCache;
  } catch (error) {
    // TODO: logger professionnel
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
 * Recherche un produit par libellé avec correspondance floue.
 * Gère les cas où le libellé ventes est tronqué (ex: "PAIN AUX CEREALES PAC 300"
 * vs référentiel "PAIN AUX CEREALES PAC 300G").
 * Exige au moins 15 caractères communs pour éviter les faux positifs.
 * @param {string} libelle - Libellé du produit (possiblement tronqué)
 * @returns {ProductInfo|null}
 */
export const rechercherParLibelleFuzzy = (libelle) => {
  if (!referentielCache || !referentielCache.libelleMap) return null;
  const libelleNorm = (libelle || '').toLowerCase().trim();
  if (libelleNorm.length < 15) return null;

  // Chercher un libellé du référentiel qui commence par le libellé ventes
  // ou dont le libellé ventes est un préfixe
  for (const [refLib, info] of referentielCache.libelleMap) {
    if (refLib.startsWith(libelleNorm) || libelleNorm.startsWith(refLib)) {
      return info;
    }
  }
  return null;
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
 * Obtenir le cache du référentiel (pour le nettoyage de gamme)
 */
export const getReferentielCache = () => {
  return referentielCache;
};

export { mapFamilleV2VersRayon };

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
    // TODO: logger professionnel
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
    // TODO: logger professionnel
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
