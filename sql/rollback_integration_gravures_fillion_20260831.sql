-- Rétablit l'état de publication d'avant le 31 août 2026, depuis la sauvegarde.
update public.bible_edition_assets a
set is_public = b.asset_is_public, validation_status = b.asset_validation_status,
    metadata = b.asset_metadata, updated_at = now()
from (select distinct on (asset_id) asset_id, asset_is_public, asset_validation_status, asset_metadata
      from internal.backup_bible_edition_publication_20260831) b
where b.asset_id = a.id;

update public.bible_edition_asset_files f
set is_public = b.file_is_public, validation_status = b.file_validation_status, updated_at = now()
from internal.backup_bible_edition_publication_20260831 b
where b.file_id = f.id;
