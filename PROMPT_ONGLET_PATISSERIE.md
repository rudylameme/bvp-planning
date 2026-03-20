# NOUVELLE FONCTIONNALITÉ : Onglet Pâtisserie — Couverture multi-jours

## Contexte métier

Les produits de pâtisserie sont sous atmosphère contrôlée (DLC 7 jours). Contrairement à la viennoiserie (cuisson du jour), on ne met pas en rayon une journée de vente mais **plusieurs jours de vente d'un coup**. Le manager décide combien de jours de vente couvrir.

100% des produits dont le rayon/famille = "Pâtisserie" sont concernés par cette logique.

## 1. Nouvel onglet "Pâtisserie" dans l'Étape 4 Pilotage CA

### Position
Ajouter un onglet "Pâtisserie" dans les onglets de l'Étape 4, au même niveau que Gamme, Limites, Promo, Commande, Suivi, Plaquage, Analyse.

### Contenu de l'onglet

#### Réglage principal
Un **slider ou input numérique** "Jours de couverture" (1 à 7 jours, défaut : 2).
Label : "Nombre de jours de vente couverts par mise en rayon"

#### Sélecteur de jour de mise en rayon
Un **dropdown** avec les jours de la semaine ouverts (depuis joursOuverture du contexte).
Label : "Jour de mise en rayon"
Défaut : le jour actuel (ou lundi).

#### Produits exemples
Le manager peut sélectionner **2 à 3 produits pâtisserie** parmi les produits actifs dont le rayon/famille = "Pâtisserie".

Pour chaque produit exemple, afficher en temps réel :

| Produit | Jour 1 (Mer) | Jour 2 (Jeu) | Jour 3 (Ven) | **Total** |
|---------|-------------|-------------|-------------|-----------|
| ★ Éclair chocolat | 5 | 4 | 6 | **15** |
| ★ Tarte citron | 3 | 2 | 4 | **9** |
| ★ Mille-feuille | 2 | 2 | 3 | **7** |

Les colonnes jour affichent la préconisation journalière de chaque jour (issue de `repartitionJours` du produit dans le fichier MANAGER). Le total = **somme** des jours affichés (PAS une multiplication).

Si le manager change le nombre de jours (ex: de 3 à 2), la colonne Jour 3 disparaît et le total se recalcule.
Si le manager change le jour de mise en rayon (ex: de mercredi à lundi), les colonnes se mettent à jour avec les jours correspondants (Lun, Mar, Mer).

#### Passage de semaine et jours fermés
Les jours se suivent naturellement. Si on est vendredi avec 3 jours : Vendredi + Samedi + Dimanche.
Si on est dimanche avec 3 jours : Dimanche + Lundi + Mardi.
Les jours fermés **comptent quand même** (le produit est en rayon, DLC court). La préconisation pour un jour fermé = 0 ventes, mais le jour est bien affiché dans les colonnes. C'est un jour calendaire, pas un jour de vente.

#### Identification des produits pâtisserie
Un produit est de la pâtisserie si son champ `rayon` ou `famille` contient "Pâtisserie" ou "PATISSERIE" ou "patisserie" (case insensitive, avec ou sans accent).

### Persistance
- `couverturePatisserie` : { jours: 3, jourDepart: "mercredi", exemplesIds: [id1, id2, id3] }
- Stocké dans le state du MagasinContext
- Exporté dans le fichier MANAGER .bvp.json
- Rechargé depuis l'archive MANAGER

## 2. Impact sur la feuille de production (SectionImpression.jsx)

### Pour les produits pâtisserie uniquement :
Au lieu d'afficher les tranches horaires (Matin, 12h, 14h, Soir), afficher les **jours couverts** :

| PLU | u/pl | Article | Remarque | Plaquage | Mer | Jeu | Ven | **Total** | Stock | A cuire |
|-----|------|---------|----------|----------|-----|-----|-----|-----------|-------|---------|

- Les colonnes Mer/Jeu/Ven remplacent les colonnes Matin/12h/14h/Soir
- Chaque colonne jour = la préconisation journalière totale du produit pour ce jour
- **Total** = somme des jours
- La colonne "Plaquage" n'a pas de sens pour la pâtisserie (pas de cuisson) → afficher "—"
- **3 colonnes spécifiques pâtisserie** en fin de ligne (même principe que la dernière cuisson en boulangerie) :
  - **Ventes** = le total des préconisations sur les X jours (somme des colonnes jour)
  - **Stock** = saisie manuelle par l'équipe (ce qu'il reste en rayon). Champ éditable, défaut 0.
  - **À sortir** = Max(Ventes - Stock, 0). Si le stock couvre les ventes, à sortir = 0.
- Ces 3 colonnes remplacent les colonnes "Stock" et "A cuire" de la viennoiserie

### Pour les produits NON-pâtisserie :
Aucun changement — affichage par tranches horaires comme aujourd'hui.

### Sur l'affichage interactif (Produit3Lignes.jsx) :
Même logique : si le produit est pâtisserie, afficher les jours au lieu des tranches.

## 3. Fichiers à modifier

### Nouveau fichier : `src/components/manager/pilotage/OngletPatisserie.jsx`
Le composant de l'onglet avec le slider, le sélecteur de jour, et les produits exemples.

### `src/components/manager/Etape4PilotageCA.jsx`
Ajouter l'onglet "Pâtisserie" dans la liste des onglets.

### `src/contexts/MagasinContext.jsx`
Ajouter le state `couverturePatisserie` et son setter.

### `src/components/manager/Etape5Communication.jsx`
Exporter `couverturePatisserie` dans le fichier MANAGER .bvp.json.

### `src/components/equipe/planning/SectionImpression.jsx`
Modifier le rendu pour les produits pâtisserie : colonnes jour au lieu de tranches.

### `src/components/equipe/planning/Produit3Lignes.jsx`
Même adaptation pour l'affichage interactif.

### `src/components/equipe/planning/calculerQuantites.js`
Ajouter une fonction `calculerQuantitesPatisserie(produit, jourDepart, nbJours, frequentation, configuration)` qui retourne les préconisations pour chaque jour couvert.

## 4. Mise à jour CDC

Ajouter dans ADDENDUM_CDC_V5.2.md :

```markdown
## 30. Onglet Pâtisserie — Couverture multi-jours
**Date : 19/03/2026**

### 30.1 Règle métier
Les produits pâtisserie (sous atmosphère contrôlée, DLC 7 jours) ne sont pas planifiés jour par jour comme la viennoiserie. Le manager définit un nombre de jours de couverture (1-7, défaut 2) et les préconisations de chaque jour sont additionnées pour donner le total à mettre en rayon.

### 30.2 Calcul
Total = Σ repartitionJours[jour_i] pour i = jourDepart à jourDepart + nbJours - 1

### 30.3 Feuille de production
Les produits pâtisserie affichent des colonnes jour (Mer, Jeu, Ven) au lieu des tranches horaires (Matin, 12h, 14h, Soir). Le total est la somme des jours.

### 30.4 Persistance
couverturePatisserie = { jours: 3, jourDepart: "mercredi", exemplesIds: [...] } dans le fichier MANAGER .bvp.json.
```
