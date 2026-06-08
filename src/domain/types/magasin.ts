/**
 * Types — Magasin, jours d'ouverture, racine `DonneesMagasin` (v3.1).
 *
 * Ce fichier porte le **verrou structurel des 2 bugs** :
 *
 *   1. `DonneesMagasin` rend `correctionsManuelles` ET `produitsExceptionnels`
 *      OBLIGATOIRES au niveau racine. TS interdira d'écrire un export sans
 *      ces 2 champs — la voie qui rendait Bug 1 (gamme perdue) et Bug 2
 *      (article promo perdu) possibles est fermée par construction.
 *
 *   2. La cible `schemaVersion: '3.1'` (vs '3.0' actuel V5) signale aux
 *      consommateurs qu'on est sur la nouvelle frontière de contrat.
 *
 * Alignement V5 : `JoursOuverture` reproduit le shape réel de
 * `defaultJoursOuverture()` dans `services/fichierMagasin.js` (matin /
 * apresMidi par jour, statut + redistribution).
 */

import type { Gamme, CorrectionManuelle } from './gamme.js';
import type { Promotion, ProduitExceptionnel } from './promo.js';
import type { FeuilleProduction } from './planning.js';

// ============================================================================
// Jours de la semaine
// ============================================================================

/**
 * Les 7 jours de la semaine, en français, en minuscules — convention V5
 * (cf. `services/fichierMagasin.js` JOURS L25).
 */
export type Jour =
  | 'lundi'
  | 'mardi'
  | 'mercredi'
  | 'jeudi'
  | 'vendredi'
  | 'samedi'
  | 'dimanche';

// ============================================================================
// Créneau et jours d'ouverture
// ============================================================================

/**
 * Statut d'un créneau (matin ou apresMidi) pour un jour donné.
 * `ferme_exceptionnel` traduit une fermeture ponctuelle (jour férié, congé) ;
 * `ferme_habituel` une fermeture récurrente (lundi typiquement).
 */
export type StatutCreneau = 'ouvert' | 'ferme_habituel' | 'ferme_exceptionnel';

/**
 * Redistribution des ventes perdues sur un créneau fermé exceptionnellement.
 * Convention V5 (cf. `services/fichierMagasin.js` defaultCreneau L13-17) :
 * 75 % vers l'autre créneau du même jour, 25 % vers le jour suivant.
 *
 * Les 2 pourcentages sont OBLIGATOIREMENT positifs et leur somme doit valoir
 * 100 (invariant non encodable en TS pur — sera vérifié par une règle SB-3).
 */
export interface Redistribution {
  readonly memeJourAutreCreneau: number;
  readonly jourSuivant: number;
}

/**
 * Un créneau (matin ou apresMidi) pour un jour donné.
 */
export interface Creneau {
  readonly statut: StatutCreneau;
  readonly redistribution: Redistribution;
}

/**
 * Jours d'ouverture du magasin — shape aligné sur
 * `defaultJoursOuverture()` (services/fichierMagasin.js L24-42).
 *
 * `Record<Jour, ...>` force la présence de TOUS les jours. Pas de jour
 * « oublié » possible.
 */
export type JoursOuverture = Readonly<Record<
  Jour,
  { readonly matin: Creneau; readonly apresMidi: Creneau }
>>;

// ============================================================================
// Magasin
// ============================================================================

/**
 * Métadonnées magasin minimales — code PDV + nom commercial.
 * Le nom d'adhérent n'est PAS modélisé ici (donnée sensible non affichée).
 */
export interface Magasin {
  readonly code: string;
  readonly nom: string;
  readonly joursOuverture: JoursOuverture;
}

// ============================================================================
// Métadonnées d'export et semaine de planning
// ============================================================================

/**
 * Semaine ISO ciblée par le planning. `dateDebut` est calculée en local
 * (pas via `toISOString()` — cf. anomalie corrigée le 23/02/2026, Etape5Communication).
 */
export interface SemainePlanning {
  readonly numero: number;          // 1-53
  readonly annee: number;
  readonly dateDebut: string;       // ISO YYYY-MM-DD (date locale)
  readonly dateFin: string;         // ISO YYYY-MM-DD (date locale)
}

/**
 * Métadonnées d'export portées par la racine `DonneesMagasin`.
 *
 * `schemaVersion: '3.1'` est la cible de la migration TS — différencie
 * l'export issu du domaine typé de l'export V5 actuel (`'3.0'`).
 */
export interface MetaExport {
  readonly schemaVersion: '3.1';
  readonly type: 'planning-archive';
  readonly exportDate: string;      // ISO 8601 complet (timezone incluse)
  readonly source: 'manager-wizard' | 'responsable-wizard' | 'test-fixture';
}

// ============================================================================
// DonneesMagasin — racine du .bvp.json v3.1
// ============================================================================

/**
 * Type racine du fichier `.bvp.json` v3.1. **Verrou structurel des 2 bugs.**
 *
 * Champs OBLIGATOIRES (cf. spec SB-2) :
 *   - `magasin`                   : métadonnées + jours d'ouverture
 *   - `semaine`                   : semaine ISO de planning
 *   - `gamme`                     : produits + corrections + rapport
 *   - `promotions`                : promos de la semaine
 *   - `produitsExceptionnels`     : articles hors historique — verrou bug 2
 *   - `feuillesProduction`        : feuilles déjà construites (cache)
 *   - `correctionsManuelles`      : miroir racine de `gamme.correctionsManuelles`
 *                                   pour parité avec la fixture v3.1 — verrou bug 1
 *   - `meta`                      : version, dates, source
 *
 * Note sur la redondance `correctionsManuelles` (racine + gamme) :
 *   La spec SB-2 demande explicitement les 2 niveaux. Source de vérité
 *   intentionnellement dupliquée — TS force la cohérence du couple à
 *   l'import/export. Une règle SB-3 vérifiera l'égalité au moment de la
 *   construction (`construireDonneesMagasin`).
 */
export interface DonneesMagasin {
  readonly meta: MetaExport;
  readonly magasin: Magasin;
  readonly semaine: SemainePlanning;
  readonly gamme: Gamme;
  readonly promotions: readonly Promotion[];
  readonly produitsExceptionnels: readonly ProduitExceptionnel[];
  readonly feuillesProduction: readonly FeuilleProduction[];
  readonly correctionsManuelles: readonly CorrectionManuelle[];
}
