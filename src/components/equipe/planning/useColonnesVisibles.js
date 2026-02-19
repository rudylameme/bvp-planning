/**
 * Hook pour calculer les colonnes visibles et les tranches regroupées dynamiques
 * Supporte la configuration par famille (tranchesParFamille)
 * et la rétrocompatibilité avec l'ancien format global (nbTranches)
 */
import { useMemo } from 'react';
import {
  TRANCHES_CONFIG,
  TRANCHES_REGROUPEES,
  TRANCHES_PRESETS,
  REGROUPEMENTS_MANAGER,
} from './constants';

/**
 * Calcule les tranches regroupées dynamiquement selon la configuration manager
 * (Conservé pour rétrocompatibilité)
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
 * Calcule les colonnes visibles selon le nombre de tranches choisi (3 à 6)
 * Utilise les presets définis dans TRANCHES_PRESETS
 */
export function useColonnesVisibles({ nbTranches }) {
  return useMemo(() => {
    return TRANCHES_PRESETS[nbTranches] || TRANCHES_PRESETS[4];
  }, [nbTranches]);
}

// Labels sémantiques pour les groupes de tranches consécutives
const LABELS_GROUPES = {
  '0,1': 'Matin',
  '2,3': 'Après-midi',
  '4,5': 'Soir',
  '0,1,2': 'Avant 14h',
  '3,4,5': 'Après 14h',
  '0,1,2,3': 'Avant 16h',
  '2,3,4,5': 'Après 12h',
  '0,1,2,3,4,5': 'Journée',
};

/**
 * Convertit un tableau de groupes d'indices en colonnes visibles
 * @param {number[][]} groups - Ex: [[0,1], [2], [3], [4,5]]
 * @returns {Array<{key, label, plage, sousKeys}>}
 */
export function colonnesFromGroups(groups) {
  if (!groups || !Array.isArray(groups) || groups.length === 0) {
    return TRANCHES_PRESETS[4]; // Fallback 4T
  }

  return groups.map(group => {
    const sousKeys = group.map(i => TRANCHES_CONFIG[i]?.key).filter(Boolean);
    const key = sousKeys.length === 1 ? sousKeys[0] : `g_${group.join('_')}`;

    // Label : sémantique si connu, sinon combiner les plages
    const groupKey = group.join(',');
    let label = LABELS_GROUPES[groupKey];
    if (!label) {
      if (sousKeys.length === 1) {
        label = TRANCHES_CONFIG[group[0]]?.label || sousKeys[0];
      } else {
        const first = TRANCHES_CONFIG[group[0]];
        const last = TRANCHES_CONFIG[group[group.length - 1]];
        label = `${first?.label || ''} - ${last?.label || ''}`;
      }
    }

    const firstPlage = TRANCHES_CONFIG[group[0]]?.plage || '';
    const lastPlage = TRANCHES_CONFIG[group[group.length - 1]]?.plage || '';
    const plage = sousKeys.length === 1 ? firstPlage : `${firstPlage.split('-')[0]}-${lastPlage.split('-')[1] || lastPlage}`;

    return { key, label, plage, sousKeys };
  });
}

/**
 * Convertit un nbTranches global (ancien format) en tranchesParFamille
 * Applique le même preset à toutes les familles fournies
 * @param {number} nbTranches - 3, 4, 5 ou 6
 * @param {string[]} familles - Liste des familles
 * @returns {Object} - { BOULANGERIE: [[0,1],[2],[3],[4,5]], ... }
 */
export function tranchesParFamilleFromNbTranches(nbTranches, familles) {
  const preset = TRANCHES_PRESETS[nbTranches] || TRANCHES_PRESETS[4];
  // Reconvertir le preset en groupes d'indices
  const groups = preset.map(col => {
    return col.sousKeys.map(sk => {
      const idx = TRANCHES_CONFIG.findIndex(t => t.key === sk);
      return idx >= 0 ? idx : 0;
    });
  });

  const result = {};
  familles.forEach(f => { result[f] = groups; });
  return result;
}

/**
 * Convertit un objet regroupements (ancien format) en groupes d'indices
 * @param {Object} regroupements - { matin: bool, apresmidi: bool, soir: bool }
 * @returns {number[][]}
 */
export function groupsFromRegroupements(regroupements) {
  if (!regroupements) return [[0, 1], [2], [3], [4, 5]]; // Défaut 4T

  const groups = [];
  // Matin : indices 0,1
  if (regroupements.matin) {
    groups.push([0, 1]);
  } else {
    groups.push([0], [1]);
  }
  // Après-midi : indices 2,3
  if (regroupements.apresmidi) {
    groups.push([2, 3]);
  } else {
    groups.push([2], [3]);
  }
  // Soir : indices 4,5
  if (regroupements.soir) {
    groups.push([4, 5]);
  } else {
    groups.push([4], [5]);
  }
  return groups;
}

/**
 * Défaut par famille : 4T pour les familles en mode tranches, 3T pour journalier
 */
export const TRANCHES_DEFAUT_PAR_FAMILLE = {
  BOULANGERIE: [[0, 1], [2], [3], [4, 5]],        // 4 colonnes (4 cuissons)
  VIENNOISERIE: [[0, 1], [2, 3], [4, 5]],         // 3 colonnes
  PATISSERIE: [[0, 1, 2, 3, 4, 5]],               // 1 colonne (Journée)
  SNACKING: [[0, 1], [2, 3, 4, 5]],               // 2 colonnes
  NEGOCE: [[0, 1, 2, 3, 4, 5]],                   // 1 colonne (Journée)
  AUTRE: [[0, 1, 2, 3, 4, 5]],                    // 1 colonne (Journée)
};
