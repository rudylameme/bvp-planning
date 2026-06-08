/**
 * Test T7 — Migration v2.1 / v3.0 → v3.1 SANS PERTE.
 *
 * Verrou structurel du déploiement futur : aucun utilisateur déjà en
 * production ne doit perdre une donnée au passage v3.1 (cf. SB-4).
 *
 * Stratégie :
 *   1. v3.0 → v3.1 : on prend la fixture golden (15 produits, 5 corrections,
 *      2 promos, 1 produit exceptionnel) qui a `schemaVersion: '3.0'`. La
 *      migration doit :
 *        - changer schemaVersion en '3.1' ;
 *        - préserver TOUS les autres champs racine et leurs sous-objets
 *          bit-pour-bit ;
 *        - garantir produitsExceptionnels et correctionsManuelles présents
 *          (déjà dans la fixture — donc inchangés).
 *   2. v2.1 → v3.1 : on prend un fichier v2.1 minimal (format historique
 *      fichierMagasin.js) et on vérifie que TOUTES les clés du fichier
 *      source apparaissent dans `_migrationSource` du résultat — garantie
 *      d'absence de perte structurelle même quand le mapping métier est
 *      skeletal.
 *
 * NB : ce test est au niveau persisté (file → file), pas via le domaine.
 * Le verrou T1 (cycle stable au 2e tour) viendra en SB-6 par-dessus, et
 * T2/T3 sur le côté domaine en SB-6/SB-11.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test, expect } from 'vitest';
import {
  detectVersion,
  migrerV21versV31,
  migrerV30versV31,
  validerFichier,
  type PersistedFileV31,
  type SourceCorrections,
} from '../../src/domain/persistence/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = resolve(__dirname, '../fixtures/MANAGER-9999-S16-2026.bvp.json');

function lireFixture(): Record<string, unknown> {
  return JSON.parse(readFileSync(FIXTURE_PATH, 'utf-8')) as Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fixture v2.1 synthétique : aligné sur services/fichierMagasin.js
// (versionFICHIER_VERSION = '2.1', defaultJoursOuverture, defaultCreneau)
// ─────────────────────────────────────────────────────────────────────────────

const FIXTURE_V21: Record<string, unknown> = {
  version: '2.1',
  dateGeneration: '2026-03-15T08:00:00.000Z',
  magasin: { nom: 'TEST V21', code: '7777' },
  joursOuverture: {
    lundi:    { matin: { statut: 'ferme_habituel' }, apresMidi: { statut: 'ferme_habituel' } },
    mardi:    { matin: { statut: 'ouvert' }, apresMidi: { statut: 'ouvert' } },
    mercredi: { matin: { statut: 'ouvert' }, apresMidi: { statut: 'ouvert' } },
    jeudi:    { matin: { statut: 'ouvert' }, apresMidi: { statut: 'ouvert' } },
    vendredi: { matin: { statut: 'ouvert' }, apresMidi: { statut: 'ouvert' } },
    samedi:   { matin: { statut: 'ouvert' }, apresMidi: { statut: 'ouvert' } },
    dimanche: { matin: { statut: 'ouvert' }, apresMidi: { statut: 'ferme_habituel' } },
  },
  frequentation: {
    courbeJournaliere: { lundi: 0, mardi: 0.15, mercredi: 0.16 },
    courbeHoraire: { matin: 0.40, midi: 0.35, apresMidi: 0.25 },
  },
  commande: {
    joursCommande: ['lundi', 'jeudi'],
    joursLivraison: ['mardi', 'vendredi'],
    stockSecurite: 0.10,
  },
  pilotageCA: {
    caTotalRayonHebdo: 12000,
    caMonitoreActuel: 6500,
    partRayonActuel: 0.54,
    objectifProgression: 5,
    afficherCAEquipes: false,
  },
  produits: [
    { id: 'p1', plu: '0001', libelle: 'PAIN', actif: true },
    { id: 'p2', plu: '0002', libelle: 'BAGUETTE', actif: true },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers comparaison « tous les champs préservés »
// ─────────────────────────────────────────────────────────────────────────────

/** Toutes les clés racine de l'objet `source` doivent figurer dans `cible`. */
function toutesClesPresentes(
  source: Readonly<Record<string, unknown>>,
  cible: Readonly<Record<string, unknown>>,
): void {
  for (const cle of Object.keys(source)) {
    expect(cible, `clé racine "${cle}" perdue à la migration`).toHaveProperty(cle);
  }
}

