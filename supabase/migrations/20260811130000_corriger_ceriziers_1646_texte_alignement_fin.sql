begin;

create or replace function public.corriger_ceriziers_1646_texte_alignement_fin(
  p_payload jsonb,
  p_payload_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
set statement_timeout = '120s'
as $$
declare
  v_work_id constant text := 'A0064O0001';
  v_ceriziers_text_id constant text := 'TXT_A0064O0001_FR_1646_CERIZIERS';
  v_mirandol_text_id constant text := 'TXT_A0064O0001_FR_1861_MIRANDOL';
  v_alignment_set_id constant text := 'ALNSET-A0064O0001-MIR1861-CER1646';
  v_group_count integer := jsonb_array_length(p_payload->'alignments');
  v_member_count integer := jsonb_array_length(p_payload->'alignment_members');
  v_existing_hash text;
  v_affected integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('ceriziers-1646-fine-alignment-correction-v1', 0));

  if p_payload_sha256 is null or p_payload_sha256 !~ '^[0-9A-Fa-f]{64}$' then
    raise exception 'Empreinte payload invalide';
  end if;
  if p_payload->>'id_oeuvre' <> v_work_id
     or p_payload->>'id_texte' <> v_ceriziers_text_id
     or p_payload#>>'{alignment_set,alignment_set_id}' <> v_alignment_set_id
     or p_payload#>>'{alignment_set,reference_text_id}' <> v_mirandol_text_id
     or p_payload#>>'{alignment_set,aligned_text_id}' <> v_ceriziers_text_id then
    raise exception 'Payload hors perimetre Ceriziers 1646';
  end if;

  if jsonb_array_length(p_payload->'units') <> 209
     or jsonb_array_length(p_payload->'segments') <> 1880
     or jsonb_array_length(p_payload->'notes') <> 4
     or jsonb_array_length(p_payload->'note_blocks') <> 4
     or jsonb_array_length(p_payload->'note_anchors') <> 4
     or v_group_count <= 268
     or v_group_count > 2000
     or v_member_count <> 3716 then
    raise exception 'Comptages du payload corrigé invalides';
  end if;
  if (select count(*) from jsonb_to_recordset(p_payload->'segments') as x(nature text) where x.nature = 'vers') <> 1213
     or (select count(*) from jsonb_to_recordset(p_payload->'segments') as x(espace_textuel text) where x.espace_textuel = 'corps') <> 1823
     or exists (select 1 from jsonb_to_recordset(p_payload->'segments') as x(segment_texte text) where x.segment_texte = 'PRO' or position('¬' in x.segment_texte) > 0)
     or exists (select 1 from jsonb_to_recordset(p_payload->'segments') as x(texte_original text) where x.texte_original is not null) then
    raise exception 'Corpus corrigé non conforme';
  end if;
  if (select count(*) from jsonb_to_recordset(p_payload->'alignment_members') as x(role text, segment_key text) where x.role = 'aligned') <> 1821
     or (select count(distinct x.segment_key) from jsonb_to_recordset(p_payload->'alignment_members') as x(role text, segment_key text) where x.role = 'aligned') <> 1821
     or (select count(*) from jsonb_to_recordset(p_payload->'alignment_members') as x(role text, segment_key text) where x.role = 'reference') <> 1895
     or (select count(distinct x.segment_key) from jsonb_to_recordset(p_payload->'alignment_members') as x(role text, segment_key text) where x.role = 'reference') <> 1895
     or exists (select 1 from jsonb_to_recordset(p_payload->'alignments') as x(status text) where x.status = 'validated_human')
     or (select count(distinct (x.book, x.canonical_division_order)) from jsonb_to_recordset(p_payload->'alignments') as x(book integer, canonical_division_order integer)) <> 78 then
    raise exception 'Couverture ou statut de l alignement corrigé invalide';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_payload->'alignments') as x(metadata jsonb)
    where (
      (x.metadata->>'left_count')::integer > case when x.metadata->>'division_kind' = 'poesie' then 4 else 5 end
      or (x.metadata->>'right_count')::integer > case when x.metadata->>'division_kind' = 'poesie' then 4 else 5 end
    ) and coalesce((x.metadata->>'exception_to_size_rule')::boolean, false) is false
  ) then
    raise exception 'Dépassement de taille sans exception documentée';
  end if;
  if (select count(*) from jsonb_to_recordset(p_payload->'alignments') as x(metadata jsonb)
      where coalesce((x.metadata->>'exception_to_size_rule')::boolean, false)) <> 1
     or not exists (
       select 1
       from jsonb_to_recordset(p_payload->'alignments') as x(book integer, canonical_division_order integer, metadata jsonb)
       where x.book = 4 and x.canonical_division_order = 13
         and coalesce((x.metadata->>'exception_to_size_rule')::boolean, false)
         and (x.metadata->>'left_count')::integer = 1
         and (x.metadata->>'right_count')::integer = 6
     )
     or exists (
       select 1
       from jsonb_to_recordset(p_payload->'alignments') as x(book integer, canonical_division_order integer, metadata jsonb)
       where coalesce((x.metadata->>'exception_to_size_rule')::boolean, false)
         and not (x.book = 4 and x.canonical_division_order = 13
                  and (x.metadata->>'left_count')::integer = 1
                  and (x.metadata->>'right_count')::integer = 6)
     ) then
    raise exception 'Exception de taille autre que IV XIII 1:6';
  end if;

  select metadata->>'ceriziers_correction_payload_sha256'
    into v_existing_hash
  from public.oeuvre_textes
  where id_texte = v_ceriziers_text_id;
  if upper(coalesce(v_existing_hash, '')) = upper(p_payload_sha256)
     and (select count(*) from public.segments where id_texte = v_ceriziers_text_id) = 1880
     and (select count(*) from public.texte_alignements where alignment_set_id = v_alignment_set_id) = v_group_count
     and (select count(*) from public.texte_alignement_membres where alignment_set_id = v_alignment_set_id) = 3716 then
    return jsonb_build_object('status', 'ALREADY_CORRECTED', 'payload_sha256', upper(p_payload_sha256), 'groups', v_group_count);
  end if;

  if (select count(*) from public.oeuvre_texte_unites where id_texte = v_ceriziers_text_id) <> 209
     or (select count(*) from public.segments where id_texte = v_ceriziers_text_id) <> 1881
     or (select count(*) from public.segments where id_texte = v_ceriziers_text_id and nature = 'vers') <> 1214
     or (select count(*) from public.texte_notes where id_texte = v_ceriziers_text_id) <> 4
     or (select count(*) from public.texte_note_blocs where id_texte = v_ceriziers_text_id) <> 4
     or (select count(*) from public.texte_note_ancres where id_texte = v_ceriziers_text_id) <> 4
     or (select count(*) from public.texte_alignements where alignment_set_id = v_alignment_set_id) <> 268
     or (select count(*) from public.texte_alignement_membres where alignment_set_id = v_alignment_set_id) <> 3717
     or not exists (select 1 from public.segments where id_texte = v_ceriziers_text_id and segment_key = v_ceriziers_text_id || ':CER-B05-D08-U001-POEM:s037' and segment_texte = 'PRO')
     or not exists (select 1 from public.segments where id_texte = v_ceriziers_text_id and segment_key = v_ceriziers_text_id || ':CER-B01-D06-B001-U001:s009' and position('inso¬' in segment_texte) > 0) then
    raise exception 'Garde de l etat vivant Ceriziers refusée';
  end if;
  if not exists (select 1 from public.oeuvre_textes where id_texte = v_ceriziers_text_id and statut = 'review' and is_public is false and is_default is false)
     or not exists (select 1 from public.oeuvre_textes where id_texte = v_mirandol_text_id and statut = 'published' and is_public is true)
     or (select count(*) from public.segments where id_texte = v_mirandol_text_id) <> 1896
     or (select count(*) from public.oeuvre_texte_unites where id_texte = v_mirandol_text_id) <> 475
     or (select count(*) from public.texte_notes where id_texte = v_mirandol_text_id) <> 138
     or (select count(*) from public.texte_note_blocs where id_texte = v_mirandol_text_id) <> 554
     or (select count(*) from public.texte_note_relations where id_texte = v_mirandol_text_id) <> 161
     or (select count(*) from public.texte_note_ancres where id_texte = v_mirandol_text_id) <> 138
     or (select count(*) from public.segments where id_texte = v_mirandol_text_id and rang = 1 and texte_original is not null) <> 474
     or (select count(*) from public.segments where id_texte = v_mirandol_text_id and rang > 1 and texte_original is not null) <> 0
     or (select count(*) from public.liens_bibliques l join public.segments s on s.id = l.segment_id where s.id_texte = v_mirandol_text_id) <> 20 then
    raise exception 'Garde Mirandol refusée';
  end if;

  delete from public.texte_alignements where alignment_set_id = v_alignment_set_id;

  update public.oeuvre_texte_unites as unit
  set source_parent_id = x.source_parent_id,
      espace_textuel = x.espace_textuel,
      global_order = x.global_order,
      ordre_documentaire = x.ordre_documentaire,
      ref_niv1 = x.ref_niv1, ref_niv2 = x.ref_niv2, ref_niv3 = x.ref_niv3, ref_niv4 = x.ref_niv4, ref_niv5 = x.ref_niv5,
      book = x.book, book_heading = x.book_heading, section = x.section, paragraphe = x.paragraphe,
      source_parent_paragraph = x.source_parent_paragraph, turn_order = x.turn_order,
      type_unite = x.type_unite, source_kind = x.source_kind,
      clean_text = x.clean_text, clean_text_sha256 = x.clean_text_sha256,
      page_debut = x.page_debut, page_status = x.page_status,
      source_locator = x.source_locator, metadata = x.metadata
  from jsonb_to_recordset(p_payload->'units') as x(
    id_texte text, source_unit_id text, source_parent_id text, espace_textuel text,
    global_order integer, ordre_documentaire integer, ref_niv1 text, ref_niv2 text, ref_niv3 text, ref_niv4 text, ref_niv5 text,
    book text, book_heading text, section text, paragraphe integer, source_parent_paragraph integer, turn_order integer,
    type_unite text, source_kind text, clean_text text, clean_text_sha256 text, page_debut integer, page_status text,
    source_locator jsonb, metadata jsonb
  )
  where unit.id_texte = v_ceriziers_text_id and unit.id_texte = x.id_texte and unit.source_unit_id = x.source_unit_id;
  get diagnostics v_affected = row_count;
  if v_affected <> 209 then raise exception 'Mise à jour des unités incomplète: %', v_affected; end if;

  delete from public.segments
  where id_texte = v_ceriziers_text_id
    and segment_key = v_ceriziers_text_id || ':CER-B05-D08-U001-POEM:s037'
    and segment_texte = 'PRO';
  get diagnostics v_affected = row_count;
  if v_affected <> 1 then raise exception 'Suppression du faux vers refusée'; end if;

  update public.segments set segment_numero = segment_numero + 100000 where id_texte = v_ceriziers_text_id;
  update public.segments as segment
  set segment_numero = x.segment_numero, segment_texte = x.segment_texte,
      ref_niv1 = x.ref_niv1, ref_niv2 = x.ref_niv2, ref_niv3 = x.ref_niv3, ref_niv4 = x.ref_niv4, ref_niv5 = x.ref_niv5,
      ref_niv1_texte = x.ref_niv1_texte, ref_niv2_texte = x.ref_niv2_texte, ref_niv3_texte = x.ref_niv3_texte,
      ref_niv4_texte = x.ref_niv4_texte, ref_niv5_texte = x.ref_niv5_texte,
      fiabilite = x.fiabilite, nature = x.nature, verifies = x.verifies, notes = x.notes,
      marquage_source = x.marquage_source, commentaire_ia = x.commentaire_ia,
      paragraphe = x.paragraphe, rang = x.rang, controle_rang_manuel = x.controle_rang_manuel,
      controle_verifie = x.controle_verifie, page = x.page, source_unit_id = x.source_unit_id,
      espace_textuel = x.espace_textuel, source_start_offset_unicode = x.source_start_offset_unicode,
      source_end_offset_unicode = x.source_end_offset_unicode, join_before = x.join_before,
      segment_metadata = x.segment_metadata
  from jsonb_to_recordset(p_payload->'segments') as x(
    id_texte text, segment_key text, segment_numero integer, segment_texte text,
    ref_niv1 text, ref_niv2 text, ref_niv3 text, ref_niv4 text, ref_niv5 text,
    ref_niv1_texte text, ref_niv2_texte text, ref_niv3_texte text, ref_niv4_texte text, ref_niv5_texte text,
    fiabilite text, nature text, verifies jsonb, notes text, marquage_source text, commentaire_ia text,
    paragraphe integer, rang integer, controle_rang_manuel text, controle_verifie boolean, page integer,
    source_unit_id text, espace_textuel text, source_start_offset_unicode integer, source_end_offset_unicode integer,
    join_before text, segment_metadata jsonb
  )
  where segment.id_texte = v_ceriziers_text_id and segment.id_texte = x.id_texte and segment.segment_key = x.segment_key;
  get diagnostics v_affected = row_count;
  if v_affected <> 1880 then raise exception 'Mise à jour des segments incomplète: %', v_affected; end if;

  update public.texte_notes as note
  set book = x.book, note_number = x.note_number, footnote_id = x.footnote_id,
      source_target = x.source_target, printed_page = x.printed_page, metadata = x.metadata
  from jsonb_to_recordset(p_payload->'notes') as x(
    id_texte text, note_key text, book text, note_number integer, footnote_id integer,
    source_target text, printed_page integer, metadata jsonb
  )
  where note.id_texte = v_ceriziers_text_id and note.id_texte = x.id_texte and note.note_key = x.note_key;
  get diagnostics v_affected = row_count;
  if v_affected <> 4 then raise exception 'Mise à jour des notes incomplète: %', v_affected; end if;

  update public.texte_note_blocs as block
  set rank = x.rank, kind = x.kind, form = x.form, language = x.language,
      text = x.text, rendering = x.rendering, needs_review = x.needs_review, metadata = x.metadata
  from jsonb_to_recordset(p_payload->'note_blocks') as x(
    id_texte text, note_key text, block_id text, rank integer, kind text, form text,
    language text, text text, rendering text, needs_review boolean, metadata jsonb
  )
  where block.id_texte = v_ceriziers_text_id and block.id_texte = x.id_texte and block.note_key = x.note_key and block.block_id = x.block_id;
  get diagnostics v_affected = row_count;
  if v_affected <> 4 then raise exception 'Mise à jour des blocs de notes incomplète: %', v_affected; end if;

  update public.texte_note_ancres as anchor
  set note_key = x.note_key, source_target = x.source_target, source_parent_id = x.source_parent_id,
      source_unit_id = x.source_unit_id, source_offset_unicode = x.source_offset_unicode,
      source_unit_offset_unicode = x.source_unit_offset_unicode, segment_key = x.segment_key,
      segment_numero = x.segment_numero, segment_offset_unicode = x.segment_offset_unicode,
      marker = x.marker, anchor_text_left = x.anchor_text_left, anchor_text_right = x.anchor_text_right,
      structured_block_count = x.structured_block_count, metadata = x.metadata
  from jsonb_to_recordset(p_payload->'note_anchors') as x(
    id_texte text, anchor_id text, note_key text, source_target text, source_parent_id text,
    source_unit_id text, source_offset_unicode integer, source_unit_offset_unicode integer,
    segment_key text, segment_numero integer, segment_offset_unicode integer, marker text,
    anchor_text_left text, anchor_text_right text, structured_block_count integer, metadata jsonb
  )
  where anchor.id_texte = v_ceriziers_text_id and anchor.id_texte = x.id_texte and anchor.anchor_id = x.anchor_id;
  get diagnostics v_affected = row_count;
  if v_affected <> 4 then raise exception 'Mise à jour des ancres incomplète: %', v_affected; end if;

  update public.texte_alignement_ensembles
  set status = 'reviewed_ai', method = p_payload#>>'{alignment_set,method}',
      metadata = coalesce(p_payload#>'{alignment_set,metadata}', '{}'::jsonb)
        || jsonb_build_object('payload_sha256', upper(p_payload_sha256), 'validated_human', false),
      updated_at = now()
  where alignment_set_id = v_alignment_set_id;

  insert into public.texte_alignements(
    alignment_id, alignment_set_id, book, canonical_division_order, group_order,
    cardinality, status, confidence, method, justification, metadata
  )
  select x.alignment_id, x.alignment_set_id, x.book, x.canonical_division_order, x.group_order,
    x.cardinality, x.status, x.confidence, x.method, x.justification, x.metadata
  from jsonb_to_recordset(p_payload->'alignments') as x(
    alignment_id text, alignment_set_id text, book integer, canonical_division_order integer,
    group_order integer, cardinality text, status text, confidence numeric, method text,
    justification text, metadata jsonb
  );

  insert into public.texte_alignement_membres(
    alignment_set_id, alignment_id, role, member_order, id_texte, segment_key, metadata
  )
  select x.alignment_set_id, x.alignment_id, x.role, x.member_order, x.id_texte, x.segment_key, x.metadata
  from jsonb_to_recordset(p_payload->'alignment_members') as x(
    alignment_set_id text, alignment_id text, role text, member_order integer,
    id_texte text, segment_key text, metadata jsonb
  );

  update public.oeuvre_textes
  set nb_signes = (select coalesce(sum(char_length(segment_texte)), 0)::integer from public.segments where id_texte = v_ceriziers_text_id),
      source_docx_sha256 = upper(p_payload#>>'{source_hashes,corrected_docx_sha256}'),
      control_pdf_sha256 = upper(p_payload#>>'{source_hashes,control_pdf_sha256}'),
      notes_json_sha256 = upper(p_payload#>>'{source_hashes,notes_json_sha256}'),
      segmentation_archive_sha256 = upper(p_payload#>>'{source_hashes,segmentation_manifest_sha256}'),
      metadata = metadata || jsonb_build_object(
        'ceriziers_correction_payload_sha256', upper(p_payload_sha256),
        'corrected_source_reading_sha256', upper(p_payload#>>'{source_hashes,corrected_source_reading_sha256}'),
        'fine_alignment_groups', v_group_count,
        'fine_alignment_uncertain_groups', (p_payload#>>'{alignment_statistics,uncertain_groups}')::integer,
        'fine_alignment_exceptions', (p_payload#>>'{alignment_statistics,exceptions_to_size_rule}')::integer,
        'false_PRO_removed', true, 'insolence_corrected', true,
        'private_import', true, 'validated_human', false, 'mirandol_immutable', true, 'biblical_links_copied', false
      ),
      updated_at = now()
  where id_texte = v_ceriziers_text_id and statut = 'review' and is_public is false and is_default is false;
  get diagnostics v_affected = row_count;
  if v_affected <> 1 then raise exception 'Mise à jour de l identité du texte refusée'; end if;

  if (select count(*) from public.segments where id_texte = v_ceriziers_text_id) <> 1880
     or (select count(*) from public.segments where id_texte = v_ceriziers_text_id and espace_textuel = 'corps') <> 1823
     or (select count(*) from public.segments where id_texte = v_ceriziers_text_id and nature = 'vers') <> 1213
     or exists (select 1 from public.segments where id_texte = v_ceriziers_text_id and (segment_texte = 'PRO' or position('¬' in segment_texte) > 0))
     or not exists (select 1 from public.segments where id_texte = v_ceriziers_text_id and segment_key = v_ceriziers_text_id || ':CER-B01-D06-B001-U001:s009' and segment_texte like '%brauons son insolence.')
     or (select count(*) from public.texte_alignements where alignment_set_id = v_alignment_set_id) <> v_group_count
     or (select count(*) from public.texte_alignement_membres where alignment_set_id = v_alignment_set_id) <> 3716
     or (select count(*) from public.texte_alignement_membres where alignment_set_id = v_alignment_set_id and role = 'aligned') <> 1821
     or (select count(*) from public.texte_alignement_membres where alignment_set_id = v_alignment_set_id and role = 'reference') <> 1895
     or not exists (
       select 1 from public.texte_notes
       where id_texte = v_ceriziers_text_id and note_key = 'CER-NOTE-003'
         and metadata->>'printed_reading' = 'II. PROSE.'
         and metadata->>'semantic_reading' = 'III. PROSE.'
         and metadata->>'canonical_division_ref' = 'V'
         and coalesce((metadata->>'validated_human')::boolean, false) is false
     )
     or not exists (
       select 1 from public.texte_notes
       where id_texte = v_ceriziers_text_id and note_key = 'CER-NOTE-004'
         and metadata->>'printed_reading' = 'V. PROSE.'
         and metadata->>'semantic_reading' = 'VI. PROSE.'
         and metadata->>'canonical_division_ref' = 'XI'
         and coalesce((metadata->>'validated_human')::boolean, false) is false
     )
     or (select count(*) from public.liens_bibliques l join public.segments s on s.id = l.segment_id where s.id_texte = v_ceriziers_text_id) <> 0 then
    raise exception 'Contrôle post-écriture Ceriziers refusé';
  end if;
  if (select count(*) from public.segments where id_texte = v_mirandol_text_id) <> 1896
     or (select count(*) from public.oeuvre_texte_unites where id_texte = v_mirandol_text_id) <> 475
     or (select count(*) from public.texte_notes where id_texte = v_mirandol_text_id) <> 138
     or (select count(*) from public.texte_note_blocs where id_texte = v_mirandol_text_id) <> 554
     or (select count(*) from public.texte_note_relations where id_texte = v_mirandol_text_id) <> 161
     or (select count(*) from public.texte_note_ancres where id_texte = v_mirandol_text_id) <> 138
     or (select count(*) from public.liens_bibliques l join public.segments s on s.id = l.segment_id where s.id_texte = v_mirandol_text_id) <> 20 then
    raise exception 'Contrôle post-écriture Mirandol refusé';
  end if;

  return jsonb_build_object(
    'status', 'CORRECTED', 'id_texte', v_ceriziers_text_id, 'segments', 1880,
    'verses', 1213, 'alignment_groups', v_group_count, 'alignment_members', 3716,
    'is_public', false, 'statut', 'review', 'mirandol_unchanged', true,
    'biblical_links_created', 0, 'payload_sha256', upper(p_payload_sha256)
  );
end;
$$;

revoke all on function public.corriger_ceriziers_1646_texte_alignement_fin(jsonb, text) from public, anon, authenticated;
grant execute on function public.corriger_ceriziers_1646_texte_alignement_fin(jsonb, text) to service_role;

comment on function public.corriger_ceriziers_1646_texte_alignement_fin(jsonb, text) is
  'Correction transactionnelle, idempotente et privée du texte Ceriziers 1646 et de son alignement fin avec Mirandol.';

create or replace function public.restaurer_ceriziers_1646_avant_correction(
  p_snapshot jsonb,
  p_expected_correction_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
set statement_timeout = '120s'
as $$
declare
  v_text_id constant text := 'TXT_A0064O0001_FR_1646_CERIZIERS';
  v_mirandol_id constant text := 'TXT_A0064O0001_FR_1861_MIRANDOL';
  v_set_id constant text := 'ALNSET-A0064O0001-MIR1861-CER1646';
  v_pro_key constant text := 'TXT_A0064O0001_FR_1646_CERIZIERS:CER-B05-D08-U001-POEM:s037';
  v_hash text;
  v_affected integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('ceriziers-1646-fine-alignment-correction-v1', 0));
  if p_snapshot#>>'{text,id_texte}' <> v_text_id
     or p_snapshot#>>'{alignment_set,alignment_set_id}' <> v_set_id
     or jsonb_array_length(p_snapshot->'segments') <> 1881
     or jsonb_array_length(p_snapshot->'alignments') <> 268
     or jsonb_array_length(p_snapshot->'alignment_members') <> 3717 then
    raise exception 'Snapshot de retour arrière hors périmètre';
  end if;
  select metadata->>'ceriziers_correction_payload_sha256' into v_hash
  from public.oeuvre_textes where id_texte = v_text_id;
  if upper(coalesce(v_hash, '')) <> upper(coalesce(p_expected_correction_sha256, ''))
     or (select count(*) from public.segments where id_texte = v_text_id) <> 1880
     or not exists (select 1 from public.oeuvre_textes where id_texte = v_text_id and statut = 'review' and is_public is false and is_default is false) then
    raise exception 'Garde du retour arrière refusée';
  end if;
  if (select count(*) from public.segments where id_texte = v_mirandol_id) <> 1896
     or (select count(*) from public.texte_notes where id_texte = v_mirandol_id) <> 138
     or (select count(*) from public.liens_bibliques l join public.segments s on s.id = l.segment_id where s.id_texte = v_mirandol_id) <> 20 then
    raise exception 'Garde Mirandol du retour arrière refusée';
  end if;

  delete from public.texte_alignements where alignment_set_id = v_set_id;

  update public.oeuvre_texte_unites as target
  set source_parent_id = source.source_parent_id, espace_textuel = source.espace_textuel,
      global_order = source.global_order, ordre_documentaire = source.ordre_documentaire,
      ref_niv1 = source.ref_niv1, ref_niv2 = source.ref_niv2, ref_niv3 = source.ref_niv3,
      ref_niv4 = source.ref_niv4, ref_niv5 = source.ref_niv5, book = source.book,
      book_heading = source.book_heading, section = source.section, paragraphe = source.paragraphe,
      source_parent_paragraph = source.source_parent_paragraph, turn_order = source.turn_order,
      type_unite = source.type_unite, source_kind = source.source_kind, clean_text = source.clean_text,
      clean_text_sha256 = source.clean_text_sha256, page_debut = source.page_debut,
      page_status = source.page_status, source_locator = source.source_locator, metadata = source.metadata
  from jsonb_populate_recordset(null::public.oeuvre_texte_unites, p_snapshot->'units') as source
  where target.id_texte = v_text_id and target.id_texte = source.id_texte and target.source_unit_id = source.source_unit_id;
  get diagnostics v_affected = row_count;
  if v_affected <> 209 then raise exception 'Restauration des unités incomplète'; end if;

  update public.segments set segment_numero = segment_numero + 200000 where id_texte = v_text_id;
  update public.segments as target
  set id_oeuvre = source.id_oeuvre, segment_numero = source.segment_numero, segment_texte = source.segment_texte,
      ref_niv1 = source.ref_niv1, ref_niv2 = source.ref_niv2, ref_niv3 = source.ref_niv3,
      ref_niv4 = source.ref_niv4, ref_niv5 = source.ref_niv5,
      ref_niv1_texte = source.ref_niv1_texte, ref_niv2_texte = source.ref_niv2_texte,
      ref_niv3_texte = source.ref_niv3_texte, ref_niv4_texte = source.ref_niv4_texte,
      ref_niv5_texte = source.ref_niv5_texte, lien_1 = source.lien_1, lien_2 = source.lien_2,
      lien_3 = source.lien_3, lien_4 = source.lien_4, fiabilite = source.fiabilite,
      nature = source.nature, reference_manuelle = source.reference_manuelle, verifies = source.verifies,
      texte_original = source.texte_original, notes = source.notes, marquage_source = source.marquage_source,
      marquage_date = source.marquage_date, commentaire_ia = source.commentaire_ia,
      liens_revus_le = source.liens_revus_le, liens_revus_par = source.liens_revus_par,
      paragraphe = source.paragraphe, rang = source.rang, controle_rang_manuel = source.controle_rang_manuel,
      controle_verifie = source.controle_verifie, controle_verifie_le = source.controle_verifie_le,
      page = source.page, source_unit_id = source.source_unit_id, espace_textuel = source.espace_textuel,
      source_start_offset_unicode = source.source_start_offset_unicode,
      source_end_offset_unicode = source.source_end_offset_unicode, join_before = source.join_before,
      segment_metadata = source.segment_metadata
  from jsonb_populate_recordset(null::public.segments, p_snapshot->'segments') as source
  where target.id_texte = v_text_id and target.id_texte = source.id_texte and target.segment_key = source.segment_key;
  get diagnostics v_affected = row_count;
  if v_affected <> 1880 then raise exception 'Restauration des segments existants incomplète'; end if;

  insert into public.segments(
    id, id_oeuvre, segment_numero, segment_texte, ref_niv1, ref_niv2, ref_niv3, ref_niv4, ref_niv5,
    ref_niv1_texte, ref_niv2_texte, ref_niv3_texte, ref_niv4_texte, ref_niv5_texte,
    lien_1, lien_2, lien_3, lien_4, fiabilite, nature, reference_manuelle, verifies,
    texte_original, notes, marquage_source, marquage_date, commentaire_ia, liens_revus_le,
    liens_revus_par, paragraphe, rang, controle_rang_manuel, controle_verifie,
    controle_verifie_le, page, id_texte, segment_key, source_unit_id, espace_textuel,
    source_start_offset_unicode, source_end_offset_unicode, join_before, segment_metadata
  ) overriding system value
  select source.id, source.id_oeuvre, source.segment_numero, source.segment_texte,
    source.ref_niv1, source.ref_niv2, source.ref_niv3, source.ref_niv4, source.ref_niv5,
    source.ref_niv1_texte, source.ref_niv2_texte, source.ref_niv3_texte, source.ref_niv4_texte, source.ref_niv5_texte,
    source.lien_1, source.lien_2, source.lien_3, source.lien_4, source.fiabilite, source.nature,
    source.reference_manuelle, source.verifies, source.texte_original, source.notes,
    source.marquage_source, source.marquage_date, source.commentaire_ia, source.liens_revus_le,
    source.liens_revus_par, source.paragraphe, source.rang, source.controle_rang_manuel,
    source.controle_verifie, source.controle_verifie_le, source.page, source.id_texte,
    source.segment_key, source.source_unit_id, source.espace_textuel,
    source.source_start_offset_unicode, source.source_end_offset_unicode, source.join_before,
    source.segment_metadata
  from jsonb_populate_recordset(null::public.segments, p_snapshot->'segments') as source
  where source.id_texte = v_text_id and source.segment_key = v_pro_key
    and not exists (select 1 from public.segments current where current.id_texte = v_text_id and current.segment_key = v_pro_key);
  get diagnostics v_affected = row_count;
  if v_affected <> 1 then raise exception 'Restauration du segment PRO incomplète'; end if;

  update public.texte_notes as target
  set book = source.book, note_number = source.note_number, footnote_id = source.footnote_id,
      source_target = source.source_target, printed_page = source.printed_page, metadata = source.metadata
  from jsonb_populate_recordset(null::public.texte_notes, p_snapshot->'notes') as source
  where target.id_texte = v_text_id and target.id_texte = source.id_texte and target.note_key = source.note_key;
  update public.texte_note_blocs as target
  set rank = source.rank, kind = source.kind, form = source.form, language = source.language,
      text = source.text, rendering = source.rendering, needs_review = source.needs_review, metadata = source.metadata
  from jsonb_populate_recordset(null::public.texte_note_blocs, p_snapshot->'note_blocks') as source
  where target.id_texte = v_text_id and target.id_texte = source.id_texte and target.note_key = source.note_key and target.block_id = source.block_id;
  update public.texte_note_ancres as target
  set note_key = source.note_key, source_target = source.source_target, source_parent_id = source.source_parent_id,
      source_unit_id = source.source_unit_id, source_offset_unicode = source.source_offset_unicode,
      source_unit_offset_unicode = source.source_unit_offset_unicode, segment_key = source.segment_key,
      segment_numero = source.segment_numero, segment_offset_unicode = source.segment_offset_unicode,
      marker = source.marker, anchor_text_left = source.anchor_text_left, anchor_text_right = source.anchor_text_right,
      structured_block_count = source.structured_block_count, metadata = source.metadata
  from jsonb_populate_recordset(null::public.texte_note_ancres, p_snapshot->'note_anchors') as source
  where target.id_texte = v_text_id and target.id_texte = source.id_texte and target.anchor_id = source.anchor_id;

  update public.texte_alignement_ensembles as target
  set id_oeuvre = source.id_oeuvre, reference_text_id = source.reference_text_id,
      aligned_text_id = source.aligned_text_id, alignment_level = source.alignment_level,
      status = source.status, method = source.method, metadata = source.metadata,
      created_at = source.created_at, updated_at = source.updated_at
  from jsonb_populate_record(null::public.texte_alignement_ensembles, p_snapshot->'alignment_set') as source
  where target.alignment_set_id = v_set_id and source.alignment_set_id = v_set_id;
  insert into public.texte_alignements
  select * from jsonb_populate_recordset(null::public.texte_alignements, p_snapshot->'alignments');
  insert into public.texte_alignement_membres
  select * from jsonb_populate_recordset(null::public.texte_alignement_membres, p_snapshot->'alignment_members');

  update public.oeuvre_textes as target
  set id_oeuvre = source.id_oeuvre, catalogue_notice_id_ligne = source.catalogue_notice_id_ligne,
      id_traduction = source.id_traduction, titre_version = source.titre_version, langue = source.langue,
      traducteur = source.traducteur, edition_label = source.edition_label, annee_edition = source.annee_edition,
      source_url = source.source_url, statut = source.statut, is_default = source.is_default,
      is_public = source.is_public, nb_signes = source.nb_signes, source_docx_sha256 = source.source_docx_sha256,
      control_pdf_sha256 = source.control_pdf_sha256, notes_json_sha256 = source.notes_json_sha256,
      segmentation_archive_sha256 = source.segmentation_archive_sha256, metadata = source.metadata,
      created_at = source.created_at, updated_at = source.updated_at
  from jsonb_populate_record(null::public.oeuvre_textes, p_snapshot->'text') as source
  where target.id_texte = v_text_id and source.id_texte = v_text_id;

  if (select count(*) from public.segments where id_texte = v_text_id) <> 1881
     or (select count(*) from public.segments where id_texte = v_text_id and nature = 'vers') <> 1214
     or not exists (select 1 from public.segments where id_texte = v_text_id and segment_key = v_pro_key and segment_texte = 'PRO')
     or (select count(*) from public.texte_alignements where alignment_set_id = v_set_id) <> 268
     or (select count(*) from public.texte_alignement_membres where alignment_set_id = v_set_id) <> 3717 then
    raise exception 'Contrôle post-retour arrière refusé';
  end if;
  return jsonb_build_object('status', 'ROLLED_BACK_TO_SNAPSHOT', 'segments', 1881, 'verses', 1214, 'alignment_groups', 268, 'alignment_members', 3717);
end;
$$;

revoke all on function public.restaurer_ceriziers_1646_avant_correction(jsonb, text) from public, anon, authenticated;
grant execute on function public.restaurer_ceriziers_1646_avant_correction(jsonb, text) to service_role;

comment on function public.restaurer_ceriziers_1646_avant_correction(jsonb, text) is
  'Retour arrière transactionnel exact vers le snapshot Ceriziers précédant la correction fine. À ne pas exécuter hors décision explicite.';

commit;
