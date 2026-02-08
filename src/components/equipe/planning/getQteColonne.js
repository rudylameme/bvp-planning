/**
 * Helper pour obtenir la quantité d'une colonne (supporte les colonnes regroupées)
 * Extrait de PlanningJour.jsx - aucune modification de logique
 */
export function getQteColonne(tranche, tranches) {
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
