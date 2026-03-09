# SPÉCIFICATION TECHNIQUE — Nettoyage Intelligent de la Gamme Produits

**Date** : 23 février 2026
**Priorité** : Haute (bloquant pour l'adoption utilisateur)
**Coût runtime** : 0€ (100% côté client, aucun appel API)

---

## CONTEXTE DU PROBLÈME

À l'étape "Pilotage CA" (Etape4PilotageCA), le manager voit ~300 produits **tous activés par défaut**. C'est inutilisable :
- Produits en promo (`*` au début du nom) mélangés aux produits normaux
- Doublons (même produit, 2 lignes avec EAN différents)
- Doublons PRE/PAC (PRE = ancien format precuit, PAC = prêt à cuire = version actuelle)
- Produits hors saison (galettes en février, coquilles de Noël en mars)
- Noms abrégés/tronqués qui ne matchent pas le référentiel

**Objectif** : pré-traiter automatiquement la gamme pour ne proposer que les produits pertinents, avec des tags visuels expliquant chaque décision. L'utilisateur garde la main pour réactiver/désactiver.

---

## PARTIE 1 : MISE À JOUR DU RÉFÉRENTIEL (referentielITM8.js)

### 1.1 Nouveau fichier référentiel

Remplacer `liste des produits BVP treville.xlsx` par `referentiel V2.xlsx` dans `public/Data/`.

**Structure du nouveau fichier (colonnes) :**

| Index | Nom colonne | Usage |
|-------|-------------|-------|
| 0 | PLU | Code PLU pour étiquettes |
| 1 | CODE BALANCE | Code balance (non utilisé) |
| 2 | LIBELLE CODE BALANCE | Catégorie balance (non utilisé) |
| 3 | ITM 8 | Code ITM8 (clé primaire) |
| 4 | EAN PPV | Code EAN13 |
| 5 | LIBELLE FAMILLE | Famille produit (PAIN SURGELE, VIENNOISERIE SURGELEE, etc.) |
| 6 | LIBELLE SOUS FAMILLE | Sous-famille (BAGUETTE BLANCHE, CROISSANT, etc.) |
| 7 | LIBELLE CODE PLU | **Libellé officiel du produit** (c'est LE nom à utiliser) |
| 8 | MARQUE | Marque (P&C, ARGRU, DOTS, etc. ou "Non renseigne") |
| 9 | COMPOSITION | Ingrédients (non utilisé pour le matching) |
| 10 | DLC | Durée de vie (non utilisé) |
| 11-13 | Divers | Non utilisés |

### 1.2 Modifications dans `referentielITM8.js`

Adapter `chargerReferentielITM8()` pour lire les nouvelles colonnes. Le mapping :

```javascript
// ANCIEN (V1 treville)
itm8 = row['ITM8']
libelle = row['Libellé produit']
rayon = row['RAYON']
programme = row['Programme de cuisson']
famille = row['Libellé Fam']
sousFamille = row['Libellé SFam']
ean13 = row['EAN13']
codePLU = row['Code PLU'] || row['PLU']
unitesParVente = row['unit / lot']
unitesParPlaque = row["Nombre d'unit par plaque"]

// NOUVEAU (V2)
itm8 = row['ITM 8']                    // attention: espace avant le 8
libelle = row['LIBELLE CODE PLU']       // nouveau nom de colonne
famille = row['LIBELLE FAMILLE']        // remplace 'Libellé Fam'
sousFamille = row['LIBELLE SOUS FAMILLE'] || row['LIBELLE SOUS FAMILLE ']  // attention trailing space !
ean13 = row['EAN PPV']                  // remplace 'EAN13'
codePLU = row['PLU']
marque = row['MARQUE']                  // NOUVEAU champ
// programme, unitesParVente, unitesParPlaque : ABSENTS du V2 → garder '' / 1 / 0 par défaut
// rayon : ABSENT du V2 → déduire de LIBELLE FAMILLE via mapFamilleVersRayon()
```

### 1.3 Nouveau mapping famille → rayon

Le V2 n'a plus de colonne "RAYON". Créer un mapping :

```javascript
const mapFamilleV2VersRayon = (libelleFamille) => {
  const f = (libelleFamille || '').toUpperCase();
  if (f.includes('PAIN')) return 'BOULANGERIE';
  if (f.includes('VIENNOISERIE')) return 'VIENNOISERIE';
  if (f.includes('PATISSERIE')) return 'PATISSERIE';
  if (f.includes('SNACKING') || f.includes('TRAITEUR')) return 'SNACKING';
  return 'AUTRE';
};
```

### 1.4 Ajouter `marque` dans ProductInfo

Ajouter le champ `marque` dans l'objet stocké dans `itm8Map` :

```javascript
itm8Map.set(itm8, {
  itm8,
  ean13: ean13Raw,
  libelle: ...,
  rayon: mapFamilleV2VersRayon(famille),
  programme: '',  // absent du V2
  famille,
  sousFamille,
  poids: 0,
  unitesParVente: 1,
  unitesParPlaque: 0,
  codePLU,
  marque,         // NOUVEAU
});
```

### 1.5 Rétrocompatibilité

La fonction `chargerReferentielITM8()` doit **auto-détecter** le format :
- Si la première ligne contient "ITM8" (sans espace) → format V1
- Si la première ligne contient "ITM 8" (avec espace) → format V2
- Garder le code V1 existant, ajouter une branche V2

### 1.6 Mettre à jour les chemins

Dans ces fichiers, remplacer `'/Data/liste des produits BVP treville.xlsx'` par `'/Data/referentiel V2.xlsx'` :
- `src/components/manager/WizardManager.jsx` (ligne 61)
- `src/components/manager/WizardBenchmark.jsx` (ligne 52)
- `src/components/responsable/WizardResponsable.jsx` (ligne 85)
- `src/components/manager/Etape5Communication.jsx` (ligne 270, dans `referentiel.source`)

---

## PARTIE 2 : SERVICE DE NETTOYAGE (nouveau fichier `nettoyageGamme.js`)

### 2.1 Créer `src/services/nettoyageGamme.js`

Ce service prend un tableau de produits (sortie de `formaterPourPilotageCA()`) et retourne le même tableau avec des champs supplémentaires.

### 2.2 Champs ajoutés à chaque produit

```javascript
{
  ...produitExistant,
  actif: true/false,           // décision automatique (modifiable par l'utilisateur)
  raisonDesactivation: null,   // null si actif, sinon string
  // Valeurs possibles de raisonDesactivation :
  //   'promo'           → libellé commence par *
  //   'hors-saison'     → produit saisonnier hors période
  //   'doublon-pre'     → version PRE remplacée par PAC
  //   'doublon-fusion'  → fusionné avec un autre produit (même libellé normalisé)
  //   'ca-negligeable'  → CA < 0.5% du total famille (optionnel)

  matchRefV2: null,            // null si pas de match, sinon objet du référentiel V2
  aCreer: false,               // true si le produit existe dans V2 mais pas dans les ventes
  libelleRefV2: null,          // libellé officiel du référentiel V2
  marqueRefV2: null,           // marque du référentiel V2
}
```

### 2.3 Algorithme principal

```javascript
export function nettoyerGamme(produits, semaineNumero, moisPlanning) {
  // Passe 1 : Désactiver les promos (*)
  // Passe 2 : Détecter et fusionner les doublons (même libellé normalisé)
  // Passe 3 : Résoudre PRE/PAC (garder PAC, désactiver PRE)
  // Passe 4 : Désactiver les produits hors saison
  // Passe 5 : Matching fuzzy avec le référentiel V2 (enrichissement)
  return produitsNettoyes;
}
```

### 2.4 Passe 1 — Promos

```javascript
const desactiverPromos = (produits) => {
  return produits.map(p => {
    if (p.libelle.trim().startsWith('*')) {
      return { ...p, actif: false, raisonDesactivation: 'promo' };
    }
    return p;
  });
};
```

### 2.5 Passe 2 — Fusion des doublons

Deux produits sont des doublons si leur **libellé normalisé** est identique.

```javascript
const normaliserLibelle = (lib) => {
  return lib
    .toUpperCase()
    .replace(/^\*/, '')                    // retirer * initial
    .replace(/\bP&C\b/g, '')              // retirer P&C
    .replace(/\bPAC\b/g, '')              // retirer PAC
    .replace(/\bCRU\b/g, '')              // retirer CRU
    .replace(/\bPRE\b|\bPREC\b/g, '')     // retirer PRE/PREC
    .replace(/\bDECONGELE[ES]?\b/g, '')   // retirer DECONGELE
    .replace(/\d+G\b/g, '')               // retirer poids (250G, 300G)
    .replace(/\d+KG?\b/g, '')             // retirer poids kg
    .replace(/\s+/g, ' ')                 // normaliser espaces
    .trim();
};
```

Grouper par libellé normalisé. Si plusieurs produits dans le même groupe :
- Garder celui avec le **CA hebdo le plus élevé**
- Fusionner les quantités (sommer)
- Taguer les autres `raisonDesactivation: 'doublon-fusion'`

### 2.6 Passe 3 — PRE vs PAC

Pour chaque produit contenant "PRE" ou "PREC" dans le libellé :
- Chercher un produit avec le même libellé normalisé (sans PRE/PAC)
- S'il existe un équivalent PAC → désactiver le PRE avec `raisonDesactivation: 'doublon-pre'`
- S'il n'existe pas de PAC → garder le PRE actif

### 2.7 Passe 4 — Produits hors saison

Table des produits saisonniers (basée sur les mots-clés dans le libellé ET la sous-famille du référentiel) :

```javascript
const PRODUITS_SAISONNIERS = [
  // Galettes des rois : janvier uniquement
  { motsCles: ['GALETTE', 'FRANGIPANE', 'EPIPHANIE'], moisValides: [1], sousFamille: 'GALETTE' },
  // Coquilles de Noël : novembre-décembre uniquement
  { motsCles: ['NOEL', 'NOËL'], moisValides: [11, 12] },
  // Bûches de Noël (pas les buchettes pain !) : novembre-décembre
  // ATTENTION : "BUCHETTE" dans sf "BAGUETTE ET PAIN SPECIAUX" n'est PAS saisonnier !
  { motsCles: ['BUCHE DE NOEL', 'BUCHE GLACEE'], moisValides: [11, 12] },
];
```

**IMPORTANT** : les "buchettes" (BUCHETTE AUX FIGUES, BUCHETTE AUX NOIX, BUCHETTE BISEAU) sont des **pains** (sous-famille "BAGUETTE ET PAIN SPECIAUX"), PAS des bûches de Noël. Ne PAS les désactiver.

Vérifier le `moisPlanning` (mois de la semaine de planning) contre les `moisValides`. Si hors période → `actif: false`, `raisonDesactivation: 'hors-saison'`.

### 2.8 Passe 5 — Matching fuzzy avec référentiel V2

Pour chaque produit qui n'a PAS été reconnu par le matching EAN/ITM8 existant (`reconnu === false`) :

1. **Normaliser** le libellé ventes avec `normaliserLibelle()`
2. **Normaliser** chaque libellé du référentiel V2 avec la même fonction
3. **Score de similarité** basé sur les tokens communs :

```javascript
const calculerScore = (tokensVente, tokensRef) => {
  const communs = tokensVente.filter(t => tokensRef.includes(t));
  if (communs.length === 0) return 0;
  // Jaccard index pondéré par la longueur des tokens
  const union = new Set([...tokensVente, ...tokensRef]).size;
  return communs.length / union;
};
```

4. Si score > **0.6** → proposer le match dans `matchRefV2`
5. Si le produit est dans le référentiel V2 mais PAS dans les ventes → `aCreer: true`

### 2.9 Propositions "article à créer"

Après le matching, parcourir le référentiel V2. Les produits du V2 qui n'ont été matchés à aucun produit des ventes → les ajouter à la liste avec :
```javascript
{
  id: 'ref-v2-' + itm8,
  libelle: libelleRefV2,
  libelleRefV2: libelleRefV2,
  plu: codePLU,
  ean13: ean13,
  itm8: itm8,
  rayon: mapFamilleV2VersRayon(famille),
  famille: rayon,
  marqueRefV2: marque,
  actif: false,
  aCreer: true,
  raisonDesactivation: 'article-a-creer',
  // Pas de données de vente
  moyHebdo: 0,
  potentiel: 0,
  caSemaine: 0,
  tauxCasse: 0,
}
```

---

## PARTIE 3 : INTÉGRATION DANS formaterPourPilotageCA()

### 3.1 Dans `gammeExtractionService.js`

À la fin de `formaterPourPilotageCA()`, avant le `return`, appeler le nettoyage :

```javascript
import { nettoyerGamme } from './nettoyageGamme';

export function formaterPourPilotageCA(data, options = {}) {
  const { semaineNumero, moisPlanning } = options;

  // ... code existant qui crée le tableau produits ...

  // Nettoyage intelligent
  const produitsNettoyes = nettoyerGamme(produits, semaineNumero, moisPlanning);

  return produitsNettoyes;
}
```

### 3.2 Passer les options depuis l'appel

Dans `EtapeConfigPlanning.jsx`, quand on appelle `formaterPourPilotageCA()` (dans `handleSelectMagasin`), passer `semaineNumero` et `moisPlanning` :

```javascript
const moisPlanning = new Date(
  semaineAppliquee.annee, 0, 1 + (semaineAppliquee.semaine - 1) * 7
).getMonth() + 1;

const produitsGamme = formaterPourPilotageCA(donneesVC, {
  semaineNumero: semaineAppliquee.semaine,
  moisPlanning,
});
```

---

## PARTIE 4 : AFFICHAGE DANS OngletGamme.jsx

### 4.1 Tags visuels

Ajouter des badges de couleur à côté du nom du produit :

| Tag | Couleur | Texte |
|-----|---------|-------|
| promo | rouge-200 | "Promo" |
| hors-saison | orange-200 | "Hors saison" |
| doublon-pre | slate-200 | "→ version PAC" |
| doublon-fusion | slate-200 | "Doublon fusionné" |
| article-a-creer | blue-200 | "À créer" |
| P&C (marque) | amber-200 | "P&C" |

### 4.2 Compteurs dans le header

Afficher en haut de l'onglet Gamme :
```
✅ 85 actifs | ⏸️ 45 promos | 🔄 12 doublons | ❄️ 3 hors saison | ➕ 8 à créer
```

### 4.3 Filtre par statut

Ajouter un filtre dropdown (ou des boutons) pour afficher :
- Tous
- Actifs uniquement
- Désactivés uniquement
- Articles à créer uniquement

### 4.4 L'utilisateur garde la main

Le toggle actif/inactif reste fonctionnel. Si l'utilisateur réactive un produit désactivé automatiquement, la `raisonDesactivation` reste visible (en gris) mais le produit est traité comme actif.

---

## PARTIE 5 : FICHIERS À MODIFIER

| Fichier | Action |
|---------|--------|
| `public/Data/referentiel V2.xlsx` | Déjà présent — c'est le nouveau référentiel |
| `src/services/referentielITM8.js` | Adapter pour format V2 (auto-détection V1/V2) + ajouter champ `marque` |
| `src/services/nettoyageGamme.js` | **NOUVEAU** — service de nettoyage intelligent |
| `src/services/gammeExtractionService.js` | Appeler `nettoyerGamme()` à la fin de `formaterPourPilotageCA()` |
| `src/components/manager/EtapeConfigPlanning.jsx` | Passer `semaineNumero` et `moisPlanning` à `formaterPourPilotageCA()` |
| `src/components/manager/pilotage/OngletGamme.jsx` | Ajouter tags visuels, compteurs, filtre par statut |
| `src/components/manager/WizardManager.jsx` | Chemin référentiel → `referentiel V2.xlsx` |
| `src/components/manager/WizardBenchmark.jsx` | Chemin référentiel → `referentiel V2.xlsx` |
| `src/components/responsable/WizardResponsable.jsx` | Chemin référentiel → `referentiel V2.xlsx` |
| `src/components/manager/Etape5Communication.jsx` | `referentiel.source` → `referentiel V2.xlsx` |

---

## CONTRAINTES

1. **Ne PAS supprimer** les produits désactivés — les garder visibles (grisés) avec la raison
2. **Ne PAS casser** le toggle actif/inactif existant
3. **Ne PAS modifier** les formules de calcul (potentiel, CA, etc.)
4. **Garder** la rétrocompatibilité avec le référentiel V1 (auto-détection)
5. **Les "buchettes"** (BUCHETTE AUX FIGUES, AUX NOIX, BISEAU) sont des PAINS, PAS des bûches de Noël
6. **P&C** = ancienne marque. Si un produit V2 a la marque "P&C" ET qu'un autre produit V2 a le même libellé normalisé sans "P&C" → privilégier le non-P&C
7. **Performance** : le nettoyage doit tourner en < 500ms pour 400 produits

---

## ORDRE D'IMPLÉMENTATION RECOMMANDÉ

1. `referentielITM8.js` — adapter pour V2 (tester que le chargement fonctionne)
2. `nettoyageGamme.js` — créer le service (tester passe par passe)
3. `gammeExtractionService.js` — intégrer l'appel
4. `EtapeConfigPlanning.jsx` — passer les options
5. `OngletGamme.jsx` — affichage tags + compteurs + filtre
6. Chemins référentiel dans les 4 wizards

---

## TEST RAPIDE

Après implémentation, vérifier :
- [ ] Le référentiel V2 se charge sans erreur (`isReferentielCharge() === true`)
- [ ] Un produit avec `*` au début est bien désactivé avec tag "Promo"
- [ ] Deux produits avec le même nom (variantes) sont fusionnés
- [ ] Un produit PRE est désactivé si son équivalent PAC existe
- [ ] "GALETTE FRANGIPANE" est désactivé en février (hors saison)
- [ ] "BUCHETTE AUX NOIX" n'est PAS désactivé (c'est un pain, pas saisonnier)
- [ ] Le compteur en haut affiche les bons chiffres
- [ ] Le toggle actif/inactif fonctionne toujours manuellement
- [ ] Les produits V2 non matchés apparaissent comme "À créer"
