import { getJourSemaine } from '../utils/dateUtils';

/**
 * Service de calcul des potentiels hebdomadaires V2
 */

/**
 * Détecte le nombre de semaines dans les données importées
 * @param {Object} ventesParProduit - Objet { produitId: [{date, quantite}, ...], ... }
 * @returns {number} Nombre de semaines
 */
export function detecterNombreSemaines(ventesParProduit) {
  // Collecter toutes les dates uniques
  const datesUniques = new Set();

  Object.values(ventesParProduit).forEach(ventes => {
    if (Array.isArray(ventes)) {
      ventes.forEach(v => {
        if (v.date) {
          datesUniques.add(v.date);
        }
      });
    }
  });

  if (datesUniques.size === 0) return 1;

  // Trier les dates
  const dates = Array.from(datesUniques).sort();
  const dateDebut = new Date(dates[0]);
  const dateFin = new Date(dates[dates.length - 1]);

  // Calculer le nombre de jours
  const diffJours = Math.ceil((dateFin - dateDebut) / (1000 * 60 * 60 * 24)) + 1;

  // Convertir en semaines (arrondi supérieur, minimum 1)
  const nombreSemaines = Math.max(1, Math.ceil(diffJours / 7));

  return nombreSemaines;
}

/**
 * Calcule les poids de chaque jour de la semaine
 * basé sur la courbe de fréquentation
 * @param {Object} frequentationParJour - { lundi: 100, mardi: 120, ... }
 * @returns {Object} Poids normalisés { lundi: 0.12, mardi: 0.14, ... }
 */
export function calculerPoidsJours(frequentationParJour) {
  const total = Object.values(frequentationParJour || {}).reduce((sum, val) => sum + val, 0);

  if (total === 0) {
    // Poids par défaut si pas de données
    return {
      lundi: 0.12,
      mardi: 0.14,
      mercredi: 0.14,
      jeudi: 0.14,
      vendredi: 0.17,
      samedi: 0.20,
      dimanche: 0.09
    };
  }

  const poids = {};
  Object.entries(frequentationParJour).forEach(([jour, freq]) => {
    poids[jour.toLowerCase()] = freq / total;
  });

  return poids;
}

/**
 * Calcule la moyenne hebdomadaire simple (pour affichage)
 * @param {Array} ventesProduit - [{date, quantite}, ...]
 * @param {number} nombreSemaines - Nombre de semaines
 * @returns {number} Moyenne hebdo arrondie
 */
export function calculerMoyenneHebdo(ventesProduit, nombreSemaines) {
  if (!ventesProduit || ventesProduit.length === 0 || nombreSemaines === 0) {
    return 0;
  }

  const totalVentes = ventesProduit.reduce((sum, v) => sum + (v.quantite || 0), 0);
  return Math.round(totalVentes / nombreSemaines);
}

/**
 * Calcule la tendance (hausse, stable, baisse)
 * Compare les 2 dernières semaines vs les 2 premières
 * @param {Array} ventesProduit - [{date, quantite}, ...]
 * @param {number} nombreSemaines - Nombre de semaines
 * @returns {{tendance: string, pourcentage: number}}
 */
export function calculerTendance(ventesProduit, nombreSemaines) {
  if (nombreSemaines < 4) {
    return { tendance: 'stable', pourcentage: 0 };
  }

  // Grouper par semaine
  const ventesParSemaine = {};
  ventesProduit.forEach(vente => {
    const numeroSemaine = getNumeroSemaineISO(new Date(vente.date));
    if (!ventesParSemaine[numeroSemaine]) {
      ventesParSemaine[numeroSemaine] = 0;
    }
    ventesParSemaine[numeroSemaine] += vente.quantite || 0;
  });

  const semaines = Object.keys(ventesParSemaine).sort((a, b) => a - b);

  if (semaines.length < 4) {
    return { tendance: 'stable', pourcentage: 0 };
  }

  // Moyenne des 2 premières vs 2 dernières
  const debut = (ventesParSemaine[semaines[0]] + ventesParSemaine[semaines[1]]) / 2;
  const fin = (ventesParSemaine[semaines[semaines.length - 2]] + ventesParSemaine[semaines[semaines.length - 1]]) / 2;

  if (debut === 0) {
    return { tendance: 'stable', pourcentage: 0 };
  }

  const pourcentage = Math.round(((fin - debut) / debut) * 100);

  let tendance = 'stable';
  if (pourcentage > 10) tendance = 'croissance';
  if (pourcentage < -10) tendance = 'declin';

  return { tendance, pourcentage };
}

