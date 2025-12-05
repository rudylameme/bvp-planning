import { Edit3, Star, ChevronDown, ChevronRight, CheckSquare, Square, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { useState } from 'react';
import { getNomProgrammeAffiche } from '../services/referentielITM8';

/**
 * Badge de tendance (croissance/déclin/stable)
 */
const BadgeTendance = ({ tendance, variation }) => {
  if (!tendance) return <span className="text-gray-400 text-xs">-</span>;

  const config = {
    croissance: { icon: TrendingUp, color: 'text-green-600 bg-green-100', label: 'Croissance' },
    declin: { icon: TrendingDown, color: 'text-red-600 bg-red-100', label: 'Déclin' },
    stable: { icon: Minus, color: 'text-gray-600 bg-gray-100', label: 'Stable' }
  };

  const { icon: Icon, color } = config[tendance] || config.stable;
  const variationStr = variation > 0 ? `+${variation}%` : `${variation}%`;

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${color}`} title={variationStr}>
      <Icon size={12} />
      <span>{variationStr}</span>
    </span>
  );
};

/**
 * Badge de fiabilité (score de confiance 0-100)
 */
const BadgeFiabilite = ({ scoreConfiance }) => {
  if (scoreConfiance === undefined) return <span className="text-gray-400 text-xs">-</span>;

  let color;
  if (scoreConfiance >= 70) color = 'bg-green-500';
  else if (scoreConfiance >= 40) color = 'bg-yellow-500';
  else color = 'bg-red-500';

  return (
    <span
      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold ${color}`}
      title={`Score de confiance: ${scoreConfiance}%`}
    >
      {scoreConfiance}
    </span>
  );
};

