import { useState, useMemo, useRef, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Search, ToggleLeft, ToggleRight, ArrowUp, ArrowDown, Settings, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { getListeProgrammesComplets } from '../../services/referentielITM8';

// Configuration par défaut de la répartition par famille
const REPARTITION_DEFAUT = {
  BOULANGERIE: 'tranches',
  VIENNOISERIE: 'tranches',
  PATISSERIE: 'journalier',
  SNACKING: 'tranches',
  NEGOCE: 'journalier',
  AUTRE: 'journalier'
};

// Configuration par défaut des limites de progression par famille × jour
const LIMITES_PROGRESSION_DEFAUT = {
  BOULANGERIE: {
    lundi: 'S', mardi: 'S', mercredi: 'S', jeudi: 'S',
    vendredi: 'F', samedi: 'F', dimanche: 'F'
  },
  VIENNOISERIE: {
    lundi: 'F', mardi: 'F', mercredi: 'F', jeudi: 'F',
    vendredi: 'f', samedi: 'f', dimanche: 'f'
  },
  PATISSERIE: {
    lundi: 'f', mardi: 'f', mercredi: 'f', jeudi: 'f',
    vendredi: 'f', samedi: 'f', dimanche: 'f'
  },
  SNACKING: {
    lundi: 'F', mardi: 'F', mercredi: 'F', jeudi: 'F',
    vendredi: 'f', samedi: 'f', dimanche: 'f'
  },
  NEGOCE: {
    lundi: 'f', mardi: 'f', mercredi: 'f', jeudi: 'f',
    vendredi: 'f', samedi: 'f', dimanche: 'f'
  },
  AUTRE: {
    lundi: 'F', mardi: 'F', mercredi: 'F', jeudi: 'F',
    vendredi: 'f', samedi: 'f', dimanche: 'f'
  }
};

// Jours de la semaine
const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const JOURS_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

// Couleurs par rayon (charte Mousquetaires)
const COULEURS_RAYON = {
  BOULANGERIE: { bg: 'bg-stone-100', border: 'border-stone-300', text: 'text-stone-800' },
  VIENNOISERIE: { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-800' },
  PATISSERIE: { bg: 'bg-rose-100', border: 'border-rose-300', text: 'text-rose-800' },
  SNACKING: { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-800' },
  NEGOCE: { bg: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-800' },
  AUTRE: { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-800' },
};

// Liste des familles disponibles
const FAMILLES = ['BOULANGERIE', 'VIENNOISERIE', 'PATISSERIE', 'SNACKING', 'NEGOCE', 'AUTRE'];

// Composant cellule éditable texte
const EditableTextCell = ({ value, onChange, placeholder = '-' }) => {
  const [editing, setEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value || '');
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    setTempValue(value || '');
  }, [value]);

  const handleBlur = () => {
    setEditing(false);
    if (tempValue !== value) {
      onChange(tempValue);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur();
    }
    if (e.key === 'Escape') {
      setTempValue(value || '');
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full px-2 py-1 text-sm border border-[#ED1C24] rounded focus:ring-2 focus:ring-[#ED1C24] focus:outline-none bg-white"
      />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors min-h-[28px] flex items-center"
      title="Cliquer pour modifier"
    >
      <span className={value ? '' : 'text-gray-400'}>{value || placeholder}</span>
    </div>
  );
};

// Composant cellule éditable numérique
const EditableNumberCell = ({ value, onChange, placeholder = '-', min = 0 }) => {
  const [editing, setEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value?.toString() || '');
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    setTempValue(value?.toString() || '');
  }, [value]);

  const handleBlur = () => {
    setEditing(false);
    const numValue = tempValue === '' ? 0 : parseInt(tempValue, 10);
    if (numValue !== value) {
      onChange(numValue);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur();
    }
    if (e.key === 'Escape') {
      setTempValue(value?.toString() || '');
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min={min}
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full px-2 py-1 text-sm border border-[#ED1C24] rounded focus:ring-2 focus:ring-[#ED1C24] focus:outline-none bg-white text-center"
      />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors min-h-[28px] flex items-center justify-center"
      title="Cliquer pour modifier"
    >
      <span className={value ? '' : 'text-gray-400'}>{value || placeholder}</span>
    </div>
  );
};

// Composant cellule avec dropdown (select)
const SelectCell = ({ value, options, onChange, placeholder = 'Sélectionner...' }) => {
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-2 py-1 text-sm border border-gray-200 rounded hover:border-[#ED1C24] focus:ring-2 focus:ring-[#ED1C24] focus:outline-none bg-white cursor-pointer transition-colors"
    >
      <option value="">{placeholder}</option>
      {options.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
};

// ============================================================================
// FONCTION CRITIQUE : Limites de progression S/F/f
// CDC V2 - Section 6.1 (lignes 1267-1357)
// ============================================================================
//
// PRINCIPE DE NON-BAISSE (TOUS LES MODES) :
// Le potentiel ne peut JAMAIS être inférieur à l'historique.
// Justification : produire moins = risque de rupture = perte de CA
//
// | Mode | Plafond              | Plancher   |
// |------|----------------------|------------|
// | S    | Aucun (illimité)     | Historique |
// | F    | Historique × 1.20    | Historique |
// | f    | Historique × 1.10    | Historique |
//
// TABLEAU DE VALIDATION :
// | Historique | Calculé | S   | F   | f   |
// |------------|---------|-----|-----|-----|
// | 100        | 150     | 150 | 120 | 110 |
// | 100        | 115     | 115 | 115 | 110 |
// | 100        | 105     | 105 | 105 | 105 |
// | 100        | 90      | 100 | 100 | 100 |
// ============================================================================
const appliquerLimite = (potentielCalcule, historique, limite) => {
  // PLANCHER COMMUN À TOUS LES MODES : jamais en dessous de l'historique
  const plancher = historique;

  if (limite === 'S') {
    // Sans limite de plafond, mais plancher = historique
    return Math.max(plancher, potentielCalcule);
  }

  if (limite === 'F') {
    // Plafond +20%, plancher = historique
    const plafond = Math.ceil(historique * 1.20);
    return Math.max(plancher, Math.min(potentielCalcule, plafond));
  }

  if (limite === 'f') {
    // Plafond +10%, plancher = historique
    const plafond = Math.ceil(historique * 1.10);
    return Math.max(plancher, Math.min(potentielCalcule, plafond));
  }

  // Par défaut : appliquer le plancher
  return Math.max(plancher, potentielCalcule);
};

// Poids de fréquentation par défaut si non fournis
const POIDS_FREQUENTATION_DEFAUT = {
  lundi: 0.12,
  mardi: 0.12,
  mercredi: 0.16,
  jeudi: 0.12,
  vendredi: 0.16,
  samedi: 0.20,
  dimanche: 0.12
};

export default function PilotageCA({
  produits,
  onProduitsChange,
  caTotalRayon,
  modeTerrain = false,
  onModeTerrainChange,
  // Nouveaux paramètres de calcul
  baseCalcul = 'PDV',
  onBaseCalculChange,
  limitesProgression = LIMITES_PROGRESSION_DEFAUT,
  onLimitesProgressionChange,
  repartitionParFamille = REPARTITION_DEFAUT,
  onRepartitionChange,
  // Nouveaux props pour le calcul jour par jour
  horaires = {},
  frequentation = null,
  onPlanningChange
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtreRayon, setFiltreRayon] = useState('TOUS');
  const [hideInactifs, setHideInactifs] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'moyenneHebdo', direction: 'desc' });
  const [showParametres, setShowParametres] = useState(false);

  // Liste des programmes disponibles
  const programmesDisponibles = useMemo(() => {
    return getListeProgrammesComplets();
  }, []);

  // Calculs CA avec application des coefficients de production S/F/f
  // NOUVEAU CALCUL: Jour par jour avec prise en compte des fermetures et fréquentation
  const { stats, planningCalcule } = useMemo(() => {
    // Récupérer les poids de fréquentation (depuis import ou défaut)
    const poidsFrequentation = frequentation?.parJour || POIDS_FREQUENTATION_DEFAUT;

    // Normaliser les poids pour qu'ils totalisent 1.0
    const totalPoids = JOURS.reduce((sum, jour) => sum + (poidsFrequentation[jour] || 0), 0);
    const poidsNormalises = {};
    JOURS.forEach(jour => {
      poidsNormalises[jour] = totalPoids > 0
        ? (poidsFrequentation[jour] || 0) / totalPoids
        : 1/7;
    });

    // Vérifier si un jour est fermé (matin ET après-midi fermés)
    const estJourFerme = (jour) => {
      const horaireJour = horaires[jour];
      if (!horaireJour) return false;

      // Si le jour est marqué comme fermé explicitement
      if (horaireJour.ferme === true) return true;

      // Si les deux créneaux sont fermés
      const matinFerme = horaireJour.matin?.statut === 'ferme';
      const apremFerme = horaireJour.apresmidi?.statut === 'ferme';
      return matinFerme && apremFerme;
    };

    // Calculer le nombre de jours ouverts et redistribuer les poids
    const joursOuverts = JOURS.filter(jour => !estJourFerme(jour));
    const nbJoursOuverts = joursOuverts.length;

    // Si tous les jours sont fermés, éviter division par 0
    if (nbJoursOuverts === 0) {
      return {
        stats: {
          nbActifs: produits.filter(p => p.actif).length,
          nbTotal: produits.length,
          caPrevi: 0,
          caHisto: 0,
          progression: 0,
          pourcentageSelection: 0
        },
        planningCalcule: {}
      };
    }

    // Redistribuer les poids sur les jours ouverts uniquement
    const totalPoidsOuverts = joursOuverts.reduce((sum, jour) => sum + poidsNormalises[jour], 0);
    const poidsRedistribues = {};
    JOURS.forEach(jour => {
      if (estJourFerme(jour)) {
        poidsRedistribues[jour] = 0;
      } else {
        poidsRedistribues[jour] = totalPoidsOuverts > 0
          ? poidsNormalises[jour] / totalPoidsOuverts
          : 1 / nbJoursOuverts;
      }
    });

    const produitsActifs = produits.filter(p => p.actif);

    // Structure pour stocker les quantités calculées par produit et par jour
    const planning = {};
    let caPreviTotal = 0;

    // Calculer jour par jour pour chaque produit
    produitsActifs.forEach(produit => {
      const famille = produit.rayon || 'AUTRE';
      const moyenneHebdo = produit.moyenneHebdo || 0;
      const potentielHebdo = produit.potentielHebdo || moyenneHebdo; // Potentiel calculé
      const prixUnitaire = produit.prixMoyenUnitaire || 0;

      planning[produit.id] = {
        produit: produit.libellePersonnalise || produit.libelle,
        itm8: produit.itm8,
        jours: {},
        totalQte: 0,
        totalCA: 0
      };

      JOURS.forEach(jour => {
        // Si jour fermé, quantité = 0
        if (estJourFerme(jour)) {
          planning[produit.id].jours[jour] = {
            qte: 0,
            ca: 0,
            ferme: true,
            limite: '-',
            poidsFrequentation: 0
          };
          return;
        }

        // Récupérer la limite de progression pour ce jour/famille
        const limite = limitesProgression[famille]?.[jour] || 'F';

        // Poids de fréquentation pour ce jour
        const poidsJour = poidsRedistribues[jour];

        // Quantité historique pour ce jour (moyenne hebdo × poids du jour)
        const qteHistoriqueJour = moyenneHebdo * poidsJour;

        // Quantité potentielle pour ce jour (potentiel hebdo × poids du jour)
        const qtePotentielJour = potentielHebdo * poidsJour;

        // Appliquer la limite de progression :
        // - Plancher = historique (on ne descend jamais en dessous)
        // - Plafond selon la limite (S = illimité, F = +20%, f = +10%)
        const qteJour = Math.ceil(appliquerLimite(qtePotentielJour, qteHistoriqueJour, limite));

        // CA pour ce jour
        const caJour = qteJour * prixUnitaire;

        planning[produit.id].jours[jour] = {
          qte: qteJour,
          ca: caJour,
          ferme: false,
          limite,
          qteHistorique: Math.ceil(qteHistoriqueJour),
          qtePotentiel: Math.ceil(qtePotentielJour),
          poidsFrequentation: poidsJour
        };

        planning[produit.id].totalQte += qteJour;
        planning[produit.id].totalCA += caJour;
      });

      caPreviTotal += planning[produit.id].totalCA;
    });

    // CA Historique (inchangé)
    const caHisto = produitsActifs.reduce((sum, p) => sum + (p.caHebdoActuel || 0), 0);

    const progression = caHisto > 0 ? ((caPreviTotal - caHisto) / caHisto) * 100 : 0;
    const pourcentageSelection = caTotalRayon > 0 ? (caHisto / caTotalRayon) * 100 : 0;

    return {
      stats: {
        nbActifs: produitsActifs.length,
        nbTotal: produits.length,
        caPrevi: caPreviTotal,
        caHisto,
        progression,
        pourcentageSelection,
        nbJoursOuverts,
        joursFermes: JOURS.filter(jour => estJourFerme(jour))
      },
      planningCalcule: planning
    };
  }, [produits, caTotalRayon, limitesProgression, horaires, frequentation]);

  // Notifier le parent du planning calculé
  useEffect(() => {
    if (onPlanningChange && planningCalcule) {
      onPlanningChange(planningCalcule);
    }
  }, [planningCalcule, onPlanningChange]);

  // Rayons disponibles
  const rayonsDisponibles = useMemo(() => {
    const rayons = new Set(produits.map(p => p.rayon || 'AUTRE'));
    return ['TOUS', ...Array.from(rayons)];
  }, [produits]);

  // Fonction de tri
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  // Produits filtrés et triés
  const produitsFiltres = useMemo(() => {
    let filtered = produits.filter(p => {
      const matchSearch = searchTerm === '' ||
        p.libelle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.libellePersonnalise?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.plu?.toString().includes(searchTerm) ||
        p.itm8?.includes(searchTerm);

      const matchRayon = filtreRayon === 'TOUS' || p.rayon === filtreRayon;
      const matchActif = !hideInactifs || p.actif;

      return matchSearch && matchRayon && matchActif;
    });

    filtered.sort((a, b) => {
      let aVal, bVal;
      switch (sortConfig.key) {
        case 'libelle':
          aVal = (a.libellePersonnalise || a.libelle || '').toLowerCase();
          bVal = (b.libellePersonnalise || b.libelle || '').toLowerCase();
          break;
        case 'moyenneHebdo':
          aVal = a.moyenneHebdo || 0;
          bVal = b.moyenneHebdo || 0;
          break;
        case 'potentielHebdo':
          aVal = a.potentielHebdo || 0;
          bVal = b.potentielHebdo || 0;
          break;
        case 'caHebdoActuel':
          aVal = a.caHebdoActuel || 0;
          bVal = b.caHebdoActuel || 0;
          break;
        default:
          aVal = a.moyenneHebdo || 0;
          bVal = b.moyenneHebdo || 0;
      }

      if (sortConfig.key === 'libelle') {
        return sortConfig.direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return filtered;
  }, [produits, searchTerm, filtreRayon, hideInactifs, sortConfig]);

  // Composant pour l'en-tête de colonne triable
  const SortableHeader = ({ label, sortKey, align = 'left' }) => (
    <th
      onClick={() => handleSort(sortKey)}
      className={`px-4 py-3 text-${align} text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none`}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
        <span>{label}</span>
        {sortConfig.key === sortKey && (
          sortConfig.direction === 'desc'
            ? <ArrowDown className="w-3 h-3" />
            : <ArrowUp className="w-3 h-3" />
        )}
      </div>
    </th>
  );

  // Toggle actif d'un produit
  const toggleProduit = (id) => {
    const newProduits = produits.map(p =>
      p.id === id ? { ...p, actif: !p.actif } : p
    );
    onProduitsChange(newProduits);
  };

  // Activer/désactiver tous les produits filtrés
  const toggleTous = (actif) => {
    const idsFiltres = new Set(produitsFiltres.map(p => p.id));
    const newProduits = produits.map(p =>
      idsFiltres.has(p.id) ? { ...p, actif } : p
    );
    onProduitsChange(newProduits);
  };

  // Mettre à jour un champ d'un produit
  const updateProduit = (id, field, value) => {
    const newProduits = produits.map(p =>
      p.id === id ? { ...p, [field]: value } : p
    );
    onProduitsChange(newProduits);
  };

  const formatEuro = (value) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Dashboard CA - Ordre: Historique → Prévisionnel → Progression */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CA Historique (passé) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">CA Historique</span>
            <span className="text-xs text-gray-400">Semaine équivalente</span>
          </div>
          <p className="text-2xl font-bold text-[#58595B]">{formatEuro(stats.caHisto)}</p>
          <p className="text-xs text-gray-400 mt-1">Données importées</p>
        </div>

        {/* CA Prévisionnel (futur) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">CA Prévisionnel</span>
            <TrendingUp className="w-5 h-5 text-[#ED1C24]" />
          </div>
          <p className="text-2xl font-bold text-[#58595B]">{formatEuro(stats.caPrevi)}</p>
          <p className="text-xs text-gray-400 mt-1">Basé sur les potentiels</p>
        </div>

        {/* Progression (évolution) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Progression</span>
            {stats.progression > 0 ? (
              <TrendingUp className="w-5 h-5 text-green-500" />
            ) : stats.progression < 0 ? (
              <TrendingDown className="w-5 h-5 text-red-500" />
            ) : (
              <Minus className="w-5 h-5 text-gray-400" />
            )}
          </div>
          <p className={`text-2xl font-bold ${
            stats.progression > 0 ? 'text-green-600' : stats.progression < 0 ? 'text-red-600' : 'text-gray-600'
          }`}>
            {stats.progression > 0 ? '+' : ''}{stats.progression.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-400 mt-1">vs semaine précédente</p>
        </div>
      </div>

      {/* Section Paramètres de calcul (pliable) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* En-tête cliquable */}
        <button
          onClick={() => setShowParametres(!showParametres)}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-[#8B1538]" />
            <span className="font-semibold text-[#58595B]">Paramètres de calcul</span>
          </div>
          {showParametres ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {/* Contenu dépliable */}
        {showParametres && (
          <div className="px-5 pb-5 space-y-6 border-t border-gray-100">
            {/* Base de calcul BVP/PDV */}
            <div className="pt-4">
              <h4 className="text-sm font-medium text-[#58595B] mb-3">Base de calcul de la répartition</h4>
              <div className="flex flex-wrap gap-3">
                <label className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${
                  baseCalcul === 'BVP'
                    ? 'border-[#ED1C24] bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="baseCalcul"
                    value="BVP"
                    checked={baseCalcul === 'BVP'}
                    onChange={() => onBaseCalculChange?.('BVP')}
                    className="w-4 h-4 text-[#ED1C24] focus:ring-[#ED1C24]"
                  />
                  <div>
                    <span className="font-medium text-[#58595B]">Taux de fréquentation BVP</span>
                    <p className="text-xs text-gray-500">Basé sur les quantités vendues au rayon</p>
                  </div>
                </label>
                <label className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${
                  baseCalcul === 'PDV'
                    ? 'border-[#ED1C24] bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="baseCalcul"
                    value="PDV"
                    checked={baseCalcul === 'PDV'}
                    onChange={() => onBaseCalculChange?.('PDV')}
                    className="w-4 h-4 text-[#ED1C24] focus:ring-[#ED1C24]"
                  />
                  <div>
                    <span className="font-medium text-[#58595B]">Taux de fréquentation PDV</span>
                    <p className="text-xs text-gray-500">Basé sur le flux global du magasin (recommandé)</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Matrice Limite de progression par Famille × Jour */}
            <div>
              <h4 className="text-sm font-medium text-[#58595B] mb-2">Limite de progression par famille</h4>
              <p className="text-xs text-gray-500 mb-3">Cliquez sur une cellule pour changer la limite (S → F → f → S)</p>

              {/* Actions rapides */}
              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => {
                    const newLimites = {};
                    FAMILLES.forEach(f => {
                      newLimites[f] = {};
                      JOURS.forEach(j => { newLimites[f][j] = 'S'; });
                    });
                    onLimitesProgressionChange?.(newLimites);
                  }}
                  className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                >
                  Tout S
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const newLimites = {};
                    FAMILLES.forEach(f => {
                      newLimites[f] = {};
                      JOURS.forEach(j => { newLimites[f][j] = 'F'; });
                    });
                    onLimitesProgressionChange?.(newLimites);
                  }}
                  className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                >
                  Tout F
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const newLimites = {};
                    FAMILLES.forEach(f => {
                      newLimites[f] = {};
                      JOURS.forEach(j => { newLimites[f][j] = 'f'; });
                    });
                    onLimitesProgressionChange?.(newLimites);
                  }}
                  className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                >
                  Tout f
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const newLimites = {};
                    FAMILLES.forEach(f => {
                      newLimites[f] = {};
                      JOURS.forEach(j => {
                        // Lun-Ven = S, Sam-Dim = f
                        newLimites[f][j] = ['samedi', 'dimanche'].includes(j) ? 'f' : 'S';
                      });
                    });
                    onLimitesProgressionChange?.(newLimites);
                  }}
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  Semaine S / Week-end f
                </button>
              </div>

              {/* Matrice */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left p-2 font-medium text-gray-600 bg-gray-50">Famille</th>
                      {JOURS_LABELS.map((jour, i) => (
                        <th key={i} className="p-2 font-medium text-gray-600 text-center bg-gray-50 min-w-[44px]">{jour}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {FAMILLES.map(famille => (
                      <tr key={famille} className="border-t border-gray-100">
                        <td className="p-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${COULEURS_RAYON[famille]?.bg || 'bg-gray-100'} ${COULEURS_RAYON[famille]?.text || 'text-gray-800'}`}>
                            {famille}
                          </span>
                        </td>
                        {JOURS.map((jour, i) => {
                          const limite = limitesProgression[famille]?.[jour] || 'F';
                          const bgColor = limite === 'S'
                            ? 'bg-green-500 hover:bg-green-600'
                            : limite === 'F'
                              ? 'bg-purple-500 hover:bg-purple-600'
                              : 'bg-red-500 hover:bg-red-600';

                          const cycleLimit = () => {
                            const newLimites = { ...limitesProgression };
                            if (!newLimites[famille]) newLimites[famille] = {};
                            newLimites[famille] = { ...newLimites[famille] };
                            const current = newLimites[famille][jour] || 'F';
                            newLimites[famille][jour] = current === 'S' ? 'F' : current === 'F' ? 'f' : 'S';
                            onLimitesProgressionChange?.(newLimites);
                          };

                          return (
                            <td key={i} className="p-1 text-center">
                              <button
                                type="button"
                                onClick={cycleLimit}
                                className={`w-10 h-8 rounded text-white font-bold text-sm ${bgColor} transition-colors cursor-pointer`}
                              >
                                {limite}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Légende */}
              <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-600">
                <span className="flex items-center gap-1">
                  <span className="w-4 h-4 bg-green-500 rounded"></span> S = Mathématique (sans plafond)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-4 h-4 bg-purple-500 rounded"></span> F = Forte progression (+20% max)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-4 h-4 bg-red-500 rounded"></span> f = Prudent (+10% max)
                </span>
              </div>

              <p className="mt-3 text-xs text-gray-500 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Limite la progression par rapport à l'historique. Principe de non-baisse : jamais en dessous de l'historique.
              </p>

              {/* Afficher les jours fermés si présents */}
              {stats.joursFermes && stats.joursFermes.length > 0 && (
                <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Jours fermés (quantité = 0) : {stats.joursFermes.join(', ')}
                </p>
              )}
            </div>

            {/* Répartition par famille */}
            <div>
              <h4 className="text-sm font-medium text-[#58595B] mb-3">Répartition par famille</h4>
              <p className="text-xs text-gray-500 mb-3">Comment répartir les quantités sur la journée ?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {FAMILLES.map(famille => (
                  <div key={famille} className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                    <span className={`text-sm font-medium px-2 py-0.5 rounded ${COULEURS_RAYON[famille]?.bg || 'bg-gray-100'} ${COULEURS_RAYON[famille]?.text || 'text-gray-800'}`}>
                      {famille}
                    </span>
                    <select
                      value={repartitionParFamille[famille] || 'journalier'}
                      onChange={(e) => onRepartitionChange?.({
                        ...repartitionParFamille,
                        [famille]: e.target.value
                      })}
                      className="text-sm px-2 py-1 border border-gray-200 rounded focus:ring-2 focus:ring-[#ED1C24] focus:outline-none"
                    >
                      <option value="tranches">Par tranches horaires</option>
                      <option value="journalier">Journalier</option>
                    </select>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-500 flex items-center gap-1">
                <Info className="w-3 h-3" />
                "Par tranches" : quantités réparties sur 4 créneaux (avant 12h, 12h-14h, 14h-16h, après 16h)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Sélection Gamme */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-[#58595B]">Sélection Gamme</h3>
            <p className="text-sm text-gray-500">
              {stats.nbActifs} produits actifs sur {stats.nbTotal}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Part du CA rayon</p>
            <p className="text-lg font-semibold text-[#8B1538]">
              {stats.pourcentageSelection.toFixed(0)}%
            </p>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#ED1C24] to-[#8B1538] rounded-full transition-all"
            style={{ width: `${Math.min(stats.pourcentageSelection, 100)}%` }}
          />
        </div>
      </div>

      {/* Filtres et mode */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Recherche */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un produit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ED1C24] focus:border-transparent"
              />
            </div>
          </div>

          {/* Filtre rayon */}
          <select
            value={filtreRayon}
            onChange={(e) => setFiltreRayon(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ED1C24]"
          >
            {rayonsDisponibles.map(rayon => (
              <option key={rayon} value={rayon}>
                {rayon === 'TOUS' ? 'Tous les rayons' : rayon}
              </option>
            ))}
          </select>

          {/* Mode Terrain */}
          <button
            onClick={() => onModeTerrainChange(!modeTerrain)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              modeTerrain
                ? 'bg-[#ED1C24] text-white'
                : 'bg-white border border-gray-300 text-gray-700'
            }`}
          >
            {modeTerrain ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            <span className="text-sm font-medium">Mode Terrain</span>
          </button>
        </div>

        {/* Actions groupées */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => toggleTous(true)}
            className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
          >
            Activer tous ({produitsFiltres.length})
          </button>
          <button
            onClick={() => toggleTous(false)}
            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
          >
            Désactiver tous
          </button>
        </div>
      </div>

      {/* Liste des produits */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  Actif
                </th>
                {modeTerrain ? (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                      Désignation
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[140px]">
                      Famille
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[80px]">
                      PLU
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px]">
                      Programme
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[90px]">
                      U/Plaque
                    </th>
                  </>
                ) : (
                  <SortableHeader label="Produit" sortKey="libelle" />
                )}
                <SortableHeader label="Moy.Hebdo" sortKey="moyenneHebdo" align="right" />
                <SortableHeader label="Potentiel" sortKey="potentielHebdo" align="right" />
                <SortableHeader label="CA/sem" sortKey="caHebdoActuel" align="right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {produitsFiltres.map((produit) => {
                const couleurs = COULEURS_RAYON[produit.rayon] || COULEURS_RAYON.AUTRE;
                return (
                  <tr
                    key={produit.id}
                    className={`transition-colors ${
                      produit.actif ? 'bg-white hover:bg-gray-50' : 'bg-gray-100 opacity-60'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleProduit(produit.id)}
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                          produit.actif
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'bg-white border-gray-300'
                        }`}
                      >
                        {produit.actif && '✓'}
                      </button>
                    </td>

                    {modeTerrain ? (
                      <>
                        {/* Désignation - éditable */}
                        <td className="px-2 py-2">
                          <EditableTextCell
                            value={produit.libellePersonnalise || produit.libelle}
                            onChange={(val) => updateProduit(produit.id, 'libellePersonnalise', val)}
                            placeholder="Nom du produit"
                          />
                        </td>

                        {/* Famille - dropdown */}
                        <td className="px-2 py-2">
                          <SelectCell
                            value={produit.rayon}
                            options={FAMILLES}
                            onChange={(val) => updateProduit(produit.id, 'rayon', val)}
                            placeholder="Famille"
                          />
                        </td>

                        {/* PLU - éditable numérique */}
                        <td className="px-2 py-2">
                          <EditableTextCell
                            value={produit.plu}
                            onChange={(val) => updateProduit(produit.id, 'plu', val)}
                            placeholder="-"
                          />
                        </td>

                        {/* Programme - dropdown */}
                        <td className="px-2 py-2">
                          <SelectCell
                            value={produit.programme}
                            options={programmesDisponibles}
                            onChange={(val) => updateProduit(produit.id, 'programme', val)}
                            placeholder="Programme"
                          />
                        </td>

                        {/* U/Plaque - éditable numérique */}
                        <td className="px-2 py-2">
                          <EditableNumberCell
                            value={produit.unitesParPlaque}
                            onChange={(val) => updateProduit(produit.id, 'unitesParPlaque', val)}
                            placeholder="-"
                          />
                        </td>
                      </>
                    ) : (
                      /* Mode normal - affichage simple */
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-xs rounded ${couleurs.bg} ${couleurs.text}`}>
                            {produit.rayon?.substring(0, 3)}
                          </span>
                          <span className="font-medium text-[#58595B]">
                            {produit.libellePersonnalise || produit.libelle}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* Stats - lecture seule */}
                    <td className="px-4 py-3 text-right text-sm text-gray-600">
                      {produit.moyenneHebdo?.toFixed(0) || '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-[#58595B]">
                      {produit.potentielHebdo?.toFixed(0) || '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-[#8B1538]">
                      {produit.caHebdoActuel ? formatEuro(produit.caHebdoActuel) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {produitsFiltres.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            Aucun produit ne correspond aux filtres
          </div>
        )}
      </div>

      {/* Info Mode Terrain */}
      {modeTerrain && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700">
            <strong>Mode Terrain actif</strong> : Cliquez sur une cellule pour la modifier directement.
            Appuyez sur Entrée pour valider ou Échap pour annuler.
          </p>
        </div>
      )}
    </div>
  );
}
