begin;

create table if not exists public.texte_alignement_ensembles (
  alignment_set_id text primary key,
  id_oeuvre text not null,
  reference_text_id text not null,
  aligned_text_id text not null,
  alignment_level text not null,
  status text not null,
  method text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint texte_alignement_ensembles_textes_distincts_ck
    check (reference_text_id <> aligned_text_id),
  constraint texte_alignement_ensembles_level_ck
    check (alignment_level in ('segment', 'paragraph', 'division')),
  constraint texte_alignement_ensembles_status_ck
    check (status in ('candidate', 'reviewed_ai', 'uncertain', 'validated_human', 'retired')),
  constraint texte_alignement_ensembles_reference_fk
    foreign key (reference_text_id, id_oeuvre)
    references public.oeuvre_textes (id_texte, id_oeuvre)
    on update cascade on delete restrict,
  constraint texte_alignement_ensembles_aligned_fk
    foreign key (aligned_text_id, id_oeuvre)
    references public.oeuvre_textes (id_texte, id_oeuvre)
    on update cascade on delete restrict,
  constraint texte_alignement_ensembles_pair_level_uq
    unique (id_oeuvre, reference_text_id, aligned_text_id, alignment_level)
);

create table if not exists public.texte_alignements (
  alignment_id text primary key,
  alignment_set_id text not null,
  book integer not null,
  canonical_division_order integer not null,
  group_order integer not null,
  cardinality text not null,
  status text not null,
  confidence numeric,
  method text,
  justification text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint texte_alignements_ensemble_fk
    foreign key (alignment_set_id)
    references public.texte_alignement_ensembles (alignment_set_id)
    on update cascade on delete cascade,
  constraint texte_alignements_ordre_ck
    check (book > 0 and canonical_division_order > 0 and group_order > 0),
  constraint texte_alignements_cardinalite_ck
    check (cardinality in ('1:1', '1:n', 'n:1', 'n:m', '1:0', '0:1')),
  constraint texte_alignements_status_ck
    check (status in ('candidate', 'reviewed_ai', 'uncertain', 'validated_human')),
  constraint texte_alignements_confiance_ck
    check (confidence is null or (confidence >= 0 and confidence <= 1)),
  constraint texte_alignements_ordre_division_uq
    unique (alignment_set_id, book, canonical_division_order, group_order),
  constraint texte_alignements_id_ensemble_uq
    unique (alignment_id, alignment_set_id)
);

create table if not exists public.texte_alignement_membres (
  alignment_set_id text not null,
  alignment_id text not null,
  role text not null,
  member_order integer not null,
  id_texte text not null,
  segment_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint texte_alignement_membres_pk
    primary key (alignment_id, role, member_order),
  constraint texte_alignement_membres_groupe_fk
    foreign key (alignment_id, alignment_set_id)
    references public.texte_alignements (alignment_id, alignment_set_id)
    on update cascade on delete cascade,
  constraint texte_alignement_membres_segment_fk
    foreign key (id_texte, segment_key)
    references public.segments (id_texte, segment_key)
    on update cascade on delete restrict,
  constraint texte_alignement_membres_role_ck
    check (role in ('reference', 'aligned')),
  constraint texte_alignement_membres_ordre_ck
    check (member_order > 0),
  constraint texte_alignement_membres_segment_ensemble_uq
    unique (alignment_set_id, id_texte, segment_key)
);

create index if not exists texte_alignements_ensemble_division_idx
  on public.texte_alignements (alignment_set_id, book, canonical_division_order, group_order);
create index if not exists texte_alignement_membres_segment_idx
  on public.texte_alignement_membres (id_texte, segment_key);
create index if not exists texte_alignement_membres_groupe_idx
  on public.texte_alignement_membres (alignment_id, role, member_order);

create or replace function public.verifier_texte_alignement_membre()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reference_text_id text;
  v_aligned_text_id text;
begin
  select ensemble.reference_text_id, ensemble.aligned_text_id
    into v_reference_text_id, v_aligned_text_id
  from public.texte_alignements as alignement
  join public.texte_alignement_ensembles as ensemble
    on ensemble.alignment_set_id = alignement.alignment_set_id
  where alignement.alignment_id = new.alignment_id
    and alignement.alignment_set_id = new.alignment_set_id;

  if not found then
    raise exception 'Ensemble d alignement introuvable pour %', new.alignment_id;
  end if;

  if new.role = 'reference' and new.id_texte <> v_reference_text_id then
    raise exception 'Le membre reference doit viser %', v_reference_text_id;
  end if;
  if new.role = 'aligned' and new.id_texte <> v_aligned_text_id then
    raise exception 'Le membre aligned doit viser %', v_aligned_text_id;
  end if;
  return new;
