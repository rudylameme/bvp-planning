# PLANNING DE DÉVELOPPEMENT - BVP Planning V2

**Date de création** : 13 janvier 2026
**Dernière mise à jour** : 18 janvier 2026

---

## LÉGENDE DES STATUTS

| Statut | Description |
|--------|-------------|
| ✅ | Terminé |
| 🔄 | En cours |
| ⏳ | À faire |
| 🔴 | Bloqué / Problème |
| 📝 | À discuter |

---

## RÉCAPITULATIF RAPIDE

| Module | Statut | Priorité |
|--------|--------|----------|
| Import données | ✅ | - |
| Configuration semaine | ✅ | - |
| Pilotage CA + Tendance/Fiabilité | ✅ | - |
| Animation Commerciale (Promos) | ✅ | - |
| Animation Commerciale (Produits Exceptionnels) | ✅ | - |
| Module Commande (Responsable) | ✅ | - |
| Module Commande (Équipier - InventaireStock) | ✅ | - |
| Export fichier .bvp.json | ✅ | - |
| Planning Jour (Équipier) | ✅ | - |
| Fiche impression commande | ✅ | - |
| Stock mini dynamique (3j/1.5j) | ✅ | - |
| Marquage produits en promo (⭐) | ✅ | - |
| Recherche multi-résultats promos | ✅ | - |
| Échange fichiers Manager ↔ Équipe | ✅ | - |
| Écran Inventaire Équipe (tablette) | ✅ | - |
| Optimisation impression Planning | ⏳ | Haute |
| Module Casse (Équipier) | 📝 | Moyenne |
| Module Plaquage Demain (Équipier) | 📝 | Moyenne |
| Tests et corrections | ⏳ | Continue |

---

## JOUR 1 - 13 JANVIER 2026 ✅

### Réalisations

| Tâche | Statut | Fichiers créés/modifiés |
|-------|--------|-------------------------|
| Créer `conditionnementService.js` | ✅ | `src/services/conditionnementService.js` |
| Créer `StepCommande.jsx` (Responsable) | ✅ | `src/components/responsable/StepCommande.jsx` |
| Créer `InventaireStock.jsx` (Équipier) | ✅ | `src/components/equipe/InventaireStock.jsx` |
| Intégrer StepCommande dans Wizard (6 étapes) | ✅ | `WizardResponsable.jsx`, `ProgressBar.jsx` |
| Ajouter export commande dans `.bvp.json` | ✅ | `WizardTermine.jsx` |
| Ajouter colonnes Tendance/Fiabilité | ✅ | `PilotageCA.jsx` |
| Vérifier le build | ✅ | - |

### Notes
- Le Wizard passe de 5 à 6 étapes
- Les données de commande sont exportées dans le fichier .bvp.json
- Les colonnes Tendance et Fiabilité utilisent les fonctions existantes de `potentielCalculator.js`

---

## JOUR 2 - 14 JANVIER 2026 ⏳

### Objectif principal : Optimisation de l'impression du Planning

**Problème identifié** : L'impression génère 22 pages au lieu de 7-8 (comme en V1)

| Tâche | Statut | Description | Priorité |
|-------|--------|-------------|----------|
| Analyser le format V1 du planning | ⏳ | Comprendre la mise en page compacte | Haute |
| Créer composant `PlanningHebdoCompact.jsx` | ⏳ | Vue 7 jours en colonnes sur 1-2 pages | Haute |
| Ajouter mode impression dans `PlanningJour.jsx` | ⏳ | CSS print spécifique | Haute |
| Réduire les marges et taille police | ⏳ | Optimiser pour l'impression | Haute |
| Tester impression sur différents navigateurs | ⏳ | Chrome, Safari, Firefox | Moyenne |

### Objectif secondaire : Tests du Module Commande

| Tâche | Statut | Description |
|-------|--------|-------------|
| Tester chargement fichier conditionnements | ⏳ | Vérifier les 750 produits |
| Tester calcul des besoins en cartons | ⏳ | Vérifier les formules |
| Tester sauvegarde stocks (Équipier) | ⏳ | Vérifier localStorage |
| Tester import fichier avec commande | ⏳ | Côté équipier |

---

## JOUR 3 - 15 JANVIER 2026 ⏳

### Objectif : Modules Équipier complémentaires

