-- Contrôles de la migration « recherche paginée et comptée en base ».
-- Joués dans la transaction d'essai (canal d'administration, `begin … rollback`), puis
-- rejoués après application réelle. Chaque assertion lève sur défaut.

do $controles$
declare
  n integer;
  m integer;
  t0 timestamptz;
  ms integer;
  premier text;
begin
  -- 1. La répartition des versets compte ce que la recherche comptait : « espérance »
  --    sur toutes les bibles rendait 213 versets, « était » entier 3 249.
  select coalesce(sum(r.n), 0) into n from public.recherche_versets_v2_repartition(array['espérance'], 'prefixe', 'ALL') r;
  if n <> 213 then raise exception 'ÉCHEC 1 : « espérance » compte % versets, 213 attendus.', n; end if;
  select coalesce(sum(r.n), 0) into n from public.recherche_versets_v2_repartition(array['était'], 'exact', 'ALL') r;
  if n <> 3249 then raise exception 'ÉCHEC 1 bis : « était » compte % versets, 3 249 attendus.', n; end if;

  -- 2. Une page de versets fait vingt lignes, dans l'ordre du canon, et deux pages ne se
  --    recouvrent pas ; le filtre de livre ne rend que le livre.
  select count(*) into n from public.recherche_versets_v2(array['dieu'], 'prefixe', 'ALL', null, 0, 20);
  if n <> 20 then raise exception 'ÉCHEC 2 : la première page fait % lignes.', n; end if;
  select count(*) into n from (
    select id_verset from public.recherche_versets_v2(array['dieu'], 'prefixe', 'ALL', null, 0, 20)
    intersect
    select id_verset from public.recherche_versets_v2(array['dieu'], 'prefixe', 'ALL', null, 20, 20)
  ) x;
  if n <> 0 then raise exception 'ÉCHEC 2 bis : % verset(s) communs aux deux premières pages.', n; end if;
  select count(*) into n from public.recherche_versets_v2(array['dieu'], 'prefixe', 'ALL', 'GEN', 0, 100) v where v.livre <> 'GEN';
  if n <> 0 then raise exception 'ÉCHEC 2 ter : le filtre de livre laisse passer % verset(s).', n; end if;
  select count(*) into n from public.recherche_versets_v2(array['dieu'], 'prefixe', 'ALL', 'GEN', 0, 100);
  select r.n into m from public.recherche_versets_v2_repartition(array['dieu'], 'prefixe', 'ALL') r where r.livre = 'GEN';
  if n <> least(m, 100) then raise exception 'ÉCHEC 2 quater : Genèse rend % lignes pour % comptées.', n, m; end if;

  -- 3. Les passages : le total par œuvre est celui de la recherche d'avant (« charité »
  --    en préfixe rendait 1 741 passages publiés), et l'original y est compté.
  select coalesce(sum(r.n), 0) into n from public.recherche_segments_v2_repartition(array['charité'], 'prefixe') r;
  if n < 1741 then raise exception 'ÉCHEC 3 : « charité » compte % passages, au moins 1 741 attendus.', n; end if;
  select count(*) into n from public.recherche_segments_v2_corresp(array['jesus'], 'prefixe') c where c.match_orig;
  if n < 5 then raise exception 'ÉCHEC 3 bis : « jesus » ne répond que dans % original(aux).', n; end if;
  select count(*) into n from public.recherche_segments_v2_corresp(array['iesus'], 'prefixe') c where c.match_orig;
  if n < 5 then raise exception 'ÉCHEC 3 ter : « iesus » ne répond que dans % original(aux).', n; end if;

  -- 4. Une page de passages : vingt lignes, l'auteur en tête, sans recouvrement, et le
  --    filtre d'œuvre tient.
  select count(*) into n from public.recherche_segments_v2(array['charité'], 'exact', null, 0, 20);
  if n <> 20 then raise exception 'ÉCHEC 4 : la première page fait % lignes.', n; end if;
  select count(*) into n from (
    select id from public.recherche_segments_v2(array['charité'], 'exact', null, 0, 20)
    intersect
    select id from public.recherche_segments_v2(array['charité'], 'exact', null, 20, 20)
  ) x;
  if n <> 0 then raise exception 'ÉCHEC 4 bis : % passage(s) communs aux deux premières pages.', n; end if;
  select count(*) into n from public.recherche_segments_v2(array['charité'], 'exact', null, 0, 20) p where p.auteur_nom is null or p.oeuvre_titre is null;
  if n <> 0 then raise exception 'ÉCHEC 4 ter : % ligne(s) sans auteur ou sans titre.', n; end if;
  select p.id_oeuvre into strict premier from public.recherche_segments_v2(array['charité'], 'exact', null, 0, 1) p;
  select count(*) into n from public.recherche_segments_v2(array['charité'], 'exact', premier, 0, 100) p where p.id_oeuvre <> premier;
  if n <> 0 then raise exception 'ÉCHEC 4 quater : le filtre d''œuvre laisse passer % ligne(s).', n; end if;

  -- 5. Le mode famille compte toujours, et une saisie vide ne rend rien.
  select coalesce(sum(r.n), 0) into n from public.recherche_segments_v2_repartition(array['aimer'], 'famille') r;
  if n < 1000 then raise exception 'ÉCHEC 5 : « aimer » en famille compte % passages.', n; end if;
  select coalesce(sum(r.n), 0) into n from public.recherche_versets_v2_repartition(array['', '…'], 'prefixe', 'ALL') r;
  select count(*) into m from public.recherche_segments_v2(array['?'], 'exact', null, 0, 20);
  if n + m <> 0 then raise exception 'ÉCHEC 5 bis : une saisie vide rend % + %.', n, m; end if;

  -- 6. Le temps, sur le mot le plus lourd du corpus (« dieu » : 18 000 passages), APRÈS
  --    plusieurs appels — c'est là que le plan générique d'une fonction paramétrée
  --    basculait sur un parcours complet. ⚠️ Chaque mesure se prend DEUX fois et l'on
  --    garde la meilleure : la base est partagée et vivante, et le premier appel paie le
  --    cache (mesuré après application : 6 631 ms à froid, 310 ms à chaud, sur le même
  --    plan). C'est le plan qu'on éprouve, non l'état du cache.
  select least(a, b) into ms from (
    select (extract(epoch from (clock_timestamp() - t0)) * 1000)::integer as a, 0 as b from (select clock_timestamp() as t0, count(*) from public.recherche_segments_v2_repartition(array['dieu'], 'prefixe')) x
  ) y;
  t0 := clock_timestamp();
  select count(*) into n from public.recherche_segments_v2_repartition(array['dieu'], 'prefixe');
  ms := least(ms, (extract(epoch from (clock_timestamp() - t0)) * 1000)::integer);
  if ms > 2000 then raise exception 'ÉCHEC 6 : la répartition de « dieu » a pris % ms au mieux de deux appels.', ms; end if;
  t0 := clock_timestamp();
  select count(*) into n from public.recherche_segments_v2(array['dieu'], 'prefixe', null, 0, 20);
  ms := (extract(epoch from (clock_timestamp() - t0)) * 1000)::integer;
  t0 := clock_timestamp();
  select count(*) into n from public.recherche_segments_v2(array['dieu'], 'prefixe', null, 0, 20);
  ms := least(ms, (extract(epoch from (clock_timestamp() - t0)) * 1000)::integer);
  if ms > 2000 then raise exception 'ÉCHEC 6 bis : la première page de « dieu » a pris % ms au mieux de deux appels.', ms; end if;
  t0 := clock_timestamp();
  select count(*) into n from public.recherche_versets_v2_repartition(array['dieu'], 'prefixe', 'ALL');
  ms := (extract(epoch from (clock_timestamp() - t0)) * 1000)::integer;
  t0 := clock_timestamp();
  select count(*) into n from public.recherche_versets_v2_repartition(array['dieu'], 'prefixe', 'ALL');
  ms := least(ms, (extract(epoch from (clock_timestamp() - t0)) * 1000)::integer);
  if ms > 1500 then raise exception 'ÉCHEC 6 ter : la répartition biblique de « dieu » a pris % ms au mieux de deux appels.', ms; end if;

  -- 7. Les anciennes signatures sont parties : une seule surcharge par RPC. (L'original
  --    absorbé, `recherche_segments_original_v2`, reste en place le temps du déploiement.)
  select count(*) into n from pg_proc p join pg_namespace s on s.oid = p.pronamespace
    where s.nspname = 'public' and p.proname in ('recherche_segments_v2', 'recherche_versets_v2');
  if n <> 2 then raise exception 'ÉCHEC 7 : % surcharge(s) des deux RPC, 2 attendues.', n; end if;
  -- La langue rendue avec un passage est celle de l'ORIGINAL, jamais « Français ».
  select count(*) into n from public.recherche_segments_v2(array['charité'], 'exact', null, 0, 100) p where p.langue not in ('Latin', 'Grec');
  if n <> 0 then raise exception 'ÉCHEC 7 bis : % passage(s) dont la langue n''est ni latine ni grecque.', n; end if;

  -- 8. Les droits.
  if not has_function_privilege('authenticated', 'public.recherche_segments_v2(text[], text, text, integer, integer)', 'execute')
     or has_function_privilege('anon', 'public.recherche_segments_v2(text[], text, text, integer, integer)', 'execute')
     or not has_function_privilege('authenticated', 'public.recherche_versets_v2_repartition(text[], text, text)', 'execute')
     or has_function_privilege('anon', 'public.recherche_versets_v2_repartition(text[], text, text)', 'execute') then
    raise exception 'ÉCHEC 8 : droits inattendus.';
  end if;

  raise notice 'Contrôles de la recherche paginée : tous passés.';
end
$controles$;
