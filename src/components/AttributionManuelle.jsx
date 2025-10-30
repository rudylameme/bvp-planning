import { AlertCircle } from 'lucide-react';
import { getListeRayons, getListeProgrammes } from '../services/referentielITM8';

export default function AttributionManuelle({
  produitsNonReconnus,
  onAttribuer,
  onFermer
}) {
  if (!produitsNonReconnus || produitsNonReconnus.length === 0) {
    return null;
  }

  const rayonsDisponibles = getListeRayons();
  const programmesDisponibles = getListeProgrammes();

  const handleRayonChange = (produitId, nouveauRayon) => {
    onAttribuer(produitId, { rayon: nouveauRayon });
  };

  const handleProgrammeChange = (produitId, nouveauProgramme) => {
    onAttribuer(produitId, { programme: nouveauProgramme });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-amber-100 border-b border-amber-200 p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-orange-600" size={24} />
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                Attribution manuelle requise
              </h2>
              <p className="text-sm text-gray-600">
                {produitsNonReconnus.length} produit(s) n'ont pas été reconnus automatiquement
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {produitsNonReconnus.map((produit) => (
              <div
                key={produit.id}
                className="border border-gray-300 rounded-lg p-4 bg-gray-50"
              >
                <div className="mb-3">
                  <h3 className="font-semibold text-gray-800">{produit.libelle}</h3>
                  {produit.itm8 && (
                    <p className="text-xs text-gray-500">ITM8: {produit.itm8}</p>
                  )}
                  <p className="text-sm text-gray-600">
                    Volume total: {produit.totalVentes} unités
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sélection Rayon */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rayon
                    </label>
                    <select
                      value={produit.rayon || ''}
                      onChange={(e) => handleRayonChange(produit.id, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sélectionner un rayon...</option>
                      {rayonsDisponibles.map((rayon) => (
                        <option key={rayon} value={rayon}>
                          {rayon}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sélection Programme */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Programme de cuisson
                    </label>
                    <select
                      value={produit.programme || ''}
                      onChange={(e) => handleProgrammeChange(produit.id, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sélectionner un programme...</option>
                      {programmesDisponibles.map((prog) => (
                        <option key={prog} value={prog}>
                          {prog}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Indicateur de complétude */}
                {produit.rayon && produit.programme && (
                  <div className="mt-2 text-sm text-green-600 flex items-center gap-1">
                    <span>✓</span>
                    <span>Attribution complète</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            {produitsNonReconnus.filter(p => p.rayon && p.programme).length} / {produitsNonReconnus.length} produit(s) attribué(s)
          </p>
          <div className="flex gap-2">
            <button
              onClick={onFermer}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
            >
              Fermer et continuer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
