/**
 * Service de parsing des fichiers Excel V2
 */
import * as XLSX from 'xlsx';
import { detecterNombreSemaines } from './potentielCalculator';

/**
 * Parse le fichier Excel des ventes
 * Format attendu : ITM8 Prio, EAN Prio, Libellé, Date, Quantité, Valeur prix vente
 * @param {File} file - Fichier Excel
 * @returns {Promise<Object>} Données parsées
 */
export async function parseVentesExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Chercher le nom du magasin dans les premières lignes
        // Formats courants : "10679 - SAS CHAMAFFI Date : 25/11/2025 Heure : 16:09:34"
        let nomMagasin = null;
        let codeMagasin = null;

        for (let i = 0; i < Math.min(rows.length, 10); i++) {
          const row = rows[i];
          if (!row) continue;

          for (const cell of row) {
            const cellStr = String(cell || '').trim();
            if (!cellStr) continue;

            // Pattern: "10679 - SAS CHAMAFFI Date : ..." (code numérique suivi de nom, puis Date/Heure)
            // On isole le code et le nom avant "Date :"
            const codeNomDateMatch = cellStr.match(/^(\d{4,6})\s*[-–]\s*(.+?)(?:\s+Date\s*:|$)/i);
            if (codeNomDateMatch) {
              codeMagasin = codeNomDateMatch[1];
              nomMagasin = codeNomDateMatch[2].trim();
              break;
            }

            // Pattern: "PDV: 12345 - Nom Magasin" ou "PDV 12345 - Nom Magasin"
            // Utilise une approche différente: capture tout jusqu'à "Date :" puis extrait code et nom
            const pdvMatch = cellStr.match(/PDV[:\s]*(\d+)\s*[-–]\s*(.+?)(?:\s+Date\s*:|$)/i);
            if (pdvMatch) {
              codeMagasin = pdvMatch[1];
              nomMagasin = pdvMatch[2].trim();
              break;
            }

            // Pattern: "INTERMARCHE xxx" ou "ITM xxx"
            const itmMatch = cellStr.match(/^(INTERMARCHE|ITM|INTERMARCHÉ)\s+([^D]+?)(?:\s*Date\s*:|$)/i);
            if (itmMatch) {
              nomMagasin = itmMatch[0].replace(/\s*Date\s*:.*/i, '').trim();
              break;
            }

            // Pattern: "Magasin: xxx"
            const magasinMatch = cellStr.match(/^Magasin[:\s]+([^D]+?)(?:\s*Date\s*:|$)/i);
            if (magasinMatch) {
              nomMagasin = magasinMatch[1].trim();
              break;
            }
          }
          if (nomMagasin) break;
        }

        // Trouver la ligne d'en-tête (celle avec "ITM8" ou "Libellé")
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(rows.length, 20); i++) {
          const row = rows[i];
          if (row && row.some(cell =>
            String(cell).toLowerCase().includes('itm8') ||
            String(cell).toLowerCase().includes('libellé') ||
            String(cell).toLowerCase().includes('libelle')
          )) {
            headerRowIndex = i;
            break;
          }
        }

        const headers = rows[headerRowIndex].map(h => String(h).toLowerCase().trim());

        // Trouver les index des colonnes
        const colIndex = {
          itm8: headers.findIndex(h => h.includes('itm8')),
          ean: headers.findIndex(h => h.includes('ean')),
          libelle: headers.findIndex(h => h.includes('libellé') || h.includes('libelle')),
          date: headers.findIndex(h => h === 'date'),
          quantite: headers.findIndex(h =>
            (h.includes('quantité') || h.includes('quantite') || h.includes('qte')) &&
            !h.includes('casse') // Exclure les colonnes de casse
          ),
          valeurPrixVente: headers.findIndex(h =>
            h.includes('valeur prix vente') ||
            (h.includes('valeur') && h.includes('vente')) ||
            (h.includes('ventes') && h.includes('pv')) ||
            h.includes('montant')
          ),
          // Colonnes de CASSE (nouveau format)
          casseQte: headers.findIndex(h =>
            (h.includes('casse') && (h.includes('qté') || h.includes('quantité') || h.includes('qte'))) ||
            h === 'casse qté' ||
            h === 'qté casse'
          ),
          cassePaHT: headers.findIndex(h =>
            (h.includes('casse') && h.includes('pa')) ||
            h.includes('casse pa ht')
          ),
          tauxCasse: headers.findIndex(h =>
            h.includes('taux de casse') ||
            h.includes('taux casse') ||
            h.includes('% casse')
          ),
          // Colonnes optionnelles pour les marges (si présentes)
          prixAchatHT: headers.findIndex(h =>
            h.includes('prix achat') ||
            h.includes('pa ht') ||
            h.includes('paht') ||
            h.includes('coût') ||
            h.includes('cout')
          ),
          tauxMarge: headers.findIndex(h =>
            h.includes('marge') ||
            h.includes('taux marge') ||
            h.includes('tx marge')
          ),
          tva: headers.findIndex(h =>
            h.includes('tva') ||
            h.includes('taxe')
          )
        };

        // Vérifier les colonnes obligatoires
        if (colIndex.libelle === -1) {
          throw new Error('Colonne "Libellé" non trouvée');
        }
        if (colIndex.date === -1) {
          throw new Error('Colonne "Date" non trouvée');
        }
        if (colIndex.quantite === -1) {
          throw new Error('Colonne "Quantité" non trouvée');
        }

        // Parser les lignes de données
        const parProduit = {};
        const toutesLesDates = new Set();
        let caTotalGlobal = 0;

        for (let i = headerRowIndex + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const itm8 = colIndex.itm8 !== -1 ? String(row[colIndex.itm8] || '') : '';
          const ean13 = colIndex.ean !== -1 ? String(row[colIndex.ean] || '') : '';
          const libelle = String(row[colIndex.libelle] || '').trim();
          const dateRaw = row[colIndex.date];
          const quantite = Number(row[colIndex.quantite]) || 0;
          const valeurPrixVente = colIndex.valeurPrixVente !== -1
            ? Number(row[colIndex.valeurPrixVente]) || 0
            : 0;

          // Données de CASSE (si présentes dans le fichier)
          const casseQte = colIndex.casseQte !== -1
            ? Number(row[colIndex.casseQte]) || 0
            : 0;
          const cassePaHT = colIndex.cassePaHT !== -1
            ? Number(row[colIndex.cassePaHT]) || 0
            : 0;
          const tauxCasse = colIndex.tauxCasse !== -1
            ? Number(row[colIndex.tauxCasse]) || 0
            : 0;

          // Données optionnelles de marge (si présentes dans le fichier)
          const prixAchatHT = colIndex.prixAchatHT !== -1
            ? Number(row[colIndex.prixAchatHT]) || null
            : null;
          const tauxMarge = colIndex.tauxMarge !== -1
            ? Number(row[colIndex.tauxMarge]) || null
            : null;
          const tva = colIndex.tva !== -1
            ? Number(row[colIndex.tva]) || 5.5  // TVA alimentaire par défaut
            : null;

          if (!libelle || !dateRaw) continue;

          // Parser la date
          let date;
          if (typeof dateRaw === 'number') {
            // Date Excel (nombre de jours depuis 1900)
            date = excelDateToISO(dateRaw);
          } else {
            // Date string (DD/MM/YYYY)
            date = parseDateString(String(dateRaw));
          }

          if (!date) continue;

          toutesLesDates.add(date);
          caTotalGlobal += valeurPrixVente;

          // Clé unique du produit (ITM8 ou libellé)
          const cleProduit = itm8 || libelle;

          if (!parProduit[cleProduit]) {
            parProduit[cleProduit] = {
              itm8,
              ean13,
              libelle,
              ventes: [],
              // Données de casse (nouvelles colonnes)
              casseTotale: 0,
              cassePaHTTotal: 0,
              valeurPrixVenteTotal: 0, // Pour calcul taux de casse
              tauxCasseMoyen: 0,
              // Données de marge (si disponibles)
              prixAchatHT: null,
              tauxMarge: null,
              tva: null
            };
          }

          // Accumuler les données de casse et ventes
          parProduit[cleProduit].casseTotale += casseQte;
          parProduit[cleProduit].cassePaHTTotal += cassePaHT;
          parProduit[cleProduit].valeurPrixVenteTotal += valeurPrixVente;

          // Mettre à jour les données de marge si disponibles
          // (prend la première valeur non-nulle trouvée)
          if (prixAchatHT && !parProduit[cleProduit].prixAchatHT) {
            parProduit[cleProduit].prixAchatHT = prixAchatHT;
          }
          if (tauxMarge && !parProduit[cleProduit].tauxMarge) {
            parProduit[cleProduit].tauxMarge = tauxMarge;
          }
          if (tva && !parProduit[cleProduit].tva) {
            parProduit[cleProduit].tva = tva;
          }

          parProduit[cleProduit].ventes.push({
            date,
            quantite,
            valeurPrixVente,
            // Données de casse pour cette date
            casseQte,
            cassePaHT,
            tauxCasse
          });
        }

        // Calculer le nombre de semaines
        const ventesForDetection = Object.fromEntries(
          Object.entries(parProduit).map(([k, v]) => [k, v.ventes])
        );
        const nombreSemaines = detecterNombreSemaines(ventesForDetection);

        // Trier les dates pour avoir la période
        const dates = Array.from(toutesLesDates).sort();

        // Calculer le taux de casse pour chaque produit
        // Formule correcte Mousquetaires: PA HT Casse / PV TTC Ventes
        let cassePaHTGlobale = 0;
        let pvTTCVentesGlobale = 0;
        Object.values(parProduit).forEach(produit => {
          cassePaHTGlobale += produit.cassePaHTTotal;
          pvTTCVentesGlobale += produit.valeurPrixVenteTotal;
          // Calculer le taux de casse du produit (PA HT Casse / PV TTC Ventes)
          if (produit.valeurPrixVenteTotal > 0 && produit.cassePaHTTotal > 0) {
            produit.tauxCasseMoyen = Math.round((produit.cassePaHTTotal / produit.valeurPrixVenteTotal) * 10000) / 100;
          }
        });

        // Vérifier si des données de casse sont disponibles
        const produitsAvecCasse = Object.values(parProduit).filter(p => p.casseTotale > 0);
        const donneesCasseDisponibles = produitsAvecCasse.length > 0;

        // Vérifier si des données de marge sont disponibles
        const produitsAvecMarge = Object.values(parProduit).filter(
          p => p.prixAchatHT !== null || p.tauxMarge !== null
        );
        const donneesMargeDisponibles = produitsAvecMarge.length > 0;

        resolve({
          parProduit,
          nombreSemaines,
          dateDebut: formatDateFR(dates[0]),
          dateFin: formatDateFR(dates[dates.length - 1]),
          caTotalRayon: Math.round(caTotalGlobal * 100) / 100,
          nombreProduits: Object.keys(parProduit).length,
          // Info magasin extraite du fichier
          magasin: nomMagasin ? {
            nom: nomMagasin,
            code: codeMagasin || ''
          } : null,
          // Indicateur de disponibilité des données de marge
          donneesMargeDisponibles,
          nombreProduitsAvecMarge: produitsAvecMarge.length,
          // Données de casse globales (formule: PA HT Casse / PV TTC Ventes)
          donneesCasseDisponibles,
          cassePaHTGlobale,
          pvTTCVentesGlobale,
          nombreProduitsAvecCasse: produitsAvecCasse.length,
          tauxCasseGlobal: pvTTCVentesGlobale > 0
            ? Math.round((cassePaHTGlobale / pvTTCVentesGlobale) * 10000) / 100
            : 0
        });

      } catch (error) {
        reject(new Error(`Erreur de parsing : ${error.message}`));
      }
    };

    reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Coefficients de pondération des semaines (CDC V2.4)
 * S-1 = semaine précédente, AS-1 = même semaine année précédente, S-2 = semaine -2
 */
