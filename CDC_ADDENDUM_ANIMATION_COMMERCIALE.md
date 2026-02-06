# ADDENDUM CDC - MODULE ANIMATION COMMERCIALE

**À intégrer dans** : CAHIER_DES_CHARGES_V5.md ou V6
**Date** : 28 janvier 2026
**Statut** : Documentation du code existant
**Fichier source** : `src/components/responsable/StepAnimationCommerciale.jsx`

---

## VUE D'ENSEMBLE

Le module Animation Commerciale permet de gérer :
1. **Promotions sur produits existants** (avec calcul automatique d'élasticité)
2. **Produits exceptionnels** (Galette des Rois, Bûche de Noël, etc.)
3. **Impact global sur le CA et la marge**

---

## 1. FORMULE MARGE MOUSQUETAIRES

> **Spécificité Mousquetaires** : La marge est calculée par rapport au PV TTC (et non au PV HT comme dans la méthode classique).

### 1.1 Formules de base

```
Marge % = (PV HT - PA HT) / PV TTC

Donc :
  PA HT = PV HT - (Marge% × PV TTC)
  Marge € = Marge% × PV TTC
```

### 1.2 Exemple concret

| Donnée | Valeur | Calcul |
|--------|--------|--------|
| PV TTC | 1,79 € | Donné |
| TVA | 5,5% | Alimentaire |
| PV HT | 1,70 € | 1,79 / 1,055 |
| Marge % | 42,3% | Donné |
| Marge € | 0,76 € | 0,423 × 1,79 |
| PA HT | 0,94 € | 1,70 - 0,76 |
| Vérification | 42,5% | (1,70 - 0,94) / 1,79 ✓ |

---

## 2. PÉRIODE PROMO MOUSQUETAIRES

### 2.1 Cycle standard

Les promotions Mousquetaires suivent un cycle **mercredi → mardi** (7 jours).

```javascript
// Calcul automatique du prochain mercredi
const getProchainMercredi = () => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilWednesday = (3 - dayOfWeek + 7) % 7 || 7;
  const nextWednesday = new Date(today);
  nextWednesday.setDate(today.getDate() + daysUntilWednesday);
  return nextWednesday.toISOString().split('T')[0];
};
```

### 2.2 Dates personnalisables

Chaque produit peut avoir ses propres dates de promo :
- **Début** : Date de démarrage (pré-rempli avec le mercredi)
- **Fin** : Date de fin (pré-rempli avec le mardi suivant, +6 jours)
- **Durée** : Calculée automatiquement (nombre de jours inclusif)

---

## 3. CALCUL DE L'ÉLASTICITÉ

### 3.1 Formule

```
Élasticité = (Marge normale € / Marge promo €) - 1
```

### 3.2 Plafond

> **IMPORTANT** : L'élasticité est **plafonnée à 2.0** pour éviter des prévisions irréalistes.

```javascript
const PLAFOND_ELASTICITE = 2.0;
const elasticite = Math.min(elasticiteCalculee, PLAFOND_ELASTICITE);
```

Si l'élasticité calculée dépasse 2.0, un message d'avertissement s'affiche.

### 3.3 Interprétation

| Élasticité | Signification | Qté objectif |
|------------|---------------|--------------|
| 0.5 | Faible réponse à la promo | +50% |
| 1.0 | Réponse moyenne | +100% (×2) |
| 1.5 | Forte réponse | +150% |
| 2.0 (plafond) | Très forte réponse | +200% (×3) |

---

## 4. CALCUL DES QUANTITÉS

### 4.1 Quantité normale sur la période

```javascript
// Quantité moyenne par jour (base hebdomadaire)
const qteMoyenneParJour = qteNormaleHebdo / 7;

// Quantité normale sur la période promo
const qteNormalePeriode = qteMoyenneParJour * nbJoursPromo;
```

### 4.2 Quantité objectif avec élasticité

```javascript
const qteObjectif = Math.ceil(qteNormalePeriode * (1 + elasticite));
const qteSupplementaire = qteObjectif - Math.ceil(qteNormalePeriode);
```

### 4.3 Exemple

| Donnée | Valeur |
|--------|--------|
| Qté moyenne hebdo | 70 unités |
| Durée promo | 7 jours |
| Qté normale période | 70 unités |
| Élasticité | 1.5 |
| Qté objectif | 70 × (1 + 1.5) = **175 unités** |
| Qté supplémentaire | +105 unités |

---

## 5. QUANTITÉ VALIDÉE (ÉDITABLE)

L'utilisateur peut **modifier manuellement** la quantité objectif calculée.

### 5.1 Comportement

- **Par défaut** : Qté Validée = Qté Objectif
- **Modifiable** : L'utilisateur peut saisir une autre valeur
- **Impact global** : Recalculé en temps réel selon Qté Validée

### 5.2 Indicateurs visuels

| Situation | Style |
|-----------|-------|
| Qté Validée < Qté Objectif | Bordure orange, fond orange clair |
| Qté Validée = Qté Objectif | Bordure grise |
| Qté Validée > Qté Objectif | Bordure verte, fond vert clair |

### 5.3 Alerte

Si des produits ont une Qté Validée inférieure à la Qté Objectif, un message d'avertissement s'affiche :

```
⚠️ Attention : X produit(s) avec Qté validée < Qté objectif
```

---

## 6. AVANTAGE CLIENT

### 6.1 Formule

```
Avantage Client (%) = ((Prix Normal - Prix Promo) / Prix Normal) × 100
```

### 6.2 Seuils et couleurs

| Avantage | Couleur | Interprétation |
|----------|---------|----------------|
| ≥ 20% | 🟢 Vert (emerald-600) | Très attractif |
| 10-20% | 🟠 Orange (amber-600) | Attractif |
| < 10% | 🔴 Rouge (red-600) | Peu attractif |

### 6.3 Affichage

Badge coloré dans le tableau des promos avec le pourcentage.

---

## 7. PRODUITS EXCEPTIONNELS

### 7.1 Définition

Produits **ponctuels sans historique de ventes** :
- Galette des Rois (janvier)
- Bûche de Noël (décembre)
- Produits saisonniers
- Commandes spéciales

### 7.2 Champs de saisie

| Champ | Type | Obligatoire | Description |
|-------|------|:-----------:|-------------|
| Nom du produit | Texte | ✅ | Ex: "Galette des Rois 6 parts" |
| Quantité / jour | Nombre | ✅ | Quantité prévue par jour |
| Prix unitaire (€) | Nombre | ✅ | Prix de vente TTC |
| Marge % | Nombre | ❌ | Défaut : 40% |
| Famille | Liste | ❌ | PATISSERIE, BOULANGERIE, VIENNOISERIE, SNACKING, NEGOCE |
| Programme | Liste | ❌ | Programme de cuisson associé |
| Jours concernés | Checkboxes | ✅ | Lun, Mar, Mer, Jeu, Ven, Sam, Dim |

### 7.3 Calculs automatiques

```javascript
const nbJours = joursSelectionnes.length;
const qteTotale = qteParJour * nbJours;
const caTotale = qteTotale * prix;
const margeEuros = (margePct / 100) * prix;
const margeTotale = margeEuros * qteTotale;
```

### 7.4 Valeurs par défaut des jours

```javascript
jours: {
  lundi: false,
  mardi: false,
  mercredi: false,
  jeudi: false,
  vendredi: true,   // ← Pré-sélectionné
  samedi: true,     // ← Pré-sélectionné
  dimanche: true    // ← Pré-sélectionné
}
```

---

## 8. IMPACT GLOBAL SUR LE CA

### 8.1 Vue d'ensemble

Le module calcule en temps réel l'impact de toutes les animations sur le CA :

```
CA Prévisionnel = CA Base + Impact Promos + CA Exceptionnels
```

### 8.2 Détail des calculs

```javascript
// Impact des promos
promosActives.forEach(promo => {
  const qteValidee = promo.qteValidee ?? promo.qteObjectif;
  const qteSupp = qteValidee - Math.ceil(qteNormalePeriode);

  // CA supplémentaire = quantités en plus × prix promo
  caSupplementairePromos += qteSupp * promo.prixPromoTTC;

  // Différence de marge
  const margeTotaleNormale = promo.margeNormaleEuros * qteNormalePeriode;
  const margeTotalePromo = promo.margePromoEuros * qteValidee;
  diffMargeTotale += margeTotalePromo - margeTotaleNormale;
});

// Impact des exceptionnels
produitsExceptionnels.forEach(prod => {
  caExceptionnels += qteValidee * prod.prix;
  margeExceptionnels += margeU * qteValidee;
});

// Marge totale = promos + exceptionnels
diffMargeTotale += margeExceptionnels;
```

### 8.3 Affichage

4 cartes principales :

| Carte | Contenu |
|-------|---------|
| **CA Base** | CA total du rayon (passé en prop) |
| **Impact Promos** | CA supplémentaire des promos (+ ou -) |
| **Exceptionnels** | CA des produits exceptionnels (toujours +) |
| **CA Prévisionnel** | Somme totale avec % progression |

3 indicateurs secondaires :

| Indicateur | Signification |
|------------|---------------|
| **Impact Marge** | Différence marge totale (promos + exceptionnels) |
| **Qté Supp. (promos)** | Quantités supplémentaires des promos |
| **Qté Exceptionnels** | Quantités des produits exceptionnels |

### 8.4 Équilibrage de la marge

> **Concept clé** : Les promos réduisent la marge unitaire, mais les exceptionnels (à marge normale) peuvent compenser.

```
Impact Marge Total =
  (Marge promos - Marge normale sur qté normale)
  + Marge exceptionnels
```

Si **Impact Marge > 0** → ✅ Marge globale positive
Si **Impact Marge < 0** → ⚠️ Marge globale négative (à surveiller)

---

## 9. INTERFACE UTILISATEUR

### 9.1 Recherche de produit

La recherche fonctionne par :
1. **Code exact** : PLU, ITM8, EAN (sélection directe)
2. **Désignation** : Recherche textuelle dans le libellé
   - Si 1 résultat → Sélection directe
   - Si plusieurs résultats → Liste déroulante (max 20)

### 9.2 Champs éditables

Après sélection d'un produit, 3 champs sont pré-remplis mais **modifiables** :
- Prix vente actuel (€ TTC)
- Marge % (défaut 42% si non défini)
- Quantité moyenne/sem

### 9.3 Tableau des promos

| Colonne | Description |
|---------|-------------|
| PLU | Code produit |
| Produit | Libellé (tronqué) |
| Prix | Normal barré + Promo en rouge |
| Avt. | Avantage client % (badge coloré) |
| Période | JJ/MM→JJ/MM |
| Jrs | Nombre de jours |
| Hab. | Quantité habituelle sur la période |
| Obj. | Quantité objectif calculée |
| Validée | Input éditable |
| × | Supprimer |

### 9.4 Tableau des exceptionnels

| Colonne | Description |
|---------|-------------|
| Produit | Nom + programme |
| Famille | Badge coloré |
| Jours | Initiales des jours (L M M J V S D) + nb jours |
| Prix | Prix unitaire |
| Marge | % + € unitaire |
| Qté/j | Quantité par jour |
| Qté Valid. | Input éditable |
| CA | Calculé (qté × prix) |
| × | Supprimer |

---

## 10. STRUCTURE DE DONNÉES

### 10.1 Promo

```javascript
{
  plu: "9784",
  itm8: "47416020",
  libelle: "Baguette Tradition 250g",

  // Prix
  prixNormalTTC: 1.79,
  prixPromoTTC: 1.49,
  prixAchatHT: 0.94,

  // Marge
  margePct: 42.3,
  margeNormaleEuros: 0.76,
  margePromoEuros: 0.52,
  tauxMargePromo: 34.9,
  avantageClient: 16.8,

  // Quantités
  elasticite: 0.46,
  qteNormaleHebdo: 450,
  qteNormalePeriode: 450,
  nbJoursPromo: 7,
  qteObjectif: 657,
  qteValidee: 657,
  qteSupplementaire: 207,

  // Dates
  dateDebut: "2026-01-29",
  dateFin: "2026-02-04"
}
```

### 10.2 Produit Exceptionnel

```javascript
{
  id: 1706435200000,  // timestamp unique
  nom: "Galette des Rois 6 parts",

  // Quantités
  qteParJour: 12,
  qteTotale: 36,      // 12 × 3 jours
  qteValidee: 36,

  // Prix et marge
  prix: 15.00,
  margePct: 40,
  margeEuros: 6.00,   // 40% × 15€
  margeTotale: 216,   // 6€ × 36
  prixAchatHT: 8.25,

  // Classification
  famille: "PATISSERIE",
  programme: "Pâtisserie",

  // Jours
  jours: {
    lundi: false,
    mardi: false,
    mercredi: false,
    jeudi: false,
    vendredi: true,
    samedi: true,
    dimanche: true
  },
  joursListe: ["vendredi", "samedi", "dimanche"],
  nbJours: 3,

  // CA
  caTotale: 540       // 36 × 15€
}
```

---

## 11. INTÉGRATION AU PLANNING

Les quantités validées (promos + exceptionnels) sont transmises au module Planning pour être intégrées dans :
- Le planning de cuisson journalier
- Le calcul des plaques
- La fiche de commande

---

## CHANGELOG

| Date | Modification |
|------|--------------|
| 28/01/2026 | Documentation initiale basée sur le code existant |

---

**Document rédigé le 28 janvier 2026**
**Source** : Analyse du fichier `StepAnimationCommerciale.jsx` (1449 lignes)
