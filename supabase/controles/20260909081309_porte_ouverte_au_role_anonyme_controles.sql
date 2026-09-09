-- CONTRÔLES DE LA PORTE OUVERTE AU RÔLE ANONYME
--
-- ⛔ Ce fichier joue la migration ET ses contrôles dans une transaction qui S'ANNULE : le
-- bloc se termine par un `raise exception` qui rend le rapport et rembobine tout. Rien
-- n'est écrit. C'est ainsi qu'il a été éprouvé le 2026-09-09, AVANT toute application —
-- et c'est ainsi qu'il a trouvé le défaut de la première écriture (la politique existante
-- appelle `is_admin()`, que `anon` ne peut plus exécuter depuis le 2026-09-08).
--
-- ⛔ On éprouve DEPUIS LA PLACE D'UN ANONYME, jamais depuis le compte de l'auteur, qui est
-- administrateur et ne voit jamais rien manquer. C'est la règle du dépôt.
--
-- ⚠️ Une lecture refusée par une POLITIQUE rend zéro ligne, sans erreur ; une lecture
-- refusée par un GRANT lève 42501. Les deux se confondent à l'œil et pas ici : les
-- premiers contrôles attendent des LIGNES, les derniers attendent une ERREUR.
--
-- Après APPLICATION réelle, rejouer le même bloc en remplaçant le `raise exception` final
-- par un `raise notice` : la migration y sera déjà en place, les `create policy` lèveront
-- « already exists », et il suffit alors de n'en garder que la partie « set local role ».

do $$
declare r text := E'\n'; n int;
begin
  -- ── La migration ──────────────────────────────────────────────────────────
  create policy "Lecture anonyme des œuvres offertes" on public.oeuvres
    for select to anon using (acces_public);
  create policy "Lecture anonyme des co-signatures offertes" on public.oeuvres_auteurs
    for select to anon using (exists (
      select 1 from public.oeuvres o
      where o.id_oeuvre = oeuvres_auteurs.id_oeuvre and o.acces_public));

  grant select (id_oeuvre, id_auteur, titre, date_mise_en_ligne, acces_public) on public.oeuvres to anon;
  grant select (id_oeuvre, id_auteur) on public.oeuvres_auteurs to anon;
  grant select (id_auteur, nom, date_debut_annee) on public.auteurs to anon;

  -- ── Ce que la porte DOIT lire ─────────────────────────────────────────────
  set local role anon;

  select count(*) into n from public.oeuvres where acces_public;
  r := r || 'oeuvres offertes .................... ' || n || E'\n';
  select count(*) into n from public.oeuvres where not acces_public;
  r := r || 'oeuvres retenues (doit valoir 0) .... ' || n || E'\n';
  select count(*) into n from public.oeuvres_auteurs;
  r := r || 'co-signatures ....................... ' || n || E'\n';
  select count(distinct a.id_auteur) into n
    from public.oeuvres o join public.auteurs a on a.id_auteur = o.id_auteur where o.acces_public;
  r := r || 'auteurs de la galerie ............... ' || n || E'\n';
  select count(*) into n from public.auteurs;
  r := r || 'auteurs lisibles au total ........... ' || n || E'\n';

  -- ── Ce qui doit RESTER fermé ──────────────────────────────────────────────
  -- ⛔ Chaque lecture dans son propre bloc : la première qui lève interromprait le lot,
  -- et l'on ne saurait rien des suivantes.
  begin execute 'select acces_public_note from public.oeuvres limit 1';
    r := r || 'FUITE : acces_public_note lisible' || E'\n';
  exception when insufficient_privilege then r := r || 'acces_public_note ................... refuse OK' || E'\n'; end;

  begin execute 'select note_editoriale_complement from public.oeuvres limit 1';
    r := r || 'FUITE : note_editoriale lisible' || E'\n';
  exception when insufficient_privilege then r := r || 'note_editoriale_complement .......... refuse OK' || E'\n'; end;

  -- ⚠️ Le plus important des trois : il atteste que le grant est bien COLONNE PAR COLONNE,
  -- et non une ouverture de table qu'on aurait crue étroite.
  begin execute 'select * from public.oeuvres limit 1';
    r := r || 'FUITE : select * accepte' || E'\n';
  exception when insufficient_privilege then r := r || 'select * sur oeuvres ................ refuse OK' || E'\n'; end;

  begin execute 'select * from public.segments limit 1';
    r := r || 'FUITE : segments lisibles' || E'\n';
  exception when insufficient_privilege then r := r || 'segments (hors perimetre) ........... refuse OK' || E'\n'; end;

  begin execute 'select public.is_admin()';
    r := r || 'FUITE : is_admin executable par anon' || E'\n';
  exception when insufficient_privilege then r := r || 'is_admin (fermee la veille) ......... refuse OK' || E'\n'; end;

  raise exception '%', r;
end $$;
