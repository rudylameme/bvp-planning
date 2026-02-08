/**
 * Tableau Comparatif Benchmark - Classement des magasins comparables
 *
 * Composants :
 * - TableauClassement : Tableau triable avec les magasins du secteur, état collapsed/expanded
 */

import React, { useState } from 'react';
import {
  Users,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// MODIFICATION 5 : Tableau classement avec état collapsed
const TableauClassement = ({ donnees, indicateurs, magasin }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const [triColonne, setTriColonne] = useState('caBVP');
  const [triAsc, setTriAsc] = useState(false);

  const changerTri = (colonne) => {
    if (triColonne === colonne) {
      setTriAsc(!triAsc);
    } else {
      setTriColonne(colonne);
      setTriAsc(false);
    }
  };

  const trierMagasins = (magasins) => {
    if (!magasins) return [];
    return [...magasins].sort((a, b) => {
      const valA = a[triColonne] || 0;
      const valB = b[triColonne] || 0;
      return triAsc ? valA - valB : valB - valA;
    });
  };

  const IconeTri = ({ colonne }) => {
    if (triColonne !== colonne) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-[#ED1C24] ml-1">{triAsc ? '↑' : '↓'}</span>;
  };

  const allMagasins = trierMagasins(donnees.classement?.detailsComparables);
  const magasinCourantIndex = allMagasins.findIndex(m => m.estMagasinCourant);

  // En mode collapsed : top 3 + magasin courant (s'il n'est pas dans le top 3)
  const getVisibleMagasins = () => {
    if (isExpanded) return allMagasins;

    const top3 = allMagasins.slice(0, 3);
    const showCurrentSeparately = magasinCourantIndex > 2;

    if (showCurrentSeparately) {
      return [...top3, { isSeparator: true }, allMagasins[magasinCourantIndex]];
    }
    return top3;
  };

  const visibleMagasins = getVisibleMagasins();
  const hasMoreMagasins = allMagasins.length > 3;

  const renderRow = (m, index) => {
    if (m.isSeparator) {
      return (
        <tr key="separator" className="bg-gray-50">
          <td colSpan="9" className="px-4 py-2 text-center text-sm text-[#58595B]">
            ···
          </td>
        </tr>
      );
    }

    const rang = allMagasins.findIndex(mag => mag.code === m.code) + 1;
    const estMeilleur = rang === 1;

    return (
      <tr
        key={m.code}
        className={`${
          m.estMagasinCourant
            ? 'bg-[#E8E1D5] font-semibold'
            : 'hover:bg-gray-50'
        }`}
      >
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2">
            {estMeilleur && <span className="text-green-600">🥇</span>}
            {rang === 2 && <span>🥈</span>}
            {rang === 3 && <span>🥉</span>}
            {m.estMagasinCourant && rang > 3 && (
              <span className="text-xs bg-[#8B1538] text-white px-1.5 py-0.5 rounded">#{rang}</span>
            )}
            <span className={m.estMagasinCourant ? 'text-[#8B1538] font-bold' : 'text-gray-700'}>
              {m.code} - {m.ville}
            </span>
          </div>
        </td>
        <td className="px-3 py-2.5 text-right text-[#58595B]">
          {m.surface ? `${m.surface.toLocaleString('fr-FR')} m²` : '-'}
        </td>
        <td className="px-3 py-2.5 text-[#58595B]">{m.enseigne}</td>
        <td className="px-3 py-2.5 text-center">
          <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
            m.vocation === (magasin.vocation || 'SUPER ALIMENTAIRE')
              ? 'bg-[#ED1C24] text-white'
              : 'bg-orange-400 text-white'
          }`}>
            {(m.vocation || 'NC').replace('SUPER ALIMENTAIRE', 'SUPER').replace('ALIMENTAIRE', 'ALIM.')}
          </span>
        </td>
        <td className="px-3 py-2.5 text-right text-[#58595B]">{m.ticketsTotal.toLocaleString('fr-FR')}</td>
        <td className="px-3 py-2.5 text-right text-[#58595B]">{m.ticketsBVP.toLocaleString('fr-FR')}</td>
        <td className="px-3 py-2.5 text-right text-[#58595B]">{(m.prixMoyenArticle || 0).toFixed(2)} €</td>
        <td className="px-3 py-2.5 text-right text-[#58595B]">{m.ticketMoyen.toFixed(2)} €</td>
        <td className="px-3 py-2.5 text-right">
          <span className={`font-bold ${m.estMagasinCourant ? 'text-[#8B1538]' : 'text-gray-800'}`}>
            {m.caBVP.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
          </span>
        </td>
      </tr>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#58595B] flex items-center gap-2">
          <Users className="w-4 h-4" />
          Magasins comparables - {magasin.secteurLibelle} • Modèle {magasin.modele}
        </h3>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
            {allMagasins.length} Mag.
          </span>
          {hasMoreMagasins && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-[#8B1538] hover:bg-[#E8E1D5] rounded transition-colors"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Réduire
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Voir tout
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-[#58595B] uppercase whitespace-nowrap">Magasin</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-[#58595B] uppercase whitespace-nowrap">Surface</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-[#58595B] uppercase whitespace-nowrap">Enseigne</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-[#58595B] uppercase whitespace-nowrap">Vocation</th>
              <th
                className="px-3 py-2 text-right text-xs font-semibold text-[#58595B] uppercase cursor-pointer hover:text-[#8B1538] whitespace-nowrap"
                onClick={() => changerTri('ticketsTotal')}
              >
                Tck PDV<IconeTri colonne="ticketsTotal" />
              </th>
              <th
                className="px-3 py-2 text-right text-xs font-semibold text-[#58595B] uppercase cursor-pointer hover:text-[#8B1538] whitespace-nowrap"
                onClick={() => changerTri('ticketsBVP')}
              >
                Tck BVP<IconeTri colonne="ticketsBVP" />
              </th>
              <th
                className="px-3 py-2 text-right text-xs font-semibold text-[#58595B] uppercase cursor-pointer hover:text-[#8B1538] whitespace-nowrap"
                onClick={() => changerTri('prixMoyenArticle')}
              >
                Px Moy.<IconeTri colonne="prixMoyenArticle" />
              </th>
              <th
                className="px-3 py-2 text-right text-xs font-semibold text-[#58595B] uppercase cursor-pointer hover:text-[#8B1538] whitespace-nowrap"
                onClick={() => changerTri('ticketMoyen')}
              >
                Tck Moy.<IconeTri colonne="ticketMoyen" />
              </th>
              <th
                className="px-3 py-2 text-right text-xs font-semibold text-[#8B1538] uppercase cursor-pointer hover:text-[#ED1C24] whitespace-nowrap"
                onClick={() => changerTri('caBVP')}
              >
                CA BVP<IconeTri colonne="caBVP" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibleMagasins.map((m, index) => renderRow(m, index))}
          </tbody>
          <tfoot className="bg-[#F5F2ED] border-t-2 border-[#D1D3D4]">
            <tr>
              <td className="px-4 py-2.5 font-semibold text-[#8B1538]" colSpan="4">
                📊 Moyenne du groupe
              </td>
              <td className="px-3 py-2.5 text-right font-medium text-[#58595B]">
                {Math.round(indicateurs.global.moyenneSecteur.ticketsTotal).toLocaleString('fr-FR')}
              </td>
              <td className="px-3 py-2.5 text-right font-medium text-[#58595B]">
                {Math.round(indicateurs.global.moyenneSecteur.ticketsBVP).toLocaleString('fr-FR')}
              </td>
              <td className="px-3 py-2.5 text-right font-medium text-[#58595B]">
                {(indicateurs.global.moyenneSecteur.qteBVP > 0
                  ? indicateurs.global.moyenneSecteur.caBVP / indicateurs.global.moyenneSecteur.qteBVP
                  : 0
                ).toFixed(2)} €
              </td>
              <td className="px-3 py-2.5 text-right font-medium text-[#58595B]">
                {indicateurs.global.moyenneSecteur.ticketMoyen.toFixed(2)} €
              </td>
              <td className="px-3 py-2.5 text-right font-bold text-[#8B1538]">
                {indicateurs.global.moyenneSecteur.caBVP.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export { TableauClassement };
