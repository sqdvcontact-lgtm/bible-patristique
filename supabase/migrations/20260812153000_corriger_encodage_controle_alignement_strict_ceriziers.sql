begin;

do $migration$
declare
  v_oid constant regprocedure := 'public.appliquer_alignement_semantique_strict_ceriziers_mirandol(jsonb,text)'::regprocedure;
  v_definition text;
  v_updated text;
  v_segments integer;
  v_groups integer;
  v_reviewed integer;
  v_uncertain integer;
begin
  select pg_get_functiondef(v_oid) into v_definition;

  if position((chr(195) || chr(169)) in v_definition) = 0
     and position((chr(195) || chr(168)) in v_definition) = 0
     and position((chr(195) || chr(160)) in v_definition) = 0
     and position((chr(195) || chr(180)) in v_definition) = 0
     and position((chr(195) || chr(170)) in v_definition) = 0 then
    raise exception 'Garde refusee : aucun mojibake attendu dans la fonction stricte';
  end if;

  v_updated := replace(v_definition, chr(195) || chr(169), chr(233));
  v_updated := replace(v_updated, chr(195) || chr(168), chr(232));
  v_updated := replace(v_updated, chr(195) || chr(160), chr(224));
  v_updated := replace(v_updated, chr(195) || chr(180), chr(244));
  v_updated := replace(v_updated, chr(195) || chr(170), chr(234));
  execute v_updated;

  select count(*) into v_segments
  from public.segments
  where id_texte = 'TXT_A0064O0001_FR_1646_CERIZIERS';

  select count(*),
         count(*) filter (where status = 'reviewed_ai'),
         count(*) filter (where status = 'uncertain')
    into v_groups, v_reviewed, v_uncertain
  from public.texte_alignements
  where alignment_set_id = 'ALNSET-A0064O0001-MIR1861-CER1646';

  if v_segments <> 1966 or v_groups <> 938 or v_reviewed <> 183 or v_uncertain <> 755 then
    raise exception 'Garde refusee : etat strict vivant divergent';
  end if;

  update public.controle_sections
  set commentaire_ia = replace(
        replace(
          replace(
            replace(
              replace(commentaire_ia,
                chr(195) || chr(169), chr(233)),
              chr(195) || chr(168), chr(232)),
            chr(195) || chr(160), chr(224)),
          chr(195) || chr(180), chr(244)),
        chr(195) || chr(170), chr(234)),
      todos = (
        select jsonb_agg(
          case
            when item->>'texte' like ('Bo' || chr(232) || 'ce Ceriziers 1646 :%')
              then jsonb_set(
                jsonb_set(item, '{fait}', 'true'::jsonb, false),
                '{texte}',
                to_jsonb(format(
                  'Bo%sce Ceriziers 1646 : alignement strict sur le m%sme empan latin import%s en priv%s ; %s segments, %s groupes (%s reviewed_ai, %s uncertain), 20 liens pr%sserv%ss ; publication non effectu%se.',
                  chr(232), chr(234), chr(233), chr(233), v_segments, v_groups, v_reviewed, v_uncertain, chr(233), chr(233), chr(233)
                )),
                false
              )
            else item
          end
          order by ord
        )
        from jsonb_array_elements(public.controle_sections.todos) with ordinality as t(item, ord)
      ),
      maj_le = now()
  where cle = 'qualite'
    and commentaire_ia like '%[CERIZIERS_1646_ALIGNEMENT_STRICT_V2_2026-08-11]%';

  if not found then
    raise exception 'Garde refusee : section de controle stricte absente';
  end if;

  update public.mises_a_jour
  set titre = replace(
        replace(
          replace(
            replace(
              replace(titre,
                chr(195) || chr(169), chr(233)),
              chr(195) || chr(168), chr(232)),
            chr(195) || chr(160), chr(224)),
          chr(195) || chr(180), chr(244)),
        chr(195) || chr(170), chr(234)),
      description = replace(
        replace(
          replace(
            replace(
              replace(description,
                chr(195) || chr(169), chr(233)),
              chr(195) || chr(168), chr(232)),
            chr(195) || chr(160), chr(224)),
          chr(195) || chr(180), chr(244)),
        chr(195) || chr(170), chr(234))
  where description like '%[CERIZIERS_1646_ALIGNEMENT_STRICT_V2_2026-08-11]%';

  if not found then
    raise exception 'Garde refusee : mise a jour stricte absente';
  end if;

  perform public.rafraichir_controle_stats();

  if exists (
    select 1
    from public.controle_sections
    where cle = 'qualite'
      and commentaire_ia like '%[CERIZIERS_1646_ALIGNEMENT_STRICT_V2_2026-08-11]%'
      and commentaire_ia ~ (chr(195) || '[' || chr(160) || chr(168) || chr(169) || chr(170) || chr(180) || ']')
  ) or exists (
    select 1
    from public.mises_a_jour
    where description like '%[CERIZIERS_1646_ALIGNEMENT_STRICT_V2_2026-08-11]%'
      and (titre || description) ~ (chr(195) || '[' || chr(160) || chr(168) || chr(169) || chr(170) || chr(180) || ']')
  ) then
    raise exception 'Controle post-correction refuse : mojibake residuel';
  end if;
end
$migration$;

revoke all on function public.appliquer_alignement_semantique_strict_ceriziers_mirandol(jsonb, text) from public, anon, authenticated;
grant execute on function public.appliquer_alignement_semantique_strict_ceriziers_mirandol(jsonb, text) to service_role;

commit;
