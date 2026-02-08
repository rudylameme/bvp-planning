/**
 * Extraction et calcul des données de ventes
 *
 * Ce module gère :
 * - Le calcul des moyennes secteur (global)
 * - Le calcul des écarts PDV vs secteur
 * - Le calcul du potentiel d'amélioration
 * - Le calcul du classement secteur (top 10, position, comparables)
 */

import { getCodePDV, construireSetCodesPDV } from './validationDonnees.js';

/**
 * Calcule la moyenne du secteur
 */
export function calculerMoyenneSecteur(magasins) {
  if (!magasins || magasins.length === 0) {
    return {
      caBVP: 0,
      qteBVP: 0,
      ticketsBVP: 0,
      caTotal: 0,
      qteTotal: 0,
      ticketsTotal: 0,
      penetration: 0,
      ticketMoyen: 0,
    };
  }

  const count = magasins.length;

  // Utiliser les vrais noms de colonnes du fichier Excel
  const sum = (arr, key) => arr.reduce((acc, row) => acc + (parseFloat(row[key]) || 0), 0);

  const caBVP = sum(magasins, 'Ca Tot BVP') / count;
  const qteBVP = sum(magasins, 'Qte Tot BVP') / count;
  const ticketsBVP = sum(magasins, 'Nb Ticket BVP') / count;
  const caTotal = sum(magasins, 'Ca Tot') / count;
  const qteTotal = sum(magasins, 'Qte Tot') / count;
  const ticketsTotal = sum(magasins, 'Nb Ticket') / count;

  // Calculer pénétration et ticket moyen à partir des valeurs
  const penetration = ticketsTotal > 0 ? ticketsBVP / ticketsTotal : 0;
  const ticketMoyen = ticketsBVP > 0 ? caBVP / ticketsBVP : 0;

  return {
    caBVP,
    qteBVP,
    ticketsBVP,
    caTotal,
    qteTotal,
    ticketsTotal,
    penetration,
    ticketMoyen,
  };
}

/**
 * Calcule les écarts entre PDV et moyenne secteur
 * @param {Object} pdv - Données du PDV avec propriétés normalisées (caBVP, etc.)
 * @param {Object} moyenne - Moyenne du secteur
 */
export function calculerEcarts(pdv, moyenne) {
  if (!pdv || !moyenne) return {};

  const ecartPourcent = (valPdv, valMoy) => {
    if (!valMoy || valMoy === 0) return 0;
    return ((valPdv - valMoy) / valMoy) * 100;
  };

  return {
    caBVP: {
      valeur: (pdv.caBVP || 0) - moyenne.caBVP,
      pourcent: ecartPourcent(pdv.caBVP, moyenne.caBVP),
    },
    qteBVP: {
      valeur: (pdv.qteBVP || 0) - moyenne.qteBVP,
      pourcent: ecartPourcent(pdv.qteBVP, moyenne.qteBVP),
    },
    ticketsBVP: {
      valeur: (pdv.ticketsBVP || 0) - moyenne.ticketsBVP,
      pourcent: ecartPourcent(pdv.ticketsBVP, moyenne.ticketsBVP),
    },
    penetration: {
      points: ((pdv.penetration || 0) - moyenne.penetration) * 100,
    },
    ticketMoyen: {
      valeur: (pdv.ticketMoyen || 0) - moyenne.ticketMoyen,
      pourcent: ecartPourcent(pdv.ticketMoyen, moyenne.ticketMoyen),
    },
  };
}

/**
 * Calcule le potentiel d'amélioration
 */
export function calculerPotentiel(indicateurs) {
  const creneaux = indicateurs.parCreneau;

  // Trouver la meilleure pénétration parmi les créneaux
  const penetrationMax = Math.max(
    creneaux.matin?.pdv?.penetration || 0,
    creneaux.midi?.pdv?.penetration || 0,
    creneaux.apresMidi?.pdv?.penetration || 0
  );

  const ticketsTotal = indicateurs.global.pdv.ticketsTotal || 0;
  const ticketsActuels = indicateurs.global.pdv.ticketsBVP || 0;
  const ticketsPotentiels = Math.round(ticketsTotal * penetrationMax);
  const ticketMoyen = indicateurs.global.pdv.ticketMoyen || 0;

  // Identifier le créneau prioritaire (plus gros écart avec le max)
  let creneauPrioritaire = 'matin';
  let maxEcart = 0;

  for (const [nom, data] of Object.entries(creneaux)) {
    const ecart = penetrationMax - (data?.pdv?.penetration || 0);
    if (ecart > maxEcart) {
      maxEcart = ecart;
      creneauPrioritaire = nom;
    }
  }

  return {
    tauxPenetrationMax: penetrationMax,
    ticketsActuels,
    ticketsPotentiels,
    gainTickets: ticketsPotentiels - ticketsActuels,
    gainCaEstime: (ticketsPotentiels - ticketsActuels) * ticketMoyen,
    creneauPrioritaire,
  };
}

