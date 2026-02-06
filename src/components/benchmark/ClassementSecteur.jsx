/**
 * Composant Classement Secteur
 *
 * Affiche :
 * - Position du PDV dans le secteur (ex: "2/31")
 * - Top 10 du secteur (taux de pénétration)
 * - Classement autour du PDV (+5 / -5)
 * - Détails des magasins comparables (même Secteur + même Modèle)
 */

import React, { useState } from 'react';
import { Trophy, Medal, Users, ChevronDown, ChevronUp, Target, TrendingUp } from 'lucide-react';

// Ligne du tableau de classement
const LigneClassement = ({ magasin, rang, estCourant, estMemeModele, afficherModele = true }) => {
  const bgClass = estCourant
    ? 'bg-green-100 border-l-4 border-green-500'
    : estMemeModele
      ? 'bg-blue-50 border-l-4 border-blue-300'
      : 'bg-white';

  return (
    <tr className={`${bgClass} hover:bg-gray-50 transition-colors`}>
      <td className="px-3 py-2 text-center">
        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${
          rang === 1 ? 'bg-yellow-400 text-yellow-900' :
          rang === 2 ? 'bg-gray-300 text-gray-700' :
          rang === 3 ? 'bg-orange-300 text-orange-800' :
          'bg-gray-100 text-gray-600'
        }`}>
          {rang}
        </span>
      </td>
      <td className="px-3 py-2">
        <div className="font-medium text-gray-800">{magasin.ville}</div>
        <div className="text-xs text-gray-500">{magasin.code}</div>
      </td>
      {afficherModele && (
        <td className="px-3 py-2 text-center">
          <span className={`px-2 py-1 rounded text-xs font-semibold ${
            estMemeModele ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {magasin.modele}
          </span>
        </td>
      )}
      <td className="px-3 py-2 text-right font-semibold text-gray-800">
        {(magasin.penetration * 100).toFixed(1)}%
      </td>
      <td className="px-3 py-2 text-right text-gray-600">
        {magasin.caBVP.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
      </td>
    </tr>
  );
};

const ClassementSecteur = ({ classement, magasin }) => {
  const [ongletActif, setOngletActif] = useState('comparables'); // 'comparables', 'top10', 'autour'

  if (!classement || !classement.positionSecteur) {
    return null;
  }

  const { positionSecteur, totalSecteur, top10Secteur, classementAutour, detailsComparables } = classement;

  // Vérifier si le PDV est dans le top 10
  const estDansTop10 = positionSecteur <= 10;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header avec position */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Classement Secteur {magasin.secteurCode}</h2>
              <p className="text-indigo-100 text-sm">{magasin.secteurLibelle}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">
              {positionSecteur}<span className="text-xl text-indigo-200">/{totalSecteur}</span>
            </div>
            <div className="text-indigo-100 text-sm">Position pénétration</div>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setOngletActif('comparables')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            ongletActif === 'comparables'
              ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Comparables ({detailsComparables.length})
        </button>
        <button
          onClick={() => setOngletActif('top10')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            ongletActif === 'top10'
              ? 'bg-yellow-50 text-yellow-700 border-b-2 border-yellow-500'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Medal className="w-4 h-4 inline mr-2" />
          Top 10 Secteur
        </button>
        <button
          onClick={() => setOngletActif('autour')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            ongletActif === 'autour'
              ? 'bg-green-50 text-green-700 border-b-2 border-green-500'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Target className="w-4 h-4 inline mr-2" />
          Autour de moi
        </button>
      </div>

      {/* Contenu des onglets */}
      <div className="p-4">
        {/* Onglet Comparables (même Secteur + même Modèle) */}
        {ongletActif === 'comparables' && (
          <div>
            <p className="text-sm text-gray-500 mb-3">
              Magasins du même secteur et même modèle ({magasin.modele})
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-center text-gray-600">#</th>
                    <th className="px-3 py-2 text-left text-gray-600">Magasin</th>
                    <th className="px-3 py-2 text-right text-gray-600">Pénétration</th>
                    <th className="px-3 py-2 text-right text-gray-600">CA BVP</th>
                  </tr>
                </thead>
                <tbody>
                  {detailsComparables.map((mag, i) => (
                    <LigneClassement
                      key={mag.code}
                      magasin={mag}
                      rang={i + 1}
                      estCourant={mag.estMagasinCourant}
                      estMemeModele={true}
                      afficherModele={false}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Onglet Top 10 */}
        {ongletActif === 'top10' && (
          <div>
            <p className="text-sm text-gray-500 mb-3">
              Les 10 meilleurs taux de pénétration du secteur
              {estDansTop10 && (
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                  🎉 Vous êtes dans le Top 10 !
                </span>
              )}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-center text-gray-600">#</th>
                    <th className="px-3 py-2 text-left text-gray-600">Magasin</th>
                    <th className="px-3 py-2 text-center text-gray-600">Modèle</th>
                    <th className="px-3 py-2 text-right text-gray-600">Pénétration</th>
                    <th className="px-3 py-2 text-right text-gray-600">CA BVP</th>
                  </tr>
                </thead>
                <tbody>
                  {top10Secteur.map((mag, i) => (
                    <LigneClassement
                      key={mag.code}
                      magasin={mag}
                      rang={i + 1}
                      estCourant={mag.estMagasinCourant}
                      estMemeModele={mag.estMemeModele}
                      afficherModele={true}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-green-100 border-l-2 border-green-500 rounded"></span>
                Votre magasin
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-blue-50 border-l-2 border-blue-300 rounded"></span>
                Même modèle ({magasin.modele})
              </span>
            </div>
          </div>
        )}

        {/* Onglet Autour de moi */}
        {ongletActif === 'autour' && (
          <div>
            <p className="text-sm text-gray-500 mb-3">
              Magasins proches de votre position (±5 rangs)
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-center text-gray-600">#</th>
                    <th className="px-3 py-2 text-left text-gray-600">Magasin</th>
                    <th className="px-3 py-2 text-center text-gray-600">Modèle</th>
                    <th className="px-3 py-2 text-right text-gray-600">Pénétration</th>
                    <th className="px-3 py-2 text-right text-gray-600">CA BVP</th>
                  </tr>
                </thead>
                <tbody>
                  {classementAutour.map((mag) => (
                    <LigneClassement
                      key={mag.code}
                      magasin={mag}
                      rang={mag.position}
                      estCourant={mag.estMagasinCourant}
                      estMemeModele={mag.estMemeModele}
                      afficherModele={true}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-green-100 border-l-2 border-green-500 rounded"></span>
                Votre magasin
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-blue-50 border-l-2 border-blue-300 rounded"></span>
                Même modèle ({magasin.modele})
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassementSecteur;
