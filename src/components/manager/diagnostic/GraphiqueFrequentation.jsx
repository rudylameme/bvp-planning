/**
 * GraphiqueFrequentation.jsx
 *
 * Bloc 4 : Barres de penetration par tranche horaire
 * Bloc 5 : Analyse flux client detaillee
 *
 * Extrait de Etape1Diagnostic.jsx - aucune modification de logique.
 */

import React from 'react';
import {
  Target,
  Users,
} from 'lucide-react';

// ============================================================================
// BLOC 4 : BARRES DE PENETRATION PAR TRANCHE HORAIRE
// Question : "A quel moment je perds des clients ?"
// ============================================================================
const Bloc4Penetration = ({ indicateurs }) => {
  const tranches = [
    { key: '00_Autre', label: 'Autres horaires', heure: '00h-09h' },
    { key: '09h_12h', label: 'Matin', heure: '9h-12h' },
    { key: '12h_14h', label: 'Midi', heure: '12h-14h' },
    { key: '14h_16h', label: 'Début après-midi', heure: '14h-16h' },
    { key: '16h_19h', label: 'Fin après-midi', heure: '16h-19h' },
    { key: '19h_23h', label: 'Soir', heure: '19h-23h' },
  ];

  const donneesParTranche = indicateurs.parTrancheHoraire || {};
  const moyenneSecteur = indicateurs.moyenneSecteurParTrancheHoraire || {};

  // Trouver la meilleure penetration (seuil 10% tickets minimum)
  const totalTicketsBloc4 = tranches.reduce((sum, t) => sum + (donneesParTranche[t.key]?.ticketsTotal || 0), 0);
  const seuil10pctBloc4 = totalTicketsBloc4 * 0.10;
  let meilleureTrancheKey = null;
  let meilleurePenetration = 0;

  tranches.forEach(t => {
    const data = donneesParTranche[t.key];
    const pen = data?.penetration || 0;
    const tickets = data?.ticketsTotal || 0;
    // Une tranche doit avoir au moins 10% des tickets totaux pour etre eligible
    if (tickets >= seuil10pctBloc4 && pen > meilleurePenetration) {
      meilleurePenetration = pen;
      meilleureTrancheKey = t.key;
    }
  });

  const hasDonnees = tranches.some(t => (donneesParTranche[t.key]?.ticketsTotal || 0) > 0);
  if (!hasDonnees) return null;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center gap-3 mb-2">
        <Target className="w-6 h-6 text-[#8B1538]" />
        <h3 className="font-bold text-gray-800">Taux de pénétration par tranche horaire</h3>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Pourcentage de clients passant en caisse qui achètent en BVP — comparé à la moyenne du groupe
      </p>

      <div className="space-y-4">
        {tranches.map(tranche => {
          const data = donneesParTranche[tranche.key] || {};
          const secteurData = moyenneSecteur[tranche.key] || {};
          const penetration = data.penetration || 0;
          const penetrationSecteur = secteurData.penetration || 0;
          const ticketsTotal = data.ticketsTotal || 0;
          const ticketsBVP = data.ticketsBVP || 0;
          const clientsPerdus = data.clientsPerdus || 0;

          if (ticketsTotal === 0) return null;

          const ecartSecteur = (penetration - penetrationSecteur) * 100;
          const estMeilleurQueSecteur = ecartSecteur >= 0;
          const estMeilleureTranche = tranche.key === meilleureTrancheKey;

          return (
            <div key={tranche.key}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800">{tranche.label}</span>
                  <span className="text-xs text-gray-400">({tranche.heure})</span>
                  {estMeilleureTranche && (
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">⭐ BEST</span>
                  )}
                </div>
                <span className="text-sm text-gray-500">
                  {ticketsBVP.toLocaleString('fr-FR')} / {ticketsTotal.toLocaleString('fr-FR')} clients
                </span>
              </div>

              <div className="relative">
                <div className="h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                  {/* Barre - VERT si meilleur que secteur, ROUGE/BORDEAUX sinon */}
                  <div
                    className={`h-full rounded-lg transition-all duration-500 ${estMeilleurQueSecteur ? 'bg-[#22C55E]' : 'bg-[#EF4444]'}`}
                    style={{ width: `${Math.min(penetration * 200, 100)}%` }}
                  />

                  {/* Ligne secteur - BLEUE */}
                  {penetrationSecteur > 0 && (
                    <div
                      className="absolute top-0 bottom-0 w-1 bg-[#3B82F6] z-10"
                      style={{ left: `${Math.min(penetrationSecteur * 200, 100)}%` }}
                      title={`Secteur : ${(penetrationSecteur * 100).toFixed(1)}%`}
                    />
                  )}

                  <div className="absolute inset-0 flex items-center px-3">
                    <span className="font-bold text-white drop-shadow">
                      {(penetration * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-1 text-xs">
                  <span className="text-gray-500">
                    {clientsPerdus.toLocaleString('fr-FR')} clients sans achat BVP
                  </span>
                  <span className={`font-semibold ${estMeilleurQueSecteur ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                    {estMeilleurQueSecteur ? '+' : ''}{ecartSecteur.toFixed(1)} pt vs secteur ({(penetrationSecteur * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legende */}
      <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#22C55E] rounded" />
          <span className="text-xs text-gray-500">Au-dessus du secteur</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#EF4444] rounded" />
          <span className="text-xs text-gray-500">En-dessous du secteur</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-[#3B82F6]" />
          <span className="text-xs text-gray-500">Moyenne secteur</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// BLOC 5 : ANALYSE FLUX CLIENT DETAILLEE
// Question : "Combien de clients je perds exactement ?"
// Affiche les 6 tranches dans l'ORDRE CHRONOLOGIQUE avec BARRES VISUELLES
// ============================================================================
const Bloc5FluxClient = ({ indicateurs, panierMoyen, meilleurePenetration }) => {
  const parTrancheHoraire = indicateurs.parTrancheHoraire;
  if (!parTrancheHoraire) return null;

  // Definition des tranches dans l'ORDRE CHRONOLOGIQUE de la journee
  const tranchesDefinition = [
    { key: '00_Autre', label: 'Autres horaires (00h-09h)', labelCourt: 'Autres horaires (00h-09h)', ordre: 0 },
    { key: '09h_12h', label: 'Matin (9h-12h)', labelCourt: 'Matin (9h-12h)', ordre: 1 },
    { key: '12h_14h', label: 'Midi (12h-14h)', labelCourt: 'Midi (12h-14h)', ordre: 2 },
    { key: '14h_16h', label: 'Début après-midi (14h-16h)', labelCourt: 'Début après-midi (14h-16h)', ordre: 3 },
    { key: '16h_19h', label: 'Fin après-midi (16h-19h)', labelCourt: 'Fin après-midi (16h-19h)', ordre: 4 },
    { key: '19h_23h', label: 'Soir (19h-23h)', labelCourt: 'Soir (19h-23h)', ordre: 5 },
  ];

  // Mapper les donnees et calculer les valeurs (ORDRE CHRONOLOGIQUE conserve)
  const tranches = tranchesDefinition
    .map(def => {
      const data = parTrancheHoraire[def.key] || {};
      return {
        ...def,
        ...data,
        ticketsTotal: data.ticketsTotal || 0,
        ticketsBVP: data.ticketsBVP || 0,
        clientsPerdus: data.clientsPerdus || 0,
        penetration: data.penetration || 0,
      };
    })
    .filter(t => t.ticketsTotal > 0);

  if (tranches.length === 0) return null;

  // Trouver la meilleure tranche (reference) = meilleur taux de penetration
  // Seuil : une tranche doit avoir au moins 10% des tickets totaux pour etre eligible
  const totalTicketsBloc5 = tranches.reduce((sum, t) => sum + t.ticketsTotal, 0);
  const seuil10pctBloc5 = totalTicketsBloc5 * 0.10;
  const meilleureTrancheKey = tranches
    .filter(t => t.ticketsTotal >= seuil10pctBloc5)
    .reduce((best, t) => t.penetration > (best?.penetration || 0) ? t : best, null
  )?.key;

  // Trouver la pire tranche (priorite) = plus de clients perdus (hors reference)
  const pireTrancheKey = tranches
    .filter(t => t.key !== meilleureTrancheKey)
    .reduce((worst, t) =>
      t.clientsPerdus > (worst?.clientsPerdus || 0) ? t : worst, null
    )?.key;

  // ECHELLE COMMUNE : trouver le max de clients pour normaliser toutes les barres
  const maxClientsTotal = Math.max(...tranches.map(t => t.ticketsTotal));

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center gap-3 mb-2">
        <Users className="w-6 h-6 text-[#8B1538]" />
        <h3 className="font-bold text-gray-800">Analyse Flux Client → Achat BVP</h3>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Combien de clients passent en caisse vs combien achètent en BVP par tranche horaire
      </p>

      {/* Objectif - banniere jaune */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
        <p className="text-yellow-800">
          Votre meilleur taux : <strong className="text-[#8B1538]">{(meilleurePenetration * 100).toFixed(1)}%</strong> — c'est votre objectif pour les autres créneaux
        </p>
      </div>

      {/* Les 6 tranches dans l'ORDRE CHRONOLOGIQUE */}
      <div className="space-y-4">
        {tranches.map((tranche) => {
          const estReference = tranche.key === meilleureTrancheKey;
          const estPriorite = tranche.key === pireTrancheKey;
          const potentiel = Math.round(tranche.ticketsTotal * meilleurePenetration) - tranche.ticketsBVP;
          const caPotentiel = potentiel * panierMoyen;

          // Calcul des pourcentages pour la barre
          const pctAcheteurs = tranche.ticketsTotal > 0 ? (tranche.ticketsBVP / tranche.ticketsTotal) * 100 : 0;
          const pctNonAcheteurs = 100 - pctAcheteurs;
          const pctObjectif = meilleurePenetration * 100;

          return (
            <div key={tranche.key} className={`rounded-xl p-4 ${estReference ? 'bg-green-50 border border-green-200' : estPriorite ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
              {/* En-tete : nom de la tranche + badges + taux */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800">{tranche.labelCourt}</span>
                  {estReference && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">⭐ RÉFÉRENCE</span>
                  )}
                  {estPriorite && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">🔴 PRIORITÉ</span>
                  )}
                </div>
                <span className={`text-xl font-bold ${estReference ? 'text-[#22C55E]' : 'text-[#8B1538]'}`}>
                  {(tranche.penetration * 100).toFixed(1)}%
                </span>
              </div>

              {/* Grille : Clients en caisse / Achetent / Sans achat BVP */}
              <div className="grid grid-cols-3 gap-4 text-center mb-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1 uppercase">Clients en caisse</div>
                  <div className="text-lg font-bold text-gray-800">{tranche.ticketsTotal.toLocaleString('fr-FR')}</div>
                  <div className="text-xs text-gray-400">/semaine</div>
                </div>
                <div>
                  <div className="text-xs text-[#8B1538] mb-1 uppercase">Achètent BVP</div>
                  <div className="text-lg font-bold text-[#8B1538]">{tranche.ticketsBVP.toLocaleString('fr-FR')}</div>
                  <div className="text-xs text-gray-400">/semaine</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1 uppercase">Sans achat BVP</div>
                  <div className="text-lg font-bold text-gray-500">{tranche.clientsPerdus.toLocaleString('fr-FR')}</div>
                  <div className="text-xs text-gray-400">/semaine</div>
                </div>
              </div>

              {/* BARRE VISUELLE V4 : Bordeaux + Vert (potentiel) + Gris - ECHELLE COMMUNE */}
              {(() => {
                // Calcul des 3 parties de la barre
                const clientsObjectif = Math.round(tranche.ticketsTotal * meilleurePenetration);
                const clientsAConquerir = Math.max(0, clientsObjectif - tranche.ticketsBVP);
                const clientsReste = tranche.clientsPerdus - clientsAConquerir;

                // Pourcentages pour la barre - ECHELLE COMMUNE basee sur maxClientsTotal
                const pctBordeaux = (tranche.ticketsBVP / maxClientsTotal) * 100;
                const pctVert = (clientsAConquerir / maxClientsTotal) * 100;
                const pctGris = (Math.max(0, estReference ? tranche.clientsPerdus : clientsReste) / maxClientsTotal) * 100;

                // Largeur totale de la barre (proportionnelle au nombre de clients)
                const largeurTotale = (tranche.ticketsTotal / maxClientsTotal) * 100;

                return (
                  <div className="mb-3">
                    {/* Barre avec 3 parties - ECHELLE COMMUNE */}
                    <div className="h-10 bg-gray-100 rounded-lg overflow-hidden relative">
                      <div className="h-full flex" style={{ width: `${largeurTotale}%` }}>
                        {/* Partie BORDEAUX = achetent actuellement */}
                        <div
                          className="h-full bg-[#8B1538] flex items-center justify-center transition-all duration-500"
                          style={{ width: `${(tranche.ticketsBVP / tranche.ticketsTotal) * 100}%` }}
                        >
                          {(tranche.ticketsBVP / tranche.ticketsTotal) * 100 > 15 && (
                            <span className="text-white text-xs font-bold">{tranche.ticketsBVP.toLocaleString('fr-FR')}</span>
                          )}
                        </div>

                        {/* Partie VERTE = clients a conquerir (potentiel = GAIN) */}
                        {!estReference && clientsAConquerir > 0 && (
                          <div
                            className="h-full bg-[#22C55E] flex items-center justify-center transition-all duration-500"
                            style={{ width: `${(clientsAConquerir / tranche.ticketsTotal) * 100}%` }}
                          >
                            {(clientsAConquerir / tranche.ticketsTotal) * 100 > 8 && (
                              <span className="text-white text-xs font-bold">+{clientsAConquerir.toLocaleString('fr-FR')}</span>
                            )}
                          </div>
                        )}

                        {/* Partie GRISE = reste (n'acheteront pas) */}
                        <div
                          className="h-full bg-[#E5E7EB] flex items-center justify-center transition-all duration-500 flex-1"
                        >
                          {((estReference ? tranche.clientsPerdus : Math.max(0, clientsReste)) / tranche.ticketsTotal) * 100 > 15 && (
                            <span className="text-gray-500 text-xs font-medium">
                              {(estReference ? tranche.clientsPerdus : Math.max(0, clientsReste)).toLocaleString('fr-FR')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Legende sous la barre */}
                    <div className="flex items-center justify-between mt-2 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-[#8B1538] rounded" />
                        <span className="text-gray-600">Achètent</span>
                      </div>
                      {!estReference && clientsAConquerir > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-[#22C55E] rounded" />
                          <span className="text-[#22C55E] font-semibold">À conquérir (+{clientsAConquerir})</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-[#E5E7EB] rounded" />
                        <span className="text-gray-500">Sans achat BVP</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Potentiel CA (sauf pour la reference) */}
              {!estReference && potentiel > 0 && (
                <div className="bg-[#DCFCE7] border border-[#22C55E] rounded-lg p-3 flex items-center justify-between">
                  <span className="text-sm text-[#166534]">Si {(meilleurePenetration * 100).toFixed(1)}% comme la référence :</span>
                  <div className="flex items-center gap-4">
                    <span className="text-[#22C55E] font-bold">+{potentiel} tickets</span>
                    <span className="text-[#22C55E] font-bold text-lg">+{caPotentiel.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} € CA</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legende des barres */}
      <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#8B1538] rounded" />
          <span className="text-xs text-gray-500">Achètent BVP</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#22C55E] rounded" />
          <span className="text-xs text-gray-500">À conquérir (objectif {(meilleurePenetration * 100).toFixed(1)}%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#E5E7EB] rounded" />
          <span className="text-xs text-gray-500">Sans achat BVP</span>
        </div>
      </div>
    </div>
  );
};

export { Bloc4Penetration, Bloc5FluxClient };
