/**
 * Dashboard Benchmark - Vue principale des performances
 *
 * Affiche :
 * - Informations du magasin
 * - Indicateurs clés vs secteur
 * - Performance par créneau
 * - Potentiel identifié
 * - Lien vers le plan d'action
 */

import React, { useState } from 'react';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Store,
  Users,
  ShoppingCart,
  Ticket,
  Target,
  ArrowRight,
  RefreshCw,
  Home,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  UserX,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

// ============================================================================
// DIAGNOSTIC PERSONNALISÉ PAR TRANCHE HORAIRE
// Identifie la tranche avec le plus de clients perdus et recommande une action
// Utilise les 6 tranches horaires pour une analyse précise
// ============================================================================

const DiagnosticPersonnalise = ({ indicateurs, panierMoyen, onNaviguerPlanning }) => {
  // Récupérer les données par tranche horaire (6 tranches)
  const parTrancheHoraire = indicateurs.parTrancheHoraire;

  // Vérifier qu'on a des données
  if (!parTrancheHoraire) {
    return (
      <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-500">
        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
        <p>Données insuffisantes pour analyser les tranches horaires</p>
      </div>
    );
  }

  // Ordre des tranches pour l'affichage (bon ordre chronologique)
  const ordreTranches = ['00_Autre', '09h_12h', '12h_14h', '14h_16h', '16h_19h', '19h_23h'];

  // Convertir en tableau avec les données calculées
  const tranchesAvecDonnees = ordreTranches.map(key => {
    const data = parTrancheHoraire[key] || {};
    return {
      key,
      label: data.label || key,
      horaire: key === '00_Autre' ? '00h-09h' :
               key === '09h_12h' ? '9h-12h' :
               key === '12h_14h' ? '12h-14h' :
               key === '14h_16h' ? '14h-16h' :
               key === '16h_19h' ? '16h-19h' :
               key === '19h_23h' ? '19h-23h' : key,
      cause: data.cause || '',
      action: data.action || '',
      horaireCuisson: data.horaireCuisson || null,
      ticketsTotal: data.ticketsTotal || 0,
      ticketsBVP: data.ticketsBVP || 0,
      clientsPerdus: data.clientsPerdus || 0,
      penetration: data.penetration || 0,
    };
  }).filter(t => t.ticketsTotal > 0);

  // Si aucune tranche avec trafic
  if (tranchesAvecDonnees.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-500">
        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
        <p>Aucune donnée de trafic disponible</p>
      </div>
    );
  }

  // Trier par nombre de clients perdus (décroissant)
  const tranchesTries = [...tranchesAvecDonnees].sort((a, b) => b.clientsPerdus - a.clientsPerdus);

  // Identifier la tranche prioritaire (le plus de clients perdus)
  const tranchePrioritaire = tranchesTries[0];

  // Autres tranches à surveiller (avec plus de 100 clients perdus)
  const autresTranches = tranchesTries
    .slice(1)
    .filter(t => t.clientsPerdus > 100);

  // Si toutes les tranches sont équilibrées (< 50 clients perdus sur le pire)
  if (tranchePrioritaire.clientsPerdus < 50) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <CheckCircle className="w-8 h-8 text-green-600" />
          <h3 className="text-lg font-bold text-green-800">Excellente couverture horaire !</h3>
        </div>
        <p className="text-green-700">
          Vos tranches horaires sont bien équilibrées. Concentrez-vous sur l'augmentation des volumes
          et la qualité de l'offre pour améliorer votre CA BVP.
        </p>
      </div>
    );
  }

  // Calculer le potentiel financier
  // Taux de conversion cible réaliste : 10% des clients perdus
  const tauxConversionCible = 0.10;
  const clientsRecuperables = Math.round(tranchePrioritaire.clientsPerdus * tauxConversionCible);
  const caRecuperableSemaine = clientsRecuperables * panierMoyen;
  const caRecuperableAnnuel = caRecuperableSemaine * 52;

  // Total toutes tranches pour contexte
  const totalClientsPerdus = tranchesAvecDonnees.reduce((acc, t) => acc + t.clientsPerdus, 0);
  const totalClientsRecuperables = Math.round(totalClientsPerdus * tauxConversionCible);
  const totalCaAnnuel = totalClientsRecuperables * panierMoyen * 52;

  return (
    <div className="space-y-4">
      {/* HERO : Nombre de clients perdus */}
      <div className="bg-[#8B1538] rounded-2xl shadow-xl overflow-hidden">
        {/* En-tête HERO */}
        <div className="p-6 text-white text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <UserX className="w-6 h-6 text-white/80" />
            <span className="text-sm uppercase tracking-wide text-white/80">Tranche horaire prioritaire</span>
          </div>

          {/* Nombre de clients perdus en GROS */}
          <div className="text-6xl md:text-7xl font-black text-yellow-300 mb-2">
            {tranchePrioritaire.clientsPerdus.toLocaleString('fr-FR')}
          </div>
          <div className="text-xl text-white/90">
            clients passent <span className="font-bold">{tranchePrioritaire.label}</span>
            <span className="text-white/60 ml-1">({tranchePrioritaire.horaire})</span>
          </div>
          <div className="text-lg text-white/70 mt-1">
            sans acheter en BVP chaque semaine
          </div>
        </div>

        {/* Potentiel financier */}
        <div className="bg-white/10 px-6 py-4">
          <div className="flex items-center justify-center gap-8 flex-wrap">
            <div className="text-center">
              <div className="text-sm text-white/60 mb-1">Si conversion de 10%</div>
              <div className="text-2xl font-bold text-yellow-300">+{clientsRecuperables}</div>
              <div className="text-xs text-white/50">clients/semaine</div>
            </div>
            <div className="text-3xl text-white/30">=</div>
            <div className="text-center">
              <div className="text-sm text-white/60 mb-1">CA récupérable</div>
              <div className="text-3xl font-bold text-yellow-300">
                +{caRecuperableAnnuel.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
              </div>
              <div className="text-xs text-white/50">par an</div>
            </div>
          </div>
        </div>
      </div>

      {/* Callout : Explication + Recommandation */}
      <div className="bg-[#F5F0E8] border-l-4 border-[#8B1538] rounded-r-xl p-5">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 p-2 bg-[#8B1538] rounded-lg">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            {/* Cause probable */}
            <h4 className="font-semibold text-[#8B1538] mb-2">
              Pourquoi ces clients n'achètent pas {tranchePrioritaire.label} ?
            </h4>
            <p className="text-[#58595B] mb-4">
              {tranchePrioritaire.cause}
            </p>

            {/* Recommandation */}
            <div className="bg-white rounded-lg p-4 border border-[#D1D3D4]">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-[#E31837]" />
                <span className="font-semibold text-[#58595B]">Recommandation</span>
              </div>
              <p className="text-lg font-bold text-[#8B1538]">
                {tranchePrioritaire.action}
              </p>
              {tranchePrioritaire.horaireCuisson && (
                <p className="text-sm text-[#58595B] mt-1">
                  Planifiez une cuisson pour avoir des produits frais à {tranchePrioritaire.horaireCuisson}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Autres tranches à surveiller */}
      {autresTranches.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-[#58595B] mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Autres tranches horaires à surveiller
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {autresTranches.map(tranche => (
              <div key={tranche.key} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                <div>
                  <span className="font-medium text-[#58595B]">{tranche.label}</span>
                  <span className="text-sm text-gray-500 ml-2">({tranche.horaire})</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-[#E31837]">
                    {tranche.clientsPerdus.toLocaleString('fr-FR')}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">clients perdus</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Potentiel total (si plusieurs tranches ont du potentiel significatif) */}
      {totalClientsPerdus > tranchePrioritaire.clientsPerdus * 1.5 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="text-sm text-amber-800 font-medium">
                Potentiel total toutes tranches confondues
              </div>
              <div className="text-xs text-amber-600">
                En améliorant la couverture sur l'ensemble de la journée
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-amber-700">
                +{totalCaAnnuel.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €/an
              </div>
              <div className="text-xs text-amber-600">
                ({totalClientsRecuperables} clients/semaine × {panierMoyen.toFixed(2)}€ × 52)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CTA : Plan d'Action */}
      <button
        onClick={onNaviguerPlanning}
        className="group w-full flex items-center justify-center gap-4 px-8 py-5 bg-[#E31837] text-white rounded-xl font-bold text-lg hover:bg-[#C41230] transition-all duration-300 shadow-lg hover:shadow-xl"
      >
        <span className="text-xl">Configurer la production {tranchePrioritaire.label}</span>
        <ArrowRight className="w-7 h-7 group-hover:translate-x-1 transition-transform" />
      </button>
      <p className="text-center text-sm text-[#58595B]">
        Le Plan d'Action vous guide pour planifier vos cuissons
      </p>
    </div>
  );
};
// Composant Carte Indicateur - Version V2 avec comparaisons multiples (S-1, An-1, Secteur)
const CarteIndicateurV2 = ({ titre, icone: Icon, valeurActuelle, valeurS1, valeurAn1, valeurSecteur, format = 'nombre', labelS1 = 'S-1', labelAn1 = 'An-1' }) => {
  const formatValeur = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '-';
    if (format === 'pourcentage') {
      return `${(val * 100).toFixed(1)}%`;
    }
    if (format === 'euro') {
      return `${val.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €`;
    }
    if (format === 'nombre') {
      return Math.round(val).toLocaleString('fr-FR');
    }
    return val;
  };

  // Calculer les écarts en pourcentage
  const calculerEcart = (actuel, reference) => {
    if (!reference || reference === 0 || !actuel) return null;
    return ((actuel - reference) / reference) * 100;
  };

  // Pour la pénétration, on calcule l'écart en points
  const calculerEcartPoints = (actuel, reference) => {
    if (reference === null || reference === undefined || actuel === null || actuel === undefined) return null;
    return (actuel - reference) * 100; // Convertir en points de %
  };

  const ecartS1 = format === 'pourcentage' ? calculerEcartPoints(valeurActuelle, valeurS1) : calculerEcart(valeurActuelle, valeurS1);
  const ecartAn1 = format === 'pourcentage' ? calculerEcartPoints(valeurActuelle, valeurAn1) : calculerEcart(valeurActuelle, valeurAn1);
  const ecartSecteur = format === 'pourcentage' ? calculerEcartPoints(valeurActuelle, valeurSecteur) : calculerEcart(valeurActuelle, valeurSecteur);

  // Composant ligne de comparaison
  const LigneComparaison = ({ label, valeur, ecart, isPts = false }) => {
    // Ne pas afficher si valeur n'existe pas ou est 0 (0 = pas de données historiques)
    if (valeur === null || valeur === undefined || isNaN(valeur) || valeur === 0) return null;
    const estPositif = ecart > 0;
    const estNeutre = ecart === null || Math.abs(ecart) < 0.5;

    return (
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">
          vs {formatValeur(valeur)} {label}
        </span>
        {!estNeutre && ecart !== null && (
          <span className={`flex items-center gap-1 font-semibold ${estPositif ? 'text-green-600' : 'text-red-600'}`}>
            {estPositif ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {estPositif ? '+' : ''}{ecart.toFixed(1)}{isPts ? ' pt' : '%'}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
      {/* Titre avec icône */}
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 bg-[#E8E1D5] rounded-lg">
          <Icon className="w-5 h-5 text-[#8B1538]" />
        </div>
        <span className="text-sm font-medium text-[#58595B]">{titre}</span>
      </div>

      {/* Valeur actuelle */}
      <div className="text-2xl font-bold text-gray-800 mb-3">
        {formatValeur(valeurActuelle)}
      </div>

      {/* Comparaisons */}
      <div className="space-y-1.5 border-t border-gray-100 pt-3">
        <LigneComparaison label={labelS1} valeur={valeurS1} ecart={ecartS1} isPts={format === 'pourcentage'} />
        <LigneComparaison label={labelAn1} valeur={valeurAn1} ecart={ecartAn1} isPts={format === 'pourcentage'} />
        <LigneComparaison label="secteur" valeur={valeurSecteur} ecart={ecartSecteur} isPts={format === 'pourcentage'} />
      </div>
    </div>
  );
};

// Ancien composant (gardé pour compatibilité)
const CarteIndicateur = ({ titre, icone: Icon, valeurPdv, valeurSecteur, ecart, unite = '', format = 'nombre' }) => {
  const formatValeur = (val) => {
    if (format === 'pourcentage') {
      return `${(val * 100).toFixed(1)}%`;
    }
    if (format === 'euro') {
      return `${val.toFixed(2)} €`;
    }
    if (format === 'nombre') {
      return Math.round(val).toLocaleString('fr-FR');
    }
    return val;
  };

  const estPositif = ecart > 0;
  const estNeutre = Math.abs(ecart) < 0.5;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 bg-[#E8E1D5] rounded-lg">
          <Icon className="w-5 h-5 text-[#8B1538]" />
        </div>
        <span className="text-sm font-medium text-[#58595B]">{titre}</span>
      </div>

      <div className="space-y-2">
        {/* Valeur PDV */}
        <div className="text-2xl font-bold text-gray-800">
          {formatValeur(valeurPdv)}{unite}
        </div>

        {/* Valeur Secteur */}
        <div className="text-sm text-gray-500">
          vs {formatValeur(valeurSecteur)}{unite} secteur
        </div>

        {/* Écart */}
        <div className={`flex items-center gap-1 text-sm font-semibold ${
          estNeutre ? 'text-gray-500' :
          estPositif ? 'text-green-600' : 'text-red-600'
        }`}>
          {estNeutre ? (
            <Minus className="w-4 h-4" />
          ) : estPositif ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          <span>
            {estPositif ? '+' : ''}{ecart.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};

// Composant Graphique Flux vs Pénétration - Version avec 6 tranches horaires
const GraphiqueFluxPenetration = ({ indicateurs }) => {
  // Configuration des 6 tranches horaires dans le bon ordre
  const tranches = [
    { key: '00_Autre', label: 'Autres horaires', heure: '00h-09h' },
    { key: '09h_12h', label: 'Matin', heure: '9h-12h' },
    { key: '12h_14h', label: 'Midi', heure: '12h-14h' },
    { key: '14h_16h', label: 'Début après-midi', heure: '14h-16h' },
    { key: '16h_19h', label: 'Fin après-midi', heure: '16h-19h' },
    { key: '19h_23h', label: 'Soir', heure: '19h-23h' },
  ];

  // Récupérer les données par tranche horaire
  const donneesParTranche = indicateurs.parTrancheHoraire || {};

  // Trouver la meilleure pénétration du magasin comme référence
  const penetrationMax = Math.max(
    ...tranches.map(t => donneesParTranche[t.key]?.penetration || 0)
  );
  const trancheRef = tranches.find(t =>
    donneesParTranche[t.key]?.penetration === penetrationMax
  );

  // Ticket moyen BVP pour calculer le CA
  const ticketMoyen = indicateurs.global.pdv.ticketMoyen || 0;

  // Calculer les données par tranche
  const dataTranches = tranches.map(tranche => {
    const data = donneesParTranche[tranche.key] || {};

    const ticketsPDV = data.ticketsTotal || 0;
    const ticketsBVP = data.ticketsBVP || 0;
    const penetration = data.penetration || 0;
    const clientsPerdus = data.clientsPerdus || 0;

    // Potentiel si on appliquait le meilleur taux du magasin
    const ticketsBVPPotentiels = Math.round(ticketsPDV * penetrationMax);
    const ticketsManques = Math.max(0, ticketsBVPPotentiels - ticketsBVP);
    const caPerdu = Math.round(ticketsManques * ticketMoyen);

    return {
      ...tranche,
      ticketsPDV,
      ticketsBVP,
      penetration,
      clientsPerdus,
      ticketsBVPPotentiels,
      ticketsManques,
      caPerdu,
      estReference: penetration === penetrationMax && penetrationMax > 0
    };
  }).filter(t => t.ticketsPDV > 0); // Filtrer les tranches sans trafic

  // Totaux pour le résumé
  const totalTicketsManques = dataTranches.reduce((sum, t) => sum + t.ticketsManques, 0);
  const totalCaPerdu = dataTranches.reduce((sum, t) => sum + t.caPerdu, 0);
  const totalClientsPerdus = dataTranches.reduce((sum, t) => sum + t.clientsPerdus, 0);

  // Trouver le max de tickets PDV pour normaliser les barres
  const maxTicketsPDV = Math.max(...dataTranches.map(t => t.ticketsPDV));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-[#8B1538] mb-2">📊 Analyse Flux Client → Achat BVP</h2>
      <p className="text-sm text-[#58595B] mb-4">
        Combien de clients passent en caisse vs combien achètent en BVP par tranche horaire
      </p>

      {/* Référence */}
      {trancheRef && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 mb-6 text-sm">
          <span className="text-green-700">
            Votre meilleur taux : <strong>{(penetrationMax * 100).toFixed(1)}%</strong> {donneesParTranche[trancheRef.key]?.label || trancheRef.label}
            — c'est votre objectif pour les autres créneaux
          </span>
        </div>
      )}

      {/* Tableau des tranches */}
      <div className="space-y-4">
        {dataTranches.map(tranche => {
          const barreBVPWidth = maxTicketsPDV > 0 ? (tranche.ticketsBVP / maxTicketsPDV) * 100 : 0;
          const barrePotentielWidth = maxTicketsPDV > 0 ? (tranche.ticketsBVPPotentiels / maxTicketsPDV) * 100 : 0;

          return (
            <div key={tranche.key} className={`rounded-lg p-4 ${tranche.estReference ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
              {/* En-tête tranche */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800">{tranche.label}</span>
                  <span className="text-xs text-[#58595B]">({tranche.heure})</span>
                  {tranche.estReference && (
                    <span className="px-2 py-0.5 bg-green-500 text-white rounded text-xs font-medium">
                      Référence
                    </span>
                  )}
                </div>
                {/* Taux de pénétration */}
                <div className="text-right">
                  <div className={`text-lg font-bold ${tranche.estReference ? 'text-green-600' : tranche.ticketsManques > 20 ? 'text-[#ED1C24]' : 'text-gray-700'}`}>
                    {(tranche.penetration * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Chiffres clés */}
              <div className="grid grid-cols-3 gap-4 mb-3 text-center">
                <div>
                  <div className="text-xs text-[#58595B] uppercase">Clients en caisse</div>
                  <div className="text-xl font-bold text-gray-800">{tranche.ticketsPDV.toLocaleString('fr-FR')}</div>
                  <div className="text-xs text-[#58595B]">/semaine</div>
                </div>
                <div>
                  <div className="text-xs text-[#58595B] uppercase">Achètent BVP</div>
                  <div className="text-xl font-bold text-[#8B1538]">{tranche.ticketsBVP.toLocaleString('fr-FR')}</div>
                  <div className="text-xs text-[#58595B]">/semaine</div>
                </div>
                <div>
                  <div className="text-xs text-[#58595B] uppercase">N'achètent pas</div>
                  <div className="text-xl font-bold text-gray-400">{tranche.clientsPerdus.toLocaleString('fr-FR')}</div>
                  <div className="text-xs text-[#58595B]">/semaine</div>
                </div>
              </div>

              {/* Barre visuelle */}
              <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden mb-2">
                {/* Barre potentiel (en fond) */}
                {!tranche.estReference && (
                  <div
                    className="absolute h-full bg-orange-200 rounded-full"
                    style={{ width: `${barrePotentielWidth}%` }}
                  />
                )}
                {/* Barre tickets BVP actuels */}
                <div
                  className={`absolute h-full rounded-full ${tranche.estReference ? 'bg-green-500' : 'bg-[#8B1538]'}`}
                  style={{ width: `${barreBVPWidth}%` }}
                />
              </div>

              {/* Potentiel manqué */}
              {!tranche.estReference && tranche.ticketsManques > 0 && (
                <div className="bg-white border border-orange-200 rounded-lg p-3 mt-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-[#58595B]">
                      Si {(penetrationMax * 100).toFixed(1)}% comme {trancheRef?.label?.toLowerCase()} :
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-orange-600 font-bold">+{tranche.ticketsManques}</span>
                        <span className="text-xs text-[#58595B] ml-1">tickets</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[#ED1C24] font-bold">+{tranche.caPerdu.toLocaleString('fr-FR')} €</span>
                        <span className="text-xs text-[#58595B] ml-1">CA</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Résumé total */}
      {totalTicketsManques > 0 && (() => {
        // Calculer le % de progression (basé sur les données de la semaine)
        const caActuelSemaine = indicateurs.global.pdv.caBVP || 0;
        const progressionPourcent = caActuelSemaine > 0 ? (totalCaPerdu / caActuelSemaine) * 100 : 0;
        const caAnnuelPotentiel = totalCaPerdu * 52;

        return (
          <div className="mt-6 bg-gradient-to-r from-[#ED1C24] to-[#8B1538] rounded-xl p-5 text-white">
            <div className="text-sm text-white/80 mb-3">
              Potentiel si toutes les tranches atteignent {(penetrationMax * 100).toFixed(1)}% :
            </div>
            <div className="flex items-center justify-around flex-wrap gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold">+{totalTicketsManques}</div>
                <div className="text-sm text-white/70">tickets / semaine</div>
              </div>
              <div className="text-4xl font-light text-white/50">=</div>
              <div className="text-center">
                <div className="text-3xl font-bold">+{totalCaPerdu.toLocaleString('fr-FR')} €</div>
                <div className="text-sm text-white/70">CA / semaine</div>
              </div>
              <div className="text-4xl font-light text-white/50">=</div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-300">+{progressionPourcent.toFixed(1)}%</div>
                <div className="text-sm text-white/70">de CA BVP</div>
              </div>
            </div>
            {/* Projection annuelle */}
            <div className="mt-4 pt-4 border-t border-white/20 text-center">
              <div className="text-xs text-white/60 uppercase mb-1">Projection annuelle</div>
              <div className="text-2xl font-bold text-yellow-300">+{caAnnuelPotentiel.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} € / an</div>
              <div className="text-xs text-white/50 mt-1">basé sur cette semaine × 52</div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};


// MODIFICATION 3 : Barres horizontales pénétration par tranche horaire (6 tranches) avec comparaison secteur
const BarresPenetration = ({ indicateurs }) => {
  // Configuration des 6 tranches horaires dans le bon ordre
  const tranches = [
    { key: '00_Autre', label: 'Autres horaires', heure: '00h-09h' },
    { key: '09h_12h', label: 'Matin', heure: '9h-12h' },
    { key: '12h_14h', label: 'Midi', heure: '12h-14h' },
    { key: '14h_16h', label: 'Début après-midi', heure: '14h-16h' },
    { key: '16h_19h', label: 'Fin après-midi', heure: '16h-19h' },
    { key: '19h_23h', label: 'Soir', heure: '19h-23h' },
  ];

  // Récupérer les données par tranche horaire
  const donneesParTranche = indicateurs.parTrancheHoraire || {};
  const moyenneSecteur = indicateurs.moyenneSecteurParTrancheHoraire || {};

  // Trouver la meilleure pénétration pour l'échelle (PDV + secteur)
  const maxPenetration = Math.max(
    ...tranches.map(t => {
      const penPdv = donneesParTranche[t.key]?.penetration || 0;
      const penSecteur = moyenneSecteur[t.key]?.penetration || 0;
      return Math.max(penPdv, penSecteur);
    }),
    0.3 // minimum 30% pour l'échelle
  );

  // Échelle à max + 10%
  const echelle = Math.max(maxPenetration * 1.1, 0.5);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <h2 className="text-lg font-semibold text-[#8B1538] mb-2 flex items-center gap-2">
        <Target className="w-5 h-5" />
        Taux de pénétration par tranche horaire
      </h2>
      <p className="text-sm text-[#58595B] mb-4">
        Pourcentage de clients passant en caisse qui achètent en BVP — comparé à la moyenne du groupe
      </p>

      <div className="space-y-5">
        {tranches.map(tranche => {
          const data = donneesParTranche[tranche.key] || {};
          const secteurData = moyenneSecteur[tranche.key] || {};

          const penetration = data.penetration || 0;
          const penetrationSecteur = secteurData.penetration || 0;
          const ticketsTotal = data.ticketsTotal || 0;
          const ticketsBVP = data.ticketsBVP || 0;
          const clientsPerdus = data.clientsPerdus || 0;

          // Si pas de trafic sur ce créneau, ne pas afficher
          if (ticketsTotal === 0) return null;

          const barreWidth = (penetration / echelle) * 100;
          const secteurPosition = (penetrationSecteur / echelle) * 100;

          // Écart vs secteur (en points de %)
          const ecartSecteur = (penetration - penetrationSecteur) * 100;
          const estMeilleurQueSecteur = ecartSecteur >= 0;

          return (
            <div key={tranche.key}>
              {/* Label tranche */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800">{tranche.label}</span>
                  <span className="text-xs text-[#58595B]">({tranche.heure})</span>
                </div>
                <div className="text-right">
                  <span className="text-sm text-[#58595B]">
                    {ticketsBVP.toLocaleString('fr-FR')} / {ticketsTotal.toLocaleString('fr-FR')} clients
                  </span>
                </div>
              </div>

              {/* Barre + valeur */}
              <div className="relative">
                {/* Conteneur barre */}
                <div className="h-10 bg-gray-100 rounded-lg overflow-hidden relative">
                  {/* Barre de pénétration */}
                  <div
                    className={`h-full rounded-lg transition-all duration-500 ${
                      estMeilleurQueSecteur ? 'bg-gradient-to-r from-green-500 to-green-400' : 'bg-gradient-to-r from-[#8B1538] to-[#ED1C24]'
                    }`}
                    style={{ width: `${Math.min(barreWidth, 100)}%` }}
                  />

                  {/* Ligne verticale secteur */}
                  {penetrationSecteur > 0 && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-[#58595B] z-10"
                      style={{ left: `${Math.min(secteurPosition, 100)}%` }}
                    >
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-[#58595B] whitespace-nowrap">
                        Secteur
                      </div>
                    </div>
                  )}

                  {/* Valeur dans la barre */}
                  <div className="absolute inset-0 flex items-center px-3">
                    <span className={`font-bold text-lg ${barreWidth > 20 ? 'text-white' : 'text-gray-800 ml-auto'}`}>
                      {(penetration * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Indicateurs sous la barre */}
                <div className="flex items-center justify-between mt-1 text-xs">
                  <span className="text-[#58595B]">
                    {clientsPerdus.toLocaleString('fr-FR')} clients sans achat BVP
                  </span>
                  {penetrationSecteur > 0 && (
                    <span className={`font-semibold ${estMeilleurQueSecteur ? 'text-green-600' : 'text-red-600'}`}>
                      {estMeilleurQueSecteur ? '+' : ''}{ecartSecteur.toFixed(1)} pt vs secteur ({(penetrationSecteur * 100).toFixed(1)}%)
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Légende */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gradient-to-r from-green-500 to-green-400 rounded" />
          <span className="text-xs text-[#58595B]">Meilleur que secteur</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gradient-to-r from-[#8B1538] to-[#ED1C24] rounded" />
          <span className="text-xs text-[#58595B]">En-dessous secteur</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-4 bg-[#58595B]" />
          <span className="text-xs text-[#58595B]">Moyenne secteur</span>
        </div>
      </div>
    </div>
  );
};

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


// Composant principal Dashboard
const DashboardBenchmark = ({ donnees, onRetour, onNaviguerPlanning, onRetourAccueil }) => {
  if (!donnees) return null;

  const { magasin, comparaison, indicateurs } = donnees;

  return (
    <div className="min-h-screen bg-[#F5F2ED]">
      {/* Header */}
      <div className="bg-white border-b border-[#D1D3D4] sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Accueil + Retour */}
            <div className="flex items-center gap-3">
              {onRetourAccueil && (
                <button
                  onClick={onRetourAccueil}
                  className="flex items-center gap-2 px-3 py-2 bg-[#E8E1D5] hover:bg-[#D1D3D4] rounded-lg text-[#58595B] transition-colors"
                  title="Retour à l'accueil"
                >
                  <Home className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={onRetour}
                className="flex items-center gap-2 text-[#58595B] hover:text-[#8B1538] transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Changer</span>
              </button>
            </div>

            {/* Titre */}
            <div className="text-center">
              <h1 className="text-xl font-bold text-[#8B1538]">
                📊 Benchmark Hebdo BVP
              </h1>
              <p className="text-sm text-[#58595B]">
                Semaine {donnees.semaine}
              </p>
            </div>

            {/* Actions */}
            <button
              onClick={onRetour}
              className="flex items-center gap-2 text-[#58595B] hover:text-[#8B1538] transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              <span className="hidden sm:inline">Changer</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* Bannière Magasin Sélectionné */}
        <div className="bg-gradient-to-r from-[#8B1538] to-[#ED1C24] rounded-xl shadow-lg p-5 text-white">
          <div className="flex flex-wrap items-center gap-6">
            {/* Infos magasin */}
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Store className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {magasin.code} - {magasin.nom}
                </div>
                <div className="text-white/80 flex items-center gap-3 mt-1">
                  <span>{magasin.enseigne}</span>
                  {magasin.surface && <span>• {magasin.surface.toLocaleString('fr-FR')} m²</span>}
                  <span className="px-2 py-0.5 bg-white/20 rounded text-xs">
                    {magasin.vocation || 'SUPER ALIMENTAIRE'}
                  </span>
                </div>
              </div>
            </div>

            {/* Indicateurs clés du magasin */}
            <div className="flex flex-wrap gap-4 ml-auto">
              <div className="text-center px-4 py-2 bg-white/10 rounded-lg">
                <div className="text-xs text-white/70">Tickets PDV</div>
                <div className="text-xl font-bold">{indicateurs.global.pdv.ticketsTotal.toLocaleString('fr-FR')}</div>
              </div>
              <div className="text-center px-4 py-2 bg-white/10 rounded-lg">
                <div className="text-xs text-white/70">Tickets BVP</div>
                <div className="text-xl font-bold">{indicateurs.global.pdv.ticketsBVP.toLocaleString('fr-FR')}</div>
              </div>
              <div className="text-center px-4 py-2 bg-white/10 rounded-lg">
                <div className="text-xs text-white/70">Ticket Moyen</div>
                <div className="text-xl font-bold">{indicateurs.global.pdv.ticketMoyen.toFixed(2)} €</div>
              </div>
              <div className="text-center px-4 py-2 bg-white/20 rounded-lg">
                <div className="text-xs text-white/70">CA BVP</div>
                <div className="text-xl font-bold">{indicateurs.global.pdv.caBVP.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</div>
              </div>
            </div>
          </div>
        </div>

        {/* MODIFICATION 5 : Tableau Benchmark avec état collapsed */}
        <TableauClassement
          donnees={donnees}
          indicateurs={indicateurs}
          magasin={magasin}
        />

        {/* Indicateurs Clés */}
        <div>
          <h2 className="text-lg font-semibold text-[#8B1538] mb-2">📈 Indicateurs Clés</h2>
          <p className="text-sm text-[#58595B] mb-4">
            Comparaison avec {comparaison.nombreMagasinsComparables} magasins
            {magasin.secteurLibelle && magasin.modele
              ? ` (${magasin.secteurLibelle} • ${magasin.modele})`
              : magasin.vocation
                ? ` (${magasin.vocation})`
                : ''
            }
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <CarteIndicateurV2
              titre="CA BVP"
              icone={TrendingUp}
              valeurActuelle={indicateurs.global.pdv.caBVP}
              valeurS1={indicateurs.global.pdvS1?.caBVP}
              valeurAn1={indicateurs.global.pdvAn1?.caBVP}
              valeurSecteur={indicateurs.global.moyenneSecteur.caBVP}
              format="euro"
            />
            <CarteIndicateurV2
              titre="Articles vendus"
              icone={ShoppingCart}
              valeurActuelle={indicateurs.global.pdv.qteBVP}
              valeurS1={indicateurs.global.pdvS1?.qteBVP}
              valeurAn1={indicateurs.global.pdvAn1?.qteBVP}
              valeurSecteur={indicateurs.global.moyenneSecteur.qteBVP}
              format="nombre"
            />
            <CarteIndicateurV2
              titre="Tickets BVP"
              icone={Ticket}
              valeurActuelle={indicateurs.global.pdv.ticketsBVP}
              valeurS1={indicateurs.global.pdvS1?.ticketsBVP}
              valeurAn1={indicateurs.global.pdvAn1?.ticketsBVP}
              valeurSecteur={indicateurs.global.moyenneSecteur.ticketsBVP}
              format="nombre"
            />
          </div>
        </div>

        {/* MODIFICATION 3 : Barres horizontales de pénétration (remplace les cards) */}
        <BarresPenetration indicateurs={indicateurs} />

        {/* Graphique Flux vs Pénétration */}
        <GraphiqueFluxPenetration indicateurs={indicateurs} />

        {/* Section Diagnostic Personnalisé par créneau horaire */}
        <div className="mt-8">
          <h2 className="text-xl font-bold text-[#8B1538] mb-4 flex items-center gap-2">
            <Target className="w-6 h-6" />
            Diagnostic & Plan d'Action
          </h2>

          {/* Nouveau : Diagnostic personnalisé basé sur les 6 tranches horaires */}
          <DiagnosticPersonnalise
            indicateurs={indicateurs}
            panierMoyen={indicateurs.global.pdv.ticketMoyen || 0}
            onNaviguerPlanning={onNaviguerPlanning}
          />
        </div>

        {/* Métadonnées */}
        <div className="text-center text-sm text-gray-400">
          Données extraites en {donnees.metadata?.tempsExtraction || '?'}ms •
          Source : {donnees.metadata?.fichierSource || 'Inconnu'}
        </div>

      </div>
    </div>
  );
};

export default DashboardBenchmark;
