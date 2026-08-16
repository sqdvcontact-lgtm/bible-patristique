begin;

do $$
declare
  v_definition text;
  v_corrigee text;
begin
  select pg_get_functiondef(
    'public.importer_ceriziers_1646_prive(jsonb,text)'::regprocedure
  ) into v_definition;

  v_corrigee := replace(
    v_definition,
    E'id, id_oeuvre, segment_numero, segment_texte,',
    E'id_oeuvre, segment_numero, segment_texte,'
  );
  v_corrigee := replace(
    v_corrigee,
    E'select v_segment_base + row_number() over (order by x.segment_numero),\n    x.id_oeuvre, x.segment_numero, x.segment_texte,',
    E'select x.id_oeuvre, x.segment_numero, x.segment_texte,'
  );

  if v_corrigee = v_definition
     or v_corrigee like '%v_segment_base + row_number() over (order by x.segment_numero)%'
     or v_corrigee like '%id, id_oeuvre, segment_numero, segment_texte,%' then
    raise exception 'La correction de la colonne identite segments n a pas ete appliquee';
  end if;

  execute v_corrigee;
end;
$$;

comment on function public.importer_ceriziers_1646_prive(jsonb, text) is
  'Import transactionnel, idempotent, prive et borne de Ceriziers 1646. Les identifiants segments sont alloues par la colonne GENERATED ALWAYS.';

commit;
