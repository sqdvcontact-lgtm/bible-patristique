-- Charte § 47.8, étape 3 : les notices du catalogue entrent dans la base de références.
-- `catalogue_notices` devient l'annexe du catalogue : chaque notice porte `ouvrage_id`.
-- ⛔ À N'APPLIQUER qu'une fois en ligne le code qui filtre l'outil bibliographique
--    sur `apparait_dans` (commit « Fusion des références, étape 2 »).
-- Sauvegardes : internal.backup_*_20260923. Décisions : internal.fusion_references_candidats
-- (GPT, 581 paires) et internal.fusion_oeuvres_en_double (GPT, 6 paires).
set local lock_timeout = '5s';
set local statement_timeout = '120s';  -- l'insertion déclenche le calcul du statut par ligne : ~12 s mesurées

alter table public.catalogue_notices add column ouvrage_id bigint;
alter table public.catalogue_notices
  add constraint catalogue_notices_ouvrage_id_fkey foreign key (ouvrage_id)
  references public.ouvrages_bibliographiques(id) on update cascade on delete restrict;
create index catalogue_notices_ouvrage_id_idx on public.catalogue_notices (ouvrage_id);
comment on column public.catalogue_notices.ouvrage_id is
  'Charte § 47.8 : la référence de cette notice dans ouvrages_bibliographiques.';

-- L'œuvre retenue quand la bibliographie la portait deux fois.
create temp table f_ret on commit drop as
  select case when ouvrage_retenu = ouvrage_a then ouvrage_b else ouvrage_a end as ecarte,
         ouvrage_retenu as retenu
  from internal.fusion_oeuvres_en_double where decision = 'meme_oeuvre';

-- Une notice suffixée D20260919 se replie sur celle qu'elle répète (43, toutes identiques).
create temp table f_nb on commit drop as
  select n.id, coalesce(b.id, n.id) as base_id
  from public.catalogue_notices n
  left join public.catalogue_notices b
    on n.id_ligne like '%-D20260919' and b.id_ligne = replace(n.id_ligne, '-D20260919', '');

-- Chaque notice : la référence existante qu'elle répète (décision meme_edition), et
-- l'œuvre dont elle est une édition (décision edition_de_oeuvre, œuvre retenue).
create temp table f_dec on commit drop as
  select y.base_id,
    min(c.ouvrage_id) filter (where c.decision = 'meme_edition') as meme,
    min(coalesce(r.retenu, c.ouvrage_id)) filter (where c.decision = 'edition_de_oeuvre') as oeuvre
  from f_nb y
  left join internal.fusion_references_candidats c on c.notice_id = y.id
  left join f_ret r on r.ecarte = c.ouvrage_id
  group by y.base_id;

-- ⛔ Une référence par LIVRE : les notices qui partagent auteur, titre, année et éditeur
-- (un recueil, dont chaque œuvre a sa notice) se réunissent sous une seule référence.
-- C'est l'identité que la base impose (uq_ouvrages_bibliographiques_notice).
create temp table f_cle on commit drop as
  select d.base_id, d.oeuvre,
    case when nullif(btrim(n.editeur), '') is null then 'notice:' || d.base_id
      else lower(btrim(coalesce(nullif(btrim(n.auteur_uniformise), ''), btrim(n.auteur)))) || '|' ||
           lower(btrim(coalesce(nullif(btrim(n.titre_edition), ''), btrim(n.titre_stable)))) || '|' ||
           coalesce(nullif(n.annee_edition, 0)::text, '') || '|' || lower(btrim(n.editeur)) end as cle
  from f_dec d join public.catalogue_notices n on n.id = d.base_id
  where d.meme is null;

create temp table f_livre on commit drop as
  select cle, min(base_id) as representant,
    case when count(distinct oeuvre) = 1 then min(oeuvre) end as oeuvre,
    nextval('public.ouvrages_bibliographiques_id_seq') as nouveau
  from f_cle group by cle;

-- Les éditions neuves : une par livre.
insert into public.ouvrages_bibliographiques
  (id, auteurs, titre, traducteurs, editeur, lieu, annee, collection, langue, type_ouvrage,
   provenance, statut_editorial, apparait_dans, niveau, oeuvre_ouvrage_id, note)
overriding system value
select l.nouveau,
  coalesce(nullif(btrim(n.auteur_uniformise), ''), btrim(n.auteur)),
  coalesce(nullif(btrim(n.titre_edition), ''), btrim(n.titre_stable)),
  nullif(btrim(coalesce(n.traducteur_uniformise, n.traducteur)), ''),
  nullif(btrim(n.editeur), ''),
  nullif(btrim(n.lieu_edition), ''),
  nullif(n.annee_edition, 0),
  nullif(btrim(n.collection_nom), ''),
  'fr', 'source_primaire', 'import', 'a_revoir',
  array['catalogue'], 'edition', l.oeuvre,
  'Fusion § 47.8 : notice ' || n.id_ligne
from f_livre l join public.catalogue_notices n on n.id = l.representant;

-- Les références déjà présentes des deux côtés (décision meme_edition).
update public.ouvrages_bibliographiques o
set apparait_dans = array(select distinct unnest(o.apparait_dans || array['catalogue']) order by 1),
    niveau = coalesce(o.niveau, 'edition'),
    oeuvre_ouvrage_id = coalesce(o.oeuvre_ouvrage_id, case when g.oeuvre <> o.id then g.oeuvre end)
from (select meme, case when count(distinct oeuvre) = 1 then min(oeuvre) end as oeuvre from f_dec where meme is not null group by meme) g
where o.id = g.meme;

-- Les œuvres désignées par au moins une édition.
update public.ouvrages_bibliographiques o set niveau = 'oeuvre'
where o.niveau is null and o.id in (select oeuvre from f_dec where oeuvre is not null);

-- Chaque notice reçoit sa référence.
update public.catalogue_notices n set ouvrage_id = coalesce(d.meme, l.nouveau)
from f_nb x join f_dec d on d.base_id = x.base_id
left join f_cle c on c.base_id = x.base_id left join f_livre l on l.cle = c.cle
where n.id = x.id;

-- Correspondance gardée : ancienne notice → référence.
create table internal.fusion_references_correspondance_20260923 as
  select n.id as notice_id, n.id_ligne, n.ouvrage_id from public.catalogue_notices n;

-- Contrôles : tout échec annule la migration.
do $$
declare v_sans int; v_attendu int; v_cat int; v_bib int; v_nouv int;
begin
  select count(*) into v_sans from public.catalogue_notices where ouvrage_id is null;
  if v_sans > 0 then raise exception 'notices sans référence : %', v_sans; end if;
  select count(distinct ouvrage_id) into v_attendu from public.catalogue_notices;
  select count(*) into v_cat from public.ouvrages_bibliographiques where 'catalogue' = any(apparait_dans);
  if v_cat <> v_attendu then raise exception 'références « catalogue » : % pour % références portées par les notices', v_cat, v_attendu; end if;
  select count(*) into v_bib from public.ouvrages_bibliographiques where 'bibliographie' = any(apparait_dans);
  if v_bib <> 1838 then raise exception 'références « bibliographie » : % au lieu de 1838', v_bib; end if;
  select count(*) into v_nouv from public.ouvrages_bibliographiques where apparait_dans = array['catalogue'];
  raise notice 'notices : 2765 ; références du catalogue : % (dont % neuves) ; bibliographie : %', v_cat, v_nouv, v_bib;
end $$;
