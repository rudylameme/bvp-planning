/**
 * Service de calcul pour le diagnostic et le benchmark
 *
 * Fonctions de calcul pour :
 * - Benchmark vs secteur
 * - Flux par créneau
 * - Potentiel perdu
 * - Projection annuelle
 */

/**
 * Calcule le benchmark du magasin vs la moyenne du secteur
 * @param {Object} donneesMagasin - Données extraites du magasin
 * @returns {Object} Indicateurs de benchmark
 */
export function calculerBenchmarkSecteur(donneesMagasin) {
  if (!donneesMagasin?.indicateurs?.global) {
    return null;
  }

  const { pdv, moyenneSecteur, ecart } = donneesMagasin.indicateurs.global;

  return {
    ca: {
      valeur: pdv.caBVP,
      moyenne: moyenneSecteur.caBVP,
      ecart: ecart.caBVP.pourcent,
      statut: getStatut(ecart.caBVP.pourcent),
    },
    tickets: {
      valeur: pdv.ticketsBVP,
      moyenne: moyenneSecteur.ticketsBVP,
      ecart: ecart.ticketsBVP.pourcent,
      statut: getStatut(ecart.ticketsBVP.pourcent),
    },
    ticketMoyen: {
      valeur: pdv.ticketMoyen,
      moyenne: moyenneSecteur.ticketMoyen,
      ecart: ecart.ticketMoyen.pourcent,
      statut: getStatut(ecart.ticketMoyen.pourcent),
    },
    penetration: {
      valeur: pdv.penetration * 100,
      moyenne: moyenneSecteur.penetration * 100,
      ecartPoints: ecart.penetration.points,
      statut: getStatutPenetration(ecart.penetration.points),
    },
  };
}

/**
 * Calcule les données de flux par créneau horaire
 * @param {Object} donneesMagasin - Données extraites
 * @returns {Array} Données formatées pour le graphique
 */
export function calculerFluxParCreneau(donneesMagasin) {
  if (!donneesMagasin?.indicateurs?.parTrancheHoraire) {
    return [];
  }

  const tranches = donneesMagasin.indicateurs.parTrancheHoraire;
  const moyenneSecteur = donneesMagasin.indicateurs.moyenneSecteurParTrancheHoraire || {};

  // Configuration des labels
  const labelsCreneaux = {
    '00_Autre': 'Avant 9h',
    '09h_12h': '9h-12h',
    '12h_14h': '12h-14h',
    '14h_16h': '14h-16h',
    '16h_19h': '16h-19h',
    '19h_23h': 'Après 19h',
  };

  return Object.entries(tranches).map(([key, data]) => {
    const moyenneTranche = moyenneSecteur[key] || {};
    const penetrationPdv = data.penetration * 100;
    const penetrationSecteur = (moyenneTranche.penetration || 0) * 100;
    const ecart = penetrationPdv - penetrationSecteur;

    return {
      creneau: key,
      label: labelsCreneaux[key] || key,
      ticketsTotal: data.ticketsTotal,
      ticketsBVP: data.ticketsBVP,
      clientsPerdus: data.clientsPerdus,
      penetration: penetrationPdv,
      penetrationSecteur: penetrationSecteur,
      ecart: ecart,
      statut: getStatutPenetration(ecart),
      caBVP: data.caBVP,
      // Infos pour le diagnostic
      cause: data.cause,
      action: data.action,
      horaireCuisson: data.horaireCuisson,
    };
  });
}

/**
 * Calcule le potentiel perdu (clients non convertis)
 * @param {Object} donneesMagasin - Données extraites
 * @returns {Object} Potentiel détaillé
 */
