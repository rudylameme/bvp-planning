# CAHIER DES CHARGES V3.0 - APPLICATION BVP PLANNING

**Version** : 3.0.2
**Date** : 16 janvier 2026
**Statut** : En cours de validation

---

## FEUILLE DE ROUTE DÉPLOIEMENT

### Historique
- **V1** : 3 magasins pilotes (test initial)
- **V2** : Développement local uniquement → **Ne sera jamais déployée**
- **V3** : Version de déploiement cible (2400 magasins)

### Planning 2026

| Période | Objectif | Détails |
|---------|----------|---------|
| **Janvier** | Finalisation V3 + Démarchage | Recruter 10 magasins pilotes pour tester le POC |
| **Février** | Formation pilotes | Former et accompagner les 10 magasins pilotes |
| **Mars - Avril** | Mesure d'impact | Analyser les KPIs : CA, casse, taux de pénétration, marge |
| **Mai** | Présentation CODIR | Présentation au Comité de Direction du Groupement + démo web |
| **Juin+** | Transfert SI | Confier le projet au Service Informatique pour déploiement 2400 magasins |

### KPIs à mesurer (Mars-Avril)

| Indicateur | Description | Objectif |
|------------|-------------|----------|
| **CA BVP** | Évolution du chiffre d'affaires rayon | +X% vs période N-1 |
| **Casse** | Réduction des invendus | -X% vs période N-1 |
| **Taux de pénétration** | % clients achetant en BVP | +X points |
| **Marge** | Impact sur la marge brute | Maintien ou amélioration |

### Pilotes actuels

| # | Magasin | Version | Statut |
|---|---------|---------|--------|
| 1 | (à définir) | V1 | ✅ Test effectué |
| 2 | (à définir) | V1 | ✅ Test effectué |
| 3 | (à définir) | V1 | ✅ Test effectué |
| 4-13 | À recruter | V3 | ⏳ Janvier 2026 |

---

## CHANGELOG V3.0.2 - AMÉLIORATIONS UX (16 janvier 2026)

### Nouveautés V3.0.2

| Fonctionnalité | Description | Impact | Statut |
|----------------|-------------|--------|--------|
| **Modes calcul par défaut "f"** | Tous les produits démarrent en mode Prudent (+10% max) au lieu de S/F/f mixte | Évite les % effrayants (+184%) | ⏳ À faire |
| **Recherche par désignation** | Ajout d'un champ de recherche par nom de produit dans la sélection des promos | Plus rapide que PLU/ITM8/EAN | ⏳ À faire |
| **CSS impression largeurs fixes** | Les colonnes de la fiche de commande ont des largeurs fixes en mode impression | Résultat identique quelle que soit la taille de la fenêtre | ⏳ À faire |
| **Suppression page blanche** | L'impression de la fiche de commande ne génère plus de page 3 vide | Économie de papier | ⏳ À faire |

### Détail des améliorations

#### 1. Modes de calcul par défaut → "f" (Prudent)

**Problème identifié** : Avec les valeurs par défaut actuelles (mélange S/F/f), certains produits affichent des progressions CA de +184% ou +114%, ce qui est irréaliste et effraie l'utilisateur.

**Solution** : Tous les produits démarrent en mode "f" (Prudent, +10% max) par défaut. L'utilisateur peut ensuite passer en mode F ou S manuellement s'il le souhaite.

**Fichier concerné** : `src/components/responsable/PilotageCA.jsx`

```javascript
// Avant
modeCalcul: produit.modeCalcul || 'S'  // Défaut agressif

// Après
modeCalcul: produit.modeCalcul || 'f'  // Défaut prudent
```

#### 2. Recherche produit par désignation (Promos)

**Problème identifié** : Dans le module Animation Commerciale (Promos), la recherche de produit ne fonctionne que par PLU, ITM8 ou EAN. L'utilisateur doit connaître ces codes.

**Solution** : Ajouter un champ de recherche textuelle qui filtre aussi par désignation (nom du produit).

**Fichier concerné** : `src/components/responsable/StepAnimationCommerciale.jsx`

```
┌─────────────────────────────────────────────────────────────────┐
│  🔍 Rechercher un produit                                       │
├─────────────────────────────────────────────────────────────────┤
│  [Recherche par désignation, PLU, ITM8 ou EAN...]              │
│                                                                  │
│  Résultats :                                                     │
│  • 4741 6010 - BAGUETTE BLANCHE PAC 250G                        │
│  • 4741 6015 - 1/2 BAGUETTE BLANCHE PAC 125G                    │
│  • 1815 3450 - BAGUETTE BIO PAC 250G                            │
└─────────────────────────────────────────────────────────────────┘
```

#### 3. CSS impression avec largeurs fixes

**Problème identifié** : Les colonnes de la fiche de commande s'adaptent à la largeur de la fenêtre. Le résultat imprimé varie selon la taille de la fenêtre au moment du clic sur "Imprimer".

**Solution** : Ajouter des règles CSS `@media print` avec des largeurs de colonnes fixes.

**Fichier concerné** : CSS du composant d'impression ou `src/index.css`

```css
@media print {
  .fiche-commande-table th,
  .fiche-commande-table td {
    /* Largeurs fixes pour impression cohérente */
  }

  .fiche-commande-table .col-itm8 { width: 70px; }
  .fiche-commande-table .col-produit { width: 250px; }
  .fiche-commande-table .col-cdt { width: 40px; }
  .fiche-commande-table .col-cmd { width: 50px; }
  .fiche-commande-table .col-liv { width: 45px; }
}
```

#### 4. Suppression de la page blanche à l'impression

**Problème identifié** : L'impression de la fiche de commande génère une page 3 vide.

**Solution** : Ajuster les marges et le contenu pour éviter le débordement sur une page supplémentaire.

---

## CHANGELOG V3.0.1 - MISE À JOUR MODULE COMMANDE

### Nouveautés V3.0.1 (14 janvier 2026)

| Fonctionnalité | Description | Impact |
|----------------|-------------|--------|
| **Tri colonnes Pilotage CA** | Clic sur en-têtes pour trier par n'importe quelle colonne | Navigation plus rapide |
| **Détection nom magasin** | Extraction automatique du nom depuis fichiers Excel | Moins de saisie manuelle |
| **Chargement CDT automatique** | Conditionnements chargés depuis fichier référentiel | Calculs cartons précis |
| **Édition CDT avec NC** | Possibilité de modifier le CDT, "NC" si non communiqué | Flexibilité sur produits sans CDT |
| **Dates de livraison** | Configuration dates commande ET réception par livraison | Planification multi-livraisons |
| **Livraison Forte** | Regroupement des petites quantités sur une livraison | Réduction réceptions |
| **Impression Fiche Commande** | Modal d'impression A4 paysage, sans lignes NC | Export papier propre |

---

