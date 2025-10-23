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

    // Classifier les produits par famille
    const familles = {
      BOULANGERIE: [],
      VIENNOISERIE: [],
      PATISSERIE: []
    };

    const produitsActifs = produits.filter(p => p.actif);

    for (const produit of produitsActifs) {
      const famille = produit.famille;
      if (!familles[famille]) {
        console.warn(`⚠️ Famille "${famille}" non reconnue pour le produit "${produit.libellePersonnalise}"`);
        continue;
      }
      familles[famille].push({
        libelle: produit.libellePersonnalise,
        potentielHebdo: produit.potentielHebdo,
        jourMax: 'lundi',
        quantiteMax: produit.potentielHebdo / 7,
        poidsJour: 0.14
      });
    }

    // Pour chaque famille, générer le planning
    for (const nomFamille of ['BOULANGERIE', 'VIENNOISERIE', 'PATISSERIE']) {
      planning.semaine[nomFamille] = new Map();

      for (const produit of familles[nomFamille]) {
        const qteHebdo = Math.ceil(produit.potentielHebdo * 1.1);
        planning.semaine[nomFamille].set(produit.libelle, qteHebdo);

        for (const jour of joursCapitalized) {
          if (!planning.jours[jour]) {
            planning.jours[jour] = {
              BOULANGERIE: new Map(),
              VIENNOISERIE: new Map(),
              PATISSERIE: new Map()
            };
          }

          const poids = planning.stats.poidsJours[jour];
          const qteJour = Math.ceil(qteHebdo * poids);

          const jourLower = jour.toLowerCase();
          const poidsTranchesJour = poidsTranchesParJour[jourLower] || { matin: 0.6, midi: 0.3, soir: 0.1 };

          planning.jours[jour][nomFamille].set(produit.libelle, {
            matin: Math.ceil(qteJour * poidsTranchesJour.matin),
            midi: Math.ceil(qteJour * poidsTranchesJour.midi),
            soir: Math.ceil(qteJour * poidsTranchesJour.soir),
            total: qteJour
          });
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
