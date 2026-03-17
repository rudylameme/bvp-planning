/**
 * KPIs Benchmark - Cartes indicateurs et diagnostic personnalisé
 *
 * Composants :
 * - CarteIndicateurV2 : Carte KPI avec comparaisons multiples (S-1, An-1, Secteur)
 * - CarteIndicateur : Carte KPI legacy (gardée pour compatibilité)
 * - DiagnosticPersonnalise : Diagnostic par tranche horaire avec recommandations
 */

import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  ArrowRight,
  AlertTriangle,
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

const DiagnosticPersonnalise = ({ indicateurs, panierMoyen, onNaviguerPlanning, multiplier = 52, periodLabel = 'semaine' }) => {
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
  const caRecuperablePeriode = clientsRecuperables * panierMoyen;
  const caRecuperableAnnuel = caRecuperablePeriode * multiplier;

  // Total toutes tranches pour contexte
  const totalClientsPerdus = tranchesAvecDonnees.reduce((acc, t) => acc + t.clientsPerdus, 0);
  const totalClientsRecuperables = Math.round(totalClientsPerdus * tauxConversionCible);
  const totalCaAnnuel = totalClientsRecuperables * panierMoyen * multiplier;

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
            sans acheter en BVP {periodLabel === 'mois' ? 'chaque mois' : 'chaque semaine'}
          </div>
        </div>

        {/* Potentiel financier */}
        <div className="bg-white/10 px-6 py-4">
          <div className="flex items-center justify-center gap-8 flex-wrap">
            <div className="text-center">
              <div className="text-sm text-white/60 mb-1">Si conversion de 10%</div>
              <div className="text-2xl font-bold text-yellow-300">+{clientsRecuperables}</div>
              <div className="text-xs text-white/50">clients/{periodLabel}</div>
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
                ({totalClientsRecuperables} clients/{periodLabel} × {panierMoyen.toFixed(2)}€ × {multiplier})
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

export { DiagnosticPersonnalise, CarteIndicateurV2, CarteIndicateur };
