/**
 * Types — Produit et identité produit.
 *
 * Pivots du domaine. Aucune logique : un type est une signature de contrat,
 * pas une implémentation.
 *
 * Décisions tranchées par la spec SB-2 :
 *   - `IdCanonique` est un type opaque (string brandé). La cascade
 *     `nat- | plu- | itm- | ean- | hash-` (cf. `services/idCanonique.js` V5)
 *     est PRÉSERVÉE mais non exposée dans le type : aucune décision
 *     PLU vs ITM8 n'est tranchée — les consommateurs utilisent
 *     `IdCanonique` comme une clé opaque.
 *   - `Produit` encode l'invariant
 *       `actif === false  ⇒  raisonDesactivation est défini`
 *     via une union discriminée par le booléen `actif`. TS interdira par
 *     construction un produit inactif sans raison.
 *   - `matchRefV2` et `aCreer` sont OBLIGATOIRES dans le type. Ce sont
 *     les 2 champs perdus en V5 au cycle export/import (diagnostic SB-0,
 *     Bug 1) — leur présence dans le type force SB-4/SB-5 à les sérialiser.
 */

// ============================================================================
// IdCanonique — string opaque (branded)
// ============================================================================

/**
 * Identité produit canonique. Type opaque : seul le domaine (SB-3+, via
 * `src/domain/rules/idCanonique.ts`) sait construire un `IdCanonique`.
 *
 * Cascade interne (cf. `services/idCanonique.js` V5) :
 *   1. `nat-{codePLU}`      — BBD nationale
 *   2. `plu-{plu}`          — référentiel magasin
 *   3. `itm-{itm8}`         — référentiel V2 ITM8
 *   4. `ean-{ean13}`        — code-barres
 *   5. `hash-{hexa}`        — fallback hash libellé + famille
 *
 * Cette cascade n'est PAS exposée dans le type — un `IdCanonique` est utilisé
 * comme clé opaque dans le reste du domaine. NE PAS trancher PLU vs ITM8.
 */
export type IdCanonique = string & { readonly __brand: 'IdCanonique' };

// ============================================================================
// Référentiel V2 — match brut + dérivés
// ============================================================================

/**
 * Méthode de matching utilisée pour rapprocher un produit du référentiel V2.
 * Sert au diagnostic (rapport de nettoyage, debug fuzzy) — non visible UI.
 */
export type MethodeMatchRefV2 =
  | 'exact-itm8'
  | 'exact-ean'
  | 'exact-libelle'
  | 'sous-chaine'
  | 'fuzzy';

/**
 * Match brut entre un produit et une entrée du référentiel V2.
 *
 * Champ historiquement PERDU au cycle export/import en V5 (cf. diagnostic
 * SB-0, Bug 1 §3) — n'est pas écrit par `Etape5Communication.jsx:245-268`,
 * seuls les dérivés `libelleRefV2` / `marqueRefV2` le sont.
 *
 * En v3.1 (cible SB-4), `matchRefV2` rejoint l'export.
 */
export interface MatchRefV2 {
  itm8: string;
  libelle: string;
  marque: string | null;
  rayon: string | null;
  /** Score du fuzzy matching ∈ [0, 1] — null si match exact. */
  score: number | null;
  methode: MethodeMatchRefV2;
}

// ============================================================================
// Raison de désactivation
// ============================================================================

/**
 * Raisons de désactivation observées en V5 (cf. `services/nettoyageGamme.js`
 * passes 1-5 + `appliquerArchiveSurBruts` L1240). Une raison `manuel` est
 * ajoutée pour les désactivations à la main par l'opérateur dans OngletGamme.
 */
export type RaisonDesactivation =
  | 'promo'
  | 'hors-saison'
  | 'doublon-fusion'
  | 'faible-ca'
  | 'absent-archive'
  | 'code-non-identifiable'
  | 'manuel';

// ============================================================================
// Produit — union discriminée par `actif`
// ============================================================================

/**
 * Champs communs à un Produit, quel que soit son statut actif/inactif.
 *
 * `matchRefV2` et `aCreer` sont obligatoires (cf. spec SB-2). Ils peuvent
 * valoir `null` (pas de match trouvé) ou `false` (pas à créer) — mais leur
 * absence du type rendrait possible la perte au cycle, ce qu'on refuse.
 */
interface ProduitBase {
  readonly idCanonique: IdCanonique;
  readonly libelle: string;
  readonly libelleNormalise: string;
  readonly caTTC: number;
  readonly qte: number;
  readonly casse: number;
  readonly tauxCasse: number;
  readonly aCreer: boolean;
  readonly matchRefV2: MatchRefV2 | null;
  readonly libelleRefV2: string | null;
  readonly marqueRefV2: string | null;
  readonly rayonRefV2: string | null;
}

/**
 * Produit actif — `raisonDesactivation` strictement `null`. TS interdit
 * `'promo'` ou toute autre raison sur un produit actif (cohérence du domaine).
 */
export interface ProduitActif extends ProduitBase {
  readonly actif: true;
  readonly raisonDesactivation: null;
}

/**
 * Produit inactif — `raisonDesactivation` obligatoire et non-null. TS rejette
 * un produit inactif sans raison documentée (le « disparu silencieux »).
 */
export interface ProduitInactif extends ProduitBase {
  readonly actif: false;
  readonly raisonDesactivation: RaisonDesactivation;
}

/**
 * Produit du domaine. Union discriminée par le booléen `actif` — usage typique :
 *   if (produit.actif) { /* TS sait : raisonDesactivation === null *\/ }
 *   else                { /* TS sait : raisonDesactivation: RaisonDesactivation *\/ }
 */
export type Produit = ProduitActif | ProduitInactif;