## CHANGELOG V3.0 - ÉVOLUTION MAJEURE : STOCKAGE PARTAGÉ

### Nouveautés V3.0

| Fonctionnalité | Description | Impact |
|----------------|-------------|--------|
| **Stockage Partagé** | Dossier commun (réseau/NAS/USB) accessible par tous les profils | Plus besoin d'importer/exporter de fichiers |
| **Synchronisation Automatique** | Les données sont partagées automatiquement entre Responsable et Équipier | Plus de transfert manuel via clé USB ou email |
| **Archivage par Semaine** | Chaque semaine est archivée avec ses prévisions et données réelles | Historique complet pour analyse |
| **Module Analyse Prévisions vs Réel** | Comparaison automatique des prévisions avec les ventes réelles | Amélioration continue des prévisions |
| **Inventaire Daté** | L'inventaire porte une date précise pour le calcul du stock projeté | Commandes plus précises |
| **Stock Projeté** | Calcul automatique du stock en tenant compte des livraisons et consommations à venir | Gestion optimisée des commandes S et S+1 |

### Ce qui reste inchangé (Code V2 conservé)

- Wizard Responsable (Import, Configuration, Pilotage CA, Promos, Commande, Export)
- Module Commande avec multi-livraisons
- Calcul des potentiels (modes S/F/f)
- Planning Jour avec tranches horaires
- Module Casse
- Format des données produits
- Conditionnements (CDT)
- Interface utilisateur

---

## SOMMAIRE

