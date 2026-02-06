# CAHIER DES CHARGES V4.0 - APPLICATION BVP PLANNING

**Version** : 4.0.0
**Date** : 20 janvier 2026
**Statut** : En cours de développement

---

## FEUILLE DE ROUTE DÉPLOIEMENT

### Historique
- **V1** : 3 magasins pilotes (test initial)
- **V2** : Développement local uniquement → **Ne sera jamais déployée**
- **V3** : Version de déploiement cible (2400 magasins) - Stockage partagé
- **V4** : Ajout du Module Benchmark Hebdomadaire

### Planning 2026

| Période | Objectif | Détails |
|---------|----------|---------|
| **Janvier** | Finalisation V4 + Démarchage | Module Benchmark + 10 magasins pilotes |
| **Février** | Formation pilotes | Former et accompagner les 10 magasins pilotes |
| **Mars - Avril** | Mesure d'impact | Analyser les KPIs : CA, casse, taux de pénétration, marge |
| **Mai** | Présentation CODIR | Présentation au Comité de Direction du Groupement + démo web |
| **Juin+** | Transfert SI | Confier le projet au Service Informatique pour déploiement 2400 magasins |

---

## CHANGELOG V4.0 - MODULE BENCHMARK HEBDOMADAIRE (20 janvier 2026)

### Nouveautés V4.0

| Fonctionnalité | Description | Impact | Statut |
|----------------|-------------|--------|--------|
| **Module Benchmark** | Nouveau module d'analyse des performances vs secteur | Identifier les axes d'amélioration avant le plan d'action | ✅ Développé |
| **Accueil Global** | Écran de choix entre Benchmark et Planning | Navigation claire entre les 2 modules | ✅ Développé |
| **Comparaison Secteur** | Benchmark contre magasins comparables (même secteur + modèle) | Se situer par rapport aux pairs | ✅ Développé |
| **Analyse Flux Client** | Visualisation du flux client vs pénétration BVP par créneau | Identifier les créneaux à améliorer | ✅ Développé |
| **Calcul Potentiel Perdu** | Estimation du CA manqué par créneau horaire | Quantifier l'opportunité en € | ✅ Développé |
| **Tableau Benchmark Triable** | Classement des magasins comparables avec tri par colonne | Analyser sous différents angles | ✅ Développé |

---

## NOUVEAU : MODULE BENCHMARK HEBDOMADAIRE

### 1. Vision et Objectif

> **Avant de planifier, comprendre où sont les opportunités.**

Le module Benchmark permet au Responsable de :
1. **Se comparer** à ses pairs (même secteur, même modèle)
2. **Identifier** les créneaux horaires sous-performants
3. **Quantifier** le potentiel CA manqué
4. **Prioriser** les actions du Plan d'Action BVP

### 2. Parcours Utilisateur

