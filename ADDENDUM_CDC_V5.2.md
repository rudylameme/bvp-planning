# ADDENDUM AU CAHIER DES CHARGES V5 — MISE À JOUR V5.2

**Version** : 5.2.0
**Date** : 19 février 2026
**Statut** : Déployé sur Vercel
**Auteur** : Rudy - Service Innovation Mousquetaires
**Référence** : Ce document complète le `CAHIER_DES_CHARGES_V5.md` (V5.0.0 du 25 janvier 2026)

---

## RÉSUMÉ DES MODIFICATIONS V5.2

La mise à jour V5.2 apporte les changements suivants :

- Passage de 2 univers à **3 univers distincts** (Benchmark, Manager, Équipe)
- Ajout d'un système de **Pages Paramètres** à l'entrée de chaque univers
- **Compatibilité Firefox** via fallback File System Access API
- Interface visuelle **TranchesFamille** (barres par famille avec graduation timeline)
- **Auto-export** du fichier manager dans Etape5Communication
- **Popup aide Mercalys** avec image de configuration
- Déploiement **Vercel deux profils** (Manager = 3 univers, Équipe = Univers 3 uniquement)
- **Export Excel** dans l'Univers Équipe
- **Impression par famille** (tout en continu vs séparé par famille)
- **EAN sous la désignation** dans le Pilotage CA
- **Cartes cliquables** sur la page d'accueil
- Suppression de la Section 1 "Choix dossier/magasin" (fusionnée dans PageParametres)

---

## 1. CORRECTION ARCHITECTURE : 3 UNIVERS (remplace Section 2 du CDC V5)

### 1.1 Nouveau schéma des 3 univers

L'application passe de 2 univers à **3 univers distincts** :

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           ACCUEIL APPLICATION                                │
│                                                                              │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐    │
│  │  📊 ANALYSER       │  │  📋 PRÉPARER       │  │  👷 PLANNING       │    │
│  │  MON RAYON         │  │  LA SEMAINE        │  │  QUOTIDIEN         │    │
│  │                    │  │                    │  │                    │    │
│  │  Benchmark &       │  │  Construction du   │  │  Mise en œuvre     │    │
│  │  Stratégie         │  │  planning           │  │  terrain           │    │
│  │                    │  │                    │  │                    │    │
│  │  Univers 1         │  │  Univers 2         │  │  Univers 3         │    │
│  └────────────────────┘  └────────────────────┘  └────────────────────┘    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

| Univers | Nom | Contenu | Cible |
|---------|-----|---------|-------|
| **Univers 1** | Analyser mon rayon | Benchmark vs secteur, diagnostic stratégique | Manager (Desktop) |
| **Univers 2** | Préparer la semaine | Configuration planning, pilotage CA, communication | Manager (Desktop) |
| **Univers 3** | Planning quotidien | Planning cuisson jour, commande, inventaire | Équipe (Tablette) |

### 1.2 Correspondance avec le CDC V5

| CDC V5 (2 univers) | CDC V5.2 (3 univers) |
|---------------------|----------------------|
| Univers Manager (étapes 0-2) | **Univers 1 : Analyser** (Benchmark) |
| Univers Manager (étapes 3-5) | **Univers 2 : Préparer** (Planning semaine) |
| Univers Équipe | **Univers 3 : Planning quotidien** |

### 1.3 Cartes cliquables sur AccueilGlobal

La page d'accueil affiche 3 cartes cliquables. Chaque carte est un composant interactif avec :

- Titre de l'univers
- Sous-titre descriptif
- Numéro d'étape (Étape 1, 2, 3)
- Clic → navigation vers la PageParametres de l'univers correspondant

Les cartes n'affichées que si le profil actif le permet (voir Section 7 - Profils Vercel).

---

## 2. PAGES PARAMÈTRES (nouveau composant)

### 2.1 Concept

Chaque univers a une **page d'entrée "Paramètres"** (`PageParametres`) qui permet de configurer les fichiers et options avant d'entrer dans l'univers.

### 2.2 Composant : `src/components/shared/PageParametres.jsx`

Ce composant partagé est utilisé par les 3 univers avec des props différentes selon le contexte.

**Fonctionnalités** :

| Fonctionnalité | Description |
|----------------|-------------|
| Sélection de dossier | Sélectionner le dossier `DATA_perso` (File System Access API ou fallback) |
| Import de fichier .bvp.json | Charger un fichier de configuration manager/équipe |
| Sélection semaine | Choisir la semaine à travailler |
| Sélection magasin | Recherche par code ou ville |
| Popup aide Mercalys | Image d'aide pour configurer l'export Mercalys |

### 2.3 Persistence du DirectoryHandle

Le `DirectoryHandle` sélectionné par l'utilisateur est persisté via **IndexedDB** pour ne pas avoir à re-sélectionner le dossier à chaque visite.

```javascript
// Stockage dans IndexedDB
const DB_NAME = 'bvp-planning-db';
const STORE_NAME = 'handles';
const HANDLE_KEY = 'directoryHandle';
```

---

## 3. COMPATIBILITÉ FIREFOX (nouveau)

### 3.1 Problème

L'API `window.showDirectoryPicker()` (File System Access API) n'est supportée que sur Chrome et Edge. Firefox ne la supporte pas.

### 3.2 Solution : Détection automatique + fallback

```javascript
// Détection du support
const supportsDirectoryPicker = typeof window.showDirectoryPicker === 'function';

if (supportsDirectoryPicker) {
  // Chrome/Edge : sélection de dossier natif
  const handle = await window.showDirectoryPicker();
} else {
  // Firefox : fallback vers input file
  // <input type="file" accept=".xlsx,.json,.bvp.json" multiple />
}
```

### 3.3 Comportement par navigateur

| Navigateur | Méthode | Persistence |
|------------|---------|-------------|
| Chrome/Edge | `showDirectoryPicker()` | DirectoryHandle dans IndexedDB |
| Firefox | `<input type="file">` | Pas de persistence (re-sélection à chaque visite) |

---

## 4. INTERFACE TRANCHES PAR FAMILLE (`TranchesFamille.jsx`)

### 4.1 Concept

Dans l'Univers 2 (Préparer la semaine), l'interface `TranchesFamille` remplace l'ancien regroupement de colonnes par une **interface visuelle de barres colorées par famille**.

### 4.2 Composant : `src/components/manager/TranchesFamille.jsx`

**Affichage** :

