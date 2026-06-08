/**
 * Onglet Gamme - Sélection des produits avec tableau flat
 */
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Check,
  X,
  ArrowUp,
  ArrowDown,
  Unlink,
  Link,
  Package,
} from 'lucide-react';
import { formatEuro } from '../../../utils/formatUtils';
import PopupCasse from './PopupCasse';
import PopupVentes from './PopupVentes';
import { normaliserLibelle, separerDoublon, fusionnerManuellement, dissocierRefV2, recalculerDepuisVentesQuotidiennes } from '../../../services/nettoyageGamme';
import { chargerCatalogueModeles, rechercherModele, rechercherModeleParEAN, isCatalogueCharge } from '../../../services/catalogueModelesService';
import { useMagasin } from '../../../contexts/MagasinContext';

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

// Labels abrégés pour les rayons
const LABELS_RAYON = {
  BOULANGERIE: 'Boul',
  VIENNOISERIE: 'Vien',
  PATISSERIE: 'Pât',
  SNACKING: 'Snack',
  AUTRE: 'Autre',
};

// Ordre des modèles pour comparaison numérique
const ORDRE_MODELE = { M1: 1, M2: 2, M3: 3, M4: 4, M5: 5, M6: 6, M7: 7, M8: 8, OPT: 9 };

/**
 * Feu tricolore pour le modèle :
 * - Vert : produit préconisé pour le modèle du magasin (modeleMin ≤ modeleMagasin)
 * - Rouge : produit hors modèle (modeleMin > modeleMagasin)
 * - Orange : non trouvé dans le catalogue ou modèle magasin inconnu
 */
const getFeuModele = (modeleMin, modeleMagasin) => {
  if (!modeleMin || !modeleMagasin) return 'orange';
  const ordreMin = ORDRE_MODELE[modeleMin];
  const ordreMag = ORDRE_MODELE[modeleMagasin];
  if (!ordreMin || !ordreMag) return 'orange';
  if (modeleMin === 'OPT') return 'orange'; // optionnel = ni dans ni hors modèle
  return ordreMin <= ordreMag ? 'vert' : 'rouge';
};