export function calculerPotentielPerdu(donneesMagasin) {
  if (!donneesMagasin?.indicateurs?.global) {
    return null;
  }

  const { pdv, moyenneSecteur } = donneesMagasin.indicateurs.global;
  const fluxParCreneau = calculerFluxParCreneau(donneesMagasin);

  // Trouver le créneau avec le plus de clients perdus
  const creneauPrioritaire = fluxParCreneau.reduce((max, creneau) => {
    return (creneau.clientsPerdus > (max?.clientsPerdus || 0)) ? creneau : max;
  }, null);

  // Calculer le potentiel si on atteignait la pénétration du secteur
  const ticketsActuels = pdv.ticketsBVP;
  const ticketsSiPenetrationSecteur = Math.round(pdv.ticketsTotal * moyenneSecteur.penetration);
  const gainTicketsPotentiel = Math.max(0, ticketsSiPenetrationSecteur - ticketsActuels);

  // Calculer le potentiel si on égalisait tous les créneaux à la meilleure pénétration
  const meilleurePenetration = Math.max(...fluxParCreneau.map(c => c.penetration)) / 100;
  const ticketsSiMeilleurePenetration = Math.round(pdv.ticketsTotal * meilleurePenetration);
  const gainTicketsInterne = Math.max(0, ticketsSiMeilleurePenetration - ticketsActuels);

  return {
    clientsPerdusTotal: Math.max(0, pdv.ticketsTotal - pdv.ticketsBVP),
    creneauPrioritaire: creneauPrioritaire,
    // Potentiel vs secteur
    gainTicketsVsSecteur: gainTicketsPotentiel,
    gainCaVsSecteur: gainTicketsPotentiel * pdv.ticketMoyen,
    // Potentiel interne (homogénéiser les créneaux)
    gainTicketsInterne: gainTicketsInterne,
    gainCaInterne: gainTicketsInterne * pdv.ticketMoyen,
    // Total (le plus ambitieux des deux)
    gainTicketsMax: Math.max(gainTicketsPotentiel, gainTicketsInterne),
    gainCaMax: Math.max(gainTicketsPotentiel, gainTicketsInterne) * pdv.ticketMoyen,
    ticketMoyen: pdv.ticketMoyen,
  };
}

/**
 * Calcule la projection annuelle à partir du potentiel hebdomadaire
 * @param {number} potentielHebdo - Potentiel CA hebdomadaire
 * @param {number} semainesOuverture - Nombre de semaines d'ouverture (défaut 52)
 * @returns {Object} Projections annuelles
 */
export function calculerProjectionAnnuelle(potentielHebdo, semainesOuverture = 52) {
  const potentielAnnuel = potentielHebdo * semainesOuverture;

  return {
    hebdomadaire: potentielHebdo,
    mensuel: potentielHebdo * 4.33,
    annuel: potentielAnnuel,
    // Formaté
    hebdomadaireFormate: formatMontant(potentielHebdo),
    mensuelFormate: formatMontant(potentielHebdo * 4.33),
    annuelFormate: formatMontant(potentielAnnuel),
  };
}

/**
 * Génère un diagnostic personnalisé basé sur les données
 * @param {Object} donneesMagasin - Données extraites
 * @returns {Object} Diagnostic avec messages et recommandations
 */
