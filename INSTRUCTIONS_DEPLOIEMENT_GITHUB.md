# Instructions de Déploiement GitHub - BVP Planning V5

## Objectif
Déployer l'application BVP Planning V5 sur GitHub Pages avec **2 URLs séparées** :
1. **Manager Planning BVP** → Pour les responsables rayon (configuration hebdomadaire)
2. **Équipe Planning BVP** → Pour les équipiers en production (consultation quotidienne)

---

## Option Recommandée : 2 Repositories GitHub Séparés

### Structure proposée

```
github.com/[username]/manager-planning-bvp  → https://[username].github.io/manager-planning-bvp/
github.com/[username]/equipe-planning-bvp   → https://[username].github.io/equipe-planning-bvp/
```

---

## Étapes de Mise en Œuvre

### Étape 1 : Créer les Entry Points Séparés

#### 1.1. Créer `src/main-manager.jsx`
```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import WizardManager from './components/manager/WizardManager'

// Entry point Manager - démarre directement sur WizardManager
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WizardManager onRetourAccueil={() => window.location.reload()} />
  </StrictMode>,
)
```

#### 1.2. Créer `src/main-equipe.jsx`
```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AccueilEquipe from './components/equipe/AccueilEquipe'

// Entry point Équipe - démarre directement sur AccueilEquipe
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AccueilEquipe onRetourAccueil={() => window.location.reload()} />
  </StrictMode>,
)
```

### Étape 2 : Créer les Configurations Vite Séparées

#### 2.1. Créer `vite.config.manager.js`
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/manager-planning-bvp/',
  build: {
    outDir: 'dist-manager',
    rollupOptions: {
      input: {
        main: './index-manager.html'
      }
    }
  }
})
```

#### 2.2. Créer `vite.config.equipe.js`
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/equipe-planning-bvp/',
  build: {
    outDir: 'dist-equipe',
    rollupOptions: {
      input: {
        main: './index-equipe.html'
      }
    }
  }
})
```

### Étape 3 : Créer les Fichiers HTML Séparés

#### 3.1. Créer `index-manager.html`
```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Manager Planning BVP</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main-manager.jsx"></script>
  </body>
</html>
```

#### 3.2. Créer `index-equipe.html`
```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Équipe Planning BVP</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main-equipe.jsx"></script>
  </body>
</html>
```

### Étape 4 : Mettre à Jour package.json

Ajouter ces scripts dans `package.json` :
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:manager": "vite build --config vite.config.manager.js",
    "build:equipe": "vite build --config vite.config.equipe.js",
    "preview": "vite preview",
    "deploy:manager": "npm run build:manager && gh-pages -d dist-manager",
    "deploy:equipe": "npm run build:equipe && gh-pages -d dist-equipe"
  }
}
```

### Étape 5 : Installer gh-pages

```bash
npm install --save-dev gh-pages
```

### Étape 6 : Créer les Repositories GitHub

1. Créer le repo `manager-planning-bvp` sur GitHub
2. Créer le repo `equipe-planning-bvp` sur GitHub
3. Activer GitHub Pages pour chaque repo (Settings → Pages → Deploy from branch: gh-pages)

### Étape 7 : Déployer

```bash
# Build et déploiement Manager
npm run build:manager
# Puis pousser dist-manager vers le repo manager-planning-bvp

# Build et déploiement Équipe
npm run build:equipe
# Puis pousser dist-equipe vers le repo equipe-planning-bvp
```

---

## Configuration du Partage de Données (localStorage)

Les deux applications doivent partager les données de configuration. Actuellement, elles utilisent `localStorage` avec les clés :
- `bvp_magasin_config` - Configuration du magasin
- `bvp_produits_config` - Configuration des produits

### Important
Les deux URLs doivent être sur le **même domaine** pour partager le localStorage, OU utiliser une solution de stockage partagée (ex: fichier JSON exporté/importé).

### Solution Alternative : Stockage Partagé via Fichier

Le Manager exporte un fichier JSON de configuration que l'Équipe importe :
1. Manager → "Exporter Configuration" → `config-semaine-XX.json`
2. Équipe → "Importer Configuration" → charge le fichier

Cette solution est **déjà implémentée** dans l'application actuelle via :
- Export : bouton dans WizardManager
- Import : automatique dans AccueilEquipe via MagasinContext

---

## URLs Finales

Après déploiement, les URLs seront :
- **Manager** : `https://[username].github.io/manager-planning-bvp/`
- **Équipe** : `https://[username].github.io/equipe-planning-bvp/`

---

## Notes Importantes

1. **Données locales** : Les données restent sur l'ordinateur de l'utilisateur (localStorage)
2. **Pas de serveur** : GitHub Pages = hébergement statique gratuit
3. **HTTPS** : GitHub Pages fournit HTTPS automatiquement
4. **Mise à jour** : Pour mettre à jour, refaire `npm run deploy:manager` ou `deploy:equipe`

---

## Commandes Résumées pour Claude Code

```bash
# 1. Créer les fichiers (main-manager.jsx, main-equipe.jsx, configs vite, index html)
# 2. Installer gh-pages
npm install --save-dev gh-pages

# 3. Build Manager
npm run build:manager

# 4. Build Équipe
npm run build:equipe

# 5. Créer les repos GitHub et pousser les builds
```