/** Compare un sous-arbre attendu et observé (deepEqual). */
function memesValeurs(
  attendu: unknown,
  observe: unknown,
  chemin: string,
): void {
  expect(observe, `valeur du champ "${chemin}" modifiée à la migration`).toEqual(attendu);
}

const SOURCE_VIDE: SourceCorrections = null;

// ─────────────────────────────────────────────────────────────────────────────
// Tests T7
// ─────────────────────────────────────────────────────────────────────────────

describe('T7 — migration sans perte v2.1 / v3.0 → v3.1', () => {

  test('detectVersion reconnaît v2.1, v3.0, v3.1', () => {
    expect(detectVersion(FIXTURE_V21)).toBe('2.1');
    const v30 = { ...lireFixture(), schemaVersion: '3.0' };
    expect(detectVersion(v30)).toBe('3.0');
    const v31 = { ...lireFixture(), schemaVersion: '3.1' };
    expect(detectVersion(v31)).toBe('3.1');
    expect(detectVersion({})).toBeNull();
    expect(detectVersion(null)).toBeNull();
  });

  test('detectVersion rejette les fichiers non identifiés', () => {
    expect(detectVersion('not an object')).toBeNull();
    expect(detectVersion(42)).toBeNull();
    expect(detectVersion({ schemaVersion: '99.99' })).toBeNull();
  });

  // ───────────────────────────────────────────────────────────────────────
  // 1. v3.0 → v3.1
  // ───────────────────────────────────────────────────────────────────────

  test('v3.0 → v3.1 : schemaVersion passe à "3.1" (seul champ modifié)', () => {
    const source = { ...lireFixture(), schemaVersion: '3.0' };
    const migre = migrerV30versV31(source, SOURCE_VIDE);
    expect(migre.schemaVersion).toBe('3.1');
    // Le champ schemaVersion source était '3.0', le migré '3.1' — c'est la
    // seule différence permise.
    expect(source['schemaVersion']).toBe('3.0');
  });

  test('v3.0 → v3.1 : toutes les clés racine du source sont préservées', () => {
    const source = { ...lireFixture(), schemaVersion: '3.0' };
    const migre = migrerV30versV31(source, SOURCE_VIDE);
    // schemaVersion est différent (par design) ; toutes les autres clés doivent être là
    toutesClesPresentes(source, migre as unknown as Record<string, unknown>);
  });

  test('v3.0 → v3.1 : valeurs des champs préservés inchangées (deepEqual)', () => {
    const source: Record<string, unknown> = { ...lireFixture(), schemaVersion: '3.0' };
    const migre = migrerV30versV31(source, SOURCE_VIDE) as unknown as Record<string, unknown>;
    const champsAComparer = [
      'type', 'exportDate', 'magasin', 'semaine', 'configuration',
      'promotions', 'objectifs', 'produits', 'frequentation', 'commandes',
      'personnalisationProduits', 'referentiel', 'plaquage',
      'couverturePatisserie', 'idMapping',
      'correctionsManuelles', 'produitsExceptionnels',
    ];
    for (const c of champsAComparer) {
      memesValeurs(source[c], migre[c], c);
    }
  });

  test('v3.0 → v3.1 : 15 produits, 5 corrections, 2 promos, 1 exceptionnel intacts', () => {
    const source = { ...lireFixture(), schemaVersion: '3.0' };
    const migre = migrerV30versV31(source, SOURCE_VIDE);
    expect(migre.produits).toHaveLength(15);
    const c = migre.correctionsManuelles;
    expect(c.separations).toHaveLength(1);
    expect(c.fusions).toHaveLength(2);
    expect(c.dissociations).toHaveLength(1);
    expect(c.associations).toHaveLength(1);
    expect(migre.promotions).toHaveLength(2);
    expect(migre.produitsExceptionnels).toHaveLength(1);
    expect(migre.produitsExceptionnels[0]?.nom).toBe('TARTE FRAMBOISE PROMO');
  });

  test('v3.0 sans correctionsManuelles : remplacé par défaut vide (pas d\'erreur)', () => {
    const source = { ...lireFixture(), schemaVersion: '3.0' };
    delete (source as Record<string, unknown>)['correctionsManuelles'];
    const migre = migrerV30versV31(source, SOURCE_VIDE);
    expect(migre.correctionsManuelles).toEqual({
      separations: [],
      fusions: [],
      dissociations: [],
      associations: [],
    });
  });

  test('v3.0 sans correctionsManuelles : SourceCorrections (= localStorage) consultée', () => {
    const source = { ...lireFixture(), schemaVersion: '3.0' };
    delete (source as Record<string, unknown>)['correctionsManuelles'];
    let nbAppels = 0;
    const sourceCorr: SourceCorrections = () => {
      nbAppels++;
      return {
        separations: ['LIB_LOCALSTORAGE'],
        fusions: [],
        dissociations: [],
        associations: [],
      };
    };
    const migre = migrerV30versV31(source, sourceCorr);
    expect(nbAppels).toBe(1);
    expect(migre.correctionsManuelles.separations).toEqual(['LIB_LOCALSTORAGE']);
  });

  test('v3.0 sans produitsExceptionnels : remplacé par tableau vide', () => {
    const source = { ...lireFixture(), schemaVersion: '3.0' };
    delete (source as Record<string, unknown>)['produitsExceptionnels'];
    const migre = migrerV30versV31(source, SOURCE_VIDE);
    expect(migre.produitsExceptionnels).toEqual([]);
  });

  // ───────────────────────────────────────────────────────────────────────
  // 2. v2.1 → v3.1
  // ───────────────────────────────────────────────────────────────────────

  test('v2.1 → v3.1 : schemaVersion correct + type correct', () => {
    const migre = migrerV21versV31(FIXTURE_V21, SOURCE_VIDE);
    expect(migre.schemaVersion).toBe('3.1');
    expect(migre.type).toBe('planning-archive');
  });

  test('v2.1 → v3.1 : magasin (code + nom) préservé', () => {
    const migre = migrerV21versV31(FIXTURE_V21, SOURCE_VIDE);
    expect(migre.magasin).toEqual({ code: '7777', nom: 'TEST V21' });
  });

  test('v2.1 → v3.1 : exportDate hérite de dateGeneration v2.1', () => {
    const migre = migrerV21versV31(FIXTURE_V21, SOURCE_VIDE);
    expect(migre.exportDate).toBe('2026-03-15T08:00:00.000Z');
  });

  test('v2.1 → v3.1 : SANS PERTE — _migrationSource contient bit-pour-bit le source', () => {
    const migre = migrerV21versV31(FIXTURE_V21, SOURCE_VIDE);
    expect(migre._migrationSource).toEqual(FIXTURE_V21);
    // Verrou : si on ajoute un champ exotique au v2.1, il atterrit dans
    // _migrationSource.
    const v21Augmente = { ...FIXTURE_V21, customField: { foo: 'bar', n: 42 } };
    const migreAugmente = migrerV21versV31(v21Augmente, SOURCE_VIDE);
    expect(migreAugmente._migrationSource).toEqual(v21Augmente);
    expect(migreAugmente._migrationSource?.['customField']).toEqual({ foo: 'bar', n: 42 });
  });

  test('v2.1 → v3.1 : correctionsManuelles par défaut vide + SourceCorrections consultée', () => {
    const migre = migrerV21versV31(FIXTURE_V21, SOURCE_VIDE);
    expect(migre.correctionsManuelles).toEqual({
      separations: [],
      fusions: [],
      dissociations: [],
      associations: [],
    });
    const sourceCorr: SourceCorrections = () => ({
      separations: ['UNE_SEPARATION_V21'],
      fusions: [],
      dissociations: [],
      associations: [],
    });
    const migre2 = migrerV21versV31(FIXTURE_V21, sourceCorr);
    expect(migre2.correctionsManuelles.separations).toEqual(['UNE_SEPARATION_V21']);
  });

  test('v2.1 → v3.1 : produitsExceptionnels initialisé à []', () => {
    const migre = migrerV21versV31(FIXTURE_V21, SOURCE_VIDE);
    expect(migre.produitsExceptionnels).toEqual([]);
  });

  // ───────────────────────────────────────────────────────────────────────
  // 3. validerFichier : entrée publique
  // ───────────────────────────────────────────────────────────────────────

  test('validerFichier dispatche correctement v2.1/v3.0/v3.1', () => {
    expect(validerFichier(FIXTURE_V21, SOURCE_VIDE).schemaVersion).toBe('3.1');
    const v30 = { ...lireFixture(), schemaVersion: '3.0' };
    expect(validerFichier(v30, SOURCE_VIDE).schemaVersion).toBe('3.1');
    const v31: Record<string, unknown> = { ...lireFixture(), schemaVersion: '3.1' };
    expect(validerFichier(v31, SOURCE_VIDE).schemaVersion).toBe('3.1');
  });

  test('validerFichier rejette les fichiers non reconnus', () => {
    expect(() => validerFichier({}, SOURCE_VIDE)).toThrow(/non reconnu/);
    expect(() => validerFichier(null, SOURCE_VIDE)).toThrow();
    expect(() => validerFichier('garbage', SOURCE_VIDE)).toThrow();
  });

  test('validerFichier(v3.0) = migrerV30versV31(v3.0)', () => {
    const source = { ...lireFixture(), schemaVersion: '3.0' };
    const viaValider = validerFichier(source, SOURCE_VIDE);
    const viaMigrer = migrerV30versV31(source, SOURCE_VIDE);
    expect(viaValider).toEqual(viaMigrer);
  });

  test('validerFichier(v3.1) est idempotent (validate(validate(x)) === validate(x))', () => {
    const v31: Record<string, unknown> = { ...lireFixture(), schemaVersion: '3.1' };
    const t1 = validerFichier(v31, SOURCE_VIDE);
    const t2 = validerFichier(t1 as unknown as Record<string, unknown>, SOURCE_VIDE);
    expect(t2).toEqual(t1);
  });

  // ───────────────────────────────────────────────────────────────────────
  // 4. Verrou structural : un PersistedFileV31 a TOUJOURS corrections + exceptionnels
  // ───────────────────────────────────────────────────────────────────────

  test('PersistedFileV31 a toujours correctionsManuelles ET produitsExceptionnels après validation', () => {
    // Cas pire : v3.0 minimal sans aucun des 2 champs
    const minimal = {
      schemaVersion: '3.0',
      type: 'planning-archive',
      exportDate: '2026-01-01T00:00:00.000Z',
      magasin: { code: '1234', nom: 'MIN' },
      semaine: { numero: 1, annee: 2026, dateDebut: '2026-01-05', dateFin: '2026-01-11' },
      configuration: {
        joursActifs: [], creneaux: null, regroupements: null, nbTranches: 4,
        livraisons: [], operationsSpeciales: [], repartitionParFamille: {},
      },
      promotions: [],
      objectifs: { caHistorique: 0, objectifPourcent: 0, caPrevision: 0 },
      produits: [],
      frequentation: null,
      commandes: {},
      personnalisationProduits: {},
      referentiel: { version: 'x', inclus: false, familles: [], source: 'x' },
      plaquage: null,
      couverturePatisserie: null,
      idMapping: {},
    };
    const migre: PersistedFileV31 = validerFichier(minimal, SOURCE_VIDE);
    // TS valide structurellement la présence des 2 champs ; les tests vérifient
    // qu'ils sont bien là à l'exécution.
    expect(migre.correctionsManuelles).toBeDefined();
    expect(migre.produitsExceptionnels).toBeDefined();
    expect(Array.isArray(migre.produitsExceptionnels)).toBe(true);
  });
});
