-- CONTRÔLES DE `profils.citation_favorite_biblique` ET `profils.citation_favorite_patristique`
--
-- ⛔ Le bloc se termine par un `raise exception` qui rend le RAPPORT et rembobine tout :
-- rien n'est écrit, et l'on peut le rejouer sur la base servie. Il a d'abord été joué à la
-- suite de la migration, dans la même transaction annulée, AVANT qu'elle soit appliquée.
--
-- ⛔ ON ÉPROUVE DEPUIS LA PLACE D'UN LECTEUR ORDINAIRE, ni administrateur ni bêta : c'est
-- son navigateur qui écrit ces colonnes. Un refus s'éprouve par un sous-bloc qui attrape
-- `check_violation` ; une écriture qui passe là où l'on attendait un refus est une FAUTE.
--
-- ⚠️ Le contrôle 11 compte les lignes d'autrui APRÈS être revenu au rôle d'origine : sous
-- le rôle du lecteur, la politique de lecture ne lui rend que sa propre ligne, et le
-- compte vaudrait zéro quoi que l'écriture ait fait. Un contrôle qui ne peut pas échouer
-- ne prouve rien.

do $$
declare
  ordinaire uuid;
  t text; n integer; b boolean;
  admin_apres boolean;
  valide_b jsonb; valide_p jsonb; maximal_b jsonb; maximal_p jsonb;
  rendu jsonb; rendu_b jsonb;
  cas jsonb; c record;
  refus_attendus integer := 0; refus_obtenus integer := 0; passees text := '';
  rapport text := ''; fautes integer := 0; dire text;
