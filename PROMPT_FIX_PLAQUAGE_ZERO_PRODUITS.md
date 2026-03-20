# FIX : OngletPlaquage — unitesParPlaque EQUIPE + quantités exemples

## Contexte
Le premier fix (clé `id` au lieu de `itm8`, champ `programme` au lieu de `programmeFour`) a été appliqué et fonctionne : le comptage de produits par programme est maintenant correct (CUISSON FOUR A SOLE = 31, Feuilletage = 7, etc.).

## Problèmes restants

### 1. unitesParPlaque vient du produit gamme (souvent 0), pas de la personnalisation EQUIPE

Le fichier EQUIPE contient `unitesParPlaque` dans les personnalisations :
```json
"1": { "unitesParPlaque": 5, "programme": "CUISSON FOUR A SOLE", ... },
"18": { "unitesParPlaque": 16, "programme": "Viennoiserie PAC", ... },
"47": { "unitesParPlaque": 30, "programme": "Feuilletage", ... }
```

Mais le code actuel (ligne 254) utilise `p.unitesParPlaque` du produit gamme, qui est souvent 0 car non renseigné dans le référentiel ITM.

**Résultat** : la colonne u/pl affiche "-" et le plaquage ne peut pas être calculé, même quand l'EQUIPE a renseigné cette valeur.

### 2. La quantité "matin" est une approximation de 20% (incorrect)

Le code actuel (ligne 257) fait :
```javascript
const qteMatin = Math.ceil(qteHebdo * 0.2); // ~20% pour la 1ère tranche (approximation)
```

C'est une approximation grossière. Pour les exemples dans l'onglet Plaquage, il serait plus juste d'utiliser la quantité quotidienne (hebdo ÷ nombre de jours ouvrés, typiquement 6 ou 7) plutôt que 20%.

## Corrections à faire

### Fichier : `src/components/manager/pilotage/OngletPlaquage.jsx`

#### 1. Helper pour récupérer unitesParPlaque (EQUIPE prioritaire)

Ajouter un helper (après `getProgrammeEffectif`) :
```javascript
// Résoudre unitesParPlaque : personnalisation EQUIPE > produit gamme
const getUnitesParPlaque = useCallback((p) => {
  const idStr = String(p.id);
  const uppEquipe = persosEquipe[idStr]?.unitesParPlaque;
  if (uppEquipe && uppEquipe > 0) return uppEquipe;
  return p.unitesParPlaque || 0;
}, [persosEquipe]);
```

#### 2. Section produits exemples (vers ligne 250-260)

Remplacer :
```javascript
const upp = p.unitesParPlaque || 0;
// Quantité matin approximative = planifieManager / 7 ou moyenneHebdo / 7
const qteHebdo = p.planifieManager || p.potentiel || p.moyHebdo || 0;
const qteMatin = Math.ceil(qteHebdo * 0.2); // ~20% pour la 1ère tranche (approximation)
```

Par :
```javascript
const upp = getUnitesParPlaque(p);
// Quantité quotidienne = hebdo / 6 jours (approximation standard BVP)
const qteHebdo = p.planifieManager || p.potentiel || p.moyHebdo || 0;
const qteJour = Math.ceil(qteHebdo / 6);
```

Et mettre à jour le calcul plaquage :
```javascript
const plaquage = upp > 0
  ? Math.ceil(qteJour * pourcentage / 100 / upp)
  : null;
```

#### 3. Affichage de la quantité (vers ligne 276-278)

Remplacer :
```javascript
{qteMatin}u matin
```
Par :
```javascript
{qteJour}u/jour
```

#### 4. Section total plaques (vers ligne 294-303)

Même correction : utiliser `getUnitesParPlaque(p)` et `qteHebdo / 6` au lieu de `p.unitesParPlaque` et `qteHebdo * 0.2`.

Remplacer :
```javascript
const upp = p.unitesParPlaque || 0;
const qteHebdo = p.planifieManager || p.potentiel || p.moyHebdo || 0;
const qteMatin = Math.ceil(qteHebdo * 0.2);
if (upp > 0) totalPlaques += Math.ceil(qteMatin * pourcentage / 100 / upp);
```
Par :
```javascript
const upp = getUnitesParPlaque(p);
const qteHebdo = p.planifieManager || p.potentiel || p.moyHebdo || 0;
const qteJour = Math.ceil(qteHebdo / 6);
if (upp > 0) totalPlaques += Math.ceil(qteJour * pourcentage / 100 / upp);
```

## Vérification après correction
- Ouvrir l'onglet Plaquage
- Ajouter un produit exemple dans un programme (ex: BAG CONSTANCE dans CUISSON FOUR A SOLE)
- Vérifier que u/pl affiche la valeur EQUIPE (5 u/pl pour BAG CONSTANCE, pas 0)
- Vérifier que la quantité affiche "u/jour" avec un calcul cohérent (hebdo ÷ 6)
- Vérifier que le plaquage en plaques est calculé et affiché (pas "-")

## Ne PAS oublier
Mettre à jour l'ADDENDUM_CDC_V5.2.md section 29 si besoin.
