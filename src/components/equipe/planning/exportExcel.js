/**
 * Export Excel du planning du jour
 *
 * Génère un fichier .xlsx avec les mêmes filtres que l'impression :
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
 * Construit les lignes de données pour une famille donnée.
 * Retourne un tableau de tableaux (rows).
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

        // Quantités par tranche (colonnes spécifiques à cette famille)
        const qteTranches = colonnesVisibles.map(tranche => {
          if (modeRepartition === 'tranches') {
            return getQteColonne(tranche, qtes.tranches);
          }
          // Mode journalier : tout dans la dernière colonne
          return 0;
        });
        // En mode journalier, mettre le total dans la dernière colonne
        if (modeRepartition !== 'tranches' && qteTranches.length > 0) {
          qteTranches[qteTranches.length - 1] = total;
        }

        rows.push([
          famille,
          programme,
          produit.libellePersonnalise || produit.libelle,
          produit.plu || produit.itm8 || produit.ean13 || '',
          ...qteTranches,
          total,
          histo,
        ]);
      });
  });

  return rows;
}

/**
 * Construit l'en-tête des colonnes
 */
function construireEnTete(colonnesVisibles) {
  return [
    'Famille',
    'Programme',
    'Produit',
    'Code PLU/EAN',
    ...colonnesVisibles.map(t => t.label),
    'Total jour',
    'Historique',
  ];
}

/**
 * Crée un worksheet à partir des rows avec largeurs de colonnes
 */
function creerWorksheet(header, rows, colonnesVisibles) {
  const data = [header, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Largeurs de colonnes
  ws['!cols'] = [
    { wch: 14 },  // Famille
    { wch: 16 },  // Programme
    { wch: 30 },  // Produit
    { wch: 14 },  // Code PLU/EAN
    ...colonnesVisibles.map(() => ({ wch: 10 })),
    { wch: 10 },  // Total jour
    { wch: 10 },  // Historique
  ];

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
 * Point d'entrée : exporte le planning du jour sélectionné en Excel
 */
export function handleExportExcel(jourSelectionne, params, options = {}) {
  const { modeImpression = 'continu', famillesImpression = null } = options;
  const {
    calculerQuantites,
    getProgrammesOrdonnes,
    produitsParFamille,
    famillesTriees,
    colonnesVisiblesParFamille,
    colonnesDefaut,
    configuration,
  } = params;

  // Filtrer les familles selon la sélection
  const famillesAExporter = famillesTriees.filter(f => {
    if (!famillesImpression) return true;
    return famillesImpression[f] !== false;
  });

  if (famillesAExporter.length === 0) return;

  const wb = XLSX.utils.book_new();

  if (modeImpression === 'separe') {
    // 1 sheet par famille — chaque famille a ses propres colonnes
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
      // Nom du sheet : max 31 caractères (limite Excel)
      const sheetName = famille.substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });
  } else {
    // 1 seul sheet — utiliser le max de colonnes pour un en-tête unifié
    // Trouver les colonnes les plus larges parmi les familles exportées
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
      // Si cette famille a moins de colonnes que le max, pad with empty cells
      if (colonnesFamille.length < colonnesMax.length) {
        const diff = colonnesMax.length - colonnesFamille.length;
        familleRows.forEach(row => {
          // Insert empty cells before Total jour (2nd to last) and Historique (last)
          const totalJour = row[row.length - 2];
          const histo = row[row.length - 1];
          row.length = row.length - 2; // Remove total + histo
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

  // Nom du fichier
  const jourComplet = JOURS_COMPLETS[JOURS.indexOf(jourSelectionne)] || jourSelectionne;
  const semaine = configuration?.semaine || '';
  const codePDV = configuration?.codePDV || '';
  const nomFichier = `Planning-${jourComplet}${semaine ? `-S${semaine}` : ''}${codePDV ? `-${codePDV}` : ''}.xlsx`;

  telechargerWorkbook(wb, nomFichier);
}
