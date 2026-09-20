-- ── Le texte AELF est RÉSERVÉ à l'administrateur ─────────────────────────────
-- `traductions.est_privee` dit qu'une traduction ne se lit pas en public, et la RLS de
-- `versets_v2` l'applique fidèlement : sous le rôle du lecteur, TR0012 (la traduction
-- officielle liturgique, sous droits) ne rend aucune ligne. Mais `v_aelf_polyglotte_cells`
-- est une vue SANS `security_invoker` — donc SECURITY DEFINER —, et elle servait son texte
-- à n'importe quel compte connecté : 31 versets pour la seule Genèse 1, mesuré.
--
-- La fuite se propageait par dépendance, et se ferme donc ICI, en un seul endroit :
--   • `v_aelf_bible_lecture` en tirait ses colonnes `TR0012` / `num_TR0012` / `canon_TR0012` ;
--   • `v_aelf_bible_books_by_translation` en tirait les 74 livres de TR0012 et leurs comptes.
--
-- ⛔ Le critère n'est pas une liste d'identifiants, c'est celui de la RLS de `versets_v2` :
-- une traduction PRIVÉE ne sort que pour l'administrateur. Rendre TR0011 (la Vulgate de
-- Fillion) publique ou privée se décide donc dans `traductions`, et la garde suit.
-- ⚠️ `is_admin()` est VOLATILE : posée dans la clause d'une vue, elle serait évaluée ligne
-- à ligne. Le sous-select non corrélé la réduit à un calcul unique par requête.
do $$
declare corps text;
begin
  select pg_get_viewdef('public.v_aelf_polyglotte_cells'::regclass, true) into corps;
  if position('cellule_publiable' in corps) > 0 then
    raise notice 'La garde de publication est déjà posée.';
    return;
  end if;
  -- ⚠️ `pg_get_viewdef` rend le corps AVEC son point-virgule final.
  corps := rtrim(corps, E' \n\t;');
  execute
    'create or replace view public.v_aelf_polyglotte_cells as '
    || 'select cellule_publiable.* from (' || corps || ') cellule_publiable '
    || 'where cellule_publiable.trad_id in ('
    || '  select t.trad_id from public.traductions t'
    || '  where not t.est_privee or (select public.is_admin())'
    || ')';
end
$$;

-- ⚠️ Une vue qui CACHE des lignes se pose en barrière : sans elle, le planificateur peut
-- faire passer une condition de l'appelant AVANT la garde. Les comparaisons simples
-- (`=`, `in`) restent « leakproof » et descendent quand même ; ⛔ un `like`, non.
alter view public.v_aelf_polyglotte_cells set (security_barrier = true);

-- ⚠️ La LECTURE seulement. Ces trois vues donnaient `arwd` au rôle du lecteur : sur une
-- vue automatiquement modifiable, c'est une porte d'écriture dans les tables du dessous.
revoke all on public.v_aelf_polyglotte_cells from authenticated;
revoke all on public.v_aelf_bible_lecture from authenticated;
revoke all on public.v_aelf_bible_books_by_translation from authenticated;
grant select on public.v_aelf_polyglotte_cells to authenticated;
grant select on public.v_aelf_bible_lecture to authenticated;
grant select on public.v_aelf_bible_books_by_translation to authenticated;

-- ── La table de lecture de la Fillion ferme la même porte ────────────────────
-- Une vue MATÉRIALISÉE ne porte ni RLS ni garde dynamique : ce qu'on y range est lisible
-- par quiconque la lit. La garde se pose donc au RAFRAÎCHISSEMENT, et elle échoue du bon
-- côté — une traduction qui passerait en privée sort de la table au refresh suivant,
-- administrateur compris, qui la lit alors par les tables éditoriales.
drop view if exists public.v_polyglotte_fillion_livres;
drop materialized view if exists public.v_polyglotte_fillion;

create materialized view public.v_polyglotte_fillion as
select
  'fillion:' || f.id::text as id,
  f.aelf_book_code || '.' || f.aelf_chapter_base || '.' || f.aelf_verse_base as canon_id,
  null::text as canon_id_fin,
  f.aelf_book_code as livre,
  f.trad_id,
  f.aelf_chapter_base as ch_canon,
  f.ch_orig,
  f.v_orig,
  f.v_orig_suffixe,
  f.texte,
  f.notes
from public.v_fillion_aelf_polyglotte_cells f
where f.texte is not null and btrim(f.texte) <> ''
  and exists (select 1 from public.traductions t where t.trad_id = f.trad_id and not t.est_privee);

create unique index v_polyglotte_fillion_id_uidx on public.v_polyglotte_fillion (id);
create index v_polyglotte_fillion_chapitre_idx on public.v_polyglotte_fillion (trad_id, livre, ch_canon);
create index v_polyglotte_fillion_livre_idx on public.v_polyglotte_fillion (trad_id, livre);

comment on materialized view public.v_polyglotte_fillion is
  'Le texte de la Fillion posé sur l’axe canonique, au contrat de lecture de la Polyglotte. Une traduction privée n’y entre pas. Se rafraîchit par public.rafraichir_polyglotte_fillion().';

create view public.v_polyglotte_fillion_livres as
select trad_id, livre, count(*)::int as nb_versets
from public.v_polyglotte_fillion
group by trad_id, livre;

comment on view public.v_polyglotte_fillion_livres is
  'Les livres où la Fillion est lisible, traduction par traduction : ce qui borne son entrée dans le menu de la Polyglotte.';

revoke all on public.v_polyglotte_fillion from authenticated;
revoke all on public.v_polyglotte_fillion_livres from authenticated;
grant select on public.v_polyglotte_fillion to authenticated;
grant select on public.v_polyglotte_fillion_livres to authenticated;