const PONDERATIONS_SEMAINES = {
  standard:   { S1: 0.40, AS1: 0.30, S2: 0.30 },  // Semaine normale
  saisonnier: { S1: 0.30, AS1: 0.50, S2: 0.20 },  // Période atypique (vacances, fêtes)
  fortePromo: { S1: 0.60, AS1: 0.20, S2: 0.20 },  // Semaine avec grosse animation
};

/**
 * Parse le fichier Excel de fréquentation avec pondération multi-semaines
 * Structure attendue : JOUR, HORAIRE, puis colonnes par semaine (BVP/PDV)
 * Colonnes: F=JOUR, G=HORAIRE, J=QteBVP S-1, M=QtePDV S-1, P=QteBVP AS-1, S=QtePDV AS-1, V=QteBVP S-2, Y=QtePDV S-2
 *
 * @param {File} file - Fichier Excel
 * @param {string} typePonderation - 'standard' | 'saisonnier' | 'fortePromo' (défaut: 'standard')
 * @returns {Promise<Object>} Données de fréquentation
 */
export async function parseFrequentationExcel(file, typePonderation = 'standard') {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Trouver la ligne d'en-tête (celle avec "JOUR" et "HORAIRE")
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(rows.length, 10); i++) {
          const row = rows[i];
          if (row && row.some(cell =>
            String(cell).toUpperCase().includes('JOUR') ||
            String(cell).toUpperCase().includes('HORAIRE')
          )) {
            headerRowIndex = i;
            break;
          }
        }

        const headers = rows[headerRowIndex] || [];

        // Fonction pour extraire année-semaine depuis une cellule
        const extractSemaineFromCell = (cell) => {
          const cellStr = String(cell || '');
          // Format attendu : "2025-45" ou "2024-45"
          const match = cellStr.match(/(\d{4})-(\d{1,2})/);
          if (match) {
            return {
              annee: parseInt(match[1]),
              semaine: parseInt(match[2]),
              label: `S${match[2]}/${match[1]}`
            };
          }
          return null;
        };

        // Chercher les numéros de semaine dans les premières lignes (lignes 0-3)
        // et autour des colonnes attendues (J, P, V)
        const findSemaineInfo = (targetCol, colRange = 2) => {
          for (let rowIdx = 0; rowIdx < Math.min(4, rows.length); rowIdx++) {
            const row = rows[rowIdx];
            if (!row) continue;
            // Chercher dans la colonne cible et les colonnes adjacentes
            for (let offset = -colRange; offset <= colRange; offset++) {
              const colIdx = targetCol + offset;
              if (colIdx >= 0 && colIdx < row.length) {
                const info = extractSemaineFromCell(row[colIdx]);
                if (info) return info;
              }
            }
          }
          return null;
        };

        // Trouver les index des colonnes JOUR et HORAIRE dynamiquement
        const colJour = findColumnIndex(headers, ['jour']);
        const colHoraire = findColumnIndex(headers, ['horaire']);

        // Index des colonnes de quantités (basés sur la structure du fichier)
        // Colonnes J=9, M=12, P=15, S=18, V=21, Y=24 (0-based)
        // Colonnes tickets: K=10, N=13, Q=16, T=19, W=22, Z=25
        const colIndex = {
          jour: colJour !== -1 ? colJour : 5,      // Colonne F par défaut
          horaire: colHoraire !== -1 ? colHoraire : 6, // Colonne G par défaut
          // Quantités
          qteBvpS1: 9,   // Colonne J - Qte BVP S-1
          qtePdvS1: 12,  // Colonne M - Qte PDV S-1
          qteBvpAS1: 15, // Colonne P - Qte BVP AS-1
          qtePdvAS1: 18, // Colonne S - Qte PDV AS-1
          qteBvpS2: 21,  // Colonne V - Qte BVP S-2
          qtePdvS2: 24,  // Colonne Y - Qte PDV S-2
          // Tickets (pour taux de pénétration)
          ticketsBvpS1: 10,  // Colonne K - Tickets BVP S-1
          ticketsPdvS1: 13,  // Colonne N - Tickets PDV S-1
          ticketsBvpAS1: 16, // Colonne Q - Tickets BVP AS-1
          ticketsPdvAS1: 19, // Colonne T - Tickets PDV AS-1
          ticketsBvpS2: 22,  // Colonne W - Tickets BVP S-2
          ticketsPdvS2: 25   // Colonne Z - Tickets PDV S-2
        };

        // Extraire les infos de chaque semaine depuis les en-têtes
        // Les cellules sont fusionnées, donc chercher au début de chaque bloc
        // Bloc S-1: colonnes I(8) à N(13) - chercher en I(8)
        // Bloc AS-1: colonnes O(14) à T(19) - chercher en O(14)
        // Bloc S-2: colonnes U(20) à Z(25) - chercher en U(20)
        const semaineS1 = findSemaineInfo(8, 3);   // Colonne I et autour
        const semaineAS1 = findSemaineInfo(14, 3); // Colonne O et autour
        const semaineS2 = findSemaineInfo(20, 3);  // Colonne U et autour

        // Structures pour stocker les données
        const frequentationParJour = {
          lundi: { bvp: 0, pdv: 0 },
          mardi: { bvp: 0, pdv: 0 },
          mercredi: { bvp: 0, pdv: 0 },
          jeudi: { bvp: 0, pdv: 0 },
          vendredi: { bvp: 0, pdv: 0 },
          samedi: { bvp: 0, pdv: 0 },
          dimanche: { bvp: 0, pdv: 0 }
        };

        const frequentationParHoraire = {
          matin: { bvp: 0, pdv: 0 },      // 09h_12h
          midi: { bvp: 0, pdv: 0 },       // 12h_14h + 14h_16h
          apresMidi: { bvp: 0, pdv: 0 }   // 16h_19h + 19h_23h
        };

        // Détail par jour et par horaire (pour le planning)
        const detailParJourHoraire = {};
        ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'].forEach(jour => {
          detailParJourHoraire[jour] = {
            matin: { bvp: 0, pdv: 0 },
            midi: { bvp: 0, pdv: 0 },
            apresMidi: { bvp: 0, pdv: 0 }
          };
        });

        // Mapping jour numéro -> nom
        const joursMap = {
          '1': 'lundi', 'lundi': 'lundi', '1-lundi': 'lundi',
          '2': 'mardi', 'mardi': 'mardi', '2-mardi': 'mardi',
          '3': 'mercredi', 'mercredi': 'mercredi', '3-mercredi': 'mercredi',
          '4': 'jeudi', 'jeudi': 'jeudi', '4-jeudi': 'jeudi',
          '5': 'vendredi', 'vendredi': 'vendredi', '5-vendredi': 'vendredi',
          '6': 'samedi', 'samedi': 'samedi', '6-samedi': 'samedi',
          '7': 'dimanche', 'dimanche': 'dimanche', '7-dimanche': 'dimanche'
        };

        // Mapping horaire -> tranche
        const horaireToTranche = (horaire) => {
          const h = String(horaire).toLowerCase();
          if (h.includes('09h_12h') || h.includes('9h_12h') || h.includes('9h-12h')) return 'matin';
          if (h.includes('12h_14h') || h.includes('12h-14h')) return 'midi';
          if (h.includes('14h_16h') || h.includes('14h-16h')) return 'midi';
          if (h.includes('16h_19h') || h.includes('16h-19h')) return 'apresMidi';
          if (h.includes('19h_23h') || h.includes('19h-23h')) return 'apresMidi';
          return null; // 00_Autre - ignorer
        };

        // Compter les semaines trouvées
        const semainesDetectees = new Set();
        let totalLignes = 0;

        // Totaux des tickets par semaine (pour taux de pénétration)
        const ticketsParSemaine = {
          s1: { bvp: 0, pdv: 0 },
          as1: { bvp: 0, pdv: 0 },
          s2: { bvp: 0, pdv: 0 }
        };

        // Parser les lignes de données
        for (let i = headerRowIndex + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          // Extraire le jour
          const jourRaw = String(row[colIndex.jour] || '').toLowerCase().trim();
          // Nettoyer le jour (ex: "1-Lundi" -> "1" ou "lundi")
          const jourClean = jourRaw.split('-')[0].trim();
          const jour = joursMap[jourClean] || joursMap[jourRaw];

          if (!jour) continue;

          // Extraire l'horaire
          const horaire = String(row[colIndex.horaire] || '');
          const tranche = horaireToTranche(horaire);

          // Extraire les quantités des 3 semaines
          const qteBvpS1 = parseFloat(row[colIndex.qteBvpS1]) || 0;
          const qtePdvS1 = parseFloat(row[colIndex.qtePdvS1]) || 0;
          const qteBvpAS1 = parseFloat(row[colIndex.qteBvpAS1]) || 0;
          const qtePdvAS1 = parseFloat(row[colIndex.qtePdvAS1]) || 0;
          const qteBvpS2 = parseFloat(row[colIndex.qteBvpS2]) || 0;
          const qtePdvS2 = parseFloat(row[colIndex.qtePdvS2]) || 0;

          // Extraire les tickets des 3 semaines (pour taux de pénétration)
          const ticketsBvpS1 = parseFloat(row[colIndex.ticketsBvpS1]) || 0;
          const ticketsPdvS1 = parseFloat(row[colIndex.ticketsPdvS1]) || 0;
          const ticketsBvpAS1 = parseFloat(row[colIndex.ticketsBvpAS1]) || 0;
          const ticketsPdvAS1 = parseFloat(row[colIndex.ticketsPdvAS1]) || 0;
          const ticketsBvpS2 = parseFloat(row[colIndex.ticketsBvpS2]) || 0;
          const ticketsPdvS2 = parseFloat(row[colIndex.ticketsPdvS2]) || 0;

          // Accumuler les tickets par semaine
          ticketsParSemaine.s1.bvp += ticketsBvpS1;
          ticketsParSemaine.s1.pdv += ticketsPdvS1;
          ticketsParSemaine.as1.bvp += ticketsBvpAS1;
          ticketsParSemaine.as1.pdv += ticketsPdvAS1;
          ticketsParSemaine.s2.bvp += ticketsBvpS2;
          ticketsParSemaine.s2.pdv += ticketsPdvS2;

          // Détecter quelles semaines ont des données
          if (qteBvpS1 > 0 || qtePdvS1 > 0) semainesDetectees.add('S-1');
          if (qteBvpAS1 > 0 || qtePdvAS1 > 0) semainesDetectees.add('AS-1');
          if (qteBvpS2 > 0 || qtePdvS2 > 0) semainesDetectees.add('S-2');

          // Pondération des semaines selon le type choisi (CDC V2.4)
          // Source principale : PDV (fréquentation globale magasin, pas BVP)
          // car QteBVP ne reflète pas la fréquentation réelle du PDV
          const weights = PONDERATIONS_SEMAINES[typePonderation] || PONDERATIONS_SEMAINES.standard;

          // Déterminer les poids effectifs selon les semaines disponibles
          let wS1 = weights.S1, wAS1 = weights.AS1, wS2 = weights.S2;
          const hasS1  = (qtePdvS1 > 0 || qteBvpS1 > 0);
          const hasAS1 = (qtePdvAS1 > 0 || qteBvpAS1 > 0);
          const hasS2  = (qtePdvS2 > 0 || qteBvpS2 > 0);

          // Gestion des semaines manquantes (CDC V2.4)
          if (!hasAS1 && hasS1 && hasS2) {
            // S-1 + S-2 sans AS-1 → 60% / 40%
            wS1 = 0.60; wAS1 = 0; wS2 = 0.40;
          } else if (hasS1 && !hasAS1 && !hasS2) {
            // S-1 seule → 100%
            wS1 = 1.0; wAS1 = 0; wS2 = 0;
          } else if (!hasS1 && !hasAS1 && !hasS2) {
            // Aucune donnée → les poids resteront à 0, fallback plus bas
            wS1 = 0; wAS1 = 0; wS2 = 0;
          }

          // Calculer les quantités pondérées (PDV = fréquentation globale magasin)
          const pdvPondere = (qtePdvS1 * wS1) + (qtePdvAS1 * wAS1) + (qtePdvS2 * wS2);
          // Garder aussi BVP pondéré pour le taux de pénétration
          const bvpPondere = (qteBvpS1 * wS1) + (qteBvpAS1 * wAS1) + (qteBvpS2 * wS2);

          // Ajouter aux totaux par jour
          frequentationParJour[jour].bvp += bvpPondere;
          frequentationParJour[jour].pdv += pdvPondere;

          // Ajouter aux totaux par tranche horaire
          if (tranche) {
            frequentationParHoraire[tranche].bvp += bvpPondere;
            frequentationParHoraire[tranche].pdv += pdvPondere;

            // Détail par jour et horaire
            detailParJourHoraire[jour][tranche].bvp += bvpPondere;
            detailParJourHoraire[jour][tranche].pdv += pdvPondere;
          }

          totalLignes++;
        }

        // Calculer les totaux
        const totalBvpJour = Object.values(frequentationParJour).reduce((sum, j) => sum + j.bvp, 0);
        const totalPdvJour = Object.values(frequentationParJour).reduce((sum, j) => sum + j.pdv, 0);
        const totalBvpHoraire = Object.values(frequentationParHoraire).reduce((sum, h) => sum + h.bvp, 0);

        // Poids par jour — source principale : PDV (fréquentation globale magasin)
        // car QteBVP ne reflète pas la vraie fréquentation du PDV (effet circulaire)
        const poidsParJour = {};
        // Poids par défaut différenciés (même valeurs que Etape5Communication)
        const POIDS_DEFAUT = {
          lundi: 0.12, mardi: 0.12, mercredi: 0.16,
          jeudi: 0.12, vendredi: 0.16, samedi: 0.20, dimanche: 0.12
        };

        if (totalPdvJour > 0) {
          // Cas normal : poids basés sur les données PDV (fréquentation globale)
          Object.entries(frequentationParJour).forEach(([jour, data]) => {
            poidsParJour[jour] = Math.round((data.pdv / totalPdvJour) * 1000) / 1000;
          });
        } else if (totalBvpJour > 0) {
          // Fallback : si PDV vide mais BVP disponible, utiliser BVP
          Object.entries(frequentationParJour).forEach(([jour, data]) => {
            poidsParJour[jour] = Math.round((data.bvp / totalBvpJour) * 1000) / 1000;
          });
        } else {
          // Aucune donnée : poids par défaut différenciés
          Object.keys(frequentationParJour).forEach(jour => {
            poidsParJour[jour] = POIDS_DEFAUT[jour] || 0.14;
          });
        }

        // Poids par tranche horaire (basé sur PDV pour cohérence)
        const totalPdvHoraire = Object.values(frequentationParHoraire).reduce((sum, h) => sum + h.pdv, 0);
        const poidsParHoraire = {};
        Object.entries(frequentationParHoraire).forEach(([tranche, data]) => {
          if (totalPdvHoraire > 0) {
            poidsParHoraire[tranche] = Math.round((data.pdv / totalPdvHoraire) * 1000) / 1000;
          } else if (totalBvpHoraire > 0) {
            poidsParHoraire[tranche] = Math.round((data.bvp / totalBvpHoraire) * 1000) / 1000;
          } else {
            poidsParHoraire[tranche] = 0;
          }
        });

        // Poids par tranche pour chaque jour (pour le planning détaillé) — source PDV
        const poidsTranchesParJour = {};
        Object.entries(detailParJourHoraire).forEach(([jour, tranches]) => {
          const totalJourPdv = Object.values(tranches).reduce((sum, t) => sum + t.pdv, 0);
          const totalJourBvp = Object.values(tranches).reduce((sum, t) => sum + t.bvp, 0);
          poidsTranchesParJour[jour] = {};
          Object.entries(tranches).forEach(([tranche, data]) => {
            if (totalJourPdv > 0) {
              poidsTranchesParJour[jour][tranche] = Math.round((data.pdv / totalJourPdv) * 1000) / 1000;
            } else if (totalJourBvp > 0) {
              poidsTranchesParJour[jour][tranche] = Math.round((data.bvp / totalJourBvp) * 1000) / 1000;
            } else {
              poidsTranchesParJour[jour][tranche] = 0;
            }
          });
        });

        // Taux de pénétration par semaine (Tickets BVP / Tickets PDV)
        const tauxPenetrationS1 = ticketsParSemaine.s1.pdv > 0
          ? ticketsParSemaine.s1.bvp / ticketsParSemaine.s1.pdv
          : 0;
        const tauxPenetrationAS1 = ticketsParSemaine.as1.pdv > 0
          ? ticketsParSemaine.as1.bvp / ticketsParSemaine.as1.pdv
          : 0;
        const tauxPenetrationS2 = ticketsParSemaine.s2.pdv > 0
          ? ticketsParSemaine.s2.bvp / ticketsParSemaine.s2.pdv
          : 0;

        // Taux de pénétration moyen
        const tauxPenetrationMoyen = (tauxPenetrationS1 + tauxPenetrationAS1 + tauxPenetrationS2) / 3;

        // Garder l'ancien ratio pour compatibilité (basé sur quantités)
        const ratioBvpPdv = totalPdvJour > 0 ? Math.round((totalBvpJour / totalPdvJour) * 1000) / 1000 : 0;

        // Format compatible avec l'ancien système (parJour simple)
        const parJourSimple = {};
        Object.entries(frequentationParJour).forEach(([jour, data]) => {
          parJourSimple[jour] = Math.round(data.bvp);
        });

        // Construire la période analysée pour affichage
        let periodeAnalysee = '';
        if (semaineS2 && semaineS1) {
          periodeAnalysee = `S${semaineS2.semaine} à S${semaineS1.semaine}/${semaineS1.annee}`;
          if (semaineAS1) {
            periodeAnalysee += ` (+ S${semaineAS1.semaine}/${semaineAS1.annee} pour comparaison)`;
          }
        }

        resolve({
          // Données brutes
          parJour: parJourSimple,
          parJourDetail: frequentationParJour,
          parHoraire: frequentationParHoraire,
          detailParJourHoraire,

          // Poids calculés (pour le planning)
          poidsParJour,
          poidsParHoraire,
          poidsTranchesParJour,

          // Métadonnées
          nombreSemaines: semainesDetectees.size,
          semainesUtilisees: Array.from(semainesDetectees),
          nombreLignes: totalLignes,
          ratioBvpPdv,

          // Pondération utilisée (CDC V2.4)
          typePonderation,
          ponderations: PONDERATIONS_SEMAINES[typePonderation] || PONDERATIONS_SEMAINES.standard,
          sourceFrequentation: totalPdvJour > 0 ? 'PDV' : (totalBvpJour > 0 ? 'BVP' : 'DEFAUT'),

          // Taux de pénétration (Tickets BVP / Tickets PDV)
          tauxPenetration: {
            s1: tauxPenetrationS1,
            as1: tauxPenetrationAS1,
            s2: tauxPenetrationS2,
            moyen: tauxPenetrationMoyen
          },
          ticketsParSemaine,

          // Infos détaillées des semaines
          semaines: {
            s1: semaineS1,   // { annee: 2025, semaine: 45, label: "S45/2025" }
            as1: semaineAS1, // { annee: 2024, semaine: 45, label: "S45/2024" }
            s2: semaineS2    // { annee: 2025, semaine: 44, label: "S44/2025" }
          },
          periodeAnalysee,

          // Totaux
          totalBvpHebdo: Math.round(totalBvpJour),
          totalPdvHebdo: Math.round(totalPdvJour)
        });

      } catch (error) {
        reject(new Error(`Erreur de parsing fréquentation : ${error.message}`));
      }
    };

    reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Trouve l'index d'une colonne par son nom
 * @param {Array} headers - Ligne d'en-têtes
 * @param {Array<string>} possibleNames - Noms possibles de la colonne
 * @returns {number} Index de la colonne ou -1 si non trouvée
 */
