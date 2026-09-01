-- LE RÉFÉRENTIEL DES HAUTS FAITS — six séries, vingt et un degrés.
--
-- ⛔ Les NOTICES sont du contenu éditorial, et c'est pour cela qu'elles vivent en base
-- et non dans le code : elles se corrigent sans déploiement. Chacune doit APPRENDRE
-- quelque chose de vrai sur le corpus ; aucune ne doit féliciter. C'est la seule forme
-- de retour qui soit de la même étoffe que la lecture, et donc la seule qui ne se
-- substitue pas à l'envie de lire (Deci, Koestner et Ryan, 1999).
--
-- ⚠️ Les derniers degrés des séries « peres » et « siecles » sont exprimés en PART du
-- corpus : ils montent avec la bibliothèque, et ne peuvent donc devenir ni impossibles
-- ni triviaux. Les autres sont des nombres, à recalibrer après l'ouverture sur la
-- distribution réelle — aucune rareté ne se mesure sur six comptes.

insert into public.hauts_faits (code, serie, serie_nom, degre, nom, notice, mesure, seuil, seuil_part, ordre) values
-- ── La glane : les passages retenus, bibliques et patristiques confondus ──────
('glane-1','glane','La glane',1,'Le premier glané',
 'Garder un passage n''est pas une habitude moderne. Les florilèges byzantins et les chaînes latines sont nés du même geste, et c''est par eux qu''une part de ce qu''écrivirent les Pères nous est parvenue : leurs œuvres complètes, elles, ont souvent disparu.',
 'passages_retenus',1,null,10),
('glane-2','glane','La glane',2,'Le florilège',
 'Un florilège, littéralement, est une cueillette de fleurs. Le mot dit bien ce qu''il fait : on ne recopie pas une œuvre entière, on retient ce qui brille, et l''on finit par se constituer un livre que personne d''autre ne possède.',
 'passages_retenus',10,null,11),
('glane-3','glane','La glane',3,'La chaîne',
 'La chaîne, en grec seira, en latin catena, est le genre propre à l''exégèse patristique : sur un même verset, on aligne ce qu''en ont dit plusieurs Pères. Le sens ne sort pas d''une voix, mais de leur suite — et parfois de leur désaccord.',
 'passages_retenus',50,null,12),
('glane-4','glane','La glane',4,'Le trésor',
 'Deux cents passages : c''est l''ordre de grandeur d''un recueil médiéval qu''un moine mettait des années à composer. La Bibliothèque de Photios, au IXe siècle, résume ainsi près de trois cents ouvrages, dont une grande part est aujourd''hui perdue par ailleurs.',
 'passages_retenus',200,null,13),

-- ── La bibliothèque : les œuvres mises de côté ───────────────────────────────
('livres-1','livres','La bibliothèque',1,'Le premier rayon',
 'Mettre une œuvre de côté, c''est déclarer qu''on y reviendra. C''est le geste qui distingue une lecture d''un passage : on ne garde que ce qu''on entend relire.',
 'oeuvres_bibliotheque',1,null,20),
('livres-2','livres','La bibliothèque',2,'L''étagère',
 'Cinq œuvres. Les bibliothèques monastiques du haut Moyen Âge n''en comptaient parfois pas beaucoup plus : le catalogue de Saint-Riquier, en 831, en recense environ deux cent cinquante, ce qui en faisait l''une des plus riches d''Occident.',
 'oeuvres_bibliotheque',5,null,21),
('livres-3','livres','La bibliothèque',3,'Le cabinet',
 'Quinze œuvres tenues ensemble forment déjà un point de vue. C''est à ce moment que le choix devient visible : ce que vous gardez dit ce que vous cherchez, et un corpus personnel commence à se distinguer du fonds où il a été pris.',
 'oeuvres_bibliotheque',15,null,22),
('livres-4','livres','La bibliothèque',4,'La librairie',
 'On disait autrefois « librairie » pour bibliothèque — celle de Charles V, au Louvre, comptait près de mille volumes à sa mort en 1380. Le mot a changé de sens, mais le geste est resté le même : rassembler, et pouvoir retrouver.',
 'oeuvres_bibliotheque',40,null,23),

-- ── Les Pères : combien de voix distinctes ───────────────────────────────────
('peres-1','peres','Les Pères',1,'La première voix',
 'Un Père de l''Église n''est pas un auteur parmi d''autres : le titre suppose l''ancienneté, l''orthodoxie de la doctrine, la sainteté de la vie et l''approbation de l''Église. Ce sont les quatre marques que la tradition retient depuis le XVIIe siècle.',
 'peres_retenus',1,null,30),
