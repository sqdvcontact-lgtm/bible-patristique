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
