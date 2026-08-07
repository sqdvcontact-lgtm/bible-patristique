# BIBLE 899 — Rapport de migration distante et d’import caché multimode

Date du contrôle : 7 août 2026  
Projet Supabase : `oucotpxcjalwgetylfbz`  
État final : **migration réussie, TR0009 importé intégralement mais non publié**

## Gardes préalables

- La charte `public.parametres.charte_ia` a été relue intégralement avant toute écriture.
- SHA-256 du TEI source : `b081a252ea3a705a4575c790a8a01a22267d6c83be65a9be76bdad329d6a3ec3`.
- SHA-256 du manifeste source : `aec437d1bbeecda804f5da3545dc5bd0c9694cc87eee9a590ee37c8a7e21c192`.
- `TR0009` existait dans `public.traductions`, avec 0 ligne dans `public.versets_v2`.
- Aucun objet `bible_*` concurrent n’existait avant la migration.
- Une sauvegarde locale datée de la fiche TR0009, des objets concernés, des comptages historiques et des gardes locales a été créée avant la migration.

## Migration distante

La migration additive `sql/20260807_bible_multimode_model.sql` (SHA-256 `5f10d83ae95c3d30d97aa87e3d8f3c57e79b1ea997aeb02b52faed73f780b236`) a été appliquée au moyen du mécanisme officiel de migration Supabase. La fonction `public.exec_sql(text)` et son délai de 8 secondes n’ont pas été modifiés ni utilisés pour l’import massif.

Objets créés :

- 11 tables `bible_*` demandées ;
- 3 vues `v_bible_*`, toutes `security_invoker` ;
- 26 clés étrangères ;
- 73 index.

La RLS est activée sur les 11 tables. Les rôles `anon` et `authenticated` n’ont aucun droit d’écriture. Le rôle `service_role` possède les droits nécessaires. Aucune fonction `SECURITY DEFINER` n’a été ajoutée et aucune règle du schéma n’est codée en dur pour TR0009.

Les tables de provenance n’exposent volontairement aucune policy de lecture cliente et aucun grant à `anon` ou `authenticated`. Le conseiller Supabase signale donc deux informations `rls_enabled_no_policy`; elles correspondent à cette fermeture volontaire et ne constituent pas une exposition.

## Import distant par lots

L’importeur réel utilise le mode `staged_resumable_remote_import`. Il applique des identifiants déterministes, des lots bornés et idempotents, une vérification exacte après chaque lot, ainsi qu’un fichier local de progression lié à l’empreinte du dataset.

- Empreinte du dataset : `fa8e535408624f3b00e35ecbed25e927f981ada6cf54451224fc28b37d339d0d`.
- Identifiant déterministe de la source : `34794222-3e7c-5d44-b353-a2e2714f4681`.
- Lots distants validés : **1 390**.
- Progression finale : complète.

Deux reprises contrôlées ont eu lieu :

1. Windows a temporairement refusé le renommage atomique du fichier de progression (`EPERM`) pendant une lecture concurrente. Un retry borné du renommage a été ajouté. Le lot éventuellement renvoyé a été contrôlé par l’upsert déterministe et la relecture exacte, sans doublon.
2. Le premier contrôle final filtrait par erreur la table source sur `source_id` au lieu de `id`. Cette erreur de validation, sans effet sur les données, a été corrigée. Les règles de recomposition ont ensuite été alignées exactement sur celles du parseur officiel.

Chaque reprise a revalidé le préfixe déjà chargé avant de poursuivre. Aucune divergence distante n’a été acceptée.

## Cardinalités distantes finales

| Objet | Cardinalité |
|---|---:|
| `bible_text_sources` | 1 |
| `bible_source_units` | 58 314 |
| `bible_text_layers` | 2 |
| `bible_source_unit_texts` | 116 628 |
| `bible_native_divisions` | 696 (24 livres, 672 chapitres) |
| `bible_provenance_records` | 1 493 |
| `bible_provenance_links` | 59 090 |
| images principales | 1 484 |
| images alternatives | 4 |
| `bible_canonical_alignments` pour TR0009 | 0 |
| `versets_v2` pour TR0009 | 0 |
| couche `modernized` | 0 |

Contrôles sémantiques : 58 314 unités ordonnées, 12 256 `break_no`, 661 lignes portant `has_unclear`, 662 éléments `unclear` dans le TEI avec la réclame, et 8 unités avec `gap`. Aucun folio natif 296 n’existe ; la séquence matérielle passe de 295 à 297 et se termine à la cote native 372v. Aucune unité, division ou image alternative orpheline n’a été trouvée.

## Recompositions relues depuis Supabase

| Couche | Forme | SHA-256 |
|---|---|---|
| diplomatique | lignes séparées | `a7147e9144d71c32ff16c89a6dd1ec68dab816256250c53fcf6151e0de2fcd2b` |
| diplomatique | continu | `ecbebcc3aab1adf840195df773d7fe3747f3f556ad8fb3c2d2470d16d2953b31` |
| développée | lignes séparées | `37cdba54b6be2d364536e31aca4cab64689430e7227ac55eb09b106b4cf2a751` |
| développée | continu | `a86e08c240a5eb626016a08f3baaff827743caeaa23f5b8a60488cb16667635f` |

Les quatre empreintes correspondent exactement au mandat.

## État de publication et sécurité

- Source : `review`.
- Couches publiques : 0.
- Divisions publiques : 0.
- Capacités publiques TR0009 : 0.
- `anon` et `authenticated` voient 0 source, unité, couche, texte, division et capacité TR0009.
- `public.traductions.statut_corpus_public` n’a pas été modifié.

L’import reste donc entièrement caché et ne peut pas être confondu avec un état partiellement publié.

## Compatibilité historique

Les comptages et empreintes de contenu de TR0001 à TR0005 sont identiques avant et après l’opération :

| Traduction | Lignes | SHA-256 de contrôle |
|---|---:|---|
| TR0001 | 36 290 | `a8b62fd601b879f7676f536de010238548a1be4a8c7e3062974a2fadb6a1087d` |
| TR0002 | 31 189 | `3b46074f5b83f701b4e3fd2ed808cf8aa04cdcdfc8136c783b932145a5ae292c` |
| TR0003 | 35 594 | `78cc35a9ec49dcb80a5d99857fe9f9942894c5fcc8a748e259713e5284e859da` |
| TR0004 | 36 004 | `06bd0020174513a5f585295fd94aa6cdbc91c1bb10ad40eda6b9c5440d02d4d8` |
| TR0005 | 26 728 | `808fc775af3305a9fa34df998f7a15d4171cda6a264898f03aaf3520feb095ba` |

Des échantillons répartis de `versets_lecture` sont également restés identiques. Aucun objet historique n’a été réécrit.

## Validations locales

- Tests ciblés : 47/47 réussis.
- Tests de l’importeur distant : 3/3 réussis.
- Lint ciblé : réussi.
- TypeScript (`tsc --noEmit`) : réussi.

## Dettes et arrêt obligatoire

- `public.versets_canon` n’est toujours pas démontré identique à une ossature AELF complète, versionnée et reproductible. Aucun alignement AELF n’a été commencé.
- Les avis d’index inutilisés sont attendus immédiatement après la création du modèle et ne justifient aucune modification précipitée.
- L’interface préparée localement n’a pas été déployée.

La tâche s’arrête ici : **TR0009 est importé à distance, intégralement contrôlé et caché**. La source n’a pas été publiée, aucun verset TR0009 n’a été créé, aucun alignement canonique n’a été ajouté et aucune graphie modernisée n’a été générée.
