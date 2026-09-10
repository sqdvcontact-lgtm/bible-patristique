-- CONTRÔLES DE `profils.visites_faites`
--
-- ⛔ Le bloc se termine par un `raise exception` qui rend le RAPPORT et rembobine
-- tout : rien n'est écrit, et l'on peut le rejouer autant qu'on veut sur la base
-- servie. C'est ainsi que la migration a été éprouvée AVANT d'être appliquée.
--
-- ⛔ ON ÉPROUVE DEPUIS LA PLACE D'UN LECTEUR ORDINAIRE, et sur un TÉMOIN dont on
-- connaît la réponse : un compte qui n'est NI administrateur NI bêta. La première
-- épreuve avait pris la plus ancienne ligne venue — celle de l'auteur, qui EST
-- administrateur — et concluait que la garde ne gelait plus `est_admin`, alors
-- qu'elle rendait fidèlement `old.est_admin`, c'est-à-dire `true`. Un contrôle
-- dont le témoin est mal choisi ne prouve rien, et il fait peur pour rien.
--
-- ⚠️ Les contrôles 1 et 2 disent la FORME, les 3 à 6 le COMPORTEMENT, le 7 ce que
-- la colonne ne doit PAS faire fuir.

do $$
declare
  ordinaire uuid;
  rendu text[];
  admin_apres boolean; beta_apres boolean; pts_apres integer;
  n integer; t text;
  rapport text := '';
  fautes integer := 0;
  dire text;
begin
  -- ── 1. La colonne existe, en `text[]`, NULLABLE ────────────────────────────
  select data_type || ' / nullable=' || is_nullable into t
    from information_schema.columns
   where table_schema = 'public' and table_name = 'profils' and column_name = 'visites_faites';
  if t is distinct from 'ARRAY / nullable=YES' then
    fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok';
  end if;
  rapport := rapport || format('%-5s 1. colonne : %s (attendu ARRAY / nullable=YES)', dire, coalesce(t, 'ABSENTE')) || E'\n';

  -- ── 2. AUCUNE contrainte CHECK ─────────────────────────────────────────────
  -- ⛔ La liste des visites est ÉDITORIALE : elle bougera, et une visite retirée ne
  -- doit ni bloquer une écriture ni vider un profil. La validation vit dans le code.
  select count(*) into n
    from pg_constraint c
   where c.conrelid = 'public.profils'::regclass and c.contype = 'c'
     and pg_get_constraintdef(c.oid) like '%visites_faites%';
  if n <> 0 then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 2. contraintes CHECK sur la colonne : %s (attendu 0)', dire, n) || E'\n';

  -- ── Le témoin ──────────────────────────────────────────────────────────────
  select id into ordinaire from public.profils where est_admin = false and acces_beta = false limit 1;
  if ordinaire is null then
    raise exception 'Aucun compte ordinaire en base : les contrôles 3 à 7 sont impossibles.';
  end if;
  set local role authenticated;
  perform set_config('request.jwt.claims',
                     json_build_object('sub', ordinaire, 'role', 'authenticated')::text, true);

  -- ── 3. Un lecteur écrit ses propres visites ────────────────────────────────
  update public.profils set visites_faites = array['accueil','bible-classique'] where id = ordinaire;
  select visites_faites into rendu from public.profils where id = ordinaire;
  if rendu is distinct from array['accueil','bible-classique'] then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 3. écriture ordinaire : %s', dire, rendu) || E'\n';

  -- ── 4. La garde RANGE : blancs, doublons, vides, nuls ──────────────────────
  -- ⚠️ Elle RANGE, elle ne REFUSE pas : lever ici empêcherait le lecteur
  -- d'enregistrer son pseudonyme, pour un stockage local corrompu qui n'est pas
  -- de son fait.
  update public.profils set visites_faites = array['  oeuvre ','oeuvre','','accueil',null] where id = ordinaire;
  select visites_faites into rendu from public.profils where id = ordinaire;
  if rendu is distinct from array['accueil','oeuvre'] then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 4. rangée (blancs, doublons, vide, null) : %s (attendu {accueil,oeuvre})', dire, rendu) || E'\n';

  -- ── 5. Une clé démesurée est écartée, un tableau démesuré est borné ────────
  update public.profils set visites_faites = array[repeat('x', 200), 'recherche'] where id = ordinaire;
  select visites_faites into rendu from public.profils where id = ordinaire;
  if rendu is distinct from array['recherche'] then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 5a. clé de 200 signes écartée : %s (attendu {recherche})', dire, rendu) || E'\n';

  update public.profils
     set visites_faites = (select array_agg('v' || lpad(i::text, 3, '0')) from generate_series(1, 50) i)
   where id = ordinaire;
  select coalesce(array_length(visites_faites, 1), 0) into n from public.profils where id = ordinaire;
  if n <> 40 then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 5b. cinquante clés bornées à : %s (attendu 40)', dire, n) || E'\n';

  -- ── 6. LES COLONNES GELÉES TIENNENT TOUJOURS ───────────────────────────────
  -- ⛔ Le contrôle qui compte : la garde a été REMPLACÉE, et il faut prouver que le
  -- reste de son office n'a pas bougé. Un compte qui se ferait administrateur en
  -- écrivant ses visites serait le pire résultat possible de cette passe.
  update public.profils
     set est_admin = true, acces_beta = true, points = 99999, visites_faites = array['accueil']
   where id = ordinaire;
  select est_admin, acces_beta, points into admin_apres, beta_apres, pts_apres
    from public.profils where id = ordinaire;
  if admin_apres or beta_apres or pts_apres <> 0 then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 6. est_admin=%s acces_beta=%s points=%s (attendu false/false/0)',
                               dire, admin_apres, beta_apres, pts_apres) || E'\n';

  -- ── 7. LA LIGNE D'AUTRUI RESTE HORS D'ATTEINTE ─────────────────────────────
  -- La politique `profils_modification` ne rend que sa propre ligne : une écriture
  -- large ne lève pas, elle ne touche RIEN. Les deux se confondent à l'œil.
  update public.profils set visites_faites = array['jamais'] where id <> ordinaire;
  select count(*) into n from public.profils where id <> ordinaire and visites_faites = array['jamais'];
  if n <> 0 then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 7. lignes d''autrui touchées : %s (attendu 0)', dire, n) || E'\n';

  reset role;

  -- ── 8. La colonne ne fuit par AUCUNE vue ───────────────────────────────────
  -- ⚠️ `profils` ne se lit qu'en propriétaire, mais TROIS vues la traversent
  -- (`lecture_utilisateurs`, `classement_utilisateurs`, `mecenes_publics`). Aucune
  -- ne doit la nommer — et aucune ne doit énumérer `*`, qui l'emporterait sans
  -- qu'on l'ait écrit.
  select count(*) into n
    from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
   where c.relkind in ('v','m') and ns.nspname = 'public'
     and pg_get_viewdef(c.oid) ilike '%profils%'
     and pg_get_viewdef(c.oid) ilike '%visites_faites%';
  if n <> 0 then fautes := fautes + 1; dire := 'FAUTE'; else dire := 'ok'; end if;
  rapport := rapport || format('%-5s 8. vues qui nomment la colonne : %s (attendu 0)', dire, n) || E'\n';

  rapport := rapport || format(E'\n%s faute(s).', fautes);
  raise exception E'\n%', rapport;
end $$;
