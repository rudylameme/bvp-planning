/**
 * App V5 - BVP Planning
 *
 * Architecture simplifiée :
 * - Accueil global → choix Manager / Équipe
 * - Manager → Wizard 6 étapes
 * - Équipe → 3 modules (Planning, Inventaire, Commande)
 */

import { useState } from 'react';
import AccueilGlobal from './components/AccueilGlobal';
import WizardManager from './components/manager/WizardManager';
import AccueilEquipe from './components/equipe/AccueilEquipe';

function AppV5() {
  // Navigation principale : 'accueil', 'manager', 'equipe'
  const [ecran, setEcran] = useState('accueil');

  // Navigation
  const allerAccueil = () => setEcran('accueil');
  const allerManager = () => setEcran('manager');
  const allerEquipe = () => setEcran('equipe');

  // Rendu selon l'écran actif
  switch (ecran) {
    case 'manager':
      return <WizardManager onRetourAccueil={allerAccueil} />;

    case 'equipe':
      return <AccueilEquipe onRetourAccueil={allerAccueil} />;

    case 'accueil':
    default:
      return (
        <AccueilGlobal
          onChoixManager={allerManager}
          onChoixEquipe={allerEquipe}
        />
      );
  }
}

export default AppV5;
