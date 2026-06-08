/**
 * Types — Gamme et corrections manuelles.
 *
 * `CorrectionManuelle` est une union discriminée par `type` : TS sait que
 * `fusion` porte source+cible, `association` porte libellé+itm8, etc. Les 4
 * cas couvrent les 4 boutons d'OngletGamme V5 (Séparer / Fusionner /
 * Dissocier / Associer).
 *
 * `Gamme.correctionsManuelles` est OBLIGATOIRE (cf. spec SB-2). C'est la
 * structure qui résout par construction le bug 1 : impossible de transporter
 * une Gamme sans ses corrections (TS interdit le drop silencieux).
 */

import type { Produit } from './produit.js';

// ============================================================================
// Correction manuelle — union discriminée par `type`
// ============================================================================

/**
 * Séparation manuelle d'un produit marqué comme doublon par le nettoyage auto :
 * l'opérateur le réactive. Cible : `libelleNormalise`.
 */
export interface CorrectionSeparation {
  readonly type: 'separation';
  readonly libelleNormalise: string;
}

/**
 * Fusion manuelle d'un produit source vers une cible. Les ventes du source
 * sont reportées sur la cible ; le source est désactivé avec raison
 * `doublon-fusion`.
 */
export interface CorrectionFusion {
  readonly type: 'fusion';
  readonly source: string;        // libelleNormalise source
  readonly cible: string;         // libelleNormalise cible
}

/**
 * Dissociation manuelle : l'opérateur retire le match V2 attribué automatiquement
 * (faux positif fuzzy). Cible : `libelleNormalise`.
 */
export interface CorrectionDissociation {
  readonly type: 'dissociation';
  readonly libelleNormalise: string;
}

/**
 * Association manuelle : l'opérateur force le rattachement d'un produit à une
 * entrée précise du référentiel V2 (par ITM8).
 */
export interface CorrectionAssociation {
  readonly type: 'association';
  readonly libelleNormalise: string;
  readonly itm8: string;
}

/**
 * Union des 4 types de correction. Le discriminateur `type` permet à TS
 * de narrower correctement dans `appliquerCorrectionsManuelles` (SB-6) :
 *
 *   switch (correction.type) {
 *     case 'fusion':        // TS sait : .source, .cible
 *     case 'separation':    // TS sait : .libelleNormalise
 *     case 'dissociation':  // TS sait : .libelleNormalise
 *     case 'association':   // TS sait : .libelleNormalise, .itm8
 *   }
 *
 * Le `switch` exhaustif sera validé par TS (compile-time check) — pas de
 * branche oubliée possible.
 */
export type CorrectionManuelle =
  | CorrectionSeparation
  | CorrectionFusion
  | CorrectionDissociation
  | CorrectionAssociation;

// ============================================================================
// Rapport de nettoyage
// ============================================================================

/**
 * Statistiques produites par `nettoyerGamme` (SB-7). Minimal pour SB-2 ;
 * sera enrichi au besoin par les passes ultérieures.
 */
export interface RapportNettoyage {
  readonly nbProduitsInitiaux: number;
  readonly nbProduitsFinaux: number;
  readonly nbDesactivesPromo: number;
  readonly nbDesactivesHorsSaison: number;
  readonly nbDoublonsFusionnes: number;
  readonly nbDesactivesFaibleCA: number;
  readonly nbMatchesRefV2: number;
  readonly nbACreer: number;
  readonly nbCorrectionsManuelles: number;
}

// ============================================================================
// Gamme
// ============================================================================

/**
 * Gamme magasin pour une semaine de planning donnée.
 *
 * `correctionsManuelles` est OBLIGATOIRE : c'est l'invariant qui ferme la
 * race condition de Bug 1. Toute fonction qui accepte une `Gamme` reçoit
 * automatiquement ses corrections — pas de lecture cachée de `localStorage`.
 *
 * `semaineNumero` (1-53 ISO) et `moisPlanning` (1-12) sont conservés
 * tels qu'utilisés en V5 (cf. `nettoyerGamme(produits, semaineNumero,
 * moisPlanning, refMagasin)` à `nettoyageGamme.js:1319`).
 */
export interface Gamme {
  readonly produits: readonly Produit[];
  readonly correctionsManuelles: readonly CorrectionManuelle[];
  readonly semaineNumero: number;
  readonly moisPlanning: number;
  readonly rapportNettoyage: RapportNettoyage;
}
