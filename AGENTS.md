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

# Titre d’onglet — le gabarit du layout suffit

`app/layout.tsx` pose `template: "%s · Corpus Scriptura"`. **Une page ne nomme donc jamais le site dans son propre `title`** : elle écrit `title: 'Statistiques'`, et le gabarit fait le reste. Une page qui doit porter un titre entier (l’accueil, la lecture biblique, la page d’œuvre, les pages légales) déclare `title: { absolute: … }`, qui neutralise le gabarit.

- ⚠️ Onze pages écrivaient « — Corpus Scriptura » en plus du gabarit, d’où « Statistiques — Corpus Scriptura · Corpus Scriptura » dans l’onglet, dans les partages et dans les résultats de recherche (relevé le 2026-08-19). Le séparateur du site est le point médian `·`.
- Le test `app/lib/titresPages.test.ts` parcourt les `page.tsx` et refuse tout titre qui nomme le site sans `absolute`. Seule `/quiz` en est exemptée (route neutralisée, version vivante sur la branche Holy Guessr).


# Responsive / mise à l'échelle (écrans desktop)

Le site est dessiné en pixels fixes calibrés pour un portable. Pour l'agrandir sur grand écran **sans le refondre**, on scale par une **police racine fluide** et une conversion **px → rem** progressive, page par page.

- **Moteur** : `html { font-size: clamp(16px, calc(7px + 0.625vw), 22px) }` dans `app/globals.css` — 16px jusqu'à 1440px (aucun changement visuel sur portable), puis grandit jusqu'à 22px à 2400px (×1,375). On ne touche **QUE** `font-size` : les unités `vh` restent intactes, donc les mises en page pleine hauteur `calc(100vh - 48px)` ne débordent jamais. **C'est la raison qui écarte `zoom`** (qui rescale les `vh` et fait déborder).
- **Convention de conversion** : passer en **rem** (valeur px ÷ 16) tout ce qui gouverne **taille de texte, mesure de lecture, rythme de lecture, largeur de colonne de contenu**. **Rester en px** pour : filets/bordures `1px` (le rem devient flou), géométrie de chrome à hauteur fixe (grilles serrées, boutons), largeurs de volets **persistées en localStorage** (drag), et la **hauteur de Navbar (48px)**.
- **Piège des blocs `<style>` (trouvaille)** : les conversions qui ne visent que les styles *inline* (`fontSize`) laissent intacts les `font-size` en **kebab-case** DANS les blocs `` <style>{`…`}</style> ``. Ces restes ont persisté sur le chantier, les sections admin et plusieurs pages lecteur (recherche, essais, traductions, bibliothèque, compte, commentaires…), restant petits sur grand écran alors que le reste grossissait. **Convertir aussi le CSS des blocs `<style>`**, en **sautant les lignes `@media`** (sinon on casse la valeur du breakpoint) et en gardant le garde-fou iOS `font-size: 16px` au focus. Repérage : `grep -rnE 'font-size: *[0-9]+px' app` (doit ne plus rien renvoyer hors le `16px !important` iOS).
- **Mesure de lecture** : tokens `--mesure-*` dans `:root` (`globals.css`), en rem, pour que la colonne conserve ses proportions (mêmes caractères/ligne) quand le texte grossit.
- **Navbar** : hauteur = **`HAUTEUR_NAVBAR = '3.5rem'`** (chaîne rem, dans `app/lib/mesures.ts`) → la barre grandit avec la police racine. Tous les décalages du site sont accordés à cette valeur : `calc(100vh/100dvh - 3.5rem)`, `top/paddingTop/scrollMarginTop: '3.5rem'`. ⚠️ **`HAUTEUR_NAVBAR` n'est plus un nombre** : ne jamais faire d'arithmétique JS dessus — composer en `calc(${HAUTEUR_NAVBAR} + Npx)` (cf. `SOMMET_CORPS` dans `polyglotte/page.tsx`, en-têtes collants). Pour changer la hauteur, modifier `mesures.ts` **et** répercuter la valeur sur ces décalages. Breakpoint du menu desktop : `md` → **`lg` (1024px)** pour éviter le tassement des liens.
  - ⛔ **Un décalage de navbar ne s'écrit JAMAIS en pixels** (relevé et corrigé le 2026-08-19). Treize `scrollMarginTop: '60px'` traînaient contre un seul composé sur `HAUTEUR_NAVBAR`, plus un en-tête collant à `top: '56px'` dans `/progression`. Or la barre mesure 56 px à la racine 16 mais **77 px à la racine 22** : un saut d'ancre déposait donc sa cible **17 px sous la barre** sur un grand écran, et l'en-tête collant s'y glissait dessous. Tous rattachés à `calc(${HAUTEUR_NAVBAR} + 4px)`, qui rend exactement 60 px à la racine 16 et suit la barre ensuite. Repérage : `grep -rnE "scrollMarginTop: '[0-9]+px'" app` doit ne rien renvoyer.
