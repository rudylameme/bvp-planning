import { useState, useMemo, useEffect, useCallback } from 'react';
import { Printer, Grid3X3, ChevronUp, ChevronDown, ArrowUpDown, ChevronRight, GripVertical, RotateCcw, Eye, EyeOff, Settings, Clock, X, Edit3, Plus, Trash2, Save, AlertTriangle, Calendar } from 'lucide-react';

// Clé localStorage pour les préférences
const PREFS_KEY = 'bvp_planning_jour_prefs';
// Clé localStorage pour les modifications de produits
const PRODUITS_MODIFIES_KEY = 'bvp_produits_modifies';
// Clé localStorage pour les programmes personnalisés
const PROGRAMMES_KEY = 'bvp_programmes_personnalises';

// Jours de la semaine
const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const JOURS_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

// Configuration des 6 tranches horaires (alignée sur le fichier Excel - colonne HORAIRE)
const TRANCHES_CONFIG = [
  { key: '00_Autre', label: 'Avant 9h', plage: '00h-09h' },
  { key: '09h_12h', label: '9h-12h', plage: '09h-12h' },
  { key: '12h_14h', label: '12h-14h', plage: '12h-14h' },
  { key: '14h_16h', label: '14h-16h', plage: '14h-16h' },
  { key: '16h_19h', label: '16h-19h', plage: '16h-19h' },
  { key: '19h_23h', label: 'Après 19h', plage: '19h-23h' },
];

// Configuration 4 tranches regroupées (format fichier Manager)
const TRANCHES_REGROUPEES = [
  { key: 'avant12h', label: 'Matin', plage: 'Avant 12h', sousKeys: ['00_Autre', '09h_12h'] },
  { key: '12h-14h', label: '12h-14h', plage: '12h-14h', sousKeys: ['12h_14h'] },
  { key: '14h-16h', label: '14h-16h', plage: '14h-16h', sousKeys: ['14h_16h'] },
  { key: 'apres16h', label: 'Après-midi', plage: 'Après 16h', sousKeys: ['16h_19h', '19h_23h'] },
];

// Clés des tranches pour itération
const TRANCHES = TRANCHES_CONFIG.map(t => t.key);
const TRANCHES_LABELS = TRANCHES_CONFIG.map(t => t.label);

// Mapping ancien format → nouveau format (rétrocompatibilité)
const MAPPING_TRANCHES_LEGACY = {
  'avant12h': ['00_Autre', '09h_12h'],
  '12h-14h': ['12h_14h'],
  '14h-16h': ['14h_16h'],
  'apres16h': ['16h_19h', '19h_23h'],
};

// Mapping des clés créneaux Manager (Etape3) → clés PlanningJour
const MAPPING_CRENEAUX_MANAGER = {
  'avant9h': '00_Autre',
  '9h12h': '09h_12h',
  '12h14h': '12h_14h',
  '14h16h': '14h_16h',
  '16h19h': '16h_19h',
  'apres19h': '19h_23h',
};

// Regroupements Manager → tranches regroupées dynamiques
const REGROUPEMENTS_MANAGER = {
  matin: { label: 'Matin', sousKeys: ['00_Autre', '09h_12h'] },
  apresmidi: { label: 'Après-midi', sousKeys: ['12h_14h', '14h_16h'] },
  soir: { label: 'Soir', sousKeys: ['16h_19h', '19h_23h'] },
};

// Icônes et couleurs par famille
const FAMILLES_CONFIG = {
  BOULANGERIE: { icon: '🥖', bg: 'bg-stone-700', headerBg: 'bg-stone-800' },
  VIENNOISERIE: { icon: '🥐', bg: 'bg-amber-600', headerBg: 'bg-amber-700' },
  PATISSERIE: { icon: '🍰', bg: 'bg-rose-600', headerBg: 'bg-rose-700' },
  SNACKING: { icon: '🥪', bg: 'bg-emerald-600', headerBg: 'bg-emerald-700' },
  NEGOCE: { icon: '📦', bg: 'bg-cyan-600', headerBg: 'bg-cyan-700' },
  AUTRE: { icon: '📋', bg: 'bg-slate-600', headerBg: 'bg-slate-700' }
};

// Liste des familles disponibles (ordre métier BVP)
const FAMILLES_LISTE = ['BOULANGERIE', 'VIENNOISERIE', 'SNACKING', 'PATISSERIE', 'AUTRE'];

// Obtenir le jour actuel (index 0-6)
const getJourActuel = () => {
  const dayIndex = new Date().getDay();
  // En JS, dimanche = 0, on convertit pour que lundi = 0
  return dayIndex === 0 ? 6 : dayIndex - 1;
};

// Obtenir la tranche horaire actuelle selon l'heure
const getTrancheActuelle = () => {
  const heure = new Date().getHours();
  if (heure < 9) return '00_Autre';
  if (heure < 12) return '09h_12h';
  if (heure < 14) return '12h_14h';
  if (heure < 16) return '14h_16h';
  if (heure < 19) return '16h_19h';
  return '19h_23h';
};

/**
 * Convertir une valeur en plaques si nécessaire (retourne le nombre)
 */
const convertirEnPlaques = (valeur, unitesParPlaque, affichage) => {
  if (affichage === 'plaques' && unitesParPlaque > 0) {
    return Math.ceil(valeur / unitesParPlaque);
  }
  return valeur;
};

/**
 * Calculer l'écart en pourcentage
 */
const calculerEcart = (preco, histo) => {
  if (!histo || histo === 0) return null;
  return Math.round(((preco - histo) / histo) * 100);
};

/**
 * Obtenir la couleur de l'écart selon les seuils
 */
const getEcartColor = (ecart) => {
  if (ecart === null) return 'text-gray-400';
  if (ecart > 20) return 'text-green-600 bg-green-50';
  if (ecart > 10) return 'text-blue-600 bg-blue-50';
  if (ecart >= -10) return 'text-gray-600 bg-gray-50';
  return 'text-orange-600 bg-orange-50';
};

/**
 * Formater l'écart avec signe
 */
const formatEcart = (ecart) => {
  if (ecart === null) return '-';
  const signe = ecart > 0 ? '+' : '';
  return `${signe}${ecart}%`;
};

/**
 * Composant pour afficher une cellule simple (valeur uniquement)
 */
function CelluleSimple({ valeur, variant = 'preco', isPlaque = false }) {
  const bgClasses = {
    preco: 'bg-blue-50 text-blue-700',
    histo: 'bg-gray-100 text-gray-600',
    ecart: '' // La couleur est gérée dynamiquement
  };

  // Afficher "Pl." si c'est une valeur en plaques
  const displayValue = isPlaque && valeur !== '-' && valeur !== null
    ? `${valeur} Pl.`
    : valeur;

  return (
    <span className={`inline-block px-2 py-0.5 rounded font-medium text-sm min-w-[32px] ${bgClasses[variant]}`}>
      {displayValue}
    </span>
  );
}

/**
 * Composant pour afficher une cellule d'écart avec couleur
 */
function CelluleEcart({ ecart }) {
  const colorClass = getEcartColor(ecart);
  return (
    <span className={`inline-block px-2 py-0.5 rounded font-medium text-sm min-w-[32px] ${colorClass}`}>
      {formatEcart(ecart)}
    </span>
  );
}

/**
 * Composant pour afficher une cellule de quantité compacte (mode BVP - 1 ligne)
 */
function CelluleQuantite({ preco, unitesParPlaque, affichage, variant = 'tranches', isActif = false }) {
  const isPlaque = affichage === 'plaques';

  // En mode plaques, vérifier si le produit a des unités par plaque
  if (isPlaque && (!unitesParPlaque || unitesParPlaque === 0)) {
    return (
      <div className="text-center">
        <span className="inline-block bg-gray-100 text-gray-400 px-3 py-1 rounded font-semibold min-w-[40px]">
          -
        </span>
      </div>
    );
  }

  const valeur = convertirEnPlaques(preco, unitesParPlaque, affichage);
  const displayValue = isPlaque ? `${valeur} Pl.` : valeur;

  // Couleurs selon le variant et si c'est le créneau actif
  let bgClass;
  if (isActif) {
    bgClass = 'bg-[#8B1538] text-white';
  } else if (variant === 'journalier') {
    bgClass = 'bg-green-50 text-green-700';
  } else {
    bgClass = 'bg-blue-50 text-blue-700';
  }

  return (
    <div className="text-center">
      <span className={`inline-block ${bgClass} px-3 py-1 rounded font-semibold min-w-[40px]`}>
        {displayValue}
      </span>
    </div>
  );
}

