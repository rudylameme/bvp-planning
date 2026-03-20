# NOUVELLE FONCTIONNALITÉ : Onglet Plaquage + colonne feuille de production

## Contexte

Le plaquage = préparer les plaques de cuisson la veille au soir pour la 1ère cuisson du lendemain matin.
Le manager doit pouvoir définir un **pourcentage de plaquage par programme de cuisson** (ex: Viennoiserie 80%, Pain 50%, Pâtisserie 100%).

## 1. Nouvel onglet "Plaquage" dans l'Étape 4 Pilotage CA

### Position
Ajouter un onglet "Plaquage" dans les onglets de l'Étape 4, au même niveau que Gamme, Limites, Promo, Commande, Suivi, Analyse.

### Source des programmes
Les programmes de cuisson sont créés et nommés **côté Équipe** (PlanningJour → ModalGestionProgrammes). Ils sont stockés dans le fichier EQUIPE .bvp.json (champ `programmesPersonnalises`).

L'onglet Plaquage côté Manager doit donc :
1. **Lire le fichier EQUIPE le plus récent** dans le dossier BVP partagé (via `trouverDernierFichierEquipe` dans `dossierEquipeService.js`) pour récupérer la liste des programmes
2. **Fusionner** avec les programmes visibles dans les produits de la gamme (champ `programme` des produits actifs) — au cas où le fichier EQUIPE n'existe pas encore
3. **Afficher un bouton "Actualiser les programmes"** pour relire le fichier EQUIPE si l'équipe a créé de nouveaux programmes entre-temps

### Contenu de l'onglet
Un tableau simple avec :
- **Colonne 1** : Nom du programme de cuisson (ex: "Viennoiserie classique", "Pain tradition", etc.)
- **Colonne 2** : Nombre de produits actifs dans ce programme
- **Colonne 3** : **Pourcentage de plaquage** — un champ de saisie numérique (0 à 100%) avec un slider ou un input. Valeur par défaut : 100%.
- **Bouton "Actualiser"** en haut du tableau — relit le fichier EQUIPE pour mettre à jour la liste des programmes

Si un nouveau programme apparaît (ajouté par l'Équipe), il s'affiche automatiquement avec 100% par défaut.

### Exemples produits par programme

Pour chaque programme, le manager peut sélectionner **3 à 4 produits représentatifs** (via un bouton "+" ou un mini-sélecteur parmi les produits actifs de ce programme). Ces produits exemples sont marqués avec une ★.

Pour chaque produit exemple, afficher en temps réel :
- **Nom du produit**
- **Quantité 1ère tranche** (matin) — en unités
- **u/pl** — unitésParPlaque
- **Plaquage** — résultat du calcul : `Math.ceil(qté_matin × %_programme / 100 / unitésParPlaque)` en plaques

Et en bas : **Total plaques** = somme des plaquages des produits exemples.

Quand le manager modifie le pourcentage (slider ou input), les colonnes Plaquage et Total se mettent à jour **en temps réel**.

Les produits exemples sélectionnés sont persistés dans le fichier MANAGER .bvp.json (dans l'objet `plaquage`, par programme : `{ "Viennoiserie classique": { pourcentage: 80, exemplesIds: [12, 45, 78] } }`).

### Persistance
Les pourcentages de plaquage par programme doivent être :
- Stockés dans le state du MagasinContext (ex: `plaquageProgrammes` = { "Viennoiserie classique": 80, "Pain tradition": 50, ... })
- Exportés dans le fichier MANAGER .bvp.json (dans l'objet `configuration` ou un nouvel objet `plaquage`)
- Rechargés depuis l'archive MANAGER

## 2. Modification de la colonne "Plaquage" sur la feuille de production

### Formule

```
Plaquage = Math.ceil( quantité_1ère_tranche × (pourcentage_programme / 100) / unitesParPlaque )
```

Où :
- `quantité_1ère_tranche` = la quantité préconisée pour la 1ère tranche horaire du jour (en unités)
- `pourcentage_programme` = le % défini par le manager dans l'onglet Plaquage pour le programme de ce produit
- `unitesParPlaque` = le nombre d'unités qui tiennent sur une plaque (depuis le référentiel produit)
- Le résultat est arrondi au supérieur (Math.ceil) car on ne fait pas de demi-plaque

### Exemple concret
- CROISSANT : 1ère tranche = 48 unités, programme "Viennoiserie" à 80%, 20 unités/plaque
- Plaquage = Math.ceil(48 × 0.80 / 20) = Math.ceil(1.92) = **2 plaques**

### Si unitesParPlaque = 0 ou non défini
Afficher "—" (tiret), pas de calcul possible.

### Si pourcentage_programme non défini
Utiliser 100% par défaut (tout est plaqué).

## 3. Fichiers à modifier

### Nouveau fichier : `src/components/manager/pilotage/OngletPlaquage.jsx`
Créer le composant de l'onglet Plaquage avec le tableau des programmes et les sliders/inputs.

### `src/components/manager/Etape4PilotageCA.jsx`
Ajouter l'onglet "Plaquage" dans la liste des onglets.

### `src/contexts/MagasinContext.jsx`
Ajouter le state `plaquageProgrammes` et son setter. L'exposer dans le contexte.

### `src/components/manager/Etape5Communication.jsx`
Exporter `plaquageProgrammes` dans le fichier MANAGER .bvp.json.

### `src/components/equipe/planning/SectionImpression.jsx`
Modifier le calcul de la colonne "Plaquage" pour utiliser la formule :
`Math.ceil(qte1ereTranche × (pourcentageProgramme / 100) / unitesParPlaque)`

Au lieu de l'ancien calcul (qui utilisait juste qte1ereTranche / unitesParPlaque).

### `src/components/equipe/planning/Produit3Lignes.jsx`
Si la colonne Plaquage est aussi affichée dans l'interface interactive (pas seulement l'impression), appliquer la même formule.

## 4. Mise à jour CDC

Ajouter dans ADDENDUM_CDC_V5.2.md :

```markdown
## 29. Onglet Plaquage — Pourcentage par programme de cuisson
**Date : 19/03/2026**

### 29.1 Définition
Le plaquage est l'action de préparer les plaques de cuisson la veille pour la 1ère cuisson du lendemain.

### 29.2 Configuration
Un onglet "Plaquage" dans l'Étape 4 Pilotage CA permet au manager de définir un pourcentage de plaquage par programme de cuisson (0-100%, défaut 100%).

### 29.3 Formule colonne Plaquage (feuille de production)
`Plaquage = ⌈ quantité_1ère_tranche × %_programme / unitésParPlaque ⌉`

### 29.4 Persistance
Les pourcentages sont stockés dans le fichier MANAGER .bvp.json et rechargés depuis l'archive.
```
