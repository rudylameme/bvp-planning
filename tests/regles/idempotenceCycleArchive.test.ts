/**
 * Vérou : idempotence du cycle export → réimport → ré-export
 *
 * Bug racine (CONFOLENS, « BAG CONSTANCE 3+1 PAC 1K », unitesParLot=4, 0 vente
 * Mercalys courante) : moyenneHebdo grimpe 1108 → 4432 → 17728 → 70912 → 283648,
 * soit × upv à chaque régénération.
 *
 * Cause :
 *   - Export Etape5Communication.jsx : moyenneHebdo = moyHebdo × upv (unités fichier).
 *   - Réimport branche "ajout depuis archive" (produit sans vente courante) :
 *     moyHebdo := ap.moyenneHebdo (sans diviser) → re-multiplié au cycle suivant.
 *
 * Fix : à la relecture, RAMENER les 3 champs (moyHebdo, potentiel, planifieManager)
 * en ventes/lots en divisant par upv. Symétrie stricte avec l'export.
 *
 * Le test reproduit en JS pur les 2 transformations à l'identique du code V5,
 * sans dépendance React. Il décrit AUSSI le scénario AVANT (×4 cumulatif) pour
 * matérialiser la régression — ce cas est attendu en échec.
 */

import { describe, test, expect } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// Transformation EXPORT (réplique fidèle de Etape5Communication.jsx L146-181)
// ─────────────────────────────────────────────────────────────────────────────

interface ProduitInterne {
  id: string;
  itm8: string;
  libelle: string;
  unitesParLot: number;
  unitesParVente: number;
  moyHebdo: number;       // VENTES (interne)
  potentiel: number;      // VENTES (interne)
  caSemaine: number;
  actif: boolean;
}

interface ProduitFichier {
  id: string;
  itm8: string;
  libelle: string;
  unitesParLot: number;
  unitesParVente: number;
  moyenneHebdo: number;      // UNITÉS (fichier)
  potentielAlgo: number;     // UNITÉS (fichier)
  planifieManager: number;   // UNITÉS (fichier)
  actif: boolean;
}

