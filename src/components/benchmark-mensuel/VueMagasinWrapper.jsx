/**
 * Vue Niveau 4 — Magasin (wrapper autour des composants diagnostic existants).
 *
 * Phase 1 : réutilisation inchangée des composants Bloc4/Bloc5/Bloc6 du diagnostic
 * manager. Le bouton « Ouvrir le diagnostic complet » est un placeholder actuel
 * car le diagnostic magasin complet (Etape1Diagnostic) est accessible via ce
 * même rendu. En Phase 2, un bouton ouvrira l'Étape 1 wizard Manager dédié.
 *
 * Les composants diagnostic (Bloc4Penetration, Bloc5FluxClient, Bloc6Potentiel)
 * ne sont PAS modifiés. On les utilise en lecture seule.
 */

import React from 'react';
import { Loader2, Store, ExternalLink } from 'lucide-react';
import { Bloc4Penetration, Bloc5FluxClient } from '../manager/diagnostic/GraphiqueFrequentation';
import { Bloc6Potentiel } from '../manager/diagnostic/TopFlopProduits';

export default function VueMagasinWrapper({ donnees, chargement }) {
  if (chargement) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <span className="ml-3 text-gray-600">Chargement du magasin…</span>
      </div>
    );
  }

  if (!donnees) return null;

  const { magasin, indicateurs, metadata } = donnees;
  const pdv = indicateurs.global.pdv;
  const mult = metadata?.typePeriode === 'mois' ? 12 : 52;
  const pLabel = metadata?.typePeriode === 'mois' ? 'mois' : 'semaine';

  // Calculer meilleurePenetration (seuil 10 % tickets) — identique à Etape1Diagnostic
  const parTranche = indicateurs.parTrancheHoraire || {};
  const totalTk = Object.values(parTranche).reduce((s, d) => s + (d.ticketsTotal || 0), 0);
  const seuil = totalTk * 0.10;
  let meilPen = 0;
  Object.values(parTranche).forEach(d => {
    if ((d.ticketsTotal || 0) >= seuil && (d.penetration || 0) > meilPen) meilPen = d.penetration;
  });

  return (
    <div className="space-y-6">
      {/* En-tête magasin (style bordeaux Bloc1) */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-[#8B1538] text-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Store className="w-8 h-8" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {String(magasin.code).padStart(5, '0')} - {magasin.nom || magasin.ville}
                </div>
                <div className="text-white/80 flex items-center gap-2 mt-1">
                  <span>{magasin.enseigne}</span>
                  {magasin.surface && <span>• {magasin.surface.toLocaleString('fr-FR')} m²</span>}
                  {magasin.modele && <span className="px-2 py-0.5 bg-white/20 rounded text-sm">{magasin.modele}</span>}
                </div>
              </div>
            </div>
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
                <div className="text-2xl font-bold">{(pdv.ticketMoyen || 0).toFixed(2)} €</div>
              </div>
              <div className="text-center px-4 py-2 bg-white/20 rounded-lg min-w-[100px]">
                <div className="text-xs text-white/70">CA BVP</div>
                <div className="text-2xl font-bold">{(pdv.caBVP || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bloc 6 : Potentiel total */}
      <Bloc6Potentiel
        indicateurs={indicateurs}
        panierMoyen={pdv.ticketMoyen || 0}
        caBVPActuel={pdv.caBVP || 0}
        multiplier={mult}
        periodLabel={pLabel}
      />

      {/* Bloc 4 : Barres de pénétration par tranche horaire */}
      <Bloc4Penetration indicateurs={indicateurs} />

      {/* Bloc 5 : Analyse Flux Client */}
      <Bloc5FluxClient
        indicateurs={indicateurs}
        panierMoyen={pdv.ticketMoyen || 0}
        meilleurePenetration={meilPen}
      />

      {/* Lien vers le diagnostic complet (Phase 2) */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-center gap-3 text-sm text-indigo-900">
        <ExternalLink className="w-4 h-4 text-indigo-600" />
        <span>
          Diagnostic complet (Étape 1 Manager) disponible via le module « Analyser mon rayon » depuis l'accueil.
        </span>
      </div>

      {/* Métadonnées */}
      <div className="text-center text-xs text-gray-400">
        Données extraites en {metadata?.tempsExtraction || '?'} ms · Source : {metadata?.fichierSource || 'Inconnu'}
      </div>
    </div>
  );
}