export default function TableauProduitsGroupes({
  produits,
  modeExpert = false,
  onChangerFamille,
  onChangerRayon,
  onChangerProgramme,
  onChangerUnitesParPlaque,
  onChangerCodePLU,
  onChangerLibelle,
  onChangerPotentiel,
  onToggleActif,
  onSupprimerProduit,
  onChangerUnitesParVente,
  rayonsDisponibles = [],
  programmesDisponibles = []
}) {
  // Ordre des rayons souhaité : BOULANGERIE, VIENNOISERIE, SNACKING, PATISSERIE, AUTRE
  const ordreRayons = {
    'BOULANGERIE': 1,
    'VIENNOISERIE': 2,
    'SNACKING': 3,
    'PATISSERIE': 4,
    'AUTRE': 5
  };

  // Récupérer tous les rayons uniques et les trier selon l'ordre souhaité
  const rayonsUniques = [...new Set(produits.map(p => p.rayon).filter(Boolean))].sort((a, b) => {
    const ordreA = ordreRayons[a] || 99;
    const ordreB = ordreRayons[b] || 99;
    return ordreA - ordreB;
  });

  const [rayonsOuverts, setRayonsOuverts] = useState(
    Object.fromEntries(rayonsUniques.map(r => [r, true]))
  );

  // Grouper les produits par rayon
  const produitsParRayon = {};
  rayonsUniques.forEach(rayon => {
    produitsParRayon[rayon] = produits.filter(p => p.rayon === rayon);
  });

  // Couleurs alternées pour les rayons - Palette Mousquetaires
  const couleursRayon = [
    'bg-stone-50 border-stone-300 text-stone-900',
    'bg-amber-50 border-amber-300 text-amber-900',
    'bg-blue-50 border-blue-300 text-blue-900',
    'bg-rose-50 border-rose-300 text-rose-900',
    'bg-emerald-50 border-emerald-300 text-emerald-900',
    'bg-purple-50 border-purple-300 text-purple-900',
    'bg-orange-50 border-orange-300 text-orange-900',
  ];

  const toggleRayon = (rayon) => {
    setRayonsOuverts(prev => ({
      ...prev,
      [rayon]: !prev[rayon]
    }));
  };

  // Activer/désactiver tous les produits d'un rayon
  const toggleToutRayon = (rayon) => {
    const produitsRayon = produitsParRayon[rayon];
    if (!produitsRayon || produitsRayon.length === 0) return;

    // Vérifier si tous les produits du rayon sont actifs
    const tousActifs = produitsRayon.every(p => p.actif);

    // Basculer tous les produits du rayon
    produitsRayon.forEach(produit => {
      if (produit.actif === tousActifs) {
        onToggleActif(produit.id);
      }
    });
  };

  const renderRayon = (nomRayon, indexRayon) => {
    const produitsRayon = produitsParRayon[nomRayon];
    if (!produitsRayon || produitsRayon.length === 0) return null;

    const estOuvert = rayonsOuverts[nomRayon];
    const tousActifs = produitsRayon.every(p => p.actif);
    const couleur = couleursRayon[indexRayon % couleursRayon.length];

    return (
      <div key={nomRayon} className="mb-8">
        {/* Séparateur visuel entre rayons */}
        {indexRayon > 0 && (
          <div className="mb-6 border-t-4 border-gray-300"></div>
        )}

        {/* En-tête de rayon */}
        <div className={`border-2 rounded-lg p-4 shadow-sm ${couleur}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => toggleRayon(nomRayon)}
                className="hover:opacity-70 transition"
                title="Plier/Déplier"
              >
                {estOuvert ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
              </button>
              <button
                onClick={() => toggleToutRayon(nomRayon)}
                className="hover:opacity-70 transition p-1"
                title={tousActifs ? "Désactiver tout le rayon" : "Activer tout le rayon"}
              >
                {tousActifs ? <CheckSquare size={22} /> : <Square size={22} />}
              </button>
              <h3 className="text-xl font-bold">
                {nomRayon}
              </h3>
              <span className="px-3 py-1 bg-white rounded-full text-sm font-semibold shadow-sm">
                {produitsRayon.length} produit{produitsRayon.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Tableau des produits */}
        {estOuvert && (
          <div className="mt-3 overflow-x-auto border-2 border-gray-200 rounded-lg shadow-sm">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Libellé</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Rayon</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Programme</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">U/Plaque</th>
                  {modeExpert && (
                    <>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Code PLU</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">U/Vente</th>
                    </>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Potentiel Hebdo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700" title="Moyenne hebdomadaire sur la période analysée">Moy. Hebdo</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700" title="Tendance des ventes">Tendance</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700" title="Score de confiance (0-100)">Fiabilité</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Actif</th>
                </tr>
              </thead>
              <tbody>
                {produitsRayon.map((produit, index) => {
                  const estModifie = produit.libelle !== produit.libellePersonnalise;

                  return (
                    <tr
                      key={produit.id}
                      className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${!produit.actif ? 'opacity-50' : ''} hover:bg-gray-100 transition`}
                    >
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={produit.libellePersonnalise}
                            onChange={(e) => onChangerLibelle(produit.id, e.target.value)}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
                        <select
                          value={produit.rayon || ''}
                          onChange={(e) => onChangerRayon(produit.id, e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          <option value="">-- Select. --</option>
                          {rayonsDisponibles.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={produit.programme || ''}
                          onChange={(e) => onChangerProgramme(produit.id, e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          <option value="">-- Select. --</option>
                          {programmesDisponibles.map(prog => (
                            <option key={prog} value={prog}>{getNomProgrammeAffiche(prog)}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={produit.unitesParPlaque ?? 0}
                          onChange={(e) => onChangerUnitesParPlaque(produit.id, e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          min="0"
                        />
                      </td>
                      {modeExpert && (
                        <>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={produit.codePLU || ''}
                              onChange={(e) => onChangerCodePLU(produit.id, e.target.value)}
                              className="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              value={produit.unitesParVente ?? 1}
                              onChange={(e) => onChangerUnitesParVente(produit.id, e.target.value)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              min="1"
                            />
                          </td>
                        </>
                      )}
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={produit.potentielHebdo}
                          onChange={(e) => onChangerPotentiel(produit.id, e.target.value)}
                          className="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          min="0"
                        />
                      </td>
                      <td className="px-4 py-2 text-gray-600 text-sm" title={`Total: ${produit.totalVentes.toFixed(0)} sur ${produit.stats?.nombreSemaines || 1} sem.`}>
                        {produit.stats?.moyenneHebdo ? produit.stats.moyenneHebdo.toFixed(0) : produit.totalVentes.toFixed(0)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {produit.stats?.nombreSemaines >= 2 ? (
                          <BadgeTendance tendance={produit.stats.tendance} variation={produit.stats.variationTendance} />
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {produit.stats?.nombreSemaines >= 2 ? (
                          <BadgeFiabilite scoreConfiance={produit.stats.scoreConfiance} />
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={produit.actif}
                          onChange={() => onToggleActif(produit.id)}
                          className="w-5 h-5 text-blue-600 focus:ring-blue-500 rounded"
                        />
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
      {rayonsUniques.map((rayon, index) => renderRayon(rayon, index))}
    </div>
  );
}
