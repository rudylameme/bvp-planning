# tests/fixtures/

Fixtures de test pour la migration TypeScript du bloc Gamme + Planning.

## MANAGER-9999-S16-2026.bvp.json — fixture « golden » T1 (Bug 1)

Archive Manager schemaVersion **3.0** synthétisée à partir de la lecture du code de `Etape5Communication.jsx` (Manager export, lignes 199-396) et `nettoyageGamme.js`.

Contenu volontairement riche pour exercer le contrat **`import(export(archive)) === archive`** :

- **15 produits** couvrant les cas réels :
  - actifs / inactifs / raisons de désactivation variées (promo, hors-saison, doublon-fusion, faible-ca, absent-archive)
  - avec/sans `matchRefV2`, `libelleRefV2`, `marqueRefV2`
  - avec/sans `_eansFusionnes`
  - différents `unitesParPlaque`, `unitesParLot`, `unitesParVente`
- **5 corrections manuelles** (1 de chaque type + 1 supplémentaire) :
  - 1 séparation (`bvp_corrections_doublons.separations`)
  - 2 fusions (`bvp_corrections_doublons.fusions`)
  - 1 dissociation (`bvp_corrections_doublons.dissociations`)
  - 1 association (`bvp_corrections_doublons.associations`)
- **2 promotions** et **1 produit exceptionnel** :
  - Le champ `produitsExceptionnels` est **absent du schéma V3.0 actuel** côté Manager (Etape5Communication.jsx ne l'exporte pas — confirmé). Il est ici ajouté à dessein, en cible v3.1, pour faire échouer le test T1 sur V5 et passer après SB-6/SB-11.
- **Référentiel** : v2 fictif (`ITM8-2026`).

## Utilisation prévue

```
// Test T1 (à écrire en SB-1, à passer en SB-6) :
test('T1 — cycle import/export stable au 2e tour', () => {
  const fixture = readJson('tests/fixtures/MANAGER-9999-S16-2026.bvp.json');
  const tour1 = exporter(importer(fixture));
  const tour2 = exporter(importer(tour1));
  expect(tour2).toEqual(tour1);
});

// Test T2 (corrections appliquées de manière idempotente) :
test('T2 — corrections re-produisent les mêmes effets après cycle JSON', () => {
  const fixture = readJson('tests/fixtures/MANAGER-9999-S16-2026.bvp.json');
  expect(appliquerCorrectionsManuelles(JSON.parse(JSON.stringify(fixture.produits)),
                                       fixture.correctionsManuelles))
    .toEqual(appliquerCorrectionsManuelles(fixture.produits, fixture.correctionsManuelles));
});

// Test T3 (produit exceptionnel injecté dans le planning) :
test('T3 — produit exceptionnel rattaché apparaît dans la feuille de production', () => {
  const fixture = readJson('tests/fixtures/MANAGER-9999-S16-2026.bvp.json');
  const planning = construirePlanning(fixture);
  expect(planning.lignes.some(l => l.libelle === 'TARTE FRAMBOISE PROMO'
                                  && l.origine === 'exceptionnel'))
    .toBe(true);
});
```

## Notes

- Le PDV `9999` est fictif (jamais utilisé en prod). Permet d'éviter toute confusion avec un magasin réel.
- La semaine S16-2026 (du 13 au 19 avril 2026) est arbitraire et cohérente avec `getDateDebutSemaine` / `getDateFinSemaine`.
- Le format respecte le contrat actuel de `Etape5Communication.jsx` (V3.0) PLUS les ajouts nécessaires à la cible v3.1 documentés dans la fiche `BVP-Brain/BVP-Planning/Bugs/Bug — Gamme non conservee entre sessions.md`.
