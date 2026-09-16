-- CONTRÔLES DU LEXIQUE D'ACCENTUATION (`accentuation_mots`)
--
-- ⛔ Le bloc se termine par un `raise exception` qui rend le RAPPORT et rembobine tout :
-- rien n'est écrit, et l'on peut le rejouer sur la base servie.
--
-- ⚠️ Les contrôles 4 et 5 ÉCRIVENT pour éprouver les contraintes, chacun dans un
-- sous-bloc qui rattrape son erreur : l'exception finale défait le tout.

do $$
declare
  n integer; m integer; b boolean;
  rapport text := ''; fautes integer := 0; dire text;
begin
  -- ── 1. La table et ses contraintes ────────────────────────────────────────
  select count(*) into n from information_schema.columns
   where table_schema = 'public' and table_name = 'accentuation_mots'
     and column_name in ('id', 'mot', 'faux_positif', 'note', 'cree_le', 'mis_a_jour');
  select count(*) into m from pg_constraint
   where conrelid = 'public.accentuation_mots'::regclass and convalidated
     and conname in ('accentuation_mots_mot_unique', 'accentuation_mots_mot_forme', 'accentuation_mots_note_forme');
  if n <> 6 or m <> 3 then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 1. colonnes : %s, contraintes validées : %s (attendu 6 et 3)', dire, n, m) || E'\n';

  -- ── 2. Fermée à l'API : RLS posée, aucun droit pour les rôles du site ──────
  select relrowsecurity into b from pg_class where oid = 'public.accentuation_mots'::regclass;
  if not b
     or has_table_privilege('anon', 'public.accentuation_mots', 'SELECT')
     or has_table_privilege('authenticated', 'public.accentuation_mots', 'SELECT')
     or has_table_privilege('authenticated', 'public.accentuation_mots', 'INSERT') then
    fautes := fautes + 1; dire := 'FAUTE';
  else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 2. RLS posée : %s ; lecture ou écriture ouverte à anon ou authenticated : %s (attendu true, false)',
    dire, b, has_table_privilege('anon', 'public.accentuation_mots', 'SELECT') or has_table_privilege('authenticated', 'public.accentuation_mots', 'SELECT')) || E'\n';

  -- ── 3. Les mots repris de la charte d'accentuation ────────────────────────
  select count(*), count(*) filter (where faux_positif) into n, m from public.accentuation_mots;
  if n < 90 or m < 30 then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 3. mots : %s dont %s faux positifs (au moins 90 et 30 à la reprise)', dire, n, m) || E'\n';

  select count(*) into n from public.accentuation_mots
   where mot in ('À', 'Ô', 'Élie', 'Église', 'Ève', 'Îles', 'âme') and not faux_positif;
  select count(*) into m from public.accentuation_mots
   where mot in ('Esther', 'Ecce', 'En', 'Et', 'Ecclésiaste') and faux_positif;
  if n <> 7 or m <> 5 then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 3 bis. témoins : %s à accentuer sur 7, %s faux positifs sur 5', dire, n, m) || E'\n';

  -- ── 4. La forme se refuse en base ─────────────────────────────────────────
  n := 0;
  begin insert into public.accentuation_mots (mot) values ('Élie.'); exception when check_violation then n := n + 1; end;
  begin insert into public.accentuation_mots (mot) values (' Élie'); exception when check_violation then n := n + 1; end;
  begin insert into public.accentuation_mots (mot) values (E'E\u0301lie'); exception when check_violation then n := n + 1; end;
  begin insert into public.accentuation_mots (mot, note) values ('Zacharie', ' note '); exception when check_violation then n := n + 1; end;
  begin insert into public.accentuation_mots (mot) values ('Élie'); exception when unique_violation then n := n + 1; end;
  if n <> 5 then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 4. écritures fautives refusées : %s sur 5 (ponctuation, bord, NFD, note non rognée, doublon)', dire, n) || E'\n';

  -- ── 5. Une forme juste passe ──────────────────────────────────────────────
  b := true;
  begin
    insert into public.accentuation_mots (mot, faux_positif, note) values ('Saint-Esprit', false, 'Essai.'), ('Aujourd’hui', true, null), ('Œ', false, null);
  exception when others then b := false;
  end;
  if not b then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 5. formes justes acceptées (trait d''union, apostrophe, lettre seule) : %s', dire, b) || E'\n';

  rapport := rapport || format(E'\n%s faute(s).', fautes);
  raise exception E'\n%', rapport;
end $$;
