-- Retour en arrière de la publication totale des œuvres du 2026-08-21.
--
-- Ce jour-là, les 17 œuvres encore retenues ont été ouvertes au public sur
-- demande explicite : le marqueur de dépublication a été effacé et
-- `acces_public` passé à vrai. Ce fichier restitue l'état exact d'avant, y
-- compris la date de dernière modification d'accès de chaque fiche.
--
-- Les motifs consignés dans `acces_public_note` n'ont pas été touchés par la
-- publication : ils restent lisibles et n'ont donc rien à restituer ici.
--
-- Pour tout refermer :
--   psql "$DATABASE_URL" -f sql/rollback_publication_totale_oeuvres_20260821.sql

begin;

update public.oeuvres set note = '[Corpus Scriptura:depublie]', acces_public = false, acces_public_modifie_le = '2026-08-06 10:55:15.354902+00' where id_oeuvre = 'A0010O0100'; -- Augustin, Annotations sur le livre de Job
update public.oeuvres set note = '[Corpus Scriptura:depublie]', acces_public = false, acces_public_modifie_le = '2026-08-16 06:31:12.231406+00' where id_oeuvre = 'A0010O0109'; -- Augustin, La Cité de Dieu
update public.oeuvres set note = '[Corpus Scriptura:depublie]', acces_public = false, acces_public_modifie_le = null                                where id_oeuvre = 'A0010O0110'; -- Augustin, Les Confessions
update public.oeuvres set note = '[Corpus Scriptura:depublie]', acces_public = false, acces_public_modifie_le = '2026-08-14 16:53:26.304644+00' where id_oeuvre = 'A0014O0049'; -- Chrysostome, Commentaire sur Isaïe
update public.oeuvres set note = '[Corpus Scriptura:depublie]', acces_public = false, acces_public_modifie_le = '2026-08-14 16:53:23.607542+00' where id_oeuvre = 'A0014O0089'; -- Chrysostome, Commentaire sur les Psaumes (t. V-VI)
update public.oeuvres set note = '[Corpus Scriptura:depublie]', acces_public = false, acces_public_modifie_le = '2026-08-14 16:53:32.330665+00' where id_oeuvre = 'A0014O0098'; -- Chrysostome, Synopse
update public.oeuvres set note = '[Corpus Scriptura:depublie]', acces_public = false, acces_public_modifie_le = null                                where id_oeuvre = 'A0044O0002'; -- Cyrille de Jérusalem, Catéchèses mystagogiques
update public.oeuvres set note = '[Corpus Scriptura:depublie]', acces_public = false, acces_public_modifie_le = null                                where id_oeuvre = 'A0044O0003'; -- Cyrille de Jérusalem, Catéchèses baptismales
update public.oeuvres set note = '[Corpus Scriptura:depublie]', acces_public = false, acces_public_modifie_le = null                                where id_oeuvre = 'A0044O0004'; -- Cyrille de Jérusalem, Lettre à l'empereur Constance
update public.oeuvres set note = '[Corpus Scriptura:depublie]', acces_public = false, acces_public_modifie_le = null                                where id_oeuvre = 'A0044O0005'; -- Cyrille de Jérusalem, Homélie sur le paralytique
update public.oeuvres set note = '[Corpus Scriptura:depublie]', acces_public = false, acces_public_modifie_le = null                                where id_oeuvre = 'A0044O0006'; -- Cyrille de Jérusalem, Homélie sur la Présentation au Temple
update public.oeuvres set note = '[Corpus Scriptura:depublie]', acces_public = false, acces_public_modifie_le = '2026-08-12 10:51:51.140428+00' where id_oeuvre = 'A0047O0012'; -- Grégoire de Nazianze, Discours 38-41
update public.oeuvres set note = '[Corpus Scriptura:depublie]', acces_public = false, acces_public_modifie_le = '2026-08-12 15:23:13.777194+00' where id_oeuvre = 'A0047O0034'; -- Grégoire de Nazianze, Discours 38
update public.oeuvres set note = '[Corpus Scriptura:depublie]', acces_public = false, acces_public_modifie_le = '2026-08-19 20:02:52.707286+00' where id_oeuvre = 'A0051O0049'; -- Jérôme, Commentaire sur Jonas
update public.oeuvres set note = '[Corpus Scriptura:depublie]', acces_public = false, acces_public_modifie_le = '2026-08-19 20:02:52.707286+00' where id_oeuvre = 'A0051O0050'; -- Jérôme, Commentaire sur Joël
update public.oeuvres set note = '[Corpus Scriptura:depublie]', acces_public = false, acces_public_modifie_le = '2026-08-19 20:02:52.707286+00' where id_oeuvre = 'A0051O0051'; -- Jérôme, Commentaire sur Abdias
update public.oeuvres set note = '[Corpus Scriptura:depublie]', acces_public = false, acces_public_modifie_le = '2026-08-17 12:37:50.384594+00' where id_oeuvre = 'A0176O0001'; -- Dhuoda, Manuel pour mon fils

commit;
