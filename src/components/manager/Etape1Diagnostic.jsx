/**
 * Étape 1 : Diagnostic V5 - Structure Pédagogique en 7 Blocs
 *
 * Cheminement logique :
 * 1️⃣ JE ME COMPARE    →    2️⃣ JE REGARDE MA SITUATION    →    3️⃣ JE VOIS L'ENJEU
 *
 * Palette de couleurs :
 * - Bordeaux (#8B1538) = MOI / Actuel
 * - Gris (#9CA3AF) = Historique (S-1, AS-1)
 * - Bleu (#3B82F6) = Secteur / Objectif
 * - Vert (#22C55E) = Potentiel / Gain
 * - Rouge (#EF4444) = Alerte / Perte
 */

import React, { useState, useMemo } from 'react';
import {
  Store,
  Users,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Target,
  Clock,
  AlertCircle,
  CheckCircle,
  Lightbulb,
  Trophy,
  TrendingUp,
} from 'lucide-react';
import { useMagasin } from '../../contexts/MagasinContext';

// ============================================================================
// CONSTANTES : Palette de couleurs harmonieuse
// ============================================================================
const COLORS = {
  moi: '#8B1538',      // Bordeaux - MOI
  historique: '#9CA3AF', // Gris - S-1, AS-1
  secteur: '#3B82F6',   // Bleu - Secteur
  gain: '#22C55E',      // Vert - Potentiel
  perte: '#EF4444',     // Rouge - Alerte
};

