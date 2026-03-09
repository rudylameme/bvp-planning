# PROMPT POUR CLAUDE CODE — Corrections V3 du nettoyage de gamme

Lis d'abord :
1. `CLAUDE.md`
2. `src/services/nettoyageGamme.js` (fichier principal à corriger)
3. `src/services/gammeExtractionService.js` (heuristique rayon)

---

## 3 CORRECTIONS STRUCTURELLES

### CORRECTION 1 — Améliorer le normaliseur de libellés

Le normaliseur actuel dans `normaliserLibelle()` a 3 lacunes :

**1a. Les fractions "1/2", "1/3" ne sont pas normalisées**
- "BAG 1/2 CONSTANCE" et "BAG 1/2CONSTANCE" (sans espace) donnent des résultats différents
- "BAG 1/2 CONSTANCE" est fusionné par erreur avec "BAG CONSTANCE" car "1/2" est tokenisé en "1" + "2" qui sont filtrés, ne laissant que "BAG CONSTANCE"

**1b. Les poids sans unité ne sont pas retirés**
- "PAC 300" garde "300", mais "PAC 300G" retire "300G" → noms normalisés différents pour le même produit
- "PREC/300G" vs "PREC/30" → le "/" n'est pas traité comme séparateur

**1c. Le "/" n'est pas traité comme séparateur**
- "PREC/300G" reste collé, "PREC /300G" avec espace se sépare bien

**Correction de `normaliserLibelle()` :**

```javascript
export const normaliserLibelle = (lib) => {
  return (lib || '')
    .toUpperCase()
    .replace(/^\*/, '')                    // retirer * promo
    // Normaliser les fractions AVANT tout le reste
    .replace(/\b1\/2\b/g, 'DEMI')         // 1/2 → DEMI
    .replace(/\b1\/3\b/g, 'TIERS')        // 1/3 → TIERS
    .replace(/\b1\/4\b/g, 'QUART')        // 1/4 → QUART
    .replace(/\//g, ' ')                   // "/" → espace (séparateur)
    .replace(/\bP&C\b/g, '')
    .replace(/\bPAC\b/g, '')
    .replace(/\bCRU\b/g, '')
    .replace(/\bPRE\b|\bPREC\b|\bPRECUIT\b/g, '')
    .replace(/\bDECONGELE[ES]?\b/g, '')
    .replace(/\bOFF\b/g, '')              // "OFF" (offre) n'est pas distinctif
    .replace(/\d+\s*[GK]G?\b/gi, '')      // poids avec unité : 300G, 250KG, 1K, etc.
    .replace(/\b\d{2,4}\b/g, '')          // nombres seuls de 2-4 chiffres (poids, codes)
    .replace(/\bX\d+\b/gi, '')            // X8, X12, X20 — quantités par lot
    .replace(/\bD\d+\b/g, '')             // D22, D28 — diamètres galettes
    .replace(/\bS\.?A\.?\b/g, '')         // S.A, SA (service arrière)
    .replace(/\s+/g, ' ')
    .trim();
};
```

**Résultat attendu :**
- "BAG 1/2 CONSTANCE PAC 125" → "BAG DEMI CONSTANCE"
- "BAG 1/2CONSTANCE PAC 125" → "BAG DEMI CONSTANCE" (maintenant identique !)
- "BAG CONSTANCE PAC 250G" → "BAG CONSTANCE" (différent de DEMI CONSTANCE ✓)
- "PAIN AUX CEREALES PAC 300" → "PAIN AUX CEREALES"
- "PAIN AUX CEREALES PREC/300G" → "PAIN AUX CEREALES" (maintenant identique ✓)

### CORRECTION 2 — Matching fuzzy avec correspondance partielle de tokens

