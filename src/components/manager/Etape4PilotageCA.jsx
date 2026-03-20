/**
 * Étape 4 : Pilotage CA
 *
 * Dashboard CA toujours visible avec calcul temps réel :
 * - Bloc Historique (CA + Casse)
 * - Bloc Prévision (CA + Progression)
 *
 * Onglets :
 * - Gamme : Sélection des produits avec toggle par famille
 * - Promo : Animations commerciales (à venir)
 * - Commande : Paramètres de commande (à venir)
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  TrendingUp,
  Package,
  Tag,
  ShoppingCart,
  Sliders,
  BarChart2,
  Target,
  Layers,
  Cake,
} from 'lucide-react';
import { useMagasin } from '../../contexts/MagasinContext';
import StepAnimationCommerciale from '../responsable/StepAnimationCommerciale';
import OngletCommande from './OngletCommande';
import OngletGamme from './pilotage/OngletGamme';
import OngletLimites from './pilotage/OngletMatrice';
import OngletSuivi from './pilotage/OngletStats';
import OngletAnalyseGamme from './pilotage/OngletAnalyseGamme';
import OngletPlaquage from './pilotage/OngletPlaquage';
import OngletPatisserie from './pilotage/OngletPatisserie';
import DashboardCA from './pilotage/DashboardCA';
import { appliquerCorrectionsManuelles, nettoyerGamme } from '../../services/nettoyageGamme';

// ============================================================================
// CONSTANTES
// ============================================================================

const FAMILLES = ['BOULANGERIE', 'VIENNOISERIE', 'PATISSERIE', 'SNACKING', 'AUTRE'];

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

const LIMITES_PROGRESSION_DEFAUT = {
  BOULANGERIE: {
    lundi: 'F', mardi: 'F', mercredi: 'F', jeudi: 'F',
    vendredi: 'f', samedi: 'f', dimanche: 'f'
  },
  VIENNOISERIE: {
    lundi: 'F', mardi: 'F', mercredi: 'F', jeudi: 'F',
    vendredi: 'F', samedi: 'f', dimanche: 'f'
  },
  PATISSERIE: {
    lundi: 'f', mardi: 'f', mercredi: 'f', jeudi: 'f',
    vendredi: 'f', samedi: 'f', dimanche: 'f'
  },
  SNACKING: {
    lundi: 'F', mardi: 'F', mercredi: 'F', jeudi: 'F',
    vendredi: 'F', samedi: 'f', dimanche: 'f'
  },
  AUTRE: {
    lundi: 'F', mardi: 'F', mercredi: 'F', jeudi: 'F',
    vendredi: 'F', samedi: 'f', dimanche: 'f'
  }
};

/**
 * Applique la limite de progression à une quantité calculée
 * S = Sans plafond, F = Forte (+20%), f = Prudent (+10%), P:xx = Personnalisée (+xx%)
 */
const appliquerLimite = (potentielCalcule, historique, limite) => {
  const plancher = historique;

  if (limite === 'S') {
    return Math.max(plancher, potentielCalcule);
  }

  if (limite === 'F') {
    const plafond = Math.ceil(historique * 1.20);
    return Math.max(plancher, Math.min(potentielCalcule, plafond));
  }

  if (limite === 'f') {
    const plafond = Math.ceil(historique * 1.10);
    return Math.max(plancher, Math.min(potentielCalcule, plafond));
  }

  // Mode Personnalisé : "P:15" → +15% max
  if (typeof limite === 'string' && limite.startsWith('P:')) {
    const pourcent = parseFloat(limite.substring(2));
    if (!isNaN(pourcent) && pourcent > 0) {
      const plafond = Math.ceil(historique * (1 + pourcent / 100));
      return Math.max(plancher, Math.min(potentielCalcule, plafond));
    }
  }

  return Math.max(plancher, potentielCalcule);
};

