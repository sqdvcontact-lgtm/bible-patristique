-- ── LE SYSTÈME « TITRE DE CATALOGUE / TITRE COMPOSÉ », GÉNÉRALISÉ ────────────
-- `titre` / `titre_affichage` partageaient depuis toujours une règle que les
-- autres intitulés n'avaient pas : le catalogue nomme l'œuvre partout (recherche,
-- bibliothèque, fil d'Ariane, citations), la composition ne vaut QUE pour le
-- frontispice, sauts de ligne compris. Tous les autres éléments de la page de
-- titre n'avaient qu'une colonne : y saisir un saut de ligne pour la composition
-- l'emportait dans les listes, et le refuser privait le frontispice de sa mise en
-- page. Chacun reçoit donc sa colonne composée.
--
-- ⚠️ Deux d'entre elles portent une LIGNE ENTIÈRE, et non un champ : le
-- frontispice ne montre pas `trad_auteur` ni `editeur`/`ville`/`date` tels quels,
-- il en FORME une phrase (`libelleTrad`, `formulerProvenance`). Composer les
-- ingrédients séparément n'aurait rien donné ; c'est la phrase qui se compose.
--
-- ⚠️ `auteur_affichage` vit sur l'ŒUVRE et non sur l'auteur : c'est la
-- composition de CE frontispice (« SAINT AUGUSTIN / ÉVÊQUE D'HIPPONE »), pas un
-- second nom d'auteur, qui rejaillirait sur toutes ses œuvres.
alter table public.oeuvres
  add column if not exists auteur_affichage         text,
  add column if not exists sous_titre_affichage     text,
  add column if not exists titre_original_affichage text,
  add column if not exists trad_auteur_affichage    text,
  add column if not exists provenance_affichage     text;

comment on column public.oeuvres.auteur_affichage is
  'Composition du nom d''auteur pour le seul frontispice (sauts de ligne compris). Vide → le nom de catalogue de l''auteur.';
comment on column public.oeuvres.sous_titre_affichage is
  'Composition du sous-titre pour le seul frontispice. Vide → `sous_titre`, qui reste le champ de catalogue.';
comment on column public.oeuvres.titre_original_affichage is
  'Composition du titre original pour le seul frontispice. Vide → `titre_original`.';
comment on column public.oeuvres.trad_auteur_affichage is
  'Composition de la LIGNE du traducteur au frontispice (« Traduction de… » entière). Vide → la phrase formée à partir de `trad_auteur`.';
comment on column public.oeuvres.provenance_affichage is
  'Composition de la LIGNE de provenance au colophon (« D''après l''édition de… » entière). Vide → la phrase formée à partir de editeur/ville/date_publication.';

-- ── LES INTERTITRES COMPOSÉS ────────────────────────────────────────────────
-- Un titre de division vit dans `segments.ref_nivN` : c'est une IDENTITÉ, sur
-- quoi s'appuient la navigation, le sommaire, `get_niv1_list` et les ancres. Y
-- glisser une composition romprait tout cela — c'est exactement la raison d'être
-- de `titre_affichage` pour l'œuvre.
-- ⛔ ET LA COMPOSITION NE VA PAS DANS `segments` : la table est immense, porte
-- cinq index GIN et une colonne engendrée, et le titre y est RÉPÉTÉ sur chaque
-- segment du groupe — une composition y serait écrite mille fois pour un seul
-- titre. Elle vit donc sur l'œuvre, que la page charge déjà, dans un objet dont
-- la clé est le CHEMIN de la division : « niv2␟Livre I␟Chapitre III ».
alter table public.oeuvres
  add column if not exists titres_composes jsonb not null default '{}'::jsonb;

comment on column public.oeuvres.titres_composes is
  'Compositions des intertitres pour la seule lecture, par chemin de division : clé « <champ>␟<niv1>␟…␟<nivN> » (champ = niv1..niv4 ou niv1_texte..niv4_texte), valeur = le titre composé. L''identité reste `segments.ref_nivN`.';

-- La liste blanche de la RPC d'écriture, allongée des cinq colonnes composées.
CREATE OR REPLACE FUNCTION public.admin_update_oeuvre_champ(p_id_oeuvre text, p_champ text, p_valeur jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF p_champ NOT IN (
    'titre', 'titre_affichage', 'sous_titre', 'titre_original', 'trad_auteur',
    'editeur', 'collection', 'ville', 'date_publication',
    'date_composition', 'url_source', 'langue', 'langue_originale',
    'profondeur_sommaire', 'niveaux_sommaire', 'niveaux_corps',
    'texte_sommaire', 'texte_corps', 'afficher_numeros', 'genres',
    'commentaire_traduction', 'fleuron',
    'note_editoriale_complete', 'note_editoriale_complement', 'note_editoriale_titre',
    -- Les compositions du frontispice (voir les commentaires de colonne).
    'auteur_affichage', 'sous_titre_affichage', 'titre_original_affichage',
    'trad_auteur_affichage', 'provenance_affichage'
  ) THEN
    RAISE EXCEPTION 'Champ non autorisé : %', p_champ;
  END IF;

  SET LOCAL session_replication_role = replica;

  IF p_valeur IS NULL THEN
    EXECUTE format('UPDATE oeuvres SET %I = NULL WHERE id_oeuvre = $1', p_champ)
      USING p_id_oeuvre;

  ELSIF p_champ IN ('profondeur_sommaire', 'niveaux_sommaire', 'niveaux_corps') THEN
    EXECUTE format('UPDATE oeuvres SET %I = ($1::text)::integer WHERE id_oeuvre = $2', p_champ)
      USING p_valeur, p_id_oeuvre;

  ELSIF p_champ = 'afficher_numeros' THEN
    EXECUTE format('UPDATE oeuvres SET %I = ($1::text)::boolean WHERE id_oeuvre = $2', p_champ)
      USING p_valeur, p_id_oeuvre;

  ELSIF p_champ = 'genres' THEN
    EXECUTE format('UPDATE oeuvres SET %I = ARRAY(SELECT jsonb_array_elements_text($1)) WHERE id_oeuvre = $2', p_champ)
      USING p_valeur, p_id_oeuvre;

  ELSE
    EXECUTE format('UPDATE oeuvres SET %I = $1 WHERE id_oeuvre = $2', p_champ)
      USING p_valeur #>> '{}', p_id_oeuvre;
  END IF;
END;
$function$;

-- Écriture d'UNE composition d'intertitre. Une valeur vide retire l'entrée : la
-- lecture revient alors au titre de catalogue, comme « Revenir au titre de
-- catalogue » le fait sur le frontispice.
CREATE OR REPLACE FUNCTION public.admin_titre_compose(p_id_oeuvre text, p_cle text, p_valeur text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_resultat jsonb;
BEGIN
  IF p_cle IS NULL OR btrim(p_cle) = '' THEN
    RAISE EXCEPTION 'Chemin de division manquant.';
  END IF;

  SET LOCAL session_replication_role = replica;

  UPDATE oeuvres
     SET titres_composes = CASE
           WHEN p_valeur IS NULL OR btrim(p_valeur) = ''
             THEN coalesce(titres_composes, '{}'::jsonb) - p_cle
           ELSE jsonb_set(coalesce(titres_composes, '{}'::jsonb), array[p_cle], to_jsonb(p_valeur), true)
         END
   WHERE id_oeuvre = p_id_oeuvre
   RETURNING titres_composes INTO v_resultat;

  IF v_resultat IS NULL THEN
    RAISE EXCEPTION 'Œuvre introuvable : %', p_id_oeuvre;
  END IF;

  RETURN v_resultat;
END;
$function$;

revoke all on function public.admin_titre_compose(text, text, text) from public, anon, authenticated;
