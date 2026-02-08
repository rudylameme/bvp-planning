import React from 'react';
import FicheCommandeImpression from '../../shared/FicheCommandeImpression';
import { formatDateCourt } from '../../../utils/formatUtils';

/**
 * RecapCommande - Résumé par livraison et modal d'impression
 * Extrait de OngletCommande (V5)
 */
const RecapCommande = ({
  stats,
  livraisons,
  showImpressionModal,
  setShowImpressionModal,
  produitsAvecBesoins,
  magasin,
  semaine,
  annee,
  statsImpression,
  promosActives,
}) => {
  return (
    <>
      {/* Résumé par livraison */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 print:hidden no-print">
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
              {liv.dateReception && <p className="text-xs text-gray-400">{formatDateCourt(liv.dateReception)}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Modal d'impression */}
      <FicheCommandeImpression
        isVisible={showImpressionModal}
        onClose={() => setShowImpressionModal(false)}
        produits={produitsAvecBesoins}
        livraisons={livraisons}
        magasin={magasin}
        semaine={semaine}
        annee={annee}
        statsImpression={statsImpression}
        promosActives={promosActives}
      />
    </>
  );
};

export default RecapCommande;
