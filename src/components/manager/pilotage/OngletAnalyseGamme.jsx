/**
 * Onglet Analyse Gamme — Comparaison Gamme Magasin vs Modèle BVP
 *
 * Compare les produits actuellement détenus (gamme active) avec la gamme
 * préconisée par le catalogue-modeles.json pour le modèle du magasin.
 *
 * Affichage :
 *  1. Dashboard synthèse par famille (compteurs + barres de progression)
 *  2. Tableau détaillé filtrable (manquants / surplus / conformes)
 */
import { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  MinusCircle,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Package,
  Target,
} from 'lucide-react';
import { useMagasin } from '../../../contexts/MagasinContext';
import {
  chargerCatalogueModeles,
  isCatalogueCharge,
  rechercherModele,
} from '../../../services/catalogueModelesService';

// ============================================================================
// MAPPING SEGMENT → FAMILLE
// ============================================================================

const SEGMENT_TO_FAMILLE = {
  // Boulangerie
  'ENTREE DE GAMME': 'BOULANGERIE',
  'LES CLASSIQUES': 'BOULANGERIE',
  'LES PREMIUMS': 'BOULANGERIE',
  'LES PAINS PLAISIR': 'BOULANGERIE',
  'LES PAINS SANTE': 'BOULANGERIE',
  'LE BIO': 'BOULANGERIE',
  // Viennoiserie
  'CROISSANT': 'VIENNOISERIE',
  'PAIN AU CHOCOLAT': 'VIENNOISERIE',
  'AUTRES CLASSIQUES': 'VIENNOISERIE',
  'MINI VIENNOISERIES': 'VIENNOISERIE',
  'VIENNOISERIES PLAISIRS': 'VIENNOISERIE',
  'BEIGNETS': 'VIENNOISERIE',
  'GAMME AMERICAINE': 'VIENNOISERIE',
  'BRIOCHES': 'VIENNOISERIE',
  // Pâtisserie
  'PATISSERIE GEL': 'PATISSERIE',
  'PATISSERIE FRAICHE': 'PATISSERIE',
  'PATISSERIE GEL SOUS-AT': 'PATISSERIE',
  'PATISSERIE ASSEMBLAGE': 'PATISSERIE',
  'BISCUITERIE': 'PATISSERIE',
  // Snacking
  'SNACKING SALE': 'SNACKING',
  // Autre
  'CONSOMMABLE': 'AUTRE',
};

const FAMILLES_ORDRE = ['BOULANGERIE', 'VIENNOISERIE', 'PATISSERIE', 'SNACKING'];

const COULEURS_FAMILLES = {
  BOULANGERIE: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', bar: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700' },
  VIENNOISERIE: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', bar: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700' },
  PATISSERIE: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', bar: 'bg-purple-500', badge: 'bg-purple-100 text-purple-700' },
  SNACKING: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', bar: 'bg-green-500', badge: 'bg-green-100 text-green-700' },
};

