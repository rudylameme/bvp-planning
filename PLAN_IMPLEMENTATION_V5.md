# PLAN D'IMPLÉMENTATION V5 - BVP Planning

## 📋 Vue d'ensemble

| Phase | Contenu | Estimation |
|-------|---------|------------|
| 0 | Setup & Fondations | 1h |
| 1 | Accueil Global + Navigation | 1h |
| 2 | Wizard Manager - Import (Étape 0) | 2h |
| 3 | Wizard Manager - Diagnostic (Étapes 1-2) | 3h |
| 4 | Wizard Manager - Configuration (Étape 3) | 2h |
| 5 | Wizard Manager - Pilotage CA (Étape 4) | 4h |
| 6 | Wizard Manager - Communication (Étape 5) | 2h |
| 7 | Univers Équipe - Planning | 3h |
| 8 | Univers Équipe - Inventaire & Commande | 3h |
| 9 | Finitions & Tests | 2h |

**Total estimé** : ~23h de développement

---

## 🚀 PHASE 0 : Setup & Fondations

### Objectif
Préparer le projet React avec la bonne structure et les configurations.

### Tâches

- [ ] Créer le projet Vite + React (si pas déjà fait)
  ```bash
  npm create vite@latest bvp-planning-v5 -- --template react
  cd bvp-planning-v5
  npm install
  ```

- [ ] Installer les dépendances
  ```bash
  npm install react-router-dom xlsx date-fns
  npm install -D tailwindcss postcss autoprefixer
  npx tailwindcss init -p
  ```

- [ ] Configurer Tailwind avec les couleurs Mousquetaires
  ```javascript
  // tailwind.config.js
  module.exports = {
    content: ["./index.html", "./src/**/*.{js,jsx}"],
    theme: {
      extend: {
        colors: {
          'mousquetaires': {
            'rouge': '#ED1C24',
            'bordeaux': '#8B1538',
            'beige': '#F5F2ED',
            'beige-dark': '#E8E1D5',
            'gris': '#58595B',
            'gris-border': '#D1D3D4',
          }
        }
      }
    },
    plugins: [],
  }
  ```

- [ ] Créer la structure des dossiers
  ```
  src/
  ├── components/
  │   ├── manager/
  │   │   └── components/
  │   ├── equipe/
  │   │   └── components/
  │   └── shared/
  ├── services/
  ├── hooks/
  ├── context/
  └── utils/
  ```

- [ ] Configurer les styles de base dans `index.css`
  ```css
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
  
  body {
    @apply bg-mousquetaires-beige text-mousquetaires-gris;
    font-family: 'Arial', sans-serif;
  }
  ```

- [ ] Créer le fichier `App.jsx` avec le router de base

### Fichiers à créer
```
src/App.jsx
src/index.css
tailwind.config.js
```

### Validation
- [ ] `npm run dev` fonctionne
- [ ] Le fond beige s'affiche correctement

---

## 🏠 PHASE 1 : Accueil Global + Navigation

### Objectif
Créer l'écran d'accueil avec le choix entre les 2 univers.

### Maquette

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🏠  BVP Planning                                              V5.0    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                    Bienvenue sur BVP Planning                           │
│                                                                         │
│           ┌─────────────────────┐    ┌─────────────────────┐           │
│           │                     │    │                     │           │
│           │    🏢 MANAGER       │    │    👷 ÉQUIPE        │           │
│           │                     │    │                     │           │
│           │  Piloter le CA      │    │  Planning du jour   │           │
│           │  Configurer         │    │  Inventaire         │           │
│           │  Communiquer        │    │  Commande           │           │
│           │                     │    │                     │           │
│           │    [Accéder →]      │    │    [Accéder →]      │           │
│           │                     │    │                     │           │
│           └─────────────────────┘    └─────────────────────┘           │
│                                                                         │
│           💡 Conseil : Commencez par l'univers Manager pour            │
│              configurer la semaine, puis l'équipe consulte.            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Tâches

- [ ] Créer `src/components/shared/Header.jsx`
  - Logo Mousquetaires (ou placeholder)
  - Titre "BVP Planning"
  - Version

- [ ] Créer `src/components/AccueilGlobal.jsx`
  - 2 cartes cliquables (Manager / Équipe)
  - Navigation vers `/manager` ou `/equipe`
  - Style Mousquetaires (dégradé bordeaux/rouge sur hover)

- [ ] Configurer les routes dans `App.jsx`
  ```javascript
  <Routes>
    <Route path="/" element={<AccueilGlobal />} />
    <Route path="/manager/*" element={<WizardManager />} />
    <Route path="/equipe/*" element={<AccueilEquipe />} />
  </Routes>
  ```

