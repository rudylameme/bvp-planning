/**
 * Composant pour afficher un groupe de produits par programme
 * Mode PDV: 3 lignes par produit (Préco/Histo/%)
 * Mode BVP: 1 ligne par produit
 * + Sous-total par programme en mode Plaques
 * + Section dépliable + drag & drop
 *
 * Extrait de PlanningJour.jsx - aucune modification de logique
 */
import { useMemo } from 'react';
import { ChevronRight, GripVertical, Edit3 } from 'lucide-react';
import { CelluleQuantite } from './CellulesPlanning';
import { getQteColonne } from './getQteColonne';
import Produit3Lignes from './Produit3Lignes';

// Configuration des 6 tranches horaires
const TRANCHES_CONFIG = [
  { key: '00_Autre', label: 'Avant 9h', plage: '00h-09h' },
  { key: '09h_12h', label: '9h-12h', plage: '09h-12h' },
  { key: '12h_14h', label: '12h-14h', plage: '12h-14h' },
  { key: '14h_16h', label: '14h-16h', plage: '14h-16h' },
  { key: '16h_19h', label: '16h-19h', plage: '16h-19h' },
  { key: '19h_23h', label: 'Après 19h', plage: '19h-23h' },
];

const TRANCHES = TRANCHES_CONFIG.map(t => t.key);

export default function ProgrammeGroup({
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
