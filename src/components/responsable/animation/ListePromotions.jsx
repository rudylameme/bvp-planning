import { Trash2, ShoppingCart, CheckCircle } from 'lucide-react';
import { calculerNbJoursPromo, getAvantageBadge } from './utils';

/**
 * ListePromotions - Tableau des promotions actives avec edition inline
 * Permet de modifier les dates, quantites validees et de supprimer des promos
 */
export default function ListePromotions({
  promosActives,
  setPromosActives,
  quantitesValidees
}) {
  // Supprimer une promo
  const supprimerPromo = (index) => {
    setPromosActives(promosActives.filter((_, i) => i !== index));
  };

  // Modifier les dates d'une promo existante (recalcule les quantites)
  const modifierDatePromo = (index, type, value) => {
    const promosModifiees = [...promosActives];
    const promo = promosModifiees[index];

    if (type === 'debut') {
      promo.dateDebut = value;
    } else {
      promo.dateFin = value;
    }

    // Recalculer les quantites selon la nouvelle duree
    const nbJours = calculerNbJoursPromo(promo.dateDebut, promo.dateFin);
    const qteMoyenneParJour = promo.qteNormaleHebdo / 7;
    const qteNormalePeriode = qteMoyenneParJour * nbJours;
    const qteObjectif = Math.ceil(qteNormalePeriode * (1 + promo.elasticite));

    promo.nbJoursPromo = nbJours;
    promo.qteNormalePeriode = qteNormalePeriode;
    promo.qteObjectif = qteObjectif;
    promo.qteValidee = qteObjectif; // Reinitialiser la qte validee au nouvel objectif
    promo.qteSupplementaire = qteObjectif - Math.ceil(qteNormalePeriode);

    setPromosActives(promosModifiees);
  };

  // Modifier la quantite validee d'une promo (saisie operateur)
  const modifierQteValidee = (index, value) => {
    const promosModifiees = [...promosActives];
    const promo = promosModifiees[index];
    const newQte = Math.max(0, parseInt(value, 10) || 0);
    promo.qteValidee = newQte;
    setPromosActives(promosModifiees);
  };

  if (promosActives.length === 0) return null;

  return (
    <div className={`bg-white rounded-lg shadow-sm border-2 p-6 mb-6 transition-colors ${quantitesValidees ? 'border-emerald-300' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[#58595B] flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-amber-600" />
          Produits en promo cette semaine ({promosActives.length})
        </h3>
        {quantitesValidees && (
          <span className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
            <CheckCircle className="w-4 h-4" /> Quantités validées
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200 bg-gray-50">
              <th className="text-left py-2.5 px-2 font-medium text-gray-500">Produit</th>
              <th className="text-right py-2.5 px-2 font-medium text-gray-500">Prix</th>
              <th className="text-center py-2.5 px-2 font-medium text-gray-500">Avantage</th>
              <th className="text-center py-2.5 px-2 font-medium text-gray-500">Période</th>
              <th className="text-right py-2.5 px-2 font-medium text-gray-500" title="Quantité vendue en moyenne par semaine sans promo">Qté<br/>Moy/Sem</th>
              <th className="text-right py-2.5 px-2 font-medium text-gray-500" title="Objectif promo calculé par élasticité">Qté<br/>Obj.</th>
              <th className="text-center py-2.5 px-2 font-medium text-amber-600 font-semibold" title="Quantité validée par l'opérateur">Qté<br/>Validée</th>
              <th className="text-center py-2.5 px-2 font-medium text-gray-500" style={{width: '90px'}}>Ratio</th>
              <th className="text-center py-2.5 px-2 font-medium text-gray-500" style={{width: '40px'}}></th>
            </tr>
          </thead>
          <tbody>
            {promosActives.map((promo, index) => {
              const qteValidee = promo.qteValidee ?? promo.qteObjectif;
              const ratioPct = promo.qteObjectif > 0 ? Math.round((qteValidee / promo.qteObjectif) * 100) : 100;
              const ratioMoyPct = promo.qteNormaleHebdo > 0 ? Math.round((qteValidee / promo.qteNormaleHebdo) * 100) : 100;
              return (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-2">
                    <p className="font-medium text-gray-800 truncate max-w-[180px]" title={promo.libelle}>{promo.libelle}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{promo.plu || promo.itm8 || promo.ean13 || '-'}</p>
                  </td>
                  {/* Prix avec ancien prix barre */}
                  <td className="py-3 px-2 text-right">
                    <span className="line-through text-gray-400 text-xs block">
                      {promo.prixNormalTTC.toFixed(2)} €
                    </span>
                    <span className="font-bold text-[#ED1C24]">
                      {promo.prixPromoTTC.toFixed(2)} €
                    </span>
                  </td>
                  {/* Avantage client avec badge colore */}
                  <td className="py-3 px-2 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold border ${getAvantageBadge(promo.avantageClient)}`}>
                      -{promo.avantageClient.toFixed(0)}%
                    </span>
                  </td>
                  {/* Periode modifiable */}
                  <td className="py-3 px-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <input
                        type="date"
                        value={promo.dateDebut || ''}
                        onChange={(e) => modifierDatePromo(index, 'debut', e.target.value)}
                        className="w-28 px-1 py-0.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-amber-500"
                      />
                      <span className="text-gray-400">{'\u2192'}</span>
                      <input
                        type="date"
                        value={promo.dateFin || ''}
                        onChange={(e) => modifierDatePromo(index, 'fin', e.target.value)}
                        min={promo.dateDebut}
                        className="w-28 px-1 py-0.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <span className="text-xs text-blue-600 mt-0.5 inline-block">
                      {promo.nbJoursPromo || calculerNbJoursPromo(promo.dateDebut, promo.dateFin)} jours
                    </span>
                  </td>
                  {/* Qte Moy/Sem - contexte historique */}
                  <td className="py-3 px-2 text-right">
                    <span className="text-gray-600 font-medium">{Math.round(promo.qteNormaleHebdo || 0)}</span>
                    <span className="text-xs text-gray-400 block">/ sem</span>
                  </td>
                  {/* Qte Objectif calculee */}
                  <td className="py-3 px-2 text-right">
                    <span className="text-gray-500 font-medium">{promo.qteObjectif}</span>
                  </td>
                  {/* Qte Validee -- saisie operateur */}
                  <td className="py-3 px-2 text-center">
                    <input
                      type="number"
                      min="0"
                      value={qteValidee}
                      onChange={(e) => modifierQteValidee(index, e.target.value)}
                      className={`w-20 px-2 py-1 text-center text-sm font-bold rounded-lg border-2 focus:ring-2 focus:ring-amber-500 focus:outline-none ${
                        qteValidee < promo.qteObjectif
                          ? 'border-amber-400 bg-amber-50 text-amber-700'
                          : qteValidee > promo.qteObjectif
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                          : 'border-gray-300 bg-white text-gray-800'
                      }`}
                    />
                  </td>
                  {/* Ratio visuel */}
                  <td className="py-3 px-2">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`text-xs font-bold ${ratioPct >= 100 ? 'text-emerald-600' : ratioPct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                        {ratioPct}%
                      </span>
                      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${ratioPct >= 100 ? 'bg-emerald-500' : ratioPct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                          style={{ width: `${Math.min(ratioPct, 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-400">{'\u00d7'}{(ratioMoyPct / 100).toFixed(1)} vs moy</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <button
                      onClick={() => supprimerPromo(index)}
                      className="text-red-400 hover:text-red-600 p-1 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
