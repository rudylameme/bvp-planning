# PROMPT POUR CLAUDE CODE — Corrections V2 du nettoyage de gamme

Lis d'abord :
1. `CLAUDE.md`
2. `src/contexts/MagasinContext.jsx` (priorité — c'est ici le bug principal)
3. `src/services/nettoyageGamme.js`
4. `src/components/manager/pilotage/OngletGamme.jsx`

---

## BUG CRITIQUE — L'archive `.bvp.json` écrase les résultats du nettoyage

### Symptôme
Tous les produits marqués "Promo", "Hors saison", "Doublon fusionné" par le nettoyage ont le badge affiché correctement (raisonDesactivation est set) MAIS restent actifs (coche verte). Le champ `actif` est remis à `true` par l'archive.

### Cause racine
Dans `MagasinContext.jsx`, le `useEffect` aux lignes ~93-123 applique les données de l'archive APRÈS que `nettoyerGamme` ait correctement posé `actif: false` :

```javascript
// Ligne 110 — LE BUG :
if (typeof match.actif === 'boolean') changes.actif = match.actif;
```

L'archive (`.bvp.json` de la semaine précédente) contient les produits avec `actif: true` pour tous les produits que le manager avait sélectionnés. Comme le nettoyage n'existait pas avant, TOUS les produits de l'archive ont `actif: true`. Résultat : l'archive écrase le `actif: false` posé par le nettoyage pour les promos, hors-saison et doublons.

Le même problème existe pour le `rayon` (ligne 111) : l'archive d'avant le référentiel V2 a des rayons issus de l'ancienne heuristique (souvent "AUTRE"), ce qui écrase le rayon corrigé par le matching V2.

### Correction

Dans `MagasinContext.jsx`, modifier le `useEffect` qui applique l'archive. **Ne PAS écraser `actif` si le nettoyage a désactivé le produit** (c'est-à-dire si `raisonDesactivation` est défini). **Ne PAS écraser `rayon` si le nettoyage a matché le produit avec le référentiel V2** (c'est-à-dire si `matchRefV2` est défini).

Remplacer les lignes 109-111 :
```javascript
// AVANT (bug) :
if (typeof match.actif === 'boolean') changes.actif = match.actif;
if (match.rayon) changes.rayon = match.rayon;
```

Par :
```javascript
// APRÈS (fix) :
// Ne PAS écraser actif si le nettoyage a désactivé le produit
// (raisonDesactivation = promo, hors-saison, doublon-fusion, doublon-pre, article-a-creer)
if (typeof match.actif === 'boolean' && !pg.raisonDesactivation) {
  changes.actif = match.actif;
}
// Ne PAS écraser rayon si le nettoyage l'a enrichi depuis le référentiel V2
if (match.rayon && !pg.matchRefV2) {
  changes.rayon = match.rayon;
}
```

---

## BUG SECONDAIRE — Faux positifs du fuzzy matching

### Symptôme
Des produits sont matchés à tort avec le référentiel V2 :
- `*BUGNES CITRON 220G` → Ref: `ENTREMET CITRON` (faux !)
- `*BUGNES NATURE 220G` → Ref: `FLAN NATURE DECONGELE` (faux !)
- `*MINI BEIGNET FRAMB12DT40` → Ref: `MINI BEIGNET CHOCOLAT X 8` (faux !)

### Cause
Le score fuzzy avec un seuil de 0.4 accepte des matchs avec un seul token en commun (ex: "CITRON" suffit pour matcher "BUGNES CITRON" avec "ENTREMET CITRON"). C'est insuffisant.

### Correction

Dans `nettoyageGamme.js`, modifier la fonction `enrichirAvecRefV2` pour ajouter une condition supplémentaire : **exiger au minimum 2 tokens en commun** pour valider un match fuzzy.

Remplacer dans la section fuzzy matching (vers la ligne 276) :
```javascript
// AVANT :
if (bestScore > 0.4 && bestMatch) {
```

Par :
```javascript
// APRÈS : exiger au moins 2 tokens communs pour éviter les faux positifs
const bestCommuns = bestMatch ? tokensVente.filter(t => bestMatch.tokens.includes(t)).length : 0;
if (bestScore > 0.4 && bestMatch && bestCommuns >= 2) {
```

Note : si `tokensVente` n'a qu'un seul token (nom très court), le match sera impossible par fuzzy. C'est acceptable — ces cas seront traités par le matching par sous-chaîne qui est déjà en place plus haut.

---

## ORDRE D'EXÉCUTION

1. **Bug critique** : modifier `MagasinContext.jsx` (2 lignes à changer)
2. **Bug secondaire** : modifier `nettoyageGamme.js` (1 condition à ajouter)
3. Lancer `npm run build` pour vérifier la compilation

## TEST

Après correction, vérifier visuellement :
- [ ] Les produits `*` (promos) sont DÉSACTIVÉS (coche grise, pas verte)
- [ ] Les galettes en février sont DÉSACTIVÉES avec badge "Hors saison"
- [ ] Les doublons fusionnés sont DÉSACTIVÉS
- [ ] Les rayons ne sont plus tous "AUTRE" (enrichis depuis ref V2)
- [ ] Pas de faux matchs type BUGNES → ENTREMET
- [ ] Le build passe sans erreur

## IMPORTANT

- Lis chaque fichier EN ENTIER avant de le modifier
- NE supprime PAS de code existant sans comprendre ses dépendances
- Le changement dans `MagasinContext.jsx` est CRITIQUE — c'est la source du problème
- Mets à jour `CLAUDE.md` et `ADDENDUM_CDC_V5.2.md` en fin de travail
- Lance `npm run build` à la fin