```
┌──────────────────────────────────────────────────────────────────────────┐
│  TRANCHES HORAIRES PAR FAMILLE                                           │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Graduation:  |5h  |6h  |7h  |8h  |9h  |10h |11h |12h |13h |...  |21h │
│                                                                          │
│  BOULANGERIE  ████████████████████████████████████████                   │
│               |← 5h00  ─────────────────── 18h00 →|                     │
│               Labels : "5h-9h" "9h-12h" "12h-14h" "14h-16h" "16h-18h"  │
│                                                                          │
│  VIENNOISERIE ██████████████████████████████                             │
│               |← 6h00  ────────────── 16h00 →|                          │
│               Labels : "6h-9h" "9h-12h" "12h-14h" "14h-16h"            │
│                                                                          │
│  PÂTISSERIE   ████████████                                               │
│               |← 6h00  ── 10h00 →|  (1 cuisson/jour)                   │
│                                                                          │
│  SNACKING     ██████████████                                             │
│               |← 9h00  ── 14h00 →|  (midi)                              │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Couleurs par famille (couleurs pastel)

| Famille | Couleur |
|---------|---------|
| BOULANGERIE | Pastel Stone |
| VIENNOISERIE | Pastel Amber |
| PÂTISSERIE | Pastel Rose |
| SNACKING | Pastel Emerald |
| AUTRE | Pastel Slate |

### 4.4 Graduation Timeline

Une graduation horaire est affichée en haut des barres, de 5h à 21h, avec des traits verticaux pour chaque heure. Les barres de chaque famille s'alignent sur cette graduation pour montrer visuellement les plages de cuisson.

### 4.5 Labels dans les barres

Chaque segment de tranche horaire contient un label textuel (ex: "5h-9h", "9h-12h") affiché directement dans la barre colorée.

---

## 5. AUTO-EXPORT DANS ETAPE5COMMUNICATION (modifié)

### 5.1 Comportement précédent (CDC V5)

L'utilisateur devait cliquer manuellement sur "Exporter Fichier Manager" pour générer le fichier .bvp.json.

### 5.2 Nouveau comportement (V5.2)

Le fichier `.bvp.json` est **automatiquement exporté** dès l'arrivée sur l'Etape5Communication :

```javascript
// Dans Etape5Communication.jsx
useEffect(() => {
  // Auto-export au montage du composant
  if (directoryHandle) {
    // Chrome/Edge : écriture directe dans le dossier sélectionné
    exporterFichierManager(directoryHandle);
  } else {
    // Firefox : déclenche un téléchargement navigateur
    telechargerFichierManager();
  }
}, []);
```

### 5.3 Format du fichier

Le fichier exporté suit le schéma `.bvp.json` **version 3.0** :

```
MANAGER-{codePDV}-S{semaine}-{année}.bvp.json
```

---

## 6. POPUP AIDE MERCALYS (nouveau)

### 6.1 Concept

Un bouton d'aide (icône `?`) dans la PageParametres ouvre une **popup modale** affichant une image de configuration Mercalys. Cette image guide l'utilisateur pour paramétrer correctement l'export depuis le logiciel Mercalys.

### 6.2 Implémentation

```javascript
// Dans PageParametres.jsx
const [showMercalysHelp, setShowMercalysHelp] = useState(false);

// Bouton d'aide
<button onClick={() => setShowMercalysHelp(true)}>
  ? Comment configurer Mercalys
</button>

// Modal avec image
{showMercalysHelp && (
  <Modal onClose={() => setShowMercalysHelp(false)}>
    <img src="/images/mercalys-config.png" alt="Configuration Mercalys" />
  </Modal>
)}
```

---

## 7. DÉPLOIEMENT VERCEL — DEUX PROFILS (nouveau)

### 7.1 Concept

L'application est déployée sur Vercel en **deux versions distinctes** à partir du même code source, grâce à la variable d'environnement `VITE_PROFIL`.

### 7.2 Profils

| Profil | Variable | Univers visibles | URL Vercel |
|--------|----------|-------------------|------------|
| **Manager** | `VITE_PROFIL=manager` | Univers 1 + 2 + 3 (tout) | `dist-manager.vercel.app` |
| **Équipe** | `VITE_PROFIL=equipe` | Univers 3 uniquement | `dist-equipe.vercel.app` |
| **All** (dev) | `VITE_PROFIL=all` | Univers 1 + 2 + 3 | `localhost:5173` |

**Important** : Le profil Manager a accès aux **3 univers** (pas seulement 1 et 2). Le profil Équipe est limité à l'Univers 3.

### 7.3 Fichiers d'environnement

```
.env              → VITE_PROFIL=all (dev local)
.env.manager      → VITE_PROFIL=manager
.env.equipe       → VITE_PROFIL=equipe
```

### 7.4 Scripts de build

```json
{
  "scripts": {
    "dev": "vite",
    "dev:manager": "vite --mode manager",
    "dev:equipe": "vite --mode equipe",
    "build": "vite build",
    "build:manager": "vite build --mode manager",
    "build:equipe": "vite build --mode equipe"
  }
}
```

### 7.5 Implémentation dans AppV5.jsx

```javascript
// Lecture du profil
const PROFIL = import.meta.env.VITE_PROFIL || 'all';
const isManager = PROFIL === 'manager' || PROFIL === 'all';
const isEquipe = PROFIL === 'equipe' || PROFIL === 'all' || PROFIL === 'manager';
//                                                            ↑ Manager voit TOUT

// État initial selon le profil
const [ecran, setEcran] = useState(() => {
  if (PROFIL === 'equipe') return 'params-equipe'; // Accès direct Univers 3
  return 'accueil';
});

// Rendu conditionnel sur AccueilGlobal
<AccueilGlobal
  onChoixAdherent={isManager ? allerParamsBenchmark : null}
  onChoixManager={isManager ? allerParamsManager : null}
  onChoixEquipe={isEquipe ? allerParamsEquipe : null}
/>
```

### 7.6 Gardes de navigation

Des gardes empêchent l'accès aux écrans hors profil :

```javascript
case 'params-benchmark':
case 'benchmark':
  if (!isManager) { setEcran('accueil'); return null; }
  break;

case 'params-manager':
case 'manager':
  if (!isManager) { setEcran('accueil'); return null; }
  break;

case 'params-equipe':
case 'equipe':
  if (!isEquipe) { setEcran('accueil'); return null; }
  break;
