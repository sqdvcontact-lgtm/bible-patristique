# Rapport de séance — contrôle v2 et diagnostics d'alignement

**Date** : 24 août 2026
**Périmètre** : dépôt, interface et scripts. Aucun texte biblique, aucun segment et aucun lien biblique n'a été modifié.
**Missions** : `[CONTROL-SYSTEM-V2|phase-3]` et `[AELF-ALIGNMENT-TOOLS|integration]`.

---

## 1. Commits

| Commit | Objet |
|---|---|
| `f671f802` | `/admin/controle` lit `controle_v2_admin_snapshot()` ; les statistiques historiques passent sur `/admin/controle/statistiques` |
| `4e4ad85b` | Charte du dépôt : centre de contrôle v2, worktree du pipeline, pièges du contrat |
| `8e97002e` | Les totaux d'alignement se comptent sur les runs courants ; les propriétaires ambigus se groupent par missions |
| `b212a867` | Reprise sur dépassement du délai : le contrat frôle ses huit secondes |
| `1bc128be` | Le verdict de routage se lit d'un mot ; rapport de séance |
| `e1f9e5d3` | Refonte de la présentation : volet à gauche, colonne unique, trois rangs de tuiles |

Tous poussés sur `master`. Le déploiement de production suit `master`.

## 2. Fichiers

| Fichier | État |
|---|---|
| `app/admin/controle/page.tsx` | réécrit : vue du système de contrôle v2 |
| `app/admin/controle/snapshotV2.ts` | nouveau : types du contrat et fonctions pures de lecture |
| `app/admin/controle/snapshotV2.test.ts` | nouveau : 22 tests |
| `app/admin/controle/stylesControle.ts` | nouveau : habillage commun aux deux écrans |
| `app/admin/controle/statistiques/page.tsx` | nouveau : l'ancien tableau de bord, cartes, notes et tâches intactes |
| `AGENTS.md` | deux sections ajoutées |

Côté base, hors dépôt : `parametres.charte_ia` reçoit les sections 30.2 et 30.3, et la phrase des sources techniques de la section 30 nomme les deux fonctions. Les deux todos de mission de `controle_sections` sont actualisés. Sauvegardes préalables dans `internal.backup_charte_ia_20260824_claude` et `internal.backup_controle_sections_20260824_claude`.

## 3. Tests

- Suite complète : **69 fichiers, 730 tests, tout vert**.
- Types : `tsc --noEmit` propre, à l'exception des cinq erreurs préexistantes d'`app/quiz/holyGuessrMoteur.ts`, qui tiennent à `pixi.js` non déclaré et n'appartiennent pas à ce chantier.
- ⚠️ La CI a échoué sur `f671f802` et `4e4ad85b` : une constante de test non annotée faisait diverger l'inférence de `Record<string, number>`. Corrigé dans `8e97002e`.

## 4. Ce que montre l'écran principal

Un seul appel, `controle_v2_admin_snapshot()`. L'écran donne l'état général, les quatre compteurs de sévérité du dernier run global, les cinq certifications avec leur état `dirty`, la file des postcontrôles et sa répartition par mission propriétaire, les objets à propriétaire ambigu, l'état des diagnostics d'alignement avec leur fraîcheur et la mémoire des revues, la spine AELF, les liens bibliques, enfin les gardes et les règles. Les statistiques du corpus sont à un lien de là.

**Piège relevé, et il compte pour la suite** : dans ce contrat, `metrics` vient du cache `internal.controle_v2_metrics_cache`, tandis que `live_guard`, `certifications`, `link_review_queue`, `postcheck_owners`, `routing_ambiguities` et `alignment_diagnostics` sont calculés à l'appel. Une heure après le rerun, le même appel annonçait quatre runs frais et 179 dossiers d'un côté, quatre runs périmés et 180 dossiers de l'autre. Les totaux d'alignement se refont donc depuis les runs courants, et ce qui reste tiré du cache porte la mention de son âge.

## 5. Rerun des quatre livres

Pipeline du dépôt, sans recalibrage : `bible-alignment-audit-v1.4.2`, modèle `v1.4.2`, seuils HIGH 68 et MEDIUM 42, logiques `canonical-residual-boundary-v1.4` et `canonical-witness-support-v1.4.2` inchangées. Exécuté depuis le worktree `agent/bible-alignment-audit`, arbre propre.

| Livre | Nouveau run | Dossiers | high | medium | low | Fraîcheur |
|---|---|---:|---:|---:|---:|---|
| ACT | `13e90b70-4fb0-43c0-b898-761e0cdf9333` | 5 | 0 | 0 | 5 | fresh |
| GEN | `89c27991-958e-45c1-b74e-8837b9bfef36` | 9 | 0 | 1 | 8 | fresh |
| LUK | `5d89afbf-a8dc-4b5c-8c89-c2f7fbdbe463` | 39 | 3 | 29 | 7 | fresh |
| JHN | `5b731f07-baef-462b-bde3-1226d958a711` | 126 | 10 | 62 | 54 | fresh |
| **Total** | | **179** | **13** | **92** | **74** | |

