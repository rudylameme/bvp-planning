import React from 'react';
import { ChevronDown, ChevronRight, ChevronUp, RotateCcw } from 'lucide-react';
import { formatDateCourt } from '../../../utils/formatUtils';

/**
 * En-tête de colonne triable
 */
const TriableHeader = ({ colonne, children, className = '', triColonne, triOrdre, handleTri }) => {
  const isActive = triColonne === colonne;
  return (
    <th
      className={`px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none ${className}`}
      onClick={() => handleTri(colonne)}
      title={`Cliquez pour trier par ${children}`}
    >
      <div className="flex items-center justify-center gap-1">
        <span>{children}</span>
        {isActive && (
          triOrdre === 'asc'
            ? <ChevronUp className="w-3 h-3 text-[#ED1C24]" />
            : <ChevronDown className="w-3 h-3 text-[#ED1C24]" />
        )}
      </div>
    </th>
  );
};

/**
 * TableauCommandeResp - Tableau des besoins avec multi-livraisons
 * Inclut les en-têtes de famille, les lignes produits, les totaux et la légende
 */
const TableauCommandeResp = ({
  produitsFiltres,
  produitsParFamille,
  livraisons,
  stats,
  statsImpression,
  sectionsOuvertes,
  toggleSection,
  triColonne,
  triOrdre,
  handleTri,
  trierProduits,
  qtesFixees,
  cdtPersonnalises,
  hasManualChanges,
  estEnPromo,
  getInfoPromo,
  handleQteChange,
  handleResetLigne,
  handleCdtChange,
  handleStockMiniChange,
  handleModeStockProduitChange,
  handleResetModeStock,
  promosActives
}) => {
  return (
    <>
      {/* Tableau des besoins avec multi-livraisons */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6 print:shadow-none print:border-0 print:rounded-none print-table-container">
        <div className="px-6 py-4 border-b border-gray-200 print:hidden">
          <h3 className="font-semibold text-[#58595B]">
            Tableau des besoins ({produitsFiltres.length} produits)
          </h3>
        </div>

        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full print:text-xs">
            <thead className="bg-gray-50 print:bg-gray-200">
              <tr>
                <TriableHeader colonne="produit" className="text-left w-auto px-3" triColonne={triColonne} triOrdre={triOrdre} handleTri={handleTri}>
                  Produit
                </TriableHeader>
                <TriableHeader colonne="cdt" className="w-14" triColonne={triColonne} triOrdre={triOrdre} handleTri={handleTri}>
                  CDT
                </TriableHeader>
                <TriableHeader colonne="mini" className="w-16" triColonne={triColonne} triOrdre={triOrdre} handleTri={handleTri}>
                  Mini
                </TriableHeader>
                <TriableHeader colonne="stock" className="w-16" triColonne={triColonne} triOrdre={triOrdre} handleTri={handleTri}>
                  Stock
                </TriableHeader>
                <TriableHeader colonne="total" className="w-20 bg-[#ED1C24]/10" triColonne={triColonne} triOrdre={triOrdre} handleTri={handleTri}>
                  À CMD
                </TriableHeader>
                {livraisons.map((liv, i) => (
                  <TriableHeader key={liv.id} colonne={`cmd_${liv.id}`} className="w-20 bg-blue-50" triColonne={triColonne} triOrdre={triOrdre} handleTri={handleTri}>
                    <div className="flex flex-col items-center">
                      <span>Liv {i + 1}</span>
                      <span className="text-[10px] font-normal normal-case print:text-[8px]">
                        {liv.dateReception ? formatDateCourt(liv.dateReception).split(' ')[0] : '-'}
                      </span>
                    </div>
                  </TriableHeader>
                ))}
                <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase w-10 print:hidden">

                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {Object.entries(produitsParFamille).sort().map(([famille, produitsFamille]) => {
                const produitsAffiches = produitsFamille.filter(p => produitsFiltres.includes(p));
                if (produitsAffiches.length === 0) return null;

                // Appliquer le tri aux produits de la famille
                const produitsAffichesTries = trierProduits(produitsAffiches);

                const isOuvert = sectionsOuvertes[famille];
                const totalFamilleCartons = produitsAffiches.reduce((sum, p) => sum + p.qteCommander, 0);

                // Calculer les totaux par livraison pour cette famille
                const totauxFamilleParLivraison = {};
                livraisons.forEach(liv => {
                  totauxFamilleParLivraison[liv.id] = produitsAffiches.reduce(
                    (sum, p) => sum + (p.repartition[liv.id]?.value || 0),
                    0
                  );
                });

                // Compter les produits à imprimer (sans NC)
                const produitsAImprimer = produitsAffiches.filter(p => !p.cdtNonCommunique);
                const totalFamilleCartonsImpr = produitsAImprimer.reduce((sum, p) => sum + p.qteCommander, 0);
                const totauxFamilleParLivraisonImpr = {};
                livraisons.forEach(liv => {
                  totauxFamilleParLivraisonImpr[liv.id] = produitsAImprimer.reduce(
                    (sum, p) => sum + (p.repartition[liv.id]?.value || 0),
                    0
                  );
                });

                return (
                  <React.Fragment key={famille}>
                    {/* En-tête de famille */}
                    <tr
                      className="bg-[#E8E1D5]/30 cursor-pointer hover:bg-[#E8E1D5]/50 print:bg-gray-300 print:cursor-default print-famille-header"
                      onClick={() => toggleSection(famille)}
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2 font-medium text-[#58595B]">
                          <span className="print:hidden">{isOuvert ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</span>
                          <span className="print:hidden">
                            {famille === 'BOULANGERIE' && '🥖'}
                            {famille === 'VIENNOISERIE' && '🥐'}
                            {famille === 'PATISSERIE' && '🎂'}
                            {famille === 'SNACKING' && '🥪'}
                            {famille === 'NEGOCE' && '📦'}
                            {!['BOULANGERIE', 'VIENNOISERIE', 'PATISSERIE', 'SNACKING', 'NEGOCE'].includes(famille) && '📋'}
                          </span>
                          <span>{famille}</span>
                          <span className="print:hidden">({produitsAffiches.length})</span>
                          <span className="hidden print:inline">({produitsAImprimer.length})</span>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center text-xs text-gray-400">-</td>
                      <td className="px-2 py-2 text-center text-xs text-gray-400">-</td>
                      <td className="px-2 py-2 text-center text-xs text-gray-400">-</td>
                      <td className="px-2 py-2 text-center font-semibold text-[#ED1C24] bg-[#ED1C24]/5 print:bg-transparent">
                        <span className="print:hidden">{totalFamilleCartons}</span>
                        <span className="hidden print:inline">{totalFamilleCartonsImpr}</span>
                      </td>
                      {livraisons.map(liv => (
                        <td key={liv.id} className="px-2 py-2 text-center font-semibold text-blue-700 bg-blue-50/50 print:bg-transparent">
                          <span className="print:hidden">{totauxFamilleParLivraison[liv.id] || 0}</span>
                          <span className="hidden print:inline">{totauxFamilleParLivraisonImpr[liv.id] || 0}</span>
                        </td>
                      ))}
                      <td className="print:hidden"></td>
                    </tr>

                    {/* Produits de la famille */}
                    {isOuvert && produitsAffichesTries.map(produit => {
                      const hasChanges = hasManualChanges(produit.itm8);
                      const produitEnPromo = estEnPromo(produit.itm8);
                      const infoPromo = produitEnPromo ? getInfoPromo(produit.itm8) : null;

                      return (
                        <tr
                          key={produit.id}
                          className={`hover:bg-gray-50 ${produit.surCommande ? 'bg-red-50' : ''} ${produitEnPromo ? 'bg-amber-50 border-l-4 border-l-amber-400' : ''} ${produit.cdtNonCommunique ? 'print:hidden' : ''}`}
                        >
                          <td className="px-3 py-2 print:px-1 print:py-1">
                            <div className="font-medium text-gray-900 text-sm print:text-xs flex items-center gap-1.5">
                              {produitEnPromo && (
                                <span className="text-amber-500 flex-shrink-0" title={`En promo : ${infoPromo?.promotion || 'Promotion active'}`}>⭐</span>
                              )}
                              <span>{produit.libellePersonnalise || produit.libelle}</span>
                              {produitEnPromo && infoPromo?.promotion && (
                                <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-normal ml-1 print:hidden">
                                  {infoPromo.promotion}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 print:hidden">
                              ITM8: {produit.itm8}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-center print:px-1 print:py-1">
                            {/* Version écran avec input */}
                            <span className="print:hidden">
                              {produit.cdtNonCommunique ? (
                                <input
                                  type="text"
                                  placeholder="NC"
                                  value={cdtPersonnalises[produit.itm8] || ''}
                                  onChange={(e) => handleCdtChange(produit.itm8, e.target.value)}
                                  className="w-14 px-1 py-1 text-sm text-center border border-amber-400 bg-amber-50 text-amber-600 rounded focus:ring-1 focus:ring-purple-500 focus:border-purple-500 placeholder:text-amber-400 placeholder:font-medium"
                                  title="Non Communiqué - Saisir un CDT pour activer le calcul"
                                />
                              ) : (
                                <input
                                  type="number"
                                  min="1"
                                  value={produit.cdt}
                                  onChange={(e) => handleCdtChange(produit.itm8, e.target.value)}
                                  className={`w-14 px-1 py-1 text-sm text-center border rounded transition-colors ${
                                    produit.cdtEstPersonnalise
                                      ? 'border-purple-400 bg-purple-50 text-purple-700 font-medium'
                                      : 'border-gray-300 text-gray-600'
                                  } focus:ring-1 focus:ring-purple-500 focus:border-purple-500`}
                                  title={
                                    produit.cdtEstPersonnalise
                                      ? 'CDT modifié manuellement (effacer pour revenir au CDT référence)'
                                      : 'CDT du fichier référence - modifiable'
                                  }
                                />
                              )}
                            </span>
                            {/* Version impression: texte simple */}
                            <span className="hidden print:inline text-xs">{produit.cdt || '-'}</span>
                          </td>
                          <td className="px-2 py-2 text-center print:px-1 print:py-1">
                            {/* Version écran avec sélecteur de mode */}
                            <span className="print:hidden">
                              <div className="flex flex-col items-center gap-0.5">
                                <input
                                  type="number"
                                  min="0"
                                  value={produit.stockMini}
                                  onChange={(e) => handleStockMiniChange(produit.itm8, e.target.value)}
                                  className={`w-14 px-1 py-1 text-sm text-center border rounded transition-colors ${
                                    produit.stockMiniEstManuel
                                      ? 'border-purple-400 bg-purple-50 text-purple-700 font-medium'
                                      : produit.modeProduit === 'court'
                                        ? 'border-amber-400 bg-amber-50 text-amber-700'
                                        : 'border-green-400 bg-green-50 text-green-700'
                                  } focus:ring-1 focus:ring-green-500 focus:border-green-500`}
                                  title={`Stock mini: ${produit.stockMini} cartons (${Math.round(produit.stockMiniUnites)} unités) - Mode: ${produit.stockMiniEstManuel ? 'Manuel' : produit.modeProduit === 'court' ? 'Court 1.5j' : 'Normal 3j'}`}
                                />
                                {/* Indicateur de mode cliquable */}
                                <button
                                  onClick={() => {
                                    if (produit.stockMiniEstManuel) {
                                      handleResetModeStock(produit.itm8);
                                    } else {
                                      const nextMode = produit.modeProduit === 'normal' ? 'court' : 'normal';
                                      handleModeStockProduitChange(produit.itm8, nextMode);
                                    }
                                  }}
                                  className={`text-[9px] px-1 rounded transition-colors ${
                                    produit.stockMiniEstManuel
                                      ? 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                                      : produit.modeProduit === 'court'
                                        ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                                        : 'bg-green-100 text-green-600 hover:bg-green-200'
                                  }`}
                                  title={produit.stockMiniEstManuel ? 'Cliquer pour revenir au mode auto' : 'Cliquer pour changer de mode'}
                                >
                                  {produit.stockMiniEstManuel ? '✎' : produit.modeProduit === 'court' ? '1.5j' : '3j'}
                                </button>
                              </div>
                            </span>
                            {/* Version impression: texte simple */}
                            <span className="hidden print:inline text-xs">{produit.stockMini}</span>
                          </td>
                          <td className="px-2 py-2 text-center text-sm text-gray-600 print:px-1 print:py-1 print:text-xs">
                            {produit.stockActuel !== null ? produit.stockActuel : <span className="text-gray-400">--</span>}
                          </td>
                          <td className="px-2 py-2 text-center bg-[#ED1C24]/5 print:bg-transparent print:px-1 print:py-1 print-total-col">
                            <span className={`font-bold text-sm print:text-xs ${produit.qteCommander > 0 ? 'text-[#ED1C24] print:text-black' : 'text-gray-400'}`}>
                              {produit.qteCommander}
                            </span>
                          </td>
                          {livraisons.map(liv => {
                            const rep = produit.repartition[liv.id];
                            const isAuto = rep?.isAuto;
                            const value = rep?.value || 0;

                            return (
                              <td key={liv.id} className="px-2 py-2 text-center bg-blue-50/50 print:bg-transparent print:px-1 print:py-1 print-cmd-col">
                                {/* Version écran avec input */}
                                <span className="print:hidden">
                                  <input
                                    type="number"
                                    min="0"
                                    value={isAuto ? value : (qtesFixees[produit.itm8]?.[liv.id] ?? '')}
                                    onChange={(e) => handleQteChange(produit.itm8, liv.id, e.target.value)}
                                    placeholder={isAuto ? value.toString() : ''}
                                    className={`w-14 px-1 py-1 text-sm text-center border rounded transition-colors ${
                                      isAuto
                                        ? 'border-gray-200 bg-gray-50 text-gray-500'
                                        : 'border-blue-400 bg-blue-100 text-blue-800 font-medium'
                                    } focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                                    title={isAuto ? 'Calculé automatiquement' : 'Valeur fixée manuellement'}
                                  />
                                </span>
                                {/* Version impression: texte simple */}
                                <span className="hidden print:inline text-xs font-medium">{value}</span>
                              </td>
                            );
                          })}
                          <td className="px-2 py-2 text-center print:hidden">
                            {hasChanges && (
                              <button
                                onClick={() => handleResetLigne(produit.itm8)}
                                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Remettre en mode automatique"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}

              {/* Ligne de totaux */}
              <tr className="bg-gray-100 font-semibold print:bg-gray-300 print-totaux">
                <td colSpan={4} className="px-3 py-3 text-right text-sm text-gray-700 print:text-xs print:font-bold">
                  TOTAUX
                </td>
                <td className="px-2 py-3 text-center text-[#ED1C24] bg-[#ED1C24]/10 print:bg-transparent print:text-black print:font-bold">
                  <span className="print:hidden">{stats.totalCartons}</span>
                  <span className="hidden print:inline">{statsImpression.totalCartons}</span>
                </td>
                {livraisons.map(liv => (
                  <td key={liv.id} className="px-2 py-3 text-center text-blue-700 bg-blue-100 print:bg-transparent print:text-black print:font-bold">
                    <span className="print:hidden">{stats.totauxParLivraison[liv.id] || 0}</span>
                    <span className="hidden print:inline">{statsImpression.totauxParLivraison[liv.id] || 0}</span>
                  </td>
                ))}
                <td className="print:hidden"></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-500 print:hidden no-print">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-gray-50 border border-gray-200 rounded"></span> Commande auto
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-blue-100 border border-blue-400 rounded"></span> Commande fixée
          </span>
          <span>|</span>
          <span className="flex items-center gap-1">
            <span className="text-[9px] bg-green-100 text-green-600 px-1 rounded">3j</span> Stock normal
          </span>
          <span className="flex items-center gap-1">
            <span className="text-[9px] bg-amber-100 text-amber-600 px-1 rounded">1.5j</span> Stock court
          </span>
          <span className="flex items-center gap-1">
            <span className="text-[9px] bg-purple-100 text-purple-600 px-1 rounded">✎</span> Stock manuel
          </span>
          {promosActives && promosActives.length > 0 && (
            <>
              <span>|</span>
              <span className="flex items-center gap-1">
                <span className="text-amber-500">⭐</span>
                <span className="bg-amber-50 border-l-2 border-l-amber-400 px-1">En promo ({promosActives.length})</span>
              </span>
            </>
          )}
        </div>
      </div>

      {/* Pied de page impression */}
      <div className="hidden print:block mt-4 pt-2 border-t border-gray-400 text-xs">
        <div className="flex justify-between">
          <div>
            <strong>Total :</strong> {statsImpression.nbProduits} références | {statsImpression.totalCartons} cartons
          </div>
          <div className="flex gap-8">
            {livraisons.map((liv, i) => (
              <div key={liv.id}>
                <strong>Liv.{i + 1} :</strong> {statsImpression.totauxParLivraison[liv.id] || 0} cartons
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <div className="text-center">
            <div className="w-48 border-t border-black pt-1">
              Signature Responsable
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TableauCommandeResp;
