-- ⛔ QUATRE DÉCOUPES EMPORTAIENT CE QUI N'EST PAS LA GRAVURE.
--
-- Deux emportent la LÉGENDE IMPRIMÉE de Fillion : le site la recompose déjà sous
-- l'image depuis `printed_caption`, si bien qu'elle paraît deux fois — et celle
-- de p0059 est en outre coupée par le milieu des lettres. Deux autres emportent
-- un FILET DE COLONNE de la page imprimée, séparé du dessin par du papier vide.
--
-- ⚠️ Chaque coupe est prise sur le PROFIL D'ENCRE du feuillet, rangée par rangée
--    et colonne par colonne, dans le blanc franc qui sépare le dessin de ce qu'on
--    retire. Aucune n'est estimée à vue.
--
--   p0055 · droite au pixel 1050 sur 1076 : filet à 1067-1074, isolé par 24 px de blanc
--           bas    au pixel  895 sur  981 : deux lignes de légende à 911-935 et 959-981
--   p0059 · gauche au pixel   20 sur 1068 : filet à 0-6
--           bas    au pixel  765 sur  797 : une ligne de légende à 780-796
--   p0417 · droite au pixel 1095 sur 1129 : filet à 1115-1126
--   p0418 · gauche au pixel   40 sur 1146 : filet à 19-35, précédé de 18 px de papier vide
--
-- ⚠️ Les quatre gravures se refabriquent après cette écriture : la boîte décide de
--    la découpe ET de la largeur imprimée, donc de la taille servie.
--
-- Sauvegarde : internal.backup_decoupes_fillion_20260831
-- Retour en arrière : sql/rollback_decoupes_fautives_fillion_20260831.sql

create table if not exists internal.backup_decoupes_fillion_20260831 as
select id, asset_key, source_crop_box
from public.bible_edition_assets
where asset_key in ('fillion-t07-p0055-i01', 'fillion-t07-p0059-i01',
                    'fillion-t07-p0417-i01', 'fillion-t07-p0418-i01');

update public.bible_edition_assets set
  source_crop_box = jsonb_set(source_crop_box, '{normalized}', '[0.01, 0.542, 0.437971, 0.760962]'::jsonb),
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'decoupe_source', 'correction_20260831',
    'decoupe_motif', 'la légende imprimée sur deux lignes et un filet de colonne à droite étaient dans la découpe'),
  updated_at = now()
where asset_key = 'fillion-t07-p0055-i01';

update public.bible_edition_assets set
  source_crop_box = jsonb_set(source_crop_box, '{normalized}', '[0.463146, 0.64, 0.89, 0.827170]'::jsonb),
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'decoupe_source', 'correction_20260831',
    'decoupe_motif', 'la légende imprimée, coupée par le milieu des lettres, et un filet de colonne à gauche étaient dans la découpe'),
  updated_at = now()
where asset_key = 'fillion-t07-p0059-i01';

update public.bible_edition_assets set
  source_crop_box = jsonb_set(source_crop_box, '{normalized}', '[0, 0.595, 0.446147, 0.75]'::jsonb),
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'decoupe_source', 'correction_20260831',
    'decoupe_motif', 'un filet de colonne longeait le bord droit, séparé du dessin'),
  updated_at = now()
where asset_key = 'fillion-t07-p0417-i01';

update public.bible_edition_assets set
  source_crop_box = jsonb_set(source_crop_box, '{normalized}', '[0.539304, 0.476027, 0.989817, 0.805039]'::jsonb),
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'decoupe_source', 'correction_20260831',
    'decoupe_motif', 'un filet de colonne longeait le bord gauche, sur du papier vide'),
  updated_at = now()
where asset_key = 'fillion-t07-p0418-i01';

do $$
declare n int;
begin
  select count(*) into n from public.bible_edition_assets
   where metadata->>'decoupe_source' = 'correction_20260831';
  if n <> 4 then raise exception 'découpe corrigée sur % actifs au lieu de 4', n; end if;
  raise notice 'quatre découpes corrigées ; elles restent à refabriquer';
end $$;
