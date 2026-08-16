begin;

do $patch$
declare
  v_oid regprocedure := 'public.appliquer_alignement_semantique_strict_ceriziers_mirandol(jsonb,text)'::regprocedure;
  v_before text;
  v_after text;
begin
  select pg_get_functiondef(v_oid) into v_before;
  if position('Cardinalités strictes : %s.' in v_before) > 0 then
    return;
  end if;
  if position('Couverture exacte : 1 895 segments Mirandol et %s segments Ceriziers.' in v_before) = 0
     or position('v_segments, v_groups, v_reviewed, v_uncertain, v_split_parents, v_scoped' in v_before) = 0 then
    raise exception 'Définition de la fonction stricte inattendue : patch du centre de contrôle refusé';
  end if;
  v_after := replace(
    v_before,
    'Couverture exacte : 1 895 segments Mirandol et %s segments Ceriziers.',
    'Cardinalités strictes : %s.\nCouverture exacte : 1 895 segments Mirandol et %s segments Ceriziers.'
  );
  v_after := replace(
    v_after,
    'v_segments, v_groups, v_reviewed, v_uncertain, v_split_parents, v_scoped',
    'v_segments, v_groups, v_reviewed, v_uncertain, v_split_parents, coalesce((p_payload#>''{after,cardinalities}'')::text, ''{}''), v_scoped'
  );
  if v_after = v_before
     or position('Cardinalités strictes : %s.' in v_after) = 0
     or position('coalesce((p_payload#>''{after,cardinalities}'')::text, ''{}'')' in v_after) = 0 then
    raise exception 'Patch du centre de contrôle incomplet';
  end if;
  execute v_after;
end
$patch$;

comment on function public.appliquer_alignement_semantique_strict_ceriziers_mirandol(jsonb, text) is
  'Import transactionnel, idempotent et privé de l alignement strict Mirandol-Ceriziers par empans latins Migne 1847, avec répartition des cardinalités au centre de contrôle.';

commit;
