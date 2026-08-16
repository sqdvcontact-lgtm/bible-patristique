begin;

drop index if exists public.texte_alignement_ensembles_reference_fk_idx;
drop index if exists public.texte_alignement_ensembles_aligned_fk_idx;
drop index if exists public.texte_alignement_membres_groupe_fk_idx;

create index if not exists texte_alignement_ensembles_reference_fk_idx
  on public.texte_alignement_ensembles (reference_text_id, id_oeuvre);

create index if not exists texte_alignement_ensembles_aligned_fk_idx
  on public.texte_alignement_ensembles (aligned_text_id, id_oeuvre);

create index if not exists texte_alignement_membres_groupe_fk_idx
  on public.texte_alignement_membres (alignment_id, alignment_set_id);

commit;
