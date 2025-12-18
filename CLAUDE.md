# Instructions Claude Code - BVP Planning

## Charte Graphique Groupement Mousquetaires

Ce projet doit respecter l'identité visuelle du Groupement Mousquetaires.

### Assets disponibles
- Logo HD : `/public/Data/GROUP_MOUSQUETAIRES_SIGNATURE_HD.jpg`
- Guide visuel : `/public/Data/MOUSQUETAIRES_masque.pdf`

---

## Couleurs Principales (OBLIGATOIRES)

| Nom | Code Hex | Usage |
|-----|----------|-------|
| Rouge Mousquetaires | `#ED1C24` | Actions principales, titres, erreurs |
| Rouge Sombre | `#8B1538` | Accents, états hover |
| Beige | `#E8E1D5` | Fonds de page, zones secondaires |
| Gris | `#D1D3D4` | Séparateurs, bordures |
| Gris Foncé | `#58595B` | Textes principaux |

---

## Couleurs par Famille Produit

| Famille | Background | Border | Text |
|---------|------------|--------|------|
| BOULANGERIE | `bg-stone-100` | `border-stone-300` | `text-stone-800` |
| VIENNOISERIE | `bg-amber-100` | `border-amber-300` | `text-amber-800` |
| PATISSERIE | `bg-rose-100` | `border-rose-300` | `text-rose-800` |
| SNACKING | `bg-emerald-100` | `border-emerald-300` | `text-emerald-800` |
| AUTRE | `bg-slate-100` | `border-slate-300` | `text-slate-800` |

---

## Styles des Boutons

```css
/* Bouton Primaire (action principale) */
bg-amber-700 hover:bg-amber-800 text-white

/* Bouton Succès */
bg-emerald-600 hover:bg-emerald-700 text-white

/* Bouton Danger */
bg-red-600 hover:bg-red-700 text-white

/* Bouton Navigation */
bg-gray-600 hover:bg-gray-700 text-white

/* Bouton Secondaire (outline) */
border-gray-300 hover:bg-gray-50 text-gray-700

/* Focus pour tous les boutons */
focus:ring-2 focus:ring-amber-500 focus:ring-offset-2
```

---

## États Visuels des Produits

| État | Style |
|------|-------|
| Produit reconnu ITM8 | `border-emerald-500 bg-emerald-50` |
| Produit modifié | Badge bleu "Modifié" |
| Produit custom | Badge violet "Custom" |
| Produit inactif | `opacity-50` |
| Produit avec erreur | `border-red-500` |

---

## Responsive Design

| Taille | Breakpoint | Layout |
|--------|------------|--------|
| Mobile | < 640px | Vertical, cartes empilées |
| Tablet | 640-1024px | Grilles 2 colonnes |
| Desktop | > 1024px | Grilles 3-4 colonnes |

---

## Principes de Design

1. **Professionnalisme** : Interface propre et sobre
2. **Cohérence** : Utiliser systématiquement les couleurs Mousquetaires
3. **Lisibilité** : Contraste suffisant, textes en gris foncé #58595B
4. **Accessibilité** : Boutons assez grands, zones cliquables évidentes

---

## Référence complète

Pour les spécifications détaillées, consulter : `CAHIER_DES_CHARGES.md` (section 8.7 Design System)
