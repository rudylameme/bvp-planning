/**
 * Recalcule le planning avec des variantes différentes par rayon ET par jour
 *
 * Système à 4 règles:
 * - Règle 1: Calcul mathématique (venteMax / poidsJour)
 * - Règle 2: Minimum = ventes historiques du jour
 * - Règle 3: Application des limites par variante:
 *   - Sans: Pas de limite (potentiel mathématique pur)
 *   - Forte: Limite à +20% du volume historique
 *   - Faible: Limite à +10% du volume historique
 * - Règle 4: Les modifications manuelles surchargent tout
 */

import { getJourSemaine } from '../utils/dateUtils';

/**
 * Trouve la vente maximale pour un jour donné
 */
const trouverVenteMaxPourJour = (ventesParJour, jourCible) => {
  let venteMax = 0;
  for (const [date, quantite] of Object.entries(ventesParJour)) {
    const jourDeDate = getJourSemaine(date);
    if (jourDeDate === jourCible && quantite > venteMax) {
      venteMax = quantite;
    }
  }
  return venteMax;
};

/**
 * Calcule la somme totale des ventes historiques pour un jour donné
 */
const calculerVentesHistoriquesPourJour = (ventesParJour, jourCible) => {
  let totalVentes = 0;
  for (const [date, quantite] of Object.entries(ventesParJour)) {
    const jourDeDate = getJourSemaine(date);
    if (jourDeDate === jourCible) {
      totalVentes += quantite;
    }
  }
  return totalVentes;
};

/**
 * Calcule le potentiel mathématique d'un produit
 */
const calculerPotentielMathematique = (ventesParJour, poidsJours) => {
  // Trouver la vente max et son jour
  let venteMax = 0;
  let jourVenteMax = 'lundi';

  for (const [date, quantite] of Object.entries(ventesParJour)) {
    if (quantite > venteMax) {
      venteMax = quantite;
      const jour = getJourSemaine(date);
      if (jour) {
        jourVenteMax = jour;
      }
    }
  }

  // Capitaliser la première lettre
  const jourCapitalized = jourVenteMax.charAt(0).toUpperCase() + jourVenteMax.slice(1);
  const poidsJour = poidsJours[jourCapitalized] || 0.14;

  if (poidsJour === 0) return venteMax * 7;

  return Math.ceil(venteMax / poidsJour);
};

/**
 * Applique la variante à une quantité journalière
 *
 * @param {number} qteMathematique - Quantité calculée mathématiquement
 * @param {number} ventesHistoriques - Ventes historiques du jour
 * @param {string} variante - 'sans' | 'forte' | 'faible'
 * @returns {number} Quantité finale après application des règles
 */
const appliquerVarianteJournaliere = (qteMathematique, ventesHistoriques, variante) => {
  // Règle 2: Le minimum est toujours les ventes historiques
  if (qteMathematique < ventesHistoriques) {
    return ventesHistoriques;
  }

  // Règle 3: Application des limites selon variante
  if (variante === 'sans') {
    // Pas de limite
    return qteMathematique;
  }

  const progression = (qteMathematique - ventesHistoriques) / ventesHistoriques;

  if (variante === 'forte') {
    // Limite +20%
    if (progression > 0.20) {
      return Math.ceil(ventesHistoriques * 1.20);
    }
    return qteMathematique;
  }

  if (variante === 'faible') {
    // Limite +10%
    if (progression > 0.10) {
      return Math.ceil(ventesHistoriques * 1.10);
    }
    return qteMathematique;
  }

  return qteMathematique;
};

/**
 * Recalcule le planning avec les variantes par rayon ET par jour
 *
 * @param {Object} planning - Planning actuel
 * @param {Array} produits - Liste des produits
 * @param {Object} variantesParRayonEtJour - { rayon: { jour: 'sans'|'forte'|'faible' } }
 * @param {Object} frequentationData - Données de fréquentation
 * @param {Object} modificationsManuellesParRayonEtJour - { rayon: { jour: { libelleProduit: quantite } } }
 * @returns {Object} Nouveau planning
 */
