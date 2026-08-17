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
- **Le titre d'une œuvre vit dans DEUX colonnes.** `oeuvres.titre` est le titre de catalogue : il nomme l'œuvre dans la bibliothèque, la recherche, les citations, le fil d'Ariane et les métadonnées, et s'écrit d'un seul tenant. `oeuvres.titre_affichage` est sa composition pour le **frontispice seul**, sauts de ligne compris ; dès qu'elle est renseignée, `PageTitre` l'affiche **à la place** de `titre` (`oeuvre.titre_affichage || titre`). ⚠️ Conséquence longtemps invisible : le crayon du frontispice écrivait dans `titre` alors que l'écran montrait `titre_affichage`, si bien qu'une correction partait bien en base sans jamais paraître (constaté le 2026-08-17 sur le « Commentaire sur Joël »). La modale laisse désormais **choisir la colonne** (`variantes` d'`EditionCible`, `app/oeuvre/[id]/ModaleEditionAdmin.tsx`). Vider `titre_affichage` rend le frontispice au titre de catalogue. ⚠️ Ouvrir la colonne a demandé les **trois listes blanches concordantes** (formulaire, route, fonction Postgres) **plus** son ajout au `select` de `app/admin/page.tsx` : un champ présent dans le formulaire mais absent du `select` est enregistré à vide, donc **efface** la colonne.
- **Commentaire sur la traduction** : colonne dédiée `oeuvres.commentaire_traduction` (ex. « Attribution discutée avec Marc-Antoine de La Bastide » pour Ratramne, sortie de `trad_auteur`). Affichée en note discrète sur la page de titre. **Modifiable** dans l'admin Bibliothèque depuis le 2026-08-12 : zone de texte « Commentaires », placée juste au-dessus de « Genre » dans le formulaire « Modifier l'œuvre ». Elle a remplacé l'ancienne pastille 🗨 en consultation seule, qui paraissait à côté du titre et ne se corrigeait pas. ⚠️ Ouvrir un champ à l'écriture demande **trois** listes blanches concordantes : le formulaire (`CHAMPS_OEUVRE_TEXTE`), la route `app/api/admin/update-oeuvre` (`CHAMPS_AUTORISES`), et la fonction Postgres `admin_update_oeuvre_champ` — cette dernière porte sa propre liste et lève « Champ non autorisé » sinon.

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

# TR0009 « Bible française du XIIIᵉ siècle » (Bible 899) — lecture par versets recomposés

TR0009 est une traduction à **segmentation éditoriale** : son texte n'est PAS dans `versets_lecture` ni `versets_v2` (garde-fou : ne jamais l'y copier). Le texte des versets canoniques est **recomposé en direct** des tables éditoriales Bible 899 et aligné sur `canon_id`. Ainsi, toute nouvelle passe d'alignement importée par Codex apparaît **automatiquement**, sans copie ni intervention.

