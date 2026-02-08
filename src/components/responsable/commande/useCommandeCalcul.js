import { useMemo, useCallback } from 'react';
import { rechercherConditionnement } from '../../../services/conditionnementService';

// Nombre de jours de stock selon le mode
const JOURS_STOCK = {
  normal: 3,    // 3 jours de consommation (écart standard entre livraisons)
  court: 1.5    // 1.5 jours (stock réduit pour rotation rapide)
};

/**
 * Hook de calcul pour la commande multi-livraisons
 * Encapsule : calculerRepartition, produitsAvecBesoins, produitsParFamille,
 * produitsFiltres, stats, statsImpression, statsLivraisonForte, trierProduits
 */
export default function useCommandeCalcul({
  produits,
  commandeConfig,
  livraisons,
  qtesFixees,
  cdtPersonnalises,
  livraisonForte,
  modeStockDefaut,
  modesStockProduits,
  recherche,
  familleFiltre,
  triColonne,
  triOrdre
}) {
  /**
   * Calcul de la répartition en cascade
   */
  const calculerRepartition = useCallback((total, fixees, livraisonIds, idLivraisonForte = null, seuilLivraisonForte = 0) => {
    const result = {};
    const nbLivraisons = livraisonIds.length;

    // Calculer le total des valeurs fixées
    let totalFixe = 0;
    let nbFixees = 0;
    livraisonIds.forEach(id => {
      if (fixees[id] !== null && fixees[id] !== undefined) {
        totalFixe += fixees[id];
        nbFixees++;
      }
    });

    // Si livraison forte et quantité <= seuil → tout sur la livraison forte
    if (idLivraisonForte && total > 0 && total <= seuilLivraisonForte && nbFixees === 0) {
      livraisonIds.forEach(id => {
        if (id === idLivraisonForte) {
          result[id] = { value: total, isAuto: true, regroupe: true };
        } else {
          result[id] = { value: 0, isAuto: true, regroupe: true };
        }
      });
      return result;
    }

    // Reste à répartir sur les colonnes auto
    const reste = Math.max(0, total - totalFixe);
    const nbAuto = nbLivraisons - nbFixees;

    // Répartition équilibrée du reste
    const parAuto = nbAuto > 0 ? Math.floor(reste / nbAuto) : 0;
    const resteModulo = nbAuto > 0 ? reste % nbAuto : 0;

    let autoIndex = 0;
    livraisonIds.forEach(id => {
      if (fixees[id] !== null && fixees[id] !== undefined) {
        result[id] = { value: fixees[id], isAuto: false };
      } else {
        // Répartition auto avec reste sur les premières
        const bonus = autoIndex < resteModulo ? 1 : 0;
        result[id] = { value: parAuto + bonus, isAuto: true };
        autoIndex++;
      }
    });

    return result;
  }, []);

  // Calculer les produits avec leurs besoins et répartition
  const produitsAvecBesoins = useMemo(() => {
    const produitsActifs = produits.filter(p => p.actif);
    const livraisonIds = livraisons.map(l => l.id);
    const nbLivraisons = livraisonIds.length;

    // Première passe : calculer les quantités à commander pour chaque produit
    const produitsAvecQte = produitsActifs.map(produit => {
      const infoCDT = rechercherConditionnement(produit.itm8);
      const cdtPerso = cdtPersonnalises[produit.itm8];
      const cdtEstPersonnalise = cdtPerso !== undefined && cdtPerso > 0;

      // CDT: personnalisé > référence > null (NC = Non Communiqué)
      const cdtRef = infoCDT?.cdt || null;
      const cdt = cdtEstPersonnalise ? cdtPerso : cdtRef;
      const cdtNonCommunique = cdt === null;

      const besoinUnites = Math.ceil(produit.potentielHebdo || 0);
      // Si CDT non communiqué (NC) → pas de calcul, qté = 0
      const besoinCartons = (cdt && cdt > 0) ? Math.ceil(besoinUnites / cdt) : 0;

      // Calcul du stock mini basé sur la consommation journalière
      // Consommation jour = besoin hebdo / 7 jours
      const consoJour = besoinUnites / 7;

      // Déterminer le mode de stock pour ce produit
      const modeProduit = modesStockProduits[produit.itm8] || modeStockDefaut;
      const joursStock = modeProduit === 'manuel'
        ? null  // Mode manuel: utilise la valeur fixe
        : JOURS_STOCK[modeProduit] || JOURS_STOCK.normal;

      // Stock mini en unités, puis converti en cartons
      let stockMiniUnites;
      let stockMini;
      let stockMiniEstManuel = false;

      if (modeProduit === 'manuel' && commandeConfig.stocksMini?.[produit.itm8] !== undefined) {
        // Mode manuel: valeur fixée par l'opérateur (en cartons)
        stockMini = commandeConfig.stocksMini[produit.itm8];
        stockMiniUnites = cdt ? stockMini * cdt : stockMini;
        stockMiniEstManuel = true;
      } else {
        // Mode automatique: calcul basé sur la consommation
        stockMiniUnites = Math.ceil(consoJour * joursStock);
        // Convertir en cartons (arrondi supérieur)
        stockMini = (cdt && cdt > 0) ? Math.ceil(stockMiniUnites / cdt) : Math.ceil(stockMiniUnites / 12);
        // Minimum 1 carton si le produit a des ventes
        if (besoinUnites > 0 && stockMini < 1) stockMini = 1;
      }

      const stockActuel = commandeConfig.stocksActuels?.[produit.itm8] ?? null;

      // Total à commander (0 si CDT non communiqué)
      let qteCommander = 0;
      if (!cdtNonCommunique) {
        if (stockActuel !== null) {
          qteCommander = Math.max(0, besoinCartons + stockMini - stockActuel);
        } else {
          qteCommander = besoinCartons + stockMini;
        }
      }

      return {
        ...produit,
        cdt,
        cdtNonCommunique,
        cdtEstPersonnalise,
        besoinUnites,
        besoinCartons,
        consoJour,
        stockMiniUnites,
        stockMini,
        stockMiniEstManuel,
        modeProduit,
        stockActuel,
        qteCommander
      };
    });

    // Identifier les références à regrouper sur la livraison forte
    // Logique : les 1/N références avec les plus petites quantités (N = nombre de livraisons)
    let itm8ARegrouper = new Set();

    if (livraisonForte && nbLivraisons > 0) {
      // Trier les produits par quantité croissante (les plus petits d'abord)
      const produitsAvecCommande = produitsAvecQte.filter(p => p.qteCommander > 0);
      const produitsTries = [...produitsAvecCommande].sort((a, b) => a.qteCommander - b.qteCommander);

      // Nombre de références à regrouper = total / nb livraisons
      const nbARegrouper = Math.floor(produitsTries.length / nbLivraisons);

      // Les N premières références (les plus petites quantités) sont regroupées
      for (let i = 0; i < nbARegrouper; i++) {
        if (produitsTries[i]) {
          itm8ARegrouper.add(produitsTries[i].itm8);
        }
      }
    }

    // Deuxième passe : calculer la répartition
    return produitsAvecQte.map(produit => {
      // Récupérer les qtes fixées pour ce produit
      const fixeesProduit = qtesFixees[produit.itm8] || {};

      // Vérifier si ce produit doit être regroupé
      const doitEtreRegroupe = itm8ARegrouper.has(produit.itm8);

      // Calculer la répartition (avec regroupement si applicable)
      const repartition = calculerRepartition(
        produit.qteCommander,
        fixeesProduit,
        livraisonIds,
        doitEtreRegroupe ? livraisonForte : null,
        doitEtreRegroupe ? 999999 : 0 // Seuil très haut pour forcer le regroupement
      );

      // Vérifier si sur-commande
      const totalReparti = Object.values(repartition).reduce((sum, r) => sum + r.value, 0);
      const surCommande = totalReparti > produit.qteCommander;

      // Vérifier si ce produit est regroupé sur la livraison forte
      const estRegroupe = Object.values(repartition).some(r => r.regroupe);

      return {
        ...produit,
        repartition,
        surCommande,
        estRegroupe,
        doitEtreRegroupe
      };
    });
  }, [produits, commandeConfig.stocksMini, commandeConfig.stocksActuels, livraisons, qtesFixees, cdtPersonnalises, livraisonForte, calculerRepartition, modeStockDefaut, modesStockProduits]);

  // Grouper par famille/rayon
  const produitsParFamille = useMemo(() => {
    const grouped = {};
    produitsAvecBesoins.forEach(produit => {
      const famille = produit.rayon || 'AUTRE';
      if (!grouped[famille]) {
        grouped[famille] = [];
      }
      grouped[famille].push(produit);
    });
    return grouped;
  }, [produitsAvecBesoins]);

  // Filtrer les produits
  const produitsFiltres = useMemo(() => {
    let result = produitsAvecBesoins;

    if (recherche.trim()) {
      const searchLower = recherche.toLowerCase();
      result = result.filter(p =>
        (p.libelle || '').toLowerCase().includes(searchLower) ||
        (p.itm8 || '').includes(searchLower)
      );
    }

    if (familleFiltre !== 'Toutes') {
      result = result.filter(p => p.rayon === familleFiltre);
    }

    return result;
  }, [produitsAvecBesoins, recherche, familleFiltre]);

  // Statistiques
  const stats = useMemo(() => {
    const total = produitsAvecBesoins.length;
    const avecStock = produitsAvecBesoins.filter(p => p.stockActuel !== null).length;
    const sansStock = total - avecStock;
    const totalCartons = produitsAvecBesoins.reduce((sum, p) => sum + p.qteCommander, 0);

    // Totaux par livraison
    const totauxParLivraison = {};
    livraisons.forEach(liv => {
      totauxParLivraison[liv.id] = produitsAvecBesoins.reduce(
        (sum, p) => sum + (p.repartition[liv.id]?.value || 0),
        0
      );
    });

    return { total, avecStock, sansStock, totalCartons, totauxParLivraison };
  }, [produitsAvecBesoins, livraisons]);

  // Statistiques pour l'impression (exclut les produits NC)
  const statsImpression = useMemo(() => {
    const produitsSansNC = produitsAvecBesoins.filter(p => !p.cdtNonCommunique);
    const totalCartons = produitsSansNC.reduce((sum, p) => sum + p.qteCommander, 0);
    const nbProduits = produitsSansNC.length;

    const totauxParLivraison = {};
    livraisons.forEach(liv => {
      totauxParLivraison[liv.id] = produitsSansNC.reduce(
        (sum, p) => sum + (p.repartition[liv.id]?.value || 0),
        0
      );
    });

    return { totalCartons, totauxParLivraison, nbProduits };
  }, [produitsAvecBesoins, livraisons]);

  // Statistiques pour la livraison forte
  const statsLivraisonForte = useMemo(() => {
    const nbLivraisons = livraisons.length;
    const produitsAvecCommande = produitsAvecBesoins.filter(p => p.qteCommander > 0);
    const nbTotalReferences = produitsAvecCommande.length;

    // Nombre de références regroupées = 1/N du total
    const nbARegrouper = nbLivraisons > 0 ? Math.floor(nbTotalReferences / nbLivraisons) : 0;
    const nbProduitsRegroupes = produitsAvecBesoins.filter(p => p.estRegroupe).length;

    // Calculer le total des cartons regroupés
    const cartonsRegroupes = produitsAvecBesoins
      .filter(p => p.estRegroupe)
      .reduce((sum, p) => sum + p.qteCommander, 0);

    return {
      nbTotalReferences,
      nbARegrouper,
      nbProduitsRegroupes,
      cartonsRegroupes
    };
  }, [produitsAvecBesoins, livraisons.length]);

  // Fonction de tri des produits
  const trierProduits = useCallback((produits) => {
    if (!triColonne) return produits;

    return [...produits].sort((a, b) => {
      let valA, valB;

      switch (triColonne) {
        case 'produit':
          valA = (a.libellePersonnalise || a.libelle || '').toLowerCase();
          valB = (b.libellePersonnalise || b.libelle || '').toLowerCase();
          break;
        case 'cdt':
          valA = a.cdt || 0;
          valB = b.cdt || 0;
          break;
        case 'mini':
          valA = a.stockMini || 0;
          valB = b.stockMini || 0;
          break;
        case 'stock':
          valA = a.stockActuel ?? -1;
          valB = b.stockActuel ?? -1;
          break;
        case 'total':
          valA = a.qteCommander || 0;
          valB = b.qteCommander || 0;
          break;
        default:
          // Colonnes de commande (cmd_1, cmd_2, cmd_3)
          if (triColonne.startsWith('cmd_')) {
            const livId = parseInt(triColonne.split('_')[1]);
            valA = a.repartition[livId]?.value || 0;
            valB = b.repartition[livId]?.value || 0;
          } else {
            return 0;
          }
      }

      // Comparaison
      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(valB);
        return triOrdre === 'asc' ? cmp : -cmp;
      } else {
        const cmp = valA - valB;
        return triOrdre === 'asc' ? cmp : -cmp;
      }
    });
  }, [triColonne, triOrdre]);

  // Liste des familles pour le filtre
  const familles = ['Toutes', ...Object.keys(produitsParFamille).sort()];

  return {
    produitsAvecBesoins,
    produitsParFamille,
    produitsFiltres,
    stats,
    statsImpression,
    statsLivraisonForte,
    trierProduits,
    familles
  };
}
