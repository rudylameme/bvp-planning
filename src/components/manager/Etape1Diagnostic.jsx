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

import React, { useMemo, useState, useEffect } from 'react';
import {
  Store,
  AlertTriangle,
  Lightbulb,
  Zap,
} from 'lucide-react';
import { useMagasin } from '../../contexts/MagasinContext';
import { construireDonneesParTrancheMagasin } from '../../services/extraction/ventesExtractor';

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
// BLOC OPPORTUNITÉ : Message clé dès le haut de page
// "Votre plus grande opportunité : l'après-midi"
// ============================================================================
const BlocOpportunite = ({ indicateurs, panierMoyen, meilleurePenetration, periodLabel = 'semaine' }) => {
  const parTranche = indicateurs.parTrancheHoraire || {};

  // Calculer les données après-midi (14h-19h)
  const creneauxApresMidi = ['14h_16h', '16h_19h'];
  let clientsApresMidi = 0;
  let acheteursApresMidi = 0;
  let clientsPerdusApresMidi = 0;

  creneauxApresMidi.forEach(key => {
    const data = parTranche[key] || {};
    clientsApresMidi += data.ticketsTotal || 0;
    acheteursApresMidi += data.ticketsBVP || 0;
    clientsPerdusApresMidi += data.clientsPerdus || 0;
  });

  if (clientsApresMidi === 0 || meilleurePenetration === 0) return null;

  const penetrationApresMidi = clientsApresMidi > 0 ? acheteursApresMidi / clientsApresMidi : 0;
  const clientsPotentiels = Math.round(clientsApresMidi * meilleurePenetration) - acheteursApresMidi;
  const caPotentielSemaine = clientsPotentiels * panierMoyen;

  // Trouver le créneau avec le plus de clients perdus pour la PRIORITÉ
  let creneauPriorite = null;
  let maxPerdus = 0;
  creneauxApresMidi.forEach(key => {
    const perdus = parTranche[key]?.clientsPerdus || 0;
    if (perdus > maxPerdus) { maxPerdus = perdus; creneauPriorite = key; }
  });

  return (
    <div className="bg-gradient-to-r from-[#22C55E] to-[#16A34A] rounded-2xl shadow-lg p-6 text-white">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-white/20 rounded-xl">
          <Zap className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold">Votre plus grande opportunité : l'après-midi</h3>
      </div>

      <p className="text-white/90 text-base leading-relaxed mb-4">
        Entre 14h et 19h, <strong>{clientsApresMidi.toLocaleString('fr-FR')} clients</strong> passent
        en caisse chaque {periodLabel}. Seulement <strong>{acheteursApresMidi.toLocaleString('fr-FR')}</strong> achètent
        en BVP ({(penetrationApresMidi * 100).toFixed(1)}%).
        Si vous atteignez votre propre niveau du matin ({(meilleurePenetration * 100).toFixed(1)}%),
        c'est <strong>+{caPotentielSemaine.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €/{periodLabel}</strong> de CA supplémentaire.
      </p>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/15 rounded-xl p-3 text-center">
          <div className="text-2xl font-black">{clientsPerdusApresMidi.toLocaleString('fr-FR')}</div>
          <div className="text-xs text-white/70">clients sans achat BVP</div>
        </div>
        <div className="bg-white/15 rounded-xl p-3 text-center">
          <div className="text-2xl font-black">+{clientsPotentiels.toLocaleString('fr-FR')}</div>
          <div className="text-xs text-white/70">tickets à conquérir</div>
        </div>
        <div className="bg-white/25 rounded-xl p-3 text-center">
          <div className="text-2xl font-black">+{caPotentielSemaine.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</div>
          <div className="text-xs text-white/70">CA potentiel / {periodLabel}</div>
        </div>
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
      Le magasin <strong>{magasin?.nom}</strong> ({String(magasin?.code || '').padStart(5, '0')}) n'a pas de ventes BVP enregistrées pour cette période.
    </p>
    <button
      onClick={onPrecedent}
      className="mt-6 px-6 py-3 bg-[#8B1538] text-white rounded-xl font-semibold hover:bg-[#5B0D24] transition-colors"
    >
      Choisir un autre magasin ou période
    </button>
  </div>
);

// ============================================================================
// COMPOSANT PRINCIPAL : Etape1Diagnostic
// ============================================================================
const Etape1Diagnostic = ({ onPrecedent }) => {
  const { donneesMagasin, semaineSelectionnee } = useMagasin();

  // ========== MAGASIN CIBLE ==========
  const [codeMagasinCible, setCodeMagasinCible] = useState(
    () => localStorage.getItem('bvp_magasin_cible') || null
  );

  useEffect(() => {
    if (codeMagasinCible) {
      localStorage.setItem('bvp_magasin_cible', codeMagasinCible);
    } else {
      localStorage.removeItem('bvp_magasin_cible');
    }
  }, [codeMagasinCible]);

  // Lookup magasin cible : données globales + pénétration par tranche
  const donneesMagasinCible = useMemo(() => {
    if (!codeMagasinCible || !donneesMagasin?.dictionnaireMagasins) return null;
    const codeNorm = String(codeMagasinCible).replace(/^0+/, '');
    const global = donneesMagasin.dictionnaireMagasins.get(codeNorm);
    if (!global) return null;

    const parTrancheHoraire = construireDonneesParTrancheMagasin(
      codeNorm,
      donneesMagasin._venteHeureRaw
    );

    return { ...global, parTrancheHoraire };
  }, [codeMagasinCible, donneesMagasin]);

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

  const { magasin, comparaison, indicateurs, metadata } = donneesMagasin;
  const typePeriode = metadata?.typePeriode || 'semaine';
  const multiplier = metadata?.multiplierAnnuel || 52;
  const periodLabel = typePeriode === 'mois' ? 'mois' : 'semaine';

  const pdv = indicateurs.global.pdv;
  const pdvS1 = indicateurs.global.pdvS1 || {};
  const pdvAn1 = indicateurs.global.pdvAn1 || {};
  const moyenneSecteur = indicateurs.global.moyenneSecteur;

  return (
    <div className="space-y-8">
      {/* 1. En-tête magasin */}
      <Bloc1Identification
        magasin={magasin}
        pdv={pdv}
        semaineSelectionnee={semaineSelectionnee}
        comparaison={comparaison}
      />

      {/* 2. Potentiel total — l'enjeu global dès le haut */}
      <Bloc6Potentiel
        indicateurs={indicateurs}
        panierMoyen={pdv.ticketMoyen || 0}
        caBVPActuel={pdv.caBVP || 0}
        multiplier={multiplier}
        periodLabel={periodLabel}
      />

      {/* 3. Je me compare — tableau benchmark */}
      <Bloc2Benchmark
        donnees={donneesMagasin}
        indicateurs={indicateurs}
        magasin={magasin}
        magasinCible={donneesMagasinCible}
        dictionnaireMagasins={donneesMagasin.dictionnaireMagasins}
        codeMagasinCible={codeMagasinCible}
        setCodeMagasinCible={setCodeMagasinCible}
      />

      {/* 4. Ma situation — graphiques comparatifs */}
      <Bloc3Graphiques
        pdv={pdv}
        pdvS1={pdvS1}
        pdvAn1={pdvAn1}
        moyenneSecteur={moyenneSecteur}
        typePeriode={typePeriode}
      />

      {/* 5. Taux de pénétration par tranche horaire */}
      <Bloc4Penetration indicateurs={indicateurs} magasinCible={donneesMagasinCible} />

      {/* 6. Analyse Flux Client → Achat BVP (chronologique + double barre) */}
      <Bloc5FluxClient
        indicateurs={indicateurs}
        panierMoyen={pdv.ticketMoyen || 0}
        meilleurePenetration={meilleurePenetration}
      />

      {/* 7. Passez à l'action + 8. Phrase de transition */}
      <Bloc7Action
        indicateurs={indicateurs}
        panierMoyen={pdv.ticketMoyen || 0}
        multiplier={multiplier}
        periodLabel={periodLabel}
      />

    </div>
  );
};

export default Etape1Diagnostic;
