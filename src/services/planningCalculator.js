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
 * Calcule le planning de production avec répartition horaire Matin/Midi/Soir
 */
export const calculerPlanning = (frequentationData, produits) => {
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
        unitesParPlaque: produit.unitesParPlaque ?? 0
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
          const produitsDuProgramme = programmesParRayon[rayon][programme];
          planning.jours[jour][rayon][programme] = {
            produits: new Map(),
            capacite: { matin: 0, midi: 0, soir: 0, total: 0 }
          };

          for (const produit of produitsDuProgramme) {
            // Le potentielHebdo contient déjà la progression appliquée (Mathématique/Fort/Prudent)
            const qteHebdo = produit.potentielHebdo;
            const poids = planning.stats.poidsJours[jour];
            const qteJour = Math.ceil(qteHebdo * poids);

            const jourLower = jour.toLowerCase();
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
              ventesHistoriques: ventesHistoriques // Ajout des ventes historiques
            };

            console.log(`📦 Planning ${jour} - ${produit.libelle}:`, creneauxData);

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
