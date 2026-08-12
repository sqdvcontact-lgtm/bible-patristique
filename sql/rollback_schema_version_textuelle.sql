-- Retour arrière COMPLET du modèle multiversion.
-- Préconditions obligatoires : exécuter d'abord rollback_import_mirandol.sql,
-- sauvegarder la base, vérifier les empreintes historiques et confirmer la
-- maintenance par : set app.confirm_schema_text_rollback = 'YES';

begin;
lock table public.segments in share row exclusive mode;

drop function if exists public.importer_mirandol_1861(jsonb);

do $$
begin
  if current_setting('app.confirm_schema_text_rollback', true) <> 'YES' then
    raise exception 'Confirmation absente : set app.confirm_schema_text_rollback = YES';
  end if;
  if exists (select 1 from public.oeuvre_textes where coalesce(metadata->>'legacy','false') <> 'true') then
    raise exception 'Rollback refusé : une version non héritée existe encore.';
  end if;
  if exists (
    select 1 from public.oeuvres o
    left join public.oeuvre_textes t on t.id_oeuvre = o.id_oeuvre and t.is_default
    where t.id_texte is null
  ) then
    raise exception 'Rollback refusé : une œuvre n’a pas de version héritée par défaut.';
  end if;
  if exists (select 1 from public.segments where segment_key not like 'LEGACY:%') then
    raise exception 'Rollback refusé : des segments non hérités existent encore.';
  end if;
end
$$;

drop trigger if exists prelevements_resoudre_segment on public.prelevements;
drop function if exists public.resoudre_prelevement_segment();
drop index if exists public.prelevements_segment_texte_idx;
drop index if exists public.prelevements_user_segment_uq;
drop index if exists public.prelevements_texte_idx;
alter table public.prelevements drop constraint if exists prelevements_segment_texte_fk;
alter table public.prelevements drop constraint if exists prelevements_segment_texte_pair_ck;
alter table public.prelevements drop column if exists segment_id;
alter table public.prelevements drop column if exists id_texte;

drop function if exists public.get_niv1_list(text, text);
drop function if exists public.get_niv1_texte(text, text);
drop function if exists public.recherche_segments(text, boolean, text);
drop function if exists public.recherche_segments_original(text, boolean, text);

create or replace function public.get_niv1_list(p_id_oeuvre text)
returns table(ref_niv1 text)
language sql stable
set search_path = public, pg_temp
as $$
  select ref_niv1 from (
    select ref_niv1, min(id) as premier
    from public.segments
    where id_oeuvre = p_id_oeuvre
      and ref_niv1 is not null and ref_niv1 <> ''
      and nature <> 'separateur'
    group by ref_niv1
  ) sub
  order by premier
$$;

create or replace function public.get_niv1_texte(p_id_oeuvre text)
returns table(ref_niv1 text, ref_niv1_texte text)
language sql stable
set search_path = public, pg_temp
as $$
  select ref_niv1,
         (array_agg(ref_niv1_texte order by id)
            filter (where ref_niv1_texte is not null and ref_niv1_texte <> ''))[1]
  from public.segments
  where id_oeuvre = p_id_oeuvre
    and ref_niv1 is not null and ref_niv1 <> ''
    and nature = any (array['texte','introduction','citation','dialogue','texte absent'])
  group by ref_niv1
$$;

create or replace function public.recherche_segments(p_terme text, p_exact boolean default false)
returns table(id bigint, segment_texte text, id_oeuvre text, ref_niv1 text, ref_niv3 text)
language plpgsql stable
set search_path = public, extensions, pg_temp
as $$
declare pattern text; tn text := unaccent(lower(p_terme));
begin
  if p_exact then
    pattern := '(^|[[:space:]])' || tn || '([[:space:]]|$)';
  else
    pattern := '(^|[[:space:]])' || tn;
  end if;
  return query
    select s.id, s.segment_texte, s.id_oeuvre, s.ref_niv1, s.ref_niv3
    from public.segments s
    where s.nature = 'texte' and s.texte_norm ~ pattern
    limit 5000;
end
$$;

