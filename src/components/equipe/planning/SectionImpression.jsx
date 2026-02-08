/**
 * Fonctions d'impression pour le planning
 * Extraites de PlanningJour.jsx - aucune modification de logique
 *
 * Ces fonctions sont des utilitaires purs qui reçoivent toutes les données
 * nécessaires en paramètres au lieu de lire l'état du composant directement.
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

/**
 * Génère le HTML pour une fiche d'un jour donné (réutilisable)
 * @param {string} jour - Clé du jour (lundi, mardi, etc.)
 * @param {object} params - Toutes les données nécessaires
 * @param {function} params.calculerQuantites - Fonction de calcul des quantités
 * @param {function} params.getProgrammesOrdonnes - Fonction d'ordonnancement des programmes
 * @param {function} params.getDateJour - Fonction pour obtenir la date formatée
 * @param {object} params.produitsParFamille - Produits groupés par famille
 * @param {string[]} params.famillesTriees - Ordre des familles
 * @param {object[]} params.colonnesVisibles - Colonnes de tranches à afficher
 * @param {object} params.configuration - Configuration du magasin
 */
export function genererFicheJourHTML(jour, {
  calculerQuantites,
  getProgrammesOrdonnes,
  getDateJour,
  produitsParFamille,
  famillesTriees,
  colonnesVisibles,
  configuration,
}) {
  const jourLabel = JOURS_LABELS[JOURS.indexOf(jour)];
  const dateJour = getDateJour(jour);
  const maintenant = new Date().toLocaleDateString('fr-FR');

  // Utiliser les colonnes configurées par le manager
  const tranchesAffichees = colonnesVisibles || TRANCHES_CONFIG;
  const nbTranches = tranchesAffichees.length;

  // Helper pour obtenir la quantité d'une colonne (supporte regroupements)
  const getQteColonnePrint = (tranche, tranches) => {
    if (!tranches) return 0;
    if (tranche.sousKeys) {
      return tranche.sousKeys.reduce((sum, sk) => sum + (tranches[sk]?.preco || 0), 0);
    }
    return tranches[tranche.key]?.preco || 0;
  };

  // Construire les en-têtes des tranches
  const tranchesHeadersHTML = tranchesAffichees.map(t =>
    `<th class="double">${t.label.replace('-', '<br>')}</th>`
  ).join('');

  // Construire les lignes par famille et programme
  let lignesHTML = '';
  famillesTriees.forEach(famille => {
    const groupe = produitsParFamille[famille];
    if (!groupe) return;
    const modeRepartition = configuration?.repartitionParFamille?.[famille] || 'journalier';

    // Grouper par programme
    const programmesDefaut = Object.keys(groupe.parProgramme);
    const programmesOrdonnes = getProgrammesOrdonnes(famille, programmesDefaut, groupe);

    programmesOrdonnes.forEach(programme => {
      const produitsProgramme = groupe.parProgramme[programme];
      if (!produitsProgramme?.length) return;

      // Totaux capacité en plaques par tranche pour ce programme
      const capaciteTranches = tranchesAffichees.map(() => 0);
      let capaciteTotal = 0;

      produitsProgramme
        .filter(p => p.actif !== false)
        .forEach((produit, idx) => {
          const qtes = calculerQuantites(produit, jour, modeRepartition);
          const total = qtes.total?.preco || 0;
          if (total === 0) return; // Ne pas afficher produits à 0

          // Calcul capacité (en plaques)
          const upp = produit.unitesParPlaque || 0;

          // Format quantité avec unités si lot (ex: 2(=8))
          const formatQte = (qte) => {
            if (produit.unitesParLot && produit.unitesParLot > 1) {
              return `${qte}<sub>(=${qte * produit.unitesParLot})</sub>`;
            }
            return qte;
          };

          // Colonnes de quantités par tranche
          let tranchesColsHTML = '';
          if (modeRepartition === 'tranches') {
            tranchesAffichees.forEach((tranche, i) => {
              const qte = getQteColonnePrint(tranche, qtes.tranches);
              if (upp > 0) capaciteTranches[i] += qte / upp;
              const isDerniere = i === nbTranches - 1;
              tranchesColsHTML += `<td class="qte ${isDerniere ? 'derniere' : ''}">${formatQte(qte)}</td>`;
            });
          } else {
            // Mode journalier : une seule colonne
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
                <td class="pertes"></td>
              </tr>
            `;
        });

      // Ligne de capacité
      if (capaciteTotal > 0) {
        const capaciteColsHTML = capaciteTranches.map((cap, i) =>
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
              <td class="stock"></td>
              <td class="acuire total">Total: ${capaciteTotal.toFixed(1)} Pl.</td>
              <td class="pertes"></td>
            </tr>
          `;
      }
    });
  });

  return `
  <div class="page">
    <div class="header">
      <h1>Planning ${jourLabel} - S${configuration?.semaine || ''}</h1>
      <div class="info">${configuration?.magasin || ''} | ${dateJour} | Imprimé le ${maintenant}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Rayon</th>
          <th>Prog</th>
          <th>PLU</th>
          <th>Article</th>
          <th class="remarque">Remarque</th>
          ${tranchesHeadersHTML}
          <th class="double">Stock</th>
          <th>Cuire</th>
          <th>Perte</th>
        </tr>
      </thead>
      <tbody>
        ${lignesHTML}
      </tbody>
    </table>

    <div class="formula">
      <strong>📌 Dernière cuisson :</strong> À cuire = Préco (colonne jaune) − Stock rayon &nbsp;&nbsp;|&nbsp;&nbsp; Si stock ≥ préco → ne pas cuire
    </div>

    <div class="footer">
      BVP Planning V5 • ${configuration?.magasin || ''} • ${jourLabel}
    </div>
  </div>`;
}

/**
 * CSS commun pour les fiches d'impression
 */
export function getFicheCSS() {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4 portrait; margin: 5mm; }
    body { font-family: Arial, sans-serif; font-size: 7px; line-height: 1.1; }

    .page { page-break-after: always; }
    .page:last-child { page-break-after: avoid; }

    .header { margin-bottom: 4px; }
    .header h1 { font-size: 12px; font-weight: bold; margin-bottom: 1px; }
    .header .info { font-size: 7px; color: #666; }

    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #555; padding: 1px 2px; text-align: center; vertical-align: middle; }

    th { background: #e0e0e0; font-weight: bold; font-size: 6px; }
    th.double { line-height: 1.0; font-size: 6px; }

    td.rayon { font-size: 5px; font-weight: bold; text-align: left; width: 45px; }
    td.prog { font-size: 5px; text-align: left; width: 40px; }
    td.plu { font-size: 6px; width: 30px; }
    td.article { text-align: left; font-size: 7px; font-weight: bold; }
    td.remarque { display: none; }
    th.remarque { display: none; }
    td.qte { font-size: 10px; font-weight: bold; width: 32px; }
    td.qte.derniere { background: #fff59d; }
    td.stock { width: 30px; background: #fff; }
    td.acuire { width: 30px; background: #c8e6c9; }
    td.pertes { width: 28px; background: #fff; }

    tr.capacite { background: #eeeeee; }
    tr.capacite td.plu { font-style: italic; font-size: 5px; }
    tr.capacite td.qte { font-size: 6px; font-weight: normal; }
    tr.capacite td.total { font-weight: bold; font-size: 6px; }

    sub { font-size: 5px; }

    .footer { margin-top: 4px; font-size: 6px; color: #666; text-align: center; }
    .formula { margin-top: 3px; padding: 3px 6px; background: #e3f2fd; font-size: 7px; }
    .formula strong { color: #1565c0; }
  `;
}

/**
 * Imprimer le planning au format professionnel (jour actuel)
 * @param {string} jourSelectionne - Jour sélectionné
 * @param {object} params - Mêmes paramètres que genererFicheJourHTML
 */
export function handlePrintPlanningPro(jourSelectionne, params) {
  const { configuration } = params;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Fiche ${JOURS_LABELS[JOURS.indexOf(jourSelectionne)]} - ${configuration?.magasin || ''}</title>
  <style>${getFicheCSS()}</style>
</head>
<body>
  ${genererFicheJourHTML(jourSelectionne, params)}
</body>
</html>`;

  const fenetre = window.open('', '_blank', 'width=1200,height=800');
  fenetre.document.write(html);
  fenetre.document.close();
  setTimeout(() => fenetre.print(), 300);
}

/**
 * Imprimer la semaine complète (7 fiches, une par jour)
 * @param {object} params - Mêmes paramètres que genererFicheJourHTML
 */
export function handlePrintSemaine(params) {
  const { configuration } = params;

  // Générer les 7 fiches
  const pagesHTML = JOURS.map(jour => genererFicheJourHTML(jour, params)).join('\n');

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Planning Semaine ${configuration?.semaine || ''} - ${configuration?.magasin || ''}</title>
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
