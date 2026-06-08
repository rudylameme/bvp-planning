/**
 * Barre de config persistante du module Benchmark Mensuel.
 *
 * Phase 1 : Mois + Base de mesure uniquement.
 * Phase 3 : ajoutera les filtres Vocation et Modèle.
 */

import React from 'react';
import { CalendarDays, Gauge } from 'lucide-react';

export default function BarreConfig({
  moisDisponibles,
  moisSelectionne,
  onChangeMois,
  baseMesure,
  onChangeBaseMesure,
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex flex-wrap items-center gap-4">
      {/* Mois */}
      <div className="flex items-center gap-2 min-w-[220px]">
        <CalendarDays className="w-4 h-4 text-indigo-600" />
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Mois</label>
        <select
          value={moisSelectionne?.code || ''}
          onChange={(e) => {
            const m = moisDisponibles.find(m => m.code === e.target.value);
            if (m) onChangeMois(m);
          }}
          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
        >
          {moisDisponibles.length === 0 && <option value="">— aucun —</option>}
          {moisDisponibles.map(m => (
            <option key={m.code} value={m.code}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Base de mesure */}
      <div className="flex items-center gap-2">
        <Gauge className="w-4 h-4 text-indigo-600" />
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Base</label>
        <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs">
          <button
            onClick={() => onChangeBaseMesure('mois')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              baseMesure === 'mois' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Mois complet
          </button>
          <button
            onClick={() => onChangeBaseMesure('hebdo')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              baseMesure === 'hebdo' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Moyenne hebdo
          </button>
        </div>
      </div>

      {/* Placeholders Phase 3 (Vocation, Modèle) */}
      <div className="ml-auto text-xs text-gray-400 italic">
        Filtres Vocation / Modèle à venir (Phase 3)
      </div>
    </div>
  );
}
