-- La vue des illustrations n'exposait pas `metadata`, si bien qu'un régime forcé
-- par la donnée n'aurait jamais atteint la page : elle lit les actifs par cette
-- vue et par elle seule. Même piège que `metadata.presentation` sur la vue des
-- blocs de corps, le 25 août 2026 — une métadonnée doit être EXPOSÉE pour être
-- lue, et rien ne signale qu'elle ne l'est pas.
--
-- ⚠️ La colonne s'ajoute EN FIN de vue : `create or replace` n'admet pas qu'on
--    en insère une au milieu.
-- ⚠️ `create or replace` conserve les droits déjà accordés : ne pas passer par
--    un `drop`, qui les emporterait.
-- ⚠️ La vue reste en `security_invoker` : elle s'exécute avec les droits de
--    l'appelant, et le filtre de publication de la jointure ne bouge pas.

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
  a.metadata
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
