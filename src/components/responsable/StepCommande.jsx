import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Package } from 'lucide-react';
import {
  chargerConditionnements,
  isConditionnementCharge
} from '../../services/conditionnementService';
import FicheCommandeImpression from '../shared/FicheCommandeImpression';
import { formatDateInput } from '../../utils/formatUtils';
import FiltresCommande from './commande/FiltresCommande';
import TableauCommandeResp from './commande/TableauCommandeResp';
import RecapCommandeResp from './commande/RecapCommandeResp';
import PlanningLivraisons from './commande/PlanningLivraisons';
import useCommandeCalcul from './commande/useCommandeCalcul';

/**
 * StepCommande - Étape 5 du Wizard Responsable
 * Système multi-livraisons avec calcul en cascade
 */
const StepCommande = forwardRef(function StepCommande({
  produits,
  commandeConfig,
  onCommandeConfigChange,
  semaine,
  annee,
  magasin = { nom: '', code: '' },
  promosActives = []
}, ref) {
  // États locaux
  const [chargementEnCours, setChargementEnCours] = useState(false);
  const [recherche, setRecherche] = useState('');
  const [familleFiltre, setFamilleFiltre] = useState('Toutes');
  const [sectionsOuvertes, setSectionsOuvertes] = useState({
    BOULANGERIE: true,
    VIENNOISERIE: true,
    PATISSERIE: false,
    SNACKING: false,
    NEGOCE: false,
    AUTRE: false
  });

  // État pour le tri
  const [triColonne, setTriColonne] = useState(null);
  const [triOrdre, setTriOrdre] = useState('asc');

  // Livraisons par défaut (2 livraisons) avec date de commande et de réception
  const [livraisons, setLivraisons] = useState(
    commandeConfig.livraisons || [
      { id: 1, dateCommande: null, dateReception: null, label: 'Livraison 1' },
      { id: 2, dateCommande: null, dateReception: null, label: 'Livraison 2' }
    ]
  );

  // Quantités fixées manuellement par produit et par livraison
  const [qtesFixees, setQtesFixees] = useState(commandeConfig.qtesFixees || {});

  // CDT personnalisés par l'utilisateur (override du fichier de référence)
  const [cdtPersonnalises, setCdtPersonnalises] = useState(commandeConfig.cdtPersonnalises || {});

  // Livraison forte sélectionnée (null = répartition égale, ou id de la livraison forte)
  const [livraisonForte, setLivraisonForte] = useState(commandeConfig.livraisonForte || null);

  // Mode de stock par défaut : 'normal' (3 jours) ou 'court' (1.5 jours)
  const [modeStockDefaut, setModeStockDefaut] = useState(commandeConfig.modeStockDefaut || 'normal');

  // Modes de stock personnalisés par produit (override du mode par défaut)
  const [modesStockProduits, setModesStockProduits] = useState(commandeConfig.modesStockProduits || {});

  // Modal d'impression
  const [showImpressionModal, setShowImpressionModal] = useState(false);

  // Exposer la fonction d'ouverture du modal d'impression au parent
  useImperativeHandle(ref, () => ({
    ouvrirImpression: () => setShowImpressionModal(true)
  }));

  // Hook de calcul (répartition, stats, tri, filtres)
  const {
    produitsAvecBesoins,
    produitsParFamille,
    produitsFiltres,
    stats,
    statsImpression,
    statsLivraisonForte,
    trierProduits,
    familles
  } = useCommandeCalcul({
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
  });

  // Charger les conditionnements au montage
  useEffect(() => {
    const charger = async () => {
      if (!isConditionnementCharge()) {
        setChargementEnCours(true);
        try {
          await chargerConditionnements('/Data/liste des conditionements.xlsx');
        } catch (err) {
          // TODO: logger professionnel
        }
        setChargementEnCours(false);
      }
    };
    charger();
  }, []);

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
      modesStockProduits
    });
  }, [livraisons, qtesFixees, cdtPersonnalises, livraisonForte, modeStockDefaut, modesStockProduits]);

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

  // Modifier la date de commande d'une livraison
  const modifierDateCommande = (id, date) => {
    setLivraisons(livraisons.map(l =>
      l.id === id ? { ...l, dateCommande: date } : l
    ));
  };

  // Modifier la date de réception d'une livraison
  const modifierDateReception = (id, date) => {
    setLivraisons(livraisons.map(l =>
      l.id === id ? { ...l, dateReception: date } : l
    ));
  };

  // Modifier le CDT d'un produit (override manuel)
  const handleCdtChange = (itm8, value) => {
    const numValue = parseInt(value, 10);
    if (value === '' || isNaN(numValue)) {
      setCdtPersonnalises(prev => {
        const newCdt = { ...prev };
        delete newCdt[itm8];
        return newCdt;
      });
    } else if (numValue > 0) {
      setCdtPersonnalises(prev => ({
        ...prev,
        [itm8]: numValue
      }));
    }
  };

  // Handler: modifier quantité pour une livraison (fixer manuellement)
  const handleQteChange = (itm8, livraisonId, value) => {
    const newValue = value === '' ? null : Math.max(0, parseInt(value) || 0);
    setQtesFixees(prev => ({
      ...prev,
      [itm8]: {
        ...(prev[itm8] || {}),
        [livraisonId]: newValue
      }
    }));
  };

  // Handler: reset une ligne (remettre tout en auto)
  const handleResetLigne = (itm8) => {
    setQtesFixees(prev => {
      const newQtes = { ...prev };
      delete newQtes[itm8];
      return newQtes;
    });
  };

  // Handler: modifier stock mini (passe en mode manuel)
  const handleStockMiniChange = (itm8, value) => {
    const numValue = parseInt(value) || 0;
    setModesStockProduits(prev => ({
      ...prev,
      [itm8]: 'manuel'
    }));
    onCommandeConfigChange({
      ...commandeConfig,
      stocksMini: {
        ...commandeConfig.stocksMini,
        [itm8]: numValue
      }
    });
  };

  // Handler: changer le mode de stock d'un produit
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

  // Handler: reset le mode de stock d'un produit (revenir au calcul auto)
  const handleResetModeStock = (itm8) => {
    setModesStockProduits(prev => {
      const newModes = { ...prev };
      delete newModes[itm8];
      return newModes;
    });
    onCommandeConfigChange({
      ...commandeConfig,
      stocksMini: {
        ...commandeConfig.stocksMini,
        [itm8]: undefined
      }
    });
  };

  // Toggle section
  const toggleSection = (famille) => {
    setSectionsOuvertes(prev => ({
      ...prev,
      [famille]: !prev[famille]
    }));
  };

  // Handler: changer le tri
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

  // Vérifier si un produit a des modifications manuelles
  const hasManualChanges = (itm8) => {
    const fixees = qtesFixees[itm8];
    if (!fixees) return false;
    return Object.values(fixees).some(v => v !== null && v !== undefined);
  };

  // Vérifier si un produit est en promo
  const estEnPromo = useCallback((itm8) => {
    if (!promosActives || promosActives.length === 0) return false;
    return promosActives.some(promo => promo.itm8 === itm8);
  }, [promosActives]);

  // Récupérer les infos de la promo pour un produit
  const getInfoPromo = useCallback((itm8) => {
    if (!promosActives || promosActives.length === 0) return null;
    return promosActives.find(promo => promo.itm8 === itm8);
  }, [promosActives]);

  // Affichage chargement
  if (chargementEnCours) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center gap-3 py-12">
          <div className="animate-spin w-6 h-6 border-2 border-[#ED1C24] border-t-transparent rounded-full"></div>
          <span className="text-gray-600">Chargement des conditionnements...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* ====== EN-TÊTE ÉCRAN ====== */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-[#E8E1D5]/50 rounded-lg">
            <Package className="w-6 h-6 text-[#8B1538]" />
          </div>
          <h2 className="text-2xl font-bold text-[#58595B]">Commande Multi-Livraisons</h2>
        </div>
        <p className="text-gray-500">
          Répartissez vos commandes sur plusieurs livraisons. Les quantités se recalculent automatiquement.
        </p>
      </div>

      {/* Configuration des livraisons */}
      <PlanningLivraisons
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

      {/* Filtres et alertes */}
      <FiltresCommande
        recherche={recherche}
        setRecherche={setRecherche}
        familleFiltre={familleFiltre}
        setFamilleFiltre={setFamilleFiltre}
        familles={familles}
        stats={stats}
      />

      {/* Tableau des besoins */}
      <TableauCommandeResp
        produitsFiltres={produitsFiltres}
        produitsParFamille={produitsParFamille}
        livraisons={livraisons}
        stats={stats}
        statsImpression={statsImpression}
        sectionsOuvertes={sectionsOuvertes}
        toggleSection={toggleSection}
        triColonne={triColonne}
        triOrdre={triOrdre}
        handleTri={handleTri}
        trierProduits={trierProduits}
        qtesFixees={qtesFixees}
        cdtPersonnalises={cdtPersonnalises}
        hasManualChanges={hasManualChanges}
        estEnPromo={estEnPromo}
        getInfoPromo={getInfoPromo}
        handleQteChange={handleQteChange}
        handleResetLigne={handleResetLigne}
        handleCdtChange={handleCdtChange}
        handleStockMiniChange={handleStockMiniChange}
        handleModeStockProduitChange={handleModeStockProduitChange}
        handleResetModeStock={handleResetModeStock}
        promosActives={promosActives}
      />

      {/* Résumé par livraison */}
      <RecapCommandeResp
        stats={stats}
        livraisons={livraisons}
      />

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
});

export default StepCommande;
