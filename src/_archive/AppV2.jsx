import { useState, useEffect } from 'react';
import { ProfilProvider, useProfil } from './contexts/ProfilContext';
import Header from './components/layout/Header';
import Navigation from './components/layout/Navigation';

// Composants Responsable - Wizard
import WizardResponsable from './components/responsable/WizardResponsable';

// Composants Équipe
import ImportFichierEquipe, { useFichierMagasin } from './components/equipe/ImportFichierEquipe';
import PlanningJour from './components/equipe/PlanningJour';

// Placeholder pour les modules Employé (à développer)
const PlaceholderComponent = ({ title }) => (
  <div className="p-8 text-center text-[#58595B]/70">
    <h2 className="text-xl font-semibold mb-2 text-[#58595B]">{title}</h2>
    <p>Ce module sera développé dans une prochaine phase.</p>
  </div>
);

// Obtenir le numéro de semaine ISO
const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

// Composant interne qui utilise le contexte profil
function AppContent() {
  const { isResponsable } = useProfil();
  const [activeTab, setActiveTab] = useState('planning');
  const [donneesMagasin, setDonneesMagasin] = useState(null);
  const { chargerDepuisStorage, effacerFichier } = useFichierMagasin();

  // Charger le fichier depuis localStorage au démarrage (mode Équipe)
  useEffect(() => {
    if (!isResponsable) {
      const fichierSauvegarde = chargerDepuisStorage();
      if (fichierSauvegarde) {
        // Vérifier si le fichier n'est pas trop ancien (semaine passée)
        const configSemaine = fichierSauvegarde.configuration?.semaine;
        const configAnnee = fichierSauvegarde.configuration?.annee;
        const now = new Date();
        const currentWeek = getWeekNumber(now);
        const currentYear = now.getFullYear();

        // Si fichier pour une semaine passée, avertir mais charger quand même
        if (configAnnee < currentYear || (configAnnee === currentYear && configSemaine < currentWeek)) {
          console.warn('Le fichier chargé concerne une semaine passée');
        }

        setDonneesMagasin(fichierSauvegarde);
      }
    }
  }, [isResponsable]);

  // Quand un fichier magasin est chargé (depuis l'équipe)
  const handleChargerFichier = (fichier) => {
    setDonneesMagasin(fichier);
    setActiveTab('planning');
  };

  // Changer de fichier
  const handleChangerFichier = () => {
    effacerFichier();
    setDonneesMagasin(null);
  };

  // Rendu pour le mode Équipe
  const renderEmployeContent = () => {
    // Si aucun fichier chargé, afficher l'écran d'import
    if (!donneesMagasin) {
      return <ImportFichierEquipe onFichierCharge={handleChargerFichier} />;
    }

    // Sinon, afficher le module actif
    switch (activeTab) {
      case 'casse':
        return <PlaceholderComponent title="Saisie Casse" />;
      case 'planning':
        return <PlanningJour donneesMagasin={donneesMagasin} />;
      case 'plaquage':
        return <PlaceholderComponent title="Plaquage Demain" />;
      case 'commande':
        return <PlaceholderComponent title="Aide à la Commande" />;
      default:
        return <PlaceholderComponent title="Module inconnu" />;
    }
  };

  // Si mode Responsable → Wizard complet
  if (isResponsable) {
    return <WizardResponsable />;
  }

  // Si mode Équipe → Navigation standard
  return (
    <div className="min-h-screen bg-[#E8E1D5]/30">
      <Header
        magasinNom={donneesMagasin?.magasin?.nom}
        magasinCode={donneesMagasin?.magasin?.code}
        semaine={donneesMagasin?.configuration?.semaine}
        annee={donneesMagasin?.configuration?.annee}
        onChangerFichier={donneesMagasin ? handleChangerFichier : null}
      />
      {/* Navigation visible uniquement si fichier chargé */}
      {donneesMagasin && (
        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      )}
      <main>
        {renderEmployeContent()}
      </main>
    </div>
  );
}

// Composant principal avec Provider
export default function AppV2() {
  return (
    <ProfilProvider>
      <AppContent />
    </ProfilProvider>
  );
}
