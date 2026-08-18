-- Corpus Scriptura — modèle textuel multiversion.
-- Migration additive et rétrocompatible préparée pour l'import Mirandol 1861.

set lock_timeout = '10s';
set statement_timeout = '120s';

do $$
begin
  if (select count(*) from public.segments) <> 53821 then
    raise exception 'Précondition refusée : 53821 segments historiques attendus.';
  end if;
  if exists (select 1 from public.oeuvres where id_oeuvre = 'A0064O0001') then
    raise exception 'Précondition refusée : A0064O0001 existe déjà.';
  end if;
  if exists (select 1 from public.segments where id_oeuvre = 'A0064O0001') then
    raise exception 'Précondition refusée : des segments A0064O0001 existent déjà.';
  end if;
  if exists (
    select 1 from public.segments
    group by id_oeuvre, segment_numero
    having count(*) > 1
  ) then
    raise exception 'Précondition refusée : doublons historiques de numérotation.';
  end if;
end
$$;

create table public.oeuvre_textes (
  id_texte text primary key,
  id_oeuvre text not null references public.oeuvres(id_oeuvre) on update cascade on delete restrict,
  catalogue_notice_id_ligne text references public.catalogue_notices(id_ligne) on update cascade on delete restrict,
  id_traduction text,
  titre_version text,
  langue text,
  traducteur text,
  edition_label text,
  annee_edition integer,
  source_url text,
  statut text not null default 'draft' check (statut in ('draft', 'review', 'published', 'retired')),
  is_default boolean not null default false,
  is_public boolean not null default false,
  nb_signes integer not null default 0 check (nb_signes >= 0),
  source_docx_sha256 text,
  control_pdf_sha256 text,
  notes_json_sha256 text,
  segmentation_archive_sha256 text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint oeuvre_textes_id_oeuvre_uq unique (id_texte, id_oeuvre),
  constraint oeuvre_textes_sha256_ck check (
    (source_docx_sha256 is null or source_docx_sha256 ~ '^[0-9A-Fa-f]{64}$') and
    (control_pdf_sha256 is null or control_pdf_sha256 ~ '^[0-9A-Fa-f]{64}$') and
    (notes_json_sha256 is null or notes_json_sha256 ~ '^[0-9A-Fa-f]{64}$') and
    (segmentation_archive_sha256 is null or segmentation_archive_sha256 ~ '^[0-9A-Fa-f]{64}$')
  )
);

create unique index oeuvre_textes_un_defaut_par_oeuvre_uq
  on public.oeuvre_textes(id_oeuvre) where is_default;
create index oeuvre_textes_oeuvre_idx on public.oeuvre_textes(id_oeuvre);
create index oeuvre_textes_public_idx on public.oeuvre_textes(id_oeuvre, is_public) where is_public;

create function public.maj_updated_at_oeuvre_texte()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create trigger oeuvre_textes_updated_at
before update on public.oeuvre_textes
for each row execute function public.maj_updated_at_oeuvre_texte();

create function public.verifier_publication_texte()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.is_public and not exists (
    select 1 from public.oeuvres o
    where o.id_oeuvre = new.id_oeuvre and o.acces_public
  ) then
    raise exception 'Un texte ne peut pas être public si son œuvre ne l''est pas.';
  end if;
  return new;
end
$$;

create trigger oeuvre_textes_publication_parent
before insert or update of is_public, id_oeuvre on public.oeuvre_textes
for each row execute function public.verifier_publication_texte();

create function public.verifier_depublication_oeuvre()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.acces_public and not new.acces_public and exists (
    select 1 from public.oeuvre_textes t
    where t.id_oeuvre = new.id_oeuvre and t.is_public
  ) then
    raise exception 'Dépublier d''abord les textes publics de l''œuvre %.', new.id_oeuvre;
  end if;
  return new;
end
$$;

create trigger oeuvres_depublication_textes
before update of acces_public on public.oeuvres
for each row execute function public.verifier_depublication_oeuvre();

