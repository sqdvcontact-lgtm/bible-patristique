-- Contrôles de 20260924141000_recherche_originaux_textes_propres.
-- Un bloc par assertion ; l'exception parle, son absence vaut réussite.

-- 1. Aucune fonction de recherche ne lit plus la colonne héritée. (Le souligné s'échappe :
--    dans un LIKE il vaut un caractère quelconque, et « texte original » en prose répondrait.)
do $c$
declare n int;
begin
  select count(*) into n from pg_proc
   where pronamespace = 'public'::regnamespace
     and proname in ('recherche_segments_v2', 'recherche_segments_v2_corresp',
                     'recherche_segments_v2_repartition', 'recherche_segments_original_v2',
                     'rafraichir_lexique_grec')
     and prosrc ilike '%texte\_original%'
     and proname <> 'recherche_segments_original_v2';
  if n > 0 then raise exception 'Une fonction de recherche lit encore segments.texte_original (%).', n; end if;
  -- recherche_segments_original_v2 garde le NOM de sa colonne de sortie, jamais la lecture.
  if exists (select 1 from pg_proc where proname = 'recherche_segments_original_v2'
              and prosrc ilike '%s.texte\_original%') then
    raise exception 'recherche_segments_original_v2 lit encore s.texte_original.';
  end if;
end $c$;

-- 2. Les deux anciennes recherche_segments_original sont retirées.
do $c$
begin
  if exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace
              and proname = 'recherche_segments_original') then
    raise exception 'recherche_segments_original existe encore.';
  end if;
end $c$;

-- 3. Le grec de la Didachè et le latin de Boèce répondent (textes propres, jamais la copie).
do $c$
declare n int;
begin
  select count(*) into n from public.recherche_segments_v2_corresp(array['λόγος'], 'prefixe') where match_orig;
  if n = 0 then raise exception 'Aucun passage grec ne répond à « λόγος ».'; end if;
  select count(*) into n
    from public.recherche_segments_v2(array['philosophia'], 'prefixe', 'A0064O0001', 0, 100)
   where match_orig and extrait_original is not null;
  if n = 0 then raise exception 'Le latin de Boèce ne répond pas à « philosophia ».'; end if;
end $c$;

-- 4. Un passage rattaché ouvre une TRADUCTION, et son extrait est celui de l'original.
do $c$
declare n int;
begin
  select count(*) into n
    from public.recherche_segments_v2(array['deus'], 'prefixe', null, 0, 100) p
    join public.oeuvre_textes t on t.id_texte = p.id_texte
   where p.en_regard and coalesce(btrim(t.traducteur), '') = ''
     and lower(btrim(t.langue)) = (select lower(btrim(o.langue_originale)) from public.oeuvres o where o.id_oeuvre = p.id_oeuvre);
  if n > 0 then raise exception '% passage(s) « en regard » pointent un texte original.', n; end if;
end $c$;

-- 5. Un original non publié ne sort pas (la Léonine de la Somme, is_public = false).
do $c$
declare n int;
begin
  select count(*) into n
    from public.recherche_segments_v2_corresp(array['deus'], 'prefixe') c
    join public.segments s on s.id = c.id
    join public.oeuvre_textes t on t.id_texte = s.id_texte
   where not t.is_public;
  if n > 0 then raise exception '% passage(s) d''un texte non public sortent de la recherche.', n; end if;
end $c$;

-- 6. Le rôle anonyme n'exécute pas les fonctions de recherche des passages.
do $c$
begin
  if has_function_privilege('anon', 'public.recherche_segments_v2(text[], text, text, integer, integer)', 'execute')
     or has_function_privilege('anon', 'public.recherche_segments_v2_corresp(text[], text)', 'execute') then
    raise exception 'anon exécute une fonction de recherche des passages.';
  end if;
  if not has_function_privilege('authenticated', 'public.recherche_segments_v2(text[], text, text, integer, integer)', 'execute') then
    raise exception 'authenticated n''exécute plus recherche_segments_v2.';
  end if;
end $c$;
