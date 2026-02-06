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
  // Vérifier si le fichier est vide
  if (allData.length === 0) {
    return false;
  }

  // Vérifier la première ligne (info PDV)
  if (allData[0] && allData[0][0]) {
    const firstCellText = allData[0][0].toString();

    const pdvMatch = firstCellText.match(/PDV:?\s*(\d+)\s*-\s*(.+?)(?:\s*Date|$)/i);
  }

  // Chercher la ligne d'en-tête avec "ITM8"
  let headerRowIndex = -1;
  for (let i = 0; i < allData.length; i++) {
    if (allData[i] && allData[i][0] && allData[i][0].toString().toLowerCase().includes('itm8')) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    return false;
  }

  // Vérifier les colonnes
  const headers = allData[headerRowIndex];

  const libelleIndex = headers.findIndex(h => h && h.toString().toLowerCase().includes('libellé'));
  const dateIndex = headers.findIndex(h => h && h.toString().toLowerCase() === 'date');
  const quantiteIndex = headers.findIndex(h => h && h.toString().toLowerCase().includes('quantité'));

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

  if (produitsDetectes.size === 0) {
    return false;
  }

  if (datesDetectees.size === 0) {
    return false;
  }

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
    throw new Error('Erreur dans le fichier de ventes.');
  }

  // Extraire info PDV de la première ligne
  let pdvInfo = null;
  if (allData[0] && allData[0][0]) {
    const firstCellText = allData[0][0].toString();
    const pdvMatch = firstCellText.match(/PDV:?\s*(\d+)\s*-\s*(.+?)(?:\s*Date|$)/i);
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
    throw new Error('Format de fichier non reconnu. La ligne d\'en-tête avec "ITM8 Prio" est introuvable.');
  }

  // Les données commencent à headerRowIndex + 1
  const headers = allData[headerRowIndex];
  const dataRows = allData.slice(headerRowIndex + 1);

  // Trouver les indices des colonnes importantes
  const itm8Index = headers.findIndex(h => h && h.toString().toLowerCase().includes('itm8'));
  const libelleIndex = headers.findIndex(h => h && h.toString().toLowerCase().includes('libellé'));
  const dateIndex = headers.findIndex(h => h && h.toString().toLowerCase() === 'date');
  const quantiteIndex = headers.findIndex(h => h && h.toString().toLowerCase().includes('quantité'));

  if (libelleIndex === -1 || dateIndex === -1 || quantiteIndex === -1) {
    throw new Error('Colonnes requises introuvables (Libellé, Date, Quantité)');
  }

  // Regrouper les données par produit et par date
  // Structure: Map<libelle, { ventesParJour: {}, itm8: number }>
  const produitsMap = new Map();

  dataRows.forEach(row => {
    const itm8Raw = row[itm8Index];
    const libelle = row[libelleIndex];
    const date = row[dateIndex];
    const quantite = parseFloat(row[quantiteIndex]) || 0;

    if (!libelle || !date || libelle.toString().trim() === '') return;

    const libelleStr = libelle.toString().trim();

    // Ignorer la ligne "BOULANGERIE PATISSERIE" (ligne de catégorie)
    if (libelleStr === 'BOULANGERIE PATISSERIE') return;

    // Extraire l'ITM8 (peut être un nombre ou une chaîne)
    let itm8 = null;
    if (itm8Raw !== undefined && itm8Raw !== null && itm8Raw !== '') {
      const itm8Num = parseInt(itm8Raw);
      if (!isNaN(itm8Num)) {
        itm8 = itm8Num;
      }
    }

    if (!produitsMap.has(libelleStr)) {
      produitsMap.set(libelleStr, {
        ventesParJour: {},
        itm8: itm8
      });
    }

    const dateStr = date.toString();
    const produitData = produitsMap.get(libelleStr);
    produitData.ventesParJour[dateStr] = (produitData.ventesParJour[dateStr] || 0) + quantite;

    // Si on trouve un ITM8 et qu'on n'en avait pas encore, on le met à jour
    if (itm8 && !produitData.itm8) {
      produitData.itm8 = itm8;
    }
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
  // Vérifier si le fichier est vide
  if (allData.length === 0) {
    return false;
  }

  // Chercher la ligne d'en-tête avec "JOUR"
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(10, allData.length); i++) {
    const row = allData[i];
    if (row && row.some(cell => cell && cell.toString().includes('JOUR'))) {
      headerRowIndex = i;
      break;
    }
  }

  // Vérifier qu'il y a assez de colonnes
  const sampleRow = allData[headerRowIndex >= 0 ? headerRowIndex + 1 : 1];
  if (!sampleRow || sampleRow.length < 22) {
    return false;
  }

  // Vérifier quelques lignes de données
  let joursDetectes = new Set();
  let tranchesDetectees = new Set();
  let lignesAvecDonnees = 0;

  for (let i = (headerRowIndex >= 0 ? headerRowIndex + 1 : 1); i < Math.min(allData.length, 50); i++) {
    const row = allData[i];
    if (!row || row.length < 22) continue;

    const jour = row[6];
    const tranche = row[7];
    const qteTotBVPS1 = parseFloat(row[9]) || 0;  // Colonne J (index 9)

    if (jour) joursDetectes.add(jour.toString());
    if (tranche) tranchesDetectees.add(tranche.toString());
    if (qteTotBVPS1 > 0) lignesAvecDonnees++;
  }

  if (lignesAvecDonnees === 0) {
    return false;
  }

  return true;
};

