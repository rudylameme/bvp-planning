/**
 * Extraction des données de fréquentation par créneau horaire
 *
 * Ce module gère :
 * - L'extraction des données par créneau (matin, midi, après-midi)
 * - L'extraction des données par tranche horaire individuelle (6 tranches)
 * - Le calcul des moyennes secteur par créneau et par tranche
 */

/**
 * Extrait les données par créneau horaire (regroupés en 3 blocs : matin, midi, après-midi)
 * La colonne HORAIRE contient: '00_Autre', '09h_12h', '12h_14h', '14h_16h', '16h_19h', '19h_23h'
 */
export function extraireDonneesParCreneau(venteHeure) {
  const creneaux = {
    matin: { tranches: ['00_Autre', '09h_12h'] },
    midi: { tranches: ['12h_14h'] },
    apresMidi: { tranches: ['14h_16h', '16h_19h', '19h_23h'] },
  };

  const result = {};

  for (const [creneau, config] of Object.entries(creneaux)) {
    // Filtrer par la colonne HORAIRE
    const lignes = venteHeure.filter(row => {
      const horaire = row.HORAIRE || row.Horaire || row.Tr_horaire;
      return config.tranches.includes(horaire);
    });

    // Données semaine courante
    const ticketsBVP = lignes.reduce((acc, row) => acc + (parseFloat(row['Nb Ticket BVP']) || 0), 0);
    const ticketsTotal = lignes.reduce((acc, row) => acc + (parseFloat(row['Nb Ticket']) || 0), 0);

    // Données An-1 (même semaine année précédente)
    const ticketsBVP_An1 = lignes.reduce((acc, row) => acc + (parseFloat(row['Nb Ticket BVP_An1']) || 0), 0);
    const ticketsTotal_An1 = lignes.reduce((acc, row) => acc + (parseFloat(row['Nb Ticket_An1']) || 0), 0);

    // Données S-1 (semaine précédente)
    const ticketsBVP_S1 = lignes.reduce((acc, row) => acc + (parseFloat(row['Nb Ticket BVP_S1']) || 0), 0);
    const ticketsTotal_S1 = lignes.reduce((acc, row) => acc + (parseFloat(row['Nb Ticket_S1']) || 0), 0);

    result[creneau] = {
      caBVP: lignes.reduce((acc, row) => acc + (parseFloat(row['Ca Tot BVP']) || 0), 0),
      qteBVP: lignes.reduce((acc, row) => acc + (parseFloat(row['Qte Tot BVP']) || 0), 0),
      ticketsBVP: ticketsBVP,
      caTotal: lignes.reduce((acc, row) => acc + (parseFloat(row['Ca Tot']) || 0), 0),
      qteTotal: lignes.reduce((acc, row) => acc + (parseFloat(row['Qte Tot']) || 0), 0),
      ticketsTotal: ticketsTotal,
      // Pénétration semaine courante
      penetration: ticketsTotal > 0 ? ticketsBVP / ticketsTotal : 0,
      // Pénétration An-1
      penetrationAn1: ticketsTotal_An1 > 0 ? ticketsBVP_An1 / ticketsTotal_An1 : 0,
      // Pénétration S-1
      penetrationS1: ticketsTotal_S1 > 0 ? ticketsBVP_S1 / ticketsTotal_S1 : 0,
    };
  }

  return result;
}

/**
 * Extrait les données par tranche horaire individuelle (6 tranches)
 * Pour le diagnostic personnalisé qui identifie le créneau avec le plus de clients perdus
 */
export function extraireDonneesParTrancheHoraire(venteHeure) {
  // Configuration des 6 tranches horaires du fichier Excel
  const tranches = {
    '00_Autre': {
      label: 'en dehors des horaires classiques',
      cause: 'Des clients passent avant l\'ouverture ou après la fermeture habituelle (boulangerie donnant sur l\'extérieur ?)',
      action: 'Vérifier les horaires réels d\'affluence et adapter les cuissons',
      horaireCuisson: null,
    },
    '09h_12h': {
      label: 'le matin',
      cause: 'Rayons pas encore garnis à l\'ouverture',
      action: 'Cuisson prête dès l\'ouverture',
      horaireCuisson: 'dès l\'ouverture',
    },
    '12h_14h': {
      label: 'le midi',
      cause: 'Cuisson du matin épuisée au pic du déjeuner',
      action: 'Cuisson vers 11h30',
      horaireCuisson: '11h30',
    },
    '14h_16h': {
      label: 'en début d\'après-midi',
      cause: 'Rayons vides après le rush du midi',
      action: 'Cuisson vers 13h30',
      horaireCuisson: '13h30',
    },
    '16h_19h': {
      label: 'en fin d\'après-midi',
      cause: 'Clients sortie école/travail trouvent rayons vides',
      action: 'Cuisson vers 15h30',
      horaireCuisson: '15h30',
    },
    '19h_23h': {
      label: 'le soir',
      cause: 'Derniers clients n\'ont plus de choix',
      action: 'Cuisson vers 18h30 ou réserve',
      horaireCuisson: '18h30',
    },
  };

  const result = {};

  for (const [trancheKey, config] of Object.entries(tranches)) {
    // Filtrer par la colonne HORAIRE
    const lignes = venteHeure.filter(row => {
      const horaire = row.HORAIRE || row.Horaire || row.Tr_horaire;
      return horaire === trancheKey;
    });

    // Données semaine courante
    const ticketsBVP = lignes.reduce((acc, row) => acc + (parseFloat(row['Nb Ticket BVP']) || 0), 0);
    const ticketsTotal = lignes.reduce((acc, row) => acc + (parseFloat(row['Nb Ticket']) || 0), 0);
    const caBVP = lignes.reduce((acc, row) => acc + (parseFloat(row['Ca Tot BVP']) || 0), 0);

    // Clients perdus = clients passés en caisse SANS acheter BVP
    const clientsPerdus = ticketsTotal - ticketsBVP;

    result[trancheKey] = {
      ...config,
      key: trancheKey,
      ticketsBVP,
      ticketsTotal,
      caBVP,
      clientsPerdus: Math.max(0, clientsPerdus),
      penetration: ticketsTotal > 0 ? ticketsBVP / ticketsTotal : 0,
    };
  }

  return result;
}