/**
 * Calcule le numéro de semaine ISO
 * @param {Date} date - Date
 * @returns {number} Numéro de semaine
 */
function getNumeroSemaineISO(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Calcule le score de fiabilité (0-100)
 * Plus il y a de semaines et de données, plus c'est fiable
 * @param {number} nombreSemaines - Nombre de semaines
 * @param {number} nombreVentes - Nombre d'enregistrements de ventes
 * @returns {number} Score 0-100
 */
export function calculerFiabilite(nombreSemaines, nombreVentes) {
  let score = 0;

  // Points pour le nombre de semaines (max 50 points)
  if (nombreSemaines >= 8) score += 50;
  else if (nombreSemaines >= 4) score += 35;
  else if (nombreSemaines >= 2) score += 20;
  else score += 10;

  // Points pour le nombre de ventes (max 50 points)
  if (nombreVentes >= 50) score += 50;
  else if (nombreVentes >= 20) score += 35;
  else if (nombreVentes >= 10) score += 20;
  else score += 10;

  return score;
}

/**
 * Calcule le potentiel hebdomadaire d'un produit (méthode multi-semaines)
 * Pour chaque semaine : trouver le jour avec le MAX de ventes, diviser par le poids du jour
 * Puis faire la moyenne de toutes les semaines
 * @param {Array} ventesProduit - [{date, quantite}, ...]
 * @param {Object} poidsJours - { lundi: 0.12, ... }
 * @param {number} nombreSemaines - Nombre de semaines
 * @returns {number} Potentiel hebdo arrondi
 */
export function calculerPotentielHebdoV2(ventesProduit, poidsJours, nombreSemaines) {
  if (!ventesProduit || ventesProduit.length === 0) {
    return 0;
  }

  // Grouper les ventes par numéro de semaine
  const ventesParSemaine = {};

  ventesProduit.forEach(vente => {
    const date = new Date(vente.date);
    const numeroSemaine = getNumeroSemaineISO(date);

    if (!ventesParSemaine[numeroSemaine]) {
      ventesParSemaine[numeroSemaine] = [];
    }
    ventesParSemaine[numeroSemaine].push(vente);
  });

  // Pour chaque semaine, calculer le potentiel
  const potentielsParSemaine = [];

  Object.values(ventesParSemaine).forEach(ventesSemaine => {
    // Trouver le jour avec le max de ventes
    let maxVente = 0;
    let jourMax = 'lundi';

    ventesSemaine.forEach(vente => {
      if (vente.quantite > maxVente) {
        maxVente = vente.quantite;
        jourMax = getJourSemaineFromDate(vente.date);
      }
    });

    // Calculer le potentiel en divisant par le poids du jour
    const poidsJourMax = poidsJours[jourMax] || 0.14;
    const potentielSemaine = maxVente / poidsJourMax;

    if (potentielSemaine > 0) {
      potentielsParSemaine.push(potentielSemaine);
    }
  });

  // Moyenne des potentiels de toutes les semaines
  if (potentielsParSemaine.length === 0) return 0;

  const moyenne = potentielsParSemaine.reduce((sum, p) => sum + p, 0) / potentielsParSemaine.length;

  return Math.round(moyenne);
}

/**
 * Convertit une date en nom de jour
 * @param {string} dateStr - Date au format ISO ou DD/MM/YYYY
 * @returns {string} Nom du jour en minuscule
 */
function getJourSemaineFromDate(dateStr) {
  const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  let date;

  if (dateStr.includes('/')) {
    const [day, month, year] = dateStr.split('/').map(Number);
    date = new Date(year, month - 1, day);
  } else {
    date = new Date(dateStr);
  }

  return jours[date.getDay()];
}

/**
 * Calcule tous les indicateurs pour un produit
 * @param {Array} ventesProduit - [{date, quantite}, ...]
 * @param {Object} poidsJours - { lundi: 0.12, ... }
 * @param {number} nombreSemaines - Nombre de semaines
 * @returns {Object} Indicateurs complets
 */
export function calculerIndicateursProduit(ventesProduit, poidsJours, nombreSemaines) {
  const moyenneHebdo = calculerMoyenneHebdo(ventesProduit, nombreSemaines);
  const potentielHebdo = calculerPotentielHebdoV2(ventesProduit, poidsJours, nombreSemaines);
  const { tendance, pourcentage } = calculerTendance(ventesProduit, nombreSemaines);
  const fiabilite = calculerFiabilite(nombreSemaines, ventesProduit?.length || 0);

  return {
    moyenneHebdo,
    potentielHebdo,
    tendance,
    tendancePourcent: pourcentage,
    fiabilite,
    nombreSemaines
  };
}

/**
 * Obtient le numéro de semaine ISO d'une date
 * @param {string} dateStr - Date au format "DD/MM/YYYY" ou "YYYY-MM-DD"
 * @returns {string} Clé de semaine au format "YYYY-WXX"
 */
const getWeekKey = (dateStr) => {
  let date;

  // Parser la date selon le format
  if (dateStr.includes('/')) {
    // Format DD/MM/YYYY
    const [day, month, year] = dateStr.split('/').map(Number);
    date = new Date(year, month - 1, day);
  } else if (dateStr.includes('-')) {
    // Format YYYY-MM-DD
    date = new Date(dateStr);
  } else {
    return null;
  }

  if (isNaN(date.getTime())) return null;

  // Calcul du numéro de semaine ISO
  const tempDate = new Date(date.valueOf());
  const dayNum = (date.getDay() + 6) % 7; // Lundi = 0
  tempDate.setDate(tempDate.getDate() - dayNum + 3);
  const firstThursday = tempDate.valueOf();
  tempDate.setMonth(0, 1);
  if (tempDate.getDay() !== 4) {
    tempDate.setMonth(0, 1 + ((4 - tempDate.getDay()) + 7) % 7);
  }
  const weekNum = 1 + Math.ceil((firstThursday - tempDate.valueOf()) / 604800000);

  return `${date.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
};

/**
 * Calcule les statistiques multi-semaines pour un produit
 *
 * @param {Object} ventesParJour - Objet { "DD/MM/YYYY": quantite, ... }
 * @returns {Object} Statistiques calculées :
 *   - nombreSemaines: nombre de semaines distinctes avec des ventes
 *   - ventesMaxParSemaine: tableau des ventes max de chaque semaine
 *   - moyenneVentesMax: moyenne des ventes max
 *   - ecartType: écart-type des ventes max (variabilité)
 *   - tendance: 'hausse' | 'baisse' | 'stable'
 *   - coefficientVariation: écart-type / moyenne (en %)
 *   - totalVentes: somme de toutes les ventes
 *   - moyenneHebdo: moyenne des ventes par semaine
 *   - ventesParSemaine: détail des ventes par semaine
 *   - joursDeVente: nombre de jours avec des ventes
 *   - fiabilite: 'haute' | 'moyenne' | 'faible' basée sur la variabilité
 */
export const calculerStatsVentes = (ventesParJour) => {
  if (!ventesParJour || Object.keys(ventesParJour).length === 0) {
    return {
      nombreSemaines: 0,
      ventesMaxParSemaine: [],
      moyenneVentesMax: 0,
      ecartType: 0,
      tendance: 'stable',
      coefficientVariation: 0,
      totalVentes: 0,
      moyenneHebdo: 0,
      ventesParSemaine: {},
      joursDeVente: 0,
      fiabilite: 'faible'
    };
  }

  // Grouper les ventes par semaine
  const ventesParSemaine = {};
  let totalVentes = 0;
  let joursDeVente = 0;

  for (const [date, quantite] of Object.entries(ventesParJour)) {
    const weekKey = getWeekKey(date);
    if (!weekKey) continue;

    if (!ventesParSemaine[weekKey]) {
      ventesParSemaine[weekKey] = {
        dates: [],
        quantites: [],
        total: 0,
        max: 0
      };
    }

    ventesParSemaine[weekKey].dates.push(date);
    ventesParSemaine[weekKey].quantites.push(quantite);
    ventesParSemaine[weekKey].total += quantite;
    ventesParSemaine[weekKey].max = Math.max(ventesParSemaine[weekKey].max, quantite);

    totalVentes += quantite;
    if (quantite > 0) joursDeVente++;
  }

  // Trier les semaines chronologiquement
  const semainesTriees = Object.keys(ventesParSemaine).sort();
  const nombreSemaines = semainesTriees.length;

  if (nombreSemaines === 0) {
    return {
      nombreSemaines: 0,
      ventesMaxParSemaine: [],
      moyenneVentesMax: 0,
      ecartType: 0,
      tendance: 'stable',
      coefficientVariation: 0,
      totalVentes,
      moyenneHebdo: 0,
      ventesParSemaine: {},
      joursDeVente,
      fiabilite: 'faible'
    };
  }

  // Extraire les ventes max de chaque semaine (dans l'ordre chronologique)
  const ventesMaxParSemaine = semainesTriees.map(week => ventesParSemaine[week].max);
  const totauxParSemaine = semainesTriees.map(week => ventesParSemaine[week].total);

  // Calculs statistiques
  const moyenneVentesMax = ventesMaxParSemaine.reduce((a, b) => a + b, 0) / nombreSemaines;
  const moyenneHebdo = totauxParSemaine.reduce((a, b) => a + b, 0) / nombreSemaines;

  // Écart-type
  const variance = ventesMaxParSemaine.reduce((acc, val) => {
    return acc + Math.pow(val - moyenneVentesMax, 2);
  }, 0) / nombreSemaines;
  const ecartType = Math.sqrt(variance);

  // Coefficient de variation (en %)
  const coefficientVariation = moyenneVentesMax > 0
    ? (ecartType / moyenneVentesMax) * 100
    : 0;

  // Calcul de la tendance (régression linéaire simple)
  let tendance = 'stable';
  let variationTendance = 0;
  if (nombreSemaines >= 2) {
    const premieresMoities = totauxParSemaine.slice(0, Math.ceil(nombreSemaines / 2));
    const dernieresMoities = totauxParSemaine.slice(Math.floor(nombreSemaines / 2));

    const moyennePremiere = premieresMoities.reduce((a, b) => a + b, 0) / premieresMoities.length;
    const moyenneDerniere = dernieresMoities.reduce((a, b) => a + b, 0) / dernieresMoities.length;

    variationTendance = moyennePremiere > 0
      ? Math.round(((moyenneDerniere - moyennePremiere) / moyennePremiere) * 100)
      : 0;

    if (variationTendance > 10) tendance = 'croissance';
    else if (variationTendance < -10) tendance = 'declin';
    else tendance = 'stable';
  }

  // Niveau de fiabilité basé sur le coefficient de variation
  let fiabilite;
  if (coefficientVariation < 20) fiabilite = 'haute';
  else if (coefficientVariation < 40) fiabilite = 'moyenne';
  else fiabilite = 'faible';

  // Score de confiance (0-100) basé sur :
  // - Nombre de semaines (plus = mieux)
  // - Variabilité (moins = mieux)
  // - Nombre de jours avec des ventes (plus = mieux)
  const scoreNbSemaines = Math.min(nombreSemaines / 3, 1) * 30; // Max 30 points pour 3+ semaines
  const scoreVariabilite = Math.max(0, (100 - coefficientVariation) / 100) * 40; // Max 40 points si pas de variabilité
  const scoreJours = Math.min(joursDeVente / (nombreSemaines * 7), 1) * 30; // Max 30 points si ventes tous les jours
  const scoreConfiance = Math.round(scoreNbSemaines + scoreVariabilite + scoreJours);

  return {
    nombreSemaines,
    ventesMaxParSemaine,
    moyenneVentesMax: Math.round(moyenneVentesMax * 10) / 10,
    ecartType: Math.round(ecartType * 10) / 10,
    tendance,
    variationTendance,
    variabilite: Math.round(coefficientVariation), // Alias pour coefficientVariation
    coefficientVariation: Math.round(coefficientVariation),
    totalVentes,
    moyenneHebdo: Math.round(moyenneHebdo * 10) / 10,
    ventesParSemaine,
    joursDeVente,
    joursAvecVentes: joursDeVente, // Alias pour compatibilité
    fiabilite,
    scoreConfiance,
    // Détails par semaine pour l'affichage
    detailSemaines: semainesTriees.map(week => ({
      semaine: week,
      total: ventesParSemaine[week].total,
      max: ventesParSemaine[week].max,
      joursVendus: ventesParSemaine[week].quantites.filter(q => q > 0).length
    }))
  };
};

/**
 * Trouve la vente maximale et sa date dans les ventes par jour
 * @param {Object} ventesParJour - Objet avec dates en clés et quantités en valeurs
 * @returns {{venteMax: number, dateVenteMax: string|null}}
 */
export const trouverVenteMax = (ventesParJour) => {
  let venteMax = 0;
  let dateVenteMax = null;

  for (const [date, quantite] of Object.entries(ventesParJour)) {
    if (quantite > venteMax) {
      venteMax = quantite;
      dateVenteMax = date;
    }
  }

  return { venteMax, dateVenteMax };
};

/**
 * Calcule le potentiel hebdomadaire à partir de la vente max
 * Formule : Potentiel = Vente MAX ÷ Poids du jour
 *
 * @param {number} venteMax - Quantité maximale vendue
 * @param {string} dateVenteMax - Date de la vente maximale
 * @param {Object} frequentationData - Données de fréquentation (avec poidsJours)
 * @param {string} libelle - Libellé du produit (pour les logs)
 * @returns {number} Le potentiel hebdomadaire calculé
 */
export const calculerPotentielDepuisVenteMax = (venteMax, dateVenteMax, frequentationData, libelle = '') => {
  if (venteMax === 0) return 0;

  const jourVenteMax = getJourSemaine(dateVenteMax);
  const poidsJour = (jourVenteMax && frequentationData.poidsJours[jourVenteMax])
    ? frequentationData.poidsJours[jourVenteMax]
    : Math.max(...Object.values(frequentationData.poidsJours));

  const potentiel = Math.ceil(venteMax / poidsJour);

  if (libelle) {
    console.log(`  ${libelle}: Vente max=${venteMax} (${jourVenteMax || '?'}) ÷ ${(poidsJour * 100).toFixed(1)}% → Potentiel=${potentiel}`);
  }

  return potentiel;
};

/**
 * Calcule le potentiel en utilisant les stats multi-semaines
 * Utilise la moyenne des ventes max au lieu du max absolu pour plus de stabilité
 *
 * @param {Object} stats - Statistiques calculées par calculerStatsVentes
 * @param {Object} frequentationData - Données de fréquentation
 * @param {string} modeBase - 'max' (max absolu) | 'moyenne' (moyenne des max) | 'prudent' (min des max)
 * @returns {number} Le potentiel hebdomadaire calculé
 */
export const calculerPotentielAvecStats = (stats, frequentationData, modeBase = 'moyenne') => {
  if (!stats || stats.nombreSemaines === 0) return 0;

  // Choisir la valeur de référence selon le mode
  let venteMaxReference;
  if (modeBase === 'max') {
    // Max absolu (comportement actuel)
    venteMaxReference = Math.max(...stats.ventesMaxParSemaine);
  } else if (modeBase === 'prudent') {
    // Min des max (très conservateur)
    venteMaxReference = Math.min(...stats.ventesMaxParSemaine);
  } else {
    // Moyenne des max (par défaut, plus stable)
    venteMaxReference = stats.moyenneVentesMax;
  }

  if (venteMaxReference === 0) return 0;

  // Utiliser le poids du jour le plus fréquenté (samedi généralement)
  const poidsJourMax = Math.max(...Object.values(frequentationData?.poidsJours || { default: 0.14 }));
  const poidsJour = poidsJourMax || 0.14;

  return Math.ceil(venteMaxReference / poidsJour);
};

/**
 * Calcule les potentiels pour tous les produits avec mode de progression
 * @param {Array} produits - Liste des produits
 * @param {Object} frequentationData - Données de fréquentation
 * @param {string} mode - Mode de calcul: 'mathematique' | 'forte-progression' | 'prudent' | 'moyenne-stats'
 * @returns {Array} Produits avec potentiels calculés
 */
export const calculerPotentielsPourTous = (produits, frequentationData, mode = 'mathematique') => {
  const limites = {
    'mathematique': null,          // Pas de limite
    'forte-progression': 0.20,     // +20% max
    'prudent': 0.10,               // +10% max
    'moyenne-stats': null          // Utilise moyenne des max (multi-semaines)
  };

  const limiteProgression = limites[mode];
  const utiliserStats = mode === 'moyenne-stats';

  console.log(`🤖 Calcul automatique des potentiels (mode: ${mode})...`);

  return produits.map(produit => {
    if (produit.custom || !produit.ventesParJour) {
      return produit;
    }

    let potentielMathematique;

    // Si mode stats et stats disponibles, utiliser la moyenne des max
    if (utiliserStats && produit.stats && produit.stats.nombreSemaines >= 2) {
      potentielMathematique = calculerPotentielAvecStats(produit.stats, frequentationData, 'moyenne');
      console.log(`  ${produit.libelle}: Moyenne ventes max=${produit.stats.moyenneVentesMax} → Potentiel=${potentielMathematique} (multi-semaines)`);
    } else {
      // Mode classique : utiliser le max absolu
      const { venteMax, dateVenteMax } = trouverVenteMax(produit.ventesParJour);

      if (venteMax === 0) {
        return { ...produit, potentielHebdo: 0 };
      }

      const jourVenteMax = getJourSemaine(dateVenteMax);
      let poidsJour = 0.14; // Valeur par défaut

      const poidsJours = frequentationData?.poidsJours;
      if (poidsJours) {
        const poidsJourSpecifique = jourVenteMax ? poidsJours[jourVenteMax] : null;
        poidsJour = poidsJourSpecifique ?? Math.max(...Object.values(poidsJours));
      }

      potentielMathematique = Math.ceil(venteMax / poidsJour);
    }

    // Volume actuel (moyenne hebdo si stats dispo, sinon total)
    const volumeActuel = produit.stats?.moyenneHebdo || produit.totalVentes || 0;

    // Appliquer la limite de progression selon le mode
    let potentielFinal = potentielMathematique;

    if (limiteProgression !== null && volumeActuel > 0) {
      const progression = (potentielMathematique - volumeActuel) / volumeActuel;

      if (progression > limiteProgression) {
        // Limiter la progression
        potentielFinal = Math.ceil(volumeActuel * (1 + limiteProgression));
      } else if (progression < 0) {
        // Pas de baisse : garder le volume actuel
        potentielFinal = Math.ceil(volumeActuel);
      }
      // Sinon : progression entre 0 et la limite → garder le calcul mathématique
    }

    return {
      ...produit,
      potentielHebdo: potentielFinal
    };
  });
};