const COULEURS_FEU = {
  vert:   { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-400', dot: 'bg-green-500' },
  orange: { bg: 'bg-amber-50',  text: 'text-amber-600', border: 'border-amber-300', dot: 'bg-amber-400' },
  rouge:  { bg: 'bg-red-100',   text: 'text-red-700',   border: 'border-red-400',   dot: 'bg-red-500' },
};

// Couleur du taux de casse produit : < 5% vert, 5-20% orange, > 20% rouge
const getCouleurTauxCasse = (taux) => {
  if (taux < 5) return { text: 'text-green-600', bg: 'bg-green-100' };
  if (taux <= 20) return { text: 'text-amber-600', bg: 'bg-amber-100' };
  return { text: 'text-red-600', bg: 'bg-red-100' };
};

// Tags visuels pour les raisons de désactivation / enrichissement
const TAGS_CONFIG = {
  'promo':          { bg: 'bg-red-200',    text: 'text-red-800',    label: 'Promo' },
  'hors-saison':    { bg: 'bg-orange-200', text: 'text-orange-800', label: 'Hors saison' },
  'doublon-pre':    { bg: 'bg-slate-200',  text: 'text-slate-700',  label: '\u2192 version PAC' },
  'doublon-fusion': { bg: 'bg-slate-200',  text: 'text-slate-700',  label: 'Doublon fusionn\u00e9' },
  'article-a-creer':{ bg: 'bg-blue-200',   text: 'text-blue-800',   label: '\u00c0 cr\u00e9er' },
  'faible-ca':      { bg: 'bg-amber-100',  text: 'text-amber-700',  label: 'Faible CA' },
};

/* ModalFusionner supprimée — remplacée par sélection multi + bouton "Associer" */

const BadgeNettoyage = ({ raison, marque }) => {
  const tags = [];
  if (raison && TAGS_CONFIG[raison]) {
    const cfg = TAGS_CONFIG[raison];
    tags.push(
      <span key={raison} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${cfg.bg} ${cfg.text}`}>
        {cfg.label}
      </span>
    );
  }
  if (marque && marque.toUpperCase() === 'P&C') {
    tags.push(
      <span key="pc" className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-200 text-amber-800">
        P&C
      </span>
    );
  }
  return tags.length > 0 ? <span className="inline-flex gap-1 ml-1.5">{tags}</span> : null;
};

/**
 * Badge rayon avec couleur
 */
const BadgeRayon = ({ rayon, onClick }) => {
  const couleurs = COULEURS_RAYON[rayon] || COULEURS_RAYON.AUTRE;
  const label = LABELS_RAYON[rayon] || rayon;
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={`${rayon} — Cliquer pour changer`}
        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${couleurs.bg} ${couleurs.text} ${couleurs.border} border cursor-pointer hover:opacity-80 transition-opacity`}
      >
        {label}
      </button>
    );
  }
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${couleurs.bg} ${couleurs.text} ${couleurs.border} border`} title={rayon}>
      {label}
    </span>
  );
};

/**
 * Tableau des produits (flat, avec rayon en colonne)
 * Colonnes : Actif | Produit | Rayon | Casse % | Moy. Hebdo | Potentiel | CA Hebdo | Tendance | Fiabilité
 */
const TableauProduits = ({ produits, onToggle, onChangeRayon, recherche, filtreRayon, filtreStatut, planifieManager, onChangePlanifie, promoItm8Set, promoPrecedenteMap, onSeparer, onDissocier, selectionAssociation, onToggleSelection, modeleMagasin, onChangeLot }) => {
  const [tri, setTri] = useState({ colonne: 'caSemaine', ordre: 'desc' });
  const [popupCasseId, setPopupCasseId] = useState(null);
  const [popupVentesId, setPopupVentesId] = useState(null);
  const [editingPlanifieId, setEditingPlanifieId] = useState(null);
  const [editingPlanifieValue, setEditingPlanifieValue] = useState('');
  const [editingLotId, setEditingLotId] = useState(null);
  const [editingLotValue, setEditingLotValue] = useState('');

  // ────────────────────────────────────────────────────────────────────────
  // CORRECTION cause racine bug filtre — clé React unique par ligne, FIGÉE au
  // chargement de la gamme (avant tout filtre/tri).
  //
  // Stratégie : on attribue UNE FOIS un `_rowKey` à chaque produit du tableau
  // `produits` (la prop) en utilisant une signature stable (id+ean13+codeEAN+
  // codePLU+libellé) + un indice d'occurrence dans CE tableau d'origine.
  // L'objet enrichi `{...produit, _rowKey}` est ensuite propagé à `produitsFiltres`
  // puis `produitsTries` par référence — la clé suit le produit à travers
  // filtre/tri SANS dépendre de sa position d'affichage.
  //
  // Renouvellement : le useMemo se réexécute uniquement quand `produits` change
  // (= nouveau chargement de la gamme). Pas besoin de survivre entre imports,
  // la stabilité intra-session suffit pour la réconciliation React.
  // ────────────────────────────────────────────────────────────────────────
  const produitsAvecRowKey = useMemo(() => {
    const compteurParSignature = new Map();
    return produits.map((produit) => {
      const sig = [
        produit.id || produit.itm8 || 'noid',
        produit.ean13 || produit.codeEAN || 'noean',
        produit.codePLU || 'noplu',
        produit.libelle || 'nolib',
      ].join('|');
      const n = (compteurParSignature.get(sig) || 0) + 1;
      compteurParSignature.set(sig, n);
      return { ...produit, _rowKey: `${sig}#${n}` };
    });
  }, [produits]);

  // Filtrer les produits
  const produitsFiltres = useMemo(() => {
    return produitsAvecRowKey
      .filter((p) => !recherche || p.libelle.toLowerCase().includes(recherche.toLowerCase()))
      .filter((p) => !filtreRayon || filtreRayon === 'tous' || p.rayon === filtreRayon)
      .filter((p) => {
        if (!filtreStatut || filtreStatut === 'tous') return true;
        if (filtreStatut === 'actifs') return p.actif;
        if (filtreStatut === 'desactives') return !p.actif && !p.aCreer;
        if (filtreStatut === 'a-creer') return p.aCreer;
        return true;
      });
  }, [produitsAvecRowKey, recherche, filtreRayon, filtreStatut]);

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
        case 'modeleMin': {
          const ORDRE_MODELE = { M1: 1, M2: 2, M3: 3, M4: 4, M5: 5, M6: 6, M7: 7, M8: 8, OPT: 9 };
          const infoA = rechercherModele(a.itm8) || rechercherModeleParEAN(a.codeEAN);
          const infoB = rechercherModele(b.itm8) || rechercherModeleParEAN(b.codeEAN);
          valA = infoA?.modeleMin ? (ORDRE_MODELE[infoA.modeleMin] || 99) : 99;
          valB = infoB?.modeleMin ? (ORDRE_MODELE[infoB.modeleMin] || 99) : 99;
          break;
        }
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
        case 'prixMoyen': {
          const moyA = a.moyHebdo || a.ventesQteSemaine || 0;
          const moyB = b.moyHebdo || b.ventesQteSemaine || 0;
          valA = moyA > 0 ? (a.caSemaine || 0) / moyA : 0;
          valB = moyB > 0 ? (b.caSemaine || 0) / moyB : 0;
          break;
        }
        case 'unitLot':
          valA = a.unitesParVente || 1;
          valB = b.unitesParVente || 1;
          break;
        case 'unites': {
          const planA = planifieManager?.[a.id] ?? a.potentiel ?? 0;
          const planB = planifieManager?.[b.id] ?? b.potentiel ?? 0;
          valA = planA * (a.unitesParVente || 1);
          valB = planB * (b.unitesParVente || 1);
          break;
        }
        default:
          return 0;
      }
      if (typeof valA === 'number') {
        return tri.ordre === 'asc' ? valA - valB : valB - valA;
      }
      return 0;
    });
  }, [produitsFiltres, tri, planifieManager]);

  // En-tête triable — compact
  const SortableHeader = ({ colonne, label, align = 'left', width }) => {
    const isActive = tri.colonne === colonne;
    const alignClass = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : '';
    return (
      <th
        className="px-1.5 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
        style={width ? { width } : undefined}
        onClick={() => handleTri(colonne)}
      >
        <div className={`flex items-center gap-0.5 ${alignClass}`}>
          <span>{label}</span>
          <span className={`transition-opacity ${isActive ? 'opacity-100 text-[#8B1538]' : 'opacity-0'}`}>
            {isActive && tri.ordre === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
          </span>
        </div>
      </th>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full table-fixed">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-1 py-1.5 text-center text-[10px] font-semibold text-gray-500 uppercase" style={{ width: '40px' }}>Actif</th>
            <SortableHeader colonne="libelle" label="Produit" />
            <SortableHeader colonne="rayon" label="Rayon" align="center" width="52px" />
            <SortableHeader colonne="modeleMin" label="Modèle" align="center" width="52px" />
            <SortableHeader colonne="tauxCasse" label="Casse" align="center" width="50px" />
            <SortableHeader colonne="moyHebdo" label="Moy." align="right" width="48px" />
            <SortableHeader colonne="prixMoyen" label="P.U." align="right" width="52px" />
            <SortableHeader colonne="planifie" label="Planif." align="right" width="62px" />
            <SortableHeader colonne="caSemaine" label="CA" align="right" width="58px" />
            <SortableHeader colonne="unitLot" label="Lot" align="center" width="38px" />
            <SortableHeader colonne="unites" label="Unit." align="center" width="42px" />
            <SortableHeader colonne="tendancePourcent" label="Tend." align="center" width="52px" />
            <SortableHeader colonne="fiabilite" label="Fiab." align="center" width="60px" />
            <th className="px-1 py-1.5 text-center text-[10px] font-semibold text-violet-500 uppercase" style={{ width: '36px' }} title="Sélectionner pour associer">Ass.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {produitsTries.map((produit) => (
            <tr
              key={produit._rowKey}
              className={`hover:bg-gray-50 transition-colors ${!produit.actif ? 'opacity-50 bg-gray-50' : ''}`}
            >
              {/* Actif */}
              <td className="px-1 py-1 text-center">
                <button
                  onClick={() => onToggle(produit.id)}
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                    produit.actif ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {produit.actif ? <Check size={12} /> : <X size={12} />}
                </button>
              </td>
              {/* Produit */}
              <td className="px-1.5 py-1 relative">
                <div className="truncate">
                  <span className="font-medium text-xs text-gray-800">
                    {produit.libelle}
                    {promoItm8Set?.has(produit.itm8) && (
                      <span className="ml-1 text-blue-500" title="Produit en promo">🏷️</span>
                    )}
                    <BadgeNettoyage raison={produit.raisonDesactivation} marque={produit.marqueRefV2} />
                  </span>
                </div>
                {produit.libelleRefV2 && produit.libelleRefV2 !== produit.libelle && (
                  <div className="text-[9px] text-blue-500 italic inline-flex items-center gap-0.5 truncate">
                    Ref: {produit.libelleRefV2}
                    {onDissocier && (
                      <button
                        type="button"
                        onClick={() => onDissocier(produit)}
                        className="inline-flex items-center justify-center w-3 h-3 text-red-400 hover:text-red-600 rounded-full"
                        title="Dissocier"
                      >
                        <X size={7} />
                      </button>
                    )}
                  </div>
                )}
                {produit._eansFusionnes && produit._eansFusionnes.length > 1 && (() => {
                  const eansAutres = produit._eansFusionnes.filter(ean => ean !== produit.codeEAN);

                  // Si trop de fusions (> 3), afficher un résumé compact
                  if (eansAutres.length > 3) {
                    return (
                      <div className="text-[9px] text-violet-500 italic inline-flex items-center gap-1">
                        <span>+ {eansAutres.length} produits fusionnés</span>
                        {onSeparer && (
                          <button
                            type="button"
                            onClick={() => {
                              eansAutres.forEach(ean => {
                                const p2 = produits.find(pp => pp.codeEAN === ean && pp.id !== produit.id);
                                if (p2) onSeparer(p2);
                              });
                            }}
                            className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[8px] font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded hover:bg-violet-100"
                            title="Séparer tous les produits fusionnés"
                          >
                            <X size={7} /> Tout séparer
                          </button>
                        )}
                      </div>
                    );
                  }

                  // ≤ 3 fusions : afficher chaque produit avec sa croix
                  return eansAutres.map(ean => {
                    const p2 = produits.find(pp => pp.codeEAN === ean && pp.id !== produit.id);
                    const label = p2 ? p2.libelle : ean;
                    return (
                      <div key={ean} className="text-[9px] text-violet-500 italic inline-flex items-center gap-0.5 truncate">
                        + {label}
                        {onSeparer && (
                          <button
                            type="button"
                            onClick={() => { if (p2) onSeparer(p2); }}
                            className="inline-flex items-center justify-center w-3 h-3 text-red-400 hover:text-red-600 rounded-full"
                            title={`Retirer ${label} de la fusion`}
                          >
                            <X size={7} />
                          </button>
                        )}
                      </div>
                    );
                  });
                })()}
                {(produit.ean13 || produit.ean || produit.codeEAN) && (
                  <div className="text-[9px] text-gray-400">EAN: {produit.ean13 || produit.ean || produit.codeEAN}</div>
                )}
                {!produit.actif && (produit.raisonDesactivation === 'doublon-fusion' || produit.raisonDesactivation === 'doublon-pre') && onSeparer && (
                  <div className="mt-0.5">
                    <button
                      type="button"
                      onClick={() => onSeparer(produit)}
                      className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[9px] font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded hover:bg-violet-100 transition-colors"
                      title="Séparer du doublon"
                    >
                      <Unlink size={9} /> Séparer
                    </button>
                  </div>
                )}
              </td>
              {/* Rayon */}
              <td className="px-1 py-1 text-center">
                <BadgeRayon rayon={produit.rayon} onClick={() => onChangeRayon && onChangeRayon(produit.id)} />
              </td>
              {/* Modèle — feu tricolore */}
              <td className="px-1 py-1 text-center">
                {(() => {
                  const info = rechercherModele(produit.itm8) || rechercherModeleParEAN(produit.codeEAN);
                  if (!info || !info.modeleMin) {
                    // Pas dans le catalogue → orange (inconnu)
                    const c = COULEURS_FEU.orange;
                    return (
                      <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-bold border ${c.bg} ${c.text} ${c.border}`} title="Non trouvé dans le catalogue de commande">
                        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                        —
                      </span>
                    );
                  }
                  const m = info.modeleMin;
                  const feu = getFeuModele(m, modeleMagasin);
                  const c = COULEURS_FEU[feu];
                  const feuLabel = feu === 'vert' ? 'Dans le modèle' : feu === 'rouge' ? 'Hors modèle' : 'Optionnel';
                  const segments = Object.entries(info.modeles)
                    .filter(([k, v]) => v === 1 && k.startsWith('M'))
                    .map(([k]) => k)
                    .join(', ');
                  return (
                    <span
                      className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-bold border ${c.bg} ${c.text} ${c.border}`}
                      title={`${feuLabel} — préconisé à partir de ${m}${modeleMagasin ? ` (magasin: ${modeleMagasin})` : ''}${segments ? ` → ${segments}` : ''}${info.segment ? ` — ${info.segment}` : ''}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                      {m}
                    </span>
                  );
                })()}
              </td>
              {/* Casse */}
              <td className="px-1 py-1 text-center relative">
                <button
                  type="button"
                  onClick={() => setPopupCasseId(popupCasseId === produit.id ? null : produit.id)}
                  title="Voir la casse"
                  className={`px-1 py-0.5 rounded text-[11px] font-semibold cursor-pointer hover:ring-1 hover:ring-offset-1 transition-all ${getCouleurTauxCasse(produit.tauxCasse || 0).text} ${getCouleurTauxCasse(produit.tauxCasse || 0).bg}`}
                >
                  {(produit.tauxCasse || 0).toFixed(0)}%
                </button>
                {popupCasseId === produit.id && (
                  <PopupCasse produit={produit} onClose={() => setPopupCasseId(null)} />
                )}
              </td>
              {/* Moy. Hebdo */}
              <td className="px-1 py-1 text-right relative">
                <button
                  type="button"
                  onClick={() => setPopupVentesId(popupVentesId === produit.id ? null : produit.id)}
                  title="Voir l'historique"
                  className="px-1 py-0.5 rounded text-[11px] font-semibold cursor-pointer hover:ring-1 hover:ring-blue-300 transition-all text-blue-700 bg-blue-50"
                >
                  {produit.moyHebdo || produit.ventesQteSemaine || 0}
                </button>
                {popupVentesId === produit.id && (
                  <PopupVentes produit={produit} onClose={() => setPopupVentesId(null)} />
                )}
              </td>
              {/* Prix Moyen (P.U.) */}
              <td className="px-1 py-1 text-right">
                {(() => {
                  const moyQte = produit.moyHebdo || produit.ventesQteSemaine || 0;
                  const prixMoy = moyQte > 0 ? (produit.caSemaine || 0) / moyQte : 0;
                  if (prixMoy <= 0) return <span className="text-[10px] text-gray-300">—</span>;
                  return (
                    <span className="text-[11px] font-mono text-gray-600" title={`${formatEuro(produit.caSemaine || 0)} ÷ ${moyQte}`}>
                      {prixMoy.toFixed(2)}€
                    </span>
                  );
                })()}
              </td>
              {/* Planifié */}
              <td className="px-1 py-1 text-right">
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
                    className="w-14 px-1 py-0.5 text-right font-mono text-[11px] border border-[#8B1538] rounded focus:ring-1 focus:ring-[#8B1538] outline-none bg-red-50"
                  />
                ) : planifieManager?.[produit.id] != null ? (
                  <div className="inline-flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPlanifieId(produit.id);
                        setEditingPlanifieValue(String(planifieManager[produit.id]));
                      }}
                      className="font-mono text-[11px] font-bold text-[#8B1538] bg-red-50 border border-[#8B1538]/30 px-1.5 py-0.5 rounded hover:bg-red-100 transition-colors"
                      title="Modifier"
                    >
                      {planifieManager[produit.id]} ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangePlanifie(produit.id, null)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      title="Revenir au potentiel"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPlanifieId(produit.id);
                      setEditingPlanifieValue(String(produit.potentiel || ''));
                    }}
                    className="font-mono text-[11px] font-semibold text-gray-800 px-1.5 py-0.5 rounded hover:bg-gray-100 border border-transparent hover:border-gray-300 transition-colors"
                    title="Modifier la préconisation"
                  >
                    {produit.potentiel || '-'}
                  </button>
                )}
                {(() => {
                  const promPrec = promoPrecedenteMap?.get(produit.itm8) || promoPrecedenteMap?.get(produit.plu);
                  if (!promPrec) return null;
                  const moyNormale = produit.moyHebdo || produit.ventesQteSemaine || 0;
                  return (
                    <div className="text-[9px] text-amber-600 mt-0.5" title={`Promo S-1 (qté: ${promPrec.qteValidee})`}>
                      ⚠️ S-1: {moyNormale}
                    </div>
                  );
                })()}
              </td>
              {/* CA Hebdo */}
              <td className="px-1 py-1 text-right font-mono text-[11px] text-gray-700">
                {(() => {
                  const moyQte = produit.moyHebdo || 0;
                  const prixMoyen = moyQte > 0 ? (produit.caSemaine || 0) / moyQte : 0;
                  const qte = planifieManager?.[produit.id] ?? produit.potentiel ?? moyQte;
                  return formatEuro(qte * prixMoyen);
                })()}
              </td>
              {/* Lot — éditable au clic */}
              <td className="px-1 py-1 text-center">
                {editingLotId === produit.id ? (
                  <input
                    type="number"
                    min="1"
                    value={editingLotValue}
                    onChange={(e) => setEditingLotValue(e.target.value)}
                    onBlur={() => {
                      const val = parseInt(editingLotValue, 10);
                      if (!isNaN(val) && val >= 1) onChangeLot(produit.id, val);
                      setEditingLotId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = parseInt(editingLotValue, 10);
                        if (!isNaN(val) && val >= 1) onChangeLot(produit.id, val);
                        setEditingLotId(null);
                      }
                      if (e.key === 'Escape') setEditingLotId(null);
                    }}
                    autoFocus
                    className="w-10 px-0.5 py-0.5 text-center font-mono text-[11px] border border-teal-500 rounded focus:ring-1 focus:ring-teal-500 outline-none bg-teal-50"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLotId(produit.id);
                      setEditingLotValue(String(produit.unitesParVente || 1));
                    }}
                    className={`px-1 py-0.5 rounded text-[10px] font-bold cursor-pointer hover:ring-1 hover:ring-teal-400 transition-all ${
                      (produit.unitesParVente || 1) > 1
                        ? 'text-teal-700 bg-teal-50'
                        : 'text-gray-400 hover:bg-gray-100'
                    }`}
                    title={`${produit.unitesParVente || 1} unités/lot — cliquer pour modifier`}
                  >
                    {produit.unitesParVente || 1}
                  </button>
                )}
              </td>
              {/* Unités */}
              <td className="px-1 py-1 text-center">
                {(() => {
                  const unitLot = produit.unitesParVente || 1;
                  const planifie = planifieManager?.[produit.id] ?? produit.potentiel ?? 0;
                  if (planifie <= 0) return <span className="text-[10px] text-gray-300">—</span>;
                  const totalUnites = planifie * unitLot;
                  return (
                    <span
                      className={`text-[11px] font-bold ${unitLot > 1 ? 'text-teal-800' : 'text-gray-700'}`}
                      title={`${planifie} × ${unitLot} = ${totalUnites}`}
                    >
                      {totalUnites}
                    </span>
                  );
                })()}
              </td>
              {/* Tendance */}
              <td className="px-1 py-1 text-center">
                <span
                  className={`text-[11px] font-medium ${
                    (produit.tendancePourcent || 0) > 0
                      ? 'text-green-600'
                      : (produit.tendancePourcent || 0) < 0
                      ? 'text-red-600'
                      : 'text-gray-400'
                  }`}
                >
                  {(produit.tendancePourcent || 0) > 0 ? '+' : ''}
                  {produit.tendancePourcent || 0}%
                </span>
              </td>
              {/* Fiabilité */}
              <td className="px-1 py-1">
                <div className="flex items-center justify-center gap-0.5">
                  <div className="w-8 bg-gray-200 rounded-full h-1">
                    <div
                      className={`h-1 rounded-full ${
                        (produit.fiabilite || 0) >= 70 ? 'bg-green-500' : (produit.fiabilite || 0) >= 40 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${produit.fiabilite || 0}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-gray-400">{produit.fiabilite || 0}%</span>
                </div>
              </td>
              {/* Association */}
              <td className="px-1 py-1 text-center">
                {!produit.aCreer && (
                  <button
                    type="button"
                    onClick={() => onToggleSelection && onToggleSelection(produit.id)}
                    className={`w-5 h-5 rounded flex items-center justify-center transition-all border ${
                      selectionAssociation?.has(produit.id)
                        ? 'bg-violet-500 border-violet-600 text-white shadow-sm'
                        : 'bg-white border-gray-300 text-transparent hover:border-violet-400 hover:bg-violet-50'
                    }`}
                    title="Associer"
                  >
                    <Check size={10} />
                  </button>
                )}
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
const OngletGamme = ({ produits, onToggle, onToggleFiltres, onChangeRayon, planifieManager, onChangePlanifie, promoItm8Set, promoPrecedenteMap, onReloadGamme, onUpdateProduits, selectionAssociation, setSelectionAssociation }) => {
  const [recherche, setRecherche] = useState('');
  const [filtreRayon, setFiltreRayon] = useState('tous');
  const [filtreStatut, setFiltreStatut] = useState('tous');

  // Récupérer le modèle du magasin depuis le contexte
  const { donneesMagasin } = useMagasin();
  const modeleMagasin = donneesMagasin?.magasin?.modele || null;

  // Charger le catalogue des modèles au montage
  useEffect(() => {
    if (!isCatalogueCharge()) {
      chargerCatalogueModeles();
    }
  }, []);

  // Toggle sélection pour association
  const handleToggleSelection = useCallback((id) => {
    setSelectionAssociation(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Modifier le nombre d'unités par lot (unitesParVente) d'un produit
  const handleChangeLot = useCallback((id, newLot) => {
    if (!onUpdateProduits) return;
    const updatedProduits = produits.map(p => {
      if (p.id === id) {
        return { ...p, unitesParVente: newLot };
      }
      return p;
    });
    onUpdateProduits(updatedProduits);
  }, [produits, onUpdateProduits]);

  // Associer les produits sélectionnés (fusion manuelle avec recalcul jour par jour)
  const handleAssocier = useCallback(() => {
    if (selectionAssociation.size < 2) return;

    const selectedIds = Array.from(selectionAssociation);
    const selectedProduits = selectedIds.map(id => produits.find(p => p.id === id)).filter(Boolean);

    if (selectedProduits.length < 2) return;

    // Le gagnant = celui avec le plus gros CA
    const triParCA = [...selectedProduits].sort((a, b) => (b.caSemaine || 0) - (a.caSemaine || 0));
    const gagnant = triParCA[0];
    const sources = triParCA.slice(1);

    // Stocker les corrections en localStorage (pour persistance au reload)
    for (const source of sources) {
      const normSource = normaliserLibelle(source.libelle);
      const normCible = normaliserLibelle(gagnant.libelle);
      fusionnerManuellement(normSource, normCible);
    }

    // Appliquer immédiatement en mémoire (sans attendre reload)
    // Fusionner les ventesQuotidiennes de tous les sources dans le gagnant
    let ventesQuotidiennesFusionnees = [...(gagnant.ventesQuotidiennes || [])];
    for (const source of sources) {
      ventesQuotidiennesFusionnees = ventesQuotidiennesFusionnees.concat(
        source.ventesQuotidiennes || []
      );
    }

    // Recalculer le gagnant depuis les ventes fusionnées
    const gagnantRecalcule = recalculerDepuisVentesQuotidiennes({
      ...gagnant,
      ventesQuotidiennes: ventesQuotidiennesFusionnees,
      _ventesQuotidiennesOriginales: gagnant.ventesQuotidiennes || [],
      _eansFusionnes: selectedProduits.map(p => p.codeEAN),
    });

    // Mettre à jour la liste des produits
    const updatedProduits = produits.map(p => {
      if (p.id === gagnant.id) return gagnantRecalcule;
      if (selectedIds.includes(p.id) && p.id !== gagnant.id) {
        return {
          ...p,
          actif: false,
          raisonDesactivation: 'doublon-fusion',
          _ventesQuotidiennesOriginales: p.ventesQuotidiennes || [],
        };
      }
      return p;
    });

    // Vider la sélection
    setSelectionAssociation(new Set());

    // Notifier le parent
    if (onUpdateProduits) {
      onUpdateProduits(updatedProduits);
    } else if (onReloadGamme) {
      onReloadGamme();
    }
  }, [selectionAssociation, produits, onUpdateProduits, onReloadGamme]);

  // Callback pour séparer un doublon (le réactiver)
  const handleSeparer = useCallback((produit) => {
    const norm = normaliserLibelle(produit.libelle);
    separerDoublon(norm);
    if (onReloadGamme) onReloadGamme();
  }, [onReloadGamme]);

  // Callback pour dissocier un produit de sa ref V2
  const handleDissocier = useCallback((produit) => {
    const norm = normaliserLibelle(produit.libelle);
    dissocierRefV2(norm);
    if (onReloadGamme) onReloadGamme();
  }, [onReloadGamme]);

  // Rayons disponibles dans les produits
  const rayonsDisponibles = useMemo(() => {
    const rayons = [...new Set(produits.map((p) => p.rayon))];
    return rayons.sort((a, b) => (ORDRE_RAYONS[a] || 99) - (ORDRE_RAYONS[b] || 99));
  }, [produits]);

  // Compteurs pour le nettoyage
  const compteurs = useMemo(() => {
    const c = { actifs: 0, promos: 0, doublons: 0, horsSaison: 0, aCreer: 0, faibleCA: 0 };
    produits.forEach(p => {
      if (p.actif) c.actifs++;
      if (p.raisonDesactivation === 'promo') c.promos++;
      if (p.raisonDesactivation === 'doublon-fusion' || p.raisonDesactivation === 'doublon-pre') c.doublons++;
      if (p.raisonDesactivation === 'hors-saison') c.horsSaison++;
      if (p.raisonDesactivation === 'faible-ca') c.faibleCA++;
      if (p.aCreer) c.aCreer++;
    });
    return c;
  }, [produits]);

  // Produits filtrés (visibles) — pour les boutons Tout activer/désactiver
  const produitsFiltres = useMemo(() => {
    return produits
      .filter((p) => !recherche || p.libelle.toLowerCase().includes(recherche.toLowerCase()))
      .filter((p) => !filtreRayon || filtreRayon === 'tous' || p.rayon === filtreRayon)
      .filter((p) => {
        if (!filtreStatut || filtreStatut === 'tous') return true;
        if (filtreStatut === 'actifs') return p.actif;
        if (filtreStatut === 'desactives') return !p.actif && !p.aCreer;
        if (filtreStatut === 'a-creer') return p.aCreer;
        return true;
      });
  }, [produits, recherche, filtreRayon, filtreStatut]);

  const nbFiltres = produitsFiltres.length;

  return (
    <div className="space-y-4">
      {/*
        Le toggle « Gamme magasin / Nettoyage auto » a été supprimé : la fonction
        est désormais portée par le sélecteur de l'étape « Préparer la semaine »
        (cf. EtapeConfigPlanning, section « Choix de la gamme »). Un seul contrôle
        pour le choix d'archive ET pour le mode nettoyage auto.
      */}

      {/* Compteurs nettoyage + modèle magasin */}
      <div className="flex flex-wrap items-center gap-3 px-1 text-sm">
        {modeleMagasin && (
          <span className="font-bold text-[#8B1538] bg-red-50 px-3 py-1 rounded-lg border border-[#8B1538]/30">
            Magasin {modeleMagasin}
          </span>
        )}
        <span className="font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-lg border border-green-200">
          {compteurs.actifs} actifs
        </span>
        {compteurs.promos > 0 && (
          <span className="text-red-700 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200">
            {compteurs.promos} promos
          </span>
        )}
        {compteurs.doublons > 0 && (
          <span className="text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            {compteurs.doublons} doublons
          </span>
        )}
        {compteurs.horsSaison > 0 && (
          <span className="text-orange-700 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200">
            {compteurs.horsSaison} hors saison
          </span>
        )}
        {compteurs.faibleCA > 0 && (
          <span className="text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
            {compteurs.faibleCA} faible CA
          </span>
        )}
        {compteurs.aCreer > 0 && (
          <span className="text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
            {compteurs.aCreer} à créer
          </span>
        )}
      </div>

      {/* Barre d'outils */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
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

        {/* Filtre par statut */}
        <select
          value={filtreStatut}
          onChange={(e) => setFiltreStatut(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B1538] focus:border-[#8B1538] outline-none bg-white"
        >
          <option value="tous">Tous les statuts</option>
          <option value="actifs">Actifs uniquement</option>
          <option value="desactives">Désactivés uniquement</option>
          <option value="a-creer">Articles à créer</option>
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

        {/* Bouton Associer — visible quand 2+ produits sélectionnés */}
        {selectionAssociation.size >= 2 && (
          <button
            onClick={handleAssocier}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 text-sm font-semibold border border-violet-700 shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Link size={14} />
            Associer ({selectionAssociation.size} produits)
          </button>
        )}
        {selectionAssociation.size === 1 && (
          <span className="text-xs text-violet-500 italic self-center">
            Sélectionnez au moins 2 produits pour associer
          </span>
        )}
        {selectionAssociation.size > 0 && (
          <button
            onClick={() => setSelectionAssociation(new Set())}
            className="px-3 py-2 text-violet-600 hover:text-violet-800 text-sm underline"
          >
            Annuler sélection
          </button>
        )}
      </div>

      {/* Tableau flat avec rayon en colonne */}
      <TableauProduits
        produits={produits}
        onToggle={onToggle}
        onChangeRayon={onChangeRayon}
        recherche={recherche}
        filtreRayon={filtreRayon}
        filtreStatut={filtreStatut}
        planifieManager={planifieManager}
        onChangePlanifie={onChangePlanifie}
        promoItm8Set={promoItm8Set}
        promoPrecedenteMap={promoPrecedenteMap}
        onSeparer={handleSeparer}
        onDissocier={handleDissocier}
        selectionAssociation={selectionAssociation}
        onToggleSelection={handleToggleSelection}
        modeleMagasin={modeleMagasin}
        onChangeLot={handleChangeLot}
      />
    </div>
  );
};

export default OngletGamme;
