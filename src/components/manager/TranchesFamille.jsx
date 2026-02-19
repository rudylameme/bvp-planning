/**
 * TranchesFamille — Configuration des tranches horaires par famille
 *
 * Chaque famille affiche une barre horizontale colorée par groupe.
 * Cliquer entre deux groupes fusionne, cliquer dans un groupe sépare.
 * Le calcul interne reste TOUJOURS sur 6 tranches.
 */
import React, { useMemo } from 'react';
import { Columns, RotateCcw } from 'lucide-react';
import { TRANCHES_DEFAUT_PAR_FAMILLE } from '../equipe/planning/useColonnesVisibles';

// Heures de début/fin de chaque tranche interne
const HEURES_DEBUT = [null, 9, 12, 14, 16, 19];
const HEURES_FIN   = [9, 12, 14, 16, 19, null];

// 5 couleurs pastel cycliques pour les groupes
const GROUP_COLORS = [
  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { bg: 'bg-sky-100',     text: 'text-sky-700' },
  { bg: 'bg-amber-100',   text: 'text-amber-700' },
  { bg: 'bg-rose-100',    text: 'text-rose-700' },
  { bg: 'bg-violet-100',  text: 'text-violet-700' },
];

// Couleurs pastilles par famille
const FAMILLES_DOT = {
  BOULANGERIE: '#FF8C42',
  VIENNOISERIE: '#4A90E2',
  PATISSERIE: '#9B59B6',
  SNACKING: '#27AE60',
  NEGOCE: '#06B6D4',
  AUTRE: '#95A5A6',
};

/** Label d'un groupe basé sur les heures bornes */
function groupLabel(group) {
  const debut = HEURES_DEBUT[group[0]];
  const fin   = HEURES_FIN[group[group.length - 1]];
  if (debut === null && fin === null) return 'Journée';
  if (debut === null) return `Av. ${fin}h`;
  if (fin === null)   return `Ap. ${debut}h`;
  return `${debut}h-${fin}h`;
}

/** Convertit les groupes en 5 booléens (bordures fusionnées) */
function groupsToBorders(groups) {
  const borders = [false, false, false, false, false];
  groups.forEach(group => {
    for (let i = 0; i < group.length - 1; i++) {
      const idx = group[i];
      if (idx >= 0 && idx < 5) borders[idx] = true;
    }
  });
  return borders;
}

/** Convertit 5 booléens en groupes d'indices */
function bordersToGroups(borders) {
  const groups = [];
  let current = [0];
  for (let i = 0; i < 5; i++) {
    if (borders[i]) {
      current.push(i + 1);
    } else {
      groups.push(current);
      current = [i + 1];
    }
  }
  groups.push(current);
  return groups;
}

