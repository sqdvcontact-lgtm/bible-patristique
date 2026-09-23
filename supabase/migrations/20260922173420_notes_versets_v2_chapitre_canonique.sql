-- LES NOTES D'UN CHAPITRE NE SE CHERCHENT PLUS DANS TOUT LE LIVRE (audit du 2026-09-22).
--
-- `chargerNotesVersetsV2` filtrait par `canon_id like 'PSA.118.%'` et `ch_orig = 118` : un
-- `like` de préfixe ne se pose pas sur `idx_v2_trad_livre_canon_prefixe` quand un `or` le
-- joint à une autre colonne, si bien que la base parcourait les 13 163 lignes du livre pour
-- en rendre 2. Mesuré sous `authenticated` sur le Psaume 118, cache chaud : 33,7 ms,
-- 9 865 tampons, 13 161 lignes écartées, et la politique de lecture évaluée 1 165 fois.
--
-- La colonne ENGENDRÉE porte le chapitre du créneau canonique ; deux index PARTIELS
-- (`where notes is not null` : 2 509 lignes sur 220 361) rendent les deux branches du `or`
-- indexables, et le plan devient un BitmapOr. Après : 1,12 ms, 139 tampons, 0 ligne écartée,
-- la politique évaluée 2 fois. Genèse 1 (trois branches, le chapitre 0 de l'édition
-- compris) : 0,16 ms, 23 tampons.
--
-- ⚠️ Le `case` n'est pas un ornement : sans lui, un `canon_id` malformé ferait échouer
-- l'écriture de la ligne entière. Rien n'écrit cette colonne — elle est engendrée, et
-- PostgreSQL refuse qu'on l'écrive.
-- ⚠️ L'ajout RÉÉCRIT la table (2,9 s mesurées en transaction annulée, verrou exclusif ;
-- la réécriture la ramène au passage de 82 à 63 Mo). Les deux index pèsent 56 ko chacun.

set local lock_timeout = '10s';

alter table public.versets_v2
  add column canon_chapitre integer generated always as (
    case when split_part(canon_id, '.', 2) ~ '^[0-9]+$'
         then split_part(canon_id, '.', 2)::integer end
  ) stored;

comment on column public.versets_v2.canon_chapitre is
  'Le chapitre du créneau canonique (« PSA.118.5 » -> 118), engendré depuis canon_id. Il existe pour que les notes d''un chapitre se demandent par une égalité indexable plutôt que par un like de préfixe. 2026-09-22.';

create index idx_v2_notes_canon_chapitre
  on public.versets_v2 (trad_id, livre, canon_chapitre) where notes is not null;
create index idx_v2_notes_ch_orig
  on public.versets_v2 (trad_id, livre, ch_orig) where notes is not null;

analyze public.versets_v2;