```
┌─────────────────────────────────────────────────────────────────┐
│                     ACCUEIL GLOBAL V4                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Bienvenue sur BVP Planning                                     │
│  Que souhaitez-vous faire aujourd'hui ?                         │
│                                                                  │
│  ┌──────────────────────┐     ┌──────────────────────┐         │
│  │                      │     │                      │         │
│  │  📊 BENCHMARK HEBDO  │     │  📅 PLAN D'ACTION   │         │
│  │      [NOUVEAU]       │     │                      │         │
│  │                      │     │                      │         │
│  │  Analysez vos        │     │  Planifiez votre     │         │
│  │  performances        │     │  production          │         │
│  │                      │     │                      │         │
│  └──────────────────────┘     └──────────────────────┘         │
│                                                                  │
│  💡 Conseil : Commencez par le Benchmark pour identifier        │
│     vos axes d'amélioration, puis passez au Plan d'Action.     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Écran d'Accueil Benchmark

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 Benchmark Hebdo BVP                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1️⃣ Dossier de données                                          │
│     [📁 Sélectionner le dossier DATA_perso]                     │
│                                                                  │
│  2️⃣ Semaine à analyser                                          │
│     [▼ Semaine 2026-S02 (13/01 - 19/01)]                        │
│                                                                  │
│  3️⃣ Magasin                                                     │
│     [🔍 Rechercher par code ou ville...]                        │
│     • 10679 - CHAMAFFI                                          │
│     • 07499 - CYMADIS                                           │
│     • 02023 - BEAUFORT EN VALLEE                                │
│                                                                  │
│                         [Analyser →]                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Dashboard Benchmark

#### 4.1 Bannière Magasin

Affiche les informations clés du magasin sélectionné :

| Information | Description |
|-------------|-------------|
| Code + Nom | Ex: "02023 - BEAUFORT EN VALLEE" |
| Enseigne | INTERMARCHE, NETTO, etc. |
| Surface | Taille en m² |
| Vocation | SUPER ALIMENTAIRE, PROXIMITE, etc. |
| Tickets PDV | Nombre de tickets total (semaine) |
| Tickets BVP | Nombre de tickets avec achat BVP |
| Ticket Moyen | CA BVP / Tickets BVP |
| CA BVP | Chiffre d'affaires BVP de la semaine |

#### 4.2 Tableau des Magasins Comparables

Liste tous les magasins du même secteur géographique et du même modèle commercial.

**Colonnes triables** (clic sur l'en-tête) :

| Colonne | Description | Tri |
|---------|-------------|-----|
| Magasin | Code + Ville | A-Z |
| Surface | Taille en m² | ↑↓ |
| Enseigne | Marque commerciale | A-Z |
| Vocation | Type de magasin | A-Z |
| Tck PDV | Tickets total | ↑↓ |
| Tck BVP | Tickets BVP | ↑↓ |
| Px Moy. | Prix moyen article (CA/Qté) | ↑↓ |
| Tck Moy. | Ticket moyen BVP | ↑↓ |
| CA BVP | Chiffre d'affaires BVP | ↑↓ |

**Indicateurs visuels** :
- 🥇 Premier du classement (selon le tri actif)
- → Magasin actuellement analysé (surligné)
- Ligne de pied : Moyenne du groupe

**Modes de comparaison** :
1. **Secteur + Modèle** : Comparaison optimale (même zone + même taille)
2. **Secteur seul** : Si modèle non renseigné (ex: Netto)
3. **Vocation** : Mode dégradé si pas de secteur

#### 4.3 Indicateurs Clés vs Secteur

4 cartes comparant le magasin à la moyenne de son groupe :

| Indicateur | Description | Format |
|------------|-------------|--------|
| CA BVP | Chiffre d'affaires vs moyenne | € |
| Tickets BVP | Volume vs moyenne | Nombre |
| Ticket Moyen | Panier moyen vs moyenne | € |
| Pénétration | % clients achetant BVP vs moyenne | % |

Chaque carte affiche :
- Valeur du magasin
- Valeur moyenne du secteur
- Écart en % (vert si positif, rouge si négatif)

### 5. Analyse Flux Client vs Pénétration BVP

C'est le cœur du module Benchmark : comprendre **où** le magasin perd des ventes.

#### 5.1 Concept Clé

> "Si 1400 clients passent l'après-midi mais que seulement 20% achètent du BVP (vs 33% le matin), il y a un potentiel de +170 tickets non captés."

#### 5.2 Affichage par Créneau

Pour chaque créneau (Matin, Midi, Après-midi) :

```
┌─────────────────────────────────────────────────────────────────┐
│  APRÈS-MIDI (14h-19h)                                    20.7%  │
│                                            Secteur: 17.6% (+3.1 pt)
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CLIENTS EN CAISSE    ACHÈTENT BVP      N'ACHÈTENT PAS         │
│       1 405              291                1 114               │
│      /semaine          /semaine            /semaine             │
│                                                                  │
│  ████████████████████░░░░░░░░░ (barre visuelle)                │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Si 32.8% comme le matin : +170 tickets  +500 € CA      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Informations affichées** :
- **Taux de pénétration** : % clients qui achètent BVP
- **Comparaison secteur** : Écart en points vs moyenne comparable
- **Clients en caisse** : Flux total sur le créneau (Tickets PDV)
- **Achètent BVP** : Tickets avec achat BVP
- **N'achètent pas** : Potentiel non capté
- **Potentiel** : Si le meilleur taux était appliqué

