-- ── La Fillion dans la Polyglotte : une table de lecture, non une pile de vues ──
-- Le texte de la Fillion ne vit pas dans `versets_v2` : il est recomposé, unité par
-- unité, depuis les tables éditoriales, puis posé sur l'axe AELF par les alignements
-- vérifiés. La chaîne de vues qui fait ce travail (`v_fillion_aelf_polyglotte_cells`)
-- est juste, mais elle ne se laisse pas interroger : sa CTE `rows_fillion` est lue
-- deux fois, donc matérialisée, donc recalculée EN ENTIER (18 702 lignes) à chaque
-- requête — un chapitre de la Genèse coûtait 4,9 s, et le recensement des livres
-- publiés 22,8 s, quand le rôle `authenticated` coupe à 8 s. La Polyglotte ne voyait
-- donc jamais la Fillion : sa couverture arrivait en erreur, et le menu se refermait.
--
-- On fige donc le résultat dans une vue MATÉRIALISÉE, au contrat exact de la
-- Polyglotte : les mêmes colonnes que `versets_v2`, pour que la page lise la Fillion
-- comme elle lit les autres bibles. L'axe AELF devient le `canon_id` interne ; la
-- référence de l'édition reste dans `ch_orig`/`v_orig`.
-- ⚠️ Un texte qui avance ne se voit qu'APRÈS rafraîchissement : voir
-- `public.rafraichir_polyglotte_fillion()`.
create materialized view public.v_polyglotte_fillion as
select
  -- Le préfixe interdit de confondre cet identifiant avec celui d'une ligne de
  -- `versets_v2` : rien ici ne s'édite au crayon de l'administrateur.
  'fillion:' || f.id::text as id,
  f.aelf_book_code || '.' || f.aelf_chapter_base || '.' || f.aelf_verse_base as canon_id,
  null::text as canon_id_fin,
  f.aelf_book_code as livre,
  f.trad_id,
  -- Le chapitre canonique en clair : la Polyglotte filtre par chapitre, et un entier
  -- indexé vaut mieux qu'un `like` sur un préfixe.
  f.aelf_chapter_base as ch_canon,
  f.ch_orig,
  f.v_orig,
  f.v_orig_suffixe,
  f.texte,
  f.notes
from public.v_fillion_aelf_polyglotte_cells f
-- ⛔ Une ligne sans texte n'est pas un verset à montrer : les positions de l'axe AELF
-- sans équivalent dans la Fillion (`verified_structural_gap`) restent hors de la table.
where f.texte is not null and btrim(f.texte) <> '';

create unique index v_polyglotte_fillion_id_uidx on public.v_polyglotte_fillion (id);
create index v_polyglotte_fillion_chapitre_idx on public.v_polyglotte_fillion (trad_id, livre, ch_canon);
create index v_polyglotte_fillion_livre_idx on public.v_polyglotte_fillion (trad_id, livre);

comment on materialized view public.v_polyglotte_fillion is
  'Le texte de la Fillion posé sur l’axe canonique, au contrat de lecture de la Polyglotte. Se rafraîchit par public.rafraichir_polyglotte_fillion() dès qu’un livre passe en alignement vérifié.';

-- Ce que le MENU doit savoir : dans quels livres la Fillion est réellement lisible.
-- Douze aujourd'hui, davantage demain — aucune liste d'identifiants codée en dur.
create view public.v_polyglotte_fillion_livres as
select trad_id, livre, count(*)::int as nb_versets
from public.v_polyglotte_fillion
group by trad_id, livre;

comment on view public.v_polyglotte_fillion_livres is
  'Les livres où la Fillion est lisible, traduction par traduction : ce qui borne son entrée dans le menu de la Polyglotte.';

-- Le rafraîchissement, réservé au service : la lecture est publique, la mise à jour ne
-- l'est pas. `concurrently` s'appuie sur l'index unique et ne bloque pas les lecteurs.
create or replace function public.rafraichir_polyglotte_fillion()
returns void
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
begin
  refresh materialized view concurrently public.v_polyglotte_fillion;
end
$$;

revoke all on function public.rafraichir_polyglotte_fillion() from public;
grant execute on function public.rafraichir_polyglotte_fillion() to service_role;

-- ⚠️ La LECTURE seulement : une vue matérialisée n'est pas une table éditoriale.
revoke all on public.v_polyglotte_fillion from authenticated;
revoke all on public.v_polyglotte_fillion_livres from authenticated;
grant select on public.v_polyglotte_fillion to authenticated;
grant select on public.v_polyglotte_fillion_livres to authenticated;
