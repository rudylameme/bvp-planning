# CLAUDE.md — Instructions Claude Code — BVP Planning V5

> **Généré par audit exhaustif du code source le 12/02/2026**
> **Chaque information est sourcée (fichier + ligne). Ne rien inventer, ne rien extrapoler.**

---

## 📖 RÈGLE N°0 : TOUJOURS LIRE LE CDC ET LE METTRE À JOUR

**À chaque nouvelle conversation Claude Code sur ce projet :**

1. **EN DÉBUT DE SESSION** : lire les fichiers suivants pour comprendre l'objectif et l'état actuel de l'application :
   - `CLAUDE.md` (ce fichier — règles, architecture, interdictions)
   - `CAHIER_DES_CHARGES_V5.md` (spécifications fonctionnelles de référence)
   - `ADDENDUM_CDC_V5.2.md` (modifications V5.2 et V5.3 — contient la vraie structure du fichier .bvp.json)

2. **EN FIN DE SESSION** : après chaque modification validée par l'utilisateur, mettre à jour :
   - `CLAUDE.md` — ajouter les anomalies corrigées, nouvelles interdictions, fichiers modifiés
   - `ADDENDUM_CDC_V5.2.md` — documenter les changements fonctionnels (nouvelle section ou ajout à la section existante)

3. **OBJECTIF** : ces documents constituent la mémoire du projet entre les sessions. Sans eux, le contexte est perdu. Chaque modification non documentée est une dette technique.

---

## ⚠️ RÈGLE N°1 : NE JAMAIS CASSER CE QUI FONCTIONNE

1. **Avant toute modification** : lire le fichier concerné EN ENTIER
2. **Ne jamais supprimer** de code sans comprendre toutes ses dépendances
3. **Ne jamais modifier** une formule de calcul sans documenter l'ancienne ET la nouvelle
4. **Ne jamais renommer** une clé de données (JSON, state, props) sans vérifier TOUS les fichiers qui l'utilisent
5. **Tester** après chaque modification : l'import fonctionne-t-il ? Le planning s'affiche-t-il ? Les quantités sont-elles correctes ?
6. **Ne jamais modifier** les constantes métier (tranches, pondérations, limites) sans validation explicite du product owner
7. **Les archives .bvp.json** existantes doivent rester lisibles après toute modification de schéma

---

## 🚀 RÈGLE N°2 : NE JAMAIS TOUCHER AUX DOSSIERS DIST NI AUX ADRESSES VERCEL

**Il existe 3 adresses Vercel en production :**
1. **`dist-equipe/`** → déployé automatiquement sur Vercel (utilisé par les équipes en magasin)
2. **`dist-manager/`** → déployé automatiquement sur Vercel (utilisé par les managers)
3. **`bvp-planning.vercel.app`** → figé sur la **V4** par décision utilisateur (09/03/2026)

**Interdictions strictes :**
- Ne JAMAIS modifier directement les dossiers `dist-equipe/` ou `dist-manager/`
- Ne JAMAIS lancer `npm run build` sans validation explicite de l'utilisateur
- Ne JAMAIS faire de `git commit` ou `git push` sans demande explicite de l'utilisateur
- Ne JAMAIS réactiver l'auto-deploy sur `bvp-planning.vercel.app` (V4 figée)

**Ce qui est autorisé :**
- Modifier librement les fichiers sources dans `src/` pour le développement local
- Tester en local via `npm run dev` sur `localhost`
- L'utilisateur décide quand builder et déployer vers les dist

---

## 🏗️ ARCHITECTURE DU PROJET

### Point d'entrée

```
src/main.jsx (23 lignes)
├─ Si VITE_APP_MODE === 'equipe' → AccueilEquipe seul
└─ Sinon (défaut) → AppV5 (app complète avec 2 univers)
```

Source : `src/main.jsx` lignes 7-16

### Composant racine — AppV5.jsx (43 lignes)

```
Navigation par useState('accueil') — PAS de React Router
3 écrans : 'accueil' | 'manager' | 'equipe'

accueil  → AccueilGlobal (choix Manager / Équipe)
manager  → WizardManager (wizard 7 étapes)
equipe   → AccueilEquipe (3 modules)
```

Source : `src/AppV5.jsx` lignes 15-41

### Arbre de fichiers src/ (hors _archive/)

