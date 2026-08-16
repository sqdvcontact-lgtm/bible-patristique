begin;

create or replace function public.importer_ceriziers_1646_prive(
  p_payload jsonb,
  p_payload_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_work_id constant text := 'A0064O0001';
  v_ceriziers_text_id constant text := 'TXT_A0064O0001_FR_1646_CERIZIERS';
  v_mirandol_text_id constant text := 'TXT_A0064O0001_FR_1861_MIRANDOL';
  v_alignment_set_id constant text := 'ALNSET-A0064O0001-MIR1861-CER1646';
  v_notice_id text;
  v_reference_notice public.catalogue_notices%rowtype;
  v_segment_base bigint;
  v_mir_segments_before integer;
  v_mir_units_before integer;
  v_mir_notes_before integer;
  v_mir_links_before integer;
  v_mir_chars_before bigint;
  v_existing_hash text;
  v_result jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended('ceriziers-1646-private-import-v1', 0));
  perform pg_advisory_xact_lock(hashtextextended('segments-primary-key-allocation-v1', 0));

  if p_payload_sha256 is null or p_payload_sha256 !~ '^[0-9A-Fa-f]{64}$' then
    raise exception 'Empreinte payload invalide';
  end if;
  if p_payload->>'id_oeuvre' <> v_work_id
     or p_payload->>'id_texte' <> v_ceriziers_text_id then
    raise exception 'Payload hors perimetre Ceriziers 1646';
  end if;
  if p_payload#>>'{alignment_set,reference_text_id}' <> v_mirandol_text_id
     or p_payload#>>'{alignment_set,aligned_text_id}' <> v_ceriziers_text_id then
    raise exception 'Paire d alignement invalide';
  end if;

  if not exists (
    select 1 from public.oeuvres
    where id_oeuvre = v_work_id and acces_public is true
  ) then
    raise exception 'Oeuvre Boece absente ou non publique';
  end if;
  if not exists (
    select 1 from public.oeuvre_textes
    where id_texte = v_mirandol_text_id
      and id_oeuvre = v_work_id
      and is_public is true
      and statut = 'published'
  ) then
    raise exception 'Texte Mirandol de reference absent ou non publie';
  end if;

  select count(*), coalesce(sum(char_length(segment_texte)), 0)
    into v_mir_segments_before, v_mir_chars_before
  from public.segments where id_texte = v_mirandol_text_id;
  select count(*) into v_mir_units_before
  from public.oeuvre_texte_unites where id_texte = v_mirandol_text_id;
  select count(*) into v_mir_notes_before
  from public.texte_notes where id_texte = v_mirandol_text_id;
  select count(*) into v_mir_links_before
  from public.liens_bibliques as lien
  join public.segments as segment on segment.id = lien.segment_id
  where segment.id_texte = v_mirandol_text_id;

  if v_mir_segments_before <> 1896 or v_mir_units_before <> 475
     or v_mir_notes_before <> 138 or v_mir_links_before <> 20 then
    raise exception 'Garde Mirandol refusee: segments %, unites %, notes %, liens %',
      v_mir_segments_before, v_mir_units_before, v_mir_notes_before, v_mir_links_before;
  end if;

  select metadata->>'ceriziers_import_payload_sha256'
    into v_existing_hash
  from public.oeuvre_textes
  where id_texte = v_ceriziers_text_id;

  if found then
    if upper(coalesce(v_existing_hash, '')) = upper(p_payload_sha256)
       and (select count(*) from public.segments where id_texte = v_ceriziers_text_id) = 1881
       and (select count(*) from public.texte_alignements where alignment_set_id = v_alignment_set_id) = 268 then
      return jsonb_build_object(
        'status', 'ALREADY_IMPORTED',
        'id_texte', v_ceriziers_text_id,
        'alignment_set_id', v_alignment_set_id,
        'payload_sha256', upper(p_payload_sha256)
      );
    end if;
    raise exception 'Import Ceriziers deja present avec un etat ou une empreinte differente';
  end if;

  if jsonb_array_length(p_payload->'units') <> 209
     or jsonb_array_length(p_payload->'segments') <> 1881
     or jsonb_array_length(p_payload->'notes') <> 4
     or jsonb_array_length(p_payload->'note_blocks') <> 4
     or jsonb_array_length(p_payload->'note_anchors') <> 4
     or jsonb_array_length(p_payload->'alignments') <> 268
     or jsonb_array_length(p_payload->'alignment_members') <> 3717 then
    raise exception 'Comptages du payload invalides';
  end if;

  select notice.* into strict v_reference_notice
  from public.catalogue_notices as notice
  join public.oeuvre_textes as texte
    on texte.catalogue_notice_id_ligne = notice.id_ligne
  where texte.id_texte = v_mirandol_text_id;

  select id_ligne into v_notice_id
  from public.catalogue_notices
  where id_oeuvre_stable = v_work_id
    and annee_edition = 1646
    and lower(coalesce(lieu_edition, '')) = 'rouen'
    and lower(coalesce(traducteur_uniformise, traducteur, '')) = lower('Rene de Ceriziers')
  order by id
  limit 1;

  if v_notice_id is null then
    select 'V20-' || lpad((coalesce(max(substring(id_ligne from '^V20-([0-9]+)$')::integer), 0) + 1)::text, 5, '0')
      into v_notice_id
    from public.catalogue_notices
    where id_ligne ~ '^V20-[0-9]+$';

    insert into public.catalogue_notices (
      id_ligne, id_auteur, auteur, dates_auteur, id_oeuvre_stable,
      titre_stable, titre_original, genre, langue_originale, date_oeuvre,
      authenticite, id_traduction, titre_edition, traducteur,
      annee_edition, siecle_edition, editeur, url_source, lieu_edition,
      date_edition, edition_debut_annee, edition_debut_precision,
      edition_fin_annee, edition_fin_precision, auteur_uniformise,
      traducteur_uniformise, decision_import_code, verification_code,
      statut_juridique_code, authenticite_code, priorite_code,
      date_edition_status_code, editeur_status_code,
      lieu_edition_status_code, traducteur_status_code,
      auteur_status_code, source_status_code, titre_original_status_code,
      date_oeuvre_status_code, score_fiabilite, verifie, verifie_admin,
      refuse_admin, presence_sur_le_site, traduction_publiee_sur_le_site
    ) values (
      v_notice_id, v_reference_notice.id_auteur, v_reference_notice.auteur,
      v_reference_notice.dates_auteur, v_work_id,
      v_reference_notice.titre_stable, v_reference_notice.titre_original,
      v_reference_notice.genre, v_reference_notice.langue_originale,
      v_reference_notice.date_oeuvre, v_reference_notice.authenticite,
      'TR_FR_1646_CERIZIERS_BOECE_CONSOLATION',
      'La Consolation de la philosophie, traduicte du latin de Boece en francois',
      'Rene de Ceriziers', 1646, 'XVIIe siecle',
      'Jean Viret ; Jacques Besongne ; Clement Malassis',
      'https://archive.org/details/bub_gb_j51V661mEw0C', 'Rouen', '1646',
      1646, 'exacte', 1646, 'exacte', v_reference_notice.auteur_uniformise,
      'Rene de Ceriziers', 'IMPORTE', 'TEXTE_VERIFIE', 'DOMAINE_PUBLIC',
      'AUTHENTIQUE', 'MOYENNE', 'RENSEIGNEE', 'RENSEIGNE', 'RENSEIGNE',
      'PERSONNE', 'PERSONNE', 'RENSEIGNEE', 'RENSEIGNE', 'RENSEIGNEE',
      95, true, false, false, false, false
    );
  end if;

  insert into public.oeuvre_textes (
    id_texte, id_oeuvre, catalogue_notice_id_ligne, id_traduction,
    titre_version, langue, traducteur, edition_label, annee_edition,
    source_url, statut, is_default, is_public, nb_signes,
    source_docx_sha256, control_pdf_sha256, notes_json_sha256, metadata
  ) values (
    v_ceriziers_text_id, v_work_id, v_notice_id,
    'TR_FR_1646_CERIZIERS_BOECE_CONSOLATION',
    'Traduction de Rene de Ceriziers, cinquieme edition, 1646',
    'francais', 'Rene de Ceriziers',
    'Rouen, Jean Viret, Jacques Besongne et Clement Malassis, cinquieme edition revue par le traducteur, 1646',
    1646, 'https://archive.org/details/bub_gb_j51V661mEw0C',
    'review', false, false,
    (select coalesce(sum(char_length(x.segment_texte)), 0)::integer
       from jsonb_to_recordset(p_payload->'segments') as x(segment_texte text)),
    upper(p_payload#>>'{source_hashes,corrected_docx_sha256}'),
    upper(p_payload#>>'{source_hashes,control_pdf_sha256}'),
    upper(p_payload#>>'{source_hashes,notes_json_sha256}'),
    jsonb_build_object(
      'ceriziers_import_payload_sha256', upper(p_payload_sha256),
      'segmentation_manifest_sha256', upper(p_payload#>>'{source_hashes,segmentation_manifest_sha256}'),
      'source_archive_sha256', upper(p_payload#>>'{source_hashes,source_archive_sha256}'),
      'edition_place', 'Rouen', 'edition_number', 5,
      'private_import', true, 'validated_human', false,
      'mirandol_immutable', true, 'biblical_links_copied', false
    )
  );

  insert into public.oeuvre_texte_unites (
    id_texte, source_unit_id, source_parent_id, espace_textuel,
    global_order, ordre_documentaire, ref_niv1, ref_niv2, ref_niv3,
    ref_niv4, ref_niv5, book, book_heading, section, paragraphe,
    source_parent_paragraph, turn_order, type_unite, source_kind,
    clean_text, clean_text_sha256, page_debut, page_status,
    source_locator, metadata
  )
  select x.id_texte, x.source_unit_id, x.source_parent_id, x.espace_textuel,
    x.global_order, x.ordre_documentaire, x.ref_niv1, x.ref_niv2, x.ref_niv3,
    x.ref_niv4, x.ref_niv5, x.book, x.book_heading, x.section, x.paragraphe,
    x.source_parent_paragraph, x.turn_order, x.type_unite, x.source_kind,
    x.clean_text, x.clean_text_sha256, x.page_debut, x.page_status,
    x.source_locator, x.metadata
  from jsonb_to_recordset(p_payload->'units') as x(
    id_texte text, source_unit_id text, source_parent_id text,
    espace_textuel text, global_order integer, ordre_documentaire integer,
    ref_niv1 text, ref_niv2 text, ref_niv3 text, ref_niv4 text, ref_niv5 text,
    book text, book_heading text, section text, paragraphe integer,
    source_parent_paragraph integer, turn_order integer, type_unite text,
    source_kind text, clean_text text, clean_text_sha256 text,
    page_debut integer, page_status text, source_locator jsonb, metadata jsonb
  );

  select coalesce(max(id), 0) into v_segment_base from public.segments;
  insert into public.segments (
    id, id_oeuvre, segment_numero, segment_texte,
    ref_niv1, ref_niv2, ref_niv3, ref_niv4, ref_niv5,
    ref_niv1_texte, ref_niv2_texte, ref_niv3_texte, ref_niv4_texte, ref_niv5_texte,
    fiabilite, nature, verifies, texte_original, notes, marquage_source,
    commentaire_ia, paragraphe, rang, controle_rang_manuel,
    controle_verifie, page, id_texte, segment_key, source_unit_id,
    espace_textuel, source_start_offset_unicode, source_end_offset_unicode,
    join_before, segment_metadata
  )
  select v_segment_base + row_number() over (order by x.segment_numero),
    x.id_oeuvre, x.segment_numero, x.segment_texte,
    x.ref_niv1, x.ref_niv2, x.ref_niv3, x.ref_niv4, x.ref_niv5,
    x.ref_niv1_texte, x.ref_niv2_texte, x.ref_niv3_texte, x.ref_niv4_texte, x.ref_niv5_texte,
    x.fiabilite, x.nature, x.verifies, null, x.notes, x.marquage_source,
    x.commentaire_ia, x.paragraphe, x.rang, x.controle_rang_manuel,
    x.controle_verifie, x.page, x.id_texte, x.segment_key, x.source_unit_id,
    x.espace_textuel, x.source_start_offset_unicode, x.source_end_offset_unicode,
    x.join_before, x.segment_metadata
  from jsonb_to_recordset(p_payload->'segments') as x(
    id_oeuvre text, segment_numero integer, segment_texte text,
    ref_niv1 text, ref_niv2 text, ref_niv3 text, ref_niv4 text, ref_niv5 text,
    ref_niv1_texte text, ref_niv2_texte text, ref_niv3_texte text,
    ref_niv4_texte text, ref_niv5_texte text, fiabilite text, nature text,
    verifies jsonb, notes text, marquage_source text, commentaire_ia text,
    paragraphe integer, rang integer, controle_rang_manuel text,
    controle_verifie boolean, page integer, id_texte text, segment_key text,
    source_unit_id text, espace_textuel text, source_start_offset_unicode integer,
    source_end_offset_unicode integer, join_before text, segment_metadata jsonb
  );

  insert into public.texte_notes (
    id_texte, note_key, book, note_number, footnote_id,
    source_target, printed_page, metadata
  )
  select x.id_texte, x.note_key, x.book, x.note_number, x.footnote_id,
    x.source_target, x.printed_page, x.metadata
  from jsonb_to_recordset(p_payload->'notes') as x(
    id_texte text, note_key text, book text, note_number integer,
    footnote_id integer, source_target text, printed_page integer, metadata jsonb
  );

  insert into public.texte_note_blocs (
    id_texte, note_key, block_id, rank, kind, form, language,
    text, rendering, needs_review, metadata
  )
  select x.id_texte, x.note_key, x.block_id, x.rank, x.kind, x.form,
    x.language, x.text, x.rendering, x.needs_review, x.metadata
  from jsonb_to_recordset(p_payload->'note_blocks') as x(
    id_texte text, note_key text, block_id text, rank integer, kind text,
    form text, language text, text text, rendering text,
    needs_review boolean, metadata jsonb
  );

  insert into public.texte_note_ancres (
    id_texte, anchor_id, note_key, source_target, source_parent_id,
    source_unit_id, source_offset_unicode, source_unit_offset_unicode,
    segment_key, segment_numero, segment_offset_unicode, marker,
    anchor_text_left, anchor_text_right, structured_block_count, metadata
  )
  select x.id_texte, x.anchor_id, x.note_key, x.source_target, x.source_parent_id,
    x.source_unit_id, x.source_offset_unicode, x.source_unit_offset_unicode,
    x.segment_key, x.segment_numero, x.segment_offset_unicode, x.marker,
    x.anchor_text_left, x.anchor_text_right, x.structured_block_count, x.metadata
  from jsonb_to_recordset(p_payload->'note_anchors') as x(
    id_texte text, anchor_id text, note_key text, source_target text,
    source_parent_id text, source_unit_id text, source_offset_unicode integer,
    source_unit_offset_unicode integer, segment_key text, segment_numero integer,
    segment_offset_unicode integer, marker text, anchor_text_left text,
    anchor_text_right text, structured_block_count integer, metadata jsonb
  );

  insert into public.texte_alignement_ensembles (
    alignment_set_id, id_oeuvre, reference_text_id, aligned_text_id,
    alignment_level, status, method, metadata
  ) values (
    v_alignment_set_id, v_work_id, v_mirandol_text_id, v_ceriziers_text_id,
    'segment', 'reviewed_ai', p_payload#>>'{alignment_set,method}',
    coalesce(p_payload#>'{alignment_set,metadata}', '{}'::jsonb)
      || jsonb_build_object('payload_sha256', upper(p_payload_sha256), 'validated_human', false)
  );

  insert into public.texte_alignements (
    alignment_id, alignment_set_id, book, canonical_division_order,
    group_order, cardinality, status, confidence, method,
    justification, metadata
  )
  select x.alignment_id, x.alignment_set_id, x.book,
    x.canonical_division_order, x.group_order, x.cardinality,
    x.status, x.confidence, x.method, x.justification, x.metadata
  from jsonb_to_recordset(p_payload->'alignments') as x(
    alignment_id text, alignment_set_id text, book integer,
    canonical_division_order integer, group_order integer,
    cardinality text, status text, confidence numeric, method text,
    justification text, metadata jsonb
  );

  insert into public.texte_alignement_membres (
    alignment_set_id, alignment_id, role, member_order,
    id_texte, segment_key, metadata
  )
  select x.alignment_set_id, x.alignment_id, x.role, x.member_order,
    x.id_texte, x.segment_key, x.metadata
  from jsonb_to_recordset(p_payload->'alignment_members') as x(
    alignment_set_id text, alignment_id text, role text,
    member_order integer, id_texte text, segment_key text, metadata jsonb
  );

  if (select count(*) from public.oeuvre_texte_unites where id_texte = v_ceriziers_text_id) <> 209
     or (select count(*) from public.segments where id_texte = v_ceriziers_text_id) <> 1881
     or (select count(*) from public.segments where id_texte = v_ceriziers_text_id and nature = 'vers') <> 1214
     or (select count(*) from public.texte_notes where id_texte = v_ceriziers_text_id) <> 4
     or (select count(*) from public.texte_note_blocs where id_texte = v_ceriziers_text_id) <> 4
     or (select count(*) from public.texte_note_ancres where id_texte = v_ceriziers_text_id) <> 4
     or (select count(*) from public.texte_alignements where alignment_set_id = v_alignment_set_id) <> 268
     or (select count(*) from public.texte_alignement_membres where alignment_set_id = v_alignment_set_id) <> 3717
     or (select count(*) from public.texte_alignement_membres where alignment_set_id = v_alignment_set_id and role = 'aligned') <> 1822
     or (select count(*) from public.texte_alignement_membres where alignment_set_id = v_alignment_set_id and role = 'reference') <> 1895
     or (select count(distinct (book, canonical_division_order)) from public.texte_alignements where alignment_set_id = v_alignment_set_id) <> 78 then
    raise exception 'Controle post-import Ceriziers ou alignement refuse';
  end if;

  if exists (select 1 from public.segments where id_texte = v_ceriziers_text_id and texte_original is not null)
     or exists (
       select 1 from public.liens_bibliques as lien
       join public.segments as segment on segment.id = lien.segment_id
       where segment.id_texte = v_ceriziers_text_id
     ) then
    raise exception 'Latin ou lien biblique interdit detecte sur Ceriziers';
  end if;

  if (select count(*) from public.segments where id_texte = v_mirandol_text_id) <> v_mir_segments_before
     or (select coalesce(sum(char_length(segment_texte)), 0) from public.segments where id_texte = v_mirandol_text_id) <> v_mir_chars_before
     or (select count(*) from public.oeuvre_texte_unites where id_texte = v_mirandol_text_id) <> v_mir_units_before
     or (select count(*) from public.texte_notes where id_texte = v_mirandol_text_id) <> v_mir_notes_before
     or (select count(*) from public.liens_bibliques as lien join public.segments as segment on segment.id = lien.segment_id where segment.id_texte = v_mirandol_text_id) <> v_mir_links_before then
    raise exception 'Garde d integrite Mirandol refusee apres import';
  end if;

  select jsonb_build_object(
    'status', 'IMPORTED',
    'notice_id_ligne', v_notice_id,
    'id_texte', v_ceriziers_text_id,
    'units', 209,
    'segments', 1881,
    'verses', 1214,
    'notes', 4,
    'alignment_set_id', v_alignment_set_id,
    'alignment_groups', 268,
    'alignment_members', 3717,
    'is_public', false,
    'statut', 'review',
    'mirandol_unchanged', true,
    'biblical_links_created', 0,
    'payload_sha256', upper(p_payload_sha256)
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function public.importer_ceriziers_1646_prive(jsonb, text) from public, anon, authenticated;
grant execute on function public.importer_ceriziers_1646_prive(jsonb, text) to service_role;

comment on function public.importer_ceriziers_1646_prive(jsonb, text) is
  'Import transactionnel, idempotent, prive et borne de Ceriziers 1646 avec alignement Mirandol.';

commit;