// ============================================================================
// BLOC 1 : IDENTIFICATION + KPIs GLOBAUX
// Question : "C'est qui ? C'est combien ?"
// ============================================================================
const Bloc1Identification = ({ magasin, pdv, semaineSelectionnee, comparaison }) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header magasin */}
      <div className="bg-[#8B1538] text-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Store className="w-8 h-8" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {String(magasin.code).padStart(5, '0')} - {magasin.nom}
              </div>
              <div className="text-white/80 flex items-center gap-2 mt-1">
                <span>{magasin.enseigne}</span>
                {magasin.surface && <span>• {magasin.surface.toLocaleString('fr-FR')} m²</span>}
                {magasin.vocation && <span className="px-2 py-0.5 bg-white/20 rounded text-sm">{magasin.vocation}</span>}
              </div>
            </div>
          </div>

          {/* KPIs en ligne */}
          <div className="flex flex-wrap gap-3">
            <div className="text-center px-4 py-2 bg-white/10 rounded-lg min-w-[100px]">
              <div className="text-xs text-white/70">Tickets PDV</div>
              <div className="text-2xl font-bold">{pdv.ticketsTotal.toLocaleString('fr-FR')}</div>
            </div>
            <div className="text-center px-4 py-2 bg-white/10 rounded-lg min-w-[100px]">
              <div className="text-xs text-white/70">Tickets BVP</div>
              <div className="text-2xl font-bold">{pdv.ticketsBVP.toLocaleString('fr-FR')}</div>
            </div>
            <div className="text-center px-4 py-2 bg-white/10 rounded-lg min-w-[100px]">
              <div className="text-xs text-white/70">Ticket Moyen</div>
              <div className="text-2xl font-bold">{pdv.ticketMoyen.toFixed(2)} €</div>
            </div>
            <div className="text-center px-4 py-2 bg-white/20 rounded-lg min-w-[100px]">
              <div className="text-xs text-white/70">CA BVP</div>
              <div className="text-2xl font-bold">{pdv.caBVP.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</div>
            </div>
          </div>
        </div>
      </div>

      {/* Explication du modèle */}
      <div className="bg-blue-50 px-6 py-3 flex items-center gap-3 border-b border-blue-100">
        <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0" />
        <p className="text-blue-800 text-sm">
          <strong>Modèle {magasin.modele || 'NC'}</strong> = Rayon BVP de 280 à 380K€ CA/an, en cuisson processée (précuit).
          Comparaison avec <strong>{comparaison.nombreMagasinsComparables} magasins</strong> du même profil.
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// BLOC 2 : TABLEAU BENCHMARK COMPARATIF
// Question : "Je suis où par rapport aux autres ?"
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
      // Prix Moyen est calculé, pas stocké dans les données
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
// Question : "Je progresse ou je régresse ?"
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
    return Math.max(hauteur, 8); // minimum 8px pour visibilité
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

      {/* Grille avec classe spéciale pour impression côte à côte */}
      <div className="bloc3-graphiques-grid grid grid-cols-1 md:grid-cols-3 gap-8">
        {indicateurs.map((ind) => {
          const maxVal = Math.max(ind.moi, ind.s1, ind.an1, ind.secteur) || 1;
          const ecartS1 = calculerEcart(ind.moi, ind.s1);

          // Données des 4 barres
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

              {/* Écart vs S-1 en dessous */}
              {ecartS1 !== null && (
                <div className={`text-sm font-semibold ${ecartS1 >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                  {ecartS1 >= 0 ? '+' : ''}{ecartS1.toFixed(1)}% vs S-1
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Légende */}
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

// ============================================================================
// BLOC 4 : BARRES DE PÉNÉTRATION PAR TRANCHE HORAIRE
// Question : "À quel moment je perds des clients ?"
// ============================================================================
const Bloc4Penetration = ({ indicateurs }) => {
  const tranches = [
    { key: '00_Autre', label: 'Autres horaires', heure: '00h-09h' },
    { key: '09h_12h', label: 'Matin', heure: '9h-12h' },
    { key: '12h_14h', label: 'Midi', heure: '12h-14h' },
    { key: '14h_16h', label: 'Début après-midi', heure: '14h-16h' },
    { key: '16h_19h', label: 'Fin après-midi', heure: '16h-19h' },
    { key: '19h_23h', label: 'Soir', heure: '19h-23h' },
  ];

  const donneesParTranche = indicateurs.parTrancheHoraire || {};
  const moyenneSecteur = indicateurs.moyenneSecteurParTrancheHoraire || {};

  // Trouver la meilleure pénétration (seuil 10% tickets minimum)
  const totalTicketsBloc4 = tranches.reduce((sum, t) => sum + (donneesParTranche[t.key]?.ticketsTotal || 0), 0);
  const seuil10pctBloc4 = totalTicketsBloc4 * 0.10;
  let meilleureTrancheKey = null;
  let meilleurePenetration = 0;

  tranches.forEach(t => {
    const data = donneesParTranche[t.key];
    const pen = data?.penetration || 0;
    const tickets = data?.ticketsTotal || 0;
    // Une tranche doit avoir au moins 10% des tickets totaux pour être éligible
    if (tickets >= seuil10pctBloc4 && pen > meilleurePenetration) {
      meilleurePenetration = pen;
      meilleureTrancheKey = t.key;
    }
  });

  const hasDonnees = tranches.some(t => (donneesParTranche[t.key]?.ticketsTotal || 0) > 0);
  if (!hasDonnees) return null;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center gap-3 mb-2">
        <Target className="w-6 h-6 text-[#8B1538]" />
        <h3 className="font-bold text-gray-800">Taux de pénétration par tranche horaire</h3>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Pourcentage de clients passant en caisse qui achètent en BVP — comparé à la moyenne du groupe
      </p>

      <div className="space-y-4">
        {tranches.map(tranche => {
          const data = donneesParTranche[tranche.key] || {};
          const secteurData = moyenneSecteur[tranche.key] || {};
          const penetration = data.penetration || 0;
          const penetrationSecteur = secteurData.penetration || 0;
          const ticketsTotal = data.ticketsTotal || 0;
          const ticketsBVP = data.ticketsBVP || 0;
          const clientsPerdus = data.clientsPerdus || 0;

          if (ticketsTotal === 0) return null;

          const ecartSecteur = (penetration - penetrationSecteur) * 100;
          const estMeilleurQueSecteur = ecartSecteur >= 0;
          const estMeilleureTranche = tranche.key === meilleureTrancheKey;

          return (
            <div key={tranche.key}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800">{tranche.label}</span>
                  <span className="text-xs text-gray-400">({tranche.heure})</span>
                  {estMeilleureTranche && (
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">⭐ BEST</span>
                  )}
                </div>
                <span className="text-sm text-gray-500">
                  {ticketsBVP.toLocaleString('fr-FR')} / {ticketsTotal.toLocaleString('fr-FR')} clients
                </span>
              </div>

              <div className="relative">
                <div className="h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                  {/* Barre - VERT si meilleur que secteur, ROUGE/BORDEAUX sinon */}
                  <div
                    className={`h-full rounded-lg transition-all duration-500 ${estMeilleurQueSecteur ? 'bg-[#22C55E]' : 'bg-[#EF4444]'}`}
                    style={{ width: `${Math.min(penetration * 200, 100)}%` }}
                  />

                  {/* Ligne secteur - BLEUE */}
                  {penetrationSecteur > 0 && (
                    <div
                      className="absolute top-0 bottom-0 w-1 bg-[#3B82F6] z-10"
                      style={{ left: `${Math.min(penetrationSecteur * 200, 100)}%` }}
                      title={`Secteur : ${(penetrationSecteur * 100).toFixed(1)}%`}
                    />
                  )}

                  <div className="absolute inset-0 flex items-center px-3">
                    <span className="font-bold text-white drop-shadow">
                      {(penetration * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-1 text-xs">
                  <span className="text-gray-500">
                    {clientsPerdus.toLocaleString('fr-FR')} clients sans achat BVP
                  </span>
                  <span className={`font-semibold ${estMeilleurQueSecteur ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                    {estMeilleurQueSecteur ? '+' : ''}{ecartSecteur.toFixed(1)} pt vs secteur ({(penetrationSecteur * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Légende */}
      <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#22C55E] rounded" />
          <span className="text-xs text-gray-500">Au-dessus du secteur</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#EF4444] rounded" />
          <span className="text-xs text-gray-500">En-dessous du secteur</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-[#3B82F6]" />
          <span className="text-xs text-gray-500">Moyenne secteur</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// BLOC 5 : ANALYSE FLUX CLIENT DÉTAILLÉE
// Question : "Combien de clients je perds exactement ?"
// Affiche les 6 tranches dans l'ORDRE CHRONOLOGIQUE avec BARRES VISUELLES
// ============================================================================
const Bloc5FluxClient = ({ indicateurs, panierMoyen, meilleurePenetration }) => {
  const parTrancheHoraire = indicateurs.parTrancheHoraire;
  if (!parTrancheHoraire) return null;

  // Définition des tranches dans l'ORDRE CHRONOLOGIQUE de la journée
  const tranchesDefinition = [
    { key: '00_Autre', label: 'Autres horaires (00h-09h)', labelCourt: 'Autres horaires (00h-09h)', ordre: 0 },
    { key: '09h_12h', label: 'Matin (9h-12h)', labelCourt: 'Matin (9h-12h)', ordre: 1 },
    { key: '12h_14h', label: 'Midi (12h-14h)', labelCourt: 'Midi (12h-14h)', ordre: 2 },
    { key: '14h_16h', label: 'Début après-midi (14h-16h)', labelCourt: 'Début après-midi (14h-16h)', ordre: 3 },
    { key: '16h_19h', label: 'Fin après-midi (16h-19h)', labelCourt: 'Fin après-midi (16h-19h)', ordre: 4 },
    { key: '19h_23h', label: 'Soir (19h-23h)', labelCourt: 'Soir (19h-23h)', ordre: 5 },
  ];

  // Mapper les données et calculer les valeurs (ORDRE CHRONOLOGIQUE conservé)
  const tranches = tranchesDefinition
    .map(def => {
      const data = parTrancheHoraire[def.key] || {};
      return {
        ...def,
        ...data,
        ticketsTotal: data.ticketsTotal || 0,
        ticketsBVP: data.ticketsBVP || 0,
        clientsPerdus: data.clientsPerdus || 0,
        penetration: data.penetration || 0,
      };
    })
    .filter(t => t.ticketsTotal > 0);

  if (tranches.length === 0) return null;

  // Trouver la meilleure tranche (référence) = meilleur taux de pénétration
  // Seuil : une tranche doit avoir au moins 10% des tickets totaux pour être éligible
  const totalTicketsBloc5 = tranches.reduce((sum, t) => sum + t.ticketsTotal, 0);
  const seuil10pctBloc5 = totalTicketsBloc5 * 0.10;
  const meilleureTrancheKey = tranches
    .filter(t => t.ticketsTotal >= seuil10pctBloc5)
    .reduce((best, t) => t.penetration > (best?.penetration || 0) ? t : best, null
  )?.key;

  // Trouver la pire tranche (priorité) = plus de clients perdus (hors référence)
  const pireTrancheKey = tranches
    .filter(t => t.key !== meilleureTrancheKey)
    .reduce((worst, t) =>
      t.clientsPerdus > (worst?.clientsPerdus || 0) ? t : worst, null
    )?.key;

  // ÉCHELLE COMMUNE : trouver le max de clients pour normaliser toutes les barres
  const maxClientsTotal = Math.max(...tranches.map(t => t.ticketsTotal));

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center gap-3 mb-2">
        <Users className="w-6 h-6 text-[#8B1538]" />
        <h3 className="font-bold text-gray-800">Analyse Flux Client → Achat BVP</h3>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Combien de clients passent en caisse vs combien achètent en BVP par tranche horaire
      </p>

      {/* Objectif - bannière jaune */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
        <p className="text-yellow-800">
          Votre meilleur taux : <strong className="text-[#8B1538]">{(meilleurePenetration * 100).toFixed(1)}%</strong> — c'est votre objectif pour les autres créneaux
        </p>
      </div>

      {/* Les 6 tranches dans l'ORDRE CHRONOLOGIQUE */}
      <div className="space-y-4">
        {tranches.map((tranche) => {
          const estReference = tranche.key === meilleureTrancheKey;
          const estPriorite = tranche.key === pireTrancheKey;
          const potentiel = Math.round(tranche.ticketsTotal * meilleurePenetration) - tranche.ticketsBVP;
          const caPotentiel = potentiel * panierMoyen;

          // Calcul des pourcentages pour la barre
          const pctAcheteurs = tranche.ticketsTotal > 0 ? (tranche.ticketsBVP / tranche.ticketsTotal) * 100 : 0;
          const pctNonAcheteurs = 100 - pctAcheteurs;
          const pctObjectif = meilleurePenetration * 100;

          return (
            <div key={tranche.key} className={`rounded-xl p-4 ${estReference ? 'bg-green-50 border border-green-200' : estPriorite ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
              {/* En-tête : nom de la tranche + badges + taux */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800">{tranche.labelCourt}</span>
                  {estReference && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">⭐ RÉFÉRENCE</span>
                  )}
                  {estPriorite && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">🔴 PRIORITÉ</span>
                  )}
                </div>
                <span className={`text-xl font-bold ${estReference ? 'text-[#22C55E]' : 'text-[#8B1538]'}`}>
                  {(tranche.penetration * 100).toFixed(1)}%
                </span>
              </div>

              {/* Grille : Clients en caisse / Achètent / Sans achat BVP */}
              <div className="grid grid-cols-3 gap-4 text-center mb-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1 uppercase">Clients en caisse</div>
                  <div className="text-lg font-bold text-gray-800">{tranche.ticketsTotal.toLocaleString('fr-FR')}</div>
                  <div className="text-xs text-gray-400">/semaine</div>
                </div>
                <div>
                  <div className="text-xs text-[#8B1538] mb-1 uppercase">Achètent BVP</div>
                  <div className="text-lg font-bold text-[#8B1538]">{tranche.ticketsBVP.toLocaleString('fr-FR')}</div>
                  <div className="text-xs text-gray-400">/semaine</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1 uppercase">Sans achat BVP</div>
                  <div className="text-lg font-bold text-gray-500">{tranche.clientsPerdus.toLocaleString('fr-FR')}</div>
                  <div className="text-xs text-gray-400">/semaine</div>
                </div>
              </div>

              {/* BARRE VISUELLE V4 : Bordeaux + Vert (potentiel) + Gris - ÉCHELLE COMMUNE */}
              {(() => {
                // Calcul des 3 parties de la barre
                const clientsObjectif = Math.round(tranche.ticketsTotal * meilleurePenetration);
                const clientsAConquerir = Math.max(0, clientsObjectif - tranche.ticketsBVP);
                const clientsReste = tranche.clientsPerdus - clientsAConquerir;

                // Pourcentages pour la barre - ÉCHELLE COMMUNE basée sur maxClientsTotal
                const pctBordeaux = (tranche.ticketsBVP / maxClientsTotal) * 100;
                const pctVert = (clientsAConquerir / maxClientsTotal) * 100;
                const pctGris = (Math.max(0, estReference ? tranche.clientsPerdus : clientsReste) / maxClientsTotal) * 100;

                // Largeur totale de la barre (proportionnelle au nombre de clients)
                const largeurTotale = (tranche.ticketsTotal / maxClientsTotal) * 100;

                return (
                  <div className="mb-3">
                    {/* Barre avec 3 parties - ÉCHELLE COMMUNE */}
                    <div className="h-10 bg-gray-100 rounded-lg overflow-hidden relative">
                      <div className="h-full flex" style={{ width: `${largeurTotale}%` }}>
                        {/* Partie BORDEAUX = achètent actuellement */}
                        <div
                          className="h-full bg-[#8B1538] flex items-center justify-center transition-all duration-500"
                          style={{ width: `${(tranche.ticketsBVP / tranche.ticketsTotal) * 100}%` }}
                        >
                          {(tranche.ticketsBVP / tranche.ticketsTotal) * 100 > 15 && (
                            <span className="text-white text-xs font-bold">{tranche.ticketsBVP.toLocaleString('fr-FR')}</span>
                          )}
                        </div>

                        {/* Partie VERTE = clients à conquérir (potentiel = GAIN) */}
                        {!estReference && clientsAConquerir > 0 && (
                          <div
                            className="h-full bg-[#22C55E] flex items-center justify-center transition-all duration-500"
                            style={{ width: `${(clientsAConquerir / tranche.ticketsTotal) * 100}%` }}
                          >
                            {(clientsAConquerir / tranche.ticketsTotal) * 100 > 8 && (
                              <span className="text-white text-xs font-bold">+{clientsAConquerir.toLocaleString('fr-FR')}</span>
                            )}
                          </div>
                        )}

                        {/* Partie GRISE = reste (n'achèteront pas) */}
                        <div
                          className="h-full bg-[#E5E7EB] flex items-center justify-center transition-all duration-500 flex-1"
                        >
                          {((estReference ? tranche.clientsPerdus : Math.max(0, clientsReste)) / tranche.ticketsTotal) * 100 > 15 && (
                            <span className="text-gray-500 text-xs font-medium">
                              {(estReference ? tranche.clientsPerdus : Math.max(0, clientsReste)).toLocaleString('fr-FR')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Légende sous la barre */}
                    <div className="flex items-center justify-between mt-2 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-[#8B1538] rounded" />
                        <span className="text-gray-600">Achètent</span>
                      </div>
                      {!estReference && clientsAConquerir > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-[#22C55E] rounded" />
                          <span className="text-[#22C55E] font-semibold">À conquérir (+{clientsAConquerir})</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-[#E5E7EB] rounded" />
                        <span className="text-gray-500">Sans achat BVP</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Potentiel CA (sauf pour la référence) */}
              {!estReference && potentiel > 0 && (
                <div className="bg-[#DCFCE7] border border-[#22C55E] rounded-lg p-3 flex items-center justify-between">
                  <span className="text-sm text-[#166534]">Si {(meilleurePenetration * 100).toFixed(1)}% comme la référence :</span>
                  <div className="flex items-center gap-4">
                    <span className="text-[#22C55E] font-bold">+{potentiel} tickets</span>
                    <span className="text-[#22C55E] font-bold text-lg">+{caPotentiel.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} € CA</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Légende des barres */}
      <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#8B1538] rounded" />
          <span className="text-xs text-gray-500">Achètent BVP</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#22C55E] rounded" />
          <span className="text-xs text-gray-500">À conquérir (objectif {(meilleurePenetration * 100).toFixed(1)}%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#E5E7EB] rounded" />
          <span className="text-xs text-gray-500">Sans achat BVP</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// BLOC 6 : POTENTIEL CHIFFRÉ GLOBAL (EFFET WOW)
// Question : "Combien je pourrais gagner ?"
// ============================================================================
const Bloc6Potentiel = ({ indicateurs, panierMoyen, caBVPActuel }) => {
  const parTrancheHoraire = indicateurs.parTrancheHoraire;
  if (!parTrancheHoraire) return null;

  // Trouver la meilleure pénétration (seuil 10% tickets minimum)
  const totalTicketsBloc6 = Object.values(parTrancheHoraire).reduce((sum, d) => sum + (d.ticketsTotal || 0), 0);
  const seuil10pctBloc6 = totalTicketsBloc6 * 0.10;
  let meilleurePenetration = 0;
  Object.values(parTrancheHoraire).forEach(data => {
    if ((data.ticketsTotal || 0) >= seuil10pctBloc6 && data.penetration > meilleurePenetration) {
      meilleurePenetration = data.penetration;
    }
  });

  // Calculer le potentiel total
  let ticketsPotentiels = 0;
  let ticketsActuels = 0;

  Object.values(parTrancheHoraire).forEach(data => {
    if (data.ticketsTotal > 0) {
      ticketsActuels += data.ticketsBVP;
      ticketsPotentiels += Math.round(data.ticketsTotal * meilleurePenetration);
    }
  });

  const gainTickets = ticketsPotentiels - ticketsActuels;
  const gainCA = gainTickets * panierMoyen;
  const gainPourcent = caBVPActuel > 0 ? (gainCA / caBVPActuel) * 100 : 0;
  const projectionAnnuelle = gainCA * 52;

  if (gainTickets <= 0) return null;

  return (
    <div className="bg-gradient-to-br from-[#8B1538] to-[#5B0D24] rounded-2xl shadow-xl p-6 text-white">
      <div className="text-center mb-6">
        <p className="text-white/70 text-sm mb-2">
          Potentiel si toutes les tranches atteignent {(meilleurePenetration * 100).toFixed(1)}% :
        </p>

        <div className="flex items-center justify-center gap-6 flex-wrap">
          <div className="bg-white/10 rounded-xl px-6 py-4">
            <div className="text-3xl font-black text-[#22C55E]">+{gainTickets}</div>
            <div className="text-xs text-white/70">tickets / semaine</div>
          </div>
          <div className="text-2xl text-white/50">=</div>
          <div className="bg-white/10 rounded-xl px-6 py-4">
            <div className="text-3xl font-black text-[#22C55E]">+{gainCA.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</div>
            <div className="text-xs text-white/70">CA / semaine</div>
          </div>
          <div className="text-2xl text-white/50">=</div>
          <div className="bg-white/10 rounded-xl px-6 py-4">
            <div className="text-3xl font-black text-[#22C55E]">+{gainPourcent.toFixed(1)}%</div>
            <div className="text-xs text-white/70">de CA BVP</div>
          </div>
        </div>
      </div>

      {/* Projection annuelle - EFFET WOW */}
      <div className="bg-white/20 rounded-xl p-6 text-center">
        <div className="text-sm text-white/70 mb-2 uppercase tracking-wide">🎯 Projection annuelle</div>
        <div className="text-5xl font-black text-yellow-300 mb-1">
          +{projectionAnnuelle.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €/an
        </div>
        <div className="text-xs text-white/60">basé sur cette semaine × 52</div>
      </div>
    </div>
  );
};

// ============================================================================
// BLOC 7 : DIAGNOSTIC & PLAN D'ACTION
// Question : "Que dois-je faire concrètement ?"
// ============================================================================
const Bloc7Action = ({ indicateurs, panierMoyen }) => {
  const parTrancheHoraire = indicateurs.parTrancheHoraire;
  if (!parTrancheHoraire) return null;

  // Récupérer toutes les tranches avec données
  const tranches = Object.entries(parTrancheHoraire)
    .filter(([_, data]) => data.ticketsTotal > 0)
    .map(([key, data]) => ({ key, ...data }));

  if (tranches.length === 0) return null;

  // Trouver la tranche RÉFÉRENCE (meilleure pénétration)
  const trancheReference = tranches.reduce((best, t) =>
    t.penetration > (best?.penetration || 0) ? t : best, null
  );

  // Trier les autres tranches par clients perdus (hors référence)
  const autresTranchesTriees = tranches
    .filter(t => t.key !== trancheReference?.key)
    .sort((a, b) => b.clientsPerdus - a.clientsPerdus);

  // Tranche prioritaire = celle avec le plus de clients perdus (hors référence)
  const tranchePrioritaire = autresTranchesTriees[0];
  // Autres tranches à surveiller (exclure référence ET prioritaire)
  const autresTranches = autresTranchesTriees.slice(1, 4);

  const tauxConversion = 0.10;
  const clientsRecuperables = Math.round(tranchePrioritaire.clientsPerdus * tauxConversion);
  const caRecuperableAnnuel = clientsRecuperables * panierMoyen * 52;

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="bg-[#22C55E]/10 px-6 py-4 border-b border-[#22C55E]/20">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-[#22C55E]" />
          <h3 className="font-bold text-gray-800">Passez à l'action</h3>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Note explicative : tranche de référence */}
        {trancheReference && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-blue-800">
              <Trophy className="w-5 h-5 text-blue-600" />
              <span className="font-semibold">
                Votre référence : <strong>{trancheReference.label}</strong> ({(trancheReference.penetration * 100).toFixed(1)}% de pénétration)
              </span>
            </div>
            <p className="text-sm text-blue-600 mt-1">
              C'est votre meilleur créneau. L'objectif est d'atteindre ce taux sur les autres tranches horaires.
            </p>
          </div>
        )}

        {/* Priorité */}
        {tranchePrioritaire && (
          <>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5 text-[#8B1538]" />
                <span className="font-bold text-[#8B1538]">PRIORITÉ : {tranchePrioritaire.label}</span>
              </div>

              <p className="text-gray-600 mb-4">
                <strong className="text-[#EF4444]">{tranchePrioritaire.clientsPerdus.toLocaleString('fr-FR')} clients</strong> passent sans acheter BVP chaque semaine
              </p>

              <div className="bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-xl p-4">
                <div className="text-sm text-gray-600 mb-2">Objectif réaliste : convertir 10%</div>
                <div className="flex items-center gap-6">
                  <div className="text-[#22C55E] font-bold text-lg">+{clientsRecuperables} clients/semaine</div>
                  <div className="text-2xl text-gray-300">=</div>
                  <div className="text-[#22C55E] font-bold text-xl">+{caRecuperableAnnuel.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €/an</div>
                </div>
              </div>
            </div>

            {/* Explication + Recommandation */}
            <div className="bg-gray-50 rounded-xl p-4 border-l-4 border-[#8B1538]">
              <div className="flex items-start gap-4">
                <Clock className="w-6 h-6 text-[#8B1538] flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">Pourquoi ces clients n'achètent pas {tranchePrioritaire.label.toLowerCase()} ?</h4>
                  <p className="text-gray-600 mb-3">{tranchePrioritaire.cause}</p>

                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Lightbulb className="w-4 h-4 text-[#8B1538]" />
                      <span className="font-semibold text-[#8B1538]">Recommandation</span>
                    </div>
                    <p className="font-bold text-gray-800">{tranchePrioritaire.action}</p>
                    {tranchePrioritaire.horaireCuisson && (
                      <p className="text-sm text-gray-500 mt-1">
                        Planifiez une cuisson pour avoir des produits frais à {tranchePrioritaire.horaireCuisson}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Autres tranches à surveiller (hors référence et priorité) */}
            {autresTranches.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <span className="font-semibold text-amber-800">Autres tranches horaires à surveiller</span>
                </div>
                <div className="space-y-1">
                  {autresTranches.map(t => (
                    <div key={t.key} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{t.label}</span>
                      <span className="text-[#EF4444] font-bold">{t.clientsPerdus.toLocaleString('fr-FR')} clients sans achat BVP</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// COMPOSANT : Alerte pas de données
// ============================================================================
const AlertePasDeDonnees = ({ magasin, onPrecedent }) => (
  <div className="text-center py-12">
    <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
      <AlertTriangle className="w-10 h-10 text-amber-500" />
    </div>
    <h2 className="text-2xl font-bold text-gray-800 mb-3">Pas de données BVP pour ce magasin</h2>
    <p className="text-gray-600 mb-2 max-w-md mx-auto">
      Le magasin <strong>{magasin?.nom}</strong> ({String(magasin?.code || '').padStart(5, '0')}) n'a pas de ventes BVP enregistrées pour cette semaine.
    </p>
    <button
      onClick={onPrecedent}
      className="mt-6 px-6 py-3 bg-[#8B1538] text-white rounded-xl font-semibold hover:bg-[#5B0D24] transition-colors"
    >
      Choisir un autre magasin ou semaine
    </button>
  </div>
);

// ============================================================================
// COMPOSANT PRINCIPAL : Etape1Diagnostic
// ============================================================================
const Etape1Diagnostic = ({ onPrecedent }) => {
  const { donneesMagasin, semaineSelectionnee } = useMagasin();

  const hasDonneesBVP = useMemo(() => {
    if (!donneesMagasin?.indicateurs?.global?.pdv) return false;
    const pdv = donneesMagasin.indicateurs.global.pdv;
    return pdv.caBVP > 0 || pdv.ticketsBVP > 0;
  }, [donneesMagasin]);

  // Calculer la meilleure pénétration
  const meilleurePenetration = useMemo(() => {
    if (!donneesMagasin?.indicateurs?.parTrancheHoraire) return 0;
    const parTranche = donneesMagasin.indicateurs.parTrancheHoraire;
    // Total tickets pour calculer le seuil de 10%
    const totalTickets = Object.values(parTranche).reduce((sum, d) => sum + (d.ticketsTotal || 0), 0);
    const seuil10pct = totalTickets * 0.10;
    let max = 0;
    Object.values(parTranche).forEach(data => {
      // Une tranche doit avoir au moins 10% des tickets totaux pour être éligible comme référence
      if ((data.ticketsTotal || 0) >= seuil10pct && data.penetration > max) {
        max = data.penetration;
      }
    });
    return max;
  }, [donneesMagasin]);

  if (!donneesMagasin) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Données non disponibles</h2>
        <p className="text-gray-600 mb-6">Veuillez d'abord importer les données à l'étape précédente.</p>
        <button onClick={onPrecedent} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors">
          Retour à l'import
        </button>
      </div>
    );
  }

  if (!hasDonneesBVP) {
    return <AlertePasDeDonnees magasin={donneesMagasin.magasin} onPrecedent={onPrecedent} />;
  }

  const { magasin, comparaison, indicateurs } = donneesMagasin;
  const pdv = indicateurs.global.pdv;
  const pdvS1 = indicateurs.global.pdvS1 || {};
  const pdvAn1 = indicateurs.global.pdvAn1 || {};
  const moyenneSecteur = indicateurs.global.moyenneSecteur;

  return (
    <div className="space-y-8">
      {/* BLOC 1 : Identification + KPIs */}
      <Bloc1Identification
        magasin={magasin}
        pdv={pdv}
        semaineSelectionnee={semaineSelectionnee}
        comparaison={comparaison}
      />

      {/* BLOC 2 : Tableau benchmark */}
      <Bloc2Benchmark
        donnees={donneesMagasin}
        indicateurs={indicateurs}
        magasin={magasin}
      />

      {/* BLOC 3 : 3 graphiques en barres */}
      <Bloc3Graphiques
        pdv={pdv}
        pdvS1={pdvS1}
        pdvAn1={pdvAn1}
        moyenneSecteur={moyenneSecteur}
      />

      {/* BLOC 4 : Barres de pénétration */}
      <Bloc4Penetration indicateurs={indicateurs} />

      {/* BLOC 5 : Détail flux clients */}
      <Bloc5FluxClient
        indicateurs={indicateurs}
        panierMoyen={pdv.ticketMoyen || 0}
        meilleurePenetration={meilleurePenetration}
      />

      {/* BLOC 6 : Potentiel chiffré */}
      <Bloc6Potentiel
        indicateurs={indicateurs}
        panierMoyen={pdv.ticketMoyen || 0}
        caBVPActuel={pdv.caBVP || 0}
      />

      {/* BLOC 7 : Plan d'action */}
      <Bloc7Action
        indicateurs={indicateurs}
        panierMoyen={pdv.ticketMoyen || 0}
      />

    </div>
  );
};

export default Etape1Diagnostic;
