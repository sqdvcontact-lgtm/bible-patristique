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

### Corollaire : un nombre de LIGNES ne s'écrit pas en dur

⚠️ Dès qu'un bloc a une hauteur en **pixels** et un texte qui suit la **police racine fluide**, le nombre de lignes qui y tient change avec la largeur de l'écran. L'écrire en dur ne peut être juste qu'à une seule taille.

Cas rencontré le 2026-08-17, carte auteur de la bibliothèque (`app/bibliotheque/BibliothequeClient.tsx`) : bandeau `height: 200px`, notice bornée par `-webkit-line-clamp: 3`. Mesuré, la zone laissée à la notice vaut **100 px à 16 px de racine** et **81 px à 22 px** ; trois lignes y occupent 54 px et 74 px. La valeur était donc juste sur grand écran et laissait **46 px de blanc** sur un portable, sous une notice pourtant tronquée : du texte existait, la place aussi, et rien ne les réunissait.

Patron retenu, à reprendre pour tout bloc écrêté de hauteur fixe :

- la zone de texte prend la hauteur restante (`flex: 1 1 auto; min-height: 0; overflow: hidden`) et repousse elle-même le pied de carte, à la place d'une marge automatique ;
- un `ResizeObserver` mesure cette zone ET le texte, puis `-webkit-line-clamp` reçoit `Math.floor((hauteur + 1) / hauteurDeLigne)`. **Arrondi par défaut** : une ligne de plus serait rognée par le milieu, et mieux vaut un reste de blanc qu'une demi-ligne ;
- la mesure passe par `useLayoutEffect` (repli sur `useEffect` au rendu serveur), sans quoi la carte se voit grandir puis se recouper. ⚠️ L'alias doit être une constante de MODULE nommée `use…`, sinon la règle des hooks d'ESLint ne le reconnaît pas et signale « Cannot access refs during render » ;
- la boucle se referme d'elle-même : reposer le même nombre de lignes ne redéclenche pas de rendu.

Résultat : blanc résiduel de 5 à 10 px selon la taille, hauteur de carte inchangée à 200 px.

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

# Page « Publications » — couvertures de petit livre (2026-08-17)

Refonte complète de `app/essais/EssaisListeClient.tsx`. **Remplace** l'ancienne « structure de l'Index » et sa refonte survol/doré, toutes deux supprimées : plus de sommaire en deux colonnes, plus de bloc « à la une », plus de créneau de dix minutes.

Une publication se présente désormais comme un **petit livre**, et la liste comme une table d'étalage.

- **Trois par rang** (`.rayon`, `grid-template-columns: repeat(3, …)`), deux sous 900 px, une sous 520 px. Proportion `aspect-ratio: 2 / 3`, coin arrondi, ombre portée, et une bande sombre au bord gauche qui figure le dos de reliure.
- **La face** porte le nom de l'auteur en capitales, un filet, le titre en grand, le sous-titre dessous, et la **date au pied** (`margin-top: auto`). **Tout est sans empattement.**
- **La quatrième** (`.couverture-dos`) se retourne au survol : le résumé, **seul endroit en empattement**, écrêté à neuf lignes, un bouton « Lire », puis les vues, les ♥ et la mention « parmi les plus lus ». Elle prend le fond de la couverture, si bien que le livre paraît se retourner et non s'ouvrir.
- ⚠️ **Tactile : pas de quatrième.** Sous `@media (hover: none)`, le dos n'est pas rendu du tout et la face reste : rien ne se survole sur un téléphone, et le résumé se lit sur la page de la publication, à un doigt de là. Ne pas « corriger » en affichant les deux, la couverture y perdrait son titre.

## La couleur appartient à l'auteur

