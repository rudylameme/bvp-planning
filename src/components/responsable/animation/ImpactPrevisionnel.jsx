import { TrendingUp, CheckCircle, Info, AlertTriangle } from 'lucide-react';

/**
 * ImpactPrevisionnel - Resume de l'impact des promos + bouton de validation
 * Affiche CA supplementaire, impact marge, quantites, et statut de validation
 */
export default function ImpactPrevisionnel({
  promosActives,
  produitsExceptionnels,
  impactGlobal,
  quantitesValidees,
  setQuantitesValidees
}) {
  if (promosActives.length === 0 && produitsExceptionnels.length === 0) return null;

  return (
    <div className={`border-2 rounded-lg p-6 transition-all ${
      quantitesValidees
        ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-300'
        : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[#58595B] flex items-center gap-2">
          <TrendingUp className={`w-5 h-5 ${quantitesValidees ? 'text-emerald-600' : 'text-amber-600'}`} />
          Impact prévisionnel
        </h3>
        {/* Bouton Valider */}
        <button
          onClick={() => setQuantitesValidees(!quantitesValidees)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all shadow-sm ${
            quantitesValidees
              ? 'bg-emerald-600 text-white hover:bg-emerald-700 ring-2 ring-emerald-300'
              : 'bg-white text-amber-700 border-2 border-amber-400 hover:bg-amber-50 hover:border-amber-500'
          }`}
        >
          <CheckCircle className="w-5 h-5" />
          {quantitesValidees ? 'Quantités validées \u2713' : 'Valider les quantités'}
        </button>
      </div>

      <div className={`grid ${produitsExceptionnels.length > 0 ? 'grid-cols-4' : 'grid-cols-3'} gap-4`}>
        <div className="text-center p-4 bg-white rounded-lg shadow-sm">
          <p className="text-sm text-gray-500 mb-1">CA Promos</p>
          <p className={`text-2xl font-bold ${parseFloat(impactGlobal.caSupplementaire) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {parseFloat(impactGlobal.caSupplementaire) >= 0 ? '+' : ''}{impactGlobal.caSupplementaire} €
          </p>
          {promosActives.length > 0 && (
            <p className="text-xs text-gray-400 mt-1">{promosActives.length} promo{promosActives.length > 1 ? 's' : ''}</p>
          )}
        </div>
        {produitsExceptionnels.length > 0 && (
          <div className="text-center p-4 bg-white rounded-lg shadow-sm border border-purple-100">
            <p className="text-sm text-gray-500 mb-1">CA Exceptionnels</p>
            <p className="text-2xl font-bold text-purple-600">
              +{impactGlobal.caExceptionnels} €
            </p>
            <p className="text-xs text-gray-400 mt-1">{impactGlobal.nbExceptionnels} produit{impactGlobal.nbExceptionnels > 1 ? 's' : ''}</p>
          </div>
        )}
        <div className="text-center p-4 bg-white rounded-lg shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Impact Marge</p>
          <p className={`text-2xl font-bold ${parseFloat(impactGlobal.diffMargeTotale) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {parseFloat(impactGlobal.diffMargeTotale) >= 0 ? '+' : ''}{impactGlobal.diffMargeTotale} €
          </p>
        </div>
        <div className="text-center p-4 bg-white rounded-lg shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Qté Supplémentaire</p>
          <p className="text-2xl font-bold text-[#ED1C24]">
            +{impactGlobal.qteSupplementaire + impactGlobal.qteExceptionnels}
          </p>
        </div>
      </div>

      {/* Resume de validation */}
      {quantitesValidees ? (
        <div className="mt-4 bg-emerald-100 border border-emerald-200 rounded-lg p-3 flex items-center gap-2 text-emerald-800">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">Quantités validées pour le planning de production.</p>
            {impactGlobal.nbQteAjustee > 0 && (
              <p className="text-xs mt-0.5 text-emerald-600">
                {impactGlobal.nbQteAjustee} produit{impactGlobal.nbQteAjustee > 1 ? 's' : ''} avec quantité ajustée par rapport à l'objectif.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-4 bg-amber-100 border border-amber-200 rounded-lg p-3 flex items-center gap-2 text-amber-800">
          <Info className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="text-sm">Vérifiez les quantités puis cliquez sur <strong>Valider les quantités</strong> pour confirmer.</p>
            {impactGlobal.nbQteAjustee > 0 && (
              <p className="text-xs mt-0.5 text-amber-600">
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                {impactGlobal.nbQteAjustee} produit{impactGlobal.nbQteAjustee > 1 ? 's' : ''} avec quantité ajustée par rapport à l'objectif.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
