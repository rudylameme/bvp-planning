/**
 * Section d'une famille dans le planning du jour
 * Extraite de PlanningJour.jsx - aucune modification de logique
 */
import { ChevronRight, GripVertical } from 'lucide-react';
import { FAMILLES_CONFIG, TRANCHES } from './constants';
import { SortableHeader } from './BarreOutils';
import ProgrammeGroup from './ProgrammeGroup';

/**
 * Ligne de totaux du pied de tableau d'une famille
 */
function TotauxFamille({
  famille,
  modeRepartition,
  totaux,
  colonnesVisibles,
  trancheActuelle,
  modeSimplifie,
  showHisto,
}) {
  return (
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
  );
}

/**
 * Section complète d'une famille (en-tête + tableau + programmes)
 */
export default function FamilleSection({
  famille,
  familleIndex,
  groupe,
  modeRepartition,
  totaux,
  isOuverte,
  toggleFamille,
  programmesOrdonnes,
  // Table props
  sortConfig,
  handleSort,
  modeSimplifie,
  showHisto,
  colonnesVisibles,
  trancheActuelle,
  jourSelectionne,
  calculerQuantites,
  affichage,
  // Programme props
  isProgrammeOuvert,
  toggleProgramme,
  dragState,
  handleDragStartFamille,
  handleDragOverFamille,
  handleDropFamille,
  handleDragEndFamille,
  handleDragStartProgramme,
  handleDragOverProgramme,
  handleDropProgramme,
  handleDragEndProgramme,
  setProduitEnEdition,
  famillesTriees,
}) {
  const config = FAMILLES_CONFIG[famille] || FAMILLES_CONFIG.AUTRE;
  const isDragging = dragState.type === 'famille' && dragState.dragIndex === familleIndex;
  const isHovered = dragState.type === 'famille' && dragState.hoverIndex === familleIndex;

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
                  sortConfig={sortConfig}
                  handleSort={handleSort}
                />
                {/* Colonne Type (Préco/Histo/%) en mode détail seulement */}
                {!modeSimplifie && showHisto && (
                  <SortableHeader
                    label="Type"
                    sortKey="programme"
                    align="center"
                    className="w-16"
                    sortConfig={sortConfig}
                    handleSort={handleSort}
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
                      sortConfig={sortConfig}
                      handleSort={handleSort}
                    />
                  </>
                ) : (
                  <SortableHeader
                    label="Quantité Jour"
                    sortKey="total"
                    align="center"
                    className="min-w-[120px]"
                    sortConfig={sortConfig}
                    handleSort={handleSort}
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
            <TotauxFamille
              famille={famille}
              modeRepartition={modeRepartition}
              totaux={totaux}
              colonnesVisibles={colonnesVisibles}
              trancheActuelle={trancheActuelle}
              modeSimplifie={modeSimplifie}
              showHisto={showHisto}
            />
          </table>
        </div>
      )}
    </div>
  );
}
