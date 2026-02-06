# ÉTAT RÉEL DU PROJET BVP PLANNING V5

> **DOCUMENT DE RÉFÉRENCE UNIQUE**
> Vérifié manuellement le : **02/02/2026**
> Par : Rudy + Claude (audit visuel de l'application)

---

## ⚠️ IMPORTANT POUR CLAUDE CODE

Ce document est la **SOURCE DE VÉRITÉ** pour l'état du projet.
- Les anciens CDC (V1 à V5) peuvent contenir des informations obsolètes
- Ce document a été créé après vérification visuelle de chaque écran
- En cas de doute, se référer à CE document

---

## 📊 RÉSUMÉ EXÉCUTIF

| Univers | État | Détail |
|---------|------|--------|
| **Accueil** | ✅ Complet | Choix Manager / Équipe |
| **Manager** | ⚠️ 6/7 étapes | Étape Communication = placeholder |
| **Équipe** | ✅ Complet | 3 modules fonctionnels |

---

## 1. PAGE D'ACCUEIL (AccueilGlobal.jsx)

**État : ✅ COMPLET**

| Élément | État |
|---------|------|
| Logo Mousquetaires | ✅ |
| Badge V5.0 | ✅ |
| Carte MANAGER | ✅ |
| Carte ÉQUIPE | ✅ |
| Conseil en bas de page | ✅ |
| Footer avec mention données locales | ✅ |

---

## 2. UNIVERS MANAGER (WizardManager.jsx)

**État : ⚠️ 6/7 ÉTAPES COMPLÈTES**

### Barre de navigation : 7 étapes
| # | Nom | Icône | État |
|---|-----|-------|------|
| 0 | Import | Upload | ✅ Complet |
| 1 | Diagnostic | BarChart3 | ✅ Complet |
| 2 | Objectif | Target | ✅ Complet |
| 3 | Ventes | FileSpreadsheet | ✅ Complet |
| 4 | Config | Settings | ✅ Complet |
| 5 | Pilotage | TrendingUp | ✅ Complet |
| 6 | Communication | MessageSquare | ❌ **PLACEHOLDER** |

---

### Étape 0 - Import (Etape0Import.jsx)
**État : ✅ COMPLET**

Fonctionnalités vérifiées :
- [x] Sélection dossier DATA_perso via File System Access API
- [x] Détection automatique des fichiers Vente_Hebdo_BVP_*.xlsx
- [x] Liste des fichiers détectés avec checkmarks
- [x] Sélection de la semaine (dropdown)
- [x] Recherche de magasin (code ou ville)
- [x] Affichage nombre de semaines disponibles
- [x] Indicateur de chargement pendant l'extraction
- [x] Confirmation avec infos magasin (nom, code, enseigne)

---

### Étape 1 - Diagnostic (Etape1Diagnostic.jsx)
**État : ✅ COMPLET**

Fonctionnalités vérifiées :
- [x] Bandeau magasin (code, nom, enseigne, surface, modèle)
- [x] 4 KPIs : Tickets PDV, Tickets BVP, Ticket Moyen, CA BVP
- [x] Explication du modèle magasin
- [x] **BENCHMARK INTÉGRÉ** :
  - [x] Section "Je me compare"
  - [x] Tableau des magasins comparables (même secteur + modèle)
  - [x] Médailles pour Top 3 (🥇🥈🥉)
  - [x] Ligne du magasin courant surlignée
  - [x] Moyenne du groupe
  - [x] Bouton "Voir tout"
- [x] Section "Ma situation" (comparaison historique)
- [x] Graphiques de pénétration par tranche horaire
- [x] Potentiel chiffré
- [x] Plan d'action avec créneaux prioritaires

---

### Étape 2 - Objectif CA (Etape2ObjectifCA.jsx)
**État : ✅ COMPLET**

Fonctionnalités vérifiées :
- [x] Affichage CA actuel
- [x] Calcul automatique du potentiel
- [x] 3 modes : Suggéré / Personnalisé / Ignorer
- [x] Saisie d'objectif personnalisé en €
- [x] Calcul du pourcentage vs CA actuel
- [x] Gestion de la règle S-4 (fréquentation)

---

### Étape 3 - Ventes/Casse (Etape2bImportVentes.jsx)
**État : ✅ COMPLET**

Fonctionnalités vérifiées :
- [x] Import fichier Comparatif Ventes/Casse (Mercalys)
- [x] Validation minimum 3 semaines
- [x] Résumé après import (nb produits, nb semaines, CA, taux casse)
- [x] Badges de distribution par rayon
- [x] Code couleur taux de casse (< 5% vert, 5-20% orange, > 20% rouge)

---

### Étape 4 - Configuration (Etape3Configuration.jsx)
**État : ✅ COMPLET**

Fonctionnalités vérifiées :
- [x] Grille jours × créneaux (Matin 6h-14h / Après-midi 14h-20h)
- [x] 3 états par cellule : ouvert / fermé habituel / fermé exceptionnel
- [x] Interaction clic cyclique
- [x] Paramétrage redistribution (% même jour / jour suivant)
- [x] Options de regroupement des 6 tranches horaires
- [x] Aperçu des colonnes affichées

---

### Étape 5 - Pilotage CA (Etape4PilotageCA.jsx)
**État : ✅ COMPLET**

Fonctionnalités vérifiées :
- [x] Dashboard CA toujours visible (4 blocs)
  - [x] CA Historique + taux de casse
  - [x] Objectif en %
  - [x] Prévision
  - [x] Progression
- [x] Barre de sélection (nb produits actifs, % couverture CA)
- [x] **4 onglets** :
  - [x] Gamme (rose) - Tableau produits triable
  - [x] Limites (violet) - Matrice Famille × Jour avec codes S/F/f/P
  - [x] Promo (bleu) - StepAnimationCommerciale
  - [x] Commande (emeraude) - Placeholder "Phase 5"
- [x] Popup détail casse par produit
- [x] Toggle actif/inactif par produit
- [x] Colonnes : Produit, Rayon, Casse%, Moy Hebdo, Potentiel, CA, Tendance, Fiabilité

**Système de limites implémenté :**
| Code | Signification | Formule |
|------|---------------|---------|
| S | Sans plafond | Calcul mathématique pur |
| F | Forte progression | +20% max |
| f | Prudent | +10% max |
| P:xx | Personnalisé | +xx% max |

---

### Étape 6 - Communication
**État : ❌ PLACEHOLDER**

```
Message affiché : "Cette étape sera implémentée dans la Phase 8 du plan V5."
```

**À implémenter :**
- [ ] Récapitulatif de la configuration
- [ ] Export fichier .bvp.json pour l'équipe
- [ ] Impression planning semaine
- [ ] Impression fiche commande

---

## 3. UNIVERS ÉQUIPE (AccueilEquipe.jsx)

**État : ✅ COMPLET**

### Page d'accueil Équipe
- [x] Header "Espace Équipe - Production quotidienne"
- [x] Badge V5.3
- [x] Affichage magasin chargé + semaine + nb produits
- [x] Bouton "Changer" pour charger un autre fichier
- [x] 3 cartes modules avec descriptions
- [x] Section "Comment ça marche ?"

---

### Module 1 - Planning du jour (PlanningJour.jsx)
**État : ✅ COMPLET**

Fonctionnalités vérifiées :
- [x] Header avec nom magasin et semaine
- [x] Navigation par jour (Lun → Dim)
- [x] Affichage date complète
- [x] Indicateur créneau actuel (surligné)
- [x] Filtres : Famille, Cuisson, Simple/Détail, Unités/Plaques
- [x] Bouton Programmes
- [x] Toggle Jour / Semaine
- [x] Option 4 créneaux / 6 créneaux
- [x] Glisser pour réorganiser
- [x] Tableau par famille (ex: BOULANGERIE - 77 produits)
- [x] Regroupement par programme (ex: PRÉCUISSON SPÉCIAUX)
- [x] Colonnes : Matin, 12h-14h, 14h-16h, Après-midi, Total
- [x] Affichage PLU et nb/plaque par produit

---

### Module 2 - Inventaire (InventaireStock.jsx)
**État : ✅ COMPLET**

Fonctionnalités vérifiées :
- [x] Titre "Inventaire Stock"
- [x] Aide contextuelle (comptage en cartons complets)
- [x] Recherche de produit
- [x] Barre de progression (X/185 produits - X%)
- [x] Organisation par famille avec compteur (X/81 renseignés)
- [x] Champ de saisie stock actuel en cartons
- [x] Affichage conditionnement (ex: 1 carton = 12 unités)
- [x] Bouton Sauvegarder
- [x] Affichage dernière sauvegarde (date + heure)

---

### Module 3 - Saisie Équipe
**État : ✅ COMPLET**

Fonctionnalités vérifiées :
- [x] Header avec magasin et semaine
- [x] Badge Inventaire (0/185)
- [x] **3 onglets** :
  - [x] Inventaire
  - [x] Personnalisation
  - [x] Plaquage J+1
- [x] Recherche de produit
- [x] Organisation par famille
- [x] Champ "Votre nom" pour identifier l'utilisateur
- [x] Compteurs : inventaires, perso, J+1
- [x] Bouton Exporter

---

## 4. FICHIERS D'ÉCHANGE JSON

### Format .bvp.json
**État : ✅ DÉFINI ET FONCTIONNEL**

```json
{
  "schemaVersion": "2.0",
  "createdAt": "2026-01-11T21:41:20.984Z",
  "createdBy": "BVP Planning V2.0",
  "magasin": {
    "nom": "SAS CHAMAFFI",
    "code": "10679"
  },
  "configuration": {
    "semaine": 4,
    "annee": 2026,
    "dateDebut": "2026-01-18",
    "dateFin": "2026-01-24",
    "horaires": { ... }
  },
  "produits": [ ... ]
}
```

| Aspect | État |
|--------|------|
| Format défini | ✅ |
| Import côté Équipe | ✅ Fonctionne |
| Export côté Manager | ❌ Non implémenté (placeholder) |

---

## 5. CE QUI RESTE À FAIRE

### Priorité 1 : Étape Communication (Manager)
- [ ] Créer le composant Etape5Communication.jsx
- [ ] Récapitulatif de la configuration semaine
- [ ] Génération du fichier .bvp.json
- [ ] Bouton "Exporter pour l'équipe"
- [ ] Options d'impression

### Priorité 2 : Onglet Commande (Pilotage CA)
- [ ] Remplacer le placeholder "Phase 5"
- [ ] Calcul des besoins en cartons
- [ ] Affichage stock en jours
- [ ] Fiche de commande imprimable

### Priorité 3 : Améliorations
- [ ] Synchronisation temps réel Manager ↔ Équipe (si même réseau)
- [ ] Mode hors-ligne complet
- [ ] Export PDF des rapports

---

## 6. ARCHITECTURE TECHNIQUE

### Stack
- React 18+ avec Vite
- Tailwind CSS (thème Mousquetaires)
- Lucide React (icônes)
- XLSX (parsing Excel)
- File System Access API (Chrome/Edge uniquement)
- 100% local (aucun backend)

### Fichiers principaux
```
src/
├── AppV5.jsx                    # Point d'entrée
├── components/
│   ├── AccueilGlobal.jsx        # Accueil
│   ├── manager/
│   │   ├── WizardManager.jsx    # Wizard 7 étapes
│   │   ├── Etape0Import.jsx     # ✅
│   │   ├── Etape1Diagnostic.jsx # ✅
│   │   ├── Etape2ObjectifCA.jsx # ✅
│   │   ├── Etape2bImportVentes.jsx # ✅
│   │   ├── Etape3Configuration.jsx # ✅
│   │   └── Etape4PilotageCA.jsx # ✅
│   └── equipe/
│       ├── AccueilEquipe.jsx    # ✅
│       ├── PlanningJour.jsx     # ✅
│       ├── InventaireStock.jsx  # ✅ (ou InventaireEquipe.jsx)
│       └── [Saisie Équipe]      # ✅
├── contexts/
│   ├── MagasinContext.jsx
│   └── ProfilContext.jsx
└── services/
    ├── dataExtractionService.js
    ├── gammeExtractionService.js
    ├── potentielCalculator.js
    └── referentielITM8.js
```

---

## 7. NOTES IMPORTANTES

### Versioning
- Accueil affiche **V5.0**
- Espace Équipe affiche **V5.3**
- Le code utilise `main.jsx` → `AppV5.jsx`

### Anciennes versions (NE PAS UTILISER)
- `App.jsx` - Version intermédiaire
- `AppV4.jsx` - Ancienne architecture (Benchmark séparé)
- `main-v4.jsx` - Point d'entrée V4

### Fichiers CDC à ignorer
Les fichiers suivants peuvent contenir des informations obsolètes :
- `CAHIER_DES_CHARGES.md`
- `CAHIER_DES_CHARGES_V2.md`
- `CAHIER_DES_CHARGES_V3.md`
- `CAHIER_DES_CHARGES_V4.md`
- `CAHIER_DES_CHARGES_V5.md`
- `CDC-Verif.md`
- `RAPPORT_ECARTS_CDC_V5_vs_CODE.md`

**Se référer à CE DOCUMENT (ETAT_REEL_PROJET_V5.md) en priorité.**

---

## 8. HISTORIQUE DES VÉRIFICATIONS

| Date | Par | Action |
|------|-----|--------|
| 02/02/2026 | Rudy + Claude | Audit complet visuel de l'application |

---

*Document généré et vérifié manuellement - Source de vérité unique*
