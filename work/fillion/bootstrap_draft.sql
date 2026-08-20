-- Amorçage reproductible du chantier Fillion.
-- À exécuter seulement après le déploiement du code tolérant et l'application de
-- 20260820093045_bible_fillion_editorial_model.sql.
--
-- Les deux fiches `traductions` restent invisibles dans les catalogues bibliques :
-- `schema_numerotation` demeure NULL et aucune capacité de lecture n'est créée ici.
-- Le texte français et le latin publié par Fillion sont deux objets distincts,
-- reliés exclusivement par la famille éditoriale `fillion-bible`.

begin;

do $fillion_bootstrap$
declare
  fillion_family_id uuid;
begin
  if exists (
    select 1 from public.traductions
    where trad_id in ('TR0010', 'TR0011')
  ) then
    raise exception 'TR0010 ou TR0011 est déjà attribué : amorçage Fillion interrompu';
  end if;

  if exists (
    select 1 from public.bible_edition_families
    where family_code = 'fillion-bible'
  ) then
    raise exception 'La famille fillion-bible existe déjà : amorçage interrompu';
  end if;

  insert into public.traductions (
    trad_id,
    nom,
    auteur,
    dates,
    date_publication,
    confession,
    langue,
    commentaire_editorial,
    ordre,
    publication_debut_annee,
    publication_debut_precision,
    publication_fin_annee,
    publication_fin_precision,
    schema_numerotation,
    source_edition,
    source_url,
    est_referent,
    licence,
    type_objet,
    responsable_edition,
    statut_corpus_public,
    lacunes_publiques
  ) values
  (
    'TR0010',
    'La Sainte Bible — traduction de L.-Cl. Fillion',
    'Louis-Claude Fillion',
    '1843-1927',
    '1888-1904 ; exemplaires utilisés publiés de 1894 à 1925',
    'Catholique',
    'Français',
    '<p>Traduction française de Louis-Claude Fillion, conservée avec ses introductions, commentaires, notes et illustrations. Le corpus réunit huit volumes d’éditions différentes, décrites séparément dans la bibliographie de la famille éditoriale.</p>',
    7,
    1888,
    'exacte',
    1904,
    'exacte',
    null,
    'Louis-Claude Fillion, La Sainte Bible, texte latin et traduction française, commentée d’après la Vulgate et les textes originaux, Paris, Letouzey et Ané ; exemplaires utilisés : t. I, 2e éd., 1894 ; t. II-III, 7e éd., 1922 ; t. IV et VI-VII, 8e éd., 1924 ; t. V, 6e éd., 1922 ; t. VIII, 9e éd., 1925.',
    'https://archive.org/search?query=identifier%3Alasaintebibletex%2Afill',
    false,
    'Domaine public',
    'traduction',
    'Louis-Claude Fillion ; édition numérique : Corpus Scriptura',
    'Brouillon privé — transcription, alignement et collation en préparation.',
    'Aucun contenu publié.'
  ),
  (
    'TR0011',
    'Vulgate latine publiée par L.-Cl. Fillion',
    'Tradition latine ; édition publiée par Louis-Claude Fillion',
    'IVe siècle ; édition imprimée aux XIXe-XXe siècles',
    'Exemplaires utilisés publiés de 1894 à 1925',
    'Catholique',
    'Latin',
    '<p>Texte latin de la Vulgate tel qu’il est effectivement publié en regard de la traduction française de Fillion. Cette transcription constitue une édition autonome et n’est jamais remplacée par TR0004 ; son association à la traduction française est portée par la famille éditoriale Fillion.</p>',
    8,
    1894,
    'exacte',
    1925,
    'exacte',
    null,
    'Texte latin en regard dans Louis-Claude Fillion, La Sainte Bible, Paris, Letouzey et Ané ; ensemble matériel mixte : éditions de 1894, 1922, 1924 et 1925.',
    'https://archive.org/search?query=identifier%3Alasaintebibletex%2Afill',
    false,
    'Domaine public',
    'recension',
    'Louis-Claude Fillion ; transcription numérique : Corpus Scriptura',
    'Brouillon privé — transcription et collation en préparation.',
    'Aucun contenu publié.'
  );

  insert into public.bible_edition_families (
    family_code,
    title,
    description,
    status,
    metadata
  ) values (
    'fillion-bible',
    'La Sainte Bible de Louis-Claude Fillion',
    'Famille éditoriale bilingue reliant la traduction française de Fillion au texte latin effectivement publié en regard, avec introductions, commentaires, notes et illustrations.',
    'draft',
    jsonb_build_object(
      'desired_reading_order', jsonb_build_array('TR0011', 'TR0010'),
      'desired_numbering_schema', 'vulgate',
      'aelf_alignment', 'canonical_structure_only',
      'mixed_editions', true,
      'source_register', 'work/fillion/registre_sources.csv'
    )
  )
  returning id into fillion_family_id;

  insert into public.bible_edition_members (
    family_id,
    trad_id,
    member_role,
    language_code,
    label,
    display_order,
    desktop_position,
    mobile_order,
    status,
    metadata
  ) values
  (
    fillion_family_id,
    'TR0011',
    'source_text',
    'la',
    'Vulgate publiée par Fillion',
    1,
    'left',
    1,
    'draft',
    jsonb_build_object('desired_numbering_schema', 'vulgate', 'independent_from', 'TR0004')
  ),
  (
    fillion_family_id,
    'TR0010',
    'translation',
    'fr',
    'Traduction française de Fillion',
    2,
    'right',
    2,
    'draft',
    jsonb_build_object('desired_numbering_schema', 'vulgate', 'translated_from_member', 'TR0011')
  );

  insert into public.bible_edition_components (
    family_id,
    component_code,
    title,
    volume_label,
    edition_statement,
    publication_place,
    publisher,
    publication_year,
    publication_date_text,
    bibliographic_note,
    source_uri,
    source_sha256,
    material_order,
    status,
    metadata
  ) values
  (fillion_family_id, 'tome-01', 'La Sainte Bible', 'Tome I',   'Deuxième édition', 'Paris', 'Letouzey et Ané', 1894, '1894', 'La page de titre du fac-similé prévaut sur la date 1889 de la notice Internet Archive.', 'https://archive.org/download/lasaintebibletex01fill/lasaintebibletex01fill.pdf', null, 10, 'draft', '{"internet_archive_identifier":"lasaintebibletex01fill","illustrations_present":true}'::jsonb),
  (fillion_family_id, 'tome-02', 'La Sainte Bible', 'Tome II',  'Septième édition', 'Paris', 'Letouzey et Ané', 1922, '1922', null, 'https://archive.org/download/lasaintebibletex02fill/lasaintebibletex02fill.pdf', null, 20, 'draft', '{"internet_archive_identifier":"lasaintebibletex02fill","illustrations_present":true}'::jsonb),
  (fillion_family_id, 'tome-03', 'La Sainte Bible', 'Tome III', 'Septième édition', 'Paris', 'Letouzey et Ané', 1922, '1922', null, 'https://archive.org/download/lasaintebibletex03fill/lasaintebibletex03fill.pdf', null, 30, 'draft', '{"internet_archive_identifier":"lasaintebibletex03fill","illustrations_present":true}'::jsonb),
  (fillion_family_id, 'tome-04', 'La Sainte Bible', 'Tome IV',  'Huitième édition', 'Paris', 'Letouzey et Ané', 1924, '1924', null, 'https://archive.org/download/lasaintebibletex04fill/lasaintebibletex04fill.pdf', null, 40, 'draft', '{"internet_archive_identifier":"lasaintebibletex04fill","illustrations_present":true}'::jsonb),
  (fillion_family_id, 'tome-05', 'La Sainte Bible', 'Tome V',   'Sixième édition', 'Paris', 'Letouzey et Ané', 1922, '1922', null, 'https://archive.org/download/lasaintebibletex05fill/lasaintebibletex05fill.pdf', null, 50, 'draft', '{"internet_archive_identifier":"lasaintebibletex05fill","illustrations_present":true}'::jsonb),
  (fillion_family_id, 'tome-06', 'La Sainte Bible', 'Tome VI',  'Huitième édition', 'Paris', 'Letouzey et Ané', 1924, '1924', 'Édition et date à confirmer visuellement sur la page de titre.', 'https://archive.org/download/lasaintebibletex06fill/lasaintebibletex06fill.pdf', null, 60, 'draft', '{"internet_archive_identifier":"lasaintebibletex06fill","illustrations_present":true,"bibliography_requires_review":true}'::jsonb),
  (fillion_family_id, 'tome-07', 'La Sainte Bible', 'Tome VII', 'Huitième édition', 'Paris', 'Letouzey et Ané', 1924, '1924', 'Volume source du pilote Marc.', 'https://archive.org/download/lasaintebibletex07fill/lasaintebibletex07fill.pdf', '36636793eb22df2edfd6675bb5388204e016414f917f99929c1723df9adce608', 70, 'draft', '{"internet_archive_identifier":"lasaintebibletex07fill","illustrations_present":true,"pilot_book":"MRK"}'::jsonb),
  (fillion_family_id, 'tome-08', 'La Sainte Bible', 'Tome VIII','Neuvième édition', 'Paris', 'Letouzey et Ané', 1925, '1925', null, 'https://archive.org/download/lasaintebibletex08fill/lasaintebibletex08fill.pdf', null, 80, 'draft', '{"internet_archive_identifier":"lasaintebibletex08fill","illustrations_present":true}'::jsonb);
end
$fillion_bootstrap$;

commit;