create table public.oeuvre_texte_unites (
  id_texte text not null references public.oeuvre_textes(id_texte) on update cascade on delete cascade,
  source_unit_id text not null,
  source_parent_id text,
  espace_textuel text not null check (espace_textuel in ('corps', 'introduction', 'apparat_critique')),
  global_order integer not null check (global_order > 0),
  ordre_documentaire integer check (ordre_documentaire is null or ordre_documentaire > 0),
  ref_niv1 text,
  ref_niv2 text,
  ref_niv3 text,
  ref_niv4 text,
  ref_niv5 text,
  book text,
  book_heading text,
  section text,
  paragraphe integer check (paragraphe is null or paragraphe > 0),
  source_parent_paragraph integer check (source_parent_paragraph is null or source_parent_paragraph > 0),
  turn_order integer check (turn_order is null or turn_order > 0),
  type_unite text,
  source_kind text,
  clean_text text not null,
  clean_text_sha256 text check (clean_text_sha256 is null or clean_text_sha256 ~ '^[0-9A-Fa-f]{64}$'),
  page_debut integer check (page_debut is null or page_debut > 0),
  page_status text,
  source_locator jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  primary key (id_texte, source_unit_id),
  unique (id_texte, global_order)
);

alter table public.segments
  add column id_texte text,
  add column segment_key text,
  add column source_unit_id text,
  add column espace_textuel text,
  add column source_start_offset_unicode integer,
  add column source_end_offset_unicode integer,
  add column join_before text,
  add column segment_metadata jsonb not null default '{}'::jsonb;

insert into public.oeuvre_textes (
  id_texte, id_oeuvre, titre_version, langue, traducteur, edition_label,
  statut, is_default, is_public, nb_signes, metadata
)
select
  'TXT_' || o.id_oeuvre || '_LEGACY',
  o.id_oeuvre,
  coalesce(o.titre_affichage, o.titre),
  o.langue_trad,
  o.trad_auteur,
  concat_ws(', ', o.editeur, o.ville, o.date_publication),
  case when o.acces_public then 'published' else 'review' end,
  true,
  o.acces_public,
  coalesce(o.nb_signes, 0),
  jsonb_build_object(
    'legacy', true,
    'origin', 'pre_multiversion_model',
    'backfilled_at', now()
  )
from public.oeuvres o;

-- Le backfill ne modifie ni le texte ni l'oeuvre des segments. Suspendre ce
-- trigger évite de matérialiser 53 821 lignes complètes dans les tables de
-- transition, ce qui dépasserait l'espace temporaire du projet.
alter table public.segments disable trigger trg_nb_signes_maj;

update public.segments s
set id_texte = 'TXT_' || s.id_oeuvre || '_LEGACY',
    segment_key = 'LEGACY:' || s.id::text,
    espace_textuel = case
      when s.nature = 'introduction' then 'introduction'
      when s.nature = 'apparat_critique' then 'apparat_critique'
      else 'corps'
    end,
    segment_metadata = jsonb_build_object('legacy_segment_id', s.id, 'origin', 'pre_multiversion_model');

alter table public.segments enable trigger trg_nb_signes_maj;

alter table public.segments
  alter column id_texte set not null,
  alter column espace_textuel set not null,
  add constraint segments_texte_oeuvre_fk foreign key (id_texte, id_oeuvre)
    references public.oeuvre_textes(id_texte, id_oeuvre) on update cascade on delete restrict,
  add constraint segments_texte_numero_uq unique (id_texte, segment_numero),
  add constraint segments_texte_segment_key_uq unique (id_texte, segment_key),
  add constraint segments_id_texte_uq unique (id, id_texte),
  add constraint segments_source_unit_fk foreign key (id_texte, source_unit_id)
    references public.oeuvre_texte_unites(id_texte, source_unit_id) on update cascade on delete restrict,
  add constraint segments_espace_textuel_ck check (espace_textuel in ('corps', 'introduction', 'apparat_critique')),
  add constraint segments_offsets_ck check (
    (source_start_offset_unicode is null and source_end_offset_unicode is null) or
    (source_start_offset_unicode >= 0 and source_end_offset_unicode >= source_start_offset_unicode)
  );

drop trigger if exists trg_numero_unique on public.segments;
drop function if exists public.garde_numero_unique();

create index segments_texte_numero_idx on public.segments(id_texte, segment_numero);
create index segments_texte_paragraphe_idx
  on public.segments(id_texte, espace_textuel, ref_niv1, ref_niv2, ref_niv3, ref_niv4, ref_niv5, paragraphe, rang)
  where paragraphe is not null;

-- Recaler la séquence portée par la colonne identity avant les nouveaux imports.
select setval('public.segments_id_seq1', (select max(id) from public.segments), true);

