-- Retire le régime forcé posé le 31 août 2026 sur les deux demi-teintes.
update public.bible_edition_assets
set metadata = (metadata - 'regime' - 'regime_source' - 'regime_motif'),
    updated_at = now()
where asset_key in ('fillion-t07-p0309-i01', 'fillion-t07-p0179-i01');