const ORDRE_MODELE = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8'];

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function OngletAnalyseGamme({ produits }) {
  const { donneesMagasin } = useMagasin();
  const modeleMagasin = donneesMagasin?.magasin?.modele || 'M6';

  const [catalogueCharge, setCatalogueCharge] = useState(isCatalogueCharge());
  const [filtreStatut, setFiltreStatut] = useState('tous'); // 'tous' | 'manquant' | 'surplus' | 'conforme'
  const [filtreFamille, setFiltreFamille] = useState('tous');
  const [recherche, setRecherche] = useState('');
  const [famillesOuvertes, setFamillesOuvertes] = useState({});

  // Charger le catalogue si pas encore fait
  useEffect(() => {
    if (!isCatalogueCharge()) {
      chargerCatalogueModeles().then(() => setCatalogueCharge(true));
    }
  }, []);

  // ════════════════════════════════════════════════
  // ANALYSE : croiser gamme magasin vs catalogue
  // ════════════════════════════════════════════════

  const analyse = useMemo(() => {
    if (!catalogueCharge) return null;

    // 1. Charger tous les produits du catalogue préconisés pour ce modèle
    //    On doit accéder au cache interne — on utilise fetch synchrone via les maps
    //    Solution : relire le catalogue via un state

    return null; // sera rempli après le fetch
  }, [catalogueCharge]);

  // Analyse complète via fetch du catalogue JSON
  const [analyseComplete, setAnalyseComplete] = useState(null);

  useEffect(() => {
    if (!catalogueCharge) return;

    const analyser = async () => {
      try {
        const response = await fetch(`/Data/catalogue-modeles.json?t=${Date.now()}`);
        const catalogueData = await response.json();

        // Produits préconisés pour le modèle du magasin
        const preconises = catalogueData.filter(p => p.modeles?.[modeleMagasin] === 1);

        // Produits actifs du magasin (avec ITM8)
        const produitsActifs = (produits || []).filter(p => p.actif !== false);

        // Set des ITM8 détenus
        const itm8Detenus = new Set();
        produitsActifs.forEach(p => {
          if (p.itm8) itm8Detenus.add(String(p.itm8).replace(/^0+/, ''));
        });

        // Set des ITM8 préconisés
        const itm8Preconises = new Set();
        preconises.forEach(p => {
          itm8Preconises.add(String(p.itm8).replace(/^0+/, ''));
        });

        // Classement par statut
        const manquants = []; // dans le catalogue mais pas dans le magasin
        const conformes = []; // dans le catalogue ET dans le magasin
        const surplus = [];   // dans le magasin mais pas dans le catalogue

        preconises.forEach(p => {
          const itm8 = String(p.itm8).replace(/^0+/, '');
          const famille = SEGMENT_TO_FAMILLE[p.segment] || 'AUTRE';
          const entry = { ...p, itm8Clean: itm8, famille };

          if (itm8Detenus.has(itm8)) {
            // Trouver le produit du magasin correspondant pour enrichir
            const prodMag = produitsActifs.find(pm => String(pm.itm8).replace(/^0+/, '') === itm8);
            conformes.push({ ...entry, produitMagasin: prodMag });
          } else {
            manquants.push(entry);
          }
        });

        produitsActifs.forEach(p => {
          const itm8 = String(p.itm8 || '').replace(/^0+/, '');
          if (itm8 && !itm8Preconises.has(itm8)) {
            surplus.push({
              itm8Clean: itm8,
              itm8: p.itm8,
              libelle: p.libelle,
              famille: p.rayon || p.famille || 'AUTRE',
              segment: '',
              modeleMin: '',
              produitMagasin: p,
            });
          }
        });

        // Stats par famille
        const statsFamilles = {};
        FAMILLES_ORDRE.forEach(f => {
          const precoFam = preconises.filter(p => (SEGMENT_TO_FAMILLE[p.segment] || 'AUTRE') === f).length;
          const confFam = conformes.filter(p => p.famille === f).length;
          const manqFam = manquants.filter(p => p.famille === f).length;
          const surpFam = surplus.filter(p => p.famille === f).length;
          statsFamilles[f] = {
            preconise: precoFam,
            conforme: confFam,
            manquant: manqFam,
            surplus: surpFam,
            taux: precoFam > 0 ? Math.round((confFam / precoFam) * 100) : 0,
          };
        });

        // Stats globales
        const statsGlobales = {
          totalPreconise: preconises.length,
          totalConforme: conformes.length,
          totalManquant: manquants.length,
          totalSurplus: surplus.length,
          tauxGlobal: preconises.length > 0 ? Math.round((conformes.length / preconises.length) * 100) : 0,
        };

        setAnalyseComplete({
          manquants,
          conformes,
          surplus,
          statsFamilles,
          statsGlobales,
        });
      } catch (err) {
        console.error('[AnalyseGamme] Erreur:', err);
      }
    };

    analyser();
  }, [catalogueCharge, produits, modeleMagasin]);

  // ════════════════════════════════════════════════
  // FILTRAGE du tableau
  // ════════════════════════════════════════════════

  const listeFiltree = useMemo(() => {
    if (!analyseComplete) return [];

    let items = [];
    if (filtreStatut === 'tous' || filtreStatut === 'manquant') {
      items.push(...analyseComplete.manquants.map(p => ({ ...p, statut: 'manquant' })));
    }
    if (filtreStatut === 'tous' || filtreStatut === 'conforme') {
      items.push(...analyseComplete.conformes.map(p => ({ ...p, statut: 'conforme' })));
    }
    if (filtreStatut === 'tous' || filtreStatut === 'surplus') {
      items.push(...analyseComplete.surplus.map(p => ({ ...p, statut: 'surplus' })));
    }

    // Filtre par famille
    if (filtreFamille !== 'tous') {
      items = items.filter(p => p.famille === filtreFamille);
    }

    // Filtre par recherche
    if (recherche.trim()) {
      const q = recherche.toLowerCase().trim();
      items = items.filter(p =>
        (p.libelle || '').toLowerCase().includes(q) ||
        (p.itm8Clean || '').includes(q) ||
        (p.segment || '').toLowerCase().includes(q)
      );
    }

    // Tri : manquants d'abord, puis conformes, puis surplus
    const ordreStatut = { manquant: 0, conforme: 1, surplus: 2 };
    items.sort((a, b) => {
      if (a.famille !== b.famille) return FAMILLES_ORDRE.indexOf(a.famille) - FAMILLES_ORDRE.indexOf(b.famille);
      if (a.statut !== b.statut) return ordreStatut[a.statut] - ordreStatut[b.statut];
      return (a.libelle || '').localeCompare(b.libelle || '');
    });

    return items;
  }, [analyseComplete, filtreStatut, filtreFamille, recherche]);

  // ════════════════════════════════════════════════
  // TOGGLE sections
  // ════════════════════════════════════════════════

  const toggleFamille = (f) => {
    setFamillesOuvertes(prev => ({ ...prev, [f]: !prev[f] }));
  };

  // ════════════════════════════════════════════════
  // RENDU
  // ════════════════════════════════════════════════

  if (!catalogueCharge || !analyseComplete) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-indigo-600 rounded-full mr-3"></div>
        Chargement du catalogue modèles...
      </div>
    );
  }

  const { statsGlobales, statsFamilles } = analyseComplete;

  return (
    <div className="space-y-6">
      {/* ── En-tête ── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
            Analyse Gamme vs Modèle {modeleMagasin}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Comparaison de la gamme active ({statsGlobales.totalConforme + statsGlobales.totalSurplus} réf. détenues)
            avec la gamme préconisée ({statsGlobales.totalPreconise} réf. modèle {modeleMagasin})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-3xl font-bold ${
            statsGlobales.tauxGlobal >= 80 ? 'text-green-600' :
            statsGlobales.tauxGlobal >= 60 ? 'text-amber-600' : 'text-red-600'
          }`}>
            {statsGlobales.tauxGlobal}%
          </span>
          <span className="text-sm text-gray-500">de conformité</span>
        </div>
      </div>

      {/* ── Dashboard par famille ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {FAMILLES_ORDRE.map(famille => {
          const stats = statsFamilles[famille];
          if (!stats || stats.preconise === 0 && stats.surplus === 0) return null;
          const couleurs = COULEURS_FAMILLES[famille] || COULEURS_FAMILLES.BOULANGERIE;

          return (
            <div
              key={famille}
              className={`${couleurs.bg} ${couleurs.border} border rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow`}
              onClick={() => {
                setFiltreFamille(filtreFamille === famille ? 'tous' : famille);
                setFiltreStatut('tous');
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className={`font-bold text-sm ${couleurs.text}`}>{famille}</h4>
                <span className={`text-2xl font-bold ${
                  stats.taux >= 80 ? 'text-green-600' :
                  stats.taux >= 60 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {stats.taux}%
                </span>
              </div>

              {/* Barre de progression */}
              <div className="w-full bg-white/60 rounded-full h-2.5 mb-3">
                <div
                  className={`${couleurs.bar} h-2.5 rounded-full transition-all duration-500`}
                  style={{ width: `${Math.min(stats.taux, 100)}%` }}
                ></div>
              </div>

              {/* Compteurs */}
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div className="flex items-center gap-1">
                  <Target className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-600">{stats.preconise} préco.</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  <span className="text-green-700 font-medium">{stats.conforme} détenues</span>
                </div>
                <div className="flex items-center gap-1">
                  <MinusCircle className="w-3 h-3 text-red-500" />
                  <span className="text-red-700 font-medium">{stats.manquant} manquantes</span>
                </div>
                <div className="flex items-center gap-1">
                  <PlusCircle className="w-3 h-3 text-amber-500" />
                  <span className="text-amber-700 font-medium">{stats.surplus} en +</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Compteurs globaux ── */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => setFiltreStatut('tous')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
            filtreStatut === 'tous'
              ? 'bg-indigo-100 border-indigo-300 text-indigo-800'
              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          Tous ({statsGlobales.totalConforme + statsGlobales.totalManquant + statsGlobales.totalSurplus})
        </button>
        <button
          onClick={() => setFiltreStatut('manquant')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
            filtreStatut === 'manquant'
              ? 'bg-red-100 border-red-300 text-red-800'
              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          <span className="flex items-center gap-1">
            <MinusCircle className="w-4 h-4" />
            Manquantes ({statsGlobales.totalManquant})
          </span>
        </button>
        <button
          onClick={() => setFiltreStatut('conforme')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
            filtreStatut === 'conforme'
              ? 'bg-green-100 border-green-300 text-green-800'
              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" />
            Conformes ({statsGlobales.totalConforme})
          </span>
        </button>
        <button
          onClick={() => setFiltreStatut('surplus')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
            filtreStatut === 'surplus'
              ? 'bg-amber-100 border-amber-300 text-amber-800'
              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          <span className="flex items-center gap-1">
            <PlusCircle className="w-4 h-4" />
            En surplus ({statsGlobales.totalSurplus})
          </span>
        </button>

        {/* Filtre famille */}
        <select
          value={filtreFamille}
          onChange={(e) => setFiltreFamille(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm border border-gray-200 text-gray-600 ml-auto"
        >
          <option value="tous">Toutes les familles</option>
          {FAMILLES_ORDRE.map(f => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      {/* ── Recherche ── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher un produit (libellé, ITM8, segment)..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* ── Tableau détaillé ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold text-gray-600 w-16">Statut</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 w-24">Famille</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 w-24">Segment</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 w-24">ITM8</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Libellé</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600 w-24">Modèle min</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600 w-24">CA / sem.</th>
            </tr>
          </thead>
          <tbody>
            {listeFiltree.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-gray-400">
                  Aucun produit correspondant aux filtres
                </td>
              </tr>
            ) : (
              listeFiltree.slice(0, 200).map((item, idx) => {
                const statutConfig = {
                  manquant: { icon: MinusCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'Manquant' },
                  conforme: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50', label: 'Conforme' },
                  surplus: { icon: PlusCircle, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Surplus' },
                }[item.statut];
                const Icon = statutConfig.icon;
                const couleurFam = COULEURS_FAMILLES[item.famille];

                return (
                  <tr
                    key={`${item.itm8Clean}-${item.statut}-${idx}`}
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${statutConfig.bg}`}
                  >
                    <td className="px-4 py-2.5">
                      <span className={`flex items-center gap-1 ${statutConfig.color}`} title={statutConfig.label}>
                        <Icon className="w-4 h-4" />
                        <span className="text-xs font-medium hidden lg:inline">{statutConfig.label}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {couleurFam && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${couleurFam.badge}`}>
                          {item.famille.slice(0, 5)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{item.segment || '—'}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{item.itm8Clean}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-800">{item.libelle}</td>
                    <td className="px-4 py-2.5 text-center">
                      {item.modeleMin ? (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                          ORDRE_MODELE.indexOf(item.modeleMin) <= ORDRE_MODELE.indexOf(modeleMagasin)
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {item.modeleMin}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-600">
                      {item.produitMagasin?.caSemaine
                        ? `${Math.round(item.produitMagasin.caSemaine)} €`
                        : '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {listeFiltree.length > 200 && (
          <div className="text-center py-3 text-xs text-gray-400 border-t border-gray-100">
            Affichage limité aux 200 premiers résultats ({listeFiltree.length} au total)
          </div>
        )}
      </div>
    </div>
  );
}
