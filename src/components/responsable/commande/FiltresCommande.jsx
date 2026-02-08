import React from 'react';
import { Search, AlertTriangle } from 'lucide-react';

/**
 * FiltresCommande - Barre de recherche, filtre par famille et alerte stock manquant
 */
const FiltresCommande = ({
  recherche,
  setRecherche,
  familleFiltre,
  setFamilleFiltre,
  familles,
  stats
}) => {
  return (
    <>
      {/* Barre de recherche et filtres */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un produit..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ED1C24]/20 focus:border-[#ED1C24]"
            />
          </div>
          <select
            value={familleFiltre}
            onChange={(e) => setFamilleFiltre(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ED1C24]/20 focus:border-[#ED1C24]"
          >
            {familles.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Alerte stock manquant */}
      {stats.sansStock > 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-700">
              {stats.sansStock} produit{stats.sansStock > 1 ? 's' : ''} sans stock renseigné
            </p>
            <p className="text-sm text-amber-600">
              Demandez à l'équipe de saisir l'inventaire pour optimiser les commandes.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default FiltresCommande;
