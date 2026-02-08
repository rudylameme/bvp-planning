import React, { useState, useMemo, useCallback } from 'react';
import { Search, ChevronDown, ChevronRight, ChevronUp, AlertTriangle, RotateCcw } from 'lucide-react';
import { formatDateCourt } from '../../../utils/formatUtils';

const ORDRE_FAMILLES = ['BOULANGERIE', 'VIENNOISERIE', 'PATISSERIE', 'SNACKING', 'AUTRE'];
const EMOJI_FAMILLES = { BOULANGERIE: '🥖', VIENNOISERIE: '🥐', PATISSERIE: '🎂', SNACKING: '🥪', NEGOCE: '📦' };

const LegendeTableau = ({ promosActives }) => (
  <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-500 print:hidden no-print">
    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-50 border border-gray-200 rounded"></span> Commande auto</span>
    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-100 border border-blue-400 rounded"></span> Commande fixée</span>
    <span>|</span>
    <span className="flex items-center gap-1"><span className="text-[9px] bg-green-100 text-green-600 px-1 rounded">3j</span> Stock normal</span>
    <span className="flex items-center gap-1"><span className="text-[9px] bg-amber-100 text-amber-600 px-1 rounded">1.5j</span> Stock court</span>
    <span className="flex items-center gap-1"><span className="text-[9px] bg-purple-100 text-purple-600 px-1 rounded">✎</span> Stock manuel</span>
    {promosActives && promosActives.length > 0 && (<>
      <span>|</span>
      <span className="flex items-center gap-1"><span className="text-amber-500">⭐</span><span className="bg-amber-50 border-l-2 border-l-amber-400 px-1">En promo ({promosActives.length})</span></span>
    </>)}
  </div>
);

/**
 * TableauCommande - Tableau des besoins produit avec multi-livraisons
 * Extrait de OngletCommande (V5)
 */
