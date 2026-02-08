/**
 * CartesDiagnostic.jsx
 *
 * Bloc 2 : Tableau benchmark comparatif
 * Bloc 3 : Graphiques en barres verticales (CA, Articles, Tickets)
 *
 * Extrait de Etape1Diagnostic.jsx - aucune modification de logique.
 */

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Trophy,
  TrendingUp,
} from 'lucide-react';

// ============================================================================
// BLOC 2 : TABLEAU BENCHMARK COMPARATIF
// Question : "Je suis ou par rapport aux autres ?"
// ============================================================================
const Bloc2Benchmark = ({ donnees, indicateurs, magasin }) => {
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
      let valA, valB;
      // Prix Moyen est calcule, pas stocke dans les donnees
      if (triColonne === 'prixMoyen') {
        valA = a.qteBVP && a.qteBVP > 0 ? a.caBVP / a.qteBVP : 0;
        valB = b.qteBVP && b.qteBVP > 0 ? b.caBVP / b.qteBVP : 0;
      } else {
        valA = a[triColonne] || 0;
        valB = b[triColonne] || 0;
      }
      return triAsc ? valA - valB : valB - valA;
    });
  };

  const IconeTri = ({ colonne }) => {
    if (triColonne !== colonne) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-[#8B1538] ml-1">{triAsc ? '↑' : '↓'}</span>;
  };

  const allMagasins = trierMagasins(donnees?.classement?.detailsComparables || []);
  const magasinCourantIndex = allMagasins.findIndex(m => m.estMagasinCourant);

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

  if (allMagasins.length === 0) return null;

  const renderRow = (m) => {
    if (m.isSeparator) {
      return (
        <tr key="separator" className="bg-gray-50">
          <td colSpan="9" className="px-4 py-2 text-center text-sm text-gray-500">···</td>
        </tr>
      );
    }

    const rang = allMagasins.findIndex(mag => mag.code === m.code) + 1;

    return (
      <tr
        key={m.code}
        className={m.estMagasinCourant ? 'bg-[#8B1538]/10' : 'hover:bg-gray-50'}
      >
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2">
            {rang === 1 && <span>🥇</span>}
            {rang === 2 && <span>🥈</span>}
            {rang === 3 && <span>🥉</span>}
            {m.estMagasinCourant && rang > 3 && (
              <span className="text-xs bg-[#8B1538] text-white px-1.5 py-0.5 rounded font-bold">#{rang}</span>
            )}
            <span className={m.estMagasinCourant ? 'text-[#8B1538] font-bold' : 'text-gray-700'}>
              {String(m.code).padStart(5, '0')} - {m.ville}
            </span>
          </div>
        </td>
        <td className="px-3 py-2.5 text-right text-gray-500">{m.surface ? `${m.surface.toLocaleString('fr-FR')} m²` : '-'}</td>
        <td className="px-3 py-2.5 text-gray-500">{m.enseigne}</td>
        <td className="px-3 py-2.5">
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{m.vocation || 'NC'}</span>
        </td>
        <td className="px-3 py-2.5 text-right text-gray-600">{m.ticketsTotal.toLocaleString('fr-FR')}</td>
        <td className="px-3 py-2.5 text-right text-gray-600">{m.ticketsBVP.toLocaleString('fr-FR')}</td>
        <td className="px-3 py-2.5 text-right text-gray-600">{m.ticketMoyen.toFixed(2)} €</td>
        <td className="px-3 py-2.5 text-right text-gray-600">
          {m.qteBVP && m.qteBVP > 0 ? (m.caBVP / m.qteBVP).toFixed(2) : '-'} €
        </td>
        <td className="px-3 py-2.5 text-right">
          <span className={`font-bold ${m.estMagasinCourant ? 'text-[#8B1538]' : 'text-gray-800'}`}>
            {m.caBVP.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
          </span>
        </td>
      </tr>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="w-6 h-6 text-[#8B1538]" />
          <div>
            <h3 className="font-bold text-gray-800">Je me compare</h3>
            <p className="text-sm text-gray-500">
              Magasins comparables - {magasin.secteurLibelle || 'Secteur'} • Modèle {magasin.modele || 'NC'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-[#3B82F6]/10 text-[#3B82F6] rounded-full text-sm font-medium">
            {allMagasins.length} Mag.
          </span>
          {hasMoreMagasins && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 px-3 py-1 text-sm text-[#8B1538] hover:bg-[#8B1538]/10 rounded-lg transition-colors"
            >
              {isExpanded ? <><ChevronUp className="w-4 h-4" /> Réduire</> : <><ChevronDown className="w-4 h-4" /> Voir tout</>}
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Magasin</th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Surface</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Enseigne</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Vocation</th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-[#8B1538]" onClick={() => changerTri('ticketsTotal')}>
                Tck PDV<IconeTri colonne="ticketsTotal" />
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-[#8B1538]" onClick={() => changerTri('ticketsBVP')}>
                Tck BVP<IconeTri colonne="ticketsBVP" />
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-[#8B1538]" onClick={() => changerTri('ticketMoyen')}>
                Tck Moy.<IconeTri colonne="ticketMoyen" />
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-[#8B1538]" onClick={() => changerTri('prixMoyen')}>
                Prix Moy.<IconeTri colonne="prixMoyen" />
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-[#8B1538] uppercase cursor-pointer hover:text-[#8B1538]" onClick={() => changerTri('caBVP')}>
                CA BVP<IconeTri colonne="caBVP" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibleMagasins.map(renderRow)}
          </tbody>
          {/* Footer avec moyenne secteur en BLEU */}
          <tfoot className="bg-[#3B82F6]/10 border-t-2 border-[#3B82F6]/30">
            <tr>
              <td className="px-4 py-3 font-semibold text-[#3B82F6]" colSpan="4">
                📊 Moyenne du groupe
              </td>
              <td className="px-3 py-3 text-right font-medium text-[#3B82F6]">
                {Math.round(indicateurs.global.moyenneSecteur.ticketsTotal).toLocaleString('fr-FR')}
              </td>
              <td className="px-3 py-3 text-right font-medium text-[#3B82F6]">
                {Math.round(indicateurs.global.moyenneSecteur.ticketsBVP).toLocaleString('fr-FR')}
              </td>
              <td className="px-3 py-3 text-right font-medium text-[#3B82F6]">
                {indicateurs.global.moyenneSecteur.ticketMoyen.toFixed(2)} €
              </td>
              <td className="px-3 py-3 text-right font-medium text-[#3B82F6]">
                {indicateurs.global.moyenneSecteur.qteBVP && indicateurs.global.moyenneSecteur.qteBVP > 0
                  ? (indicateurs.global.moyenneSecteur.caBVP / indicateurs.global.moyenneSecteur.qteBVP).toFixed(2)
                  : '-'} €
              </td>
              <td className="px-3 py-3 text-right font-bold text-[#3B82F6]">
                {indicateurs.global.moyenneSecteur.caBVP.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

// ============================================================================
// BLOC 3 : GRAPHIQUES EN BARRES VERTICALES (CA, Articles, Tickets)
// Question : "Je progresse ou je regresse ?"
// 4 barres par indicateur : Moi (bordeaux), S-1 (gris), AS-1 (gris clair), Secteur (bleu)
// ============================================================================
const Bloc3Graphiques = ({ pdv, pdvS1, pdvAn1, moyenneSecteur }) => {
  // Hauteur maximale des barres en pixels
  const HAUTEUR_MAX = 120;

  const indicateurs = [
    {
      label: 'CA BVP',
      moi: pdv.caBVP || 0,
      s1: pdvS1.caBVP || 0,
      an1: pdvAn1.caBVP || 0,
      secteur: moyenneSecteur.caBVP || 0,
      format: 'euro',
    },
    {
      label: 'Articles vendus',
      moi: pdv.qteBVP || 0,
      s1: pdvS1.qteBVP || 0,
      an1: pdvAn1.qteBVP || 0,
      secteur: moyenneSecteur.qteBVP || 0,
      format: 'nombre',
    },
    {
      label: 'Tickets BVP',
      moi: pdv.ticketsBVP || 0,
      s1: pdvS1.ticketsBVP || 0,
      an1: pdvAn1.ticketsBVP || 0,
      secteur: moyenneSecteur.ticketsBVP || 0,
      format: 'nombre',
    },
  ];

  const formatValeur = (val, format) => {
    if (!val) return '-';
    if (format === 'euro') {
      if (val >= 1000) return `${(val / 1000).toFixed(1).replace('.', ',')} k€`;
      return `${val.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`;
    }
    return Math.round(val).toLocaleString('fr-FR');
  };

  // Format court pour au-dessus des barres (plus compact)
  const formatValeurCourt = (val, format) => {
    if (!val) return '-';
    if (format === 'euro') {
      if (val >= 1000) return `${(val / 1000).toFixed(1).replace('.', ',')}k`;
      return `${Math.round(val)}€`;
    }
    return Math.round(val).toLocaleString('fr-FR');
  };

  const calculerEcart = (actuel, reference) => {
    if (!reference || reference === 0 || !actuel) return null;
    return ((actuel - reference) / reference) * 100;
  };

  // Calcule la hauteur en pixels pour une barre
  const calculerHauteur = (valeur, maxValeur) => {
    if (!maxValeur || maxValeur === 0) return 8; // hauteur minimum
    const hauteur = Math.round((valeur / maxValeur) * HAUTEUR_MAX);
    return Math.max(hauteur, 8); // minimum 8px pour visibilite
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp className="w-6 h-6 text-[#8B1538]" />
        <div>
          <h3 className="font-bold text-gray-800">Ma situation</h3>
          <p className="text-sm text-gray-500">Comparaison avec le secteur et l'historique</p>
        </div>
      </div>

      {/* Grille avec classe speciale pour impression cote a cote */}
      <div className="bloc3-graphiques-grid grid grid-cols-1 md:grid-cols-3 gap-8">
        {indicateurs.map((ind) => {
          const maxVal = Math.max(ind.moi, ind.s1, ind.an1, ind.secteur) || 1;
          const ecartS1 = calculerEcart(ind.moi, ind.s1);

          // Donnees des 4 barres
          const barres = [
            { label: 'Moi', valeur: ind.moi, couleur: '#8B1538' },
            { label: 'S-1', valeur: ind.s1, couleur: '#9CA3AF' },
            { label: 'AS-1', valeur: ind.an1, couleur: '#D1D5DB' },
            { label: 'Sect.', valeur: ind.secteur, couleur: '#3B82F6' },
          ];

          return (
            <div key={ind.label} className="bloc3-graphique-item text-center">
              <h4 className="font-semibold text-gray-700 mb-2">{ind.label}</h4>

              {/* Zone des barres verticales avec valeurs au-dessus */}
              <div
                className="flex items-end justify-center gap-2 mb-2 mx-auto"
                style={{ height: `${HAUTEUR_MAX + 40}px` }}
              >
                {barres.map((barre) => (
                  <div key={barre.label} className="flex flex-col items-center justify-end" style={{ height: '100%' }}>
                    {/* Valeur au-dessus de la barre */}
                    <span
                      className="text-[9px] font-semibold mb-1 whitespace-nowrap"
                      style={{ color: barre.couleur }}
                    >
                      {formatValeurCourt(barre.valeur, ind.format)}
                    </span>
                    {/* La barre */}
                    <div
                      className="w-10 rounded-t-md transition-all duration-500 shadow-sm"
                      style={{
                        height: `${calculerHauteur(barre.valeur, maxVal)}px`,
                        backgroundColor: barre.couleur,
                        minHeight: '8px',
                      }}
                    />
                    {/* Label sous la barre */}
                    <span className="text-[9px] text-gray-500 mt-1 font-medium">
                      {barre.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Ecart vs S-1 en dessous */}
              {ecartS1 !== null && (
                <div className={`text-sm font-semibold ${ecartS1 >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                  {ecartS1 >= 0 ? '+' : ''}{ecartS1.toFixed(1)}% vs S-1
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legende */}
      <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#8B1538' }} />
          <span className="text-xs text-gray-500">Moi (S actuelle)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#9CA3AF' }} />
          <span className="text-xs text-gray-500">Historique (S-1, AS-1)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3B82F6' }} />
          <span className="text-xs text-gray-500">Secteur</span>
        </div>
      </div>
    </div>
  );
};

export { Bloc2Benchmark, Bloc3Graphiques };
