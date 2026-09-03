-- LES NOTES ÉDITORIALES D'UNE ŒUVRE, ET UN SEUL DRAPEAU DE PUBLICATION.
--
-- Trois notes publiques par œuvre, chacune à sa place (décision de l'auteur,
-- 3 septembre 2026) :
--   · `note_editoriale_complete`   — ce que l'œuvre EST : son intérêt, sa substance.
--                                    Paraît dans « À propos de cette édition ».
--   · `note_editoriale_complement` — les points de détail de l'œuvre telle qu'on la
--                                    parcourt : un chapitre déplacé ou refondu, une
--                                    attribution discutée, une transmission lacunaire.
--                                    Paraît dans « À propos de cette édition ».
--   · `note_editoriale_titre`      — un résumé, sur la page de titre seulement. Vide
--                                    le plus souvent.
--
-- ⛔ `oeuvres.note` DISPARAÎT, et c'est le cœur de cette migration. Le champ portait
-- deux choses à la fois : dix-neuf notes éditoriales rédigées (attribution,
-- transmission, complétude) que le site ne montrait nulle part, ET le marqueur de
-- dépublication `[Corpus Scriptura:depublie]`, que l'administration écrivait PAR-DESSUS
-- la note pour retirer une œuvre, puis effaçait (NULL) pour la republier. Un
-- aller-retour dépublier / republier détruisait donc la note, sans rien dire. Les
-- dix-neuf notes tenaient parce que personne n'avait dépublié ces œuvres-là.
--
-- Or la colonne qu'il fallait existait déjà : `acces_public`, lue par toutes les
-- politiques RLS (oeuvres, oeuvre_textes, segments, notes, alignements…) et par le
-- trigger `oeuvres_depublication_textes`, mais par AUCUNE ligne du site, qui ne
-- jugeait que sur le marqueur. Le site lit désormais `acces_public`, comme la base.
--
-- Ce que la migration fait, dans l'ordre :
--   1. sauvegarde des colonnes touchées dans `internal` ;
--   2. les deux colonnes nouvelles ; `note_editoriale_secondaire` (3 œuvres) devient
--      `note_editoriale_complement`, et reçoit les dix-neuf notes en prose de `note`
--      (aucune œuvre ne portait les deux : vérifié, et gardé par une assertion) ;
--   3. les deux œuvres marquées ont déjà `acces_public = false` (vérifié) ; l'ordre
--      est là par sûreté ;
--   4. les deux vues et les deux fonctions qui lisaient le marqueur lisent
--      `acces_public` ; la RPC d'écriture connaît les trois notes et oublie `note` ;
--   5. `note` tombe.
--
-- ⚠️ Une œuvre change d'état : « Du corps et du sang du Seigneur » (A0091O0001) avait
-- `acces_public = false` depuis le 1er septembre (révision éditoriale ouverte, motif
-- dans `acces_public_note`) SANS porter le marqueur : le site la listait encore et sa
-- page s'ouvrait, mais la RLS ne rendait pas une ligne de texte au lecteur. Elle
-- disparaît des listes, ce qui est l'état que la note de suspension décrivait.

-- 1 ───────────────────────────────────────────────────────────────────────────
create table internal.oeuvres_notes_sauvegarde_20260903 as
  select id_oeuvre, note, note_editoriale_secondaire, commentaire_traduction,
         acces_public, acces_public_note, acces_public_modifie_le,
         now() as sauvegarde_le
  from public.oeuvres;

-- 2 ───────────────────────────────────────────────────────────────────────────
alter table public.oeuvres add column note_editoriale_complete text;
alter table public.oeuvres add column note_editoriale_titre text;
alter table public.oeuvres rename column note_editoriale_secondaire to note_editoriale_complement;

update public.oeuvres
   set note_editoriale_complement = nullif(btrim(note), '')
 where note is not null
   and note <> '[Corpus Scriptura:depublie]'
   and nullif(btrim(note_editoriale_complement), '') is null;

