/**
 * Service de gestion du catalogue de commande (modèles M1-M8)
 *
 * Charge le fichier JSON extrait du catalogue de commande BVP
 * et permet la recherche par ITM8 pour savoir dans quels modèles
 * un produit est préconisé.
 *
 * Modèles M1 (< 80K€) à M8 (> 1.1M€) = taille du PDV en CA BVP annuel.
 * Un produit avec modeleMin = "M3" signifie qu'il est préconisé pour tous
 * les PDV de taille M3 et supérieure.
 */

let catalogueCache = null;

/**
 * Charge le catalogue des modèles depuis le fichier JSON
 * @returns {Promise<Object|null>} Cache du catalogue ou null
 */
export const chargerCatalogueModeles = async () => {
  try {
    const timestamp = new Date().getTime();
    const response = await fetch(`/Data/catalogue-modeles.json?t=${timestamp}`);
    if (!response.ok) return null;

    const data = await response.json();

    // Construire les maps de lookup
    const itm8Map = new Map(); // ITM8 → info produit
    const ean13Map = new Map(); // EAN13 → info produit

    for (const produit of data) {
      const itm8 = String(produit.itm8).replace(/^0+/, '');
      const entry = {
        itm8,
        ean13: produit.ean13,
        libelle: produit.libelle,
        segment: produit.segment,
        modeles: produit.modeles,
        modeleMin: produit.modeleMin,
      };

      itm8Map.set(itm8, entry);
      if (produit.ean13) {
        ean13Map.set(produit.ean13, entry);
      }
    }

    catalogueCache = { itm8Map, ean13Map, loaded: true };
    return catalogueCache;
  } catch (error) {
    console.error('[catalogueModeles] Erreur chargement:', error);
    return null;
  }
};

/**
 * Recherche un produit dans le catalogue par ITM8
 * @param {string|number} itm8
 * @returns {Object|null} { modeles: { M1..M8, optionnel }, modeleMin, segment, libelle }
 */
export const rechercherModele = (itm8) => {
  if (!catalogueCache?.loaded || !itm8) return null;
  const key = String(itm8).replace(/^0+/, '');
  return catalogueCache.itm8Map.get(key) || null;
};

/**
 * Recherche un produit dans le catalogue par EAN13
 * @param {string} ean13
 * @returns {Object|null}
 */
export const rechercherModeleParEAN = (ean13) => {
  if (!catalogueCache?.loaded || !ean13) return null;
  return catalogueCache.ean13Map.get(ean13) || null;
};

/**
 * Vérifie si un produit est dans la gamme préconisée pour un modèle donné
 * @param {string|number} itm8
 * @param {string} modele - Ex: "M3", "M5"
 * @returns {boolean|null} true = préconisé, false = non préconisé, null = inconnu
 */
export const estDansModele = (itm8, modele) => {
  const info = rechercherModele(itm8);
  if (!info) return null;
  return info.modeles[modele] === 1;
};

/**
 * Vérifie si le catalogue est chargé
 * @returns {boolean}
 */
export const isCatalogueCharge = () => {
  return catalogueCache?.loaded === true;
};

/**
 * Obtenir les stats du catalogue
 * @returns {Object} { totalProduits, parModele: { M1: n, M2: n, ... } }
 */
export const getStatsCatalogue = () => {
  if (!catalogueCache?.loaded) return null;
  const stats = { totalProduits: catalogueCache.itm8Map.size, parModele: {} };
  for (const m of ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'optionnel']) {
    let count = 0;
    catalogueCache.itm8Map.forEach(entry => {
      if (entry.modeles[m] === 1) count++;
    });
    stats.parModele[m] = count;
  }
  return stats;
};
