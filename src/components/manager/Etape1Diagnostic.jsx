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

import React, { useMemo } from 'react';
import {
  Store,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';
import { useMagasin } from '../../contexts/MagasinContext';

// Sub-components
import { Bloc2Benchmark, Bloc3Graphiques } from './diagnostic/CartesDiagnostic';
import { Bloc4Penetration, Bloc5FluxClient } from './diagnostic/GraphiqueFrequentation';
import { Bloc6Potentiel, Bloc7Action } from './diagnostic/TopFlopProduits';

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
