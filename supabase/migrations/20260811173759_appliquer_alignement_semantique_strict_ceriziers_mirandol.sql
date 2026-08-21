begin;

create or replace function public.appliquer_alignement_semantique_strict_ceriziers_mirandol(
  p_payload jsonb,
  p_payload_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
set statement_timeout = '180s'
as $$
declare
  v_work_id constant text := 'A0064O0001';
  v_cer_id constant text := 'TXT_A0064O0001_FR_1646_CERIZIERS';
  v_mir_id constant text := 'TXT_A0064O0001_FR_1861_MIRANDOL';
  v_set_id constant text := 'ALNSET-A0064O0001-MIR1861-CER1646';
  v_groups integer := jsonb_array_length(p_payload->'alignments');
  v_members integer := jsonb_array_length(p_payload->'alignment_members');
  v_segments integer := jsonb_array_length(p_payload->'segments');
  v_scoped integer := (p_payload#>>'{after,ceriziers_alignment_scope}')::integer;
  v_reviewed integer := (p_payload#>>'{after,reviewed_ai_groups}')::integer;
  v_uncertain integer := (p_payload#>>'{after,uncertain_groups}')::integer;
  v_split_parents integer := (p_payload#>>'{after,split_parent_segments}')::integer;
  v_new_children integer := (p_payload#>>'{after,new_child_segments}')::integer;
  v_existing_hash text;
  v_hash text;
  v_affected integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('boece-ceriziers-strict-same-latin-span-v2', 0));

  if p_payload_sha256 is null or p_payload_sha256 !~ '^[0-9A-Fa-f]{64}$' then
    raise exception 'Empreinte du payload strict invalide';
  end if;
  if p_payload->>'schema' <> 'boece-ceriziers-strict-supabase-import-payload-v1'
     or p_payload->>'id_oeuvre' <> v_work_id
     or p_payload->>'id_texte' <> v_cer_id
     or p_payload->>'reference_text_id' <> v_mir_id
     or p_payload->>'alignment_set_id' <> v_set_id
     or p_payload->>'doctrine' <> 'strict_same_latin_span'
     or (p_payload->>'alignment_version')::integer <> 2
     or coalesce((p_payload->>'validated_human')::boolean, true) then
    raise exception 'Payload hors périmètre ou doctrine invalide';
  end if;
  if v_segments <= 1880 or v_scoped <> v_segments - 59
     or v_members <> 1895 + v_scoped
     or v_groups <= 0 or v_reviewed + v_uncertain <> v_groups
     or v_new_children <> v_segments - 1880
     or v_split_parents <= 0
     or jsonb_array_length(p_payload->'note_anchors') <> 4 then
    raise exception 'Comptages dynamiques du payload strict invalides';
  end if;
  if (select count(*) from jsonb_to_recordset(p_payload->'segments') as x(nature text) where x.nature = 'vers') <> 1213
     or (select count(*) from jsonb_to_recordset(p_payload->'segments') as x(strict_parent_key text) where x.strict_parent_key is not null) <> v_segments
     or (select count(distinct x.strict_parent_key) from jsonb_to_recordset(p_payload->'segments') as x(strict_parent_key text)) <> 1880
     or exists (
       select 1 from jsonb_to_recordset(p_payload->'segments') as x(nature text, strict_child_count integer)
       where x.nature = 'vers' and x.strict_child_count > 1
     )
     or exists (
       select 1 from jsonb_to_recordset(p_payload->'alignments') as x(status text, metadata jsonb)
       where x.status not in ('reviewed_ai', 'uncertain')
          or coalesce((x.metadata->>'validated_human')::boolean, true)
          or (x.status = 'reviewed_ai' and x.metadata->>'latin_start_token' is null)
     ) then
    raise exception 'Segmentation, vers ou statuts stricts invalides';
  end if;
  if (select count(distinct (x.book, x.canonical_division_order)) from jsonb_to_recordset(p_payload->'alignments') as x(book integer, canonical_division_order integer)) <> 78
     or (select count(*) from jsonb_to_recordset(p_payload->'alignment_members') as x(role text) where x.role = 'reference') <> 1895
     or (select count(distinct x.segment_key) from jsonb_to_recordset(p_payload->'alignment_members') as x(role text, segment_key text) where x.role = 'reference') <> 1895
     or (select count(*) from jsonb_to_recordset(p_payload->'alignment_members') as x(role text) where x.role = 'aligned') <> v_scoped
     or (select count(distinct x.segment_key) from jsonb_to_recordset(p_payload->'alignment_members') as x(role text, segment_key text) where x.role = 'aligned') <> v_scoped then
    raise exception 'Couverture stricte des deux témoins invalide';
  end if;

  select metadata->>'strict_alignment_payload_sha256' into v_existing_hash
  from public.oeuvre_textes where id_texte = v_cer_id;
  if upper(coalesce(v_existing_hash, '')) = upper(p_payload_sha256)
     and (select count(*) from public.segments where id_texte = v_cer_id) = v_segments
     and (select count(*) from public.texte_alignements where alignment_set_id = v_set_id) = v_groups
     and (select count(*) from public.texte_alignement_membres where alignment_set_id = v_set_id) = v_members
     and (select count(*) from public.liens_bibliques l join public.segments s on s.id = l.segment_id where s.id_texte = v_cer_id) = 20 then
    return jsonb_build_object(
      'status', 'ALREADY_IMPORTED_STRICT', 'payload_sha256', upper(p_payload_sha256),
      'segments', v_segments, 'groups', v_groups, 'members', v_members
    );
  end if;

  if (select count(*) from public.segments where id_texte = v_cer_id) <> 1880
     or (select count(*) from public.segments where id_texte = v_cer_id and coalesce((segment_metadata->>'alignment_scope')::boolean, false)) <> 1821
     or (select count(*) from public.segments where id_texte = v_cer_id and nature = 'vers') <> 1213
     or (select count(*) from public.oeuvre_texte_unites where id_texte = v_cer_id) <> 209
     or (select count(*) from public.texte_notes where id_texte = v_cer_id) <> 4
     or (select count(*) from public.texte_note_blocs where id_texte = v_cer_id) <> 4
     or (select count(*) from public.texte_note_ancres where id_texte = v_cer_id) <> 4
     or (select count(*) from public.liens_bibliques l join public.segments s on s.id = l.segment_id where s.id_texte = v_cer_id) <> 20
     or (select count(*) from public.texte_alignements where alignment_set_id = v_set_id) <> 936
     or (select count(*) from public.texte_alignement_membres where alignment_set_id = v_set_id) <> 3716
     or not exists (select 1 from public.oeuvre_textes where id_texte = v_cer_id and is_public is false and statut = 'review' and is_default is false) then
    raise exception 'Garde de l''état vivant Ceriziers refusée';
  end if;
  if (select count(*) from public.segments where id_texte = v_mir_id) <> 1896
     or (select count(*) from public.oeuvre_texte_unites where id_texte = v_mir_id) <> 475
     or (select count(*) from public.texte_notes where id_texte = v_mir_id) <> 138
     or (select count(*) from public.texte_note_blocs where id_texte = v_mir_id) <> 554
     or (select count(*) from public.texte_note_relations where id_texte = v_mir_id) <> 161
     or (select count(*) from public.texte_note_ancres where id_texte = v_mir_id) <> 138
     or (select count(*) from public.liens_bibliques l join public.segments s on s.id = l.segment_id where s.id_texte = v_mir_id) <> 20
     or not exists (select 1 from public.oeuvre_textes where id_texte = v_mir_id and is_public is true and statut = 'published') then
    raise exception 'Garde de l''état vivant Mirandol refusée';
  end if;

  select upper(encode(extensions.digest(convert_to(string_agg(
    concat_ws(chr(31), segment_key, segment_numero::text, coalesce(segment_texte,''), coalesce(join_before,''),
      coalesce(source_unit_id,''), coalesce(source_start_offset_unicode::text,''), coalesce(source_end_offset_unicode::text,''),
      coalesce(paragraphe::text,''), coalesce(rang::text,''), coalesce(nature,''), coalesce(espace_textuel,'')),
    chr(30) order by segment_numero), 'UTF8'), 'sha256'), 'hex')) into v_hash
  from public.segments where id_texte = v_cer_id;
  if v_hash <> upper(p_payload#>>'{before,logical_fingerprints,ceriziers_segments}') then raise exception 'Empreinte Ceriziers avant divergente'; end if;
  select upper(encode(extensions.digest(convert_to(string_agg(
    concat_ws(chr(31), segment_key, segment_numero::text, coalesce(segment_texte,''), coalesce(texte_original,''),
      coalesce(join_before,''), coalesce(source_unit_id,''), coalesce(paragraphe::text,''), coalesce(rang::text,'')),
    chr(30) order by segment_numero), 'UTF8'), 'sha256'), 'hex')) into v_hash
  from public.segments where id_texte = v_mir_id;
  if v_hash <> upper(p_payload#>>'{before,logical_fingerprints,mirandol_segments_text_latin}') then raise exception 'Empreinte Mirandol avant divergente'; end if;
  select upper(encode(extensions.digest(convert_to(string_agg(
    concat_ws(chr(31), alignment_id, book::text, canonical_division_order::text, group_order::text, cardinality,
      status, coalesce(confidence::text,''), coalesce(method,''), coalesce(justification,''), metadata::text),
    chr(30) order by book, canonical_division_order, group_order), 'UTF8'), 'sha256'), 'hex')) into v_hash
  from public.texte_alignements where alignment_set_id = v_set_id;
  if v_hash <> upper(p_payload#>>'{before,logical_fingerprints,alignment_groups}') then raise exception 'Empreinte groupes candidats divergente'; end if;
  select upper(encode(extensions.digest(convert_to(string_agg(
    concat_ws(chr(31), alignment_id, role, member_order::text, id_texte, segment_key, metadata::text),
    chr(30) order by alignment_id, role, member_order), 'UTF8'), 'sha256'), 'hex')) into v_hash
  from public.texte_alignement_membres where alignment_set_id = v_set_id;
  if v_hash <> upper(p_payload#>>'{before,logical_fingerprints,alignment_members}') then raise exception 'Empreinte membres candidats divergente'; end if;
  select upper(encode(extensions.digest(convert_to(string_agg(
    concat_ws(chr(31), l.id::text, coalesce(l.canon_id,''), coalesce(l.verset_v2_id::text,''), coalesce(l.livre,''),
      coalesce(l.chapitre::text,''), l.type::text, coalesce(l.fiabilite,''), coalesce(l.motif,''),
      coalesce(l.provenance,''), coalesce(l.arbitrage_requis::text,'')), chr(30) order by l.id), 'UTF8'), 'sha256'), 'hex')) into v_hash
  from public.liens_bibliques l join public.segments s on s.id = l.segment_id where s.id_texte = v_cer_id;
  if v_hash <> upper(p_payload#>>'{before,logical_fingerprints,ceriziers_links_properties}') then raise exception 'Empreinte propriétés des liens Ceriziers divergente'; end if;

  if exists (
    select 1
    from public.segments current
    left join (
      select x.strict_parent_key, string_agg(x.segment_texte, '' order by x.strict_child_index) as recomposed
      from jsonb_to_recordset(p_payload->'segments') as x(strict_parent_key text, strict_child_index integer, segment_texte text)
      group by x.strict_parent_key
    ) proposed on proposed.strict_parent_key = current.segment_key
    where current.id_texte = v_cer_id and (proposed.strict_parent_key is null or proposed.recomposed is distinct from current.segment_texte)
  ) then
    raise exception 'Le payload ne recompose pas exactement le texte Ceriziers vivant';
  end if;

  delete from public.texte_alignements where alignment_set_id = v_set_id;
  update public.segments set segment_numero = segment_numero + 100000 where id_texte = v_cer_id;

  update public.segments as target
  set segment_numero = x.segment_numero,
      segment_texte = x.segment_texte,
      paragraphe = x.paragraphe,
      rang = x.rang,
      source_start_offset_unicode = x.source_start_offset_unicode,
      source_end_offset_unicode = x.source_end_offset_unicode,
      join_before = x.join_before,
      segment_metadata = x.segment_metadata
  from jsonb_to_recordset(p_payload->'segments') as x(
    segment_numero integer, segment_texte text, paragraphe integer, rang integer,
    source_start_offset_unicode integer, source_end_offset_unicode integer, join_before text,
    segment_metadata jsonb, segment_key text, strict_is_new boolean
  )
  where x.strict_is_new is false and target.id_texte = v_cer_id and target.segment_key = x.segment_key;
  get diagnostics v_affected = row_count;
  if v_affected <> 1880 then raise exception 'Mise à jour des segments parents incomplète: %', v_affected; end if;

  insert into public.segments(
    id, id_oeuvre, segment_numero, segment_texte,
    ref_niv1, ref_niv2, ref_niv3, ref_niv4, ref_niv5,
    ref_niv1_texte, ref_niv2_texte, ref_niv3_texte, ref_niv4_texte, ref_niv5_texte,
    lien_1, lien_2, lien_3, lien_4, fiabilite, nature, reference_manuelle, verifies,
    texte_original, notes, marquage_source, marquage_date, commentaire_ia, liens_revus_le, liens_revus_par,
    paragraphe, rang, controle_rang_manuel, controle_verifie, controle_verifie_le, page,
    id_texte, segment_key, source_unit_id, espace_textuel,
    source_start_offset_unicode, source_end_offset_unicode, join_before, segment_metadata
  )
  select nextval(pg_get_serial_sequence('public.segments', 'id')),
    parent.id_oeuvre, x.segment_numero, x.segment_texte,
    parent.ref_niv1, parent.ref_niv2, parent.ref_niv3, parent.ref_niv4, parent.ref_niv5,
    parent.ref_niv1_texte, parent.ref_niv2_texte, parent.ref_niv3_texte, parent.ref_niv4_texte, parent.ref_niv5_texte,
    parent.lien_1, parent.lien_2, parent.lien_3, parent.lien_4, parent.fiabilite, parent.nature,
    parent.reference_manuelle, parent.verifies, parent.texte_original, parent.notes,
    parent.marquage_source, parent.marquage_date, parent.commentaire_ia, parent.liens_revus_le, parent.liens_revus_par,
    x.paragraphe, x.rang, parent.controle_rang_manuel, parent.controle_verifie, parent.controle_verifie_le, parent.page,
    parent.id_texte, x.segment_key, parent.source_unit_id, parent.espace_textuel,
    x.source_start_offset_unicode, x.source_end_offset_unicode, x.join_before, x.segment_metadata
  from jsonb_to_recordset(p_payload->'segments') as x(
    segment_numero integer, segment_texte text, paragraphe integer, rang integer,
    source_start_offset_unicode integer, source_end_offset_unicode integer, join_before text,
    segment_metadata jsonb, segment_key text, strict_parent_key text, strict_is_new boolean
  )
  join public.segments parent on parent.id_texte = v_cer_id and parent.segment_key = x.strict_parent_key
  where x.strict_is_new is true;
  get diagnostics v_affected = row_count;
  if v_affected <> v_new_children then raise exception 'Insertion des segments enfants incomplète: %/%', v_affected, v_new_children; end if;

  update public.texte_note_ancres as target
  set segment_numero = x.segment_numero
  from jsonb_to_recordset(p_payload->'note_anchors') as x(anchor_id text, segment_numero integer)
  where target.id_texte = v_cer_id and target.anchor_id = x.anchor_id;
  get diagnostics v_affected = row_count;
  if v_affected <> 4 then raise exception 'Recalcul des quatre ancres incomplet'; end if;

  update public.liens_bibliques as target
  set segment_id = destination.id
  from jsonb_to_recordset(p_payload->'link_reanchors') as x(link_id bigint, old_segment_id bigint, new_segment_key text)
  join public.segments destination on destination.id_texte = v_cer_id and destination.segment_key = x.new_segment_key
  where target.id = x.link_id and target.segment_id = x.old_segment_id;
  get diagnostics v_affected = row_count;
  if v_affected <> jsonb_array_length(p_payload->'link_reanchors') then raise exception 'Réancrage des liens incomplet: %', v_affected; end if;

  insert into public.texte_alignements(
    alignment_id, alignment_set_id, book, canonical_division_order, group_order,
    cardinality, status, confidence, method, justification, metadata
  )
  select x.alignment_id, x.alignment_set_id, x.book, x.canonical_division_order, x.group_order,
    x.cardinality, x.status, x.confidence, x.method, x.justification, x.metadata
  from jsonb_to_recordset(p_payload->'alignments') as x(
    alignment_id text, alignment_set_id text, book integer, canonical_division_order integer,
    group_order integer, cardinality text, status text, confidence numeric,
    method text, justification text, metadata jsonb
  );
  get diagnostics v_affected = row_count;
  if v_affected <> v_groups then raise exception 'Insertion des groupes stricts incomplète'; end if;

  insert into public.texte_alignement_membres(
    alignment_set_id, alignment_id, role, member_order, id_texte, segment_key, metadata
  )
  select x.alignment_set_id, x.alignment_id, x.role, x.member_order, x.id_texte, x.segment_key, x.metadata
  from jsonb_to_recordset(p_payload->'alignment_members') as x(
    alignment_set_id text, alignment_id text, role text, member_order integer,
    id_texte text, segment_key text, metadata jsonb
  );
  get diagnostics v_affected = row_count;
  if v_affected <> v_members then raise exception 'Insertion des membres stricts incomplète'; end if;

  update public.texte_alignement_ensembles
  set status = p_payload#>>'{alignment_set_update,status}',
      method = p_payload#>>'{alignment_set_update,method}',
      metadata = coalesce(metadata, '{}'::jsonb)
        || coalesce(p_payload#>'{alignment_set_update,metadata}', '{}'::jsonb)
        || jsonb_build_object('strict_alignment_payload_sha256', upper(p_payload_sha256))
  where alignment_set_id = v_set_id;
  get diagnostics v_affected = row_count;
  if v_affected <> 1 then raise exception 'Mise à jour de l''ensemble refusée'; end if;

  update public.oeuvre_textes
  set nb_signes = (select coalesce(sum(char_length(segment_texte)), 0)::integer from public.segments where id_texte = v_cer_id),
      metadata = metadata || jsonb_build_object(
        'strict_alignment_payload_sha256', upper(p_payload_sha256),
        'alignment_doctrine', 'strict_same_latin_span', 'alignment_version', 2,
        'latin_pivot', 'Migne 1847', 'strict_alignment_groups', v_groups,
        'strict_alignment_reviewed_ai', v_reviewed, 'strict_alignment_uncertain', v_uncertain,
        'strict_segmentation_segments', v_segments, 'strict_segmentation_split_parents', v_split_parents,
        'strict_segmentation_new_children', v_new_children,
        'biblical_links_preserved', 20, 'validated_human', false,
        'mirandol_immutable', true, 'private_import', true
      )
  where id_texte = v_cer_id and is_public is false and statut = 'review' and is_default is false;
  get diagnostics v_affected = row_count;
  if v_affected <> 1 then raise exception 'Identité privée Ceriziers refusée'; end if;

  update public.controle_sections
  set commentaire_ia = regexp_replace(
        commentaire_ia,
        E'\\n\\n\\[CERIZIERS_1646_ALIGNEMENT_FIN_2026-08-11\\](.|\\n)*$',
        ''
      ) || format(
        E'\n\n[CERIZIERS_1646_ALIGNEMENT_STRICT_V2_2026-08-11]\nDoctrine strict_same_latin_span, latin pivot Migne 1847.\n%s segments Ceriziers, %s groupes : %s reviewed_ai et %s uncertain ; 0 validated_human.\n%s scissions de segments parents, 1 213 vers inchangés.\nCouverture exacte : 1 895 segments Mirandol et %s segments Ceriziers.\nLes 20 liens Ceriziers sont préservés. Mirandol est inchangé. Ceriziers reste privé, review et non défaut.',
        v_segments, v_groups, v_reviewed, v_uncertain, v_split_parents, v_scoped
      ),
      todos = (
        select jsonb_agg(
          case when item->>'texte' like 'Boèce Ceriziers 1646 :%'
            then jsonb_set(jsonb_set(item, '{fait}', 'true'::jsonb, false), '{texte}',
              to_jsonb(format('Boèce Ceriziers 1646 : alignement strict sur le même empan latin importé en privé ; %s segments, %s groupes (%s reviewed_ai, %s uncertain), 20 liens préservés ; publication non effectuée.', v_segments, v_groups, v_reviewed, v_uncertain)), false)
          else item end order by ord
        )
        from jsonb_array_elements(controle_sections.todos) with ordinality as t(item, ord)
      ),
      maj_le = now()
  where cle = 'qualite';

  insert into public.mises_a_jour(date_maj, categorie, titre, description)
  select current_date, 'corpus', 'Boèce — alignement sémantique strict privé de Ceriziers 1646',
    format('[CERIZIERS_1646_ALIGNEMENT_STRICT_V2_2026-08-11] Doctrine strict_same_latin_span appliquée sur Migne 1847 : %s groupes, %s reviewed_ai, %s uncertain, 0 validated_human ; Ceriziers reste privé.', v_groups, v_reviewed, v_uncertain)
  where not exists (
    select 1 from public.mises_a_jour where description like '%[CERIZIERS_1646_ALIGNEMENT_STRICT_V2_2026-08-11]%'
  );
  perform public.rafraichir_controle_stats();

  if (select count(*) from public.segments where id_texte = v_cer_id) <> v_segments
     or (select count(*) from public.segments where id_texte = v_cer_id and nature = 'vers') <> 1213
     or (select count(*) from public.segments where id_texte = v_cer_id and coalesce((segment_metadata->>'alignment_scope')::boolean, false)) <> v_scoped
     or (select count(*) from public.texte_alignements where alignment_set_id = v_set_id) <> v_groups
     or (select count(*) from public.texte_alignements where alignment_set_id = v_set_id and status = 'reviewed_ai') <> v_reviewed
     or (select count(*) from public.texte_alignements where alignment_set_id = v_set_id and status = 'uncertain') <> v_uncertain
     or exists (select 1 from public.texte_alignements where alignment_set_id = v_set_id and status = 'validated_human')
     or (select count(*) from public.texte_alignement_membres where alignment_set_id = v_set_id) <> v_members
     or (select count(*) from public.liens_bibliques l join public.segments s on s.id = l.segment_id where s.id_texte = v_cer_id) <> 20
     or not exists (select 1 from public.oeuvre_textes where id_texte = v_cer_id and is_public is false and statut = 'review' and is_default is false) then
    raise exception 'Contrôle post-écriture strict refusé';
  end if;
  select upper(encode(extensions.digest(convert_to(string_agg(
    concat_ws(chr(31), l.id::text, coalesce(l.canon_id,''), coalesce(l.verset_v2_id::text,''), coalesce(l.livre,''),
      coalesce(l.chapitre::text,''), l.type::text, coalesce(l.fiabilite,''), coalesce(l.motif,''),
      coalesce(l.provenance,''), coalesce(l.arbitrage_requis::text,'')), chr(30) order by l.id), 'UTF8'), 'sha256'), 'hex')) into v_hash
  from public.liens_bibliques l join public.segments s on s.id = l.segment_id where s.id_texte = v_cer_id;
  if v_hash <> upper(p_payload#>>'{before,logical_fingerprints,ceriziers_links_properties}') then raise exception 'Propriétés des liens Ceriziers modifiées'; end if;
  select upper(encode(extensions.digest(convert_to(string_agg(
    concat_ws(chr(31), segment_key, segment_numero::text, coalesce(segment_texte,''), coalesce(texte_original,''),
      coalesce(join_before,''), coalesce(source_unit_id,''), coalesce(paragraphe::text,''), coalesce(rang::text,'')),
    chr(30) order by segment_numero), 'UTF8'), 'sha256'), 'hex')) into v_hash
  from public.segments where id_texte = v_mir_id;
  if v_hash <> upper(p_payload#>>'{before,logical_fingerprints,mirandol_segments_text_latin}') then raise exception 'Mirandol a changé'; end if;

  return jsonb_build_object(
    'status', 'ALIGNEMENT_SEMANTIQUE_STRICT_IMPORTE_EN_PRIVE',
    'payload_sha256', upper(p_payload_sha256),
    'segments', v_segments, 'split_parents', v_split_parents,
    'groups', v_groups, 'members', v_members,
    'reviewed_ai', v_reviewed, 'uncertain', v_uncertain,
    'validated_human', 0, 'biblical_links', 20,
    'is_public', false, 'statut', 'review', 'is_default', false,
    'mirandol_unchanged', true
  );
end;
$$;

revoke all on function public.appliquer_alignement_semantique_strict_ceriziers_mirandol(jsonb, text) from public, anon, authenticated;
grant execute on function public.appliquer_alignement_semantique_strict_ceriziers_mirandol(jsonb, text) to service_role;

comment on function public.appliquer_alignement_semantique_strict_ceriziers_mirandol(jsonb, text) is
  'Import transactionnel, idempotent et privé de l alignement strict Mirandol-Ceriziers par empans latins Migne 1847.';

create or replace function public.restaurer_avant_alignement_semantique_strict_ceriziers_mirandol(
  p_snapshot jsonb,
  p_expected_payload_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
set statement_timeout = '180s'
as $$
declare
  v_cer_id constant text := 'TXT_A0064O0001_FR_1646_CERIZIERS';
  v_set_id constant text := 'ALNSET-A0064O0001-MIR1861-CER1646';
  v_current_hash text;
  v_affected integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('boece-ceriziers-strict-same-latin-span-v2', 0));
  select metadata->>'strict_alignment_payload_sha256' into v_current_hash
  from public.oeuvre_textes where id_texte = v_cer_id;
  if upper(coalesce(v_current_hash, '')) <> upper(coalesce(p_expected_payload_sha256, '')) then
    raise exception 'Rollback refusé : empreinte importée divergente';
  end if;
  if p_snapshot->>'schema' <> 'boece-ceriziers-strict-exact-rollback-snapshot-v1'
     or p_snapshot->>'id_texte' <> v_cer_id
     or p_snapshot->>'alignment_set_id' <> v_set_id
     or jsonb_array_length(p_snapshot->'ceriziers_segments') <> 1880
     or jsonb_array_length(p_snapshot->'alignments') <> 936
     or jsonb_array_length(p_snapshot->'alignment_members') <> 3716
     or jsonb_array_length(p_snapshot->'ceriziers_biblical_links') <> 20 then
    raise exception 'Snapshot de rollback invalide';
  end if;

  delete from public.texte_alignements where alignment_set_id = v_set_id;

  update public.liens_bibliques as target
  set segment_id = source.segment_id
  from jsonb_to_recordset(p_snapshot->'ceriziers_biblical_links') as source(id bigint, segment_id bigint)
  where target.id = source.id;
  get diagnostics v_affected = row_count;
  if v_affected <> 20 then raise exception 'Restauration des liens incomplète'; end if;

  delete from public.segments current
  where current.id_texte = v_cer_id
    and not exists (
      select 1 from jsonb_to_recordset(p_snapshot->'ceriziers_segments') as old(segment_key text)
      where old.segment_key = current.segment_key
    );

  update public.segments set segment_numero = segment_numero + 100000 where id_texte = v_cer_id;
  update public.segments as target
  set segment_numero = source.segment_numero,
      segment_texte = source.segment_texte,
      paragraphe = source.paragraphe,
      rang = source.rang,
      source_start_offset_unicode = source.source_start_offset_unicode,
      source_end_offset_unicode = source.source_end_offset_unicode,
      join_before = source.join_before,
      segment_metadata = source.segment_metadata
  from jsonb_to_recordset(p_snapshot->'ceriziers_segments') as source(
    segment_key text, segment_numero integer, segment_texte text, paragraphe integer, rang integer,
    source_start_offset_unicode integer, source_end_offset_unicode integer, join_before text, segment_metadata jsonb
  )
  where target.id_texte = v_cer_id and target.segment_key = source.segment_key;
  get diagnostics v_affected = row_count;
  if v_affected <> 1880 then raise exception 'Restauration des segments incomplète'; end if;

  update public.texte_note_ancres as target
  set segment_numero = source.segment_numero
  from jsonb_to_recordset(p_snapshot->'ceriziers_note_anchors') as source(anchor_id text, segment_numero integer)
  where target.id_texte = v_cer_id and target.anchor_id = source.anchor_id;

  update public.texte_alignement_ensembles as target
  set status = source.status, method = source.method, metadata = source.metadata,
      created_at = source.created_at
  from jsonb_to_record(p_snapshot->'alignment_set') as source(
    alignment_set_id text, status text, method text, metadata jsonb, created_at timestamptz
  )
  where target.alignment_set_id = source.alignment_set_id;

  insert into public.texte_alignements
  select * from jsonb_populate_recordset(null::public.texte_alignements, p_snapshot->'alignments');
  insert into public.texte_alignement_membres
  select * from jsonb_populate_recordset(null::public.texte_alignement_membres, p_snapshot->'alignment_members');

  update public.oeuvre_textes as target
  set nb_signes = source.nb_signes,
      metadata = source.metadata
  from jsonb_to_record(p_snapshot->'ceriziers_text') as source(id_texte text, nb_signes integer, metadata jsonb)
  where target.id_texte = source.id_texte;

  delete from public.mises_a_jour where description like '%[CERIZIERS_1646_ALIGNEMENT_STRICT_V2_2026-08-11]%';
  update public.controle_sections as target
  set titre = source.titre,
      commentaire_ia = source.commentaire_ia,
      todos = source.todos,
      maj_le = source.maj_le
  from jsonb_to_recordset(p_snapshot->'control_sections') as source(
    cle text, titre text, commentaire_ia text, todos jsonb, maj_le timestamptz
  )
  where target.cle = source.cle;
  perform public.rafraichir_controle_stats();

  if (select count(*) from public.segments where id_texte = v_cer_id) <> 1880
     or (select count(*) from public.texte_alignements where alignment_set_id = v_set_id) <> 936
     or (select count(*) from public.texte_alignement_membres where alignment_set_id = v_set_id) <> 3716
     or (select count(*) from public.liens_bibliques l join public.segments s on s.id = l.segment_id where s.id_texte = v_cer_id) <> 20 then
    raise exception 'Contrôle du rollback refusé';
  end if;
  return jsonb_build_object('status', 'ROLLED_BACK_TO_LIVE_BEFORE_STRICT', 'segments', 1880, 'groups', 936, 'members', 3716, 'biblical_links', 20);
end;
$$;

revoke all on function public.restaurer_avant_alignement_semantique_strict_ceriziers_mirandol(jsonb, text) from public, anon, authenticated;
grant execute on function public.restaurer_avant_alignement_semantique_strict_ceriziers_mirandol(jsonb, text) to service_role;

comment on function public.restaurer_avant_alignement_semantique_strict_ceriziers_mirandol(jsonb, text) is
  'Rollback exact gardé de la segmentation et de l alignement Ceriziers antérieurs à la doctrine stricte. Ne modifie jamais Mirandol.';

commit;
