-- L'atelier d'alignement : poser une frontière à la main (charte § 12.2, règle 2).
--
-- Jusqu'ici le site ne faisait que LIRE les trois tables d'alignement, et tous les
-- ensembles venaient de scripts ponctuels ou de migrations. L'atelier de
-- l'administration (`/admin/alignements`) coupe un groupe à une jonction de segments et
-- fusionne deux groupes voisins. La logique de la coupe vit dans un module pur
-- (`app/lib/atelierAlignement.ts`, testé) ; ces fonctions ne font qu'appliquer son plan
-- d'un seul tenant, et refusent tout plan bâti sur un état qui a changé depuis.
--
-- ⛔ Réservées à la clé de service : la route `/api/admin/alignements` vérifie
-- l'administrateur, puis appelle. Ni `anon` ni `authenticated` ne les exécutent.

-- ── La mesure ────────────────────────────────────────────────────────────────
-- Les membres d'un texte dans un ensemble, DANS L'ORDRE DE LECTURE (`segment_numero`,
-- jamais `rang`, qui repart à 1 à chaque paragraphe), avec ce que la mesure du grain
-- demande et rien de plus : la longueur du texte, non le texte. Un seul jsonb, pour
-- échapper au plafond de lignes de PostgREST.
-- Chaque entrée : [segment_key, alignment_id, book, canonical_division_order,
--                  group_order, ref_niv1, ref_niv2, ref_niv3, paragraphe, longueur]
create or replace function public.atelier_alignement_mesures(p_set text, p_id_texte text)
returns jsonb
language sql
stable
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_array(
           x.segment_key, x.alignment_id, x.book, x.canonical_division_order, x.group_order,
           x.ref_niv1, x.ref_niv2, x.ref_niv3, x.paragraphe, x.longueur)
         order by x.segment_numero), '[]'::jsonb)
  from (
    select s.segment_key, m.alignment_id, a.book, a.canonical_division_order, a.group_order,
           s.ref_niv1, s.ref_niv2, s.ref_niv3, s.paragraphe,
           length(coalesce(s.segment_texte, '')) as longueur, s.segment_numero
    from public.texte_alignement_membres m
    join public.texte_alignements a
      on a.alignment_id = m.alignment_id and a.alignment_set_id = m.alignment_set_id
    join public.segments s
      on s.id_texte = m.id_texte and s.segment_key = m.segment_key
    where m.alignment_set_id = p_set and m.id_texte = p_id_texte
  ) x
$$;

-- ── Réécrire les membres d'un groupe ─────────────────────────────────────────
-- Les membres se réécrivent en bloc : leur clé primaire est (alignment_id, role,
-- member_order), et renuméroter sur place heurterait l'unicité à mi-chemin. On garde la
-- métadonnée et la date de chaque membre, qui disent d'où il vient.
create or replace function public.atelier_alignement_poser_membres(
  p_set text,
  p_groupe text,
  p_role text,
  p_id_texte text,
  p_cles text[],
  p_anciens jsonb
) returns void
language sql
set search_path = public, pg_temp
as $$
  insert into public.texte_alignement_membres
    (alignment_set_id, alignment_id, role, member_order, id_texte, segment_key, metadata, created_at)
  select p_set, p_groupe, p_role, t.ordre::int, p_id_texte, t.cle,
         coalesce(p_anciens -> (p_role || '|' || t.cle) -> 'metadata', '{}'::jsonb),
         coalesce((p_anciens -> (p_role || '|' || t.cle) ->> 'created_at')::timestamptz, now())
  from unnest(p_cles) with ordinality as t(cle, ordre)
$$;

-- Vrai quand deux listes portent les mêmes clés, sans doublon, en ignorant l'ordre.
create or replace function public.atelier_alignement_memes_cles(p_a text[], p_b text[])
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select coalesce(array_length(p_a, 1), 0) = coalesce(array_length(p_b, 1), 0)
     and coalesce(array_length(p_a, 1), 0) = (select count(distinct c) from unnest(p_a) c)
     and coalesce((select array_agg(c order by c) from unnest(p_a) c), '{}')
       = coalesce((select array_agg(c order by c) from unnest(p_b) c), '{}')
$$;

-- ── Couper ───────────────────────────────────────────────────────────────────
-- Le groupe garde la tête, un nouveau groupe prend la suite, posé juste après lui dans
-- sa division : les groupes suivants de la même division reculent d'un rang.
create or replace function public.atelier_alignement_couper(
  p_set text,
  p_groupe text,
  p_nouveau text,
  p_reference_garde text[],
  p_aligned_garde text[],
  p_reference_part text[],
  p_aligned_part text[],
  p_cardinalite_garde text,
  p_cardinalite_part text,
  p_trace jsonb
) returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare
  g public.texte_alignements%rowtype;
  v_ref text;
  v_ali text;
  v_anciens jsonb;
  v_ref_actuels text[];
  v_ali_actuels text[];
