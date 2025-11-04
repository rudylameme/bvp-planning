/**
 * Utilitaires pour la manipulation des dates
 */

/**
 * Détermine le jour de la semaine depuis une date
 * @param {string|number} dateStr - Date sous forme de string ou nombre Excel
 * @returns {string|null} Le jour de la semaine en français (lundi, mardi, etc.) ou null si invalide
 */
export const getJourSemaine = (dateStr) => {
  // Essayer de parser la date (formats possibles: "DD/MM/YYYY", "YYYY-MM-DD", nombre Excel, etc.)
  let date;

  // Si c'est un nombre (format Excel)
  const numValue = Number(dateStr);
  if (Number.isFinite(numValue)) {
    const excelEpoch = new Date(1899, 11, 30);
    date = new Date(excelEpoch.getTime() + numValue * 86400000);
  } else {
    // Essayer de parser comme string
    const dateStrTrimmed = dateStr.toString().trim();

    // Vérifier si c'est du format DD/MM/YYYY
    const ddmmyyyyMatch = dateStrTrimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyyMatch) {
      // Extraire jour, mois, année
      const jour = parseInt(ddmmyyyyMatch[1], 10);
      const mois = parseInt(ddmmyyyyMatch[2], 10);
      const annee = parseInt(ddmmyyyyMatch[3], 10);

      // Créer la date (mois - 1 car JavaScript commence à 0)
      date = new Date(annee, mois - 1, jour);
    } else {
      // Essayer le parser par défaut (YYYY-MM-DD, etc.)
      date = new Date(dateStrTrimmed);
    }
  }

  if (!Number.isFinite(date.getTime())) {
    return null; // Date invalide
  }

  const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  return jours[date.getDay()];
};

/**
 * Obtenir les dates de la semaine prochaine (lundi à dimanche)
 * @returns {{start: string, end: string}} Dates formatées en français
 */
export const getNextWeekDates = () => {
  const today = new Date();
  const currentDay = today.getDay();
  let daysUntilNextMonday = currentDay === 0 ? 1 : 8 - currentDay;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilNextMonday);
  const nextSunday = new Date(nextMonday);
  nextSunday.setDate(nextMonday.getDate() + 6);

  return {
    start: nextMonday.toLocaleDateString('fr-FR'),
    end: nextSunday.toLocaleDateString('fr-FR')
  };
};
