begin;

create or replace function public.appliquer_correction_ceriziers_1646_alignement_fin(
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
  v_result jsonb;
  v_affected integer;
begin
  v_result := public.corriger_ceriziers_1646_texte_alignement_fin(p_payload, p_payload_sha256);

  if coalesce(v_result->>'status', '') not in ('CORRECTED', 'ALREADY_CORRECTED') then
    raise exception 'Résultat inattendu de la correction Ceriziers';
  end if;
  if not exists (
    select 1 from public.oeuvres
    where id_oeuvre = 'A0064O0001'
      and (niveaux_corps, niveaux_sommaire) in ((2, 2), (3, 3))
  ) then
    raise exception 'Garde des niveaux de l œuvre Boèce refusée';
  end if;

  update public.oeuvres
  set niveaux_corps = 2,
      niveaux_sommaire = 2
  where id_oeuvre = 'A0064O0001';
  get diagnostics v_affected = row_count;
  if v_affected <> 1 then
    raise exception 'Restauration des niveaux de l œuvre Boèce incomplète';
  end if;

  if not exists (
       select 1 from public.oeuvre_textes
       where id_texte = 'TXT_A0064O0001_FR_1646_CERIZIERS'
         and statut = 'review' and is_public is false and is_default is false
     )
     or not exists (
       select 1 from public.oeuvre_textes
       where id_texte = 'TXT_A0064O0001_FR_1861_MIRANDOL'
         and statut = 'published' and is_public is true
     )
     or (select count(*) from public.segments where id_texte = 'TXT_A0064O0001_FR_1861_MIRANDOL') <> 1896
     or (select count(*) from public.texte_notes where id_texte = 'TXT_A0064O0001_FR_1861_MIRANDOL') <> 138
     or (select count(*) from public.liens_bibliques l join public.segments s on s.id = l.segment_id where s.id_texte = 'TXT_A0064O0001_FR_1861_MIRANDOL') <> 20 then
    raise exception 'Contrôle de préservation final refusé';
  end if;

  return v_result || jsonb_build_object(
    'work_levels_preserved', true,
    'niveaux_corps', 2,
    'niveaux_sommaire', 2
  );
end;
$$;

revoke all on function public.appliquer_correction_ceriziers_1646_alignement_fin(jsonb, text)
  from public, anon, authenticated;
grant execute on function public.appliquer_correction_ceriziers_1646_alignement_fin(jsonb, text)
  to service_role;

comment on function public.appliquer_correction_ceriziers_1646_alignement_fin(jsonb, text) is
  'Enveloppe transactionnelle de correction Ceriziers qui préserve les niveaux historiques de l œuvre Boèce.';

commit;
