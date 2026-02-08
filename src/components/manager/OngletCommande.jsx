import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Package, Search, Calendar, AlertTriangle, ChevronDown, ChevronRight, ChevronUp, Info, Plus, X, RotateCcw } from 'lucide-react';
import FicheCommandeImpression from '../shared/FicheCommandeImpression';
import { formatDateInput, formatDateCourt } from '../../utils/formatUtils';
import { useMagasin } from '../../contexts/MagasinContext';

/**
 * OngletCommande - Module Commande Multi-Livraisons (V5)
 * Migré depuis StepCommande V4, utilise useMagasin() au lieu des props
 */
const ORDRE_FAMILLES = ['BOULANGERIE', 'VIENNOISERIE', 'PATISSERIE', 'SNACKING', 'AUTRE'];

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
  const [recherche, setRecherche] = useState('');
  const [familleFiltre, setFamilleFiltre] = useState('Toutes');
  const [sectionsOuvertes, setSectionsOuvertes] = useState({
    BOULANGERIE: true,
    VIENNOISERIE: true,
    PATISSERIE: true,
    SNACKING: true,
    NEGOCE: true,
    AUTRE: true
  });

  // État pour le tri
  const [triColonne, setTriColonne] = useState(null);
  const [triOrdre, setTriOrdre] = useState('asc');

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
  // Structure: { [identifiant]: { programmeCuisson: 'P1', unitesParPlaque: 12 } }
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

      // CDT depuis produitsGamme (colonne "CDT achat"), fallback 12
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
    // Mise à jour silencieuse (ne déclenche pas la boucle de sync car on ne touche pas les deps surveillés)
    setCommandeConfig(prev => ({ ...prev, qtesFinales }));
  }, [produitsAvecBesoins, livraisons, setCommandeConfig]);

  // Grouper par famille/rayon
  const produitsParFamille = useMemo(() => {
    const grouped = {};
    produitsAvecBesoins.forEach(produit => {
      const famille = produit.rayon || 'AUTRE';
      if (!grouped[famille]) grouped[famille] = [];
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

  const familles = ['Toutes', ...Object.keys(produitsParFamille).sort()];

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

  const toggleSection = (famille) => {
    setSectionsOuvertes(prev => ({ ...prev, [famille]: !prev[famille] }));
  };

  const handleTri = (colonne) => {
    if (triColonne === colonne) {
      if (triOrdre === 'asc') {
        setTriOrdre('desc');
      } else {
        setTriColonne(null);
        setTriOrdre('asc');
      }
    } else {
      setTriColonne(colonne);
      setTriOrdre('asc');
    }
  };

  const trierProduits = useCallback((produits) => {
    if (!triColonne) return produits;
    return [...produits].sort((a, b) => {
      let valA, valB;
      switch (triColonne) {
        case 'produit':
          valA = (a.libellePersonnalise || a.libelle || '').toLowerCase();
          valB = (b.libellePersonnalise || b.libelle || '').toLowerCase();
          break;
        case 'cdt': valA = a.cdt || 0; valB = b.cdt || 0; break;
        case 'mini': valA = a.stockMini || 0; valB = b.stockMini || 0; break;
        case 'stock': valA = a.stockActuel ?? -1; valB = b.stockActuel ?? -1; break;
        case 'total': valA = a.qteCommander || 0; valB = b.qteCommander || 0; break;
        default:
          if (triColonne.startsWith('cmd_')) {
            const livId = parseInt(triColonne.split('_')[1]);
            valA = a.repartition[livId]?.value || 0;
            valB = b.repartition[livId]?.value || 0;
          } else { return 0; }
      }
      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(valB);
        return triOrdre === 'asc' ? cmp : -cmp;
      }
      const cmp = valA - valB;
      return triOrdre === 'asc' ? cmp : -cmp;
    });
  }, [triColonne, triOrdre]);

  const TriableHeader = ({ colonne, children, className = '' }) => {
    const isActive = triColonne === colonne;
    return (
      <th
        className={`px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none ${className}`}
        onClick={() => handleTri(colonne)}
        title={`Cliquez pour trier par ${children}`}
      >
        <div className="flex items-center justify-center gap-1">
          <span>{children}</span>
          {isActive && (
            triOrdre === 'asc'
              ? <ChevronUp className="w-3 h-3 text-[#ED1C24]" />
              : <ChevronDown className="w-3 h-3 text-[#ED1C24]" />
          )}
        </div>
      </th>
    );
  };

  const hasManualChanges = (itm8) => {
    const fixees = qtesFixees[itm8];
    if (!fixees) return false;
    return Object.values(fixees).some(v => v !== null && v !== undefined);
  };

  const estEnPromo = useCallback((itm8) => {
    if (!promosActives || promosActives.length === 0) return false;
    return promosActives.some(promo => promo.itm8 === itm8);
  }, [promosActives]);

  const getInfoPromo = useCallback((itm8) => {
    if (!promosActives || promosActives.length === 0) return null;
    return promosActives.find(promo => promo.itm8 === itm8);
  }, [promosActives]);

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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 print:hidden no-print">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[#58595B] flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Planning des commandes ({livraisons.length})
          </h3>
          {livraisons.length < 3 && (
            <button
              onClick={ajouterLivraison}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[#ED1C24] text-white rounded-lg hover:bg-[#8B1538] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Ajouter une livraison
            </button>
          )}
        </div>

        {/* Tableau horizontal des livraisons */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32"></th>
                {livraisons.map((liv, index) => (
                  <th key={liv.id} className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${
                        index === 0 ? 'bg-[#ED1C24] text-white' :
                        index === 1 ? 'bg-[#8B1538] text-white' :
                        'bg-[#58595B] text-white'
                      }`}>{index + 1}</span>
                      <span className="font-semibold text-[#58595B]">Livraison {index + 1}</span>
                      {livraisons.length > 2 && (
                        <button
                          onClick={() => supprimerLivraison(liv.id)}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Supprimer cette livraison"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <div className="w-2 h-2 rounded-full bg-[#ED1C24]"></div>
                    Date de commande
                  </div>
                </td>
                {livraisons.map((liv) => (
                  <td key={liv.id} className="px-3 py-3 text-center">
                    <input
                      type="date"
                      value={liv.dateCommande || ''}
                      onChange={(e) => modifierDateCommande(liv.id, e.target.value)}
                      className="px-3 py-2 border border-[#E8E1D5] rounded-lg focus:ring-2 focus:ring-[#ED1C24]/20 focus:border-[#ED1C24] text-center font-medium text-[#58595B] bg-[#E8E1D5]/20"
                    />
                    {liv.dateCommande && (
                      <p className="mt-1 text-xs text-[#8B1538]">{formatDateCourt(liv.dateCommande)}</p>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    Date de réception
                  </div>
                </td>
                {livraisons.map((liv) => (
                  <td key={liv.id} className="px-3 py-3 text-center">
                    <input
                      type="date"
                      value={liv.dateReception || ''}
                      onChange={(e) => modifierDateReception(liv.id, e.target.value)}
                      className="px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-center font-medium text-[#58595B] bg-green-50/50"
                    />
                    {liv.dateReception && (
                      <p className="mt-1 text-xs text-green-600">{formatDateCourt(liv.dateReception)}</p>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Configuration du stock de sécurité */}
        <div className="mt-4 p-4 bg-green-50/50 border border-green-200 rounded-lg">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <h4 className="font-medium text-[#58595B] mb-1">Stock de sécurité</h4>
              <p className="text-sm text-gray-600">
                Calculé automatiquement selon la consommation journalière (ventes hebdo ÷ 7).
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Mode par défaut :</label>
              <div className="flex rounded-lg overflow-hidden border border-green-300">
                <button
                  onClick={() => setModeStockDefaut('normal')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    modeStockDefaut === 'normal' ? 'bg-green-600 text-white' : 'bg-white text-gray-700 hover:bg-green-50'
                  }`}
                >Normal (3j)</button>
                <button
                  onClick={() => setModeStockDefaut('court')}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-l border-green-300 ${
                    modeStockDefaut === 'court' ? 'bg-amber-500 text-white' : 'bg-white text-gray-700 hover:bg-amber-50'
                  }`}
                >Court (1.5j)</button>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-green-200 text-sm text-gray-600">
            <span className="font-medium">Exemple :</span> Produit avec 70 unités/sem → 10 unités/jour →
            <span className="font-semibold text-green-700"> Normal: 30 unités</span> |
            <span className="font-semibold text-amber-600"> Court: 15 unités</span>
          </div>
        </div>

        {/* Sélection livraison forte */}
        <div className="mt-4 p-4 bg-[#E8E1D5]/30 border border-[#E8E1D5] rounded-lg">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <h4 className="font-medium text-[#58595B] mb-1">Optimisation des livraisons</h4>
              <p className="text-sm text-gray-600">
                Regroupez les petites commandes sur une livraison pour réduire les réceptions.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Livraison forte :</label>
              <select
                value={livraisonForte || ''}
                onChange={(e) => setLivraisonForte(e.target.value ? parseInt(e.target.value) : null)}
                className="px-3 py-2 border border-[#E8E1D5] rounded-lg focus:ring-2 focus:ring-[#ED1C24]/20 focus:border-[#ED1C24] bg-white font-medium text-[#58595B]"
              >
                <option value="">Répartition égale</option>
                {livraisons.map((liv, index) => (
                  <option key={liv.id} value={liv.id}>
                    Livraison {index + 1} {liv.dateReception ? `(${formatDateCourt(liv.dateReception).split(' ')[0]})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {livraisonForte && (
            <div className="mt-3 pt-3 border-t border-[#E8E1D5] flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Références commandées :</span>
                <span className="font-bold text-[#58595B]">{statsLivraisonForte.nbTotalReferences}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Références regroupées :</span>
                <span className="font-bold text-[#ED1C24]">{statsLivraisonForte.nbProduitsRegroupes} / {statsLivraisonForte.nbARegrouper}</span>
                <span className="text-gray-500 text-xs">(les plus petites qtés)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Cartons regroupés :</span>
                <span className="font-bold text-green-600">{statsLivraisonForte.cartonsRegroupes}</span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-2">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">
            Les quantités sont réparties automatiquement. Modifiez une cellule pour fixer sa valeur,
            les autres se recalculeront. Cliquez sur ↺ pour remettre une ligne en mode automatique.
          </p>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un produit..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ED1C24]/20 focus:border-[#ED1C24]"
            />
          </div>
          <select
            value={familleFiltre}
            onChange={(e) => setFamilleFiltre(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ED1C24]/20 focus:border-[#ED1C24]"
          >
            {familles.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Alerte stock manquant */}
      {stats.sansStock > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-700">
              {stats.sansStock} produit{stats.sansStock > 1 ? 's' : ''} sans stock renseigné
            </p>
            <p className="text-sm text-amber-600">
              Demandez à l'équipe de saisir l'inventaire pour optimiser les commandes.
            </p>
          </div>
        </div>
      )}

      {/* Tableau des besoins avec multi-livraisons */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:border-0 print:rounded-none print-table-container">
        <div className="px-6 py-4 border-b border-gray-200 print:hidden">
          <h3 className="font-semibold text-[#58595B]">
            Tableau des besoins ({produitsFiltres.length} produits)
          </h3>
        </div>

        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full print:text-xs">
            <thead className="bg-gray-50 print:bg-gray-200">
              <tr>
                <TriableHeader colonne="produit" className="text-left w-auto px-3">Produit</TriableHeader>
                <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase w-14">Cuisson</th>
                <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase w-14">U/Plq</th>
                <TriableHeader colonne="cdt" className="w-14">CDT</TriableHeader>
                <TriableHeader colonne="mini" className="w-16">Mini</TriableHeader>
                <TriableHeader colonne="stock" className="w-16">Stock</TriableHeader>
                <TriableHeader colonne="total" className="w-20 bg-[#ED1C24]/10">À CMD</TriableHeader>
                {livraisons.map((liv, i) => (
                  <TriableHeader key={liv.id} colonne={`cmd_${liv.id}`} className="w-20 bg-blue-50">
                    <div className="flex flex-col items-center">
                      <span>Liv {i + 1}</span>
                      <span className="text-[10px] font-normal normal-case print:text-[8px]">
                        {liv.dateReception ? formatDateCourt(liv.dateReception).split(' ')[0] : '-'}
                      </span>
                    </div>
                  </TriableHeader>
                ))}
                <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase w-10 print:hidden"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {Object.entries(produitsParFamille)
                .sort(([a], [b]) => {
                  const ia = ORDRE_FAMILLES.indexOf(a);
                  const ib = ORDRE_FAMILLES.indexOf(b);
                  return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
                })
                .map(([famille, produitsFamille]) => {
                const produitsAffiches = produitsFamille.filter(p => produitsFiltres.includes(p));
                if (produitsAffiches.length === 0) return null;
                // Masquer les familles où toutes les qtés à commander sont 0
                const familleADesQtes = produitsAffiches.some(p => p.qteCommander > 0);
                if (!familleADesQtes) return null;

                const produitsAffichesTries = trierProduits(produitsAffiches);
                const isOuvert = sectionsOuvertes[famille];
                const totalFamilleCartons = produitsAffiches.reduce((sum, p) => sum + p.qteCommander, 0);

                const totauxFamilleParLivraison = {};
                livraisons.forEach(liv => {
                  totauxFamilleParLivraison[liv.id] = produitsAffiches.reduce(
                    (sum, p) => sum + (p.repartition[liv.id]?.value || 0), 0
                  );
                });

                const produitsAImprimer = produitsAffiches.filter(p => !p.cdtNonCommunique);
                const totalFamilleCartonsImpr = produitsAImprimer.reduce((sum, p) => sum + p.qteCommander, 0);
                const totauxFamilleParLivraisonImpr = {};
                livraisons.forEach(liv => {
                  totauxFamilleParLivraisonImpr[liv.id] = produitsAImprimer.reduce(
                    (sum, p) => sum + (p.repartition[liv.id]?.value || 0), 0
                  );
                });

                return (
                  <React.Fragment key={famille}>
                    <tr
                      className="bg-[#E8E1D5]/30 cursor-pointer hover:bg-[#E8E1D5]/50 print:bg-gray-300 print:cursor-default print-famille-header"
                      onClick={() => toggleSection(famille)}
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2 font-medium text-[#58595B]">
                          <span className="print:hidden">{isOuvert ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</span>
                          <span className="print:hidden">
                            {famille === 'BOULANGERIE' && '🥖'}
                            {famille === 'VIENNOISERIE' && '🥐'}
                            {famille === 'PATISSERIE' && '🎂'}
                            {famille === 'SNACKING' && '🥪'}
                            {famille === 'NEGOCE' && '📦'}
                            {!['BOULANGERIE', 'VIENNOISERIE', 'PATISSERIE', 'SNACKING', 'NEGOCE'].includes(famille) && '📋'}
                          </span>
                          <span>{famille}</span>
                          <span className="print:hidden">({produitsAffiches.length})</span>
                          <span className="hidden print:inline">({produitsAImprimer.length})</span>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center text-xs text-gray-400">-</td>
                      <td className="px-2 py-2 text-center text-xs text-gray-400">-</td>
                      <td className="px-2 py-2 text-center text-xs text-gray-400">-</td>
                      <td className="px-2 py-2 text-center text-xs text-gray-400">-</td>
                      <td className="px-2 py-2 text-center text-xs text-gray-400">-</td>
                      <td className="px-2 py-2 text-center font-semibold text-[#ED1C24] bg-[#ED1C24]/5 print:bg-transparent">
                        <span className="print:hidden">{totalFamilleCartons}</span>
                        <span className="hidden print:inline">{totalFamilleCartonsImpr}</span>
                      </td>
                      {livraisons.map(liv => (
                        <td key={liv.id} className="px-2 py-2 text-center font-semibold text-blue-700 bg-blue-50/50 print:bg-transparent">
                          <span className="print:hidden">{totauxFamilleParLivraison[liv.id] || 0}</span>
                          <span className="hidden print:inline">{totauxFamilleParLivraisonImpr[liv.id] || 0}</span>
                        </td>
                      ))}
                      <td className="print:hidden"></td>
                    </tr>

                    {isOuvert && produitsAffichesTries.map(produit => {
                      const hasChanges = hasManualChanges(produit.itm8);
                      const produitEnPromo = estEnPromo(produit.itm8);
                      const infoPromo = produitEnPromo ? getInfoPromo(produit.itm8) : null;

                      return (
                        <tr
                          key={produit.id}
                          className={`hover:bg-gray-50 ${produit.surCommande ? 'bg-red-50' : ''} ${produitEnPromo ? 'bg-amber-50 border-l-4 border-l-amber-400' : ''} ${produit.cdtNonCommunique ? 'print:hidden' : ''}`}
                        >
                          <td className="px-3 py-2 print:px-1 print:py-1">
                            <div className="font-medium text-gray-900 text-sm print:text-xs flex items-center gap-1.5">
                              {produitEnPromo && (
                                <span className="text-amber-500 flex-shrink-0" title={`En promo : ${infoPromo?.promotion || 'Promotion active'}`}>⭐</span>
                              )}
                              <span>{produit.libellePersonnalise || produit.libelle}</span>
                              {produitEnPromo && infoPromo?.promotion && (
                                <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-normal ml-1 print:hidden">
                                  {infoPromo.promotion}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 print:hidden">
                              EAN: {produit.codeEAN || produit.itm8}
                            </div>
                          </td>
                          {/* Programme cuisson */}
                          <td className="px-1 py-2 text-center print:px-1 print:py-1">
                            <input
                              type="text"
                              value={personnalisationProduits[produit.itm8]?.programmeCuisson ?? produit.programme ?? ''}
                              onChange={(e) => setPersonnalisationProduits(prev => ({
                                ...prev,
                                [produit.itm8]: { ...prev[produit.itm8], programmeCuisson: e.target.value }
                              }))}
                              placeholder="-"
                              className="w-12 px-1 py-1 text-sm text-center border border-gray-200 rounded focus:ring-1 focus:ring-[#8B1538] focus:border-[#8B1538] placeholder:text-gray-300"
                              title="Programme de cuisson (ex: P1, P2...)"
                            />
                          </td>
                          {/* Unités par plaque */}
                          <td className="px-1 py-2 text-center print:px-1 print:py-1">
                            <input
                              type="number"
                              min="1"
                              value={personnalisationProduits[produit.itm8]?.unitesParPlaque ?? produit.unitesParPlaque ?? ''}
                              onChange={(e) => setPersonnalisationProduits(prev => ({
                                ...prev,
                                [produit.itm8]: { ...prev[produit.itm8], unitesParPlaque: parseInt(e.target.value) || 0 }
                              }))}
                              placeholder="-"
                              className="w-12 px-1 py-1 text-sm text-center border border-gray-200 rounded focus:ring-1 focus:ring-[#8B1538] focus:border-[#8B1538] placeholder:text-gray-300"
                              title="Nombre d'unités par plaque"
                            />
                          </td>
                          <td className="px-2 py-2 text-center print:px-1 print:py-1">
                            <span className="print:hidden">
                              {produit.cdtNonCommunique ? (
                                <input
                                  type="text"
                                  placeholder="NC"
                                  value={cdtPersonnalises[produit.itm8] || ''}
                                  onChange={(e) => handleCdtChange(produit.itm8, e.target.value)}
                                  className="w-14 px-1 py-1 text-sm text-center border border-amber-400 bg-amber-50 text-amber-600 rounded focus:ring-1 focus:ring-purple-500 focus:border-purple-500 placeholder:text-amber-400 placeholder:font-medium"
                                  title="Non Communiqué - Saisir un CDT pour activer le calcul"
                                />
                              ) : (
                                <input
                                  type="number"
                                  min="1"
                                  value={produit.cdt}
                                  onChange={(e) => handleCdtChange(produit.itm8, e.target.value)}
                                  className={`w-14 px-1 py-1 text-sm text-center border rounded transition-colors ${
                                    produit.cdtEstPersonnalise
                                      ? 'border-purple-400 bg-purple-50 text-purple-700 font-medium'
                                      : 'border-gray-300 text-gray-600'
                                  } focus:ring-1 focus:ring-purple-500 focus:border-purple-500`}
                                  title={
                                    produit.cdtEstPersonnalise
                                      ? 'CDT modifié manuellement (effacer pour revenir au CDT référence)'
                                      : 'CDT du fichier référence - modifiable'
                                  }
                                />
                              )}
                            </span>
                            <span className="hidden print:inline text-xs">{produit.cdt || '-'}</span>
                          </td>
                          <td className="px-2 py-2 text-center print:px-1 print:py-1">
                            <span className="print:hidden">
                              <div className="flex flex-col items-center gap-0.5">
                                <input
                                  type="number"
                                  min="0"
                                  value={produit.stockMini}
                                  onChange={(e) => handleStockMiniChange(produit.itm8, e.target.value)}
                                  className={`w-14 px-1 py-1 text-sm text-center border rounded transition-colors ${
                                    produit.stockMiniEstManuel
                                      ? 'border-purple-400 bg-purple-50 text-purple-700 font-medium'
                                      : produit.modeProduit === 'court'
                                        ? 'border-amber-400 bg-amber-50 text-amber-700'
                                        : 'border-green-400 bg-green-50 text-green-700'
                                  } focus:ring-1 focus:ring-green-500 focus:border-green-500`}
                                  title={`Stock mini: ${produit.stockMini} cartons (${Math.round(produit.stockMiniUnites)} unités) - Mode: ${produit.stockMiniEstManuel ? 'Manuel' : produit.modeProduit === 'court' ? 'Court 1.5j' : 'Normal 3j'}`}
                                />
                                <button
                                  onClick={() => {
                                    if (produit.stockMiniEstManuel) {
                                      handleResetModeStock(produit.itm8);
                                    } else {
                                      const nextMode = produit.modeProduit === 'normal' ? 'court' : 'normal';
                                      handleModeStockProduitChange(produit.itm8, nextMode);
                                    }
                                  }}
                                  className={`text-[9px] px-1 rounded transition-colors ${
                                    produit.stockMiniEstManuel
                                      ? 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                                      : produit.modeProduit === 'court'
                                        ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                                        : 'bg-green-100 text-green-600 hover:bg-green-200'
                                  }`}
                                  title={produit.stockMiniEstManuel ? 'Cliquer pour revenir au mode auto' : 'Cliquer pour changer de mode'}
                                >
                                  {produit.stockMiniEstManuel ? '✎' : produit.modeProduit === 'court' ? '1.5j' : '3j'}
                                </button>
                              </div>
                            </span>
                            <span className="hidden print:inline text-xs">{produit.stockMini}</span>
                          </td>
                          <td className="px-2 py-2 text-center text-sm text-gray-600 print:px-1 print:py-1 print:text-xs">
                            {produit.stockActuel !== null ? produit.stockActuel : <span className="text-gray-400">--</span>}
                          </td>
                          <td className="px-2 py-2 text-center bg-[#ED1C24]/5 print:bg-transparent print:px-1 print:py-1 print-total-col">
                            <span className={`font-bold text-sm print:text-xs ${produit.qteCommander > 0 ? 'text-[#ED1C24] print:text-black' : 'text-gray-400'}`}>
                              {produit.qteCommander}
                            </span>
                          </td>
                          {livraisons.map(liv => {
                            const rep = produit.repartition[liv.id];
                            const isAuto = rep?.isAuto;
                            const value = rep?.value || 0;

                            return (
                              <td key={liv.id} className="px-2 py-2 text-center bg-blue-50/50 print:bg-transparent print:px-1 print:py-1 print-cmd-col">
                                <span className="print:hidden">
                                  <input
                                    type="number"
                                    min="0"
                                    value={isAuto ? value : (qtesFixees[produit.itm8]?.[liv.id] ?? '')}
                                    onChange={(e) => handleQteChange(produit.itm8, liv.id, e.target.value)}
                                    placeholder={isAuto ? value.toString() : ''}
                                    className={`w-14 px-1 py-1 text-sm text-center border rounded transition-colors ${
                                      isAuto
                                        ? 'border-gray-200 bg-gray-50 text-gray-500'
                                        : 'border-blue-400 bg-blue-100 text-blue-800 font-medium'
                                    } focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                                    title={isAuto ? 'Calculé automatiquement' : 'Valeur fixée manuellement'}
                                  />
                                </span>
                                <span className="hidden print:inline text-xs font-medium">{value}</span>
                              </td>
                            );
                          })}
                          <td className="px-2 py-2 text-center print:hidden">
                            {hasChanges && (
                              <button
                                onClick={() => handleResetLigne(produit.itm8)}
                                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Remettre en mode automatique"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}

              {/* Ligne de totaux */}
              <tr className="bg-gray-100 font-semibold print:bg-gray-300 print-totaux">
                <td colSpan={6} className="px-3 py-3 text-right text-sm text-gray-700 print:text-xs print:font-bold">
                  TOTAUX
                </td>
                <td className="px-2 py-3 text-center text-[#ED1C24] bg-[#ED1C24]/10 print:bg-transparent print:text-black print:font-bold">
                  <span className="print:hidden">{stats.totalCartons}</span>
                  <span className="hidden print:inline">{statsImpression.totalCartons}</span>
                </td>
                {livraisons.map(liv => (
                  <td key={liv.id} className="px-2 py-3 text-center text-blue-700 bg-blue-100 print:bg-transparent print:text-black print:font-bold">
                    <span className="print:hidden">{stats.totauxParLivraison[liv.id] || 0}</span>
                    <span className="hidden print:inline">{statsImpression.totauxParLivraison[liv.id] || 0}</span>
                  </td>
                ))}
                <td className="print:hidden"></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-500 print:hidden no-print">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-gray-50 border border-gray-200 rounded"></span> Commande auto
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-blue-100 border border-blue-400 rounded"></span> Commande fixée
          </span>
          <span>|</span>
          <span className="flex items-center gap-1">
            <span className="text-[9px] bg-green-100 text-green-600 px-1 rounded">3j</span> Stock normal
          </span>
          <span className="flex items-center gap-1">
            <span className="text-[9px] bg-amber-100 text-amber-600 px-1 rounded">1.5j</span> Stock court
          </span>
          <span className="flex items-center gap-1">
            <span className="text-[9px] bg-purple-100 text-purple-600 px-1 rounded">✎</span> Stock manuel
          </span>
          {promosActives && promosActives.length > 0 && (
            <>
              <span>|</span>
              <span className="flex items-center gap-1">
                <span className="text-amber-500">⭐</span>
                <span className="bg-amber-50 border-l-2 border-l-amber-400 px-1">En promo ({promosActives.length})</span>
              </span>
            </>
          )}
        </div>
      </div>

      {/* Résumé par livraison */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 print:hidden no-print">
        <h3 className="font-semibold text-[#58595B] mb-4">Résumé par livraison</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-[#ED1C24]/10 rounded-lg">
            <p className="text-2xl font-bold text-[#8B1538]">{stats.totalCartons}</p>
            <p className="text-sm text-gray-600">Total à commander</p>
          </div>
          {livraisons.map((liv, i) => (
            <div key={liv.id} className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-700">{stats.totauxParLivraison[liv.id] || 0}</p>
              <p className="text-sm text-gray-600">Livraison {i + 1}</p>
              {liv.dateReception && <p className="text-xs text-gray-400">{formatDateCourt(liv.dateReception)}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Modal d'impression */}
      <FicheCommandeImpression
        isVisible={showImpressionModal}
        onClose={() => setShowImpressionModal(false)}
        produits={produitsAvecBesoins}
        livraisons={livraisons}
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
