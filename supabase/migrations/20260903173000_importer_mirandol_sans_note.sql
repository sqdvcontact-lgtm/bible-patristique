-- LA RPC D'IMPORT DE MIRANDOL NE CONNAÎT PLUS `oeuvres.note`.
--
-- `importer_mirandol_1861` (migration 20260809144000) insérait la ligne d'œuvre avec
-- une colonne `note`, porteuse d'un mot de chantier (« Import technique Mirandol
-- 1861 ; contrôle d’affichage requis avant publication »). La colonne a disparu le
-- 3 septembre 2026 (migration 20260903170000) : la fonction, appelée, échouerait
-- sur une colonne inconnue. L'import est fait et la fonction ne sert plus qu'à le
-- rejouer à l'identique ; on la garde donc, mais accordée au schéma.
--
-- Le mot de chantier ne se reporte nulle part : `acces_public_note`, que la même
-- insertion remplit déjà, dit la même chose (« Import technique non public en
-- attente du contrôle d’affichage… »), et c'est là qu'un motif de suspension vit.
--
-- ⚠️ La fonction se RÉÉCRIT À PARTIR DE SA DÉFINITION EN BASE, par remplacement de
-- texte, plutôt que d'être recopiée ici : trois cents lignes recopiées seraient
-- trois cents occasions de diverger. Le bloc vérifie que les deux fragments
-- attendus existent avant de toucher quoi que ce soit, et qu'il ne reste aucune
-- colonne `note` après.

do $$
declare
  v_oid oid;
  v_def text;
  v_neuf text;
begin
  select p.oid into v_oid
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'importer_mirandol_1861';
  if v_oid is null then
    raise notice 'importer_mirandol_1861 absente : rien à faire.';
    return;
  end if;

  v_def := pg_get_functiondef(v_oid);
  if position('date_approx, genre, trad_auteur, note, editeur, collection, ville, trad_id,' in v_def) = 0
     or position('n.traducteur, ''Import technique Mirandol 1861 ; contrôle d’affichage requis avant publication.'',' in v_def) = 0 then
    raise exception 'importer_mirandol_1861 : fragments attendus introuvables, la fonction n''est pas celle qu''on croit.';
  end if;

  v_neuf := replace(v_def,
    'date_approx, genre, trad_auteur, note, editeur, collection, ville, trad_id,',
    'date_approx, genre, trad_auteur, editeur, collection, ville, trad_id,');
  v_neuf := replace(v_neuf,
    'n.traducteur, ''Import technique Mirandol 1861 ; contrôle d’affichage requis avant publication.'',',
    'n.traducteur,');

  execute v_neuf;

  if pg_get_functiondef(v_oid) ~ '(^|[^_a-z])note([^_a-z]|$)' then
    -- `texte_notes`, `notes_sha256`, `acces_public_note`… ne sont pas des mots seuls ;
    -- un `note` isolé qui subsisterait serait une colonne d'œuvre oubliée.
    raise exception 'importer_mirandol_1861 : une colonne `note` subsiste.';
  end if;
end $$;
