-- ════════════════════════════════════════════════════════════════════════════
-- BROUILLON — OUVERTURE DE LA LECTURE AU RÔLE ANONYME (audit du 2026-09-25, E5, E6, E8)
-- Rédigé le 2026-09-26. ⛔ NON APPLIQUÉ, ET RIEN NE L'APPLIQUE.
-- ════════════════════════════════════════════════════════════════════════════
--
-- ⛔ Ce fichier vit dans `sql/brouillons/` : aucun outil du dépôt ne lit ce dossier
-- (`supabase db push` ne lit que `supabase/migrations/`, `apply-migration.mjs` ne joue
-- qu'un fichier qu'on lui nomme, et aucun workflow GitHub n'applique de migration).
-- ⛔ Et il se TERMINE PAR `rollback` : joué tel quel, il n'écrit rien. Il est son propre
-- banc d'essai (voir « COMMENT L'ÉPROUVER », plus bas).
--
-- Le jour de l'ouverture : relire les DÉCISIONS ci-dessous, trancher chacune, remplacer
-- le `rollback` final par `commit`, retirer le bloc d'épreuve, puis verser le fichier
-- dans `supabase/migrations/` et l'appliquer par `scripts/fillion/apply-migration.mjs`.
--
-- ── CATALOGUE LU LE 2026-09-26 (SELECT seuls, sur pg_policies, les privilèges et les colonnes)
--
--   • `anon` n'a de droit que sur : oeuvres (acces_public, date_mise_en_ligne, id_auteur,
--     id_oeuvre, titre), auteurs (id_auteur, nom, date_debut_annee), oeuvres_auteurs
--     (id_auteur, id_oeuvre) — la porte de l'accueil, migration 20260909081309 — et sur
--     les TROIS tables d'alignement, ENTIÈRES (défaut E6, ci-dessous).
--   • `anon` n'exécute pas `is_admin()` (fermé par 20260908095950) ; il exécute
--     `rls_private.public_alignment_set_ids()` (SECURITY DEFINER) et `auth.uid()`.
--   • Toutes les politiques de lecture des tables de texte sont `to authenticated` et
--     appellent `is_admin()` : ouvertes telles quelles à `anon`, elles rendraient 42501
--     à la moindre lecture. ⛔ On n'ouvre pas `is_admin()` : on AJOUTE des politiques
--     `to anon` qui n'appellent aucune fonction (modèle 20260909081309). Les politiques
--     s'additionnent (OU) : celles d'`authenticated` ne bougent pas.
--   • `commentaires_lecture` porte sur `{public}` et appelle `is_admin()` : elle
--     ferait échouer toute lecture anonyme le jour où `anon` recevrait la table.
--   • `editions_sources` et `versets_canon` portent une politique `to anon` SANS le
--     droit sous-jacent : elles ne servent à rien et trompent la lecture (E6).
--   • `texte_alignement_*` : le rôle anonyme a SELECT sur TOUTES les colonnes, `metadata`
--     et `justification` comprises — des notes d'atelier (E6).
--
-- ── CE QUE CE BROUILLON OUVRE (colonne par colonne, jamais `grant select on <table>`)
--
--   oeuvres (les colonnes de `COLONNES_OEUVRE_LECTURE`, app/lib/oeuvreSelects.ts),
--   auteurs (colonnes de lecteur), oeuvre_textes, segments, texte_notes,
--   texte_note_ancres, texte_note_blocs, texte_note_relations, texte_note_renvois,
--   texte_note_bloc_ouvrages, liens_bibliques, commentaires (validés seulement),
--   versets_lecture, versets_canon, livres, traductions (non privées),
--   editions_sources, et les trois tables d'alignement RÉDUITES à leurs colonnes lues.
--
-- ── CE QUI RESTE FERMÉ
--
--   • Toute colonne d'atelier : `oeuvres.motif_non_publication`, `acces_public_modifie_le` ;
--     `auteurs.note` ; `oeuvre_textes.metadata`, `motif_non_publication`, les empreintes
--     `*_sha256` ; `segments.segment_metadata`, `commentaire_ia`, `controle_*`,
--     `marquage_*`, `liens_revus_*`, `lien_1..4`, `verifies`, `texte_original`,
--     `texte_norm` ; `texte_note_blocs.metadata` (le site lit `metadata_lecture`, sa
--     projection engendrée) ; les `metadata` des notes, ancres, relations, renvois et
--     ouvrages de bloc ; `commentaires.auteur_mail`, `message_admin*` ; les `metadata`
--     et `justification` des alignements.
--   • Les tables et vues hors de cette tranche : versets_v2, les tables `bible_*` et leurs
--     vues, pericopes et pericope_*, profils, prelevements, favoris, messagerie,
--     `oeuvres_commentaires_prives`, `moderation_lexique`, `accentuation_mots`, et toutes
--     les RPC (`get_niv1_list`, `get_niv1_texte`, recherche…). Chacune se décide à part.
--   • `is_admin()` reste inexécutable par `anon`.
--
-- ── DÉCISIONS À PRENDRE AVANT D'APPLIQUER (bloquantes, marquées ⛔ DÉCISION)
--
--   1. `segments.segment_metadata` : la page d'œuvre en lit six chemins
--      (`COLONNES_SEGMENT` : indent_inches, stanza_before, biblical_verse_number, forme,
--      ouvrage_id, presentation.style). Un chemin `->>` exige le droit sur la COLONNE
--      entière : l'accorder publierait tout le carnet d'atelier des segments. Il faut une
--      projection — colonne engendrée `segment_metadata_lecture` sur le modèle de
--      `texte_note_blocs.metadata_lecture` (mais `segments` pèse 1,5 Go et porte cinq
--      index GIN : un ALTER réécrit la table), ou une VUE de lecture en security_invoker.
--      Sans elle, toute lecture anonyme de segments par `SELECT_SEGMENT` rend 42501.
--   2. `oeuvre_textes.metadata` : la page n'en lit que `indisponible`, et la politique de
--      `segments` lit `metadata #>> '{publication,apparat_critique}'`. ⚠️ Une sous-requête
--      de politique s'exécute avec les droits du LECTEUR : la politique anonyme de
--      `segments` ne peut donc pas lire ce jsonb. Proposé ci-dessous : deux colonnes
--      engendrées (`indisponible_lecture`, `apparat_critique_publie`), la table étant
--      petite. Le code de la page devra lire la première au lieu de `metadata->>…`.
--      Même raison pour `texte_note_blocs` : la garde `public_display` des Confessions
--      latines vit dans `metadata`, et `metadata_lecture` ne la porte pas. Proposé :
--      une colonne engendrée `affichage_public` (section 0 bis).
--   3. `commentaires.user_id` : le volet des commentaires le lit (marque de mécène, rang).
--      Un identifiant opaque, mais c'est le lien vers une personne : ouvert ici, à trancher.
--   4. `liens_bibliques.motif`, `provenance`, `fiabilite`, `arbitrage_requis` : lus par
--      `liensDeSegments` (app/lib/liens.ts, `COLS`). Ouverts ici faute de quoi la lecture
--      échoue ; les retirer demande d'abord de réduire `COLS` côté site.
--   5. `editions_sources` et `traductions` : une fiche les lit en `select('*')`
--      (ModaleTraduction). En anonyme, une étoile sur une table à droits par colonne
--      ÉCHOUE : il faut d'abord réduire ces lectures à leurs colonnes.
--
-- ── COMMENT L'ÉPROUVER (sans rien écrire)
--
--   Jouer le fichier ENTIER par le canal d'administration (MCP `execute_sql`, ou
--   `scripts/fillion/dry-run-migration.mjs sql/brouillons/<ce fichier>`). Il ouvre une
--   transaction, pose les droits et les politiques, prend le rôle `anon`, relit ce que
--   les pages lisent, vérifie que les colonnes d'atelier sont REFUSÉES (42501), puis lève
--   une exception qui porte le rapport : tout est annulé. Le `rollback` final ferme la
--   transaction avortée. ⚠️ `set local lock_timeout` borne l'attente : si une table est
--   tenue (sauvegarde quotidienne, `pg_dump`), l'essai échoue sans rien bloquer.
-- ════════════════════════════════════════════════════════════════════════════

