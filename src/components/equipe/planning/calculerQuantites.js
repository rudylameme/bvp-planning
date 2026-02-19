/**
 * Fonctions de calcul des quantités pour le planning du jour
 * Extraites de PlanningJour.jsx - aucune modification de logique
 */

import { TRANCHES, MAPPING_TRANCHES_LEGACY } from './constants';

/**
 * Calculer les quantités pour un produit avec historique (6 tranches)
 * modeRepartitionOverride permet de forcer le mode (pour synchroniser rendu et calcul)
 */
export function calculerQuantites(produit, jour, frequentation, configuration, isCreneauFerme, modeRepartitionOverride = null) {
  // Utiliser repartitionJours du fichier manager si disponible
  // MAIS vérifier que les valeurs sont réellement différenciées par jour
  const repartJours = produit.repartitionJours;
  let repartJour = repartJours?.[jour];
  const poidsJour = frequentation?.parJour?.[jour]?.poids || (1 / 7);
  const potentielHebdo = produit.planifieManager || produit.potentielAlgo || produit.potentiel || 0;

  // Détecter si repartitionJours a des valeurs identiques pour tous les jours
  // (signe que l'export a été fait avec des poids de fréquentation non différenciés)
  if (repartJour != null && repartJours) {
    const vals = Object.values(repartJours);
    const allEqual = vals.length > 1 && vals.every(v => v === vals[0]);
    if (allEqual) {
      // Ignorer repartitionJours et recalculer avec la fréquentation
      repartJour = null;
    }
  }

  const potentielJour = repartJour != null
    ? Math.ceil(repartJour)
    : Math.ceil(potentielHebdo * poidsJour);

  // Historique (si disponible)
  const historiqueHebdo = produit.historiqueHebdo || produit.moyenneHebdo || 0;
  const historiqueJour = historiqueHebdo
    ? Math.ceil(historiqueHebdo * poidsJour)
    : null;

  // Utiliser le mode fourni en override, sinon calculer depuis produit.famille
  const modeRepartition = modeRepartitionOverride || configuration?.repartitionParFamille?.[produit.famille] || 'journalier';

  if (modeRepartition === 'tranches') {
    const tranchesData = frequentation?.parJour?.[jour]?.tranches || {};

    // Poids par défaut pour les 6 tranches (répartition équilibrée si pas de données)
    const poidsDefaut = {
      '00_Autre': 0.05,    // 5% avant 9h
      '09h_12h': 0.25,     // 25% matin
      '12h_14h': 0.20,     // 20% midi
      '14h_16h': 0.15,     // 15% début après-midi
      '16h_19h': 0.25,     // 25% fin après-midi
      '19h_23h': 0.10,     // 10% soir
    };

    // Fonction pour obtenir le poids d'une tranche (gère l'ancien et nouveau format)
    const getPoidsTrancheNormalized = (trancheKey) => {
      // D'abord, chercher dans le nouveau format
      if (tranchesData[trancheKey]?.poids !== undefined) {
        return tranchesData[trancheKey].poids;
      }

      // Ensuite, chercher dans l'ancien format et diviser
      for (const [oldKey, newKeys] of Object.entries(MAPPING_TRANCHES_LEGACY)) {
        if (newKeys.includes(trancheKey) && tranchesData[oldKey]?.poids !== undefined) {
          // Diviser le poids entre les tranches qui correspondent
          return tranchesData[oldKey].poids / newKeys.length;
        }
      }

      // Sinon, utiliser le poids par défaut
      return poidsDefaut[trancheKey] || 0;
    };

    // Filtrer les tranches fermées (créneaux manager)
    const tranchesOuvertes = TRANCHES.filter(k => !isCreneauFerme(jour, k));

    // Construire l'objet tranches avec les 6 créneaux
    const tranches = {};
    const NB_TRANCHES = tranchesOuvertes.length || TRANCHES.length;

    // === RÈGLE DE RÉPARTITION CDC 13.4.3 ===
    // | Quantité | Cuissons | Répartition                           |
    // |----------|----------|---------------------------------------|
    // | < 6      | 2        | 70% ouverture + 30% tranche forte     |
    // | 6-10     | 3        | 60% ouverture + 20% + 20%             |
    // | 10-20    | 3        | 40% ouverture + 30% + 30%             |
    // | > 20     | toutes   | répartition classique selon poids      |

    // Trier les tranches ouvertes par fréquentation (hors première = ouverture)
    const premiereTrancheKey = tranchesOuvertes[0]; // tranche d'ouverture
    const tranchesTriees = tranchesOuvertes.filter(k => k !== premiereTrancheKey)
      .map(key => ({ key, poids: getPoidsTrancheNormalized(key) }))
      .sort((a, b) => b.poids - a.poids); // Tri décroissant par poids

    // Initialiser toutes les tranches à 0
    TRANCHES.forEach(trancheKey => {
      tranches[trancheKey] = {
        preco: 0,
        histo: historiqueJour ? 0 : null
      };
    });

    if (potentielJour > 0 && potentielJour < 6 && tranchesOuvertes.length >= 2) {
      // < 6 : 2 cuissons — 70% ouverture + 30% tranche forte
      const trancheForte = tranchesTriees[0]?.key || tranchesOuvertes[1];
      const qteOuverture = Math.round(potentielJour * 0.7);
      const qteForte = potentielJour - qteOuverture;
      tranches[premiereTrancheKey] = { preco: qteOuverture, histo: historiqueJour ? Math.round(historiqueJour * 0.7) : null };
      tranches[trancheForte] = { preco: qteForte, histo: historiqueJour ? Math.round(historiqueJour * 0.3) : null };

    } else if (potentielJour >= 6 && potentielJour <= 10 && tranchesOuvertes.length >= 3) {
      // 6-10 : 3 cuissons — 60% ouverture + 20% + 20%
      const t1 = tranchesTriees[0]?.key || tranchesOuvertes[1];
      const t2 = tranchesTriees[1]?.key || tranchesOuvertes[2];
      const qteOuverture = Math.round(potentielJour * 0.6);
      const qteT1 = Math.round(potentielJour * 0.2);
      const qteT2 = potentielJour - qteOuverture - qteT1;
      tranches[premiereTrancheKey] = { preco: qteOuverture, histo: historiqueJour ? Math.round(historiqueJour * 0.6) : null };
      tranches[t1] = { preco: qteT1, histo: historiqueJour ? Math.round(historiqueJour * 0.2) : null };
      tranches[t2] = { preco: qteT2, histo: historiqueJour ? Math.round(historiqueJour * 0.2) : null };

    } else if (potentielJour > 10 && potentielJour <= 20 && tranchesOuvertes.length >= 3) {
      // 10-20 : 3 cuissons — 40% ouverture + 30% + 30%
      const t1 = tranchesTriees[0]?.key || tranchesOuvertes[1];
      const t2 = tranchesTriees[1]?.key || tranchesOuvertes[2];
      const qteOuverture = Math.round(potentielJour * 0.4);
      const qteT1 = Math.round(potentielJour * 0.3);
      const qteT2 = potentielJour - qteOuverture - qteT1;
      tranches[premiereTrancheKey] = { preco: qteOuverture, histo: historiqueJour ? Math.round(historiqueJour * 0.4) : null };
      tranches[t1] = { preco: qteT1, histo: historiqueJour ? Math.round(historiqueJour * 0.3) : null };
      tranches[t2] = { preco: qteT2, histo: historiqueJour ? Math.round(historiqueJour * 0.3) : null };

    } else if (potentielJour > 0) {
      // > 20 (ou fallback) : répartition classique sur toutes les tranches ouvertes
      let totalPoidsOuvertes = 0;
      tranchesOuvertes.forEach(k => { totalPoidsOuvertes += getPoidsTrancheNormalized(k); });

      let resteADistribuer = potentielJour;
      const repartition = tranchesOuvertes.map(key => {
        const poidsNorm = totalPoidsOuvertes > 0 ? getPoidsTrancheNormalized(key) / totalPoidsOuvertes : 1 / (tranchesOuvertes.length || 1);
        return { key, qteExacte: potentielJour * poidsNorm, poids: poidsNorm };
      });

      // Arrondir intelligemment pour que le total soit exact
      repartition.sort((a, b) => (b.qteExacte % 1) - (a.qteExacte % 1));
      repartition.forEach(r => {
        r.qteFinale = Math.floor(r.qteExacte);
        resteADistribuer -= r.qteFinale;
      });
      for (let i = 0; i < resteADistribuer && i < repartition.length; i++) {
        repartition[i].qteFinale += 1;
      }

      repartition.forEach(r => {
        tranches[r.key] = {
          preco: r.qteFinale,
          histo: historiqueJour ? Math.round(historiqueJour * r.poids) : null
        };
      });
    }

    return {
      mode: 'tranches',
      tranches,
      total: { preco: potentielJour, histo: historiqueJour }
    };
  } else {
    return {
      mode: 'journalier',
      journalier: { preco: potentielJour, histo: historiqueJour },
      total: { preco: potentielJour, histo: historiqueJour }
    };
  }
}

