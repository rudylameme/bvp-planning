/**
 * Hook pour grouper et trier les produits par famille et programme
 * Extrait de PlanningJour.jsx - aucune modification de logique
 */
import { useMemo, useCallback } from 'react';

/**
 * Groupe les produits par famille, puis par programme, et trie selon sortConfig
 */
export function useProduitsParFamille(produits, sortConfig) {
  return useMemo(() => {
    const groupes = {};

    produits
      .filter(p => p.actif !== false)
      .forEach(produit => {
        const famille = produit.famille || 'AUTRE';
        if (!groupes[famille]) {
          groupes[famille] = {
            parProgramme: {},
            tous: []
          };
        }

        const programme = produit.programme || 'Sans programme';
        if (!groupes[famille].parProgramme[programme]) {
          groupes[famille].parProgramme[programme] = [];
        }

        groupes[famille].parProgramme[programme].push(produit);
        groupes[famille].tous.push(produit);
      });

    // Tri des produits selon la configuration
    Object.values(groupes).forEach(groupe => {
      const sortProduits = (prods) => {
        return prods.sort((a, b) => {
          let comparison = 0;

          switch (sortConfig.key) {
            case 'produit': {
              const nomA = (a.libellePersonnalise || a.libelle || '').toLowerCase();
              const nomB = (b.libellePersonnalise || b.libelle || '').toLowerCase();
              comparison = nomA.localeCompare(nomB);
              break;
            }
            case 'programme': {
              const progA = (a.programme || 'Sans programme').toLowerCase();
              const progB = (b.programme || 'Sans programme').toLowerCase();
              comparison = progA.localeCompare(progB);
              break;
            }
            case 'total':
              comparison = (a.potentiel || 0) - (b.potentiel || 0);
              break;
            default:
              comparison = (b.potentiel || 0) - (a.potentiel || 0);
          }

          return sortConfig.direction === 'asc' ? comparison : -comparison;
        });
      };

      Object.keys(groupe.parProgramme).forEach(prog => {
        groupe.parProgramme[prog] = sortProduits([...groupe.parProgramme[prog]]);
      });
      groupe.tous = sortProduits([...groupe.tous]);
    });

    return groupes;
  }, [produits, sortConfig]);
}

/**
 * Calcule l'ordre des familles triées selon la direction ou personnalisé
 */
export function useFamillesTriees(produitsParFamille, sortConfig, ordrePersonnaliseFamilles) {
  return useMemo(() => {
    const ordreFamillesDefaut = ['BOULANGERIE', 'VIENNOISERIE', 'SNACKING', 'PATISSERIE', 'AUTRE'];

    if (ordrePersonnaliseFamilles && ordrePersonnaliseFamilles.length > 0) {
      const famillesPresentes = ordrePersonnaliseFamilles.filter(f => produitsParFamille[f]);
      const nouvellesFamilles = ordreFamillesDefaut.filter(
        f => produitsParFamille[f] && !famillesPresentes.includes(f)
      );
      return [...famillesPresentes, ...nouvellesFamilles];
    }

    const famillesPresentes = ordreFamillesDefaut.filter(f => produitsParFamille[f]);

    if (sortConfig.key === 'famille') {
      return sortConfig.direction === 'asc'
        ? famillesPresentes
        : [...famillesPresentes].reverse();
    }

    return famillesPresentes;
  }, [produitsParFamille, sortConfig, ordrePersonnaliseFamilles]);
}

/**
 * Hook pour obtenir l'ordre des programmes pour une famille
 */
export function useGetProgrammesOrdonnes(ordrePersonnaliseProgrammes) {
  return useCallback((famille, programmesDefaut, groupeFamille) => {
    const ordrePerso = ordrePersonnaliseProgrammes[famille];
    if (ordrePerso && ordrePerso.length > 0) {
      const programmesPresents = ordrePerso.filter(p => programmesDefaut.includes(p));
      const nouveauxProgrammes = programmesDefaut.filter(p => !programmesPresents.includes(p));
      return [...programmesPresents, ...nouveauxProgrammes];
    }

    return [...programmesDefaut].sort((a, b) => {
      const aSansCuisson = a.toLowerCase().includes('sans cuisson') || a.toLowerCase().includes('sans programme');
      const bSansCuisson = b.toLowerCase().includes('sans cuisson') || b.toLowerCase().includes('sans programme');

      if (aSansCuisson && !bSansCuisson) return 1;
      if (!aSansCuisson && bSansCuisson) return -1;

      const countA = groupeFamille?.parProgramme?.[a]?.length || 0;
      const countB = groupeFamille?.parProgramme?.[b]?.length || 0;
      return countB - countA;
    });
  }, [ordrePersonnaliseProgrammes]);
}