function exporter(
  produits: readonly ProduitInterne[],
  planifieManagerState: Readonly<Record<string, number>>,
): ProduitFichier[] {
  return produits.map(p => {
    const planifie = planifieManagerState[p.id] ?? p.potentiel ?? p.moyHebdo ?? 0;
    const upv = p.unitesParLot || p.unitesParVente || 1;
    return {
      id: p.id, itm8: p.itm8, libelle: p.libelle,
      unitesParLot: p.unitesParLot || p.unitesParVente || 1,
      unitesParVente: p.unitesParVente || 1,
      moyenneHebdo: (p.moyHebdo || 0) * upv,
      potentielAlgo: (p.potentiel || 0) * upv,
      planifieManager: planifie * upv,
      actif: p.actif !== false,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Transformation RÉIMPORT — 2 variantes :
//   (A) AVANT le fix : on stocke moyenneHebdo/potentielAlgo/planifieManager
//       tels quels (= bug × upv cumulatif).
//   (B) APRÈS le fix : on DIVISE par upv pour ramener en ventes/lots.
// ─────────────────────────────────────────────────────────────────────────────

interface EtatInterne {
  produits: ProduitInterne[];
  planifieManager: Record<string, number>;
}

function reimporterAVANT(archive: readonly ProduitFichier[]): EtatInterne {
  const produits: ProduitInterne[] = archive.map(ap => ({
    id: ap.id, itm8: ap.itm8, libelle: ap.libelle,
    unitesParLot: ap.unitesParLot || 1,
    unitesParVente: ap.unitesParVente || 1,
    moyHebdo: ap.moyenneHebdo || 0,            // ← BUG : pas de division
    potentiel: ap.potentielAlgo || 0,           // ← BUG : pas de division
    caSemaine: 0,
    actif: ap.actif ?? false,
  }));
  const planifieManager: Record<string, number> = {};
  for (const ap of archive) {
    if (ap.planifieManager > 0) {
      planifieManager[ap.id] = ap.planifieManager;   // ← BUG : pas de division
    }
  }
  return { produits, planifieManager };
}

function reimporterAPRES(archive: readonly ProduitFichier[]): EtatInterne {
  const produits: ProduitInterne[] = archive.map(ap => {
    const upv = ap.unitesParLot || ap.unitesParVente || 1;
    return {
      id: ap.id, itm8: ap.itm8, libelle: ap.libelle,
      unitesParLot: ap.unitesParLot || 1,
      unitesParVente: ap.unitesParVente || 1,
      moyHebdo: Math.round((ap.moyenneHebdo || 0) / upv),
      potentiel: Math.round((ap.potentielAlgo || 0) / upv),
      caSemaine: 0,
      actif: ap.actif ?? false,
    };
  });
  const planifieManager: Record<string, number> = {};
  for (const ap of archive) {
    if (ap.planifieManager > 0) {
      const upv = ap.unitesParLot || ap.unitesParVente || 1;
      planifieManager[ap.id] = ap.planifieManager / upv;
    }
  }
  return { produits, planifieManager };
}

// ─────────────────────────────────────────────────────────────────────────────
// Cas de test
// ─────────────────────────────────────────────────────────────────────────────

const PRODUIT_LOTS_4: ProduitInterne = {
  id: 'itm-10000001',
  itm8: '10000001',
  libelle: 'BAG CONSTANCE 3+1 PAC 1K',
  unitesParLot: 4,
  unitesParVente: 4,
  moyHebdo: 1108,
  potentiel: 1108,
  caSemaine: 5500,
  actif: true,
};

const PRODUIT_LOTS_1: ProduitInterne = {
  id: 'itm-20000002',
  itm8: '20000002',
  libelle: 'BAGUETTE TRADITION',
  unitesParLot: 1,
  unitesParVente: 1,
  moyHebdo: 2800,
  potentiel: 2800,
  caSemaine: 3360,
  actif: true,
};

// 3 cycles export → réimport → export, en partant d'un état interne propre.
function simulerCycles(
  init: ProduitInterne,
  variante: 'AVANT' | 'APRES',
  nbCycles = 3,
): number[] {
  const reimport = variante === 'AVANT' ? reimporterAVANT : reimporterAPRES;
  let etat: EtatInterne = { produits: [init], planifieManager: {} };
  const moyennes: number[] = [];
  for (let i = 0; i < nbCycles; i++) {
    const fichier = exporter(etat.produits, etat.planifieManager);
    moyennes.push(fichier[0]?.moyenneHebdo ?? 0);
    etat = reimport(fichier);
  }
  return moyennes;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Idempotence cycle export → réimport (bug ×upv)', () => {

  test('AVANT le fix — upv=4 : moyenneHebdo grimpe ×4 par cycle (régression confirmée)', () => {
    const moyennes = simulerCycles(PRODUIT_LOTS_4, 'AVANT', 5);
    // Reproduit l'observation CONFOLENS : 1108 × 4 → 4432 → 17728 → 70912 → 283648
    expect(moyennes).toEqual([4432, 17728, 70912, 283648, 1134592]);
  });

  test('APRÈS le fix — upv=4 : moyenneHebdo est stable au 2e cycle et au-delà', () => {
    const moyennes = simulerCycles(PRODUIT_LOTS_4, 'APRES', 5);
    // moyHebdo interne = 1108, upv = 4 → export = 4432 chaque fois
    expect(moyennes).toEqual([4432, 4432, 4432, 4432, 4432]);
  });

  test('APRÈS le fix — upv=1 : pas de régression (cas no-op)', () => {
    const moyennes = simulerCycles(PRODUIT_LOTS_1, 'APRES', 5);
    expect(moyennes).toEqual([2800, 2800, 2800, 2800, 2800]);
  });

  test('AVANT le fix — upv=1 : déjà stable (la division par 1 cache le bug, mais pas pour upv>1)', () => {
    const moyennes = simulerCycles(PRODUIT_LOTS_1, 'AVANT', 5);
    expect(moyennes).toEqual([2800, 2800, 2800, 2800, 2800]);
  });

  test('APRÈS le fix — potentiel et planifieManager sont également stables (upv=4)', () => {
    const reimport = reimporterAPRES;
    const initPlanifie = { [PRODUIT_LOTS_4.id]: 1500 }; // ventes
    let etat: EtatInterne = { produits: [PRODUIT_LOTS_4], planifieManager: initPlanifie };
    const trio: Array<{ moy: number; pot: number; planif: number }> = [];
    for (let i = 0; i < 4; i++) {
      const fichier = exporter(etat.produits, etat.planifieManager);
      trio.push({
        moy: fichier[0]!.moyenneHebdo,
        pot: fichier[0]!.potentielAlgo,
        planif: fichier[0]!.planifieManager,
      });
      etat = reimport(fichier);
    }
    // Chaque cycle ré-écrit les mêmes valeurs en unités (×4 depuis ventes 1108/1108/1500).
    expect(trio).toEqual([
      { moy: 4432, pot: 4432, planif: 6000 },
      { moy: 4432, pot: 4432, planif: 6000 },
      { moy: 4432, pot: 4432, planif: 6000 },
      { moy: 4432, pot: 4432, planif: 6000 },
    ]);
  });
});
