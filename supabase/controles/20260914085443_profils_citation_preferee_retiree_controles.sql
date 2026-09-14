-- CONTRÔLES DU RETRAIT DE `profils.citation_preferee`
--
-- ⛔ Le bloc se termine par un `raise exception` qui rend le RAPPORT et rembobine tout :
-- rien n'est écrit, et l'on peut le rejouer sur la base servie.
--
-- ⚠️ Le contrôle 2 est celui qui compte : retirer l'ancienne colonne ne doit rien défaire
-- de la nouvelle, ni ses deux colonnes, ni les contraintes qui en gardent la forme.

do $$
declare
  n integer; m integer; b boolean;
  rapport text := ''; fautes integer := 0; dire text;
begin
  -- ── 1. L'ancienne colonne n'existe plus ─────────────────────────────────────
  select count(*) into n from information_schema.columns
   where table_schema = 'public' and table_name = 'profils' and column_name = 'citation_preferee';
  if n <> 0 then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 1. colonne citation_preferee : %s (attendu 0)', dire, n) || E'\n';

  -- ── 2. Les deux colonnes de corpus demeurent, avec leurs contraintes ────────
  select count(*) into n from information_schema.columns
   where table_schema = 'public' and table_name = 'profils' and data_type = 'jsonb'
     and column_name in ('citation_favorite_biblique', 'citation_favorite_patristique');
  select count(*) into m from pg_constraint
   where conrelid = 'public.profils'::regclass and contype = 'c' and convalidated
     and conname in ('profils_citation_favorite_biblique_forme', 'profils_citation_favorite_patristique_forme');
  if n <> 2 or m <> 2 then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 2. colonnes de corpus : %s, contraintes validées : %s (attendu 2 et 2)', dire, n, m) || E'\n';

  -- ── 3. La sauvegarde existe, hors de portée des rôles du site ───────────────
  select count(*) into n from information_schema.tables
   where table_schema = 'internal' and table_name = 'backup_profils_citation_preferee_20260914';
  b := has_schema_privilege('anon', 'internal', 'USAGE') or has_schema_privilege('authenticated', 'internal', 'USAGE');
  if n <> 1 or b then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 3. sauvegarde dans internal : %s ; internal parcouru par anon ou authenticated : %s (attendu 1, false)', dire, n, b) || E'\n';

  -- ── 4. Rien ne nomme plus l'ancienne colonne ───────────────────────────────
  select count(*) into n from pg_proc pr join pg_namespace ns on ns.oid = pr.pronamespace
   where ns.nspname in ('public', 'internal') and pr.prokind in ('f', 'p')
     and pg_get_functiondef(pr.oid) ilike '%citation_preferee%';
  select count(*) into m from pg_class cl join pg_namespace ns on ns.oid = cl.relnamespace
   where cl.relkind in ('v', 'm') and ns.nspname in ('public', 'internal')
     and pg_get_viewdef(cl.oid) ilike '%citation_preferee%';
  if n <> 0 or m <> 0 then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 4. fonctions qui la nomment : %s ; vues : %s (attendu 0 et 0)', dire, n, m) || E'\n';

  -- ── 5. La garde des colonnes gelées est toujours posée ─────────────────────
  select count(*) into n from pg_trigger
   where tgrelid = 'public.profils'::regclass and tgname = 'trg_profils_garde_colonnes' and tgenabled <> 'D';
  if n <> 1 then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 5. déclencheur profils_garde_colonnes actif : %s (attendu 1)', dire, n) || E'\n';

  rapport := rapport || format(E'\n%s faute(s).', fautes);
  raise exception E'\n%', rapport;
end $$;
