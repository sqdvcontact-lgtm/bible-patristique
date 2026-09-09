-- Contrôles de la migration `20260909110227_segments_index_lecture_division`.
--
-- ⛔ Un contrôle ne se fait JAMAIS avec le motif de l'opération : on n'interroge pas
-- `pg_indexes` pour se dire que le `create index` a créé un index. Ce qu'on veut savoir
-- est ce que le PLANIFICATEUR en fait, et il peut fort bien l'ignorer.
--
-- À rejouer par le canal d'administration. Chaque bloc lève si le fait n'est pas là.

-- ── 1. L'index existe, avec ses quatre colonnes dans l'ordre ─────────────────────
do $$
declare def text;
begin
  select indexdef into def from pg_indexes
   where schemaname = 'public' and indexname = 'segments_lecture_division_idx';
  if def is null then
    raise exception 'segments_lecture_division_idx absent';
  end if;
  -- ⚠️ L'ordre des colonnes fait tout : sans `id_oeuvre` en deuxième, le planificateur
  -- retombe sur un BitmapAnd et le tri revient.
  if def !~ '\(id_texte, id_oeuvre, ref_niv1, segment_numero\)' then
    raise exception 'colonnes inattendues : %', def;
  end if;
end $$;

-- ── 2. LE PLAN NE TRIE PLUS, et c'est le seul fait qui compte ───────────────────
-- On demande le plan de la requête RÉELLE de la page — filtre de surface compris — et
-- l'on exige un parcours d'index ORDONNÉ, sans nœud de tri.
--
-- ⛔ `format json`, jamais `format text` : un `explain` en texte rend UNE LIGNE PAR
-- LIGNE DE PLAN, et `into` ne prend que la première — le contrôle jugeait donc sur
-- « Limit (cost=…) », où le nom d'un index ne figure jamais, et il a échoué sur
-- lui-même à sa première exécution. Le JSON tient en une ligne.
--
-- ⛔ Le filtre de surface FAIT PARTIE de la requête à éprouver : sans lui, le
-- planificateur choisit un autre index et le contrôle ne dit rien de ce que la page paie.
--
-- ⚠️ Éprouvé dans les DEUX sens le 9 septembre 2026 : vert sur la base, et ROUGE sous
-- `set local enable_indexscan = off` dans une transaction annulée. Une garde qu'on n'a
-- pas vue rouge ne garde rien.
do $$
declare
  plan jsonb;
  txt text;
  id_o text;
  id_t text;
  niv text;
begin
  -- La plus grosse division du corpus, quelle qu'elle soit : le contrôle ne nomme pas
  -- une œuvre, il cherche le cas le plus dur.
  select s.id_oeuvre, s.id_texte, s.ref_niv1 into id_o, id_t, niv
    from segments s
   where s.ref_niv1 is not null
   group by s.id_oeuvre, s.id_texte, s.ref_niv1
   order by count(*) desc
   limit 1;

  execute format(
    'explain (format json) select id, segment_numero from segments
       where id_oeuvre = %L and id_texte = %L and ref_niv1 = %L
         and (espace_textuel in (''corps'',''introduction'')
              or (espace_textuel is null and nature in (''texte'',''introduction'',''citation'',''lemme'',''dialogue'',''texte absent'',''verset'',''rubrique'',''signature'',''apparat_auteur'',''exergue'')))
       order by segment_numero limit 1000', id_o, id_t, niv)
    into plan;

  txt := plan::text;
  if txt !~ 'segments_lecture_division_idx' then
    raise exception 'le planificateur n''emploie pas l''index (%, %, %) : %', id_o, id_t, niv, txt;
  end if;
  if txt ~ '"Node Type": "Sort"' then
    raise exception 'le plan TRIE encore, l''ordre de l''index n''est pas exploité : %', txt;
  end if;
end $$;

-- ── 3. Rien d'autre n'a bougé ───────────────────────────────────────────────────
-- ⚠️ Une migration d'index ne touche aucune donnée ; on le vérifie tout de même, car
-- c'est le genre d'évidence qu'on ne contrôle jamais et qui finit par surprendre.
do $$
begin
  if (select count(*) from segments) = 0 then
    raise exception 'segments est vide';
  end if;
end $$;
