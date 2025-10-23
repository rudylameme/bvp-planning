import { Edit3, Star } from 'lucide-react';

export default function TableauProduits({
  produits,
  onChangerFamille,
  onChangerLibelle,
  onChangerPotentiel,
  onToggleActif,
  onSupprimerProduit
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Libellé</th>
            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Famille</th>
            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Potentiel Hebdo</th>
            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Volume</th>
            <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">Actif</th>
            <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">Actions</th>
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
                      className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                <td className="px-4 py-2">
                  <select
                    value={produit.famille}
                    onChange={(e) => onChangerFamille(produit.id, e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="BOULANGERIE">BOULANGERIE</option>
                    <option value="VIENNOISERIE">VIENNOISERIE</option>
                    <option value="PATISSERIE">PATISSERIE</option>
                    <option value="AUTRE">AUTRE</option>
                  </select>
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={produit.potentielHebdo}
                      onChange={(e) => onChangerPotentiel(produit.id, e.target.value)}
                      className={`flex-1 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 ${aPotentielModifie ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}
                      min="0"
                    />
                    {aPotentielModifie && (
                      <span className="text-green-600 text-xs whitespace-nowrap">✓ Défini</span>
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
                    className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 rounded"
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
