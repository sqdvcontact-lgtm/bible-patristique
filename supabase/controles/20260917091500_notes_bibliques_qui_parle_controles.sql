-- CONTRÔLES : LES NOTES BIBLIQUES DISENT QUI PARLE (charte § 13.21)
--
-- ⛔ Le bloc se termine par un `raise exception` qui rend le RAPPORT et rembobine tout :
-- rien n'est écrit, et l'on peut le rejouer sur la base servie.

do $$
declare
  n integer; m integer; b boolean; t text;
  rapport text := ''; fautes integer := 0; dire text;
begin
  -- ── 1. Les deux vues restent en `security_invoker` ────────────────────────
  select count(*) into n from pg_class c join pg_namespace s on s.oid = c.relnamespace
   where s.nspname = 'public'
     and c.relname in ('v_bible_verse_notes', 'v_bible_editorial_body_block_notes')
     and 'security_invoker=true' = any(coalesce(c.reloptions, '{}'));
  if n <> 2 then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 1. vues en security_invoker : %s sur 2', dire, n) || E'\n';

  -- ── 2. La colonne `editorial_role` vient en fin de vue ────────────────────
  select count(*) into n from information_schema.columns
   where table_schema = 'public' and column_name = 'editorial_role'
     and ((table_name = 'v_bible_verse_notes' and ordinal_position = 17)
       or (table_name = 'v_bible_editorial_body_block_notes' and ordinal_position = 15));
  if n <> 2 then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 2. editorial_role en dernière colonne : %s sur 2', dire, n) || E'\n';

  -- ── 3. La vue rend ce que la table porte, ni plus ni moins ────────────────
  select count(*) filter (where editorial_role is not null) into n from public.v_bible_editorial_body_block_notes;
  select count(*) filter (where metadata ? 'editorial_role') into m from public.bible_editorial_body_block_notes;
  if n <> m then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 3. notes de bloc qui disent qui parle : vue %s, table %s', dire, n, m) || E'\n';

  select count(*) into n from public.v_bible_editorial_body_block_notes v, jsonb_array_elements(v.blocks) e
   where e ->> 'editorial_role' is not null;
  select count(*) into m from public.bible_editorial_body_block_note_blocks where metadata ? 'editorial_role';
  if n <> m then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 3 bis. blocs de notes de bloc qui le disent : vue %s, table %s', dire, n, m) || E'\n';

  select count(*) filter (where editorial_role is not null) into n from public.v_bible_verse_notes;
  select count(*) filter (where metadata ? 'editorial_role') into m from public.bible_verse_notes;
  if n <> m then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 3 ter. notes de verset qui le disent : vue %s, table %s', dire, n, m) || E'\n';

  -- ── 4. Rien d'autre n'a bougé : mêmes notes, mêmes blocs, mêmes renvois ────
  select count(*) into n from public.v_bible_verse_notes;
  select count(*) into m from public.bible_verse_notes;
  if n <> m then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 4. notes de verset : vue %s, table %s', dire, n, m) || E'\n';

  select count(*) into n from public.v_bible_editorial_body_block_notes v, jsonb_array_elements(v.blocks) e
   where e ->> 'kind' = 'internal_cross_reference';
  select count(*) into m from public.bible_editorial_body_block_note_blocks where kind = 'internal_cross_reference';
  if n <> m then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 4 bis. renvois internes servis : vue %s, table %s', dire, n, m) || E'\n';

  -- ── 5. Les droits de lecture du site n'ont pas changé ─────────────────────
  b := has_table_privilege('authenticated', 'public.v_bible_verse_notes', 'SELECT')
   and has_table_privilege('authenticated', 'public.v_bible_editorial_body_block_notes', 'SELECT');
  if not b then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 5. lecture accordée à authenticated : %s', dire, b) || E'\n';

  rapport := rapport || format(E'\n%s faute(s).', fautes);
  raise exception E'\n%', rapport;
end $$;
