/**
 * Composant pour afficher un produit en mode 3 lignes (Préco/Histo/%)
 * Extrait de PlanningJour.jsx - aucune modification de logique
 */
import { CelluleSimple, CelluleEcart, convertirEnPlaques, calculerEcart } from './CellulesPlanning';
import { getQteColonne } from './getQteColonne';

// Configuration des 6 tranches horaires (copie locale pour référence)
const TRANCHES_CONFIG = [
  { key: '00_Autre', label: 'Avant 9h', plage: '00h-09h' },
  { key: '09h_12h', label: '9h-12h', plage: '09h-12h' },
  { key: '12h_14h', label: '12h-14h', plage: '12h-14h' },
  { key: '14h_16h', label: '14h-16h', plage: '14h-16h' },
  { key: '16h_19h', label: '16h-19h', plage: '16h-19h' },
  { key: '19h_23h', label: 'Après 19h', plage: '19h-23h' },
];

export default function Produit3Lignes({ produit, qtes, modeRepartition, affichage, colonnesVisibles, trancheActuelle }) {
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
