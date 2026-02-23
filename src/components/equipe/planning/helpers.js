/**
 * Fonctions utilitaires pour le planning du jour
 * Extraites de PlanningJour.jsx - aucune modification de logique
 */

import { JOURS, MAPPING_CRENEAUX_MANAGER } from './constants';

// Mapping inversé des clés créneaux Manager
const MAPPING_CRENEAUX_INVERSE = {};
Object.entries(MAPPING_CRENEAUX_MANAGER).forEach(([mgr, pj]) => { MAPPING_CRENEAUX_INVERSE[pj] = mgr; });

/**
 * Vérifier si un créneau est fermé pour un jour donné (via configuration.creneaux du manager)
 * Mappe les clés PlanningJour → clés Manager pour la vérification
 */
export function isCreneauFerme(configuration, jour, trancheKey) {
  const creneauxJour = configuration?.creneaux?.[jour];
  if (!creneauxJour) return false;

  // Format détaillé (avant9h, 9h12h, etc.)
  const mgrKey = MAPPING_CRENEAUX_INVERSE[trancheKey];
  if (mgrKey && creneauxJour[mgrKey] !== undefined) {
    return creneauxJour[mgrKey] !== 'ouvert';
  }

  // Format regroupé (matin, apm, soir)
  // matin = 00_Autre, 09h_12h
  // apm = 12h_14h, 14h_16h, 16h_19h
  // soir = 19h_23h
  const tranchesMatin = ['00_Autre', '09h_12h'];
  const tranchesApm = ['12h_14h', '14h_16h', '16h_19h'];
  const tranchesSoir = ['19h_23h'];

  if (tranchesMatin.includes(trancheKey)) {
    return creneauxJour.matin !== 'ouvert' && creneauxJour.matin !== undefined;
  }
  if (tranchesApm.includes(trancheKey)) {
    return creneauxJour.apm !== 'ouvert' && creneauxJour.apm !== undefined;
  }
  if (tranchesSoir.includes(trancheKey)) {
    return creneauxJour.soir !== 'ouvert' && creneauxJour.soir !== undefined;
  }

  return false; // Par défaut, créneau ouvert
}

/**
 * Vérifier si le jour est fermé (compatible V4 horaires et V5 creneaux)
 */
export function isJourFerme(configuration, jour) {
  // V4: configuration.horaires
  if (configuration?.horaires?.[jour]?.ferme === true) return true;
  // V5: configuration.creneaux — un jour est fermé si tous ses créneaux sont fermés
  const creneauxJour = configuration?.creneaux?.[jour];
  if (creneauxJour) {
    return Object.values(creneauxJour).every(etat => etat !== 'ouvert');
  }
  return false;
}

/**
 * Obtenir la date du jour sélectionné
 */
export function getDateJour(configuration, jour) {
  if (!configuration?.dateDebut) return jour;

  // Parser la date en heure LOCALE (évite le décalage UTC → veille en France)
  // "2026-03-23" → new Date(2026, 2, 23) au lieu de new Date("2026-03-23") qui est UTC minuit
  const parts = String(configuration.dateDebut).split('-');
  let dateDebut = parts.length === 3
    ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
    : new Date(configuration.dateDebut);

  // Correction rétrocompatibilité : si dateDebut tombe un dimanche,
  // c'est un ancien fichier affecté par le bug UTC → avancer de 1 jour (→ lundi)
  if (dateDebut.getDay() === 0) {
    dateDebut.setDate(dateDebut.getDate() + 1);
  }

  const indexJour = JOURS.indexOf(jour);
  const date = new Date(dateDebut);
  date.setDate(date.getDate() + indexJour);

  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}