Le fuzzy actuel compare les tokens en exact. Donc "FOUR" ≠ "FOURRES", "POM" ≠ "POMME", "CHOCO" ≠ "CHOCOLAT". Cela crée des faux matchs : "MINI BEIGNETS FOUR POM X8" matche "MINI BEIGNETS FRAMBOISE" au lieu de "MINI BEIGNETS FOURRES POMME" car le score est le même (2 tokens communs: MINI, BEIGNETS).

**Correction du `calculerScore()` :**

Ajouter une correspondance par préfixe : si un token de la vente (min 3 caractères) est un préfixe d'un token du référentiel (ou inversement), compter comme 0.7 match au lieu de 1.0.

```javascript
/**
 * Vérifie si deux tokens matchent (exact ou préfixe)
 * @returns 1.0 pour exact, 0.7 pour préfixe (min 3 chars), 0 sinon
 */
const scoreTokens = (tokenA, tokenB) => {
  if (tokenA === tokenB) return 1.0;
  // Préfixe : le plus court doit faire au moins 3 caractères
  const shorter = tokenA.length <= tokenB.length ? tokenA : tokenB;
  const longer = tokenA.length > tokenB.length ? tokenA : tokenB;
  if (shorter.length >= 3 && longer.startsWith(shorter)) return 0.7;
  return 0;
};

/**
 * Calcul de score de similarité entre deux ensembles de tokens
 * Score pondéré : 50% Jaccard (avec préfixes) + 50% couverture des tokens vente
 */
const calculerScore = (tokensVente, tokensRef) => {
  if (tokensVente.length === 0 || tokensRef.length === 0) return 0;

  // Pour chaque token vente, trouver le meilleur match dans le ref
  let totalScore = 0;
  let matchCount = 0;
  const refUtilises = new Set();

  for (const tv of tokensVente) {
    let bestScore = 0;
    let bestIdx = -1;
    for (let i = 0; i < tokensRef.length; i++) {
      if (refUtilises.has(i)) continue;
      const s = scoreTokens(tv, tokensRef[i]);
      if (s > bestScore) {
        bestScore = s;
        bestIdx = i;
      }
    }
    if (bestScore > 0 && bestIdx >= 0) {
      totalScore += bestScore;
      matchCount++;
      refUtilises.add(bestIdx);
    }
  }

  if (matchCount === 0) return 0;

  // Jaccard-like : score total / nombre total de tokens uniques
  const unionSize = tokensVente.length + tokensRef.length - matchCount;
  const jaccard = totalScore / unionSize;

  // Couverture : proportion des tokens vente qui ont trouvé un match
  const couverture = matchCount / tokensVente.length;

  return (jaccard * 0.5) + (couverture * 0.5);
};
```

**Et mettre à jour la condition du match fuzzy :**

```javascript
// Exiger au moins 2 tokens qui matchent (exact ou préfixe)
const bestCommuns = bestMatch ? (() => {
  let count = 0;
  const refUsed = new Set();
  for (const tv of tokensVente) {
    for (let i = 0; i < bestMatch.tokens.length; i++) {
      if (refUsed.has(i)) continue;
      if (scoreTokens(tv, bestMatch.tokens[i]) > 0) {
        count++;
        refUsed.add(i);
        break;
      }
    }
  }
  return count;
})() : 0;

if (bestScore > 0.4 && bestMatch && bestCommuns >= 2) {
```

**Résultat attendu :**
- "MINI BEIGNETS FOUR POM" → "MINI BEIGNETS FOURRES A LA POMME" (FOUR→FOURRES 0.7, POM→POMME 0.7 + MINI 1.0 + BEIGNETS 1.0) → score élevé ✓
- "MINI BEIGNETS FOUR POM" → "MINI BEIGNETS FRAMBOISE" (FOUR→? 0, POM→? 0, MINI 1.0, BEIGNETS 1.0) → score plus bas ✓
- "MOKAS AU CAFE X2" → "SALAMBOS AU KIRSCH X2" (MOKAS→? 0, CAFE→? 0, AU 1.0) → 1 seul match, rejeté ✓

**IMPORTANT** : la fonction `scoreTokens` doit être déclarée AVANT `calculerScore` dans le fichier.

