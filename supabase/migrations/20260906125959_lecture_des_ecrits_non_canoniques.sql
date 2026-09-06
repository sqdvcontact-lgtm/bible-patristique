-- Les écrits de la Septante qui n'ont pas de créneau canonique étaient ILLISIBLES.
-- `versets_apocryphes` tient 2 358 versets de TR0005 — la Septante de Swete, publiée et
-- visible — et aucun chemin ne les lisait : ni le site, ni une vue, ni une fonction ne
-- nommaient cette table (audit des liens, 2026-09-06). Sept livres sur dix n'existaient
-- nulle part ailleurs : 4 Maccabées, 1 Esdras, le Daniel grec, les Psaumes de Salomon,
-- 3 Maccabées, les Odes et le Psaume 151.
--
-- ⛔ ON NE LES FAIT PAS ENTRER DANS L'OSSATURE. Ils vivent hors de `versets_canon`, et
-- c'est juste : le Daniel grec est une RECENSION, non un doublon (charte, recensions des
-- versets apocryphes). Leur donner un créneau canonique reviendrait à dire qu'ils sont au
-- canon. On leur donne donc un chemin PARALLÈLE, au même contrat de lecture.

-- ── La lecture, au contrat exact de `versets_lecture` ─────────────────────────────
-- Les colonnes sont les mêmes, dans le même ordre, pour que le client n'ait rien à
-- apprendre : seule TR0005 est remplie, comme la vue large laisse vides les traductions
-- qui n'ont pas le créneau. ⚠️ Une seconde édition non canonique demanderait sa colonne
-- ici, exactement comme dans `versets_lecture`.
--
-- ⚠️ LA LETTRE DE JÉRÉMIE est numérotée au chapitre ZÉRO dans la source (73 versets d'un
-- seul tenant). Elle se lit au chapitre 1 : un livre dont le seul chapitre est le zéro
-- n'a, pour le volet de navigation, aucun chapitre du tout.
create or replace view public.versets_lecture_apocryphes
with (security_invoker = true) as
select
  a.livre || '.' || greatest(a.chapitre, 1) || '.' || a.verset || coalesce(a.v_suffixe, '') as id_verset,
  a.livre,
  greatest(a.chapitre, 1) as chapitre,
  a.verset,
  a.livre || ' ' || greatest(a.chapitre, 1) || ':' || a.verset || coalesce(a.v_suffixe, '') as ref,
  coalesce(a.est_suscription, false) as est_suscription,
  false as est_surnumeraire,
  greatest(a.chapitre, 1)::bigint * 1000000 + a.verset::bigint * 1000 as ordre,
  null::text as "TR0001",
  null::text as "TR0002",
  null::text as "TR0003",
  null::text as "TR0004",
  a.texte as "TR0005",
  null::text as "num_TR0001",
  null::text as "num_TR0002",
  null::text as "num_TR0003",
  null::text as "num_TR0004",
  greatest(a.chapitre, 1) || ', ' || a.verset || coalesce(a.v_suffixe, '') as "num_TR0005",
  a.notes
from public.versets_apocryphes a
where a.trad_id = 'TR0005';

comment on view public.versets_lecture_apocryphes is
  'Écrits sans créneau canonique, au contrat de lecture de versets_lecture. Le chapitre zéro de la Lettre de Jérémie est lu comme un premier chapitre.';

grant select on public.versets_lecture_apocryphes to authenticated, service_role;

-- ── Les livres OUVRABLES, canon compris ──────────────────────────────────────────
-- Le volet de navigation demandait ses nombres de chapitres à `livres_canon`, qui ne
-- connaît que l'ossature : les écrits non canoniques y valaient zéro chapitre, donc
-- grisés à jamais. Cette vue les ajoute SANS les mêler au canon — la colonne `canonique`
-- dit lequel est lequel, et c'est elle qui porte la marque affichée à côté du nom.
--
-- ⛔ `security_invoker` reste FAUX ici, à la différence de la vue de lecture : ce ne sont
-- que des NOMBRES DE CHAPITRES, la même nature d'information que `livres_canon` donne
-- déjà au rôle anonyme. En invoker, un visiteur sans droit de lecture sur
-- `versets_apocryphes` n'aurait pas eu zéro ligne mais une ERREUR, et le volet entier
-- serait tombé avec elle.
create or replace view public.livres_lisibles as
select code, chapitres, versets, true as canonique
from public.livres_canon
union all
select a.livre,
       max(greatest(a.chapitre, 1))::integer,
       count(*)::integer,
       false
from public.versets_apocryphes a
where a.livre not in (select code from public.livres_canon)
group by a.livre;

comment on view public.livres_lisibles is
  'Tous les livres ouvrables et leur nombre de chapitres. `canonique` est faux pour les écrits que le canon catholique ne reçoit pas.';

grant select on public.livres_lisibles to anon, authenticated, service_role;