end;
$$;

drop trigger if exists verifier_texte_alignement_membre_trigger
  on public.texte_alignement_membres;
create trigger verifier_texte_alignement_membre_trigger
before insert or update on public.texte_alignement_membres
for each row execute function public.verifier_texte_alignement_membre();

drop trigger if exists texte_alignement_ensembles_updated_at_trigger
  on public.texte_alignement_ensembles;
create trigger texte_alignement_ensembles_updated_at_trigger
before update on public.texte_alignement_ensembles
for each row execute function public.set_updated_at();

drop trigger if exists texte_alignements_updated_at_trigger
  on public.texte_alignements;
create trigger texte_alignements_updated_at_trigger
before update on public.texte_alignements
for each row execute function public.set_updated_at();

alter table public.texte_alignement_ensembles enable row level security;
alter table public.texte_alignements enable row level security;
alter table public.texte_alignement_membres enable row level security;

drop policy if exists texte_alignement_ensembles_admin_all on public.texte_alignement_ensembles;
create policy texte_alignement_ensembles_admin_all
on public.texte_alignement_ensembles
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists texte_alignement_ensembles_public_select on public.texte_alignement_ensembles;
create policy texte_alignement_ensembles_public_select
on public.texte_alignement_ensembles
for select to anon, authenticated
using (
  exists (
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

drop policy if exists texte_alignements_admin_all on public.texte_alignements;
create policy texte_alignements_admin_all
on public.texte_alignements
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists texte_alignements_public_select on public.texte_alignements;
create policy texte_alignements_public_select
on public.texte_alignements
for select to anon, authenticated
using (
  exists (
    select 1
    from public.texte_alignement_ensembles as ensemble
    join public.oeuvres as oeuvre on oeuvre.id_oeuvre = ensemble.id_oeuvre
    join public.oeuvre_textes as reference_text on reference_text.id_texte = ensemble.reference_text_id
    join public.oeuvre_textes as aligned_text on aligned_text.id_texte = ensemble.aligned_text_id
    where ensemble.alignment_set_id = texte_alignements.alignment_set_id
      and oeuvre.acces_public is true
      and reference_text.is_public is true
      and aligned_text.is_public is true
  )
);

drop policy if exists texte_alignement_membres_admin_all on public.texte_alignement_membres;
create policy texte_alignement_membres_admin_all
on public.texte_alignement_membres
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists texte_alignement_membres_public_select on public.texte_alignement_membres;
create policy texte_alignement_membres_public_select
on public.texte_alignement_membres
for select to anon, authenticated
using (
  exists (
    select 1
    from public.texte_alignement_ensembles as ensemble
    join public.oeuvres as oeuvre on oeuvre.id_oeuvre = ensemble.id_oeuvre
    join public.oeuvre_textes as reference_text on reference_text.id_texte = ensemble.reference_text_id
    join public.oeuvre_textes as aligned_text on aligned_text.id_texte = ensemble.aligned_text_id
    where ensemble.alignment_set_id = texte_alignement_membres.alignment_set_id
      and oeuvre.acces_public is true
      and reference_text.is_public is true
      and aligned_text.is_public is true
  )
);

grant select on public.texte_alignement_ensembles to anon, authenticated;
grant select on public.texte_alignements to anon, authenticated;
grant select on public.texte_alignement_membres to anon, authenticated;
grant insert, update, delete on public.texte_alignement_ensembles to authenticated;
grant insert, update, delete on public.texte_alignements to authenticated;
grant insert, update, delete on public.texte_alignement_membres to authenticated;

comment on table public.texte_alignement_ensembles is
  'Ensembles de production pour alignements intertextuels entre versions d une oeuvre.';
comment on table public.texte_alignements is
  'Groupes ordonnes d alignement semantique, sans modification des segments sources.';
comment on table public.texte_alignement_membres is
  'Membres ordonnes reference/aligned des groupes d alignement.';

commit;
