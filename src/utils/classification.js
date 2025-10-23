// Mots-clés pour la classification automatique (fallback)
const motsCleBoulangerie = ['pain', 'baguette', 'bag', 'constance', 'mie', 'campagne', 'céréales', 'complet', 'tradition', 'ficelle'];
const motsCleViennoiserie = ['croissant', 'chocolat', 'chausson', 'brioche', 'pain raisin', 'pain au', 'pain choc', 'viennois', 'suisse'];
const motsClePatisserie = ['tarte', 'éclair', 'millefeuille', 'gâteau', 'cake', 'flan', 'paris-brest', 'religieuse', 'chou', 'macaron', 'pâtisserie'];
const motsCleSnacking = ['sandwich', 'wrap', 'panini', 'burger', 'salade', 'snack', 'pizza'];

/**
 * Classification par mots-clés
 * @param {string} libelle - Libellé du produit
 * @returns {string} Famille du produit (BOULANGERIE, VIENNOISERIE, PATISSERIE, SNACKING, AUTRE)
 */
export const classerProduit = (libelle) => {
  const libelleLower = libelle.toLowerCase();

  if (motsCleBoulangerie.some(mot => libelleLower.includes(mot))) return 'BOULANGERIE';
  if (motsCleViennoiserie.some(mot => libelleLower.includes(mot))) return 'VIENNOISERIE';
  if (motsClePatisserie.some(mot => libelleLower.includes(mot))) return 'PATISSERIE';
  if (motsCleSnacking.some(mot => libelleLower.includes(mot))) return 'SNACKING';

  return 'AUTRE';
};
