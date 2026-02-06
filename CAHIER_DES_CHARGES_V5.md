# CAHIER DES CHARGES V5.0 - APPLICATION BVP PLANNING

**Version** : 5.0.0  
**Date** : 25 janvier 2026  
**Statut** : En cours de développement  
**Auteur** : Rudy - Service Innovation Mousquetaires

---

## TABLE DES MATIÈRES

1. [Introduction et Contexte](#1-introduction-et-contexte)
2. [Architecture Globale](#2-architecture-globale)
3. [Wizard Manager (6 étapes)](#3-wizard-manager-6-étapes)
4. [Wizard Équipe (3 modules)](#4-wizard-équipe-3-modules)
5. [Fonctionnalités Clés V5](#5-fonctionnalités-clés-v5)
6. [Structure des Fichiers JSON](#6-structure-des-fichiers-json)
7. [Charte Graphique](#7-charte-graphique)
8. [Structure du Projet React](#8-structure-du-projet-react)
9. [Notes pour Claude Code](#9-notes-pour-claude-code)
10. [Module Animation Commerciale](#10-module-animation-commerciale-étape-4-manager)
11. [Dashboard Pilotage CA](#11-dashboard-pilotage-ca-étape-4-manager)
12. [Logique Métier à Implémenter](#12-logique-métier-à-implémenter)
13. [Flux de Données et Structure Fichiers Excel](#13-flux-de-données-et-structure-des-fichiers-excel) ⭐ **NOUVEAU**

---

## 1. INTRODUCTION ET CONTEXTE

### 1.1 Objectif

Restructuration majeure de l'application BVP Planning en **2 univers distincts** :
- **Univers Manager** : Diagnostic, pilotage CA, configuration
- **Univers Équipe** : Exécution planning, inventaire, commande

### 1.2 Évolution V4 → V5

| V4 (actuelle) | V5 (nouvelle) |
|---------------|---------------|
| Interface unique avec toggle Responsable/Équipier | 2 univers séparés avec leurs propres parcours |
| Module Benchmark + Module Planning | Manager : Diagnostic → Gestion → Communication |
| Wizard 8 étapes | Manager : 6 étapes / Équipe : 3 modules |
| Casse non intégrée dans le pilotage | Casse intégrée dans Pilotage CA temps réel |
| 6 tranches horaires fixes | Regroupement de colonnes configurable |

### 1.3 Les 3 acteurs du système

| Acteur | Support | Rôle |
|--------|---------|------|
| **Manager** | Desktop | Pilote le CA, configure la semaine, définit les objectifs |
| **Équipe** | Tablette | Exécute le planning cuisson, fait l'inventaire |
| **Resp. Fichier** | Desktop | Valide et passe la commande finale (utilise l'univers Équipe) |

---

## 2. ARCHITECTURE GLOBALE

### 2.1 Schéma des 2 univers

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           ACCUEIL APPLICATION                           │
│                                                                         │
│     ┌─────────────────────┐         ┌─────────────────────┐            │
│     │    🏢 MANAGER       │         │    👷 ÉQUIPE        │            │
│     │                     │         │                     │            │
│     │  Piloter mon rayon  │         │  Mon planning jour  │            │
│     └─────────────────────┘         └─────────────────────┘            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Univers Manager - Structure

```
MANAGER
├── Outil de Diagnostique
│   ├── Information Stratégique (benchmark vs secteur)
│   └── Objectif de Chiffre d'Affaires (potentiel, axes de progression)
│
├── Outil de Gestion
│   ├── Configuration Semaine (jours, opérations, regroupement colonnes)
│   ├── Pilotage CA (ventes + casse → CA temps réel)
│   └── Choix de la Gamme (20/80, activation produits)
│
└── Communication Équipes
    └── Génération Fichier Manager (→ vers Équipe)
```

### 2.3 Univers Équipe - Structure

```
ÉQUIPE
├── Planning de Cuisson
│   ├── Liste produits par tranche horaire
│   ├── Regroupement par type de cuisson
│   └── Total plaques par cuisson
│
├── Inventaire
│   └── Saisie stock réel par produit
│
└── Feuille de Commande
    ├── Stock en jours
    ├── Calcul automatique cartons
    └── Validation commande
```

### 2.4 Flux des fichiers

```
┌──────────────────┐                              ┌──────────────────┐
│     MANAGER      │                              │      ÉQUIPE      │
│                  │                              │                  │
│  Étapes 0-5      │      Fichier Manager         │   Planning       │
│  ─────────────   │  ─────────────────────────►  │   Cuisson        │
│  Diagnostic      │   (JSON : gamme, quantités,  │                  │
│  Config          │    besoins, opérations)      │   Inventaire     │
│  Pilotage CA     │                              │                  │
│                  │      Fichier Équipe          │   Commande       │
│  Vue suivi       │  ◄─────────────────────────  │                  │
│  (lecture)       │   (JSON : inventaire,        │                  │
│                  │    commande passée)          │                  │
└──────────────────┘                              └──────────────────┘
```

---

## 3. WIZARD MANAGER (6 ÉTAPES)

### 3.0 Étape 0 : Accueil + Import

**Objectif** : Charger toutes les données nécessaires au diagnostic et à la planification.

**Interface** :
```
┌─────────────────────────────────────────────────────────────────────────┐
│  📁 Import des données                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1️⃣ Dossier de données                                                  │
│     [📁 Sélectionner le dossier DATA_perso]                             │
│                                                                         │
│  2️⃣ Semaine à travailler                                                │
│     [▼ Semaine 2026-S05 (27/01 - 02/02)]                                │
│                                                                         │
│  3️⃣ Magasin                                                             │
│     [🔍 Rechercher par code ou ville...]                                │
│                                                                         │
│  📋 Fichiers détectés :                                                  │
│     ✅ Ventes hebdo (Vente_Hebdo_S05_2026.xlsx)                         │
│     ✅ Casse/Don/Stickage (Casse_S01_S05.xlsx)                          │
│     ✅ Info PDV (info_PDV.json)                                         │
│     ✅ Total PDV secteur (Total_PDV_S05_2026.xlsx)                      │
│                                                                         │
│                              [Continuer →]                              │
└─────────────────────────────────────────────────────────────────────────┘
```

**Données chargées** :
- `Vente_Hebdo_SXX_20XX.xlsx` : CA, tickets, flux par créneau
- `Casse_SXX_SXX.xlsx` : Casse/Don/Stickage par produit (fichier Mercalys)
- `info_PDV.json` : Référentiel magasins (secteur, modèle, surface)
- `Total_PDV_SXX_20XX.xlsx` : Données secteur pour benchmark

---

### 3.1 Étape 1 : Diagnostic Stratégique

**Objectif** : Se situer par rapport aux magasins comparables du secteur.

**Interface** :
```
┌─────────────────────────────────────────────────────────────────────────┐
│  📊 Diagnostic Stratégique                     02023 - NETTO - S05/2026 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  BENCHMARK VS SECTEUR                                           │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │                                                                 │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │   │
│  │  │ CA BVP   │  │ Tickets  │  │ Tck Moy  │  │ Pénétr.  │       │   │
│  │  │ 4 850€   │  │ 1 240    │  │ 3.91€    │  │ 28.5%    │       │   │
│  │  │ +3.2%    │  │ +5.1%    │  │ -1.8%    │  │ -2.1 pt  │       │   │
│  │  │ vs moy.  │  │ vs moy.  │  │ vs moy.  │  │ vs moy.  │       │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │   │
│  │                                                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  ANALYSE FLUX CLIENT VS PÉNÉTRATION BVP                         │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │                                                                 │   │
│  │  MATIN (avant 12h)     ████████████████████░░░░░░  32.8%  🟢   │   │
│  │  MIDI (12h-14h)        ████████████████░░░░░░░░░░  26.4%       │   │
│  │  APRÈS-MIDI (14h-19h)  ████████████░░░░░░░░░░░░░░  20.7%  🔴   │   │
│  │  SOIR (+19h)           ██████████████████░░░░░░░░  29.1%       │   │
│  │                                                                 │   │
│  │  🎯 DIAGNOSTIC : Vous perdez des clients l'après-midi          │   │
│  │     1 405 clients passent mais seulement 20.7% achètent BVP    │   │
│  │     Potentiel : +170 tickets = +500€/semaine                   │   │
│  │                                                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  [← Retour]                                        [Continuer →]        │
└─────────────────────────────────────────────────────────────────────────┘
```

**Calculs** :
- Benchmark : Comparaison avec magasins même secteur + même modèle
- Pénétration : Tickets BVP / Tickets PDV par créneau
- Potentiel : (Flux × Meilleur taux) - Tickets actuels

---

### 3.2 Étape 2 : Objectif CA

**Objectif** : Définir l'ambition chiffrée pour la semaine à venir.

**Interface** :
```
┌─────────────────────────────────────────────────────────────────────────┐
│  🎯 Objectif de Chiffre d'Affaires                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  📈 AXES DE PROGRESSION IDENTIFIÉS                                      │
│  ──────────────────────────────────────────────────────────────────    │
│  • Créneau prioritaire : Après-midi (14h-19h)                          │
│  • Écart vs meilleur créneau : -12.1 points de pénétration             │
│                                                                         │
│  💰 POTENTIEL CHIFFRÉ                                                   │
│  ──────────────────────────────────────────────────────────────────    │
│                                                                         │
│     +170              +509 €             +2.5%                          │
│   tickets/sem.       CA/semaine        progression                      │
│                                                                         │
│   ───────────────────────────────────────────────────────────────      │
│                    PROJECTION ANNUELLE                                  │
│                      +26 468 €/an                                       │
│                                                                         │
│  🎯 OBJECTIF SEMAINE S05                                                │
│  ──────────────────────────────────────────────────────────────────    │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Objectif : +3% CA après-midi (soit +150€)                      │   │
│  │                                                                 │   │
│  │  [○ Accepter l'objectif]  [○ Modifier]  [○ Ignorer]            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  [← Retour]                                        [Continuer →]        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 3.3 Étape 3 : Configuration Semaine

**Objectif** : Paramétrer le cadre de travail de la semaine.

**Interface** :
```
┌─────────────────────────────────────────────────────────────────────────┐
│  ⚙️ Configuration Semaine S05                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  📅 JOURS D'OUVERTURE                                                   │
│  ──────────────────────────────────────────────────────────────────    │
│  ☑️ Lun  ☑️ Mar  ☑️ Mer  ☑️ Jeu  ☑️ Ven  ☑️ Sam  ☐ Dim                │
│                                                                         │
│  🎉 OPÉRATIONS COMMERCIALES                                             │
│  ──────────────────────────────────────────────────────────────────    │
│  [+ Ajouter une opération]                                             │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 📢 Promo Galettes    │ Sam-Dim │ Galette frangipane │ +30%     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  📦 LIVRAISON MATIÈRES PREMIÈRES                                        │
│  ──────────────────────────────────────────────────────────────────    │
│  Jour de livraison : [▼ Mardi]                                         │
│                                                                         │
│  📊 REGROUPEMENT DES TRANCHES HORAIRES                                  │
│  ──────────────────────────────────────────────────────────────────    │
│                                                                         │
│  Tranches de base (calcul toujours sur 6) :                            │
│  ┌────────┬────────┬────────┬────────┬────────┬────────┐              │
│  │Avant 9h│ 9h-12h │12h-14h │14h-16h │16h-19h │ +19h   │              │
│  └────────┴────────┴────────┴────────┴────────┴────────┘              │
│                                                                         │
│  Regrouper pour l'affichage équipe :                                   │
│  ☑️ Avant 9h + 9h-12h      → afficher "Matin"                          │
│  ☐ 12h-14h + 14h-16h      → afficher "Après-midi"                     │
│  ☐ 16h-19h + Après 19h    → afficher "Soir"                           │
│                                                                         │
│  Aperçu :                                                               │
│  ┌────────────┬────────┬────────┬────────┬────────┐                   │
│  │   Matin    │12h-14h │14h-16h │16h-19h │ +19h   │                   │
│  └────────────┴────────┴────────┴────────┴────────┘                   │
│                                                                         │
│  💡 Le calcul de répartition selon le flux client reste sur 6 tranches │
│     L'affichage additionne les valeurs des colonnes regroupées         │
│                                                                         │
│  [← Retour]                                        [Continuer →]        │
└─────────────────────────────────────────────────────────────────────────┘
```

**Logique du regroupement** :
1. Le calcul de répartition se fait TOUJOURS sur 6 tranches (selon flux client)
2. Le Manager choisit quelles colonnes regrouper à l'AFFICHAGE
3. L'outil additionne automatiquement les valeurs des tranches regroupées

**Exemple** : Galette Frangipane - Total jour = 20
| Configuration | Affichage |
|---------------|-----------|
| Aucun regroupement | 4 \| 4 \| 3 \| 3 \| 3 \| 3 |
| Matin regroupé | **8** \| 3 \| 3 \| 3 \| 3 |
| Matin + Soir regroupés | **8** \| 3 \| 3 \| **6** |

---

### 3.4 Étape 4 : Pilotage CA (temps réel)

**Objectif** : Piloter le CA prévisionnel en temps réel avec l'aide des données de casse.

**C'est l'étape centrale** : chaque action du Manager met à jour instantanément le CA prévisionnel.

**Interface** :
```
┌─────────────────────────────────────────────────────────────────────────┐
│  💰 Pilotage CA                                          S05/2026       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  CA PRÉVISIONNEL SEMAINE : 4 850 €          📈 vs S-1 : +3.2%   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  [📊 Ventes]  [🗑️ Casse]  [✅ Gamme]                                    │
│                                                                         │
│  ═══════════════════════════════════════════════════════════════════   │
│                                                                         │
│  📊 VUE VENTES                                                          │
│  ──────────────────────────────────────────────────────────────────    │
│  │ Famille        │ CA S05  │ vs S-1  │ Top produit              │    │
│  │────────────────│─────────│─────────│──────────────────────────│    │
│  │ Boulangerie    │ 1 850€  │ +4.2%   │ Baguette blanche (320€)  │    │
│  │ Viennoiserie   │ 1 420€  │ +2.1%   │ Croissant (280€)         │    │
│  │ Pâtisserie     │ 980€    │ -1.5%   │ Tarte citron (120€)      │    │
│  │ Snacking       │ 450€    │ +8.3%   │ Sandwich jambon (95€)    │    │
│  │ Négoce         │ 150€    │ +1.0%   │ Confiture (45€)          │    │
│                                                                         │
│  ═══════════════════════════════════════════════════════════════════   │
│                                                                         │
│  🗑️ VUE CASSE                                                           │
│  ──────────────────────────────────────────────────────────────────    │
│                                                                         │
│  Taux de casse global : 6.5% (PA Casse / PV Ventes)                    │
│  Coût total casse : 315€                                               │
│                                                                         │
│  ⚠️ ALERTES PRODUITS (casse > 15%)                                      │
│  │ Produit                    │ Casse % │ Coût €  │ Action           │ │
│  │────────────────────────────│─────────│─────────│──────────────────│ │
│  │ 🔴 Galette pomme indiv.    │ 91%     │ 45€     │ [Retirer gamme]  │ │
│  │ 🔴 Cravate patiss.         │ 74%     │ 28€     │ [Retirer gamme]  │ │
│  │ 🟠 Levure boulangerie      │ 50%     │ 12€     │ [Réduire qté]    │ │
│  │ 🟠 Maxi pain chocolat      │ 23%     │ 18€     │ [Réduire qté]    │ │
│                                                                         │
│  ═══════════════════════════════════════════════════════════════════   │
│                                                                         │
│  ✅ GAMME ACTIVE                                                        │
│  ──────────────────────────────────────────────────────────────────    │
│                                                                         │
│  Mode : [○ Manuel] [● 20/80] [○ Terrain]                               │
│                                                                         │
│  │ ☑️ │ Produit                │ CA prévu │ Casse % │ Qté/jour │       │
│  │────│────────────────────────│──────────│─────────│──────────│       │
│  │ ☑️ │ Baguette blanche       │ +320€    │ 2%      │ 40       │       │
│  │ ☑️ │ Croissant              │ +280€    │ 3%      │ 35       │       │
│  │ ☑️ │ Pain chocolat          │ +195€    │ 5%      │ 28       │       │
│  │ ☐ │ Galette pomme indiv.   │ (retiré) │ 91% 🔴  │ -        │       │
│  │ ☑️ │ Tarte citron           │ +120€    │ 4%      │ 8        │       │
│                                                                         │
│  💡 Suggestions :                                                       │
│  • "Galette pomme : 91% casse → Retiré de la gamme"                    │
│  • "Croissant 14h : 30% casse → Réduire cuisson PM ?"                  │
│                                                                         │
│  [← Retour]                                        [Continuer →]        │
└─────────────────────────────────────────────────────────────────────────┘
```

**Calculs temps réel** :
| Action Manager | Impact CA |
|----------------|-----------|
| ☑️ Activer un produit | CA + X € |
| ☐ Désactiver un produit | CA - X € (mais marge + Y €) |
| Modifier quantité | Recalcul instantané |

**Formule casse Mousquetaires** :
```
Taux de casse = PA Casse HT / PV Ventes TTC
```

**Seuils d'alerte** :
| Taux | Statut | Action suggérée |
|------|--------|-----------------|
| < 5% | ✅ Normal | Garder |
| 5-15% | 🟡 Attention | Surveiller, réduire |
| > 15% | 🔴 Alerte | Retirer de la gamme ? |

---

### 3.5 Étape 5 : Communication

**Objectif** : Générer le Fichier Manager à destination de l'équipe.

**Interface** :
```
┌─────────────────────────────────────────────────────────────────────────┐
│  📤 Communication Équipes                                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  📋 RÉCAPITULATIF FICHIER MANAGER                                       │
│  ──────────────────────────────────────────────────────────────────    │
│                                                                         │
│  Magasin : 02023 - NETTO BEAUFORT EN VALLEE                            │
│  Semaine : S05/2026 (27/01 - 02/02)                                    │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Gamme active           │ 45 produits sur 62                     │   │
│  │ Jours ouverts          │ Lun, Mar, Mer, Jeu, Ven, Sam           │   │
│  │ Tranches affichées     │ Matin | 12h-14h | 14h-16h | 16h-19h | +19h │
│  │ Opérations             │ 1 (Promo Galettes samedi)              │   │
│  │ Objectif               │ +3% CA après-midi                      │   │
│  │ Livraison MP           │ Mardi                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  📊 APERÇU PLANNING (Mardi 27/01)                                       │
│  ──────────────────────────────────────────────────────────────────    │
│                                                                         │
│  │ Produit              │ Matin │ 12-14 │ 14-16 │ 16-19 │ +19h │ Tot │ │
│  │──────────────────────│───────│───────│───────│───────│──────│─────│ │
│  │ Baguette blanche     │  14   │   6   │   6   │   9   │   5  │  40 │ │
│  │ Croissant            │  12   │   5   │   5   │   8   │   5  │  35 │ │
│  │ Pain chocolat        │  10   │   4   │   4   │   6   │   4  │  28 │ │
│                                                                         │
│  📄 ACTIONS                                                             │
│  ──────────────────────────────────────────────────────────────────    │
│                                                                         │
│  [📁 Exporter Fichier Manager (.json)]                                 │
│                                                                         │
│  [🖨️ Imprimer Planning Semaine]                                        │
│  [🖨️ Imprimer Fiche Commande]                                          │
│  [🖨️ Imprimer Opérations Commerciales]                                 │
│                                                                         │
│  [← Retour]                                      [✅ Terminer]          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. UNIVERS ÉQUIPE (2 MODULES)

L'univers Équipe est conçu pour une utilisation sur **tablette**, debout devant les fours, **sans formation préalable**.

### 4.0 Flux de synchronisation

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SYNCHRONISATION                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   MANAGER ──────────────────────────────────────────────────► ÉQUIPE    │
│            Fichier MANAGER (1x/semaine)                                  │
│            Contient : config semaine, produits, objectifs,               │
│                      créneaux, personnalisations manager                 │
│                                                                          │
│   ÉQUIPE ◄────────────────────────────────────────────────── MANAGER    │
│            Fichier ÉQUIPE (à la demande)                                 │
│            Contient : inventaires, personnalisations équipe              │
│            Usage : calculs marge rayon                                   │
│                                                                          │
│   QUOTIDIEN :                                                            │
│   • Chaque matin → Équipe imprime Planning du jour                      │
│   • Jour de commande → Inventaire le matin + passage commande           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Format fichier ÉQUIPE** : `EQUIPE-{codePDV}-S{semaine}-{année}.bvp.json`

---

### 4.1 Module : Planning du Jour

**Objectif** : Rythmer les cuissons tout au long de la journée.

**Interface** :
```
┌─────────────────────────────────────────────────────────────────────────┐
│  🏠  BVP Planning          02023 - NETTO - S05/2026    [👤 Équipier]   │
├─────────────────────────────────────────────────────────────────────────┤
│  [📅 Planning Jour]  [📦 Commande]                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Planning du Jour                                    [🖨️ Imprimer]     │
│  📅 Mardi 27 Janvier 2026 (S5)                                         │
│                                                                         │
│  🥖 BOULANGERIE (par tranches horaires)              49 produits       │
│  ──────────────────────────────────────────────────────────────────    │
│                                                                         │
│  │ Produit ↕            │ Matin │ 12-14 │ 14-16 │ 16-19 │ +19h │ Tot │ │
│  │                      │       │       │       │ ███   │      │     │ │
│  │──────────────────────│───────│───────│───────│───────│──────│─────│ │
│  │ *GALETTE FRANGIP.    │   8   │   3   │   3   │   3   │   3  │  20 │ │
│  │ • 12/plaque  [✏️]    │       │       │       │       │      │     │ │
│  │──────────────────────│───────│───────│───────│───────│──────│─────│ │
│  │ BAGUETTE BLANCHE     │  14   │   6   │   6   │   9   │   5  │  40 │ │
│  │ • 6/plaque   [✏️]    │       │       │       │       │      │     │ │
│  │──────────────────────│───────│───────│───────│───────│──────│─────│ │
│                                                                         │
│  │ TOTAL BOULANGERIE    │  78   │  69   │  69   │  93   │  32  │ 341 │ │
│                                                                         │
│  🥐 VIENNOISERIE (par tranches horaires)             27 produits       │
│  🍰 PÂTISSERIE (1 cuisson/jour)                      38 produits       │
│  🥪 SNACKING (1 cuisson/jour - midi)                 15 produits       │
│  📦 AUTRE (1 cuisson/jour)                            8 produits       │
│                                                                         │
│  💡 Quantités affichées en unités de vente                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Personnalisation produits** (icône ✏️) :

L'équipe peut adapter les informations pour être au plus près de ce qui se fait en rayon :

| Personnalisation | Description | Exemple |
|------------------|-------------|---------|
| Nom produit | Modifier le libellé affiché | "BAG CONSTANCE" → "Baguette blanche" |
| Famille | Changer la famille du produit | Reclasser un produit mal catégorisé |
| Type de cuisson | Tranches horaires ou 1x/jour | Passer un produit en journalier |
| Unités/plaque | Nb produits par support cuisson | 6/plaque, 12/plaque, etc. |

**Politique de cuisson par famille** :

| Famille | Mode par défaut | Affichage |
|---------|-----------------|-----------|
| BOULANGERIE | Par tranches horaires | Colonnes selon config manager |
| VIENNOISERIE | Par tranches horaires | Colonnes selon config manager |
| PÂTISSERIE | 1 cuisson/jour | 1 seule colonne (total jour) |
| SNACKING | 1 cuisson/jour (midi) | 1 seule colonne ou configurable |
| AUTRE | 1 cuisson/jour | 1 seule colonne |

**Créneaux** : Respectent la configuration du manager (regroupements, fermetures).

**Usage quotidien** :
1. Chaque matin → Ouvrir le jour concerné
2. Imprimer le planning → Document disponible toute la journée
3. Personnaliser si besoin → Modifications sauvegardées

---

### 4.2 Module : Commande (avec inventaire intégré)

**Objectif** : Ajuster les commandes en fonction de la demande, des dates de livraison et du stock actuel.

**Interface** :
```
┌─────────────────────────────────────────────────────────────────────────┐
│  🏠  BVP Planning          02023 - NETTO - S05/2026    [👤 Équipier]   │
├─────────────────────────────────────────────────────────────────────────┤
│  [📅 Planning Jour]  [📦 Commande]                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  📦 Commande & Inventaire                                               │
│  📅 Livraison : Jeudi 29 Janvier 2026                                  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 📊 Prévisions basées sur : Ventes S-1 + Commande S-1            │   │
│  │ 📅 Jours de stock estimés jusqu'à livraison : 3 jours           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  🔍 [Rechercher...]                      Touche Entrée = ligne suiv.   │
│                                                                         │
│  │ Produit            │ Prév. │ Stock │ Jours │ À cmd │ Cartons │     │
│  │                    │ /sem  │ actuel│ stock │       │  (CDT)  │     │
│  │────────────────────│───────│───────│───────│───────│─────────│     │
│  │ Baguette blanche   │  280  │ [  ]  │  ---  │  ---  │   ---   │     │
│  │ CDT: 50            │       │       │       │       │         │     │
│  │────────────────────│───────│───────│───────│───────│─────────│     │
│  │ Croissant          │  245  │ [ 48] │  1.4  │  197  │    3    │ 🟡  │
│  │ CDT: 80            │       │       │       │       │         │     │
│  │────────────────────│───────│───────│───────│───────│─────────│     │
│  │ Pain chocolat      │  196  │ [ 36] │  1.3  │  160  │    3    │ 🟡  │
│  │ CDT: 60            │       │       │       │       │         │     │
│  │────────────────────│───────│───────│───────│───────│─────────│     │
│  │ Tarte citron       │   56  │ [ 42] │  5.3  │    0  │    0    │ ✅  │
│  │ CDT: 8             │       │       │       │       │         │     │
│  │────────────────────│───────│───────│───────│───────│─────────│     │
│                                                                         │
│  ──────────────────────────────────────────────────────────────────    │
│  │ Produits saisis : 3 / 45        │ TOTAL CARTONS : 6           │    │
│  ──────────────────────────────────────────────────────────────────    │
│                                                                         │
│  Légende : 🔴 Stock critique (< 1 jour)                                │
│            🟡 Stock faible (1-3 jours)                                 │
│            ✅ Stock OK (> 3 jours)                                     │
│                                                                         │
│  [💾 Sauvegarder]    [🖨️ Imprimer]    [✅ Valider commande]            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Fonctionnalités inventaire intégré** :

| Fonction | Description |
|----------|-------------|
| Saisie rapide | Touche **Entrée** = passe à la ligne suivante |
| Calcul auto | Dès saisie stock → calcul jours stock + cartons |
| Prévisions | Basées sur ventes S-1 + commande S-1 |
| Jours stock | Estimation nb jours avant rupture |

**Calculs** :
```
Jours de stock = Stock actuel / (Prévision semaine / 7)
À commander = Prévision semaine - Stock actuel (si positif)
Cartons = Arrondi supérieur (À commander / CDT)
```

**Workflow jour de commande** :
1. **Matin** → Ouvrir module Commande
2. **Saisie** → Entrer le stock de chaque produit (Entrée = suivant)
3. **Vérification** → Contrôler les quantités calculées
4. **Sauvegarde** → Fichier ÉQUIPE archivé (pour manager)
5. **Validation** → Passer la commande

**Archivage** :
- Chaque inventaire est sauvegardé dans le fichier ÉQUIPE
- Format : `EQUIPE-{codePDV}-S{semaine}-{année}.bvp.json`
- Le manager peut récupérer ces fichiers pour les calculs de marge du rayon

---

## 5. FONCTIONNALITÉS CLÉS V5

### 5.1 Intégration de la Casse

La casse (fichier Casse/Don/Stickage de Mercalys) est intégrée dans le **Pilotage CA**.

**Formule économique Mousquetaires** :
```
Taux de casse = PA Casse HT / PV Ventes TTC
```

Cette formule mesure l'**impact économique** sur la rentabilité, pas le volume gaspillé.

**Seuils d'alerte** :
| Taux | Statut | Couleur | Action suggérée |
|------|--------|---------|-----------------|
| < 5% | Normal | ✅ Vert | Garder le produit |
| 5-15% | Attention | 🟡 Jaune | Surveiller, réduire quantités |
| > 15% | Alerte | 🔴 Rouge | Retirer de la gamme ? |

**Données utilisées** (fichier Mercalys) :
- `Dons, Casse et Stickage PA HT` : Coût de la casse
- `Ventes PV TTC` : Chiffre d'affaires des ventes
- `Dons, Casse et Stickage (Qté)` : Quantité cassée
- `Libellé` : Nom du produit

### 5.2 Regroupement des Colonnes

Le Manager peut regrouper des tranches horaires pour simplifier l'affichage équipe.

**Principe** :
1. Le calcul de répartition se fait **TOUJOURS sur 6 tranches** (selon flux client)
2. Le Manager choisit quelles colonnes regrouper à l'**affichage**
3. L'outil **additionne automatiquement** les valeurs des tranches regroupées

**Configuration possible** :
```javascript
// Options de regroupement
const regroupements = {
  avant9h_9h12h: true,   // "Matin"
  midi_14h16h: false,    // "Après-midi"
  soir_apres19h: false   // "Soir"
};
```

### 5.3 CA Temps Réel

Dans l'étape Pilotage CA, chaque action met à jour instantanément le CA prévisionnel :

```javascript
// Événements déclenchant le recalcul
onProductToggle(productId, active)     // Activer/Désactiver produit
onQuantityChange(productId, quantity)  // Modifier quantité
onFamilyToggle(familyId, active)       // Activer/Désactiver famille
```

### 5.4 Support Multi-Devices

| Fonctionnalité | Tablette | Desktop | Impression |
|----------------|----------|---------|------------|
| Wizard Manager | ✅ | ✅ Optimisé | 🖨️ |
| Planning Cuisson | ✅ Optimisé | ✅ | 🖨️ |
| Inventaire | ✅ Optimisé | ✅ | - |
| Commande | ✅ | ✅ Optimisé | 🖨️ |

---

## 6. STRUCTURE DES FICHIERS JSON

### 6.1 Fichier Manager (manager → équipe)

```json
{
  "version": "5.0",
  "type": "fichier_manager",
  "metadata": {
    "magasin": {
      "code": "02023",
      "nom": "BEAUFORT EN VALLEE",
      "enseigne": "NETTO"
    },
    "semaine": {
      "numero": "S05",
      "annee": 2026,
      "debut": "2026-01-27",
      "fin": "2026-02-02"
    },
    "genere_le": "2026-01-25T14:30:00Z",
    "genere_par": "Manager"
  },
  "configuration": {
    "jours_ouverts": ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"],
    "livraison_mp": "mardi",
    "regroupement_colonnes": {
      "avant9h_9h12h": true,
      "midi_14h16h": false,
      "soir_apres19h": false
    },
    "colonnes_affichees": ["Matin", "12h-14h", "14h-16h", "16h-19h", "+19h"]
  },
  "objectif": {
    "creneau_cible": "apres_midi",
    "progression_pct": 3,
    "ca_supplementaire": 150
  },
  "operations_commerciales": [
    {
      "id": "op1",
      "nom": "Promo Galettes",
      "jours": ["samedi", "dimanche"],
      "produits": ["galette_frangipane"],
      "impact_pct": 30
    }
  ],
  "gamme_active": [
    {
      "id": "prod_001",
      "libelle": "Baguette blanche PAC 250g",
      "plu": "1107",
      "famille": "boulangerie",
      "sous_famille": "precuisson_baguette",
      "mode": "par_tranche",
      "par_plaque": 6,
      "conditionnement": 50,
      "actif": true,
      "quantites_jour": {
        "lundi": { "avant9h": 7, "9h12h": 7, "12h14h": 6, "14h16h": 6, "16h19h": 9, "apres19h": 5 },
        "mardi": { "avant9h": 7, "9h12h": 7, "12h14h": 6, "14h16h": 6, "16h19h": 9, "apres19h": 5 }
      }
    }
  ],
  "besoins_semaine": [
    {
      "produit_id": "prod_001",
      "libelle": "Baguette blanche PAC 250g",
      "consommation": 250,
      "securite": 30,
      "total": 280,
      "conditionnement": 50
    }
  ]
}
```

### 6.2 Fichier Équipe (équipe → manager)

```json
{
  "version": "5.0",
  "type": "fichier_equipe",
  "metadata": {
    "magasin": {
      "code": "02023",
      "nom": "BEAUFORT EN VALLEE",
      "enseigne": "NETTO"
    },
    "semaine": {
      "numero": "S05",
      "annee": 2026
    },
    "genere_le": "2026-01-27T16:45:00Z"
  },
  "inventaire": {
    "date": "2026-01-27",
    "heure": "14:32",
    "produits": [
      {
        "produit_id": "prod_001",
        "libelle": "Baguette blanche PAC 250g",
        "stock_reel": 24
      },
      {
        "produit_id": "prod_002",
        "libelle": "Croissant PAC 60g",
        "stock_reel": 48
      }
    ]
  },
  "commande": {
    "date_validation": "2026-01-27T15:00:00Z",
    "date_livraison": "2026-01-28",
    "lignes": [
      {
        "produit_id": "prod_001",
        "libelle": "Baguette blanche PAC 250g",
        "cartons": 6,
        "quantite_totale": 300
      }
    ],
    "total_cartons": 12,
    "statut": "validee"
  },
  "ajustements": [
    {
      "date": "2026-01-27",
      "produit_id": "prod_003",
      "type": "quantite",
      "valeur_initiale": 8,
      "valeur_modifiee": 10,
      "raison": "Affluence inattendue"
    }
  ]
}
```

---

## 7. CHARTE GRAPHIQUE

### 7.1 Couleurs Mousquetaires

```css
:root {
  /* Couleurs principales */
  --rouge-mousquetaires: #ED1C24;  /* Accents, CTA, alertes */
  --bordeaux: #8B1538;             /* Titres, en-têtes, dégradés */
  
  /* Fonds */
  --beige-clair: #F5F2ED;          /* Fond de page */
  --beige-moyen: #E8E1D5;          /* Cartes, surlignage */
  
  /* Textes */
  --gris-texte: #58595B;           /* Texte secondaire */
  --gris-bordure: #D1D3D4;         /* Bordures, séparateurs */
  
  /* Indicateurs */
  --vert-positif: #22C55E;         /* Au-dessus de la moyenne */
  --jaune-attention: #F59E0B;      /* À surveiller */
  --rouge-alerte: #ED1C24;         /* En-dessous, alerte */
  --orange-potentiel: #F97316;     /* Opportunité */
}
```

### 7.2 Dégradés

```css
/* En-tête magasin */
.header-magasin {
  background: linear-gradient(to right, #8B1538, #ED1C24);
}

/* Bloc potentiel */
.bloc-potentiel {
  background: linear-gradient(to right, #ED1C24, #8B1538);
}
```

### 7.3 Indicateurs visuels

| État | Couleur | Classe CSS | Usage |
|------|---------|------------|-------|
| Positif | Vert | `text-green-600` | Au-dessus de la moyenne |
| Neutre | Gris | `text-gray-600` | Dans la moyenne |
| Négatif | Rouge | `text-[#ED1C24]` | En-dessous, à améliorer |
| Potentiel | Orange | `text-orange-500` | Opportunité identifiée |
| Créneau actif | Bordeaux | `bg-[#8B1538]` | Tranche horaire en cours |

---

## 8. STRUCTURE DU PROJET REACT

### 8.1 Arborescence des fichiers

```
📁 src/
├── 📁 components/
│   ├── 📄 AccueilGlobal.jsx              ← Choix Manager / Équipe
│   │
│   ├── 📁 manager/                        ← UNIVERS MANAGER
│   │   ├── 📄 WizardManager.jsx          ← Container wizard 6 étapes
│   │   ├── 📄 Etape0Import.jsx           ← Import données
│   │   ├── 📄 Etape1Diagnostic.jsx       ← Benchmark + Flux client
│   │   ├── 📄 Etape2ObjectifCA.jsx       ← Objectif semaine
│   │   ├── 📄 Etape3Configuration.jsx    ← Jours, opérations, regroupement
│   │   ├── 📄 Etape4PilotageCA.jsx       ← Ventes + Casse + Gamme (temps réel)
│   │   ├── 📄 Etape5Communication.jsx    ← Génération fichier
│   │   └── 📁 components/
│   │       ├── 📄 CarteIndicateur.jsx
│   │       ├── 📄 GraphiqueFlux.jsx
│   │       ├── 📄 TableauBenchmark.jsx
│   │       ├── 📄 VueCasse.jsx
│   │       ├── 📄 GammeActive.jsx
│   │       └── 📄 ConfigRegroupement.jsx
│   │
│   ├── 📁 equipe/                         ← UNIVERS ÉQUIPE
│   │   ├── 📄 AccueilEquipe.jsx          ← Navigation 3 modules
│   │   ├── 📄 PlanningJour.jsx           ← Planning cuisson
│   │   ├── 📄 Inventaire.jsx             ← Saisie stock
│   │   ├── 📄 Commande.jsx               ← Feuille de commande
│   │   └── 📁 components/
│   │       ├── 📄 LigneProduit.jsx
│   │       ├── 📄 SaisieQuantite.jsx
│   │       └── 📄 LigneCommande.jsx
│   │
│   └── 📁 shared/                         ← COMPOSANTS PARTAGÉS
│       ├── 📄 Header.jsx
│       ├── 📄 Navigation.jsx
│       ├── 📄 BoutonPrimaire.jsx
│       ├── 📄 Tableau.jsx
│       └── 📄 Modal.jsx
│
├── 📁 services/
│   ├── 📄 dataExtractionService.js       ← Extraction Excel (ventes, casse)
│   ├── 📄 calculService.js               ← Calculs CA, casse, répartition
│   ├── 📄 fichierManagerService.js       ← Génération/lecture fichier manager
│   ├── 📄 fichierEquipeService.js        ← Génération/lecture fichier équipe
│   └── 📄 storageService.js              ← Sauvegarde locale
│
├── 📁 hooks/
│   ├── 📄 useWizardManager.js            ← État wizard manager
│   ├── 📄 usePilotageCA.js               ← État temps réel CA
│   ├── 📄 useInventaire.js               ← État inventaire
│   └── 📄 useCommande.js                 ← État commande
│
├── 📁 context/
│   ├── 📄 MagasinContext.jsx             ← Contexte magasin global
│   └── 📄 ConfigContext.jsx              ← Configuration semaine
│
├── 📁 utils/
│   ├── 📄 formatters.js                  ← Formatage dates, nombres
│   ├── 📄 calculsCasse.js                ← Calculs taux casse
│   └── 📄 repartitionFlux.js             ← Répartition selon flux client
│
├── 📄 App.jsx                             ← Router principal
└── 📄 index.css                           ← Styles Tailwind + variables
```

### 8.2 Routes

```javascript
// App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Accueil */}
        <Route path="/" element={<AccueilGlobal />} />
        
        {/* Univers Manager */}
        <Route path="/manager" element={<WizardManager />} />
        <Route path="/manager/etape/:step" element={<WizardManager />} />
        
        {/* Univers Équipe */}
        <Route path="/equipe" element={<AccueilEquipe />} />
        <Route path="/equipe/planning" element={<PlanningJour />} />
        <Route path="/equipe/inventaire" element={<Inventaire />} />
        <Route path="/equipe/commande" element={<Commande />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### 8.3 État global (Context)

```javascript
// context/MagasinContext.jsx
const MagasinContext = createContext();

const initialState = {
  magasin: null,           // { code, nom, enseigne, secteur, modele }
  semaine: null,           // { numero, annee, debut, fin }
  fichierManager: null,    // Données du fichier manager
  fichierEquipe: null,     // Données du fichier équipe
  configuration: {
    joursOuverts: [],
    livraisonMP: null,
    regroupementColonnes: {
      avant9h_9h12h: false,
      midi_14h16h: false,
      soir_apres19h: false
    }
  }
};
```

---

## 9. NOTES POUR CLAUDE CODE

### 9.1 Priorité d'implémentation

1. **Phase 1** : AccueilGlobal + Navigation entre les 2 univers
2. **Phase 2** : Wizard Manager (étapes 0-2 : Import, Diagnostic, Objectif)
3. **Phase 3** : Wizard Manager (étapes 3-4 : Configuration, Pilotage CA avec casse)
4. **Phase 4** : Wizard Manager (étape 5 : Communication, génération fichier)
5. **Phase 5** : Univers Équipe (Planning, Inventaire, Commande)

### 9.2 Points d'attention

- **Calculs temps réel** : Utiliser `useMemo` et `useCallback` pour optimiser les recalculs dans Pilotage CA
- **Regroupement colonnes** : Le calcul reste sur 6 tranches, seul l'affichage change
- **Formule casse** : `PA Casse HT / PV Ventes TTC` (pas volumétrique)
- **Responsive** : Desktop pour Manager, Tablette pour Équipe
- **Impression** : Prévoir des styles `@media print` pour les feuilles de liaison

### 9.3 Fichiers Excel à parser

| Fichier | Colonnes utilisées |
|---------|-------------------|
| `Vente_Hebdo_*.xlsx` | CA, Tickets, Flux par créneau |
| `Casse_*.xlsx` | Libellé, PA HT, PV TTC, Qté casse |
| `Total_PDV_*.xlsx` | CA BVP, Tickets BVP, par magasin |
| `info_PDV.json` | Secteur, Modèle, Surface, Enseigne |

---

## 10. MODULE ANIMATION COMMERCIALE (Étape 4 Manager)

> **Source** : Fonctionnalités déjà codées dans `src/components/responsable/StepAnimationCommerciale.jsx`

### 10.1 Vue d'ensemble

Le module Animation Commerciale permet de gérer :
1. **Promotions sur produits existants** (avec calcul automatique d'élasticité)
2. **Produits exceptionnels** (Galette des Rois, Bûche de Noël, etc.)
3. **Impact global sur le CA et la marge**

---

### 10.2 Formule Marge Mousquetaires

> **Spécificité Mousquetaires** : La marge est calculée par rapport au PV TTC (et non au PV HT).

```
Marge % = (PV HT - PA HT) / PV TTC

Donc :
  PA HT = PV HT - (Marge% × PV TTC)
  Marge € = Marge% × PV TTC
```

**Exemple** : PV TTC = 1,79€, TVA = 5,5%, Marge = 42,3%
- PV HT = 1,79 / 1,055 = 1,70€
- Marge € = 0,423 × 1,79 = 0,76€
- PA HT = 1,70 - 0,76 = 0,94€

---

### 10.3 Période Promo Mousquetaires

Les promotions suivent un cycle **mercredi → mardi** (7 jours).

- **Début** : Pré-rempli avec le prochain mercredi
- **Fin** : Pré-rempli avec le mardi suivant (+6 jours)
- **Personnalisable** : Chaque produit peut avoir ses propres dates

---

### 10.4 Calcul de l'Élasticité

**Formule** :
```
Élasticité = (Marge normale € / Marge promo €) - 1
```

**Plafond** : L'élasticité est **plafonnée à 2.0** pour éviter des prévisions irréalistes.

| Élasticité | Signification | Qté objectif |
|------------|---------------|--------------|
| 0.5 | Faible réponse | +50% |
| 1.0 | Réponse moyenne | +100% (×2) |
| 2.0 (plafond) | Très forte réponse | +200% (×3) |

---

### 10.5 Calcul des Quantités

```javascript
// Quantité normale sur la période promo
const qteMoyenneParJour = qteNormaleHebdo / 7;
const qteNormalePeriode = qteMoyenneParJour * nbJoursPromo;

// Quantité objectif avec élasticité
const qteObjectif = Math.ceil(qteNormalePeriode * (1 + elasticite));
```

**Quantité Validée** : L'utilisateur peut modifier manuellement la Qté Objectif calculée.

---

### 10.6 Avantage Client

```
Avantage Client (%) = ((Prix Normal - Prix Promo) / Prix Normal) × 100
```

| Avantage | Couleur | Interprétation |
|----------|---------|----------------|
| ≥ 20% | 🟢 Vert | Très attractif |
| 10-20% | 🟠 Orange | Attractif |
| < 10% | 🔴 Rouge | Peu attractif |

---

### 10.7 Produits Exceptionnels

Produits **ponctuels sans historique** (Galette des Rois, Bûche de Noël, etc.)

| Champ | Type | Obligatoire |
|-------|------|:-----------:|
| Nom du produit | Texte | ✅ |
| Quantité / jour | Nombre | ✅ |
| Prix unitaire (€) | Nombre | ✅ |
| Marge % | Nombre | ❌ (défaut 40%) |
| Famille | Liste | ❌ |
| Programme | Liste | ❌ |
| Jours concernés | Checkboxes | ✅ |

**Jours par défaut** : Vendredi, Samedi, Dimanche pré-sélectionnés.

---

### 10.8 Impact Global sur le CA

Le module calcule en temps réel :

```
CA Prévisionnel = CA Base + Impact Promos + CA Exceptionnels
```

**4 cartes affichées** :

| Carte | Contenu |
|-------|---------|
| CA Base | CA total du rayon |
| Impact Promos | CA supplémentaire des promos |
| Exceptionnels | CA des produits exceptionnels |
| CA Prévisionnel | Somme totale + % progression |

**Équilibrage marge** :
```
Impact Marge = (Marge promos - Marge normale) + Marge exceptionnels
```

Les promos réduisent la marge unitaire, mais les exceptionnels (à marge normale) peuvent compenser.

---

### 10.9 Structure de Données Promo

```javascript
{
  plu: "9784",
  itm8: "47416020",
  libelle: "Baguette Tradition 250g",

  prixNormalTTC: 1.79,
  prixPromoTTC: 1.49,
  prixAchatHT: 0.94,

  margePct: 42.3,
  margeNormaleEuros: 0.76,
  margePromoEuros: 0.52,
  avantageClient: 16.8,

  elasticite: 0.46,
  qteNormaleHebdo: 450,
  qteNormalePeriode: 450,
  nbJoursPromo: 7,
  qteObjectif: 657,
  qteValidee: 657,

  dateDebut: "2026-01-29",
  dateFin: "2026-02-04"
}
```

### 10.10 Structure de Données Produit Exceptionnel

```javascript
{
  id: 1706435200000,
  nom: "Galette des Rois 6 parts",

  qteParJour: 12,
  qteTotale: 36,
  qteValidee: 36,

  prix: 15.00,
  margePct: 40,
  margeEuros: 6.00,

  famille: "PATISSERIE",
  programme: "Pâtisserie",

  jours: { lundi: false, mardi: false, mercredi: false,
           jeudi: false, vendredi: true, samedi: true, dimanche: true },
  joursListe: ["vendredi", "samedi", "dimanche"],
  nbJours: 3,

  caTotale: 540
}
```

---

## 11. DASHBOARD PILOTAGE CA (Étape 4 Manager)

> **Source** : Fonctionnalités codées dans `src/components/manager/Etape4PilotageCA.jsx`

### 11.1 Vue d'ensemble

Le Dashboard Pilotage CA est **toujours visible** en haut de l'écran et se met à jour en **temps réel** selon les produits activés/désactivés.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PILOTAGE CA - S03/2026                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────┐    ┌─────────────────────────┐            │
│  │ HISTORIQUE              │    │ PRÉVISION               │            │
│  │ CA         Casse        │    │ CA         Prog         │            │
│  │ 3 842 €    soit 8.2%    │    │ 4 150 €    +8.0%        │            │
│  │            315 €        │    │                          │            │
│  └─────────────────────────┘    └─────────────────────────┘            │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 45 produits actifs sur 52    Poids CA : 87%    ████████████░░░  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  [Gamme]  [Promo]  [Commande]                                           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 11.2 Bloc Historique

Affiche les données de la semaine passée :

| Indicateur | Description | Calcul |
|------------|-------------|--------|
| **CA** | Chiffre d'affaires des produits actifs | Σ caSemaine des produits actifs |
| **Casse** | Montant en PA HT + Taux % | Σ cassePAHTSemaine |
| **Taux Casse** | Pourcentage de casse | (PA HT Casse / PV TTC Ventes) × 100 |

**Couleurs du taux de casse** :
| Taux | Couleur | Classe CSS |
|------|---------|------------|
| < 5% | 🟢 Vert | `text-green-600` |
| 5-20% | 🟠 Orange | `text-amber-600` |
| > 20% | 🔴 Rouge | `text-red-600` |

---

### 11.3 Bloc Prévision

Affiche les objectifs de la semaine à venir :

| Indicateur | Description | Calcul actuel |
|------------|-------------|---------------|
| **CA Prévi** | CA prévisionnel | = caHisto (à améliorer avec objectifs) |
| **Progression** | % de progression visé | 0% (à implémenter) |

> **Note** : Le calcul de progression nécessite l'historique N-1 pour être fonctionnel.

---

### 11.4 Barre de Sélection

Affiche le résumé de la sélection de gamme :

| Indicateur | Description |
|------------|-------------|
| **Produits actifs** | "45 produits actifs sur 52" |
| **Poids CA** | Part du CA sélectionné vs CA total rayon |
| **Barre visuelle** | Progression de 0 à 100% |

```javascript
const pourcentageSelection = caTotalRayon > 0
  ? (caProduitsActifs / caTotalRayon) * 100
  : 0;
```

---

### 11.5 Tableau des Produits

Colonnes triables (clic sur en-tête) :

| Colonne | Description | Tri |
|---------|-------------|-----|
| **Actif** | Toggle on/off (bouton rond) | - |
| **Produit** | Libellé du produit | A-Z |
| **Rayon** | Badge coloré (Boulangerie, Viennoiserie, etc.) | Ordre défini |
| **Casse %** | Taux de casse avec couleur | ↑↓ |
| **Moy. Hebdo** | Quantité moyenne vendue | ↑↓ |
| **Potentiel** | MAX ventes / poids jour | ↑↓ |
| **CA Hebdo** | CA de la semaine en € | ↑↓ |
| **Tendance** | Icône + % (croissance/stable/déclin) | ↑↓ |
| **Fiabilité** | Barre + % (confiance dans les données) | ↑↓ |

**Couleurs par rayon** :
| Rayon | Couleur |
|-------|---------|
| BOULANGERIE | Stone (gris-beige) |
| VIENNOISERIE | Amber (doré) |
| PATISSERIE | Rose |
| SNACKING | Emerald (vert) |
| AUTRE | Slate (gris) |

---

### 11.6 Onglets

3 onglets pour organiser les fonctionnalités :

| Onglet | Icône | Contenu | Status |
|--------|-------|---------|--------|
| **Gamme** | Package | Sélection des produits actifs | ✅ Codé |
| **Promo** | Tag | Animations commerciales | ⏳ Placeholder |
| **Commande** | ShoppingCart | Paramètres commande | ⏳ Placeholder |

---

### 11.7 Calculs Temps Réel

Toutes les statistiques se recalculent automatiquement quand :
- Un produit est activé/désactivé
- Un filtre de recherche est appliqué
- Un tri est effectué

```javascript
const stats = useMemo(() => {
  const produitsActifs = produits.filter((p) => p.actif);

  const caHisto = produitsActifs.reduce((sum, p) => sum + (p.caSemaine || 0), 0);
  const casseMontant = produitsActifs.reduce((sum, p) => sum + (p.cassePAHTSemaine || 0), 0);
  const tauxCasse = caHisto > 0 ? (casseMontant / caHisto) * 100 : 0;

  const caTotalRayon = produits.reduce((sum, p) => sum + (p.caSemaine || 0), 0);
  const pourcentageSelection = caTotalRayon > 0 ? (caHisto / caTotalRayon) * 100 : 0;

  return {
    nbActifs: produitsActifs.length,
    nbTotal: produits.length,
    caHisto,
    caPrevi: caHisto,  // À améliorer
    progression: 0,     // À implémenter
    pourcentageSelection,
    tauxCasse,
    casseMontant,
  };
}, [produits]);
```

---

### 11.8 Structure de Données Produit

```javascript
{
  id: 1,
  libelle: "Baguette Tradition",
  rayon: "BOULANGERIE",

  // Quantités
  moyHebdo: 420,           // Moyenne ventes hebdo
  potentiel: 480,          // MAX ventes / poids jour

  // CA et Casse
  caSemaine: 315,          // CA de la semaine en €
  tauxCasse: 13,           // % de casse
  cassePAHTSemaine: 41,    // Casse en PA HT

  // Tendance
  tendance: "croissance",  // "croissance" | "stable" | "declin"
  tendancePourcent: 8,     // % de variation

  // Qualité données
  fiabilite: 85,           // % de confiance (0-100)

  // État
  actif: true              // Sélectionné ou non
}
```

---

### 11.9 Fonctionnalités à implémenter

| Fonctionnalité | Status | Description |
|----------------|--------|-------------|
| **Calcul progression réelle** | ⏳ À faire | Comparer avec historique N-1 |
| **Intégration onglet Promo** | ⏳ À faire | Lier avec StepAnimationCommerciale |
| **Intégration onglet Commande** | ⏳ À faire | Paramètres multi-livraisons |
| **Export PDF Dashboard** | ⏳ À faire | Générer rapport CA |

---

## 12. LOGIQUE MÉTIER À IMPLÉMENTER

> **Note** : Ces fonctionnalités sont documentées mais **pas encore codées**. Elles doivent être implémentées par Claude Code.

### 12.1 Décalage -4 Semaines pour la Fréquentation

#### Concept

Pour préparer le planning d'une semaine S, on utilise les données de fréquentation de la semaine **S-4** (4 semaines avant).

```
Semaine à préparer : S09 (24 fév - 2 mars)
Données utilisées  : S05 (27 jan - 2 fév)
                     ↑
                     4 semaines avant
```

#### Pourquoi -4 semaines ?

Le comportement client est fortement influencé par le **cycle de paie** (début/fin de mois). En prenant S-4, on obtient une semaine qui a la **même position dans le mois** :

| Semaine S09 | Position | Semaine S05 | Position |
|-------------|----------|-------------|----------|
| 24-28 fév | Fin de mois | 27-31 jan | Fin de mois |
| → Clients ont de l'argent | ✅ | → Clients avaient de l'argent | ✅ |

Si on prenait S-1 (semaine précédente), on pourrait avoir :
- S09 = fin de mois (clients avec budget)
- S08 = milieu de mois (clients sans budget)
→ Prévisions faussées !

#### Implémentation

```javascript
/**
 * Calcule la semaine de référence pour la fréquentation
 * @param {number} semainePreparee - Numéro de semaine à préparer (ex: 9)
 * @param {number} annee - Année (ex: 2026)
 * @returns {Object} - { semaine, annee } de la semaine de référence
 */
function getSemaineFrequentationReference(semainePreparee, annee) {
  let semaineRef = semainePreparee - 4;
  let anneeRef = annee;

  // Gestion du passage d'année
  if (semaineRef <= 0) {
    semaineRef = 52 + semaineRef; // Ex: -2 → 50
    anneeRef = annee - 1;
  }

  return { semaine: semaineRef, annee: anneeRef };
}

// Exemple :
// getSemaineFrequentationReference(9, 2026) → { semaine: 5, annee: 2026 }
// getSemaineFrequentationReference(2, 2026) → { semaine: 50, annee: 2025 }
```

#### Fichiers concernés

| Fichier | Modification |
|---------|--------------|
| `dataExtractionService.js` | Ajouter fonction de calcul S-4 |
| `Etape0Import.jsx` | Charger automatiquement les données S-4 |
| `MagasinContext.jsx` | Stocker la semaine de référence |

---

### 12.2 Comportement Client Début/Fin de Mois (Cycle de Paie)

#### Concept

Les clients ont un comportement d'achat différent selon leur position dans le cycle de paie :

| Période | Comportement | Impact BVP |
|---------|--------------|------------|
| **Fin de mois** (25-31) | Clients viennent de recevoir leur salaire | Achats plus importants, produits plaisir |
| **Début de mois** (1-7) | Budget encore disponible | Achats normaux à élevés |
| **Milieu de mois** (8-24) | Budget restreint | Achats réduits, produits essentiels |

#### Objectif

Utiliser une semaine de référence (S-4) qui a la **même configuration** de début/fin de mois pour que les prévisions soient cohérentes.

#### Détection automatique

```javascript
/**
 * Détermine la position d'une semaine dans le cycle de paie
 * @param {Date} dateDebut - Premier jour de la semaine
 * @returns {string} - "fin_mois" | "debut_mois" | "milieu_mois"
 */
function getPositionCyclePaie(dateDebut) {
  const jour = dateDebut.getDate();

  if (jour >= 25 || jour <= 2) {
    return "fin_mois";  // Période de paie (25-31 + 1-2)
  } else if (jour <= 7) {
    return "debut_mois"; // Budget encore OK
  } else {
    return "milieu_mois"; // Budget serré
  }
}

// Vérification que S et S-4 ont la même position
function verifierCoherenceCyclePaie(semainePreparee, semaineReference) {
  const positionS = getPositionCyclePaie(semainePreparee.dateDebut);
  const positionRef = getPositionCyclePaie(semaineReference.dateDebut);

  if (positionS !== positionRef) {
    console.warn(`⚠️ Attention : S${semainePreparee.numero} est en ${positionS}
                  mais S${semaineReference.numero} est en ${positionRef}`);
    return false;
  }
  return true;
}
```

#### Affichage utilisateur

Si les positions ne correspondent pas, afficher un avertissement :

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ⚠️ ATTENTION : Cycle de paie différent                                   │
│                                                                          │
│ La semaine S09 (fin de mois) utilise les données de S05 (milieu de mois)│
│ Les prévisions peuvent être moins fiables.                              │
│                                                                          │
│ [Utiliser quand même]  [Choisir une autre semaine de référence]         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 12.3 Calcul de la Progression CA (N vs N-1)

#### Concept actuel (à améliorer)

Actuellement dans `Etape4PilotageCA.jsx`, la progression est fixée à 0 :

```javascript
// Actuel - À REMPLACER
const caPrevi = caHisto;
const progression = 0;
```

#### Implémentation cible

```javascript
/**
 * Calcule la progression CA réelle vs N-1
 * @param {number} caActuel - CA de la semaine en cours
 * @param {number} caN1 - CA de la même semaine l'année précédente
 * @returns {Object} - { caPrevi, progression }
 */
function calculerProgression(caActuel, caN1) {
  // Si pas de données N-1, pas de progression calculable
  if (!caN1 || caN1 === 0) {
    return { caPrevi: caActuel, progression: 0, fiable: false };
  }

  const progression = ((caActuel - caN1) / caN1) * 100;

  return {
    caPrevi: caActuel,
    progression: progression,
    fiable: true
  };
}
```

#### Sources de données N-1

| Source | Fichier | Données |
|--------|---------|---------|
| Archives locales | `semaines/2025-S09/planning.json` | CA réalisé S09 2025 |
| Fichier Excel | `Vente_Hebdo_BVP_S09_2025.xlsx` | CA historique |

---

### 12.4 Fermetures Exceptionnelles (Règle 70/30)

> **Déjà documenté dans CDC V2** mais rappel ici pour Claude Code.

#### Concept

Quand un jour est fermé exceptionnellement (férié, travaux...), le CA prévu ce jour-là doit être **reporté** sur les jours adjacents :

| Report | Destination | Pourcentage |
|--------|-------------|-------------|
| **Avant** | Jour précédent ouvert | 70% |
| **Après** | Jour suivant ouvert | 30% |

#### Exemple

Fermeture exceptionnelle le **mercredi** :
- CA prévu mercredi : 500 €
- Report sur mardi (veille) : 500 × 70% = **350 €**
- Report sur jeudi (lendemain) : 500 × 30% = **150 €**

#### Implémentation

```javascript
/**
 * Redistribue le CA d'un jour fermé sur les jours adjacents
 * @param {Object} planning - Planning de la semaine
 * @param {string} jourFerme - Jour fermé (ex: "mercredi")
 * @returns {Object} - Planning modifié
 */
function redistribuerCAFermeture(planning, jourFerme) {
  const RATIO_AVANT = 0.70;
  const RATIO_APRES = 0.30;

  const jours = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
  const indexFerme = jours.indexOf(jourFerme);

  const caAReporter = planning[jourFerme].caPrevu;

  // Trouver le jour ouvert précédent
  let indexAvant = indexFerme - 1;
  while (indexAvant >= 0 && !planning[jours[indexAvant]].ouvert) {
    indexAvant--;
  }

  // Trouver le jour ouvert suivant
  let indexApres = indexFerme + 1;
  while (indexApres < 7 && !planning[jours[indexApres]].ouvert) {
    indexApres++;
  }

  // Reporter le CA
  if (indexAvant >= 0) {
    planning[jours[indexAvant]].caPrevu += caAReporter * RATIO_AVANT;
  }
  if (indexApres < 7) {
    planning[jours[indexApres]].caPrevu += caAReporter * RATIO_APRES;
  }

  // Mettre le jour fermé à 0
  planning[jourFerme].caPrevu = 0;

  return planning;
}
```

---

### 12.5 Répartition 70/30 pour Petites Quantités (Planning Équipe)

> **Implémenté** : Cette règle est codée dans `PlanningJour.jsx`.

#### Problème

Quand un produit a une quantité journalière **inférieure au nombre de tranches horaires** (6), la répartition par arrondi supérieur génère un total supérieur au potentiel réel.

**Exemple problématique** :
- Pain aux figues : potentiel jour = 4
- Répartition naïve (arrondi supérieur par tranche) : 2+2+1+1+1+1 = **8** ❌

#### Solution : Règle 70/30

Pour les produits avec **quantité < 6**, on répartit sur 2 séries de cuisson uniquement :

| Tranche | Pourcentage | Logique |
|---------|-------------|---------|
| **Avant 9h** (première cuisson) | 70% | Mise en rayon à l'ouverture |
| **Tranche la plus forte** | 30% | Réassort au pic de fréquentation |
| Autres tranches | 0 | Pas de cuisson |

**Exemple corrigé** :
- Pain aux figues : potentiel jour = 4
- Avant 9h : `ceil(4 × 0.7)` = **3**
- Tranche forte (9h-12h) : `4 - 3` = **1**
- Total : 3 + 1 = **4** ✅

#### Code implémenté

```javascript
// Dans PlanningJour.jsx - calculerQuantites()
if (potentielJour > 0 && potentielJour < NB_TRANCHES) {
  // Trouver la tranche avec la plus forte fréquentation (hors première)
  let trancheForteKey = '09h_12h';
  TRANCHES.slice(1).forEach(trancheKey => {
    if (getPoidsTrancheNormalized(trancheKey) > trancheFortePoids) {
      trancheForteKey = trancheKey;
    }
  });

  // Répartition 70/30
  const qtePremiere = Math.ceil(potentielJour * 0.7);
  const qteForte = potentielJour - qtePremiere;

  tranches['00_Autre'] = { preco: qtePremiere };
  tranches[trancheForteKey] = { preco: qteForte };
}
```

#### Logique métier

Cette règle reflète la pratique réelle en boulangerie :
1. **Cuisson du matin** : Préparer le rayon pour l'ouverture (70%)
2. **Réassort ciblé** : Une seule cuisson supplémentaire au moment du pic de fréquentation (30%)
3. **Pas de gaspillage** : Ne pas cuire pour des tranches à faible demande

---

### 12.6 Récapitulatif des Implémentations

| Fonctionnalité | Priorité | Complexité | Fichiers | Statut |
|----------------|----------|------------|----------|--------|
| Décalage S-4 fréquentation | 🔴 Haute | Moyenne | dataExtractionService, Etape0Import | ⏳ À faire |
| Détection cycle paie | 🟠 Moyenne | Faible | Nouveau service | ⏳ À faire |
| Progression N vs N-1 | 🟠 Moyenne | Moyenne | Etape4PilotageCA | ⏳ À faire |
| Fermetures 70/30 | 🟢 Basse | Moyenne | planningCalculator | ⏳ À faire |
| **Répartition 70/30 petites qté** | 🔴 Haute | Faible | PlanningJour.jsx | ✅ **Fait** |

---

## 13. FLUX DE DONNÉES ET STRUCTURE DES FICHIERS EXCEL

> **Section ajoutée le 28 janvier 2026** - Basée sur le schéma Excalidraw du flux application

### 13.1 Vue d'ensemble du flux de données

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUX DE DONNÉES MANAGER                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  FICHIER FRÉQUENTATION                    FICHIER VENTES MAGASIN            │
│  vente_hebdo_BVP_SAAAA-SS.xlsx           Comparatif Ventes/Casse            │
│  (2400 magasins)                          (1 magasin, par EAN, par jour)    │
│           │                                         │                        │
│           │ Semaine S-4                             │ Semaines S-1, S-2, S-3│
│           │ (même position cycle paie)              │ (3 sem. minimum)      │
│           ▼                                         ▼                        │
│  ┌─────────────────┐                    ┌─────────────────┐                 │
│  │ Poids des jours │                    │ Gamme produits  │                 │
│  │ Poids tranches  │                    │ Qté vendues     │                 │
│  │ horaires        │                    │ CA par produit  │                 │
│  └────────┬────────┘                    │ Casse par EAN   │                 │
│           │                             │ Tendance 3 sem  │                 │
│           │                             └────────┬────────┘                 │
│           │                                      │                           │
│           └──────────────┬───────────────────────┘                          │
│                          ▼                                                   │
│              ┌─────────────────────┐                                        │
│              │ CALCUL POTENTIEL    │                                        │
│              │ par article         │                                        │
│              │ par jour            │                                        │
│              │ par tranche horaire │                                        │
│              └─────────────────────┘                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 13.2 Fichier Fréquentation : `vente_hebdo_BVP_SAAAA-SS.xlsx`

#### 13.2.1 Informations générales

| Propriété | Valeur |
|-----------|--------|
| **Nom fichier** | `vente_hebdo_BVP_S{ANNEE}-{SEMAINE}.xlsx` |
| **Contenu** | TOUS les magasins du parc (≈2400 PDV) |
| **Onglet à utiliser** | **Vente jour heure** |
| **Autres onglets** | PARAMETRES, Total Pdv, Vente heure, Ventes Horaire Nomenclature |

#### 13.2.2 Structure colonnes - Onglet "Vente jour heure"

| Colonne | Nom | Description | Exemple |
|---------|-----|-------------|---------|
| A | ENSEIGNE | Enseigne du magasin | INTERMARCHE |
| B | REGION | Région | 5-CENTRE-EST |
| C | VOCATION | Type de magasin | SUPER ALIMENTAIRE |
| D | CP | Code postal | 39000 |
| E | CODE_PDV | Code magasin (5 chiffres) | 07105 |
| F | VILLE | Ville du magasin | LONS-LE-SAUNIER |
| G | JOUR | Jour de la semaine | 1 - Lundi, 2 - Mardi, ..., 7 - Dimanche |
| H | HORAIRE | Tranche horaire | 00_Autre, 09h_12h, 12h_14h, 14h_16h, 16h_19h, 19h_23h |

#### 13.2.3 Données par période (3 périodes dans le fichier)

| Période | Description | Usage |
|---------|-------------|-------|
| **S-4** (ex: 2025-22) | Semaine 4 semaines avant | **Répartition planning** (même position cycle paie) |
| **A-1 S-4** (ex: 2024-22) | Même semaine année précédente | Comparaison N-1 |
| **S-5** (ex: 2025-21) | Semaine précédente de S-4 | Tendance |

**Colonnes de données pour chaque période :**

| Colonne | Description |
|---------|-------------|
| Ca Tot BVP | Chiffre d'affaires BVP (Boulangerie Viennoiserie Pâtisserie) |
| Qte Tot BVP | Quantité totale BVP |
| Nb Ticket BVP | Nombre de tickets avec achat BVP |
| Ca Tot | Chiffre d'affaires total du PDV |
| Qte Tot | Quantité totale PDV |
| Nb Ticket | Nombre de tickets total PDV |

#### 13.2.4 Calcul du décalage S-4

```javascript
/**
 * Pour construire le planning de la semaine S, on utilise
 * la fréquentation de S-4 (même position dans le cycle de paie)
 *
 * Exemple : Je suis en S34, je construis S35
 * → Fréquentation utilisée : S35 - 4 = S31
 */
function getSemaineFrequentation(semaineAPreparer) {
  return semaineAPreparer - 4;
}
```

**Pourquoi S-4 ?** Le comportement client suit le cycle de paie mensuel :
- Fin de mois (25-31) : Clients avec budget → achats élevés
- Début de mois (1-7) : Budget encore OK
- Milieu de mois (8-24) : Budget serré → achats réduits

En prenant S-4, on a la même position dans le mois.

### 13.3 Fichier Ventes Magasin : Comparatif Ventes/Casse

#### 13.3.1 Informations générales

| Propriété | Valeur |
|-----------|--------|
| **Source** | Export Mercalys |
| **Contenu** | UN seul magasin |
| **Niveau détail** | Par EAN, par jour |
| **Période requise** | Minimum 3 semaines (S-1, S-2, S-3) |

#### 13.3.2 En-tête du fichier

```
PDV: 10679 - SAS CHAMAFRI
Date: 26/01/2026  Heure: 15:17:11
Statistique: Comparatif Ventes / Casse + Dons + Stickage
Niveau de détail: EAN
Détail Période: Par Jour
Type valorisation: PA
Sélection de données: Du 01/01/2026 Au 25/01/2026
```

#### 13.3.3 Structure des colonnes

| Colonne | Description | Usage |
|---------|-------------|-------|
| **Code EAN** | Code produit (point commun entre fichiers) | Identifiant unique |
| **Libellé EAN** | Nom du produit | Ex: "BAGUETTE PRECUITE/250G CU" |
| **Mode de Gestion** | Type de gestion stock | Ex: "non géré en stock" |
| **CDT Achat** | Conditionnement (nb produits/carton) | Pour calcul commande |
| **Rotation** | Indicateur rotation | - |
| **Vente** | - | - |
| **DLV** | Date Limite de Vente | - |
| **Date** | Date de la vente | ⚠️ **Filtrer : utiliser UNIQUEMENT les lignes avec date** |
| **Ventes (Qté) HT** | Quantité vendue dans la journée | **Calcul potentiel** |
| **Ventes TVA** | TVA sur ventes | - |
| **Ventes PV TTC** | Chiffre d'affaires TTC | **Calcul CA et taux casse** |
| **Ventes Val Marges** | Valeur marge | - |
| **Ventes % Marge** | Pourcentage marge | - |
| **Dons, Casse et Stickage (Qté)** | Quantité cassée | **Nombre d'unités non vendues** |
| **Dons, Casse et Stickage PA HT** | Valeur casse en PA HT | **Calcul taux casse** |
| **Dons, Casse et Stickage TVA** | TVA casse | - |
| **Dons, Casse et Stickage PV TTC** | PV TTC casse | - |
| **Dons, Casse et Stickage Val Marge** | Marge casse | - |
| **Rentabilité** | Indicateur rentabilité | - |
| **Taux de Dons, Casse** | ⚠️ **FAUX dans le fichier** | À recalculer |

#### 13.3.4 Calcul du taux de casse (IMPORTANT)

> ⚠️ **Le taux dans le fichier Excel est FAUX !** Il faut le recalculer dans l'application.

```javascript
/**
 * Formule Mousquetaires pour le taux de casse
 * Mesure l'impact ÉCONOMIQUE sur la rentabilité
 */
const tauxCasse = (cassePAHT / ventesPVTTC) * 100;

// Taux moyen BVP ≈ 5%
```

**Seuils d'alerte casse :**

| Taux | Statut | Couleur | Action |
|------|--------|---------|--------|
| < 5% | ✅ Normal | Vert | Garder |
| 5-15% | ⚠️ Attention | Orange | Surveiller, réduire qté |
| > 15% | 🔴 Alerte | Rouge | Retirer de la gamme ? |

### 13.4 Calcul du potentiel par article

#### 13.4.1 Étape A : Calcul des poids (fichier fréquentation)

```javascript
// Poids des jours de la semaine
const poidsJour = totalQteVendueJour / totalQteSemainePDV;

// Poids de chaque tranche horaire pour chaque jour
const poidsTranche = qteTrancheJour / qteTotaleJour;
```

#### 13.4.2 Étape B : Calcul du potentiel (fichier ventes magasin)

```javascript
// Moyenne de vente par article et par jour
const moyenneVenteJour = totalVentesSemaine / nbJoursOuverts;

// Quantité max d'un article sur la semaine
const qteMaxSemaine = Math.max(...ventesParJour);

// Potentiel de vente semaine = qté max / poids du jour où a eu lieu la vente max
const potentielSemaine = qteMaxSemaine / poidsJourVenteMax;

// Potentiel de vente par jour
const potentielJour = potentielSemaine * poidsJour;

// Potentiel de vente par tranche horaire
const potentielTranche = potentielJour * poidsTranche;
```

#### 13.4.3 Règles de répartition selon la quantité journalière

> ⚠️ **NOUVELLE RÈGLE** - Remplace l'ancienne règle 70/30 unique

| Qté journée | Nb cuissons | Répartition |
|-------------|-------------|-------------|
| **< 6** (inférieur au nb de tranches) | 2 | 70% ouverture + 30% tranche la plus fréquentée |
| **6 à 10** | 3 | 60% ouverture + 20% + 20% (2 tranches les + fréquentées) |
| **10 à 20** | 3 | 40% ouverture + 30% + 30% (2 tranches les + fréquentées) |
| **> 20** | 6 | Répartition classique selon poids des tranches |

```javascript
function repartirQuantite(potentielJour, poidsTranchesTrie) {
  if (potentielJour < 6) {
    // 2 répartitions : 70% ouverture + 30% tranche forte
    return {
      ouverture: Math.ceil(potentielJour * 0.70),
      trancheForte1: potentielJour - Math.ceil(potentielJour * 0.70)
    };
  } else if (potentielJour <= 10) {
    // 3 répartitions : 60% + 20% + 20%
    const ouv = Math.ceil(potentielJour * 0.60);
    const reste = potentielJour - ouv;
    return {
      ouverture: ouv,
      trancheForte1: Math.ceil(reste / 2),
      trancheForte2: reste - Math.ceil(reste / 2)
    };
  } else if (potentielJour <= 20) {
    // 3 répartitions : 40% + 30% + 30%
    const ouv = Math.ceil(potentielJour * 0.40);
    const reste = potentielJour - ouv;
    return {
      ouverture: ouv,
      trancheForte1: Math.ceil(reste / 2),
      trancheForte2: reste - Math.ceil(reste / 2)
    };
  } else {
    // Répartition classique selon poids
    return repartitionClassique(potentielJour, poidsTranchesTrie);
  }
}
```

### 13.5 Ajustement intelligent

#### 13.5.1 Analyse de tendance (sur 3 semaines)

```javascript
// Évolution des ventes sur 3 semaines
const tendance = ((venteS1 - venteS3) / venteS3) * 100;

// Si article en progression > potentiel calculé → augmenter
// Si article en régression → alerte utilisateur
if (tendance > 20 && potentielCalcule < tendance) {
  // Ajuster le potentiel à la hausse
  potentielAjuste = potentielCalcule * (1 + tendance/100);
} else if (tendance < -10) {
  // Alerte : produit en régression
  alert("⚠️ Attention : produit en régression");
}
```

#### 13.5.2 Alerte casse

```javascript
// Si casse élevée ET en progression sur 3 semaines
if (tauxCasse > 15 && tendanceCasse > 0) {
  alert("🔴 Alerte casse : produit à surveiller ou retirer");
}
```

#### 13.5.3 Limitateur par famille de produit

| Code | Signification | Application |
|------|---------------|-------------|
| **S** | Sans limite | Pas de plafond |
| **F** | Forte | +20% max par rapport à la moyenne |
| **f** | Faible | Limiter les quantités |

### 13.6 Gestion des jours d'ouverture

#### 13.6.1 Gestion par demi-journée

L'application supporte la configuration par demi-journée (matin/après-midi).

#### 13.6.2 Fermeture exceptionnelle

En cas de fermeture exceptionnelle (férié, travaux...), les quantités sont reportées :

| Report | Destination | Pourcentage par défaut |
|--------|-------------|------------------------|
| Avant | Jour précédent ouvert | **75%** |
| Après | Jour suivant ouvert | **25%** |

> **Note** : Ce rapport est configurable par l'utilisateur.

```javascript
function redistribuerFermetureExceptionnelle(planning, jourFerme, ratioAvant = 0.75) {
  const ratioApres = 1 - ratioAvant;
  const qteAReporter = planning[jourFerme].qtePrevue;

  planning[jourPrecedentOuvert].qtePrevue += qteAReporter * ratioAvant;
  planning[jourSuivantOuvert].qtePrevue += qteAReporter * ratioApres;
  planning[jourFerme].qtePrevue = 0;

  return planning;
}
```

#### 13.6.3 Fermeture habituelle

Pour les fermetures habituelles (ex: dimanche), **pas de report** : les données de fréquentation sont déjà calées sur les bons créneaux.

### 13.7 Récapitulatif du flux Manager

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ÉTAPES DU FLUX MANAGER                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1️⃣ CHOIX DU DOSSIER                                                         │
│     → Sélectionner le dossier contenant vente_hebdo_BVP_SAAAA-SS.xlsx       │
│     → Fichiers comportent 2400 magasins (impossible de tout télécharger)    │
│                                                                              │
│  2️⃣ CHOIX DU MAGASIN                                                         │
│     → Recherche par CODE_PDV (5 chiffres) ou VILLE                          │
│                                                                              │
│  3️⃣ CHOIX SEMAINE DE PLANIFICATION                                          │
│     → Par défaut : dernière semaine disponible                              │
│                                                                              │
│  4️⃣ PRÉSENTATION RÉSULTATS                                                   │
│     → Chiffres clés (CA, Tickets, Ticket moy, Prix moy)                     │
│     → Modèle BVP + magasins comparables (même modèle, même secteur)         │
│     → Tickets manqués par tranche horaire                                   │
│     → Potentiel = taux max appliqué à toutes les tranches                   │
│     → Plan d'action suggéré                                                 │
│                                                                              │
│  5️⃣ CHOIX SEMAINE PLANNING                                                   │
│     A) Importer fréquentation avec décalage S-4                             │
│        Ex: Je construis S35 → J'utilise fréquentation S31                   │
│     B) Importer ventes magasin (mini 3 semaines)                            │
│        Ex: Je suis en S34 → J'importe S33, S32, S31                         │
│                                                                              │
│  6️⃣ CALCUL POTENTIEL PAR ARTICLE                                             │
│     → Poids jours + poids tranches (fréquentation)                          │
│     → Moyenne, max, potentiel (ventes magasin)                              │
│     → Règles de répartition (<6, 6-10, 10-20, >20)                          │
│     → Ajustement tendance + alertes casse                                   │
│                                                                              │
│  7️⃣ DÉTERMINATION JOURS D'OUVERTURE                                          │
│     → Gestion demi-journées                                                 │
│     → Fermetures exceptionnelles (75%/25%)                                  │
│     → Fermetures habituelles (pas de report)                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

**Document rédigé le 25 janvier 2026**
**Mis à jour le 28 janvier 2026** : Ajout sections 10, 11, 12
**Mis à jour le 28 janvier 2026** : Ajout section 12.5 (Répartition 70/30)
**Mis à jour le 28 janvier 2026** : Ajout section 13 (Flux de données et structure fichiers Excel)
**Version 5.4.0**
**Statut : En cours de développement**
