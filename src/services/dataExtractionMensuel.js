/**
 * Service d'extraction de données depuis les fichiers Excel MENSUELS
 *
 * Ce service est l'équivalent mensuel de dataExtractionService.js.
 * Il produit le MÊME format de sortie (même structure de result)
 * pour que tous les composants du dashboard fonctionnent sans changement.
 *
 * Différences clés avec l'extraction hebdo :
 * - Utilise extraireFeuilleMensuelle() au lieu de extraireFeuille()
 * - Feuille horaire : "Ventes Moyennes Horaire" au lieu de "Vente heure"
 * - Pas de données S-1 (toutes les valeurs S-1 sont à 0)
 * - metadata.typePeriode = 'mois', metadata.multiplierAnnuel = 12
 */

// Réutilisation des helpers existants
import { chargerFichierExcel, getCodePDV, construireSetCodesPDV, filtrerParCodesComparables } from './extraction/validationDonnees.js';
import { calculerMoyenneSecteur, calculerEcarts, calculerPotentiel, calculerClassementSecteur, construireDictionnaireMagasins } from './extraction/ventesExtractor.js';
import {
  extraireDonneesParCreneau,
  extraireDonneesParTrancheHoraire,
  calculerMoyenneSecteurParCreneau,
  calculerMoyenneSecteurParTrancheHoraire,
} from './extraction/frequentationExtractor.js';

// Extraction mensuelle spécifique
import { extraireTotalPdvMensuel, extraireVenteHeureMensuel } from './extraction/extractionMensuelle.js';

// Référence au cache infoPDV existant (importé depuis dataExtractionService)
import { chargerInfoPDV } from './dataExtractionService.js';

// Cache pour les extractions mensuelles
const cacheExtractionsMensuel = new Map();

/**
 * Extrait les données d'un magasin depuis un fichier MENSUEL
 * Retourne le MÊME format que extraireDonneesMagasin() dans dataExtractionService.js
 *
 * @param {File} file - Fichier Excel mensuel
 * @param {string} codePdv - Code du point de vente
 * @param {FileSystemDirectoryHandle} dirHandle - Handle du dossier (pour charger info_PDV.json)
 * @returns {Promise<Object>} Données extraites (même format que l'extraction hebdo)
 */
