# RAPPORT D'AUDIT — Migration des personnalisations EQUIPE

> Phase 1 : lecture seule. Aucun code modifié.
> Date : 2026-04-14
> Magasin : CONFOLENS (9839) — utilisatrice : Aude Shiano
> Commande source : `/Users/rudyremy/Developer/BVP-Brain/Prompts/PROMPT_FIX_PERSONNALISATIONS_EQUIPE.md`

---

## 1. Résumé exécutif

Le bug remonté par Aude a 3 causes distinctes qui se combinent — **aucune n'est l'hypothèse principale du prompt** (« rupture de format S14→S15 avec libellés perdus »). Voici ce que j'ai réellement trouvé :

1. **Les IDs produits du fichier MANAGER ne sont PAS stables d'une semaine à l'autre.** Ils viennent de `gammeExtractionService.formaterPourPilotageCA()` ([src/services/gammeExtractionService.js:775-828](src/services/gammeExtractionService.js#L775-L828)). La logique a changé entre S14 et S15 : passage de `index + 1` à l'EAN13. En S17 il existe encore 5 formats d'ID qui coexistent (numeric, EAN13, `ean_N`, `ref-v2-*`, `archive_*`).
2. **La migration dans `PlanningJour.jsx` s'exécute côté EQUIPE à chaque ouverture, et elle match par libellé.** Dès qu'un produit réapparaît dans le MANAGER sous un autre EAN avec le même libellé, la migration crée un doublon silencieux ([src/components/equipe/PlanningJour.jsx:204-243](src/components/equipe/PlanningJour.jsx#L204-L243)).
3. **Le Manager ne pré-applique PAS les personnalisations EQUIPE au moment de l'export.** `Etape5Communication.jsx` sort les IDs recalculés par l'extraction et les personnalisations EQUIPE ne sont jamais re-mappées vers ces nouveaux IDs.

Le contenu du prompt est factuellement **partiellement faux sur le chiffrage** (0 libellé perdu S14→S15, et non 21) mais **juste sur le symptôme utilisateur** (doublons + lignes décochées).

---

## 2. Vérification des 4 observations du prompt

### Observation 1 — « Rupture S14→S15, 38 lignes perdues, 21 libellés uniques disparus »

**Partiellement fausse.**

Vérifié avec `node` sur les fichiers `/Users/rudyremy/Developer/Doc de travail/CONFOLENS/Confo 4 échanges/EQUIPE-09839-S14-2026.bvp.json` et `EQUIPE-09839-S15-2026.bvp.json` :

| Fichier | `schemaVersion` | Nb perso | Libellés uniques | Numeric purs | EAN13 | `ref-v2-*` | suffix `_N` | `undefined` |
|---------|-----------------|----------|------------------|--------------|-------|------------|-------------|-------------|
| S14 | `"2.0"` | 229 | 190 | 190 | 0 | 0 | 38 | 1 |
| S15 | `"2.0"` | 191 | 190 | 140 | ≥1 | 1 | 49 | 1 |
| S16 | `"2.0"` | 191 | 190 | 140 | ≥1 | 1 | 49 | 1 |
| S17 | `"2.0"` | 196 | 190 | 145 | ≥1 | 1 | 49 | 1 |

- Les 229 clés de S14 contiennent **des duplicatas de libellés sous différents index numériques** (c'est-à-dire : le même produit était personnalisé plusieurs fois via des clés différentes, vestige de l'époque `id: index + 1`).
- Après migration S15, la déduplication par libellé a réduit à 191 clés pour les mêmes 190 libellés uniques.
- **Aucun libellé n'a disparu** entre S14 et S15. L'affirmation « 21 libellés uniques disparus » ne correspond à rien dans les fichiers réels.
- La rupture de format est réelle mais le `schemaVersion` reste `"2.0"` dans tous les fichiers : confirmé. Un bump de schema aurait aidé à détecter le problème.

### Observation 2 — « Doublons gérés par suffixe `_N` fragile »

**Confirmée.**

- Le code de suffixe est dans [src/services/gammeExtractionService.js:822-825](src/services/gammeExtractionService.js#L822-L825) :
  ```js
  const idRaw = ean || `noean_${index + 1}`;
  eanCount[idRaw] = (eanCount[idRaw] || 0) + 1;
  const idStable = eanCount[idRaw] > 1 ? `${idRaw}_${eanCount[idRaw]}` : idRaw;
  ```
  Le compteur `eanCount` est local à un passage dans `formaterPourPilotageCA`. Il **dépend de l'ordre d'itération des ventes brutes**. Si la source Mercalys réordonne les lignes, le produit qui avait `_2` cette semaine peut avoir `_3` la suivante.
- Confirmé dans les fichiers prod : l'EAN `2644660000000` apparaît 4 fois (`2644660000000`, `_2`, `_3`, `_4`) dans S15, S16, S17 — stable par chance, pas par design.
- Le cas `P&C PAVE MULTICEREAL PC 4` affiché en double (4/plaque + 30/plaque) décrit par Aude est cohérent avec ce bug : l'ancien `_2` pointait vers un produit avec `unitesParPlaque=30`, et après réordonnancement Mercalys la clé `_2` du nouveau MANAGER pointe vers un autre produit → la personnalisation orpheline s'est affichée sur la mauvaise ligne.

### Observation 3 — « Clé `undefined` unique par fichier »

**Confirmée.**

- Un seul endroit du code produit une clé de personnalisation : [src/components/equipe/PlanningJour.jsx:357-358](src/components/equipe/PlanningJour.jsx#L357-L358) :
  ```js
  const newModifs = {
    ...produitsModifies,
    [produitEnEdition.id]: modifications
  };
  ```
  Si `produitEnEdition.id` vaut `undefined` (produit issu de l'import sans EAN ni suffixe avant le fix `noean_*`), la clé résultante est la chaîne littérale `"undefined"`. Toute nouvelle édition d'un produit sans id écrase la précédente.
- Vérifié empiriquement : S14→S17 de CONFOLENS contiennent exactement **une** entrée sous `"undefined"` (libellé `BAG CONSTANCE PAC 250G PA`, `plu: 10159`). Identique dans les 4 fichiers → confirmation qu'une seule perso peut cohabiter sous cette clé.
- Depuis le commit [b7cea90](https://github.com/rudylameme/bvp-planning/commit/b7cea90) (2026-04-14), `gammeExtractionService` ne produit plus d'IDs `undefined` car il retombe sur `noean_${index + 1}`. Mais les produits injectés via `nettoyageGamme.appliquerArchiveSurBruts` (ligne 1283-1294) et via le chemin `archive_${...}` peuvent toujours générer des collisions si `ap.ean13 || ap.itm8` est vide et `Date.now()` est identique (improbable mais non impossible).

### Observation 4 — « Cas DOONYS S16→S17 : même libellé, EAN différent »

**Confirmée avec nuance.**

Vérifié dans `MANAGER-9839-S17-2026.bvp.json` : il existe **deux** produits avec le libellé `*DOONY'S ASSRT GOURMAND 5` :
- id = `2800859000000` (EAN d'origine, personnalisation existante S16)
- id = `3250390654988` (nouvel EAN apparu en S17)

Côté EQUIPE S17, les deux IDs portent la personnalisation `unitesParPlaque: 4`. L'équipe voit donc **le produit en double à l'écran**, un cas coché sur chaque.

La migration `PlanningJour.jsx` ligne 204-243 a créé la personnalisation sous `3250390654988` par match libellé. Mais comme l'ancienne personnalisation `2800859000000` existait toujours (le produit est toujours présent dans le MANAGER S17), elle n'a pas été supprimée. Résultat : un doublon silencieux.

**La migration ne supprime jamais les anciennes clés.** Elle ne fait qu'ajouter des nouvelles clés pour les clés purement numériques.

### Observation 5 (annexe) — `plaquageJ1` et `inventaires` vides

**Confirmée** (vides dans S12→S17). Comme indiqué, pas creusé — c'est un non-usage métier, pas un symptôme du bug.

---

## 3. Cartographie du code responsable

### 3.1 Écriture des clés `personnalisations`

| Étape | Fichier:ligne | Clé utilisée | Commentaire |
|-------|---------------|--------------|-------------|
| Génération ID produit (ventes) | [gammeExtractionService.js:822-825](src/services/gammeExtractionService.js#L822-L825) | `ean` ou `noean_${index+1}` + suffix `_N` si doublon | Stable entre deux exports **seulement si** l'ordre Mercalys ne change pas |
| Génération ID produit (archive manquant) | [nettoyageGamme.js:1283-1284](src/services/nettoyageGamme.js#L1283-L1284) | `archive_${ap.ean13 \|\| ap.itm8 \|\| Date.now()}_${addedCount}` | Instable entre exports (addedCount dépend de l'ordre d'itération) |
| Génération ID article-à-créer | [nettoyageGamme.js:757](src/services/nettoyageGamme.js#L757) | `ref-v2-${itm8}` | **Stable** (ITM8 est l'identifiant métier pérenne) |
| Génération de la clé perso à l'édition | [PlanningJour.jsx:357-358](src/components/equipe/PlanningJour.jsx#L357-L358) | `produitEnEdition.id` tel quel | Hérite de la stabilité (ou non) de l'étape précédente |
| Écriture fichier EQUIPE | [dossierEquipeService.js:307-344](src/services/dossierEquipeService.js#L307-L344) via `sauvegarderFichierEquipe` | Pas de transformation | Les clés sont recopiées telles quelles depuis `produitsModifies` |

### 3.2 Lecture / application des clés

| Étape | Fichier:ligne | Comment |
|-------|---------------|---------|
| Chargement fichier EQUIPE | [AccueilEquipe.jsx:42-58](src/components/equipe/AccueilEquipe.jsx#L42-L58) via `chargerDonneesDepuisDossier` | Charge le JSON sans toucher aux clés |
| Init `produitsModifies` | [PlanningJour.jsx:123-128](src/components/equipe/PlanningJour.jsx#L123-L128) | Prend les clés telles quelles |
| Application sur l'UI | [PlanningJour.jsx:264-280](src/components/equipe/PlanningJour.jsx#L264-L280) | Lookup direct `produitsModifies[produit.id]` |

### 3.3 Migration implicite

| Étape | Fichier:ligne | Stratégie |
|-------|---------------|-----------|
| Migration clés numériques → clé `produit.id` | [PlanningJour.jsx:204-243](src/components/equipe/PlanningJour.jsx#L204-L243) | Détecte `/^\d+$/` sur la clé, match par libellé lowercase vers le nouveau produit, remap vers `produit.id`, déclenche `planifierSauvegarde` |

Limites identifiées de cette migration (lecture du code + confirmation empirique sur CONFOLENS) :
- Ne détecte que les clés purement numériques. Les clés `ean_N` ne sont jamais migrées même si le MANAGER a changé de base d'IDs.
- Match par libellé **lowercase trim exact**. Si Mercalys rogne un caractère (ex. `*DOONY'S ASSRT GOURMAND 5` → `*DOONY'S ASSRT GOURMAND 5 ` avec espace final), la migration échoue silencieusement.
- **Ne supprime jamais les anciennes clés.** Si le produit existe encore côté MANAGER sous son ancien ID, on obtient un doublon comme dans le cas DOONYS.
- Si plusieurs produits partagent le même libellé normalisé (ex. `BUCHETTE`), le premier trouvé gagne — risque de remap erroné.

### 3.4 Pré-application côté Manager : **absente**

Le Manager, lors de l'export d'un nouveau MANAGER (semaine N+1), ne consomme PAS les personnalisations EQUIPE de la semaine N pour re-mapper les IDs. Séquence actuelle :

- [EtapeConfigPlanning.jsx:690-706](src/components/manager/EtapeConfigPlanning.jsx#L690-L706) : le Manager lit le fichier EQUIPE le plus récent et charge `data.personnalisations` dans `setPersonnalisationsEquipe(data.personnalisations)`.
- [MagasinContext.jsx:188-224](src/contexts/MagasinContext.jsx#L188-L224) : ce state est ensuite mappé **par `pg.itm8`** sur les produits de la gamme pour leur transférer `unitesParLot`, `unitesParPlaque`, `programme`, `plu`, `libellePersonnalise`, `famille`, `rayon`. Le mapping **ne dépend pas des clés du dictionnaire** (qui peuvent être n'importe quel format) mais du champ `perso.libelle` en fallback.
- [Etape5Communication.jsx:158-159](src/components/manager/Etape5Communication.jsx#L158-L159) : l'export écrit `id: p.id || p.itm8 || \`prod_${index + 1}\`` — l'ID vient de l'extraction, pas de la semaine précédente.

Conséquence : quand le Manager publie le nouveau MANAGER pour S+1, si un produit a changé d'EAN13, son id sort sous le NOUVEL EAN. L'ancienne personnalisation EQUIPE est toujours dans le fichier, toujours valide pour l'ancien EAN (s'il subsiste), mais **il n'y a pas de réécriture de la personnalisation sur le nouvel EAN**. La migration retombe alors côté EQUIPE au prochain chargement, avec les limites décrites en 3.3.

### 3.5 Point important : PlanningJour n'est pas le seul chemin de sauvegarde

`sauvegarderFichierEquipe` est aussi appelée par `CommandeEquipe.jsx` pour écrire inventaires et plaquageJ1. Elle reçoit un objet `personnalisations` complet qui vient de `donneesEquipe?.personnalisations`. Si un utilisateur ouvre seulement la commande sans passer par PlanningJour, la migration ne s'exécute pas mais le fichier est réécrit avec les clés anciennes intactes.

---

## 4. Validation des hypothèses du prompt

| Hypothèse du prompt | Statut | Commentaire |
|---------------------|--------|-------------|
| « Le mécanisme existe déjà dans le code, il est bugué — pas absent » | **Confirmée** | Migration L204-243 PlanningJour + mapping MagasinContext L188-224 |
| « 38 lignes perdues, 21 libellés uniques disparus entre S14 et S15 » | **Infirmée** | 0 libellé unique perdu. 38 = duplicatas dédupliqués |
| « Doublons `_N` fragiles » | **Confirmée** | Dépend de l'ordre Mercalys |
| « Clé `undefined` unique » | **Confirmée** | Ligne PlanningJour.jsx:358 |
| « Cas DOONYS : même produit réintégré avec un autre code » | **Confirmée** | Deux entrées MANAGER S17 avec le même libellé |
| « Le Manager doit récupérer automatiquement la liste cochée S-1 » | **Partiellement présente** | Code existe côté lecture mais manque la réécriture explicite des clés perso |

---

## 5. Plan de correction (QUOI, pas COMMENT)

### 5.1 Stabilité de la clé d'identification produit — priorité 1

- **Choix de la clé canonique** : `itm8` si disponible, sinon `ean13`, sinon `ref-v2-${itm8}` pour les articles-à-créer, sinon fallback stable. **Jamais `index + 1`, jamais `_N` basé sur ordre d'itération, jamais `archive_${Date.now()}`.**
- Raison : ITM8 est l'identifiant interne Mousquetaires, stable dans le référentiel. EAN13 est un fallback correct pour les produits sans ITM8 connu.
- Appliquer la même logique dans :
  - [gammeExtractionService.js:822-825](src/services/gammeExtractionService.js#L822-L825) (chemin ventes)
  - [nettoyageGamme.js:1283-1284](src/services/nettoyageGamme.js#L1283-L1284) (chemin archive manquante)
- Effet : les IDs deviennent reproductibles d'un export MANAGER à l'autre. La majorité des migrations deviennent inutiles.

### 5.2 Traitement des doublons de code

- **Cause racine** : le MANAGER peut contenir deux produits avec le même (ITM8, EAN13) — remontée d'un bug Mercalys ou cohabitation EAN-poids/EAN-code. La réponse actuelle (suffixe `_N` dépendant de l'ordre) est fragile.
- **Solution** : au moment de l'extraction, dédupliquer les lignes Mercalys AVANT de générer les IDs (par ITM8+EAN+libellé exact), et si une réelle cohabitation persiste, suffixer avec un discriminant **stable** (ex. une deuxième clé issue du libellé normalisé). Les lignes `_2`, `_3` visibles par Aude disparaissent alors d'elles-mêmes dès S+1.
- Vérifier que les doublons d'affichage côté équipe (cas DOONYS) sont également purgés par la passe de dédoublonnage de `nettoyageGamme` (`fusionnerDoublons` passe 3) — actuellement la passe existe mais ne fusionne pas les vrais doublons de libellé sous des EAN différents si leur CA est non nul.

### 5.3 Cas des articles sans ITM8 ni EAN13

- **Cause racine** : certains produits remontent sans code identifiant (balance, code interne non numérique). L'éditeur modal crée alors une clé `undefined` écrasante.
- **Solution** : n'autoriser la modification que si `produit.id` est tronquable à quelque chose de stable. Si vraiment aucun id possible, fallback sur un hash stable de `libellé + plu + famille` pour garantir l'unicité et la stabilité. Mieux : refuser l'édition côté UI tant qu'on ne peut pas identifier le produit (ou créer un id à l'import côté MANAGER).
- [PlanningJour.jsx:357-358](src/components/equipe/PlanningJour.jsx#L357-L358) doit garder un garde-fou `if (!produitEnEdition?.id) throw new Error(...)`.

### 5.4 Migration historique — rattraper les personnalisations déjà dispersées

- Renforcer la migration [PlanningJour.jsx:204-243](src/components/equipe/PlanningJour.jsx#L204-L243) :
  - Matcher d'abord par `itm8` si la personnalisation expose cette info (le MANAGER a bien `itm8` en clair sur chaque produit).
  - À défaut, matcher par libellé **normalisé** (en réutilisant `normaliserLibelle` de `nettoyageGamme`) et pas uniquement lowercase/trim.
  - **Supprimer l'ancienne clé** après remap réussi, pour éviter le doublon DOONYS.
  - Gérer aussi les clés `ean_N` et les clés `undefined` (matcher par libellé), pas seulement `^\d+$`.
- À cette occasion, produire un log `console.warn` listant les personnalisations non remappables (libellé introuvable côté MANAGER) pour tracer les cas à escalader.
- Exécuter la migration **aussi côté Manager** dans `EtapeConfigPlanning.jsx` après `setPersonnalisationsEquipe(data.personnalisations)`, pour que le prochain export MANAGER soit construit avec des IDs stables et des personnalisations déjà recollées.

### 5.5 Durcir le contrat d'écriture du fichier EQUIPE

- Dans [sauvegarderFichierEquipe](src/services/dossierEquipeService.js#L278-L359), ajouter une étape de validation qui :
  - vérifie qu'aucune clé n'est `undefined` ou vide,
  - bumpe `schemaVersion` à `"3.0"` quand l'écriture passe au nouveau format d'IDs,
  - enrichit chaque entrée `personnalisations[k]` avec `{ itm8, ean13, libelle }` en triplet de référence stable (redondant, mais permet la migration future sans dépendre de la clé).

### 5.6 Cas spécifique CONFOLENS — stratégie de rattrapage

Les 21 libellés « perdus » du prompt n'existent pas empiriquement. **Il n'y a donc rien à rattraper spécifiquement pour CONFOLENS**, sauf :
- Faire sauter les 3 entrées orphelines manifestes (clés numériques restantes en S17) en relançant la migration durcie (5.4) à l'ouverture S18 par Aude.
- Purger les doublons DOONYS (2 EAN différents pour le même libellé) côté MANAGER S18 en appliquant la passe de dédoublonnage (5.2).
- Vérifier avec Aude en visite si elle observe d'autres cas concrets au-delà de DOONYS et MICHE BLANCHE PREC / MULTICEREAL.

### 5.7 Non-régression MONTEVRAIN

- Charger `MANAGER-*-MONTEVRAIN-*.bvp.json` et `EQUIPE-*-MONTEVRAIN-*.bvp.json` dans un test de régression : vérifier que (a) les clés sont toutes au format EAN/ITM8, (b) aucune `undefined`, (c) aucun libellé en double sous deux IDs distincts.
- Sur le code seul, l'impact de la correction 5.1 est nul pour MONTEVRAIN (son ordre Mercalys est stable et ses IDs sont déjà EAN13 depuis S15). Risque = 0 si les correctifs respectent le fallback actuel.

---

## 6. Priorisation proposée

| # | Sujet | Urgence | Difficulté | Risque |
|---|-------|---------|------------|--------|
| 1 | ID canonique stable (ITM8 > EAN13 > ref-v2-ITM8) | Haute | Faible | Faible (déjà largement le cas) |
| 2 | Migration PlanningJour : supprimer l'ancienne clé, matcher par itm8+libellé normalisé | Haute | Faible | Faible |
| 3 | Dédoublonnage MANAGER des libellés identiques sous EAN différents | Haute | Moyenne | Moyen (logique métier à arbitrer avec Rudy) |
| 4 | Garde-fou `undefined` + bump schemaVersion EQUIPE à `3.0` | Moyenne | Faible | Faible |
| 5 | Validation d'écriture + log des migrations non-résolues | Moyenne | Faible | Nul |
| 6 | Tests de non-régression MONTEVRAIN | Basse | Faible | Nul |

---

## 7. Questions à valider avec Rudy avant la phase 2

1. **ITM8 comme clé canonique** : confirmer que c'est OK même pour les produits qui n'ont pas d'ITM8 (balance, codes magasin). Dans ce cas, fallback EAN13 → fallback ref-v2 → fallback `hash(libellé|plu|famille)` ?
2. **Cas DOONYS** : en S17, le MANAGER contient légitimement 2 lignes pour le même libellé (2 EAN référencés Mercalys pour le même produit physique). Dans ce cas la correction côté MANAGER suffit-elle, ou faut-il aussi fusionner au vol côté EQUIPE lors de l'affichage ?
3. **Bump `schemaVersion`** : OK pour passer à `"3.0"` sur les fichiers EQUIPE quand le nouveau format d'IDs est déployé ? (Rétrocompat prévue pour lire `"2.0"`.)
4. **Fenêtre de déploiement** : la correction modifie le format d'écriture des fichiers EQUIPE. Faut-il viser un déploiement en fin de semaine (vendredi soir) pour éviter de perturber les magasins en pleine semaine ?

---

## 8. Hypothèses non vérifiables à ce stade

- **Je ne sais pas** si la même logique de migration tourne côté MONTEVRAIN de façon correcte. Il faudrait accéder à leurs fichiers EQUIPE pour confirmer (pas fait dans cet audit).
- **Je ne sais pas** si les `ref-v2-ITM8` (articles-à-créer) persistent d'une semaine à l'autre dans les fichiers EQUIPE réels. Les 4 fichiers CONFOLENS n'en contiennent qu'une seule entrée (`ref-v2-18096119`) — impossible de conclure sur la stabilité.
- **Je ne sais pas** quelle version du code tournait en production chez Aude en S13 vs S15. Le changement de format d'IDs (`index + 1` → EAN13) observé entre MANAGER S14 et S15 coïncide avec l'intervalle précédant le commit `b7cea90` que nous avons poussé aujourd'hui — il est possible qu'un déploiement intermédiaire entre S14 et S15 ait introduit le changement partiel. À confirmer avec l'historique git des déploiements `dist-manager`.

---

**Fin du rapport. Aucune modification de code effectuée. En attente de validation Rudy pour passer en phase 2 (implémentation).**
