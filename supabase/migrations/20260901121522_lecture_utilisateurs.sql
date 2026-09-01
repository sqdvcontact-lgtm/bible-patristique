-- L'ÉTENDUE DE LECTURE D'UN LECTEUR — la mesure du rang.
--
-- Le rang se gagnait en commentant : un point par commentaire, quatre s'il était
-- validé, deux par mention reçue, quinze par essai. Sur un site dont l'objet est la
-- lecture des Pères, c'était un contresens — le lecteur silencieux qui a parcouru
-- quarante œuvres en sait plus que le commentateur prolixe — et c'était du même coup
-- le seul danger sérieux du système : le commentaire creux posté pour le compteur.
--
-- Il se mesure désormais sur le NOMBRE D'AUTEURS dont le lecteur a retenu quelque
-- chose, rapporté au nombre d'auteurs que la bibliothèque donne à lire. Un rapport,
-- non un total : il monte donc avec le corpus, et ne vieillit pas. Les degrés vivent
-- dans app/lib/classement.ts, sous garde.
--
-- ⚠️ Cette vue ne dit QUE des nombres. Quels auteurs un lecteur a marqués reste privé,
-- et ne sort que par /api/compte/retenu, pour lui seul. C'est le même partage que
-- `classement_utilisateurs`, qui expose depuis toujours combien de commentaires et
-- d'essais chacun a publiés, mais jamais lesquels.
--
-- ⚠️ Elle est en SECURITY DEFINER, comme `classement_utilisateurs` et pour la même
-- raison : en invoker, la RLS de `prelevements` et de `favoris` (« soi-même ») ferait
-- rendre zéro pour tout autre lecteur, et le rang cesserait de paraître sous les
-- commentaires. Elle ne rend que des agrégats.
--
-- ⛔ Elle ne recode AUCUNE règle du site qui soit complexe. Le siècle, notamment, n'y
-- entre pas : sa lecture est une vraie règle, écrite en TypeScript (app/lib/siecles.tsx),
-- et la doubler en SQL la ferait diverger — c'est la leçon déjà consignée pour la
-- mesure du grain des alignements. Les deux seuls emprunts sont le marqueur de
-- dépublication et le suffixe « #la » des favoris, tous deux littéraux.

create or replace view public.lecture_utilisateurs as
with lisibles as (
  select o.id_oeuvre, o.id_auteur
  from public.oeuvres o
  where o.note is distinct from '[Corpus Scriptura:depublie]'
    and coalesce(o.nb_signes, 0) > 0
),
corpus as (
  select count(distinct id_auteur) as total_auteurs from lisibles
),
marques as (
  -- Un passage prélevé dans une œuvre vaut marque sur son auteur.
  select p.user_id, l.id_auteur
  from public.prelevements p
  join lisibles l on l.id_oeuvre = p.id_oeuvre
  where p.type = 'patristique'
  union
  -- Une œuvre mise en bibliothèque aussi. « #la » désigne le texte original lu seul :
  -- il se résout sur l'œuvre porteuse (app/lib/refsFavoris.ts).
  select f.user_id, l.id_auteur
  from public.favoris f
  join lisibles l on l.id_oeuvre = split_part(f.ref_id, '#', 1)
  where f.type = 'oeuvre'
)
select
  pr.id                              as user_id,
  pr.pseudo,
  count(distinct m.id_auteur)::int   as nb_auteurs,
  (select total_auteurs from corpus)::int as total_auteurs
from public.profils pr
left join marques m on m.user_id = pr.id
group by pr.id, pr.pseudo;

grant select on public.lecture_utilisateurs to authenticated;

comment on view public.lecture_utilisateurs is
  'Étendue de lecture : combien d''auteurs du corpus un lecteur a marqués, sur combien la bibliothèque en donne à lire. Sert le rang (app/lib/classement.ts). Ne dit jamais LESQUELS.';