do $$
begin
  if exists (
    select 1 from public.oeuvres
    where note is not null and note <> '[Corpus Scriptura:depublie]'
      and note_editoriale_complement is distinct from nullif(btrim(note), '')
  ) then
    raise exception 'Une note éditoriale de `note` n''a pas été reportée dans `note_editoriale_complement`.';
  end if;
end $$;

comment on column public.oeuvres.note_editoriale_complete is
  'Ce que l’œuvre est et pourquoi elle compte : son intérêt, sa substance. Publique ; paraît dans la fiche « À propos de cette édition ».';
comment on column public.oeuvres.note_editoriale_complement is
  'Les points de détail de l’œuvre telle qu’on la parcourt : un chapitre déplacé ou refondu, une attribution discutée, une transmission lacunaire. Publique ; paraît dans la fiche « À propos de cette édition ». Réunit l’ancienne `note` (prose) et l’ancienne `note_editoriale_secondaire` (3 septembre 2026).';
comment on column public.oeuvres.note_editoriale_titre is
  'Résumé qui paraît sur la page de titre de l’œuvre, et là seulement. Vide le plus souvent.';
comment on column public.oeuvres.acces_public is
  'SEUL drapeau de publication de l’œuvre (3 septembre 2026) : lu par les politiques RLS et par toutes les listes du site. L’ancien marqueur [Corpus Scriptura:depublie] dans `note` a disparu avec la colonne.';

-- 3 ───────────────────────────────────────────────────────────────────────────
update public.oeuvres
   set acces_public = false,
       acces_public_modifie_le = coalesce(acces_public_modifie_le, now())
 where note = '[Corpus Scriptura:depublie]' and acces_public;

-- 4 ───────────────────────────────────────────────────────────────────────────
-- Vue de l'étendue de lecture (rang du lecteur) : même définition, le marqueur en moins.
create or replace view public.lecture_utilisateurs as
 with lisibles as (
   select o.id_oeuvre, o.id_auteur
   from oeuvres o
   where o.acces_public and coalesce(o.nb_signes, 0) > 0
 ), corpus as (
   select count(distinct lisibles.id_auteur) as total_auteurs from lisibles
 ), marques as (
   select p.user_id, l.id_auteur
   from prelevements p join lisibles l on l.id_oeuvre = p.id_oeuvre
   where p.type = 'patristique'::text
   union
   select f.user_id, l.id_auteur
   from favoris f join lisibles l on l.id_oeuvre = split_part(f.ref_id, '#'::text, 1)
   where f.type = 'oeuvre'::text
 )
 select pr.id as user_id,
        pr.pseudo,
        count(distinct m.id_auteur)::integer as nb_auteurs,
        ((select corpus.total_auteurs from corpus))::integer as total_auteurs
 from profils pr
 left join marques m on m.user_id = pr.id
 where coalesce(pr.pub_rang, true) or pr.id = auth.uid()
 group by pr.id, pr.pseudo;