begin
  -- ── 1. Les deux colonnes existent, en jsonb, NULLABLES ─────────────────────
  select string_agg(column_name || ' ' || data_type || '/' || is_nullable, ', ' order by column_name) into t
    from information_schema.columns
   where table_schema = 'public' and table_name = 'profils'
     and column_name in ('citation_favorite_biblique', 'citation_favorite_patristique');
  if t is distinct from 'citation_favorite_biblique jsonb/YES, citation_favorite_patristique jsonb/YES' then
    fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok';
  end if;
  rapport := rapport || format('%-5s 1. colonnes : %s', dire, coalesce(t, 'ABSENTES')) || E'\n';

  -- ── 1b. `citation_preferee` DEMEURE tant que le code d'avant est servi ─────
  select count(*) into n
    from information_schema.columns
   where table_schema = 'public' and table_name = 'profils' and column_name = 'citation_preferee';
  if n <> 1 then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 1b. citation_preferee présente : %s (attendu 1, jusqu''à la seconde migration)', dire, n) || E'\n';

  -- ── 2. Les deux contraintes existent, et elles sont VALIDÉES ───────────────
  select count(*) into n
    from pg_constraint
   where conrelid = 'public.profils'::regclass and contype = 'c' and convalidated
     and conname in ('profils_citation_favorite_biblique_forme', 'profils_citation_favorite_patristique_forme');
  if n <> 2 then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 2. contraintes de forme validées : %s (attendu 2)', dire, n) || E'\n';

  -- ── Le témoin, et les valeurs qu'on écrit ──────────────────────────────────
  select id into ordinaire from public.profils where est_admin = false and acces_beta = false limit 1;
  if ordinaire is null then
    raise exception 'Aucun compte ordinaire en base : les contrôles 3 à 11 sont impossibles.';
  end if;

  valide_b := jsonb_build_object(
    'id', '00000000-0000-4000-8000-000000000001',
    'ids', jsonb_build_array('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002'),
    'type', 'biblique', 'texte', 'Au commencement était le Verbe.',
    'ref', 'Jean 1, 1', 'traduction', 'Bible Crampon');
  valide_p := jsonb_build_object(
    'id', '00000000-0000-4000-8000-000000000003',
    'type', 'patristique', 'texte', 'Seigneur, vous êtes grand, et infiniment digne de louange.',
    'auteur', 'Augustin d’Hippone', 'titre_oeuvre', 'Les Confessions');

  -- Le pire cas que `favoritePourEcriture` puisse écrire : deux cents identifiants, deux
  -- mille signes de trois octets pièce et le signe de suspension, les mentions à leur borne.
  maximal_b := jsonb_build_object(
    'id', '00000000-0000-4000-8000-000000000001',
    'ids', (select jsonb_agg('00000000-0000-4000-8000-' || lpad(i::text, 12, '0')) from generate_series(1, 200) i),
    'type', 'biblique', 'texte', repeat('’', 2000) || '…',
    'ref', repeat('’', 120), 'traduction', repeat('’', 200));
  maximal_p := jsonb_build_object(
    'id', '00000000-0000-4000-8000-000000000001',
    'ids', (select jsonb_agg('00000000-0000-4000-8000-' || lpad(i::text, 12, '0')) from generate_series(1, 200) i),
    'type', 'patristique', 'texte', repeat('’', 2000) || '…',
    'auteur', repeat('’', 200), 'titre_oeuvre', repeat('’', 300));

  set local role authenticated;
  perform set_config('request.jwt.claims',
                     json_build_object('sub', ordinaire, 'role', 'authenticated')::text, true);

  -- ── 3. Un lecteur écrit sa favorite de l'Écriture ──────────────────────────
  update public.profils set citation_favorite_biblique = valide_b where id = ordinaire;
  select citation_favorite_biblique into rendu from public.profils where id = ordinaire;
  if rendu is distinct from valide_b then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 3. favorite de l''Écriture écrite et relue à l''identique', dire) || E'\n';

  -- ── 4. Puis celle des Pères, et la première n'a pas bougé ──────────────────
  update public.profils set citation_favorite_patristique = valide_p where id = ordinaire;
  select citation_favorite_patristique, citation_favorite_biblique into rendu, rendu_b
    from public.profils where id = ordinaire;
  if rendu is distinct from valide_p or rendu_b is distinct from valide_b then
    fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok';
  end if;
  rapport := rapport || format('%-5s 4. favorite des Pères écrite, celle de l''Écriture intacte', dire) || E'\n';

  -- ── 5. Le pire cas du site passe, dans les deux colonnes ───────────────────
  begin
    update public.profils
       set citation_favorite_biblique = maximal_b, citation_favorite_patristique = maximal_p
     where id = ordinaire;
    dire := 'ok';
  exception when check_violation then
    fautes := fautes + 1; dire := 'FAUTE';
  end;
  rapport := rapport || format('%-5s 5. pire cas du site accepté : %s et %s octets (plafond 32768)',
                               dire, octet_length(maximal_b::text), octet_length(maximal_p::text)) || E'\n';

  -- ── 6. Retirer une favorite (NULL SQL) passe ───────────────────────────────
  update public.profils set citation_favorite_biblique = null where id = ordinaire;
  select citation_favorite_biblique is null into b from public.profils where id = ordinaire;
  if not coalesce(b, false) then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 6. retrait (null) accepté', dire) || E'\n';

  -- ── 7. Ce que la garde doit REFUSER ────────────────────────────────────────
  -- ⚠️ Le jsonb `null` ne passe pas par ce tableau : `jsonb_to_recordset` le rendrait en
  -- NULL SQL, qui est accepté. Il a son contrôle à part, le 8.
  cas := jsonb_build_array(
    jsonb_build_object('col', 'citation_favorite_biblique',    'dit', 'une citation des Pères dans la place de l''Écriture', 'v', valide_p),
    jsonb_build_object('col', 'citation_favorite_patristique', 'dit', 'une citation de l''Écriture dans la place des Pères', 'v', valide_b),
    jsonb_build_object('col', 'citation_favorite_biblique',    'dit', 'sans type (le trou du NULL)', 'v', valide_b - 'type'),
    jsonb_build_object('col', 'citation_favorite_biblique',    'dit', 'sans identifiant', 'v', valide_b - 'id'),
    jsonb_build_object('col', 'citation_favorite_biblique',    'dit', 'un identifiant qui n''est pas une chaîne', 'v', jsonb_set(valide_b, '{id}', '42')),
    jsonb_build_object('col', 'citation_favorite_patristique', 'dit', 'sans texte', 'v', valide_p - 'texte'),
    jsonb_build_object('col', 'citation_favorite_biblique',    'dit', 'un tableau', 'v', '[1, 2]'::jsonb),
    jsonb_build_object('col', 'citation_favorite_biblique',    'dit', 'une chaîne', 'v', to_jsonb('Au commencement'::text)),
    jsonb_build_object('col', 'citation_favorite_patristique', 'dit', 'quarante mille signes', 'v', jsonb_set(valide_p, '{texte}', to_jsonb(repeat('x', 40000)))));
  for c in select * from jsonb_to_recordset(cas) as x(col text, dit text, v jsonb) loop
    refus_attendus := refus_attendus + 1;
    begin
      execute format('update public.profils set %I = $1 where id = $2', c.col) using c.v, ordinaire;
      passees := passees || ' « ' || c.dit || ' »';
    exception when check_violation then
      refus_obtenus := refus_obtenus + 1;
    end;
  end loop;
  if refus_obtenus <> refus_attendus then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 7. écritures refusées : %s sur %s%s', dire, refus_obtenus, refus_attendus,
                               case when passees = '' then '' else ' ; passées :' || passees end) || E'\n';

  -- ── 8. Le jsonb `null` est refusé ─────────────────────────────────────────
  begin
    update public.profils set citation_favorite_biblique = 'null'::jsonb where id = ordinaire;
    fautes := fautes + 1; dire := 'FAUTE';
  exception when check_violation then
    dire := 'ok';
  end;
  rapport := rapport || format('%-5s 8. jsonb « null » refusé', dire) || E'\n';

  -- ── 9. Retirer par le chemin de PostgREST écrit un NULL SQL ────────────────
  -- ⛔ C'est ce qui rend le contrôle 8 inoffensif : un corps `{ "col": null }` se lit par
  -- `json_to_record`, qui rend un NULL SQL, jamais le jsonb `null`.
  select j.nul is null into b from json_to_record('{"nul": null}') as j(nul jsonb);
  if not coalesce(b, false) then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 9. null d''un corps JSON → NULL SQL : %s', dire, b) || E'\n';

  -- ── 10. Les colonnes gelées tiennent toujours ──────────────────────────────
  update public.profils set est_admin = true, citation_favorite_biblique = valide_b where id = ordinaire;
  select est_admin into admin_apres from public.profils where id = ordinaire;
  if admin_apres then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 10. est_admin après écriture d''une favorite : %s (attendu false)', dire, admin_apres) || E'\n';

  -- ── 11. La ligne d'autrui reste hors d'atteinte ────────────────────────────
  update public.profils set citation_favorite_patristique = valide_p where id <> ordinaire;
  reset role;
  select count(*) into n from public.profils where id <> ordinaire and citation_favorite_patristique is not null;
  if n <> 0 then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 11. lignes d''autrui touchées, comptées hors du rôle du lecteur : %s (attendu 0)', dire, n) || E'\n';

  -- ── 12. Aucune vue ne les nomme, et `anon` ne les lit pas ──────────────────
  select count(*) into n
    from pg_class cl join pg_namespace ns on ns.oid = cl.relnamespace
   where cl.relkind in ('v', 'm') and ns.nspname = 'public'
     and (pg_get_viewdef(cl.oid) ilike '%citation_favorite_biblique%'
          or pg_get_viewdef(cl.oid) ilike '%citation_favorite_patristique%');
  b := has_column_privilege('anon', 'public.profils', 'citation_favorite_biblique', 'SELECT')
    or has_column_privilege('anon', 'public.profils', 'citation_favorite_patristique', 'SELECT');
  if n <> 0 or b then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 12. vues qui les nomment : %s ; lecture par anon : %s (attendu 0, false)', dire, n, b) || E'\n';

  rapport := rapport || format(E'\n%s faute(s).', fautes);
  raise exception E'\n%', rapport;
end $$;
