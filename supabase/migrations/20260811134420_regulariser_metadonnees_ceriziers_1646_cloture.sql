begin;

do $regularisation$
declare
  v_ancienne_metadata jsonb;
  v_nouvelle_metadata jsonb;
  v_lignes integer;
begin
  select metadata
    into strict v_ancienne_metadata
  from public.oeuvre_textes
  where id_texte = 'TXT_A0064O0001_FR_1646_CERIZIERS'
  for update;

  if v_ancienne_metadata->>'initial_segmentation_manifest_sha256' = 'B6D03567B6367021E857B533B5534296D2DF6FC49E3931FD2BF096EB01A8D588'
     and v_ancienne_metadata->>'segmentation_manifest_sha256' = 'D2957E0599312FBD7746A8CD3505262A73DFFC394D158D6922CDC7DC2D69B2D4'
     and v_ancienne_metadata->>'initial_import_payload_sha256' = '7238D9273AE9C1C0B85A8225AED2CA16E40314CE75CDF508EF30FFE573723547'
     and v_ancienne_metadata->>'correction_payload_sha256' = '03BA3678709111A4B4FC7084A2FDA16CCB2C81861184347CB3109E811614B844'
     and not (v_ancienne_metadata ? 'ceriziers_import_payload_sha256')
     and not (v_ancienne_metadata ? 'ceriziers_correction_payload_sha256') then
    return;
  end if;

  if v_ancienne_metadata->>'segmentation_manifest_sha256' is distinct from 'B6D03567B6367021E857B533B5534296D2DF6FC49E3931FD2BF096EB01A8D588'
     or v_ancienne_metadata->>'ceriziers_import_payload_sha256' is distinct from '7238D9273AE9C1C0B85A8225AED2CA16E40314CE75CDF508EF30FFE573723547'
     or v_ancienne_metadata->>'ceriziers_correction_payload_sha256' is distinct from '03BA3678709111A4B4FC7084A2FDA16CCB2C81861184347CB3109E811614B844'
     or v_ancienne_metadata ? 'initial_segmentation_manifest_sha256'
     or v_ancienne_metadata ? 'initial_import_payload_sha256'
     or v_ancienne_metadata ? 'correction_payload_sha256' then
    raise exception 'CERIZIERS_METADATA_GUARD_FAILED: état de provenance inattendu';
  end if;

  v_nouvelle_metadata := (
    v_ancienne_metadata
      - 'segmentation_manifest_sha256'
      - 'ceriziers_import_payload_sha256'
      - 'ceriziers_correction_payload_sha256'
  ) || jsonb_build_object(
    'initial_segmentation_manifest_sha256', 'B6D03567B6367021E857B533B5534296D2DF6FC49E3931FD2BF096EB01A8D588',
    'segmentation_manifest_sha256', 'D2957E0599312FBD7746A8CD3505262A73DFFC394D158D6922CDC7DC2D69B2D4',
    'initial_import_payload_sha256', '7238D9273AE9C1C0B85A8225AED2CA16E40314CE75CDF508EF30FFE573723547',
    'correction_payload_sha256', '03BA3678709111A4B4FC7084A2FDA16CCB2C81861184347CB3109E811614B844'
  );

  update public.oeuvre_textes
  set metadata = v_nouvelle_metadata
  where id_texte = 'TXT_A0064O0001_FR_1646_CERIZIERS'
    and metadata = v_ancienne_metadata;

  get diagnostics v_lignes = row_count;
  if v_lignes <> 1 then
    raise exception 'CERIZIERS_METADATA_WRITE_GUARD_FAILED: % ligne mise à jour', v_lignes;
  end if;
end
$regularisation$;

commit;