- ⛔ **Piège du `clamp(…px…)` — il POSE UN PLAFOND au lieu de faire grandir.** Seize déclarations de taille gardaient des bornes en pixels, et c'étaient sans exception les **titres de page**, donc les plus gros caractères du site. Les bornes d'un `clamp` en px sont absolues : elles ne suivent pas la police racine. Mesuré sur `/contact`, le titre restait à **34 px de 1280 px à 2400 px de large** pendant que le corps de texte passait de 13,5 à 18,6 px. Le rapport titre/texte tombait de **2,52 à 1,83** : la hiérarchie s'aplatissait à mesure que l'écran s'agrandissait. Converties en rem, les seize bornes rendent un rapport **constant à 2,07**. Repérage : `grep -rnE "fontSize: *['\"]clamp\([^)]*px" app` doit ne rien renvoyer.
- **Portée** : desktop d'abord ; le mobile est traité ensuite (ci-dessous).

# Échelle typographique et rangs de titre (2026-08-19)

## L'échelle — `app/lib/echelleTypographique.ts`

Le site comptait **112 tailles de texte distinctes**, dont une trentaine se pressaient entre 10 et 14 px, séparées par des **centièmes de pixel** : 12,64 et 12,65 ; 11,50 et 11,52 ; 10,08, 10,17, 10,24, 10,35, 10,40. Aucun œil ne les distingue, et aucune grille ne survit à trente valeurs voisines.

**L'origine est instructive** : deux familles se superposaient, une échelle de base (9, 10, 10,5, 11, 12, 13…) et la même **multipliée par 1,15** (10,35, 11,50, 12,075, 12,65, 13,80, 13,225…), résidu d'une hausse générale passée sur une partie du site. La conversion px → rem est arrivée par-dessus et a **figé le désordre au lieu de le résoudre** : elle a converti fidèlement des valeurs qui n'avaient jamais été réduites à une grille. *Corollaire de méthode : convertir une unité n'est pas poser un système.*

Les 112 valeurs sont rabattues sur **32 rangs**, pas de 0,5 px sous 14 px puis 1 px, puis des sauts plus larges. Le rabattage est **ancré sur les valeurs dominantes** (11,5 · 11 · 12 · 13 ; 13,80 → 14 ; 12,65 → 12,5) et son déplacement maximal est de **0,86 px, soit 3,5 % au pire** : le rendu ne bouge pas, seuls les doublons disparaissent. Même méthode que la passe couleur, et pour la même raison.

`app/lib/echelleTypographique.test.ts` parcourt `app/` et refuse toute taille hors grille, **styles en ligne comme blocs `<style>`**. C'est ce test, et non la bonne volonté, qui empêche la dérive de revenir. Exemptions : les unités **relatives** (`em`, `%`), qui se règlent sur leur contexte, les `clamp(…)` des frontispices, et `EssaiPDF.tsx`.

## Les rangs de titre — `app/lib/hierarchieTitres.ts`

Chaque page composait son `<h1>` pour elle-même. Il n'en résultait pas une variété voulue mais une **absence de rang** : le même titre principal allait de **16,8 px en gras** (volet de l'Histoire, catalogue des péricopes) à **50 px en maigre** (frontispice d'œuvre), en six encres et trois graisses. Sur deux pages, le titre principal était plus petit que le texte courant de la page voisine, et mis en gras : composé comme une étiquette, pas comme un titre.

Quatre rangs, chacun **ancré sur celui qui dominait déjà** :

| Rang | Taille | Graisse | Encre | Ancre |
|---|---|---|---|---|
| **Frontispice** | `clamp(…rem…)` propre à chaque surface | normal | `--cs-encre-fonce` | page de titre d'œuvre, ouverture d'essai, accroche d'accueil |
| **Titre de page** | `TITRE_PAGE` = `1.75rem` | normal | `--cs-encre-fonce` | `.cc-titre` du centre de contrôle |
| **Titre de volet** | `TITRE_VOLET` = `1.15rem` | 500 | `--cs-encre-fonce` | `NavLivres` |
| **Titre de carte** | `TITRE_CARTE` = `1.375rem` | normal | `--cs-encre` | écrans d'exception centrés, formulaires courts |

⚠️ **Pas de `clamp(…vw…)` sur ces rangs, et c'est délibéré.** La police racine est déjà fluide : un `rem` grandit tout seul. Un `clamp` par-dessus ne faisait que poser un plafond (voir le piège ci-dessus). Les **frontispices** gardent le leur, en rem : ce sont des compositions à part, où la taille fait partie du dessin.

⚠️ **Un `<h1>` n'est pas toujours un titre de page.** Plusieurs vivent dans une **carte centrée** (« écran réservé », « écran large requis », choix du pseudonyme) : les hausser au rang de la page serait un contresens. Regarder ce que le titre surmonte avant de lui donner un rang.

### Corollaire : un nombre de LIGNES ne s'écrit pas en dur

⚠️ Dès qu'un bloc a une hauteur en **pixels** et un texte qui suit la **police racine fluide**, le nombre de lignes qui y tient change avec la largeur de l'écran. L'écrire en dur ne peut être juste qu'à une seule taille.

Cas rencontré le 2026-08-17, carte auteur de la bibliothèque (`app/bibliotheque/BibliothequeClient.tsx`) : bandeau `height: 200px`, notice bornée par `-webkit-line-clamp: 3`. Mesuré, la zone laissée à la notice vaut **100 px à 16 px de racine** et **81 px à 22 px** ; trois lignes y occupent 54 px et 74 px. La valeur était donc juste sur grand écran et laissait **46 px de blanc** sur un portable, sous une notice pourtant tronquée : du texte existait, la place aussi, et rien ne les réunissait.

**Variante du même défaut, sans écrêtage : la RANGÉE DE LISTE.** Sur « Acheter des livres » (`app/librairies/page.tsx`), la rangée valait `height: 80px`, sans marge intérieure : le texte s'y logeait tout juste à 16 px de racine, et sur un écran de 1920 la police montait à 19 px dans une boîte restée à 80. Mesurée, la page ne défilait pas et laissait **257 px de vide sous une liste de 400 px** — un quart de la hauteur utile. La rangée est donc passée en `min-height: 6rem` avec `padding: 1.125rem 0`, et le séparateur, la zone de logo et le retrait du chevron avec elle. Deux enseignements : **une hauteur de rangée de CONTENU se mesure en rem**, elle appartient au texte et non au chrome (la charte de conversion ci-dessus ne réserve le px qu'au chrome à hauteur fixe) ; et **un plancher (`min-height`) plutôt qu'une hauteur**, pour que le contenu qui s'enroule puisse pousser au lieu d'être rogné.

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

### L'échelle des seuils (audit de responsiveness, 2026-08-19)

Le JavaScript est irréprochable : les **onze** appels à `useEstMobile` passent tous **900**, sans une exception. Le CSS, lui, employait **onze seuils distincts** — 520, 600, 620, 640, 700, 750, 760, 820, 880, 900, 980 — soit la même dérive que celle des tailles de texte, transposée aux points de rupture. Trois d'entre eux ne se distinguaient de leur voisin que par quelques dizaines de pixels et ont été fondus (600 et 620 → 640 ; 750 → 760). Il en reste **huit**, et chacun a désormais une raison :

| Seuil | Ce qu'il gouverne |
|---|---|
| **520** | une couverture de publication par rang (charte, section Publications) |
| **640** | grilles à une colonne, champs qui passent l'un sous l'autre, variantes de colophon |
| **700** | ce qui DISPARAÎT sur un téléphone : photo de la carte d'auteur, portrait latéral d'une traduction, justification d'une colonne étroite |
| **760** | volets de l'accueil et grilles de principes, à une colonne |
| **820** | la Polyglotte bascule sur « écran large requis » |
| **880** | le quiz (route neutralisée en production) |
| **900** | **le seuil de la charte**, celui du hook `useEstMobile` |
| **980** | tableaux d'administration larges, sommaire de l'œuvre |

⚠️ **Deux de ces seuils ne sont PAS à aligner sur 900, et c'est délibéré.** Le **820** de la Polyglotte décide qui reçoit l'outil et qui reçoit le message « écran large requis » : le hausser à 900 retirerait un outil qui fonctionne aux tablettes de 820 à 900 px. Tidier le code n'est pas une raison de retirer une fonction. Le **880** du quiz vit sur une route neutralisée, dont la version vivante est sur la branche Holy Guessr : on n'y touche pas.

**Règle** : avant d'écrire une média-query, prendre un seuil de ce tableau. En inventer un douzième demande une raison qu'on écrit dans le commentaire.
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

# Page « Publications » — couvertures de petit livre (2026-08-17)

Refonte complète de `app/essais/EssaisListeClient.tsx`. **Remplace** l'ancienne « structure de l'Index » et sa refonte survol/doré, toutes deux supprimées : plus de sommaire en deux colonnes, plus de bloc « à la une », plus de créneau de dix minutes.

Une publication se présente désormais comme un **petit livre**, et la liste comme une table d'étalage.

- **Trois par rang** (`.rayon`, `grid-template-columns: repeat(3, …)`), deux sous 900 px, une sous 520 px. Proportion `aspect-ratio: 2 / 3`, coin arrondi, ombre portée, et une bande sombre au bord gauche qui figure le dos de reliure.
- **La face** porte le nom de l'auteur en capitales, un filet, le titre en grand, le sous-titre dessous, et la **date au pied** (`margin-top: auto`). **Tout est sans empattement.**
- **La quatrième** (`.couverture-dos`) se retourne au survol : le résumé, **seul endroit en empattement**, écrêté à neuf lignes, un bouton « Lire », puis les vues, les ♥ et la mention « parmi les plus lus ». Elle prend le fond de la couverture, si bien que le livre paraît se retourner et non s'ouvrir.
- ⚠️ **Tactile : pas de quatrième.** Sous `@media (hover: none)`, le dos n'est pas rendu du tout et la face reste : rien ne se survole sur un téléphone, et le résumé se lit sur la page de la publication, à un doigt de là. Ne pas « corriger » en affichant les deux, la couverture y perdrait son titre.

## Les ornements se DÉTOURENT, jamais `mix-blend-mode`

Les gravures de `public/ornements/` arrivent sur un fond crème. Pour qu'elles se posent sur le papier du site, ce fond doit devenir un vrai canal alpha.

⛔ **`mix-blend-mode: multiply` ne peut pas marcher ici, et l'erreur se répète.** L'opacité posée sur la même image crée un contexte d'empilement, lequel isole l'élément et annule le mélange : le fond réapparaît partout où l'ornement est atténué, c'est-à-dire précisément là où on l'atténue. La note de `app/chantier/page.tsx` le raconte pour la première fois ; le refus s'applique à toute gravure.

**La recette, faute d'outil.** Ni `sharp` ni ImageMagick ne sont installés (`convert` dans `system32` est le convertisseur de partitions de Windows, pas celui d'ImageMagick). On passe donc par **System.Drawing en PowerShell**, avec un `Add-Type` C# pour la boucle sur les pixels — une boucle PowerShell sur trois millions d'octets est trop lente. Deux étapes, dans cet ordre :

1. **Redimensionner d'abord**, sur des pixels encore opaques (`HighQualityBicubic`), sinon le rééchantillonnage mélange de l'encre avec du transparent et lave le trait. 1024 px de large suffit : la plus grande pose du site est de 20rem.
2. **Puis détourer** : le fond se MESURE (moyenne des quatre coins), il ne se suppose pas blanc — celui-ci est crème. `alpha = (lumFond − lum) / lumFond × 255`, puis **décomposition** de l'encre de ce même crème (`c = (vu − fond × (1−a)) / a`). Sans cette seconde opération, les bords anti-crénelés gardent le crème et paraissent lavés sur un fond plus sombre.

**Contrôle**, avant de committer : l'histogramme du canal alpha. Sur `ordinateur-pentecote.png`, 81 % du plan est réellement transparent, 3 % est de l'encre pleine et 15,7 % des partiels — les hachures. Un fond mal mesuré se voit tout de suite : le taux de transparents s'effondre.

⚠️ **Rendu en `<img>`, pas en `<Image>`, ou alors `unoptimized`.** À certaines largeurs (640 px, mais ni 384 ni 828), l'optimiseur rend un PNG à trois canaux : la couche alpha est aplatie sur du blanc et le fond réapparaît. Le défaut est intermittent, donc facile à croire corrigé.

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
- **Entrée** : intitulé en **serif** à gauche, **référence dorée à droite** (comme la table d'un livre) ; ligne 2 = registre en petit gris + un **chevron doré** (`IconeChevron`, dir=right, `.peri-fleche`) révélé au survol du bloc, glissé d'un cran vers la droite, qui mène à la page de la péricope. Toujours visible au tactile (`@media (hover:none)`). L'intitulé ne disparaît plus au survol.
- **Pas de couleurs de registre** : trop de catégories, le code couleur n'aide pas. Registre en gris uni ; `REGISTRE_COUL`/`coulRegistre` supprimés, pas de pastille dans le filtre. Seul accent conservé : le doré de la référence.
- **Pas de dépli de notice en place** (décision révisée le 2026-08-18) : l'ancien lien « notice » qui dépliait une notice brève sous le bloc a été retiré (état `notices`/`ouvertes`/`basculerNotice` supprimé). La notice complète se lit sur la page de détail, où le chevron conduit ; le survol ne propose plus qu'un affordance de navigation.
- **Recherche élargie aux appellations** (`pericope_noms`, chargées par `chargerCataloguePericopes` dans `item.appellations`) ; mention « trouvé via « … » » quand le match ne vient pas du titre.
- **Index « Aller à un livre »** dans le volet : abréviations `ABREV_FR` en **sans**, alignées en grille de 4 colonnes, **séparées Ancien / Nouveau Testament** (+ Autres). Clic → `scrollIntoView` vers l'ancre `#livre-<code>`. Pas de cadres.
- **Volet gauche** : sur-titre « Catalogue » (plus « Aller plus loin »), chapeau définissant la péricope sous le titre, ligne d'étendue « De la Genèse à l'Apocalypse » (pas de compteur total ; « N péricopes » retiré).
- **Enrichissements** (`rendreTexteEnrichi`) appliqués aux intitulés (et aux notices sur la page détail).
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

