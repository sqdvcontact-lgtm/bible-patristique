-- CONTRÔLES DES RENVOIS DE NOTE À NOTE — les cinq œuvres A0044 (migration 20260916123226)
--
-- Le bloc LÈVE dès qu'une faute est comptée, et ne fait sinon qu'annoncer son relevé :
-- `exec_sql` ne rend pas les lignes d'un `select`, la garde doit donc répondre elle-même.
-- Il se rejoue à tout moment, après un import de notes ou une passe sur les blocs :
--   node scripts/fillion/dry-run-migration.mjs <n'importe quelle migration vide> <ce fichier>
-- ou tel quel dans l'éditeur SQL.
--
-- ⛔ Ce qu'il tient est le CONTRAT de la relation (charte § 13.20) : la cible par son
-- identité, la citation imprimée présente dans son bloc, et AUCUN numéro, titre de niveau 1
-- ni contenu recopié dans la relation.

do $controle$
declare
  mission constant text := 'A0044|renvois-notes-stables-20260916';
  n integer;
  fautes text := '';
  releve text := '';
begin
  select count(*) into n from public.texte_note_renvois where metadata->>'mission' = mission;
  releve := releve || format(E'\n  relations de la mission ............ %s', n);
  if n <> 60 then
    fautes := fautes || format(E'\n  - %s relations de la mission, 60 attendues', n);
  end if;

  -- La citation est la sous-chaîne EXACTE du bloc que le composant remplace au rendu.
  select count(*) into n
    from public.texte_note_renvois r
    left join public.texte_note_blocs b
      on b.id_texte = r.source_id_texte and b.note_key = r.source_note_key and b.block_id = r.source_block_id
   where b.block_id is null or strpos(b.text, r.source_citation) = 0;
  if n <> 0 then fautes := fautes || format(E'\n  - %s citation(s) absente(s) de leur bloc source', n); end if;

  -- Une cible sans bloc ne se déplie sur rien.
  select count(*) into n
    from public.texte_note_renvois r
   where not exists (select 1 from public.texte_note_blocs b
                      where b.id_texte = r.target_id_texte and b.note_key = r.target_note_key);
  if n <> 0 then fautes := fautes || format(E'\n  - %s cible(s) sans bloc', n); end if;

  select count(*) into n
    from public.texte_note_renvois
   where source_id_texte = target_id_texte and source_note_key = target_note_key;
  if n <> 0 then fautes := fautes || format(E'\n  - %s renvoi(s) d''une note vers elle-même', n); end if;

  -- ⛔ Ni numéro, ni titre, ni contenu dans les métadonnées, à quelque profondeur que ce soit.
  select count(*) into n
    from public.texte_note_renvois r
   where exists (
     select 1
       from jsonb_path_query(r.metadata, 'strict $.**') i,
            lateral jsonb_object_keys(case when jsonb_typeof(i) = 'object' then i else '{}'::jsonb end) k
      where k ~ '^(note_number|display_number|numero|numero_affiche|footnote_id|titre|title|ref_niv1|ref_niv1_texte|niv1|contenu|content|text|blocks)$');
  if n <> 0 then fautes := fautes || format(E'\n  - %s relation(s) dont les métadonnées recopient un affichage', n); end if;

  -- La corroboration nomme sa SOURCE, jamais le numéro qu'elle portait.
  select count(*) into n from public.texte_note_renvois where metadata::text ~ 'p3x:\d';
  if n <> 0 then fautes := fautes || format(E'\n  - %s corroboration(s) portant un numéro de note', n); end if;

  -- Une citation résolue ne garde ni page ni tome : ils restent en provenance.
  select count(*) into n
    from public.texte_note_renvois
   where source_citation ~* '(\mp\.\s*\d|\mtome\M)';
  if n <> 0 then fautes := fautes || format(E'\n  - %s citation(s) portant encore une page ou un tome', n); end if;

  select count(*) into n from public.texte_note_renvois where render_mode not in ('note_preview', 'inline_mention');
  if n <> 0 then fautes := fautes || format(E'\n  - %s mode(s) de rendu hors vocabulaire', n); end if;

  select count(*) into n from public.texte_note_renvois where render_mode = 'inline_mention';
  releve := releve || format(E'\n  dont mentions dans la phrase ...... %s', n);
  select count(distinct (source_id_texte, source_note_key, source_block_id)) into n from public.texte_note_renvois;
  releve := releve || format(E'\n  blocs sources ...................... %s', n);

  if fautes <> '' then
    raise exception 'Renvois de note à note hors contrat :%', fautes;
  end if;
  raise notice 'Renvois de note à note conformes :%', releve;
end
$controle$;
