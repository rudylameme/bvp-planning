/**
 * Verrous — Bug 1 « Gamme non conservée entre sessions ».
 *
 * Diagnostic SB-0 (2026-06-04) :
 *   Race condition entre 2 useEffects de MagasinContext (lignes 137-149 vs
 *   170-189). `appliquerCorrectionsManuelles` lit `localStorage` à un moment
 *   où les corrections de l'archive n'y ont pas encore été mergées.
 *
 * Corrigé en SB-6 :
 *   - `appliquerCorrectionsManuelles(produits, corrections)` reçoit les
 *     corrections en argument explicite (plus de lecture localStorage ambient).
 *   - `appliquerArchiveSurBruts(produitsBruts, archiveProduits, corrections)`
 *     idem.
 *   - `nettoyerGamme(produits, semaine, mois, refMagasin, corrections)` idem.
 *   - `MagasinContext` unifie les useEffects de gamme (1 seul, dépendant de
 *     `correctionsManuelles`) et supprime le merge `archiveCorrectionsEnAttente
 *     → localStorage` qui causait la race.
 *
 * Fixture utilisée : `tests/fixtures/MANAGER-9999-S16-2026.bvp.json`
 *   (15 produits, 5 corrections — 1 de chaque type + 1 supplémentaire,
 *    2 promos, 1 produit exceptionnel).
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test, expect } from 'vitest';

import {
  parsePersistedV31,
  serializeDonneesMagasin,
  validerFichier,
} from '../../src/domain/persistence/schemaFichierBVP.js';

// La fonction V5 modifiée en SB-6 (signature `(produits, corrections)`).
// Le JSDoc côté V5 permet à TS d'inférer le type de `corrections` sans cast.
import { appliquerCorrectionsManuelles } from '../../src/services/nettoyageGamme.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = resolve(__dirname, '../fixtures/MANAGER-9999-S16-2026.bvp.json');

function lireFixture(): Record<string, unknown> {
  return JSON.parse(readFileSync(FIXTURE_PATH, 'utf-8')) as Record<string, unknown>;
}

describe('Bug 1 — Gamme non conservée entre sessions (verrous SB-6)', () => {

  test('T1 — cycle import → export → import stable au 2e tour', () => {
    // Fixture telle quelle (label v3.0 mais shape v3.1 : 15 produits, corrections,
    // exceptionnels). Validation et migration vers v3.1.
    const fixture = lireFixture();
    const v31 = validerFichier(fixture, null);

    // Tour 1 : passage par le domaine (lossy sur les champs purement persistés).
    const tour1 = serializeDonneesMagasin(parsePersistedV31(v31));

    // Tour 2 : re-passage par le domaine sur la forme canonique tour1.
    const tour2 = serializeDonneesMagasin(parsePersistedV31(tour1));

    // STABLE — la forme canonique est atteinte au 2e tour.
    expect(tour2).toEqual(tour1);
  });

  test('T1.bis — au 2e tour, correctionsManuelles ET produitsExceptionnels survivent', () => {
    const fixture = lireFixture();
    const v31 = validerFichier(fixture, null);
    const tour1 = serializeDonneesMagasin(parsePersistedV31(v31));
    const tour2 = serializeDonneesMagasin(parsePersistedV31(tour1));

    // Les 5 corrections sont préservées.
    expect(tour2.correctionsManuelles.separations).toHaveLength(1);
    expect(tour2.correctionsManuelles.fusions).toHaveLength(2);
    expect(tour2.correctionsManuelles.dissociations).toHaveLength(1);
    expect(tour2.correctionsManuelles.associations).toHaveLength(1);

    // Le produit exceptionnel TARTE FRAMBOISE PROMO survit aux 2 cycles.
    expect(tour2.produitsExceptionnels).toHaveLength(1);
    expect(tour2.produitsExceptionnels[0]?.nom).toBe('TARTE FRAMBOISE PROMO');
    expect(tour2.produitsExceptionnels[0]?.rattacheFeuilleProduction).toBe(true);
  });

  test('T2 — appliquerCorrectionsManuelles idempotent après round-trip JSON', () => {
    const fixture = lireFixture();
    const produits = fixture['produits'] as unknown[];
    const corrections = fixture['correctionsManuelles'] as Record<string, unknown>;

    // Référence : application directe.
    const reference = appliquerCorrectionsManuelles([...produits], corrections);

    // Après round-trip JSON (simule export → import par fichier .bvp.json).
    const produitsRT = JSON.parse(JSON.stringify(produits)) as unknown[];
    const correctionsRT = JSON.parse(JSON.stringify(corrections)) as Record<string, unknown>;
    const apres = appliquerCorrectionsManuelles(produitsRT, correctionsRT);

    expect(apres).toEqual(reference);
  });

  test('T2.bis — appliquerCorrectionsManuelles SANS corrections est un no-op (verrou anti-localStorage)', () => {
    // En env Node, localStorage est absent. Si la fonction lisait encore
    // localStorage en ambient, elle planterait ou retournerait des produits
    // modifiés par hasard. Avec SB-6, sans paramètre corrections = no-op.
    const fixture = lireFixture();
    const produits = fixture['produits'] as unknown[];

    const result = appliquerCorrectionsManuelles([...produits], null);
    expect(result).toEqual(produits);

    const result2 = appliquerCorrectionsManuelles([...produits]);  // pas de 2e arg
    expect(result2).toEqual(produits);
  });

  test('T2.ter — corrections vides (tableaux à 0) : no-op aussi', () => {
    const fixture = lireFixture();
    const produits = fixture['produits'] as unknown[];

    const vides = { separations: [], fusions: [], dissociations: [], associations: [] };
    const result = appliquerCorrectionsManuelles([...produits], vides);
    expect(result).toEqual(produits);
  });
});
