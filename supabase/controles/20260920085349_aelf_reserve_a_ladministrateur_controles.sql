-- CONTRÔLES : LE TEXTE AELF EST RÉSERVÉ À L'ADMINISTRATEUR (charte § 50.6)
--
-- ⛔ Le bloc se termine par un `raise exception` qui rend le RAPPORT et rembobine tout :
-- rien n'est écrit, et l'on peut le rejouer sur la base servie.
--
-- ⚠️ À REJOUER APRÈS TOUTE REPRISE DE LA CHAÎNE AELF. `create or replace view` sur
-- `v_aelf_polyglotte_cells` emporte silencieusement la garde de publication, et la fuite
-- se rouvre alors sur trois surfaces à la fois.

do $$
declare
  n integer; m integer; dire text;
  rapport text := ''; fautes integer := 0;
  jeton_admin text;
  privee text;
begin
  -- Une traduction PRIVÉE, prise dans la base plutôt que nommée ici : la garde ne
  -- connaît pas d'identifiant, et le contrôle non plus.
  select trad_id into privee from public.traductions
   where est_privee and est_biblique
     and exists (select 1 from public.versets_v2 v where v.trad_id = traductions.trad_id)
   order by trad_id limit 1;
  if privee is null then
    raise exception E'\n\nAucune traduction biblique privée dans la base : ce contrôle n''a rien à éprouver.\n';
  end if;
  rapport := rapport || format('     traduction privée éprouvée : %s', privee) || E'\n';

  -- ── 1. La garde est bien dans le corps de la vue ──────────────────────────
  n := position('cellule_publiable' in pg_get_viewdef('public.v_aelf_polyglotte_cells'::regclass, true));
  if n = 0 then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 1. garde de publication dans v_aelf_polyglotte_cells', dire) || E'\n';

  -- ── 2. La vue reste posée en BARRIÈRE ─────────────────────────────────────
  select count(*) into n from pg_class c join pg_namespace s on s.oid = c.relnamespace
   where s.nspname = 'public' and c.relname = 'v_aelf_polyglotte_cells'
     and 'security_barrier=true' = any(coalesce(c.reloptions, '{}'));
  if n <> 1 then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 2. security_barrier sur v_aelf_polyglotte_cells', dire) || E'\n';

  -- ── 3. Le rôle du lecteur n'a que la LECTURE sur les trois surfaces ───────
  select count(*) into n from unnest(array['v_aelf_polyglotte_cells','v_aelf_bible_lecture','v_aelf_bible_books_by_translation']) r(nom)
   where has_table_privilege('authenticated', ('public.' || r.nom)::regclass, 'INSERT')
      or has_table_privilege('authenticated', ('public.' || r.nom)::regclass, 'UPDATE')
      or has_table_privilege('authenticated', ('public.' || r.nom)::regclass, 'DELETE');
  if n <> 0 then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 3. aucune écriture offerte au lecteur : %s surface(s) fautive(s)', dire, n) || E'\n';

  -- ── 4. LE FAIT : sous le rôle du lecteur, la traduction privée ne rend rien 
  -- ⚠️ C'est le seul contrôle qui compte vraiment. Les trois précédents disent
  -- comment la porte est fermée ; celui-ci pousse dessus.
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  execute format($f$select count(*) from public.v_aelf_polyglotte_cells where trad_id = %L$f$, privee) into n;
  execute format($f$select count(*) from public.v_aelf_bible_books_by_translation where trad_id = %L$f$, privee) into m;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  if n <> 0 or m <> 0 then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 4. lecteur : %s cellule(s), %s livre(s) de la traduction privée', dire, n, m) || E'\n';

  -- ── 5. Et l'administrateur, lui, la lit ───────────────────────────────────
  -- ⚠️ Lire admin_users AVANT de prendre le rôle du lecteur : il n'y a pas droit.
  select format('{"sub":"%s","role":"authenticated"}', user_id) into jeton_admin from public.admin_users order by user_id limit 1;
  set local role authenticated;
  perform set_config('request.jwt.claims', jeton_admin, true);
  execute format($f$select count(*) from public.v_aelf_polyglotte_cells where trad_id = %L$f$, privee) into n;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  if n = 0 then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 5. administrateur : %s cellule(s) de la traduction privée', dire, n) || E'\n';

  -- ── 6. Une traduction PUBLIQUE n'a pas été emportée par la garde ──────────
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  select count(*) into n from public.v_aelf_polyglotte_cells
   where trad_id = 'TR0001' and aelf_book_code = 'GEN' and aelf_chapter_base = 1;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  if n = 0 then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 6. témoin public (Sacy, Gn 1) toujours lisible : %s cellule(s)', dire, n) || E'\n';

  -- ── 7. La table de la Fillion n'accueille aucune traduction privée ────────
  select count(*) into n from public.v_polyglotte_fillion f
   join public.traductions t on t.trad_id = f.trad_id where t.est_privee;
  if n <> 0 then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 7. v_polyglotte_fillion sans traduction privée : %s ligne(s)', dire, n) || E'\n';

  raise exception E'\n\n%\nFAUTES : %\n', rapport, fautes;
end
$$;
