import * as XLSX from 'xlsx';

/**
 * Parse un fichier CSV
 */
export const parseCSV = (text) => {
  const lines = text.split('\n').filter(line => line.trim());
  const headers = lines[0].split(/[,;]/).map(h => h.trim());
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(/[,;]/).map(v => v.trim());
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      data.push(row);
    }
  }

  return { headers, data };
};

/**
 * Diagnostic du fichier de ventes - affiche les problèmes détectés
 */
const diagnostiquerVentes = (allData) => {
  console.log('\n🔍 === DIAGNOSTIC DU FICHIER VENTES ===');
  console.log(`📄 Nombre total de lignes : ${allData.length}`);

  // Vérifier si le fichier est vide
  if (allData.length === 0) {
    console.error('❌ ERREUR : Le fichier est vide');
    return false;
  }

  // Vérifier la première ligne (info PDV)
  if (allData[0] && allData[0][0]) {
    const firstCellText = allData[0][0].toString();
    console.log(`📍 Première ligne : "${firstCellText}"`);

    const pdvMatch = firstCellText.match(/PDV:?\s*(\d+)\s*-\s*([^Date]+)/i);
    if (pdvMatch) {
      console.log(`✅ Info PDV détectée : ${pdvMatch[1]} - ${pdvMatch[2].trim()}`);
    } else {
      console.warn('⚠️  Format PDV non détecté (format attendu : "PDV: 123 - Nom du magasin")');
    }
  }

  // Chercher la ligne d'en-tête avec "ITM8"
  let headerRowIndex = -1;
  for (let i = 0; i < allData.length; i++) {
    if (allData[i] && allData[i][0] && allData[i][0].toString().toLowerCase().includes('itm8')) {
      headerRowIndex = i;
      console.log(`✅ Ligne d'en-tête trouvée à la ligne ${i + 1} (contient "ITM8")`);
      break;
    }
  }

  if (headerRowIndex === -1) {
    console.error('❌ ERREUR : Ligne d\'en-tête avec "ITM8 Prio" introuvable');
    console.error('   Les 10 premières lignes de la colonne A :');
    for (let i = 0; i < Math.min(10, allData.length); i++) {
      console.error(`   Ligne ${i + 1}: "${allData[i] && allData[i][0] ? allData[i][0] : '(vide)'}"`);
    }
    return false;
  }

  // Vérifier les colonnes
  const headers = allData[headerRowIndex];
  console.log(`📊 Colonnes trouvées (${headers.length}) :`, headers.filter(h => h).join(', '));

  const libelleIndex = headers.findIndex(h => h && h.toString().toLowerCase().includes('libellé'));
  const dateIndex = headers.findIndex(h => h && h.toString().toLowerCase() === 'date');
  const quantiteIndex = headers.findIndex(h => h && h.toString().toLowerCase().includes('quantité'));

  if (libelleIndex === -1) {
    console.error('❌ ERREUR : Colonne "Libellé" introuvable');
  } else {
    console.log(`✅ Colonne "Libellé" trouvée (colonne ${libelleIndex + 1})`);
  }

  if (dateIndex === -1) {
    console.error('❌ ERREUR : Colonne "Date" introuvable');
  } else {
    console.log(`✅ Colonne "Date" trouvée (colonne ${dateIndex + 1})`);
  }

  if (quantiteIndex === -1) {
    console.error('❌ ERREUR : Colonne "Quantité" introuvable');
  } else {
    console.log(`✅ Colonne "Quantité" trouvée (colonne ${quantiteIndex + 1})`);
  }

  if (libelleIndex === -1 || dateIndex === -1 || quantiteIndex === -1) {
    return false;
  }

  // Vérifier quelques lignes de données
  const dataRows = allData.slice(headerRowIndex + 1);
  let produitsDetectes = new Set();
  let datesDetectees = new Set();
  let lignesAvecDonnees = 0;

  for (let i = 0; i < Math.min(dataRows.length, 100); i++) {
    const row = dataRows[i];
    if (!row) continue;

    const libelle = row[libelleIndex];
    const date = row[dateIndex];
    const quantite = parseFloat(row[quantiteIndex]) || 0;

    if (libelle && libelle.toString().trim() !== '' && libelle.toString() !== 'BOULANGERIE PATISSERIE') {
      produitsDetectes.add(libelle.toString().trim());
    }
    if (date && date.toString().trim() !== '') {
      datesDetectees.add(date.toString());
    }
    if (quantite > 0) {
      lignesAvecDonnees++;
    }
  }

  console.log(`📦 Produits détectés : ${produitsDetectes.size}`);
  console.log(`📅 Dates détectées : ${datesDetectees.size}`);
  console.log(`📈 Lignes avec quantités : ${lignesAvecDonnees}`);

  if (produitsDetectes.size === 0) {
    console.error('❌ ERREUR : Aucun produit détecté dans les données');
    return false;
  }

  if (datesDetectees.size === 0) {
    console.error('❌ ERREUR : Aucune date détectée dans les données');
    return false;
  }

  console.log('✅ Fichier de ventes semble correct');
  return true;
};

