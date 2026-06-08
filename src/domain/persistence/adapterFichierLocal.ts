/**
 * Adapter — Persistance fichier local (`.bvp.json` + localStorage).
 *
 * SB-5. Première implémentation de `IPersistanceMagasin`. Wraps :
 *   - `schemaFichierBVP.ts` (SB-4) pour la validation / migration / mapping
 *   - le navigateur (`File`, `Blob`, `FileSystemFileHandle`, `localStorage`)
 *
 * **Iso-comportement V5 strict** : cet adapter conserve les comportements V5
 * (clé `bvp_corrections_doublons` dans `localStorage`, format JSON identique,
 * pas de modification du flux de corrections). Le bug 1 reste OUVERT à la fin
 * de SB-5 — il sera corrigé en SB-6 quand `MagasinContext` passera les
 * corrections en paramètre explicite à `appliquerArchiveSurBruts` au lieu de
 * les lire ambient via `localStorage`.
 *
 * En environnement Node (tests Vitest), `localStorage` est absent : les helpers
 * retournent `null` et l'adapter se comporte comme s'il n'y avait pas de
 * corrections locales — exactement le bon défaut.
 */

import type { DonneesMagasin } from '../types/index.js';
import type { IPersistanceMagasin } from '../contracts/persistanceMagasin.js';
import {
  parsePersistedV31,
  serializeDonneesMagasin,
  validerFichier,
  type PersistedCorrectionsManuellesV31,
  type SourceCorrections,
} from './schemaFichierBVP.js';

// ============================================================================
// Helpers localStorage — exposés pour le rebranchement de MagasinContext
// ============================================================================

/**
 * Clé partagée avec `services/nettoyageGamme.js` V5 (L935). Iso-comportement —
 * NE PAS changer cette valeur sans coordonner avec V5.
 */
export const STORAGE_KEY_CORRECTIONS = 'bvp_corrections_doublons';

/**
 * Lit le bloc des corrections manuelles depuis `localStorage`. Retourne `null`
 * si `localStorage` est indisponible (Node) ou si la clé est absente / invalide.
 *
 * Format identique à `services/nettoyageGamme.js:chargerCorrectionsDoublons()`.
 */
export function obtenirCorrectionsLocales(): PersistedCorrectionsManuellesV31 | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CORRECTIONS);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return null;
    const r = parsed as Record<string, unknown>;
    return {
      separations: Array.isArray(r['separations'])
        ? (r['separations'] as unknown[]).filter((x): x is string => typeof x === 'string')
        : [],
      fusions: Array.isArray(r['fusions'])
        ? (r['fusions'] as unknown[])
            .filter((f): f is Record<string, unknown> => typeof f === 'object' && f !== null)
            .filter(f => typeof f['source'] === 'string' && typeof f['cible'] === 'string')
            .map(f => ({ source: f['source'] as string, cible: f['cible'] as string }))
        : [],
      dissociations: Array.isArray(r['dissociations'])
        ? (r['dissociations'] as unknown[]).filter((x): x is string => typeof x === 'string')
        : [],
      associations: Array.isArray(r['associations'])
        ? (r['associations'] as unknown[])
            .filter((a): a is Record<string, unknown> => typeof a === 'object' && a !== null)
            .filter(a => typeof a['libelle'] === 'string' && typeof a['itm8'] === 'string')
            .map(a => ({ libelle: a['libelle'] as string, itm8: a['itm8'] as string }))
        : [],
    };
  } catch {
    return null;
  }
}

/**
 * Écrit le bloc des corrections manuelles dans `localStorage`. Iso-comportement
 * V5 : même clé, même format JSON. No-op si `localStorage` indisponible.
 */
export function sauvegarderCorrectionsLocales(c: PersistedCorrectionsManuellesV31): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_CORRECTIONS, JSON.stringify(c));
  } catch {
    // silently fail (quota dépassé, mode privé strict…)
  }
}

/**
 * `SourceCorrections` (cf. SB-4) qui interroge `localStorage`. Passée à
 * `validerFichier` pour récupérer les corrections existantes lors d'une
 * migration v2.1/v3.0 → v3.1 quand le fichier source n'en porte pas.
 */
const sourceLocalStorage: SourceCorrections = () => obtenirCorrectionsLocales();

// ============================================================================
// Helper bas-niveau exposé pour V5 (rebranchement Etape2ObjectifCA potentiel)
// ============================================================================

/**
 * Valide + migre un fichier brut vers `PersistedFileV31`. Utilise la source
 * `localStorage` pour reconstituer les corrections manquantes des anciens
 * fichiers. Exposé pour les composants V5 qui ont déjà fait `JSON.parse(text)`
 * et veulent obtenir un fichier typé v3.1.
 */
export function validerFichierBrut(raw: unknown) {
  return validerFichier(raw, sourceLocalStorage);
}

// ============================================================================
// Implémentation IPersistanceMagasin
// ============================================================================

async function importerImpl(fichier: File): Promise<DonneesMagasin> {
  const text = await fichier.text();
  const raw = JSON.parse(text) as unknown;
  const valide = validerFichier(raw, sourceLocalStorage);
  return parsePersistedV31(valide);
}

async function exporterImpl(donnees: DonneesMagasin): Promise<Blob> {
  const persisted = serializeDonneesMagasin(donnees);
  return new Blob([JSON.stringify(persisted, null, 2)], { type: 'application/json' });
}

async function chargerImpl(handle: FileSystemFileHandle): Promise<DonneesMagasin> {
  const fichier = await handle.getFile();
  return importerImpl(fichier);
}

async function sauvegarderImpl(
  handle: FileSystemFileHandle,
  donnees: DonneesMagasin,
): Promise<void> {
  const persisted = serializeDonneesMagasin(donnees);
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(persisted, null, 2));
  await writable.close();
}

function fusionnerImpl(distant: DonneesMagasin, local: DonneesMagasin): DonneesMagasin {
  // Convention V5 (fichierMagasin.js:241 fusionnerAvecDonneesLocales) :
  // les identités locales (magasin code/nom + joursOuverture) priment.
  return {
    ...distant,
    magasin: local.magasin,
  };
}

/**
 * Instance singleton de l'adapter. Importée par `MagasinContext` (SB-5) puis
 * fournie via la valeur du Context React (`useMagasin().persistance`).
 */
export const adapterFichierLocal: IPersistanceMagasin = {
  importer: importerImpl,
  exporter: exporterImpl,
  charger: chargerImpl,
  sauvegarder: sauvegarderImpl,
  fusionner: fusionnerImpl,
};