- **Jeu de couvertures** : `app/lib/couverturesEssai.ts` (module pur, 7 tests). Treize couleurs, tons du site d'abord (vert d'encre, crème, vieil or, sauge), puis la roue entière, rabattue vers le rompu : bordeaux, brique, prune, indigo, ardoise, sarcelle, olive, terre de Sienne, encre noire.
- ⚠️ **Le contraste est TESTÉ**, pas supposé : chaque couverture doit opposer son encre à son fond d'au moins 4,5 (WCAG AA). Deux teintes ont été assombries pour y satisfaire — l'or du site (`--cs-or`, #9a7a38) ne donnait que 3,8 sous une encre claire, la sauge claire 3,3. Ajouter une couleur sans repasser le test, c'est risquer une couverture jolie et illisible.
- **Stockage** : colonne `essais.couverture` (text, nullable), migration `essais_couverture`. **Aucune contrainte CHECK** : le jeu est éditorial et bougera, et une couleur retirée ne doit ni bloquer une écriture ni effacer une publication. La validation vit dans `estCouvertureConnue`, et la lecture est tolérante — `couvertureDe` rend le défaut (vert d'encre) sur une clé inconnue, vide ou absente.
- **Choix par l'auteur** : rang de pastilles dans le formulaire de métadonnées de `EditeurEssai`, posé **sous le résumé**, puisque le résumé est précisément la quatrième. La couleur part dans le `payload` d'enregistrement.
- ⚠️ **Quatre `select` doivent porter la colonne**, sans quoi la couverture se perd en route : `app/essais/page.tsx` (la liste), `app/essais/[id]/page.tsx` (la lecture, qui alimente l'éditeur), et le passage de `app/essais/[id]/modifier/page.tsx` vers `EditeurEssai`.

**Ce qui disparaît, volontairement** : le bloc « à la une » et sa règle du créneau de dix minutes, la lettrine du résumé, le calque de survol au gabarit du bloc, le balayage doré. Les couvertures sont d'égale dignité. « Parmi les plus lus » survit, déplacé au dos.

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

# Citation sortie — style en place, détection volontairement étroite

Doctrine : charte `parametres.charte_ia` **§3.8**, cinquième règle. Une citation longue se détache de la prose : elle perd ses guillemets encadrants, ses guillemets internes reviennent au français, et elle reçoit un retrait des deux côtés.

- **Module pur et testé** : `app/lib/citationSortie.ts` (11 tests). `SEUIL_CITATION_SORTIE = 400` signes, seuil arrêté avec l'auteur. `detecterCitationSortie` rend `{ avant, citation }` ou `null`.
- **Trois conditions cumulées**, faute de quoi la mise en page se brise : la citation doit être **isolée** (un deux-points l'annonce), **longue** (≥ 400 signes) et **terminale** (rien après le guillemet fermant, sinon un appel de note). Une citation enchâssée sortie laisserait sa phrase d'accueil coupée en deux.
- **Style** : `.citation-sortie` dans le bloc `<style>` d'`OeuvreClient` — `display: block`, retrait `8mm` des deux côtés, corps `0.95em`, justifié, **ni guillemets ni filet**. Même mesure que la citation d'un essai (`texteEnrichiEssai.tsx`, `EssaiClient.tsx`), pour une seule forme sur le site.
- ⚠️ **Mode SEGMENTS seulement.** Le rendu se greffe dans le `<p>` que le segment possède en propre : la citation devient un `<span>` en `display:block`, si bien que le segment reste cliquable, numéroté et prélevable, sans rien changer à sa structure. En mode **paragraphes**, un segment n'est qu'un `<span>` inline dans un `<p>` partagé : y poser un bloc couperait le paragraphe des voisins. Le cas est peu gênant en pratique — sur les 61 segments candidats du corpus, **51 appartiennent à des œuvres sans colonne `paragraphe`**, où le mode paragraphes n'est même pas proposé.
- **La lettrine garde la priorité** : un premier segment orné ne se coupe pas en deux.
- **Chiffres du relevé (2026-08-17)** : 214 citations dépassent 400 signes, 146 sont isolées, **61** sont en outre terminales. Ce sont ces 61 que la règle atteint aujourd'hui.
- ⚠️ La francisation des guillemets internes est **l'inverse** de `convertirGuillemetsInternes` (`app/lib/citation.ts`), qui bascule les internes en anglais parce que le copier-coller ajoute un encadrement français. Symétriques, opposées : ne pas les confondre.

# Césures du texte latin — aucun navigateur ne sait les faire

⛔ **`hyphens: auto` ne fait RIEN sur un `lang="la"`.** Aucun moteur ne livre de dictionnaire de coupure pour le latin. Mesuré dans le navigateur intégré, sur une colonne de 170 px et un extrait des *Confessions* : **23 lignes** avec `hyphens: auto`, **23** sans césure du tout, et **23** encore en déclarant `lang="it"` pour emprunter le dictionnaire italien. La déclaration était donc inerte depuis toujours, et la justification creusait les blancs faute de pouvoir couper.

Les points de coupe sont désormais **posés par nous**, en césures conditionnelles U+00AD (invisibles tant que la ligne n'a pas besoin d'être coupée). Module pur et testé : `app/lib/cesuresLatines.ts` (14 tests).

- **Deux notions distinctes, deux fonctions.** `syllabesLatines` est linguistique : « do-mi-ne » a trois syllabes, un point. `pointsDeCoupe` est typographique et n'en retient que certaines : au moins **2 lettres avant** la coupe et **3 après**, d'où « do-mine » et non « do-mi-ne ». Le second seuil est le seul curseur à toucher si l'on veut plus de coupes encore.
- **Règles classiques appliquées** : consonne simple à la syllabe suivante ; muette + liquide insécable (« pa-tris ») ; s + occlusive insécable (« ne-sci-ens », « in-spi-ra-sti ») ; `s` + muette + liquide d'un seul tenant (« ca-stra ») ; digrammes grecs et `gn` insécables (« chri-stus », « ma-gnus ») ; diphtongue jamais coupée (« lau-da-bunt ») ; hiatus coupé (« de-o-rum »).
- ⚠️ **Le `u` de `qu`/`gu` est consonantique** : sans cette règle, « loquitur » se coupe en « loq-ui-tur » et « quomodo » en « qu-omo-do ». `qu` et `gu` figurent donc dans les groupes insécables.
- **Posées au RENDU, jamais dans la donnée** (même doctrine que l'espacement, charte §3.2) : `cesurerLatin` s'applique au `texte_original` d'`OeuvreClient`. La fonction est idempotente et ne change pas une lettre : `sansCesures(cesurerLatin(t)) === t`, garanti par test.
- ⚠️ **Une césure ne doit jamais quitter la page.** `preparerTexteCitation` (`app/lib/citation.ts`) appelle `sansCesures` : sans quoi un copier-coller emporterait des caractères invisibles dans le presse-papiers.
- **La regex ne vise que les suites de lettres d'au moins 5 caractères**, ce qui laisse intacts les marqueurs de note `[[81]]`, les nombres et la ponctuation.
- **Gain mesuré** (extrait des *Confessions*, 0.79rem) : 170 px → 8,7 % de lignes en moins ; 220 px, largeur réelle de la colonne bilingue → 5,9 % ; 300 px → nul. Le gain en lignes sous-estime l'effet : à nombre de lignes égal, les blancs de justification se resserrent. L'espacement du latin a par ailleurs reçu le `wordSpacing: -0.025em` que portait déjà la colonne française.

# Police des textes d'œuvre — sérif toujours, sauf l'original en regard

Règle d'auteur, fixée le 2026-08-17 :

- **un texte d'œuvre se lit TOUJOURS en sérif** (`--font-source-serif`), corps comme titres, en mode segments comme en mode paragraphes, en lecture comme en apparat critique. Le corps était en `--font-source-sans` depuis l'origine : quatre déclarations dans `OeuvreClient` ;
- **le texte en langue originale (latin, grec) se lit en sérif lui aussi**, quand il paraît SEUL (mode « Latin ») ;
- **SEULE exception : mis EN REGARD du français, l'original passe en sans-serif.** La différence de police sépare les deux colonnes d'un coup d'œil, mieux qu'un filet.

Porté par une règle CSS, `.para-bilingue > .texte-original`, dans le bloc `<style>` d'`OeuvreClient`. La classe `.para-bilingue` n'est posée qu'en mode bilingue (`affichageBilingue && original`), jamais en « Latin seul » : c'est ce qui fait basculer la police au bon moment, sans condition en JS.

# Typographie du texte en langue originale (latin, grec)

⚠️ **Rectification du 2026-08-17.** Ce paragraphe affirmait que le corpus français portait déjà une fine U+202F autour des guillemets. C'est **faux**. Relevé sur 20 000 segments, autour du guillemet ouvrant comme du fermant : **~14 600 insécables pleine chasse U+00A0**, ~3 000 espaces ordinaires U+0020, ~1 530 fines U+202F. Trois caractères pour une seule intention, résidus de lots d'import successifs. L'insécable pleine chasse vaut **le double** d'une fine (mesuré dans Source Serif 4 : 21,9 % du cadratin contre 10,9 %), d'où une citation qui bâille. Ne pas se fier à la donnée : c'est le rendu qui fait la typographie.

Le texte en langue originale (`segments.texte_original`, latin/grec), lui, vient d'éditions à ponctuation **collée** (« valde: », « dixit: »).

Règle (charte §3.1-3.2, étendue au 2026-08-06) : on harmonise la langue originale sur le français, **au rendu, sans réécrire la donnée**. Fonction pure `normaliserEspacesOriginal` (`app/lib/typographie.ts`, testée `typographie.test.ts`) : **ajoute** une fine insécable U+202F avant `:` `;` `!` `?` et autour des guillemets ; idempotente ; ne touche pas `, . …`. Appliquée au seul rendu de `texte_original` dans `OeuvreClient` (modes bilingue et langue originale seule). Le français garde `normaliserEspaces` (qui ne fait que **convertir** le type d'espace déjà présent, jamais en ajouter).

- **Un seul point d'application, et il est central** : `normaliserEspaces` est appelée **à l'entrée de `rendreTexteEnrichi`** (`app/oeuvre/[id]/texteEnrichi.tsx`), par où passe TOUTE la lecture — Bible, œuvre, péricopes, panneau patristique, prélèvements, polyglotte, recherche, traductions parallèles. Auparavant elle n'était appelée que par `OeuvreClient`, si bien que la page d'œuvre rendait la fine pendant que tout le reste du site gardait l'espace pleine chasse. ⛔ Ne jamais rendre du texte de corpus sans passer par `rendreTexteEnrichi` : ce serait rouvrir le trou.
- **Le copier-coller passe par `preparerTexteCitation`** (`app/lib/citation.ts`), qui applique la même fonction : le presse-papiers emporte le texte brut, pas le rendu.
- **Longueur préservée, caractère pour caractère** (jamais de quantificateur `+` dans `normaliserEspaces`) : la page Recherche surligne en découpant par indices, une conversion qui raccourcirait le texte décalerait le surlignage.
- **Le deux-points reste à l'insécable pleine chasse** (règle de l'Imprimerie nationale, texte littéral de la charte §3.2) : il n'entre pas dans la conversion. La fine ne vaut que pour `;` `!` `?` et les guillemets.
- ⚠️ **Piège d'édition** : ce module est fait de caractères invisibles (U+0020, U+00A0, U+202F) qui se ressemblent tous à l'écran. Une réécriture du fichier a déjà remplacé les fines de `normaliserEspacesOriginal` par des espaces ordinaires, sans que rien ne le montre à la lecture ; seuls les tests l'ont attrapé. Passer par les constantes `ESPACES` / `FINE`, jamais par un littéral tapé à la main, et vérifier au besoin par `[...s].map(c => c.codePointAt(0))`.
- Les deux fonctions vivent désormais dans `app/lib/typographie.ts` (module pur, testable) et sont ré-exportées par `app/oeuvre/[id]/texteEnrichi.tsx` pour les appelants historiques.
- Périmètre : toutes les œuvres sont `langue_trad='Français'` — le latin/grec n'existe que comme `texte_original`. La Vulgate/Septante de la **Bible** est un autre contexte (page Bible), non couvert ici.

# Centre de contrôle admin — toujours regarder où l'on en est

⛔ **Avant toute séance de travail sur le corpus, consulter le centre de contrôle** (charte `parametres.charte_ia` **§30**). Page admin dédiée **`/admin/controle`** (`app/admin/controle/page.tsx`, Server Component gardé par `estAdmin()`, client service_role), liée depuis le menu « Administration » de la navbar (première entrée « Centre de contrôle », famille corpus). Six sections : Corpus, Qualité du texte, Catalogue, Péricopes, Bibliographie, Chronologie. Chacune : chiffres réels + barre d'avancement + note de synthèse + liste de tâches (à faire / fait).

- **Chiffres** : une seule RPC **`controle_tableau_bord()`** (SECURITY DEFINER, `search_path=public`, EXECUTE réservé au `service_role`) renvoie un `jsonb` de tous les compteurs, en direct. **Exception qualité** : `seg_bon/moyen/critique/total` sont lus sur la vue matérialisée `oeuvres_controle_stats_mat` (la vue en direct coûte ~10,5 s) ; recalcul à la demande via `rafraichir_controle_stats()`, date affichée (`controle_stats_meta.calcule_le`). Le total qualité doit coïncider avec `seg_controle_total` (segments `nature='texte'`) : si un écart apparaît, la matérialisée est périmée → la rafraîchir.
- **Notes et tâches** : table **`controle_sections`** (`cle` PK, `titre`, `ordre`, `commentaire_ia`, `todos` jsonb `[{texte, fait}]`, `maj_le`). RLS : lecture `authenticated` + `is_admin()` ; écriture par l'assistant (service_role). **Après une avancée notable, mettre à jour la note et cocher les tâches** de la section concernée, pour que la page reste fidèle à l'état réel.
- **Nombre de traductions bibliques lisibles** : via `codesTraductionsLecture()` (mêmes règles que l'accueil), jamais le simple `count(*)` de `traductions` (qui compte aussi les non matérialisées comme TR0009).

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

# Appels de note — masqués au sommaire, actifs dans les titres du corps

Doctrine : charte `parametres.charte_ia` **§13.6**. La logique pure vit dans **`app/oeuvre/[id]/appelNote.ts`** (module testé, `appelNote.test.ts`) ; l'info-bulle et le moteur `rendreTexteAvecNotes` / `rendreTitreColophonAvecNotes` restent dans `OeuvreClient`, qui l'importe.

- ⛔ **JAMAIS de pointillé sous un appel de note**, ni aucun autre soulignement, nulle part. Règle d'auteur, sans exception ni cas particulier : l'exposant et la teinte suffisent à le signaler. Le `borderBottom: '1px dotted'` est revenu une fois sur `master` après avoir été retiré ailleurs — un test le garde désormais.
- ⚠️ **Deux composants rendent des appels, pas un.** `app/oeuvre/[id]/appelNote.tsx` sert la page d'œuvre ; `app/lib/NoteTooltip.tsx` sert le panneau patristique et les essais, ainsi que les renvois vers un verset ou un segment. Le pointillé a été retiré du premier puis retrouvé dans le second : les corriger ENSEMBLE. `NoteTooltip.test.ts` inspecte le source du second, faute de pouvoir interroger des styles en ligne, et `appelNote.test.ts` interroge `styleAppelNote()` pour le premier.
- **Sommaire : `titreSansAppelsDeNote` sur TOUS les intitulés**, niveaux 1 à 3, chapeaux compris, plus la table de l'apparat. Seul le chapeau de niveau 1 était nettoyé : « Livre cinquième[[81]] » s'affichait ainsi dans la navigation, où la note est de surcroît illisible (le sommaire ne porte pas leur texte). **L'espace qui précède part avec le marqueur**, sans quoi l'intitulé garde un blanc double.
- **`variante` de l'appel** — `corps` (prose, chapeaux, titres de niveaux 3-4 : brun `#8a6a3e`, `0.60em`) et `titre` (niveaux 1-2, en lecture comme en apparat : `currentColor` à 55 %, `0.42em`). Un titre est court et composé large : l'appel brun y fait une tache. Dans tous les cas l'appel **hérite `font-family` et `font-style`** : dans un chapeau en italique, il s'incline avec lui. Ne pas revenir à `fontStyle: 'normal'` ni à une police posée en dur.
- `styleAppelNote()` est la SEULE définition de cette forme : ne pas recomposer un style d'appel ailleurs.

# Branches — `master` seule, et ce qui reste à rapatrier (2026-08-17)

Le site est déployé depuis **`master`**, et de `master` seule : une branche de travail ne produit que des déploiements **Preview** chez Vercel. Tout travail sur le site va donc directement sur `master`.

La branche de travail, renommée **`la-gueule-bible899`**, ne garde plus que ce qui ne concerne pas le site : l'outil La Gueule et le chantier Bible 899, menés à part. L'arbre de travail principal reste sur elle, car les trois commits Bible 899 n'existent nulle part ailleurs.

⚠️ **Un `cherry-pick` ne rapatrie pas une fonctionnalité qui touche `OeuvreClient`.** Le fichier a divergé de 480 lignes ajoutées et 384 supprimées sur 2 654 : le patch entrant y remplace la page au lieu de la compléter, et il traîne au passage des props d'autres commits. Trois apports restent donc à **porter à la main**, en repartant du code de `master` et en lisant la branche comme référence :

- **Une œuvre à plusieurs auteurs** (`be068b43`, 16 fichiers) — la migration est déjà en base et en production ; s'ajoutent `app/lib/auteursOeuvre.ts` et la route `api/admin/oeuvre-auteurs`. Recoupe le correctif d'embed qualifié déjà posé sur `master`.
- **Traductions parallèles** (`8a178c24`, 12 fichiers) — dépend du découpage des appels de note.
- **Appels de note** (`88cb50a3`, `2b3bda54`, `5ceb71be`) — `master` possède déjà les fonctions de rendu, **en ligne** dans `OeuvreClient` ; ce qui lui manque est l'extraction en module `appelNote.tsx` (pour que `PageTitre` l'importe sans cycle) et le comportement : appels **masqués au sommaire**, actifs dans les titres du corps.

Rapatriés le 2026-08-17, après contrôle (`tsc` propre, suite verte) : sources Tailwind bornées à `app/`, filtrage des notices patristiques, section « Opuscules », libellé du traducteur, retrait du pointillé sous les appels de note.

# Lecture en regard — deux témoins d'une œuvre, appariés par la base

Mode « Traductions parallèles » de la page d'œuvre (`app/oeuvre/[id]/ComparaisonTraductions.tsx`, logique pure et testée dans `comparaisonTraductionsUtils.ts`). Il n'apparaît que si l'œuvre possède un ensemble d'alignement **dont les deux témoins sont accessibles à la session** : le filtrage a lieu dans le composant serveur, jamais dans le client.

- **L'appariement vient de la base, jamais du texte.** `texte_alignements` décrit des GROUPES (ce qui se répond de part et d'autre), `texte_alignement_membres` dit quels segments composent chaque côté, appariés par `segments.segment_key`. ⚠️ **Un groupe peut être 1:0 ou 0:1** : la case reste alors vide et porte la mention « rien en regard ». Ne jamais combler par le segment voisin, ce serait fabriquer une correspondance que l'éditeur n'a pas établie.
- **Chargement division par division.** L'ensemble de La Cité de Dieu compte 10 535 membres pour 661 divisions : on ne le descend pas d'un bloc. Les requêtes `in.(…)` passent par lots de 180, la borne de PostgREST.
- **Le texte passe par le moteur de la lecture.** `rendreTexteAvecNotes` a été extrait d'`OeuvreClient` vers `appelNote.tsx` pour cela : les appels de note sont vivants et de même forme dans les deux modes, sans que les fichiers s'importent l'un l'autre. ⚠️ Ce module est chargé par un test : ses imports doivent rester **relatifs**, l'alias `@/` n'étant pas résolu par vitest.
- **Polices.** La colonne en langue originale passe en sans-serif, comme en lecture bilingue (règle d'auteur), et reçoit `cesurerLatin`.
- ⚠️ **Libellés calculés, jamais tabulés.** Les tables de la première version s'arrêtaient au cinquième livre et au vingt-quatrième chiffre romain ; La Cité de Dieu compte vingt-deux livres et va jusqu'à la cinquante-quatrième division, si bien que tout le dessus retombait en chiffres arabes au milieu d'une série en toutes lettres. `chiffreRomain` compose, `ORDINAUX` va jusqu'au vingt-quatrième.
- **En-tête de colonne : le nom du traducteur, pas le titre de version.** Celui de Mirandol tient en cent signes. `libelleColonne` prend le nom, y joint l'année, et ramène une responsabilité partagée à son premier nom.
- **Données au 2026-08-17** : deux ensembles seulement, Boèce (Mirandol 1861 contre Ceriziers 1646, 784 groupes) et La Cité de Dieu (latin Vivès contre Barreau, 1 084 groupes). Aucun membre orphelin, vérifié.

# Termes en langue étrangère — italique partout

Doctrine : charte `parametres.charte_ia` **§ 3.6**, arrêtée le 2026-08-17. Une seule règle, sans liste d'exceptions à retenir.

- **Tout terme, locution ou phrase en langue étrangère inséré dans un texte français est en italique**, quelle que soit la langue, ancienne ou moderne. ⚠️ **Le latin ne fait pas exception et la lexicalisation n'est pas un critère** : `*a priori*`, `*ex nihilo*`, `*in fine*` prennent l'italique. Les abréviations savantes aussi : `*cf.*`, `*ibid.*`, `*op. cit.*`, `*et al.*`, `*passim*`, `*sic*`, `*circa*`. Choix d'auteur assumé, qui s'écarte de l'Imprimerie nationale (laquelle laisse « cf. » en romain).
- **Une seule exception d'alphabet** : le grec en caractères grecs reste en romain, l'alphabet suffisant à signaler la langue. Une translittération en alphabet latin, elle, prend l'italique.
- **Les noms propres étrangers restent en romain** : personnes, lieux, institutions, revues. Le titre d'une œuvre fait exception à cette exception, son italique lui venant de sa qualité de titre.
- **Superposition : l'italique l'emporte.** Un terme étranger dans un contexte déjà en italique GARDE l'italique ; on ne revient pas au romain pour l'en distinguer.
- **Exception d'échelle** : un texte entier dans une langue étrangère n'est pas mis en italique. La règle vise le terme inséré dans une phrase française, pas un texte qui est tout entier dans cette langue, ni les enrichissements d'auteur attestés par la source.
- **Balisage `*terme*`**, le même que celui des titres, rendu en véritable italique par `rendreTexteEnrichi`. **Portée : absolument partout** — notices d'auteur, d'œuvre, chronologiques, commentaires, notes de l'éditeur, chapeaux, libellés d'interface et messages du site.

⚠️ **Piège rencontré en écrivant cette règle** : le champ `parametres.charte_ia` est du **texte simple**, mais un passé d'écriture y avait laissé quatre `\n` LITTÉRAUX (barre oblique inverse suivie de n) en guise d'alinéas, qui s'afficheraient tels quels. Ils ont été convertis en vrais retours à la ligne. Écrire dans la charte par `overlay` sur des positions vérifiées, jamais par une réécriture du champ entier, et sauvegarder d'abord (table `backup_charte_ia_20260817_termes_etrangers`).

# Centre de contrôle — les blocs remplis par l'IA sont bornés

Les deux blocs que l'assistant remplit (`controle_sections.commentaire_ia` et `todos`) n'ont **aucune longueur prévisible**, et la page ne les bornait pas. Relevé du 2026-08-17 : la note de la section Qualité pèse **83 394 signes** pour 113 tâches, celle de Chronologie 21 371, celle du Catalogue 9 049 pour 102 tâches. Une seule carte chassait donc toutes les autres hors de l'écran.

- **Hauteur bornée et défilement interne** : la note à 13 rem, la liste des tâches à 15 rem, classe partagée `.cc-defile` (barre fine, `overscroll-behavior: contain` pour que la page ne parte pas quand la zone est au bout). La couleur du curseur vient de la variable `cc-pouce`, redéfinie en vert sur le bloc vert de la note.
- **Les alinéas sont restitués** (`white-space: pre-line`). Ces notes en portent jusqu'à 221, que le paragraphe écrasait en un pavé continu.
- **Le poids de la note est annoncé** au-delà de 1 200 signes, pour qu'on ne croie pas l'avoir lue en entier.
- ⚠️ **Le bloc de styles est un littéral gabarit** : jamais d'accent grave dedans, pas même dans un commentaire. Il a cassé la compilation deux fois ici, comme il l'avait fait dans `EssaisListeClient`.
- ⚠️ **Résidu à surveiller** : `commentaire_ia` de la section Qualité contient un `\n` LITTÉRAL, qui s'affiche tel quel. Même défaut que celui trouvé dans la charte, même origine probable.

# Casse des titres — la règle de l'Imprimerie nationale

Doctrine : charte `parametres.charte_ia` **§ 3.5**, réécrite le 2026-08-17 d'après le *Lexique des règles typographiques en usage à l'Imprimerie nationale*, entrée « Titres d'œuvres et de journaux » (p. 168-171). La règle précédente, « une majuscule au premier mot seulement », était vraie d'un seul cas sur quatre.

- **Le titre ne commence pas par l'article défini** → le mot initial prend seul la majuscule. *Sur Joseph et la continence*, *De l'esprit des lois*.
- **Le titre commence par l'article défini** → l'article prend la majuscule, et il est le SEUL à la prendre lorsque le titre forme une phrase (*Les dieux ont soif*).
- ⚠️ **Écart assumé avec le Lexique.** Celui-ci ajoute un second cas où la majuscule s'arrêterait à l'article, les ouvrages spécialisés, d'érudition ou techniques, et les articles de revue. **Corpus Scriptura ne le retient pas** : une distinction de genre ne se tranche pas sûrement au moment d'écrire un titre, et elle produirait deux casses concurrentes dans une même bibliographie. Un ouvrage d'érudition prend donc la majuscule au premier substantif comme les autres, *La Figure de Paul dans les Actes des Apôtres*.
- **Sinon la majuscule va plus loin** : à chaque terme en opposition ou en parallèle dans un titre qui contient une comparaison ou une symétrie (*La Belle et la Bête*, *Le Diable et le Bon Dieu*) ; et, dans tous les autres titres, **au premier substantif ainsi qu'aux adjectifs et adverbes qui le précèdent** (*Les Très Riches Heures du duc de Berry*, *Le Petit Chaperon rouge*).
- ⚠️ **Dans un titre en deux parties séparées par « ou », l'article de la seconde partie PERD la majuscule** : *Julie ou la Nouvelle Héloïse*, *Le Mariage de Figaro ou la Folle Journée*.
- ⚠️ **Les titres en langue étrangère suivent la règle FRANÇAISE**, casse et typographie comprises : l'usage anglais de la capitale à chaque mot important n'est pas suivi.
- **Restent en romain, article en bas de casse** : livres dits sacrés (la Bible, l'Évangile selon saint Luc), actes officiels, codes, et désignations de thèmes traditionnels qui ne sont pas des titres réels (la Crucifixion).
- ⛔ **Jamais dans le corps d'un texte source.** La casse d'un titre qui figure DANS le texte d'une œuvre appartient à l'édition reproduite.

**Écart mesuré au 2026-08-17** : les titres d'œuvre, sous-titres, titres d'essai et intitulés d'événement sont propres ; aucun article initial en bas de casse nulle part. Restent **89 titres de niveau distincts composés tout en capitales** (11 en `ref_niv1`, 76 en `ref_niv2`, 2 en `ref_niv3`), du type `LIVRE TROISIÈME` ou `EXPLICATION DU PSAUME CXL.`, qui sont des capitales d'affichage de la source et non une casse éditoriale. ⚠️ Ne pas compter les chiffres romains (`VIII`, `XXIV`) comme des violations : un dépistage naïf sur `v = upper(v)` en trouve 94 au lieu de 89.

**Passe du 2026-08-17 sur la bibliographie.** La règle unifiée a déplacé la majuscule sur **73 titres français d'ouvrages scientifiques retenus** (`La parabole du semeur` → `La Parabole du semeur`). Six d'entre eux portaient un adjectif ou un numéral devant le substantif, qui prend alors lui aussi la majuscule, et se sont corrigés à la main : `La Première Épître aux Corinthiens`, `Les Deux Visages d'Élie`, `Les Dix Plaies d'Égypte ou la Création d'Israël`. Sauvegarde : `backup_ouvrages_titres_20260817_casse`.

**Les titres anglais ont été convertis** le 2026-08-17, sur décision de l'auteur : 54 titres et 45 sous-titres, sauvegarde `backup_ouvrages_titres_20260817_anglais`.

⚠️ **La conversion s'est faite sur un VOCABULAIRE, jamais titre par titre.** On relève d'abord tous les mots capitalisés du lot (environ 250 pour 161 titres), on décide une fois pour toutes lesquels sont des noms propres, puis on abaisse mécaniquement le reste. Trancher 161 phrases à la main aurait été plus long et moins sûr.

Ce qui garde sa capitale : le premier mot du champ ; le premier mot après un deux-points ; les noms propres, dont les livres bibliques, les peuples et les adjectifs que l'orthographe anglaise impose (*Jewish*, *Christian*, *Greek*) ; les sigles et les chiffres romains ; et, quand le titre commence par *The*, le premier substantif avec les adjectifs qui le précèdent. Tout le reste passe en bas de casse.

- ⚠️ **Seul l'ANGLAIS est concerné.** L'allemand capitalise ses substantifs par ORTHOGRAPHE et non par casse de titre : y toucher serait une faute de langue, pas une correction typographique. Les trois titres allemands, les deux latins, l'espagnol, l'italien, le portugais, le tchèque et l'hébreu sont restés intacts.
- ⚠️ **L'insécable du deux-points ne se pose pas dans une référence chiffrée.** `Lk 2:22-39` doit rester collé ; six titres l'avaient reçue à tort et ont été repris.
- ⚠️ **Une liste de noms propres est toujours incomplète.** Le contrôle qui compte : comparer les mots de la sauvegarde à ceux du résultat et lire ceux qui ont été abaissés. C'est ainsi qu'on a rattrapé *Job*, *Beatitudes* et *Twelve Prophets*.
- **Cas à reprendre à la main** : l'adjectif devant le substantif, qui prend lui aussi la majuscule (*The Suffering Servant*, *The First Book of Samuel*, *The Maccabean Martyrs*).
