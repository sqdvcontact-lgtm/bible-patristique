-- Le portrait d'un lecteur devient une RÉFÉRENCE, non une adresse.
--
-- La page du compte écrivait `avatar_url` depuis le navigateur : la politique RLS
-- borne la ligne qu'un lecteur modifie, jamais la valeur qu'il y écrit, si bien
-- qu'une adresse extérieure y passait et que la page publique la servait ensuite à
-- tous ses visiteurs. La contrainte ci-dessous ferme la porte du côté où elle
-- devait l'être : le format est vérifié en base, et non seulement dans le code.
--
-- ⚠️ Le MÊME motif vit dans app/lib/portraits.ts, sous garde (portraits.test.ts).
-- Les deux doivent rester d'accord : celui-là écarte poliment, celle-ci refuse.
--
-- ⚠️ `avatar_url` et `avatar_nom` ne sont PAS supprimées ici. Elles sont vides sur
-- les six profils existants, mais une colonne se retire quand le nouveau chemin a
-- servi en ligne, pas le jour où on l'écrit. Voir la tâche [compte-colonnes-mortes]
-- du centre de contrôle.
alter table public.profils add column if not exists avatar_ref text;

alter table public.profils drop constraint if exists profils_avatar_ref_format;
alter table public.profils add constraint profils_avatar_ref_format
  check (avatar_ref is null or avatar_ref ~ '^(auteur|traduction):[A-Za-z0-9_-]{1,40}$');

comment on column public.profils.avatar_ref is
  'Portrait choisi : « auteur:A0010 » ou « traduction:TR0002 ». L''adresse se fabrique à la lecture (app/lib/portraits.ts). Jamais une URL.';