- [ ] Créer les placeholders pour les 2 univers
  - `src/components/manager/WizardManager.jsx` (placeholder)
  - `src/components/equipe/AccueilEquipe.jsx` (placeholder)

### Fichiers à créer
```
src/components/AccueilGlobal.jsx
src/components/shared/Header.jsx
src/components/manager/WizardManager.jsx (placeholder)
src/components/equipe/AccueilEquipe.jsx (placeholder)
```

### Validation
- [ ] Navigation / → /manager fonctionne
- [ ] Navigation / → /equipe fonctionne
- [ ] Charte graphique Mousquetaires respectée

---

## 📁 PHASE 2 : Wizard Manager - Import (Étape 0)

### Objectif
Permettre au manager de charger ses fichiers Excel et sélectionner magasin/semaine.

### Tâches

- [ ] Créer le container `WizardManager.jsx`
  - Gestion des 6 étapes (state)
  - Navigation entre étapes
  - Barre de progression

- [ ] Créer `src/context/MagasinContext.jsx`
  - État global : magasin, semaine, données chargées
  - Provider qui wrap le wizard

- [ ] Créer `src/services/dataExtractionService.js`
  - Fonction `listerSemainesDisponibles(files)`
  - Fonction `extraireDonneesMagasin(files, magasinCode, semaine)`
  - Fonction `extraireDonneesCasse(files, semaine)`
  - Parser les fichiers Excel avec `xlsx`

- [ ] Créer `src/components/manager/Etape0Import.jsx`
  - Sélection dossier DATA (File System Access API ou input file)
  - Dropdown semaines détectées
  - Recherche magasin (code ou ville)
  - Liste des fichiers détectés avec status ✅/❌
  - Bouton "Continuer"

### Fichiers à créer
```
src/components/manager/WizardManager.jsx
src/components/manager/Etape0Import.jsx
src/context/MagasinContext.jsx
src/services/dataExtractionService.js
```

### Validation
- [ ] Upload de fichiers Excel fonctionne
- [ ] Détection automatique des semaines
- [ ] Recherche magasin fonctionnelle
- [ ] Passage à l'étape suivante avec données chargées

---

## 📊 PHASE 3 : Wizard Manager - Diagnostic (Étapes 1-2)

### Objectif
Afficher le benchmark vs secteur et définir l'objectif CA.

### Tâches

- [ ] Créer `src/services/calculService.js`
  - Fonction `calculerBenchmarkSecteur(magasin, donneesSecteur)`
  - Fonction `calculerFluxParCreneau(donneesVentes)`
  - Fonction `calculerPotentielPerdu(flux, penetration)`
  - Fonction `calculerProjectionAnnuelle(potentielHebdo)`

- [ ] Créer `src/components/manager/Etape1Diagnostic.jsx`
  - 4 cartes KPI (CA, Tickets, Ticket moyen, Pénétration)
  - Écart vs moyenne secteur (vert/rouge)
  - Graphique flux client vs pénétration par créneau
  - Message diagnostic auto

- [ ] Créer `src/components/manager/components/CarteIndicateur.jsx`
  - Valeur principale
  - Comparaison vs secteur
  - Couleur selon écart

- [ ] Créer `src/components/manager/components/GraphiqueFlux.jsx`
  - Barres horizontales par créneau
  - Couleur selon performance (vert/orange/rouge)

- [ ] Créer `src/components/manager/Etape2ObjectifCA.jsx`
  - Axes de progression identifiés
  - Potentiel chiffré (hebdo + annuel)
  - Formulaire objectif (accepter/modifier/ignorer)

### Fichiers à créer
```
src/components/manager/Etape1Diagnostic.jsx
src/components/manager/Etape2ObjectifCA.jsx
src/components/manager/components/CarteIndicateur.jsx
src/components/manager/components/GraphiqueFlux.jsx
src/services/calculService.js
```

### Validation
- [ ] Les 4 KPI s'affichent correctement
- [ ] Le graphique flux est lisible
- [ ] L'objectif peut être défini
- [ ] Les calculs sont corrects

---

## ⚙️ PHASE 4 : Wizard Manager - Configuration (Étape 3)

### Objectif
Configurer les jours, opérations et regroupement des colonnes.

### Tâches

- [ ] Créer `src/context/ConfigContext.jsx`
  - État : joursOuverts, operations, livraisonMP, regroupementColonnes
  - Actions : toggleJour, addOperation, setRegroupement

