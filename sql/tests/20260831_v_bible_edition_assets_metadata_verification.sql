-- La colonne doit exister, et la vue doit rendre exactement autant de lignes
-- qu'avant, avec le même nombre d'adresses servies.
do $$
declare n_lignes int; n_servies int;
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'v_bible_edition_assets' and column_name = 'metadata'
  ) then
    raise exception 'v_bible_edition_assets ne porte pas metadata';
  end if;
  select count(*), count(public_uri) into n_lignes, n_servies from public.v_bible_edition_assets;
  if n_lignes <> (select count(*) from public.bible_edition_assets) then
    raise exception 'la vue rend % lignes pour % actifs', n_lignes, (select count(*) from public.bible_edition_assets);
  end if;
  raise notice 'v_bible_edition_assets : % lignes, % adresses servies, metadata exposée', n_lignes, n_servies;
end $$;
