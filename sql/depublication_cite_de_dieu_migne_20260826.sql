-- Dépublication du latin de Migne de « La Cité de Dieu » (2026-08-26).
--
-- L'œuvre A0010O0109 porte le texte latin de la Patrologia Latina, tome XLI.
-- L'importation s'était arrêtée à la Praefatio : six segments, 1 411 signes,
-- soit la seule préface d'un ouvrage qui compte vingt-deux livres. Le site ne
-- doit donc pas la proposer à la lecture. Décision de l'auteur, prise sur
-- constat : ne pas offrir cette version, la dépublier, ne rien supprimer.
--
-- Les deux verrous sont posés ensemble, comme la doctrine l'exige : le
-- marqueur retire la fiche des listes du site, `acces_public` ferme la RLS.
-- Aucun segment, aucune ligne d'`oeuvre_textes` n'est touché : la version
-- textuelle TXT_A0010O0101_LA_1845_MIGNE_PL41 était déjà `draft` et non
-- publique, le déclencheur de dépublication ne bronche donc pas.
--
-- Le latin complet de la Cité de Dieu reste servi ailleurs, sous l'œuvre
-- A0010O0002 (édition Vivès, 1873, 2 001 385 signes), en regard du français.
--
-- Pour appliquer :
--   psql "$DATABASE_URL" -f sql/depublication_cite_de_dieu_migne_20260826.sql
--
-- Retour en arrière (rouvrir la fiche telle qu'elle était ce matin) :
--   update public.oeuvres
--      set note = null,
--          acces_public = true,
--          acces_public_note = 'Import partiel : préface latine seulement ; œuvre distincte de l''édition Vivès.',
--          acces_public_modifie_le = '2026-08-21 07:12:02.158256+00'
--    where id_oeuvre = 'A0010O0109';

begin;

update public.oeuvres
set note = '[Corpus Scriptura:depublie]',
    acces_public = false,
    acces_public_note = 'Import partiel : le latin de Migne se réduit à la Praefatio, six segments et 1 411 signes. Cette version n''est pas proposée à la lecture tant que les vingt-deux livres ne sont pas importés. Dépubliée le 26 août 2026 sans suppression de données. Œuvre distincte de l''édition Vivès (A0010O0002), qui porte le texte latin complet en regard du français.',
    acces_public_modifie_le = now()
where id_oeuvre = 'A0010O0109';

commit;
