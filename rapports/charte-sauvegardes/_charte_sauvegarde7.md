Charte typographique, éditoriale et structurelle
Projet « Corpus Scriptura » — corpus-scriptura.fr
Mise à jour : 24 juillet 2026

Cette charte est le document de référence unique pour tout traitement d'une œuvre destinée au site. Elle doit être relue avant tout dépôt ; en cas de doute sur un point non couvert, la question doit être posée avant de produire le CSV, jamais tranchée seul.

---

## Carte de lecture — à consulter AVANT d'agir

Cette charte compte plus de 150 000 caractères : on ne la lit pas d'un bout à l'autre, on va à la section qui porte la règle. **Mais un sujet y est souvent réparti sur plusieurs sections éloignées** — c'est le piège, et il a déjà coûté cher : le §25 a longtemps contredit le §9.6, qui s'en trouve à cent mille caractères.

| Ce que vous allez faire | Sections à lire, toutes |
|---|---|
| **Constituer ou corriger des liens bibliques** | **§8** (références dans le texte) · **§9** (les quatre types, et surtout **§9.5** règles communes et **§9.6** méthode) · **§10** (fiabilité → renvoie au §24.3) · **§24** (la table) · **§25** (les passes, l'audit, la typologie) |
| Transcrire une œuvre, corriger de l'OCR | §23 en entier, puis §5 à §7 (segmentation, niveaux, apparat) |
| Poser ou reprendre des notes de bas de page | §22, puis §7 |
| Importer ou aligner une traduction biblique | §15 (édition unique) · §16 (alignement) · §18 (numérotation des psaumes) · §4 |
| Toucher à la typographie | §2 · §3 · la charte d'accentuation (`parametres.charte_accentuation`) |
| Modifier le schéma, les accès, l'admin | §19 (schéma) · §17 (sécurité) · §14 (pièges techniques) · §15 (carte des fichiers) |

**Trois règles qui priment sur tout, où qu'on travaille :**

1. **§25.0** — un lien absent coûte moins cher qu'un lien faux ; chaque fois qu'on a le choix entre manquer et forcer, on manque.
2. **§9.5** — l'alignement de ce site est **sémantique** : le verset se reconnaît à ce qu'il dit, jamais à un numéro imprimé.
3. **§9.6** — partir du segment, jamais d'une liste de références à caser ; marquer `liens_revus_le` même quand rien n'en sort.

**Toute règle chiffrée doit dire sur quoi elle a été mesurée.** Une mesure faite sur une œuvre se généralise toute seule et finit par interdire ce qui marche : c'est arrivé au §25.8, corrigé le 24 juillet 2026. En ajouter une sans son périmètre, c'est préparer la même faute.

---

## 0. Reprise de contexte

Le nom officiel du site est « Corpus Scriptura » (anciennement « Bible & Tradition patristique » / labibledesperes.com — tout résidu des anciens noms dans le code est à corriger). Domaines acquis via OVH (juillet 2026) : **corpus-scriptura.fr (canonique)** et corpus-scriptura.com (redirection permanente 308 vers le .fr, faite par `proxy.ts` d’après la variable `SITE_CANONIQUE`). Plateforme érudite francophone, en version bêta, croisant le texte biblique et le commentaire patristique. Sébastien Quinsac de Valette en est le seul développeur — forte culture théologique patristique, compétences techniques limitées.

**Stack.** Next.js 16 (App Router, Turbopack) / React / TypeScript / Supabase (Postgres + Auth + Storage), déployé sur Vercel. Dépôt GitHub : sqdvcontact-lgtm/bible-patristique. Chemin local : C:\Users\quins\OneDrive\Bureau\bible-patristique.

**Données principales.** Table `versets` (~41 900 lignes, 4 traductions : Sacy, Segond, Crampon, Vulgate + numérotation grecque alternative pour les Psaumes). Table `segments` (texte patristique segmenté, hiérarchie ref_niv1–ref_niv5 + ref_nivX_texte, liens bibliques lien_1–lien_4, nature, fiabilite, reference_manuelle). Tables : oeuvres, auteurs, traductions, profils, prelevements, progression_lecture, commentaires, commentaires_likes, signalements, lectures_versets. Détail en §17.

**Pages principales.** / (Bible : TexteBible.tsx, NavLivres.tsx, PanneauPatristique.tsx) · /oeuvre/[id] (OeuvreClient.tsx et ses modules) · /bibliotheque · /populaires · /admin · /compte · /progression · /soutenir.

---

## 1. Esprit général et orientation

Le site vise une bibliothèque chrétienne librement consultable, structurée autour de la Bible, des Pères de l'Église, des grands textes théologiques et des commentaires. L'ambition n'est pas une base de données froide, mais un lieu de lecture, de transmission et d'intelligence des Écritures.

Les textes doivent être accessibles, propres, bien référencés, et permettre des rapprochements bibliques, patristiques, doctrinaux ou littéraires. Le site doit rester sobre, lisible, exigeant, sans surcharge universitaire inutile : il doit convenir à des lecteurs cultivés, des chercheurs, des croyants et des curieux. Il doit donner l'impression d'un chantier sérieux, ouvert, vivant — ni singer l'université, ni tomber dans la vulgarisation pauvre.

**Principe directeur : rendre les textes disponibles, propres, reliés, habitables.**

---

## 2. Principes éditoriaux et style

Les textes doivent être traités avec respect : jamais modernisés abusivement, lissés ou réécrits. Le travail consiste à rendre lisible, non à réinventer.

Pour les textes anciens, on conserve la langue propre de l'édition utilisée : orthographe ancienne, tournures, ordre des mots, vocabulaire théologique. On corrige seulement les erreurs manifestes (OCR, coquilles, ponctuation défectueuse, espaces, caractères corrompus). En cas de doute, ne pas corriger automatiquement : signaler dans l'audit.

**Style attendu du site.** Clair, tenu, légèrement classique, sans hermétisme. Préférer une langue sobre, dense, qui laisse entendre la profondeur chrétienne des textes sans emphase artificielle. Éviter : les formules niaises, les phrases trop pédagogiques, le jargon technique inutile, le ton institutionnel, le vocabulaire vague (« spiritualité » quand on peut dire : vie chrétienne, transmission, intelligence des Écritures, formation, tradition, prière, doctrine). La phrase doit être claire mais peut garder une certaine ampleur : précision, gravité, lisibilité.

**Règles de prudence absolues.** Ne pas corriger pour embellir. Ne pas moderniser sans demande explicite. Ne pas combler une lacune par intuition. Ne pas déplacer un texte si le découpage n'est pas certain. Ne pas transformer la traduction en paraphrase. Quand deux solutions sont possibles, conserver le texte et signaler. La bonne correction est celle qui répare une erreur sans faire disparaître l'histoire du texte.

---

## 3. Typographie générale

1. Espaces fines insécables ( ) avant : ; ! ? — et après « et avant ».
2. Trois points « ... » → points de suspension « … ».
3. Guillemets français « … » pour les citations de premier niveau ; guillemets anglais "…" pour les citations incluses dans une citation : « … "…" … ». Règle stricte : deux « qui s'ouvrent avant qu'un » ne referme le premier est toujours une erreur.
4. Apostrophe typographique : ' (jamais droite).
5. Tiret d'incise et séparateurs rédactionnels : utiliser exclusivement le trait d'union simple « - », entouré d'espaces quand il sert d'incise. Ne jamais employer de tiret moyen ni de tiret long dans les textes, les libellés du site, les titres, les commentaires éditoriaux ni les CSV. Pour les dates historiques, les périodes utilisent aussi le trait d'union simple : « 354-430 ». Pour toute approximation, écrire simplement « Vers » au début de la borne concernée. 
6. Ajouter les espaces manquantes autour de la ponctuation ; supprimer les doubles espaces.
7. Mots tout-majuscules → capitale initiale seulement si début de phrase, sinon bas de casse.
8. Accentuer les majuscules : Évangile, État, Église, Écriture, etc.
9. « S. Paul », « S. Jean » → « saint Paul », « saint Jean » (minuscule, sauf début de phrase).
10. Numérotations « 1- » → « 1. ».
11. Abréviations bibliques : système français classique — Is (non ISA), Jr (non JER), Ez (non EZK), etc.
12. Les segments et citations en langue étrangère (grec, latin…) apparaissent en italiques dans le rendu. Dans `segment_texte`, la balise `*texte étranger*` (astérisques simples) est la syntaxe à utiliser. Une citation complète (phrase entière en latin ou en grec) entoure l'ensemble de la phrase ; une locution isolée (deux mots minimum) entoure seulement les mots concernés. Cette balise peut être appliquée par passes SQL sur un corpus déjà importé ou via la modale d'édition admin — jamais dans un CSV d'import initial.
13. Une citation biblique repérée en italique dans la source doit être repassée en romain et placée entre guillemets. Toute autre utilisation de l'italique (langue étrangère, emphase de l'auteur) reste en italique.
14. Pas de guillemets droits, pas de caractères corrompus, pas de chaînes `null`.

**Détection des erreurs de guillemets en base :**
`select id, id_oeuvre, segment_numero, segment_texte from segments where segment_texte ~ '«[^»]*«' order by id_oeuvre, segment_numero;`

**Casse des intitulés de niveau (ref_niv*_texte).** Quelle que soit la casse de la source, tout intitulé est converti en capitale initiale + bas de casse. Exemple : « PRIÈRE DE L'ENCENS » → « Prière de l'encens ».

**Enrichissement admin (post-import uniquement).** La modale admin permet d'ajouter **gras**, *italique* et [texte](url) via syntaxe minimale. Ne jamais introduire cette syntaxe dans un CSV d'import initial. Exception : les corrections SQL post-import (ex. ajout d'italiques sur les citations latines d'un corpus déjà chargé) peuvent utiliser la syntaxe `*...*` directement en base.

---

## 4. Traitement des textes bibliques

Pour les traductions bibliques (notamment Sacy) :
- Ne jamais modifier les IDs des versets ni l'ordre des lignes.
- Ne jamais supprimer une ligne ni fusionner deux lignes.
- Travailler uniquement sur la colonne du texte biblique.
- Conserver les formes anciennes : `étoit`, `avoit`, `enfans`, `paroître`, etc.
- Corriger seulement les erreurs d'OCR et coquilles évidentes.
- Rétablir un verset vide seulement si la source ou le contexte rend la correction certaine.
- Corriger les irrégularités de découpage seulement si le verset est manifestement collé au précédent ou au suivant.
- Si le cas peut relever d'une différence de versification, ne pas corriger sans source.
- La queue vide d'un fichier ne doit pas être remplie par conjecture — signaler comme telle.

---

## 5. Segmentation des textes patristiques

Le segment est une unité de sens. La segmentation épouse le style et la logique propres à chaque auteur — elle ne doit jamais dénaturer le texte. Un segment correspond à une unité logique complète : une pensée, une affirmation, un argument, une citation. La longueur est dictée par le texte, non par un nombre de mots imposé — environ le niveau d'une phrase.

Un segment ne coupe jamais une phrase. Il se termine obligatoirement par un signe de ponctuation fort (point, point-virgule, deux-points, point d'exclamation, point d'interrogation, points de suspension). Si un bloc dépasse environ 300 caractères, le redécouper dans le respect de cette règle.

Une citation (scripturaire ou autre) introduite par son contexte forme un segment unique avec son introducteur. Exemple : « L'Apôtre dit (Rm 1, 20) : "Les perfections invisibles de Dieu…" » reste un seul segment.

Les retours à la ligne voulus par l'auteur sont matérialisés par une ligne de séparation : non numérotée (segment_numero vide), nature `separateur`, segment_texte vide.

Les titres de section insérés dans le corps du texte ne forment jamais un segment indépendant : leur contenu est reporté dans ref_niv1_texte, ref_niv2_texte, etc.

**Corrections autorisées sur les segments :** OCR manifeste, ponctuation fautive, espaces, apostrophes, guillemets, mots manifestement altérés.

**Corrections interdites :** formulation ancienne seulement parce qu'elle paraît lourde, tournure théologique inhabituelle, syntaxe propre à la traduction, anomalie dont la correction modifierait le sens.

---

## 6. Hiérarchie des niveaux (ref_niv1 à ref_niv5)

ref_niv1 = le niveau structurel le plus élevé réellement présent dans l'œuvre. Les niveaux inférieurs s'empilent en dessous, sans jamais sauter de niveau ni en créer un par confort.

Test avant import : le nombre de valeurs distinctes en niv1 doit correspondre exactement aux grandes divisions canoniques de l'œuvre — jamais aux titres de sections, prières ou chapitres courts.

| Structure de l'œuvre | niv1 | niv2 / niv3 |
|---|---|---|
| Chapitres seulement | Chapitre I | — |
| Parties + chapitres | Partie I | niv2 : Chapitre I |
| Livres + chapitres + sous-chapitres | Livre I | niv2 : Chapitre I — niv3 : Sous-chapitre |
| Liturgie | Grande partie | niv2 : Prière — niv3 : Prêtre/Diacre/Peuple |
| Glossaire | Explication des mots liturgiques | niv2 : chaque terme |

Le niveau paragraphe (§) est toujours le dernier niveau, en base uniquement — jamais affiché comme titre.

**Deux conventions de numérotation des § — à choisir selon la nature de l'œuvre :**

- **§ séquentiel** (cas général) : les § sont numérotés 1, 2, 3… dans l'ordre des segments à l'intérieur d'un chapitre. Aucun trou dans la séquence. Toute lacune dans la numérotation signale un import incomplet.
- **§ = numéro de verset** (commentaires sélectifs) : pour les œuvres de type *annotationes* ou *notes marginales* où l'auteur commente uniquement certains versets d'un texte biblique, le § porte le numéro du verset commenté. Les lacunes dans la numérotation sont alors normales et attendues — elles correspondent à des versets que l'auteur n'a pas annotés. **Exemple : *Annotationes in Job* d'Augustin — le Chapitre I commence au § 3 parce qu'Augustin n'a laissé aucune note sur Job 1,1 et 1,2.** Un chapitre qui débute à § 3 n'est pas incomplet ; c'est la nature sélective de l'œuvre.

La convention choisie doit être cohérente sur l'ensemble d'une œuvre. L'audit post-import doit distinguer les deux cas avant de signaler des lacunes.

**Correspondances colonnes :**
- ref_niv1 = grande partie, livre, traité, section
- ref_niv2 = chapitre, question, section secondaire
- ref_niv3 = article, sous-chapitre, subdivision
- ref_niv4 / ref_niv5 = niveaux plus fins si nécessaires
- Chaque ref_nivN_texte doit correspondre exactement au niveau ref_nivN.

**Convention ref_niv1 / ref_niv1_texte — règle absolue.**

`ref_niv1` porte le **seul identifiant structurel** du niveau (numéro ou nom court) : `Chapitre VIII`, `Livre I`, `Partie II`. Il ne contient jamais de titre descriptif.

`ref_niv1_texte` porte le **titre descriptif** complémentaire : `Job doit confesser ses fautes. Paroles de Baldad de Sueh.`

Quand la source présente un titre de la forme *Chapitre VIII. — Job doit confesser ses fautes. — Paroles de Baldad de Sueh.*, la règle de split est la suivante :
1. Tout ce qui précède le premier `. — ` va dans `ref_niv1` (point et tiret exclus) : `Chapitre VIII`.
2. Tout ce qui suit va dans `ref_niv1_texte`, après nettoyage : les ` — ` internes sont remplacés par `. ` (ou simplement supprimés si le fragment précédent se terminait déjà par un point) ; l'espace parasite après une apostrophe devant majuscule est supprimé ; un point final est ajouté si absent.

Cette convention s'applique à tous les niveaux : `ref_niv2` / `ref_niv2_texte`, etc. Un champ `_texte` ne doit jamais répéter l'identifiant structurel ni rester vide si un titre descriptif existe dans la source.

---

## 7. Nature et appareil critique

- `texte` — texte d'origine de l'œuvre.
- `apparat_critique` — contenu ajouté par un éditeur ou traducteur : glossaires, notes, préfaces, avertissements, biographies jointes.
- `separateur` — ligne de séparation matérialisant un retour à la ligne voulu par l'auteur (segment_texte vide, segment_numero vide).

Les références bibliques de l'appareil critique sont supprimées sans extraction de lien (voir §9).

---

## 8. Références bibliques dans le texte

> **⚠ AMENDÉ LE 20 JUILLET 2026 — VOIR §25.0.** Les règles ci-dessous restent valables pour le NETTOYAGE du texte, mais elles ne s'appliquent qu'**APRÈS extraction du lien**. Supprimer « (Rm 1, 20) » sans avoir d'abord consigné le lien vers Rm 1, 20 détruit la source la plus sûre dont on dispose — celle que l'auteur ou son éditeur a lui-même écrite. C'est arrivé sur les *Annotations sur Job* d'Augustin : 734 segments sans une seule référence, qu'il a fallu reconstituer par appariement lexical, avec les approximations que cela suppose.

Principe : extraire les liens appartenant au texte d'origine, puis supprimer la référence du corps du texte.

1. Références entre parenthèses : « (Rm 1, 20) » → supprimer entièrement.
2. Références suivant un nom de livre : « l'Ecclésiastique (3, 23) » → « l'Ecclésiastique ».
3. Références insérées dans une phrase : « , on lit dans Jérémie (17, 5) » → « , on lit dans Jérémie ».
4. Références hors parenthèses avec code livre non français : « ISA 11, 2 » → supprimer.
5. Références d'un appareil critique postérieur → supprimées sans extraction de lien.

**Formes anciennes et abrégées (à ne pas manquer).** « S. Matth., ch. 5, v. 2 et suiv. » — variantes : « ch. » / « chap. » / « c. », « v. » / « vers. », « et suiv. » / « et ss. » / « sqq. », chiffres romains pour le chapitre. Supprimer du corps du texte après extraction.

**Termes consacrés (péricopes désignées par leur nom traditionnel) :**
- les Béatitudes → Mt 5, 1-12
- le Décalogue / les dix commandements → Ex 20, 1-17
- le Notre Père / l'Oraison dominicale → Mt 6, 9-13
- le Magnificat / Cantique de Marie → Lc 1, 46-55
- le Nunc dimittis / Cantique de Siméon → Lc 2, 29-32
- le Prologue de saint Jean → Jn 1, 1-18
- le Sermon sur la montagne → Mt 5-7
- la Cène (institution eucharistique) → Mt 26, 26-29
Un terme consacré est toujours de type 3 ou 4, jamais de type 1.

---

## 9. Liens bibliques (types 1 à 4)

Les quatre colonnes ne mesurent pas un degré de ressemblance verbale, mais **quatre rapports différents du Père au texte biblique** : il le cite, il se l'approprie, il l'explique, il s'en souvient. C'est le rapport qu'il faut identifier, pas le taux de mots communs.

### 9.1 — lien_1 : citation exacte

Citations exactes de la Bible ; citations **voulues exactes par l'auteur**.

**Le lien_1 est une reprise LITTÉRALE.** Le Père reproduit le texte biblique, il ne le reformule pas. C'est la définition, et elle ne bouge pas.

⚠️ **Mais les mots ne sont pas nécessairement identiques à ceux des traductions dont nous disposons.** Le Père cite la Vulgate, la Septante, une vieille latine, ou de mémoire ; sa source n'est presque jamais celle que nous affichons. Une même citation littérale peut donc apparaître sous des mots différents des nôtres.

C'est un problème de **vérification**, non de définition. Il ne rend pas le critère plus lâche : il interdit seulement de le contrôler par simple comparaison de chaînes. Un écho de sens, si fort soit-il, n'est pas un lien_1 — c'est un lien_2 ou un lien_4.

**Ce qu'il faut établir : l'auteur reproduit-il, ou reformule-t-il ?** Signes d'une reproduction, même sous d'autres mots :
- les propositions se suivent dans **le même ordre** que dans le verset, sans omission ni ajout ;
- la **structure syntaxique** est conservée — mêmes subordinations, mêmes parallélismes, mêmes reprises ;
- les **termes rares ou marqués** du verset sont là, fût-ce sous un autre équivalent ;
- le passage forme une **unité complète et détachable**, non fondue dans la phrase du Père ;
- la **voix ne rompt pas** : le texte biblique parle en son nom propre.

Signes contraires, qui font basculer en lien_2 : intégration à la syntaxe du Père, changement de personne ou de temps, verset tronqué et recousu, mots du Père mêlés à ceux du verset.

**Repérer l'intention de citer.** Elle se manifeste :
- par **corrélation sémantique** — la proposition dit la même chose que le verset, dans le même ordre, avec la même structure ;
- par les **mots d'annonce** : « il est écrit », « le Seigneur dit », « selon la parole du prophète », « l'Apôtre déclare », « comme dit l'Écriture », et tout verbe de déclaration suivi d'un discours rapporté ;
- par les **références entre parenthèses** et les **notes** de l'édition ;
- par tout indice matériel : guillemets, italiques de l'édition, retrait, changement de voix.

Ces indices se cumulent. Une corrélation sémantique forte **plus** une formule d'annonce vaut quasi-certitude. Une corrélation seule, sans marque d'intention ni signe de reproduction, relève du lien_2 ou du lien_4 — pas du lien_1.

