-- ⚠️ PROPOSITION, NON APPLIQUÉE (2026-09-21). À jouer sur décision, puis faire lire
-- `metadata_lecture` à `COLONNES_BLOCS` (app/lib/notesStructureesChargement.ts) à la place
-- des huit colonnes `md_*`.
--
-- Le rendu d'une note ne lit que huit clés du jsonb `texte_note_blocs.metadata`
-- (`CLES_METADONNEES_BLOC_LUES`, app/lib/apparatCritique.ts). Ce jsonb porte aussi les
-- traces de toutes les passes d'atelier — 38,7 Mo sur les 7 277 blocs de l'apparat de
-- Knöll, 5,3 Ko par bloc — et il est logé hors de la ligne : chaque `metadata->cle` le
-- décompresse à nouveau. Mesuré le 21 septembre 2026 : 125 ms par tranche de mille blocs,
-- soit une seconde de base pour ouvrir les Confessions en regard de leur latin.
--
-- Une colonne ENGENDRÉE porte ces huit clés, et elles seules : la décompression se fait
-- une fois, à l'écriture, et la lecture ne touche plus au jsonb d'atelier.
-- ⛔ La liste doit rester celle de `CLES_METADONNEES_BLOC_LUES` : une clé ajoutée à la
-- lecture s'ajoute ICI aussi, sinon elle vaudra toujours null.
-- ⚠️ `add column … stored` réécrit la table : la jouer hors des heures de lecture, avec un
-- délai de verrou borné.

set local lock_timeout = '5s';

alter table public.texte_note_blocs
  add column if not exists metadata_lecture jsonb
  generated always as (
    jsonb_strip_nulls(jsonb_build_object(
      'editorial_role', metadata -> 'editorial_role',
      'printed_line', metadata -> 'printed_line',
      'visual_review_reason', metadata -> 'visual_review_reason',
      'human_validated', metadata -> 'human_validated',
      'citation_layout', metadata -> 'citation_layout',
      'bibliography_list_item', metadata -> 'bibliography_list_item',
      'reader_style', metadata -> 'reader_style',
      'reader_label', metadata -> 'reader_label'
    ))
  ) stored;

comment on column public.texte_note_blocs.metadata_lecture is
  'Les seules clés de metadata que le rendu d''une note lit (CLES_METADONNEES_BLOC_LUES). Engendrée : ne s''écrit pas.';
