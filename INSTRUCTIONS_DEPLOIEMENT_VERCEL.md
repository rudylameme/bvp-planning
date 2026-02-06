# Instructions de Déploiement Vercel - BVP Planning V5

## Objectif
Déployer l'application BVP Planning V5 sur Vercel avec **2 URLs séparées** :
- **manager-bvp.vercel.app** → Pour les responsables rayon
- **equipe-bvp.vercel.app** → Pour les équipiers en production

---

## Comment ça marche

L'application utilise une variable d'environnement `VITE_APP_MODE` pour déterminer quel mode afficher :
- `VITE_APP_MODE=manager` → Affiche uniquement WizardManager
- `VITE_APP_MODE=equipe` → Affiche uniquement AccueilEquipe
- Non définie → Affiche l'accueil complet avec choix

---

## Étapes de Déploiement

### 1. Sur Vercel.com - Créer le Projet Manager

1. Va sur [vercel.com](https://vercel.com) et connecte-toi
2. Clique sur **"Add New" → "Project"**
3. Importe le repo GitHub `BVP-Planning` (ou le nom de ton repo)
4. **IMPORTANT** - Configure les paramètres :
   - **Project Name** : `manager-bvp`
   - **Root Directory** : `bvp-planning` (si le projet est dans un sous-dossier)
   - **Build Command** : `npm run build`
   - **Output Directory** : `dist`
5. Clique sur **"Environment Variables"** et ajoute :
   ```
   VITE_APP_MODE = manager
   ```
6. Clique sur **"Deploy"**

### 2. Sur Vercel.com - Créer le Projet Équipe

1. Retourne sur le dashboard Vercel
2. Clique sur **"Add New" → "Project"**
3. Importe le **même repo** GitHub
4. Configure les paramètres :
   - **Project Name** : `equipe-bvp`
   - **Root Directory** : `bvp-planning`
   - **Build Command** : `npm run build`
   - **Output Directory** : `dist`
5. Clique sur **"Environment Variables"** et ajoute :
   ```
   VITE_APP_MODE = equipe
   ```
6. Clique sur **"Deploy"**

---

## URLs Finales

Après déploiement :
- **Manager** : https://manager-bvp.vercel.app
- **Équipe** : https://equipe-bvp.vercel.app

---

## Domaines Personnalisés (Optionnel)

Tu peux aussi configurer des domaines personnalisés dans Vercel :
- `manager.ton-domaine.com`
- `equipe.ton-domaine.com`

---

## Notes Importantes

1. **Même code source** : Les 2 projets Vercel utilisent le même repo GitHub
2. **Déploiement automatique** : Chaque push sur GitHub redéploie les 2 projets
3. **Variables séparées** : Chaque projet a sa propre variable `VITE_APP_MODE`
4. **localStorage partagé** : Les données seront partagées si même domaine parent

---

## Test Local

Pour tester localement chaque mode :

```bash
# Mode Manager
VITE_APP_MODE=manager npm run dev

# Mode Équipe
VITE_APP_MODE=equipe npm run dev

# Mode complet (par défaut)
npm run dev
```

---

## Résumé pour Claude Code

```
1. Va sur vercel.com
2. Crée 2 projets depuis le même repo :
   - manager-bvp avec VITE_APP_MODE=manager
   - equipe-bvp avec VITE_APP_MODE=equipe
3. C'est tout ! Vercel détecte Vite automatiquement
```
