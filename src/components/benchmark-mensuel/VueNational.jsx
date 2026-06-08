/**
 * Vue Niveau 1 — National.
 *
 * Phase 1 ajustée (session Rudy 20/04/2026) :
 *  - Grille 13 KPIs en 5 blocs (France entière, filtrée par Vocation/Modèle Phase 3)
 *  - Liste des 8 régions avec mini-grille compacte, cliquables → Niveau 2
 *    Libellés lus de la colonne REGION de l'Excel (ex. "4 - OUEST").
 *  - Deux Tops côte à côte :
 *      · Top Progression CA BVP (évolution M vs M-12)
 *      · Top Quantité BVP (volume absolu)
 *    Plus de Flop — décision Rudy 20/04/2026.
 *
 * Phase 2 ajoutera : bande « Statut DEC » (compteurs agrégés).
 * Phase 3 ajoutera : blocs « Répartition par vocation » et « Répartition par modèle ».
 */

import React from 'react';
import { ChevronRight, Globe2, TrendingUp, Package, Loader2 } from 'lucide-react';
import Grille13KPIs from './Grille13KPIs';

const fmtEuro = (v) => (v == null || isNaN(v)) ? '—' : `${Math.round(v).toLocaleString('fr-FR')} €`;
const fmtQte = (v) => (v == null || isNaN(v)) ? '—' : Math.round(v).toLocaleString('fr-FR');
const fmtEvol = (v) => (v == null || isNaN(v)) ? '—' : `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)} %`;

export default function VueNational({ donnees, chargement, onSelectionnerRegion }) {
  if (chargement) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <span className="ml-3 text-gray-600">Chargement des données nationales…</span>
      </div>
    );
  }

  if (!donnees) return null;

  const { kpis, regions, topRegionsProgCA, topRegionsQuantite, metadata } = donnees;

  return (
    <div className="space-y-6">
      {/* En-tête National */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-md">
        <div className="flex items-center gap-3 mb-2">
          <Globe2 className="w-7 h-7" />
          <h2 className="text-2xl font-bold">Vue National</h2>
        </div>
        <p className="text-indigo-100 text-sm">
          {metadata.nbPdv.toLocaleString('fr-FR')} PDV · {regions.length} régions · Mois {metadata.fichier.replace('Vente_Mensuelle_BVP_', '').replace('.xlsx', '')}
        </p>
      </div>

      {/* Grille 13 KPIs */}
      <div className="bg-white rounded-2xl shadow-md p-5 border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4">Indicateurs clés — France entière</h3>
        <Grille13KPIs kpis={kpis} />
      </div>

      {/* Liste des 8 régions */}
      <div className="bg-white rounded-2xl shadow-md p-5 border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4">Répartition par région</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {regions.map(region => (
            <button
              key={region.code}
              onClick={() => onSelectionnerRegion(region)}
              className="text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-400 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-bold text-gray-800">{region.libelle}</p>
                  <p className="text-xs text-gray-500">{region.nbSecteurs} secteurs · {region.nbPdv} PDV</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
              </div>
              <Grille13KPIs kpis={region.kpis} compact />
            </button>
          ))}
        </div>
      </div>

      {/* Deux Tops côte à côte */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Progression CA BVP */}
        <div className="bg-white rounded-2xl shadow-md p-5 border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            Top {topRegionsProgCA.length} régions — Progression CA BVP
          </h3>
          <p className="text-xs text-gray-500 mb-2">Évolution M vs M-12</p>
          {topRegionsProgCA.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Données M-12 indisponibles pour cette période.</p>
          ) : (
            <ol className="space-y-1.5 text-sm">
              {topRegionsProgCA.map((r, i) => (
                <li key={r.code} className="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-50">
                  <span className="flex items-center gap-2">
                    <span className="text-gray-400 font-mono w-5">{i + 1}</span>
                    <span className="font-medium text-gray-800">{r.libelle}</span>
                  </span>
                  <span className={`font-semibold ${(r.kpis.evolCA_BVP ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {fmtEvol(r.kpis.evolCA_BVP)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Top Quantité BVP */}
        <div className="bg-white rounded-2xl shadow-md p-5 border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            Top {topRegionsQuantite.length} régions — Quantité BVP
          </h3>
          <p className="text-xs text-gray-500 mb-2">Volume absolu du mois</p>
          <ol className="space-y-1.5 text-sm">
            {topRegionsQuantite.map((r, i) => (
              <li key={r.code} className="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-50">
                <span className="flex items-center gap-2">
                  <span className="text-gray-400 font-mono w-5">{i + 1}</span>
                  <span className="font-medium text-gray-800">{r.libelle}</span>
                </span>
                <div className="text-right">
                  <div className="font-semibold text-gray-800">{fmtQte(r.kpis.qteBVP)}</div>
                  <div className="text-xs text-gray-500">{fmtEuro(r.kpis.caBVP)}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Métadonnées */}
      <div className="text-center text-xs text-gray-400">
        {metadata.fichier} · Extraction en {metadata.tempsExtraction} ms
      </div>
    </div>
  );
}
