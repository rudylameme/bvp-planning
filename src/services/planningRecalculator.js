/**
 * Recalcule le planning avec des variantes différentes par rayon ET par jour
 *
 * Système à 4 règles:
 * - Règle 1: Calcul mathématique (venteMax / poidsJour)
 * - Règle 2: Minimum = ventes historiques du jour
 * - Règle 3: Application des limites par variante:
 *   - Sans: Pas de limite (potentiel mathématique pur)
 *   - Forte: Limite à +20% du volume historique
 *   - Faible: Limite à +10% du volume historique
 * - Règle 4: Les modifications manuelles surchargent tout
 */

import { getJourSemaine } from '../utils/dateUtils';

/**
 * Trouve la vente maximale pour un jour donné
 */
const trouverVenteMaxPourJour = (ventesParJour, jourCible) => {
  let venteMax = 0;
  for (const [date, quantite] of Object.entries(ventesParJour)) {
    const jourDeDate = getJourSemaine(date);
    if (jourDeDate === jourCible && quantite > venteMax) {
      venteMax = quantite;
    }
  }
  return venteMax;
};

/**
 * Calcule la somme totale des ventes historiques pour un jour donné
 */
const calculerVentesHistoriquesPourJour = (ventesParJour, jourCible) => {
  let totalVentes = 0;
  for (const [date, quantite] of Object.entries(ventesParJour)) {
    const jourDeDate = getJourSemaine(date);
    if (jourDeDate === jourCible) {
      totalVentes += quantite;
    }
  }
  return totalVentes;
};

/**
 * Calcule le potentiel mathématique d'un produit
 */
const calculerPotentielMathematique = (ventesParJour, poidsJours) => {
  // Trouver la vente max et son jour
  let venteMax = 0;
  let jourVenteMax = 'lundi';

  for (const [date, quantite] of Object.entries(ventesParJour)) {
    if (quantite > venteMax) {
      venteMax = quantite;
      const jour = getJourSemaine(date);
      if (jour) {
        jourVenteMax = jour;
      }
    }
  }

  // Capitaliser la première lettre
  const jourCapitalized = jourVenteMax.charAt(0).toUpperCase() + jourVenteMax.slice(1);
  const poidsJour = poidsJours[jourCapitalized] || 0.14;

  if (poidsJour === 0) return venteMax * 7;

  return Math.ceil(venteMax / poidsJour);
};

/**
 * Applique la variante à une quantité journalière
 *
 * @param {number} qteMathematique - Quantité calculée mathématiquement
 * @param {number} ventesHistoriques - Ventes historiques du jour
 * @param {string} variante - 'sans' | 'forte' | 'faible'
 * @returns {number} Quantité finale après application des règles
 */
const appliquerVarianteJournaliere = (qteMathematique, ventesHistoriques, variante) => {
  // Règle 2 modifiée: Protection contre les zéros
  // Si pas d'historique ET pas de calcul mathématique → minimum de sécurité de 2 unités
  if (ventesHistoriques === 0 && qteMathematique === 0) {
    return 2;
  }

  // Règle 2: Le minimum est toujours les ventes historiques (si > 0)
  if (qteMathematique < ventesHistoriques) {
    return ventesHistoriques;
  }

  // Règle 3: Application des limites selon variante
  if (variante === 'sans') {
    // Pas de limite
    return qteMathematique;
  }

  // Protection contre division par zéro pour le calcul de progression
  if (ventesHistoriques === 0) {
    // Si pas d'historique mais calcul mathématique > 0, on utilise le calcul
    return qteMathematique;
  }

  const progression = (qteMathematique - ventesHistoriques) / ventesHistoriques;

  if (variante === 'forte') {
    // Limite +20%
    if (progression > 0.20) {
      return Math.ceil(ventesHistoriques * 1.20);
    }
    return qteMathematique;
  }

  if (variante === 'faible') {
    // Limite +10%
    if (progression > 0.10) {
      return Math.ceil(ventesHistoriques * 1.10);
    }
    return qteMathematique;
  }

  return qteMathematique;
};

