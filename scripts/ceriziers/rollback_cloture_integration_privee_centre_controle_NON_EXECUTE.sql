begin;

do $$
begin
  if not exists (
    select 1 from public.controle_sections
    where cle = 'qualite'
      and commentaire_ia like '%[CERIZIERS_1646_ALIGNEMENT_FIN_2026-08-11]%'
  ) then
    raise exception 'État final Ceriziers absent ; retour arrière refusé';
  end if;
end
$$;

update public.controle_sections
set commentaire_ia = regexp_replace(
      commentaire_ia,
      E'\\n\\n\\[CERIZIERS_1646_ALIGNEMENT_FIN_2026-08-11\\](.|\\n)*$',
      ''
    ) || E'\n\n[CERIZIERS_1646_IMPORT_PRIVE_2026-08-11] Ceriziers 1646 est importé comme second texte privé de Boèce, depuis l’exemplaire de Rouen, cinquième édition revue par le traducteur. Données : 209 unités, 608 segments de prose ou dialogue, 1 214 segments versifiés et 1 881 segments au total. Alignement exhaustif du corps : 268 groupes reviewed_ai, soit 3 groupes 1:1, 16 groupes n:1 et 249 groupes n:m ; 0 groupe uncertain, 1 822/1 822 segments Ceriziers et 1 895/1 895 segments Mirandol couverts. Mirandol est inchangé. Ceriziers demeure review, non public et non proposé aux utilisateurs ordinaires. Aucun lien biblique Ceriziers et aucune validation humaine revendiquée.',
    todos = (
      select jsonb_agg(
        case
          when item ->> 'texte' like 'Boèce Ceriziers 1646 :%'
            then jsonb_set(
              jsonb_set(item, '{fait}', 'true'::jsonb, false),
              '{texte}',
              to_jsonb('Boèce Ceriziers 1646 : import privé et alignement exhaustif avec Mirandol achevés ; 1 881 segments, dont 1 214 vers, 268 groupes et 100 % du corps couvert.'::text),
              false
            )
          else item
        end
        order by ord
      )
      from jsonb_array_elements(controle_sections.todos) with ordinality as t(item, ord)
    ),
    maj_le = now()
where cle = 'qualite';

delete from public.mises_a_jour
where description like '%[CERIZIERS_1646_ALIGNEMENT_FIN_2026-08-11]%';

select public.rafraichir_controle_stats();

commit;