// Données de démo - Utilisé uniquement si aucun fichier ventes/casse n'est importé
// Colonnes : Moy. Hebdo = moyenne ventes hebdo, Potentiel = MAX ventes / poids jour
// prixMoyenUnitaire = CA Semaine / Moyenne Hebdo (prix moyen par unité)
const PRODUITS_DEMO = [
  { id: 1, plu: '1001', itm8: '10000001', codeEAN: '3000001', libelle: 'Baguette Tradition', rayon: 'BOULANGERIE', moyHebdo: 420, moyenneHebdo: 420, potentiel: 480, caSemaine: 315, prixMoyenUnitaire: 0.75, tauxCasse: 13, cassePAHTSemaine: 41, casseQteSemaine: 55, tendance: 'croissance', tendancePourcent: 8, fiabilite: 85, actif: true },
  { id: 2, plu: '1002', itm8: '10000002', codeEAN: '3000002', libelle: 'Pain de Campagne 500g', rayon: 'BOULANGERIE', moyHebdo: 180, moyenneHebdo: 180, potentiel: 210, caSemaine: 414, prixMoyenUnitaire: 2.30, tauxCasse: 8, cassePAHTSemaine: 33, casseQteSemaine: 14, tendance: 'stable', tendancePourcent: 2, fiabilite: 90, actif: true },
  { id: 3, plu: '1003', itm8: '10000003', codeEAN: '3000003', libelle: 'Pain Complet 400g', rayon: 'BOULANGERIE', moyHebdo: 95, moyenneHebdo: 95, potentiel: 110, caSemaine: 209, prixMoyenUnitaire: 2.20, tauxCasse: 4, cassePAHTSemaine: 8, casseQteSemaine: 4, tendance: 'declin', tendancePourcent: -5, fiabilite: 88, actif: true },
  { id: 4, plu: '2001', itm8: '20000001', codeEAN: '3000004', libelle: 'Croissant Pur Beurre', rayon: 'VIENNOISERIE', moyHebdo: 350, moyenneHebdo: 350, potentiel: 400, caSemaine: 385, prixMoyenUnitaire: 1.10, tauxCasse: 3, cassePAHTSemaine: 12, casseQteSemaine: 11, tendance: 'croissance', tendancePourcent: 12, fiabilite: 75, actif: true },
  { id: 5, plu: '2002', itm8: '20000002', codeEAN: '3000005', libelle: 'Pain au Chocolat', rayon: 'VIENNOISERIE', moyHebdo: 280, moyenneHebdo: 280, potentiel: 320, caSemaine: 336, prixMoyenUnitaire: 1.20, tauxCasse: 6, cassePAHTSemaine: 20, casseQteSemaine: 17, tendance: 'stable', tendancePourcent: 1, fiabilite: 82, actif: true },
  { id: 6, plu: '2003', itm8: '20000003', codeEAN: '3000006', libelle: 'Brioche Tressée', rayon: 'VIENNOISERIE', moyHebdo: 60, moyenneHebdo: 60, potentiel: 75, caSemaine: 270, prixMoyenUnitaire: 4.50, tauxCasse: 22, cassePAHTSemaine: 59, casseQteSemaine: 13, tendance: 'declin', tendancePourcent: -10, fiabilite: 55, actif: false },
  { id: 7, plu: '3001', itm8: '30000001', codeEAN: '3000007', libelle: 'Tarte aux Pommes', rayon: 'PATISSERIE', moyHebdo: 45, moyenneHebdo: 45, potentiel: 55, caSemaine: 585, prixMoyenUnitaire: 13.00, tauxCasse: 12, cassePAHTSemaine: 70, casseQteSemaine: 5, tendance: 'croissance', tendancePourcent: 5, fiabilite: 70, actif: true },
  { id: 8, plu: '3002', itm8: '30000002', codeEAN: '3000008', libelle: 'Paris-Brest', rayon: 'PATISSERIE', moyHebdo: 30, moyenneHebdo: 30, potentiel: 38, caSemaine: 390, prixMoyenUnitaire: 13.00, tauxCasse: 18, cassePAHTSemaine: 70, casseQteSemaine: 5, tendance: 'stable', tendancePourcent: 0, fiabilite: 60, actif: true },
  { id: 9, plu: '4001', itm8: '40000001', codeEAN: '3000009', libelle: 'Sandwich Jambon Beurre', rayon: 'SNACKING', moyHebdo: 120, moyenneHebdo: 120, potentiel: 140, caSemaine: 480, prixMoyenUnitaire: 4.00, tauxCasse: 2, cassePAHTSemaine: 10, casseQteSemaine: 3, tendance: 'croissance', tendancePourcent: 15, fiabilite: 65, actif: true },
  { id: 10, plu: '4002', itm8: '40000002', codeEAN: '3000010', libelle: 'Quiche Lorraine Part', rayon: 'SNACKING', moyHebdo: 85, moyenneHebdo: 85, potentiel: 100, caSemaine: 297.50, prixMoyenUnitaire: 3.50, tauxCasse: 7, cassePAHTSemaine: 21, casseQteSemaine: 6, tendance: 'declin', tendancePourcent: -3, fiabilite: 78, actif: true },
];

