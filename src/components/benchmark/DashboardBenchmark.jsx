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

import React from 'react';
import {
  ArrowLeft,
  TrendingUp,
  Store,
  ShoppingCart,
  Ticket,
  Target,
  RefreshCw,
  Home
} from 'lucide-react';

import { DiagnosticPersonnalise, CarteIndicateurV2 } from './KPIsBenchmark';
import { GraphiqueFluxPenetration, BarresPenetration } from './GraphiquesBenchmark';
import { TableauClassement } from './TableauComparatif';

// Composant principal Dashboard
const DashboardBenchmark = ({ donnees, onRetour, onNaviguerPlanning, onRetourAccueil }) => {
  if (!donnees) return null;

  const { magasin, comparaison, indicateurs } = donnees;

  // Période : mois ou semaine
  const typePeriode = donnees.metadata?.typePeriode || 'semaine';
  const multiplier = typePeriode === 'mois' ? 12 : 52;
  const periodLabel = typePeriode === 'mois' ? 'mois' : 'semaine';

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
                📊 Benchmark {typePeriode === 'mois' ? 'Mensuel' : 'Hebdo'} BVP
              </h1>
              <p className="text-sm text-[#58595B]">
                {donnees.periodeLabel || (typePeriode === 'mois' ? 'Mois en cours' : `Semaine ${donnees.semaine}`)}
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
        <BarresPenetration indicateurs={indicateurs} periodLabel={periodLabel} />

        {/* Graphique Flux vs Pénétration */}
        <GraphiqueFluxPenetration indicateurs={indicateurs} multiplier={multiplier} periodLabel={periodLabel} />

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
            multiplier={multiplier}
            periodLabel={periodLabel}
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
