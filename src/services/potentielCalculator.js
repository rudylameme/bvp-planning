import { getJourSemaine } from '../utils/dateUtils';

/**
 * Service de calcul des potentiels hebdomadaires
 */

/**
 * Trouve la vente maximale et sa date dans les ventes par jour
 * @param {Object} ventesParJour - Objet avec dates en clés et quantités en valeurs
 * @returns {{venteMax: number, dateVenteMax: string|null}}
 */
export const trouverVenteMax = (ventesParJour) => {
  let venteMax = 0;
  let dateVenteMax = null;

  for (const [date, quantite] of Object.entries(ventesParJour)) {
    if (quantite > venteMax) {
      venteMax = quantite;
      dateVenteMax = date;
    }
  }

  return { venteMax, dateVenteMax };
};

/**
 * Calcule le potentiel hebdomadaire à partir de la vente max
 * Formule : Potentiel = Vente MAX ÷ Poids du jour
 *
 * @param {number} venteMax - Quantité maximale vendue
 * @param {string} dateVenteMax - Date de la vente maximale
 * @param {Object} frequentationData - Données de fréquentation (avec poidsJours)
 * @param {string} libelle - Libellé du produit (pour les logs)
 * @returns {number} Le potentiel hebdomadaire calculé
 */
export const calculerPotentielDepuisVenteMax = (venteMax, dateVenteMax, frequentationData, libelle = '') => {
  if (venteMax === 0) return 0;

  const jourVenteMax = getJourSemaine(dateVenteMax);
  const poidsJour = (jourVenteMax && frequentationData.poidsJours[jourVenteMax])
    ? frequentationData.poidsJours[jourVenteMax]
    : Math.max(...Object.values(frequentationData.poidsJours));

  const potentiel = Math.ceil(venteMax / poidsJour);

  if (libelle) {
    console.log(`  ${libelle}: Vente max=${venteMax} (${jourVenteMax || '?'}) ÷ ${(poidsJour * 100).toFixed(1)}% → Potentiel=${potentiel}`);
  }

  return potentiel;
};

/**
 * Calcule les potentiels pour tous les produits avec mode de progression
 * @param {Array} produits - Liste des produits
 * @param {Object} frequentationData - Données de fréquentation
 * @param {string} mode - Mode de calcul: 'mathematique' | 'forte-progression' | 'prudent'
 * @returns {Array} Produits avec potentiels calculés
 */
export const calculerPotentielsPourTous = (produits, frequentationData, mode = 'mathematique') => {
  const limites = {
    'mathematique': null,          // Pas de limite
    'forte-progression': 0.20,     // +20% max
    'prudent': 0.10                // +10% max
  };

  const limiteProgression = limites[mode];
  console.log(`🤖 Calcul automatique des potentiels (mode: ${mode})...`);

  return produits.map(produit => {
    if (produit.custom || !produit.ventesParJour) {
      return produit;
    }

    const { venteMax, dateVenteMax } = trouverVenteMax(produit.ventesParJour);

    if (venteMax === 0) {
      return { ...produit, potentielHebdo: 0 };
    }

    const jourVenteMax = getJourSemaine(dateVenteMax);
    let poidsJour = 0.14; // Valeur par défaut

    const poidsJours = frequentationData?.poidsJours;
    if (poidsJours) {
      const poidsJourSpecifique = jourVenteMax ? poidsJours[jourVenteMax] : null;
      poidsJour = poidsJourSpecifique ?? Math.max(...Object.values(poidsJours));
    }

    // Formule : Potentiel = Vente MAX ÷ Poids du jour
    const potentielMathematique = Math.ceil(venteMax / poidsJour);

    // Volume actuel (total des ventes)
    const volumeActuel = produit.totalVentes || 0;

    // Appliquer la limite de progression selon le mode
    let potentielFinal = potentielMathematique;

    if (limiteProgression !== null && volumeActuel > 0) {
      const progression = (potentielMathematique - volumeActuel) / volumeActuel;

      if (progression > limiteProgression) {
        // Limiter la progression
        potentielFinal = Math.ceil(volumeActuel * (1 + limiteProgression));
      } else if (progression < 0) {
        // Pas de baisse : garder le volume actuel
        potentielFinal = volumeActuel;
      }
      // Sinon : progression entre 0 et la limite → garder le calcul mathématique
    }

    return {
      ...produit,
      potentielHebdo: potentielFinal
    };
  });
};
