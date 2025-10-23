/**
 * Fonctions de tri avancées pour les produits
 */

/**
 * Ordre de priorité des rayons
 */
const ordreRayons = {
  'BOULANGERIE': 1,
  'VIENNOISERIE': 2,
  'PATISSERIE': 3,
  'SNACKING': 4,
  'AUTRE': 5
};

/**
 * Ordre de priorité des programmes de cuisson
 */
const ordreProgrammes = {
  'Cuisson Baguette': 1,
  'Precuisson Baguette': 2,
  'Cuisson Spécieaux': 3,
  'Precuisson Spécieaux': 4,
  'Viennoiserie': 5,
  'Viennoiserie PAC': 6,
  'Feuilletage': 7,
  'Petit Flan': 8,
  'Sans cuisson': 9
};

/**
 * Tri par quantité décroissante, puis rayon, puis programme de cuisson
 */
export const trierParQuantiteRayonProgramme = (produits) => {
  return [...produits].sort((a, b) => {
    // 1. Tri par quantité décroissante (totalVentes)
    if (b.totalVentes !== a.totalVentes) {
      return b.totalVentes - a.totalVentes;
    }

    // 2. Tri par rayon (selon l'ordre défini)
    const ordreRayonA = ordreRayons[a.famille] || 999;
    const ordreRayonB = ordreRayons[b.famille] || 999;
    if (ordreRayonA !== ordreRayonB) {
      return ordreRayonA - ordreRayonB;
    }

    // 3. Tri par programme de cuisson (selon l'ordre défini)
    const programmeCuissonA = a.infosReference?.programmeCuisson || '';
    const programmeCuissonB = b.infosReference?.programmeCuisson || '';
    const ordreProgA = ordreProgrammes[programmeCuissonA] || 999;
    const ordreProgB = ordreProgrammes[programmeCuissonB] || 999;
    if (ordreProgA !== ordreProgB) {
      return ordreProgA - ordreProgB;
    }

    // 4. En dernier recours, tri alphabétique
    return a.libellePersonnalise.localeCompare(b.libellePersonnalise);
  });
};

/**
 * Tri par nom alphabétique
 */
export const trierParNom = (produits) => {
  return [...produits].sort((a, b) =>
    a.libellePersonnalise.localeCompare(b.libellePersonnalise)
  );
};

/**
 * Tri par volume décroissant (ancien comportement)
 */
export const trierParVolume = (produits) => {
  return [...produits].sort((a, b) => b.totalVentes - a.totalVentes);
};

/**
 * Tri par rayon puis nom
 */
export const trierParRayonNom = (produits) => {
  return [...produits].sort((a, b) => {
    const ordreRayonA = ordreRayons[a.famille] || 999;
    const ordreRayonB = ordreRayons[b.famille] || 999;
    if (ordreRayonA !== ordreRayonB) {
      return ordreRayonA - ordreRayonB;
    }
    return a.libellePersonnalise.localeCompare(b.libellePersonnalise);
  });
};

/**
 * Grouper les produits par rayon
 */
export const grouperParRayon = (produits) => {
  const groupes = {
    'BOULANGERIE': [],
    'VIENNOISERIE': [],
    'PATISSERIE': [],
    'SNACKING': [],
    'AUTRE': []
  };

  for (const produit of produits) {
    const famille = produit.famille || 'AUTRE';
    if (groupes[famille]) {
      groupes[famille].push(produit);
    } else {
      groupes['AUTRE'].push(produit);
    }
  }

  return groupes;
};

/**
 * Obtenir des statistiques par rayon
 */
export const statsParRayon = (produits) => {
  const stats = {};

  for (const produit of produits) {
    const famille = produit.famille || 'AUTRE';
    if (!stats[famille]) {
      stats[famille] = {
        count: 0,
        totalVentes: 0,
        produitsActifs: 0
      };
    }
    stats[famille].count++;
    stats[famille].totalVentes += produit.totalVentes || 0;
    if (produit.actif) {
      stats[famille].produitsActifs++;
    }
  }

  return stats;
};
