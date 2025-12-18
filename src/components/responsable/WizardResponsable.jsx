import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Composants du wizard
import ProgressBar from './ProgressBar';
import ImportDonnees from './ImportDonnees';
import StepSemaine from './StepSemaine';
import PilotageCA from './PilotageCA';
import StepAnimationCommerciale from './StepAnimationCommerciale';
import WizardTermine from './WizardTermine';
import Header from '../layout/Header';

// Services
import {
  calculerIndicateursProduit,
  calculerPoidsJours
} from '../../services/potentielCalculator';
import { calculerCAHebdo, calculerCAProduit } from '../../services/caCalculator';
import { detecterRayon, detecterTempsPlaquage, detecterUnitesParPlaque } from '../../services/productClassifier';
import {
  chargerReferentielITM8,
  rechercherParITM8,
  isReferentielCharge
} from '../../services/referentielITM8';

// Structure V2 avec états par créneau - TOUS OUVERTS par défaut
const JOURS_DEFAUT = {
  lundi: { matin: { statut: 'ouvert' }, apresmidi: { statut: 'ouvert' }, ferme: false, exceptionnel: false },
  mardi: { matin: { statut: 'ouvert' }, apresmidi: { statut: 'ouvert' }, ferme: false, exceptionnel: false },
  mercredi: { matin: { statut: 'ouvert' }, apresmidi: { statut: 'ouvert' }, ferme: false, exceptionnel: false },
  jeudi: { matin: { statut: 'ouvert' }, apresmidi: { statut: 'ouvert' }, ferme: false, exceptionnel: false },
  vendredi: { matin: { statut: 'ouvert' }, apresmidi: { statut: 'ouvert' }, ferme: false, exceptionnel: false },
  samedi: { matin: { statut: 'ouvert' }, apresmidi: { statut: 'ouvert' }, ferme: false, exceptionnel: false },
  dimanche: { matin: { statut: 'ouvert' }, apresmidi: { statut: 'ouvert' }, ferme: false, exceptionnel: false },
};

// Configuration par défaut de la répartition par famille
const REPARTITION_DEFAUT = {
  BOULANGERIE: 'tranches',
  VIENNOISERIE: 'tranches',
  PATISSERIE: 'journalier',
  SNACKING: 'tranches',
  NEGOCE: 'journalier',
  AUTRE: 'journalier'
};

// Configuration par défaut des limites de progression par famille × jour
const LIMITES_PROGRESSION_DEFAUT = {
  BOULANGERIE: {
    lundi: 'S', mardi: 'S', mercredi: 'S', jeudi: 'S',
    vendredi: 'F', samedi: 'F', dimanche: 'F'
  },
  VIENNOISERIE: {
    lundi: 'F', mardi: 'F', mercredi: 'F', jeudi: 'F',
    vendredi: 'f', samedi: 'f', dimanche: 'f'
  },
  PATISSERIE: {
    lundi: 'f', mardi: 'f', mercredi: 'f', jeudi: 'f',
    vendredi: 'f', samedi: 'f', dimanche: 'f'
  },
  SNACKING: {
    lundi: 'F', mardi: 'F', mercredi: 'F', jeudi: 'F',
    vendredi: 'f', samedi: 'f', dimanche: 'f'
  },
  NEGOCE: {
    lundi: 'f', mardi: 'f', mercredi: 'f', jeudi: 'f',
    vendredi: 'f', samedi: 'f', dimanche: 'f'
  },
  AUTRE: {
    lundi: 'F', mardi: 'F', mercredi: 'F', jeudi: 'F',
    vendredi: 'f', samedi: 'f', dimanche: 'f'
  }
};