/**
 * Parse le fichier de fréquentation Excel avec pondération multi-semaines
 * @param {ArrayBuffer} arrayBuffer - Le contenu du fichier
 * @param {string} typePonderation - Type de pondération: 'standard', 'saisonnier', 'fortePromo'
 * @param {string} sourcePonderation - Source des données: 'BVP' (Rayon) ou 'PDV' (Total Magasin)
 */
export const parseFrequentationExcel = (arrayBuffer, typePonderation = 'standard', sourcePonderation = 'BVP') => {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const allData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

  // 🔍 DIAGNOSTIC
  const diagnosticOk = diagnostiquerFrequentation(allData);
  if (!diagnosticOk) {
    throw new Error('Erreur dans le fichier de fréquentation.');
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
  const qteTotParJourS1 = {};
  const qteTotParJourAS1 = {};
  const qteTotParJourS2 = {};
  const qteTotParJourTrancheS1 = {};
  const qteTotParJourTrancheAS1 = {};
  const qteTotParJourTrancheS2 = {};

  Object.values(jourMap).forEach(jour => {
    qteTotParJourS1[jour] = 0;
    qteTotParJourAS1[jour] = 0;
    qteTotParJourS2[jour] = 0;
    qteTotParJourTrancheS1[jour] = {
      '00_Autre': 0,
      '09h_12h': 0,
      '12h_14h': 0,
      '14h_16h': 0,
      '16h_19h': 0,
      '19h_23h': 0
    };
    qteTotParJourTrancheAS1[jour] = {
      '00_Autre': 0,
      '09h_12h': 0,
      '12h_14h': 0,
      '14h_16h': 0,
      '16h_19h': 0,
      '19h_23h': 0
    };
    qteTotParJourTrancheS2[jour] = {
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

  // Définition des colonnes
  // BVP : J(9), P(15), V(21)
  // PDV : M(12), S(18), Y(24)
  const colsBVP = { S1: 9, AS1: 15, S2: 21 };
  const colsPDV = { S1: 12, AS1: 18, S2: 24 };
  const cols = sourcePonderation === 'PDV' ? colsPDV : colsBVP;

  // Données BVP séparées (toujours extraites pour l'historique)
  const qteTotParJourS1_BVP = {};
  const qteTotParJourAS1_BVP = {};
  const qteTotParJourS2_BVP = {};
  const qteTotParJourTrancheS1_BVP = {};
  const qteTotParJourTrancheAS1_BVP = {};
  const qteTotParJourTrancheS2_BVP = {};

  Object.values(jourMap).forEach(jour => {
    qteTotParJourS1_BVP[jour] = 0;
    qteTotParJourAS1_BVP[jour] = 0;
    qteTotParJourS2_BVP[jour] = 0;
    qteTotParJourTrancheS1_BVP[jour] = {
      '00_Autre': 0, '09h_12h': 0, '12h_14h': 0, '14h_16h': 0, '16h_19h': 0, '19h_23h': 0
    };
    qteTotParJourTrancheAS1_BVP[jour] = {
      '00_Autre': 0, '09h_12h': 0, '12h_14h': 0, '14h_16h': 0, '16h_19h': 0, '19h_23h': 0
    };
    qteTotParJourTrancheS2_BVP[jour] = {
      '00_Autre': 0, '09h_12h': 0, '12h_14h': 0, '14h_16h': 0, '16h_19h': 0, '19h_23h': 0
    };
  });

  // Extraction des données
  for (let i = headerRowIndex + 1; i < allData.length; i++) {
    const row = allData[i];
    if (!row || row.length < 25) continue; // Besoin d'aller jusqu'à Y(24) min

    const jourCell = row[6];
    const trancheCell = row[7];
    const qteS1 = parseFloat(row[cols.S1]) || 0;
    const qteAS1 = parseFloat(row[cols.AS1]) || 0;
    const qteS2 = parseFloat(row[cols.S2]) || 0;

    // Toujours extraire les données BVP pour l'historique
    const qteS1_BVP = parseFloat(row[colsBVP.S1]) || 0;
    const qteAS1_BVP = parseFloat(row[colsBVP.AS1]) || 0;
    const qteS2_BVP = parseFloat(row[colsBVP.S2]) || 0;

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
      // Données source sélectionnée (pour préconisation)
      qteTotParJourS1[jourKey] += qteS1;
      qteTotParJourAS1[jourKey] += qteAS1;
      qteTotParJourS2[jourKey] += qteS2;

      // Données BVP (pour historique - ce que l'équipe fait habituellement)
      qteTotParJourS1_BVP[jourKey] += qteS1_BVP;
      qteTotParJourAS1_BVP[jourKey] += qteAS1_BVP;
      qteTotParJourS2_BVP[jourKey] += qteS2_BVP;

      // Pour l'analyse horaire, on utilise les 3 semaines
      if (qteTotParJourTrancheS1[jourKey][tranche] !== undefined) {
        qteTotParJourTrancheS1[jourKey][tranche] += qteS1;
        qteTotParJourTrancheAS1[jourKey][tranche] += qteAS1;
        qteTotParJourTrancheS2[jourKey][tranche] += qteS2;

        // BVP séparé
        qteTotParJourTrancheS1_BVP[jourKey][tranche] += qteS1_BVP;
        qteTotParJourTrancheAS1_BVP[jourKey][tranche] += qteAS1_BVP;
        qteTotParJourTrancheS2_BVP[jourKey][tranche] += qteS2_BVP;
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
  const qteTotParJour = {};
  let totalQteTot = 0;

  Object.keys(qteTotParJourS1).forEach(jour => {
    const qteTotPonderee =
      (qteTotParJourS1[jour] * weights.S1) +
      (qteTotParJourAS1[jour] * weights.AS1) +
      (qteTotParJourS2[jour] * weights.S2);

    qteTotParJour[jour] = qteTotPonderee;
    totalQteTot += qteTotPonderee;
  });

  // Calcul des poids par jour
  const poidsJours = {};
  Object.keys(qteTotParJour).forEach(jour => {
    poidsJours[jour] = totalQteTot > 0
      ? qteTotParJour[jour] / totalQteTot
      : 0;
  });

  // Calcul des poids par tranche horaire avec pondération des 3 semaines
  const poidsTranchesParJour = {};
  const poidsTranchesDetail = {}; // Nouveau : détail précis pour les coupures 13h
  let totalQteTotMatinGlobal = 0;
  let totalQteTotMidiGlobal = 0;
  let totalQteTotSoirGlobal = 0;

  Object.keys(qteTotParJourTrancheS1).forEach(jour => {
    const tranchesS1 = qteTotParJourTrancheS1[jour];
    const tranchesAS1 = qteTotParJourTrancheAS1[jour];
    const tranchesS2 = qteTotParJourTrancheS2[jour];

    // Appliquer la pondération pour chaque tranche horaire
    const tranchesPonderees = {};
    Object.keys(tranchesS1).forEach(tranche => {
      tranchesPonderees[tranche] =
        (tranchesS1[tranche] * weights.S1) +
        (tranchesAS1[tranche] * weights.AS1) +
        (tranchesS2[tranche] * weights.S2);
    });

    const qteTotMatinJour = (tranchesPonderees['00_Autre'] || 0) + (tranchesPonderees['09h_12h'] || 0);
    const qteTotMidiJour = (tranchesPonderees['12h_14h'] || 0) + (tranchesPonderees['14h_16h'] || 0);
    const qteTotSoirJour = (tranchesPonderees['16h_19h'] || 0) + (tranchesPonderees['19h_23h'] || 0);
    const totalQteTotJour = qteTotMatinJour + qteTotMidiJour + qteTotSoirJour;

    // Stocker le détail pondéré pour usage ultérieur (fermetures partielles)
    poidsTranchesDetail[jour] = {
      ...tranchesPonderees,
      total: totalQteTotJour
    };

    if (totalQteTotJour > 0) {
      poidsTranchesParJour[jour] = {
        matin: qteTotMatinJour / totalQteTotJour,
        midi: qteTotMidiJour / totalQteTotJour,
        soir: qteTotSoirJour / totalQteTotJour
      };
    } else {
      poidsTranchesParJour[jour] = {
        matin: 0.6,
        midi: 0.3,
        soir: 0.1
      };
    }

    totalQteTotMatinGlobal += qteTotMatinJour;
    totalQteTotMidiGlobal += qteTotMidiJour;
    totalQteTotSoirGlobal += qteTotSoirJour;
  });

  const totalQteTotTranchesGlobal = totalQteTotMatinGlobal + totalQteTotMidiGlobal + totalQteTotSoirGlobal;
  const poidsTranchesGlobal = {
    matin: totalQteTotTranchesGlobal > 0 ? totalQteTotMatinGlobal / totalQteTotTranchesGlobal : 0.6,
    midi: totalQteTotTranchesGlobal > 0 ? totalQteTotMidiGlobal / totalQteTotTranchesGlobal : 0.3,
    soir: totalQteTotTranchesGlobal > 0 ? totalQteTotSoirGlobal / totalQteTotTranchesGlobal : 0.1
  };

  // ========== CALCUL DES POIDS BVP POUR L'HISTORIQUE ==========
  // Ces poids représentent ce que l'équipe BVP fait habituellement
  // Ils sont toujours calculés, même si la source sélectionnée est PDV
  const poidsTranchesParJour_BVP = {};

  Object.keys(qteTotParJourTrancheS1_BVP).forEach(jour => {
    const tranchesS1 = qteTotParJourTrancheS1_BVP[jour];
    const tranchesAS1 = qteTotParJourTrancheAS1_BVP[jour];
    const tranchesS2 = qteTotParJourTrancheS2_BVP[jour];

    // Appliquer la même pondération temporelle aux données BVP
    const tranchesPonderees = {};
    Object.keys(tranchesS1).forEach(tranche => {
      tranchesPonderees[tranche] =
        (tranchesS1[tranche] * weights.S1) +
        (tranchesAS1[tranche] * weights.AS1) +
        (tranchesS2[tranche] * weights.S2);
    });

    const qteTotMatinJour = (tranchesPonderees['00_Autre'] || 0) + (tranchesPonderees['09h_12h'] || 0);
    const qteTotMidiJour = (tranchesPonderees['12h_14h'] || 0) + (tranchesPonderees['14h_16h'] || 0);
    const qteTotSoirJour = (tranchesPonderees['16h_19h'] || 0) + (tranchesPonderees['19h_23h'] || 0);
    const totalQteTotJour = qteTotMatinJour + qteTotMidiJour + qteTotSoirJour;

    if (totalQteTotJour > 0) {
      poidsTranchesParJour_BVP[jour] = {
        matin: qteTotMatinJour / totalQteTotJour,
        midi: qteTotMidiJour / totalQteTotJour,
        soir: qteTotSoirJour / totalQteTotJour
      };
    } else {
      poidsTranchesParJour_BVP[jour] = {
        matin: 0.6,
        midi: 0.3,
        soir: 0.1
      };
    }
  });

  if (totalQteTot === 0) {
    throw new Error('Aucune donnée de quantité totale trouvée dans le fichier de fréquentation');
  }

  return {
    qteTotParJour,
    poidsJours,
    totalQteTot,
    poidsTranchesParJour,
    poidsTranchesGlobal,
    poidsTranchesDetail,
    poidsTranchesParJour_BVP, // Poids BVP pour l'historique (ce que l'équipe fait)
    type: typePonderation,
    source: sourcePonderation,
    ponderations: weights
  };
};