// ============================================================================
// COMPOSANTS LOCAUX
// ============================================================================

/**
 * Barre de sélection avec stats produits
 */
const BarreSelection = ({ stats }) => {
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-2xl font-bold text-gray-800">{stats.nbActifs}</span>
            <span className="text-gray-500 ml-1">produits actifs sur {stats.nbTotal}</span>
          </div>
          <div className="h-8 w-px bg-gray-300"></div>
          <div>
            <span className="text-gray-500">Poids CA : </span>
            <span className="text-lg font-semibold text-[#8B1538]">{stats.pourcentageSelection.toFixed(0)}%</span>
            <span className="text-gray-400 text-sm ml-1">du potentiel BVP</span>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="w-48">
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#ED1C24] to-[#8B1538] rounded-full transition-all duration-300"
              style={{ width: `${Math.min(stats.pourcentageSelection, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Onglets de navigation
 */
const Onglets = ({ actif, onChange }) => {
  const tabs = [
    { id: 'gamme', label: 'Gamme', icon: Package, color: 'bg-rose-100 border-rose-300 text-rose-800' },
    { id: 'limites', label: 'Limites', icon: Sliders, color: 'bg-violet-100 border-violet-300 text-violet-800' },
    { id: 'promo', label: 'Promo', icon: Tag, color: 'bg-blue-100 border-blue-300 text-blue-800' },
    { id: 'commande', label: 'Commande', icon: ShoppingCart, color: 'bg-emerald-100 border-emerald-300 text-emerald-800' },
    { id: 'suivi', label: 'Suivi', icon: BarChart2, color: 'bg-amber-100 border-amber-300 text-amber-800' },
    { id: 'plaquage', label: 'Plaquage', icon: Layers, color: 'bg-orange-100 border-orange-300 text-orange-800' },
    { id: 'patisserie', label: 'Pâtisserie', icon: Cake, color: 'bg-purple-100 border-purple-300 text-purple-800' },
    { id: 'analyse', label: 'Analyse', icon: Target, color: 'bg-indigo-100 border-indigo-300 text-indigo-800' },
  ];

  return (
    <div className="flex gap-2 mb-4">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = actif === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all border-2 ${
              isActive
                ? tab.color
                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            <Icon className="w-5 h-5" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

const Etape4PilotageCA = () => {
  const { semaineSelectionnee, produitsGamme, setProduitsGamme, objectifCA, objectifPourcent, planifieManager, setPlanifieManager, promosActives, setPromosActives, promosPrecedentes, archiveTrouvee, produitsVentesBrutes, semainePlanning } = useMagasin();

  // État local
  const [ongletActif, setOngletActif] = useState('gamme');
  const [limitesProgression, setLimitesProgression] = useState(LIMITES_PROGRESSION_DEFAUT);
  const [produitsExceptionnels, setProduitsExceptionnels] = useState([]);
  const [modeNettoyage, setModeNettoyage] = useState(false); // false = gamme magasin (défaut)

  // Calculer les produits nettoyés à la demande (depuis les ventes brutes)
  const produitsNettoyesCalcules = useMemo(() => {
    if (!modeNettoyage || !produitsVentesBrutes || produitsVentesBrutes.length === 0) return null;
    const sem = semaineSelectionnee || semainePlanning;
    const moisP = sem ? new Date(sem.annee, 0, 1 + (sem.semaine - 1) * 7).getMonth() + 1 : null;
    const { produits: nettoyes } = nettoyerGamme(produitsVentesBrutes, sem?.semaine, moisP);
    return nettoyes;
  }, [modeNettoyage, produitsVentesBrutes, semaineSelectionnee, semainePlanning]);
  const [periodePromo, setPeriodePromo] = useState(null);
  const [produits, setProduits] = useState(() => {
    if (produitsGamme && produitsGamme.length > 0) {
      return produitsGamme;
    }
    return PRODUITS_DEMO;
  });

  // Sync bidirectionnelle contexte ↔ local avec flag anti-boucle
  const syncDirection = useRef(null); // 'fromContext' | 'fromLocal'

  // Contexte → local (quand produitsGamme change depuis l'extérieur, ex: import ventes, archive)
  useEffect(() => {
    if (syncDirection.current === 'fromLocal') {
      syncDirection.current = null;
      return;
    }
    if (produitsGamme && produitsGamme.length > 0) {
      syncDirection.current = 'fromContext';
      setProduits(produitsGamme);
    }
  }, [produitsGamme]);

  // Local → contexte (quand produits change localement, ex: toggle actif, changement rayon)
  useEffect(() => {
    if (syncDirection.current === 'fromContext') {
      syncDirection.current = null;
      return;
    }
    if (produits && produits.length > 0) {
      syncDirection.current = 'fromLocal';
      setProduitsGamme(produits);
    }
  }, [produits, setProduitsGamme]);

  // Mapping itm8 → id produit (pour bridge promo ↔ gamme)
  const itm8ToIdMap = useMemo(() => {
    const map = {};
    produits.forEach(p => {
      if (p.itm8) map[p.itm8] = p.id;
    });
    return map;
  }, [produits]);

  // Callback pour re-appliquer les corrections manuelles (après Séparer/Fusionner)
  const handleReloadGamme = useCallback(() => {
    setProduits(prev => appliquerCorrectionsManuelles([...prev]));
  }, []);

  // Set des itm8 en promo (pour icône dans Gamme)
  const promoItm8Set = useMemo(() => {
    return new Set(promosActives.map(p => p.itm8).filter(Boolean));
  }, [promosActives]);

  // Map des promos S-1 précédentes (itm8 → { qteValidee, libelle })
  const promoPrecedenteMap = useMemo(() => {
    const map = new Map();
    (promosPrecedentes || []).forEach(p => {
      if (p.itm8) map.set(p.itm8, p);
      if (p.plu) map.set(p.plu, p);
    });
    return map;
  }, [promosPrecedentes]);

  // Sync Promo → Planifié : quand promosActives change, mettre à jour planifieManager
  useEffect(() => {
    if (promosActives.length === 0) return;
    setPlanifieManager(prev => {
      const next = { ...prev };
      let changed = false;
      promosActives.forEach(promo => {
        const id = itm8ToIdMap[promo.itm8];
        if (id != null && promo.qteValidee != null && promo.qteValidee > 0) {
          if (next[id] !== promo.qteValidee) {
            next[id] = promo.qteValidee;
            changed = true;
          }
        }
      });
      return changed ? next : prev;
    });
  }, [promosActives, itm8ToIdMap]);

  // Calcul des stats en temps réel
  const stats = useMemo(() => {
    const produitsActifs = produits.filter((p) => p.actif);

    // CA Historique = CA des produits actifs
    const caHisto = produitsActifs.reduce((sum, p) => sum + (p.caSemaine || 0), 0);

    // Casse en PA HT (prix d'achat)
    const casseMontant = produitsActifs.reduce((sum, p) => sum + (p.cassePAHTSemaine || 0), 0);

    // Taux de casse global = PA HT Casse / PV TTC Ventes * 100
    const tauxCasse = caHisto > 0 ? (casseMontant / caHisto) * 100 : 0;

    // Arrondir une quantité au lot supérieur si unitesParLot > 1
    // Ex: 30 unités, lot=12 → ceil(30/12)×12 = 36 unités
    const arrondirEnLots = (qte, upl) => {
      if (!upl || upl <= 1 || qte <= 0) return qte;
      return Math.ceil(qte / upl) * upl;
    };

    // CA Prévision = pour chaque produit actif : quantité planifiée × prix moyen unitaire
    // Si le Manager a saisi une valeur planifiée, on l'utilise directement
    // Sinon on utilise le potentiel limité par la matrice (par famille × jour)
    // Si unitesParLot > 1, les quantités sont arrondies au lot supérieur
    const caPrevi = produitsActifs.reduce((sum, p) => {
      const moyQte = p.moyHebdo || 0;
      const caHebdo = p.caSemaine || 0;
      const prixMoyen = moyQte > 0 ? caHebdo / moyQte : 0;
      const upl = p.unitesParLot || p.unitesParVente || 0;

      // Vérifier si le Manager a saisi une valeur planifiée
      const planifie = planifieManager[p.id];
      if (planifie != null && planifie > 0) {
        const qteArrondie = arrondirEnLots(planifie, upl);
        return sum + (qteArrondie * prixMoyen);
      }

      // Sinon : potentiel limité par la matrice
      const potentielBrut = p.potentiel || moyQte;
      const famille = p.rayon || 'AUTRE';
      const limitesJours = limitesProgression[famille] || {};
      let totalLimite = 0;
      JOURS.forEach(jour => {
        const limite = limitesJours[jour] || 'F';
        const potJour = potentielBrut / 7;
        const histJour = moyQte / 7;
        totalLimite += appliquerLimite(potJour, histJour, limite);
      });
      const potentielLimite = Math.round(totalLimite);
      const qteArrondie = arrondirEnLots(potentielLimite, upl);

      return sum + (qteArrondie * prixMoyen);
    }, 0);

    // Progression = (CA Prévisionnel - CA Objectif) / CA Objectif × 100
    const caObjectif = objectifCA || caHisto;
    const progression = caObjectif > 0 ? ((caPrevi - caObjectif) / caObjectif) * 100 : 0;

    // CA total du rayon (tous produits)
    const caTotalRayon = produits.reduce((sum, p) => sum + (p.caSemaine || 0), 0);
    const pourcentageSelection = caTotalRayon > 0 ? (caHisto / caTotalRayon) * 100 : 0;

    // Nombre de semaines de la période (prendre le max des produits)
    const nbSemaines = produitsActifs.reduce((max, p) => Math.max(max, p.nombreSemaines || 1), 1);

    return {
      nbActifs: produitsActifs.length,
      nbTotal: produits.length,
      caHisto,
      nbSemaines,
      caPrevi,
      caObjectif,
      progression,
      pourcentageSelection,
      tauxCasse,
      casseMontant,
    };
  }, [produits, objectifCA, limitesProgression, planifieManager]);

  // Handlers
  const handleToggleProduit = useCallback((id) => {
    setProduits((prev) => prev.map((p) => (p.id === id ? { ...p, actif: !p.actif } : p)));
  }, []);

  // Toggle uniquement les produits filtrés (comme V4)
  const handleToggleFiltres = useCallback((ids, actif) => {
    const idsSet = new Set(ids);
    setProduits((prev) => prev.map((p) => idsSet.has(p.id) ? { ...p, actif } : p));
  }, []);

  // Modifier la valeur planifiée d'un produit (+ sync vers Promo si applicable)
  const handleChangePlanifie = useCallback((id, valeur) => {
    setPlanifieManager(prev => {
      const next = { ...prev };
      if (valeur === null || valeur === '' || valeur === undefined) {
        delete next[id];
      } else {
        next[id] = valeur;
      }
      return next;
    });

    // Sync Gamme → Promo : si ce produit est en promo, mettre à jour qteValidee
    const produit = produits.find(p => p.id === id);
    if (produit?.itm8 && promoItm8Set.has(produit.itm8)) {
      setPromosActives(prev => prev.map(promo =>
        promo.itm8 === produit.itm8
          ? { ...promo, qteValidee: valeur != null ? valeur : promo.qteObjectif }
          : promo
      ));
    }
  }, [produits, promoItm8Set, setPromosActives]);

  // Changer la famille d'un produit (cycle BOULANGERIE → VIENNOISERIE → PATISSERIE → SNACKING → AUTRE → BOULANGERIE)
  const handleChangeRayon = useCallback((id) => {
    setProduits((prev) => prev.map((p) => {
      if (p.id !== id) return p;
      const idx = FAMILLES.indexOf(p.rayon);
      const nextRayon = FAMILLES[(idx + 1) % FAMILLES.length];
      return { ...p, rayon: nextRayon };
    }));
  }, []);

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-[#8B1538]" />
            Pilotage CA
          </h2>
          <p className="text-gray-600 mt-1">
            Gérez le chiffre d'affaires et la gamme produits
            {semaineSelectionnee && (
              <span className="text-[#8B1538] font-medium"> S{semaineSelectionnee.semaine}/{semaineSelectionnee.annee}</span>
            )}
          </p>
        </div>
      </div>

      {/* Dashboard toujours visible */}
      <DashboardCA stats={stats} objectifPourcent={objectifPourcent} />

      {/* Barre de sélection */}
      <BarreSelection stats={stats} />

      {/* Onglets */}
      <Onglets actif={ongletActif} onChange={setOngletActif} />

      {/* Contenu selon l'onglet */}
      <div className="min-h-[400px]">
        {ongletActif === 'gamme' && (
          <OngletGamme
            produits={modeNettoyage && produitsNettoyesCalcules ? produitsNettoyesCalcules : produits}
            onToggle={handleToggleProduit}
            onToggleFiltres={handleToggleFiltres}
            onChangeRayon={handleChangeRayon}
            planifieManager={planifieManager}
            onChangePlanifie={handleChangePlanifie}
            promoItm8Set={promoItm8Set}
            promoPrecedenteMap={promoPrecedenteMap}
            onReloadGamme={handleReloadGamme}
            onUpdateProduits={setProduits}
            archiveTrouvee={archiveTrouvee}
            modeNettoyage={modeNettoyage}
            setModeNettoyage={setModeNettoyage}
          />
        )}
        {ongletActif === 'limites' && (
          <OngletLimites
            limites={limitesProgression}
            onLimitesChange={setLimitesProgression}
          />
        )}
        {ongletActif === 'promo' && (
          <StepAnimationCommerciale
            produits={produits}
            promosActives={promosActives}
            setPromosActives={setPromosActives}
            produitsExceptionnels={produitsExceptionnels}
            setProduitsExceptionnels={setProduitsExceptionnels}
            periodePromo={periodePromo}
            setPeriodePromo={setPeriodePromo}
            caTotalRayon={stats.caHisto}
          />
        )}
        {ongletActif === 'commande' && <OngletCommande />}
        {ongletActif === 'suivi' && (
          <OngletSuivi
            produits={produits}
            planifieManager={planifieManager}
            promosPrecedentes={promosPrecedentes}
          />
        )}
        {ongletActif === 'plaquage' && (
          <OngletPlaquage produits={produits} />
        )}
        {ongletActif === 'patisserie' && (
          <OngletPatisserie produits={produits} />
        )}
        {ongletActif === 'analyse' && (
          <OngletAnalyseGamme produits={produits} />
        )}
      </div>

    </div>
  );
};

export default Etape4PilotageCA;