-- Vue des œuvres à dates composées (bibliothèque, fiche d'auteur, barre du haut) :
-- `note` y devient `acces_public`. Une vue ne perd pas une colonne par
-- `create or replace` ; elle se recrée, avec ses droits et son option d'invocation.
drop view public.v_oeuvres_dates;
create view public.v_oeuvres_dates with (security_invoker = true) as
 select id_oeuvre,
    id_auteur,
    titre,
    sous_titre,
    titre_original,
    langue_originale,
    langue_trad,
    date_approx,
    genre,
    trad_auteur,
    acces_public,
    editeur,
    collection,
    ville,
    trad_id,
    date_publication,
    url_source,
    profondeur_sommaire,
    nb_signes,
    niveaux_sommaire,
    niveaux_corps,
    texte_sommaire,
    texte_corps,
    afficher_numeros,
    date_composition,
    genres,
    composition_debut_annee,
    composition_debut_precision,
    composition_fin_annee,
    composition_fin_precision,
    publication_debut_annee,
    publication_debut_precision,
    publication_fin_annee,
    publication_fin_precision,
    titre_affichage,
    date_mise_en_ligne,
    commentaire_traduction,
    lecture_texte_entier,
    format_date_bornes_historique(composition_debut_annee, composition_debut_precision, composition_fin_annee, composition_fin_precision, coalesce(date_composition, date_approx)) as date_composition_affichage_courte,
        case
            when (normaliser_libelle_date_historique(coalesce(date_composition, date_approx)) is distinct from format_date_bornes_historique(composition_debut_annee, composition_debut_precision, composition_fin_annee, composition_fin_precision, coalesce(date_composition, date_approx))) then normaliser_libelle_date_historique(coalesce(date_composition, date_approx))
            else null::text
        end as date_composition_precision_affichage,
    format_date_bornes_historique(publication_debut_annee, publication_debut_precision, publication_fin_annee, publication_fin_precision, date_publication) as date_publication_affichage_courte,
        case
            when (normaliser_libelle_date_historique(date_publication) is distinct from format_date_bornes_historique(publication_debut_annee, publication_debut_precision, publication_fin_annee, publication_fin_precision, date_publication)) then normaliser_libelle_date_historique(date_publication)
            else null::text
        end as date_publication_precision_affichage
   from oeuvres o;
grant select on public.v_oeuvres_dates to authenticated, service_role;

-- Recherche rapide de la barre du haut.
create or replace function public.recherche_globale(p_terme text, p_limite integer default 6)
 returns table(type text, id text, titre text, sous_titre text, total_cat integer)
 language plpgsql
 stable
 set search_path to 'public', 'extensions', 'pg_temp'
as $function$
#variable_conflict use_column
DECLARE
  t text := regexp_replace(unaccent(lower(btrim(p_terme))), '[^[:alnum:] ]', '', 'g');
  pat text;
BEGIN
  IF t = '' THEN RETURN; END IF;
  pat := '\m' || t;
  RETURN QUERY
  WITH auteur_r AS (
    SELECT 'auteur'::text AS type, a.id_auteur AS id, a.nom AS titre, a.dates AS sous_titre,
           count(*) OVER ()::int AS total_cat,
           row_number() OVER (ORDER BY (unaccent(lower(a.nom)) LIKE t||'%') DESC, a.nom) AS rn
    FROM public.auteurs a
    WHERE unaccent(lower(a.nom)) ~ pat
  ),
  oeuvre_r AS (
    SELECT 'oeuvre'::text AS type, o.id_oeuvre AS id, o.titre AS titre, a.nom AS sous_titre,
           count(*) OVER ()::int AS total_cat,
           row_number() OVER (ORDER BY (unaccent(lower(o.titre)) LIKE t||'%') DESC, o.titre) AS rn
    FROM public.oeuvres o LEFT JOIN public.auteurs a ON a.id_auteur = o.id_auteur
    WHERE o.acces_public
      AND unaccent(lower(o.titre)) ~ pat
  ),
  essai_r AS (
    SELECT 'essai'::text AS type, e.id::text AS id, e.titre AS titre, NULL::text AS sous_titre,
           count(*) OVER ()::int AS total_cat,
           row_number() OVER (ORDER BY (unaccent(lower(e.titre)) LIKE t||'%') DESC, e.titre) AS rn
    FROM public.essais e
    WHERE e.statut = 'publie'
      AND (unaccent(lower(e.titre)) ~ pat OR unaccent(lower(coalesce(e.resume,''))) ~ pat)
  ),
  evenement_r AS (
    SELECT 'evenement'::text AS type, ev.id AS id, ev.titre AS titre, ev.date_exacte AS sous_titre,
           count(*) OVER ()::int AS total_cat,
           row_number() OVER (ORDER BY (unaccent(lower(ev.titre)) LIKE t||'%') DESC, ev.titre) AS rn
    FROM public.evenements ev
    WHERE ev.est_publie = true
      AND unaccent(lower(coalesce(ev.recherche_normalisee, ev.titre))) ~ pat
  ),
  u AS (
    SELECT type, id, titre, sous_titre, total_cat, rn FROM auteur_r    WHERE rn <= p_limite
    UNION ALL SELECT type, id, titre, sous_titre, total_cat, rn FROM oeuvre_r    WHERE rn <= p_limite
    UNION ALL SELECT type, id, titre, sous_titre, total_cat, rn FROM essai_r     WHERE rn <= p_limite
    UNION ALL SELECT type, id, titre, sous_titre, total_cat, rn FROM evenement_r WHERE rn <= p_limite
  )
  SELECT u.type, u.id, u.titre, u.sous_titre, u.total_cat FROM u ORDER BY u.type, u.rn;
END;
$function$;

-- Bandeau de l'accueil : le second verrou n'existe plus, il n'en reste qu'un.
create or replace function public.statistiques_accueil()
 returns table(textes integer, auteurs integer, pourcent_verifie integer, contributeurs integer)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  with visibles as (
    -- Une œuvre est offerte à la lecture quand elle porte l'accès public. C'est le
    -- même drapeau que celui des politiques RLS : ce que le bandeau compte, le lecteur
    -- peut l'ouvrir.
    select id_oeuvre
    from public.oeuvres
    where acces_public
  ),
  controle as (
    -- « Textes vérifiés » : part des œuvres offertes dont le contrôle qualité ne
    -- relève aucun segment critique. Le calcul brut (≈120 000 segments passés à
    -- plusieurs expressions régulières) est bien trop lourd pour une page publique :
    -- on lit la vue matérialisée, rafraîchie depuis le centre de contrôle. Les
    -- œuvres sans segment (texte pas encore recomposé) n'entrent pas au dénominateur,
    -- faute de quoi une importation à venir ferait chuter le pourcentage sans qu'un
    -- seul texte publié se soit dégradé.
    select
      count(*) as total,
      count(*) filter (where m.critique = 0) as sains
    from public.oeuvres_controle_stats_mat m
    join visibles v using (id_oeuvre)
  ),
  contribs as (
    -- « Contributeurs » : ceux qui ont porté quelque chose au corpus, c'est-à-dire
    -- les administrateurs et les auteurs d'un essai publié. Le chiffre montera de
    -- lui-même au premier essai publié par un autre compte.
    select count(distinct id) as n from (
      select id from public.profils where est_admin
      union
      select user_id from public.essais where statut = 'publie' and user_id is not null
    ) x(id)
  )
  select
    (select count(*) from visibles)::integer,
    (select count(*) from public.auteurs)::integer,
    (select case when c.total > 0 then round(100.0 * c.sains / c.total)::integer end from controle c),
    (select n from contribs)::integer;
$function$;

-- Écriture d'un champ d'œuvre depuis l'administration : les trois notes entrent
-- dans la liste blanche, `note` en sort.
-- ⚠️ La publication ne passe PAS par ici : la RPC coupe les triggers
-- (session_replication_role = replica), et `acces_public` est gardé par
-- `oeuvres_depublication_textes`, qui refuse de retirer une œuvre dont un texte est
-- encore public. La route d'administration écrit `acces_public` directement.
create or replace function public.admin_update_oeuvre_champ(p_id_oeuvre text, p_champ text, p_valeur jsonb)
 returns void
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
BEGIN
  IF p_champ NOT IN (
    'titre', 'titre_affichage', 'sous_titre', 'titre_original', 'trad_auteur',
    'editeur', 'collection', 'ville', 'date_publication',
    'date_composition', 'url_source', 'langue', 'langue_originale',
    'profondeur_sommaire', 'niveaux_sommaire', 'niveaux_corps',
    'texte_sommaire', 'texte_corps', 'afficher_numeros', 'genres',
    'commentaire_traduction',
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
    -- Colonnes text : extraire sans les guillemets JSON
    EXECUTE format('UPDATE oeuvres SET %I = $1 WHERE id_oeuvre = $2', p_champ)
      USING p_valeur #>> '{}', p_id_oeuvre;
  END IF;
END;
$function$;

-- 5 ───────────────────────────────────────────────────────────────────────────
alter table public.oeuvres drop column note;