- **Vue `v_bible899_verse_recomposed`** (`sql/20260807_bible899_verse_recomposed.sql`) : recompose depuis `bible_editorial_segments` + `bible_editorial_segment_sources` + `bible_source_unit_texts` (offsets Unicode + `join_before`), en colonnes `texte_diplomatic` / `texte_expanded`, avec `canon_id` et les statuts. ⛔ **SECURITY DEFINER voulu, réservé à `authenticated`** : les RLS des tables de base filtrent `is_public`/`validated`/`verified`, or les segmentations « verse » de TR0009 sont NON PUBLIQUES (site privé → on doit les montrer). **Ne jamais la repasser en `security_invoker`** (elle se viderait) ni l'ouvrir à `anon` (l'anonyme reste bloqué par le proxy).
  - ⚡ **Piège de perf corrigé (2026-08-08) — CTE référencé deux fois.** La 1re version recomposait le texte dans un CTE `seg_text` référencé DEUX fois (une par couche) : un CTE utilisé plusieurs fois est **matérialisé** par Postgres, donc `string_agg` recomposait **tout le corpus** (~37 000 lignes, tri externe sur disque) à chaque requête, avant même le filtre livre/chapitre. Résultat : ~1,2 s pour un seul chapitre, et **timeout 8 s** (`statement_timeout` d'`authenticated`) sur un livre entier — d'où l'erreur « canceling statement due to statement timeout » de la Polyglotte en mode « livre entier » (Psaumes). **Corrigé** (migration `bible899_verse_recomposed_lateral_perf`) en remplaçant le CTE par une sous-requête **`LATERAL` corrélée sur `segment_id`**, les deux couches séparées par `FILTER (WHERE layer_code = …)` : le texte n'est recomposé que pour les segments filtrés (Gn 1 : 1226 → 12 ms ; Psaumes entiers : timeout → 113 ms). Sortie **identique**, vérifiée ligne à ligne sur les 18 919 alignements. ⛔ Ne pas revenir à un CTE référencé plusieurs fois pour les deux couches.
- **Lib partagée `app/lib/bible899.ts`** (client + serveur, testée `bible899.test.ts`) : `chargerVersets899(client, {livre, chapitre?}, couches?)`, `livresDisponibles899`, `couchesDisponibles899` (sonde les colonnes de la vue → couches réellement présentes, **piloté par les données**, jamais une constante frontend), `coucheDefaut899`/`normaliserCouche899` (repli propre sur `expanded` si couche indisponible), `adapterVersets899` (adapte au contrat ordinaire ; n'expose **aucun** statut technique), prédicats `rendu899` / `aRevoir899` (`aRevoir899` réservé désormais à la Polyglotte). Couche : `diplomatic` / `expanded` / **`modernized`** — cette dernière n'existe que si la vue expose une colonne `texte_modernized` ; défaut = `modernized` si disponible, sinon `expanded`. La capacité de mode `verse` (source `editorial-segments`) est **imposée SEULE** au catalogue pour les traductions éditoriales par `withEditorialVerseCapability` (`bibleMultimode.ts`) : plus aucun mode source sur la page Bible. Chemin **privé**, distinct des vues publiques `v_bible_reading_capabilities` / `v_bible_canonical_lookup`.
- **Règles d'affichage des statuts** : `CANONICAL_GAP` = lacune du témoin ; `MANUSCRIPT_EXTRA` (`canon_id` NULL, incipit/explicit/argument) = **jamais** transformé en faux verset (écarté par l'adaptateur).
  - **Mise en forme des lacunes (page Bible, 2026-08-12)** : plus de crochets `[…]`. Un **verset isolé** absent (chapitre par ailleurs porté) se rend « *Lacune du manuscrit* » en **serif italique** effacé (`--cs-texte-doux`), capitale initiale, avec infobulle « Lacune matérielle du manuscrit » (`TexteBible.tsx`). Un **chapitre entièrement lacunaire** (ex. 1 Samuel 1, 28 versets tous `CANONICAL_GAP`) n'aligne PLUS autant de mentions : `chapitreToutLacune` (`versets.every(v => _est899 && _estLacune)`) déclenche **une** mention centrée — filet interrompu `◦◦◦`, « *Lacune du manuscrit* », puis la précision « Ce chapitre — {livre} {n} — n'est pas conservé dans ce témoin ». Distinct de l'état « livre absent » (ruines fumantes). Les **lectures incertaines** (`[lecture incertaine : …]`) sont en **gris** (`--cs-texte-second`) **sans soulignement pointillé** (retiré) : la teinte seule signale, l'infobulle porte le sens savant. Marqueur inline `[Lacune]` capitalisé. ⚠️ **Page Bible (public) : AUCUN statut technique montré** — `MATCH`/`OFFSET`/`MERGED`/`SPLIT`/`review`/`verified`/`confidence` restent internes (base + admin) ; le marqueur « · à revoir » (`verification_status='review'`) a été **retiré** de la page Bible. Seuls les faits du témoin subsistent : lacune du manuscrit, et les marqueurs éditoriaux **inline** du texte (`[lecture incertaine : …]`, `[ajout marginal : …]`, `[lacune : …]`) rendus discrètement par `app/lib/marqueurs899.tsx` (`rendreMarqueurs899`). ⚠️ Ces marqueurs peuvent être **à cheval sur plusieurs versets** (la recomposition par créneau canonique ouvre le marqueur dans un verset et le ferme dans le suivant) : `rendreMarqueurs899` est un **tokeniseur** tolérant aux marqueurs non fermés / non ouverts, pour ne jamais laisser de crochet brut à l'écran. La **Polyglotte** conserve son propre affichage (`aRevoir899`).
- **Bible classique** (`app/page.tsx` → `BibleLayout`/`TexteBible`) : TR0009 se lit **comme une traduction ordinaire** (même sélecteur, même composant de verset, même notice). `page.tsx` charge via la lib puis **adapte** les lignes avec `adapterVersets899`, et calcule les couches lisibles via `couchesDisponibles899` **en écartant `diplomatic`** (charte : non destinée à la page Bible). **Aucun sélecteur de mode** (TR0009 = `verse` seul). **Seule particularité visuelle : le contrôle « Graphie : Modernisée | Manuscrit »**, rendu par `TexteBible` **uniquement si la couche `modernized` figure dans `couchesDisponibles`** ; tant qu'elle n'existe pas, aucun contrôle et `expanded` (« Manuscrit ») s'affiche directement. `?couche=modernized` demandé sans la couche → repli `expanded`, sans erreur. Actions d'écriture masquées (id synthétique `899:canon_id`) ; lecture non comptée. Gardes conservées : `tradExplicite` (l'URL `?trad=` fait foi) et interdiction d'échange **en mémoire** vers/depuis une traduction éditoriale (`handleSetTraductionIndex` recharge le serveur). `BibleLayout` lit les livres via `livresDisponibles899`.
- **Polyglotte** (`app/polyglotte/page.tsx`) : **inchangée** — TR0009 est une **colonne synthétique** hors `versets_v2`, recomposée en `V2Row` clé `canon_id`, avec son propre choix de couche « BIBLE 899 · TEXTE » (Développée/Diplomatique) et son propre marqueur `aRevoir899`.
- **Garde-fous** : ne pas écrire dans `versets_canon` / TR0001–TR0005 ; ne pas copier TR0009 dans `versets_v2` ; ne **fabriquer** aucune graphie modernisée **côté frontend** — la couche `modernized` n'existe que si les DONNÉES l'exposent (colonne `texte_modernized` de la vue). Le jour où Codex l'ajoutera (couche validée), le contrôle « Graphie » apparaîtra **automatiquement** et Modernisée deviendra le défaut, sans changement frontend. Réutiliser les composants existants (pas de duplication de la grille ni du lecteur).

# Page Œuvre — gouttière d'actions et alignement de la colonne de lecture

La colonne de lecture est un conteneur `maxWidth: 35rem` centré. À droite, une gouttière d'environ **60px** est réservée à la colonne de boutons d'action (prélever, copier, signaler, éditer). Le CORPS DU TEXTE est donc `35rem − 60px`, et **tout doit s'y aligner** : page de titre (`PageTitre`, padding droit asymétrique `…110px…48px`), titres niv1/niv2 et fleuron (`paddingRight: gouttiereTitre = '60px'` en desktop, `undefined` en mobile), ET le texte lui-même.

⚠️ Piège corrigé (2026-08-06) : en mode **paragraphes** et en **bilingue / langue originale**, le texte (et la grille `.para-bilingue`) ne réservait pas cette gouttière (`paddingRight: 8px/0`), si bien qu'il courait ~60px plus large que les titres et la page de titre. Correctif : les blocs paragraphe (vue texte ET vue apparat) portent `paddingRight: gouttiereTitre` sur leur `<div>` conteneur (ce qui rétrécit aussi la grille bilingue), et le `<p>` interne ne porte plus de padding ad hoc. En mode **segments**, l'alignement venait déjà de la colonne d'actions `width:68px; marginRight:-8px` (≈ 60px consommés). Mobile : `gouttiereTitre` vaut `undefined` → pas de gouttière (pas de colonne d'actions), pleine largeur voulue.

# Traductions parallèles — calquées sur la lecture latin-français (2026-08-13)

Règle fixée : le mode « Traductions parallèles » (`ComparaisonTraductions.tsx`) doit **tout** reproduire de la lecture — jusqu'au frontispice. Ne JAMAIS revenir aux anciens `<select>` Livre/Division, ni à un titre héros / en-tête sobre à part.

- **Frontispice IDENTIQUE à la lecture** : le mode comparaison rend le **même composant `PageTitre`** que la lecture (auteur, titre, titre original, traducteur, marque d'imprimeur, colophon), pas un en-tête ad hoc. `PageTitre` reçoit `sansGouttiere` en comparaison → padding symétrique (`80px 48px 40px`), le titre se centrant sur toute la largeur (pas de colonne d'actions à compenser). Suivent le **fleuron** (`paddingRight: undefined` en comparaison), puis la barre de division, puis les colonnes.
- **Circulation identique au mode lecture** : l'état de navigation (livre, division, liste ordonnée des divisions) vit dans `OeuvreClient` (`comparaisonBook`, `comparaisonDivision`, `comparaisonDivisions`, `naviguerComparaison`), **pas** dans le composant enfant. Il alimente (a) le **sommaire de gauche** (arbre Livres → Divisions) et (b) une **barre `‹ … ›`** jumelle de `barre-nav-niv1` (id `barre-nav-division`). ⚠️ **Titres EXACTS** : le sommaire et la barre affichent `ref_niv1` / `ref_niv2` de la traduction de RÉFÉRENCE (ex. « LIVRE PREMIER » / « I »), chargés via `texte_alignement_membres` (role='reference') → `segments`, PAS les libellés génériques `LIVRES_COMPARAISON` / `ROMAINS_COMPARAISON` (qui ne servent que de repli). `DivisionAlignee` porte `niv1`/`niv2`. On sort de la comparaison par le volet « Lecture » (clic sur « Français »).
- **`ComparaisonTraductions` = rendu de la division courante** (props `book` / `division` / `userId` / `auteur`), **remonté par `key={set:book:division}`** (état initial `chargement=true`, pas de setState synchrone en tête d'effet).
- **Segments cliquables + prélèvement** (comme en lecture) : chaque segment est un `.seg-inline` (CSS hérité du `<style>` parent) ; survol/clic → **cellule d'actions flottante** (prélever / copier / signaler, composants `BoutonsSegment`). Le `select` des segments ajoute `id_oeuvre` ; les métadonnées de citation sont chargées PAR œuvre (chaque colonne = une traduction, donc sa propre attribution). Notes en **infobulle** (`AppelNote`, contenu via `ContenuNoteStructuree`) — plus de bloc `<details>` ni de renvois bibliques bruts en ligne.
- **Colonnes symétriques, container 52rem** : grille `repeat(2, minmax(0,1fr))`, gap 1.6rem, même police/teinte des deux côtés. La **prose** garde un filet fin sous chaque groupe (alignement empan par empan). Les **groupes de VERS consécutifs sont FUSIONNÉS** en un seul bloc à deux colonnes continues → interligne **rigoureusement constant** ; alinéa poétique (retrait des vers de rang pair + retrait de continuation). Ne pas réintroduire un rendu vers-par-groupe (interlignes inégaux).
- **Étiquettes des deux traductions** : discrètes, **NON collantes, fond transparent** (petites capitales grises, filet fin). ⛔ Ne jamais leur donner `background: var(--background)` : ce token vire au **noir** en mode sombre (le fameux « bandeau noir »).
- **Notes — vers cités** (`ContenuNoteStructuree`) : plus d'étiquette « Vers » ; un bloc `form==='verse'` se rend en **police réduite (0.9em) + léger retrait gauche**.
- **Apparat critique** : masqué dans le sommaire en mode comparaison.

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

## Panne « Impossible de charger les indicateurs » (2026-08-11)

⚠️ **Ne jamais destructurer `data` sans `error`.** La page se contentait de `const [{ data: tbRaw }] = await Promise.all([...])` : l'erreur PostgREST était jetée, et tout échec se réduisait au message générique « Impossible de charger les indicateurs (RPC `controle_tableau_bord`) », indiagnosticable. Corrigé : `error` est destructurée, journalisée côté serveur (`console.error`), et rendue à l'écran par `EcranPanne` (code, message, détails, piste).

**Cause réelle : dépassement de délai, pas une erreur de droits.** `controle_tableau_bord()` agrège tout le corpus en direct. Coût mesuré : **~1,5 s en session chaude** (plan et cache chauds, 10 appels d'affilée) mais **~6 s au premier appel à froid**, pour un `statement_timeout` de **8 s** sur `service_role`. Le dépassement remonte en **57014 — `canceling statement due to statement timeout`**, `data` devient nul, d'où le message. Reproductible : `set statement_timeout='1500ms'; select controle_tableau_bord();`.

**Ce qui déclenche le dépassement** : le cron **`rafraichir_lecture` (jobid 4) tourne toutes les minutes** (`* * * * *`, `refresh materialized view concurrently versets_lecture`), **4,8 s en moyenne, jusqu'à 7 s** (`cron.job_run_details`). Un appel à froid qui tombe pendant un refresh franchit les 8 s. ⚠️ Cette fréquence contredit la doctrine du présent fichier, où le refresh de `versets_lecture` est une opération **manuelle après correction de corpus** : à reconsidérer (résidu probable d'une séance de travail).

**Correctif en place** : `chargerTableauBord()` réessaie **une seule fois**, après 1,2 s, et **uniquement sur le code 57014**. Une vraie erreur (droits, objet manquant) remonte immédiatement, sans reprise inutile. Ne pas élargir la reprise à tous les codes : elle masquerait les pannes réelles.

**Faux départs écartés lors du diagnostic** : la fonction existe bien et `EXECUTE` est accordé à `authenticated` et `service_role` ; le filtre `where controle='…'` sur `internal.v_dates_qualite_resume` **élague** correctement les branches de l'`UNION ALL` (38 / 33 / 757 ms au lieu des 3 s de la vue entière), donc les trois appels ne sont pas le goulot ; `qualite_overrides`, `couverture_patristique` et les comptes de `segments` sont tous sous 300 ms.

# La Gueule — métadonnées de la page de titre par IA

Outil local `outils/la-gueule` (hors site). Le bouton « IA titre » lit la page de titre par vision et remplit les champs `oeuvres` en **couche candidate** (charte §5.4 et §14 : jamais de donnée validée sans relecture). Détails et pièges complets dans la mémoire projet La Gueule. Points cardinaux :

- **Circuit abonnement, PAS l'API payante** : le fournisseur `claude-local` pilote le CLI Claude Code local (`claude -p`) authentifié par `claude setup-token` sur le compte **Pro**. ⚠️ **`ANTHROPIC_API_KEY` court-circuite l'abonnement** : le CLI l'utilise en priorité, d'où « Credit balance is too low » alors que le compte est bon. La Gueule la retire de l'environnement du CLI (`envSansCleApi`) ; la garder hors de l'environnement.
- **Modèle vision** (`LG_AI_MODEL_VISION`, Opus) pour lire, **jamais Haiku** (casse cassée, chiffres romains ratés, accents absents → échec du rapprochement catalogue).
- **Enrichissement « base d'abord, sinon vide »** : titre original, nom canonique et `id_auteur` viennent de `auteurs` / `oeuvres` / `catalogue_notices` en **lecture seule** (`SUPABASE_SERVICE_ROLE_KEY` du `.env.local`, jamais journalisée ni exportée), jamais de la connaissance générale du modèle.
- **Casse charte** garantie par une normalisation déterministe côté serveur (titres sans point final, jamais de champ tout en capitales).
- **Redémarrage** : recharger la page ≠ redémarrer le serveur (node détaché sur le port 4599, garde l'ancien code) → double-clic sur `outils/la-gueule/redemarrer-la-gueule.bat`.

# La Gueule — pipeline contrôle → correction → export (2026-08-10)

Rend le contrôle IA **réellement effectif** de bout en bout. Rapport : `outils/la-gueule/RAPPORT_CORRECTION_PIPELINE_LA_GUEULE.md`. Doctrine : couche **candidate** seulement, jamais d'écriture dans les tables actives ; fac-similé et OCR brut immuables ; graphie diplomatique conservée (ſ, u/v, i/j) ; le ground-truth exige une validation humaine explicite (§11.7).

- **Modèle de ligne** : `ocr0` = OCR immuable ; `dip` = état candidat courant (lu par TOUS les exports) ; `corrections[]` = historique (avant/après/provenance/statut/annulée) ; `suggestion.role_confirme` = rôle qui fait foi. Modules purs testés `src/corrections.mjs` (appliquer/annuler/reclasser, détection de CONFLIT jamais écrasé) et `src/perimetre.mjs`.
- **Relecture IA par page** (`controle.mjs::controlerPageIA`, modèle contrôle=Sonnet) : relit l'image de chaque page **océrisée** et propose corrections de texte + reclassements de rôle. Ne traite que les pages ayant des `lignes` (les coquilles du tri sont ignorées).
- **Corrections effectives** : accepter écrit `dip` → présent dans TXT/MD/DOCX/JSON/SQL ; `ocr0` intact ; annulable.
- **Périmètre de travail** (`S.perimetre`, persisté) : complétude « OCR local » mesurée sur le **lot traité**, pas sur le PDF entier (barre : `lot X/Y · doc Z/total`).
- **Reclassement de rôle** = pose `role_confirme` (vocabulaire `structure.mjs`) → exclu du corps (`estHorsCorpsConfirme`) mais gardé en source (ALTO/PAGE/JSON).
- **Validation** (`validation.mjs`) : chaque correction/reclassement est un OBJET individuel (plus de fausse famille « relecture_page ») ; page courte = **avertissement**, pas un blocage ; états `FINAL_CANDIDAT` / `…AVEC_RÉSERVES` / `CANDIDAT_INCOMPLET`.
- **Auto-application des corrections SIMPLES** (`estCorrectionSimple`, distance d'édition ≤ 2, ou ≤ 4 si confiant) → appliquées sans clic ; seuls les cas ambigus (grosse réécriture, reclassement, R3, familles) sont soumis à l'humain. Reste candidat/réversible.
- **Onglet « Contrôle »** (volet gauche) = seule surface de pilotage : badge du nb à faire, liste lisible avant→après, Valider/Refuser/Voir, clic → va à la page + surligne la ligne, « ✓ N appliquées automatiquement — revoir ».
- **« Trier les pages (IA) » retiré** du parcours (lent, semait des coquilles). Enrichissement métadonnées resserré (`choisirOeuvre` ≥2 jetons + recouvrement ≥50 % ; **sous-titre = page** ; **genre au format base** : minuscule, séparateur «  ; »).

# La Gueule — triage automatique des corrections OCR (2026-08-11)

Le contrôle produisait ~150 corrections pour 35 pages, toutes à relire une par une. Désormais chaque proposition est **confrontée à l'image** avant d'atteindre l'humain, qui n'est appelé que sur ce que l'image ne tranche pas. Modules : `src/ia/triage.mjs` (pur), `src/ia/verificateur.mjs` (orchestration), `src/ia/rapport-triage.mjs` (rapport). Tests : `triage`, `verificateur`, `rapport-triage`, `triage-integration`.

- **Un cas à risque ne part PAS à l'humain** : il part à une vérification renforcée. Chiffres, renvois bibliques, pagination, marques de cahier, ponctuation, césures, diacritiques, tildes abréviatifs, ligatures, casse, segmentation, distance élevée, caractère hors du jeu attendu → `HIGH_RISK_AUTO_CHECK`. Structure (reclassement, scission, ligne omise, ancrage, page exclue) → `STRUCTURAL`. Le reste → `LOW_RISK`.
- **Deux passes VISUELLES, réellement indépendantes** : passe 1 à l'échelle de la **page** (un appel pour toutes ses corrections, économe) ; passe 2 à l'échelle du **crop** de la ligne (réservée aux cas à risque). Granularité différente, formulation différente, **ordre A/B renversé**. Les deux sont **AVEUGLES** : on ne dit jamais au modèle quelle lecture vient de la machine et laquelle du correcteur, sinon il ratifie la proposition par complaisance. `assignerAveugle` fixe l'ordre de façon déterministe (le cache reste utile) et `verdictDepuisReponse` retraduit A/B en CANDIDATE/OCR0.
- **Règle de décision** : `LOW_RISK` = un verdict concluant suffit ; `HIGH_RISK_AUTO_CHECK` et `STRUCTURAL` = **deux verdicts concordants** exigés. Concluant = pas d'abstention, image exploitable (jamais `BAD`), confiance ≥ 0,97, ET lecture recopiée cohérente avec la cible désignée (un « CANDIDATE » qui recopie autre chose est une **lecture tierce**, donc un cas humain).
- ⛔ **La confiance du générateur n'entre JAMAIS dans le seuil.** Elle est conservée séparément (`generator_confidence`) pour l'audit ; ce n'est pas une « probabilité de vérité ». Seule la vérification visuelle décide.
- ⛔ **Le triage fait autorité sur les anciennes heuristiques.** Un cas `HUMAN_REVIEW` ne doit jamais repartir en application automatique par la règle du « petit changement » (`estAutoApplicable`) : « Deut.23. » → « Deut.22. » ne coûte qu'un caractère, et aucune distance d'édition ne peut juger un chiffre de renvoi. Garde en place dans `classerValidation` (`decideParTriage`), testée.
- ⛔ **Une décision automatique n'est jamais une validation humaine** (charte §11.7) : `AUTO_ACCEPT` écrit dans la couche candidate avec `validation_humaine: false`, forcé au point d'écriture (`entreeCorrection`/`traceCorr`). `ocr0` reste immuable ; tout est annulable.
- **Politique de couche préservée (§14.3)** : un candidat qui réintroduit une graphie ancienne (`ſ`, ligature typographique) sur un **imprimé** part en revue humaine quelle que soit la concordance visuelle. Sur un **manuscrit** (transcription diplomatique), la même correction est légitime.
- **Lignes de faible confiance non corrigées** : relues nûment sur l'image (« que lis-tu ? », jamais « est-ce juste ? »). Confirmées → elles sortent de la file ; relues autrement → un candidat naît et repasse par le même triage ; indécidables → revue humaine.
- **Vue par défaut = la file humaine seule**, ordonnée par `review_priority` (désaccord, crop mauvais, lecture tierce, chiffre illisible, segmentation, plusieurs mots, distance). Les décisions automatiques restent consultables par filtre (Auto-acceptées / OCR conservé / Réf. et nombres / Structure / Caractères spéciaux / Toutes) et **contredisables** d'un clic. Rapport : bouton « Rapport de contrôle » → `exports/<nom>.controle-triage.md` + `.json`, avec case « mode audit ».
- **Métriques** (`mesurerTriage`) : `human_review_rate` est le KPI. Le dénominateur est le total des candidats — on ne le fait jamais baisser en écartant des propositions.

# Appels aux routes admin — le verrou renvoie une REDIRECTION, pas une erreur

⚠️ Quand la session n'est pas reconnue, `proxy.ts` ne répond pas par un 401 : il **redirige** vers `/chantier?suite=…`. Or `fetch` suit les redirections par défaut, si bien qu'un appel à `/api/admin/…` revient en **`200` porteur de HTML** et satisfait `res.ok`. Le seul symptôme est un « Unexpected token < » au `res.json()`, généralement avalé par un `catch`.

**Règle** : tout appel client à une route admin contrôle `res.redirected` et le `content-type` avant de parser, et **remonte l'échec à l'écran** (jamais un `break`/`catch` muet). Vérifiable : `curl -i "http://localhost:3000/api/admin/catalogue"` sans jeton renvoie `307 → /chantier`.

**Cas de contexte (2026-08-12)** : dans l'admin Bibliothèque, les filtres « Œuvres candidates », « non candidates », « critiques » et « non publiées » restaient vides (« Aucun auteur trouvé »), alors que la base contenait 349 notices candidates réparties sur 56 auteurs et que le filtre, rejoué hors interface, en retenait bien 55. Trompeur : « Publiées » et « Tout afficher » semblaient marcher, parce que ce sont précisément les deux seuls modes qui **n'ont pas besoin du catalogue** — « Tout afficher » liste tous les auteurs quoi qu'il arrive. Correctif dans `app/admin/SectionBibliotheque.tsx` : statut HTTP et réponse non-JSON remontés dans un encart rouge avec bouton « Réessayer », plus `console.error`.

# Navbar à l'étroit — mesurer, jamais poser un seuil en pixels

⛔ **Aucun seuil en pixels ne peut dire si la barre tient.** La police racine GRANDIT avec la fenêtre au-delà de 1440px (jusqu'à ×1,375, cf. § Responsive) : le contenu de la barre s'élargit en même temps que l'écran. Un `max-width` figé (essai malheureux à 1299px) se trompe aux deux bouts.

**Mécanisme en place** (`app/components/Navbar.tsx`) : la barre compare `nav.scrollWidth` à `nav.clientWidth` au montage, au redimensionnement (une mesure par image via `requestAnimationFrame`) et à chaque changement qui l'allonge (session, pseudo, droits, pastilles). Quand elle déborde, elle retient la largeur de fenêtre à partir de laquelle la version complète tiendrait de nouveau — `innerWidth + débordement + 32px de marge` — car une fois repliée elle ne déborde plus et l'on n'aurait plus aucun repère pour la déplier. La marge évite l'oscillation au pixel près.

**Ordre de sacrifice : les OUTILS cèdent, jamais les mots des sections.** Recherche → loupe (déploie un bandeau sous la barre, la même vue que sur téléphone) ; « Soutenir le projet » → cœur seul ; mot « Admin » → effacé ; « Les Saintes Écritures » → « La Bible » ; « Aller plus loin » → descend dans le menu de compte, en groupe distinct sous son intertitre (seulement si une session existe, sinon la rubrique disparaîtrait) ; **pseudonyme du bouton de compte → effacé**, c'est le seul élément dont la largeur ne se connaît pas d'avance (jusqu'à 6rem), donc celui qui rendait la tenue incalculable. Les sections gardent leurs mots : sur un site d'érudition, les intitulés font partie du ton, et « Aller plus loin » n'a de toute façon aucune icône évidente.

⚠️ **Piège : un onglet qui rétrécit MASQUE le débordement.** `.cs-bible` est en `overflow:hidden` : la face se laissait tronquer en « Les Sain… » au lieu de déborder, si bien que le trop-plein disparaissait à la mesure tout en poussant le reste sur le bloc de compte. D'où `.cs-nav-principale > * { flex-shrink: 0 }` — le trop-plein doit se voir pour être mesuré.

**Mesures (barre d'un admin connecté, 2026-08-12)** : version complète **94,9 rem** (1519px à 16px) → ne tient qu'au-delà de ~1700px ; version repliée **52,5 rem** (841px) → tient partout dès 1024px. Le seuil du hamburger reste donc `lg` (1024px) : c'est le repli qui fait le travail, pas un plancher plus haut.

**Vérification sans redimensionner la fenêtre** (Chrome maximisé refuse `resize_window`, les popups sont bloquées, `X-Frame-Options: DENY` interdit l'iframe) : rétrécir la RANGÉE de la barre (`rangee.style.width`) puis émettre un `resize` déclenche exactement la mesure et le repli. ⚠️ Dans un onglet en arrière-plan, `requestAnimationFrame` est gelé : la mesure ne s'exécute pas. Pour tester, remplacer temporairement `window.requestAnimationFrame` par un appel immédiat. En usage réel, l'image en attente se déclenche au retour sur l'onglet.

# Portraits d'auteurs — format et emplacement

Le portrait d'un auteur vit dans le bucket Supabase **`auteurs`**, sous le nom **`<id_auteur>.jpg`** (ex. `A0047.jpg` pour Grégoire de Nazianze). C'est la seule source lue par le site : `ModaleAuteur`, `ApercuAuteur`, `BibliothequeClient` et l'admin composent tous l'URL `…/storage/v1/object/public/auteurs/<id>.jpg`. Le dossier `public/auteurs/` du dépôt est un reliquat d'un ancien lot, il n'est plus servi.

- **Proportion 4:5**, la même que le cadre de la fiche (`6.5rem × 130px`). Le portrait y est rendu en `object-fit: cover` : à proportion égale, rien n'est rogné et `photo_position` n'a pas à être réglée. Le cadre par défaut est `{x: 50, y: 24}` (centré, un peu haut), utile seulement pour une image d'une autre proportion.
- **Définition retenue : 600 × 750, JPEG qualité 90** (~100 Ko), soit le double du cadre pour rester net en HiDPI. Les portraits sains du bucket vont de 30 à 220 Ko.
- ⚠️ **La route d'upload ne redimensionne ni ne convertit rien.** `app/api/admin/auteur-photo/route.ts` vérifie les magic bytes puis dépose le fichier tel quel, sous l'extension `.jpg` quel que soit son type réel : d'où des objets `.jpg` qui sont en fait des PNG de 3 Mo (`A0013`, `A0015`). Préparer l'image AVANT de la déposer.

# Longueur d'une œuvre — `nb_signes` et la section « Opuscules » (2026-08-16)

⚠️ **`nb_signes` compte TOUS les segments d'une version, quelle que soit leur `nature`.** Ne jamais le confondre avec `sum(length(segment_texte)) where nature='texte'`, ni « corriger » la colonne sur cette base : le corps de plusieurs œuvres vit dans d'autres natures. Boèce est un **prosimètre** porté par `dialogue` et `vers` (s'en tenir à `texte` ne compterait que **3 178 signes sur 239 170**), les commentaires de Jérôme portent le lemme biblique en `citation` (Abdias : 24 927 au lieu de 59 534), Ratramne et Eucher de même. Cette confusion a produit un diagnostic erroné de « colonne fausse » avant d'être levée.

- **Deux échelons.** `oeuvre_textes.nb_signes` = la version (une ligne par édition ou traduction). `oeuvres.nb_signes` = **la version par défaut** (`is_default`), **jamais la somme des versions** : additionner le français et le latin de La Cité de Dieu doublerait une œuvre qui se lit une fois.
- **Recalcul** : fonction `recalculer_nb_signes()` (SECURITY DEFINER, `service_role` seul), à rejouer **après un import ou une correction de corpus**. Pas de trigger sur `segments` : les imports écrivent par lots de milliers de lignes. Sans ce rappel, la colonne dérive en silence (deux dérives constatées le 2026-08-16 : le Joël de Jérôme et la préface latine de Migne).
- **Piège** : une œuvre dont **aucune** version n'est marquée `is_default` n'a pas de source de recalcul et reste figée. C'était le cas du « Commentaire sur Joël ».

**Section « Opuscules »** (bibliothèque, `app/lib/opuscules.ts`, module pur testé `opuscules.test.ts`) : sous **40 000 signes**, une œuvre est un texte bref et se replie dans une section rétractée par défaut, sous les œuvres longues de l'auteur.

- **Le seuil vient du corpus, pas d'une idée de la longueur** : aucune œuvre publiée ne compte entre **38 824 et 58 044 signes**. La coupure tombe dans ce vide. Elle ne tombe pas sur la médiane (environ 59 000), qui rangerait **une œuvre sur deux** parmi les opuscules et couperait la série des commentaires de Jérôme sur les petits prophètes, Abdias (59 534) en sortant pendant que Jonas et Joël resteraient.
- **Deux conditions d'apparition** (`partagerOpuscules`) : au moins **trois** opuscules, ET au moins **une** œuvre longue. Sans la seconde, un auteur qui n'a que des textes brefs (Cyprien de Carthage, la Doctrine des Apôtres, Grégoire de Nazianze) verrait son étagère **vide**, repliée tout entière. Au 2026-08-16, la section ne se déclenche que chez **Jean Chrysostome** (11 opuscules pour 11 œuvres longues), et s'ouvrira d'elle-même chez les autres à mesure que la bibliothèque grossira.
- **Le classement porte sur le GROUPE DE TITRE, jamais sur la version isolée**, et retient la plus longue de ses versions : « La Cité de Dieu » a une édition latine de Migne dont seule la préface est intégrée (1 411 signes), qui quitterait sinon son titre pour tomber dans les opuscules.
- **Une œuvre non mesurée n'est jamais un opuscule** : on ne replie pas ce qu'on n'a pas mesuré, sous peine de cacher une œuvre entière sur une donnée manquante.
- **La recherche déplie la section d'office** quand elle tombe sur un opuscule, sinon le résultat trouvé resterait invisible.
- **Libellé du traducteur** : toute la mise en forme vit dans `app/lib/traducteurs.ts` (module pur, testé `traducteurs.test.ts`), ré-exportée par `PageTitre.tsx`. Elle sert la page de titre, la bibliothèque, les notices du catalogue et le sélecteur de version. Ne pas recomposer « Traduction par … » ailleurs.
  - ⚠️ **Une mention de responsabilité collective n'est pas un nom.** « Sous la direction de M. Jeannin ; traducteurs multiples » donnait « Traduction **par Sous** la direction de… ». Quand la mention porte « sous la direction », elle commande le libellé : « Traduction sous la direction de M. Jeannin ». Une formule qui se suffit déjà (« Traduction collective sous… », « Édition française sous… ») s'affiche telle quelle, une tête que la formule rend (« Équipe sous… ») est retirée, et les qualificatifs qui ne nomment personne (« traducteurs multiples ») sont écartés tant qu'il reste un vrai nom.
  - ⚠️ **Jamais `\b` pour borner un mot accentué en JavaScript** : `\b` n'y connaît que l'ASCII, donc `/^(Abbé|Père|Frère|Sœur|Mère)\b/` ne s'apparie **jamais** (la frontière tomberait entre « é » et l'espace, deux caractères non-mots). Les titres accentués restaient en capitale malgré la règle. Borner par lookahead : `(?=[\s.]|$)`.
- **La fiche auteur (`ModaleAuteur`) n'est PAS concernée** : sa liste est un catalogue **chronologique** de l'œuvre entière, œuvres seulement répertoriées comprises. Trier par taille y casserait la chronologie, qui en est le principe d'ordre.

# Appels de note — masqués au sommaire, actifs dans les titres (2026-08-16)

Doctrine : charte `parametres.charte_ia` **§13.6**. Tout le rendu des appels vit dans **`app/oeuvre/[id]/appelNote.tsx`** (info-bulle, `rendreTexteAvecNotes`, `rendreTitreColophonAvecNotes`, `preparerTitreColophon`, `titreSansAppelsDeNote`, `notesPourTexte`), extrait d'`OeuvreClient` pour que **`PageTitre` puisse l'importer sans cycle** — `OeuvreClient` importe `PageTitre`, l'inverse aurait bouclé.

- **Sommaire : `titreSansAppelsDeNote` sur TOUS les intitulés** (niveaux 1 à 3, chapeaux compris, sommaire des traductions parallèles inclus), et sur la barre de division de la comparaison, dont les intitulés viennent des segments de la traduction de référence sans leur banque de notes. Auparavant seuls les chapeaux de niveau 1 étaient nettoyés : « Livre cinquième[[81]] » s'affichait avec ses crochets. La regex emporte l'espace qui précède (`[ \t]*`, jamais `\s*`, sinon un appel en tête de ligne avalerait le retour du chapeau à deux lignes).
- **Corps : `variante` de l'appel** — `corps` (prose, chapeaux, titres de niveaux 3-4 : brun `#8a6a3e`, `0.60em`), `titre` (niveaux 1-2 : `currentColor` à 55 %, `0.42em`), `frontispice` (page de titre : `0.30em`). Dans tous les cas l'appel **hérite `font-family` et `font-style`** : dans un chapeau en italique, il s'incline avec lui. Ne pas revenir à `fontStyle: 'normal'` ni à une police serif forcée.
- ⛔ **JAMAIS de pointillé sous un appel de note**, ni aucun autre soulignement, nulle part. Règle d'auteur, sans exception ni cas particulier : l'exposant et la teinte suffisent à le signaler. `styleAppelNote()` est la SEULE définition de cette forme, et `ComparaisonTraductions` s'en sert aussi — ne pas recomposer un style d'appel ailleurs.
- ⚠️ **La note d'un titre n'est pas toujours sur le premier segment du groupe.** Dans les imports à notes structurées, `texte_note_ancres.segment_key` tombe quelques segments plus loin (Discours sur la Genèse : l'appel du chapeau du « Premier discours » est ancré au 8ᵉ segment, pas au 1ᵉʳ). D'où `notesSection` (banque memoïsée de `segments` + `segmentsApparat`) et `notesDuTitre(textes, locales)`, qui cherche dans la section entière à défaut du groupe. Sans cela, l'appel s'affichait mais ouvrait une note vide.
- `rendreTexteAvecNotes` reconnaît désormais les **`++petites capitales++`** comme `rendreTexteEnrichi` (ajoutées en FIN d'alternance pour ne pas renuméroter les groupes de capture) : la page de titre passe par ce moteur et y aurait perdu la petite capitale.
- Logique pure testée : `app/oeuvre/[id]/appelNote.test.ts`.

# Une œuvre à plusieurs auteurs (2026-08-16)

Doctrine : charte `parametres.charte_ia` **§16.11**. Les auteurs sont **à égalité** ; l'œuvre paraît une fois sous le nom de chacun et porte les deux noms là où elle est nommée.

- **Modèle** : le PREMIER auteur reste `oeuvres.id_auteur` (les ~220 lectures qui s'y appuient sont inchangées), les suivants vivent dans **`oeuvres_auteurs`** (`rang` ≥ 2, PK `(id_oeuvre, id_auteur)`, trigger refusant un auteur déjà premier). La vue **`v_oeuvres_auteurs`** (security_invoker, donc soumise à la RLS de `oeuvres`) réconcilie les deux et **fait seule autorité** : ne jamais refaire cette union à la main.
- **Côté TS, tout passe par `app/lib/auteursOeuvre.ts`** (pur + testé `auteursOeuvre.test.ts`) : `chargerAuteursParOeuvre`, `chargerAuteursDOeuvre`, `libelleAuteurs` (« A et B », via `enumererNoms`), `separateurAuteurs` (quand chaque nom est rendu séparément, cliquable), `grouperOeuvresParAuteur` (dépose l'œuvre sur CHAQUE étagère). Le repli sur `oeuvres.id_auteur` est volontaire : si les couples ne se chargent pas, une œuvre ne doit pas disparaître de l'étagère.
- **Surfaces branchées** : bibliothèque (SSR + rechargement client + canal temps réel sur `oeuvres_auteurs`), fiche auteur (`ModaleAuteur`), page de lecture (frontispice, volet, « du même auteur », traductions sœurs, métadonnées SEO), admin (bloc « Auteurs » du formulaire « Modifier l'œuvre » + route `app/api/admin/oeuvre-auteurs`).
- **Pas encore branchées** (elles montrent le premier auteur seul) : recherche de la navbar, panneau patristique, prélèvements, quiz, page d'accueil, `SelecteurCitation`.

## ⚠️ Piège majeur : une table de liaison CASSE tous les `select` imbriqués PostgREST

⛔ Ajouter `oeuvres_auteurs` a créé une **deuxième relation** entre `auteurs` et `oeuvres` (la clé étrangère directe `oeuvres.id_auteur`, plus le nouveau many-to-many). PostgREST refuse alors TOUT embed `auteurs(...)` ou `oeuvres(...)` avec **PGRST201 — « Could not embed because more than one relationship was found »**, `data` nul.

Symptôme observé : l'admin Bibliothèque affichait « Aucun auteur trouvé » et le bandeau « Certaines données n'ont pas pu être chargées », alors que rien du chargement n'avait été touché.

**Règle** : dès qu'une table de liaison double une clé étrangère existante, **qualifier tous les embeds par le nom de la contrainte** — `auteurs!oeuvres_id_auteur_fkey(nom)`, `oeuvres!oeuvres_id_auteur_fkey(...)`. Corrigé dans `app/accueil`, `app/admin/page.tsx`, `SectionAjouterOeuvre`, `app/compte`, `SelecteurCitation`, `app/oeuvre/[id]/page.tsx`, `RechercheClient`. Vérification : `grep -rn "auteurs(\|oeuvres(" app/` ne doit plus rien renvoyer sans `!oeuvres_id_auteur_fkey`.

### La base est PARTAGÉE : une migration casse le site en ligne avant que le correctif ne soit déployé

⛔ Il n'y a qu'une base Supabase pour le poste de travail et pour le site en ligne. Créer `oeuvres_auteurs` a donc rendu ambigus, **à la seconde même**, les embeds du code **déjà déployé**, qui, lui, ne changeait pas. Le correctif restant en local, le site en ligne a servi pendant une nuit un « **Œuvre introuvable** » sur **toutes** les œuvres, alors que la même page était saine sur le serveur de développement. Le poste de travail ne pouvait pas voir la panne : c'est le décalage entre les deux qui la fabriquait.

**Règle** : une migration qui touche la forme des relations (table de liaison, clé étrangère, renommage, vue lue par le site) n'est appliquée qu'**une fois le correctif poussé**, ou bien elle est poussée dans la foulée, sans attendre le lendemain. Aucune séance ne se termine avec une migration en base et son correctif dans un commit non poussé.

⚠️ **Le site en ligne se déploie depuis `master`, pas depuis la branche de travail.** `confort-lecture` ne produit que des déploiements **Preview** : y pousser un correctif ne change rien à corpus-scriptura.fr. Les deux branches ont divergé (base commune du 2026-08-07), un correctif urgent se porte donc en petit commit ciblé **directement sur `master`**, jamais en fusionnant la branche de travail entière. Vérifier ce qui est réellement en ligne :

```
curl -s "https://api.github.com/repos/sqdvcontact-lgtm/bible-patristique/deployments?environment=Production&per_page=1"
```

**Repérer la panne** : `git status -sb` (« ahead N ») dit ce qui manque au site. Rejouer la requête telle que la sert le code EN LIGNE, pas le code local :

```
curl -s "$SUPABASE_URL/rest/v1/oeuvres?select=id_oeuvre,auteurs(nom)&limit=1" -H "apikey: $CLE" -H "Authorization: Bearer $CLE"
```

Un `PGRST201` (HTTP 300) répond de lui-même ; la clé `hint` nomme la qualification à écrire.