/**
 * Parse le fichier de ventes Excel
 */
export const parseVentesExcel = (arrayBuffer) => {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

  // Lire toutes les données comme tableau
  const allData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

  // 🔍 DIAGNOSTIC
  const diagnosticOk = diagnostiquerVentes(allData);
  if (!diagnosticOk) {
    alert('❌ Erreur dans le fichier de ventes. Appuyez sur F12 pour voir les détails dans la console.');
  }

  // Extraire info PDV de la première ligne
  let pdvInfo = null;
  if (allData[0] && allData[0][0]) {
    const firstCellText = allData[0][0].toString();
    const pdvMatch = firstCellText.match(/PDV:?\s*(\d+)\s*-\s*([^Date]+)/i);
    if (pdvMatch) {
      pdvInfo = {
        numero: pdvMatch[1].trim(),
        nom: pdvMatch[2].trim()
      };
    }
  }

  // Trouver la ligne d'en-tête (celle qui contient "ITM8 Prio" en colonne A)
  let headerRowIndex = -1;
  for (let i = 0; i < allData.length; i++) {
    if (allData[i] && allData[i][0] && allData[i][0].toString().toLowerCase().includes('itm8')) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    alert('Format de fichier non reconnu. La ligne d\'en-tête avec "ITM8 Prio" est introuvable.');
    return null;
  }

  // Les données commencent à headerRowIndex + 1
  const headers = allData[headerRowIndex];
  const dataRows = allData.slice(headerRowIndex + 1);

  // Trouver les indices des colonnes importantes
  const libelleIndex = headers.findIndex(h => h && h.toString().toLowerCase().includes('libellé'));
  const dateIndex = headers.findIndex(h => h && h.toString().toLowerCase() === 'date');
  const quantiteIndex = headers.findIndex(h => h && h.toString().toLowerCase().includes('quantité'));

  if (libelleIndex === -1 || dateIndex === -1 || quantiteIndex === -1) {
    alert('Colonnes requises introuvables (Libellé, Date, Quantité)');
    return null;
  }

  // Regrouper les données par produit et par date
  const produitsMap = new Map();

  dataRows.forEach(row => {
    const libelle = row[libelleIndex];
    const date = row[dateIndex];
    const quantite = parseFloat(row[quantiteIndex]) || 0;

    if (!libelle || !date || libelle.toString().trim() === '') return;

    const libelleStr = libelle.toString().trim();

    // Ignorer la ligne "BOULANGERIE PATISSERIE" (ligne de catégorie)
    if (libelleStr === 'BOULANGERIE PATISSERIE') return;

    if (!produitsMap.has(libelleStr)) {
      produitsMap.set(libelleStr, {});
    }

    const dateStr = date.toString();
    produitsMap.get(libelleStr)[dateStr] = (produitsMap.get(libelleStr)[dateStr] || 0) + quantite;
  });

  // Convertir en tableau de produits
  const joursUniques = Array.from(new Set(
    dataRows.map(row => row[dateIndex]).filter(d => d && d.toString().trim() !== '')
  )).sort();

  return {
    produits: produitsMap,
    jours: joursUniques,
    pdvInfo
  };
};

