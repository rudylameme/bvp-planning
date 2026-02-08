/**
 * Étape 4 : Pilotage CA
 *
 * Dashboard CA toujours visible avec calcul temps réel :
 * - Bloc Historique (CA + Casse)
 * - Bloc Prévision (CA + Progression)
 *
 * Onglets :
 * - Gamme : Sélection des produits avec toggle par famille
 * - Promo : Animations commerciales (à venir)
 * - Commande : Paramètres de commande (à venir)
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Check,
  X,
  Package,
  Tag,
  ShoppingCart,
  ArrowUp,
  ArrowDown,
  Settings,
  Sliders,
  BarChart2,
} from 'lucide-react';
import { useMagasin } from '../../contexts/MagasinContext';
import { formatEuro } from '../../utils/formatUtils';
import StepAnimationCommerciale from '../responsable/StepAnimationCommerciale';
import OngletCommande from './OngletCommande';

// ============================================================================
// CONSTANTES
// ============================================================================

const FAMILLES = ['BOULANGERIE', 'VIENNOISERIE', 'PATISSERIE', 'SNACKING', 'AUTRE'];

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const JOURS_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const LIMITES_PROGRESSION_DEFAUT = {
  BOULANGERIE: {
    lundi: 'F', mardi: 'F', mercredi: 'F', jeudi: 'F',
    vendredi: 'f', samedi: 'f', dimanche: 'f'
  },
  VIENNOISERIE: {
    lundi: 'F', mardi: 'F', mercredi: 'F', jeudi: 'F',
    vendredi: 'F', samedi: 'f', dimanche: 'f'
  },
  PATISSERIE: {
    lundi: 'f', mardi: 'f', mercredi: 'f', jeudi: 'f',
    vendredi: 'f', samedi: 'f', dimanche: 'f'
  },
  SNACKING: {
    lundi: 'F', mardi: 'F', mercredi: 'F', jeudi: 'F',
    vendredi: 'F', samedi: 'f', dimanche: 'f'
  },
  AUTRE: {
    lundi: 'F', mardi: 'F', mercredi: 'F', jeudi: 'F',
    vendredi: 'F', samedi: 'f', dimanche: 'f'
  }
};

/**
 * Applique la limite de progression à une quantité calculée
 * S = Sans plafond, F = Forte (+20%), f = Prudent (+10%), P:xx = Personnalisée (+xx%)
 */
const appliquerLimite = (potentielCalcule, historique, limite) => {
  const plancher = historique;

  if (limite === 'S') {
    return Math.max(plancher, potentielCalcule);
  }

  if (limite === 'F') {
    const plafond = Math.ceil(historique * 1.20);
    return Math.max(plancher, Math.min(potentielCalcule, plafond));
  }

  if (limite === 'f') {
    const plafond = Math.ceil(historique * 1.10);
    return Math.max(plancher, Math.min(potentielCalcule, plafond));
  }

  // Mode Personnalisé : "P:15" → +15% max
  if (typeof limite === 'string' && limite.startsWith('P:')) {
    const pourcent = parseFloat(limite.substring(2));
    if (!isNaN(pourcent) && pourcent > 0) {
      const plafond = Math.ceil(historique * (1 + pourcent / 100));
      return Math.max(plancher, Math.min(potentielCalcule, plafond));
    }
  }

  return Math.max(plancher, potentielCalcule);
};

// Ordre d'affichage des rayons
const ORDRE_RAYONS = {
  BOULANGERIE: 1,
  VIENNOISERIE: 2,
  SNACKING: 3,
  PATISSERIE: 4,
  AUTRE: 5,
};

