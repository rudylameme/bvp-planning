import { useState, useMemo, useEffect, useCallback } from 'react';

// Sub-components
import ModalEditionProduit from './planning/ModalEditionProduit';
import ModalGestionProgrammes from './planning/ModalGestionProgrammes';
import FamilleSection from './planning/FamilleSection';
import { handlePrintPlanningPro, handlePrintSemaine } from './planning/SectionImpression';
import { handleExportExcel } from './planning/exportExcel';
import { EnTetePlanning, BarreInfoCreneaux, Legende3Lignes, SelecteurJour } from './planning/BarreOutils';
import useDragReorder from '../../hooks/useDragReorder';

// Constants
import { PREFS_KEY, PRODUITS_MODIFIES_KEY, PROGRAMMES_KEY, JOURS, getJourActuel, getTrancheActuelle } from './planning/constants';

// Helpers
import { isCreneauFerme as isCreneauFermeHelper, isJourFerme as isJourFermeHelper, getDateJour as getDateJourHelper } from './planning/helpers';
import { calculerQuantites as calculerQuantitesBase, calculerTotauxFamille as calculerTotauxFamilleBase } from './planning/calculerQuantites';
import { processSaveProgrammes } from './planning/handleSaveProgrammes';

// Hooks
import { useColonnesVisibles, colonnesFromGroups, TRANCHES_DEFAUT_PAR_FAMILLE, tranchesParFamilleFromNbTranches } from './planning/useColonnesVisibles';
import { useProduitsParFamille, useFamillesTriees, useGetProgrammesOrdonnes } from './planning/useProduitsGroupes';

/**
 * Composant Planning du Jour pour l'équipe
 * Affiche les quantités à produire par tranche horaire selon la fréquentation
 */
