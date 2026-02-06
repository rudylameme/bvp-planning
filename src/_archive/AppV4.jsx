/**
 * AppV4 - Application principale V4
 *
 * Combine :
 * - Accueil Global (choix entre Benchmark et Planning)
 * - Module Benchmark (analyse des performances)
 * - Mode Responsable : WizardResponsable (Planning moderne avec icônes)
 * - Mode Équipier : Interface Équipe avec import fichier
 */

import { useState, useEffect } from 'react';
import { ProfilProvider, useProfil } from './contexts/ProfilContext';
import AccueilGlobalV4 from './components/AccueilGlobalV4';
import BenchmarkModule from './components/benchmark/BenchmarkModule';
import WizardResponsable from './components/responsable/WizardResponsable';
import Header from './components/layout/Header';
import Navigation from './components/layout/Navigation';
import ImportFichierEquipe, { useFichierMagasin } from './components/equipe/ImportFichierEquipe';
import PlanningJour from './components/equipe/PlanningJour';
import InventaireEquipe from './components/equipe/InventaireEquipe';

// Obtenir le numéro de semaine ISO
const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

// Placeholder pour les modules Employé (à développer)
const PlaceholderComponent = ({ title }) => (
  <div className="p-8 text-center text-[#58595B]/70">
    <h2 className="text-xl font-semibold mb-2 text-[#58595B]">{title}</h2>
    <p>Ce module sera développé dans une prochaine phase.</p>
  </div>
);

function AppV4Content() {
  const { isResponsable } = useProfil();

  // État de navigation : 'accueil', 'benchmark', 'planning'
  const [ecran, setEcran] = useState('accueil');
  const [donneesBenchmark, setDonneesBenchmark] = useState(null);

  // États pour le mode Équipier
  const [activeTab, setActiveTab] = useState('planning');
  const [donneesMagasin, setDonneesMagasin] = useState(null);
  const { chargerDepuisStorage, effacerFichier } = useFichierMagasin();

  // Charger le fichier depuis localStorage au démarrage (mode Équipe)
  useEffect(() => {
    if (!isResponsable && ecran === 'planning') {
      const fichierSauvegarde = chargerDepuisStorage();
      if (fichierSauvegarde) {
        const configSemaine = fichierSauvegarde.configuration?.semaine;
        const configAnnee = fichierSauvegarde.configuration?.annee;
        const now = new Date();
        const currentWeek = getWeekNumber(now);
        const currentYear = now.getFullYear();

        if (configAnnee < currentYear || (configAnnee === currentYear && configSemaine < currentWeek)) {
          console.warn('Le fichier chargé concerne une semaine passée');
        }

        setDonneesMagasin(fichierSauvegarde);
      }
    }
  }, [isResponsable, ecran]);

  // Navigation vers le Benchmark
  const allerBenchmark = () => {
    setEcran('benchmark');
  };

  // Navigation vers le Planning
  const allerPlanning = () => {
    setEcran('planning');
  };

  // Retour à l'accueil global
  const retourAccueil = () => {
    setEcran('accueil');
    setDonneesBenchmark(null);
  };

  // Navigation du benchmark vers le planning avec données
  const handleNaviguerPlanningDepuisBenchmark = (donnees) => {
    console.log('🔄 Navigation benchmark → planning avec données:', donnees);
    setDonneesBenchmark(donnees);
    setEcran('planning');
  };

  // Handlers pour le mode Équipier
  const handleChargerFichier = (fichier) => {
    setDonneesMagasin(fichier);
    setActiveTab('planning');
  };

  const handleChangerFichier = () => {
    effacerFichier();
    setDonneesMagasin(null);
  };

  // Rendu pour le mode Équipe
  const renderEmployeContent = () => {
    if (!donneesMagasin) {
      return <ImportFichierEquipe onFichierCharge={handleChargerFichier} />;
    }

    switch (activeTab) {
      case 'casse':
        return <PlaceholderComponent title="Saisie Casse" />;
      case 'planning':
        return <PlanningJour donneesMagasin={donneesMagasin} />;
      case 'plaquage':
        return <PlaceholderComponent title="Plaquage Demain" />;
      case 'inventaire':
        return <InventaireEquipe />;
      case 'commande':
        return <PlaceholderComponent title="Aide à la Commande" />;
      default:
        return <PlaceholderComponent title="Module inconnu" />;
    }
  };

  // Écran d'accueil global
  if (ecran === 'accueil') {
    return (
      <AccueilGlobalV4
        onChoixBenchmark={allerBenchmark}
        onChoixPlanning={allerPlanning}
      />
    );
  }

  // Module Benchmark
  if (ecran === 'benchmark') {
    return (
      <BenchmarkModule
        onNaviguerPlanning={handleNaviguerPlanningDepuisBenchmark}
        onRetourAccueilGlobal={retourAccueil}
      />
    );
  }

  // Planning - selon le profil
  if (ecran === 'planning') {
    // Mode Responsable → Wizard complet
    if (isResponsable) {
      return (
        <WizardResponsable
          onRetourAccueil={retourAccueil}
          donneesBenchmark={donneesBenchmark}
        />
      );
    }

    // Mode Équipier → Interface Équipe
    return (
      <div className="min-h-screen bg-[#E8E1D5]/30">
        <Header
          magasinNom={donneesMagasin?.magasin?.nom}
          magasinCode={donneesMagasin?.magasin?.code}
          semaine={donneesMagasin?.configuration?.semaine}
          annee={donneesMagasin?.configuration?.annee}
          onChangerFichier={donneesMagasin ? handleChangerFichier : null}
          onRetourAccueil={retourAccueil}
        />
        {donneesMagasin && (
          <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
        )}
        <main>
          {renderEmployeContent()}
        </main>
      </div>
    );
  }

  return null;
}

// Composant principal avec Provider
export default function AppV4() {
  return (
    <ProfilProvider>
      <AppV4Content />
    </ProfilProvider>
  );
}
