/**
 * Types — Planning et feuilles de production.
 *
 * `LignePlanning.origine` rend la propagation promo / exceptionnel
 * visible à l'UI : impossible d'avoir une ligne dans la feuille sans
 * savoir d'où elle vient. C'est le verrou structurel du bug 2.
 *
 * Toute fonction qui construit ou modifie une `FeuilleProduction` reçoit /
 * retourne des `readonly`. Les règles métier (SB-3+) sont des fonctions
 * pures retournant de nouvelles instances.
 */

import type { IdCanonique } from './produit.js';
import type { Jour } from './magasin.js';

// ============================================================================
// Ligne de planning
// ============================================================================

/**
 * Origine d'une ligne de la feuille de production :
 *   - `historique`   : produit issu de la gamme habituelle (ventes passées)
 *   - `promo`        : produit existant en promotion (cf. `Promotion`)
 *   - `exceptionnel` : article créé à la main et rattaché (cf. `ProduitExceptionnel`)
 *
 * Champ obligatoire — pas de ligne sans origine documentée.
 */
export type OrigineLigne = 'historique' | 'promo' | 'exceptionnel';

/**
 * Une ligne de la feuille de production pour un jour donné.
 *
 * `idCanonique` est OBLIGATOIRE : toute ligne a une identité produit, même
 * pour un exceptionnel (l'ID est attribué au rattachement, cf. SB-3
 * `construireIdCanonique`).
 */
export interface LignePlanning {
  readonly idCanonique: IdCanonique;
  readonly libelle: string;
  readonly quantitePrevue: number;
  readonly origine: OrigineLigne;
}

// ============================================================================
// Feuille de production
// ============================================================================

/**
 * Feuille de production d'un jour donné. C'est l'objet rendu par
 * `PlanningJour.jsx` côté Équipe.
 *
 * SB-2 modélise la feuille comme une simple liste de lignes. Les agrégations
 * par programme / tranche / famille sont des vues dérivées (à modéliser
 * en SB-13, hors-scope SB-2).
 */
export interface FeuilleProduction {
  readonly jour: Jour;
  readonly lignes: readonly LignePlanning[];
}
