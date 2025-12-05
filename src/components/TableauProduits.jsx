import { Edit3, Star, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { getNomProgrammeAffiche } from '../services/referentielITM8';

/**
 * Composant pour afficher le badge de tendance
 */
const BadgeTendance = ({ tendance, variation }) => {
  if (!tendance) return null;

  const config = {
    croissance: { icon: TrendingUp, color: 'text-green-600 bg-green-100', label: 'Croissance' },
    declin: { icon: TrendingDown, color: 'text-red-600 bg-red-100', label: 'Déclin' },
    stable: { icon: Minus, color: 'text-gray-600 bg-gray-100', label: 'Stable' }
  };

  const { icon: Icon, color, label } = config[tendance] || config.stable;
  const variationStr = variation > 0 ? `+${variation}%` : `${variation}%`;

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${color}`}
      title={`${label} (${variationStr})`}
    >
      <Icon size={12} />
      <span className="hidden sm:inline">{variationStr}</span>
    </span>
  );
};

/**
 * Composant pour afficher le badge de fiabilité
 */
const BadgeFiabilite = ({ scoreConfiance, joursAvecVentes, nombreSemaines }) => {
  if (scoreConfiance === undefined) return null;

  let color, label;
  if (scoreConfiance >= 70) {
    color = 'bg-green-500';
    label = 'Fiable';
  } else if (scoreConfiance >= 40) {
    color = 'bg-yellow-500';
    label = 'Modéré';
  } else {
    color = 'bg-red-500';
    label = 'Variable';
  }

  return (
    <span
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold ${color}`}
      title={`${label} - ${scoreConfiance}% de confiance\n${joursAvecVentes} jours de données sur ${nombreSemaines} semaine(s)`}
    >
      {scoreConfiance}
    </span>
  );
};

/**
 * Tooltip détaillé pour les statistiques
 */
const TooltipStats = ({ stats }) => {
  if (!stats || stats.nombreSemaines === 0) return null;

  return (
    <div className="group relative inline-block ml-1">
      <Info size={14} className="text-gray-400 cursor-help" />
      <div className="hidden group-hover:block absolute z-50 left-0 top-6 w-56 p-3 bg-gray-900 text-white text-xs rounded shadow-lg">
        <div className="font-bold mb-2 border-b border-gray-700 pb-1">Statistiques (3 semaines)</div>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span>Jours de données:</span>
            <span className="font-semibold">{stats.joursAvecVentes} jours</span>
          </div>
          <div className="flex justify-between">
            <span>Semaines:</span>
            <span className="font-semibold">{stats.nombreSemaines}</span>
          </div>
          <div className="flex justify-between">
            <span>Moyenne hebdo:</span>
            <span className="font-semibold">{stats.moyenneHebdo}</span>
          </div>
          <div className="flex justify-between">
            <span>Variabilité:</span>
            <span className="font-semibold">{stats.variabilite}%</span>
          </div>
          <div className="flex justify-between">
            <span>Tendance:</span>
            <span className={`font-semibold ${stats.tendance === 'croissance' ? 'text-green-400' : stats.tendance === 'declin' ? 'text-red-400' : 'text-gray-400'}`}>
              {stats.tendance === 'croissance' ? '↗' : stats.tendance === 'declin' ? '↘' : '↔'} {stats.variationTendance > 0 ? '+' : ''}{stats.variationTendance}%
            </span>
          </div>
          <div className="flex justify-between border-t border-gray-700 pt-1 mt-1">
            <span>Score confiance:</span>
            <span className="font-bold text-amber-400">{stats.scoreConfiance}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function TableauProduits({
  produits,
  modeExpert = false,
  onChangerFamille,
  onChangerLibelle,
  onChangerPotentiel,
  onToggleActif,
  onSupprimerProduit,
  onChangerRayon,
  onChangerProgramme,
  onChangerUnitesParPlaque,
  onChangerCodePLU,
  onChangerUnitesParVente,
  rayonsDisponibles = [],
  programmesDisponibles = []
}) {
  // Vérifier si des stats multi-semaines sont disponibles
  const hasStats = produits.some(p => p.stats && p.stats.nombreSemaines >= 2);

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Libellé</th>
            <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700">Rayon</th>
            <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700">Programme</th>
            {modeExpert && <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700">Code PLU</th>}
            {modeExpert && <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700">Lot de vente</th>}
            <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700">Unités/Plaque</th>
            {hasStats && <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700" title="Tendance sur 3 semaines">Tendance</th>}
            {hasStats && <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700" title="Score de confiance (0-100)">Fiabilité</th>}
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
                      <option key={programme} value={programme}>{getNomProgrammeAffiche(programme)}</option>
                    ))}
                  </select>
                </td>
                {modeExpert ? (
                  <>
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
                      <input
                        type="number"
                        value={produit.unitesParVente ?? 1}
                        onChange={(e) => onChangerUnitesParVente && onChangerUnitesParVente(produit.id, e.target.value)}
                        className="w-14 px-1 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                        min="1"
                        step="1"
                        title="Quantité par lot de vente (ex: 3+1 = 4)"
                      />
                    </td>
                  </>
                ) : null}
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
                {/* Colonnes Tendance et Fiabilité (si stats multi-semaines disponibles) */}
                {hasStats && (
                  <td className="px-2 py-2 text-center">
                    {produit.stats && produit.stats.nombreSemaines >= 2 ? (
                      <div className="flex items-center justify-center">
                        <BadgeTendance
                          tendance={produit.stats.tendance}
                          variation={produit.stats.variationTendance}
                        />
                        <TooltipStats stats={produit.stats} />
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                )}
                {hasStats && (
                  <td className="px-2 py-2 text-center">
                    {produit.stats && produit.stats.nombreSemaines >= 2 ? (
                      <BadgeFiabilite
                        scoreConfiance={produit.stats.scoreConfiance}
                        joursAvecVentes={produit.stats.joursAvecVentes}
                        nombreSemaines={produit.stats.nombreSemaines}
                      />
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                )}
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
