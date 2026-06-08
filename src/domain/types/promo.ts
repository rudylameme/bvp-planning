/**
 * Types — Promotions et produits exceptionnels.
 *
 * `Promotion` cible un produit existant via `IdCanonique` (opaque).
 *
 * `ProduitExceptionnel` modélise un article saisi à la main, absent de
 * l'historique des ventes. C'est l'objet qui se perd en V5 (cf. diagnostic
 * SB-0, Bug 2). En SB-2, il est nommé et typé — TS interdira par la suite
 * de le laisser hors d'un export de `DonneesMagasin`.
 *
 * Décisions :
 *   - `idCanonique?` est optionnel sur `ProduitExceptionnel` : un article
 *     totalement nouveau n'a aucune clé d'identité à l'instant de saisie
 *     (il en obtient une à l'export — règle SB-3). Champ absent ≠ undefined
 *     (exactOptionalPropertyTypes activé).
 *   - `rattacheFeuilleProduction: boolean` est la **source de vérité unique**
 *     du « doit apparaître dans le planning ». Bug 2 verrouillé par
 *     `propagerPromos` en SB-10/SB-11.
 *   - `joursVente: Jour[]` (array de jours sélectionnés) — forme domaine
 *     propre, l'UI V5 utilise un `Record<Jour, boolean>` (mappé en SB-4).
 */

import type { IdCanonique } from './produit.js';
import type { Jour } from './magasin.js';

// ============================================================================
// Promotion — promo sur un produit existant
// ============================================================================

/**
 * Promotion sur un produit déjà présent dans la gamme. La promo est
 * référencée par `IdCanonique` (clé opaque) ; les détails sont rappelés
 * pour permettre l'export indépendant de la gamme.
 *
 * Champs alignés sur la fixture v3.1 et `Etape5Communication.jsx:271-294`.
 */
export interface Promotion {
  readonly produit: IdCanonique;
  readonly libelle: string;
  readonly type: 'promo';

  readonly periodeDebut: string;         // ISO date YYYY-MM-DD
  readonly periodeFin: string;           // ISO date YYYY-MM-DD
  readonly nbJoursPromo: number;         // inclusif

  readonly prixNormalTTC: number;
  readonly prixPromoTTC: number;
  readonly prixAchatHT: number;
  readonly avantageClient: number;

  readonly margePct: number;
  readonly margeNormaleEuros: number;
  readonly margePromoEuros: number;
  readonly tauxMargePromo: number;
  readonly elasticite: number;

  readonly qteNormaleHebdo: number;
  readonly qteNormalePeriode: number;
  readonly qteObjectif: number;
  readonly qteValidee: number;
  readonly qteSupplementaire: number;
}

// ============================================================================
// Produit exceptionnel — article hors historique
// ============================================================================

/**
 * Article créé à la main par le manager dans l'onglet Promo, absent de
 * l'historique des ventes. Cas concret remonté par Aude (cf. diagnostic SB-0,
 * Bug 2) — actuellement perdu dès le passage Etape 4 → Etape 5 du wizard
 * Manager.
 *
 * Le champ-clé est `rattacheFeuilleProduction` : `true` signifie que la
 * règle `propagerPromos` (SB-10) doit injecter cet article dans la feuille
 * du jour ciblé, avec `LignePlanning.origine === 'exceptionnel'`.
 */
export interface ProduitExceptionnel {
  /** ID local (timestamp ou UUID — choisi côté UI au moment de la création). */
  readonly id: string;

  /**
   * IdCanonique attribuée par le domaine au moment du rattachement à la
   * feuille de production (règle SB-3 `construireIdCanonique`). Absent
   * tant que l'article reste un brouillon non rattaché.
   */
  readonly idCanonique?: IdCanonique;

  readonly libelle: string;
  readonly famille: string;
  readonly programme: string;

  readonly prixPromoTTC: number;
  readonly margePct: number;

  /** Quantité prévisionnelle pour chaque jour rattaché. */
  readonly qtePrevisionnelle: number;
  readonly qteValidee: number;

  /** Jours sur lesquels l'article doit apparaître dans la feuille. */
  readonly joursVente: readonly Jour[];

  /**
   * Source de vérité unique du « doit apparaître dans le planning ». Quand
   * `true`, la règle `propagerPromos` insère 1 `LignePlanning` par jour
   * de `joursVente` avec `origine: 'exceptionnel'`. Verrou bug 2.
   */
  readonly rattacheFeuilleProduction: boolean;
}