/**
 * Calcule le classement du magasin dans son secteur
 * @param {Object} params - Paramètres du classement
 * @param {Object} params.infoPDV - Dictionnaire infoPDV complet
 * @param {string} params.secteurCode - Code du secteur
 * @param {string} params.secteurLibelle - Libellé du secteur
 * @param {string} params.modele - Modèle du magasin
 * @param {string} params.codePdvStr - Code PDV en string
 * @param {Array} params.totalPdv - Données Total PDV de tous les magasins
 * @returns {Object} Classement avec positionSecteur, top10, classementAutour, detailsComparables
 */
export function calculerClassementSecteur({ infoPDV, secteurCode, secteurLibelle, modele, codePdvStr, totalPdv }) {
  let magasinsSecteur = [];

  if (infoPDV && secteurCode) {
    // Tous les magasins du même secteur (tous modèles confondus)
    const codesSecteur = Object.keys(infoPDV).filter(code => {
      const info = infoPDV[code];
      return info.secteurCode === secteurCode;
    });

    // Créer un Set de tous les formats possibles des codes secteur
    const codesSecteurSet = construireSetCodesPDV(codesSecteur);

    magasinsSecteur = totalPdv
      .filter(row => {
        const code = row._codePDV || getCodePDV(row);
        const codeNormalise = code.replace(/^0+/, '');
        // Matcher en gérant les zéros préfixes
        return codesSecteurSet.has(code) ||
               codesSecteurSet.has(codeNormalise) ||
               codesSecteurSet.has(code.padStart(5, '0'));
      })
      .map(row => {
        const code = row._codePDV || getCodePDV(row);
        // Trouver l'info avec différents formats de code
        const info = infoPDV[code] || infoPDV[code.replace(/^0+/, '')] || infoPDV[code.padStart(5, '0')] || {};
        const caBVPMag = parseFloat(row['Ca Tot BVP']) || 0;
        const ticketsBVPMag = parseFloat(row['Nb Ticket BVP']) || 0;
        const ticketsTotalMag = parseFloat(row['Nb Ticket']) || 0;
        const penetrationMag = ticketsTotalMag > 0 ? ticketsBVPMag / ticketsTotalMag : 0;

        return {
          code: code,
          ville: info.ville || row.VILLE || row.Ville || 'Inconnu',
          enseigne: info.enseigne || row.ENSEIGNE || row.Enseigne || 'INTERMARCHE',
          vocation: info.vocation || row.VOCATION || row.Vocation || 'NC',
          secteurLibelle: info.secteurLibelle || secteurLibelle || 'NC',
          modele: info.modele || 'NC',
          surface: info.surface || null,
          caBVP: caBVPMag,
          qteBVP: parseFloat(row['Qte Tot BVP']) || 0,
          ticketsBVP: ticketsBVPMag,
          ticketsTotal: ticketsTotalMag,
          penetration: penetrationMag,
          ticketMoyen: ticketsBVPMag > 0 ? caBVPMag / ticketsBVPMag : 0,
          prixMoyenArticle: (parseFloat(row['Qte Tot BVP']) || 0) > 0 ? caBVPMag / (parseFloat(row['Qte Tot BVP']) || 1) : 0,
          estMemeModele: info.modele === modele,
          estMagasinCourant: code === codePdvStr ||
                             code.replace(/^0+/, '') === codePdvStr.replace(/^0+/, '') ||
                             code.padStart(5, '0') === codePdvStr.padStart(5, '0'),
        };
      });

    // Trier par taux de pénétration décroissant
    magasinsSecteur.sort((a, b) => b.penetration - a.penetration);
  }

  // Trouver la position du magasin courant dans le classement
  const positionSecteur = magasinsSecteur.findIndex(m => m.estMagasinCourant) + 1;
  const totalSecteur = magasinsSecteur.length;

  // Top 10 du secteur
  const top10Secteur = magasinsSecteur.slice(0, 10);

  // Classement autour du PDV (+5 / -5 positions)
  let classementAutour = [];
  if (positionSecteur > 0) {
    const indexCourant = positionSecteur - 1;
    const debut = Math.max(0, indexCourant - 5);
    const fin = Math.min(magasinsSecteur.length, indexCourant + 6);
    classementAutour = magasinsSecteur.slice(debut, fin).map((m, i) => ({
      ...m,
      position: debut + i + 1,
    }));
  }

  // Détails des magasins comparables (même Secteur + même Modèle)
  const detailsComparables = magasinsSecteur
    .filter(m => m.estMemeModele)
    .map((m, i) => ({ ...m, position: i + 1 }));

  return {
    positionSecteur,
    totalSecteur,
    top10Secteur,
    classementAutour,
    detailsComparables,
  };
}
