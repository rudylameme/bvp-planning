# Guide Utilisateur - BVP Planning V5
## Application de planification pour Boulangerie-Viennoiserie-Pâtisserie

---

# Table des matières

1. [Introduction](#introduction)
2. [Les deux interfaces](#les-deux-interfaces)
3. [Guide Manager](#guide-manager)
4. [Guide Équipe](#guide-équipe)
5. [Impression des fiches](#impression-des-fiches)
6. [Questions fréquentes](#questions-fréquentes)

---

# Introduction

## Qu'est-ce que BVP Planning ?

BVP Planning est une application web qui aide les équipes BVP (Boulangerie-Viennoiserie-Pâtisserie) des magasins Intermarché à :

- Planifier les quantités à cuire chaque jour
- Répartir la production sur les différents créneaux horaires
- Gérer l'inventaire en chambre froide
- Préparer les commandes fournisseur
- Imprimer des fiches de travail pour le laboratoire

## Les deux profils utilisateurs

| Profil | Qui ? | Rôle | URL |
|--------|-------|------|-----|
| **Manager** | Responsable rayon BVP | Configure la semaine, pilote le CA | dist-manager.vercel.app |
| **Équipe** | Boulangers, équipiers | Consulte le planning, fait l'inventaire | dist-equipe.vercel.app |

---

# Les deux interfaces

## Interface Manager (100% de l'application)

L'interface Manager donne accès à :
- L'écran de choix (Manager ou Équipe)
- Le Wizard de configuration en 7 étapes
- Tous les modules Équipe

**Utilisée par** : Le responsable BVP, généralement 1 fois par semaine pour préparer la semaine suivante.

## Interface Équipe (accès simplifié)

L'interface Équipe donne accès uniquement à :
- Planning du jour
- Inventaire
- Commande

**Utilisée par** : Les équipiers, tous les jours pour consulter ce qu'ils doivent produire.

**Pourquoi un accès limité ?**
- Évite les modifications accidentelles de la configuration
- Interface plus simple et rapide à utiliser
- Adapté à une tablette dans le laboratoire

---

# Guide Manager

## Accès

Ouvrez votre navigateur et allez sur :
```
https://dist-manager.vercel.app
```

## Écran d'accueil

À l'ouverture, vous voyez deux choix :

```
┌─────────────────┐    ┌─────────────────┐
│    MANAGER      │    │     ÉQUIPE      │
│                 │    │                 │
│ • Piloter le CA │    │ • Planning jour │
│ • Configurer    │    │ • Inventaire    │
│ • Communiquer   │    │ • Commande      │
│                 │    │                 │
│   [Accéder →]   │    │   [Accéder →]   │
└─────────────────┘    └─────────────────┘
```

Cliquez sur **"Accéder"** sous MANAGER pour commencer la configuration.

---

## Étape 1 : Import des données

### Objectif
Charger vos fichiers Excel de données (ventes, fréquentation).

### Comment faire

1. Cliquez sur **"1. Dossier DATA_perso"**
2. Sélectionnez votre dossier contenant les fichiers Excel
3. L'application détecte automatiquement :
   - Fichiers de fréquentation
   - Fichiers de ventes
   - Fichiers de casse

### Fichiers attendus

| Type | Format | Exemple |
|------|--------|---------|
| Fréquentation | Excel (.xlsx) | frequentation_S04.xlsx |
| Ventes | Excel (.xlsx) | ventes_BVP_S04.xlsx |
| Casse | Excel (.xlsx) | casse_S04.xlsx |

### Indicateurs de succès

- ✅ Vert = Fichier chargé correctement
- ⚠️ Orange = Fichier partiel
- ❌ Rouge = Erreur de format

Cliquez sur **"Valider et continuer"** une fois tous les fichiers chargés.

---

## Étape 2 : Diagnostic

### Objectif
Comparer vos performances avec le secteur.

### Ce que vous voyez

```
┌────────────────────────────────────────────┐
│  DIAGNOSTIC - Benchmark Secteur            │
│                                            │
│  Votre CA BVP : 45 000 €                   │
│  Moyenne secteur : 52 000 €                │
│  Écart : -13%                              │
│                                            │
│  Parts de marché :                         │
│  • Boulangerie : 45% (secteur: 40%) ✅     │
│  • Viennoiserie : 30% (secteur: 35%) ⚠️   │
│  • Pâtisserie : 25% (secteur: 25%) ✅      │
└────────────────────────────────────────────┘
```

### Actions possibles

- Consulter les graphiques de comparaison
- Identifier les points d'amélioration
- Prendre des notes pour ajuster votre stratégie

---

## Étape 3 : Objectif CA

### Objectif
Définir votre objectif de chiffre d'affaires pour la semaine.

### Comment faire

1. Consultez le CA des semaines précédentes
2. Sélectionnez la **semaine cible** (ex: S05)
3. Entrez votre **objectif CA** (ex: 48 000 €)
4. L'application calcule automatiquement la répartition par jour

### Conseil

Tenez compte des événements de la semaine :
- Jour férié ?
- Opération commerciale ?
- Météo prévue ?

---

## Étape 4 : Import Ventes/Casse

### Objectif
Analyser votre gamme de produits.

### Ce que vous voyez

Liste de tous vos produits avec :
- Ventes moyennes
- Taux de casse
- Marge
- Statut (actif/inactif)

### Actions possibles

- Activer/désactiver des produits
- Modifier les quantités prévisionnelles
- Ajuster les familles de produits

---

## Étape 5 : Configuration

### Objectif
Paramétrer les spécificités de la semaine.

### 5.1 Jours de fermeture

```
┌────────────────────────────────────────────┐
│  Jours d'ouverture                         │
│                                            │
│  ☑️ Lundi    ☑️ Mardi    ☑️ Mercredi      │
│  ☑️ Jeudi    ☑️ Vendredi ☑️ Samedi        │
│  ☐ Dimanche                                │
└────────────────────────────────────────────┘
```

Décochez les jours de fermeture.

### 5.2 Créneaux horaires

Configurez les tranches de cuisson :

| Créneau | Horaire | Activé |
|---------|---------|--------|
| Avant 9h | 6h-9h | ☑️ |
| 9h-12h | 9h-12h | ☑️ |
| 12h-14h | 12h-14h | ☑️ |
| 14h-16h | 14h-16h | ☑️ |
| Soir | 16h-19h | ☑️ |

### 5.3 Opérations commerciales

Ajoutez les opérations prévues :
- Promotion baguette tradition
- Animation viennoiserie
- etc.

---

## Étape 6 : Pilotage CA

### Objectif
Ajuster finement les quantités par produit et par jour.

### Interface

```
┌─────────────────────────────────────────────────────────┐
│  BOULANGERIE                                            │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Produit         │ Lun │ Mar │ Mer │ Jeu │ Ven │ Sam ││
│  │ BAGUETTE 250G   │  45 │  42 │  48 │  50 │  55 │  65 ││
│  │ PAIN CÉRÉALES   │  10 │  10 │  12 │  10 │  12 │  15 ││
│  │ PAIN COMPLET    │   8 │   8 │  10 │   8 │  10 │  12 ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### Actions possibles

- Cliquer sur une cellule pour modifier la quantité
- Utiliser les boutons +/- pour ajuster
- Voir le total par jour en bas

### Modes d'affichage

- **Unités** : Quantités en nombre de produits
- **Plaques** : Quantités en nombre de plaques (pour la planification four)

---

## Étape 7 : Communication

### Objectif
Exporter le planning pour l'équipe.

### Comment faire

1. Vérifiez le récapitulatif de la semaine
2. Cliquez sur **"Exporter pour l'équipe"**
3. Un fichier `.bvp.json` est téléchargé

### Contenu du fichier exporté

Le fichier contient :
- Configuration du magasin
- Planning de la semaine
- Quantités par produit et par créneau
- Seuils d'inventaire

### Comment transmettre à l'équipe

Options :
1. **Clé USB** : Copier le fichier sur une clé
2. **Cloud** : Déposer sur Google Drive, Dropbox, etc.
3. **Email** : Envoyer en pièce jointe

---

# Guide Équipe

## Accès

Ouvrez votre navigateur et allez sur :
```
https://dist-equipe.vercel.app
```

Vous arrivez directement sur l'espace Équipe (pas d'écran de choix).

---

## Charger la configuration

### Première utilisation de la semaine

1. Cliquez sur **"Charger configuration"** (si affiché)
2. Sélectionnez le fichier `.bvp.json` fourni par le manager
3. La configuration de la semaine s'affiche

### Les semaines suivantes

La configuration reste en mémoire dans le navigateur. Rechargez uniquement quand le manager vous donne un nouveau fichier.

---

## Module 1 : Planning du Jour

### Accès

Cliquez sur **"Planning du jour"** dans le menu.

### Interface

```
┌─────────────────────────────────────────────────────────┐
│  Planning du Jour                                       │
│  📅 Mardi 4 février (S4)                               │
│                                                         │
│  [Lun] [MAR] [Mer] [Jeu] [Ven] [Sam] [Dim]            │
│         ↑ jour sélectionné (en rouge)                  │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐
│  │ 🥖 BOULANGERIE                          88 produits │
│  ├─────────────────────────────────────────────────────┤
│  │               │Av.9h│9-12h│12-14│14-16│Soir│ TOTAL │
│  │ BAGUETTE 250G │  2  │ 11  │  9  │  7  │ 16 │  45   │
│  │ PAIN CÉRÉALES │  6  │  2  │  0  │  0  │  2 │  10   │
│  └─────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────┘
```

### Comment lire le tableau

- **Colonnes créneaux** : Quantité à cuire pour chaque tranche horaire
- **Colonne TOTAL** : Total de la journée
- **Dernière colonne en jaune** : Dernière cuisson (ajustable selon stock)

### Changer de jour

Cliquez sur les boutons des jours (Lun, Mar, Mer...) pour voir le planning d'un autre jour.

### Options d'affichage

| Bouton | Effet |
|--------|-------|
| **Simple** | Affiche uniquement les quantités préconisées |
| **Détail** | Affiche Préco / Histo / % |
| **Unités** | Quantités en nombre de produits |
| **Plaques** | Quantités en nombre de plaques |

### Filtres

- **Tri Famille** : Groupe par BOULANGERIE, VIENNOISERIE, PÂTISSERIE
- **Tri Cuisson** : Groupe par programme de cuisson

---

## Module 2 : Inventaire

### Accès

Cliquez sur **"Inventaire"** dans le menu.

### Objectif

Faire l'inventaire de la chambre froide pour vérifier les stocks.

### Interface

```
┌─────────────────────────────────────────────────────────┐
│  Inventaire Chambre Froide                              │
│                                                         │
│  Famille : [BOULANGERIE ▼]                             │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐
│  │ Programme: Tradition                                 │
│  ├─────────────────────────────────────────────────────┤
│  │ Produit          │ Stock │ Seuil │ État            │
│  │ BAGUETTE 250G    │ [12]  │  20   │ 🟡 À surveiller │
│  │ PAIN PARISIEN    │ [45]  │  30   │ 🟢 OK          │
│  │ BAGUETTE CAMPAGN │ [ 5]  │  15   │ 🔴 Critique    │
│  └─────────────────────────────────────────────────────┘
│                                                         │
│  [🖨️ Imprimer fiche inventaire]                        │
└─────────────────────────────────────────────────────────┘
```

### Comment faire l'inventaire

1. Allez dans la chambre froide avec une tablette ou le téléphone
2. Pour chaque produit, comptez les unités en stock
3. Entrez la quantité dans la case **Stock**
4. L'état se met à jour automatiquement :
   - 🟢 **OK** : Stock suffisant
   - 🟡 **À surveiller** : Stock bas
   - 🔴 **Critique** : Rupture imminente

### Imprimer la fiche

Cliquez sur **"Imprimer fiche inventaire"** pour avoir une fiche papier à remplir dans la chambre froide.

---

## Module 3 : Commande

### Accès

Cliquez sur **"Commande"** dans le menu.

### Objectif

Préparer la commande fournisseur basée sur les besoins de la semaine.

### Interface

```
┌─────────────────────────────────────────────────────────┐
│  Commande Fournisseur                                   │
│                                                         │
│  Prochaine livraison : Jeudi 6 février                 │
│  Jours couverts : Ven, Sam, Dim, Lun                   │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐
│  │ Produit          │ Stock │ Besoin │ À commander    │
│  │ BAGUETTE 250G    │  12   │  180   │     168        │
│  │ PAIN CÉRÉALES    │  45   │   60   │      15        │
│  │ CROISSANT        │  20   │  120   │     100        │
│  └─────────────────────────────────────────────────────┘
│                                                         │
│  [📄 Exporter commande]                                │
└─────────────────────────────────────────────────────────┘
```

### Calcul automatique

```
À commander = Besoin période - Stock actuel
```

### Modifier une quantité

Cliquez sur la cellule **"À commander"** pour ajuster manuellement si besoin.

### Exporter

Cliquez sur **"Exporter commande"** pour générer un fichier à envoyer au fournisseur.

---

# Impression des fiches

## Fiche Planning du Jour

### Comment imprimer

1. Allez dans **Planning du jour**
2. Sélectionnez le jour voulu
3. Cliquez sur le bouton vert **"Fiche"**

### Contenu de la fiche

```
┌─────────────────────────────────────────────────────────────────┐
│  Planning Mardi - S4                                            │
│  CHASSIEU | 04/02/2026                                         │
├─────────────────────────────────────────────────────────────────┤
│ Rayon │ Prog │ PLU │ Article    │9h│12h│14h│16h│Soir│Stock│Cuire│
├───────┼──────┼─────┼────────────┼──┼───┼───┼───┼────┼─────┼─────┤
│ BOUL  │ Trad │ 123 │ BAGUETTE   │ 2│ 11│  9│  7│ 16 │     │     │
│ BOUL  │ Trad │ 124 │ PAIN CER   │ 6│  2│  0│  0│  2 │     │     │
└─────────────────────────────────────────────────────────────────┘

📌 Dernière cuisson : À cuire = Préco (jaune) - Stock rayon
```

### Colonnes à remplir à la main

- **Stock** : Stock en rayon avant dernière cuisson
- **Cuire** : Quantité à cuire = Préco - Stock
- **Perte** : Invendus en fin de journée

### La règle de la dernière cuisson

```
Si Stock rayon ≥ Préco → Ne pas cuire
Si Stock rayon < Préco → Cuire la différence
```

**Exemple :**
- Préco dernière cuisson : 16 baguettes
- Stock en rayon à 16h : 10 baguettes
- À cuire : 16 - 10 = **6 baguettes**

---

## Fiche Semaine Complète

### Comment imprimer

1. Allez dans **Planning du jour**
2. Cliquez sur le bouton bordeaux **"Semaine"**

### Contenu

7 pages, une pour chaque jour de la semaine (Lundi à Dimanche).

Pratique pour afficher dans le laboratoire le planning de toute la semaine.

---

## Fiche Inventaire

### Comment imprimer

1. Allez dans **Inventaire**
2. Sélectionnez la famille (ou toutes)
3. Cliquez sur **"Imprimer fiche inventaire"**

### Contenu

Liste des produits avec colonnes :
- Code PLU
- Libellé produit
- Seuil minimum
- Case vide pour noter le stock compté

---

# Questions fréquentes

## Q: Les données sont-elles sauvegardées ?

**R:** Oui, les données sont stockées dans le navigateur (localStorage). Elles restent tant que vous ne videz pas le cache du navigateur.

## Q: Puis-je utiliser l'application sur tablette ?

**R:** Oui ! L'application est responsive et fonctionne sur :
- Ordinateur
- Tablette
- Smartphone

La tablette est idéale pour l'inventaire en chambre froide.

## Q: Comment partager la configuration avec l'équipe ?

**R:** Le manager exporte un fichier `.bvp.json` depuis l'étape 7, puis le transmet à l'équipe (USB, cloud, email). L'équipe charge ce fichier dans son interface.

## Q: Que faire si les quantités sont fausses ?

**R:**
1. Vérifiez que le bon fichier de configuration est chargé
2. Demandez au manager de vérifier les paramètres
3. Le manager peut ajuster et réexporter le fichier

## Q: Puis-je modifier les quantités côté Équipe ?

**R:** Non, l'interface Équipe est en lecture seule. Seul le manager peut modifier la configuration. C'est voulu pour éviter les erreurs.

## Q: L'application fonctionne-t-elle hors ligne ?

**R:** Partiellement. Une fois la page chargée et la configuration importée, vous pouvez consulter le planning sans connexion. Mais pour charger un nouveau fichier, il faut être connecté.

---

# Support

En cas de problème :
1. Rafraîchissez la page (F5)
2. Videz le cache si les données semblent corrompues
3. Rechargez le fichier de configuration
4. Contactez le responsable BVP

---

*BVP Planning V5.0 - Groupement des Mousquetaires*
*Les données restent sur votre ordinateur*
