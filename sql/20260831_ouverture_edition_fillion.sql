-- OUVERTURE DE L'ÉDITION FILLION AU LECTEUR (décision de l'auteur, 31 août 2026).
--
-- ⛔ LE VERROU N'ÉTAIT PAS SUR LES ILLUSTRATIONS. Les sept sources de la famille
--    portaient `metadata.test_only = true`, et leurs codes le disaient
--    (`fillion-t01-pentateuch-test`, `fillion-t07-gospels-acts-test`,
--    `fillion-t02-joshua-test`). `bible_text_sources_public_read` refuse cela ;
--    `bible_edition_member_sources_public_read` a besoin de LIRE la source pour
--    s'appliquer ; et les politiques des illustrations comme des blocs de corps
--    ont besoin de lire le `member_source`. Toute la chaîne tombait sur ce seul
--    drapeau, un cran au-dessus de ce qu'on regardait.
--
-- ⚠️ La RLS s'applique DANS le sous-select d'une politique : une table que
--    l'appelant ne peut pas lire rend le EXISTS vide, et la politique échoue sans
--    rien dire. C'est ce qui rendait le diagnostic si difficile — aucune erreur,
--    zéro ligne, et le rôle de service voyant tout.
--
-- Ce que l'ouverture rend visible, mesuré avant application :
--   208 illustrations · 5 463 blocs de commentaire · 34 segmentations · 37 notes
--   sur ACT DEU EXO GEN JHN JOS LEV LUK MAT MRK NUM.
--
-- ⚠️ Le `source_code` garde son suffixe « -test » : c'est l'identifiant de la
--    source, et le renommer déplacerait ce à quoi elle est jointe. Il ne décide
--    plus de rien ; seul le drapeau décidait.
--
-- Sauvegarde : internal.backup_bible_text_sources_fillion_20260831
-- Retour en arrière : sql/rollback_ouverture_edition_fillion_20260831.sql

create table if not exists internal.backup_bible_text_sources_fillion_20260831 as
select id, source_code, trad_id, status, metadata
from public.bible_text_sources
where source_code like 'fillion-%';

update public.bible_text_sources s
set metadata = (coalesce(s.metadata, '{}'::jsonb) - 'test_only') || jsonb_build_object(
      'publication_source', 'ouverture_edition_20260831',
      'publication_motif', 'Ouverture de l’édition Fillion au lecteur, décidée par l’auteur le 31 août 2026.'
    ),
    updated_at = now()
where s.source_code like 'fillion-%';

do $$
declare n_src int; n_ms int; n_ill int; n_bloc int; livres text;
begin
  select count(*) into n_src from public.bible_text_sources
   where source_code like 'fillion-%' and coalesce(metadata->>'test_only','false') <> 'true' and status = 'published';
  if n_src <> 7 then raise exception 'seules % sources sur 7 sont ouvertes', n_src; end if;

  -- On rejoue les politiques de bout en bout, telles qu'elles s'écrivent.
  select count(*) into n_ms from public.bible_edition_member_sources ms
   where ms.status = 'published' and exists (
     select 1 from public.bible_edition_families f
       join public.bible_edition_members m on m.family_id = f.id
       join public.bible_edition_components c on c.family_id = f.id
       join public.bible_text_sources s on s.id = ms.source_id
     where f.id = ms.family_id and m.id = ms.member_id and c.id = ms.component_id
       and f.status = 'published' and m.status = 'published' and c.status = 'published'
       and s.status = 'published' and coalesce(s.metadata->>'test_only','false') <> 'true');

  select count(*) into n_ill from public.bible_edition_assets a
   where a.is_public and public.bible_technical_publication_allowed(a.validation_status, a.metadata)
     and exists (select 1 from public.bible_edition_families f
                 join public.bible_edition_member_sources ms on ms.family_id = f.id and ms.id = a.member_source_id
                 join public.bible_text_sources s on s.id = a.source_id
                 where f.id = a.family_id and f.status = 'published' and ms.status = 'published'
                   and s.status = 'published' and coalesce(s.metadata->>'test_only','false') <> 'true');

  select count(*), string_agg(distinct b.scope_book_code, ' ' order by b.scope_book_code)
    into n_bloc, livres
    from public.bible_editorial_body_blocks b
   where b.is_public and public.bible_technical_publication_allowed(b.validation_status, b.metadata)
     and exists (select 1 from public.bible_editorial_segmentations g
                 where g.id = b.segmentation_id and g.is_public and g.status = 'validated');

  if n_ms <> 7 then raise exception 'seuls % member_sources sur 7 passent leur politique', n_ms; end if;
  if n_ill <> 208 then raise exception 'seules % illustrations sur 208 passent la chaîne', n_ill; end if;
  raise notice 'ouvert : 7 sources, % member_sources, % illustrations, % blocs sur [%]', n_ms, n_ill, n_bloc, livres;
end $$;
