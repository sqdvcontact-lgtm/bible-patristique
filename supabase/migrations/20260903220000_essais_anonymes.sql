-- PUBLIER SANS NOM. Une publication se signe de trois façons : le pseudonyme (la
-- règle), le nom réel, ou rien. Deux colonnes les portent, et la contrainte refuse
-- qu'elles soient vraies ensemble. La résolution du nom vit en un seul endroit,
-- app/lib/signatureEssai.ts ; ici ne vit que ce qui doit tenir sans le site.
--
-- ⛔ Le booléen ne suffit pas. `user_id` était lisible par tout compte sur toute
-- publication publiée (politique « publié, ou le sien »), et `classement_utilisateurs`
-- comme `lecture_utilisateurs` traduisent publiquement un identifiant en pseudonyme.
-- Une politique de ligne ne sait pas cacher une COLONNE : la lecture publique passe
-- donc par une vue, `essais_publies`, qui rend `user_id` NUL quand la publication est
-- anonyme. La table cesse d'être lue par le public dans la migration SUIVANTE, une
-- fois le site déployé sur la vue : la base est partagée, et un correctif s'applique
-- après le code qu'il suppose (AGENTS.md, « La base est PARTAGÉE »).
--
-- Cette migration est ADDITIVE : le site en ligne continue de lire la table.

-- ── 1. La colonne et sa contrainte ───────────────────────────────────────────
alter table public.essais
  add column if not exists anonyme boolean not null default false;

alter table public.essais
  drop constraint if exists essais_signature_exclusive;
alter table public.essais
  add constraint essais_signature_exclusive check (not (anonyme and afficher_nom_reel));

-- ── 2. La vue publique ───────────────────────────────────────────────────────
--
-- ⚠️ DEFINER à dessein (troisième exception à la règle `security_invoker`, avec
-- `classement_utilisateurs` et `v_bible899_verse_recomposed`) : la vue existe pour
-- cacher une colonne que la RLS montre, et en invoker elle ne rendrait plus rien une
-- fois la table fermée au public. `security_barrier` empêche qu'un filtre d'appelant
-- (un `ilike` n'est pas étanche) descende sous le `where` et voie les brouillons.
create or replace view public.essais_publies
  with (security_barrier = true) as
  select e.id, e.titre, e.sous_titre, e.resume, e.categories, e.contenu, e.nb_vues,
         e.created_at, e.updated_at, e.publie_at, e.couverture, e.embleme, e.verset_en_tete,
         e.anonyme,
         case when e.anonyme then null else e.user_id end as user_id
  from public.essais e
  where e.statut = 'publie';

revoke all on public.essais_publies from anon, authenticated;
grant select on public.essais_publies to anon, authenticated;

-- ── 3. La recherche de la barre lit la vue ───────────────────────────────────
-- Seul le bloc `essai_r` change : il lisait la table, filtrée sur le statut.
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
    FROM public.essais_publies e
    WHERE unaccent(lower(e.titre)) ~ pat OR unaccent(lower(coalesce(e.resume,''))) ~ pat
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

-- ── 4. Le décompte public ne compte plus les publications anonymes ───────────
-- `classement_utilisateurs` rend, pseudonyme par pseudonyme, un nombre d'essais
-- publiés : sur une petite communauté, « un essai anonyme de plus, un compte à un
-- essai de plus » nomme l'auteur. Le score en perd quinze points : c'est le prix de
-- l'anonymat, et il est juste. Définition reprise de la migration du 2026-09-02,
-- seuls les deux `filter` changent.
create or replace view public.classement_utilisateurs as
 select p.id as user_id,
        p.pseudo,
        count(distinct c.id) as nb_commentaires,
        count(distinct c.id) filter (where c.valide = true) as nb_valides,
        count(distinct cl.id) as nb_likes_recus,
        count(distinct e.id) filter (where e.statut = 'publie'::text and not e.anonyme) as nb_essais_publies,
        count(distinct c.id) + count(distinct c.id) filter (where c.valide = true) * 4
          + count(distinct cl.id) * 2
          + count(distinct e.id) filter (where e.statut = 'publie'::text and not e.anonyme) * 15 as score
 from profils p
 left join commentaires c on c.user_id = p.id and c.supprime is not true
 left join commentaires_likes cl on cl.id_commentaire = c.id
 left join essais e on e.user_id = p.id
 where coalesce(p.pub_rang, true) or p.id = auth.uid()
 group by p.id, p.pseudo;

-- ── 5. L'auteur peut supprimer son écrit ─────────────────────────────────────
-- « Supprimer » dans « Mes écrits » ne supprimait RIEN : la table n'avait aucune
-- politique DELETE, et la RLS refuse en silence (zéro ligne, aucune erreur). Les
-- commentaires et les appréciations suivent par cascade, comme pour l'administration.
drop policy if exists essais_suppression_auteur on public.essais;
create policy essais_suppression_auteur on public.essais
  for delete to authenticated
  using ((select auth.uid()) = user_id);
