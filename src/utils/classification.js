import { rechercherParITM8 } from '../services/productReference';

// Mots-clés pour la classification automatique (fallback)
const motsCleBoulangerie = ['pain', 'baguette', 'bag', 'constance', 'mie', 'campagne', 'céréales', 'complet', 'tradition', 'ficelle'];
const motsCleViennoiserie = ['croissant', 'chocolat', 'chausson', 'brioche', 'pain raisin', 'pain au', 'pain choc', 'viennois', 'suisse'];
const motsClePatisserie = ['tarte', 'éclair', 'millefeuille', 'gâteau', 'cake', 'flan', 'paris-brest', 'religieuse', 'chou', 'macaron', 'pâtisserie'];
const motsCleSnacking = ['sandwich', 'wrap', 'panini', 'burger', 'salade', 'snack', 'pizza'];

/**
 * Normalisation des rayons du référentiel vers les familles de l'application
 */
const mapRayonToFamille = (rayon) => {
  const rayonUpper = rayon?.toUpperCase().trim() || '';

  if (rayonUpper.includes('BOULANGERIE')) return 'BOULANGERIE';
  if (rayonUpper.includes('VIENNOISERIE')) return 'VIENNOISERIE';
  if (rayonUpper.includes('PATISSERIE') || rayonUpper.includes('PÂTISSERIE')) return 'PATISSERIE';
  if (rayonUpper.includes('SNACKING')) return 'SNACKING';

  return 'AUTRE';
};

/**
 * Classification par mots-clés (fallback)
 */
const classerParMotsCles = (libelle) => {
  const libelleLower = libelle.toLowerCase();

  if (motsCleBoulangerie.some(mot => libelleLower.includes(mot))) return 'BOULANGERIE';
  if (motsCleViennoiserie.some(mot => libelleLower.includes(mot))) return 'VIENNOISERIE';
  if (motsClePatisserie.some(mot => libelleLower.includes(mot))) return 'PATISSERIE';
  if (motsCleSnacking.some(mot => libelleLower.includes(mot))) return 'SNACKING';

  return 'AUTRE';
};

/**
 * Classification enrichie d'un produit
 * Priorité 1: ITM8 dans le référentiel
 * Priorité 2: Mots-clés dans le libellé
 *
 * @param {string} libelle - Libellé du produit
 * @param {number|null} itm8 - Code ITM8 du produit (optionnel)
 * @returns {object} Informations de classification
 */
export const classerProduit = (libelle, itm8 = null) => {
  let famille = 'AUTRE';
  let programmeCuisson = '';
  let methodeClassification = 'mots-cles';
  let infosReference = null;

  // Priorité 1: Recherche par ITM8
  if (itm8) {
    const produitRef = rechercherParITM8(itm8);
    if (produitRef) {
      famille = mapRayonToFamille(produitRef.rayon);
      programmeCuisson = produitRef.programmeCuisson || '';
      methodeClassification = 'itm8';
      infosReference = {
        rayon: produitRef.rayon,
        programmeCuisson: produitRef.programmeCuisson,
        poids: produitRef.poids,
        famille: produitRef.famille,
        sousFamille: produitRef.sousFamille,
        segment: produitRef.segment
      };
    }
  }

  // Priorité 2: Classification par mots-clés (si ITM8 non trouvé)
  if (methodeClassification === 'mots-cles') {
    famille = classerParMotsCles(libelle);
  }

  return {
    famille,
    programmeCuisson,
    methodeClassification,
    infosReference
  };
};

/**
 * Retourne uniquement la famille (pour compatibilité avec l'ancien code)
 */
export const classerProduitSimple = (libelle, itm8 = null) => {
  const result = classerProduit(libelle, itm8);
  return result.famille;
};
