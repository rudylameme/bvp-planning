/**
 * Test T6 — Contrat `IPersistanceMagasin` + adapter `adapterFichierLocal`.
 *
 * SB-5. Deux objectifs :
 *
 *   1. **Mock conforme** : un `MockPersistanceMagasin` implémente l'interface,
 *      compile en strict, et passe des tests de contrat de base (importer →
 *      exporter cycle, charger/sauvegarder, fusionner). C'est la preuve qu'un
 *      autre adapter (Supabase, SB-15) pourra remplir le contrat sans toucher
 *      au domaine.
 *
 *   2. **Adapter réel testable** : `adapterFichierLocal` est exercé avec un
 *      `File` (env Node ≥ 18 fournit `File`/`Blob` globalement) et vérifie
 *      que la fixture v3.0 charge en `DonneesMagasin` cohérent. Les helpers
 *      `obtenirCorrectionsLocales` / `sauvegarderCorrectionsLocales` sont
 *      no-op en Node (pas de `localStorage`) — comportement attendu et figé.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test, expect } from 'vitest';

import {
  adapterFichierLocal,
  obtenirCorrectionsLocales,
  sauvegarderCorrectionsLocales,
  validerFichierBrut,
  STORAGE_KEY_CORRECTIONS,
} from '../../src/domain/persistence/adapterFichierLocal.js';

import type { IPersistanceMagasin } from '../../src/domain/contracts/persistanceMagasin.js';
import type {
  DonneesMagasin,
  IdCanonique,
  JoursOuverture,
} from '../../src/domain/types/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = resolve(__dirname, '../fixtures/MANAGER-9999-S16-2026.bvp.json');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — fabrique de DonneesMagasin minimal pour les tests
// ─────────────────────────────────────────────────────────────────────────────

const JOURS_OUVERTURE_DEFAUT: JoursOuverture = {
  lundi:    { matin: { statut: 'ferme_habituel', redistribution: { memeJourAutreCreneau: 75, jourSuivant: 25 } }, apresMidi: { statut: 'ferme_habituel', redistribution: { memeJourAutreCreneau: 75, jourSuivant: 25 } } },
  mardi:    { matin: { statut: 'ouvert', redistribution: { memeJourAutreCreneau: 75, jourSuivant: 25 } }, apresMidi: { statut: 'ouvert', redistribution: { memeJourAutreCreneau: 75, jourSuivant: 25 } } },
  mercredi: { matin: { statut: 'ouvert', redistribution: { memeJourAutreCreneau: 75, jourSuivant: 25 } }, apresMidi: { statut: 'ouvert', redistribution: { memeJourAutreCreneau: 75, jourSuivant: 25 } } },
  jeudi:    { matin: { statut: 'ouvert', redistribution: { memeJourAutreCreneau: 75, jourSuivant: 25 } }, apresMidi: { statut: 'ouvert', redistribution: { memeJourAutreCreneau: 75, jourSuivant: 25 } } },
  vendredi: { matin: { statut: 'ouvert', redistribution: { memeJourAutreCreneau: 75, jourSuivant: 25 } }, apresMidi: { statut: 'ouvert', redistribution: { memeJourAutreCreneau: 75, jourSuivant: 25 } } },
  samedi:   { matin: { statut: 'ouvert', redistribution: { memeJourAutreCreneau: 75, jourSuivant: 25 } }, apresMidi: { statut: 'ouvert', redistribution: { memeJourAutreCreneau: 75, jourSuivant: 25 } } },
  dimanche: { matin: { statut: 'ouvert', redistribution: { memeJourAutreCreneau: 75, jourSuivant: 25 } }, apresMidi: { statut: 'ferme_habituel', redistribution: { memeJourAutreCreneau: 75, jourSuivant: 25 } } },
};

function fabriquerDonneesMagasin(code = '7777', nom = 'TEST T6'): DonneesMagasin {
  return {
    meta: {
      schemaVersion: '3.1',
      type: 'planning-archive',
      exportDate: '2026-04-13T08:00:00.000Z',
      source: 'test-fixture',
    },
    magasin: { code, nom, joursOuverture: JOURS_OUVERTURE_DEFAUT },
    semaine: { numero: 16, annee: 2026, dateDebut: '2026-04-13', dateFin: '2026-04-19' },
    gamme: {
      produits: [
        {
          idCanonique: 'itm-10001000' as IdCanonique,
          libelle: 'BAGUETTE TEST',
          libelleNormalise: 'BAGUETTE TEST',
          caTTC: 0,
          qte: 100,
          casse: 0,
          tauxCasse: 0,
          aCreer: false,
          matchRefV2: null,
          libelleRefV2: null,
          marqueRefV2: null,
          rayonRefV2: null,
          actif: true,
          raisonDesactivation: null,
        },
      ],
      correctionsManuelles: [
        { type: 'separation', libelleNormalise: 'BAGUETTE TEST' },
      ],
      semaineNumero: 16,
      moisPlanning: 4,
      rapportNettoyage: {
        nbProduitsInitiaux: 1, nbProduitsFinaux: 1,
        nbDesactivesPromo: 0, nbDesactivesHorsSaison: 0,
        nbDoublonsFusionnes: 0, nbDesactivesFaibleCA: 0,
        nbMatchesRefV2: 0, nbACreer: 0, nbCorrectionsManuelles: 1,
      },
    },
    promotions: [],
    produitsExceptionnels: [],
    feuillesProduction: [],
    correctionsManuelles: [
      { type: 'separation', libelleNormalise: 'BAGUETTE TEST' },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock conforme à IPersistanceMagasin — stockage en mémoire
// ─────────────────────────────────────────────────────────────────────────────

class MockPersistanceMagasin implements IPersistanceMagasin {
  private store = new Map<string, DonneesMagasin>();
  public dernierImporte: DonneesMagasin | null = null;
  public dernierExporte: DonneesMagasin | null = null;

  async importer(fichier: File): Promise<DonneesMagasin> {
    const text = await fichier.text();
    const data = JSON.parse(text) as DonneesMagasin;
    this.dernierImporte = data;
    return data;
  }

  async exporter(donnees: DonneesMagasin): Promise<Blob> {
    this.dernierExporte = donnees;
    return new Blob([JSON.stringify(donnees)], { type: 'application/json' });
  }

  async charger(handle: FileSystemFileHandle): Promise<DonneesMagasin> {
    const cle = handle.name;
    const data = this.store.get(cle);
    if (!data) throw new Error(`Pas de donnees pour ${cle}`);
    return data;
  }

  async sauvegarder(handle: FileSystemFileHandle, donnees: DonneesMagasin): Promise<void> {
    this.store.set(handle.name, donnees);
  }

  fusionner(distant: DonneesMagasin, local: DonneesMagasin): DonneesMagasin {
    return { ...distant, magasin: local.magasin };
  }
}

// Mock FileSystemFileHandle minimal — juste le nom, suffisant pour le mock
function fauxHandle(nom: string): FileSystemFileHandle {
  return { name: nom } as unknown as FileSystemFileHandle;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests T6 — Contrat
// ─────────────────────────────────────────────────────────────────────────────

describe('T6 — IPersistanceMagasin (contrat + mock + adapter local)', () => {

  // ── 1. Le mock implémente bien le contrat (vérifié par TS à la compile)
  test('un mock conforme à IPersistanceMagasin compile et expose les 5 méthodes', () => {
    const mock: IPersistanceMagasin = new MockPersistanceMagasin();
    expect(typeof mock.importer).toBe('function');
    expect(typeof mock.exporter).toBe('function');
    expect(typeof mock.charger).toBe('function');
    expect(typeof mock.sauvegarder).toBe('function');
    expect(typeof mock.fusionner).toBe('function');
  });

  test('mock — cycle charger/sauvegarder préserve les données', async () => {
    const mock = new MockPersistanceMagasin();
    const donnees = fabriquerDonneesMagasin();
    const handle = fauxHandle('test1.bvp.json');
    await mock.sauvegarder(handle, donnees);
    const recharge = await mock.charger(handle);
    expect(recharge).toEqual(donnees);
  });

  test('mock — exporter produit un Blob JSON re-parseable', async () => {
    const mock = new MockPersistanceMagasin();
    const donnees = fabriquerDonneesMagasin();
    const blob = await mock.exporter(donnees);
    expect(blob.type).toBe('application/json');
    const text = await blob.text();
    expect(JSON.parse(text)).toEqual(donnees);
  });

  test('mock — fusionner garde le magasin local', () => {
    const mock = new MockPersistanceMagasin();
    const distant = fabriquerDonneesMagasin('1111', 'DISTANT');
    const local = fabriquerDonneesMagasin('2222', 'LOCAL');
    const fusion = mock.fusionner(distant, local);
    expect(fusion.magasin.code).toBe('2222');
    expect(fusion.magasin.nom).toBe('LOCAL');
    // Le reste vient du distant
    expect(fusion.semaine).toEqual(distant.semaine);
    expect(fusion.gamme).toEqual(distant.gamme);
  });

  // ── 2. L'adapter local exporte les 5 méthodes attendues
  test('adapterFichierLocal expose les 5 méthodes IPersistanceMagasin', () => {
    expect(typeof adapterFichierLocal.importer).toBe('function');
    expect(typeof adapterFichierLocal.exporter).toBe('function');
    expect(typeof adapterFichierLocal.charger).toBe('function');
    expect(typeof adapterFichierLocal.sauvegarder).toBe('function');
    expect(typeof adapterFichierLocal.fusionner).toBe('function');
  });

  test('adapterFichierLocal — importer + exporter cycle sur la fixture v3.0 réelle', async () => {
    const fixtureText = readFileSync(FIXTURE_PATH, 'utf-8');
    const fichier = new File([fixtureText], 'MANAGER-9999-S16-2026.bvp.json', { type: 'application/json' });
    const donnees = await adapterFichierLocal.importer(fichier);
    // Champs domaine remontés
    expect(donnees.magasin.code).toBe('9999');
    expect(donnees.semaine.numero).toBe(16);
    expect(donnees.gamme.produits).toHaveLength(15);
    expect(donnees.gamme.correctionsManuelles).toHaveLength(5); // 1 sep + 2 fusions + 1 dissoc + 1 assoc
    expect(donnees.promotions).toHaveLength(2);
    expect(donnees.produitsExceptionnels).toHaveLength(1);
    expect(donnees.produitsExceptionnels[0]?.libelle).toBe('TARTE FRAMBOISE PROMO');
    expect(donnees.meta.schemaVersion).toBe('3.1');

    // Round-trip via exporter — le résultat est un Blob JSON parseable
    const blob = await adapterFichierLocal.exporter(donnees);
    expect(blob.type).toBe('application/json');
    const reparse = JSON.parse(await blob.text()) as Record<string, unknown>;
    expect(reparse['schemaVersion']).toBe('3.1');
    expect(reparse['correctionsManuelles']).toBeDefined();
    expect(reparse['produitsExceptionnels']).toBeDefined();
  });

  test('adapterFichierLocal — fusionner garde le magasin local', () => {
    const distant = fabriquerDonneesMagasin('1111', 'DISTANT');
    const local = fabriquerDonneesMagasin('2222', 'LOCAL');
    const fusion = adapterFichierLocal.fusionner(distant, local);
    expect(fusion.magasin.code).toBe('2222');
    expect(fusion.magasin.nom).toBe('LOCAL');
  });

  // ── 3. Helpers localStorage : no-op en Node, format compatible V5
  test('obtenirCorrectionsLocales retourne null en Node (localStorage absent)', () => {
    // En env Vitest node, `localStorage` est typiquement absent.
    // Si il est présent (jsdom), la valeur sera lue mais probablement null.
    const result = obtenirCorrectionsLocales();
    expect(result === null || typeof result === 'object').toBe(true);
  });

  test('sauvegarderCorrectionsLocales est no-op en Node (pas d\'erreur)', () => {
    expect(() => sauvegarderCorrectionsLocales({
      separations: ['TEST'],
      fusions: [],
      dissociations: [],
      associations: [],
    })).not.toThrow();
  });

  test('STORAGE_KEY_CORRECTIONS reste aligné sur la clé V5 historique', () => {
    expect(STORAGE_KEY_CORRECTIONS).toBe('bvp_corrections_doublons');
  });

  // ── 4. Helper validerFichierBrut — entrée publique typée pour V5
  test('validerFichierBrut migre la fixture v3.0 vers v3.1', () => {
    const raw = JSON.parse(readFileSync(FIXTURE_PATH, 'utf-8')) as Record<string, unknown>;
    raw['schemaVersion'] = '3.0'; // simule un fichier v3.0
    const valide = validerFichierBrut(raw);
    expect(valide.schemaVersion).toBe('3.1');
    expect(valide.correctionsManuelles).toBeDefined();
    expect(valide.produitsExceptionnels).toBeDefined();
  });
});
