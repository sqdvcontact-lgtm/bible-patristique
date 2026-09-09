-- LA PORTE DU SITE S'OUVRE AU RÔLE ANONYME — ÉCRITE, NON APPLIQUÉE (2026-09-09)
--
-- ⛔ CETTE MIGRATION N'A PAS ÉTÉ APPLIQUÉE. Elle attend un arbitrage, et les trois
-- raisons sont écrites ci-dessous. Avant de la jouer, les relire toutes les trois.
--
-- CE QU'ELLE RÉPARE. La page d'accueil ne lit que deux tables : « oeuvres » (les
-- œuvres offertes, avec leur auteur) et « oeuvres_auteurs » (les co-signatures, sans
-- lesquelles Rufin d'Aquilée disparaît de la galerie). Le rôle « anon » n'a de droit
-- de lecture sur ni l'une ni l'autre : à l'ouverture du site, la porte se rendra donc
-- avec son frontispice, ses deux cartes, « Aucun ajout pour l'instant. » et SANS la
-- galerie des auteurs, que le composant efface entièrement quand la liste est vide.
--
-- ⛔ RAISON 1 — « auteurs » EST FERMÉE ELLE AUSSI, ET SA POLITIQUE TROMPE.
-- La politique « Lecture publique des auteurs » porte bien sur le rôle {public} avec
-- un qual à `true`, ce qui donne à croire que la table est ouverte. Elle ne l'est pas :
-- `has_table_privilege('anon', 'auteurs', 'SELECT')` rend FAUX, le GRANT manquant en
-- deçà de toute politique. C'est le piège que AGENTS.md nomme déjà (« elle ne sert à
-- rien sans le droit sous-jacent, et sa seule présence trompe la lecture ») — la
-- présente migration a d'abord été écrite sans elle, sur cette lecture fausse.
--
-- ⛔ RAISON 2 — « oeuvres » PORTE DE LA PROSE D'ATELIER SUR SES ŒUVRES PUBLIQUES.
-- Sur les 42 œuvres offertes, 23 portent un `acces_public_note` et 23 un
-- `note_editoriale_complement` qui sont des notes INTERNES : « Import de préparation
-- privé ; aucune publication autorisée par ce paquet. », « Édition en cours de reprise
-- éditoriale interne », « Il n'est volontairement pas… ». Un `grant select on oeuvres
-- to anon` les publierait toutes. D'où les grants COLONNE PAR COLONNE ci-dessous, qui
-- n'ouvrent que ce que la porte lit.
-- ⚠️ Ce n'est qu'un pansement : la doctrine du dépôt veut qu'une note d'atelier vive
-- dans une table à part, sans droit pour anon ni authenticated (modèle
-- `oeuvres_commentaires_prives`). Tant qu'elle est ici, tout compte connecté la lit
-- déjà, la page de l'œuvre faisant `select('*')` sous la session du lecteur.
--
-- ⛔ RAISON 3 — LA BASE A ÉTÉ FERMÉE À « anon » LA VEILLE, DÉLIBÉRÉMENT.
-- `20260908095950_fermer_le_role_anonyme_les_fonctions.sql` a retiré à PUBLIC l'exécution
-- des 112 fonctions du schéma, après une passe équivalente sur les tables. Rouvrir une
-- table aujourd'hui défait une part de ce travail, sur un site encore fermé, où la porte
-- se rend correctement pour tout compte connecté. Rien ne presse : c'est à l'OUVERTURE
-- que le manque se paie.
--
-- ⚠️ ET CE N'EST QU'UNE TRANCHE. AGENTS.md range ce point en tête de la liste de
-- l'ouverture, avec la consigne expresse de ne pas le traiter au fil de l'eau : « Décider
-- la surface publique table par table, puis vérifier que chaque famille se rend ENTIÈRE
-- sans session. » Appliquée seule, cette migration ouvre la PORTE et rien d'autre : une
-- page de chapitre, une page d'œuvre, une fiche d'auteur continueront de se rendre vides
-- pour un moteur, ce qui vaut un soft 404, sanctionné plus durement qu'une page absente.
--
-- ⚠️ Appliquée par le connecteur MCP, `apply_migration` choisit sa propre version :
-- renommer ce fichier d'après le journal après coup.

begin;

-- ── 1. Les politiques de lecture s'ouvrent au rôle anonyme ────────────────────
-- ⚠️ `to public` et non `to anon` : c'est la forme qu'emploie déjà « Lecture publique
-- des auteurs », et elle dit ce qu'on veut — tout le monde, sans avoir à énumérer les
-- rôles. Les QUALS ne bougent pas : « oeuvres » ne rend que `acces_public`, et la
-- liaison ne rend que les co-signatures d'une œuvre offerte. La branche `is_admin()`
-- reste inoffensive pour un anonyme, qui n'est administrateur nulle part.
alter policy "Lecture des œuvres accessibles" on public.oeuvres to public;
alter policy "Lecture des liaisons d'œuvres accessibles" on public.oeuvres_auteurs to public;
-- ⚠️ « lecture des co-signatures visibles » porte EXACTEMENT le même qual sur la même
-- table : c'est un doublon, et deux politiques de lecture s'ajoutent (OU) sans se
-- contredire. On n'en ouvre qu'une ; retirer l'autre est un rangement à part.

-- La politique de « auteurs » est DÉJÀ sur {public} : rien à y changer, seul le droit
-- sous-jacent manque (raison 1).

-- ── 2. Les droits, COLONNE PAR COLONNE ────────────────────────────────────────
-- ⛔ Jamais `grant select on <table>` : voir la raison 2. Chaque colonne nommée ici est
-- une colonne que la porte LIT, et rien de plus.
--
-- ⚠️ Une colonne citée dans un FILTRE ou un TRI compte comme lue : `acces_public` porte
-- le `.eq()` de la requête, `date_mise_en_ligne` et `id_oeuvre` portent ses deux
-- `.order()`, et `id_auteur` porte la jointure de l'embed. Les oublier rend un
-- « permission denied for column », non une liste vide.
-- ⛔ Corollaire : un `select('*')` anonyme sur ces tables ÉCHOUERA. C'est voulu — la
-- page de l'œuvre en fait un, et elle demande de toute façon `segments`, qui reste
-- fermée. Le jour où l'on voudra l'ouvrir, ce sera par une VUE, non en élargissant ces
-- grants.
grant select (id_oeuvre, id_auteur, titre, date_mise_en_ligne, acces_public)
  on public.oeuvres to anon;
grant select (id_oeuvre, id_auteur)
  on public.oeuvres_auteurs to anon;
grant select (id_auteur, nom, date_debut_annee)
  on public.auteurs to anon;

commit;

-- ⚠️ PostgREST garde son cache de schéma : sans ce signal, les droits neufs mettent un
-- moment à valoir, et l'API rend un 404 entre-temps. Un 404 ne prouve rien (voir la
-- migration du 2026-09-08) — c'est le corps de la réponse qui atteste.
notify pgrst, 'reload schema';
