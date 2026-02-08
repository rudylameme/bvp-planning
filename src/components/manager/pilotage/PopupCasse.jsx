/**
 * Popup détail casse - Graphique barres CSS
 */
import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { formatEuro } from '../../../utils/formatUtils';

const PopupCasse = ({ produit, onClose }) => {
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const historique = produit.historiqueParSemaine || [];
  if (historique.length === 0) {
    return (
      <div ref={ref} className="absolute z-50 bg-white border border-gray-300 rounded-xl shadow-xl p-4 w-72 -translate-x-1/2 left-1/2 top-full mt-2">
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold text-sm text-gray-700">Casse - {produit.libelle}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
        </div>
        <p className="text-xs text-gray-500">Pas de données par semaine disponibles</p>
      </div>
    );
  }

  const maxTaux = Math.max(...historique.map(h => h.tauxCasse), 1);
  const maxCA = Math.max(...historique.map(h => h.ventesPVTTC), 1);

  return (
    <div ref={ref} className="absolute z-50 bg-white border border-gray-300 rounded-xl shadow-xl p-4 w-80 -translate-x-1/2 left-1/2 top-full mt-2">
      <div className="flex justify-between items-center mb-3">
        <span className="font-semibold text-sm text-gray-700 truncate max-w-[220px]">{produit.libelle}</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
      </div>

      {/* Graphique barres */}
      <div className="space-y-1">
        <div className="flex text-[10px] text-gray-500 mb-1">
          <span className="w-10">Sem.</span>
          <span className="flex-1 text-center">CA / Casse</span>
          <span className="w-12 text-right">Taux</span>
        </div>
        {historique.map((h) => (
          <div key={h.semaine} className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500 w-10 flex-shrink-0">{h.semaineLabel}</span>
            <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden relative">
              {/* Barre CA */}
              <div
                className="absolute inset-y-0 left-0 bg-blue-200 rounded-l"
                style={{ width: `${(h.ventesPVTTC / maxCA) * 100}%` }}
              />
              {/* Barre casse superposée */}
              <div
                className="absolute inset-y-0 left-0 bg-red-400 rounded-l"
                style={{ width: `${(h.cassePAHT / maxCA) * 100}%` }}
              />
            </div>
            <span className={`text-[10px] font-semibold w-12 text-right ${
              h.tauxCasse > 15 ? 'text-red-600' : h.tauxCasse > 8 ? 'text-orange-600' : 'text-green-600'
            }`}>
              {h.tauxCasse.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>

      {/* Légende */}
      <div className="flex gap-4 mt-3 text-[10px] text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-2 bg-blue-200 rounded"></span> CA PV TTC</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 bg-red-400 rounded"></span> Casse PA HT</span>
      </div>

      {/* Résumé */}
      <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between text-[11px]">
        <span className="text-gray-500">Moy. casse: <strong className="text-gray-700">{produit.tauxCasse?.toFixed(1)}%</strong></span>
        <span className="text-gray-500">Casse/sem: <strong className="text-gray-700">{formatEuro(produit.cassePAHTSemaine || 0)}</strong></span>
      </div>
    </div>
  );
};

export default PopupCasse;
