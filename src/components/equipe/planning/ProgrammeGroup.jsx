/**
 * Composant pour afficher un groupe de produits par programme
 * Mode PDV: 3 lignes par produit (Préco/Histo/%)
 * Mode BVP: 1 ligne par produit
 * + Sous-total par programme toujours en Plaques (info cycles four)
 * + Section dépliable + drag & drop
 * + Masquage des produits à 0
 */
import { useMemo } from 'react';
import { ChevronRight, GripVertical, Edit3 } from 'lucide-react';
import { CelluleQuantite } from './CellulesPlanning';
import { getQteColonne } from './getQteColonne';
import Produit3Lignes from './Produit3Lignes';

// Configuration des 6 tranches horaires internes
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

  // Pré-calculer les quantités de chaque produit et filtrer ceux à 0
  const { produitsActifs, nbMasques } = useMemo(() => {
    const actifs = [];
    let masques = 0;

    produits.forEach(produit => {
      const qtes = calculerQuantites(produit, jourSelectionne, modeRepartition);
      const total = qtes.total?.preco || qtes.journalier?.preco || 0;
      if (total > 0) {
        actifs.push({ produit, qtes });
      } else {
        masques++;
      }
    });

    return { produitsActifs: actifs, nbMasques: masques };
  }, [produits, jourSelectionne, calculerQuantites, modeRepartition]);

  // Toujours afficher le header programme (y compris "Sans cuisson")
  const showProgrammeHeader = produits.length > 0;

  // Calculer les totaux par programme (TOUJOURS en plaques fractionnaires)
  // Formule : pour chaque produit, qté / parPlaque (arrondi 0.1), puis somme
  const totauxProgramme = useMemo(() => {
    if (modeRepartition !== 'tranches') return null;

    // Initialiser pour les 6 tranches internes
    const totaux = { total: 0 };
    TRANCHES.forEach(t => { totaux[t] = 0; });

    produitsActifs.forEach(({ produit, qtes }) => {
      const unitesParPlaque = produit.unitesParPlaque || 0;

      if (unitesParPlaque > 0) {
        TRANCHES.forEach(tranche => {
          const qte = qtes.tranches?.[tranche]?.preco || 0;
          if (qte > 0) {
            totaux[tranche] += Math.ceil(qte / unitesParPlaque * 10) / 10;
          }
        });
        const totalQte = qtes.total?.preco || 0;
        if (totalQte > 0) {
          totaux.total += Math.ceil(totalQte / unitesParPlaque * 10) / 10;
        }
      }
    });

    return totaux;
  }, [produitsActifs, modeRepartition]);

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
    return produitsActifs.reduce((sum, { qtes }) => {
      return sum + (qtes.total?.preco || qtes.journalier?.preco || 0);
    }, 0);
  }, [produitsActifs]);

  return (
    <>
      {/* En-tête du programme - Cliquable pour déplier/replier + Draggable */}
      {showProgrammeHeader && (
        <tr
          draggable
          onDragStart={(e) => { e.stopPropagation(); onDragStart && onDragStart(e, famille, progIndex); }}
          onDragOver={(e) => { e.stopPropagation(); e.preventDefault(); onDragOver && onDragOver(e, famille, progIndex); }}
          onDrop={(e) => { e.stopPropagation(); e.preventDefault(); onDrop && onDrop(e, progIndex, famille, programmesOrdonnes); }}
          onDragEnd={(e) => { e.stopPropagation(); onDragEnd && onDragEnd(); }}
          className={`bg-gray-50/80 transition-all duration-200 ${
            isDragging ? 'opacity-50' : ''
          } ${isHovered ? 'border-t-2 border-blue-500 bg-blue-50' : ''}`}
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
              <span className="text-gray-400 font-normal">({produitsActifs.length})</span>
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

      {/* Produits actifs - Visible seulement si ouvert ou pas de header */}
      {(isOuvert || !showProgrammeHeader) && produitsActifs.map(({ produit, qtes }, produitIdx) => {
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

      {/* Mention produits masqués */}
      {isOuvert && nbMasques > 0 && (
        <tr>
          <td colSpan={colSpan} className="px-4 py-1 text-xs text-gray-400 italic">
            +{nbMasques} produit{nbMasques > 1 ? 's' : ''} masqué{nbMasques > 1 ? 's' : ''} (préco = 0)
          </td>
        </tr>
      )}

      {/* Sous-total par programme (toujours en Pl. — info critique pour cycles four) */}
      {isOuvert && modeRepartition === 'tranches' && showProgrammeHeader && totauxProgramme && totauxProgramme.total > 0 && (
        <tr className="bg-amber-50 border-t-2 border-amber-200">
          <td className="px-4 py-2 font-semibold text-amber-800 text-sm">
            TOTAL {programme.toUpperCase()}
          </td>
          {!modeSimplifie && showHisto && <td></td>}
          {(colonnesVisibles || TRANCHES_CONFIG).map(tranche => {
            const estActif = tranche.key === trancheActuelle || (tranche.sousKeys && tranche.sousKeys.includes(trancheActuelle));
            // Calculer le total pour les colonnes regroupées via sousKeys
            const totalColonne = tranche.sousKeys
              ? tranche.sousKeys.reduce((sum, sk) => sum + (totauxProgramme[sk] || 0), 0)
              : (totauxProgramme[tranche.key] || 0);
            return (
              <td
                key={tranche.key}
                className={`text-center px-3 py-2 ${estActif ? 'bg-amber-200' : ''}`}
              >
                <span className="font-bold text-amber-700">
                  {totalColonne.toFixed(1)} Pl.
                </span>
              </td>
            );
          })}
          <td className="text-center px-3 py-2 bg-amber-100">
            <span className="font-bold text-amber-800">
              {totauxProgramme.total.toFixed(1)} Pl.
            </span>
          </td>
        </tr>
      )}
    </>
  );
}
