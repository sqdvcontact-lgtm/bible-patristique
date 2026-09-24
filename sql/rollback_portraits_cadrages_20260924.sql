-- Retour arrière de la reprise des cadrages de portraits du 2026-09-24.
-- Sauvegardes : internal.backup_auteurs_portraits_20260924, internal.backup_profils_avatar_20260924.
begin;
update public.auteurs a set photo_position = b.photo_position, photo_version = b.photo_version
from internal.backup_auteurs_portraits_20260924 b where b.id_auteur = a.id_auteur;
update public.profils p set avatar_pos_x = b.avatar_pos_x, avatar_pos_y = b.avatar_pos_y, avatar_zoom = b.avatar_zoom
from internal.backup_profils_avatar_20260924 b where b.id = p.id;
commit;
-- Les originaux des portraits sont archivés tels quels dans le seau privé « auteurs-originaux » :
-- les recopier dans « auteurs » (même nom de fichier) rend le fichier d'avant.
