# PROMPT POUR CLAUDE CODE — Nettoyage Intelligent de la Gamme

Lis d'abord ces fichiers dans cet ordre :
1. `CLAUDE.md` (règles du projet)
2. `SPEC_NETTOYAGE_GAMME.md` (spécification technique complète de la fonctionnalité)
3. `ADDENDUM_CDC_V5.2.md` (contexte des modifications récentes)

Puis implémente la spécification `SPEC_NETTOYAGE_GAMME.md` en suivant l'ordre d'implémentation recommandé dans ce document (section "ORDRE D'IMPLÉMENTATION RECOMMANDÉ").

Rappels importants :
- Lis chaque fichier concerné EN ENTIER avant de le modifier
- Le nouveau référentiel est déjà dans `public/Data/referentiel V2.xlsx`
- Garde la rétrocompatibilité avec le référentiel V1 (auto-détection du format)
- Les "buchettes" sont des PAINS, pas des bûches de Noël (ne pas les marquer hors saison)
- Teste avec `npm run build` à la fin pour vérifier qu'il n'y a pas d'erreur de compilation
- Mets à jour `CLAUDE.md` et `ADDENDUM_CDC_V5.2.md` en fin de travail