**Codes couleur** :
- 🟢 Vert : Créneau de référence (meilleur taux)
- 🟠 Orange : Potentiel identifié
- 🔴 Rouge : Sous-performance marquée

#### 5.3 Résumé du Potentiel Total

```
┌─────────────────────────────────────────────────────────────────┐
│  Potentiel si tous les créneaux atteignent 32.8% :              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│     +170           =        +509 €         =        +2.5%       │
│  tickets/semaine          CA/semaine           de CA BVP        │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                     PROJECTION ANNUELLE                          │
│                   +26 468 € / an                                │
│               basé sur cette semaine × 52                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Calculs** :
- **Tickets manqués** : (Flux × Meilleur taux) - Tickets actuels
- **CA perdu** : Tickets manqués × Ticket moyen BVP
- **% de progression** : CA potentiel / CA actuel de la semaine
- **Annualisé** : CA potentiel × 52 semaines

### 6. Bloc Diagnostic

Résume l'opportunité principale et propose l'action :

```
┌─────────────────────────────────────────────────────────────────┐
│  🎯 DIAGNOSTIC : Vous perdez des clients l'après-midi           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  L'après-midi, 44% des clients passent en caisse mais           │
│  seulement 20.7% achètent en BVP.                               │
│                                                                  │
│  Si vous atteignez votre niveau du matin (32.8%) :              │
│                                                                  │
│       +170 tickets        =        +500 €                       │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         Passer au Plan d'Action BVP →                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Configurez la production pour l'après-midi                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 7. Sources de Données

Le module Benchmark utilise les fichiers Excel hebdomadaires :

| Fichier | Contenu | Données extraites |
|---------|---------|-------------------|
| `Total_PDV_SXX_20XX.xlsx` | Ventes globales par magasin | CA BVP, Tickets, Pénétration |
| `Vente_Hebdo_SXX_20XX.xlsx` | Ventes par créneau horaire | Flux par tranche, CA par heure |
| `info_PDV.json` | Référentiel magasins | Secteur, Modèle, Surface, Enseigne |

### 8. Architecture Technique

#### 8.1 Composants React

| Composant | Fichier | Rôle |
|-----------|---------|------|
| AccueilGlobal | `AccueilGlobal.jsx` | Choix Benchmark / Planning |
| AccueilBenchmark | `benchmark/AccueilBenchmark.jsx` | Sélection dossier, semaine, magasin |
| DashboardBenchmark | `benchmark/DashboardBenchmark.jsx` | Affichage du benchmark complet |
| GraphiqueFluxPenetration | (dans DashboardBenchmark) | Analyse flux vs pénétration |
| BlocDiagnostic | (dans DashboardBenchmark) | Résumé et CTA vers Planning |
| CarteIndicateur | (dans DashboardBenchmark) | Carte KPI vs secteur |

#### 8.2 Service d'Extraction

| Service | Fichier | Rôle |
|---------|---------|------|
| dataExtractionService | `services/dataExtractionService.js` | Extraction données Excel, calculs, comparaisons |

**Fonctions principales** :
- `listerSemainesDisponibles()` : Détecte les semaines dans le dossier
- `extraireDonneesMagasin()` : Extrait toutes les données pour un magasin
- `chargerInfoPDV()` : Charge le référentiel magasins
- `calculerMoyenneSecteur()` : Calcule la moyenne des comparables
- `calculerMoyenneSecteurParCreneau()` : Moyenne par tranche horaire

