/**
 * Wizard Manager V5.2 — « Préparer la semaine »
 *
 * Objectif 2 : Construction du planning hebdomadaire.
 * Parcours en 5 étapes :
 * 0. Configuration planning (EtapeConfigPlanning — dossier, semaine S+1, magasin, AS-1, S-4, objectif)
 * 1. Import Ventes/Casse (Etape2bImportVentes — gamme produits)
 * 2. Configuration jours (Etape3Configuration — jours, opérations, regroupement)
 * 3. Pilotage CA (Etape4PilotageCA — ventes, casse, gamme)
 * 4. Communication (Etape5Communication — export fichier équipe .bvp.json)
 *
 * L'étape 0 fusionne Import + Config : dossier, semaine, magasin, recherche AS-1 & S-4.
 * Accessible librement depuis l'accueil. Bonus si benchmark fait (objectif %).
 */

import React, { useState, useEffect } from 'react';
import {
  Home,
  Calendar,
  FileSpreadsheet,
  Settings,
  TrendingUp,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  Check,
} from 'lucide-react';
import { MagasinProvider, useMagasin } from '../../contexts/MagasinContext';
import { chargerReferentielITM8, isReferentielCharge } from '../../services/referentielITM8';
import EtapeConfigPlanning from './EtapeConfigPlanning';
import Etape2bImportVentes from './Etape2bImportVentes';
import Etape3Configuration from './Etape3Configuration';
import Etape4PilotageCA from './Etape4PilotageCA';
import Etape5Communication from './Etape5Communication';

const ETAPES = [
  { id: 0, label: 'Planning', icon: Calendar, description: 'Dossier, semaine & objectif' },
  { id: 1, label: 'Ventes', icon: FileSpreadsheet, description: 'Import ventes/casse' },
  { id: 2, label: 'Config', icon: Settings, description: 'Paramétrer la semaine' },
  { id: 3, label: 'Pilotage', icon: TrendingUp, description: 'Gérer CA et gamme' },
  { id: 4, label: 'Export', icon: MessageSquare, description: 'Fichier équipe' },
];

// Composant interne qui utilise le contexte
const WizardContent = ({ onRetourAccueil }) => {
  const [etapeActive, setEtapeActive] = useState(0);
  const { importComplet, donneesMagasin, semaineSelectionnee } = useMagasin();
  const contentRef = React.useRef(null);

  // Scroll vers le haut à chaque changement d'étape
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [etapeActive]);

  // Charger le référentiel ITM8 au montage (pour les PLU, familles, rayons)
  useEffect(() => {
    if (!isReferentielCharge()) {
      chargerReferentielITM8('/Data/referentiel V2.xlsx');
    }
  }, []);

  // Vérifie si une étape est accessible
  const isEtapeAccessible = (index) => {
    // Étape 0 toujours accessible
    if (index === 0) return true;
    // Autres étapes : import doit être complet
    if (index > 0 && !importComplet) return false;
    // Ne peut pas sauter d'étapes
    return index <= etapeActive;
  };

  // Passer à l'étape suivante
  const allerEtapeSuivante = () => {
    if (etapeActive < ETAPES.length - 1) {
      setEtapeActive(etapeActive + 1);
    }
  };

  // Revenir à l'étape précédente
  const allerEtapePrecedente = () => {
    if (etapeActive > 0) {
      setEtapeActive(etapeActive - 1);
    }
  };

  // Rendu du contenu selon l'étape
  const renderContenuEtape = () => {
    switch (etapeActive) {
      case 0:
        return <EtapeConfigPlanning />;

      case 1:
        return <Etape2bImportVentes />;

      case 2:
        return <Etape3Configuration />;

      case 3:
        return <Etape4PilotageCA />;

      case 4:
        return <Etape5Communication />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-mousquetaires-beige flex flex-col">
      {/* ===== HEADER STICKY (Titre + Barre de progression) ===== */}
      <div className="sticky top-0 z-50">
        {/* Header bordeaux (thème Planning) */}
        <div className="bg-mousquetaires-bordeaux text-white px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onRetourAccueil}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Retour à l'accueil"
              >
                <Home className="w-5 h-5" />
              </button>
              <div className="h-8 w-px bg-white/30"></div>
              <div>
                <h1 className="text-xl font-bold">Préparer la semaine</h1>
                <p className="text-sm text-white/70">Construction du planning</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
              Objectif 2
            </span>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              {ETAPES.map((etape, index) => {
                const Icon = etape.icon;
                const isActive = index === etapeActive;
                const isDone = index < etapeActive;
                const isClickable = isEtapeAccessible(index);

                return (
                  <React.Fragment key={etape.id}>
                    <button
                      onClick={() => isClickable && setEtapeActive(index)}
                      disabled={!isClickable}
                      className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                        isActive
                          ? 'bg-mousquetaires-rouge text-white'
                          : isDone
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-400'
                      } ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{etape.label}</span>
                    </button>
                    {index < ETAPES.length - 1 && (
                      <ChevronRight className={`w-5 h-5 ${isDone ? 'text-green-500' : 'text-gray-300'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ===== CONTENU SCROLLABLE ===== */}
      <div ref={contentRef} className="flex-1 overflow-auto pb-24">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            {renderContenuEtape()}
          </div>
        </div>
      </div>

      {/* ===== FOOTER STICKY (Boutons de navigation) ===== */}
      <div className="sticky bottom-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Bouton Précédent */}
          <div>
            {etapeActive > 0 ? (
              <button
                onClick={allerEtapePrecedente}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" />
                Précédent
              </button>
            ) : (
              <button
                onClick={onRetourAccueil}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Accueil
              </button>
            )}
          </div>

          {/* Info étape courante */}
          <div className="text-center">
            <span className="text-sm text-gray-500">
              Étape {etapeActive + 1} / {ETAPES.length}
            </span>
            <span className="mx-2 text-gray-300">•</span>
            <span className="text-sm font-medium text-gray-700">
              {ETAPES[etapeActive].label}
            </span>
          </div>

          {/* Bouton Suivant / Terminer */}
          <div>
            {etapeActive < ETAPES.length - 1 ? (
              <button
                onClick={allerEtapeSuivante}
                disabled={etapeActive === 0 && !importComplet}
                className={`px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 ${
                  etapeActive === 0 && !importComplet
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-mousquetaires-rouge text-white hover:bg-mousquetaires-bordeaux'
                }`}
              >
                Valider et continuer
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={onRetourAccueil}
                className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Check className="w-5 h-5" />
                Terminer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Composant principal qui wrap avec le Provider
const WizardManager = ({ onRetourAccueil }) => {
  return (
    <MagasinProvider>
      <WizardContent onRetourAccueil={onRetourAccueil} />
    </MagasinProvider>
  );
};

export default WizardManager;