```

### 7.7 Configuration Vercel — 3 projets

| Projet Vercel | URL | Version | Auto-deploy | Build Command |
|---------------|-----|---------|-------------|---------------|
| `dist-manager` | `dist-manager.vercel.app` | V5.3+ (courante) | **Oui** | `npm run build:manager` |
| `dist-equipe` | `dist-equipe.vercel.app` | V5.3+ (courante) | **Oui** | `npm run build:equipe` |
| `bvp-planning` | `bvp-planning.vercel.app` | **V4 (figée)** | **Non** | `npm run build` |

**Important — bvp-planning.vercel.app (V4)** :
- Ce projet est **figé** sur la version V4 (wizard 4 étapes : Chargement → Personnalisation → Semaine → Planning)
- L'auto-deploy est désactivé via `commandForIgnoringBuildStep: "exit 0"` (API Vercel, configuré le 09/03/2026)
- Le domaine pointe sur le déploiement du commit `a07d862` (dernière version V4 fonctionnelle)
- **NE JAMAIS réactiver l'auto-deploy** sur ce projet sans accord explicite de l'utilisateur

### 7.8 Titre dynamique

Le titre de la page est dynamique selon le profil :

```html
<!-- index.html -->
<title>%VITE_APP_TITLE%</title>
```

- Manager : "BVP Planning - Manager"
- Équipe : "BVP Planning - Équipe"
- Dev : "BVP Planning"

### 7.9 vercel.json (SPA routing)

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## 8. EXPORT EXCEL DANS L'UNIVERS ÉQUIPE (nouveau)

L'Univers Équipe (Univers 3) permet d'exporter le planning du jour au format Excel (.xlsx). Cette fonctionnalité complète l'impression PDF déjà existante.

---

## 9. IMPRESSION PAR FAMILLE (nouveau)

### 9.1 Concept

Lors de l'impression du planning, l'utilisateur peut choisir entre deux modes :

| Mode | Description |
|------|-------------|
| **Tout en continu** | Tous les produits sur une seule feuille, séparés par des en-têtes de famille |
| **Séparé par famille** | Chaque famille sur une feuille distincte (saut de page entre familles) |

### 9.2 Interface

Un sélecteur radio ou toggle est disponible avant l'impression :

```
[○ Tout en continu]  [● Séparé par famille]
```

---

## 10. EAN SOUS LA DÉSIGNATION (modification Pilotage CA)

### 10.1 Modification

Dans le tableau des produits du Pilotage CA (Étape 4, Univers 2), le **code EAN** est désormais affiché sous le libellé du produit, en texte gris plus petit.

### 10.2 Affichage

```
│ Baguette blanche PAC 250g     │ 3.2%  │ 280  │ 320€  │
│ EAN: 3254560000123             │       │      │       │
```

---

## 11. SUPPRESSION SECTION 1 — FUSION DANS PAGEPARAMETRES

### 11.1 Modification

L'ancienne Section 1 du wizard manager ("Choix dossier / Choix magasin") a été **supprimée** et ses fonctionnalités ont été **fusionnées dans PageParametres**.

### 11.2 Impact

- Le composant `EtapeConfigPlanning.jsx` a été renuméroté
- Les sections du wizard sont renumérotées à partir de la Section 2
- L'import des données se fait désormais dans PageParametres avant d'entrer dans le wizard

---

## 12. STRUCTURE DE FICHIERS MISE À JOUR

### 12.1 Nouveaux fichiers / modifications

| Fichier | Action | Description |
|---------|--------|-------------|
| `src/components/shared/PageParametres.jsx` | **Nouveau** | Page d'entrée paramètres pour chaque univers |
| `src/components/manager/TranchesFamille.jsx` | **Nouveau** | Interface barres visuelles par famille |
| `src/components/AccueilGlobal.jsx` | **Modifié** | 3 cartes cliquables, affichage conditionnel selon profil |
| `src/AppV5.jsx` | **Modifié** | Système de profils VITE_PROFIL, gardes de navigation |
| `src/components/manager/Etape5Communication.jsx` | **Modifié** | Auto-export au montage |
| `src/components/manager/EtapeConfigPlanning.jsx` | **Modifié** | Renumérotation sections |
| `.env` / `.env.manager` / `.env.equipe` | **Nouveaux** | Variables d'environnement par profil |
| `vercel.json` | **Nouveau** | SPA rewrites pour Vercel |
| `index.html` | **Modifié** | Titre dynamique `%VITE_APP_TITLE%` |
| `package.json` | **Modifié** | Scripts build:manager, build:equipe, dev:manager, dev:equipe |

---

## 13. RÉSUMÉ DES 7 DEMANDES INITIALES + 7 CORRECTIONS

### 13.1 Demandes initiales

| # | Demande | Statut |
|---|---------|--------|
| A | Pages Paramètres à l'entrée de chaque univers | ✅ Implémenté |
| 1 | Compatibilité Firefox (fallback File System Access API) | ✅ Implémenté |
| 2 | Export Excel dans l'Univers Équipe | ✅ Implémenté |
| 3 | Impression par famille (continu vs séparé) | ✅ Implémenté |
| 4 | EAN sous la désignation dans Pilotage CA | ✅ Implémenté |
| 5 | Tranches par famille (barres visuelles) | ✅ Implémenté |
| 6 | Cartes cliquables sur la page d'accueil | ✅ Implémenté |
| 7 | Popup aide Mercalys avec image de configuration | ✅ Implémenté |

### 13.2 Corrections successives

| # | Correction | Statut |
|---|-----------|--------|
| C1 | Couleurs pastel par famille dans TranchesFamille | ✅ Corrigé |
| C2 | Labels dans les barres (texte visible) | ✅ Corrigé |
| C3 | Graduation timeline (heures de 5h à 21h) | ✅ Corrigé |
| C4 | Renumérotation sections après suppression Section 1 | ✅ Corrigé |
| C5 | Auto-export au montage dans Etape5Communication | ✅ Corrigé |
| C6 | Fallback téléchargement navigateur si pas de DirectoryHandle | ✅ Corrigé |
| C7 | Persistence IndexedDB du DirectoryHandle | ✅ Corrigé |

### 13.3 Déploiement Vercel

| Action | Statut |
|--------|--------|
| Création fichiers .env par profil | ✅ Fait |
| Scripts build/dev par profil dans package.json | ✅ Fait |
| Système de profils dans AppV5.jsx | ✅ Fait |
| Affichage conditionnel AccueilGlobal.jsx | ✅ Fait |
| Configuration Vercel dist-manager | ✅ Configuré |
| Configuration Vercel dist-equipe | ✅ Configuré |
| Correction Manager = 3 univers (pas 2) | ✅ Corrigé |

---

## 14. VÉRIFICATIONS

1. `npm run build` (mode all) → 3 univers visibles, 1018 KB
2. `npm run build:manager` → 3 univers visibles (manager voit tout), 826 KB
3. `npm run build:equipe` → Univers 3 uniquement, accès direct PageParametres, 605 KB
4. `dist-manager.vercel.app` → 3 univers (Analyser + Préparer + Planning)
5. `dist-equipe.vercel.app` → Univers 3 uniquement (Planning quotidien)

---

**Document rédigé le 19 février 2026**
**Version 5.2.0**
**Statut : Déployé en production sur Vercel**

---
---

# ADDENDUM V5.3 — MISE À JOUR DU 23 FÉVRIER 2026

**Version** : 5.3.0
**Date** : 23 février 2026
**Statut** : En cours de déploiement
**Auteur** : Rudy - Service Innovation Mousquetaires
**Référence** : Ce document complète l'`ADDENDUM_CDC_V5.2.md` (V5.2.0 du 19 février 2026)

---

## RÉSUMÉ DES MODIFICATIONS V5.3

La mise à jour V5.3 apporte les changements suivants :

- **Export Excel vue semaine** : le bouton Excel génère désormais un fichier avec tous les jours de la semaine (et non plus un seul jour)
- **Colonnes PLU et EAN séparées** dans l'export Excel (anciennement une seule colonne "Code PLU/EAN")
- **Date complète sur les fiches d'impression** : "Lundi 23 Mars 2026" au lieu de "Lundi"
- **Correction bug fuseau horaire UTC** : les dates dans les fichiers .bvp.json et à l'écran étaient décalées de -1 jour en France
- **Propagation de `dateDebut`** dans la configuration Équipe pour l'affichage des dates
- **Correction `repartitionParFamille`** : la répartition tranches/journalier par famille est désormais déduite dynamiquement de la configuration du manager (et non plus codée en dur)
- **Documentation de la vraie structure** du fichier MANAGER `.bvp.json` (schemaVersion 3.0)

---

## 1. EXPORT EXCEL — VUE SEMAINE (modifie la Section 8 de l'addendum V5.2)

### 1.1 Comportement précédent (V5.2)

Le bouton Excel exportait le planning du **jour sélectionné** uniquement, avec une colonne unique "Code PLU/EAN".

### 1.2 Nouveau comportement (V5.3)

Le bouton Excel génère un fichier `.xlsx` avec **tous les 7 jours de la semaine**.

### 1.3 Structure du fichier Excel — Vue semaine

```
Famille | Programme | Produit | Code PLU | Code EAN | Lundi - Matin | Lundi - 12h-14h | ... | Total Lundi | Mardi - Matin | ... | Total Mardi | ... | Total Semaine
```

| Colonne | Description |
|---------|-------------|
| Famille | Nom de la famille (BOULANGERIE, VIENNOISERIE, etc.) |
| Programme | Programme de cuisson |
| Produit | Libellé du produit (personnalisé si modifié) |
| **Code PLU** | Code point de vente (nouveau — anciennement fusionné avec EAN) |
| **Code EAN** | Code-barres EAN13 ou ITM8 (nouveau — anciennement fusionné avec PLU) |
| {Jour} - {Tranche} | Quantité préconisée par tranche horaire pour ce jour |
| Total {Jour} | Somme des quantités du jour |
| Total Semaine | Somme des 7 jours |

### 1.4 Nom du fichier

```
Planning-Semaine-S{numéro}-{codePDV}.xlsx
```

Exemple : `Planning-Semaine-S13-2023.xlsx`

### 1.5 Modes d'export

| Mode | Résultat |
|------|----------|
| **Continu** | 1 seul onglet "Planning Semaine" avec toutes les familles |
| **Séparé** | 1 onglet par famille (nom de l'onglet = nom de la famille) |

Le filtre de familles sélectionnées (`famillesImpression`) est respecté.

### 1.6 Vue jour (rétrocompatibilité)

L'ancienne vue jour reste accessible via l'option `vueSemaine: false` dans le code. Elle utilise le même format avec PLU/EAN séparés :

```
Famille | Programme | Produit | Code PLU | Code EAN | [tranches] | Total jour | Historique
```

Fichier nommé : `Planning-{Jour}-S{sem}-{codePDV}.xlsx`

### 1.7 Fichier source

`src/components/equipe/planning/exportExcel.js`

---

## 2. DATE COMPLÈTE SUR LES FICHES D'IMPRESSION

### 2.1 Comportement précédent (V5.2)

L'en-tête des fiches d'impression affichait simplement le nom du jour : "Planning **Lundi**".

### 2.2 Nouveau comportement (V5.3)

L'en-tête affiche la date complète : "Planning **Lundi 23 Mars 2026**".

### 2.3 Format de la date

La date est formatée via `toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })` avec première lettre en majuscule.

### 2.4 Calcul de la date

| Priorité | Source | Condition |
|----------|--------|-----------|
| 1 | `configuration.dateDebut` | Si présent dans le fichier .bvp.json → calcul date = dateDebut + indexJour |
| 2 | `configuration.semaine` + `configuration.annee` | Si dateDebut absent → calcul ISO de la date depuis le numéro de semaine |
| 3 | Nom du jour seul | Si aucune donnée disponible → fallback "Lundi", "Mardi", etc. |

### 2.5 Application

La date complète est affichée dans :

- L'en-tête de chaque fiche (`header-jour`)
- Le bandeau famille (mode séparé)
- Le pied de page

### 2.6 Impression semaine

`handlePrintSemaine()` génère 7 fiches (Lundi → Dimanche), chacune avec sa propre date complète. Saut de page A4 entre chaque fiche.

### 2.7 Fichier source

`src/components/equipe/planning/SectionImpression.jsx`

---

## 3. CORRECTION BUG FUSEAU HORAIRE UTC

### 3.1 Description du bug

La fonction `getDateDebutSemaine()` dans `Etape5Communication.jsx` utilisait `toISOString().split('T')[0]` pour formater la date du lundi de la semaine. `toISOString()` convertit en **UTC**, ce qui en France (UTC+1) transformait un lundi à 00:00 heure locale en dimanche 23:00 UTC, stockant ainsi la date de la **veille** dans le fichier .bvp.json.

**Conséquence** : toutes les dates affichées côté Équipe étaient décalées de -1 jour.

### 3.2 Correction à la source

Remplacement de `toISOString().split('T')[0]` par `formatDateLocale()` qui utilise `getFullYear()`, `getMonth()`, `getDate()` en heure locale :

```javascript
const formatDateLocale = (d) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};
```

### 3.3 Rétrocompatibilité pour les anciens fichiers

Les fichiers .bvp.json déjà exportés contiennent une `dateDebut` décalée (dimanche au lieu de lundi). Deux corrections de rétrocompatibilité :

| Fichier | Correction |
|---------|-----------|
| `helpers.js` | Parsing en heure locale avec `new Date(year, month-1, day)` au lieu de `new Date("YYYY-MM-DD")` |
| `helpers.js` | Si `dateDebut` tombe un dimanche (jour 0) → avancer de +1 jour pour retrouver le lundi |

### 3.4 Propagation de dateDebut

Le fichier `AccueilEquipe.jsx` ne transmettait pas `dateDebut` dans l'objet `configuration` passé à `PlanningJour`. Ajouté :

```javascript
dateDebut: fichierCharge.semaine?.dateDebut || fichierCharge.configuration?.dateDebut || '',
```

### 3.5 Règle pour les développeurs

**⚠️ NE JAMAIS utiliser `toISOString().split('T')[0]` pour formater une date locale en YYYY-MM-DD.** Toujours utiliser `formatDateLocale()` ou construire la date avec `new Date(year, month-1, day)`.

### 3.6 Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| `src/components/manager/Etape5Communication.jsx` | `toISOString()` → `formatDateLocale()` |
| `src/components/equipe/planning/helpers.js` | Parsing local + correction dimanche → lundi |
| `src/components/equipe/AccueilEquipe.jsx` | Propagation de `dateDebut` |
| `src/components/equipe/planning/SectionImpression.jsx` | Date complète formatée dans les en-têtes |

---

## 4. CORRECTION `repartitionParFamille` DANS LE FICHIER MANAGER

### 4.1 Description du bug

Dans `Etape5Communication.jsx`, la propriété `repartitionParFamille` de l'archive `.bvp.json` était **codée en dur** avec des valeurs par défaut (BOULANGERIE: 'tranches', PATISSERIE: 'journalier', etc.). Si le manager modifiait le nombre de tranches d'une famille dans l'interface `TranchesFamille` (Etape3Configuration), ce changement n'était pas reflété dans le fichier exporté.

### 4.2 Règle métier

C'est le **manager** (et non l'équipe) qui décide si une famille est produite en mode "tranches" (plusieurs cuissons par jour) ou "journalier" (une seule production pour la journée). Ce choix est défini via l'interface des tranches par famille à l'étape 3 de la configuration.

### 4.3 Correction

La `repartitionParFamille` est désormais **déduite automatiquement** de `tranchesParFamille` :

| Condition | Mode déduit |
|-----------|-------------|
| La famille a **plus d'1 tranche** (ex: `[[0,1],[2],[3],[4,5]]`) | `'tranches'` |
| La famille a **1 seule tranche** couvrant toute la journée (ex: `[[0,1,2,3,4,5]]`) | `'journalier'` |

### 4.4 Valeurs par défaut (si `tranchesParFamille` absent)

En cas de fichier sans `tranchesParFamille` (rétrocompatibilité), les valeurs par défaut restent :

| Famille | Mode par défaut |
|---------|----------------|
| BOULANGERIE | tranches (4 cuissons) |
| VIENNOISERIE | tranches (3 cuissons) |
| PATISSERIE | journalier |
| SNACKING | journalier |
| AUTRE | journalier |

### 4.5 Fichier source

`src/components/manager/Etape5Communication.jsx` (lignes 231-244)

---

## 5. STRUCTURE RÉELLE DU FICHIER MANAGER `.bvp.json` (remplace Section 6.1 du CDC V5)

Le CDC V5 (section 6.1) décrivait une structure théorique (`version: "5.0"`, `type: "fichier_manager"`) qui ne correspond pas au code réel. Voici la **vraie structure** générée par `Etape5Communication.jsx` :

### 5.1 Nom du fichier

```
MANAGER-{codePDV}-S{semaine sur 2 chiffres}-{année}.bvp.json
```

Exemple : `MANAGER-02023-S09-2026.bvp.json`

### 5.2 Structure JSON (schemaVersion 3.0)

```json
{
  "schemaVersion": "3.0",
  "type": "planning-archive",
  "exportDate": "2026-02-23T10:30:00.000Z",

  "magasin": {
    "code": "02023",
    "nom": "BEAUFORT EN VALLEE"
  },

  "semaine": {
    "numero": 9,
    "annee": 2026,
    "dateDebut": "2026-02-23",
    "dateFin": "2026-03-01"
  },

  "configuration": {
    "joursActifs": ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"],
    "creneaux": { "lundi": { "0": "ouvert", "1": "ouvert", ... }, ... },
    "regroupements": null,
    "nbTranches": 4,
    "tranchesParFamille": {
      "BOULANGERIE": [[0,1], [2], [3], [4,5]],
      "VIENNOISERIE": [[0,1], [2,3], [4,5]],
      "PATISSERIE": [[0,1,2,3,4,5]],
      "SNACKING": [[0,1], [2,3,4,5]]
    },
    "livraisons": [
      { "id": 1, "dateCommande": "...", "dateReception": "...", "label": "Livraison 1" }
    ],
    "operationsSpeciales": [],
    "repartitionParFamille": {
      "BOULANGERIE": "tranches",
      "VIENNOISERIE": "tranches",
      "PATISSERIE": "journalier",
      "SNACKING": "journalier"
    }
  },

  "promotions": [ ... ],

  "objectifs": {
    "caHistorique": 5000,
    "objectifPourcent": 3,
    "caPrevision": 5150
  },

  "produits": [
    {
      "id": "...",
      "libelle": "Baguette blanche PAC 250g",
      "plu": "1107",
      "ean": "3250390005...",
      "famille": "BOULANGERIE",
      "programme": "...",
      "quantites": { "lundi": 40, "mardi": 35, ... },
      "repartitionJours": { "lundi": 40, "mardi": 35, ... }
    }
  ],

  "frequentation": { ... },

  "commandes": { ... },

  "personnalisationProduits": { ... },

  "referentiel": {
    "version": "ITM8-2026",
    "inclus": true,
    "familles": ["BOULANGERIE", "VIENNOISERIE", "PATISSERIE", "SNACKING"],
    "source": "liste des produits BVP treville.xlsx"
  }
}
```

### 5.3 Différences avec le CDC V5 (section 6.1)

| Aspect | CDC V5 (théorique) | Code réel (V5.3) |
|--------|-------------------|------------------|
| Version | `"version": "5.0"` | `"schemaVersion": "3.0"` |
| Type | `"fichier_manager"` | `"planning-archive"` |
| Clé magasin | `metadata.magasin` | `magasin` (racine) |
| Clé semaine | `metadata.semaine` | `semaine` (racine) |
| Produits | `gamme_active` avec `quantites_jour` par tranche | `produits` avec `quantites` par jour |
| Besoins | `besoins_semaine` | absent (calculé côté équipe) |
| Tranches par famille | absent | `configuration.tranchesParFamille` |
| Répartition par famille | absent | `configuration.repartitionParFamille` (déduit dynamiquement) |
| Fréquentation | absent | `frequentation` (racine) |
| Personnalisations | absent | `personnalisationProduits` (racine) |

### 5.4 Fichier source

`src/components/manager/Etape5Communication.jsx` — fonction `construireArchive()` (lignes 73-262)

---

## 6. RÉSUMÉ DES MODIFICATIONS V5.3

### 6.1 Nouvelles fonctionnalités

| # | Fonctionnalité | Statut |
|---|---------------|--------|
| 1 | Export Excel vue semaine (7 jours avec tranches) | ✅ Implémenté |
| 2 | Colonnes PLU et EAN séparées dans l'export Excel | ✅ Implémenté |
| 3 | Date complète sur les fiches d'impression | ✅ Implémenté |

### 6.2 Corrections

| # | Correction | Statut |
|---|-----------|--------|
| C1 | Bug UTC `toISOString()` → dateDebut décalée de -1 jour | ✅ Corrigé |
| C2 | Propagation `dateDebut` dans configuration Équipe | ✅ Corrigé |
| C3 | Rétrocompatibilité anciens fichiers .bvp.json (dimanche → lundi) | ✅ Corrigé |
| C4 | Parsing date en heure locale dans `helpers.js` | ✅ Corrigé |
| C5 | `repartitionParFamille` codée en dur → déduite de `tranchesParFamille` | ✅ Corrigé |

### 6.3 Documentation

| # | Modification | Statut |
|---|-------------|--------|
| D1 | Structure réelle du fichier MANAGER .bvp.json documentée (remplace CDC V5 section 6.1) | ✅ Documenté |

### 6.4 Fichiers modifiés

| Fichier | Action |
|---------|--------|
| `src/components/equipe/planning/exportExcel.js` | **Modifié** — Vue semaine + PLU/EAN séparés |
| `src/components/equipe/planning/SectionImpression.jsx` | **Modifié** — Date complète dans en-têtes |
| `src/components/equipe/planning/helpers.js` | **Modifié** — Parsing local + rétrocompat dimanche |
| `src/components/equipe/AccueilEquipe.jsx` | **Modifié** — Propagation dateDebut |
| `src/components/manager/Etape5Communication.jsx` | **Modifié** — formatDateLocale() + repartitionParFamille dynamique |

---

## 17. NETTOYAGE INTELLIGENT DE LA GAMME (V5.3)

### 17.1 Fonctionnalité

À l'étape "Pilotage CA", la gamme (~300 produits) est automatiquement nettoyée par un pipeline de 6 passes :

1. **Promos** — Produits commençant par `*` désactivés
2. **PRE/PAC** — Versions PRE désactivées si un équivalent PAC existe
3. **Doublons** — Fusion des doublons (même libellé normalisé), CA le plus élevé conservé
4. **Hors saison** — Galettes (janv.), Noël/bûches (nov-déc.), même sur produits déjà inactifs
5. **Matching V2** — Enrichissement via référentiel V2 (ITM8, EAN, sous-chaîne, fuzzy Jaccard). Ajout des produits V2 non matchés comme "à créer"
6. **Corrections manuelles** — Application des séparations/fusions manuelles (localStorage)

### 17.2 Corrections V1 appliquées le 23/02/2026

| Bug | Problème | Correction |
|-----|----------|------------|
| Bug 3 | PRE/PAC pas détectés (fusion doublons avant PRE/PAC) | Inverser l'ordre : PRE/PAC (passe 2) avant doublons (passe 3) |
| Bug 2 | Galettes pas marquées hors-saison (déjà inactives comme promo) | Hors-saison s'applique aussi aux produits inactifs |
| Bug 1 | Presque tout en rayon AUTRE (EAN V2 incompatibles) | Enrichissement rayon depuis ref V2 + heuristique élargie |
| Bug 4 | 266 "à créer" (seuil fuzzy trop strict) | Seuil 0.4, score pondéré, matching sous-chaîne, filtre P&C |
| Bug 5 | Pas de gestion manuelle des doublons | Boutons Séparer/Fusionner dans OngletGamme |

### 17.2b Corrections V2 appliquées le 23/02/2026

| Bug | Problème | Correction | Fichier |
|-----|----------|------------|---------|
| Bug critique | Archive `.bvp.json` écrase `actif` et `rayon` posés par le nettoyage | Ne pas écraser `actif` si `raisonDesactivation` défini, ne pas écraser `rayon` si `matchRefV2` défini | `MagasinContext.jsx` L110-111 |
| Bug secondaire | Faux positifs fuzzy (1 seul token commun, ex: BUGNES→ENTREMET sur "CITRON") | Exiger ≥2 tokens communs pour valider un match fuzzy | `nettoyageGamme.js` L276 |

### 17.2c Corrections V3 appliquées le 24/02/2026

| # | Problème | Correction | Fichier |
|---|----------|------------|---------|
| C1 | Normaliseur lacunaire : fractions "1/2" mal traitées, "/" pas séparateur, nombres seuls conservés | Fractions→DEMI/TIERS/QUART, "/"→espace, retrait nombres 2-4 chiffres, X\d+, D\d+, OFF, S.A | `nettoyageGamme.js` |
| C2 | Fuzzy match exact uniquement : FOUR≠FOURRES, POM≠POMME | `scoreTokens()` avec préfixe (min 3 chars, score 0.7), matching bijectif dans `calculerScore()` | `nettoyageGamme.js` |
| C3 | Heuristique rayon incomplète | Ajout canelé, meringue, moelleux, opéra, tropézienne, fraisier, millefeuille, gaufre, tiramisu... (PATISSERIE) + pavé, miche, boule, campagn (BOULANGERIE) | `gammeExtractionService.js` |

### 17.3 Interface utilisateur

- **Tags visuels** : badges colorés (Promo, Hors saison, → version PAC, Doublon fusionné, À créer, P&C)
- **Compteurs** : actifs, promos, doublons, hors saison, à créer
- **Filtre par statut** : Tous / Actifs / Désactivés / À créer
- **Bouton Séparer** : réactive un produit marqué doublon
- **Bouton Fusionner...** : ouvre une mini-liste pour fusionner manuellement

### 17.4 Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/services/nettoyageGamme.js` | **Modifié** — 6 passes, corrections manuelles, score pondéré, sous-chaîne, filtre P&C |
| `src/services/gammeExtractionService.js` | **Modifié** — Heuristique rayon élargie |
| `src/components/manager/pilotage/OngletGamme.jsx` | **Modifié** — Boutons Séparer/Fusionner, ModalFusionner |
| `src/components/manager/Etape4PilotageCA.jsx` | **Modifié** — onReloadGamme pour corrections manuelles |
| `src/contexts/MagasinContext.jsx` | **Modifié** — Protection archive vs nettoyage (actif + rayon) |

