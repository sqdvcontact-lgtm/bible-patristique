-- LE FLEURON D'UNE ŒUVRE — l'ornement qui sépare sa page de titre de son texte.
--
-- ⛔ AUCUNE CONTRAINTE, et c'est délibéré : la colonne porte une CLÉ du registre
--    `app/lib/fleurons.ts`, et cette liste est ÉDITORIALE — elle bougera. Un CHECK
--    ferait échouer une écriture le jour où l'on renomme un ornement, et un ornement
--    retiré viderait le frontispice au lieu de retomber sur celui du site. C'est le
--    parti déjà pris pour `essais.couverture` et `profils.theme_lecture` : la
--    validation vit dans le code, la lecture est tolérante.
--
-- ⚠️ NULL est le cas ORDINAIRE et ne veut pas dire « aucun fleuron » : il veut dire
--    « celui du site ». Régler une œuvre la distingue ; changer les autres est une
--    ligne dans le registre. Même mécanique que `titre_affichage`.
--
-- ⚠️ `oeuvres` est lue en `select('*')` sous la session du LECTEUR : cette colonne
--    part donc chez lui, et c'est ce qu'on veut — c'est un choix d'affichage, non une
--    note d'atelier.
alter table public.oeuvres add column if not exists fleuron text;

comment on column public.oeuvres.fleuron is
  'Clé du registre app/lib/fleurons.ts. NULL = le fleuron du site. Sans contrainte : la liste est éditoriale, et la lecture retombe sur le défaut.';

-- La TROISIÈME liste blanche. ⛔ Ouvrir un champ à l'écriture en demande trois qui
-- concordent : le panneau, la route `/api/admin/update-oeuvre`, et cette fonction, qui
-- porte la sienne et lève « Champ non autorisé » sinon.
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
    'note_editoriale_complete', 'note_editoriale_complement', 'note_editoriale_titre'
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
