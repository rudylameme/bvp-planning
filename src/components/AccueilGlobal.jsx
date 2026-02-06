/**
 * Page d'accueil globale V5
 *
 * Permet à l'utilisateur de choisir entre :
 * - Univers MANAGER (Piloter CA, Configurer, Communiquer)
 * - Univers ÉQUIPE (Planning jour, Inventaire, Commande)
 */

import React from 'react';
import { Briefcase, Users, ArrowRight, TrendingUp, Settings, MessageSquare, Calendar, ClipboardList, Package } from 'lucide-react';

const AccueilGlobal = ({ onChoixManager, onChoixEquipe }) => {
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
              V5.0
            </span>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full">
          {/* Titre */}
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-3">
              Bienvenue sur BVP Planning
            </h2>
            <p className="text-lg text-mousquetaires-gris">
              Choisissez votre espace de travail
            </p>
          </div>

          {/* Cartes de choix */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Carte MANAGER */}
            <button
              onClick={onChoixManager}
              className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-8 text-left border-2 border-transparent hover:border-mousquetaires-bordeaux"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="p-4 bg-mousquetaires-beige-dark rounded-xl group-hover:bg-mousquetaires-bordeaux transition-colors">
                  <Briefcase className="w-8 h-8 text-mousquetaires-bordeaux group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-800">MANAGER</h3>
                  <p className="text-mousquetaires-gris mt-1">Responsable rayon BVP</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-mousquetaires-gris">
                  <TrendingUp className="w-5 h-5 text-mousquetaires-bordeaux" />
                  <span>Piloter le CA</span>
                </div>
                <div className="flex items-center gap-3 text-mousquetaires-gris">
                  <Settings className="w-5 h-5 text-mousquetaires-bordeaux" />
                  <span>Configurer la semaine</span>
                </div>
                <div className="flex items-center gap-3 text-mousquetaires-gris">
                  <MessageSquare className="w-5 h-5 text-mousquetaires-bordeaux" />
                  <span>Communiquer avec l'équipe</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <span className="text-sm text-mousquetaires-gris">Configuration hebdomadaire</span>
                <div className="flex items-center gap-2 text-mousquetaires-rouge font-semibold group-hover:gap-3 transition-all">
                  <span>Accéder</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </button>

            {/* Carte ÉQUIPE */}
            <button
              onClick={onChoixEquipe}
              className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-8 text-left border-2 border-transparent hover:border-mousquetaires-rouge"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="p-4 bg-red-50 rounded-xl group-hover:bg-mousquetaires-rouge transition-colors">
                  <Users className="w-8 h-8 text-mousquetaires-rouge group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-800">ÉQUIPE</h3>
                  <p className="text-mousquetaires-gris mt-1">Équipiers en production</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-mousquetaires-gris">
                  <Calendar className="w-5 h-5 text-mousquetaires-rouge" />
                  <span>Planning du jour</span>
                </div>
                <div className="flex items-center gap-3 text-mousquetaires-gris">
                  <ClipboardList className="w-5 h-5 text-mousquetaires-rouge" />
                  <span>Inventaire</span>
                </div>
                <div className="flex items-center gap-3 text-mousquetaires-gris">
                  <Package className="w-5 h-5 text-mousquetaires-rouge" />
                  <span>Commande</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <span className="text-sm text-mousquetaires-gris">Consultation quotidienne</span>
                <div className="flex items-center gap-2 text-mousquetaires-rouge font-semibold group-hover:gap-3 transition-all">
                  <span>Accéder</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </button>
          </div>

          {/* Info */}
          <div className="text-center mt-12">
            <p className="text-gray-500 text-sm">
              💡 <strong>Conseil</strong> : Commencez par l'univers Manager pour configurer la semaine,
              puis l'équipe consulte le planning.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-gray-500">
          BVP Planning V5.0 • Les données restent sur votre ordinateur
        </div>
      </div>
    </div>
  );
};

export default AccueilGlobal;
