import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Package } from 'lucide-react';
import { formatDateInput } from '../../utils/formatUtils';
import { useMagasin } from '../../contexts/MagasinContext';
import GestionLivraisons from './commande/GestionLivraisons';
import TableauCommande from './commande/TableauCommande';
import RecapCommande from './commande/RecapCommande';

/**
 * OngletCommande - Module Commande Multi-Livraisons (V5)
 * Migré depuis StepCommande V4, utilise useMagasin() au lieu des props
 */
const OngletCommande = () => {
  const {
    produitsGamme: produits,
    commandeConfig,
    setCommandeConfig,
    semainePlanning,
    infoPDV,
    donneesMagasin,
    promosActives,
  } = useMagasin();

  const semaine = semainePlanning?.semaine;
  const annee = semainePlanning?.annee;
  const magasin = {
    nom: infoPDV?.nom || donneesMagasin?.magasin?.nom || '',
    code: infoPDV?.code || donneesMagasin?.magasin?.code || '',
  };

  // Helper pour mettre à jour commandeConfig
  const onCommandeConfigChange = useCallback((newConfig) => {
    setCommandeConfig(newConfig);
  }, [setCommandeConfig]);

  // États locaux

  // Livraisons par défaut (2 livraisons)
  const [livraisons, setLivraisons] = useState(
    commandeConfig.livraisons || [
      { id: 1, dateCommande: null, dateReception: null, label: 'Livraison 1' },
      { id: 2, dateCommande: null, dateReception: null, label: 'Livraison 2' }
    ]
  );

  // Quantités fixées manuellement par produit et par livraison
  const [qtesFixees, setQtesFixees] = useState(commandeConfig.qtesFixees || {});

  // CDT personnalisés par l'utilisateur
  const [cdtPersonnalises, setCdtPersonnalises] = useState(commandeConfig.cdtPersonnalises || {});

  // Livraison forte sélectionnée
  const [livraisonForte, setLivraisonForte] = useState(commandeConfig.livraisonForte || null);

  // Mode de stock par défaut
  const [modeStockDefaut, setModeStockDefaut] = useState(commandeConfig.modeStockDefaut || 'normal');

  // Modes de stock personnalisés par produit
  const [modesStockProduits, setModesStockProduits] = useState(commandeConfig.modesStockProduits || {});

  // Personnalisation produit : programme cuisson et unités/plaque
  const [personnalisationProduits, setPersonnalisationProduits] = useState(commandeConfig.personnalisationProduits || {});

  const JOURS_STOCK = {
    normal: 3,
    court: 1.5
  };

  // Modal d'impression
  const [showImpressionModal, setShowImpressionModal] = useState(false);

  // Initialiser les dates de livraison par défaut
  useEffect(() => {
    if (semaine && annee && (!livraisons.length || !livraisons[0]?.dateReception)) {
      const premierJanvier = new Date(annee, 0, 1);
      const joursJusquaLundi = (semaine - 1) * 7;
      const jourSemaine = premierJanvier.getDay();
      const decalage = (jourSemaine <= 4) ? 1 - jourSemaine : 8 - jourSemaine;
      const lundi = new Date(annee, 0, 1 + decalage + joursJusquaLundi);

      const dateCmd1 = new Date(lundi);
      const dateRec1 = new Date(lundi);
      dateRec1.setDate(dateRec1.getDate() + 2);

      const dateCmd2 = new Date(lundi);
      dateCmd2.setDate(dateCmd2.getDate() + 2);
      const dateRec2 = new Date(lundi);
      dateRec2.setDate(dateRec2.getDate() + 4);

      setLivraisons([
        { id: 1, dateCommande: formatDateInput(dateCmd1), dateReception: formatDateInput(dateRec1), label: 'Livraison 1' },
        { id: 2, dateCommande: formatDateInput(dateCmd2), dateReception: formatDateInput(dateRec2), label: 'Livraison 2' }
      ]);
    }
  }, [semaine, annee]);

  // Synchroniser avec commandeConfig
  useEffect(() => {
    onCommandeConfigChange({
      ...commandeConfig,
      livraisons,
      qtesFixees,
      cdtPersonnalises,
      livraisonForte,
      modeStockDefaut,
      modesStockProduits,
      personnalisationProduits
    });
  }, [livraisons, qtesFixees, cdtPersonnalises, livraisonForte, modeStockDefaut, modesStockProduits, personnalisationProduits]);

  // Ajouter une livraison (max 3)
  const ajouterLivraison = () => {
    if (livraisons.length >= 3) return;
    const newId = Math.max(...livraisons.map(l => l.id)) + 1;
    setLivraisons([...livraisons, { id: newId, dateCommande: null, dateReception: null, label: `Livraison ${newId}` }]);
  };

  // Supprimer une livraison (min 2)
  const supprimerLivraison = (id) => {
    if (livraisons.length <= 2) return;
    setLivraisons(livraisons.filter(l => l.id !== id));
    const newQtesFixees = { ...qtesFixees };
    Object.keys(newQtesFixees).forEach(itm8 => {
      if (newQtesFixees[itm8]) {
        delete newQtesFixees[itm8][id];
      }
    });
    setQtesFixees(newQtesFixees);
  };

  const modifierDateCommande = (id, date) => {
    setLivraisons(livraisons.map(l => l.id === id ? { ...l, dateCommande: date } : l));
  };

  const modifierDateReception = (id, date) => {
    setLivraisons(livraisons.map(l => l.id === id ? { ...l, dateReception: date } : l));
  };

  const handleCdtChange = (itm8, value) => {
    const numValue = parseInt(value, 10);
    if (value === '' || isNaN(numValue)) {
      setCdtPersonnalises(prev => {
        const newCdt = { ...prev };
        delete newCdt[itm8];
        return newCdt;
      });
    } else if (numValue > 0) {
      setCdtPersonnalises(prev => ({ ...prev, [itm8]: numValue }));
    }
  };

  /**
   * Calcul de la répartition en cascade
   */
  const calculerRepartition = useCallback((total, fixees, livraisonIds, idLivraisonForte = null, seuilLivraisonForte = 0) => {
    const result = {};
    const nbLivraisons = livraisonIds.length;

    let totalFixe = 0;
    let nbFixees = 0;
    livraisonIds.forEach(id => {
      if (fixees[id] !== null && fixees[id] !== undefined) {
        totalFixe += fixees[id];
        nbFixees++;
      }
    });

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

    const reste = Math.max(0, total - totalFixe);
    const nbAuto = nbLivraisons - nbFixees;
    const parAuto = nbAuto > 0 ? Math.floor(reste / nbAuto) : 0;
    const resteModulo = nbAuto > 0 ? reste % nbAuto : 0;

    let autoIndex = 0;
    livraisonIds.forEach(id => {
      if (fixees[id] !== null && fixees[id] !== undefined) {
        result[id] = { value: fixees[id], isAuto: false };
      } else {
        const bonus = autoIndex < resteModulo ? 1 : 0;
        result[id] = { value: parAuto + bonus, isAuto: true };
        autoIndex++;
      }
    });

    return result;
  }, []);

  // Calculer les produits avec leurs besoins et répartition
  const produitsAvecBesoins = useMemo(() => {
    const produitsActifs = (produits || []).filter(p => p.actif);
    const livraisonIds = livraisons.map(l => l.id);
    const nbLivraisons = livraisonIds.length;

    const produitsAvecQte = produitsActifs.map(produit => {
      const cdtPerso = cdtPersonnalises[produit.itm8];
      const cdtEstPersonnalise = cdtPerso !== undefined && cdtPerso > 0;

      const cdtRef = produit.cdt || 12;
      const cdt = cdtEstPersonnalise ? cdtPerso : cdtRef;
      const cdtNonCommunique = false;

      const besoinUnites = Math.ceil(produit.potentiel || produit.moyHebdo || 0);
      const besoinCartons = (cdt && cdt > 0) ? Math.ceil(besoinUnites / cdt) : 0;

      const consoJour = besoinUnites / 7;
      const modeProduit = modesStockProduits[produit.itm8] || modeStockDefaut;
      const joursStock = modeProduit === 'manuel' ? null : JOURS_STOCK[modeProduit] || JOURS_STOCK.normal;

      let stockMiniUnites;
      let stockMini;
      let stockMiniEstManuel = false;

      if (modeProduit === 'manuel' && commandeConfig.stocksMini?.[produit.itm8] !== undefined) {
        stockMini = commandeConfig.stocksMini[produit.itm8];
        stockMiniUnites = cdt ? stockMini * cdt : stockMini;
        stockMiniEstManuel = true;
      } else {
        stockMiniUnites = Math.ceil(consoJour * joursStock);
        stockMini = (cdt && cdt > 0) ? Math.ceil(stockMiniUnites / cdt) : Math.ceil(stockMiniUnites / 12);
        if (besoinUnites > 0 && stockMini < 1) stockMini = 1;
      }

      const stockActuel = commandeConfig.stocksActuels?.[produit.itm8] ?? null;

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
    let itm8ARegrouper = new Set();
    if (livraisonForte && nbLivraisons > 0) {
      const produitsAvecCommande = produitsAvecQte.filter(p => p.qteCommander > 0);
      const produitsTries = [...produitsAvecCommande].sort((a, b) => a.qteCommander - b.qteCommander);
      const nbARegrouper = Math.floor(produitsTries.length / nbLivraisons);
      for (let i = 0; i < nbARegrouper; i++) {
        if (produitsTries[i]) itm8ARegrouper.add(produitsTries[i].itm8);
      }
    }

    return produitsAvecQte.map(produit => {
      const fixeesProduit = qtesFixees[produit.itm8] || {};
      const doitEtreRegroupe = itm8ARegrouper.has(produit.itm8);
      const repartition = calculerRepartition(
        produit.qteCommander,
        fixeesProduit,
        livraisonIds,
        doitEtreRegroupe ? livraisonForte : null,
        doitEtreRegroupe ? 999999 : 0
      );
      const totalReparti = Object.values(repartition).reduce((sum, r) => sum + r.value, 0);
      const surCommande = totalReparti > produit.qteCommander;
      const estRegroupe = Object.values(repartition).some(r => r.regroupe);

      return { ...produit, repartition, surCommande, estRegroupe, doitEtreRegroupe };
    });
  }, [produits, commandeConfig.stocksMini, commandeConfig.stocksActuels, livraisons, qtesFixees, cdtPersonnalises, livraisonForte, calculerRepartition, modeStockDefaut, modesStockProduits]);

  // Synchroniser les qtés finales pour l'export MANAGER
  useEffect(() => {
    const qtesFinales = {};
    produitsAvecBesoins.forEach(p => {
      if (!p.itm8 || p.qteCommander === 0) return;
      const entry = { total: 0 };
      livraisons.forEach((liv, i) => {
        const val = p.repartition[liv.id]?.value || 0;
        entry[`liv${i + 1}`] = val;
        entry.total += val;
      });
      if (entry.total > 0) qtesFinales[p.itm8] = entry;
    });
    setCommandeConfig(prev => ({ ...prev, qtesFinales }));
  }, [produitsAvecBesoins, livraisons, setCommandeConfig]);


  // Statistiques
  const stats = useMemo(() => {
    const total = produitsAvecBesoins.length;
    const avecStock = produitsAvecBesoins.filter(p => p.stockActuel !== null).length;
    const sansStock = total - avecStock;
    const totalCartons = produitsAvecBesoins.reduce((sum, p) => sum + p.qteCommander, 0);

    const totauxParLivraison = {};
    livraisons.forEach(liv => {
      totauxParLivraison[liv.id] = produitsAvecBesoins.reduce(
        (sum, p) => sum + (p.repartition[liv.id]?.value || 0), 0
      );
    });

    return { total, avecStock, sansStock, totalCartons, totauxParLivraison };
  }, [produitsAvecBesoins, livraisons]);

  // Statistiques pour l'impression
  const statsImpression = useMemo(() => {
    const produitsSansNC = produitsAvecBesoins.filter(p => !p.cdtNonCommunique);
    const totalCartons = produitsSansNC.reduce((sum, p) => sum + p.qteCommander, 0);
    const nbProduits = produitsSansNC.length;

    const totauxParLivraison = {};
    livraisons.forEach(liv => {
      totauxParLivraison[liv.id] = produitsSansNC.reduce(
        (sum, p) => sum + (p.repartition[liv.id]?.value || 0), 0
      );
    });

    return { totalCartons, totauxParLivraison, nbProduits };
  }, [produitsAvecBesoins, livraisons]);

  // Handler: modifier quantité
  const handleQteChange = (itm8, livraisonId, value) => {
    const newValue = value === '' ? null : Math.max(0, parseInt(value) || 0);
    setQtesFixees(prev => ({
      ...prev,
      [itm8]: { ...(prev[itm8] || {}), [livraisonId]: newValue }
    }));
  };

  const handleResetLigne = (itm8) => {
    setQtesFixees(prev => {
      const newQtes = { ...prev };
      delete newQtes[itm8];
      return newQtes;
    });
  };

  const handleStockMiniChange = (itm8, value) => {
    const numValue = parseInt(value) || 0;
    setModesStockProduits(prev => ({ ...prev, [itm8]: 'manuel' }));
    onCommandeConfigChange({
      ...commandeConfig,
      stocksMini: { ...commandeConfig.stocksMini, [itm8]: numValue }
    });
  };

  const handleModeStockProduitChange = (itm8, mode) => {
    setModesStockProduits(prev => {
      if (mode === modeStockDefaut) {
        const newModes = { ...prev };
        delete newModes[itm8];
        return newModes;
      }
      return { ...prev, [itm8]: mode };
    });
  };

  const handleResetModeStock = (itm8) => {
    setModesStockProduits(prev => {
      const newModes = { ...prev };
      delete newModes[itm8];
      return newModes;
    });
    onCommandeConfigChange({
      ...commandeConfig,
      stocksMini: { ...commandeConfig.stocksMini, [itm8]: undefined }
    });
  };

  // Statistiques livraison forte
  const statsLivraisonForte = useMemo(() => {
    const nbLivraisons = livraisons.length;
    const produitsAvecCommande = produitsAvecBesoins.filter(p => p.qteCommander > 0);
    const nbTotalReferences = produitsAvecCommande.length;
    const nbARegrouper = nbLivraisons > 0 ? Math.floor(nbTotalReferences / nbLivraisons) : 0;
    const nbProduitsRegroupes = produitsAvecBesoins.filter(p => p.estRegroupe).length;
    const cartonsRegroupes = produitsAvecBesoins
      .filter(p => p.estRegroupe)
      .reduce((sum, p) => sum + p.qteCommander, 0);

    return { nbTotalReferences, nbARegrouper, nbProduitsRegroupes, cartonsRegroupes };
  }, [produitsAvecBesoins, livraisons.length]);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-[#E8E1D5]/50 rounded-lg">
            <Package className="w-6 h-6 text-[#8B1538]" />
          </div>
          <h2 className="text-2xl font-bold text-[#58595B]">Commande Multi-Livraisons</h2>
          <button
            onClick={() => setShowImpressionModal(true)}
            className="ml-auto flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            🖨️ Imprimer
          </button>
        </div>
        <p className="text-gray-500">
          Répartissez vos commandes sur plusieurs livraisons. Les quantités se recalculent automatiquement.
        </p>
      </div>

      {/* Configuration des livraisons */}
      <GestionLivraisons
        livraisons={livraisons}
        ajouterLivraison={ajouterLivraison}
        supprimerLivraison={supprimerLivraison}
        modifierDateCommande={modifierDateCommande}
        modifierDateReception={modifierDateReception}
        modeStockDefaut={modeStockDefaut}
        setModeStockDefaut={setModeStockDefaut}
        livraisonForte={livraisonForte}
        setLivraisonForte={setLivraisonForte}
        statsLivraisonForte={statsLivraisonForte}
      />

      {/* Tableau des produits */}
      <TableauCommande
        produitsAvecBesoins={produitsAvecBesoins}
        livraisons={livraisons}
        qtesFixees={qtesFixees}
        cdtPersonnalises={cdtPersonnalises}
        personnalisationProduits={personnalisationProduits}
        stats={stats}
        statsImpression={statsImpression}
        promosActives={promosActives}
        handleQteChange={handleQteChange}
        handleResetLigne={handleResetLigne}
        handleCdtChange={handleCdtChange}
        handleStockMiniChange={handleStockMiniChange}
        handleModeStockProduitChange={handleModeStockProduitChange}
        handleResetModeStock={handleResetModeStock}
        setPersonnalisationProduits={setPersonnalisationProduits}
        modeStockDefaut={modeStockDefaut}
      />

      {/* Récapitulatif et impression */}
      <RecapCommande
        stats={stats}
        livraisons={livraisons}
        showImpressionModal={showImpressionModal}
        setShowImpressionModal={setShowImpressionModal}
        produitsAvecBesoins={produitsAvecBesoins}
        magasin={magasin}
        semaine={semaine}
        annee={annee}
        statsImpression={statsImpression}
        promosActives={promosActives}
      />
    </div>
  );
};

export default OngletCommande;