- [ ] Créer `src/components/manager/Etape3Configuration.jsx`
  - Checkboxes jours d'ouverture (L, M, Me, J, V, S, D)
  - Liste opérations commerciales (ajouter/supprimer)
  - Dropdown jour de livraison
  - Section regroupement colonnes

- [ ] Créer `src/components/manager/components/ConfigRegroupement.jsx`
  - 6 colonnes de base affichées
  - Checkboxes pour regrouper (avant9h+9h12h, etc.)
  - Aperçu dynamique du résultat
  - Explication de la logique

- [ ] Créer `src/utils/repartitionFlux.js`
  - Fonction `calculerRepartition(totalJour, fluxParTranche)`
  - Fonction `regrouperColonnes(repartition6, configRegroupement)`

### Fichiers à créer
```
src/components/manager/Etape3Configuration.jsx
src/components/manager/components/ConfigRegroupement.jsx
src/context/ConfigContext.jsx
src/utils/repartitionFlux.js
```

### Validation
- [ ] Les jours se cochent/décochent
- [ ] Les opérations s'ajoutent/suppriment
- [ ] Le regroupement affiche un aperçu correct
- [ ] Le calcul reste sur 6 tranches, seul l'affichage change

---

## 💰 PHASE 5 : Wizard Manager - Pilotage CA (Étape 4)

### Objectif
Piloter le CA en temps réel avec ventes, casse et gamme active.

**C'est l'étape la plus complexe et la plus importante.**

### Tâches

- [ ] Créer `src/hooks/usePilotageCA.js`
  - État : gammeActive, quantitesParProduit, caTotal
  - Recalcul automatique à chaque modification
  - Mémoisation des calculs lourds

- [ ] Créer `src/utils/calculsCasse.js`
  - Fonction `calculerTauxCasse(paCasseHT, pvVentesTTC)`
  - Fonction `getStatutCasse(taux)` → normal/attention/alerte
  - Fonction `getAlertesProducts(produits, seuil)`

- [ ] Créer `src/components/manager/Etape4PilotageCA.jsx`
  - Bandeau CA prévisionnel (mise à jour temps réel)
  - 3 onglets : Ventes | Casse | Gamme
  - Navigation entre les vues

- [ ] Créer `src/components/manager/components/VueVentes.jsx`
  - Tableau CA par famille
  - Top 5 / Flop 5 produits
  - Évolution vs S-1

- [ ] Créer `src/components/manager/components/VueCasse.jsx`
  - Taux de casse global
  - Coût total casse
  - Liste alertes produits (> 15%)
  - Boutons action (retirer gamme, réduire qté)

- [ ] Créer `src/components/manager/components/GammeActive.jsx`
  - Liste produits avec checkbox actif/inactif
  - Colonnes : Produit, CA prévu, Casse %, Qté/jour
  - Modes : Manuel / 20-80 / Terrain
  - Modification quantités
  - Impact CA en temps réel

### Fichiers à créer
```
src/components/manager/Etape4PilotageCA.jsx
src/components/manager/components/VueVentes.jsx
src/components/manager/components/VueCasse.jsx
src/components/manager/components/GammeActive.jsx
src/hooks/usePilotageCA.js
src/utils/calculsCasse.js
```

### Validation
- [ ] Le CA se recalcule instantanément
- [ ] Les alertes casse s'affichent (> 15%)
- [ ] Activer/désactiver produit fonctionne
- [ ] Les modes 20/80 fonctionnent
- [ ] Formule casse : PA HT / PV TTC

---

## 📤 PHASE 6 : Wizard Manager - Communication (Étape 5)

### Objectif
Générer le fichier Manager pour l'équipe et permettre l'impression.

### Tâches

- [ ] Créer `src/services/fichierManagerService.js`
  - Fonction `genererFichierManager(config, gamme, objectif)`
  - Fonction `exporterJSON(fichier)`
  - Structure JSON conforme au CDC

- [ ] Créer `src/components/manager/Etape5Communication.jsx`
  - Récapitulatif de la configuration
  - Aperçu planning (tableau)
  - Boutons : Exporter JSON, Imprimer Planning, Imprimer Commande

- [ ] Créer les styles d'impression
  ```css
  @media print {
    /* Styles pour impression propre */
  }
  ```

### Fichiers à créer
```
src/components/manager/Etape5Communication.jsx
src/services/fichierManagerService.js
```

### Validation
- [ ] Le récapitulatif est complet
- [ ] L'export JSON génère un fichier valide
- [ ] L'impression est lisible

---

## 📅 PHASE 7 : Univers Équipe - Planning

### Objectif
Afficher le planning de cuisson avec les colonnes configurées par le manager.

### Tâches

