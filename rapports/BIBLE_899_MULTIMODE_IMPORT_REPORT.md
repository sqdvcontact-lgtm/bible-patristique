# BIBLE 899 — Rapport de préparation de l’intégration multimode

Date du contrôle : 7 août 2026

Branche isolée : `codex/bible899-multimode`

Commit de base : `e430fb419462a107c0720bd5c3879c20b84bbe70`

## Décision d’exécution

**Migration appliquée au Supabase distant : NON – arrêt volontaire avant écriture distante pour contrôle extérieur.**

**Import TR0009 dans le Supabase distant : NON – arrêt volontaire avant écriture distante pour contrôle extérieur.**

Aucun déploiement n’a été effectué. Aucune ligne n’a été écrite dans `public.versets_v2`, `public.bible_canonical_alignments`, `public.traductions` ou une autre table distante. Les seules opérations Supabase ont été des lectures de contrôle.

## État source et contrôles préalables

- TEI actif `2.0-phase1-foliation` : SHA-256 `b081a252ea3a705a4575c790a8a01a22267d6c83be65a9be76bdad329d6a3ec3`.
- Manifeste actif : SHA-256 `aec437d1bbeecda804f5da3545dc5bd0c9694cc87eee9a590ee37c8a7e21c192`.
- Charte IA relue intégralement : 104 239 caractères, SHA-256 UTF-8 `5dc43920c397df5406d5d8555e3a21fac15b0b2b50060f73b25be29c6fe5f214`.
- État distant reconfirmé en lecture seule immédiatement avant la préparation : TR0009 existe, contient 0 ligne dans `versets_v2`, TR0001–TR0005 existent, et aucun objet `bible_*` ou `v_bible_*` concurrent n’existe.
- `public.versets_canon` contient 35 560 lignes. Sa compatibilité exacte avec une ossature AELF versionnée n’est pas démontrée ; voir `AELF_CANONICAL_SPINE_AUDIT.md`.

## Migration préparée

La migration additive `sql/20260807_bible_multimode_model.sql` crée les 11 tables suivantes :

1. `bible_text_sources`
2. `bible_source_units`
3. `bible_text_layers`
4. `bible_source_unit_texts`
5. `bible_native_divisions`
6. `bible_editorial_segmentations`
7. `bible_editorial_segments`
8. `bible_editorial_segment_sources`
9. `bible_canonical_alignments`
10. `bible_provenance_records`
11. `bible_provenance_links`

Elle crée également trois vues `security_invoker` :

- `v_bible_source_unit_texts`
- `v_bible_reading_capabilities`
- `v_bible_canonical_lookup`

RLS est activé sur les 11 tables. Les droits de `PUBLIC`, `anon` et `authenticated` sont révoqués avant l’octroi explicite des seuls droits de lecture nécessaires. Aucune fonction `SECURITY DEFINER` n’est créée. Les clés étrangères disposent des index nécessaires. Le schéma est générique : aucune contrainte ni policy ne contient l’identifiant TR0009.

La migration et son script de vérification ont été appliqués avec succès dans PostgreSQL local PGlite. Un témoin fictif confirme : publication atomique, trois modes disponibles, RLS lisible en anonyme mais non inscriptible, et rollback intégral lorsque le dernier garde-fou échoue.

## Import local complet

Le pipeline construit un import transactionnel unique, à blanc par défaut et protégé par une double autorisation explicite pour un éventuel futur `--apply`. L’import complet a été exécuté uniquement dans PGlite local.

| Table ou ensemble | Lignes locales |
|---|---:|
| `bible_text_sources` | 1 |
| `bible_source_units` | 58 314 |
| `bible_text_layers` | 2 |
| `bible_source_unit_texts` | 116 628 |
| `bible_native_divisions` | 696 |
| dont livres | 24 |
| dont chapitres | 672 |
| `bible_provenance_records` | 1 493 |
| `bible_provenance_links` | 59 090 |
| images principales représentées | 1 484 |
| images alternatives représentées | 4 |
| `versets_v2` écrits | 0 |
| `bible_canonical_alignments` écrits | 0 |
| couches `modernized` importées | 0 |

Les deux couches comportent chacune exactement 58 314 textes. Les modes calculés depuis les données sont exclusivement `diplomatic`, `expanded` et `native`. `paragraph`, `verse` et `modernized` restent indisponibles.

### Nuance du comptage `unclear`

Le TEI contient 662 éléments `unclear`, mais 661 unités de ligne en portent. Le 662e élément est la réclame `f16v_b_catchword` (`les oeilles ua`), conservée dans les métadonnées et la provenance sans créer une fausse unité de ligne. Le modèle importe donc correctement 661 lignes marquées `unclear`, 662 éléments sémantiques au total, et 8 unités avec `gap`.

### Foliotation et images

- 58 314 unités dans l’ordre matériel continu.
- Aucun folio natif 296.
- Succession native 295v → 297r conservée.
- Dernière cote native : 372v.
- 1 484 images `PRIMARY` et 4 images `ALTERNATIVE`.
- Une image alternative ne crée aucune surface textuelle supplémentaire.
- `f372r_a.png` et `f372r_b.png`, dépourvues de surface correspondante, restent rattachées à la source ; les deux alternatives terminales utiles sont reliées aux unités correspondantes.

### Recomposition

Les 58 314 lignes ont été relues depuis la base locale et recomposées dans les deux couches :

