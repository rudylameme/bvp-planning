# SPÉCIFICATION - Module Communication & Suivi Planning

## 🎯 OBJECTIF MÉTIER

Permettre au Manager de **vérifier visuellement** si les équipes ont appliqué le planning, sans avoir à éplucher les feuilles une par une.

**Problème actuel** : Les équipes disent "tout est fait" mais le CA ne bouge pas → besoin de preuves chiffrées.

---

## 📊 PHASE 1 : Modification Préconisation (Pilotage CA)

### Fichier concerné
`src/components/manager/Etape4PilotageCA.jsx`

### Fonctionnalité
Dans le tableau des produits, la colonne "Potentiel" (suggestion algo) doit être **modifiable** par le Manager.

### Comportement attendu
1. Afficher la valeur suggérée par l'algorithme
2. Permettre au Manager de la modifier (input éditable)
3. Sauvegarder la valeur modifiée comme "Planifié Manager"
4. Recalculer le CA Hebdo en conséquence

### Maquette
```
| Produit         | Moy.Hebdo | Potentiel | Planifié ✏️ | CA Hebdo |
|-----------------|-----------|-----------|-------------|----------|
| Baguette Trad   | 161       | 229       | [250]       | 642 €    |
```

Le champ [250] est éditable. Par défaut = Potentiel.

---

## 📁 PHASE 2 : Export Archive (Étape Communication)

### Fichier à créer
`src/components/manager/Etape5Communication.jsx`

### Déclencheur
Quand le Manager clique "Valider et exporter" dans l'étape Communication.

### Contenu du fichier archive

```json
{
  "schemaVersion": "3.0",
  "type": "planning-archive",
  "exportDate": "2026-02-02T14:30:00Z",

  "magasin": {
    "code": "XXXXX",
    "nom": "INTERMARCHE TREVILLE"
  },

  "semaine": {
    "numero": 7,
    "annee": 2026,
    "dateDebut": "2026-02-09",
    "dateFin": "2026-02-15"
  },

  "configuration": {
    "joursActifs": ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"],
    "tranchesHoraires": [
      { "id": 1, "debut": "06:00", "fin": "09:00", "label": "Matin" },
      { "id": 2, "debut": "11:00", "fin": "13:00", "label": "Midi" },
      { "id": 3, "debut": "16:00", "fin": "19:00", "label": "Soir" }
    ],
    "operationsSpeciales": []
  },

  "promotions": [
    {
      "plu": "789012",
      "libelle": "BAGUETTE TRADITION",
      "type": "promo",
      "dateDebut": "2026-02-10",
      "dateFin": "2026-02-12",
      "prixPromo": 0.89,
      "prixNormal": 1.15,
      "quantitePrevue": 300,
      "misEnAvant": true,
      "emplacement": "tête de gondole"
    }
  ],

  "objectifs": {
    "caHistorique": 13070,
    "objectifPourcent": 18,
    "caPrevision": 17826
  },

  "produits": [
    {
      "plu": "123456",
      "libelle": "BAGUETTE TRADITION",
      "famille": "PAIN",
      "rayon": "BVP",
      "actif": true,
      "moyenneHebdo": 161,
      "potentielAlgo": 229,
      "planifieManager": 250,
      "typeCuisson": "four",
      "conditionnement": "unité",
      "repartitionJours": {
        "lundi": 40,
        "mardi": 35,
        "mercredi": 35,
        "jeudi": 40,
        "vendredi": 45,
        "samedi": 55
      }
    }
  ],

  "referentiel": {
    "version": "ITM8-2026",
    "inclus": true,
    "familles": ["PAIN", "VIENNOISERIE", "PATISSERIE", "SNACKING"],
    "source": "liste des produits BVP treville.xlsx"
  }
}
```

### Nommage du fichier
`PLANNING-[CODE_PDV]-S[SEMAINE]-[ANNEE].bvp.json`

Exemple : `PLANNING-12345-S07-2026.bvp.json`

### Stockage
- Dossier choisi par l'utilisateur via File System Access API
- Ce même dossier est utilisé par le profil Équipe pour charger les données

---

## 📈 PHASE 3 : Onglet Comparaison (Pilotage CA)

### Fichier concerné
`src/components/manager/Etape4PilotageCA.jsx`

### Nouvel onglet
Ajouter un onglet "📊 Suivi Planning" à côté de Gamme, Limites, Promo, Commande

### Données nécessaires
1. **Planning archivé** de la semaine S-1 (fichier .bvp.json)
2. **Ventes réelles** de la semaine S-1 (fichier Excel ventes)
3. **Casse réelle** de la semaine S-1 (fichier Excel casse)

### Tableau de comparaison

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 📊 SUIVI APPLICATION PLANNING - Semaine 6 / 2026                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SYNTHÈSE GLOBALE                                                           │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐             │
│  │ Planifié     │ Ventes       │ Casse        │ Application  │             │
│  │ 2 450 unités │ 2 180 unités │ 245 unités   │ 99% ✅       │             │
│  └──────────────┴──────────────┴──────────────┴──────────────┘             │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ DÉTAIL PAR PRODUIT                                                          │
│                                                                             │
│ Produit              │ Planifié │ Ventes │ Casse │ Total │ %Appli │ Status │
│ ─────────────────────┼──────────┼────────┼───────┼───────┼────────┼────────│
│ Baguette Tradition   │ 250      │ 200    │ 48    │ 248   │ 99%    │ ✅     │
│ Croissant Beurre     │ 100      │ 50     │ 0     │ 50    │ 50%    │ ⚠️     │
│ Pain au Chocolat     │ 80       │ 105    │ 12    │ 117   │ 146%   │ 🔴↗️   │
│ Baguette Céréales    │ 60       │ 58     │ 5     │ 63    │ 105%   │ ✅     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Indicateurs visuels

| % Application | Status | Signification |
|---------------|--------|---------------|
| 90% - 110%    | ✅     | Parfait, équipe suit le planning |
| < 90%         | ⚠️     | Sous-production, équipe n'a pas suivi |
| > 110%        | 🔴↗️   | Sur-production, revoir prévisions |

### Calcul
```
% Application = (Ventes + Casse) / Planifié × 100
```

---

## 🔄 FLUX DE DONNÉES

```
SEMAINE S-1 (passée)              SEMAINE S (actuelle)
─────────────────────             ────────────────────

Manager planifie S-1              Manager ouvre Pilotage CA
       │                                 │
       ▼                                 │
Export archive S-1                       │
(PLANNING-XXX-S06.bvp.json)             │
       │                                 │
       └──────────────────┐              │
                          ▼              ▼
                    Charger archive + Charger ventes réelles
                                 │
                                 ▼
                    Afficher comparaison S-1
                    (Onglet "Suivi Planning")
```

---

## ⚠️ POINTS D'ATTENTION

1. **Référentiel** : Inclus dans l'app (pas géré par l'utilisateur)
2. **Dossier archive** : Un seul dossier partagé Manager ↔ Équipe
3. **Retrocompatibilité** : Les anciens fichiers .bvp.json (schemaVersion 2.0) doivent rester lisibles
4. **Performance** : Ne charger les données de comparaison que quand on ouvre l'onglet

---

## 📝 ORDRE D'IMPLÉMENTATION

1. **PHASE 1** : Colonne "Planifié" éditable dans Pilotage CA
2. **PHASE 2** : Étape Communication avec export archive complet
3. **PHASE 3** : Onglet "Suivi Planning" avec comparaison

Chaque phase peut être implémentée indépendamment.
