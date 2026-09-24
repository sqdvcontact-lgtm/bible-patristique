set local lock_timeout = '5s';

-- La VERSION d'un portrait : l'instant de son dernier dépôt, en millisecondes.
-- Elle entre dans l'adresse (?v=) : une adresse stable tant que le fichier ne change
-- pas, neuve dès qu'il change. Elle remplace le ?v= horaire, qui retéléchargeait
-- chaque portrait toutes les heures et laissait la fiche sans version du tout.
alter table public.auteurs add column if not exists photo_version bigint;
comment on column public.auteurs.photo_version is
  'Instant (ms) du dernier dépôt du portrait dans le seau auteurs ; entre dans l''adresse (?v=). Écrit par /api/admin/auteur-photo.';

update public.auteurs a
   set photo_version = floor(extract(epoch from o.updated_at) * 1000)::bigint
  from storage.objects o
 where o.bucket_id = 'auteurs'
   and o.name = a.id_auteur || '.jpg';

-- Les VIGNETTES : copies réduites des portraits (même proportion, même cadrage),
-- pour les petits ronds des lecteurs. Les originaux du seau auteurs ne bougent pas.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('auteurs-vignettes', 'auteurs-vignettes', true, 524288, array['image/jpeg'])
on conflict (id) do nothing;