---

---

## 18. CONFIGURATION VERCEL — PROTECTION V4 (09/03/2026)

### 18.1 Contexte

Le projet Vercel `bvp-planning` (URL : `bvp-planning.vercel.app`) hébergeait historiquement la version V4 de l'application. Suite aux push V5.2/V5.3 sur la branche `main`, ce projet s'est automatiquement mis à jour, écrasant la V4.

### 18.2 Actions correctives

| Action | Détail |
|--------|--------|
| Désactivation auto-deploy | `commandForIgnoringBuildStep: "exit 0"` via API Vercel PATCH `/v9/projects/{id}` |
| Restauration V4 | Alias du domaine `bvp-planning.vercel.app` vers le déploiement `dpl_8P9cku7cod7v3acCKSKF4V5mtnDH` (commit `a07d862`) via API Vercel POST `/v2/deployments/{id}/aliases` |

### 18.3 État final des 3 sites Vercel

| Site | Version | Auto-deploy | Remarque |
|------|---------|-------------|----------|
| `bvp-planning.vercel.app` | V4 (figée) | Non | Wizard 4 étapes, ne sera plus mis à jour |
| `dist-manager.vercel.app` | V5.3+ | Oui | 3 univers (Benchmark + Manager + Équipe) |
| `dist-equipe.vercel.app` | V5.3+ | Oui | Univers Équipe uniquement |