/**
 * Diagnostic du fichier de fréquentation - affiche les problèmes détectés
 */
const diagnostiquerFrequentation = (allData) => {
  console.log('🔍 === DIAGNOSTIC DU FICHIER FRÉQUENTATION ===');
  console.log(`📄 Nombre total de lignes : ${allData.length}`);

  // Vérifier si le fichier est vide
  if (allData.length === 0) {
    console.error('❌ ERREUR : Le fichier est vide');
    return false;
  }

  // Chercher la ligne d'en-tête avec "JOUR"
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(10, allData.length); i++) {
    const row = allData[i];
    if (row && row.some(cell => cell && cell.toString().includes('JOUR'))) {
      headerRowIndex = i;
      console.log(`✅ Ligne d'en-tête trouvée à la ligne ${i + 1}`);
      break;
    }
  }

  if (headerRowIndex === -1) {
    console.warn('⚠️  Ligne d\'en-tête "JOUR" non trouvée - utilisation de la ligne 1 par défaut');
  }

  // Vérifier qu'il y a assez de colonnes
  const sampleRow = allData[headerRowIndex >= 0 ? headerRowIndex + 1 : 1];
  if (!sampleRow || sampleRow.length < 26) {
    console.error(`❌ ERREUR : Pas assez de colonnes dans le fichier`);
    console.error(`   Nombre de colonnes trouvées : ${sampleRow ? sampleRow.length : 0}`);
    console.error(`   Nombre de colonnes requises : 26 minimum`);
    console.error('   Colonnes attendues :');
    console.error('   - Colonne G (7) : JOUR');
    console.error('   - Colonne H (8) : TRANCHE');
    console.error('   - Colonne N (14) : Tickets S-1');
    console.error('   - Colonne T (20) : Tickets AS-1');
    console.error('   - Colonne Z (26) : Tickets S-2');
    return false;
  }

  console.log(`✅ Structure de base correcte (${sampleRow.length} colonnes)`);

  // Vérifier quelques lignes de données
  let joursDetectes = new Set();
  let tranchesDetectees = new Set();
  let lignesAvecDonnees = 0;

  for (let i = (headerRowIndex >= 0 ? headerRowIndex + 1 : 1); i < Math.min(allData.length, 50); i++) {
    const row = allData[i];
    if (!row || row.length < 26) continue;

    const jour = row[6];
    const tranche = row[7];
    const ticketsS1 = parseFloat(row[13]) || 0;

    if (jour) joursDetectes.add(jour.toString());
    if (tranche) tranchesDetectees.add(tranche.toString());
    if (ticketsS1 > 0) lignesAvecDonnees++;
  }

  console.log(`📊 Jours détectés (${joursDetectes.size}) :`, Array.from(joursDetectes).join(', '));
  console.log(`⏰ Tranches horaires détectées (${tranchesDetectees.size}) :`, Array.from(tranchesDetectees).join(', '));
  console.log(`📈 Lignes avec des données : ${lignesAvecDonnees}`);

  if (lignesAvecDonnees === 0) {
    console.error('❌ ERREUR : Aucune donnée de tickets trouvée dans la colonne N (14)');
    return false;
  }

  console.log('✅ Fichier de fréquentation semble correct');
  return true;
};

/**
 * Parse le fichier de fréquentation Excel avec pondération multi-semaines
 * @param {ArrayBuffer} arrayBuffer - Le contenu du fichier
 * @param {string} typePonderation - Type de pondération: 'standard', 'saisonnier', 'fortePromo'
 */