function findColumnIndex(headers, possibleNames) {
  if (!headers) return -1;

  for (let i = 0; i < headers.length; i++) {
    const header = String(headers[i] || '').toLowerCase();
    if (possibleNames.some(name => header.includes(name.toLowerCase()))) {
      return i;
    }
  }
  return -1;
}

/**
 * Convertit une date Excel en ISO string
 * @param {number} excelDate - Nombre de jours depuis 1900
 * @returns {string} Date au format YYYY-MM-DD
 */
function excelDateToISO(excelDate) {
  // Excel compte les jours depuis le 1er janvier 1900
  // Mais il y a un bug historique : Excel pense que 1900 est bissextile
  const date = new Date((excelDate - 25569) * 86400 * 1000);
  return date.toISOString().split('T')[0];
}

/**
 * Parse une date string DD/MM/YYYY ou YYYY-MM-DD
 * @param {string} dateStr - Date en string
 * @returns {string|null} Date au format YYYY-MM-DD ou null
 */
function parseDateString(dateStr) {
  if (!dateStr) return null;

  // Format DD/MM/YYYY
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  // Format YYYY-MM-DD
  if (dateStr.includes('-') && dateStr.length === 10) {
    return dateStr;
  }

  return null;
}

/**
 * Formate une date ISO en format français
 * @param {string} dateISO - Date au format YYYY-MM-DD
 * @returns {string} Date au format DD/MM/YYYY
 */
function formatDateFR(dateISO) {
  if (!dateISO) return '';
  const [year, month, day] = dateISO.split('-');
  return `${day}/${month}/${year}`;
}