État antérieur : 180 dossiers, 14 high, 94 medium, 72 low, quatre runs `legacy_no_fingerprint`.

**Empreintes** : les triggers ont capturé l'empreinte de chaque nouveau run. Pour les quatre, `captured_fingerprint` égale `current_fingerprint` et `current_fingerprint_dirty` vaut faux. `live_guard.stale_alignment_runs` vaut **0** en direct.

**Incident d'exécution** : la première tentative sur JHN a échoué sur un dépassement du `statement_timeout` de huit secondes en lisant `v_bible899_verse_recomposed`. Rien n'est écrit avant la fin de la détection, la reprise a donc été sûre et a abouti au second essai. Les trois autres livres sont passés du premier coup.

### 5.1 Comparaison, ancien run contre nouveau

Clé de rapprochement : `segmentKey` et type diagnostique.

| Livre | Ajoutés | Disparus | Priorité changée | Inchangés |
|---|---:|---:|---:|---:|
| ACT | 0 | 1 | 0 | 5 |
| GEN | 1 | 0 | 0 | 8 |
| JHN | 1 | 2 | 1 | 124 |
| LUK | 0 | 0 | 1 | 38 |

Les sept mouvements, en détail :

| Livre | Mouvement | Segment | Type | Avant | Après |
|---|---|---|---|---|---|
| ACT | disparu | ACT.23.25 | EMBEDDED_EXTRA_CANDIDATE | medium | — |
| GEN | ajouté | GEN.41.48 | LOW_CONFIDENCE | — | low |
| JHN | ajouté | JHN.12.24 | EMBEDDED_EXTRA_CANDIDATE | — | medium |
| JHN | disparu | JHN.1.27 | EMBEDDED_EXTRA_CANDIDATE | medium | — |
| JHN | disparu | JHN.8.3 | EMBEDDED_EXTRA_CANDIDATE | medium | — |
| JHN | priorité | JHN.14.10 | EMBEDDED_EXTRA_CANDIDATE | medium | low |
| LUK | priorité | LUK.2.7 | EMBEDDED_EXTRA_CANDIDATE | high | medium |

### 5.2 Mémoire des revues humaines

Rien n'a été modifié ni supprimé. La table compte 21 revues, dont aucune créée aujourd'hui.

| Livre | Décisions retrouvées | Portées depuis un run antérieur |
|---|---|---:|
| ACT | aucune | 0 |
| GEN | aucune | 0 |
| JHN | 10 CONFIRMED | 10 |
| LUK | 4 CONFIRMED | 4 |

Quatorze dossiers courants retrouvent ainsi une décision humaine, contre quinze avant le rerun. Elles sont affichées comme contexte et ne sont appliquées à aucun résultat.

## 6. Points qui demandent une décision

1. **ACT 23,25.** Le dossier a disparu du nouveau run, et la décision `REJECTED` qui le concernait ne trouve donc plus de cas équivalent. Elle reste en base, rattachée à son run d'origine. Faut-il la consigner autrement, ou la laisser telle quelle ?
2. **LUK 2,7 passe de high à medium**, alors qu'une revue `CONFIRMED` porte sur ce cas. Le dossier reste ouvert à un rang moindre.
3. **JHN change de modèle en même temps que de données** : son run remplacé était en `v1.4.0`, le nouveau est en `v1.4.2`. Ses quatre mouvements mêlent donc les deux causes. ACT, GEN et LUK étaient déjà en `v1.4.2`, leurs écarts ne tiennent qu'aux données.
4. **Les 179 dossiers restent entiers à arbitrer.** Aucune correction philologique n'a été proposée ni appliquée.
5. **Propriétaires ambigus** : ils étaient 2 au début de la séance et 226 à la fin, répartis sur trois conflits de missions, dont `A0012O0002` avec trois missions candidates et `A0014O0038` avec deux. Aucune attribution n'a été décidée.
6. **Mutations observées pendant la séance, hors de ce chantier** : `internal.controle_v2_mutations_audit` enregistre 326 écritures sur `segments` entre 07:26 et 07:39 UTC, dont 317 sans `check_id`, par le rôle `postgres` via `mgmt-api`. La file grossit d’heure en heure : 349 postcontrôles et 1 411 liens dépendants à 06:39, 577 et 1 943 à 08:12, 3 500 et 9 916 à 08:17. Ce n'est pas le fait de cette séance, dont les seules écritures ont porté sur `internal.bible_alignment_audit_*`, `public.controle_sections` et `public.parametres`.

