-- Les tables `backup_*` du schéma `public` étaient exposées par l'API REST : la RLS
-- y était désactivée et le rôle `authenticated` y détenait SELECT/INSERT/UPDATE/DELETE.
-- Tout titulaire de compte pouvait donc les lire et les vider sans passer par le site.
-- Le schéma `internal` n'est pas utilisable par `anon` ni `authenticated` : les y
-- déplacer suffit à fermer la porte, sans rien perdre.
do $$
declare t record;
begin
  for t in
    select c.relname
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relname like 'backup%'
    order by c.relname
  loop
    execute format('alter table public.%I set schema internal', t.relname);
  end loop;
end $$;
