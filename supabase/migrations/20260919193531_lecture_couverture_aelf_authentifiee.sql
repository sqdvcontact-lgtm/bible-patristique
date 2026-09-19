-- `v_aelf_bible_books_by_translation` est une vue publique en lecture seule,
-- mais elle traverse `v_aelf_polyglotte_extras` (security_invoker). Le rôle
-- authentifié doit donc pouvoir lire les trois tables internes utilisées par
-- cette vue imbriquée. Le schéma `internal` reste sans USAGE pour ce rôle :
-- ces tables ne deviennent pas directement accessibles par l'API.
grant select on table
  internal.bible_canonical_spine_versions,
  internal.bible_translation_spine_mappings,
  internal.bible_canonical_spine_mappings
to authenticated;
