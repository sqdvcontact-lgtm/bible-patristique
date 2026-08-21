begin;

do $$
declare
  v_todos integer;
  v_groupes integer;
  v_reviewed integer;
  v_uncertain integer;
begin
  if not exists (
    select 1
    from public.oeuvre_textes
    where id_texte = 'TXT_A0064O0001_FR_1646_CERIZIERS'
      and id_oeuvre = 'A0064O0001'
      and is_public is false
      and statut = 'review'
      and is_default is false
  ) then
    raise exception 'Garde Ceriziers privée/review/non-default non satisfaite';
  end if;

  select count(*),
         count(*) filter (where status = 'reviewed_ai'),
         count(*) filter (where status = 'uncertain')
  into v_groupes, v_reviewed, v_uncertain
  from public.texte_alignements
  where alignment_set_id = 'ALNSET-A0064O0001-MIR1861-CER1646';

  if (v_groupes, v_reviewed, v_uncertain) <> (936, 612, 324) then
    raise exception 'Garde alignement non satisfaite: %, %, %', v_groupes, v_reviewed, v_uncertain;
  end if;

  if not exists (
    select 1 from public.controle_sections
    where cle = 'qualite'
      and (
        commentaire_ia like '%[CERIZIERS_1646_IMPORT_PRIVE_2026-08-11]%'
        or commentaire_ia like '%[CERIZIERS_1646_ALIGNEMENT_FIN_2026-08-11]%'
      )
  ) then
    raise exception 'Paragraphe historique Ceriziers introuvable';
  end if;

  select count(*)
  into v_todos
  from public.controle_sections c,
       jsonb_array_elements(c.todos) item
  where c.cle = 'qualite'
    and item ->> 'texte' like 'Boèce Ceriziers 1646 :%';

  if v_todos <> 1 then
    raise exception 'Todo Ceriziers ambigu: % occurrence(s)', v_todos;
  end if;
end
$$;

update public.controle_sections
set commentaire_ia = case
      when commentaire_ia like '%[CERIZIERS_1646_ALIGNEMENT_FIN_2026-08-11]%'
        then commentaire_ia
      else regexp_replace(
        commentaire_ia,
        E'\\n\\n\\[CERIZIERS_1646_IMPORT_PRIVE_2026-08-11\\](.|\\n)*$',
        ''
      ) || E'\n\n[CERIZIERS_1646_ALIGNEMENT_FIN_2026-08-11]\nCeriziers 1646 demeure privé et en review.\n209 unités, 1880 segments, 1213 vers.\nAlignement exhaustif du corps : 936 groupes,\n612 reviewed_ai et 324 uncertain,\n0 validated_human.\nCardinalités : 3 groupes 0:1, 4 groupes 1:0,\n288 groupes 1:1, 54 groupes 1:n,\n129 groupes n:1 et 458 groupes n:m.\nLes corruptions inso¬ et PRO sont corrigées.\nMirandol, son latin, ses notes et ses 20 liens sont inchangés.\nAucun lien biblique Ceriziers et aucune publication.\nL’intégration privée du lecteur est déployée pour l’administrateur.'
    end,
    todos = (
      select jsonb_agg(
        case
          when item ->> 'texte' like 'Boèce Ceriziers 1646 :%'
            then jsonb_set(
              jsonb_set(item, '{fait}', 'true'::jsonb, false),
              '{texte}',
              to_jsonb('Boèce Ceriziers 1646 : intégration privée du lecteur déployée ; 209 unités, 1 880 segments dont 1 213 vers, 936 groupes (612 reviewed_ai, 324 uncertain), métadonnées et quatre notes contrôlées sur ordinateur et mobile ; publication non effectuée.'::text),
              false
            )
          else item
        end
        order by ord
      )
      from jsonb_array_elements(controle_sections.todos) with ordinality as t(item, ord)
    ),
    maj_le = now()
where cle = 'qualite'
  and (
    commentaire_ia not like '%[CERIZIERS_1646_ALIGNEMENT_FIN_2026-08-11]%'
    or exists (
      select 1
      from jsonb_array_elements(controle_sections.todos) item
      where item ->> 'texte' like 'Boèce Ceriziers 1646 :%'
        and (
          coalesce((item ->> 'fait')::boolean, false) is not true
          or item ->> 'texte' <> 'Boèce Ceriziers 1646 : intégration privée du lecteur déployée ; 209 unités, 1 880 segments dont 1 213 vers, 936 groupes (612 reviewed_ai, 324 uncertain), métadonnées et quatre notes contrôlées sur ordinateur et mobile ; publication non effectuée.'
        )
    )
  );

insert into public.mises_a_jour (date_maj, categorie, titre, description)
select
  date '2026-08-11',
  'corpus',
  'Boèce — clôture technique privée de Ceriziers 1646',
  '[CERIZIERS_1646_ALIGNEMENT_FIN_2026-08-11] Intégration privée du lecteur multiversion déployée : Ceriziers 1646 reste en review, non public et non défaut ; 936 groupes inchangés, dont 324 uncertain réservés à la relecture humaine.'
where not exists (
  select 1
  from public.mises_a_jour
  where description like '%[CERIZIERS_1646_ALIGNEMENT_FIN_2026-08-11]%'
);

select public.rafraichir_controle_stats();

commit;
