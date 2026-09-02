-- Un administrateur lit les familles d'édition EN BROUILLON, comme il lit déjà les
-- sources privées (`bible_text_sources_admin_read_private`). Sans cela, la Bible du
-- XIIIe siècle et sa traduction moderne (famille `bible899-critical-modern-v1`,
-- tout en `draft`) n'existent pour personne, pas même pour qui doit la relire :
-- `v_bible_edition_catalog` rendait zéro ligne à l'administrateur (vu le 2026-09-03).
-- Le public, lui, ne voit toujours que le statut `published`.
create policy bible_edition_families_admin_read_private on public.bible_edition_families
  for select to authenticated using (public.is_admin());
create policy bible_edition_members_admin_read_private on public.bible_edition_members
  for select to authenticated using (public.is_admin());
create policy bible_edition_member_sources_admin_read_private on public.bible_edition_member_sources
  for select to authenticated using (public.is_admin());
create policy bible_edition_components_admin_read_private on public.bible_edition_components
  for select to authenticated using (public.is_admin());
