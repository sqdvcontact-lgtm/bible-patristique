begin;

do $$
declare
  v_definition text;
begin
  select pg_get_functiondef(
    'public.importer_ceriziers_1646_prive(jsonb,text)'::regprocedure
  ) into v_definition;
  v_definition := replace(v_definition, 'RenÃ© de Ceriziers', 'René de Ceriziers');
  v_definition := replace(v_definition, 'BoÃ¨ce', 'Boèce');
  v_definition := replace(v_definition, 'franÃ§ois', 'françois');
  v_definition := replace(v_definition, 'XVIIe siÃ¨cle', 'XVIIe siècle');
  v_definition := replace(v_definition, 'ClÃ©ment Malassis', 'Clément Malassis');
  v_definition := replace(v_definition, '''franÃ§ais''', '''français''');
  v_definition := replace(v_definition, 'cinquiÃ¨me Ã©dition', 'cinquième édition');
  execute v_definition;
end;
$$;

update public.catalogue_notices
set titre_edition = 'La Consolation de la philosophie, traduicte du latin de Boèce en françois',
    traducteur = 'René de Ceriziers',
    siecle_edition = 'XVIIe siècle',
    editeur = 'Jean Viret ; Jacques Besongne ; Clément Malassis',
    traducteur_uniformise = 'René de Ceriziers'
where id_ligne = (
  select catalogue_notice_id_ligne from public.oeuvre_textes
  where id_texte = 'TXT_A0064O0001_FR_1646_CERIZIERS'
);

update public.oeuvre_textes
set titre_version = 'Traduction de René de Ceriziers, cinquième édition, 1646',
    langue = 'français',
    traducteur = 'René de Ceriziers',
    edition_label = 'Rouen, Jean Viret, Jacques Besongne et Clément Malassis, cinquième édition revue par le traducteur, 1646'
where id_texte = 'TXT_A0064O0001_FR_1646_CERIZIERS'
  and is_public is false and statut = 'review';

update public.controle_sections
set commentaire_ia = left(commentaire_ia, position('[CERIZIERS_1646_IMPORT_PRIVE_2026-08-11]' in commentaire_ia) - 1)
    || '[CERIZIERS_1646_IMPORT_PRIVE_2026-08-11] Ceriziers 1646 est importé comme second texte privé de Boèce, depuis l’exemplaire de Rouen, cinquième édition revue par le traducteur. Données : 209 unités, 608 segments de prose ou dialogue, 1 214 segments versifiés et 1 881 segments au total. Alignement exhaustif du corps : 268 groupes reviewed_ai, soit 3 groupes 1:1, 16 groupes n:1 et 249 groupes n:m ; 0 groupe uncertain, 1 822/1 822 segments Ceriziers et 1 895/1 895 segments Mirandol couverts. Mirandol est inchangé. Ceriziers demeure review, non public et non proposé aux utilisateurs ordinaires. Aucun lien biblique Ceriziers et aucune validation humaine revendiquée.',
    todos = coalesce((
      select jsonb_agg(element)
      from jsonb_array_elements(todos) as element
      where coalesce(element->>'texte', '') not like '%Ceriziers 1646%'
    ), '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'fait', true,
      'texte', 'Boèce Ceriziers 1646 : import privé et alignement exhaustif avec Mirandol achevés ; 1 881 segments, dont 1 214 vers, 268 groupes et 100 % du corps couvert.'
    )),
    maj_le = now()
where cle = 'qualite'
  and position('[CERIZIERS_1646_IMPORT_PRIVE_2026-08-11]' in commentaire_ia) > 0;

update public.mises_a_jour
set titre = 'Boèce — import privé de Ceriziers 1646 et alignement Mirandol',
    description = 'Notice propre à la cinquième édition de Rouen ; 209 unités, 1 881 segments dont 1 214 vers, 4 notes d’apparat et 268 groupes reviewed_ai couvrant 100 % du corps. Mirandol et ses 20 liens bibliques sont inchangés. Ceriziers reste non public.'
where id = 29
  and titre like '%Ceriziers 1646%';

commit;
