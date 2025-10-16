import { Edit3, Star, ChevronDown, ChevronRight, CheckSquare, Square } from 'lucide-react';
import { useState } from 'react';

export default function TableauProduitsGroupes({
  produits,
  onChangerFamille,
  onChangerLibelle,
  onChangerPotentiel,
  onToggleActif,
  onSupprimerProduit,
  onChangementsBatch
}) {
  const [famillesOuvertes, setFamillesOuvertes] = useState({
    BOULANGERIE: true,
    VIENNOISERIE: true,
    PÂTISSERIE: true,
    AUTRE: true
  });

  const [selectionsParFamille, setSelectionsParFamille] = useState({});

  // Grouper les produits par famille
  const produitsParFamille = {
    BOULANGERIE: produits.filter(p => p.famille === 'BOULANGERIE'),
    VIENNOISERIE: produits.filter(p => p.famille === 'VIENNOISERIE'),
    PÂTISSERIE: produits.filter(p => p.famille === 'PÂTISSERIE'),
    AUTRE: produits.filter(p => p.famille === 'AUTRE')
  };

  // Couleurs par famille
  const couleursFamille = {
    BOULANGERIE: 'bg-amber-100 border-amber-300 text-amber-800',
    VIENNOISERIE: 'bg-orange-100 border-orange-300 text-orange-800',
    PÂTISSERIE: 'bg-pink-100 border-pink-300 text-pink-800',
    AUTRE: 'bg-gray-100 border-gray-300 text-gray-800'
  };

  const toggleFamille = (famille) => {
    setFamillesOuvertes(prev => ({
      ...prev,
      [famille]: !prev[famille]
    }));
  };

  // Sélection/désélection d'un produit
  const toggleSelection = (famille, produitId) => {
    setSelectionsParFamille(prev => {
      const selections = prev[famille] || [];
      const nouvellesSelections = selections.includes(produitId)
        ? selections.filter(id => id !== produitId)
        : [...selections, produitId];

      return {
        ...prev,
        [famille]: nouvellesSelections
      };
    });
  };

  // Sélectionner/désélectionner tous les produits d'une famille
  const toggleTouteFamille = (famille) => {
    const tousIds = produitsParFamille[famille].map(p => p.id);
    const selections = selectionsParFamille[famille] || [];
    const tousSelectionnes = tousIds.every(id => selections.includes(id));

    setSelectionsParFamille(prev => ({
      ...prev,
      [famille]: tousSelectionnes ? [] : tousIds
    }));
  };

  // Appliquer un potentiel à tous les produits sélectionnés d'une famille
  const appliquerPotentielBatch = (famille) => {
    const selections = selectionsParFamille[famille] || [];
    if (selections.length === 0) {
      alert('Aucun produit sélectionné');
      return;
    }

    const potentiel = prompt(`Potentiel hebdomadaire à appliquer aux ${selections.length} produits sélectionnés :`);
    if (potentiel !== null) {
      selections.forEach(id => {
        onChangerPotentiel(id, potentiel);
      });
      // Réinitialiser les sélections
      setSelectionsParFamille(prev => ({
        ...prev,
        [famille]: []
      }));
    }
  };

  // Activer/désactiver tous les produits sélectionnés
  const toggleActifBatch = (famille, actif) => {
    const selections = selectionsParFamille[famille] || [];
    if (selections.length === 0) {
      alert('Aucun produit sélectionné');
      return;
    }

    selections.forEach(id => {
      const produit = produits.find(p => p.id === id);
      if (produit && produit.actif !== actif) {
        onToggleActif(id);
      }
    });

    // Réinitialiser les sélections
    setSelectionsParFamille(prev => ({
      ...prev,
      [famille]: []
    }));
  };

  const renderFamille = (nomFamille) => {
    const produitsDelaFamille = produitsParFamille[nomFamille];
    if (produitsDelaFamille.length === 0) return null;

    const estOuverte = famillesOuvertes[nomFamille];
    const selections = selectionsParFamille[nomFamille] || [];
    const nbSelections = selections.length;
    const tousSelectionnes = produitsDelaFamille.length > 0 &&
                            produitsDelaFamille.every(p => selections.includes(p.id));

    return (
      <div key={nomFamille} className="mb-6">
        {/* En-tête de famille */}
        <div className={`border-2 rounded-lg p-4 ${couleursFamille[nomFamille]}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => toggleFamille(nomFamille)}
                className="hover:opacity-70 transition"
              >
                {estOuverte ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
              </button>
              <button
                onClick={() => toggleTouteFamille(nomFamille)}
                className="hover:opacity-70 transition"
                title="Tout sélectionner / Tout désélectionner"
              >
                {tousSelectionnes ? <CheckSquare size={20} /> : <Square size={20} />}
              </button>
              <h3 className="text-lg font-bold">
                {nomFamille} ({produitsDelaFamille.length} produits)
              </h3>
              {nbSelections > 0 && (
                <span className="px-3 py-1 bg-white rounded-full text-sm font-semibold">
                  {nbSelections} sélectionné{nbSelections > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Actions batch */}
            {nbSelections > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => appliquerPotentielBatch(nomFamille)}
                  className="px-3 py-1 bg-white text-gray-800 rounded-lg hover:bg-gray-100 transition text-sm font-medium"
                >
                  Définir potentiel
                </button>
                <button
                  onClick={() => toggleActifBatch(nomFamille, true)}
                  className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                >
                  Activer
                </button>
                <button
                  onClick={() => toggleActifBatch(nomFamille, false)}
                  className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
                >
                  Désactiver
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tableau des produits */}
        {estOuverte && (
          <div className="mt-2 overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 w-8">
                    <Square size={16} className="opacity-30" />
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Libellé</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Potentiel Hebdo</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Volume</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">Actif</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {produitsDelaFamille.map((produit, index) => {
                  const estSelectionne = selections.includes(produit.id);
                  const estModifie = produit.libelle !== produit.libellePersonnalise;
                  const aPotentielModifie = produit.potentielHebdo > 0;

                  return (
                    <tr
                      key={produit.id}
                      className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${!produit.actif ? 'opacity-50' : ''} ${estSelectionne ? 'bg-blue-50' : ''} hover:bg-gray-100 transition`}
                    >
                      <td className="px-4 py-2">
                        <button
                          onClick={() => toggleSelection(nomFamille, produit.id)}
                          className="hover:opacity-70"
                        >
                          {estSelectionne ? (
                            <CheckSquare size={18} className="text-blue-600" />
                          ) : (
                            <Square size={18} className="text-gray-400" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={produit.libellePersonnalise}
                            onChange={(e) => onChangerLibelle(produit.id, e.target.value)}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                          />
                          {estModifie && (
                            <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full whitespace-nowrap">
                              <Edit3 size={10} />
                              Modifié
                            </span>
                          )}
                          {produit.custom && (
                            <span className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full whitespace-nowrap">
                              <Star size={10} />
                              Custom
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={produit.potentielHebdo}
                            onChange={(e) => onChangerPotentiel(produit.id, e.target.value)}
                            className={`w-24 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm ${aPotentielModifie ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}
                            min="0"
                          />
                          {aPotentielModifie && (
                            <span className="text-green-600 text-xs whitespace-nowrap">✓</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-gray-600 text-sm">
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
                            className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition"
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
        )}
      </div>
    );
  };

  return (
    <div>
      {renderFamille('BOULANGERIE')}
      {renderFamille('VIENNOISERIE')}
      {renderFamille('PÂTISSERIE')}
      {renderFamille('AUTRE')}
    </div>
  );
}
