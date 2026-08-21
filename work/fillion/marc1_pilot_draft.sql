-- Pilote privé Marc 1:1-20 pour la famille éditoriale Fillion.
-- Le texte latin et la traduction française restent deux sources autonomes.
-- Les références I, 1-20 sont celles de l'imprimé ; les identifiants de
-- versets_canon ne servent qu'à l'alignement éditorial.

begin;

do $fillion_marc1$
<<fillion_marc1>>
declare
  v_family_id uuid;
  member_fr_id uuid;
  member_la_id uuid;
  component_id uuid;
  source_fr_id uuid;
  source_la_id uuid;
  member_source_fr_id uuid;
  member_source_la_id uuid;
  layer_fr_id uuid;
  layer_la_id uuid;
  book_fr_id uuid;
  book_la_id uuid;
  chapter_fr_id uuid;
  chapter_la_id uuid;
  verse_segmentation_fr_id uuid;
  verse_segmentation_la_id uuid;
  body_segmentation_fr_id uuid;
  provenance_fr_id uuid;
  provenance_la_id uuid;
  intro_unit_id uuid;
  intro_segment_id uuid;
  body_unit_id uuid;
  body_segment_id uuid;
  verse_note_id uuid;
  asset_id uuid;
  v_canon_id text;
  v_unit_id uuid;
  v_segment_id uuid;
  i integer;
  canon_ids text[] := array[]::text[];
  units_fr uuid[] := array[]::uuid[];
  units_la uuid[] := array[]::uuid[];
  segments_fr uuid[] := array[]::uuid[];
  segments_la uuid[] := array[]::uuid[];
  fr_text text[] := array[
    'Commencement de l’évangile de Jésus-Christ, Fils de Dieu.',
    'Selon qu’il est écrit dans le prophète Isaïe : Voici que j’envoie mon ange devant ta face, et il préparera ton chemin devant toi ;',
    'voix de celui qui crie dans le désert : Préparez le chemin du Seigneur, rendez droits ses sentiers ;',
    'Jean était dans le désert, baptisant et prêchant le baptême de pénitence pour la rémission des péchés.',
    'Et tout le pays de Judée et tous les habitants de Jérusalem venaient à lui ; et ils étaient baptisés par lui dans le fleuve du Jourdain, confessant leurs péchés.',
    'Or Jean était vêtu de poils de chameau, il avait une ceinture de cuir autour de ses reins, et il se nourrissait de sauterelles et de miel sauvage. Et il prêchait, en disant :',
    'Il vient après moi, celui qui est plus puissant que moi, et je ne suis pas digne de délier, en me baissant, la courroie de ses sandales.',
    'Moi, je vous ai baptisés dans l’eau ; mais lui, il vous baptisera dans l’Esprit-Saint.',
    'Or, il arriva qu’en ces jours-là, Jésus vint de Nazareth, en Galilée, et il fut baptisé par Jean dans le Jourdain.',
    'Et soudain, comme il sortait de l’eau, il vit les cieux s’ouvrir, et l’Esprit, comme une colombe, descendre et s’arrêter sur lui.',
    'Et une voix se fit entendre des cieux : Tu es mon Fils bien-aimé ; en toi j’ai mis mes complaisances.',
    'Et aussitôt l’Esprit le poussa dans le désert.',
    'Il passa dans le désert quarante jours et quarante nuits, et il était tenté par Satan, et il était avec les bêtes sauvages, et les anges le servaient.',
    'Mais, après que Jean eut été mis en prison, Jésus vint en Galilée, prêchant l’évangile du royaume de Dieu,',
    'et disant : Le temps est accompli, et le royaume de Dieu est proche ; faites pénitence, et croyez à l’évangile.',
    'Or, comme il passait le long de la mer de Galilée, il vit Simon et André, son frère, qui jetaient leurs filets dans la mer, car ils étaient pêcheurs.',
    'Et Jésus leur dit : Suivez-moi, et je vous ferai devenir pêcheurs d’hommes.',
    'Et aussitôt, laissant leurs filets, ils le suivirent.',
    'De là, s’étant un peu avancé, il vit Jacques, fils de Zébédée, et Jean, son frère, qui étaient aussi dans une barque, raccommodant leurs filets ;',
    'et aussitôt il les appela. Et ayant laissé Zébédée, leur père, dans la barque avec les mercenaires, ils le suivirent.'
  ];
  la_text text[] := array[
    'Initium evangelii Jesu Christi, Filii Dei.',
    'Sicut scriptum est in Isaia propheta : Ecce ego mitto angelum meum ante faciem tuam, qui praeparabit viam tuam ante te ;',
    'vox clamantis in deserto : Parate viam Domini, rectas facite semitas ejus ;',
    'fuit Joannes in deserto, baptizans et praedicans baptismum poenitentiae in remissionem peccatorum.',
    'Et egrediebatur ad eum omnis Judaeae regio, et Jerosolymitae universi, et baptizabantur ab illo in Jordanis flumine, confitentes peccata sua.',
    'Et erat Joannes vestitus pilis cameli, et zona pellicea circa lumbos ejus, et locustas et mel silvestre edebat. Et praedicabat, dicens :',
    'Venit fortior me post me, cujus non sum dignus procumbens solvere corrigiam calceamentorum ejus.',
    'Ego baptizavi vos aqua ; ille vero baptizabit vos Spiritu sancto.',
    'Et factum est, in diebus illis venit Jesus a Nazareth Galilaeae, et baptizatus est a Joanne in Jordane.',
    'Et statim ascendens de aqua vidit caelos apertos, et Spiritum tanquam columbam descendentem et manentem in ipso.',
    'Et vox facta est de caelis : Tu es Filius meus dilectus, in te complacui.',
    'Et statim Spiritus expulit eum in desertum.',
    'Et erat in deserto quadraginta diebus et quadraginta noctibus, et tentabatur a Satana ; eratque cum bestiis, et angeli ministrabant illi.',
    'Postquam autem traditus est Joannes, venit Jesus in Galilaeam, praedicans evangelium regni Dei.',
    'et dicens : Quoniam impletum est tempus, et appropinquavit regnum Dei ; poenitemini, et credite evangelio.',
    'Et praeteriens secus mare Galilaeae, vidit Simonem et Andream fratrem ejus mittentes retia in mare ; erant enim piscatores.',
    'Et dixit eis Jesus : Venite post me, et faciam vos fieri piscatores hominum.',
    'Et protinus, relictis retibus, secuti sunt eum.',
    'Et progressus inde pusillum, vidit Jacobum Zebedaei et Joannem fratrem ejus, et ipsos componentes retia in navi ;',
    'et statim vocavit illos. Et relicto patre suo Zebedaeo in navi cum mercenariis, secuti sunt eum.'
  ];
  pdf_surfaces text[] := array[
    'pdf-0199','pdf-0199','pdf-0200','pdf-0200','pdf-0200',
    'pdf-0200','pdf-0200','pdf-0201','pdf-0201','pdf-0201',
    'pdf-0201','pdf-0201','pdf-0201+0203','pdf-0203','pdf-0203',
    'pdf-0203','pdf-0203','pdf-0203','pdf-0203','pdf-0203'
  ];
  printed_pages text[] := array[
    '197','197','198','198','198','198','198','199','199','199',
    '199','199','199 et 201','201','201','201','201','201','201','201'
  ];
