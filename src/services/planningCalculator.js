/**
 * Ordre des jours pour les calculs de redistribution
 */
const JOURS_ORDRE = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

/**
 * Obtient le jour suivant dans l'ordre de la semaine
 * @param {string} jour - Jour actuel (ex: 'lundi')
 * @returns {string} Jour suivant (ex: 'mardi', ou 'lundi' si dimanche)
 */
const getJourSuivant = (jour) => {
  const index = JOURS_ORDRE.indexOf(jour);
  return JOURS_ORDRE[(index + 1) % 7];
};

/**
 * Obtient l'autre créneau (matin <-> apresMidi)
 * @param {string} creneau - Créneau actuel
 * @returns {string} L'autre créneau
 */
const getAutreCreneau = (creneau) => {
  return creneau === 'matin' ? 'apresMidi' : 'matin';
};

/**
 * Calcule les potentiels redistribués pour la nouvelle structure ConfigJours V2
 * @param {Object} joursOuverture - Structure complète des jours avec statuts et redistribution
 * @param {Object} potentielsBase - Potentiels de base par jour/créneau { lundi: { matin: X, apresMidi: Y }, ... }
 * @returns {Object} Potentiels après redistribution des fermetures exceptionnelles
 */
export const calculerRedistribution = (joursOuverture, potentielsBase) => {
  // Copier les potentiels de base
  const potentielsFinals = {};
  for (const jour of JOURS_ORDRE) {
    potentielsFinals[jour] = {
      matin: potentielsBase[jour]?.matin || 0,
      apresMidi: potentielsBase[jour]?.apresMidi || 0
    };
  }

  // Pour chaque créneau en fermeture exceptionnelle, redistribuer
  for (const jour of JOURS_ORDRE) {
    const jourConfig = joursOuverture[jour];
    if (!jourConfig) continue;

    for (const creneau of ['matin', 'apresMidi']) {
      const creneauConfig = jourConfig[creneau];

      if (creneauConfig?.statut === 'ferme_exceptionnel') {
        const potentielARedistribuer = potentielsBase[jour]?.[creneau] || 0;
        const redistribution = creneauConfig.redistribution || { memeJourAutreCreneau: 85, jourSuivant: 15 };

        // Mettre le créneau fermé à 0
        potentielsFinals[jour][creneau] = 0;

        // Redistribuer vers l'autre créneau du même jour (si ouvert)
        const autreCreneau = getAutreCreneau(creneau);
        const autreCreneauConfig = jourConfig[autreCreneau];

        if (autreCreneauConfig?.statut === 'ouvert') {
          const partAutreCreneau = Math.round(potentielARedistribuer * redistribution.memeJourAutreCreneau / 100);
          potentielsFinals[jour][autreCreneau] += partAutreCreneau;
        }

        // Redistribuer vers le jour suivant (matin par défaut)
        const jourSuivant = getJourSuivant(jour);
        const jourSuivantConfig = joursOuverture[jourSuivant];

        if (jourSuivantConfig?.matin?.statut === 'ouvert') {
          const partJourSuivant = Math.round(potentielARedistribuer * redistribution.jourSuivant / 100);
          potentielsFinals[jourSuivant].matin += partJourSuivant;
        } else if (jourSuivantConfig?.apresMidi?.statut === 'ouvert') {
          // Si matin fermé, redistribuer sur l'après-midi
          const partJourSuivant = Math.round(potentielARedistribuer * redistribution.jourSuivant / 100);
          potentielsFinals[jourSuivant].apresMidi += partJourSuivant;
        }
        // Si le jour suivant est complètement fermé, le potentiel est perdu (ou on pourrait cascader)
      }
    }
  }

  return potentielsFinals;
};

/**
 * Convertit la nouvelle structure joursOuverture V2 en format compatible avec l'ancien système
 * @param {Object} joursOuvertureV2 - Nouvelle structure avec matin/apresMidi
 * @returns {Object} Format compatible avec appliquerFermeturesEtReports
 */
