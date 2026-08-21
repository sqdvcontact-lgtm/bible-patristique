-- Longueur des œuvres : fiabiliser `nb_signes`, qui sert désormais à l'affichage
-- (section « Opuscules » de la bibliothèque, sous 40 000 signes).
--
-- Définition retenue, celle qui était déjà appliquée à l'import : `nb_signes` compte
-- TOUS les segments d'une version, quelle que soit leur `nature`. Ne pas la réduire à
-- `nature = 'texte'` : le corps de plusieurs œuvres vit ailleurs. Boèce est un
-- prosimètre porté par `dialogue` et `vers`, les commentaires de Jérôme portent le
-- lemme biblique en `citation`. Sur la Consolation, s'en tenir à `texte` ne compterait
-- que 3 178 signes sur 239 170.
--
-- La longueur d'une ŒUVRE est celle de sa version par défaut, jamais la somme de ses
-- versions : additionner le français et le latin de La Cité de Dieu doublerait une
-- œuvre qui se lit une fois.

-- 1. Fonction de recalcul, à rejouer après un import ou une correction de corpus.
--    Pas de trigger sur `segments` : les imports écrivent par lots de milliers de
--    lignes, et le recalcul par ligne y coûterait bien plus qu'il ne rapporte.
create or replace function public.recalculer_nb_signes()
returns table (textes_corriges integer, oeuvres_corrigees integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  nb_textes integer;
  nb_oeuvres integer;
begin
  with reel as (
    select id_texte, sum(length(segment_texte))::integer as signes
    from segments
    where id_texte is not null
    group by id_texte
  ), maj as (
    update oeuvre_textes t
       set nb_signes = r.signes, updated_at = now()
      from reel r
     where r.id_texte = t.id_texte
       and t.nb_signes is distinct from r.signes
    returning 1
  )
  select count(*) into nb_textes from maj;

  with defaut as (
    select id_oeuvre, max(nb_signes) filter (where is_default) as signes
    from oeuvre_textes
    group by id_oeuvre
  ), maj as (
    update oeuvres o
       set nb_signes = d.signes
      from defaut d
     where d.id_oeuvre = o.id_oeuvre
       and d.signes is not null
       and o.nb_signes is distinct from d.signes
    returning 1
  )
  select count(*) into nb_oeuvres from maj;

  return query select nb_textes, nb_oeuvres;
end;
$$;

comment on function public.recalculer_nb_signes() is
  'Recale oeuvre_textes.nb_signes sur les segments, puis oeuvres.nb_signes sur la version par défaut. À rejouer après un import ou une correction de corpus.';

revoke all on function public.recalculer_nb_signes() from public, anon, authenticated;
grant execute on function public.recalculer_nb_signes() to service_role;

-- 2. « Commentaire sur Joël » (A0051O0043) n'avait aucune version marquée par défaut,
--    si bien que le recalcul de l'œuvre n'avait pas de source. C'est sa seule version.
update oeuvre_textes
   set is_default = true, updated_at = now()
 where id_oeuvre = 'A0051O0043'
   and id_texte = 'TXT_A0051O0043_FR_1879_BAREILLE'
   and is_default is distinct from true;

-- 3. Rattrapage des deux dérives constatées le 2026-08-16 : le Joël de Jérôme
--    (130 841 annoncés pour 132 117 réels) et la préface latine de Migne pour La Cité
--    de Dieu (1 414 pour 1 411). Tout le reste du corpus était déjà exact.
select public.recalculer_nb_signes();
