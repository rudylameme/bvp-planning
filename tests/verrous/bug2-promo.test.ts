/**
 * Verrou — Bug 2 « Article promo créé non remonté à la feuille de production ».
 *
 * Diagnostic SB-0 (2026-06-04) :
 *   Chaîne brisée en 4 maillons côté Manager → Équipe :
 *     1. `Etape4PilotageCA.jsx:205` — state local jamais remonté au contexte
 *     2. `Etape5Communication.jsx`   — export sans `produitsExceptionnels`
 *     3. `AccueilEquipe.jsx:113-145` — chargement sans `produitsExceptionnels`
 *     4. `PlanningJour.jsx`          — pas de consommation
 *
 * État SB-1 : test `test.todo` — la fonction cible `propagerPromos` n'existe
 * pas encore. À activer en SB-11 après :
 *   - écriture de `src/domain/rules/propagationPromo.ts` (SB-10)
 *   - branchement de l'export Manager + lecture Équipe (SB-10/SB-11)
 *
 * Fixture utilisée : `tests/fixtures/MANAGER-9999-S16-2026.bvp.json`
 *   (contient 1 produit exceptionnel "TARTE FRAMBOISE PROMO", rattaché
 *    vendredi / samedi / dimanche, qte 5/jour, prix 12,90 €).
 */

import { describe, test } from 'vitest';

describe('Bug 2 — Article promo non remonté au planning', () => {

  test.todo('T3 — produit exceptionnel rattaché apparaît dans la feuille de production');
  /*
   * Corps à activer en SB-11, après que :
   *   - `src/domain/rules/propagationPromo.ts` exporte `propagerPromos(...)`,
   *   - `src/domain/persistence/adapterFichierLocal.ts` expose `importer(...)`,
   *   - le type `LignePlanning` porte `origine: 'historique'|'promo'|'exceptionnel'`.
   *
   *   import { readFileSync } from 'node:fs';
   *   import { resolve } from 'node:path';
   *   import { expect } from 'vitest';
   *   import { importer } from '../../src/domain/persistence/adapterFichierLocal';
   *   import { propagerPromos } from '../../src/domain/rules/propagationPromo';
   *
   *   const fixturePath = resolve(__dirname, '../fixtures/MANAGER-9999-S16-2026.bvp.json');
   *   const fixture = JSON.parse(readFileSync(fixturePath, 'utf-8'));
   *
   *   const donnees = importer(fixture);
   *
   *   // Construit le planning du vendredi avec propagation promo/exceptionnels
   *   const feuilles = propagerPromos(
   *     donnees.promotions,
   *     donnees.produitsExceptionnels,
   *     donnees.feuillesProductionBase, // feuilles dérivées des produits historiques
   *   );
   *
   *   const feuilleVendredi = feuilles.find(f => f.jour === 'vendredi');
   *   expect(feuilleVendredi).toBeDefined();
   *
   *   const ligne = feuilleVendredi!.lignes.find(
   *     l => l.libelle === 'TARTE FRAMBOISE PROMO',
   *   );
   *   expect(ligne).toBeDefined();
   *   expect(ligne!.origine).toBe('exceptionnel');
   *   expect(ligne!.quantitePrevue).toBe(5);
   *
   *   // Idem samedi et dimanche
   *   for (const jour of ['samedi', 'dimanche'] as const) {
   *     const f = feuilles.find(x => x.jour === jour);
   *     expect(f?.lignes.some(
   *       l => l.libelle === 'TARTE FRAMBOISE PROMO' && l.origine === 'exceptionnel',
   *     )).toBe(true);
   *   }
   *
   *   // Jours NON rattachés : la ligne ne doit PAS apparaître
   *   for (const jour of ['lundi', 'mardi', 'mercredi', 'jeudi'] as const) {
   *     const f = feuilles.find(x => x.jour === jour);
   *     expect(f?.lignes.some(l => l.libelle === 'TARTE FRAMBOISE PROMO')).toBe(false);
   *   }
   */
});
