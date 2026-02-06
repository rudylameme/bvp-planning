# AUDIT COMPLET - BVP Planning
**Date :** 06/02/2026
**Mode :** Lecture seule - Aucun fichier modifie
**Total lignes de code (src/) :** 35 630 lignes
**Total fichiers source :** 82 fichiers (hors node_modules, .git)

---

## 1. CARTOGRAPHIE - Arbre des fichiers

### 1.1 Fichiers source (src/) - 35 630 lignes

| # | Fichier | Lignes | Role |
|---|---------|--------|------|
| | **POINTS D'ENTREE** | | |
| 1 | `src/main.jsx` | 23 | Point d'entree principal, lance AppV5 ou AccueilEquipe selon VITE_APP_MODE |
| 2 | `src/main-v4.jsx` | 12 | Point d'entree alternatif pour la version V4 |
| 3 | `src/main-manager.jsx` | 13 | Point d'entree standalone mode Manager |
| 4 | `src/main-equipe.jsx` | 13 | Point d'entree standalone mode Equipe |
| | **APP SHELLS** | | |
| 5 | `src/App.jsx` | 687 | Shell V4 avec accueil/benchmark/planning wizard |
| 6 | `src/AppV2.jsx` | 126 | Shell V2 avec ProfilProvider et switch Responsable/Equipe |
| 7 | `src/AppV4.jsx` | 190 | Shell V4 combinant accueil/benchmark avec profils |
| 8 | `src/AppV5.jsx` | 44 | Shell V5 le plus simple : 3 ecrans (accueil/manager/equipe) |
| 9 | `src/App_V3_backup.jsx` | 630 | Backup V3 pre-accueil/benchmark (~90% identique a App.jsx) |
| | **STYLES** | | |
| 10 | `src/App.css` | 43 | CSS boilerplate Vite (INUTILISE) |
| 11 | `src/index.css` | 86 | Tailwind directives + styles d'impression A4 |
| 12 | `src/styles/mousquetaires-theme.js` | 117 | Palette couleurs Mousquetaires et config Tailwind |
| | **CONTEXTES** | | |
| 13 | `src/contexts/MagasinContext.jsx` | 274 | Contexte global V5 Manager (30+ variables d'etat) |
| 14 | `src/contexts/ProfilContext.jsx` | 36 | Contexte profil Responsable/Employe |
| | **HOOKS** | | |
| 15 | `src/hooks/useDeviceType.js` | 78 | Detection responsive (mobile/tablet/desktop) |
| 16 | `src/hooks/useProductionStorage.js` | 98 | Persistance localStorage production |
| | **COMPOSANTS PRINCIPAUX** | | |
| 17 | `src/components/AccordeonRayon.jsx` | 85 | Section accordeon par rayon |
| 18 | `src/components/AccueilGlobal.jsx` | 150 | Ecran d'accueil global V5 |
| 19 | `src/components/AccueilGlobalV4.jsx` | 150 | Ecran d'accueil global V4 |
| 20 | `src/components/AttributionManuelle.jsx` | 129 | Modal attribution produits non reconnus |
| 21 | `src/components/EtapeConfigurationSemaine.jsx` | 371 | Config semaine (jours, fermetures, import/export) |
| 22 | `src/components/EtapePersonnalisation.jsx` | 556 | Personnalisation produits (labels, rayons, programmes) |
| 23 | `src/components/EtapePlanning.jsx` | 996 | Vue planning hebdo avec variantes et impressions |
| 24 | `src/components/EtapeUpload.jsx` | 321 | Upload fichiers frequentation/ventes |
| 25 | `src/components/GestionProgrammes.jsx` | 223 | Modal gestion programmes de cuisson |
| 26 | `src/components/ImpressionPanel.jsx` | 599 | Panel impression planning (jour/semaine) |
| 27 | `src/components/ModeCasseGlobal.jsx` | 116 | Mode saisie casse/invendus |
| 28 | `src/components/ModeProductionEnCours.jsx` | 394 | Checklist production avec suivi stock/casse |
| 29 | `src/components/ModeSuiviTempsReel.jsx` | 188 | Dashboard suivi temps reel production |
| 30 | `src/components/PlanningVueTablet.jsx` | 351 | Vue planning optimisee tablette |
| 31 | `src/components/StatistiquesPanel.jsx` | 100 | Panel statistiques frequentation |
| 32 | `src/components/TableauProduits.jsx` | 284 | Tableau produits plat (non-groupe) |
| 33 | `src/components/TableauProduitsGroupes.jsx` | 326 | Tableau produits groupe par rayon |
| 34 | `src/components/TouchButton.jsx` | 84 | Bouton adaptatif tactile/desktop |
| | **COMPOSANTS LAYOUT** | | |
| 35 | `src/components/layout/Header.jsx` | 45 | Header avec logo Mousquetaires |
| 36 | `src/components/layout/ModeSwitch.jsx` | 26 | Toggle Desktop/Tablette |
| 37 | `src/components/layout/Navigation.jsx` | 48 | Navigation par onglets selon profil |
| 38 | `src/components/layout/ProfilSwitch.jsx` | 30 | Toggle Responsable/Equipier |
| | **COMPOSANTS MANAGER** | | |
| 39 | `src/components/manager/WizardManager.jsx` | 321 | Wizard principal Manager V5 (6 etapes) |
| 40 | `src/components/manager/Etape0Import.jsx` | 477 | Import donnees avec validation |
| 41 | `src/components/manager/Etape1Diagnostic.jsx` | 1151 | Diagnostic complet magasin |
| 42 | `src/components/manager/Etape2ObjectifCA.jsx` | 776 | Objectifs CA avec potentiel |
| 43 | `src/components/manager/Etape2bImportVentes.jsx` | 248 | Import secondaire ventes |
| 44 | `src/components/manager/Etape3Configuration.jsx` | 510 | Configuration semaine et jours |
| 45 | `src/components/manager/Etape4PilotageCA.jsx` | 1641 | Pilotage CA avec gamme/limites/suivi |
| 46 | `src/components/manager/Etape5Communication.jsx` | 509 | Export fichier .bvp.json pour equipe |
| 47 | `src/components/manager/FicheCommandeImpression.jsx` | 403 | Fiche commande imprimable |
| 48 | `src/components/manager/OngletCommande.jsx` | 1158 | Gestion commandes multi-livraisons |
| 49 | `src/components/manager/components/CarteIndicateur.jsx` | 121 | Carte KPI reutilisable |
| 50 | `src/components/manager/components/GraphiqueFlux.jsx` | 161 | Graphique barres penetration |
| | **COMPOSANTS RESPONSABLE** | | |
| 51 | `src/components/responsable/WizardResponsable.jsx` | 378 | Wizard principal Responsable (5 etapes) |
| 52 | `src/components/responsable/ConfigJours.jsx` | 317 | Config jours/creneaux 3 etats |
| 53 | `src/components/responsable/ConfigurationProduits.jsx` | 284 | Selection/configuration produits |
| 54 | `src/components/responsable/FicheCommandeImpression.jsx` | 403 | Fiche commande imprimable (DOUBLON) |
| 55 | `src/components/responsable/FichierMagasin.jsx` | 123 | Export/import fichier .bvp.json |
| 56 | `src/components/responsable/ImportDonnees.jsx` | 239 | Import fichiers Excel |
| 57 | `src/components/responsable/PilotageCA.jsx` | 1096 | Pilotage CA avec edition produits |
| 58 | `src/components/responsable/ProgressBar.jsx` | 70 | Barre de progression 5 etapes |
| 59 | `src/components/responsable/StepAnimationCommerciale.jsx` | 1341 | Gestion promotions et elasticite |
| 60 | `src/components/responsable/StepCommande.jsx` | 1317 | Commande multi-livraisons avec forwardRef |
| 61 | `src/components/responsable/StepSemaine.jsx` | 409 | Config semaine/magasin |
| 62 | `src/components/responsable/WizardTermine.jsx` | 441 | Ecran final avec export .bvp.json v2.0 |
| | **COMPOSANTS BENCHMARK** | | |
| 63 | `src/components/benchmark/AccueilBenchmark.jsx` | 464 | Accueil benchmark avec selection dossier |
| 64 | `src/components/benchmark/BenchmarkModule.jsx` | 62 | Orchestrateur benchmark |
| 65 | `src/components/benchmark/ClassementSecteur.jsx` | 261 | Classement magasin dans le secteur |
| 66 | `src/components/benchmark/DashboardBenchmark.jsx` | 1159 | Dashboard benchmark avec KPIs |
| 67 | `src/components/benchmark/index.js` | 9 | Barrel exports benchmark |
| | **COMPOSANTS EQUIPE** | | |
| 68 | `src/components/equipe/AccueilEquipe.jsx` | 248 | Accueil equipe avec selection module |
| 69 | `src/components/equipe/CommandeEquipe.jsx` | 655 | Ecran commande simplifie equipe |
| 70 | `src/components/equipe/FicheInventaire.jsx` | 245 | Fiche inventaire imprimable A4 |
| 71 | `src/components/equipe/ImportFichierEquipe.jsx` | 286 | Import fichier .bvp.json avec drag-and-drop |
| 72 | `src/components/equipe/PlanningJour.jsx` | 2637 | Planning journalier complet (LE PLUS GROS FICHIER) |
| | **SERVICES** | | |
| 73 | `src/services/caCalculator.js` | 134 | Calculs CA hebdo/produit |
| 74 | `src/services/calculService.js` | 311 | Calculs benchmark secteur |
| 75 | `src/services/conditionnementService.js` | 248 | Service conditionnements produits |
| 76 | `src/services/dataExtractionService.js` | 1165 | Extraction donnees depuis Excel |
| 77 | `src/services/excelParser.js` | 746 | Parsing fichiers Excel V2 |
| 78 | `src/services/fichierEchangeService.js` | 462 | Service echange fichiers V2 |
| 79 | `src/services/fichierMagasin.js` | 252 | Service fichier magasin .bvp.json |
| 80 | `src/services/fichierPartageService.js` | 383 | Service partage fichiers V1 |
| 81 | `src/services/gammeExtractionService.js` | 903 | Extraction gamme produits |
| 82 | `src/services/planningCalculator.js` | 625 | Calcul planning hebdomadaire |
| 83 | `src/services/planningRecalculator.js` | 350 | Recalcul planning avec variantes |
| 84 | `src/services/potentielCalculator.js` | 641 | Calcul potentiel ventes |
| 85 | `src/services/productClassifier.js` | 159 | Classification produits par mots-cles |
| 86 | `src/services/referentielITM8.js` | 368 | Referentiel ITM8 produits |
| | **UTILS** | | |
| 87 | `src/utils/classification.js` | 43 | Classification produits en familles |
| 88 | `src/utils/conversionUtils.js` | 35 | Conversion unites/plaques |
| 89 | `src/utils/dateUtils.js` | 64 | Utilitaires dates |
| 90 | `src/utils/parsers.js` | 646 | Parsers Excel/CSV V1 |
| 91 | `src/utils/weekCalculator.js` | 161 | Calculs semaines ISO |

### 1.2 Fichiers racine

| # | Fichier | Lignes | Role |
|---|---------|--------|------|
| | **CONFIGS** | | |
| 1 | `vite.config.js` | 7 | Config Vite par defaut |
| 2 | `vite.config.v4.js` | 30 | Config Vite V4 avec redirect |
| 3 | `vite.config.manager.js` | 15 | Config build Manager |
| 4 | `vite.config.equipe.js` | 18 | Config build Equipe |
| 5 | `tailwind.config.js` | 29 | Tailwind avec couleurs Mousquetaires |
| 6 | `postcss.config.js` | 6 | PostCSS (tailwind + autoprefixer) |
| 7 | `eslint.config.js` | 29 | ESLint flat config |
| 8 | `vercel.json` | 13 | Config deploiement Vercel |
| 9 | `package.json` | 36 | Dependances et scripts |
| | **HTML** | | |
| 10 | `index.html` | 13 | Entree principale (main.jsx) |
| 11 | `index-v4.html` | 13 | Entree V4 (main-v4.jsx) |
| 12 | `index-manager.html` | 14 | Entree Manager (main-manager.jsx) |
| 13 | `index-equipe.html` | 14 | Entree Equipe (main-equipe.jsx) |
| | **SCRIPTS DE TEST/DEBUG** | | |
| 14 | `analyze-excel.js` | 42 | Inspecteur structure Excel |
| 15 | `comparaison-3-methodes.js` | 286 | Comparaison 3 methodes potentiel |
| 16 | `debug-referentiel.js` | 49 | Debug referentiel produits |
| 17 | `simulation-exacte.js` | 398 | Simulation complete du planning |
| 18 | `simulation-planning.js` | 320 | Simulation simplifiee planning |
| 19 | `test-4-regles.js` | 256 | Test systeme 4 regles |
| 20 | `test-exemple-utilisateur.js` | 218 | Test scenario utilisateur |
| 21 | `test-modification-manuelle.js` | 194 | Test modifications manuelles |
| 22 | `test-qte-bvp.js` | 123 | Comparaison metriques BVP |
| 23 | `test-verification-minimum.js` | 237 | Test plancher minimum |
| 24 | `test-verification-prudent.js` | 235 | Test methode prudente |
| 25 | `verification-correction.js` | 247 | Verification fix bug date |
| | **DOCUMENTATION** | | |
| 26 | `CAHIER_DES_CHARGES.md` | 3023 | CDC V1 |
| 27 | `CAHIER_DES_CHARGES_V2.md` | 2373 | CDC V2 |
| 28 | `CAHIER_DES_CHARGES_V3.md` | 1447 | CDC V3 |
| 29 | `CAHIER_DES_CHARGES_V4.md` | 400 | CDC V4 |
| 30 | `CAHIER_DES_CHARGES_V5.md` | 2125 | CDC V5 |
| 31 | `CDC_ADDENDUM_ANIMATION_COMMERCIALE.md` | 451 | Addendum animation commerciale |
| 32 | `CLAUDE.md` | 94 | Instructions Claude Code |
| 33 | `ETAT_REEL_PROJET_V5.md` | 376 | Etat d'avancement V5 |
| 34 | `GUIDE_UTILISATEUR_BVP_PLANNING.md` | 596 | Guide utilisateur |
| 35 | `INSTRUCTIONS_CLAUDE_CODE_PHASE1.md` | 712 | Instructions dev phase 1 |
| 36 | `INSTRUCTIONS_DEPLOIEMENT_GITHUB.md` | 226 | Guide deploiement GitHub |
| 37 | `INSTRUCTIONS_DEPLOIEMENT_VERCEL.md` | 105 | Guide deploiement Vercel |
| 38 | `PLAN_IMPLEMENTATION_V5.md` | 567 | Plan implementation V5 |
| 39 | `PLANNING_DEVELOPPEMENT.md` | 467 | Planning developpement |
| 40 | `RAPPORT_AUDIT_CALCULS.md` | 241 | Rapport audit calculs precedent |
| 41 | `RESPONSIVE-TABLET.md` | 211 | Specs responsive tablette |
| 42 | `SPEC_MODULE_COMMUNICATION.md` | 229 | Specs module communication |
| 43 | `STRUCTURE_PEDAGOGIQUE_V4.md` | 326 | Structure pedagogique V4 |
| 44 | `SYSTEME-4-REGLES.md` | 167 | Documentation systeme 4 regles |

### 1.3 Signalements

#### :red_circle: Fichiers potentiellement inutilises (importes nulle part)

| Fichier | Raison |
|---------|--------|
| `src/App.jsx` | Ancien shell V4, remplace par AppV5.jsx. N'est plus importe par aucun main. |
| `src/AppV2.jsx` | Ancienne version V2, n'est importe par aucun main. |
| `src/AppV4.jsx` | Importe uniquement par main-v4.jsx (config alternative). |
| `src/App_V3_backup.jsx` | Backup explicite, jamais importe. |
| `src/App.css` | CSS boilerplate Vite, aucun fichier ne l'importe. |
| `src/components/AccueilGlobalV4.jsx` | Importe uniquement par AppV4.jsx (V4 obsolete). |
| `src/services/fichierPartageService.js` | Service V1, potentiellement remplace par fichierEchangeService.js. |
| `src/utils/parsers.js` | Parsers V1, potentiellement remplace par excelParser.js. |
| 12 scripts racine (`test-*.js`, `simulation-*.js`, etc.) | Scripts CLI de debug/test, pas dans le bundle web. |

#### :yellow_circle: Fichiers dupliques (code similaire)

| Fichier A | Fichier B | Similarite |
|-----------|-----------|------------|
| `src/App.jsx` (687 lig.) | `src/App_V3_backup.jsx` (630 lig.) | ~90% identique |
| `src/components/manager/FicheCommandeImpression.jsx` (403 lig.) | `src/components/responsable/FicheCommandeImpression.jsx` (403 lig.) | 100% identique |
| `src/utils/parsers.js` (646 lig.) | `src/services/excelParser.js` (746 lig.) | Logique de parsing similaire, V1 vs V2 |
| `src/utils/classification.js` (43 lig.) | `src/services/productClassifier.js` (159 lig.) | Classification produits par mots-cles, 2 approches |
| `src/services/fichierPartageService.js` (383 lig.) | `src/services/fichierEchangeService.js` (462 lig.) | Echange fichiers V1 vs V2 |
| `src/components/AccueilGlobal.jsx` (150 lig.) | `src/components/AccueilGlobalV4.jsx` (150 lig.) | Ecrans d'accueil quasi-identiques |
| `getJourSemaine()` | Presente dans 7 scripts racine | Fonction copier-collee dans chaque script |

#### :orange_circle: Fichiers trop gros (> 300 lignes) - Candidats au decoupage

| Fichier | Lignes | Recommandation |
|---------|--------|----------------|
| `src/components/equipe/PlanningJour.jsx` | **2637** | CRITIQUE - Extraire ModalEditionProduit, ModalGestionProgrammes, genererFicheJourHTML, CelluleSimple/Ecart/Quantite |
| `src/components/manager/Etape4PilotageCA.jsx` | **1641** | Extraire DashboardCA, OngletGamme, OngletLimites, OngletSuivi, PopupCasse, PopupVentes |
| `src/components/responsable/StepAnimationCommerciale.jsx` | **1341** | Extraire le calcul de promotion, le formulaire exceptionnel |
| `src/components/responsable/StepCommande.jsx` | **1317** | Extraire TriableHeader, calcul repartition, stats useMemo |
| `src/services/dataExtractionService.js` | **1165** | Extraire les fonctions d'extraction specifiques par type |
| `src/components/benchmark/DashboardBenchmark.jsx` | **1159** | Extraire CarteIndicateurV2, GraphiqueFluxPenetration, BarresPenetration |
| `src/components/manager/OngletCommande.jsx` | **1158** | Extraire TriableHeader, logique de calcul |
| `src/components/manager/Etape1Diagnostic.jsx` | **1151** | Extraire les sections d'analyse en sous-composants |
| `src/components/responsable/PilotageCA.jsx` | **1096** | Extraire EditableTextCell, EditableNumberCell, SelectCell |
| `src/components/EtapePlanning.jsx` | **996** | Extraire les fonctions de calcul en service |
| `src/services/gammeExtractionService.js` | **903** | Extraire par type d'extraction |
| `src/components/manager/Etape2ObjectifCA.jsx` | **776** | Decouper en sections |
| `src/services/excelParser.js` | **746** | OK mais surveiller la croissance |
| `src/App.jsx` | **687** | Obsolete - a archiver |
| `src/components/equipe/CommandeEquipe.jsx` | **655** | Limite acceptable |
| `src/utils/parsers.js` | **646** | Obsolete si remplace par excelParser.js |
| `src/services/potentielCalculator.js` | **641** | Extraire les fonctions de stats |
| `src/App_V3_backup.jsx` | **630** | Obsolete - a archiver |
| `src/services/planningCalculator.js` | **625** | Limite acceptable |

---

## 2. ARBRE DE DEPENDANCES - Qui appelle qui ?

### 2.1 Architecture V5 (version courante en production)

```
main.jsx (point d'entree)
├── AppV5.jsx (shell principal)
│   ├── state: ecran ('accueil' | 'manager' | 'equipe')
│   ├── → AccueilGlobal.jsx
│   │   └── props: onChoixManager, onChoixEquipe
│   ├── → WizardManager.jsx (mode Manager)
│   │   ├── utilise: MagasinContext (MagasinProvider wrapping)
│   │   ├── state: etapeActuelle (0-5), produits[], configSemaine
│   │   ├── → Etape0Import.jsx
│   │   │   └── utilise: excelParser.js, potentielCalculator.js
│   │   │   └── utilise: referentielITM8.js, productClassifier.js
│   │   ├── → Etape1Diagnostic.jsx
│   │   │   └── utilise: calculService.js, caCalculator.js
│   │   ├── → Etape2ObjectifCA.jsx
│   │   │   └── utilise: caCalculator.js, potentielCalculator.js
│   │   ├── → Etape3Configuration.jsx
│   │   │   └── utilise: ConfigJours (responsable/)
│   │   ├── → Etape4PilotageCA.jsx
│   │   │   └── utilise: conditionnementService.js
│   │   │   └── sous-onglets: Gamme, Limites, Suivi, Commande
│   │   │   ├── → OngletCommande.jsx
│   │   │   │   └── utilise: conditionnementService.js
│   │   │   │   └── → FicheCommandeImpression.jsx (manager/)
│   │   │   └── → StepAnimationCommerciale.jsx (responsable/)
│   │   └── → Etape5Communication.jsx
│   │       └── export: fichier .bvp.json (schema 3.0)
│   └── → AccueilEquipe.jsx (mode Equipe)
│       ├── → ImportFichierEquipe.jsx
│       │   └── hook: useFichierMagasin (localStorage)
│       ├── → PlanningJour.jsx (module Planning)
│       │   └── utilise: localStorage pour preferences
│       │   └── genere: HTML impression A4
│       └── → CommandeEquipe.jsx (module Commande)
│           └── utilise: fichierEchangeService.js
│           └── → FicheInventaire.jsx
```

### 2.2 Flux de donnees principal

```
[Fichier Excel Ventes] ──→ excelParser.js ──→ produits[]
                                              ├── referentielITM8.js (enrichissement ITM8)
                                              ├── productClassifier.js (rayon, temps, unites)
                                              ├── potentielCalculator.js (potentiel hebdo)
                                              └── caCalculator.js (CA previsionnel)
                                                    │
[Fichier Excel Frequentation] ──→ excelParser.js ──→ frequentation{}
                                                      │
                              Configuration semaine ──→ planningCalculator.js
                                                      │
                                                      ↓
                                              planning{} (jours, creneaux, quantites)
                                                      │
                                                      ├── → EtapePlanning.jsx (affichage)
                                                      ├── → ImpressionPanel.jsx (impression)
                                                      ├── → PlanningVueTablet.jsx (tablette)
                                                      └── → export .bvp.json → PlanningJour.jsx (equipe)
```

### 2.3 Architecture V4 (encore deployable mais obsolete)

```
main-v4.jsx
└── AppV4.jsx
    ├── ProfilProvider (contexte)
    ├── → AccueilGlobalV4.jsx
    ├── → BenchmarkModule.jsx
    │   ├── → AccueilBenchmark.jsx
    │   │   └── utilise: File System Access API, dataExtractionService.js
    │   └── → DashboardBenchmark.jsx
    │       └── utilise: calculService.js
    │       └── → ClassementSecteur.jsx
    ├── → WizardResponsable.jsx (mode Responsable)
    │   ├── → ImportDonnees.jsx
    │   ├── → StepSemaine.jsx
    │   ├── → PilotageCA.jsx
    │   ├── → StepAnimationCommerciale.jsx
    │   └── → WizardTermine.jsx
    │       └── → FichierMagasin.jsx
    └── → ImportFichierEquipe + PlanningJour (mode Equipe)
```

### 2.4 Communication inter-composants problematique

```
ImportDonnees.jsx ──→ window.__importDonneesReady ──→ WizardResponsable.jsx
                      (variable globale = code smell)
```

---

## 3. ANALYSE DE COMPLEXITE

### 3.1 Fichiers de plus de 200 lignes - Detail

#### `PlanningJour.jsx` - 2637 lignes (CRITIQUE)

| Fonctions | Ligne | Extractible ? |
|-----------|-------|---------------|
| `getJourActuel` | 76 | Oui → dateUtils.js |
| `getTrancheActuelle` | 83 | Oui → dateUtils.js |
| `convertirEnPlaques` | 96 | Deja dans conversionUtils.js (DOUBLON) |
| `calculerEcart` | 106 | Oui → utils |
| `CelluleSimple` | 134 | Oui → composant separe |
| `CelluleEcart` | 156 | Oui → composant separe |
| `CelluleQuantite` | 168 | Oui → composant separe |
| `ModalEditionProduit` | 207 | Oui → composant separe (142 lig.) |
| `ModalGestionProgrammes` | 349 | Oui → composant separe (206 lig.) |
| `calculerQuantites` | 1229 | Oui → service planningCalculator |
| `genererFicheJourHTML` | 1445 | Oui → service d'impression (158 lig.) |
| `getFicheCSS` | 1603 | Oui → fichier CSS separe |
| `handlePrintPlanningPro` | 1646 | Oui → service d'impression |
| `handlePrintSemaine` | 1666 | Oui → service d'impression |
| `SortableHeader` | 1689 | Oui → composant reutilisable |
| Drag-and-drop handlers (6) | 834-919 | Oui → hook useDragReorder |
| **Total fonctions :** ~35 | | **~15 extractibles** |

#### `Etape4PilotageCA.jsx` - 1641 lignes

| Fonctions | Extractible ? |
|-----------|---------------|
| `appliquerLimitesProgression` | Oui → service calculService |
| `DashboardCA` (composant) | Oui → composant separe |
| `BarreSelection` (composant) | Oui → composant separe |
| `Onglets` (composant) | Oui → composant separe |
| `PopupCasse` (composant) | Oui → composant separe |
| `PopupVentes` (composant) | Oui → composant separe |
| `TableauProduits` (composant) | Oui → composant separe |
| `OngletGamme` (composant) | Oui → composant separe |
| `OngletLimites` (composant) | Oui → composant separe |
| `OngletSuivi` (composant) | Oui → composant separe |
| **Total fonctions :** ~25 | **~10 sous-composants a extraire** |

#### `StepAnimationCommerciale.jsx` - 1341 lignes

| Fonctions | Extractible ? |
|-----------|---------------|
| `getProchainMercredi/getMardiSuivant` | Oui → dateUtils.js |
| `calculerPromo` (useCallback, ~120 lig.) | Oui → service promoCalculator |
| `impactGlobal` (useMemo, ~55 lig.) | Oui → service promoCalculator |
| Formulaire produit exceptionnel (~140 lig.) | Oui → composant separe |
| **Total fonctions :** ~20 | **~5 extractibles** |

#### `StepCommande.jsx` - 1317 lignes

| Fonctions | Extractible ? |
|-----------|---------------|
| `calculerRepartition` (~80 lig.) | Oui → service commandeService |
| `produitsAvecBesoins` (useMemo, ~130 lig.) | Oui → service |
| `TriableHeader` (composant) | Oui → composant partage (existe deja dans PilotageCA) |
| `trierProduits` (useCallback) | Oui → utils |
| **Total fonctions :** ~25 | **~6 extractibles** |

### 3.2 Doublons de code identifies

| Code duplique | Fichiers | Impact |
|---------------|----------|--------|
| `FicheCommandeImpression` | manager/ et responsable/ | 403 lignes x2 = 806 lignes gaspillees |
| `getJourSemaine()` | 7 scripts racine | ~15 lignes x7 |
| `getWeekNumber()` / `getNumeroSemaine()` | AppV2, AppV4, StepSemaine, ImportDonnees, weekCalculator | 5 implementations differentes |
| `convertirEnPlaques()` | conversionUtils.js ET PlanningJour.jsx | Duplication fonction utilitaire |
| `TriableHeader` composant | PilotageCA.jsx, StepCommande.jsx, OngletCommande.jsx | 3 implementations similaires |
| `formatEuro()` / `formatMontant()` | Etape4PilotageCA, PilotageCA, WizardTermine, calculService | 4 implementations |
| `SortableHeader` composant | PilotageCA, ConfigurationProduits | 2 implementations |

---

## 4. CODE MORT ET NETTOYAGE

### 4.1 Imports non utilises

| Fichier | Import inutilise |
|---------|-----------------|
| `EtapeConfigurationSemaine.jsx` | `determinerJoursReport` (de weekCalculator) |
| `EtapePersonnalisation.jsx` | `List`, `Layers` (de lucide-react) |
| `EtapePlanning.jsx` | `mousquetairesColors` (de mousquetaires-theme) |
| `ModeProductionEnCours.jsx` | `useState` (de react) - etat gere par hook |
| `PlanningVueTablet.jsx` | `convertirEnPlaques` (de conversionUtils) |
| `TableauProduitsGroupes.jsx` | `Info` (de lucide-react) |
| `Etape1Diagnostic.jsx` | `Rocket`, `UserX` (de lucide-react) |
| `Etape2ObjectifCA.jsx` | `Euro`, `Zap`, `Award` (de lucide-react) |
| `WizardManager.jsx` | `ChevronLeft` (de lucide-react) |
| `StepCommande.jsx` | `Printer` (de lucide-react) |
| `Etape4PilotageCA.jsx` | `ChevronLeft`, `ChevronRight`, `Sliders` (de lucide-react) |
| `Etape5Communication.jsx` | `Users` (de lucide-react) |

### 4.2 Variables/fonctions declarees mais jamais appelees

| Fichier | Variable/Fonction | Ligne |
|---------|-------------------|-------|
| `App.jsx` | `referentielCharge` (state) | 28 |
| `App.jsx` | `donneesBenchmark` (state) | 19 |
| `App.jsx` | `recommencer` (fonction) | 433 |
| `App_V3_backup.jsx` | `referentielCharge` (state) | 25 |
| `App_V3_backup.jsx` | `recommencer` (fonction) | 427 |
| `EtapePersonnalisation.jsx` | `nbProduitsAvecPotentiel` | 206 |
| `EtapePersonnalisation.jsx` | `nbProduitsTotal` | 207 |
| `ModeProductionEnCours.jsx` | `estDerniereCuisson` | 197 |
| `TableauProduits.jsx` | `aPotentielModifie` | 141 |
| `ModeCasseGlobal.jsx` | `jour` (prop) | 16 |
| `PlanningVueTablet.jsx` | `handleModificationManuelle` (prop) | 22 |
| `ImpressionPanel.jsx` | `nextWeek` (prop dans PlanningJour) | 217 |
| `TableauProduits.jsx` | `onChangerFamille` (prop) | 105 |
| `TableauProduits.jsx` | `onChangerPotentiel` (prop) | 107 |
| `TableauProduitsGroupes.jsx` | `onChangerFamille` (prop) | 52 |
| `TableauProduitsGroupes.jsx` | `onSupprimerProduit` (prop) | 60 |

### 4.3 console.log de debug a supprimer

| Fichier | Nombre | Lignes notables |
|---------|--------|----------------|
| `App.jsx` | **24** | Diagnostic calcul planning, chargement referentiel |
| `App_V3_backup.jsx` | **23** | Idem (copie) |
| `dataExtractionService.js` | **~40** | Debug extraction massive |
| `parsers.js` | **~30** | Debug parsing fichiers |
| `referentielITM8.js` | **~15** | Debug chargement referentiel |
| `gammeExtractionService.js` | **~15** | Debug extraction gamme |
| `conditionnementService.js` | **~10** | Debug conditionnements |
| `ModeProductionEnCours.jsx` | **4** | Block debug localStorage (lignes 76-81) |
| `PlanningVueTablet.jsx` | **2** | Debug callbacks |
| `PlanningJour.jsx` | **1** | Debug rendu creneaux (ligne 2370) |
| `WizardResponsable.jsx` | **2** | Chargement referentiel |
| `BenchmarkModule.jsx` | **1** | Debug |
| `AccueilBenchmark.jsx` | **Multiples** | Debug operations dossier |
| **TOTAL ESTIME** | **~170+** | |

### 4.4 Blocs de code commentes

Aucun bloc de code commente significatif n'a ete detecte dans les fichiers source. Le code est globalement propre de ce cote.

### 4.5 TODO et FIXME non resolus

| Fichier | Ligne | Contenu |
|---------|-------|---------|
| `App.jsx` | 457 | `// TODO: Utiliser les donnees de frequentation du benchmark pour pre-remplir le planning` |
| `PlanningVueTablet.jsx` | 344 | `// TODO: ouvrir modal d'ajustement` |

### 4.6 Utilisation de `alert()` dans le code

| Fichier | Lignes | Contexte |
|---------|--------|---------|
| `parsers.js` | 157, 183, 348, 631 | Affiche des erreurs via `alert()` - atypique pour un module utilitaire |

### 4.7 Utilisation de variables globales `window.__`

| Fichier | Variable | Probleme |
|---------|----------|----------|
| `ImportDonnees.jsx` | `window.__importDonneesReady` | Communication entre composants via global |
| `WizardResponsable.jsx` | `window.__importDonneesReady` | Lecture du global |

---

## 5. ROBUSTESSE

### 5.1 try/catch autour des lectures de fichiers

| Fichier | Presence try/catch | Commentaire |
|---------|-------------------|-------------|
| `excelParser.js` | Oui | Parsing Excel bien protege |
| `ImportDonnees.jsx` | Oui | Upload frequentation et ventes proteges |
| `ImportFichierEquipe.jsx` | Oui | Parsing JSON protege |
| `EtapeConfigurationSemaine.jsx` | Oui | Import/export configuration proteges |
| `EtapePersonnalisation.jsx` | Oui | Import reglages CSV protege |
| `FichierMagasin.jsx` | Oui | Export/import fichier .bvp.json proteges |
| `Etape0Import.jsx` | Oui | Import Excel protege |
| `Etape5Communication.jsx` | Oui | Export File System API + fallback |
| `WizardTermine.jsx` | Oui | Download File System API + fallback |
| `parsers.js` | Partiellement | Utilise `alert()` au lieu de throw/catch propre |
| `useProductionStorage.js` | Oui | localStorage read/write proteges |
| `MagasinContext.jsx` | Oui | IndexedDB operations protegees |

**Verdict :** La plupart des operations de fichiers sont protegees. Point faible : `parsers.js` utilise `alert()`.

### 5.2 Fichier uploade vide ou mal formate

| Scenario | Comportement |
|----------|-------------|
| Fichier Excel vide | `excelParser.js` renvoie un tableau vide, le catch intercepte les erreurs XLSX |
| Fichier CSV mal formate | `parsers.js` tente le parsing et affiche `alert()` en cas d'echec |
| Fichier JSON invalide | `ImportFichierEquipe.jsx` catch l'erreur JSON.parse |
| Fichier .bvp.json invalide | `fichierMagasin.js` valide la structure avec `validerFichierMagasin()` |
| Fichier sans en-tetes attendus | `excelParser.js` cherche les colonnes par nom, retourne des resultats partiels |

**Verdict :** Correctement gere dans la plupart des cas. Le feedback utilisateur pourrait etre ameliore (messages d'erreur plus explicites).

### 5.3 Divisions par zero

| Fichier | Expression | Protection |
|---------|-----------|-----------|
| `EtapePlanning.jsx:204` | `unitesProduction / unitesParPlaque` | `if (unitesParPlaque > 0)` |
| `EtapePlanning.jsx:557` | `(qteJour - ventesHistoJour) / ventesHistoJour * 100` | Ternaire `ventesHistoJour > 0` |
| `ImpressionPanel.jsx:26` | `unitesProduction / unitesParPlaque` | `if (unitesParPlaque > 0)` |
| `PilotageCA.jsx:297` | `totalPoids > 0 ? ...` | Guarde ternaire |
| `PilotageCA.jsx:341` | `totalPoidsOuverts > 0 ? ...` | Guarde ternaire |
| `caCalculator.js` | Multiples divisions | Toutes gardees par `> 0` |
| `potentielCalculator.js` | Multiples divisions | Toutes gardees par `> 0` |
| `PlanningJour.jsx:98` | `valeur / unitesParPlaque` | `unitesParPlaque > 0` |
| `PlanningJour.jsx:108` | `(preco - histo) / histo` | `!histo \|\| histo === 0` |
| `PlanningJour.jsx:1345` | `1 / tranchesOuvertes.length` | **EDGE CASE** : pourrait etre 0 si aucun creneau ouvert |
| `Etape2ObjectifCA.jsx:615` | `potentiel.gainCaMax / caActuel` | **NON PROTEGE** : risque Infinity si caActuel=0 |
| `StepCommande.jsx:352` | `produitsTries.length / nbLivraisons` | Guarde par `nbLivraisons > 0` |
| `EtapePersonnalisation.jsx:54` | `.reduce() / produitsAvecStats.length` | Guarde par logique conditionnelle |

**Verdict :** Globalement bien protege. **2 cas a corriger** : `Etape2ObjectifCA.jsx:615` et `PlanningJour.jsx:1345`.

### 5.4 Cas limites

| Cas limite | Couvert ? | Detail |
|------------|-----------|--------|
| 0 produits | Partiellement | Les tableaux affichent "aucun produit" mais certains calculs pourraient echouer silencieusement |
| 0 tickets | Oui | Les poids de frequentation retombent sur des valeurs par defaut (1/7) |
| Semaine sans jours ouverts | Partiellement | `PlanningJour.jsx:1345` risque une division par 0 |
| Produit sans ITM8 | Oui | Classification par mots-cles en fallback |
| Pas de fichier frequentation | Oui | Le champ est marque optionnel, des poids uniformes sont utilises |
| Potentiel a 0 | Oui | Le systeme accepte des potentiels a 0 mais ne genere pas de planning |

---

## 6. RECOMMANDATIONS

### Niveau 1 - Nettoyage immediat (sans risque)

**Effort : 1-2 heures**

1. **Supprimer ~170 console.log/warn/error** dans les fichiers de production
   - Priorite : `App.jsx`, `App_V3_backup.jsx`, `dataExtractionService.js`, `parsers.js`
   - Alternative : wrapper `debugLog()` conditionnel

2. **Supprimer les imports inutilises** (12 fichiers identifies ci-dessus)
   - `List`, `Layers`, `Info`, `Rocket`, `UserX`, `Euro`, `Zap`, `Award`, `Printer`, `Sliders`, `Users`, `ChevronLeft`
   - Import `determinerJoursReport`, `convertirEnPlaques`, `mousquetairesColors`, `useState`

3. **Supprimer les variables mortes** (16 identifiees ci-dessus)
   - `referentielCharge`, `donneesBenchmark`, `recommencer`, `nbProduitsAvecPotentiel`, etc.

4. **Archiver les fichiers obsoletes** dans un dossier `_archive/` :
   - `src/App.jsx`, `src/AppV2.jsx`, `src/AppV4.jsx`, `src/App_V3_backup.jsx`
   - `src/App.css`
   - `src/components/AccueilGlobalV4.jsx`
   - Les 12 scripts racine de test/simulation

5. **Supprimer les `alert()` dans `parsers.js`** et les remplacer par des `throw new Error()`

6. **Resoudre les 2 TODO** identifies ou les documenter dans un backlog

### Niveau 2 - Restructuration (moyen effort)

**Effort : 1-2 jours**

1. **Fusionner `FicheCommandeImpression.jsx`** (manager/ et responsable/) en un composant partage dans `src/components/shared/`
   - Gain : 403 lignes de code en moins

2. **Decouper `PlanningJour.jsx`** (2637 lignes) en :
   - `PlanningJour.jsx` (composant principal, ~800 lig.)
   - `ModalEditionProduit.jsx` (~200 lig.)
   - `ModalGestionProgrammes.jsx` (~200 lig.)
   - `CellulesPlanning.jsx` (~100 lig.)
   - `services/impressionService.js` (~300 lig.)
   - `useDragReorder.js` (hook, ~100 lig.)

3. **Decouper `Etape4PilotageCA.jsx`** (1641 lignes) en sous-composants :
   - `OngletGamme.jsx`, `OngletLimites.jsx`, `OngletSuivi.jsx`
   - `DashboardCA.jsx`, `PopupCasse.jsx`, `PopupVentes.jsx`

4. **Eliminer la variable globale `window.__importDonneesReady`** :
   - Remplacer par un callback prop ou un contexte React

5. **Consolider les parsers** : choisir entre `parsers.js` (V1) et `excelParser.js` (V2), supprimer l'autre

6. **Consolider les services de fichiers** : choisir entre `fichierPartageService.js` (V1) et `fichierEchangeService.js` (V2)

7. **Creer un composant `SortableHeader` partage** au lieu des 3 implementations identiques

8. **Extraire `convertirEnPlaques`** de `PlanningJour.jsx` et utiliser `conversionUtils.js` partout

9. **Creer un `formatUtils.js`** centralisant `formatEuro`, `formatMontant`, `formatDate`, `formatPourcent`

### Niveau 3 - Optimisation (effort important)

**Effort : 1 semaine**

1. **Optimisation performance React :**
   - Ajouter `useMemo` aux gros calculs dans `PlanningJour.jsx` (2637 lig.)
   - Ajouter `useCallback` aux handlers passes en props
   - Ajouter `React.memo` aux sous-composants purs (CelluleSimple, CelluleEcart, TouchButton)
   - Virtualiser les longues listes de produits avec `react-window`

2. **Architecture des services :**
   - Regrouper `caCalculator.js`, `potentielCalculator.js`, `planningCalculator.js` sous un module `planning/`
   - Creer une couche d'abstraction pour le stockage (localStorage/IndexedDB) au lieu d'appels directs

3. **Systeme de logging professionnel :**
   - Remplacer les console.log par un logger conditionnel (`import.meta.env.DEV`)
   - Ajouter un error boundary React global

4. **Tests automatises :**
   - Les 12 scripts de test racine sont des scripts Node.js manuels
   - Les migrer vers un framework de test (Vitest) avec assertions

5. **Simplification de l'architecture multi-version :**
   - Ne garder que V5 (la version courante)
   - Supprimer les entry points `main-v4.jsx`, les configs `vite.config.v4.js`, `vite.config.manager.js`
   - Garder uniquement `main.jsx` + `vite.config.js` + `vite.config.equipe.js`

6. **Amelioration UX :**
   - Le composant `ModeSwitch.jsx` a un state local qui ne propage rien - soit le connecter au contexte, soit le supprimer
   - Remplacer les `alert()` restants par des notifications toast integrees

7. **Gestion d'erreurs amelioree :**
   - Proteger `Etape2ObjectifCA.jsx:615` contre la division par zero
   - Proteger `PlanningJour.jsx:1345` contre le cas 0 creneaux ouverts
   - Ajouter des valeurs par defaut explicites pour les cas limites (0 produits, 0 jours)

---

## ANNEXE - Statistiques globales

| Metrique | Valeur |
|----------|--------|
| Total lignes src/ | 35 630 |
| Total fichiers src/ | 91 |
| Fichiers > 1000 lignes | 9 |
| Fichiers > 500 lignes | 20 |
| Fichiers > 300 lignes | 30 |
| console.log estimees | ~170+ |
| Imports inutilises | 12 fichiers |
| Variables mortes | 16 |
| TODO/FIXME | 2 |
| Doublons identifies | 7 paires |
| Fichiers obsoletes | 8+ |
| Divisions non protegees | 2 |
| Dependencies npm (prod) | 4 (react, react-dom, lucide-react, xlsx) |
| Dependencies npm (dev) | 10 |
| Branches git | main, backup-avant-maj-20251023 |
| Deploiement | Vercel (branches: main, mise-a-jour-majeure) |

---

*Rapport genere le 06/02/2026 par Claude Code - Audit en lecture seule, aucun fichier modifie.*