// Couleurs par rayon (charte Mousquetaires)
const COULEURS_RAYON = {
  BOULANGERIE: { bg: 'bg-stone-100', border: 'border-stone-300', text: 'text-stone-800', header: 'bg-stone-200' },
  VIENNOISERIE: { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-800', header: 'bg-amber-200' },
  PATISSERIE: { bg: 'bg-rose-100', border: 'border-rose-300', text: 'text-rose-800', header: 'bg-rose-200' },
  SNACKING: { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-800', header: 'bg-emerald-200' },
  AUTRE: { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-800', header: 'bg-slate-200' },
};

// Données de démo - Utilisé uniquement si aucun fichier ventes/casse n'est importé
// Colonnes : Moy. Hebdo = moyenne ventes hebdo, Potentiel = MAX ventes / poids jour
// prixMoyenUnitaire = CA Semaine / Moyenne Hebdo (prix moyen par unité)
const PRODUITS_DEMO = [
  { id: 1, plu: '1001', itm8: '10000001', codeEAN: '3000001', libelle: 'Baguette Tradition', rayon: 'BOULANGERIE', moyHebdo: 420, moyenneHebdo: 420, potentiel: 480, caSemaine: 315, prixMoyenUnitaire: 0.75, tauxCasse: 13, cassePAHTSemaine: 41, casseQteSemaine: 55, tendance: 'croissance', tendancePourcent: 8, fiabilite: 85, actif: true },
  { id: 2, plu: '1002', itm8: '10000002', codeEAN: '3000002', libelle: 'Pain de Campagne 500g', rayon: 'BOULANGERIE', moyHebdo: 180, moyenneHebdo: 180, potentiel: 210, caSemaine: 414, prixMoyenUnitaire: 2.30, tauxCasse: 8, cassePAHTSemaine: 33, casseQteSemaine: 14, tendance: 'stable', tendancePourcent: 2, fiabilite: 90, actif: true },
  { id: 3, plu: '1003', itm8: '10000003', codeEAN: '3000003', libelle: 'Pain Complet 400g', rayon: 'BOULANGERIE', moyHebdo: 95, moyenneHebdo: 95, potentiel: 110, caSemaine: 209, prixMoyenUnitaire: 2.20, tauxCasse: 4, cassePAHTSemaine: 8, casseQteSemaine: 4, tendance: 'declin', tendancePourcent: -5, fiabilite: 88, actif: true },
  { id: 4, plu: '2001', itm8: '20000001', codeEAN: '3000004', libelle: 'Croissant Pur Beurre', rayon: 'VIENNOISERIE', moyHebdo: 350, moyenneHebdo: 350, potentiel: 400, caSemaine: 385, prixMoyenUnitaire: 1.10, tauxCasse: 3, cassePAHTSemaine: 12, casseQteSemaine: 11, tendance: 'croissance', tendancePourcent: 12, fiabilite: 75, actif: true },
  { id: 5, plu: '2002', itm8: '20000002', codeEAN: '3000005', libelle: 'Pain au Chocolat', rayon: 'VIENNOISERIE', moyHebdo: 280, moyenneHebdo: 280, potentiel: 320, caSemaine: 336, prixMoyenUnitaire: 1.20, tauxCasse: 6, cassePAHTSemaine: 20, casseQteSemaine: 17, tendance: 'stable', tendancePourcent: 1, fiabilite: 82, actif: true },
  { id: 6, plu: '2003', itm8: '20000003', codeEAN: '3000006', libelle: 'Brioche Tressée', rayon: 'VIENNOISERIE', moyHebdo: 60, moyenneHebdo: 60, potentiel: 75, caSemaine: 270, prixMoyenUnitaire: 4.50, tauxCasse: 22, cassePAHTSemaine: 59, casseQteSemaine: 13, tendance: 'declin', tendancePourcent: -10, fiabilite: 55, actif: false },
  { id: 7, plu: '3001', itm8: '30000001', codeEAN: '3000007', libelle: 'Tarte aux Pommes', rayon: 'PATISSERIE', moyHebdo: 45, moyenneHebdo: 45, potentiel: 55, caSemaine: 585, prixMoyenUnitaire: 13.00, tauxCasse: 12, cassePAHTSemaine: 70, casseQteSemaine: 5, tendance: 'croissance', tendancePourcent: 5, fiabilite: 70, actif: true },
  { id: 8, plu: '3002', itm8: '30000002', codeEAN: '3000008', libelle: 'Paris-Brest', rayon: 'PATISSERIE', moyHebdo: 30, moyenneHebdo: 30, potentiel: 38, caSemaine: 390, prixMoyenUnitaire: 13.00, tauxCasse: 18, cassePAHTSemaine: 70, casseQteSemaine: 5, tendance: 'stable', tendancePourcent: 0, fiabilite: 60, actif: true },
  { id: 9, plu: '4001', itm8: '40000001', codeEAN: '3000009', libelle: 'Sandwich Jambon Beurre', rayon: 'SNACKING', moyHebdo: 120, moyenneHebdo: 120, potentiel: 140, caSemaine: 480, prixMoyenUnitaire: 4.00, tauxCasse: 2, cassePAHTSemaine: 10, casseQteSemaine: 3, tendance: 'croissance', tendancePourcent: 15, fiabilite: 65, actif: true },
  { id: 10, plu: '4002', itm8: '40000002', codeEAN: '3000010', libelle: 'Quiche Lorraine Part', rayon: 'SNACKING', moyHebdo: 85, moyenneHebdo: 85, potentiel: 100, caSemaine: 297.50, prixMoyenUnitaire: 3.50, tauxCasse: 7, cassePAHTSemaine: 21, casseQteSemaine: 6, tendance: 'declin', tendancePourcent: -3, fiabilite: 78, actif: true },
];

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

// ============================================================================
// COMPOSANTS
// ============================================================================

/**
 * Dashboard CA - Toujours visible en haut
 * 2 blocs : Historique (CA + Casse) | Prévision (CA + Progression)
 */
// Couleur du taux de casse produit : < 5% vert, 5-20% orange, > 20% rouge
const getCouleurTauxCasse = (taux) => {
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
              {stats.caObjectif ? `${objectifVsHisto > 0 ? '+' : ''}${objectifVsHisto.toFixed(0)}%` : '—'}
            </p>
            <p className={`text-xs mt-1 ${!stats.caObjectif ? 'text-gray-400' : objectifAtteint ? 'text-green-600 font-semibold' : 'text-gray-400'}`}>
              {!stats.caObjectif ? 'Non défini' : objectifAtteint ? 'Objectif atteint' : 'vs CA actuel'}
            </p>
          </div>
        );
      })()}

      {/* Bloc Prévision */}
      {(() => {
        const progressionVsHisto = stats.caHisto > 0 ? ((stats.caPrevi - stats.caHisto) / stats.caHisto) * 100 : 0;
        return (
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Prévision</p>
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

/**
 * Barre de sélection avec stats produits
 */
const BarreSelection = ({ stats }) => {
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-2xl font-bold text-gray-800">{stats.nbActifs}</span>
            <span className="text-gray-500 ml-1">produits actifs sur {stats.nbTotal}</span>
          </div>
          <div className="h-8 w-px bg-gray-300"></div>
          <div>
            <span className="text-gray-500">Poids CA : </span>
            <span className="text-lg font-semibold text-[#8B1538]">{stats.pourcentageSelection.toFixed(0)}%</span>
            <span className="text-gray-400 text-sm ml-1">du potentiel BVP</span>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="w-48">
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#ED1C24] to-[#8B1538] rounded-full transition-all duration-300"
              style={{ width: `${Math.min(stats.pourcentageSelection, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Onglets de navigation
 */
const Onglets = ({ actif, onChange }) => {
  const tabs = [
    { id: 'gamme', label: 'Gamme', icon: Package, color: 'bg-rose-100 border-rose-300 text-rose-800' },
    { id: 'limites', label: 'Limites', icon: Sliders, color: 'bg-violet-100 border-violet-300 text-violet-800' },
    { id: 'promo', label: 'Promo', icon: Tag, color: 'bg-blue-100 border-blue-300 text-blue-800' },
    { id: 'commande', label: 'Commande', icon: ShoppingCart, color: 'bg-emerald-100 border-emerald-300 text-emerald-800' },
    { id: 'suivi', label: 'Suivi', icon: BarChart2, color: 'bg-amber-100 border-amber-300 text-amber-800' },
  ];

  return (
    <div className="flex gap-2 mb-4">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = actif === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all border-2 ${
              isActive
                ? tab.color
                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            <Icon className="w-5 h-5" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

/**
 * Badge rayon avec couleur
 */
const BadgeRayon = ({ rayon, onClick }) => {
  const couleurs = COULEURS_RAYON[rayon] || COULEURS_RAYON.AUTRE;
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title="Cliquer pour changer la famille"
        className={`px-2 py-1 rounded text-xs font-semibold ${couleurs.bg} ${couleurs.text} ${couleurs.border} border cursor-pointer hover:opacity-80 transition-opacity`}
      >
        {rayon}
      </button>
    );
  }
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${couleurs.bg} ${couleurs.text} ${couleurs.border} border`}>
      {rayon}
    </span>
  );
};

/**
 * Popup détail casse - Graphique barres CSS
 */
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

/**
 * Popup détail ventes - Graphique barres CSS (historique Moy. Hebdo)
 */
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
          {tendancePct > 0 ? '↗' : tendancePct < 0 ? '↘' : '→'} {Math.abs(tendancePct).toFixed(0)}%
        </span>
      </div>
    </div>
  );
};

/**
 * Tableau des produits (flat, avec rayon en colonne)
 * Colonnes : Actif | Produit | Rayon | Casse % | Moy. Hebdo | Potentiel | CA Hebdo | Tendance | Fiabilité
 */
const TableauProduits = ({ produits, onToggle, onChangeRayon, recherche, filtreRayon, planifieManager, onChangePlanifie, promoItm8Set, promoPrecedenteMap }) => {
  const [tri, setTri] = useState({ colonne: 'caSemaine', ordre: 'desc' });
  const [popupCasseId, setPopupCasseId] = useState(null);
  const [popupVentesId, setPopupVentesId] = useState(null);
  const [editingPlanifieId, setEditingPlanifieId] = useState(null);
  const [editingPlanifieValue, setEditingPlanifieValue] = useState('');

  // Filtrer les produits
  const produitsFiltres = useMemo(() => {
    return produits
      .filter((p) => !recherche || p.libelle.toLowerCase().includes(recherche.toLowerCase()))
      .filter((p) => !filtreRayon || filtreRayon === 'tous' || p.rayon === filtreRayon);
  }, [produits, recherche, filtreRayon]);

  const handleTri = (colonne) => {
    setTri((prev) => ({
      colonne,
      ordre: prev.colonne === colonne && prev.ordre === 'desc' ? 'asc' : 'desc',
    }));
  };

  // Trier les produits
  const produitsTries = useMemo(() => {
    return [...produitsFiltres].sort((a, b) => {
      let valA, valB;
      switch (tri.colonne) {
        case 'libelle':
          valA = a.libelle.toLowerCase();
          valB = b.libelle.toLowerCase();
          return tri.ordre === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'rayon':
          valA = ORDRE_RAYONS[a.rayon] || 99;
          valB = ORDRE_RAYONS[b.rayon] || 99;
          break;
        case 'moyHebdo':
          valA = a.moyHebdo || a.ventesQteSemaine || 0;
          valB = b.moyHebdo || b.ventesQteSemaine || 0;
          break;
        case 'planifie':
          valA = planifieManager?.[a.id] ?? a.potentiel ?? 0;
          valB = planifieManager?.[b.id] ?? b.potentiel ?? 0;
          break;
        case 'tauxCasse':
          valA = a.tauxCasse || 0;
          valB = b.tauxCasse || 0;
          break;
        case 'caSemaine':
          valA = a.caSemaine || 0;
          valB = b.caSemaine || 0;
          break;
        case 'tendancePourcent':
          valA = a.tendancePourcent || 0;
          valB = b.tendancePourcent || 0;
          break;
        case 'fiabilite':
          valA = a.fiabilite || 0;
          valB = b.fiabilite || 0;
          break;
        default:
          return 0;
      }
      if (typeof valA === 'number') {
        return tri.ordre === 'asc' ? valA - valB : valB - valA;
      }
      return 0;
    });
  }, [produitsFiltres, tri]);

  // En-tête triable
  const SortableHeader = ({ colonne, label, align = 'left' }) => {
    const isActive = tri.colonne === colonne;
    const alignClass = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : '';
    return (
      <th
        className={`px-3 py-2 text-xs font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 select-none`}
        onClick={() => handleTri(colonne)}
      >
        <div className={`flex items-center gap-1 ${alignClass}`}>
          <span>{label}</span>
          <span className={`transition-opacity ${isActive ? 'opacity-100 text-[#8B1538]' : 'opacity-30'}`}>
            {isActive && tri.ordre === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
          </span>
        </div>
      </th>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 w-12">Actif</th>
            <SortableHeader colonne="libelle" label="Produit" />
            <SortableHeader colonne="rayon" label="Rayon" align="center" />
            <SortableHeader colonne="tauxCasse" label="Casse" align="center" />
            <SortableHeader colonne="moyHebdo" label="Moy. Hebdo" align="right" />
            <SortableHeader colonne="planifie" label="Planifié" align="right" />
            <SortableHeader colonne="caSemaine" label="CA Hebdo" align="right" />
            <SortableHeader colonne="tendancePourcent" label="Tendance" align="center" />
            <SortableHeader colonne="fiabilite" label="Fiabilité" align="center" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {produitsTries.map((produit) => (
            <tr
              key={produit.id}
              className={`hover:bg-gray-50 transition-colors ${!produit.actif ? 'opacity-50 bg-gray-50' : ''}`}
            >
              <td className="px-3 py-2">
                <button
                  onClick={() => onToggle(produit.id)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                    produit.actif ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {produit.actif ? <Check size={14} /> : <X size={14} />}
                </button>
              </td>
              <td className="px-3 py-2">
                <span className="font-medium text-gray-800">
                  {produit.libelle}
                  {promoItm8Set?.has(produit.itm8) && (
                    <span className="ml-1.5 text-blue-500" title="Produit en promo">🏷️</span>
                  )}
                </span>
              </td>
              <td className="px-3 py-2 text-center">
                <BadgeRayon rayon={produit.rayon} onClick={() => onChangeRayon && onChangeRayon(produit.id)} />
              </td>
              <td className="px-3 py-2 text-center relative">
                <button
                  type="button"
                  onClick={() => setPopupCasseId(popupCasseId === produit.id ? null : produit.id)}
                  title="Voir l'évolution de la casse"
                  className={`px-2 py-1 rounded text-sm font-semibold cursor-pointer hover:ring-2 hover:ring-offset-1 transition-all ${getCouleurTauxCasse(produit.tauxCasse || 0).text} ${getCouleurTauxCasse(produit.tauxCasse || 0).bg} ${getCouleurTauxCasse(produit.tauxCasse || 0).text.replace('text-', 'hover:ring-')}`}
                >
                  {(produit.tauxCasse || 0).toFixed(0)}%
                </button>
                {popupCasseId === produit.id && (
                  <PopupCasse produit={produit} onClose={() => setPopupCasseId(null)} />
                )}
              </td>
              <td className="px-3 py-2 text-right font-mono relative">
                <button
                  type="button"
                  onClick={() => setPopupVentesId(popupVentesId === produit.id ? null : produit.id)}
                  title="Voir l'historique des ventes"
                  className="px-2 py-1 rounded text-sm font-semibold cursor-pointer hover:ring-2 hover:ring-blue-300 hover:ring-offset-1 transition-all text-blue-700 bg-blue-50 hover:bg-blue-100"
                >
                  {produit.moyHebdo || produit.ventesQteSemaine || 0}
                </button>
                {popupVentesId === produit.id && (
                  <PopupVentes produit={produit} onClose={() => setPopupVentesId(null)} />
                )}
              </td>
              <td className="px-3 py-2 text-right">
                {editingPlanifieId === produit.id ? (
                  <input
                    type="number"
                    min="0"
                    value={editingPlanifieValue}
                    onChange={(e) => setEditingPlanifieValue(e.target.value)}
                    onBlur={() => {
                      const val = parseInt(editingPlanifieValue, 10);
                      onChangePlanifie(produit.id, isNaN(val) || val <= 0 ? null : val);
                      setEditingPlanifieId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = parseInt(editingPlanifieValue, 10);
                        onChangePlanifie(produit.id, isNaN(val) || val <= 0 ? null : val);
                        setEditingPlanifieId(null);
                      }
                      if (e.key === 'Escape') setEditingPlanifieId(null);
                    }}
                    autoFocus
                    className="w-20 px-2 py-1 text-right font-mono text-sm border border-[#8B1538] rounded-lg focus:ring-2 focus:ring-[#8B1538] outline-none bg-red-50"
                  />
                ) : planifieManager?.[produit.id] != null ? (
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPlanifieId(produit.id);
                        setEditingPlanifieValue(String(planifieManager[produit.id]));
                      }}
                      className="font-mono text-sm font-bold text-[#8B1538] bg-red-50 border border-[#8B1538]/30 px-2 py-1 rounded-lg hover:bg-red-100 transition-colors"
                      title="Cliquer pour modifier"
                    >
                      {planifieManager[produit.id]}
                      <span className="ml-1 text-[10px]">✏️</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangePlanifie(produit.id, null)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-0.5"
                      title="Revenir au potentiel algo"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPlanifieId(produit.id);
                      setEditingPlanifieValue(String(produit.potentiel || ''));
                    }}
                    className="font-mono text-sm font-semibold text-gray-800 px-2 py-1 rounded-lg hover:bg-gray-100 border border-transparent hover:border-gray-300 transition-colors"
                    title="Cliquer pour modifier la préconisation"
                  >
                    {produit.potentiel || '-'}
                  </button>
                )}
                {/* Indicateur "Était en promo S-1" */}
                {(() => {
                  const promPrec = promoPrecedenteMap?.get(produit.itm8) || promoPrecedenteMap?.get(produit.plu);
                  if (!promPrec) return null;
                  const moyNormale = produit.moyHebdo || produit.ventesQteSemaine || 0;
                  return (
                    <div className="text-[10px] text-amber-600 mt-0.5" title={`Était en promo S-1 (qté: ${promPrec.qteValidee}), moy. normale: ${moyNormale}`}>
                      ⚠️ promo S-1, moy: {moyNormale}
                    </div>
                  );
                })()}
              </td>
              <td className="px-3 py-2 text-right font-mono text-gray-700">
                {(() => {
                  const moyQte = produit.moyHebdo || 0;
                  const prixMoyen = moyQte > 0 ? (produit.caSemaine || 0) / moyQte : 0;
                  const qte = planifieManager?.[produit.id] ?? produit.potentiel ?? moyQte;
                  return formatEuro(qte * prixMoyen);
                })()}
              </td>
              <td className="px-3 py-2 text-center">
                <div className="inline-flex items-center gap-1">
                  {produit.tendance === 'croissance' && <TrendingUp className="text-green-500" size={14} />}
                  {produit.tendance === 'declin' && <TrendingDown className="text-red-500" size={14} />}
                  {produit.tendance === 'stable' && <Minus className="text-gray-400" size={14} />}
                  <span
                    className={`text-xs font-medium ${
                      (produit.tendancePourcent || 0) > 0
                        ? 'text-green-600'
                        : (produit.tendancePourcent || 0) < 0
                        ? 'text-red-600'
                        : 'text-gray-500'
                    }`}
                  >
                    {(produit.tendancePourcent || 0) > 0 ? '+' : ''}
                    {produit.tendancePourcent || 0}%
                  </span>
                </div>
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center justify-center gap-1">
                  <div className="w-12 bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        (produit.fiabilite || 0) >= 70 ? 'bg-green-500' : (produit.fiabilite || 0) >= 40 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${produit.fiabilite || 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-8">{produit.fiabilite || 0}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {produitsTries.length === 0 && (
        <div className="text-center py-12 text-gray-500">Aucun produit trouvé</div>
      )}
    </div>
  );
};

/**
 * Onglet Gamme - Sélection des produits
 */
const OngletGamme = ({ produits, onToggle, onToggleFiltres, onChangeRayon, planifieManager, onChangePlanifie, promoItm8Set, promoPrecedenteMap }) => {
  const [recherche, setRecherche] = useState('');
  const [filtreRayon, setFiltreRayon] = useState('tous');

  // Rayons disponibles dans les produits
  const rayonsDisponibles = useMemo(() => {
    const rayons = [...new Set(produits.map((p) => p.rayon))];
    return rayons.sort((a, b) => (ORDRE_RAYONS[a] || 99) - (ORDRE_RAYONS[b] || 99));
  }, [produits]);

  // Produits filtrés (visibles) — pour les boutons Tout activer/désactiver
  const produitsFiltres = useMemo(() => {
    return produits
      .filter((p) => !recherche || p.libelle.toLowerCase().includes(recherche.toLowerCase()))
      .filter((p) => !filtreRayon || filtreRayon === 'tous' || p.rayon === filtreRayon);
  }, [produits, recherche, filtreRayon]);

  const nbFiltres = produitsFiltres.length;

  return (
    <div className="space-y-4">
      {/* Barre d'outils */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Rechercher un produit..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B1538] focus:border-[#8B1538] outline-none"
          />
        </div>

        {/* Filtre par rayon */}
        <select
          value={filtreRayon}
          onChange={(e) => setFiltreRayon(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B1538] focus:border-[#8B1538] outline-none bg-white"
        >
          <option value="tous">Tous les rayons</option>
          {rayonsDisponibles.map((rayon) => (
            <option key={rayon} value={rayon}>{rayon}</option>
          ))}
        </select>

        <button
          onClick={() => onToggleFiltres(produitsFiltres.map(p => p.id), true)}
          className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm font-medium border border-green-200"
        >
          Tout activer ({nbFiltres})
        </button>
        <button
          onClick={() => onToggleFiltres(produitsFiltres.map(p => p.id), false)}
          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium border border-red-200"
        >
          Tout désactiver
        </button>
      </div>

      {/* Tableau flat avec rayon en colonne */}
      <TableauProduits
        produits={produits}
        onToggle={onToggle}
        onChangeRayon={onChangeRayon}
        recherche={recherche}
        filtreRayon={filtreRayon}
        planifieManager={planifieManager}
        onChangePlanifie={onChangePlanifie}
        promoItm8Set={promoItm8Set}
        promoPrecedenteMap={promoPrecedenteMap}
      />
    </div>
  );
};

/**
 * Onglet Limites - Matrice Famille × Jour
 * Cycle : S → F → f → P → S
 */
const OngletLimites = ({ limites, onLimitesChange }) => {
  const [inputPersoKey, setInputPersoKey] = useState(null); // "FAMILLE|jour" en cours d'édition
  const [inputPersoValue, setInputPersoValue] = useState('15');

  // Récupérer la valeur d'affichage d'une limite
  const getDisplayLimite = (limite) => {
    if (typeof limite === 'string' && limite.startsWith('P:')) return 'P';
    return limite || 'F';
  };

  const getPersoValue = (limite) => {
    if (typeof limite === 'string' && limite.startsWith('P:')) {
      return limite.substring(2);
    }
    return '15';
  };

  const getBgColor = (limite) => {
    const display = getDisplayLimite(limite);
    if (display === 'S') return 'bg-green-500 hover:bg-green-600';
    if (display === 'F') return 'bg-purple-500 hover:bg-purple-600';
    if (display === 'f') return 'bg-red-500 hover:bg-red-600';
    if (display === 'P') return 'bg-blue-500 hover:bg-blue-600';
    return 'bg-purple-500 hover:bg-purple-600';
  };

  const cycleLimit = (famille, jour) => {
    const newLimites = { ...limites };
    if (!newLimites[famille]) newLimites[famille] = {};
    newLimites[famille] = { ...newLimites[famille] };
    const current = getDisplayLimite(newLimites[famille][jour]);
    if (current === 'S') {
      newLimites[famille][jour] = 'F';
    } else if (current === 'F') {
      newLimites[famille][jour] = 'f';
    } else if (current === 'f') {
      // Passer en mode P : afficher l'input
      const key = `${famille}|${jour}`;
      setInputPersoKey(key);
      setInputPersoValue('15');
      newLimites[famille][jour] = 'P:15';
    } else {
      // P → S
      newLimites[famille][jour] = 'S';
      setInputPersoKey(null);
    }
    onLimitesChange(newLimites);
  };

  const handlePersoConfirm = (famille, jour) => {
    const val = parseFloat(inputPersoValue);
    if (!isNaN(val) && val > 0) {
      const newLimites = { ...limites };
      if (!newLimites[famille]) newLimites[famille] = {};
      newLimites[famille] = { ...newLimites[famille] };
      newLimites[famille][jour] = `P:${val}`;
      onLimitesChange(newLimites);
    }
    setInputPersoKey(null);
  };

  const setAllTo = (value) => {
    const newLimites = {};
    FAMILLES.forEach(f => {
      newLimites[f] = {};
      JOURS.forEach(j => { newLimites[f][j] = value; });
    });
    onLimitesChange(newLimites);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <Sliders className="w-5 h-5 text-violet-600" />
        <h3 className="font-semibold text-gray-700">Limite de progression par famille × jour</h3>
      </div>
      <p className="text-xs text-gray-500">Cliquez sur une cellule pour changer la limite (S → F → f → P → S)</p>

      {/* Actions rapides */}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setAllTo('S')}
          className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors">
          Tout S
        </button>
        <button type="button" onClick={() => setAllTo('F')}
          className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors">
          Tout F
        </button>
        <button type="button" onClick={() => setAllTo('f')}
          className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors">
          Tout f
        </button>
        <button type="button" onClick={() => {
          const newLimites = {};
          FAMILLES.forEach(f => {
            newLimites[f] = {};
            JOURS.forEach(j => {
              newLimites[f][j] = ['samedi', 'dimanche'].includes(j) ? 'f' : 'S';
            });
          });
          onLimitesChange(newLimites);
        }}
          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors">
          Semaine S / Week-end f
        </button>
      </div>

      {/* Matrice */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2 font-medium text-gray-600 bg-gray-50">Famille</th>
              {JOURS_LABELS.map((jour, i) => (
                <th key={i} className="p-2 font-medium text-gray-600 text-center bg-gray-50 min-w-[52px]">{jour}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FAMILLES.map(famille => (
              <tr key={famille} className="border-t border-gray-100">
                <td className="p-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${COULEURS_RAYON[famille]?.bg || 'bg-gray-100'} ${COULEURS_RAYON[famille]?.text || 'text-gray-800'}`}>
                    {famille}
                  </span>
                </td>
                {JOURS.map((jour, i) => {
                  const limite = limites[famille]?.[jour] || 'F';
                  const display = getDisplayLimite(limite);
                  const key = `${famille}|${jour}`;
                  const isEditingPerso = inputPersoKey === key;

                  return (
                    <td key={i} className="p-1 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => cycleLimit(famille, jour)}
                          className={`w-10 h-8 rounded text-white font-bold text-sm ${getBgColor(limite)} transition-colors cursor-pointer`}
                        >
                          {display}
                        </button>
                        {display === 'P' && !isEditingPerso && (
                          <button
                            onClick={() => {
                              setInputPersoKey(key);
                              setInputPersoValue(getPersoValue(limite));
                            }}
                            className="text-[10px] text-blue-600 hover:underline"
                          >
                            +{getPersoValue(limite)}%
                          </button>
                        )}
                        {isEditingPerso && (
                          <div className="flex items-center gap-0.5">
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={inputPersoValue}
                              onChange={(e) => setInputPersoValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handlePersoConfirm(famille, jour);
                              }}
                              onBlur={() => handlePersoConfirm(famille, jour)}
                              autoFocus
                              className="w-10 text-[10px] text-center border border-blue-300 rounded px-0.5 py-0.5"
                            />
                            <span className="text-[10px] text-gray-500">%</span>
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Légende */}
      <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-600">
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 bg-green-500 rounded"></span> S = Mathématique (sans plafond)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 bg-purple-500 rounded"></span> F = Forte progression (+20% max)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 bg-red-500 rounded"></span> f = Prudent (+10% max)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 bg-blue-500 rounded"></span> P = Personnalisée (+X% max)
        </span>
      </div>
    </div>
  );
};

// OngletPromo supprimé — remplacé par StepAnimationCommerciale intégré directement

/**
 * Onglet Suivi - Comparaison Planifié vs Réalisé
 */
const getStatusSuivi = (pct, seuilBas = 90, seuilHaut = 110) => {
  if (pct >= seuilBas && pct <= seuilHaut) return { icon: '✅', color: 'text-green-600', bg: 'bg-green-50' };
  if (pct < seuilBas) return { icon: '⚠️', color: 'text-amber-600', bg: 'bg-amber-50' };
  return { icon: '🔴', color: 'text-red-600', bg: 'bg-red-50' };
};

const OngletSuivi = ({ produits, planifieManager, promosPrecedentes }) => {
  const [tri, setTri] = useState({ colonne: 'pctAppli', ordre: 'desc' });
  const [rechercheSuivi, setRechercheSuivi] = useState('');
  const [filtreFamilleSuivi, setFiltreFamilleSuivi] = useState('tous');
  const [seuilBas, setSeuilBas] = useState(90);
  const [seuilHaut, setSeuilHaut] = useState(110);

  // Construire la map planifié S-1 (archive) par itm8/plu
  const planifieS1Map = useMemo(() => {
    const map = new Map();
    (promosPrecedentes || []).forEach(p => {
      if (p.itm8) map.set(p.itm8, p.qteValidee || 0);
      if (p.plu) map.set(p.plu, p.qteValidee || 0);
    });
    return map;
  }, [promosPrecedentes]);

  // Données de suivi par produit
  const suiviProduits = useMemo(() => {
    return produits.filter(p => p.actif).map(p => {
      // Planifié = planifieManager (quantité définie par le manager) ou potentiel
      const planifie = planifieManager?.[p.id] ?? p.potentiel ?? p.moyHebdo ?? 0;
      const ventes = p.moyHebdo || p.ventesQteSemaine || 0;

      // Calcul de la casse en quantité - plusieurs sources possibles:
      // 1. casseQteSemaine directement disponible
      // 2. Moyenne depuis historiqueParSemaine (contient casseQte par semaine)
      // 3. Fallback: estimer depuis cassePAHTSemaine / prixMoyen (approximation)
      let casse = 0;
      if (p.casseQteSemaine && p.casseQteSemaine > 0) {
        casse = p.casseQteSemaine;
      } else if (p.historiqueParSemaine && p.historiqueParSemaine.length > 0) {
        // Moyenne de la casse en quantité sur l'historique des semaines
        const totalCasseQte = p.historiqueParSemaine.reduce((sum, s) => sum + (s.casseQte || 0), 0);
        casse = totalCasseQte / p.historiqueParSemaine.length;
      } else if (p.cassePAHTSemaine && p.prixMoyenUnitaire && p.prixMoyenUnitaire > 0) {
        // Approximation: PA HT casse ÷ prix moyen (pas parfait mais mieux que 0)
        casse = p.cassePAHTSemaine / p.prixMoyenUnitaire;
      }

      const total = ventes + casse;
      const pctAppli = planifie > 0 ? (total / planifie) * 100 : 0;
      return {
        id: p.id,
        libelle: p.libelle,
        famille: p.rayon || p.famille || 'AUTRE',
        planifie,
        ventes,
        casse,
        total,
        pctAppli,
      };
    }).filter(p => p.planifie > 0);
  }, [produits, planifieManager]);

  // Synthèse globale
  const synthese = useMemo(() => {
    const totalPlanifie = suiviProduits.reduce((s, p) => s + p.planifie, 0);
    const totalVentes = suiviProduits.reduce((s, p) => s + p.ventes, 0);
    const totalCasse = suiviProduits.reduce((s, p) => s + p.casse, 0);
    const totalRealise = totalVentes + totalCasse;
    const pctGlobal = totalPlanifie > 0 ? (totalRealise / totalPlanifie) * 100 : 0;
    return { totalPlanifie, totalVentes, totalCasse, totalRealise, pctGlobal };
  }, [suiviProduits]);

  // Synthèse par famille
  const syntheseFamilles = useMemo(() => {
    const map = {};
    suiviProduits.forEach(p => {
      if (!map[p.famille]) map[p.famille] = { planifie: 0, realise: 0 };
      map[p.famille].planifie += p.planifie;
      map[p.famille].realise += p.total;
    });
    return Object.entries(map).map(([famille, d]) => ({
      famille,
      planifie: d.planifie,
      realise: d.realise,
      pct: d.planifie > 0 ? (d.realise / d.planifie) * 100 : 0,
    })).sort((a, b) => b.planifie - a.planifie);
  }, [suiviProduits]);

  // Rayons disponibles pour le filtre
  const rayonsSuivi = useMemo(() => {
    return [...new Set(suiviProduits.map(p => p.famille))].sort();
  }, [suiviProduits]);

  // Filtrage recherche + famille
  const produitsFiltresSuivi = useMemo(() => {
    return suiviProduits
      .filter(p => !rechercheSuivi || p.libelle.toLowerCase().includes(rechercheSuivi.toLowerCase()))
      .filter(p => filtreFamilleSuivi === 'tous' || p.famille === filtreFamilleSuivi);
  }, [suiviProduits, rechercheSuivi, filtreFamilleSuivi]);

  // Tri du tableau détaillé
  const handleTri = (colonne) => {
    setTri(prev => ({
      colonne,
      ordre: prev.colonne === colonne && prev.ordre === 'asc' ? 'desc' : 'asc',
    }));
  };

  const produitsTries = useMemo(() => {
    const sorted = [...produitsFiltresSuivi];
    sorted.sort((a, b) => {
      let va = a[tri.colonne];
      let vb = b[tri.colonne];
      if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
      if (va < vb) return tri.ordre === 'asc' ? -1 : 1;
      if (va > vb) return tri.ordre === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [produitsFiltresSuivi, tri]);

  const TriIcon = ({ colonne }) => {
    if (tri.colonne !== colonne) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-[#8B1538] ml-1">{tri.ordre === 'asc' ? '↑' : '↓'}</span>;
  };

  if (suiviProduits.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <BarChart2 className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Suivi Planning</h3>
        <p className="text-gray-500">Aucune donnée planifiée disponible. Définissez des quantités dans l'onglet Gamme.</p>
      </div>
    );
  }

  const statusGlobal = getStatusSuivi(synthese.pctGlobal, seuilBas, seuilHaut);

  return (
    <div className="space-y-4">
      {/* Synthèse globale */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Planifié total</p>
          <p className="text-xl font-bold text-gray-800">{Math.round(synthese.totalPlanifie).toLocaleString('fr-FR')}</p>
          <p className="text-[10px] text-gray-400">unités</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Ventes total</p>
          <p className="text-xl font-bold text-blue-700">{Math.round(synthese.totalVentes).toLocaleString('fr-FR')}</p>
          <p className="text-[10px] text-gray-400">unités</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Casse total</p>
          <p className="text-xl font-bold text-red-600">{Math.round(synthese.totalCasse).toLocaleString('fr-FR')}</p>
          <p className="text-[10px] text-gray-400">unités</p>
        </div>
        <div className={`rounded-xl border border-gray-200 p-4 text-center ${statusGlobal.bg}`}>
          <p className="text-xs text-gray-500 mb-1">% Application</p>
          <p className={`text-xl font-bold ${statusGlobal.color}`}>
            {Math.round(synthese.pctGlobal)}% {statusGlobal.icon}
          </p>
          <p className="text-[10px] text-gray-400">(ventes+casse)/planifié</p>
        </div>
      </div>

      {/* Seuils d'alerte personnalisables */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-6 flex-wrap">
        <span className="text-sm font-semibold text-gray-700">Seuils d'alerte :</span>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          ⚠️ Seuil bas
          <input
            type="number"
            value={seuilBas}
            onChange={(e) => setSeuilBas(Number(e.target.value) || 0)}
            className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm font-mono"
          />
          %
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          🔴 Seuil haut
          <input
            type="number"
            value={seuilHaut}
            onChange={(e) => setSeuilHaut(Number(e.target.value) || 0)}
            className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm font-mono"
          />
          %
        </label>
        <span className="text-xs text-gray-400">✅ entre {seuilBas}% et {seuilHaut}%</span>
      </div>

      {/* Synthèse par famille */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="font-semibold text-gray-700 text-sm">Synthèse par famille</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-xs">
              <th className="px-4 py-2 text-left font-medium">Famille</th>
              <th className="px-4 py-2 text-right font-medium">Planifié</th>
              <th className="px-4 py-2 text-right font-medium">Réalisé</th>
              <th className="px-4 py-2 text-right font-medium">% Application</th>
            </tr>
          </thead>
          <tbody>
            {syntheseFamilles.map(f => {
              const st = getStatusSuivi(f.pct, seuilBas, seuilHaut);
              return (
                <tr key={f.famille} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-800">{f.famille}</td>
                  <td className="px-4 py-2 text-right font-mono text-gray-700">{Math.round(f.planifie).toLocaleString('fr-FR')}</td>
                  <td className="px-4 py-2 text-right font-mono text-gray-700">{Math.round(f.realise).toLocaleString('fr-FR')}</td>
                  <td className={`px-4 py-2 text-right font-semibold ${st.color}`}>
                    {Math.round(f.pct)}% {st.icon}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Tableau détaillé par produit */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-3 flex-wrap">
          <h3 className="font-semibold text-gray-700 text-sm flex-shrink-0">Détail par produit</h3>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={rechercheSuivi}
              onChange={(e) => setRechercheSuivi(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#8B1538] focus:border-[#8B1538] outline-none"
            />
          </div>
          <select
            value={filtreFamilleSuivi}
            onChange={(e) => setFiltreFamilleSuivi(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#8B1538] focus:border-[#8B1538] outline-none bg-white"
          >
            <option value="tous">Toutes les familles</option>
            {rayonsSuivi.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <span className="text-xs text-gray-400">{produitsFiltresSuivi.length} produit{produitsFiltresSuivi.length > 1 ? 's' : ''}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs">
                <th className="px-3 py-2 text-left font-medium cursor-pointer hover:text-gray-900 select-none" onClick={() => handleTri('libelle')}>
                  Produit<TriIcon colonne="libelle" />
                </th>
                <th className="px-3 py-2 text-left font-medium cursor-pointer hover:text-gray-900 select-none" onClick={() => handleTri('famille')}>
                  Famille<TriIcon colonne="famille" />
                </th>
                <th className="px-3 py-2 text-right font-medium cursor-pointer hover:text-gray-900 select-none" onClick={() => handleTri('planifie')}>
                  Planifié<TriIcon colonne="planifie" />
                </th>
                <th className="px-3 py-2 text-right font-medium cursor-pointer hover:text-gray-900 select-none" onClick={() => handleTri('ventes')}>
                  Ventes<TriIcon colonne="ventes" />
                </th>
                <th className="px-3 py-2 text-right font-medium cursor-pointer hover:text-gray-900 select-none" onClick={() => handleTri('casse')}>
                  Casse<TriIcon colonne="casse" />
                </th>
                <th className="px-3 py-2 text-right font-medium cursor-pointer hover:text-gray-900 select-none" onClick={() => handleTri('total')}>
                  Total<TriIcon colonne="total" />
                </th>
                <th className="px-3 py-2 text-right font-medium cursor-pointer hover:text-gray-900 select-none" onClick={() => handleTri('pctAppli')}>
                  % Appli<TriIcon colonne="pctAppli" />
                </th>
              </tr>
            </thead>
            <tbody>
              {produitsTries.map(p => {
                const st = getStatusSuivi(p.pctAppli, seuilBas, seuilHaut);
                return (
                  <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-800 max-w-[200px] truncate">{p.libelle}</td>
                    <td className="px-3 py-2 text-gray-600 text-xs">{p.famille}</td>
                    <td className="px-3 py-2 text-right font-mono text-gray-700">{Math.round(p.planifie)}</td>
                    <td className="px-3 py-2 text-right font-mono text-blue-700">{Math.round(p.ventes)}</td>
                    <td className="px-3 py-2 text-right font-mono text-red-600">{Math.round(p.casse)}</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-gray-800">{Math.round(p.total)}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${st.color}`}>
                      {Math.round(p.pctAppli)}% {st.icon}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

const Etape4PilotageCA = () => {
  const { semaineSelectionnee, produitsGamme, setProduitsGamme, objectifCA, objectifPourcent, planifieManager, setPlanifieManager, promosActives, setPromosActives, promosPrecedentes } = useMagasin();

  // État local
  const [ongletActif, setOngletActif] = useState('gamme');
  const [limitesProgression, setLimitesProgression] = useState(LIMITES_PROGRESSION_DEFAUT);
  const [produitsExceptionnels, setProduitsExceptionnels] = useState([]);
  const [periodePromo, setPeriodePromo] = useState(null);
  const [produits, setProduits] = useState(() => {
    if (produitsGamme && produitsGamme.length > 0) {
      return produitsGamme;
    }
    return PRODUITS_DEMO;
  });

  // Sync bidirectionnelle contexte ↔ local avec flag anti-boucle
  const syncDirection = useRef(null); // 'fromContext' | 'fromLocal'

  // Contexte → local (quand produitsGamme change depuis l'extérieur, ex: import ventes, archive)
  useEffect(() => {
    if (syncDirection.current === 'fromLocal') {
      syncDirection.current = null;
      return;
    }
    if (produitsGamme && produitsGamme.length > 0) {
      syncDirection.current = 'fromContext';
      setProduits(produitsGamme);
    }
  }, [produitsGamme]);

  // Local → contexte (quand produits change localement, ex: toggle actif, changement rayon)
  useEffect(() => {
    if (syncDirection.current === 'fromContext') {
      syncDirection.current = null;
      return;
    }
    if (produits && produits.length > 0) {
      syncDirection.current = 'fromLocal';
      setProduitsGamme(produits);
    }
  }, [produits, setProduitsGamme]);

  // Mapping itm8 → id produit (pour bridge promo ↔ gamme)
  const itm8ToIdMap = useMemo(() => {
    const map = {};
    produits.forEach(p => {
      if (p.itm8) map[p.itm8] = p.id;
    });
    return map;
  }, [produits]);

  // Set des itm8 en promo (pour icône dans Gamme)
  const promoItm8Set = useMemo(() => {
    return new Set(promosActives.map(p => p.itm8).filter(Boolean));
  }, [promosActives]);

  // Map des promos S-1 précédentes (itm8 → { qteValidee, libelle })
  const promoPrecedenteMap = useMemo(() => {
    const map = new Map();
    (promosPrecedentes || []).forEach(p => {
      if (p.itm8) map.set(p.itm8, p);
      if (p.plu) map.set(p.plu, p);
    });
    return map;
  }, [promosPrecedentes]);

  // Sync Promo → Planifié : quand promosActives change, mettre à jour planifieManager
  useEffect(() => {
    if (promosActives.length === 0) return;
    setPlanifieManager(prev => {
      const next = { ...prev };
      let changed = false;
      promosActives.forEach(promo => {
        const id = itm8ToIdMap[promo.itm8];
        if (id != null && promo.qteValidee != null && promo.qteValidee > 0) {
          if (next[id] !== promo.qteValidee) {
            next[id] = promo.qteValidee;
            changed = true;
          }
        }
      });
      return changed ? next : prev;
    });
  }, [promosActives, itm8ToIdMap]);

  // Calcul des stats en temps réel
  const stats = useMemo(() => {
    const produitsActifs = produits.filter((p) => p.actif);

    // CA Historique = CA des produits actifs
    const caHisto = produitsActifs.reduce((sum, p) => sum + (p.caSemaine || 0), 0);

    // Casse en PA HT (prix d'achat)
    const casseMontant = produitsActifs.reduce((sum, p) => sum + (p.cassePAHTSemaine || 0), 0);

    // Taux de casse global = PA HT Casse / PV TTC Ventes * 100
    const tauxCasse = caHisto > 0 ? (casseMontant / caHisto) * 100 : 0;

    // CA Prévision = pour chaque produit actif : quantité planifiée × prix moyen unitaire
    // Si le Manager a saisi une valeur planifiée, on l'utilise directement
    // Sinon on utilise le potentiel limité par la matrice (par famille × jour)
    const caPrevi = produitsActifs.reduce((sum, p) => {
      const moyQte = p.moyHebdo || 0;
      const caHebdo = p.caSemaine || 0;
      const prixMoyen = moyQte > 0 ? caHebdo / moyQte : 0;

      // Vérifier si le Manager a saisi une valeur planifiée
      const planifie = planifieManager[p.id];
      if (planifie != null && planifie > 0) {
        return sum + (planifie * prixMoyen);
      }

      // Sinon : potentiel limité par la matrice
      const potentielBrut = p.potentiel || moyQte;
      const famille = p.rayon || 'AUTRE';
      const limitesJours = limitesProgression[famille] || {};
      let totalLimite = 0;
      JOURS.forEach(jour => {
        const limite = limitesJours[jour] || 'F';
        const potJour = potentielBrut / 7;
        const histJour = moyQte / 7;
        totalLimite += appliquerLimite(potJour, histJour, limite);
      });
      const potentielLimite = Math.round(totalLimite);

      return sum + (potentielLimite * prixMoyen);
    }, 0);

    // Progression = (CA Prévisionnel - CA Objectif) / CA Objectif × 100
    const caObjectif = objectifCA || caHisto;
    const progression = caObjectif > 0 ? ((caPrevi - caObjectif) / caObjectif) * 100 : 0;

    // CA total du rayon (tous produits)
    const caTotalRayon = produits.reduce((sum, p) => sum + (p.caSemaine || 0), 0);
    const pourcentageSelection = caTotalRayon > 0 ? (caHisto / caTotalRayon) * 100 : 0;

    // Nombre de semaines de la période (prendre le max des produits)
    const nbSemaines = produitsActifs.reduce((max, p) => Math.max(max, p.nombreSemaines || 1), 1);

    return {
      nbActifs: produitsActifs.length,
      nbTotal: produits.length,
      caHisto,
      nbSemaines,
      caPrevi,
      caObjectif,
      progression,
      pourcentageSelection,
      tauxCasse,
      casseMontant,
    };
  }, [produits, objectifCA, limitesProgression, planifieManager]);

  // Handlers
  const handleToggleProduit = useCallback((id) => {
    setProduits((prev) => prev.map((p) => (p.id === id ? { ...p, actif: !p.actif } : p)));
  }, []);

  // Toggle uniquement les produits filtrés (comme V4)
  const handleToggleFiltres = useCallback((ids, actif) => {
    const idsSet = new Set(ids);
    setProduits((prev) => prev.map((p) => idsSet.has(p.id) ? { ...p, actif } : p));
  }, []);

  // Modifier la valeur planifiée d'un produit (+ sync vers Promo si applicable)
  const handleChangePlanifie = useCallback((id, valeur) => {
    setPlanifieManager(prev => {
      const next = { ...prev };
      if (valeur === null || valeur === '' || valeur === undefined) {
        delete next[id];
      } else {
        next[id] = valeur;
      }
      return next;
    });

    // Sync Gamme → Promo : si ce produit est en promo, mettre à jour qteValidee
    const produit = produits.find(p => p.id === id);
    if (produit?.itm8 && promoItm8Set.has(produit.itm8)) {
      setPromosActives(prev => prev.map(promo =>
        promo.itm8 === produit.itm8
          ? { ...promo, qteValidee: valeur != null ? valeur : promo.qteObjectif }
          : promo
      ));
    }
  }, [produits, promoItm8Set, setPromosActives]);

  // Changer la famille d'un produit (cycle BOULANGERIE → VIENNOISERIE → PATISSERIE → SNACKING → AUTRE → BOULANGERIE)
  const handleChangeRayon = useCallback((id) => {
    setProduits((prev) => prev.map((p) => {
      if (p.id !== id) return p;
      const idx = FAMILLES.indexOf(p.rayon);
      const nextRayon = FAMILLES[(idx + 1) % FAMILLES.length];
      return { ...p, rayon: nextRayon };
    }));
  }, []);

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-[#8B1538]" />
            Pilotage CA
          </h2>
          <p className="text-gray-600 mt-1">
            Gérez le chiffre d'affaires et la gamme produits
            {semaineSelectionnee && (
              <span className="text-[#8B1538] font-medium"> S{semaineSelectionnee.semaine}/{semaineSelectionnee.annee}</span>
            )}
          </p>
        </div>
      </div>

      {/* Dashboard toujours visible */}
      <DashboardCA stats={stats} objectifPourcent={objectifPourcent} />

      {/* Barre de sélection */}
      <BarreSelection stats={stats} />

      {/* Onglets */}
      <Onglets actif={ongletActif} onChange={setOngletActif} />

      {/* Contenu selon l'onglet */}
      <div className="min-h-[400px]">
        {ongletActif === 'gamme' && (
          <OngletGamme
            produits={produits}
            onToggle={handleToggleProduit}
            onToggleFiltres={handleToggleFiltres}
            onChangeRayon={handleChangeRayon}
            planifieManager={planifieManager}
            onChangePlanifie={handleChangePlanifie}
            promoItm8Set={promoItm8Set}
            promoPrecedenteMap={promoPrecedenteMap}
          />
        )}
        {ongletActif === 'limites' && (
          <OngletLimites
            limites={limitesProgression}
            onLimitesChange={setLimitesProgression}
          />
        )}
        {ongletActif === 'promo' && (
          <StepAnimationCommerciale
            produits={produits}
            promosActives={promosActives}
            setPromosActives={setPromosActives}
            produitsExceptionnels={produitsExceptionnels}
            setProduitsExceptionnels={setProduitsExceptionnels}
            periodePromo={periodePromo}
            setPeriodePromo={setPeriodePromo}
            caTotalRayon={stats.caHisto}
          />
        )}
        {ongletActif === 'commande' && <OngletCommande />}
        {ongletActif === 'suivi' && (
          <OngletSuivi
            produits={produits}
            planifieManager={planifieManager}
            promosPrecedentes={promosPrecedentes}
          />
        )}
      </div>

    </div>
  );
};

export default Etape4PilotageCA;