/** Barre interactive pour une famille */
function BarreTranches({ famille, groups, onChange }) {
  const borders = groupsToBorders(groups);
  const nbColonnes = groups.length;

  const toggleBorder = (borderIndex) => {
    const newBorders = [...borders];
    newBorders[borderIndex] = !newBorders[borderIndex];
    onChange(bordersToGroups(newBorders));
  };

  return (
    <div className="flex items-center gap-3">
      {/* Pastille + nom */}
      <div className="flex items-center gap-2 w-36 flex-shrink-0">
        <span
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ background: FAMILLES_DOT[famille] || FAMILLES_DOT.AUTRE }}
        />
        <span className="text-sm font-medium text-gray-700 truncate">{famille}</span>
      </div>

      {/* Barre de groupes colorés */}
      <div className="flex-1 flex items-center h-10">
        {groups.map((group, gIdx) => {
          const color = GROUP_COLORS[gIdx % GROUP_COLORS.length];
          const label = groupLabel(group);

          return (
            <React.Fragment key={gIdx}>
              {/* Bloc du groupe */}
              <div
                className={`h-full rounded-lg ${color.bg} relative overflow-hidden`}
                style={{ flex: group.length }}
              >
                {/* Label centré */}
                <span className={`absolute inset-0 flex items-center justify-center ${color.text} text-[11px] font-semibold pointer-events-none z-10`}>
                  {label}
                </span>

                {/* Zones cliquables internes (pour séparer) */}
                {group.length > 1 && (
                  <div className="absolute inset-0 flex">
                    {group.map((segIdx, i) => (
                      <React.Fragment key={segIdx}>
                        <div className="flex-1" />
                        {i < group.length - 1 && (
                          <button
                            onClick={() => toggleBorder(segIdx)}
                            className="w-px h-full flex-shrink-0 border-l border-dashed border-white/60 hover:border-red-400 hover:w-1 hover:bg-red-100/50 cursor-pointer transition-all z-20"
                            title="Cliquer pour séparer"
                          />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>

              {/* Bordure entre groupes (pour fusionner) */}
              {gIdx < groups.length - 1 && (
                <button
                  onClick={() => toggleBorder(group[group.length - 1])}
                  className="w-1 h-10 flex-shrink-0 bg-white hover:bg-purple-300 cursor-pointer rounded-sm transition-colors"
                  title="Cliquer pour fusionner"
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Badge nombre de colonnes */}
      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-full min-w-[28px] text-center flex-shrink-0">
        {nbColonnes}T
      </span>
    </div>
  );
}

/** Composant principal : configuration des tranches par famille */
export default function TranchesFamille({ tranchesParFamille, onChange, familles }) {
  const tranchesComplet = useMemo(() => {
    const result = { ...tranchesParFamille };
    familles.forEach(f => {
      if (!result[f]) {
        result[f] = TRANCHES_DEFAUT_PAR_FAMILLE[f] || TRANCHES_DEFAUT_PAR_FAMILLE.AUTRE;
      }
    });
    return result;
  }, [tranchesParFamille, familles]);

  const handleChangeFamille = (famille, newGroups) => {
    onChange({ ...tranchesComplet, [famille]: newGroups });
  };

  const handleResetAll = () => {
    const reset = {};
    familles.forEach(f => {
      reset[f] = TRANCHES_DEFAUT_PAR_FAMILLE[f] || TRANCHES_DEFAUT_PAR_FAMILLE.AUTRE;
    });
    onChange(reset);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Columns className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-800">Tranches horaires par famille</h3>
            <p className="text-sm text-gray-500">
              Cliquez entre 2 groupes pour fusionner, dans un groupe pour séparer
            </p>
          </div>
        </div>
        <button
          onClick={handleResetAll}
          className="p-2 text-gray-400 hover:text-[#8B1538] hover:bg-gray-100 rounded-lg transition-colors"
          title="Réinitialiser les défauts"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Barres par famille */}
      <div className="space-y-3">
        {familles.map(famille => (
          <BarreTranches
            key={famille}
            famille={famille}
            groups={tranchesComplet[famille] || TRANCHES_DEFAUT_PAR_FAMILLE.AUTRE}
            onChange={(newGroups) => handleChangeFamille(famille, newGroups)}
          />
        ))}
      </div>

      {/* Timeline de graduation commune */}
      <div className="flex items-center gap-3 mt-2">
        {/* Espace pour le label famille (alignement) */}
        <div className="w-36 flex-shrink-0" />

        {/* Graduation */}
        <div className="flex-1 relative h-6">
          {/* Ligne horizontale de base */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gray-300" />

          {/* 5 traits verticaux aux bordures internes */}
          {[1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              className="absolute top-0 flex flex-col items-center"
              style={{ left: `${(i / 6) * 100}%`, transform: 'translateX(-50%)' }}
            >
              <div className="w-px h-3 bg-gray-400" />
              <span className="text-[10px] text-gray-500 mt-0.5 whitespace-nowrap">
                {['9h', '12h', '14h', '16h', '19h'][i - 1]}
              </span>
            </div>
          ))}

          {/* Bornes gauche et droite */}
          <div className="absolute top-0 left-0 flex flex-col items-center" style={{ transform: 'translateX(-50%)' }}>
            <div className="w-px h-2 bg-gray-300" />
          </div>
          <div className="absolute top-0 right-0 flex flex-col items-center" style={{ transform: 'translateX(50%)' }}>
            <div className="w-px h-2 bg-gray-300" />
          </div>
        </div>

        {/* Espace pour le badge (alignement) */}
        <div className="min-w-[28px] flex-shrink-0" />
      </div>
    </div>
  );
}
