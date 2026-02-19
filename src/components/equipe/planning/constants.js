/**
 * Constantes pour le planning du jour
 * Extraites de PlanningJour.jsx - aucune modification de logique
 */

// Clé localStorage pour les préférences
export const PREFS_KEY = 'bvp_planning_jour_prefs';
// Clé localStorage pour les modifications de produits
export const PRODUITS_MODIFIES_KEY = 'bvp_produits_modifies';
// Clé localStorage pour les programmes personnalisés
export const PROGRAMMES_KEY = 'bvp_programmes_personnalises';

// Jours de la semaine
export const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
export const JOURS_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

// Configuration des 6 tranches horaires (alignée sur le fichier Excel - colonne HORAIRE)
export const TRANCHES_CONFIG = [
  { key: '00_Autre', label: 'Avant 9h', plage: '00h-09h' },
  { key: '09h_12h', label: '9h-12h', plage: '09h-12h' },
  { key: '12h_14h', label: '12h-14h', plage: '12h-14h' },
  { key: '14h_16h', label: '14h-16h', plage: '14h-16h' },
  { key: '16h_19h', label: '16h-19h', plage: '16h-19h' },
  { key: '19h_23h', label: 'Après 19h', plage: '19h-23h' },
];

// Configuration 4 tranches regroupées (format fichier Manager)
export const TRANCHES_REGROUPEES = [
  { key: 'avant12h', label: 'Matin', plage: 'Avant 12h', sousKeys: ['00_Autre', '09h_12h'] },
  { key: '12h-14h', label: '12h-14h', plage: '12h-14h', sousKeys: ['12h_14h'] },
  { key: '14h-16h', label: '14h-16h', plage: '14h-16h', sousKeys: ['14h_16h'] },
  { key: 'apres16h', label: 'Après-midi', plage: 'Après 16h', sousKeys: ['16h_19h', '19h_23h'] },
];

// Clés des tranches pour itération
export const TRANCHES = TRANCHES_CONFIG.map(t => t.key);

// Mapping ancien format → nouveau format (rétrocompatibilité)
export const MAPPING_TRANCHES_LEGACY = {
  'avant12h': ['00_Autre', '09h_12h'],
  '12h-14h': ['12h_14h'],
  '14h-16h': ['14h_16h'],
  'apres16h': ['16h_19h', '19h_23h'],
};

// Mapping des clés créneaux Manager (Etape3) → clés PlanningJour
export const MAPPING_CRENEAUX_MANAGER = {
  'avant9h': '00_Autre',
  '9h12h': '09h_12h',
  '12h14h': '12h_14h',
  '14h16h': '14h_16h',
  '16h19h': '16h_19h',
  'apres19h': '19h_23h',
};

// Regroupements Manager → tranches regroupées dynamiques
export const REGROUPEMENTS_MANAGER = {
  matin: { label: 'Matin', sousKeys: ['00_Autre', '09h_12h'] },
  apresmidi: { label: 'Après-midi', sousKeys: ['12h_14h', '14h_16h'] },
  soir: { label: 'Soir', sousKeys: ['16h_19h', '19h_23h'] },
};

// Presets d'affichage par nombre de tranches (3 à 6)
// Chaque preset regroupe les 6 tranches internes via sousKeys
export const TRANCHES_PRESETS = {
  3: [
    { key: 'matin', label: 'Matin', plage: '9h-12h', sousKeys: ['00_Autre', '09h_12h'] },
    { key: 'midi', label: 'Midi', plage: '12h-16h', sousKeys: ['12h_14h', '14h_16h'] },
    { key: 'soir', label: 'Soir', plage: '16h-23h', sousKeys: ['16h_19h', '19h_23h'] },
  ],
  4: [
    { key: 'avant12h', label: 'Matin', plage: 'Avant 12h', sousKeys: ['00_Autre', '09h_12h'] },
    { key: '12h-14h', label: '12h-14h', plage: '12h-14h', sousKeys: ['12h_14h'] },
    { key: '14h-16h', label: '14h-16h', plage: '14h-16h', sousKeys: ['14h_16h'] },
    { key: 'apres16h', label: 'Après-midi', plage: 'Après 16h', sousKeys: ['16h_19h', '19h_23h'] },
  ],
  5: [
    { key: '00_Autre', label: 'Avant 9h', plage: '00h-09h', sousKeys: ['00_Autre'] },
    { key: '09h_12h', label: '9h-12h', plage: '09h-12h', sousKeys: ['09h_12h'] },
    { key: '12h_14h', label: '12h-14h', plage: '12h-14h', sousKeys: ['12h_14h'] },
    { key: '14h_16h', label: '14h-16h', plage: '14h-16h', sousKeys: ['14h_16h'] },
    { key: 'apres16h', label: 'Après 16h', plage: '16h-23h', sousKeys: ['16h_19h', '19h_23h'] },
  ],
  6: [
    { key: '00_Autre', label: 'Avant 9h', plage: '00h-09h', sousKeys: ['00_Autre'] },
    { key: '09h_12h', label: '9h-12h', plage: '09h-12h', sousKeys: ['09h_12h'] },
    { key: '12h_14h', label: '12h-14h', plage: '12h-14h', sousKeys: ['12h_14h'] },
    { key: '14h_16h', label: '14h-16h', plage: '14h-16h', sousKeys: ['14h_16h'] },
    { key: '16h_19h', label: '16h-19h', plage: '16h-19h', sousKeys: ['16h_19h'] },
    { key: '19h_23h', label: 'Après 19h', plage: '19h-23h', sousKeys: ['19h_23h'] },
  ],
};

// Icônes et couleurs par famille
export const FAMILLES_CONFIG = {
  BOULANGERIE: { icon: '🥖', bg: 'bg-stone-700', headerBg: 'bg-stone-800' },
  VIENNOISERIE: { icon: '🥐', bg: 'bg-amber-600', headerBg: 'bg-amber-700' },
  PATISSERIE: { icon: '🍰', bg: 'bg-rose-600', headerBg: 'bg-rose-700' },
  SNACKING: { icon: '🥪', bg: 'bg-emerald-600', headerBg: 'bg-emerald-700' },
  NEGOCE: { icon: '📦', bg: 'bg-cyan-600', headerBg: 'bg-cyan-700' },
  AUTRE: { icon: '📋', bg: 'bg-slate-600', headerBg: 'bg-slate-700' }
};

// Obtenir le jour actuel (index 0-6)
export const getJourActuel = () => {
  const dayIndex = new Date().getDay();
  // En JS, dimanche = 0, on convertit pour que lundi = 0
  return dayIndex === 0 ? 6 : dayIndex - 1;
};

// Obtenir la tranche horaire actuelle selon l'heure
export const getTrancheActuelle = () => {
  const heure = new Date().getHours();
  if (heure < 9) return '00_Autre';
  if (heure < 12) return '09h_12h';
  if (heure < 14) return '12h_14h';
  if (heure < 16) return '14h_16h';
  if (heure < 19) return '16h_19h';
  return '19h_23h';
};
