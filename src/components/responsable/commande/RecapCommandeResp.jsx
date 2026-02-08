import React from 'react';
import { formatDateCourt } from '../../../utils/formatUtils';

/**
 * RecapCommandeResp - Résumé par livraison (masqué à l'impression)
 */
const RecapCommandeResp = ({
  stats,
  livraisons
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 print:hidden no-print">
      <h3 className="font-semibold text-[#58595B] mb-4">Résumé par livraison</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-[#ED1C24]/10 rounded-lg">
          <p className="text-2xl font-bold text-[#8B1538]">{stats.totalCartons}</p>
          <p className="text-sm text-gray-600">Total à commander</p>
        </div>
        {livraisons.map((liv, i) => (
          <div key={liv.id} className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-700">{stats.totauxParLivraison[liv.id] || 0}</p>
            <p className="text-sm text-gray-600">Livraison {i + 1}</p>
            {liv.date && <p className="text-xs text-gray-400">{formatDateCourt(liv.date)}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecapCommandeResp;
