/**
 * TopFlopProduits.jsx
 *
 * Bloc 6 : Potentiel chiffre global (effet wow)
 * Bloc 7 : Diagnostic & Plan d'action
 *
 * Extrait de Etape1Diagnostic.jsx - aucune modification de logique.
 */

import React from 'react';
import {
  AlertTriangle,
  Target,
  Clock,
  CheckCircle,
  Lightbulb,
  Trophy,
} from 'lucide-react';

// ============================================================================
// BLOC 6 : POTENTIEL CHIFFRE GLOBAL (EFFET WOW)
// Question : "Combien je pourrais gagner ?"
// ============================================================================
const Bloc6Potentiel = ({ indicateurs, panierMoyen, caBVPActuel }) => {
  const parTrancheHoraire = indicateurs.parTrancheHoraire;
  if (!parTrancheHoraire) return null;

  // Trouver la meilleure penetration (seuil 10% tickets minimum)
  const totalTicketsBloc6 = Object.values(parTrancheHoraire).reduce((sum, d) => sum + (d.ticketsTotal || 0), 0);
  const seuil10pctBloc6 = totalTicketsBloc6 * 0.10;
  let meilleurePenetration = 0;
  Object.values(parTrancheHoraire).forEach(data => {
    if ((data.ticketsTotal || 0) >= seuil10pctBloc6 && data.penetration > meilleurePenetration) {
      meilleurePenetration = data.penetration;
    }
  });

  // Calculer le potentiel total
  let ticketsPotentiels = 0;
  let ticketsActuels = 0;

  Object.values(parTrancheHoraire).forEach(data => {
    if (data.ticketsTotal > 0) {
      ticketsActuels += data.ticketsBVP;
      ticketsPotentiels += Math.round(data.ticketsTotal * meilleurePenetration);
    }
  });

  const gainTickets = ticketsPotentiels - ticketsActuels;
  const gainCA = gainTickets * panierMoyen;
  const gainPourcent = caBVPActuel > 0 ? (gainCA / caBVPActuel) * 100 : 0;
  const projectionAnnuelle = gainCA * 52;

  if (gainTickets <= 0) return null;

  return (
    <div className="bg-gradient-to-br from-[#8B1538] to-[#5B0D24] rounded-2xl shadow-xl p-6 text-white">
      <div className="text-center mb-6">
        <p className="text-white/70 text-sm mb-2">
          Potentiel si toutes les tranches atteignent {(meilleurePenetration * 100).toFixed(1)}% :
        </p>

        <div className="flex items-center justify-center gap-6 flex-wrap">
          <div className="bg-white/10 rounded-xl px-6 py-4">
            <div className="text-3xl font-black text-[#22C55E]">+{gainTickets}</div>
            <div className="text-xs text-white/70">tickets / semaine</div>
          </div>
          <div className="text-2xl text-white/50">=</div>
          <div className="bg-white/10 rounded-xl px-6 py-4">
            <div className="text-3xl font-black text-[#22C55E]">+{gainCA.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</div>
            <div className="text-xs text-white/70">CA / semaine</div>
          </div>
          <div className="text-2xl text-white/50">=</div>
          <div className="bg-white/10 rounded-xl px-6 py-4">
            <div className="text-3xl font-black text-[#22C55E]">+{gainPourcent.toFixed(1)}%</div>
            <div className="text-xs text-white/70">de CA BVP</div>
          </div>
        </div>
      </div>

      {/* Projection annuelle - EFFET WOW */}
      <div className="bg-white/20 rounded-xl p-6 text-center">
        <div className="text-sm text-white/70 mb-2 uppercase tracking-wide">🎯 Projection annuelle</div>
        <div className="text-5xl font-black text-yellow-300 mb-1">
          +{projectionAnnuelle.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €/an
        </div>
        <div className="text-xs text-white/60">basé sur cette semaine × 52</div>
      </div>
    </div>
  );
};

// ============================================================================
// BLOC 7 : DIAGNOSTIC & PLAN D'ACTION
// Question : "Que dois-je faire concretement ?"
// ============================================================================
const Bloc7Action = ({ indicateurs, panierMoyen }) => {
  const parTrancheHoraire = indicateurs.parTrancheHoraire;
  if (!parTrancheHoraire) return null;

  // Recuperer toutes les tranches avec donnees
  const tranches = Object.entries(parTrancheHoraire)
    .filter(([_, data]) => data.ticketsTotal > 0)
    .map(([key, data]) => ({ key, ...data }));

  if (tranches.length === 0) return null;

  // Trouver la tranche REFERENCE (meilleure penetration)
  const trancheReference = tranches.reduce((best, t) =>
    t.penetration > (best?.penetration || 0) ? t : best, null
  );

  // Trier les autres tranches par clients perdus (hors reference)
  const autresTranchesTriees = tranches
    .filter(t => t.key !== trancheReference?.key)
    .sort((a, b) => b.clientsPerdus - a.clientsPerdus);

  // Tranche prioritaire = celle avec le plus de clients perdus (hors reference)
  const tranchePrioritaire = autresTranchesTriees[0];
  // Autres tranches a surveiller (exclure reference ET priorite)
  const autresTranches = autresTranchesTriees.slice(1, 4);

  const tauxConversion = 0.10;
  const clientsRecuperables = Math.round(tranchePrioritaire.clientsPerdus * tauxConversion);
  const caRecuperableAnnuel = clientsRecuperables * panierMoyen * 52;

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="bg-[#22C55E]/10 px-6 py-4 border-b border-[#22C55E]/20">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-[#22C55E]" />
          <h3 className="font-bold text-gray-800">Passez à l'action</h3>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Note explicative : tranche de reference */}
        {trancheReference && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-blue-800">
              <Trophy className="w-5 h-5 text-blue-600" />
              <span className="font-semibold">
                Votre référence : <strong>{trancheReference.label}</strong> ({(trancheReference.penetration * 100).toFixed(1)}% de pénétration)
              </span>
            </div>
            <p className="text-sm text-blue-600 mt-1">
              C'est votre meilleur créneau. L'objectif est d'atteindre ce taux sur les autres tranches horaires.
            </p>
          </div>
        )}

        {/* Priorite */}
        {tranchePrioritaire && (
          <>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5 text-[#8B1538]" />
                <span className="font-bold text-[#8B1538]">PRIORITÉ : {tranchePrioritaire.label}</span>
              </div>

              <p className="text-gray-600 mb-4">
                <strong className="text-[#EF4444]">{tranchePrioritaire.clientsPerdus.toLocaleString('fr-FR')} clients</strong> passent sans acheter BVP chaque semaine
              </p>

              <div className="bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-xl p-4">
                <div className="text-sm text-gray-600 mb-2">Objectif réaliste : convertir 10%</div>
                <div className="flex items-center gap-6">
                  <div className="text-[#22C55E] font-bold text-lg">+{clientsRecuperables} clients/semaine</div>
                  <div className="text-2xl text-gray-300">=</div>
                  <div className="text-[#22C55E] font-bold text-xl">+{caRecuperableAnnuel.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €/an</div>
                </div>
              </div>
            </div>

            {/* Explication + Recommandation */}
            <div className="bg-gray-50 rounded-xl p-4 border-l-4 border-[#8B1538]">
              <div className="flex items-start gap-4">
                <Clock className="w-6 h-6 text-[#8B1538] flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">Pourquoi ces clients n'achètent pas {tranchePrioritaire.label.toLowerCase()} ?</h4>
                  <p className="text-gray-600 mb-3">{tranchePrioritaire.cause}</p>

                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Lightbulb className="w-4 h-4 text-[#8B1538]" />
                      <span className="font-semibold text-[#8B1538]">Recommandation</span>
                    </div>
                    <p className="font-bold text-gray-800">{tranchePrioritaire.action}</p>
                    {tranchePrioritaire.horaireCuisson && (
                      <p className="text-sm text-gray-500 mt-1">
                        Planifiez une cuisson pour avoir des produits frais à {tranchePrioritaire.horaireCuisson}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Autres tranches a surveiller (hors reference et priorite) */}
            {autresTranches.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <span className="font-semibold text-amber-800">Autres tranches horaires à surveiller</span>
                </div>
                <div className="space-y-1">
                  {autresTranches.map(t => (
                    <div key={t.key} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{t.label}</span>
                      <span className="text-[#EF4444] font-bold">{t.clientsPerdus.toLocaleString('fr-FR')} clients sans achat BVP</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </>
        )}
      </div>
    </div>
  );
};

export { Bloc6Potentiel, Bloc7Action };
