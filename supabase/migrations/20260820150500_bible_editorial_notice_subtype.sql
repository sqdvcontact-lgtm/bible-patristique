-- Sous-type facultatif des notices éditoriales.
-- La charte demande de garder les axes normalisés — nature, portée, position —
-- et de dériver le style sémantique. Le sous-type d'une notice ne rentre dans
-- aucun de ces trois axes : il qualifie la matière de la notice, non sa place.
-- Il reçoit donc sa propre colonne, facultative, et ne change pas le style
-- sémantique dérivé, qui reste « notice_livre », « notice_pericope », etc.
--
-- Migration strictement additive et réversible : une seule colonne nullable,
-- deux contraintes de cohérence, et la vue recréée à l'identique pour que
-- l'expansion de `b.*` reprenne la nouvelle colonne.

begin;

alter table public.bible_editorial_body_blocks
  add column notice_subtype text;

alter table public.bible_editorial_body_blocks
  add constraint bible_editorial_body_blocks_notice_subtype_vocabulary
  check (notice_subtype is null or notice_subtype in (
    'historical', 'geographical', 'literary',
    'doctrinal', 'chronological', 'liturgical', 'other'
  ));

-- Un sous-type de notice ne qualifie qu'une notice : une introduction ou un
-- commentaire qui en recevrait un signalerait une classification fautive.
alter table public.bible_editorial_body_blocks
  add constraint bible_editorial_body_blocks_notice_subtype_scope
  check (notice_subtype is null or block_kind = 'notice');

comment on column public.bible_editorial_body_blocks.notice_subtype is
  'Sous-type facultatif d une notice : historique, géographique, littéraire, doctrinal, chronologique, liturgique.';

-- `create or replace view` n'accepte que des colonnes ajoutées en fin de liste ;
-- la vue développait `b.*` avant ses colonnes calculées. On la reconstruit.
drop view public.v_bible_editorial_body_blocks;

create view public.v_bible_editorial_body_blocks
with (security_invoker = true)
as
select
  b.*,
  canon_start.ordre as canon_order_start,
  coalesce(canon_end.ordre, canon_start.ordre) as canon_order_end,
  (case b.block_kind
    when 'title' then 'titre'
    when 'commentary' then 'commentaire'
    when 'summary' then 'sommaire'
    else b.block_kind
  end) || '_' ||
  (case b.scope_kind
    when 'book_group' then 'groupe_livres'
    when 'book' then 'livre'
    when 'book_part' then 'partie'
    when 'chapter' then 'chapitre'
    else b.scope_kind
  end) as semantic_style_code
from public.bible_editorial_body_blocks b
left join public.versets_canon canon_start on canon_start.id = b.canon_id_start
left join public.versets_canon canon_end on canon_end.id = b.canon_id_end;

revoke all on table public.v_bible_editorial_body_blocks
from public, anon, authenticated;

grant select on table public.v_bible_editorial_body_blocks
to anon, authenticated, service_role;

notify pgrst, 'reload schema';
commit;