('peres-2','peres','Les Pères',2,'Le chœur',
 'Cinq voix, et déjà des désaccords. La patristique n''est pas un bloc : Origène et Jérôme se sont opposés, Augustin a corrigé ses propres livres dans ses Rétractations. C''est ce frottement, et non une doctrine lisse, qui fait la tradition.',
 'peres_retenus',5,null,31),
('peres-3','peres','Les Pères',3,'Le concert',
 'Dix Pères fréquentés. Beaucoup ne nous sont connus que par des tiers : une grande part d''Origène ne survit qu''en latin, dans la traduction de Rufin d''Aquilée, et l''on discute encore de ce que Rufin y a adouci.',
 'peres_retenus',10,null,32),
('peres-4','peres','Les Pères',4,'Le corpus tenu',
 'Les trois quarts des auteurs que la bibliothèque donne à lire. Ce seuil monte avec elle : il n''est pas un nombre fixe, mais une part, et il se déplace à chaque œuvre nouvelle. On ne finit pas un corpus vivant.',
 'peres_retenus',null,0.750,33),

-- ── Les siècles ─────────────────────────────────────────────────────────────
('siecles-1','siecles','Les siècles',1,'Deux siècles',
 'Lire deux siècles, c''est déjà lire une langue qui bouge. Le grec de Justin n''est pas celui de Jean Chrysostome, et le latin de Tertullien, qui forge son vocabulaire à mesure, n''est pas celui de Jérôme, qui en hérite.',
 'siecles_retenus',2,null,40),
('siecles-2','siecles','Les siècles',2,'L''arc du temps',
 'Quatre siècles. L''âge dit patristique court en gros du IIe au VIIIe : d''un côté les apologistes, qui écrivent sous la persécution ; de l''autre des évêques d''un Empire devenu chrétien. Ce ne sont pas les mêmes livres.',
 'siecles_retenus',4,null,41),
('siecles-3','siecles','Les siècles',3,'De bout en bout',
 'Tous les siècles que la bibliothèque représente. La coupure entre Pères et scolastiques est une commodité de manuel : Thomas d''Aquin cite les Pères à chaque page, et la Chaîne d''or qu''il compose n''est rien d''autre qu''un florilège.',
 'siecles_retenus',null,1.000,42),

-- ── La parole : les commentaires validés ────────────────────────────────────
('parole-1','parole','La parole',1,'Le premier mot',
 'Commenter, c''est se ranger dans une suite. Vous écrivez sous les mêmes versets que ceux dont vous venez de lire les gloses, et votre commentaire paraît à côté du leur.',
 'commentaires_valides',1,null,50),
('parole-2','parole','La parole',2,'La glose',
 'La glose était d''abord un mot rare, expliqué en marge. De là vient la Glossa ordinaria, qui a encadré le texte biblique de tout le Moyen Âge : la marge avait fini par peser autant que la page.',
 'commentaires_valides',5,null,51),
('parole-3','parole','La parole',3,'Le commentaire suivi',
 'Vingt-cinq passages commentés. C''est le format du commentaire suivi, celui d''Origène sur Jean ou d''Augustin sur les Psaumes : on n''y traite plus un verset isolé, mais un livre entier, verset après verset.',
 'commentaires_valides',25,null,52),

-- ── L'écrit : les essais publiés ────────────────────────────────────────────
('ecrit-1','ecrit','L''écrit',1,'Le premier essai',
 'Un essai n''est pas un commentaire allongé : il tient d''un bout à l''autre par sa propre construction. C''est ce que faisaient les homélies, qui étaient d''abord des textes tenus devant une assemblée.',
 'essais_publies',1,null,60),
('ecrit-2','ecrit','L''écrit',2,'Le recueil',
 'Trois essais font un ensemble, et l''ensemble dit autre chose que la somme. Les Pères publiaient ainsi : les traités d''Augustin se répondent d''un livre à l''autre, et il les a relus tous à la fin de sa vie.',
 'essais_publies',3,null,61),
('ecrit-3','ecrit','L''écrit',3,'L''œuvre',
 'Dix essais. À ce point, ce n''est plus une suite de textes mais un travail, avec ses reprises et ses repentirs — ce qu''Augustin appelait, sans se dédire, ses Rétractations.',
 'essais_publies',10,null,62)
on conflict (code) do update set
  serie_nom = excluded.serie_nom, nom = excluded.nom, notice = excluded.notice,
  mesure = excluded.mesure, seuil = excluded.seuil, seuil_part = excluded.seuil_part, ordre = excluded.ordre;
