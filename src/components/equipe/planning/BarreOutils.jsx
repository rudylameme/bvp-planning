/**
 * Barre d'outils et en-tête du planning du jour
 * Extraite de PlanningJour.jsx - aucune modification de logique
 */
import { useState, useRef, useEffect } from 'react';
import { Printer, Grid3X3, ChevronUp, ChevronDown, ArrowUpDown, GripVertical, RotateCcw, Eye, EyeOff, Settings, Clock, Calendar, SlidersHorizontal, FileSpreadsheet } from 'lucide-react';
import { TRANCHES_CONFIG, JOURS, JOURS_LABELS } from './constants';

// Couleurs par famille (Mousquetaires theme)
const COULEURS_FAMILLES = {
  BOULANGERIE: '#FF8C42',
  VIENNOISERIE: '#4A90E2',
  PATISSERIE: '#9B59B6',
  SNACKING: '#27AE60',
  AUTRE: '#95A5A6',
};

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
            ? <ChevronUp className="w-4 h-4 text-emerald-600" />
            : <ChevronDown className="w-4 h-4 text-emerald-600" />
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
  onExportExcel,
  ordrePersonnalise,
  sectionsOuvertes,
  reinitialiserPrefs,
  modeImpression,
  setModeImpression,
  famillesImpression,
  setFamillesImpression,
  famillesDisponibles,
}) {
  // État local pour le panneau d'options d'impression
  const [showOptionsImpression, setShowOptionsImpression] = useState(false);
  const optionsRef = useRef(null);

  // Fermer le panneau au clic extérieur
  useEffect(() => {
    if (!showOptionsImpression) return;
    const handleClickOutside = (e) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target)) {
        setShowOptionsImpression(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showOptionsImpression]);

  // Helpers familles
  const toutesSelectionnees = !famillesImpression || famillesDisponibles.every(f => famillesImpression[f] !== false);
  const aucuneSelectionnee = famillesImpression && famillesDisponibles.every(f => famillesImpression[f] === false);
  const nbFamillesSelectionnees = famillesDisponibles.filter(f => !famillesImpression || famillesImpression[f] !== false).length;

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
                ? 'bg-white shadow text-emerald-600'
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
                ? 'bg-white shadow text-emerald-600'
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
                ? 'bg-white shadow text-emerald-700'
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
                ? 'bg-white shadow text-emerald-700'
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

        {/* Options impression (dropdown) + Boutons imprimer */}
        <div className="flex items-center gap-1">
          {/* Dropdown options impression */}
          <div className="relative" ref={optionsRef}>
            <button
              onClick={() => setShowOptionsImpression(!showOptionsImpression)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-l-lg text-sm font-medium transition-colors border ${
                showOptionsImpression
                  ? 'bg-white border-emerald-700 text-emerald-700 shadow'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
              title="Options d'impression"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Options</span>
              {!toutesSelectionnees && (
                <span className="text-[10px] bg-emerald-700 text-white rounded-full px-1.5 py-0.5 leading-none">
                  {nbFamillesSelectionnees}
                </span>
              )}
              <ChevronDown className={`w-3 h-3 transition-transform ${showOptionsImpression ? 'rotate-180' : ''}`} />
            </button>

            {showOptionsImpression && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[260px] p-3">
                {/* Mode d'impression */}
                <div className="mb-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mode</span>
                  <div className="flex flex-col gap-1 mt-1.5">
                    <label className="flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded hover:bg-gray-50">
                      <input
                        type="radio"
                        name="modeImpression"
                        checked={modeImpression === 'continu'}
                        onChange={() => setModeImpression('continu')}
                        className="w-3.5 h-3.5"
                        style={{ accentColor: 'emerald-700' }}
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700">Tout en continu</span>
                        <p className="text-[11px] text-gray-400">Familles enchaînées sans saut de page</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded hover:bg-gray-50">
                      <input
                        type="radio"
                        name="modeImpression"
                        checked={modeImpression === 'separe'}
                        onChange={() => setModeImpression('separe')}
                        className="w-3.5 h-3.5"
                        style={{ accentColor: 'emerald-700' }}
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700">Séparé par famille</span>
                        <p className="text-[11px] text-gray-400">Une feuille A4 par famille</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Séparateur */}
                <div className="border-t border-gray-100 mb-3"></div>

                {/* Familles à imprimer */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Familles</span>
                    <button
                      onClick={() => {
                        if (toutesSelectionnees) {
                          const allFalse = {};
                          famillesDisponibles.forEach(f => { allFalse[f] = false; });
                          setFamillesImpression(allFalse);
                        } else {
                          setFamillesImpression(null);
                        }
                      }}
                      className="text-[11px] text-emerald-700 hover:underline font-medium"
                    >
                      {toutesSelectionnees ? 'Tout désélectionner' : 'Tout sélectionner'}
                    </button>
                  </div>
                  <div className="space-y-0.5">
                    {famillesDisponibles.map(famille => {
                      const isChecked = !famillesImpression || famillesImpression[famille] !== false;
                      const color = COULEURS_FAMILLES[famille.toUpperCase()] || '#95A5A6';
                      return (
                        <label key={famille} className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              const current = famillesImpression ? { ...famillesImpression } : {};
                              current[famille] = !isChecked;
                              const allTrue = famillesDisponibles.every(f => current[f] !== false);
                              setFamillesImpression(allTrue ? null : current);
                            }}
                            className="w-3.5 h-3.5 rounded cursor-pointer"
                            style={{ accentColor: color }}
                          />
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }}></span>
                          <span className="text-sm text-gray-700">{famille}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bouton Excel */}
          <button
            onClick={onExportExcel}
            disabled={aucuneSelectionnee}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Exporter en Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>

          {/* Boutons imprimer */}
          <button
            onClick={onPrintPlanningPro}
            disabled={aucuneSelectionnee}
            className="flex items-center gap-2 px-4 py-2 bg-[#2E7D32] text-white hover:bg-[#2E7D32]/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Imprimer fiche du jour (format professionnel)"
          >
            <Printer className="w-4 h-4" />
            Fiche
          </button>
          <button
            onClick={onPrintSemaine}
            disabled={aucuneSelectionnee}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-r-lg hover:bg-emerald-700/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
            className="flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-emerald-600 hover:bg-gray-100 rounded-lg transition-colors"
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
  nbTranchesMax,
  tranchesParFamille,
}) {
  // Résumé : min-max du nombre de colonnes par famille
  const counts = Object.values(tranchesParFamille || {}).map(g => g?.length || 4);
  const min = counts.length > 0 ? Math.min(...counts) : 4;
  const max = counts.length > 0 ? Math.max(...counts) : 4;
  const resume = min === max ? `${min}T` : `${min}T – ${max}T`;

  return (
    <div className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg print:hidden flex-wrap gap-2">
      {/* Créneau actuel */}
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-emerald-700" />
        <span className="text-sm font-medium text-emerald-700">
          Créneau actuel : {TRANCHES_CONFIG.find(t => t.key === trancheActuelle)?.label || trancheActuelle}
        </span>
      </div>

      {/* Options */}
      <div className="flex items-center gap-4 text-xs">
        {/* Info tranches par famille */}
        <span className="text-gray-500 font-medium">
          Tranches : {resume}
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
              ? 'bg-emerald-600 text-white'
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