#### 8.3 Gestion des Codes Magasins

Les codes magasins peuvent avoir différents formats (avec/sans zéros préfixes). Le service gère cela via des Sets :

```javascript
// Créer un Set de tous les formats possibles
const codesSet = new Set();
codes.forEach(code => {
  codesSet.add(code);                    // "06935"
  codesSet.add(code.replace(/^0+/, '')); // "6935"
  codesSet.add(code.padStart(5, '0'));   // "06935"
});
```

---

## STRUCTURE DES FICHIERS V4

```
📁 src/
├── 📁 components/
│   ├── 📄 AccueilGlobal.jsx           ← NOUVEAU V4 : Choix Benchmark/Planning
│   │
│   ├── 📁 benchmark/                   ← NOUVEAU V4 : Module Benchmark
│   │   ├── 📄 AccueilBenchmark.jsx    ← Sélection dossier/semaine/magasin
│   │   └── 📄 DashboardBenchmark.jsx  ← Dashboard complet
│   │
│   ├── 📁 responsable/                 ← Module Planning (existant V3)
│   │   ├── 📄 WizardResponsable.jsx
│   │   ├── 📄 PilotageCA.jsx
│   │   └── ...
│   │
│   └── 📁 equipier/                    ← Module Équipier (existant V3)
│       └── ...
│
├── 📁 services/
│   ├── 📄 dataExtractionService.js    ← NOUVEAU V4 : Extraction Excel Benchmark
│   └── ...
│
└── 📄 App.jsx                          ← Navigation entre modules
```

---

## CHARTE GRAPHIQUE V4

### Couleurs Mousquetaires

| Couleur | Code Hex | Usage |
|---------|----------|-------|
| Rouge Mousquetaires | `#ED1C24` | Accents, CTA, alertes |
| Bordeaux | `#8B1538` | Titres, en-têtes, dégradés |
| Beige clair | `#F5F2ED` | Fond de page |
| Beige moyen | `#E8E1D5` | Cartes, surlignage |
| Gris texte | `#58595B` | Texte secondaire |
| Gris bordure | `#D1D3D4` | Bordures, séparateurs |

### Dégradés

```css
/* En-tête magasin */
background: linear-gradient(to right, #8B1538, #ED1C24);

/* Bloc potentiel */
background: linear-gradient(to right, #ED1C24, #8B1538);
```

### Indicateurs de Performance

| État | Couleur | Usage |
|------|---------|-------|
| Positif | `green-500` / `green-600` | Au-dessus de la moyenne, référence |
| Neutre | `gray-500` / `gray-700` | Dans la moyenne |
| Négatif | `#ED1C24` | En-dessous de la moyenne, à améliorer |
| Potentiel | `orange-400` / `orange-600` | Opportunité identifiée |
| Highlight | `yellow-300` | Chiffres clés (CA potentiel) |

---

## CE QUI RESTE INCHANGÉ (V3 → V4)

- Module Planning Responsable (Wizard 8 étapes)
- Module Équipier (Planning jour, Casse, Inventaire)
- Stockage partagé (dossier réseau/NAS)
- Module Analyse Prévisions vs Réel
- Calcul des potentiels (modes S/F/f)
- Multi-livraisons et stock projeté
- Impression fiche de commande

---

## PROCHAINES ÉVOLUTIONS ENVISAGÉES

| Fonctionnalité | Description | Priorité |
|----------------|-------------|----------|
| Export PDF Benchmark | Générer un rapport PDF du benchmark | Moyenne |
| Historique Benchmark | Comparer plusieurs semaines | Moyenne |
| Alertes automatiques | Notification si pénétration chute | Basse |
| Lien Planning | Pré-remplir le planning selon le benchmark | Haute |

---

**Document rédigé le 20 janvier 2026**
**Auteur : Assistant IA**
**Statut : En cours de développement**
