-- RETOUR EN ARRIÈRE — la normalisation des noms de style du 29 août 2026.
--
-- Ce que la passe a fait, sur les 4 936 blocs de `bible_editorial_body_blocks` :
--
--   1. **Le nom canonique s'écrit partout.** 3 559 blocs portaient un nom HÉRITÉ —
--      `commentaire_pericope`, `introduction_livre`, `notice_chapitre` — ou ne
--      portaient rien du tout, laissant le style se DÉRIVER du couple
--      `block_kind × scope_kind` (68 blocs, tous des pièces liminaires). Ils portent
--      désormais l'un des dix noms canoniques employés par le corpus.
--
--   2. **Une INFORMATION déclare son rang, un TITRE le porte dans son nom.** Les
--      3 559 blocs d'information écrivent `semantic_level` ; les 1 377 titres l'ont
--      PERDU, car il ne disait rien que leur nom ne dise déjà — `titre_partie_livre`
--      EST le rang T2. ⚠️ 24 blocs portaient un rang écrit qui CONTREDISAIT celui de
--      leur nom, toujours d'un cran plus profond. Le nom l'a emporté, parce que c'est
--      lui que le rendu a toujours lu : la composition n'a donc pas bougé. Les 24 sont
--      relevés dans `internal.styles_rangs_ecartes_20260829`, à relire sur le
--      fac-similé — c'est une question philologique, pas technique.
--
--   3. **Le rôle d'affichage d'un sous-titre se dit `sous_titre`.** 201 blocs
--      portaient `part_subtitle` ou `section_subtitle`, deux noms qui prétendaient
--      dire dans le rôle un rang que le rôle ne sait pas dire : celui-ci vient du
--      TITRE auquel le sous-titre s'accroche.
--
-- ⛔ Le rendu n'a pas changé d'un bloc. Vérifié après écriture : sur les 4 936, le
-- couple (rang, nature) que le lecteur compose est identique au caractère près, et
-- aucun bloc ne se retrouve sans rang.
--
-- Sauvegarde : internal.backup_styles_normalisation_20260829 (4 936 lignes, l'état
-- exact d'avant la passe, métadonnée entière).

begin;

update bible_editorial_body_blocks b
   set metadata = s.metadata
  from internal.backup_styles_normalisation_20260829 s
 where s.id = b.id;

-- Contrôle : on doit retrouver 25 codes effectifs distincts, dont les noms hérités,
-- et 201 blocs portant de nouveau l'un des deux anciens rôles de sous-titre.
select count(distinct public.bible_style_semantique_effectif(metadata, block_kind, scope_kind)) as codes,
       count(*) filter (where metadata->'presentation'->>'display_role'
                             in ('part_subtitle', 'section_subtitle'))                          as anciens_roles,
       count(*) filter (where not (metadata ? 'semantic_style'))                                as styles_derives
  from bible_editorial_body_blocks;

commit;
