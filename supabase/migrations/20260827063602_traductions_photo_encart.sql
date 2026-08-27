-- Une notice de traduction porte désormais DEUX images : le bandeau horizontal,
-- qui coiffe la carte et se voit fermée, et un encart au format portrait, posé
-- dans le bloc déplié.
--
-- Le bandeau reste dans `photo` — aucune donnée n'est déplacée. L'encart prend
-- sa propre colonne, parce qu'une image couchée serrée dans une boîte debout ne
-- montre jamais ce qu'un portrait montre : c'est précisément ce que faisait
-- l'image unique, cadrée deux fois par `photo_position`.
--
-- ⛔ Aucune donnée n'est modifiée, aucun droit n'est élargi : la colonne suit
-- les politiques déjà posées sur `traductions` (lecture publique des lignes non
-- privées, écriture réservée à l'administration).

begin;

alter table public.traductions add column if not exists photo_encart text;

comment on column public.traductions.photo_encart is
  'Image au format portrait de la notice publique (/traductions), affichée dans le bloc déplié. Le bandeau horizontal, lui, est dans `photo`. Cadrage : photo_position->>''encart''.';

commit;