| Tâche | Statut | Description | Priorité |
|-------|--------|-------------|----------|
| Vérifier module Casse existant | ⏳ | Analyser si fonctionnel | Moyenne |
| Vérifier module Plaquage Demain | ⏳ | Analyser si fonctionnel | Moyenne |
| Intégrer InventaireStock dans navigation équipe | ⏳ | Ajouter dans le menu | Haute |
| Tests end-to-end flux complet | ⏳ | Responsable → Export → Équipier | Haute |

---

## JOUR 4 - 16 JANVIER 2026 🔄

### Session de revue avec démo live

**Observations de la démo** :

| Écran | Observation | Action requise |
|-------|-------------|----------------|
| Step 2 - Configuration | Dimanche AM "Fermé habituel" mais qté non reportées | ✅ Vérifier logique redistribution |
| Step 3 - Pilotage CA | +184% puis +114% = valeurs par défaut trop agressives | ✅ Changé défauts vers "f" (Prudent) |
| Step 4 - Promos | Recherche par PLU/ITM8/EAN seulement | ✅ Ajouté recherche par désignation |
| Step 5 - Commande | Multi-livraisons OK, mais pas de contrôle inter-livraisons | 📝 Inventaire entre livraisons (V3) |
| Impression | Colonnes mal affichées selon taille fenêtre | ✅ CSS responsive pour impression |

### Tâches du jour

| Tâche | Statut | Description | Priorité |
|-------|--------|-------------|----------|
| Modes calcul par défaut → "f" (Prudent) | ✅ | Toutes familles en mode "f" par défaut | Haute |
| Recherche produit par désignation | ✅ | Recherche par nom dans StepAnimationCommerciale.jsx | Haute |
| CSS impression responsive | ✅ | Colonnes fixes avec table-layout: fixed | Haute |
| Documenter améliorations identifiées | ✅ | Ce fichier mis à jour | - |
| Créer présentation PowerPoint | ✅ | Guide utilisateur 12 slides | Bonus |

---

## JOUR 5 - 18 JANVIER 2026 ✅

### Session de travail - Améliorations commande et échange Manager/Équipe

**Thèmes abordés** :
1. Marquage des produits en promo dans la commande
2. Stock mini dynamique basé sur la consommation
3. Système d'échange de fichiers Manager ↔ Équipe
4. Écran Inventaire optimisé tablette

### Tâches réalisées

| Tâche | Statut | Description | Fichiers |
|-------|--------|-------------|----------|
| Marquage promos (⭐) dans commande | ✅ | Étoile + surlignage jaune pour les produits en promo | `StepCommande.jsx`, `FicheCommandeImpression.jsx` |
| Stock mini dynamique | ✅ | Calcul auto basé sur conso/jour × jours de couverture | `StepCommande.jsx` |
| Mode Normal (3j) / Court (1.5j) | ✅ | Toggle global + override par produit | `StepCommande.jsx` |
| Recherche multi-résultats promos | ✅ | Dropdown quand plusieurs produits correspondent | `StepAnimationCommerciale.jsx` |
| Service fichiers partagés | ✅ | Export/Import JSON commandes et inventaires | `fichierPartageService.js` |
| Boutons Export commande L1/L2 | ✅ | Génère fichier JSON pour l'équipe | `StepCommande.jsx` |
| Bouton Import Inventaire | ✅ | Récupère le fichier inventaire de l'équipe | `StepCommande.jsx` |
| Écran Inventaire Équipe | ✅ | Interface tablette simplifiée | `InventaireEquipe.jsx` |
| Navigation Équipe mise à jour | ✅ | Ajout onglet "Inventaire" | `Navigation.jsx`, `AppV2.jsx` |
| Fichier .bvp.json enrichi | ✅ | Toutes les données de commande dans un seul fichier | `WizardTermine.jsx`, `WizardResponsable.jsx` |

### Architecture Échange Fichiers (V2 - 2 fichiers)

**Principe** : Chaque profil écrit dans son propre fichier pour éviter les conflits d'écriture.

