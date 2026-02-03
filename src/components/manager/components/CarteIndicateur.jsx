/**
 * CarteIndicateur - Composant de carte KPI réutilisable
 *
 * Affiche un indicateur avec :
 * - Valeur principale
 * - Comparaison vs moyenne secteur
 * - Couleur selon l'écart (vert/orange/rouge)
 */

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const CarteIndicateur = ({
  titre,
  valeur,
  unite = '',
  moyenne,
  ecart,
  ecartLabel = 'vs secteur',
  isPoints = false, // true si l'écart est en points (pénétration), false si en %
  icon: Icon,
  precision = 0,
}) => {
  // Déterminer le statut basé sur l'écart
  const getStatut = () => {
    const seuil = isPoints ? 2 : 5;
    if (ecart >= seuil) return 'bon';
    if (ecart >= -seuil) return 'neutre';
    return 'alerte';
  };

  const statut = getStatut();

  // Couleurs selon le statut
  const couleurs = {
    bon: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      icon: 'text-green-600',
      badge: 'bg-green-100 text-green-800',
    },
    neutre: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-700',
      icon: 'text-gray-500',
      badge: 'bg-gray-100 text-gray-700',
    },
    alerte: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      icon: 'text-red-600',
      badge: 'bg-red-100 text-red-800',
    },
  };

  const c = couleurs[statut];

  // Formater la valeur
  const formatValeur = (val) => {
    if (val >= 1000) {
      return (val / 1000).toFixed(1).replace('.', ',') + ' k';
    }
    return val.toFixed(precision).replace('.', ',');
  };

  // Formater l'écart
  const formatEcart = () => {
    const signe = ecart >= 0 ? '+' : '';
    if (isPoints) {
      return `${signe}${ecart.toFixed(1).replace('.', ',')} pts`;
    }
    return `${signe}${ecart.toFixed(0)}%`;
  };

  // Icône de tendance
  const TrendIcon = ecart > 0 ? TrendingUp : ecart < 0 ? TrendingDown : Minus;

  return (
    <div className={`${c.bg} border ${c.border} rounded-xl p-5 transition-all hover:shadow-md`}>
      {/* En-tête avec icône et titre */}
      <div className="flex items-center gap-3 mb-4">
        {Icon && (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.badge}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
        <h3 className="font-semibold text-gray-800">{titre}</h3>
      </div>

      {/* Valeur principale */}
      <div className="mb-3">
        <span className="text-3xl font-bold text-gray-900">
          {formatValeur(valeur)}
        </span>
        {unite && <span className="text-lg text-gray-600 ml-1">{unite}</span>}
      </div>

      {/* Comparaison avec la moyenne */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          <span className="text-gray-500">Moy. secteur :</span>{' '}
          <span className="font-medium">{formatValeur(moyenne)}{unite}</span>
        </div>

        {/* Badge écart */}
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${c.badge}`}>
          <TrendIcon className={`w-4 h-4 ${c.icon}`} />
          <span className="text-sm font-semibold">{formatEcart()}</span>
        </div>
      </div>

      {/* Label de comparaison */}
      <p className="text-xs text-gray-500 mt-2 text-right">{ecartLabel}</p>
    </div>
  );
};

export default CarteIndicateur;