export const convertirJoursOuvertureV2VersV1 = (joursOuvertureV2) => {
  const etatsJours = {};
  const fermeturesExceptionnelles = {};

  for (const jour of JOURS_ORDRE) {
    const config = joursOuvertureV2[jour];
    if (!config) continue;

    const matinStatut = config.matin?.statut || 'ouvert';
    const apremStatut = config.apresMidi?.statut || 'ouvert';

    // Déterminer l'état global du jour
    if (matinStatut === 'ferme_habituel' && apremStatut === 'ferme_habituel') {
      etatsJours[jour] = 'FERME';
    } else if (matinStatut === 'ferme_habituel' && apremStatut === 'ouvert') {
      etatsJours[jour] = 'FERME_MATIN';
    } else if (matinStatut === 'ouvert' && apremStatut === 'ferme_habituel') {
      etatsJours[jour] = 'FERME_APREM';
    } else {
      etatsJours[jour] = 'OUVERT';
    }

    // Gérer les fermetures exceptionnelles (avec redistribution)
    if (matinStatut === 'ferme_exceptionnel' || apremStatut === 'ferme_exceptionnel') {
      const jourSuivant = getJourSuivant(jour);
      const redistMatin = config.matin?.redistribution || { memeJourAutreCreneau: 85, jourSuivant: 15 };
      const redistAprem = config.apresMidi?.redistribution || { memeJourAutreCreneau: 85, jourSuivant: 15 };

      // Moyenne des redistributions si les deux sont exceptionnels
      const redistribution = (matinStatut === 'ferme_exceptionnel' && apremStatut === 'ferme_exceptionnel')
        ? {
            memeJourAutreCreneau: Math.round((redistMatin.memeJourAutreCreneau + redistAprem.memeJourAutreCreneau) / 2),
            jourSuivant: Math.round((redistMatin.jourSuivant + redistAprem.jourSuivant) / 2)
          }
        : (matinStatut === 'ferme_exceptionnel' ? redistMatin : redistAprem);

      fermeturesExceptionnelles[jour] = {
        active: true,
        reports: {
          [jourSuivant]: redistribution.jourSuivant
        }
      };

      // Si fermeture complète exceptionnelle
      if (matinStatut === 'ferme_exceptionnel' && apremStatut === 'ferme_exceptionnel') {
        etatsJours[jour] = 'FERME';
      }
    }
  }

  return {
    etatsJours,
    fermeturesExceptionnelles: Object.keys(fermeturesExceptionnelles).length > 0 ? fermeturesExceptionnelles : null
  };
};

/**
 * Vérifie si un créneau est ouvert
 * @param {Object} joursOuverture - Structure des jours
 * @param {string} jour - Jour de la semaine
 * @param {string} creneau - 'matin' ou 'apresMidi'
 * @returns {boolean} true si le créneau est ouvert
 */
export const estCreneauOuvert = (joursOuverture, jour, creneau) => {
  return joursOuverture?.[jour]?.[creneau]?.statut === 'ouvert';
};

/**
 * Compte le nombre de créneaux ouverts dans la semaine
 * @param {Object} joursOuverture - Structure des jours
 * @returns {number} Nombre de créneaux ouverts (max 14)
 */
export const compterCreneauxOuverts = (joursOuverture) => {
  let count = 0;
  for (const jour of JOURS_ORDRE) {
    if (joursOuverture?.[jour]?.matin?.statut === 'ouvert') count++;
    if (joursOuverture?.[jour]?.apresMidi?.statut === 'ouvert') count++;
  }
  return count;
};

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
 * @param {Object} frequentationData - Données de fréquentation (optionnel, pour fermetures partielles)
 * @returns {Object} Quantités finales après fermetures et reports
 */