begin
  select id into strict v_family_id
  from public.bible_edition_families
  where family_code = 'fillion-bible' and status = 'draft';

  select id into strict member_fr_id
  from public.bible_edition_members
  where family_id = v_family_id and trad_id = 'TR0010' and status = 'draft';

  select id into strict member_la_id
  from public.bible_edition_members
  where family_id = v_family_id and trad_id = 'TR0011' and status = 'draft';

  select id into strict component_id
  from public.bible_edition_components
  where family_id = v_family_id and component_code = 'tome-07';

  if exists (
    select 1 from public.bible_text_sources
    where trad_id in ('TR0010', 'TR0011') and source_code = 'fillion-t07-mrk-pilot'
  ) then
    raise exception 'Le pilote Marc Fillion existe déjà.';
  end if;

  for i in 1..20 loop
    select id into v_canon_id
    from public.versets_canon
    where livre = 'MRK' and ch_canon = 1 and v_canon = i;
    if v_canon_id is null then
      raise exception 'Créneau canonique MRK 1:% absent.', i;
    end if;
    canon_ids[i] := v_canon_id;
  end loop;

  insert into public.bible_text_sources (
    trad_id, source_code, title, source_kind, version_label,
    source_uri, source_sha256, status, metadata
  ) values (
    'TR0010',
    'fillion-t07-mrk-pilot',
    'Fillion, tome VII — Marc, pilote français',
    'printed_edition',
    'Huitième édition, 1924 — pilote Marc 1:1-20',
    'https://archive.org/download/lasaintebibletex07fill/lasaintebibletex07fill.pdf',
    '36636793eb22df2edfd6675bb5388204e016414f917f99929c1723df9adce608',
    'review',
    jsonb_build_object(
      'pilot', true,
      'book_code', 'MRK',
      'native_reference_range', 'I, 1-20',
      'pdf_page_indexes', jsonb_build_array(195,196,197,198,199,200,201,202,203),
      'transcription_method', 'transcription manuelle confrontée au fac-similé',
      'normalization', 'espacement et ponctuation de lecture normalisés ; formes lexicales conservées',
      'public_exposure', 'none'
    )
  ) returning id into source_fr_id;

  insert into public.bible_text_sources (
    trad_id, source_code, title, source_kind, version_label,
    source_uri, source_sha256, status, metadata
  ) values (
    'TR0011',
    'fillion-t07-mrk-pilot',
    'Vulgate publiée par Fillion, tome VII — Marc, pilote latin',
    'printed_edition',
    'Huitième édition, 1924 — pilote Marc 1:1-20',
    'https://archive.org/download/lasaintebibletex07fill/lasaintebibletex07fill.pdf',
    '36636793eb22df2edfd6675bb5388204e016414f917f99929c1723df9adce608',
    'review',
    jsonb_build_object(
      'pilot', true,
      'book_code', 'MRK',
      'native_reference_range', 'I, 1-20',
      'independent_from', 'TR0004',
      'pdf_page_indexes', jsonb_build_array(199,200,201,203),
      'transcription_method', 'transcription manuelle confrontée au fac-similé',
      'normalization', 'espacement et ponctuation de lecture normalisés ; formes lexicales conservées',
      'public_exposure', 'none'
    )
  ) returning id into source_la_id;

  insert into public.bible_edition_member_sources (
    family_id, member_id, trad_id, component_id, source_id, source_role,
    canon_id_start, canon_id_end, material_order, status, metadata
  ) values (
    v_family_id, member_fr_id, 'TR0010', component_id, source_fr_id, 'primary',
    canon_ids[1], canon_ids[20], 70, 'review',
    '{"pilot":true,"native_reference_range":"I, 1-20"}'::jsonb
  ) returning id into member_source_fr_id;

  insert into public.bible_edition_member_sources (
    family_id, member_id, trad_id, component_id, source_id, source_role,
    canon_id_start, canon_id_end, material_order, status, metadata
  ) values (
    v_family_id, member_la_id, 'TR0011', component_id, source_la_id, 'primary',
    canon_ids[1], canon_ids[20], 70, 'review',
    '{"pilot":true,"native_reference_range":"I, 1-20"}'::jsonb
  ) returning id into member_source_la_id;

  insert into public.bible_text_layers (
    source_id, layer_code, label, layer_kind, validation_status,
    is_public, transformation_rules
  ) values (
    source_fr_id, 'lecture-fidele', 'Transcription française de lecture fidèle',
    'expanded', 'review', false,
    '{"spacing":"normalized","punctuation":"normalized_for_reading","lexical_forms":"preserved","modernization":false}'::jsonb
  ) returning id into layer_fr_id;

  insert into public.bible_text_layers (
    source_id, layer_code, label, layer_kind, validation_status,
    is_public, transformation_rules
  ) values (
    source_la_id, 'lecture-fidele', 'Transcription latine de lecture fidèle',
    'expanded', 'review', false,
    '{"spacing":"normalized","punctuation":"normalized_for_reading","lexical_forms":"preserved","modernization":false}'::jsonb
  ) returning id into layer_la_id;

  insert into public.bible_provenance_records (
    source_id, provenance_key, provenance_kind, citation, locator, uri,
    file_path, sha256, asset_role, agent, details
  ) values (
    source_fr_id, 'facsimile-t07-pilot-mrk', 'facsimile',
    'Louis-Claude Fillion, La Sainte Bible, tome VII, huitième édition, Paris, Letouzey et Ané, 1924.',
    'PDF p. 195-203 ; pages imprimées 193-201',
    'https://archive.org/download/lasaintebibletex07fill/lasaintebibletex07fill.pdf',
    'tmp/pdfs/fillion/lasaintebibletex07fill.pdf',
    '36636793eb22df2edfd6675bb5388204e016414f917f99929c1723df9adce608',
    'PRIMARY', 'Corpus Scriptura',
    '{"pilot":"MRK 1:1-20","visual_collation_required":true}'::jsonb
  ) returning id into provenance_fr_id;

  insert into public.bible_provenance_records (
    source_id, provenance_key, provenance_kind, citation, locator, uri,
    file_path, sha256, asset_role, agent, details
  ) values (
    source_la_id, 'facsimile-t07-pilot-mrk', 'facsimile',
    'Louis-Claude Fillion, La Sainte Bible, tome VII, huitième édition, Paris, Letouzey et Ané, 1924.',
    'PDF p. 199-203 ; pages imprimées 197-201',
    'https://archive.org/download/lasaintebibletex07fill/lasaintebibletex07fill.pdf',
    'tmp/pdfs/fillion/lasaintebibletex07fill.pdf',
    '36636793eb22df2edfd6675bb5388204e016414f917f99929c1723df9adce608',
    'PRIMARY', 'Corpus Scriptura',
    '{"pilot":"MRK 1:1-20","visual_collation_required":true,"independent_from":"TR0004"}'::jsonb
  ) returning id into provenance_la_id;

  -- Introduction du livre, conservée dans le corps du texte.
  insert into public.bible_source_units (
    source_id, source_unit_key, unit_kind, material_order, surface_key,
    native_folio_raw, native_folio_number, native_folio_status, material_features
  ) values (
    source_fr_id, 'mrk-introduction-auteur-pilot', 'block', 100, 'pdf-0195',
    '193', 193, 'VISIBLE',
    '{"content_role":"introduction_livre","pilot_excerpt":true,"pdf_page_index":195}'::jsonb
  ) returning id into intro_unit_id;

  insert into public.bible_source_unit_texts (
    source_id, unit_id, layer_id, layer_code, text_content, text_features
  ) values (
    source_fr_id, intro_unit_id, layer_fr_id, 'lecture-fidele',
    'Comme nous l’apprend le livre des Actes, XII, 12, la mère de saint Marc vivait à Jérusalem, et sa maison servait de lieu de réunion aux premiers chrétiens. C’est chez elle que saint Pierre se réfugia aussitôt après avoir été miraculeusement délivré de prison par un ange, et ce trait explique l’affection toute paternelle du prince des apôtres pour le jeune Marc, qu’il avait probablement converti et baptisé.',
    '{"printed_heading":"1° La personne de l’auteur","pilot_excerpt":true}'::jsonb
  );

  -- Les unités de verset gardent les références et les pages de l'imprimé.
  for i in 1..20 loop
    insert into public.bible_source_units (
      source_id, source_unit_key, unit_kind, material_order, surface_key,
      native_folio_raw, native_folio_number, native_folio_status, material_features
    ) values (
      source_fr_id, format('mrk-001-%s', lpad(i::text, 3, '0')), 'block', 1000 + i * 100,
      pdf_surfaces[i], printed_pages[i],
      case when i = 13 then null else printed_pages[i]::integer end,
      'VISIBLE',
      jsonb_build_object(
        'native_reference', format('I, %s', i),
        'printed_page', printed_pages[i],
        'pdf_surface', pdf_surfaces[i],
        'split_by_plate', i = 13
      )
    ) returning id into v_unit_id;
    units_fr[i] := v_unit_id;

    insert into public.bible_source_unit_texts (
      source_id, unit_id, layer_id, layer_code, text_content, text_features
    ) values (
      source_fr_id, units_fr[i], layer_fr_id, 'lecture-fidele', fr_text[i],
      jsonb_build_object('native_reference', format('I, %s', i), 'language', 'fr')
    );

    insert into public.bible_source_units (
      source_id, source_unit_key, unit_kind, material_order, surface_key,
      native_folio_raw, native_folio_number, native_folio_status, material_features
    ) values (
      source_la_id, format('mrk-001-%s', lpad(i::text, 3, '0')), 'block', 1000 + i * 100,
      pdf_surfaces[i], printed_pages[i],
      case when i = 13 then null else printed_pages[i]::integer end,
      'VISIBLE',
      jsonb_build_object(
        'native_reference', format('I, %s', i),
        'printed_page', printed_pages[i],
        'pdf_surface', pdf_surfaces[i],
        'split_by_plate', i = 13
      )
    ) returning id into v_unit_id;
    units_la[i] := v_unit_id;

    insert into public.bible_source_unit_texts (
      source_id, unit_id, layer_id, layer_code, text_content, text_features
    ) values (
      source_la_id, units_la[i], layer_la_id, 'lecture-fidele', la_text[i],
      jsonb_build_object('native_reference', format('I, %s', i), 'language', 'la')
    );
  end loop;

  insert into public.bible_native_divisions (
    source_id, division_kind, sequence_no, sequence_in_parent, stable_key,
    label_diplomatic, proposed_book_code, marker_type, marker_status,
    number_status, confidence, requires_review, start_unit_id, end_unit_id,
    validation_status, is_public, notes, metadata
  ) values (
    source_fr_id, 'book', 1, 1, 'mrk', 'ÉVANGILE SELON S. MARC', 'MRK',
    'printed_heading', 'INITIAL_OR_RUBRIC', 'ABSENT', 'high', true,
    intro_unit_id, units_fr[20], 'review', false,
    'Pilote limité à l’introduction (extrait) et à Marc I, 1-20.',
    '{"native_reference":"ÉVANGILE SELON S. MARC","pilot":true}'::jsonb
  ) returning id into book_fr_id;

  insert into public.bible_native_divisions (
    source_id, parent_id, division_kind, sequence_no, sequence_in_parent,
    stable_key, label_diplomatic, proposed_book_code, manuscript_number_raw,
    manuscript_number, marker_type, marker_status, number_status, confidence,
    requires_review, start_unit_id, end_unit_id, validation_status, is_public, metadata
  ) values (
    source_fr_id, book_fr_id, 'chapter', 2, 1, 'mrk-001', 'CHAPITRE I', 'MRK',
    'I', 1, 'printed_heading', 'NUMBER_AND_INITIAL', 'READ', 'high', true,
    units_fr[1], units_fr[20], 'review', false,
    '{"native_reference":"I","pilot":true}'::jsonb
  ) returning id into chapter_fr_id;

  insert into public.bible_native_divisions (
    source_id, division_kind, sequence_no, sequence_in_parent, stable_key,
    label_diplomatic, proposed_book_code, marker_type, marker_status,
    number_status, confidence, requires_review, start_unit_id, end_unit_id,
    validation_status, is_public, notes, metadata
  ) values (
    source_la_id, 'book', 1, 1, 'mrk', 'EVANGELIUM SECUNDUM S. MARCUM', 'MRK',
    'editorial_correspondence', 'TEXTUAL_ALIGNMENT_ONLY', 'ABSENT', 'high', true,
    units_la[1], units_la[20], 'review', false,
    'Intitulé latin descriptif ; le titre de page est français. Pilote limité à Marc I, 1-20.',
    '{"native_reference":"ÉVANGILE SELON S. MARC","pilot":true,"descriptive_latin_label":true}'::jsonb
  ) returning id into book_la_id;

  insert into public.bible_native_divisions (
    source_id, parent_id, division_kind, sequence_no, sequence_in_parent,
    stable_key, label_diplomatic, proposed_book_code, manuscript_number_raw,
    manuscript_number, marker_type, marker_status, number_status, confidence,
    requires_review, start_unit_id, end_unit_id, validation_status, is_public, metadata
  ) values (
    source_la_id, book_la_id, 'chapter', 2, 1, 'mrk-001', 'CHAPITRE I', 'MRK',
    'I', 1, 'printed_heading', 'NUMBER_AND_INITIAL', 'READ', 'high', true,
    units_la[1], units_la[20], 'review', false,
    '{"native_reference":"I","pilot":true,"shared_printed_heading":true}'::jsonb
  ) returning id into chapter_la_id;

  insert into public.bible_editorial_segmentations (
    source_id, segmentation_code, segmentation_kind, version_label,
    base_layer_id, status, is_public, method_note, metadata
  ) values (
    source_fr_id, 'versets-imprimes', 'verse', 'pilote-mrk-1-v1', layer_fr_id,
    'review', false,
    'Segmentation suivant les numéros de verset imprimés par Fillion ; alignement canonique enregistré séparément.',
    '{"native_numbering":"Fillion printed","pilot":true}'::jsonb
  ) returning id into verse_segmentation_fr_id;

  insert into public.bible_editorial_segmentations (
    source_id, segmentation_code, segmentation_kind, version_label,
    base_layer_id, status, is_public, method_note, metadata
  ) values (
    source_la_id, 'versets-imprimes', 'verse', 'pilote-mrk-1-v1', layer_la_id,
    'review', false,
    'Segmentation suivant les numéros de verset imprimés par Fillion ; alignement canonique enregistré séparément.',
    '{"native_numbering":"Fillion printed","pilot":true}'::jsonb
  ) returning id into verse_segmentation_la_id;

  insert into public.bible_editorial_segmentations (
    source_id, segmentation_code, segmentation_kind, version_label,
    base_layer_id, status, is_public, method_note, metadata
  ) values (
    source_fr_id, 'paratexte-corps', 'reading_unit', 'pilote-mrk-1-v1', layer_fr_id,
    'review', false,
    'Introductions et explications de péricope destinées au corps du texte.',
    '{"semantic_styles":["introduction_livre","commentaire_pericope"],"pilot":true}'::jsonb
  ) returning id into body_segmentation_fr_id;

  for i in 1..20 loop
    insert into public.bible_editorial_segments (
      source_id, segmentation_id, segment_key, editorial_sequence,
      native_division_id, editorial_label, editorial_number, metadata
    ) values (
      source_fr_id, verse_segmentation_fr_id,
      format('mrk-001-%s', lpad(i::text, 3, '0')), i, chapter_fr_id,
      format('I, %s', i), i,
      jsonb_build_object('native_reference', format('I, %s', i), 'printed_number', i)
    ) returning id into v_segment_id;
    segments_fr[i] := v_segment_id;

    insert into public.bible_editorial_segment_sources (
      source_id, segmentation_id, segment_id, unit_id, unit_sequence, join_before
    ) values (
      source_fr_id, verse_segmentation_fr_id, segments_fr[i], units_fr[i], 1, 'none'
    );

    insert into public.bible_canonical_alignments (
      source_id, segmentation_id, segment_id, alignment_order, canon_id,
      alignment_status, confidence, verification_status, justification,
      witnesses_used
    ) values (
      source_fr_id, verse_segmentation_fr_id, segments_fr[i], 1, canon_ids[i],
      'MATCH', 'high', 'review',
      format('Le verset imprimé I, %s correspond au créneau canonique MRK 1:%s ; la référence native est conservée indépendamment.', i, i),
      array['Fillion t. VII, 8e éd., 1924']
    );

    insert into public.bible_editorial_segments (
      source_id, segmentation_id, segment_key, editorial_sequence,
      native_division_id, editorial_label, editorial_number, metadata
    ) values (
      source_la_id, verse_segmentation_la_id,
      format('mrk-001-%s', lpad(i::text, 3, '0')), i, chapter_la_id,
      format('I, %s', i), i,
      jsonb_build_object('native_reference', format('I, %s', i), 'printed_number', i)
    ) returning id into v_segment_id;
    segments_la[i] := v_segment_id;

    insert into public.bible_editorial_segment_sources (
      source_id, segmentation_id, segment_id, unit_id, unit_sequence, join_before
    ) values (
      source_la_id, verse_segmentation_la_id, segments_la[i], units_la[i], 1, 'none'
    );

    insert into public.bible_canonical_alignments (
      source_id, segmentation_id, segment_id, alignment_order, canon_id,
      alignment_status, confidence, verification_status, justification,
      witnesses_used
    ) values (
      source_la_id, verse_segmentation_la_id, segments_la[i], 1, canon_ids[i],
      'MATCH', 'high', 'review',
      format('Le verset latin imprimé I, %s correspond au créneau canonique MRK 1:%s ; la référence native est conservée indépendamment.', i, i),
      array['Fillion t. VII, 8e éd., 1924']
    );
  end loop;

  insert into public.bible_editorial_segments (
    source_id, segmentation_id, segment_key, editorial_sequence, native_division_id,
    editorial_label, metadata
  ) values (
    source_fr_id, body_segmentation_fr_id, 'mrk-introduction-auteur-pilot', 1,
    book_fr_id, 'Introduction — 1° La personne de l’auteur',
    '{"native_reference":"Introduction","pilot_excerpt":true}'::jsonb
  ) returning id into intro_segment_id;

  insert into public.bible_editorial_segment_sources (
    source_id, segmentation_id, segment_id, unit_id, unit_sequence, join_before
  ) values (source_fr_id, body_segmentation_fr_id, intro_segment_id, intro_unit_id, 1, 'none');

  insert into public.bible_editorial_body_blocks (
    family_id, member_source_id, source_id, segmentation_id, segment_id,
    block_key, block_kind, scope_kind, placement, applies_to,
    applies_to_member_id, heading, scope_book_code, scope_label,
    native_scope, printed_reference, printed_page_start, printed_page_end,
    material_order, classification_confidence, requires_review,
    validation_status, is_public, metadata
  ) values (
    v_family_id, member_source_fr_id, source_fr_id, body_segmentation_fr_id,
    intro_segment_id, 'mrk-introduction-auteur-pilot', 'introduction', 'book',
    'before', 'member', member_fr_id, 'Introduction — 1° La personne de l’auteur',
    'MRK', 'Évangile selon saint Marc', '{"printed_scope":"Introduction"}'::jsonb,
    'Introduction', '193', '193', 100, 'high', true, 'review', false,
    '{"semantic_style":"introduction_livre","pilot_excerpt":true}'::jsonb
  );

  -- Explications de péricope : elles précèdent leur plage dans le corps.
  insert into public.bible_source_units (source_id, source_unit_key, unit_kind, material_order, surface_key, native_folio_raw, native_folio_number, native_folio_status, material_features)
  values (source_fr_id, 'mrk-commentaire-001-008-pilot', 'block', 200, 'pdf-0199', '197', 197, 'VISIBLE', '{"content_role":"commentaire_pericope","pilot_excerpt":true}'::jsonb)
  returning id into body_unit_id;
  insert into public.bible_source_unit_texts (source_id, unit_id, layer_id, layer_code, text_content, text_features)
  values (source_fr_id, body_unit_id, layer_fr_id, 'lecture-fidele', 'Le précurseur fait son apparition. I, 1-8. Cf. Matth. III, 1-12 ; Luc. III, 1-18. En comparant la narration de notre évangéliste avec les deux autres, on voit, d’une part, à quel point il abrège dès ses premières lignes, surtout en ce qui concerne les paroles, et, d’autre part, combien il est exact et complet quand même pour ce qui regarde les faits.', '{"pilot_excerpt":true}'::jsonb);
  insert into public.bible_editorial_segments (source_id, segmentation_id, segment_key, editorial_sequence, native_division_id, editorial_label, metadata)
  values (source_fr_id, body_segmentation_fr_id, 'mrk-commentaire-001-008-pilot', 2, chapter_fr_id, 'Le précurseur fait son apparition', '{"native_reference":"I, 1-8","pilot_excerpt":true}'::jsonb)
  returning id into body_segment_id;
  insert into public.bible_editorial_segment_sources (source_id, segmentation_id, segment_id, unit_id, unit_sequence, join_before)
  values (source_fr_id, body_segmentation_fr_id, body_segment_id, body_unit_id, 1, 'none');
  insert into public.bible_editorial_body_blocks (family_id, member_source_id, source_id, segmentation_id, segment_id, block_key, block_kind, scope_kind, placement, applies_to, applies_to_member_id, heading, scope_book_code, scope_label, canon_id_start, canon_id_end, native_scope, printed_reference, printed_page_start, printed_page_end, material_order, classification_confidence, requires_review, validation_status, is_public, metadata)
  values (v_family_id, member_source_fr_id, source_fr_id, body_segmentation_fr_id, body_segment_id, 'mrk-commentaire-001-008-pilot', 'commentary', 'pericope', 'before', 'member', member_fr_id, 'Le précurseur fait son apparition', 'MRK', 'Marc 1, 1-8', canon_ids[1], canon_ids[8], '{"printed_scope":"I, 1-8"}'::jsonb, 'I, 1-8', '197', '198', 200, 'high', true, 'review', false, '{"semantic_style":"commentaire_pericope","pilot_excerpt":true}'::jsonb);

  insert into public.bible_source_units (source_id, source_unit_key, unit_kind, material_order, surface_key, native_folio_raw, native_folio_number, native_folio_status, material_features)
  values (source_fr_id, 'mrk-commentaire-009-011-pilot', 'block', 1850, 'pdf-0201', '199', 199, 'VISIBLE', '{"content_role":"commentaire_pericope","pilot_excerpt":true}'::jsonb)
  returning id into body_unit_id;
  insert into public.bible_source_unit_texts (source_id, unit_id, layer_id, layer_code, text_content, text_features)
  values (source_fr_id, body_unit_id, layer_fr_id, 'lecture-fidele', 'Le baptême de Jésus. I, 9-11. Cf. Matth. III, 13-17 ; Luc. III, 21-22. Le récit de saint Marc se rapproche beaucoup de celui de saint Luc ; ils ont cependant l’un et l’autre leurs particularités.', '{"pilot_excerpt":true}'::jsonb);
  insert into public.bible_editorial_segments (source_id, segmentation_id, segment_key, editorial_sequence, native_division_id, editorial_label, metadata)
  values (source_fr_id, body_segmentation_fr_id, 'mrk-commentaire-009-011-pilot', 3, chapter_fr_id, 'Le baptême de Jésus', '{"native_reference":"I, 9-11","pilot_excerpt":true}'::jsonb)
  returning id into body_segment_id;
  insert into public.bible_editorial_segment_sources (source_id, segmentation_id, segment_id, unit_id, unit_sequence, join_before)
  values (source_fr_id, body_segmentation_fr_id, body_segment_id, body_unit_id, 1, 'none');
  insert into public.bible_editorial_body_blocks (family_id, member_source_id, source_id, segmentation_id, segment_id, block_key, block_kind, scope_kind, placement, applies_to, applies_to_member_id, heading, scope_book_code, scope_label, canon_id_start, canon_id_end, native_scope, printed_reference, printed_page_start, printed_page_end, material_order, classification_confidence, requires_review, validation_status, is_public, metadata)
  values (v_family_id, member_source_fr_id, source_fr_id, body_segmentation_fr_id, body_segment_id, 'mrk-commentaire-009-011-pilot', 'commentary', 'pericope', 'before', 'member', member_fr_id, 'Le baptême de Jésus', 'MRK', 'Marc 1, 9-11', canon_ids[9], canon_ids[11], '{"printed_scope":"I, 9-11"}'::jsonb, 'I, 9-11', '199', '199', 300, 'high', true, 'review', false, '{"semantic_style":"commentaire_pericope","pilot_excerpt":true}'::jsonb);

  insert into public.bible_source_units (source_id, source_unit_key, unit_kind, material_order, surface_key, native_folio_raw, native_folio_number, native_folio_status, material_features)
  values (source_fr_id, 'mrk-commentaire-012-013-pilot', 'block', 2150, 'pdf-0201', '199', 199, 'VISIBLE', '{"content_role":"commentaire_pericope","pilot_excerpt":true}'::jsonb)
  returning id into body_unit_id;
  insert into public.bible_source_unit_texts (source_id, unit_id, layer_id, layer_code, text_content, text_features)
  values (source_fr_id, body_unit_id, layer_fr_id, 'lecture-fidele', 'La tentation du Christ. I, 12-13. Cf. Matth. IV, 1-11 ; Luc. IV, 1-13. Tandis que les deux autres synoptiques racontent assez longuement cet épisode, saint Marc abrège considérablement et se contente d’esquisser les contours généraux, sans entrer dans le détail.', '{"pilot_excerpt":true}'::jsonb);
  insert into public.bible_editorial_segments (source_id, segmentation_id, segment_key, editorial_sequence, native_division_id, editorial_label, metadata)
  values (source_fr_id, body_segmentation_fr_id, 'mrk-commentaire-012-013-pilot', 4, chapter_fr_id, 'La tentation du Christ', '{"native_reference":"I, 12-13","pilot_excerpt":true}'::jsonb)
  returning id into body_segment_id;
  insert into public.bible_editorial_segment_sources (source_id, segmentation_id, segment_id, unit_id, unit_sequence, join_before)
  values (source_fr_id, body_segmentation_fr_id, body_segment_id, body_unit_id, 1, 'none');
  insert into public.bible_editorial_body_blocks (family_id, member_source_id, source_id, segmentation_id, segment_id, block_key, block_kind, scope_kind, placement, applies_to, applies_to_member_id, heading, scope_book_code, scope_label, canon_id_start, canon_id_end, native_scope, printed_reference, printed_page_start, printed_page_end, material_order, classification_confidence, requires_review, validation_status, is_public, metadata)
  values (v_family_id, member_source_fr_id, source_fr_id, body_segmentation_fr_id, body_segment_id, 'mrk-commentaire-012-013-pilot', 'commentary', 'pericope', 'before', 'member', member_fr_id, 'La tentation du Christ', 'MRK', 'Marc 1, 12-13', canon_ids[12], canon_ids[13], '{"printed_scope":"I, 12-13"}'::jsonb, 'I, 12-13', '199', '201', 400, 'high', true, 'review', false, '{"semantic_style":"commentaire_pericope","pilot_excerpt":true}'::jsonb);

  insert into public.bible_source_units (source_id, source_unit_key, unit_kind, material_order, surface_key, native_folio_raw, native_folio_number, native_folio_status, material_features)
  values (source_fr_id, 'mrk-commentaire-014-015-pilot', 'block', 2350, 'pdf-0203', '201', 201, 'VISIBLE', '{"content_role":"commentaire_pericope","pilot_excerpt":true}'::jsonb)
  returning id into body_unit_id;
  insert into public.bible_source_unit_texts (source_id, unit_id, layer_id, layer_code, text_content, text_features)
  values (source_fr_id, body_unit_id, layer_fr_id, 'lecture-fidele', 'Jésus dans la Galilée orientale. I, 14-VII, 23. Les premières actions d’éclat de Jésus. I, 14-45. Il revient en Galilée et commence à prêcher. I, 14-15.', '{"pilot_excerpt":true}'::jsonb);
  insert into public.bible_editorial_segments (source_id, segmentation_id, segment_key, editorial_sequence, native_division_id, editorial_label, metadata)
  values (source_fr_id, body_segmentation_fr_id, 'mrk-commentaire-014-015-pilot', 5, chapter_fr_id, 'Il revient en Galilée et commence à prêcher', '{"native_reference":"I, 14-15","pilot_excerpt":true}'::jsonb)
  returning id into body_segment_id;
  insert into public.bible_editorial_segment_sources (source_id, segmentation_id, segment_id, unit_id, unit_sequence, join_before)
  values (source_fr_id, body_segmentation_fr_id, body_segment_id, body_unit_id, 1, 'none');
  insert into public.bible_editorial_body_blocks (family_id, member_source_id, source_id, segmentation_id, segment_id, block_key, block_kind, scope_kind, placement, applies_to, applies_to_member_id, heading, scope_book_code, scope_label, canon_id_start, canon_id_end, native_scope, printed_reference, printed_page_start, printed_page_end, material_order, classification_confidence, requires_review, validation_status, is_public, metadata)
  values (v_family_id, member_source_fr_id, source_fr_id, body_segmentation_fr_id, body_segment_id, 'mrk-commentaire-014-015-pilot', 'commentary', 'pericope', 'before', 'member', member_fr_id, 'Il revient en Galilée et commence à prêcher', 'MRK', 'Marc 1, 14-15', canon_ids[14], canon_ids[15], '{"printed_scope":"I, 14-15"}'::jsonb, 'I, 14-15', '201', '201', 500, 'high', true, 'review', false, '{"semantic_style":"commentaire_pericope","pilot_excerpt":true}'::jsonb);

  insert into public.bible_source_units (source_id, source_unit_key, unit_kind, material_order, surface_key, native_folio_raw, native_folio_number, native_folio_status, material_features)
  values (source_fr_id, 'mrk-commentaire-016-020-pilot', 'block', 2550, 'pdf-0203', '201', 201, 'VISIBLE', '{"content_role":"commentaire_pericope","pilot_excerpt":true}'::jsonb)
  returning id into body_unit_id;
  insert into public.bible_source_unit_texts (source_id, unit_id, layer_id, layer_code, text_content, text_features)
  values (source_fr_id, body_unit_id, layer_fr_id, 'lecture-fidele', 'Les quatre premiers disciples. I, 16-20. Comp. Matth. IV, 18-22 ; Luc. V, 1-11. La narration de saint Marc est presque identique à celle de saint Matthieu.', '{"pilot_excerpt":true}'::jsonb);
  insert into public.bible_editorial_segments (source_id, segmentation_id, segment_key, editorial_sequence, native_division_id, editorial_label, metadata)
  values (source_fr_id, body_segmentation_fr_id, 'mrk-commentaire-016-020-pilot', 6, chapter_fr_id, 'Les quatre premiers disciples', '{"native_reference":"I, 16-20","pilot_excerpt":true}'::jsonb)
  returning id into body_segment_id;
  insert into public.bible_editorial_segment_sources (source_id, segmentation_id, segment_id, unit_id, unit_sequence, join_before)
  values (source_fr_id, body_segmentation_fr_id, body_segment_id, body_unit_id, 1, 'none');
  insert into public.bible_editorial_body_blocks (family_id, member_source_id, source_id, segmentation_id, segment_id, block_key, block_kind, scope_kind, placement, applies_to, applies_to_member_id, heading, scope_book_code, scope_label, canon_id_start, canon_id_end, native_scope, printed_reference, printed_page_start, printed_page_end, material_order, classification_confidence, requires_review, validation_status, is_public, metadata)
  values (v_family_id, member_source_fr_id, source_fr_id, body_segmentation_fr_id, body_segment_id, 'mrk-commentaire-016-020-pilot', 'commentary', 'pericope', 'before', 'member', member_fr_id, 'Les quatre premiers disciples', 'MRK', 'Marc 1, 16-20', canon_ids[16], canon_ids[20], '{"printed_scope":"I, 16-20"}'::jsonb, 'I, 16-20', '201', '201', 600, 'high', true, 'review', false, '{"semantic_style":"commentaire_pericope","pilot_excerpt":true}'::jsonb);

  -- Exemple de note attachée au verset 1 et ancrée sur les deux membres.
  insert into public.bible_verse_notes (
    family_id, member_source_id, source_id, note_key, applies_to,
    note_subtype, canon_id, native_reference_raw, printed_marker,
    display_chapter_key, display_number, printed_page, material_order,
    validation_status, is_public, metadata
  ) values (
    v_family_id, member_source_fr_id, source_fr_id, 'mrk-001-001-note-01-pilot',
    'family', 'exegetical', canon_ids[1], 'I, 1', '1', 'MRK.1', 1,
    '197', 1101, 'review', false,
    '{"pilot_excerpt":true,"anchor_policy":"latin_and_french"}'::jsonb
  ) returning id into verse_note_id;

  insert into public.bible_verse_note_blocks (
    note_id, block_id, rank, kind, form, language, text_content, needs_review, metadata
  ) values
  (verse_note_id, 'lemma-la', 1, 'lemma', 'prose', 'la',
   'Initium evangelii Jesu Christi, Filii Dei.', false,
   '{"source_member":"TR0011"}'::jsonb),
  (verse_note_id, 'commentaire-fr', 2, 'commentary', 'prose', 'fr',
   'Le titre. Passage propre à saint Marc. Plusieurs opinions se sont formées dès les temps anciens, au sujet de l’enchaînement logique et grammatical de ce verset avec les trois suivants.', true,
   '{"pilot_excerpt":true,"source_member":"TR0010"}'::jsonb);

  insert into public.bible_verse_note_anchors (
    family_id, note_id, canon_id, anchor_key, target_member_id,
    target_source_id, target_segmentation_id, target_segment_id,
    native_reference_raw, marker, anchor_text_left, validation_status, metadata
  ) values
  (v_family_id, verse_note_id, canon_ids[1], 'latin', member_la_id,
   source_la_id, verse_segmentation_la_id, segments_la[1], 'I, 1', '1',
   'Initium evangelii Jesu Christi, Filii Dei.', 'review',
   '{"language":"la"}'::jsonb),
  (v_family_id, verse_note_id, canon_ids[1], 'francais', member_fr_id,
   source_fr_id, verse_segmentation_fr_id, segments_fr[1], 'I, 1', '1',
   'Commencement de l’évangile de Jésus-Christ, Fils de Dieu.', 'review',
   '{"language":"fr"}'::jsonb);

  -- Illustration du Jourdain : association proposée après Marc I, 9.
  insert into public.bible_edition_assets (
    family_id, member_source_id, source_id, provenance_id, asset_key,
    asset_kind, applies_to, printed_caption, editorial_caption, alt_text,
    printed_page, source_page_index, source_crop_box, detected_automatically,
    detection_profile, material_order, placement, semantic_scope_kind,
    scope_book_code, canon_id_start, classification_confidence,
    requires_review, validation_status, is_public, metadata
  ) values (
    v_family_id, member_source_fr_id, source_fr_id, provenance_fr_id,
    'fillion-t07-p0202-i01', 'illustration', 'family',
    'Le Jourdain, à l’endroit présumé où saint Jean baptisait. (D’après une photographie.)',
    'Le Jourdain au lieu traditionnel du baptême de saint Jean',
    'Vue ancienne du Jourdain bordé d’arbres, au lieu traditionnel associé au baptême de saint Jean.',
    '[200], planche entre les pages imprimées 199 et 201', 202,
    '{"coordinate_space":"rendered_source_page_px","page_width_px":2450,"page_height_px":4084,"left":350,"top":577,"right":2037,"bottom":3397,"normalized":[0.14285714,0.14128306,0.83142857,0.83178257]}'::jsonb,
    true, 'fillion-illustration@1.1.0', 1901, 'after', 'verse', 'MRK', canon_ids[9],
    'high', true, 'review', false,
    '{"association_rationale":"La légende mentionne le baptême de saint Jean au Jourdain ; Marc I, 9 est le verset proche le plus directement pertinent.","printed_page_number_status":"inferred","web_candidate":{"sha256":"29581e2efb7da0a5162cd44c9dd9cfaccc1b782c414b9bdfc2fac43ed06df675","width_px":1600,"height_px":957,"byte_size":649688,"validation_status":"review","uploaded":false}}'::jsonb
  ) returning id into asset_id;

  insert into public.bible_edition_asset_files (
    family_id, asset_id, variant_role, storage_bucket, storage_path,
    public_uri, mime_type, width_px, height_px, byte_size, sha256,
    source_sha256, color_space, bit_depth, dpi_x, dpi_y,
    processing_profile, processing_version, processing_parameters,
    validation_status, is_public
  ) values (
    v_family_id, asset_id, 'master', 'bible-illustrations-master',
    'fillion/t07/mrk/1/fillion-t07-p0202-i01/master.png', null,
    'image/png', 2820, 1687, 1463382,
    '4e6cec8d83d15a176dcd438fac73f69cf0d16bd06c7c7f4c580d7ca98e3144ea',
    '36636793eb22df2edfd6675bb5388204e016414f917f99929c1723df9adce608',
    'gray', 8, 400, 400, 'fillion-illustration', '1.1.0',
    '{"analysis_dpi":120,"source_dpi":400,"auto_rotation_degrees":-90,"auto_rotation_rule":"full_page_no_ocr_clockwise","background_normalization_blur_radius_px":168.7,"autocontrast_percentiles":[0.25,99.25],"isolated_speckle_max_area_px":64,"isolated_speckles_removed":47,"paper_white_threshold":230,"content_trim_box_px":[0,0,2820,1687]}'::jsonb,
    'review', false
  );

  insert into public.bible_provenance_links (source_id, provenance_id, role, unit_id)
  select source_fr_id, provenance_fr_id, 'source', id
  from public.bible_source_units where source_id = source_fr_id;

  insert into public.bible_provenance_links (source_id, provenance_id, role, unit_id)
  select source_la_id, provenance_la_id, 'source', id
  from public.bible_source_units where source_id = source_la_id;

  insert into public.bible_provenance_links (source_id, provenance_id, role, alignment_id)
  select source_fr_id, provenance_fr_id, 'evidence', id
  from public.bible_canonical_alignments where source_id = source_fr_id;

  insert into public.bible_provenance_links (source_id, provenance_id, role, alignment_id)
  select source_la_id, provenance_la_id, 'evidence', id
  from public.bible_canonical_alignments where source_id = source_la_id;

  update public.bible_edition_families
  set metadata = metadata || jsonb_build_object(
    'pilot', jsonb_build_object(
      'book_code', 'MRK',
      'native_reference_range', 'I, 1-20',
      'status', 'review_private',
      'illustration_asset_key', 'fillion-t07-p0202-i01',
      'updated_at', now()
    )
  ), updated_at = now()
  where id = v_family_id;
end
$fillion_marc1$;

commit;
