# CAHIER DES CHARGES - APPLICATION BVP PLANNING

## TABLE DES MATIÈRES

1. [Présentation Générale](#1-présentation-générale)
2. [Objectifs et Périmètre](#2-objectifs-et-périmètre)
3. [Architecture Technique](#3-architecture-technique)
4. [Modèles de Données](#4-modèles-de-données)
5. [Flux de Traitement](#5-flux-de-traitement)
6. [Règles Métier](#6-règles-métier)
7. [Fonctionnalités Détaillées](#7-fonctionnalités-détaillées)
8. [Interface Utilisateur](#8-interface-utilisateur)
9. [Import/Export](#9-importexport)
10. [Performances et Sécurité](#10-performances-et-sécurité)
11. [Évolutions Futures](#11-évolutions-futures)

---

## 1. PRÉSENTATION GÉNÉRALE

### 1.1 Description

**BVP Planning** est une application web de gestion de la production et du planning pour les entreprises spécialisées en **Boulangerie, Viennoiserie et Pâtisserie (BVP)**.

### 1.2 Finalité

L'application permet de :
- ✅ Analyser les **ventes historiques** des produits
- ✅ Calculer les **potentiels de production** hebdomadaires
- ✅ Générer des **plannings optimisés** basés sur la fréquentation réelle des magasins
- ✅ **Personnaliser** les paramètres de production (rayons, programmes de cuisson, potentiels)
- ✅ **Exporter et imprimer** les plannings de production

### 1.3 Stack Technologique

| Composant | Technologie |
|-----------|-------------|
| **Framework** | React 18+ |
| **Build Tool** | Vite |
| **Styling** | Tailwind CSS |
| **Icônes** | Lucide React |
| **Parsing Excel** | XLSX (SheetJS) |
| **Architecture** | Composants fonctionnels avec Hooks |

### 1.4 Type d'Application

- **SPA** (Single Page Application)
- **Client-side** uniquement (pas de backend)
- **Processing local** (aucune donnée envoyée à un serveur)

---

## 2. OBJECTIFS ET PÉRIMÈTRE

### 2.1 Objectifs Fonctionnels

1. **Simplifier la planification** : Automatiser le calcul des quantités à produire
2. **Optimiser la production** : Adapter les quantités à la fréquentation réelle
3. **Réduire le gaspillage** : Prévoir juste nécessaire avec buffer contrôlé (10%)
4. **Gagner du temps** : Génération automatique vs calculs manuels
5. **Flexibilité** : Personnalisation complète des paramètres

### 2.2 Utilisateurs Cibles

- **Responsables de production** (boulangeries, pâtisseries)
- **Gérants de magasin** (points de vente BVP)
- **Équipes de planification** (groupes/franchises)

### 2.3 Périmètre

#### ✅ Inclus
- Import données ventes et fréquentation
- Reconnaissance automatique produits (ITM8)
- Calcul potentiels hebdomadaires
- Génération planning hebdomadaire avec répartition horaire
- Personnalisation complète (rayons, programmes, potentiels)
- Export planning (HTML, PDF, impression)
- Sauvegarde/restauration configuration produits (CSV)

#### ❌ Exclu
- Gestion des stocks en temps réel
- Synchronisation multi-utilisateurs
- Base de données persistante
- Authentification/autorisation
- Application mobile native
- Suivi des coûts/marges

---

## 3. ARCHITECTURE TECHNIQUE

### 3.1 Structure des Dossiers

```
bvp-planning/
├── src/
│   ├── components/          # Composants React
│   │   ├── EtapeUpload.jsx
│   │   ├── EtapePersonnalisation.jsx
│   │   ├── EtapeConfigurationSemaine.jsx
│   │   ├── EtapePlanning.jsx
│   │   ├── TableauProduits.jsx
│   │   ├── TableauProduitsGroupes.jsx
│   │   ├── ImpressionPanel.jsx
│   │   ├── AttributionManuelle.jsx
│   │   └── StatistiquesPanel.jsx
│   ├── services/            # Logique métier
│   │   ├── planningCalculator.js
│   │   ├── referentielITM8.js
│   │   └── potentielCalculator.js
│   ├── utils/               # Utilitaires
│   │   ├── parsers.js
│   │   ├── classification.js
│   │   ├── dateUtils.js
│   │   └── conversionUtils.js
│   ├── App.jsx              # Composant racine
│   └── main.jsx             # Point d'entrée
├── Data/
│   └── liste des produits BVP treville.xlsx  # Référentiel ITM8
└── public/
```

### 3.2 Composants Principaux

#### **App.jsx** - Orchestrateur Global
**Responsabilités** :
- Gestion de l'état global de l'application
- Navigation entre les 3 étapes (upload, personnalisation, planning)
- Coordination des composants enfants
- Gestion des données (fréquentation, ventes, produits, planning)

**États React gérés** :
```javascript
etape                 // 'upload' | 'personnalisation' | 'configsemaine' | 'planning'
frequentationData     // Données de fréquentation pondérées
ventesData            // Historique des ventes
produits              // Array des produits avec attributs
planning              // Planning généré
sortType              // Type de tri actif
pdvInfo               // Informations point de vente
ponderationType       // 'standard' | 'saisonnier' | 'fortePromo'
referentielCharge     // Boolean (référentiel ITM8 chargé)
configSemaine         // Configuration semaine (numéro, année, fermetures)
```

#### **EtapeUpload.jsx** - Import des Données
**Fonctionnalités** :
- Sélection du type de pondération (3 choix)
- Upload fichier fréquentation (Excel/CSV)
- Upload fichier ventes (Excel/CSV)
- Validation et feedback utilisateur

#### **EtapePersonnalisation.jsx** - Configuration Produits
**Fonctionnalités** :
- Deux modes d'affichage : **Groupé** (par famille) ou **Liste** (tableau)
- Édition inline : libellés, rayons, programmes, potentiels
- Actions batch : sélection multiple, définir potentiel, activer/désactiver
- Calcul automatique potentiels (bouton 🤖)
- Import/Export configuration (CSV)
- Attribution manuelle pour produits non reconnus

#### **EtapeConfigurationSemaine.jsx** - Gestion du Temps
**Fonctionnalités** :
- Sélection de la semaine et de l'année
- Définition de la fermeture hebdomadaire (ex: tous les lundis)
- Gestion des fermetures exceptionnelles (jours fériés)
- Configuration des reports de production (ex: reporter 50% sur la veille)

#### **EtapePlanning.jsx** - Visualisation Planning
**Fonctionnalités** :
- Vue hebdomadaire : 7 cartes jours avec totaux
- Vue détaillée jour : tableaux rayon → programme → produits
- Colonnes horaires : Matin (9h-12h), Midi (12h-16h), Soir (16h-23h)
- Boutons : Personnaliser, Statistiques, Imprimer

#### **ImpressionPanel.jsx** - Export
**Fonctionnalités** :
- Prévisualisation HTML responsive
- Export planning jour ou hebdomadaire
- Boutons : Imprimer (Cmd/Ctrl+P), PDF, Fermer

### 3.3 Services Métier

#### **planningCalculator.js**
**Fonction principale** : `calculerPlanning(frequentationData, produits)`

**Algorithme** :
1. Filtrer produits actifs avec potentiel > 0
2. Classifier par rayon → programme de cuisson
3. Pour chaque jour :
   - Calculer quantité hebdo : `qte_hebdo = ceil(potentiel × 1.1)` (buffer 10%)
   - Appliquer poids jour : `qte_jour = ceil(qte_hebdo × poids_jour)`
   - Répartir horaires : `qte_tranche = ceil(qte_jour × poids_tranche)`
4. Retourner structure planning complète

#### **referentielITM8.js**
**Responsabilité** : Gestion du référentiel produits ITM8

**Données gérées** :
- Mapping ITM8 → Produit (code, libellé, rayon, programme)
- Liste des rayons disponibles
- Liste des programmes de cuisson
- Métadonnées : poids, unités par vente, unités par plaque

**Fonctions clés** :
- `chargerReferentielITM8(filePath)` : Charge Excel et construit cache
- `rechercherParITM8(code)` : Retourne infos produit ou null
- `getListeRayons()` : Array des rayons
- `getListeProgrammes()` : Array des programmes

#### **potentielCalculator.js**
**Responsabilité** : Calcul des potentiels hebdomadaires

**Formule principale** :
```
Potentiel = Vente MAX ÷ Poids du jour de cette vente
```

**Fonctions** :
- `calculerPotentielDepuisVenteMax(venteMax, dateVenteMax, frequentationData)`
- `trouverVenteMax(ventesParJour)` : Identifie vente maximale
- `calculerPotentielsPourTous(produits, frequentationData)` : Application batch

### 3.4 Utilitaires

#### **parsers.js**
- `parseVentesExcel(arrayBuffer)` : Parse fichier ventes
- `parseFrequentationExcel(arrayBuffer, typePonderation)` : Parse fréquentation
- `parseCSV(text)` : Parse fichiers CSV (import config)

#### **classification.js**
- `classerProduit(libelle)` : Classification par mots-clés (fallback si pas ITM8)

#### **dateUtils.js**
- `getJourSemaine(dateStr)` : Conversion date → jour semaine français
- `getNextWeekDates()` : Dates lundi/dimanche prochains

#### **conversionUtils.js**
- `convertirEnPlaques(ventes, unitesParVente, unitesParPlaque)` : Conversion unités → plaques

---

## 4. MODÈLES DE DONNÉES

### 4.1 Produit

```javascript
{
  id: number,                    // ID unique auto-incrémenté
  libelle: string,               // Libellé original (données ventes)
  libellePersonnalise: string,   // Libellé éditable par utilisateur
  itm8: number | null,           // Code ITM8 (null si absent)
  rayon: string | null,          // Ex: "BOULANGERIE", "VIENNOISERIE" (MODIFIABLE par l'utilisateur)
  programme: string | null,      // Ex: "Cuisson Baguette", "Four Principal" (MODIFIABLE)
  famille: string,               // BOULANGERIE|VIENNOISERIE|PATISSERIE|SNACKING|AUTRE (masqué UI, utilisé en interne)
  ventesParJour: {               // Historique ventes
    "2025-01-15": 12,
    "2025-01-16": 8,
    // ...
  },
  totalVentes: number,           // Somme des ventes
  potentielHebdo: number,        // Potentiel hebdomadaire (unités/semaine) (MODIFIABLE)
  unitesParVente: number,        // Ex: Constance x3+1 = 4 unités
  unitesParPlaque: number,       // Nombre unités par plaque de cuisson (MODIFIABLE par l'utilisateur)
                                 // Si 0 = produit sans cuisson (affiche "NC" dans planning)
  actif: boolean,                // Inclus dans le planning ?
  custom: boolean,               // Créé manuellement (pas de ventes) ?
  reconnu: boolean               // Reconnu par ITM8 ou attribution manuelle ?
}
```

**Notes importantes :**
- `rayon` : Toujours défini (soit du référentiel ITM8, soit de la classification par mots-clés si non reconnu)
- `famille` : Utilisée en interne pour le mode Groupé et comme fallback, mais masquée dans l'interface utilisateur
- `unitesParPlaque` : Modifiable manuellement pour s'adapter aux spécificités du point de vente (tailles de plaques différentes)

### 4.2 FrequentationData

```javascript
{
  ticketsParJour: {              // Tickets pondérés par jour
    lundi: 1250,
    mardi: 980,
    // ...
  },
  poidsJours: {                  // % du trafic par jour
    lundi: 0.18,
    mardi: 0.14,
    // ...
  },
  totalTicketsPDV: number,       // Total tickets pondérés semaine
  poidsTranchesParJour: {        // % trafic par tranche et jour
    lundi: {
      matin: 0.60,
      midi: 0.30,
      soir: 0.10
    },
    // ...
  },
  poidsTranchesGlobal: {         // Moyennes hebdomadaires
    matin: 0.60,
    midi: 0.30,
    soir: 0.10
  },
  type: string,                  // 'standard' | 'saisonnier' | 'fortePromo'
  ponderations: {                // Poids appliqués
    S1: 0.40,   // Semaine précédente
    AS1: 0.30,  // Année antérieure même semaine
    S2: 0.30    // Semaine -2
  }
}
```

### 4.3 Planning

```javascript
{
  jours: {
    'Lundi': {
      'BOULANGERIE': {
        'Cuisson Baguette': {
          produits: Map([
            ['Baguette Blanche', {
              matin: 12,
              midi: 6,
              soir: 4,
              total: 22,
              unitesParVente: 1,
              unitesParPlaque: 6
            }],
            // ... autres produits
          ]),
          capacite: {
            matin: 100,
            midi: 50,
            soir: 30,
            total: 180
          }
        },
        // ... autres programmes
      },
      // ... autres rayons
    },
    // ... autres jours
  },
  programmesParRayon: {
    'BOULANGERIE': ['Cuisson Baguette', 'Cuisson Pain', ...],
    'VIENNOISERIE': ['Four Principal', ...],
    // ...
  },
  stats: {
    poidsJours: { Lundi: 0.20, ... },
    poidsTranchesParJour: { lundi: { matin: 0.6, ... }, ... },
    poidsTranchesGlobal: { matin: 0.6, midi: 0.3, soir: 0.1 },
    ponderationType: 'standard',
    ponderations: { S1: 0.4, AS1: 0.3, S2: 0.3 }
  }
}
```

---

## 5. FLUX DE TRAITEMENT

### 5.1 Workflow Complet (4 Étapes)

```
┌─────────────────────────────────────────────────────────────┐
│                  ÉTAPE 1 : UPLOAD                           │
│  - Sélection pondération (standard/saisonnier/forte promo)  │
│  - Upload fichier fréquentation                             │
│  - Upload fichier ventes                                    │
│  - Chargement référentiel ITM8 (automatique)                │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│           ÉTAPE 2 : PERSONNALISATION                        │
│  - Affichage produits (2 modes : groupé/liste)              │
│  - Édition libellés, rayons, programmes, potentiels         │
│  - Attribution manuelle produits non reconnus               │
│  - Calcul automatique potentiels (🤖)                       │
│  - Import/Export configuration                              │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│           ÉTAPE 3 : CONFIGURATION SEMAINE                   │
│  - Sélection semaine et année                               │
│  - Définition fermeture hebdomadaire                        │
│  - Gestion jours fériés (fermetures exceptionnelles)        │
│  - Configuration des reports de production                  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│             ÉTAPE 4 : PLANNING                              │
│  - Calcul planning hebdomadaire (avec reports)              │
│  - Vue hebdomadaire (7 jours)                               │
│  - Vue détaillée par jour                                   │
│  - Export/Impression (HTML/PDF)                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Phase 1 - Upload et Chargement

#### 1.1 Chargement Référentiel ITM8 (automatique)
```
- Au démarrage de l'app (useEffect)
- Lecture fichier Excel : Data/liste des produits BVP treville.xlsx
- Parsing colonnes : ITM8, Libellé, RAYON, Programme, poids, unités
- Construction cache (Map ITM8 → ProductInfo)
- Extraction listes rayons et programmes
```

#### 1.2 Upload Fréquentation
```
- Utilisateur sélectionne type pondération
- Upload fichier Excel/CSV
- Parsing : détection colonnes JOUR, TRANCHE, Tickets (S-1, AS-1, S-2)
- Agrégation tickets par jour et tranche horaire
- Application pondération : S-1×40% + AS-1×30% + S-2×30% (si standard)
- Calcul poids : % trafic par jour et par tranche
- Stockage dans frequentationData
```

#### 1.3 Upload Ventes
```
- Upload fichier Excel/CSV
- Parsing : détection colonnes Libellé, Date, Quantité, ITM8
- Groupement quantités par produit et par jour
- Extraction code ITM8 si présent dans données
```

#### 1.4 Création Produits
```
Pour chaque produit dans ventesData :
  1. Tentative reconnaissance ITM8 :
     - Si code ITM8 présent → recherche dans référentiel
     - Si trouvé → récupère rayon, programme, famille, poids, unités

  2. Sinon classification mots-clés :
     - Analyse libellé (pain, croissant, tarte, sandwich, etc.)
     - Retourne famille (BOULANGERIE|VIENNOISERIE|PATISSERIE|SNACKING|AUTRE)

  3. Calcul vente maximale :
     - Parcours ventesParJour
     - Identifie venteMax et dateVenteMax

  4. Calcul potentiel hebdomadaire :
     - Formule : Potentiel = Vente MAX ÷ Poids du jour
     - Exemple : venteMax=15 (samedi), poidsSamedi=0.20 → potentiel=75

  5. Création objet produit avec tous attributs

Stockage dans array produits (state React)
```

### 5.3 Phase 2 - Personnalisation

#### 2.1 Affichage Produits
```
Mode GROUPÉ (par défaut) :
- Regroupement par famille (BOULANGERIE, VIENNOISERIE, etc.)
- Sections dépliables/repliables
- Sélection multiple avec checkboxes
- Actions batch : définir potentiel, activer/désactiver

Mode LISTE :
- Tableau plat avec tous produits
- Tri : Nom (A-Z) | Volume (ventes) | Rayon/Programme
- Pas de sélection multiple
```

#### 2.2 Éditions Possibles
```
- Libellé personnalisé : édition inline (input text)
- Rayon : dropdown (liste issue référentiel)
- Programme : dropdown (liste issue référentiel)
- Famille : dropdown (5 choix)
- Potentiel : input number
- Actif : checkbox (inclusion dans planning)
```

#### 2.3 Calcul Automatique Potentiels
```
Bouton "🤖 Auto-Potentiels" :
- Pour chaque produit non-custom :
  - Identifie vente max et date
  - Récupère poids du jour depuis frequentationData
  - Applique formule : Potentiel = venteMax ÷ poids
  - Met à jour potentielHebdo
```

#### 2.4 Attribution Manuelle
```
Modal AttributionManuelle :
- Affiche produits avec reconnu=false ET custom=false
- Dropdowns rayon + programme
- Si rayon ET programme définis → marque reconnu=true
- Compteur : X/Y produits attribués
```

### 5.4 Phase 3 - Configuration Semaine

#### 3.1 Sélection Période
- Choix Numéro de semaine (1-53)
- Choix Année
- Calcul automatique des dates (Lundi au Dimanche)

#### 3.2 Fermetures
- Fermeture Hebdomadaire : Jour récurrent (mise à 0 sans report)
- Fermetures Exceptionnelles : Jours fériés (mise à 0 avec reports configurables)

#### 3.3 Reports de Production
- Pour chaque fermeture exceptionnelle :
- Définition des jours de report (ex: Veille, Avant-veille)
- Pourcentage de report par jour (Total doit faire 100%)

### 5.5 Phase 4 - Calcul Planning

#### 3.1 Validation Pré-calcul
```
Vérifications :
✓ Au moins 1 produit actif
✓ Au moins 1 produit avec potentiel > 0
Sinon : affichage message erreur
```

#### 3.2 Génération Planning
```
calculerPlanning(frequentationData, produits) :

1. Filtrer produits actifs avec potentiel > 0

2. Classifier par rayon → programme de cuisson

3. Pour chaque jour de la semaine :
   - Récupère poidJour depuis frequentationData

   Pour chaque produit :
     a. Quantité hebdo (avec buffer) :
        qte_hebdo = ceil(potentiel × 1.1)

     b. Quantité jour :
        qte_jour = ceil(qte_hebdo × poidJour)

     c. Répartition par tranche horaire :
        qte_matin = ceil(qte_jour × poidTrancheMatin)
        qte_midi = ceil(qte_jour × poidTrancheMidi)
        qte_soir = ceil(qte_jour × poidTrancheSoir)

   Accumulation capacités par programme de cuisson

4. Retour structure planning complète
```

#### 3.3 Affichage Planning
```
Vue HEBDOMADAIRE :
- 7 cartes (Lundi → Dimanche)
- Affichage total quantités par jour
- Clic sur jour → vue détaillée

Vue DÉTAILLÉE JOUR :
- Structure : Rayon → Programme → Produits
- Tableau avec colonnes : Matin | Midi | Soir | Total
- Conversion plaques si métadonnées disponibles
```

### 5.6 Phase 5 - Export

#### 4.1 Prévisualisation
```
ImpressionPanel :
- Modal avec aperçu HTML
- Sélection : planning jour spécifique OU hebdomadaire
- Affichage responsive avec styling print-friendly
```

#### 4.2 Export
```
Bouton "Imprimer" :
- Ouvre dialogue navigateur (Cmd/Ctrl+P)
- Permet impression physique ou "Enregistrer au format PDF"

Bouton "PDF" :
- Ouvre HTML dans nouvel onglet
- Utilisateur fait Cmd/Ctrl+P → "Enregistrer au format PDF"
```

---

## 6. RÈGLES MÉTIER

### 6.1 Reconnaissance Produits

#### Hiérarchie de Reconnaissance
```
1. PRIORITÉ : Reconnaissance ITM8
   - Code ITM8 présent dans données ventes
   - Recherche dans référentiel
   - Si trouvé → rayon, programme, famille issus référentiel

2. FALLBACK : Classification Mots-clés
   - Si pas ITM8 ou pas trouvé dans référentiel
   - Analyse du libellé avec mots-clés
   - Retourne famille uniquement
   - Rayon/programme = null

3. ATTRIBUTION MANUELLE
   - Utilisateur définit rayon + programme manuellement
   - Marque produit comme "reconnu"
```

#### Mots-clés par Famille
```
BOULANGERIE :
  pain, baguette, mie, campagne, céréales, tradition, boule, flûte

VIENNOISERIE :
  croissant, chocolat, brioche, pain raisin, chausson, suisse, escargot

PATISSERIE :
  tarte, éclair, gâteau, cake, flan, macaron, chou, paris-brest, forêt

SNACKING :
  sandwich, wrap, burger, salade, pizza, quiche, panini, club

AUTRE :
  tout le reste (par défaut)
```

### 6.2 Calcul Potentiel Hebdomadaire

#### Formule de Base
```
Potentiel Mathématique = Vente MAX ÷ Poids du jour de cette vente
```

#### 3 Modes de Calcul Disponibles

L'application propose 3 modes de calcul pour s'adapter aux différentes stratégies commerciales :

**1. Mode "Mathématique" (par défaut)**
```
Potentiel = Calcul brut sans limitation
```
- Utilise la formule de base sans contrainte
- Peut générer des progressions importantes
- Recommandé pour les nouveaux produits ou les périodes de forte croissance

**2. Mode "Forte Progression" (limite +20%)**
```
Si progression > +20% :
  Potentiel = Volume actuel × 1.20
Si progression entre 0% et +20% :
  Potentiel = Calcul mathématique
Si progression négative :
  Potentiel = Volume actuel (pas de baisse)
```
- Limite la croissance à +20% maximum par rapport au volume actuel
- Évite les surstocks tout en permettant une croissance soutenue
- Sécurise les prévisions en cas de pic de ventes inhabituel

**3. Mode "Prudent" (limite +10%)**
```
Si progression > +10% :
  Potentiel = Volume actuel × 1.10
Si progression entre 0% et +10% :
  Potentiel = Calcul mathématique
Si progression négative :
  Potentiel = Volume actuel (pas de baisse)
```
- Limite la croissance à +10% maximum
- Approche conservatrice pour minimiser le gaspillage
- Recommandé pour les produits matures ou les périodes incertaines

#### Exemple Détaillé avec les 3 Modes
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
- Mode Mathématique : 75 unités (+13.6%)
- Mode Forte Progression : 75 unités (+13.6% < 20%, pas de limitation)
- Mode Prudent : 73 unités (limité à +10% = 66 × 1.10)
```

#### Cas Particuliers
```
Si jour de vente MAX introuvable dans fréquentation :
→ Utilise poids du jour le plus fréquenté (max des poids)

Si vente MAX = 0 :
→ Potentiel = 0 (produit inactif)

Si progression négative (modes Forte Progression ou Prudent) :
→ Potentiel = Volume actuel (principe de non-baisse)
```

### 6.3 Pondération Multi-Semaines

#### Objectif
Lisser les variations saisonnières et promotionnelles en utilisant 3 semaines de données historiques.

#### Les 3 Semaines
```
S-1   : Semaine précédente (données les plus récentes)
AS-1  : Année antérieure, même semaine (saisonnalité)
S-2   : Il y a 2 semaines (tendance)
```

#### Types de Pondération

**STANDARD** (par défaut)
```
S-1  : 40%  (récent)
AS-1 : 30%  (saisonnalité)
S-2  : 30%  (tendance)

Utilisation : Activité normale, pas d'événement spécial
```

**SAISONNIER**
```
S-1  : 30%  (récent réduit)
AS-1 : 50%  (forte saisonnalité)
S-2  : 20%  (tendance réduite)

Utilisation : Périodes fortement saisonnières (Noël, Pâques, etc.)
```

**FORTE PROMO**
```
S-1  : 60%  (récent dominant)
AS-1 : 20%  (saisonnalité réduite)
S-2  : 20%  (tendance réduite)

Utilisation : Semaines promotionnelles, événements ponctuels
```

#### Application de la Pondération
```
Pour chaque jour et tranche horaire :

tickets_pondérés = (tickets_S1 × poids_S1) +
                   (tickets_AS1 × poids_AS1) +
                   (tickets_S2 × poids_S2)

Exemple (Lundi matin, pondération standard) :
- S-1  : 120 tickets × 0.40 = 48
- AS-1 : 100 tickets × 0.30 = 30
- S-2  : 110 tickets × 0.30 = 33
→ Total : 111 tickets pondérés

Poids jour = tickets_jour ÷ total_tickets_semaine
Poids tranche = tickets_tranche ÷ tickets_jour
```

### 6.4 Répartition Hebdomadaire et Horaire

#### Quantité Hebdomadaire (avec buffer)
```
qte_hebdo = ceil(potentiel × 1.1)

Buffer 10% : Prévention des ruptures de stock
Fonction ceil() : Arrondi supérieur (pas de demi-produit)
```

#### Quantité Journalière
```
qte_jour = ceil(qte_hebdo × poids_jour)

Exemple :
- Potentiel = 75
- qte_hebdo = ceil(75 × 1.1) = 83
- poids_samedi = 0.20
- qte_samedi = ceil(83 × 0.20) = 17
```

#### Répartition Horaire
```
qte_matin = ceil(qte_jour × poids_tranche_matin)
qte_midi  = ceil(qte_jour × poids_tranche_midi)
qte_soir  = ceil(qte_jour × poids_tranche_soir)

Poids par défaut (si données insuffisantes) :
- Matin (9h-12h)  : 60%
- Midi (12h-16h)  : 30%
- Soir (16h-23h)  : 10%

Exemple (qte_samedi = 17, poids standard) :
- Matin : ceil(17 × 0.60) = 11
- Midi  : ceil(17 × 0.30) = 6
- Soir  : ceil(17 × 0.10) = 2
```

### 6.5 Conversion Unités → Plaques

#### Étape 1 : Ventes → Unités de Production
```
unites = quantite_vente × unitesParVente

Exemple : Constance (lot de 3+1 gratuit)
- unitesParVente = 4
- vente jour = 10 lots
→ unites = 10 × 4 = 40 unités à produire
```

#### Étape 2 : Unités → Plaques de Cuisson
```
plaques = ceil(unites ÷ unitesParPlaque)

Exemple : Baguette
- unitesParPlaque = 6
- unites = 40
→ plaques = ceil(40 ÷ 6) = 7 plaques
```

#### Affichage des Produits
```
Si unitesParPlaque > 0 :
  → Affiche "7 Pl." (plaques)

Si unitesParPlaque = 0 ou null (produits sans cuisson) :
  → Affiche "40" (unités brutes, pour que les équipes sachent combien préparer)
```

**Cas d'usage** : Les produits sans cuisson (pain de mie sans gluten, produits snacking assemblés, etc.) ont `unitesParPlaque = 0`. Ces produits affichent directement les quantités en unités pour que les équipes sachent combien préparer.

#### Affichage de la CAPACITÉ Totale par Programme
```
Si AU MOINS UN produit du programme a unitesParPlaque > 0 :
  → Calcule la somme des plaques de tous les produits
  → Affiche "X Pl." (total plaques)

Si TOUS les produits du programme ont unitesParPlaque = 0 :
  → Affiche "NC" (Non Concerné - pas de cuisson pour ce programme)
```

**Logique** :
- La ligne CAPACITÉ indique la charge totale du four pour ce programme
- Si aucun produit nécessite de cuisson (tous à 0), la capacité est "NC"
- Cela permet de différencier les programmes sans cuisson des programmes avec cuisson

**Exemple** :
```
Programme "Snacking" :
- Pain de mie SS Gluten 350g : 40 unités (unitesParPlaque = 0)
- Sandwich Club : 15 unités (unitesParPlaque = 0)
→ CAPACITÉ : NC (pas de cuisson requise)

Programme "Cuisson Baguette" :
- Baguette Blanche : 7 Pl. (unitesParPlaque = 6)
- Baguette Tradition : 5 Pl. (unitesParPlaque = 6)
→ CAPACITÉ : 12 Pl. (charge totale du four)
```

### 6.6 Gestion des Produits Actifs/Inactifs

#### Produit Actif
```
Conditions :
- actif = true
- potentielHebdo > 0

Inclus dans :
✓ Calcul planning
✓ Compteurs capacité
✓ Export planning
```

#### Produit Inactif
```
Conditions :
- actif = false OU
- potentielHebdo = 0

Exclus de :
✗ Calcul planning
✗ Compteurs capacité
✗ Export planning

Mais visible dans :
✓ Personnalisation (édition possible)
✓ Export configuration CSV
```

---

## 7. FONCTIONNALITÉS DÉTAILLÉES

### 7.1 Gestion des Pondérations

#### Changement de Pondération
```
Déclenchement :
- Bouton radio dans EtapeUpload
- Callback : changerPonderation(nouveauType)

Action :
1. Re-parse fichier fréquentation avec nouveau type
2. Recalcule poidsJours et poidsTranchesParJour
3. Si planning déjà généré → recalcule automatiquement
4. Mise à jour affichage StatistiquesPanel
```

#### Stockage Fichier Fréquentation
```
État : frequentationFile (File object)

Raison :
Permet de recalculer pondération sans re-upload fichier
```

### 7.2 Tri des Produits (Mode Liste)

#### 3 Modes de Tri

**TRI NOM (A-Z)**
```
Critère : libellePersonnalise (alphabétique croissant)

Exemple :
- Baguette Blanche
- Croissant Beurre
- Pain Complet
```

**TRI VOLUME**
```
Critère : totalVentes (décroissant)

Exemple :
- Baguette Blanche (1250 ventes)
- Pain Complet (890 ventes)
- Croissant Beurre (450 ventes)
```

**TRI RAYON-VOLUME** (PAR DÉFAUT)
```
Critères (cascade) :
1. rayon (ordre logique métier) : BOULANGERIE → VIENNOISERIE → PATISSERIE → SNACKING → AUTRE
2. totalVentes (décroissant dans chaque rayon)

Ordre logique des rayons :
{
  'BOULANGERIE': 1,
  'VIENNOISERIE': 2,
  'PATISSERIE': 3,
  'SNACKING': 4,
  'AUTRE': 5
}

Exemple :
BOULANGERIE
  - Baguette Blanche (1250 ventes)
  - Pain Complet (890 ventes)
  - Baguette Tradition (750 ventes)
VIENNOISERIE
  - Croissant Beurre (450 ventes)
  - Pain Chocolat (420 ventes)
PATISSERIE
  - Tarte Citron (320 ventes)
  - Éclair Chocolat (280 ventes)
SNACKING
  - Sandwich Poulet (210 ventes)
  - Wrap Végétarien (150 ventes)
AUTRE
  - Produit Custom (10 ventes)
```

**Comportement par défaut** :
- Tri automatique appliqué lors de l'import des données ventes
- Affichage cohérent avec l'organisation métier (rayons dans l'ordre de production)
- Produits les plus vendus en premier dans chaque rayon

### 7.3 Sélection et Actions Batch (Mode Groupé)

#### Sélection Multiple
```
État local : selectionsParFamille
Structure :
{
  BOULANGERIE: [12, 15, 18],  // IDs produits sélectionnés
  VIENNOISERIE: [5, 8],
  // ...
}

Actions :
- Checkbox individuelle → toggle ID
- "Tout sélectionner" → ajoute tous IDs famille
- "Désélectionner tout" → vide array famille
```

#### Actions Batch Disponibles

**DÉFINIR POTENTIEL**
```
Déclenchement : Bouton "Définir potentiel"
Action :
1. Affiche prompt utilisateur (input number)
2. Valide valeur (≥ 0)
3. Applique à tous produits sélectionnés
4. Vide sélections
```

**ACTIVER/DÉSACTIVER**
```
Déclenchement : Boutons "Activer" / "Désactiver"
Action :
1. Parcourt IDs sélectionnés
2. Met à jour actif = true/false
3. Vide sélections
```

**SUPPRIMER (produits custom uniquement)**
```
Déclenchement : Bouton "Supprimer"
Action :
1. Filtre sélection → garde uniquement custom=true
2. Confirme suppression (alert)
3. Supprime du state produits
4. Vide sélections
```

### 7.4 Calcul Automatique Potentiels

#### Interface Utilisateur
```
Bouton avec menu déroulant (dropdown au survol) :

┌─────────────────────────────────────────┐
│ 🤖 Auto-Potentiels (Math) ▼             │ ← Bouton principal
└─────────────────────────────────────────┘
  ┌───────────────────────────────────────┐
  │ 📊 Mathématique                       │ ← Option 1
  │    Calcul brut sans limite            │
  ├───────────────────────────────────────┤
  │ 🚀 Forte progression                  │ ← Option 2
  │    Limite +20% max                    │
  ├───────────────────────────────────────┤
  │ 🛡️ Prudent                            │ ← Option 3
  │    Limite +10% max                    │
  └───────────────────────────────────────┘

Indication du mode actif :
- "(Math)" = Mathématique
- "(+20%)" = Forte progression
- "(+10%)" = Prudent
```

#### Sélection du Mode
```
Déclenchement : Survol du bouton "🤖 Auto-Potentiels"
Affichage : Menu dropdown avec 3 options

Action au clic sur une option :
1. Met à jour le mode de calcul (state React)
2. Lance le calcul automatique avec ce mode
3. Affiche une confirmation expliquant le mode choisi
4. Ferme le menu dropdown
```

#### Algorithme de Calcul
```
Déclenchement : Clic sur une option du menu dropdown

Paramètres :
- mode : 'mathematique' | 'forte-progression' | 'prudent'

Action :
Pour chaque produit dans produits :
  Si custom = false :  // Pas de recalcul pour produits manuels
    1. Identifie venteMax et dateVenteMax
    2. Convertit date → jour semaine
    3. Récupère poidJour depuis frequentationData
    4. Calcule potentiel mathématique : potentielMath = ceil(venteMax ÷ poidJour)
    5. Applique la limitation selon le mode :

       Si mode = 'mathematique' :
         → potentielFinal = potentielMath (pas de limite)

       Si mode = 'forte-progression' :
         progression = (potentielMath - volumeActuel) / volumeActuel
         Si progression > +20% :
           → potentielFinal = volumeActuel × 1.20
         Si progression entre 0% et +20% :
           → potentielFinal = potentielMath
         Si progression < 0% :
           → potentielFinal = volumeActuel (pas de baisse)

       Si mode = 'prudent' :
         progression = (potentielMath - volumeActuel) / volumeActuel
         Si progression > +10% :
           → potentielFinal = volumeActuel × 1.10
         Si progression entre 0% et +10% :
           → potentielFinal = potentielMath
         Si progression < 0% :
           → potentielFinal = volumeActuel (pas de baisse)

    6. Met à jour produit.potentielHebdo = potentielFinal

Retour : Tous produits avec potentiels recalculés
```

#### Messages de Confirmation
```
Mode Mathématique :
"Calcul mathématique appliqué sans limitation. Les potentiels sont calculés directement depuis les ventes maximales."

Mode Forte Progression :
"Calcul appliqué avec limite de progression à +20% maximum. Aucune baisse de volume n'est appliquée."

Mode Prudent :
"Calcul appliqué avec limite de progression à +10% maximum. Aucune baisse de volume n'est appliquée."
```

#### Cas d'Usage des Modes

**Mathématique** :
- Nouveaux produits en phase de lancement
- Produits en forte croissance confirmée
- Périodes de forte affluence (fêtes, événements)
- Pas de contraintes de gaspillage

**Forte Progression (+20%)** :
- Produits établis avec potentiel de croissance
- Équilibre entre croissance et prudence
- Adaptation progressive aux tendances
- Limitation du risque de surproduction

**Prudent (+10%)** :
- Produits matures avec ventes stables
- Périodes incertaines (météo, concurrence)
- Forte attention au gaspillage
- Approche conservatrice recommandée

### 7.5 Import/Export Configuration

#### Export Configuration (CSV)
```
Déclenchement : Bouton "Exporter"

Format CSV :
Libelle,LibellePersonnalise,Famille,PotentielHebdo,Actif,Custom

Exemple :
"Baguette Blanche","Baguette Tradi",BOULANGERIE,75,true,false
"Pain Complet","Pain Complet",BOULANGERIE,50,true,false
"Produit Test","Mon Produit",AUTRE,10,true,true

Action :
1. Génère CSV depuis state produits
2. Crée Blob avec type text/csv
3. Téléchargement automatique (nom : config_produits.csv)
```

#### Import Configuration (CSV)
```
Déclenchement : Bouton "Importer" + sélection fichier

Action :
1. Parse CSV (parseCSV)
2. Crée Map : libelle → réglages
3. Parcourt produits existants :
   - Si libelle dans Map → met à jour (libellePersonnalise, potentiel, actif, etc.)
4. Identifie produits custom manquants dans state
5. Si produits custom manquants :
   - Affiche confirm "Ajouter X produits custom ?"
   - Si oui → ajoute à state produits
6. Mise à jour state
```

### 7.6 Attribution Manuelle

#### Modal AttributionManuelle
```
Déclenchement : Clic bouton "Attribution manuelle"

Affichage :
- Liste produits avec reconnu=false ET custom=false
- Pour chaque produit :
  - Libellé
  - Dropdown RAYON (liste référentiel)
  - Dropdown PROGRAMME (liste référentiel)
  - Badge "✓ Attribué" si rayon ET programme définis

Compteur : "X/Y produits attribués"

Action :
- Sélection rayon → met à jour produit.rayon
- Sélection programme → met à jour produit.programme
- Si rayon ET programme définis → produit.reconnu = true
```

### 7.7 Gestion Produits Custom

#### Ajouter Produit Custom
```
Déclenchement : Bouton "+ Ajouter"

Action :
1. Affiche prompt : "Nom du produit ?"
2. Valide (non vide)
3. Crée objet produit :
   {
     id: nextId++,
     libelle: nom,
     libellePersonnalise: nom,
     itm8: null,
     rayon: null,
     programme: null,
     famille: 'AUTRE',
     ventesParJour: {},
     totalVentes: 0,
     potentielHebdo: 0,
     unitesParVente: 1,
     unitesParPlaque: 0,
     actif: true,
     custom: true,
     reconnu: false
   }
4. Ajoute à state produits
```

#### Supprimer Produit Custom
```
Déclenchement : Bouton "Supprimer" (icône poubelle)

Validation :
- Uniquement si custom = true

Action :
1. Confirme suppression
2. Filtre state produits (retire ID)
3. Mise à jour state
```

### 7.8 Statistiques Fréquentation

#### Panel StatistiquesPanel
```
Déclenchement : Bouton "Stats" dans EtapePlanning

Affichage :
- Type de pondération active
- Coefficients appliqués (S-1, AS-1, S-2)
- Tableau poids par jour (%)
- Tableau poids par tranche et jour (%)
- Moyennes hebdomadaires (Matin/Midi/Soir)

Format :
Lundi     : 18.5%
  Matin   : 62.0%
  Midi    : 28.0%
  Soir    : 10.0%

Mardi     : 14.2%
  ...
```

---

## 8. INTERFACE UTILISATEUR

### 8.1 Layout Principal

#### Header (toujours visible)
```
┌─────────────────────────────────────────────────────────┐
│  Planning BVP                              [Nouveau]     │
│  Boulangerie - Viennoiserie - Pâtisserie                │
│                                                          │
│  PDV: 001 - Boulangerie Treville                        │
│                                                          │
│  ① Upload → ② Perso → ③ Semaine → ④ Planning  [🖥️ Desktop/📱Tablette] │
└─────────────────────────────────────────────────────────┘
```

**Modifications récentes (2025-11-19)** :
- Bouton toggle Desktop/Tablette ajouté dans le header (visible uniquement sur la page Planning)
- Permet de basculer manuellement entre le mode Desktop et Tablette
- Positionné à droite des étapes pour un accès rapide
- Utilise les couleurs Mousquetaires (rouge actif, beige inactif)
- Remplace le détection automatique qui peut être inadaptée selon le matériel
- Les étapes sont maintenant alignées à gauche (justify-start) pour une meilleure lisibilité

#### Zone de Contenu (swappable)
```
Étape active détermine composant affiché :
- etape = 'upload'           → EtapeUpload
- etape = 'personnalisation' → EtapePersonnalisation
- etape = 'planning'         → EtapePlanning
```

### 8.2 EtapeUpload

```
┌─────────────────────────────────────────────────────────┐
│  ÉTAPE 1 : FRÉQUENTATION                                │
│  [📁 Choisir fichier]                                   │
│  ✓ Fichier chargé : frequentation.xlsx                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  ÉTAPE 2 : VENTES                                       │
│  [📁 Choisir fichier]                                   │
│  ✓ 45 produits détectés                                 │
└─────────────────────────────────────────────────────────┘

─────────────────────────────────────────────────────────

┌─────────────────────────────────────────────────────────┐
│  TYPE DE PONDÉRATION DES DONNÉES                        │
│  ○ Standard (S-1: 40%, AS-1: 30%, S-2: 30%)            │
│  ○ Saisonnier (S-1: 30%, AS-1: 50%, S-2: 20%)          │
│  ○ Forte Promo (S-1: 60%, AS-1: 20%, S-2: 20%)         │
└─────────────────────────────────────────────────────────┘

                      [Suivant →]
```

**Modifications récentes (2025-11-19)** :
- Section "Type de pondération" déplacée APRÈS les imports de fichiers
- Cette section n'apparaît que lorsque les deux fichiers sont chargés
- Améliore le flux UX : l'utilisateur ne voit cette option que quand elle devient modifiable
- Séparateur visuel (ligne horizontale) avant la section pondération

### 8.3 EtapePersonnalisation

#### Barre d'Actions
```
┌─────────────────────────────────────────────────────────────────┐
│  [Groupé] [Liste]     45 produits (42 actifs)                   │
│                                                                  │
│  [🤖 Auto-Potentiels (Math) ▼] [+ Ajouter] [Exporter] [Import] │
│  [Attribution manuelle] [Tri: Rayon-Volume ▼]                   │
└─────────────────────────────────────────────────────────────────┘
```

**Modifications récentes** :
- Bouton "🤖 Auto-Potentiels" avec menu dropdown pour sélectionner le mode de calcul
- Indication du mode actif dans le bouton : "(Math)", "(+20%)" ou "(+10%)"
- Tri par défaut changé de "A-Z" à "Rayon-Volume"

#### Mode Groupé
```
┌─────────────────────────────────────────────────────────┐
│  ▼ BOULANGERIE (18 produits)          [Tout] [Aucun]   │
│  ┌───────────────────────────────────────────────────┐  │
│  │ ☐ Baguette Blanche          [ITM8: 1001]   ✓     │  │
│  │   Rayon: BOULANGERIE  Programme: Cuisson Baguette │  │
│  │   Potentiel: [75] unités/semaine    [Actif ✓]    │  │
│  ├───────────────────────────────────────────────────┤  │
│  │ ☐ Pain Complet              [ITM8: 1015]   ✓     │  │
│  │   Rayon: BOULANGERIE  Programme: Cuisson Pain     │  │
│  │   Potentiel: [50] unités/semaine    [Actif ✓]    │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  [Définir potentiel] [Activer] [Désactiver]             │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  ▶ VIENNOISERIE (12 produits)                           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  ▶ PATISSERIE (8 produits)                              │
└─────────────────────────────────────────────────────────┘
```

**Notes** :
- La colonne "Famille" a été retirée de l'interface utilisateur
- La famille reste présente en interne pour la classification et le mode Groupé
- Pour les produits non reconnus par ITM8, le rayon est automatiquement assigné à partir de la famille

#### Mode Liste (Optimisé)
```
┌────────────────────────────────────────────────────────────────────────────────┐
│ Libellé       │ Rayon     │ Programme │ Potentiel │ Unit/Plaque │ Actif │ Actions │
│               │           │           │  Hebdo    │             │       │         │
├────────────────────────────────────────────────────────────────────────────────┤
│ Baguette Bl.  │ BOULAN... │ Cuisson B │ [75____]  │ [6___] NC   │ ✓     │ [🗑️]   │
│ ✓ ITM8: 1001  │ [▼]       │ [▼]       │           │             │ [✓]   │         │
├────────────────────────────────────────────────────────────────────────────────┤
│ Pain SS Glu   │ BOULAN... │ Snacking  │ [40____]  │ [0___] NC   │ ✓     │ [🗑️]   │
│ ⚠️ Non ITM8   │ [▼]       │ [▼]       │           │             │ [✓]   │         │
└────────────────────────────────────────────────────────────────────────────────┘
```

**Changements d'interface récents** :

1. **Colonne "Famille" supprimée**
   - La famille reste en interne mais n'est plus affichée
   - Simplifie l'interface et évite la redondance avec Rayon

2. **Colonne "Unités/Plaque" ajoutée**
   - Input de type number (largeur `w-14`)
   - Éditable par l'utilisateur pour s'adapter aux spécificités du point de vente
   - Badge "NC" (orange) affiché si valeur = 0 (produits sans cuisson)
   - Permet de personnaliser les capacités de plaques

3. **Optimisation des largeurs de colonnes**
   - Padding réduit de `px-4` à `px-2` pour les colonnes étroites
   - Inputs avec largeurs fixes : Potentiel Hebdo (`w-16`), Unités/Plaque (`w-14`)
   - Texte en `text-xs` pour les headers de colonnes
   - Permet d'afficher toutes les colonnes sur un écran standard

4. **Colonne "Actions"**
   - Bouton "🗑️" (poubelle) pour supprimer un produit
   - Visible uniquement pour les produits custom (créés manuellement)
   - Produits issus des ventes ne peuvent pas être supprimés

**Comportement des inputs** :
```
Input Potentiel Hebdo :
- Type: number
- Min: 0
- Largeur: w-16 (4rem = 64px)
- Exemple: [75]

Input Unités/Plaque :
- Type: number
- Min: 0
- Step: 1
- Largeur: w-14 (3.5rem = 56px)
- Exemple: [6]
- Badge "NC" si valeur = 0 (produits sans cuisson)
```

### 8.4 EtapeConfigurationSemaine

#### Configuration Période
```
┌─────────────────────────────────────────────────────────┐
│  Période de production                                  │
│  [Semaine 5] [Année 2025]  → Du Lundi 27/01 au Dim...   │
└─────────────────────────────────────────────────────────┘
```

#### Gestion Fermetures
```
┌─────────────────────────────────────────────────────────┐
│  Fermeture hebdomadaire légale                          │
│  [Tous les Lundis ▼]                                    │
│  ⚠️ Les quantités seront mises à zéro (pas de report)   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Fermetures exceptionnelles                             │
│  ☐ Lundi 27/01 - Fermeture exceptionnelle               │
│  ☑ Mardi 28/01 - Fermeture exceptionnelle               │
│    ↳ Report des quantités :                             │
│      Lundi : [50]%                                      │
│      Mercredi : [50]%                                   │
└─────────────────────────────────────────────────────────┘
```

### 8.5 EtapePlanning

#### Vue Hebdomadaire
```
┌─────────────────────────────────────────────────────────┐
│  [← Personnaliser]  [Stats]  [Imprimer]                 │
└─────────────────────────────────────────────────────────┘

┌──────────┬──────────┬──────────┬──────────┬──────────┐
│  LUNDI   │  MARDI   │ MERCREDI │  JEUDI   │ VENDREDI │
│          │          │          │          │          │
│  142     │  108     │  125     │  115     │  168     │
│ produits │ produits │ produits │ produits │ produits │
│          │          │          │          │          │
│ [Voir >] │ [Voir >] │ [Voir >] │ [Voir >] │ [Voir >] │
└──────────┴──────────┴──────────┴──────────┴──────────┘

┌──────────┬──────────┐
│ SAMEDI   │ DIMANCHE │
│          │          │
│  185     │  142     │
│ produits │ produits │
│          │          │
│ [Voir >] │ [Voir >] │
└──────────┴──────────┘
```

#### Vue Détaillée Jour (Exemple : Lundi)
```
┌─────────────────────────────────────────────────────────┐
│  [← Retour semaine]        LUNDI                        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  BOULANGERIE                                            │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Cuisson Baguette                                  │  │
│  ├─────────────────┬───────┬───────┬───────┬────────┤  │
│  │ Produit         │ Matin │  Midi │  Soir │  Total │  │
│  ├─────────────────┼───────┼───────┼───────┼────────┤  │
│  │ Baguette Blanc. │ 11    │   6   │   4   │   21   │  │
│  │ Baguette Tradi. │  9    │   5   │   3   │   17   │  │
│  ├─────────────────┼───────┼───────┼───────┼────────┤  │
│  │ Capacité        │ 20    │  11   │   7   │   38   │  │
│  └─────────────────┴───────┴───────┴───────┴────────┘  │
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Cuisson Pain                                      │  │
│  ├─────────────────┬───────┬───────┬───────┬────────┤  │
│  │ Pain Complet    │  8    │   4   │   2   │   14   │  │
│  │ Pain Campagne   │  7    │   3   │   2   │   12   │  │
│  └─────────────────┴───────┴───────┴───────┴────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 8.6 ImpressionPanel

```
┌─────────────────────────────────────────────────────────┐
│  APERÇU AVANT IMPRESSION                [Fermer ✕]     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  PDV: 001 - Boulangerie Treville                        │
│  Planning Production - Semaine du 27/01 au 02/02        │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │ [Tableau planning formaté pour impression]     │    │
│  │                                                 │    │
│  │ LUNDI 27 JANVIER                                │    │
│  │                                                 │    │
│  │ BOULANGERIE                                     │    │
│  │   Cuisson Baguette                              │    │
│  │     Baguette Blanche : 11 | 6 | 4 (21)         │    │
│  │     ...                                         │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  [Imprimer] [Télécharger PDF]                           │
└─────────────────────────────────────────────────────────┘
```

### 8.7 Design System

#### Couleurs par Famille (Palette Chaleureuse Boulangerie)
```
BOULANGERIE   : bg-stone-100   border-stone-300   text-stone-800   (beige/sable - ton pain)
VIENNOISERIE  : bg-amber-100   border-amber-300   text-amber-800   (orange doux - ton croissant doré)
PATISSERIE    : bg-rose-100    border-rose-300    text-rose-800    (rose pâle - ton framboise)
SNACKING      : bg-emerald-100 border-emerald-300 text-emerald-800 (vert olive)
AUTRE         : bg-slate-100   border-slate-300   text-slate-800   (gris neutre)
```

#### États Visuels
```
Produit reconnu ITM8     : border-emerald-500 bg-emerald-50
Produit modifié          : badge bleu "Modifié"
Produit custom           : badge violet "Custom"
Produit inactif          : opacity-50
Produit avec erreur      : border-red-500
```

#### Boutons
```
Primaire (action)        : bg-amber-700 hover:bg-amber-800      (marron chocolat)
Succès                   : bg-emerald-600 hover:bg-emerald-700  (vert olive)
Danger                   : bg-red-600 hover:bg-red-700          (rouge)
Navigation               : bg-gray-600 hover:bg-gray-700        (gris)
Secondaire (outline)     : border-gray-300 hover:bg-gray-50     (gris clair)
Focus/Active             : focus:ring-amber-500                 (ring ambre)
```

#### Responsive Breakpoints
```
Mobile     : < 640px   (layout vertical, cartes empilées)
Tablet     : 640-1024  (grilles 2 colonnes)
Desktop    : > 1024    (grilles 3-4 colonnes, tableaux larges)
```

---

## 9. IMPORT/EXPORT

### 9.1 Formats Fichiers Supportés

#### Excel (.xlsx, .xls)
```
Librairie : xlsx (SheetJS)

Fonctionnalités :
- Lecture multiples feuilles
- Détection automatique colonnes (keywords case-insensitive)
- Support formats dates Excel (serial number)
- Conversion automatique types (nombre, texte, date)
```

#### CSV (.csv)
```
Parser custom (parsers.js)

Fonctionnalités :
- Détection séparateur (, ou ;)
- Gestion guillemets (échappement)
- Trim automatique espaces
- Headers en première ligne
```

### 9.2 Fichier Fréquentation

#### Structure Attendue
```
| JOUR   | TRANCHE   | ... | Tickets S-1 | ... | Tickets AS-1 | ... | Tickets S-2 |
|--------|-----------|-----|-------------|-----|--------------|-----|-------------|
| lundi  | 9h_12h    | ... | 120         | ... | 100          | ... | 110         |
| lundi  | 12h_16h   | ... | 60          | ... | 50           | ... | 55          |
| lundi  | 16h_23h   | ... | 20          | ... | 15           | ... | 18          |
| mardi  | 9h_12h    | ... | 95          | ... | 85           | ... | 90          |
...

Colonnes clés (détection flexible) :
- JOUR (col G) : lundi, 1-lundi, Monday, etc.
- TRANCHE (col H) : 9h_12h, 09h-12h, Matin, etc.
- Tickets S-1 (col N) : nombres
- Tickets AS-1 (col T) : nombres
- Tickets S-2 (col Z) : nombres
```

#### Parsing
```
1. Détection colonnes par keywords
2. Normalisation jours (→ lundi, mardi, etc.)
3. Normalisation tranches (→ matin, midi, soir)
4. Agrégation par jour et tranche
5. Application pondération
6. Calcul poids (% du total)
```

### 9.3 Fichier Ventes

#### Structure Attendue
```
| ITM8 | Libellé produit     | Date       | Quantité | ... |
|------|---------------------|------------|----------|-----|
| 1001 | Baguette Blanche    | 15/01/2025 | 12       | ... |
| 1001 | Baguette Blanche    | 16/01/2025 | 8        | ... |
| 1015 | Pain Complet        | 15/01/2025 | 5        | ... |
...

Colonnes clés (détection flexible) :
- ITM8 : code produit (optionnel)
- Libellé : nom produit
- Date : format DD/MM/YYYY, YYYY-MM-DD, ou Excel serial
- Quantité : nombre vendu
```

#### Parsing
```
1. Détection ligne header (contient "ITM8")
2. Détection colonnes par keywords
3. Extraction PDV info (ligne contenant "PDV:")
   - Format: "PDV: [numéro] - [nom complet]"
   - Regex: /PDV:?\s*(\d+)\s*-\s*(.+?)(?:\s*Date|$)/i
   - Capture le nom complet jusqu'au mot "Date" ou fin de chaîne
4. Groupement par produit (libellé)
5. Groupement par jour (date)
6. Calcul totaux
```

**Modifications récentes (2025-11-19)** :
- Amélioration du regex de parsing PDV pour capturer le nom complet
- Ancienne version tronquait le nom à la première lettre D/a/t/e
- Nouvelle version utilise un lookahead pour trouver le mot "Date" complet
- Exemple: "PDV: 10679 - Super Boulangerie de Paris Date: ..." → capture maintenant "Super Boulangerie de Paris" au lieu de "Super Boulangerie "

### 9.4 Référentiel ITM8

#### Fichier
```
Emplacement : Data/liste des produits BVP treville.xlsx
Format : Excel (.xlsx)
```

#### Structure
```
| ITM8 | Libellé produit  | RAYON       | Programme      | unit/lot | Nb unit/plaque |
|------|------------------|-------------|----------------|----------|----------------|
| 1001 | Baguette Blanche | BOULANGERIE | Cuisson Baguet | 1        | 6              |
| 1002 | Constance        | VIENNOISERIE| Four Principal | 4        | 12             |
...

Colonnes détectées :
- ITM8 : code unique
- Libellé produit : nom
- RAYON : rayon de vente
- Programme de cuisson : programme four
- unit/lot : unités par vente (ex: lot de 3+1 = 4)
- Nombre d'unit par plaque : capacité plaque cuisson
```

#### Chargement
```
Timing : useEffect au démarrage App
Cache : referentielCache global (Map ITM8 → ProductInfo)
Extraction : listes rayons et programmes uniques
```

### 9.5 Export Configuration Produits

#### Format CSV
```
Libelle,LibellePersonnalise,Famille,PotentielHebdo,Actif,Custom
"Baguette Blanche","Baguette Tradition",BOULANGERIE,75,true,false
"Pain Complet","Pain Complet",BOULANGERIE,50,true,false
"Mon Produit","Mon Produit Custom",AUTRE,10,true,true
```

#### Colonnes
```
- Libelle : libellé original (clé unique)
- LibellePersonnalise : libellé édité
- Famille : BOULANGERIE|VIENNOISERIE|PATISSERIE|SNACKING|AUTRE
- PotentielHebdo : nombre (unités/semaine)
- Actif : true/false
- Custom : true/false
```

#### Usage
```
Export :
- Sauvegarde configuration actuelle
- Partage entre utilisateurs
- Backup avant modifications

Import :
- Restauration configuration
- Fusion avec données ventes actuelles
- Création produits custom manquants (optionnel)
```

### 9.6 Export Planning

#### Format HTML
```
Structure :
<!DOCTYPE html>
<html>
<head>
  <style>
    /* Styles print-friendly */
    @media print {
      @page { size: A4 landscape; }
    }
  </style>
</head>
<body>
  <h1>Planning Production</h1>
  <p>PDV: 001 - Boulangerie Treville</p>
  <p>Semaine du 27/01 au 02/02/2025</p>

  <table>
    <!-- Tableau planning -->
  </table>
</body>
</html>
```

#### Deux Variantes

**Planning Jour**
```
Focus : Un jour spécifique (ex: Lundi)
Niveau détail : Maximum
Structure : Rayon → Programme → Produits
Colonnes : Matin | Midi | Soir | Total
```

**Planning Hebdo**
```
Focus : Semaine complète
Niveau détail : Résumé
Structure : Produit → Quantités par jour
Colonnes : Lun | Mar | Mer | Jeu | Ven | Sam | Dim | Total
```

#### Méthodes Export

**Imprimer (navigateur)**
```
Action : window.print()
Déclenchement : Cmd+P (Mac) ou Ctrl+P (Windows)
Options :
- Impression physique
- Enregistrer au format PDF (imprimante virtuelle)
```

**PDF (nouvel onglet)**
```
Action :
1. Génère HTML complet
2. Crée Blob avec type text/html
3. window.open(URL) dans nouvel onglet
4. Utilisateur fait Cmd/Ctrl+P → "Enregistrer au format PDF"
```

---

## 10. PERFORMANCES ET SÉCURITÉ

### 10.1 Optimisations Performances

#### Chargement Initial
```
Référentiel ITM8 :
- Chargement unique au démarrage (useEffect)
- Cache global (pas de rechargement)
- Taille : ~500 produits → parsing < 200ms

Bundle JavaScript :
- Vite build optimisé
- Code splitting automatique
- Lazy loading composants (possible amélioration)
```

#### Processing Données
```
Parsing Excel :
- Librairie XLSX performante
- Fichiers < 5 MB → parsing < 1s

Calcul Planning :
- Complexité : O(n × 7) où n = nombre produits actifs
- 100 produits actifs → calcul < 100ms

Tri Produits :
- JavaScript native sort()
- 100 produits → tri instantané (< 10ms)
```

#### Gestion Mémoire
```
Référentiel :
- Cache unique global (pas de duplication)

Produits :
- State React (re-render optimisé)
- Pas de memory leaks (composants fonctionnels)

Planning :
- Map pour accès O(1)
- Cleanup automatique lors recalcul
```

### 10.2 Validation et Gestion Erreurs

#### Validation Fichiers
```
Vérifications :
✓ Fichier non vide
✓ Format Excel/CSV valide
✓ Colonnes essentielles présentes
✓ Données numériques parsables

Erreurs possibles :
❌ Colonnes manquantes → message explicite + colonnes trouvées
❌ Format date invalide → skip ligne + warning console
❌ Quantité non numérique → conversion 0 + warning
```

#### Validation Métier
```
Avant calcul planning :
✓ Au moins 1 produit actif
✓ Au moins 1 produit avec potentiel > 0
✓ Fréquentation chargée

Messages utilisateur :
- "Aucun produit actif. Activez au moins un produit."
- "Aucun potentiel défini. Utilisez 🤖 Auto-Potentiels."
```

#### Try-Catch et Logging
```
Fonctions critiques protégées :
- parseVentesExcel()
- parseFrequentationExcel()
- calculerPlanning()
- chargerReferentielITM8()

Logging console :
- Mode diagnostic (toujours actif)
- Détails parsing : colonnes détectées, lignes lues, erreurs
- Calculs : formules appliquées, résultats intermédiaires
```

### 10.3 Sécurité

#### Type d'Application
```
Application client-side uniquement :
- Pas de backend
- Pas de base de données
- Pas d'authentification requise
- Données traitées localement (navigateur)
```

#### Données Sensibles
```
Nature des données :
- Ventes produits (non sensibles)
- Fréquentation magasin (non sensibles)
- Planning production (non sensibles)

Aucune donnée personnelle (RGPD compliant)
```

#### XSS et Injection
```
React protège automatiquement :
- Échappement automatique variables JSX
- Pas de dangerouslySetInnerHTML

Inputs utilisateur :
- Validation type (numbers, strings)
- Trim automatique
- Pas d'exécution code utilisateur
```

#### CORS et Fichiers Locaux
```
Référentiel ITM8 :
- Fichier local (pas de requête HTTP)
- Chargement via fetch() relatif

Upload utilisateur :
- FileReader API (local uniquement)
- Pas d'envoi serveur
```

### 10.4 Accessibilité

#### Standards WCAG
```
Partiellement conforme :
✓ Couleurs avec contraste suffisant
✓ Taille police lisible (16px base)
✓ Boutons avec labels explicites
✓ Navigation clavier possible

Améliorations possibles :
- aria-labels sur inputs
- Focus visible amélioré
- Screen reader testing
```

#### Responsive Design
```
Mobile (< 640px) :
- Layout vertical
- Tableaux avec scroll horizontal
- Boutons pleine largeur
- Touch-friendly (44px min)

Tablet (640-1024) :
- Grilles 2 colonnes
- Modals adaptés
- Navigation tabs

Desktop (> 1024) :
- Grilles 3-4 colonnes
- Tableaux larges
- Sidebars possibles
```

---

## 11. MODE PRODUCTION TABLETTE

### 11.1 Vue d'Ensemble

Le **Mode Production** est une interface optimisée pour les tablettes permettant aux opérateurs de suivre et valider la production en temps réel. Cette fonctionnalité transforme l'application de simple outil de planification en véritable système de suivi de production.

### 11.2 Interface Tablette

#### Activation du Mode Tablette

**Détection Automatique** :
```
L'application détecte automatiquement le type d'appareil :
- Mobile     : largeur < 768px
- Tablette   : largeur 768-1024px OU appareil tactile
- Desktop    : largeur > 1024px ET non tactile
```

**Activation Manuelle (2025-11-19)** :
```
┌─────────────────────────────────────────┐
│  ① Upload → ② Personnalisation → ③ Planning  [🖥️ Desktop/📱Tablette] │
└─────────────────────────────────────────┘

Bouton toggle Desktop/Tablette :
- Position : Header, à droite des étapes (visible uniquement sur page Planning)
- Comportement : Bascule manuellement entre mode Desktop et Tablette
- Style : Rouge Mousquetaires (#ED1C24) actif, Beige (#E8E1D5) inactif
- Icônes : Monitor (🖥️) pour Desktop, Tablet (📱) pour Tablette
- Raison : Permet de forcer le mode tablette sur des machines avec résolutions variables
```

**Avantages du mode manuel** :
- Flexibilité pour les parcs machines hétérogènes
- Permet de tester l'interface tablette sur desktop
- Résolution indépendante de l'écran physique

#### Navigation Multi-Modes
```
Trois modes d'affichage :
┌─────────────────────────────────────────┐
│ [Planning] [Production] [Suivi temps réel] │
└─────────────────────────────────────────┘

Planning         : Vue standard du planning (accordéons par rayon)
Production       : Checklist interactive de production
Suivi temps réel : Tableau de bord avec progression par rayon
```

#### Navigation Temporelle
```
Interface de navigation entre les jours :
┌─────────────────────────────────────────┐
│  [◀ Lun]    MARDI       [Mer ▶]        │
│             5 programmes                 │
│                                          │
│  [Matin] [Midi] [Après-midi] [Casse]   │
└─────────────────────────────────────────┘

Fonctionnalités :
- Navigation tactile entre les jours de la semaine
- Sélection de la tranche horaire active (4 boutons)
- Code couleur : Matin (bleu), Midi (jaune), Après-midi (orange), Casse (rouge)
```

### 11.3 Gestion des Tranches Horaires

#### 4 Tranches Indépendantes

**Matin (9h-12h)** - Bleu
```
Objectif : Première cuisson de la journée
Caractéristiques :
- Produits pour l'ouverture et pic matinal
- Checkboxes indépendantes pour valider la production
- Suivi en temps réel de l'avancement
```

**Midi (12h-16h)** - Jaune
```
Objectif : Cuisson pour le pic déjeuner
Caractéristiques :
- Nouvelle équipe, nouvelles checkboxes
- Visualisation de ce qui a été fait le matin
- Quantités spécifiques à la tranche
```

**Après-midi (16h-23h)** - Orange
```
Objectif : Dernière cuisson de la journée
Caractéristiques :
- Gestion intelligente du stock rayon
- Calcul automatique : Prévision - Stock = À cuire
- Évite la surproduction en fin de journée
```

**Casse (Invendus)** - Rouge
```
Objectif : Enregistrer les produits non vendus
Caractéristiques :
- Vue globale alphabétique de tous les produits
- Saisie rapide des quantités d'invendus
- Données pour ajuster le planning futur
```

### 11.4 Système de Persistance

#### Clés de Stockage localStorage
```javascript
Format de la clé :
`production_${jour}_${rayon}_${programme}`

Exemple :
production_Lundi_BOULANGERIE_Cuisson Baguette

Structure des données :
{
  trancheActive: 'matin',
  produitsCoches: {
    matin: ['Baguette Blanche', 'Pain Complet'],
    midi: ['Baguette Tradition'],
    'apres-midi': []
  },
  stocksRayon: {
    'Baguette Blanche': 2.5,  // En plaques ou unités
    'Pain Complet': 1.0
  },
  casse: {
    'Croissant Beurre': 0.5
  },
  heureDebut: '2025-11-06T09:15:00.000Z',
  enCours: true
}
```

#### Isolation des Données
```
Par jour :
- Lundi ≠ Mardi (données indépendantes)
- Changement de jour → checkboxes vierges

Par rayon/programme :
- BOULANGERIE/Cuisson Baguette ≠ VIENNOISERIE/Four Principal

Par tranche :
- Matin ≠ Midi ≠ Après-midi
- Checkboxes indépendantes
- Historique visible en résumé
```

### 11.5 Mode Production - Checklist Interactive

#### Composant ModeProductionEnCours

**Header Dynamique**
```
Couleur selon tranche active :
- Matin : Dégradé bleu (sky-400 → sky-500)
- Midi : Dégradé jaune (yellow-400 → yellow-500)
- Après-midi : Dégradé orange (orange-500 → orange-600)
- Casse : Dégradé rouge (red-600 → red-700)

Affiche :
- Rayon (ex: BOULANGERIE)
- Programme (ex: Cuisson Baguette)
- Heure de démarrage si production lancée
```

**Résumé des Tranches**
```
┌────────────────────────────────────────┐
│  Matin      │  Midi       │ Après-midi │
│  2/5 faits  │  0/5 faits  │  0/5 faits │
│  ✓ Actif    │  Inactif    │  Inactif   │
└────────────────────────────────────────┘

Fonctionnalités :
- Vue d'ensemble de toutes les tranches
- Tranche active mise en évidence (bleu)
- Tranches complétées en vert
- Compteur produits cochés/total
```

**Liste Produits avec Checkboxes**
```
Pour chaque produit :
┌────────────────────────────────────────┐
│ ○ Baguette Blanche                     │
│   Prévision: 11 Pl.                    │
└────────────────────────────────────────┘

Après validation :
┌────────────────────────────────────────┐
│ ✓ Baguette Blanche              [Fait] │
│   Prévision: 11 Pl.                    │
└────────────────────────────────────────┘

Comportement :
- Clic sur la zone → toggle checkbox
- État coché → fond vert, texte barré
- Badge "Fait" visible
```

**Barre de Progression**
```
┌────────────────────────────────────────┐
│ Progression               40%          │
│ ████████░░░░░░░░░░                     │
│ 2 / 5 produits                         │
└────────────────────────────────────────┘

Calcul :
- Pourcentage = (produits cochés / total) × 100
- Uniquement pour la tranche active
- Animation lors du changement
```

#### États de Production

**Non Démarrée**
```
Affichage :
[▶ Démarrer la production]

Action :
- Enregistre l'heure de début
- Passe enCours = true
- Permet le suivi de la durée
```

**En Cours**
```
Affichage :
┌────────────────────────────────────────┐
│ 🕐 Production en cours...              │
│                                        │
│ Progression : 40%                      │
└────────────────────────────────────────┘
```

**Terminée (100%)**
```
Affichage :
┌────────────────────────────────────────┐
│ ✓ Production terminée !                │
│   Durée : 27 minutes                   │
└────────────────────────────────────────┘
```

### 11.6 Gestion Stock Rayon (Après-midi)

#### Fonctionnalité Intelligente

**Contexte**
```
Problème résolu :
En après-midi, il reste souvent du stock de la cuisson
du matin ou du midi. Il faut éviter de tout recuire.

Solution :
Calcul automatique de la quantité à cuire en fonction
du stock rayon actuel.
```

**Interface de Saisie**
```
Affichée uniquement pour :
- Tranche = Après-midi
- Produit non coché
- Mode ≠ Casse

┌────────────────────────────────────────────────┐
│ 📦 Gestion Stock Rayon                         │
│                                                │
│ ┌──────────┬──────────┬──────────┐            │
│ │ Prévision│   Stock  │  À cuire │            │
│ │          │   rayon  │          │            │
│ ├──────────┼──────────┼──────────┤            │
│ │  11 Pl.  │ [  2.5 ] │  8.5 Pl. │            │
│ └──────────┴──────────┴──────────┘            │
│                                                │
│ 11 - 2.5 = 8.5 Pl.                            │
└────────────────────────────────────────────────┘

Comportement :
- Prévision : lecture seule (du planning)
- Stock rayon : input éditable (saisie opérateur)
- À cuire : calculé automatiquement
- Formule affichée en bas
```

**Calcul Automatique**
```javascript
Formule :
À cuire = MAX(0, Prévision - Stock)

Exemples :
Prévision = 11 Pl., Stock = 2.5 Pl.
→ À cuire = 8.5 Pl. (11 - 2.5)

Prévision = 5 Pl., Stock = 6 Pl.
→ À cuire = 0 Pl. (stock suffisant)

Affichage visuel :
- Si À cuire > 0 : Vert (production nécessaire)
- Si À cuire = 0 : Gris (stock suffisant)
```

### 11.7 Mode Casse (Invendus)

#### Vue Globale Alphabétique

**Composant ModeCasseGlobal**
```
Objectif :
Simplifier la saisie des invendus en fin de journée
en affichant tous les produits dans une seule liste
alphabétique (pas de regroupement par rayon/programme).

Interface :
┌────────────────────────────────────────┐
│ 🗑️ Casse - Invendus                   │
│                                        │
│ 📝 Enregistrez les quantités d'invendus│
│    Liste complète triée A-Z            │
└────────────────────────────────────────┘
```

**Liste des Produits**
```
Pour chaque produit (ordre alphabétique) :
┌────────────────────────────────────────┐
│ Baguette Blanche                       │
│ BOULANGERIE - Cuisson Baguette         │
│ Prévision initiale: 21 Pl.             │
│                            [    0    ] │
│                            Invendus    │
└────────────────────────────────────────┘

Fonctionnalités :
- Nom produit en gros
- Rayon/Programme en petit (contexte)
- Prévision du jour affichée
- Input pour saisir les invendus
- Scroll vertical pour longues listes
```

**Résumé**
```
En bas de la liste :
┌────────────────────────────────────────┐
│ 45 produits au total                   │
└────────────────────────────────────────┘
```

### 11.8 Gestion des Programmes de Cuisson

#### Interface de Personnalisation

**Composant GestionProgrammes**
```
Déclenchement :
Bouton "⚙️ Programmes" (violet) dans l'étape Personnalisation

Modal :
┌────────────────────────────────────────────┐
│ Gestion des Programmes de Cuisson    [✕]  │
├────────────────────────────────────────────┤
│ Personnalisez les noms des programmes ou  │
│ créez-en de nouveaux                       │
└────────────────────────────────────────────┘
```

**Section 1 : Programmes du Référentiel**
```
┌────────────────────────────────────────────┐
│ ✏️ Programmes du Référentiel               │
├────────────────────────────────────────────┤
│ Cuisson Baguette            [✏️ Renommer] │
│ Original: Cuisson Baguette                 │
│                                            │
│ Four Principal              [✏️ Renommer] │
│ Original: Four Principal                   │
└────────────────────────────────────────────┘

Fonctionnalités :
- Liste tous les programmes du fichier Excel
- Bouton "Renommer" pour chaque programme
- Affiche le nom original si renommé
- Sauvegarde dans localStorage
```

**Section 2 : Programmes Personnalisés**
```
┌────────────────────────────────────────────┐
│ ➕ Programmes Personnalisés                │
├────────────────────────────────────────────┤
│ Production Nuit             [🗑️ Supprimer]│
│                                            │
│ [➕ Ajouter un nouveau programme]         │
└────────────────────────────────────────────┘

Fonctionnalités :
- Création de programmes custom
- Suppression possible (uniquement custom)
- Bordure verte pour différenciation
```

**Édition Inline**
```
Mode édition activé :
┌────────────────────────────────────────────┐
│ [Cuisson Baguettes_________] [💾] [✕]    │
└────────────────────────────────────────────┘

Actions :
- Input texte pour saisir nouveau nom
- Bouton sauvegarder (vert)
- Bouton annuler (gris)
- Validation non-vide
```

#### Stockage localStorage

**Clé de Stockage**
```javascript
Clé : 'bvp_programmes_personnalises'

Structure :
{
  renommages: {
    'Cuisson Baguette': 'Four Baguettes',
    'Four Principal': 'Four 1'
  },
  custom: [
    'Production Nuit',
    'Four Express'
  ]
}
```

**Fonctions du Service**
```javascript
// referentielITM8.js - Nouvelles fonctions

chargerProgrammesPersonnalises()
// Retourne { renommages: Map, custom: [] }

renommerProgramme(programmeOriginal, nouveauNom)
// Enregistre le renommage

ajouterProgrammeCustom(nomProgramme)
// Ajoute un programme personnalisé

supprimerProgrammeCustom(nomProgramme)
// Supprime un programme custom

getNomProgrammeAffiche(programmeOriginal)
// Retourne le nom affiché (avec renommage)

getListeProgrammesComplets()
// Liste complète : référentiel + custom + renommages
```

### 11.9 Outils de Debug

#### Boutons de Diagnostic

**Affichage**
```
En bas de chaque carte de production :
┌────────────────────────────────────────┐
│ [🔍 Debug Storage] [🗑️ Reset]         │
└────────────────────────────────────────┘

Style :
- Opacité 50% par défaut
- Opacité 100% au survol
- Petits boutons (text-xs)
```

**Debug Storage**
```
Action :
Affiche dans la console :
=== DEBUG LOCALSTORAGE ===
Clé: production_Lundi_BOULANGERIE_Cuisson Baguette
Données: {
  trancheActive: 'matin',
  produitsCoches: { matin: [...], ... },
  stocksRayon: {...},
  ...
}
Toutes les clés de production: [
  'production_Lundi_BOULANGERIE_Cuisson Baguette',
  'production_Mardi_VIENNOISERIE_Four Principal',
  ...
]

Utilité :
- Diagnostic problèmes de persistance
- Vérification isolation des données
- Identification clés orphelines
```

**Reset Production**
```
Action :
1. Affiche confirmation :
   "Voulez-vous réinitialiser la production pour
    BOULANGERIE - Cuisson Baguette - Lundi ?"

2. Si confirmé :
   - Supprime la clé localStorage
   - Recharge la page
   - Données remises à zéro

Utilité :
- Nettoyage données corrompues
- Test avec données fraîches
- Remise à zéro d'une production
```

### 11.10 Architecture des Composants

#### Hiérarchie
```
PlanningVueTablet.jsx (composant parent)
├── Mode Planning (accordéons)
├── Mode Production
│   ├── Sélection tranche (4 boutons)
│   ├── Navigation jours (flèches)
│   ├── Si tranche = 'casse'
│   │   └── ModeCasseGlobal.jsx
│   └── Sinon
│       └── ModeProductionEnCours.jsx (par rayon/programme)
│           └── useProductionStorage.js (hook)
└── Mode Suivi Temps Réel
    └── ModeSuiviTempsReel.jsx
```

#### Flux de Données
```
1. PlanningVueTablet gère :
   - selectedJour (état global)
   - trancheGlobale (état global)
   - Mapping 'apres-midi' → 'soir' pour données planning

2. ModeProductionEnCours reçoit :
   - jour (prop)
   - rayon (prop)
   - programme (prop)
   - produits (prop - quantités filtrées par tranche)
   - trancheActive (prop)

3. useProductionStorage gère :
   - Chargement/sauvegarde localStorage
   - Clé composite : jour + rayon + programme
   - Mutations : toggle, setStock, setCasse
```

### 11.11 Cas d'Usage

#### Scénario 1 : Production Matin
```
1. Opérateur arrive à 6h
2. Ouvre l'app sur tablette
3. Sélectionne "Production"
4. Jour = Aujourd'hui (détecté auto)
5. Tranche = Matin (bouton bleu)
6. Clique "Démarrer la production" → 6:05 enregistré
7. Pour chaque produit cuit :
   - Clic sur la ligne → checkbox verte
   - Progression mise à jour automatiquement
8. À 9h : Production terminée (100%)
9. Durée affichée : 175 minutes
```

#### Scénario 2 : Production Après-midi avec Stock
```
1. Opérateur arrive à 16h
2. Sélectionne "Après-midi" (bouton orange)
3. Voit résumé : Matin (5/5), Midi (4/5), Après-midi (0/5)
4. Pour "Baguette Blanche" :
   - Prévision : 11 Pl.
   - Va compter le rayon → reste 2.5 Pl.
   - Saisit "2.5" dans "Stock rayon"
   - Voit "À cuire : 8.5 Pl." (calculé auto)
5. Cuit 8.5 Pl. seulement
6. Coche la ligne
7. Évite le gaspillage ✅
```

#### Scénario 3 : Saisie Casse
```
1. En fin de journée (23h)
2. Opérateur sélectionne "Casse" (bouton rouge)
3. Vue alphabétique de tous les produits
4. Parcourt le rayon physiquement :
   - Baguette Blanche : 1.5 Pl. restant → saisit "1.5"
   - Croissant Beurre : 0.5 Pl. restant → saisit "0.5"
   - Pain Complet : rien → laisse vide
5. Données enregistrées pour analyse future
6. Peut ajuster les prévisions demain
```

#### Scénario 4 : Renommer Programme
```
1. Utilisateur dans "Personnalisation"
2. Clique "⚙️ Programmes"
3. Voit "Cuisson Baguette"
4. Clique "✏️ Renommer"
5. Saisit "Four Baguettes"
6. Clique "💾 Sauvegarder"
7. Partout dans l'app : "Four Baguettes" affiché
8. Sauvegardé dans localStorage
```

### 11.12 Avantages Fonctionnels

#### Pour les Opérateurs
```
✅ Interface tactile simple (gros boutons)
✅ Checklist visuelle (pas d'oubli)
✅ Suivi temps réel (progression)
✅ Historique des tranches (visibilité équipe)
✅ Calcul intelligent stock (anti-gaspillage)
✅ Saisie rapide invendus (ordre alphabétique)
```

#### Pour la Gestion
```
✅ Données de production réelles
✅ Suivi de la durée de production
✅ Identification des invendus
✅ Base pour optimiser le planning
✅ Traçabilité par jour/tranche
✅ Personnalisation des programmes
```

#### Technique
```
✅ Persistance locale (pas de connexion requise)
✅ Isolation complète des données
✅ Interface réactive (temps réel)
✅ Code modulaire (composants réutilisables)
✅ Outils de debug intégrés
✅ Extensible (nouvelles fonctionnalités faciles)
```

---

## 12. ÉVOLUTIONS FUTURES

### 11.1 Fonctionnalités Métier

#### Gestion des Stocks
```
Objectif :
- Intégrer stocks actuels rayons
- Ajuster planning selon disponibilité
- Alertes ruptures/surstocks

Fonctionnalités :
- Import stocks (Excel/CSV)
- Calcul : à cuire = planning - stock
- Export ajustements
```

#### Prévisions Avancées
```
Objectif :
- Améliorer précision potentiels
- Intégrer machine learning

Fonctionnalités :
- Détection tendances (croissance/baisse)
- Ajustement saisonnalité automatique
- Prédiction événements (météo, vacances)
```

#### Multi-Périodes
```
Objectif :
- Planifier plusieurs semaines
- Comparer périodes

Fonctionnalités :
- Vue mensuelle
- Comparaison semaines
- Historique plannings
```

#### Capacités Fours
```
Objectif :
- Contraintes physiques de production
- Optimisation cuissons

Fonctionnalités :
- Définir capacités par programme/créneau
- Alertes dépassement capacité
- Suggestions répartition
```

### 11.2 Fonctionnalités Techniques

#### Persistance Données
```
Options :
- LocalStorage (simple, limité)
- IndexedDB (performant, local)
- Firebase/Supabase (cloud, sync)

Avantages :
- Sauvegarde automatique
- Pas de perte données
- Reprise session
```

#### Backend API
```
Objectif :
- Centralisation données
- Partage multi-utilisateurs
- Synchronisation

Fonctionnalités :
- API REST (Node.js/Express)
- Base données (PostgreSQL/MongoDB)
- Authentification (JWT)
- Temps réel (WebSockets)
```

#### Export Avancé
```
Formats supplémentaires :
- Excel (.xlsx) natif (pas HTML)
- PDF direct (library jsPDF)
- API intégration (envoi email, ERP)

Templates personnalisables :
- Logo magasin
- Mise en page custom
- Filtres export (rayons, jours)
```

#### Tests et Qualité
```
Tests unitaires :
- Vitest/Jest
- Couverture services (calculators, parsers)

Tests intégration :
- React Testing Library
- Scénarios utilisateur complets

Tests E2E :
- Playwright/Cypress
- Workflow upload → export
```

### 11.3 UX/UI

#### Mode Sombre
```
Implémentation :
- Tailwind dark: variants
- Toggle utilisateur (localStorage)
- Auto selon système (prefers-color-scheme)
```

#### Tutoriel Intégré
```
Fonctionnalités :
- Tour guidé première utilisation
- Tooltips contextuels
- Vidéos démo
- Documentation inline
```

#### Raccourcis Clavier
```
Actions rapides :
- Ctrl+S : Sauvegarder config
- Ctrl+P : Imprimer planning
- Ctrl+Z : Annuler modification
- Tab : Navigation champs
```

#### Drag & Drop
```
Usages :
- Upload fichiers (zone drop)
- Réorganisation produits
- Ajustement ordre rayons/programmes
```

### 11.4 Collaboration

#### Multi-Utilisateurs
```
Fonctionnalités :
- Partage plannings (lien)
- Commentaires sur produits
- Historique modifications (qui/quand)
- Droits lecture/écriture
```

#### Multi-PDV
```
Fonctionnalités :
- Gestion plusieurs magasins
- Comparaison performances
- Consolidation données
- Répartition inter-magasins
```

#### Notifications
```
Types :
- Rappels production (push)
- Alertes stock faible
- Suggestions ajustements
- Résumés hebdo (email)
```

### 11.5 Mobile et PWA

#### Progressive Web App
```
Fonctionnalités :
- Installation (Add to Home Screen)
- Offline mode (Service Workers)
- Notifications push
- Synchronisation background
```

#### Application Mobile Native
```
Technologies :
- React Native (code partagé)
- Flutter (performances)

Fonctionnalités spécifiques :
- Scan code-barres (ITM8)
- Photo stockage rayon
- Géolocalisation magasin
```

---

## CONCLUSION

### Résumé

**BVP Planning** est une application web complète et robuste pour la gestion de la production en boulangerie-viennoiserie-pâtisserie.

### Points Forts

✅ **Automatisation** : Calculs potentiels et planning entièrement automatisés
✅ **Flexibilité** : Personnalisation complète (pondérations, potentiels, attributs)
✅ **Intelligence** : Reconnaissance ITM8 + classification mots-clés
✅ **Précision** : Formules basées sur données réelles de fréquentation
✅ **Simplicité** : Interface intuitive, workflow 3 étapes
✅ **Extensibilité** : Architecture modulaire, prête pour évolutions

### Architecture

- **Frontend** : React 18 + Tailwind CSS (moderne, performant)
- **Processing** : Client-side uniquement (sécurisé, rapide)
- **Modularité** : Composants/Services/Utils séparés (maintenable)

### Formule Clé

```
Potentiel = Vente MAX ÷ Poids du jour
→ Répartition hebdo (buffer 10%)
  → Répartition journalière (fréquentation)
    → Répartition horaire (tranches)
```

### État Actuel

🟢 **Production Ready** : Application fonctionnelle et testée
🟢 **Maintenable** : Code structuré, commenté, logique claire
🟡 **Évolutif** : Base solide pour fonctionnalités futures

---

**Document rédigé le** : 29 octobre 2025
**Version Application** : 1.3
**Dernière mise à jour** : 19 novembre 2025

### Historique des Versions

**Version 1.3** (19 novembre 2025) - Améliorations UX et Parsing :
- Bouton toggle Desktop/Tablette manuel dans le header (à côté des étapes)
- Repositionnement de la section "Type de pondération" après l'import des fichiers
- Amélioration du parsing PDV : capture complète du nom (fix regex)
- Alignement des étapes à gauche pour meilleure lisibilité
- Mode tablette activable manuellement (indépendant de la résolution d'écran)

**Version 1.2** (6 novembre 2025) - Mode Production Tablette :
- Interface tablette avec mode Production en cours
- Suivi production par tranche horaire (Matin/Midi/Après-midi/Casse)
- Persistance localStorage par jour/rayon/programme/tranche
- Gestion stock rayon pour l'après-midi (calcul Prévision - Stock = À cuire)
- Mode Casse pour enregistrer les invendus
- Interface de gestion des programmes de cuisson personnalisables
- Boutons de debug pour diagnostiquer le stockage

**Version 1.1** (30 octobre 2025) :
- Système de calcul Auto-Potentiels à 3 modes (Mathématique, Forte Progression +20%, Prudent +10%)
- Tri par défaut Rayon-Volume (BOULANGERIE → VIENNOISERIE → PATISSERIE → SNACKING → AUTRE)
- Logique NC pour produits sans cuisson (unitesParPlaque = 0)
- Simplification Rayon/Famille (rayon auto-assigné, famille masquée dans UI)
- Colonne Unités/Plaque éditable et optimisation des largeurs de colonnes

**Version 1.0** (29 octobre 2025) :
- Version initiale de l'application
