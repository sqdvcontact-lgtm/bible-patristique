-- Contrôles de la migration « manchette : trois états ». Charte § 35.29.
-- ⛔ Ils s'éprouvent dans une transaction ANNULÉE : rien n'est écrit.
do $$
declare
  v_id uuid;
  v_ok boolean;
  v_fautes int := 0;
  v_rapport text := '';
  procedure_note text;
begin
  -- 1. Les deux colonnes existent, nullables, et ne décident de rien au rendu.
  select count(*) = 2 into v_ok
    from information_schema.columns
   where table_schema = 'public' and table_name = 'bible_editorial_body_blocks'
     and column_name in ('manchette_etat', 'manchette_motif')
     and is_nullable = 'YES';
  if not v_ok then v_fautes := v_fautes + 1; v_rapport := v_rapport || E'\n  ⛔ 1. colonnes absentes ou non nullables';
  else v_rapport := v_rapport || E'\n  ✓ 1. les deux colonnes sont là, nullables'; end if;

  -- 2. Aucune ligne n'a été renseignée : la migration ne décide d'aucun livre.
  select count(*) = 0 into v_ok
    from public.bible_editorial_body_blocks
   where manchette_etat is not null or manchette_motif is not null;
  if not v_ok then v_fautes := v_fautes + 1; v_rapport := v_rapport || E'\n  ⛔ 2. des lignes sont déjà renseignées';
  else v_rapport := v_rapport || E'\n  ✓ 2. aucune ligne renseignée'; end if;

  select id into v_id from public.bible_editorial_body_blocks limit 1;

  -- 3. Un état hors vocabulaire est refusé.
  begin
    update public.bible_editorial_body_blocks set manchette_etat = 'peut-etre' where id = v_id;
    v_fautes := v_fautes + 1; v_rapport := v_rapport || E'\n  ⛔ 3. un état hors vocabulaire a été accepté';
  exception when check_violation then
    v_rapport := v_rapport || E'\n  ✓ 3. un état hors vocabulaire est refusé';
  end;

  -- 4. « editoriale » sans motif est refusé ; avec motif, accepté.
  begin
    update public.bible_editorial_body_blocks set manchette_etat = 'editoriale', manchette_motif = null where id = v_id;
    v_fautes := v_fautes + 1; v_rapport := v_rapport || E'\n  ⛔ 4a. « editoriale » sans motif a été accepté';
  exception when check_violation then
    v_rapport := v_rapport || E'\n  ✓ 4a. « editoriale » sans motif est refusé';
  end;
  begin
    update public.bible_editorial_body_blocks
       set manchette_etat = 'editoriale', manchette_motif = 'commentaire autonome, portée certaine'
     where id = v_id;
    v_rapport := v_rapport || E'\n  ✓ 4b. « editoriale » avec motif est accepté';
  exception when check_violation then
    v_fautes := v_fautes + 1; v_rapport := v_rapport || E'\n  ⛔ 4b. « editoriale » avec motif a été refusé';
  end;

  -- 5. « absente » exige aussi sa raison : c'est un ÉTAT DE CLÔTURE, non un vide.
  begin
    update public.bible_editorial_body_blocks set manchette_etat = 'absente', manchette_motif = '  ' where id = v_id;
    v_fautes := v_fautes + 1; v_rapport := v_rapport || E'\n  ⛔ 5. « absente » avec un motif blanc a été accepté';
  exception when check_violation then
    v_rapport := v_rapport || E'\n  ✓ 5. « absente » exige une raison écrite';
  end;

  -- 6. « source » ne porte pas de motif : le témoin EST la justification.
  begin
    update public.bible_editorial_body_blocks set manchette_etat = 'source', manchette_motif = 'parce que' where id = v_id;
    v_fautes := v_fautes + 1; v_rapport := v_rapport || E'\n  ⛔ 6. « source » avec motif a été accepté';
  exception when check_violation then
    v_rapport := v_rapport || E'\n  ✓ 6. « source » ne porte pas de motif';
  end;

  -- 7. Un motif sans état est refusé : il ne veut rien dire.
  begin
    update public.bible_editorial_body_blocks set manchette_etat = null, manchette_motif = 'une note perdue' where id = v_id;
    v_fautes := v_fautes + 1; v_rapport := v_rapport || E'\n  ⛔ 7. un motif sans état a été accepté';
  exception when check_violation then
    v_rapport := v_rapport || E'\n  ✓ 7. un motif sans état est refusé';
  end;

  -- 8. `facsimile_heading` n'est pas touché par la migration.
  select count(*) = 2377 into v_ok
    from public.bible_editorial_body_blocks where metadata ? 'facsimile_heading';
  if not v_ok then v_rapport := v_rapport || E'\n  ⚠️ 8. le compte de facsimile_heading a changé depuis le relevé du 20 septembre 2026 (2 377)';
  else v_rapport := v_rapport || E'\n  ✓ 8. facsimile_heading intact (2 377 blocs)'; end if;

  raise exception E'CONTRÔLES § 35.29 — % faute(s)%', v_fautes, v_rapport;
end $$;