export const appliquerFermeturesEtReports = (quantitesBase, configSemaine, frequentationData = null) => {
  if (!configSemaine) return quantitesBase;

  const quantites = { ...quantitesBase };

  // 1. Fermeture hebdomadaire (pas de report)
  if (configSemaine.fermetureHebdo) {
    quantites[configSemaine.fermetureHebdo] = 0;
  }

  // 2. Etats des jours (FERME, FERME_MATIN, FERME_APREM)
  if (configSemaine.etatsJours) {
    const jours = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

    jours.forEach(jour => {
      const etat = configSemaine.etatsJours[jour];
      if (!etat || etat === 'OUVERT') return;

      const qteInitiale = quantitesBase[jour] || 0;

      if (etat === 'FERME') {
        // Fermeture complète : mettre à 0
        quantites[jour] = 0;
      } else if (etat === 'FERME_MATIN' || etat === 'FERME_APREM') {
        // Fermetures partielles : calculer le ratio à conserver
        // Valeurs par défaut si pas de données de fréquentation détaillées
        let ratioConserve = 0.5;

        if (frequentationData?.poidsTranchesDetail?.[jour]) {
          const detailPoids = frequentationData.poidsTranchesDetail[jour];
          const pMatin = (detailPoids['00_Autre'] || 0) + (detailPoids['09h_12h'] || 0);
          const pMidi = detailPoids['12h_14h'] || 0;
          const pSoir = (detailPoids['14h_16h'] || 0) + (detailPoids['16h_19h'] || 0) + (detailPoids['19h_23h'] || 0);
          const totalPoids = detailPoids.total || (pMatin + pMidi + pSoir);

          if (totalPoids > 0) {
            if (etat === 'FERME_MATIN') {
              // Fermé le matin : garder 50% midi + soir
              ratioConserve = ((0.5 * pMidi) + pSoir) / totalPoids;
            } else if (etat === 'FERME_APREM') {
              // Fermé l'après-midi : garder matin + 50% midi
              ratioConserve = (pMatin + (0.5 * pMidi)) / totalPoids;
            }
          }
        } else {
          // Valeurs par défaut sans données détaillées
          ratioConserve = etat === 'FERME_MATIN' ? 0.4 : 0.6;
        }

        quantites[jour] = Math.ceil(qteInitiale * ratioConserve);
      }
    });
  }

  // 3. Fermetures exceptionnelles (avec reports)
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

    // Fonction pour appliquer la variante par défaut (comme dans le recalculator)
    const appliquerVarianteJournaliere = (qteMathematique, ventesHistoriques, variante) => {
      // Protection contre les zéros
      if (ventesHistoriques === 0 && qteMathematique === 0) {
        return 2;
      }

      // Le minimum est toujours les ventes historiques (si > 0)
      if (qteMathematique < ventesHistoriques) {
        return ventesHistoriques;
      }

      // Application des limites selon variante
      if (variante === 'sans') {
        return qteMathematique;
      }

      // Protection contre division par zéro
      if (ventesHistoriques === 0) {
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

    // Variantes par défaut : Forte (lundi-jeudi), Faible (vendredi-dimanche)
    const getVarianteParDefaut = (jourLower) => {
      if (['lundi', 'mardi', 'mercredi', 'jeudi'].includes(jourLower)) {
        return 'forte';
      }
      return 'faible';
    };

    // Itérer sur les produits pour calculer leurs quantités sur toute la semaine
    for (const rayon in programmesParRayon) {
      for (const programme in programmesParRayon[rayon]) {
        const produitsDuProgramme = programmesParRayon[rayon][programme];

        for (const produit of produitsDuProgramme) {
          const qteHebdo = produit.potentielHebdo;

          // 1. Calculer les quantités de base pour TOUTE la semaine avec application des variantes
          const quantitesBaseSemaine = {};
          for (const jour of joursCapitalized) {
            const jourLower = jour.toLowerCase();
            const poids = planning.stats.poidsJours[jour] || 0;
            const qteMathematique = Math.ceil(qteHebdo * poids);

            // Calculer les ventes historiques pour ce jour
            const ventesHistoriques = calculerVentesHistoriquesPourJour(produit.ventesParJour, jourLower);

            // Appliquer la variante par défaut
            const varianteJour = getVarianteParDefaut(jourLower);
            quantitesBaseSemaine[jourLower] = appliquerVarianteJournaliere(qteMathematique, ventesHistoriques, varianteJour);
          }

          // 2. Appliquer les fermetures (Complètes ou Partielles)
          const quantitesFinalesSemaine = { ...quantitesBaseSemaine };
          const distributionTranches = {}; // Pour stocker comment répartir matin/midi/soir par jour

          for (const jour of joursCapitalized) {
            const jourLower = jour.toLowerCase();

            // Vérifier d'abord la fermeture hebdomadaire légale
            const estFermetureHebdo = configSemaine?.fermetureHebdo === jourLower;
            const etat = estFermetureHebdo ? 'FERME' : (configSemaine?.etatsJours?.[jourLower] || 'OUVERT');
            const qteInitiale = quantitesBaseSemaine[jourLower];

            // Récupérer le détail des poids horaires pour ce jour
            const detailPoids = frequentationData.poidsTranchesDetail?.[jourLower];

            // Valeurs par défaut si pas de détail (fallback)
            const pMatin = detailPoids ? ((detailPoids['00_Autre'] || 0) + (detailPoids['09h_12h'] || 0)) : 0.6;
            const pMidi = detailPoids ? (detailPoids['12h_14h'] || 0) : 0.3;
            const pSoir = detailPoids ? ((detailPoids['14h_16h'] || 0) + (detailPoids['16h_19h'] || 0) + (detailPoids['19h_23h'] || 0)) : 0.1;
            const totalPoids = detailPoids ? detailPoids.total : (pMatin + pMidi + pSoir);

            // Si totalPoids est 0 (pas de freq ce jour là), on évite la division par zéro
            const safeTotal = totalPoids > 0 ? totalPoids : 1;

            if (etat === 'FERME') {
              quantitesFinalesSemaine[jourLower] = 0;
              distributionTranches[jourLower] = { matin: 0, midi: 0, soir: 0 };
            } else if (etat === 'FERME_MATIN') {
              // Fermé le matin (< 13h). On garde 13h-14h (50% de midi) + Soir
              const poidsAprem = (0.5 * pMidi) + pSoir;
              const ratioAprem = totalPoids > 0 ? poidsAprem / totalPoids : 0.4; // Fallback approx

              quantitesFinalesSemaine[jourLower] = Math.ceil(qteInitiale * ratioAprem);

              // Répartition : Matin=0, Midi=50% de sa part, Soir=Normal
              // On doit renormaliser pour que la somme fasse 1 (ou utiliser les poids relatifs)
              // Ici on veut juste les proportions pour répartir la NOUVELLE quantité
              const totalRestant = (0.5 * pMidi) + pSoir;
              distributionTranches[jourLower] = {
                matin: 0,
                midi: totalRestant > 0 ? (0.5 * pMidi) / totalRestant : 0,
                soir: totalRestant > 0 ? pSoir / totalRestant : 1
              };
            } else if (etat === 'FERME_APREM') {
              // Fermé l'aprèm (> 13h). On garde Matin + 12h-13h (50% de midi)
              const poidsMatin = pMatin + (0.5 * pMidi);
              const ratioMatin = totalPoids > 0 ? poidsMatin / totalPoids : 0.6; // Fallback approx

              quantitesFinalesSemaine[jourLower] = Math.ceil(qteInitiale * ratioMatin);

              const totalRestant = pMatin + (0.5 * pMidi);
              distributionTranches[jourLower] = {
                matin: totalRestant > 0 ? pMatin / totalRestant : 1,
                midi: totalRestant > 0 ? (0.5 * pMidi) / totalRestant : 0,
                soir: 0
              };
            } else {
              // OUVERT : Distribution standard selon les poids calculés
              distributionTranches[jourLower] = poidsTranchesParJour[jourLower] || { matin: 0.6, midi: 0.3, soir: 0.1 };
            }
          }

          // 3. Distribuer dans le planning jour par jour
          for (const jour of joursCapitalized) {
            const jourLower = jour.toLowerCase();
            const qteJour = quantitesFinalesSemaine[jourLower] || 0;
            const dist = distributionTranches[jourLower];

            const qteMatin = Math.ceil(qteJour * dist.matin);
            const qteMidi = Math.ceil(qteJour * dist.midi);
            // Le reste sur le soir pour éviter les écarts d'arrondi, sauf si soir doit être 0
            const qteSoir = (dist.soir === 0) ? 0 : (qteJour - qteMatin - qteMidi);

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

