import { Plus, AlertTriangle, TrendingUp } from 'lucide-react';
import { getAvantageColor } from './utils';

/**
 * CalculElasticite - Affichage des calculs automatiques d'elasticite
 * Montre : avantage client, marge promo, elasticite, qte objectif + bouton ajout
 */
export default function CalculElasticite({ calculsPromo, onAjouterPromo }) {
  if (!calculsPromo) return null;

  // Erreur de calcul
  if (calculsPromo.erreur) {
    return (
      <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5" />
        {calculsPromo.erreur}
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-emerald-200 bg-white rounded-lg p-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <TrendingUp className="w-4 h-4" />
        Calculs automatiques
        <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
          Promo sur {calculsPromo.nbJoursPromo} jour{calculsPromo.nbJoursPromo > 1 ? 's' : ''}
        </span>
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div>
          <p className="text-xs text-gray-500">Avantage client</p>
          <p className={`text-lg font-bold ${getAvantageColor(calculsPromo.avantageClient)}`}>
            -{calculsPromo.avantageClient.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Nouvelle marge</p>
          <p className="text-lg font-bold text-gray-700">
            {calculsPromo.margePromoEuros.toFixed(2)} €
            <span className="text-sm font-normal text-gray-500 ml-1">
              ({calculsPromo.tauxMargePromoMousquetaires.toFixed(1)}%)
            </span>
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Élasticité</p>
          <p className={`text-lg font-bold ${calculsPromo.elasticite > 5 ? 'text-red-600' : 'text-gray-700'}`}>
            {calculsPromo.elasticite.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Qté normale ({calculsPromo.nbJoursPromo}j)</p>
          <p className="text-lg font-bold text-gray-600">
            {Math.ceil(calculsPromo.qteNormalePeriode)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Qté objectif</p>
          <p className="text-lg font-bold text-[#ED1C24]">
            {calculsPromo.qteObjectif}
            <span className="text-sm font-normal text-gray-500 ml-1">
              (+{calculsPromo.qteSupplementaire})
            </span>
          </p>
        </div>
      </div>

      {calculsPromo.warning && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded p-2 text-red-700 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {calculsPromo.warning}
        </div>
      )}

      {/* Bouton Ajouter */}
      <button
        onClick={onAjouterPromo}
        className="mt-4 w-full px-4 py-2 bg-[#ED1C24] text-white rounded-lg hover:bg-[#8B1538] transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Ajouter à la liste
      </button>
    </div>
  );
}
