-- `eprouver_sql` : jumelle de `exec_sql` en SECURITY INVOKER, pour les scripts qui
-- doivent se mettre À LA PLACE d'un lecteur (`set_config('role','authenticated')`),
-- ce qu'une fonction DEFINER interdit (« cannot set parameter "role" within
-- security-definer function »). Réservée à la clé de service, qui n'y gagne rien
-- qu'elle n'ait déjà : elle contourne la RLS de toute façon. Employée par
-- scripts/audit-droits-lecteur.mjs.
create or replace function public.eprouver_sql(sql text) returns void
language plpgsql security invoker set search_path to 'public' set statement_timeout to '8s' as $$
begin
  execute sql;
end $$;
revoke execute on function public.eprouver_sql(text) from public, anon, authenticated;
grant execute on function public.eprouver_sql(text) to service_role;

-- Et l'appartenance sans laquelle `set_config('role','authenticated')` est refusé
-- (« permission denied to set role ») : la clé de service n'y gagne aucun droit,
-- elle contourne déjà la RLS et possède tout.
grant authenticated to service_role;

-- Trouvé par la première exécution de l'épreuve : `admin_users` était RLS sans
-- politique (donc vide à la lecture) mais gardait tous ses GRANT pour anon et
-- authenticated. Un verrou qu'on ne voit pas n'en est pas un ; `is_admin()` la lit
-- en DEFINER et n'en a pas besoin.
revoke all on public.admin_users from anon, authenticated;
