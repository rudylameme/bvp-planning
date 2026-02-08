/**
 * Barre d'outils et en-tête du planning du jour
 * Extraite de PlanningJour.jsx - aucune modification de logique
 */
import { Printer, Grid3X3, ChevronUp, ChevronDown, ArrowUpDown, GripVertical, RotateCcw, Eye, EyeOff, Settings, Clock, Calendar } from 'lucide-react';
import { TRANCHES_CONFIG, JOURS, JOURS_LABELS } from './constants';

/**
 * Composant pour l'en-tête de colonne triable
 */
export function SortableHeader({ label, sortKey, align = 'left', className = '', sortConfig, handleSort }) {
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
}

/**
 * En-tête principal du planning avec titre et contrôles
 */
export function EnTetePlanning({
  jourSelectionne,
  getDateJour,
  configuration,
  sortConfig,
  handleSort,
  modeSimplifie,
  setModeSimplifie,
  affichage,
  setAffichage,
  setShowModalProgrammes,
  onPrintPlanningPro,
  onPrintSemaine,
  ordrePersonnalise,
  sectionsOuvertes,
  reinitialiserPrefs,
}) {
  return (
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
            onClick={onPrintPlanningPro}
            className="flex items-center gap-2 px-4 py-2 bg-[#2E7D32] text-white rounded-l-lg hover:bg-[#2E7D32]/80 transition-colors"
            title="Imprimer fiche du jour (format professionnel)"
          >
            <Printer className="w-4 h-4" />
            Fiche
          </button>
          <button
            onClick={onPrintSemaine}
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
  );
}

/**
 * Barre d'info avec créneau actuel et options de tranches
 */
export function BarreInfoCreneaux({
  trancheActuelle,
  modeTranches,
  setModeTranches,
  afficherToutesColonnes,
  setAfficherToutesColonnes,
  colonnesVisibles,
}) {
  return (
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
  );
}

/**
 * Légende format 3 lignes
 */
export function Legende3Lignes({ modeSimplifie, showHisto, isJourFerme }) {
  if (modeSimplifie || !showHisto || isJourFerme) return null;

  return (
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
  );
}

/**
 * Sélecteur de jour de la semaine
 */
export function SelecteurJour({ jourSelectionne, setJourSelectionne, isJourFerme }) {
  return (
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
  );
}