begin;
set local lock_timeout = '5s';

-- ── 0. ⛔ DÉCISION 2 — les deux faits d'`oeuvre_textes.metadata` que le public doit lire
alter table public.oeuvre_textes
  add column if not exists indisponible_lecture text
    generated always as (metadata ->> 'indisponible') stored,
  add column if not exists apparat_critique_publie boolean
    generated always as ((metadata #>> '{publication,apparat_critique}') is distinct from 'false') stored;

-- ── 0 bis. La garde des Confessions latines, lisible sans le jsonb (voir section 6)
alter table public.texte_note_blocs
  add column if not exists affichage_public boolean
    generated always as (coalesce((metadata ->> 'public_display')::boolean, true)) stored;

-- ── 1. E6 — les tables d'alignement : plus de `metadata` ni de `justification` pour anon
revoke select on public.texte_alignement_ensembles from anon;
revoke select on public.texte_alignements          from anon;
revoke select on public.texte_alignement_membres   from anon;
grant select (alignment_set_id, id_oeuvre, reference_text_id, aligned_text_id, alignment_level, status)
  on public.texte_alignement_ensembles to anon;
grant select (alignment_id, alignment_set_id, book, canonical_division_order, group_order, cardinality, status)
  on public.texte_alignements to anon;
grant select (alignment_set_id, alignment_id, role, member_order, id_texte, segment_key)
  on public.texte_alignement_membres to anon;
-- Les politiques `*_select_anon` restent : elles n'appellent que
-- `rls_private.public_alignment_set_ids()`, que `anon` exécute.

-- ── 2. oeuvres — les colonnes de `COLONNES_OEUVRE_LECTURE` (la porte en a déjà cinq)
grant select (
  titre_affichage, sous_titre, sous_titre_affichage, titre_original, titre_original_affichage,
  auteur_affichage, trad_auteur, trad_auteur_affichage, provenance_affichage,
  commentaire_traduction, note_editoriale_complete, note_editoriale_complement,
  note_editoriale_titre, bibliographie_selective, editeur, collection, ville,
  date_publication, date_composition, langue_originale, genres, url_source, nb_signes,
  lecture_texte_entier, titres_composes, fleuron, profondeur_sommaire, niveaux_sommaire,
  niveaux_corps, texte_sommaire, texte_corps, afficher_numeros
) on public.oeuvres to anon;
-- La politique « Lecture anonyme des œuvres offertes » (acces_public) existe déjà.

-- ── 3. auteurs — la fiche d'un auteur, sans la note d'atelier
grant select (
  nom_original, dates, siecle, langue_principale, titre, date_naissance, date_mort,
  traditions, note_biographique, note_theologique, photo_position, photo_version,
  date_debut_precision, date_fin_annee, date_fin_precision, chronologie, anecdotes,
  influence, variantes
) on public.auteurs to anon;
-- « Lecture publique des auteurs » porte sur {public} avec `true` : rien à ajouter.

-- ── 4. oeuvre_textes
grant select (
  id_texte, id_oeuvre, id_traduction, catalogue_notice_id_ligne, titre_version, langue,
  traducteur, edition_label, annee_edition, source_url, statut, is_default, is_public,
  nb_signes, informations_complementaires, indisponible_lecture, apparat_critique_publie
) on public.oeuvre_textes to anon;
create policy oeuvre_textes_lecture_anon on public.oeuvre_textes
  for select to anon
  using (is_public and exists (
    select 1 from public.oeuvres o where o.id_oeuvre = oeuvre_textes.id_oeuvre and o.acces_public));

-- ── 5. segments — ⛔ DÉCISION 1 : `segment_metadata` N'EST PAS accordé ici
grant select (
  id, id_oeuvre, id_texte, segment_key, segment_numero, segment_texte,
  ref_niv1, ref_niv2, ref_niv3, ref_niv4, ref_niv5,
  ref_niv1_texte, ref_niv2_texte, ref_niv3_texte, ref_niv4_texte, ref_niv5_texte,
  nature, notes, paragraphe, rang, page, espace_textuel, join_before
) on public.segments to anon;
create policy segments_lecture_anon on public.segments
  for select to anon
  using (exists (
    select 1 from public.oeuvre_textes t join public.oeuvres o on o.id_oeuvre = t.id_oeuvre
    where t.id_texte = segments.id_texte and t.is_public and o.acces_public
      and (segments.espace_textuel is distinct from 'apparat_critique' or t.apparat_critique_publie)));

-- ── 6. Les notes structurées — mêmes conditions que pour `authenticated`, sans is_admin()
grant select (id_texte, note_key, book, note_number, footnote_id, source_target, printed_page)
  on public.texte_notes to anon;
grant select (id_texte, anchor_id, note_key, source_target, segment_key, segment_numero,
              segment_offset_unicode, marker, anchor_text_left, anchor_text_right)
  on public.texte_note_ancres to anon;
grant select (id_texte, note_key, block_id, rank, kind, form, language, text, rendering,
              needs_review, metadata_lecture, affichage_public)
  on public.texte_note_blocs to anon;
grant select (id_texte, note_key, relation_kind, source_block_id, target_block_id)
  on public.texte_note_relations to anon;
grant select (source_id_texte, source_note_key, source_block_id, relation_rank,
              target_id_texte, target_note_key, source_citation, render_mode)
  on public.texte_note_renvois to anon;
grant select (id_texte, note_key, block_id, citation_rank, ouvrage_id, locator, source_citation)
  on public.texte_note_bloc_ouvrages to anon;

create policy texte_notes_lecture_anon on public.texte_notes for select to anon
  using (exists (select 1 from public.oeuvre_textes t join public.oeuvres o on o.id_oeuvre = t.id_oeuvre
                 where t.id_texte = texte_notes.id_texte and t.is_public and o.acces_public));
create policy texte_note_ancres_lecture_anon on public.texte_note_ancres for select to anon
  using (exists (select 1 from public.oeuvre_textes t join public.oeuvres o on o.id_oeuvre = t.id_oeuvre
                 where t.id_texte = texte_note_ancres.id_texte and t.is_public and o.acces_public));
-- ⚠️ La politique d'`authenticated` lit `metadata ->> 'public_display'` pour les
-- Confessions latines. `anon` n'a pas `metadata`, et `metadata_lecture` NE PORTE PAS cette
-- clé (`metadata_lecture_de`, relue le 2026-09-26) : la colonne engendrée de la section
-- 0 bis la porte. ⛔ On ne l'ajoute pas à `metadata_lecture`, que le site sert tel quel.
create policy texte_note_blocs_lecture_anon on public.texte_note_blocs for select to anon
  using (exists (select 1 from public.oeuvre_textes t join public.oeuvres o on o.id_oeuvre = t.id_oeuvre
                 where t.id_texte = texte_note_blocs.id_texte and t.is_public and o.acces_public)
         and (id_texte <> 'A0010O0001T0001' or affichage_public));
create policy texte_note_relations_lecture_anon on public.texte_note_relations for select to anon
  using (exists (select 1 from public.oeuvre_textes t join public.oeuvres o on o.id_oeuvre = t.id_oeuvre
                 where t.id_texte = texte_note_relations.id_texte and t.is_public and o.acces_public));
create policy texte_note_renvois_lecture_anon on public.texte_note_renvois for select to anon
  using (exists (select 1 from public.oeuvre_textes st join public.oeuvres so on so.id_oeuvre = st.id_oeuvre
                 where st.id_texte = texte_note_renvois.source_id_texte and st.is_public and so.acces_public)
     and exists (select 1 from public.oeuvre_textes tt join public.oeuvres tor on tor.id_oeuvre = tt.id_oeuvre
                 where tt.id_texte = texte_note_renvois.target_id_texte and tt.is_public and tor.acces_public));
create policy texte_note_bloc_ouvrages_lecture_anon on public.texte_note_bloc_ouvrages for select to anon
  using (exists (select 1 from public.oeuvre_textes t join public.oeuvres o on o.id_oeuvre = t.id_oeuvre
                 where t.id_texte = texte_note_bloc_ouvrages.id_texte and t.is_public and o.acces_public));

-- ── 7. liens_bibliques — ⛔ DÉCISION 4 sur les quatre colonnes éditoriales
grant select (id, segment_id, canon_id, verset_v2_id, livre, chapitre, type,
              fiabilite, motif, provenance, arbitrage_requis, canon_livre, canon_chapitre)
  on public.liens_bibliques to anon;
create policy liens_bibliques_lecture_anon on public.liens_bibliques for select to anon
  using (exists (select 1 from public.segments s
                   join public.oeuvre_textes t on t.id_texte = s.id_texte
                   join public.oeuvres o on o.id_oeuvre = t.id_oeuvre
                 where s.id = liens_bibliques.segment_id and t.is_public and o.acces_public));

-- ── 8. commentaires — la politique {public} qui appelle is_admin() se scinde en deux
drop policy commentaires_lecture on public.commentaires;
create policy commentaires_lecture on public.commentaires for select to authenticated
  using ((valide = true) or ((select auth.uid()) = user_id) or (select public.is_admin()));
create policy commentaires_lecture_anon on public.commentaires for select to anon
  using (valide = true);
-- ⛔ DÉCISION 3 : `user_id`. Jamais `auteur_mail` ni `message_admin*`.
grant select (id, texte, auteur_nom, valide, created_at, id_segment, id_verset, user_id,
              reponse_a, certifie, supprime)
  on public.commentaires to anon;

-- ── 9. La lecture biblique et ses référentiels
grant select on public.versets_lecture to anon;   -- vue matérialisée, TR0001–TR0005 seulement
grant select (id, livre, ch_canon, v_canon, ordre, est_suscription) on public.versets_canon to anon;
grant select (code, nom_fr, categorie, ordre) on public.livres to anon;
-- ⛔ DÉCISION 5 : les lectures `select('*')` de ces deux tables se réduisent d'abord.
grant select (trad_id, nom, auteur, dates, bio_courte, date_publication, confession, langue,
              commentaire_editorial, ordre, photo, photo_position, photo_encart, import_maj_le,
              schema_numerotation, source_edition, source_url, licence, mention_obligatoire,
              type_objet, responsable_edition, est_privee, est_biblique, visible_public)
  on public.traductions to anon;
grant select (trad_id, titre_edition, sous_titre_edition, mention_edition, lieu_edition,
              editeur, annee_edition, nombre_tomes, numero_edition, depot_manuscrit,
              cote_manuscrit, traducteur, langue, confession, source_type, source_nom,
              source_url, licence, graphie, particularites)
  on public.editions_sources to anon;

notify pgrst, 'reload schema';

-- ════════════════════════════════════════════════════════════════════════════
-- ÉPREUVE — depuis la place d'un visiteur sans session. Retirer avant d'appliquer.
-- ════════════════════════════════════════════════════════════════════════════
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

do $epreuve$
declare
  rapport text := '';
  n bigint;
  procedure_nom text;
begin
  -- Ce que les pages lisent doit PASSER.
  begin select count(*) into n from public.oeuvres where acces_public;
        rapport := rapport || format('oeuvres %s ; ', n);
  exception when others then rapport := rapport || 'oeuvres ÉCHEC ' || sqlerrm || ' ; '; end;
  begin select count(*) into n from (select id, id_texte, segment_key, segment_texte, ref_niv1, nature, notes
                                     from public.segments limit 50) s;
        rapport := rapport || format('segments %s ; ', n);
  exception when others then rapport := rapport || 'segments ÉCHEC ' || sqlerrm || ' ; '; end;
  begin select count(*) into n from (select note_key, block_id, text, metadata_lecture
                                     from public.texte_note_blocs limit 50) b;
        rapport := rapport || format('texte_note_blocs %s ; ', n);
  exception when others then rapport := rapport || 'texte_note_blocs ÉCHEC ' || sqlerrm || ' ; '; end;
  begin select count(*) into n from (select id, canon_id, segment_id from public.liens_bibliques limit 50) l;
        rapport := rapport || format('liens_bibliques %s ; ', n);
  exception when others then rapport := rapport || 'liens_bibliques ÉCHEC ' || sqlerrm || ' ; '; end;
  begin select count(*) into n from (select id, texte from public.commentaires) c;
        rapport := rapport || format('commentaires validés %s ; ', n);
  exception when others then rapport := rapport || 'commentaires ÉCHEC ' || sqlerrm || ' ; '; end;
  begin select count(*) into n from (select id_verset from public.versets_lecture limit 50) v;
        rapport := rapport || format('versets_lecture %s ; ', n);
  exception when others then rapport := rapport || 'versets_lecture ÉCHEC ' || sqlerrm || ' ; '; end;

  -- Ce qui reste d'atelier doit être REFUSÉ (42501). Un « passe » ici est une FAUTE.
  foreach procedure_nom in array array[
    'select segment_metadata from public.segments limit 1',
    'select metadata from public.oeuvre_textes limit 1',
    'select metadata from public.texte_note_blocs limit 1',
    'select auteur_mail from public.commentaires limit 1',
    'select note from public.auteurs limit 1',
    'select motif_non_publication from public.oeuvres limit 1',
    'select metadata from public.texte_alignements limit 1',
    'select justification from public.texte_alignements limit 1',
    'select * from public.oeuvres limit 1'
  ] loop
    begin
      execute procedure_nom;
      rapport := rapport || 'FAUTE, passe : ' || procedure_nom || ' ; ';
    exception when insufficient_privilege then
      rapport := rapport || 'refusé : ' || procedure_nom || ' ; ';
    end;
  end loop;

  raise exception 'ÉPREUVE (tout est annulé) — %', rapport;
end
$epreuve$;

rollback;
