-- Retour en arrière de la migration 20260906141923_retrait_ancienne_concordance.
-- Les trois tables sont restituées depuis leurs sauvegardes `internal.backup_*_20260906`,
-- les six fonctions recréées telles qu'elles étaient, et le travail périodique reprend
-- son `analyze concordance_versets`.
-- ⚠️ Les droits d'écriture retirés à `authenticated` sur les deux lexiques en service
-- ne sont PAS rendus : les rendre rouvrirait le trou, et rien ne s'en sert.

begin;

-- ── Les tables ───────────────────────────────────────────────────────────────
create table if not exists public.concordance_versets as
  select * from internal.backup_concordance_versets_20260906;
create table if not exists public.concordance_latina as
  select * from internal.backup_concordance_latina_20260906;
create table if not exists public.concordance_lexique_ancien as
  select * from internal.backup_concordance_lexique_ancien_20260906;

alter table public.concordance_versets enable row level security;
alter table public.concordance_latina enable row level security;
alter table public.concordance_lexique_ancien enable row level security;

create policy cv_lecture_publique on public.concordance_versets for select using (true);
create policy cl_lecture_publique on public.concordance_latina for select using (true);
create policy lex_lecture_publique on public.concordance_lexique_ancien for select using (true);

grant select on public.concordance_versets, public.concordance_latina,
                public.concordance_lexique_ancien to authenticated, service_role;

-- ── Les fonctions ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.recherche_concordance(p_terme text, p_tr text DEFAULT 'TR0001'::text, p_livre text DEFAULT NULL::text, p_limit integer DEFAULT 150)
 RETURNS TABLE(id_verset text, livre text, chapitre integer, verset_num integer, texte_norm text)
 LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT cv.id_verset, cv.livre, cv.chapitre, cv.verset, cv.texte_norm
  FROM concordance_versets cv
  WHERE cv.tr = p_tr AND cv.texte_norm LIKE '%' || p_terme || '%'
    AND (p_livre IS NULL OR cv.livre = p_livre)
  ORDER BY cv.livre, cv.chapitre, cv.verset
  LIMIT p_limit;
$function$;

CREATE OR REPLACE FUNCTION public.recherche_concordance_la(p_terme text, p_livre text DEFAULT NULL::text, p_limit integer DEFAULT 150)
 RETURNS TABLE(id_verset text, livre text, chapitre integer, verset_num integer, texte_norm text)
 LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT cl.id_verset, cl.livre, cl.chapitre, cl.verset, cl.texte_norm
  FROM concordance_latina cl
  WHERE cl.texte_norm LIKE '%' || p_terme || '%'
    AND (p_livre IS NULL OR cl.livre = p_livre)
  ORDER BY cl.livre, cl.chapitre, cl.verset
  LIMIT p_limit;
$function$;

CREATE OR REPLACE FUNCTION public.maj_concordance_versets()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  delete from concordance_versets where id_verset = new.id_verset;
  insert into concordance_versets (id_verset, tr, livre, chapitre, verset, texte_norm)
  select new.id_verset, t.tr, new.livre, new.chapitre, new.verset, norm_fr(t.txt)
  from (values ('TR0001', new."TR0001"), ('TR0002', new."TR0002"), ('TR0003', new."TR0003")) as t(tr, txt)
  where coalesce(t.txt,'') <> '';
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.maj_concordance_latina()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  delete from concordance_latina where id_verset = new.id_verset;
  if coalesce(new."TR0004",'') <> '' then
    insert into concordance_latina (id_verset, livre, chapitre, verset, texte_norm)
    values (new.id_verset, new.livre, new.chapitre, new.verset, norm_la(new."TR0004"));
  end if;
  return new;
end $function$;

-- ⚠️ `concordance()` et `concordance_latina_rpc()` ne sont pas restituées ici : elles
-- font une centaine de lignes chacune et se relisent dans l'historique de la base
-- (`pg_get_functiondef`, relevé du 2026-09-06 recopié dans le rapport d'audit).
-- Les recréer demande de reprendre ce relevé ; rien du site ne les appelait.

-- ── Le travail périodique ────────────────────────────────────────────────────
select cron.alter_job(
  (select jobid from cron.job where jobname = 'analyze_hebdo'),
  command := 'analyze versets_v2; analyze versets_canon; analyze segments; analyze liens_bibliques; analyze concordance_versets; analyze commentaires; analyze essais;'
);

commit;
