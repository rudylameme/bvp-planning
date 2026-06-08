/**
 * Vue Niveau 2 — Région.
 *
 * Phase 1 :
 *  - Grille 9 KPIs de la région
 *  - Liste des secteurs avec mini-grille, cliquables → Niveau 3 Secteur
 *  - Compteur « X / N magasins sous la performance région (KPI 8) »
 *
 * Phase 2 : bande « Statut DEC » (compteurs agrégés).
 */

import React from 'react';
import { ChevronRight, MapPin, AlertTriangle, Loader2 } from 'lucide-react';
import Grille13KPIs from './Grille13KPIs';

export default function VueRegion({ donnees, chargement, onSelectionnerSecteur }) {
  if (chargement) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <span className="ml-3 text-gray-600">Chargement de la région…</span>
      </div>
    );
  }

  if (!donnees) return null;

  const { region, kpis, secteurs, nbMagasinsSousPerf, nbMagasinsTotal, metadata } = donnees;

  return (
    <div className="space-y-6">
      {/* En-tête Région */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-6 text-white shadow-md">
        <div className="flex items-center gap-3 mb-2">
          <MapPin className="w-7 h-7" />
          <h2 className="text-2xl font-bold">{region.libelle}</h2>
        </div>
        <p className="text-indigo-100 text-sm">
          Code {region.code} · {secteurs.length} secteurs · {nbMagasinsTotal} PDV
        </p>
      </div>

      {/* Grille 9 KPIs */}
      <div className="bg-white rounded-2xl shadow-md p-5 border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4">Indicateurs clés — {region.libelle}</h3>
        <Grille13KPIs kpis={kpis} />
      </div>

      {/* Compteur magasins sous la perf région */}
      {nbMagasinsSousPerf > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="text-sm text-amber-900">
            <strong>{nbMagasinsSousPerf}</strong> / {nbMagasinsTotal} magasins de la région sous la performance région
            <span className="text-amber-700 ml-1">(KPI 8 — évolution CA BVP vs M-12)</span>
          </div>
        </div>
      )}

      {/* Liste des secteurs */}
      <div className="bg-white rounded-2xl shadow-md p-5 border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4">Répartition par secteur</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {secteurs.map(secteur => (
            <button
              key={secteur.code}
              onClick={() => onSelectionnerSecteur(secteur)}
              className="text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-400 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-bold text-gray-800">{secteur.libelle}</p>
                  <p className="text-xs text-gray-500">Code {secteur.code} · {secteur.nbPdv} PDV</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
              </div>
              <Grille13KPIs kpis={secteur.kpis} compact />
            </button>
          ))}
        </div>
      </div>

      {/* Métadonnées */}
      <div className="text-center text-xs text-gray-400">
        {metadata.fichier} · Extraction en {metadata.tempsExtraction} ms
      </div>
    </div>
  );
}
