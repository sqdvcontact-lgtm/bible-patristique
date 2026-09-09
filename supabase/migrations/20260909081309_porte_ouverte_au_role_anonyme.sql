-- LA PORTE DU SITE S'OUVRE AU RÔLE ANONYME — ÉPROUVÉE, NON APPLIQUÉE (2026-09-09)
--
-- ⛔ CETTE MIGRATION N'EST PAS APPLIQUÉE. Elle a été JOUÉE ET ÉPROUVÉE dans une
-- transaction annulée le 2026-09-09 (relevé en pied de fichier), puis laissée en
-- attente : le site est fermé, la porte se rend correctement pour tout compte connecté,
-- et la base a été fermée au rôle anonyme la veille, délibérément. Rien ne presse — c'est
-- à l'OUVERTURE que le manque se paie. Avant de la jouer, relire les quatre raisons.
--
-- CE QU'ELLE RÉPARE. La page d'accueil ne lit que deux tables : « oeuvres » (les œuvres
-- offertes, avec leur auteur) et « oeuvres_auteurs » (les co-signatures, sans lesquelles
-- Rufin d'Aquilée disparaît de la galerie). Le rôle « anon » n'a de droit de lecture sur
-- ni l'une ni l'autre : à l'ouverture du site, la porte se rendrait avec son frontispice,
-- ses deux cartes, « Aucun ajout pour l'instant. » et SANS la galerie des auteurs, que le
-- composant efface entièrement quand la liste est vide.
--
-- ⛔ RAISON 1 — LA POLITIQUE EXISTANTE APPELLE `is_admin()`, QUE `anon` NE PEUT PLUS
-- EXÉCUTER. C'est le défaut que l'épreuve a trouvé, et il aurait fait échouer la première
-- écriture de cette migration : « Lecture des œuvres accessibles » porte le qual
-- `acces_public OR (SELECT is_admin())`, et la migration
-- `20260908095950_fermer_le_role_anonyme_les_fonctions.sql` a retiré à PUBLIC l'exécution
-- des 112 fonctions du schéma. Ouvrir cette politique à `anon` rendait donc, sur la
-- moindre lecture, « permission denied for function is_admin » (42501).
-- ⛔ On n'ouvre PAS `is_admin()` à `anon` pour contourner cela : ce serait défaire d'une
-- ligne ce que la veille avait fermé. On AJOUTE deux politiques propres à `anon`, qui
-- n'appellent aucune fonction. Les politiques s'additionnent (OU) : celles
-- d'`authenticated` ne bougent pas d'un caractère.
--
-- ⛔ RAISON 2 — `auteurs` EST FERMÉE ELLE AUSSI, ET SA POLITIQUE TROMPE.
-- « Lecture publique des auteurs » porte sur le rôle {public} avec un qual à `true`, ce
-- qui donne à croire la table ouverte. Elle ne l'est pas :
-- `has_table_privilege('anon','auteurs','SELECT')` rend FAUX, le GRANT manquant en deçà de
-- toute politique. C'est le piège que AGENTS.md nomme déjà (« elle ne sert à rien sans le
-- droit sous-jacent, et sa seule présence trompe la lecture ») — l'audit s'y est laissé
-- prendre. Sa politique n'a donc rien à recevoir, seul le droit lui manque.
--
-- ⛔ RAISON 3 — `oeuvres` PORTE DE LA PROSE D'ATELIER SUR SES ŒUVRES PUBLIQUES.
-- Sur les 43 œuvres offertes, 23 portent un `acces_public_note` et 23 un
-- `note_editoriale_complement` qui sont des notes INTERNES : « Import de préparation
-- privé ; aucune publication autorisée par ce paquet. », « Édition en cours de reprise
-- éditoriale interne », « Il n'est volontairement pas… ». Un `grant select on oeuvres to
-- anon` les publierait toutes. D'où les grants COLONNE PAR COLONNE ci-dessous, qui
-- n'ouvrent que ce que la porte lit — l'épreuve vérifie que les trois lectures fautives
-- sont bien refusées.
-- ⚠️ Ce n'est qu'un pansement : la doctrine du dépôt veut qu'une note d'atelier vive dans
-- une table à part, sans droit pour anon ni authenticated (modèle
-- `oeuvres_commentaires_prives`). Tant qu'elle est ici, tout compte connecté la lit déjà,
-- la page de l'œuvre faisant `select('*')` sous la session du lecteur.
--
-- ⚠️ RAISON 4 — CE N'EST QU'UNE TRANCHE. AGENTS.md range ce point en tête de la liste de
-- l'ouverture, avec la consigne expresse de ne pas le traiter au fil de l'eau : « Décider
-- la surface publique table par table, puis vérifier que chaque famille se rend ENTIÈRE
-- sans session. » Appliquée seule, cette migration ouvre la PORTE et rien d'autre : une
-- page de chapitre, une page d'œuvre, une fiche d'auteur continueront de se rendre vides
-- pour un moteur, ce qui vaut un soft 404, sanctionné plus durement qu'une page absente.
--
-- ⚠️ Appliquée par le connecteur MCP, `apply_migration` choisit sa propre version :
-- renommer ce fichier d'après le journal après coup.

begin;

-- ── 1. Deux politiques PROPRES au rôle anonyme ────────────────────────────────
-- ⛔ On n'ALTÈRE pas les politiques existantes : elles appellent `is_admin()` (raison 1).
-- Celles-ci n'appellent rien, et leur qual dit exactement ce que la porte montre — une
-- œuvre offerte, et la co-signature d'une œuvre offerte.
create policy "Lecture anonyme des œuvres offertes" on public.oeuvres
  for select to anon
  using (acces_public);

create policy "Lecture anonyme des co-signatures offertes" on public.oeuvres_auteurs
  for select to anon
  using (exists (
    select 1 from public.oeuvres o
    where o.id_oeuvre = oeuvres_auteurs.id_oeuvre and o.acces_public
  ));

-- La politique de « auteurs » est DÉJÀ sur {public} avec un qual à `true` : rien à y
-- changer, seul le droit sous-jacent manque (raison 2).

-- ── 2. Les droits, COLONNE PAR COLONNE ────────────────────────────────────────
-- ⛔ Jamais `grant select on <table>` : voir la raison 3. Chaque colonne nommée ici est une
-- colonne que la porte LIT, et rien de plus.
--
-- ⚠️ Une colonne citée dans un FILTRE ou un TRI compte comme lue : `acces_public` porte le
-- `.eq()` de la requête, `date_mise_en_ligne` et `id_oeuvre` portent ses deux `.order()`,
-- et `id_auteur` porte la jointure de l'embed. Les oublier rend un « permission denied for
-- column », non une liste vide.
-- ⛔ Corollaire : un `select('*')` anonyme sur ces tables ÉCHOUERA. C'est voulu — la page
-- de l'œuvre en fait un, et elle demande de toute façon `segments`, qui reste fermée. Le
-- jour où l'on voudra l'ouvrir, ce sera par une VUE, non en élargissant ces grants.
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

-- ═════════════════════════════════════════════════════════════════════════════
-- ÉPREUVE DU 2026-09-09, en transaction ANNULÉE, depuis la place d'un anonyme.
-- Rejouable par le fichier de contrôles qui accompagne cette migration.
--
--   oeuvres offertes .................... 43
--   oeuvres retenues (doit valoir 0) .... 0
--   co-signatures ....................... 1
--   auteurs de la galerie ............... 14   (+ Rufin par co-signature = 15 noms)
--   auteurs lisibles au total ........... 536
--   acces_public_note ................... refusé (42501)
--   note_editoriale_complement .......... refusé (42501)
--   select * sur oeuvres ................ refusé (42501)
--   segments (hors périmètre) ........... refusé (42501)
--   is_admin (fermée la veille) ......... refusé (42501)
--
-- ⚠️ 43 et non 42 : une œuvre a été publiée entre l'audit du matin et l'épreuve. Le
-- chiffre attendu se relit, il ne se recopie pas.
-- ⚠️ 536 auteurs : c'est la table entière, et c'est ce que sa politique {public} dit
-- depuis l'origine. Trois colonnes seulement sont ouvertes — identifiant, nom, année.