**Mode sombre** : le site est en thème **clair** ; les tokens portent trois jeux de valeurs (Clair, Sépia, Cuir), mais seul le Clair est servi tant que le sélecteur de confort de lecture est en pause. Ne pas activer un `@media (prefers-color-scheme: dark)` partiel : le reste du site n'est pas prêt.

## Seconde passe (2026-08-19) — ce que la première avait laissé

Audit d'harmonie, dix constats. Les corrections, dans l'ordre de leur importance.

⛔ **Le bloc `@media (prefers-color-scheme: dark)` du gabarit Next était TOUJOURS LÀ**, malgré la consigne ci-dessus, et il était **actif** : mesuré au navigateur, un poste réglé en thème sombre recevait un `document.body` à `rgb(10, 10, 10)` sous des pages crème. Rien ne paraissait, parce que chaque page peint son fond et chaque texte son encre ; le noir n'attendait qu'une page qui oublie l'un ou l'autre. `--background` et `--foreground` étaient de surcroît **les deux seules variables qu'aucun thème ne redéfinissait**. Le bloc est retiré, et les deux noms **dérivent** désormais de `--cs-fond` / `--cs-texte`.

**Six tokens de plus**, chacun pour un rôle que la palette n'avait pas :
- `--cs-texte-gris` (`#8a8278`) : le barreau qui manquait entre `--cs-texte-doux` et `--cs-texte-second`. Il était écrit en dur **80 fois dans 40 fichiers**, à 46 du token le plus proche. Ce n'était pas un doublon, c'était un rang que le code avait créé tout seul. On nomme, on ne rabat pas.
- `--cs-attente` (`#9a5a2a`) : « à normaliser », « brouillon », « en cours ». Un état de FILE, ni le danger (destructif), ni l'or (apparat), ni l'ocre de lacune (absence d'un témoin).
- `--cs-systeme` (`#5f6b86`) : la famille « Système & doctrine » de la navbar, seule teinte froide du site, jusqu'ici en dur et donc intransposable en Sépia et en Cuir. Les deux autres familles prennent `--cs-vert` et `--cs-or`.
- `--cs-vert-clair`, `--cs-or-clair`, `--cs-systeme-clair` : les variantes des trois familles sur le panneau mobile, qui est vert sombre **en toutes circonstances**. Pas de surcouche de thème : leur fond ne change pas.

**Bascule** : 1 033 couleurs rabattues sur un token, dans 87 fichiers, au seuil ΔE ≤ 30 (indiscernable ou presque). Le résidu est de 273 valeurs pour 440 occurrences, chacune employée moins de huit fois et à plus de 30 de tout token : les rabattre serait un changement de dessin, pas une harmonisation.

⛔ **Deux fichiers sont HORS PÉRIMÈTRE de toute passe de bascule**, et les balayer a déjà fait des dégâts :
- `app/essais/[id]/EssaiPDF.tsx` — feuille `@react-pdf` composée en POINTS. PDFKit ne résout aucune custom property (`_normalizeColor` renvoie `null`, `_setColorCore` sort sans rien appliquer) : onze `var(--cs-…)` faisaient tomber au noir le vert du titre et l'or du fleuron, sans erreur. Et sa base `rem` vaut **18 points**, pas 16 : la composition avait grossi d'un huitième pendant que les marges, en points, ne bougeaient pas. Rétabli en hex et en nombres.
- `app/lib/couverturesEssai.ts` — le contraste de chaque couverture est **testé** (WCAG AA) : un token y rend le calcul impossible. C'est le test qui l'a rattrapé.

⚠️ **Le piège de l'alpha collé.** Le site affaiblissait une teinte en lui concaténant deux chiffres : ``background: `${coul}14` ``. Cela ne vaut que si la teinte est un hex littéral. Dès qu'elle devient un token, la chaîne produit `var(--cs-vert)14`, que le navigateur **jette en silence** : le fond translucide disparaît, le texte garde sa couleur, et la pastille reste lisible sans son fond. Douze occurrences. Passer par **`colorMix(teinte, pourcentage)`** (`app/lib/couleurs.ts`), qui accepte les deux formes. `app/lib/formes.test.ts` refuse tout retour de la forme collée.

**Élévations** : 63 formules d'ombre, dont des paires que rien ne séparait à l'œil (mêmes décalages, 0,16 contre 0,18). Six tokens : `--cs-ombre-posee` (surface au repos), `--cs-ombre-nette` (petit objet qui flotte : bascule, infobulle, cellule d'actions — flou court mais ombre franche, sinon l'objet retombe sur la page), `--cs-ombre-flottante`, `--cs-ombre-modale`, plus `--cs-ombre-posee-haut` et `--cs-ombre-modale-haut` pour les barres et tiroirs du bas, dont l'ombre se porte dans l'autre sens. Restent en dur, volontairement : les `inset`, les ombres latérales des tiroirs, et les deux ombres teintées de marque.

**Rayons** : tous les entiers de 2 à 20 servaient. Quatre valeurs désormais, à pas doublé : **4px** (puce, champ, bouton), **8px** (carte, encart), **12px** (modale, panneau), **999px** (pilule), plus `50%` pour le rond. Contrôlé par `app/lib/formes.test.ts`.

**Fonds de page** : cinq sols coexistaient pour un seul « fond du site » — `var(--cs-fond)`, `#f4f0eb` (Histoire, catalogue des péricopes), `#f6f2e8` (Polyglotte, dont la constante était pourtant annotée « fond commun aux autres pages du site »), `#f3efe2` (Profil), `#e8eceb` (Administration, un gris-bleu franchement hors de la famille chaude, alors que `/admin/controle` employait déjà le token). Tous ramenés à `var(--cs-fond)`.

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
- **Les fac-similés ne sont PLUS dans le dépôt** (2026-08-19). Les 1 488 images pèsent 1,89 Go : Vercel les redéployait à chaque build, et 1 264 d’entre elles n’avaient jamais été versées, si bien qu’**en ligne, tout folio à partir du 57 renvoyait 404** — le fac-similé était amputé de 85 % sans que rien ne le signale. Elles vivent dans le seau Supabase **`manuscrits`**, sous `bible-899/<fichier>.png`, versées **telles quelles** : aucun octet n’a changé, les 1 484 empreintes du manifeste restent donc valables.
  - **Le dossier `public/manuscrits/bible-899` reste le MIROIR DE TRAVAIL local**, ignoré par git (`.gitignore`), là où tournent les scripts d’atelier. Ne pas le reverser dans le dépôt.
  - **Le manifeste garde des chemins RELATIFS** : un document scellé ne doit pas dépendre de l’hôte qui le sert. La base publique est appliquée au seul rendu, par `BASE_PUBLIQUE_FACSIMILES` (`_lib/manifest.ts`), surchargeable par `NEXT_PUBLIC_BIBLE899_IMAGES`. C’est pourquoi le `publicUrl` du manifeste ne l’emporte plus sur cette base dans `resolveFacsimiles`.
  - **Le contrôle des scellés s’est scindé.** À chaque chargement, `loadBible899Edition` vérifie toujours l’empreinte du TEI, les comptages, la concordance des références, et les empreintes des images **présentes localement** — leur absence n’est plus une erreur, puisqu’elles n’ont plus à être dans le dépôt. Le contrôle INTÉGRAL des 1 488 images contre le seau est `npm run bible899:verifier` (≈ 3 min, 1,89 Go), lancé à la demande, chaque dimanche par `.github/workflows/verification-facsimiles.yml`, et d’un clic depuis le centre de contrôle (carte « Fac-similé Bible 899 », qui contrôle présence et taille sur la totalité puis recalcule une vingtaine d’empreintes tirées au sort).
  - ⚠️ **Ne pas convertir les maîtres.** Ce sont des pièces d’archive, et les empreintes du manifeste existent pour attester qu’ils n’ont pas bougé : les réencoder romprait 1 484 scellés d’un coup, et le manifeste régénéré n’attesterait plus que « voici les fichiers que j’ai aujourd’hui ». Le plan Pro comprend 100 Go de stockage, la place n’est pas le sujet.
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
- **Étiquettes des deux traductions** : discrètes, **NON collantes, fond transparent** (petites capitales grises, filet fin). *(Le « bandeau noir » qui les guettait est éteint depuis le 2026-08-19 : `--background` ne portait plus sa propre valeur et virait au noir sur un poste en thème sombre. Il dérive maintenant de `--cs-fond`. Préférer quand même le token de rôle, `--cs-surface` ou `--cs-fond`, à ce nom hérité du gabarit Next.)*
- **Notes — vers cités** (`ContenuNoteStructuree`) : plus d'étiquette « Vers » ; un bloc `form==='verse'` se rend en **police réduite (0.9em) + léger retrait gauche**.
- **Apparat critique** : masqué dans le sommaire en mode comparaison.

# Fenêtres contextuelles — jamais sous la nav, jamais hors de l'écran

Règle d'auteur, fixée le 2026-08-17 : une fenêtre contextuelle garde **toujours** une marge sous la barre de navigation et au-dessus du bas de l'écran. Calcul pur et testé : `app/lib/fenetreContextuelle.ts` (13 tests), `MARGE_FENETRE = 12`.

- **Fenêtres ancrées** (aperçu au survol d'un auteur, infobulle de note) : `placerFenetre` rend `{ top, left, hauteurMax }`. Elle se pose sous l'ancre, **se retourne au-dessus** si le bas manque, et se borne à la bande utile pour défiler en dedans si la place manque des deux côtés. ⛔ Ne jamais replacer un seuil en dur du genre `rect.top > 180` : il ignore le bas de l'écran, et c'est précisément le défaut qui a été corrigé.
- ⚠️ **La barre ne mesure pas 56 px partout.** `HAUTEUR_NAVBAR` vaut `3.5rem` et la police racine est fluide (jusqu'à ×1,375 sur grand écran) : `hauteurNavbarPx()` la MESURE, on ne la suppose pas.
- **Modales centrées** : le calque part de `top: HAUTEUR_NAVBAR` et **ne défile pas** (`overflow: hidden`) ; la boîte porte `maxHeight: 100%` et `overflowY: auto`, si bien que c'est son CONTENU qui défile. ⚠️ Le défaut corrigé venait de l'inverse : un calque en `inset: 0` qui défilait laissait le contenu passer **sous** la barre, laquelle est peinte par-dessus ; et même sous la barre, un calque défilant fait remonter la boîte jusqu'à la couper au ras, sans marge. Un bouton de fermeture dans une boîte défilante doit être `sticky`, sinon il part avec le contenu.
- ⚠️ **Ce correctif existait sur la branche de travail sans avoir été porté** : la production restait en `inset: 0`. Vérifier le SITE, pas seulement le code de la branche courante (voir la mémoire sur le déploiement).

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
- **Posées au RENDU, jamais dans la donnée** (même doctrine que l'espacement, charte §3.2) : `cesurerLatin` s'applique au `texte_original` d'`OeuvreClient` et à la colonne en langue originale de `ComparaisonTraductions`. La fonction est idempotente et ne change pas une lettre : `sansCesures(cesurerLatin(t)) === t`, garanti par test.
- ⚠️ **Une césure ne doit jamais quitter la page.** `preparerTexteCitation` (`app/lib/citation.ts`) appelle `sansCesures` : sans quoi un copier-coller emporterait des caractères invisibles dans le presse-papiers.
- **La regex ne vise que les suites de lettres d'au moins 5 caractères**, ce qui laisse intacts les marqueurs de note `[[81]]`, les nombres et la ponctuation. `rendreTexteAvecNotes` continue donc de reconnaître ses appels.
- **Gain mesuré** (extrait des *Confessions*, sans-serif 0.79rem) : 170 px → 8,7 % de lignes en moins ; 220 px, largeur réelle de la colonne bilingue → 5,9 % ; 300 px → nul. Le gain en lignes sous-estime l'effet : à nombre de lignes égal, les blancs de justification se resserrent. L'espacement du latin a par ailleurs reçu le `wordSpacing: -0.025em` que portait déjà la colonne française.

# Police des textes d'œuvre — sérif toujours, sauf l'original en regard

Règle d'auteur, fixée le 2026-08-17 :

- **un texte d'œuvre se lit TOUJOURS en sérif** (`--font-source-serif`), corps comme titres, en mode segments comme en mode paragraphes, en lecture comme en apparat critique et en traductions parallèles. Le corps était en `--font-source-sans` depuis l'origine : quatre déclarations dans `OeuvreClient` et le gabarit de `ComparaisonTraductions` ;
- **le texte en langue originale (latin, grec) se lit en sérif lui aussi**, quand il paraît SEUL (mode « Latin ») ;
- **SEULE exception : mis EN REGARD du français, l'original passe en sans-serif.** La différence de police sépare les deux colonnes d'un coup d'œil, mieux qu'un filet.

Deux surfaces portent cette exception, et elles doivent rester d'accord :

- **lecture bilingue** : règle CSS `.para-bilingue > .texte-original` dans le bloc `<style>` d'`OeuvreClient`. La classe `.para-bilingue` n'est posée qu'en mode bilingue (`affichageBilingue && original`), jamais en « Latin seul » — c'est ce qui fait basculer la police au bon moment, sans condition en JS ;
- **traductions parallèles** : `ComparaisonTraductions` reçoit la langue de chaque colonne (`AlignementDisponible.referenceLangue` / `alignedLangue`, remplies dans `app/oeuvre/[id]/page.tsx` depuis `oeuvre_textes.langue`) et tranche par `estColonneOriginale` (pur, testé `polices.test.ts`). ⚠️ Le cas est réel, pas théorique : l'alignement `A0010O0002:VIVES:LA-FR:PARAGRAPH` (La Cité de Dieu) confronte un latin et un français, tandis que `ALNSET-A0064O0001-MIR1861-CER1646` (Boèce) confronte deux traductions françaises, qui restent toutes deux en sérif. Le composant écrivait `lang="fr"` en dur : il pose maintenant `lang="la"` sur une colonne en langue originale.
- **Langue inconnue → sérif.** Mieux vaut une colonne en sérif de trop qu'un texte français composé comme un original.

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

# Schéma `public` = surface d’attaque (audit du 2026-08-19)

Tout ce qui vit dans `public` est servi par l’API REST. `anon` n’y a aucun droit (base fermée), mais **le rôle `authenticated` en a beaucoup par défaut** : un simple titulaire de compte interroge PostgREST directement, sans passer par le site.

- ⛔ **Aucune table de travail ni de sauvegarde dans `public`.** 48 tables `backup_*` y dormaient sans RLS, avec SELECT/INSERT/UPDATE/DELETE pour `authenticated` : n’importe quel compte pouvait les vider. Elles sont passées dans `internal`, que ni `anon` ni `authenticated` ne peuvent seulement parcourir (`USAGE` refusé). **Créer les sauvegardes directement dans `internal`.**
- **Une vue de lecture ne porte pas de droit d’écriture.** Les dix vues publiques avaient INSERT/UPDATE/DELETE pour `authenticated`, sans usage. Révoqués.
- **`security_invoker = true` est la règle**, pour que la RLS de l’appelant s’applique. Deux exceptions assumées, écrites dans les migrations : `classement_utilisateurs` (la politique de `profils` est « soi-même » ; en invoker on ne verrait plus le score des AUTRES lecteurs) et `v_bible899_verse_recomposed` (chantier en cours, ses segmentations non publiées disparaîtraient).
- ⚠️ **Le passage en invoker a un COÛT, mesurer avant de basculer.** Les politiques de `segments` et `liens_bibliques` se réévaluent à l’intérieur des agrégats : `versets_plus_cites` est passée de quelques centaines de ms à 2,4 s cache chaud et a dépassé le délai d’attente à froid, la page /statistiques renvoyant une 500. Elle est revenue en DEFINER. Les vues d’agrégat sur `segments` (`oeuvres_controle_stats`, `oeuvres_liens_stats`, `avancement_liens`) coûtent 2,5 s à un lecteur ordinaire contre 1 s au propriétaire ; l’administrateur, lui, court-circuite par `is_admin()`. La bonne réponse pour une vue lourde est la MATÉRIALISATION (modèle `oeuvres_controle_stats_mat`), pas le DEFINER.


# Sauvegardes et vérification (GitHub Actions)

Trois workflows, et une leçon.

- `verification.yml` — à chaque poussée sur `master` : `tsc` et `vitest` BLOQUENT, le linter est informatif tant que ses 414 erreurs héritées n’ont pas été résorbées. Retirer `continue-on-error` le jour où le compte tombe à zéro.
- `backup-supabase.yml` — quotidienne, format `custom`, privilèges CONSERVÉS.
- `sauvegarde-supabase.yml` — hebdomadaire (dimanche), format texte gzippé, `--no-owner --no-privileges`. ⚠️ Sans les GRANT, une base restaurée depuis CE vidage ne rendrait rien à PostgREST : les rôles `anon` et `authenticated` n’auraient plus aucun droit. C’est la raison d’être de la quotidienne.

⚠️ **Piège vécu : la sauvegarde quotidienne a échoué 21 nuits d’affilée, en silence** (du 30 juillet au 19 août 2026). Elle visait `db.<ref>.supabase.co`, qui ne publie **qu’un enregistrement AAAA** ; les exécuteurs GitHub sont en **IPv4 seul**, la connexion ne pouvait pas aboutir. L’hebdomadaire, elle, passait : elle emploie le secret `SUPABASE_DB_URL` (le pooler, joignable en IPv4). Les deux emploient désormais ce secret.

- **Un workflow programmé qui échoue ne prévient personne.** GitHub n’envoie de courriel qu’au propriétaire du workflow, et le silence ressemble au succès. Vérifier de temps en temps : `https://api.github.com/repos/sqdvcontact-lgtm/bible-patristique/actions/runs` rend les conclusions sans authentification, le dépôt étant public.

**Conventions tirées du linter** (414 erreurs au 2026-08-19, 364 après une première passe ; il reste surtout 216 `no-explicit-any` et 81 `set-state-in-effect`).

- **Apostrophe courbe `’` dans tout texte affiché**, jamais l’apostrophe droite : elle accorde le code à la typographie du site et éteint `react/no-unescaped-entities`. Dans le CODE (chaînes, clés), l’apostrophe droite reste la règle.
- **Le souligné en tête marque ce qu’on écarte volontairement** : `_err` qu’on n’inspecte pas, champ déstructuré seulement pour être retiré d’un objet. Déclaré dans `eslint.config.mjs` — sans quoi six faux positifs noyaient les vrais oublis.
- **Un état qui ne fait que recopier une propriété se recale PENDANT le rendu, pas dans un effet.** Motif documenté par React : `const [recu, setRecu] = useState(prop)` puis `if (recu !== prop) { setRecu(prop); setLocal(prop) }`. Dans un effet, React peint l’ancienne valeur avant la nouvelle : la première page de l’ancienne liste de recherche apparaissait un instant, comme la pagination de l’onglet précédent.
- ⚠️ **Tous les signalements ne sont pas des défauts.** Une lecture de `localStorage` dans un effet est correcte, l’effet étant le bon outil pour un système extérieur. Corriger `set-state-in-effect` en série casserait des comportements pour gagner un rendu : chaque cas demande de comprendre l’intention.


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
- **Deux boîtes, parce que deux usages.** `BOITE_AUTEUR` = 600 × 750 : la vignette est haute et étroite, et le plus grand cadre (carte, 120 × 200) veut le double pour rester net en HiDPI sans peser sur une page qui affiche quinze portraits. `BOITE_TRADUCTION` = 1600 × 1200 : le portrait d’un traducteur remplit un **bandeau pleine largeur** (`AllerPlusLoinClient.tsx`, `width: 100%`, 92 px de haut) et une colonne de 8,75rem — là, c’est la LARGEUR qui commande, et 600 rendrait le bandeau flou sur un écran large. JPEG qualité 90 dans les deux cas.
- ⛔ **On ne rogne JAMAIS un portrait au dépôt** (corrigé le 2026-08-19). Il paraît sur trois surfaces dont les cadres n'ont pas les mêmes proportions — carte 0,60, fiche 0,80, aperçu 0,765 — et l'administrateur les cadre lui-même par `photo_position`, avec un zoom jusqu'à 3,5×. Rogner au dépôt jette définitivement ce que ce cadrage pourrait vouloir montrer. La bibliothèque le faisait pourtant, en 300 × 450 : moitié de la définition retenue, et proportion 2:3 que le cadre rognait une seconde fois.
- **Une seule définition de la préparation : `app/lib/preparerPortrait.ts`** (module partagé, géométrie pure et testée). Réduction à l’intérieur de la boîte SANS rognage, proportions conservées, orientation EXIF respectée (une photo verticale arrivait couchée), conversion en JPEG. Une image déjà petite n’est jamais agrandie. Les TROIS écrans qui déposent un portrait l’emploient — bibliothèque, auteurs, traductions — la dernière en passant `BOITE_TRADUCTION`. Ne pas recomposer un redimensionnement ailleurs : c’est ainsi que les trois avaient divergé.
- **La route refuse ce qui n’est pas du JPEG** plutôt que de le ranger sous une extension qui ment, et pose une heure de cache, accordée au `?v=` horaire que composent les pages.
- **Réencodage des anciens dépôts, fait le 2026-08-19.** Le seau `traductions` est passé de **24 Mo à 1,96 Mo** (sept portraits, dont quatre PNG déguisés en `.jpg`, l’un de 5797 × 3551 pour un bandeau de 92 px). Côté auteurs, `A0015` est passé de 3 032 à 95 Ko et `A0011` de 136 à 17 Ko, eux aussi des PNG déguisés. Les originaux sont conservés hors du dépôt dans `C:\Corpus Scriptura\portraits-originaux-20260819`. Tout le seau est désormais du vrai JPEG.
- ⚠️ **Jamais `accept="image/*"` sur le sélecteur de fichier.** Sous Windows, Chrome traduit ce joker en une longue liste de filtres et la boîte de dialogue se met à produire les vignettes du dossier courant : elle se fige quand ce dossier est synchronisé (OneDrive). Les trois entrées d’admin (`SectionBibliotheque`, `SectionAuteurs`, `SectionTraductions`) listent désormais les extensions : `.jpg,.jpeg,.png,.webp,.avif` (2026-08-19).

# Longueur d'une œuvre — `nb_signes` et la section « Opuscules » (2026-08-16)

⚠️ **`nb_signes` compte TOUS les segments d'une version, quelle que soit leur `nature`.** Ne jamais le confondre avec `sum(length(segment_texte)) where nature='texte'`, ni « corriger » la colonne sur cette base : le corps de plusieurs œuvres vit dans d'autres natures. Boèce est un **prosimètre** porté par `dialogue` et `vers` (s'en tenir à `texte` ne compterait que **3 178 signes sur 239 170**), les commentaires de Jérôme portent le lemme biblique en `citation` (Abdias : 24 927 au lieu de 59 534), Ratramne et Eucher de même. Cette confusion a produit un diagnostic erroné de « colonne fausse » avant d'être levée.

- **Deux échelons.** `oeuvre_textes.nb_signes` = la version (une ligne par édition ou traduction). `oeuvres.nb_signes` = **la version par défaut** (`is_default`), **jamais la somme des versions** : additionner le français et le latin de La Cité de Dieu doublerait une œuvre qui se lit une fois.
- **Recalcul** : fonction `recalculer_nb_signes()` (SECURITY DEFINER, `service_role` seul), à rejouer **après un import ou une correction de corpus**. Pas de trigger sur `segments` : les imports écrivent par lots de milliers de lignes. Sans ce rappel, la colonne dérive en silence (deux dérives constatées le 2026-08-16 : le Joël de Jérôme et la préface latine de Migne).
- **Piège** : une œuvre dont **aucune** version n'est marquée `is_default` n'a pas de source de recalcul et reste figée. C'était le cas du « Commentaire sur Joël ».

**Section « Opuscules »** (bibliothèque, `app/lib/opuscules.ts`, module pur testé `opuscules.test.ts`) : sous **40 000 signes**, une œuvre est un texte bref et se replie dans une section rétractée par défaut, sous les œuvres longues de l'auteur.

- **Le seuil vient du corpus, pas d'une idée de la longueur** : aucune œuvre publiée ne compte entre **38 824 et 58 044 signes**. La coupure tombe dans ce vide. Elle ne tombe pas sur la médiane (environ 59 000), qui rangerait **une œuvre sur deux** parmi les opuscules et couperait la série des commentaires de Jérôme sur les petits prophètes, Abdias (59 534) en sortant pendant que Jonas et Joël resteraient.
- **Deux conditions d'apparition** (`partagerOpuscules`) : au moins **trois** opuscules, ET au moins **une** œuvre longue. Sans la seconde, un auteur qui n'a que des textes brefs (Cyprien de Carthage, la Doctrine des Apôtres, Grégoire de Nazianze) verrait son étagère **vide**, repliée tout entière. Au 2026-08-19, elle se déclenche chez **Jean Chrysostome** (11 opuscules pour 11 œuvres longues) et chez **Cyrille de Jérusalem** (3 pour 2), et s'ouvrira d'elle-même chez les autres à mesure que la bibliothèque grossira. **Grégoire de Nazianze** en est proche (2 opuscules), mais il lui manque une œuvre longue.
- **Le classement porte sur le GROUPE DE TITRE, jamais sur la version isolée**, et retient la plus longue de ses versions : « La Cité de Dieu » a une édition latine de Migne dont seule la préface est intégrée (1 411 signes), qui quitterait sinon son titre pour tomber dans les opuscules.
- **Une œuvre non mesurée n'est jamais un opuscule** : on ne replie pas ce qu'on n'a pas mesuré, sous peine de cacher une œuvre entière sur une donnée manquante.
  - ⚠️ **Piège vécu (2026-08-19) : la section n’a jamais paru en ligne.** La page serveur `app/bibliotheque/page.tsx` lisait les œuvres SANS `nb_signes` ; seul le rechargement client demandait la colonne, sur une liste dupliquée qui avait dérivé. Toutes les œuvres arrivaient donc non mesurées, et la règle ci-dessus les gardait toutes en liste. Les deux listes vivent maintenant dans **`app/lib/bibliothequeSelects.ts`** : lire les colonnes de la bibliothèque ailleurs, c’est rouvrir la dérive.
  - Corollaire de méthode : un module pur testé ne prouve rien sur le rendu. Les 9 tests d’`opuscules.test.ts` passaient pendant que la section restait invisible en production. Vérifier la donnée qui entre, pas seulement la fonction qui la traite.
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
