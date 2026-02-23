/**
 * Export Excel du planning — vue jour OU vue semaine
 *
 * Génère un fichier .xlsx avec :
 * - Colonnes séparées Code PLU et Code EAN
 * - Vue semaine : 1 colonne par jour (Lundi→Dimanche) avec tranches horaires
 * - Vue jour (legacy) : colonnes tranches du jour sélectionné
 * - Mode continu = 1 sheet, séparé = 1 sheet par famille
 * - Filtre familles (famillesImpression)
 * - Produits à quantité 0 exclus
 */
import * as XLSX from 'xlsx';

const JOURS_COMPLETS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

/**
 * Helper : quantité d'une colonne (supporte regroupements via sousKeys)
 */
function getQteColonne(tranche, tranches) {
  if (!tranches) return 0;
  if (tranche.sousKeys) {
    return tranche.sousKeys.reduce((sum, sk) => sum + (tranches[sk]?.preco || 0), 0);
  }
  return tranches[tranche.key]?.preco || 0;
}

/**
 * Construit les lignes de données pour une famille donnée — VUE JOUR (legacy)
 */
function construireLignesFamille(famille, {
  produitsParFamille,
  getProgrammesOrdonnes,
  calculerQuantites,
  colonnesVisibles,
  configuration,
  jour,
}) {
  const groupe = produitsParFamille[famille];
  if (!groupe) return [];

  const modeRepartition = configuration?.repartitionParFamille?.[famille] || 'journalier';
  const rows = [];

  const programmesDefaut = Object.keys(groupe.parProgramme);
  const programmesOrdonnes = getProgrammesOrdonnes(famille, programmesDefaut, groupe);

  programmesOrdonnes.forEach(programme => {
    const produitsProgramme = groupe.parProgramme[programme];
    if (!produitsProgramme?.length) return;

    produitsProgramme
      .filter(p => p.actif !== false)
      .forEach(produit => {
        const qtes = calculerQuantites(produit, jour, modeRepartition);
        const total = qtes.total?.preco || 0;
        if (total === 0) return;

        const histo = qtes.total?.histo || 0;

        const qteTranches = colonnesVisibles.map(tranche => {
          if (modeRepartition === 'tranches') {
            return getQteColonne(tranche, qtes.tranches);
          }
          return 0;
        });
        if (modeRepartition !== 'tranches' && qteTranches.length > 0) {
          qteTranches[qteTranches.length - 1] = total;
        }

        rows.push([
          famille,
          programme,
          produit.libellePersonnalise || produit.libelle,
          produit.plu || '',
          produit.ean13 || produit.itm8 || '',
          ...qteTranches,
          total,
          histo,
        ]);
      });
  });

  return rows;
}

/**
 * Construit les lignes de données pour une famille — VUE SEMAINE
 * Pour chaque produit, on a les tranches de chaque jour + total jour + total semaine
 */
function construireLignesFamilleSemaine(famille, {
  produitsParFamille,
  getProgrammesOrdonnes,
  calculerQuantites,
  colonnesVisibles,
  configuration,
}) {
  const groupe = produitsParFamille[famille];
  if (!groupe) return [];

  const modeRepartition = configuration?.repartitionParFamille?.[famille] || 'journalier';
  const rows = [];

  const programmesDefaut = Object.keys(groupe.parProgramme);
  const programmesOrdonnes = getProgrammesOrdonnes(famille, programmesDefaut, groupe);

  programmesOrdonnes.forEach(programme => {
    const produitsProgramme = groupe.parProgramme[programme];
    if (!produitsProgramme?.length) return;

    produitsProgramme
      .filter(p => p.actif !== false)
      .forEach(produit => {
        // Vérifier que le produit a au moins 1 unité sur la semaine
        let totalSemaine = 0;
        const donneesParJour = [];

        JOURS.forEach(jour => {
          const qtes = calculerQuantites(produit, jour, modeRepartition);
          const totalJour = qtes.total?.preco || 0;
          totalSemaine += totalJour;

          // Quantités par tranche pour ce jour
          const qteTranches = colonnesVisibles.map(tranche => {
            if (modeRepartition === 'tranches') {
              return getQteColonne(tranche, qtes.tranches);
            }
            return 0;
          });
          if (modeRepartition !== 'tranches' && qteTranches.length > 0) {
            qteTranches[qteTranches.length - 1] = totalJour;
          }

          donneesParJour.push({ qteTranches, totalJour });
        });

        if (totalSemaine === 0) return;

        // Construire la ligne : identité + [tranches jour1, total jour1, tranches jour2, total jour2, ...] + total semaine
        const row = [
          famille,
          programme,
          produit.libellePersonnalise || produit.libelle,
          produit.plu || '',
          produit.ean13 || produit.itm8 || '',
        ];

        donneesParJour.forEach(({ qteTranches, totalJour }) => {
          row.push(...qteTranches, totalJour);
        });

        row.push(totalSemaine);

        rows.push(row);
      });
  });

  return rows;
}