create function public.resoudre_contexte_segment()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.id_texte is null then
    select t.id_texte into new.id_texte
    from public.oeuvre_textes t
    where t.id_oeuvre = new.id_oeuvre and t.is_default;
  end if;
  if new.id_texte is null then
    raise exception 'Aucun texte par défaut pour l''œuvre %.', new.id_oeuvre;
  end if;
  if new.segment_key is null then
    new.segment_key := 'LEGACY:' || new.id::text;
  end if;
  if new.espace_textuel is null then
    new.espace_textuel := case
      when new.nature = 'introduction' then 'introduction'
      when new.nature = 'apparat_critique' then 'apparat_critique'
      else 'corps'
    end;
  end if;
  return new;
end
$$;

create trigger segments_resoudre_contexte
before insert or update of id_oeuvre, id_texte, segment_key, nature, espace_textuel on public.segments
for each row execute function public.resoudre_contexte_segment();

create table public.texte_notes (
  id_texte text not null references public.oeuvre_textes(id_texte) on update cascade on delete cascade,
  note_key text not null,
  book text,
  note_number integer check (note_number is null or note_number > 0),
  footnote_id integer,
  source_target text,
  printed_page integer check (printed_page is null or printed_page > 0),
  metadata jsonb not null default '{}'::jsonb,
  primary key (id_texte, note_key),
  unique (id_texte, footnote_id),
  unique (id_texte, source_target)
);

create table public.texte_note_blocs (
  id_texte text not null,
  note_key text not null,
  block_id text not null,
  rank integer not null check (rank > 0),
  kind text not null check (kind in ('lemma', 'commentary', 'quotation', 'translation', 'reference', 'attribution')),
  form text not null check (form in ('prose', 'verse')),
  language text,
  text text not null,
  rendering text,
  needs_review boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  primary key (id_texte, note_key, block_id),
  unique (id_texte, note_key, rank),
  foreign key (id_texte, note_key) references public.texte_notes(id_texte, note_key)
    on update cascade on delete cascade
);

create table public.texte_note_relations (
  id_texte text not null,
  note_key text not null,
  relation_kind text not null check (relation_kind in ('translation_of', 'target_block')),
  source_block_id text not null,
  target_block_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  primary key (id_texte, note_key, relation_kind, source_block_id, target_block_id),
  foreign key (id_texte, note_key, source_block_id)
    references public.texte_note_blocs(id_texte, note_key, block_id) on update cascade on delete cascade,
  foreign key (id_texte, note_key, target_block_id)
    references public.texte_note_blocs(id_texte, note_key, block_id) on update cascade on delete cascade
);

