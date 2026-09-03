-- LA POLYGLOTTE LISAIT TOUT LE LIVRE POUR UN CHAPITRE. Elle filtre le chapitre par
-- `canon_id like 'GEN.1.%'`, et sous la collation de la base (en_US.UTF-8) un index
-- btree ordinaire ne sert pas un préfixe de LIKE. Le planificateur prenait donc
-- `idx_v2_native` (trad_id, livre, …), rapportait toutes les lignes du livre pour les
-- traductions affichées, et jetait le reste. Mesuré le 2026-09-03 : Genèse 1 sur
-- quatre traductions lisait 4 604 lignes pour en garder 93, en 391 ms ; le Psaume 119
-- en lisait 8 088 pour 22, en 525 ms.
--
-- `text_pattern_ops` ordonne les octets et rend le préfixe cherchable : le même
-- chapitre tombe à 93 lignes lues et 4 ms (éprouvé dans une transaction annulée).
create index if not exists idx_v2_trad_livre_canon_prefixe
  on public.versets_v2 (trad_id, livre, canon_id text_pattern_ops);
