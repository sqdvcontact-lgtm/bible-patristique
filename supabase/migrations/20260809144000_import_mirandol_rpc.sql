-- Importeur transactionnel et idempotent de la version Mirandol 1861.
-- L'appel RPC entier constitue une transaction Postgres.

create or replace function public.importer_mirandol_1861(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_id_oeuvre constant text := 'A0064O0001';
  v_id_texte constant text := 'TXT_A0064O0001_FR_1861_MIRANDOL';
  v_notice constant text := 'V20-03424';
  v_result jsonb;
  v_role text := coalesce(auth.role(), '');
  v_error_context text;
begin
  if v_role <> 'service_role' and not public.is_admin() then
    raise exception 'Import Mirandol réservé au service_role ou à un administrateur.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('corpus-scriptura:import:' || v_id_texte, 0));
  perform pg_advisory_xact_lock(hashtextextended('corpus-scriptura:segments:id-allocation', 0));

  if upper(coalesce(p_payload->>'archive_sha256', '')) <> 'B15C5821839EBC7111BED18D62B78452340DC819ECBD3B7DA2394BEFF1F15BEF'
     or upper(coalesce(p_payload->>'docx_sha256', '')) <> '08D01533B44936059C34832281109A753C3A43742ED1956DABF66A8626EE75C4'
     or upper(coalesce(p_payload->>'pdf_sha256', '')) <> 'B5C06E32D6221A060167D41E127B8ED623D2A41B2AF265D9E7E2FBF89DAD7A27'
     or upper(coalesce(p_payload->>'notes_sha256', '')) <> '7A75BDACDB5019A1CC690567F6F30DBED3C80BBED39D52D9B5CCD1CDEE7448F7'
     or upper(coalesce(p_payload->>'segmentation_manifest_sha256', '')) <> '3A008B8C0744458594FE48F9EFFC99837FDA0559DB44E0D5C1A04AEF8E29ECCB'
     or upper(coalesce(p_payload->>'source_units_sha256', '')) <> '8AD132FC78A75D80FB3E1371858FDE4BA4889DA42DF43ADC6F687A495F85E7AB'
     or upper(coalesce(p_payload->>'anchors_sha256', '')) <> 'EABC5ECF410AE3F5F4842D0B6C96F7E670FE94BC040DFCCBE99604DE23F0F0A2'
     or upper(coalesce(p_payload->>'logical_relations_sha256', '')) <> '5F7CEFF8D78438BBE94D317FA6FE6BBB49FF3E7B6638212A172BF427054D2EF8' then
    raise exception 'Empreinte de provenance Mirandol invalide.';
  end if;

  if jsonb_array_length(coalesce(p_payload->'units', '[]'::jsonb)) <> 475
     or jsonb_array_length(coalesce(p_payload->'segments', '[]'::jsonb)) <> 1896
     or jsonb_array_length(coalesce(p_payload->'notes', '[]'::jsonb)) <> 138
     or jsonb_array_length(coalesce(p_payload->'anchors', '[]'::jsonb)) <> 138
     or jsonb_array_length(coalesce(p_payload->'logical_groups', '[]'::jsonb)) <> 1
     or jsonb_array_length(coalesce(p_payload->'logical_relations', '[]'::jsonb)) <> 6 then
    raise exception 'Cardinalité du payload Mirandol invalide.';
  end if;

  if not exists (
    select 1 from public.catalogue_notices n
    where n.id_ligne = v_notice
      and n.id_oeuvre_stable = v_id_oeuvre
      and n.id_auteur = 'A0064'
      and not n.traduction_publiee_sur_le_site
      and not n.verifie_admin
  ) then
    raise exception 'Notice V20-03424 absente ou état de publication inattendu.';
  end if;

  insert into public.oeuvres (
    id_oeuvre, id_auteur, titre, titre_original, langue_originale, langue_trad,
    date_approx, genre, trad_auteur, note, editeur, collection, ville, trad_id,
    date_publication, url_source, profondeur_sommaire, nb_signes,
    niveaux_sommaire, niveaux_corps, texte_sommaire, texte_corps,
    afficher_numeros, date_composition, genres,
    composition_debut_annee, composition_debut_precision,
    composition_fin_annee, composition_fin_precision,
    titre_affichage, date_mise_en_ligne, commentaire_traduction,
    lecture_texte_entier, acces_public, acces_public_note, acces_public_modifie_le
  )
  select
    n.id_oeuvre_stable, n.id_auteur, n.titre_stable, n.titre_original,
    n.langue_originale, 'Français', n.date_oeuvre, n.genre,
    n.traducteur, 'Import technique Mirandol 1861 ; contrôle d’affichage requis avant publication.',
    n.editeur, n.collection_nom, n.lieu_edition, null,
    coalesce(n.date_edition, n.annee_edition::text), coalesce(n.url_texte_integral, n.url_source),
    2, 0, 2, 2, '0,0,0,0,0', '0,0,0,0,0', true,
    n.date_oeuvre, case when n.genre is null then '{}'::text[] else array[n.genre] end,
    n.oeuvre_debut_annee, n.oeuvre_debut_precision,
    n.oeuvre_fin_annee, n.oeuvre_fin_precision,
    n.titre_stable, null, 'Traduction de Louis Judicis de Mirandol, édition de 1861.',
    false, false,
    'Import technique non public en attente du contrôle d’affichage du lecteur multiversion.',
    now()
  from public.catalogue_notices n
  where n.id_ligne = v_notice
  on conflict (id_oeuvre) do update set
    acces_public = false,
    date_mise_en_ligne = null,
    acces_public_note = excluded.acces_public_note,
    acces_public_modifie_le = now(),
    trad_id = null;

  insert into public.oeuvre_textes (
    id_texte, id_oeuvre, catalogue_notice_id_ligne, id_traduction,
    titre_version, langue, traducteur, edition_label, annee_edition, source_url,
    statut, is_default, is_public, nb_signes,
    source_docx_sha256, control_pdf_sha256, notes_json_sha256, segmentation_archive_sha256,
    metadata
  )
  select
    v_id_texte, v_id_oeuvre, v_notice, n.id_traduction,
    n.titre_edition, 'français', n.traducteur,
    concat_ws(', ', n.lieu_edition, n.editeur, n.annee_edition::text),
    n.annee_edition, coalesce(n.url_texte_integral, n.url_source),
    'review', true, false, 0,
    upper(p_payload->>'docx_sha256'), upper(p_payload->>'pdf_sha256'),
    upper(p_payload->>'notes_sha256'), upper(p_payload->>'archive_sha256'),
    jsonb_build_object(
      'project', 'Corpus Scriptura',
      'edition_year', 1861,
      'public_domain', true,
      'segmentation_status', 'reviewed_complete',
      'segmentation_manifest_sha256', upper(p_payload->>'segmentation_manifest_sha256'),
      'source_units_sha256', upper(p_payload->>'source_units_sha256'),
      'anchors_sha256', upper(p_payload->>'anchors_sha256'),
      'logical_relations_sha256', upper(p_payload->>'logical_relations_sha256'),
      'importer_version', '1.0.0'
    )
  from public.catalogue_notices n where n.id_ligne = v_notice
  on conflict (id_texte) do update set
    catalogue_notice_id_ligne = excluded.catalogue_notice_id_ligne,
    id_traduction = excluded.id_traduction,
    titre_version = excluded.titre_version,
    langue = excluded.langue,
    traducteur = excluded.traducteur,
    edition_label = excluded.edition_label,
    annee_edition = excluded.annee_edition,
    source_url = excluded.source_url,
    statut = 'review',
    is_default = true,
    is_public = false,
    source_docx_sha256 = excluded.source_docx_sha256,
    control_pdf_sha256 = excluded.control_pdf_sha256,
    notes_json_sha256 = excluded.notes_json_sha256,
    segmentation_archive_sha256 = excluded.segmentation_archive_sha256,
    metadata = excluded.metadata;

  insert into public.oeuvre_texte_unites (
    id_texte, source_unit_id, source_parent_id, espace_textuel,
    global_order, ordre_documentaire, ref_niv1, ref_niv2, ref_niv3, ref_niv4, ref_niv5,
    book, book_heading, section, paragraphe, source_parent_paragraph, turn_order,
    type_unite, source_kind, clean_text, clean_text_sha256,
    page_debut, page_status, source_locator, metadata
  )
  select
    v_id_texte, j->>'source_unit_id', j->>'source_parent_id', j->>'espace_textuel',
    (j->>'global_order')::integer, nullif(j->>'ordre_documentaire','')::integer,
    j->>'book_heading', j->>'section', null, null, null,
    j->>'book', j->>'book_heading', j->>'section', nullif(j->>'paragraph','')::integer,
    nullif(j->>'source_parent_paragraph','')::integer, nullif(j->>'turn_order','')::integer,
    j->>'type_unite', j->>'source_kind', j->>'clean_text', upper(j->>'clean_text_sha256'),
    nullif(j->>'page_debut','')::integer, j->>'page_status',
    coalesce(j->'source_locator','{}'::jsonb), j
  from jsonb_array_elements(p_payload->'units') j
  on conflict (id_texte, source_unit_id) do update set
    source_parent_id = excluded.source_parent_id,
    espace_textuel = excluded.espace_textuel,
    global_order = excluded.global_order,
    ordre_documentaire = excluded.ordre_documentaire,
    ref_niv1 = excluded.ref_niv1,
    ref_niv2 = excluded.ref_niv2,
    ref_niv3 = excluded.ref_niv3,
    ref_niv4 = excluded.ref_niv4,
    ref_niv5 = excluded.ref_niv5,
    book = excluded.book,
    book_heading = excluded.book_heading,
    section = excluded.section,
    paragraphe = excluded.paragraphe,
    source_parent_paragraph = excluded.source_parent_paragraph,
    turn_order = excluded.turn_order,
    type_unite = excluded.type_unite,
    source_kind = excluded.source_kind,
    clean_text = excluded.clean_text,
    clean_text_sha256 = excluded.clean_text_sha256,
    page_debut = excluded.page_debut,
    page_status = excluded.page_status,
    source_locator = excluded.source_locator,
    metadata = excluded.metadata;

  insert into public.segments (
    id_oeuvre, id_texte, segment_key, source_unit_id, espace_textuel,
    segment_numero, segment_texte,
    ref_niv1, ref_niv2, ref_niv3, ref_niv4, ref_niv5,
    ref_niv1_texte, ref_niv2_texte, ref_niv3_texte, ref_niv4_texte, ref_niv5_texte,
    fiabilite, nature, texte_original, notes,
    marquage_source, marquage_date, commentaire_ia,
    paragraphe, rang, controle_verifie, page,
    source_start_offset_unicode, source_end_offset_unicode, join_before, segment_metadata
  )
  select
    v_id_oeuvre, v_id_texte, j->>'segment_key', j->>'source_unit_id', j->>'espace_textuel',
    (j->>'segment_numero')::integer, j->>'segment_texte',
    j->>'ref_niv1', j->>'ref_niv2', j->>'ref_niv3', j->>'ref_niv4', j->>'ref_niv5',
    j->>'ref_niv1_texte', j->>'ref_niv2_texte', j->>'ref_niv3_texte', j->>'ref_niv4_texte', j->>'ref_niv5_texte',
    null, j->>'nature', null, j->>'notes',
    'Codex (IA)', now(), 'Segmentation Mirandol validée ; contrôle d’affichage humain restant.',
    nullif(j->>'paragraphe','')::integer, nullif(j->>'rang','')::integer, false,
    nullif(j->>'page','')::integer,
    nullif(j->>'source_start_offset_unicode','')::integer,
    nullif(j->>'source_end_offset_unicode','')::integer,
    coalesce(j->>'join_before',''), j
  from jsonb_array_elements(p_payload->'segments') j
  on conflict (id_texte, segment_numero) do update set
    id_oeuvre = excluded.id_oeuvre,
    segment_key = excluded.segment_key,
    source_unit_id = excluded.source_unit_id,
    espace_textuel = excluded.espace_textuel,
    segment_texte = excluded.segment_texte,
    ref_niv1 = excluded.ref_niv1,
    ref_niv2 = excluded.ref_niv2,
    ref_niv3 = excluded.ref_niv3,
    ref_niv4 = excluded.ref_niv4,
    ref_niv5 = excluded.ref_niv5,
    ref_niv1_texte = excluded.ref_niv1_texte,
    ref_niv2_texte = excluded.ref_niv2_texte,
    ref_niv3_texte = excluded.ref_niv3_texte,
    ref_niv4_texte = excluded.ref_niv4_texte,
    ref_niv5_texte = excluded.ref_niv5_texte,
    fiabilite = null,
    nature = excluded.nature,
    texte_original = null,
    notes = excluded.notes,
    marquage_source = 'Codex (IA)',
    marquage_date = now(),
    commentaire_ia = excluded.commentaire_ia,
    paragraphe = excluded.paragraphe,
    rang = excluded.rang,
    controle_verifie = false,
    controle_verifie_le = null,
    page = excluded.page,
    source_start_offset_unicode = excluded.source_start_offset_unicode,
    source_end_offset_unicode = excluded.source_end_offset_unicode,
    join_before = excluded.join_before,
    segment_metadata = excluded.segment_metadata;

  if (select count(*) from public.segments where id_texte = v_id_texte) <> 1896 then
    raise exception 'Import borné refusé : nombre de segments inattendu.';
  end if;

  delete from public.texte_note_relations where id_texte = v_id_texte;
  delete from public.texte_note_ancres where id_texte = v_id_texte;
  delete from public.texte_note_blocs where id_texte = v_id_texte;
  delete from public.texte_notes where id_texte = v_id_texte;
  delete from public.texte_relations_logiques where id_texte = v_id_texte;
  delete from public.texte_groupe_membres where id_texte = v_id_texte;
  delete from public.texte_groupes_logiques where id_texte = v_id_texte;

  insert into public.texte_notes (
    id_texte, note_key, book, note_number, footnote_id, source_target, printed_page, metadata
  )
  select v_id_texte, n->>'note_key', n->>'book', (n->>'note_number')::integer,
         (n->>'footnote_id')::integer, n->>'source_target', nullif(n->>'printed_page','')::integer,
         n - 'blocks'
  from jsonb_array_elements(p_payload->'notes') n;

  insert into public.texte_note_blocs (
    id_texte, note_key, block_id, rank, kind, form, language, text, rendering, needs_review, metadata
  )
  select v_id_texte, n->>'note_key', b->>'block_id', (b->>'rank')::integer,
         b->>'kind', b->>'form', b->>'language', b->>'text', b->>'rendering',
         coalesce((b->>'needs_review')::boolean, false), b
  from jsonb_array_elements(p_payload->'notes') n
  cross join lateral jsonb_array_elements(n->'blocks') b;

  insert into public.texte_note_relations (
    id_texte, note_key, relation_kind, source_block_id, target_block_id, metadata
  )
  select v_id_texte, n->>'note_key', 'target_block', b->>'block_id', b->>'target_block_id', b
  from jsonb_array_elements(p_payload->'notes') n
  cross join lateral jsonb_array_elements(n->'blocks') b
  where b->>'target_block_id' is not null
  union all
  select v_id_texte, n->>'note_key', 'translation_of', b->>'block_id', b->>'translation_of', b
  from jsonb_array_elements(p_payload->'notes') n
  cross join lateral jsonb_array_elements(n->'blocks') b
  where b->>'translation_of' is not null;

  insert into public.texte_note_ancres (
    id_texte, anchor_id, note_key, source_target, source_parent_id, source_unit_id,
    source_offset_unicode, source_unit_offset_unicode,
    segment_key, segment_numero, segment_offset_unicode, marker,
    anchor_text_left, anchor_text_right, structured_block_count, metadata
  )
  select v_id_texte, (a->>'note_key') || ':' || (a->>'source_target'),
         a->>'note_key', a->>'source_target', a->>'source_parent_id', a->>'source_unit_id',
         nullif(a->>'source_offset_unicode','')::integer,
         nullif(a->>'source_unit_offset_unicode','')::integer,
         a->>'segment_key', (a->>'segment_numero')::integer,
         nullif(a->>'segment_offset_unicode','')::integer, a->>'marker',
         a->>'anchor_text_left', a->>'anchor_text_right',
         (a->>'structured_block_count')::integer, a
  from jsonb_array_elements(p_payload->'anchors') a;

  insert into public.texte_groupes_logiques (id_texte, group_id, relation_type, justification, metadata)
  select v_id_texte, g->>'group_id', g->>'relation_type', g->>'justification', g
  from jsonb_array_elements(p_payload->'logical_groups') g;

  insert into public.texte_groupe_membres (id_texte, group_id, member_order, source_unit_id, role)
  select v_id_texte, g->>'group_id', m.ordinality::integer, m.member->>0, m.member->>1
  from jsonb_array_elements(p_payload->'logical_groups') g
  cross join lateral jsonb_array_elements(g->'members') with ordinality as m(member, ordinality);

  insert into public.texte_relations_logiques (
    id_texte, relation_id, relation_type, source_segment_key, target_segment_key,
    target_unit_id, justification, metadata
  )
  select v_id_texte, r->>'relation_id', r->>'relation_type', r->>'source_segment_key',
         r->>'target_segment_key', r->>'target_unit_id', r->>'justification', r
  from jsonb_array_elements(p_payload->'logical_relations') r;

  if exists (
    select 1
    from public.oeuvre_texte_unites u
    where u.id_texte = v_id_texte
      and u.clean_text <> coalesce((
        select string_agg(
          coalesce(s.join_before, '') || coalesce(s.segment_metadata->>'segment_text_clean', ''),
          '' order by s.source_start_offset_unicode, s.segment_numero
        ) || coalesce(u.metadata->>'segment_trailing_text', '')
        from public.segments s
        where s.id_texte = u.id_texte and s.source_unit_id = u.source_unit_id
      ), '')
  ) then
    raise exception 'Échec de recomposition exacte des unités sources.';
  end if;

  if exists (
    select 1
    from public.texte_note_ancres a
    join public.segments s on s.id_texte = a.id_texte and s.segment_key = a.segment_key
    where a.id_texte = v_id_texte
      and (
        a.segment_numero <> s.segment_numero or
        strpos(coalesce(s.segment_texte, ''), a.marker) = 0
      )
  ) then
    raise exception 'Échec de projection des ancres de notes.';
  end if;

  if exists (
    select 1 from (
      select source_unit_id, paragraphe, min(rang) min_rank, max(rang) max_rank,
             count(*) count_rank, count(distinct rang) distinct_rank
      from public.segments
      where id_texte = v_id_texte and paragraphe is not null
      group by source_unit_id, paragraphe
    ) q
    where min_rank <> 1 or max_rank <> count_rank or count_rank <> distinct_rank
  ) then
    raise exception 'Rangs discontinus dans la segmentation Mirandol.';
  end if;

  if (select count(*) from public.segments where id_texte = v_id_texte and nature = 'vers') <> 1092
     or (select count(*) from public.texte_notes where id_texte = v_id_texte) <> 138
     or (select count(*) from public.texte_note_blocs where id_texte = v_id_texte) <> 554
     or (select count(*) from public.texte_note_relations where id_texte = v_id_texte) <> 161
     or (select count(*) from public.texte_note_ancres where id_texte = v_id_texte) <> 138
     or (select count(*) from public.texte_groupes_logiques where id_texte = v_id_texte) <> 1
     or (select count(*) from public.texte_groupe_membres where id_texte = v_id_texte) <> 3
     or (select count(*) from public.texte_relations_logiques where id_texte = v_id_texte) <> 6 then
    raise exception 'Contrôle cardinal des données importées en échec.';
  end if;

  update public.catalogue_notices
  set presence_sur_le_site = false,
      traduction_publiee_sur_le_site = false,
      verifie_admin = false
  where id_ligne = v_notice;

  select jsonb_build_object(
    'id_oeuvre', v_id_oeuvre,
    'id_texte', v_id_texte,
    'units', (select count(*) from public.oeuvre_texte_unites where id_texte = v_id_texte),
    'segments', (select count(*) from public.segments where id_texte = v_id_texte),
    'verses', (select count(*) from public.segments where id_texte = v_id_texte and nature = 'vers'),
    'notes', (select count(*) from public.texte_notes where id_texte = v_id_texte),
    'blocks', (select count(*) from public.texte_note_blocs where id_texte = v_id_texte),
    'semantic_relations', (select count(*) from public.texte_note_relations where id_texte = v_id_texte),
    'anchors', (select count(*) from public.texte_note_ancres where id_texte = v_id_texte),
    'logical_groups', (select count(*) from public.texte_groupes_logiques where id_texte = v_id_texte),
    'logical_members', (select count(*) from public.texte_groupe_membres where id_texte = v_id_texte),
    'logical_relations', (select count(*) from public.texte_relations_logiques where id_texte = v_id_texte),
    'segment_id_min', (select min(id) from public.segments where id_texte = v_id_texte),
    'segment_id_max', (select max(id) from public.segments where id_texte = v_id_texte),
    'statut', (select statut from public.oeuvre_textes where id_texte = v_id_texte),
    'is_public', (select is_public from public.oeuvre_textes where id_texte = v_id_texte),
    'imported_at', now()
  ) into v_result;

  return v_result;
exception when others then
  get stacked diagnostics v_error_context = pg_exception_context;
  raise exception using
    errcode = sqlstate,
    message = sqlerrm,
    detail = v_error_context;
end
$$;

revoke all on function public.importer_mirandol_1861(jsonb) from public;
revoke all on function public.importer_mirandol_1861(jsonb) from anon;
revoke all on function public.importer_mirandol_1861(jsonb) from authenticated;
grant execute on function public.importer_mirandol_1861(jsonb) to service_role;

comment on function public.importer_mirandol_1861(jsonb) is
  'Import transactionnel, idempotent et borné de TXT_A0064O0001_FR_1861_MIRANDOL.';
