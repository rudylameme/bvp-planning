/**
 * src/domain/ — couche métier typée (SB-1+).
 *
 * Règle d'or : ce dossier ne dépend NI de React, NI de Vite, NI de xlsx,
 * NI de `src/components/`, NI de `src/services/`. Les services et composants
 * importent depuis ici, jamais l'inverse.
 *
 * Sous-dossiers :
 *   - types/        : types métier (Produit, Gamme, FeuilleProduction…)
 *   - rules/        : règles métier pures (normaliserLibelle, propagationPromo…)
 *   - contracts/    : interfaces inter-modules (IPersistanceMagasin…)
 *   - persistence/  : schéma .bvp.json + adaptateurs (local, Supabase…)
 *
 * SB-1 : tous les sous-modules sont vides. Le squelette est en place pour
 * accueillir les types (SB-2) puis les règles (SB-3+).
 */

export * from './types/index.js';
export * from './rules/index.js';
export * from './contracts/index.js';
export * from './persistence/index.js';