create or replace function public.recherche_segments_original(p_terme text, p_exact boolean default false)
returns table(id bigint, segment_texte text, texte_original text, id_oeuvre text, langue text, ref_niv1 text, ref_niv3 text)
language plpgsql stable
set search_path = public, extensions, pg_temp
as $$
declare pattern text; tn text := lower(p_terme);
begin
  if p_exact then
    pattern := '(^|[[:space:]])' || tn || '([[:space:]]|$)';
  else
    pattern := '(^|[[:space:]])' || tn;
  end if;
  return query
    select s.id, s.segment_texte, s.texte_original, s.id_oeuvre,
           o.langue_originale, s.ref_niv1, s.ref_niv3
    from public.segments s
    join public.oeuvres o on o.id_oeuvre = s.id_oeuvre
    where s.nature = 'texte'
      and s.texte_original is not null
      and lower(s.texte_original) ~ pattern
    limit 5000;
end
$$;

create or replace function public.maj_nb_signes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare oeuvres_touchees text[];
begin
  if tg_op = 'INSERT' then
    select array_agg(distinct id_oeuvre) into oeuvres_touchees from nouveaux;
  elsif tg_op = 'DELETE' then
    select array_agg(distinct id_oeuvre) into oeuvres_touchees from anciens;
  else
    select array_agg(distinct id_oeuvre) into oeuvres_touchees
    from (select id_oeuvre from nouveaux union select id_oeuvre from anciens) t;
  end if;
  update public.oeuvres o set nb_signes = coalesce(r.total, 0)
  from unnest(oeuvres_touchees) oe(id)
  left join lateral (
    select sum(length(s.segment_texte))::integer total
    from public.segments s where s.id_oeuvre = oe.id
  ) r on true
  where o.id_oeuvre = oe.id;
  return null;
end
$$;

drop policy if exists "Lecture des segments accessibles" on public.segments;
create policy "Lecture des segments accessibles"
on public.segments for select to authenticated
using ((select public.is_admin()) or exists (
  select 1 from public.oeuvres o where o.id_oeuvre = segments.id_oeuvre and o.acces_public
));

drop trigger if exists segments_resoudre_contexte on public.segments;
drop function if exists public.resoudre_contexte_segment();
drop index if exists public.segments_texte_source_unit_idx;
drop index if exists public.segments_texte_oeuvre_idx;
drop index if exists public.segments_texte_paragraphe_idx;
drop index if exists public.segments_texte_numero_idx;
alter table public.segments drop constraint if exists segments_source_unit_fk;
alter table public.segments drop constraint if exists segments_texte_oeuvre_fk;
alter table public.segments drop constraint if exists segments_texte_numero_uq;
alter table public.segments drop constraint if exists segments_texte_segment_key_uq;
alter table public.segments drop constraint if exists segments_id_texte_uq;
alter table public.segments drop constraint if exists segments_espace_textuel_ck;
alter table public.segments drop constraint if exists segments_offsets_ck;

drop table if exists public.texte_note_relations;
drop table if exists public.texte_note_ancres;
drop table if exists public.texte_note_blocs;
drop table if exists public.texte_notes;
drop table if exists public.texte_relations_logiques;
drop table if exists public.texte_groupe_membres;
drop table if exists public.texte_groupes_logiques;
drop table if exists public.oeuvre_texte_unites;

alter table public.segments
  drop column if exists id_texte,
  drop column if exists segment_key,
  drop column if exists source_unit_id,
  drop column if exists espace_textuel,
  drop column if exists source_start_offset_unicode,
  drop column if exists source_end_offset_unicode,
  drop column if exists join_before,
  drop column if exists segment_metadata;

create or replace function public.garde_numero_unique()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if exists (select 1 from public.segments where id_oeuvre = new.id_oeuvre
             and segment_numero = new.segment_numero and id <> new.id) then
    raise exception 'segment_numero % déjà pris dans l''œuvre %', new.segment_numero, new.id_oeuvre;
  end if;
  return new;
end
$$;
create trigger trg_numero_unique
before insert or update of segment_numero, id_oeuvre on public.segments
for each row execute function public.garde_numero_unique();

