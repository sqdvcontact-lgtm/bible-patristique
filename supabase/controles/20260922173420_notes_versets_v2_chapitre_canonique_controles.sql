-- CONTRÔLES : LES NOTES D'UN CHAPITRE SE DEMANDENT PAR UNE ÉGALITÉ INDEXABLE
--
-- ⛔ Le bloc se termine par un `raise exception` qui rend le RAPPORT et rembobine tout :
-- rien n'est écrit, et l'on peut le rejouer sur la base servie.
--
-- ⚠️ À REJOUER après toute reprise de `versets_v2` : la colonne est ENGENDRÉE, mais une
-- réécriture de `canon_id` ou un index retiré ferait repasser la lecture des notes par un
-- parcours de livre, sans qu'aucun test du dépôt ne puisse le dire.

do $$
declare
  n integer; dire text;
  rapport text := ''; fautes integer := 0;
  plan text; parcours integer := 0;
begin
  -- ── 1. La colonne est ENGENDRÉE, donc rien ne peut l'écrire ────────────────
  select count(*) into n from information_schema.columns
   where table_schema = 'public' and table_name = 'versets_v2'
     and column_name = 'canon_chapitre' and is_generated = 'ALWAYS';
  if n <> 1 then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 1. canon_chapitre est engendrée', dire) || E'\n';

  -- ── 2. Elle dit le chapitre du créneau, sans exception ────────────────────
  select count(*) into n from public.versets_v2
   where canon_id is not null
     and canon_chapitre is distinct from nullif(split_part(canon_id, '.', 2), '')::integer;
  if n <> 0 then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 2. accord canon_id / canon_chapitre : %s ligne(s) fautive(s)', dire, n) || E'\n';

  -- ── 3. Les deux index partiels sont là ────────────────────────────────────
  select count(*) into n from pg_indexes
   where schemaname = 'public' and tablename = 'versets_v2'
     and indexname in ('idx_v2_notes_canon_chapitre', 'idx_v2_notes_ch_orig');
  if n <> 2 then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 3. index partiels des notes : %s sur 2', dire, n) || E'\n';

  -- ── 4. LE FAIT : sous le rôle du lecteur, le plan NE PARCOURT PAS le livre ─
  -- ⚠️ C'est le seul contrôle qui compte : les trois précédents disent comment la
  -- porte est fermée, celui-ci pousse dessus.
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  for plan in execute $q$explain (analyze, costs off)
      select id, trad_id, livre, canon_id, ch_orig, notes
        from public.versets_v2
       where trad_id = any (array['TR0001','TR0002','TR0003','TR0004','TR0005'])
         and livre = 'PSA'
         and notes is not null
         and (canon_chapitre = 118 or ch_orig = 118)
       order by id
       limit 1000$q$
  loop
    if plan like '%Seq Scan%' or plan like '%idx_v2_trad_livre_canon_prefixe%' then
      parcours := parcours + 1;
    end if;
  end loop;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  if parcours <> 0 then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 4. lecteur : le plan n''ouvre plus le livre entier (%s noeud(s) de parcours)', dire, parcours) || E'\n';

  -- ⚠️ Dans un `raise`, le marqueur est `%` et non `%s` : `%s` rendrait « 0s faute(s) ».
  raise exception E'\n\nCONTRÔLES — notes des versets par chapitre canonique\n%\n% faute(s)\n',
    rapport, fautes;
end $$;
