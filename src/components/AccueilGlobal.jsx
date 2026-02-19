/**
 * Page d'accueil globale V5.1
 *
 * 3 objectifs de travail :
 * 1. Analyser mon rayon → Benchmark (Import + Diagnostic)
 * 2. Préparer la semaine → Construction du planning (Gamme, tranches, promos)
 * 3. Planning quotidien → Mise en œuvre (Vue équipe jour/heure)
 */

import React from 'react';
import {
  ArrowRight,
  BarChart3,
  CalendarCog,
  ClipboardCheck,
  TrendingUp,
  Target,
  Settings,
  Calendar,
  Package,
  Scissors,
} from 'lucide-react';

const AccueilGlobal = ({ onChoixAdherent, onChoixManager, onChoixEquipe }) => {
  // Construire la liste des cartes visibles (onClick non null)
  const cartes = [
    onChoixAdherent && {
      key: 'adherent',
      onClick: onChoixAdherent,
      hoverBorder: 'hover:border-blue-500',
      iconBg: 'bg-blue-50',
      iconBgHover: 'group-hover:bg-blue-500',
      titre: 'Analyser mon rayon',
      sousTitre: 'Benchmark & stratégie',
      Icon: BarChart3,
      accentColor: 'text-blue-500',
      accentColorAction: 'text-blue-600',
      etape: 'Étape 1',
      items: [
        { Icon: TrendingUp, label: 'Comparer au secteur' },
        { Icon: Target, label: 'Identifier le potentiel' },
        { Icon: BarChart3, label: 'Définir un objectif' },
      ],
      flux: { bg: 'bg-blue-50', text: 'text-blue-600', label: '1. Analyser' },
    },
    onChoixManager && {
      key: 'manager',
      onClick: onChoixManager,
      hoverBorder: 'hover:border-mousquetaires-bordeaux',
      iconBg: 'bg-mousquetaires-beige-dark',
      iconBgHover: 'group-hover:bg-mousquetaires-bordeaux',
      titre: 'Préparer la semaine',
      sousTitre: 'Construction du planning',
      Icon: CalendarCog,
      accentColor: 'text-mousquetaires-bordeaux',
      accentColorAction: 'text-mousquetaires-rouge',
      etape: 'Étape 2',
      items: [
        { Icon: Package, label: 'Choisir la gamme' },
        { Icon: Settings, label: 'Configurer jours & tranches' },
        { Icon: Scissors, label: 'Gérer promos & cuissons' },
      ],
      flux: { bg: 'bg-red-50', text: 'text-mousquetaires-bordeaux', label: '2. Préparer' },
    },
    onChoixEquipe && {
      key: 'equipe',
      onClick: onChoixEquipe,
      hoverBorder: 'hover:border-emerald-500',
      iconBg: 'bg-emerald-50',
      iconBgHover: 'group-hover:bg-emerald-500',
      titre: 'Planning quotidien',
      sousTitre: 'Mise en œuvre terrain',
      Icon: ClipboardCheck,
      accentColor: 'text-emerald-500',
      accentColorAction: 'text-emerald-600',
      etape: 'Étape 3',
      items: [
        { Icon: Calendar, label: 'Planning jour par jour' },
        { Icon: ClipboardCheck, label: 'Adapter noms & cuissons' },
        { Icon: Package, label: 'Commande & inventaire' },
      ],
      flux: { bg: 'bg-emerald-50', text: 'text-emerald-600', label: '3. Exécuter' },
    },
  ].filter(Boolean);

  // Adapter la grille au nombre de cartes
  const gridCols = cartes.length === 1
    ? 'md:grid-cols-1 max-w-md mx-auto'
    : cartes.length === 2
    ? 'md:grid-cols-2 max-w-3xl mx-auto'
    : 'md:grid-cols-3';

  return (
    <div className="min-h-screen bg-mousquetaires-beige flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <img
              src="/Data/GROUPEMENT_MOUSQUETAIRES_H_HD.png"
              alt="Groupement des Mousquetaires"
              className="h-12"
            />
            <div className="h-12 w-px bg-gray-300"></div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">BVP Planning</h1>
              <p className="text-sm text-gray-500">Boulangerie - Viennoiserie - Pâtisserie</p>
            </div>
            <span className="ml-auto px-3 py-1 bg-mousquetaires-rouge text-white rounded-full text-sm font-semibold">
              V5.2
            </span>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-5xl w-full">
          {/* Titre */}
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-800 mb-3">
              Bienvenue sur BVP Planning
            </h2>
            <p className="text-lg text-mousquetaires-gris">
              Que souhaitez-vous faire ?
            </p>
          </div>

          {/* Cartes objectifs */}
          <div className={`grid ${gridCols} gap-6`}>
            {cartes.map((carte) => (
              <button
                key={carte.key}
                onClick={carte.onClick}
                className={`group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-6 text-left border-2 border-transparent ${carte.hoverBorder} flex flex-col cursor-pointer`}
              >
                <div className="flex items-start gap-3 mb-5">
                  <div className={`p-3 ${carte.iconBg} rounded-xl ${carte.iconBgHover} transition-colors flex-shrink-0`}>
                    <carte.Icon className={`w-7 h-7 ${carte.accentColor} group-hover:text-white transition-colors`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-800 leading-tight">{carte.titre}</h3>
                    <p className="text-sm text-mousquetaires-gris mt-1">{carte.sousTitre}</p>
                  </div>
                </div>

                <div className="space-y-2.5 mb-5 flex-1">
                  {carte.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 text-sm text-mousquetaires-gris">
                      <item.Icon className={`w-4 h-4 ${carte.accentColor} flex-shrink-0`} />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span className="text-xs text-mousquetaires-gris">{carte.etape}</span>
                  <div className={`flex items-center gap-1.5 ${carte.accentColorAction} font-semibold text-sm group-hover:gap-2.5 transition-all`}>
                    <span>Accéder</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Flux visuel */}
          <div className="mt-8 flex items-center justify-center gap-3 text-sm text-gray-400">
            {cartes.map((carte, idx) => (
              <React.Fragment key={carte.key}>
                {idx > 0 && <ArrowRight className="w-4 h-4" />}
                <span className={`px-3 py-1 ${carte.flux.bg} ${carte.flux.text} rounded-full font-medium`}>
                  {carte.flux.label}
                </span>
              </React.Fragment>
            ))}
          </div>

          {/* Info */}
          <div className="text-center mt-6">
            <p className="text-gray-400 text-xs">
              Chaque étape est indépendante. L'analyse enrichit la préparation, la préparation génère le planning quotidien.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-gray-500">
          BVP Planning V5.2 • Les données restent sur votre ordinateur
        </div>
      </div>
    </div>
  );
};

export default AccueilGlobal;
