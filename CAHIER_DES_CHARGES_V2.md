# CAHIER DES CHARGES V2.4 - APPLICATION BVP PLANNING

**Version** : 2.4
**Date** : 17 décembre 2025
**Statut** : Validé

**Changelog V2.4 :**
- Ajout Section 5.0 : Versioning des Fichiers (schemaVersion, métadonnées, migration)
- Ajout Section 8.6 : Gestion des Erreurs par module avec messages utilisateur
- Enrichissement Section 6.3 : Élasticité avec note, limites du modèle et plafond
- Ajout Annexe A : Exigences Non-Fonctionnelles (NFR) - performances, navigateurs, limites, RGPD
- Ajout Annexe B : Critères d'Acceptation par module
- Ajout Annexe C : Glossaire (20 termes métier)

**Changelog V2.3 :**
- Fusion des éléments techniques de la V1
- Ajout Section 1.5 : Périmètre Technique (Inclus/Exclu)
- Ajout Section 6.1 : 4 modes de calcul du potentiel avec exemples détaillés
- Ajout Section 6.1 : Pondération multi-semaines (S-1/AS-1/S-2 avec coefficients)
- Ajout Section 6.1 : Indicateurs de fiabilité par produit (scoreConfiance, tendance, variabilité)
- Enrichissement Section 5.1 : Modèle Produit avec statistiques multi-semaines
- Enrichissement Section 5.2 : Modèle FrequentationData avec poidsTranchesParJour et ponderations

---

## TABLE DES MATIÈRES

