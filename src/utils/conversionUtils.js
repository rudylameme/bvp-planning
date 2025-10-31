/**
 * Utilitaires pour la conversion des quantités
 */

/**
 * Arrondit un nombre au multiple de 0.5 supérieur
 * Exemples: 6.2 → 6.5, 6.7 → 7, 7.0 → 7, 7.1 → 7.5
 */
const arrondiDemiPlaque = (nombre) => {
  return Math.ceil(nombre * 2) / 2;
};

/**
 * Convertit un nombre de ventes en plaques ou unités
 * Étape 1: ventes × unitesParVente = unités de production
 * Étape 2: unités ÷ unitesParPlaque = nombre de plaques (arrondi au multiple de 0.5 supérieur)
 *
 * @param {number} ventes - Nombre de ventes
 * @param {number} unitesParVente - Nombre d'unités dans 1 vente (ex: Constance x3+1 = 4)
 * @param {number} unitesParPlaque - Nombre d'unités dans 1 plaque de cuisson
 * @returns {string} Quantité formatée (ex: "12 Pl.", "48", ou "NC")
 */
export const convertirEnPlaques = (ventes, unitesParVente, unitesParPlaque) => {
  // Calculer les unités de production
  const unitesProduction = ventes * (unitesParVente || 1);

  if (!unitesParPlaque || unitesParPlaque === 0) {
    // Si pas de plaque définie, afficher les unités (pour que les équipes sachent quoi préparer)
    return `${unitesProduction}`;
  }

  // Conversion: unités de production → plaques
  const nombrePlaquesBrut = unitesProduction / unitesParPlaque;
  const nombrePlaques = arrondiDemiPlaque(nombrePlaquesBrut);

  // Afficher avec ou sans décimales selon le cas
  const affichage = nombrePlaques % 1 === 0 ? nombrePlaques : nombrePlaques.toFixed(1);
  return `${affichage} Pl.`;
};
