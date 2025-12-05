/**
 * Service de classification automatique des produits V2
 */

/**
 * Détecte automatiquement le rayon d'un produit à partir de son libellé
 * @param {string} libelle - Libellé du produit
 * @returns {string} Rayon détecté
 */
export function detecterRayon(libelle) {
  const lib = (libelle || '').toUpperCase();

  // VIENNOISERIE
  const motsViennoiserie = [
    'CROISSANT', 'PAIN CHOCOLAT', 'PAIN AU CHOCOLAT', 'CHOCOLATINE',
    'PAIN RAISIN', 'CHAUSSON', 'BRIOCHE', 'TRESSE', 'KOUIGN',
    'PALMIER', 'CINNAMON', 'ROLL', 'CHOUQUETTE', 'SACRISTAIN',
    'ORANAIS', 'POMME', 'ABRICOT'
  ];
  if (motsViennoiserie.some(mot => lib.includes(mot))) {
    return 'VIENNOISERIE';
  }

  // PATISSERIE
  const motsPatisserie = [
    'TARTE', 'ECLAIR', 'RELIGIEUSE', 'PARIS BREST', 'MILLE',
    'FLAN', 'GATEAU', 'CAKE', 'MOUSSE', 'TIRAMISU', 'MACARON',
    'FINANCIER', 'MADELEINE', 'COOKIE', 'BROWNIE', 'OPERA',
    'FRAISIER', 'FRAMBOISIER', 'FORET NOIRE', 'TROPEZIENNE'
  ];
  if (motsPatisserie.some(mot => lib.includes(mot))) {
    return 'PATISSERIE';
  }

  // SNACKING
  const motsSnacking = [
    'SANDWICH', 'PIZZA', 'QUICHE', 'CROQUE', 'WRAP', 'SALADE',
    'PANINI', 'FOCACCIA', 'FEUILLETE', 'FRIAND', 'HOT DOG',
    'BURGER', 'CLUB', 'BAGEL'
  ];
  if (motsSnacking.some(mot => lib.includes(mot))) {
    return 'SNACKING';
  }

  // Par défaut : BOULANGERIE
  return 'BOULANGERIE';
}

/**
 * Détecte le temps de plaquage (court ou long)
 * @param {string} libelle - Libellé du produit
 * @returns {string} 'court' ou 'long'
 */
export function detecterTempsPlaquage(libelle) {
  const lib = (libelle || '').toUpperCase();

  // Produits à plaquage LONG (30-45 min)
  const motsLong = [
    'CROISSANT', 'PAIN CHOCOLAT', 'PAIN AU CHOCOLAT', 'CHOCOLATINE',
    'PAIN RAISIN', 'BRIOCHE', 'TRESSE', 'KOUIGN',
    'SPECIAL', 'CAMPAGNE', 'CEREALES', 'NOIX', 'OLIVE', 'FOUGASSE',
    'PAVÉ', 'TOURTE', 'BOULE', 'CIABATTA', 'FOCACCIA'
  ];

  if (motsLong.some(mot => lib.includes(mot))) {
    return 'long';
  }

  // Par défaut : court (baguettes, pains simples)
  return 'court';
}

/**
 * Détecte le nombre d'unités par plaque (estimation)
 * @param {string} libelle - Libellé du produit
 * @returns {number} Nombre d'unités par plaque
 */
export function detecterUnitesParPlaque(libelle) {
  const lib = (libelle || '').toUpperCase();

  if (lib.includes('CROISSANT')) return 16;
  if (lib.includes('PAIN CHOCOLAT') || lib.includes('CHOCOLATINE')) return 12;
  if (lib.includes('PAIN RAISIN')) return 12;
  if (lib.includes('BAGUETTE')) return 6;
  if (lib.includes('BRIOCHE')) return 8;
  if (lib.includes('CHAUSSON')) return 12;
  if (lib.includes('PALMIER')) return 20;
  if (lib.includes('CHOUQUETTE')) return 40;
  if (lib.includes('BOULE')) return 4;
  if (lib.includes('PAVÉ')) return 6;
  if (lib.includes('TOURTE')) return 2;

  // Défaut
  return 12;
}

/**
 * Détecte si le produit nécessite une cuisson
 * @param {string} libelle - Libellé du produit
 * @returns {boolean} true si cuisson nécessaire
 */
export function detecterNecessiteCuisson(libelle) {
  const lib = (libelle || '').toUpperCase();

  // Produits pré-cuits ou vendus froids
  const sansPlaquage = [
    'FLAN', 'MACARON', 'COOKIE', 'BROWNIE', 'TIRAMISU',
    'MOUSSE', 'OPERA', 'FRAISIER', 'ECLAIR', 'RELIGIEUSE',
    'PARIS BREST', 'MILLE'
  ];

  if (sansPlaquage.some(mot => lib.includes(mot))) {
    return false;
  }

  return true;
}

/**
 * Détecte le programme de cuisson par défaut
 * @param {string} libelle - Libellé du produit
 * @returns {string} Nom du programme suggéré
 */
export function detecterProgramme(libelle) {
  const lib = (libelle || '').toUpperCase();

  if (lib.includes('CROISSANT') || lib.includes('PAIN CHOCOLAT') || lib.includes('CHOCOLATINE')) {
    return 'VIENNOISERIE_FEUILLE';
  }
  if (lib.includes('BRIOCHE') || lib.includes('TRESSE')) {
    return 'BRIOCHE';
  }
  if (lib.includes('BAGUETTE')) {
    return 'BAGUETTE';
  }
  if (lib.includes('SPECIAL') || lib.includes('CAMPAGNE') || lib.includes('CEREALES')) {
    return 'PAIN_SPECIAL';
  }
  if (lib.includes('PIZZA') || lib.includes('QUICHE') || lib.includes('FEUILLETE')) {
    return 'SNACKING';
  }

  return 'STANDARD';
}

/**
 * Classifie automatiquement un produit
 * @param {string} libelle - Libellé du produit
 * @returns {Object} Classification complète
 */
export function classifierProduit(libelle) {
  return {
    rayon: detecterRayon(libelle),
    tempsPlaquage: detecterTempsPlaquage(libelle),
    unitesParPlaque: detecterUnitesParPlaque(libelle),
    necessiteCuisson: detecterNecessiteCuisson(libelle),
    programme: detecterProgramme(libelle)
  };
}