export default function PlanningJour({ donneesMagasin }) {
  // Sélectionner le jour actuel par défaut
  const [jourSelectionne, setJourSelectionne] = useState(JOURS[getJourActuel()]);
  const [affichage, setAffichage] = useState('unites'); // 'unites' ou 'plaques'

  // Créneau horaire actuel (pour mise en surbrillance)
  const [trancheActuelle, setTrancheActuelle] = useState(getTrancheActuelle());

  // Mode simplifié : n'affiche que les quantités (pas Histo/%)
  const [modeSimplifie, setModeSimplifie] = useState(true);

  // Mode d'impression : 'continu' (défaut) ou 'separe' (persisté dans localStorage)
  const [modeImpression, setModeImpressionState] = useState(() => {
    try {
      return localStorage.getItem('bvp_impression_mode') || 'continu';
    } catch { return 'continu'; }
  });
  const setModeImpression = useCallback((mode) => {
    setModeImpressionState(mode);
    try { localStorage.setItem('bvp_impression_mode', mode); } catch {}
  }, []);

  // Familles sélectionnées pour l'impression (objet { BOULANGERIE: true, ... } ou null = toutes)
  const [famillesImpression, setFamillesImpressionState] = useState(() => {
    try {
      const saved = localStorage.getItem('bvp_impression_familles');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null; // null = toutes sélectionnées par défaut
  });
  const setFamillesImpression = useCallback((familles) => {
    setFamillesImpressionState(familles);
    try { localStorage.setItem('bvp_impression_familles', JSON.stringify(familles)); } catch {}
  }, []);

  // État pour le tri multi-colonnes
  const [sortConfig, setSortConfig] = useState({
    key: 'famille',
    direction: 'asc'
  });

  // État pour les sections dépliables (familles et programmes)
  const [sectionsOuvertes, setSectionsOuvertes] = useState({
    familles: {},
    programmes: {}
  });

  // État pour l'ordre personnalisé des familles et programmes
  const [ordrePersonnalise, setOrdrePersonnalise] = useState({
    familles: null,
    programmes: {}
  });

  // État pour l'édition des produits
  const [produitEnEdition, setProduitEnEdition] = useState(null);
  const [showModalProgrammes, setShowModalProgrammes] = useState(false);

  // Modifications de produits persistées
  const [produitsModifies, setProduitsModifies] = useState({});

  // Programmes personnalisés
  const [programmesPersonnalises, setProgrammesPersonnalises] = useState(null);

  const { configuration, frequentation, produits: produitsOriginaux } = donneesMagasin;

  // Tranches par famille (nouveau format) avec rétrocompatibilité
  const tranchesParFamille = useMemo(() => {
    if (configuration?.tranchesParFamille) {
      return configuration.tranchesParFamille;
    }
    // Rétrocompatibilité : convertir nbTranches global en per-family
    const nb = configuration?.nbTranches || 4;
    const familles = [...new Set((produitsOriginaux || []).map(p => p.famille).filter(Boolean))];
    if (familles.length === 0) familles.push('BOULANGERIE', 'VIENNOISERIE', 'PATISSERIE', 'SNACKING', 'AUTRE');
    return tranchesParFamilleFromNbTranches(nb, familles);
  }, [configuration?.tranchesParFamille, configuration?.nbTranches, produitsOriginaux]);

  // Nombre de tranches max (pour BarreInfoCreneaux)
  const nbTranchesMax = useMemo(() => {
    const counts = Object.values(tranchesParFamille).map(g => g?.length || 4);
    return counts.length > 0 ? Math.max(...counts) : 4;
  }, [tranchesParFamille]);

  // Appliquer les modifications aux produits
  const produits = useMemo(() => {
    return produitsOriginaux.map(produit => {
      const modif = produitsModifies[produit.id];
      if (modif) {
        return {
          ...produit,
          libellePersonnalise: modif.libelle,
          famille: modif.famille,
          programme: modif.programme,
          plu: modif.plu,
          unitesParPlaque: modif.unitesParPlaque,
          unitesParLot: modif.unitesParLot || produit.unitesParLot,
        };
      }
      return produit;
    });
  }, [produitsOriginaux, produitsModifies]);

  // Mise à jour du créneau actuel toutes les minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setTrancheActuelle(getTrancheActuelle());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Charger les préférences au démarrage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PREFS_KEY);
      if (saved) {
        const prefs = JSON.parse(saved);
        if (prefs.sectionsOuvertes) setSectionsOuvertes(prefs.sectionsOuvertes);
        if (prefs.ordrePersonnalise) setOrdrePersonnalise(prefs.ordrePersonnalise);
      }
    } catch {
      // Ignorer les erreurs de parsing
    }
  }, []);

  // Charger les produits modifiés au démarrage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PRODUITS_MODIFIES_KEY);
      if (saved) {
        setProduitsModifies(JSON.parse(saved));
      }
    } catch {
      // Ignorer les erreurs
    }
  }, []);

  // Charger les programmes personnalisés au démarrage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PROGRAMMES_KEY);
      if (saved) {
        setProgrammesPersonnalises(JSON.parse(saved));
      }
    } catch {
      // Ignorer les erreurs
    }
  }, []);

  // Sauvegarder les préférences quand elles changent
  const sauvegarderPrefs = useCallback((sections, ordre) => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({
        sectionsOuvertes: sections,
        ordrePersonnalise: ordre
      }));
    } catch {
      // Ignorer les erreurs de localStorage
    }
  }, []);

  // Réinitialiser les préférences
  const reinitialiserPrefs = useCallback(() => {
    setSectionsOuvertes({ familles: {}, programmes: {} });
    setOrdrePersonnalise({ familles: null, programmes: {} });
    localStorage.removeItem(PREFS_KEY);
  }, []);

  // Sauvegarder les modifications d'un produit
  const handleSaveProduit = useCallback((modifications) => {
    if (!produitEnEdition) return;

    const newModifs = {
      ...produitsModifies,
      [produitEnEdition.id]: modifications
    };

    setProduitsModifies(newModifs);

    try {
      localStorage.setItem(PRODUITS_MODIFIES_KEY, JSON.stringify(newModifs));
    } catch {
      // Ignorer les erreurs
    }

    setProduitEnEdition(null);
  }, [produitEnEdition, produitsModifies]);

  // Obtenir la liste des programmes actuels (personnalisés ou issus des produits)
  const programmesActuels = useMemo(() => {
    if (programmesPersonnalises && programmesPersonnalises.length > 0) {
      return programmesPersonnalises;
    }

    const programmeSet = new Set();
    produits.forEach(p => {
      if (p.programme) programmeSet.add(p.programme);
    });
    return Array.from(programmeSet).sort();
  }, [programmesPersonnalises, produits]);

  // Compter les produits par programme (avec normalisation)
  const produitsParProgramme = useMemo(() => {
    const counts = {};
    produits.forEach(p => {
      let prog = p.programme || '';
      const normProg = prog.toLowerCase().replace(/^--\s*|\s*--$/g, '').trim();
      if (!normProg || normProg === 'sans programme' || normProg === 'sans cuisson') {
        prog = 'Sans cuisson';
      }
      counts[prog] = (counts[prog] || 0) + 1;
    });
    return counts;
  }, [produits]);

  // Sauvegarder les programmes (logique extraite dans handleSaveProgrammes.js)
  const handleSaveProgrammes = useCallback((nouveauxProgrammes) => {
    const { newModifs, hasRenommages } = processSaveProgrammes(
      nouveauxProgrammes, programmesActuels, produitsModifies, produitsOriginaux
    );
    if (hasRenommages) setProduitsModifies(newModifs);
    setProgrammesPersonnalises(nouveauxProgrammes);
  }, [produitsModifies, produitsOriginaux, programmesActuels]);

  // Toggle une section famille (ouvert/fermé)
  const toggleFamille = useCallback((famille) => {
    setSectionsOuvertes(prev => {
      const newSections = {
        ...prev,
        familles: {
          ...prev.familles,
          [famille]: prev.familles[famille] === false ? true : false
        }
      };
      sauvegarderPrefs(newSections, ordrePersonnalise);
      return newSections;
    });
  }, [ordrePersonnalise, sauvegarderPrefs]);

  // Toggle une section programme (ouvert/fermé)
  const toggleProgramme = useCallback((famille, programme) => {
    const key = `${famille}_${programme}`;
    setSectionsOuvertes(prev => {
      const newSections = {
        ...prev,
        programmes: {
          ...prev.programmes,
          [key]: prev.programmes[key] === false ? true : false
        }
      };
      sauvegarderPrefs(newSections, ordrePersonnalise);
      return newSections;
    });
  }, [ordrePersonnalise, sauvegarderPrefs]);

  // Vérifier si une famille est ouverte (ouvert par défaut)
  const isFamilleOuverte = useCallback((famille) => {
    return sectionsOuvertes.familles[famille] !== false;
  }, [sectionsOuvertes.familles]);

  // Vérifier si un programme est ouvert (ouvert par défaut)
  const isProgrammeOuvert = useCallback((famille, programme) => {
    const key = `${famille}_${programme}`;
    return sectionsOuvertes.programmes[key] !== false;
  }, [sectionsOuvertes.programmes]);

  // Drag & drop via custom hook
  const {
    dragState,
    handleDragStartFamille,
    handleDragOverFamille,
    handleDropFamille,
    handleDragEndFamille,
    handleDragStartProgramme,
    handleDragOverProgramme,
    handleDropProgramme,
    handleDragEndProgramme,
  } = useDragReorder({
    sectionsOuvertes,
    ordrePersonnalise,
    setOrdrePersonnalise,
    sauvegarderPrefs,
  });

  // Déterminer si on affiche l'historique (seulement en mode PDV)
  const baseCalcul = configuration?.baseCalcul || 'PDV';
  const showHisto = baseCalcul === 'PDV';

  // Fonction de tri (cycle: desc → asc → null/défaut)
  // Premier clic = décroissant (plus gros en haut, le plus utile)
  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        if (prev.direction === 'desc') return { key, direction: 'asc' };
        // asc → retour à l'ordre par défaut
        return { key: null, direction: null };
      }
      // Nouveau tri → décroissant d'abord
      return { key, direction: 'desc' };
    });
  };

  // Wrapper helpers with configuration bound
  const isCreneauFerme = useCallback((jour, trancheKey) => {
    return isCreneauFermeHelper(configuration, jour, trancheKey);
  }, [configuration]);

  const isJourFerme = useCallback((jour) => {
    return isJourFermeHelper(configuration, jour);
  }, [configuration]);

  const getDateJour = useCallback((jour) => {
    return getDateJourHelper(configuration, jour);
  }, [configuration]);

  // Wrapper calculerQuantites with dependencies bound
  const calculerQuantites = useCallback((produit, jour, modeRepartitionOverride = null) => {
    return calculerQuantitesBase(produit, jour, frequentation, configuration, isCreneauFerme, modeRepartitionOverride);
  }, [frequentation, configuration, isCreneauFerme]);

  // Wrapper calculerTotauxFamille with dependencies bound
  const calculerTotauxFamille = useCallback((produitsFamille, jour, modeRepartition) => {
    return calculerTotauxFamilleBase(produitsFamille, jour, modeRepartition, frequentation, configuration, isCreneauFerme);
  }, [frequentation, configuration, isCreneauFerme]);

  // Grouper les produits par famille, puis par programme (extracted hook)
  const produitsParFamille = useProduitsParFamille(produits, sortConfig);

  // Ordre des familles triées (extracted hook)
  const famillesTriees = useFamillesTriees(produitsParFamille, sortConfig, ordrePersonnalise.familles);

  // Colonnes visibles par famille
  const colonnesVisiblesParFamille = useMemo(() => {
    const result = {};
    Object.entries(tranchesParFamille).forEach(([famille, groups]) => {
      result[famille] = colonnesFromGroups(groups);
    });
    return result;
  }, [tranchesParFamille]);

  // Colonnes par défaut (4T) pour les familles non configurées
  const colonnesDefaut = useMemo(() => colonnesFromGroups(TRANCHES_DEFAUT_PAR_FAMILLE.AUTRE), []);

  // Obtenir l'ordre des programmes pour une famille (extracted hook)
  const getProgrammesOrdonnes = useGetProgrammesOrdonnes(ordrePersonnalise.programmes);

  // Print handlers - delegate to extracted functions
  const onPrintPlanningPro = () => {
    handlePrintPlanningPro(jourSelectionne, {
      calculerQuantites,
      getProgrammesOrdonnes,
      getDateJour,
      produitsParFamille,
      famillesTriees,
      colonnesVisiblesParFamille,
      colonnesDefaut,
      configuration,
    }, { modeImpression, famillesImpression });
  };

  const onPrintSemaine = () => {
    handlePrintSemaine({
      calculerQuantites,
      getProgrammesOrdonnes,
      getDateJour,
      produitsParFamille,
      famillesTriees,
      colonnesVisiblesParFamille,
      colonnesDefaut,
      configuration,
    }, { modeImpression, famillesImpression });
  };

  const onExportExcel = () => {
    handleExportExcel(jourSelectionne, {
      calculerQuantites,
      getProgrammesOrdonnes,
      produitsParFamille,
      famillesTriees,
      colonnesVisiblesParFamille,
      colonnesDefaut,
      configuration,
    }, { modeImpression, famillesImpression });
  };

  return (
    <div className="p-4 space-y-4 print:p-2">
      {/* En-tête */}
      <EnTetePlanning
        jourSelectionne={jourSelectionne}
        getDateJour={getDateJour}
        configuration={configuration}
        sortConfig={sortConfig}
        handleSort={handleSort}
        modeSimplifie={modeSimplifie}
        setModeSimplifie={setModeSimplifie}
        affichage={affichage}
        setAffichage={setAffichage}
        setShowModalProgrammes={setShowModalProgrammes}
        onPrintPlanningPro={onPrintPlanningPro}
        onPrintSemaine={onPrintSemaine}
        onExportExcel={onExportExcel}
        ordrePersonnalise={ordrePersonnalise}
        sectionsOuvertes={sectionsOuvertes}
        reinitialiserPrefs={reinitialiserPrefs}
        modeImpression={modeImpression}
        setModeImpression={setModeImpression}
        famillesImpression={famillesImpression}
        setFamillesImpression={setFamillesImpression}
        famillesDisponibles={famillesTriees}
      />

      {/* Barre d'info avec créneau actuel */}
      <BarreInfoCreneaux
        trancheActuelle={trancheActuelle}
        nbTranchesMax={nbTranchesMax}
        tranchesParFamille={tranchesParFamille}
      />

      {/* Légende format 3 lignes (si mode détail actif) */}
      <Legende3Lignes
        modeSimplifie={modeSimplifie}
        showHisto={showHisto}
        isJourFerme={isJourFerme(jourSelectionne)}
      />

      {/* Sélecteur de jour */}
      <SelecteurJour
        jourSelectionne={jourSelectionne}
        setJourSelectionne={setJourSelectionne}
        isJourFerme={isJourFerme}
      />

      {/* Message si jour fermé */}
      {isJourFerme(jourSelectionne) ? (
        <div className="bg-gray-100 rounded-lg p-12 text-center">
          <p className="text-gray-500 text-lg">🚫 Magasin fermé ce jour</p>
        </div>
      ) : (
        /* Tableaux par famille */
        <div className="space-y-4 print:space-y-4">
          {famillesTriees.map((famille, familleIndex) => {
            const groupe = produitsParFamille[famille];
            const modeRepartition = configuration?.repartitionParFamille?.[famille] || 'journalier';
            const totaux = calculerTotauxFamille(groupe.tous, jourSelectionne, modeRepartition);
            const isOuverte = isFamilleOuverte(famille);

            const programmesDefaut = Object.keys(groupe.parProgramme);
            const programmesOrdonnes = getProgrammesOrdonnes(famille, programmesDefaut, groupe);

            return (
              <FamilleSection
                key={famille}
                famille={famille}
                familleIndex={familleIndex}
                groupe={groupe}
                modeRepartition={modeRepartition}
                totaux={totaux}
                isOuverte={isOuverte}
                toggleFamille={toggleFamille}
                programmesOrdonnes={programmesOrdonnes}
                sortConfig={sortConfig}
                handleSort={handleSort}
                modeSimplifie={modeSimplifie}
                showHisto={showHisto}
                colonnesVisibles={colonnesVisiblesParFamille[famille] || colonnesDefaut}
                trancheActuelle={trancheActuelle}
                jourSelectionne={jourSelectionne}
                calculerQuantites={calculerQuantites}
                affichage={affichage}
                isProgrammeOuvert={isProgrammeOuvert}
                toggleProgramme={toggleProgramme}
                dragState={dragState}
                handleDragStartFamille={handleDragStartFamille}
                handleDragOverFamille={handleDragOverFamille}
                handleDropFamille={handleDropFamille}
                handleDragEndFamille={handleDragEndFamille}
                handleDragStartProgramme={handleDragStartProgramme}
                handleDragOverProgramme={handleDragOverProgramme}
                handleDropProgramme={handleDropProgramme}
                handleDragEndProgramme={handleDragEndProgramme}
                setProduitEnEdition={setProduitEnEdition}
                famillesTriees={famillesTriees}
              />
            );
          })}
        </div>
      )}

      {/* Légende en bas */}
      {!isJourFerme(jourSelectionne) && (
        <div className="text-xs text-gray-500 text-center pt-4 print:pt-2">
          {affichage === 'plaques' ? (
            <p>💡 Quantités affichées en nombre de plaques (arrondi supérieur)</p>
          ) : (
            <p>💡 Quantités affichées en unités de vente</p>
          )}
        </div>
      )}

      {/* Modal édition de produit */}
      {produitEnEdition && (
        <ModalEditionProduit
          produit={produitEnEdition}
          programmes={programmesActuels}
          onSave={handleSaveProduit}
          onClose={() => setProduitEnEdition(null)}
        />
      )}

      {/* Modal gestion des programmes */}
      {showModalProgrammes && (
        <ModalGestionProgrammes
          programmes={programmesActuels}
          produitsParProgramme={produitsParProgramme}
          onSave={handleSaveProgrammes}
          onClose={() => setShowModalProgrammes(false)}
        />
      )}

    </div>
  );
}