## 7. Point urgent pour le backend : le contrat frôle son délai

La page est tombée en **57014** sous les yeux, quelques minutes après avoir été servie normalement. Mesure prise dans la foulée :

```
explain (analyze) select public.controle_v2_admin_snapshot();
Execution Time: 7555.202 ms
```

Pour un `statement_timeout` de **8 s** sur `service_role`. La marge est de moins d'une demi-seconde, et elle disparaît dès que la base travaille par ailleurs.

Ce que la mesure écarte : les quatre vues internes lues par la fonction ne sont pas le goulot, prises isolément. `v_controle_v2_mutations_routage_effectif` et `v_controle_v2_postchecks_ouverts` rendent 3 500 lignes chacune en **400 ms**, `v_controle_v2_alignment_state` et `v_controle_v2_dernier_run` sont instantanées, et compter `liens_bibliques` coûte 7 ms. Le coût vient donc de leur combinaison, et il a grossi avec la file : 226 objets ambigus contre 2 le matin même, 577 postcontrôles contre 349.

Côté page, la reprise que l'ancien tableau de bord portait déjà est rétablie, deux essais espacés d'une seconde et demie, et sur le seul code 57014. C'est un pansement : il rattrape un dépassement transitoire, il ne rattrapera pas une fonction qui passe durablement les huit secondes. **La suite relève du backend** : matérialiser la part la plus lourde, comme l'a été `oeuvres_controle_stats_mat`, ou sortir les ambiguïtés du contrat compact vers un appel à la demande.

---

## 8. Le contrat a franchi son délai, et la cause est trouvée

En fin de séance la page est devenue **inaccessible** : `controle_v2_admin_snapshot()` est passée à **8 696 ms** pour un `statement_timeout` de 8 s, et les trois essais de la page échouaient tous.

**La cause.** À elle seule, `internal.v_controle_v2_mutations_routage_effectif` coûtait **3 106 ms**, et le contrat l'interrogeait **deux fois** : une fois pour `live_guard.ambiguous_owner_objects_with_links`, une fois pour `routing_ambiguities`. `internal.v_controle_v2_postchecks_ouverts` était de même lue deux fois, pour le décompte de la file puis pour sa répartition par mission.

**Ce que dit le plan de la vue de routage**, et c'est le fond de l'affaire :

```
Nested Loop Left Join
  Join Filter: (todo->>'texte') LIKE ('%' || id_oeuvre || '%')
  Rows Removed by Join Filter: 133 827
  ->  Seq Scan on controle_sections  (loops=3811)
```

Le routage d'une mutation vers sa mission propriétaire se décide **en cherchant l'identifiant de l'œuvre dans la prose des tâches du centre de contrôle**. Son coût est donc le produit des mutations ouvertes par les tâches actives, soit 3 811 × 37 comparaisons de chaînes.

⚠️ **Et 37 est anormal.** La charte, section 30.1, prescrit une seule tâche active par section, soit neuf au plus. Il y en a **24 dans « Qualité du texte » et 13 dans « Corpus »**. La même cause explique la montée des ambiguïtés : trois tâches actives nomment `A0012O0002`, donc chacun de ses segments se retrouve avec trois missions candidates.

**Ce qui a été fait**, faute de pouvoir laisser l'écran mort : les deux vues ne sont plus interrogées qu'une fois chacune, par deux CTE `as materialized`. Aucune règle n'a changé, et le résultat a été vérifié clé par clé contre l'ancienne fonction, sur un instantané des deux : les seize clés sont identiques hors `generated_at` et `cache_age_seconds`. La définition précédente est sauvegardée dans `internal.backup_controle_v2_admin_snapshot_20260824`.

Mesures après correction : **6 354 ms** en exécution directe, et **5,8 s** par PostgREST, trois appels de suite, pour 263 Ko de réponse. La page est de nouveau servie.

**Ce qui reste à décider, et qui revient au backend.** La marge est de deux secondes, et la file grossit d'heure en heure : le dépassement reviendra. Deux voies, qui se cumulent.

1. **Clore les tâches actives surnuméraires** pour revenir à la règle d'une par section. Le facteur multiplicatif tomberait de 37 à 9, et le coût du routage avec lui. Ce sont des missions dont je ne suis pas propriétaire, rien n'a été touché.
2. **Ne plus fonder le routage sur une recherche de sous-chaîne dans du texte rédigé.** Une mission devrait désigner ses objets par un identifiant, non par la mention de leur œuvre dans une phrase. C'est aussi ce qui fabrique les ambiguïtés : deux tâches qui parlent de la même œuvre revendiquent mécaniquement tous ses segments.
