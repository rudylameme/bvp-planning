/**
 * src/domain/contracts/ — interfaces inter-modules.
 *
 * SB-5 : `IPersistanceMagasin` posé et câblé via `adapterFichierLocal`.
 *
 * Cibles ultérieures :
 *   - extractionVentes.ts : IExtractionVentes (SB-8)
 *   - pilotageGamme.ts    : IPilotageGamme    (SB-9)
 */

export type {
  IPersistanceMagasin,
  MetaPersistance,
} from './persistanceMagasin.js';
