/**
 * Fonctions d'impression pour le planning
 * Format V2-style : Rayon, Type de cuisson, Code PLU, Désignation, Remarque,
 * tranches horaires dynamiques, Stock rayon, À cuire
 * (colonne Perte supprimée — non utilisée)
 */

// Configuration des 6 tranches horaires (copie locale nécessaire pour l'impression)
const TRANCHES_CONFIG = [
  { key: '00_Autre', label: 'Avant 9h', plage: '00h-09h' },
  { key: '09h_12h', label: '9h-12h', plage: '09h-12h' },
  { key: '12h_14h', label: '12h-14h', plage: '12h-14h' },
  { key: '14h_16h', label: '14h-16h', plage: '14h-16h' },
  { key: '16h_19h', label: '16h-19h', plage: '16h-19h' },
  { key: '19h_23h', label: 'Après 19h', plage: '19h-23h' },
];

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const JOURS_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const JOURS_COMPLETS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

// Couleurs par famille (Mousquetaires theme)
const COULEURS_FAMILLES_PRINT = {
  BOULANGERIE: '#FF8C42',
  VIENNOISERIE: '#4A90E2',
  PATISSERIE: '#9B59B6',
  SNACKING: '#27AE60',
  AUTRE: '#95A5A6',
};

/**
 * Génère le HTML pour une fiche d'un jour donné (format V2)
 * @param {string} jour - Clé du jour (lundi, mardi, etc.)
 * @param {object} params - Toutes les données nécessaires
 */
