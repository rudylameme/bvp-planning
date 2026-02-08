import React from 'react';
import { Calendar, Info, Plus, X } from 'lucide-react';
import { formatDateCourt } from '../../../utils/formatUtils';

/**
 * PlanningLivraisons - Configuration des livraisons, stock de sécurité et livraison forte
 * Masqué à l'impression
 */
const PlanningLivraisons = ({
  livraisons,
  ajouterLivraison,
  supprimerLivraison,
  modifierDateCommande,
  modifierDateReception,
  modeStockDefaut,
  setModeStockDefaut,
  livraisonForte,
  setLivraisonForte,
  statsLivraisonForte
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 print:hidden no-print">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[#58595B] flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Planning des commandes ({livraisons.length})
        </h3>
        {livraisons.length < 3 && (
          <button
            onClick={ajouterLivraison}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[#ED1C24] text-white rounded-lg hover:bg-[#8B1538] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Ajouter une livraison
          </button>
        )}
      </div>

      {/* Tableau horizontal des livraisons */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">

              </th>
              {livraisons.map((liv, index) => (
                <th key={liv.id} className="px-3 py-2 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${
                      index === 0 ? 'bg-[#ED1C24] text-white' :
                      index === 1 ? 'bg-[#8B1538] text-white' :
                      'bg-[#58595B] text-white'
                    }`}>
                      {index + 1}
                    </span>
                    <span className="font-semibold text-[#58595B]">Livraison {index + 1}</span>
                    {livraisons.length > 2 && (
                      <button
                        onClick={() => supprimerLivraison(liv.id)}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Supprimer cette livraison"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Ligne Date de commande */}
            <tr className="border-b border-gray-100">
              <td className="px-3 py-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <div className="w-2 h-2 rounded-full bg-[#ED1C24]"></div>
                  Date de commande
                </div>
              </td>
              {livraisons.map((liv) => (
                <td key={liv.id} className="px-3 py-3 text-center">
                  <input
                    type="date"
                    value={liv.dateCommande || ''}
                    onChange={(e) => modifierDateCommande(liv.id, e.target.value)}
                    className="px-3 py-2 border border-[#E8E1D5] rounded-lg focus:ring-2 focus:ring-[#ED1C24]/20 focus:border-[#ED1C24] text-center font-medium text-[#58595B] bg-[#E8E1D5]/20"
                  />
                  {liv.dateCommande && (
                    <p className="mt-1 text-xs text-[#8B1538]">{formatDateCourt(liv.dateCommande)}</p>
                  )}
                </td>
              ))}
            </tr>
            {/* Ligne Date de réception/livraison */}
            <tr>
              <td className="px-3 py-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  Date de réception
                </div>
              </td>
              {livraisons.map((liv) => (
                <td key={liv.id} className="px-3 py-3 text-center">
                  <input
                    type="date"
                    value={liv.dateReception || ''}
                    onChange={(e) => modifierDateReception(liv.id, e.target.value)}
                    className="px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-center font-medium text-[#58595B] bg-green-50/50"
                  />
                  {liv.dateReception && (
                    <p className="mt-1 text-xs text-green-600">{formatDateCourt(liv.dateReception)}</p>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Configuration du stock de sécurité */}
      <div className="mt-4 p-4 bg-green-50/50 border border-green-200 rounded-lg">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <h4 className="font-medium text-[#58595B] mb-1">Stock de sécurité</h4>
            <p className="text-sm text-gray-600">
              Calculé automatiquement selon la consommation journalière (ventes hebdo ÷ 7).
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Mode par défaut :</label>
            <div className="flex rounded-lg overflow-hidden border border-green-300">
              <button
                onClick={() => setModeStockDefaut('normal')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  modeStockDefaut === 'normal'
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-green-50'
                }`}
              >
                Normal (3j)
              </button>
              <button
                onClick={() => setModeStockDefaut('court')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-l border-green-300 ${
                  modeStockDefaut === 'court'
                    ? 'bg-amber-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-amber-50'
                }`}
              >
                Court (1.5j)
              </button>
            </div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-green-200 text-sm text-gray-600">
          <span className="font-medium">Exemple :</span> Produit avec 70 unités/sem → 10 unités/jour →
          <span className="font-semibold text-green-700"> Normal: 30 unités</span> |
          <span className="font-semibold text-amber-600"> Court: 15 unités</span>
        </div>
      </div>

      {/* Sélection livraison forte */}
      <div className="mt-4 p-4 bg-[#E8E1D5]/30 border border-[#E8E1D5] rounded-lg">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <h4 className="font-medium text-[#58595B] mb-1">Optimisation des livraisons</h4>
            <p className="text-sm text-gray-600">
              Regroupez les petites commandes sur une livraison pour réduire les réceptions.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Livraison forte :</label>
            <select
              value={livraisonForte || ''}
              onChange={(e) => setLivraisonForte(e.target.value ? parseInt(e.target.value) : null)}
              className="px-3 py-2 border border-[#E8E1D5] rounded-lg focus:ring-2 focus:ring-[#ED1C24]/20 focus:border-[#ED1C24] bg-white font-medium text-[#58595B]"
            >
              <option value="">Répartition égale</option>
              {livraisons.map((liv, index) => (
                <option key={liv.id} value={liv.id}>
                  Livraison {index + 1} {liv.dateReception ? `(${formatDateCourt(liv.dateReception).split(' ')[0]})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Affichage des stats si livraison forte sélectionnée */}
        {livraisonForte && (
          <div className="mt-3 pt-3 border-t border-[#E8E1D5] flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Références commandées :</span>
              <span className="font-bold text-[#58595B]">{statsLivraisonForte.nbTotalReferences}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Références regroupées :</span>
              <span className="font-bold text-[#ED1C24]">{statsLivraisonForte.nbProduitsRegroupes} / {statsLivraisonForte.nbARegrouper}</span>
              <span className="text-gray-500 text-xs">(les plus petites qtés)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Cartons regroupés :</span>
              <span className="font-bold text-green-600">{statsLivraisonForte.cartonsRegroupes}</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-2">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700">
          Les quantités sont réparties automatiquement. Modifiez une cellule pour fixer sa valeur,
          les autres se recalculeront. Cliquez sur ↺ pour remettre une ligne en mode automatique.
        </p>
      </div>

    </div>
  );
};

export default PlanningLivraisons;