export const parseFrequentationExcel = (arrayBuffer, typePonderation = 'standard') => {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const allData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

  // 🔍 DIAGNOSTIC
  const diagnosticOk = diagnostiquerFrequentation(allData);
  if (!diagnosticOk) {
    alert('❌ Erreur dans le fichier de fréquentation. Appuyez sur F12 pour voir les détails dans la console.');
  }

  // Mapping jours
  const jourMap = {
    '1-lundi': 'lundi',
    '2-mardi': 'mardi',
    '3-mercredi': 'mercredi',
    '4-jeudi': 'jeudi',
    '5-vendredi': 'vendredi',
    '6-samedi': 'samedi',
    '7-dimanche': 'dimanche'
  };

  // Initialisation des données pour les 3 semaines
  const ticketsParJourS1 = {};
  const ticketsParJourAS1 = {};
  const ticketsParJourS2 = {};
  const ticketsParJourTrancheS1 = {};
  const ticketsParJourTrancheAS1 = {};
  const ticketsParJourTrancheS2 = {};

  Object.values(jourMap).forEach(jour => {
    ticketsParJourS1[jour] = 0;
    ticketsParJourAS1[jour] = 0;
    ticketsParJourS2[jour] = 0;
    ticketsParJourTrancheS1[jour] = {
      '00_Autre': 0,
      '09h_12h': 0,
      '12h_14h': 0,
      '14h_16h': 0,
      '16h_19h': 0,
      '19h_23h': 0
    };
    ticketsParJourTrancheAS1[jour] = {
      '00_Autre': 0,
      '09h_12h': 0,
      '12h_14h': 0,
      '14h_16h': 0,
      '16h_19h': 0,
      '19h_23h': 0
    };
    ticketsParJourTrancheS2[jour] = {
      '00_Autre': 0,
      '09h_12h': 0,
      '12h_14h': 0,
      '14h_16h': 0,
      '16h_19h': 0,
      '19h_23h': 0
    };
  });

  // Trouver la ligne d'en-tête
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(10, allData.length); i++) {
    const row = allData[i];
    if (row && row.some(cell => cell && cell.toString().includes('JOUR'))) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    headerRowIndex = 0;
  }

  // Extraction des données (colonnes : 6=JOUR, 7=TRANCHE, N=13, T=19, Z=25)
  for (let i = headerRowIndex + 1; i < allData.length; i++) {
    const row = allData[i];
    if (!row || row.length < 26) continue;

    const jourCell = row[6];
    const trancheCell = row[7];
    const ticketsPDVS1 = parseFloat(row[13]) || 0;  // Colonne N (S-1)
    const ticketsPDVAS1 = parseFloat(row[19]) || 0; // Colonne T (AS-1)
    const ticketsPDVS2 = parseFloat(row[25]) || 0;  // Colonne Z (S-2)

    if (!jourCell || !trancheCell) continue;

    const jourStr = jourCell.toString().toLowerCase();
    const tranche = trancheCell.toString();

    // Identifier le jour
    let jourKey = null;
    for (const [key, value] of Object.entries(jourMap)) {
      if (jourStr.includes(key) || jourStr.includes(value)) {
        jourKey = value;
        break;
      }
    }

    if (jourKey) {
      ticketsParJourS1[jourKey] += ticketsPDVS1;
      ticketsParJourAS1[jourKey] += ticketsPDVAS1;
      ticketsParJourS2[jourKey] += ticketsPDVS2;

      // Pour l'analyse horaire, on utilise les 3 semaines
      if (ticketsParJourTrancheS1[jourKey][tranche] !== undefined) {
        ticketsParJourTrancheS1[jourKey][tranche] += ticketsPDVS1;
        ticketsParJourTrancheAS1[jourKey][tranche] += ticketsPDVAS1;
        ticketsParJourTrancheS2[jourKey][tranche] += ticketsPDVS2;
      }
    }
  }

  // Pondérations selon le type
  const ponderations = {
    standard: { S1: 0.4, AS1: 0.3, S2: 0.3 },
    saisonnier: { S1: 0.3, AS1: 0.5, S2: 0.2 },
    fortePromo: { S1: 0.6, AS1: 0.2, S2: 0.2 }
  };

  const weights = ponderations[typePonderation];

  // Calcul des moyennes pondérées
  const ticketsParJour = {};
  let totalTicketsPDV = 0;

  Object.keys(ticketsParJourS1).forEach(jour => {
    const ticketsPonderes =
      (ticketsParJourS1[jour] * weights.S1) +
      (ticketsParJourAS1[jour] * weights.AS1) +
      (ticketsParJourS2[jour] * weights.S2);

    ticketsParJour[jour] = ticketsPonderes;
    totalTicketsPDV += ticketsPonderes;
  });

  // Calcul des poids par jour
  const poidsJours = {};
  Object.keys(ticketsParJour).forEach(jour => {
    poidsJours[jour] = totalTicketsPDV > 0
      ? ticketsParJour[jour] / totalTicketsPDV
      : 0;
  });

  // Calcul des poids par tranche horaire avec pondération des 3 semaines
  const poidsTranchesParJour = {};
  let totalTicketsMatinGlobal = 0;
  let totalTicketsMidiGlobal = 0;
  let totalTicketsSoirGlobal = 0;

  Object.keys(ticketsParJourTrancheS1).forEach(jour => {
    const tranchesS1 = ticketsParJourTrancheS1[jour];
    const tranchesAS1 = ticketsParJourTrancheAS1[jour];
    const tranchesS2 = ticketsParJourTrancheS2[jour];

    // Appliquer la pondération pour chaque tranche horaire
    const tranchesPonderees = {};
    Object.keys(tranchesS1).forEach(tranche => {
      tranchesPonderees[tranche] =
        (tranchesS1[tranche] * weights.S1) +
        (tranchesAS1[tranche] * weights.AS1) +
        (tranchesS2[tranche] * weights.S2);
    });

    const ticketsMatinJour = (tranchesPonderees['00_Autre'] || 0) + (tranchesPonderees['09h_12h'] || 0);
    const ticketsMidiJour = (tranchesPonderees['12h_14h'] || 0) + (tranchesPonderees['14h_16h'] || 0);
    const ticketsSoirJour = (tranchesPonderees['16h_19h'] || 0) + (tranchesPonderees['19h_23h'] || 0);
    const totalTicketsJour = ticketsMatinJour + ticketsMidiJour + ticketsSoirJour;

    if (totalTicketsJour > 0) {
      poidsTranchesParJour[jour] = {
        matin: ticketsMatinJour / totalTicketsJour,
        midi: ticketsMidiJour / totalTicketsJour,
        soir: ticketsSoirJour / totalTicketsJour
      };
    } else {
      poidsTranchesParJour[jour] = {
        matin: 0.6,
        midi: 0.3,
        soir: 0.1
      };
    }

    totalTicketsMatinGlobal += ticketsMatinJour;
    totalTicketsMidiGlobal += ticketsMidiJour;
    totalTicketsSoirGlobal += ticketsSoirJour;
  });

  const totalTicketsTranchesGlobal = totalTicketsMatinGlobal + totalTicketsMidiGlobal + totalTicketsSoirGlobal;
  const poidsTranchesGlobal = {
    matin: totalTicketsTranchesGlobal > 0 ? totalTicketsMatinGlobal / totalTicketsTranchesGlobal : 0.6,
    midi: totalTicketsTranchesGlobal > 0 ? totalTicketsMidiGlobal / totalTicketsTranchesGlobal : 0.3,
    soir: totalTicketsTranchesGlobal > 0 ? totalTicketsSoirGlobal / totalTicketsTranchesGlobal : 0.1
  };

  if (totalTicketsPDV === 0) {
    alert('Aucune donnée de fréquentation trouvée');
    return null;
  }

  return {
    ticketsParJour,
    poidsJours,
    totalTicketsPDV,
    poidsTranchesParJour,
    poidsTranchesGlobal,
    type: typePonderation,
    ponderations: weights
  };
};
