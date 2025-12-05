/**
 * Service de calcul du Chiffre d'Affaires V2
 */

/**
 * Calcule le CA d'un produit depuis les données de ventes
 * Utilise la colonne "Valeur prix vente" du fichier Excel
 * @param {Array} ventesProduit - [{date, quantite, valeurPrixVente}, ...]
 * @returns {{caTotal: number, prixMoyenUnitaire: number, quantiteTotale: number}}
 */
export function calculerCAProduit(ventesProduit) {
  if (!ventesProduit || ventesProduit.length === 0) {
    return {
      caTotal: 0,
      prixMoyenUnitaire: 0,
      quantiteTotale: 0
    };
  }

  let caTotal = 0;
  let quantiteTotale = 0;

  ventesProduit.forEach(vente => {
    // "valeurPrixVente" correspond à la colonne "Valeur prix vente" du fichier
    caTotal += vente.valeurPrixVente || 0;
    quantiteTotale += vente.quantite || 0;
  });

  const prixMoyenUnitaire = quantiteTotale > 0
    ? Math.round((caTotal / quantiteTotale) * 100) / 100
    : 0;

  return {
    caTotal: Math.round(caTotal * 100) / 100,
    prixMoyenUnitaire,
    quantiteTotale
  };
}

/**
 * Calcule le CA hebdomadaire d'un produit
 * @param {Array} ventesProduit - [{date, quantite, valeurPrixVente}, ...]
 * @param {number} nombreSemaines - Nombre de semaines
 * @returns {number} CA hebdomadaire arrondi à 2 décimales
 */
export function calculerCAHebdo(ventesProduit, nombreSemaines) {
  const { caTotal } = calculerCAProduit(ventesProduit);

  if (nombreSemaines === 0) return 0;

  return Math.round((caTotal / nombreSemaines) * 100) / 100;
}

/**
 * Calcule le CA total du rayon (tous les produits)
 * @param {Object} produitsAvecVentes - { produitId: [{date, quantite, valeurPrixVente}, ...], ... }
 * @param {number} nombreSemaines - Nombre de semaines
 * @returns {{caTotal: number, caHebdo: number}}
 */
export function calculerCATotalRayon(produitsAvecVentes, nombreSemaines) {
  let caTotal = 0;

  Object.values(produitsAvecVentes).forEach(ventesProduit => {
    const { caTotal: caProduit } = calculerCAProduit(ventesProduit);
    caTotal += caProduit;
  });

  const caHebdo = nombreSemaines > 0
    ? Math.round((caTotal / nombreSemaines) * 100) / 100
    : 0;

  return {
    caTotal: Math.round(caTotal * 100) / 100,
    caHebdo
  };
}

/**
 * Calcule le CA des produits monitorés (actifs)
 * @param {Array} produits - Liste des produits avec leurs indicateurs
 * @returns {number} CA hebdo total des produits actifs
 */
export function calculerCAMonitore(produits) {
  const produitsActifs = produits.filter(p => p.actif);

  let caTotal = 0;
  produitsActifs.forEach(produit => {
    caTotal += produit.caHebdoActuel || 0;
  });

  return Math.round(caTotal * 100) / 100;
}

/**
 * Calcule les objectifs CA avec progression
 * @param {number} caMonitoreActuel - CA actuel des produits monitorés
 * @param {number} caTotalRayon - CA total du rayon
 * @param {number} objectifProgression - Pourcentage de progression visée (ex: 5 pour 5%)
 * @returns {Object} Objectifs calculés
 */
export function calculerObjectifsCA(caMonitoreActuel, caTotalRayon, objectifProgression) {
  const caMonitoreObjectif = Math.round(caMonitoreActuel * (1 + objectifProgression / 100) * 100) / 100;
  const gainPotentiel = Math.round((caMonitoreObjectif - caMonitoreActuel) * 100) / 100;

  const partRayonActuel = caTotalRayon > 0
    ? Math.round((caMonitoreActuel / caTotalRayon) * 1000) / 10
    : 0;

  // Nouveau CA total rayon prévu = actuel + gain
  const caTotalRayonPrevu = Math.round((caTotalRayon + gainPotentiel) * 100) / 100;

  const partRayonObjectif = caTotalRayonPrevu > 0
    ? Math.round((caMonitoreObjectif / caTotalRayonPrevu) * 1000) / 10
    : 0;

  return {
    caMonitoreActuel,
    caMonitoreObjectif,
    gainPotentiel,
    partRayonActuel,
    partRayonObjectif,
    caTotalRayonPrevu
  };
}

/**
 * Calcule le CA potentiel basé sur le potentiel hebdo
 * @param {number} potentielHebdo - Potentiel hebdomadaire en quantités
 * @param {number} prixMoyenUnitaire - Prix moyen unitaire
 * @returns {number} CA potentiel
 */
export function calculerCAPotentiel(potentielHebdo, prixMoyenUnitaire) {
  return Math.round(potentielHebdo * prixMoyenUnitaire * 100) / 100;
}
