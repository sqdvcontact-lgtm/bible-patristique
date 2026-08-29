-- `versets_lecture` se rafraîchissait toutes les minutes, pour rien (2026-08-29).
--
-- Le travail cron n° 4 (« rafraichir_lecture », `* * * * *`) lançait un
-- `refresh materialized view concurrently versets_lecture` CHAQUE MINUTE, sans jamais
-- se demander si quelque chose avait changé. Relevé du 24 juillet au 29 août :
--
--   · 51 446 exécutions
--   · 14,5 secondes en moyenne, pour une cadence de 60 secondes
--   · 430 secondes au pire — sept minutes
--   · 8 241 exécutions au-delà de la minute, soit 16 % : la suivante était déjà due
--     quand la précédente tournait encore, et les rafraîchissements s'empilaient
--   · 41 heures de temps d'exécution cumulé sur les 17 derniers jours
--
-- Pendant ce temps, les DEUX seules tables que lit la vue — `versets_v2` et
-- `versets_canon` — n'ont reçu qu'une quarantaine de milliers d'écritures AU TOTAL, et
-- par rafales d'import. La base reconstruisait donc 36 391 lignes et 33 Mo une fois par
-- minute pour ne refléter, presque toujours, aucun changement : à peu près un
-- rafraîchissement par écriture. C'est ce qui ne lui laissait aucune marge, et ce qui a
-- transformé une rafale d'écritures en vingt-huit minutes d'indisponibilité le
-- 29 août 2026 (voir AGENTS.md).
--
-- ⛔ LA FRAÎCHEUR NE CHANGE PAS. La cadence reste `* * * * *` : une correction de verset
-- paraît toujours en moins d'une minute. Ce qui change, c'est qu'une minute sans
-- écriture ne coûte plus rien — une lecture de séquence et une addition.
--
-- POURQUOI UNE SÉQUENCE, ET NON UN DRAPEAU. Un drapeau dans une table à une ligne
-- sérialiserait tous les écrivains de `versets_v2` sur cette ligne unique. Une séquence
-- ne verrouille rien, et elle se trompe DANS LE BON SENS : `nextval` ne se rejoue pas
-- en arrière, si bien qu'une transaction annulée laisse un rafraîchissement inutile —
-- jamais un rafraîchissement manquant.
--
-- ⛔ L'ORDRE DES DEUX LECTURES EST LA CORRECTION ELLE-MÊME. La séquence se lit AVANT le
-- rafraîchissement. `refresh` prend son propre instantané, forcément postérieur : tout
-- changement compté dans la version relevée est donc bien dans la vue. Un changement
-- qui arrive après pousse la séquence au-delà de la version enregistrée, et la minute
-- suivante le rattrape. Lire la séquence APRÈS le rafraîchissement perdrait
-- silencieusement les écritures survenues entre les deux.

begin;

-- ── Le compteur de modifications ────────────────────────────────────────────────
create sequence if not exists internal.versets_lecture_maj_seq;

create table if not exists internal.versets_lecture_etat (
  id                       boolean primary key default true check (id),
  version_vue              bigint      not null default 0,
  dernier_rafraichissement timestamptz,
  derniere_duree_ms        integer,
  rafraichissements        bigint      not null default 0,
  passages_a_vide          bigint      not null default 0
);
comment on table internal.versets_lecture_etat is
  'Une seule ligne. `version_vue` est la valeur de `versets_lecture_maj_seq` au dernier rafraîchissement réel ; `passages_a_vide` compte les minutes où il n''y avait rien à faire.';

insert into internal.versets_lecture_etat (id) values (true) on conflict (id) do nothing;

-- ── Ce qui marque la vue obsolète ───────────────────────────────────────────────
-- Déclencheur PAR INSTRUCTION, non par ligne : un import de trente mille versets
-- n'incrémente la séquence qu'une fois par ordre SQL.
create or replace function internal.marquer_versets_lecture_obsolete()
returns trigger
language plpgsql
security definer
set search_path to 'internal', 'public', 'pg_temp'
as $$
begin
  perform nextval('internal.versets_lecture_maj_seq');
  return null;
