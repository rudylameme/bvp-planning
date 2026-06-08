/**
 * src/domain/persistence/ — schéma .bvp.json + adaptateurs.
 *
 * SB-4 : `schemaFichierBVP.ts` expose les types persistés v3.1, la migration
 * v2.1/v3.0 → v3.1 (sans perte) et le mapping persisté ↔ domaine. Pas encore
 * câblé dans le flux V5 — le branchement live arrive en SB-5 (adapter local)
 * et SB-6 (passage du contexte au domaine typé).
 *
 * Cibles ultérieures :
 *   - `adapterFichierLocal.ts`  : implémente IPersistanceMagasin via fichierMagasin.js (SB-5)
 *   - `adapterSupabase.ts`      : stub (SB-15) — branchable plus tard sans toucher le domaine
 */

export type {
  SchemaVersion,
  SourceCorrections,
  PersistedFileV31,
  PersistedProduitV31,
  PersistedPromotionV31,
  PersistedProduitExceptionnelV31,
  PersistedConfigurationV31,
  PersistedCorrectionsManuellesV31,
} from './schemaFichierBVP.js';

export {
  detectVersion,
  validerFichier,
  migrerV30versV31,
  migrerV21versV31,
  parsePersistedV31,
  serializeDonneesMagasin,
  ligneVide,
} from './schemaFichierBVP.js';

export {
  adapterFichierLocal,
  validerFichierBrut,
  obtenirCorrectionsLocales,
  sauvegarderCorrectionsLocales,
  STORAGE_KEY_CORRECTIONS,
} from './adapterFichierLocal.js';
