/**
 * Onglet Gamme - Sélection des produits avec tableau flat
 */
import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Check,
  X,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { formatEuro } from '../../../utils/formatUtils';
import PopupCasse from './PopupCasse';
import PopupVentes from './PopupVentes';

// Ordre d'affichage des rayons
const ORDRE_RAYONS = {
  BOULANGERIE: 1,
  VIENNOISERIE: 2,
  SNACKING: 3,
  PATISSERIE: 4,
  AUTRE: 5,
};

// Couleurs par rayon (charte Mousquetaires)
const COULEURS_RAYON = {
  BOULANGERIE: { bg: 'bg-stone-100', border: 'border-stone-300', text: 'text-stone-800', header: 'bg-stone-200' },
  VIENNOISERIE: { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-800', header: 'bg-amber-200' },
  PATISSERIE: { bg: 'bg-rose-100', border: 'border-rose-300', text: 'text-rose-800', header: 'bg-rose-200' },
  SNACKING: { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-800', header: 'bg-emerald-200' },
  AUTRE: { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-800', header: 'bg-slate-200' },
};

// Couleur du taux de casse produit : < 5% vert, 5-20% orange, > 20% rouge
const getCouleurTauxCasse = (taux) => {
  if (taux < 5) return { text: 'text-green-600', bg: 'bg-green-100' };
  if (taux <= 20) return { text: 'text-amber-600', bg: 'bg-amber-100' };
  return { text: 'text-red-600', bg: 'bg-red-100' };
};

/**
 * Badge rayon avec couleur
 */
const BadgeRayon = ({ rayon, onClick }) => {
  const couleurs = COULEURS_RAYON[rayon] || COULEURS_RAYON.AUTRE;
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title="Cliquer pour changer la famille"
        className={`px-2 py-1 rounded text-xs font-semibold ${couleurs.bg} ${couleurs.text} ${couleurs.border} border cursor-pointer hover:opacity-80 transition-opacity`}
      >
        {rayon}
      </button>
    );
  }
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${couleurs.bg} ${couleurs.text} ${couleurs.border} border`}>
      {rayon}
    </span>
  );
};

/**
 * Tableau des produits (flat, avec rayon en colonne)
 * Colonnes : Actif | Produit | Rayon | Casse % | Moy. Hebdo | Potentiel | CA Hebdo | Tendance | Fiabilité
 */
const TableauProduits = ({ produits, onToggle, onChangeRayon, recherche, filtreRayon, planifieManager, onChangePlanifie, promoItm8Set, promoPrecedenteMap }) => {
  const [tri, setTri] = useState({ colonne: 'caSemaine', ordre: 'desc' });
  const [popupCasseId, setPopupCasseId] = useState(null);
  const [popupVentesId, setPopupVentesId] = useState(null);
  const [editingPlanifieId, setEditingPlanifieId] = useState(null);
  const [editingPlanifieValue, setEditingPlanifieValue] = useState('');

  // Filtrer les produits
  const produitsFiltres = useMemo(() => {
    return produits
      .filter((p) => !recherche || p.libelle.toLowerCase().includes(recherche.toLowerCase()))
      .filter((p) => !filtreRayon || filtreRayon === 'tous' || p.rayon === filtreRayon);
  }, [produits, recherche, filtreRayon]);

  const handleTri = (colonne) => {
    setTri((prev) => ({
      colonne,
      ordre: prev.colonne === colonne && prev.ordre === 'desc' ? 'asc' : 'desc',
    }));
  };

  // Trier les produits
  const produitsTries = useMemo(() => {
    return [...produitsFiltres].sort((a, b) => {
      let valA, valB;
      switch (tri.colonne) {
        case 'libelle':
          valA = a.libelle.toLowerCase();
          valB = b.libelle.toLowerCase();
          return tri.ordre === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'rayon':
          valA = ORDRE_RAYONS[a.rayon] || 99;
          valB = ORDRE_RAYONS[b.rayon] || 99;
          break;
        case 'moyHebdo':
          valA = a.moyHebdo || a.ventesQteSemaine || 0;
          valB = b.moyHebdo || b.ventesQteSemaine || 0;
          break;
        case 'planifie':
          valA = planifieManager?.[a.id] ?? a.potentiel ?? 0;
          valB = planifieManager?.[b.id] ?? b.potentiel ?? 0;
          break;
        case 'tauxCasse':
          valA = a.tauxCasse || 0;
          valB = b.tauxCasse || 0;
          break;
        case 'caSemaine':
          valA = a.caSemaine || 0;
          valB = b.caSemaine || 0;
          break;
        case 'tendancePourcent':
          valA = a.tendancePourcent || 0;
          valB = b.tendancePourcent || 0;
          break;
        case 'fiabilite':
          valA = a.fiabilite || 0;
          valB = b.fiabilite || 0;
          break;
        default:
          return 0;
      }
      if (typeof valA === 'number') {
        return tri.ordre === 'asc' ? valA - valB : valB - valA;
      }
      return 0;
    });
  }, [produitsFiltres, tri]);

  // En-tête triable
  const SortableHeader = ({ colonne, label, align = 'left' }) => {
    const isActive = tri.colonne === colonne;
    const alignClass = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : '';
    return (
      <th
        className={`px-3 py-2 text-xs font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 select-none`}
        onClick={() => handleTri(colonne)}
      >
        <div className={`flex items-center gap-1 ${alignClass}`}>
          <span>{label}</span>
          <span className={`transition-opacity ${isActive ? 'opacity-100 text-[#8B1538]' : 'opacity-30'}`}>
            {isActive && tri.ordre === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
          </span>
        </div>
      </th>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 w-12">Actif</th>
            <SortableHeader colonne="libelle" label="Produit" />
            <SortableHeader colonne="rayon" label="Rayon" align="center" />
            <SortableHeader colonne="tauxCasse" label="Casse" align="center" />
            <SortableHeader colonne="moyHebdo" label="Moy. Hebdo" align="right" />
            <SortableHeader colonne="planifie" label="Planifié" align="right" />
            <SortableHeader colonne="caSemaine" label="CA Hebdo" align="right" />
            <SortableHeader colonne="tendancePourcent" label="Tendance" align="center" />
            <SortableHeader colonne="fiabilite" label="Fiabilité" align="center" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {produitsTries.map((produit) => (
            <tr
              key={produit.id}
              className={`hover:bg-gray-50 transition-colors ${!produit.actif ? 'opacity-50 bg-gray-50' : ''}`}
            >
              <td className="px-3 py-2">
                <button
                  onClick={() => onToggle(produit.id)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                    produit.actif ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {produit.actif ? <Check size={14} /> : <X size={14} />}
                </button>
              </td>
              <td className="px-3 py-2">
                <span className="font-medium text-gray-800">
                  {produit.libelle}
                  {promoItm8Set?.has(produit.itm8) && (
                    <span className="ml-1.5 text-blue-500" title="Produit en promo">🏷️</span>
                  )}
                </span>
                {(produit.ean13 || produit.ean || produit.codeEAN) && (
                  <div className="text-xs text-gray-400">EAN: {produit.ean13 || produit.ean || produit.codeEAN}</div>
                )}
              </td>
              <td className="px-3 py-2 text-center">
                <BadgeRayon rayon={produit.rayon} onClick={() => onChangeRayon && onChangeRayon(produit.id)} />
              </td>
              <td className="px-3 py-2 text-center relative">
                <button
                  type="button"
                  onClick={() => setPopupCasseId(popupCasseId === produit.id ? null : produit.id)}
                  title="Voir l'évolution de la casse"
                  className={`px-2 py-1 rounded text-sm font-semibold cursor-pointer hover:ring-2 hover:ring-offset-1 transition-all ${getCouleurTauxCasse(produit.tauxCasse || 0).text} ${getCouleurTauxCasse(produit.tauxCasse || 0).bg} ${getCouleurTauxCasse(produit.tauxCasse || 0).text.replace('text-', 'hover:ring-')}`}
                >
                  {(produit.tauxCasse || 0).toFixed(0)}%
                </button>
                {popupCasseId === produit.id && (
                  <PopupCasse produit={produit} onClose={() => setPopupCasseId(null)} />
                )}
              </td>
              <td className="px-3 py-2 text-right font-mono relative">
                <button
                  type="button"
                  onClick={() => setPopupVentesId(popupVentesId === produit.id ? null : produit.id)}
                  title="Voir l'historique des ventes"
                  className="px-2 py-1 rounded text-sm font-semibold cursor-pointer hover:ring-2 hover:ring-blue-300 hover:ring-offset-1 transition-all text-blue-700 bg-blue-50 hover:bg-blue-100"
                >
                  {produit.moyHebdo || produit.ventesQteSemaine || 0}
                </button>
                {popupVentesId === produit.id && (
                  <PopupVentes produit={produit} onClose={() => setPopupVentesId(null)} />
                )}
              </td>
              <td className="px-3 py-2 text-right">
                {editingPlanifieId === produit.id ? (
                  <input
                    type="number"
                    min="0"
                    value={editingPlanifieValue}
                    onChange={(e) => setEditingPlanifieValue(e.target.value)}
                    onBlur={() => {
                      const val = parseInt(editingPlanifieValue, 10);
                      onChangePlanifie(produit.id, isNaN(val) || val <= 0 ? null : val);
                      setEditingPlanifieId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = parseInt(editingPlanifieValue, 10);
                        onChangePlanifie(produit.id, isNaN(val) || val <= 0 ? null : val);
                        setEditingPlanifieId(null);
                      }
                      if (e.key === 'Escape') setEditingPlanifieId(null);
                    }}
                    autoFocus
                    className="w-20 px-2 py-1 text-right font-mono text-sm border border-[#8B1538] rounded-lg focus:ring-2 focus:ring-[#8B1538] outline-none bg-red-50"
                  />
                ) : planifieManager?.[produit.id] != null ? (
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPlanifieId(produit.id);
                        setEditingPlanifieValue(String(planifieManager[produit.id]));
                      }}
                      className="font-mono text-sm font-bold text-[#8B1538] bg-red-50 border border-[#8B1538]/30 px-2 py-1 rounded-lg hover:bg-red-100 transition-colors"
                      title="Cliquer pour modifier"
                    >
                      {planifieManager[produit.id]}
                      <span className="ml-1 text-[10px]">✏️</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangePlanifie(produit.id, null)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-0.5"
                      title="Revenir au potentiel algo"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPlanifieId(produit.id);
                      setEditingPlanifieValue(String(produit.potentiel || ''));
                    }}
                    className="font-mono text-sm font-semibold text-gray-800 px-2 py-1 rounded-lg hover:bg-gray-100 border border-transparent hover:border-gray-300 transition-colors"
                    title="Cliquer pour modifier la préconisation"
                  >
                    {produit.potentiel || '-'}
                  </button>
                )}
                {/* Indicateur "Était en promo S-1" */}
                {(() => {
                  const promPrec = promoPrecedenteMap?.get(produit.itm8) || promoPrecedenteMap?.get(produit.plu);
                  if (!promPrec) return null;
                  const moyNormale = produit.moyHebdo || produit.ventesQteSemaine || 0;
                  return (
                    <div className="text-[10px] text-amber-600 mt-0.5" title={`Était en promo S-1 (qté: ${promPrec.qteValidee}), moy. normale: ${moyNormale}`}>
                      ⚠️ promo S-1, moy: {moyNormale}
                    </div>
                  );
                })()}
              </td>
              <td className="px-3 py-2 text-right font-mono text-gray-700">
                {(() => {
                  const moyQte = produit.moyHebdo || 0;
                  const prixMoyen = moyQte > 0 ? (produit.caSemaine || 0) / moyQte : 0;
                  const qte = planifieManager?.[produit.id] ?? produit.potentiel ?? moyQte;
                  return formatEuro(qte * prixMoyen);
                })()}
              </td>
              <td className="px-3 py-2 text-center">
                <div className="inline-flex items-center gap-1">
                  {produit.tendance === 'croissance' && <TrendingUp className="text-green-500" size={14} />}
                  {produit.tendance === 'declin' && <TrendingDown className="text-red-500" size={14} />}
                  {produit.tendance === 'stable' && <Minus className="text-gray-400" size={14} />}
                  <span
                    className={`text-xs font-medium ${
                      (produit.tendancePourcent || 0) > 0
                        ? 'text-green-600'
                        : (produit.tendancePourcent || 0) < 0
                        ? 'text-red-600'
                        : 'text-gray-500'
                    }`}
                  >
                    {(produit.tendancePourcent || 0) > 0 ? '+' : ''}
                    {produit.tendancePourcent || 0}%
                  </span>
                </div>
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center justify-center gap-1">
                  <div className="w-12 bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        (produit.fiabilite || 0) >= 70 ? 'bg-green-500' : (produit.fiabilite || 0) >= 40 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${produit.fiabilite || 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-8">{produit.fiabilite || 0}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {produitsTries.length === 0 && (
        <div className="text-center py-12 text-gray-500">Aucun produit trouvé</div>
      )}
    </div>
  );
};

/**
 * Onglet Gamme - Sélection des produits
 */
const OngletGamme = ({ produits, onToggle, onToggleFiltres, onChangeRayon, planifieManager, onChangePlanifie, promoItm8Set, promoPrecedenteMap }) => {
  const [recherche, setRecherche] = useState('');
  const [filtreRayon, setFiltreRayon] = useState('tous');

  // Rayons disponibles dans les produits
  const rayonsDisponibles = useMemo(() => {
    const rayons = [...new Set(produits.map((p) => p.rayon))];
    return rayons.sort((a, b) => (ORDRE_RAYONS[a] || 99) - (ORDRE_RAYONS[b] || 99));
  }, [produits]);

  // Produits filtrés (visibles) — pour les boutons Tout activer/désactiver
  const produitsFiltres = useMemo(() => {
    return produits
      .filter((p) => !recherche || p.libelle.toLowerCase().includes(recherche.toLowerCase()))
      .filter((p) => !filtreRayon || filtreRayon === 'tous' || p.rayon === filtreRayon);
  }, [produits, recherche, filtreRayon]);

  const nbFiltres = produitsFiltres.length;

  return (
    <div className="space-y-4">
      {/* Barre d'outils */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Rechercher un produit..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B1538] focus:border-[#8B1538] outline-none"
          />
        </div>

        {/* Filtre par rayon */}
        <select
          value={filtreRayon}
          onChange={(e) => setFiltreRayon(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B1538] focus:border-[#8B1538] outline-none bg-white"
        >
          <option value="tous">Tous les rayons</option>
          {rayonsDisponibles.map((rayon) => (
            <option key={rayon} value={rayon}>{rayon}</option>
          ))}
        </select>

        <button
          onClick={() => onToggleFiltres(produitsFiltres.map(p => p.id), true)}
          className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm font-medium border border-green-200"
        >
          Tout activer ({nbFiltres})
        </button>
        <button
          onClick={() => onToggleFiltres(produitsFiltres.map(p => p.id), false)}
          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium border border-red-200"
        >
          Tout désactiver
        </button>
      </div>

      {/* Tableau flat avec rayon en colonne */}
      <TableauProduits
        produits={produits}
        onToggle={onToggle}
        onChangeRayon={onChangeRayon}
        recherche={recherche}
        filtreRayon={filtreRayon}
        planifieManager={planifieManager}
        onChangePlanifie={onChangePlanifie}
        promoItm8Set={promoItm8Set}
        promoPrecedenteMap={promoPrecedenteMap}
      />
    </div>
  );
};

export default OngletGamme;
