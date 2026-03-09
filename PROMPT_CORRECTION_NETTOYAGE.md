# PROMPT POUR CLAUDE CODE — Corrections du nettoyage de gamme

Lis d'abord :
1. `CLAUDE.md`
2. `SPEC_NETTOYAGE_GAMME.md`
3. `src/services/nettoyageGamme.js` (le fichier à corriger)
4. `src/services/referentielITM8.js` (le chargement du référentiel)
5. `src/services/gammeExtractionService.js` (fonction `formaterPourPilotageCA`)
6. `src/components/manager/pilotage/OngletGamme.jsx` (l'affichage)

---

## 5 BUGS À CORRIGER

### BUG 1 — Presque tout est en rayon "AUTRE"

**Cause** : Le matching EAN entre le fichier ventes et le référentiel V2 échoue parce que les EAN du V2 (`EAN PPV`) sont au format `2644410000000` (EAN internes/balance) alors que les ventes utilisent des EAN 13 standards. Quand `infoRef` est `null` dans `formaterPourPilotageCA()`, on tombe sur l'heuristique par mots-clés qui ne couvre que quelques cas.

**Correction** : Deux axes.

1. Dans `referentielITM8.js`, lors du chargement V2, construire le `libelleMap` correctement (actuellement il est vide pour le format V2 car le code V2 ne construit que `itm8Map` sans `libelleMap`). Vérifier que `libelleMap` et `eanMap` sont bien remplis pour le format V2.

2. Dans `nettoyageGamme.js`, à la Passe 5 (`enrichirAvecRefV2`), quand un produit est matché au référentiel V2 (par fuzzy ou EAN), **mettre à jour le rayon du produit** depuis le référentiel :
```javascript
// Après un match réussi, mettre à jour le rayon
if (matchInfo && matchInfo.rayon && matchInfo.rayon !== 'AUTRE') {
  return {
    ...p,
    rayon: matchInfo.rayon,
    famille: matchInfo.rayon,
    matchRefV2: matchInfo,
    libelleRefV2: matchInfo.libelle,
    marqueRefV2: matchInfo.marque || null,
  };
}
```

3. Enrichir l'heuristique de rayon dans `formaterPourPilotageCA()` avec plus de mots-clés :
```javascript
// Ajouter ces cas dans l'heuristique
else if (lib.includes('beignet') || lib.includes('donut') || lib.includes('cookie') || lib.includes('brownie') || lib.includes('muffin') || lib.includes('macaron') || lib.includes('palmier')) {
  rayon = 'PATISSERIE';
} else if (lib.includes('wrap') || lib.includes('panini') || lib.includes('hot dog') || lib.includes('focaccia') || lib.includes('empanada')) {
  rayon = 'SNACKING';
}
```

### BUG 2 — Galettes pas marquées "hors saison"

**Cause** : La Passe 4 (hors saison) teste `if (!p.actif) return p;`. Les galettes commencent par `*` donc elles sont déjà désactivées comme "promo" par la Passe 1. La Passe 4 les ignore.

**Correction** : Pour la détection hors-saison, **ne pas vérifier si le produit est actif**. Un produit promo ET hors-saison doit avoir `raisonDesactivation: 'hors-saison'` (priorité) car c'est plus informatif que juste "promo". Modifier la Passe 4 :

```javascript
const desactiverHorsSaison = (produits, moisPlanning) => {
  if (!moisPlanning) return produits;

  return produits.map(p => {
    // NE PAS tester p.actif ici — on veut détecter le hors-saison
    // même sur des produits déjà désactivés (promo, doublon)
    const libUpper = p.libelle.toUpperCase();

    for (const saisonnier of PRODUITS_SAISONNIERS) {
      const matchMotCle = saisonnier.motsCles.some(mot => libUpper.includes(mot));
      if (!matchMotCle) continue;
      if (libUpper.includes('BUCHETTE')) continue; // exception pains

      if (!saisonnier.moisValides.includes(moisPlanning)) {
        return {
          ...p,
          actif: false,
          raisonDesactivation: 'hors-saison', // écrase 'promo' si déjà mis
        };
      }
    }

    return p;
  });
};
```

### BUG 3 — PRE/PAC pas détectés correctement

**Cause** : La Passe 2 (doublons) fusionne les PRE et PAC avant que la Passe 3 puisse les traiter séparément, car leur libellé normalisé est identique (normaliserLibelle retire "PRE" et "PAC").

**Correction** : Inverser l'ordre — exécuter la Passe 3 (PRE/PAC) **AVANT** la Passe 2 (doublons). Ainsi les PRE sont d'abord désactivés, puis la fusion de doublons ne considère que les produits actifs restants.

Dans `nettoyerGamme()`, changer l'ordre :
```javascript
// Passe 1 : Désactiver les promos (*)
result = desactiverPromos(result);

// Passe 2 : Résoudre PRE/PAC (AVANT la fusion de doublons)
result = resoudrePREPAC(result);

// Passe 3 : Détecter et fusionner les doublons (ne fusionne que les actifs)
result = fusionnerDoublons(result);

// Passe 4 : Désactiver les produits hors saison (même sur les inactifs)
result = desactiverHorsSaison(result, moisPlanning);

// Passe 5 : Matching fuzzy avec le référentiel V2 (enrichissement + rayon)
result = enrichirAvecRefV2(result);
```

Et aussi, dans la détection PRE/PAC, chercher l'équivalent dans TOUS les produits (pas seulement les actifs), car le PAC correspondant pourrait être un produit promo (*) :
```javascript
const resoudrePREPAC = (produits) => {
  return produits.map((p, idx) => {
    if (!p.actif) return p;

    const lib = p.libelle.toUpperCase();
    const isPRE = /\bPRE\b|\bPREC\b|\bPRECUIT/.test(lib);
    if (!isPRE) return p;

    const norm = normaliserLibelle(p.libelle);

    // Chercher un équivalent PAC (actif OU inactif)
    const hasEquivalent = produits.some((autre, i) => {
      if (i === idx) return false;
      const autreNorm = normaliserLibelle(autre.libelle);
      if (autreNorm !== norm) return false;
      const autreLib = autre.libelle.toUpperCase();
      // L'autre ne doit PAS être PRE lui aussi
      return !/\bPRE\b|\bPREC\b|\bPRECUIT/.test(autreLib);
    });

    if (hasEquivalent) {
      return { ...p, actif: false, raisonDesactivation: 'doublon-pre' };
    }
    return p;
  });
};
```

### BUG 4 — 266 "à créer" c'est beaucoup trop

**Cause** : Le matching EAN échoue (formats incompatibles) et le seuil fuzzy de 0.6 est trop strict vu les différences de noms entre ventes et référentiel V2.

**Corrections** :

1. **Baisser le seuil fuzzy à 0.4** (au lieu de 0.6) :
```javascript
if (bestScore > 0.4 && bestMatch) {
```

2. **Améliorer le matching fuzzy** en ajoutant un score "contient" en plus du Jaccard :
```javascript
const calculerScore = (tokensVente, tokensRef) => {
  if (tokensVente.length === 0 || tokensRef.length === 0) return 0;

  const communs = tokensVente.filter(t => tokensRef.includes(t));
  if (communs.length === 0) return 0;

  // Jaccard index
  const union = new Set([...tokensVente, ...tokensRef]).size;
  const jaccard = communs.length / union;

  // Bonus si presque tous les tokens de la vente sont trouvés dans le ref
  // (le ref peut avoir des mots en plus, mais les mots de la vente doivent matcher)
  const couvertureVente = communs.length / tokensVente.length;

  // Score pondéré : 50% Jaccard + 50% couverture des tokens vente
  return (jaccard * 0.5) + (couvertureVente * 0.5);
};
```

3. **Ajouter un matching par sous-chaîne** : si le libellé normalisé de la vente est contenu dans celui du ref (ou inversement), c'est un match direct score=0.8 :
```javascript
// Avant le calcul par tokens, tester inclusion de sous-chaîne
if (normVente.length >= 8) {
  for (const entry of refEntries) {
    if (entry.norm.includes(normVente) || normVente.includes(entry.norm)) {
      // Match par inclusion
      refMatchedItm8.add(entry.itm8);
      return { ...p, rayon: entry.info.rayon || p.rayon, famille: entry.info.rayon || p.famille, matchRefV2: entry.info, libelleRefV2: entry.info.libelle, marqueRefV2: entry.info.marque || null };
    }
  }
}
```

4. **Ne PAS ajouter les "articles à créer" pour les produits dont la marque est "P&C"** dans le référentiel V2 si un produit non-P&C avec le même libellé normalisé existe déjà. Cela évite les doublons P&C dans les suggestions.

### BUG 5 — Ajouter gestion manuelle des doublons

Ajouter dans `OngletGamme.jsx` deux actions contextuelles sur chaque produit désactivé comme doublon :

1. **Bouton "Séparer"** sur les produits marqués `doublon-fusion` ou `doublon-pre` :
   - Remet le produit à `actif: true`, enlève `raisonDesactivation`
   - Sauvegarde la séparation dans `localStorage` sous la clé `bvp_corrections_doublons`
   - Format : `{ separations: ['libelle_normalisé_1', ...], fusions: [{ source: 'libelle1', cible: 'libelle2' }, ...] }`

2. **Bouton "Fusionner avec..."** sur les produits actifs :
   - Ouvre une mini-liste des produits actifs de la même famille
   - Sélectionner un produit → le désactive comme `doublon-fusion`
   - Sauvegarde dans le même localStorage

3. Dans `nettoyerGamme()`, **charger les corrections manuelles** depuis localStorage au début et les appliquer après les passes automatiques :
```javascript
const corrections = JSON.parse(localStorage.getItem('bvp_corrections_doublons') || '{}');

// Après toutes les passes automatiques :
// - Si un libellé normalisé est dans corrections.separations → forcer actif: true
// - Si un libellé est dans corrections.fusions → forcer actif: false, doublon-fusion
```

---

## ORDRE D'EXÉCUTION

1. Corriger Bug 3 d'abord (ordre des passes dans `nettoyerGamme()`)
2. Corriger Bug 2 (hors saison sur produits inactifs)
3. Corriger Bug 1 (rayons + enrichissement rayon depuis matchRefV2)
4. Corriger Bug 4 (seuil fuzzy + sous-chaîne + score pondéré)
5. Implémenter Bug 5 (gestion manuelle doublons dans OngletGamme.jsx)

## TEST

Après correction, lancer `npm run build` pour vérifier la compilation.
Puis vérifier visuellement :
- [ ] Les galettes sont marquées "hors-saison" (et non plus juste "promo")
- [ ] Les produits PRE sont désactivés quand un PAC équivalent existe
- [ ] Les rayons ne sont plus tous "AUTRE"
- [ ] Le nombre de "à créer" est réduit significativement (< 100 au lieu de 266)
- [ ] Le bouton "Séparer" apparaît sur les doublons fusionnés
- [ ] Le build passe sans erreur

## IMPORTANT

- Lis chaque fichier EN ENTIER avant de le modifier
- NE supprime PAS de code existant sans comprendre ses dépendances
- Mets à jour `CLAUDE.md` et `ADDENDUM_CDC_V5.2.md` en fin de travail
- Lance `npm run build` à la fin
