import { Edit3, Star } from 'lucide-react';

export default function TableauProduits({
  produits,
  onChangerFamille,
  onChangerLibelle,
  onChangerPotentiel,
  onToggleActif,
  onSupprimerProduit,
  onChangerRayon,
  onChangerProgramme,
  onChangerUnitesParPlaque,
  onChangerCodePLU,
  rayonsDisponibles = [],
  programmesDisponibles = []
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Libellé</th>
            <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700">Rayon</th>
            <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700">Programme</th>
            <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700">Code PLU</th>
            <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700">Unités/Plaque</th>
            <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700">Potentiel Hebdo</th>
            <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700">Volume</th>
            <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700">Actif</th>
            <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {produits.map((produit, index) => {
            const estModifie = produit.libelle !== produit.libellePersonnalise;
            const aPotentielModifie = produit.potentielHebdo > 0;

            return (
              <tr key={produit.id} className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${produit.actif ? '' : 'opacity-50'}`}>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={produit.libellePersonnalise}
                      onChange={(e) => onChangerLibelle(produit.id, e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    {estModifie && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full whitespace-nowrap">
                        <Edit3 size={12} />
                        Modifié
                      </span>
                    )}
                    {produit.custom && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full whitespace-nowrap">
                        <Star size={12} />
                        Custom
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-2 py-2">
                  <select
                    value={produit.rayon || ''}
                    onChange={(e) => onChangerRayon && onChangerRayon(produit.id, e.target.value)}
                    className={`w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs ${produit.reconnu ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300'}`}
                  >
                    <option value="">-- Sélect. --</option>
                    {rayonsDisponibles.map(rayon => (
                      <option key={rayon} value={rayon}>{rayon}</option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-2">
                  <select
                    value={produit.programme || ''}
                    onChange={(e) => onChangerProgramme && onChangerProgramme(produit.id, e.target.value)}
                    className={`w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs ${produit.reconnu ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300'}`}
                  >
                    <option value="">-- Sélect. --</option>
                    {programmesDisponibles.map(programme => (
                      <option key={programme} value={programme}>{programme}</option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-2">
                  <input
                    type="text"
                    value={produit.codePLU || ''}
                    onChange={(e) => onChangerCodePLU && onChangerCodePLU(produit.id, e.target.value)}
                    className={`w-20 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs ${produit.reconnu ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300'}`}
                    placeholder="PLU"
                  />
                </td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={produit.unitesParPlaque ?? 0}
                      onChange={(e) => onChangerUnitesParPlaque && onChangerUnitesParPlaque(produit.id, e.target.value)}
                      className="w-14 px-1 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                      min="0"
                      step="1"
                    />
                    {(produit.unitesParPlaque === 0 || !produit.unitesParPlaque) && (
                      <span className="text-orange-600 text-xs whitespace-nowrap" title="Produit sans cuisson">NC</span>
                    )}
                  </div>
                </td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={produit.potentielHebdo}
                      onChange={(e) => onChangerPotentiel(produit.id, e.target.value)}
                      className={`w-16 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm ${aPotentielModifie ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300'}`}
                      min="0"
                    />
                    {aPotentielModifie && (
                      <span className="text-emerald-600 text-xs whitespace-nowrap">✓</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2 text-gray-600">
                  {produit.totalVentes.toFixed(0)}
                </td>
                <td className="px-4 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={produit.actif}
                    onChange={() => onToggleActif(produit.id)}
                    className="w-5 h-5 text-amber-600 focus:ring-amber-500 rounded"
                  />
                </td>
                <td className="px-4 py-2 text-center">
                  {produit.custom && (
                    <button
                      onClick={() => onSupprimerProduit(produit.id)}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition"
                    >
                      Supprimer
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
