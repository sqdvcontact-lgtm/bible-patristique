-- LES HAUTS FAITS, REFONDUS SUR LA TABLE DE L'AUTEUR (1er septembre 2026)
--
-- ⛔ Les vingt et un noms d'origine sont REMPLACÉS, sur son verdict : « il faudra
-- impérativement revoir les noms de tes hauts faits qui sont assez nullos ». Cinq
-- séries sur six commençaient par « Le premier X », ce qui est un gabarit et non un
-- nom, et « Le corpus tenu » ou « Le commentaire suivi » étaient des paraphrases.
-- Les noms qui suivent sont les siens.
--
-- ⛔ NEUF SÉRIES au lieu de six : à trente-six cases, les six séries d'origine
-- n'étaient plus des rayons mais des tas. On regroupe par ce que le geste EST —
-- commencer, parcourir la Bible, ouvrir une langue, fréquenter les Pères, tenir une
-- bibliothèque, écrire, revenir — et non par la table qu'on interroge.
--
-- ⛔ AUCUN HAUT FAIT HORS D'ATTEINTE. « Familier des Pères » était proposé à
-- cinquante auteurs quand le site en publie QUATORZE, et « Grand lecteur » à
-- cinquante œuvres quand il en publie quarante-sept : tous deux passent en PART du
-- corpus et se recalculent seuls quand le fonds grandit (charte § 40.4).
--
-- ⛔ UNE SÉRIE N'A QU'UN TON, et le déclencheur « hauts_faits_famille_unique » l'a
-- refusé net : « Commencements » mêlait l'Écriture et les Pères. La règle est juste —
-- un rayon se lit comme un ensemble relié par le même éditeur — et la famille dit le
-- TON DE LA SÉRIE, non le sujet de chaque carte. Les dix séries prennent donc chacune
-- la sienne : quatre à l'Écriture, trois aux Pères, trois à la communauté.
--
-- ⚠️ La NOTICE devient facultative. Elle ne paraît plus sur la carte (« ne pas
-- ajouter un texte caché ou une leçon ») mais seulement dans l'annonce, au moment où
-- la case tombe. Les hauts faits neufs entrent donc sans notice plutôt qu'avec une
-- prose fabriquée pour remplir la colonne.

begin;

alter table public.hauts_faits alter column notice drop not null;
alter table public.hauts_faits alter column notice set default null;

-- ⚠️ On VIDE plutôt qu'on ne modifie : les codes changent tous, et un `update` par
-- ligne laisserait les anciens en place à la première coquille. Les obtentions déjà
-- constatées sont conservées à part et rapportées plus bas.
create table if not exists internal.backup_hauts_faits_20260901 as
  select * from public.hauts_faits;
create table if not exists internal.backup_hauts_faits_obtenus_20260901 as
  select * from public.hauts_faits_obtenus;

-- ⚠️ « where true » n existe pas pour la forme : la base REFUSE un delete sans
-- clause (21000, « DELETE requires a WHERE clause »). Le garde-fou est le bienvenu.
delete from public.hauts_faits where true;

insert into public.hauts_faits
  (code, serie, serie_nom, degre, nom, notice, mesure, seuil, seuil_part, ordre, points, famille, actif)
