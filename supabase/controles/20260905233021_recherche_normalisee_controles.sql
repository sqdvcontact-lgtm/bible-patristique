-- Contrôles de la migration « recherche normalisée, versets et segments ».
-- Joués DANS la transaction d'essai (`scripts/fillion/dry-run-migration.mjs`), puis
-- rejoués après application réelle. Chaque assertion lève sur défaut : `exec_sql`
-- ne rend pas les lignes d'un `select`, c'est donc l'exception qui parle.

do $controles$
declare
  n integer;
  m integer;
  t0 timestamptz;
  ms integer;
  lex text[];
begin
  -- 1. La table de recherche couvre chaque bible de la vue de lecture.
  select count(distinct trad_id) into n from public.versets_recherche;
  if n <> 5 then
    raise exception 'ÉCHEC 1 : versets_recherche porte % bible(s), 5 attendues.', n;
  end if;
  select count(*) into n from public.versets_recherche;
  select count(*) into m from public.versets_lecture v
    where coalesce(v."TR0001",'') <> '' or coalesce(v."TR0002",'') <> '' or coalesce(v."TR0003",'') <> '' or coalesce(v."TR0004",'') <> '' or coalesce(v."TR0005",'') <> '';
  if n < m then
    raise exception 'ÉCHEC 1 bis : % lignes de recherche pour % versets portant un texte.', n, m;
  end if;

  -- 2. La graphie ancienne de Sacy est ramenée au français d'aujourd'hui : « était »
  --    trouve « étoit ». L'ancien chemin (unaccent) rendait 0.
  select count(*) into n from public.recherche_versets_v2(array['était'], 'exact', 'TR0001');
  if n < 2000 then
    raise exception 'ÉCHEC 2 : « était » ne trouve que % verset(s) dans Sacy ; « étoit » n''est pas normalisé.', n;
  end if;

  -- 3. Un mot seul rend ce que l'ancienne RPC rendait (même périmètre, même compte).
  select count(*) into n from public.recherche_versets_v2(array['espérance'], 'prefixe', 'ALL');
  select count(*) into m from public.recherche_versets(p_terme => 'espérance', p_scope => 'ALL');
  if n <> m then
    raise exception 'ÉCHEC 3 : « espérance » rend % verset(s) en v2 contre % avant.', n, m;
  end if;

  -- 4. Deux mots se cherchent dans la MÊME bible, et le mot entier resserre le préfixe.
  select count(*) into n from public.recherche_versets_v2(array['fils', 'dieu'], 'prefixe', 'ALL');
  if n < 300 or n > 700 then
    raise exception 'ÉCHEC 4 : « fils dieu » rend % verset(s), entre 300 et 700 attendus.', n;
  end if;
  select count(*) into n from public.recherche_versets_v2(array['charit'], 'prefixe', 'ALL');
  select count(*) into m from public.recherche_versets_v2(array['charit'], 'exact', 'ALL');
  if m <> 0 or n = 0 then
    raise exception 'ÉCHEC 4 bis : « charit » entier rend % (0 attendu), en préfixe % (> 0 attendu).', m, n;
  end if;

  -- 5. Le mode « famille » lit les flexions : « aimer » trouve aime, aimait, aimé.
  select count(*) into n from public.recherche_versets_v2(array['aimer'], 'famille', 'ALL');
  if n < 400 then
    raise exception 'ÉCHEC 5 : « aimer » en famille rend % verset(s), plus de 400 attendus.', n;
  end if;
  lex := public.lexemes_recherche(array['aimer', 'espérance']);
  if lex <> array['aim', 'esper'] then
    raise exception 'ÉCHEC 5 bis : racines % rendues pour « aimer espérance », {aim,esper} attendu.', lex;
  end if;

  -- 6. Les Pères : préfixe, exact, famille, et seulement les œuvres publiées.
  select count(*) into n from public.recherche_segments_v2(array['charité'], 'prefixe');
  if n < 1500 then
    raise exception 'ÉCHEC 6 : « charité » rend % segment(s), plus de 1500 attendus.', n;
  end if;
  select count(*) into m from public.recherche_segments_v2(array['charité'], 'exact');
  if m > n or m < 1500 then
    raise exception 'ÉCHEC 6 bis : « charité » entier rend % segment(s) pour % en préfixe.', m, n;
  end if;
  select count(*) into n from public.recherche_segments_v2(array['fils', 'dieu'], 'prefixe');
  if n < 1000 then
    raise exception 'ÉCHEC 6 ter : « fils dieu » rend % segment(s), plus de 1000 attendus.', n;
  end if;
  select count(*) into n from public.recherche_segments_v2(array['aimer'], 'famille');
  if n < 1000 then
    raise exception 'ÉCHEC 6 quater : « aimer » en famille rend % segment(s), plus de 1000 attendus.', n;
  end if;
  select count(*) into n from public.recherche_segments_v2(array['charité'], 'prefixe') r
    join public.oeuvres o on o.id_oeuvre = r.id_oeuvre where not o.acces_public;
  if n <> 0 then
    raise exception 'ÉCHEC 6 quinquies : % segment(s) d''œuvres non publiées rendus.', n;
  end if;

  -- 7. L'original : « jesus » et « iesus » sont le même mot, et le grec se cherche.
  select count(*) into n from public.recherche_segments_original_v2(array['jesus'], false);
  select count(*) into m from public.recherche_segments_original_v2(array['iesus'], false);
  if n = 0 or n <> m then
    raise exception 'ÉCHEC 7 : « jesus » rend % et « iesus » % dans l''original ; les graphies ne se valent pas.', n, m;
  end if;
  if public.graphies_latines('jesus') <> array['iesus', 'jesus', 'jesvs'] then
    raise exception 'ÉCHEC 7 bis : graphies de « jesus » : %.', public.graphies_latines('jesus');
  end if;

  -- 8. Rien ne sort d'une saisie vide, ni d'une saisie qui n'est que ponctuation.
  select count(*) into n from public.recherche_versets_v2(array['', '  ', '…'], 'prefixe', 'ALL');
  select count(*) into m from public.recherche_segments_v2(array['?'], 'exact');
  if n + m <> 0 then
    raise exception 'ÉCHEC 8 : une saisie vide rend % + % ligne(s).', n, m;
  end if;

  -- 9. Le temps : la Bible entière, toutes bibles, sous la demi-seconde que l''API accorde.
  t0 := clock_timestamp();
  select count(*) into n from public.recherche_versets_v2(array['miséricorde'], 'prefixe', 'ALL');
  ms := (extract(epoch from (clock_timestamp() - t0)) * 1000)::integer;
  if ms > 500 then
    raise exception 'ÉCHEC 9 : « miséricorde » sur toutes les bibles a pris % ms (% versets).', ms, n;
  end if;

  -- 10. Les deux fonctions sur la table disparue sont parties, et l'appel positionnel
  --     n'est plus ambigu.
  select count(*) into n from pg_proc p join pg_namespace s on s.oid = p.pronamespace
    where s.nspname = 'public' and p.proname = 'recherche_versets';
  if n <> 1 then
    raise exception 'ÉCHEC 10 : % surcharge(s) de recherche_versets, 1 attendue.', n;
  end if;
  select count(*) into n from public.recherche_versets('espérance', 'ALL');
  if n = 0 then
    raise exception 'ÉCHEC 10 bis : l''appel positionnel de recherche_versets ne rend rien.';
  end if;

  -- 11. Les droits : le site, jamais l'anonyme.
  if not has_function_privilege('authenticated', 'public.recherche_versets_v2(text[], text, text)', 'execute')
     or has_function_privilege('anon', 'public.recherche_versets_v2(text[], text, text)', 'execute')
     or not has_table_privilege('authenticated', 'public.versets_recherche', 'select')
     or has_table_privilege('anon', 'public.versets_recherche', 'select') then
    raise exception 'ÉCHEC 11 : droits inattendus sur la recherche v2.';
  end if;

  raise notice 'Contrôles de la recherche normalisée : tous passés.';
end
$controles$;