| Couche | SHA-256 avec séparateurs de ligne | SHA-256 continu |
|---|---|---|
| diplomatique | `a7147e9144d71c32ff16c89a6dd1ec68dab816256250c53fcf6151e0de2fcd2b` | `ecbebcc3aab1adf840195df773d7fe3747f3f556ad8fb3c2d2470d16d2953b31` |
| développée | `37cdba54b6be2d364536e31aca4cab64689430e7227ac55eb09b106b4cf2a751` | `a86e08c240a5eb626016a08f3baaff827743caeaa23f5b8a60488cb16667635f` |

Ces empreintes correspondent exactement aux sorties produites directement depuis le TEI selon la définition figée du parseur.

## Page Bible et compatibilité

Le catalogue interroge désormais `v_bible_reading_capabilities` de façon générique. Il ne contient pas de branche spéciale `if TR0009`. Pour une source multimode, le lecteur propose les modes effectivement publiés et mémorise localement la préférence de l’utilisateur.

Le nouveau lecteur source affiche :

- le diplomatique ;
- les abréviations développées ;
- la structure native avec livres et chapitres ;
- les numéros natifs uniquement lorsqu’ils existent ;
- un accès au fac-similé et à la colonne correspondante.

La transition 295v → 297r est naturelle. Aucun 296 n’est fabriqué. Les modes indisponibles ne sont pas affichés. La couche `legacy-unverified` n’est pas publiée.

TR0001–TR0005 restent découverts par le chemin historique `versets_lecture` et conservent la lecture livre/chapitre/verset. Le garde-fou Giguet/TR0009 reste actif dans les onze scripts concernés.

## Audit de l’ossature canonique AELF

L’ossature actuelle de `versets_canon` n’est pas démontrée exactement compatible avec l’AELF. Elle provient historiquement d’une source Crampon/TR0003 puis de corrections ponctuelles ; aucun instantané structurel AELF complet, versionné et reproductible n’a été trouvé. En conséquence, aucune proposition d’alignement TR0009 n’a été importée. La prochaine étape canonique doit d’abord établir et auditer une ossature AELF de référence sans réécrire la structure native du manuscrit.

## Validations exécutées

- Migration SQL locale et contrôles de schéma : **réussis**.
- RLS et témoin fictif : **réussis**.
- Import local complet atomique : **réussi**.
- Contrôles de cardinalité, provenance, images, foliotage et recomposition : **réussis**.
- Tests ciblés multimode/Bible/Giguet : **44/44 réussis** lors du contrôle final ; les suites spécialisées du pipeline totalisent également 9/9.
- TypeScript `--noEmit` : **réussi**.
- Lint ciblé : **réussi, 0 diagnostic**.
- Build Next.js de production (`--webpack`) : **réussi**, 84 pages générées.
- Suite Vitest globale : **155/156 réussis**. L’unique échec, `historicalDates.integration.test.ts`, est extérieur à ce chantier : il recherche encore dans `app/histoire/page.tsx` un composant désormais rendu dans `HistoireClient`. Aucune modification opportuniste n’a été apportée à ce domaine.
- Vérification Git `diff --check` : **réussie** ; seuls des avertissements de conversion LF/CRLF propres à Windows sont émis.

## Sauvegardes et isolation

Le travail est isolé du worktree principal dans `C:\Corpus Scriptura\bible-patristique-multimode`, branche `codex/bible899-multimode`. Le worktree principal `confort-lecture` n’a pas été modifié par ce chantier après isolation. Aucun fichier `.env`, secret, cache, dépendance ou image binaire régénérable n’est inclus dans le commit ou le paquet de contrôle.

## Anomalies et réserves avant écriture distante

1. Le SQL atomique complet représente 57 459 581 octets, SHA-256 `884ab74a18255dc243c5961a85f70acc213431d5a321b0310ff19aac605a9efc`. Il est valide localement, mais la capacité du transport RPC distant à accepter une charge de 57,5 Mo n’a pas été testée dans la portée autorisée. Cette limite doit être validée ou le transport doit être découpé tout en conservant une transaction serveur unique.
2. `traductions.schema_numerotation` reste historiquement renseigné `vulgate` pour TR0009. Son obsolescence est documentée et aucune correction distante n’a été faite.
3. La mise à jour exacte de `statut_corpus_public` est préparée dans la transaction mais non appliquée.
4. L’audit AELF reste une dette préalable à tout alignement canonique.
5. L’échec isolé du test historique de dates doit être corrigé dans son propre chantier ou rebasé sur la version qui déplace le rendu vers `HistoireClient`.

## Conclusion et prochaine étape recommandée

Le modèle 11 tables + 3 vues, le pipeline TR0009 et le lecteur à trois modes sont validés localement sur le jeu complet. Ils conservent les 58 314 lignes, les deux couches exactes, les 696 divisions natives, la foliotation native et la provenance des 1 488 images sans création de versets ni publication de modernisation.

Avant toute autorisation distante :

1. faire relire la migration, les policies RLS et le présent paquet ;
2. décider d’un transport distant sûr pour les 57,5 Mo tout en garantissant l’atomicité ;
3. refaire les trois gardes Phase 0 immédiatement avant application ;
4. sauvegarder le schéma pertinent ;
5. appliquer la migration puis l’import dans deux étapes explicitement autorisées ;
6. relire les données depuis Supabase et seulement ensuite activer le branchement en production.

La tâche s’arrête ici, avant migration distante, import distant, déploiement et alignement AELF.
