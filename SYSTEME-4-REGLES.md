# Système de Planification à 4 Règles

## Vue d'ensemble

Le système de planification utilise 4 règles hiérarchiques pour calculer les préconisations de production :

### 🔢 Règle 1 : Calcul Mathématique
- Trouve la **vente maximale** dans l'historique
- Identifie le **jour** de cette vente max
- Calcule le **potentiel hebdomadaire** : `venteMax / poidsJour`
- Distribue ce potentiel sur la semaine selon les poids de fréquentation

**Exemple** : Si la vente max est 62 unités le dimanche (poids 15%), le potentiel hebdo = 62 / 0.15 = 413 unités

### 🛡️ Règle 2 : Protection Minimum
- La préconisation **ne peut jamais être inférieure** aux ventes historiques du jour
- Garantit qu'on ne recommande jamais moins que ce qui a déjà été vendu
- Évite les ruptures de stock

**Exemple** : Si le calcul mathématique donne 40 mais l'historique est 45, on garde 45

### 📊 Règle 3 : Limites par Variante

Trois variantes disponibles **par rayon ET par jour** :

| Variante | Description | Limite |
|----------|-------------|---------|
| **Sans** | Potentiel mathématique pur | Aucune limite |
| **Forte** | Croissance prudente | Max +20% vs historique |
| **Faible** | Croissance très prudente | Max +10% vs historique |

**Exemple avec variante FORTE** :
- Historique : 40 unités
- Calcul mathématique : 75 unités
- Progression : (75-40)/40 = +87.5% → Trop élevé !
- Résultat : 40 × 1.20 = 48 unités ✅

### ✏️ Règle 4 : Modification Manuelle
- **Surcharge toutes les autres règles**
- Permet à l'utilisateur d'ajuster manuellement n'importe quelle préconisation
- La valeur manuelle est conservée lors des recalculs de variante

## Interface Utilisateur

### Sélection des Variantes
- Un dropdown **par jour** dans l'en-tête de chaque colonne
- Permet des stratégies différentes par jour (ex: Fort en semaine, Faible le weekend)
- Recalcule automatiquement tout le rayon lors du changement

### Cellules du Tableau
Chaque cellule affiche :
```
┌─────────────┐
│ Préco: 48   │ ← Éditable (Règle 4)
│ Histo: 40   │ ← Lecture seule
│ +20%        │ ← Recalculé instantanément
└─────────────┘
```

### Couleurs d'Alerte
- 🟢 **Vert** : Écart > +20% (forte croissance)
- 🔵 **Bleu** : Écart +10% à +20% (croissance modérée)
- ⚪ **Blanc** : Écart -10% à +10% (stable)
- 🟠 **Orange** : Écart 0% à -10% (légère baisse)
- 🔴 **Rouge** : Écart < -10% (forte baisse)

## Flux de Calcul

```
1. Charger les ventes historiques
   ↓
2. Calculer le potentiel mathématique (Règle 1)
   ↓
3. Distribuer sur la semaine selon poids
   ↓
4. Pour chaque jour :
   ├─ Vérifier le minimum (Règle 2)
   ├─ Appliquer la variante (Règle 3)
   └─ Appliquer les modifs manuelles (Règle 4)
   ↓
5. Calculer les créneaux (Matin/Midi/Soir)
```

## Exemples Pratiques

### Scénario 1 : Lancement Produit Nouveau
**Problème** : Pas d'historique fiable

**Solution** : Variante "SANS"
- Utilise uniquement le calcul mathématique
- Maximise le potentiel de vente
- Risque de surproduction acceptable en phase test

### Scénario 2 : Produit Établi
**Problème** : Équilibre entre croissance et gaspillage

**Solution** : Variante "FORTE"
- Permet +20% de croissance max
- Protège contre les écarts trop importants
- Encourage la croissance progressive

### Scénario 3 : Produit Fragile/Coûteux
**Problème** : Minimiser le gaspillage

**Solution** : Variante "FAIBLE"
- Limite à +10% de croissance
- Approche très conservatrice
- Préserve les marges

### Scénario 4 : Événement Spécial
**Problème** : Jour férié, promotion, etc.

**Solution** : Modification manuelle (Règle 4)
- Ignorer tous les calculs automatiques
- Ajuster manuellement selon expertise
- La modification est conservée

## Tests

Exécuter les tests de validation :

```bash
# Test du système complet
node test-4-regles.js

# Test de modification manuelle
node test-modification-manuelle.js
```

## Architecture Technique

### Fichiers Modifiés
- `src/services/planningRecalculator.js` : Logique des 4 règles
- `src/components/EtapePlanning.jsx` : UI et gestion d'état
- `src/App.jsx` : Passage des props

### États React
```javascript
// Variantes par rayon et jour
variantesParRayonEtJour: {
  'BOULANGERIE': {
    'lundi': 'forte',
    'mardi': 'forte',
    'mercredi': 'faible',
    // ...
  }
}

// Modifications manuelles
modificationsManuellesParRayonEtJour: {
  'BOULANGERIE': {
    'lundi': {
      'BAGUETTE BLANCHE': 50,
      // ...
    }
  }
}
```

## Avantages du Système

✅ **Flexibilité** : Variantes jour par jour
✅ **Protection** : Minimum = historique (Règle 2)
✅ **Contrôle** : Modifications manuelles prioritaires (Règle 4)
✅ **Progressivité** : Limites de croissance ajustables (Règle 3)
✅ **Visibilité** : Écarts calculés en temps réel
✅ **Cohérence** : Basé sur données réelles (Règle 1)