### 9.2 — lien_2 : le texte biblique fondu dans le discours de l'auteur

Paragraphes du texte biblique repris sous forme de **citations déformées**. La déformation ne tient pas seulement à la traduction : **l'auteur a voulu fondre le verset dans son propre texte, dans son propre discours, dans sa propre voix.**

C'est la marque distinctive : le verset n'est plus rapporté, il est absorbé. Il passe à une autre personne grammaticale, à un autre temps, il s'intègre à la syntaxe de la phrase du Père, il se mêle à ses propres mots sans rupture de voix. L'auteur ne dit pas « il est écrit que » — il parle *avec* l'Écriture.

Distinction avec le lien_1 : dans le lien_1, le Père **donne la parole** au texte biblique ; dans le lien_2, il **la prend à son compte**.

### 9.3 — lien_3 : commentaire doctrinal

L'auteur critique, commente un verset biblique, il l'explique précisément.

Condition nécessaire : **l'auteur doit VISER un verset ou un chapitre déterminé**, par l'un de ces trois moyens :
- une **citation directe** du passage commenté ;
- une **citation paraphrastique** ;
- une **nomination précise** — il parle des Béatitudes, du récit de la création, du buisson ardent, de la parabole du semeur.

Un développement doctrinal qui ne vise aucun passage identifiable n'est pas un lien_3 : c'est de la théologie, pas de l'exégèse.

⚠️ **Commentaire d'un chapitre entier : créer AUSSI un lien_3 sur l'ensemble du chapitre commenté**, en plus des liens versets par versets. Sans quoi le travail exégétique d'ensemble reste invisible.

### 9.4 — lien_4 : écho thématique

Cette catégorie regroupe les liens entre un segment patristique et un passage biblique lorsque le Père **n'en propose ni citation ni exégèse explicite**, mais en reprend un élément identifiable : **épisode, transformation d'un épisode, image, motif ou sujet**.

Ces rapprochements doivent rester **défendables par un motif précis présent dans les deux textes**. On doit pouvoir nommer ce qui est commun — pas seulement ressentir une parenté.

**Ne pas multiplier les liens de manière artificielle.** On retiendra d'abord les correspondances les plus évidentes et les plus pertinentes, tout en pouvant proposer des rapprochements plus rares ou audacieux **lorsqu'ils présentent un réel intérêt heuristique**. Un bon lien_4 surprend et éclaire à la fois : il trace les lignes de force théologiques de l'œuvre en reliant l'image du commentateur au lieu scripturaire qui la fonde ou la prolonge, y compris d'un psaume à l'autre.

Exemples posés sur les *Discours sur les Psaumes* : totus Christus → 1 Co 12, 27 et Ac 9, 4 ; les deux cités → Ga 4, 26 et Ap 17, 15 ; la muraille des péchés → Ep 2, 14, le mur de séparation abattu ; le pressoir des martyrs → Jn 12, 25 ; le calice des martyrs → Mt 20, 22 ; l'ivresse sainte → Ac 2, 4 ; le vase d'argile brisé → le trésor dans des vases de terre, 2 Co 4, 7.

**En cas d'incertitude, créer le lien avec une fiabilité faible** afin qu'il soit soumis à validation manuelle. Mieux vaut un lien signalé comme douteux qu'un lien tu ou qu'un lien affirmé à tort.

Méthode : curation sur les segments doctrinalement les plus denses, jamais extraction mécanique.

### 9.5 — Règles communes aux quatre colonnes

**Les liens ne sont plus des colonnes, mais la table `liens_bibliques`** (une ligne par lien ; les colonnes `lien_1` … `lien_4` et les identifiants `BXXXXXX` appartiennent au modèle supprimé le 20 juillet 2026). Le `type` — 1 à 4 — porte la catégorie de §9.1 à §9.4.

**Trois natures de cible, une seule par lien :**
- `canon_id` — un créneau de l'ossature (« SIR.16.28 ») : le cas normal, partagé par toutes les éditions ;
- `verset_v2_id` — un **surnuméraire**, verset qu'une seule édition porte et qui n'a donc pas de désignation commune. On vise la ligne de l'édition qui l'atteste. Un Père citant la Septante peut parfaitement viser un tel verset ;
- `livre` + `chapitre` — un **chapitre entier**, pour le commentaire d'ensemble exigé par §9.3.

**Toujours vérifier la cible en base — ne jamais l'inventer.** La clé étrangère refuse un créneau qui n'existe pas, mais elle ne dit rien de la justesse du rapprochement.

⚠️ **La cible se dit TOUJOURS en numérotation canonique, jamais en numérotation d'édition.** Les éditions divergent : le créneau `PSA.10.1` s'imprime « 10, 1 » chez Sacy et « 11, 1 » chez Crampon. Un lien noté d'après le numéro imprimé dans l'édition consultée désigne donc un AUTRE verset — et rien ne le signale, puisque le numéro existe des deux côtés. **Les numérotations d'édition sont strictement ignorées** — on ne les convertit pas, on ne s'en sert pas comme indice. Une référence trouvée dans une note d'éditeur ou entre parenthèses ne vaut pas identification : elle indique où regarder, rien de plus. **L'alignement de ce site est sémantique** : le verset se reconnaît à ce qu'il dit, et le créneau canonique se lit ensuite dans `versets_lecture`. Raisonner à partir d'un numéro imprimé, c'est reporter dans les liens les décalages qu'on a passé des mois à corriger. Un déclencheur refuse les cibles « chapitre entier » absentes de l'ossature.

**Vérification sémantique systématique.** On se fonde sur **toutes les éditions** ; le référent (Crampon, `est_referent`) suffit seulement quand la correspondance est immédiatement claire. Un score de recouvrement lexical ne conclut rien à lui seul (cf. §9.1).

**`fiabilite` est propre à CHAQUE LIEN**, non plus au segment : un segment peut porter un lien sûr et un lien douteux. Valeurs : `à constituer`, `douteux`, `probable`, `vérifié`. Conformément à §9.4, l'incertitude se déclare ici plutôt que de taire le lien.

**`motif` doit être renseigné** : §9.4 exige de pouvoir *nommer* ce qui est commun aux deux textes, pas seulement de ressentir une parenté. Un lien sans motif énonçable n'est pas défendable.

**LES TYPES NE S'EXCLUENT PAS** (arbitrage du 20 juillet 2026, qui annule la règle d'unicité antérieure). Un Père cite un verset puis l'explique : le segment porte alors un lien_1 **et** un lien_3 sur ce même verset. C'est le cas le plus fréquent chez Augustin, et l'ancienne règle — « choisir le rapport le plus fort » — le rendait inexprimable, au prix de rendre invisible le travail exégétique. Seul reste interdit **le même rapport répété** sur le même verset (unicité sur segment + verset + type).

**Autant de liens que de correspondances effectives.** Un passage cité couvrant trois versets reçoit **trois liens**, un par verset — sans quoi le passage ne serait atteignable que depuis l'un d'eux.

**Cas à arbitrer (lien_1 *et* lien_2 sur un même verset).** Rare, admis : cela revient à dire « il cite, ou bien il s'approprie — je ne tranche pas ». Le couple est alors marqué `arbitrage_requis` **automatiquement** par la base, et remonte dans la page de vérification pour décision éditoriale. Ne jamais poser ce couple en silence, et ne pas en faire une échappatoire au jugement.

### 9.6 — Méthode de constitution

**Partir du segment, jamais d'une liste de références à caser.** On lit ce que le Père fait de l'Écriture, puis on qualifie le rapport.

**Les notes de l'édition orientent, elles ne concluent pas.** Une référence en note, entre parenthèses ou en index dit *où regarder* — c'est un gain de temps réel, à utiliser. Elle ne vaut jamais identification : on va lire le passage et on tranche sur ce qu'il dit. Les numérotations d'édition qu'elle emploie sont ignorées (cf. supra).

**Marquer le passage.** Une fois un segment examiné, renseigner `segments.liens_revus_le` et `liens_revus_par` — même si aucun lien n'en sort. Sans cette trace, un segment sans lien reste indistinct d'un segment jamais lu, et l'avancement devient impossible à mesurer. La vue `avancement_liens` donne l'état par œuvre.

**Déclarer ce qu'on ne résout pas.** Citation manifeste mais non identifiée : créer un lien `fiabilite = 'à constituer'` sans cible, avec un `motif` décrivant ce qui a été repéré. Un manque déclaré est réparable ; un manque invisible ne l'est pas.

**Passe d'oubli, après la passe de lecture.** La lecture vérifie que les liens créés sont justes ; elle ne dit rien de ceux qu'on a manqués. Repasser sur les segments **sans aucun lien** portant des marqueurs de citation — « il est écrit », « le prophète dit », « l'Apôtre », « comme dit l'Écriture », guillemets, italiques de l'édition. Mécanique, peu coûteux, et rattrape ce que la lecture laisse passer.

**Pièges de résolution connus.**
- **Daniel 13-14** (Suzanne, Bel et le Dragon) sont les livres `SUS` et `BEL` dans l'ossature, pas `DAN` ch. 13-14. « Daniel 14, 38 » se résout en `BEL 1, 38`.
- **Psaumes** : ne jamais partir du numéro imprimé dans une édition (cf. supra).
- **Segond et les deutérocanoniques** : sa case vide traduit un refus canonique, jamais une lacune. Ce n'est en aucun cas un motif pour écarter un lien vers ces livres, que Sacy et Crampon couvrent.
- **Écrits non canoniques** (Hénoch, Jubilés, 3-4 Esdras…) : absents de `versets_v2` depuis le 20 juillet 2026. Les citations qui les visent reçoivent `à constituer` tant qu'ils ne sont pas réimportés.

**Commentaire suivi — la règle porte sur LE VERSET, pas sur le livre.** Quand un Père commente un verset sur plusieurs segments d'affilée, **chacun de ces segments porte l'identifiant de ce verset**. Augustin commente Gn 2, 4 sur dix segments : les dix portent `GEN.2.4`. La raison est le sens de lecture — le lecteur clique le verset et doit atteindre l'explication *dans son ensemble*, non son seul premier paragraphe.

⚠️ **Ne pas étendre au livre ni au chapitre.** Ce n'est pas parce qu'un Père commente la Genèse que chaque segment de l'ouvrage recevra tous les versets de la Genèse. La cible « chapitre entier » reste réservée au commentaire portant explicitement sur l'ensemble d'un chapitre (§9.3), et demeure rare.

Corollaire d'affichage : les segments partageant un même verset se présentent comme **un commentaire continu**, dans l'ordre des segments, et non comme une liste de résultats séparés.

**Verset absent de nos trois éditions** (cas septantiste notamment) : créer le lien `à constituer` avec le motif, pour reprise dans une passe ultérieure.

---

## 10. Fiabilité

> **⚠ SECTION PÉRIMÉE, RÉÉCRITE LE 24 JUILLET 2026.** Elle donnait quatre valeurs dont **deux n'existent plus** (`à_vérifier`, `Lien à constituer`) et **omettait `douteux`**. Une section qui énonce un vocabulaire mort égare plus qu'elle n'aide : celle-ci ne fait plus que renvoyer.

**Le vocabulaire de la fiabilité est fixé au §24.3, et nulle part ailleurs** — quatre valeurs, pour tout le corpus, en base comme à l'écrit :

| valeur | sens |
|---|---|
| `à constituer` | une source est manifestement visée, elle n'est pas résolue. Le lien n'a **aucune cible**, et son `motif` est obligatoire (§24.2). |
| `douteux` | le rapprochement est proposé, mais on en doute. Se déclare plutôt que de taire le lien (§9.4). |
| `probable` | piste solide — appariement automatique, ou référence donnée par l'édition — **que personne n'a lue**. Porte alors `arbitrage_requis = true` (§25.1). |
| `vérifié` | le passage a été **lu**, et le verset visé confronté dans nos éditions. Interdit à toute passe mécanique (§25.0). |

Ne jamais écrire `null`. La fiabilité se porte **au lien**, jamais au segment : `segments.fiabilite` est vidée depuis le 20 juillet 2026.

---

## 11. Format CSV segments

Colonnes dans l'ordre : `id` (vide) · `id_oeuvre` · `segment_numero` · `segment_texte` · `ref_niv1` · `ref_niv2` · `ref_niv3` · `ref_niv4` · `ref_niv5` · `ref_niv1_texte` · `ref_niv2_texte` · `ref_niv3_texte` · `ref_niv4_texte` · `ref_niv5_texte` · `lien_1` · `lien_2` · `lien_3` · `lien_4` · `fiabilite` · `nature`

Toujours inclure l'`id` vide et les colonnes ref_niv4/ref_niv5 (même vides), sinon l'import échoue avec « Ligne sans id ignorée ».

**Colonnes supplémentaires autorisées selon les corpus.** Hors format standard ci-dessus, certaines œuvres nécessitent des colonnes additionnelles ajoutées ponctuellement par migration (`ALTER TABLE segments ADD COLUMN ...`) : `texte_original` (langue source alignée, ex. grec — voir §22 pour la méthode d’alignement), `texte_latin`, `refs_bibliques_latin`, `id_versets_latin`, `id_versets_latin_correspondant_au_français`, `notes` (voir §22). Ces colonnes ne sont importées dans `segments` que si la migration correspondante a été appliquée au préalable ; elles peuvent aussi servir de colonnes de travail pour des développements ultérieurs du site.

---

## 12. Audits et méthode de travail par passes

Chaque passe importante doit produire : un CSV corrigé, un audit des modifications (ligne modifiée, champ, ancienne valeur, nouvelle valeur, raison), et un fichier d'alertes pour les cas non corrigés volontairement (versets vides, découpage douteux, guillemets déséquilibrés sur plusieurs segments, référence impossible à résoudre, OCR probable mais non certain, variante d'édition ou de versification possible).

**Ordre recommandé des passes :**
1. Diagnostic initial — colonnes, nombre de lignes, IDs, doublons, vides, structure.
2. Nettoyage typo sûr — apostrophes, espaces, ponctuation, caractères corrompus.
3. OCR évident — corrections certaines seulement.
4. Versets ou segments vides — rétablissement uniquement depuis source sûre.
5. Découpages sûrs — séparation ou redistribution seulement si l'erreur est certaine.
6. lien_1 — citations directes.
7. lien_2 — parallèles proches.
8. lien_3 — rapprochements doctrinaux.
9. lien_4 — échos thématiques, avec retenue.
10. Vérification générale — IDs, colonnes, valeurs interdites, doublons, liens inconnus, cohérence hiérarchique.
10 bis. Relecture des liens — comparer les id_verset attachés en lien_1/lien_2 au texte réel des versets correspondants (toutes traductions disponibles), avec attention particulière aux segments portant plusieurs id_verset sur une même colonne.

---

## 13. Images des auteurs

Format : JPEG, qualité 85. Dimensions : 300 × 375 px (portrait 4:5). Nommage : par id_auteur (ex. A0010.jpg). Emplacement : bucket Supabase Storage « auteurs » (public, cache-busté quotidiennement).

---

## 14. Pièges techniques connus

- **Plafond Supabase à 1000 lignes.** Toute requête `.select()` sur une table volumineuse est tronquée à 1000 lignes. Paginer en boucle par blocs de 1000 avec `.range()`.
- **Cookie admin HttpOnly.** `bp_admin_session` est invisible pour `document.cookie` côté client. Toute détection du statut admin doit se faire côté serveur (`next/headers → cookies()`) et être transmise en prop, jamais lue depuis un composant client.
- **Casse des noms de fichiers sous Windows.** Next.js/Turbopack tient compte de la casse dans la résolution des imports. Un fichier mal nommé provoque « Module not found » même s'il est présent.
- **id_verset dupliqué dans lectures_versets.** Si les valeurs d'id_verset sont régénérées ou modifiées, répercuter le même changement dans `lectures_versets`.

---

## 15. Carte des fichiers du projet

| Emplacement | Rôle |
|---|---|
| app/page.tsx | Page Bible — lecture biblique (route /) |
| app/components/Navbar.tsx | Barre de navigation principale |
| app/components/TexteBible.tsx | Affichage des versets, copie, traduction, numérotation grecque |
| app/components/NavLivres.tsx | Volet gauche page Bible |
| app/components/PanneauPatristique.tsx | Volet droit page Bible : citations patristiques, commentaires |
| app/oeuvre/[id]/page.tsx | Chargement serveur d'une œuvre |
| app/oeuvre/[id]/OeuvreClient.tsx | Composant principal de lecture patristique |
| app/oeuvre/[id]/ModaleEditionAdmin.tsx | Modale d'édition admin des segments et titres |
| app/oeuvre/[id]/AssocierVerset.tsx | Association segment ↔ verset |
| app/oeuvre/[id]/OngletCommentaires.tsx | Commentaires de segment |
| app/lib/verifAdmin.ts | Vérification admin par cookie (espace /admin) |
| app/lib/verifAdminUtilisateur.ts | Vérification admin par compte Supabase (pages publiques) |
| app/lib/classement.ts | Calcul du rang des contributeurs |
| app/bibliotheque/page.tsx, BibliothequeClient.tsx | Page Bibliothèque |
| app/admin/page.tsx, AdminClient.tsx, adminTypes.ts | Authentification admin, orchestration des onglets |
| app/admin/SectionBibliotheque.tsx | Gestion auteurs et œuvres |
| app/admin/SectionVerifications.tsx | Liens à vérifier + segments « Lien à constituer » |
| app/admin/SectionCharte.tsx | Cet onglet |
| app/api/admin/charte/route.ts | API lecture/écriture de la charte (table parametres, clé charte_ia) |
| app/api/admin/segment-titre/route.ts | Modification/suppression des titres de niveaux |
| app/api/admin/{segment-modifier, segment-supprimer, segment-associer-verset}/route.ts | Routes admin pour l'écriture sécurisée des segments |
| app/api/admin/{auteur-creer, auteur-photo, update-auteur, update-oeuvre}/route.ts | Routes admin pour auteurs et œuvres |
| app/api/admin/verset-modifier/route.ts | Modifier le texte d'un verset biblique |
| app/api/admin/commentaire-supprimer/route.ts | Supprimer un commentaire |
| app/compte/page.tsx | Connexion, inscription, gestion du compte |
| app/progression/page.tsx, ProgressionClient.tsx | Suivi de lecture biblique |

---

## 16. Comptes, classement et commentaires

**Classement.** Catéchumène (0–14), Disciple (15–49), Docteur (50+). Score = 1 pt par commentaire + 2 pts bonus par commentaire validé + 1 pt par « j'aime » reçu. Calculé par `classement.ts` et la vue `classement_utilisateurs`. Ne jamais ajouter `security_invoker` à cette vue — cela romprait l'affichage public du rang.

**Commentaires.** Deux instances séparées (verset dans PanneauPatristique.tsx, segment dans OngletCommentaires.tsx), même table `commentaires`. Toute évolution de l'un doit être répercutée dans l'autre. Fil de réponses : un seul niveau (reponse_a → id du commentaire principal). L'ancienne convention textuelle « [réponse à X] » est abandonnée.

**J'aime / je n'aime pas.** Un seul vote par personne et par commentaire (valeur 1 ou -1). Présenter le vote négatif avant le positif. Icônes SVG — jamais de caractères Unicode ▲▼ ni d'emoji.

**Commentaires non contrôlés.** Visibles par tous, repliés derrière « Commentaire non contrôlé · Afficher » jusqu'au clic. Ne jamais filtrer côté requête par statut `valide`.

**Mise en forme.** **gras**, *italique*, lien vers un verset, lien vers un segment patristique. Pas plus de 5 lettres capitales consécutives.

---

## 17. Sécurité — deux systèmes admin, à ne jamais confondre

**Système 1 — cookie (page /admin).** `verifAdmin.ts` vérifie `bp_admin_session` (HttpOnly, invisible côté client). Protège uniquement /admin et ses routes.

**Système 2 — compte + profils.est_admin (pages publiques).** `verifAdminUtilisateur.ts` vérifie via le jeton Supabase Auth (en-tête `Authorization`). Utilisé pour les actions admin depuis les pages publiques.

**Règle absolue.** Toute nouvelle action d'écriture réservée à l'admin passe par une route dans `app/api/admin/`, qui vérifie l'un de ces deux systèmes avant d'utiliser la clé de service. Jamais les deux mélangés dans la même route. Jamais une vérification seulement côté client.

---

## 18. Numérotation des Psaumes — hébraïque et grecque

La numérotation de référence du site est la numérotation hébraïque. La numérotation grecque/Vulgate est exposée en colonnes alternatives : `chapitre_alternatif` et `verset_alternatif`.

**Piège.** Un Père écrivant en latin cite un Psaume selon la numérotation Vulgate. Toute citation de Psaume par un Père latin doit être convertie via la correspondance `ref_lxx` avant de chercher l'`id_verset` — jamais utilisée telle quelle. Exemple : « Psaume 138 » chez Augustin (Vulgate) = Psaume 139 hébraïque.