/**
 * Construit l'en-tête des colonnes — VUE JOUR
 */
function construireEnTete(colonnesVisibles) {
  return [
    'Famille',
    'Programme',
    'Produit',
    'Code PLU',
    'Code EAN',
    ...colonnesVisibles.map(t => t.label),
    'Total jour',
    'Historique',
  ];
}

/**
 * Construit l'en-tête des colonnes — VUE SEMAINE
 * Format : Famille | Programme | Produit | PLU | EAN | [Lundi: tranche1, tranche2..., Total] | [Mardi: ...] | ... | Total Semaine
 */
function construireEnTeteSemaine(colonnesVisibles) {
  const header = [
    'Famille',
    'Programme',
    'Produit',
    'Code PLU',
    'Code EAN',
  ];

  JOURS_COMPLETS.forEach(jour => {
    colonnesVisibles.forEach(t => {
      header.push(`${jour} - ${t.label}`);
    });
    header.push(`Total ${jour}`);
  });

  header.push('Total Semaine');

  return header;
}

/**
 * Crée un worksheet à partir des rows — VUE JOUR
 */
function creerWorksheet(header, rows, colonnesVisibles) {
  const data = [header, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(data);

  ws['!cols'] = [
    { wch: 14 },  // Famille
    { wch: 16 },  // Programme
    { wch: 30 },  // Produit
    { wch: 12 },  // Code PLU
    { wch: 14 },  // Code EAN
    ...colonnesVisibles.map(() => ({ wch: 10 })),
    { wch: 10 },  // Total jour
    { wch: 10 },  // Historique
  ];

  return ws;
}

/**
 * Crée un worksheet à partir des rows — VUE SEMAINE
 */
function creerWorksheetSemaine(header, rows, colonnesVisibles) {
  const data = [header, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(data);

  const nbColsTranches = colonnesVisibles.length;
  const cols = [
    { wch: 14 },  // Famille
    { wch: 16 },  // Programme
    { wch: 30 },  // Produit
    { wch: 12 },  // Code PLU
    { wch: 14 },  // Code EAN
  ];

  // Pour chaque jour : tranches + total jour
  for (let j = 0; j < 7; j++) {
    for (let t = 0; t < nbColsTranches; t++) {
      cols.push({ wch: 8 });
    }
    cols.push({ wch: 10 }); // Total jour
  }
  cols.push({ wch: 12 }); // Total Semaine

  ws['!cols'] = cols;

  return ws;
}

/**
 * Télécharge le workbook en fichier .xlsx
 */
function telechargerWorkbook(wb, nomFichier) {
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomFichier;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Point d'entrée : exporte le planning en Excel
 * - Par défaut : vue SEMAINE (tous les jours avec tranches)
 * - Option vueSemaine=false : vue JOUR (comportement legacy)
 */
export function handleExportExcel(jourSelectionne, params, options = {}) {
  const { modeImpression = 'continu', famillesImpression = null, vueSemaine = true } = options;
  const {
    calculerQuantites,
    getProgrammesOrdonnes,
    produitsParFamille,
    famillesTriees,
    colonnesVisiblesParFamille,
    colonnesDefaut,
    configuration,
  } = params;

  const famillesAExporter = famillesTriees.filter(f => {
    if (!famillesImpression) return true;
    return famillesImpression[f] !== false;
  });

  if (famillesAExporter.length === 0) return;

  const wb = XLSX.utils.book_new();

  if (vueSemaine) {
    // ═══ VUE SEMAINE ═══
    if (modeImpression === 'separe') {
      famillesAExporter.forEach(famille => {
        const colonnesFamille = colonnesVisiblesParFamille?.[famille] || colonnesDefaut;
        const rows = construireLignesFamilleSemaine(famille, {
          produitsParFamille,
          getProgrammesOrdonnes,
          calculerQuantites,
          colonnesVisibles: colonnesFamille,
          configuration,
        });
        if (rows.length === 0) return;
        const header = construireEnTeteSemaine(colonnesFamille);
        const ws = creerWorksheetSemaine(header, rows, colonnesFamille);
        const sheetName = famille.substring(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });
    } else {
      let colonnesMax = colonnesDefaut;
      famillesAExporter.forEach(famille => {
        const cols = colonnesVisiblesParFamille?.[famille] || colonnesDefaut;
        if (cols.length > colonnesMax.length) colonnesMax = cols;
      });

      const header = construireEnTeteSemaine(colonnesMax);
      let allRows = [];
      famillesAExporter.forEach(famille => {
        const colonnesFamille = colonnesVisiblesParFamille?.[famille] || colonnesDefaut;
        const rows = construireLignesFamilleSemaine(famille, {
          produitsParFamille,
          getProgrammesOrdonnes,
          calculerQuantites,
          colonnesVisibles: colonnesFamille,
          configuration,
        });

        // Padding si cette famille a moins de colonnes que le max
        if (colonnesFamille.length < colonnesMax.length) {
          const diff = colonnesMax.length - colonnesFamille.length;
          rows.forEach(row => {
            // Pour chaque jour, il faut ajouter les colonnes manquantes avant le total du jour
            // Structure par jour : [tranche1, tranche2, ..., totalJour]
            // On doit insérer 'diff' colonnes vides avant chaque totalJour
            const identite = row.splice(0, 5); // Famille, Programme, Produit, PLU, EAN
            const totalSemaine = row.pop(); // Dernier = total semaine

            const newRow = [...identite];
            for (let j = 0; j < 7; j++) {
              // Extraire les tranches de ce jour (colonnesFamille.length) + totalJour
              const tranchesJour = row.splice(0, colonnesFamille.length);
              const totalJour = row.splice(0, 1)[0];
              newRow.push(...tranchesJour);
              for (let d = 0; d < diff; d++) newRow.push('');
              newRow.push(totalJour);
            }
            newRow.push(totalSemaine);

            // Remplacer le contenu du row
            row.length = 0;
            row.push(...newRow);
          });
        }

        allRows = allRows.concat(rows);
      });

      if (allRows.length === 0) return;
      const ws = creerWorksheetSemaine(header, allRows, colonnesMax);
      XLSX.utils.book_append_sheet(wb, ws, 'Planning Semaine');
    }

    const semaine = configuration?.semaine || '';
    const codePDV = configuration?.codePDV || '';
    const nomFichier = `Planning-Semaine${semaine ? `-S${semaine}` : ''}${codePDV ? `-${codePDV}` : ''}.xlsx`;
    telechargerWorkbook(wb, nomFichier);

  } else {
    // ═══ VUE JOUR (legacy) ═══
    if (modeImpression === 'separe') {
      famillesAExporter.forEach(famille => {
        const colonnesFamille = colonnesVisiblesParFamille?.[famille] || colonnesDefaut;
        const buildParams = {
          produitsParFamille,
          getProgrammesOrdonnes,
          calculerQuantites,
          colonnesVisibles: colonnesFamille,
          configuration,
          jour: jourSelectionne,
        };
        const rows = construireLignesFamille(famille, buildParams);
        if (rows.length === 0) return;
        const header = construireEnTete(colonnesFamille);
        const ws = creerWorksheet(header, rows, colonnesFamille);
        const sheetName = famille.substring(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });
    } else {
      let colonnesMax = colonnesDefaut;
      famillesAExporter.forEach(famille => {
        const cols = colonnesVisiblesParFamille?.[famille] || colonnesDefaut;
        if (cols.length > colonnesMax.length) colonnesMax = cols;
      });

      const header = construireEnTete(colonnesMax);
      let allRows = [];
      famillesAExporter.forEach(famille => {
        const colonnesFamille = colonnesVisiblesParFamille?.[famille] || colonnesDefaut;
        const buildParams = {
          produitsParFamille,
          getProgrammesOrdonnes,
          calculerQuantites,
          colonnesVisibles: colonnesFamille,
          configuration,
          jour: jourSelectionne,
        };
        const familleRows = construireLignesFamille(famille, buildParams);
        if (colonnesFamille.length < colonnesMax.length) {
          const diff = colonnesMax.length - colonnesFamille.length;
          familleRows.forEach(row => {
            const totalJour = row[row.length - 2];
            const histo = row[row.length - 1];
            row.length = row.length - 2;
            for (let i = 0; i < diff; i++) row.push('');
            row.push(totalJour, histo);
          });
        }
        allRows = allRows.concat(familleRows);
      });
      if (allRows.length === 0) return;
      const ws = creerWorksheet(header, allRows, colonnesMax);
      XLSX.utils.book_append_sheet(wb, ws, 'Planning');
    }

    const jourComplet = JOURS_COMPLETS[JOURS.indexOf(jourSelectionne)] || jourSelectionne;
    const semaine = configuration?.semaine || '';
    const codePDV = configuration?.codePDV || '';
    const nomFichier = `Planning-${jourComplet}${semaine ? `-S${semaine}` : ''}${codePDV ? `-${codePDV}` : ''}.xlsx`;
    telechargerWorkbook(wb, nomFichier);
  }
}
