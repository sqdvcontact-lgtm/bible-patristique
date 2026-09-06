-- Retour en arrière de la migration 20260906143213_norm_fr_garde_le_grec :
-- norm_fr redevient la normalisation ASCII, et le grec redisparaît de la recherche.
--
-- ⚠️ Les deux gestes qui suivent la fonction sont NÉCESSAIRES, sans quoi la colonne
-- engendrée et la vue matérialisée gardent leur grec pendant que la fonction ne le
-- produit plus — et le déclencheur de synchronisation du centre de contrôle
-- (trg_controle_v2_guard_segment_norm) refusera la première écriture sur un segment grec.
--
-- ⛔ « refresh materialized view concurrently » ne peut pas vivre dans une transaction :
-- il se joue APRÈS le commit, à la main.

begin;

create or replace function public.norm_fr(t text)
 returns text language sql immutable parallel safe
 set search_path to 'public', 'extensions', 'pg_temp'
as $function$
select trim(regexp_replace(
  regexp_replace(
  regexp_replace(
  regexp_replace(
  regexp_replace(
  regexp_replace(
  regexp_replace(
  regexp_replace(
    f_unaccent(lower(coalesce(t,''))),
    '(conn|reconn|par|appar|compar|acc|croi|dec|empl|nett)oi(t|tr|ss)', '\1ai\2', 'g'),
    '([a-z]{2,})oit(s?)\y', '\1ait\2', 'g'),
    '([a-z]{2,})oient\y', '\1aient', 'g'),
    '\yfoibl', 'faibl', 'g'),
    '\ytems\y', 'temps', 'g'),
    '\yenfans\y', 'enfants', 'g'),
    '\yscav', 'sav', 'g'),
  '[^a-z0-9]+', ' ', 'g'));
$function$;

update public.segments
   set segment_texte = segment_texte
 where texte_norm is distinct from public.norm_fr(segment_texte);

commit;

refresh materialized view concurrently public.versets_recherche;
