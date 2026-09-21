-- Appliquée le 21 septembre 2026 (version du journal : 20260921180931).
--
-- Le rendu d'une note ne lit que huit clés du jsonb `texte_note_blocs.metadata`
-- (`CLES_METADONNEES_BLOC_LUES`, app/lib/apparatCritique.ts). Ce jsonb porte aussi les
-- traces de toutes les passes d'atelier : 38,7 Mo sur les 7 277 blocs de l'apparat de
-- Knöll, 5,3 Ko par bloc, logés hors de la ligne ; chaque `metadata->cle` le décompresse
-- à nouveau. Mesuré le 21 septembre 2026 : 125 ms par tranche de mille blocs.
--
-- Une colonne ENGENDRÉE porte ces huit clés, et elles seules : la décompression se fait
-- une fois, à l'écriture. `SELECT_METADONNEES_BLOC_LUES` lit `metadata_lecture`.
-- ⛔ La liste doit rester celle de `CLES_METADONNEES_BLOC_LUES` : une clé ajoutée à la
-- lecture s'ajoute ICI aussi (nouvelle migration qui remplace la fonction), sinon elle
-- vaudra toujours null.
-- ⚠️ `jsonb_build_object` est STABLE (argument « any ») et une colonne engendrée exige une
-- expression IMMUTABLE : la fonction la déclare, ce qu'elle est de fait sur du jsonb.

set local lock_timeout = '5s';

create or replace function public.metadata_lecture_de(m jsonb)
returns jsonb language sql immutable parallel safe
set search_path = ''
as $$
  select pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
    'editorial_role', m -> 'editorial_role',
    'printed_line', m -> 'printed_line',
    'visual_review_reason', m -> 'visual_review_reason',
    'human_validated', m -> 'human_validated',
    'citation_layout', m -> 'citation_layout',
    'bibliography_list_item', m -> 'bibliography_list_item',
    'reader_style', m -> 'reader_style',
    'reader_label', m -> 'reader_label'
  ))
$$;

alter table public.texte_note_blocs
  add column if not exists metadata_lecture jsonb
  generated always as (public.metadata_lecture_de(metadata)) stored;

comment on column public.texte_note_blocs.metadata_lecture is
  'Les seules clés de metadata que le rendu d''une note lit (CLES_METADONNEES_BLOC_LUES). Engendrée : ne s''écrit pas.';
