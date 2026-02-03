/**
 * Wizard Manager V5
 *
 * Parcours en 7 étapes pour le responsable BVP :
 * 0. Import des données
 * 1. Diagnostic (benchmark vs secteur)
 * 2. Objectif CA + semaine planning
 * 3. Import Ventes/Casse (gamme)
 * 4. Configuration (jours, opérations, regroupement)
 * 5. Pilotage CA (ventes, casse, gamme)
 * 6. Communication (export fichier équipe)
 */

import React, { useState, useEffect } from 'react';
import { Home, Upload, BarChart3, Target, FileSpreadsheet, Settings, TrendingUp, MessageSquare, ChevronRight, Check } from 'lucide-react';
import { MagasinProvider, useMagasin } from '../../contexts/MagasinContext';
import { chargerReferentielITM8, isReferentielCharge } from '../../services/referentielITM8';
import Etape0Import from './Etape0Import';
import Etape1Diagnostic from './Etape1Diagnostic';
import Etape2ObjectifCA from './Etape2ObjectifCA';
import Etape2bImportVentes from './Etape2bImportVentes';
import Etape3Configuration from './Etape3Configuration';
import Etape4PilotageCA from './Etape4PilotageCA';
import Etape5Communication from './Etape5Communication';

const ETAPES = [
  { id: 0, label: 'Import', icon: Upload, description: 'Charger les données' },
  { id: 1, label: 'Diagnostic', icon: BarChart3, description: 'Benchmark secteur' },
  { id: 2, label: 'Objectif', icon: Target, description: 'Définir le CA cible' },
  { id: 3, label: 'Ventes', icon: FileSpreadsheet, description: 'Import ventes/casse' },
  { id: 4, label: 'Config', icon: Settings, description: 'Paramétrer la semaine' },
  { id: 5, label: 'Pilotage', icon: TrendingUp, description: 'Gérer CA et gamme' },
  { id: 6, label: 'Communication', icon: MessageSquare, description: 'Exporter pour l\'équipe' },
];

// Composant interne qui utilise le contexte
const WizardContent = ({ onRetourAccueil }) => {
  const [etapeActive, setEtapeActive] = useState(0);
  const { importComplet, donneesMagasin, semaineSelectionnee } = useMagasin();
  const contentRef = React.useRef(null);

  // Scroll vers le haut à chaque changement d'étape
  useEffect(() => {
    // Scroll le container principal
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    // Aussi scroll la fenêtre au cas où
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [etapeActive]);

  // Charger le référentiel ITM8 au montage (pour les PLU, familles, rayons)
  useEffect(() => {
    if (!isReferentielCharge()) {
      chargerReferentielITM8('/Data/liste des produits BVP treville.xlsx');
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
        return <Etape0Import />;

      case 1:
        return (
          <Etape1Diagnostic
            onPrecedent={allerEtapePrecedente}
          />
        );

      case 2:
        return (
          <Etape2ObjectifCA
            onPrecedent={allerEtapePrecedente}
          />
        );

      case 3:
        return <Etape2bImportVentes />;

      case 4:
        return <Etape3Configuration />;

      case 5:
        return <Etape4PilotageCA />;

      case 6:
        return <Etape5Communication />;

      default:
        return (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-mousquetaires-beige-dark rounded-full flex items-center justify-center mx-auto mb-4">
              {React.createElement(ETAPES[etapeActive].icon, { className: 'w-8 h-8 text-mousquetaires-bordeaux' })}
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Étape {etapeActive} : {ETAPES[etapeActive].label}
            </h2>
            <p className="text-mousquetaires-gris mb-8">
              {ETAPES[etapeActive].description}
            </p>

            {/* Afficher les infos du magasin sélectionné */}
            {donneesMagasin && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 max-w-md mx-auto mb-6">
                <p className="text-blue-800">
                  <strong>{donneesMagasin.magasin.nom}</strong> ({donneesMagasin.magasin.code})
                  <br />
                  <span className="text-sm">
                    Semaine {semaineSelectionnee?.semaine} / {semaineSelectionnee?.annee}
                  </span>
                </p>
              </div>
            )}

            {/* Placeholder */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 max-w-md mx-auto">
              <p className="text-amber-800">
                Cette étape sera implémentée dans la <strong>Phase {etapeActive + 2}</strong> du plan V5.
              </p>
            </div>

            {/* Navigation */}
            <div className="flex justify-center gap-4 mt-8">
              {etapeActive > 0 && (
                <button
                  onClick={allerEtapePrecedente}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Précédent
                </button>
              )}
              {etapeActive < ETAPES.length - 1 && (
                <button
                  onClick={allerEtapeSuivante}
                  className="px-6 py-3 bg-mousquetaires-rouge text-white rounded-xl font-semibold hover:bg-mousquetaires-bordeaux transition-colors"
                >
                  Suivant
                </button>
              )}
              {etapeActive === ETAPES.length - 1 && (
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
        );
    }
  };

  return (
    <div className="min-h-screen bg-mousquetaires-beige flex flex-col">
      {/* ===== HEADER STICKY (Titre + Barre de progression) ===== */}
      <div className="sticky top-0 z-50">
        {/* Header */}
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
                <h1 className="text-xl font-bold">Espace Manager</h1>
                <p className="text-sm text-white/70">Configuration hebdomadaire</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
              V5.0
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
            {etapeActive > 0 && (
              <button
                onClick={allerEtapePrecedente}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
                Précédent
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
