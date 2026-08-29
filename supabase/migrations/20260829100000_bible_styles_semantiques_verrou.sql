-- LE VERROU DU VOCABULAIRE DES STYLES BIBLIQUES.
--
-- ⛔ `semantic_style_code` était la SEULE chose non contrainte de la table. Tout le
-- reste l'était — `block_kind`, `scope_kind`, `notice_subtype`, `placement`,
-- `validation_status` —, mais le style, qui décide si le bloc paraît, était du texte
-- libre. C'est par là que quarante-cinq blocs sont entrés avec un style inconnu du
-- registre : `titre_division` dans la Genèse, `introduction_subsection` dans
-- Matthieu. Le rendu REFUSE un style inconnu au lieu de l'aplatir en paragraphe
-- générique : ces blocs ne paraissaient nulle part, en silence. Relevé le 2026-08-28
-- par l'audit, corrigé le 2026-08-29.
--
-- ⚠️ Le code n'est PAS une colonne : la vue le calcule. Il vaut
-- `metadata->>'semantic_style'` quand il est écrit, et se dérive sinon du couple
-- `block_kind` × `scope_kind`. Le verrou doit donc porter sur le code EFFECTIF —
-- une clé étrangère ne le peut pas, et une contrainte CHECK ne peut pas lire une
-- autre table. D'où une table de référence et un déclencheur.
--
-- ⚠️ Et le code dérivé peut lui aussi être faux : `transition` × `chapter` donne
-- `transition_chapitre`, que le registre ne connaît pas. Le déclencheur les attrape
-- tous les deux.

begin;

-- ── La table de référence ────────────────────────────────────────────────────
--
-- Elle est la copie en base de `work/fillion/semantic_display_hierarchy.json`, qui
-- reste la source. `scripts/fillion/semer-styles-semantiques.mjs` la sème, et
-- `bibleStylesSemantiques.test.ts` refuse qu'elles divergent.
--
-- ⛔ Ajouter un style, c'est l'écrire dans le registre PUIS resemer — jamais un
-- INSERT à la main : deux vocabulaires qui divergent valent moins qu'un seul.
create table if not exists public.bible_styles_semantiques (
  code                    text primary key,
  -- Le nom canonique quand ce code est un ALIAS ; nul pour un style de plein droit.
  alias_de                text references public.bible_styles_semantiques(code)
                            on update cascade on delete cascade,
  kind                    text check (kind in ('title', 'info', 'note')),
  niveau                  text,
  nature                  text,
  axe                     text check (axe in ('analytic', 'material')),
  au_plan                 boolean not null default false,
  role_intitule           text,
  niveau_intitule         text,
  bloc_de_corps           boolean not null default true,
  masque_par_navigation   boolean not null default false,
  note                    text,
  -- Un alias ne porte que son renvoi ; un style de plein droit porte sa définition.
  constraint bible_styles_semantiques_forme check (
    (alias_de is not null and kind is null)
    or (alias_de is null and kind is not null and niveau is not null and nature is not null)
  )
);

comment on table public.bible_styles_semantiques is
  'Vocabulaire CLOS des styles sémantiques du paratexte biblique. Copie en base de work/fillion/semantic_display_hierarchy.json, qui reste la source. Le déclencheur bible_style_semantique_connu() refuse tout bloc dont le style effectif n''y figure pas.';

-- ── Le code EFFECTIF, tel que la vue le calcule ──────────────────────────────
create or replace function public.bible_style_semantique_effectif(
  p_metadata jsonb, p_block_kind text, p_scope_kind text
) returns text
language sql immutable as $$
  select coalesce(
    p_metadata ->> 'semantic_style',
    (case p_block_kind
       when 'title' then 'titre'
       when 'commentary' then 'commentaire'
       when 'summary' then 'sommaire'
       else p_block_kind
     end) || '_' ||
    (case p_scope_kind
       when 'book_group' then 'groupe_livres'
       when 'book' then 'livre'
       when 'book_part' then 'partie'
       when 'chapter' then 'chapitre'
       else p_scope_kind
     end))
$$;

comment on function public.bible_style_semantique_effectif(jsonb, text, text) is
  'Le style d''un bloc tel que la lecture le voit : la métadonnée quand elle est écrite, le couple block_kind × scope_kind sinon. ⚠️ Doit rester identique au COALESCE de v_bible_editorial_body_blocks.';

-- ── Le déclencheur ───────────────────────────────────────────────────────────
create or replace function public.bible_style_semantique_connu()
returns trigger language plpgsql as $$
declare
  v_code text;
begin
  v_code := public.bible_style_semantique_effectif(new.metadata, new.block_kind, new.scope_kind);
  if not exists (select 1 from public.bible_styles_semantiques where code = v_code) then
    raise exception
      'Style sémantique inconnu : « % ». Le vocabulaire est CLOS (voir bible_styles_semantiques et work/fillion/semantic_display_hierarchy.json). Un style inconnu ne serait pas rendu du tout — le lecteur refuse ce qu''il ne sait pas composer, au lieu de l''aplatir.',
      v_code
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_bible_style_semantique_connu on public.bible_editorial_body_blocks;
create trigger trg_bible_style_semantique_connu
  before insert or update of metadata, block_kind, scope_kind
  on public.bible_editorial_body_blocks
  for each row execute function public.bible_style_semantique_connu();

-- ── Lecture publique du vocabulaire ──────────────────────────────────────────
alter table public.bible_styles_semantiques enable row level security;
drop policy if exists bible_styles_semantiques_lecture on public.bible_styles_semantiques;
create policy bible_styles_semantiques_lecture
  on public.bible_styles_semantiques for select using (true);

commit;
