-- L'index de la requête la plus émise du site : les segments d'une DIVISION, dans
-- l'ordre de lecture. Elle est émise par le rendu serveur (la tranche initiale), par le
-- client (chaque lot de complétion), et par le préchargement des divisions voisines.
--
-- ⛔ QUATRE COLONNES, ET DANS CET ORDRE. Un index sur `(id_texte, ref_niv1,
-- segment_numero)` a été éprouvé d'abord, en transaction annulée : le planificateur le
-- combine par `BitmapAnd` avec `segments_id_oeuvre_idx`, l'ordre est perdu, le tri
-- revient, et le gain tombe des deux tiers (148 → 105 ms au lieu de 148 → 20,7). C'est la
-- clause `id_oeuvre` — redondante, puisqu'un texte appartient à une œuvre — qui l'impose.
-- La retirer des six sites d'appel serait l'autre voie ; l'index ne coûte presque rien.
--
-- ⚠️ MESURES RÉELLES, prises sur la base le 9 septembre 2026, après application, à chaud
-- des deux côtés. Somme théologique (`A0013O0002` / `TXT_A0013O0002_LEGACY`, 32 367
-- segments), division « Secunda Secundae » (9 094 segments) :
--
--   lot du RENDU SERVEUR (offset 0)   : 148 ms → 3,0 ms
--   lot de COMPLÉTION (offset 8000)   : 148 ms → 20,7 ms
--
-- Le plan d'avant parcourait les 32 367 lignes du texte, en écartait 23 273 par filtre,
-- puis triait les 9 094 restantes en mémoire (« Sort Method: quicksort ») pour en rendre
-- mille. Le plan d'après est un parcours d'index ORDONNÉ : ni tri, ni lignes écartées.
-- À froid — l'état ordinaire d'une base peu sollicitée — le même lot mettait 1 024 ms.
--
-- ⚠️ Et le travail se paie UNE FOIS PAR LOT : « Secunda Secundae » en compte dix, plus
-- ceux des deux divisions préchargées. C'est là que le gain se multiplie.
--
-- ⚠️ `segments` porte déjà cinq index GIN dont l'écriture est chère, et les imports
-- écrivent par lots ; un btree de plus est peu de chose à côté, mais la remarque est à
-- verser au dossier. L'index pèse ~5 Mo pour une table de 174 Mo.
--
-- ⛔ Ce qu'il ne corrige PAS : la pagination reste en `OFFSET`, donc le coût d'un lot
-- croît avec son rang (3,0 ms au premier, 20,7 ms au neuvième). La pagination par
-- curseur (`segment_numero > dernier`) est le remède de fond, et elle demande de toucher
-- les deux chargeurs — c'est un chantier, non une migration.
create index if not exists segments_lecture_division_idx
  on public.segments (id_texte, id_oeuvre, ref_niv1, segment_numero);

analyze public.segments;