export function genererFicheJourHTML(jour, {
  calculerQuantites,
  getProgrammesOrdonnes,
  getDateJour,
  produitsParFamille,
  famillesTriees,
  colonnesVisiblesParFamille,
  colonnesDefaut,
  configuration,
  modeImpression = 'continu',
  famillesImpression = null,
}) {
  const jourIndex = JOURS.indexOf(jour);
  const jourLabel = JOURS_LABELS[jourIndex];
  const jourComplet = JOURS_COMPLETS[jourIndex];
  const maintenant = new Date().toLocaleDateString('fr-FR');

  // Calculer la date complète du jour
  // 1) Essayer via getDateJour (utilise configuration.dateDebut)
  let dateJourBrut = getDateJour(jour);
  // 2) Fallback : calculer depuis semaine + année si getDateJour n'a pas pu résoudre
  if (dateJourBrut === jour && configuration?.semaine && configuration?.annee) {
    try {
      // Calcul ISO : le lundi de la semaine ISO donnée
      const jan4 = new Date(configuration.annee, 0, 4);
      const dayOfWeek = jan4.getDay() || 7;
      const lundi = new Date(jan4);
      lundi.setDate(jan4.getDate() - dayOfWeek + 1 + (configuration.semaine - 1) * 7);
      const dateJour = new Date(lundi);
      dateJour.setDate(lundi.getDate() + jourIndex);
      dateJourBrut = dateJour.toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });
    } catch { /* fallback au jourComplet */ }
  }

  // Formater : première lettre en majuscule → "Mardi 25 Février 2026"
  const dateJourFormatee = typeof dateJourBrut === 'string' && dateJourBrut !== jour
    ? dateJourBrut.replace(/^./, c => c.toUpperCase())
    : jourComplet;

  // Info PDV et pondération (ajoutés dans AccueilEquipe.jsx)
  const codePDV = configuration?.codePDV || '';
  const nomPDV = configuration?.nomPDV || '';
  const typePonderation = configuration?.typePonderation || '';
  const magasinDisplay = codePDV ? `PDV ${codePDV} - ${nomPDV}` : (configuration?.magasin || '');

  // Helper pour obtenir la quantité d'une colonne (supporte regroupements)
  const getQteColonnePrint = (tranche, tranches) => {
    if (!tranches) return 0;
    if (tranche.sousKeys) {
      return tranche.sousKeys.reduce((sum, sk) => sum + (tranches[sk]?.preco || 0), 0);
    }
    return tranches[tranche.key]?.preco || 0;
  };

  // Helper pour construire les en-têtes de tranches
  const buildTranchesHeaders = (tranchesAffichees) => {
    return tranchesAffichees.map(t => {
      const label = t.label.includes('-')
        ? t.label.replace('-', '<br>')
        : t.label;
      return `<th class="tranche">${label}</th>`;
    }).join('');
  };

  // Helper pour construire un tableau complet pour une famille
  const construireTableauFamille = (famille) => {
    const groupe = produitsParFamille[famille];
    if (!groupe) return '';

    const tranchesAffichees = colonnesVisiblesParFamille?.[famille] || colonnesDefaut || TRANCHES_CONFIG;
    const nbTranches = tranchesAffichees.length;
    const tranchesHeadersHTML = buildTranchesHeaders(tranchesAffichees);

    const modeRepartition = configuration?.repartitionParFamille?.[famille] || 'journalier';
    let lignesHTML = '';

    const programmesDefaut = Object.keys(groupe.parProgramme);
    const programmesOrdonnes = getProgrammesOrdonnes(famille, programmesDefaut, groupe);

    programmesOrdonnes.forEach(programme => {
      const produitsProgramme = groupe.parProgramme[programme];
      if (!produitsProgramme?.length) return;

      const capaciteTranches = tranchesAffichees.map(() => 0);
      let capaciteTotal = 0;

      produitsProgramme
        .filter(p => p.actif !== false)
        .forEach((produit) => {
          const qtes = calculerQuantites(produit, jour, modeRepartition);
          const total = qtes.total?.preco || 0;
          if (total === 0) return;

          const upp = produit.unitesParPlaque || 0;

          const formatQte = (qte) => {
            if (produit.unitesParLot && produit.unitesParLot > 1) {
              return `<strong>${qte}</strong><sub>(=${qte * produit.unitesParLot})</sub>`;
            }
            return `<strong>${qte}</strong>`;
          };

          let tranchesColsHTML = '';
          if (modeRepartition === 'tranches') {
            tranchesAffichees.forEach((tranche, i) => {
              const qte = getQteColonnePrint(tranche, qtes.tranches);
              if (upp > 0) capaciteTranches[i] += qte / upp;
              const isDerniere = i === nbTranches - 1;
              tranchesColsHTML += `<td class="qte ${isDerniere ? 'derniere' : ''}">${formatQte(qte)}</td>`;
            });
          } else {
            tranchesAffichees.forEach((_, i) => {
              if (i === nbTranches - 1) {
                tranchesColsHTML += `<td class="qte derniere">${formatQte(total)}</td>`;
                if (upp > 0) capaciteTranches[i] += total / upp;
              } else {
                tranchesColsHTML += `<td class="qte">-</td>`;
              }
            });
          }

          if (upp > 0) capaciteTotal += total / upp;

          lignesHTML += `
              <tr>
                <td class="rayon">${famille}</td>
                <td class="prog">${programme}</td>
                <td class="plu">${produit.plu || produit.itm8 || ''}</td>
                <td class="article">${produit.libellePersonnalise || produit.libelle}</td>
                <td class="remarque">${produit.remarque || ''}</td>
                ${tranchesColsHTML}
                <td class="stock"></td>
                <td class="acuire"></td>
              </tr>
            `;
        });

      if (capaciteTotal > 0) {
        const capaciteColsHTML = capaciteTranches.map((cap) =>
          `<td class="qte cap">${cap > 0 ? cap.toFixed(1) + ' Pl.' : '-'}</td>`
        ).join('');

        lignesHTML += `
            <tr class="capacite">
              <td class="rayon">${famille}</td>
              <td class="prog">${programme}</td>
              <td class="plu">Capacité</td>
              <td class="article"></td>
              <td class="remarque"></td>
              ${capaciteColsHTML}
              <td class="stock cap"></td>
              <td class="acuire total">Total: ${capaciteTotal.toFixed(1)} Pl.</td>
            </tr>
          `;
      }
    });

    if (!lignesHTML) return '';

    return `
        <table>
          <thead>
            <tr>
              <th class="col-rayon">Rayon</th>
              <th class="col-prog">Prog</th>
              <th class="col-plu">Code PLU</th>
              <th class="col-article">Article</th>
              <th class="col-remarque">Remarque</th>
              ${tranchesHeadersHTML}
              <th class="col-stock">Stock<br>rayon</th>
              <th class="col-acuire">A cuire</th>
            </tr>
          </thead>
          <tbody>
            ${lignesHTML}
          </tbody>
        </table>`;
  };

  // Filtrer les familles selon la sélection d'impression (objet { BOULANGERIE: true, ... } ou null = toutes)
  const famillesAImprimer = famillesTriees.filter(f => {
    if (!famillesImpression) return true;
    return famillesImpression[f] !== false;
  });

  if (famillesAImprimer.length === 0) return '';

  // --- Mode "séparé par famille" : une page A4 par famille avec bandeau coloré ---
  if (modeImpression === 'separe') {
    return famillesAImprimer.map(famille => {
      const tableauHTML = construireTableauFamille(famille);
      if (!tableauHTML) return '';

      const couleur = COULEURS_FAMILLES_PRINT[famille.toUpperCase()] || '#333';

      return `
      <div class="page">
        <div class="header">
          <div class="header-top">
            <span class="header-label">Planning</span>
            <span class="header-jour">${dateJourFormatee}</span>
          </div>
          <div class="famille-bandeau" style="background: ${couleur};">
            ${famille} — ${dateJourFormatee} — ${magasinDisplay || ''}
          </div>
          <div class="header-info">
            ${magasinDisplay ? magasinDisplay + ' | ' : ''}Impression: ${maintenant}${typePonderation ? ` | Pondération: ${typePonderation}` : ''}
          </div>
        </div>

        ${tableauHTML}

        <div class="formula">
          <strong>📌 Dernière cuisson :</strong> À cuire = Préco (colonne jaune) − Stock rayon &nbsp;&nbsp;|&nbsp;&nbsp; Si stock ≥ préco → ne pas cuire
        </div>

        <div class="footer">
          BVP Planning V5 • ${magasinDisplay} • ${dateJourFormatee} • ${famille}
        </div>
      </div>`;
    }).filter(Boolean).join('\n');
  }

  // --- Mode "continu" (défaut) : toutes les familles enchaînées ---
  const tableauxHTML = famillesAImprimer.map(famille => construireTableauFamille(famille)).filter(Boolean);

  if (tableauxHTML.length === 0) return '';

  return `
  <div class="page">
    <div class="header">
      <div class="header-top">
        <span class="header-label">Planning</span>
        <span class="header-jour">${dateJourFormatee}</span>
      </div>
      <div class="header-info">
        ${magasinDisplay ? magasinDisplay + ' | ' : ''}Impression: ${maintenant}${typePonderation ? ` | Pondération: ${typePonderation}` : ''}
      </div>
    </div>

    ${tableauxHTML.join('\n')}

    <div class="formula">
      <strong>📌 Dernière cuisson :</strong> À cuire = Préco (colonne jaune) − Stock rayon &nbsp;&nbsp;|&nbsp;&nbsp; Si stock ≥ préco → ne pas cuire
    </div>

    <div class="footer">
      BVP Planning V5 • ${magasinDisplay} • ${dateJourFormatee}
    </div>
  </div>`;
}

