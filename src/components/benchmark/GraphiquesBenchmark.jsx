/**
 * Graphiques Benchmark - Comparaisons visuelles par tranche horaire
 *
 * Composants :
 * - GraphiqueFluxPenetration : Analyse Flux Client -> Achat BVP par tranche horaire
 * - BarresPenetration : Barres horizontales de pénétration avec comparaison secteur
 */

import React from 'react';
import {
  Target
} from 'lucide-react';

// Composant Graphique Flux vs Pénétration - Version avec 6 tranches horaires
const GraphiqueFluxPenetration = ({ indicateurs, multiplier = 52, periodLabel = 'semaine' }) => {
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
                  <div className="text-xs text-[#58595B]">/{periodLabel}</div>
                </div>
                <div>
                  <div className="text-xs text-[#58595B] uppercase">Achètent BVP</div>
                  <div className="text-xl font-bold text-[#8B1538]">{tranche.ticketsBVP.toLocaleString('fr-FR')}</div>
                  <div className="text-xs text-[#58595B]">/{periodLabel}</div>
                </div>
                <div>
                  <div className="text-xs text-[#58595B] uppercase">N'achètent pas</div>
                  <div className="text-xl font-bold text-gray-400">{tranche.clientsPerdus.toLocaleString('fr-FR')}</div>
                  <div className="text-xs text-[#58595B]">/{periodLabel}</div>
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
        const caActuelPeriode = indicateurs.global.pdv.caBVP || 0;
        const progressionPourcent = caActuelPeriode > 0 ? (totalCaPerdu / caActuelPeriode) * 100 : 0;
        const caAnnuelPotentiel = totalCaPerdu * multiplier;

        return (
          <div className="mt-6 bg-gradient-to-r from-[#ED1C24] to-[#8B1538] rounded-xl p-5 text-white">
            <div className="text-sm text-white/80 mb-3">
              Potentiel si toutes les tranches atteignent {(penetrationMax * 100).toFixed(1)}% :
            </div>
            <div className="flex items-center justify-around flex-wrap gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold">+{totalTicketsManques}</div>
                <div className="text-sm text-white/70">tickets / {periodLabel}</div>
              </div>
              <div className="text-4xl font-light text-white/50">=</div>
              <div className="text-center">
                <div className="text-3xl font-bold">+{totalCaPerdu.toLocaleString('fr-FR')} €</div>
                <div className="text-sm text-white/70">CA / {periodLabel}</div>
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
              <div className="text-xs text-white/50 mt-1">basé sur {periodLabel === 'mois' ? 'ce mois' : 'cette semaine'} × {multiplier}</div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};


// MODIFICATION 3 : Barres horizontales pénétration par tranche horaire (6 tranches) avec comparaison secteur
const BarresPenetration = ({ indicateurs, periodLabel = 'semaine' }) => {
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

export { GraphiqueFluxPenetration, BarresPenetration };
