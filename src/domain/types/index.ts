/**
 * src/domain/types/ — point d'import unique des types pivots.
 *
 * Convention : importer depuis `'@/domain'` (ou chemin équivalent) plutôt
 * que de plonger dans les fichiers individuels. Cela permet :
 *   - de retrouver tous les types métier en un seul `import { … }`,
 *   - de re-ranger les fichiers sans casser les consommateurs.
 *
 * Re-exports par catégorie pour scan-lisibilité.
 */

// ── Produit ─────────────────────────────────────────────────────────────────
export type {
  IdCanonique,
  MatchRefV2,
  MethodeMatchRefV2,
  RaisonDesactivation,
  Produit,
  ProduitActif,
  ProduitInactif,
} from './produit.js';

// ── Gamme ───────────────────────────────────────────────────────────────────
export type {
  CorrectionManuelle,
  CorrectionSeparation,
  CorrectionFusion,
  CorrectionDissociation,
  CorrectionAssociation,
  RapportNettoyage,
  Gamme,
} from './gamme.js';

// ── Promo ───────────────────────────────────────────────────────────────────
export type {
  Promotion,
  ProduitExceptionnel,
} from './promo.js';

// ── Planning ────────────────────────────────────────────────────────────────
export type {
  OrigineLigne,
  LignePlanning,
  FeuilleProduction,
} from './planning.js';

// ── Magasin (et racine DonneesMagasin) ──────────────────────────────────────
export type {
  Jour,
  StatutCreneau,
  Creneau,
  Redistribution,
  JoursOuverture,
  Magasin,
  SemainePlanning,
  MetaExport,
  DonneesMagasin,
} from './magasin.js';
