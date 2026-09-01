-- LA NOTICE SE BORNE À CE QUE LA CARTE TIENT (1er septembre 2026)
--
-- Depuis que l'explication paraît AU SURVOL, à même la carte, sa longueur n'est plus
-- une affaire de goût : la carte mesure 148 px de haut sous une notice composée en
-- sérif de 10 px, et `overflow: hidden` coupe en silence ce qui dépasse.
--
-- ⚠️ LA CAPACITÉ EST MESURÉE, non estimée : dichotomie au navigateur sur la planche,
-- avec du texte réel et des mots longs — le pire cas, une notice de mots courts en
-- tenant davantage. Elle vaut 130 signes. On borne à 128, pour la marge d'un mot.
--
-- ⛔ DEUX notices dépassaient, et toutes deux sont de MOI, non de l'auteur : celle de
-- « Familier des Pères », que j'avais réécrite parce que la sienne annonçait
-- cinquante auteurs quand le site en publie quatorze, et celle de « La longue durée »,
-- pour laquelle il n'avait rien donné. Les quarante-deux siennes passent sans retouche.
--
-- ⛔ Et la contrainte, plutôt qu'une consigne : le référentiel se corrige librement en
-- base, sans déploiement — c'est tout son intérêt —, donc la seule façon d'empêcher
-- une notice trop longue est de la refuser à l'écriture. Une règle qui vit dans un
-- commentaire ne tient pas la main de qui édite une ligne six mois plus tard.

begin;

update public.hauts_faits
   set notice = 'Les trois quarts des auteurs que la bibliothèque donne à lire. Quelques-uns commencent à vous sembler de vieilles connaissances.'
 where code = 'per-4';

update public.hauts_faits
   set notice = 'Tous les siècles que la bibliothèque couvre. Braudel appelait cela la longue durée ; il ne parlait pas des Pères.'
 where code = 'sie-3';

alter table public.hauts_faits drop constraint if exists hauts_faits_notice_non_vide;
alter table public.hauts_faits add constraint hauts_faits_notice_non_vide
  check (length(btrim(notice)) between 1 and 128);

commit;
