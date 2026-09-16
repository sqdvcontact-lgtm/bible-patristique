-- CONTRÔLES DU RETRAIT DE `parametres.charte_accentuation` ET `parametres.directives_propositions_gpt`
--
-- ⛔ Le bloc se termine par un `raise exception` qui rend le RAPPORT et rembobine tout :
-- rien n'est écrit, et l'on peut le rejouer sur la base servie.

do $$
declare
  n integer; m integer; b boolean;
  rapport text := ''; fautes integer := 0; dire text;
begin
  -- ── 1. Les deux clés ont quitté `parametres` ──────────────────────────────
  select count(*) into n from public.parametres
   where cle in ('charte_accentuation', 'directives_propositions_gpt');
  if n <> 0 then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 1. clés restantes : %s (attendu 0)', dire, n) || E'\n';

  -- ── 2. La sauvegarde les porte, texte entier ──────────────────────────────
  select count(*), coalesce(max(length(valeur)) filter (where cle = 'charte_accentuation'), 0)
    into n, m from internal.backup_parametres_20260916;
  if n <> 2 or m < 6000 then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 2. lignes sauvegardées : %s ; charte d''accentuation : %s signes (attendu 2, au moins 6 000)', dire, n, m) || E'\n';

  -- ── 3. La sauvegarde est hors de portée des rôles du site ─────────────────
  b := has_schema_privilege('anon', 'internal', 'USAGE') or has_schema_privilege('authenticated', 'internal', 'USAGE');
  if b then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 3. internal parcouru par anon ou authenticated : %s (attendu false)', dire, b) || E'\n';

  -- ── 4. Rien ne nomme plus les deux clés ───────────────────────────────────
  select count(*) into n from pg_proc pr join pg_namespace ns on ns.oid = pr.pronamespace
   where ns.nspname in ('public', 'internal') and pr.prokind in ('f', 'p')
     and (pg_get_functiondef(pr.oid) ilike '%charte_accentuation%' or pg_get_functiondef(pr.oid) ilike '%directives_propositions_gpt%');
  select count(*) into m from pg_class cl join pg_namespace ns on ns.oid = cl.relnamespace
   where cl.relkind in ('v', 'm') and ns.nspname in ('public', 'internal')
     and (pg_get_viewdef(cl.oid) ilike '%charte_accentuation%' or pg_get_viewdef(cl.oid) ilike '%directives_propositions_gpt%');
  if n <> 0 or m <> 0 then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 4. fonctions qui les nomment : %s ; vues : %s (attendu 0 et 0)', dire, n, m) || E'\n';

  -- ── 5. Le lexique qui remplace la charte d'accentuation est en place ──────
  select count(*) into n from public.accentuation_mots;
  if n < 90 then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 5. mots du lexique d''accentuation : %s (au moins 90)', dire, n) || E'\n';

  rapport := rapport || format(E'\n%s faute(s).', fautes);
  raise exception E'\n%', rapport;
end $$;