export function genererDiagnostic(donneesMagasin) {
  if (!donneesMagasin) return null;

  const benchmark = calculerBenchmarkSecteur(donneesMagasin);
  const potentiel = calculerPotentielPerdu(donneesMagasin);
  const flux = calculerFluxParCreneau(donneesMagasin);

  const messages = [];
  const recommandations = [];
  let scoreGlobal = 0;

  // Analyse de la pénétration
  if (benchmark?.penetration) {
    if (benchmark.penetration.ecartPoints < -3) {
      messages.push({
        type: 'alerte',
        texte: `Votre taux de pénétration est inférieur de ${Math.abs(benchmark.penetration.ecartPoints).toFixed(1)} points au secteur.`,
      });
      scoreGlobal -= 2;
    } else if (benchmark.penetration.ecartPoints > 2) {
      messages.push({
        type: 'succes',
        texte: `Excellente pénétration ! +${benchmark.penetration.ecartPoints.toFixed(1)} points vs secteur.`,
      });
      scoreGlobal += 2;
    }
  }

  // Analyse du CA
  if (benchmark?.ca) {
    if (benchmark.ca.ecart < -10) {
      messages.push({
        type: 'alerte',
        texte: `CA BVP inférieur de ${Math.abs(benchmark.ca.ecart).toFixed(0)}% à la moyenne du secteur.`,
      });
      scoreGlobal -= 1;
    } else if (benchmark.ca.ecart > 10) {
      messages.push({
        type: 'succes',
        texte: `CA BVP supérieur de +${benchmark.ca.ecart.toFixed(0)}% à la moyenne du secteur.`,
      });
      scoreGlobal += 1;
    }
  }

  // Analyse du créneau prioritaire
  if (potentiel?.creneauPrioritaire) {
    const creneau = potentiel.creneauPrioritaire;
    if (creneau.clientsPerdus > 50) {
      recommandations.push({
        priorite: 'haute',
        creneau: creneau.label,
        message: `${creneau.clientsPerdus} clients perdus ${creneau.label.toLowerCase()}`,
        action: creneau.action,
        potentielCA: creneau.clientsPerdus * (benchmark?.ticketMoyen?.valeur || 3),
      });
    }
  }

  // Trouver les créneaux sous-performants
  const creneauxSousPerformants = flux.filter(c => c.ecart < -5);
  creneauxSousPerformants.forEach(creneau => {
    if (!recommandations.find(r => r.creneau === creneau.label)) {
      recommandations.push({
        priorite: creneau.ecart < -10 ? 'haute' : 'moyenne',
        creneau: creneau.label,
        message: `Pénétration faible ${creneau.label.toLowerCase()} (${creneau.ecart.toFixed(1)} pts vs secteur)`,
        action: creneau.action,
        cause: creneau.cause,
      });
    }
  });

  // Score global
  let niveauGlobal = 'moyen';
  if (scoreGlobal >= 2) niveauGlobal = 'bon';
  else if (scoreGlobal <= -2) niveauGlobal = 'alerte';

  return {
    messages,
    recommandations: recommandations.sort((a, b) => {
      const ordre = { haute: 0, moyenne: 1, basse: 2 };
      return ordre[a.priorite] - ordre[b.priorite];
    }),
    scoreGlobal,
    niveauGlobal,
    potentielTotal: potentiel?.gainCaMax || 0,
  };
}

// === Fonctions utilitaires ===

/**
 * Détermine le statut basé sur l'écart en pourcentage
 */
function getStatut(ecartPourcent) {
  if (ecartPourcent >= 5) return 'bon';
  if (ecartPourcent >= -5) return 'neutre';
  return 'alerte';
}

/**
 * Détermine le statut basé sur l'écart en points de pénétration
 */
function getStatutPenetration(ecartPoints) {
  if (ecartPoints >= 2) return 'bon';
  if (ecartPoints >= -2) return 'neutre';
  return 'alerte';
}

/**
 * Formate un montant en euros
 */
export function formatMontant(montant) {
  if (montant >= 1000) {
    return `${(montant / 1000).toFixed(1).replace('.', ',')} k€`;
  }
  return `${Math.round(montant).toLocaleString('fr-FR')} €`;
}

/**
 * Formate un pourcentage
 */
export function formatPourcent(valeur, decimales = 1) {
  return `${valeur.toFixed(decimales).replace('.', ',')}%`;
}

/**
 * Formate un nombre avec séparateur de milliers
 */
export function formatNombre(nombre) {
  return Math.round(nombre).toLocaleString('fr-FR');
}

export default {
  calculerBenchmarkSecteur,
  calculerFluxParCreneau,
  calculerPotentielPerdu,
  calculerProjectionAnnuelle,
  genererDiagnostic,
  formatMontant,
  formatPourcent,
  formatNombre,
};
