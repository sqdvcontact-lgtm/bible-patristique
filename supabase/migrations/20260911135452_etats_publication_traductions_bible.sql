-- Charte § 52 (11 septembre 2026), suite : la traduction porte le vocabulaire du texte,
-- et la couche éditoriale de la Bible ne retient plus que l'invalide.

-- 1. Traductions : statut de validation, motif, publication dérivée (est_privee = non publiée).
alter table public.traductions add column if not exists statut text;
alter table public.traductions add column if not exists motif_non_publication text;

update public.traductions set statut = case
    when trad_id = 'TR0012' then 'invalide'
    when trad_id in ('TR_FR_1604_MOREL_ORATIO_38', 'TR_FR_1827_AUGER_HEXAEMERON') then 'valide'
    when trad_id in ('TR0005', 'TR0010', 'TR0011', 'TR_FR_2026_IA_DHUODA_MANUEL',
                     'TR_FR_1870_1873_BARREAU_CHARPENTIER_AUGUSTIN_CIVITATE_DEI') then 'en_cours'
    else 'termine' end;
update public.traductions
   set motif_non_publication = 'Droits : traduction liturgique officielle protégée (AELF). Elle sert d''ossature interne à l''alignement et ne se montre qu''au compte administrateur.'
 where trad_id = 'TR0012';

alter table public.traductions alter column statut set default 'en_cours';
alter table public.traductions alter column statut set not null;
alter table public.traductions add constraint traductions_statut_check
  check (statut in ('valide', 'termine', 'en_cours', 'invalide'));
alter table public.traductions add constraint traductions_invalide_motive_ck
  check (statut <> 'invalide' or nullif(btrim(coalesce(motif_non_publication, '')), '') is not null);

create or replace function public.deriver_publication_traduction()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.est_privee := new.statut = 'invalide'
    or nullif(btrim(coalesce(new.motif_non_publication, '')), '') is not null;
  return new;
end $$;
create trigger traductions_publication_derivee
  before insert or update on public.traductions
  for each row execute function public.deriver_publication_traduction();

-- TR0013, terminée, devient publique ; Morel 1604, validée, aussi ; l'AELF reste fermée.
update public.traductions set statut = statut
 where est_privee is distinct from (statut = 'invalide'
       or nullif(btrim(coalesce(motif_non_publication, '')), '') is not null);

alter table public.traductions add constraint traductions_publication_regle_ck
  check (est_privee = (statut = 'invalide'
         or nullif(btrim(coalesce(motif_non_publication, '')), '') is not null));

comment on column public.traductions.statut is 'État de validation (charte § 52) : valide, termine, en_cours, invalide.';
comment on column public.traductions.est_privee is 'Non publiée (charte § 52). Dérivé par traductions_publication_derivee : ne s''écrit pas.';
comment on column public.traductions.motif_non_publication is 'Motif qui retient une traduction publiable, ou qui fait une invalide (charte § 52).';
revoke execute on function public.deriver_publication_traduction() from public, anon, authenticated;

-- 2. Couche éditoriale de la Bible : draft et review sont du travail en cours ou terminé,
--    donc publiables ; rejected et retired sont l'invalide. La publication elle-même reste
--    le drapeau is_public que la chaîne pose ; la fonction dit seulement ce qui PEUT l'être.
create or replace function public.bible_technical_publication_allowed(p_validation_status text, p_metadata jsonb)
returns boolean language sql immutable as $$
  select p_validation_status is distinct from 'rejected'
     and p_validation_status is distinct from 'retired'
$$;

alter policy bible_verse_note_relations_public_read on public.bible_verse_note_relations
  using (exists (select 1 from public.bible_verse_notes n
                  where n.id = bible_verse_note_relations.note_id and n.is_public
                    and public.bible_technical_publication_allowed(n.validation_status, n.metadata)));
alter policy bible_verse_note_anchors_public_read on public.bible_verse_note_anchors
  using (public.bible_technical_publication_allowed(validation_status, null)
         and exists (select 1 from public.bible_verse_notes n
                      where n.id = bible_verse_note_anchors.note_id and n.is_public
                        and public.bible_technical_publication_allowed(n.validation_status, n.metadata)));

-- 3. La traduction moderne de la Bible du XIIIe siècle, son édition en regard du
--    manuscrit et ses notes deviennent publiques (décision de l'éditeur, 11 septembre 2026).
update public.bible_text_sources set status = 'published', updated_at = now()
 where trad_id = 'TR0013' and source_code = 'bible899-modern-critical';
update public.bible_edition_families set status = 'published', updated_at = now()
 where family_code = 'bible899-critical-modern-v1';
update public.bible_edition_members m set status = 'published', updated_at = now()
  from public.bible_edition_families f
 where f.id = m.family_id and f.family_code = 'bible899-critical-modern-v1';
update public.bible_edition_components c set status = 'published', updated_at = now()
  from public.bible_edition_families f
 where f.id = c.family_id and f.family_code = 'bible899-critical-modern-v1';
update public.bible_edition_member_sources ms set status = 'published', updated_at = now()
  from public.bible_edition_families f
 where f.id = ms.family_id and f.family_code = 'bible899-critical-modern-v1';
update public.bible_verse_notes n set is_public = true, updated_at = now()
  from public.bible_edition_families f
 where f.id = n.family_id and f.family_code = 'bible899-critical-modern-v1'
   and public.bible_technical_publication_allowed(n.validation_status, n.metadata);
