import { ChevronLeft, Printer, TrendingUp, Settings } from 'lucide-react';
import { useState } from 'react';
import StatistiquesPanel from './StatistiquesPanel';
import ImpressionPanel from './ImpressionPanel';

export default function EtapePlanning({ planning, pdvInfo, onRetour, onPersonnaliser }) {
  const [selectedJour, setSelectedJour] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  if (!planning) return null;

  return (
    <>
      {/* Panel d'impression */}
      <ImpressionPanel
        isVisible={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
        selectedJour={selectedJour}
        planningData={planning}
        pdvInfo={pdvInfo}
      />

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  Planning de Production Optimisé
                </h1>
                {pdvInfo && (
                  <p className="text-sm text-gray-600">
                    PDV {pdvInfo.numero} - {pdvInfo.nom}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onPersonnaliser}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Personnaliser
                </button>
                <button
                  onClick={() => setShowStats(!showStats)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 flex items-center gap-2"
                >
                  <TrendingUp className="w-4 h-4" />
                  Stats
                </button>
                <button
                  onClick={() => setShowPrintPreview(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Imprimer
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto p-4">
          {/* Statistiques */}
          <StatistiquesPanel planning={planning} isVisible={showStats} />

          {/* Vue hebdomadaire */}
          {!selectedJour && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Planning Hebdomadaire</h2>

              {/* Sélection des jours */}
              <div className="grid grid-cols-7 gap-4 mb-6">
                {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map(jour => {
                  let total = 0;
                  if (planning.jours[jour]) {
                    for (const famille of Object.values(planning.jours[jour])) {
                      for (const creneaux of famille.values()) {
                        total += creneaux.total;
                      }
                    }
                  }

                  const poids = planning.stats.poidsJours[jour] || 0;

                  return (
                    <button
                      key={jour}
                      onClick={() => setSelectedJour(jour)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedJour(jour);
                        }
                      }}
                      className="bg-gray-50 p-4 rounded-lg cursor-pointer hover:bg-blue-50 transition relative focus:outline-none focus:ring-2 focus:ring-blue-500"
                      type="button"
                      aria-label={`Voir le planning du ${jour}`}
                    >
                      <div className="absolute top-2 right-2 text-xs text-gray-500">
                        {(poids * 100).toFixed(0)}%
                      </div>
                      <h3 className="font-semibold text-center mb-2">{jour}</h3>
                      <p className="text-2xl font-bold text-center text-blue-600">
                        {total}
                      </p>
                      <p className="text-xs text-center text-gray-500">articles</p>
                    </button>
                  );
                })}
              </div>

              {/* Résumé par famille */}
              <div className="grid grid-cols-3 gap-4">
                {['BOULANGERIE', 'VIENNOISERIE', 'PATISSERIE'].map(famille => {
                  let total = 0;
                  let nbProduits = 0;
                  if (planning.semaine[famille]) {
                    for (const qte of planning.semaine[famille].values()) {
                      total += qte;
                      nbProduits++;
                    }
                  }

                  return (
                    <div key={famille} className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">{famille}</h3>
                      <p className="text-xl font-bold">{total} unités/semaine</p>
                      <p className="text-sm text-gray-500">
                        {nbProduits} produits actifs
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Vue d'un jour spécifique */}
          {selectedJour && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">
                  Planning du {selectedJour}
                </h2>
                <button
                  onClick={() => setSelectedJour(null)}
                  className="text-blue-600 hover:underline flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Retour semaine
                </button>
              </div>

              <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r">
                <h4 className="font-semibold text-yellow-800 mb-2">💡 Principe d'ajustement :</h4>
                <p className="text-sm text-yellow-700">
                  <strong>Soir :</strong> Quantité proposée à ajuster selon le stock rayon.<br/>
                  <strong>Exemple :</strong> Pain aux céréales → Soir: 4 proposés, Stock rayon: 2 → À cuire: 4-2 = 2
                </p>
              </div>

              {['BOULANGERIE', 'VIENNOISERIE', 'PATISSERIE'].map(famille => {
                const produits = planning.jours[selectedJour][famille];
                if (!produits || produits.size === 0) return null;

                return (
                  <div key={famille} className="mb-8 bg-white rounded border">
                    <h3 className="text-lg font-bold text-center bg-blue-100 p-3 mb-0 border-2 border-gray-800 rounded-t">
                      {famille}
                    </h3>

                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm min-w-full">
                        <thead className="sticky top-0 bg-gray-100 z-10">
                          <tr>
                            <th className="border border-gray-800 p-3 text-left bg-gray-100 min-w-[250px] max-w-[300px]">
                              Produit
                            </th>
                            <th className="border border-gray-800 p-3 text-center bg-gray-100 min-w-[80px]">
                              Matin<br/>
                              <span className="text-xs text-gray-600">9h-12h</span>
                            </th>
                            <th className="border border-gray-800 p-3 text-center bg-gray-100 min-w-[80px]">
                              Midi<br/>
                              <span className="text-xs text-gray-600">12h-16h</span>
                            </th>
                            <th className="border border-gray-800 p-3 text-center bg-yellow-100 min-w-[100px]">
                              Soir (à ajuster)<br/>
                              <span className="text-xs text-gray-600">16h-23h</span>
                            </th>
                            <th className="border border-gray-800 p-3 text-center bg-orange-100 min-w-[120px]">
                              Ajustement<br/>
                              <span className="text-xs text-gray-600">Stock rayon</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from(produits || []).map(([produit, creneaux]) => (
                            <tr key={produit} className="hover:bg-gray-50">
                              <td className="border border-gray-800 p-3 text-sm font-medium text-left max-w-[300px] truncate" title={produit}>
                                {produit}
                              </td>
                              <td className="border border-gray-800 p-3 text-center font-bold text-green-700">
                                {creneaux.matin}
                              </td>
                              <td className="border border-gray-800 p-3 text-center font-bold text-yellow-700">
                                {creneaux.midi}
                              </td>
                              <td className="border border-gray-800 p-3 text-center font-bold text-orange-700 bg-yellow-50">
                                {creneaux.soir}
                              </td>
                              <td className="border border-gray-800 p-3 text-center bg-orange-50">
                                <div className="flex flex-col items-center gap-1">
                                  <div className="text-xs text-gray-600">Stock rayon:</div>
                                  <div className="w-12 h-6 border border-gray-400 bg-white"></div>
                                  <div className="text-xs text-gray-600">À cuire:</div>
                                  <div className="w-12 h-6 border border-gray-400 bg-white"></div>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bouton retour */}
          <div className="mt-6 flex justify-start">
            <button
              onClick={onRetour}
              className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
            >
              <ChevronLeft size={20} />
              Retour
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
