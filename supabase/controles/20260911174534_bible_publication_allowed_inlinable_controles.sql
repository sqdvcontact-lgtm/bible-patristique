-- Contrôles de la migration 20260911174534_bible_publication_allowed_inlinable.
--
-- ⚠️ La mesure se prend SOUS LE RÔLE DU LECTEUR, jamais sous `postgres` seul, qui
-- contourne la RLS : c'est la RLS qui faisait passer la vue des cibles de gloses de
-- 2,3 s à 12,3 s tant que la fonction portait une clause SET. Le bloc se termine
-- par une exception, qui annule tout et rend le rapport dans son message.

-- 1. Aucune clause SET sur la fonction : `proconfig` doit être nul.
select proname, proconfig
from pg_catalog.pg_proc
where oid = 'public.bible_technical_publication_allowed(text,jsonb)'::regprocedure;

-- 2. La vue sous la session d'un administrateur, sur la famille qui porte TR0013.
--    Attendu : bien au-dessous des 8 000 ms accordées à `authenticated`
--    (1 108 ms le 2026-09-11, contre 12 298 ms avant la migration).
do $$
declare
  t0 timestamptz;
  n int;
  v_admin text;
  v_famille uuid;
begin
  set local statement_timeout = '30s';
  select coalesce(to_jsonb(a) ->> 'user_id', to_jsonb(a) ->> 'id') into v_admin
  from public.admin_users a limit 1;
  select id into v_famille
  from public.bible_edition_families where family_code = 'bible899-critical-modern-v1';
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t0 := clock_timestamp();
  select count(*) into n
  from public.v_bible_tr0013_gloss_note_targets
  where family_id = v_famille and host_canon_id like 'LUK.13.%';
  raise exception 'Cibles de gloses (LUK 13, session admin) : % lignes en % ms (seuil 8 000)',
    n, round(extract(epoch from clock_timestamp() - t0) * 1000);
end $$;