/**
 * CSS commun pour les fiches d'impression (format V2 — noir et blanc, professionnel)
 */
export function getFicheCSS() {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4 portrait; margin: 5mm; }
    body { font-family: Arial, sans-serif; font-size: 8px; line-height: 1.2; }

    .page { page-break-after: always; }
    .page:last-child { page-break-after: avoid; }

    /* ── En-tête V2-style ── */
    .header { margin-bottom: 4px; padding-bottom: 3px; border-bottom: 2px solid #000; }
    .header-top { display: flex; align-items: baseline; gap: 4px; }
    .header-label { font-size: 8px; }
    .header-jour { font-size: 16px; font-weight: bold; text-transform: capitalize; }
    .header-info { font-size: 7px; color: #444; margin-top: 1px; }

    /* ── Tableau ── */
    table { width: 100%; border-collapse: collapse; border: 1px solid #000; }
    th, td { border: 1px solid #000; padding: 1px 3px; text-align: center; vertical-align: middle; }

    /* En-têtes de colonnes */
    th { background: #e8e8e8; font-weight: bold; font-size: 7px; }
    th.col-rayon { width: 50px; font-size: 8px; }
    th.col-prog { width: 50px; font-size: 8px; }
    th.col-plu { width: 38px; font-size: 8px; }
    th.col-article { font-size: 8px; }
    th.col-remarque { width: 50px; font-size: 7px; }
    th.tranche { width: 38px; font-size: 7px; line-height: 1.1; }
    th.col-stock { width: 32px; font-size: 7px; line-height: 1.1; }
    th.col-acuire { width: 32px; font-size: 7px; }

    /* Cellules de données */
    td.rayon { font-size: 6px; font-weight: bold; text-align: left; background: #f5f5f5; }
    td.prog { font-size: 5.5px; text-align: left; background: #f5f5f5; }
    td.plu { font-size: 7px; }
    td.article { text-align: left; font-size: 8px; font-weight: bold; }
    td.remarque { font-size: 6px; }
    td.qte { font-size: 11px; font-weight: bold; width: 38px; }
    td.qte.derniere { background: #fff59d; }
    td.stock { width: 32px; background: #fff; }
    td.acuire { width: 32px; background: #c8e6c9; }

    /* Lignes de capacité */
    tr.capacite { background: #e0e0e0; }
    tr.capacite td.plu { font-style: italic; font-size: 5.5px; }
    tr.capacite td.qte { font-size: 6px; font-weight: normal; }
    tr.capacite td.total { font-weight: bold; font-size: 6px; }
    tr.capacite td.stock { background: #e0e0e0; }

    /* Sous-texte lots */
    sub { font-size: 5px; }

    /* Bandeau famille en en-tête de page */
    .famille-bandeau {
      color: #fff; padding: 3px 8px; font-weight: bold;
      font-size: 11px; letter-spacing: 0.5px; margin: 2px 0;
    }

    .footer { margin-top: 4px; font-size: 6px; color: #666; text-align: center; }
    .formula { margin-top: 3px; padding: 3px 6px; background: #e3f2fd; font-size: 7px; }
    .formula strong { color: #1565c0; }
  `;
}

/**
 * Imprimer le planning au format professionnel (jour actuel)
 */
export function handlePrintPlanningPro(jourSelectionne, params, options = {}) {
  const { modeImpression = 'continu', famillesImpression = null } = options;
  const { configuration } = params;
  const jourComplet = JOURS_COMPLETS[JOURS.indexOf(jourSelectionne)];
  const magasinDisplay = configuration?.codePDV
    ? `PDV ${configuration.codePDV} - ${configuration.nomPDV}`
    : (configuration?.magasin || '');

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Fiche ${jourComplet} - ${magasinDisplay}</title>
  <style>${getFicheCSS()}</style>
</head>
<body>
  ${genererFicheJourHTML(jourSelectionne, { ...params, modeImpression, famillesImpression })}
</body>
</html>`;

  const fenetre = window.open('', '_blank', 'width=1200,height=800');
  fenetre.document.write(html);
  fenetre.document.close();
  setTimeout(() => fenetre.print(), 300);
}

/**
 * Imprimer la semaine complète (7 fiches, une par jour)
 */
export function handlePrintSemaine(params, options = {}) {
  const { modeImpression = 'continu', famillesImpression = null } = options;
  const { configuration } = params;
  const magasinDisplay = configuration?.codePDV
    ? `PDV ${configuration.codePDV} - ${configuration.nomPDV}`
    : (configuration?.magasin || '');

  // Générer les 7 fiches
  const pagesHTML = JOURS.map(jour => genererFicheJourHTML(jour, { ...params, modeImpression, famillesImpression })).join('\n');

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Planning Semaine ${configuration?.semaine || ''} - ${magasinDisplay}</title>
  <style>${getFicheCSS()}</style>
</head>
<body>
  ${pagesHTML}
</body>
</html>`;

  const fenetre = window.open('', '_blank', 'width=1200,height=800');
  fenetre.document.write(html);
  fenetre.document.close();
  setTimeout(() => fenetre.print(), 300);
}