### 18.4 Règle

**⚠️ NE JAMAIS réactiver l'auto-deploy sur `bvp-planning`** sans accord explicite de l'utilisateur. Ce site doit rester sur la V4.

---

## 19. REPORT DE GAMME MANAGER — RÈGLE FONDAMENTALE (18/03/2026)

### 19.1 Principe

**Le fichier MANAGER .bvp.json est la SOURCE DE VÉRITÉ pour la gamme du magasin.**

Le nettoyage automatique et l'archive sont MUTUELLEMENT EXCLUSIFS :
- **Archive trouvée** → les ventes brutes sont enrichies avec les choix de l'archive, ZÉRO nettoyage
- **Pas d'archive** → les ventes brutes sont nettoyées (6 passes) — comportement premier usage
- **Switch "Nettoyage"** → les ventes brutes sont nettoyées à la demande, l'archive est ignorée

Le nettoyage ne s'exécute JAMAIS quand une archive est présente, sauf demande explicite du manager (switch). Les ventes brutes (avant tout nettoyage ou application d'archive) sont conservées dans `produitsVentesBrutes` pour permettre le switch à tout moment.

Le travail de validation de la gamme par le magasin (activation/désactivation produit par produit, ~100 produits sur ~600 lignes) est un travail long (30-60 min) qui n'est fait qu'UNE SEULE FOIS. Ensuite, la gamme est reprise telle quelle semaine après semaine. Seules les données de ventes (moyennes, CA, tendances) sont rafraîchies.