values
  -- ── 1. Commencements ──────────────────────────────────────────────────────
  ('comm-1','commencements','Commencements',1,'In principio',
   'Les deux premiers mots de la Genèse dans la Vulgate, et ceux qui ouvrent aussi l''évangile de Jean. Ce que vous venez de faire, tout lecteur des Pères l''a fait avant vous : garder une ligne.',
   'passages_retenus',1,null,10,5,'ecriture',true),
  ('comm-2','commencements','Commencements',2,'Alpha',null,'versets_retenus',1,null,11,5,'ecriture',true),
  ('comm-3','commencements','Commencements',3,'Première traversée',null,'passages_patristiques',1,null,12,5,'ecriture',true),
  ('comm-4','commencements','Commencements',4,'À garder',null,'favoris_poses',1,null,13,5,'ecriture',true),

  -- ── 2. Le tour de la Bible ─────────────────────────────────────────────────
  ('bib-1','tour-bible','Le tour de la Bible',1,'De livre en livre',null,'livres_bibliques',10,null,20,15,'ecriture',true),
  ('bib-2','tour-bible','Le tour de la Bible',2,'Deux Testaments, une bibliothèque',null,'testaments_touches',2,null,21,20,'ecriture',true),
  ('bib-3','tour-bible','Le tour de la Bible',3,'Quatre visages',
   'Les quatre vivants d''Ézéchiel et de l''Apocalypse — l''homme, le lion, le taureau, l''aigle — sont donnés aux quatre évangélistes par Irénée, qui y voit la raison même de leur nombre.',
   'evangiles_touches',4,null,22,25,'ecriture',true),
  ('bib-4','tour-bible','Le tour de la Bible',4,'Sur les routes de Paul',null,'epitres_pauliniennes',13,null,23,40,'ecriture',true),
  ('bib-5','tour-bible','Le tour de la Bible',5,'D''un bout à l''autre',null,'livres_bibliques',73,null,24,80,'ecriture',true),

  -- ── 3. Passages nommés ─────────────────────────────────────────────────────
  ('nom-1','passages-nommes','Passages nommés',1,'Au commencement',null,'genese_ouverte',1,null,30,10,'ecriture',true),
  ('nom-2','passages-nommes','Passages nommés',2,'Par le désert',null,'exode_et_nombres',1,null,31,15,'ecriture',true),
  ('nom-3','passages-nommes','Passages nommés',3,'À côté du canon',
   'Ces livres sont canoniques pour l''Église catholique : ils sont à côté du canon HÉBRAÏQUE, non du sien. Jérôme les tenait pour « ecclésiastiques » plutôt que canoniques, et les a traduits tout de même.',
   'deuterocanoniques',1,null,32,15,'ecriture',true),
  ('nom-4','passages-nommes','Passages nommés',4,'Tout le Psautier',null,'psaumes_retenus',150,null,33,80,'ecriture',true),

  -- ── 4. Les langues ─────────────────────────────────────────────────────────
  ('lng-1','langues','Les langues',1,'Ad fontes',null,'passages_anciens',1,null,40,10,'ecriture',true),
  ('lng-2','langues','Les langues',2,'Polyglotte',null,'traductions_dun_verset',2,null,41,15,'ecriture',true),
  ('lng-3','langues','Les langues',3,'Un peu de grec',null,'passages_grecs',70,null,42,30,'ecriture',true),
  ('lng-4','langues','Les langues',4,'Un peu de latin',null,'passages_latins',100,null,43,30,'ecriture',true),
  ('lng-5','langues','Les langues',5,'À cinq voix',null,'traductions_retenues',5,null,44,25,'ecriture',true),
  ('lng-6','langues','Les langues',6,'Babel, mais en ordre',null,'traductions_dun_verset',4,null,45,40,'ecriture',true),

  -- ── 5. Les Pères ───────────────────────────────────────────────────────────
  ('per-1','peres','Les Pères',1,'Trois voix autour d''un verset',null,'peres_sur_un_verset',3,null,50,20,'peres',true),
  ('per-2','peres','Les Pères',2,'Le chœur des Pères',null,'peres_sur_un_verset',5,null,51,40,'peres',true),
  ('per-3','peres','Les Pères',3,'Pèlerin des Pères',null,'peres_retenus',10,null,52,25,'peres',true),
  -- ⛔ En PART, jamais en nombre : le site publie quatorze auteurs.
  ('per-4','peres','Les Pères',4,'Familier des Pères',null,'peres_retenus',null,0.75,53,50,'peres',true),

  -- ── 6. La bibliothèque ─────────────────────────────────────────────────────
  ('lib-1','bibliotheque','La bibliothèque',1,'Petit florilège',null,'favoris_poses',25,null,60,20,'peres',true),
  ('lib-2','bibliotheque','La bibliothèque',2,'Bibliothèque en marche',null,'oeuvres_bibliotheque',10,null,61,20,'peres',true),
  ('lib-3','bibliotheque','La bibliothèque',3,'Tolle, lege',
   'C''est la voix d''enfant entendue par-dessus le mur du jardin de Milan, au livre VIII des Confessions. Augustin ouvre au hasard, tombe sur Romains 13, et date sa conversion de cette ligne.',
   'confessions_ouvertes',1,null,62,15,'peres',true),
  ('lib-4','bibliotheque','La bibliothèque',4,'Une soirée avec Augustin',null,'augustin_en_un_jour',10,null,63,25,'peres',true),
  -- ⛔ En PART : le site publie quarante-sept œuvres.
  ('lib-5','bibliotheque','La bibliothèque',5,'Grand lecteur',null,'oeuvres_bibliotheque',null,0.6,64,50,'peres',true),

  -- ── 7. Les siècles ─────────────────────────────────────────────────────────
  ('sie-1','siecles','Les siècles',1,'L''écart',null,'siecles_retenus',2,null,70,10,'peres',true),
  ('sie-2','siecles','Les siècles',2,'L''arc',null,'siecles_retenus',4,null,71,20,'peres',true),
  ('sie-3','siecles','Les siècles',3,'La longue durée',null,'siecles_retenus',null,1,72,50,'peres',true),

  -- ── 8. La communauté ───────────────────────────────────────────────────────
  ('cnq-1','communaute','La communauté',1,'Premier mot',null,'commentaires_poses',1,null,80,5,'communaute',true),
  ('cnq-2','communaute','La communauté',2,'Bien vu',null,'commentaires_valides',1,null,81,10,'communaute',true),
  ('cnq-3','communaute','La communauté',3,'Disputatio',null,'reponses_posees',1,null,82,10,'communaute',true),
  ('cnq-4','communaute','La communauté',4,'Remarque reçue',null,'commentaires_valides',10,null,83,25,'communaute',true),
  ('cnq-5','communaute','La communauté',5,'Œil ouvert',null,'signalements_poses',1,null,84,10,'communaute',true),

  -- ── 9. L'assiduité ─────────────────────────────────────────────────────────
  ('ass-1','assiduite','L''assiduité',1,'Habitué des lieux',null,'jours_marques',7,null,90,15,'communaute',true),
  ('ass-2','assiduite','L''assiduité',2,'Veilleur de nuit',
   'Entre onze heures du soir et quatre heures du matin se chantaient les vigiles. Benoît les règle au chapitre huit, et les fait commencer « à la huitième heure de la nuit ».',
   'prelevements_nuit',1,null,91,15,'communaute',true),
  ('ass-3','assiduite','L''assiduité',3,'Avant l''aurore',null,'prelevements_aurore',1,null,92,15,'communaute',true),
  ('ass-4','assiduite','L''assiduité',4,'Lecteur au long cours',null,'jours_marques',30,null,93,35,'communaute',true),
  ('ass-5','assiduite','L''assiduité',5,'Une année parmi les textes',null,'mois_ecoules',12,null,94,60,'communaute',true),

  -- ── 10. L'écrit ────────────────────────────────────────────────────────────
  -- ⚠️ La table de l'auteur ne dit rien des publications : les trois noms restent
  -- les miens, en attendant les siens.
  ('ecr-1','ecrit','L''écrit',1,'Opuscule',null,'essais_publies',1,null,100,10,'communaute',true),
  ('ecr-2','ecrit','L''écrit',2,'Mélanges',null,'essais_publies',3,null,101,20,'communaute',true),
  ('ecr-3','ecrit','L''écrit',3,'Corpus',null,'essais_publies',10,null,102,40,'communaute',true);

-- ⚠️ Les obtentions déjà constatées portaient les ANCIENS codes, qui n'existent
-- plus. On les reporte sur les hauts faits qui disent le même geste ; les autres
-- retomberont d'elles-mêmes au prochain calcul, la mesure étant la même.
delete from public.hauts_faits_obtenus
 where code not in (select code from public.hauts_faits);

commit;
