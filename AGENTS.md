<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Liens bibliques — protocole obligatoire

⛔ **Avant TOUTE constitution ou modification de liens bibliques (`liens_bibliques`), lire d'abord :**
1. la charte `parametres.charte_ia` (Supabase `oucotpxcjalwgetylfbz`), **§9** (types 1-4) et **§9.0** (ordre des passes, frontière mécanique/lecture, contrôle par sondage) ;
2. la mémoire `feedback_liens_protocole` (règle de lecture, méthode en deux passes, conventions de fiabilité).

Règles cardinales : la passe **mécanique** ne produit que du **type 1** et de la cible **« à constituer »** ; les **types 3 (commentaire) et 4 (écho)** relèvent de la **LECTURE seule** (mon travail, l'utilisateur contrôle). Invariant `scripts/_liens-commun.mjs::verifierLienMecanique` en place. **Contrôle par sondage** (`scripts/liens-controle.mjs`) obligatoire à la fin de chaque passe. Réciter la règle appliquée avant de coder.

# Numérotation native des éditions — invariant obligatoire

⛔ **Avant toute scission, fusion ou modification d'alignement dans `versets_v2` :**

- `ch_orig`, `v_orig` et `v_orig_suffixe` décrivent exclusivement la numérotation de l'édition source ; ils ne doivent jamais être déduits de `canon_id` ni de la numérotation AELF ;
- lorsqu'un verset source est scindé entre plusieurs cibles canoniques, chaque fragment conserve exactement les mêmes `ch_orig`, `v_orig` et `v_orig_suffixe` que le verset source ; ne jamais inventer de suffixes `a`, `b`, `c` pour distinguer les fragments ;
- seul l'alignement canonique varie entre les fragments (`canon_id`, `canon_id_fin`, `ordre_slot`) ;
- comparer les coordonnées au corpus source et à la sauvegarde préalable, puis contrôler après écriture que texte, canon et créneau n'ont pas changé accidentellement.

# `versets_lecture` est une vue MATÉRIALISÉE — piège de rafraîchissement

⚠️ Ce que lisent les pages de lecture (Bible, œuvre, péricope) via `versets_lecture` est une **vue matérialisée** (un cache), construite sur `versets_v2` (+ `versets_canon`). Elle porte les colonnes larges `TR000x` (texte) et `num_TR000x` (numérotation source), agrégées par créneau canonique.

**Conséquence** : toute modification de `versets_v2` (texte, numérotation, alignement) **ne s'affiche PAS** tant que le cache n'est pas rafraîchi. Après une correction de corpus, exécuter :

```sql
REFRESH MATERIALIZED VIEW public.versets_lecture;
```

Sans quoi une correction « ne se voit pas » et l'on croit à tort qu'elle a échoué. Vaut pour tout le monde (moi, l'utilisateur, Codex) : une écriture dans `versets_v2` sans refresh reste invisible côté lecture.

**Trouvaille de contexte (2026-08-05)** : la Bible de Sacy (`TR0001`) avait conservé le **numéro de verset imprimé en tête du texte** (« 1. MAis il faut… »), résidu d'un lot d'import — sur ~180 versets (2 Co 7-13, Galates 1, titres de psaumes). Corrigé dans `versets_v2` (retrait du seul préfixe `^\d+\.\s*`, sauvegarde `backup_tr0001_numerotation_20260805`), **puis refresh de la vue**. Segond et Crampon étaient propres : le défaut était propre à un import Sacy.

# Valeur académique des éditeurs / auteurs (bibliographie)

Notation éditoriale des sources bibliographiques — **doctrine : charte §29 et §29.1**. Tables `editeurs_valeur` et `auteurs_valeur` (`nom`, `score` 1..5, `statut_usage`, `reserve`+`motif` pour les auteurs, plus `confiance_evaluation`/`source_evaluation`/`evalue_par`/`evalue_at`), RLS **admin uniquement**. Score de **1 (le plus fiable) à 5**. Admin : onglet « Valeur académique » (`/admin?onglet=fiabilite`, `app/admin/SectionFiabilite.tsx`).

⚠️ **Correspondance imposée par la base** : le code écrit `statut_usage` accordé au score (1→`reference`, 2→`solide`, 3-4→`secondaire`, 5→`exclu`, absent→`a_verifier`) sinon l'écriture est refusée. Logique pure et testée dans `app/admin/qualification.ts` (`statutUsagePourScore`, `messageErreurQualification`).

⚠️ **Peupler depuis le RÉEL** : ces listes couvrent les éditeurs et auteurs effectivement cités dans `ouvrages_bibliographiques` (colonnes `editeur`, `auteurs`), à charger depuis leurs valeurs distinctes — **jamais une liste inventée**. Ne pas confondre avec la table `editeurs` (éditeurs des éditions **primaires** : François Guyot, Vivès, Bloud & Gay… — autre usage). Terminologie : « valeur académique » (critères objectifs), pas « fiabilité » ; la `reserve` protège un public fragile, ce n'est pas un jugement de la personne.

**Qualification scientifique des ouvrages (déployée en base)** : la valeur finale d'un ouvrage est CALCULÉE par la base dans `ouvrages_bibliographiques.statut_scientifique` (`retenu`/`secondaire`/`a_verifier`/`exclu`) — **le code ne la recalcule jamais**. Décision manuelle via `statut_scientifique_override` (null = calcul auto ; exclusion = motif obligatoire). Quatre vues selon le contexte : `pericopes_documentation` (doc interne), `bibliographie_admissible` (sélection interne, écarte exclus/à vérifier), `bibliographie_publiable` (public : lien vérifié + ouvrage validé + retenu/secondaire), `v_ouvrages_bibliographiques_qualite` (admin qualité). **Choisir la vue, ne pas réapprocher le filtrage en TS.** La page `pericopes/[id]` lit `bibliographie_admissible` provisoirement (cible : `publiable`). Admin des ouvrages : onglet « Ouvrages » (`/admin?onglet=ouvrages`, `app/admin/SectionOuvrages.tsx`) ; écriture réservée par la policy RLS `ouvrages_bibliographiques_admin_all`. Un chercheur = fiche notée ; un Père/auteur ancien ou collectif = source, **jamais de fiche notée**.

# Style rédactionnel (textes du site)

Pour toute prose destinée au site (cartes, chapeaux, messages, mentions) : **ne pas employer d'incises entre tirets** (`— … —` ou `– … –`). Faire des phrases distinctes, ou introduire une énumération par deux-points. C'est le style de l'auteur (« dans mon style, toujours »). Vaut aussi pour retoucher les textes existants, pas seulement les nouveaux.

# Responsive / mise à l'échelle (écrans desktop)

Le site est dessiné en pixels fixes calibrés pour un portable. Pour l'agrandir sur grand écran **sans le refondre**, on scale par une **police racine fluide** et une conversion **px → rem** progressive, page par page.

- **Moteur** : `html { font-size: clamp(16px, calc(7px + 0.625vw), 22px) }` dans `app/globals.css` — 16px jusqu'à 1440px (aucun changement visuel sur portable), puis grandit jusqu'à 22px à 2400px (×1,375). On ne touche **QUE** `font-size` : les unités `vh` restent intactes, donc les mises en page pleine hauteur `calc(100vh - 48px)` ne débordent jamais. **C'est la raison qui écarte `zoom`** (qui rescale les `vh` et fait déborder).
- **Convention de conversion** : passer en **rem** (valeur px ÷ 16) tout ce qui gouverne **taille de texte, mesure de lecture, rythme de lecture, largeur de colonne de contenu**. **Rester en px** pour : filets/bordures `1px` (le rem devient flou), géométrie de chrome à hauteur fixe (grilles serrées, boutons), largeurs de volets **persistées en localStorage** (drag), et la **hauteur de Navbar (48px)**.
- **Piège des blocs `<style>` (trouvaille)** : les conversions qui ne visent que les styles *inline* (`fontSize`) laissent intacts les `font-size` en **kebab-case** DANS les blocs `` <style>{`…`}</style> ``. Ces restes ont persisté sur le chantier, les sections admin et plusieurs pages lecteur (recherche, essais, traductions, bibliothèque, compte, commentaires…), restant petits sur grand écran alors que le reste grossissait. **Convertir aussi le CSS des blocs `<style>`**, en **sautant les lignes `@media`** (sinon on casse la valeur du breakpoint) et en gardant le garde-fou iOS `font-size: 16px` au focus. Repérage : `grep -rnE 'font-size: *[0-9]+px' app` (doit ne plus rien renvoyer hors le `16px !important` iOS).
- **Mesure de lecture** : tokens `--mesure-*` dans `:root` (`globals.css`), en rem, pour que la colonne conserve ses proportions (mêmes caractères/ligne) quand le texte grossit.
- **Navbar** : hauteur = **`HAUTEUR_NAVBAR = '3.5rem'`** (chaîne rem, dans `app/lib/mesures.ts`) → la barre grandit avec la police racine. Tous les décalages du site sont accordés à cette valeur : `calc(100vh/100dvh - 3.5rem)`, `top/paddingTop/scrollMarginTop: '3.5rem'`. ⚠️ **`HAUTEUR_NAVBAR` n'est plus un nombre** : ne jamais faire d'arithmétique JS dessus — composer en `calc(${HAUTEUR_NAVBAR} + Npx)` (cf. `SOMMET_CORPS` dans `polyglotte/page.tsx`, en-têtes collants). Pour changer la hauteur, modifier `mesures.ts` **et** répercuter la valeur sur ces décalages. Breakpoint du menu desktop : `md` → **`lg` (1024px)** pour éviter le tassement des liens.
- **Portée** : desktop d'abord ; le mobile est traité ensuite (ci-dessous).

## Responsive mobile (téléphone + tablette portrait, ≤ 900px)

Chantier distinct du scaling desktop. Seuil unique **900px** via le hook `useEstMobile(seuil = 900)` (`app/lib/useEstMobile.ts`) : `false` au rendu serveur et au premier rendu client (pas de désaccord d'hydratation), puis bascule au montage selon `matchMedia`.

- **Mises en page à volets → empilé.** Les pages à colonnes côte à côte (Bible et Œuvre : barres fixes + tiroirs ; Recherche et lecture d'un essai : empilement / volet Commentaires en tiroir bas ; Polyglotte et éditeur d'essai : message « écran large requis » — outils d'écriture/comparaison impraticables sur téléphone) ne tiennent pas sur un téléphone : le côte-à-côte écrase le texte. Patron retenu : **empilement vertical** en flux document. `BibleLayout` détecte `mobile` et passe un prop `mobile` à `NavLivres` / `TexteBible` / `PanneauPatristique` ; chacun, en mobile, se rend **pleine largeur, hauteur auto**, sans poignée de redimensionnement.
- **Volets latéraux (NavLivres, PanneauPatristique).** En desktop, repli en **rail vertical 22px**. En mobile (retour d'usage) : **barres fixes toujours visibles, fermées par défaut** — « Livres » `position: fixed` sous la navbar (`top: HAUTEUR_NAVBAR`), « Commentaires » `fixed` en bas ; au tap, le volet s'ouvre en **TIROIR** (`position: fixed`, `z ≥ 2400`) par-dessus le texte, avec un **fond assombri** qui referme au tap (Livres descend du haut, Pères monte du bas). NavLivres se **replie au choix d'un chapitre**. `TexteBible` réserve des marges haut/bas (`paddingTop`/`paddingBottom`) pour dégager les deux barres fixes.
- **Actions du verset (TexteBible).** En mobile, la colonne de boutons (signet, copier, signaler, éditer) **sort de la grille** (texte pleine largeur) ; un **appui long** (~450ms, `onTouchStart` + timer) fait surgir un **pavé flottant** d'actions en haut à droite du verset. Le clic suivant l'appui long est neutralisé (sinon il désélectionne).
- **Conteneur.** Le shell Bible passe de `flex` (rangée, hauteur fixe `100vh - navbar`, `overflow:hidden`) à `flex-direction:column`, hauteur auto, `overflow:visible` → défilement naturel du document. Les zones de scroll internes (`overflow-y-auto flex-1`) redeviennent du flux (`className` neutralisée en mobile).
- **Piège inline.** Ces composants sont pilotés par styles **inline** (largeur/hauteur), non surchargeables par média-query : le patron passe donc par un **prop `mobile` en JS** (comme la Navbar), pas par du CSS `@media`.
- **La Navbar est déjà mobile** (hamburger + versions mobiles recherche/compte) — rien à refaire.
- **Test** : le navigateur *intégré* (Browser pane) honore le viewport (`resize_window` → largeur réelle) ; le navigateur *claude-in-chrome* NON (reste à 1920). Les pages derrière le verrou exigent une session (compte invité `ACCES_INVITES`).

# Contrôle des œuvres (admin) — score de qualité figé

La coloration de la liste (rouge/jaune/vert selon critique/moyen) venait de la vue `oeuvres_controle_stats`, **recalculée à chaque ouverture** : ~10,5 s (scan de ~123 000 segments + ~10 regex/segment + tri disque). Désormais **figée** dans la vue matérialisée `oeuvres_controle_stats_mat` (lecture ~0,1 ms). Recalcul **sur demande seulement** : bouton « ↻ Recalculer » → route admin `POST /api/admin/controle-refresh` → RPC `rafraichir_controle_stats()` (SECURITY DEFINER, service_role) qui fait `REFRESH MATERIALIZED VIEW CONCURRENTLY` et met à jour `controle_stats_meta.calcule_le` (affiché comme « Qualité calculée le … »). ⚠️ Après édition de segments/rangs, les couleurs restent figées jusqu'au prochain recalcul manuel — c'est voulu. `anon` n'a pas accès à ces objets (admin = `authenticated`).

# Titres — jamais de point final ; commentaire de traduction

- **Jamais de point à la fin d'un titre** (œuvre, sous-titre, niveaux de titre du corps). Retrait à l'affichage via `sansPointFinal` (`app/lib/titres.ts`) — préserve « … » / « ... » et les points internes ; à n'appliquer qu'aux TITRES, pas aux chapeaux/`_texte` (des phrases). Appliqué dans `PageTitre` (titre, sous-titre), `OeuvreClient` (`rendreTitreColophonAvecNotes(..., estTitre=true)` pour niv1-4, pas les `_texte`) et la liste d'œuvres de `ModaleAuteur`.
- **Commentaire sur la traduction** : colonne dédiée `oeuvres.commentaire_traduction` (ex. « Attribution discutée avec Marc-Antoine de La Bastide » pour Ratramne, sortie de `trad_auteur`). Affichée en note discrète sur la page de titre, et en consultation seule (pastille 🗨 + infobulle) dans l'admin Bibliothèque.

# Catalogue — règle des œuvres candidates

Une fiche `catalogue_notices` **candidate** (`decision_import` commençant par « Candidat ») doit avoir une **source de texte intégral** (`url_texte_integral`, le lien « Fichier ») : c'est ce qui la rend importable. Une candidate sans fichier n'est pas une vraie candidate : elle est reclassée en **« Bibliographie seulement »** (référence connue, sans texte à importer). Reclassement du 2026-08-05 : 257 candidates sans fichier passées en bibliographie (sauvegarde `parametres['catalogue_reclass_candidats_sans_fichier_20260805']`) ; il reste 437 candidates, toutes pourvues d'un fichier. La notice source (`url_source`, lien « Notice ») est distincte et déjà présente sur toutes.

# Ouverture des grosses œuvres — chargement en tranche

Le coût d'ouverture d'une œuvre n'est PAS l'apparat critique (les grosses œuvres n'en ont quasiment pas), mais **le premier niveau 1 chargé en entier avant le premier rendu** (ex. Somme théologique, « Prima Pars » = 6180 segments ; un autre niv1 monte à 9094). La lecture est déjà paresseuse ENTRE niv1 ; le problème était À L'INTÉRIEUR du premier.

Solution en place : le serveur (`app/oeuvre/[id]/page.tsx`, `chargerTrancheTexte`) n'envoie que la **1re tranche** (`PLAFOND_TRANCHE = 1000` segments), ordonnée par **`segment_numero`** (donc un vrai préfixe du chargement complet), avec un booléen `niv1InitialPartiel`. Le client (`OeuvreClient.tsx`) complète le reste **en tâche de fond** via `chargerNiv1Data` (un `useEffect` monté une fois), en ne l'appliquant que si le lecteur n'a pas changé de niv1 (`niv1ActifRef`). ⚠️ Garder l'ordre `segment_numero` des deux côtés, sinon la page se réagence après complétion.

# Date de mise en ligne d'une œuvre

`oeuvres.date_mise_en_ligne` (timestamptz) = millésime de l'**édition en ligne**, affiché au colophon de la page de titre (`PageTitre.tsx`, « Édition en ligne, AAAA »). **Estampillée automatiquement à la PREMIÈRE publication** (dans `api/admin/update-oeuvre`, quand `champ='note'` passe à null/vide) et **jamais réécrite ensuite** (`.is('date_mise_en_ligne', null)`) : dépublier puis republier ne change pas la date. Absente → la ligne est masquée.

# Piège technique — migration / copie du projet

Après un déplacement ou une copie du dépôt (nouveau PC, changement de disque), **purger `node_modules` ET `.next`**, puis `npm install`. Un `.next` hérité de l'ancien emplacement (chemins absolus périmés) fait planter Turbopack en boucle à l'écriture : « **Failed to write app endpoint … Next.js package not found** », version `0.0.0`. Réinstaller `node_modules` seul **ne suffit pas** — c'est le cache `.next` (ignoré par git) qu'il faut supprimer.

# Textes originaux parallèles — alignement éditorial

Avant d’associer un original grec ou latin à une traduction déjà segmentée, relire la charte `parametres.charte_ia`, §12.2. Ne jamais supposer que les blocs HTML, les paragraphes ou même les limites de chapitres de deux éditions coïncident. L’automatique ne fournit que des candidats : l’arbitrage est sémantique, avec relecture systématique des limites, cas extrêmes et sondages répartis.

Pour un paragraphe traduit réparti sur plusieurs segments, `texte_original` va uniquement sur le segment de `rang = 1` ; les rangs suivants restent à `null`. L’original doit se recomposer exactement, sans perte, duplication, normalisation ni changement d’ordre. Une divergence de limite de chapitre peut être corrigée en redistribuant le fragment continu vers le paragraphe traduit correspondant, tout en conservant sa provenance.

Cas de référence : *Confessions* `A0010O0001`, latin de Pius Knöll, CSEL 33 (1896), 13 livres, 278 chapitres, 932 associations. Voir `scripts/confessions-align-latin-csel-2026-07-29.py` et `feedback_liens_protocole`.

# Chronologie et événements — système centralisé

Doctrine éditoriale : charte `parametres.charte_ia` **§26**. Invariants techniques du dépôt :

- **Quatre tables.** `evenements` = source unique de chaque événement (clé métier texte `EVT######`). `genres_evenements` et `familles_evenements` = listes contrôlées ; la **famille se déduit du genre** (jamais saisie sur l'événement). `auteurs_evenements` = association N-N auteur ↔ événement, portant `nature_lien`, `pertinence`, `est_affiche`, `a_controler`, `titre_personnalise`…
- **Intégrité par les clés étrangères.** `auteurs_evenements.evenement_id → evenements(id)` **ON DELETE RESTRICT** (une association ne peut pas détruire l'événement central) ; `auteur_id → auteurs(id_auteur)` **ON DELETE CASCADE** ; `UNIQUE(auteur_id, evenement_id)`.
- **Degrés en TEXT.** `importance_generale` (« A — structurant »…) et `pertinence` (« indispensable »…) sont du **texte**, pas des entiers.
- **Publication.** `est_publie`/`est_affiche` à `true` par défaut (pas de file de validation) ; `a_controler` signale une relecture sans bloquer l'affichage.
- **Accès public.** Chaque table : RLS activé **+** policy `SELECT` publique **+** `GRANT SELECT … TO anon, authenticated` (le RLS seul ne suffit pas → 42501), puis `notify pgrst, 'reload schema'`.
- **Rendu : passer par les VUES, jamais par les tables.** Le site lit exclusivement `v_frise_generale` (frise générale, `app/histoire/page.tsx`) et `v_chronologie_auteurs` (chronologie d'un auteur, `FriseAuteur` dans `app/components/ModaleAuteur.tsx`). Interroger `evenements` ou `auteurs_evenements` depuis une page publique est proscrit : les vues portent déjà l'ordre éditorial, la date rédigée, le type d'affichage, la géographie de filtrage et les sources. Règles communes dans `app/lib/frise.ts`.
  - **Tri : `ordre_affichage` uniquement.** Ne jamais retrier en JavaScript. Cet ordre départage les événements d'une même année (66 années sont partagées), ce qu'un tri par date ne sait pas faire.
  - **Dates : afficher `date_affichage` tel quel.** Ne jamais recomposer depuis `date_debut`/`date_fin` : la donnée porte les nuances éditoriales (« vers 329 », « printemps 387 », « 7 mai–17 juillet 1274 »), avec des tirets demi-cadratins.
  - **Type d'événement** : lire `type_affichage` (`vie`, `œuvre`, `contexte`), qui n'est plus déduit de `nature_lien` ni de `portee`. Les trois brins vont dans UNE seule frise.
  - **Filtre par pays** : uniquement `pays_filtre_codes` / `pays_filtres` (territoire actuel). Le champ `pays` est la désignation historique, réservée à l'affichage : Carthage se filtre sous « Tunisie » tout en restant « Empire romain » à l'écran.
  - **Champs techniques jamais montrés au lecteur** : `ordre_force`, `a_controler`, `pertinence_ordre`.
  - **Sources** : jamais d'URL brute (toutes les `source_principale` en sont), les rendre par nom de domaine avec `target="_blank"` et `rel="noopener noreferrer"`. Distinguer la source de l'événement et celle du rattachement à l'auteur (`source_lien`).
  - Siècles via `app/lib/siecles.tsx` (jamais composés à la main). Ne jamais créer d'auteur ni d'association silencieuse depuis les données (charte §26.2–26.3).
- **Piège d'accès.** Les deux vues sont en `security_invoker=true` : elles s'exécutent avec les droits de l'appelant. `v_chronologie_auteurs` joint `auteurs`, que `anon` ne peut pas lire, d'où un **42501 en anonyme** ; elle fonctionne pour `authenticated`, ce qui suffit tant que le site est fermé (la fiche auteur exige déjà `auteurs`). Si le site s'ouvre au public, accorder `SELECT` sur `auteurs` à `anon` ou passer la vue en `security_definer`.
- **Admin.** Onglet « Chronologie » : `app/admin/SectionEvenements.tsx` (file « à contrôler », édition événements + associations, ajout d'un lien vers un auteur EXISTANT). Écritures service-role via `app/api/admin/evenements/route.ts` (actions `maj-evenement`, `maj-association`, `suppr-association`, `creer-association` — cette dernière refuse tout auteur introuvable). Contraintes clés : `date_debut`/`date_fin`/`qualification_date`/`genre_id`/`portee`/`source_principale`/`origine_donnee`/`statut_source` sont NOT NULL ; `importance_generale` = grade A/B/C si `portee='générale'`, sinon NULL.

# Fiche « À propos de cette traduction » (NavLivres.tsx) — règles d'affichage

Modale alimentée par `v_traductions_page` (par `trad_id`) et `v_chronologie_traductions`. Règles fixées :

- **Numérotation de la Vulgate : jamais affichée.** Quand `schema_numerotation = 'vulgate'`, la ligne « Numérotation » est masquée (elle va de soi pour un texte établi sur la Vulgate). Les autres schémas restent affichés.
- **Structure.** Les métadonnées (Première publication, Confession, Langue, puis l'édition) vivent toutes dans la section repliable « Édition et état du texte ». Pas d'encart de statut permanent en tête de fiche.
- **Année et lieu** sur deux lignes distinctes (jamais « Année et lieu » fusionnés).
- **Édition de référence** : afficher le libellé seul, **sans** lien « Consulter le fac-similé » — redondant avec « Voir la source numérique » (même URL Gallica pour la Bible de Sacy).
- **Vérification.** Le statut du corpus (`statut_corpus_public`) et les lacunes (`lacunes_publiques`) ne sont plus un encart : ils se déplient en note en cliquant sur la valeur de la rubrique « Vérification » (« Contrôle en cours »).
- **Enrichissements de la chronologie.** `FriseAuteur` (partagée) rend intitulés ET notices via `rendreMarquesNote` (`app/lib/texteEnrichiEssai.tsx`) : **gras**, *italique*, ++petites capitales++, ^^exposant^^. Ne pas revenir à un rendu texte brut de la notice.
- **Légende de la frise.** `FriseAuteur` accepte `sansLegende` (passé pour la chronologie d'une traduction) ; elle se masque aussi d'elle-même quand un seul brin est présent. Trouvaille : la vue `v_chronologie_traductions` renvoie des `type_affichage` **accentués** (« édition », « réception ») qui ne matchent pas les clés non accentuées de `COUL_TYPE`/`LIB_TYPE` — d'où l'ancien « Formation » seul dans la légende et des puces grises. La légende masquée contourne le symptôme ; si un jour on réaffiche la légende d'une traduction, normaliser d'abord les clés.

# Recherche de péricopes (RPC rechercher_pericopes)

Intégrée à la recherche rapide globale de la Navbar (`app/components/Navbar.tsx`), en SECTION distincte « Péricopes », menée en parallèle des autres catégories (effet dédié, non bloquant).

- **RPC** : `supabase.rpc('rechercher_pericopes', { p_requete, p_limite: 8 })`, réservé aux **authentifiés**. Ne pas l'ouvrir aux anonymes sans décision explicite (RLS inchangée). Helper : `chercherPericopes()` dans `app/lib/pericopes.ts` (types, `referencePericope`, `correspondanceVisible`, `libelleCategoriePericope`).
- **Comportement** : rien sous 2 caractères, debounce ~200 ms, chaque frappe annule la requête précédente (AbortController → aucune réponse obsolète), 8 résultats max, une ligne = une péricope.
- **Affichage** : titre principal / référence biblique / catégorie. La référence se construit sur la PREMIÈRE occurrence principale. Ligne « Correspond à : X » seulement si `correspondance_visible === true` et `correspondance !== titre` — ne JAMAIS afficher un alias masqué ou inexact (ex. « baleine » → « Jonas et le grand poisson », jamais « Jonas dans la baleine »).
- **Navigation** : clic ou Entrée → `/pericopes/${pericope_id}` (le `pericope_id` est un slug). Nav clavier (↑/↓), Échap ferme.
- **Références bibliques** : fonction centralisée `formaterPlageCanonique` dans `app/lib/referencesBibliques.ts` (« JHN.4.1 »/« JHN.4.42 » → « Jean 4,1-42 » ; noms dérivés de `LIVRES`, Psautier au singulier). À réutiliser partout.
- **Page de détail** : `app/pericopes/[id]/page.tsx` (composant client, session normale) — titre, notice, contexte, occurrences bibliques, variantes `visible_public` uniquement. Lit `pericopes`, `pericope_occurrences`, `pericope_noms` (policies SELECT `authenticated` déjà en place).
- Le projet n'utilise PAS de types Supabase générés : rien à régénérer.

## Péricopes — pages catalogue & détail

- **Catalogue** : `app/pericopes/page.tsx` (client), accessible depuis « Aller plus loin » (onglet « Péricopes » → `/pericopes`). Volet gauche : recherche par nom, filtre par Testament (AT/NT/Autres, déduit de `LIVRES`) et par **registre** (`categorie`, effectifs affichés). Liste **groupée par livre** en ordre canonique (`LIVRES`), chaque péricope reliée à sa page. Données via `chargerCataloguePericopes()` (fusion `pericopes` + occurrence `est_principale`, un livre représentatif par péricope ; 249 péricopes).
- **Détail** : `app/pericopes/[id]/page.tsx` affiche notice, contexte, **le texte biblique visé** (étendue de l'occurrence principale) dans une **traduction changeable** (sélecteur `TRADUCTIONS_BIBLE` : Sacy/Segond/Crampon/Vulgate/Septante ; défaut Sacy `TR0001`), plus occurrences et variantes visibles.
- **Texte biblique** : `chargerTextePericope(livre, canonDebut, canonFin, tradCode)` lit la vue large `versets_lecture` (colonnes `TR000x` = texte, `num_TR000x` = numéro affiché, tri par `ordre`). Récupère la plage par `livre` + `chapitre` bornés puis affine les versets aux bornes exactes. Colonne de traduction choisie dynamiquement (jamais de saisie libre → `select` typé Supabase casté via `unknown`). Septante = AT seulement → « Texte indisponible dans cette traduction » géré.

## Péricope détail — texte de chaque occurrence & volet patristique

- **Toutes les occurrences** sont affichées avec leur texte complet, chacune dans une carte distincte (référence en tête, badge « principale », puis le texte verset par verset). `app/pericopes/[id]/page.tsx` charge le texte de chaque occurrence en parallèle (`chargerTextePericope`) et le recharge au changement de traduction.
- **Colonne de droite = doublon du volet de la page Bible** : on embarque directement `PanneauPatristique` (collant, hauteur `100dvh - navbar` sur desktop ; empilé `presentation="inline"` en mobile). Nouveau prop **`plage={{ livre, canonDebut, canonFin }}`** (+ `refAffichee`) : le volet charge l'apparat de la PLAGE canonique exacte via `segmentsLiesAPlage` (`app/lib/liens.ts`) au lieu d'un verset/chapitre. Additif : la page Bible ne passe pas `plage`, son comportement est inchangé.

# Page « Publications » (liste des essais) — structure « l'Index »

Refonte de `app/essais/EssaisListeClient.tsx` (onglet « Écrits de la communauté »). Table des matières éditoriale sobre : tout est visible au repos, aucun filigrane, aucune animation, aucun contenu caché au survol. L'ancien dispositif (podium top-3 mesuré au pixel en JS + cartes « filigrane » où le texte s'enroulait autour d'un cartouche, variante `featured` morte, fonctions `largeur*`/`lignesTitreCentre`/`texteFiligrane`) a été entièrement supprimé.

- **En-tête** minimal : titre « Publications », un ◆ discret (or `#9a7a40`), puis les onglets. Pas de sur-titre ni de chapeau (jugés « trop chargés »).
- **Sommaire** en grille deux colonnes (`.publications-index`), filets fins entre entrées. Chaque entrée : auteur (petites capitales or), date (italique serif), titre (serif), résumé (italique, écrêté 2 lignes), catégories, vues, ♥, étoile favori (`EtoileFavori`, gère lui-même `preventDefault`/`stopPropagation` dans le `Link`).
- **À la une** : première entrée du sommaire, colonne de gauche, sur **deux rangs** (`grid-row: span 2`), encadrée, avec **lettrine** (or `#7a6030`) et résumé fer à gauche + césures (la justification en colonne étroite creusait des blancs). Masquée dès qu'un filtre catégorie ou une recherche est actif (l'index redevient uniforme). Le symbole ◆ du marqueur reste **droit** (`.losange { font-style: normal }`), le fleuron `❦` a été écarté.
- **Règle du créneau « à la une »** : chaque publication occupe la une **au moins 10 minutes**, même si une autre paraît juste après. Fenêtres calculées sur `publie_at` : `debut(i) = max(publie_at(i), debut(i-1) + 10 min)` ; la une = l'essai au dernier créneau ouvert à l'instant présent. `uneId` calculé au montage seulement (pas de désaccord d'hydratation : au 1ᵉʳ rendu = le dernier paru) ; recalcul par `setTimeout` uniquement s'il existe un créneau futur. En pratique (publications espacées de jours) = toujours le dernier paru.
- **Les plus lus** : les 3 premiers par vues (puis ♥) sont signalés « ◆ parmi les plus lus » dans l'index, **sans être retirés** du fil chronologique (l'ancien podium les en sortait).
- **px → rem** : toutes les `font-size` du bloc `<style>` sont en rem (respect du scaling desktop, cf. § responsive/mise à l'échelle).
- **Charge serveur** : `app/essais/page.tsx` ne récupère plus `contenu` (lourd, ne servait qu'au filigrane) ; la plomberie d'injection d'avatar (`cs_photo_profil`) a aussi été retirée du client, l'avatar n'étant plus affiché.

# Navbar — menus « Aller plus loin » et « Administration », pages indépendantes

Réorganisation de `app/components/Navbar.tsx` et éclatement de l'ancienne page à onglets `/traductions`.

- **« Aller plus loin » n'est plus une page à onglets.** Chaque ancien onglet est désormais une **page indépendante** ; l'onglet de la navbar déploie au survol (`OngletAllerPlusLoin`, styles `.cs-plus`/`.cs-plus-menu`) la liste `LIENS_ALLER_PLUS_LOIN` : `/traductions` (Les traductions), `/librairies` (Acheter des livres), `/statistiques` (Statistiques), `/pericopes` (Péricopes), `/histoire` (Histoire de l'Église). Le clic sur le libellé ouvre `/traductions`.
  - `/traductions` = `AllerPlusLoinClient.tsx`, réduit à la seule vue « Les traductions » (garde le lien profond `#TR000x`). `/librairies` = page serveur statique. `/statistiques` = `StatistiquesClient.tsx` (versets les plus cités / les plus lus). L'ancienne redirection `/populaires` pointe désormais vers `/statistiques`.
- **« Quiz biblique » n'a plus d'accès par onglet** (retiré d'« Aller plus loin » ; `QuizBibliqueClient` n'y est plus importé). La page `/quiz` subsiste mais n'est plus liée depuis la navbar.
- **Onglet « Administration »** (`OngletAdministration`, réservé aux admins : `estAdmin || estAdminEmail`) : au survol, menu listant chaque section d'admin via `LIENS_ADMIN` → `/admin?onglet=<clé>`, puis, après un filet (`.cs-plus-sep`), l'outil **Bible 899** (`/manuscrits/bible-899`). `AdminClient` lit désormais `?onglet=<clé>` pour **toute** section valide (plus seulement `controle-oeuvres`).
- **Bible 899 ne vit plus que sous Administration** (retiré d'« Aller plus loin »).
- **Mobile** : le panneau déplié reconstruit ces groupes (helper `lienMobile`, intertitres `styleSectionMobile`) : lecture + Patristique/Publications, puis « Aller plus loin » déplié, puis, pour un admin, « Administration » (sections + Bible 899).

# Catalogue des péricopes (liste) — mise en forme arrêtée

`app/pericopes/page.tsx`. Partis pris fixés après itérations (ne pas revenir dessus sans raison) :

- **En-tête de livre AU FER À GAUCHE** (jamais centré) : nom en serif, filet dégradé qui s'estompe vers la droite, compte discret au bout (`.peri-livre-tete`).
- **Deux colonnes par livre** (une seule en mobile). Bloc compact À L'INTÉRIEUR mais **blocs espacés** entre eux (`rowGap: 9px`).
- **Entrée** : intitulé en **serif** à gauche, **référence dorée à droite** (comme la table d'un livre) ; ligne 2 = registre en petit gris + « notice » (lien italique révélé au survol, toujours visible au tactile via `@media (hover:none)`). L'intitulé ne disparaît plus au survol.
- **Pas de couleurs de registre** : trop de catégories, le code couleur n'aide pas. Registre en gris uni ; `REGISTRE_COUL`/`coulRegistre` supprimés, pas de pastille dans le filtre. Seul accent conservé : le doré de la référence.
- **Notice dépliée en place** (chargée à la demande via `chargerNoticePericope`), sous le bloc.
- **Recherche élargie aux appellations** (`pericope_noms`, chargées par `chargerCataloguePericopes` dans `item.appellations`) ; mention « trouvé via « … » » quand le match ne vient pas du titre.
- **Index « Aller à un livre »** dans le volet : abréviations `ABREV_FR` en **sans**, alignées en grille de 4 colonnes, **séparées Ancien / Nouveau Testament** (+ Autres). Clic → `scrollIntoView` vers l'ancre `#livre-<code>`. Pas de cadres.
- **Volet gauche** : sur-titre « Catalogue » (plus « Aller plus loin »), chapeau définissant la péricope sous le titre, ligne d'étendue « De la Genèse à l'Apocalypse » (pas de compteur total ; « N péricopes » retiré).
- **Enrichissements** (`rendreTexteEnrichi`) appliqués aux intitulés et aux notices, ici comme sur la page détail.
- **Badge « ensemble »** (italique muet) sur les péricopes `est_collection`.

# Palette harmonisée — tokens sémantiques (`app/globals.css`, `:root`)

Toutes les couleurs de l'interface passent par des **tokens sémantiques** définis dans `:root` de `app/globals.css`. Ils sont **ancrés sur les valeurs déjà dominantes** du code : le rendu perçu ne bouge pas, mais les ~776 couleurs en dur (dont des dizaines de quasi-doublons indiscernables) sont rabattues sur ~22 tokens. **Règle : aucune couleur d'interface n'est écrite en dur ; on utilise le token** (`color: 'var(--cs-texte-doux)'`, `background: 'rgba(var(--cs-danger-rgb), 0.1)'`).

Familles :
- **Accent vert** : `--cs-vert` (`#3d6b4f`), `--cs-vert-rgb` (`61, 107, 79`, pour les `rgba(...)`), `--cs-vert-fonce` (`#2e5440`, survol/pressé), `--cs-vert-pale` (`#dfe8e0`, encarts).
- **Fonds** (crème) : `--cs-fond` (`#f7f4ef`), `--cs-fond-clair` (`#faf8f4`), `--cs-fond-doux` (`#ede9e2`).
- **Bordures & filets** : `--cs-bord` (`#d6d0c4`), `--cs-bord-rgb` (`214, 208, 196`), `--cs-bord-clair` (`#e4dfd8`).
- **Texte** (gris chauds, du ténu au corps) : `--cs-texte-faible` (`#b0a89e`), `--cs-texte-doux` (`#9a958d`), `--cs-texte-second` (`#6b6560`), `--cs-texte` (`#3a3530`), `--cs-texte-fort` (`#2a2520`).
- **Encre** (verts des titres) : `--cs-encre` (`#2a3d30`), `--cs-encre-fonce` (`#1e2e24`). *(Ces verts d'encre, jadis en dur, sont désormais tokenisés.)*
- **Danger & alerte** : `--cs-danger` (`#c0562a`), `--cs-danger-rgb` (`192, 86, 42`), `--cs-danger-fonce` (`#9a2a2a`), `--cs-danger-fond` (`#fdf2ee`), `--cs-danger-bord` (`#e4c4b8`).
- **Or** (références, fleurons, favoris) : `--cs-or` (`#9a7a38`), `--cs-or-doux` (`#c8b89e`).

**Exception volontaire — SVG** : les attributs de présentation `fill=`/`stroke=`/`stop-color=` gardent la valeur **littérale** (une custom property n'y est pas résolue par les navigateurs). Le script de bascule les préserve ; pour tokeniser un SVG, passer par `style={{ stroke: 'var(--cs-vert)' }}`.

**Bascule** : script `scratchpad/sweep-palette.mjs` (table de rabat curée, exceptions SVG protégées), migration sur 89 fichiers / ~2082 usages, en plus des 681 usages du vert. `globals.css` est exclu du balayage (c'est là que les tokens sont **définis**). Référence visuelle de la palette : maquette « Palette d'harmonie » (voir charte §18).

**Mode sombre** : le site est en thème **clair** ; les tokens ne portent qu'un jeu de valeurs. Un mode sombre éventuel se dérivera de ces mêmes tokens (chantier distinct — ne pas activer un `@media (prefers-color-scheme: dark)` partiel, le reste du site n'est pas prêt).

**Reliquat** : les `rgba(...)` translucides non « de marque » (ombres `rgba(0,0,0,·)` / `rgba(255,255,255,·)`, et quelques teintes rares utilisées &lt; 5 fois) restent en dur — hors périmètre de cette passe.

# Perf du chemin de lecture (audit, point 2)

- **Scroll-spy du sommaire (`OeuvreClient`)** : le `onScroll` qui lit `getBoundingClientRect()` en boucle est désormais **throttlé par `requestAnimationFrame`** (≤ 1 mesure par frame). Ne plus le déthrottler.
- **`FiletSignet` (`TexteBible`)** : le `ResizeObserver` sur le paragraphe suffit (il couvre les reflux, y compris au redimensionnement de fenêtre) ; le listener `window resize` redondant (un par verset prélevé) a été retiré. N.B. le filet n'est rendu que pour les versets **déjà prélevés** (peu nombreux), pas tous.
- **`SelecteurCitation`** : recharge à chaque changement de traduction et ne lit qu'une colonne → passe de `select('*')` à `select('id_verset, verset, ${trad}')` (colonne contrôlée TR000x, jamais de saisie libre).
- **`app/page.tsx` (Bible) — `versets_lecture.select('*')` est VOLONTAIRE** : il charge toutes les traductions d'un chapitre pour permettre le **basculement de traduction instantané côté client** (TexteBible lit `v[traduction]` dans les données déjà en mémoire, sans round-trip). Ne pas restreindre ce select : ce serait une régression UX, pas une optimisation. (Faux positif d'audit.)

# Accessibilité — focus clavier (audit, point 3a)

Anneau de focus **clavier** global dans `app/globals.css` (`:focus-visible`, couleur `--cs-vert`, `!important` pour couvrir les `outline: none` en ligne). Couvre tous les `input/textarea/select/[contenteditable]` + `a/button/[role=button]/[tabindex=0]`.
- **Ne plus** neutraliser le focus sans remplacement : `outline: none` inline reste toléré (l'aspect souris), la règle globale rétablit l'anneau au clavier.
- **Champ sur fond vert/sombre** : ajouter la classe `cs-focus-clair` (anneau clair, sinon le vert ne contraste pas). Déjà posée sur la recherche Navbar et l'input admin sombre.
- Reste à faire sur le point 3 : les `<div/span onClick>` non focusables (clavier), les interactions au survol seul, quelques contrastes de gris, et les 88 `set-state-in-effect`.

# Tests (audit, point 4) — socle vitest

Config `vitest.config.mts` : la suite ne ramasse que `app/**` et `scripts/**` (`include`), et **exclut** `work/`, `audit/`, `tmp/`, `.next/` — leurs tests jetables (assets manquants d'un lot d'import) faisaient échouer `npm test` sans rapport avec le code applicatif.
- Lancer : `npm test` (= `vitest run`). Environnement `node` par défaut ; pour un test qui a besoin du DOM, poser `// @vitest-environment jsdom` en tête de fichier.
- Imports **relatifs** dans les tests (`./referencesBibliques`), pas l'alias `@/` (pas de plugin tsconfig-paths).
- Premières suites sur la logique pure critique : `app/lib/referencesBibliques.test.ts` (formatage des références, utilisé partout) et `app/lib/classement.test.ts` (score/rangs). **Étendre en priorité** aux invariants sensibles : liens bibliques (`scripts/_liens-commun.mjs::verifierLienMecanique`), alignement `versets_v2`, dates historiques.

# Compte requis pour interagir (commenter, signaler, prélever…)

Toute action d'ÉCRITURE de lecteur exige un compte PERSONNEL. Un visiteur sans compte personnel (compte de démonstration partagé, ou anonyme après l'ouverture) qui clique sur commenter, signaler, prélever, proposer un lien, apprécier ou mettre en favori voit une modale d'invitation à créer un compte, au lieu de l'action.

- **Repère du visiteur sans compte** : le compte de démo partagé est identifié par son adresse, exposée au navigateur via `NEXT_PUBLIC_EMAIL_INVITE` (miroir de `NEXT_PUBLIC_ADMIN_EMAIL` ; ce n'est pas un secret). ⚠️ **À renseigner AUSSI dans l'hébergeur (Vercel)**, sinon seul l'anonyme (aucune session) est tenu pour « sans compte ». Valeur bêta : `corpus-scriptura-invite@protonmail.com`.
- **Mécanisme central** : `app/lib/contexteCompte.tsx` (`ProvisionCompte` monté dans `app/layout.tsx`, hook `useCompte()`). `aUnCompte` = session ET adresse ≠ EMAIL_INVITE. `exigerCompte(contexte?)` renvoie `true` si compte personnel (l'action suit), sinon ouvre la modale partagée et renvoie `false`. Poser `if (!exigerCompte('…')) return` EN TÊTE de chaque écriture ; l'argument amorce la phrase (« Pour commenter ce passage… »).
- **Surfaces** : modale `app/components/ModaleCompteRequis.tsx` (portail, palette du site, boutons « Créer un compte » / « J'ai déjà un compte ») ; encart inline `app/components/InvitationCompteInline.tsx` qui remplace les composeurs de commentaire quand `!aUnCompte`.
- **Destination « Créer un compte »** : constante `ROUTE_INSCRIPTION` dans `ModaleCompteRequis.tsx`, aujourd'hui `/chantier` (connexion + liste d'attente). ⚠️ **La repointer vers `/inscription`** le jour où la page d'inscription libre existe (un seul endroit à changer).
- **Points gardés** : prélèvements (BoutonsSegment, BoutonsVerset, ActionsVerset, TexteBible, PanneauPatristique) ; signalements (tous les ouvreurs de `ModalSignalement` : segment, verset, Bible, patristique, polyglotte, bibliothèque, essai, œuvre, commentaires) ; commentaires (composeurs + votes + signalement de commentaire dans OngletCommentaires œuvre & patristique, EssaiCommentaires) ; ProposerLienBiblique ; appréciation d'essai ; favoris (`useFavoris.ts`, garde centrale). Les LECTURES (SelecteurCitation, profils, catalogue) ne sont pas gardées.
- **Admin & inscrits** : `aUnCompte=true` → comportement inchangé, aucune régression. Le garde est purement côté client (confort) ; la sécurité réelle des écritures reste la RLS + les gardes serveur.

# Citations (copier / coller et affichage des prélèvements)

Règles de mise en forme arrêtées par l'auteur, centralisées dans `app/lib/citation.ts` (testé : `citation.test.ts`). Ne plus dupliquer ni réimplémenter ailleurs.

- **Titre de l'œuvre en italiques** : le presse-papiers reçoit DEUX formes via `copierCitation()` : `text/html` (titre en `<em>`) pour un collage riche dans un traitement de texte, et `text/plain` en repli. Le collage garde l'italique dans Word / Docs / courriel.
- **Ponctuation finale** (avant le guillemet fermant) : `normaliserPonctuationFinale` remplace toute ponctuation finale par un point, SAUF `?` et `!` (conservés) ; ajoute un point s'il n'y en a pas ; conserve une parenthèse/un crochet fermant ET ajoute un point après.
- **Dates** : `resserrerTiretsAnnees` écrit les fourchettes « 1984-1986 » (jamais « 1984 – 1986 » ; `formaterDateHistorique` produit le tiret demi-cadratin espacé, qu'on resserre). Appliqué à la seule partie date.
- **Guillemets internes** : `convertirGuillemetsInternes` remplace les « … » français internes par des guillemets anglais “ … ” (la citation est déjà encadrée par « … »).
- **Majuscule initiale** : `capitaliserInitiale` met une capitale au premier mot si l'initiale est minuscule (citation extraite en cours de phrase). Saute les marques de tête (guillemets, parenthèses, balises `<i>`…) ; ne touche ni une initiale déjà capitale ni un début non alphabétique. Intégré à `preparerTexteCitation`, donc appliqué au copier/coller ET à l'affichage des prélèvements.
- **API** : `citationPatristique(texte, info)` → `{ texte, html }` (auteur, *titre*, trad., éditeur, collection, ville, année, « disponible sur le site Corpus Scriptura » : « … ») ; `citationBiblique(texte, ref)` → `« … » (ref)` ; `preparerTexteCitation(texte)` pour l'affichage seul (guillemets + ponctuation finale) ; `copierCitation(res)` pour le presse-papiers riche.
- **Unifications faites** : l'ordre est désormais **trad. avant éditeur**, la mention finale est « disponible sur le site Corpus Scriptura » partout, et les copies de `BoutonsSegment`, `BoutonsVerset`, `TexteBible`, `PanneauPatristique` et `app/prelevements/page.tsx` passent toutes par le module (5 copies de `convertirGuillemetsInternes` et 3 de `construireCitationPatristique` supprimées). L'affichage de `prelevements` applique `preparerTexteCitation` au passage montré (le titre y était déjà en italique).
- **Non touchés (volontaire)** : `ActionsVerset` (copie du texte brut d'un verset, sans encadrement) et `SelecteurCitation` (insertion d'une citation DANS un commentaire, autre flux).

# Traductions lisibles vs colonnes de `versets_lecture` (piège d'apparat vide)

⚠️ `traductions` peut déclarer une traduction NON encore matérialisée dans la vue `versets_lecture` (transcription/alignement en cours). La nommer dans un `select('…, "TR0009"')` fait échouer TOUTE la requête PostgREST (« column versets_lecture.TR0009 does not exist » → 400, `data` nul).

**Symptôme observé (2026-08-06)** : `TR0009` (« Bible française du XIIIᵉ siècle », transcription à 8 %) était dans `traductions` mais absente des colonnes de `versets_lecture` (qui n'a que TR0001-TR0005). L'apparat biblique de TOUTES les œuvres (page œuvre + péricope) tombait en repli : chaque renvoi affichait son identifiant canonique brut (« JOB.1.7 ») sans texte, au lieu de « Jb 1, 7 ». La page Bible était épargnée car elle lit `versets_lecture.select('*')` (ne nomme aucune colonne).

**Règle** : ne jamais construire un `select` de `versets_lecture` à partir des `trad_id` bruts de `traductions`. Passer par `codesTraductionsLecture(client)` (`app/lib/traductions.ts`), qui **sonde une ligne de la vue** (`select('*').limit(1)`) et n'garde que les codes réellement présents comme colonnes. Auto-correcteur : dès qu'une traduction est matérialisée, elle est reprise ; tant qu'elle ne l'est pas, elle est écartée. Utilisé par `app/oeuvre/[id]/page.tsx` (SSR) et `OeuvreClient.tsx` (client).

**Reste à surveiller** : les sélecteurs de lecture (dropdown de la page Bible `app/page.tsx`, `SelecteurCitation`) listent encore TOUTES les traductions ; choisir TR0009 y affiche du vide (Bible, via `select('*')`) ou échoue (sélecteur à colonne unique). À filtrer aussi si l'on veut masquer une traduction non matérialisée côté lecture.

# Page Œuvre — gouttière d'actions et alignement de la colonne de lecture

La colonne de lecture est un conteneur `maxWidth: 35rem` centré. À droite, une gouttière d'environ **60px** est réservée à la colonne de boutons d'action (prélever, copier, signaler, éditer). Le CORPS DU TEXTE est donc `35rem − 60px`, et **tout doit s'y aligner** : page de titre (`PageTitre`, padding droit asymétrique `…110px…48px`), titres niv1/niv2 et fleuron (`paddingRight: gouttiereTitre = '60px'` en desktop, `undefined` en mobile), ET le texte lui-même.

⚠️ Piège corrigé (2026-08-06) : en mode **paragraphes** et en **bilingue / langue originale**, le texte (et la grille `.para-bilingue`) ne réservait pas cette gouttière (`paddingRight: 8px/0`), si bien qu'il courait ~60px plus large que les titres et la page de titre. Correctif : les blocs paragraphe (vue texte ET vue apparat) portent `paddingRight: gouttiereTitre` sur leur `<div>` conteneur (ce qui rétrécit aussi la grille bilingue), et le `<p>` interne ne porte plus de padding ad hoc. En mode **segments**, l'alignement venait déjà de la colonne d'actions `width:68px; marginRight:-8px` (≈ 60px consommés). Mobile : `gouttiereTitre` vaut `undefined` → pas de gouttière (pas de colonne d'actions), pleine largeur voulue.

# Typographie du texte en langue originale (latin, grec)

Le corpus français porte déjà l'espacement dans la donnée (fine insécable U+202F avant `:` `;` `!` `?` et autour des guillemets — le `:` compris, contrairement au texte littéral de la charte §3.2 qui dit « insécable » : le corpus rend une **fine**). Le texte en langue originale (`segments.texte_original`, latin/grec), lui, vient d'éditions à ponctuation **collée** (« valde: », « dixit: »).

Règle (charte §3.1-3.2, étendue au 2026-08-06) : on harmonise la langue originale sur le français, **au rendu, sans réécrire la donnée**. Fonction pure `normaliserEspacesOriginal` (`app/lib/typographie.ts`, testée `typographie.test.ts`) : **ajoute** une fine insécable U+202F avant `:` `;` `!` `?` et autour des guillemets ; idempotente ; ne touche pas `, . …`. Appliquée au seul rendu de `texte_original` dans `OeuvreClient` (modes bilingue et langue originale seule). Le français garde `normaliserEspaces` (qui ne fait que **convertir** le type d'espace déjà présent, jamais en ajouter).

- Les deux fonctions vivent désormais dans `app/lib/typographie.ts` (module pur, testable) et sont ré-exportées par `app/oeuvre/[id]/texteEnrichi.tsx` pour les appelants historiques.
- Périmètre : toutes les œuvres sont `langue_trad='Français'` — le latin/grec n'existe que comme `texte_original`. La Vulgate/Septante de la **Bible** est un autre contexte (page Bible), non couvert ici.

## Page Publications — refonte survol/doré (2026-08-06)

Évolution de la section « l'Index » ci-dessus, structure générale conservée (index 2 colonnes, « Au sommaire », une à gauche). Changements dans `EssaisListeClient.tsx` :

- **Entrée commune compacte au repos** : auteur, date, titre (écrêté 2 lignes), sous-titre (écrêté 1 ligne, NOUVEAU), méta (genres, vues, ♥, favori). **Le résumé n'y est plus affiché en flux** (`resume_hors_survol: 0`).
- **Survol** : le bloc se transforme SUR PLACE. Un calque `.publication-survol` en `position:absolute; inset:0` (gabarit exact du bloc, aucune bousculade de la grille) réaffiche auteur + titre au même endroit et remplace les détails (sous-titre, genres, vues…) par le résumé, précédé d'une flèche dorée à gauche (`.publication-survol-fleche`). En tactile (`@media (hover:none)`), le calque repasse en flux, titre/auteur dupliqués masqués, ne laissant que le résumé.
- **Tons dorés** : titres en brun chaud `#3f3222` (survol → `--cs-or`), auteur/date/labels/lettrine/« Lire »/filets en doré (`#7a6030`, `--cs-or`), pastilles de genre en teinte dorée. Remplace les accents verts.
- **Brillance au survol** : balayage d'un dégradé crème-doré via `background-position` animé (entrées communes) et un `::before` (bloc une). Subtil.
- **« À la une » = exactement deux blocs communs** : `--pub-h: 7rem` sur `.publications-index` ; commune `min-height: var(--pub-h)` (méta poussée en bas par `margin-top:auto`) ; `.une { grid-row: span 2; min-height: calc(var(--pub-h) * 2) }` — remplit deux blocs même si le contenu est court, et s'aligne sur les deux entrées voisines. Résumé de la une écrêté 4 lignes pour ne pas dépasser.

# Centre de contrôle admin — toujours regarder où l'on en est

⛔ **Avant toute séance de travail sur le corpus, consulter le centre de contrôle** (charte `parametres.charte_ia` **§30**). Page admin dédiée **`/admin/controle`** (`app/admin/controle/page.tsx`, Server Component gardé par `estAdmin()`, client service_role), liée depuis le menu « Administration » de la navbar (première entrée « Centre de contrôle », famille corpus). Six sections : Corpus, Qualité du texte, Catalogue, Péricopes, Bibliographie, Chronologie. Chacune : chiffres réels + barre d'avancement + note de synthèse + liste de tâches (à faire / fait).

- **Chiffres** : une seule RPC **`controle_tableau_bord()`** (SECURITY DEFINER, `search_path=public`, EXECUTE réservé au `service_role`) renvoie un `jsonb` de tous les compteurs, en direct. **Exception qualité** : `seg_bon/moyen/critique/total` sont lus sur la vue matérialisée `oeuvres_controle_stats_mat` (la vue en direct coûte ~10,5 s) ; recalcul à la demande via `rafraichir_controle_stats()`, date affichée (`controle_stats_meta.calcule_le`). Le total qualité doit coïncider avec `seg_controle_total` (segments `nature='texte'`) : si un écart apparaît, la matérialisée est périmée → la rafraîchir.
- **Notes et tâches** : table **`controle_sections`** (`cle` PK, `titre`, `ordre`, `commentaire_ia`, `todos` jsonb `[{texte, fait}]`, `maj_le`). RLS : lecture `authenticated` + `is_admin()` ; écriture par l'assistant (service_role). **Après une avancée notable, mettre à jour la note et cocher les tâches** de la section concernée, pour que la page reste fidèle à l'état réel.
- **Nombre de traductions bibliques lisibles** : via `codesTraductionsLecture()` (mêmes règles que l'accueil), jamais le simple `count(*)` de `traductions` (qui compte aussi les non matérialisées comme TR0009).