### 19.2 Cas d'usage

| Cas | Scénario | Recherche archive | Comportement |
|-----|----------|-------------------|--------------|
| **A** | Manager refait la même semaine (ex: mercredi S12, ajuste pour jeudi-dimanche) | Chercher MANAGER S12 en premier | Reprendre intégralement la gamme S12 existante |
| **B** | Manager démarre une nouvelle semaine (S12 → S13) | S13 pas trouvé → chercher S12 | Reprendre intégralement la gamme S12, enrichir avec les nouvelles données de ventes |
| **C** | Équipe le dimanche S11 prépare le lundi S12 | L'Espace Équipe charge le fichier MANAGER S12 tel quel | Aucun recalcul, le fichier est lu directement |
| **D** | Premier usage (aucun fichier MANAGER existant) | Rien trouvé | Lancer le nettoyage automatique classique (comportement actuel) |

### 19.3 Ordre de recherche des archives

Quand le Manager démarre une planification pour la semaine S(n) :

1. **Scanner TOUS les fichiers** MANAGER-{codePDV}-S{XX}-{YYYY}.bvp.json du dossier d'archives
2. **Prendre le plus récent** (année + semaine la plus élevée)
3. **Si même semaine** → reprendre gamme + quantités planifiées (cas A)
4. **Si semaine différente** → reprendre la gamme uniquement (actif/inactif, rayon, programme, lots), remettre quantités à zéro (cas B amélioré)
5. **Si aucun fichier trouvé** → nettoyage automatique (cas D)

Justification : la gamme est un travail cumulatif. Si le manager a pris de l'avance (ex: fichier S15 existe et on travaille S12), S15 contient les choix de gamme les plus à jour.

### 19.4 Comportement quand une archive est trouvée

**Par défaut : la gamme de l'archive PRIME sur le nettoyage automatique.**

