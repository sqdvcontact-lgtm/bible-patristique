-- ⛔ « STATISTIQUES » NE FONCTIONNAIT PLUS : LA VUE DÉPASSAIT LE DÉLAI (2026-09-04)
--
-- Relevé de l'auteur : « Statistiques ne fonctionne pas ». La page annonçait « Aucun lien
-- pour l'instant » — et c'était FAUX : la requête n'aboutissait jamais.
--
-- Mesuré : `versets_plus_cites` recalcule tout le classement à chaque appel — 67 868 liens
-- joints à `segments`, agrégés deux fois, puis un LATERAL par verset pour aller chercher
-- le texte de la Segond. `EXPLAIN ANALYZE` rend **12 485 ms**, pour un `statement_timeout`
-- de 8 s sur `authenticated` (3 s sur `anon`). La requête était donc ANNULÉE, `data`
-- valait nul, et la page — qui ne lisait pas `error` — servait sa phrase de liste vide.
-- ⚠️ C'est une dérive, non un défaut d'origine : la vue coûtait quelques centaines de
-- millisecondes quand le corpus comptait dix fois moins de liens.
--
-- ⛔ LA RÉPONSE EST LA MATÉRIALISATION, non un `security definer` de plus : c'est déjà la
-- règle du dépôt pour une vue lourde (modèle `oeuvres_controle_stats_mat`, AGENTS.md,
-- « La bonne réponse pour une vue lourde est la MATÉRIALISATION »). La lecture tombe de
-- douze secondes à une lecture d'index.
--
-- ⚠️ LE CLASSEMENT PORTE SA DATE, dans une colonne : un instantané qui ne dit pas quand il
-- a été pris laisse croire qu'il est vivant. Elle se recalcule avec lui, et la page
-- l'affiche. ⛔ Aucun cron : le score ne change qu'après une passe de liens, c'est-à-dire
-- rarement et sur décision — le travail périodique qui ne se demande jamais s'il a du
-- travail est une leçon déjà payée (cron `rafraichir_lecture`, 2026-08-29).
--
-- Retour en arrière : sql/rollback_versets_plus_cites_mat_20260904.sql

begin;

-- La création EXÉCUTE la requête : elle demande plus que les huit secondes du rôle.
set local statement_timeout = '180s';

create materialized view public.versets_plus_cites_mat as
select v.*, now() as calcule_le
  from public.versets_plus_cites v;

-- ⚠️ L'index UNIQUE n'est pas un ornement : `refresh ... concurrently` l'exige.
create unique index versets_plus_cites_mat_canon_idx
  on public.versets_plus_cites_mat (canon_id);
create index versets_plus_cites_mat_score_idx
  on public.versets_plus_cites_mat (score desc, nb_commentaires desc);

grant select on public.versets_plus_cites_mat to anon, authenticated, service_role;

-- ⛔ Le REFRESH ne s'expose jamais au client : il passe par une fonction à privilèges,
-- réservée à la clé de service, comme `rafraichir_controle_stats`.
create or replace function public.rafraichir_versets_plus_cites()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare quand timestamptz;
begin
  refresh materialized view concurrently public.versets_plus_cites_mat;
  select calcule_le into quand from public.versets_plus_cites_mat limit 1;
  return quand;
end
$$;

revoke execute on function public.rafraichir_versets_plus_cites() from public;
revoke execute on function public.rafraichir_versets_plus_cites() from anon;
revoke execute on function public.rafraichir_versets_plus_cites() from authenticated;
grant execute on function public.rafraichir_versets_plus_cites() to service_role;

-- ⛔ Contrôle : le classement est peuplé, daté, et lisible par un visiteur.
do $$
declare n int; quand timestamptz;
begin
  select count(*), max(calcule_le) into n, quand from public.versets_plus_cites_mat;
  if n = 0 then raise exception 'Classement vide'; end if;
  if quand is null then raise exception 'Classement sans date de calcul'; end if;
  if not has_table_privilege('anon', 'public.versets_plus_cites_mat', 'SELECT')
     or not has_table_privilege('authenticated', 'public.versets_plus_cites_mat', 'SELECT') then
    raise exception 'Le classement n''est pas lisible par un visiteur';
  end if;
  if has_function_privilege('authenticated', 'public.rafraichir_versets_plus_cites()', 'EXECUTE') then
    raise exception 'Le recalcul ne doit pas être ouvert aux comptes ordinaires';
  end if;
end $$;

commit;