/**
 * Calculer les totaux par tranche pour une famille (6 tranches)
 */
export function calculerTotauxFamille(produitsFamille, jour, modeRepartition, frequentation, configuration, isCreneauFerme) {
  if (modeRepartition === 'tranches') {
    // Initialiser les totaux pour les 6 tranches
    const totaux = {
      total: { preco: 0, histo: 0 }
    };
    TRANCHES.forEach(t => {
      totaux[t] = { preco: 0, histo: 0 };
    });

    produitsFamille.forEach(produit => {
      const qtes = calculerQuantites(produit, jour, frequentation, configuration, isCreneauFerme, modeRepartition);
      TRANCHES.forEach(t => {
        totaux[t].preco += qtes.tranches?.[t]?.preco || 0;
        totaux[t].histo += qtes.tranches?.[t]?.histo || 0;
      });
      totaux.total.preco += qtes.total.preco || 0;
      totaux.total.histo += qtes.total.histo || 0;
    });

    return totaux;
  } else {
    let totalPreco = 0;
    let totalHisto = 0;
    produitsFamille.forEach(produit => {
      const qtes = calculerQuantites(produit, jour, frequentation, configuration, isCreneauFerme, modeRepartition);
      totalPreco += qtes.total.preco || 0;
      totalHisto += qtes.total.histo || 0;
    });
    return { total: { preco: totalPreco, histo: totalHisto } };
  }
}