export async function extraireDonneesMagasinMensuel(file, codePdv, dirHandle = null) {
  const cacheKey = `mensuel_${file.name}_${codePdv}`;

  // Vérifier le cache
  if (cacheExtractionsMensuel.has(cacheKey)) {
    return cacheExtractionsMensuel.get(cacheKey);
  }

  const startTime = performance.now();

  // Charger le fichier de référence si disponible
  let infoPDV = null;
  if (dirHandle) {
    infoPDV = await chargerInfoPDV(dirHandle);
  }

  // Charger le fichier Excel
  const workbook = await chargerFichierExcel(file);

  // Normaliser le code PDV
  const codePdvStr = String(codePdv).trim();
  const codePdvNormalise = codePdvStr.replace(/^0+/, '');

  // ========== EXTRACTION VIA MAPPING POSITIONNEL ==========

  // Extraire les feuilles avec le mapping mensuel
  const totalPdv = extraireTotalPdvMensuel(workbook);
  const venteHeure = extraireVenteHeureMensuel(workbook);

  // Fonction de comparaison des codes PDV (réutilise la même logique)
  const matchCodePDV = (row) => {
    const code = row._codePDV || getCodePDV(row);
    if (!code) return false;
    const codeNormalise = String(code).replace(/^0+/, '');
    return codeNormalise === codePdvNormalise || code === codePdvStr;
  };

  // Filtrer pour ce magasin
  const magasinTotalPdv = totalPdv.find(matchCodePDV);
  const magasinVenteHeure = venteHeure.filter(matchCodePDV);

  // ========== INFOS MAGASIN (identique à l'hebdo) ==========

  let infoMagasin = null;
  if (infoPDV) {
    infoMagasin = infoPDV[codePdvStr];
    if (!infoMagasin && codePdvStr.startsWith('0')) {
      const codeSansZero = codePdvStr.replace(/^0+/, '');
      infoMagasin = infoPDV[codeSansZero];
    }
    if (!infoMagasin) {
      const codeAvecZero = codePdvStr.padStart(5, '0');
      infoMagasin = infoPDV[codeAvecZero];
    }
  }

  const secteurCode = infoMagasin?.secteurCode || null;
  const secteurLibelle = infoMagasin?.secteurLibelle || null;
  const modele = infoMagasin?.modele || null;
  const vocation = infoMagasin?.vocation || magasinTotalPdv?.VOCATION || magasinTotalPdv?.Vocation;
  const region = infoMagasin?.region || magasinTotalPdv?.REGION || magasinTotalPdv?.Region;

  // ========== COMPARABLES ET MOYENNES (même logique que l'hebdo) ==========

  let magasinsComparables = [];
  let modeComparaison = '';

  if (infoPDV && secteurCode && modele) {
    const codesComparables = Object.keys(infoPDV).filter(code => {
      const info = infoPDV[code];
      return info.secteurCode === secteurCode && info.modele === modele;
    });
    const codesComparablesSet = construireSetCodesPDV(codesComparables);
    magasinsComparables = filtrerParCodesComparables(totalPdv, codesComparablesSet);
    modeComparaison = 'Secteur + Modèle';
  } else if (infoPDV && secteurCode) {
    const codesComparables = Object.keys(infoPDV).filter(code => {
      const info = infoPDV[code];
      return info.secteurCode === secteurCode;
    });
    const codesComparablesSet = construireSetCodesPDV(codesComparables);
    magasinsComparables = filtrerParCodesComparables(totalPdv, codesComparablesSet);
    modeComparaison = 'Secteur';
  } else {
    magasinsComparables = totalPdv.filter(row => {
      const rowVocation = row.VOCATION || row.Vocation;
      return rowVocation === vocation && rowVocation;
    });
    modeComparaison = 'Vocation (dégradé)';
  }

  const moyenneSecteur = calculerMoyenneSecteur(magasinsComparables);

  // ========== CRENEAUX HORAIRES (même logique, données proviennent du mapping mensuel) ==========

  const donneesParCreneau = extraireDonneesParCreneau(magasinVenteHeure);
  const donneesParTrancheHoraire = extraireDonneesParTrancheHoraire(magasinVenteHeure);

  // Calculer la moyenne secteur par créneau
  let venteHeureSecteur = [];
  if (infoPDV && secteurCode && modele) {
    const codesComparables = Object.keys(infoPDV).filter(code => {
      const info = infoPDV[code];
      return info.secteurCode === secteurCode && info.modele === modele;
    });
    const codesComparablesSet = construireSetCodesPDV(codesComparables);
    venteHeureSecteur = filtrerParCodesComparables(venteHeure, codesComparablesSet);
  } else if (infoPDV && secteurCode) {
    const codesComparables = Object.keys(infoPDV).filter(code => {
      const info = infoPDV[code];
      return info.secteurCode === secteurCode;
    });
    const codesComparablesSet = construireSetCodesPDV(codesComparables);
    venteHeureSecteur = filtrerParCodesComparables(venteHeure, codesComparablesSet);
  } else {
    venteHeureSecteur = venteHeure.filter(row => {
      const rowVocation = row.VOCATION || row.Vocation;
      return rowVocation === vocation;
    });
  }

  const moyenneSecteurParCreneau = calculerMoyenneSecteurParCreneau(venteHeureSecteur);
  const moyenneSecteurParTrancheHoraire = calculerMoyenneSecteurParTrancheHoraire(venteHeureSecteur);

  // ========== INDICATEURS (même extraction que l'hebdo) ==========

  const villeNom = infoMagasin?.ville ||
                   magasinTotalPdv?.VILLE || magasinTotalPdv?.Ville ||
                   magasinVenteHeure[0]?.VILLE || magasinVenteHeure[0]?.Ville ||
                   'Inconnu';

  // Données courantes
  const caBVP = parseFloat(magasinTotalPdv?.['Ca Tot BVP']) || 0;
  const qteBVP = parseFloat(magasinTotalPdv?.['Qte Tot BVP']) || 0;
  const ticketsBVP = parseFloat(magasinTotalPdv?.['Nb Ticket BVP']) || 0;
  const caTotal = parseFloat(magasinTotalPdv?.['Ca Tot']) || 0;
  const qteTotal = parseFloat(magasinTotalPdv?.['Qte Tot']) || 0;
  const ticketsTotal = parseFloat(magasinTotalPdv?.['Nb Ticket']) || 0;

  const penetration = ticketsTotal > 0 ? ticketsBVP / ticketsTotal : 0;
  const ticketMoyen = ticketsBVP > 0 ? caBVP / ticketsBVP : 0;

  // Données An-1
  const caBVP_An1 = parseFloat(magasinTotalPdv?.['Ca Tot BVP_An1']) || 0;
  const qteBVP_An1 = parseFloat(magasinTotalPdv?.['Qte Tot BVP_An1']) || 0;
  const ticketsBVP_An1 = parseFloat(magasinTotalPdv?.['Nb Ticket BVP_An1']) || 0;
  const ticketsTotal_An1 = parseFloat(magasinTotalPdv?.['Nb Ticket_An1']) || 0;
  const penetration_An1 = ticketsTotal_An1 > 0 ? ticketsBVP_An1 / ticketsTotal_An1 : 0;
  const ticketMoyen_An1 = ticketsBVP_An1 > 0 ? caBVP_An1 / ticketsBVP_An1 : 0;

  // Données S-1 : VIDES pour le mensuel
  const caBVP_S1 = 0;
  const qteBVP_S1 = 0;
  const ticketsBVP_S1 = 0;
  const ticketsTotal_S1 = 0;
  const penetration_S1 = 0;
  const ticketMoyen_S1 = 0;

  // ========== CONSTRUCTION DU RÉSULTAT (même format que l'hebdo) ==========

  const result = {
    magasin: {
      code: codePdv,
      nom: villeNom,
      enseigne: infoMagasin?.enseigne || magasinTotalPdv?.ENSEIGNE || magasinTotalPdv?.Enseigne || 'INTERMARCHE',
      vocation: vocation,
      region: region,
      codePostal: infoMagasin?.codePostal || magasinTotalPdv?.CP,
      secteurCode: secteurCode,
      secteurLibelle: secteurLibelle,
      modele: modele,
      surface: infoMagasin?.surface,
    },

    comparaison: {
      nombreMagasinsComparables: magasinsComparables.length,
      filtreSecteur: secteurCode,
      filtreModele: modele,
      modeComparaison: modeComparaison,
    },

    indicateurs: {
      global: {
        pdv: {
          caBVP, qteBVP, ticketsBVP,
          caTotal, qteTotal, ticketsTotal,
          penetration, ticketMoyen,
        },
        pdvS1: {
          caBVP: caBVP_S1, qteBVP: qteBVP_S1, ticketsBVP: ticketsBVP_S1,
          ticketsTotal: ticketsTotal_S1, penetration: penetration_S1, ticketMoyen: ticketMoyen_S1,
        },
        pdvAn1: {
          caBVP: caBVP_An1, qteBVP: qteBVP_An1, ticketsBVP: ticketsBVP_An1,
          ticketsTotal: ticketsTotal_An1, penetration: penetration_An1, ticketMoyen: ticketMoyen_An1,
        },
        moyenneSecteur: moyenneSecteur,
        ecart: calculerEcarts(
          { caBVP, qteBVP, ticketsBVP, caTotal, qteTotal, ticketsTotal, penetration, ticketMoyen },
          moyenneSecteur
        ),
      },
      parCreneau: {
        matin: {
          pdv: donneesParCreneau.matin,
          moyenneSecteur: moyenneSecteurParCreneau.matin,
        },
        midi: {
          pdv: donneesParCreneau.midi,
          moyenneSecteur: moyenneSecteurParCreneau.midi,
        },
        apresMidi: {
          pdv: donneesParCreneau.apresMidi,
          moyenneSecteur: moyenneSecteurParCreneau.apresMidi,
        },
      },
      parTrancheHoraire: donneesParTrancheHoraire,
      moyenneSecteurParTrancheHoraire: moyenneSecteurParTrancheHoraire,
    },

    // Données brutes pour le planning
    frequentation: {
      parHeure: magasinVenteHeure,
      totalSemaine: magasinTotalPdv,
    },

    // Métadonnées — AVEC typePeriode et multiplier
    metadata: {
      fichierSource: file.name,
      dateExtraction: new Date().toISOString(),
      tempsExtraction: 0,
      typePeriode: 'mois',
      multiplierAnnuel: 12,
    },
  };

  // Calculer le potentiel
  result.potentiel = calculerPotentiel(result.indicateurs);

  // Classement secteur
  result.classement = calculerClassementSecteur({
    infoPDV, secteurCode, secteurLibelle, modele, codePdvStr, totalPdv,
  });

  // Dictionnaire tous magasins
  result.dictionnaireMagasins = construireDictionnaireMagasins(totalPdv, infoPDV);
  result._venteHeureRaw = venteHeure;

  const endTime = performance.now();
  result.metadata.tempsExtraction = Math.round(endTime - startTime);

  // Mettre en cache
  cacheExtractionsMensuel.set(cacheKey, result);

  return result;
}