### CORRECTION 3 — Enrichir l'heuristique de rayon

Dans `gammeExtractionService.js`, dans la fonction `formaterPourPilotageCA()`, il y a une heuristique par mots-clés pour deviner le rayon quand le produit n'est pas reconnu par le référentiel. Ajouter ces cas manquants :

```javascript
// Après les conditions existantes, ajouter :
else if (lib.includes('canele') || lib.includes('canelé') ||
         lib.includes('meringuette') || lib.includes('meringue') ||
         lib.includes('moelleux') || lib.includes('mouna') ||
         lib.includes('opera') || lib.includes('opéra') ||
         lib.includes('tropezienne') || lib.includes('tropézienne') ||
         lib.includes('fraisier') || lib.includes('paris brest') ||
         lib.includes('millefeuille') || lib.includes('mille-feuille') ||
         lib.includes('flan') || lib.includes('religieuse') ||
         lib.includes('eclair') || lib.includes('éclair') ||
         lib.includes('macaron') || lib.includes('beignet') ||
         lib.includes('donut') || lib.includes('gaufre') ||
         lib.includes('muffin') || lib.includes('brownie') ||
         lib.includes('cookie') || lib.includes('palmier') ||
         lib.includes('tarte') || lib.includes('gateau') || lib.includes('gâteau') ||
         lib.includes('buche') || lib.includes('bûche') ||
         lib.includes('galette') || lib.includes('craquotant') ||
         lib.includes('fondant') || lib.includes('tiramisu')) {
  rayon = 'PATISSERIE';
} else if (lib.includes('wrap') || lib.includes('panini') ||
           lib.includes('hot dog') || lib.includes('focaccia') ||
           lib.includes('empanada') || lib.includes('pizza') ||
           lib.includes('quiche') || lib.includes('croque')) {
  rayon = 'SNACKING';
} else if (lib.includes('pave') || lib.includes('pavé') ||
           lib.includes('miche') || lib.includes('boule') ||
           lib.includes('campagn')) {
  rayon = 'BOULANGERIE';
}
```

**Attention** : trouver l'emplacement exact de l'heuristique dans `formaterPourPilotageCA()`. Elle est dans le bloc qui détermine le rayon quand `infoRef` est null. Chercher un bloc du type `if (lib.includes('pain') || lib.includes('baguette'))`.

---

## ORDRE D'EXÉCUTION

1. Correction 1 : modifier `normaliserLibelle()` dans `nettoyageGamme.js`
2. Correction 2 : modifier `calculerScore()` et le bloc fuzzy dans `nettoyageGamme.js`
3. Correction 3 : enrichir l'heuristique rayon dans `gammeExtractionService.js`
4. `npm run build` pour vérifier la compilation

## TESTS VISUELS ATTENDUS

- [ ] "BAG 1/2 CONSTANCE" et "BAG 1/2CONSTANCE" → fusionnés (même produit)
- [ ] "BAG 1/2 CONSTANCE" PAS fusionné avec "BAG CONSTANCE" (produits différents)
- [ ] "MINI BEIGNETS FOUR POM X8" → Ref: MINI BEIGNETS FOURRES POMME (et pas FRAMBOISE)
- [ ] "MOKAS AU CAFE X2" → PAS matché avec SALAMBOS AU KIRSCH
- [ ] "PAIN AUX CEREALES PAC" et "PAIN AUX CEREALES PREC" → PRE/PAC résolu
- [ ] Les canelés, meringuettes, moelleux, opéra → rayon PATISSERIE
- [ ] Le build passe sans erreur

## IMPORTANT

- `scoreTokens` doit être déclarée AVANT `calculerScore` dans le fichier
- Ne PAS toucher à `MagasinContext.jsx` ni aux passes 1-4 du nettoyage (déjà corrigés)
- Lis chaque fichier EN ENTIER avant de le modifier
- Lance `npm run build` à la fin
