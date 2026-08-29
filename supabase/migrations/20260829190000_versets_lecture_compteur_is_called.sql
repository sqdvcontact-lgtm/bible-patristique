-- Le PREMIER `nextval` d'une séquence ne fait pas bouger `last_value` (2026-08-29).
--
-- Correctif immédiat de `20260829183000`. Le détecteur de modification comparait le seul
-- `last_value` de `internal.versets_lecture_maj_seq`. Or une séquence neuve vaut
-- `last_value = 1, is_called = false`, et son premier `nextval` rend 1 en se contentant
-- de basculer `is_called` : la valeur ne change pas. La toute première écriture sur
-- `versets_v2` ou `versets_canon` après la migration passait donc INAPERÇUE, et la vue
-- restait en retard jusqu'à la deuxième.
--
-- ⚠️ Le défaut ne se voyait pas au vert. La fonction répondait « à jour », ce qui est le
-- mot juste quand tout va bien : c'est en provoquant une écriture — annulée, pour ne
-- rien toucher — puis en la voyant ignorée que le trou est apparu. C'est la règle
-- écrite le matin même : une garde s'éprouve en réintroduisant le défaut, jamais en la
-- regardant passer.
--
-- LE COMPTE JUSTE est le nombre d'appels à `nextval`, que `last_value` seul ne donne
-- pas : `case when is_called then last_value else last_value - 1 end`.

begin;

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

  -- ⛔ La séquence se lit AVANT le rafraîchissement : voir `20260829183000`.
  -- ⛔ Et elle se lit avec `is_called`, sans quoi le premier `nextval` est invisible.
  select case when s.is_called then s.last_value else s.last_value - 1 end
    into v_version
    from internal.versets_lecture_maj_seq s;
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

-- L'écriture de contrôle du 29 août a déjà tiré la séquence une fois sans que la
-- version en soit changée : on repart d'un état obsolète pour ne rien perdre.
update internal.versets_lecture_etat set version_vue = -1 where id;

commit;
