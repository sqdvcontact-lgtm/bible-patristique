-- ── LA PRÉSENCE PATRISTIQUE D'UNE PLAGE : LES AUTEURS EN BASE, ET LES VERSETS
--    SURNUMÉRAIRES (2026-09-22) ───────────────────────────────────────────────
--
-- Deux manques, relevés à l'audit du volet des Pères :
--
-- 1. ⛔ UN LIEN POSÉ SUR UN VERSET SURNUMÉRAIRE NE REMONTAIT NULLE PART. Un lien vise
--    trois choses (charte §9) : un créneau du canon, un CHAPITRE entier, ou un verset
--    hors ossature (`verset_v2_id`, dix lignes en base). La fonction n'en lisait que
--    deux. Jean Chrysostome (A0014O0105) ne paraissait donc pas sur Matthieu 17, où il
--    cite et commente le verset surnuméraire 17, 20 — mesuré avant et après.
--
-- 2. ⚠️ CHAQUE PAGE LISAIT TOUT LE CATALOGUE DES ŒUVRES pour n'en garder que des noms
--    d'auteur (`metadonneesSeoServeur.lireCatalogue`, jointure `auteurs`), en plus de
--    cet appel. La jointure se fait ici, sur les vingt-quatre lignes AGRÉGÉES et non
--    sur les cinquante œuvres du catalogue : une vague de moins par page.
--
-- La fonction reste STABLE et INVOKER : la politique de lecture du visiteur s'applique,
-- et la jointure sur `oeuvres` porte la publication (une œuvre dépubliée n'en sort pas,
-- comme `estOeuvrePubliee` le voulait côté site).
-- ⚠️ Le type de retour change : on ne peut pas `create or replace`, il faut reposer la
-- fonction. Une seule migration, donc atomique.

drop function if exists public.presence_patristique_plage(text, integer, integer, integer, integer);

create function public.presence_patristique_plage(
  p_livre text,
  p_chapitre_debut integer,
  p_verset_debut integer,
  p_chapitre_fin integer,
  p_verset_fin integer
)
returns table(
  id_oeuvre text,
  types integer[],
  auteur text,
  date_composition text,
  auteur_date_mort text,
  auteur_siecle text
)
language sql
stable
as $function$
  with liens as (
    -- Les liens AU VERSET : colonnes engendrées, donc index (jamais `like` sur canon_id).
    select lb.segment_id, lb.type::integer as type
    from public.liens_bibliques lb
    where lb.canon_livre = p_livre
      and lb.canon_chapitre between p_chapitre_debut and p_chapitre_fin
      and (p_verset_debut is null or lb.canon_chapitre > p_chapitre_debut
           or coalesce(nullif(substring(split_part(lb.canon_id, '.', 3) from '^[0-9]+'), '')::integer, 0) >= p_verset_debut)
      and (p_verset_fin is null or lb.canon_chapitre < p_chapitre_fin
           or coalesce(nullif(substring(split_part(lb.canon_id, '.', 3) from '^[0-9]+'), '')::integer, 0) <= p_verset_fin)
    union all
    -- Les liens AU CHAPITRE entier.
    select lb.segment_id, lb.type::integer
    from public.liens_bibliques lb
    where lb.canon_id is null and lb.livre = p_livre
      and lb.chapitre between p_chapitre_debut and p_chapitre_fin
    union all
    -- Les liens à un VERSET SURNUMÉRAIRE : il n'a pas de créneau canonique, et se range
    -- par la numérotation de son édition (`livre`, `ch_orig`, `v_orig`). L'index partiel
    -- `liens_bib_surnum_unique` borne la lecture aux seules lignes qui en portent un.
    select lb.segment_id, lb.type::integer
    from public.liens_bibliques lb
    join public.versets_v2 v on v.id = lb.verset_v2_id
    where lb.verset_v2_id is not null and lb.canon_id is null and lb.livre is null
      and v.livre = p_livre
      and v.ch_orig between p_chapitre_debut and p_chapitre_fin
      and (p_verset_debut is null or v.ch_orig > p_chapitre_debut or v.v_orig >= p_verset_debut)
      and (p_verset_fin is null or v.ch_orig < p_chapitre_fin or v.v_orig <= p_verset_fin)
  ),
  par_oeuvre as (
    select s.id_oeuvre, array_agg(distinct l.type order by l.type) as types
    from liens l
    join public.segments s on s.id = l.segment_id
    group by s.id_oeuvre
  )
  -- ⚠️ La jointure vient APRÈS l'agrégat : vingt-quatre lignes sur Genèse 1, non
  -- deux mille huit cents. `oeuvres` porte la publication par sa politique de lecture.
  select p.id_oeuvre, p.types, a.nom, o.date_composition, a.date_mort, a.siecle
  from par_oeuvre p
  join public.oeuvres o on o.id_oeuvre = p.id_oeuvre
  left join public.auteurs a on a.id_auteur = o.id_auteur
$function$;

comment on function public.presence_patristique_plage(text, integer, integer, integer, integer) is
  'Les œuvres PUBLIÉES qui renvoient à une plage canonique, avec les types de leurs liens et le nom de leur auteur. Trois cibles de lien : créneau du canon, chapitre entier, verset surnuméraire. Sert les métadonnées de la Bible et des péricopes (app/lib/metadonneesSeoServeur.ts).';
