-- La RECHERCHE lit la langue originale dans les TEXTES ORIGINAUX eux-mêmes.
--
-- ⛔ Règle « une seule occurrence de chaque texte » (2026-08-24) : un original vit dans
-- ses propres `segments`, sous son propre `id_texte`, et l'alignement dit sa
-- correspondance avec la traduction. La recherche lisait encore la copie recollée dans
-- `segments.texte_original`, c'est-à-dire cinq œuvres sur les vingt originaux publiés, et
-- ignorait le grec de la Didachè, le latin de Boèce ou celui de la Cité de Dieu.
--
-- Ce que fait ce lot :
--  1. `recherche_segments_v2_corresp` cherche l'original dans les segments de chaque
--     texte ORIGINAL publié (sans traducteur, dans la langue de l'œuvre, public, non
--     retiré, œuvre publique), puis rattache chaque passage trouvé à la traduction lue en
--     regard par `texte_alignement_membres` : la traduction par défaut d'abord, sinon une
--     autre traduction publique alignée. Sans alignement, le passage renvoie au texte
--     original lui-même.
--  2. `recherche_segments_v2` rend l'extrait original (`extrait_original`) et dit s'il
--     faut ouvrir la page en regard (`en_regard`).
--  3. `recherche_segments_original_v2` (hors site, gardée pour les contrôles) lit les
--     mêmes segments ; les deux `recherche_segments_original` d'avant la v2, que rien
--     n'appelle, sont retirées.
--  4. `rafraichir_lexique_grec` ne lit plus la copie : le grec des textes propres y
--     entrait déjà.
--
-- ⛔ AUCUN REPLI sur `texte_original` : au 2026-09-24, les cinq œuvres qui portent
-- encore la copie (Confessions, Jonas, Joël, Abdias, Ratramne) ont chacune leur original
-- publié et aligné, et chacun de leurs 1 135 segments a son vis-à-vis dans les tables.
--
-- ⚠️ `~*` et non `lower(x) ~` : l'index trigramme `idx_segments_texte_trgm` porte
-- `segment_texte` tel quel, et pg_trgm sait servir une expression rationnelle
-- insensible à la casse. Mesuré à chaud sous `authenticated`, fonction entière
-- (avant → après) : « deus » 242 → 352 ms pour 262 → 1 075 passages originaux,
-- « iesus » 9 → 92 passages, « λόγος » 0 → 13, « et » 3,3 → 4,5 s ; le français ne bouge
-- pas (« dieu » 287 → 329 ms). Le rattachement ne lit que le PREMIER membre traduit de
-- chaque groupe (latéral sur l'index (alignment_id, role, member_order)) : lire tout le
-- groupe coûtait 5 s à froid sur « deus ».

drop function if exists public.recherche_segments_v2(text[], text, text, integer, integer);
drop function if exists public.recherche_segments_v2_corresp(text[], text);
drop function if exists public.recherche_segments_original(text, boolean);
drop function if exists public.recherche_segments_original(text, boolean, text);

create function public.recherche_segments_v2_corresp(p_termes text[], p_mode text default 'prefixe')
returns table(id bigint, match_fr boolean, match_orig boolean, extrait_original text, en_regard boolean)
language plpgsql
stable security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $function$
declare
  termes text[] := public.termes_normalises(p_termes);
  bruts text[];
  motifs text[];
  motifs_orig text[];
  tsq tsquery;
  cond_fr text := 'false';
  cond_orig text := 'false';
begin
  -- Le texte original se cherche sans normalisation d'accent : le grec en a besoin, et
  -- « λόγος » disparaîtrait de la normalisation française.
  select coalesce(array(select distinct btrim(lower(x)) from unnest(coalesce(p_termes, '{}')) x where btrim(x) <> ''), '{}') into bruts;
  if coalesce(array_length(bruts, 1), 0) = 0 then return; end if;
  select array_agg(public.motif_recherche_original(x, p_mode = 'exact')) into motifs_orig from unnest(bruts) x;
  cond_orig := format('(s.segment_texte ~* %L and s.segment_texte ~* all(%L::text[]))', motifs_orig[1], motifs_orig);

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

  -- ⛔ LA GARDE DE PUBLICATION EST ÉCRITE ICI, parce que la politique de lecture ne
  -- s'applique plus (definer). Traduction : œuvre publique, texte par défaut ET public.
  -- Original : œuvre publique, texte public et non retiré, sans traducteur, dans la
  -- langue de l'œuvre ; et la traduction qui le reçoit en regard, publique elle aussi,
  -- ce qui est la condition même de `rls_private.public_alignment_set_ids`.
  return query execute format($q$
    with fr as (
      select s.id
      from public.segments s
      join public.oeuvres o on o.id_oeuvre = s.id_oeuvre and o.acces_public
      join public.oeuvre_textes t on t.id_texte = s.id_texte and t.is_default and t.is_public
      where s.nature = any(array['texte','citation','dialogue','vers','rubrique'])
        and %1$s
    ),
    originaux as (
      select t.id_texte, t.id_oeuvre
      from public.oeuvre_textes t
      join public.oeuvres o on o.id_oeuvre = t.id_oeuvre and o.acces_public
       and lower(btrim(t.langue)) = lower(btrim(o.langue_originale))
      where t.is_public
        and coalesce(btrim(t.traducteur), '') = ''
        and coalesce(t.statut, '') <> 'invalide'
    ),
    orig as (
      select s.id, s.id_texte, s.segment_key, s.segment_numero, s.segment_texte
      from originaux t
      join public.segments s on s.id_texte = t.id_texte
      where s.nature = any(array['texte','citation','dialogue','vers','rubrique'])
        and %2$s
    ),
    -- La traduction lue en regard de chaque original : celle par défaut d'abord, puis
    -- l'ensemble d'identifiant le plus bas, pour que rien ne dépende de l'ordre d'arrivée.
    cible as (
      select distinct on (x.orig_texte) x.orig_texte, x.trad_texte, x.role_trad, x.alignment_set_id
      from (
        select e.reference_text_id as orig_texte, e.aligned_text_id as trad_texte, 'aligned'::text as role_trad,
               e.alignment_set_id, e.id_oeuvre
        from public.texte_alignement_ensembles e
        union all
        select e.aligned_text_id, e.reference_text_id, 'reference'::text, e.alignment_set_id, e.id_oeuvre
        from public.texte_alignement_ensembles e
      ) x
      join originaux og on og.id_texte = x.orig_texte and og.id_oeuvre = x.id_oeuvre
      join public.oeuvre_textes tt on tt.id_texte = x.trad_texte and tt.id_oeuvre = x.id_oeuvre
       and tt.is_public and coalesce(tt.statut, '') <> 'invalide'
      where not exists (select 1 from originaux o2 where o2.id_texte = x.trad_texte)
      order by x.orig_texte, tt.is_default desc, x.alignment_set_id
    ),
    -- Un segment original n'appartient qu'à un groupe par ensemble (index unique
    -- texte_alignement_membres_segment_ensemble_uq) ; le groupe s'ouvre sur son PREMIER
    -- segment traduit, lu par l'index (alignment_id, role, member_order).
    rattache as (
      select o.id as orig_id, st.id as trad_id
      from orig o
      join cible c on c.orig_texte = o.id_texte
      join public.texte_alignement_membres m
        on m.alignment_set_id = c.alignment_set_id and m.id_texte = o.id_texte and m.segment_key = o.segment_key
      cross join lateral (
        select m2.segment_key
        from public.texte_alignement_membres m2
        where m2.alignment_id = m.alignment_id and m2.role = c.role_trad
        order by m2.member_order
        limit 1
      ) premier
      join public.segments st on st.id_texte = c.trad_texte and st.segment_key = premier.segment_key
    ),
    trouves as (
      select coalesce(r.trad_id, o.id) as id,
             bool_or(r.trad_id is not null) as en_regard,
             string_agg(o.segment_texte, ' ' order by o.segment_numero, o.id) as extrait
      from orig o
      left join rattache r on r.orig_id = o.id
      group by coalesce(r.trad_id, o.id)
    )
    select coalesce(f.id, tr.id), f.id is not null, tr.id is not null, tr.extrait, coalesce(tr.en_regard, false)
    from fr f
    full join trouves tr on tr.id = f.id
  $q$, cond_fr, cond_orig);
end
$function$;

create function public.recherche_segments_v2(p_termes text[], p_mode text default 'prefixe', p_id_oeuvre text default null, p_decalage integer default 0, p_taille integer default 20)
returns table(id bigint, segment_texte text, extrait_original text, id_oeuvre text, id_texte text, ref_niv1 text, ref_niv3 text, auteur_nom text, oeuvre_titre text, langue text, match_fr boolean, match_orig boolean, en_regard boolean)
language sql
stable security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $function$
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
  -- texte qui a répondu quand c'est l'original, jamais celle de la traduction lue.
  -- `extrait_original` est lu dans les segments du texte original ; `en_regard` dit que
  -- le passage a été rattaché à une traduction par l'alignement.
  select s.id, s.segment_texte, c.extrait_original, s.id_oeuvre, s.id_texte,
         s.ref_niv1, s.ref_niv3, oe.auteur_nom, oe.titre, oe.langue_originale,
         c.match_fr, c.match_orig, c.en_regard
  from c
  join public.segments s on s.id = c.id
  join oe on oe.id_oeuvre = s.id_oeuvre
  where p_id_oeuvre is null or s.id_oeuvre = p_id_oeuvre
  order by oe.cle_auteur, oe.cle_titre, s.id_oeuvre, s.id_texte, s.segment_numero, s.id
  offset greatest(coalesce(p_decalage, 0), 0)
  limit least(greatest(coalesce(p_taille, 20), 1), 100);
$function$;

-- Même contrat qu'avant (la colonne de sortie `texte_original` garde son nom), mais lue
-- dans les segments du texte original. Fonction INVOKER : la RLS de `segments` s'applique.
create or replace function public.recherche_segments_original_v2(p_termes text[], p_exact boolean default false)
returns table(id bigint, segment_texte text, texte_original text, id_oeuvre text, id_texte text, langue text, ref_niv1 text, ref_niv3 text)
language plpgsql
stable
set search_path to 'public', 'extensions', 'pg_temp'
as $function$
declare
  termes text[];
  motifs text[];
begin
  select coalesce(array(select distinct btrim(lower(x)) from unnest(coalesce(p_termes, '{}')) x where btrim(x) <> ''), '{}') into termes;
  if coalesce(array_length(termes, 1), 0) = 0 then return; end if;
  select array_agg(public.motif_recherche_original(x, p_exact)) into motifs from unnest(termes) x;
  return query
    select s.id, s.segment_texte, s.segment_texte, s.id_oeuvre, s.id_texte, t.langue, s.ref_niv1, s.ref_niv3
    from public.oeuvre_textes t
    join public.oeuvres o on o.id_oeuvre = t.id_oeuvre and o.acces_public
     and lower(btrim(t.langue)) = lower(btrim(o.langue_originale))
    join public.segments s on s.id_texte = t.id_texte
    where t.is_public
      and coalesce(btrim(t.traducteur), '') = ''
      and coalesce(t.statut, '') <> 'invalide'
      and s.nature = any(array['texte','citation','dialogue','vers','rubrique'])
      and s.segment_texte ~* motifs[1]
      and s.segment_texte ~* all(motifs)
    order by s.id_oeuvre, s.segment_numero, s.id
    limit 5000;
end
$function$;

create or replace function public.rafraichir_lexique_grec()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare nb integer;
begin
  truncate public.concordance_lexique_grec;

  insert into public.concordance_lexique_grec (mot, mot_norm, cle_latine, freq)
  with brut as (
    select regexp_split_to_table(v."TR0005", '[^[:alnum:]]+') as mot
      from public.versets_lecture v
     where coalesce(v."TR0005", '') <> ''
    union all
    -- ⛔ Charte § 52 : seul ce qui se lit entre au lexique. Le grec des œuvres vit dans
    -- ses textes propres ; la copie recollée dans les traductions n'est plus lue.
    select regexp_split_to_table(s.segment_texte, '[^[:alnum:]]+')
      from public.segments s
      join public.oeuvre_textes t on t.id_texte = s.id_texte and t.is_public
      join public.oeuvres o on o.id_oeuvre = s.id_oeuvre and o.acces_public
     where t.langue ilike '%grec%' and coalesce(s.segment_texte, '') <> ''
  ),
  normes as (
    select mot, public.norm_gr(mot) as norm from brut where length(mot) >= 2
  ),
  grecs as (
    select mot, norm from normes
     where norm ~ '^[αβγδεζηθικλμνξοπρστυφχψω]{2,}$'
  ),
  par_forme as (
    select mot, norm, count(*)::int as occurrences from grecs group by mot, norm
  ),
  par_groupe as (
    select norm,
           (array_agg(mot order by occurrences desc, mot))[1] as forme,
           sum(occurrences)::int as total
      from par_forme group by norm
  )
  select forme, norm, public.cle_grec_latine(forme), total from par_groupe;

  get diagnostics nb = row_count;
  analyze public.concordance_lexique_grec;
  return nb;
end $function$;

revoke all on function public.recherche_segments_v2_corresp(text[], text) from public, anon;
revoke all on function public.recherche_segments_v2(text[], text, text, integer, integer) from public, anon;
grant execute on function public.recherche_segments_v2_corresp(text[], text) to authenticated, service_role;
grant execute on function public.recherche_segments_v2(text[], text, text, integer, integer) to authenticated, service_role;
