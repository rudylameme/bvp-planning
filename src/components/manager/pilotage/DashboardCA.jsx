/**
 * Dashboard CA - Toujours visible en haut de l'étape Pilotage CA
 *
 * 4 blocs : Historique (CA + Casse) | Objectif | Prévision | Progression
 */
import React from 'react';
import { formatEuro } from '../../../utils/formatUtils';

// Couleur du taux de casse produit : < 5% vert, 5-20% orange, > 20% rouge
export const getCouleurTauxCasse = (taux) => {
  if (taux < 5) return { text: 'text-green-600', bg: 'bg-green-100' };
  if (taux <= 20) return { text: 'text-amber-600', bg: 'bg-amber-100' };
  return { text: 'text-red-600', bg: 'bg-red-100' };
};

const DashboardCA = ({ stats, objectifPourcent }) => {

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {/* Bloc Historique */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 shadow-sm">
        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">CA Historique</p>
        <p className="text-2xl font-bold text-gray-800">{formatEuro(stats.caHisto)}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">Moyenne hebdo sur {stats.nbSemaines} semaine{stats.nbSemaines > 1 ? 's' : ''}</p>
        <p className={`text-xs font-medium mt-1 ${getCouleurTauxCasse(stats.tauxCasse).text}`}>
          Casse {stats.tauxCasse.toFixed(1)}%
        </p>
      </div>

      {/* Bloc Objectif */}
      {(() => {
        const objectifAtteint = stats.caObjectif && stats.caPrevi >= stats.caObjectif;
        const objectifBorderColor = !stats.caObjectif ? 'border-gray-200' : objectifAtteint ? 'border-green-300' : 'border-red-300';
        const objectifVsHisto = objectifPourcent != null ? objectifPourcent : (stats.caHisto > 0 && stats.caObjectif ? ((stats.caObjectif - stats.caHisto) / stats.caHisto) * 100 : 0);
        return (
          <div className={`bg-white rounded-2xl border-2 ${objectifBorderColor} p-4 shadow-sm`}>
            <p className="text-xs text-[#8B1538] uppercase font-semibold mb-1">Objectif</p>
            <p className="text-2xl font-bold text-[#8B1538]">
              {stats.caObjectif ? `${objectifVsHisto > 0 ? '+' : ''}${objectifVsHisto.toFixed(0)}%` : '\u2014'}
            </p>
            <p className={`text-xs mt-1 ${!stats.caObjectif ? 'text-gray-400' : objectifAtteint ? 'text-green-600 font-semibold' : 'text-gray-400'}`}>
              {!stats.caObjectif ? 'Non d\u00e9fini' : objectifAtteint ? 'Objectif atteint' : 'vs CA actuel'}
            </p>
          </div>
        );
      })()}

      {/* Bloc Pr\u00e9vision */}
      {(() => {
        const progressionVsHisto = stats.caHisto > 0 ? ((stats.caPrevi - stats.caHisto) / stats.caHisto) * 100 : 0;
        return (
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Pr\u00e9vision</p>
            <p className="text-2xl font-bold text-gray-800">{formatEuro(stats.caPrevi)}</p>
            <p className={`text-xs mt-1 font-medium ${progressionVsHisto > 0 ? 'text-green-600' : progressionVsHisto < 0 ? 'text-red-600' : 'text-gray-400'}`}>
              {progressionVsHisto > 0 ? '+' : ''}{progressionVsHisto.toFixed(1)}% vs historique
            </p>
          </div>
        );
      })()}

      {/* Bloc Progression vs Historique */}
      {(() => {
        const progressionVsHistoBloc = stats.caHisto > 0 ? ((stats.caPrevi - stats.caHisto) / stats.caHisto) * 100 : 0;
        return (
          <div className={`bg-white rounded-2xl border-2 p-4 shadow-sm ${
            progressionVsHistoBloc > 0 ? 'border-green-300 bg-green-50/50' : progressionVsHistoBloc < 0 ? 'border-red-300 bg-red-50/50' : 'border-gray-200'
          }`}>
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Progression</p>
            <p className={`text-2xl font-bold ${
              progressionVsHistoBloc > 0 ? 'text-green-600' : progressionVsHistoBloc < 0 ? 'text-red-600' : 'text-gray-600'
            }`}>
              {progressionVsHistoBloc > 0 ? '+' : ''}{progressionVsHistoBloc.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-400 mt-1">vs historique</p>
          </div>
        );
      })()}
    </div>
  );
};

export default DashboardCA;
