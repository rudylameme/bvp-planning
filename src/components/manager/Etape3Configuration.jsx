/**
 * Étape 3 : Configuration Semaine
 *
 * Permet au manager de paramétrer le cadre de travail :
 * - Jours d'ouverture avec 3 états (Ouvert, Fermé habituel, Fermé exceptionnel)
 * - Redistribution des ventes pour les fermetures exceptionnelles
 * - Regroupement des tranches horaires pour l'affichage équipe
 */

import React, { useState, useMemo } from 'react';
import {
  Settings,
  Calendar,
  Columns,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  AlertTriangle,
  Lightbulb,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { useMagasin } from '../../contexts/MagasinContext';

// ============================================================================
// CONSTANTES
// ============================================================================

const JOURS_SEMAINE = [
  { key: 'lundi', label: 'Lun', labelLong: 'Lundi' },
  { key: 'mardi', label: 'Mar', labelLong: 'Mardi' },
  { key: 'mercredi', label: 'Mer', labelLong: 'Mercredi' },
  { key: 'jeudi', label: 'Jeu', labelLong: 'Jeudi' },
  { key: 'vendredi', label: 'Ven', labelLong: 'Vendredi' },
  { key: 'samedi', label: 'Sam', labelLong: 'Samedi' },
  { key: 'dimanche', label: 'Dim', labelLong: 'Dimanche' },
];

const CRENEAUX = [
  { key: 'matin', label: 'Matin', horaires: '6h-14h' },
  { key: 'apm', label: 'Après-midi', horaires: '14h-20h' },
];

// États possibles pour chaque créneau
const ETATS_CRENEAU = {
  ouvert: {
    key: 'ouvert',
    label: 'Ouvert',
    icon: Check,
    bgColor: 'bg-green-100',
    borderColor: 'border-green-400',
    textColor: 'text-green-700',
    iconColor: 'text-green-600',
  },
  ferme_habituel: {
    key: 'ferme_habituel',
    label: 'Fermé habituel',
    icon: X,
    bgColor: 'bg-gray-200',
    borderColor: 'border-gray-400',
    textColor: 'text-gray-500',
    iconColor: 'text-gray-500',
  },
  ferme_exceptionnel: {
    key: 'ferme_exceptionnel',
    label: 'Fermé exceptionnel',
    icon: AlertTriangle,
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-400',
    textColor: 'text-amber-700',
    iconColor: 'text-amber-600',
  },
};

// Cycle des états au clic
const CYCLE_ETATS = ['ouvert', 'ferme_habituel', 'ferme_exceptionnel'];

const TRANCHES_HORAIRES = [
  { key: 'avant9h', label: 'Avant 9h', heure: '00h-09h' },
  { key: '9h12h', label: '9h-12h', heure: '09h-12h' },
  { key: '12h14h', label: '12h-14h', heure: '12h-14h' },
  { key: '14h16h', label: '14h-16h', heure: '14h-16h' },
  { key: '16h19h', label: '16h-19h', heure: '16h-19h' },
  { key: 'apres19h', label: '+19h', heure: '19h-23h' },
];

const REGROUPEMENTS_OPTIONS = [
  {
    id: 'matin',
    label: 'Regrouper le matin',
    description: 'Avant 9h + 9h-12h → "Matin"',
    tranches: ['avant9h', '9h12h'],
    labelResultat: 'Matin',
  },
  {
    id: 'apresmidi',
    label: 'Regrouper l\'après-midi',
    description: '12h-14h + 14h-16h → "Après-midi"',
    tranches: ['12h14h', '14h16h'],
    labelResultat: 'Après-midi',
  },
  {
    id: 'soir',
    label: 'Regrouper le soir',
    description: '16h-19h + Après 19h → "Soir"',
    tranches: ['16h19h', 'apres19h'],
    labelResultat: 'Soir',
  },
];

// ============================================================================
// Génère l'état initial des créneaux (Lundi matin/apm fermé par défaut)
// ============================================================================
const genererCreneauxInitiaux = () => {
  const creneaux = {};
  JOURS_SEMAINE.forEach((jour) => {
    creneaux[jour.key] = {};
    CRENEAUX.forEach((creneau) => {
      // Par défaut : tout ouvert (l'utilisateur ferme manuellement si besoin)
      creneaux[jour.key][creneau.key] = 'ouvert';
    });
  });
  return creneaux;
};

// ============================================================================
// COMPOSANT : Section Jours d'ouverture avec 3 états
// ============================================================================
const SectionJoursOuverture = ({ creneaux, onChange, redistribution, onRedistributionChange }) => {
  // Cycle l'état d'un créneau au clic
  const cyclerEtat = (jour, creneau) => {
    const etatActuel = creneaux[jour][creneau];
    const indexActuel = CYCLE_ETATS.indexOf(etatActuel);
    const nouvelEtat = CYCLE_ETATS[(indexActuel + 1) % CYCLE_ETATS.length];

    onChange({
      ...creneaux,
      [jour]: {
        ...creneaux[jour],
        [creneau]: nouvelEtat,
      },
    });
  };

  // Compte les fermetures exceptionnelles
  const fermeturesExceptionnelles = useMemo(() => {
    let count = 0;
    Object.values(creneaux).forEach((jour) => {
      Object.values(jour).forEach((etat) => {
        if (etat === 'ferme_exceptionnel') count++;
      });
    });
    return count;
  }, [creneaux]);

  // Compte les créneaux ouverts
  const creneauxOuverts = useMemo(() => {
    let count = 0;
    Object.values(creneaux).forEach((jour) => {
      Object.values(jour).forEach((etat) => {
        if (etat === 'ouvert') count++;
      });
    });
    return count;
  }, [creneaux]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Calendar className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="font-bold text-gray-800">Jours et créneaux d'ouverture</h3>
          <p className="text-sm text-gray-500">
            Cliquez sur un créneau pour changer son état
          </p>
        </div>
      </div>

      {/* Légende des états */}
      <div className="flex flex-wrap gap-4 mb-6 p-3 bg-gray-50 rounded-lg">
        {Object.values(ETATS_CRENEAU).map((etat) => {
          const Icon = etat.icon;
          return (
            <div key={etat.key} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded flex items-center justify-center ${etat.bgColor} border ${etat.borderColor}`}>
                <Icon className={`w-4 h-4 ${etat.iconColor}`} />
              </div>
              <span className="text-sm text-gray-600">{etat.label}</span>
            </div>
          );
        })}
      </div>

      {/* Grille des créneaux */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-2 text-left text-sm font-medium text-gray-500"></th>
              {JOURS_SEMAINE.map((jour) => (
                <th key={jour.key} className="p-2 text-center text-sm font-medium text-gray-700">
                  {jour.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CRENEAUX.map((creneau) => (
              <tr key={creneau.key}>
                <td className="p-2 text-sm text-gray-600 font-medium whitespace-nowrap">
                  {creneau.label}
                  <span className="text-xs text-gray-400 ml-1">({creneau.horaires})</span>
                </td>
                {JOURS_SEMAINE.map((jour) => {
                  const etat = ETATS_CRENEAU[creneaux[jour.key][creneau.key]];
                  const Icon = etat.icon;
                  return (
                    <td key={jour.key} className="p-1 text-center">
                      <button
                        onClick={() => cyclerEtat(jour.key, creneau.key)}
                        className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all hover:scale-105 ${etat.bgColor} border-2 ${etat.borderColor}`}
                        title={`${jour.labelLong} ${creneau.label} : ${etat.label}`}
                      >
                        <Icon className={`w-5 h-5 ${etat.iconColor}`} />
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Résumé */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <span className="text-gray-600">
          <span className="font-semibold text-green-600">{creneauxOuverts}</span> créneaux ouverts
        </span>
        {fermeturesExceptionnelles > 0 && (
          <span className="text-amber-600">
            <span className="font-semibold">{fermeturesExceptionnelles}</span> fermeture{fermeturesExceptionnelles > 1 ? 's' : ''} exceptionnelle{fermeturesExceptionnelles > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Panneau de redistribution si fermetures exceptionnelles */}
      {fermeturesExceptionnelles > 0 && (
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw className="w-5 h-5 text-amber-600" />
            <h4 className="font-semibold text-amber-800">Redistribution des ventes</h4>
          </div>
          <p className="text-sm text-amber-700 mb-4">
            Comment redistribuer les ventes des créneaux exceptionnellement fermés ?
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4 border border-amber-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Même jour, autre créneau
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={redistribution.memeJourAutreCreneau}
                  onChange={(e) =>
                    onRedistributionChange({
                      memeJourAutreCreneau: parseInt(e.target.value),
                      jourSuivant: 100 - parseInt(e.target.value),
                    })
                  }
                  className="flex-1 accent-amber-500"
                />
                <span className="w-12 text-right font-bold text-amber-700">
                  {redistribution.memeJourAutreCreneau}%
                </span>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-amber-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jour suivant
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={redistribution.jourSuivant}
                  onChange={(e) =>
                    onRedistributionChange({
                      jourSuivant: parseInt(e.target.value),
                      memeJourAutreCreneau: 100 - parseInt(e.target.value),
                    })
                  }
                  className="flex-1 accent-amber-500"
                />
                <span className="w-12 text-right font-bold text-amber-700">
                  {redistribution.jourSuivant}%
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-start gap-2 text-xs text-amber-600">
            <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Par défaut : 75% reporté sur l'autre créneau du même jour, 25% sur le jour suivant.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// COMPOSANT : Section Regroupement Colonnes
// ============================================================================
const SectionRegroupement = ({ regroupements, onChange }) => {
  const toggleRegroupement = (id) => {
    onChange({
      ...regroupements,
      [id]: !regroupements[id],
    });
  };

  // Calculer l'aperçu des colonnes
  const getColonnesApercu = () => {
    const colonnes = [];
    let i = 0;

    while (i < TRANCHES_HORAIRES.length) {
      const tranche = TRANCHES_HORAIRES[i];

      // Vérifier si cette tranche fait partie d'un regroupement actif
      const regroupementActif = REGROUPEMENTS_OPTIONS.find(
        r => regroupements[r.id] && r.tranches[0] === tranche.key
      );

      if (regroupementActif) {
        colonnes.push({
          label: regroupementActif.labelResultat,
          isGroupe: true,
        });
        i += regroupementActif.tranches.length;
      } else {
        colonnes.push({
          label: tranche.label,
          isGroupe: false,
        });
        i++;
      }
    }

    return colonnes;
  };

  const colonnesApercu = getColonnesApercu();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Columns className="w-5 h-5 text-purple-600" />
        </div>
        <h3 className="font-bold text-gray-800">Regroupement des tranches horaires</h3>
      </div>

      {/* Tranches de base */}
      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-2">Tranches de base (calcul toujours sur 6) :</p>
        <div className="flex gap-1">
          {TRANCHES_HORAIRES.map((tranche) => (
            <div
              key={tranche.key}
              className="flex-1 text-center py-2 px-1 bg-gray-100 border border-gray-200 rounded text-xs font-medium text-gray-600"
            >
              {tranche.label}
            </div>
          ))}
        </div>
      </div>

      {/* Options de regroupement */}
      <div className="space-y-3 mb-6">
        <p className="text-sm text-gray-600">Regrouper pour l'affichage équipe :</p>
        {REGROUPEMENTS_OPTIONS.map((option) => (
          <label
            key={option.id}
            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
              regroupements[option.id]
                ? 'bg-purple-50 border-2 border-purple-300'
                : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
            }`}
          >
            <input
              type="checkbox"
              checked={regroupements[option.id] || false}
              onChange={() => toggleRegroupement(option.id)}
              className="w-5 h-5 text-purple-600 rounded"
            />
            <div>
              <p className="font-medium text-gray-800">{option.label}</p>
              <p className="text-sm text-gray-500">{option.description}</p>
            </div>
          </label>
        ))}
      </div>

      {/* Aperçu */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Eye className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">Aperçu affichage équipe</span>
        </div>
        <div className="flex gap-1">
          {colonnesApercu.map((col, idx) => (
            <div
              key={idx}
              className={`flex-1 text-center py-2 px-1 rounded text-xs font-medium ${
                col.isGroupe
                  ? 'bg-purple-200 text-purple-800 border-2 border-purple-300'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {col.label}
            </div>
          ))}
        </div>
      </div>

      {/* Note explicative */}
      <div className="flex items-start gap-2 mt-4 text-sm text-gray-500">
        <Lightbulb className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
        <p>
          Le calcul de répartition reste sur 6 tranches. L'affichage additionne les valeurs des colonnes regroupées.
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// COMPOSANT PRINCIPAL : Etape3Configuration
// ============================================================================
const Etape3Configuration = () => {
  const { semaineSelectionnee, joursOuverture, setJoursOuverture } = useMagasin();

  // États de configuration
  const [creneaux, setCreneaux] = useState(() => joursOuverture?.creneaux || genererCreneauxInitiaux());
  const [redistribution, setRedistribution] = useState(() => joursOuverture?.redistribution || {
    memeJourAutreCreneau: 75,
    jourSuivant: 25,
  });
  const [regroupements, setRegroupements] = useState(() => joursOuverture?.regroupements || {
    matin: false,
    apresmidi: false,
    soir: false,
  });

  // Synchroniser vers le contexte à chaque changement
  React.useEffect(() => {
    setJoursOuverture({ creneaux, redistribution, regroupements });
  }, [creneaux, redistribution, regroupements, setJoursOuverture]);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <Settings className="w-8 h-8 text-[#8B1538]" />
          Configuration Semaine
        </h2>
        <p className="text-gray-600 mt-1">
          Paramétrez le cadre de travail pour la semaine
          {semaineSelectionnee && (
            <span className="text-[#8B1538] font-medium">
              {' '}S{semaineSelectionnee.semaine}/{semaineSelectionnee.annee}
            </span>
          )}
        </p>
      </div>

      {/* Sections */}
      <SectionJoursOuverture
        creneaux={creneaux}
        onChange={setCreneaux}
        redistribution={redistribution}
        onRedistributionChange={setRedistribution}
      />

      <SectionRegroupement
        regroupements={regroupements}
        onChange={setRegroupements}
      />

    </div>
  );
};

export default Etape3Configuration;
