-- Retour arrière borné de l'import Mirandol 1861.
-- À exécuter explicitement avec un rôle de maintenance ; jamais automatiquement.

begin;
select pg_advisory_xact_lock(hashtextextended('corpus-scriptura:import:TXT_A0064O0001_FR_1861_MIRANDOL', 0));

do $$
declare v_textes integer;
begin
  select count(*) into v_textes from public.oeuvre_textes where id_oeuvre = 'A0064O0001';
  if v_textes <> 1 or not exists (
    select 1 from public.oeuvre_textes
    where id_oeuvre = 'A0064O0001' and id_texte = 'TXT_A0064O0001_FR_1861_MIRANDOL'
  ) then
    raise exception 'Rollback refusé : A0064O0001 porte une autre version textuelle.';
  end if;
  if exists (
    select 1 from public.commentaires c join public.segments s on s.id = c.id_segment
    where s.id_texte = 'TXT_A0064O0001_FR_1861_MIRANDOL'
  ) or exists (
    select 1 from public.signalements sg join public.segments s on s.id = sg.id_segment
    where s.id_texte = 'TXT_A0064O0001_FR_1861_MIRANDOL'
  ) or exists (
    select 1 from public.prelevements p
    where p.id_texte = 'TXT_A0064O0001_FR_1861_MIRANDOL'
  ) then
    raise exception 'Rollback refusé : des données utilisateur ciblent Mirandol.';
  end if;
end
$$;

delete from public.texte_note_relations where id_texte = 'TXT_A0064O0001_FR_1861_MIRANDOL';
delete from public.texte_note_ancres where id_texte = 'TXT_A0064O0001_FR_1861_MIRANDOL';
delete from public.texte_note_blocs where id_texte = 'TXT_A0064O0001_FR_1861_MIRANDOL';
delete from public.texte_notes where id_texte = 'TXT_A0064O0001_FR_1861_MIRANDOL';
delete from public.texte_relations_logiques where id_texte = 'TXT_A0064O0001_FR_1861_MIRANDOL';
delete from public.texte_groupe_membres where id_texte = 'TXT_A0064O0001_FR_1861_MIRANDOL';
delete from public.texte_groupes_logiques where id_texte = 'TXT_A0064O0001_FR_1861_MIRANDOL';
delete from public.segments where id_texte = 'TXT_A0064O0001_FR_1861_MIRANDOL';
delete from public.oeuvre_texte_unites where id_texte = 'TXT_A0064O0001_FR_1861_MIRANDOL';
delete from public.oeuvre_textes where id_texte = 'TXT_A0064O0001_FR_1861_MIRANDOL';
delete from public.oeuvres
where id_oeuvre = 'A0064O0001'
  and not exists (select 1 from public.oeuvre_textes where id_oeuvre = 'A0064O0001');

update public.catalogue_notices
set presence_sur_le_site = false,
    traduction_publiee_sur_le_site = false,
    verifie_admin = false
where id_ligne = 'V20-03424';

commit;
