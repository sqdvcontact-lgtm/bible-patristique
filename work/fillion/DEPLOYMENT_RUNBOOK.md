# Déploiement du socle Fillion

État au 20 août 2026 : préparation locale terminée ; aucun schéma, seau, traduction ou contenu Fillion n’a été créé dans la base distante.

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

Avant l’application réelle, l’essai transactionnel doit encore réussir :

```powershell
node scripts/fillion/dry-run-editorial-migration.mjs
```

Après application, exécuter `sql/tests/20260820_bible_fillion_editorial_model_verification.sql`, puis vérifier le rechargement du cache PostgREST. Les nouvelles tables publiques ont RLS ; `anon` et `authenticated` n’obtiennent que `SELECT`. Les écritures restent réservées à `service_role`.

### 4. Créer les objets Fillion en brouillon

Exécuter `work/fillion/bootstrap_draft.sql`. Le script réserve `TR0010` pour le français de Fillion et `TR0011` pour la Vulgate effectivement imprimée dans ses volumes, puis crée leur famille et les huit composants bibliographiques. Ne jamais réutiliser `TR0004`.

L’amorçage est volontairement non idempotent : il s’interrompt si l’un des deux identifiants ou la famille existe déjà. Les deux fiches gardent `schema_numerotation = NULL` et ne reçoivent aucune capacité de lecture ; elles demeurent donc absentes des catalogues bibliques tant que le corpus n’est pas prêt. Tous les objets créés portent le statut de brouillon.

### 5. Téléverser les dérivés et importer leurs métadonnées

Pour chaque actif :

1. valider le manifeste local ;
2. comparer l’empreinte avec un éventuel objet déjà présent ;
3. téléverser `master.png` dans le seau privé ;
4. téléverser `web.webp` dans le seau public ;
5. insérer l’actif matériel, puis ses deux lignes de fichier ;
6. relire les lignes et les objets depuis leurs API respectives ;
7. ne passer le WebP à `validated` et `is_public = true` qu’après contrôle ;
8. publier ensuite l’actif parent, la garde SQL refusant l’opération sans WebP public validé.

Éviter l’`upsert` aveugle. Si un remplacement explicite devient nécessaire, Supabase exige les droits `INSERT`, `SELECT` et `UPDATE` sur `storage.objects`; le script serveur doit d’abord comparer les SHA-256.

### 6. Publier seulement après le pilote bilingue

Le passage à `published` intervient après contrôle de Marc 1 sur ordinateur et mobile : texte latin à gauche puis français à droite, ordre inverse interdit ; sur mobile, latin puis français ; blocs communs pleine largeur ; notes et illustrations à leur emplacement logique.

## Retour arrière

Avant publication, le retour fonctionnel consiste à laisser la famille, ses membres et ses contenus en brouillon. Le code reste compatible avec l’absence du modèle. Une suppression du schéma n’est pas une opération courante : la migration est additive et les contenus doivent d’abord être exportés et hachés si un retrait exceptionnel était décidé.