end
$$;

drop trigger if exists trg_versets_v2_maj_lecture on public.versets_v2;
create trigger trg_versets_v2_maj_lecture
  after insert or update or delete on public.versets_v2
  for each statement execute function internal.marquer_versets_lecture_obsolete();

drop trigger if exists trg_versets_v2_truncate_lecture on public.versets_v2;
create trigger trg_versets_v2_truncate_lecture
  after truncate on public.versets_v2
  for each statement execute function internal.marquer_versets_lecture_obsolete();

drop trigger if exists trg_versets_canon_maj_lecture on public.versets_canon;
create trigger trg_versets_canon_maj_lecture
  after insert or update or delete on public.versets_canon
  for each statement execute function internal.marquer_versets_lecture_obsolete();

drop trigger if exists trg_versets_canon_truncate_lecture on public.versets_canon;
create trigger trg_versets_canon_truncate_lecture
  after truncate on public.versets_canon
  for each statement execute function internal.marquer_versets_lecture_obsolete();

-- ── Le rafraîchissement, désormais conditionnel ─────────────────────────────────
drop function if exists public.rafraichir_versets_lecture();

create or replace function public.rafraichir_versets_lecture(p_forcer boolean default false)
returns text
language plpgsql
security definer
set search_path to 'public', 'internal', 'pg_temp'
as $$
declare
  v_version bigint;
  v_connue  bigint;
  v_debut   timestamptz;
  v_ms      integer;
begin
  -- ⛔ Jamais deux rafraîchissements de front. Le verrou est TRANSACTIONNEL : il se
  -- relâche seul, même si la fonction échoue — c'est l'empilement des travaux cron qui
  -- portait les 430 secondes du pire cas.
  if not pg_try_advisory_xact_lock(8140299) then
    return 'ignoré : un rafraîchissement est déjà en cours';
  end if;

  -- ⛔ La séquence se lit AVANT le rafraîchissement : voir l'en-tête de la migration.
  select s.last_value into v_version from internal.versets_lecture_maj_seq s;
  select e.version_vue into v_connue from internal.versets_lecture_etat e where e.id;

  if not p_forcer and v_version = v_connue then
    update internal.versets_lecture_etat set passages_a_vide = passages_a_vide + 1 where id;
    return 'à jour';
  end if;

  v_debut := clock_timestamp();
  refresh materialized view concurrently public.versets_lecture;
  v_ms := (extract(epoch from (clock_timestamp() - v_debut)) * 1000)::integer;

  update internal.versets_lecture_etat
     set version_vue              = v_version,
         dernier_rafraichissement = now(),
         derniere_duree_ms        = v_ms,
         rafraichissements        = rafraichissements + 1
   where id;

  return format('rafraîchie en %s ms (version %s)', v_ms, v_version);
end
$$;

comment on function public.rafraichir_versets_lecture(boolean) is
  'Rafraîchit `versets_lecture` UNIQUEMENT si `versets_v2` ou `versets_canon` ont bougé depuis la dernière fois. `p_forcer => true` rafraîchit quoi qu''il arrive — à employer après une redéfinition de la vue, que les déclencheurs ne voient pas.';

-- La vue n'a jamais été rafraîchie sous ce régime : on part d'un état inconnu, donc
-- obsolète. Le premier passage du cron la reconstruira une fois, puis se taira.
update internal.versets_lecture_etat set version_vue = -1 where id;

-- ── Le travail cron appelle la fonction, non plus l'ordre brut ──────────────────
select cron.alter_job(
  job_id  := (select jobid from cron.job where jobname = 'rafraichir_lecture'),
  command := 'select public.rafraichir_versets_lecture();'
);

commit;
