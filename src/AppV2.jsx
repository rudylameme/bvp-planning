import { useState } from 'react';
import { ProfilProvider, useProfil } from './contexts/ProfilContext';
import Header from './components/layout/Header';
import Navigation from './components/layout/Navigation';

// Composants Responsable - Wizard
import WizardResponsable from './components/responsable/WizardResponsable';

// Placeholder pour les modules Employé (à développer)
const PlaceholderComponent = ({ title }) => (
  <div className="p-8 text-center text-[#58595B]/70">
    <h2 className="text-xl font-semibold mb-2 text-[#58595B]">{title}</h2>
    <p>Ce module sera développé dans une prochaine phase.</p>
  </div>
);

// Composant interne qui utilise le contexte profil
function AppContent() {
  const { isResponsable } = useProfil();
  const [activeTab, setActiveTab] = useState('planning');
  const [donneesMagasin, setDonneesMagasin] = useState(null);

  // Quand un fichier magasin est chargé (depuis l'équipe)
  const handleChargerFichier = (fichier) => {
    setDonneesMagasin(fichier);
    setActiveTab('planning');
  };

  // Rendu pour le mode Équipe
  const renderEmployeContent = () => {
    switch (activeTab) {
      case 'casse':
        return <PlaceholderComponent title="Saisie Casse" />;
      case 'planning':
        return <PlaceholderComponent title="Planning du Jour" />;
      case 'plaquage':
        return <PlaceholderComponent title="Plaquage Demain" />;
      case 'commande':
        return <PlaceholderComponent title="Aide à la Commande" />;
      case 'fichier':
        return <PlaceholderComponent title="Charger Fichier Magasin" />;
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
      />
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
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
