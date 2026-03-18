/**
 * App V5 - BVP Planning
 *
 * Architecture V5.2 :
 * - Accueil global → choix Adhérent / Manager / Équipe / Secteur
 * - Chaque univers passe par une page Paramètres (dossiers/fichiers)
 * - Adhérent → Benchmark (Import + Diagnostic)
 * - Manager → Wizard Planning (5 étapes)
 * - Équipe → 3 modules (Planning, Inventaire, Commande)
 * - Secteur → Dashboard responsable secteur (classement PDV + drill-down)
 */

import { useState } from 'react';
import AccueilGlobal from './components/AccueilGlobal';
import PageParametres from './components/shared/PageParametres';
import WizardBenchmark from './components/manager/WizardBenchmark';
import WizardManager from './components/manager/WizardManager';
import AccueilEquipe from './components/equipe/AccueilEquipe';
import SectorManagerWizard from './components/secteur/SectorManagerWizard';

// Profil : 'all' (dev local), 'manager' (univers 1+2+3), 'equipe' (univers 3 seul), 'secteur' (secteur seul)
const PROFIL = import.meta.env.VITE_PROFIL || 'all';
const isManager = PROFIL === 'manager' || PROFIL === 'all';
const isEquipe = PROFIL === 'equipe' || PROFIL === 'all' || PROFIL === 'manager';
const isSecteur = PROFIL === 'secteur' || PROFIL === 'manager' || PROFIL === 'all';

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
    id: 'referentielMagasin',
    label: 'Référentiel magasin (Liste PLU)',
    description: "Export Excel « Liste PLU PDV » depuis Mercalys (Section Balance 51). Permet la liaison EAN → code ITM pour une meilleure identification des produits.",
    type: 'file',
    accept: '.xlsx,.xls',
    idbKey: 'fichierRefMagasin',
    required: false,
    helpImage: '/images/aide/config-mercalys-plu.png',
    helpTitle: 'Comment exporter la Liste PLU depuis Mercalys',
  },
  {
    id: 'dossierBVP',
    label: 'Dossier BVP partagé',
    description: 'Dossier partagé pour les fichiers .bvp.json (Manager et Équipe)',
    type: 'directory',
    idbKey: 'dossierBVP',
    required: false,
  },
];

const ITEMS_SECTEUR = [
  {
    id: 'data',
    label: 'Dossier DATA_perso',
    description: 'Dossier contenant les fichiers Excel de ventes et info_PDV.json',
    type: 'directory',
    idbKey: 'dirHandle-data',
    required: true,
  },
];

const ITEMS_EQUIPE = [
  {
    id: 'dossierBVP',
    label: 'Dossier BVP partagé',
    description: 'Dossier partagé pour les fichiers .bvp.json (Manager et Équipe)',
    type: 'directory',
    idbKey: 'dossierBVP',
    required: true,
  },
];

function AppV5() {
  const [ecran, setEcran] = useState(() => {
    if (PROFIL === 'equipe') return 'params-equipe';
    return 'accueil';
  });

  // Handle du dossier partagé équipe (FileSystemDirectoryHandle)
  const [dossierEquipeHandle, setDossierEquipeHandle] = useState(null);

  // Navigation
  const allerAccueil = () => setEcran('accueil');
  const allerParamsBenchmark = () => setEcran('params-benchmark');
  const allerParamsManager = () => setEcran('params-manager');
  const allerParamsEquipe = () => setEcran('params-equipe');
  const allerBenchmark = () => setEcran('benchmark');
  const allerManager = () => setEcran('manager');
  const allerEquipeAvecDossier = ({ etats }) => {
    // Récupérer le handle du dossier partagé depuis PageParametres
    const handle = etats?.dossierBVP?.handle;
    if (handle) setDossierEquipeHandle(handle);
    setEcran('equipe');
  };
  const allerParamsSecteur = () => setEcran('params-secteur');
  const allerSecteur = () => setEcran('secteur');

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
          onValider={allerEquipeAvecDossier}
          onRetour={allerAccueil}
        />
      );

    case 'params-secteur':
      if (!isSecteur) { setEcran('accueil'); return null; }
      return (
        <PageParametres
          titre="Piloter le secteur"
          sousTitre="Vue responsable secteur"
          couleur="indigo"
          items={ITEMS_SECTEUR}
          onValider={allerSecteur}
          onRetour={allerAccueil}
        />
      );

    case 'secteur':
      if (!isSecteur) { setEcran('accueil'); return null; }
      return <SectorManagerWizard onRetourAccueil={allerAccueil} />;

    case 'benchmark':
      if (!isManager) { setEcran('accueil'); return null; }
      return <WizardBenchmark onRetourAccueil={allerAccueil} onAllerPlanning={allerParamsManager} />;

    case 'manager':
      if (!isManager) { setEcran('accueil'); return null; }
      return <WizardManager onRetourAccueil={allerAccueil} />;

    case 'equipe':
      if (!isEquipe) { setEcran('accueil'); return null; }
      return <AccueilEquipe onRetourAccueil={allerAccueil} dossierEquipeHandle={dossierEquipeHandle} />;

    case 'accueil':
    default:
      return (
        <AccueilGlobal
          onChoixAdherent={isManager ? allerParamsBenchmark : null}
          onChoixManager={isManager ? allerParamsManager : null}
          onChoixEquipe={isEquipe ? allerParamsEquipe : null}
          onChoixSecteur={isSecteur ? allerParamsSecteur : null}
        />
      );
  }
}

export default AppV5;