**Résolution en base (règle absolue, corrigée juillet 2026).** Pour toute référence de Psaume issue d'une source à numérotation Vulgate, la requête de résolution interroge `ref_lxx` EN PRIORITÉ, le couple livre/chapitre/verset ne servant que de secours : `coalesce(id via ref_lxx, id via livre/chapitre/verset)`. L'ordre inverse a produit ~300 liens décalés sur les Discours sur les Psaumes, car le couple direct « réussit » silencieusement sur le mauvais psaume. S'y ajoute un décalage de verset : les psaumes à titre long comptent le titre comme v. 1 (parfois v. 1-2) dans la numérotation clémentine ; même après conversion du chapitre, un verset cité peut pointer un cran trop loin. Contrôle obligatoire : comparer le texte cité entre guillemets au texte réel du verset candidat et de ses voisins (±1, ±2), corriger au cas par cas sur preuve textuelle uniquement.

---

## 19. Schéma Supabase

| Table / vue / fonction | Colonnes clés et rôle |
|---|---|
| versets | id_verset (BXXXXXX), ref, livre, chapitre, verset, TR0001–TR0004, ref_lxx, chapitre_alternatif, verset_alternatif. RLS : lecture publique, écriture service-role. |
| segments | id, id_oeuvre, segment_numero, segment_texte, ref_niv1–5, ref_niv1_texte–5_texte, lien_1–4, fiabilite, nature, reference_manuelle. RLS : lecture publique, écriture service-role. |
| oeuvres | id_oeuvre, id_auteur, titre, sous_titre, titre_original, langue_originale, langue_trad, date_approx, genre, trad_auteur, editeur, collection, ville, date_publication, niveaux_sommaire, niveaux_corps (1 = ref_niv1 seul ; 2 = ref_niv1+niv2 ; etc.), profondeur_sommaire (1 par défaut), texte_sommaire ('0,0,0,0,0'), texte_corps ('0,0,0,0,0'), afficher_numeros (true), genres ([]). **C'est cette table — pas catalogue_notices — qui détermine si une œuvre est accessible et visible sur le site.** |
| auteurs | id_auteur (AXXXX), nom, dates, siecle, tradition, note, aire_geographique, langue_principale. |
| profils | id (= auth.users.id), pseudo, nom, prenom, traduction_defaut, created_at, est_admin (bool, défaut false). RLS : limité à son propre id. |
| commentaires | id, texte, valide, created_at, id_segment, id_verset, user_id, auteur_nom, auteur_mail, reponse_a. RLS : lecture publique, insertion par son propre user_id. |
| commentaires_likes | id, id_commentaire, user_id, valeur (1 ou -1), created_at. Unique (id_commentaire, user_id). |
| prelevements | id, user_id, type (biblique/patristique), champs spécifiques, texte. RLS : limité à son propre user_id. |
| progression_lecture | user_id, livre_code. RLS : limité à son propre user_id. |
| signalements | id, id_segment, message, traite. RLS : insertion ouverte à tous, lecture service-role. |
| lectures_versets | id_verset (FK versets), nb_lectures. |
| classement_utilisateurs (vue) | user_id, pseudo, nb_commentaires, nb_valides, nb_likes_recus, score. Ne jamais y ajouter security_invoker. |
| versets_plus_lus (vue) | Jointure lectures_versets + versets, triée par nb_lectures décroissant. |
| incrementer_lecture (fonction) | RPC SECURITY DEFINER : incrémente nb_lectures pour un id_verset. |
| parametres | cle, valeur, mis_a_jour. Stocke les réglages du site (dont charte_ia). |

---

## 20. Notices biographiques

Les notices doivent être brèves, denses, non scolaires. Pour un Père ou un auteur : situer rapidement, indiquer l'importance, préciser le lien avec l'Écriture ou la tradition, éviter la fiche Wikipédia, garder une phrase élégante et utile.

---

## 21. Leçons apprises — chantier *De Genesi ad Litteram* (juin-juillet 2026)

Cette section consigne les pièges concrets rencontrés sur ce dépôt, pour éviter de les reproduire sur les œuvres suivantes.

**Bug de nettoyage typographique (espaces insécables).** Le script de remplacement « espace ordinaire → espace insécable avant ; : ! ? » et autour de « » ne doit pas se limiter au cas où *aucune* espace n'est présente avant la ponctuation : la source OCR contient presque toujours déjà une espace ordinaire à cet endroit. La regex doit explicitement cibler `" ([;:!?])"` → `"\u202f\1"` (et `"« "` → `"«\u202f"`, `" »"` → `"\u202f»"`), pas seulement le cas `"mot;"` sans espace du tout. Vérifier après coup par échantillonnage qu'aucune espace ordinaire ne subsiste avant ces signes.

**Coupure de phrase en plein milieu d'une référence biblique chiffrée.** Un découpeur de phrases naïf (split sur tout point) tranche à l'intérieur des références abrégées du type « (1. Corinthiens, 10, 11) », « (Genèse, 2. 24) », ou à l'intérieur d'une référence multiple séparée par point-virgule « (Malachie, 4, 5 ; Apocalypse, 11, 3-7) ». **Détecteur fiable** : chercher les segments dont le nombre de « ( » dépasse le nombre de « ) » — un segment avec une parenthèse non refermée signale presque toujours une coupure erronée à fusionner avec le(s) segment(s) suivant(s). À vérifier systématiquement après toute segmentation automatique, avant la passe liens.

