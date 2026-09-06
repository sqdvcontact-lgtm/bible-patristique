-- ═══════════════════════════════════════════════════════════════════════════════
-- LA RECHERCHE SE PAGINE ET SE COMPTE EN BASE (demande de l'auteur, 2026-09-06 :
-- « optimise la page »).
--
-- ⛔ CE QUI COÛTAIT. La page des résultats rapatriait TOUT ce que la base trouvait —
-- jusqu'à 6 000 versets avec leurs cinq bibles et 5 000 passages entiers, cinq à six
-- méga-octets sur « Dieu » ou « était » —, puis en montrait vingt, comptait les livres
-- et les œuvres dans le navigateur, et paginait sur place : dix à quinze secondes
-- avant la première ligne, et un plafond arbitraire au-delà duquel elle annonçait
-- « résultats trop nombreux ».
--
-- ✅ CE QUI ENTRE. Deux lectures par corpus, chacune bornée à ce qu'elle rend :
--   · la RÉPARTITION — les livres (ou les œuvres) et leur effectif, ce que le volet
--     affiche et ce dont le total se déduit ; exacte, plus de plafond ;
--   · une PAGE de lignes — vingt à la fois, dans l'ordre du canon pour la Bible, de
--     l'auteur puis de l'œuvre pour les Pères, avec un filtre de livre ou d'œuvre.
--   Le texte ORIGINAL (latin, grec) rejoint la recherche des passages : un segment
--   répond en français, en original, ou les deux (`match_fr`, `match_orig`), dans une
--   seule liste et un seul ordre — deux listes paginées ne se fondent pas.
--
-- ⛔ LES MOTIFS ENTRENT DANS LA REQUÊTE EN CONSTANTES (`execute format(… %L …)`), jamais
-- en variables plpgsql. Mesuré le 2026-09-06 sur « dieu » (18 072 passages) : la même
-- condition coûte 110 ms en constantes, de 230 à 4 700 ms en paramètres — le planificateur
-- ne connaît pas la valeur d'un paramètre, estime au hasard la sélectivité d'une
-- expression rationnelle, et bascule sur un parcours complet de la table dès que le
-- plan générique lui paraît bon marché ; le banc d'essai l'a vu à 2 708 ms sur la
-- répartition. Un motif écrit dans la requête se planifie sur sa valeur, index
-- trigramme compris, à chaque appel.
--
-- ⚠️ L'ORDRE DES PÈRES SE CALCULE UNE FOIS PAR ŒUVRE, jamais par ligne : la clé de tri
-- (`norm_fr` du nom de l'auteur, puis du titre) coûte huit expressions rationnelles,
-- et « Dieu » touche 18 000 passages. La table des œuvres publiées la porte, et elle
-- se matérialise (une cinquantaine de lignes) avant la jointure.
--
-- ⚠️ DROP puis CREATE : `recherche_segments_v2` et `recherche_versets_v2` gagnent des
-- paramètres, et un `create or replace` aurait posé une SURCHARGE que PostgREST ne
-- sait plus départager (« Could not choose the best candidate function »).
-- ⚠️ `recherche_segments_original_v2`, absorbée par la recherche des passages, RESTE en
-- place : la base est partagée avec le site en ligne, et la page déployée l'appelle
-- encore le temps que le correctif se déploie — la retirer ici mettrait la recherche en
-- erreur pendant ces minutes. Elle s'en ira avec les autres RPC sans appelant.
-- ═══════════════════════════════════════════════════════════════════════════════
begin;

drop function if exists public.recherche_segments_v2(text[], text);
drop function if exists public.recherche_versets_v2(text[], text, text);

-- ── 1. Les passages qui répondent, et par quel texte ─────────────────────────
-- Le cœur de la recherche des Pères : l'identifiant de chaque segment qui répond,
-- avec le texte qui a répondu. Les deux lectures publiques (page, répartition) le
-- rejoignent ; la condition n'est écrite qu'ici.
create or replace function public.recherche_segments_v2_corresp(
  p_termes text[],
  p_mode text default 'prefixe'
)
returns table(id bigint, match_fr boolean, match_orig boolean)
language plpgsql
stable
set search_path to 'public', 'extensions', 'pg_temp'
as $$
declare
  termes text[] := public.termes_normalises(p_termes);
  bruts text[];
  motifs text[];
  motifs_orig text[];
  tsq tsquery;
  cond_fr text := 'false';
  cond_orig text := 'false';
begin
  -- Le texte original se cherche en minuscules, sans normalisation d'accent : le grec
  -- en a besoin, et « λόγος » disparaîtrait de la normalisation française.
  select coalesce(array(select distinct btrim(lower(x)) from unnest(coalesce(p_termes, '{}')) x where btrim(x) <> ''), '{}') into bruts;
  if coalesce(array_length(bruts, 1), 0) = 0 then return; end if;
  select array_agg(public.motif_recherche_original(x, p_mode = 'exact')) into motifs_orig from unnest(bruts) x;
  cond_orig := format(
    '(s.texte_original is not null and lower(s.texte_original) ~ %L and lower(s.texte_original) ~ all(%L::text[]))',
    motifs_orig[1], motifs_orig);

  if coalesce(array_length(termes, 1), 0) > 0 then
    if p_mode = 'famille' then
      tsq := plainto_tsquery('french', array_to_string(termes, ' '));
      if tsq::text <> '' then
        cond_fr := format('(to_tsvector(''french'', s.texte_norm) @@ %L::tsquery)', tsq);
      end if;
    else
      select array_agg(public.motif_recherche(x, p_mode = 'exact')) into motifs from unnest(termes) x;
      cond_fr := format('(s.texte_norm ~ %L and s.texte_norm ~ all(%L::text[]))', motifs[1], motifs);
    end if;
  end if;

  -- Les deux conditions entrent en CONSTANTES : le plan se fait sur elles (voir l'en-tête).
  return query execute format($q$
    select s.id, %1$s as match_fr, %2$s as match_orig
    from public.segments s
    join public.oeuvres o on o.id_oeuvre = s.id_oeuvre and o.acces_public
    join public.oeuvre_textes t on t.id_texte = s.id_texte and t.is_default
    where s.nature = any(array['texte','citation','dialogue','vers','rubrique'])
      and (%1$s or %2$s)
  $q$, cond_fr, cond_orig);
end
$$;

-- ── 2. Une page de passages ──────────────────────────────────────────────────
create or replace function public.recherche_segments_v2(
  p_termes text[],
  p_mode text default 'prefixe',
  p_id_oeuvre text default null,
  p_decalage integer default 0,
  p_taille integer default 20
)
returns table(
  id bigint, segment_texte text, texte_original text, id_oeuvre text, id_texte text,
  ref_niv1 text, ref_niv3 text, auteur_nom text, oeuvre_titre text, langue text,
  match_fr boolean, match_orig boolean
)
language sql
stable
set search_path to 'public', 'extensions', 'pg_temp'
as $$
  with c as (
    select * from public.recherche_segments_v2_corresp(p_termes, p_mode)
  ),
  -- Les œuvres publiées et leur CLÉ DE TRI, calculée une fois chacune.
  oe as materialized (
    select o.id_oeuvre, o.titre, a.nom as auteur_nom, o.langue_originale,
           public.norm_fr(coalesce(a.nom, '')) as cle_auteur,
           public.norm_fr(coalesce(o.titre, '')) as cle_titre
    from public.oeuvres o
    left join public.auteurs a on a.id_auteur = o.id_auteur
    where o.acces_public
  )
  -- ⚠️ `langue` est celle de l'ORIGINAL (`oeuvres.langue_originale`) : elle nomme le
  -- texte qui a répondu quand c'est `texte_original` — latin, grec —, jamais celle de
  -- la traduction lue, qui est « Français » sur quarante-cinq textes sur quarante-sept.
  select s.id, s.segment_texte, s.texte_original, s.id_oeuvre, s.id_texte,
         s.ref_niv1, s.ref_niv3, oe.auteur_nom, oe.titre, oe.langue_originale,
         c.match_fr, c.match_orig
  from c
  join public.segments s on s.id = c.id
  join oe on oe.id_oeuvre = s.id_oeuvre
  where p_id_oeuvre is null or s.id_oeuvre = p_id_oeuvre
  order by oe.cle_auteur, oe.cle_titre, s.id_oeuvre, s.segment_numero, s.id
  offset greatest(coalesce(p_decalage, 0), 0)
  limit least(greatest(coalesce(p_taille, 20), 1), 100);
$$;

-- ── 3. La répartition des passages par œuvre ─────────────────────────────────
create or replace function public.recherche_segments_v2_repartition(
  p_termes text[],
  p_mode text default 'prefixe'
)
returns table(id_oeuvre text, auteur_nom text, oeuvre_titre text, n integer)
language sql
stable
set search_path to 'public', 'extensions', 'pg_temp'
as $$
  with c as (
    select * from public.recherche_segments_v2_corresp(p_termes, p_mode)
  ),
  oe as materialized (
    select o.id_oeuvre, o.titre, a.nom as auteur_nom,
           public.norm_fr(coalesce(a.nom, '')) as cle_auteur,
           public.norm_fr(coalesce(o.titre, '')) as cle_titre
    from public.oeuvres o
    left join public.auteurs a on a.id_auteur = o.id_auteur
    where o.acces_public
  )
  select s.id_oeuvre, oe.auteur_nom, oe.titre, count(*)::integer
  from c
  join public.segments s on s.id = c.id
  join oe on oe.id_oeuvre = s.id_oeuvre
  group by s.id_oeuvre, oe.auteur_nom, oe.titre, oe.cle_auteur, oe.cle_titre
  order by oe.cle_auteur, oe.cle_titre, s.id_oeuvre;
$$;

-- ── 4. Les versets qui répondent ─────────────────────────────────────────────
create or replace function public.recherche_versets_v2_ids(
  p_termes text[],
  p_mode text default 'prefixe',
  p_scope text default 'ALL'
)
returns setof text
language plpgsql
stable
set search_path to 'public', 'extensions', 'pg_temp'
as $$
declare
  termes text[] := public.termes_normalises(p_termes);
  motifs text[];
  tsq tsquery;
  cond text;
  cond_scope text := 'true';
begin
  if coalesce(array_length(termes, 1), 0) = 0 then return; end if;
  if p_mode = 'famille' then
    tsq := plainto_tsquery('french', array_to_string(termes, ' '));
    if tsq::text = '' then return; end if;
    cond := format('to_tsvector(''french'', r.texte_norm) @@ %L::tsquery', tsq);
  else
    select array_agg(public.motif_recherche(t, p_mode = 'exact')) into motifs from unnest(termes) t;
    cond := format('r.texte_norm ~ %L and r.texte_norm ~ all(%L::text[])', motifs[1], motifs);
  end if;
  if p_scope is not null and p_scope <> 'ALL' then
    cond_scope := format('r.trad_id = %L', p_scope);
  end if;
  -- En CONSTANTES, comme pour les passages (voir l'en-tête).
  return query execute format(
    'select distinct r.id_verset from public.versets_recherche r where %s and (%s)',
    cond_scope, cond);
end
$$;

-- ── 5. Une page de versets ───────────────────────────────────────────────────
create or replace function public.recherche_versets_v2(
  p_termes text[],
  p_mode text default 'prefixe',
  p_scope text default 'ALL',
  p_livre text default null,
  p_decalage integer default 0,
  p_taille integer default 20
)
returns setof public.versets_lecture
language sql
stable
set search_path to 'public', 'extensions', 'pg_temp'
as $$
  select v.*
  from public.versets_lecture v
  join (select public.recherche_versets_v2_ids(p_termes, p_mode, p_scope) as id_verset) i on i.id_verset = v.id_verset
  where p_livre is null or v.livre = p_livre
  order by v.ordre
  offset greatest(coalesce(p_decalage, 0), 0)
  limit least(greatest(coalesce(p_taille, 20), 1), 100);
$$;

-- ── 6. La répartition des versets par livre ──────────────────────────────────
create or replace function public.recherche_versets_v2_repartition(
  p_termes text[],
  p_mode text default 'prefixe',
  p_scope text default 'ALL'
)
returns table(livre text, n integer)
language sql
stable
set search_path to 'public', 'extensions', 'pg_temp'
as $$
  select v.livre, count(*)::integer
  from public.versets_lecture v
  join (select public.recherche_versets_v2_ids(p_termes, p_mode, p_scope) as id_verset) i on i.id_verset = v.id_verset
  group by v.livre
  order by min(v.ordre);
$$;

-- ── 7. Les droits : le site, jamais l'anonyme ────────────────────────────────
revoke execute on function public.recherche_segments_v2_corresp(text[], text) from public;
revoke execute on function public.recherche_segments_v2(text[], text, text, integer, integer) from public;
revoke execute on function public.recherche_segments_v2_repartition(text[], text) from public;
revoke execute on function public.recherche_versets_v2_ids(text[], text, text) from public;
revoke execute on function public.recherche_versets_v2(text[], text, text, text, integer, integer) from public;
revoke execute on function public.recherche_versets_v2_repartition(text[], text, text) from public;
grant execute on function public.recherche_segments_v2_corresp(text[], text) to authenticated, service_role;
grant execute on function public.recherche_segments_v2(text[], text, text, integer, integer) to authenticated, service_role;
grant execute on function public.recherche_segments_v2_repartition(text[], text) to authenticated, service_role;
grant execute on function public.recherche_versets_v2_ids(text[], text, text) to authenticated, service_role;
grant execute on function public.recherche_versets_v2(text[], text, text, text, integer, integer) to authenticated, service_role;
grant execute on function public.recherche_versets_v2_repartition(text[], text, text) to authenticated, service_role;

commit;