Concrètement :
- Les flags `actif` / `inactif` de chaque produit de l'archive sont appliqués aux produits de la nouvelle extraction de ventes
- Le matching se fait par `ean13` (priorité 1), `itm8` (priorité 2), ou `libelle normalisé` (priorité 3)
- Les champs suivants sont repris de l'archive : `actif`, `famille`, `rayon`, `programme`, `unitesParPlaque`, `unitesParLot`, `planifieManager`
- Les champs suivants sont rafraîchis depuis les nouvelles données de ventes : `moyenneHebdo`, `caSemaine`, `potentiel`, `tendance`, `fiabilite`, `ventesQuotidiennes`
- Les produits présents dans l'archive mais ABSENTS des nouvelles ventes sont conservés avec leurs données d'archive (moyennes à 0 si pas de ventes récentes)
- Les produits présents dans les nouvelles ventes mais ABSENTS de l'archive sont ajoutés comme `actif: false` (le magasin ne les avait pas sélectionnés)

**Le nettoyage automatique (desactiverFaibleCA, détection doublons, etc.) NE S'APPLIQUE PAS quand une archive est trouvée.** Seule la détection saisonnière (galettes en mars, etc.) peut s'appliquer avec un avertissement visuel.

### 19.5 Switch "Gamme magasin / Nettoyage auto"

Un switch est affiché en haut de l'onglet Gamme (Étape 4 — Pilotage CA) quand une archive est trouvée :

- **Gamme magasin** (défaut, gauche, bordeaux) : les choix du magasin sont repris depuis l'archive la plus récente. Aucun nettoyage automatique.
- **Nettoyage auto** (droite, ambre) : le nettoyage 6 passes s'applique sur l'extraction de ventes fraîche, comme s'il n'y avait pas d'archive.

Les deux versions sont conservées en mémoire (`produitsGamme` et `produitsGammeNettoyage` dans MagasinContext). Le manager peut basculer sans perdre de données.
Le switch n'apparaît PAS quand aucune archive n'existe (cas D — nettoyage automatique par défaut).

### 19.6 Ce qui NE DOIT PAS arriver

- Le nettoyage automatique désactive des produits que le magasin avait activés
- Le nettoyage automatique active des produits que le magasin avait désactivés
- La fusion de doublons refait ses propres choix sans respecter les choix du magasin
- La fonction desactiverFaibleCA retire des produits validés par le magasin
- Les réglages (familles, programmes, lots, plaques) sont recalculés alors qu'ils étaient déjà fixés

### 19.7 Données de test — Confolens S11

Le fichier MANAGER-9839-S11-2026.bvp.json (462 produits, 99 actifs) constitue le cas de test de référence. Ce fichier a été validé ligne par ligne avec le magasin de Confolens et ne doit JAMAIS être altéré par un calcul automatique lors du passage à S12 ou toute semaine suivante.

### 19.8 Correction technique — IDs produits (18/03/2026)

Les produits ajoutés depuis l'archive MANAGER (absents des nouvelles ventes) reçoivent
un ID préfixé `archive_` pour éviter toute collision avec les IDs des produits extraits
des ventes (`ventes_X` ou entier séquentiel). Cette correction résout le bug de filtrage
dans l'onglet Gamme et les erreurs React "duplicate key".

**Fichier modifié :** `src/contexts/MagasinContext.jsx` — ligne d'attribution d'ID dans le
bloc `produitsArchiveManquants`. L'ancien code reprenait `ap.id` (entier séquentiel provenant
de gammeExtractionService) qui entrait en collision avec les IDs des produits ventes.
Le nouvel ID est toujours une chaîne préfixée `archive_` combinant EAN/ITM8 et un compteur.

### 19.9 Identifiants produits — Clé stable (18/03/2026)

Les IDs produits (`id: index + 1`) sont attribués par l'extraction de ventes et changent d'une semaine à l'autre selon l'ordre d'extraction. Ils ne sont PAS stables et ne doivent JAMAIS être utilisés pour le matching entre archive et ventes.

Le matching archive utilise une clé composite stable : `ean13 + libellé`. C'est la seule méthode fiable car :
- Le même produit a toujours le même EAN et le même libellé d'une semaine à l'autre
- Les IDs numériques changent selon l'ordre d'extraction

### 19.10 Champs sauvegardés dans le fichier .bvp.json (18/03/2026)

Le fichier MANAGER .bvp.json sauvegarde maintenant les champs d'association du nettoyage pour chaque produit :
- `raisonDesactivation` : promo, doublon-fusion, doublon-pre, hors-saison, faible-ca, absent-archive
- `libelleRefV2` : libellé du référentiel V2 (matching fuzzy)
- `marqueRefV2` : marque du référentiel V2
- `_eansFusionnes` : liste des EAN regroupés sous ce produit (doublons)
- `unitesParVente` : conditionnement physique

Ces champs permettent de conserver les associations entre sessions sans les recalculer.

### 19.11 Corrections manuelles et archive (18/03/2026)

Les corrections manuelles du manager (séparations de doublons, dissociations de ref V2, fusions manuelles, associations) sont sauvegardées dans le fichier MANAGER .bvp.json sous la clé `correctionsManuelles`.

Quand une archive est chargée :
1. Les corrections manuelles de l'archive sont fusionnées avec celles du localStorage
2. L'archive est appliquée sur les produits (gamme, rayon, programme, etc.)
3. Les corrections manuelles sont re-appliquées PAR-DESSUS l'archive
4. Les doublons actifs (même libellé normalisé) sont automatiquement dédoublonnés

Cet ordre garantit que :
- Les choix du magasin (archive) sont respectés
- Les corrections manuelles (dissociations, séparations) ne sont jamais perdues
- Les doublons actifs sont détectés et fusionnés même quand l'archive les contient

### 19.12 Garde-fou fusion doublons — ITM8 différent (18/03/2026)

La fusion automatique de doublons (Passe 3 du nettoyage) ne fusionne désormais que les produits
ayant le même ITM8. Si deux produits ont le même libellé normalisé mais des ITM8 différents,
ils sont traités comme des produits distincts.

Exemple : "BAGUETTE PRECUITE/250G" (ITM8 18123456) et "BAGUETTE TRADITION 250G" (ITM8 18789012)
ont le même libellé normalisé "BAGUETTE" mais ne sont PAS fusionnés car leurs ITM8 diffèrent.

L'affichage des fusions dans l'onglet Gamme est désormais compact :
- ≤ 3 produits fusionnés : affichage individuel avec croix × de dissociation
- \> 3 produits fusionnés : résumé "N produits fusionnés" avec bouton "Tout séparer"

---

## 20. ORIENTATION IMPRESSION PAYSAGE/PORTRAIT (18/03/2026)

L'Espace Équipe propose maintenant un choix d'orientation (portrait/paysage) dans le dropdown "Options" d'impression. Le choix est persisté dans le fichier EQUIPE et en localStorage.

- Portrait : @page size A4 portrait — défaut, adapté aux tableaux avec peu de tranches
- Paysage : @page size A4 landscape — plus de place pour les tableaux larges, police légèrement augmentée (9px vs 8px)

---

## 21. CONDITIONNEMENT PHYSIQUE — LOT ÉQUIPE (18/03/2026)

Le modal "Modifier le produit" dans l'Espace Équipe inclut un champ "Conditionnement physique (unités par lot)" amélioré. L'équipe peut renseigner le nombre d'unités physiques par lot pour les produits où le système ne connaît pas le conditionnement réel (ex: CROISSANT PT PRX PP x10 → le système compte à l'unité, mais physiquement c'est un sachet de 10).