create table public.texte_note_ancres (
  id_texte text not null,
  anchor_id text not null,
  note_key text not null,
  source_target text not null,
  source_parent_id text,
  source_unit_id text not null,
  source_offset_unicode integer check (source_offset_unicode is null or source_offset_unicode >= 0),
  source_unit_offset_unicode integer check (source_unit_offset_unicode is null or source_unit_offset_unicode >= 0),
  segment_key text not null,
  segment_numero integer not null check (segment_numero > 0),
  segment_offset_unicode integer check (segment_offset_unicode is null or segment_offset_unicode >= 0),
  marker text not null,
  anchor_text_left text,
  anchor_text_right text,
  structured_block_count integer not null check (structured_block_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  primary key (id_texte, anchor_id),
  foreign key (id_texte, note_key) references public.texte_notes(id_texte, note_key)
    on update cascade on delete cascade,
  foreign key (id_texte, segment_key) references public.segments(id_texte, segment_key)
    on update cascade on delete cascade,
  foreign key (id_texte, source_unit_id) references public.oeuvre_texte_unites(id_texte, source_unit_id)
    on update cascade on delete restrict
);

create table public.texte_groupes_logiques (
  id_texte text not null references public.oeuvre_textes(id_texte) on update cascade on delete cascade,
  group_id text not null,
  relation_type text not null,
  justification text,
  metadata jsonb not null default '{}'::jsonb,
  primary key (id_texte, group_id)
);

create table public.texte_groupe_membres (
  id_texte text not null,
  group_id text not null,
  member_order integer not null check (member_order > 0),
  source_unit_id text not null,
  role text not null,
  primary key (id_texte, group_id, member_order),
  unique (id_texte, group_id, source_unit_id),
  foreign key (id_texte, group_id) references public.texte_groupes_logiques(id_texte, group_id)
    on update cascade on delete cascade,
  foreign key (id_texte, source_unit_id) references public.oeuvre_texte_unites(id_texte, source_unit_id)
    on update cascade on delete restrict
);

create table public.texte_relations_logiques (
  id_texte text not null references public.oeuvre_textes(id_texte) on update cascade on delete cascade,
  relation_id text not null,
  relation_type text not null,
  source_segment_key text not null,
  target_segment_key text not null,
  target_unit_id text not null,
  justification text,
  metadata jsonb not null default '{}'::jsonb,
  primary key (id_texte, relation_id),
  foreign key (id_texte, source_segment_key) references public.segments(id_texte, segment_key)
    on update cascade on delete cascade,
  foreign key (id_texte, target_segment_key) references public.segments(id_texte, segment_key)
    on update cascade on delete cascade,
  foreign key (id_texte, target_unit_id) references public.oeuvre_texte_unites(id_texte, source_unit_id)
    on update cascade on delete restrict
);

alter table public.prelevements
  add column segment_id bigint,
  add column id_texte text;

update public.prelevements p
set segment_id = s.id,
    id_texte = s.id_texte
from public.segments s
where p.type = 'patristique'
  and s.id_oeuvre = p.id_oeuvre
  and s.segment_numero = p.segment_numero;

alter table public.prelevements
  add constraint prelevements_segment_texte_pair_ck check (
    (segment_id is null and id_texte is null) or
    (segment_id is not null and id_texte is not null)
  ),
  add constraint prelevements_segment_texte_fk foreign key (segment_id, id_texte)
    references public.segments(id, id_texte) on update cascade on delete set null;

create unique index prelevements_user_segment_uq
  on public.prelevements(user_id, segment_id) where segment_id is not null;
create index prelevements_texte_idx on public.prelevements(id_texte) where id_texte is not null;

create function public.resoudre_prelevement_segment()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare v_segment public.segments%rowtype;
begin
  if new.type <> 'patristique' then
    return new;
  end if;
  if new.segment_id is not null then
    select * into v_segment from public.segments where id = new.segment_id;
  elsif new.id_oeuvre is not null and new.segment_numero is not null then
    select s.* into v_segment
    from public.segments s
    join public.oeuvre_textes t on t.id_texte = s.id_texte and t.is_default
    where s.id_oeuvre = new.id_oeuvre and s.segment_numero = new.segment_numero;
  end if;
  if v_segment.id is not null then
    new.segment_id := v_segment.id;
    new.id_texte := v_segment.id_texte;
    new.id_oeuvre := v_segment.id_oeuvre;
    new.segment_numero := v_segment.segment_numero;
  end if;
  return new;
end
$$;

create trigger prelevements_resoudre_segment
before insert or update of segment_id, id_texte, id_oeuvre, segment_numero, type on public.prelevements
for each row execute function public.resoudre_prelevement_segment();

create or replace function public.maj_nb_signes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare textes_touches text[];
begin
  if tg_op = 'INSERT' then
    select array_agg(distinct id_texte) into textes_touches from nouveaux;
  elsif tg_op = 'DELETE' then
    select array_agg(distinct id_texte) into textes_touches from anciens;
  else
    select array_agg(distinct id_texte) into textes_touches
    from (select id_texte from nouveaux union select id_texte from anciens) t;
  end if;

  update public.oeuvre_textes ot
  set nb_signes = coalesce((
    select sum(length(s.segment_texte))::integer
    from public.segments s where s.id_texte = ot.id_texte
  ), 0)
  where ot.id_texte = any(coalesce(textes_touches, array[]::text[]));

  update public.oeuvres o
  set nb_signes = coalesce(t.nb_signes, 0)
  from public.oeuvre_textes t
  where t.id_oeuvre = o.id_oeuvre
    and t.is_default
    and t.id_texte = any(coalesce(textes_touches, array[]::text[]));
  return null;
end
$$;

create function public.get_niv1_list(p_id_oeuvre text, p_id_texte text)
returns table(ref_niv1 text)
language sql stable
set search_path = public, pg_temp
as $$
  select x.ref_niv1
  from (
    select s.ref_niv1, min(s.segment_numero) as premier
    from public.segments s
    where s.id_oeuvre = p_id_oeuvre
      and s.id_texte = p_id_texte
      and s.ref_niv1 is not null and s.ref_niv1 <> ''
      and s.nature <> 'separateur'
    group by s.ref_niv1
  ) x
  order by x.premier
$$;

create or replace function public.get_niv1_list(p_id_oeuvre text)
returns table(ref_niv1 text)
language sql stable
set search_path = public, pg_temp
as $$
  select * from public.get_niv1_list(
    p_id_oeuvre,
    (select t.id_texte from public.oeuvre_textes t where t.id_oeuvre = p_id_oeuvre and t.is_default)
  )
$$;

create function public.get_niv1_texte(p_id_oeuvre text, p_id_texte text)
returns table(ref_niv1 text, ref_niv1_texte text)
language sql stable
set search_path = public, pg_temp
as $$
  select s.ref_niv1,
         (array_agg(s.ref_niv1_texte order by s.segment_numero)
            filter (where s.ref_niv1_texte is not null and s.ref_niv1_texte <> ''))[1]
  from public.segments s
  where s.id_oeuvre = p_id_oeuvre
    and s.id_texte = p_id_texte
    and s.ref_niv1 is not null and s.ref_niv1 <> ''
    and s.nature = any(array['texte','introduction','citation','dialogue','texte absent','vers','rubrique'])
  group by s.ref_niv1
$$;

create or replace function public.get_niv1_texte(p_id_oeuvre text)
returns table(ref_niv1 text, ref_niv1_texte text)
language sql stable
set search_path = public, pg_temp
as $$
  select * from public.get_niv1_texte(
    p_id_oeuvre,
    (select t.id_texte from public.oeuvre_textes t where t.id_oeuvre = p_id_oeuvre and t.is_default)
  )
$$;

create function public.recherche_segments(p_terme text, p_exact boolean, p_id_texte text)
returns table(id bigint, segment_texte text, id_oeuvre text, id_texte text, ref_niv1 text, ref_niv3 text)
language plpgsql stable
set search_path = public, extensions, pg_temp
as $$
declare pattern text; tn text := unaccent(lower(p_terme));
begin
  pattern := case when p_exact
    then '(^|[[:space:]])' || tn || '([[:space:]]|$)'
    else '(^|[[:space:]])' || tn end;
  return query
    select s.id, s.segment_texte, s.id_oeuvre, s.id_texte, s.ref_niv1, s.ref_niv3
    from public.segments s
    where s.nature = any(array['texte','citation','dialogue','vers','rubrique'])
      and s.texte_norm ~ pattern
      and (
        (p_id_texte is not null and s.id_texte = p_id_texte) or
        (p_id_texte is null and exists (
          select 1 from public.oeuvre_textes t where t.id_texte = s.id_texte and t.is_default
        ))
      )
    limit 5000;
end
$$;

create or replace function public.recherche_segments(p_terme text, p_exact boolean default false)
returns table(id bigint, segment_texte text, id_oeuvre text, ref_niv1 text, ref_niv3 text)
language sql stable
set search_path = public, extensions, pg_temp
as $$
  select r.id, r.segment_texte, r.id_oeuvre, r.ref_niv1, r.ref_niv3
  from public.recherche_segments(p_terme, p_exact, null::text) r
$$;

create function public.recherche_segments_original(p_terme text, p_exact boolean, p_id_texte text)
returns table(id bigint, segment_texte text, texte_original text, id_oeuvre text, id_texte text, langue text, ref_niv1 text, ref_niv3 text)
language plpgsql stable
set search_path = public, extensions, pg_temp
as $$
declare pattern text; tn text := lower(p_terme);
begin
  pattern := case when p_exact
    then '(^|[[:space:]])' || tn || '([[:space:]]|$)'
    else '(^|[[:space:]])' || tn end;
  return query
    select s.id, s.segment_texte, s.texte_original, s.id_oeuvre, s.id_texte,
           coalesce(t.langue, o.langue_originale), s.ref_niv1, s.ref_niv3
    from public.segments s
    join public.oeuvre_textes t on t.id_texte = s.id_texte
    join public.oeuvres o on o.id_oeuvre = s.id_oeuvre
    where s.nature = any(array['texte','citation','dialogue','vers','rubrique'])
      and s.texte_original is not null
      and lower(s.texte_original) ~ pattern
      and ((p_id_texte is not null and s.id_texte = p_id_texte) or (p_id_texte is null and t.is_default))
    limit 5000;
end
$$;

create or replace function public.recherche_segments_original(p_terme text, p_exact boolean default false)
returns table(id bigint, segment_texte text, texte_original text, id_oeuvre text, langue text, ref_niv1 text, ref_niv3 text)
language sql stable
set search_path = public, extensions, pg_temp
as $$
  select r.id, r.segment_texte, r.texte_original, r.id_oeuvre, r.langue, r.ref_niv1, r.ref_niv3
  from public.recherche_segments_original(p_terme, p_exact, null::text) r
$$;

drop policy if exists "Lecture des segments accessibles" on public.segments;
create policy "Lecture des segments accessibles"
on public.segments for select to authenticated
using (
  (select public.is_admin()) or exists (
    select 1
    from public.oeuvre_textes t
    join public.oeuvres o on o.id_oeuvre = t.id_oeuvre
    where t.id_texte = segments.id_texte
      and o.acces_public
      and t.is_public
  )
);

alter table public.oeuvre_textes enable row level security;
alter table public.oeuvre_texte_unites enable row level security;
alter table public.texte_notes enable row level security;
alter table public.texte_note_blocs enable row level security;
alter table public.texte_note_relations enable row level security;
alter table public.texte_note_ancres enable row level security;
alter table public.texte_groupes_logiques enable row level security;
alter table public.texte_groupe_membres enable row level security;
alter table public.texte_relations_logiques enable row level security;

create policy oeuvre_textes_lecture on public.oeuvre_textes for select to authenticated
using ((select public.is_admin()) or (is_public and exists (
  select 1 from public.oeuvres o where o.id_oeuvre = oeuvre_textes.id_oeuvre and o.acces_public
)));
create policy oeuvre_textes_admin_insert on public.oeuvre_textes for insert to authenticated with check (public.is_admin());
create policy oeuvre_textes_admin_update on public.oeuvre_textes for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy oeuvre_textes_admin_delete on public.oeuvre_textes for delete to authenticated using (public.is_admin());

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'oeuvre_texte_unites','texte_notes','texte_note_blocs','texte_note_relations',
    'texte_note_ancres','texte_groupes_logiques','texte_groupe_membres','texte_relations_logiques'
  ] loop
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select public.is_admin()) or exists (select 1 from public.oeuvre_textes t join public.oeuvres o on o.id_oeuvre=t.id_oeuvre where t.id_texte=%I.id_texte and t.is_public and o.acces_public))',
      table_name || '_lecture', table_name, table_name
    );
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_admin())', table_name || '_admin_insert', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())', table_name || '_admin_update', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_admin())', table_name || '_admin_delete', table_name);
  end loop;