drop function if exists public.get_niv1_list(text, text);
drop function if exists public.get_niv1_texte(text, text);
drop function if exists public.recherche_segments(text, boolean, text);
drop function if exists public.recherche_segments_original(text, boolean, text);

create or replace function public.get_niv1_list(p_id_oeuvre text)
returns table(ref_niv1 text)
language sql stable
set search_path = public, pg_temp
as $$
  select ref_niv1 from (
    select ref_niv1, min(id) as premier
    from public.segments
    where id_oeuvre = p_id_oeuvre
      and ref_niv1 is not null and ref_niv1 <> ''
      and nature <> 'separateur'
    group by ref_niv1
  ) sub
  order by premier
$$;

create or replace function public.get_niv1_texte(p_id_oeuvre text)
returns table(ref_niv1 text, ref_niv1_texte text)
language sql stable
set search_path = public, pg_temp
as $$
  select ref_niv1,
         (array_agg(ref_niv1_texte order by id)
            filter (where ref_niv1_texte is not null and ref_niv1_texte <> ''))[1]
  from public.segments
  where id_oeuvre = p_id_oeuvre
    and ref_niv1 is not null and ref_niv1 <> ''
    and nature = any (array['texte','introduction','citation','dialogue','texte absent'])
  group by ref_niv1
$$;

create or replace function public.recherche_segments(p_terme text, p_exact boolean default false)
returns table(id bigint, segment_texte text, id_oeuvre text, ref_niv1 text, ref_niv3 text)
language plpgsql stable
set search_path = public, extensions, pg_temp
as $$
declare pattern text; tn text := unaccent(lower(p_terme));
begin
  if p_exact then
    pattern := '(^|[[:space:]])' || tn || '([[:space:]]|$)';
  else
    pattern := '(^|[[:space:]])' || tn;
  end if;
  return query
    select s.id, s.segment_texte, s.id_oeuvre, s.ref_niv1, s.ref_niv3
    from public.segments s
    where s.nature = 'texte' and s.texte_norm ~ pattern
    limit 5000;
end
$$;

create or replace function public.recherche_segments_original(p_terme text, p_exact boolean default false)
returns table(id bigint, segment_texte text, texte_original text, id_oeuvre text, langue text, ref_niv1 text, ref_niv3 text)
language plpgsql stable
set search_path = public, extensions, pg_temp
as $$
declare pattern text; tn text := lower(p_terme);
begin
  if p_exact then
    pattern := '(^|[[:space:]])' || tn || '([[:space:]]|$)';
  else
    pattern := '(^|[[:space:]])' || tn;
  end if;
  return query
    select s.id, s.segment_texte, s.texte_original, s.id_oeuvre,
           o.langue_originale, s.ref_niv1, s.ref_niv3
    from public.segments s
    join public.oeuvres o on o.id_oeuvre = s.id_oeuvre
    where s.nature = 'texte'
      and s.texte_original is not null
      and lower(s.texte_original) ~ pattern
    limit 5000;
end
$$;

create or replace function public.maj_nb_signes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare oeuvres_touchees text[];
begin
  if tg_op = 'INSERT' then
    select array_agg(distinct id_oeuvre) into oeuvres_touchees from nouveaux;
  elsif tg_op = 'DELETE' then
    select array_agg(distinct id_oeuvre) into oeuvres_touchees from anciens;
  else
    select array_agg(distinct id_oeuvre) into oeuvres_touchees
    from (select id_oeuvre from nouveaux union select id_oeuvre from anciens) t;
  end if;
  update public.oeuvres o set nb_signes = coalesce(r.total, 0)
  from unnest(oeuvres_touchees) oe(id)
  left join lateral (
    select sum(length(s.segment_texte))::integer total
    from public.segments s where s.id_oeuvre = oe.id
  ) r on true
  where o.id_oeuvre = oe.id;
  return null;
end
$$;

drop trigger if exists oeuvres_depublication_textes on public.oeuvres;
drop function if exists public.verifier_depublication_oeuvre();
drop table if exists public.oeuvre_textes;
drop function if exists public.verifier_publication_texte();
drop function if exists public.maj_updated_at_oeuvre_texte();

commit;
