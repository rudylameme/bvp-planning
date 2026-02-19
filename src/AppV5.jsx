/**
 * App V5 - BVP Planning
 *
 * Architecture V5.2 :
 * - Accueil global → choix Adhérent / Manager / Équipe
 * - Chaque univers passe par une page Paramètres (dossiers/fichiers)
 * - Adhérent → Benchmark (Import + Diagnostic)
 * - Manager → Wizard Planning (5 étapes)
 * - Équipe → 3 modules (Planning, Inventaire, Commande)
 */

import { useState } from 'react';
import AccueilGlobal from './components/AccueilGlobal';
import PageParametres from './components/shared/PageParametres';
import WizardBenchmark from './components/manager/WizardBenchmark';
import WizardManager from './components/manager/WizardManager';
import AccueilEquipe from './components/equipe/AccueilEquipe';

// Profil : 'all' (dev local), 'manager' (univers 1+2+3), 'equipe' (univers 3 seul)
const PROFIL = import.meta.env.VITE_PROFIL || 'all';
const isManager = PROFIL === 'manager' || PROFIL === 'all';
const isEquipe = PROFIL === 'equipe' || PROFIL === 'all' || PROFIL === 'manager';

// Définition des items par univers
const ITEMS_BENCHMARK = [
  {
    id: 'data',
    label: 'Dossier DATA_perso',
    description: 'Dossier contenant les fichiers Excel de fréquentation et ventes',
    type: 'directory',
    idbKey: 'dirHandle-data',
    required: true,
  },
];

const ITEMS_MANAGER = [
  {
    id: 'data',
    label: 'Dossier DATA_perso',
    description: 'Dossier contenant les fichiers Excel de fréquentation et ventes (Vente_Hebdo_BVP, info_PDV.json)',
    type: 'directory',
    idbKey: 'dirHandle-data',
    required: true,
  },
  {
    id: 'mercalys',
    label: 'Fichier Mercalys ventes/casse',
    description: "Export Excel Mercalys avec l'historique de ventes et casse (minimum 3 semaines)",
    type: 'file',
    accept: '.xlsx,.xls,.csv',
    idbKey: 'fichierMercalys',
    required: true,
    helpImage: '/images/aide/config-mercalys.png',
    helpTitle: 'Comment configurer l\'export Mercalys',
  },
  {
    id: 'archives',
    label: 'Dossier archives Manager',
    description: 'Dossier pour sauvegarder et relire les fichiers .bvp.json',
    type: 'directory',
    idbKey: 'dossierArchives',
    required: false,
  },
  {
    id: 'equipe',
    label: 'Dossier equipe',
    description: "Dossier partagé où le Manager dépose les fichiers .bvp.json pour l'équipe",
    type: 'directory',
    idbKey: 'dossierEquipe',
    required: false,
  },
];

const ITEMS_EQUIPE = [
  {
    id: 'bvpjson',
    label: 'Fichier planning (.bvp.json)',
    description: 'Fichier généré par le Manager pour la semaine en cours',
    type: 'file',
    accept: '.json,.bvp.json',
    required: true,
  },
];

function AppV5() {
  const [ecran, setEcran] = useState(() => {
    if (PROFIL === 'equipe') return 'params-equipe';
    return 'accueil';
  });

  // Navigation
  const allerAccueil = () => setEcran('accueil');
  const allerParamsBenchmark = () => setEcran('params-benchmark');
  const allerParamsManager = () => setEcran('params-manager');
  const allerParamsEquipe = () => setEcran('params-equipe');
  const allerBenchmark = () => setEcran('benchmark');
  const allerManager = () => setEcran('manager');
  const allerEquipe = () => setEcran('equipe');

  // Rendu selon l'écran actif
  switch (ecran) {
    case 'params-benchmark':
      if (!isManager) { setEcran('accueil'); return null; }
      return (
        <PageParametres
          titre="Analyser mon rayon"
          sousTitre="Benchmark & stratégie"
          couleur="blue"
          items={ITEMS_BENCHMARK}
          onValider={allerBenchmark}
          onRetour={allerAccueil}
        />
      );

    case 'params-manager':
      if (!isManager) { setEcran('accueil'); return null; }
      return (
        <PageParametres
          titre="Préparer la semaine"
          sousTitre="Construction du planning"
          couleur="bordeaux"
          items={ITEMS_MANAGER}
          onValider={allerManager}
          onRetour={allerAccueil}
        />
      );

    case 'params-equipe':
      if (!isEquipe) { setEcran('accueil'); return null; }
      return (
        <PageParametres
          titre="Planning quotidien"
          sousTitre="Mise en œuvre terrain"
          couleur="emerald"
          items={ITEMS_EQUIPE}
          onValider={allerEquipe}
          onRetour={allerAccueil}
        />
      );

    case 'benchmark':
      if (!isManager) { setEcran('accueil'); return null; }
      return <WizardBenchmark onRetourAccueil={allerAccueil} onAllerPlanning={allerParamsManager} />;

    case 'manager':
      if (!isManager) { setEcran('accueil'); return null; }
      return <WizardManager onRetourAccueil={allerAccueil} />;

    case 'equipe':
      if (!isEquipe) { setEcran('accueil'); return null; }
      return <AccueilEquipe onRetourAccueil={allerAccueil} />;

    case 'accueil':
    default:
      return (
        <AccueilGlobal
          onChoixAdherent={isManager ? allerParamsBenchmark : null}
          onChoixManager={isManager ? allerParamsManager : null}
          onChoixEquipe={isEquipe ? allerParamsEquipe : null}
        />
      );
  }
}

export default AppV5;
