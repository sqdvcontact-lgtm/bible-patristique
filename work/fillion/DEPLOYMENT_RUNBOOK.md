# Déploiement du socle Fillion

État au 20 août 2026 : code déployé sur `master`, deux seaux créés, migration additive appliquée, famille TR0011/TR0010 amorcée en brouillon et pilote privé Marc I, 1-20 importé en revue. Aucune ligne Fillion n’est exposée au catalogue public.

## Ordre impératif

### 1. Déployer le code tolérant

Déployer d’abord le code applicatif. Tant que les vues Fillion n’existent pas, `bibleEditionServer.ts` reconnaît l’absence de relation et rend un apparat vide ; la page Bible actuelle continue donc de fonctionner.

Contrôles avant promotion :

```powershell
npm test
npx tsc --noEmit
npm run build
```

### 2. Créer les deux seaux Storage

- `bible-illustrations-master` : privé ;
- `bible-illustrations-web` : public.

Les téléversements sont effectués exclusivement par un script serveur muni de la clé de service, jamais depuis le navigateur. Aucune politique d’écriture cliente n’est nécessaire. La clé de service ne doit apparaître ni dans le bundle, ni dans les journaux, ni dans les manifestes.

Le seau web sert les WebP déjà préparés. Le chantier ne dépend pas des transformations dynamiques Supabase, disponibles seulement sur les forfaits compatibles ; une transformation responsive ultérieure reste une optimisation, non une source d’autorité.

Documentation de référence : [contrôle d’accès Storage](https://supabase.com/docs/guides/storage/security/access-control), [service des fichiers](https://supabase.com/docs/guides/storage/serving/downloads), [transformations d’images](https://supabase.com/docs/guides/storage/serving/image-transformations).

### 3. Appliquer la migration additive

Migration : `supabase/migrations/20260820093045_bible_fillion_editorial_model.sql`.

L’essai transactionnel a réussi avant l’application réelle :

```powershell
node scripts/fillion/dry-run-editorial-migration.mjs
```

Après application, `sql/tests/20260820_bible_fillion_editorial_model_verification.sql` a été exécuté et le rechargement du cache PostgREST vérifié. Les nouvelles tables publiques ont RLS ; `anon` et `authenticated` n’obtiennent que `SELECT`. Les écritures restent réservées à `service_role`.

### 3 bis. Régulariser le journal, puis appliquer le sous-type de notice

Deux opérations restent à faire dans cet ordre.

**Inscrire la migration du socle au journal.** Le schéma est en place, mais `supabase_migrations.schema_migrations` ne porte pas la version `20260820093045` : elle a été appliquée par `exec_sql`. Or le fichier enchaîne seize `create table` sans `if not exists` ; un `supabase db push` la rejouerait et échouerait sur la première table déjà présente. L'inscription ne touche pas le schéma, elle rétablit seulement la concordance entre le dépôt et la base :

```sql
insert into supabase_migrations.schema_migrations (version, name)
values ('20260820093045', 'bible_fillion_editorial_model')
on conflict (version) do nothing;
```

**Appliquer le sous-type de notice.** Migration `supabase/migrations/20260820150500_bible_editorial_notice_subtype.sql` : une colonne facultative `notice_subtype`, deux contraintes de cohérence, et la vue `v_bible_editorial_body_blocks` reconstruite parce qu'elle développait `b.*`. L'essai transactionnel a réussi et a été annulé :

```powershell
node scripts/fillion/dry-run-migration.mjs supabase/migrations/20260820150500_bible_editorial_notice_subtype.sql sql/tests/20260820_bible_editorial_notice_subtype_verification.sql
```

Le code lisant la vue par `select('*')`, il tolère l'absence comme la présence de la colonne : l'ordre entre son déploiement et cette migration est libre. La vue est brièvement supprimée puis recréée dans la même transaction ; aucune lecture publique n'en dépend aujourd'hui, la famille Fillion étant en brouillon.

### 4. Créer les objets Fillion en brouillon

`work/fillion/bootstrap_draft.sql` a réservé `TR0010` pour le français de Fillion et `TR0011` pour la Vulgate effectivement imprimée dans ses volumes, puis créé leur famille et les huit composants bibliographiques. Ne jamais réutiliser `TR0004`.

L’amorçage est volontairement non idempotent : il s’interrompt si l’un des deux identifiants ou la famille existe déjà. Les deux fiches gardent `schema_numerotation = NULL` et ne reçoivent aucune capacité de lecture ; elles demeurent donc absentes des catalogues bibliques tant que le corpus n’est pas prêt. Tous les objets créés portent le statut de brouillon.

### 5. Téléverser les dérivés et importer leurs métadonnées

Pour chaque actif :

1. valider le manifeste local ;
2. comparer l’empreinte avec un éventuel objet déjà présent ;
3. téléverser `master.png` dans le seau privé et inscrire sa ligne de fichier en `review` ;
4. conserver `web.webp` localement tant que sa validation visuelle n’est pas acquise, puisque le seau web est public ;
5. relire la ligne et le master depuis leurs API respectives, puis comparer les SHA-256 ;
6. après validation seulement, téléverser `web.webp` dans le seau public et inscrire sa ligne en `validated`, `is_public = true` avec son URI publique ;
7. publier ensuite l’actif parent, la garde SQL refusant l’opération sans WebP public validé.

Éviter l’`upsert` aveugle. Si un remplacement explicite devient nécessaire, Supabase exige les droits `INSERT`, `SELECT` et `UPDATE` sur `storage.objects`; le script serveur doit d’abord comparer les SHA-256.

### 6. Publier seulement après le pilote bilingue

Le pilote privé `work/fillion/marc1_pilot_draft.sql` contient vingt versets dans chaque langue, six blocs de corps, une note de verset ancrée sur les deux membres et l’illustration du Jourdain après I, 9. `sql/tests/20260820_fillion_marc1_pilot_verification.sql` contrôle ses invariants.

Le passage à `published` intervient seulement après contrôle de Marc 1 sur ordinateur et mobile : **français à gauche, latin à droite**, comme la page imprimée, et dans cet ordre sur mobile ; blocs communs pleine largeur ; notes et illustrations à leur emplacement logique.

L'ordre des colonnes est une DONNÉE, non du code : il se règle par `display_order`, `desktop_position` et `mobile_order` sur `bible_edition_members`, et le rendu ne fait qu'honorer ce que l'édition déclare. Les deux contraintes d'unicité obligent à passer par des rangs temporaires pour échanger deux membres.

## Retour arrière

Avant publication, le retour fonctionnel consiste à laisser la famille, ses membres et ses contenus en brouillon. Le code reste compatible avec l’absence du modèle. Une suppression du schéma n’est pas une opération courante : la migration est additive et les contenus doivent d’abord être exportés et hachés si un retrait exceptionnel était décidé.