/**
 * Recalcule le planning avec les variantes par rayon ET par jour
 *
 * @param {Object} planning - Planning actuel
 * @param {Array} produits - Liste des produits
 * @param {Object} variantesParRayonEtJour - { rayon: { jour: 'sans'|'forte'|'faible' } }
 * @param {Object} frequentationData - Données de fréquentation
 * @param {Object} modificationsManuellesParRayonEtJour - { rayon: { jour: { libelleProduit: quantite } } }
 * @returns {Object} Nouveau planning
 */
import { appliquerFermeturesEtReports } from './planningCalculator';

/**
 * Recalcule UNIQUEMENT le jour/rayon modifié dans le planning
 * Conserve les valeurs existantes pour les autres jours/rayons
 *
 * @param {Object} planning - Planning actuel
 * @param {Array} produits - Liste des produits
 * @param {Object} variantesParRayonEtJour - { rayon: { jour: 'sans'|'forte'|'faible' } }
 * @param {Object} frequentationData - Données de fréquentation
 * @param {Object} modificationsManuellesParRayonEtJour - { rayon: { jour: { libelleProduit: quantite } } }
 * @param {Object} configSemaine - Configuration de la semaine (fermetures, reports)
 * @returns {Object} Nouveau planning
 */
export const recalculerPlanningAvecVariantes = (
  planning,
  produits,
  variantesParRayonEtJour,
  frequentationData,
  modificationsManuellesParRayonEtJour = {},
  configSemaine = null
) => {
  const joursCapitalized = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const poidsJours = frequentationData.poidsJours;
  const poidsTranchesParJour = frequentationData.poidsTranchesParJour ?? {};

  // Cloner le planning existant (conserver les données existantes)
  const nouveauPlanning = JSON.parse(JSON.stringify(planning));

  // Reconvertir les Maps (perdues lors du JSON.stringify)
  for (const jour of joursCapitalized) {
    if (nouveauPlanning.jours[jour]) {
      for (const rayon in nouveauPlanning.jours[jour]) {
        for (const programme in nouveauPlanning.jours[jour][rayon]) {
          const data = nouveauPlanning.jours[jour][rayon][programme];
          if (data.produits && !(data.produits instanceof Map)) {
            // Convertir l'objet en Map
            const mapProduits = new Map();
            if (Array.isArray(data.produits)) {
              // Format sérialisé [[key, value], ...]
              data.produits.forEach(([key, value]) => mapProduits.set(key, value));
            } else {
              // Format objet {key: value, ...}
              Object.entries(data.produits).forEach(([key, value]) => mapProduits.set(key, value));
            }
            data.produits = mapProduits;
          }
        }
      }
    }
  }

  // Pour chaque rayon qui a des variantes définies, recalculer UNIQUEMENT ce rayon
  for (const rayon in variantesParRayonEtJour) {
    const variantesJours = variantesParRayonEtJour[rayon];

    // Récupérer les produits de ce rayon
    const produitsRayon = produits.filter(p => p.actif && p.potentielHebdo > 0 && (p.rayon || 'AUTRE') === rayon);

    if (produitsRayon.length === 0) continue;

    // Pour chaque jour qui a une variante définie pour ce rayon
    for (const jourLower in variantesJours) {
      const variante = variantesJours[jourLower];
      const jourCapitalized = jourLower.charAt(0).toUpperCase() + jourLower.slice(1);

      // Vérifier si c'est un jour fermé
      const estFermetureHebdo = configSemaine?.fermetureHebdo === jourLower;
      const etatJour = configSemaine?.etatsJours?.[jourLower] || 'OUVERT';
      const estFerme = estFermetureHebdo || etatJour === 'FERME';

      // Pour chaque produit du rayon, recalculer la quantité de CE jour uniquement
      for (const produit of produitsRayon) {
        const programme = produit.programme || `Autres ${produit.rayon}`;
        const libelle = produit.libellePersonnalise;

        // Vérifier s'il y a une modification manuelle pour ce produit/jour
        const modifManuelle = modificationsManuellesParRayonEtJour[rayon]?.[jourLower]?.[libelle];

        let qteJour;

        if (modifManuelle !== undefined && modifManuelle !== null) {
          // Règle 4: Modification manuelle (écrase tout)
          qteJour = modifManuelle;
        } else if (estFerme) {
          // Jour fermé : quantité = 0
          qteJour = 0;
        } else {
          // Calculer selon la variante
          const potentielMath = calculerPotentielMathematique(produit.ventesParJour, poidsJours);
          const poids = poidsJours[jourLower] || 0.14;
          const qteMathematique = Math.ceil(potentielMath * poids);
          const ventesHistoriques = calculerVentesHistoriquesPourJour(produit.ventesParJour, jourLower);

          qteJour = appliquerVarianteJournaliere(qteMathematique, ventesHistoriques, variante);

          // Appliquer fermeture partielle si nécessaire
          if (etatJour === 'FERME_MATIN' || etatJour === 'FERME_APREM') {
            let ratioConserve = etatJour === 'FERME_MATIN' ? 0.4 : 0.6;
            if (frequentationData?.poidsTranchesDetail?.[jourLower]) {
              const detailPoids = frequentationData.poidsTranchesDetail[jourLower];
              const pMatin = (detailPoids['00_Autre'] || 0) + (detailPoids['09h_12h'] || 0);
              const pMidi = detailPoids['12h_14h'] || 0;
              const pSoir = (detailPoids['14h_16h'] || 0) + (detailPoids['16h_19h'] || 0) + (detailPoids['19h_23h'] || 0);
              const totalPoids = detailPoids.total || (pMatin + pMidi + pSoir);
              if (totalPoids > 0) {
                ratioConserve = etatJour === 'FERME_MATIN'
                  ? ((0.5 * pMidi) + pSoir) / totalPoids
                  : (pMatin + (0.5 * pMidi)) / totalPoids;
              }
            }
            qteJour = Math.ceil(qteJour * ratioConserve);
          }
        }

        // Distribuer sur les créneaux
        const poidsTranchesJour = poidsTranchesParJour[jourLower] || { matin: 0.6, midi: 0.3, soir: 0.1 };
        const qteMatin = Math.ceil(qteJour * poidsTranchesJour.matin);
        const qteMidi = Math.ceil(qteJour * poidsTranchesJour.midi);
        const qteSoir = Math.ceil(qteJour * poidsTranchesJour.soir);

        const ventesHistoriques = calculerVentesHistoriquesPourJour(produit.ventesParJour, jourLower);

        const creneauxData = {
          matin: qteMatin,
          midi: qteMidi,
          soir: qteSoir,
          total: qteJour,
          unitesParVente: produit.unitesParVente ?? 1,
          unitesParPlaque: produit.unitesParPlaque ?? 0,
          itm8: produit.itm8,
          codePLU: produit.codePLU,
          ventesHistoriques: ventesHistoriques,
          modifieManuellement: modifManuelle !== undefined && modifManuelle !== null
        };

        // Mettre à jour uniquement ce produit pour ce jour
        if (nouveauPlanning.jours[jourCapitalized]?.[rayon]?.[programme]) {
          // Récupérer l'ancienne valeur pour mettre à jour la capacité
          const ancienneData = nouveauPlanning.jours[jourCapitalized][rayon][programme].produits.get(libelle);

          if (ancienneData) {
            // Soustraire l'ancienne capacité
            nouveauPlanning.jours[jourCapitalized][rayon][programme].capacite.matin -= ancienneData.matin;
            nouveauPlanning.jours[jourCapitalized][rayon][programme].capacite.midi -= ancienneData.midi;
            nouveauPlanning.jours[jourCapitalized][rayon][programme].capacite.soir -= ancienneData.soir;
            nouveauPlanning.jours[jourCapitalized][rayon][programme].capacite.total -= ancienneData.total;
          }

          // Mettre la nouvelle valeur
          nouveauPlanning.jours[jourCapitalized][rayon][programme].produits.set(libelle, creneauxData);

          // Ajouter la nouvelle capacité
          nouveauPlanning.jours[jourCapitalized][rayon][programme].capacite.matin += qteMatin;
          nouveauPlanning.jours[jourCapitalized][rayon][programme].capacite.midi += qteMidi;
          nouveauPlanning.jours[jourCapitalized][rayon][programme].capacite.soir += qteSoir;
          nouveauPlanning.jours[jourCapitalized][rayon][programme].capacite.total += qteJour;
        }
      }
    }
  }

  return nouveauPlanning;
};
