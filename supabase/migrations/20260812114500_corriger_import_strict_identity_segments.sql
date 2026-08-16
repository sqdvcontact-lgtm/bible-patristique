begin;

do $migration$
declare
  v_oid constant regprocedure := 'public.appliquer_alignement_semantique_strict_ceriziers_mirandol(jsonb,text)'::regprocedure;
  v_definition text;
  v_old_columns constant text := E'insert into public.segments(\n    id, id_oeuvre, segment_numero, segment_texte,';
  v_new_columns constant text := E'insert into public.segments(\n    id_oeuvre, segment_numero, segment_texte,';
  v_old_values constant text := E'  select nextval(pg_get_serial_sequence(''public.segments'', ''id'')),\n    parent.id_oeuvre, x.segment_numero, x.segment_texte,';
  v_new_values constant text := E'  select parent.id_oeuvre, x.segment_numero, x.segment_texte,';
begin
  select pg_get_functiondef(v_oid) into v_definition;
  if position(v_old_columns in v_definition) = 0
     or position(v_old_values in v_definition) = 0
     or position(v_new_columns in v_definition) > 0
     or position(v_new_values in v_definition) > 0 then
    raise exception 'Garde de définition refusée pour la correction identity de segments';
  end if;

  v_definition := replace(v_definition, v_old_columns, v_new_columns);
  v_definition := replace(v_definition, v_old_values, v_new_values);

  if position(v_old_columns in v_definition) > 0
     or position(v_old_values in v_definition) > 0
     or position(v_new_columns in v_definition) = 0
     or position(v_new_values in v_definition) = 0 then
    raise exception 'Réécriture bornée de la fonction d''import incomplète';
  end if;

  execute v_definition;
end;
$migration$;

revoke all on function public.appliquer_alignement_semantique_strict_ceriziers_mirandol(jsonb, text) from public, anon, authenticated;
grant execute on function public.appliquer_alignement_semantique_strict_ceriziers_mirandol(jsonb, text) to service_role;

comment on function public.appliquer_alignement_semantique_strict_ceriziers_mirandol(jsonb, text) is
  'Import transactionnel privé de la segmentation et de l alignement strict Ceriziers/Mirandol. Les enfants de segments utilisent la colonne identity GENERATED ALWAYS sans valeur id explicite.';

commit;
