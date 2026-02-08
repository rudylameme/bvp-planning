/**
 * Popup détail ventes - Graphique barres CSS (historique Moy. Hebdo)
 */
import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { formatEuro } from '../../../utils/formatUtils';

const PopupVentes = ({ produit, onClose }) => {
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
          <span className="font-semibold text-sm text-gray-700">Ventes - {produit.libelle}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
        </div>
        <p className="text-xs text-gray-500">Pas de données par semaine disponibles</p>
      </div>
    );
  }

  // Extraire les quantités vendues par semaine (ventesQte ou calculé depuis CA / prix)
  const semainesData = historique.map(h => {
    const qte = h.ventesQte ?? (produit.prixMoyen ? Math.round(h.ventesPVTTC / produit.prixMoyen) : null);
    return { ...h, qte: qte ?? 0 };
  });

  const maxCA = Math.max(...semainesData.map(h => h.ventesPVTTC), 1);
  const moyCA = semainesData.reduce((s, h) => s + h.ventesPVTTC, 0) / semainesData.length;
  const moyQte = produit.moyHebdo || produit.ventesQteSemaine || 0;

  // Tendance : comparer dernière moitié vs première moitié
  const mid = Math.floor(semainesData.length / 2);
  const debut = semainesData.slice(0, mid);
  const fin = semainesData.slice(mid);
  const moyDebut = debut.length ? debut.reduce((s, h) => s + h.ventesPVTTC, 0) / debut.length : 0;
  const moyFin = fin.length ? fin.reduce((s, h) => s + h.ventesPVTTC, 0) / fin.length : 0;
  const tendancePct = moyDebut > 0 ? ((moyFin - moyDebut) / moyDebut) * 100 : 0;

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
          <span className="flex-1 text-center">CA PV TTC</span>
          <span className="w-12 text-right">Qté</span>
        </div>
        {semainesData.map((h) => (
          <div key={h.semaine} className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500 w-10 flex-shrink-0">{h.semaineLabel}</span>
            <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden relative">
              <div
                className="absolute inset-y-0 left-0 bg-blue-400 rounded-l"
                style={{ width: `${(h.ventesPVTTC / maxCA) * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-semibold w-12 text-right text-gray-700">
              {Math.round(h.qte)}
            </span>
          </div>
        ))}
      </div>

      {/* Résumé */}
      <div className="mt-3 pt-2 border-t border-gray-100 flex justify-between text-[11px]">
        <span className="text-gray-500">Moy. qté: <strong className="text-gray-700">{moyQte}</strong></span>
        <span className="text-gray-500">Moy. CA: <strong className="text-gray-700">{formatEuro(moyCA)}</strong></span>
        <span className={`font-semibold ${tendancePct > 0 ? 'text-green-600' : tendancePct < 0 ? 'text-red-600' : 'text-gray-500'}`}>
          {tendancePct > 0 ? '\u2197' : tendancePct < 0 ? '\u2198' : '\u2192'} {Math.abs(tendancePct).toFixed(0)}%
        </span>
      </div>
    </div>
  );
};

export default PopupVentes;
