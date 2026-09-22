-- Le volet des Pères de la page « Bible classique » : quatre objets ADDITIFS, rien de retiré.
-- Audit du 22 septembre 2026 (AGENTS.md, « LE VOLET DES PÈRES : AUDIT DU 22 SEPTEMBRE »).
--
-- 1. Un index (canon_livre, canon_chapitre, id) : la lecture des liens d'un chapitre se
--    pagine par CURSEUR (id > dernier) et non plus par décalage. Mesuré sous `authenticated`,
--    Genèse 1 (2 839 liens) : sans lui, chaque page de 1 000 triait les 2 839 lignes après
--    avoir évalué la politique de lecture sur TOUTES (52 ms à chaud, 1 806 ms à froid pour
--    une page à décalage) ; avec lui, une page s'arrête à ses 1 000 lignes (22 ms à chaud),
--    et une ligne n'est évaluée qu'une fois sur toute la lecture.
--    ⚠️ `liens_bib_canon_chapitre_idx` (canon_livre, canon_chapitre) devient redondant ; il
--    n'est pas retiré ici.
-- 2. `longueur_texte(segments)`, champ CALCULÉ pour PostgREST : le volet lit la LONGUEUR des
--    segments (mesure des élisions, regroupements) sans rapatrier leur texte (559 Ko sur
--    Genèse 1 pour 20 extraits affichés). ⛔ Pas de clause SET : elle est appelée ligne à ligne.
-- 3. `presence_patristique_plage(…)` : les œuvres liées à une plage canonique et leurs types,
--    agrégés en base, pour les métadonnées (qui lisaient 2 839 lignes sans pagination).
--    INVOKER : la politique de lecture du visiteur s'applique.
-- 4. `totaux_votes_commentaires(bigint[])` : les TOTAUX de votes par commentaire, et rien
--    d'autre (ni qui a voté, ni quoi). DEFINER, parce qu'elle doit pouvoir compter quand la
--    lecture des votes se restreindra à sa propre ligne ; elle n'est pas appelée ligne à ligne.

set local lock_timeout = '5s';

create index if not exists liens_bib_canon_chapitre_id_idx
  on public.liens_bibliques (canon_livre, canon_chapitre, id);

create or replace function public.longueur_texte(s public.segments)
returns integer
language sql
immutable
parallel safe
as $$ select char_length(s.segment_texte) $$;
comment on function public.longueur_texte(public.segments) is
  'Champ calculé PostgREST : la longueur (en points de code) du texte d''un segment, sans le rapatrier. Volet des Pères, 2026-09-22.';
revoke all on function public.longueur_texte(public.segments) from public, anon;
grant execute on function public.longueur_texte(public.segments) to authenticated, service_role;

create or replace function public.presence_patristique_plage(
  p_livre text,
  p_chapitre_debut integer,
  p_verset_debut integer,
  p_chapitre_fin integer,
  p_verset_fin integer
)
returns table (id_oeuvre text, types integer[])
language sql
stable
security invoker
as $$
  with liens as (
    select lb.segment_id, lb.type::integer as type
    from public.liens_bibliques lb
    where lb.canon_livre = p_livre
      and lb.canon_chapitre between p_chapitre_debut and p_chapitre_fin
      and (p_verset_debut is null or lb.canon_chapitre > p_chapitre_debut
           or coalesce(nullif(substring(split_part(lb.canon_id, '.', 3) from '^[0-9]+'), '')::integer, 0) >= p_verset_debut)
      and (p_verset_fin is null or lb.canon_chapitre < p_chapitre_fin
           or coalesce(nullif(substring(split_part(lb.canon_id, '.', 3) from '^[0-9]+'), '')::integer, 0) <= p_verset_fin)
    union all
    select lb.segment_id, lb.type::integer
    from public.liens_bibliques lb
    where lb.canon_id is null and lb.livre = p_livre
      and lb.chapitre between p_chapitre_debut and p_chapitre_fin
  )
  select s.id_oeuvre, array_agg(distinct l.type order by l.type)
  from liens l
  join public.segments s on s.id = l.segment_id
  group by s.id_oeuvre
$$;
comment on function public.presence_patristique_plage(text, integer, integer, integer, integer) is
  'Métadonnées : œuvres liées à une plage canonique (versets bornés aux chapitres extrêmes, liens de chapitre compris) et leurs types. INVOKER. 2026-09-22.';
revoke all on function public.presence_patristique_plage(text, integer, integer, integer, integer) from public, anon;
grant execute on function public.presence_patristique_plage(text, integer, integer, integer, integer) to authenticated, service_role;

create or replace function public.totaux_votes_commentaires(p_ids bigint[])
returns table (id_commentaire bigint, likes integer, dislikes integer)
language sql
stable
security definer
set search_path = ''
as $$
  select l.id_commentaire,
         (count(*) filter (where l.valeur = 1))::integer,
         (count(*) filter (where l.valeur = -1))::integer
  from public.commentaires_likes l
  where l.id_commentaire = any (p_ids[1:1000])
  group by l.id_commentaire
$$;
comment on function public.totaux_votes_commentaires(bigint[]) is
  'Les totaux de votes par commentaire (1 000 identifiants au plus), sans rien dire de qui a voté. DEFINER. 2026-09-22.';
revoke all on function public.totaux_votes_commentaires(bigint[]) from public, anon;
grant execute on function public.totaux_votes_commentaires(bigint[]) to authenticated, service_role;
