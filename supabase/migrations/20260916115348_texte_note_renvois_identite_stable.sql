-- RENVOIS STABLES DE NOTE À NOTE — la relation, et rien de ce qui s'affiche.
--
-- La table `texte_note_renvois` a été posée le 16 septembre 2026 hors du journal des
-- migrations, avec une vue `v_texte_note_renvois_affichage` qui RECOMPOSAIT l'affichage :
-- le numéro interne, un titre tiré de `oeuvre_texte_unites.ref_niv1` et le contenu de la
-- note visée. C'était une seconde écriture du titre de niveau 1 et du numéro de note,
-- parallèle à celle de l'application. La vue disparaît : le numéro affiché, le titre et
-- le contenu se résolvent AU RENDU, par le code qui les compose partout ailleurs
-- (`app/lib/renvoisNotes.ts`, `app/lib/renvoisNotesChargement.ts`).
--
-- La relation ne porte que l'IDENTITÉ :
--   source : (source_id_texte, source_note_key, source_block_id) → texte_note_blocs,
--            la relation disparaît avec son bloc ;
--   cible  : (target_id_texte, target_note_key) → texte_notes, ON DELETE RESTRICT :
--            une note encore visée ne se supprime pas en silence.
-- ⛔ Ni `note_number`, ni `footnote_id`, ni une lettre, une page ou un tome n'identifient
-- la cible. La forme imprimée de l'édition se garde en provenance (`source_citation`).
set local lock_timeout = '5s';

drop view if exists public.v_texte_note_renvois_affichage;

-- ── LA FORME IMPRIMÉE ────────────────────────────────────────────────────────────
-- `source_citation` est la SOUS-CHAÎNE EXACTE du bloc source que le composant dynamique
-- remplace au rendu : le même contrat que `texte_note_bloc_ouvrages.source_citation`.
alter table public.texte_note_renvois rename column source_reference to source_citation;
update public.texte_note_renvois
   set source_citation = btrim(source_citation)
 where source_citation is not null and source_citation <> btrim(source_citation);
alter table public.texte_note_renvois alter column source_citation set not null;
alter table public.texte_note_renvois
  add constraint texte_note_renvois_source_citation_non_vide check (length(btrim(source_citation)) > 0);

-- ── LE MODE DE RENDU ─────────────────────────────────────────────────────────────
-- `note_preview` : la citation est une INJONCTION de renvoi (« voir la note B de la Seconde
-- catéchèse, 4 ») ; le composant la remplace sur place.
-- `inline_mention` : la citation est un complément de la phrase (« nous avons vu dans la
-- note JJ de la Catéchèse VI que… ») ; la phrase garde une mention dynamique, et le
-- composant se pose sous le bloc.
alter table public.texte_note_renvois drop constraint texte_note_renvois_render_mode_check;
alter table public.texte_note_renvois
  add constraint texte_note_renvois_render_mode_check check (render_mode in ('note_preview', 'inline_mention'));

-- ── UNE NOTE NE SE RENVOIE PAS À ELLE-MÊME ───────────────────────────────────────
alter table public.texte_note_renvois
  add constraint texte_note_renvois_pas_elle_meme
  check (source_id_texte <> target_id_texte or source_note_key <> target_note_key);

alter table public.texte_note_renvois
  add constraint texte_note_renvois_metadata_objet check (jsonb_typeof(metadata) = 'object');

-- ── LES DATES, comme les tables voisines ─────────────────────────────────────────
drop trigger if exists texte_note_renvois_set_updated_at on public.texte_note_renvois;
create trigger texte_note_renvois_set_updated_at
  before update on public.texte_note_renvois
  for each row execute function internal.set_updated_at();

-- ── LE CONTRAT DE LA CITATION ────────────────────────────────────────────────────
-- ⛔ Une relation ne s'écrit que si sa citation est DANS le bloc source (ZR001). Le rendu
-- ne remplace qu'une sous-chaîne présente ; une citation absente ne masquerait rien et
-- ferait paraître le composant hors de sa phrase.
-- ⚠️ Le contrat se vérifie à l'écriture de la RELATION, jamais à celle du bloc : une
-- reprise du texte d'une note ne se bloque pas ici. Le rendu retombe alors sur le texte
-- source et pose le renvoi sous le bloc ; le fichier de contrôles compte ces dérives.
create or replace function internal.texte_note_renvois_citation_presente()
returns trigger
language plpgsql
set search_path = pg_catalog
as $fonction$
declare
  texte_bloc text;
begin
  select b.text into texte_bloc
    from public.texte_note_blocs b
   where b.id_texte = new.source_id_texte
     and b.note_key = new.source_note_key
     and b.block_id = new.source_block_id;
  if texte_bloc is null then
    -- La clé étrangère lève d'elle-même ; on ne double pas son message.
    return new;
  end if;
  if strpos(texte_bloc, new.source_citation) = 0 then
    raise exception 'Citation absente du bloc source % (%) : « % »',
      new.source_block_id, new.source_note_key, new.source_citation
      using errcode = 'ZR001';
  end if;
  return new;
end;
$fonction$;

revoke all on function internal.texte_note_renvois_citation_presente() from public;

drop trigger if exists texte_note_renvois_citation_presente on public.texte_note_renvois;
create trigger texte_note_renvois_citation_presente
  before insert or update of source_id_texte, source_note_key, source_block_id, source_citation
  on public.texte_note_renvois
  for each row execute function internal.texte_note_renvois_citation_presente();

comment on table public.texte_note_renvois is
  'Renvois stables d’une note vers une autre note. La cible est (target_id_texte, target_note_key) et elle seule ; le numéro affiché, le titre de niveau 1 et le contenu de la note visée se résolvent au rendu et ne sont jamais recopiés ici.';
comment on column public.texte_note_renvois.relation_rank is
  'Rang du renvoi dans son bloc source, dans l’ordre de lecture ; deux renvois d’une même citation imprimée se suivent.';
comment on column public.texte_note_renvois.source_citation is
  'Sous-chaîne exacte du bloc source, forme imprimée de l’édition (provenance) ; le rendu la remplace par le renvoi dynamique.';
comment on column public.texte_note_renvois.render_mode is
  'note_preview : la citation est une injonction de renvoi, remplacée sur place ; inline_mention : la citation est un complément de phrase, qui garde une mention dynamique.';
comment on column public.texte_note_renvois.metadata is
  'Provenance et résolution (mission, lettre imprimée, locus, méthode). Jamais le numéro, le titre ni le contenu de la note visée.';
