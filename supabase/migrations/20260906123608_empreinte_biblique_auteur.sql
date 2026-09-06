-- L'empreinte biblique d'un auteur : quels livres de l'Écriture ses œuvres publiées
-- commentent, et dans quelle proportion. Le chemin est court en données
-- (liens_bibliques → segments → oeuvre_textes → oeuvres) et n'existait dans aucune vue :
-- `oeuvres_liens_stats` ne compte que par œuvre, sans le livre visé.
--
-- ⛔ SECURITY DEFINER, pour la raison déjà écrite en tête de `recherche_segments_v2` :
-- les politiques de `segments` et de `liens_bibliques` sont des EXISTS corrélés, évalués
-- une fois PAR LIGNE. Sur 67 734 liens, l'agrégat les paierait tous. La garde de
-- publication est donc écrite ici, et elle dit exactement ce que disent les politiques :
-- texte public, œuvre publique.
--
-- ⚠️ `canon_livre` est lu directement sur le lien : la colonne est dénormalisée depuis le
-- 2026-09-05 (migration `liens_bibliques_canon_livre_chapitre`), et évite une jointure de
-- plus sur `versets_canon`.
--
-- ⚠️ La vue des auteurs, jamais `oeuvres.id_auteur` : une œuvre peut être co-signée, et
-- les co-signataires sont à égalité.
create or replace function public.empreinte_biblique_auteur(
  p_id_auteur text,
  p_limite integer default 6
)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with liens as (
    select lb.canon_livre as livre, lb.canon_id
    from public.liens_bibliques lb
    join public.segments s on s.id = lb.segment_id
    join public.oeuvre_textes t on t.id_texte = s.id_texte and t.is_public
    join public.oeuvres o on o.id_oeuvre = t.id_oeuvre and o.acces_public
    where lb.canon_livre is not null
      and exists (
        select 1 from public.v_oeuvres_auteurs va
        where va.id_oeuvre = o.id_oeuvre and va.id_auteur = p_id_auteur
      )
  ), par_livre as (
    select livre, count(*) as liens, count(distinct canon_id) as versets
    from liens group by livre
  ), tete as (
    select livre, liens, versets from par_livre
    order by liens desc, livre
    limit greatest(least(coalesce(p_limite, 6), 12), 1)
  )
  select jsonb_build_object(
    'liens',   (select count(*) from liens),
    'versets', (select count(distinct canon_id) from liens),
    'livres',  (select count(*) from par_livre),
    'tete',    coalesce(
                 (select jsonb_agg(jsonb_build_object('livre', livre, 'liens', liens, 'versets', versets)
                          order by liens desc, livre)
                  from tete),
                 '[]'::jsonb)
  );
$$;

revoke execute on function public.empreinte_biblique_auteur(text, integer) from public;
grant execute on function public.empreinte_biblique_auteur(text, integer) to authenticated, service_role;

comment on function public.empreinte_biblique_auteur(text, integer) is
  'Livres bibliques les plus commentés par un auteur, avec ses totaux. Ne compte que les textes publics d''œuvres publiques.';
