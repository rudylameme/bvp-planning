/**
 * Utilitaires pour calculs de dates de semaines
 */

/**
 * Calcule les dates de la semaine ISO
 * @param {number} weekNumber - Numéro de semaine (1-53)
 * @param {number} year - Année
 * @returns {Object} Dates du lundi au dimanche
 */
export function calculateWeekDates(weekNumber, year) {
  // Trouver le premier jeudi de l'année (définition ISO 8601)
  const january4th = new Date(year, 0, 4);
  const firstThursday = new Date(january4th);
  firstThursday.setDate(january4th.getDate() - ((january4th.getDay() + 6) % 7) + 3);

  // Calculer le lundi de la semaine demandée
  const weekStart = new Date(firstThursday);
  weekStart.setDate(firstThursday.getDate() - 3 + (weekNumber - 1) * 7);

  // Générer les 7 jours
  const jours = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
  const dates = {};

  jours.forEach((jour, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    dates[jour] = formatDate(date);
  });

  return dates;
}

/**
 * Obtient le numéro de semaine ISO d'une date
 * @param {Date} date
 * @returns {number}
 */
export function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Obtient l'année ISO d'une date
 * @param {Date} date
 * @returns {number}
 */
export function getWeekYear(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  return d.getUTCFullYear();
}

/**
 * Formate une date en DD/MM/YYYY
 * @param {Date} date
 * @returns {string}
 */
export function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Obtient la semaine courante et l'année
 * @returns {Object} { weekNumber, year }
 */
export function getCurrentWeek() {
  const now = new Date();
  return {
    weekNumber: getWeekNumber(now),
    year: getWeekYear(now)
  };
}

/**
 * Détermine les jours de report pour une fermeture exceptionnelle
 * @param {string} jour - Jour fermé
 * @param {number} index - Index du jour (0-6)
 * @returns {Object} Configuration des reports
 */
export function determinerJoursReport(jour, index) {
  const jours = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

  if (index === 0) { // Lundi
    return {
      jourReport1: 'mardi',
      jourReport2: 'mercredi',
      pourcentageReport1: 75,
      pourcentageReport2: 25
    };
  } else if (index === 6) { // Dimanche
    return {
      jourReport1: 'samedi',
      jourReport2: 'vendredi',
      pourcentageReport1: 75,
      pourcentageReport2: 25
    };
  } else { // Autres jours
    return {
      jourReport1: jours[index - 1],
      jourReport2: jours[index + 1],
      pourcentageReport1: 75,
      pourcentageReport2: 25
    };
  }
}

/**
 * Exporte la configuration en JSON
 * @param {Object} configSemaine
 * @returns {string} JSON stringifié
 */
export function exporterConfiguration(configSemaine) {
  const data = {
    version: '1.0',
    numeroSemaine: configSemaine.numeroSemaine,
    annee: configSemaine.annee,
    fermetureHebdo: configSemaine.fermetureHebdo,
    fermeturesExceptionnelles: configSemaine.fermeturesExceptionnelles
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Importe une configuration depuis JSON
 * @param {string} jsonString
 * @returns {Object} Configuration
 */
export function importerConfiguration(jsonString) {
  try {
    const data = JSON.parse(jsonString);

    // Validation basique
    if (data.version !== '1.0') {
      throw new Error('Version de configuration non supportée');
    }

    if (!data.numeroSemaine || !data.annee) {
      throw new Error('Configuration invalide : semaine ou année manquante');
    }

    return {
      numeroSemaine: data.numeroSemaine,
      annee: data.annee,
      fermetureHebdo: data.fermetureHebdo || '',
      fermeturesExceptionnelles: data.fermeturesExceptionnelles || {}
    };
  } catch (error) {
    console.error('Erreur lors de l\'import de la configuration:', error);
    throw error;
  }
}
