begin;

do $$
declare
  v_definition text;
begin
  select pg_get_functiondef(
    'public.importer_ceriziers_1646_prive(jsonb,text)'::regprocedure
  ) into v_definition;
  v_definition := replace(v_definition, 'Rene de Ceriziers', 'René de Ceriziers');
  v_definition := replace(v_definition, 'Boece', 'Boèce');
  v_definition := replace(v_definition, 'francois', 'françois');
  v_definition := replace(v_definition, 'XVIIe siecle', 'XVIIe siècle');
  v_definition := replace(v_definition, 'Clement Malassis', 'Clément Malassis');
  v_definition := replace(v_definition, '''francais''', '''français''');
  v_definition := replace(v_definition, 'cinquieme edition', 'cinquième édition');
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
  select catalogue_notice_id_ligne
  from public.oeuvre_textes
  where id_texte = 'TXT_A0064O0001_FR_1646_CERIZIERS'
);

update public.oeuvre_textes
set titre_version = 'Traduction de René de Ceriziers, cinquième édition, 1646',
    langue = 'français',
    traducteur = 'René de Ceriziers',
    edition_label = 'Rouen, Jean Viret, Jacques Besongne et Clément Malassis, cinquième édition revue par le traducteur, 1646'
where id_texte = 'TXT_A0064O0001_FR_1646_CERIZIERS'
  and is_public is false
  and statut = 'review';

commit;
