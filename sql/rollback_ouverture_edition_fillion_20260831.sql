-- Referme l'édition Fillion : rétablit les métadonnées de source d'avant le
-- 31 août 2026, « test_only » compris.
update public.bible_text_sources s
set metadata = b.metadata, updated_at = now()
from internal.backup_bible_text_sources_fillion_20260831 b
where b.id = s.id;
