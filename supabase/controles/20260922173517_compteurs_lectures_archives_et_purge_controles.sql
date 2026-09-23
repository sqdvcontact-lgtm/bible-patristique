-- CONTRÔLES : LE COMPTEUR DE LECTURES, SON ARCHIVE ET SA PURGE
--
-- ⛔ Le bloc se termine par un `raise exception` qui rend le RAPPORT et rembobine tout :
-- rien n'est écrit, et l'on peut le rejouer sur la base servie.
-- ⚠️ Couvre les migrations 20260922173517 (archive, remise à zéro, purge) et
-- 20260922173547 (gel de la cible d'un vote, droits `anon`).

do $$
declare
  n integer; m integer; dire text;
  rapport text := ''; fautes integer := 0;
begin
  -- ── 1. L'archive porte le relevé d'avant, et elle est FERMÉE ──────────────
  select count(*), coalesce(sum(nb_lectures), 0)
    into n, m from public.lectures_versets_archive_20260922;
  if n <> 378 or m <> 1025 then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 1. archive : %s ligne(s), %s lecture(s) — attendu 378 / 1025', dire, n, m) || E'\n';

  select count(*) into n from unnest(array['anon','authenticated']) r(role)
   where has_table_privilege(r.role, 'public.lectures_versets_archive_20260922'::regclass, 'SELECT');
  if n <> 0 then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 2. archive fermée : %s rôle(s) qui la lisent', dire, n) || E'\n';

  -- ── 3. La purge existe, elle est fermée, et pg_cron l'appelle ─────────────
  select count(*) into n from pg_proc p join pg_namespace s on s.oid = p.pronamespace
   where s.nspname = 'public' and p.proname = 'purger_lectures_versets_lecteurs';
  select count(*) into m from cron.job where jobname = 'purger_lectures_lecteurs' and active;
  if n <> 1 or m <> 1 then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 3. purge : %s fonction, %s tâche pg_cron active', dire, n, m) || E'\n';

  select count(*) into n from unnest(array['anon','authenticated']) r(role)
   where has_function_privilege(r.role, 'public.purger_lectures_versets_lecteurs()', 'EXECUTE');
  if n <> 0 then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 4. purge fermée : %s rôle(s) qui l''exécutent', dire, n) || E'\n';

  -- ── 5. LE FAIT : un vote ne change pas de commentaire ─────────────────────
  -- ⚠️ C'est le seul contrôle qui pousse sur la porte : les autres la décrivent.
  declare
    c1 bigint; c2 bigint; u uuid; k uuid; passe boolean := false; deplace boolean := false;
  begin
    select id into c1 from public.commentaires order by id limit 1;
    select id into c2 from public.commentaires order by id desc limit 1;
    select id into u from auth.users order by created_at limit 1;
    if c1 is null or c2 is null or c1 = c2 or u is null then
      rapport := rapport || '      5. rien à éprouver : il faut deux commentaires et un compte' || E'\n';
    else
      insert into public.commentaires_likes (id_commentaire, user_id, valeur)
      values (c1, u, 1)
      on conflict (id_commentaire, user_id) do update set valeur = 1
      returning id into k;
      begin
        insert into public.commentaires_likes (id_commentaire, user_id, valeur)
        values (c1, u, -1)
        on conflict (id_commentaire, user_id) do update
          set valeur = -1, id_commentaire = excluded.id_commentaire, user_id = excluded.user_id;
        passe := true;
      exception when others then passe := false;
      end;
      begin
        update public.commentaires_likes set id_commentaire = c2 where id = k;
        deplace := true;
      exception when others then deplace := false;
      end;
      if not passe or deplace then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
      rapport := rapport || format('%-5s 5. upsert accepté : %s ; déplacement du vote accepté : %s', dire, passe, deplace) || E'\n';
    end if;
  end;

  -- ── 6. Droits `anon` sur les trois fonctions du 2026-09-22 ────────────────
  select count(*) into n from (values
      ('public.presence_patristique_plage(text,integer,integer,integer,integer)', true),
      ('public.totaux_votes_commentaires(bigint[])', false),
      ('public.longueur_texte(public.segments)', false)
    ) f(sig, attendu)
   where has_function_privilege('anon', f.sig, 'EXECUTE') is distinct from f.attendu;
  if n <> 0 then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 6. droits anon : %s écart(s) — INVOKER ouverte, DEFINER et colonne calculée fermées', dire, n) || E'\n';

  -- ⚠️ Dans un `raise`, le marqueur est `%` et non `%s`.
  raise exception E'\n\nCONTRÔLES — compteur de lectures, vote gelé, droits anon\n%\n% faute(s)\n',
    rapport, fautes;
end $$;
