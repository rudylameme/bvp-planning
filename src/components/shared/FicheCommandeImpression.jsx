import React from 'react';
import { Printer, X } from 'lucide-react';

/**
 * FicheCommandeImpression - Modal d'impression pour la fiche de commande BVP
 * Format A4 Portrait optimisé pour l'impression
 *
 * Colonnes essentielles pour la commande :
 * - ITM8 (code commande)
 * - Produit (libellé)
 * - CDT (petit)
 * - À CMD (quantité totale)
 * - Liv 1, Liv 2, Liv 3... (répartition)
 */
export default function FicheCommandeImpression({
  isVisible,
  onClose,
  produits,
  livraisons,
  magasin,
  semaine,
  annee,
  statsImpression,
  promosActives = []
}) {
  // Vérifier si un produit est en promo
  const estEnPromo = (itm8) => {
    if (!promosActives || promosActives.length === 0) return false;
    return promosActives.some(promo => promo.itm8 === itm8);
  };
  if (!isVisible) return null;

  const handlePrint = () => {
    globalThis.print();
  };

  // Formater une date pour affichage très court (juste le jour)
  const formatDateTresCourt = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const jours = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
    return `${jours[date.getDay()]} ${date.getDate()}`;
  };

  // Formater ITM8 : garder 8 chiffres et ajouter séparation pour lisibilité
  // Ex: "0000047416010" -> "4741 6010"
  const formatItm8 = (itm8) => {
    if (!itm8) return '-';
    // Enlever les zéros de tête et garder les 8 derniers chiffres significatifs
    const cleaned = itm8.toString().replace(/^0+/, '');
    const digits = cleaned.padStart(8, '0').slice(-8);
    // Séparer en 2 groupes de 4 chiffres
    return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  };

  // Filtrer les produits (exclure NC = cdtNonCommunique)
  const produitsSansNC = produits.filter(p => !p.cdtNonCommunique);

  // Grouper par famille/rayon
  const produitsParFamille = {};
  produitsSansNC.forEach(produit => {
    const famille = produit.rayon || 'AUTRE';
    if (!produitsParFamille[famille]) {
      produitsParFamille[famille] = [];
    }
    produitsParFamille[famille].push(produit);
  });

  // Calculer les totaux par famille
  const calculerTotauxFamille = (produitsFamille) => {
    const totalCartons = produitsFamille.reduce((sum, p) => sum + p.qteCommander, 0);
    const totauxParLivraison = {};
    livraisons.forEach(liv => {
      totauxParLivraison[liv.id] = produitsFamille.reduce(
        (sum, p) => sum + (p.repartition[liv.id]?.value || 0),
        0
      );
    });
    return { totalCartons, totauxParLivraison };
  };

  // Nombre de colonnes de livraison
  const nbLiv = livraisons.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 print:block print:static print:bg-transparent">
      {/* Styles d'impression inline - FORMAT PORTRAIT */}
      <style>{`
        @media print {
          /* Format page A4 PORTRAIT */
          @page {
            size: A4 portrait;
            margin: 6mm 4mm;
          }

          /* Reset complet */
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            font-size: 8pt !important;
            font-family: Arial, sans-serif !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            overflow: visible !important;
            height: auto !important;
          }

          /* Masquer TOUT par défaut */
          body * {
            visibility: hidden;
          }

          /* Rendre visible UNIQUEMENT le contenu d'impression et ses enfants */
          .print-content-area,
          .print-content-area * {
            visibility: visible !important;
          }

          /* Positionner le contenu d'impression en haut à gauche */
          .print-content-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }

          /* Header d'impression compact */
          .print-header-section {
            margin-bottom: 4px !important;
            padding-bottom: 3px !important;
            border-bottom: 1px solid black !important;
            font-size: 7pt !important;
          }

          .print-header-section .title {
            font-size: 11pt !important;
            font-weight: bold !important;
            text-align: center !important;
            margin-bottom: 2px !important;
          }

          /* Tableau compact */
          .print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 7pt !important;
            table-layout: fixed !important;
          }

          .print-table th,
          .print-table td {
            border: 1px solid #444 !important;
            padding: 1px 2px !important;
            font-size: 7pt !important;
            color: black !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
          }

          .print-table th {
            background: #ddd !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-weight: bold !important;
            font-size: 6pt !important;
          }

          .print-table thead {
            display: table-header-group;
          }

          /* Code ITM8 */
          .print-table .col-itm8 {
            font-family: monospace !important;
            font-size: 6pt !important;
            text-align: center !important;
          }

          /* Nom produit - peut déborder sur 2 lignes */
          .print-table .col-produit {
            white-space: normal !important;
            font-size: 6.5pt !important;
            line-height: 1.1 !important;
          }

          /* En-têtes famille */
          .print-table .famille-header {
            background: #bbb !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print-table .famille-header td {
            font-weight: bold !important;
            font-size: 7pt !important;
          }

          /* Lignes produits */
          .print-table tbody tr {
            page-break-inside: avoid;
          }

          /* Ligne produit en promo (surlignage) */
          .print-table tbody tr.bg-amber-50 {
            background-color: #fffbeb !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Ligne de totaux */
          .print-table .totaux-row {
            background: #999 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print-table .totaux-row td {
            font-weight: bold !important;
            font-size: 7pt !important;
            border-top: 2px solid black !important;
          }

          /* Masquer les contrôles écran */
          .screen-only {
            display: none !important;
            visibility: hidden !important;
          }

          /* Pied de page compact */
          .print-footer-section {
            margin-top: 4px !important;
            padding-top: 2px !important;
            border-top: 1px solid #666 !important;
            font-size: 7pt !important;
          }

          .signature-area {
            margin-top: 8px !important;
          }
        }
      `}</style>

      <div className="fiche-commande-print-modal absolute inset-4 bg-white rounded-lg shadow-xl flex flex-col print:static print:shadow-none print:rounded-none print:inset-0">
        {/* Header contrôles (masqué à l'impression) */}
        <div className="screen-only flex-shrink-0 bg-white border-b border-gray-300 p-4 rounded-t-lg z-10 shadow-sm">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">
              Aperçu - Fiche de Commande BVP (Portrait)
            </h3>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-colors"
              >
                <Printer className="w-4 h-4" />
                Imprimer
              </button>
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded border">
                <span className="font-medium">💡</span>
                <span>
                  {(navigator.userAgentData?.platform || navigator.userAgent).includes('Mac') ? 'Cmd+P' : 'Ctrl+P'} pour imprimer
                </span>
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 shadow-sm flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Fermer
              </button>
            </div>
          </div>
        </div>

        {/* Zone de contenu imprimable */}
        <div className="flex-1 min-h-0 print:flex-none print:min-h-full">
          <div className="h-full overflow-y-auto p-6 bg-gray-50 print:h-auto print:overflow-visible print:p-0 print:bg-white">
            <div className="print-content-area bg-white rounded shadow-sm p-6 print:p-0 print:shadow-none print:rounded-none">

              {/* En-tête d'impression compact */}
              <div className="print-header-section mb-2 pb-1 border-b border-black">
                <div className="title text-lg font-bold text-center">
                  FICHE DE COMMANDE BVP
                </div>
                <div className="flex justify-between text-xs">
                  <span><strong>{magasin?.code || '-'}</strong> - {magasin?.nom || '-'}</span>
                  <span><strong>S{semaine}/{annee}</strong></span>
                  <span>{new Date().toLocaleDateString('fr-FR')}</span>
                </div>
              </div>

              {/* Tableau des produits - colonnes essentielles */}
              <table className="print-table w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-gray-400 px-1 py-1 text-center" style={{ width: '12%' }}>ITM8</th>
                    <th className="border border-gray-400 px-1 py-1 text-left" style={{ width: `${56 - nbLiv * 6}%` }}>Produit</th>
                    {livraisons.map((liv, i) => (
                      <th key={liv.id} className="border border-gray-400 px-1 py-1 text-center bg-blue-100" style={{ width: '12%' }}>
                        <div className="font-bold">L{i + 1}</div>
                        <div className="text-[8px] font-normal">
                          Cmd: {liv.dateCommande ? formatDateTresCourt(liv.dateCommande) : '-'}
                        </div>
                        <div className="text-[8px] font-normal">
                          Liv: {liv.dateReception ? formatDateTresCourt(liv.dateReception) : '-'}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(produitsParFamille).sort().map(([famille, produitsFamille]) => {
                    const totaux = calculerTotauxFamille(produitsFamille);

                    return (
                      <React.Fragment key={famille}>
                        {/* En-tête de famille */}
                        <tr className="famille-header bg-gray-300">
                          <td className="border border-gray-400 px-1 py-1 text-center font-bold">-</td>
                          <td className="border border-gray-400 px-1 py-1 font-bold">
                            {famille} ({produitsFamille.length})
                          </td>
                          {livraisons.map(liv => (
                            <td key={liv.id} className="border border-gray-400 px-1 py-1 text-center font-bold">
                              {totaux.totauxParLivraison[liv.id] || 0}
                            </td>
                          ))}
                        </tr>

                        {/* Produits de la famille */}
                        {produitsFamille.map(produit => {
                          const produitEnPromo = estEnPromo(produit.itm8);
                          return (
                          <tr key={produit.id} className={produitEnPromo ? 'bg-amber-50' : ''}>
                            <td className="col-itm8 border border-gray-400 px-1 py-0.5 text-center font-mono text-[10px]">
                              {formatItm8(produit.itm8)}
                            </td>
                            <td className="col-produit border border-gray-400 px-1 py-0.5 text-[11px]">
                              {produitEnPromo && <span className="mr-1">⭐</span>}
                              {produit.libellePersonnalise || produit.libelle}
                            </td>
                            {livraisons.map(liv => {
                              const value = produit.repartition[liv.id]?.value || 0;
                              return (
                                <td key={liv.id} className="border border-gray-400 px-1 py-0.5 text-center font-bold">
                                  {value}
                                </td>
                              );
                            })}
                          </tr>
                        );
                        })}
                      </React.Fragment>
                    );
                  })}

                  {/* Ligne de totaux */}
                  <tr className="totaux-row bg-gray-400 font-bold">
                    <td className="border border-gray-400 px-1 py-1 text-center">-</td>
                    <td className="border border-gray-400 px-1 py-1 text-left">
                      TOTAUX ({statsImpression.nbProduits} réf.)
                    </td>
                    {livraisons.map(liv => (
                      <td key={liv.id} className="border border-gray-400 px-1 py-1 text-center">
                        {statsImpression.totauxParLivraison[liv.id] || 0}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>

              {/* Pied de page compact */}
              <div className="print-footer-section mt-2 pt-1 border-t border-gray-400 text-xs flex justify-between items-end">
                <div>
                  <strong>{statsImpression.nbProduits}</strong> réf.
                  {livraisons.map((liv, i) => (
                    <span key={liv.id} className="ml-3">
                      L{i + 1}: <strong>{statsImpression.totauxParLivraison[liv.id] || 0}</strong> colis
                    </span>
                  ))}
                </div>
                <div className="signature-area text-center">
                  <div className="w-32 border-t border-black pt-0.5 text-[10px]">
                    Signature
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