```
src/
├── main.jsx                          (23 lignes)  Point d'entrée
├── AppV5.jsx                         (43 lignes)  Composant racine, navigation 3 écrans
├── index.css                                      Styles globaux Tailwind
│
├── contexts/
│   ├── MagasinContext.jsx            (279 lignes) État global manager (IndexedDB + state)
│   └── ProfilContext.jsx             (35 lignes)  Profil responsable/employé
│
├── hooks/
│   ├── useDeviceType.js              (80 lignes)  Détection mobile/tablet/desktop
│   ├── useDragReorder.js             (110 lignes) Drag & drop familles/programmes
│   └── useProductionStorage.js       (90 lignes)  localStorage production temps réel
│
├── services/
│   ├── calculService.js              (311 lignes) Benchmark, flux, potentiel perdu
│   ├── potentielCalculator.js        (634 lignes) Calcul potentiel hebdo V2
│   ├── planningCalculator.js         (623 lignes) Planning initial (redistribution, fermetures)
│   ├── planningRecalculator.js       (350 lignes) Recalcul avec variantes/modifications
│   ├── caCalculator.js               (140 lignes) Calcul CA produit/rayon/objectif
│   ├── referentielITM8.js            (430 lignes) Référentiel produits ITM8/EAN/PLU (auto-détection V1/V2)
│   ├── nettoyageGamme.js            (460 lignes) Nettoyage intelligent gamme (6 passes)
│   ├── conditionnementService.js     (228 lignes) CDT (conditionnement), cartons
│   ├── productClassifier.js          (155 lignes) Classification par mots-clés
│   ├── fichierEchangeService.js      (462 lignes) Format .bvp.json manager/équipe
│   ├── fichierMagasin.js             (251 lignes) Fichier magasin V2.1
│   ├── dataExtractionService.js      (470 lignes) Extraction données PDV (Excel)
│   ├── gammeExtractionService.js     (883 lignes) Extraction ventes/casse (Excel)
│   ├── excelParser.js                (798 lignes) Parseur Excel fréquentation/ventes
│   └── extraction/
│       ├── frequentationExtractor.js (224 lignes) Extraction par créneaux/tranches
│       ├── ventesExtractor.js        (316 lignes) Moyennes secteur, classement
│       └── validationDonnees.js      (221 lignes) Validation structure Excel
│
├── utils/
│   ├── classification.js             (20 lignes)  Classification produits par keywords
│   ├── conversionUtils.js            (30 lignes)  Conversion unités → plaques
│   ├── dateUtils.js                  (80 lignes)  Jours semaine, dates FR
│   ├── formatUtils.js                (30 lignes)  Formatage €, dates
│   ├── parsers.js                    (571 lignes) Parseur CSV/Excel ventes/fréquentation
│   └── weekCalculator.js             (161 lignes) Calcul ISO semaines, reports
│
├── styles/
│   └── mousquetaires-theme.js        (115 lignes) Couleurs, familles, boutons
│
├── components/
│   ├── AccueilGlobal.jsx             (150 lignes) Page d'accueil choix Manager/Équipe
│   ├── AccordeonRayon.jsx            (85 lignes)  Section repliable rayon
│   ├── AttributionManuelle.jsx       (129 lignes) Modal attribution produits non reconnus
│   ├── EtapeConfigurationSemaine.jsx (370 lignes) Config semaine (jours/fermetures)
│   ├── EtapePersonnalisation.jsx     (552 lignes) Personnalisation produits (rayon, programme, etc.)
│   ├── EtapePlanning.jsx             (995 lignes) Vue planning hebdo avec variantes
│   ├── EtapeUpload.jsx               (321 lignes) Upload fichiers fréquentation/ventes
│   ├── GestionProgrammes.jsx         (223 lignes) Modal gestion programmes cuisson
│   ├── ImpressionPanel.jsx           (596 lignes) Impression jour/hebdo A4
│   ├── ModeCasseGlobal.jsx           (115 lignes) Saisie casse globale
│   ├── ModeProductionEnCours.jsx     (381 lignes) Suivi production temps réel
│   ├── ModeSuiviTempsReel.jsx        (188 lignes) Dashboard suivi avancement
│   ├── PlanningVueTablet.jsx         (345 lignes) Vue tablette 3 modes
│   ├── StatistiquesPanel.jsx         (100 lignes) Panneau stats pondération
│   ├── TableauProduits.jsx           (281 lignes) Tableau produits (vue liste)
│   ├── TableauProduitsGroupes.jsx    (324 lignes) Tableau produits (vue groupée)
│   └── TouchButton.jsx              (84 lignes)  Bouton adaptatif touch/mouse
│   │
│   ├── layout/
│   │   ├── Header.jsx                (45 lignes)  En-tête avec logo Mousquetaires
│   │   ├── ModeSwitch.jsx            (30 lignes)  Toggle desktop/tablette
│   │   ├── Navigation.jsx            (50 lignes)  Onglets navigation
│   │   └── ProfilSwitch.jsx          (30 lignes)  Toggle responsable/équipier
│   │
│   ├── manager/
│   │   ├── WizardManager.jsx         (321 lignes) Wizard 7 étapes avec navigation
│   │   ├── Etape0Import.jsx          (475 lignes) Import dossier + sélection magasin
│   │   ├── Etape1Diagnostic.jsx      (327 lignes) Diagnostic avec benchmark secteur
│   │   ├── Etape2ObjectifCA.jsx      (818 lignes) Objectif CA + recherche fréquentation
│   │   ├── Etape2bImportVentes.jsx   (246 lignes) Import ventes/casse (min 3 sem.)
│   │   ├── Etape3Configuration.jsx   (557 lignes) Jours ouverture + tranches + regroupements
│   │   ├── Etape4PilotageCA.jsx      (459 lignes) Pilotage CA, limites, onglets
│   │   ├── Etape5Communication.jsx   (576 lignes) Export archive .bvp.json V3.0
│   │   ├── OngletCommande.jsx        (475 lignes) Commande multi-livraisons
│   │   ├── commande/
│   │   │   ├── GestionLivraisons.jsx (205 lignes)
│   │   │   ├── RecapCommande.jsx     (100 lignes)
│   │   │   └── TableauCommande.jsx   (485 lignes)
│   │   ├── components/
│   │   │   ├── CarteIndicateur.jsx   (50 lignes)
│   │   │   └── GraphiqueFlux.jsx     (50 lignes)
│   │   ├── diagnostic/
│   │   │   ├── CartesDiagnostic.jsx  (544 lignes)
│   │   │   ├── GraphiqueFrequentation.jsx (402 lignes)
│   │   │   ├── SectionRepliable.jsx  (30 lignes)
│   │   │   └── TopFlopProduits.jsx   (279 lignes)
│   │   └── pilotage/
│   │       ├── DashboardCA.jsx       (210 lignes)
│   │       ├── OngletGamme.jsx       (430 lignes)
│   │       ├── OngletMatrice.jsx     (222 lignes)
│   │       ├── OngletStats.jsx       (308 lignes)
│   │       ├── PopupCasse.jsx        (50 lignes)
│   │       └── PopupVentes.jsx       (50 lignes)
│   │
│   ├── equipe/
│   │   ├── AccueilEquipe.jsx         (267 lignes) Accueil équipe (import + 3 modules)
│   │   ├── PlanningJour.jsx          (479 lignes) Planning jour complet
│   │   ├── CommandeEquipe.jsx        (655 lignes) Commande avec stock/livraisons
│   │   ├── FicheInventaire.jsx       (245 lignes) Fiche inventaire
│   │   ├── ImportFichierEquipe.jsx   (286 lignes) Import fichier .bvp.json
│   │   └── planning/
│   │       ├── constants.js          (92 lignes)  Constantes tranches/presets
│   │       ├── calculerQuantites.js  (212 lignes) Calcul quantités par tranche
│   │       ├── getQteColonne.js      (50 lignes)  Extraction quantité par colonne
│   │       ├── helpers.js            (50 lignes)  Fonctions utilitaires
│   │       ├── useColonnesVisibles.js(50 lignes)  Colonnes visibles selon config
│   │       ├── useProduitsGroupes.js (50 lignes)  Regroupement produits
│   │       ├── handleSaveProgrammes.js(50 lignes) Sauvegarde programmes
│   │       ├── BarreOutils.jsx       (285 lignes) Barre d'outils (jour, affichage, tri)
│   │       ├── FamilleSection.jsx    (271 lignes) Section par famille (drag & drop)
│   │       ├── ProgrammeGroup.jsx    (298 lignes) Groupe programme cuisson
│   │       ├── Produit3Lignes.jsx    (165 lignes) Ligne produit (préco/histo/%)
│   │       ├── CellulesPlanning.jsx  (50 lignes)  Cellules quantités + conversion
│   │       ├── ModalEditionProduit.jsx(100 lignes)Modal édition produit
│   │       ├── ModalGestionProgrammes.jsx(208 lignes)Modal gestion programmes
│   │       └── SectionImpression.jsx (325 lignes) Mise en page impression
│   │
│   ├── responsable/
│   │   ├── WizardResponsable.jsx     (376 lignes) Wizard 5 étapes responsable
│   │   ├── StepSemaine.jsx           (409 lignes) Config semaine/horaires
│   │   ├── StepAnimationCommerciale.jsx(218 lignes) Animation commerciale
│   │   ├── StepCommande.jsx          (413 lignes) Commande (avec réf. forwarded)
│   │   ├── WizardTermine.jsx         (488 lignes) Export .bvp.json V2.0
│   │   ├── ConfigJours.jsx           (317 lignes) Configuration jours ouverture
│   │   ├── ConfigurationProduits.jsx (284 lignes) Sélection/filtrage produits
│   │   ├── FichierMagasin.jsx        (123 lignes) Export/import fichier magasin
│   │   ├── ImportDonnees.jsx         (239 lignes) Import données Excel
│   │   ├── PilotageCA.jsx            (1088 lignes)Pilotage CA complet
│   │   ├── ProgressBar.jsx           (70 lignes)  Barre progression wizard
│   │   ├── animation/
│   │   │   ├── CalculElasticite.jsx  (50 lignes)
│   │   │   ├── EditeurPromotion.jsx  (472 lignes)
│   │   │   ├── ImpactPrevisionnel.jsx(100 lignes)
│   │   │   ├── ListePromotions.jsx   (189 lignes)
│   │   │   ├── ProduitsExceptionnels.jsx(254 lignes)
│   │   │   └── utils.js              (60 lignes)
│   │   └── commande/
│   │       ├── FiltresCommande.jsx   (60 lignes)
│   │       ├── PlanningLivraisons.jsx(221 lignes)
│   │       ├── RecapCommandeResp.jsx (32 lignes)
│   │       ├── TableauCommandeResp.jsx(406 lignes)
│   │       └── useCommandeCalcul.js  (368 lignes)
│   │
│   ├── shared/
│   │   └── FicheCommandeImpression.jsx(403 lignes) Impression commande A4
│   │
│   └── benchmark/
│       ├── index.js                  (10 lignes)
│       ├── AccueilBenchmark.jsx      (451 lignes)
│       ├── BenchmarkModule.jsx       (50 lignes)
│       ├── ClassementSecteur.jsx     (261 lignes)
│       ├── DashboardBenchmark.jsx    (210 lignes)
│       ├── GraphiquesBenchmark.jsx   (364 lignes)
│       ├── KPIsBenchmark.jsx         (399 lignes)
│       └── TableauComparatif.jsx     (232 lignes)
```

---

## 🧙 WIZARD MANAGER (7 étapes)

Source : `src/components/manager/WizardManager.jsx` lignes 26-34

```javascript
const ETAPES = [
  { id: 0, label: 'Import',        icon: Upload },        // Etape0Import
  { id: 1, label: 'Diagnostic',    icon: BarChart3 },      // Etape1Diagnostic
  { id: 2, label: 'Objectif',      icon: Target },         // Etape2ObjectifCA
  { id: 3, label: 'Ventes',        icon: FileSpreadsheet },// Etape2bImportVentes
  { id: 4, label: 'Config',        icon: Settings },       // Etape3Configuration
  { id: 5, label: 'Pilotage',      icon: TrendingUp },     // Etape4PilotageCA
  { id: 6, label: 'Communication', icon: MessageSquare },  // Etape5Communication
]
```