1. [Vision et Philosophie](#1-vision-et-philosophie)
2. [Utilisateurs et Profils](#2-utilisateurs-et-profils)
3. [Architecture Stockage Partagé (NOUVEAU V3)](#3-architecture-stockage-partagé-nouveau-v3)
4. [Parcours Utilisateur Détaillés](#4-parcours-utilisateur-détaillés)
5. [Fonctionnalités par Module](#5-fonctionnalités-par-module)
6. [Module Analyse Prévisions vs Réel (NOUVEAU V3)](#6-module-analyse-prévisions-vs-réel-nouveau-v3)
7. [Modèle de Données](#7-modèle-de-données)
8. [Règles Métier](#8-règles-métier)
9. [Interface Utilisateur](#9-interface-utilisateur)
10. [Architecture Technique](#10-architecture-technique)
11. [Évolutions Futures](#11-évolutions-futures)

---

## 1. VISION ET PHILOSOPHIE

### 1.1 Objectif Unique

> **Simplifier l'organisation du rayon BVP pour que ce soit facile et intuitif.**

### 1.2 Principes Directeurs

| Principe | Description |
|----------|-------------|
| **Zéro compétence informatique** | Utilisable par n'importe qui, sans formation |
| **5 minutes maximum** | Toute tâche doit pouvoir être accomplie en 5 min |
| **Tout est pré-rempli** | L'utilisateur valide, il ne configure pas |
| **Données locales** | Aucune donnée sensible stockée sur le web |
| **Synchronisation transparente** | Les données circulent automatiquement entre profils (NOUVEAU V3) |

### 1.3 Ce que l'Application Permet

- ✅ **Rythmer la production** tout au long de la journée
- ✅ **Anticiper le plaquage** pour le lendemain
- ✅ **Suivre la casse** pour affiner les prévisions
- ✅ **Aider à la commande** avec multi-livraisons
- ✅ **Piloter le CA** avec objectifs de progression
- ✅ **Imprimer ou afficher** le planning (papier / tablette)
- ✅ **Analyser les écarts** entre prévisions et ventes réelles (NOUVEAU V3)
- ✅ **Améliorer les prévisions** semaine après semaine (NOUVEAU V3)

### 1.4 Ce que l'Application N'est PAS

- ❌ Un système de gestion de stock en temps réel
- ❌ Une connexion au système de caisse
- ❌ Un outil de comptabilité ou de marges
- ❌ Une application nécessitant internet en permanence
- ❌ Un système cloud avec serveur distant

### 1.5 Périmètre Technique

#### ✅ Inclus
- Import données ventes et fréquentation (Excel/CSV)
- Reconnaissance automatique produits (ITM8)
- Calcul potentiels hebdomadaires (4 modes)
- Génération planning hebdomadaire avec répartition horaire
- Personnalisation complète (rayons, programmes, potentiels)
- Export planning (PDF, impression)
- **Dossier partagé local (réseau/NAS/USB)** (NOUVEAU V3)
- **Synchronisation automatique des données** (NOUVEAU V3)
- **Archivage semaine par semaine** (NOUVEAU V3)
- **Analyse Prévisions vs Réel** (NOUVEAU V3)
- Modules Équipe : Casse, Planning Jour, Plaquage, Inventaire

#### ❌ Exclu
- Gestion des stocks en temps réel
- ~~Synchronisation multi-utilisateurs temps réel~~ → Remplacé par stockage partagé
- Base de données persistante côté serveur
- Authentification/autorisation (login)
- Application mobile native
- Suivi des coûts/marges détaillé
- Connexion système de caisse
- Internet/Cloud

---

## 2. UTILISATEURS ET PROFILS

### 2.1 Profil RESPONSABLE

| Attribut | Description |
|----------|-------------|
| **Qui ?** | Propriétaire, Directeur, Chef de rayon |
| **Fréquence** | 1x par semaine ou lors de changements |
| **Compétences** | Sait utiliser Excel (basique) |
| **Objectif** | Configurer l'outil, importer les données, piloter le CA |

### 2.2 Profil ÉQUIPIER

| Attribut | Description |
|----------|-------------|
| **Qui ?** | Équipier BVP, Boulanger, Vendeur |
| **Fréquence** | Quotidien |
| **Compétences** | Aucune requise |
| **Objectif** | Suivre le planning, produire, noter la casse, saisir les stocks |

### 2.3 Répartition des Droits (inchangée V2)

| Fonctionnalité | Responsable | Équipier |
|----------------|:-----------:|:-------:|
| **IMPORT** | | |
| Import fréquentation | ✅ | ❌ |
| Import ventes | ✅ | ❌ |
| **CONFIGURATION** | | |
| Sélectionner produits actifs | ✅ | ❌ |
| Définir jours ouverture | ✅ | ❌ |
| Définir % progression CA | ✅ | ❌ |
| Jours commande/livraison | ✅ | ❌ |
| **PRODUCTION** | | |
| Valider "Plaqué" | ✅ | ✅ |
| Valider "Cuit" | ✅ | ✅ |
| **QUOTIDIEN** | | |
| Consulter planning jour | ✅ | ✅ |
| Consulter plaquage demain | ✅ | ✅ |
| Saisir casse | ✅ | ✅ |
| Saisir inventaire stock | ✅ | ✅ |
| **ANALYSE (NOUVEAU V3)** | | |
| Voir comparaison Prévu/Réel | ✅ | ❌ |
| Appliquer suggestions | ✅ | ❌ |

---

## 3. ARCHITECTURE STOCKAGE PARTAGÉ (NOUVEAU V3)

### 3.1 Concept

Au lieu d'échanger des fichiers `.bvp.json` par clé USB ou email, l'application utilise un **dossier partagé** accessible par tous les postes.

```
┌─────────────────────────────────────────────────────────────────┐
│                         AVANT (V2)                               │
│                                                                  │
│   PC Responsable                     Tablette Équipier          │
│   ┌──────────────┐                   ┌──────────────┐           │
│   │ Génère       │ ──── USB/Email ───▶ │ Charge       │          │
│   │ .bvp.json    │                   │ .bvp.json    │           │
│   └──────────────┘                   └──────────────┘           │
│                                             │                    │
│                   ◀──── USB/Email ────      │                    │
│                   (fichier mis à jour)      ▼                    │
│                                      Saisie stocks/casse        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         APRÈS (V3)                               │
│                                                                  │
│   PC Responsable      DOSSIER PARTAGÉ      Tablette Équipier   │
│   ┌──────────────┐    ┌──────────────┐     ┌──────────────┐    │
│   │ Lit/Écrit    │ ◀──│  BVP-Data/   │──▶  │ Lit/Écrit    │    │
│   │ directement  │    │  magasin/    │     │ directement  │    │
│   └──────────────┘    │  semaines/   │     └──────────────┘    │
│                       └──────────────┘                          │
│                                                                  │
│   ✅ Pas de transfert manuel                                    │
│   ✅ Données toujours à jour                                    │
│   ✅ Historique conservé                                        │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Options de Stockage

| Option | Description | Avantages | Inconvénients |
|--------|-------------|-----------|---------------|
| **Dossier réseau local** | Serveur NAS, PC partagé | Accès rapide, toujours disponible | Nécessite réseau local |
| **Clé USB partagée** | Clé dédiée au magasin | Simple, portable | Risque de perte |
| **Disque réseau (NAS)** | Synology, QNAP, etc. | Robuste, sauvegarde auto | Coût initial |
| **Dossier cloud sync** | Dropbox, OneDrive (en local) | Sauvegarde cloud | Dépendance externe |

### 3.3 Structure du Dossier Partagé

```
📁 BVP-Data/                           ← Dossier racine (choisi par l'utilisateur)
└── 📁 [Code Magasin]/                 ← Ex: "10679" ou "SAS_CHAMAFFI"
    │
    ├── 📄 config.json                 ← Configuration du magasin
    │   {
    │     "magasin": { "nom": "SAS CHAMAFFI", "code": "10679" },
    │     "joursOuverture": {...},
    │     "parametresCommande": {...},
    │     "derniereModification": "2026-01-13T14:30:00Z"
    │   }
    │
    ├── 📄 referentiel.json            ← Produits et conditionnements
    │   {
    │     "produits": [...],
    │     "conditionnements": {...},
    │     "derniereMAJ": "2026-01-13T10:00:00Z"
    │   }
    │
    ├── 📁 semaines/                   ← Une sous-dossier par semaine
    │   │
    │   ├── 📁 2026-S02/               ← Semaine en cours
    │   │   ├── 📄 planning.json       ← Planning prévisionnel
    │   │   ├── 📄 inventaires.json    ← Inventaires datés
    │   │   ├── 📄 commandes.json      ← Commandes multi-livraisons
    │   │   ├── 📄 casse.json          ← Casse quotidienne
    │   │   ├── 📄 production.json     ← Validations Plaqué/Cuit
    │   │   └── 📄 meta.json           ← Métadonnées semaine
    │   │
    │   ├── 📁 2026-S01/               ← Semaine précédente (archivée)
    │   │   ├── 📄 planning.json
    │   │   ├── 📄 inventaires.json
    │   │   ├── 📄 commandes.json
    │   │   ├── 📄 casse.json
    │   │   ├── 📄 production.json
    │   │   ├── 📄 ventes-reelles.json ← Données réelles (après import)
    │   │   ├── 📄 analyse.json        ← Comparaison Prévu vs Réel
    │   │   └── 📄 meta.json
    │   │
    │   └── 📁 2025-S52/               ← Archives plus anciennes
    │       └── ...
    │
    └── 📁 imports/                    ← Fichiers Excel importés (optionnel)
        ├── 📄 ventes_S01_2026.xlsx
        └── 📄 frequentation_S01_2026.xlsx
```

### 3.4 Détection Automatique du Dossier

Au premier lancement, l'application demande de sélectionner le dossier partagé :

```
┌─────────────────────────────────────────────────────────────────┐
│  🗂️ CONFIGURATION DU STOCKAGE                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Où souhaitez-vous stocker les données BVP ?                    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 📁 Parcourir...                                          │    │
│  │                                                          │    │
│  │ Chemin actuel : (non configuré)                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  💡 Conseils :                                                   │
│  • Choisissez un dossier accessible par tous les postes        │
│  • Un dossier réseau (NAS) est recommandé                      │
│  • Une clé USB dédiée peut aussi fonctionner                   │
│                                                                  │
│  [Sélectionner le dossier]                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.5 Gestion des Conflits d'Écriture

**Problématique** : Que se passe-t-il si Responsable et Équipier modifient en même temps ?

**Solution** : Écriture par fichier séparé + timestamps

```javascript
// Chaque modification ajoute un timestamp
{
  "inventaires": [
    {
      "dateInventaire": "2026-01-13",
      "heureCreation": "2026-01-13T08:30:00Z",
      "creePar": "equipier",
      "produits": [...]
    }
  ]
}

// Règles de fusion :
// 1. Lectures multiples simultanées : OK (pas de conflit)
// 2. Écritures : Le plus récent gagne (last-write-wins)
// 3. Données séparées : inventaires, casse, production ont des fichiers distincts
// 4. Le Responsable écrit: planning, config, commandes
// 5. L'Équipier écrit: inventaires, casse, production
```

### 3.6 Mode Hors-Ligne

Si le dossier partagé n'est pas accessible temporairement :

1. **Détection** : L'application vérifie l'accès au dossier au démarrage
2. **Mode dégradé** : Lecture seule des dernières données en cache local
3. **Alerte** : Bandeau "Mode hors-ligne - Données non synchronisées"
4. **Resynchronisation** : À la reconnexion, fusion des données locales

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ MODE HORS-LIGNE                                             │
│  Le dossier partagé n'est pas accessible.                       │
│  Les données affichées datent du 13/01/2026 14:30               │
│  Les modifications ne seront pas sauvegardées.                  │
│                                                     [Réessayer] │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. PARCOURS UTILISATEUR DÉTAILLÉS

### 4.1 Parcours RESPONSABLE - Wizard 8 Étapes (mise à jour V3)

Le Wizard Responsable reste identique à la V2, avec ces ajustements :

| Étape | Nom | Changements V3 |
|-------|-----|----------------|
| 1 | Import | Sauvegarde dans dossier partagé au lieu de fichier local |
| 2 | Analyse Semaine Passée | Lecture automatique des archives (plus besoin d'importer) |
| 3 | Horaires | Inchangé |
| 4 | Pilotage CA | **V3.0.1** : Tri des colonnes cliquable |
| 5 | Animation Commerciale | Inchangé |
| 6 | Commande | Lecture stocks depuis dossier partagé (saisis par équipe) |
| 7 | Planning Détaillé | Inchangé |
| 8 | Export & Archivage | Sauvegarde auto dans dossier partagé (plus d'export manuel) |

### 4.2 Changement Clé : Plus d'Export/Import Manuel

**Avant (V2)** :
```
1. Responsable génère MonMagasin-S02.bvp.json
2. Copie sur clé USB ou envoi par email
3. Équipier charge le fichier sur tablette
4. Équipier saisit stocks, casse
5. Récupère le fichier mis à jour
6. Responsable recharge le fichier
```

**Après (V3)** :
```
1. Responsable configure la semaine → Sauvegarde auto
2. Équipier ouvre l'app → Voit les données à jour
3. Équipier saisit stocks, casse → Sauvegarde auto
4. Responsable voit les stocks à jour immédiatement
```

### 4.3 Parcours ÉQUIPIER - Journée Type (inchangé + inventaire daté)

La journée type reste identique, avec une amélioration sur l'inventaire :

```
┌─────────────────────────────────────────────────────────────────┐
│  📦 INVENTAIRE STOCK                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📅 Date de l'inventaire : [13/01/2026] (modifiable)            │
│                                                                  │
│  💡 Cette date permet de calculer le stock projeté pour         │
│     les commandes de la semaine en cours et S+1                 │
│                                                                  │
│  🔍 Rechercher...                                                │
│                                                                  │
│  ═══════════════════════════════════════════════════════════    │
│  🥖 BOULANGERIE (45 produits)                                   │
│  ═══════════════════════════════════════════════════════════    │
│  ...                                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. FONCTIONNALITÉS PAR MODULE

### 5.1 Module IMPORT (Responsable) - Inchangé

| Fonctionnalité | Description | Priorité |
|----------------|-------------|----------|
| Import Fréquentation | Excel/CSV, 3 semaines, heure par heure | Critique |
| Import Ventes | Excel/CSV, 1 à N semaines, par produit/jour | Critique |
| Reconnaissance ITM8 | Identification automatique des produits | Critique |
| Calcul Potentiels Auto | Moyenne des ventes max / poids du jour | Critique |

### 5.2 Module PILOTAGE CA (Responsable) - Amélioré V3.0.1

| Fonctionnalité | Description | Priorité | Version |
|----------------|-------------|----------|---------|
| Définir objectif progression | % de hausse CA visé | Critique | V2 |
| Visualisation par produit | CA actuel vs objectif | Critique | V2 |
| **Tri colonnes** | Clic sur en-tête pour trier | Important | **V3.0.1** |
| **Détection nom magasin** | Auto depuis fichier Excel | Important | **V3.0.1** |

#### Tri des colonnes - V3.0.1

Toutes les colonnes du tableau Pilotage CA sont désormais triables par clic sur l'en-tête :

| Colonne | Tri possible | Description |
|---------|--------------|-------------|
| Produit | A-Z / Z-A | Tri alphabétique |
| Rayon | A-Z / Z-A | Groupement par rayon |
| CA Actuel | ↑ / ↓ | Tri par chiffre d'affaires |
| CA Objectif | ↑ / ↓ | Tri par objectif |
| Écart | ↑ / ↓ | Tri par écart CA |
| Potentiel | ↑ / ↓ | Tri par potentiel hebdo |

**Interface** :
- Clic = tri ascendant
- Second clic = tri descendant
- Indicateur visuel ▲/▼ sur la colonne triée

### 5.2b Module PLANNING JOUR (Équipier) - Inchangé

| Fonctionnalité | Description | Priorité |
|----------------|-------------|----------|
| Vue par tranche horaire | Matin / Midi / Après-midi | Critique |
| Affichage quantités | Unités + Plaques | Critique |
| Validation "Plaqué" | Préparé sur plaque | Critique |
| Validation "Cuit" | Sorti du four, en rayon | Critique |

### 5.3 Module COMMANDE (Responsable + Équipier)

#### Évolutions V3 et V3.0.1

| Fonctionnalité | V2 | V3 | V3.0.1 |
|----------------|----|----|--------|
| Lecture stocks | Import fichier équipier | Lecture directe dossier partagé | ✅ |
| Multi-livraisons | ✅ Disponible | ✅ Inchangé | ✅ |
| Stock projeté | ❌ Non disponible | ✅ Calcul automatique | ✅ |
| Inventaire daté | ❌ Non disponible | ✅ Date précise | ✅ |
| CDT automatique | ❌ Manuel | ❌ Manuel | ✅ Chargé depuis référentiel |
| Édition CDT | ❌ Non disponible | ❌ Non disponible | ✅ Modifiable, NC supporté |
| Dates livraison | ❌ Non disponible | ❌ Non disponible | ✅ Cmd + Réception |
| Livraison forte | ❌ Non disponible | ❌ Non disponible | ✅ Regroupement petites qtés |
| Impression | ❌ Non disponible | ❌ Non disponible | ✅ A4 paysage, sans NC |

#### Conditionnements (CDT) - V3.0.1

Les conditionnements sont maintenant chargés automatiquement depuis le fichier référentiel ITM8 :

```javascript
// Service conditionnementService.js
// Charge les CDT depuis le fichier Excel référentiel
// Colonnes détectées : ITM8, Libellé produit, Libellé commercial, CDT, ULV

// Exemple de données chargées
{
  "47416015": { cdt: 54, libelle: "BAGUETTE BLANCHE PAC 125G" },
  "19810234": { cdt: 6, libelle: "8 PANCAKES BIO EXTRA MOEL.176G" },
  "24740030": { cdt: 6, libelle: "AMARETTI NATURE 200G" }
}
```

**Gestion des produits sans CDT (NC)** :

Si un produit n'a pas de CDT dans le référentiel, il affiche "NC" (Non Communiqué) :
- Ces produits apparaissent en orange dans le tableau
- Ils sont **exclus** du comptage des références commandées
- Ils sont **exclus** de l'impression de la fiche de commande
- Le responsable peut saisir manuellement un CDT

```
┌─────────────────────────────────────────────────────────────────┐
│  📦 COMMANDE - Produit sans CDT                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  │ Produit              │ CDT │ Mini │ Stock │ À CMD │ Liv 1 │  │
│  │──────────────────────│─────│──────│───────│───────│───────│  │
│  │ BAGUETTE TRADITION   │ 26  │   2  │  --   │   4   │   2   │  │
│  │ PAIN SPECIAL (NC)    │ NC  │   2  │  --   │   -   │   -   │  │ ← Orange, exclu
│  │ CROISSANT AOP        │ 16  │   2  │  --   │   3   │   2   │  │
│                                                                  │
│  ⚠️ 1 produit avec CDT non communiqué (NC) - non commandable    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Dates de Livraison - V3.0.1

Chaque livraison peut maintenant avoir deux dates configurables :

| Champ | Description | Exemple |
|-------|-------------|---------|
| **Date de commande** | Jour où passer la commande | dim. 11 janv. |
| **Date de réception** | Jour où recevoir les cartons | mar. 13 janv. |

```
┌─────────────────────────────────────────────────────────────────┐
│  📅 CONFIGURATION DES LIVRAISONS                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  │ Livraison │ Date Commande  │ Date Réception │ Suppr │        │
│  │───────────│────────────────│────────────────│───────│        │
│  │ Liv 1     │ [dim. 11 janv] │ [mar. 13 janv] │   ×   │        │
│  │ Liv 2     │ [mar. 13 janv] │ [jeu. 15 janv] │   ×   │        │
│  │ Liv 3     │ [jeu. 15 janv] │ [sam. 17 janv] │   ×   │        │
│                                                                  │
│                              [+ Ajouter une livraison]           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Livraison Forte - V3.0.1

Permet de regrouper les plus petites quantités commandées sur une seule livraison pour réduire le nombre de réceptions à gérer.

**Logique de calcul** :

```javascript
// Avec N livraisons, les 1/N références avec les plus petites quantités
// sont regroupées sur la livraison forte sélectionnée

// Exemple avec 3 livraisons :
// - 141 références commandées
// - 1/3 = 47 références avec les plus petites quantités
// - Ces 47 références vont entièrement sur la livraison forte
// - Les 94 autres sont réparties normalement
```

**Interface** :

```
┌─────────────────────────────────────────────────────────────────┐
│  🚛 OPTIMISATION DES LIVRAISONS                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Regroupez les petites commandes sur une livraison pour         │
│  réduire les réceptions.                                        │
│                                                                  │
│  Livraison forte : [▼ Livraison 1 (mar.)]                       │
│                                                                  │
│  Références commandées : 141                                     │
│  Références regroupées : 47 / 47 (les plus petites qtés)        │
│  Cartons regroupés : 89                                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Impression Fiche de Commande - V3.0.1

Un modal d'impression dédié permet d'imprimer la fiche de commande au format A4 paysage.

**Caractéristiques** :
- Format A4 paysage optimisé
- **Exclut les lignes NC** (produits sans CDT)
- En-tête avec magasin, semaine, dates des livraisons
- Tableau groupé par famille avec totaux
- Zone de signature responsable
- Totaux recalculés sans les produits NC

**Fichier** : `FicheCommandeImpression.jsx`

```
┌─────────────────────────────────────────────────────────────────┐
│                    FICHE DE COMMANDE BVP                         │
├─────────────────────────────────────────────────────────────────┤
│  Magasin : 07499 - SAS CYMADIS       Semaine : S3 / 2026        │
│  Livraisons : Liv.1 Cmd dim 11 → mar 13 | Liv.2 Cmd mar 13 → jeu│
│                                          Imprimé le : 14/01/2026│
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  │ Produit              │ CDT│Mini│Stock│À CMD│Liv1│Liv2│Liv3│  │
│  │──────────────────────│────│────│─────│─────│────│────│────│  │
│  │ BOULANGERIE (45)     │  - │  - │  -  │ 239 │ 86 │ 97 │ 56 │  │
│  │ Pain aux céréales    │ 26 │  2 │ --  │   4 │  2 │  1 │  1 │  │
│  │ Pain boule bio       │ 10 │  2 │ --  │   4 │  2 │  1 │  1 │  │
│  │ ...                  │... │... │ ... │ ... │... │... │... │  │
│  │──────────────────────│────│────│─────│─────│────│────│────│  │
│  │ TOTAUX (141 réf.)    │    │    │     │ 892 │320 │312 │260 │  │
│  │──────────────────────│────│────│─────│─────│────│────│────│  │
│                                                                  │
│  Total : 141 références | 892 cartons                           │
│                                                                  │
│                                      ________________________    │
│                                      Signature Responsable       │
└─────────────────────────────────────────────────────────────────┘
```

#### Calcul du Stock Projeté (NOUVEAU V3)

```
Stock Projeté = Stock Physique (inventaire)
              + Livraisons à venir (S en cours)
              - Consommation restante (S en cours)

Exemple :
- Inventaire lundi matin : 50 cartons
- Livraison prévue mercredi : +30 cartons
- Consommation lundi-mardi (prévue) : -20 cartons
- Stock Projeté mercredi matin : 50 + 30 - 20 = 60 cartons
```

**Interface utilisateur** :

```
┌─────────────────────────────────────────────────────────────────┐
│  📦 COMMANDE - Semaine 03                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📅 Inventaire du : 13/01/2026 (lundi matin)                    │
│  📊 Stock calculé pour : Livraison mercredi 15/01               │
│                                                                  │
│  │ Produit              │ Stock  │ Livr.  │ Conso  │ Stock  │   │
│  │                      │ Phys.  │ à venir│ prévue │ Projeté│   │
│  │──────────────────────│────────│────────│────────│────────│   │
│  │ BAGUETTE BLANCHE CRU │  50    │  +30   │  -20   │  60    │   │
│  │ CROISSANT AOP PAC    │  15    │   0    │  -8    │   7    │   │
│  │──────────────────────│────────│────────│────────│────────│   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.4 Module INVENTAIRE STOCK (Équipier) - Amélioré V3

| Fonctionnalité | Description | Nouveauté V3 |
|----------------|-------------|--------------|
| Date d'inventaire | Date précise de comptage | ✅ NOUVEAU |
| Sauvegarde auto | Dans dossier partagé | ✅ NOUVEAU |
| Historique | Conservation des inventaires passés | ✅ NOUVEAU |
| Message stock manquant | Alerte si pas d'inventaire récent | ✅ NOUVEAU |

**Message si inventaire absent** :

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ INVENTAIRE NON RENSEIGNÉ                                    │
│                                                                  │
│  Aucun inventaire n'a été saisi pour cette semaine.             │
│  Les calculs de commande ne tiennent pas compte des stocks.     │
│                                                                  │
│  [Saisir l'inventaire maintenant]                               │
└─────────────────────────────────────────────────────────────────┘
```

**Message si inventaire ancien** :

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ INVENTAIRE ANCIEN                                           │
│                                                                  │
│  Dernier inventaire : 06/01/2026 (7 jours)                      │
│  Les stocks affichés peuvent ne plus être à jour.               │
│                                                                  │
│  [Mettre à jour l'inventaire]    [Continuer quand même]         │
└─────────────────────────────────────────────────────────────────┘
```

### 5.5 Module CASSE (Équipier) - Inchangé

| Fonctionnalité | Description | Priorité |
|----------------|-------------|----------|
| Saisie invendus | Par produit, quantité | Critique |
| Premier écran matin | Affiché en priorité à l'ouverture | Critique |
| Historique casse | Conservation pour stats | Important |

---

## 6. MODULE ANALYSE PRÉVISIONS VS RÉEL (NOUVEAU V3)

### 6.1 Objectif

Permettre au Responsable de **comparer** ce qui a été prévu avec ce qui a été réellement vendu, pour **améliorer** les prévisions semaine après semaine.

### 6.2 Sources de Données

| Donnée | Source | Moment |
|--------|--------|--------|
| **Quantités prévues** | Planning généré | Début de semaine |
| **Quantités vendues** | Import fichier ventes | Fin de semaine |
| **Casse** | Saisie équipier | Quotidien |

### 6.3 Interface Analyse

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 ANALYSE SEMAINE 01/2026                                     │
│  Du 30/12/2025 au 05/01/2026                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🎯 SCORE DE PRÉCISION GLOBAL : 87%                             │
│  ████████████████████░░░░                                       │
│                                                                  │
│  📈 RÉSUMÉ                                                       │
│  ─────────────────────────────────────────────────────────────  │
│  • Produits au-dessus des prévisions : 12 (↗️ sous-estimés)    │
│  • Produits dans la cible (±10%) : 45 (✅ bien estimés)         │
│  • Produits en-dessous des prévisions : 8 (↘️ sur-estimés)     │
│  • Casse totale : 127 unités (2.3% de la production)           │
│                                                                  │
│  📋 DÉTAIL PAR PRODUIT                                          │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  │ Produit              │ Prévu │ Vendu │ Écart │ Casse │ Sugg │
│  │──────────────────────│───────│───────│───────│───────│──────│
│  │ Baguette Tradition   │  450  │  485  │ +7.8% │  12   │  ↗️  │
│  │ Croissant            │  180  │  195  │ +8.3% │   3   │  ↗️  │
│  │ Pain Chocolat        │  120  │  118  │ -1.7% │   5   │  ✅  │
│  │ Pain Complet         │   80  │   65  │ -18%  │  15   │  ↘️  │
│  │──────────────────────│───────│───────│───────│───────│──────│
│                                                                  │
│  💡 SUGGESTIONS AUTOMATIQUES                                     │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ ↗️ Baguette Tradition : Augmenter potentiel de +10%     │    │
│  │    Raison : Ventes > Prévu depuis 3 semaines            │    │
│  │                                     [Appliquer] [Ignorer]│    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ ↘️ Pain Complet : Réduire potentiel de -15%             │    │
│  │    Raison : Casse élevée (18% de la production)         │    │
│  │                                     [Appliquer] [Ignorer]│    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  [Appliquer toutes les suggestions]   [Passer à la semaine S02] │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.4 Calcul des Suggestions

```javascript
// Règles de suggestion automatique

// 1. Produit sous-estimé (ventes > prévu)
if (ecartPourcent > 10 && cassesPourcent < 5) {
  suggestion = {
    type: "augmenter",
    pourcentage: Math.min(ecartPourcent, 20), // Max +20%
    raison: "Ventes supérieures aux prévisions"
  };
}

// 2. Produit sur-estimé (casse élevée)
if (cassePourcent > 10) {
  suggestion = {
    type: "diminuer",
    pourcentage: Math.min(cassePourcent, 15), // Max -15%
    raison: "Casse élevée"
  };
}

// 3. Produit bien calibré
if (Math.abs(ecartPourcent) <= 10 && cassePourcent < 5) {
  suggestion = {
    type: "stable",
    pourcentage: 0,
    raison: "Bien estimé"
  };
}
```

### 6.5 Historique et Tendances

Le module analyse les données sur plusieurs semaines pour détecter les tendances :

```
┌─────────────────────────────────────────────────────────────────┐
│  📈 TENDANCE - Baguette Tradition                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Évolution sur 4 semaines :                                     │
│                                                                  │
│       Prévu    Vendu    Écart                                   │
│  S49   420      435     +3.6%                                   │
│  S50   430      455     +5.8%                                   │
│  S51   440      470     +6.8%                                   │
│  S01   450      485     +7.8%                                   │
│                                                                  │
│  Tendance : ↗️ Hausse constante (+4% par semaine en moyenne)   │
│                                                                  │
│  💡 Recommandation : Ajuster le potentiel de base à 500 unités │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. MODÈLE DE DONNÉES

### 7.1 Structure config.json (NOUVEAU V3)

```javascript
{
  "schemaVersion": "3.0",
  "type": "config",

  "magasin": {
    "nom": "SAS CHAMAFFI",
    "code": "10679"
  },

  "cheminDossierPartage": "/Volumes/NAS/BVP-Data/10679",

  "joursOuverture": {
    "lundi": { "matin": true, "apresmidi": true },
    "mardi": { "matin": true, "apresmidi": true },
    "mercredi": { "matin": true, "apresmidi": true },
    "jeudi": { "matin": true, "apresmidi": true },
    "vendredi": { "matin": true, "apresmidi": true },
    "samedi": { "matin": true, "apresmidi": true },
    "dimanche": { "matin": true, "apresmidi": false }
  },

  "parametresCommande": {
    "stockSecurite": 0.10,
    "delaiLivraison": 2
  },

  "pilotageCA": {
    "objectifProgression": 0.05,
    "afficherCAEquipes": false
  },

  "derniereModification": "2026-01-13T14:30:00Z",
  "modifiePar": "responsable"
}
```

### 7.2 Structure inventaires.json (NOUVEAU V3)

```javascript
{
  "schemaVersion": "3.0",
  "type": "inventaires",
  "semaine": "2026-S02",

  "inventaires": [
    {
      "id": "inv-2026-01-13-0830",
      "dateInventaire": "2026-01-13",         // Date du comptage
      "heureCreation": "2026-01-13T08:30:00Z",
      "creePar": "equipier",

      "produits": [
        {
          "itm8": "47416020",
          "stockCartons": 50,
          "cdt": 6,
          "stockUnites": 300                   // Calculé : 50 × 6
        },
        {
          "itm8": "47852014",
          "stockCartons": 15,
          "cdt": 16,
          "stockUnites": 240
        }
      ],

      "statistiques": {
        "nbProduitsRenseignes": 72,
        "nbProduitsTotal": 185,
        "tauxCompletion": 0.39
      }
    }
  ],

  "derniereMAJ": "2026-01-13T08:30:00Z"
}
```

### 7.3 Structure analyse.json (NOUVEAU V3)

```javascript
{
  "schemaVersion": "3.0",
  "type": "analyse",
  "semaine": "2026-S01",

  "dateGeneration": "2026-01-13T10:00:00Z",

  "scorePrecisionGlobal": 87,

  "resume": {
    "produitsAuDessus": 12,       // Ventes > Prévu
    "produitsDansCible": 45,     // Écart ≤ 10%
    "produitsEnDessous": 8,       // Ventes < Prévu
    "casseTotale": 127,
    "cassePourcent": 2.3
  },

  "parProduit": [
    {
      "itm8": "47416020",
      "libelle": "Baguette Tradition",
      "prevu": 450,
      "vendu": 485,
      "casse": 12,
      "ecart": 35,
      "ecartPourcent": 7.8,
      "cassePourcent": 2.7,
      "suggestion": {
        "type": "augmenter",
        "pourcentage": 10,
        "raison": "Ventes supérieures aux prévisions",
        "appliquee": false
      }
    }
  ],

  "tendances": {
    "semaines": ["S49", "S50", "S51", "S01"],
    "parProduit": [
      {
        "itm8": "47416020",
        "evolution": [3.6, 5.8, 6.8, 7.8],
        "tendance": "hausse",
        "moyenneEcart": 6.0
      }
    ]
  }
}
```

### 7.4 Modèle Produit (inchangé V2)

```javascript
{
  id: number,
  libelle: string,
  libellePersonnalise: string,
  itm8: number | null,
  plu: string | null,
  ean: string | null,

  rayon: string,                    // BOULANGERIE | VIENNOISERIE | etc.
  programme: string,

  potentielHebdo: number,
  modeCalcul: string,               // 'S' | 'F' | 'f' | 'moyenne'

  nombreSemaines: number,
  moyenneHebdo: number,
  moyenneVentesMax: number,
  tendance: string,                 // "hausse" | "stable" | "baisse"
  tendancePourcent: number,
  variabilite: number,
  fiabilite: number,

  unitesParPlaque: number,
  tempsPlaquage: string,            // "court" | "long"

  prixMoyenUnitaire: number,
  caHebdoActuel: number,
  caHebdoObjectif: number,
  gainPotentiel: number,

  actif: boolean
}
```

---

## 8. RÈGLES MÉTIER

### 8.1 Calcul du Potentiel Hebdomadaire (inchangé V2)

Les 4 modes de calcul restent identiques :
- **Mode S** : Sans limite de plafond
- **Mode F** : +20% max
- **Mode f** : +10% max
- **Mode Moyenne** : Moyenne multi-semaines

### 8.2 Calcul du Stock Projeté (NOUVEAU V3)

```javascript
/**
 * Calcule le stock projeté à une date donnée
 * @param {Date} dateInventaire - Date de l'inventaire physique
 * @param {number} stockPhysique - Stock compté en cartons
 * @param {Date} dateCible - Date pour laquelle calculer le stock
 * @param {Array} livraisons - Livraisons planifiées
 * @param {Array} planning - Planning de consommation prévu
 */
function calculerStockProjete(dateInventaire, stockPhysique, dateCible, livraisons, planning) {
  let stockProjete = stockPhysique;

  // Ajouter les livraisons entre inventaire et date cible
  livraisons.forEach(liv => {
    if (liv.date > dateInventaire && liv.date <= dateCible) {
      stockProjete += liv.quantiteCartons;
    }
  });

  // Soustraire la consommation prévue entre inventaire et date cible
  planning.forEach(jour => {
    if (jour.date > dateInventaire && jour.date <= dateCible) {
      stockProjete -= Math.ceil(jour.quantiteUnites / cdt);
    }
  });

  return Math.max(0, stockProjete);
}
```

### 8.3 Règles de Synchronisation (NOUVEAU V3)

| Fichier | Écrit par | Lu par | Fréquence |
|---------|-----------|--------|-----------|
| config.json | Responsable | Tous | Hebdo |
| referentiel.json | Responsable | Tous | Mensuel |
| planning.json | Responsable | Équipier | Hebdo |
| inventaires.json | Équipier | Responsable | Quotidien |
| casse.json | Équipier | Responsable | Quotidien |
| production.json | Équipier | Responsable | Quotidien |
| commandes.json | Responsable | Équipier | 2x/semaine |
| analyse.json | Système | Responsable | Hebdo |

### 8.4 Règles d'Archivage (NOUVEAU V3)

```javascript
// Archivage automatique en fin de semaine
if (jourSemaine === 'dimanche' && heure >= 20) {
  // 1. Marquer la semaine comme archivée
  meta.statut = 'archive';
  meta.dateArchivage = new Date().toISOString();

  // 2. Créer le dossier de la semaine suivante
  creerDossierSemaine(semaineSuivante);

  // 3. Copier les données de référence
  copierReferentiel(semaineSuivante);
}

// Conservation des archives
// - 52 dernières semaines : données complètes
// - Au-delà : données agrégées uniquement (résumé)
```

---

## 9. INTERFACE UTILISATEUR

### 9.1 Sélection du Profil (inchangé + indicateur connexion)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                      BVP PLANNING                          │  │
│  │                      Version 3.0                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  📁 Dossier partagé : ✅ Connecté                               │
│      /Volumes/NAS/BVP-Data/10679                                │
│                                                                  │
│  ┌──────────────────────┐     ┌──────────────────────┐         │
│  │                      │     │                      │         │
│  │    👔 RESPONSABLE    │     │    👷 ÉQUIPIER      │         │
│  │                      │     │                      │         │
│  │    Configuration     │     │    Production        │         │
│  │    Pilotage CA       │     │    Planning jour     │         │
│  │    Analyse           │     │    Casse & Stock     │         │
│  │                      │     │                      │         │
│  └──────────────────────┘     └──────────────────────┘         │
│                                                                  │
│                   [⚙️ Configurer le dossier]                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 Indicateur de Synchronisation

```
┌─────────────────────────────────────────────────────────────────┐
│  🔄 Dernière synchronisation : il y a 2 minutes                 │
│  📊 Inventaire du 13/01/2026 disponible                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. ARCHITECTURE TECHNIQUE

### 10.1 Stack Technologique (inchangé)

- **Frontend** : React + Vite
- **Styling** : Tailwind CSS
- **État** : React Context + useState
- **Stockage** : FileSystem API / dossier partagé (V3)
- **Export** : SheetJS (xlsx), jsPDF

### 10.2 Accès au Système de Fichiers (NOUVEAU V3)

```javascript
// Service d'accès au dossier partagé
class StorageService {
  constructor(basePath) {
    this.basePath = basePath;
  }

  // Vérifier l'accès au dossier
  async checkAccess() {
    try {
      await fs.access(this.basePath);
      return { connected: true };
    } catch {
      return { connected: false, error: 'Dossier inaccessible' };
    }
  }

  // Lire un fichier JSON
  async readJSON(relativePath) {
    const fullPath = path.join(this.basePath, relativePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    return JSON.parse(content);
  }

  // Écrire un fichier JSON
  async writeJSON(relativePath, data) {
    const fullPath = path.join(this.basePath, relativePath);
    const content = JSON.stringify(data, null, 2);
    await fs.writeFile(fullPath, content);
  }

  // Lister les semaines archivées
  async listSemaines() {
    const semainesPath = path.join(this.basePath, 'semaines');
    const entries = await fs.readdir(semainesPath);
    return entries.filter(e => e.match(/^\d{4}-S\d{2}$/));
  }
}
```

### 10.3 Migration V2 → V3

Pour les utilisateurs existants de la V2 :

```
┌─────────────────────────────────────────────────────────────────┐
│  🔄 MIGRATION VERS LA V3                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Des fichiers .bvp.json ont été détectés.                       │
│  Souhaitez-vous les importer dans le nouveau système ?          │
│                                                                  │
│  Fichiers trouvés :                                             │
│  • MonMagasin-S52-2025.bvp.json                                 │
│  • MonMagasin-S01-2026.bvp.json                                 │
│                                                                  │
│  [Importer et convertir]       [Ignorer et commencer à zéro]    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 11. ÉVOLUTIONS FUTURES

### 11.1 Module Mise à Jour des Données Magasins

**Contexte** : La classification des magasins (M1 à M7) a été établie il y a environ 3 ans. Certains magasins ont évolué (croissance CA, saisonnalité) et leur modèle actuel ne correspond plus à la réalité.

**Problématique** :
- La classification M1-M7 est basée sur le CA annuel BVP
- Extrapoler le CA hebdomadaire × 52 n'est pas fiable (saisonnalité)
- Les magasins saisonniers (bord de mer, montagne) ont des pics d'activité
- Un fichier avec le CA glissant 12 mois est plus représentatif

**Grille des modèles BVP** :

| Modèle | CA annuel BVP | Caractéristiques |
|--------|---------------|------------------|
| M1 | < 80 K€ | Très petit rayon |
| M2 | 80 - 130 K€ | Petit rayon |
| M3 | 130 - 220 K€ | Rayon moyen |
| M4 | 220 - 320 K€ | Rayon développé |
| M5 | 320 - 420 K€ | Grand rayon |
| M6 | 420 - 550 K€ | Très grand rayon |
| M7 | > 550 K€ | Rayon exceptionnel |

**Solution proposée** :

```
┌─────────────────────────────────────────────────────────────────┐
│  🔄 MISE À JOUR DES DONNÉES MAGASINS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📅 Dernière mise à jour : 15/01/2023 (il y a 3 ans)           │
│                                                                  │
│  📁 Charger le fichier CA annuel glissant                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 📄 Glisser-déposer le fichier Excel                     │    │
│  │    ou cliquer pour sélectionner                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Format attendu :                                                │
│  • Colonnes : Code magasin | Nom | CA BVP 12 mois glissant     │
│  • Période : CA cumulé des 12 derniers mois                     │
│                                                                  │
│  💡 Ce fichier peut être exporté depuis le SI central           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Fonctionnalités** :

| Fonction | Description | Priorité |
|----------|-------------|----------|
| Import fichier CA annuel | Excel avec CA 12 mois glissant par magasin | Haute |
| Calcul automatique modèle | Détermination M1-M7 selon seuils CA | Haute |
| Détection changements | Alerte si modèle a changé vs précédent | Moyenne |
| Historique mises à jour | Date et contenu de chaque import | Moyenne |
| Export rapport | PDF des changements de classification | Basse |

**Écran après import** :

```
┌─────────────────────────────────────────────────────────────────┐
│  ✅ MISE À JOUR EFFECTUÉE                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📊 Résumé de la mise à jour du 27/01/2026                      │
│                                                                  │
│  • Magasins traités : 2 387                                     │
│  • Classifications inchangées : 2 156 (90%)                     │
│  • Montées en gamme : 142 (6%)                                  │
│  • Descentes en gamme : 89 (4%)                                 │
│                                                                  │
│  ⚠️ Changements détectés pour votre magasin :                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 📍 SAS CHAMAFFI (10679)                                 │    │
│  │                                                          │    │
│  │    Ancien modèle : M4 (CA référence : 280 K€)           │    │
│  │    CA 12 mois glissant : 462 K€                          │    │
│  │    Nouveau modèle : M6 (420-550 K€)                      │    │
│  │                                                          │    │
│  │    💡 Impact : Les objectifs benchmark seront ajustés    │    │
│  │       pour refléter les performances M6 du secteur       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│                [Voir tous les changements]  [Fermer]            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Fréquence recommandée** : Mensuelle (1er du mois)

**Structure fichier info_PDV.json mise à jour** :

```javascript
{
  "magasins": [
    {
      "code": "10679",
      "nom": "SAS CHAMAFFI",
      "modele": "M6",                    // Mis à jour automatiquement
      "caAnnuelGlissant": 462000,        // CA 12 mois glissant
      "dateMiseAJour": "2026-01-27",     // Date du dernier import
      "historiqueModele": [
        { "date": "2023-01-15", "modele": "M4", "ca": 280000 },
        { "date": "2026-01-27", "modele": "M6", "ca": 462000 }
      ]
    }
  ],
  "metadonnees": {
    "dernierImport": "2026-01-27T10:30:00Z",
    "sourcesFichier": "export_CA_annuel_glissant_202601.xlsx",
    "nbMagasins": 2387
  }
}
```

**Statut** : Évolution future (non planifiée)

---

## ANNEXES

### Annexe A : Comparaison V2 vs V3

| Aspect | V2 | V3 |
|--------|----|----|
| **Stockage** | Fichiers .bvp.json isolés | Dossier partagé structuré |
| **Synchronisation** | Manuelle (USB/email) | Automatique |
| **Historique** | Archives manuelles | Archivage automatique par semaine |
| **Analyse** | Comparaison manuelle | Module Prévu vs Réel automatisé |
| **Stock** | Snapshot instantané | Stock projeté avec date |
| **Multi-postes** | Import/export nécessaire | Accès simultané |
| **Code existant** | - | 100% compatible |

### Annexe B : Checklist Migration

- [ ] Identifier l'emplacement du dossier partagé
- [ ] Créer la structure de dossiers
- [ ] Importer les fichiers .bvp.json existants
- [ ] Configurer l'accès sur tous les postes
- [ ] Tester la synchronisation
- [ ] Former les équipes aux nouveaux flux

---

**Document rédigé le 13 janvier 2026**
**Auteur : Assistant IA**
**Statut : En cours de validation**