const TableauCommande = ({
  produitsAvecBesoins,
  livraisons,
  qtesFixees,
  cdtPersonnalises,
  personnalisationProduits,
  stats,
  statsImpression,
  promosActives,
  handleQteChange,
  handleResetLigne,
  handleCdtChange,
  handleStockMiniChange,
  handleModeStockProduitChange,
  handleResetModeStock,
  setPersonnalisationProduits,
  modeStockDefaut,
}) => {
  const [recherche, setRecherche] = useState('');
  const [familleFiltre, setFamilleFiltre] = useState('Toutes');

  const produitsParFamille = useMemo(() => {
    const grouped = {};
    produitsAvecBesoins.forEach(produit => {
      const famille = produit.rayon || 'AUTRE';
      if (!grouped[famille]) grouped[famille] = [];
      grouped[famille].push(produit);
    });
    return grouped;
  }, [produitsAvecBesoins]);
  const produitsFiltres = useMemo(() => {
    let result = produitsAvecBesoins;
    if (recherche.trim()) {
      const searchLower = recherche.toLowerCase();
      result = result.filter(p =>
        (p.libelle || '').toLowerCase().includes(searchLower) ||
        (p.itm8 || '').includes(searchLower)
      );
    }
    if (familleFiltre !== 'Toutes') {
      result = result.filter(p => p.rayon === familleFiltre);
    }
    return result;
  }, [produitsAvecBesoins, recherche, familleFiltre]);
  const familles = useMemo(() => ['Toutes', ...Object.keys(produitsParFamille).sort()], [produitsParFamille]);

  const [sectionsOuvertes, setSectionsOuvertes] = useState({
    BOULANGERIE: true,
    VIENNOISERIE: true,
    PATISSERIE: true,
    SNACKING: true,
    NEGOCE: true,
    AUTRE: true
  });
  const [triColonne, setTriColonne] = useState(null);
  const [triOrdre, setTriOrdre] = useState('asc');
  const toggleSection = (famille) => {
    setSectionsOuvertes(prev => ({ ...prev, [famille]: !prev[famille] }));
  };
  const handleTri = (colonne) => {
    if (triColonne === colonne) {
      if (triOrdre === 'asc') {
        setTriOrdre('desc');
      } else {
        setTriColonne(null);
        setTriOrdre('asc');
      }
    } else {
      setTriColonne(colonne);
      setTriOrdre('asc');
    }
  };

  const trierProduits = useCallback((produits) => {
    if (!triColonne) return produits;
    return [...produits].sort((a, b) => {
      let valA, valB;
      switch (triColonne) {
        case 'produit':
          valA = (a.libellePersonnalise || a.libelle || '').toLowerCase();
          valB = (b.libellePersonnalise || b.libelle || '').toLowerCase();
          break;
        case 'cdt': valA = a.cdt || 0; valB = b.cdt || 0; break;
        case 'mini': valA = a.stockMini || 0; valB = b.stockMini || 0; break;
        case 'stock': valA = a.stockActuel ?? -1; valB = b.stockActuel ?? -1; break;
        case 'total': valA = a.qteCommander || 0; valB = b.qteCommander || 0; break;
        default:
          if (triColonne.startsWith('cmd_')) {
            const livId = parseInt(triColonne.split('_')[1]);
            valA = a.repartition[livId]?.value || 0;
            valB = b.repartition[livId]?.value || 0;
          } else { return 0; }
      }
      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(valB);
        return triOrdre === 'asc' ? cmp : -cmp;
      }
      const cmp = valA - valB;
      return triOrdre === 'asc' ? cmp : -cmp;
    });
  }, [triColonne, triOrdre]);
  const TriableHeader = ({ colonne, children, className = '' }) => {
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
  const hasManualChanges = (itm8) => {
    const fixees = qtesFixees[itm8];
    return fixees ? Object.values(fixees).some(v => v !== null && v !== undefined) : false;
  };
  const estEnPromo = useCallback((itm8) => {
    return promosActives?.length > 0 && promosActives.some(promo => promo.itm8 === itm8);
  }, [promosActives]);
  const getInfoPromo = useCallback((itm8) => {
    return promosActives?.length > 0 ? promosActives.find(promo => promo.itm8 === itm8) : null;
  }, [promosActives]);

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un produit..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ED1C24]/20 focus:border-[#ED1C24]"
            />
          </div>
          <select
            value={familleFiltre}
            onChange={(e) => setFamilleFiltre(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ED1C24]/20 focus:border-[#ED1C24]"
          >
            {familles.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
      </div>
      {stats.sansStock > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-700">
              {stats.sansStock} produit{stats.sansStock > 1 ? 's' : ''} sans stock renseigné
            </p>
            <p className="text-sm text-amber-600">
              Demandez à l'équipe de saisir l'inventaire pour optimiser les commandes.
            </p>
          </div>
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:border-0 print:rounded-none print-table-container">
        <div className="px-6 py-4 border-b border-gray-200 print:hidden">
          <h3 className="font-semibold text-[#58595B]">
            Tableau des besoins ({produitsFiltres.length} produits)
          </h3>
        </div>
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full print:text-xs">
            <thead className="bg-gray-50 print:bg-gray-200">
              <tr>
                <TriableHeader colonne="produit" className="text-left w-auto px-3">Produit</TriableHeader>
                <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase w-14">Cuisson</th>
                <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase w-14">U/Plq</th>
                <TriableHeader colonne="cdt" className="w-14">CDT</TriableHeader>
                <TriableHeader colonne="mini" className="w-16">Mini</TriableHeader>
                <TriableHeader colonne="stock" className="w-16">Stock</TriableHeader>
                <TriableHeader colonne="total" className="w-20 bg-[#ED1C24]/10">À CMD</TriableHeader>
                {livraisons.map((liv, i) => (
                  <TriableHeader key={liv.id} colonne={`cmd_${liv.id}`} className="w-20 bg-blue-50">
                    <div className="flex flex-col items-center">
                      <span>Liv {i + 1}</span>
                      <span className="text-[10px] font-normal normal-case print:text-[8px]">
                        {liv.dateReception ? formatDateCourt(liv.dateReception).split(' ')[0] : '-'}
                      </span>
                    </div>
                  </TriableHeader>
                ))}
                <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase w-10 print:hidden"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {Object.entries(produitsParFamille)
                .sort(([a], [b]) => {
                  const ia = ORDRE_FAMILLES.indexOf(a);
                  const ib = ORDRE_FAMILLES.indexOf(b);
                  return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
                })
                .map(([famille, produitsFamille]) => {
                const produitsAffiches = produitsFamille.filter(p => produitsFiltres.includes(p));
                if (produitsAffiches.length === 0) return null;
                const familleADesQtes = produitsAffiches.some(p => p.qteCommander > 0);
                if (!familleADesQtes) return null;
                const produitsAffichesTries = trierProduits(produitsAffiches);
                const isOuvert = sectionsOuvertes[famille];
                const totalFamilleCartons = produitsAffiches.reduce((sum, p) => sum + p.qteCommander, 0);
                const totauxFamilleParLivraison = {};
                livraisons.forEach(liv => {
                  totauxFamilleParLivraison[liv.id] = produitsAffiches.reduce(
                    (sum, p) => sum + (p.repartition[liv.id]?.value || 0), 0);
                });
                const produitsAImprimer = produitsAffiches.filter(p => !p.cdtNonCommunique);
                const totalFamilleCartonsImpr = produitsAImprimer.reduce((sum, p) => sum + p.qteCommander, 0);
                const totauxFamilleParLivraisonImpr = {};
                livraisons.forEach(liv => {
                  totauxFamilleParLivraisonImpr[liv.id] = produitsAImprimer.reduce(
                    (sum, p) => sum + (p.repartition[liv.id]?.value || 0), 0);
                });
                return (
                  <React.Fragment key={famille}>
                    <tr
                      className="bg-[#E8E1D5]/30 cursor-pointer hover:bg-[#E8E1D5]/50 print:bg-gray-300 print:cursor-default print-famille-header"
                      onClick={() => toggleSection(famille)}
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2 font-medium text-[#58595B]">
                          <span className="print:hidden">{isOuvert ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</span>
                          <span className="print:hidden">{EMOJI_FAMILLES[famille] || '📋'}</span>
                          <span>{famille}</span>
                          <span className="print:hidden">({produitsAffiches.length})</span>
                          <span className="hidden print:inline">({produitsAImprimer.length})</span>
                        </div>
                      </td>
                      {[...Array(5)].map((_, i) => <td key={i} className="px-2 py-2 text-center text-xs text-gray-400">-</td>)}
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
                              EAN: {produit.codeEAN || produit.itm8}
                            </div>
                          </td>
                          <td className="px-1 py-2 text-center print:px-1 print:py-1">
                            <input
                              type="text"
                              value={personnalisationProduits[produit.itm8]?.programmeCuisson ?? produit.programme ?? ''}
                              onChange={(e) => setPersonnalisationProduits(prev => ({
                                ...prev,
                                [produit.itm8]: { ...prev[produit.itm8], programmeCuisson: e.target.value }
                              }))}
                              placeholder="-"
                              className="w-12 px-1 py-1 text-sm text-center border border-gray-200 rounded focus:ring-1 focus:ring-[#8B1538] focus:border-[#8B1538] placeholder:text-gray-300"
                              title="Programme de cuisson (ex: P1, P2...)"
                            />
                          </td>
                          <td className="px-1 py-2 text-center print:px-1 print:py-1">
                            <input
                              type="number"
                              min="1"
                              value={personnalisationProduits[produit.itm8]?.unitesParPlaque ?? produit.unitesParPlaque ?? ''}
                              onChange={(e) => setPersonnalisationProduits(prev => ({
                                ...prev,
                                [produit.itm8]: { ...prev[produit.itm8], unitesParPlaque: parseInt(e.target.value) || 0 }
                              }))}
                              placeholder="-"
                              className="w-12 px-1 py-1 text-sm text-center border border-gray-200 rounded focus:ring-1 focus:ring-[#8B1538] focus:border-[#8B1538] placeholder:text-gray-300"
                              title="Nombre d'unités par plaque"
                            />
                          </td>
                          <td className="px-2 py-2 text-center print:px-1 print:py-1">
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
                            <span className="hidden print:inline text-xs">{produit.cdt || '-'}</span>
                          </td>
                          <td className="px-2 py-2 text-center print:px-1 print:py-1">
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
              <tr className="bg-gray-100 font-semibold print:bg-gray-300 print-totaux">
                <td colSpan={6} className="px-3 py-3 text-right text-sm text-gray-700 print:text-xs print:font-bold">
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

        <LegendeTableau promosActives={promosActives} />
      </div>
    </>
  );
};

export default TableauCommande;