### Navigation
- Étape 0 toujours accessible
- Étapes 1+ requièrent `importComplet === true` (MagasinContext ligne 179)
- Navigation séquentielle uniquement (pas de saut d'étape)
- Source : `WizardManager.jsx` lignes 60-81

### Flux détaillé

| Étape | Composant | Rôle | Entrées | Sorties vers contexte |
|-------|-----------|------|---------|-----------------------|
| 0 | Etape0Import | Sélection dossier, semaine, magasin | Dossier fichiers Excel | dirHandle, semainesDisponibles, donneesMagasin, infoPDV |
| 1 | Etape1Diagnostic | Benchmark secteur, opportunités | donneesMagasin | (lecture seule) |
| 2 | Etape2ObjectifCA | Objectif CA, recherche fréquentation S-4/S-8... | donneesMagasin | objectifCA, objectifPourcent, semainePlanning, frequentationData, typePonderation |
| 3 | Etape2bImportVentes | Import ventes/casse (min 3 semaines) | Fichier Excel ventes | donneesGamme, produitsGamme |
| 4 | Etape3Configuration | Jours ouverture, tranches, redistribution | — | joursOuverture (creneaux, redistribution, regroupements, nbTranches) |
| 5 | Etape4PilotageCA | Gamme, limites progression, promos, commande | produitsGamme | planifieManager, promosActives, commandeConfig |
| 6 | Etape5Communication | Export archive .bvp.json V3.0 | Tout le contexte | Fichier MANAGER-{code}-S{sem}-{annee}.bvp.json (dateDebut via `formatDateLocale()`, pas `toISOString()`) |

### Contexte global — MagasinContext

Source : `src/contexts/MagasinContext.jsx` (279 lignes)

Stockage : **IndexedDB** pour les DirectoryHandle (`bvp-planning-handles`), **state React** pour le reste.

Variables d'état principales :
- `dirHandle`, `semainesDisponibles`, `fichiersDetectes` — fichiers
- `semaineSelectionnee`, `magasinSelectionne` — sélections
- `donneesMagasin`, `infoPDV` — données magasin importées
- `objectifCA`, `objectifPourcent`, `semainePlanning` — objectifs
- `frequentationData`, `typePonderation` — fréquentation
- `produitsGamme`, `donneesGamme` — gamme produits
- `planifieManager`, `commandeConfig`, `joursOuverture` — configuration
- `promosActives`, `promosPrecedentes` — promotions
- `dossierArchives` — dossier d'export (persisté IndexedDB)

---

## 🧑‍💼 WIZARD RESPONSABLE (5 étapes)

Source : `src/components/responsable/WizardResponsable.jsx` lignes 232-310

```
Étape 1 → ImportDonnees        : Import Excel fréquentation + ventes
Étape 2 → StepSemaine          : Semaine, magasin, horaires ouverture
Étape 3 → PilotageCA           : Sélection produits, limites S/F/f, distribution
Étape 4 → StepAnimationCommerciale : Promotions, produits exceptionnels
Étape 5 → WizardTermine        : Export .bvp.json V2.0
```

État maître `wizardData` contient : `importDonnees`, `produits[]`, `magasin`, `semaine`, `annee`, `horaires`, `baseCalcul`, `limitesProgression`, `repartitionParFamille`, `promosActives`, `periodePromo`, `produitsExceptionnels`

---

## 👥 UNIVERS ÉQUIPE (3 modules)

Source : `src/components/equipe/AccueilEquipe.jsx` (267 lignes)

### Modules accessibles
1. **PlanningJour** — Planning de production quotidien
2. **FicheInventaire** — Inventaire des stocks
3. **CommandeEquipe** — Commande fournisseur

### Flux d'entrée
1. Import fichier `.bvp.json` (via ImportFichierEquipe)
2. Supporte schémas V2, V3, V4 (rétrocompatibilité)
3. Normalisation des produits (IDs uniques)
4. Persistance localStorage via `useFichierMagasin()`
5. Version affichée : V5.3

---

## 📊 RÈGLES MÉTIER — FORMULES DE CALCUL

### 1. Modes de progression (limites)

Source : `src/components/manager/Etape4PilotageCA.jsx` lignes 39-93
Source : `src/services/planningRecalculator.js` lignes 88-124
Source : `src/services/planningCalculator.js` lignes 402-438
Source : `src/components/responsable/PilotageCA.jsx` lignes 200-245

**TOUS les modes existants :**

| Code | Nom | Formule plafond | Formule plancher | Source |
|------|-----|-----------------|------------------|--------|
| `S` | Sans plafond | Aucun plafond | `historique` (jamais en dessous) | Etape4PilotageCA.jsx L66-68 |
| `F` | Forte progression | `Math.ceil(historique × 1.20)` (+20%) | `historique` | Etape4PilotageCA.jsx L69-72 |
| `f` | Prudent | `Math.ceil(historique × 1.10)` (+10%) | `historique` | Etape4PilotageCA.jsx L73-76 |
| `P:xx` | Personnalisé | `Math.ceil(historique × (1 + xx/100))` | `historique` | Etape4PilotageCA.jsx L78-82 |

**Formule complète d'application (Etape4PilotageCA.jsx lignes 66-93) :**

```javascript
const appliquerLimite = (potentielCalcule, historique, limite) => {
  const plancher = historique; // JAMAIS en dessous de l'historique
  if (limite === 'S') return Math.max(plancher, potentielCalcule);
  if (limite === 'F') {
    const plafond = Math.ceil(historique * 1.20);
    return Math.max(plancher, Math.min(potentielCalcule, plafond));
  }
  if (limite === 'f') {
    const plafond = Math.ceil(historique * 1.10);
    return Math.max(plancher, Math.min(potentielCalcule, plafond));
  }
  if (limite.startsWith('P:')) {
    const pourcent = parseInt(limite.split(':')[1], 10);
    const plafond = Math.ceil(historique * (1 + pourcent / 100));
    return Math.max(plancher, Math.min(potentielCalcule, plafond));
  }
  return potentielCalcule;
};
```

**Variantes utilisées dans planningRecalculator.js (lignes 105-124) :**

Les variantes sont aussi codées en string : `'sans'`, `'forte'`, `'faible'`, `'personnalisee'`
- `'sans'` → pas de plafond, plancher = `historique × 0.95`
- `'forte'` → plafond `historique × 1.20`, plancher `historique × 0.95`
- `'faible'` → plafond `historique × 1.10`, plancher `historique × 0.95`
- `'personnalisee'` → plafond `historique × (1 + limiteRatio)`, plancher `historique × 0.95`

**⚠️ ANOMALIE DÉTECTÉE :** Le plancher dans le recalculator est `× 0.95` (95%) tandis que dans Etape4PilotageCA il est `historique` (100%). Les deux coexistent dans le code.

**Matrice par défaut — LIMITES_PROGRESSION_DEFAUT (Etape4PilotageCA.jsx lignes 39-60) :**

```javascript
{
  BOULANGERIE:  { lundi:'F', mardi:'F', mercredi:'F', jeudi:'F', vendredi:'f', samedi:'f', dimanche:'f' },
  VIENNOISERIE: { lundi:'F', mardi:'F', mercredi:'F', jeudi:'F', vendredi:'f', samedi:'f', dimanche:'f' },
  PATISSERIE:   { lundi:'F', mardi:'F', mercredi:'F', jeudi:'F', vendredi:'f', samedi:'f', dimanche:'f' },
  SNACKING:     { lundi:'F', mardi:'F', mercredi:'F', jeudi:'F', vendredi:'f', samedi:'f', dimanche:'f' },
  AUTRE:        { lundi:'f', mardi:'f', mercredi:'f', jeudi:'f', vendredi:'f', samedi:'f', dimanche:'f' }
}
```

### 2. Calcul du potentiel hebdomadaire

Source : `src/services/potentielCalculator.js` lignes 559-619

**5 modes de calcul du potentiel :**

| Mode | Description | Limite | Source |
|------|-------------|--------|--------|
| `mathematique` | Calcul mathématique pur | Aucune | L559 |
| `forte-progression` | Progression forte | +20% max vs historique | L566 |
| `prudent` | Progression prudente | +10% max vs historique | L567 |
| `moyenne-stats` | Moyenne statistique (3+ sem.) | Recommandé si données suffisantes | L568 |
| `personnalisee` | Personnalisé par l'utilisateur | `limitePerso / 100` | L569 |

**Formule potentiel V2 (potentielCalculator.js lignes 191-260) :**

```javascript
// Pour chaque semaine avec données :
potentielSemaine = venteMax_du_jour / poids_du_jour_correspondant
// Moyenne des potentiels par semaine :
potentielHebdo = moyenne(potentielsParSemaine)
// Application plancher 95% :
plancher = Math.ceil(volumeActuel * 0.95)  // L609
// Application plafond selon mode :
plafond = Math.ceil(volumeActuel * (1 + limiteProgression))  // L619
```

### 3. Distribution par tranches (CDC 13.4.3)

Source : `src/components/equipe/planning/calculerQuantites.js` lignes 83-133

**Règle de distribution basée sur la quantité journalière :**

| Quantité jour | Nb cuissons | Distribution |
|---------------|-------------|--------------|
| < 6 unités | 2 | 70% ouverture + 30% tranche la + forte |
| 6 à 10 | 3 | 60% ouverture + 20% + 20% |
| 10 à 20 | 3 | 40% ouverture + 30% + 30% |
| > 20 | toutes | Distribution classique par poids |

**Distribution classique (> 20 unités, lignes 137-162) :**
- Normalise les poids des tranches ouvertes
- Applique `Math.ceil()` avec arrondi intelligent
- Tri par partie fractionnaire pour répartir les arrondis

### 4. Calcul quotidien

Source : `src/components/equipe/planning/calculerQuantites.js` lignes 12-34

```javascript
// Potentiel hebdo = planifieManager OU potentiel algo
potentielHebdo = produit.planifieManager || produit.potentielAlgo || 0;

// Si repartitionJours valide (non uniforme) → utiliser directement
potentielJour = repartitionJours[jour] != null
  ? Math.ceil(repartitionJours[jour])
  : Math.ceil(potentielHebdo * poidsJour);

// Historique jour
historiqueJour = historiqueHebdo ? Math.ceil(historiqueHebdo * poidsJour) : null;
```

### 5. Redistribution fermetures exceptionnelles

Source : `src/services/planningCalculator.js` lignes 31-84
Source : `src/utils/weekCalculator.js` lignes 89-118

**Par défaut :** 75% même jour autre créneau, 25% jour suivant
Source : `planningCalculator.js` lignes 12-17, `weekCalculator.js` lignes 99-113

**Redistribution fermeture partielle (planningCalculator.js lignes 263-266) :**
- Si matin fermé : ratio = `((0.5 × pMidi) + pSoir) / totalPoids`
- Si après-midi fermé : ratio = `(pMatin + (0.5 × pMidi)) / totalPoids`

### 6. Calcul CA

Source : `src/services/caCalculator.js`

```javascript
// CA produit : prix × quantité (L30)
prixMoyenUnitaire = Math.round((caTotal / quantiteTotale) * 100) / 100

// CA hebdo rayon (L51)
caHebdo = Math.round((caTotal / nombreSemaines) * 100) / 100

// Objectif CA (L102-106)
caObjectif = caActuel * (1 + objectifProgression / 100)
gainPotentiel = caObjectif - caActuel
partBVP = Math.round((caActuel / caTotalRayon) * 1000) / 10  // 1 décimale
```

### 7. Calcul taux de casse

Source : `src/services/gammeExtractionService.js` ligne 404
Source : `src/services/excelParser.js` ligne 273

```javascript
tauxCasse = (cassePAHT / ventesPVTTC) * 100
// Variante excelParser :
tauxCasse = (cassePaHTTotal / valeurPrixVenteTotal) * 10000 / 100
```

### 8. Formule marge Mousquetaires (promotions)

Source : `src/components/responsable/animation/EditeurPromotion.jsx` lignes 131-179

```javascript
prixNormalHT = prixNormalTTC / (1 + 0.055)  // TVA 5.5%
margeNormaleEuros = (margePct / 100) × prixNormalTTC
prixAchatHT = prixNormalHT - margeNormaleEuros

prixPromoHT = prixPromoTTC / (1 + 0.055)
margePromoEuros = prixPromoHT - prixAchatHT

// Élasticité (plafonnée à 2.0)
elasticite = Math.min((margeNormaleEuros / margePromoEuros) - 1, 2.0)

// Quantité objectif
nbJoursPromo = calculerNbJoursPromo(dateDebut, dateFin)  // inclusif
qteNormalePeriode = (qteNormaleHebdo / 7) × nbJoursPromo
qteObjectif = Math.ceil(qteNormalePeriode × (1 + elasticite))
```

### 9. Calcul commande (cartons)

Source : `src/components/responsable/commande/useCommandeCalcul.js` lignes 82-141
Source : `src/components/manager/OngletCommande.jsx` lignes 199-288

```javascript
// CDT = conditionnement (unités par carton)
besoinUnites = Math.ceil(potentielHebdo)
besoinCartons = Math.ceil(besoinUnites / cdt)

// Consommation journalière
consoJour = besoinUnites / 7

// Stock mini selon mode
JOURS_STOCK = { normal: 3, court: 1.5 }  // OngletCommande L64-67
stockMiniUnites = Math.ceil(consoJour × joursStock)
stockMini = Math.ceil(stockMiniUnites / cdt)  // minimum 1 si ventes

// Quantité à commander
qteCommander = Math.max(0, besoinCartons + stockMini - stockActuel)
```

### 10. Conversion unités → plaques

Source : `src/components/equipe/planning/CellulesPlanning.jsx` lignes 9-14

```javascript
const convertirEnPlaques = (valeur, unitesParPlaque, affichage) => {
  if (affichage === 'plaques' && unitesParPlaque > 0) {
    return Math.ceil(valeur / unitesParPlaque);
  }
  return valeur;
};
```

Source : `src/utils/conversionUtils.js` ligne 9 — arrondi demi-plaque :

```javascript
const arrondiDemiPlaque = (nombre) => Math.ceil(nombre * 2) / 2;
```

---

## ⏰ TRANCHES HORAIRES

### 6 tranches internes (calcul)

Source : `src/components/equipe/planning/constants.js` lignes 18-25

```javascript
export const TRANCHES_CONFIG = [
  { key: '00_Autre', label: 'Avant 9h',   plage: '00h-09h' },
  { key: '09h_12h',  label: '9h-12h',     plage: '09h-12h' },
  { key: '12h_14h',  label: '12h-14h',    plage: '12h-14h' },
  { key: '14h_16h',  label: '14h-16h',    plage: '14h-16h' },
  { key: '16h_19h',  label: '16h-19h',    plage: '16h-19h' },
  { key: '19h_23h',  label: 'Après 19h',  plage: '19h-23h' }
];
```

### 6 tranches côté Manager (Etape3Configuration)

Source : `src/components/manager/Etape3Configuration.jsx` lignes 79-86

```javascript
const TRANCHES_HORAIRES = [
  { key: 'avant9h',  label: 'Avant 9h' },
  { key: '9h12h',    label: '9h-12h' },
  { key: '12h14h',   label: '12h-14h' },
  { key: '14h16h',   label: '14h-16h' },
  { key: '16h19h',   label: '16h-19h' },
  { key: 'apres19h', label: '+19h' }
];
```

### Presets d'affichage (regroupements)

Source : `src/components/manager/Etape3Configuration.jsx` lignes 88-110
Source : `src/components/equipe/planning/constants.js` lignes 65-92

| Preset | Colonnes affichées | Regroupements |
|--------|-------------------|---------------|
| **3T** | Matin, Après-midi, Soir | avant9h+9h12h → Matin ; 12h14h+14h16h → Après-midi ; 16h19h+après19h → Soir |
| **4T** | Avant 12h, 12h-14h, 14h-16h, Après 16h | Non trouvé dans le code — à vérifier |
| **5T** | Avant 9h, 9h-12h, 12h-14h, 14h-16h, Après 16h | 16h19h+après19h regroupés |
| **6T** | Toutes les 6 tranches individuelles | Aucun regroupement |

**Le calcul interne est TOUJOURS sur 6 tranches.** Les regroupements n'affectent que l'affichage.

Source : `Etape3Configuration.jsx` lignes 88-110 :

```javascript
const REGROUPEMENTS_OPTIONS = [
  { id: 'matin',     tranches: ['avant9h', '9h12h'],    labelResultat: 'Matin' },
  { id: 'apresmidi', tranches: ['12h14h', '14h16h'],    labelResultat: 'Après-midi' },
  { id: 'soir',      tranches: ['16h19h', 'apres19h'],  labelResultat: 'Soir' }
];
```

### Choix du manager stocké dans

```
joursOuverture.nbTranches   → nombre (3, 4, 5 ou 6)
joursOuverture.regroupements → { matin: bool, apresmidi: bool, soir: bool }
```

**⚠️ Le sélecteur de tranches est visible uniquement côté Manager (Etape3Configuration). Côté Équipe, le nombre de tranches est lu depuis la configuration du fichier .bvp.json et ne peut PAS être modifié.**

---

## 📈 PONDÉRATION

Source : `src/services/excelParser.js` lignes 326-330
Source : `src/utils/parsers.js` lignes 428-432

### 3 types de pondération

| Type | S-1 (sem. précédente) | AS-1 (même sem. an passé) | S-2 (sem. -2) |
|------|----------------------|--------------------------|----------------|
| **standard** | 40% | 30% | 30% |
| **saisonnier** | 30% | 50% | 20% |
| **fortePromo** | 60% | 20% | 20% |

### Poids par jour (défaut)

Source : `src/services/gammeExtractionService.js` lignes 267-275
Source : `src/components/responsable/PilotageCA.jsx` lignes 248-256

```javascript
POIDS_JOURS_DEFAUT = {
  lundi: 0.12,  mardi: 0.12,  mercredi: 0.16,
  jeudi: 0.12,  vendredi: 0.16, samedi: 0.20, dimanche: 0.12
}
```

### Base de calcul

Source : `src/utils/parsers.js` lignes 343-347

- **BVP** : Pondération basée sur les ventes rayon BVP (colonnes J/P/V)
- **PDV** : Pondération basée sur le flux total du magasin (colonnes M/S/Y)

---

## 🔍 RECONNAISSANCE PRODUITS

### Codes utilisés

Source : `src/services/referentielITM8.js` lignes 75-99

| Code | Description | Recherche |
|------|-------------|-----------|
| **ITM8** | Code interne Mousquetaires (8 chiffres) | `rechercherParITM8(itm8)` L157 |
| **EAN13** | Code-barres européen (13 chiffres) | `rechercherParEAN(ean)` L170 |
| **PLU** | Code point de vente | via `codePLU` dans la structure produit |

### Matching référentiel

Source : `src/services/referentielITM8.js` lignes 137-210

```
1. Chargement du fichier référentiel Excel → construction de 3 Maps :
   - itm8Map  (clé: ITM8 normalisé)
   - eanMap   (clé: EAN13)
   - libelleMap (clé: libellé lowercase)

2. Recherche par ITM8 exact → rechercherParITM8()
3. Recherche par EAN exact → rechercherParEAN()
4. Recherche par libellé exact → rechercherParLibelle()
5. Recherche fuzzy par libellé → rechercherParLibelleFuzzy()
```

### Classification automatique (fallback si pas dans référentiel)

Source : `src/services/productClassifier.js` lignes 10-151
Source : `src/utils/classification.js` lignes 2-15

**Par mots-clés :**

| Famille | Mots-clés (productClassifier.js) |
|---------|----------------------------------|
| BOULANGERIE | pain, baguette, bag, constance, mie, campagne, céréales, complet, tradition, ficelle |
| VIENNOISERIE | croissant, chocolat, chausson, brioche, pain raisin, pain au, pain choc, viennois, suisse |
| PATISSERIE | tarte, éclair, millefeuille, gâteau, cake, flan, paris-brest, religieuse, chou, macaron |
| SNACKING | sandwich, wrap, panini, burger, salade, snack, pizza |

Détecte aussi : `programme`, `tempsPlaquage` (court/long), `unitesParPlaque`, `necessiteCuisson` (boolean)

---

## 📦 STRUCTURE DES DONNÉES

### Format archive Manager V3.0

Source : `src/components/manager/Etape5Communication.jsx` lignes 199-263

Nom du fichier : `MANAGER-{codePDV}-S{semaine}-{annee}.bvp.json`

```javascript
{
  schemaVersion: '3.0',
  type: 'planning-archive',
  exportDate: 'ISO timestamp',

  magasin: { code, nom },

  semaine: { numero, annee, dateDebut, dateFin },

  configuration: {
    joursActifs,          // jours ouverts
    creneaux,             // état par jour/créneau
    regroupements,        // regroupements de tranches
    nbTranches,           // 3, 4, 5 ou 6
    livraisons,           // config livraisons
    operationsSpeciales,  // fermetures exceptionnelles
    repartitionParFamille // 'tranches' | 'journalier' par famille — DÉDUIT de tranchesParFamille (>1 tranche → 'tranches', 1 seule → 'journalier')
  },

  promotions: [{
    plu, itm8, ean13, libelle,
    prixNormalTTC, prixPromoTTC, prixAchatHT,
    margePct, avantageClient,
    margeNormaleEuros, margePromoEuros, tauxMargePromo, elasticite,
    qteNormaleHebdo, qteNormalePeriode, nbJoursPromo,
    qteObjectif, qteValidee, qteSupplementaire,
    dateDebut, dateFin
  }],

  objectifs: {
    caHistorique, objectifPourcent, caPrevision
  },

  produits: [{
    id, plu, itm8, ean13, libelle, famille, rayon,
    actif, programme, unitesParPlaque, unitesParLot,
    moyenneHebdo, potentielAlgo, planifieManager,
    cdt, repartitionJours
  }],

  frequentation: {
    source: 'defaut' | 'import',
    typePonderation: 'standard' | 'saisonnier' | 'fortePromo',
    parJour: { [jour]: { poids, tranches: { [tranche]: { poids } } } }
  },

  commandes: {},
  personnalisationProduits: {},
  referentiel: { version, inclus, familles, source }
}
```

### ARCHITECTURE DE PERSISTANCE — ZÉRO LOCALSTORAGE (décision 12/03/2026)

**Principe fondamental : TOUTE donnée modifiable doit être persistée dans les fichiers .bvp.json, JAMAIS dans localStorage.**

Le localStorage est lié à un navigateur sur un PC donné. Si l'équipier change de poste, tout est perdu.
L'objectif est que chaque profil puisse travailler depuis n'importe quel PC en chargeant simplement son fichier.

#### Deux fichiers, deux auteurs

| Fichier | Écrit par | Lu par | Contenu |
|---------|-----------|--------|---------|
| `MANAGER-{codePDV}-S{XX}-{YYYY}[_vN].bvp.json` | Manager uniquement | Manager + Équipe | Planning, produits, commandes, promos, fréquentation, configuration |
| `EQUIPE-{codePDV}-S{XX}-{YYYY}[_vN].bvp.json` | Équipe uniquement | Manager + Équipe | Personnalisations produits, programmes personnalisés, inventaires, plaquageJ1, préférences affichage |

**Règle stricte : chaque profil écrit UNIQUEMENT dans son propre fichier pour éviter les conflits d'écriture simultanée.**
Chaque profil peut LIRE le fichier de l'autre à tout moment.

#### Dossiers désignés par l'utilisateur

Les dossiers d'échange sont sélectionnés dans `PageParametres` et persistés via IndexedDB (File System Access API) :

| Profil | Item PageParametres | Clé IndexedDB | Usage |
|--------|---------------------|---------------|-------|
| Manager | "Dossier archives Manager" | `dossierArchives` | Lecture/écriture des fichiers MANAGER |
| Manager | "Dossier equipe" | `dossierEquipe` | Écriture du fichier pour l'équipe + lecture du retour EQUIPE |
| Équipe | (à ajouter) "Dossier partagé" | `dossierEquipe` | Lecture du fichier MANAGER + écriture du fichier EQUIPE |

**Important :** Côté Équipe, il faut remplacer l'import fichier unitaire actuel par la désignation d'un dossier partagé (même principe que le Manager). L'app scannera ce dossier pour trouver automatiquement le dernier fichier Manager de la semaine courante.

#### Versioning des fichiers

Quand le Manager (ou l'Équipe) régénère un fichier pour la même semaine :
1. L'outil scanne le dossier pour trouver les fichiers existants pour cette semaine
2. Il identifie la version la plus haute (v1, v2, v3...)
3. Il charge cette version pour pré-remplir les données
4. Il sauvegarde en version N+1

Nommage : `MANAGER-07499-S12-2026.bvp.json` (v1 implicite), puis `MANAGER-07499-S12-2026_v2.bvp.json`, `_v3`, etc.
Même logique pour `EQUIPE-07499-S12-2026.bvp.json`, `_v2`, etc.

L'outil charge toujours la version la plus récente. Les anciennes versions sont conservées (historique).

#### Contenu du fichier EQUIPE (personnalisations PlanningJour)

Toutes les données actuellement dans localStorage doivent migrer vers le fichier EQUIPE :

| Ancienne clé localStorage | Nouvelle clé dans equipe.bvp.json | Description |
|---------------------------|-----------------------------------|-------------|
| `bvp_produits_modifies` | `personnalisations` | Modifications produits : libellé, famille, programme, PLU, unités/plaque, unités/lot |
| `bvp_programmes_personnalises` | `programmesPersonnalises` | Programmes de cuisson ajoutés/renommés par l'équipe |
| `bvp_planning_jour_prefs` | `preferencesAffichage` | Ordre des familles, sections ouvertes/fermées |
| `bvp_fichier_magasin` | (supprimé) | Remplacé par la lecture directe du fichier MANAGER dans le dossier partagé |
| `bvp_impression_mode` | `preferencesAffichage.modeImpression` | Mode d'impression (continu/séparé) |
| `bvp_impression_familles` | `preferencesAffichage.famillesImpression` | Familles sélectionnées pour l'impression |

#### Flux de travail complet

**Manager :**
1. Ouvre l'app → PageParametres → désigne ses dossiers (DATA_perso, Mercalys, Archives, Equipe)
2. Configure sa semaine dans le Wizard
3. Exporte → le fichier MANAGER est écrit dans le dossier Archives ET copié dans le dossier Equipe
4. Si modification en cours de semaine : l'outil charge la dernière version, le Manager ajuste, sauvegarde en v+1
5. L'outil peut aussi lire le fichier EQUIPE pour récupérer les personnalisations terrain

**Équipe :**
1. Ouvre l'app → PageParametres → désigne le dossier partagé
2. L'app scanne et charge automatiquement le dernier fichier MANAGER de la semaine courante
3. L'équipier travaille (planning, personnalisations, inventaire)
4. Chaque sauvegarde écrit le fichier EQUIPE dans le même dossier partagé
5. Si changement de PC : l'équipier désigne le même dossier → retrouve toutes ses données

#### État d'avancement de la migration

- [x] Fichier MANAGER : export dans dossierArchives (Etape5Communication.jsx)
- [x] Fichier MANAGER : copie dans dossierEquipe (Etape5Communication.jsx)
- [x] Manager lit le fichier EQUIPE depuis dossierEquipe (EtapeConfigPlanning.jsx lignes 582-620)
- [x] Manager lit les archives MANAGER depuis dossierArchives (EtapeConfigPlanning.jsx lignes 530-580)
- [x] Équipe : remplacer import fichier par sélection dossier partagé dans PageParametres (AppV5.jsx ITEMS_EQUIPE → directory)
- [x] Équipe : scanner le dossier pour charger le dernier MANAGER automatiquement (dossierEquipeService.js + AccueilEquipe.jsx)
- [x] Équipe : écrire le fichier EQUIPE dans le dossier partagé (PlanningJour.jsx → sauvegarderFichierEquipe debounced 2s)
- [x] Équipe : charger les personnalisations depuis le fichier EQUIPE au lieu de localStorage (PlanningJour.jsx init depuis donneesEquipe)
- [x] Versioning : détection et lecture de la version la plus haute (dossierEquipeService.js parseNomFichier + scan)
- [ ] Versioning : incrémentation de version quand le Manager régénère (côté Manager, à faire)
- [x] CommandeEquipe : sauvegarde auto inventaires dans fichier EQUIPE (debounced) + export vers dossier partagé
- [ ] Migration : supprimer progressivement les clés localStorage après validation terrain

---

### Format fichier échange V2.0

Source : `src/services/fichierEchangeService.js` lignes 65-249

**Fichier Manager (lignes 65-183) :** contient magasin, planning, parametres, frequentation, animationCommerciale, commande, planningHoraire, produits, stats

**Fichier Équipe (lignes 200-249) :** contient magasin, semaine, annee, operateur, personnalisations, inventaires, plaquageJ1, stats

### Format fichier magasin V2.1

Source : `src/services/fichierMagasin.js` lignes 76-116

```javascript
{
  version: '2.1',
  dateGeneration: 'ISO timestamp',
  magasin: { nom, code },
  joursOuverture: {
    [jour]: {
      matin:     { statut: 'ouvert'|'ferme_habituel'|'ferme_exceptionnel' },
      apresMidi: { statut: 'ouvert'|'ferme_habituel'|'ferme_exceptionnel' }
    }
  },
  frequentation: { courbeJournaliere, courbeHoraire },
  commande: { joursCommande, joursLivraison },
  pilotageCA: {},
  produits: []
}
```

### Format WizardTermine V2.0 (.bvp.json export responsable)

Source : `src/components/responsable/WizardTermine.jsx` lignes 145-241

```javascript
{
  schemaVersion: '2.0',
  createdAt: 'ISO timestamp',
  createdBy: 'BVP Planning V2.0',
  magasin: { nom, code },
  configuration: {
    semaine, annee, dateDebut, dateFin,
    horaires,
    baseCalcul: 'PDV' | 'BVP',
    limitesProgression: { [famille]: { [jour]: 'S'|'F'|'f' } },
    repartitionParFamille: { [famille]: 'tranches'|'journalier' }
  },
  frequentation: {
    base, parJour: { [jour]: { total, poids, tranches } }, totalSemaine
  },
  objectifs: { caPrevi, caHisto, progression, afficherCAEquipe },
  animationCommerciale: { periodeDefautDebut, periodeDefautFin, promos: [] },
  produitsExceptionnels: [],
  produits: []
}
```

---

## 🖨️ VUES ÉQUIPE — RÈGLES D'AFFICHAGE

### Produits à quantité 0 : MASQUÉS

Source : `src/components/equipe/planning/ProgrammeGroup.jsx` lignes 68-83

```javascript
produits.forEach(produit => {
  const total = qtes.total?.preco || 0;
  if (total > 0) { actifs.push({...}); }
  else { masques++; }
});
// Footer affiche : "+N produit(s) masqué(s) (préco = 0)"
```

### Toggle Unités/Plaques : OUI, EXISTE

Source : `src/components/equipe/planning/BarreOutils.jsx` lignes 128-151

- Variable d'état : `affichage` = `'unites'` | `'plaques'`
- Deux boutons dans la barre d'outils
- Conversion : `CellulesPlanning.jsx` ligne 9 : `Math.ceil(valeur / unitesParPlaque)`
- Totaux programmes en plaques : `ProgrammeGroup.jsx` lignes 88-115

### Totaux programmes

Source : `src/components/equipe/planning/ProgrammeGroup.jsx` lignes 88-115

```javascript
// Conversion en plaques pour chaque produit dans le programme :
totaux[tranche] += Math.ceil(qte / unitesParPlaque * 10) / 10
// Affichage : "TOTAL [PROGRAMME] — 2.5 Pl." par tranche
// Toujours en plaques, fond amber-50
```

### Colonne "Pertes" : SUPPRIMÉE en V5

Source : `src/components/equipe/planning/SectionImpression.jsx` ligne 5

```javascript
// (colonne Perte supprimée — non utilisée)
```

Aucune référence à "pertes" ou "perte" comme colonne dans le code actif.

### Sélecteur de tranches : MANAGER UNIQUEMENT

Le `nbTranches` est lu depuis `configuration.nbTranches` (PlanningJour.jsx ligne 69). Il est défini par le Manager à l'étape 4 (Etape3Configuration). L'équipe ne peut PAS modifier le nombre de tranches.

### Drag & drop des programmes : OUI, IMPLÉMENTÉ

Source : `src/hooks/useDragReorder.js` (110 lignes)

- Drag & drop des **familles** (réordonnancement vertical)
- Drag & drop des **programmes** au sein d'une famille
- Persistance via localStorage (clé `bvp_planning_jour_prefs`)
- Visual feedback : opacity-50, scale-[0.98], ring-2 ring-[#ED1C24]
- Handlers : `handleDragStartFamille`, `handleDropFamille`, `handleDragStartProgramme`, `handleDropProgramme`

### Modes d'affichage planning

| Mode | Variable | Valeurs | Source |
|------|----------|---------|--------|
| Unités/Plaques | `affichage` | `'unites'` / `'plaques'` | BarreOutils.jsx L128-151 |
| Simple/Détaillé | `modeSimplifie` | `true` (qté seule) / `false` (préco/histo/%) | PlanningJour.jsx L36 |
| Distribution | `modeRepartition` | `'tranches'` / `'journalier'` | configuration.repartitionParFamille |

### Clés localStorage équipe

Source : `src/components/equipe/planning/constants.js` lignes 6-11

```javascript
'bvp_planning_jour_prefs'        // sections ouvertes + ordre personnalisé
'bvp_produits_modifies'          // modifications produits
'bvp_programmes_personnalises'   // programmes de cuisson personnalisés
```

---

## 🎨 CHARTE GRAPHIQUE MOUSQUETAIRES

### Couleurs principales

Source : `src/styles/mousquetaires-theme.js` lignes 6-45

| Nom | Code Hex | Usage | Source |
|-----|----------|-------|--------|
| Rouge Mousquetaires | `#ED1C24` | Actions principales, titres, erreurs | L9 |
| Bordeaux (Rouge Sombre) | `#8B1538` | Accents, header, hover | L10 |
| Rouge Clair | `#FF4D4D` | Hover léger | L11 |
| Beige | `#E8E1D5` | Fonds de page, zones secondaires | L15 |
| Beige Clair | `#F5F2ED` | Fond très léger | L16 |
| Gris | `#D1D3D4` | Séparateurs, bordures | L17 |
| Gris Foncé | `#58595B` | Textes principaux | L18 |
| Noir | `#000000` | Texte primaire | L23 |
| Blanc | `#FFFFFF` | Texte sur fond sombre | L25 |
| Succès | `#28A745` | Vert validation | L32 |
| Warning | `#FFC107` | Jaune alerte | L33 |
| Erreur | `#ED1C24` | Rouge Mousquetaires | L34 |
| Info | `#8B1538` | Bordeaux | L35 |

### Couleurs par famille

Source : `src/styles/mousquetaires-theme.js` lignes 39-45

| Famille | Couleur code | Couleur visuelle |
|---------|-------------|------------------|
| BOULANGERIE | `#FF8C42` | Orange |
| VIENNOISERIE | `#4A90E2` | Bleu |
| PATISSERIE | `#9B59B6` | Violet |
| SNACKING | `#27AE60` | Vert |
| AUTRE | `#95A5A6` | Gris |

### Couleurs Tailwind par famille (CSS classes)

| Famille | Background | Border | Text |
|---------|------------|--------|------|
| BOULANGERIE | `bg-stone-100` | `border-stone-300` | `text-stone-800` |
| VIENNOISERIE | `bg-amber-100` | `border-amber-300` | `text-amber-800` |
| PATISSERIE | `bg-rose-100` | `border-rose-300` | `text-rose-800` |
| SNACKING | `bg-emerald-100` | `border-emerald-300` | `text-emerald-800` |
| AUTRE | `bg-slate-100` | `border-slate-300` | `text-slate-800` |

### Couleurs diagnostic

Source : `src/components/manager/Etape1Diagnostic.jsx` lignes 33-39

```javascript
COLORS = {
  moi: '#8B1538',        // Bordeaux — magasin courant
  historique: '#9CA3AF',  // Gris — S-1, AS-1
  secteur: '#3B82F6',     // Bleu — secteur
  gain: '#22C55E',        // Vert — potentiel
  perte: '#EF4444'        // Rouge — alerte
}
```

### Couleurs tranches production

Source : `src/components/ModeProductionEnCours.jsx` lignes 111-130

```
matin:      sky-400 to sky-500 (bleu)
midi:       yellow-400 to yellow-500 (jaune)
après-midi: orange-500 to orange-600 (orange)
casse:      red-600 to red-700 (rouge)
```

### Boutons

Source : `src/styles/mousquetaires-theme.js` lignes 69-114

- **Primaire** : fond rouge Mousquetaires, texte blanc, hover rouge sombre
- **Secondaire** : fond beige, texte rouge sombre, bordure rouge, hover rouge + blanc
- **Focus** : `ring-2 ring-amber-500 ring-offset-2`

---

## 🔗 INTERDÉPENDANCES PRINCIPALES

### Services → qui les utilise

| Service | Utilisé par | Fonction principale |
|---------|------------|---------------------|
| `potentielCalculator` | EtapePersonnalisation, WizardResponsable, PilotageCA | Calcul potentiel hebdo |
| `planningCalculator` | EtapePlanning, calculerQuantites | Planning initial |
| `planningRecalculator` | EtapePlanning (via variantes) | Recalcul avec variantes |
| `caCalculator` | Etape2ObjectifCA, Etape4PilotageCA, PilotageCA | Calcul CA |
| `referentielITM8` | WizardManager (chargement), Etape0Import, EtapePersonnalisation | Matching produits |
| `conditionnementService` | OngletCommande, StepCommande | CDT cartons |
| `excelParser` | EtapeUpload, Etape2ObjectifCA, ImportDonnees | Parseur Excel |
| `fichierEchangeService` | Etape5Communication, AccueilEquipe | Export/import .bvp.json |
| `fichierMagasin` | FichierMagasin, AccueilEquipe | Fichier magasin |
| `productClassifier` | WizardResponsable (enrichissement) | Classification auto |
| `dataExtractionService` | Etape0Import | Extraction PDV |
| `gammeExtractionService` | Etape0Import, Etape2bImportVentes | Extraction ventes/casse |

### Contextes → qui les consomme

| Contexte | Consommé par |
|----------|-------------|
| `MagasinContext` | Tous les composants manager/* (via `useMagasin()`) |
| `ProfilContext` | Header, Navigation, ProfilSwitch (via `useProfil()`) |

### Hooks → qui les utilise

| Hook | Utilisé par | Rôle |
|------|------------|------|
| `useDeviceType` | TouchButton, PlanningVueTablet | Responsive |
| `useDragReorder` | PlanningJour | Drag & drop |
| `useProductionStorage` | ModeProductionEnCours | localStorage production |
| `useColonnesVisibles` | PlanningJour | Colonnes selon config |
| `useProduitsGroupes` | PlanningJour | Regroupement par famille/prog |
| `useCommandeCalcul` | StepCommande | Calcul commande |

---

## ❌ INTERDICTIONS

1. **NE JAMAIS** modifier les formules de calcul (potentiel, limites S/F/f/P, distribution tranches CDC 13.4.3) sans accord explicite
2. **NE JAMAIS** changer les clés du schéma .bvp.json sans vérifier la rétrocompatibilité
3. **NE JAMAIS** supprimer un mode de calcul existant (mathematique, forte-progression, prudent, etc.)
4. **NE JAMAIS** modifier les constantes de pondération (40/30/30, 30/50/20, 60/20/20)
5. **NE JAMAIS** modifier la logique de redistribution sans comprendre les 3 statuts (ouvert, ferme_habituel, ferme_exceptionnel)
6. **NE JAMAIS** toucher au référentiel ITM8 (structure des Maps, normalisation des codes)
7. **NE JAMAIS** casser la compatibilité entre les 2 wizards (Manager et Responsable)
8. **NE JAMAIS** modifier les 6 tranches internes — c'est la base de tous les calculs
9. **NE JAMAIS** supprimer le localStorage équipe sans migration → **Migration en cours (12/03/2026)** : toutes les données localStorage doivent migrer vers les fichiers .bvp.json. Voir section "ARCHITECTURE DE PERSISTANCE — ZÉRO LOCALSTORAGE". Pendant la transition, lire en priorité depuis le fichier .bvp.json, fallback sur localStorage si fichier absent.
10. **NE JAMAIS** modifier la formule de marge Mousquetaires (TVA 5.5%, calcul PV HT, PA HT)
11. **NE JAMAIS** utiliser `toISOString().split('T')[0]` pour formater une date locale → utiliser `formatDateLocale()` (bug UTC corrigé le 23/02/2026)
12. **NE JAMAIS** réactiver l'auto-deploy Vercel sur le projet `bvp-planning` (URL: `bvp-planning.vercel.app`) — ce site est figé sur la **V4** par décision utilisateur (09/03/2026). Seuls `dist-manager` et `dist-equipe` se déploient automatiquement.

---

## ✅ CHECKLIST AVANT DE TERMINER UNE MODIFICATION

- [ ] Le build (`npm run build`) passe sans erreur
- [ ] L'import d'un fichier .bvp.json fonctionne côté équipe
- [ ] Le wizard manager navigue correctement étape par étape
- [ ] Les quantités calculées correspondent aux formules documentées
- [ ] Le toggle Unités/Plaques fonctionne dans les 2 sens
- [ ] Les produits à quantité 0 sont bien masqués
- [ ] Le drag & drop des familles/programmes fonctionne
- [ ] L'impression (PlanningJour, PlanningHebdo) génère un rendu correct avec date complète
- [ ] L'export Excel génère un fichier .xlsx avec colonnes PLU/EAN séparées et vue semaine
- [ ] Les 3 types de pondération produisent des résultats différents
- [ ] **CLAUDE.md** et **ADDENDUM_CDC_V5.2.md** sont mis à jour avec les modifications effectuées
- [ ] L'export .bvp.json contient tous les champs requis par le schéma
- [ ] Les archives existantes (.bvp.json V2.0, V2.1, V3.0) restent lisibles
- [ ] Les constantes métier n'ont pas été modifiées par inadvertance
- [ ] Aucun `console.log` de debug n'a été laissé dans le code

---

## 📋 ANOMALIES DÉTECTÉES LORS DE L'AUDIT

1. **Plancher incohérent** : Dans `planningRecalculator.js` (L88-109), le plancher est `historique × 0.95` (95%), alors que dans `Etape4PilotageCA.jsx` (L66-68) le plancher est `historique` (100%). Les deux coexistent — à clarifier.

2. **Deux systèmes de nommage des modes** : Le wizard Manager utilise `'S'/'F'/'f'/'P:xx'` (strings courts) tandis que le recalculator utilise `'sans'/'forte'/'faible'/'personnalisee'` (strings longs). Les deux fonctionnent mais la correspondance n'est pas explicite dans le code.

3. **Deux wizards parallèles** : `WizardManager` (7 étapes, contexte MagasinContext) et `WizardResponsable` (5 étapes, state local wizardData). Ils produisent des formats .bvp.json légèrement différents (V3.0 vs V2.0).

4. **Mode `'moyenne-stats'`** : Défini dans EtapePersonnalisation (L60) mais sa formule exacte n'est pas documentée dans potentielCalculator — elle semble correspondre à `calculerPotentielsPourTous` avec mode='moyenne-stats'. À vérifier.

5. **Preset 4T** : Le preset 4 tranches est mentionné dans la documentation (constants.js L65-92) mais sa composition exacte n'est pas aussi claire que les presets 3T, 5T et 6T.

6. **Distribution par défaut famille** : `WizardResponsable.jsx` (L38-45) définit `REPARTITION_DEFAUT` avec `NEGOCE: 'journalier'` mais la famille NEGOCE n'apparaît pas dans `LIMITES_PROGRESSION_DEFAUT` — cohérence à vérifier.

---

## 🤝 MÉTHODE DE COLLABORATION COWORK ↔ CLAUDE CODE

Voir `ORGANISATION_PROJET.md` pour le flux de travail complet, les règles de format des prompts, et la règle QUOI+POURQUOI (pas le COMMENT).

7. ~~**Bug UTC dateDebut**~~ **CORRIGÉ le 23/02/2026** : `getDateDebutSemaine()` dans `Etape5Communication.jsx` utilisait `toISOString().split('T')[0]` qui convertit en UTC → en France (UTC+1), un lundi minuit devenait dimanche 23h UTC → date de la veille stockée dans le .bvp.json. Corrigé avec `formatDateLocale()`. Rétrocompatibilité assurée dans `helpers.js` (si dateDebut = dimanche → +1 jour).

8. ~~**`repartitionParFamille` codée en dur**~~ **CORRIGÉ le 23/02/2026** : Dans `Etape5Communication.jsx`, la `repartitionParFamille` était codée en dur avec des valeurs par défaut au lieu d'être déduite de `tranchesParFamille` configuré par le manager. Corrigé : si une famille a >1 tranche → 'tranches', si 1 seule tranche → 'journalier'. Règle métier : c'est le manager qui décide, pas l'équipe.

9. ~~**Nettoyage gamme — 5 bugs**~~ **CORRIGÉ le 23/02/2026** :
   - **Bug 3** : L'ordre des passes doublons/PRE-PAC était incorrect — la fusion de doublons avant PRE/PAC empêchait la détection PRE car les libellés normalisés sont identiques. Corrigé : PRE/PAC (passe 2) avant doublons (passe 3). Ajout de `PRECUIT` dans le regex PRE. Recherche équivalent PAC dans tous les produits (actifs ET inactifs).
   - **Bug 2** : Les galettes n'étaient pas marquées "hors-saison" car la passe 4 ignorait les produits déjà inactifs (promos). Corrigé : la passe hors-saison s'applique aussi aux produits déjà désactivés (écrase `raisonDesactivation: 'promo'` par `'hors-saison'`).
   - **Bug 1** : Presque tous les produits en rayon "AUTRE" car les EAN V2 (internes/balance) ne matchent pas les EAN standards des ventes. Corrigé : (a) enrichissement du rayon depuis le ref V2 quand un match est trouvé, (b) heuristique élargie avec plus de mots-clés (tradition, buchette, beignet, donut, cookie, wrap, panini...).
   - **Bug 4** : 266 "à créer" — seuil fuzzy trop strict. Corrigé : (a) seuil abaissé à 0.4, (b) score pondéré 50% Jaccard + 50% couverture tokens vente, (c) matching par sous-chaîne (inclusion) ajouté avant le fuzzy, (d) filtre P&C : ne pas proposer un produit P&C "à créer" si un non-P&C avec le même libellé normalisé existe.
   - **Bug 5** : Ajout de la gestion manuelle des doublons — boutons "Séparer" et "Fusionner avec..." dans OngletGamme. Corrections persistées dans localStorage (`bvp_corrections_doublons`). Passe 6 ajoutée dans `nettoyerGamme()`.

10. ~~**Nettoyage gamme V2 — 2 bugs**~~ **CORRIGÉ le 23/02/2026** :
   - **Bug critique** : L'archive `.bvp.json` (semaine précédente) écrasait les résultats du nettoyage. Dans `MagasinContext.jsx`, le `useEffect` qui applique l'archive remettait `actif: true` et `rayon` d'avant le ref V2 sur les produits. Corrigé : ne PAS écraser `actif` si `raisonDesactivation` est défini (promo, hors-saison, doublon), ne PAS écraser `rayon` si `matchRefV2` est défini.
   - **Bug secondaire** : Faux positifs fuzzy matching — des produits étaient matchés à tort avec un seul token en commun (ex: `BUGNES CITRON` → `ENTREMET CITRON` sur le mot "CITRON"). Corrigé : exiger au minimum 2 tokens communs pour valider un match fuzzy.

11. ~~**Nettoyage gamme V3 — 3 corrections structurelles**~~ **CORRIGÉ le 24/02/2026** :
   - **Correction 1** : `normaliserLibelle()` ne gérait pas les fractions (1/2, 1/3), ni le "/" comme séparateur, ni les nombres seuls, lots (X8) ou diamètres (D22). Corrigé : fractions → DEMI/TIERS/QUART, "/" → espace, retrait des nombres 2-4 chiffres, X\d+, D\d+, OFF, S.A, PRECUIT dans les exclusions.
   - **Correction 2** : Le fuzzy matching comparait les tokens en exact uniquement → "FOUR" ≠ "FOURRES", "POM" ≠ "POMME". Corrigé : ajout de `scoreTokens()` avec correspondance par préfixe (min 3 chars) valant 0.7 au lieu de 1.0. Le `calculerScore()` utilise maintenant un matching bijectif (chaque token ref utilisé une seule fois).
   - **Correction 3** : Heuristique rayon enrichie dans `gammeExtractionService.js` avec : canelé, meringuette, meringue, moelleux, mouna, opéra, tropézienne, fraisier, paris brest, millefeuille, religieuse, gaufre, craquotant, fondant, tiramisu (PATISSERIE) + pavé, miche, boule, campagn (BOULANGERIE).

---

## 🧹 NETTOYAGE INTELLIGENT DE LA GAMME

Source : `src/services/nettoyageGamme.js`

### Pipeline de nettoyage (6 passes)

| Passe | Nom | Description |
|-------|-----|-------------|
| 1 | Promos | Désactive les produits commençant par `*` |
| 2 | PRE/PAC | Désactive les PRE si un PAC équivalent existe (même libellé normalisé) |
| 3 | Doublons | Fusionne les doublons (même libellé normalisé), garde le CA le plus élevé |
| 4 | Hors saison | Désactive galettes (jan), Noël (nov-dec), bûches (nov-dec). Exception : BUCHETTE = pain |
| 5 | Matching V2 | Enrichit avec le référentiel V2 (ITM8, EAN, sous-chaîne, fuzzy). Ajoute les "à créer" |
| 6 | Corrections manuelles | Applique les séparations/fusions manuelles depuis localStorage |

### Clés localStorage

- `bvp_corrections_doublons` : `{ separations: string[], fusions: [{ source, cible }] }`

### Fichiers impactés

| Fichier | Rôle |
|---------|------|
| `nettoyageGamme.js` | Service de nettoyage (6 passes) |
| `gammeExtractionService.js` | Appel `nettoyerGamme()` en fin de `formaterPourPilotageCA()` |
| `OngletGamme.jsx` | Tags visuels, compteurs, filtres, boutons Séparer/Fusionner |
| `Etape4PilotageCA.jsx` | Passe `onReloadGamme` pour les corrections manuelles |

---

## 📊 EXPORT EXCEL — PLANNING ÉQUIPE

Source : `src/components/equipe/planning/exportExcel.js`

### Vue semaine (défaut depuis le 23/02/2026)

Le bouton Excel génère un fichier `.xlsx` avec **tous les jours de la semaine** :

```
Famille | Programme | Produit | Code PLU | Code EAN | Lundi - Matin | Lundi - 12h-14h | ... | Total Lundi | Mardi - Matin | ... | Total Semaine
```

- Colonnes **Code PLU** et **Code EAN** séparées (anciennement une seule colonne "Code PLU/EAN")
- Pour chaque jour : colonnes par tranche horaire + total du jour
- Dernière colonne : total semaine
- Fichier nommé : `Planning-Semaine-S{sem}-{codePDV}.xlsx`

### Vue jour (legacy, accessible via option `vueSemaine: false`)

```
Famille | Programme | Produit | Code PLU | Code EAN | [tranches] | Total jour | Historique
```

- Même structure qu'avant mais avec PLU/EAN séparés
- Fichier nommé : `Planning-{Jour}-S{sem}-{codePDV}.xlsx`

### Modes d'impression Excel

- **continu** : 1 seul onglet "Planning Semaine" avec toutes les familles
- **séparé** : 1 onglet par famille (nom de l'onglet = nom de la famille)
- Filtre familles respecté (`famillesImpression`)

---

## 🖨️ IMPRESSION — DATES COMPLÈTES

Source : `src/components/equipe/planning/SectionImpression.jsx`

### Format de date dans les en-têtes

L'en-tête de chaque fiche affiche la date complète : **"Planning Lundi 23 Mars 2026"**

- Calculée via `getDateJour()` dans `helpers.js` (utilise `configuration.dateDebut`)
- Fallback si `dateDebut` absent : calcul ISO depuis `configuration.semaine` + `configuration.annee`
- Première lettre en majuscule automatique

### Impression semaine

`handlePrintSemaine()` génère **7 fiches** (Lundi → Dimanche), une par page A4, avec saut de page entre chaque. Les options d'impression (mode continu/séparé, sélection de familles) sont respectées sur chaque fiche.

---

## 🔧 CORRECTIONS — DATES ET FUSEAUX HORAIRES

### Bug UTC corrigé le 23/02/2026

**Fichiers impactés :**

| Fichier | Correction |
|---------|-----------|
| `Etape5Communication.jsx` | `toISOString()` → `formatDateLocale()` (évite conversion UTC) |
| `helpers.js` | Parsing `new Date(Y, M-1, D)` au lieu de `new Date("Y-M-D")` + correction rétrocompat si dateDebut = dimanche |
| `AccueilEquipe.jsx` | Propagation de `dateDebut` dans l'objet `configuration` passé à PlanningJour |
| `SectionImpression.jsx` | Utilisation de `dateJourFormatee` au lieu du doublon jourComplet + dateJour |

**Règle :** ne JAMAIS utiliser `toISOString().split('T')[0]` pour formater une date locale en YYYY-MM-DD. Toujours utiliser `formatDateLocale()` ou `new Date(year, month-1, day)` pour éviter les décalages UTC.
