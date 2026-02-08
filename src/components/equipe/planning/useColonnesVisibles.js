/**
 * Hook pour calculer les colonnes visibles et les tranches regroupées dynamiques
 * Extrait de PlanningJour.jsx - aucune modification de logique
 */
import { useMemo } from 'react';
import {
  TRANCHES_CONFIG,
  TRANCHES_REGROUPEES,
  TRANCHES,
  MAPPING_TRANCHES_LEGACY,
  REGROUPEMENTS_MANAGER,
} from './constants';

/**
 * Calcule les tranches regroupées dynamiquement selon la configuration manager
 */
export function useTranchesDynamiques(configuration) {
  return useMemo(() => {
    const regroup = configuration?.regroupements;
    if (!regroup) return TRANCHES_REGROUPEES; // Fallback par défaut

    // Construire la liste : pour chaque tranche de base, soit elle est regroupée, soit détaillée
    const result = [];
    const dejaTraites = new Set();

    // Parcourir les regroupements possibles dans l'ordre
    const ordreRegroup = ['matin', 'apresmidi', 'soir'];
    for (const id of ordreRegroup) {
      const config = REGROUPEMENTS_MANAGER[id];
      if (!config) continue;
      if (regroup[id]) {
        // Ce groupe est activé → une seule colonne regroupée
        result.push({
          key: id,
          label: config.label,
          plage: config.label,
          sousKeys: config.sousKeys,
        });
        config.sousKeys.forEach(k => dejaTraites.add(k));
      } else {
        // Pas regroupé → colonnes individuelles
        config.sousKeys.forEach(k => {
          if (!dejaTraites.has(k)) {
            const tc = TRANCHES_CONFIG.find(t => t.key === k);
            if (tc) {
              result.push({ ...tc, sousKeys: [k] });
              dejaTraites.add(k);
            }
          }
        });
      }
    }

    // Ajouter les tranches non couvertes par un regroupement
    TRANCHES_CONFIG.forEach(tc => {
      if (!dejaTraites.has(tc.key)) {
        result.push({ ...tc, sousKeys: [tc.key] });
      }
    });

    return result;
  }, [configuration?.regroupements]);
}

/**
 * Calcule les colonnes visibles selon le mode, la fréquentation, et les produits
 */
export function useColonnesVisibles({
  modeTranches,
  tranchesRegroupeesDynamiques,
  afficherToutesColonnes,
  produits,
  configuration,
  frequentation,
  jourSelectionne,
}) {
  return useMemo(() => {
    // Mode regroupé : utiliser les tranches regroupées (dynamiques si config manager)
    if (modeTranches === 'regroupees') {
      return tranchesRegroupeesDynamiques;
    }

    // Mode détaillé avec toutes les colonnes
    if (afficherToutesColonnes) {
      return TRANCHES_CONFIG;
    }

    // Vérifier chaque tranche pour voir si elle a des données
    const tranchesAvecDonnees = new Set();

    // Parcourir tous les produits actifs
    produits
      .filter(p => p.actif !== false)
      .forEach(produit => {
        const modeRepartition = configuration?.repartitionParFamille?.[produit.famille] || 'journalier';
        if (modeRepartition === 'tranches') {
          const poidsJour = frequentation?.parJour?.[jourSelectionne]?.poids || (1 / 7);
          const repartJour = produit.repartitionJours?.[jourSelectionne];
          const potentielHebdo = produit.planifieManager || produit.potentielAlgo || produit.potentiel || 0;
          const potentielJour = repartJour != null ? Math.ceil(repartJour) : Math.ceil(potentielHebdo * poidsJour);

          if (potentielJour > 0) {
            // Obtenir les données de fréquentation pour ce jour
            const tranchesData = frequentation?.parJour?.[jourSelectionne]?.tranches || {};

            // Pour chaque tranche, vérifier s'il y a une quantité
            TRANCHES.forEach(trancheKey => {
              // Chercher le poids de cette tranche
              let poids = tranchesData[trancheKey]?.poids;

              // Si pas trouvé, chercher dans l'ancien format
              if (poids === undefined) {
                for (const [oldKey, newKeys] of Object.entries(MAPPING_TRANCHES_LEGACY)) {
                  if (newKeys.includes(trancheKey) && tranchesData[oldKey]?.poids !== undefined) {
                    poids = tranchesData[oldKey].poids / newKeys.length;
                    break;
                  }
                }
              }

              // Utiliser poids par défaut si toujours pas trouvé
              if (poids === undefined) {
                const poidsDefaut = {
                  '00_Autre': 0.05, '09h_12h': 0.25, '12h_14h': 0.20,
                  '14h_16h': 0.15, '16h_19h': 0.25, '19h_23h': 0.10,
                };
                poids = poidsDefaut[trancheKey] || 0;
              }

              const qte = Math.ceil(potentielJour * poids);
              if (qte > 0) {
                tranchesAvecDonnees.add(trancheKey);
              }
            });
          }
        }
      });

    // Filtrer les tranches qui ont des données
    const result = TRANCHES_CONFIG.filter(t => tranchesAvecDonnees.has(t.key));

    // Si aucune tranche n'a de données, afficher au moins les tranches principales
    if (result.length === 0) {
      return TRANCHES_CONFIG.filter(t =>
        ['09h_12h', '12h_14h', '14h_16h', '16h_19h'].includes(t.key)
      );
    }

    return result;
  }, [produits, configuration, frequentation, jourSelectionne, afficherToutesColonnes, modeTranches, tranchesRegroupeesDynamiques]);
}
