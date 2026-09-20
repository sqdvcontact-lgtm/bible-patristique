-- LA MANCHETTE D'UN COMMENTAIRE : TROIS ÉTATS DE CLÔTURE, REPRÉSENTABLES
-- Doctrine : charte § 35.29.
--
-- ⛔ Jusqu'ici, l'absence de manchette ne se distinguait de rien : un commentaire
-- sans intitulé pouvait aussi bien n'en avoir jamais porté, en avoir perdu un à
-- l'import, ou n'avoir pas encore été relu. Une valeur vide disait quatre choses à
-- la fois, et aucune clôture n'était possible.
--
-- Deux colonnes, et elles ne décident de RIEN au rendu : la page compose la
-- manchette comme avant, depuis l'intitulé. Elles disent l'état du TRAVAIL.
--
--   manchette_etat = 'source'      l'intitulé est attesté par le témoin
--                    'editoriale'  composé par Corpus Scriptura, motivé
--                    'absente'     aucune manchette, et la raison est écrite
--   manchette_etat IS NULL         le bloc n'a PAS ENCORE été relu
--
-- ⚠️ Le `null` garde donc un sens, et un seul : « non traité ». C'est ce qui permet
-- à la clôture d'un livre d'exiger zéro `null` parmi les blocs éligibles, au lieu
-- d'exiger l'impossible d'une colonne qui mêlerait l'absence et l'oubli.
--
-- ⛔ `facsimile_heading` n'est pas touché et ne le sera pas : il ATTESTE une forme
-- imprimée. Une manchette éditoriale n'en reçoit jamais.
--
-- ⛔ Aucune ligne n'est renseignée par cette migration. L'état se pose livre par
-- livre, à la relecture, et c'est un travail de LECTURE.

alter table public.bible_editorial_body_blocks
  add column if not exists manchette_etat text,
  add column if not exists manchette_motif text;

comment on column public.bible_editorial_body_blocks.manchette_etat is
  'Charte § 35.29 — état de clôture de la manchette : source | editoriale | absente. NULL = pas encore relu. Ne décide de rien au rendu.';
comment on column public.bible_editorial_body_blocks.manchette_motif is
  'Charte § 35.29 — la raison, obligatoire pour « editoriale » et « absente ». Ce qui justifie un intitulé composé, ou une absence.';

-- ⛔ Le vocabulaire est CLOS, et le motif est exigé là où il fait la justification.
-- Un quatrième état ne s'invente pas dans une passe : il se décide à la charte.
alter table public.bible_editorial_body_blocks
  drop constraint if exists bible_editorial_body_blocks_manchette_etat_chk;
alter table public.bible_editorial_body_blocks
  add constraint bible_editorial_body_blocks_manchette_etat_chk check (
    manchette_etat is null
    or (
      manchette_etat in ('source', 'editoriale', 'absente')
      and (
        (manchette_etat = 'source' and manchette_motif is null)
        or (manchette_etat in ('editoriale', 'absente') and length(btrim(coalesce(manchette_motif, ''))) >= 8)
      )
    )
  );

-- ⚠️ Un motif sans état ne veut rien dire : il serait une note d'atelier posée dans
-- une colonne normative, et le `null` cesserait de signifier « non traité ».
alter table public.bible_editorial_body_blocks
  drop constraint if exists bible_editorial_body_blocks_manchette_motif_chk;
alter table public.bible_editorial_body_blocks
  add constraint bible_editorial_body_blocks_manchette_motif_chk check (
    manchette_motif is null or manchette_etat is not null
  );

-- L'index ne sert qu'au CONTRÔLE : compter les blocs éligibles non encore relus d'un
-- livre. Partiel, donc minuscule tant que la colonne est vide.
create index if not exists bible_editorial_body_blocks_manchette_etat_idx
  on public.bible_editorial_body_blocks (manchette_etat)
  where manchette_etat is not null;
