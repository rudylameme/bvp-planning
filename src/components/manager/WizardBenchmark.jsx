/**
 * Wizard Benchmark V5.1
 *
 * Objectif 1 : « Analyser mon rayon »
 * Parcours en 2 étapes :
 * 0. Import des données (réutilise Etape0Import)
 * 1. Diagnostic (réutilise Etape1Diagnostic)
 *
 * Accessible librement depuis l'accueil.
 * À la fin, propose d'aller vers « Préparer la semaine » (WizardManager).
 */

import React, { useState, useEffect } from 'react';
import {
  Home,
  Upload,
  BarChart3,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  CalendarCog,
} from 'lucide-react';
import { MagasinProvider, useMagasin } from '../../contexts/MagasinContext';
import { chargerReferentielITM8, isReferentielCharge } from '../../services/referentielITM8';
import Etape0Import from './Etape0Import';
import Etape1Diagnostic from './Etape1Diagnostic';

const ETAPES = [
  { id: 0, label: 'Import', icon: Upload, description: 'Charger les données' },
  { id: 1, label: 'Diagnostic', icon: BarChart3, description: 'Benchmark secteur' },
];

// ============================================================================
// Composant interne qui utilise le contexte MagasinContext
// ============================================================================
const BenchmarkContent = ({ onRetourAccueil, onAllerPlanning }) => {
  const [etapeActive, setEtapeActive] = useState(0);
  const { importComplet } = useMagasin();
  const contentRef = React.useRef(null);

  // Scroll vers le haut à chaque changement d'étape
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [etapeActive]);

  // Charger le référentiel ITM8 au montage
  useEffect(() => {
    if (!isReferentielCharge()) {
      chargerReferentielITM8('/Data/referentiel V2.xlsx');
    }
  }, []);

  // Vérifie si une étape est accessible
  const isEtapeAccessible = (index) => {
    if (index === 0) return true;
    if (index === 1 && !importComplet) return false;
    return index <= etapeActive;
  };

  const allerEtapeSuivante = () => {
    if (etapeActive < ETAPES.length - 1) {
      setEtapeActive(etapeActive + 1);
    }
  };

  const allerEtapePrecedente = () => {
    if (etapeActive > 0) {
      setEtapeActive(etapeActive - 1);
    }
  };

  // Rendu du contenu selon l'étape
  const renderContenuEtape = () => {
    switch (etapeActive) {
      case 0:
        return <Etape0Import />;
      case 1:
        return <Etape1Diagnostic onPrecedent={allerEtapePrecedente} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-mousquetaires-beige flex flex-col">
      {/* ===== HEADER STICKY ===== */}
      <div className="sticky top-0 z-50">
        {/* Header bleu (thème Benchmark) */}
        <div className="bg-blue-700 text-white px-6 py-3">
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
                <h1 className="text-xl font-bold">Analyser mon rayon</h1>
                <p className="text-sm text-white/70">Benchmark & stratégie</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
              Objectif 1
            </span>
          </div>
        </div>

        {/* Barre de progression (2 étapes) */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-center justify-center gap-4">
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
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-lg transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md'
                          : isDone
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-400'
                      } ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-sm font-medium">{etape.label}</span>
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

      {/* ===== FOOTER STICKY ===== */}
      <div className="sticky bottom-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Bouton Précédent / Retour accueil */}
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

          {/* Bouton Suivant / Aller au planning */}
          <div>
            {etapeActive < ETAPES.length - 1 ? (
              <button
                onClick={allerEtapeSuivante}
                disabled={!importComplet}
                className={`px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 ${
                  !importComplet
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Voir le diagnostic
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={onAllerPlanning}
                className="px-6 py-3 bg-mousquetaires-rouge text-white rounded-xl font-semibold hover:bg-mousquetaires-bordeaux transition-colors flex items-center gap-2"
              >
                <CalendarCog className="w-5 h-5" />
                Préparer la semaine
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Composant principal avec MagasinProvider
// ============================================================================
const WizardBenchmark = ({ onRetourAccueil, onAllerPlanning }) => {
  return (
    <MagasinProvider>
      <BenchmarkContent
        onRetourAccueil={onRetourAccueil}
        onAllerPlanning={onAllerPlanning}
      />
    </MagasinProvider>
  );
};

export default WizardBenchmark;