export default function WizardResponsable() {
  // État du wizard
  const [currentStep, setCurrentStep] = useState(1);
  const [importReady, setImportReady] = useState(false); // Pour activer le bouton Suivant
  const [referentielCharge, setReferentielCharge] = useState(false);

  // Charger le référentiel ITM8 au démarrage
  useEffect(() => {
    const chargerReferentiel = async () => {
      if (!isReferentielCharge()) {
        console.log('📚 Chargement du référentiel ITM8...');
        const result = await chargerReferentielITM8('/Data/liste des produits BVP treville.xlsx');
        if (result) {
          setReferentielCharge(true);
          console.log('✅ Référentiel chargé avec succès');
        }
      } else {
        setReferentielCharge(true);
      }
    };
    chargerReferentiel();
  }, []);

  // Données du wizard
  const [wizardData, setWizardData] = useState({
    // Étape 1 - Import
    importDonnees: null,
    produits: [],
    caTotalRayon: 0,

    // Étape 2 - Configuration
    magasin: { nom: '', code: '' },
    semaine: null,
    annee: new Date().getFullYear(),
    horaires: { ...JOURS_DEFAUT },

    // Étape 3 - Pilotage CA
    modeTerrain: false,
    baseCalcul: 'PDV',
    limitesProgression: { ...LIMITES_PROGRESSION_DEFAUT },
    repartitionParFamille: { ...REPARTITION_DEFAUT },

    // Étape 4 - Animation Commerciale
    promosActives: [],
    periodePromo: null,
  });

  // Validation pour passer à l'étape suivante
  const canGoNext = () => {
    switch (currentStep) {
      case 1:
        // Étape 1: vérifier si les données d'import sont prêtes
        return importReady;
      case 2:
        return wizardData.semaine !== null && wizardData.magasin.nom.trim() !== '';
      case 3:
        return wizardData.produits.filter(p => p.actif).length > 0;
      case 4:
        // Étape 4 (Animation Commerciale) est optionnelle, toujours OK
        return true;
      default:
        return false;
    }
  };

  // Navigation
  const goNext = () => {
    if (!canGoNext()) return;

    // Si étape 1, traiter les données d'import avant de passer à l'étape 2
    if (currentStep === 1 && window.__importDonneesReady) {
      handleImportComplete(window.__importDonneesReady);
      window.__importDonneesReady = null;
      return; // handleImportComplete fait déjà setCurrentStep(2)
    }

    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goPrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handler import terminé
  const handleImportComplete = (donneesImportees) => {
    const { ventes, frequentation, nombreSemaines, caTotalRayon, magasin } = donneesImportees;

    // Calculer les poids des jours
    const poidsJours = frequentation?.parJour
      ? calculerPoidsJours(frequentation.parJour)
      : calculerPoidsJours({});

    // Transformer les produits avec enrichissement du référentiel
    const produitsTransformes = Object.entries(ventes.parProduit).map(([, data], index) => {
      const indicateurs = calculerIndicateursProduit(data.ventes, poidsJours, nombreSemaines);
      const { prixMoyenUnitaire } = calculerCAProduit(data.ventes);
      const caHebdo = calculerCAHebdo(data.ventes, nombreSemaines);

      // Rechercher le produit dans le référentiel ITM8
      const itm8Num = parseInt(data.itm8, 10);
      const infoRef = rechercherParITM8(itm8Num);

      // Utiliser les données du référentiel si disponibles, sinon fallback
      const rayon = infoRef?.rayon || detecterRayon(data.libelle);
      const programme = infoRef?.programme || '';
      const plu = infoRef?.codePLU || '';
      const unitesParPlaque = infoRef?.unitesParPlaque || detecterUnitesParPlaque(data.libelle);
      const unitesParVente = infoRef?.unitesParVente || 1;

      return {
        id: index + 1,
        itm8: data.itm8,
        ean: data.ean,
        libelle: data.libelle,
        libellePersonnalise: infoRef?.libelle || data.libelle,
        rayon,
        programme,
        plu,
        unitesParPlaque,
        unitesParVente,
        tempsPlaquage: detecterTempsPlaquage(data.libelle),
        ...indicateurs,
        prixMoyenUnitaire,
        caHebdoActuel: caHebdo,
        caHebdoObjectif: caHebdo,
        gainPotentiel: 0,
        actif: true,
        // Flag pour indiquer si trouvé dans le référentiel
        dansReferentiel: !!infoRef,
        // Données de marge (si disponibles dans le fichier Excel)
        prixAchatHT: data.prixAchatHT || null,
        tauxMarge: data.tauxMarge || null,
        tva: data.tva || 5.5  // TVA alimentaire par défaut
      };
    });

    setWizardData(prev => ({
      ...prev,
      importDonnees: donneesImportees,
      produits: produitsTransformes,
      caTotalRayon: caTotalRayon / nombreSemaines,
      // Pré-remplir le magasin si trouvé dans le fichier Excel
      magasin: magasin ? {
        nom: magasin.nom || '',
        code: magasin.code || ''
      } : prev.magasin
    }));

    // Passer automatiquement à l'étape suivante
    setCurrentStep(2);
  };

  // Rendu du contenu selon l'étape
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <ImportDonnees onImportReady={setImportReady} />;

      case 2:
        return (
          <StepSemaine
            semaine={wizardData.semaine}
            annee={wizardData.annee}
            horaires={wizardData.horaires}
            magasin={wizardData.magasin}
            onSemaineChange={(semaine) => setWizardData(prev => ({ ...prev, semaine }))}
            onAnneeChange={(annee) => setWizardData(prev => ({ ...prev, annee }))}
            onHorairesChange={(horaires) => setWizardData(prev => ({ ...prev, horaires }))}
            onMagasinChange={(magasin) => setWizardData(prev => ({ ...prev, magasin }))}
          />
        );

      case 3:
        return (
          <PilotageCA
            produits={wizardData.produits}
            onProduitsChange={(produits) => setWizardData(prev => ({ ...prev, produits }))}
            caTotalRayon={wizardData.caTotalRayon}
            modeTerrain={wizardData.modeTerrain}
            onModeTerrainChange={(modeTerrain) => setWizardData(prev => ({ ...prev, modeTerrain }))}
            baseCalcul={wizardData.baseCalcul}
            onBaseCalculChange={(baseCalcul) => setWizardData(prev => ({ ...prev, baseCalcul }))}
            limitesProgression={wizardData.limitesProgression}
            onLimitesProgressionChange={(limitesProgression) => setWizardData(prev => ({ ...prev, limitesProgression }))}
            repartitionParFamille={wizardData.repartitionParFamille}
            onRepartitionChange={(repartitionParFamille) => setWizardData(prev => ({ ...prev, repartitionParFamille }))}
            horaires={wizardData.horaires}
            frequentation={wizardData.importDonnees?.frequentation}
            onPlanningChange={(planningCalcule) => setWizardData(prev => ({ ...prev, planningCalcule }))}
          />
        );

      case 4:
        return (
          <StepAnimationCommerciale
            produits={wizardData.produits}
            promosActives={wizardData.promosActives}
            setPromosActives={(promosActives) => setWizardData(prev => ({ ...prev, promosActives }))}
            periodePromo={wizardData.periodePromo}
            setPeriodePromo={(periodePromo) => setWizardData(prev => ({ ...prev, periodePromo }))}
          />
        );

      case 5:
        return (
          <WizardTermine
            donneesMagasin={wizardData}
            produits={wizardData.produits}
            semaine={wizardData.semaine}
            annee={wizardData.annee}
            horaires={wizardData.horaires}
            promosActives={wizardData.promosActives}
            periodePromo={wizardData.periodePromo}
            onModifier={() => setCurrentStep(3)}
            onNouvelleSemaine={() => {
              setWizardData(prev => ({
                ...prev,
                semaine: (prev.semaine % 53) + 1,
                produits: prev.produits.map(p => ({ ...p, actif: true })),
                promosActives: [] // Reset les promos pour la nouvelle semaine
              }));
              setCurrentStep(2);
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#E8E1D5]/20">
      {/* Header Mousquetaires */}
      <Header
        magasinNom={wizardData.magasin?.nom}
        magasinCode={wizardData.magasin?.code}
      />

      {/* Indicateur référentiel */}
      {!referentielCharge && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm text-amber-700">
          Chargement du référentiel produits...
        </div>
      )}

      {/* Barre de progression */}
      <ProgressBar currentStep={currentStep} />

      {/* Contenu de l'étape */}
      <div className="pb-24">
        {renderStepContent()}
      </div>

      {/* Barre de navigation fixe (sauf étape finale) */}
      {currentStep < 5 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            {/* Bouton Précédent */}
            <button
              onClick={goPrevious}
              disabled={currentStep === 1}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                currentStep === 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
              Précédent
            </button>

            {/* Indicateur d'étape */}
            <span className="text-sm text-gray-500">
              Étape {currentStep} sur 5
            </span>

            {/* Bouton Suivant */}
            <button
              onClick={goNext}
              disabled={!canGoNext()}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                canGoNext()
                  ? 'bg-[#ED1C24] text-white hover:bg-[#8B1538]'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {currentStep === 4 ? 'Terminer' : 'Suivant'}
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
