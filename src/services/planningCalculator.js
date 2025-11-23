/**
 * Calcule les ventes historiques totales pour un jour donné
 */
const calculerVentesHistoriquesPourJour = (ventesParJour, jourCible) => {
  if (!ventesParJour || Object.keys(ventesParJour).length === 0) {
    return 0;
  }

  // Fonction pour convertir une date en jour de la semaine
  const getJourSemaine = (dateStr) => {
    let date;
    const numValue = Number(dateStr);
    if (Number.isFinite(numValue)) {
      const excelEpoch = new Date(1899, 11, 30);
      date = new Date(excelEpoch.getTime() + numValue * 86400000);
    } else {
      const dateStrTrimmed = dateStr.toString().trim();
      const ddmmyyyyMatch = dateStrTrimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (ddmmyyyyMatch) {
        const jour = parseInt(ddmmyyyyMatch[1], 10);
        const mois = parseInt(ddmmyyyyMatch[2], 10);
        const annee = parseInt(ddmmyyyyMatch[3], 10);
        date = new Date(annee, mois - 1, jour);
      } else {
        date = new Date(dateStrTrimmed);
      }
    }
    if (!Number.isFinite(date.getTime())) {
      return null;
    }
    const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    return jours[date.getDay()];
  };

  // Calculer le total des ventes pour ce jour
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
 * Applique les fermetures et reports à un objet de quantités par jour
 * @param {Object} quantitesBase - Quantités initiales par jour { lundi: X, mardi: Y, ... }
 * @param {Object} configSemaine - Configuration de la semaine avec fermetures
 * @returns {Object} Quantités finales après fermetures et reports
 */
export const appliquerFermeturesEtReports = (quantitesBase, configSemaine) => {
  if (!configSemaine) return quantitesBase;

  const quantites = { ...quantitesBase };

  // 1. Fermeture hebdomadaire (pas de report)
  if (configSemaine.fermetureHebdo) {
    quantites[configSemaine.fermetureHebdo] = 0;
  }

  // 2. Fermetures exceptionnelles (avec reports)
  if (configSemaine.fermeturesExceptionnelles) {
    Object.entries(configSemaine.fermeturesExceptionnelles).forEach(([jour, config]) => {
      if (!config.active) return;

      const qteJour = quantitesBase[jour];

      // Appliquer les reports
      Object.entries(config.reports || {}).forEach(([jourReport, pourcentage]) => {
        const qteReport = Math.ceil(qteJour * (pourcentage / 100));
        quantites[jourReport] = (quantites[jourReport] || 0) + qteReport;
      });

      // Mettre le jour férié à 0
      quantites[jour] = 0;
    });
  }

  return quantites;
};

/**
 * Calcule le planning de production avec répartition horaire Matin/Midi/Soir
 * @param {Object} frequentationData - Données de fréquentation
 * @param {Array} produits - Liste des produits
 * @param {Object} configSemaine - Configuration optionnelle de la semaine (fermetures, reports)
 */
export const calculerPlanning = (frequentationData, produits, configSemaine = null) => {
  try {
    if (!frequentationData?.poidsJours) {
      console.error('❌ calculerPlanning : Pas de données de fréquentation !');
      return null;
    }

    const joursCapitalized = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    const poidsJours = frequentationData.poidsJours;
    const poidsTranchesParJour = frequentationData.poidsTranchesParJour ?? {};

    const planning = {
      semaine: {},
      jours: {},
      stats: {
        poidsJours: {},
        poidsTranchesParJour: poidsTranchesParJour,
        poidsTranchesGlobal: frequentationData.poidsTranchesGlobal || null,
        ponderationType: frequentationData.type || 'standard',
        ponderations: frequentationData.ponderations || null
      }
    };

    // Préparer les stats par jour (avec majuscules)
    for (const jour of joursCapitalized) {
      const jourLower = jour.toLowerCase();
      planning.stats.poidsJours[jour] = poidsJours[jourLower] || 0;
    }

    // Classifier les produits par programme de cuisson ET par rayon
    const programmesParRayon = {};

    const produitsActifs = produits.filter(p => p.actif && p.potentielHebdo > 0);

    for (const produit of produitsActifs) {
      // Utiliser le programme de cuisson s'il existe, sinon créer un programme par défaut
      const programme = produit.programme || `Autres ${produit.rayon}`;
      const rayon = produit.rayon || 'AUTRE'; // rayon est maintenant toujours défini à la création

      // Créer la structure rayon -> programme
      if (!programmesParRayon[rayon]) {
        programmesParRayon[rayon] = {};
      }

      if (!programmesParRayon[rayon][programme]) {
        programmesParRayon[rayon][programme] = [];
      }

      programmesParRayon[rayon][programme].push({
        libelle: produit.libellePersonnalise,
        itm8: produit.itm8,
        codePLU: produit.codePLU,
        potentielHebdo: produit.potentielHebdo,
        totalVentes: produit.totalVentes || 0,
        jourMax: 'lundi',
        quantiteMax: produit.potentielHebdo / 7,
        poidsJour: 0.14,
        unitesParVente: produit.unitesParVente ?? 1,
        unitesParPlaque: produit.unitesParPlaque ?? 0,
        ventesParJour: produit.ventesParJour // Ajout de ventesParJour pour le calcul historique
      });
    }

    // Trier les produits par volume décroissant dans chaque programme
    for (const rayon in programmesParRayon) {
      for (const programme in programmesParRayon[rayon]) {
        programmesParRayon[rayon][programme].sort((a, b) => b.totalVentes - a.totalVentes);
      }
    }

    // Générer le planning par rayon et programme
    planning.programmesParRayon = programmesParRayon;

    // Pour chaque jour, créer la structure par rayon -> programme -> produits
    for (const jour of joursCapitalized) {
      planning.jours[jour] = {};

      for (const rayon in programmesParRayon) {
        planning.jours[jour][rayon] = {};

        for (const programme in programmesParRayon[rayon]) {
          planning.jours[jour][rayon][programme] = {
            produits: new Map(),
            capacite: { matin: 0, midi: 0, soir: 0, total: 0 }
          };
        }
      }
    }

    // Itérer sur les produits pour calculer leurs quantités sur toute la semaine
    for (const rayon in programmesParRayon) {
      for (const programme in programmesParRayon[rayon]) {
        const produitsDuProgramme = programmesParRayon[rayon][programme];

        for (const produit of produitsDuProgramme) {
          const qteHebdo = produit.potentielHebdo;

          // 1. Calculer les quantités de base pour TOUTE la semaine
          const quantitesBaseSemaine = {};
          for (const jour of joursCapitalized) {
            const jourLower = jour.toLowerCase();
            const poids = planning.stats.poidsJours[jour] || 0;
            quantitesBaseSemaine[jourLower] = Math.ceil(qteHebdo * poids);
          }

          // 2. Appliquer les fermetures et reports sur la semaine complète
          const quantitesFinalesSemaine = appliquerFermeturesEtReports(quantitesBaseSemaine, configSemaine);

          // 3. Distribuer dans le planning jour par jour
          for (const jour of joursCapitalized) {
            const jourLower = jour.toLowerCase();
            const qteJour = quantitesFinalesSemaine[jourLower] || 0;

            // Répartition par tranches horaires
            const poidsTranchesJour = poidsTranchesParJour[jourLower] || { matin: 0.6, midi: 0.3, soir: 0.1 };

            const qteMatin = Math.ceil(qteJour * poidsTranchesJour.matin);
            const qteMidi = Math.ceil(qteJour * poidsTranchesJour.midi);
            const qteSoir = Math.ceil(qteJour * poidsTranchesJour.soir);

            // Calculer les ventes historiques pour ce jour
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
              ventesHistoriques: ventesHistoriques
            };

            planning.jours[jour][rayon][programme].produits.set(produit.libelle, creneauxData);

            // Accumuler dans la capacité
            planning.jours[jour][rayon][programme].capacite.matin += qteMatin;
            planning.jours[jour][rayon][programme].capacite.midi += qteMidi;
            planning.jours[jour][rayon][programme].capacite.soir += qteSoir;
            planning.jours[jour][rayon][programme].capacite.total += qteJour;
          }
        }
      }
    }

    console.log('✅ Planning généré avec succès');
    return planning;
  } catch (error) {
    console.error('🚨 ERREUR dans calculerPlanning :', error);
    return null;
  }
};