begin
  select * into g from public.texte_alignements
   where alignment_id = p_groupe and alignment_set_id = p_set
   for update;
  if not found then
    raise exception 'Groupe % introuvable dans l''ensemble %', p_groupe, p_set;
  end if;

  select reference_text_id, aligned_text_id into v_ref, v_ali
    from public.texte_alignement_ensembles where alignment_set_id = p_set;

  select coalesce(array_agg(segment_key) filter (where role = 'reference'), '{}'),
         coalesce(array_agg(segment_key) filter (where role = 'aligned'), '{}'),
         coalesce(jsonb_object_agg(role || '|' || segment_key,
                    jsonb_build_object('metadata', metadata, 'created_at', created_at)), '{}'::jsonb)
    into v_ref_actuels, v_ali_actuels, v_anciens
    from public.texte_alignement_membres
   where alignment_id = p_groupe and alignment_set_id = p_set;

  -- ⛔ Le plan a été bâti sur un état : s'il a changé depuis, on refuse tout.
  if not public.atelier_alignement_memes_cles(v_ref_actuels, coalesce(p_reference_garde, '{}') || coalesce(p_reference_part, '{}'))
     or not public.atelier_alignement_memes_cles(v_ali_actuels, coalesce(p_aligned_garde, '{}') || coalesce(p_aligned_part, '{}')) then
    raise exception 'Le groupe % a changé depuis son affichage : rechargez l''atelier', p_groupe;
  end if;
  if coalesce(array_length(p_reference_garde, 1), 0) + coalesce(array_length(p_aligned_garde, 1), 0) = 0
     or coalesce(array_length(p_reference_part, 1), 0) + coalesce(array_length(p_aligned_part, 1), 0) = 0 then
    raise exception 'Une coupe laisse un groupe vide';
  end if;

  -- Les groupes suivants de la division reculent d'un rang. En deux temps : l'unicité
  -- (ensemble, livre, division, rang) n'est pas différée et se heurterait à mi-course.
  update public.texte_alignements
     set group_order = group_order + 1000000
   where alignment_set_id = p_set and book = g.book
     and canonical_division_order = g.canonical_division_order
     and group_order > g.group_order;
  update public.texte_alignements
     set group_order = group_order - 999999
   where alignment_set_id = p_set and book = g.book
     and canonical_division_order = g.canonical_division_order
     and group_order > 1000000;

  insert into public.texte_alignements
    (alignment_id, alignment_set_id, book, canonical_division_order, group_order,
     cardinality, status, confidence, method, justification, metadata)
  values
    (p_nouveau, p_set, g.book, g.canonical_division_order, g.group_order + 1,
     p_cardinalite_part, g.status, g.confidence, g.method, null,
     jsonb_build_object('issu_de', p_groupe, 'atelier', jsonb_build_array(p_trace)));

  update public.texte_alignements
     set cardinality = p_cardinalite_garde,
         metadata = metadata || jsonb_build_object(
           'atelier', coalesce(metadata -> 'atelier', '[]'::jsonb) || jsonb_build_array(p_trace))
   where alignment_id = p_groupe and alignment_set_id = p_set;

  delete from public.texte_alignement_membres
   where alignment_id = p_groupe and alignment_set_id = p_set;

  perform public.atelier_alignement_poser_membres(p_set, p_groupe, 'reference', v_ref, p_reference_garde, v_anciens);
  perform public.atelier_alignement_poser_membres(p_set, p_groupe, 'aligned', v_ali, p_aligned_garde, v_anciens);
  perform public.atelier_alignement_poser_membres(p_set, p_nouveau, 'reference', v_ref, p_reference_part, v_anciens);
  perform public.atelier_alignement_poser_membres(p_set, p_nouveau, 'aligned', v_ali, p_aligned_part, v_anciens);

  return jsonb_build_object('groupe', p_groupe, 'nouveau', p_nouveau);
end;
$$;

-- ── Fusionner ────────────────────────────────────────────────────────────────
-- Deux groupes VOISINS d'une même division : le premier absorbe le second, qui
-- disparaît. Son identifiant et son état restent dans la trace du premier.
create or replace function public.atelier_alignement_fusionner(
  p_set text,
  p_groupe text,
  p_absorbe text,
  p_reference text[],
  p_aligned text[],
  p_cardinalite text,
  p_trace jsonb
) returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare
  a public.texte_alignements%rowtype;
  b public.texte_alignements%rowtype;
  v_ref text;
  v_ali text;
  v_anciens jsonb;
  v_ref_actuels text[];
  v_ali_actuels text[];
