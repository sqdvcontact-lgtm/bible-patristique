-- Le régime et la part d'une gravure Fillion deviennent des DONNÉES de l'actif.
--
-- Jusqu'ici la page de lecture DÉRIVAIT le régime de composition (vignette,
-- au-fil, hors-texte) et la part de colonne à chaque affichage, à partir de trois
-- champs : `asset_kind`, `source_crop_box` et `printed_caption`. Cela a tenu tant
-- qu'une seule chaîne remplissait ces champs. Le lot de 1 Samuel (25 actifs,
-- 31 août 2026) posait `plate` sur vingt-trois vignettes, rangeait la largeur
-- imprimée dans `metadata.source` et portait sa propre catégorisation à dix
-- étiquettes libres (`metadata.composition_regime`) que rien ne lisait : la page
-- composait une lyre de monnaie comme une planche hors-texte, à la largeur de son
-- fichier, dans un passe-partout, et détourée mais rendue opaque.
--
-- Désormais la CHAÎNE écrit ces deux valeurs (`scripts/fillion/regime-gravure.mjs`
-- porte la règle, `inscrire-regime-gravures.mjs` la contrôle) et la PAGE les lit.
-- La base refuse tout autre vocabulaire, et refuse leur absence.
--
-- ⚠️ Le remplissage des 233 actifs existants se fait ici, une fois :
--   · le RÉGIME se lit sur le FICHIER SERVI (profil de traitement), qui est ce que
--     la page doit composer — un fichier détouré se compose en masque, un fichier
--     cadré est opaque. Sur les 208 actifs des Évangiles et du Pentateuque il
--     coïncide avec la règle ; sur 1 Samuel, deux photogravures sans « photographie »
--     dans leur légende n'existent QUE par leur fichier ;
--   · la PART suit la largeur imprimée, entre 0,36 et 0,88, plafonnée à 0,56 pour
--     une vignette qui tient dans une colonne ; une planche prend 0,88.
-- ⚠️ `create or replace view` conserve les droits ; la colonne s'ajoute EN FIN.

begin;

alter table public.bible_edition_assets
  add column regime text,
  add column part_colonne numeric(4, 3);

alter table public.bible_edition_assets
  add constraint bible_edition_assets_regime_check
    check (regime in ('vignette', 'au-fil', 'hors-texte')),
  add constraint bible_edition_assets_part_colonne_check
    check (part_colonne > 0 and part_colonne <= 1);

comment on column public.bible_edition_assets.regime is
  'Régime de composition dans la page, ÉCRIT par la chaîne d''image : vignette (détourée, encre reposée au rendu, habillable), au-fil (photogravure cadrée, opaque), hors-texte (page entière, passe-partout). La page le lit, elle ne le dérive plus. Règle : scripts/fillion/regime-gravure.mjs.';
comment on column public.bible_edition_assets.part_colonne is
  'Part du bloc de lecture (500 px) que la gravure occupe en largeur, de 0,36 à 0,88, ÉCRITE par la chaîne d''image d''après la largeur imprimée par Fillion. Le fichier web se sert au double : 2 × part × 500 px.';

-- 1. Le genre de 1 Samuel : vingt-trois « planches » qui sont des vignettes.
--    Le script de charge posait `plate` sur tout ce qui n'était ni ornement ni
--    plan. Une planche est une page entière du volume ; une lyre de monnaie
--    imprimée à un cinquième de page n'en est pas une.
update public.bible_edition_assets
set asset_kind = 'illustration'
where scope_book_code = '1SA' and asset_kind = 'plate';

-- 2. Le régime, lu sur le fichier servi.
update public.bible_edition_assets a
set regime = case
  when f.processing_profile = 'fillion-planche-hors-texte' then 'hors-texte'
  when f.processing_profile like '%cadree%' then 'au-fil'
  when f.processing_profile like '%detouree%' then 'vignette'
end
from public.bible_edition_asset_files f
where f.asset_id = a.id and f.variant_role = 'web';

-- 3. La part, d'après la largeur imprimée. Trois écritures de la découpe
--    coexistent, et on les lit toutes les trois : la boîte normalisée, les bornes
--    absolues avec la largeur de page, et le rapport que la chaîne de 1 Samuel a
--    rangé dans les métadonnées.
with largeurs as (
  select
    a.id,
    case
      when jsonb_typeof(a.source_crop_box -> 'normalized') = 'array'
        then (a.source_crop_box -> 'normalized' ->> 2)::numeric - (a.source_crop_box -> 'normalized' ->> 0)::numeric
      when (a.source_crop_box ? 'left') and (a.source_crop_box ? 'right') and (a.source_crop_box ? 'page_width_px')
        then ((a.source_crop_box ->> 'right')::numeric - (a.source_crop_box ->> 'left')::numeric)
             / nullif((a.source_crop_box ->> 'page_width_px')::numeric, 0)
      when (a.metadata -> 'source' ->> 'crop_width_ratio_of_page') is not null
        then (a.metadata -> 'source' ->> 'crop_width_ratio_of_page')::numeric
    end as largeur
  from public.bible_edition_assets a
)
update public.bible_edition_assets a
set part_colonne = round(
  case
    when a.regime = 'hors-texte' then 0.88
    when l.largeur is null then 0.36
    when l.largeur > 0.6 then least(0.88, greatest(0.36, l.largeur))
    else least(0.88, greatest(0.36, least(0.56, l.largeur)))
  end, 3)
from largeurs l
where l.id = a.id;

alter table public.bible_edition_assets
  alter column regime set not null,
  alter column part_colonne set not null;

-- 4. La vue par laquelle la page lit les actifs expose les deux colonnes.
create or replace view public.v_bible_edition_assets
with (security_invoker = true)
as
select
  a.id,
  a.family_id,
  a.asset_key,
  a.asset_kind,
  a.applies_to,
  a.applies_to_member_id,
  a.printed_caption,
  a.editorial_caption,
  a.alt_text,
  web.public_uri,
  web.width_px,
  web.height_px,
  web.byte_size,
  web.sha256 as web_sha256,
  web.storage_bucket as web_storage_bucket,
  web.storage_path as web_storage_path,
  a.printed_page,
  a.source_page_index,
  a.source_crop_box,
  a.detected_automatically,
  a.detection_profile,
  a.material_order,
  a.placement,
  a.semantic_scope_kind,
  a.scope_book_code,
  a.canon_id_start,
  a.canon_id_end,
  canon_start.ordre as canon_order_start,
  coalesce(canon_end.ordre, canon_start.ordre) as canon_order_end,
  a.body_block_id,
  a.note_id,
  a.classification_confidence,
  a.requires_review,
  a.metadata,
  a.regime,
  a.part_colonne
from public.bible_edition_assets a
left join public.versets_canon canon_start on canon_start.id = a.canon_id_start
left join public.versets_canon canon_end on canon_end.id = a.canon_id_end
left join public.bible_edition_asset_files web
  on web.family_id = a.family_id
  and web.asset_id = a.id
  and web.variant_role = 'web'
  and web.is_public
  and web.validation_status = 'validated';

notify pgrst, 'reload schema';

commit;
