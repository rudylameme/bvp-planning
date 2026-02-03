/**
 * GraphiqueFlux - Graphique de pénétration par créneau horaire
 *
 * Affiche des barres horizontales pour chaque créneau :
 * - Pénétration du magasin
 * - Comparaison avec le secteur
 * - Couleur selon la performance (vert/orange/rouge)
 */

import React from 'react';
import { Users, AlertTriangle } from 'lucide-react';

const GraphiqueFlux = ({ donnees, onSelectCreneau, creneauSelectionne }) => {
  if (!donnees || donnees.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Aucune donnée de flux disponible
      </div>
    );
  }

  // Trouver la pénétration max pour l'échelle
  const maxPenetration = Math.max(
    ...donnees.map(d => Math.max(d.penetration, d.penetrationSecteur)),
    30 // minimum pour l'échelle
  );

  // Couleur selon le statut
  const getCouleurBarre = (statut) => {
    switch (statut) {
      case 'bon':
        return 'bg-green-500';
      case 'neutre':
        return 'bg-amber-500';
      case 'alerte':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getCouleurTexte = (statut) => {
    switch (statut) {
      case 'bon':
        return 'text-green-700';
      case 'neutre':
        return 'text-amber-700';
      case 'alerte':
        return 'text-red-700';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-4">
      {/* Légende */}
      <div className="flex items-center justify-end gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 bg-mousquetaires-rouge rounded"></div>
          <span className="text-gray-600">Votre magasin</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 bg-gray-300 rounded"></div>
          <span className="text-gray-600">Moyenne secteur</span>
        </div>
      </div>

      {/* Barres */}
      <div className="space-y-3">
        {donnees.map((creneau) => {
          const largeurPdv = (creneau.penetration / maxPenetration) * 100;
          const largeurSecteur = (creneau.penetrationSecteur / maxPenetration) * 100;
          const isSelected = creneauSelectionne === creneau.creneau;

          return (
            <div
              key={creneau.creneau}
              onClick={() => onSelectCreneau && onSelectCreneau(creneau)}
              className={`p-4 rounded-xl transition-all cursor-pointer ${
                isSelected
                  ? 'bg-mousquetaires-beige-dark ring-2 ring-mousquetaires-rouge'
                  : 'bg-white hover:bg-gray-50 border border-gray-100'
              }`}
            >
              {/* En-tête du créneau */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800">{creneau.label}</span>
                  {creneau.clientsPerdus > 30 && (
                    <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                      <AlertTriangle className="w-3 h-3" />
                      {creneau.clientsPerdus} perdus
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500">
                    <Users className="w-4 h-4 inline mr-1" />
                    {creneau.ticketsTotal} clients
                  </span>
                  <span className={`font-bold ${getCouleurTexte(creneau.statut)}`}>
                    {creneau.ecart >= 0 ? '+' : ''}{creneau.ecart.toFixed(1)} pts
                  </span>
                </div>
              </div>

              {/* Barres de comparaison */}
              <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                {/* Barre secteur (fond) */}
                <div
                  className="absolute top-0 left-0 h-full bg-gray-300 rounded-lg transition-all duration-500"
                  style={{ width: `${largeurSecteur}%` }}
                >
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-600 font-medium">
                    {creneau.penetrationSecteur.toFixed(1)}%
                  </span>
                </div>

                {/* Barre PDV (premier plan) */}
                <div
                  className={`absolute top-0 left-0 h-full ${getCouleurBarre(creneau.statut)} rounded-lg transition-all duration-500 flex items-center`}
                  style={{ width: `${largeurPdv}%` }}
                >
                  <span className="absolute right-2 text-white text-sm font-bold drop-shadow">
                    {creneau.penetration.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Détails si sélectionné */}
              {isSelected && creneau.cause && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 mb-1">Cause probable</p>
                      <p className="text-gray-800">{creneau.cause}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Action recommandée</p>
                      <p className="text-mousquetaires-rouge font-medium">{creneau.action}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Échelle */}
      <div className="flex justify-between text-xs text-gray-400 px-4">
        <span>0%</span>
        <span>{(maxPenetration / 2).toFixed(0)}%</span>
        <span>{maxPenetration.toFixed(0)}%</span>
      </div>
    </div>
  );
};

export default GraphiqueFlux;