export const recalculerPlanningAvecVariantes = (
  planning,
  produits,
  variantesParRayonEtJour,
  frequentationData,
  modificationsManuellesParRayonEtJour = {}
) => {
  const nouveauPlanning = JSON.parse(JSON.stringify({
    ...planning,
    jours: {}
  }));

  // Réinitialiser les jours
  const joursCapitalized = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  for (const jour of joursCapitalized) {
    nouveauPlanning.jours[jour] = {};
  }

  const poidsJours = frequentationData.poidsJours;
  const poidsTranchesParJour = frequentationData.poidsTranchesParJour ?? {};

  // Reconstruire la structure par rayon/programme
  const programmesParRayon = {};

  const produitsActifs = produits.filter(p => p.actif && p.potentielHebdo > 0);

  for (const produit of produitsActifs) {
    const programme = produit.programme || `Autres ${produit.rayon}`;
    const rayon = produit.rayon || 'AUTRE';

    if (!programmesParRayon[rayon]) {
      programmesParRayon[rayon] = {};
    }

    if (!programmesParRayon[rayon][programme]) {
      programmesParRayon[rayon][programme] = [];
    }

    // Calculer le potentiel mathématique (Règle 1)
    const potentielMath = calculerPotentielMathematique(produit.ventesParJour, poidsJours);

    programmesParRayon[rayon][programme].push({
      libelle: produit.libellePersonnalise,
      itm8: produit.itm8,
      codePLU: produit.codePLU,
      potentielMathematique: potentielMath,
      totalVentes: produit.totalVentes || 0,
      ventesParJour: produit.ventesParJour,
      unitesParVente: produit.unitesParVente ?? 1,
      unitesParPlaque: produit.unitesParPlaque ?? 0
    });
  }

  // Générer le planning par jour
  for (const jour of joursCapitalized) {
    nouveauPlanning.jours[jour] = {};
    const jourLower = jour.toLowerCase();

    for (const rayon in programmesParRayon) {
      nouveauPlanning.jours[jour][rayon] = {};

      // Récupérer la variante pour ce rayon/jour
      const varianteJour = variantesParRayonEtJour[rayon]?.[jourLower] || 'sans';

      for (const programme in programmesParRayon[rayon]) {
        const produitsDuProgramme = programmesParRayon[rayon][programme];
        nouveauPlanning.jours[jour][rayon][programme] = {
          produits: new Map(),
          capacite: { matin: 0, midi: 0, soir: 0, total: 0 }
        };

        for (const produit of produitsDuProgramme) {
          const potentielMath = produit.potentielMathematique;
          const poids = poidsJours[jourLower] || 0.14;

          // Règle 1: Calcul mathématique
          const qteMathematique = Math.ceil(potentielMath * poids);

          // Calculer les ventes historiques pour ce jour
          const ventesHistoriques = calculerVentesHistoriquesPourJour(produit.ventesParJour, jourLower);

          // Règle 4: Vérifier s'il y a une modification manuelle
          const modifManuelle = modificationsManuellesParRayonEtJour[rayon]?.[jourLower]?.[produit.libelle];

          let qteJour;
          if (modifManuelle !== undefined && modifManuelle !== null) {
            // Règle 4: Utiliser la modification manuelle
            qteJour = modifManuelle;
          } else {
            // Règles 2 & 3: Appliquer la variante
            qteJour = appliquerVarianteJournaliere(qteMathematique, ventesHistoriques, varianteJour);
          }

          const poidsTranchesJour = poidsTranchesParJour[jourLower] || { matin: 0.6, midi: 0.3, soir: 0.1 };

          const qteMatin = Math.ceil(qteJour * poidsTranchesJour.matin);
          const qteMidi = Math.ceil(qteJour * poidsTranchesJour.midi);
          const qteSoir = Math.ceil(qteJour * poidsTranchesJour.soir);

          const creneauxData = {
            matin: qteMatin,
            midi: qteMidi,
            soir: qteSoir,
            total: qteJour,
            unitesParVente: produit.unitesParVente ?? 1,
            unitesParPlaque: produit.unitesParPlaque ?? 0,
            itm8: produit.itm8,
            codePLU: produit.codePLU,
            ventesHistoriques: ventesHistoriques,
            modifieManuellement: modifManuelle !== undefined && modifManuelle !== null
          };

          nouveauPlanning.jours[jour][rayon][programme].produits.set(produit.libelle, creneauxData);

          // Accumuler dans la capacité
          nouveauPlanning.jours[jour][rayon][programme].capacite.matin += qteMatin;
          nouveauPlanning.jours[jour][rayon][programme].capacite.midi += qteMidi;
          nouveauPlanning.jours[jour][rayon][programme].capacite.soir += qteSoir;
          nouveauPlanning.jours[jour][rayon][programme].capacite.total += qteJour;
        }
      }
    }
  }

  nouveauPlanning.programmesParRayon = programmesParRayon;

  return nouveauPlanning;
};
