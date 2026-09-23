-- LE COMPTEUR DE LECTURES REPART DE ZÉRO, SANS RIEN PERDRE (demande de l'auteur, 2026-09-22).
--
-- Depuis 20260922155036, une lecture n'est comptée que pour un lecteur CONNECTÉ, et une
-- seule fois par verset et par jour. Les compteurs d'avant mêlaient les deux régimes : ils
-- comptaient aussi les visiteurs sans compte, et chaque rechargement de page. Additionner
-- les deux ne dirait plus rien. On archive donc l'ancien relevé, puis on remet à zéro.
--
-- 1. `lectures_versets_archive_20260922` garde le relevé tel quel (378 lignes,
--    1 025 lectures, 85 au maximum sur un verset). Table fermée : ni `anon` ni
--    `authenticated` n'y touchent, seule la clé de service la lit.
-- 2. Les compteurs servis repartent à zéro plutôt que d'être supprimés : la page lit
--    `lectures_versets` par `id_verset`, et une ligne absente vaut zéro comme une ligne à
--    zéro — mais garder les lignes évite une rafale d'insertions à la reprise.
-- 3. `lectures_versets_lecteurs` ne servait qu'au dédoublonnage sur vingt-quatre heures et
--    ne se vidait jamais : une ligne par lecteur et par verset, à jamais. Purge quotidienne
--    au-delà de trente jours (vingt-quatre heures suffiraient ; trente jours laissent de
--    quoi constater une anomalie). pg_cron est installé (1.6.4) et porte déjà sept tâches.

set local lock_timeout = '5s';

-- 1. L'archive
create table if not exists public.lectures_versets_archive_20260922 (
  id_verset text primary key,
  nb_lectures bigint not null,
  archive_le timestamptz not null default now()
);
comment on table public.lectures_versets_archive_20260922 is
  'Les compteurs de lectures d''avant la remise à zéro du 2026-09-22 : ils comptaient aussi les visiteurs sans compte, et chaque rechargement. Conservés pour mémoire, jamais servis.';

alter table public.lectures_versets_archive_20260922 enable row level security;
-- Aucune politique : seule la clé de service y accède.
revoke all on table public.lectures_versets_archive_20260922 from public, anon, authenticated;

insert into public.lectures_versets_archive_20260922 (id_verset, nb_lectures)
select id_verset, nb_lectures from public.lectures_versets
on conflict (id_verset) do nothing;

-- 2. La remise à zéro
update public.lectures_versets set nb_lectures = 0 where nb_lectures <> 0;

-- 3. La purge du dédoublonnage
create or replace function public.purger_lectures_versets_lecteurs()
 returns integer
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  supprimees integer;
begin
  delete from public.lectures_versets_lecteurs where lu_le < now() - interval '30 days';
  get diagnostics supprimees = row_count;
  return supprimees;
end;
$function$;
comment on function public.purger_lectures_versets_lecteurs() is
  'Vide la table de dédoublonnage des lectures au-delà de trente jours. Vingt-quatre heures suffiraient au dédoublonnage lui-même. Tâche pg_cron « purger_lectures_lecteurs », 2026-09-22.';
revoke execute on function public.purger_lectures_versets_lecteurs() from public, anon, authenticated;

select cron.unschedule('purger_lectures_lecteurs')
 where exists (select 1 from cron.job where jobname = 'purger_lectures_lecteurs');
select cron.schedule('purger_lectures_lecteurs', '30 3 * * *',
  'select public.purger_lectures_versets_lecteurs();');
