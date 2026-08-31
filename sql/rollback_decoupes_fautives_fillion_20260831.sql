-- Rétablit les découpes d'avant le 31 août 2026. ⚠️ Les gravures se refabriquent
-- ensuite : la boîte décide de la découpe ET de la taille servie.
update public.bible_edition_assets a
set source_crop_box = b.source_crop_box,
    metadata = (a.metadata - 'decoupe_source' - 'decoupe_motif'),
    updated_at = now()
from internal.backup_decoupes_fillion_20260831 b
where b.id = a.id;