1. [Vision et Philosophie](#1-vision-et-philosophie)
2. [Utilisateurs et Profils](#2-utilisateurs-et-profils)
3. [Parcours Utilisateur Détaillés](#3-parcours-utilisateur-détaillés)
4. [Fonctionnalités par Module](#4-fonctionnalités-par-module)
5. [Modèle de Données](#5-modèle-de-données)
6. [Règles Métier](#6-règles-métier)
7. [Interface Utilisateur](#7-interface-utilisateur)
8. [Architecture Technique](#8-architecture-technique)
9. [Évolutions Futures](#9-évolutions-futures)

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

### 1.3 Ce que l'Application Permet

- ✅ **Rythmer la production** tout au long de la journée
- ✅ **Anticiper le plaquage** pour le lendemain
- ✅ **Suivre la casse** pour affiner les prévisions
- ✅ **Aider à la commande** 2x par semaine
- ✅ **Piloter le CA** avec objectifs de progression
- ✅ **Imprimer ou afficher** le planning (papier / tablette)

### 1.4 Ce que l'Application N'est PAS

- ❌ Un système de gestion de stock en temps réel
- ❌ Une connexion au système de caisse
- ❌ Un outil de comptabilité ou de marges
- ❌ Une application nécessitant internet en permanence

### 1.5 Périmètre Technique

#### ✅ Inclus
- Import données ventes et fréquentation (Excel/CSV)
- Reconnaissance automatique produits (ITM8)
- Calcul potentiels hebdomadaires (4 modes)
- Génération planning hebdomadaire avec répartition horaire
- Personnalisation complète (rayons, programmes, potentiels)
- Export planning (PDF, impression)
- Fichier Magasin portable (.bvp.json)
- Modules Équipe : Casse, Planning Jour, Plaquage, Commande

#### ❌ Exclu
- Gestion des stocks en temps réel
- Synchronisation multi-utilisateurs temps réel
- Base de données persistante côté serveur
- Authentification/autorisation (login)
- Application mobile native
- Suivi des coûts/marges détaillé
- Connexion système de caisse

---

## 2. UTILISATEURS ET PROFILS

### 2.1 Profil RESPONSABLE

| Attribut | Description |
|----------|-------------|
| **Qui ?** | Propriétaire, Directeur, Chef de rayon |
| **Fréquence** | 1x par semaine ou lors de changements |
| **Compétences** | Sait utiliser Excel (basique) |
| **Objectif** | Configurer l'outil, importer les données sensibles, piloter le CA |

### 2.2 Profil EMPLOYÉ

| Attribut | Description |
|----------|-------------|
| **Qui ?** | Équipier BVP, Boulanger, Vendeur |
| **Fréquence** | Quotidien |
| **Compétences** | Aucune requise |
| **Objectif** | Suivre le planning, produire, noter la casse |

### 2.3 Répartition des Droits

#### 🔴 RESPONSABLE uniquement

| Action | Description |
|--------|-------------|
| Import des données | Fréquentation + Ventes |
| Sélectionner les produits à monitorer | Activer/Désactiver un produit |
| Définir les jours d'ouverture | Lundi fermé, etc. |
| Définir % progression CA | Objectif de croissance |
| Générer le Fichier Magasin | Export de la config |
| Configurer jours commande/livraison | Planning commandes |
| Afficher CA aux équipes | Oui/Non |

#### 🟢 RESPONSABLE + EMPLOYÉ (les deux)

| Action | Description |
|--------|-------------|
| Modifier la dénomination | Renommer un produit |
| Modifier le rayon | Boulangerie, Viennoiserie, etc. |
| Modifier le programme de cuisson | Four principal, Cuisson baguette, etc. |
| Modifier le PLU | Code article |
| Modifier le nombre par plaque | Unités/plaque |
| Valider production (Plaqué) | Préparé sur plaque |
| Valider production (Cuit) | Sorti du four |

#### 🔵 EMPLOYÉ uniquement

| Action | Description |
|--------|-------------|
| Saisir la casse | Invendus de la veille |
| Saisir le stock | Pour aide commande |
| Consulter le planning | Jour + Plaquage demain |

### 2.4 Tableau Récapitulatif Complet des Droits

| Fonctionnalité | Responsable | Employé |
|----------------|:-----------:|:-------:|
| **IMPORT** | | |
| Import fréquentation | ✅ | ❌ |
| Import ventes | ✅ | ❌ |
| Charger Fichier Magasin | ✅ | ✅ |
| **CONFIGURATION** | | |
| Sélectionner produits actifs | ✅ | ❌ |
| Définir jours ouverture | ✅ | ❌ |
| Définir % progression CA | ✅ | ❌ |
| Jours commande/livraison | ✅ | ❌ |
| Afficher CA équipes | ✅ | ❌ |
| **PRODUITS** | | |
| Modifier dénomination | ✅ | ✅ |
| Modifier rayon | ✅ | ✅ |
| Modifier programme cuisson | ✅ | ✅ |
| Modifier PLU | ✅ | ✅ |
| Modifier unités/plaque | ✅ | ✅ |
| **PRODUCTION** | | |
| Valider "Plaqué" | ✅ | ✅ |
| Valider "Cuit" | ✅ | ✅ |
| **QUOTIDIEN** | | |
| Consulter planning jour | ✅ | ✅ |
| Consulter plaquage demain | ✅ | ✅ |
| Saisir casse | ✅ | ✅ |
| Saisir stock (commande) | ✅ | ✅ |
| **PILOTAGE CA** | | |
| Voir tableau de bord CA | ✅ | ❌ |
| Voir CA sur planning jour | ✅ | ☐ (si activé) |
| **EXPORT** | | |
| Générer Fichier Magasin | ✅ | ❌ |
| Imprimer planning | ✅ | ✅ |
| Imprimer commande | ✅ | ✅ |

### 2.5 Modes d'Utilisation

| Mode | Support | Usage |
|------|---------|-------|
| **Papier** | Feuille imprimée | Planning du jour affiché en cuisine |
| **Tablette** | Application web | Suivi interactif, saisie casse/stock |
| **Desktop** | PC du bureau | Configuration, import, personnalisation |

---

## 3. PARCOURS UTILISATEUR DÉTAILLÉS

### 3.1 Parcours RESPONSABLE - Wizard 8 Étapes

Le Wizard Responsable guide le responsable à travers 8 étapes pour configurer la semaine.

**Vue d'ensemble des 8 étapes :**

| Étape | Nom | Description | Durée |
|-------|-----|-------------|-------|
| 1 | Import | Charger fichiers fréquentation et ventes | 2 min |
| 2 | Analyse Semaine Passée | Comparer Prévu vs Réalisé (si archive) | 1 min |
| 3 | Horaires | Configurer jours/demi-journées d'ouverture | 1 min |
| 4 | Pilotage CA | Définir objectifs et limites progression | 2 min |
| 5 | Animation Commerciale | Gérer promotions et produits exceptionnels | 2 min |
| 6 | Commande | Calculer besoins et aide à la commande | 2 min |
| 7 | Planning Détaillé | Prévisualiser et ajuster le planning | 1 min |
| 8 | Export & Archivage | Générer fichier équipe et archiver | 1 min |

```
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 1 : IMPORT DES DONNÉES                                   │
│  Fréquence : 1x par semaine ou lors de changements             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📁 Fichier Fréquentation                                       │
│  ─────────────────────────────────────────────────────────────  │
│  • Source : Export du système de caisse                         │
│  • Contenu : Passages clients heure par heure                   │
│  • Période : 3 semaines (S-1, S-2, AS-1)                       │
│  • Format : Excel (.xlsx) ou CSV                                │
│                                                                 │
│  📁 Fichier Ventes                                              │
│  ─────────────────────────────────────────────────────────────  │
│  • Source : Export du système de caisse                         │
│  • Contenu : Ventes par produit, par jour + Valeur prix vente  │
│  • Période : 1 à N semaines (plus = plus fiable, pas de limite)│
│  • Format : Excel (.xlsx) ou CSV                                │
│                                                                 │
│  📁 Fichier Archive (optionnel)                                 │
│  ─────────────────────────────────────────────────────────────  │
│  • Source : Export de la semaine précédente (.bvp-archive.json)│
│  • Contenu : Prévu vs Réalisé de la semaine passée             │
│  • Usage : Comparaison et analyse des écarts                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 2 : ANALYSE SEMAINE PASSÉE (NOUVEAU)                     │
│  Durée : 1 minute - Affiché uniquement si archive disponible   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📊 COMPARAISON PRÉVU vs RÉALISÉ                                │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Semaine S-1 : 12-18 décembre 2025                         │ │
│  │                                                            │ │
│  │  Produit           Prévu    Réalisé   Écart    Casse     │ │
│  │  ──────────────────────────────────────────────────────── │ │
│  │  Baguette Trad.    450      425       -5.6%    12        │ │
│  │  Croissant         180      195       +8.3%    3         │ │
│  │  Pain Chocolat     120      118       -1.7%    5         │ │
│  │                                                            │ │
│  │  📈 Score Global : 94% de précision                       │ │
│  │  🗑️ Casse Totale : 38€ (2.1% du CA)                      │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  💡 Suggestions automatiques :                                  │
│  • Croissant : Réalisé > Prévu → Augmenter potentiel +10%     │
│  • Baguette : Casse élevée → Réduire potentiel -5%            │
│                                                                 │
│  [Appliquer suggestions] [Ignorer]                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 3 : CONFIGURATION HORAIRES                               │
│  Durée : 1 minute                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📅 Semaine : [S51] Année : [2025]                             │
│  📍 Magasin : [Mon Magasin___________] Code : [_____]          │
│                                                                 │
│  Jours d'ouverture (par demi-journée) :                        │
│                                                                 │
│  │ Jour      │ Matin (6h-14h) │ Après-midi (14h-20h) │        │
│  │───────────│────────────────│──────────────────────│        │
│  │ Lundi     │      ☐         │         ☐            │ Fermé  │
│  │ Mardi     │      ☑️        │         ☑️           │        │
│  │ Mercredi  │      ☑️        │         ☑️           │        │
│  │ Jeudi     │      ☑️        │         ☑️           │        │
│  │ Vendredi  │      ☑️        │         ☑️           │        │
│  │ Samedi    │      ☑️        │         ☑️           │        │
│  │ Dimanche  │      ☑️        │         ☐            │ AM off │
│                                                                 │
│  💡 Mode demi-journée pour gérer :                             │
│  • Dimanche après-midi fermé                                   │
│  • Fermetures exceptionnelles                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 4 : PILOTAGE CA                                          │
│  Durée : 2 minutes                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📊 DONNÉES CALCULÉES AUTOMATIQUEMENT                           │
│  ─────────────────────────────────────────────────────────────  │
│  CA Total Rayon (calculé auto) : 1 850 €/sem                   │
│  CA Produits Monitorés : 506 €/sem (27,4% du rayon)            │
│                                                                 │
│  🎯 CHOIX DE LA BASE DE CALCUL                                  │
│  ─────────────────────────────────────────────────────────────  │
│  ○ PDV (Point de Vente) - Fréquentation globale du magasin    │
│  ● BVP (Rayon BVP) - Fréquentation spécifique au rayon        │
│                                                                 │
│  📈 MATRICE DES LIMITES DE PROGRESSION                          │
│  ─────────────────────────────────────────────────────────────  │
│  Légende : S = Sans limite | F = +20% max | f = +10% max       │
│                                                                 │
│  │ Famille      │ Lun │ Mar │ Mer │ Jeu │ Ven │ Sam │ Dim │   │
│  │──────────────│─────│─────│─────│─────│─────│─────│─────│   │
│  │ BOULANGERIE  │  S  │  S  │  S  │  S  │  F  │  F  │  F  │   │
│  │ VIENNOISERIE │  F  │  F  │  F  │  F  │  f  │  f  │  f  │   │
│  │ PATISSERIE   │  f  │  f  │  f  │  f  │  f  │  f  │  f  │   │
│  │ SNACKING     │  F  │  F  │  F  │  F  │  f  │  f  │  f  │   │
│  │ NEGOCE       │  f  │  f  │  f  │  f  │  f  │  f  │  f  │   │
│                                                                 │
│  📊 RÉPARTITION PAR FAMILLE                                     │
│  ─────────────────────────────────────────────────────────────  │
│  │ Famille      │ Mode répartition                       │     │
│  │──────────────│────────────────────────────────────────│     │
│  │ BOULANGERIE  │ ● Par tranches horaires ○ Journalier  │     │
│  │ VIENNOISERIE │ ● Par tranches horaires ○ Journalier  │     │
│  │ PATISSERIE   │ ○ Par tranches horaires ● Journalier  │     │
│  │ SNACKING     │ ● Par tranches horaires ○ Journalier  │     │
│  │ NEGOCE       │ ○ Par tranches horaires ● Journalier  │     │
│                                                                 │
│  💡 Tranches = répartition avant12h/12h-14h/14h-16h/après16h   │
│  💡 Journalier = une seule quantité pour la journée            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 5 : ANIMATION COMMERCIALE (NOUVEAU)                      │
│  Durée : 2 minutes                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🎯 PRODUITS EN PROMOTION                                       │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  [+ Ajouter une promotion]                                     │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 🏷️ Croissant Beurre                                       │ │
│  │                                                            │ │
│  │ Prix normal : 1.20€   Prix promo : [0.90€]                │ │
│  │                                                            │ │
│  │ Période : [Lun 16/12] → [Dim 22/12]                       │ │
│  │                                                            │ │
│  │ Coefficient d'élasticité calculé : 1.33                   │ │
│  │ (augmentation prévue des ventes : +33%)                   │ │
│  │                                                            │ │
│  │ Volume historique : 180/sem → Volume promo estimé : 240   │ │
│  │                                                            │ │
│  │ [Supprimer]                                               │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  🎁 PRODUITS EXCEPTIONNELS                                      │
│  ─────────────────────────────────────────────────────────────  │
│  (Produits ponctuels non présents dans l'historique)           │
│                                                                 │
│  [+ Ajouter un produit exceptionnel]                           │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 🎄 Bûche de Noël (nouveau)                                │ │
│  │                                                            │ │
│  │ Quantité prévue/jour : [___12___]                         │ │
│  │ Prix unitaire : [15.00€]                                  │ │
│  │ Famille : [PATISSERIE ▼]                                  │ │
│  │ Programme : [Aucun (négoce) ▼]                            │ │
│  │                                                            │ │
│  │ Jours concernés : ☐L ☐M ☐M ☐J ☑️V ☑️S ☑️D                │ │
│  │                                                            │ │
│  │ [Supprimer]                                               │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  📊 IMPACT SUR LE CA                                            │
│  ─────────────────────────────────────────────────────────────  │
│  CA Base : 1 850 €/sem                                         │
│  Impact Promos : +85 € (volume ↑, marge ↓)                     │
│  Impact Exceptionnels : +180 €                                 │
│  CA Prévisionnel : 2 115 €/sem (+14.3%)                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 6 : COMMANDE (NOUVEAU)                                   │
│  Durée : 2 minutes                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📅 CONFIGURATION COMMANDES                                     │
│  ─────────────────────────────────────────────────────────────  │
│  Jours de commande : [ ] Lun [x] Mar [ ] Mer [x] Ven           │
│  Jours de livraison : [ ] Lun [ ] Mar [x] Mer [ ] Sam          │
│  Stock de sécurité : [10] %                                    │
│                                                                 │
│  📦 CALCUL DES BESOINS                                          │
│  ─────────────────────────────────────────────────────────────  │
│  Prochaine livraison : MERCREDI 18/12                          │
│  Période couverte : Mercredi → Vendredi (3 jours)              │
│                                                                 │
│  │ Produit/Matière     │ Besoin │ Stock │ À commander │        │
│  │─────────────────────│────────│───────│─────────────│        │
│  │ Pâte Baguette 10kg  │ 15     │ [__3] │ 12 sacs     │        │
│  │ Levure 500g         │ 8      │ [__2] │ 6 pcs       │        │
│  │ Farine T65 25kg     │ 4      │ [__1] │ 3 sacs      │        │
│  │─────────────────────│────────│───────│─────────────│        │
│                                                                 │
│  💡 Le stock actuel est saisi manuellement                     │
│  💡 Le besoin est calculé depuis le planning de la période     │
│                                                                 │
│  [📄 Imprimer la commande]                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 7 : PLANNING DÉTAILLÉ (NOUVEAU)                          │
│  Durée : 1 minute                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📋 PRÉVISUALISATION DU PLANNING                                │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Vue : [Semaine ▼]  Affichage : [Unités ○ Plaques ●]          │
│                                                                 │
│  │ Jour     │ BOULANGERIE │ VIENNOISERIE │ PATISSERIE │ Total │
│  │──────────│─────────────│──────────────│────────────│───────│
│  │ Mardi    │ 145 Pl.     │ 32 Pl.       │ 18         │ 195   │
│  │ Mercredi │ 138 Pl.     │ 28 Pl.       │ 15         │ 181   │
│  │ Jeudi    │ 142 Pl.     │ 30 Pl.       │ 16         │ 188   │
│  │ Vendredi │ 168 Pl.     │ 42 Pl.       │ 24         │ 234   │
│  │ Samedi   │ 185 Pl.     │ 48 Pl.       │ 28         │ 261   │
│  │ Dimanche │ 142 Pl.     │ 35 Pl.       │ 20         │ 197   │
│  │──────────│─────────────│──────────────│────────────│───────│
│  │ TOTAL    │ 920 Pl.     │ 215 Pl.      │ 121        │ 1256  │
│                                                                 │
│  ⚠️ ALERTES                                                     │
│  ─────────────────────────────────────────────────────────────  │
│  • Samedi VIENNOISERIE : 48 Pl. → Capacité four = 40 Pl.      │
│    [Répartir sur 2 cuissons] [Ignorer]                         │
│                                                                 │
│  📊 COMPARAISON S-1                                             │
│  ─────────────────────────────────────────────────────────────  │
│  Cette semaine : 1256 Pl. vs S-1 : 1180 Pl. (+6.4%)           │
│                                                                 │
│  [👁️ Voir détail par jour] [📄 Imprimer aperçu]               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 8 : ARCHIVAGE & EXPORT (NOUVEAU)                         │
│  Durée : 1 clic                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📤 FICHIER ÉQUIPE (.bvp.json)                                  │
│  ─────────────────────────────────────────────────────────────  │
│  📦 "MonMagasin-S51-2025.bvp.json"                             │
│                                                                 │
│  Contenu :                                                      │
│  • Configuration du magasin (nom, code, semaine)               │
│  • Données de fréquentation par jour et tranche                │
│  • Liste des produits avec potentiels et historique            │
│  • Promotions et produits exceptionnels                        │
│  • Paramètres de répartition par famille                       │
│                                                                 │
│  ✅ Ce fichier est destiné à l'équipe sur tablette/PC          │
│  ✅ Peut être copié sur clé USB, envoyé par email              │
│  ✅ Format JSON (non bloqué par antivirus)                     │
│                                                                 │
│  [💾 Télécharger le fichier équipe]                            │
│                                                                 │
│  📁 FICHIER ARCHIVE (.bvp-archive.json)                         │
│  ─────────────────────────────────────────────────────────────  │
│  📦 "MonMagasin-S50-2025-ARCHIVE.bvp-archive.json"             │
│                                                                 │
│  Contenu :                                                      │
│  • Planning PRÉVU de la semaine S50                            │
│  • Données RÉALISÉ (ventes réelles, casse)                     │
│  • Écarts calculés par produit et par jour                     │
│  • Score de précision global                                   │
│                                                                 │
│  💡 Ce fichier sera utilisé à l'étape 2 la semaine prochaine   │
│  💡 Permet l'analyse "Prévu vs Réalisé"                        │
│                                                                 │
│  [💾 Archiver la semaine S50]                                  │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  ✅ Fichier équipe S51 prêt                                    │
│  ✅ Archive S50 sauvegardée                                    │
│                                                                 │
│  [🏁 Terminer le Wizard]                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Parcours EMPLOYÉ - Journée Type

```
┌─────────────────────────────────────────────────────────────────┐
│  🌅 5h30 - ARRIVÉE                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Allumer le four                                             │
│  2. Lancer cuisson des produits PLAQUÉS LA VEILLE               │
│     (viennoiseries, pains spéciaux en chambre froide)          │
│                                                                 │
│  ⏱️ PENDANT LA CUISSON (15-20 min) :                            │
│  ─────────────────────────────────────────────────────────────  │
│  3. Nettoyer le rayon                                           │
│  4. 📱 SAISIR LA CASSE DE LA VEILLE (tablette ou feuille)      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🗑️ CASSE DE LA VEILLE                                  │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │  Baguette Tradition 250g .......... [3] invendus       │   │
│  │  Croissant ........................ [2] invendus       │   │
│  │  Pain Complet 400g ................ [0] invendus       │   │
│  │                                                         │   │
│  │  [Valider la casse]                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  5. Valider "CUIT" pour les viennoiseries sorties du four      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  🌅 6h00 - PRODUCTION MATIN                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Les viennoiseries plaquées la veille → cuites → rayon         │
│                                                                 │
│  📋 BAGUETTES À PLAQUER MAINTENANT (5-10 min de plaquage)      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🌅 MATIN (6h-12h) - BOULANGERIE                        │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │  Produit                   Qté    Plaqué    Cuit        │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │  Baguette Tradition        45     [ ]       [ ]         │   │
│  │  Baguette Blanche          38     [ ]       [ ]         │   │
│  │  Pain Complet              12     [ ]       [ ]         │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  → Marie plaque → Coche [☑️ Plaqué]                            │
│  → Marie enfourne → Coche [✅ Cuit]                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  🌞 11h30 - PRODUCTION MIDI                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🌞 MIDI (12h-16h) - BOULANGERIE                        │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │  Produit                   Qté    Plaqué    Cuit        │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │  Baguette Tradition        25     [ ]       [ ]         │   │
│  │  Baguette Blanche          20     [ ]       [ ]         │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  🌆 14h00 - PRODUCTION APRÈS-MIDI + ⭐ PLAQUAGE DEMAIN          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📋 PRODUCTION APRÈS-MIDI/SOIR                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🌆 APRÈS-MIDI (16h-20h) - BOULANGERIE                  │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │  Produit                   Qté    Plaqué    Cuit        │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │  Baguette Tradition        15     [ ]       [ ]         │   │
│  │  Pain de Campagne          6      [ ]       [ ]         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ⭐ PLAQUAGE POUR DEMAIN (Mercredi)                             │
│  ─────────────────────────────────────────────────────────────  │
│  L'employé va en chambre froide et prépare les produits longs  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ⏱️ PRODUITS LONGS (30-45 min de plaquage)              │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │  Produit                   Qté    Plaques   Plaqué      │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │  Croissant (16/plaque)     24     2         [ ]         │   │
│  │  Pain Chocolat (12/plaque) 18     2         [ ]         │   │
│  │  Pain aux Raisins          12     1         [ ]         │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │  🍞 PAINS SPÉCIAUX (petites qté, variés)                │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │  Pain Noix 400g            4      1         [ ]         │   │
│  │  Pain Céréales 500g        6      1         [ ]         │   │
│  │  Fougasse Olive            3      1         [ ]         │   │
│  │                                                         │   │
│  │  ❄️ → Remettre en chambre froide négative              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  → Marie plaque → Coche [☑️ Plaqué]                            │
│  → Pas de "Cuit" ici, c'est pour DEMAIN MATIN                  │
│                                                                 │
│  💡 Note : Les BAGUETTES ne sont PAS plaquées la veille        │
│     (plaquage rapide 5-10 min le matin même)                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  📦 16h00 - AIDE À LA COMMANDE (jours définis uniquement)       │
│  Ex: Mardi et Vendredi                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📦 AIDE À LA COMMANDE                                  │   │
│  │  Prochaine livraison : JEUDI                            │   │
│  │  Période couverte : Mercredi → Vendredi (3 jours)      │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │  Produit              Besoin   Stock   À commander     │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │  Pâte Baguette 10kg   15 sacs   [3]     12 sacs        │   │
│  │  Levure 500g          8 pcs     [2]     6 pcs          │   │
│  │  Farine T65 25kg      4 sacs    [1]     3 sacs         │   │
│  │                                                         │   │
│  │  [Valider commande]                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  💡 Le stock est saisi manuellement par l'employé              │
│  💡 Le besoin est calculé automatiquement par l'application    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  🌙 19h00 - FIN DE JOURNÉE                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✅ Plaquage demain déjà fait (14h)                             │
│  ✅ Casse sera saisie demain matin                              │
│  ✅ Marie part sereine                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. FONCTIONNALITÉS PAR MODULE

### 4.1 Module IMPORT (Responsable)

| Fonctionnalité | Description | Priorité |
|----------------|-------------|----------|
| Import Fréquentation | Excel/CSV, 3 semaines, heure par heure | 🔴 Critique |
| Import Ventes | Excel/CSV, 1 à N semaines, par produit/jour + Valeur prix vente | 🔴 Critique |
| Reconnaissance ITM8 | Identification automatique des produits | 🔴 Critique |
| Calcul Potentiels Auto | Moyenne des ventes max / poids du jour | 🔴 Critique |
| Calcul CA Auto | Depuis colonne "Valeur prix vente" | 🔴 Critique |
| Détection Multi-Semaines | Adaptation automatique au nombre de semaines | 🟡 Important |
| Pondération historique | Choix du mode de pondération (Standard/Saisonnier/Promo) | 🟡 Important |

**Note importante** : L'application s'adapte aux données fournies. Pas de limite sur le nombre de semaines. Plus il y a de semaines, plus les calculs sont fiables.

#### Pondération des Semaines Historiques

Lors de l'import, l'utilisateur peut choisir le type de pondération :

| Mode | S-1 | AS-1 | S-2 | Usage |
|------|-----|------|-----|-------|
| **Standard** | 40% | 30% | 30% | Semaine normale |
| **Saisonnier** | 30% | 50% | 20% | Période atypique (vacances, fêtes) |
| **Forte Promo** | 60% | 20% | 20% | Semaine avec grosse animation |

**Explication des périodes :**
- **S-1** : Semaine précédente
- **AS-1** : Même semaine année précédente
- **S-2** : Semaine -2

| Semaines fournies | Fiabilité | Fonctionnalités disponibles |
|-------------------|-----------|----------------------------|
| 1-2 semaines | ⚠️ Faible | Potentiel basique |
| 3-4 semaines | 🟡 Moyenne | Potentiel + Fiabilité |
| 5+ semaines | 🟢 Bonne | Potentiel + Fiabilité + Tendance |
| 8+ semaines | 🟢 Excellente | Potentiel + Fiabilité + Tendance + Saisonnalité |

### 4.2 Module FICHIER MAGASIN (Responsable)

| Fonctionnalité | Description | Priorité |
|----------------|-------------|----------|
| Génération Fichier | Export JSON avec config complète | 🔴 Critique |
| Chargement Fichier | Import fichier existant | 🔴 Critique |
| Archivage | Conservation historique (pas d'expiration) | 🟢 Bonus |
| Versioning | Numérotation automatique | 🟢 Bonus |

**Format** : JSON (.bvp.json) - Non bloqué par les antivirus

#### Gestion des Conflits de Données (Synchronisation Manuelle)

**Problématique :**
Le Responsable génère le fichier .bvp.json sur PC.
L'Équipe saisit des données sur tablette (Casse, Stock, Ajustements).
Risque : écraser les données saisies par l'équipe lors d'un rechargement.

**Stratégie de Fusion :**
Lors du chargement d'un fichier .bvp.json :
1. Le système vérifie si des données locales existent (localStorage)
2. Si oui, proposer 3 options :
   - **FUSIONNER** : Garder les saisies locales + nouvelle config
   - **ÉCRASER** : Remplacer tout par le nouveau fichier
   - **ANNULER** : Ne pas charger le nouveau fichier

**Données locales à préserver :**
- Saisies de Casse
- Ajustements de dernière cuisson
- Stock rayon saisi
- Notes de l'équipe

**Données du nouveau fichier prioritaires :**
- Configuration (horaires, semaine)
- Liste des produits actifs
- Potentiels et objectifs
- Paramètres de calcul (BVP/PDV, limites)

### 4.3 Module PLANNING JOUR (Employé)

| Fonctionnalité | Description | Priorité |
|----------------|-------------|----------|
| Vue par tranche horaire | Matin / Midi / Après-midi | 🔴 Critique |
| Affichage quantités | Unités + Plaques | 🔴 Critique |
| Validation "Plaqué" | Préparé sur plaque | 🔴 Critique |
| Validation "Cuit" | Sorti du four, en rayon | 🔴 Critique |
| Affichage CA (optionnel) | Si activé par responsable | 🟡 Important |
| Impression | PDF / Print propre | 🔴 Critique |

### 4.4 Module PLAQUAGE DEMAIN (Employé)

| Fonctionnalité | Description | Priorité |
|----------------|-------------|----------|
| Vue produits longs | Viennoiseries, pains spéciaux | 🔴 Critique |
| Affichage plaques | "24 unités → 2 plaques" | 🔴 Critique |
| Exclusion baguettes | Baguettes = matin même | 🔴 Critique |
| Validation "Plaqué" | Préparé pour demain | 🔴 Critique |

### 4.5 Module CASSE (Employé)

| Fonctionnalité | Description | Priorité |
|----------------|-------------|----------|
| Saisie invendus | Par produit, quantité | 🔴 Critique |
| Premier écran matin | Affiché en priorité à l'ouverture | 🔴 Critique |
| Historique casse | Conservation pour stats | 🟡 Important |
| Impact prévisions | Ajustement potentiels futurs | 🟢 Bonus |

### 4.6 Module AIDE COMMANDE (Employé)

| Fonctionnalité | Description | Priorité |
|----------------|-------------|----------|
| Calcul besoins période | Jusqu'à prochaine livraison | 🔴 Critique |
| Saisie stock manuel | Par produit | 🔴 Critique |
| Stock sécurité | % paramétrable | 🟡 Important |
| Génération commande | Liste à commander | 🔴 Critique |

### 4.7 Module PILOTAGE CA (Responsable)

| Fonctionnalité | Description | Priorité |
|----------------|-------------|----------|
| CA Total Rayon | Calculé automatiquement depuis fichier ventes | 🔴 Critique |
| CA Produits Monitorés | Σ CA des produits actifs | 🔴 Critique |
| Part du Rayon | % des produits monitorés vs total | 🔴 Critique |
| Objectif Progression | % défini par responsable | 🟡 Important |
| CA Objectif | Calculé avec progression | 🟡 Important |
| Gain Potentiel | CA Objectif - CA Actuel | 🟡 Important |
| Affichage équipes | Option Oui/Non | 🟡 Important |

---

## 5. MODÈLE DE DONNÉES

### 5.0 Versioning des Fichiers

#### Structure obligatoire

Tous les fichiers `.bvp.json` et `.bvp-archive.json` DOIVENT contenir un champ `schemaVersion` :

```json
{
  "schemaVersion": "2.0",
  "createdAt": "2025-12-17T10:30:00Z",
  "createdBy": "BVP Planning V2.0",
  "lastModifiedAt": "2025-12-17T14:45:00Z",
  "lastModifiedBy": "BVP Planning V2.0",
  "magasin": { ... },
  "semaine": { ... }
}
```

#### Champs de métadonnées obligatoires

| Champ | Type | Description |
|-------|------|-------------|
| `schemaVersion` | string | Version du schéma (ex: "2.0", "2.1") |
| `createdAt` | ISO 8601 | Date/heure de création |
| `createdBy` | string | Application et version ayant créé le fichier |
| `lastModifiedAt` | ISO 8601 | Dernière modification |
| `lastModifiedBy` | string | Application ayant modifié |

#### Règles de compatibilité

| Version fichier | Application V2.0 | Application V2.1+ |
|-----------------|------------------|-------------------|
| Sans version | ❌ Refusé avec message | ❌ Refusé |
| 2.0 | ✅ Compatible | ✅ Migration auto |
| 2.1 | ❌ Trop récent | ✅ Compatible |

#### Stratégie de migration

1. À l'ouverture d'un fichier, vérifier `schemaVersion`
2. Si version < version actuelle → migration automatique silencieuse
3. Si version > version actuelle → message d'erreur : *"Ce fichier a été créé avec une version plus récente de BVP Planning. Veuillez mettre à jour l'application."*
4. Si `schemaVersion` absent → fichier V1 legacy, proposer migration ou refus

### 5.1 Produit

```javascript
{
  // Identification
  id: number,                       // ID unique
  libelle: string,                  // Libellé original (fichier ventes)
  libellePersonnalise: string,      // Libellé modifiable (par responsable OU employé)
  itm8: number | null,              // Code ITM8 si connu
  plu: string | null,               // Code PLU (modifiable par responsable OU employé)
  ean: string | null,               // Code EAN
  
  // Classification (modifiable par responsable OU employé)
  rayon: string,                    // BOULANGERIE | VIENNOISERIE | PATISSERIE | SNACKING | NEGOCE
  programme: string,                // Programme de cuisson
  
  // Potentiel et calcul
  potentielHebdo: number,           // Quantité hebdomadaire estimée
  modeCalcul: string,               // 'S' | 'F' | 'f' | 'moyenne' (mode appliqué)

  // Statistiques multi-semaines (calculées automatiquement)
  nombreSemaines: number,           // Nombre de semaines de données
  moyenneHebdo: number,             // Moyenne des ventes par semaine
  moyenneVentesMax: number,         // Moyenne des ventes MAX par semaine
  tendance: string,                 // "hausse" | "stable" | "baisse"
  tendancePourcent: number,         // Ex: +15% ou -8%
  variabilite: number,              // Coefficient de variation (écart-type / moyenne × 100)
  fiabilite: number,                // Score de confiance 0-100

  // Historique détaillé (optionnel, pour analyse)
  historiqueParSemaine: [           // Tableau des ventes par semaine ISO
    {
      semaine: number,              // Ex: 48
      annee: number,                // Ex: 2025
      total: number,                // Total ventes de la semaine
      venteMax: number,             // Vente max de la semaine
      jourVenteMax: string          // Jour de la vente max
    }
  ],

  // Plaquage (modifiable par responsable OU employé)
  unitesParPlaque: number,          // Nombre d'unités par plaque
  tempsPlaquage: string,            // "court" (5-10min) | "long" (30-45min)
  
  // CA (calculé automatiquement depuis fichier ventes)
  prixMoyenUnitaire: number,        // CA ÷ Quantité vendue
  caHebdoActuel: number,            // CA hebdo historique
  caHebdoObjectif: number,          // CA avec progression
  gainPotentiel: number,            // caObjectif - caActuel
  
  // État (modifiable par responsable uniquement)
  actif: boolean                    // Inclus dans le planning
}
```

### 5.2 Configuration Magasin

```javascript
{
  // Identification
  version: string,                  // "2.0"
  dateGeneration: string,           // ISO date
  
  magasin: {
    nom: string,                    // "SAS CHAMAFFI"
    code: string                    // "10679"
  },
  
  // Jours d'ouverture (modifiable par responsable uniquement)
  joursOuverture: {
    lundi: boolean,
    mardi: boolean,
    mercredi: boolean,
    jeudi: boolean,
    vendredi: boolean,
    samedi: boolean,
    dimanche: boolean
  },
  
  // Fréquentation (calculée automatiquement depuis fichier import)
  frequentation: {
    // Données brutes pondérées
    ticketsParJour: {
      lundi: number,                // Tickets pondérés (ex: 1250)
      mardi: number,
      mercredi: number,
      jeudi: number,
      vendredi: number,
      samedi: number,
      dimanche: number
    },
    totalTicketsSemaine: number,    // Total tickets pondérés semaine

    // Poids calculés (% du trafic)
    poidsJours: {
      lundi: number,                // 0.15 = 15%
      mardi: number,
      mercredi: number,
      jeudi: number,
      vendredi: number,
      samedi: number,
      dimanche: number
    },

    // Poids par tranche horaire et par jour
    poidsTranchesParJour: {
      lundi: {
        avant12h: number,           // 0.35 = 35%
        '12h-14h': number,          // 0.25 = 25%
        '14h-16h': number,          // 0.20 = 20%
        apres16h: number            // 0.20 = 20%
      },
      // ... autres jours
    },

    // Moyennes hebdomadaires (pour tous les jours)
    poidsTranchesGlobal: {
      avant12h: number,             // 0.35 = 35%
      '12h-14h': number,
      '14h-16h': number,
      apres16h: number
    },

    // Configuration de pondération utilisée
    typePonderation: string,        // 'standard' | 'saisonnier' | 'fortePromo'
    ponderations: {
      S1: number,                   // Poids semaine -1 (ex: 0.40)
      AS1: number,                  // Poids année -1 même semaine (ex: 0.30)
      S2: number                    // Poids semaine -2 (ex: 0.30)
    },

    // Base de calcul choisie
    baseCalcul: string              // 'BVP' | 'PDV'
  },
  
  // Commandes (modifiable par responsable uniquement)
  commande: {
    joursCommande: string[],        // ["mardi", "vendredi"]
    joursLivraison: string[],       // ["mercredi", "samedi"]
    stockSecurite: number           // 0.10 = 10%
  },
  
  // Pilotage CA (modifiable par responsable uniquement)
  pilotageCA: {
    // Calculé automatiquement depuis fichier ventes
    caTotalRayonHebdo: number,      // Σ "Valeur prix vente"
    
    // Calculé depuis produits monitorés (actifs)
    caMonitoreActuel: number,       // Σ CA des produits actifs
    partRayonActuel: number,        // caMonitore ÷ caTotal
    
    // Paramètre responsable
    objectifProgression: number,    // % (ex: 50 = +50%)
    afficherCAEquipes: boolean,     // Afficher sur planning jour
    
    // Calculé avec progression
    caMonitoreObjectif: number,     // caActuel × (1 + progression)
    partRayonObjectif: number,      // Nouvelle part après progression
    caTotalRayonPrevu: number,      // Total prévu avec gains
    gainPotentiel: number           // caObjectif - caActuel
  },
  
  // Produits
  produits: [/* Array de Produit */]
}
```

### 5.3 Planning Jour

```javascript
{
  date: string,                     // "2025-12-03"
  jourSemaine: string,              // "mardi"
  poidsJour: number,                // 0.14 (14% de la semaine)
  
  tranches: {
    matin: {
      heures: "6h-12h",
      poids: 0.40,
      produits: [
        {
          id: 1,
          libelle: "Baguette Tradition",
          quantite: 45,
          plaques: 4,
          
          // États de production (modifiable par responsable OU employé)
          plaque: {
            fait: false,
            heure: null,
            par: null
          },
          cuit: {
            fait: false,
            heure: null,
            par: null
          },
          
          // CA (si affichage activé)
          ca: 28.50
        }
      ],
      caTotal: 125.00               // Si affichage activé
    },
    midi: { /* ... */ },
    apresMidi: { /* ... */ }
  },
  
  // Plaquage pour demain (produits longs uniquement)
  plaquageDemain: [
    {
      id: 5,
      libelle: "Croissant",
      quantite: 24,
      plaques: 2,
      tempsPlaquage: "long",
      plaque: {
        fait: false,
        heure: null,
        par: null
      }
      // Pas de "cuit" ici, c'est pour demain
    }
  ],
  
  caJourTotal: 285.00               // Si affichage activé
}
```

### 5.4 États de Production

```javascript
{
  // État PLAQUÉ (modifiable par responsable OU employé)
  plaque: {
    fait: boolean,                  // true = préparé sur plaque
    heure: string | null,           // ISO date heure
    par: string | null              // "employe" | "responsable"
  },
  
  // État CUIT (modifiable par responsable OU employé)
  cuit: {
    fait: boolean,                  // true = sorti du four, en rayon
    heure: string | null,
    par: string | null
  }
}
```

**Logique des états :**

| Situation | Plaqué | Cuit | Description |
|-----------|:------:|:----:|-------------|
| À faire | ☐ | ☐ | Pas encore commencé |
| En préparation | ☑️ | ☐ | Plaqué, en attente cuisson |
| Terminé | ☑️ | ☑️ | Cuit et en rayon |
| Plaqué hier | ☑️ (hier) | ☐ | Viennoiserie prête pour cuisson matin |

### 5.5 Casse

```javascript
{
  date: string,                     // Date de la casse (veille)
  dateSaisie: string,               // Date/heure de saisie
  produits: [
    {
      id: 1,
      libelle: "Baguette Tradition",
      quantite: 3,
      valeurPerdue: 4.77            // quantite × prixMoyenUnitaire
    }
  ],
  totalUnites: number,
  totalValeur: number
}
```

### 5.6 Commande

```javascript
{
  dateCommande: string,             // "2025-12-03"
  dateLivraison: string,            // "2025-12-05"
  periodeCouverture: number,        // 3 jours
  lignes: [
    {
      id: 1,
      libelle: "Pâte Baguette 10kg",
      besoinPeriode: 15,
      stockActuel: 3,               // Saisi manuellement
      stockSecurite: 2,             // Calculé (10% du besoin)
      aCommander: 14
    }
  ]
}
```

### 5.7 Fichier Archive (.bvp-archive.json)

Structure du fichier d'archive pour la comparaison Prévu vs Réalisé :

```javascript
{
  version: "2.0",
  type: "archive",
  dateGeneration: string,           // ISO date de génération

  magasin: {
    nom: string,
    code: string
  },

  periode: {
    semaine: number,                // Ex: 50
    annee: number,                  // Ex: 2025
    dateDebut: string,              // "2025-12-09"
    dateFin: string                 // "2025-12-15"
  },

  // Données PRÉVU (ce qui était planifié)
  prevu: {
    produits: [
      {
        id: number,
        libelle: string,
        famille: string,            // BOULANGERIE | VIENNOISERIE | PATISSERIE | SNACKING | NEGOCE
        programme: string,

        // Quantités prévues par jour
        parJour: {
          lundi: { quantite: number, ca: number },
          mardi: { quantite: number, ca: number },
          mercredi: { quantite: number, ca: number },
          jeudi: { quantite: number, ca: number },
          vendredi: { quantite: number, ca: number },
          samedi: { quantite: number, ca: number },
          dimanche: { quantite: number, ca: number }
        },

        totalSemaine: number,
        caSemaine: number
      }
    ],

    // Totaux prévus
    totaux: {
      quantite: number,
      ca: number
    }
  },

  // Données RÉALISÉ (ventes réelles + casse)
  realise: {
    produits: [
      {
        id: number,
        libelle: string,

        // Ventes réelles par jour
        parJour: {
          lundi: { vendu: number, casse: number, ca: number },
          mardi: { vendu: number, casse: number, ca: number },
          // ...
        },

        totalVendu: number,
        totalCasse: number,
        caReel: number
      }
    ],

    // Totaux réalisés
    totaux: {
      vendu: number,
      casse: number,
      caReel: number,
      casseValeur: number           // Valeur € de la casse
    }
  },

  // Écarts calculés
  ecarts: {
    parProduit: [
      {
        id: number,
        libelle: string,
        prevu: number,
        realise: number,
        ecart: number,              // realise - prevu
        ecartPourcent: number,      // ((realise - prevu) / prevu) * 100
        casse: number,
        cassePourcent: number       // (casse / prevu) * 100
      }
    ],

    // Score global de précision
    scorePrecision: number,         // 0-100, moyenne des écarts

    // Résumé
    resume: {
      produitsEnHausse: number,     // Nb produits où réalisé > prévu
      produitsEnBaisse: number,     // Nb produits où réalisé < prévu
      casseTotale: number,
      cassePourcent: number
    }
  },

  // Suggestions pour la semaine suivante
  suggestions: [
    {
      produitId: number,
      libelle: string,
      type: "augmenter" | "diminuer" | "stable",
      pourcentage: number,          // Ex: +10 ou -5
      raison: string                // Ex: "Réalisé > Prévu de 15%"
    }
  ]
}
```

**Usage du fichier archive :**

| Étape | Action |
|-------|--------|
| Fin de semaine | Responsable génère l'archive avec les données réalisées |
| Semaine suivante | Responsable importe l'archive à l'étape 2 du Wizard |
| Analyse | L'application affiche la comparaison et les suggestions |
| Décision | Responsable applique ou ignore les suggestions |

---

## 6. RÈGLES MÉTIER

### 6.1 Calcul du Potentiel Hebdomadaire

#### Formule de Base
```
Potentiel Mathématique = Vente MAX ÷ Poids du jour de cette vente
```

#### 4 Modes de Calcul Disponibles

L'application propose 4 modes de calcul pour s'adapter aux différentes stratégies commerciales :

**1. Mode "Mathématique" (S = Sans limite de plafond)**
```
Si potentiel calculé < historique :
  Potentiel = Historique (plancher = historique)
Sinon :
  Potentiel = Calcul mathématique (pas de plafond)
```
- Aucun plafond de progression (croissance illimitée)
- **Plancher = historique** : jamais en dessous des ventes actuelles
- Recommandé pour les nouveaux produits ou les périodes de forte croissance

**2. Mode "Forte Progression" (F = +20% max)**
```
Plafond = Historique × 1.20
Plancher = Historique

Potentiel = Max(Plancher, Min(Calcul mathématique, Plafond))
```
- Plafond de progression = +20% maximum par rapport à l'historique
- **Plancher = historique** : jamais en dessous des ventes actuelles
- Évite les surstocks tout en permettant une croissance soutenue
- Sécurise les prévisions en cas de pic de ventes inhabituel

**3. Mode "Prudent" (f = +10% max)**
```
Plafond = Historique × 1.10
Plancher = Historique

Potentiel = Max(Plancher, Min(Calcul mathématique, Plafond))
```
- Plafond de progression = +10% maximum par rapport à l'historique
- **Plancher = historique** : jamais en dessous des ventes actuelles
- Approche conservatrice pour minimiser le gaspillage
- Recommandé pour les produits matures ou les périodes incertaines

#### Tableau de Synthèse des Limites S/F/f

| Mode | Plafond | Plancher | Formule |
|------|---------|----------|---------|
| **S** | Aucun (illimité) | Historique | `Max(historique, calcul)` |
| **F** | Historique × 1.20 | Historique | `Max(historique, Min(calcul, histo×1.20))` |
| **f** | Historique × 1.10 | Historique | `Max(historique, Min(calcul, histo×1.10))` |

**Tableau de validation (historique = 100):**

| Calculé | Mode S | Mode F | Mode f |
|---------|--------|--------|--------|
| 150 | **150** | **120** (plafonné) | **110** (plafonné) |
| 115 | **115** | **115** | **110** (plafonné) |
| 105 | **105** | **105** | **105** |
| 90 | **100** (plancher) | **100** (plancher) | **100** (plancher) |

> **⚠️ IMPORTANT** : Le principe de non-baisse s'applique à TOUS les modes. Le potentiel ne peut JAMAIS être inférieur à l'historique, quelle que soit la limite configurée.

**4. Mode "Moyenne Multi-Semaines" (recommandé avec 3+ semaines)**
```
Potentiel = Moyenne des ventes MAX par semaine ÷ Poids du jour le plus fréquenté

Exemple avec 4 semaines de données :
┌─────────────┬─────┬─────┬─────┬─────┬─────────────┐
│ Produit     │ S1  │ S2  │ S3  │ S4  │ Moy. Max    │
├─────────────┼─────┼─────┼─────┼─────┼─────────────┤
│ Baguette    │ 75  │ 80  │ 78  │ 82  │ 79          │
└─────────────┴─────┴─────┴─────┴─────┴─────────────┘

Potentiel = 79 ÷ 0.20 = 395 unités/semaine
```
- Utilise la **moyenne des ventes max** de chaque semaine (au lieu du max absolu)
- Plus stable que le mode mathématique (évite les pics exceptionnels)
- Nécessite minimum 2 semaines de données pour être pertinent
- Recommandé comme mode par défaut avec un historique suffisant

#### Exemple Détaillé avec les 4 Modes
```
Produit : Pain aux céréales

Historique ventes :
- Lundi 15/01 : 5
- Mardi 16/01 : 8
- Mercredi 17/01 : 12
- Jeudi 18/01 : 10
- Vendredi 19/01 : 15  ← VENTE MAX
- Samedi 20/01 : 7
- Dimanche 21/01 : 9

Volume actuel (total des ventes) = 66 unités/semaine
Vente MAX = 15 (le vendredi 19/01)

Fréquentation :
poidsJours.vendredi = 0.20 (20% du trafic hebdo)

Calcul mathématique :
Potentiel Math = 15 ÷ 0.20 = 75 unités/semaine
Progression = (75 - 66) / 66 = +13.6%

Résultats selon les modes :
- Mode Mathématique (S)      : 75 unités (+13.6%)
- Mode Forte Progression (F) : 75 unités (+13.6% < 20%, pas de limitation)
- Mode Prudent (f)           : 73 unités (limité à +10% = 66 × 1.10)
```

#### Cas Particuliers et Gestion des Erreurs
```
Si jour de vente MAX introuvable dans fréquentation :
→ Utilise poids du jour le plus fréquenté (max des poids)

Si vente MAX = 0 :
→ Potentiel = 0 (produit inactif ou à saisie manuelle)

Si potentiel calculé < historique (TOUS les modes S, F, f) :
→ Potentiel = Historique (principe de non-baisse)

Si produit sans historique (0 jour de données) :
→ Saisie manuelle obligatoire du potentiel

Si produit avec historique partiel (1-3 jours) :
→ Extrapolation avec indicateur "⚠️ Données insuffisantes"
```

**Avantage :** Plus il y a de semaines, plus le calcul est fiable. Évite les pics exceptionnels.

#### Gestion des Produits Sans Historique (Mode "Dégradé")

**Cas concernés :**
- Nouveau produit (moins de 7 jours de ventes)
- Produit saisonnier réactivé
- Produit exceptionnel (galette des rois, bûche...)

**Règles de calcul de repli :**

| Situation | Règle appliquée |
|-----------|-----------------|
| 0 jour d'historique | Saisie manuelle obligatoire du potentiel |
| 1-3 jours d'historique | Moyenne × 7, avec indicateur "⚠️ Données insuffisantes" |
| 4-6 jours d'historique | Extrapolation, avec indicateur "📊 Estimation" |
| 7+ jours d'historique | Calcul standard |

**Alternative : Moyenne de la famille**
Si aucun historique, proposer d'utiliser la moyenne des produits de la même famille :
- Ex: Nouveau pain → Moyenne des pains existants
- Avec coefficient ajustable (50%, 75%, 100%, 125%)

**Indicateur de fiabilité :**
Afficher un score de confiance (0-100%) basé sur :
- Nombre de jours d'historique (30 pts)
- Variabilité des ventes (40 pts)
- Couverture des tranches horaires (30 pts)

#### Pondération Multi-Semaines

**Objectif :** Lisser les variations saisonnières et promotionnelles en utilisant 3 semaines de données historiques.

**Les 3 Semaines de Référence :**
```
S-1   : Semaine précédente (données les plus récentes)
AS-1  : Année antérieure, même semaine (saisonnalité)
S-2   : Il y a 2 semaines (tendance)
```

**3 Types de Pondération :**

| Type | S-1 | AS-1 | S-2 | Utilisation |
|------|-----|------|-----|-------------|
| **STANDARD** | 40% | 30% | 30% | Activité normale, pas d'événement spécial |
| **SAISONNIER** | 30% | 50% | 20% | Périodes fortement saisonnières (Noël, Pâques) |
| **FORTE PROMO** | 60% | 20% | 20% | Semaines promotionnelles, événements ponctuels |

**Application de la Pondération :**
```
Pour chaque jour et tranche horaire :

tickets_pondérés = (tickets_S1 × poids_S1) +
                   (tickets_AS1 × poids_AS1) +
                   (tickets_S2 × poids_S2)

Exemple (Lundi matin, pondération STANDARD) :
- S-1  : 120 tickets × 0.40 = 48
- AS-1 : 100 tickets × 0.30 = 30
- S-2  : 110 tickets × 0.30 = 33
→ Total : 111 tickets pondérés

Poids jour = tickets_jour ÷ total_tickets_semaine
Poids tranche = tickets_tranche ÷ tickets_jour
```

**Cas où les données sont manquantes :**
| Données disponibles | Comportement |
|---------------------|--------------|
| S-1 + AS-1 + S-2 | Pondération normale |
| S-1 + S-2 (pas AS-1) | 60% S-1 + 40% S-2 |
| S-1 seule | 100% S-1 |
| Aucune | Poids par défaut (uniforme) |

#### Indicateurs de Fiabilité par Produit

L'application analyse automatiquement les données de ventes sur plusieurs semaines pour fournir des indicateurs de tendance et de fiabilité.

**Statistiques Calculées par Produit :**

| Indicateur | Description | Calcul |
|------------|-------------|--------|
| **nombreSemaines** | Nombre de semaines de données | Comptage des semaines ISO distinctes |
| **moyenneHebdo** | Volume moyen par semaine | Σ ventes ÷ nombreSemaines |
| **moyenneVentesMax** | Moyenne des pics de vente | Moyenne des ventes max de chaque semaine |
| **tendance** | Évolution des ventes | Comparaison 1ère moitié vs 2ème moitié |
| **tendancePourcent** | Variation en % | ((2ème moitié - 1ère moitié) / 1ère moitié) × 100 |
| **variabilite** | Coefficient de variation | (Écart-type ÷ Moyenne) × 100 |
| **scoreConfiance** | Score de fiabilité 0-100 | Calcul composite (voir ci-dessous) |

**Calcul de la Tendance :**
```
tendancePourcent = (Moyenne 2ème moitié - Moyenne 1ère moitié) / Moyenne 1ère moitié × 100

Si tendancePourcent > +10%  : tendance = "hausse" (↗️)
Si tendancePourcent < -10%  : tendance = "baisse" (↘️)
Sinon                       : tendance = "stable" (↔️)
```

**Calcul du Score de Confiance :**
```
scoreConfiance = Score_Semaines + Score_Variabilité + Score_Couverture

Score_Semaines (max 30 pts) :
┌─────────────────┬──────────┐
│ Nb semaines     │ Points   │
├─────────────────┼──────────┤
│ 1 semaine       │ 10 pts   │
│ 2 semaines      │ 20 pts   │
│ 3+ semaines     │ 30 pts   │
└─────────────────┴──────────┘

Score_Variabilité (max 40 pts) :
┌─────────────────┬──────────┐
│ Variabilité     │ Points   │
├─────────────────┼──────────┤
│ < 20%           │ 40 pts   │
│ 20-50%          │ 25 pts   │
│ > 50%           │ 10 pts   │
└─────────────────┴──────────┘

Score_Couverture (max 30 pts) :
┌─────────────────────────────┬──────────┐
│ Couverture jours            │ Points   │
├─────────────────────────────┼──────────┤
│ Ventes tous les jours       │ 30 pts   │
│ Proportionnel au ratio      │ X pts    │
│ (jours vendus / jours total)│          │
└─────────────────────────────┴──────────┘
```

**Affichage dans le Tableau des Produits :**

| Colonne | Affichage | Code couleur |
|---------|-----------|--------------|
| **Moy. Hebdo** | Moyenne hebdomadaire + tooltip "Total: X sur N semaines" | - |
| **Tendance** | ↗️ +X% / ↘️ -X% / ↔️ 0% | Vert/Rouge/Gris |
| **Fiabilité** | Cercle coloré + score | Vert (70-100) / Jaune (40-69) / Rouge (0-39) |

**Exemple Concret :**
```
Produit : Croissant Beurre (4 semaines de données)

Ventes hebdo : S1=450, S2=480, S3=510, S4=520
Ventes max   : S1=75,  S2=80,  S3=82,  S4=85

Statistiques calculées :
┌───────────────────┬────────────────────┐
│ nombreSemaines    │ 4                  │
│ moyenneHebdo      │ 490 unités         │
│ moyenneVentesMax  │ 80.5 unités        │
│ tendance          │ "hausse" ↗️        │
│ tendancePourcent  │ +15%               │
│ variabilite       │ 8%                 │
│ scoreConfiance    │ 85 (vert)          │
└───────────────────┴────────────────────┘

Interprétation :
✅ Produit très fiable (85/100)
✅ En croissance régulière (+15%)
✅ Faible variabilité (8%)
→ Le mode "Moyenne multi-semaines" donnera un potentiel stable
```

### 6.2 Calcul du CA

**CA par produit (automatique) :**
```
CA Total Produit = Σ "Valeur prix vente" (toutes les lignes du produit)
Prix Moyen Unitaire = CA Total Produit ÷ Quantité Totale Vendue
CA Hebdo = CA Total ÷ Nombre de semaines
```

**CA Total Rayon (automatique) :**
```
CA Total Rayon = Σ CA de tous les produits du fichier ventes
```

**CA Monitoré (automatique) :**
```
CA Monitoré = Σ CA des produits actifs (sélectionnés par responsable)
Part Rayon = CA Monitoré ÷ CA Total Rayon × 100
```

**CA Objectif (avec progression) :**
```
CA Objectif = CA Monitoré × (1 + Objectif Progression)
Gain Potentiel = CA Objectif - CA Monitoré
```

### 6.3 Calcul de l'Élasticité Promotionnelle

> ⚠️ **Note** : Le terme "élasticité" est utilisé ici dans un sens simplifié, adapté au contexte métier boulangerie. Il ne s'agit pas de l'élasticité-prix au sens économique classique.

**Formule de l'élasticité :**
```
Élasticité = (Marge normale / Marge promo) - 1
```

**Interprétation :**
- L'élasticité représente l'augmentation de volume nécessaire pour compenser la baisse de marge
- Plus la marge diminue, plus il faut vendre de volume pour maintenir le CA

**Exemple concret :**

| Produit | Prix normal | Prix promo | Coût revient | Marge normale | Marge promo | Élasticité |
|---------|-------------|------------|--------------|---------------|-------------|------------|
| Croissant | 1.20€ | 0.90€ | 0.40€ | 0.80€ | 0.50€ | 0.60 (60%) |

**Calcul détaillé :**
```
Marge normale = Prix normal - Coût = 1.20€ - 0.40€ = 0.80€
Marge promo   = Prix promo - Coût  = 0.90€ - 0.40€ = 0.50€

Élasticité = (0.80 / 0.50) - 1 = 0.60 = +60%

→ Pour compenser la baisse de marge, il faut vendre 60% de croissants en plus
```

**Application dans le planning :**
```
Qté objectif = Qté normale × (1 + Élasticité)

Exemple : 100 croissants/jour × 1.60 = 160 croissants/jour en promo
```

**Cas particuliers :**

| Situation | Réduction prix | Élasticité | Impact volume |
|-----------|----------------|------------|---------------|
| Promo légère | -10% | ~0.15 | +15% volume |
| Promo standard | -25% | ~0.33 | +33% volume |
| Promo forte | -50% | ~1.00 | +100% volume |

**Limites du modèle :**

| Limite | Description |
|--------|-------------|
| **Indicatif** | Ce modèle est une estimation, pas une prédiction exacte |
| **Variable** | L'élasticité réelle varie selon : produit, période, communication promo |
| **Affinage** | Utiliser les données d'archive (Prévu vs Réalisé) pour affiner au fil du temps |
| **Plafond** | L'élasticité ne doit pas dépasser 2.0 (×3 le volume) sauf cas exceptionnel |

### 6.4 Répartition Journalière

```
QuantitéJour = PotentielHebdo × PoidsJour × (1 + Buffer)

Où :
- PoidsJour = % de fréquentation du jour (ex: 14% pour mardi)
- Buffer = 10% par défaut (marge de sécurité)
```

### 6.5 Répartition Horaire

```
QuantitéTranche = QuantitéJour × PoidsTranche

Où :
- PoidsMatin = 40%
- PoidsMidi = 35%
- PoidsAprèsMidi = 25%
```

### 6.6 Classification Temps de Plaquage

| Catégorie | Produits | Temps | Quand plaquer |
|-----------|----------|-------|---------------|
| **Court** | Baguettes, pains simples | 5-10 min | Le matin même |
| **Long** | Viennoiseries, pains spéciaux | 30-45 min | La veille (14h) |

**Règle automatique :**
- Si `rayon === "VIENNOISERIE"` → `tempsPlaquage = "long"`
- Si `libelle` contient mots-clés spéciaux → `tempsPlaquage = "long"`
- Sinon → `tempsPlaquage = "court"`

**Mots-clés pour plaquage long :**
- CROISSANT, PAIN CHOCOLAT, PAIN RAISIN
- BRIOCHE, TRESSE, KOUIGN
- SPECIAL, CAMPAGNE, CEREALES, NOIX, OLIVE, FOUGASSE

### 6.7 Workflow Spécifique pour la Famille NEGOCE

**Définition :**
Produits achetés et revendus sans transformation :
- Donuts/Beignets (décongelés)
- Biscuiterie sèche
- Boissons
- Produits d'impulsion

**Différences avec les autres familles :**

| Aspect | Autres familles | NEGOCE |
|--------|-----------------|--------|
| Cuisson | Oui | Non |
| Plaquage | Oui | Non |
| Tranches horaires | 4 tranches | Journalier uniquement |
| Module "Plaquage Demain" | Affiché | Masqué (non applicable) |
| Unités/Plaque | Nombre | "N/A" ou "-" |

**Affichage dans les modules :**

**Planning Jour :**
- Afficher dans une section séparée "NEGOCE (Mise en rayon)"
- Une seule colonne "Quantité Jour" (pas de tranches)

**Plaquage Demain :**
- Ne PAS afficher les produits NEGOCE
- Ou les afficher grisés avec mention "Sans plaquage"

**Commande :**
- Afficher normalement (ils doivent être commandés)

### 6.8 Calcul Aide à la Commande

```
JoursJusquaLivraison = dateLivraison - dateCommande

BesoinPériode = Σ (QuantitéJour pour chaque jour de la période)

ÀCommander = (BesoinPériode × (1 + StockSécurité)) - StockActuel

Si ÀCommander < 0 → ÀCommander = 0
```

### 6.9 Reports de Production (Fermetures Exceptionnelles)

Quand un jour est marqué "Fermé exceptionnel", le système doit gérer le report de production.

**Options de report :**
1. **Reporter sur la veille** : +X% sur le jour précédent
2. **Reporter sur l'avant-veille** : Répartir sur J-1 et J-2
3. **Ne pas reporter** : Production perdue (ex: produit très frais)

**Configuration par défaut :**
- Report sur la veille : 70%
- Report sur l'avant-veille : 30%

**Interface utilisateur :**
Quand l'utilisateur marque un jour "Fermé exceptionnel" :
- Popup : "Comment reporter la production du [Jour] ?"
- Options : Veille (100%) / Répartir (70/30) / Annuler

**Règles métier :**

| Situation | Report suggéré |
|-----------|----------------|
| Fermeture Dimanche | Tout sur Samedi (+100%) |
| Fermeture Lundi | Répartir Sam (50%) + Ven (50%) |
| Fermeture milieu de semaine | Veille (+70%) + J-2 (+30%) |
| Pont/Fête (plusieurs jours) | Répartir sur semaine précédente |

### 6.10 Jours d'Ouverture

- Les jours fermés ne génèrent pas de planning
- Le poids des jours fermés est redistribué sur les jours ouverts
- La fréquentation est recalculée en conséquence

---

## 7. INTERFACE UTILISATEUR

### 7.1 Principes UI

| Principe | Application |
|----------|-------------|
| **Gros boutons** | Minimum 48px, tactile-friendly |
| **Peu de texte** | Icônes + chiffres prioritaires |
| **Couleurs métier** | Boulangerie=Bleu, Viennoiserie=Orange, Pâtisserie=Rose |
| **Validation visible** | Vert = fait, Gris = à faire |
| **2 états clairs** | Plaqué (préparé) / Cuit (terminé) |

### 7.2 Navigation Principale - Mode Employé

```
┌─────────────────────────────────────────────────────────────────┐
│  🏠 BVP PLANNING                              [👤 Employé]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ 🗑️ CASSE │  │ 📋 JOUR  │  │ ❄️ DEMAIN │  │ 📦 COMMANDE│     │
│  │          │  │          │  │          │  │          │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                 │
│  Premier écran le matin = CASSE                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.3 Navigation Principale - Mode Responsable

```
┌─────────────────────────────────────────────────────────────────┐
│  🏠 BVP PLANNING                           [👤 Responsable]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ 📥 IMPORT│  │ ⚙️ CONFIG│  │ 💰 CA    │  │ 📤 EXPORT │       │
│  │          │  │          │  │          │  │          │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                 │
│  + Accès à tous les modules Employé                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.4 Interface Production avec 2 États

```
┌─────────────────────────────────────────────────────────────────┐
│  🌅 MATIN - BOULANGERIE                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Baguette Tradition              45 unités (4 plaques)  │   │
│  │                                                         │   │
│  │  ┌──────────────────┐    ┌──────────────────┐          │   │
│  │  │   📋 PLAQUÉ      │    │   ✅ CUIT        │          │   │
│  │  │                  │    │                  │          │   │
│  │  │       ☐          │    │       ☐          │          │   │
│  │  │                  │    │                  │          │   │
│  │  │  (Préparé sur    │    │  (Sorti du four) │          │   │
│  │  │   plaque)        │    │                  │          │   │
│  │  └──────────────────┘    └──────────────────┘          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Croissant                       24 unités (2 plaques)  │   │
│  │  ⏰ Plaqué hier à 14h30                                 │   │
│  │                                                         │   │
│  │  ┌──────────────────┐    ┌──────────────────┐          │   │
│  │  │   📋 PLAQUÉ      │    │   ✅ CUIT        │          │   │
│  │  │                  │    │                  │          │   │
│  │  │       ☑️         │    │       ☐          │          │   │
│  │  │                  │    │                  │          │   │
│  │  │  ✓ Hier 14h30    │    │                  │          │   │
│  │  └──────────────────┘    └──────────────────┘          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.5 Mode Tablette vs Mode Desktop

| Mode | Caractéristiques |
|------|------------------|
| **Tablette** | Gros boutons, scroll vertical, validation tactile, 2 boutons Plaqué/Cuit |
| **Desktop** | Vue complète, tableaux détaillés, configuration |

### 7.6 Mode Impression

| Format | Usage |
|--------|-------|
| **Planning Jour** | 1 feuille A4, affiché en cuisine |
| **Planning Semaine** | Vue récap pour le responsable |
| **Liste Plaquage** | Feuille séparée pour la chambre froide |
| **Commande** | Liste à transmettre au fournisseur |

### 7.7 Export PDF Téléchargeable

**Problématique :**
`window.print()` fonctionne mal sur tablettes (iPad, Android).
Les imprimantes réseau en boulangerie sont souvent capricieuses.

**Solution : PDF téléchargeable**
Utiliser une librairie de génération PDF côté client :
- **jsPDF** : Léger, simple
- **html2pdf.js** : Convertit le HTML en PDF
- **pdfmake** : Plus puissant, templates

**Fonctionnalités attendues :**
1. Bouton "📥 Télécharger PDF" (en plus de "🖨️ Imprimer")
2. PDF nommé automatiquement : `Planning_S52_2025_CHAMAFFI.pdf`
3. Format A4 portrait ou paysage selon le contenu
4. En-tête avec logo Mousquetaires + infos magasin
5. Pied de page avec date de génération

**PDFs à générer :**
- Planning Jour (1 page par jour)
- Planning Semaine (vue synthétique)
- Fiche Commande (liste des cartons à commander)
- Rapport Animation Commerciale

---

## 8. ARCHITECTURE TECHNIQUE

### 8.1 Stack

| Composant | Technologie |
|-----------|-------------|
| **Framework** | React 18+ |
| **Build** | Vite |
| **Styling** | Tailwind CSS |
| **Icônes** | Lucide React |
| **Parsing Excel** | XLSX (SheetJS) |
| **Stockage local** | localStorage + IndexedDB |

### 8.2 Structure des Dossiers (v2)

```
bvp-planning/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.jsx
│   │   │   ├── Navigation.jsx
│   │   │   ├── ModeSwitch.jsx          # Tablette/Desktop
│   │   │   └── ProfilSwitch.jsx        # Responsable/Employé
│   │   ├── responsable/
│   │   │   ├── ImportDonnees.jsx
│   │   │   ├── SelectionProduits.jsx   # Activer/désactiver produits
│   │   │   ├── ConfigJours.jsx         # Jours d'ouverture
│   │   │   ├── PilotageCA.jsx          # Tableau de bord CA
│   │   │   ├── FichierMagasin.jsx
│   │   │   └── ConfigCommande.jsx
│   │   ├── employe/
│   │   │   ├── Casse.jsx
│   │   │   ├── PlanningJour.jsx
│   │   │   ├── PlaquageDemain.jsx
│   │   │   └── AideCommande.jsx
│   │   └── shared/
│   │       ├── ProductCard.jsx
│   │       ├── ProductionState.jsx     # Boutons Plaqué/Cuit
│   │       ├── TrancheHoraire.jsx
│   │       ├── EditProduct.jsx         # Édition dénomination, rayon, etc.
│   │       └── PrintLayout.jsx
│   ├── services/
│   │   ├── fichierMagasin.js
│   │   ├── planningCalculator.js
│   │   ├── caCalculator.js             # Calcul CA
│   │   ├── commandeCalculator.js
│   │   ├── casseService.js
│   │   ├── productionState.js          # Gestion états Plaqué/Cuit
│   │   └── potentielCalculator.js
│   ├── utils/
│   │   ├── parsers.js
│   │   ├── dateUtils.js
│   │   └── storage.js
│   ├── App.jsx
│   └── main.jsx
└── public/
```

### 8.3 Règles de Parsing des Fichiers Excel

#### Règles de détection des colonnes

Le système doit être flexible et détecter automatiquement les colonnes même si elles changent d'ordre.

**Mots-clés pour identifier les colonnes :**

| Donnée recherchée | Mots-clés acceptés |
|-------------------|-------------------|
| Code produit | ITM8, EAN, Code, Article |
| Libellé | Libellé, Désignation, Nom, Description |
| Quantité | Qté, Quantité, Qty, Nb |
| Prix vente | PV, Prix Vente, PVC, Valeur Vente |
| Prix achat | PA, Prix Achat, Valeur Achat |
| Marge | Marge, %, Val Marge |
| Date | Date, Jour |
| Heure/Tranche | Heure, Horaire, Tranche |

#### Nettoyage des données

**Libellés :**
```javascript
// Supprimer les espaces multiples
libelle = libelle.replace(/\s+/g, ' ').trim();
// Supprimer les caractères spéciaux en début/fin
libelle = libelle.replace(/^[*\-_]+|[*\-_]+$/g, '');
// Normaliser la casse (première lettre majuscule)
libelle = libelle.charAt(0).toUpperCase() + libelle.slice(1).toLowerCase();
```

**Codes ITM8 :**
```javascript
// Compléter avec des zéros à gauche si nécessaire
itm8 = itm8.toString().padStart(13, '0');
// Supprimer les espaces et tirets
itm8 = itm8.replace(/[\s\-]/g, '');
```

**Montants :**
```javascript
// Gérer virgule et point comme séparateur décimal
montant = parseFloat(montant.toString().replace(',', '.'));
```

#### Détection du magasin

Regex pour extraire les infos du header :
```javascript
// Format: "PDV: 10679 - SAS CHAMAFFI"
const regexPDV = /PDV\s*:?\s*(\d+)\s*[-–]\s*(.+?)(?:\s+Date|$)/i;
// Format: "Du 17/11/2025 Au 23/11/2025"
const regexPeriode = /Du\s*(\d{2}\/\d{2}\/\d{4})\s*Au\s*(\d{2}\/\d{2}\/\d{4})/i;
```

#### Gestion des erreurs de parsing

| Erreur | Comportement |
|--------|--------------|
| Colonne non trouvée | Afficher warning, continuer avec valeur par défaut |
| Valeur non numérique | Remplacer par 0, logger l'erreur |
| Ligne vide | Ignorer silencieusement |
| Fichier corrompu | Afficher erreur claire, proposer de réessayer |

### 8.4 Flux de Données

```
┌─────────────────────────────────────────────────────────────────┐
│  IMPORT (Responsable)                                           │
│  Excel Fréquentation + Ventes (avec "Valeur prix vente")       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  TRAITEMENT AUTOMATIQUE                                         │
│  - Parsing Excel                                                │
│  - Reconnaissance produits (ITM8)                               │
│  - Calcul potentiels (adapté au nombre de semaines)            │
│  - Calcul CA (depuis "Valeur prix vente")                      │
│  - Génération courbes fréquentation                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  CONFIGURATION (Responsable)                                    │
│  - Sélection produits actifs                                    │
│  - Jours d'ouverture                                            │
│  - Objectif progression CA                                      │
│  - Jours commande/livraison                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  FICHIER MAGASIN (.bvp.json)                                    │
│  Portable, réutilisable, archivable, pas d'expiration          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  UTILISATION QUOTIDIENNE (Employé)                              │
│  Casse → Planning Jour (Plaqué/Cuit) → Plaquage Demain → Cmd   │
└─────────────────────────────────────────────────────────────────┘
```

### 8.5 Points de Vigilance Techniques

#### Stockage des données (localStorage vs IndexedDB)

⚠️ **Ne pas utiliser localStorage seul** pour stocker les fichiers JSON et l'historique.

| Stockage | Limite | Usage recommandé |
|----------|--------|------------------|
| localStorage | 5 Mo | Préférences utilisateur uniquement |
| **IndexedDB** | 50+ Mo | Fichiers .bvp.json, historiques, archives |

**Librairies recommandées :**
- `idb` (wrapper léger)
- `dexie.js` (plus complet)

#### Performance du calcul multi-semaines

Le calcul des potentiels avec pondération sur N semaines peut être lourd
(ex: 500 produits × 52 semaines).

**Règle :** Ce calcul doit se faire **une seule fois** au moment de
l'import/chargement, pas à chaque interaction utilisateur.

```javascript
// ✅ BON : Calcul à l'import
const onFileImport = async (file) => {
  const data = await parseExcel(file);
  const potentiels = calculerTousPotentiels(data); // Une seule fois
  setAppState({ ...appState, potentiels });
};

// ❌ MAUVAIS : Calcul à chaque render
const ProduitRow = ({ produit }) => {
  const potentiel = calculerPotentiel(produit); // À chaque affichage !
  return <tr>...</tr>;
};
```

**Conseil :** Utiliser `useMemo` pour mémoriser les calculs lourds.

### 8.6 Gestion des Erreurs

#### Principes

1. **Messages clairs** : Pas de jargon technique, langage métier
2. **Actions proposées** : Toujours indiquer quoi faire
3. **Récupération** : Sauvegardes automatiques pour éviter la perte de données

#### Erreurs par Module

##### Module Import (Étape 1)

| Cas d'erreur | Message utilisateur | Action |
|--------------|---------------------|--------|
| Fichier vide | "Le fichier sélectionné est vide. Vérifiez que vous avez bien exporté les données depuis Mercalys." | Bouton "Réessayer" |
| Mauvais format | "Ce fichier n'est pas au format Excel (.xlsx). Veuillez sélectionner un fichier Excel." | Bouton "Choisir un autre fichier" |
| Colonnes manquantes | "Le fichier ne contient pas les colonnes attendues (PLU, Désignation, Quantités). Vérifiez que c'est bien un export Mercalys." | Afficher colonnes trouvées vs attendues |
| Aucun produit BVP | "Aucun produit BVP n'a été trouvé dans ce fichier. Vérifiez la période d'export." | Bouton "Réessayer" |

##### Module Configuration (Étape 3)

| Cas d'erreur | Message utilisateur | Action |
|--------------|---------------------|--------|
| Semaine passée | "La semaine sélectionnée est déjà passée. Voulez-vous quand même créer un planning ?" | Boutons "Oui" / "Choisir une autre semaine" |
| Tous jours fermés | "Vous avez fermé tous les jours de la semaine. Au moins un jour doit être ouvert." | Highlight du tableau des jours |

##### Module Pilotage CA (Étape 4)

| Cas d'erreur | Message utilisateur | Action |
|--------------|---------------------|--------|
| Aucun produit sélectionné | "Vous n'avez sélectionné aucun produit. Sélectionnez au moins un produit pour générer le planning." | Bouton "Tout sélectionner" |
| Produit sans potentiel | "X produits n'ont pas de potentiel défini. Ils seront ignorés dans le planning." | Liste des produits concernés |

##### Module Export (Étape 8)

| Cas d'erreur | Message utilisateur | Action |
|--------------|---------------------|--------|
| Échec sauvegarde | "Impossible d'enregistrer le fichier. Vérifiez que vous avez les droits d'écriture sur ce dossier." | Bouton "Choisir un autre emplacement" |
| Espace disque insuffisant | "Espace disque insuffisant pour enregistrer le fichier." | Suggestion de nettoyer ou changer d'emplacement |

#### Récupération automatique

| Mécanisme | Description |
|-----------|-------------|
| **Sauvegarde localStorage** | À chaque changement d'étape, sauvegarde de l'état courant |
| **Détection session interrompue** | Au lancement, vérifier si une session précédente existe |
| **Message de récupération** | "Une session précédente a été interrompue. Voulez-vous la reprendre ?" |
| **Durée de rétention** | 7 jours maximum, puis suppression automatique |

---

## 9. ÉVOLUTIONS FUTURES

### 9.1 Court Terme (v2.1)

- [ ] Historique des casses avec graphiques
- [ ] Suggestions automatiques basées sur la casse
- [ ] Export commande en PDF/Email
- [ ] Statistiques production (taux de complétion Plaqué/Cuit)

### 9.2 Moyen Terme (v2.5)

- [ ] Mode hors-ligne complet (PWA)
- [ ] Synchronisation multi-postes (via fichier partagé)
- [ ] Notifications rappel plaquage (14h)
- [ ] Comparaison CA réel vs objectif (si saisie des ventes)

### 9.3 Long Terme (v3.0)

- [ ] Connexion système de caisse (si API disponible)
- [ ] Prédiction météo/événements
- [ ] Multi-magasins (consolidation)
- [ ] Application mobile native

---

## CONCLUSION

### Résumé v2.0

Cette version 2.0 recentre l'application sur :

1. **La réalité du terrain** : Journée type de l'employé BVP avec 2 états (Plaqué/Cuit)
2. **La simplicité absolue** : Zéro formation, 5 minutes max
3. **La sécurité des données** : Fichier Magasin portable, pas de cloud
4. **Les vrais besoins** : Plaquage, Casse, Commande
5. **Le pilotage économique** : CA calculé automatiquement, objectifs de progression

### Changements Majeurs vs v1.x

| Aspect | v1.x | v2.0 |
|--------|------|------|
| Approche | Fonctionnalités techniques | Parcours utilisateur |
| Données | Import à chaque session | Fichier Magasin réutilisable |
| Limite semaines | 4 semaines max | Pas de limite (1 à N) |
| Casse | En fin de journée | En début de journée |
| Plaquage | Non géré | Module dédié (J+1) |
| Commande | Non géré | Module Aide à la Commande |
| Production | 1 état (Fait) | 2 états (Plaqué / Cuit) |
| Profils | Un seul | Responsable / Employé |
| CA | Non géré | Calculé auto + Objectifs progression |
| Droits édition | Non définis | Partagés (dénomination, rayon, PLU, etc.) |

---

**Document rédigé le** : 28 novembre 2025
**Version** : 2.4
**Dernière mise à jour** : 17 décembre 2025
**Statut** : Validé - Prêt pour transmission à Claude Code

---

## HISTORIQUE DES VERSIONS

### Version 2.4 (17 décembre 2025)

**Améliorations suite à revue IA (Genspark + ChatGPT) :**
- **Section 5.0 - Versioning des Fichiers** : schemaVersion obligatoire, règles de compatibilité, stratégie de migration
- **Section 8.6 - Gestion des Erreurs** : Messages utilisateur clairs par module, récupération automatique
- **Section 6.3 - Élasticité enrichie** : Note explicative, tableau exemple, limites du modèle, plafond à 2.0
- **Annexe A - NFR** : Performances (seuils), navigateurs supportés, limites techniques, RGPD
- **Annexe B - Critères d'Acceptation** : Checklist par module pour validation
- **Annexe C - Glossaire** : 20 termes métier définis

### Version 2.3 (17 décembre 2025)

**Fusion des éléments techniques V1 :**
- Section 1.5 Périmètre Technique (Inclus/Exclu)
- Section 6.1 enrichie : 4 modes de calcul, pondération multi-semaines, indicateurs de fiabilité
- Modèle Produit et FrequentationData enrichis

### Version 2.2 (17 décembre 2025)

**Nouvelles sections ajoutées :**
- **Gestion des Conflits de Données** : Stratégie de fusion PC ↔ Tablette lors du chargement de fichier
- **Produits Sans Historique** : Mode "dégradé" avec règles de calcul de repli et indicateur de fiabilité
- **Workflow NEGOCE** : Règles spécifiques pour les produits sans cuisson (donuts, biscuiterie, etc.)
- **Export PDF Téléchargeable** : Alternative à window.print() pour tablettes
- **Règles de Parsing Excel** : Documentation technique du parsing (mots-clés, nettoyage, regex)
- **Pondération Historique** : 3 modes de pondération (Standard/Saisonnier/Forte Promo)
- **Reports de Production** : Gestion des fermetures exceptionnelles avec redistribution

### Version 2.1 (16 décembre 2025)

**Wizard Responsable étendu à 8 étapes :**
- **Étape 2 - Analyse Semaine Passée** : Comparaison Prévu vs Réalisé avec suggestions automatiques
- **Étape 5 - Animation Commerciale** : Gestion des promotions et produits exceptionnels avec calcul d'élasticité
- **Étape 6 - Commande** : Configuration commandes et calcul des besoins
- **Étape 7 - Planning Détaillé** : Prévisualisation avec alertes capacité
- **Étape 8 - Archivage & Export** : Génération fichier équipe et archive

**Nouvelles fonctionnalités :**
- **Famille NEGOCE** ajoutée aux classifications (produits sans cuisson, achetés/revendus)
- **Fichier archive .bvp-archive.json** : Structure pour comparaison Prévu vs Réalisé
- **Formule d'élasticité** : Calcul automatique de l'impact des promotions sur les volumes
- **Matrice des limites de progression** : S (Sans limite), F (+20% max), f (+10% max) par famille × jour
- **Mode de répartition par famille** : Tranches horaires ou Journalier
- **Base de calcul configurable** : PDV (fréquentation globale) ou BVP (fréquentation rayon)

**Planning Équipe (PlanningJour) :**
- Mode PDV avec 3 lignes par produit (Préco/Histo/%)
- Mode Plaques avec indication "Pl." et sous-totaux par programme de cuisson
- historiqueHebdo inclus dans le fichier .bvp.json pour affichage Histo

### Version 2.0 (28 novembre 2025)

**Refonte complète de l'architecture :**
- Séparation des profils Responsable / Employé
- Wizard de configuration pour le Responsable
- Fichier Magasin (.bvp.json) portable et réutilisable
- Module Planning Jour avec validation Plaqué / Cuit
- Module Casse en début de journée
- Module Plaquage Demain (J+1)
- Module Aide à la Commande
- Pilotage CA avec objectifs de progression

---

## ANNEXES

### Annexe A : Exigences Non-Fonctionnelles (NFR)

#### Performances

| Opération | Seuil acceptable | Seuil optimal |
|-----------|------------------|---------------|
| Parsing fichier Excel (< 500 produits) | < 3 secondes | < 1 seconde |
| Calcul planning complet | < 2 secondes | < 500ms |
| Export fichier .bvp.json | < 1 seconde | < 200ms |
| Chargement initial application | < 5 secondes | < 2 secondes |
| Réponse interaction utilisateur | < 300ms | < 100ms |

#### Navigateurs supportés

| Navigateur | Version minimum | Statut |
|------------|-----------------|--------|
| Chrome | 90+ | ✅ Recommandé |
| Firefox | 88+ | ✅ Supporté |
| Safari | 14+ | ✅ Supporté |
| Edge | 90+ | ✅ Supporté |
| Internet Explorer | - | ❌ Non supporté |

#### Limites techniques

| Ressource | Limite | Justification |
|-----------|--------|---------------|
| localStorage | 5 MB max | Sauvegarde session uniquement |
| IndexedDB | 50+ MB | Fichiers .bvp.json et archives |
| Taille fichier Excel import | 10 MB max | Performance parsing |
| Nombre de produits | 1000 max recommandé | Performance UI |
| Historique archive | 52 semaines (1 an) | Espace disque raisonnable |

#### Sécurité et RGPD

| Aspect | Description |
|--------|-------------|
| **Traitement local** | Aucune donnée n'est envoyée à un serveur externe |
| **Pas de cookies tiers** | Aucun tracking, aucune publicité |
| **Données sensibles** | Les fichiers .bvp.json contiennent des données commerciales → ne pas partager publiquement |
| **Droit à l'effacement** | L'utilisateur peut supprimer ses données à tout moment (localStorage + fichiers) |
| **Pas d'authentification** | Pas de collecte de données personnelles |

---

### Annexe B : Critères d'Acceptation par Module

#### Module Import (Étape 1)

- [ ] Le fichier Excel est parsé en moins de 3 secondes
- [ ] Le nom du magasin est extrait automatiquement
- [ ] Les 3 semaines (S-1, S-2, AS-1) sont détectées si présentes
- [ ] Les produits sans ventes sont ignorés
- [ ] Un message d'erreur clair s'affiche si le fichier est invalide
- [ ] Le type de pondération (Standard/Saisonnier/Forte Promo) est sélectionnable

#### Module Configuration Horaires (Étape 3)

- [ ] La semaine courante +1 est proposée par défaut
- [ ] Tous les jours sont ouverts par défaut
- [ ] Le clic sur une demi-journée change son état (Ouvert ↔ Fermé)
- [ ] Le clic sur le nom du jour change toute la journée
- [ ] Les dates exactes de la semaine s'affichent

#### Module Pilotage CA (Étape 4)

- [ ] Le CA historique vs prévisionnel s'affiche
- [ ] Les produits sont triés par Moy.Hebdo décroissant par défaut
- [ ] Les produits désactivés restent visibles mais grisés
- [ ] Le Mode Terrain permet l'édition inline
- [ ] La sélection/désélection est instantanée (< 100ms)
- [ ] La matrice des limites de progression est configurable

#### Module Export (Étape 8)

- [ ] Le fichier .bvp.json est généré avec `schemaVersion: "2.0"`
- [ ] L'utilisateur peut choisir l'emplacement de sauvegarde
- [ ] Le fichier archive .bvp-archive.json est proposé si données Réalisé disponibles
- [ ] Un message de confirmation s'affiche après sauvegarde

#### Module Employé - Casse

- [ ] La saisie se fait produit par produit
- [ ] Le compteur de casse s'incrémente avec + / -
- [ ] La valeur en € est calculée automatiquement
- [ ] La validation enregistre les données

#### Module Employé - Planning Jour

- [ ] Les produits sont groupés par tranche horaire et famille
- [ ] Les boutons Plaqué / Cuit sont cliquables
- [ ] L'état visuel change immédiatement au clic
- [ ] Le Mode Plaques affiche le nombre de plaques

#### Module Employé - Plaquage Demain

- [ ] Seuls les produits à plaquage "long" sont affichés
- [ ] Les produits NEGOCE ne sont pas affichés
- [ ] L'heure de plaquage recommandée est indiquée (14h)

---

### Annexe C : Glossaire

| Terme | Définition |
|-------|------------|
| **BVP** | Boulangerie, Viennoiserie, Pâtisserie - les trois rayons principaux |
| **PDV** | Point De Vente - le magasin physique |
| **ITM8** | Code produit à 8 chiffres du référentiel Mousquetaires |
| **PLU** | Price Look-Up code - code utilisé en caisse pour identifier un produit |
| **EAN** | European Article Number - code-barres à 13 chiffres |
| **Potentiel** | Quantité maximale vendable par semaine, calculée depuis l'historique |
| **Élasticité** | Coefficient d'ajustement des quantités lors d'une promotion |
| **Fichier Magasin** | Fichier .bvp.json contenant la configuration complète d'un magasin |
| **Fichier Archive** | Fichier .bvp-archive.json contenant les données Prévu vs Réalisé |
| **Casse** | Produits invendus/jetés en fin de journée |
| **Plaquage** | Préparation des produits sur plaques pour cuisson |
| **Tranche horaire** | Période de la journée (avant12h, 12h-14h, 14h-16h, après16h) |
| **Buffer** | Marge de sécurité (10% par défaut) ajoutée aux quantités calculées |
| **Mercalys** | Système de caisse des magasins Intermarché |
| **S-1** | Semaine précédente (semaine -1) |
| **AS-1** | Année antérieure, même semaine (pour saisonnalité) |
| **S-2** | Il y a deux semaines (semaine -2) |
| **NEGOCE** | Famille de produits achetés et revendus sans transformation |
| **Score de confiance** | Indicateur de fiabilité (0-100) basé sur l'historique des données |