// ============================================================================
// MODAL D'ÉDITION DE PRODUIT
// ============================================================================
function ModalEditionProduit({ produit, programmes, onSave, onClose }) {
  const [formData, setFormData] = useState({
    libelle: produit.libellePersonnalise || produit.libelle || '',
    famille: produit.famille || 'AUTRE',
    programme: produit.programme || '',
    plu: produit.plu || '',
    unitesParPlaque: produit.unitesParPlaque || 0,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      unitesParPlaque: parseInt(formData.unitesParPlaque, 10) || 0,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-[#8B1538] text-white rounded-t-xl">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Modifier le produit</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nom du produit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom du produit
            </label>
            <input
              type="text"
              value={formData.libelle}
              onChange={(e) => setFormData({ ...formData, libelle: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B1538] focus:border-transparent"
              placeholder="Ex: BAG CONSTANCE PAC 250G"
              required
            />
          </div>

          {/* Famille */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Famille / Rayon
            </label>
            <select
              value={formData.famille}
              onChange={(e) => setFormData({ ...formData, famille: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B1538] focus:border-transparent"
            >
              {FAMILLES_LISTE.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Programme de cuisson */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Programme de cuisson
            </label>
            <select
              value={formData.programme}
              onChange={(e) => setFormData({ ...formData, programme: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B1538] focus:border-transparent"
            >
              <option value="">-- Sans programme --</option>
              {programmes.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* PLU */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code PLU <span className="text-gray-400">(optionnel)</span>
            </label>
            <input
              type="text"
              value={formData.plu}
              onChange={(e) => setFormData({ ...formData, plu: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B1538] focus:border-transparent"
              placeholder="Ex: 10159"
            />
          </div>

          {/* Unités par plaque */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unités par plaque
            </label>
            <input
              type="number"
              min="0"
              value={formData.unitesParPlaque}
              onChange={(e) => setFormData({ ...formData, unitesParPlaque: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B1538] focus:border-transparent"
              placeholder="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              Nombre de produits qui tiennent sur une plaque de four
            </p>
          </div>

          {/* Boutons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-[#8B1538] text-white rounded-lg hover:bg-[#6d1029] transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// MODAL DE GESTION DES PROGRAMMES
// ============================================================================
function ModalGestionProgrammes({ programmes, produitsParProgramme, onSave, onClose }) {
  const [programmesList, setProgrammesList] = useState([...programmes]);
  const [nouveauProgramme, setNouveauProgramme] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [erreur, setErreur] = useState('');

  // Ajouter un nouveau programme
  const handleAjouter = () => {
    if (!nouveauProgramme.trim()) return;

    if (programmesList.includes(nouveauProgramme.trim().toUpperCase())) {
      setErreur('Ce programme existe déjà');
      return;
    }

    setProgrammesList([...programmesList, nouveauProgramme.trim().toUpperCase()]);
    setNouveauProgramme('');
    setErreur('');
  };

  // Commencer l'édition
  const handleStartEdit = (index) => {
    setEditingIndex(index);
    setEditingValue(programmesList[index]);
    setErreur('');
  };

  // Confirmer l'édition
  const handleConfirmEdit = (index) => {
    if (!editingValue.trim()) return;

    const newList = [...programmesList];
    newList[index] = editingValue.trim().toUpperCase();
    setProgrammesList(newList);
    setEditingIndex(null);
    setEditingValue('');
  };

  // Supprimer un programme
  const handleSupprimer = (index) => {
    const programme = programmesList[index];
    const nbProduits = produitsParProgramme[programme] || 0;

    if (nbProduits > 0) {
      setErreur(`Impossible de supprimer : ${nbProduits} produit(s) utilisent ce programme`);
      return;
    }

    const newList = programmesList.filter((_, i) => i !== index);
    setProgrammesList(newList);
    setErreur('');
  };

  // Enregistrer les modifications
  const handleSave = () => {
    onSave(programmesList);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-[#8B1538] text-white rounded-t-xl">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Gérer les programmes de cuisson</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Erreur */}
          {erreur && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{erreur}</span>
            </div>
          )}

          {/* Ajouter un nouveau programme */}
          <div className="flex gap-2">
            <input
              type="text"
              value={nouveauProgramme}
              onChange={(e) => setNouveauProgramme(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAjouter()}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8B1538] focus:border-transparent"
              placeholder="Nouveau programme..."
            />
            <button
              onClick={handleAjouter}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </button>
          </div>

          {/* Liste des programmes */}
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-[300px] overflow-y-auto">
            {programmesList.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                Aucun programme défini
              </div>
            ) : (
              programmesList.map((programme, index) => {
                const nbProduits = produitsParProgramme[programme] || 0;
                const isEditing = editingIndex === index;

                return (
                  <div key={index} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          className="flex-1 px-3 py-1 border border-[#8B1538] rounded focus:ring-2 focus:ring-[#8B1538]"
                          autoFocus
                        />
                        <button
                          onClick={() => handleConfirmEdit(index)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                          title="Confirmer"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingIndex(null)}
                          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                          title="Annuler"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 font-medium text-gray-800">{programme}</span>
                        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {nbProduits} produit{nbProduits > 1 ? 's' : ''}
                        </span>
                        <button
                          onClick={() => handleStartEdit(index)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Renommer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleSupprimer(index)}
                          className={`p-2 rounded-lg ${
                            nbProduits > 0
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-red-600 hover:bg-red-50'
                          }`}
                          title={nbProduits > 0 ? 'Produits associés' : 'Supprimer'}
                          disabled={nbProduits > 0}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <p className="text-xs text-gray-500">
            Renommer un programme mettra automatiquement à jour tous les produits associés.
          </p>

          {/* Boutons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-3 bg-[#8B1538] text-white rounded-lg hover:bg-[#6d1029] transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Composant Planning du Jour pour l'équipe
 * Affiche les quantités à produire par tranche horaire selon la fréquentation
 */
export default function PlanningJour({ donneesMagasin }) {
  // Sélectionner le jour actuel par défaut
  const [jourSelectionne, setJourSelectionne] = useState(JOURS[getJourActuel()]);
  const [affichage, setAffichage] = useState('unites'); // 'unites' ou 'plaques'

  // Créneau horaire actuel (pour mise en surbrillance)
  const [trancheActuelle, setTrancheActuelle] = useState(getTrancheActuelle());

  // Mode simplifié : n'affiche que les quantités (pas Histo/%)
  const [modeSimplifie, setModeSimplifie] = useState(true);

  // Afficher toutes les colonnes (même vides)
  const [afficherToutesColonnes, setAfficherToutesColonnes] = useState(false);


  // Mode d'affichage des tranches : 'regroupees' (4 colonnes) ou 'detaillees' (6 colonnes)
  const [modeTranches, setModeTranches] = useState('regroupees');

  // État pour le tri multi-colonnes
  // Tri par défaut: famille (BOULANGERIE d'abord), puis programme
  const [sortConfig, setSortConfig] = useState({
    key: 'famille',      // 'famille', 'programme', 'produit', 'total'
    direction: 'asc'     // 'asc' ou 'desc'
  });

  // État pour les sections dépliables (familles et programmes)
  const [sectionsOuvertes, setSectionsOuvertes] = useState({
    familles: {}, // { 'BOULANGERIE': true, 'VIENNOISERIE': false, ... }
    programmes: {} // { 'BOULANGERIE_Baguettes': true, ... }
  });

  // État pour l'ordre personnalisé des familles et programmes
  const [ordrePersonnalise, setOrdrePersonnalise] = useState({
    familles: null, // null = ordre par défaut, sinon tableau ['BOULANGERIE', ...]
    programmes: {}  // { 'BOULANGERIE': ['Baguettes', 'Pains', ...], ... }
  });

  // État pour le drag & drop
  const [dragState, setDragState] = useState({
    type: null,      // 'famille' ou 'programme'
    famille: null,   // Pour les programmes, la famille parente
    dragIndex: null,
    hoverIndex: null
  });

  // État pour l'édition des produits
  const [produitEnEdition, setProduitEnEdition] = useState(null);
  const [showModalProgrammes, setShowModalProgrammes] = useState(false);

  // Modifications de produits persistées
  const [produitsModifies, setProduitsModifies] = useState({});

  // Programmes personnalisés
  const [programmesPersonnalises, setProgrammesPersonnalises] = useState(null);

  const { configuration, frequentation, produits: produitsOriginaux } = donneesMagasin;

  // Appliquer les modifications aux produits
  const produits = useMemo(() => {
    return produitsOriginaux.map(produit => {
      const modif = produitsModifies[produit.id];
      if (modif) {
        return {
          ...produit,
          libellePersonnalise: modif.libelle,
          famille: modif.famille,
          programme: modif.programme,
          plu: modif.plu,
          unitesParPlaque: modif.unitesParPlaque,
        };
      }
      return produit;
    });
  }, [produitsOriginaux, produitsModifies]);

  // Mise à jour du créneau actuel toutes les minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setTrancheActuelle(getTrancheActuelle());
    }, 60000); // Toutes les minutes
    return () => clearInterval(interval);
  }, []);

  // Charger les préférences au démarrage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PREFS_KEY);
      if (saved) {
        const prefs = JSON.parse(saved);
        if (prefs.sectionsOuvertes) setSectionsOuvertes(prefs.sectionsOuvertes);
        if (prefs.ordrePersonnalise) setOrdrePersonnalise(prefs.ordrePersonnalise);
      }
    } catch {
      // Ignorer les erreurs de parsing
    }
  }, []);

  // Charger les produits modifiés au démarrage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PRODUITS_MODIFIES_KEY);
      if (saved) {
        setProduitsModifies(JSON.parse(saved));
      }
    } catch {
      // Ignorer les erreurs
    }
  }, []);

  // Charger les programmes personnalisés au démarrage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PROGRAMMES_KEY);
      if (saved) {
        setProgrammesPersonnalises(JSON.parse(saved));
      }
    } catch {
      // Ignorer les erreurs
    }
  }, []);

  // Sauvegarder les préférences quand elles changent
  const sauvegarderPrefs = useCallback((sections, ordre) => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({
        sectionsOuvertes: sections,
        ordrePersonnalise: ordre
      }));
    } catch {
      // Ignorer les erreurs de localStorage
    }
  }, []);

  // Réinitialiser les préférences
  const reinitialiserPrefs = useCallback(() => {
    setSectionsOuvertes({ familles: {}, programmes: {} });
    setOrdrePersonnalise({ familles: null, programmes: {} });
    localStorage.removeItem(PREFS_KEY);
  }, []);

  // Sauvegarder les modifications d'un produit
  const handleSaveProduit = useCallback((modifications) => {
    if (!produitEnEdition) return;

    const newModifs = {
      ...produitsModifies,
      [produitEnEdition.id]: modifications
    };

    setProduitsModifies(newModifs);

    // Sauvegarder dans localStorage
    try {
      localStorage.setItem(PRODUITS_MODIFIES_KEY, JSON.stringify(newModifs));
    } catch {
      // Ignorer les erreurs
    }

    setProduitEnEdition(null);
  }, [produitEnEdition, produitsModifies]);

  // Sauvegarder les programmes
  const handleSaveProgrammes = useCallback((nouveauxProgrammes) => {
    // Trouver les programmes renommés
    const anciensProgrammes = programmesActuels;
    const renommages = {};

    // Détecter les renommages (même index, nom différent)
    anciensProgrammes.forEach((ancien, index) => {
      const nouveau = nouveauxProgrammes[index];
      if (nouveau && ancien !== nouveau) {
        renommages[ancien] = nouveau;
      }
    });

    // Mettre à jour les produits modifiés avec les nouveaux noms de programmes
    if (Object.keys(renommages).length > 0) {
      const newModifs = { ...produitsModifies };

      // Mettre à jour les produits déjà modifiés
      Object.keys(newModifs).forEach(produitId => {
        const modif = newModifs[produitId];
        if (modif.programme && renommages[modif.programme]) {
          newModifs[produitId] = {
            ...modif,
            programme: renommages[modif.programme]
          };
        }
      });

      // Mettre à jour les produits originaux qui utilisent les anciens noms
      produitsOriginaux.forEach(produit => {
        if (produit.programme && renommages[produit.programme] && !newModifs[produit.id]) {
          newModifs[produit.id] = {
            libelle: produit.libellePersonnalise || produit.libelle,
            famille: produit.famille,
            programme: renommages[produit.programme],
            plu: produit.plu || '',
            unitesParPlaque: produit.unitesParPlaque || 0,
          };
        }
      });

      setProduitsModifies(newModifs);
      localStorage.setItem(PRODUITS_MODIFIES_KEY, JSON.stringify(newModifs));
    }

    // Sauvegarder les programmes personnalisés
    setProgrammesPersonnalises(nouveauxProgrammes);
    localStorage.setItem(PROGRAMMES_KEY, JSON.stringify(nouveauxProgrammes));
  }, [produitsModifies, produitsOriginaux]);

  // Obtenir la liste des programmes actuels (personnalisés ou issus des produits)
  const programmesActuels = useMemo(() => {
    if (programmesPersonnalises && programmesPersonnalises.length > 0) {
      return programmesPersonnalises;
    }

    // Extraire les programmes uniques des produits
    const programmeSet = new Set();
    produits.forEach(p => {
      if (p.programme) programmeSet.add(p.programme);
    });
    return Array.from(programmeSet).sort();
  }, [programmesPersonnalises, produits]);

  // Compter les produits par programme
  const produitsParProgramme = useMemo(() => {
    const counts = {};
    produits.forEach(p => {
      const prog = p.programme || 'Sans programme';
      counts[prog] = (counts[prog] || 0) + 1;
    });
    return counts;
  }, [produits]);

  // Toggle une section famille (ouvert/fermé)
  const toggleFamille = useCallback((famille) => {
    setSectionsOuvertes(prev => {
      const newSections = {
        ...prev,
        familles: {
          ...prev.familles,
          [famille]: prev.familles[famille] === false ? true : false
        }
      };
      sauvegarderPrefs(newSections, ordrePersonnalise);
      return newSections;
    });
  }, [ordrePersonnalise, sauvegarderPrefs]);

  // Toggle une section programme (ouvert/fermé)
  const toggleProgramme = useCallback((famille, programme) => {
    const key = `${famille}_${programme}`;
    setSectionsOuvertes(prev => {
      const newSections = {
        ...prev,
        programmes: {
          ...prev.programmes,
          [key]: prev.programmes[key] === false ? true : false
        }
      };
      sauvegarderPrefs(newSections, ordrePersonnalise);
      return newSections;
    });
  }, [ordrePersonnalise, sauvegarderPrefs]);

  // Vérifier si une famille est ouverte (ouvert par défaut)
  const isFamilleOuverte = useCallback((famille) => {
    return sectionsOuvertes.familles[famille] !== false;
  }, [sectionsOuvertes.familles]);

  // Vérifier si un programme est ouvert (ouvert par défaut)
  const isProgrammeOuvert = useCallback((famille, programme) => {
    const key = `${famille}_${programme}`;
    return sectionsOuvertes.programmes[key] !== false;
  }, [sectionsOuvertes.programmes]);

  // Handlers pour le drag & drop des familles
  const handleDragStartFamille = useCallback((e, index) => {
    setDragState({ type: 'famille', famille: null, dragIndex: index, hoverIndex: null });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  }, []);

  const handleDragOverFamille = useCallback((e, index) => {
    e.preventDefault();
    if (dragState.type === 'famille' && dragState.dragIndex !== index) {
      setDragState(prev => ({ ...prev, hoverIndex: index }));
    }
  }, [dragState.type, dragState.dragIndex]);

  const handleDropFamille = useCallback((e, dropIndex, famillesActuelles) => {
    e.preventDefault();
    const dragIndex = dragState.dragIndex;

    if (dragIndex === null || dragIndex === dropIndex) {
      setDragState({ type: null, famille: null, dragIndex: null, hoverIndex: null });
      return;
    }

    // Réordonner les familles
    const newOrder = [...famillesActuelles];
    const [dragged] = newOrder.splice(dragIndex, 1);
    newOrder.splice(dropIndex, 0, dragged);

    setOrdrePersonnalise(prev => {
      const newOrdre = { ...prev, familles: newOrder };
      sauvegarderPrefs(sectionsOuvertes, newOrdre);
      return newOrdre;
    });

    setDragState({ type: null, famille: null, dragIndex: null, hoverIndex: null });
  }, [dragState.dragIndex, sectionsOuvertes, sauvegarderPrefs]);

  const handleDragEndFamille = useCallback(() => {
    setDragState({ type: null, famille: null, dragIndex: null, hoverIndex: null });
  }, []);

  // Handlers pour le drag & drop des programmes
  const handleDragStartProgramme = useCallback((e, famille, index) => {
    setDragState({ type: 'programme', famille, dragIndex: index, hoverIndex: null });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  }, []);

  const handleDragOverProgramme = useCallback((e, famille, index) => {
    e.preventDefault();
    if (dragState.type === 'programme' && dragState.famille === famille && dragState.dragIndex !== index) {
      setDragState(prev => ({ ...prev, hoverIndex: index }));
    }
  }, [dragState.type, dragState.famille, dragState.dragIndex]);

  const handleDropProgramme = useCallback((e, dropIndex, famille, programmesActuels) => {
    e.preventDefault();
    const dragIndex = dragState.dragIndex;

    if (dragIndex === null || dragIndex === dropIndex || dragState.famille !== famille) {
      setDragState({ type: null, famille: null, dragIndex: null, hoverIndex: null });
      return;
    }

    // Réordonner les programmes
    const newOrder = [...programmesActuels];
    const [dragged] = newOrder.splice(dragIndex, 1);
    newOrder.splice(dropIndex, 0, dragged);

    setOrdrePersonnalise(prev => {
      const newOrdre = {
        ...prev,
        programmes: {
          ...prev.programmes,
          [famille]: newOrder
        }
      };
      sauvegarderPrefs(sectionsOuvertes, newOrdre);
      return newOrdre;
    });

    setDragState({ type: null, famille: null, dragIndex: null, hoverIndex: null });
  }, [dragState.dragIndex, dragState.famille, sectionsOuvertes, sauvegarderPrefs]);

  const handleDragEndProgramme = useCallback(() => {
    setDragState({ type: null, famille: null, dragIndex: null, hoverIndex: null });
  }, []);

  // Déterminer si on affiche l'historique (seulement en mode PDV)
  const baseCalcul = configuration?.baseCalcul || 'PDV';
  const showHisto = baseCalcul === 'PDV';

  // Fonction de tri (cycle: asc → desc → retour à asc)
  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        // Même colonne: inverser l'ordre
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      } else {
        // Nouvelle colonne: tri ascendant
        return { key, direction: 'asc' };
      }
    });
  };

  // Grouper les produits par famille, puis par programme
  const produitsParFamille = useMemo(() => {
    const groupes = {};

    produits
      .filter(p => p.actif !== false)
      .forEach(produit => {
        const famille = produit.famille || 'AUTRE';
        if (!groupes[famille]) {
          groupes[famille] = {
            parProgramme: {},
            tous: []
          };
        }

        const programme = produit.programme || 'Sans programme';
        if (!groupes[famille].parProgramme[programme]) {
          groupes[famille].parProgramme[programme] = [];
        }

        groupes[famille].parProgramme[programme].push(produit);
        groupes[famille].tous.push(produit);
      });

    // Tri des produits selon la configuration
    Object.values(groupes).forEach(groupe => {
      // Fonction de tri pour les produits
      const sortProduits = (prods) => {
        return prods.sort((a, b) => {
          let comparison = 0;

          switch (sortConfig.key) {
            case 'produit': {
              // Tri alphabétique par nom
              const nomA = (a.libellePersonnalise || a.libelle || '').toLowerCase();
              const nomB = (b.libellePersonnalise || b.libelle || '').toLowerCase();
              comparison = nomA.localeCompare(nomB);
              break;
            }
            case 'programme': {
              // Tri par programme (type de cuisson)
              const progA = (a.programme || 'Sans programme').toLowerCase();
              const progB = (b.programme || 'Sans programme').toLowerCase();
              comparison = progA.localeCompare(progB);
              break;
            }
            case 'total':
              // Tri par potentiel/quantité
              comparison = (a.potentiel || 0) - (b.potentiel || 0);
              break;
            default:
              // Tri par défaut: potentiel décroissant
              comparison = (b.potentiel || 0) - (a.potentiel || 0);
          }

          return sortConfig.direction === 'asc' ? comparison : -comparison;
        });
      };

      // Appliquer le tri
      Object.keys(groupe.parProgramme).forEach(prog => {
        groupe.parProgramme[prog] = sortProduits([...groupe.parProgramme[prog]]);
      });
      groupe.tous = sortProduits([...groupe.tous]);
    });

    return groupes;
  }, [produits, sortConfig]);

  // Ordre des familles triées selon la direction ou personnalisé
  const famillesTriees = useMemo(() => {
    // Ordre métier BVP : Boulangerie → Viennoiserie → Snacking → Pâtisserie → Autre
    const ordreFamillesDefaut = ['BOULANGERIE', 'VIENNOISERIE', 'SNACKING', 'PATISSERIE', 'AUTRE'];

    // Si un ordre personnalisé existe, l'utiliser
    if (ordrePersonnalise.familles && ordrePersonnalise.familles.length > 0) {
      // Filtrer pour ne garder que les familles présentes
      const famillesPresentes = ordrePersonnalise.familles.filter(f => produitsParFamille[f]);
      // Ajouter les nouvelles familles qui ne sont pas dans l'ordre personnalisé
      const nouvellesFamilles = ordreFamillesDefaut.filter(
        f => produitsParFamille[f] && !famillesPresentes.includes(f)
      );
      return [...famillesPresentes, ...nouvellesFamilles];
    }

    // Sinon, utiliser l'ordre par défaut avec tri
    const famillesPresentes = ordreFamillesDefaut.filter(f => produitsParFamille[f]);

    if (sortConfig.key === 'famille') {
      return sortConfig.direction === 'asc'
        ? famillesPresentes
        : [...famillesPresentes].reverse();
    }

    return famillesPresentes;
  }, [produitsParFamille, sortConfig, ordrePersonnalise.familles]);

  // Construire les tranches regroupées dynamiquement selon configuration.regroupements du manager
  const tranchesRegroupeesDynamiques = useMemo(() => {
    const regroup = configuration?.regroupements;
    if (!regroup) return TRANCHES_REGROUPEES; // Fallback par défaut

    // Construire la liste : pour chaque tranche de base, soit elle est regroupée, soit détaillée
    const result = [];
    const dejaTraites = new Set();

    // Parcourir les regroupements possibles dans l'ordre
    const ordreRegroup = ['matin', 'apresmidi', 'soir'];
    for (const id of ordreRegroup) {
      const config = REGROUPEMENTS_MANAGER[id];
      if (!config) continue;
      if (regroup[id]) {
        // Ce groupe est activé → une seule colonne regroupée
        result.push({
          key: id,
          label: config.label,
          plage: config.label,
          sousKeys: config.sousKeys,
        });
        config.sousKeys.forEach(k => dejaTraites.add(k));
      } else {
        // Pas regroupé → colonnes individuelles
        config.sousKeys.forEach(k => {
          if (!dejaTraites.has(k)) {
            const tc = TRANCHES_CONFIG.find(t => t.key === k);
            if (tc) {
              result.push({ ...tc, sousKeys: [k] });
              dejaTraites.add(k);
            }
          }
        });
      }
    }

    // Ajouter les tranches non couvertes par un regroupement
    TRANCHES_CONFIG.forEach(tc => {
      if (!dejaTraites.has(tc.key)) {
        result.push({ ...tc, sousKeys: [tc.key] });
      }
    });

    return result;
  }, [configuration?.regroupements]);

  // Calculer quelles colonnes (tranches) à afficher
  // En mode 'regroupees' : colonnes selon regroupements manager
  // En mode 'detaillees' : 6 colonnes
  const colonnesVisibles = useMemo(() => {
    // Mode regroupé : utiliser les tranches regroupées (dynamiques si config manager)
    if (modeTranches === 'regroupees') {
      return tranchesRegroupeesDynamiques;
    }

    // Mode détaillé avec toutes les colonnes
    if (afficherToutesColonnes) {
      return TRANCHES_CONFIG;
    }

    // Vérifier chaque tranche pour voir si elle a des données
    const tranchesAvecDonnees = new Set();

    // Parcourir tous les produits actifs
    produits
      .filter(p => p.actif !== false)
      .forEach(produit => {
        const modeRepartition = configuration?.repartitionParFamille?.[produit.famille] || 'journalier';
        if (modeRepartition === 'tranches') {
          const poidsJour = frequentation?.parJour?.[jourSelectionne]?.poids || (1 / 7);
          const repartJour = produit.repartitionJours?.[jourSelectionne];
          const potentielHebdo = produit.planifieManager || produit.potentielAlgo || produit.potentiel || 0;
          const potentielJour = repartJour != null ? Math.ceil(repartJour) : Math.ceil(potentielHebdo * poidsJour);

          if (potentielJour > 0) {
            // Obtenir les données de fréquentation pour ce jour
            const tranchesData = frequentation?.parJour?.[jourSelectionne]?.tranches || {};

            // Pour chaque tranche, vérifier s'il y a une quantité
            TRANCHES.forEach(trancheKey => {
              // Chercher le poids de cette tranche
              let poids = tranchesData[trancheKey]?.poids;

              // Si pas trouvé, chercher dans l'ancien format
              if (poids === undefined) {
                for (const [oldKey, newKeys] of Object.entries(MAPPING_TRANCHES_LEGACY)) {
                  if (newKeys.includes(trancheKey) && tranchesData[oldKey]?.poids !== undefined) {
                    poids = tranchesData[oldKey].poids / newKeys.length;
                    break;
                  }
                }
              }

              // Utiliser poids par défaut si toujours pas trouvé
              if (poids === undefined) {
                const poidsDefaut = {
                  '00_Autre': 0.05, '09h_12h': 0.25, '12h_14h': 0.20,
                  '14h_16h': 0.15, '16h_19h': 0.25, '19h_23h': 0.10,
                };
                poids = poidsDefaut[trancheKey] || 0;
              }

              const qte = Math.ceil(potentielJour * poids);
              if (qte > 0) {
                tranchesAvecDonnees.add(trancheKey);
              }
            });
          }
        }
      });

    // Filtrer les tranches qui ont des données
    const result = TRANCHES_CONFIG.filter(t => tranchesAvecDonnees.has(t.key));

    // Si aucune tranche n'a de données, afficher au moins les tranches principales
    if (result.length === 0) {
      return TRANCHES_CONFIG.filter(t =>
        ['09h_12h', '12h_14h', '14h_16h', '16h_19h'].includes(t.key)
      );
    }

    return result;
  }, [produits, configuration, frequentation, jourSelectionne, afficherToutesColonnes, modeTranches, tranchesRegroupeesDynamiques]);

  // Obtenir l'ordre des programmes pour une famille
  // Tri par défaut : par nombre de produits décroissant, "Sans cuisson" en dernier
  const getProgrammesOrdonnes = useCallback((famille, programmesDefaut, groupeFamille) => {
    const ordrePerso = ordrePersonnalise.programmes[famille];
    if (ordrePerso && ordrePerso.length > 0) {
      // Filtrer pour ne garder que les programmes présents
      const programmesPresents = ordrePerso.filter(p => programmesDefaut.includes(p));
      // Ajouter les nouveaux programmes
      const nouveauxProgrammes = programmesDefaut.filter(p => !programmesPresents.includes(p));
      return [...programmesPresents, ...nouveauxProgrammes];
    }

    // Tri par défaut : par nombre de produits décroissant, "Sans cuisson" en dernier
    return [...programmesDefaut].sort((a, b) => {
      // "Sans cuisson" toujours en dernier
      const aSansCuisson = a.toLowerCase().includes('sans cuisson') || a.toLowerCase().includes('sans programme');
      const bSansCuisson = b.toLowerCase().includes('sans cuisson') || b.toLowerCase().includes('sans programme');

      if (aSansCuisson && !bSansCuisson) return 1;
      if (!aSansCuisson && bSansCuisson) return -1;

      // Sinon, trier par nombre de produits décroissant
      const countA = groupeFamille?.parProgramme?.[a]?.length || 0;
      const countB = groupeFamille?.parProgramme?.[b]?.length || 0;
      return countB - countA;
    });
  }, [ordrePersonnalise.programmes]);

  // Vérifier si un créneau est fermé pour un jour donné (via configuration.creneaux du manager)
  // Mappe les clés PlanningJour → clés Manager pour la vérification
  const MAPPING_CRENEAUX_INVERSE = useMemo(() => {
    const map = {};
    Object.entries(MAPPING_CRENEAUX_MANAGER).forEach(([mgr, pj]) => { map[pj] = mgr; });
    return map;
  }, []);

  const isCreneauFerme = useCallback((jour, trancheKey) => {
    const creneauxJour = configuration?.creneaux?.[jour];
    if (!creneauxJour) return false;

    // Format détaillé (avant9h, 9h12h, etc.)
    const mgrKey = MAPPING_CRENEAUX_INVERSE[trancheKey];
    if (mgrKey && creneauxJour[mgrKey] !== undefined) {
      return creneauxJour[mgrKey] !== 'ouvert';
    }

    // Format regroupé (matin, apm, soir)
    // matin = 00_Autre, 09h_12h
    // apm = 12h_14h, 14h_16h, 16h_19h
    // soir = 19h_23h
    const tranchesMatin = ['00_Autre', '09h_12h'];
    const tranchesApm = ['12h_14h', '14h_16h', '16h_19h'];
    const tranchesSoir = ['19h_23h'];

    if (tranchesMatin.includes(trancheKey)) {
      return creneauxJour.matin !== 'ouvert' && creneauxJour.matin !== undefined;
    }
    if (tranchesApm.includes(trancheKey)) {
      return creneauxJour.apm !== 'ouvert' && creneauxJour.apm !== undefined;
    }
    if (tranchesSoir.includes(trancheKey)) {
      return creneauxJour.soir !== 'ouvert' && creneauxJour.soir !== undefined;
    }

    return false; // Par défaut, créneau ouvert
  }, [configuration?.creneaux, MAPPING_CRENEAUX_INVERSE]);

  // Calculer les quantités pour un produit avec historique (6 tranches)
  // modeRepartitionOverride permet de forcer le mode (pour synchroniser rendu et calcul)
  const calculerQuantites = (produit, jour, modeRepartitionOverride = null) => {
    // Utiliser repartitionJours du fichier manager si disponible
    const repartJour = produit.repartitionJours?.[jour];
    const poidsJour = frequentation?.parJour?.[jour]?.poids || (1 / 7);
    const potentielHebdo = produit.planifieManager || produit.potentielAlgo || produit.potentiel || 0;
    const potentielJour = repartJour != null
      ? Math.ceil(repartJour)
      : Math.ceil(potentielHebdo * poidsJour);

    // Historique (si disponible)
    const historiqueHebdo = produit.historiqueHebdo || produit.moyenneHebdo || 0;
    const historiqueJour = historiqueHebdo
      ? Math.ceil(historiqueHebdo * poidsJour)
      : null;

    // Utiliser le mode fourni en override, sinon calculer depuis produit.famille
    const modeRepartition = modeRepartitionOverride || configuration?.repartitionParFamille?.[produit.famille] || 'journalier';

    if (modeRepartition === 'tranches') {
      const tranchesData = frequentation?.parJour?.[jour]?.tranches || {};

      // Poids par défaut pour les 6 tranches (répartition équilibrée si pas de données)
      const poidsDefaut = {
        '00_Autre': 0.05,    // 5% avant 9h
        '09h_12h': 0.25,     // 25% matin
        '12h_14h': 0.20,     // 20% midi
        '14h_16h': 0.15,     // 15% début après-midi
        '16h_19h': 0.25,     // 25% fin après-midi
        '19h_23h': 0.10,     // 10% soir
      };

      // Fonction pour obtenir le poids d'une tranche (gère l'ancien et nouveau format)
      const getPoidsTrancheNormalized = (trancheKey) => {
        // D'abord, chercher dans le nouveau format
        if (tranchesData[trancheKey]?.poids !== undefined) {
          return tranchesData[trancheKey].poids;
        }

        // Ensuite, chercher dans l'ancien format et diviser
        for (const [oldKey, newKeys] of Object.entries(MAPPING_TRANCHES_LEGACY)) {
          if (newKeys.includes(trancheKey) && tranchesData[oldKey]?.poids !== undefined) {
            // Diviser le poids entre les tranches qui correspondent
            return tranchesData[oldKey].poids / newKeys.length;
          }
        }

        // Sinon, utiliser le poids par défaut
        return poidsDefaut[trancheKey] || 0;
      };

      // Filtrer les tranches fermées (créneaux manager)
      const tranchesOuvertes = TRANCHES.filter(k => !isCreneauFerme(jour, k));

      // Construire l'objet tranches avec les 6 créneaux
      const tranches = {};
      const NB_TRANCHES = tranchesOuvertes.length || TRANCHES.length;

      // === RÈGLE DE RÉPARTITION CDC 13.4.3 ===
      // | Quantité | Cuissons | Répartition                           |
      // |----------|----------|---------------------------------------|
      // | < 6      | 2        | 70% ouverture + 30% tranche forte     |
      // | 6-10     | 3        | 60% ouverture + 20% + 20%             |
      // | 10-20    | 3        | 40% ouverture + 30% + 30%             |
      // | > 20     | toutes   | répartition classique selon poids      |

      // Trier les tranches ouvertes par fréquentation (hors première = ouverture)
      const premiereTrancheKey = tranchesOuvertes[0]; // tranche d'ouverture
      const tranchesTriees = tranchesOuvertes.filter(k => k !== premiereTrancheKey)
        .map(key => ({ key, poids: getPoidsTrancheNormalized(key) }))
        .sort((a, b) => b.poids - a.poids); // Tri décroissant par poids

      // Initialiser toutes les tranches à 0
      TRANCHES.forEach(trancheKey => {
        tranches[trancheKey] = {
          preco: 0,
          histo: historiqueJour ? 0 : null
        };
      });

      if (potentielJour > 0 && potentielJour < 6 && tranchesOuvertes.length >= 2) {
        // < 6 : 2 cuissons — 70% ouverture + 30% tranche forte
        const trancheForte = tranchesTriees[0]?.key || tranchesOuvertes[1];
        const qteOuverture = Math.round(potentielJour * 0.7);
        const qteForte = potentielJour - qteOuverture;
        tranches[premiereTrancheKey] = { preco: qteOuverture, histo: historiqueJour ? Math.round(historiqueJour * 0.7) : null };
        tranches[trancheForte] = { preco: qteForte, histo: historiqueJour ? Math.round(historiqueJour * 0.3) : null };

      } else if (potentielJour >= 6 && potentielJour <= 10 && tranchesOuvertes.length >= 3) {
        // 6-10 : 3 cuissons — 60% ouverture + 20% + 20%
        const t1 = tranchesTriees[0]?.key || tranchesOuvertes[1];
        const t2 = tranchesTriees[1]?.key || tranchesOuvertes[2];
        const qteOuverture = Math.round(potentielJour * 0.6);
        const qteT1 = Math.round(potentielJour * 0.2);
        const qteT2 = potentielJour - qteOuverture - qteT1;
        tranches[premiereTrancheKey] = { preco: qteOuverture, histo: historiqueJour ? Math.round(historiqueJour * 0.6) : null };
        tranches[t1] = { preco: qteT1, histo: historiqueJour ? Math.round(historiqueJour * 0.2) : null };
        tranches[t2] = { preco: qteT2, histo: historiqueJour ? Math.round(historiqueJour * 0.2) : null };

      } else if (potentielJour > 10 && potentielJour <= 20 && tranchesOuvertes.length >= 3) {
        // 10-20 : 3 cuissons — 40% ouverture + 30% + 30%
        const t1 = tranchesTriees[0]?.key || tranchesOuvertes[1];
        const t2 = tranchesTriees[1]?.key || tranchesOuvertes[2];
        const qteOuverture = Math.round(potentielJour * 0.4);
        const qteT1 = Math.round(potentielJour * 0.3);
        const qteT2 = potentielJour - qteOuverture - qteT1;
        tranches[premiereTrancheKey] = { preco: qteOuverture, histo: historiqueJour ? Math.round(historiqueJour * 0.4) : null };
        tranches[t1] = { preco: qteT1, histo: historiqueJour ? Math.round(historiqueJour * 0.3) : null };
        tranches[t2] = { preco: qteT2, histo: historiqueJour ? Math.round(historiqueJour * 0.3) : null };

      } else if (potentielJour > 0) {
        // > 20 (ou fallback) : répartition classique sur toutes les tranches ouvertes
        let totalPoidsOuvertes = 0;
        tranchesOuvertes.forEach(k => { totalPoidsOuvertes += getPoidsTrancheNormalized(k); });

        let resteADistribuer = potentielJour;
        const repartition = tranchesOuvertes.map(key => {
          const poidsNorm = totalPoidsOuvertes > 0 ? getPoidsTrancheNormalized(key) / totalPoidsOuvertes : 1 / tranchesOuvertes.length;
          return { key, qteExacte: potentielJour * poidsNorm, poids: poidsNorm };
        });

        // Arrondir intelligemment pour que le total soit exact
        repartition.sort((a, b) => (b.qteExacte % 1) - (a.qteExacte % 1));
        repartition.forEach(r => {
          r.qteFinale = Math.floor(r.qteExacte);
          resteADistribuer -= r.qteFinale;
        });
        for (let i = 0; i < resteADistribuer && i < repartition.length; i++) {
          repartition[i].qteFinale += 1;
        }

        repartition.forEach(r => {
          tranches[r.key] = {
            preco: r.qteFinale,
            histo: historiqueJour ? Math.round(historiqueJour * r.poids) : null
          };
        });
      }

      return {
        mode: 'tranches',
        tranches,
        total: { preco: potentielJour, histo: historiqueJour }
      };
    } else {
      return {
        mode: 'journalier',
        journalier: { preco: potentielJour, histo: historiqueJour },
        total: { preco: potentielJour, histo: historiqueJour }
      };
    }
  };

  // Vérifier si le jour est fermé (compatible V4 horaires et V5 creneaux)
  const isJourFerme = (jour) => {
    // V4: configuration.horaires
    if (configuration?.horaires?.[jour]?.ferme === true) return true;
    // V5: configuration.creneaux — un jour est fermé si tous ses créneaux sont fermés
    const creneauxJour = configuration?.creneaux?.[jour];
    if (creneauxJour) {
      return Object.values(creneauxJour).every(etat => etat !== 'ouvert');
    }
    return false;
  };

  // Obtenir la date du jour sélectionné
  const getDateJour = (jour) => {
    if (!configuration?.dateDebut) return jour;

    const dateDebut = new Date(configuration.dateDebut);
    const indexJour = JOURS.indexOf(jour);
    const date = new Date(dateDebut);
    date.setDate(date.getDate() + indexJour);

    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Calculer les totaux par tranche pour une famille (6 tranches)
  const calculerTotauxFamille = (produitsFamille, jour, modeRepartition) => {
    if (modeRepartition === 'tranches') {
      // Initialiser les totaux pour les 6 tranches
      const totaux = {
        total: { preco: 0, histo: 0 }
      };
      TRANCHES.forEach(t => {
        totaux[t] = { preco: 0, histo: 0 };
      });

      produitsFamille.forEach(produit => {
        const qtes = calculerQuantites(produit, jour, modeRepartition);
        TRANCHES.forEach(t => {
          totaux[t].preco += qtes.tranches?.[t]?.preco || 0;
          totaux[t].histo += qtes.tranches?.[t]?.histo || 0;
        });
        totaux.total.preco += qtes.total.preco || 0;
        totaux.total.histo += qtes.total.histo || 0;
      });

      return totaux;
    } else {
      let totalPreco = 0;
      let totalHisto = 0;
      produitsFamille.forEach(produit => {
        const qtes = calculerQuantites(produit, jour, modeRepartition);
        totalPreco += qtes.total.preco || 0;
        totalHisto += qtes.total.histo || 0;
      });
      return { total: { preco: totalPreco, histo: totalHisto } };
    }
  };

  // Génère le HTML pour une fiche d'un jour donné (réutilisable)
  const genererFicheJourHTML = (jour) => {
    const jourLabel = JOURS_LABELS[JOURS.indexOf(jour)];
    const dateJour = getDateJour(jour);
    const maintenant = new Date().toLocaleDateString('fr-FR');

    // Utiliser les colonnes configurées par le manager
    const tranchesAffichees = colonnesVisibles || TRANCHES_CONFIG;
    const nbTranches = tranchesAffichees.length;

    // Helper pour obtenir la quantité d'une colonne (supporte regroupements)
    const getQteColonnePrint = (tranche, tranches) => {
      if (!tranches) return 0;
      if (tranche.sousKeys) {
        return tranche.sousKeys.reduce((sum, sk) => sum + (tranches[sk]?.preco || 0), 0);
      }
      return tranches[tranche.key]?.preco || 0;
    };

    // Construire les en-têtes des tranches
    const tranchesHeadersHTML = tranchesAffichees.map(t =>
      `<th class="double">${t.label.replace('-', '<br>')}</th>`
    ).join('');

    // Construire les lignes par famille et programme
    let lignesHTML = '';
    famillesTriees.forEach(famille => {
      const groupe = produitsParFamille[famille];
      if (!groupe) return;
      const modeRepartition = configuration?.repartitionParFamille?.[famille] || 'journalier';

      // Grouper par programme
      const programmesDefaut = Object.keys(groupe.parProgramme);
      const programmesOrdonnes = getProgrammesOrdonnes(famille, programmesDefaut, groupe);

      programmesOrdonnes.forEach(programme => {
        const produitsProgramme = groupe.parProgramme[programme];
        if (!produitsProgramme?.length) return;

        // Totaux capacité en plaques par tranche pour ce programme
        const capaciteTranches = tranchesAffichees.map(() => 0);
        let capaciteTotal = 0;

        produitsProgramme
          .filter(p => p.actif !== false)
          .forEach((produit, idx) => {
            const qtes = calculerQuantites(produit, jour, modeRepartition);
            const total = qtes.total?.preco || 0;
            if (total === 0) return; // Ne pas afficher produits à 0

            // Calcul capacité (en plaques)
            const upp = produit.unitesParPlaque || 0;

            // Format quantité avec unités si lot (ex: 2(=8))
            const formatQte = (qte) => {
              if (produit.unitesParLot && produit.unitesParLot > 1) {
                return `${qte}<sub>(=${qte * produit.unitesParLot})</sub>`;
              }
              return qte;
            };

            // Colonnes de quantités par tranche
            let tranchesColsHTML = '';
            if (modeRepartition === 'tranches') {
              tranchesAffichees.forEach((tranche, i) => {
                const qte = getQteColonnePrint(tranche, qtes.tranches);
                if (upp > 0) capaciteTranches[i] += qte / upp;
                const isDerniere = i === nbTranches - 1;
                tranchesColsHTML += `<td class="qte ${isDerniere ? 'derniere' : ''}">${formatQte(qte)}</td>`;
              });
            } else {
              // Mode journalier : une seule colonne
              tranchesAffichees.forEach((_, i) => {
                if (i === nbTranches - 1) {
                  tranchesColsHTML += `<td class="qte derniere">${formatQte(total)}</td>`;
                  if (upp > 0) capaciteTranches[i] += total / upp;
                } else {
                  tranchesColsHTML += `<td class="qte">-</td>`;
                }
              });
            }

            if (upp > 0) capaciteTotal += total / upp;

            lignesHTML += `
              <tr>
                <td class="rayon">${famille}</td>
                <td class="prog">${programme}</td>
                <td class="plu">${produit.plu || produit.itm8 || ''}</td>
                <td class="article">${produit.libellePersonnalise || produit.libelle}</td>
                <td class="remarque">${produit.remarque || ''}</td>
                ${tranchesColsHTML}
                <td class="stock"></td>
                <td class="acuire"></td>
                <td class="pertes"></td>
              </tr>
            `;
          });

        // Ligne de capacité
        if (capaciteTotal > 0) {
          const capaciteColsHTML = capaciteTranches.map((cap, i) =>
            `<td class="qte cap">${cap > 0 ? cap.toFixed(1) + ' Pl.' : '-'}</td>`
          ).join('');

          lignesHTML += `
            <tr class="capacite">
              <td class="rayon">${famille}</td>
              <td class="prog">${programme}</td>
              <td class="plu">Capacité</td>
              <td class="article"></td>
              <td class="remarque"></td>
              ${capaciteColsHTML}
              <td class="stock"></td>
              <td class="acuire total">Total: ${capaciteTotal.toFixed(1)} Pl.</td>
              <td class="pertes"></td>
            </tr>
          `;
        }
      });
    });

    return `
  <div class="page">
    <div class="header">
      <h1>Planning ${jourLabel} - S${configuration?.semaine || ''}</h1>
      <div class="info">${configuration?.magasin || ''} | ${dateJour} | Imprimé le ${maintenant}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Rayon</th>
          <th>Prog</th>
          <th>PLU</th>
          <th>Article</th>
          <th class="remarque">Remarque</th>
          ${tranchesHeadersHTML}
          <th class="double">Stock</th>
          <th>Cuire</th>
          <th>Perte</th>
        </tr>
      </thead>
      <tbody>
        ${lignesHTML}
      </tbody>
    </table>

    <div class="formula">
      <strong>📌 Dernière cuisson :</strong> À cuire = Préco (colonne jaune) − Stock rayon &nbsp;&nbsp;|&nbsp;&nbsp; Si stock ≥ préco → ne pas cuire
    </div>

    <div class="footer">
      BVP Planning V5 • ${configuration?.magasin || ''} • ${jourLabel}
    </div>
  </div>`;
  };

  // CSS commun pour les fiches
  const getFicheCSS = () => `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4 portrait; margin: 5mm; }
    body { font-family: Arial, sans-serif; font-size: 7px; line-height: 1.1; }

    .page { page-break-after: always; }
    .page:last-child { page-break-after: avoid; }

    .header { margin-bottom: 4px; }
    .header h1 { font-size: 12px; font-weight: bold; margin-bottom: 1px; }
    .header .info { font-size: 7px; color: #666; }

    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #555; padding: 1px 2px; text-align: center; vertical-align: middle; }

    th { background: #e0e0e0; font-weight: bold; font-size: 6px; }
    th.double { line-height: 1.0; font-size: 6px; }

    td.rayon { font-size: 5px; font-weight: bold; text-align: left; width: 45px; }
    td.prog { font-size: 5px; text-align: left; width: 40px; }
    td.plu { font-size: 6px; width: 30px; }
    td.article { text-align: left; font-size: 7px; font-weight: bold; }
    td.remarque { display: none; }
    th.remarque { display: none; }
    td.qte { font-size: 10px; font-weight: bold; width: 32px; }
    td.qte.derniere { background: #fff59d; }
    td.stock { width: 30px; background: #fff; }
    td.acuire { width: 30px; background: #c8e6c9; }
    td.pertes { width: 28px; background: #fff; }

    tr.capacite { background: #eeeeee; }
    tr.capacite td.plu { font-style: italic; font-size: 5px; }
    tr.capacite td.qte { font-size: 6px; font-weight: normal; }
    tr.capacite td.total { font-weight: bold; font-size: 6px; }

    sub { font-size: 5px; }

    .footer { margin-top: 4px; font-size: 6px; color: #666; text-align: center; }
    .formula { margin-top: 3px; padding: 3px 6px; background: #e3f2fd; font-size: 7px; }
    .formula strong { color: #1565c0; }
  `;

  // Imprimer le planning au format professionnel (jour actuel)
  const handlePrintPlanningPro = () => {
    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Fiche ${JOURS_LABELS[JOURS.indexOf(jourSelectionne)]} - ${configuration?.magasin || ''}</title>
  <style>${getFicheCSS()}</style>
</head>
<body>
  ${genererFicheJourHTML(jourSelectionne)}
</body>
</html>`;

    const fenetre = window.open('', '_blank', 'width=1200,height=800');
    fenetre.document.write(html);
    fenetre.document.close();
    setTimeout(() => fenetre.print(), 300);
  };

  // Imprimer la semaine complète (7 fiches, une par jour)
  const handlePrintSemaine = () => {
    // Générer les 7 fiches
    const pagesHTML = JOURS.map(jour => genererFicheJourHTML(jour)).join('\n');

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Planning Semaine ${configuration?.semaine || ''} - ${configuration?.magasin || ''}</title>
  <style>${getFicheCSS()}</style>
</head>
<body>
  ${pagesHTML}
</body>
</html>`;

    const fenetre = window.open('', '_blank', 'width=1200,height=800');
    fenetre.document.write(html);
    fenetre.document.close();
    setTimeout(() => fenetre.print(), 300);
  };

  // Composant pour l'en-tête de colonne triable
  const SortableHeader = ({ label, sortKey, align = 'left', className = '' }) => {
    const isActive = sortConfig.key === sortKey;
    return (
      <th
        onClick={() => handleSort(sortKey)}
        className={`px-4 py-3 font-medium text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors select-none ${className}`}
        title={`Cliquez pour trier par ${label}`}
      >
        <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''}`}>
          <span>{label}</span>
          {isActive ? (
            sortConfig.direction === 'asc'
              ? <ChevronUp className="w-4 h-4 text-[#ED1C24]" />
              : <ChevronDown className="w-4 h-4 text-[#ED1C24]" />
          ) : (
            <ArrowUpDown className="w-3 h-3 text-gray-400" />
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="p-4 space-y-4 print:p-2">
      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#58595B] print:text-xl">Planning du Jour</h1>
          <p className="text-gray-600 capitalize">
            📅 {getDateJour(jourSelectionne)} (S{configuration?.semaine})
          </p>
        </div>

        <div className="flex items-center gap-3 print:hidden">
          {/* Sélecteur de tri */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <span className="text-xs text-gray-500 pl-2">Tri:</span>
            <button
              onClick={() => handleSort('famille')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                sortConfig.key === 'famille'
                  ? 'bg-white shadow text-[#ED1C24]'
                  : 'text-gray-600 hover:text-[#58595B]'
              }`}
              title="Trier par famille (BOULANGERIE en premier)"
            >
              Famille
              {sortConfig.key === 'famille' && (
                sortConfig.direction === 'asc'
                  ? <ChevronUp className="w-3 h-3" />
                  : <ChevronDown className="w-3 h-3" />
              )}
            </button>
            <button
              onClick={() => handleSort('programme')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                sortConfig.key === 'programme'
                  ? 'bg-white shadow text-[#ED1C24]'
                  : 'text-gray-600 hover:text-[#58595B]'
              }`}
              title="Trier par type de cuisson"
            >
              Cuisson
              {sortConfig.key === 'programme' && (
                sortConfig.direction === 'asc'
                  ? <ChevronUp className="w-3 h-3" />
                  : <ChevronDown className="w-3 h-3" />
              )}
            </button>
          </div>

          {/* Toggle Mode simplifié / Détail */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setModeSimplifie(true)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                modeSimplifie
                  ? 'bg-white shadow text-[#8B1538]'
                  : 'text-gray-600 hover:text-[#58595B]'
              }`}
              title="Afficher uniquement les quantités"
            >
              <Eye className="w-4 h-4" />
              Simple
            </button>
            <button
              onClick={() => setModeSimplifie(false)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                !modeSimplifie
                  ? 'bg-white shadow text-[#8B1538]'
                  : 'text-gray-600 hover:text-[#58595B]'
              }`}
              title="Afficher Préco / Histo / %"
            >
              <EyeOff className="w-4 h-4" />
              Détail
            </button>
          </div>

          {/* Toggle Unités / Plaques */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setAffichage('unites')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                affichage === 'unites'
                  ? 'bg-white shadow text-[#58595B]'
                  : 'text-gray-600 hover:text-[#58595B]'
              }`}
            >
              Unités
            </button>
            <button
              onClick={() => setAffichage('plaques')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                affichage === 'plaques'
                  ? 'bg-white shadow text-[#58595B]'
                  : 'text-gray-600 hover:text-[#58595B]'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              Plaques
            </button>
          </div>

          {/* Bouton gestion des programmes */}
          <button
            onClick={() => setShowModalProgrammes(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            title="Gérer les programmes de cuisson"
          >
            <Settings className="w-4 h-4" />
            Programmes
          </button>

          {/* Boutons imprimer */}
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrintPlanningPro}
              className="flex items-center gap-2 px-4 py-2 bg-[#2E7D32] text-white rounded-l-lg hover:bg-[#2E7D32]/80 transition-colors"
              title="Imprimer fiche du jour (format professionnel)"
            >
              <Printer className="w-4 h-4" />
              Fiche
            </button>
            <button
              onClick={handlePrintSemaine}
              className="flex items-center gap-2 px-4 py-2 bg-[#8B1538] text-white rounded-r-lg hover:bg-[#8B1538]/80 transition-colors"
              title="Imprimer toute la semaine (7 fiches, une par jour)"
            >
              <Calendar className="w-4 h-4" />
              Semaine
            </button>
          </div>

          {/* Bouton réinitialiser (si personnalisé) */}
          {(ordrePersonnalise.familles || Object.keys(ordrePersonnalise.programmes).length > 0 ||
            Object.keys(sectionsOuvertes.familles).length > 0 || Object.keys(sectionsOuvertes.programmes).length > 0) && (
            <button
              onClick={reinitialiserPrefs}
              className="flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-[#ED1C24] hover:bg-gray-100 rounded-lg transition-colors"
              title="Réinitialiser l'ordre et les sections"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Barre d'info avec créneau actuel et options */}
      <div className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg print:hidden flex-wrap gap-2">
        {/* Créneau actuel */}
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#8B1538]" />
          <span className="text-sm font-medium text-[#8B1538]">
            Créneau actuel : {TRANCHES_CONFIG.find(t => t.key === trancheActuelle)?.label || trancheActuelle}
          </span>
        </div>

        {/* Options */}
        <div className="flex items-center gap-4 text-xs">
          {/* Toggle mode tranches regroupées/détaillées */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setModeTranches('regroupees')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                modeTranches === 'regroupees'
                  ? 'bg-[#8B1538] text-white'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              4 créneaux
            </button>
            <button
              onClick={() => setModeTranches('detaillees')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                modeTranches === 'detaillees'
                  ? 'bg-[#8B1538] text-white'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              6 créneaux
            </button>
          </div>

          {/* Toggle afficher toutes les colonnes (seulement en mode 6 créneaux) */}
          {modeTranches === 'detaillees' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={afficherToutesColonnes}
                onChange={(e) => setAfficherToutesColonnes(e.target.checked)}
                className="rounded border-gray-300 text-[#8B1538] focus:ring-[#8B1538]"
              />
              <span className="text-gray-600">Tous les créneaux</span>
            </label>
          )}

          {/* Info colonnes affichées */}
          <span className="text-gray-400">
            {colonnesVisibles.length} créneaux
          </span>

          {/* Info drag & drop */}
          <span className="text-gray-500 flex items-center gap-1">
            <GripVertical className="w-3 h-3" />
            Glissez pour réorganiser
          </span>
        </div>
      </div>

      {/* Légende format 3 lignes (si mode détail actif) */}
      {!modeSimplifie && showHisto && !isJourFerme(jourSelectionne) && (
        <div className="text-xs bg-gray-50 px-3 py-2 rounded-lg print:hidden flex flex-wrap gap-4 items-center">
          <span className="font-medium text-gray-600">Format 3 lignes :</span>
          <span className="text-blue-600">Préco = Prévisionnel</span>
          <span className="text-gray-600">Histo = Historique ventes</span>
          <span className="text-gray-600">% = Écart préco/histo</span>
          <span className="border-l border-gray-300 pl-4 flex gap-2">
            <span className="text-green-600">&gt;+20%</span>
            <span className="text-blue-600">+10 à +20%</span>
            <span className="text-gray-500">±10%</span>
            <span className="text-orange-600">&lt;-10%</span>
          </span>
        </div>
      )}

      {/* Sélecteur de jour */}
      <div className="flex gap-2 bg-white p-2 rounded-lg shadow print:hidden">
        {JOURS.map((jour, index) => (
          <button
            key={jour}
            onClick={() => !isJourFerme(jour) && setJourSelectionne(jour)}
            disabled={isJourFerme(jour)}
            className={`flex-1 py-3 px-2 rounded-lg text-sm font-medium transition-colors ${
              jourSelectionne === jour
                ? 'bg-[#ED1C24] text-white'
                : isJourFerme(jour)
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-50 text-[#58595B] hover:bg-gray-100'
            }`}
          >
            {JOURS_LABELS[index]}
          </button>
        ))}
      </div>

      {/* Message si jour fermé */}
      {isJourFerme(jourSelectionne) ? (
        <div className="bg-gray-100 rounded-lg p-12 text-center">
          <p className="text-gray-500 text-lg">🚫 Magasin fermé ce jour</p>
        </div>
      ) : (
        /* Tableaux par famille */
        <div className="space-y-4 print:space-y-4">
          {famillesTriees.map((famille, familleIndex) => {
            const config = FAMILLES_CONFIG[famille] || FAMILLES_CONFIG.AUTRE;
            const groupe = produitsParFamille[famille];
            const modeRepartition = configuration?.repartitionParFamille?.[famille] || 'journalier';
            const totaux = calculerTotauxFamille(groupe.tous, jourSelectionne, modeRepartition);
            const isOuverte = isFamilleOuverte(famille);
            const isDragging = dragState.type === 'famille' && dragState.dragIndex === familleIndex;
            const isHovered = dragState.type === 'famille' && dragState.hoverIndex === familleIndex;

            // Obtenir les programmes triés (par nb produits décroissant, Sans cuisson en dernier)
            const programmesDefaut = Object.keys(groupe.parProgramme);
            const programmesOrdonnes = getProgrammesOrdonnes(famille, programmesDefaut, groupe);

            return (
              <div
                key={famille}
                draggable
                onDragStart={(e) => handleDragStartFamille(e, familleIndex)}
                onDragOver={(e) => handleDragOverFamille(e, familleIndex)}
                onDrop={(e) => handleDropFamille(e, familleIndex, famillesTriees)}
                onDragEnd={handleDragEndFamille}
                className={`bg-white rounded-lg shadow overflow-hidden print:shadow-none print:border print:border-gray-300 transition-all duration-200 ${
                  isDragging ? 'opacity-50 scale-[0.98]' : ''
                } ${isHovered ? 'ring-2 ring-[#ED1C24] ring-offset-2' : ''}`}
              >
                {/* En-tête famille - Cliquable pour déplier/replier + Draggable */}
                <div
                  className={`${config.headerBg} text-white px-4 py-3 flex items-center justify-between cursor-pointer select-none hover:brightness-110 transition-all`}
                  onClick={() => toggleFamille(famille)}
                >
                  <div className="flex items-center gap-2">
                    {/* Indicateur drag */}
                    <GripVertical className="w-4 h-4 text-white/50 cursor-grab active:cursor-grabbing print:hidden" />
                    {/* Chevron ouvert/fermé */}
                    <ChevronRight className={`w-5 h-5 transition-transform duration-200 print:hidden ${isOuverte ? 'rotate-90' : ''}`} />
                    <span className="text-xl">{config.icon}</span>
                    <span className="font-semibold">{famille}</span>
                    {modeRepartition === 'journalier' && (
                      <span className="text-sm text-white/70 ml-2">(Journalier)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-white/80">
                      {groupe.tous.length} produit{groupe.tous.length > 1 ? 's' : ''}
                    </span>
                    {/* Afficher le total quand fermé */}
                    {!isOuverte && (
                      <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold">
                        Total: {totaux.total.preco}
                      </span>
                    )}
                  </div>
                </div>

                {/* Contenu - Visible seulement si ouvert */}
                {isOuverte && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <SortableHeader
                            label="Produit"
                            sortKey="produit"
                            className="text-left min-w-[200px]"
                          />
                          {/* Colonne Type (Préco/Histo/%) en mode détail seulement */}
                          {!modeSimplifie && showHisto && (
                            <SortableHeader
                              label="Type"
                              sortKey="programme"
                              align="center"
                              className="w-16"
                            />
                          )}
                          {modeRepartition === 'tranches' ? (
                            <>
                              {colonnesVisibles.map(tranche => {
                                // Pour les colonnes regroupées, vérifier si le créneau actuel est dans les sous-clés
                                const estActif = tranche.key === trancheActuelle || (tranche.sousKeys && tranche.sousKeys.includes(trancheActuelle));
                                return (
                                  <th
                                    key={tranche.key}
                                    className={`text-center px-3 py-3 font-medium min-w-[80px] transition-colors ${
                                      estActif
                                        ? 'bg-[#8B1538] text-white'
                                        : 'text-gray-600'
                                    }`}
                                  >
                                    <div className="flex flex-col items-center">
                                      <span>{tranche.label}</span>
                                      {estActif && (
                                        <span className="text-[10px] text-white/70 font-normal">En cours</span>
                                      )}
                                    </div>
                                  </th>
                                );
                              })}
                              <SortableHeader
                                label="Total"
                                sortKey="total"
                                align="center"
                                className="bg-gray-100 min-w-[80px]"
                              />
                            </>
                          ) : (
                            <SortableHeader
                              label="Quantité Jour"
                              sortKey="total"
                              align="center"
                              className="min-w-[120px]"
                            />
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {/* Grouper par programme - avec ordre personnalisé */}
                        {programmesOrdonnes.map((programme, progIndex) => {
                          const produitsProgramme = groupe.parProgramme[programme];
                          if (!produitsProgramme) return null;

                          return (
                            <ProgrammeGroup
                              key={programme}
                              programme={programme}
                              produits={produitsProgramme}
                              modeRepartition={modeRepartition}
                              jourSelectionne={jourSelectionne}
                              calculerQuantites={calculerQuantites}
                              affichage={affichage}
                              showHisto={showHisto}
                              modeSimplifie={modeSimplifie}
                              colonnesVisibles={colonnesVisibles}
                              trancheActuelle={trancheActuelle}
                              famille={famille}
                              progIndex={progIndex}
                              programmesOrdonnes={programmesOrdonnes}
                              isProgrammeOuvert={isProgrammeOuvert}
                              toggleProgramme={toggleProgramme}
                              dragState={dragState}
                              onDragStart={handleDragStartProgramme}
                              onDragOver={handleDragOverProgramme}
                              onDrop={handleDropProgramme}
                              onDragEnd={handleDragEndProgramme}
                              onEditProduit={setProduitEnEdition}
                            />
                          );
                        })}
                      </tbody>
                      {/* Ligne de totaux */}
                      <tfoot className="bg-gray-100 font-semibold">
                        <tr>
                          <td className="px-4 py-3 text-gray-700">
                            TOTAL {famille}
                          </td>
                          {/* Colonne Type vide pour les totaux (mode détail) */}
                          {!modeSimplifie && showHisto && <td></td>}
                          {modeRepartition === 'tranches' ? (
                            <>
                              {colonnesVisibles.map(tranche => {
                                const estActif = tranche.key === trancheActuelle || (tranche.sousKeys && tranche.sousKeys.includes(trancheActuelle));
                                // Calculer le total pour les colonnes regroupées
                                const totalColonne = tranche.sousKeys
                                  ? tranche.sousKeys.reduce((sum, sk) => sum + (totaux[sk]?.preco || 0), 0)
                                  : (totaux[tranche.key]?.preco || 0);
                                return (
                                  <td
                                    key={tranche.key}
                                    className={`text-center px-3 py-3 ${
                                      estActif ? 'bg-[#8B1538]/10 text-[#8B1538]' : 'text-gray-800'
                                    }`}
                                  >
                                    {totalColonne}
                                  </td>
                                );
                              })}
                              <td className="text-center px-3 py-3 bg-gray-200 text-[#8B1538]">
                                {totaux.total.preco}
                              </td>
                            </>
                          ) : (
                            <td className="text-center px-4 py-3 text-[#8B1538]">
                              {totaux.total.preco}
                            </td>
                          )}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Légende en bas */}
      {!isJourFerme(jourSelectionne) && (
        <div className="text-xs text-gray-500 text-center pt-4 print:pt-2">
          {affichage === 'plaques' ? (
            <p>💡 Quantités affichées en nombre de plaques (arrondi supérieur)</p>
          ) : (
            <p>💡 Quantités affichées en unités de vente</p>
          )}
        </div>
      )}

      {/* Modal édition de produit */}
      {produitEnEdition && (
        <ModalEditionProduit
          produit={produitEnEdition}
          programmes={programmesActuels}
          onSave={handleSaveProduit}
          onClose={() => setProduitEnEdition(null)}
        />
      )}

      {/* Modal gestion des programmes */}
      {showModalProgrammes && (
        <ModalGestionProgrammes
          programmes={programmesActuels}
          produitsParProgramme={produitsParProgramme}
          onSave={handleSaveProgrammes}
          onClose={() => setShowModalProgrammes(false)}
        />
      )}

    </div>
  );
}

/**
 * Composant pour afficher un groupe de produits par programme
 * Mode PDV: 3 lignes par produit (Préco/Histo/%)
 * Mode BVP: 1 ligne par produit
 * + Sous-total par programme en mode Plaques
 * + Section dépliable + drag & drop
 */
function ProgrammeGroup({
  programme,
  produits,
  modeRepartition,
  jourSelectionne,
  calculerQuantites,
  affichage,
  showHisto,
  modeSimplifie,
  colonnesVisibles,
  trancheActuelle,
  // Nouvelles props pour sections dépliables et drag & drop
  famille,
  progIndex,
  programmesOrdonnes,
  isProgrammeOuvert,
  toggleProgramme,
  dragState,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onEditProduit
}) {
  const showProgrammeHeader = produits.length > 0 && programme !== 'Sans programme';
  const isPlaque = affichage === 'plaques';

  // Calculer le colSpan en fonction des colonnes visibles
  const nbColonnesTranches = colonnesVisibles?.length || TRANCHES.length;
  const hasTypeColumn = !modeSimplifie && showHisto;
  const colSpan = modeRepartition === 'tranches'
    ? (hasTypeColumn ? nbColonnesTranches + 2 : nbColonnesTranches + 1)  // +1 pour produit, +1 pour total, +1 optionnel pour Type
    : (hasTypeColumn ? 3 : 2);

  // État ouvert/fermé du programme
  const isOuvert = isProgrammeOuvert ? isProgrammeOuvert(famille, programme) : true;

  // États drag & drop
  const isDragging = dragState?.type === 'programme' && dragState?.famille === famille && dragState?.dragIndex === progIndex;
  const isHovered = dragState?.type === 'programme' && dragState?.famille === famille && dragState?.hoverIndex === progIndex;

  // Calculer les totaux par programme (en plaques) pour le sous-total (6 tranches)
  const totauxProgramme = useMemo(() => {
    if (!isPlaque || modeRepartition !== 'tranches') return null;

    // Initialiser pour les 6 tranches
    const totaux = { total: 0 };
    TRANCHES.forEach(t => { totaux[t] = 0; });

    produits.forEach(produit => {
      const qtes = calculerQuantites(produit, jourSelectionne, modeRepartition);
      const unitesParPlaque = produit.unitesParPlaque || 0;

      if (unitesParPlaque > 0) {
        TRANCHES.forEach(tranche => {
          totaux[tranche] += Math.ceil((qtes.tranches?.[tranche]?.preco || 0) / unitesParPlaque);
        });
        totaux.total += Math.ceil((qtes.total?.preco || 0) / unitesParPlaque);
      }
    });

    return totaux;
  }, [produits, jourSelectionne, calculerQuantites, isPlaque, modeRepartition]);

  // Formater avec "Pl." pour le mode BVP 1 ligne
  const formatValeurTotal = (val, unitesParPlaque) => {
    if (isPlaque) {
      if (!unitesParPlaque || unitesParPlaque === 0) return '-';
      const nbPlaques = Math.ceil(val / unitesParPlaque);
      return `${nbPlaques} Pl.`;
    }
    return val;
  };

  // Calculer le total du programme pour l'affichage quand fermé
  const totalProgramme = useMemo(() => {
    let total = 0;
    produits.forEach(produit => {
      const qtes = calculerQuantites(produit, jourSelectionne, modeRepartition);
      total += qtes.total?.preco || qtes.journalier?.preco || 0;
    });
    return total;
  }, [produits, jourSelectionne, calculerQuantites, modeRepartition]);

  return (
    <>
      {/* En-tête du programme (si plusieurs produits) - Cliquable pour déplier/replier + Draggable */}
      {showProgrammeHeader && (
        <tr
          draggable
          onDragStart={(e) => onDragStart && onDragStart(e, famille, progIndex)}
          onDragOver={(e) => onDragOver && onDragOver(e, famille, progIndex)}
          onDrop={(e) => onDrop && onDrop(e, progIndex, famille, programmesOrdonnes)}
          onDragEnd={onDragEnd}
          className={`bg-gray-50/80 transition-all duration-200 ${
            isDragging ? 'opacity-50' : ''
          } ${isHovered ? 'bg-blue-100' : ''}`}
        >
          <td
            colSpan={colSpan}
            className="px-4 py-2 cursor-pointer select-none hover:bg-gray-100"
            onClick={() => toggleProgramme && toggleProgramme(famille, programme)}
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
              {/* Indicateur drag */}
              <GripVertical className="w-3 h-3 text-gray-400 cursor-grab active:cursor-grabbing print:hidden" />
              {/* Chevron */}
              <ChevronRight className={`w-4 h-4 transition-transform duration-200 print:hidden ${isOuvert ? 'rotate-90' : ''}`} />
              <span>{programme}</span>
              <span className="text-gray-400 font-normal">({produits.length})</span>
              {/* Total quand fermé */}
              {!isOuvert && (
                <span className="ml-auto bg-gray-200 px-2 py-0.5 rounded text-gray-700 font-bold normal-case">
                  Total: {totalProgramme}
                </span>
              )}
            </div>
          </td>
        </tr>
      )}

      {/* Produits - Visible seulement si ouvert ou pas de header */}
      {(isOuvert || !showProgrammeHeader) && produits.map((produit, produitIdx) => {
        const qtes = calculerQuantites(produit, jourSelectionne, modeRepartition);
        const tranchesAffichees = colonnesVisibles || TRANCHES_CONFIG;

        // Mode détail avec 3 lignes (si showHisto et pas modeSimplifie)
        if (showHisto && !modeSimplifie) {
          return (
            <Produit3Lignes
              key={`${produit.itm8 || produit.id}-${produitIdx}`}
              produit={produit}
              qtes={qtes}
              modeRepartition={modeRepartition}
              affichage={affichage}
              colonnesVisibles={tranchesAffichees}
              trancheActuelle={trancheActuelle}
            />
          );
        }

        // Mode simplifié : 1 ligne par produit (quantités uniquement)
        return (
          <tr key={`${produit.itm8 || produit.id}-${produitIdx}`} className="hover:bg-gray-50 transition-colors group">
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="font-medium text-[#58595B]">
                    {produit.libellePersonnalise || produit.libelle}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    {produit.plu && <span>PLU: {produit.plu}</span>}
                    {produit.unitesParPlaque > 0 && (
                      <span className="text-gray-400">• {produit.unitesParPlaque}/plaque</span>
                    )}
                  </div>
                </div>
                {/* Bouton édition - visible au survol */}
                <button
                  onClick={() => onEditProduit && onEditProduit(produit)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-[#8B1538] hover:bg-[#8B1538]/10 rounded-lg transition-all print:hidden"
                  title="Modifier ce produit"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            </td>
            {(() => {
              // DEBUG RENDU - premier produit seulement
              if (produitIdx === 0 && !produit._loggedRendu) {
                console.log('=== RENDU CRENEAUX ===', {
                  libelle: produit.libelle,
                  mode: qtes.mode,
                  totalPreco: qtes.total?.preco,
                  tranches: qtes.tranches,
                  tranchesAffichees: tranchesAffichees?.map(t => ({ key: t.key, sousKeys: t.sousKeys })),
                  colonnesVisiblesLength: tranchesAffichees?.length,
                });
                produit._loggedRendu = true;
              }
              return null;
            })()}
            {qtes.mode === 'tranches' ? (
              <>
                {tranchesAffichees.map(tranche => {
                  const estActif = tranche.key === trancheActuelle || (tranche.sousKeys && tranche.sousKeys.includes(trancheActuelle));
                  const qteCol = getQteColonne(tranche, qtes.tranches);
                  return (
                    <td
                      key={tranche.key}
                      className={`text-center px-3 py-3 ${estActif ? 'bg-[#8B1538]/5' : ''}`}
                    >
                      <CelluleQuantite
                        preco={qteCol.preco || 0}
                        unitesParPlaque={produit.unitesParPlaque}
                        affichage={affichage}
                        variant="tranches"
                        isActif={estActif}
                      />
                    </td>
                  );
                })}
                <td className="text-center px-3 py-3 bg-gray-50">
                  <div className="font-bold text-[#58595B]">
                    {formatValeurTotal(qtes.total.preco, produit.unitesParPlaque)}
                  </div>
                </td>
              </>
            ) : (
              <td className="text-center px-4 py-3">
                <CelluleQuantite
                  preco={qtes.journalier.preco}
                  unitesParPlaque={produit.unitesParPlaque}
                  affichage={affichage}
                  variant="journalier"
                />
              </td>
            )}
          </tr>
        );
      })}

      {/* Sous-total par programme (uniquement en mode Plaques + tranches + programme nommé + ouvert) */}
      {isOuvert && isPlaque && modeRepartition === 'tranches' && showProgrammeHeader && totauxProgramme && (
        <tr className="bg-amber-50 border-t-2 border-amber-200">
          <td className="px-4 py-2 font-semibold text-amber-800 text-sm">
            TOTAL {programme.toUpperCase()}
          </td>
          {!modeSimplifie && showHisto && <td></td>}
          {(colonnesVisibles || TRANCHES_CONFIG).map(tranche => {
            const estActif = tranche.key === trancheActuelle || (tranche.sousKeys && tranche.sousKeys.includes(trancheActuelle));
            // Calculer le total pour les colonnes regroupées
            const totalColonne = tranche.sousKeys
              ? tranche.sousKeys.reduce((sum, sk) => sum + (totauxProgramme[sk] || 0), 0)
              : (totauxProgramme[tranche.key] || 0);
            return (
              <td
                key={tranche.key}
                className={`text-center px-3 py-2 ${estActif ? 'bg-amber-200' : ''}`}
              >
                <span className="font-bold text-amber-700">
                  {totalColonne} Pl.
                </span>
              </td>
            );
          })}
          <td className="text-center px-3 py-2 bg-amber-100">
            <span className="font-bold text-amber-800">
              {totauxProgramme.total} Pl.
            </span>
          </td>
        </tr>
      )}
    </>
  );
}

/**
 * Helper pour obtenir la quantité d'une colonne (supporte les colonnes regroupées)
 */
function getQteColonne(tranche, tranches) {
  if (!tranches) return { preco: 0, histo: null };

  // Si c'est une colonne regroupée (a des sous-clés)
  if (tranche.sousKeys) {
    let totalPreco = 0;
    let totalHisto = 0;
    let hasHisto = false;

    tranche.sousKeys.forEach(sousKey => {
      const val = tranches[sousKey];
      if (val) {
        totalPreco += val.preco || 0;
        if (val.histo !== null && val.histo !== undefined) {
          totalHisto += val.histo;
          hasHisto = true;
        }
      }
    });

    return { preco: totalPreco, histo: hasHisto ? totalHisto : null };
  }

  // Sinon, retourner la valeur directe
  return tranches[tranche.key] || { preco: 0, histo: null };
}

/**
 * Composant pour afficher un produit en mode 3 lignes (Préco/Histo/%)
 */
function Produit3Lignes({ produit, qtes, modeRepartition, affichage, colonnesVisibles, trancheActuelle }) {
  const unitesParPlaque = produit.unitesParPlaque;
  const isPlaque = affichage === 'plaques' && unitesParPlaque > 0;

  // Utiliser les colonnes visibles ou toutes les tranches par défaut
  const tranchesAffichees = colonnesVisibles || TRANCHES_CONFIG;

  // Préparer les données pour chaque ligne (en utilisant les colonnes visibles)
  const lignesData = modeRepartition === 'tranches' ? {
    preco: tranchesAffichees.map(t => convertirEnPlaques(getQteColonne(t, qtes.tranches).preco || 0, unitesParPlaque, affichage)),
    histo: tranchesAffichees.map(t => {
      const qte = getQteColonne(t, qtes.tranches);
      return qte.histo ? convertirEnPlaques(qte.histo, unitesParPlaque, affichage) : null;
    }),
    ecart: tranchesAffichees.map(t => {
      const qte = getQteColonne(t, qtes.tranches);
      return calculerEcart(qte.preco || 0, qte.histo);
    }),
    totalPreco: convertirEnPlaques(qtes.total.preco, unitesParPlaque, affichage),
    totalHisto: qtes.total.histo ? convertirEnPlaques(qtes.total.histo, unitesParPlaque, affichage) : null,
    totalEcart: calculerEcart(qtes.total.preco, qtes.total.histo)
  } : {
    preco: [convertirEnPlaques(qtes.journalier.preco, unitesParPlaque, affichage)],
    histo: [qtes.journalier.histo ? convertirEnPlaques(qtes.journalier.histo, unitesParPlaque, affichage) : null],
    ecart: [calculerEcart(qtes.journalier.preco, qtes.journalier.histo)],
    totalPreco: null,
    totalHisto: null,
    totalEcart: null
  };

  // Formater avec "Pl." si nécessaire
  const formatVal = (val) => {
    if (val === null || val === '-') return '-';
    return isPlaque ? `${val} Pl.` : val;
  };

  return (
    <>
      {/* Ligne 1: Préco */}
      <tr className="border-t border-gray-200">
        <td rowSpan={3} className="px-4 py-2 align-top border-r border-gray-100">
          <div className="font-medium text-[#58595B]">
            {produit.libellePersonnalise || produit.libelle}
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
            {produit.plu && <span>PLU: {produit.plu}</span>}
            {produit.unitesParPlaque > 0 && (
              <span className="text-gray-400">• {produit.unitesParPlaque}/plaque</span>
            )}
          </div>
        </td>
        <td className="px-2 py-1 text-center">
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
            Préco
          </span>
        </td>
        {modeRepartition === 'tranches' ? (
          <>
            {tranchesAffichees.map((tranche, idx) => {
              const estActif = tranche.key === trancheActuelle;
              return (
                <td
                  key={tranche.key}
                  className={`text-center px-3 py-1 ${estActif ? 'bg-[#8B1538]/5' : ''}`}
                >
                  <CelluleSimple valeur={lignesData.preco[idx]} variant="preco" isPlaque={isPlaque} />
                </td>
              );
            })}
            <td className="text-center px-3 py-1 bg-gray-50">
              <span className="inline-block bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold text-sm min-w-[32px]">
                {formatVal(lignesData.totalPreco)}
              </span>
            </td>
          </>
        ) : (
          <td className="text-center px-4 py-1">
            <CelluleSimple valeur={lignesData.preco[0]} variant="preco" isPlaque={isPlaque} />
          </td>
        )}
      </tr>

      {/* Ligne 2: Histo */}
      <tr className="bg-gray-50/50">
        <td className="px-2 py-1 text-center">
          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
            Histo
          </span>
        </td>
        {modeRepartition === 'tranches' ? (
          <>
            {tranchesAffichees.map((tranche, idx) => {
              const estActif = tranche.key === trancheActuelle;
              return (
                <td
                  key={tranche.key}
                  className={`text-center px-3 py-1 ${estActif ? 'bg-[#8B1538]/5' : ''}`}
                >
                  <CelluleSimple valeur={lignesData.histo[idx] ?? '-'} variant="histo" isPlaque={isPlaque && lignesData.histo[idx] !== null} />
                </td>
              );
            })}
            <td className="text-center px-3 py-1 bg-gray-100">
              <span className="inline-block bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-medium text-sm min-w-[32px]">
                {formatVal(lignesData.totalHisto)}
              </span>
            </td>
          </>
        ) : (
          <td className="text-center px-4 py-1">
            <CelluleSimple valeur={lignesData.histo[0] ?? '-'} variant="histo" isPlaque={isPlaque && lignesData.histo[0] !== null} />
          </td>
        )}
      </tr>

      {/* Ligne 3: % Écart */}
      <tr className="border-b border-gray-300">
        <td className="px-2 py-1 text-center">
          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
            %
          </span>
        </td>
        {modeRepartition === 'tranches' ? (
          <>
            {tranchesAffichees.map((tranche, idx) => {
              const estActif = tranche.key === trancheActuelle;
              return (
                <td
                  key={tranche.key}
                  className={`text-center px-3 py-1 ${estActif ? 'bg-[#8B1538]/5' : ''}`}
                >
                  <CelluleEcart ecart={lignesData.ecart[idx]} />
                </td>
              );
            })}
            <td className="text-center px-3 py-1 bg-gray-100">
              <CelluleEcart ecart={lignesData.totalEcart} />
            </td>
          </>
        ) : (
          <td className="text-center px-4 py-1">
            <CelluleEcart ecart={lignesData.ecart[0]} />
          </td>
        )}
      </tr>
    </>
  );
}
