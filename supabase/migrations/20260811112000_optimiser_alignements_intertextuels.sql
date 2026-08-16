begin;

create index if not exists texte_alignement_ensembles_reference_fk_idx
  on public.texte_alignement_ensembles (id_oeuvre, reference_text_id);

create index if not exists texte_alignement_ensembles_aligned_fk_idx
  on public.texte_alignement_ensembles (id_oeuvre, aligned_text_id);

create index if not exists texte_alignement_membres_groupe_fk_idx
  on public.texte_alignement_membres (alignment_set_id, alignment_id);

drop policy if exists texte_alignement_ensembles_admin_all
  on public.texte_alignement_ensembles;
drop policy if exists texte_alignement_ensembles_public_select
  on public.texte_alignement_ensembles;

create policy texte_alignement_ensembles_select
on public.texte_alignement_ensembles
for select to anon, authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.oeuvres as oeuvre
    join public.oeuvre_textes as reference_text
      on reference_text.id_texte = texte_alignement_ensembles.reference_text_id
     and reference_text.id_oeuvre = oeuvre.id_oeuvre
    join public.oeuvre_textes as aligned_text
      on aligned_text.id_texte = texte_alignement_ensembles.aligned_text_id
     and aligned_text.id_oeuvre = oeuvre.id_oeuvre
    where oeuvre.id_oeuvre = texte_alignement_ensembles.id_oeuvre
      and oeuvre.acces_public is true
      and reference_text.is_public is true
      and aligned_text.is_public is true
  )
);

create policy texte_alignement_ensembles_admin_insert
on public.texte_alignement_ensembles
for insert to authenticated
with check (public.is_admin());

create policy texte_alignement_ensembles_admin_update
on public.texte_alignement_ensembles
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy texte_alignement_ensembles_admin_delete
on public.texte_alignement_ensembles
for delete to authenticated
using (public.is_admin());

drop policy if exists texte_alignements_admin_all
  on public.texte_alignements;
drop policy if exists texte_alignements_public_select
  on public.texte_alignements;

create policy texte_alignements_select
on public.texte_alignements
for select to anon, authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.texte_alignement_ensembles as ensemble
    join public.oeuvres as oeuvre on oeuvre.id_oeuvre = ensemble.id_oeuvre
    join public.oeuvre_textes as reference_text
      on reference_text.id_texte = ensemble.reference_text_id
     and reference_text.id_oeuvre = ensemble.id_oeuvre
    join public.oeuvre_textes as aligned_text
      on aligned_text.id_texte = ensemble.aligned_text_id
     and aligned_text.id_oeuvre = ensemble.id_oeuvre
    where ensemble.alignment_set_id = texte_alignements.alignment_set_id
      and oeuvre.acces_public is true
      and reference_text.is_public is true
      and aligned_text.is_public is true
  )
);

create policy texte_alignements_admin_insert
on public.texte_alignements
for insert to authenticated
with check (public.is_admin());

create policy texte_alignements_admin_update
on public.texte_alignements
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy texte_alignements_admin_delete
on public.texte_alignements
for delete to authenticated
using (public.is_admin());

drop policy if exists texte_alignement_membres_admin_all
  on public.texte_alignement_membres;
drop policy if exists texte_alignement_membres_public_select
  on public.texte_alignement_membres;

create policy texte_alignement_membres_select
on public.texte_alignement_membres
for select to anon, authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.texte_alignement_ensembles as ensemble
    join public.oeuvres as oeuvre on oeuvre.id_oeuvre = ensemble.id_oeuvre
    join public.oeuvre_textes as reference_text
      on reference_text.id_texte = ensemble.reference_text_id
     and reference_text.id_oeuvre = ensemble.id_oeuvre
    join public.oeuvre_textes as aligned_text
      on aligned_text.id_texte = ensemble.aligned_text_id
     and aligned_text.id_oeuvre = ensemble.id_oeuvre
    where ensemble.alignment_set_id = texte_alignement_membres.alignment_set_id
      and oeuvre.acces_public is true
      and reference_text.is_public is true
      and aligned_text.is_public is true
  )
);

create policy texte_alignement_membres_admin_insert
on public.texte_alignement_membres
for insert to authenticated
with check (public.is_admin());

create policy texte_alignement_membres_admin_update
on public.texte_alignement_membres
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy texte_alignement_membres_admin_delete
on public.texte_alignement_membres
for delete to authenticated
using (public.is_admin());

commit;
