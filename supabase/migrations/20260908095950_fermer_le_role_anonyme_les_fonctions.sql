-- LE RESTE DE LA PORTE : `revoke … from anon` NE SUFFIT PAS SUR UNE FONCTION.
--
-- ⛔ Le piège, et il est cher. Dans Postgres, `execute` sur une fonction est accordé
-- à `PUBLIC` PAR DÉFAUT, à la création. `PUBLIC` n'est pas un rôle : c'est « tout le
-- monde », et aucun `revoke … from anon` ne l'entame. La migration précédente a donc
-- fermé les tables (elles, n'ont pas ce défaut) et seulement 27 fonctions sur 112 :
-- celles qui portaient un grant nominatif. Les 85 autres restaient joignables en
-- anonyme par `/rest/v1/rpc/`, et le `curl` de contrôle le montrait encore — le
-- texte d'un verset par `bible_reading_cells_for_historical_canons`, le vocabulaire
-- du corpus et ses fréquences par `suggestions_concordance_fr`.
--
-- ⚠️ Un 404 de PostgREST ne prouve rien : son cache de schéma met un moment à suivre
-- un changement de droits, et rend 404 entre-temps. Seul un corps d'erreur explicite
-- (« permission denied for function », code 42501) atteste la fermeture. La première
-- vérification s'y est laissé prendre.
--
-- LE GESTE. On ne peut pas retirer `PUBLIC` sans tout couper : on fige donc d'abord
-- l'existant en grants NOMINATIFS, exactement là où le rôle a déjà le droit
-- aujourd'hui — rien ne s'élargit — puis on retire `PUBLIC`. `anon`, qui n'a aucun
-- grant nominatif, perd tout ; `authenticated` et `service_role` gardent l'exact
-- périmètre qu'ils avaient à la seconde d'avant (112 et 179 fonctions, inchangés).

do $$
declare f record;
begin
  -- 1. Figer l'existant, rôle par rôle, fonction par fonction.
  for f in
    select p.oid::regprocedure::text as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and has_function_privilege('authenticated', p.oid, 'EXECUTE')
  loop
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;

  for f in
    select p.oid::regprocedure::text as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and has_function_privilege('service_role', p.oid, 'EXECUTE')
  loop
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;

-- 2. Puis retirer le droit implicite. C'est lui, et lui seul, que `anon` empruntait.
revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;

-- 3. Et pour les fonctions à venir : sans cela, la prochaine naît ouverte à tous.
-- ⚠️ Conséquence assumée : une fonction neuve devra porter son `grant execute`
-- explicite pour être appelée depuis le site. L'oubli se voit — « permission denied
-- for function » — ce qui vaut mieux qu'une porte qu'on ne voit pas.
alter default privileges for role postgres in schema public revoke execute on functions from public;