begin
  select * into a from public.texte_alignements
   where alignment_id = p_groupe and alignment_set_id = p_set for update;
  if not found then
    raise exception 'Groupe % introuvable dans l''ensemble %', p_groupe, p_set;
  end if;
  select * into b from public.texte_alignements
   where alignment_id = p_absorbe and alignment_set_id = p_set for update;
  if not found then
    raise exception 'Groupe % introuvable dans l''ensemble %', p_absorbe, p_set;
  end if;

  if a.book <> b.book or a.canonical_division_order <> b.canonical_division_order then
    raise exception 'Deux groupes de divisions différentes ne se fusionnent pas';
  end if;
  if b.group_order <= a.group_order or exists (
       select 1 from public.texte_alignements x
        where x.alignment_set_id = p_set and x.book = a.book
          and x.canonical_division_order = a.canonical_division_order
          and x.group_order > a.group_order and x.group_order < b.group_order) then
    raise exception 'Les groupes % et % ne sont pas voisins', p_groupe, p_absorbe;
  end if;

  select reference_text_id, aligned_text_id into v_ref, v_ali
    from public.texte_alignement_ensembles where alignment_set_id = p_set;

  select coalesce(array_agg(segment_key) filter (where role = 'reference'), '{}'),
         coalesce(array_agg(segment_key) filter (where role = 'aligned'), '{}'),
         coalesce(jsonb_object_agg(role || '|' || segment_key,
                    jsonb_build_object('metadata', metadata, 'created_at', created_at)), '{}'::jsonb)
    into v_ref_actuels, v_ali_actuels, v_anciens
    from public.texte_alignement_membres
   where alignment_set_id = p_set and alignment_id in (p_groupe, p_absorbe);

  if not public.atelier_alignement_memes_cles(v_ref_actuels, coalesce(p_reference, '{}'))
     or not public.atelier_alignement_memes_cles(v_ali_actuels, coalesce(p_aligned, '{}')) then
    raise exception 'Les groupes % et % ont changé depuis leur affichage : rechargez l''atelier', p_groupe, p_absorbe;
  end if;

  delete from public.texte_alignement_membres
   where alignment_set_id = p_set and alignment_id in (p_groupe, p_absorbe);
  delete from public.texte_alignements
   where alignment_set_id = p_set and alignment_id = p_absorbe;

  update public.texte_alignements
     set cardinality = p_cardinalite,
         metadata = metadata || jsonb_build_object(
           'atelier', coalesce(metadata -> 'atelier', '[]'::jsonb) || jsonb_build_array(
             p_trace || jsonb_build_object('absorbe', jsonb_build_object(
               'alignment_id', b.alignment_id, 'group_order', b.group_order,
               'status', b.status, 'method', b.method, 'metadata', b.metadata))))
   where alignment_id = p_groupe and alignment_set_id = p_set;

  perform public.atelier_alignement_poser_membres(p_set, p_groupe, 'reference', v_ref, p_reference, v_anciens);
  perform public.atelier_alignement_poser_membres(p_set, p_groupe, 'aligned', v_ali, p_aligned, v_anciens);

  return jsonb_build_object('groupe', p_groupe, 'absorbe', p_absorbe);
end;
$$;

-- ⛔ `PUBLIC` n'est pas `anon` : Supabase accorde l'exécution aux deux rôles connectés
-- par ses privilèges par défaut, qu'un `revoke ... from public` ne retire pas.
revoke all on function public.atelier_alignement_mesures(text, text) from public, anon, authenticated;
revoke all on function public.atelier_alignement_poser_membres(text, text, text, text, text[], jsonb) from public, anon, authenticated;
revoke all on function public.atelier_alignement_memes_cles(text[], text[]) from public, anon, authenticated;
revoke all on function public.atelier_alignement_couper(text, text, text, text[], text[], text[], text[], text, text, jsonb) from public, anon, authenticated;
revoke all on function public.atelier_alignement_fusionner(text, text, text, text[], text[], text, jsonb) from public, anon, authenticated;

grant execute on function public.atelier_alignement_mesures(text, text) to service_role;
grant execute on function public.atelier_alignement_poser_membres(text, text, text, text, text[], jsonb) to service_role;
grant execute on function public.atelier_alignement_memes_cles(text[], text[]) to service_role;
grant execute on function public.atelier_alignement_couper(text, text, text, text[], text[], text[], text[], text, text, jsonb) to service_role;
grant execute on function public.atelier_alignement_fusionner(text, text, text, text[], text[], text, jsonb) to service_role;
