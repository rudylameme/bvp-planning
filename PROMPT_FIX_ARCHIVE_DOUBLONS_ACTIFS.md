# FIX : L'archive réactive des doublons inactifs (99 → 113 actifs)

## Problème constaté
L'archive MANAGER S11 contient **99 produits actifs** sur 690. Mais après application de l'archive sur les ventes brutes, l'application affiche **113 actifs** sur 672.

## Cause racine

Dans `appliquerArchiveSurBruts` (fichier `src/services/nettoyageGamme.js`, lignes 1159-1303), la fonction `findMatch` (lignes 1189-1229) cherche d'abord par **libellé exact** (étape 1, lignes 1194-1198) :

```javascript
if (pgLibelle) {
  const m = archiveByLibelle.get(pgLibelle);
  if (m) return m;
}
```

Or, `archiveByLibelle` ne garde que l'entrée **active** pour chaque libellé (lignes 1176-1181) :
```javascript
if (!existing || (p.actif && !existing.actif)) {
  archiveByLibelle.set(p.libelle, p);
}
```

**Résultat** : quand l'archive contient un même libellé avec 1 EAN actif et d'autres EAN inactifs (doublons), TOUS les produits ventes avec ce libellé matchent l'entrée active, et héritent TOUS de `actif: true`.

**Exemple concret** :
- Archive : CROISSANT BEURRE PREPOUSSE
  - EAN 3250392099947 → **actif** (celui gardé dans archiveByLibelle)
  - EAN 2644803000000 → **inactif** (écrasé dans archiveByLibelle)
  - EAN 2813736000000 → **inactif** (écrasé)
  - EAN 2644802000000 → **inactif** (écrasé)
  - EAN 2644805000000 → **inactif** (écrasé)
- Ventes brutes : 5 produits "CROISSANT BEURRE PREPOUSSE" (5 EAN différents)
- Match : les 5 matchent via libellé → **tous deviennent actifs** au lieu de 1 seul

Il y a **16 libellés** dans ce cas, représentant **21 copies inactives** réactivées à tort.

## Correction à faire

### Fichier : `src/services/nettoyageGamme.js`

#### Modifier `findMatch` (lignes 1189-1229)

La logique doit être : **si le produit ventes a un EAN qui existe dans l'archive, utiliser le match EAN en priorité** (car l'EAN est plus spécifique que le libellé et porte le bon état actif/inactif). Sinon, fallback sur le libellé.

Remplacer la fonction `findMatch` par :

```javascript
const findMatch = (pg) => {
  const pgEan = String(pg.ean13 || pg.codeEAN || '');
  const pgItm8 = String(pg.itm8 || '');
  const pgLibelle = pg.libelle || '';

  // 1. Match par EAN13 EN PREMIER (plus spécifique, porte le bon état actif/inactif)
  if (pgEan) {
    const candidates = archiveByEan.get(pgEan);
    if (candidates) {
      if (candidates.length === 1) return candidates[0];
      const byLib = candidates.find(c => c.libelle === pgLibelle);
      if (byLib) return byLib;
      const unused = candidates.find(c => !usedArchiveKeys.has(getStableKey(c)));
      if (unused) return unused;
      return candidates[0];
    }
  }
  // 2. Match par ITM8
  if (pgItm8) {
    const candidates = archiveByItm8.get(pgItm8);
    if (candidates) {
      if (candidates.length === 1) return candidates[0];
      const byLib = candidates.find(c => c.libelle === pgLibelle);
      if (byLib) return byLib;
      const unused = candidates.find(c => !usedArchiveKeys.has(getStableKey(c)));
      if (unused) return unused;
      return candidates[0];
    }
  }
  // 3. Match par libellé SEULEMENT si ni EAN ni ITM8 n'ont matché
  if (pgLibelle) {
    const m = archiveByLibelle.get(pgLibelle);
    if (m) return m;
  }
  // 4. Match par PLU (dernier recours)
  if (pg.plu) {
    const candidates = archiveByItm8.get(String(pg.plu));
    if (candidates) return candidates[0];
  }
  return null;
};
```

**Changement clé** : l'EAN passe en **priorité 1** (avant le libellé), parce que l'EAN identifie spécifiquement une version du produit et porte son propre état actif/inactif. Le libellé ne vient qu'en **priorité 3** (fallback si ni EAN ni ITM8 ne matchent).

## Vérification après correction
- Charger les ventes S09 ou S11
- L'archive MANAGER S11 doit être appliquée automatiquement
- Le compteur doit afficher **99 actifs** (comme dans l'archive), pas 113
- Les doublons inactifs (ex: CROISSANT BEURRE PREPOUSSE avec EAN 2644803000000) doivent rester inactifs

## Mettre à jour le CDC
Ajouter dans ADDENDUM_CDC_V5.2.md une note sur la section 19 :

```markdown
### 19.x Fix matching archive — priorité EAN sur libellé
**Date : 19/03/2026**

Le matching `appliquerArchiveSurBruts` utilisait le libellé en priorité 1.
Pour les doublons (même libellé, EAN différents, un actif et les autres inactifs),
cela réactivait à tort les copies inactives.
Correction : EAN en priorité 1, libellé en priorité 3 (fallback uniquement).
```