**Tableau de chiffres romains insuffisant.** Pour des œuvres à chapitres nombreux (au-delà de 38), étendre la table de conversion arabe→romain en conséquence (vérifié nécessaire jusqu'à XLII sur ce dépôt).

**Sur-attachement lors de la résolution d'une plage de versets citée.** Quand la source cite une plage (« Romains, 11, 33-36 », « Daniel, 6, 22 ; 14, 38 ; 9, 4-19 »), ne jamais attacher en lien_1 tous les `id_verset` de la plage sans vérifier que chacun correspond réellement à une portion du texte cité dans le segment. Si seul le dernier verset de la plage est littéralement repris, les versets intermédiaires non cités doivent être omis (ou, à la rigueur, descendus en lien_2/lien_3), jamais laissés en lien_1 par confort d'extraction. Vérification : comparer chaque `id_verset` candidat au texte réel du segment, pas seulement au numéro de référence.

**Versification instable au-delà des Psaumes.** Le piège décrit au §18 pour les Psaumes (numérotation Vulgate vs hébraïque, via `ref_lxx`) se retrouve, sans mécanisme de conversion automatique équivalent dans le schéma actuel, pour les livres deutérocanoniques : Sagesse, Ecclésiastique (Sirach), Machabées. Les éditions anciennes (Vulgate, Septante, critique moderne) ne découpent pas toujours ces livres aux mêmes chapitres/versets. **Conséquence pratique** : ne jamais faire confiance au seul couple chapitre/verset donné par la source patristique pour ces livres ; toujours vérifier le texte réel du verset candidat (et de ses voisins immédiats, ±1 à ±3 versets) avant de valider un lien_1/lien_2 sur ces livres.

**Confusion Ecclésiaste / Ecclésiastique.** Dans les traductions patristiques françaises anciennes, « l'Ecclésiaste » désigne parfois par erreur (ou par usage ancien) le livre de l'Ecclésiastique (Sirach), notamment quand le numéro de chapitre cité dépasse 12 (l'Ecclésiaste/Qohélet n'a que 12 chapitres). Vérifier la plage de chapitres avant de résoudre.

**Daniel grec (Bel et le Dragon).** Les chapitres 13-14 de Daniel en numérotation Vulgate (Suzanne, Bel et le Dragon) sont stockés dans la table `versets` comme livres distincts (`SUS`, `BEL`), pas comme `DAN` chapitre 13/14. Une citation « Daniel, 14, 38 » doit être résolue en `BEL 1, 38`.

**Couverture inégale des traductions deutérocanoniques.** **(Corrigé le 20 juillet 2026 — l'énoncé précédent est devenu faux.)** Sacy (`TR0001`) couvre désormais les deutérocanoniques : Ecclésiastique 1 653 v., Sagesse 442 v., Tobie 298 v., 1 Maccabées 929 v. Crampon (`TR0003`) les couvre également. Seule la Segond (`TR0002`) ne les reçoit pas — non par lacune, mais parce que la Bible protestante ne les compte pas parmi les livres canoniques : sa case vide est une information, pas un manque à combler.

**Méthode de relecture des liens (substance plutôt que littéralité).** Pour juger si une citation patristique correspond à un verset donné, ne jamais exiger une concordance mot à mot avec une seule traduction de référence : le Père cite (souvent en latin, via la Vulgate) un texte que le traducteur français du XIXe siècle a lui-même rendu indépendamment des traductions modernes de la table `versets`. Comparer la substance sémantique à **plusieurs** traductions disponibles (TR0001, TR0002, TR0003) avant de conclure à une erreur. Un score de recouvrement lexical nul sur une seule traduction n'est pas un signal d'erreur en soi ; un score nul sur les trois, conjugué à un sujet manifestement disjoint, l'est. La question à trancher est : *l'auteur a-t-il l'intention de citer précisément ce verset* (littéralement, en paraphrase, ou comme appui doctrinal), et non *les mots correspondent-ils exactement*.

**Quand un lien erroné ne peut être corrigé faute de source.** Si la référence parenthétique d'origine a déjà été supprimée du corps du texte (§8) avant qu'une erreur de résolution ne soit détectée, il n'existe parfois plus aucune base textuelle pour identifier la bonne référence. Dans ce cas, retirer purement et simplement le lien erroné plutôt que de le remplacer par une conjecture non vérifiable.

**Étape de passe recommandée, complément au §12.** Ajouter après les passes 6-9 (lien_1 à lien_4) une passe 10 bis : relecture des `id_verset` attachés en lien_1/lien_2 contre le texte réel des versets correspondants (toutes traductions disponibles), avec attention particulière aux segments portant plusieurs `id_verset` sur une même colonne (signal le plus fiable de sur-attachement).

**Chantier *Discours sur les Psaumes* (juillet 2026) — compléments.**

*Décalages de numérotation en cascade.* Trois couches distinctes peuvent fausser un lien de Psaume : (1) le chapitre — Vulgate vs hébraïque, résolu par `ref_lxx` prioritaire (voir §18) ; (2) le verset — quand le titre du psaume est compté comme verset dans l'édition source ; (3) la numérotation clémentine du NT, décalée d'un verset sur certains chapitres (constaté : 1 Th 4, 12 clémentin = 1 Th 4, 13 moderne, « ceux qui dorment »). Aucune de ces couches ne se corrige en bloc : la preuve est toujours textuelle, verset par verset.

*Méthode de correction par citation.* Quand un lien_1 porte une citation entre guillemets, le bon id se départage en comparant le recouvrement lexical (racinisation grossière, mots vides retirés) entre le segment et le verset lié puis ses voisins immédiats ; n'accepter le voisin que s'il l'emporte nettement (seuil élevé), puis propager la correction aux lien_2/lien_3 des segments d'exposition qui en dépendent.

*Lacunes Sacy constatées dans `versets`.* TR0001 vide sur PSA 12:8, PSA 83:19, PSA 119:136 (TR0002/TR0003 présents — liens valides, texte Sacy à compléter un jour), ainsi que sur la totalité des ids de Sagesse et de l'Ecclésiastique (cf. la règle TR0003 ci-dessus).

## Arbitrages de Sébastien (formulaire du 10 juillet 2026)

Ces décisions priment sur toute formulation antérieure de la charte.

**Liens.** L'écart textuel entre la Vieille latine (ou toute version patristique) et la traduction de la table est normal et ne bloque pas le lien_1 ; si la correspondance paraît vraiment douteuse, la marquer « erreur probable ». — lien_2 = paraphrase : l'auteur ne prétend rien expliquer ni ajouter au verset (au plus quelques mots pour clarifier une tournure). lien_3 = commentaire proprement dit : le segment explique, travaille le verset. Un segment qui paraphrase ou cite PUIS explique porte les deux liens à la fois. — Propagation du lien_3 : la raffiner selon le critère d'usage — l'utilisateur qui clique sur un verset doit trouver une explication circonstanciée dès les premières lignes, sans dérive hors sujet ; pas de borne mécanique unique. — lien_4 : aucun quota ; intéressants, thématiques, cohérents, en relation nette avec le verset ; un même verset cible peut être réutilisé sans limite si chaque écho est pertinent.

**Fiabilité — jeu restreint et définitif :** « vérifié » (protégé), « probable », « erreur probable », « Lien à constituer ». Ne pas créer d'autres états. Seul Sébastien promeut en « vérifié » (page admin des vérifications) ; Claude uniquement sur demande explicite.

**Numérotation.** Affichage du site : numérotation hébraïque avec la Vulgate entre parenthèses, uniformément ; toute conversion se vérifie contre la source. NT : constituer une table de correspondance clémentine ↔ moderne et normaliser systématiquement vers la numérotation moderne (le système le plus commun).

**Texte.** Ne JAMAIS moderniser la graphie — fidélité à la lettre, à l'esprit et au goût de l'édition source ; seules les erreurs (OCR, coquilles) se corrigent. — Guillemets ouvrants perdus : vérifier la source ; si l'absence y est confirmée, restituer l'ouvrant et marquer le segment « erreur probable » (à contrôler). — Un document cité (acte, lettre, pièce conciliaire) forme une entité unique : ne jamais le redécouper, quelle que soit sa longueur.

**Notes.** La colonne notes existe en base (migration du 10 juillet 2026). Les références bibliques trouvées dans une note ne génèrent un lien QUE si la note renvoie au texte du segment ; jamais pour un renvoi interne à la note.

**Table versets.** Ne pas combler les lacunes d'origine de l'édition ; quand une traduction existe mais manque en base, le signaler dans la table `journal_ia` (canal persistant : Claude y consigne les problèmes rencontrés, Sébastien y répond ; colonnes sujet / probleme / reponse / statut).

**Audits.** Les fichiers d'audit de session ne sont livrés que sur demande explicite, directement dans la conversation.

## Orientations générales (second formulaire, 11 juillet 2026)

Ces arbitrages fixent le cap du projet ; ils priment sur toute formulation antérieure.

**Identité.** Nom officiel : Corpus Scriptura ; domaine canonique : **corpus-scriptura.fr** (acquis via OVH, juillet 2026, avec corpus-scriptura.com en redirection). Présentation de travail (non officielle) : un accès aux sources bibliques et patristiques, construit progressivement, croisant les textes des Pères et la Bible pour en éclairer la lecture ; espace collaboratif. Interface : claire, épurée, ergonomique — elle sert à égalité le savant et le non-initié ; l'accès à ce que cherche l'utilisateur doit être intuitif.

**Corpus et feuille de route.** Double critère : suivre le canon patristique (Pères majeurs d'abord, Orient et Occident alternés) et suivre la Bible (chaque livre couvert par au moins un commentaire quand il en existe). Traductions libres de droit uniquement — domaine public strict pour le moment ; goût assumé pour les traductions anciennes (type XVIIe). Le corpus s'enrichit progressivement de textes utiles, rares ou intéressants — Sébastien décide. Une page publique « chantiers » est en préparation (Sébastien la fournira).

**Sources.** Mention systématique de l'édition source : éditeur, ville, date, traducteur. Ne JAMAIS publier l'URL de provenance ; la conserver seulement en mémoire interne (métadonnées).

**Modèle de données.** À terme, la Septante grecque et l'hébreu massorétique entreront comme colonnes TR à part entière dans `versets`. Le bilingue patristique (texte_original) est un objectif d'affichage en regard, à concevoir — d'ici là, réserve de données. Notes [[N]] : affichage par appel cliquable ouvrant une info-bulle au survol/toucher.

**Lecture.** Chaque segment devra offrir une référence académique copiable (auteur, œuvre, édition, URL stable). Mode « chaîne exégétique » (tous les Pères d'un verset, triés par siècle) : plus tard.

**Communauté.** Règle de modération écrite : respect des lois en vigueur, échanges en bonne intelligence, pas d'insultes ni de polémiques stériles, orthographe correcte. Propositions de liens par les lecteurs : via signalement pour l'instant ; un système de suggestion réservé aux Docteurs pourra être envisagé.

**Qualité.** Les liens « probable » se vérifient sur deux régimes cumulés : relecture exhaustive au long cours, œuvre par œuvre, et vérification portée par l'usage (signalements des lecteurs + page admin). Les grandes passes autorisées par la charte (renumérotation, fusions) ne requièrent pas de confirmation préalable de Sébastien. Le journal_ia est relevé au rythme de ses disponibilités.

**Pérennité.** Mentions légales, politique de confidentialité et registre RGPD : à rédiger avant la sortie de bêta. Sauvegarde mensuelle hors Supabase : décidée, méthode à instruire (voir journal_ia). La charte n'est pas historisée : seule la version la plus récente est conservée.

---

## 22. Notes de bas de page et apparat éditorial ([[N]])

**Principe général.** La note fait partie de l’histoire éditoriale du texte : traducteur, éditeur, variantes, remarques philologiques ou historiques, références antiques ou patristiques. Elle doit être conservée lorsqu’elle éclaire la lecture, la transmission ou l’interprétation de l’œuvre. Sa suppression constitue l’exception, jamais la règle par défaut — elle exige un motif explicite.

**Appels de note dans `segment_texte`.** Syntaxe `[[N]]`, insérée à l’endroit exact de l’appel d’origine. Cette numérotation est propre au CSV produit : elle ne conserve pas nécessairement la numérotation de l’édition source. Les anciens appels de toute forme (chiffre seul, `(1)`, `*`, `†`, `[a]`, etc.) sont supprimés du texte après extraction de la note. Si plusieurs appels tombent dans le même segment, ils se suivent dans l’ordre : `[[12]] [[13]]`.

**Renumérotation séquentielle.** Les notes sont renumérotées dans l’ordre de lecture des segments produits, indépendamment de la numérotation de la source : première note rencontrée = `[[1]]`, deuxième = `[[2]]`, etc.

**Colonne `notes`.** Le texte de chaque note est conservé dans une colonne dédiée (voir §11), au format `[[N]] Texte de la note.` — une ligne par note, plusieurs notes d’un même segment séparées par un retour à la ligne (jamais par point-virgule).

**Nature des notes — à conserver :** variantes textuelles, remarques du traducteur, références antiques, indications historiques, précisions philologiques, références bibliques ou patristiques supplémentaires.

**Nature des notes — peuvent être supprimés :** numéros de page, réclames, indications purement typographiques, signatures d’imprimeur, tout élément sans contenu intellectuel.

**Références bibliques internes à une note.** Elles ne génèrent jamais automatiquement de lien_1/2/3/4 — seules les références situées dans le corps du texte principal alimentent ces colonnes (voir §8-9). Une référence importante repérée dans une note peut être signalée à part lors d’une passe ultérieure, jamais résolue à la volée.

**Alignement bilingue (`texte_original`).** Quand une édition source propose un texte parallèle (grec, latin…), l’alignement se fait par unité structurelle explicite du texte source — paragraphe, ou section numérotée en chiffres romains/PG si la source la fournit —, jamais par simple position séquentielle sans vérification. Avant segmentation, compter les paragraphes des deux colonnes : un écart de compte signale presque toujours une subdivision différente d’un côté (à regrouper par les marqueurs numérotés communs aux deux langues, quand ils existent) plutôt qu’un défaut d’alignement réel. Le texte source aligné est posé sur le premier segment de chaque unité, jamais réparti ou dupliqué sur les segments suivants de la même unité.

---

Cette charte remplace et consolide toutes les versions précédentes. Toute nouvelle règle découverte au fil d'un dépôt d'œuvre doit y être ajoutée immédiatement, jamais laissée implicite dans une conversation isolée.

=== ARBITRAGES DU TROISIÈME FORMULAIRE (12 juillet 2026) — complètent et corrigent ce qui précède ===

CONTRADICTIONS TRANCHÉES
1. Domaines : **corpus-scriptura.fr (canonique, AVEC tiret)** + corpus-scriptura.com (redirection permanente 308 vers le .fr). Toute autre graphie est erronée. *(Inversé le 20 juillet 2026 : le .fr était auparavant donné comme la redirection. La redirection est faite par le middleware, d'après la variable `SITE_CANONIQUE`.)*
2. Fiabilité (§10 réécrit) : jeu définitif = vérifié / probable / erreur probable / Lien à constituer. « à_vérifier » supprimé partout (charte, données, code à contrôler).
3. Segmentation (§5 amendé) : 300 caractères est un maximum INDICATIF dont on reste proche ; la ponctuation forte et l'unité de sens priment ; l'unité des citations est ABSOLUE (jamais redécoupées) et tout segment-citation porte nature = « citation ».
4. lien_4 (§9 reformulé) : créer quand c'est pertinent — donc avec retenue ; mais si de nombreux segments sont pertinents, les créer tous sans hésiter. Pas de quota.
5. Termes consacrés (§8 amendé) : à identifier et lier au cas par cas ; relèvent généralement du lien_3, décision de l'IA cas par cas.
6. Passe 10 bis : dédoublonnée (une seule formulation fait foi, au §12).

CORPUS — RÈGLES NOUVELLES
7. Lacunes matérielles : segment_texte = « Texte manquant », nature = « texte absent » ; mise en forme spéciale à prévoir côté site.
8. Traductions multiples / doubles recensions : une œuvre garde UN id_oeuvre ; chaque traduction porte un numéro de traduction sous cet id (architecture à créer, analogue aux TR des bibles) ; l'utilisateur choisira sa traduction. Rééditions : coexistence des principales traductions, jamais de remplacement.
9. Attributions douteuses (pseudépigraphes, spuria) : admises au corpus ; colonne à ajouter dans oeuvres signalant l'auteur incertain ; mention discrète à côté du nom de l'auteur sur la page des œuvres.
10. Poésie et hymnes : respecter la forme voulue par l'auteur/éditeur ; les retours à la ligne des vers sont retranscrits et respectés ; un segment commence et finit obligatoirement en début/fin de vers (jamais de vers coupé) ; segmentation logique par groupes de vers ou strophes (pas systématiquement un vers = un segment) ; accepter que les coupes soient moins parfaites que pour la prose.
11. Correspondances : si l'œuvre EST une lettre, le titre de l'œuvre suffit ; si l'œuvre contient plusieurs lettres, niv1 normalisé par lettre (destinataire homogénéisé).
12. Citations profanes (Platon, Cicéron…) : traitées en notes [[N]] (texte, pas d'id) — le renvoi apparaît comme une note.
13. Renvois internes du corpus (un Père citant une autre œuvre du corpus) : fiabilite = Lien à constituer ; l'id du segment visé sera noté dans une colonne de lien spécifique (à créer) ; en attendant, note [[N]] de la forme : Voir [Auteur], [Œuvre en italique].
14. Citations au second degré (chaîne : un Père citant un Père citant l'Écriture) : lien_1 — l'Écriture citée reste l'Écriture quel que soit l'intermédiaire.
15. Livres hors table versets (Hénoch, 3-4 Esdras, Odes…) : fiabilite = Lien à constituer, colonnes de lien vides ; note [[N]] de la forme : Voir [titre], [références].

LIENS — PORTÉE
16. Couverture intégrale (règle des Psaumes) : GÉNÉRALISÉE à toutes les œuvres, exégétiques ou non — tout segment porte au minimum un lien_3 vers le passage commenté ou un lien thématique/doctrinal en rapport direct avec le texte biblique. Mise en forme détaillée à venir avec Sébastien.
17. Cumul lien_1 + lien_3 sur un même verset dans un même segment : NÉCESSAIRE ET OBLIGATOIRE quand pertinent (la règle de non-duplication est abrogée sur ce point) ; l'affichage dans les volets de navigation doit rester lisible et dédoublonné.
18. Aucun plafond d'ids par colonne de lien.
19. lien_1 invérifiables par machine : fiabilite = Lien à constituer + texte de la citation consigné pour constitution manuelle par Sébastien, visible côté administration (dossier journal_ia n°9 pour les Psaumes : 16 cas).

SITE ET TECHNIQUE
20. Réimport d'une œuvre : ne jamais remplacer les lignes fiabilite = vérifié ; les commentaires d'utilisateurs ne sont JAMAIS effacés.
21. Recherche (concordance) : versets + segments, TOUTES traductions, tolérance des graphies anciennes (étoit/était). Feu vert.
22. Pagination des œuvres : par nombre de signes (modèle existant), avec règle de tolérance : si le reliquat final est inférieur à 5 % du maximum de signes par page, l'inclure dans la page précédente. Pas de pagination par niv1.
23. Notes [[N]] : info-bulle au survol, au clic sur téléphone ; cas limites à revoir ensemble.
24. Correspondance NT clémentine : colonne ref_clem dans versets (miroir de ref_lxx).
25. Suivi des erreurs en production : oui, à mettre en place ensemble avant la bêta.
26. SEO/partage : à instruire — feuille de route de questions à préparer pour Sébastien (notion à expliquer).

GOUVERNANCE
27. Sauvegarde : export automatisé GitHub Actions + pg_dump chiffré (à implémenter — to-do).
28. Versets Sacy manquants : compléter depuis une autre numérisation de l'édition de 1759.
29. Guillemets ouvrants (Psaumes) : FEU VERT pour la passe complète de restitution avec marquage erreur probable.
30. Licence du travail propre du site : tous droits réservés pour l'instant.
31. Référence académique copiable, format canonique : Augustin d'Hippone, Discours sur les Psaumes, trad. par [prénom nom du traducteur], Bar-le-Duc, [éditeur], 1868. Disponible sur le site de Corpus Scriptura, consulté le [date].
32. Pas de page publique « chantiers ». À la place : une page FEUILLE DE ROUTE (améliorations prévues) et une page listant les œuvres et traductions disponibles, avec possibilité pour le visiteur de proposer une œuvre.
=== FIN DES ARBITRAGES DU TROISIÈME FORMULAIRE ===

=== OCÉRISATION — RÈGLES DE LA PASSE 1 (ajout du 13 juillet 2026, demande de Sébastien) ===
Quand une œuvre n'est disponible qu'en image ou PDF sans texte (pas de txt source), la première passe produit un DOCX PROPRE, non segmenté, qui servira aussi de base aux éditions numériques :
1. Fidélité intégrale au texte océrisé, graphies d'époque comprises (jamais de modernisation).
2. Les notes de l'édition source deviennent des notes de bas de page du docx.
3. Les références bibliques portées en marge sont conservées et placées entre parenthèses immédiatement après la citation qu'elles identifient.
4. Les titres et leurs niveaux hiérarchiques sont respectés (styles Titre 1/2/3 du docx).
5. L'apparat critique est conservé.
6. Le texte n'est PAS segmenté à ce stade ; les paragraphes d'origine sont respectés.
7. La segmentation (passe 2) part de ce docx et suit les règles ordinaires de la charte.

=== ARBITRAGES JEU DES FRISES (13 juillet 2026) ===
1. Principe : le joueur devine l'emplacement d'un VERSET PRÉCIS, affiché au début de la partie. Une partie = un verset = un parcours à travers la Bible.
2. Score en trois phases, plafonds fixes : trouver AT/NT = petite quantité fixe ; trouver le bon livre = quantité modérée fixe ; sur la frise graduée par versets, points selon la distance au verset exact, jusqu'à 5 000 au maximum.
3. Indice payant : possibilité de voir le verset précédent ou suivant contre une petite quantité de points.
4. Le guide diégétique (à gauche / à droite / juste) parle en texte, dans le style de la frise ; une seule validation après son indication ; il suit le joueur en rappel du dernier coup.
5. Marquage des chapitres : laissé à l'artiste dans sa frise ; le chapitre et le verset peuvent s'afficher au clic droit.
6. Échelle de Jacob : abandonnée.
7. Accès : ouvert aux anonymes ; inscription requise pour enregistrer les scores.
8. Production : prototype construit avec l'IA d'abord ; ensuite commande à un artiste d'un modèle réutilisable pour toutes les frises. Charte des frises (inchangée) : longueur suffisante pour les épisodes importants, épure, nombre de chapitres dans les blancs, rien d'anti-chrétien/polémique/blasphématoire, liberté de style à portée heuristique ; frise fermée/ouverte (double à triple hauteur) ; personnage-symbole du livre, curseur intégré au style.

=== ARBITRAGES SITE (13 juillet 2026, feuille de travail) ===
1. Ponctuation finale des citations (garder ? ! . ; … ; supprimer les virgules finales) : règle d'AFFICHAGE uniquement, appliquée partout où les segments s'affichent — jamais de passe sur les données.
2. Proposition d'œuvres : la traduction (txt) seule suffit et est obligatoire ; texte original facultatif ; garanties demandées (libre de droits, non dénaturé) ; points de rang ; choix nom/pseudo/anonyme.
3. Traductions sous licence : décision reportée ; pistes = achat à l'œuvre ou abonnement.
4. Bibliothèque personnelle (favoris) : publique obligatoirement.
5. Catalogue des œuvres patristiques : sera constitué à partir d'un document fourni par Sébastien (à venir).
6. Atelier d'écriture admin : PAS de bouton d'appel à l'IA ni d'actualisation automatique des commentaires (jugée trop complexe) ; commentaires IA par page et par paragraphe, couleur de niveau de refonte.
7. Suivi des mises à jour : table distincte, visible en admin seulement (séparée de la feuille de route publique).
8. Notes [[N]] : convention en place confirmée par statu quo (séparateur = retour à la ligne).
=== FIN DES ARBITRAGES DU 13 JUILLET ===

=== MARQUAGE DE PROVENANCE (14 juillet 2026) ===
La table segments porte deux colonnes de traçabilité, JAMAIS vides :
- marquage_source : « Claude (IA) » par défaut (toute ligne issue d'une passe ou d'un import IA le porte automatiquement) ; remplacé par le nom ou pseudo de l'admin ou de l'utilisateur lors d'une validation humaine. Ainsi, un segment qui n'a connu qu'une passe d'IA se reconnaît immédiatement.
- marquage_date : date du dernier marquage.
Règle : toute validation humaine (promotion en « vérifié », correction manuelle) écrit son nom dans marquage_source et rafraîchit marquage_date. Les CSV d'import n'ont pas besoin de ces colonnes : le défaut s'applique.

=== AMENDEMENTS DU 14 JUILLET 2026 (audit des bases versets et référentiels) ===
1. La table versets contient 89 livres : canon + deutérocanoniques + NON CANONIQUES déjà présents (Hénoch 1563 v., Jubilés 1217 v., Psaumes de Salomon, Odes, 3-4 Esdras, 3-4 Maccabées, Prière de Manassé, Psaume 151…). L'arbitrage n°15 du 3e formulaire est AMENDÉ : les citations patristiques d'Hénoch et des autres livres présents reçoivent de VRAIS liens (plus de « Lien à constituer » pour eux). La table de référence « livres » (code, nom français, catégorie canonique/deutérocanonique/non canonique, ordre) fait foi pour l'affichage et le filtrage.
2. Traductions en base : TR0001 Sacy, TR0002 Segond, TR0003 Crampon (françaises) ; TR0004 Vulgate (LATIN) ; TR0005 King James (ANGLAIS). La concordance est restreinte aux trois françaises, conformément à la consigne d'origine ; une concordance latine dédiée (Vulgate) pourra naître plus tard comme mode séparé.
3. Corrections de versets : la colonne versets.commentaire_ia porte la traçabilité (même convention que segments) ; les coquilles Sacy se corrigent vers la GRAPHIE DE SACY (éteient → étoient, jamais étaient).
=== FIN DES AMENDEMENTS DU 14 JUILLET ===

=== TABLE catalogue_notices — CATALOGUE BIBLIOGRAPHIQUE (14 juillet 2026) ===

## Rôle

`catalogue_notices` est le catalogue bibliographique complet des œuvres patristiques et théologiques susceptibles d'entrer sur le site. Elle contient 2 446 notices (au 14 juillet 2026) produites par passe IA, dont la grande majorité n'est pas encore importée. Elle est distincte de la table `oeuvres` qui ne contient que les œuvres effectivement publiées sur le site.

## Colonnes principales

| Colonne | Type | Rôle |
|---|---|---|
| id | bigint (auto) | PK séquentielle |
| id_ligne | text | Identifiant métier (format à documenter) |
| id_auteur | text | FK vers auteurs(id_auteur) |
| auteur | text | Nom de l'auteur (dénormalisé pour l'affichage) |
| dates_auteur | text | Dates de vie, format normalisé « XXXX-XXXX » (trait d'union simple) |
| id_oeuvre_stable | text | Identifiant stable de l'œuvre — sert à faire la jonction avec oeuvres(id_oeuvre) |
| titre_stable | text | Titre canonique de l'œuvre |
| titre_original | text | Titre en langue originale (facultatif) |
| titre_edition | text | Titre de l'édition française |
| genre | text | Genre littéraire |
| langue_originale | text | Langue d'origine |
| date_oeuvre | text | Date de composition, format normalisé « XXXX-XXXX » |
| authenticite | text | Statut d'authenticité de l'œuvre |
| traducteur | text | Traducteur de l'édition française |
| annee_edition | integer | Année précise de publication |
| siecle_edition | text | Siècle d'édition (quand l'année n'est pas connue) |
| date_edition | text | Date d'édition textuelle |
| editeur | text | Éditeur |
| collection_nom | text | Nom de la collection |
| lieu_edition | text | Lieu de publication |
| domaine_public | text | Statut de droits (non encore normalisé en boolean) |
| url_source | text | URL de la source numérique (usage interne uniquement — ne jamais publier) |
| id_traduction | text | Identifiant de traduction (usage interne) |
| decision_import | text | Décision de traitement : « Candidat… », « Bibliographie seulement… », « Repérage… », « Écarter… » |
| niveau_verification | text | Niveau de vérification bibliographique (champ narratif) |
| score_fiabilite | smallint | Score de fiabilité IA (0–100). Anciennement certitude_ia_pct, renommé le 14 juillet 2026. |
| presence_sur_le_site | boolean | true si l'œuvre existe dans la table oeuvres |
| verifie | boolean | true si la notice a été validée définitivement par l'administrateur |
| priorite | text | Priorité d'import |
| created_at | timestamptz | Date de création |

## Règles absolues

1. **Normalisation des dates historiques.** Les champs `dates_auteur`, `date_oeuvre` et `date_edition` utilisent le trait d'union simple pour les plages de dates (ex. « 354-430 »). Chaque période doit pouvoir distinguer une borne de début, une borne de fin et leur précision : exacte ou Vers. Les formes avec tiret moyen ou tiret long sont incorrectes et doivent être normalisées à l'import.

2. **Verrouillage des notices validées.** Quand `verifie = true`, la notice est définitivement verrouillée : aucune modification ni suppression n'est possible, même via Supabase Studio. Ce verrouillage est appliqué par un trigger en base (`trg_protect_verified_notice`). Ne jamais tenter de contourner ce trigger.

3. **Synchronisation automatique avec `oeuvres`.** Un trigger (`trg_sync_presence_catalogue`) met automatiquement `presence_sur_le_site = true` sur toute notice dont l'`id_oeuvre_stable` correspond à un `id_oeuvre` nouvellement inséré ou modifié dans `oeuvres`. Ce champ ne doit jamais être mis à jour manuellement.

4. **URL source.** Le champ `url_source` est strictement interne — ne jamais l'afficher ni le publier côté utilisateur.

5. **score_fiabilite.** Colonne renommée depuis `certitude_ia_pct` le 14 juillet 2026. L'API `/api/admin/catalogue` et le composant admin utilisent ce nouveau nom.

## Interface admin

L'onglet « Catalogue » de l'admin (`SectionVerificationCatalogue.tsx`) permet :
- Filtrer par statut (à vérifier / toutes / vérifiées / sur le site)
- Filtrer par décision d'import (candidats / à vérifier / biblio seule / à écarter)
- Rechercher par auteur
- Accéder à l'URL source en un clic depuis la ligne condensée
- Valider une notice définitivement (action irréversible, confirmation demandée)
- Les notices validées apparaissent verrouillées visuellement — aucun bouton de modification

=== FIN — TABLE catalogue_notices ===

=== RÈGLES TYPOGRAPHIQUES ET ÉDITORIALES (15 juillet 2026) ===

Ces règles complètent et amendent §3, §9 et §22 de la charte. Elles priment sur toute formulation antérieure en cas de conflit.

**§3 — nouveaux alinéas (typographie)**

15. **Siècles.** Les numéros de siècle sont toujours composés en petites capitales (rendu site : classe CSS `small-caps` ou balise dédiée à définir) ; le suffixe ordinal est obligatoirement en exposant : XIXᵉ siècle, IVᵉ siècle, etc. Règle absolue, appliquée sur l'ensemble du site — textes de segments, métadonnées, interface, notices.

16. **Nombres ordinaux.** Les adjectifs ordinaux ne s'écrivent jamais en chiffres seuls, ni arabes ni romains : jamais « 40e », « XLe », « 40° », « XL° ». Transcrire systématiquement en toutes lettres : « Quarantième », « Troisième », « Soixantième », etc. Cette règle s'applique dans les segments comme dans les métadonnées.

**§3 — amendement de la règle 3 (guillemets)**

Les citations sont TOUJOURS encadrées de guillemets, même lorsque l'édition source n'en avait pas. Guillemets français « … » pour le premier niveau ; guillemets anglais "…" pour le second niveau (citation dans une citation). Cette règle de balisage prime sur la fidélité à la mise en forme de la source ; elle ne modifie pas le contenu des citations, seulement leur encadrement typographique.

**§9 et §22 — règle capitale : liens bibliques et notes originales**

**Liens bibliques.** Les liens bibliques sont TOUJOURS exprimés sous forme d'`id_verset` (format BXXXXXX) dans les colonnes `lien_1` à `lien_4` — jamais sous forme textuelle. Toute référence biblique identifiée reçoit un id_verset vérifié dans la table `versets` ; si l'identification est incertaine, la valeur est laissée vide et `fiabilite` = « Lien à constituer ».

**Notes originales.** Les notes de bas de page ou intercalées dans le texte — qu'elles soient du traducteur, de l'éditeur ou de l'auteur lui-même — sont extraites du corps du texte et placées dans la colonne `notes`, avec leur appel `[[N]]` inséré à l'emplacement exact dans `segment_texte`. Le contenu des notes doit rester STRICTEMENT IDENTIQUE à ce qu'il est dans le texte original : aucune reformulation, aucune coupure non signalée, aucune adaptation. Seules interventions autorisées : correction d'une coquille ou d'un défaut d'OCR manifeste (marquer « [sic] » si incertain) ; normalisation typographique (guillemets, apostrophes, espaces fines) selon les règles de la présente charte.

=== FIN DES RÈGLES DU 15 JUILLET 2026 ===


- Hiérarchie des titres : éviter les doublons de type « Livre I » / « Livre premier » entre le titre et le sous-titre. Pour un même niveau, préférer la forme littéraire dans `ref_niv1` (`Livre premier`, `Livre deuxième`, etc.) et laisser vide le champ `_texte` s'il ne fait que répéter la même information.

=== LEÇONS APPRISES — *Annotationes in Job* (15 juillet 2026) ===

**Workflow d'import complet — trois tables obligatoires.**

La bibliothèque (`/bibliotheque`) lit la table `oeuvres` via une jointure sur `auteurs`. La table `catalogue_notices` est le catalogue bibliographique ; elle n'alimente pas l'affichage. Un import complet d'une nouvelle œuvre doit obligatoirement alimenter **trois** tables, dans cet ordre :

1. `segments` — le texte segmenté, via l'API REST (PostgREST) par lots de 100 lignes avec la clé service-role.
2. `catalogue_notices` — la notice bibliographique (si elle n'existait pas déjà).
3. `oeuvres` — l'entrée opérationnelle. **Sans cette ligne, l'œuvre reste invisible sur le site**, même si les segments sont bien en base. Un trigger (`trg_sync_presence_catalogue`) met automatiquement `presence_sur_le_site = true` dans `catalogue_notices` dès que la ligne est créée dans `oeuvres` — ne jamais le faire manuellement.

**Champs obligatoires de `oeuvres` à l'import** (voir §19 pour le détail de chaque colonne) :
- Métadonnées : `id_oeuvre`, `id_auteur`, `titre`, `titre_original`, `langue_originale`, `langue_trad`, `date_approx`, `genre`, `trad_auteur`, `editeur`, `collection`, `ville`, `date_publication`
- Structure : `niveaux_corps` (1 si ref_niv1 seul, 2 si ref_niv1+niv2…), `niveaux_sommaire` (idem), `profondeur_sommaire` (1 par défaut)
- Valeurs par défaut : `texte_sommaire = '0,0,0,0,0'`, `texte_corps = '0,0,0,0,0'`, `afficher_numeros = true`, `genres = []`

**Indépendance sémantique des colonnes lien_1 à lien_4.**

Les colonnes `lien_1` à `lien_4` expriment exclusivement la nature du rapport biblique définie au §9 : citation directe, citation libre ou parallèle proche, commentaire doctrinal, écho thématique. Elles ne constituent jamais quatre emplacements successifs ni un classement par ordre d’importance. Un champ intermédiaire vide est pleinement légitime : un segment peut porter uniquement un `lien_3` ou un `lien_4`. Il est interdit de déplacer une référence dans une colonne antérieure pour supprimer un prétendu « trou », de dupliquer une référence ou d’ajouter des liens artificiels pour remplir les colonnes. L’import et l’affichage doivent examiner indépendamment les quatre champs non vides.

**ref_niv2 = § 1 ne doit pas être omis.**

Le premier paragraphe de chaque nouvelle division (chapitre, livre, partie) doit lui aussi recevoir sa valeur de `ref_niv2` (ex. `§ 1`). Erreur typique de script : quand ref_niv1 change, le numéro de § est réinitialisé à 1 mais n'est pas écrit dans ref_niv2, laissant le premier segment du nouveau chapitre sans ref_niv2 alors que les suivants ont `§ 2`, `§ 3`, etc. Contrôle obligatoire à l'audit : chercher les segments dont ref_niv1 est renseigné et ref_niv2 est vide — tous les cas doivent être légitimes (œuvre à un seul niveau, prologue sans §…).

**"Très-Haut" est un nom propre — ne pas supprimer son trait d'union.**

La règle de suppression du trait d'union après « très- » (adverbe + adjectif : *très-élevé* → *très élevé*) ne s'applique pas aux noms propres composés. « Très-Haut » (nom de Dieu), « Saint-Esprit », « Notre-Dame », « Sacré-Cœur » conservent leur trait d'union. La regex de détection doit exclure les occurrences où le mot qui suit le trait d'union commence par une majuscule.

**Numérotation Job — frontière ch. 39 / ch. 40 (Vulgate vs hébreu).**

Le chapitre 39 de Job en numérotation hébraïque compte 30 versets. Les versets que l'on rencontre comme Job 39,31–35 dans certaines éditions latines (Vulgate clémentine) sont en réalité Job 40,1–5 en numérotation hébraïque — seule numérotation stockée dans la table `versets`. Correspondance : Job 39,31 (Vg) = Job 40,1 (hébr.) = B013869 ; Job 39,35 (Vg) = Job 40,5 (hébr.) = B013873. Voir §18 pour le principe général de conversion Vulgate/hébreu sur les Psaumes ; ce même principe s'applique à Job aux chapitres 39-40.

**Bug corrigé — `segment-titre/route.ts` (juillet 2026).**

La route `app/api/admin/segment-titre/route.ts` comportait un bug : pour `niveau = 1`, elle écrivait systématiquement dans `ref_niv1_texte` quelle que soit la valeur de `schemaTexte`, au lieu de suivre la logique uniforme. Corrigé le 15 juillet 2026 : `const champ = schemaTexte ? \`ref_niv${niveau}_texte\` : \`ref_niv${niveau}\`` (logique uniforme pour tous les niveaux). La suppression au niveau 1 continue de préserver `ref_niv1` (clé de regroupement) et n'efface que `ref_niv1_texte`.

=== FIN DES LEÇONS — ANNOTATIONES IN JOB ===

---

## Première grande étape — OCR patrimonial et préparation des éditions anciennes (17 juillet 2026)

Cette étape fixe la méthode de référence pour l’océrisation des éditions anciennes destinées à Corpus Scriptura. Elle résulte du travail mené sur des volumes français des XVIIe siècle, notamment les éditions anciennes d’Eucher et des Homélies de saint Jean Chrysostome. Les exemples signalés par le relecteur doivent toujours être transformés en règles d’audit appliquées à l’ensemble du volume : une correction locale ne suffit jamais.

### 1. Source et principe de fidélité

- Travailler à partir de la vue du fac-similé numérisé. Ne jamais reprendre comme autorité le texte OCR déjà associé au PDF.
- Océriser tout le volume demandé. Si des pages manquent, poursuivre les pages disponibles et rechercher ultérieurement un autre exemplaire numérisé de la même édition pour compléter les lacunes.
- Moderniser uniquement les caractères et la typographie de lecture. Ne modifier ni la langue, ni le vocabulaire, ni l’orthographe historique, ni la syntaxe de l’édition.
- Ne rien ajouter au texte. Toute restitution incertaine doit être vérifiée sur l’image ; si elle demeure indéchiffrable, la signaler visuellement pour révision humaine plutôt que l’inventer.
- Une correction apparemment évidente doit rester compatible avec le fac-similé et la cohérence de la phrase.

### 2. Continuité du texte et paragraphes

- Produire un texte brut, fluide et continu, sans repères de pages.
- Ne pas reproduire la pagination, les réclames, les signatures de cahiers, les titres courants, les en-têtes ou pieds de page.
- Les changements de page du livre ne créent jamais à eux seuls un saut de paragraphe. Si la phrase ou le paragraphe continue sur la page suivante, le texte doit se suivre sans rupture.
- Reproduire les paragraphes réels de l’édition. Ne pas segmenter artificiellement le texte et ne pas fusionner deux paragraphes distincts.
- Les titres propres à l’œuvre, les intitulés d’homélies, les arguments et les colophons réellement présents dans le corps sont conservés. Les formes parasites telles que « I. Homelie » provenant d’un titre courant sont supprimées.

### 3. Modernisation typographique autorisée

- Remplacer les formes graphiques anciennes par leurs caractères modernes lorsque l’identité du mot ne change pas : s long, ligatures, variantes purement glyphiques, etc.
- Ramener les titres ou mots entièrement composés en capitales à une casse normale, sauf majuscule exigée en début de phrase, pour un nom propre ou par l’usage du texte. Exemple : « DE S. JEAN CHRYSOSTOME » devient « De S. Jean Chrysostome » ; « DIEU » devient « Dieu » lorsqu’il ne s’agit que d’une capitale typographique.
- Employer les guillemets français « … » ; supprimer ou corriger les guillemets droits ou anglais introduits par l’OCR.
- Supprimer les espaces avant la virgule et le point.
- Employer une espace fine insécable (U+202F) avant le point-virgule, le point d’interrogation et le point d’exclamation.
- Employer une espace insécable (U+00A0) avant les deux-points.
- Vérifier l’espace qui suit la ponctuation et supprimer les doubles ponctuations accidentelles.
- Ne pas « corriger » automatiquement une ponctuation ancienne seulement parce qu’elle diffère de l’usage contemporain. En revanche, un point qui coupe manifestement un mot, un groupe syntaxique ou une phrase doit être confronté au fac-similé et corrigé s’il provient de l’OCR.

### 4. Notes, appels et références marginales

- Toutes les notes doivent être de véritables notes de bas de page Word, jamais une liste manuelle placée à la fin du document.
- L’appel de note est en exposant, collé au mot ou au groupe qu’il documente et placé avant la ponctuation. Exemple : « Prophète¹¹², » et non « Prophète, 112 » ni « certes ;112 quand ».
- Lorsqu’une note ou une référence marginale ne possède pas d’appel visible dans l’édition, placer l’appel à l’endroit sémantiquement le plus précis, sans altérer le texte.
- Les références bibliques imprimées dans la marge ne font pas partie de la phrase. Elles doivent être retirées du corps et conservées en notes de bas de page. Exemple : « maison vuide, & Luc II. ballayée » doit redevenir « maison vuide, & ballayée¹ » avec « Luc II. » en note.
- Ne jamais laisser les références bibliques marginales former une liste autonome à la fin du texte.
- Après toute passe, contrôler que chaque appel possède une définition, que chaque définition est appelée, que les identifiants sont cohérents et que l’ordre d’apparition est correct.

### 5. Correction prudente de l’OCR

- Corriger les confusions certaines de lettres, les mots coupés par une signature ou une référence marginale, les répétitions accidentelles, les fragments de mots séparés par un point et les caractères manifestement étrangers à la phrase.
- Vérifier spécialement les confusions I/l/J, O/0, rn/m, u/n, c/e, les s longs, les ligatures et les mots traversés par des éléments marginaux.
- Une initiale « O » employée comme interjection n’est pas le chiffre zéro ; la modernisation typographique peut donner « Ô » lorsque le contexte l’impose (« Ô impudente réponse ! »).
- Contrôler la cohérence de chaque phrase après correction : accord minimal, construction syntaxique, continuité logique avant et après la ponctuation. Cette vérification sert à détecter l’OCR fautif, non à réécrire le français ancien.
- Les corrections automatiques ne sont admises que pour des motifs entièrement sûrs. Toute série de remplacements doit être réauditée dans son contexte afin d’éviter les faux positifs.
- En cas de doute réel, consulter l’image du PDF. Si le doute subsiste, surligner le passage en jaune dans le DOCX pour arbitrage humain.

### 6. Audit global obligatoire

Les remarques du relecteur constituent des signaux de familles d’erreurs. Pour chaque erreur découverte, rechercher toutes les occurrences analogues dans tout le volume. Sont notamment obligatoires :

1. audit des titres courants, signatures, réclames et numéros de page résiduels ;
2. audit des références bibliques ou marginales absorbées dans les phrases ;
3. audit de la position et du format de tous les appels de note ;
4. audit des guillemets et des espaces typographiques françaises ;
5. audit des points, virgules et signes doubles susceptibles de rompre la syntaxe ;
6. audit des mots fragmentés, répétés ou contaminés par une référence ;
7. lecture de cohérence des phrases, avec retour au fac-similé pour chaque anomalie ;
8. contrôle structurel final des paragraphes et des notes.

Il est interdit de déclarer le document terminé après la seule correction des exemples fournis par le relecteur.

### 7. Livrable et contrôle qualité

- Conserver les versions intermédiaires et produire une nouvelle version du DOCX après chaque grande passe.
- Le livrable final est un DOCX propre, sans pagination reproduite et sans ajout éditorial.
- Après les corrections textuelles, rendre le DOCX en PDF ou en images avec Word ou un moteur fiable et inspecter toutes les pages : absence de chevauchement, de rupture anormale, de note détachée, de titre parasite ou de défaut de mise en page.
- Vérifier automatiquement les espaces avant ; ? ! :, la ponctuation doublée, les appels et définitions de notes, puis compléter ces tests par une lecture visuelle.
- Une version partielle ou intermédiaire doit être annoncée explicitement comme telle ; ne jamais la présenter comme le document complet et définitivement vérifié.

=== FIN DE LA PREMIÈRE GRANDE ÉTAPE OCR ===

---

## §10 — Règles spécifiques à L'Échelle du Paradis (A0078O0001)

### §10.1 — Suppression des références bibliques entre parenthèses dans segment_texte

Lorsqu'une référence biblique est présente en parenthèses dans le texte (ex. : `(Rom 2, 11)`, `(Ps 13, 1)`, `(cf. Ex 14, 15-22)`), elle doit être supprimée du champ `segment_texte` si et seulement si elle existe déjà comme lien dans les colonnes `lien_1` à `lien_4` du même segment.

Opération SQL :
```sql
UPDATE segments
SET segment_texte = trim(
  regexp_replace(
    regexp_replace(
      regexp_replace(segment_texte, '\s*\((?:cf\.\s+)?(?:\d+\s+)?[A-Z][a-z]*\.?\s*\d[^)]*\)', '', 'g'),
      '\.\.', '.', 'g'
    ),
    '  +', ' ', 'g'
  )
)
WHERE id_oeuvre = 'A0078O0001'
  AND segment_texte ~ '\([A-Z][a-z]';
```

Après suppression, nettoyer : doubles points (`..` → `.`), doubles espaces.

### §10.2 — Tiret d'incise dans segment_texte : en dash, jamais em dash

Dans le corpus textuel (`segment_texte`), le tiret d'incise doit être un **en dash** (`–`, U+2013), jamais un **em dash** (`—`, U+2014).

Cette règle s'applique uniquement au corpus (champ `segment_texte` de la table `segments`). Dans les textes de l'interface (labels, descriptions, en-têtes), l'usage du tiret est régi par §3.5.

Opération SQL de correction :
```sql
UPDATE segments
SET segment_texte = replace(segment_texte, '—', '–')
WHERE id_oeuvre = 'A0078O0001'
  AND segment_texte LIKE '%—%';
```

---

## Deuxième grande étape - chaîne complète OCR, CSV et import Supabase (17 juillet 2026)

Cette étape complète la première grande étape OCR. Elle fixe le protocole éprouvé sur les Homélies de saint Jean Chrysostome au peuple d'Antioche, traduction de François de Maucroix, édition André Pralard, Paris, 1671.

### 1. Ordre obligatoire

1. Identifier exactement l'édition et l'exemplaire numérisé.
2. Transcrire depuis l'image du fac-similé, sans prendre l'OCR associé au PDF pour autorité.
3. Produire un DOCX continu et fidèle.
4. Effectuer plusieurs passes OCR, dont une passe visuelle contre le PDF.
5. Résoudre ou signaler les incertitudes.
6. Convertir en CSV : titres, arguments, paragraphes, notes et liens.
7. Auditer le CSV.
8. Rechercher l'œuvre et la traduction dans le catalogue avant toute création.
9. Importer la fiche d'œuvre et les segments.
10. Auditer les données relues depuis Supabase et comparer leur empreinte à celle du CSV.
11. N'attribuer le statut final de vérification qu'après validation humaine explicite.

Un CSV valide ne prouve pas la justesse de l'OCR ; un DOCX propre ne prouve pas que notes, niveaux et liens sont importables.

### 2. Source exacte

- Enregistrer l'URL de l'exemplaire effectivement consulté, jamais une page de recherche générique ni une numérisation supposée.
- Vérifier auteur, titre, traducteur, éditeur, lieu, année et plusieurs pages témoins.
- Les métadonnées internes du PDF ne suffisent pas.
- Toute seconde numérisation utilisée pour combler des lacunes doit appartenir à la même édition et être consignée séparément.
- Ne jamais inventer une URL Gallica, Google Books ou BnF à partir d'un identifiant supposé.

### 3. Fidélité et caractères

- Conserver la langue de l'édition : orthographe, morphologie, syntaxe, vocabulaire et formes anciennes.
- Moderniser les caractères, non la langue : s long, ligatures, variantes glyphiques, apostrophes, guillemets et casse purement typographique.
- Une forme ancienne ou rare n'est pas une erreur. Une forme attestée par le fac-similé, telle que « seccrets », est conservée.
- Ramener les capitales typographiques à une casse normale : « DIEU » devient « Dieu », sauf justification linguistique réelle.
- Toute correction de contenu doit être justifiée par l'image ou par une corruption OCR certaine. Ne jamais corriger parce que la forme moderne paraît plus naturelle.

### 4. Continuité matérielle

- Supprimer pagination, titres courants, signatures, réclames, en-têtes et pieds de page.
- Un changement de page ne crée jamais un paragraphe.
- Réunir mots et phrases coupés par la page, une signature ou une référence marginale.
- Contrôler visuellement toute forme susceptible d'être un titre courant, par exemple « I. Homelie ».
- Rechercher les résidus courts de fin de page : « Me », « De », syllabes isolées et lettres de signature.
- Une référence marginale comme « Philem. » ou « Luc II. » ne doit jamais rester absorbée dans une phrase.

### 5. Typographie après transcription

- Apostrophe typographique : ’.
- Guillemets français au premier niveau ; guillemets anglais typographiques seulement à l'intérieur d'une citation française.
- Aucune espace avant point ou virgule.
- Espace fine insécable U+202F avant point-virgule, point d'interrogation et point d'exclamation.
- Espace insécable U+00A0 avant deux-points.
- Appel de note collé au mot ou au groupe concerné et placé avant la ponctuation.
- Contrôler doubles signes, points qui coupent une construction, espaces absentes et doubles espaces.
- Conserver la ponctuation ancienne attestée ; corriger seulement la ponctuation créée ou déplacée par l'OCR.
- Après tout remplacement global, rechercher les formes fautives et corrigées pour détecter les faux positifs.

### 6. Notes : DOCX et CSV

Dans le DOCX :
- créer de véritables notes de bas de page Word ;
- afficher les appels en exposant ;
- ancrer chaque appel au point sémantique exact, avant la ponctuation ;
- lorsqu'une note marginale certaine n'a pas d'appel visible, choisir l'ancrage le plus précis sans ajouter de texte.

Dans le CSV :
- insérer l'appel sous la forme [[N]] dans segment_texte ;
- placer la définition [[N]] dans notes ;
- conserver l'ordre des notes multiples ;
- vérifier pour chaque segment l'égalité des listes ordonnées d'appels et de définitions ;
- vérifier globalement premier numéro, dernier numéro, total, valeurs distinctes et absence de trou.

Le nombre de segments comportant une note n'est pas le nombre total de notes.

### 7. Correction OCR

- Toute remarque humaine locale devient une famille de contrôles appliquée au volume entier.
- Vérifier I/l/J, O/0, rn/m, u/n, c/e, s longs, ligatures, accents et apostrophes.
- Rechercher les mots contaminés par une note marginale, une signature ou une réclame.
- Lire la phrase avant et après toute ponctuation suspecte. La syntaxe sert à détecter l'OCR, jamais à réécrire la prose ancienne.
- Les arguments, sommaires et résumés reçoivent la même attention que le corps. Une erreur dans un champ ref_nivN_texte peut être répétée sur des centaines de lignes.
- Toute correction de champ de titre ou d'argument doit être propagée uniformément à toutes les lignes du même niveau.
- En cas de doute, consulter l'image. Si le doute demeure dans le DOCX, surligner en jaune ; ne pas deviner.
- Avant livraison, rechercher tous les motifs qui ont déclenché les passes pour confirmer qu'il n'en reste aucune occurrence.

### 8. DOCX vers CSV

- Le CSV ne reproduit ni pages ni sauts de page.
- Les champs ref_niv1 à ref_niv5 portent les identifiants structurels ; les champs correspondants suffixés par _texte portent titres descriptifs ou arguments.
- Un titre courant ne devient jamais un niveau.
- Le niveau paragraphe est toujours le dernier ; le premier segment de chaque division reçoit aussi § 1.
- La suite des paragraphes est continue dans chaque division.
- Un segment est une unité de sens. Un point-virgule suffit lorsque l'unité logique est complète ; il n'est pas nécessaire d'attendre un point.
- Ne pas créer de fragments trop courts ou dépendants du segment suivant.
- Ne pas séparer une citation de son introducteur lorsqu'ils forment une seule construction.
- Les parties liminaires, approbations et privilèges sont de nature apparat_critique.
- Les arguments authentiques des homélies sont conservés dans le champ _texte du niveau ; les intitulés courants répétés sont supprimés.

### 9. Liens bibliques : règle intangible

Les colonnes sont des catégories sémantiques :
- lien_1 : citation directe ;
- lien_2 : citation libre ou parallèle proche ;
- lien_3 : commentaire doctrinal ;
- lien_4 : écho thématique.

Règles absolues :
- supprimer toute règle technique « sans trou » entre lien_1 et lien_4 ;
- un segment peut porter uniquement un lien_3 ou un lien_4 ;
- ne jamais déplacer une référence vers une colonne antérieure pour remplir une case ;
- lien_1 ne signifie jamais « première référence », ni lien_2 « deuxième référence » ;
- plusieurs identifiants dans une cellule sont séparés par point-virgule et espace ;
- chaque id_verset est vérifié dans la table versets ;
- aucune référence textuelle ne remplace un id_verset ;
- le même verset n'est pas dupliqué dans plusieurs catégories du même segment ;
- auditer séparément les quatre colonnes, le nombre de cellules et le nombre total d'identifiants.

### 10. Catalogue avant import

- Rechercher auteur, titre stable, variantes, traducteur, année et identifiant stable dans oeuvres et catalogue_notices.
- Si la traduction existe déjà dans le catalogue, mettre cette notice à jour après import au lieu d'en créer une nouvelle.
- Conserver l'id_oeuvre_stable existant.
- Ne pas employer traductions.trad_id pour une traduction patristique si cette table sert aux traductions bibliques.
- Remplir oeuvres avec les métadonnées certaines et la structure réelle du CSV.
- Ne déclarer la présence sur le site qu'après vérification de l'œuvre et de tous ses segments.

### 11. Import Supabase par lots

- Vérifier avant import que l'id_oeuvre n'existe pas déjà et que son nombre de segments est nul.
- Calculer nb_signes depuis le CSV.
- Importer par lots compatibles avec le canal utilisé.
- Un succès SQL ne prouve pas que le JSON transporté était complet : un lot volumineux peut être tronqué silencieusement.
- Avant chaque insertion, vérifier que le nombre d'objets reçus égale exactement le nombre attendu.
- Suivre le total réellement inséré.
- En cas de lot tronqué, arrêter, compter en base, nettoyer seulement les lignes de l'œuvre concernée et recommencer avec de plus petits lots.
- Préférer une procédure idempotente ou transactionnelle ; ne jamais relancer aveuglément.
- Mettre la notice à jour seulement après validation du total final.

### 12. Audit Supabase obligatoire

Contrôler :
1. une seule fiche dans oeuvres ;
2. une seule notice de traduction correspondante ;
3. total attendu des segments ;
4. nombre distinct de segment_numero égal au total ;
5. minimum 1, maximum égal au total, zéro trou ;
6. aucun texte vide ;
7. aucune hiérarchie obligatoire vide ;
8. continuité des paragraphes par division ;
9. nb_signes égal à la somme des longueurs ;
10. répartition des natures ;
11. égalité appels-définitions des notes, par segment et globalement ;
12. existence de tous les id_verset ;
13. cohérence des métadonnées entre oeuvres et catalogue ;
14. lecture publique active ;
15. empreinte cryptographique du contenu Supabase identique au CSV.

L'empreinte couvre toutes les colonnes éditoriales dans un ordre stable. Si des champs de suivi sont ensuite modifiés, recalculer une empreinte excluant seulement fiabilite, provenance et date afin de confirmer que texte, structure, notes et liens n'ont pas changé.

### 13. Fiabilité et provenance

- Par défaut, un import IA reste probable.
- L'IA ne transforme jamais spontanément les segments en vérifié.
- Le passage global à vérifié est permis seulement après des contrôles documentés et une instruction humaine explicite confirmant la validation finale.
- La provenance nomme l'outil ou la personne ayant effectué la dernière passe. Ne pas conserver une valeur par défaut factuellement fausse.
- Toute validation actualise la date de marquage.
- Le statut bibliographique de la notice et la fiabilité éditoriale des segments doivent être cohérents.
- Un score bibliographique peut rester inférieur à 100 lorsque certaines données historiques demeurent prudentes, même si l'intégrité technique de l'import est parfaite.

### 14. Condition de clôture

Une œuvre n'est prête que si quatre couches concordent :
- fac-similé identifié ;
- DOCX corrigé et contrôlé visuellement ;
- CSV structuré, notes et liens audités ;
- Supabase complet, continu, accessible et identique au CSV.

Il est interdit de déclarer l'import complet sur le seul total annoncé par un script. Le total, la continuité, les notes, les liens et l'empreinte doivent être relus depuis Supabase.

=== FIN DE LA DEUXIÈME GRANDE ÉTAPE OCR, CSV ET SUPABASE ===


---

## 15. Traductions bibliques — édition unique et traçabilité

(Ajout du 18 juillet 2026)

**Règle d'édition unique.** Chaque traduction biblique intégrée au corpus doit être **strictement identique au texte d'une seule édition publiée**. Aucun mélange n'est toléré au sein d'une même traduction : ni panachage de sources ou de révisions, ni graphies mêlées (d'époque / modernisée), ni reconstitution approximative, ni complément emprunté à une autre édition. Si un verset manque ou est douteux, on laisse une **case vide** (honnête) ou l'on **supprime la traduction** — jamais on n'insère le texte d'une édition différente.

**Traçabilité obligatoire.** Toute traduction doit pouvoir être rattachée sans ambiguïté à son édition et à sa source. Les données éditoriales et pratiques d'identification sont consignées dans la table `editions_sources` : titre exact de l'édition, traducteur/éditeur, année et lieu, langue, confession, type et nom de source (dépôt / URL / fichier), licence, graphie, date d'extraction, particularités (p. ex. rendu du nom divin), et vérification d'intégrité.


---

## 16. Alignement des versets — contrôle intégral et points sensibles

(Ajout du 18 juillet 2026)

L'alignement de chaque traduction sur l'ossature canonique (AELF) doit être **contrôlé intégralement, verset par verset — jamais par simple sondage**. Un décalage constant (par ex. la seule suscription non comptée) ne suffit jamais : certains psaumes ont des **divergences internes de découpage** (ex. Ps 84, passereau/autels) qu'un décalage uniforme ne corrige pas.

Les emplacements où une erreur, un décalage ou une divergence a déjà été rencontré sont consignés dans la table `points_sensibles`. Ils doivent être **vérifiés systématiquement** à chaque import, et la table **enrichie** dès qu'un nouveau cas est découvert.

---

## 23. Reprise d'une édition ancienne par transcription du fac-similé — méthode validée sur la Genèse de Sacy (18 juillet 2026)

Méthode établie et éprouvée sur la **Bible de Sacy, Port-Royal, Paris 1730** (Gallica `bpt6k6532271m`, Tome I). Résultat obtenu sur la Genèse : **1 529 versets, 50 chapitres sur 50, zéro trou de numérotation, 299 versets enrichis d'italiques** — là où le texte OCR de départ plafonnait à 1 146 versets, 48 chapitres et des références fausses. **À appliquer telle quelle aux autres livres.**

### 23.1 — Principe directeur

**On ne répare pas un mauvais OCR : on retranscrit depuis l'image.**

Le texte « mode texte » de Gallica est un OCR automatique. Sur une impression de 1730, il détruit l'information au lieu de la dégrader : mots illisibles (`Vêlement` pour *l'élement*, `fivr!nt` pour *furent*), numéros de versets effacés, chapitres entiers absents. **Ce qui est détruit ne se reconstitue par aucun script** — mais reste parfaitement lisible sur le fac-similé. Le DOCX Gallica sert au repérage ; l'image fait autorité.

### 23.2 — Ce qui NE marche pas (constaté, ne pas refaire)

Quatre tentatives ont échoué et ont chacune **dégradé** le résultat. Elles sont consignées pour qu'on ne les retente pas :

1. **Filtre de plausibilité sur les numéros de versets** — rejette les numéros légitimes après une coupure OCR. Couverture 92 % → 78 %.
2. **Clamp de plausibilité sur les numéros de chapitres** — fabrique des chapitres fantômes (747 → 853 pour 785 attendus) sans récupérer un seul verset. Les chiffres romains de cette édition sont **fiables** : ne pas les « corriger ».
3. **Réécriture du regex d'extraction du romain** — effondrement total (344 blocs de livres au lieu de 26).
4. **Poser les italiques avant d'avoir réparé la structure** — l'italique, pourtant correctement relevée, atterrit sur une référence fausse. **Toujours : structure d'abord, enrichissement ensuite.**

Leçon générale : sur ce corpus, se méfier de ses propres heuristiques et **vérifier plutôt que deviner**.

### 23.3 — Procédure, étape par étape

**Étape 1 — Extraire les images de pages.**
Le PDF Gallica (250-280 Mo) dépasse les limites de lecture directe et sa couche texte est inexploitable (caractères mélangés). Mais chaque page est un **JPEG embarqué** qu'on extrait sans outil externe :
- `scripts/extrait-pages.mjs <tome> <p1> <p2> <sortie.pdf>` — découpe une plage (pdf-lib) ;
- `scripts/extrait-image.mjs <petit.pdf> <préfixe>` — en extrait les JPEG (~270 Ko, 1024×1404, très lisibles).

**Étape 2 — Calibrer la correspondance page imprimée / page PDF.**
Lire une page au hasard, relever le numéro imprimé et le titre courant. Pour le Tome I : **page imprimée = page PDF − 29**. *À recalibrer pour chaque volume.*

**Étape 3 — Transcrire par sous-agents, 8 pages par lot.**
Chacun écrit un JSON et ne renvoie qu'un résumé de 5 lignes : le contexte de l'orchestrateur ne paie pas les images. Consignes impératives au §23.4.

**Étape 4 — Fusionner** (`scripts/sacy-genese-fusion.mjs`) : recollage des versets à cheval sur deux pages, **dédoublonnage de la réclame** (voir §23.6), normalisation des lettrines.

**Étape 5 — Contrôler** avant tout chargement (§23.5).

**Étape 6 — Charger** (`scripts/sacy-genese-final.mjs`) : typographie française, table de correspondance vers le canon, `canon_id_fin` pour les versets couvrant deux slots.

**Étape 7 — Relire** (`scripts/sacy-genese-relecture.mjs`) : détection d'anomalies résiduelles, sans correction automatique.

### 23.4 — Consignes aux sous-agents (à reprendre mot pour mot)

- **Orthographe de l'édition conservée à la lettre** : `étoit`, `tems`, `païs`, `enfans`, `coupez`. Aucune modernisation.
- **Le « s long » (ſ) se transcrit `s`** — c'est la même lettre. C'est précisément là que l'OCR produit `font fous` pour *sont sous*.
- **`&` se transcrit `&`**, jamais « et ».
- **Italiques** (mots ajoutés par le traducteur, absents de la Vulgate) entourées de `<i>…</i>`.
- **Petites capitales ≠ italiques** (`SERONT BENIES`) : capitales normales, sans balise.
- **À écarter** : titre courant, numéro de page, réclames de bas de page, et **sommaires de section `§.`** — ces derniers sont en italique mais ce sont des titres éditoriaux.
- **Lettrine** : transcrire le mot normalement (`A` + `U COMMENCEMENT` → `AU COMMENCEMENT`).
- **Césures recollées** : `tene- bres` → `tenebres`.
- **Interdiction absolue d'inventer** : un mot illisible est marqué `[?]`. Une lacune signalée vaut mieux qu'une conjecture.

### 23.5 — Contrôles obligatoires

1. **Couverture par chapitre** contre `versets_canon`. Viser ≥ 99 %. En dessous de 95 %, ne pas charger.
2. **Continuité de la numérotation** : aucun saut à l'intérieur d'un chapitre. C'est le contrôle le plus révélateur.
3. **Jonctions entre lots** : vérifier qu'aucun verset n'est perdu ni dupliqué au raccord.
4. **Sondage de fidélité** : relire soi-même 2 ou 3 pages et confronter à la transcription du sous-agent. Non négociable.
5. **Détection des mauvaises lectures** par lexique : constituer un lexique français à partir des traductions déjà en base (TR0002, TR0003), puis signaler tout mot absent dont une permutation `u/n`, `i/l` ou `c/e` donne un mot valide.
6. **Balises `<i>` équilibrées**, `[?]` résiduels, césures non recollées, mots répétés.

### 23.6 — Pièges rencontrés, et leur traitement

**a) Réclames de bas de page.** Ces éditions impriment en bas de page le premier mot de la page suivante. Recollés tels quels, on obtient `les animaux qui qui y sont`. **Règle de fusion** : si le dernier mot d'un fragment est identique au premier du suivant, n'en garder qu'un.

**b) Confusions `u`/`n` maquillées en coquilles.** Les sous-agents ont présenté `lorsqne`, `tons`, `plns`, `jonr` comme « coquilles de l'impression fidèlement conservées ». Vérification sur l'image : l'original porte `lorsque tous`. La consigne « conserve les coquilles » peut servir d'alibi à une mauvaise lecture. **Toujours recouper au lexique, puis trancher sur l'image.**

**c) Étendue des italiques tronquée.** Un relevé donnait `&` là où l'édition met `& adora le Seigneur` en italique. **Vérifier les spans courts.**

**d) Lettrines en casse mixte.** `SAra`, `LE ciel` — la grande initiale suivie de petites capitales que le texte brut ne sait pas rendre. Normaliser en casse ordinaire : *Sara*, *Le ciel*.

**e) Vraies coquilles de l'édition, à PRÉSERVER.** `lui dit dit` (Gn 3, 9), `pareeque`, `frerre`, `boive..`. Confirmées par deux lectures indépendantes. **Ne pas corriger : c'est le texte.**

### 23.7 — Versification propre à l'édition : la mapper, jamais la corriger

**Erreur commise, à ne pas reproduire** : ayant constaté que Gn 5 n'avait que 31 versets contre 32 dans la Vulgate, j'ai *scindé* le verset 31. Vérification faite sur le fac-similé, l'édition imprime bien **31 versets** — je réécrivais l'édition au lieu de la respecter. L'intervention a été annulée.

**Règle** : le découpage de l'édition est conservé tel quel dans `ch_orig`/`v_orig` ; le rattachement au canon se fait par une **table de correspondance explicite et documentée**, et `canon_id_fin` sert aux versets couvrant deux slots vulgates.

Divergences relevées dans la Genèse de Sacy 1730 :

| | Édition 1730 | Vulgate | Traitement |
|---|---|---|---|
| Gn 5 | 31 v. | 32 | v.31 couvre Vulg. 5,31-32 (`canon_id_fin`) |
| Gn 31 | 55 v. (division hébraïque) | 54 | v.55 → `GEN.32.1` |
| Gn 32 | 32 v. | 33 | décalage +1 |
| Gn 37 | 35 v. | 36 | v.28 couvre Vulg. 37,28-29 ; suite +1 |
| Gn 49 | 32 v. | 33 | v.30 absorbe Vulg. 49,32 ; v.32 → `GEN.49.33` |
| Gn 50 | 25 v. | 26 | le v.26 n'est pas imprimé |

Le contrôle décisif est **arithmétique** : 55 + 32 = 54 + 33 = 87. Quand les totaux concordent, il s'agit d'une différence de découpage, pas d'une perte.

### 23.8 — Rendement

58 pages traitées en ~5 minutes par 4 à 8 sous-agents parallèles, contre 3 pages par message en traitement direct. La transcription intégrale coûte environ 8 pages par lot (contre 15 pour un simple relevé d'italiques). **Toujours faire écrire le résultat dans un fichier** et n'exiger qu'un résumé : sans cela, le contexte de l'orchestrateur est saturé en trois pages.

### 23.9 — Pas de capitales dans le texte des versets (règle éditoriale)

**Aucun mot, syntagme ni phrase en capitales dans `texte`.** Les éditions anciennes emploient les capitales et petites capitales comme signal d'insistance (lettrines, salutations d'épîtres, titres de section, nom divin) : cette mise en relief est un fait d'impression, pas un fait de texte. On la ramène en bas de casse.

Traitement appliqué le 18 juillet 2026 aux trois traductions en base (Sacy, Segond, Crampon) — script `scripts/bas-de-casse.mjs` :

- `AU COMMENCEMENT Dieu crea` → `Au commencement Dieu crea`
- `SERONT BENIES EN VOUS` → `seront benies en vous`
- `QUE LA GRÂCE DU SEIGNEUR JÉSUS SOIT AVEC VOUS` → `Que la grâce du Seigneur Jésus soit avec vous`

**Exceptions conservées** : les noms propres gardent leur majuscule initiale, y compris composés (`Jésus-Christ`) ; une majuscule de début de phrase est rétablie après ponctuation forte.

**Trois pièges, tous rencontrés à la mise au point :**

1. **Ne pas identifier les noms propres par « mot vu une fois en majuscule »** : `vous`, `seront`, `point` apparaissent capitalisés après une virgule et seraient promus à tort. Retenir un mot comme nom propre seulement s'il est **majoritairement** capitalisé dans le corpus déjà relu (seuil retenu : au moins 3 occurrences et 5 fois plus de formes hautes que basses).
2. **Filet de sécurité pour les noms propres rares** : un mot en capitales **absent du lexique des mots communs** est présumé nom propre et capitalisé, jamais abaissé. Sans cela, `NEPHTHAR` devient `nephthar`.
3. **Découper en mots entiers**, pas par expression régulière sur les capitales : sinon `L'Ange` est vu comme `L'A` + `nge` et devient `l'ange`. De même, un mot d'une seule capitale (`À`) ne se traite que s'il prolonge une suite en capitales, et seule une ponctuation forte rompt cette suite.

### 23.10 — Sauvegarder l'état antérieur avant toute écriture de masse

**Avant toute passe qui réécrit `texte` sur plus de quelques dizaines de versets, exporter l'état antérieur dans un fichier JSON** (`id`, `canon_id`, `texte`), et le conserver le temps de la vérification.

Motif : le 18 juillet 2026, la passe de bas-de-casse a modifié 299 versets de la Crampon — le **référent** — dont 285 sans relecture visuelle. La vérification a conclu à l'absence de dégât, mais **par raisonnement indirect** (les mots suspects étaient encore capitalisés, donc non touchés), faute de pouvoir comparer avant/après. Un simple export préalable aurait rendu le contrôle immédiat et certain.

Règle pratique : `select id, canon_id, texte` filtré sur la traduction → fichier daté, avant le premier `update`. Le contrôle consiste ensuite à ne relire que les lignes réellement différentes, ce qui est à la fois plus rapide et plus sûr que d'inspecter la table entière.

### 23.11 — Passe typographique française, systématique à chaque chargement

**Tout livre chargé passe par `scripts/typographie.mjs` (fonction `corrigerTypographie`), sans exception.** Elle est appelée par `sacy-charge.mjs` et peut être rejouée seule sur une traduction entière : `node scripts/typographie.mjs TR0001`. Elle est **idempotente** — la relancer sur un texte déjà propre ne change rien.

Règles appliquées :
- **pas d'espace avant `,` ni `.`** — les transcriptions restituent l'espacement de l'imprimé de 1730 (`vases ,`), qu'il faut ramener à l'usage moderne ;
- **insécable (U+00A0) avant `; : ! ?`** et **à l'intérieur des guillemets** `« … »` ;
- pas d'espace intérieure aux parenthèses ; espace unique partout ; apostrophes courbes ;
- pas d'espace parasite autour des balises `<i>`.

⚠️ **Piège vérifié deux fois : ne jamais saisir l'espace insécable en caractère littéral.** Une constante `const NB = ' '` s'était révélée contenir une espace *ordinaire*, laissant 431 points-virgules mal espacés sur trois livres sans que rien ne le signale — les deux caractères sont visuellement identiques. Toujours écrire ` `, et vérifier par comptage (`texte.split(' ').length - 1`), jamais à l'œil.

État au 18 juillet 2026 après passage : Sacy, Segond et Crampon à **0** espace avant virgule, **0** point-virgule collé, **0** espace double, **0** apostrophe droite.

### 23.12 — Localiser une fusion de versets sans relire la page : le test de rupture

Quand un chapitre de l'édition compte **un verset de moins** que le canon, il faut savoir *où* la fusion tombe : avant ce point la correspondance est directe, après elle décale d'un rang. Plutôt que de relire la page, `scripts/sacy-fusion-point.mjs` teste **toutes les positions de rupture possibles** et retient celle qui maximise l'accord de contenu avec la Crampon.

Lecture du résultat :
- **rupture au milieu du chapitre, gain net (> 0,05)** → fusion localisée, à traduire par `canon_id_fin` ;
- **rupture en fin de chapitre, gain nul** → l'alignement est 1:1 sur toute la longueur, et c'est le **dernier** verset du canon qui n'a pas d'équivalent. La correspondance directe est alors la bonne.

Appliqué aux Nombres (18/07/2026), il a résolu d'un coup les chapitres 11, 20, 23, 25 et 26 — 175 versets qui étaient marqués à vérifier. Le second cas de figure s'est révélé le plus fréquent, avec trois explications distinctes :
- le verset du canon est **vide** (Nb 26, 66) ;
- c'est un **fragment** que la Vulgate rattache au chapitre suivant (Nb 25, 19) ;
- il n'est **pas imprimé** — saut de numérotation de l'édition (Nb 23, 15).

⚠️ Le test dit *où*, jamais *pourquoi*. Pour Nb 11 il indiquait une correspondance directe ; la lecture de la page 172 a montré que le v.34 de l'édition **absorbe** le v.35 du canon (« ils vinrent à Haseroth, où ils demeurerent ») — d'où un `canon_id_fin` que le test seul n'aurait pas fait poser. **Une vérification sur le fac-similé reste nécessaire pour trancher la nature de l'écart.**


### 23.13 — Traiter plusieurs livres en un seul train

À partir de Josué (18/07/2026), les lots ne suivent plus les frontières de livres : ils couvrent des **pages contiguës**, et **chaque verset porte un champ `livre`** que le transcripteur lit sur le titre courant.

C'est un renversement de méthode. Auparavant il fallait deviner où un livre s'arrêtait *avant* de découper les lots — une erreur de découpage coûtait une re-transcription. Désormais les frontières se **constatent** après coup : `sacy-fusion.mjs` filtre sur le code du livre demandé et écarte le reste. Un même train de lots sert donc plusieurs livres, chacun fusionné séparément.

Deux garde-fous indispensables :
- **Le titre courant ment sur le chapitre, jamais sur le livre.** C'est vérifié sur des dizaines de pages : le numéro de chapitre de l'en-tête est faux environ une page sur trois, le nom du livre est toujours juste. Les chapitres se prennent sur les lignes « CHAPITRE … », le livre sur l'en-tête.
- **Le fichier de sortie porte le code du livre** (`<prefixe><CODE>_transcrit.json`), sans quoi la fusion suivante écrase silencieusement la précédente.

Prévoir un lot de rattrapage : le dernier livre d'un train déborde presque toujours du dernier lot. Josué/Juges/Ruth a demandé un 9ᵉ lot pour les quatre dernières pages de Ruth.

### 23.14 — Un écart de nombre n'est pas toujours un écart de versification

**Avant de construire la moindre correspondance, vérifier si les versets du canon en cause sont VIDES chez le référent.**

Josué 21 comptait 43 versets contre 45 au canon, les Juges 21 en comptaient 24 contre 25. Les deux ressemblaient à des fusions à localiser. En réalité **Jos 21, 44-45 et Jg 21, 25 sont vides dans la Crampon** : l'alignement était 1:1 sur toute la longueur, et il n'y avait rien à faire.

Sans ce contrôle, on part chercher un point de fusion qui n'existe pas — et le test de rupture (§23.12), n'ayant rien de mieux à proposer, en désigne un au hasard. C'est un piège coûteux : deux des quatre écarts de ce train.

### 23.15 — Quand l'édition SCINDE un verset du canon

Cas inverse de `canon_id_fin`, rencontré pour la première fois dans Josué : **deux versets de l'édition correspondent à un seul verset du canon** (Jos 4, 23+24 → canon 4, 23 ; Jos 5, 14+15 → canon 5, 14).

⚠️ **Ne jamais dédoublonner par `canon_id`.** Le chargeur écartait auparavant les doublons en gardant le premier : appliqué ici, il aurait **perdu deux versets entiers sans rien signaler**. C'est le type de perte qu'aucun contrôle de couverture ne rattrape, puisque le compte de créneaux reste juste.

La bonne conduite : conserver les deux lignes, leur donner un `ordre_slot` (1, 2, …) dans l'ordre de l'édition, et le consigner dans `notes`. La page Polyglotte les affiche déjà à la suite dans un même créneau, triées par `ch_orig, v_orig`.

### 23.16 — Trois contrôles ajoutés à la fusion

**Césures restées ouvertes.** Des « par- tage », « con- cevrez » avaient traversé tous les contrôles précédents. Les traits d'union authentiques de 1730 (« mer-rouge », « de-peur », « païs-ci ») n'ont **jamais d'espace après le trait** : seul « - » suivi d'une espace est suspect. La soudure n'est appliquée que si elle donne un **mot attesté** dans le lexique Segond/Crampon ; sinon le cas est signalé sans être tranché. Sur Josué/Juges/Ruth : 7 recollées automatiquement, 2 soumises à décision — les deux justifiées (« extermineront », « enfuyoient », absentes du lexique moderne).

**Numéro imprimé deux fois sur une même page.** Deux fragments d'un même verset sur deux pages différentes, c'est une coupure de page à recoller. Sur **une même page**, c'est que l'édition a imprimé deux fois le même numéro — les recoller fusionnerait deux versets distincts en un seul. Le cas s'est présenté en Jg 10, où le v.11 est imprimé « 12. ». Détecté, puis renuméroté d'après le contenu, qui correspondait exactement au v.11 du canon.

**Liste blanche des formes de 1730.** « piés », « défirent », « dormit », « suc », « élire », « cedât », « perie », « grans » sont d'authentiques formes de l'édition que le lexique moderne ne connaît pas. Sans liste blanche elles remontent en « lecture suspecte » à chaque livre et **noient les vraies erreurs**. Sur ce train, le filtre a ramené 36 signalements à 6 — les 6 étant tous de véritables erreurs de lecture.

### 23.17 — Résultat du train Josué / Juges / Ruth (18/07/2026)

65 pages (253-321), 9 lots, 1 360 versets. Josué 657, Juges 618, Ruth 85 — **couverture 100 % sur les trois livres, 0 alignement en attente de vérification**.

Corrections de lecture retenues : 11 au total, toutes des erreurs de **lecture du fac-similé** (ſ lu f, n lu u, apostrophe lue l), vérifiées une à une sur leur contexte. Les coquilles propres à l'édition (« mont fait », « aux autres homme », « grans services ») sont **conservées** : ce sont des faits d'édition, pas des erreurs de transcription.

Sacy compte désormais **7 203 versets sur 8 livres** du Tome I.

### 23.18 — L'ordre des passes : une correction peut échouer en silence

Défaut découvert le 18/07/2026, en relisant un simple verset affiché — **aucun contrôle automatique ne l'avait vu**.

Les corrections de lecture (`LECTURES`) s'appliquent au texte **brut du transcripteur**, qui porte l'apostrophe **droite**. Or plusieurs motifs étaient écrits avec l'apostrophe **courbe** (`Mon fi’s`, `ajourd’hui`, `l’Egyte`, `par’a`) : ils ne rencontraient donc jamais le texte. La passe typographique, exécutée *ensuite*, convertissait l'apostrophe — et le défaut se retrouvait figé en base, avec une apostrophe d'apparence correcte.

Quatre corrections ont ainsi été perdues sans le moindre signalement, dans des livres déclarés vérifiés. Deux mesures, toutes deux en place :
- **normaliser l'apostrophe AVANT d'appliquer les `LECTURES`**, dans `sacy-charge.mjs` ;
- **signaler tout motif de `LECTURES` resté sans effet** — un motif qui ne trouve rien est soit déjà corrigé, soit mal écrit, et les deux méritent un coup d'œil.

⚠️ **La règle générale** : quand deux passes se succèdent, se demander si la première peut rendre la seconde inopérante — ou l'inverse. C'est le même piège que l'espace insécable saisie en littéral (§23.11) : une transformation qui *paraît* s'appliquer et ne s'applique pas. Ces défauts-là ne se voient pas dans les compteurs, seulement à la lecture du texte.

**Corollaire** : lire réellement quelques versets rendus, à la fin de chaque livre. Les trois défauts les plus coûteux du projet (italiques posées avant la réparation de structure, espace insécable en littéral, apostrophe courbe dans les motifs) ont tous été trouvés à l'œil, jamais par un contrôle.

Passe de rattrapage du 18/07/2026 sur les huit livres déjà chargés : 5 corrections de lecture perdues rétablies, 16 césures de fin de ligne restées ouvertes recollées (« fem- me », « d’ê- tre », « commande- ment »). Contrôle final sur les 7 203 versets : **0 césure ouverte, 0 apostrophe droite, 0 capitale, 0 balise déséquilibrée, 0 défaut typographique, 0 verset vide**.

### 23.19 — L'audit périodique : `scripts/audit-traduction.mjs`

```
node scripts/audit-traduction.mjs [TR0001] [--verbeux]
```

À lancer après chaque livre chargé, et de temps en temps sur l'ensemble. Il répond à trois questions : quelle est la couverture réelle du canon, les créneaux non couverts sont-ils justifiés, le texte est-il propre.

**Le cœur de l'outil est la deuxième question.** Un livre affiché « 100 % » peut cacher un décalage d'alignement. C'est ainsi qu'a été découvert, le 18/07/2026, que l'édition **fusionne Gn 50, 22 et 23** : la fusion n'ayant jamais été localisée, les trois versets suivants étaient rattachés à un créneau trop bas et **s'affichaient en face des mauvais versets de la Crampon**, tandis que Gn 50, 26 restait vide. La Genèse était le seul livre chargé avant la mise au point du contrôle de couverture.

Trois principes de conception, chacun né d'un faux résultat :

1. **Une plage `canon_id → canon_id_fin` couvre aussi les créneaux intermédiaires.** Ne compter que les deux bornes fait remonter l'intérieur comme « manquant » (Ex 40, 14 signalé à tort).
2. **Ne jamais arrondir à 100 %** tant que la couverture n'est pas exactement complète. C'est l'arrondi qui masquait les trous de la Genèse.
3. **Distinguer le trou du travail restant.** Les créneaux situés au-delà du dernier verset transcrit d'un livre en cours ne sont pas des défauts d'alignement. Sans cette distinction, les 210 créneaux non encore transcrits de 2 S noyaient les 3 vrais cas sous du bruit. Réserve nécessaire : **un créneau vide chez le référent n'est jamais du travail restant**, même en fin de livre — sans quoi Jg 21, 25 ferait passer un livre achevé pour inachevé.

Les trois créneaux aujourd'hui non couverts et justifiés :
- **Gn 49, 32** — contenu absorbé dans Gn 49, 30 de l'édition, de façon non contiguë (`canon_id_fin` ne peut pas l'exprimer) ;
- **Nb 23, 15** — verset non imprimé, saut de numérotation de l'édition ;
- **Nb 25, 19** — fragment que la Vulgate rattache au chapitre suivant.

⚠️ **Cette liste doit rester courte et chaque entrée doit être justifiée par écrit.** Une entrée qu'on ne sait pas expliquer est un défaut, pas une singularité.

### 23.20 — Coquilles de numérotation : distinguer deux choses qui se ressemblent

Le train des Rois (1 S) en a livré six d'un coup, et la distinction est capitale :

- **Une coquille de NUMÉROTATION** — l'édition imprime deux fois le même chiffre, ou un chiffre faux (1 S 1, 16 imprimé « 15 » ; 17, 20 imprimé « 10 » ; 27, 7 imprimé « 8 »). Elle se corrige **à la source**, dans le fichier de lot, après vérification du contenu contre le référent, et se consigne dans les `notes` de la page.
- **Un écart de VERSIFICATION** — l'édition et le canon découpent le texte différemment (1 S 20, 43 → canon 21, 1). Il se cartographie dans la table de `sacy-charge.mjs`, **jamais** en retouchant la transcription (§23.7).

Confondre les deux, c'est soit corrompre la transcription, soit inventer une frontière qui n'existe pas.

Deux contrôles indépendants les débusquent, et il faut les deux : le **détecteur de numéros en double sur une même page** (§23.16) et le **saut de numérotation**. Le premier a manqué 1 S 20, 37 — imprimé « 17 », en double avec le vrai v. 17 mais sur la page précédente ; le second l'a rattrapé.

Le **contrôle arithmétique** reste le juge des frontières : 1 S 20-21 fait 43 + 15 côté édition et 42 + 16 côté canon, soit 58 des deux côtés. La frontière était donc bien là, et la vérification mot pour mot contre la Crampon l'a confirmée.

### 23.21 — Quand l'édition CONDENSE deux versets du canon : la scinder, en gardant sa numérotation

Règle arrêtée le 19 juillet 2026, sur Néhémie. Elle vaut pour toute édition ancienne, et **prime sur `canon_id_fin`**.

**Le défaut à éviter.** Lorsque l'édition réunit en un seul verset ce que le canon compte double, on marquait jusqu'ici une plage : `canon_id` = premier créneau, `canon_id_fin` = second. À l'écran, **le second créneau reste vide** — et comme la colonne se décale d'un cran, toutes les traductions cessent d'être alignées jusqu'au point où l'édition se recolle. Un seul verset condensé suffit à fausser vingt-cinq versets de lecture parallèle.

**La règle.** On **coupe** le verset de l'édition en autant de parts qu'il couvre de créneaux. Chaque part reçoit son propre `canon_id` ; **toutes gardent la numérotation d'origine** (`v_orig` inchangé, distingué par `v_orig_suffixe` = a, b, c…).

Le lecteur voit alors « 30 » deux fois de suite dans la colonne de l'édition — ce qui est **la vérité de l'édition** — et les traductions restent en regard — ce qui est **la vérité du canon**. Rien n'est inventé, rien n'est masqué.

**Le point de coupe se désigne par son TEXTE, jamais par une position.** Il reste ainsi vérifiable à l'œil nu, et une coupe devenue introuvable (après une correction de lecture, par exemple) est **signalée** au lieu de glisser en silence sur quelques mots. Table `SCISSIONS` dans `scripts/sacy-charge.mjs`.

**Le cas symétrique : le surnuméraire déclaré.** L'édition coupe parfois là où le canon ne coupe pas — Sacy arrête son Ne 7, 43 au milieu d'un nom (« Cedmihel fils ») et ouvre le 7, 44 sur « d'Oduïa, au nombre de soixante & quatorze ». La première moitié garde le créneau ; **la seconde devient surnuméraire** (`canon_id` nul, affichée en violet). La forme propre de l'édition est conservée, et le décalage qui suivait disparaît. Table `SURNUMERAIRES`.

**Ces deux figures se compensent souvent dans un même chapitre.** En Ne 7, la coupe du v. 44 ouvre un décalage que la condensation du v. 48 referme quatre versets plus loin : les deux éditions comptent 73 versets, et l'écart n'est visible qu'entre les deux points. **Un chapitre dont les totaux concordent peut donc être désaligné en son milieu** — le compte de versets ne prouve rien, seule la comparaison de contenu verset par verset le montre.

**Conséquence sur la suppression avant rechargement.** Le chargeur filtrait sur `canon_id` (`like 'NEH.%'`). Les surnuméraires ayant un `canon_id` nul, ils **échappaient à la suppression et se seraient ajoutés en double** au rechargement suivant. Filtrer sur `livre`, jamais sur `canon_id`.

**Reste à traiter.** Cinq plages `canon_id_fin` subsistent, héritées d'avant cette règle, et demandent le même traitement : Ex 40, 13 · Lv 26, 45 · Nb 11, 34 · Jos 2, 23 · 1 P 20, 7 · Jb 42, 16. Chacune exige de déterminer le point de coupe en confrontant le verset au référent — c'est un acte éditorial, à ne pas deviner en série.

### 23.22 — Tome II : calibrage et plan de campagne (19 juillet 2026)

Le tome I est ACHEVÉ : transcrit de la Genèse à l'Ecclésiastique, 908 pages imprimées, 47 lots.

**Fichier.** `bpt6k6532271m.pdf` est le tome I ; `bpt6k65321162.pdf` est le **tome II** — 241 Mo, 826 pages PDF. La table `FICH` de `extrait-pages.mjs` les associe déjà correctement ; ne pas les intervertir, les noms de fichiers Gallica ne le disent pas.

**Calibrage : page imprimée = page PDF − 6.** (Le tome I était − 29 : le décalage est propre à chaque volume, il se recalibre toujours.) Vérifié en trois points éloignés, ce qui écarte toute dérive due à une planche insérée :

| page PDF | page imprimée | contenu relevé |
|---|---|---|
| 30 | 24 | Isaïe, chap. XXIV |
| 300 | 294 | Habacuc, chap. III |
| 390 | 384 | Machabées, livre II, chap. XV |
| 745 | 739 | Apocalypse, chap. XXII |

**Étendue du texte biblique : pages imprimées 1 à 740** (PDF 7 à 746), soit **740 pages** — c'est-à-dire à peu près autant que tout le travail déjà accompli. Au-delà de la page 740 : un « Abrégé » chronologique, une « Table des matières » repaginée en chiffres romains, une table du propre des saints, et le Privilège du Roy. **Rien de tout cela ne se transcrit.** Il n'y a pas de table des livres en tête de volume — inutile de la chercher.

**Articulation du volume**, établie par sondage ; les frontières exactes se constateront après coup, conformément au §23.13 :

| pages imprimées | contenu |
|---|---|
| 1 – ~293 | Isaïe, Jérémie, Lamentations, Baruch, Ézéchiel, Daniel, puis les petits prophètes jusqu'à Habacuc |
| ~294 – ~310 | Sophonie, Aggée, Zacharie, Malachie |
| ~310 – ~386 | 1 et 2 Machabées (fin de l'Ancien Testament) |
| ~387 – 740 | **Nouveau Testament**, de saint Matthieu à l'Apocalypse |

**Le titre courant des Machabées porte « LIV. I » / « LIV. II »**, comme celui des Rois. Même traitement qu'au §23.7 : le livre se lit sur l'en-tête, le numéro de livre s'y lit aussi, mais le numéro de CHAPITRE de l'en-tête reste faux une page sur trois.

**Codes de livre à donner aux transcripteurs.** Ils écrivent le code, pas le nom — c'est lui qui permet à la fusion de filtrer :
ISA Isaïe · JER Jérémie · LAM Lamentations · BAR Baruch · EZK Ézéchiel · DAN Daniel · HOS Osée · JOL Joël · AMO Amos · OBA Abdias · JON Jonas · MIC Michée · NAM Nahum · HAB Habacuc · ZEP Sophonie · HAG Aggée · ZEC Zacharie · MAL Malachie · 1MA et 2MA Machabées.
Nouveau Testament : MAT · MRK · LUK · JHN · ACT · ROM · 1CO · 2CO · GAL · EPH · PHP · COL · 1TH · 2TH · 1TI · 2TI · TIT · PHM · HEB · JAS · 1PE · 2PE · 1JN · 2JN · 3JN · JUD · REV.

**Points de vigilance propres à ce volume.**
- **Baruch** porte la Lettre de Jérémie en son chapitre 6 ; le canon la compte à part (code LJE). À trancher au chargement, pas à la transcription.
- **Daniel** : Suzanne, Bel et le Cantique des trois enfants sont dans la Vulgate au fil du texte, mais le canon leur donne des codes propres (SUS, BEL, S3Y). Même règle : on transcrit ce qu'on voit, on tranche au chargement.
- Le Nouveau Testament de Sacy est **abondamment annoté en marge** ; les notes ne sont pas du texte biblique.

**Volume de travail.** À 8 pages par sous-agent, 740 pages font environ **93 lots**, soit une dizaine de trains. C'est le double de ce qu'a demandé la fin du tome I.

---

## 24. Les liens bibliques vivent en table (20 juillet 2026)

**Cette section prime sur le §9 pour tout ce qui touche au PORTAGE des liens. La distinction éditoriale des quatre types, elle, est inchangée : §9.1 à §9.4 restent la référence.**

### 24.1 — Ce qui change, et ce qui ne change pas

Les liens ne sont plus des chaînes de caractères dans `segments.lien_1` à `lien_4`. Ils occupent la table **`liens_bibliques`, une ligne par lien**. Les quatre types sont conservés à l'identique, dans la colonne `type` (1 à 4) :

| type | §9 | sens |
|---|---|---|
| 1 | §9.1 | citation exacte |
| 2 | §9.2 | texte biblique fondu dans le discours de l'auteur |
| 3 | §9.3 | commentaire doctrinal |
| 4 | §9.4 | écho thématique |

**Motif du changement.** Les quatre colonnes texte cumulaient trois défauts. Aucune intégrité : un identifiant supprimé du canon y restait sans que rien ne le signale — la reprise d'ossature des Ps 49 et 100, le même jour, a retiré `PSA.49.24` et `PSA.100.9`. Une seule fiabilité pour tout le segment, alors qu'on juge un lien, pas un segment. Et une recherche inverse en `ilike '%GEN.1.1%'` sur 136 770 lignes, qui ramenait `GEN.1.10` à `GEN.1.19` par-dessus le marché.

### 24.2 — La cible d'un lien : une et une seule

La contrainte `cible_unique` impose exactement une cible parmi trois :

- **`canon_id`** — un créneau de l'ossature (clé étrangère vers `versets_canon`, en `ON DELETE RESTRICT`) ;
- **`verset_v2_id`** — un verset **surnuméraire**, hors ossature (les pluses de la Vulgate chez Sacy, par exemple) ;
- **`livre` + `chapitre`** — un renvoi au chapitre entier, quand l'auteur ne vise pas un verset précis.

Ou **aucune** des trois, mais alors `fiabilite = 'à constituer'` **et** `motif` obligatoire : la référence est connue, elle n'est pas encore résolue. C'est ce qui remplace l'ancienne valeur « Lien à constituer ».

### 24.3 — Vocabulaire unique de la fiabilité

Un seul jeu pour tout le corpus, en base comme à l'écrit : **`à constituer` · `douteux` · `probable` · `vérifié`**.

Disparaissent : « erreur probable » (qui disait « douteux » autrement) et « Lien à constituer » (qui mêlait un état d'avancement à un degré de confiance). `segments.fiabilite` est aligné sur ce jeu et **vidé** : la fiabilité se porte au lien.

### 24.4 — Traçabilité

`provenance` vaut `ia` ou `editeur`, `arbitrage_requis` signale ce qui attend une relecture, `motif` porte en une phrase ce qui fonde le rattachement, et les horodatages sont automatiques. **Une passe automatique peut ainsi être rejouée sans écraser les arbitrages humains** — ce que l'ancien modèle ne permettait pas : les 12 640 « vérifié » effacés le 20 juillet 2026 étaient indiscernables de ceux qu'une machine avait posés.

### 24.5 — Accès depuis le code

Tout passe par `app/lib/liens.ts` — `liensDeSegments`, `segmentsLiesAuVerset`. **Ne jamais requêter `lien_1` à `lien_4` dans du code neuf.** La fonction `hydraterLiensHerites` reconstitue ces colonnes en mémoire pour les écrans anciens : c'est un adaptateur transitoire, pas un modèle à suivre.

### 24.6 — Natures de segment

`segments.nature` accepte désormais : `texte` · `citation` · `lemme` · `vers` · `rubrique` · `separateur` · `apparat_critique` · `texte absent`.

Les trois nouvelles répondent à des cas constatés : **`lemme`**, le verset commenté cité en tête (les *Annotations sur Job* d'Augustin en comptent 733) ; **`vers`**, la poésie dont l'arbitrage n°10 impose de respecter la forme ; **`rubrique`**, l'indication rituelle distincte des paroles prononcées.


---

## 25. Constitution des liens bibliques — méthode

Ordonnée **du plus sûr au plus incertain**. Chaque passe ne traite que ce que la précédente n'a pas su faire : on ne devine jamais ce qu'on peut lire. Le journal (§25.9) donne le rendement réel de chacune ; les impasses (§25.8) évitent de refaire les essais ratés.

### 25.0 — Deux règles qui priment sur tout

**1. La machine propose, l'éditeur dispose.** Aucune PASSE AUTOMATIQUE n'écrit jamais `fiabilite = 'vérifié'` : un score, si haut soit-il, ne juge pas.

*Amendement du 24 juillet 2026.* « Vérifié » cesse d'être réservé au seul jugement de l'administrateur : il couvre désormais tout lien **effectivement lu et confronté au verset dans nos traductions**, que le lecteur soit l'auteur du site ou l'assistant. Ce qui fait la valeur du mot n'est pas la main qui l'écrit, c'est la lecture qu'il atteste. Il reste donc interdit à toute passe mécanique, et il engage : on n'écrit « vérifié » que sur ce qu'on a réellement lu, et « douteux » dès qu'on doute — la prudence de principe qui étiquette tout en « probable » ne renseigne personne. Une passe pose `provenance = 'ia'` (ou `'editeur'` si elle ne fait que lire une référence de l'édition), et tout ce qui n'est pas certain porte `arbitrage_requis = true`. **Une reprise n'efface que ce qu'une passe a posé, jamais un arbitrage humain** — c'est à cela que sert `provenance`.

**2. Un lien absent coûte moins cher qu'un lien faux.** Le premier se voit, le second se propage. Toute la méthode en découle : chaque fois qu'on a le choix entre manquer et forcer, on manque.

### 25.1 — Passe 1 : les références de l’édition (À FAIRE EN PREMIER — MAIS ELLES NE CONCLUENT PAS)

La plupart des éditions consignent elles-mêmes les références : entre parenthèses, ou en note. **Ce sont des pistes solides — ce ne sont pas des liens établis.**

*Arbitrage du 24 juillet 2026, qui tranche la contradiction entre cette passe et le §9.5.* Une référence d'éditeur indique **où regarder**, rien de plus : elle ne vaut pas identification, et **tout lien exige lecture**. Trois raisons, toutes constatées :

- **l'éditeur se trompe.** Sur l'Hexaéméron, « Ps. 64, 4 » désignait en réalité Ps 74, 4 ; « Eccl. 1, 14 » visait un créneau existant quand la phrase citée est en Qo 2, 14 — faux parfaitement silencieux ;
- **l'éditeur situe, il ne délimite pas.** Sa parenthèse vient en fin de phrase : le lien posé sur le contexte qui précède atterrit **un segment trop tôt** ;
- **l'éditeur ne signale qu'une part de ce qui est là.** Gn 1, 1 est cité ou commenté quinze fois dans la première homélie de Basile, sans une seule parenthèse.

En conséquence : cette passe pose `provenance = 'editeur'` **et `arbitrage_requis = true`**, toujours. Elle amorce le travail, elle ne le clôt jamais. Le rendement reste considérable — 3 268 liens sur la Somme — mais c'est un rendement de **candidats**. Sur la Somme théologique, une seule passe a produit **3 268 liens**, plus que tout l'appariement sur Job.

`node scripts/liens-references-editoriales.mjs <id_oeuvre> [--dry]` · `provenance = editeur`

**À FAIRE AVANT TOUT NETTOYAGE DU TEXTE.** Le §8 prescrit de supprimer les références pour la lisibilité : légitime, mais **seulement une fois les liens extraits**. Les *Annotations sur Job* d'Augustin ont été nettoyées d'abord — 734 segments sans une seule référence, tout a dû être reconstitué par appariement, avec ses approximations. Contrôle avant de toucher à une œuvre :

```sql
select count(*) filter (where segment_texte ~ '\([^)]*[0-9]') as refs_en_texte,
       count(*) filter (where notes is not null and notes <> '') as avec_notes
from segments where id_oeuvre = '…';
```

### 25.2 — Les cinq pièges de la lecture des références

Chacun a produit des faux SILENCIEUX — le créneau visé existe, la clé étrangère est satisfaite, et le lien est faux. Aucun ne se voit sans contrôle.

**1. Les psaumes sont en double numérotation** (§18). Notre ossature suit la numérotation grecque : `PSA.34` y est le Ps 35 hébreu. Les éditions françaises modernes citent en hébraïque. Sans conversion, « Ps 34, 16 » — « Les yeux du Seigneur sont fixés sur les justes » — atterrit sur `PSA.34.16`, qui dit « ils grincent des dents ». **Convertir par `versets_canon.ch_heb/v_heb`, et refuser plutôt que se rabattre sur le créneau direct quand la conversion échoue.**

**Et la conversion elle-même n'identifie rien.** Les éditions anciennes citent déjà à la grecque : les convertir décale chaque psaume d'un cran, en silence et dans l'autre sens — constaté sur l'Hexaéméron (éd. Auger), où « Ps. 106, 26 » désigne bien `PSA.106.26`. Mais la leçon n'est pas qu'il faudrait deviner le système de l'édition : **c'est que le numéro imprimé ne vaut jamais identification** (§9.5). On lit le passage, on reconnaît le verset à ce qu'il dit, et l'on écrit le créneau canonique. La conversion héb→grec ne sert qu'à **orienter la recherche** vers le bon voisinage, jamais à conclure.

**2. Les Rois selon la Vulgate.** Le système latin compte **1-2 Rois pour nos 1-2 Samuel**, et 3-4 Rois pour nos 1-2 Rois. « 4 Rois 4, 39 » (la coloquinte d'Élisée) est 2 Rois 4, 39. Une forme `Reg` isolée est ambiguë : ne jamais l'enregistrer, seulement les formes numérotées.

**3. Les livres numérotés.** « 1 Jn » doit être cherché ENTIER dans le dictionnaire (→ 1JN) : décomposer d'abord donne « Jn » → JHN, l'Évangile au lieu de l'épître. Et si le chiffre ne correspond à aucun livre jumeau (« 1 Jos »), **refuser** au lieu de deviner.

**4. Les renvois internes ne sont pas des livres.** « Ibid. 13, 14 », « Question 22. 48 », « Liv. III, 2 », « Hom. 4, 1 » renvoient au texte lui-même. Sans liste d'exclusion, ils sont cherchés dans la Bible et **finissent par y trouver quelque chose**. Sur la Somme : 415 écartés, sur Cyrille 43.

**5. Le chapitre doit exister.** Un lien au chapitre entier (« Lam 13 ») échappe au contrôle des versets. Un trigger de la base le refuse — mais il fait alors échouer TOUT le lot d'insertion. Valider avant d'écrire.

### 25.3 — La table d’équivalence des abréviations

**Chaque édition a ses conventions**, et une abréviation inconnue est une référence perdue en silence. La Somme écrit `1 Co`, L'Échelle du Paradis `1 Cor`, Cyrille cite en latin (`Joh`, `Petr`, `Reg`). Le dictionnaire était recopié dans chaque script, donc lacunaire dans chacun.

Il vit désormais en base : **`abreviations_bibliques`** — 234 formes, 3 systèmes (canonique / variante / toutes lettres), les 73 livres couverts. `forme` y est normalisée (minuscules, sans accent, espace ni point) : « 1 Cor. », « 1Cor », « 1 cor » sont la même clé.

| script | rôle |
|---|---|
| `abreviations-peupler.mjs` | alimente la table |
| `abreviations-inconnues.mjs` | **détecte ce qu’elle ignore**, par fréquence |

**Le second est l'outil clé.** Sur 132 809 segments il n'a trouvé que 14 formes inconnues — mais parmi elles, des choses qu'aucune liste de référence n'aurait données : formes latines (`Joh`, `Petr`, `Timoth`), `Nm`, et les coquilles d'OCR (`Rrn` pour `Rm`, `Jobe`, `Malache`). **C'est lui qui a révélé le piège des Rois.** Le lancer sur chaque œuvre nouvelle, avant la passe 1.

### 25.4 — Passe 2 : les formules d’introduction

Un Père annonce ce qu'il cite, et **nomme souvent le livre**. C'est le point décisif : le score lexical ne discrimine rien à lui seul, **ce qui fait tomber juste, c'est de restreindre le champ**. « L'Apôtre dit » ramène la recherche de 31 000 versets aux ~2 000 des pauliniennes — un facteur quinze sur le risque de rencontre fortuite.

`node scripts/liens-citations-introduites.mjs <id_oeuvre> [--dry]`

| formule | périmètre |
|---|---|
| le Psalmiste, David | PSA |
| saint Paul, l’Apôtre | les 14 pauliniennes |
| l’Évangile, le Sauveur, Notre-Seigneur | MAT MRK LUK JHN |
| le Prophète, Isaïe, Jérémie… | les 18 prophétiques |
| il est écrit, l’Écriture dit | **aucun** — tout le canon, donc seuil bien plus haut |

Seuils : **0,50** si le périmètre est nommé, **0,68** sinon. Rendement sur Job : 5 sur 20 — faible, mais c'est là qu'on atteint **ce qu'aucune autre passe ne trouve** : Ps 2, 11 et Ps 17, 29 cités au fil d'un commentaire sur Job.

### 25.5 — Passe 3 : l’alignement, pour les commentaires suivis

Réservée aux œuvres qui suivent un livre pas à pas (Augustin sur Job, les *Discours sur les Psaumes*). Reconnaître la forme d'abord :

```sql
select count(*) filter (where segment_texte ~ '[«"]') * 100 / count(*) as pct_guillemets
from segments where id_oeuvre = '…' and nature = 'texte';
```

À 0 %, les citations ne sont pas marquées : l'appariement n'a aucune prise.

⚠️ **Mais ce test mesure le BALISAGE, non la FORME de l'œuvre — ne pas confondre les deux** (audit du 24 juillet 2026). Un taux nul de guillemets ne dit pas qu'il n'y a pas de commentaire suivi : il dit que l'édition ne délimite rien. L'*Hexaéméron* de Basile est à 0 % **et** commente Genèse 1 verset par verset ; conclure au « problème de source » l'aurait écarté d'une passe qui lui convenait. Les deux axes se croisent, et c'est le §25.10 qui les articule : le balisage décide de **l'outil**, la forme décide de **la méthode**. Une œuvre sans balisage et sans forme suivie (Cyprien, Tertullien) ne relève d'aucune passe automatique — celle-là, seule la lecture la couvrira.

**Aligner la suite, ne pas apparier verset par verset.** Chercher pour chaque lemme le verset le plus ressemblant donnait **4 justes sur 9** au chapitre I de Job, dans un ordre incohérent (7, 7, 4, 6, 7, 11, 6, —, 21) là où la vérité était strictement croissante (3, 4, 5, 6, 7, 11, 12, 15, 21). Un commentaire suit son texte : **cette croissance est une preuve plus sûre que la ressemblance des mots**. Alignement des deux suites d'un bloc (programmation dynamique) → **7 justes sur 9**, à score identique.

Trois garde-fous :

- **Plancher d'appariement** : jamais deux textes sans un mot commun, sinon l'alignement comble les trous au hasard.
- **Le premier segment d'un chapitre est le plus exposé** : aucun voisin ne l'ancre à gauche. C'est l'unique erreur restante du chapitre I (Job 1, 1 au lieu de 1, 3). À relire en priorité.
- **Normaliser les graphies** : Sacy imprime en 1730, le traducteur d'Augustin écrit au XIXe (« alloient » / « allaient », « enfans » / « enfants »). `oi` → `ai` puis troncature à cinq lettres, **des deux côtés** — donc sans danger. Seul raffinement lexical qui ait payé : 95 → 126 appariements sûrs.

**Le score gradue la confiance, il n'écarte pas.** Une fois l'alignement en place, trois appariements corrects du chapitre I (v. 4, 5, 12) tombaient sous l'ancien seuil.

| score | fiabilité | arbitrage |
|---|---|---|
| ≥ 0,42 | probable | non |
| ≥ 0,15 | probable | oui |
| < 0,15 ou déduit | douteux | oui |

### 25.6 — Passe 4 : combler les trous par la position

Restent des lemmes qu'**aucun mot** ne rattache : « Le juste se nourrira de ce qu'il aura amassé » contre « L'affamé dévorera sa moisson » — même verset, paraphrase totale. L'ordre étant garanti, un lemme abandonné entre deux voisins alignés est **forcément** entre leurs deux versets. **Quand il ne reste qu'un seul créneau libre dans l'intervalle, la déduction n'a pas d'autre issue** : on le pose en `douteux`, avec un motif qui dit qu'aucun mot ne le fonde. 48 segments récupérés sur Job, 133 → 85 écarts.

S'il reste plusieurs créneaux libres, **on ne devine pas**.

### 25.7 — Signaler ce qui ne se rattachera jamais

Un Père cite les profanes, ses prédécesseurs, des écrits hors canon. **Ces renvois n'ont pas de `canon_id` et n'en auront jamais** ; les laisser chercher dans la Bible fabrique des faux — c'est ainsi qu'un verset de psaume s'est logé dans Job 38, 10.

On les consigne comme **liens SANS CIBLE**, `fiabilite = 'à constituer'` avec un motif préfixé `RÉFÉRENCE NON BIBLIQUE (genre) :` — la contrainte `cible_unique` prévoit ce cas (§24.2). Ils remontent dans la file d'arbitrage au lieu de se perdre. Trois genres : auteur profane, Père de l'Église, écrit hors canon.

**Piège** : une œuvre peut n'avoir aucune citation exploitable tout en portant ces renvois (Tertullien : 0 citation entre guillemets, mais Cicéron et Sénèque nommés). Sauter l'appariement, **jamais l'écriture**.

### 25.8 — Tenté sans gain : ne pas y revenir sans raison neuve

> **⚠ CES DEUX MESURES ONT ÉTÉ FAITES SUR JOB SEUL, ET NE VALENT PAS AILLEURS** (audit du 24 juillet 2026). Énoncées comme des lois, elles interdisaient ce qui marche. Les voici bornées à leur profil.

- **Plusieurs traductions** — gain nul *sur Job* (588 segments liés avant, 586 après). La conclusion d'alors (« les trois sont françaises et modernes, trop proches ») est **fausse** : Sacy date de 1667 et traduit la Vulgate, quand Segond et Crampon traduisent l'hébreu et le grec. Mesuré sur des œuvres à citations délimitées (`scripts/diag-traductions-appariement.mjs`) : **Sacy gagne 46 à 49 % des appariements et reste irremplaçable pour 52 à 65 liens par œuvre**, là où Segond ne l'est que pour 5 à 12. Ce qui compte n'est pas le nombre de traductions mais leur **famille textuelle** : une seconde traduction de la Vulgate vaut mieux que cinq faites sur les originaux.
- **Pondération par la rareté (IDF)** — gain nul *sur Job*, où l'appariement bute sur la paraphrase et non sur le vocabulaire. Mais c'est le cœur de `liens-cite-de-dieu.mjs`, la passe la plus productive du corpus : 528 liens sur *Contre Marcion*, 650 sur *Contre les hérésies*. **Elle est indispensable dès qu'il y a des citations délimitées** ; elle ne sert à rien quand il n'y en a pas. Le mot « gain nul » ne disait donc pas ce qu'il fallait entendre : il faut lire « aucun gain sur les commentaires suivis ».
- **Listes de synonymes** : n'aideraient pas. Le blocage n'est pas lexical mais tient à la **paraphrase** ; rapprocher « nourrira/amassé » de « affamé/moisson » demande de comprendre le sens.

**Angle mort assumé.** Les passes 3 et 4 ne voient que le lemme de tête, dans le seul chapitre annoncé. Sur Job : **668 citations secondaires**, dont beaucoup d'un AUTRE livre (1 Co 3, 1 cité en commentant Job 3). La passe 2 en récupère une partie ; le reste demande un modèle de langue — seul moyen d'atteindre les types 2 et 4, aujourd'hui presque vides. La route `/api/admin/triage-ia` juge déjà des liens ; elle pourrait en proposer. **Mesurer sur un chapitre ce qu'un tel passage trouve ET ce qu'il invente avant de l'étendre.**

### 25.9 — Contrôles, et journal des œuvres

```sql
-- cibles mortes (doit valoir 0)
select count(*) from liens_bibliques l left join versets_canon v on v.id = l.canon_id
where l.canon_id is not null and v.id is null;
-- rien de « vérifié » au sortir d'une passe automatique.
-- ⚠ Ce contrôle est devenu AVEUGLE depuis l'amendement du §25.0 : un lien
-- réellement lu s'écrit lui aussi `provenance = 'ia'`, faute d'une valeur qui
-- dise « lu ». Tant que `provenance` n'accepte pas 'lecture' (contrainte
-- `chk_liens_provenance`, DDL en attente), ce contrôle signale des liens légitimes.
select count(*) from liens_bibliques where fiabilite = 'vérifié' and provenance = 'ia';
-- aucun lien n’a fui vers un autre livre que celui commenté
select distinct split_part(canon_id,'.',1) from liens_bibliques where segment_id in (…);
```

Et **relire un chapitre à la main**, verset par verset, avant d’écrire le reste.

| œuvre | passe | liens | rendement |
|---|---|---|---|
| A0013O0002 — Thomas, *Somme théologique* | 1 (références) | **3 268** | 3 269 résolues sur 3 305 lues ; 415 renvois internes écartés ; 18 hors ossature. 32 367 segments. |
| A0010O0100 — Augustin, *Annotations sur Job* | 3, 4, 2 | 1 294 | 636 segments liés sur 734 (87 %), dont 48 déduits par position ; 85 sans mot commun ; 5 par formule. **Œuvre nettoyée de ses références avant extraction** — d’où le recours à l’appariement. |
| A0044O0001 — Cyrille, *Catéchèses* | 1 | 63 | 64 résolues, 34 au chapitre entier ; 43 renvois internes écartés. |
| A0078O0001 — Jean Climaque, *L’Échelle* | 1 | 52 | 51 sur 54 ; graphies `1 Cor`, `Thes`, `Sam`, préfixe `cf.`, plusieurs références par parenthèse. `reference_manuelle` y porte l’auto-référence de l’œuvre, **non des liens bibliques**. |
| A0016O0001 — Origène, *Contre Celse* | 1 | 10 | 9 au chapitre entier ; 25 renvois internes. Faible : 0 % de guillemets, références rares. |

> **⚠ JOURNAL HISTORIQUE, NON UN ÉTAT.** Le 24 juillet 2026, `liens_bibliques` a été **entièrement vidée** (33 795 → 0) sur décision de l'auteur du site : plus aucun de ces liens n'existe. Le tableau ci-dessus garde tout son prix — il dit ce qu'une passe **rend** sur un profil donné — mais il ne dit plus rien de l'avancement. Ne jamais en déduire qu'une œuvre « a » des liens : compter en base.

**À compléter à chaque œuvre**, avec le rendement réel et non l’intention.


### 25.10 — Auditer l'œuvre avant de choisir la méthode

**La méthode dépend de la forme de l'œuvre et de l'état de son édition — jamais de son auteur.** Appliquer la même passe à tout donne des résultats vides ou faux : la même mécanique a rendu 650 liens sur Irénée et 93 sur l'Hexaéméron, qui en appelait cinq fois plus. L'audit précède le choix, et le choix se justifie.

#### Ce que l'audit mesure

1. **Le balisage de l'édition.** `node scripts/diag-conventions.mjs <id…>` : part des segments portant des guillemets, part portant une référence en parenthèse, présence de notes.
2. **Le rapport de l'œuvre à l'Écriture.** Commente-t-elle un livre pas à pas, ou cite-t-elle toute la Bible au fil d'un raisonnement ? La question se tranche au sommaire, pas au comptage.
3. **L'intégrité de l'import — contrôle nouveau et obligatoire.** Comparer le texte en base à sa source en ligne. L'Hexaéméron ne portait que 7 références quand l'édition en donne 88 : l'import les avait perdues, et aucune passe ne pouvait le savoir. Une œuvre pauvre en références n'est pas forcément une œuvre sans références.
4. **La langue d'origine.** Si l'édition donne le grec ou le latin en regard, la citation y est souvent littérale là où la traduction française la dilue. À récupérer avec le texte.

#### Les quatre profils, et l'ordre des passes

| Profil | Reconnaissance | Traitement |
|---|---|---|
| **A — œuvre référencée** | l'édition donne ses références (Somme, Cyrille) | §25.1 domine et suffit presque. Le travail réel est ailleurs : abréviations (§25.3) et pièges de numérotation (§25.2). |
| **B — citations délimitées** | guillemets fréquents, ≥ 15 % des segments (Tertullien, Irénée, Cité de Dieu) | appariement des spans par rappel pondéré. Puis **lecture** : les guillemets ne portent que les citations, jamais les reprises ni les échos. |
| **C — commentaire suivi** | l'œuvre progresse dans un livre biblique (Hexaéméron, Job, Discours sur les Psaumes) | §25.5 (alignement de la suite) **et lecture obligatoire**. Les liens de type 3 y dominent, et **aucune mesure lexicale ne peut les voir** : un commentaire ne ressemble pas au verset qu'il explique. |
| **D — œuvre allusive nue** | ni guillemets ni références (Homélies d'Antioche, Cyprien, Climaque) | **la lecture est la seule voie.** Les outils ne servent qu'à proposer des candidats ; ils ne concluent jamais. |

#### Le contrôle de rendement

L'audit énonce un **ordre de grandeur attendu** avant de lancer quoi que ce soit, et l'on compare à l'arrivée. Un commentaire suivi devrait porter des liens de l'ordre du nombre de ses segments ; une œuvre allusive, beaucoup moins. **Un résultat très en dessous de l'attendu est une alarme, pas un résultat** : 93 liens pour 1 798 segments d'un commentaire de Genèse 1 aurait dû arrêter le chantier sur-le-champ.

#### Ce que les passes ne font jamais

Elles **amorcent**. Elles ne concluent pas. Trois raisons constatées :

- elles ne voient que ce que l'éditeur a marqué — Gn 1, 1 est cité ou commenté quinze fois dans la seule première homélie, sans une seule parenthèse ;
- elles placent le lien sur le segment qui **précède** la citation, la référence de l'édition venant en fin de phrase ;
- leurs seuils écartent du vrai **sans laisser de trace**.

**La règle qui en découle est déjà écrite : voir le §9.6.** Partir du segment et non d'une liste de références à caser ; marquer `liens_revus_le` sur tout segment examiné, **même s'il n'en sort aucun lien** ; passer ensuite la « passe d'oubli » sur les segments restés sans lien mais portant des marqueurs de citation. Rien à ajouter à ces trois prescriptions — seulement à les appliquer, ce qui n'avait pas été fait.

Ce que la présente section ajoute est **l'outillage** :

- extraire l'œuvre par divisions dans un dossier de travail — `scripts/hexameron-extraire.mjs` en donne le modèle : le français de la base (c'est lui qu'on lie), les liens déjà posés en regard, la langue d'origine en dessous ;
- relever à la main dans une table `segment_numero → [canon_id, type, motif]` — modèle : `scripts/hexameron-liens-lus.mjs` ;
- **afficher le verset visé en regard du relevé avant d'écrire.** Ce contrôle-là a rattrapé une erreur de l'éditeur lui-même — « Ps. 64, 4 » là où le texte cite Ps 74, 4.
