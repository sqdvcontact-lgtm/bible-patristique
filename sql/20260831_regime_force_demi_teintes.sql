-- ⛔ DEUX PHOTOGRAVURES QUE LA LÉGENDE NE DÉCLARE PAS.
--
-- « Intérieur de l'église la Nativité, à Bethléem. » et « Cour d'une maison de
-- l'Orient. » ne nomment qu'un lieu : la règle du régime les prend donc pour des
-- dessins et les détoure. Ce sont des demi-teintes, vérifiées à l'agrandissement
-- — la trame de points s'y voit — et le détourage y écrase les tons, blanchit les
-- clairs et laisse un bord rectangulaire.
--
-- ⚠️ La troisième, « Olivier de Gethsémani. (D'après une photographie.) », porte
--    pourtant la mention : elle échappe à la règle par sa LARGEUR, imprimée sur
--    58 % de la page quand le seuil des deux colonnes est à 60. Deux points. La
--    largeur est un bon indice du procédé et n'en est pas la preuve.
--
-- ⚠️ La MASSE du pic de papier les désigne : la part de la surface qui tient à
--    deux niveaux du pic vaut 3,6 % et 7,7 % pour elles, quand les gravures sur
--    bois du corpus rendent de 10,4 à 44 % et les photogravures déclarées de 2,7
--    à 9,2 %. L'écart entre les deux familles n'est que d'un point : trop mince
--    pour trancher seul, assez net pour désigner ce qu'il faut aller regarder.
--
-- ⚠️ `metadata.regime` est LU par `regimeIllustration` (app/lib/bibleEdition.ts)
--    et par la chaîne d'image. Une valeur inconnue y est ignorée.
--
-- Retour en arrière : sql/rollback_regime_force_demi_teintes_20260831.sql

update public.bible_edition_assets
set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'regime', 'au-fil',
      'regime_source', 'controle_visuel_20260831',
      'regime_motif', 'demi-teinte : trame de points visible à l’agrandissement, légende sans mention de procédé'
    ),
    updated_at = now()
where asset_key in ('fillion-t07-p0309-i01', 'fillion-t07-p0179-i01', 'fillion-t07-p0443-i01');

do $$
declare n int;
begin
  select count(*) into n from public.bible_edition_assets
  where asset_key in ('fillion-t07-p0309-i01', 'fillion-t07-p0179-i01', 'fillion-t07-p0443-i01')
    and metadata->>'regime' = 'au-fil';
  if n <> 3 then raise exception 'régime forcé posé sur % actifs au lieu de 3', n; end if;
  raise notice 'régime forcé posé sur les trois demi-teintes';
end $$;
