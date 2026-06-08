/**
 * Grille 13 KPIs en 5 blocs, utilisée à chaque niveau géographique.
 *
 * Structure (décision Rudy 20/04/2026) :
 *   Bloc 1 — CA BVP (3)       : CA BVP · Progression CA BVP · Écart prog CA vs PDV
 *   Bloc 2 — Quantité BVP (3) : Qté BVP · Progression Qté BVP · Écart prog Qté vs PDV
 *   Bloc 3 — Moyennes (2)     : PV moyen · Ticket moyen
 *   Bloc 4 — Pénétration (3)  : Pén moyen · Pén Matin 9-12 · Pén Soir 16-19
 *   Bloc 5 — Objectif (2)     : Nb tickets à aller chercher · CA additionnel €/an
 *
 * L'écart Matin−AM en points (ancien KPI grille) SORT de cette grille. Il
 * apparaîtra en Phase 2 dans le bloc Excellence Commerciale (KPI DEC 2).
 */

import React from 'react';
import {
  ShoppingCart, TrendingUp, TrendingDown, ArrowLeftRight,
  Package, Coins, Ticket, Gauge, Sunrise, Sunset, Users, Euro,
} from 'lucide-react';

// ============================================================================
// Formatage
// ============================================================================

const fmtEuro = (v) => (v == null || isNaN(v)) ? '—' : `${Math.round(v).toLocaleString('fr-FR')} €`;
const fmtEuro2 = (v) => (v == null || isNaN(v)) ? '—' : `${v.toFixed(2)} €`;
const fmtQte = (v) => (v == null || isNaN(v)) ? '—' : Math.round(v).toLocaleString('fr-FR');
const fmtPct = (v) => (v == null || isNaN(v)) ? '—' : `${(v * 100).toFixed(1)} %`;
const fmtPts = (v) => (v == null || isNaN(v)) ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(1)} pts`;
const fmtEvol = (v) => (v == null || isNaN(v)) ? '—' : `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)} %`;

// ============================================================================
// Carte KPI individuelle
// ============================================================================

function CarteKPI({ icone: Icone, libelle, valeur, sousValeur, couleur = 'slate', signe = null }) {
  const couleurs = {
    slate: 'border-slate-200 bg-white',
    indigo: 'border-indigo-100 bg-indigo-50/40',
    emerald: 'border-emerald-200 bg-emerald-50/60',
    amber: 'border-amber-200 bg-amber-50/60',
    rose: 'border-rose-200 bg-rose-50/60',
    violet: 'border-violet-200 bg-violet-50/60',
    sky: 'border-sky-200 bg-sky-50/60',
  };
  const couleurValeur = signe === 'positif'
    ? 'text-emerald-700'
    : signe === 'negatif' ? 'text-rose-700' : 'text-gray-800';

  return (
    <div className={`rounded-xl border p-4 ${couleurs[couleur] || couleurs.slate}`}>
      <div className="flex items-center gap-2 text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">
        {Icone && <Icone className="w-3.5 h-3.5" />}
        {libelle}
      </div>
      <p className={`text-2xl font-bold ${couleurValeur}`}>{valeur}</p>
      {sousValeur && <p className="text-xs text-gray-500 mt-1">{sousValeur}</p>}
    </div>
  );
}

// ============================================================================
// Titre de bloc
// ============================================================================

function TitreBloc({ numero, titre, sousTitre }) {
  return (
    <div className="flex items-baseline gap-2 mb-2">
      <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
        Bloc {numero}
      </span>
      <span className="text-sm font-bold text-gray-800">{titre}</span>
      {sousTitre && <span className="text-xs text-gray-400">· {sousTitre}</span>}
    </div>
  );
}

// ============================================================================
// Mode compact (mini-grille pour liste régions/secteurs)
// ============================================================================

function GrilleCompacte({ kpis }) {
  const { caBVP, evolCA_BVP, ecartProgressionCA, nbTicketsAChercher } = kpis;
  return (
    <div className="grid grid-cols-4 gap-2 text-xs">
      <div>
        <div className="text-gray-500">CA BVP</div>
        <div className="font-semibold text-gray-800">{fmtEuro(caBVP)}</div>
      </div>
      <div>
        <div className="text-gray-500">Évol. CA</div>
        <div className={`font-semibold ${(evolCA_BVP ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
          {fmtEvol(evolCA_BVP)}
        </div>
      </div>
      <div>
        <div className="text-gray-500">Écart vs PDV</div>
        <div className={`font-semibold ${(ecartProgressionCA ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
          {fmtPts(ecartProgressionCA)}
        </div>
      </div>
      <div>
        <div className="text-gray-500">Tck à conquérir</div>
        <div className="font-semibold text-indigo-700">{fmtQte(nbTicketsAChercher)}</div>
      </div>
    </div>
  );
}

// ============================================================================
// Grille complète (5 blocs, 13 KPIs)
// ============================================================================

export default function Grille13KPIs({ kpis, compact = false }) {
  if (!kpis) return null;
  if (compact) return <GrilleCompacte kpis={kpis} />;

  const {
    caBVP, evolCA_BVP, ecartProgressionCA,
    qteBVP, evolQte_BVP, ecartProgressionQte,
    pvMoyen, ticketMoyen,
    penetrationGlobale, penetrationMatin, penetrationAM,
    nbTicketsAChercher, caAdditionnelAnnuel,
  } = kpis;

  return (
    <div className="space-y-5">
      {/* ─────── Bloc 1 — CA BVP ─────── */}
      <div>
        <TitreBloc numero={1} titre="CA BVP" sousTitre="Volume et progression" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <CarteKPI icone={ShoppingCart} libelle="CA BVP" valeur={fmtEuro(caBVP)} />
          <CarteKPI
            icone={(evolCA_BVP ?? 0) >= 0 ? TrendingUp : TrendingDown}
            libelle="Progression CA BVP vs M-12"
            valeur={fmtEvol(evolCA_BVP)}
            signe={(evolCA_BVP ?? 0) >= 0 ? 'positif' : 'negatif'}
          />
          <CarteKPI
            icone={ArrowLeftRight}
            libelle="Écart progression CA vs PDV"
            valeur={fmtPts(ecartProgressionCA)}
            sousValeur="(+) le rayon grossit plus vite que le magasin"
            signe={(ecartProgressionCA ?? 0) >= 0 ? 'positif' : 'negatif'}
          />
        </div>
      </div>

      {/* ─────── Bloc 2 — Quantité BVP ─────── */}
      <div>
        <TitreBloc numero={2} titre="Quantité BVP" sousTitre="Volume et progression" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <CarteKPI icone={Package} libelle="Quantité BVP" valeur={fmtQte(qteBVP)} />
          <CarteKPI
            icone={(evolQte_BVP ?? 0) >= 0 ? TrendingUp : TrendingDown}
            libelle="Progression Qté BVP vs M-12"
            valeur={fmtEvol(evolQte_BVP)}
            signe={(evolQte_BVP ?? 0) >= 0 ? 'positif' : 'negatif'}
          />
          <CarteKPI
            icone={ArrowLeftRight}
            libelle="Écart progression Qté vs PDV"
            valeur={fmtPts(ecartProgressionQte)}
            sousValeur="(+) la quantité BVP progresse plus vite que le magasin"
            signe={(ecartProgressionQte ?? 0) >= 0 ? 'positif' : 'negatif'}
          />
        </div>
      </div>

      {/* ─────── Bloc 3 — Moyennes ─────── */}
      <div>
        <TitreBloc numero={3} titre="Moyennes" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <CarteKPI
            icone={Coins}
            libelle="PV moyen"
            valeur={fmtEuro2(pvMoyen)}
            sousValeur="CA BVP / Qté BVP"
          />
          <CarteKPI
            icone={Ticket}
            libelle="Ticket moyen BVP"
            valeur={fmtEuro2(ticketMoyen)}
            sousValeur="CA BVP / Tickets BVP"
          />
        </div>
      </div>

      {/* ─────── Bloc 4 — Pénétration ─────── */}
      <div>
        <TitreBloc numero={4} titre="Pénétration" sousTitre="Part des tickets magasin qui achètent en BVP" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <CarteKPI
            icone={Gauge}
            libelle="Pénétration moyenne"
            valeur={fmtPct(penetrationGlobale)}
            sousValeur="Tck BVP total / Tck PDV total"
            couleur="indigo"
          />
          <CarteKPI
            icone={Sunrise}
            libelle="Pénétration Matin 9h-12h"
            valeur={fmtPct(penetrationMatin)}
            couleur="amber"
          />
          <CarteKPI
            icone={Sunset}
            libelle="Pénétration Soir 16h-19h"
            valeur={fmtPct(penetrationAM)}
            couleur="violet"
          />
        </div>
      </div>

      {/* ─────── Bloc 5 — Objectif factuel ─────── */}
      <div>
        <TitreBloc numero={5} titre="Objectif factuel" sousTitre="Ce qui reste à aller chercher" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <CarteKPI
            icone={Users}
            libelle="Nb tickets à aller chercher"
            valeur={fmtQte(nbTicketsAChercher)}
            sousValeur="Somme des deltas par PDV et par tranche"
            couleur="sky"
          />
          <CarteKPI
            icone={Euro}
            libelle="CA additionnel à aller chercher"
            valeur={`${fmtEuro(caAdditionnelAnnuel)} / an`}
            sousValeur="Delta tickets × ticket moyen BVP × 12"
            couleur="emerald"
          />
        </div>
      </div>
    </div>
  );
}