```
┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│     FICHIER MANAGER             │     │     FICHIER ÉQUIPE              │
│  manager_07499_S04_2026.bvp.json│     │  equipe_07499_S04_2026.bvp.json │
├─────────────────────────────────┤     ├─────────────────────────────────┤
│ 1. Date planning                │     │ 1. Personnalisations            │
│ 2. Jours ouverture              │     │    - Nom produit                │
│ 3. Gamme produits               │     │    - Programme four             │
│ 4. Animation commerciale        │     │    - Unités/plaque              │
│ 5. Qté sem/jour/heure           │     │                                 │
│ 6. Besoins (articles + CDT)     │     │ 2. Inventaires                  │
│ 7. Dates commande/livraison     │     │    - Stock réel par produit     │
│ 8. Stock mini                   │     │    - Date/opérateur             │
│ 9. Mode stock (normal/court)    │     │                                 │
└────────────────┬────────────────┘     │ 3. Plaquage J+1                 │
                 │                      │    - Produits individuels       │
    ÉQUIPE lit ──┘                      │    - Familles entières          │
    pour générer:                       └────────────────┬────────────────┘
    • Feuille de production                              │
    • Feuille de commande              MANAGER lit ──────┘
                                       pour récupérer:
                                       • Inventaire réel
                                       • Personnalisations
                                       • Config plaquage
```

**Workflow** :
1. Manager exporte `manager_XXXXX_SYY_ZZZZ.bvp.json`
2. Équipe importe le fichier manager
3. Équipe saisit inventaire, personnalisations, plaquage J+1
4. Équipe exporte `equipe_XXXXX_SYY_ZZZZ.bvp.json`
5. Manager importe le fichier équipe pour ajuster les commandes

### Stock Mini Dynamique

**Formule** :
```
Stock Mini (unités) = Consommation/jour × Jours de couverture
Stock Mini (cartons) = ⌈ Stock Mini (unités) / CDT ⌉
```

**Modes** :
| Mode | Jours | Exemple (70 unités/sem) |
|------|-------|-------------------------|
| Normal | 3 | 10/jour × 3 = 30 unités |
| Court | 1.5 | 10/jour × 1.5 = 15 unités |
| Manuel | - | Valeur fixe par l'opérateur |

### Notes
- Le workflow utilise des fichiers JSON pour permettre un fonctionnement sans serveur
- L'équipe peut travailler hors-ligne après avoir importé la commande
- Historique des échanges conservé en localStorage (100 derniers)
- Les écarts stock prévu vs réel sont tracés pour analyse future

### Structure du fichier .bvp.json (V2.0)

Le fichier unique `.bvp.json` contient **toutes les données** nécessaires pour le Manager et l'Équipe :

```json
{
  "schemaVersion": "2.0",
  "createdAt": "2026-01-18T...",
  "magasin": { "nom": "...", "code": "..." },
  "configuration": {
    "semaine": 3,
    "annee": 2026,
    "dateDebut": "2026-01-13",
    "dateFin": "2026-01-19",
    "horaires": { ... },
    "baseCalcul": "PDV",
    "limitesProgression": { ... }
  },
  "frequentation": { ... },
  "objectifs": { "caPrevi": 12500, "caHisto": 11200, ... },
  "animationCommerciale": {
    "promos": [ { "plu": "...", "libelle": "...", ... } ]
  },
  "produitsExceptionnels": [ ... ],
  "commande": {
    "livraisons": [
      { "id": 1, "dateCommande": "2026-01-13", "dateReception": "2026-01-15", "label": "Livraison 1" },
      { "id": 2, "dateCommande": "2026-01-15", "dateReception": "2026-01-17", "label": "Livraison 2" }
    ],
    "qtesFixees": { "12345678": { "1": 5, "2": 3 } },
    "cdtPersonnalises": { "12345678": 24 },
    "livraisonForte": 1,
    "modeStockDefaut": "normal",
    "modesStockProduits": { "87654321": "court" },
    "stocksMini": { ... },
    "stocksActuels": { ... }
  },
  "produits": [ { "id": 1, "libelle": "...", "potentiel": 70, ... } ]
}
```

**Avantages** :
- Un seul fichier par semaine et par magasin
- Toute l'équipe travaille sur les mêmes données
- Traçabilité complète des configurations

---

## JOUR 6 - 19 JANVIER 2026 ✅

### Session de travail - Architecture fichiers Manager/Équipe V2

