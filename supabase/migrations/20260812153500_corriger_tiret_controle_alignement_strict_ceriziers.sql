begin;

do $migration$
declare
  v_oid constant regprocedure := 'public.appliquer_alignement_semantique_strict_ceriziers_mirandol(jsonb,text)'::regprocedure;
  v_definition text;
  v_updated text;
  v_bad_dash constant text := chr(226) || chr(8364) || chr(8221);
  v_em_dash constant text := chr(8212);
begin
  select pg_get_functiondef(v_oid) into v_definition;
  if position(v_bad_dash in v_definition) = 0 then
    raise exception 'Garde refusee : tiret long mojibake absent de la fonction stricte';
  end if;

  v_updated := replace(v_definition, v_bad_dash, v_em_dash);
  execute v_updated;

  update public.mises_a_jour
  set titre = replace(titre, v_bad_dash, v_em_dash),
      description = replace(description, v_bad_dash, v_em_dash)
  where description like '%[CERIZIERS_1646_ALIGNEMENT_STRICT_V2_2026-08-11]%';

  if not found then
    raise exception 'Garde refusee : mise a jour stricte absente';
  end if;

  if position(v_bad_dash in (select pg_get_functiondef(v_oid))) > 0
     or exists (
       select 1 from public.mises_a_jour
       where description like '%[CERIZIERS_1646_ALIGNEMENT_STRICT_V2_2026-08-11]%'
         and position(v_bad_dash in (titre || description)) > 0
     ) then
    raise exception 'Controle post-correction refuse : tiret mojibake residuel';
  end if;
end
$migration$;

revoke all on function public.appliquer_alignement_semantique_strict_ceriziers_mirandol(jsonb, text) from public, anon, authenticated;
grant execute on function public.appliquer_alignement_semantique_strict_ceriziers_mirandol(jsonb, text) to service_role;

commit;
