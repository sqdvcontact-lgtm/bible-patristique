-- LE MOTIF D'UNE PUBLICATION QUITTE « oeuvres » (2/2 — le retrait)
--
-- Les trente notes sont dans `oeuvres_commentaires_prives.note_acces_public` depuis la
-- migration 1/2, et la planche d'administration les lit par ce canal depuis son
-- déploiement. On retire donc la colonne d'une table que la page publique de l'œuvre lit
-- en `select('*')` sous la session du lecteur.
--
-- Appliquée le 2026-09-09, APRÈS le déploiement du correctif — la base est partagée avec
-- le site en ligne, et l'ordre inverse aurait cassé l'administration le temps d'un build.

-- ── 1. La fonction d'import qui la nomme ──────────────────────────────────────
-- ⛔ `importer_mirandol_1861` est une RPC d'import d'un seul coup (Boèce, Mirandol 1861),
-- déjà jouée. Elle écrit `acces_public_note` en trois endroits : la colonne dans la liste
-- de l'INSERT, la valeur dans le SELECT qui lui répond, et la reprise sur conflit. Retirer
-- la colonne sans la corriger laisserait une MINE : le corps d'une fonction plpgsql n'est
-- pas contrôlé au DDL, elle ne casserait qu'au prochain appel.
-- ⚠️ On PATCHE par trois remplacements EXACTS, chacun contrôlé, sur la définition rendue
-- par `pg_get_functiondef` — jamais en réécrivant à la main dix-neuf kilo-octets. La
-- définition d'origine est sauvegardée avant.
-- ⚠️ Le remplacement (b) retire la LIGNE entière, non la seule valeur : la liste de
-- colonnes et les expressions du SELECT doivent rester en nombre égal. Vérifié à la main
-- après coup — 34 de chaque côté, contre 35 avant.
create table if not exists internal.backup_fn_importer_mirandol_20260909 (
  saisi_le timestamptz default now(), definition text);

do $patch$
declare def text; neuf text;
begin
  select pg_get_functiondef(p.oid) into def
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'importer_mirandol_1861';
  if def is null then raise exception 'importer_mirandol_1861 introuvable.'; end if;
  insert into internal.backup_fn_importer_mirandol_20260909 (definition) values (def);

  neuf := def;
  -- (a) la colonne, dans la liste de l'INSERT
  neuf := replace(neuf,
    '    lecture_texte_entier, acces_public, acces_public_note, acces_public_modifie_le',
    '    lecture_texte_entier, acces_public, acces_public_modifie_le');
  if neuf = def then raise exception 'Remplacement (a) sans effet : la liste de colonnes a changé.'; end if;

  -- (b) la VALEUR qui lui répondait dans le SELECT — la ligne entière s'en va, sans quoi
  --     le SELECT aurait une expression de plus que la liste de colonnes.
  def := neuf;
  neuf := replace(neuf,
    chr(10) || '    ''Import technique non public en attente du contrôle d’affichage du lecteur multiversion.'',', '');
  if neuf = def then raise exception 'Remplacement (b) sans effet : la valeur du SELECT a changé.'; end if;

  -- (c) la reprise sur conflit
  def := neuf;
  neuf := replace(neuf, chr(10) || '    acces_public_note = excluded.acces_public_note,', '');
  if neuf = def then raise exception 'Remplacement (c) sans effet : la clause ON CONFLICT a changé.'; end if;

  if position('acces_public_note' in neuf) > 0 then
    raise exception 'Il reste une mention de acces_public_note dans la fonction.';
  end if;
  execute neuf;
end $patch$;

-- ── 2. La colonne s'en va ─────────────────────────────────────────────────────
-- ⚠️ `acces_public_modifie_le` RESTE : c'est une date, non de la prose, et la route
-- d'administration l'estampille à chaque publication. La doctrine vise la donnée privée
-- RÉDIGÉE, pas l'horodatage d'une décision.
alter table public.oeuvres drop column acces_public_note;

-- ── 3. Le doublon de politiques sur « oeuvres_auteurs » ───────────────────────
-- ⛔ « Lecture des liaisons d'œuvres accessibles » et « lecture des co-signatures
-- visibles » portaient EXACTEMENT le même qual, sur la même table, pour le même rôle. Deux
-- politiques de lecture s'additionnent (OU) : le doublon ne changeait rien au résultat, il
-- faisait seulement évaluer deux fois la même sous-requête et laissait croire à deux règles
-- là où il n'y en a qu'une. On garde celle dont le nom suit la nomenclature de sa voisine
-- sur « oeuvres ».
drop policy if exists "lecture des co-signatures visibles" on public.oeuvres_auteurs;

-- ── 4. Contrôle ───────────────────────────────────────────────────────────────
do $ctrl$
declare n int;
begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='oeuvres' and column_name='acces_public_note')
  then raise exception 'La colonne est toujours là.'; end if;

  select count(*) into n from public.oeuvres_commentaires_prives where note_acces_public is not null;
  if n <> 30 then raise exception 'Trente notes attendues dans la table privée, % trouvées.', n; end if;

  select count(*) into n from internal.backup_oeuvres_acces_public_note_20260909;
  if n <> 30 then raise exception 'Sauvegarde incomplète : % lignes.', n; end if;

  select count(*) into n from public.oeuvres_commentaires_prives where commentaire is not null;
  if n <> 21 then raise exception 'Les carnets de travail ont bougé : % au lieu de 21.', n; end if;

  select count(*) into n from pg_policies
   where schemaname='public' and tablename='oeuvres_auteurs' and cmd='SELECT';
  if n <> 2 then raise exception 'Deux politiques de lecture attendues sur oeuvres_auteurs, % trouvées.', n; end if;
end $ctrl$;

-- ⚠️ PostgREST garde son cache de schéma : sans ce signal, la colonne retirée continue
-- d'être annoncée, et une requête qui la nomme rend un 404 plutôt qu'un 42703.
notify pgrst, 'reload schema';

-- ═════════════════════════════════════════════════════════════════════════════
-- RETOUR EN ARRIÈRE, si jamais :
--   alter table public.oeuvres add column acces_public_note text;
--   update public.oeuvres o set acces_public_note = b.acces_public_note
--     from internal.backup_oeuvres_acces_public_note_20260909 b where b.id_oeuvre = o.id_oeuvre;
--   -- puis rejouer la définition gardée dans internal.backup_fn_importer_mirandol_20260909.