- [ ] Créer `src/components/equipe/AccueilEquipe.jsx`
  - Chargement du fichier Manager (ou sélection)
  - Navigation vers les 3 modules
  - Affichage magasin/semaine

- [ ] Créer `src/services/fichierManagerService.js` (ajouter)
  - Fonction `chargerFichierManager(file)`
  - Validation du format

- [ ] Créer `src/components/equipe/PlanningJour.jsx`
  - Sélection du jour
  - Tableau produits par famille
  - Colonnes selon config manager (regroupées ou non)
  - Créneau actif surligné
  - Total par famille

- [ ] Créer `src/components/equipe/components/LigneProduit.jsx`
  - Nom produit + PLU
  - Par plaque
  - Quantités par colonne
  - Total

### Fichiers à créer
```
src/components/equipe/AccueilEquipe.jsx
src/components/equipe/PlanningJour.jsx
src/components/equipe/components/LigneProduit.jsx
```

### Validation
- [ ] Le fichier manager se charge
- [ ] Les colonnes respectent le regroupement
- [ ] Le créneau actif est visible
- [ ] Responsive tablette

---

## 📦 PHASE 8 : Univers Équipe - Inventaire & Commande

### Objectif
Permettre la saisie d'inventaire et le calcul automatique de commande.

### Tâches

- [ ] Créer `src/hooks/useInventaire.js`
  - État : stockParProduit
  - Sauvegarde automatique

- [ ] Créer `src/components/equipe/Inventaire.jsx`
  - Liste produits gamme active
  - Saisie quantité (boutons +/- tactiles)
  - Recherche rapide
  - Indicateur progression (X/Y saisis)

- [ ] Créer `src/components/equipe/components/SaisieQuantite.jsx`
  - Gros boutons +/-
  - Input numérique
  - Optimisé tactile

- [ ] Créer `src/hooks/useCommande.js`
  - Calcul automatique : besoin - stock = à commander
  - Arrondi au carton supérieur

- [ ] Créer `src/components/equipe/Commande.jsx`
  - Tableau : Produit, Besoin, Stock, Jours stock, À commander, Cartons
  - Indicateurs couleur (🔴🟡✅)
  - Total cartons
  - Bouton validation

- [ ] Créer `src/services/fichierEquipeService.js`
  - Fonction `genererFichierEquipe(inventaire, commande)`
  - Fonction `exporterJSON(fichier)`

### Fichiers à créer
```
src/components/equipe/Inventaire.jsx
src/components/equipe/Commande.jsx
src/components/equipe/components/SaisieQuantite.jsx
src/components/equipe/components/LigneCommande.jsx
src/hooks/useInventaire.js
src/hooks/useCommande.js
src/services/fichierEquipeService.js
```

### Validation
- [ ] Saisie inventaire tactile et fluide
- [ ] Calcul commande automatique correct
- [ ] Export fichier équipe fonctionne
- [ ] Responsive tablette

---

## ✨ PHASE 9 : Finitions & Tests

### Objectif
Peaufiner l'application et tester tous les parcours.

### Tâches

- [ ] Tests parcours complet Manager (6 étapes)
- [ ] Tests parcours complet Équipe (3 modules)
- [ ] Tests échange fichiers Manager ↔ Équipe
- [ ] Tests calculs (casse, répartition, CA)
- [ ] Tests responsive (Desktop + Tablette)
- [ ] Tests impression
- [ ] Corrections bugs identifiés
- [ ] Optimisation performances
- [ ] Nettoyage code (console.log, commentaires)

### Validation finale
- [ ] L'application fonctionne de bout en bout
- [ ] Les calculs sont corrects
- [ ] La charte graphique est respectée
- [ ] L'impression fonctionne

---

## 📝 Notes pour Claude Code

### Ordre d'exécution

```
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8 → Phase 9
```

**Ne pas sauter de phase.** Chaque phase dépend de la précédente.

### En cas de blocage

1. Relire le CDC (`CAHIER_DES_CHARGES_V5.md`)
2. Relire les instructions (`CLAUDE.md`)
3. Demander à l'utilisateur

### Commits suggérés

- `feat: setup projet V5 avec Tailwind Mousquetaires`
- `feat: accueil global avec navigation 2 univers`
- `feat: wizard manager étape 0 import`
- `feat: wizard manager étapes 1-2 diagnostic`
- `feat: wizard manager étape 3 configuration`
- `feat: wizard manager étape 4 pilotage CA`
- `feat: wizard manager étape 5 communication`
- `feat: univers équipe planning jour`
- `feat: univers équipe inventaire et commande`
- `fix: finitions et corrections`
