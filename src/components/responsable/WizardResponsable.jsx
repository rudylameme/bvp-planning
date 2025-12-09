import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Composants du wizard
import ProgressBar from './ProgressBar';
import ImportDonnees from './ImportDonnees';
import StepSemaine from './StepSemaine';
import PilotageCA from './PilotageCA';
import WizardTermine from './WizardTermine';
import Header from '../layout/Header';

// Services
import {
  calculerIndicateursProduit,
  calculerPoidsJours
} from '../../services/potentielCalculator';
import { calculerCAHebdo, calculerCAProduit } from '../../services/caCalculator';
import { detecterRayon, detecterTempsPlaquage, detecterUnitesParPlaque } from '../../services/productClassifier';

const JOURS_DEFAUT = {
  lundi: { matin: true, apresmidi: true, ferme: false, exceptionnel: false },
  mardi: { matin: true, apresmidi: true, ferme: false, exceptionnel: false },
  mercredi: { matin: true, apresmidi: true, ferme: false, exceptionnel: false },
  jeudi: { matin: true, apresmidi: true, ferme: false, exceptionnel: false },
  vendredi: { matin: true, apresmidi: true, ferme: false, exceptionnel: false },
  samedi: { matin: true, apresmidi: true, ferme: false, exceptionnel: false },
  dimanche: { matin: false, apresmidi: false, ferme: true, exceptionnel: false },
};

export default function WizardResponsable() {
  // État du wizard
  const [currentStep, setCurrentStep] = useState(1);
  const [importReady, setImportReady] = useState(false); // Pour activer le bouton Suivant

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

    if (currentStep < 4) {
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

    // Transformer les produits
    const produitsTransformes = Object.entries(ventes.parProduit).map(([cle, data], index) => {
      const indicateurs = calculerIndicateursProduit(data.ventes, poidsJours, nombreSemaines);
      const { caTotal, prixMoyenUnitaire } = calculerCAProduit(data.ventes);
      const caHebdo = calculerCAHebdo(data.ventes, nombreSemaines);

      return {
        id: index + 1,
        itm8: data.itm8,
        ean: data.ean,
        libelle: data.libelle,
        libellePersonnalise: data.libelle,
        rayon: detecterRayon(data.libelle),
        programme: '',
        plu: '',
        unitesParPlaque: detecterUnitesParPlaque(data.libelle),
        tempsPlaquage: detecterTempsPlaquage(data.libelle),
        ...indicateurs,
        prixMoyenUnitaire,
        caHebdoActuel: caHebdo,
        caHebdoObjectif: caHebdo,
        gainPotentiel: 0,
        actif: true
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
          />
        );

      case 4:
        return (
          <WizardTermine
            donneesMagasin={wizardData}
            produits={wizardData.produits}
            semaine={wizardData.semaine}
            annee={wizardData.annee}
            horaires={wizardData.horaires}
            onModifier={() => setCurrentStep(3)}
            onNouvelleSemaine={() => {
              setWizardData(prev => ({
                ...prev,
                semaine: (prev.semaine % 53) + 1,
                produits: prev.produits.map(p => ({ ...p, actif: true }))
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

      {/* Barre de progression */}
      <ProgressBar currentStep={currentStep} />

      {/* Contenu de l'étape */}
      <div className="pb-24">
        {renderStepContent()}
      </div>

      {/* Barre de navigation fixe (sauf étape finale) */}
      {currentStep < 4 && (
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
              Étape {currentStep} sur 4
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
              {currentStep === 3 ? 'Terminer' : 'Suivant'}
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