Quand une valeur > 1 est saisie, les quantités s'affichent en "Bte" (boîtes) sur la fiche d'impression et dans le planning.

---

## 22. ONGLET ANALYSE GAMME vs MODÈLE BVP (18/03/2026)

Nouvel onglet "Analyse" (icône cible, couleur indigo) dans l'Étape 4 — Pilotage CA. Compare la gamme active du magasin avec la gamme préconisée du catalogue-modeles.json pour le modèle BVP du magasin.

- Dashboard par famille (4 cartes : Boulangerie, Viennoiserie, Pâtisserie, Snacking) avec taux de conformité et barres de progression
- Compteurs : préconisé, détenu, manquant, surplus
- Tableau détaillé filtrable par statut (manquant/conforme/surplus) et par famille
- Mapping segment → famille pour les 21 segments du catalogue

---

## 23. CONVERSION VENTES → UNITÉS DANS L'EXPORT MANAGER (18/03/2026)

### 23.1 Règle
Les valeurs stockées dans le fichier `.bvp.json` (planifieManager, moyenneHebdo, potentielAlgo, repartitionJours) sont TOUJOURS en **unités individuelles**, jamais en "ventes" ou "lots".

### 23.2 Formule de conversion
`valeur_unités = valeur_ventes × unitesParVente`

- unitesParVente (ou unitesParLot) = nombre d'unités dans un lot (ex: 4 pour un lot de 4 baguettes)
- Si unitesParVente = 1 (produit à l'unité), pas de conversion

### 23.3 Justification
Le code d'affichage Équipe (Produit3Lignes, SectionImpression) convertit les unités en lots pour l'affichage via `Math.ceil(unités / unitesParLot)`. Si les valeurs d'entrée sont en "ventes" (= lots), cette division produit des préconisations divisées par le facteur de lot (ex: ÷4 pour des lots de 4).

---

## 24. DOSSIER BVP UNIQUE (18/03/2026)

Un seul dossier partagé (`dossierBVP`, clé IndexedDB `dossierBVP`) remplace les anciens `dossierArchives` et `dossierEquipe`. Ce dossier sert à la fois pour :
- Sauvegarder les fichiers MANAGER (export étape 5)
- Relire les archives MANAGER (section 19, report de gamme)
- Être le dossier partagé pour l'Équipe (lecture MANAGER + écriture EQUIPE)

**Migration automatique** : au démarrage, si `dossierBVP` n'existe pas dans IndexedDB mais que `dossierArchives` ou `dossierEquipe` existe, le handle est migré automatiquement vers `dossierBVP`.

Fichiers impactés : AppV5.jsx, MagasinContext.jsx, Etape2ObjectifCA.jsx, Etape5Communication.jsx, EtapeConfigPlanning.jsx.

---

## 25. FICHIER EQUIPE — TOUJOURS LE PLUS RÉCENT (18/03/2026)

Le chargement du fichier EQUIPE (`trouverDernierFichierEquipe` dans `dossierEquipeService.js`) prend toujours le fichier EQUIPE le plus récent (semaine + année la plus élevée), quelle que soit la semaine travaillée. Même logique que pour le MANAGER (section 19.3).

Tri : année descendante → semaine descendante → version descendante. Les paramètres `semaine` et `annee` sont conservés dans la signature pour compatibilité mais ne sont plus utilisés pour le filtrage.

Les personnalisations (renommages de programmes, affectations de cuisson) sont ainsi conservées même en changeant de semaine.

---

## 26. CORRECTION IDS DUPLIQUÉS ARCHIVES (18/03/2026)

Les produits ajoutés depuis l'archive MANAGER (absents des nouvelles ventes) reçoivent un ID préfixé `archive_` pour éviter toute collision avec les IDs des produits extraits des ventes. Le matching archive se fait par clé stable (`ean13` + `libellé`), jamais par `id` numérique séquentiel.

Cette correction résout le bug de filtrage dans l'onglet Gamme et les erreurs React "Encountered two children with the same key".

---

## 27. ARCHITECTURE ARCHIVE VS NETTOYAGE (18/03/2026)

L'archive et le nettoyage sont **mutuellement exclusifs** (CDC §19). Si une archive existe, les ventes brutes sont directement filtrées par les choix du magasin (actif/inactif, rayon, programme, lots), SANS passer par le pipeline de nettoyage 6 passes. Le nettoyage ne s'applique que :
- S'il n'y a pas d'archive (cas D)
- Si le manager active le switch "Nettoyage auto" (section 28)

L'application de l'archive se fait dans `MagasinContext.jsx` via `appliquerArchiveSurBruts()` qui opère sur `produitsVentesBrutes` (stable) pour éviter les re-déclenchements.

---

## 28. SWITCH GAMME MAGASIN / NETTOYAGE AUTO (18/03/2026)

Un toggle est affiché en haut de l'onglet Gamme (Étape 4 — Pilotage CA) quand une archive est trouvée :

- **Gamme magasin** (défaut, gauche) : les choix du magasin sont repris depuis l'archive la plus récente. Aucun nettoyage automatique.
- **Nettoyage auto** (droite) : le nettoyage 6 passes s'applique sur l'extraction de ventes fraîche, comme s'il n'y avait pas d'archive.

Les deux versions sont conservées en mémoire (`produitsGamme` vs `produitsGammeNettoyage`). Le manager peut basculer sans perdre de données. Le switch n'apparaît PAS quand aucune archive n'existe (cas D — nettoyage automatique par défaut).

---

## 29. SÉLECTEUR DE SEMAINE — ESPACE ÉQUIPE (18/03/2026)

L'Espace Équipe affiche un dropdown permettant de choisir la semaine à afficher parmi les fichiers MANAGER disponibles dans le dossier partagé.

- Le dropdown liste toutes les semaines trouvées (ex: S09/2026, S10/2026, S11/2026, S12/2026)
- Triées par date décroissante (plus récente en premier)
- La semaine courante (ou la plus récente) est sélectionnée par défaut
- Changer de semaine recharge instantanément le planning et les données produits
- Le dropdown n'apparaît que s'il y a plus d'une semaine disponible

---

## 30. AMÉLIORATIONS FEUILLE DE PRODUCTION IMPRESSION (18/03/2026)

6 améliorations de la feuille de production imprimable (Espace Équipe) :
1. Lignes "Capacité" en gras + fond grisé (visibles en impression sans fond) + bordures épaisses
2. Nouvelle colonne "u/pl" entre PLU et Article : affiche le nombre d'unités par plaque du produit
   Nouvelle colonne "Plaquage" après Remarque : nb plaques de la 1ère tranche (qté matin / unitesParPlaque)
3. Colonne PLU : affiche uniquement le PLU, jamais l'EAN (si pas de PLU → vide)
4. Affichage compact des lots : "5 lots = 20u" sur une seule ligne au lieu de multilignes
5. Séparateur visuel renforcé entre les programmes de cuisson (bordures épaisses sur lignes Capacité)
6. Colonne "A cuire" avec fond jaune léger (#fefce8) et largeur augmentée (50px)

Ordre final des colonnes :
Rayon | Prog | PLU | u/pl | Article | Remarque | Plaquage | [tranches horaires] | Stock rayon | A cuire

---

**Document mis à jour le 18 mars 2026**
**Version 5.4.0**
**Statut : En cours de développement**