**Thèmes abordés** :
1. Refonte architecture à 2 fichiers (éviter conflits d'écriture)
2. Écran équipe complet avec 3 onglets
3. Standardisation des noms de fichiers avec code PDV

### Tâches réalisées

| Tâche | Statut | Description | Fichiers |
|-------|--------|-------------|----------|
| Nouveau service fichierEchangeService.js | ✅ | Architecture 2 fichiers manager/équipe | `fichierEchangeService.js` |
| Format nom fichiers standardisé | ✅ | `manager_XXXXX_SYY_ZZZZ.bvp.json` avec code PDV 5 chiffres | `fichierEchangeService.js` |
| Export fichier manager (WizardTermine) | ✅ | Intégration nouveau service + historique | `WizardTermine.jsx` |
| Écran Équipe complet 3 onglets | ✅ | Inventaire, Personnalisation, Plaquage J+1 | `InventaireEquipe.jsx` |

### Fonctionnalités de l'écran Équipe

**Onglet Inventaire** :
- Import fichier manager
- Saisie stock réel par produit
- Progression visuelle par rayon

**Onglet Personnalisation** :
- Nom personnalisé du produit
- Programme four
- Unités par plaque

**Onglet Plaquage J+1** :
- Sélection par famille entière
- Sélection par produit individuel
- Permet de préparer la veille pour le lendemain

### Structure fichier équipe

```json
{
  "type": "equipe",
  "schemaVersion": "2.0",
  "updatedAt": "2026-01-19T...",
  "magasin": { "codePDV": "07499", "nom": "SAS CYMADIS" },
  "semaine": 4,
  "annee": 2026,
  "operateur": "Marie",
  "personnalisations": {
    "12345678": {
      "nomPersonnalise": "Pain Campagne",
      "programmeFour": "P3",
      "unitesParPlaque": 12
    }
  },
  "inventaires": {
    "12345678": {
      "stockReel": 5,
      "dateSaisie": "2026-01-19T14:20:00",
      "operateur": "Marie"
    }
  },
  "plaquageJ1": {
    "produits": ["12345678", "87654321"],
    "familles": ["VIENNOISERIE", "PAINS_SPECIAUX"]
  }
}
```

### Notes techniques
- Code PDV à 5 chiffres extrait du fichier de ventes Excel
- Exemples : SAS CHAMAFFI = 10679, SAS CYMADIS = 07499
- Historique des échanges conservé en localStorage (clé: `bvp_historique_echanges_v2`)

---

## BACKLOG (À PLANIFIER)

### Fonctionnalités à ajouter

| Fonctionnalité | Priorité | Effort estimé | Notes |
|----------------|----------|---------------|-------|
| Historique des casses avec graphiques | Basse | 2-3h | V2.1 |
| Suggestions automatiques basées sur casse | Basse | 3-4h | V2.1 |
| Export commande en PDF | Moyenne | 2h | - |
| Mode hors-ligne complet (PWA) | Basse | 4-6h | V2.5 |
| Comparaison CA réel vs objectif | Moyenne | 3-4h | Si saisie ventes |

### Bugs connus

| Bug | Priorité | Description |
|-----|----------|-------------|
| - | - | (Aucun bug identifié pour l'instant) |

### Améliorations UX

| Amélioration | Priorité | Description |
|--------------|----------|-------------|
| Impression 22 pages → 7-8 pages | Haute | Vue hebdo compacte |
| Modes calcul par défaut trop agressifs | Haute | Passer de S/F/f vers f/f/f par défaut |
| Recherche produit par désignation | Haute | Ajouter filtre texte en plus de PLU/ITM8/EAN |
| Colonnes impression non responsive | Haute | CSS print-specific pour largeurs fixes |
| Contrôle inventaire inter-livraisons | Moyenne | V3 - Ajuster commande suivante selon stock réel |

---

## FICHIERS DE RÉFÉRENCE

### Fichiers Excel nécessaires
- `/public/Data/liste des conditionements.xlsx` - 750 produits avec CDT
- `/public/Data/liste des produits BVP treville.xlsx` - Référentiel produits

### Documentation
- `/CAHIER_DES_CHARGES_V2.md` - Spécifications complètes V2.5
- `/PLANNING_DEVELOPPEMENT.md` - Ce fichier

### Structure des composants

```
src/
├── components/
│   ├── responsable/
│   │   ├── WizardResponsable.jsx         ← Orchestrateur 6 étapes
│   │   ├── ProgressBar.jsx               ← Barre de progression
│   │   ├── ImportDonnees.jsx             ← Étape 1
│   │   ├── StepSemaine.jsx               ← Étape 2
│   │   ├── PilotageCA.jsx                ← Étape 3 (+ Tendance/Fiabilité)
│   │   ├── StepAnimationCommerciale.jsx  ← Étape 4 (+ recherche multi-résultats)
│   │   ├── StepCommande.jsx              ← Étape 5 (stock dynamique, export/import)
│   │   ├── FicheCommandeImpression.jsx   ← Fiche imprimable (promos marquées ⭐)
│   │   └── WizardTermine.jsx             ← Étape 6 (Export)
│   │
│   ├── equipe/
│   │   ├── ImportFichierEquipe.jsx       ← Import .bvp.json
│   │   ├── PlanningJour.jsx              ← Planning quotidien
│   │   ├── InventaireStock.jsx           ← Saisie stocks (ancienne version)
│   │   └── InventaireEquipe.jsx          ← Inventaire tablette (échange fichiers)
│   │
│   └── layout/
│       ├── Header.jsx                    ← En-tête magasin
│       └── Navigation.jsx                ← Onglets équipe (+ Inventaire)
│
└── services/
    ├── conditionnementService.js         ← CDT
    ├── fichierPartageService.js          ← Export/Import JSON (échange Manager↔Équipe)
    ├── potentielCalculator.js            ← Calculs potentiels + tendance
    ├── caCalculator.js                   ← Calculs CA
    └── excelParser.js                    ← Import Excel
```

---

## NOTES DE RÉUNION

### 13 janvier 2026
- Discussion sur le module Commande : besoin de deux parties (Responsable + Équipier)
- Identification du problème d'impression (22 pages vs 7-8)
- Colonnes Tendance/Fiabilité présentes en V1 mais absentes en V2 → ajoutées

### 16 janvier 2026 - Démo live via Claude in Chrome
**Participants** : Rudy (responsable projet)

**Parcours complet du Wizard Responsable** :
1. ✅ Import Excel (Fréquentation + Ventes) - Fonctionne bien
2. ✅ Configuration semaine - OK mais noter "Fermé habituel" vs "Fermé exceptionnel"
3. ⚠️ Pilotage CA - Modes par défaut génèrent des % trop élevés (+184%, +114%)
4. ⚠️ Animation Commerciale - Manque recherche par désignation produit
5. ✅ Commande multi-livraisons - Fonctionne, mais besoin contrôle inter-livraisons
6. ⚠️ Impression - Problème colonnes selon taille fenêtre

**Décisions prises** :
- Changer les modes de calcul par défaut vers "f" (Prudent, +10% max)
- Ajouter champ recherche par désignation dans sélecteur produit promos
- Créer CSS spécifique pour impression avec largeurs fixes

**Note** : Rudy est dyslexique → demander clarification si message ambigu

### 18 janvier 2026 - Session de développement
**Participants** : Rudy (responsable projet)

**Réflexion sur le workflow opérationnel** :
- Le planning est fait en S-1 pour la S → prévisionnel
- Au moment de passer la commande (jour J), besoin de vérifier le réel vs théorique
- Besoin d'un système d'échange entre Manager et Équipe sans serveur

**Solution retenue : Fichiers JSON partagés**
- Via USB ou dossier réseau partagé
- Export/Import manuel (Option B, simple et fiable)
- Possibilité d'évoluer vers Electron (Option A) plus tard si besoin

**Fonctionnalités implémentées** :
1. **Stock mini dynamique** : Basé sur la consommation journalière, modes Normal (3j) / Court (1.5j)
2. **Marquage promos** : Étoile ⭐ + surlignage pour attirer l'attention de l'opérateur
3. **Recherche multi-résultats** : Dropdown quand plusieurs produits correspondent
4. **Export commande** : Fichier JSON pour chaque livraison
5. **Import inventaire** : Récupération du stock réel saisi par l'équipe
6. **Écran Inventaire Équipe** : Interface tablette simplifiée et intuitive

**Traçabilité prévue** :
- Historique des échanges en localStorage
- Écarts stock prévu vs réel conservés pour analyse future
- Permettra d'affiner les prévisions et détecter les erreurs de données

---

## CONTACT

Pour toute question sur ce planning, contacter le responsable du projet.