end
$$;

grant select, insert, update, delete on public.oeuvre_textes to authenticated;
grant select, insert, update, delete on public.oeuvre_texte_unites to authenticated;
grant select, insert, update, delete on public.texte_notes to authenticated;
grant select, insert, update, delete on public.texte_note_blocs to authenticated;
grant select, insert, update, delete on public.texte_note_relations to authenticated;
grant select, insert, update, delete on public.texte_note_ancres to authenticated;
grant select, insert, update, delete on public.texte_groupes_logiques to authenticated;
grant select, insert, update, delete on public.texte_groupe_membres to authenticated;
grant select, insert, update, delete on public.texte_relations_logiques to authenticated;

grant all on public.oeuvre_textes to service_role;
grant all on public.oeuvre_texte_unites to service_role;
grant all on public.texte_notes to service_role;
grant all on public.texte_note_blocs to service_role;
grant all on public.texte_note_relations to service_role;
grant all on public.texte_note_ancres to service_role;
grant all on public.texte_groupes_logiques to service_role;
grant all on public.texte_groupe_membres to service_role;
grant all on public.texte_relations_logiques to service_role;

revoke all on public.oeuvre_textes from anon;
revoke all on public.oeuvre_texte_unites from anon;
revoke all on public.texte_notes from anon;
revoke all on public.texte_note_blocs from anon;
revoke all on public.texte_note_relations from anon;
revoke all on public.texte_note_ancres from anon;
revoke all on public.texte_groupes_logiques from anon;
revoke all on public.texte_groupe_membres from anon;
revoke all on public.texte_relations_logiques from anon;

comment on table public.oeuvre_textes is 'Versions textuelles ou témoins rattachés à une œuvre canonique.';
comment on column public.segments.id_texte is 'Contexte textuel obligatoire ; l’identité éditoriale est (id_texte, segment_numero).';
comment on column public.segments.notes is 'Projection de compatibilité ; les tables texte_note_* sont autoritatives.';
comment on column public.prelevements.segment_id is 'Référence stable du segment patristique.';

do $$
begin
  if (select count(*) from public.segments) <> 53821 then
    raise exception 'Backfill invalide : le corpus historique a changé de cardinalité.';
  end if;
  if exists (select 1 from public.segments where id_texte is null or espace_textuel is null) then
    raise exception 'Backfill invalide : contexte textuel manquant.';
  end if;
  if (select count(*) from public.oeuvre_textes where metadata->>'legacy' = 'true')
     <> (select count(*) from public.oeuvres) then
    raise exception 'Backfill invalide : une version héritée manque.';
  end if;
end
$$;
