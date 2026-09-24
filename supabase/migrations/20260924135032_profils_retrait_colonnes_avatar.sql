-- Espace du lecteur (charte § 40) : le portrait se choisit par référence depuis
-- le 2026-09-01. `avatar_url` et `avatar_nom` ne sont plus ni lues ni écrites,
-- aucune vue ni fonction n'en dépend, et elles sont vides pour tous les profils.
alter table public.profils drop column if exists avatar_url;
alter table public.profils drop column if exists avatar_nom;
