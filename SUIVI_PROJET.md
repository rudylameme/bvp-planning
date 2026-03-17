# SUIVI PROJET — BVP Planning

Dernière mise à jour : 12 mars 2026

---

## VUE D'ENSEMBLE

BVP Planning est une application web (React + Vite) pour la gestion du rayon Boulangerie-Viennoiserie-Pâtisserie en grande distribution (Groupement Les Mousquetaires).

4 univers :
- ADHERENT — Benchmark (analyser son rayon)
- MANAGER — Wizard planning (préparer la semaine)
- EQUIPE — Production quotidienne (planning du jour + commande)
- SECTEUR — Dashboard responsable secteur

---

## ÉTAT ACTUEL PAR UNIVERS

### ADHERENT (Benchmark)
- FAIT : Import données, diagnostic, comparaison
- STATUT : Fonctionnel

### MANAGER (Wizard Planning)
- FAIT : 5 étapes du wizard, export fichier MANAGER, copie vers dossier équipe
- FAIT : Lecture archives (S-1 à S-52), lecture retour équipe
- FAIT : Scan dossier archives et dossier équipe
- A FAIRE : Incrémentation version quand régénère même semaine

### EQUIPE (Production quotidienne)
- FAIT : Planning du jour avec toutes les fonctionnalités (tranches horaires, familles, programmes, impression)
- FAIT : Commande (inventaire, personnalisation, plaquage J+1)
- FAIT : Sélection dossier partagé (au lieu d'import fichier unitaire)
- FAIT : Scan automatique du fichier MANAGER dans le dossier
- FAIT : Chargement personnalisations depuis fichier EQUIPE
- FAIT : Sauvegarde automatique dans fichier EQUIPE (debounced 2s)
- FAIT : CommandeEquipe sauvegarde auto inventaires dans fichier EQUIPE + export vers dossier partagé
- FAIT : CommandeEquipe charge inventaires existants depuis fichier EQUIPE au démarrage
- A FAIRE : Supprimer les clés localStorage après validation terrain

### SECTEUR (Dashboard)
- FAIT : Classement PDV, drill-down
- STATUT : Fonctionnel

---

## ARCHITECTURE ZERO-LOCALSTORAGE

Décision du 12/03/2026 : migrer toutes les données modifiables vers les fichiers .bvp.json.

Deux fichiers par semaine et par magasin :

| Fichier | Écrit par | Lu par |
|---------|-----------|--------|
| MANAGER-XXXXX-SXX-YYYY.bvp.json | Manager | Manager + Équipe |
| EQUIPE-XXXXX-SXX-YYYY.bvp.json | Équipe | Manager + Équipe |

Progression de la migration :
- [x] Manager écrit dans dossierArchives + dossierEquipe
- [x] Manager lit archives MANAGER et retour EQUIPE
- [x] Équipe sélectionne un dossier partagé
- [x] Équipe scanne et charge le fichier MANAGER
- [x] Équipe charge personnalisations depuis fichier EQUIPE
- [x] Équipe sauvegarde modifications dans fichier EQUIPE (PlanningJour)
- [x] Équipe : CommandeEquipe → fichier EQUIPE (inventaires, sauvegarde auto + export)
- [ ] Manager : incrémentation version (v2, v3...)
- [ ] Suppression localStorage après validation

---

## FICHIERS CLÉS MODIFIÉS (session 12/03/2026)

| Fichier | Modification |
|---------|-------------|
| src/AppV5.jsx | ITEMS_EQUIPE → directory + passage dossierEquipeHandle |
| src/services/dossierEquipeService.js | NOUVEAU — scan, lecture, écriture fichiers dans dossier partagé |
| src/components/equipe/AccueilEquipe.jsx | Scan dossier au lieu de localStorage, chargement MANAGER + EQUIPE |
| src/components/equipe/PlanningJour.jsx | Init depuis donneesEquipe, sauvegarde debounced vers fichier |
| CLAUDE.md | Architecture zéro-localStorage documentée |
| ADDENDUM_CDC_V5.2.md | Section 15 ajoutée |

---

## PROCHAINES PRIORITÉS

1. ~~Adapter CommandeEquipe~~ ✅ FAIT
2. Tester le flux complet : Manager exporte → Équipe charge → Équipe modifie → Manager récupère
3. Implémenter le versioning côté Manager (v2, v3 si même semaine)
4. Supprimer progressivement localStorage après validation terrain
5. Tests sur différents navigateurs (Chrome, Edge) pour File System Access API

---

## NOTES TECHNIQUES

- File System Access API : nécessite HTTPS ou localhost, Chrome/Edge uniquement
- IndexedDB : stocke uniquement les FileSystemDirectoryHandle (pas les données)
- Debounce sauvegarde : 2 secondes après la dernière modification (évite les écritures trop fréquentes)
- Fallback localStorage : conservé temporairement pendant la migration, sera supprimé après validation