/**
 * Calcule la moyenne du secteur par créneau
 */
export function calculerMoyenneSecteurParCreneau(venteHeureSecteur) {
  const creneaux = {
    matin: { tranches: ['00_Autre', '09h_12h'] },
    midi: { tranches: ['12h_14h'] },
    apresMidi: { tranches: ['14h_16h', '16h_19h', '19h_23h'] },
  };

  const result = {};

  // Grouper par magasin d'abord (utiliser _codePDV qui est normalisé)
  const magasins = [...new Set(venteHeureSecteur.map(row => row._codePDV))].filter(Boolean);

  for (const [creneau, config] of Object.entries(creneaux)) {
    const valeursParMagasin = magasins.map(codePdv => {
      const lignes = venteHeureSecteur.filter(row => {
        const horaire = row.HORAIRE || row.Horaire || row.Tr_horaire;
        return row._codePDV === codePdv && config.tranches.includes(horaire);
      });

      return {
        caBVP: lignes.reduce((acc, row) => acc + (parseFloat(row['Ca Tot BVP']) || 0), 0),
        qteBVP: lignes.reduce((acc, row) => acc + (parseFloat(row['Qte Tot BVP']) || 0), 0),
        ticketsBVP: lignes.reduce((acc, row) => acc + (parseFloat(row['Nb Ticket BVP']) || 0), 0),
        ticketsTotal: lignes.reduce((acc, row) => acc + (parseFloat(row['Nb Ticket']) || 0), 0),
      };
    });

    const count = valeursParMagasin.length || 1;

    result[creneau] = {
      caBVP: valeursParMagasin.reduce((acc, v) => acc + v.caBVP, 0) / count,
      qteBVP: valeursParMagasin.reduce((acc, v) => acc + v.qteBVP, 0) / count,
      ticketsBVP: valeursParMagasin.reduce((acc, v) => acc + v.ticketsBVP, 0) / count,
      ticketsTotal: valeursParMagasin.reduce((acc, v) => acc + v.ticketsTotal, 0) / count,
    };

    result[creneau].penetration = result[creneau].ticketsTotal > 0
      ? result[creneau].ticketsBVP / result[creneau].ticketsTotal
      : 0;
  }

  return result;
}

/**
 * Calcule la moyenne du secteur par tranche horaire individuelle (6 tranches)
 * Pour la comparaison dans BarresPenetration
 */
export function calculerMoyenneSecteurParTrancheHoraire(venteHeureSecteur) {
  const tranches = ['00_Autre', '09h_12h', '12h_14h', '14h_16h', '16h_19h', '19h_23h'];

  const result = {};

  // Grouper par magasin d'abord
  const magasins = [...new Set(venteHeureSecteur.map(row => row._codePDV))].filter(Boolean);

  for (const trancheKey of tranches) {
    const valeursParMagasin = magasins.map(codePdv => {
      const lignes = venteHeureSecteur.filter(row => {
        const horaire = row.HORAIRE || row.Horaire || row.Tr_horaire;
        return row._codePDV === codePdv && horaire === trancheKey;
      });

      const ticketsBVP = lignes.reduce((acc, row) => acc + (parseFloat(row['Nb Ticket BVP']) || 0), 0);
      const ticketsTotal = lignes.reduce((acc, row) => acc + (parseFloat(row['Nb Ticket']) || 0), 0);

      return {
        ticketsBVP,
        ticketsTotal,
        penetration: ticketsTotal > 0 ? ticketsBVP / ticketsTotal : 0,
      };
    }).filter(v => v.ticketsTotal > 0); // Ne garder que les magasins avec du trafic sur cette tranche

    const count = valeursParMagasin.length || 1;

    // Moyenne des pénétrations (pas la pénétration des moyennes)
    result[trancheKey] = {
      ticketsBVP: valeursParMagasin.reduce((acc, v) => acc + v.ticketsBVP, 0) / count,
      ticketsTotal: valeursParMagasin.reduce((acc, v) => acc + v.ticketsTotal, 0) / count,
      penetration: valeursParMagasin.reduce((acc, v) => acc + v.penetration, 0) / count,
    };
  }

  return result;
}
