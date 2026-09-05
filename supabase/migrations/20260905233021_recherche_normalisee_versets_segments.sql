-- ═══════════════════════════════════════════════════════════════════════════════
-- LA RECHERCHE LIT UN TEXTE NORMALISÉ, D'UN SEUL TENANT, POUR LA BIBLE COMME POUR
-- LES PÈRES (audit du système de recherche, 2026-09-06).
--
-- ⛔ CE QUI MANQUAIT — LA BIBLE N'ÉTAIT PAS NORMALISÉE, ET ELLE N'ÉTAIT PAS INDEXÉE.
-- `recherche_versets` balayait la vue matérialisée `versets_lecture` colonne par
-- colonne (`unaccent(lower("TR0001")) like '%…%'`, cinq fois), sans qu'aucun index
-- puisse servir : 890 ms mesurées pour « espérance » sur toutes les bibles, 36 000
-- lignes lues à chaque frappe. Et surtout, `unaccent` n'est pas la normalisation du
-- site : la Bible de Sacy écrit « étoit », « avoit », « connoître », et « était » n'y
-- trouvait RIEN — 0 verset, contre 2 267 par `norm_fr`, la fonction qui porte déjà
-- `segments.texte_norm` et qui ramène ces graphies au français d'aujourd'hui.
--
-- ⛔ CE QUI DIVERGEAIT — DEUX MOTS NE SE CHERCHAIENT PAS COMME UN SEUL. Un mot seul
-- passait par la base normalisée (`texte_norm`, index trigramme, 24 ms) ; deux mots
-- passaient par un `ilike` du navigateur sur `segment_texte` BRUT, sensible aux accents
-- et aveugle aux graphies anciennes (342 ms). Le lecteur qui tapait « fils de Dieu »
-- ne cherchait pas dans le même texte que celui qui tapait « fils ».
--
-- ✅ CE QUI ENTRE.
--   · `versets_recherche` : une vue matérialisée, une ligne par verset ET par bible,
--     `texte_norm = norm_fr(texte)`, un index trigramme et un index plein texte
--     français — la forme exacte de `segments.texte_norm`, et les mêmes index.
--     Elle se rafraîchit DANS LE MÊME GESTE que `versets_lecture`, dont elle dérive :
--     `rafraichir_versets_lecture` l'enchaîne, et rien d'autre ne l'écrit.
--   · Trois RPC `_v2` qui reçoivent un TABLEAU de termes et un MODE :
--     `recherche_versets_v2`, `recherche_segments_v2`, `recherche_segments_original_v2`.
--     Chaque terme est normalisé par `norm_fr` côté base ; tous doivent se trouver dans
--     la MÊME bible, ou le même segment. Trois modes : « prefixe » (début de mot),
--     « exact » (mot entier), « famille » (la racine que la recherche plein texte
--     française connaît : « aimer » trouve aime, aimait, aimé — l'index existait sur
--     `segments` depuis toujours, et rien ne le lisait).
--   · `lexemes_recherche` : les racines d'une saisie, pour que la page MARQUE dans le
--     texte ce que le mode « famille » a trouvé.
--   · `graphies_latines` : « jesus » se lit « iesus » et « jesvs » dans un texte
--     original. La règle vivait dans le navigateur, qui l'appliquait aussi au français
--     normalisé — qui ne la connaît pas — en autant d'appels séquentiels.
--
-- ⛔ Les RPC d'avant ne sont PAS retirées : `recherche_segments`, `recherche_versets
-- (p_terme, p_scope)` et `recherche_segments_original` restent, pour ce qui pourrait
-- encore les appeler hors du site. Deux fonctions seulement partent, parce qu'elles
-- lisaient une table qui N'EXISTE PLUS (`versets`) et ne pouvaient donc que lever :
-- `recherche_versets(p_terme, p_trad, p_exact)` — qui rendait en outre l'appel
-- `recherche_versets(text, text)` AMBIGU (« function is not unique ») — et
-- `recherche_versets_normalise`.
--
-- ⚠️ Un terme normalisé ne contient que [a-z0-9 ] : il entre dans une expression
-- rationnelle sans échappement. C'est `norm_fr` qui le garantit, pas l'appelant.
--
-- ⚠️ La sûreté d'un plan : chaque RPC ancre l'index sur le PREMIER motif
-- (`texte_norm ~ motifs[1]`) puis revérifie tous les motifs (`~ all(motifs)`) : un
-- `ALL` seul sur un tableau ne promet pas l'index, le premier motif seul le promet.
-- ═══════════════════════════════════════════════════════════════════════════════
begin;
-- ⚠️ Bâtir la table et ses deux index prend une vingtaine de secondes : au-delà de ce
-- que l'API accorde à une instruction. La borne se lève pour CETTE transaction, et
-- pour elle seule.
set local statement_timeout = '300s';

-- ── 1. La table de recherche des versets ─────────────────────────────────────
drop materialized view if exists public.versets_recherche;
create materialized view public.versets_recherche as
select v.id_verset, t.trad_id, v.livre, v.chapitre, v.verset, v.ordre, public.norm_fr(t.texte) as texte_norm
from public.versets_lecture v
cross join lateral (values
  ('TR0001', v."TR0001"), ('TR0002', v."TR0002"), ('TR0003', v."TR0003"),
  ('TR0004', v."TR0004"), ('TR0005', v."TR0005")
) as t(trad_id, texte)
where coalesce(t.texte, '') <> '';

comment on materialized view public.versets_recherche is
  'Une ligne par verset et par bible, texte normalisé par norm_fr (accents, casse, graphies anciennes). Dérive de versets_lecture et se rafraîchit avec elle (rafraichir_versets_lecture). Ne s''écrit jamais à la main.';

-- L'index UNIQUE que `refresh … concurrently` exige, puis les deux index de recherche —
-- ceux de `segments.texte_norm`, à l'identique.
create unique index versets_recherche_id_trad_uq on public.versets_recherche (id_verset, trad_id);
create index versets_recherche_trgm on public.versets_recherche using gin (texte_norm extensions.gin_trgm_ops);
create index versets_recherche_fts on public.versets_recherche using gin (to_tsvector('french', texte_norm));

grant select on public.versets_recherche to authenticated, service_role;

-- ── 2. Le rafraîchissement l'enchaîne ────────────────────────────────────────
-- Même signature, même verrou, même compteur qu'avant (20260829183000 et 20260829190000) :
-- seul s'ajoute le second `refresh`, mesuré à part dans le message rendu.
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
  v_ms_rech integer;
begin
  -- ⛔ Jamais deux rafraîchissements de front. Le verrou est TRANSACTIONNEL : il se
  -- relâche seul, même si la fonction échoue.
  if not pg_try_advisory_xact_lock(8140299) then
    return 'ignoré : un rafraîchissement est déjà en cours';
  end if;
  -- ⛔ La séquence se lit AVANT le rafraîchissement, et avec `is_called` : voir
  -- 20260829183000 et 20260829190000.
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
  -- ⚠️ La table de recherche DÉRIVE de la vue de lecture : elle se rafraîchit après
  -- elle, dans la même transaction, et jamais seule. Concurremment aussi : une
  -- recherche ne s'arrête pas pendant qu'on la rebâtit (mesuré à la création :
  -- une vingtaine de secondes, dont six de normalisation et douze d'index).
  v_debut := clock_timestamp();
  refresh materialized view concurrently public.versets_recherche;
  v_ms_rech := (extract(epoch from (clock_timestamp() - v_debut)) * 1000)::integer;
  update internal.versets_lecture_etat
     set version_vue              = v_version,
         dernier_rafraichissement = now(),
         derniere_duree_ms        = v_ms + v_ms_rech,
         rafraichissements        = rafraichissements + 1
   where id;
  return format('rafraîchie en %s ms (version %s), recherche en %s ms', v_ms, v_version, v_ms_rech);
end
$$;

-- ── 3. Les briques : motifs et graphies ──────────────────────────────────────

-- Le motif d'un terme NORMALISÉ : en début de mot, ou en mot entier. Dans un texte
-- normalisé, la ponctuation est déjà une espace : la frontière de mot est l'espace.
create or replace function public.motif_recherche(p_terme text, p_exact boolean default false)
returns text
language sql
immutable parallel safe
set search_path to 'public', 'pg_temp'
as $$
  select '(^|[[:space:]])' || p_terme || case when p_exact then '([[:space:]]|$)' else '' end;
$$;

-- Les graphies d'un mot LATIN dans un texte original : u/v et i/j se valent. La règle
-- est celle que le navigateur appliquait (`graphiesVariantes`), portée ici pour que
-- la base cherche les quatre formes d'un coup, dans une seule expression.
create or replace function public.graphies_latines(p_mot text)
returns text[]
language sql
immutable parallel safe
set search_path to 'public', 'pg_temp'
as $$
  select array(
    select distinct g from unnest(array[
      p_mot,
      case when p_mot like '%j%' then replace(p_mot, 'j', 'i') end,
      case when p_mot ~ '^i[aeiouy]' then 'j' || substr(p_mot, 2) end,
      case when p_mot like '%v%' then replace(p_mot, 'v', 'u') end,
      case when p_mot like '%u%' then replace(p_mot, 'u', 'v') end
    ]) as g
    where g is not null and length(g) >= 2
    order by g
  );
$$;

-- Le motif d'un terme dans un texte ORIGINAL : ses graphies en alternance. Le terme
-- arrive en minuscules, sans normalisation d'accent — le grec en a besoin —, et
-- s'échappe : un texte original n'a pas passé par `norm_fr`.
create or replace function public.motif_recherche_original(p_terme text, p_exact boolean default false)
returns text
language sql
immutable parallel safe
set search_path to 'public', 'pg_temp'
as $$
  select '(^|[[:space:]])(' ||
         (select string_agg(regexp_replace(g, '([.*+?^${}()|\[\]\\])', '\\\1', 'g'), '|') from unnest(public.graphies_latines(lower(p_terme))) g) ||
         ')' || case when p_exact then '([[:space:]]|$)' else '' end;
$$;

-- Les termes d'une saisie, normalisés et vidés de ce qui ne fait pas un mot.
create or replace function public.termes_normalises(p_termes text[])
returns text[]
language sql
immutable parallel safe
set search_path to 'public', 'pg_temp'
as $$
  select coalesce(array(
    select distinct t from (select btrim(public.norm_fr(x)) as t from unnest(coalesce(p_termes, '{}')) x) s
    where t <> ''
  ), '{}');
$$;

-- Les RACINES d'une saisie, telles que la recherche plein texte française les lit :
-- « aimer espérance » → {aim, esper}. La page marque dans le texte les mots qui
-- commencent par l'une d'elles quand le mode « famille » a trouvé la ligne.
create or replace function public.lexemes_recherche(p_termes text[])
returns text[]
language sql
stable
set search_path to 'public', 'extensions', 'pg_temp'
as $$
  select coalesce(array(
    select distinct l from unnest(tsvector_to_array(to_tsvector('french', array_to_string(public.termes_normalises(p_termes), ' ')))) l
    order by l
  ), '{}');
$$;

-- ── 4. Les trois recherches ──────────────────────────────────────────────────

-- LA BIBLE. Tous les termes dans la MÊME bible (celle du périmètre, ou n'importe
-- laquelle si « ALL ») ; les lignes rendues sont celles de `versets_lecture`, dans
-- l'ordre du canon, pour que la page n'ait rien à changer à ce qu'elle affiche.
create or replace function public.recherche_versets_v2(
  p_termes text[],
  p_mode text default 'prefixe',
  p_scope text default 'ALL'
)
returns setof public.versets_lecture
language plpgsql
stable
set search_path to 'public', 'extensions', 'pg_temp'
as $$
declare
  termes text[] := public.termes_normalises(p_termes);
  motifs text[];
  tsq tsquery;
begin
  if coalesce(array_length(termes, 1), 0) = 0 then return; end if;
  if p_mode = 'famille' then
    tsq := plainto_tsquery('french', array_to_string(termes, ' '));
    if tsq::text = '' then return; end if;
    return query
      select v.* from public.versets_lecture v
      where exists (
        select 1 from public.versets_recherche r
        where r.id_verset = v.id_verset
          and (p_scope = 'ALL' or r.trad_id = p_scope)
          and to_tsvector('french', r.texte_norm) @@ tsq
      )
      order by v.ordre
      limit 6000;
    return;
  end if;
  select array_agg(public.motif_recherche(t, p_mode = 'exact')) into motifs from unnest(termes) t;
  return query
    select v.* from public.versets_lecture v
    where exists (
      select 1 from public.versets_recherche r
      where r.id_verset = v.id_verset
        and (p_scope = 'ALL' or r.trad_id = p_scope)
        and r.texte_norm ~ motifs[1]
        and r.texte_norm ~ all(motifs)
    )
    order by v.ordre
    limit 6000;
end
$$;

-- LES PÈRES. Le texte français normalisé des segments, restreint à ce qui se LIT :
-- les natures de texte, le texte par défaut de chaque œuvre, et ⛔ les seules œuvres
-- PUBLIÉES — l'ancienne RPC rendait aussi celles qui ne le sont pas, et la page les
-- chargeait pour les jeter. Ordre stable : l'œuvre, puis la place du segment.
create or replace function public.recherche_segments_v2(
  p_termes text[],
  p_mode text default 'prefixe'
)
returns table(id bigint, segment_texte text, id_oeuvre text, id_texte text, ref_niv1 text, ref_niv3 text)
language plpgsql
stable
set search_path to 'public', 'extensions', 'pg_temp'
as $$
declare
  termes text[] := public.termes_normalises(p_termes);
  motifs text[];
  tsq tsquery;
begin
  if coalesce(array_length(termes, 1), 0) = 0 then return; end if;
  if p_mode = 'famille' then
    tsq := plainto_tsquery('french', array_to_string(termes, ' '));
    if tsq::text = '' then return; end if;
    return query
      select s.id, s.segment_texte, s.id_oeuvre, s.id_texte, s.ref_niv1, s.ref_niv3
      from public.segments s
      join public.oeuvres o on o.id_oeuvre = s.id_oeuvre and o.acces_public
      join public.oeuvre_textes t on t.id_texte = s.id_texte and t.is_default
      where s.nature = any(array['texte','citation','dialogue','vers','rubrique'])
        and to_tsvector('french', s.texte_norm) @@ tsq
      order by s.id_oeuvre, s.segment_numero, s.id
      limit 5000;
    return;
  end if;
  select array_agg(public.motif_recherche(x, p_mode = 'exact')) into motifs from unnest(termes) x;
  return query
    select s.id, s.segment_texte, s.id_oeuvre, s.id_texte, s.ref_niv1, s.ref_niv3
    from public.segments s
    join public.oeuvres o on o.id_oeuvre = s.id_oeuvre and o.acces_public
    join public.oeuvre_textes t on t.id_texte = s.id_texte and t.is_default
    where s.nature = any(array['texte','citation','dialogue','vers','rubrique'])
      and s.texte_norm ~ motifs[1]
      and s.texte_norm ~ all(motifs)
    order by s.id_oeuvre, s.segment_numero, s.id
    limit 5000;
end
$$;

-- LE TEXTE ORIGINAL (latin, grec). Les termes en minuscules, chacun sous ses graphies
-- latines ; pas de mode « famille », la recherche plein texte n'ayant de racines ni
-- pour le latin ni pour le grec.
create or replace function public.recherche_segments_original_v2(
  p_termes text[],
  p_exact boolean default false
)
returns table(id bigint, segment_texte text, texte_original text, id_oeuvre text, id_texte text, langue text, ref_niv1 text, ref_niv3 text)
language plpgsql
stable
set search_path to 'public', 'extensions', 'pg_temp'
as $$
declare
  termes text[];
  motifs text[];
begin
  select coalesce(array(select distinct btrim(lower(x)) from unnest(coalesce(p_termes, '{}')) x where btrim(x) <> ''), '{}') into termes;
  if coalesce(array_length(termes, 1), 0) = 0 then return; end if;
  select array_agg(public.motif_recherche_original(x, p_exact)) into motifs from unnest(termes) x;
  return query
    select s.id, s.segment_texte, s.texte_original, s.id_oeuvre, s.id_texte,
           coalesce(t.langue, o.langue_originale), s.ref_niv1, s.ref_niv3
    from public.segments s
    join public.oeuvres o on o.id_oeuvre = s.id_oeuvre and o.acces_public
    join public.oeuvre_textes t on t.id_texte = s.id_texte and t.is_default
    where s.nature = any(array['texte','citation','dialogue','vers','rubrique'])
      and s.texte_original is not null
      and lower(s.texte_original) ~ motifs[1]
      and lower(s.texte_original) ~ all(motifs)
    order by s.id_oeuvre, s.segment_numero, s.id
    limit 5000;
end
$$;

-- ── 5. Ce qui part : deux fonctions sur une table disparue ───────────────────
drop function if exists public.recherche_versets(text, text, boolean);
drop function if exists public.recherche_versets_normalise(text, text);

-- ── 6. Les droits : le site, jamais l'anonyme ────────────────────────────────
revoke execute on function public.recherche_versets_v2(text[], text, text) from public;
revoke execute on function public.recherche_segments_v2(text[], text) from public;
revoke execute on function public.recherche_segments_original_v2(text[], boolean) from public;
revoke execute on function public.lexemes_recherche(text[]) from public;
grant execute on function public.recherche_versets_v2(text[], text, text) to authenticated, service_role;
grant execute on function public.recherche_segments_v2(text[], text) to authenticated, service_role;
grant execute on function public.recherche_segments_original_v2(text[], boolean) to authenticated, service_role;
grant execute on function public.lexemes_recherche(text[]) to authenticated, service_role;
grant execute on function public.motif_recherche(text, boolean) to authenticated, service_role;
grant execute on function public.motif_recherche_original(text, boolean) to authenticated, service_role;
grant execute on function public.graphies_latines(text) to authenticated, service_role;
grant execute on function public.termes_normalises(text[]) to authenticated, service_role;

commit;
