// Mots-clés pour la classification automatique
const motsCleBoulangerie = ['pain', 'baguette', 'bag', 'constance', 'mie', 'campagne', 'céréales', 'complet', 'tradition', 'ficelle'];
const motsCleViennoiserie = ['croissant', 'chocolat', 'chausson', 'brioche', 'pain raisin', 'pain au', 'pain choc', 'viennois', 'suisse'];
const motsClePatisserie = ['tarte', 'éclair', 'millefeuille', 'gâteau', 'cake', 'flan', 'paris-brest', 'religieuse', 'chou', 'macaron'];

/**
 * Classification automatique d'un produit selon son libellé
 */
export const classerProduit = (libelle) => {
  const libelleLower = libelle.toLowerCase();

  if (motsCleBoulangerie.some(mot => libelleLower.includes(mot))) return 'BOULANGERIE';
  if (motsCleViennoiserie.some(mot => libelleLower.includes(mot))) return 'VIENNOISERIE';
  if (motsClePatisserie.some(mot => libelleLower.includes(mot))) return 'PATISSERIE';

  return 'AUTRE';
};
