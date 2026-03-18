# Organisation du projet BVP Planning

**Dernière mise à jour :** 18 mars 2026

---

## Profil utilisateur

- **Nom :** Rudy
- **Expertise :** Expert métier BVP (Boulangerie-Viennoiserie-Pâtisserie), non-développeur
- **Rôle :** Product Owner / Chef de projet fonctionnel
- **Matériel :** Mac Air M4
- **Contexte :** Service Innovation Mousquetaires (Intermarché)

---

## Outils utilisés

| Outil | Usage | Rôle |
|-------|-------|------|
| **Claude Cowork** (desktop) | Vision projet, fonctionnalités, diagnostic, rédaction CDC | Chef de projet / Architecte fonctionnel |
| **Claude Code** (VS Code, terminal) | Codage, corrections, déploiement, git | Développeur / Exécutant technique |

---

## Flux de travail standard

1. **Rudy** discute avec **Cowork** de la vision, des fonctionnalités, des bugs constatés
2. **Cowork** analyse le code, la structure existante, et les fichiers du projet
3. Selon la complexité :
   - **Tâche simple** : Cowork effectue directement la modification (édition de fichiers, corrections mineures)
   - **Tâche complexe** : Cowork génère un **prompt détaillé** que Rudy copie-colle dans **Claude Code** via VS Code
4. **Claude Code** exécute les modifications techniques (codage, terminal, build, deploy)
5. **Rudy** teste le résultat dans le navigateur et remonte les observations à Cowork

---

## Documents de référence du projet

| Document | Rôle |
|----------|------|
| `CLAUDE.md` | Instructions persistantes pour Claude Code (règles, architecture, interdictions) |
| `CAHIER_DES_CHARGES_V5.md` | Spécifications fonctionnelles de référence |
| `ADDENDUM_CDC_V5.2.md` | Évolutions V5.2/V5.3 — source de vérité pour les ajouts récents |
| `ORGANISATION_PROJET.md` | Ce fichier — organisation, rôles, flux de travail |

---

## Règles de communication Cowork

- Rudy n'est pas développeur : expliquer les concepts techniques simplement quand nécessaire
- Toujours baser les analyses sur le code réel (pas d'hypothèses)
- Toujours mettre à jour le CDC (ADDENDUM) après une modification fonctionnelle validée

### Format des prompts pour Claude Code

Quand Cowork prépare un prompt pour Claude Code :

1. **Écrire le prompt dans un fichier .md** dans le dossier du projet (ex: `PROMPT_FIX_NOM_DU_FIX.md`)
2. **Proposer l'instruction à Rudy** dans un **bloc de code** (encadré avec bouton copier), par exemple :

```
Lis et exécute le fichier PROMPT_FIX_NOM_DU_FIX.md. Il corrige [description courte du problème].
```

3. Rudy copie cette instruction via le bouton copier et la colle dans Claude Code
4. Une fois le travail validé, les fichiers PROMPT_*.md sont supprimés pour garder le dossier propre

### Règle importante
- Ne JAMAIS proposer les instructions sous forme de citation (>) ou de texte libre
- TOUJOURS utiliser le bloc de code (triple backtick) pour que Rudy ait le bouton copier
