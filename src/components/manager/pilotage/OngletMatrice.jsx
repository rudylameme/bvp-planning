/**
 * Onglet Limites - Matrice Famille × Jour
 * Cycle : S → F → f → P → S
 */
import React, { useState } from 'react';
import { Sliders } from 'lucide-react';

const FAMILLES = ['BOULANGERIE', 'VIENNOISERIE', 'PATISSERIE', 'SNACKING', 'AUTRE'];

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const JOURS_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

// Couleurs par rayon (charte Mousquetaires)
const COULEURS_RAYON = {
  BOULANGERIE: { bg: 'bg-stone-100', border: 'border-stone-300', text: 'text-stone-800', header: 'bg-stone-200' },
  VIENNOISERIE: { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-800', header: 'bg-amber-200' },
  PATISSERIE: { bg: 'bg-rose-100', border: 'border-rose-300', text: 'text-rose-800', header: 'bg-rose-200' },
  SNACKING: { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-800', header: 'bg-emerald-200' },
  AUTRE: { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-800', header: 'bg-slate-200' },
};

const OngletLimites = ({ limites, onLimitesChange }) => {
  const [inputPersoKey, setInputPersoKey] = useState(null); // "FAMILLE|jour" en cours d'édition
  const [inputPersoValue, setInputPersoValue] = useState('15');

  // Récupérer la valeur d'affichage d'une limite
  const getDisplayLimite = (limite) => {
    if (typeof limite === 'string' && limite.startsWith('P:')) return 'P';
    return limite || 'F';
  };

  const getPersoValue = (limite) => {
    if (typeof limite === 'string' && limite.startsWith('P:')) {
      return limite.substring(2);
    }
    return '15';
  };

  const getBgColor = (limite) => {
    const display = getDisplayLimite(limite);
    if (display === 'S') return 'bg-green-500 hover:bg-green-600';
    if (display === 'F') return 'bg-purple-500 hover:bg-purple-600';
    if (display === 'f') return 'bg-red-500 hover:bg-red-600';
    if (display === 'P') return 'bg-blue-500 hover:bg-blue-600';
    return 'bg-purple-500 hover:bg-purple-600';
  };

  const cycleLimit = (famille, jour) => {
    const newLimites = { ...limites };
    if (!newLimites[famille]) newLimites[famille] = {};
    newLimites[famille] = { ...newLimites[famille] };
    const current = getDisplayLimite(newLimites[famille][jour]);
    if (current === 'S') {
      newLimites[famille][jour] = 'F';
    } else if (current === 'F') {
      newLimites[famille][jour] = 'f';
    } else if (current === 'f') {
      // Passer en mode P : afficher l'input
      const key = `${famille}|${jour}`;
      setInputPersoKey(key);
      setInputPersoValue('15');
      newLimites[famille][jour] = 'P:15';
    } else {
      // P → S
      newLimites[famille][jour] = 'S';
      setInputPersoKey(null);
    }
    onLimitesChange(newLimites);
  };

  const handlePersoConfirm = (famille, jour) => {
    const val = parseFloat(inputPersoValue);
    if (!isNaN(val) && val > 0) {
      const newLimites = { ...limites };
      if (!newLimites[famille]) newLimites[famille] = {};
      newLimites[famille] = { ...newLimites[famille] };
      newLimites[famille][jour] = `P:${val}`;
      onLimitesChange(newLimites);
    }
    setInputPersoKey(null);
  };

  const setAllTo = (value) => {
    const newLimites = {};
    FAMILLES.forEach(f => {
      newLimites[f] = {};
      JOURS.forEach(j => { newLimites[f][j] = value; });
    });
    onLimitesChange(newLimites);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <Sliders className="w-5 h-5 text-violet-600" />
        <h3 className="font-semibold text-gray-700">Limite de progression par famille × jour</h3>
      </div>
      <p className="text-xs text-gray-500">Cliquez sur une cellule pour changer la limite (S → F → f → P → S)</p>

      {/* Actions rapides */}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setAllTo('S')}
          className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors">
          Tout S
        </button>
        <button type="button" onClick={() => setAllTo('F')}
          className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors">
          Tout F
        </button>
        <button type="button" onClick={() => setAllTo('f')}
          className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors">
          Tout f
        </button>
        <button type="button" onClick={() => {
          const newLimites = {};
          FAMILLES.forEach(f => {
            newLimites[f] = {};
            JOURS.forEach(j => {
              newLimites[f][j] = ['samedi', 'dimanche'].includes(j) ? 'f' : 'S';
            });
          });
          onLimitesChange(newLimites);
        }}
          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors">
          Semaine S / Week-end f
        </button>
      </div>

      {/* Matrice */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2 font-medium text-gray-600 bg-gray-50">Famille</th>
              {JOURS_LABELS.map((jour, i) => (
                <th key={i} className="p-2 font-medium text-gray-600 text-center bg-gray-50 min-w-[52px]">{jour}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FAMILLES.map(famille => (
              <tr key={famille} className="border-t border-gray-100">
                <td className="p-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${COULEURS_RAYON[famille]?.bg || 'bg-gray-100'} ${COULEURS_RAYON[famille]?.text || 'text-gray-800'}`}>
                    {famille}
                  </span>
                </td>
                {JOURS.map((jour, i) => {
                  const limite = limites[famille]?.[jour] || 'F';
                  const display = getDisplayLimite(limite);
                  const key = `${famille}|${jour}`;
                  const isEditingPerso = inputPersoKey === key;

                  return (
                    <td key={i} className="p-1 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => cycleLimit(famille, jour)}
                          className={`w-10 h-8 rounded text-white font-bold text-sm ${getBgColor(limite)} transition-colors cursor-pointer`}
                        >
                          {display}
                        </button>
                        {display === 'P' && !isEditingPerso && (
                          <button
                            onClick={() => {
                              setInputPersoKey(key);
                              setInputPersoValue(getPersoValue(limite));
                            }}
                            className="text-[10px] text-blue-600 hover:underline"
                          >
                            +{getPersoValue(limite)}%
                          </button>
                        )}
                        {isEditingPerso && (
                          <div className="flex items-center gap-0.5">
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={inputPersoValue}
                              onChange={(e) => setInputPersoValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handlePersoConfirm(famille, jour);
                              }}
                              onBlur={() => handlePersoConfirm(famille, jour)}
                              autoFocus
                              className="w-10 text-[10px] text-center border border-blue-300 rounded px-0.5 py-0.5"
                            />
                            <span className="text-[10px] text-gray-500">%</span>
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Légende */}
      <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-600">
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 bg-green-500 rounded"></span> S = Mathématique (sans plafond)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 bg-purple-500 rounded"></span> F = Forte progression (+20% max)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 bg-red-500 rounded"></span> f = Prudent (+10% max)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 bg-blue-500 rounded"></span> P = Personnalisée (+X% max)
        </span>
      </div>
    </div>
  );
};

export default OngletLimites;
