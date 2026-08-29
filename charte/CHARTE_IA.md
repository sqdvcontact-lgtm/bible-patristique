# Charte éditoriale et technique de Corpus Scriptura

Cette charte est la seule version normative. Elle décrit l’état voulu du corpus, de la base et des procédures. Les journaux de chantier, bilans chiffrés, listes d’œuvres traitées et anciennes décisions ne lui appartiennent pas.

Elle vit dans **`parametres.charte_ia`**, et nulle part ailleurs : c’est l’unique boîte à règles. `charte/CHARTE_IA.md` n’en est qu’un miroir, régénéré par `node scripts/synchroniser-charte-supabase.mjs --pull` ; ⛔ ne jamais l’éditer à la main, une correction portée sur le miroir se perd au premier `--pull`. `AGENTS.md` porte les règles de CODE du dépôt et renvoie ici pour la doctrine.

En cas de divergence entre une habitude, un script ancien et cette charte, la charte prévaut. Si le schéma de base ou le code ne permet pas encore d’appliquer une règle, on corrige d’abord l’outil. On ne dégrade jamais les données pour les adapter à un outil obsolète.

## 1. Principes directeurs

### 1.1 Fidélité

Le corpus publie des éditions identifiées. Il conserve leurs mots, leur ordre, leur langue et leurs particularités significatives. On corrige une faute certaine d’OCR ou une coquille manifeste en la confrontant à la source. On ne modernise ni le vocabulaire, ni la syntaxe, ni l’orthographe historique par convenance.

Une forme surprenante n’est pas une erreur par elle-même. En cas de doute, consulter le fac-similé ou le document source, conserver la leçon attestée et signaler l’incertitude dans le dossier de travail.

### 1.2 Complétude

L’objectif est une œuvre intégrale. Les contrôles portent sur les commencements, les fins, les divisions, les paragraphes, les notes et les endroits où l’OCR saute facilement une ligne. Les pages du fac-similé peuvent servir de repères de contrôle sans devenir une structure conservée dans le corpus. Une lacune matérielle ne se comble pas par invention.

### 1.3 Séparation des phases

Le travail éditorial et la constitution des liens bibliques sont deux phases distinctes.

1. La phase A établit le texte, les métadonnées, la structure, les paragraphes, les rangs, les notes et, le cas échéant, le texte original parallèle.
2. La phase B constitue ou révise les liens bibliques. Elle ne commence qu’après clôture explicite de la phase A et sur instruction distincte.

Une importation nouvelle s’arrête donc avant les liens, sauf demande expresse contraire.

### 1.4 Preuve et réversibilité

Toute modification importante doit être justifiable par une source, un invariant ou un contrôle reproductible. Toute écriture en base est précédée d’une sauvegarde ciblée et d’un mode à blanc. Elle est suivie d’une relecture depuis la base.

## 2. Sources, fichiers et espace de travail

### 2.1 Source de vérité

Le fac-similé de l’édition retenue est la référence première pour le texte, les titres, les alinéas, les notes et les pages. Un fichier Word, PDF textuel, OCR ou HTML est un instrument de transcription. Il ne remplace pas la source lorsqu’un doute visuel subsiste.

Pour une édition numérique sans fac-similé, conserver son URL, son identité bibliographique et la structure native utile. Documenter les transformations nécessaires dans le dossier de travail, non dans la présente charte.

### 2.2 Fichiers Word

Quand un document Word est fourni comme base, conserver ses mots tels quels, sauf faute d’OCR ou coquille certaine. Extraire aussi les notes, italiques, exposants, petites capitales et limites de paragraphes si elles portent du sens.


### 2.3 Espace de travail et OneDrive

Le dépôt de travail de référence est `C:\\Corpus Scriptura\\bible-patristique`. Pour les traitements lourds, caches, environnements temporaires et opérations sensibles, un espace local est préféré afin d’éviter les lenteurs et conflits de synchronisation.

OneDrive n’est pas interdit. Une source, un artefact, une sauvegarde ou un livrable peut y être lu ou écrit lorsque cela est utile. Lorsqu’un traitement comporte de nombreuses écritures intermédiaires ou des fichiers volumineux, travailler de préférence en local puis synchroniser ou copier le résultat contrôlé. OneDrive ne constitue jamais, à lui seul, la source d’autorité d’un texte ou d’une sauvegarde.

### 2.4 Concurrence

Plusieurs agents ou applications peuvent travailler dans le dépôt. Préserver les modifications étrangères, éviter les réécritures globales sans nécessité et borner chaque script à l’œuvre ou aux lignes visées. Les mises à jour protégées comparent l’état attendu avant d’écrire.

## 3. Typographie et enrichissement

### 3.1 Règle générale

La typographie éditoriale est harmonisée sans réécrire la langue de l’édition. Les corrections mécaniques sont admises seulement lorsqu’elles sont univoques. Toute règle à faux positifs possibles exige une vérification contextuelle.


### 3.2 Normalisation typographique

Pour toutes les éditions non médiévales, Corpus Scriptura applique une typographie éditoriale normalisée sans moderniser la langue :

- employer une espace insécable `U+00A0` avant les deux-points ;
- employer une espace fine insécable `U+202F` avant le point-virgule, le point d’exclamation et le point d’interrogation ;
- employer une espace fine insécable `U+202F` après le guillemet ouvrant `«` et avant le guillemet fermant `»`. L’insécable pleine chasse `U+00A0`, longtemps prescrite ici, vaut le double d’une fine et ouvre visiblement la citation : mesurée dans la police de lecture, elle occupe 21,9 % du cadratin contre 10,9 % pour la fine ;
- ne pas ajouter d’espace avant la virgule, le point ou les points de suspension ;
- employer toujours le caractère unique `…` pour les points de suspension. Une suite `...` ayant réellement valeur de points de suspension est normalisée en `…` dans la couche typographique non médiévale ; trois points distincts ne sont jamais fusionnés sans vérification contextuelle ;
- employer l’apostrophe typographique `’` dans le texte normalisé ;
- **accentuer les capitales**, sans exception : `Éphésiens`, `Église`, `Évangile`, `À la recherche`, `Être`. La capitale non accentuée est une limite des machines à écrire, pas un usage français. ⚠️ Cette règle appartient à la typographie et **ne franchit pas la frontière posée plus bas** : elle vaut pour ce que Corpus Scriptura compose, jamais pour une orthographe ancienne reproduite d’une source. Accentuer `Eglises` dans un intitulé de 1532 qui écrit par ailleurs `Subuersion`, `Iesus` et `viuans` serait moderniser à moitié, donc défigurer ;
- normaliser les caractères purement glyphiques lorsque l’identité du mot ne change pas : le `s` long devient `s`, et les ligatures ou variantes typographiques équivalentes sont développées selon les conventions du projet.

Ces règles valent pour le français comme pour les langues originales des éditions non médiévales. Elles appartiennent à la couche éditoriale normalisée et doivent survivre au stockage, aux exports et au rendu. Le front ne doit ni les annuler ni appliquer une modernisation linguistique supplémentaire.

**Où la règle s’applique : au STOCKAGE, dès l’import et lors des reprises éditoriales.** Pour toutes les éditions non médiévales et non diplomatiques, les caractères typographiques normalisés font partie de la donnée canonique du corpus : `U+00A0` avant les deux-points ; `U+202F` avant le point-virgule, le point d’exclamation et le point d’interrogation ; `U+202F` après `«` et avant `»`. Les guillemets droits issus d’une transcription, d’un OCR, d’un TEI ou d’un import sont remplacés dans la donnée par les guillemets typographiques du niveau correspondant dès que leur fonction ouvrante ou fermante est certaine. Les fonctions de rendu (`normaliserEspaces`, `normaliserEspacesOriginal` et leurs équivalents) demeurent des garde-fous idempotents pour les données anciennes ou externes ; elles ne dispensent jamais de normaliser la donnée lors d’un import ou d’une reprise. La fidélité à l’édition source concerne les mots, l’ordre, la ponctuation signifiante et les particularités documentaires ; elle n’impose pas de conserver des espaces ordinaires ou des guillemets droits purement techniques lorsque la charte fixe leur équivalent typographique. Toute migration doit rester bornée à l’édition concernée, être vérifiable, préserver les unités et les ancres, et exclure les témoins médiévaux ou diplomatiques.

Normaliser la typographie n’autorise jamais à moderniser l’orthographe, la morphologie, le vocabulaire ou la syntaxe. Une édition qui imprime `avoit` reste `avoit`, jamais `avait`.

Les témoins médiévaux et les couches diplomatiques échappent à cette normalisation glyphique générale : ils conservent les distinctions prévues par leur convention de transcription. Les éventuelles couches développées ou modernisées restent séparées conformément au § 14.

Les espaces de bord des segments sont supprimées. Dans les éditions non diplomatiques, une double espace accidentelle est automatiquement réduite à une seule espace lorsqu’elle n’a aucune fonction documentaire. La recomposition d’un paragraphe insère une espace simple entre deux segments, sauf lorsqu’un signe, `join_before` ou un balisage exige une jonction différente et contrôlée.

**Sauts de ligne et séparateurs.** Les sauts de ligne intentionnels attestés par l’édition source sont retranscrits et conservés. Cette règle vise les retours ayant une fonction textuelle ou éditoriale — vers, énumération, prière, titre composé, rupture volontaire ou disposition significative — et non les simples fins de ligne imposées par la largeur de la page ou de la colonne. Un saut de ligne ne crée pas à lui seul un nouveau paragraphe ni un nouveau segment.

Lorsqu’une rupture est matérialisée par un astérisme, un astérisque, un fleuron ou un signe équivalent (`⁂`, `*`, etc.), le signe lui-même est retranscrit à sa position et la rupture qu’il marque est conservée. Il n’est ni supprimé comme bruit OCR, ni remplacé silencieusement par un simple blanc. Si le signe entre en conflit avec la syntaxe de balisage — notamment l’astérisque de Markdown — le stockage emploie un échappement ou une représentation littérale reconnue par l’application afin que le signe soit rendu comme caractère de la source, jamais comme italique.

**Nombres, dates, siècles et unités.** Dans le texte d’une édition source, la graphie des nombres est conservée, sauf règle explicite de normalisation. Dans les textes éditoriaux composés par Corpus Scriptura, une quantité ordinaire intégrée à la phrase s’écrit en lettres : `trois jours`, non `3 jours`. Les références, dates, mesures, pourcentages, tableaux et données techniques conservent naturellement leur notation chiffrée lorsqu’elle est requise.

Une date éditoriale s’écrit `23 août 2026` : jour sans zéro initial, mois en toutes lettres et en bas de casse, année en chiffres arabes.

Une mention de siècle adopte partout la forme `IVe siècle` : le nombre romain est rendu en petites capitales, le `e` en exposant et le mot `siècle` est toujours écrit en entier. L’abréviation `s.` n’est pas conservée comme forme normalisée. Une forme ambiguë telle que `S.` n’est toutefois jamais développée mécaniquement : le contexte doit d’abord établir s’il s’agit de `siècle`, de `saint` ou d’une autre valeur. Les nombres romains ne sont pas composés en petites capitales hors de cet emploi des siècles. Lorsqu’un chiffre romain qualifie immédiatement un nom ou une désignation, il est précédé d’une espace insécable `U+00A0` : `Grégoire II`, `livre IV`, `tome XII`.

Les ordinaux éditoriaux suivent les formes `1er`, `1re`, `2e`, `3e`, etc., avec le suffixe `er`, `re` ou `e` composé en exposant. Les formes développées `1ère`, `2ème`, `3ème`, etc. sont proscrites dans les textes composés par Corpus Scriptura.

Les grands nombres prennent une espace fine insécable `U+202F` comme séparateur des milliers : `12 500`. Les décimales emploient la virgule française : `3,14`, jamais `3.14` dans un texte éditorial français.

Entre un nombre et un symbole ou une unité, employer une espace fine insécable `U+202F` : `25 %`, `10 km`, `5 kg`.

Les références de page emploient `p.` au singulier et `pp.` pour une plage ou plusieurs pages : `p. 12`, `pp. 12-15`. Le trait d’union est simple. L’abréviation latine `sq.` est composée en italique : `p. 12 *sq.*`.

Pour l’abréviation de numéro, ne pas employer le signe degré `°`. Composer le `o` en exposant, et `os` en exposant au pluriel ; au pluriel, les lettres `o` et `s` se suivent sans aucune espace. Une espace fine insécable `U+202F` suit l’abréviation : `nᵒ 12`, `nᵒˢ 12-15`.

Les intervalles ordinaires emploient un trait d’union simple sans espaces : `2020-2025`, `pp. 12-15`. La convention biblique interchapitres reste distincte et conserve les espaces autour du trait d’union : `Gn 1, 30 - 2, 3`.

**Abréviations et casse de la source.** Hors des règles expressément fixées par la charte — notamment les références bibliques et les siècles — les abréviations de l’édition source sont conservées. Ne jamais développer automatiquement une abréviation ambiguë. La casse des noms religieux (`Dieu`, `Seigneur`, `Écriture`, `Église`, `Apôtre`, `Prophète`, `saint`, etc.) suit l’édition reproduite ; aucune harmonisation générale ne la remplace.

### 3.3 Guillemets

Le premier niveau français emploie `« … »`. Une citation enchâssée emploie `“ … ”` ou la forme attestée par l’édition si elle est cohérente. Les guillemets droits issus de l’OCR sont corrigés.

Lorsqu’une citation entre guillemets français constitue un énoncé autonome, fermé sur lui-même, et ne poursuit pas la syntaxe de la phrase d’accueil, son premier mot prend une majuscule : `« D’abord… »`. Une citation intégrée à la syntaxe de la phrase d’accueil conserve la minuscule requise par cette syntaxe. Cette distinction est contextuelle : la seule présence d’un deux-points ne suffit pas à conclure.

La ponctuation d’une citation, sa place de part et d’autre du guillemet fermant et la sortie des citations longues relèvent du § 3.8.

Un appel de note appartient au passage annoté et se place toujours avant le guillemet fermant : `les sarments[[3]] »`. Il ne se place jamais après `»`, `”` ou `"`.

Dans les textes éditoriaux de Corpus Scriptura, le terme théologique `consubstantiel` est toujours placé entre guillemets français : `« consubstantiel »`. Cette convention vaut notamment lorsqu’on nomme le terme du symbole de Nicée. Elle ne modifie jamais une citation ni le texte d’une édition source, dont la ponctuation et les guillemets sont conservés conformément au principe de fidélité.

### 3.4 Tirets et traits d’union

Le tiret demi-cadratin `–` sert aux incises et aux répliques. Une incise normalisée prend une espace insécable `U+00A0` après le tiret ouvrant et avant le tiret fermant : `– incise –`. Lorsqu’une incise est identifiée avec certitude, sa ponctuation est normalisée systématiquement sous cette forme, même si l’édition emploie des virgules ou des parenthèses : cette transformation appartient à la liste blanche typographique. Elle n’autorise toutefois aucune conversion mécanique de toutes les virgules ou parenthèses ; la nature incidente doit être établie par le contexte. Le trait d’union simple `-` reste réservé aux mots composés, aux formes grammaticales et aux intervalles qui l’exigent. Le tiret cadratin `—` n’est conservé que s’il appartient réellement à l’édition ou à une convention spécifique documentée.

**Intervalle de dates.** Un intervalle de dates s’écrit d’un simple trait d’union entre deux espaces : « 354 - 430 », « Vers 480 - 524 », « Ier - IIe siècle ». À l’écran ces deux espaces sont insécables, un trait d’union autorisant le retour à la ligne juste après lui : sans elles on lirait « 354 - » en fin de ligne et « 430 » à la suivante. La forme canonique écrite en base, elle, garde des espaces ordinaires : rien n’y réclame une insécable, et un caractère invisible s’oublie dans une colonne de texte. N’est espacé que le tiret qui sépare DEUX BORNES, reconnu à ce qui le précède — un chiffre, le mot « siècle » ou l’ordinal d’un chiffre romain ; le trait d’union de « av. J.-C. », de « Bar-le-Duc » ou d’un nom composé n’est jamais touché. La règle est tenue en un seul endroit, `app/lib/datesHistoriques.ts` (`SEPARATEUR_INTERVALLE`, `espacerIntervallesHistoriques`), et vaut pour toute date affichée, composée par le site ou lue telle quelle en base — le demi-cadratin ne s’appliquait qu’aux dates composées, si bien que « Vers 329-379 » restait collé.

### 3.5 Titres

Les titres d’œuvre, sous-titres et titres de niveau sont saisis en casse française, celle du Lexique des règles typographiques en usage à l’Imprimerie nationale, entrée « Titres d’œuvres et de journaux ». Les capitales d’affichage de la source ne sont jamais reproduites comme casse éditoriale : `AVERTISSEMENT` devient `Avertissement`, `SUR JOSEPH ET LA CONTINENCE` devient `Sur Joseph et la continence`. Cette remise en casse française est systématique dans les champs éditoriaux même lorsque l’édition imprime tout le titre en capitales ; elle ne modifie pas la ponctuation du titre. Les majuscules qu’exigent les noms propres, les sigles et les formes intrinsèques sont évidemment conservées.

**Ponctuation finale des titres et intitulés.** La ponctuation d’un titre, d’un sous-titre ou d’un intitulé transcrit depuis une édition source est conservée telle qu’elle est attestée. Un point final imprimé n’est donc jamais supprimé par une règle générale. De même, un point intérieur n’est pas transformé mécaniquement en saut de ligne. Une normalisation différente n’est admise que lorsqu’une consigne éditoriale particulière l’ordonne explicitement pour un périmètre défini. Ce périmètre est défini, et il est le seul : la **page de titre**. Le frontispice d’une œuvre est une composition, et son titre, son sous-titre et son commentaire de traduction n’y portent pas de point final. Partout ailleurs — titres de niveau du corps, fiche d’auteur, recherche, listes — la ponctuation attestée est conservée telle quelle. La normalisation de la casse reste indépendante de cette fidélité à la ponctuation.

**Premier cas : le titre ne commence pas par l’article défini.** Le mot initial prend seul la majuscule : `Sur Joseph et la continence`, `De l’esprit des lois`, `À la recherche du temps perdu`, `Une saison en enfer`.

**Second cas : le titre commence par l’article défini.** L’article initial prend la majuscule. Il est le SEUL à la prendre lorsque le titre forme une phrase : `Les dieux ont soif`, `Le roi s’amuse`, `La guerre de Troie n’aura pas lieu`.

⚠️ **Écart assumé avec le Lexique, arrêté le 2026-08-17.** Le Lexique ajoute ici un second cas, où la majuscule s’arrêterait aussi à l’article : celui des ouvrages spécialisés, d’érudition ou techniques, et des articles de journaux ou de revues (`Le problème du devenir et la notion de la matière dans la philosophie grecque`). **Corpus Scriptura ne le retient pas.** La même règle vaut pour tous les genres de livres, savants ou littéraires : une distinction de genre ne se tranche pas de façon sûre au moment d’écrire un titre, et elle produirait deux casses concurrentes dans une même bibliographie. Un ouvrage d’érudition prend donc la majuscule au premier substantif comme les autres : `La Figure de Paul dans les Actes des Apôtres`.

Partout ailleurs, la majuscule ne s’arrête pas à l’article :

- dans un titre qui contient une comparaison ou une symétrie, elle va à chaque terme en opposition ou en parallèle dès lors que l’un d’eux l’exige : `La Belle et la Bête`, `Le Diable et le Bon Dieu`, `Dom Juan ou le Festin de pierre` ;
- dans tous les autres titres, elle va au premier substantif, ainsi qu’aux adjectifs et adverbes qui peuvent le précéder : `Les Très Riches Heures du duc de Berry`, `Le Dernier Jour d’un condamné`, `Les Liaisons dangereuses`, `La Nouvelle Revue française`, `Le Petit Chaperon rouge`.

**L’article initial appartient au titre, ou n’y appartient pas.** Il ne prend la majuscule, et ne se compose avec le titre, que s’il fait INDISCUTABLEMENT partie du nom et n’est ni traduit ni contracté. Sinon il reste en romain et en bas de casse : l’Iliade et l’Odyssée, un article du Spiegel, l’auteur du Rouge et le Noir. Devant un titre abrégé, il se compose toujours en romain : le Barbier, les Rêveries. ⚠️ Dans un titre en deux parties séparées par « ou », l’article de la seconde partie reste dans le titre mais PERD la majuscule : `Julie ou la Nouvelle Héloïse`, `La Répétition ou l’Amour puni`.

**Titres doubles.** Lorsqu’un titre en contient un autre, ou une variante, les règles ci-dessus s’appliquent à chacun séparément, la réserve sur l’article du second titre valant toujours : `Critique de l’École des femmes`, `Le Mariage de Figaro ou la Folle Journée`, `Knock ou le Triomphe de la médecine`, `Émile ou De l’éducation`.

**Titres successifs.** Quand une partie est citée avec le tout, la partie se compose en romain entre guillemets et le tout en italique : « Les Pauvres Gens », La Légende des siècles.

**Ce qui reste en romain, avec l’article en bas de casse** : les noms des livres dits sacrés (la Bible, le Coran, l’Ecclésiaste, l’Évangile selon saint Luc) ; les intitulés d’actes officiels, conventions, lois, décrets (la convention de La Haye, la loi du Maximum) ; les noms des codes et recueils semblables, mais non leurs subdivisions (le Code civil, le Décalogue, la Loi des Douze Tables) ; les désignations de thèmes ou sujets traditionnels qui ne constituent pas des titres réels (la Crucifixion, une Descente de croix). Ces cas rejoignent le § 3.6.

**Les titres en langue étrangère suivent la règle française**, casse et typographie comprises. L’usage anglais, qui met une capitale à chaque mot important, n’est donc PAS suivi : c’est la règle ci-dessus qui décide, et elle seule. Le Lexique compose ainsi The Daily Telegraph, où la majuscule revient à l’article et au groupe substantif, non à chaque mot. Un titre latin sans article prend la majuscule au seul premier mot : `De civitate Dei`. Espaces, guillemets et apostrophes sont ceux du § 3.2, quelle que soit la langue du titre.

**Portée.** La règle vaut pour TOUT titre éditorial : titre et sous-titre d’œuvre, titre de niveau, titre d’essai, intitulé d’événement, titre porté dans une notice ou dans le catalogue. **Un nom commun ne prend pas la majuscule sous prétexte qu’il désigne une fête ou un temps liturgique** : on écrit `Troisième dimanche après l’Épiphanie`, `2e dimanche après la Trinité`. La majuscule ne lui revient qu’en tête de titre. Les noms de fêtes proprement dits la gardent (`l’Avent`, `l’Épiphanie`, `la Trinité`, `la Grande Semaine`).

⛔ **Elle ne s’applique jamais au corps d’un texte source.** La casse d’un titre qui figure DANS le texte d’une œuvre appartient à l’édition reproduite : on ne la corrige pas.

La ponctuation interne et finale d’un titre transcrit suit l’édition source, sauf consigne particulière explicite. La casse éditoriale normalisée ne vaut jamais autorisation de modifier cette ponctuation. Les phrases explicatives associées à un niveau, dans les champs `_texte`, ne sont pas des titres et gardent leur ponctuation.


### 3.5.1 Références bibliques

La notation biblique suit une convention unique dans toutes les surfaces composées ou normalisées par Corpus Scriptura. Un nom de livre écrit en toutes lettres dans l’édition source peut être conservé (`Genèse`, `Exode`, etc.). En revanche, toute abréviation biblique est ramenée à la forme française catholique normative. Le référentiel `public.abreviations_bibliques` sert à reconnaître les variantes historiques ; lorsqu’il contient plusieurs formes héritées, la liste ci-dessous décide seule de la forme d’affichage normalisée.

**Abréviations normatives.** Ancien Testament : `Gn`, `Ex`, `Lv`, `Nb`, `Dt` ; `Jos`, `Jg`, `Rt`, `1 S`, `2 S`, `1 R`, `2 R`, `1 Ch`, `2 Ch`, `Esd`, `Ne`, `Tb`, `Jdt`, `Est`, `1 M`, `2 M` ; `Jb`, `Ps`, `Pr`, `Qo`, `Ct`, `Sg`, `Si` ; `Is`, `Jr`, `Lm`, `Ba`, `Ez`, `Dn`, `Os`, `Jl`, `Am`, `Ab`, `Jon`, `Mi`, `Na`, `Ha`, `So`, `Ag`, `Za`, `Ml`. Lorsque la Lettre de Jérémie est traitée comme division autonome dans le modèle AELF du projet, employer `Lt-Jr`. Nouveau Testament : `Mt`, `Mc`, `Lc`, `Jn`, `Ac`, `Rm`, `1 Co`, `2 Co`, `Ga`, `Ep`, `Ph`, `Col`, `1 Th`, `2 Th`, `1 Tm`, `2 Tm`, `Tt`, `Phm`, `He`, `Jc`, `1 P`, `2 P`, `1 Jn`, `2 Jn`, `3 Jn`, `Jude`, `Ap`.

Les chiffres placés devant une abréviation sont séparés de celle-ci par une espace : `1 S`, `2 R`, `1 Co`, `3 Jn`.

**Syntaxe des références.**

- `Gn 1` désigne le chapitre 1 de la Genèse ;
- `Gn 1, 1` désigne le chapitre 1, verset 1 ;
- `Gn 1-3` désigne les chapitres 1 à 3 ;
- `Gn 1.5` désigne les chapitres 1 et 5 ;
- `Gn 1, 5-13` désigne les versets 5 à 13 du chapitre 1 ;
- `Gn 1, 5.13` désigne les versets 5 et 13 du chapitre 1 ;
- plusieurs références indépendantes sont séparées par un point-virgule : `Gn 1, 1 ; Ex 2, 3` ;
- lorsqu’une plage franchit une limite de chapitre, écrire les deux références complètes séparées par un trait d’union simple entouré d’une espace ordinaire de chaque côté : `Gn 1, 30 - 2, 3`.

Une virgule sépare donc le chapitre du ou des versets. Un point sans espace sépare des chapitres ou des versets non contigus. Un trait d’union simple sans espace relie les bornes d’une plage continue à l’intérieur d’un même niveau (`Gn 1-3`, `Gn 1, 5-13`). Le tiret demi-cadratin n’est jamais employé dans une référence biblique. Une plage continue ne s’écrit jamais comme une énumération séparée par des virgules : `Gn 1, 5, 13` est fautif lorsqu’on veut dire les versets 5 à 13. Ces règles valent pareillement avec un nom de livre en toutes lettres : `Genèse 1, 5-13`, `Genèse 1, 5.13`.

### 3.6 Enrichissement

Conserver les italiques, gras, exposants, petites capitales et autres enrichissements s’ils sont sémantiques ou éditoriaux. Employer le balisage déjà reconnu par l’application. Un balisage ne traverse jamais une limite de segment sans être fermé puis rouvert proprement.

**Emphase et capitales.** Dans la couche éditoriale de lecture, les capitales intégrales ne servent pas à marquer l’insistance. Lorsqu’un mot ou un groupe de mots n’est composé en capitales que pour être mis en relief, il est remis en casse courante et l’emphase est portée par l’italique. Exemple : `JUSQU’À vous` devient `*Jusqu’à* vous`. Cette règle ne touche ni les sigles, ni les chiffres romains, ni les initiales, ni les capitales exigées par les noms propres ou par la syntaxe. L’identification de l’emphase reste contextuelle ; en cas de doute, le fac-similé est vérifié avant toute modification.

**Tout terme en langue étrangère est composé en italique.** La règle vaut pour toute langue, ancienne ou moderne, et quel que soit le degré d’acclimatation du terme au français. Le latin ne fait pas exception : *a priori*, *a fortiori*, *ex nihilo*, *in fine* s’écrivent en italique, la lexicalisation supposée d’une locution n’étant pas un critère retenu. Les abréviations savantes latines s’y rangent aussi : *cf.*, *ibid.*, *op. cit.*, *et al.*, *passim*, *sic*, *circa*. Ce parti s’écarte sciemment de l’usage de l’Imprimerie nationale, qui laisse *cf.* en romain. Il est retenu pour l’uniformité : une règle sans exception se tient mieux qu’une liste de cas.

**Une seule exception d’alphabet.** Le grec écrit en caractères grecs reste en romain, l’alphabet suffisant à signaler la langue étrangère. Une translittération en alphabet latin d’un terme hébreu, araméen, syriaque ou grec est en revanche mise en italique, comme tout terme étranger.

**Les noms propres étrangers restent en romain** : personnes, lieux, institutions, revues. Un nom propre nomme, il n’emprunte pas à une langue. Le titre d’une œuvre fait exception à cette exception, son italique lui venant de sa qualité de titre et non de sa langue.

**Superposition : l’italique l’emporte et court sur tout le texte.** Un terme étranger placé dans un contexte déjà en italique garde l’italique. On ne revient pas au romain pour l’en distinguer.

**Exception d’échelle : un texte entier dans une langue étrangère n’est pas mis en italique.** La règle vise le terme ou la locution insérés dans une phrase française. Elle ne s’applique ni à un texte importé qui est tout entier dans cette langue, ni aux enrichissements d’auteur attestés par la source.

**Balisage et portée.** L’italique se stocke comme celui des titres, sous la forme `*terme*`, et l’application le rend en véritable italique. La règle s’applique absolument partout : notices d’auteur, notices d’œuvre, notices chronologiques, commentaires, notes rédigées par l’éditeur, chapeaux, libellés d’interface et messages du site.

Dans tous les textes éditoriaux de Corpus Scriptura — notamment les notices d’auteur, notices d’œuvre, notices chronologiques, commentaires et notes rédigées par l’éditeur — le titre d’une œuvre individualisée est composé en italique. Le stockage emploie le balisage `*Titre de l’œuvre*`, rendu comme un véritable italique par l’application. L’article est inclus dans l’italique lorsqu’il appartient au titre conventionnel ; lorsqu’il n’est qu’un déterminant syntaxique ajouté par la phrase, seul le titre est en italique. Une désignation générique (`ses lettres`, `ses homélies`, `un commentaire`) reste en romain. Les noms canoniques des livres bibliques et les désignations d’événements, de conciles ou de symboles restent en romain, sauf lorsqu’ils font partie du titre propre d’une œuvre citée.

Les notices d’auteur relèvent intégralement de la typographie éditoriale normalisée du § 3.2 : les espaces insécables, espaces fines insécables, guillemets, apostrophes et enrichissements doivent être conformes dès le stockage et pas seulement corrigés au rendu.

La présence ou l’absence de guillemets, d’italiques ou d’autres marques ne suffit pas à déduire la forme littéraire de l’œuvre.

**Crochets et interventions éditoriales.** Les crochets droits signalent une intervention postérieure sur le texte, une restitution, un ajout ou une indication éditoriale qui n’appartient pas littéralement à la formulation citée. `sic` se compose en italique, mais les crochets restent en romain : `[*sic*]`. Lorsqu’une citation reproduite comporte une omission signalée par des points de suspension entre parenthèses, la forme normalisée est `[…]`, non `(…)`. Si Corpus Scriptura tronque exceptionnellement une citation dans un texte éditorial, l’omission est également signalée par `[…]`. Cette possibilité ne vaut pas autorisation d’amputer le texte d’une édition source : hors opération explicitement autorisée, la modification ou la troncature du texte original reste interdite par la liste blanche.

### 3.7 Contrôles anti-faux positifs

Ne jamais corriger automatiquement, sans contexte, une espace après apostrophe, un trait d’union, une répétition de mot ou une suite de capitales. Ces formes peuvent être légitimes. Les détections de mojibake, caractères de remplacement et balises orphelines servent normalement à produire des candidats, puis à les relire. La réduction des doubles espaces accidentelles relève toutefois de la règle mécanique du § 3.2 dans les éditions non diplomatiques.

**Liste blanche des corrections OCR univoques.** Une correction peut être appliquée automatiquement lorsqu’aucune lecture concurrente raisonnable n’existe : caractère cyrillique manifestement substitué à son homoglyphe latin dans un mot français ou latin ; chevrons OCR `<<` et `>>` ayant manifestement valeur de guillemets français `«` et `»` ; guillemets droits convertis dans leur forme typographique lorsque leur fonction ouvrante ou fermante est certaine ; astérisque isolé provenant manifestement d’un balisage cassé ou d’un bruit OCR lorsqu’il ne correspond ni à un enrichissement reconstructible ni à un séparateur attesté par la source. La règle sur les séparateurs du § 3.2 prime toujours : un astérisque ou astérisme qui matérialise réellement une rupture de l’édition est conservé.

Une anomalie de casse signalée déclenche le contrôle de l’œuvre entière. Inventorier toutes les suites de capitales dans le corps, les titres, les chapeaux, les liminaires et les notes de toutes les versions de l’œuvre ; distinguer chiffres romains, sigles, noms propres, grec, petites capitales et initiales ornées ; puis vérifier sur le fac-similé chaque résidu réellement suspect. Aucune mise en minuscules mécanique : une forme surprenante reste la leçon de l’édition tant que la source ne prouve pas l’erreur.

### 3.8 Ponctuation des citations

Cinq règles gouvernent la ponctuation des passages entre guillemets. Elles valent pour les guillemets français comme pour les guillemets anglais. Pour les éditions non médiévales et non diplomatiques, les corrections typographiques décidées par ces règles sont portées **dans la donnée canonique**, conformément au § 3.2 : une reprise éditoriale corrige donc le stockage lui-même lorsque l’analyse contextuelle établit sans ambiguïté la place de la ponctuation. Les cas ambigus restent inchangés jusqu’à arbitrage. Le rendu n’est qu’un garde-fou idempotent et ne constitue pas la couche d’autorité.

**Première règle : une citation ne se ferme jamais sur une ponctuation faible.** Le point-virgule, la virgule et le deux-points placés juste avant le guillemet fermant sont supprimés, sans être remplacés. Le point, le point d’exclamation et le point d’interrogation sont conservés. Ainsi « Mes frères, je ne pense point avoir encore atteint où je tends ; » se compose « Mes frères, je ne pense point avoir encore atteint où je tends ». Relevé du 2026-08-17 : 2 502 citations du corpus se ferment ainsi, dont 1 286 sur une virgule, 785 sur un point-virgule et 431 sur un deux-points, contre 11 211 sur un point et 1 351 sur un point d’exclamation ou d’interrogation.

⚠️ La suppression ne dispense pas de la syntaxe : la phrase d’accueil doit rester correcte une fois la ponctuation retirée. Quand le retrait laisse la phrase en suspens, le cas relève de la quatrième règle et non d’une correction automatique.

**Deuxième règle : la ponctuation forte se place selon que la citation est intégrée à la phrase ou non.**

- Citation **enchâssée**, qui poursuit explicitement la phrase du corps (on peut considérer que « les enfants sont immondes ») : la ponctuation forte se place **après** le guillemet fermant.
- Citation **isolée**, annoncée puis close sur elle-même (Jean a dit : « Mangez et buvez. ») : la ponctuation forte se place **avant** le guillemet fermant.

La ponctuation forte n’est jamais inventée : si l’édition n’en porte pas, la citation reste sans. On ne fait que déplacer celle qui existe.

L’indice mécanique est la façon dont la citation est amenée. Un deux-points juste avant le guillemet ouvrant annonce une citation isolée ; un mot du corps qui enchaîne directement sur le guillemet annonce une citation enchâssée. Le corpus valide cet indice pour le second cas : sur 2 957 citations enchâssées ne portant qu’une occurrence, 1 294 ont déjà leur ponctuation forte au dehors contre 45 au dedans, soit 97 % de conformité. Il ne le valide PAS pour le premier : sur 6 561 citations isolées, 588 portent la ponctuation au dedans et 332 au dehors, partage qui trahit deux usages concurrents plutôt qu’une règle.

⚠️ **Un deux-points ne suffit donc pas à conclure.** Une citation annoncée par un deux-points peut être suivie d’une suite de phrase (Jean a dit : « Mangez et buvez », puis il se tut.) : elle est alors close mais non terminale, et la ponctuation forte appartient à la phrase d’accueil. La règle mécanique ne s’applique qu’à une citation isolée ET terminale, c’est-à-dire qui n’est suivie d’aucun texte avant la fin de la phrase.

**Troisième règle : la ponctuation ne se double jamais de part et d’autre du guillemet fermant.** Quand la citation est déjà close, au dedans, par un point, un point d’exclamation ou un point d’interrogation, tout signe qui suit le guillemet fermant est supprimé. Le guillemet absorbe la ponctuation de la phrase d’accueil, il ne la répète pas.

    Jean dit à Lucien : « Mon frère, tu es bon ! ».     faux
    Jean dit à Lucien : « Mon frère, tu es bon ! »,     faux
    Jean dit à Lucien : « Mon frère, tu es bon ! »      juste

Cette règle est rare mais réelle : cinq occurrences au relevé du 2026-08-17, dont « Pierre, m’aimes-tu plus que ceux-ci ? » suivi d’un point-virgule. Elle vaut surtout comme garde-fou, un import pouvant en amener d’autres. ⚠️ Elle ne s’applique QUE si la ponctuation forte est déjà au dedans : lorsque la citation n’en porte pas, le signe qui suit le guillemet appartient à la phrase d’accueil et se conserve.

**Quatrième règle : les cas ambigus se soumettent, ils ne se devinent pas.** Hors des motifs univoques ci-dessus, aucune correction automatique n’est appliquée. Les cas sont soumis un à un, et les arbitrages rendus alimentent une liste d’exceptions qui se construit progressivement. Cette liste fait autorité sur la règle mécanique. C’est la même frontière qu’au § 9.0 pour les liens bibliques : ce qui est univoque se traite en masse, ce qui demande une lecture se traite à la main.

**Cinquième règle : une citation longue est sortie du texte.** Elle perd ses guillemets encadrants, reçoit le style de citation sortie, et les guillemets qu’elle contient reviennent à la forme française, les guillemets anglais n’ayant plus lieu d’être une fois l’encadrement disparu.

⚠️ Ne pas confondre avec la transformation inverse, appliquée au copier-coller : une citation copiée est encadrée de guillemets français, ce qui fait passer ses guillemets internes en anglais. Les deux règles sont symétriques et servent des fins opposées ; elles ne doivent pas être écrites au même endroit.

Trois conditions à la sortie, faute de quoi la mise en page se brise : la citation doit être **isolée**, **terminale** et **longue**. Une citation enchâssée sortie laisserait sa phrase d’accueil coupée en deux. Le seuil de longueur est fixé à **400 signes**, ce qui vise 217 citations du corpus ; à titre de repère, la médiane est de 61 signes, le 90ᵉ centile de 171, le 95ᵉ de 238, et la plus longue atteint 1 795 signes. Un seuil de 300 signes en viserait 527, un seuil de 200 en viserait 1 373.

⚠️ **Une citation POSÉE VERSET PAR VERSET ne se recolle pas.** La règle qui précède réunit les segments d’une citation en un seul bloc coulant, pour que la segmentation technique reste invisible. Mais quand l’édition ne coule pas la citation biblique dans sa prose et la pose verset par verset, chacun sur sa ligne, la coupure n’est plus technique : elle est VOULUE, et l’effacer serait effacer le verset. Ces segments prennent alors la nature `verset` — un segment, un verset — et la suite des versets consécutifs forme la citation.

Le style reprend celui de la citation sortie : corps légèrement réduit, justification, ni guillemets ni filet, et le même retrait de 8 mm, ramené à 5 mm sur écran étroit. Il en change deux choses. Le retrait ne se pose qu’à **gauche** : la citation sortie est un bloc unique que deux marges égales enferment, tandis qu’une suite de versets est déjà rentrée, et une seconde marge ne ferait qu’étrangler la colonne. Et deux versets ne sont pas séparés par le blanc de paragraphe, qui dirait qu’on change de sujet à chaque verset : un **léger blanc** suffit. Le blanc de paragraphe entier, lui, reste AUTOUR du bloc, car c’est la citation qui est un paragraphe, non chacun de ses versets.

### 3.8.1. Versets cités dans les commentaires bibliques

Dans un commentaire suivi d’un livre biblique, une citation biblique directe qui fonctionne comme lemme, reprise de verset ou unité autonome d’explication peut recevoir, dans la couche éditoriale de lecture, la nature `verset`, même si l’édition imprimée la compose dans le fil de la prose. Cette extraction n’altère jamais la couche source : les mots, l’ordre, la ponctuation et la disposition attestée restent conservés dans `oeuvre_texte_unites`, les offsets et les métadonnées de provenance. La séparation en `verset` est une décision de lecture, non une prétendue restitution de mise en page.

La référence biblique imprimée immédiatement associée à la citation reste dans le même segment `verset` ; le lecteur peut en assurer la composition typographique. Lorsqu’une suite de versets possède des frontières textuelles certaines, on préfère un segment par verset. On ne fabrique cependant jamais une frontière lorsque l’édition réunit plusieurs numéros dans une même citation ou lorsque l’étendue ne peut pas être déterminée avec certitude.

Les variantes d’interprètes, mots isolés cités pour être expliqués, reprises lexicales et fragments très courts enchâssés dans la syntaxe restent en `texte`, sauf s’ils constituent eux-mêmes une citation biblique autonome destinée à être lue comme verset. Une simple présence de guillemets ne suffit donc jamais à attribuer la nature `verset`.

Une coupure de page, de colonne, d’OCR ou d’unité source ne crée jamais un nouveau verset. Si un même verset est artificiellement partagé entre deux unités, il faut d’abord réparer ou documenter la continuité documentaire ; on ne transforme pas chaque fragment en ligne `verset` séparée, car cela ferait apparaître une fausse frontière. Les traitements automatiques sont réservés aux citations dont les bornes sont déterministes ; les continuations inter-unités sont recollationnées avant stylage.


**Le numéro du verset s’écrit à la main, dans `segment_metadata.biblical_verse_number`.** ⛔ Il ne se devine pas : ni au nombre placé en tête du segment, puisqu’un verset peut commencer par un nombre — « Quarante jours et quarante nuits… » —, ni au lien biblique, qui relève d’un travail de liaison distinct et n’est pas toujours fait. Une édition qui n’imprime pas les numéros n’en reçoit pas : la case reste vide et le bloc se lit sans eux. ⚠️ La clé `verse_number` est déjà prise et veut dire autre chose : elle porte le rang du VERS dans son poème, chez Ceriziers. Un vers n’est pas un verset, et mêler les deux mêlerait la numérotation d’un mètre de Boèce à celle d’un chapitre d’Isaïe.

Le numéro se rend dans la **face de la page Bible** — même graisse, même teinte effacée, même rapport de corps au texte qu’il accompagne. La page Bible le pose dans une gouttière, à droite d’une colonne étroite ; dans un bloc de versets, cette gouttière se battrait avec le retrait gauche, et le numéro passe donc en **exposant**, sans changer de face pour autant. ⚠️ L’exposant se cale comme partout ailleurs sur le site, par un déport et non par `vertical-align`, faute de quoi il gonflerait la boîte de ligne et rouvrirait le blanc entre versets, qui est léger. Enfin, le numéro de SEGMENT s’efface dans le bloc : deux nombres en exposant sur la même ligne ne se lisent pas, et c’est le verset que le lecteur cherche.

### 3.8.2. Analyses éditoriales dans les commentaires

Lorsqu’une édition de commentaire biblique place, sous une rubrique telle que `ANALYSE`, un sommaire des développements qui suivent, cette structure est documentaire et doit être conservée intégralement dans la couche source : rubrique, texte de chaque entrée, ordre et numérotation imprimée. Le sommaire constitue en outre, lorsque la correspondance avec les divisions du commentaire est certaine, une **réserve de titres éditoriaux**.

Dans la couche de lecture, une entrée de sommaire qui décrit une division du commentaire est projetée comme **titre de cette division** (`ref_niv2` ou niveau structurel équivalent). Le nombre imprimé sert uniquement à établir la correspondance avec la division source : il n’appartient pas au titre affiché. Ainsi `1. Nécessité des bonnes œuvres…` donne le titre `Nécessité des bonnes œuvres…`. De même, un nombre isolé dans le corps (`1`, `11`, `12`, etc.) n’est jamais conservé comme titre visible : la division reçoit l’intitulé correspondant du sommaire. Le marqueur numérique imprimé reste attesté par l’unité source, son `clean_text` et/ou ses métadonnées documentaires ; il n’est pas effacé de la couche source.

Dès que la projection est établie avec certitude, le sommaire n’est **pas répété comme bloc visible en tête** de l’explication : ses entrées sont retirées de la couche de lecture et demeurent accessibles dans la couche source. La rubrique `ANALYSE` elle-même reste également conservée comme unité source. Il ne faut donc ni transformer les entrées du sommaire en `verset`, ni leur appliquer un faux style de verset pour les maintenir artificiellement visibles.

La projection n’est jamais déduite mécaniquement de la seule suite des nombres. Une entrée groupée par l’édition (`1-2`, `3 et 4`, `3-5`, `7-8`, etc.) s’applique au groupe réellement désigné ; elle n’est pas divisée artificiellement. Une numérotation lacunaire, décalée, corrompue par l’OCR ou non numérotée impose une vérification du témoin et de la division correspondante avant toute projection. Aucun numéro manquant n’est inventé et aucune renumérotation n’est faite pour « régulariser » la série.

Lorsqu’un sommaire ne comporte qu’une entrée non numérotée et que le commentaire ne comporte qu’une division correspondante, cette entrée peut devenir le titre de cette division si la relation est certaine. Plus généralement, **aucun titre de sommaire n’est projeté avant que son point d’application dans le corps soit établi**. Tant qu’un bloc reste ambigu, le sommaire est préservé dans la source et la projection est différée plutôt que supposée.

Si une unité mélange matériellement la dernière entrée du sommaire et le commencement du commentaire, la frontière est restaurée par offsets déterministes sans réécrire la source. Une citation biblique présente dans le sommaire reste du contenu documentaire du sommaire ; elle ne devient une ligne `verset` de la lecture que si elle appartient réellement au corps du commentaire et que ses bornes y sont attestées.

### 3.9 Espaces à l’intérieur des parenthèses

Dans la prose courante, aucune espace ne se place immédiatement après une parenthèse ouvrante ni immédiatement avant une parenthèse fermante. Les formes `( mot )`, `( mot)` et `(mot )` sont normalisées en `(mot)`, sauf nécessité explicitement imposée par un contenu technique ou un fac-similé dont l’espace est lui-même sémantique. Cette règle vaut également dans les notes structurées.

## 4. Lacunes, absences et alignement biblique

### 4.1 Lacune d’une œuvre

Si une page ou un passage manque matériellement, chercher une source fiable du même état éditorial. Tant que le texte n’est pas retrouvé, employer la nature `texte absent` et la mention neutre `Texte manquant`. Ne jamais produire un texte vraisemblable.

### 4.2 Créneau biblique sans texte

Dans une traduction biblique, une cellule vide signifie que l’édition n’a pas de texte pour ce créneau. Elle ne doit être remplie ni par une autre traduction ni par une reconstruction automatique. La numérotation native de l’édition reste distincte de l’alignement canonique.

Lorsqu’un verset source est réparti sur plusieurs créneaux canoniques, tous les fragments conservent exactement les mêmes coordonnées natives `ch_orig`, `v_orig` et `v_orig_suffixe`. Seuls `canon_id`, `canon_id_fin` et `ordre_slot` décrivent l’alignement.

## 5. Métadonnées et page de titre

### 5.1 Page de titre imprimée

La page de titre de l’édition n’est pas reproduite dans le corps de l’œuvre ni dans les apparats. Ses renseignements utiles sont distribués dans les métadonnées de l’œuvre.

Une mention d’imprimeur, de lieu ou d’année, par exemple `De l’Imprimerie d’Antoine Vitré, 1649`, est conservée dans les données bibliographiques. Elle ne devient pas un segment d’apparat.


### 5.2 Titre et sous-titre

Le titre de l’œuvre appartient à `oeuvres.titre`. Il n’est pas répété comme `ref_niv1`. Le sous-titre appartient à `oeuvres.sous_titre`, même lorsqu’il est long. Les parties, livres, traités internes, chapitres et articles commencent seulement après cette distinction.

Une œuvre brève ou indivise peut donc ne posséder aucun `ref_niv`. L’interface et le sommaire doivent savoir afficher et ouvrir une telle œuvre sans fabriquer de niveau structurel artificiel. Une difficulté du lecteur se corrige dans le lecteur, jamais en altérant la structure éditoriale.

### 5.3 Notice

La notice doit identifier au minimum l’auteur, le titre, le traducteur ou éditeur lorsque connu, la date et le lieu de publication lorsque disponibles, ainsi que la source consultée. Les attributions discutées et remarques de traduction vont dans les champs de commentaire prévus, non dans le nom du traducteur.

La notice décrit l’édition réellement transcrite. Elle ne mélange pas les informations de plusieurs témoins sans les distinguer.

### 5.4 Lecture assistée de la page de titre

La lecture de la page de titre peut être assistée par une intelligence artificielle de vision. Sa sortie est toujours un candidat, jamais une donnée validée : l'éditeur la relit avant tout usage, selon la doctrine du candidat exposée à la section 14.

L'assistant ne renseigne que ce qui est lisible sur la page et n'invente rien. Il rend les valeurs en forme normalisée : casse française ordinaire plutôt que capitales d'affichage, ponctuation finale des titres conforme à la source ou à la consigne éditoriale applicable, graphies u et v régularisées. Cette casse est garantie par une normalisation déterministe qui n'agit que sur les champs entièrement en capitales.

L'enrichissement d'un champ non imprimé, tel que le titre original ou le nom complet de l'auteur et son identifiant, s'appuie d'abord sur le catalogue du projet, en lecture seule. À défaut de correspondance dans le catalogue, le champ reste vide. La connaissance générale du modèle ne sert jamais à combler une métadonnée.

Le traitement passe par l'abonnement, sans clé d'interface de programmation, et aucune donnée ne part sans consentement explicite. Toute clé d'accès à la base employée pour l'enrichissement demeure locale : elle n'est ni journalisée ni exportée.

## 6. Structure, niveaux, paragraphes et rangs


### 6.1 Identité d’un segment

Chaque version textuelle est identifiée par `id_texte` dans `oeuvre_textes`. Chaque segment possède un `id` technique, un `id_texte`, un `id_oeuvre`, un `segment_key` stable dans la version et un `segment_numero` unique dans cette version. `segment_numero` donne l’ordre éditorial global de lecture à l’intérieur de `id_texte` ; deux versions d’une même œuvre peuvent donc employer les mêmes numéros sans se confondre.

Lorsqu’un segment dérive d’une unité source structurée, `source_unit_id` le rattache à `oeuvre_texte_unites`. Les offsets Unicode, lorsqu’ils sont disponibles, décrivent son empan dans cette unité. `segment_key` et `source_unit_id` ne sont jamais recréés pour satisfaire un affichage ou un comptage.

Le segment est une unité de sens destinée à recevoir, au besoin, un ou plusieurs liens précis. Une longueur proche de 300 caractères est un repère de confort, jamais une loi ni un objectif à atteindre. La logique du texte préside toujours à la segmentation : syntaxe, mouvement de l’argument, articulation entre objection et réponse, citation et commentaire, hypothèse et conséquence, énumération ou changement réel d’unité de sens. Aucun seuil de longueur ne déclenche à lui seul une coupure. Un segment sensiblement plus long peut être conservé s’il forme une unité logique indivisible ; inversement, un segment court doit être scindé s’il réunit artificiellement plusieurs mouvements distincts. Les statistiques de longueur servent à repérer les cas à relire, non à décider de leur découpage. Ne pas produire de fragments dépendants du segment suivant pour être compris.

Une citation balisée forme normalement un segment avec sa formule introductive. Une citation exceptionnellement longue peut être découpée à une articulation interne sûre. Un vers ne fusionne jamais avec le vers suivant. Dans un dialogue, un changement de locuteur crée une frontière de paragraphe ; la nature ne doit injecter aucun tiret absent de la source.

Chaque segment textuel possède aussi :

- `paragraphe`, numéro du paragraphe dans son espace textuel et sa division ;
- `rang`, position du segment dans ce paragraphe, de 1 à k ;
- `page`, repère facultatif de provenance : lorsqu’elle est renseignée, cette valeur reprend uniquement le numéro imprimé visible dans l’ouvrage. Elle ne reprend jamais un numéro de vue, de scan, de page PDF, de séquence Gallica ou Google Books, ni une pagination déduite de métadonnées ;
- `nature`, fonction éditoriale du segment ;
- `espace_textuel`, espace technique de regroupement ;
- le cas échéant `join_before`, les offsets source et les métadonnées de traçabilité.

Un paragraphe source peut contenir plusieurs segments pour permettre des liens fins. À l’affichage continu, ces segments sont recomposés dans l’ordre des rangs et forment un seul paragraphe visible.

La clé de regroupement n’est jamais `paragraphe` seul. Elle comprend :

1. `id_texte` ;
2. l’espace textuel ;
3. les `ref_niv` qui délimitent réellement l’unité ;
4. `paragraphe`.

Un libellé visible `§ n` qui répète seulement le numéro de paragraphe ne crée pas une division supplémentaire. Une nature `citation` enchâssée reste dans l’espace du corps. Deux groupes non contigus ne sont jamais fusionnés mécaniquement sous prétexte qu’ils portent le même numéro.

Dans chaque clé composite, les rangs sont des entiers strictement positifs, uniques, continus et ordonnés `1…k`. Tous les segments d’un paragraphe à un seul segment portent `rang = 1`.

La numérotation des paragraphes suit la source lorsqu’elle existe. À défaut, elle est séquentielle dans chaque division. Dans un commentaire sélectif, elle peut reprendre le numéro du verset commenté ; des lacunes sont alors normales et ne doivent pas être comblées. Une œuvre ancienne dont paragraphes et rangs sont absents n’est jamais normalisée en copiant mécaniquement `segment_numero` ou une valeur constante : reprendre la source ou consigner la dette.

### 6.1.1 La jonction entre deux segments

`join_before` porte le séparateur à poser AVANT le segment courant lorsque plusieurs segments se recomposent en un texte suivi. ⛔ C’est une INSTRUCTION, jamais du texte : sa valeur ne se concatène pas au corps, elle se matérialise. Le défaut relevé le 24 août 2026 est exactement celui-là, et il se lisait à l’écran : le latin de Zycha des « Questions sur l’Heptateuque » composait « ut multos gignerent?spacenon enim et Adam ipse », le mot technique `space` paraissant au beau milieu d’Augustin. La donnée était juste, la recomposition stockée dans `oeuvre_texte_unites.clean_text` aussi ; seul le rendu concaténait.

⚠️ La colonne admet DEUX conventions, et rien en base ne les départage, puisqu’elle est en texte libre et que les lots d’import se sont succédé. Un JETON symbolique nomme le séparateur sans l’écrire, selon le vocabulaire du modèle éditorial : `none`, `space`, `line_break`, `paragraph_break`. C’est celui que la contrainte `bible_editorial_segment_sources_join_before_check` impose à la couche biblique éditoriale. Ou bien la colonne porte le SÉPARATEUR LITTÉRAL lui-même, écrit tel qu’il doit paraître : l’espace, la chaîne vide qui recolle un mot coupé, le saut de ligne, l’insécable, le tiret cadratin encadré d’espaces. Les deux se reconnaissent sans ambiguïté, un séparateur littéral ne portant ni lettre ni chiffre.

⛔ La matérialisation vit à UN SEUL endroit, que partagent toutes les surfaces qui recomposent : lecture suivie d’une œuvre, apparat critique, colonne en langue originale de la lecture en regard, traductions parallèles, couche biblique éditoriale. Un vocabulaire recopié à deux endroits finit toujours par matérialiser d’un côté ce que l’autre imprime.

⛔ Une valeur inconnue n’est JAMAIS rendue telle quelle : elle retombe sur le liant par défaut. Le rendu perd alors une intention, ce qui se corrige, au lieu de faire entrer une métadonnée dans le corpus, ce qui se lit.

⚠️ Une valeur nulle dit « l’édition n’a rien prescrit » et vaut l’espace simple, conformément au § 3.2. Ce n’est pas une commodité de rendu : au 24 août 2026, 65 798 segments répartis sur 44 versions n’ont jamais eu la colonne renseignée, et leur rendre la chaîne vide souderait les mots de tout ce fonds.

⛔ La jonction est celle du segment COURANT, et rien ne s’hérite du segment précédent ni de son unité source. Le premier segment d’un bloc affiché ne reçoit aucun préfixe, quelle que soit sa valeur : c’est la surface qui sait où son bloc commence, non la donnée. Une frontière entre deux unités sources n’appelle donc aucune règle particulière, le segment qui ouvre l’unité disant seul ce qu’il faut y poser. ⚠️ Et l’on ne pose pas de règle qui interdirait de joindre deux unités : une phrase court parfois de l’une à l’autre dans un même paragraphe, et 684 premiers segments d’unité chez Mirandol et Ceriziers portent la chaîne vide précisément pour recoller un mot coupé au passage.

La recomposition est LOGIQUE d’abord. La typographie canonique du § 3 est déjà portée par les données de chaque segment avant recomposition ; le rendu n’a donc pas à fabriquer les espaces typographiques ni les guillemets. Après recomposition viennent seulement les transformations proprement visuelles, notamment les césures conditionnelles et la justification. ⛔ Aucune valeur de métadonnée n’entre dans la chaîne remise au moteur typographique.

### 6.2 Niveaux de titre

Les champs `ref_niv1` à `ref_niv5` décrivent la structure éditoriale réelle de l’œuvre. Leur sens dépend de l’édition : partie, livre, homélie, chapitre, question, article ou autre division attestée. Le niveau 2 n’est donc pas nécessairement un paragraphe.

Le paragraphe appartient exclusivement à la colonne `paragraphe`. Il ne doit pas être recréé dans un `ref_niv`.

Les niveaux sont décidés après examen du sommaire et du fac-similé. Un niveau ne peut être inventé pour satisfaire l’interface. Le sommaire de l’application doit être construit à partir des niveaux réellement présents.

`ref_nivN` contient l’étiquette courte ou la clé du niveau. `ref_nivN_texte` contient, s’il existe, un complément éditorial ou un chapeau associé. Les appels de note sont admis et doivent être rendus consultables dans les titres et les champs `_texte`.

### 6.3 Modes d’affichage

L’interface offre un mode structuré qui navigue selon les niveaux disponibles et un mode texte intégral paginé qui ignore le découpage par `ref_niv1`. Ce second mode est nécessaire lorsque le premier niveau est trop fin ou ne représente pas une unité de lecture autonome.

Changer de mode ne change ni les données ni les paragraphes. La pagination d’interface n’est pas la pagination de la source.

### 6.4 Pagination de la source

La pagination imprimée n’est pas une structure de l’œuvre et ne commande ni les paragraphes, ni les segments, ni les rangs. Elle peut néanmoins être conservée comme repère facultatif de provenance dans la colonne `page`. Lorsqu’elle est renseignée, `page` reprend exclusivement le numéro effectivement imprimé dans le livre et visible sur le fac-similé. Ne jamais y inscrire un numéro de vue Gallica, une page de fichier PDF, un numéro de scan, un ordre de métadonnées ou toute autre pagination technique.

Un changement de page ne crée ni paragraphe ni segment à lui seul. Une phrase qui traverse une page reste continue. Si le numéro imprimé n’est pas visible ou reste ambigu, laisser `page` vide plutôt que l’inférer d’une pagination technique. La pagination n’est pas un objectif obligatoire de complétude lors d’une reprise ; le découpage en paragraphes de l’édition source, lui, doit être conservé.

## 7. Natures de segment

Le vocabulaire éditorial autorisé est :

| Valeur | Usage |
|---|---|
| `texte` | prose principale |
| `citation` | citation longue ou bloc cité, lorsqu’une distinction d’affichage est utile |
| `verset` | verset d’une citation biblique que l’édition pose verset par verset : un segment, un verset, et la suite des versets consécutifs forme la citation (§ 3.8) |
| `lemme` | fragment cité servant de point de départ au commentaire |
| `vers` | versification réellement présente |
| `signature` | bloc de signatures fermant un volume — approbations, censeurs, souscripteurs : une suite de lignes courtes que l’édition compose au fer à droite. ⚠️ À distinguer d’`apparat_editeur`, qui porte le paratexte rédigé quand `signature` n’en porte que les noms et les qualités |
| `rubrique` | rubrique éditoriale qui n’est pas un niveau de titre |
| `dialogue` | réplique ou bloc dialogué lorsque la distinction est utile |
| `introduction` | brève introduction ou argument placé en tête d’une division du corps |
| `apparat_auteur` | préface, digression, argument ou autre paratexte rédigé par l’auteur de l’œuvre et appartenant à sa lecture |
| `apparat_editeur` | préface ou avertissement du traducteur ou de l’éditeur, privilège, approbation et autre paratexte éditorial extérieur à l’œuvre de l’auteur |
| `apparat_critique` | valeur héritée seulement ; ne plus en créer, sauf compatibilité transitoire explicitement documentée |
| `separateur` | héritage ancien seulement ; ne plus en créer pour représenter un alinéa |
| `texte absent` | lacune matérielle signalée sans invention |

Un titre structurel n’est pas un segment de nature `titre`. Il appartient aux métadonnées ou aux `ref_niv`.

Toute nature utilisée doit être acceptée par le schéma, l’importateur, les éditeurs et le rendu. Si un élément manque, synchroniser l’application avant l’import.

L’`apparat_auteur` appartient au parcours de lecture de l’œuvre : il est stocké dans l’espace textuel du corps, garde sa position documentaire et apparaît dans le texte. Il ne doit pas être relégué hors lecture sous prétexte qu’il s’agit d’une préface, d’une digression ou d’un développement liminaire.

L’`apparat_editeur` appartient au paratexte de l’édition : il est stocké dans l’espace technique `apparat_critique`, avec ses propres paragraphes et rangs, et il est rendu hors du flux ordinaire du corps. La valeur technique `apparat_critique` de l’espace ne change pas cette distinction sémantique.

La nature `introduction` reste réservée aux courts arguments ou chapeaux qui introduisent une division du corps. Les anciens segments `apparat_critique` ne sont jamais reclassés en masse : leur auteur et leur fonction doivent être établis avant migration vers `apparat_auteur` ou `apparat_editeur`.



### 7.1. Les trois axes d’un style, et les règles de leur attribution

Un style se déclare sur **trois axes qui ne se confondent jamais**.

| Axe | Ce qu’il dit | Où il se déclare |
|---|---|---|
| **Le style** | ce que la chose EST : paragraphe, citation sortie, verset, titre de rang *n*, repère, apparat | dans la donnée |
| **La surface** | OÙ elle se compose : texte biblique, apparat des bibles, corps d’une œuvre, apparat des œuvres | par la page — ⛔ jamais sur le segment |
| **Le rang** | la profondeur d’un titre (T1-T6) ou la portée d’une information (I1-I6) | dans la donnée, pour le paratexte biblique |

**Un style nomme une fonction ; une surface nomme une composition ; une donnée ne porte jamais sa surface.**

⛔ **Le style ne se préfixe donc PAS par sa famille de page.** La question a été tranchée le 29 août 2026, et voici pourquoi.

D’abord parce que **c’est déjà ce que fait le site** : la citation sortie compose à la même mesure sur les deux surfaces, l’introduction perd son retrait de 12 % quand elle est lue dans sa pièce, le numéro de verset prend la face de la page Bible mais passe en exposant dans un bloc patristique. Ce sont des surcharges contextuelles d’un même style.

Ensuite parce que **le préfixe n’apprend rien à la donnée** : `segments.nature` vit dans `segments`, qui EST le corpus patristique, et `semantic_style` dans une table qui n’est que biblique. Écrire la famille dans la valeur, c’est répéter ce que la table dit déjà — et ce qui se répète dérive. La preuve en a été faite : `introduction_subsection` face à `introduction_sous_section`, deux graphies du même style, onze blocs invisibles.

Enfin parce que **le préfixe aurait légitimé le pire défaut du corpus** : le Pentateuque et le Nouveau Testament emploient des noms différents pour la même fonction. Avec un vocabulaire unique de fonctions, cette divergence est une erreur qu’on voit ; avec un préfixe par famille, elle serait devenue une variante.

⚠️ **Le nom se QUALIFIE dès qu’il sort de sa table.** Dans la charte, dans une planche, dans une conversation, on écrit `patristique/verset` et `bible_apparat/commentaire_pericope` : la barre dit la surface sans l’écrire dans la donnée. C’est nécessaire, `verset` désignant deux choses — une rangée de la page Bible et une nature de segment patristique.

**Les règles fixes d’attribution.**

1. ⛔ **Un style ne se devine jamais du texte** — ni de la casse, ni du corps, ni de la ponctuation, ni de la place dans la page. Il se déclare, et depuis le vocabulaire.
2. ⛔ **Le vocabulaire est CLOS, et la base le tient.** Une nature de segment hors de `chk_segments_nature` est refusée à l’écriture ; un style de paratexte hors de `bible_styles_semantiques` l’est par un déclencheur. Ce verrou a été posé le 29 août 2026 : jusque-là, un style inconnu entrait sans bruit et le bloc ne paraissait nulle part, le rendu refusant ce qu’il ne sait pas composer.
3. **On étend le vocabulaire, on ne le contourne pas.** Un besoin nouveau s’écrit dans le registre — `work/fillion/semantic_display_hierarchy.json` pour le paratexte, `app/lib/naturesSegments.ts` et la contrainte pour les segments — puis se sème en base. ⛔ Jamais un INSERT à la main : deux vocabulaires qui divergent valent moins qu’un seul.
4. ⚠️ **Une faute de graphie ne devient pas un alias.** Les alias existent pour les noms hérités, non pour les coquilles : celles-ci se corrigent dans la donnée.
5. **Le rang se lit dans la donnée, jamais dans le chiffre du jeton.** `T3` ne veut pas dire `h3` : la balise se calcule sur les parents réellement présents.
6. ⚠️ **Deux styles peuvent partager un rang s’ils diffèrent d’AXE.** `titre_chapitre_livre` et `titre_paragraphe_livre` sont tous deux T5 : le premier est matériel et ne commande pas les subdivisions, le second est analytique et les commande.
7. **La composition, elle, appartient à la surface** et vit dans le code, en un seul endroit par famille : `app/lib/compositionBible.ts`, `compositionOeuvre.ts`, `compositionVers.ts`, `compositionVersets.ts`, et les classes de `globals.css`. ⛔ Une composition écrite deux fois dérive à la première retouche.
8. **La planche des styles — `/admin/styles` — montre les quatre surfaces**, et ne rejoue aucune composition : elle les tire de ces modules. Une planche qui recopierait ferait autorité contre la page qu’elle décrit.

## 8. Notes structurées et références présentes dans le texte

**Références parenthétiques en note.** Lorsqu’un bloc de note est constitué d’une référence biblique ou bibliographique mise entre parenthèses, les parenthèses suffisent : on ne les encadre pas en plus de guillemets. Écrire `(Rm 6, 11 ; 1 P 2, 24).` et non `« (Rm 6, 11 ; 1 P 2, 24). »`. Cette règle ne supprime pas les guillemets qui auraient une fonction citationnelle propre à l’intérieur du contenu de la note.

### 8.1 Modèle normatif des notes

Une note est un objet éditorial autonome. Elle ne doit plus être définie seulement par un appel `[[n]]` dans un segment et par un bloc de texte dans `segments.notes`.

Le modèle normatif repose sur quatre tables complémentaires :

- `texte_notes` porte l’identité de la note : `id_texte`, `note_key`, numéro global ou éditorial, numéro imprimé lorsqu’il diffère, page imprimée, cible source et métadonnées de provenance ;
- `texte_note_ancres` porte chaque appel de note et son emplacement exact : unité source, segment ou champ structurel visé, offset, marqueur et contexte d’ancrage ; une même note peut posséder plusieurs ancres lorsqu’une édition le justifie ;
- `texte_note_blocs` porte le contenu ordonné de la note ; une note peut comprendre plusieurs blocs, chacun avec sa langue, sa nature, sa forme, son texte, son rendu éventuel et son statut de contrôle ;
- `texte_note_relations` porte, lorsqu’elles sont nécessaires, les relations entre blocs d’une même note ou entre éléments structurés de l’apparat.

Une note attachée à un titre, à un sous-titre ou à un champ `ref_nivN_texte` ne doit pas être déplacée artificiellement vers le premier segment du corps. Son ancre doit viser le champ ou l’unité réellement annoté dès que le schéma et le rendu le permettent.

`segments.notes` est un champ hérité de compatibilité. Il n’est plus la source normative d’une note nouvelle. Aucune nouvelle importation ne doit constituer durablement son appareil de notes uniquement dans `segments.notes`. Un stockage transitoire y est admis pendant une ingestion seulement si la migration vers les tables structurées fait partie de la même campagne et est contrôlée avant clôture.

Les œuvres anciennes qui possèdent encore leurs notes dans `segments.notes` constituent une dette technique explicite. Elles doivent être migrées progressivement vers `texte_notes`, `texte_note_ancres`, `texte_note_blocs` et, si nécessaire, `texte_note_relations`. Lorsqu’une telle œuvre fait l’objet d’une reprise éditoriale substantielle, la migration des notes doit être inscrite au plan de clôture ; tout report doit être explicite et documenté.

La migration est conservatoire. Elle ne réécrit pas la note. Elle préserve au minimum : le texte intégral, l’ordre des blocs, la langue, le numéro imprimé, le numéro global lorsqu’il existe, la page, la provenance, la position exacte de chaque appel et l’éventuelle appartenance à un titre ou à un apparat. Une correction du contenu n’est admise que selon les règles ordinaires de fidélité à la source.

Avant de supprimer ou de vider un ancien stockage dans `segments.notes`, vérifier que l’application lit bien le modèle structuré et que la note se rend correctement. Pendant la période de transition, l’ancien champ peut être conservé comme copie de compatibilité, mais il ne doit pas diverger silencieusement de la note structurée.

Toute création ou migration de notes est précédée d’une sauvegarde ciblée et suivie d’une relecture depuis la base. Le contrôle de clôture vérifie au minimum : même nombre de notes et d’appels que dans la source, numérotation et ordre cohérents, aucune note sans ancre, aucune ancre sans note, aucun doublon de `note_key`, ordre continu des blocs, appels placés sur le bon groupe de mots, notes de titres réellement consultables, conservation des pages et absence de perte ou de fusion de contenu.

### 8.2 Références bibliques présentes dans le texte


Une référence imprimée, une manchette ou un appel éditorial est d’abord une donnée de la source. Elle doit être préservée avant tout déplacement et sa forme imprimée reste traçable.

Une référence biblique réellement intégrée à la syntaxe demeure dans le corps, par exemple : `On lit dans Mt 5, 4 que…`, `selon l’Apôtre en Rm 8, 28` ou toute formulation où la référence est un constituant grammatical de la phrase.

En revanche, une référence isolée ou ajoutée en incise ne reste pas dans le flux du texte. Qu’elle provienne de l’auteur, du traducteur ou de l’éditeur, elle est transformée en note lorsqu’elle est matériellement détachée de la phrase par des parenthèses, des crochets, une ponctuation forte, une manchette, une fin de phrase ou une construction équivalente. Exemple : `… il pleura. (Matth. XXVI, 75.)` devient un appel au passage visé et une note contenant la référence imprimée.

Le déplacement suit cet ordre : conserver la forme source ; créer la note structurée et son ancre ; vérifier que l’appel porte sur le bon groupe de mots ; seulement alors retirer la référence isolée du texte continu. Aucune référence ne disparaît par simple nettoyage typographique.

Le déplacement en note ne constitue pas encore un lien biblique vérifié. Pendant la phase B, le numéro imprimé, l’abréviation, l’étendue et la cible sont confrontés au texte biblique. Une référence imprimée fautive reste conservée dans la note tandis que le lien canonique vise, s’il peut être établi, le passage réellement reconnu.

Les références déjà présentes dans une note ou dans un apparat restent dans cette note ou cet apparat. Les noms de livres suivent la table canonique du projet ; une abréviation non reconnue est résolue par le contexte et ajoutée au référentiel seulement si son sens est stable.

## 9. Liens bibliques

Les liens réels sont stockés dans `liens_bibliques`. Les anciennes colonnes `segments.lien_1` à `lien_4` et `segments.fiabilite` sont des vestiges. Elles ne servent ni à un import nouveau ni à une constitution de liens.

### 9.0 Protocole obligatoire

Avant toute constitution ou modification de liens, relire cette section et la mémoire `feedback_liens_protocole`.

Le travail suit cet ordre :

1. sauvegarder les liens existants du périmètre ;
2. définir précisément les segments à lire ;
3. lancer, si elle est utile, une passe mécanique limitée aux références explicites ;
4. lire le texte segment par segment ou paragraphe par paragraphe selon sa forme ;
5. confronter chaque cible candidate au texte biblique local ;
6. saisir ou corriger les liens ;
7. rechercher les oublis parmi les segments sans lien ;
8. exécuter les contrôles exhaustifs pertinents et un sondage aléatoire réparti ;
9. relire les données depuis la base.

La passe mécanique ne produit que des candidats de type 1 et ne leur attribue jamais la fiabilité `vérifié`. Les types 3 et 4 relèvent exclusivement de la lecture. Un résultat lexical, un score de similarité ou une référence éditoriale est une piste, non une preuve suffisante.

Un lien absent coûte moins cher qu’un lien faux. Toutefois, un candidat précis et défendable peut être conservé avec `à constituer`, `douteux` ou `probable` et `arbitrage_requis = true`. Si aucun motif partagé ou aucune cible précise ne peut être formulé, ne pas forcer de lien.

### 9.1 Type 1, citation ou référence explicite

Le texte cite un passage, le reproduit de manière reconnaissable ou donne explicitement sa référence. Une référence de l’éditeur fournit un candidat de type 1. Elle n’est `vérifié` qu’après confrontation réelle avec la cible.

### 9.2 Type 2, allusion

Le passage reprend une formulation, une image ou un épisode biblique assez déterminé pour identifier une cible, sans commenter directement le verset. L’identité doit être argumentable par des mots, une scène ou une structure partagés.

### 9.3 Type 3, commentaire

Le passage explique, développe ou interprète un texte biblique déterminé. Le lien peut exister même si le vocabulaire du commentaire ressemble peu au verset. Il est établi par lecture du mouvement de l’œuvre et de la cible biblique.

### 9.4 Type 4, écho ou rapprochement

Le passage entretient un rapport plus diffus mais réel avec un texte biblique déterminé. Ce type exige une justification explicite et une prudence supérieure. Il ne sert pas à enregistrer une simple proximité thématique générale.

### 9.5 Numérotation et psaumes

Le numéro imprimé est toujours un candidat à contrôler. Pour les psaumes et toute édition à numérotation divergente, reconnaître d’abord le passage par son contenu dans `versets_lecture`. Les tables de correspondance et la numérotation de l’édition orientent le voisinage de recherche, mais ne décident jamais seules.

Le lien final vise le `canon_id` du texte effectivement reconnu. Ne pas convertir aveuglément un numéro supposé hébreu, grec ou latin.

### 9.6 Typologie de l’œuvre

Adapter la méthode à la forme réelle :

- œuvre munie de références : extraction des candidats, puis contrôle de chaque cible ;
- œuvre à citations reconnaissables : recherche textuelle comme présélection, puis lecture ;
- commentaire suivi : progression dans le livre biblique et lecture continue ;
- œuvre allusive : lecture seule, avec motifs explicités.

Le balisage typographique et la forme littéraire sont deux axes distincts. L’absence de guillemets ne prouve pas l’absence de commentaire suivi.

### 9.7 Propagation par empan original

Quand plusieurs traductions sont alignées sur un texte original, le lien biblique est décidé au niveau du groupe sémantique de l’original. Toute traduction présente dans ce groupe hérite du même `canon_id`, même si elle paraphrase ou atténue l’écho. Le lien est ancré sur le segment minimal pertinent de chaque traduction, sans duplication sur tous les membres d’un groupe `n:m`.

Une asymétrie n’est admise qu’en cas d’omission réelle de l’empan original ou d’addition propre au traducteur. La propagation exige un alignement sémantique contrôlé, jamais une simple correspondance de position. Sans texte original de référence, les liens sont établis directement sur le témoin disponible.

## 10. Fiabilité des liens

Le vocabulaire unique est :

| Valeur | Sens |
|---|---|
| `à constituer` | cible ou étendue encore incomplète |
| `douteux` | rapprochement précis mais incertain |
| `probable` | cible solidement proposée, sans confrontation suffisante pour conclure |
| `vérifié` | passage et cible lus et confrontés ; décision éditoriale assumée |

Les formes `Lien à constituer`, `à_vérifier` et `erreur probable` sont interdites.

Un agent peut inscrire `vérifié` uniquement après lecture effective du segment dans son contexte et confrontation avec le ou les versets visés. Aucune passe mécanique, aucun héritage de données et aucun score ne peuvent produire cette valeur.

`arbitrage_requis` est vrai tant qu’une décision humaine ou éditoriale reste nécessaire. La provenance, la méthode, le motif et l’agent de révision sont consignés dans les champs de `liens_bibliques` prévus à cet effet.


## 11. Format d’échange et import des versions textuelles

### 11.1 Objets et identifiants

Une œuvre (`oeuvres`) peut posséder plusieurs versions textuelles dans `oeuvre_textes` lorsqu’elles relèvent de la même œuvre éditoriale : traductions, éditions ou états distincts destinés à rester sous le même `id_oeuvre`. Toute nouvelle importation textuelle reçoit un `id_texte` stable et appartient à un seul `id_oeuvre`. **Un original latin ou grec destiné à exister comme œuvre autonome n’est pas une simple version de la traduction : il reçoit sa propre ligne dans `oeuvres`, conformément au § 12.1 et au § 19.2.**

La version porte notamment son identité d’édition, sa langue, son traducteur le cas échéant, son lien vers `catalogue_notices`, son statut, ses indicateurs `is_default` et `is_public`, ses empreintes de sources et ses métadonnées.

La couche source structurée est portée par `oeuvre_texte_unites`. Chaque unité possède au minimum `id_texte`, `source_unit_id`, un ordre documentaire stable, son espace textuel, son texte propre et, lorsque disponibles, ses niveaux, sa page, son localisateur et son empreinte.

Le format d’échange des segments comprend au minimum :

`id_texte`, `id_oeuvre`, `segment_key`, `source_unit_id` lorsque disponible, `segment_numero`, `segment_texte`, `ref_niv1` à `ref_niv5`, `ref_niv1_texte` à `ref_niv5_texte`, `paragraphe`, `rang`, `nature`, `espace_textuel`, ainsi que les offsets, `join_before` et métadonnées lorsqu’ils existent.

`segments.notes` et `segments.texte_original` sont des champs hérités ou de compatibilité. Ils ne constituent plus la source normative d’une nouvelle note structurée ni d’un nouvel alignement entre versions. Toute œuvre ancienne encore dépendante de `segments.notes` doit être inscrite à la migration progressive définie au § 8.1 ; une nouvelle importation constitue ses notes directement dans le modèle structuré.

Les liens bibliques ne sont jamais importés comme colonnes de segment : ils suivent leur propre phase et leur propre table.

Tout CSV reste encodé en UTF-8. Les retours de ligne internes, guillemets et séparateurs sont échappés selon la norme CSV. Un import ne doit jamais perdre silencieusement une colonne inconnue : il la refuse ou la signale avant écriture.

### 11.2 Préparation

Avant import :

1. valider l’identifiant de l’auteur, de l’œuvre et de la version `id_texte` ;
2. vérifier la notice bibliographique et l’identité exacte de l’édition ;
3. résoudre le lieu, l’autorité de l’éditeur dans `editeurs` et l’année de référence de la version, puis préparer `edition_label` selon le § 19.2 ;
4. vérifier qu’aucune version existante ne serait écrasée ou confondue ;
5. contrôler les unités sources, leur ordre, leurs empreintes et leur recomposition ;
6. contrôler l’unicité de `(id_texte, segment_numero)` et de `(id_texte, segment_key)` ;
7. contrôler les clés de paragraphes et les rangs ;
8. contrôler les notes structurées, leurs ancres et leur numérotation ;
9. contrôler les alignements éventuels sans supposer de cardinalité `1:1` ;
10. recomposer chaque unité et la version entière pour détecter pertes, doublons et inversions ;
11. effectuer des sondages répartis contre la source.

### 11.3 Écriture

Importer par lots bornés et transactionnels. Une erreur arrête l’opération et déclenche le retour arrière du seul périmètre créé par l’import. Ne jamais supprimer une œuvre ou une version préexistante pour contourner un conflit d’identifiant. Les importeurs construisent `oeuvre_textes.edition_label` depuis les champs structurés validés — lieu, autorité d’éditeur et année de référence — au lieu d’y recopier une citation bibliographique développée ou une chaîne spécifique à un ouvrage. Une réimportation ne doit jamais réintroduire une variante d’éditeur, une collection, un tome, une pagination, une mention de responsabilité ou une chronologie détaillée dans ce libellé. Les informations supprimées du libellé restent conservées dans leurs champs structurés, les métadonnées de provenance ou les notes appropriées.

Après import, relire depuis la base `oeuvre_textes`, les unités, les segments, les notes, les ancres et les alignements concernés ; comparer les décomptes, les empreintes, les recompositions et des passages répartis.


## 12. Textes parallèles et alignements sémantiques

### 12.1 Original embarqué et œuvre originale autonome

Le latin, le grec ou une autre langue originale peuvent exister sous deux formes distinctes, qui ne doivent jamais être confondues.

**1. Original embarqué — forme héritée, en extinction.** Une traduction ancienne peut porter son texte original recopié dans `segments.texte_original`. ⛔ Cette copie ne sert plus la lecture bilingue, qui se compose depuis l’alignement (§ 12.2) : elle n’est plus lue qu’en repli, pour les œuvres dont l’original n’a pas encore de texte propre, et elle s’éteindra avec elles. Elle n’est pas une œuvre autonome : elle n’a pas d’`id_oeuvre`, pas de favori propre, et ne crée pas une seconde entrée de bibliothèque. ⛔ Aucune importation nouvelle ne l’alimente : un texte en langue originale entre comme **texte de l’œuvre**, avec son propre `id_texte`, et c’est l’alignement qui dit la correspondance.

**2. Œuvre originale autonome.** Lorsqu’on veut que le texte latin ou grec soit traité comme une œuvre normale — page propre, favori, commentaires, prélèvements, partage et présence autonome dans la bibliothèque — il reçoit une ligne distincte dans `oeuvres`, avec son propre `id_oeuvre`, puis sa ou ses versions dans `oeuvre_textes`. Cette ligne conserve le **même titre français** que l’œuvre sœur dans `oeuvres.titre` et porte le titre de langue originale dans `titre_original`.

La reconnaissance d’une édition originale est déduite des langues, sans booléen spécial : `langue_trad` est vide et `langue_originale` est renseignée. Une traduction française porte au contraire `langue_trad = Français` ou la valeur contrôlée équivalente. Oublier `langue_trad` sur une traduction la ferait donc prendre à tort pour l’original : c’est une anomalie de saisie à corriger dans les données.

L’appariement entre une traduction et son œuvre originale autonome n’emploie pas de clé étrangère. Il repose sur **le même auteur et le même titre normalisé** — comparaison insensible à la casse et aux accents. Renommer un seul des deux titres rompt l’appariement et doit être traité comme une modification structurelle.

Le menu de lecture suit cette hiérarchie : le mode « original » vise l’œuvre courante si elle est déjà originale ; sinon l’œuvre originale autonome sœur si elle existe ; à défaut seulement, l’original embarqué de la traduction. Le mode bilingue reste toujours sur la traduction et conserve ses titres français. Une œuvre originale autonome se comporte pour les favoris exactement comme toute autre œuvre : le favori porte son `id_oeuvre`. L’original embarqué n’a pas de favori, puisqu’il n’est qu’un mode d’affichage.

Cette règle ne supprime pas les alignements sémantiques nécessaires entre **versions d’une même œuvre éditoriale**. Deux traductions destinées à être lues en regard au moyen de `texte_alignement_ensembles` restent sous le même `id_oeuvre`. En revanche, l’œuvre originale autonome sœur n’a pas besoin d’être placée dans le même ensemble pour alimenter le menu de langue : l’appariement auteur + titre suffit, et le bilingue se compose depuis l’ensemble d’alignement qui relie les deux textes.

Un témoin médiéval ou une couche diplomatique conserve les distinctions prévues par sa convention propre. Une couche développée ou modernisée est une version dérivée distincte, jamais un remplacement silencieux du témoin.

### 12.2 Alignement éditorial

L’alignement est sémantique. Ne jamais supposer que les paragraphes, blocs HTML, pages ou limites de chapitres de deux versions coïncident. Une correspondance de position n’est qu’un candidat.

`texte_alignement_ensembles` définit le couple de versions, le niveau d’alignement, la méthode et son statut. `texte_alignements` porte les groupes ordonnés, leur cardinalité, leur confiance, leur méthode et leur justification. `texte_alignement_membres` rattache à chaque groupe les segments des versions concernées par `id_texte` et `segment_key`.

Les cardinalités `1:1`, `1:n`, `n:1`, `n:m`, `1:0` et `0:1` sont admises lorsqu’elles décrivent réellement le rapport entre les textes. Une omission, une addition ou une divergence ne doit jamais être masquée pour obtenir artificiellement du `1:1`.

**Le groupe d’alignement est le paragraphe de la lecture bilingue.** C’est lui qui recoupe les deux colonnes, et non `paragraphe`, qui ne vaut que dans un seul texte à la fois : sur les 57 groupes de la Doctrine des Apôtres, 28 enjambent deux sections numérotées, et 4 des 1 036 groupes de la Cité de Dieu enjambent deux paragraphes. Le niveau retenu est `paragraph`, à défaut `segment`, à défaut `division`, et seulement entre le texte lu et un texte en langue originale : un alignement entre deux traductions françaises n’a rien à mettre dans une colonne de latin.

Un groupe qui enjambe deux divisions se rend en plusieurs blocs, puisque les divisions se composent séparément, chacune sous son titre. L’original ne paraît alors qu’en regard du **premier** bloc ; les suivants gardent leur grille, colonne d’en face vide, pour que la traduction ne reprenne pas toute la largeur au milieu d’un empan. Le filet, qui marque l’appariement empan par empan, ne se tire qu’au **dernier** : tiré entre deux blocs d’un même groupe, il annoncerait une frontière que l’alignement ne reconnaît pas.

Un groupe de cardinalité `1:0` — une addition du traducteur — ne met rien en regard : son bloc se compose seul, sans ouvrir une grille bilingue vide.

⚠️ La lecture bilingue n’est offerte au lecteur que si **les deux** textes sont publics : la RLS des trois tables d’alignement l’exige. Un original laissé en `review` réserve donc le bilingue à l’administration, sans que rien ne le signale au visiteur.

Dans chaque ensemble, l’ordre des membres doit rester monotone dans chaque version. Un segment n’est ni perdu ni dupliqué sans justification explicite. Les limites sémantiques difficiles sont relues ; les groupes automatiques demeurent candidats tant qu’ils n’ont pas atteint le statut de contrôle prévu par le chantier.

Une divergence de limite de chapitre peut être résolue en redistribuant un fragment continu vers le groupe sémantique correspondant, à condition de conserver sa provenance, son ordre et ses unités sources. Une impossibilité réelle d’alignement est signalée, non masquée.

La propagation des liens bibliques entre versions au § 9.7 n’est permise que sur un alignement sémantique contrôlé. L’alignement ne prouve jamais, à lui seul, l’identité d’une citation ou d’une allusion.

### 12.3 Résorption des œuvres originales autonomes

Une langue originale prend son rang parmi les **textes** de l’œuvre, et n’ouvre pas d’entrée de catalogue distincte. L’original vient en premier, `…T0001`, les traductions ensuite, `…T0002`. C’est la forme déjà tenue par *La Cité de Dieu*, `A0010O0002`, dont le latin et le français vivent sous un seul `id_oeuvre`. L’œuvre originale autonome décrite au § 12.1 est une forme héritée, à résorber quand on la rencontre et à ne plus produire.

Les *Confessions* ont été ramenées à cette forme le 23 août 2026. Le latin de Knöll, CSEL 33, portait le numéro d’œuvre `A0010O0110` ; il est devenu le texte `A0010O0001T0001`, et la traduction d’Arnauld d’Andilly le texte `A0010O0001T0002`.

Avant de conclure qu’une langue originale existe en double, compter ce qui pend à chaque `id_texte` : `texte_notes`, `texte_note_ancres`, `texte_note_blocs`, `oeuvre_texte_unites`. Deux textes peuvent se collationner mot pour mot et ne pas se valoir. Aux *Confessions*, les 932 blocs se répondaient un à un, à la casse près, mais l’œuvre autonome portait seule les titres d’origine, les capitula latins et l’apparat critique de Knöll, que `segments.texte_original` ignore.

La fusion passe par les clés étrangères. `oeuvre_textes.id_texte` et `id_oeuvre` sont en `ON UPDATE CASCADE` vers `segments`, `texte_notes` et ses tables filles, `oeuvre_texte_unites`, `texte_groupes_logiques`, `texte_relations_logiques` et les tables d’alignement : un seul `UPDATE` sur `oeuvre_textes` déplace et renumérote l’ensemble. Renuméroter table par table expose à des orphelins. Les `segment_key` ne suivent pas le renom et gardent leur préfixe d’origine, sans risque de collision puisqu’ils sont uniques par texte.

Une fois les deux textes réunis, `segments.texte_original` cesse d’être une source et devient un cache dérivé, recopié verbatim du texte original par l’ensemble d’alignement. Toute correction du latin se fait sur le texte, puis se reporte.


## 13. Notes et apparats

### 13.1 Notes structurées et conservation

Les notes de l’édition sont conservées, sauf exclusion éditoriale explicite. Pour les nouvelles intégrations, la source normative est structurée : `texte_notes` porte l’identité de la note, `texte_note_ancres` ses appels et positions, `texte_note_blocs` son contenu sémantiquement découpé et `texte_note_relations` les relations internes éventuelles. `segments.notes` n’est qu’une projection ou un héritage de compatibilité lorsqu’il subsiste.

Une note appartient à une version `id_texte`. Son texte doit rester consultable depuis le corps, les titres, les sous-titres et les champs de niveau. Toute projection dérivée doit pouvoir être reconstruite depuis les tables structurées sans perte.

Les notes ajoutées par Corpus Scriptura pour signaler une émendation ou une difficulté sont distinguées dans leurs métadonnées des notes imprimées de l’édition.

### 13.2 Apparat d’auteur et apparat d’éditeur

Deux apparats sémantiques sont distingués.

- L’`apparat_auteur` comprend les préfaces de l’auteur, digressions, arguments et autres éléments qui appartiennent à son œuvre. Il apparaît dans le parcours du texte, à sa place documentaire.
- L’`apparat_editeur` comprend les préfaces et avertissements du traducteur ou de l’éditeur, privilèges, approbations et autres éléments éditoriaux extérieurs à l’œuvre de l’auteur. Il est conservé mais rendu hors du flux ordinaire du corps.

La qualification dépend de la responsabilité réelle du passage, non de sa seule position liminaire. Une préface de l’auteur n’est jamais reléguée dans l’apparat éditorial. Une préface du traducteur n’est jamais présentée comme un passage de l’auteur.

### 13.3 Numérotation

Les appels sont écrits `[[n]]` dans les projections textuelles. Chaque note possède un numéro unique, continu et global à l’échelle de `id_texte`, tous champs affichables confondus. La numérotation ne recommence ni à une partie, ni à un livre, ni à un espace textuel.

Les numéros du fac-similé ne sont pas repris comme identifiants de stockage. La forme ou le numéro imprimé peut être conservé dans les métadonnées, tandis que `note_number` suit l’ordre de lecture de la version numérique.

Chaque appel possède exactement une note consultable et chaque note conservée possède au moins un appel légitime, sauf note explicitement non ancrable et documentée comme telle. Les appels dans les titres doivent être reconnus par le même mécanisme d’affichage que ceux du corps.

### 13.4 Placement

L’appel suit immédiatement le mot ou le groupe annoté, sans espace. Il se place avant le signe de ponctuation qui clôt le passage annoté : `mot[[n]].`, `question[[n]]?`, `proposition[[n]];`. Devant un guillemet fermant, il reste à l’intérieur et précède également la ponctuation finale : `« … mot[[n]]? »`. Son déplacement ne doit pas modifier la portée de la note.

### 13.5 Structure interne et mise en forme sémantique

La mise en forme d’une note suit la fonction de ses éléments, non leur seule position dans la page. La prose de commentaire, les citations, les citations en vers et les références bibliographiques ou attributions doivent rester distinguables dans les artefacts de travail et les exports.

Lorsqu’une note contient une citation en vers, son caractère versifié est une donnée éditoriale. Conserver l’ordre des vers et leurs retours à la ligne ; un vers ne fusionne jamais avec le suivant. Le document de travail et le rendu appliquent à cette citation un style de note versifiée distinct de la prose environnante.

Une référence bibliographique courte ou une attribution qui porte sur une citation est placée immédiatement après le passage qu’elle identifie, dans le même bloc logique. Une position isolée, centrée ou alignée à droite dans le fac-similé n’est pas reproduite lorsqu’elle relève seulement de la composition typographique. Le texte de la référence, son ordre et ses enrichissements sémantiques sont conservés.

### 13.6 Ancres positionnelles et projection textuelle

Deux représentations d’un appel sont admises, mais elles ne doivent jamais être confondues. Un import ancien peut porter matériellement `[[n]]` dans le champ textuel. Un import structuré peut au contraire conserver `segments.segment_texte` sans marqueur et porter l’appel dans `texte_note_ancres`. Dans ce second cas, l’ancre structurée est normative : elle indique la version, la note, le segment, la cible, le marqueur et la frontière d’insertion. L’absence matérielle de `[[n]]` dans `segment_texte` n’est donc pas une absence de note.

Pour une cible `source_target = 'segment_texte'`, `segment_offset_unicode` désigne la frontière où l’appel doit paraître. **Les offsets sont comptés en points de code Unicode et sont indexés à partir de zéro.** La valeur `0` place l’appel au début ; une valeur égale à la longueur Unicode place l’appel à la fin. `anchor_text_left` et `anchor_text_right` servent à contrôler la position contre le texte source ; ils ne remplacent ni le texte ni l’offset et ne servent pas à deviner une position différente.

`source_target` nomme toujours le champ réellement ciblé : il ne contient ni `note_key`, ni identifiant de note, ni libellé arbitraire. Quand `anchor_id` encode lui-même une cible — par exemple avec le suffixe `:segment_texte` — cette cible et `source_target` doivent être identiques. Aux longueurs déclarées, le suffixe de `anchor_text_left` et le préfixe de `anchor_text_right` coïncident exactement avec le texte placé de part et d’autre de l’offset. Une différence de casse dans une phrase témoin est corrigée dans la métadonnée témoin, jamais en déplaçant un offset qui correspond déjà au texte.

L’application reconstruit au rendu une **projection textuelle** en insérant les marqueurs aux frontières déclarées, puis confie cette projection au moteur commun des appels de note. Elle ne réécrit jamais `segments.segment_texte` pour satisfaire l’interface. Le calcul suit les points de code Unicode, applique les insertions de la fin vers le début, ordonne de manière stable plusieurs appels à la même frontière et demeure idempotent : un marqueur déjà matériel n’est pas dupliqué. La copie, le signalement et l’édition administrative continuent d’utiliser le texte canonique sans projection.

Une erreur de lecture de `texte_notes`, `texte_note_ancres`, `texte_note_blocs` ou `texte_note_relations` ne doit jamais être transformée silencieusement en « aucune note ». Elle est journalisée et remontée comme échec de chargement. De même, un marqueur mal formé, un offset nul pour une cible textuelle, un offset hors limites ou une note sans contenu consultable est une anomalie d’intégrité à corriger, non un cas à masquer.

Les quatre tables sont lues avec une pagination explicite et un ordre stable. Le plafond PostgREST du projet n’est jamais tenu pour le nombre total : une version qui porte plus de 1 000 notes ne doit pas perdre silencieusement les lignes situées après la première page.

Les deux modes — marqueurs matériels anciens et ancres structurées — restent compatibles pendant la transition. Une conversion vers le modèle structuré ne supprime les marqueurs matériels qu’après vérification que la projection reconstruite est strictement équivalente. Le drapeau `needs_review` signale une relecture éditoriale encore nécessaire ; il ne rend pas, à lui seul, une note invisible. Tout bloc importé sans validation humaine explicite conserve `needs_review = true` ; seule une relecture réellement accomplie peut retirer ce signal. La publication relève des statuts et politiques prévus, non de ce drapeau technique.

Un lot partiel est déclaré comme tel. Avant de dire les notes d’une version complètes, contrôler au minimum : unicité et continuité de `note_number`, présence réciproque des notes, ancres et blocs, cohérence entre `anchor_id` et `source_target`, validité contextuelle de chaque offset, couverture des divisions attendues, absence de marqueur orphelin et empreinte de la source structurée dans `oeuvre_textes.notes_json_sha256` ou la métadonnée de provenance prévue. Une suite continue de numéros ne prouve pas à elle seule que les livres suivants ont été importés. Un import encore croissant n’est ni réparé ni déclaré complet : on attend un instantané stable, on le sauvegarde, puis toute correction est relue et comptée après écriture.

### 13.7 Affichage de l’appel de note

Le sommaire ne porte pas le texte des notes : un appel y serait muet, et il hache un intitulé qu’on parcourt du regard. Les appels y sont donc **masqués**, à tous les niveaux, chapeaux compris. Le marqueur reste dans la donnée : seul l’affichage le retire.

Partout ailleurs l’appel demeure **actif** : dans le corps du texte, dans les titres de toutes profondeurs, y compris le niveau 1, et sur la page de titre. Un titre n’est pas une zone où l’érudition s’efface ; la note qui l’accompagne dans l’édition imprimée se lit sur le site comme celle du corps.

La forme de l’appel s’accorde au style où il se trouve, au lieu d’imposer partout la même vignette :

- il hérite la police et le corps de son contexte, mais **jamais l’italique** : ⛔ **un appel de note est toujours en romain**, sur quelque page que ce soit, et quoi que fasse le texte autour de lui. Un chapeau, un titre original, un sous-titre d’essai sont composés en italique ; l’appel qu’ils portent reste droit. C’est un renvoi, non un mot de la phrase, et il n’imite pas la composition qui l’accueille. Règle d’auteur du 28 août 2026, qui remplace la règle inverse tenue jusque-là ;
- dans la prose et dans les titres de rang bas, composés à la taille du texte, il garde sa teinte brune ;
- dans un titre de haut rang et sur la page de titre, composés très larges, cette teinte devient une tache : l’appel y prend l’encre du titre, proportionnellement plus petit.

⛔ **L’appel ne se hisse pas au-dessus des hampes.** Le `vertical-align: super` du navigateur le monte trop haut — 0,41 em au-dessus de la ligne de base, mesuré le 28 août 2026 dans le texte de lecture —, si bien que le chiffre flotte au-dessus du texte au lieu de s’y ranger. On lui donne un décalage MAÎTRISÉ de **0,31 em**, qui est exactement la hauteur de l’ordinal des siècles : un « XIIIᵉ » et un appel de note se lisent ainsi à la même hauteur dans la même ligne, et le haut du chiffre affleure les hampes. Cette hauteur se compte en em du TEXTE PORTEUR et vaut pour les trois variantes d’appel — un appel plus petit ne se lit pas plus bas, il se lit plus petit. Elle ne gonfle pas l’interligne, contrairement à `super`, et elle ne dépend pas de la balise employée.

⛔ **Jamais de pointillé sous un appel de note**, ni aucun autre soulignement, nulle part et à aucun moment. L’exposant et la teinte le signalent assez. Ce n’est pas un réglage à rediscuter au cas par cas : c’est une règle d’auteur.

⛔ **L’appel ne se sépare jamais de la ponctuation qui le suit.** Un point rejeté seul en tête de la ligne suivante est interdit. L’appel est un exposant composé en `inline-block`, où le navigateur voit une occasion de couper la ligne, en aval comme en amont. Au rendu, il voyage donc dans un groupe insécable qui emporte le dernier mot qui le précède et la ponctuation qui le suit.

**Deux notes qui se suivent s’écrivent « 2 & 3 »**, esperluette entre deux espaces insécables : deux exposants collés se liraient « vingt-trois ». Au delà de deux, la suite s’écrit « 2, 3 & 4 », virgules puis esperluette avant le dernier. ⛔ **L’esperluette et les virgules sont elles-mêmes en exposant**, à la hauteur des chiffres qu’elles séparent : posées sur la ligne de base, elles font retomber le milieu de la suite. L’exposant appartient au STYLE de l’appel, jamais à la seule balise qui le porte : le séparateur n’est pas toujours composé dans la même balise que l’appel, et la forme ne peut pas dépendre de ce choix-là.

Sur la page Bible, la note d’un développement éditorial (introduction, commentaire, notice) s’ouvre AU CLIC sur son appel, dans la même fenêtre que la note de verset. Elle ne s’imprime plus au bas du développement : une liste plantée au milieu du corps coupe la lecture de ce qu’elle commente. ⛔ La liste ne subsiste que pour les notes dont la transcription n’a relevé aucun point d’appel, faute de quoi elles disparaîtraient du site, et elles la quitteront une à une à mesure de leur ancrage.

La note appelée dans un titre est cherchée dans **toute la section chargée**, et non sur le seul premier segment du groupe : dans les imports à notes structurées, l’ancre tombe couramment quelques segments plus loin, et s’en tenir au premier ouvrirait une note vide.

## 14. OCR, HTR et transcription patrimoniale

Cette section régit deux opérations différentes : l’océrisation des imprimés anciens et la transcription assistée des manuscrits. Un moteur d’OCR ou de HTR produit un brouillon. Il ne produit jamais, à lui seul, un texte éditorial validé.

### 14.1 Niveaux de texte et statuts

Toujours distinguer :

- la source matérielle ou son fac-similé ;
- le résultat brut de l’OCR ou de la HTR ;
- la transcription de travail ;
- la transcription relue ;
- le texte validé et importé ;
- les éventuelles couches développée ou modernisée.

Les mots `transcrit`, `relu`, `validé` et `importé` ne sont pas synonymes. Le statut public indique le niveau réellement atteint. Un lot non relu reste explicitement provisoire, même si son XML est valide et si les tests techniques réussissent.

### 14.2 Autorité de la source et traçabilité

Le fac-similé demeure l’autorité. Une couche texte, un OCR, une HTR, une édition moderne, une traduction parallèle ou le contexte attendu ne peuvent le remplacer.

Chaque unité conserve un lien stable avec la source : pour un imprimé, la page ou la vue du fac-similé peut être conservée comme localisateur de preuve dans le dossier de travail ou les métadonnées de source, sans être projetée comme pagination structurelle dans les segments ; pour un manuscrit, feuillet, face, colonne et ligne restent les localisateurs matériels. Les identifiants suivent l’ordre matériel et ne sont jamais recréés pour satisfaire un comptage attendu.

Conserver, selon le cas :

- l’identité bibliographique ou la cote du témoin ;
- l’URL pérenne de la source ;
- les images réellement utilisées ;
- leurs dimensions et empreintes SHA-256 ;
- les bornes exactes du lot ;
- les scripts, conventions et rapports nécessaires à la reproduction du travail.

Ne jamais inventer une zone, une ligne ou une coordonnée absente. Une colonne vide ou partielle reste vide ou partielle.


### 14.3 Imprimés et éditions non médiévales

Extraire le texte page par page. Comparer toute couche texte du PDF avec l’image. Si elle est défectueuse, lancer un OCR contrôlé sur les pages concernées.

La relecture vérifie notamment :

- lignes omises, répétées ou inversées ;
- mots coupés en fin de ligne ou de page ;
- confusions de caractères, ligatures, accents et petites capitales ;
- guillemets, apostrophes, ponctuation et espaces ;
- changements d’alinéa ;
- titres et niveaux ;
- appels et textes de notes ;
- italiques et autres enrichissements ;
- début et fin de chaque division.

Une erreur d’OCR est corrigée contre le fac-similé : le texte éditorial reprend ce qui est réellement imprimé. Une erreur certaine de l’édition imprimée elle-même est également corrigée dans le texte publié. Lorsqu’une émendation reste discutable, que la leçon source peut présenter un intérêt ou que la correction n’est pas absolument univoque, ajouter une note éditoriale explicite, par exemple : `Note de l’éditeur : la version d’origine donne « XXXX ».` La note distingue toujours la leçon imprimée de la correction retenue.

Réunir un mot coupé typographiquement en fin de ligne ou de page. Conserver un trait d’union lexical réel. Pour les éditions non médiévales, appliquer la normalisation typographique et glyphique du § 3, notamment `ſ` vers `s` et les ligatures équivalentes, sans moderniser l’orthographe, les désinences, le vocabulaire ou la syntaxe.

Cette règle d’émendation des éditions imprimées ne transforme pas une transcription diplomatique médiévale en édition corrigée. Les témoins médiévaux et manuscrits suivent les conventions spécifiques des §§ 14.4 à 14.6.

### 14.4 Manuscrits et HTR

La HTR sert au repérage et à la préparation d’un brouillon. Chaque ligne destinée au corpus doit être confrontée visuellement au manuscrit.

La transcription diplomatique conserve ce qui est effectivement visible, selon les conventions du projet : graphies, signes tironiens, abréviations, coupures matérielles, formes fautives ou inhabituelles, lacunes, ajouts et lectures incertaines.

Ne jamais corriger un passage parce qu’une autre Bible, une édition critique, la grammaire ou le sens attendu proposent une forme plus vraisemblable. Ces sources peuvent signaler une difficulté ; elles ne décident pas de la lecture.

Pour chaque ligne, vérifier particulièrement :

- limites des mots ;
- lettres omises, ajoutées ou confondues ;
- noms propres et nombres ;
- abréviations et signes tironiens ;
- mots poursuivis sur la ligne, la colonne ou le feuillet suivant ;
- changement de main, ajout, réclame ou irrégularité matérielle.

### 14.5 Encodage des difficultés

Une lecture indécidable reste incertaine. Employer les structures prévues, notamment `unclear`, `gap`, `add`, `choice`, `abbr`, `expan`, `fw` et `break="no"`, sans les détourner pour rendre le texte plus lisible.

`unclear` porte sur une difficulté réelle de lecture, non sur une simple absence de relecture. Une suite manifestement fautive ne devient pas acceptable parce qu’elle est placée dans `unclear` : décrire au moins les lettres certaines et réexaminer la ligne.

`break="no"` signale la continuation d’un même mot. Vérifier les raccords entre lignes, colonnes, feuillets et lots. Les comptages globaux ne doivent jamais conduire à ajouter ou retirer artificiellement une coupure.

### 14.6 Couches diplomatique, développée et modernisée

Ces trois niveaux sont distincts.

- La couche diplomatique transcrit le témoin.
- La couche développée résout uniquement les abréviations prévues par les conventions. Elle ne corrige ni l’orthographe, ni la syntaxe, ni le vocabulaire.
- La graphie modernisée constitue une édition dérivée. Elle exige une charte propre, une reconstruction depuis la transcription active et des liens explicites vers les unités sources.

Il est interdit de fabriquer une graphie modernisée par simple concaténation des lignes développées. Les mots coupés doivent être réunis, les transformations doivent être explicites et les lacunes ou incertitudes doivent rester représentées.

Une couche modernisée partielle, hétérogène, non synchronisée ou identique au texte développé reçoit un statut provisoire et n’est pas affichée publiquement. Toute correction de la transcription source doit pouvoir être propagée ou détectée par un test de synchronisation.

### 14.7 Lots, premières passes et relectures

De grands lots sont admis si la traçabilité est conservée. Les diviser en blocs internes servant aux sauvegardes, aux empreintes et aux contrôles de structure. Ces blocs ne deviennent pas nécessairement des lots éditoriaux distincts.

Une première passe assistée n’équivaut pas à une relecture. Après la transcription, effectuer selon le risque :

- une relecture complète ligne par ligne ;
- ou un contrôle ciblé des lectures incertaines, complété par des sondages répartis sur le lot.

Si les sondages découvrent plusieurs erreurs certaines dans des colonnes différentes, le contrôle ciblé est insuffisant : reprendre une passe visuelle sur l’ensemble du lot, en corrigeant le brouillon existant sans le ressaisir inutilement.

Un nombre élevé de lignes déclaré relu dans un temps matériellement invraisemblable constitue un signal d’alerte, non une preuve de qualité. Les mentions telles que `direct_visual_review` ne sont inscrites que lorsqu’une comparaison visuelle a réellement eu lieu.

### 14.8 Contrôles éditoriaux

Les contrôles automatiques prouvent la cohérence du fichier, non l’exactitude paléographique. Un faux déchiffrement parfaitement encodé peut réussir XML, Relax NG, les tests et le build.

Avant validation d’un lot :

- contrôler toutes les lectures incertaines ;
- effectuer des sondages visuels répartis entre le début, le milieu, la fin et les zones irrégulières ;
- vérifier au moins les colonnes comportant nombres, noms propres, lignes partielles ou forte densité d’incertitudes ;
- comparer les corrections annoncées avec les images ;
- consigner les erreurs certaines, les corrections probables et les doutes maintenus.

Les preuves visuelles sont réservées aux cas difficiles, contestables ou structurants. Elles ne sont pas exigées pour chaque ligne correcte.

### 14.9 Versions, candidats et import

Le candidat reste séparé du TEI actif jusqu’à validation. Avant tout import :

- calculer l’empreinte du TEI actif et du manifeste ;
- vérifier qu’ils correspondent à la base attendue ;
- sauvegarder l’état actif ;
- contrôler que le préfixe antérieur au lot est inchangé ;
- produire un diff intégral et vérifier qu’il reconstruit le candidat octet pour octet ;
- valider XML, Relax NG, identifiants, images, parseur, tests, lint et build.

L’import est transactionnel. Après import, régénérer le manifeste, vérifier les images et les comptages, puis contrôler quelques lectures repères.

L’empreinte d’un candidat peut changer lors de sa promotion si seules les métadonnées passent de `candidate` à `active`. Cette nouvelle empreinte doit être certifiée par un diff montrant qu’aucun texte n’a changé. On ne restaure jamais automatiquement un ancien fichier sur la seule base d’une différence d’empreinte.

### 14.10 Comptages et avancement

Distinguer toujours :

- feuillets ;
- faces ;
- colonnes ;
- lignes ;
- unités transcrites ;
- unités relues ;
- unités importées.

Un champ nommé `folios` ne doit pas contenir un nombre de faces. Les pourcentages d’avancement précisent leur dénominateur et leur statut : matériellement transcrit, relu ou intégré dans le corpus actif.

Les nombres de `unclear`, `gap`, `choice`, `add`, `fw` et `break="no"` sont comptés selon une couche et un parseur explicitement nommés. Ne pas confondre les occurrences diplomatiques avec celles de l’ensemble du XML.

### 14.11 Paquets de contrôle et archives

Conserver localement une archive complète contenant le candidat, les images, les rapports, les CSV, le manifeste, les comptages, le diff et les empreintes.

Pour un contrôle distant, produire si nécessaire un paquet léger contenant le TEI, le diff, les rapports, les CSV et un choix d’images ou de recadrages. Le paquet léger ne remplace pas l’archive complète.

Tous les fichiers annoncés dans un manifeste ou un index de preuves doivent être présents. Supprimer les références mortes plutôt que prétendre fournir des images absentes.

### 14.12 Nettoyage

Nettoyer seulement après vérification de l’archive finale et réussite de l’import.

Conserver impérativement :

- la source ;
- le TEI et le manifeste actifs ;
- les images actives ;
- les archives finales ;
- les schémas, tests et scripts utiles ;
- les rapports d’import et de validation.

Supprimer seulement les caches, environnements temporaires, doubles pages redondantes, planches-contact et copies de travail intégralement contenues dans une archive finale vérifiée. Ne supprimer aucun fichier ambigu. Consigner les suppressions importantes.

## 15. Corpus biblique et traductions

### 15.1 Un créneau canonique, une lecture d’édition

L’ossature canonique sert à aligner les traductions. Elle ne remplace pas leur numérotation native. Une traduction ne reçoit dans un créneau que le texte attesté par son édition.

### 15.1.1 Référence canonique ultime : TOL/AELF

Pour tous les alignements bibliques de Corpus Scriptura, la référence canonique et sémantique ultime est la **Traduction officielle liturgique de l’AELF**, dans sa capture de référence enregistrée sous `TR0012` / `TOL_WEB_20260821`.

Cette version constitue une **référence immuable**. Son texte, sa ponctuation, son ordre, ses divisions et ses références natives ne sont jamais corrigés, normalisés, modernisés, réécrits ni adaptés aux autres traductions. Une difficulté d’alignement ne justifie jamais de modifier la TOL/AELF. Les formes particulières de sa numérotation et de sa structure font autorité pour l’ossature d’alignement.

Toutes les autres traductions et tous les autres témoins sont projetés sur cette référence **canoniquement et sémantiquement**. Lorsqu’une versification source ne coïncide pas avec celle de l’AELF, on scinde ou regroupe les unités du témoin dans la couche d’alignement, sans modifier son texte, et en conservant toujours les informations nécessaires pour reconstituer exactement sa structure et ses références natives.

La référence native AELF doit elle aussi rester reconstructible et inchangée. Les champs d’alignement peuvent être corrigés ; le texte de `TR0012` ne doit pas l’être.

Si le site de l’AELF publie ultérieurement une révision, **ne jamais écraser ni synchroniser silencieusement** `TOL_WEB_20260821`. Toute nouvelle capture constitue une nouvelle version distincte. Le remplacement éventuel de la référence ultime exige une décision éditoriale explicite, un audit des différences et une migration documentée des alignements existants.

### 15.1.2 Affichage des traductions alignées

Corpus Scriptura distingue deux axes de lecture sans jamais confondre leurs références.

**Polyglotte et lecture comparée.** L’axe d’affichage est celui de la TOL/AELF. Chaque traduction est recomposée dans les cellules AELF au moyen de la couche d’alignement : une unité native peut alimenter plusieurs entrées AELF, plusieurs unités natives peuvent composer une même entrée AELF, et les cardinalités `1:n`, `n:1` ou `n:m` sont rendues telles quelles. Dans chaque cellule, les références natives du témoin restent accessibles et ne sont jamais remplacées par le numéro AELF.

**Bible classique.** Par défaut, une traduction se lit dans son ordre matériel propre et avec sa numérotation native. La couche TOL/AELF est une information secondaire de correspondance ; elle ne réordonne pas la page. Si plusieurs versets natifs sont réunis pour correspondre à une même unité AELF, leur numérotation native est affichée ensemble, par exemple `12–13`, sans faire croire qu’il s’agit d’un seul verset de l’édition. Si une unité native recouvre plusieurs entrées AELF, la correspondance TOL affiche l’étendue correspondante. Les deux systèmes de référence doivent toujours être visuellement distinguables.

**Notes publiques d’alignement.** Une correspondance ordinaire `1:1` ne produit aucune note. Une divergence utile au lecteur — scission, fusion, inversion, changement de chapitre, coquille de numérotation attestée par l’édition, addition ou omission propre à une tradition — reçoit une note éditoriale courte qui nomme la référence native et la correspondance TOL/AELF. Cette note décrit une différence de versification ou de transmission ; elle ne qualifie pas de fautive une tradition simplement différente. Les données techniques de mapping, scores et justifications internes ne sont pas exposés tels quels au lecteur.

### 15.2 Intégrité

Pour chaque traduction, vérifier les livres, chapitres, versets, suffixes natifs, créneaux vides, versets soudés et versets scindés. Les contrôles comparent aussi le texte intégral et sa longueur, pas seulement le nombre de lignes.

### 15.3 Corrections

Une correction biblique est confrontée à l’édition source. Les cahiers de correction servent de liste de travail, non de preuve autonome. Sauvegarder les lignes touchées et vérifier que les coordonnées natives, le canon et les autres traductions n’ont pas changé accidentellement.


### 15.4 Matière surnuméraire, gloses et autres additions propres à un témoin

Une matière présente dans une traduction ou un témoin biblique mais dépourvue d’équivalent canonique est conservée dans le flux éditorial à sa position matérielle exacte. Sa relation au canon est portée par `bible_canonical_alignments.alignment_status = ''MANUSCRIPT_EXTRA''`. On ne crée jamais pour elle de faux `canon_id`, de verset `bis`, de suffixe artificiel ni de statut spécialisé du type `MANUSCRIPT_EXTRA_GLOSS`.

La nature philologique du surnuméraire est distincte de son statut d’alignement et se porte dans `bible_editorial_segments.metadata`. Le modèle normatif est : `manuscript_extra = true`, `phenomenon = <type contrôlé>`, et, lorsqu’un voisinage canonique précis l’éclaire, `canonical_context = <canon_id voisin>`. Les premières valeurs reconnues sont `gloss` pour une glose exégétique ou doctrinale et `dittography` pour une répétition matérielle. D’autres valeurs ne sont ajoutées qu’après décision éditoriale explicite. Une nature inconnue n’empêche jamais la conservation ni le rendu du segment.

Une glose est donc un `MANUSCRIPT_EXTRA` de `phenomenon = ''gloss''`. Elle reste partie intégrante du témoin et demeure visible par défaut. Dans la Bible classique, elle apparaît dans le flux à sa position matérielle exacte ; l’emplacement réservé au numéro de verset porte le libellé `Glose`, sans numéro canonique. Dans la polyglotte, elle crée une ligne surnuméraire à la même position ; seule la colonne du témoin qui la porte contient du texte, les autres restent vides. Le libellé public est `Glose`; si la nature n’est pas reconnue, employer le libellé générique `Surnuméraire`.

Le rendu doit distinguer légèrement cette matière du texte canonique par les tokens sémantiques de l’interface, sans couleur d’erreur ni masquage par défaut. Il ne faut ni transformer la glose en note, ni la fusionner avec le verset précédent, ni la repousser à la fin du chapitre. Les ancres et références des versets canoniques voisins restent inchangées.

Le redécoupage d’un surnuméraire ne modifie jamais `bible_source_unit_texts`. Il agit seulement sur les segments éditoriaux, leurs mappings source et les alignements. Toute opération conserve exactement la couverture matérielle, l’ordre des unités, les empreintes des couches source et les invariants de séquence.

### 15.5 Une table, deux natures — `traductions.est_biblique`

La table `traductions` tient deux choses. Les traductions de la BIBLE, qui portent un texte versifié et se choisissent dans les menus de lecture. Et la notice bibliographique de la traduction employée pour une œuvre PATRISTIQUE — Jeannin pour Jean Chrysostome, Barreau et Charpentier pour la Cité de Dieu, Guillon pour Cyprien, Claude de Seyssel pour Eusèbe —, à laquelle renvoient `oeuvres.trad_id` et `oeuvre_textes.id_traduction`.

⛔ Rien ne les distinguait, et les secondes paraissaient dans les sélecteurs de traduction biblique — jusque dans le menu de la page d’une œuvre patristique, qui offrait de lire ses citations bibliques dans la traduction même dont elle affiche le texte. La colonne `est_biblique` le dit désormais, et c’est elle, et elle seule, que filtre tout sélecteur de traduction.

⚠️ Deux discriminants en tenaient lieu, et aucun ne disait ce QU’EST la ligne. `schema_numerotation` dit si le TEXTE est monté, non ce qu’il est ; la page publique des traductions filtre dessus à bon droit, mais pour une autre question. La FORME de l’identifiant — un numéro pour les bibliques, un intitulé parlant pour les autres — aurait cédé au premier identifiant dérogeant. ⛔ Et `type_objet` ne répond pas davantage : il dit la nature philologique de l’objet — traduction, recension, édition critique —, non le corpus auquel il appartient.

⛔ Ces lignes ne se SUPPRIMENT pas. Elles sont référencées : vingt œuvres pour la seule traduction Jeannin de Jean Chrysostome. Un invariant interdit désormais la ligne incohérente plutôt que de la surveiller — une traduction non biblique ne peut pas porter de schéma de numérotation, puisqu’un schéma décrit une versification et qu’il n’y en a pas hors de la Bible.

⚠️ **L’ADMINISTRATION suit la même règle que les pages publiques.** La section « Traductions » est la liste des traductions BIBLIQUES : les quatre notices patristiques y sont repliées, derrière une ligne qui les compte, et viennent en fin de liste lorsqu’on les déplie — leur `ordre` les aurait dispersées au milieu. ⛔ Et elles ne reçoivent que les boutons qui les concernent : l’édition et l’apparat, la modification, la suppression. Le dépôt d’un bandeau, celui d’un encart, le cadrage, l’export en CSV et le remplacement des versets leur sont retirés — elles ne paraissent sur aucune page publique et n’ont pas de versets. Un bouton offert et sans effet est une promesse fausse.

**La NOTICE publique d’une traduction s’allume et s’éteint depuis l’administration — `visible_public`.** La page publique montrait auparavant toute traduction portant un schéma de numérotation : un PROXY, qui dit que le texte est versifié, non qu’on souhaite en publier la notice. ⛔ Cette colonne ne commande QUE la notice : une traduction éteinte reste offerte dans tous les sélecteurs de lecture, et son texte se lit comme avant. Ce n’est pas `est_privee`, qui commande la RLS et réserve la TOL/AELF ; ce n’est pas non plus `est_biblique`, qui dit la nature de la ligne. Trois colonnes, trois questions distinctes, et l’on ne se sert jamais de l’une pour répondre à l’autre.

⚠️ **La rangée d’actions d’une ligne s’aligne par LARGEURS RÉSERVÉES, non par le hasard des libellés.** Trois défauts s’y logeaient. Les messages d’état — « Envoi… », « ✓ Image ajoutée », « ✓ Téléchargé » — s’écrivaient ENTRE les boutons et les poussaient de côté dès qu’ils paraissaient : l’état s’écrit désormais DANS le bouton qui l’a déclenché. L’identifiant et l’étiquette de nature, de largeur variable — trente signes contre six —, ouvraient la rangée et la décalaient d’une ligne à l’autre : ce qui DIT la ligne se range avec son nom, ce qui AGIT se range à droite. Et un bouton dont le libellé change — « + Bandeau » puis « ✓ Bandeau », « Modifier » puis « Fermer » — ne doit pas changer de largeur pour autant. Les boutons se lisent enfin par familles, séparées d’un blanc plus large que le pas interne : les IMAGES de la notice, le TEXTE de la traduction, la FICHE elle-même.

## 16. Auteurs, œuvres et catalogue

Les identifiants sont stables et ne sont pas recyclés. Supprimer une coquille vide ou une œuvre explicitement abandonnée exige de vérifier d’abord ses segments, liens, dépendances et statut de publication.

Publier une œuvre signifie que sa notice, son texte, sa structure et ses contrôles minimaux sont prêts. **Pour la visibilité de l’œuvre dans les listes, le marqueur normatif de dépublication est exactement `oeuvres.note = '[Corpus Scriptura:depublie]'`. Toute autre valeur de `note`, y compris `NULL`, ne vaut pas dépublication.** Une œuvre en préparation, notamment un original autonome encore incomplet, reçoit ce marqueur tant qu’elle ne doit pas paraître. Dépublier ne détruit aucune donnée. La première date de mise en ligne reste attachée à l’édition en ligne et n’est pas réécrite lors d’une republication.

Les statuts de `oeuvre_textes` continuent de qualifier les versions textuelles elles-mêmes ; ils ne remplacent pas le marqueur de visibilité de l’œuvre dans la bibliothèque.

Les chiffres affichés par le site sont calculés à partir de l’état courant de la base. Ils ne sont jamais consignés en dur dans la charte.

### 16.1 Catalogue des traductions patristiques

La table `catalogue_notices` recense des traductions, éditions, témoins bibliographiques et composantes documentaires liés aux œuvres patristiques. Une notice n’est pas nécessairement un texte importable ni une œuvre publiée. Elle décrit un objet bibliographique contrôlé et conserve la trace des décisions prises sur cet objet.

`id_ligne` identifie la notice : il est unique, stable, jamais recyclé. `id_oeuvre_stable` rattache la notice à l’œuvre canonique. `id_traduction` identifie une traduction déterminée d’une œuvre déterminée. Un même `id_traduction` ne peut appartenir qu’à une seule notice active, c’est-à-dire non refusée administrativement. Un recueil commun à plusieurs auteurs reçoit donc un identifiant distinct pour chaque couple œuvre–traduction, même si le traducteur, l’édition et le volume sont communs.

Lorsqu’une traduction s’étend sur plusieurs volumes, une notice canonique peut regrouper l’ensemble. Un volume sans traduction autonome ne conserve pas d’`id_traduction` propre : il est relié à la notice canonique comme composante ou comme notice regroupée.

### 16.2 Statuts contrôlés et notes

Les statuts sont séparés de leur justification. Les colonnes terminées par `_code` ne contiennent que les valeurs contrôlées ci-dessous ; les colonnes terminées par `_note` conservent les explications, réserves, sources, décisions et détails bibliographiques. Une phrase libre ne doit jamais être inscrite dans une colonne de code. Un cas incertain reçoit `A_CONTROLER` ou `NON_DETERMINE` ; il n’est pas classé par intuition.

- `decision_import_code` : `IMPORTE`, `IMPORTER`, `IMPORT_PARTIEL`, `A_CONTROLER`, `BIBLIOGRAPHIE`, `CONSERVER`, `ECARTER`, `NON_DETERMINE`.
- `verification_code` : `NON_VERIFIE`, `REPERAGE`, `NOTICE_VERIFIEE`, `EXEMPLAIRE_VERIFIE`, `TEXTE_VERIFIE`, `CONTROLE_COMPLET`. Les contrôles négatifs de recherche ne sont pas des notices publiques : ils sont conservés dans `internal.catalogue_controles_negatifs`.
- `statut_juridique_code` : `DOMAINE_PUBLIC`, `PROTEGE`, `MIXTE`, `A_CONTROLER`, `SANS_OBJET`, `NON_DETERMINE`.
- `authenticite_code` : `AUTHENTIQUE`, `PROBABLE`, `ATTRIBUE`, `PSEUDEPIGRAPHE`, `ANONYME`, `APOCRYPHE`, `COMPOSITE`, `FRAGMENTAIRE`, `DISCUTEE`, `A_CONTROLER`, `NON_DETERMINE`.
- `priorite_code` : `TRES_HAUTE`, `HAUTE`, `MOYENNE`, `BASSE`, `A_ARBITRER`, `A_ECARTER`, `NON_DETERMINE`.

### 16.2.1 Niveaux de vérification

`verification_code` indique le niveau le plus élevé effectivement atteint, non une impression générale de fiabilité :

- `NON_VERIFIE` : aucun contrôle documentaire suffisant n’a encore été effectué ;
- `REPERAGE` : l’objet a été repéré, mais sa description reste provisoire ;
- `NOTICE_VERIFIEE` : les données bibliographiques essentielles ont été confrontées à une source identifiable, sans inspection nécessaire de l’exemplaire ni du texte intégral ;
- `EXEMPLAIRE_VERIFIE` : un exemplaire matériel ou numérisé a été inspecté ; le titre, l’adresse, la date et les mentions de responsabilité utiles ont été contrôlés sur cet exemplaire ;
- `TEXTE_VERIFIE` : un texte intégral accessible a été rattaché à la notice et son identité, son périmètre, ses divisions principales et son appartenance à l’édition décrite ont été contrôlés à partir de l’exemplaire, de sa table ou d’une transcription institutionnelle. Ce statut ne signifie ni relecture mot à mot, ni correction complète de l’OCR ;
- `CONTROLE_COMPLET` : la notice, l’exemplaire et le texte ont fait l’objet des contrôles précédents, ainsi que des vérifications particulières nécessaires à leur emploi éditorial ;

La présence d’une URL ne suffit jamais à promouvoir une notice. Toute promotion à `TEXTE_VERIFIE` exige une note indiquant ce qui a été contrôlé et par rapport à quelle édition. Un statut supérieur remplace le statut inférieur ; les détails des étapes précédentes demeurent dans `verification_note` et les notes de source. Un résultat négatif utile – absence de traduction française, fausse attribution, doublon ou objet hors périmètre – est enregistré dans `internal.catalogue_controles_negatifs` avec son périmètre et ses preuves, sans créer ni conserver une pseudo-notice négative dans `catalogue_notices`.

### 16.2.2 Date d’édition

Une date n’est renseignée que lorsqu’une édition française réelle et bibliographiquement identifiée est décrite. La date d’une édition latine, grecque, syriaque, anglaise ou d’une page web de republication ne doit jamais combler la date manquante d’une traduction française.

`date_edition_status_code` distingue quatre états :

- `RENSEIGNEE` : `annee_edition` ou `date_edition` contient la date de l’édition française décrite ;
- `A_CONTROLER` : une traduction ou des extraits français sont attestés, mais leur édition source ou leur date demeure à identifier ;
- `SANS_OBJET` : la notice décrit un contrôle négatif, une œuvre perdue, un doublon, un agrégat, une fausse attribution, une édition non française ou tout autre objet sans édition française datable ;
- `NON_TRAITEE` : la question de la date n’a pas encore été instruite.

`date_edition_note` justifie les états `A_CONTROLER` et `SANS_OBJET`. Une valeur `SANS_OBJET` ne signifie pas que l’œuvre ou les éditions étrangères sont sans date : elle signifie qu’aucune date d’édition française ne doit être portée par cette notice. Lorsqu’une date est établie, le statut et les champs de date sont mis à jour dans la même opération.

Les anciennes colonnes narratives peuvent être conservées pour compatibilité et historique, mais elles ne constituent plus la source normative d’un statut et ne doivent pas servir aux filtres. Toute nouvelle intervention met à jour le couple code–note correspondant.

### 16.3 Notices remplacées, composantes et regroupements

Une notice obsolète n’est pas supprimée. Elle conserve ses données et reçoit conjointement `notice_relation_code` et `notice_reference_id_ligne`. Les deux champs sont soit remplis ensemble, soit laissés vides ensemble.

- `REMPLACEE_PAR` : ancienne notice remplacée par une notice canonique corrigée.
- `COMPOSANTE_DE` : volume, annexe ou élément éditorial dépendant d’une notice canonique.
- `REGROUPEE_DANS` : notice particulière absorbée dans une notice d’ensemble.

Une notice ainsi neutralisée n’est ni publiée ni porteuse de l’identifiant actif de traduction. Elle est normalement refusée administrativement, tandis que sa cible demeure active. Avant toute relation, vérifier que la cible existe, n’est pas refusée et ne pointe pas à son tour vers la notice source.

### 16.4 Workflow des notices

Les indicateurs historiques ont des sens distincts :

- `verifie` : la notice a fait l’objet d’un contrôle bibliographique suffisant ; ce champ ne vaut pas approbation administrative.
- `verifie_admin` : la notice a été validée administrativement.
- `refuse_admin` : la notice a été refusée, neutralisée ou archivée par décision administrative ; elle peut néanmoins rester `verifie = true` si son contenu bibliographique a été contrôlé.
- `presence_sur_le_site` : la notice ou la traduction correspondante est effectivement utilisée ou affichée sur le site.

`workflow_status_code` est calculé, non saisi : `REFUSE_ADMIN`, `PUBLIE`, `VALIDE_ADMIN`, `VERIFIE` ou `A_VERIFIER`. Une notice publiée est nécessairement vérifiée et non refusée. Une notice ne peut être à la fois validée et refusée. Toute décision administrative suppose un contrôle préalable. Les quatre indicateurs sont toujours renseignés, jamais nuls.

### 16.5 Protocole de modification du catalogue

Toute passe sur `catalogue_notices` suit une méthode non destructive : sauvegarder les lignes visées ; distinguer les corrections certaines des cas à instruire ; préserver les formulations historiques dans les notes ; relier les notices remplacées plutôt que les supprimer ; vérifier après écriture les identifiants actifs dupliqués, les cibles absentes, les relations incomplètes et les combinaisons de workflow interdites.

Une règle générale découverte au cours d’un audit est ajoutée immédiatement à la présente charte. Les listes de lignes corrigées, volumes traités et comptages provisoires restent dans le rapport de passe, non dans la charte.

### 16.6 Éditeur et lieu d’édition

Les champs `editeur` et `lieu_edition` décrivent l’édition française effectivement recensée, non l’éditeur d’une édition latine ou étrangère, le propriétaire actuel d’un site, ni une simple plateforme de consultation. Ils sont accompagnés de `editeur_status_code`, `editeur_note`, `lieu_edition_status_code` et `lieu_edition_note`.

Les statuts autorisés sont :

- `RENSEIGNE` : le nom ou le lieu est établi et inscrit dans le champ correspondant ;
- `A_CONTROLER` : l’édition française est attestée, mais son adresse matérielle demeure inconnue, incomplète ou contradictoire ;
- `SANS_OBJET` : aucune édition française autonome n’est caractérisée, ou la forme de publication retenue — article, publication nativement en ligne, plateforme éditoriale — ne requiert pas ce lieu dans la citation ;
- `NON_TRAITE` : la question n’a pas encore été instruite.

Une valeur de travail telle que `À établir`, `à identifier`, `Divers`, `Non établi`, `RTF / catalogues français` ou une mention entre crochets ne constitue jamais un éditeur renseigné. Elle peut être conservée provisoirement dans le champ historique, mais son statut reste `A_CONTROLER`. Les notes expliquent la lacune, les divergences entre catalogues ou la raison pour laquelle la donnée est sans objet. Une notice agrégeant des fragments transmis dans plusieurs éditions ne reçoit ni éditeur composite ni lieu unique : ces deux statuts sont `SANS_OBJET`, et les éditions de transmission sont détaillées dans les notes ou dans des notices distinctes.

Lorsque `date_edition_status_code = SANS_OBJET`, les statuts de l’éditeur et du lieu sont également `SANS_OBJET`. Une ville ne se déduit ni du siège actuel d’une maison, ni de l’hébergeur d’une transcription, ni d’une édition différente. Pour une publication en ligne, le responsable éditorial peut être renseigné, tandis que le lieu demeure `SANS_OBJET`. En cas de fausse adresse, de millésime corrigé ou de divergence entre l’adresse imprimée et l’identification matérielle moderne, le champ normalisé suit l’exemplaire décrit par le catalogue patrimonial le plus précis ; l’adresse portée et la divergence sont conservées dans la note. Toute correction du nom d’éditeur ou du lieu met à jour simultanément le champ, son statut et sa note.

**Forme d’autorité de l’éditeur.** La table `editeurs` est la source de vérité des formes publiques d’éditeur. Lorsqu’une forme bibliographique correspond sans ambiguïté à une autorité, `catalogue_notices.editeur` et `oeuvres.editeur` reprennent exactement `editeurs.nom_complet`, et non une variante imprimée, une raison sociale développée ou une abréviation. Les variantes attestées sont conservées dans `editeurs.variantes` et, lorsqu’une explication est utile, dans les notes de source. Plusieurs éditeurs partageant réellement la responsabilité sont séparés par ` ; `. Si aucune autorité n’existe encore, elle est établie avant publication à partir de l’édition décrite ; on ne déduit jamais un nom historique du nom actuel d’une maison. Une propagation automatique n’est admise que lorsque la correspondance entre variante et autorité est unique et contrôlée.

### 16.7 Traducteurs et formes d’autorité

Le champ `traducteur` conserve la formulation bibliographique ou éditoriale rencontrée dans la source, y compris les réserves, responsabilités secondaires et indications de répartition. `traducteur_uniformise` ne contient que la forme d’autorité retenue pour le ou les traducteurs : un nom pour une personne, plusieurs noms séparés par ` ; ` lorsqu’ils partagent la responsabilité. Les mentions de direction, édition, introduction, révision, annotation ou mise en ligne ne sont pas intégrées à ce champ.

Le champ `trad_auteur` d’une œuvre publiée suit la même règle : une liste de noms séparés par ` ; `, et rien d’autre. Ni « et », ni virgule, ni esperluette, aucune formule ajoutée. Le site ne recopie jamais ce champ tel quel : il en fait la phrase de la page de titre (« Traduction par A et B ») et le fragment bibliographique d’une citation (« trad. A et B »). Un point-virgule visible à l’écran signale donc un défaut d’affichage, jamais un défaut de saisie.

`traducteur_status_code` distingue : `PERSONNE`, `PLUSIEURS_PERSONNES`, `COLLECTIF`, `ANONYME`, `NON_ETABLI`, `SANS_OBJET` et `A_CONTROLER`. Une personne ou une liste de personnes exige une valeur non vide dans `traducteur_uniformise`. Les statuts `PERSONNE` et `PLUSIEURS_PERSONNES` sont réservés aux formes d’autorité stables et précisément établies. Un patronyme seul, une initiale non résolue, un titre religieux sans identité complète ou une liste comprenant au moins une autorité partielle reçoit `A_CONTROLER`, même lorsque l’attribution imprimée est certaine. `ANONYME`, `NON_ETABLI` et `SANS_OBJET` sont des statuts, jamais des noms d’autorité. Une responsabilité communautaire ou institutionnelle reçoit `COLLECTIF` ; son appellation peut être portée dans `traducteur_uniformise` lorsqu’elle est stable et précisément établie.

Une forme religieuse, un pseudonyme ou un nom imprimé est conservé dans `pseudonyme_ou_nom_imprime_traducteur` lorsque l’identité civile ou la forme d’autorité est connue. Les titres tels que `M.`, `P.`, `abbé` ou `dom` ne sont supprimés que si le nom complet est établi ; une identité partielle comme `Abbé Burleraux` reste telle quelle jusqu’à identification plus précise. Les variantes d’un même nom sont harmonisées sur une seule forme, sans réécrire le champ brut.

Lorsqu’une notice mêle traducteur, éditeur scientifique, réviseur ou collaborateur et que la répartition n’est pas certaine, elle reste `A_CONTROLER`. Une normalisation n’est propagée automatiquement que si la même forme brute possède une cible unique déjà validée. Toute correction met à jour ensemble la forme uniformisée, le statut et, lorsque nécessaire, `traducteur_note`.

### 16.8 Auteurs et formes d’autorité

La table `auteurs` est la source de vérité des formes d’autorité. Dans `catalogue_notices`, le champ historique `auteur` peut conserver une graphie ancienne ou importée ; `auteur_uniformise` reprend exactement `auteurs.nom` pour le même `id_auteur`. Une forme d’autorité n’est jamais saisie librement dans le catalogue : tout nouvel auteur ou corpus est d’abord créé ou corrigé dans `auteurs`, puis propagé par identifiant.

Les apostrophes des formes d’autorité sont typographiques. Une divergence entre `auteur_uniformise` et `auteurs.nom` est une anomalie. La correction porte d’abord sur la table maîtresse lorsque celle-ci est fautive ; les notices sont ensuite réalignées sans réécrire leur champ historique.

`auteur_status_code` distingue :

- `PERSONNE` : auteur individuel identifié ;
- `PSEUDO_AUTEUR` : forme conventionnelle désignant un auteur inconnu ou distinct auquel une œuvre a été anciennement attribuée ;
- `ANONYME` : auteur individuel non identifié, éventuellement précisé par le nom du texte, du dossier ou de la tradition ;
- `CORPUS_COLLECTIF` : ensemble composite ou traditionnel ne relevant pas d’un auteur individuel unique ;
- `INSTITUTION_COLLECTIVE` : autorité institutionnelle ou conciliaire collective ;
- `A_CONTROLER` : identifiant absent, conflit de rattachement ou autorité non encore arbitrée.

Un pseudo-auteur n’est pas rabattu sur l’auteur ancien auquel le texte fut attribué. Un corpus collectif n’est pas transformé en personne. Les précisions telles que `Anonyme / À Diognète` ou `Anonyme / Tradition apostolique` appartiennent à la forme d’autorité et doivent être conservées. `auteur_note` explicite la nature de l’autorité sans contenir de variante concurrente non arbitrée.

### 16.9 Sources des notices

`url_source` porte la source bibliographique ou institutionnelle qui justifie la notice ; `url_texte_integral` porte, lorsqu’il existe, un accès au texte lui-même. Une plateforme de consultation ne doit pas être présentée comme l’éditeur de la traduction. Plusieurs sources peuvent être séparées par ` ; ` lorsqu’elles remplissent des fonctions distinctes.

`source_status_code` distingue : `RENSEIGNEE`, `SOURCE_LOCALE`, `A_RECHERCHER`, `SANS_OBJET` et `NON_TRAITEE`. `RENSEIGNEE` exige une URL non vide. `SOURCE_LOCALE` désigne un fichier effectivement contrôlé, identifié par son nom et, de préférence, son empreinte, mais dépourvu de lien public stable. `A_RECHERCHER` signale une lacune bibliographique réelle. `SANS_OBJET` est réservé aux variantes, doublons ou composantes dont la source est portée par la notice canonique.

Une URL générale de catalogue n’est retenue que si elle permet réellement de retrouver l’objet décrit. Les pages commerciales, reproductions secondaires et transcriptions non attribuées peuvent compléter une source patrimoniale, jamais s’y substituer silencieusement. Toute nouvelle source met à jour simultanément l’URL, le statut et `source_note`.

### 16.10 Statut juridique des traductions

`statut_juridique_code` qualifie la traduction française et non l’œuvre ancienne elle-même. Les valeurs normatives sont : `DOMAINE_PUBLIC`, `PROTEGE`, `MIXTE`, `A_CONTROLER`, `SANS_OBJET` et `NON_DETERMINE`. `MIXTE` s’emploie lorsque la traduction est libre mais que l’établissement du texte, l’appareil critique, les notes, la révision ou la présentation moderne demeurent protégés.

La qualification repose sur le Code de la propriété intellectuelle et sur des données vérifiables : identité et date de décès du traducteur, caractère anonyme, pseudonyme ou collectif, date de première publication et nature des contributions. Une date d’édition ancienne ne suffit pas à elle seule lorsque le traducteur est nommé. Une édition étrangère ou latine ne détermine pas les droits d’une traduction française.

Pour une traduction anonyme, pseudonyme ou collective, le délai applicable est examiné à partir de la publication selon le régime légal correspondant. Pour une traduction attribuée, le décès du traducteur est recherché dans une autorité fiable. Les révisions substantielles et traductions refondues sont traitées comme des contributions distinctes. En cas d’identité incertaine, d’attribution disputée ou de responsabilité non répartie, conserver `A_CONTROLER` plutôt que présumer la liberté.

`SANS_OBJET` s’applique lorsqu’aucune traduction française autonome n’est décrite. Toute décision est justifiée dans `statut_juridique_note`; le champ historique `domaine_public` peut être conservé pour mémoire, mais il n’est plus normatif.

Lorsqu’un statut `MIXTE` porte sur des composantes distinctes et que seules certaines sont juridiquement réutilisables, `decision_import_code` vaut `IMPORT_PARTIEL`. La note délimite les livres, sermons, fascicules ou contributions importables. `IMPORTER` peut être conservé pour un texte ancien intégralement réutilisable depuis une source indépendante — notamment un manuscrit — même si l’édition critique moderne qui le décrit demeure protégée.

### 16.11 Une œuvre à plusieurs auteurs

Une œuvre peut avoir plusieurs auteurs, **à égalité** : ni auteur principal ni auteur second, aucun n'est subordonné à l'autre. Elle paraît alors **une fois sous le nom de chacun** — sur l'étagère de chaque auteur dans la bibliothèque, dans la liste d'œuvres de chaque fiche — et elle **porte les deux noms** partout où elle est nommée : page de titre, cartes de la bibliothèque, citations, titre de la page. Le lecteur voit la même chose d'où qu'il vienne.

Modèle : le PREMIER auteur nommé reste dans `oeuvres.id_auteur`, les suivants dans `oeuvres_auteurs` (`rang` ≥ 2). Le rang ne règle QUE l'ordre d'affichage, il n'ordonne pas les responsabilités. La vue `v_oeuvres_auteurs` réconcilie les deux : c'est elle, et elle seule, qu'on interroge pour « les auteurs d'une œuvre » comme pour « les œuvres d'un auteur ». Un même auteur ne peut pas figurer deux fois sur une œuvre.

Ce dispositif nomme des CO-AUTEURS. Il ne dit pas une attribution incertaine (« l'un ou l'autre »), qui reste une question de notice, ni une responsabilité de traduction, qui vit dans `trad_auteur`.

### 16.12 Langue et traditions : l’étiquette et le détail

`auteurs.langue_principale` est saisie en bas de casse (« latin », « grec ; latin ») et la base n’est pas touchée. Mais partout où la langue paraît comme ÉTIQUETTE — pastille du filtre de la bibliothèque, ligne de métadonnées de la fiche d’auteur et de son aperçu —, elle prend la capitale, comme le siècle et la tradition qui l’encadrent. Nommée dans une phrase (« Texte original latin »), elle garde son bas de casse. La règle est tenue par `app/lib/langues.ts`.

`auteurs.traditions` est un vocabulaire libre, taillé au plus juste pour chaque auteur : cinq étiquettes par auteur, cent quarante-deux distinctes en base le 23 août 2026, dont la plupart ne désignent qu’un seul auteur. Ce détail est juste et se conserve — la fiche de l’auteur le donne en toutes lettres. Le FILTRE, lui, ne peut pas le porter : seize auteurs y alignaient soixante-dix pastilles, et l’on n’y cherchait plus rien. Il n’offre donc que sept familles : écoles et milieux, époques et courants, spiritualité et monachisme, exégèse et lettres, doctrine, philosophie, apologétique et polémique. Le rattachement se fait par MOTIFS et non par table nominative (`app/lib/traditions.ts`), pour qu’une étiquette nouvelle se range d’elle-même ; celle qu’aucune famille ne reconnaît reste sur la fiche mais ne paraît pas dans le filtre — mieux vaut une pastille de moins qu’une pastille fausse. Un test passe au crible tout le vocabulaire relevé en base : aucune étiquette n’y reste orpheline.

## 17. Écritures, droits et sécurité

Les écritures sensibles passent par du code serveur qui vérifie le rôle de l’utilisateur. Le client ne constitue jamais une preuve d’autorisation. Les clés de service ne sont ni envoyées au navigateur, ni inscrites dans les journaux, ni copiées dans les documents.

Les comptes sont réservés aux personnes qui participent au projet. Les inscriptions seront ouvertes lors du lancement du site. Il est toutefois possible de demander un accès anticipé depuis la page de contact.

Les politiques RLS, routes administratives et fonctions `SECURITY DEFINER` suivent le moindre privilège. Une opération d’administration doit avoir un périmètre explicite et un résultat vérifiable.

Une lecture accessible sans authentification ne diffuse jamais les identifiants ni les données personnelles d’autres utilisateurs. Les décomptes, votes, classements et autres agrégats sont servis par une fonction agrégée `SECURITY DEFINER` ou par une vue qui ne renvoie que des totaux, et la politique de lecture des tables concernées reste restreinte aux lignes propres à chaque utilisateur. Charger les lignes individuelles pour les recompter côté client est proscrit.

Une invariante métier qui doit tenir quelle que soit la voie d’écriture est garantie par un déclencheur en base, non par la seule politique RLS ni par le seul code applicatif, qui ne couvrent pas toutes les voies. Cela vaut notamment pour les interdits d’auto-publication, d’auto-validation et d’auto-attribution.

Une donnée réservée à l’administration ne s’ajoute pas en colonne d’une table que la lecture publique interroge par `select('*')`. La page d’une œuvre lit `oeuvres` sous la session du lecteur : toute colonne ajoutée là lui est servie, quel que soit l’écran qui la montre. Une note de travail vit donc dans une table à part, RLS active et sans aucune politique, droits révoqués pour `anon` et `authenticated`, écrite et lue par la seule clé de service. Modèle : `oeuvres_commentaires_prives`, qui porte les commentaires privés d’une œuvre (20 août 2026).

Le corpus est une base de données protégée : droit *sui generis* du producteur (investissement substantiel de constitution, de vérification et de présentation) et droit d’auteur sur les textes éditoriaux originaux (notices, chapeaux, traductions, présentation). Son extraction ou sa réutilisation substantielle n’est pas autorisée. La fouille de textes et de données à des fins d’entraînement est expressément réservée (opt-out TDM, art. L122-5-3 CPI), par des moyens lisibles par machine tenus cohérents entre eux : `robots.txt` refusant les robots d’IA connus, réservation `/.well-known/tdmrep.json`, en-tête `X-Robots-Tag: noai`, et le `proxy` (verrou serveur) qui bloque (403) les agents d’aspiration qui s’annoncent. Ces signaux ne visent que les robots déclarés : la protection de fond reste l’accès fermé (authentification) contre l’aspiration anonyme, complété au besoin par une limitation de débit et une détection comportementale.

## 18. Interface de lecture

**Césures du texte latin.** Aucun navigateur ne sait couper le latin : il n’existe pas de dictionnaire de coupure pour cette langue, et la déclaration `hyphens: auto` y reste sans effet. Les points de coupe sont donc posés par le site, selon les règles classiques de syllabation, sous forme de césures conditionnelles invisibles tant que la ligne n’a pas besoin d’être coupée. Elles sont posées au rendu et ne touchent pas la donnée ; contrairement à l’espacement typographique canonique du § 3.2, elles ne quittent jamais la page : un copier-coller les retire. Sans elles, la justification creusait les blancs faute de pouvoir couper les mots longs, et le latin paraissait plus lâche que le français en regard.

**Police des textes d’œuvre.** Un texte d’œuvre se lit toujours en sérif, corps comme titres, en lecture comme en apparat critique et en traductions parallèles. Le texte en langue originale se lit en sérif lui aussi lorsqu’il paraît seul. Une seule exception : mis en regard du français, l’original passe en sans-serif, la différence de police séparant les deux colonnes d’un coup d’œil, mieux qu’un filet. Une colonne dont la langue n’est pas connue reste en sérif : mieux vaut une colonne en sérif de trop qu’un texte français composé comme un original.

L’interface rend fidèlement les titres, notes, paragraphes, textes originaux et appareils stockés. Elle ne compense pas des données manquantes par des heuristiques invisibles. La projection déterministe d’un appel depuis une ancre structurée conforme au § 13.6 n’est pas une heuristique : c’est le rendu déclaré de la donnée normative. Réciproquement, une entrée marquée non publique ou inexacte en base n’est jamais présentée au lecteur, ni affichée ni proposée comme correspondance de recherche.

Les couleurs de l’interface proviennent des tokens sémantiques définis dans `app/globals.css` (`--cs-fond`, `--cs-bord`, `--cs-texte-*`, `--cs-encre`, `--cs-danger`, `--cs-or`, `--cs-vert`) : c’est la source unique de la palette, ancrée sur les teintes historiques du site. Aucune couleur d’interface n’est écrite en dur, hormis les attributs de présentation SVG (`fill=`/`stroke=`), qu’une variable CSS ne résout pas. Une référence visuelle de la palette est tenue à part : « Palette d’harmonie », https://claude.ai/code/artifact/8f55e9a1-0339-4da5-ac20-c4712c6e5b42.

Le sommaire reflète les niveaux réellement présents. Les notes sont consultables dans tous les champs affichables. Les grandes œuvres se chargent par tranches sans réordonner les segments. L’ordre de référence est toujours `segment_numero`.

Les préférences d’affichage, dont le mode texte intégral, ne modifient jamais les données. Les pages de lecture restent utilisables sur desktop et mobile selon les règles du dépôt.


**Le volet de lecture : UNE OPTION PAR LIGNE** (décision de l’auteur, 28 août 2026 : « je veux qu’on distingue en un coup d’œil toutes les options ; je préfère que chaque option constitue une ligne »). Un axe se donne EN ENTIER, une option par ligne, et l’option retenue porte la PASTILLE verte de la liste des livres. Le volet ne dit alors qu’une chose, et il la dit partout de la même façon : voici ce que vous lisez.

⚠️ **La pastille n’introduit AUCUN marqueur de plus.** C’est déjà celui qui, à quelques pixels de là, marque le livre ouvert. Trois autres ont été mis en regard le même jour, à la largeur réelle du volet — un filet vert à gauche de l’option retenue, une puce pleine, des cases encadrées — et c’est celui-ci que l’auteur a retenu, parce qu’il n’ajoute rien au vocabulaire du volet. Une planche qui rend les vrais objets de style hors session a servi à choisir : la page Bible tombant en erreur sans compte, c’est le seul moyen de juger une forme de volet à l’œil.

⛔ **Deux formes ont précédé, et toutes deux CACHAIENT quelque chose.** Les cinq CASES pleine largeur pesaient 181 pixels en tête du volet, avant même la recherche et la liste des livres. Le FIL qui les remplaça — les états d’un axe posés en ligne, l’état retenu souligné d’un trait vert — imitait la barre d’onglets qu’il surmontait : le volet portait deux rangs de mots soulignés l’un sur l’autre, à quarante pixels de distance, et l’auteur l’a jugé d’un mot, « pas gracieux ». Chacune des deux avait pourtant été arbitrée pour elle-même ; le défaut n’était pas dans la pièce mais dans son VOISINAGE, et c’est la leçon à garder.

⛔ **Un axe binaire se donne en DEUX options, comme les autres.** « Avec les commentaires », « Sans les commentaires ». Cela renverse la décision du 27 août, qui n’en gardait qu’une LIGNE D’ACTION disant ce qu’un clic ferait — « Masquer les commentaires » —, et l’on garde ici la raison du renversement : une ligne d’action ne dit que le geste, si bien que l’état ne s’y lit qu’à l’envers, et que l’axe n’a pas l’air d’un choix. Montrer toutes les options, c’est montrer l’état ET son contraire.

⚠️ **Les rubriques d’axe se composent en casse ORDINAIRE** — « Lecture », « Commentaires » — dans la suite des capitales refusées le même jour sur la barre d’onglets du volet. Un volet de lecture n’a rien à crier.

⛔ **Le volet est un CONTENEUR : ce qu’il porte se règle sur SA largeur, jamais sur celle de l’écran** (décision de l’auteur, 28 août 2026 : « rends le volet de gauche responsive »). Il se traîne de 120 à 400 pixels à la poignée, et sa largeur au repos suit l’écran — deux cents pixels sur un portable, trois cent vingt sur un très grand écran. Une règle d’écran n’aurait vu que le second cas ; et elle n’aurait rien vu du tout, puisque sous neuf cents pixels le volet devient un tiroir et que la carte n’y est plus rendue. C’est un AXE distinct de celui des seuils d’écran, et le tableau des seuils ne le gouverne pas.

⛔ **La référence de l’édition s’efface sur un volet étroit.** Elle compte de cent soixante à trois cent cinquante signes, et deux lignes ne la portent jamais en entier : le seuil ne dit donc pas où elle TIENT, mais où elle cesse de dire quelque chose. Mesurée sur la plus longue, celle de Fillion : soixante-seize signes à deux cents pixels, soit le titre coupé en son milieu — « Texte latin en regard dans Louis-Claude Fillion, La Sainte Bible (texte latin… » —, cent à deux cent quarante, cent quinze à deux cent quatre-vingts. Sous deux cent soixante, la phrase s’arrête avant d’avoir nommé l’ouvrage, et un moignon de titre vaut moins que rien. C’est ce moignon que l’auteur a relevé. La fiche « En savoir plus » la donne entière, à toute largeur, et c’est là qu’elle se lit.

⚠️ **Un libellé long s’écrit en DEUX formes, et l’on n’en montre qu’une.** « En savoir plus sur cette traduction » passe à trois lignes sur un volet resserré ; « En savoir plus » y suffit. Les deux sont dans le document, la largeur choisit. ⛔ On ne coupe pas un libellé en JavaScript : il faudrait le mesurer à chaque rendu, et la mesure se ferait après la peinture.

⚠️ **Une carte n’a pas à réserver la place de ce qu’elle ne montre pas.** La carte de la traduction gardait une hauteur minimale pour que la mise en page ne bouge jamais ; il en restait un blanc de deux lignes dès que la référence s’efface. Elle prend la hauteur de ce qu’elle porte, et rien ne bouge pour autant : la référence ne paraît ou ne disparaît qu’au geste délibéré de redimensionner le volet.

⚠️ **Un libellé ne redit pas le nom de son axe.** Sous l’étiquette « Graphie », « Graphie modernisée » et « Abréviations développées » écrivaient deux fois le même mot, et le second débordait à lui seul la largeur du volet. Ce sont des adjectifs qui qualifient la graphie : « Modernisée », « Développées », « Diplomatique ». La description en donne le sens entier. L’ensemble tombe de 181 à 83 pixels, et le gain se voit surtout sur un téléphone, où la liste des livres remonte d’autant.

**La liste de la bibliothèque.** Elle se tourne par pages de dix auteurs : une fiche fait deux cents pixels, sa liste d’œuvres dépliée bien davantage, et au-delà de dix on ne parcourt plus une bibliothèque, on fait défiler. Toute recherche et tout filtre ramènent à la première page, et l’on revient en tête de liste en tournant — rester à la même hauteur ferait tomber au milieu de la page suivante. Les flèches et le pied « Page 1 sur 2 » sont ceux du catalogue des traductions, d’un composant partagé.

**Le texte en langue d’origine, dans la liste des œuvres.** Il porte UN SEUL nom, « Texte original latin » ou « Texte original grec », que l’œuvre soit une édition en langue ancienne sans traduction ou le texte original donné en regard d’une traduction : les deux se suivent dans la même liste et mènent à la même sorte de lecture, ils ne peuvent pas s’appeler l’un « Texte latin » et l’autre « Texte original latin ». Le nom suit la langue réellement déclarée par l’œuvre, et non un partage entre le grec et « tout le reste ».

**Le blanc entre deux lignes** de cette liste est le même pour toutes — texte original, traduction, autre édition. Ce qui sépare les œuvres entre elles, c’est le filet et le retrait du groupe, non l’écart des lignes : un écart plus large ici que là ferait lire un groupement qui n’existe pas.

## 19. Modèle de données des œuvres et versions

### 19.1 `oeuvres`

`oeuvres` porte l’identité intellectuelle de l’œuvre : auteur, titres, langue originale, langue de traduction lorsqu’il s’agit d’une traduction, datation, genre, état de publication et données éditoriales générales. Une œuvre n’est pas une édition déterminée et ne doit pas absorber les métadonnées propres à plusieurs versions.

**Commentaires publics des œuvres.** `commentaire_traduction` et, lorsqu’elle est utilisée, `note_editoriale_secondaire` sont des champs publics d’explication, non des notices bibliographiques bis. Leur absence est la norme. Ils ne contiennent une information que lorsqu’un lecteur a besoin d’une précision que les champs structurés affichés à proximité ne peuvent pas exprimer : répartition d’une œuvre entre plusieurs traducteurs, traduction indirecte, caractère partiel ou composite du texte, particularité de transmission ou de présentation réellement utile. Ils ne répètent jamais le seul nom du traducteur, l’éditeur, la collection, le lieu, la date, le numéro de tome, l’édition, la pagination ni toute autre donnée déjà structurée. Le nom d’un traducteur n’y est répété que pour expliquer une répartition ou une responsabilité qui resterait incompréhensible autrement. Chaque idée occupe sa propre ligne ; les lignes sont brèves, rédigées comme des phrases explicatives et ne prennent pas de point final. Le rendu honore ces sauts de ligne : la page de titre, comme la carte « Édition de référence » d'« À propos de cette édition », compose le commentaire en `white-space: pre-line` (corrigé le 21 août 2026 ; le front les avalait jusque-là). Les détails de travail, preuves, hésitations, variantes fines, justifications d’attribution, états de contrôle et mécanismes internes sont conservés dans `oeuvres_commentaires_prives`, jamais exposés au lecteur.

Une traduction et une **œuvre originale autonome** sont deux lignes distinctes d’`oeuvres`. L’original autonome est reconnu par `langue_trad` vide et `langue_originale` renseignée. Il garde exactement le même titre français dans `titre` que sa sœur traduite et porte le titre latin, grec ou autre dans `titre_original`. L’auteur et le titre normalisé constituent le mécanisme d’appariement ; aucun identifiant de liaison supplémentaire n’est créé.

La visibilité de l’œuvre dans les listes suit le § 16 : seule la valeur exacte `[Corpus Scriptura:depublie]` dans `oeuvres.note` marque une œuvre dépubliée.

### 19.2 `oeuvre_textes`

**Libellé court d’édition.** `oeuvre_textes.edition_label` est un libellé public minimal, non une notice bibliographique. Sa forme normative est exactement `Ville, éditeur normalisé, année`. Le champ ne contient ni la formule « D’après l’édition de », ajoutée seulement par l’interface, ni point final. Le lieu est celui de l’édition décrite ; l’éditeur reprend exactement `editeurs.nom_complet` lorsqu’une autorité existe ; plusieurs éditeurs réellement responsables sont séparés par ` ; `. L’année est une année unique portée par `oeuvre_textes.annee_edition` et choisie comme année de référence de la version. Même lorsqu’une édition est multivolume ou s’étend sur plusieurs années, `edition_label` ne fabrique pas automatiquement une plage chronologique : le détail tome par tome et la chronologie complète restent dans `collection`, `date_publication`, les métadonnées de version ou les données de source. Une date plus précise peut être conservée ailleurs, mais le libellé public reste à l’année.

Sont exclus de `edition_label` : titre de l’œuvre ou de l’édition, collection, série, tome, volume, pagination, étendue de livres ou de chapitres, nom du traducteur, éditeur scientifique, réviseur, directeur, numéro ou mention d’édition, texte latin ou grec en regard, notes, appareil critique et toute autre précision déjà portée par un champ structuré ou une métadonnée de provenance. On ne conserve pas une information dans le libellé au seul motif qu’elle figurait dans une ancienne citation développée. La réduction du libellé n’entraîne aucune perte documentaire : les détails utiles sont déplacés ou maintenus dans leurs champs propres.

L’interface compose la seule formule `D’après l’édition de <edition_label>`. Elle ne concatène à cette phrase ni `collection`, ni `date_publication`, ni `annee_edition`, ni pagination, ni commentaire public. Exemple normatif : `edition_label = Paris, Louis Vivès, 1873` produit « D’après l’édition de Paris, Louis Vivès, 1873 ». Les précisions bibliographiques supplémentaires, lorsqu’elles ont une utilité réelle pour le lecteur, sont affichées séparément et ne rallongent pas ce libellé.

**Éditeur d’œuvre.** Lorsqu’une autorité existe dans `editeurs`, `oeuvres.editeur` reprend exactement `editeurs.nom_complet`, et non une variante d’adresse bibliographique. Les variantes imprimées demeurent dans `editeurs.variantes`, les notices et les métadonnées de source. Une discordance entre une variante reconnue et l’autorité d’`oeuvres.editeur` est une anomalie à corriger.

`oeuvre_textes` porte les versions éditoriales concrètes d’une œuvre. `id_texte` est stable et identifie une traduction, un état d’édition ou le texte d’une œuvre originale autonome. Une version peut être reliée à une notice de `catalogue_notices` et conserve ses empreintes de sources.

**Original embarqué et original autonome sont deux objets différents.** Le premier vit dans `segments.texte_original` de la traduction et alimente ses modes `?mt=bilingue` et `?mt=la`. Le second possède un autre `id_oeuvre` et sa propre ligne `oeuvre_textes` ; il ouvre une page d’œuvre normale et peut être mis en favori. ⛔ Un texte n’existe qu’à un seul endroit. Dès que l’original possède son propre `id_texte`, la copie embarquée devient redondante et se retire : l’alignement suffit à la lecture bilingue.

La bibliothèque et la page d’œuvre rapprochent les œuvres sœurs par même auteur + même titre normalisé. Dans un groupe ainsi formé, chaque œuvre garde son URL propre. Le menu de langue navigue vers l’`id_oeuvre` de l’original autonome quand il existe ; le mode bilingue reste sur l’œuvre traduite. L’original embarqué ne reçoit jamais une étoile de favori, tandis que l’œuvre originale autonome utilise le mécanisme normal `favoris(type='oeuvre', ref_id=id_oeuvre)`.

⚠️ **Ne pas généraliser cette séparation à deux traductions que l’on veut lire par un alignement sémantique explicite.** `texte_alignement_ensembles` porte un seul `id_oeuvre` et relie des `id_texte` de cette œuvre ; deux traductions telles que celles de Boèce qui doivent rester dans le même système d’alignement demeurent donc sous le même `id_oeuvre`. L’original autonome est un cas différent : sa navigation comme œuvre sœur repose sur l’auteur et le titre, tandis que le bilingue se compose depuis l’alignement des deux textes.

Le workflow des versions est :

- `draft` : version incomplète ou en construction ;
- `review` : version candidate cohérente, en cours de contrôle ;
- `published` : version techniquement publiable ;
- `retired` : version remplacée ou retirée.

`is_default` désigne la version privilégiée à l’intérieur d’un `id_oeuvre`. Une œuvre disposant de versions doit en avoir exactement une avant clôture ou publication ; cette version ne peut jamais être `retired`. `is_public` reste un indicateur de visibilité de version et doit rester cohérent avec son statut, mais il ne remplace pas le marqueur de dépublication de l’œuvre défini au § 16.

Changer la version par défaut, publier, retirer ou remplacer une version est une opération explicite. Aucune version n’est supprimée ni retirée automatiquement du seul fait qu’une nouvelle version existe.

**Menu commun des traductions.** Toutes les versions rattachées au même `id_oeuvre` reçoivent le même menu, quel que soit l’`id_texte` actif. La rubrique s’intitule « Traductions ». Une traduction française s’y donne sous la forme exacte `Nom du traducteur (dates de vie), édition de AAAA` ; les dates proviennent d’une donnée structurée et l’année de `oeuvre_textes.annee_edition`. Le texte original reste dans le menu de langue : lorsqu’il existe mais n’est pas aligné avec la portée affichée, son choix demeure visible et grisé. Le mode « Traductions parallèles » n’est pas proposé tant que son parcours de lecture n’est pas réactivé explicitement.

### 19.3 `oeuvre_texte_unites`

`oeuvre_texte_unites` conserve la structure source d’une version : unités documentaires stables, ordre global, niveaux, paragraphes sources, localisateurs, texte propre, empreintes et métadonnées. Les numéros de page peuvent figurer dans un localisateur de preuve, mais ne constituent pas une structure éditoriale à reconstruire ni à projeter dans les segments. Le couple `(id_texte, source_unit_id)` est l’identité de l’unité ; `(id_texte, global_order)` en fixe l’ordre sans confondre les versions.

Les unités sources servent de couche de preuve et de recomposition. Elles ne sont pas remodelées pour correspondre artificiellement aux segments sémantiques.

### 19.4 `segments`

`segments` porte la segmentation éditoriale destinée à la lecture, à la recherche et aux liens. Les invariants principaux sont ceux des §§ 6 et 11 : unicité de `(id_texte, segment_numero)` et `(id_texte, segment_key)`, rattachement à la version et, lorsque disponible, à l’unité source, cohérence des offsets, paragraphes, rangs, pages, niveaux, natures et espaces textuels.

Les anciennes colonnes `lien_1` à `lien_4`, `fiabilite`, `notes` et `texte_original` sont des champs hérités ou des projections de compatibilité. Elles ne doivent pas redevenir la source normative d’un nouveau chantier lorsque les tables spécialisées existent.

### 19.5 Notes structurées

`texte_notes`, `texte_note_ancres`, `texte_note_blocs` et `texte_note_relations` sont la source normative des notes structurées des nouvelles versions. Une projection dans `segments.notes` doit être reconstructible et ne doit jamais diverger silencieusement de ces tables.

### 19.6 Alignements et relations entre versions

`texte_alignement_ensembles`, `texte_alignements` et `texte_alignement_membres` portent les alignements sémantiques entre versions conformément au § 12. `texte_groupes_logiques`, `texte_groupe_membres` et `texte_relations_logiques` décrivent des regroupements ou relations internes qui ne doivent pas être confondus avec l’alignement bilingue lui-même.

### 19.7 `liens_bibliques`

Chaque ligne associe un segment à une cible canonique et porte au minimum le type, la fiabilité, la provenance, le motif et l’état d’arbitrage. Une contrainte d’unicité doit empêcher les doublons exacts sans interdire plusieurs cibles légitimes pour un même segment. Les liens restent ancrés sur `segments.id`, mais leur interprétation doit tenir compte de `id_texte` et des alignements éventuels.

### 19.8 Autorité du schéma

Avant de générer un import ou une migration, interroger le schéma actuel. Une liste de colonnes copiée depuis un ancien script n’est jamais une autorité. Tout changement de modèle est accompagné d’une migration versionnée, d’une mise à jour des importateurs, du lecteur et des tests pertinents.

Une seule base sert le poste de travail et le site en ligne. Une migration prend donc effet immédiatement sur le site, dont le code, lui, n’a pas changé. Une migration qui touche la forme des relations est ainsi capable de casser une page à laquelle personne n’a touché : ajouter une table de liaison rend ambigus les embeds imbriqués du code déjà déployé, qui cessent de renvoyer des données. Le poste de travail ne voit rien, puisqu’il porte le correctif.

Règle : une telle migration ne s’applique qu’une fois le correctif publié, ou bien il est publié dans la foulée. Aucune séance ne se termine sur une migration en base dont le correctif dort dans un commit non publié. Pour vérifier ce qu’il en est, on rejoue la requête telle que la sert le code en ligne, jamais le code local.

## 20. Contrôles structurels obligatoires

Pour chaque œuvre nouvelle ou reprise, contrôler au minimum :

- unicité, positivité et ordre de `segment_numero` ;
- présence du texte, sauf cas explicitement autorisé ;
- validité des natures ;
- cohérence et continuité des rangs par clé composite ;
- absence de fusion entre corps, introduction et apparat ;
- cohérence des niveaux de titre et présence du sommaire attendu ;
- exactitude de la recomposition des paragraphes ;
- univocité des appels de note et présence des notes ;
- absence de caractères de remplacement et de balisage cassé ;
- cohérence des limites de source et de la recomposition ;
- lorsque `page` est renseignée, conformité avec le numéro imprimé visible dans l’ouvrage ;
- présence du texte original seulement aux rangs autorisés ;
- invariants propres aux liens, s’ils font partie du périmètre.

Un contrôle doit distinguer erreur certaine, anomalie à examiner et dette connue. Il ne transforme pas une absence de donnée ancienne en erreur si la source n’a pas encore été reprise.

## 21. Contrôles aléatoires

Pendant une correction, une segmentation ou un import, effectuer périodiquement des sondages répartis entre le début, le milieu, la fin et les différentes divisions. Conserver la graine ou la liste des éléments tirés.

Comparer chaque échantillon à la source sur le texte, les paragraphes, les rangs, les titres, les notes et les enrichissements. Les pages peuvent être utilisées comme repères de contrôle du fac-similé, sans être conservées comme structure du corpus. Pour les liens, comparer aussi le contexte et la cible biblique.

Une erreur découverte n’est jamais corrigée isolément. Examiner les pages voisines et tous les éléments produits par la même règle depuis le précédent sondage. Augmenter la taille du contrôle si l’erreur peut être systématique.

Un dernier audit indépendant et des sondages finaux sont requis avant de déclarer l’œuvre propre.


## 22. Contrôle des apparats

Les deux apparats sont contrôlés comme des ensembles textuels à part entière : texte, paragraphes, rangs, notes, niveaux éventuels, responsabilité et place documentaire sont vérifiés contre l’édition.

L’`apparat_auteur` reste dans le parcours de lecture du corps. L’`apparat_editeur` est rendu hors du flux ordinaire. Ne pas déduire la responsabilité de la seule position liminaire : une préface de l’auteur n’est pas une préface éditoriale, et une préface du traducteur n’est pas un texte de l’auteur.

Les références bibliques suivent la règle du § 8 : une référence grammaticalement intégrée demeure dans la phrase ; une référence isolée est transformée en note. Leur constitution en liens reste une sous-phase explicite de la phase B.

## 23. Protocole de modification


### 23.0 Manifeste constitutionnel de révision des textes

**Statut.** Le présent article fixe la procédure canonique de toute révision textuelle dans Corpus Scriptura : reprise d’un import ancien, collation d’une édition, correction OCR/HTR, restructuration, normalisation éditoriale, reprise des notes, alignement ou audit final. Il n’énonce pas une seconde fois les règles de détail : il en fixe l’ordre, les dépendances et les conditions de clôture. Les prescriptions spécialisées des autres sections et des chantiers particuliers s’y ajoutent ; elles ne peuvent supprimer une étape applicable ni abaisser le niveau de preuve exigé. Une étape sans objet peut être déclarée non applicable, mais cette décision doit être explicite et vérifiable.

**Principe de nécessité.** Le corpus actif ne conserve que ce qui remplit une fonction textuelle, documentaire, structurelle, philologique, sémantique, bibliographique, d’alignement, de provenance, de rendu ou de contrôle durable. Un artefact d’import, une analyse de travail, une unité technique, un libellé redondant, une projection périmée ou une métadonnée sans fonction ne sont pas conservés par inertie. Leur suppression n’intervient qu’après vérification des dépendances et après transfert de l’information utile vers sa donnée normative. L’archive et la sauvegarde gardent la mémoire du chantier ; le corpus actif ne sert pas d’entrepôt aux étapes devenues inutiles.

**Ordre de dépendance.** La révision suit l’ordre ci-dessous. Toute correction tardive qui modifie une couche déjà contrôlée rouvre cette couche et toutes les étapes postérieures qui en dépendent. Une œuvre n’est jamais déclarée « propre », « close » ou « vérifiée » parce qu’un contrôle partiel est à zéro.

1. **Ouvrir la mission.** Consulter le centre de contrôle (§ 30), identifier la mission par une clé stable, lire les missions parallèles et inscrire l’état initial mesuré. Plusieurs missions peuvent coexister dans une même section ; une seule tâche active existe pour une même mission. Définir le périmètre exact : œuvre, version, témoin, langue, pages ou divisions, couches concernées et ce qui est explicitement hors périmètre.

2. **Établir l’autorité documentaire.** Identifier l’édition ou le témoin exact, sa source de vérité, son étendue matérielle, son statut juridique et éditorial, ses éventuels textes parallèles et le régime de transcription applicable. Vérifier la notice et les métadonnées indispensables (§§ 2, 5, 11, 14, 16, 19). Aucune correction de fond ne précède cette identification.

3. **Faire l’état des lieux en lecture seule.** Mesurer l’existant et cartographier toutes les surfaces réellement utilisées : unités source, segments, niveaux, paragraphes, rangs, pages, natures, raccords, offsets, empreintes, titres et chapeaux, enrichissements, notes et apparats, métadonnées, textes parallèles, alignements, liens existants et projections de rendu. Classer chaque constat comme erreur certaine, anomalie à examiner, réserve documentée ou dette étrangère au périmètre. Le diagnostic ne modifie rien (§ 23.1).

4. **Rétablir d’abord la structure réelle de l’édition.** Comparer le sommaire, les têtes, les lemmes, les divisions et le fac-similé ; distinguer titre d’œuvre, paratexte, chapitre, sous-titre, chapeau, lemme, subdivision numérotée, paragraphe et simple repère. Supprimer les niveaux inventés, doublons structurels et contenants techniques sans fonction ; restituer les natures et les espaces textuels corrects. Les paragraphes, rangs, pagination et segmentation sont ensuite remis en cohérence avec cette structure (§§ 6, 7, 20, 22). L’interface ne commande jamais la structure.

5. **Établir le texte.** Collationner le texte contre la source et corriger les erreurs certaines de transcription, OCR, contamination, omission, duplication, raccord ou déplacement. Conserver les leçons surprenantes mais attestées ; signaler les incertitudes ; ne pas moderniser silencieusement (§§ 1, 14, 23.6–23.11, 25). Une couche diplomatique ou source n’est pas réécrite pour corriger une couche éditoriale dérivée.

6. **Stabiliser la segmentation et la provenance.** Après toute correction textuelle ou structurelle, vérifier les unités source, la recomposition, les paragraphes, rangs, `segment_numero`, `segment_key`, `join_before`, offsets, limites de source, pagination et empreintes. Une segmentation ne sacrifie ni l’unité syntaxique ni la reconstruction exacte du témoin. Les contrôles du § 20 sont des conditions nécessaires, jamais une preuve suffisante d’exactitude.

7. **Appliquer la couche éditoriale.** Une fois texte et structure stabilisés, traiter la typographie, la ponctuation des citations, les guillemets, langues et écritures, italiques, références intégrées, lemmes et enrichissements selon le § 3 et les conventions propres au témoin. Contrôler toutes les projections et surfaces rendues : une correction incomplète dans une projection secondaire reste une correction inachevée. Le rendu ne doit pas masquer une donnée fautive.

8. **Reprendre notes et apparats.** Contrôler l’appartenance documentaire des apparats, puis les notes comme un système complet : identité, numérotation, blocs, ancres, cible réelle, offsets, portée, ponctuation, enrichissements, références et éventuelles ancres de titre (§§ 8, 13, 22). Aucune note, aucun appel ni aucun apparat n’est conservé sous une forme technique redondante lorsque le modèle normatif le représente déjà.

9. **Contrôler les textes parallèles et alignements, s’ils existent.** Toute resegmentation ou modification de frontières oblige à revalider les alignements concernés et leurs projections. L’alignement est sémantique et ne force jamais du `1:1` (§ 12). Les caches ou projections dérivés sont régénérés après la donnée normative, jamais l’inverse.

10. **Nettoyer les métadonnées et résidus de chantier.** Réconcilier les compteurs, statuts, niveaux déclarés, notices, provenances et métadonnées avec l’état réel. Rechercher les champs vides artificiels, marqueurs obsolètes, anciens niveaux, unités sans fonction, copies d’import et données devenues redondantes. Ce nettoyage suit le principe de nécessité ci-dessus et les règles de suppression du § 23.8 ; il ne supprime jamais une preuve documentaire unique.

11. **Clore la phase A par une vérification exhaustive.** Rejouer les contrôles structurels (§ 20), contrôler les apparats, rechercher les omissions et doublons, relire directement les zones à risque et effectuer des sondages reproductibles répartis (§§ 14.7–14.8, 21). Une erreur trouvée par sondage définit une famille : rechercher tous les cas analogues, corriger la famille entière, puis rejouer les contrôles. La phase A n’est close que si le périmètre annoncé a été effectivement relu, que les invariants applicables sont conformes et que les réserves restantes sont explicitement nommées.

12. **N’ouvrir la phase B qu’après clôture explicite de la phase A.** Les liens bibliques constituent une révision distincte (§§ 1.3, 9, 10, 24, 25). Ils sont relus sur le texte stabilisé, avec leurs cibles, types, étendues, motifs et fiabilités. Si la phase B révèle une erreur du texte, de la structure, d’une note ou d’un alignement, la phase A est rouverte sur le périmètre nécessaire avant de reprendre les liens dépendants.

13. **Effectuer l’audit final indépendant.** Après la dernière écriture, relire l’état depuis la base et non le plan de correction ; recomposer les unités et projections, vérifier les empreintes et dépendances, rechercher les résidus des familles déjà rencontrées et effectuer un dernier sondage indépendant. Si la présentation a été affectée, vérifier également le rendu réel. Les procédures des §§ 23.1–23.11 s’appliquent à chaque mutation intermédiaire comme à cette passe finale.

14. **Clore sans surdéclarer.** Mettre à jour uniquement la mission correspondante dans le centre de contrôle avec des chiffres issus de requêtes, consigner les réserves, retirer l’état « en cours » et conserver les sauvegardes et preuves utiles. Une clôture technique ou éditoriale ne crée jamais une validation humaine, une publication ou un statut scientifique qui n’a pas été explicitement accordé. La publication est une décision distincte, soumise aux droits, à la sécurité et aux conditions de livraison (§§ 17, 27, 31.6).

15. **Rouvrir et raffiner.** Toute erreur certaine découverte après clôture rouvre la dernière étape dont elle révèle l’insuffisance ainsi que les étapes dépendantes. Si elle révèle un angle mort de méthode et non un accident isolé, la procédure ou la règle spécialisée correspondante est raffinée dans la charte conformément au § 27. Le précédent état n’est pas réécrit comme s’il avait toujours été correct : le journal de mission conserve la succession réelle des contrôles.

**Discipline de mutation.** À l’intérieur de chacune de ces étapes, toute écriture suit le cycle obligatoire des §§ 23.1–23.11 : diagnostic, proposition à blanc, sauvegarde, écriture bornée et gardée, relecture depuis la base, recomposition, contrôles et rapport. Les règles spécifiques de schéma et d’écriture en vigueur priment sur tout script historique.

**Condition constitutionnelle de clôture.** Une révision complète n’est close que lorsque toutes les étapes applicables ci-dessus sont closes dans leur ordre, que les étapes déclarées non applicables le sont pour une raison vérifiable, qu’aucune mission étrangère n’a été écrasée et que l’état annoncé correspond à l’état mesuré de la base.


### 23.1 Diagnostic

Commencer par un audit en lecture seule. Définir le périmètre, la source, les invariants et le résultat attendu. Ne pas écrire pendant la découverte du problème.

### 23.2 Plan et mode à blanc

Produire une proposition calculée, avec les lignes avant et après, les décomptes et les contrôles. Le mode à blanc ne change ni fichier source ni base.

### 23.3 Écriture bornée

Écrire par identifiants explicites, lots limités et conditions de garde. Une mise à jour ne doit pas toucher une ligne dont l’état a changé depuis le diagnostic.

### 23.4 Vérification

Relire depuis la base, recomposer les données, comparer les empreintes pertinentes et exécuter les contrôles aléatoires. Un message de succès de l’API ne suffit pas.

### 23.5 Rapport

Le rapport indique ce qui a été modifié, contrôlé et laissé en attente. Il donne les chemins des sauvegardes et artefacts utiles. Les bilans propres à une œuvre restent dans `audit/` ou dans les scripts de chantier, jamais dans la charte.

### 23.6 Non-modernisation

Une correction éditoriale ne modernise pas silencieusement le texte. Si l’édition est normalisée selon une politique particulière, cette politique doit être explicitement approuvée et appliquée de manière cohérente.

### 23.7 Respect de l’édition

La segmentation, la ponctuation, les titres et la numérotation se fondent sur l’édition. Une difficulté d’interface ou d’algorithme ne justifie pas leur réécriture.

### 23.8 Opérations destructrices

Avant suppression, identifier exactement les lignes et dépendances, produire une sauvegarde et vérifier le chemin ou l’identifiant cible. Une suppression globale, un chemin racine ou une variable non résolue sont interdits.

### 23.9 Contrôle des outils

Les scripts historiques peuvent contenir des hypothèses périmées. Avant réemploi, vérifier leurs colonnes, valeurs, filtres et garde-fous contre la présente charte et le schéma courant.


### 23.10 Sauvegarde obligatoire

Avant toute mutation substantielle, exporter les lignes concernées avec leurs identifiants et toutes les colonnes susceptibles d’être touchées. La sauvegarde est datée, lisible et placée dans un emplacement explicitement identifié. `audit/` ou `tmp/` dans le dépôt local restent les emplacements préférés pour les sauvegardes de chantier.

OneDrive peut recevoir une sauvegarde ou une copie lorsque cela est utile ; il n’est pas interdit. Une synchronisation distante ne doit toutefois pas être la seule protection d’une opération sensible et ne remplace ni la sauvegarde bornée préalable, ni les contrôles de restauration ou d’empreinte.

### 23.11 Fidélité des caractères

Les sauvegardes, transformations et comparaisons préservent Unicode, les espaces insécables, les accents, les écritures grecque et hébraïque, ainsi que les retours significatifs. Ne pas appliquer `trim()` ou une normalisation globale lorsqu’elle détruirait une distinction contrôlée.

## 24. Contrôle des liens en base

### 24.1 Cibles

Chaque cible doit exister dans le référentiel biblique et correspondre au texte reconnu. Les plages ont un début et une fin cohérents. Les liens vers un livre ou un chapitre entier ne sont admis que lorsque le passage vise réellement cette étendue.

### 24.2 Doublons

Détecter les doublons sur le segment, la cible, l’étendue et le type selon le modèle courant. Deux liens semblables peuvent être légitimes s’ils expriment des fonctions différentes, mais cette différence doit être réelle et motivée.

### 24.3 Fiabilité canonique

La seule échelle admise est celle du §10 : `à constituer`, `douteux`, `probable`, `vérifié`. Les interfaces, scripts et contraintes de base doivent employer exactement ces valeurs.

### 24.4 Révision

Une passe de lecture renseigne les champs de révision prévus pour le lien et, lorsque le périmètre entier a été relu, ceux du segment. Ne pas marquer comme relu un segment simplement traversé par une passe automatique.

## 25. Doctrine de prudence

### 25.0 Règle supérieure

La précision prime le rendement. Aucun lien, aucun paragraphe, aucun titre et aucun texte original ne sont fabriqués pour obtenir un taux de complétude flatteur. Une donnée manquante mais honnête vaut mieux qu’une donnée fausse.

`Vérifié` décrit un acte de lecture et de confrontation, non une probabilité élevée. La machine présélectionne, contrôle des invariants et signale des anomalies. L’éditeur décide le sens.

### 25.1 Référence éditoriale

Une référence fournie par l’édition est une piste privilégiée, mais elle peut comporter une abréviation ambiguë, une numérotation différente ou une coquille. Elle devient un lien vérifié seulement après confrontation.

### 25.2 Numérotations divergentes

Pour toute divergence de canon ou de numérotation, partir du texte attesté. Les tables de conversion réduisent l’espace de recherche. Elles ne remplacent pas l’identification sémantique.

### 25.3 Abréviations

Résoudre une abréviation par le référentiel canonique, le contexte et les usages de l’édition. Ne pas inventer une correspondance globale à partir d’un seul cas.

### 25.4 Étendue

Un lien vise l’étendue minimale qui porte le rapport constaté. Ne pas étendre à un chapitre entier lorsqu’un verset suffit. Ne pas réduire à un verset une citation ou un commentaire qui en couvre plusieurs.

### 25.5 Citations et balisage

Les guillemets, italiques, parenthèses et formules d’introduction aident à repérer des candidats. Ils ne déterminent ni le type ni la cible. Une œuvre peut commenter continûment un livre sans baliser ses lemmes.

### 25.6 Motifs

Le motif d’un lien explique brièvement le rapport observé. Il nomme les mots, l’image, l’épisode, l’argument ou le mouvement interprétatif pertinents. Une formule générique comme `rapport biblique` est insuffisante.

### 25.7 Paraphrases

Une paraphrase peut être certaine sans partager beaucoup de vocabulaire avec la traduction biblique locale. La recherche lexicale échoue alors légitimement. Seule la lecture permet de conclure.

### 25.8 Impasses mécaniques

Quand une méthode échoue sur un profil de texte, ne pas généraliser son échec à toutes les œuvres. Décrire précisément le périmètre du constat dans le dossier de travail. Changer d’outil ou passer à la lecture.

### 25.9 Traçabilité

La base conserve la provenance et l’état de révision des liens. Les rapports de passe conservent les paramètres, échantillons et anomalies. La charte ne reçoit ni rendements particuliers ni chronologie de chantier.

### 25.10 Contrôle final

Un chantier de liens n’est clos qu’après lecture du périmètre annoncé, recherche d’oublis, contrôle des cibles et types, vérification des valeurs de fiabilité, détection des doublons, sondage aléatoire et relecture depuis la base.

## 26. Chronologie et frise des événements

La chronologie générale, les séries historiques et les chronologies d’auteurs reposent sur un même réservoir d’événements. La base ne contient pas plusieurs copies concurrentes d’un même fait : elle contient des événements centraux uniques, enrichis par des classements, des relations et des associations.

La frise complète peut accueillir tout événement distinct, documenté et pertinent pour l’histoire du christianisme. Sa lecture publique demeure cependant hiérarchisée. L’exhaustivité du réservoir ne doit jamais produire une frise principale illisible.

### 26.1 Objets normatifs et source de vérité

Le module repose notamment sur les objets suivants :

- `familles_evenements` : grandes familles éditoriales ;
- `genres_evenements` : vocabulaire contrôlé des genres, chaque genre appartenant à une seule famille ;
- `evenements` : événement central, décrit une seule fois ;
- `zones_geographiques`, `pays_filtres` et `evenements_pays_filtres` : localisation historique et filtres contemporains ;
- `periodes_frise` : périodisation éditoriale contrôlée ;
- `traditions_chretiennes` et `evenements_traditions` : rattachement plusieurs-à-plusieurs des événements aux traditions concernées ;
- `evenements_relations` : relations historiques ou éditoriales entre événements ;
- `series_evenements` et `series_evenements_membres` : regroupement de plusieurs étapes sous un jalon principal ;
- `auteurs_evenements` : association sélective entre un auteur existant et un événement.

Les identifiants d’événements sont des clés métier stables de la forme `EVT000001`. Ils sont opaques, permanents et indépendants du titre, de la date, de l’auteur, de la période ou du genre. Ils ne sont jamais recyclés ni modifiés à la suite d’une correction éditoriale.

La famille se déduit toujours du genre. Elle n’est jamais recopiée en dur dans `evenements`, un fichier d’import ou le code.

### 26.2 Familles et genres

Les cinq familles normatives sont :

1. `Vie des auteurs` ;
2. `Textes et doctrine` ;
3. `Église et vie religieuse` ;
4. `Pouvoirs, conflits et ruptures` ;
5. `Culture et contexte`.

La liste normative des genres est celle de `genres_evenements`. La charte ne fige pas une copie textuelle de ce référentiel, afin d’éviter qu’elle devienne obsolète après une migration contrôlée.

Les genres doivent rester génériques, définis et réutilisables. On ne crée jamais un genre pour un événement particulier. Une forme telle que `destruction de telle ville`, `investiture de tel pape` ou `guerre contre tel peuple` appartient au titre, non au référentiel.

Toute création, fusion ou suppression de genre exige une définition d’usage, une famille unique, la vérification qu’un genre existant ne couvre pas déjà le cas, la migration des événements concernés, une sauvegarde préalable et le contrôle qu’aucun événement ni genre ne devient orphelin.

### 26.3 Événement central et portées

Un événement porte au minimum : `id`, `date_debut`, `date_fin`, `date_exacte`, `qualification_date`, `titre`, `notice`, `genre_id`, `portee`, `importance_generale` lorsque la portée est générale, `source_principale`, éventuellement `source_secondaire`, `note_datation`, `origine_donnee`, `statut_source`, `est_publie` et, selon le cas, `oeuvre_id`, les champs géographiques, le niveau de lecture, les axes essentiels, la période et la portée ecclésiale.

Les portées admises sont :

- `générale` : événement appartenant au réservoir de la page d’histoire générale ;
- `biographique` : événement propre à la vie d’un auteur ;
- `bibliographique` : événement propre à une œuvre, sa composition, sa transmission ou sa réception.

Un événement général et un événement biographique ou bibliographique ne décrivent jamais deux fois exactement le même fait. Lorsqu’un fait sert à plusieurs parcours, un seul événement central est réutilisé.

### 26.4 Importance historique et niveau de lecture

L’importance historique et le niveau de lecture sont deux axes distincts.

Un événement général porte une importance parmi :

- `S — rupture` : basculement exceptionnel qui ouvre ou ferme durablement une période, reconfigure les communions, l’espace chrétien, les rapports avec les pouvoirs ou les conditions de transmission ;
- `A — structurant` : événement qui organise durablement une institution, une doctrine, une pratique ou une période ;
- `B — majeur` : événement important pour comprendre une séquence, sans être indispensable à son découpage général ;
- `C — complément` : repère utile, spécialisé ou secondaire.

Le rang `S` reste exceptionnel. Un concile, une première édition, une guerre, une œuvre, un pontificat ou une nouveauté ne reçoit jamais automatiquement ce rang. L’importance générale ne dépend ni de la proximité géographique avec la France ni de la place de l’événement dans un parcours spécialisé.

Le niveau de lecture francophone est stocké dans `niveau_lecture_fr` :

- `Essentiel` : parcours principal destiné au lecteur francophone ;
- `Repère` : événement utile pour comprendre une période, une tradition ou une chaîne ;
- `Approfondissement` : développement régional, confessionnel ou spécialisé ;
- `Spécialisé` : donnée technique, éditoriale, bibliographique ou locale destinée à une recherche fine.

Un événement historiquement structurant peut rester un simple repère dans le parcours francophone. Inversement, un événement de portée historique plus limitée peut être essentiel pour comprendre directement l’histoire religieuse française.

`motif_niveau_fr` justifie le classement. `niveau_lecture_fr_verrouille` protège un classement validé contre un recalcul automatique. Aucun quota par siècle, région, tradition ou genre ne détermine mécaniquement le niveau.

### 26.5 Trois axes de l’essentiel

Le niveau `Essentiel` est l’union de trois axes indépendants :

- `est_essentiel_france` : événement indispensable à l’histoire religieuse de la France ou affectant directement ses institutions, textes, pratiques et communautés ;
- `est_essentiel_europe` : événement structurant durablement le christianisme européen ;
- `est_essentiel_eglise` : événement indispensable à l’histoire commune ou universelle de l’Église.

Un événement peut relever de plusieurs axes. Les vues publiques exposent les badges `France`, `Europe` et `Église universelle` ; le front ne les reconstitue pas.

Relèvent notamment de l’axe universel les origines communes, les conciles œcuméniques ou généraux réellement structurants, les grandes définitions dogmatiques, les schismes majeurs, les principales réformes canoniques ou liturgiques universelles et les actes pontificaux qui transforment durablement l’ensemble de l’Église catholique.

Un événement extérieur à l’Europe peut donc être essentiel lorsqu’il appartient aux origines communes ou transforme durablement l’ensemble du christianisme. En revanche, la plupart des missions, persécutions, réveils, créations de sièges ou développements confessionnels propres à une région lointaine relèvent de `Repère` ou d’`Approfondissement`, même lorsqu’ils sont historiquement importants.

La proximité française ou européenne ne relève jamais artificiellement `importance_generale`. Elle intervient seulement dans le niveau de lecture et les badges.

### 26.6 Dates et périodisation

La base distingue les valeurs de tri et la formulation de lecture :

- `date_debut` et `date_fin` servent au classement et au filtrage ;
- `date_exacte` contient la formulation éditoriale lorsque celle-ci est connue ou utile ;
- `qualification_date` qualifie la certitude ou la forme de la datation.

`date_fin` ne peut être antérieure à `date_debut`. Une date incertaine reste incertaine : on emploie les qualifications contrôlées `exacte`, `année certaine`, `vers`, `entre`, `après`, `avant`, `traditionnellement`, `période`. On ne fabrique jamais une date pour satisfaire un composant.

Les vues publiques fournissent `date_affichage`. Le front l’utilise directement.

Tout événement général reçoit un `periode_code` appartenant à `periodes_frise`. Les treize périodes actuelles sont :

1. Église apostolique ;
2. Christianisme ancien ;
3. Empire chrétien et conciles anciens ;
4. Haut Moyen Âge ;
5. Réforme grégorienne et Investitures ;
6. Chrétienté médiévale ;
7. Réformes et confessions ;
8. Époque moderne ;
9. Révolution et restaurations ;
10. Christianismes de l’âge industriel ;
11. Guerres et totalitarismes ;
12. Après-guerre et Vatican II ;
13. Monde contemporain.

L’attribution automatique se fonde normalement sur `date_debut`. Une correction manuelle n’est admise que lorsqu’un événement traversant une borne appartient éditorialement de façon manifeste à une autre période ; elle doit rester traçable.

### 26.7 Traditions chrétiennes et portée ecclésiale

Un événement peut concerner plusieurs traditions. Les rattachements sont stockés dans `evenements_traditions` ; aucune liste séparée n’est recopiée dans l’événement.

Le référentiel actuel comprend : Christianisme commun ; Catholicisme latin ; Églises catholiques orientales ; Orthodoxie byzantine ; Églises orthodoxes orientales ; Église de l’Orient ; Anglicanisme ; Luthéranisme ; Tradition réformée ; Anabaptisme et mennonitisme ; Méthodisme ; Baptisme ; Église morave ; Évangélisme ; Pentecôtisme et renouveaux charismatiques ; Adventisme ; Mouvements restaurationnistes modernes ; Œcuménisme.

`Christianisme commun` et `Œcuménisme` sont des axes transversaux. `Œcuménisme` n’est attribué qu’à un dialogue, une convergence, une union, une institution commune ou une réception pluriconfessionnelle explicite. Une coexistence, une guerre ou une controverse entre confessions ne suffit pas. De même, le mot générique `réforme` ne suffit jamais à rattacher un événement à la `Tradition réformée`.

Tout événement général publié possède au moins un rattachement de tradition. Les rattachements automatiques sont des propositions structurées : ils doivent être contrôlés lorsqu’un nouvel événement est ajouté ou substantiellement modifié.

`portee_ecclesiale` décrit l’étendue ecclésiale selon les valeurs : `universelle`, `pluriconfessionnelle`, `propre à une tradition`, `régionale`, `locale`. Cette portée ne remplace ni `portee`, ni l’importance, ni le niveau de lecture.

### 26.8 Relations entre événements

`evenements_relations` décrit une relation explicite entre deux événements. La phrase `événement source + type de relation + événement cible` doit être historiquement intelligible.

Les types admis sont :

- `prépare` ;
- `provoque` ;
- `répond à` ;
- `condamne` ;
- `révise` ;
- `prolonge` ;
- `remplace` ;
- `met fin à`.

Chaque relation porte une justification précise. La seule proximité chronologique, le même genre ou une ressemblance de titre ne suffisent jamais. Deux relations opposées entre les mêmes événements ne sont admises que si elles expriment deux vérités distinctes et non une duplication mécanique.

Les relations complètent les notices ; elles ne servent pas à fabriquer une causalité incertaine. Une relation contestable reste absente.

### 26.9 Séries historiques et condensation

Une série regroupe plusieurs événements qui forment une même histoire éditoriale, doctrinale, institutionnelle, liturgique ou politique. Elle ne constitue ni un événement ni un genre.

`series_evenements` porte un code stable, un titre, une description, un type, un ordre et un `evenement_principal_id`. `series_evenements_membres` rattache les événements avec un rôle parmi : `principal`, `origine`, `préparation`, `étape`, `révision`, `prolongement`, `rupture`, `conclusion`, `restauration`.

Toute série possède exactement un événement principal publié, lui-même présent comme membre `principal`. Les autres membres portent un ordre, une justification et, lorsque cela convient, un `type_relation_principal`.

La série sert à condenser l’affichage : le jalon principal reste visible, tandis que les préparations, révisions et prolongements peuvent être déployés. Un membre secondaire n’est pas supprimé de la frise complète et demeure accessible par recherche, filtre ou affichage développé.

Les titres de série sont intégrés à la recherche. Une série ne doit pas devenir un fourre-tout thématique : ses membres doivent former une chaîne identifiable.

### 26.10 Association progressive aux auteurs

Une association ne peut viser qu’un `auteur_id` déjà présent dans `auteurs`. Un import ne crée jamais implicitement une fiche d’auteur à partir d’un nom.

Les liens entre auteurs et événements sont créés progressivement lors de l’ajout ou de la reprise d’un auteur. Il n’existe pas de campagne automatique destinée à rattacher rétrospectivement tous les événements à tous les auteurs existants.

Le couple `auteur_id + evenement_id` est unique. L’association porte notamment `nature_lien`, `pertinence`, `justification`, `titre_personnalise`, `notice_personnalisee`, `origine_association`, `source_lien`, `est_affiche`, `a_controler` et, exceptionnellement, `ordre_force`.

La contemporanéité ne suffit jamais. Un événement n’est associé à un auteur que s’il éclaire sa vie, une œuvre déterminée, une controverse où il intervient réellement, son siège ou son aire d’activité, une institution à laquelle il appartient, une décision dont il subit directement les conséquences ou la réception de son œuvre.

Chaque association doit répondre précisément à la question : pourquoi cet événement figure-t-il chez cet auteur plutôt que chez tout autre contemporain ? La réponse est consignée dans `justification` et appuyée par `source_lien`.

Un événement postérieur à la mort de l’auteur n’est associé que s’il concerne explicitement sa réception, sa condamnation, sa réhabilitation, sa doctrine ou la transmission de son œuvre.

### 26.11 Publication et workflow des futurs ajouts

Les événements et associations fournis sont publiés immédiatement. `classement_a_controler` et `a_controler` ne créent pas une file de validation préalable : ils signalent un contrôle éditorial à effectuer sans bloquer l’affichage.

Tout nouvel événement général reçoit automatiquement :

- le niveau initial `Repère` ;
- une période ;
- une ou plusieurs traditions proposées ;
- une portée ecclésiale ;
- son index de recherche ;
- `classement_a_controler = true`.

Une modification substantielle du titre, des dates, du genre, de la portée ou de la géographie réouvre le contrôle. Après vérification, le classement peut être validé, son motif précisé et, si nécessaire, verrouillé.

Une réinsertion présentant le même titre normalisé et les mêmes bornes est bloquée comme doublon exact. Les ressemblances sémantiques sont signalées par l’audit mais ne sont jamais fusionnées sans examen éditorial.

`est_publie` décide de la visibilité de l’événement ; `est_affiche` décide de celle d’une association, d’une relation ou d’un membre de série. Masquer une association ou une relation ne supprime jamais l’événement central.

`statut_source = 'à consolider'` est préférable à une certitude artificielle lorsque la datation ou la source demande encore un approfondissement.

### 26.12 Œuvres et événements bibliographiques

Lorsqu’une œuvre publiée possède une datation exploitable, sa composition, sa publication, sa transmission ou sa réception peut recevoir un événement bibliographique lié par `evenements.oeuvre_id`.

Ce lien permet d’ouvrir l’œuvre depuis la frise et d’éviter les divergences avec sa fiche. Une œuvre sans datation exploitable ne reçoit pas de date inventée.

Un événement général et un événement bibliographique ne décrivent pas deux fois le même fait. Lorsqu’une œuvre majeure est aussi un repère général, un seul événement central est réutilisé et peut être associé à l’auteur.

### 26.13 Vues publiques et API de lecture

Le site ne lit jamais directement les tables normatives depuis une page publique. Il utilise les vues et fonctions prévues, définies avec `security_invoker = true` lorsque cela s’applique et protégées par les politiques RLS.

Les objets publics principaux sont :

- `v_frise_generale` : événements généraux publiés, enrichis de la période, des traditions, des axes essentiels, des séries et des compteurs de relations ;
- `v_frise_evenements_condenses` : vue destinée à la lecture condensée par séries ;
- `v_frise_modes_lecture` : définition des modes et comptages ;
- `v_frise_periodes` et `v_frise_traditions` : référentiels et comptages de filtres ;
- `v_series_evenements` : séries et membres publiés ;
- `v_evenements_relations` : relations affichables ;
- `v_chronologie_auteurs` : associations affichées vers des événements publiés ;
- `rechercher_frise(...)` : recherche et filtrage serveur.

Le front ne redéduit pas les valeurs par des heuristiques parallèles. Il utilise directement `ordre_affichage`, `date_affichage`, `niveau_lecture_fr`, `badges_essentiel`, `tradition_codes`, `periode_code`, les champs de série et les booléens de modes.

Le filtrage par pays actuel utilise exclusivement `pays_filtre_codes` ou `pays_filtres`, jamais le champ historique `pays`.

Les sources sont présentées par un libellé de domaine et ouvertes dans un nouvel onglet avec `rel="noopener noreferrer"`, jamais sous forme d’URL brute.

### 26.14 Modes de lecture et présentation

Les quatre modes de lecture sont :

1. `Essentiel` ;
2. `Ajouter les repères` ;
3. `Élargir au monde chrétien` ;
4. `Tout afficher`.

Le mode `Essentiel` n’est plus déduit des seuls rangs S/A/B/C. Il utilise `niveau_lecture_fr` et les axes France, Europe et Église universelle.

Le mode condensé masque les membres secondaires d’une série et conserve son événement principal. Le lecteur peut déployer la série. Le mode développé montre les notices, lieux, genres, sources, traditions, périodes, relations et détails de datation. Une représentation à l’échelle peut compléter ces modes sans modifier le classement éditorial.

Les filtres peuvent porter sur la période, la famille, le genre, le niveau, l’importance, les traditions, les axes essentiels, la géographie moderne et historique, les séries et les bornes chronologiques.

### 26.15 Recherche intégrale

La recherche de la frise est effectuée par `rechercher_frise(...)`, non par un filtrage partiel dans le navigateur.

Elle interroge le titre, la notice, le genre, la famille, les lieux, la période, les traditions et les titres de séries. Elle combine recherche plein texte française et similarité trigramme ; elle tolère les accents absents et les fautes raisonnables.

Ses paramètres permettent de choisir le mode de lecture, les traditions, les périodes, les bornes de dates, l’affichage condensé et la limite de résultats.

Le score de recherche mesure la proximité avec la requête ; il ne remplace ni l’importance historique ni le niveau de lecture.

### 26.16 Trois brins dans une chronologie d’auteur

La chronologie d’une fiche auteur se lit selon trois types d’affichage fournis par `v_chronologie_auteurs` :

- `vie` : événements biographiques et liens directs ;
- `œuvre` : événements bibliographiques ;
- `contexte` : événements généraux associés.

Vie et Œuvres dominent visuellement ; Contexte reste plus discret. Les œuvres sont en italique et cliquables lorsque `oeuvre_id` existe. La frise d’un auteur demeure sélective et ne devient jamais un résumé exhaustif de son siècle.

### 26.17 Langage visuel des familles

Les familles se distinguent par une couleur stable reprise dans la légende, les filtres, les points ou filets et les libellés :

- `Vie des auteurs` : vert bleuté doux, par exemple `#4F7F78` ;
- `Textes et doctrine` : vert olive ou sauge, par exemple `#6D7D43` ;
- `Église et vie religieuse` : doré ou ocre doux, par exemple `#C79A3A` ;
- `Pouvoirs, conflits et ruptures` : rouge brique, par exemple `#B54D3F` ;
- `Culture et contexte` : violet grisé, par exemple `#746187`.

Le titre reste sombre et neutre. La couleur apparaît dans le point, le filet, la date ou le libellé ; on ne colore pas toute la ligne.

Les badges France, Europe et Église universelle expliquent le choix éditorial sans remplacer les couleurs de famille.

### 26.18 Localisation historique et filtres géographiques

Chaque événement peut porter :

- `zone_geographique` : macro-zone contrôlée ;
- `pays` : désignation politique ou historique pertinente à la date ;
- `region` : région historique, administrative ou physique ;
- `ville` : ville ou site principal.

Ces champs décrivent le lieu historiquement intelligible. Ils ne sont pas modernisés artificiellement pour satisfaire un filtre.

Le filtrage contemporain utilise `evenements_pays_filtres`. Une désignation historique étendue ne reçoit pas automatiquement tous les pays modernes qu’elle pourrait théoriquement recouvrir : chaque rattachement est établi selon la localisation effectivement documentée.

Un événement couvrant plusieurs territoires reçoit la macro-zone la plus fidèle ; les niveaux trop précis restent vides plutôt que fabriqués. Une hypothèse de localisation se conserve dans la notice ou la note, non dans un champ structuré.

Le champ historique `evenements.lieu` est déprécié et conservé seulement comme trace de migration.

### 26.19 Import, contrôles et sauvegardes

Un import d’événements est idempotent : l’identifiant stable met à jour l’événement existant au lieu d’en créer une copie.

Avant écriture, vérifier : les auteurs et œuvres référencés ; le genre ; le format de l’identifiant ; les bornes de dates ; la source principale ; la géographie ; le niveau proposé ; la période ; les traditions ; la portée ecclésiale ; les relations ou séries éventuelles ; l’absence de doublon exact ou conceptuel.

Après écriture, contrôler depuis la base :

- aucun événement, genre, famille, période, tradition, relation, série ou lien orphelin ;
- aucune date incohérente ;
- aucun événement général publié sans importance, niveau, motif, période, tradition, portée ecclésiale, source ou filtre géographique requis ;
- aucune association affichée vers un événement non publié ;
- aucune relation sans justification ;
- aucune série sans membre principal publié ;
- aucune œuvre liée à plusieurs événements décrivant le même fait ;
- aucun doublon exact ;
- lecture anonyme effective des vues et de la fonction de recherche.

Toute opération structurelle ou destructive est précédée d’une sauvegarde bornée des tables concernées et suivie d’un audit complet.

### 26.20 Prudence éditoriale et priorité géographique

La frise est un instrument de lecture, non une accumulation de dates. Elle conserve les événements distincts et documentés, mais hiérarchise leur visibilité.

L’enrichissement accorde une priorité assumée :

1. à la Gaule et à la France ;
2. à l’Europe et au bassin méditerranéen ;
3. aux événements importants pour l’Église universelle, quel que soit leur lieu ;
4. aux autres régions lorsqu’elles corrigent une lacune réelle, éclairent une tradition présente dans le corpus ou entretiennent un lien substantiel avec les espaces prioritaires.

Cette priorité n’instaure ni quota ni équilibre artificiel. Un siècle peu fourni ne justifie pas l’ajout de dates faibles. Un événement étranger déjà présent n’est pas supprimé pour sa seule localisation ; son niveau de lecture reflète simplement sa pertinence pour le parcours francophone.

Les conciles, schismes, dogmes, réformes générales, textes bibliques fondamentaux et actes universels restent visibles lorsqu’ils sont nécessaires à l’intelligence de l’Église, même s’ils se déroulent hors de France ou d’Europe.

Une source encyclopédique peut servir au repérage. Les datations contestées, les événements essentiels et les relations causales doivent être recoupés par une source institutionnelle, universitaire ou primaire. Une absence de lien ou un statut `à consolider` valent mieux qu’une certitude artificielle.

Les vues internes d’audit doivent rester vides d’anomalies avant la clôture d’une passe. Les comptages de chantier et états provisoires appartiennent aux rapports et sauvegardes, non à la charte normative.



## 27. Entretien de la charte

Cette charte est la mémoire normative de Corpus Scriptura. Une règle générale nouvellement arrêtée au cours du travail doit y être intégrée dès qu’elle est suffisamment définie, après contrôle de compatibilité avec les règles existantes. Elle remplace la règle antérieure au lieu de s’ajouter comme amendement contradictoire. Les décisions propres à une œuvre, statistiques, journaux et états de chantier restent hors de la charte.

Au début de toute nouvelle conversation consacrée à Corpus Scriptura, et avant toute reprise substantielle d’un chantier dans une conversation existante, lire la valeur active `public.parametres.charte_ia` avant de prendre une décision éditoriale ou d’effectuer une mutation. La mémoire conversationnelle peut aider au contexte ; elle ne remplace jamais la charte active.

Lorsqu’une nouvelle règle générale est définie pendant une conversation, ne pas se contenter de la garder en mémoire : mettre à jour la charte active dans le même chantier, après sauvegarde et contrôle des contradictions. Si une modification de schéma, de code ou de données est nécessaire pour rendre la règle applicable, créer en même temps la dette ou la correction correspondante au centre de contrôle.

Avant publication d’une nouvelle version :

1. sauvegarder la valeur active de `parametres.charte_ia` ;
2. vérifier les renvois de sections utilisés par le code et les consignes du dépôt ;
3. rechercher doublons de titres, valeurs obsolètes, chemins contradictoires, échappements littéraux et caractères corrompus ;
4. vérifier la cohérence avec le schéma, les contraintes, les importateurs et le lecteur ;
5. publier par mise à jour gardée ;
6. relire la valeur depuis la base et comparer son empreinte au contenu attendu.

`public.parametres.mis_a_jour` est entretenu automatiquement par la base lors d’une mise à jour. Une date saisie manuellement ou laissée inchangée par un outil ne fait pas autorité sur la fraîcheur d’un paramètre.


## 28. Suivi permanent de l’avancement des notices

### 28.1 Emplacement unique

L’état vivant des chantiers de notices est conservé sous la seule clé active `public.parametres.suivi_avancement_notices`. Cette clé contient un objet `chantiers` ; chaque périmètre suivi y possède une sous-clé stable, un `perimetre_code`, sa définition de périmètre, son dénominateur, ses indicateurs, ses reliquats et sa prochaine étape.

Une clé parallèle propre à un chantier, telle que l’ancienne `avancement_notices_raulx`, n’est pas maintenue comme second état actif. Les anciennes valeurs peuvent être conservées sous forme de sauvegarde datée uniquement.

Avant toute nouvelle passe sur un périmètre de notices, relire son état dans `suivi_avancement_notices`, puis recalculer les indicateurs directement depuis les tables sources. Après toute passe ayant modifié les notices, remplacer le même sous-objet par l’état recalculé. Les nombres annoncés en conversation ou dans un rapport ne font pas autorité s’ils divergent de la base.

### 28.2 Indicateurs communs des notices de traduction

Pour un périmètre de `catalogue_notices`, le relevé contient toujours son dénominateur et, lorsqu’ils sont pertinents, les indicateurs suivants :

1. **Contrôle bibliographique** : `verification_code` vaut `NOTICE_VERIFIEE`, `EXEMPLAIRE_VERIFIE`, `TEXTE_VERIFIE` ou `CONTROLE_COMPLET`.
2. **Texte vérifié** : `verification_code` vaut `TEXTE_VERIFIE` ou `CONTROLE_COMPLET`.
3. **Source individualisée** : `source_note` est renseignée et diffère de la formule générique `Une ou plusieurs sources externes sont renseignées dans url_source.`
4. **Autorité close** : `traducteur_status_code` est renseigné et différent de `A_CONTROLER`.
5. **Texte lié** : `url_texte_integral` est renseignée et non vide.
6. **Clôture stricte** : les conditions 1, 3, 4 et 5 sont simultanément remplies.

Chaque indicateur conserve son effectif, son dénominateur et son pourcentage. Les dimensions restent distinctes : la clôture stricte ne signifie pas relecture mot à mot du texte et ne remplace pas les autres indicateurs.

### 28.3 Règle de reprise et conformité

À la reprise, annoncer le dernier état enregistré, le confronter à la base et signaler toute divergence avant de poursuivre. Une variation du périmètre entraîne le recalcul du dénominateur. Les principaux reliquats sont nommés pour éviter de recommencer une recherche déjà close.

Le recalcul s’accompagne d’un contrôle de conformité du périmètre : identifiants actifs non dupliqués, autorités cohérentes avec leurs tables maîtresses, statuts contrôlés valides, relations de notices complètes, workflow non contradictoire et absence de pseudo-notices de contrôle négatif dans `catalogue_notices`.

## 29. Valeur académique des sources bibliographiques

Chaque référence bibliographique reçoit, par son éditeur et par son auteur, une **valeur académique** fondée sur des critères objectifs, notée de **1 (le plus fiable) à 5**. C'est une évaluation de la source, jamais un jugement de la personne.

Deux listes contrôlées portent cette note : `editeurs_valeur` (éditeur → score) et `auteurs_valeur` (auteur → score, plus un drapeau `reserve`). Elles couvrent les éditeurs et les auteurs RÉELLEMENT cités dans la bibliographie (`ouvrages_bibliographiques`) et se peuplent depuis ces valeurs distinctes : jamais une liste inventée. Ne pas les confondre avec la table `editeurs`, qui recense les éditeurs des éditions primaires (autre usage).

Règle d'affichage : une référence de faible valeur n'est jamais montrée ; une valeur intermédiaire ne l'est qu'à défaut d'une meilleure disponible pour la même péricope. On présente d'abord les meilleures sources, les moyennes seulement faute de mieux.

Réserve (auteurs) : un auteur en réserve voit ses références écartées, afin de protéger un public fragile d'une mise en avant susceptible de heurter, par exemple celle de bourreaux. La réserve ne juge pas la personne et ne préjuge pas de sa valeur académique.

La notation relève de l'autorité éditoriale, sur des critères objectifs et documentés : aucune personne ni maison réelle n'est étiquetée à la légère, en particulier aux niveaux bas.

### 29.1 Système de qualification scientifique déployé (règles de code)

La valeur scientifique FINALE d'un ouvrage est CALCULÉE par la base dans `ouvrages_bibliographiques.statut_scientifique`, qui vaut `retenu`, `secondaire`, `a_verifier` ou `exclu`. Le code applicatif ne recalcule jamais cette valeur à partir des scores. Il la lit, l'affiche, et permet à l'administrateur de saisir une décision manuelle.

La décision manuelle passe par `statut_scientifique_override`. La commande « Revenir au calcul automatique » remet cet override à `null` et rend la main au calcul de la base. Une exclusion manuelle exige un motif, et la base refuse l'écriture sans lui.

La correspondance entre le score de rang et le statut d'usage est imposée par la base. Un score de 1 donne `reference`, 2 donne `solide`, 3 et 4 donnent `secondaire`, 5 donne `exclu`, et l'absence de score donne `a_verifier`. Le code écrit toujours le statut d'usage accordé au score, faute de quoi la base rejette l'écriture. Un changement de score, de statut ou de réserve déclenche côté base le recalcul des ouvrages concernés.

Quatre vues servent selon le contexte, et le code choisit la bonne plutôt que d'approcher le filtrage en TypeScript. La documentation interne d'une péricope emploie `pericopes_documentation`. La recherche et la sélection bibliographiques internes emploient `bibliographie_admissible`, qui écarte les ouvrages exclus ou à vérifier. La publication publique et l'export définitif emploient `bibliographie_publiable`, qui exige en plus un lien vérifié et un ouvrage éditorialement validé. Le contrôle de la qualité scientifique en administration emploie `v_ouvrages_bibliographiques_qualite`. La page de lecture d'une péricope lit provisoirement `bibliographie_admissible` pour rester peuplée, et devra passer à `bibliographie_publiable` une fois les liens vérifiés.

L'affichage public ne montre jamais le score interne, la réserve, les motifs sensibles, les notes d'administration ni les sources d'évaluation. Un ouvrage exclu ne paraît nulle part côté public. Un ouvrage à vérifier n'est pas présenté comme une référence validée. Une source secondaire peut paraître si elle est par ailleurs vérifiée et validée, sans exposer son rang interne.

L'administration des ouvrages se trouve dans l'onglet « Ouvrages ». On y consulte le statut calculé, on saisit la décision manuelle, on rattache l'ouvrage à son autorité éditrice, à sa collection et à ses contributeurs. Un chercheur moderne reçoit une fiche notée dans `auteurs_valeur`. Un Père ou un autre auteur ancien, comme un collectif, n'a jamais de fiche notée : il figure comme source, sans note. L'écriture sur `ouvrages_bibliographiques` est réservée aux administrateurs authentifiés par une politique RLS `ouvrages_bibliographiques_admin_all`, calquée sur les tables sœurs. Les refus de la base, qu'il s'agisse d'un lien vers un ouvrage inadmissible, de la validation d'un ouvrage non retenu ou d'une exclusion sans motif, sont interceptés et expliqués sans mise à jour optimiste définitive.

### 29.2 Précision thématique des bibliographies de péricopes

La qualité académique ne suffit pas à constituer une bonne bibliographie de péricope. La sélection proposée au lecteur doit aussi refléter la précision du rapport entre l’ouvrage et le passage biblique. Un excellent commentaire général d’un livre biblique demeure un socle utile, mais il ne remplace pas une monographie ou une étude directement consacrée à la scène lorsqu’une telle référence existe.

Le champ `pericope_bibliographie.niveau_precision` qualifie ce rapport et prend exclusivement les valeurs suivantes :

- `directe` : monographie, article ou étude dont l’objet principal est la péricope, le passage ou une de ses versions synoptiques directement correspondantes ;
- `motif` : étude consacrée à un motif central et nettement circonscrit de la péricope, ou à un ensemble immédiatement plus large comme une séquence de Passion ;
- `generale` : commentaire d’un livre biblique, introduction, synthèse de vaste portée ou ouvrage de fond qui éclaire la péricope sans lui être spécialement consacré ;
- `indeterminee` : rattachement dont la précision n’a pas encore été relue.

La sélection visible est portée par `retenu_notice` et `ordre_notice`. Elle est éditoriale et distincte de la bibliographie documentaire complète. Elle comporte au plus quatre références, conformément à la contrainte de base. Lorsqu’une étude `directe` de valeur scientifique suffisante existe, au moins une telle étude doit précéder les références `generale`. Une référence classique directement consacrée au sujet a priorité sur l’accumulation de commentaires généraux, même lorsque ceux-ci sont plus récents. À défaut d’étude directe, rechercher d’abord une étude de `motif` avant de compléter par les meilleurs commentaires généraux.

Ordre de préférence pour une sélection : 1. étude directe de référence ; 2. seconde étude directe ou étude de motif réellement utile ; 3. commentaire général de référence ; 4. second commentaire, étude de tradition ou autre complément nécessaire. Il ne s’agit pas d’un quota : deux références redondantes ne sont pas retenues pour remplir artificiellement quatre places.

La règle francophone du présent système reste applicable : un ouvrage non admissible comme `citation_francophone` peut demeurer dans la documentation interne, mais n’est pas marqué `retenu_notice`. Son absence de la sélection publique ne diminue pas sa valeur scientifique.

Le nombre de péricopes auxquelles un ouvrage est rattaché, le type d’ouvrage ou la présence de mots communs dans les titres servent seulement de présélection. Ils ne déterminent jamais automatiquement `niveau_precision`. La qualification est faite par lecture bibliographique. `motif_selection` explique brièvement pourquoi une référence a été retenue.

Quand aucune étude directe ou de motif satisfaisante n’est identifiée, cette absence est consignée dans la file de révision ; elle n’est jamais masquée par la multiplication de références générales.


## 29.2 Le nom d’une personne — nom, prénom, pseudonyme

Un nom appartient à quelqu’un, non à chacun de ses livres. Les trois rubriques vivent donc sur la fiche de la personne, dans `auteurs_valeur`, et jamais sur l’ouvrage : les corriger depuis un ouvrage les corrige partout où l’auteur est cité, et une seule fois.

Les trois rubriques sont facultatives. `prenom` et `nom_famille` portent le nom civil d’une personne moderne. `pseudonyme` porte le nom d’usage, celui sous lequel la personne signe et sous lequel on la cite. Voltaire en est un pour François-Marie Arouet.

Le pseudonyme vaut aussi pour tout auteur jusqu’à la fin du Moyen Âge. « Irénée de Lyon », « Augustin d’Hippone », « Césaire d’Arles » ne sont pas des patronymes mais des désignations, faites d’un prénom et d’un siège, d’un lieu ou d’un surnom. On ne leur cherche donc ni nom de famille ni prénom : leur nom entier est le pseudonyme. Les auteurs anciens et les collectifs n’ont pas de fiche dans `auteurs_valeur`, conformément au §29.1, et leur nom reste d’un seul tenant sur leur ligne de contributeur, où `nature_personne` dit déjà ce qu’il est.

L’affichage reste « Prénom Nom », comme avant ces rubriques. Quand un pseudonyme est renseigné, c’est lui qui paraît, et le nom civil demeure pour l’index, le tri et la recherche : on dit Voltaire, on classe à Arouet. La forme de classement met le nom de famille devant, séparé du prénom par une virgule.

⚠️ La colonne `auteurs_valeur.nom` n’est jamais réécrite depuis un écran d’administration. C’est par elle que les notices des ouvrages et les lignes de contributeurs retrouvent la personne, et la réécrire les détacherait. Les rubriques la doublent, et ce qui paraît passe par la composition, qui retombe sur elle tant que les rubriques sont vides.

⛔ Le découpage automatique d’un nom est une PROPOSITION, jamais un verdict. Rien, dans « José Grosdidier de Matons », ne dit à une machine si le nom de famille est « de Matons » ou « Grosdidier de Matons ». Les cas de ce genre sont signalés pour relecture au lieu d’être tranchés en silence. La logique est pure et testée dans `app/lib/nomsPersonnes.ts`.

⛔ Un nom qui ne paraît que dans le texte libre d’une notice, sans fiche ni ligne de contributeur, est SIGNALÉ et non créé. Lui ouvrir une fiche sans note ferait retomber son ouvrage à « à vérifier », le calcul de la base déclassant tout ouvrage dont un auteur scientifique n’est pas évalué. Combler ces trous est un arbitrage éditorial, pas une reprise mécanique.


**Un auteur ancien se désigne par un RENVOI, jamais par une chaîne.** La colonne `ouvrage_contributeurs_scientifiques.auteur_id` renvoie vers `auteurs`, comme `auteur_valeur_id` renvoie vers `auteurs_valeur` pour un chercheur. Les deux registres ne se confondent pas : un chercheur moderne est une AUTORITÉ notée, un Père est une SOURCE, et la base interdit déjà de noter le second. ⚠️ Un renvoi vers `auteurs` NOMME, il n’évalue pas : il n’entre pas dans le calcul de la valeur scientifique, et rattacher une ligne ne change donc aucun statut.

Le besoin s’est vu à la mesure, le 2026-08-24 : sur les 28 auteurs anciens que nomment les notices, 23 existaient déjà dans `auteurs`, en texte libre et sans lien. La dérive avait commencé, trois d’entre eux paraissant sous deux appellations selon l’endroit où on les lit.

**Les NOMS ALTERNATIFS résolvent un nom, ils ne l’affichent pas.** Ils se saisissent séparés par des virgules et se rangent en tableau, sur le modèle de `editeurs.variantes`, qui l’a fait le premier : `auteurs.variantes` pour une source, `auteurs_valeur.aliases` pour un chercheur. « Jérôme » et « Hieronymus » mènent à la fiche de Jérôme de Stridon, dont le nom continue seul de paraître. ⚠️ Rattacher une ligne dont le nom diffère de celui du registre inscrit ce nom parmi les variantes de la fiche : c’est exactement ce qu’est une variante, la forme sous laquelle on rencontre la personne.


## 30. Suivi de l'avancement — le centre de contrôle

Avant d'entreprendre un travail sur le corpus, il faut toujours regarder où nous en sommes. Le centre de contrôle, page d'administration `/admin/controle`, réunit en un seul endroit l'état d'avancement de chaque domaine : corpus et traductions, qualité du texte, catalogue, péricopes, bibliographie, chronologie. Chaque domaine y porte ses chiffres réels, une barre d'avancement, une note de synthèse et la liste des tâches restantes.

Le consulter est la première étape de toute séance de travail. Il montre ce qui progresse, ce qui stagne et ce qui reste à faire, et il évite de rouvrir un chantier déjà traité ou d'en oublier un autre. Les chiffres sont calculés en direct, à l'exception de la qualité du texte, lue sur un cache rafraîchi à la demande.

Les notes et les listes de tâches de cette page sont tenues à jour par l'assistant. Après une avancée notable dans un domaine, il actualise la note correspondante et coche les tâches accomplies, afin que la page reflète toujours l'état véritable du travail. Sources techniques : la fonction `controle_v2_admin_snapshot()` pour l'état du système de contrôle, la fonction `controle_tableau_bord()` pour les chiffres du corpus, la table `controle_sections` pour les notes et les tâches.


### 30.1 Journal des missions

Le centre de contrôle n'est pas seulement consulté au début d'une séance : il tient le journal des missions en cours. Toute personne ou assistance qui travaille sur le corpus, quel que soit l'outil, y inscrit ce qu'elle entreprend et l'y tient à jour.

Au commencement d'une mission, une tâche est ajoutée à la section concernée, et à elle seule. Le modèle de tâche ne connaît que deux états, faite ou non ; la tâche active se signale donc par le préfixe « ⏳ En cours — » suivi de son objet. Plusieurs tâches peuvent porter ce préfixe simultanément dans une même section lorsqu’elles correspondent à des missions distinctes ; une seule tâche active est admise pour une même mission, identifiée par une clé stable.

À chaque passe de travail, cette tâche est actualisée pour refléter l'avancement réel, chiffré lorsque cela a un sens, et la note de synthèse de la section est reprise en conséquence. Les chiffres cités proviennent toujours d'une mesure réelle, par la fonction controle_tableau_bord() ou une requête, jamais d'une estimation.

À l'achèvement, le préfixe est retiré et la tâche est cochée. La page reflète ainsi, à tout instant, ce qui est en cours, ce qui vient d'être fait et ce qui reste. On ne modifie jamais la note ou les tâches d'une section étrangère à son travail.


### 30.2 Ce que montre l'écran principal, et ce qui vit à part

L'écran principal du centre de contrôle dit l'état du système de contrôle, et lui seul : l'état général, le nombre de constats par sévérité au dernier run global, les certifications d'invariants et leur état, la file des postcontrôles de liens avec sa répartition par mission propriétaire, les objets dont le propriétaire est ambigu, la spine AELF, les liens bibliques, enfin l'état et la fraîcheur des diagnostics d'alignement. Tout cela vient d'un seul appel, `controle_v2_admin_snapshot()`, qui est le contrat compact du backend. Ces calculs ne se refont pas dans la page : le contrôle certifie, l'écran affiche.

Les statistiques du corpus, qui agrègent tout en direct et coûtent plusieurs secondes, ont leur propre page, `/admin/controle/statistiques`, avec leurs cartes, leurs notes et leurs listes de tâches. Un lien les rejoint depuis l'écran principal. La raison de ce partage est simple : on ouvre le centre de contrôle pour savoir si l'on peut écrire, et cette réponse ne doit pas attendre le comptage du corpus entier.

Dans ce contrat, une part seulement est calculée à l'appel. La garde vivante, les certifications, la file des liens, les propriétaires, les ambiguïtés et les diagnostics d'alignement sont recalculés à chaque fois ; les métriques générales viennent d'un cache dont le contrat donne l'âge. Le 24 août 2026, une heure après le rerun des quatre livres, le même appel annonçait quatre runs frais et cent soixante-dix-neuf dossiers d'un côté, quatre runs périmés et cent quatre-vingts dossiers de l'autre. Un écran qui mêle les deux sans le dire ment sur l'un des deux. Les totaux des outils d'alignement se refont donc depuis les runs courants, et ce qui reste tiré du cache porte la mention de son âge.

Enfin, le backend n'écrit que les sévérités qu'il a rencontrées : une sévérité absente vaut zéro constat et doit se lire comme telle. La faire disparaître de l'écran le jour où elle vaut zéro reviendrait à ne plus distinguer ce qui a été vérifié de ce qui n'a pas été regardé.


### 30.3 Les diagnostics d'alignement sont en lecture seule

Le système de diagnostic des alignements bibliques ne corrige rien. L'autorité canonique demeure la spine AELF, et les seules écritures du système sont son propre rapport et les décisions humaines qui s'y rattachent. Aucun diagnostic ne modifie un alignement, un texte, un statut philologique ou un lien biblique, et toute proposition philologique se signale pour arbitrage au lieu de s'appliquer.

Un run est frais lorsque l'empreinte qu'il a capturée est celle que le corpus donne aujourd'hui. Un run qui n'a capturé aucune empreinte est périmé, et on ne lui prête jamais l'empreinte courante : ce serait certifier un calcul qu'on n'a pas fait. Le rendre frais demande un vrai rerun, après quoi l'empreinte se capture d'elle-même.

Les décisions humaines sont conservées par ajout seulement. On ne modifie ni ne supprime une revue ancienne pour la rattacher à un nouveau run ; le backend retrouve les décisions antérieures par leur cas équivalent, et l'écran les donne comme un contexte, jamais comme un verdict appliqué au nouveau résultat.

Rejouer un diagnostic se fait avec le pipeline du dépôt, sans toucher aux poids, aux seuils ni aux règles : faire baisser le nombre de dossiers en déplaçant une borne ne corrige rien, cela cache. Chaque rerun se rend avec la comparaison de l'ancien et du nouveau : dossiers ajoutés, dossiers disparus, changements de priorité, et décisions humaines déjà connues.


## 31. Atelier La Gueule — contrôle, correction et validation ciblée

L'atelier La Gueule océrise les imprimés et les manuscrits pour alimenter le corpus. Tout ce qu'il produit est un candidat, jamais une donnée validée. Le fac-similé et la transcription brute de la machine restent immuables : toute intervention agit dans une couche candidate tracée, réversible et exportable. La transcription brute est conservée à côté de l'état éditorial courant, qui est seul lu par les exports.


### 31.1 Contrôle déterministe de toutes les pages et assistance ciblée

Après l’océrisation, chaque page du lot passe par des contrôles locaux et déterministes : confiance faible, lignes vides, doublons, ruptures, pages inutiles, anomalies lexicales et autres signaux disponibles. Ces contrôles couvrent toutes les pages effectivement océrisées.

L’assistance IA ne relit pas indistinctement toutes les pages. Elle reçoit les pages, lignes ou recadrages sélectionnés par les contrôles déterministes, par un échantillonnage de qualité ou par une demande explicite. Elle propose des corrections de texte ou des reclassements de rôle pour les éléments qui ne sont pas du texte d’œuvre. Un sondage peut volontairement lui soumettre des zones non signalées afin de mesurer les erreurs manquées.

Aucune donnée ne part vers un service distant sans consentement enregistré, et aucun secret n’est transmis. Le fait qu’une page n’ait pas été envoyée à l’IA n’empêche pas son contrôle local ni les sondages humains prévus par la charte.

### 31.2 Corrections effectives et réversibles

Une correction acceptée modifie réellement le texte candidat et se retrouve dans tous les exports ; la transcription brute d'origine n'est jamais touchée. Chaque correction conserve son avant, son après, sa provenance, sa date et son statut, et peut être annulée exactement. Une correction n'écrase jamais silencieusement une modification humaine ou une correction plus récente : le conflit est signalé et laissé à l'arbitrage. Une correction acceptée reste un candidat ; le statut de texte formellement vérifié exige une validation humaine explicite, jamais acquise par la seule acceptation d'une règle ou d'un échantillon.

### 31.3 Périmètre de travail

L'avancement de l'océrisation se mesure sur le lot effectivement traité, distinct du document entier. Un lot est terminé lorsque toutes ses pages sont océrisées, en erreur ou volontairement exclues ; les pages du document non incluses dans le lot ne sont pas comptées comme manquantes. L'état du document et l'état du lot sont présentés séparément.

### 31.4 Reclassement des éléments non textuels

Un filet gravé, un bandeau, un titre courant, un numéro de page, une signature de cahier, une réclame ou un simple bruit de reconnaissance peuvent être reclassés hors du corps. La ligne reclassée est écartée du texte exporté, mais conservée dans la source et dans les formats d'échange ; son texte et sa transcription brute ne sont pas supprimés. Le vocabulaire des rôles est unique et partagé avec le reste de l'atelier.

### 31.5 Validation ciblée

L'utilisateur ne valide pas toutes les corrections. Les corrections simples, qui ne changent que quelques caractères — le classique de l'océrisation ancienne —, sont appliquées automatiquement dans la couche candidate, sans intervention. Seuls les cas ambigus lui sont soumis : une réécriture d'ampleur, un reclassement de structure, un cas à risque élevé, ou une famille d'anomalies répétées contrôlée par échantillonnage. Les corrections appliquées automatiquement restent consultables et réversibles, et un contrôle par sondage demeure possible. Le pilotage se fait depuis un seul endroit, où chaque proposition renvoie à la page et à la ligne concernées.

### 31.6 Blocages proportionnés et livraison

Les blocages d'export correspondent à des impossibilités réelles : une page du périmètre restée sans océrisation et non exclue, une page en erreur, un conflit empêchant d'établir le texte, une restitution conjecturale non signalée. Une particularité éditoriale n'est pas un blocage : une page de titre courte, un faux-titre, une page d'ornement ou une fin de chapitre brève sont des avertissements. La livraison indique son état — candidat complet, candidat avec réserves, ou candidat incomplet — et n'affirme jamais une validation humaine qui n'a pas eu lieu.


### 31.7 Couche linguistique post-OCR

Avant tout recours à une passe assistée distante, La Gueule applique une couche locale et déterministe de contrôle linguistique. Cette couche sert à repérer et hiérarchiser les anomalies ; un dictionnaire ou un lexique ne constitue jamais, à lui seul, une preuve de faute et n’autorise aucune modernisation silencieuse. Une forme absente des ressources lexicales reste possible tant que le fac-similé ne l’infirme pas.

Le contrôle lexical combine, selon la langue et la période :

- des lexiques historiques adaptés à l’état de langue, avec priorité à LGeRM pour le français préclassique et classique des XVIe–XVIIe siècles et au DMF pour le moyen français ;
- un lexique morphologique du français moderne, notamment Morphalou, employé comme témoin secondaire et non comme norme rétroactive ;
- des lexiques spécialisés du projet : latin, vocabulaire biblique, théologique et patristique, noms propres, abréviations et formes éditoriales récurrentes ;
- un lexique dynamique propre à chaque ouvrage et, lorsque cela est pertinent, à chaque édition.

Les conditions de licence et de redistribution de chaque ressource sont vérifiées avant son intégration locale. Si une ressource ne peut être embarquée, elle n’est pas copiée illicitement : on lui substitue une ressource réutilisable ou un accès conforme à ses conditions.

### 31.8 Lexique dynamique de l’ouvrage

La Gueule compte les formes rencontrées dans le lot et dans l’ouvrage. Une graphie ancienne récurrente, cohérente et déjà attestée par des lectures sûres voit son niveau de suspicion diminuer. À l’inverse, un hapax très proche d’une forme récurrente peut être signalé comme erreur OCR probable.

La fréquence n’est jamais une preuve suffisante : une erreur systématique du moteur peut elle-même se répéter. Les formes validées humainement ont un poids supérieur aux formes seulement produites par la machine. Le système conserve la provenance et le niveau de confiance de toute entrée ajoutée au lexique dynamique.

### 31.9 Concordance des moteurs et scores de confiance

Conserver, lorsque le moteur les fournit, les scores de confiance au niveau du mot et du caractère. Lorsque Kraken et Tesseract, ou deux configurations OCR indépendantes, sont disponibles sur une même zone, aligner leurs sorties et exploiter leur accord ou leur désaccord comme indice.

Un accord entre moteurs, une confiance élevée et une forme lexicalement ou localement attestée diminuent la suspicion. Un désaccord, une confiance faible, une forme isolée, une proximité forte avec une forme attestée et une confusion OCR connue l’augmentent. Aucun de ces indices ne décide seul d’une correction.

### 31.10 Score de suspicion et recherche de formes proches

Chaque token ou groupe de tokens peut recevoir un score de suspicion explicable, calculé à partir d’indices pondérés :

- présence ou absence dans les lexiques adaptés à la période et à la langue ;
- fréquence dans l’ouvrage et statut des occurrences déjà contrôlées ;
- distance d’édition avec des formes attestées ;
- confusions OCR connues pour le modèle, la fonte ou l’édition ;
- confiance du moteur ;
- désaccord entre moteurs ;
- anomalies de segmentation, de coupure ou de structure.

La recherche de formes proches, par exemple au moyen d’un algorithme de distance d’édition ou de type SymSpell, fournit des candidats et non des corrections. Le score, ses composantes et les candidats proposés doivent rester consultables afin qu’une décision puisse être auditée.

Le routage suit le risque : absence d’anomalie significative, aucune intervention ; erreur fortement convergente et de faible risque, correction automatique dans la seule couche candidate ; ambiguïté réelle, contrôle assisté ciblé ; doute persistant ou enjeu éditorial important, arbitrage humain.

### 31.11 Contrôle assisté ciblé et ré-OCR local

L’assistance IA n’a pas vocation à relire indistinctement tout ce que les contrôles déterministes savent déjà classer. Pour un cas suspect, lui transmettre seulement les éléments utiles : recadrage de l’image, ligne et contexte proche, sortie des moteurs, scores de confiance, formes proches, occurrences comparables dans l’ouvrage et règles éditoriales applicables.

Avant escalade humaine, une zone difficile peut être ré-océrisée localement avec plusieurs prétraitements ou configurations. Ces nouvelles sorties sont des témoins supplémentaires ; elles ne remplacent jamais le fac-similé.

La passe assistée classe au minimum le cas comme `erreur OCR probable`, `forme attestée ou historiquement plausible`, ou `indécidable`. Une proposition qui modernise seulement parce que la forme ancienne est absente d’un dictionnaire moderne doit être rejetée.

### 31.12 Mémoire des erreurs OCR validées

Toute correction acceptée ou refusée alimente un historique structuré distinguant la sortie OCR, la lecture retenue, le moteur, le modèle, la page ou zone, le type de confusion et le niveau de validation. Cet historique sert à mesurer les confusions réelles — par exemple lettres proches, ligatures, `rn/m`, `I/l`, `cl/d`, `s/ſ` — et à améliorer le score de suspicion.

Une confusion apprise n’est promue en règle automatique qu’après un nombre suffisant d’exemples indépendants et des contrôles de faux positifs. L’apprentissage ne doit jamais transformer une correction propre à un livre en règle générale sans preuve.

### 31.13 Plan de mise en œuvre

La mise en œuvre se fait par paliers, chacun devant être testable séparément et réversible :

1. **Instrumentation** : conserver les confiances OCR disponibles, normaliser les sorties et aligner Kraken/Tesseract sur les mêmes zones.
2. **MVP lexical** : intégrer LGeRM pour les imprimés français des XVIe–XVIIe siècles, compléter par les lexiques pertinents et créer le lexique dynamique de l’ouvrage.
3. **Détection** : ajouter recherche de formes proches, fréquence locale, liste des confusions connues et premier score de suspicion explicable.
4. **Routage** : séparer automatiquement les cas sans anomalie, les corrections candidates fortement convergentes, les cas à soumettre à l’IA et les arbitrages humains.
5. **Contrôle ciblé** : fournir à l’IA le recadrage et les indices disponibles ; ajouter si utile un ré-OCR local multi-configuration des seules zones douteuses.
6. **Boucle d’apprentissage** : exploiter les corrections validées pour pondérer les confusions propres aux moteurs, modèles, fontes ou éditions, sans auto-entraînement incontrôlé.
7. **Qualification** : comparer la nouvelle chaîne à un jeu de pages représentatives et à des lots déjà corrigés avant de l’activer par défaut.

Le MVP prioritaire est donc : **LGeRM + lexique dynamique de l’ouvrage + confiance OCR + désaccord Kraken/Tesseract**. Les autres raffinements viennent ensuite, afin de mesurer le gain de chaque couche au lieu de construire immédiatement un système opaque.

### 31.14 Mesure de qualité

L’objectif n’est pas de minimiser artificiellement le nombre de propositions, mais de concentrer la vérification humaine sans augmenter les erreurs résiduelles. Pour chaque évolution, mesurer au minimum :

- la proportion d’erreurs certaines effectivement détectées sur un jeu de référence ;
- le taux de faux positifs, en particulier sur les graphies anciennes légitimes ;
- le nombre de cas envoyés à l’IA ;
- le nombre de cas soumis à l’utilisateur ;
- les erreurs découvertes ensuite par sondage ;
- le temps ou le volume de validation humaine économisé.

Une baisse du nombre de propositions n’est un progrès que si les sondages ne montrent pas une hausse des erreurs manquées. Les seuils sont ajustés sur des corpus représentatifs et restent configurables par période, langue, moteur et qualité matérielle de la source.

## 32. Centralisation des DOCX finaux

Tout DOCX déclaré final, définitif ou validé dans le cadre de Corpus Scriptura est **copié**, après ses contrôles de clôture, dans le dossier `CS - Docx` du Bureau de l’utilisateur. Sur le poste Windows de Sébastien, l’emplacement courant est `D:\OneDrive\Bureau\CS - Docx`.

Cette opération est une copie et jamais un déplacement : le fichier source demeure intact à son emplacement de production ou d’archive. Avant la copie, distinguer l’état final courant des candidats, brouillons, intermédiaires, rendus de contrôle, extractions d’archives et versions finales désormais remplacées. Lorsqu’un même document existe à plusieurs emplacements avec la même empreinte, une seule copie est conservée dans `CS - Docx`.

Après la copie, vérifier l’égalité SHA-256 entre la source retenue et la copie. Le dossier `CS - Docx` constitue un accès pratique aux livrables Word finaux ; il ne remplace ni les archives de preuve, ni les sources autoritatives, ni les scripts de retour arrière.


## 33. Longueur d’une œuvre et opuscules

### 33.1 Mesure

La longueur d’une œuvre se lit dans `nb_signes`. Ce compte porte sur tous les segments d’une version, quelle que soit leur nature. Le réduire aux seuls segments de nature `texte` fausse toute œuvre dont le corps est porté par une autre nature, notamment un prosimètre relevant de `dialogue` et `vers`, ou un commentaire dont le lemme biblique relève de `citation`.

`oeuvre_textes.nb_signes` mesure une version. `oeuvres.nb_signes` reprend la version marquée par défaut, jamais la somme des versions : additionner une traduction et son texte original doublerait une œuvre qui se lit une fois. Une œuvre dont aucune version n’est marquée par défaut n’a pas de source de mesure et reste figée ; le marquage par défaut est donc obligatoire.

La mesure est recalculée sur demande, après un import ou une correction de corpus, par `recalculer_nb_signes()`. Elle n’est pas tenue par un déclencheur sur les segments : les imports écrivent par lots, et un recalcul par ligne y coûterait davantage qu’il ne rapporte.

### 33.2 Opuscules

Une œuvre dont la longueur est inférieure au seuil d’opuscule est un texte bref. La bibliothèque replie les textes brefs d’un auteur dans une section rétractée, sous ses œuvres longues.

Le seuil se justifie par le corpus et non par une idée de la longueur : il se place dans un intervalle vide du classement des œuvres publiées. Il ne se place jamais sur la médiane, qui rangerait une œuvre sur deux parmi les opuscules et couperait des séries éditoriales cohérentes.

Le repli exige deux conditions : un nombre minimal d’opuscules, et au moins une œuvre longue. Sans la seconde, l’étagère d’un auteur qui n’a que des textes brefs serait repliée tout entière et paraîtrait vide.

Le classement porte sur le groupe de titre et retient sa version la plus longue : une édition partiellement intégrée ne doit pas quitter son titre pour rejoindre les opuscules. Une œuvre non mesurée n’est jamais repliée. Une recherche qui atteint un opuscule déplie la section.

La liste chronologique de la fiche auteur n’est pas concernée : elle catalogue l’œuvre entière dans son ordre de composition, et un tri par taille en romprait le principe d’ordre.

## 34. La marque du site

Le site a une marque : un C gothique enlaçant un S, la haste du S portant une croix. Elle existe en deux planches, dont tout le reste se fabrique.

La planche carrée, crème sur aplat vert, est l’icône : onglet, favori, écran d’accueil, raccourci de lancement. Elle ne se détoure pas, et c’est délibéré : à seize pixels, c’est l’aplat qui donne la silhouette, et une marque transparente s’y perdrait sur le fond du navigateur.

La planche du monogramme seul est le logo. Son détourage ne sert que la couche de transparence : la couleur, on la repose. Le monogramme prend donc l’encre du titre là où il paraît sur le papier, et le crème là où il paraît sur la barre verte. L’encre de la planche est un noir franc qui jurerait avec le vert d’encre des lettres.

⛔ **« On la repose » se prend au pied de la lettre : la planche est posée en MASQUE, et c’est le fond de l’élément qui peint.** Le frontispice de l’accueil superposait deux planches, l’une en vert d’encre pour le Clair, l’autre en crème pour le Cuir, le thème n’en montrant qu’une — pour éviter qu’un choix en JavaScript ne la fasse paraître après la peinture. Leurs canaux alpha sont rigoureusement identiques, vérifié pixel à pixel, aucun écart : une seule suffit donc, et la couleur devient une valeur qu’on règle au lieu d’une image qu’il faut redessiner. Le Cuir garde exactement sa teinte, écrite en valeur littérale, et l’on économise une requête. ⚠️ Ce qui vaut pour le frontispice ne vaut pas pour la barre de navigation, où la planche crème reste une image : elle y est peinte sur un aplat vert, et non sur le papier.

⚠️ **L’encre du monogramme se tient UN CRAN au-dessus de celle du titre qu’il surmonte.** Elle valait exactement la même — le noir vert le plus sombre de la palette —, et le trait d’une lettre ornée étant plus épais que celui d’un titre, la marque pesait davantage que ce qu’elle annonce. Un cran plus doux la remet à sa place d’enseigne.

⛔ **La marque ne paraît plus en tête de l’accueil (27 août 2026, décision de l’auteur).** Le frontispice la portait au-dessus du titre ; elle en est retirée, et il ne lui reste qu’une pose, la barre de navigation. La raison n’est pas le dessin mais la RÉPÉTITION : la barre paraît sur toutes les pages, celle-là comprise, et la marque redite quarante pixels plus bas n’ajoutait qu’une masse, laquelle poussait au second rang le titre, qui est l’enseigne véritable. Le frontispice tient donc en trois temps : le nom, un filet gravé, la devise. Le titre monte d’un cran et le blanc au-dessus de lui avec, une page de titre respirant au-dessus de son premier mot. ⚠️ Les deux paragraphes qui précèdent décrivent une pose qui n’existe plus. Ce qu’ils disent du masque vaut toujours, mais pour la barre seule, où la planche crème reste une image peinte sur un aplat vert ; la planche d’encre n’est plus appelée par aucune page et passe en réserve, sans quitter le dépôt. Le paragraphe qui donne la marque lacée entre « Corpus » et « Scriptura », lui, décrit un essai écarté dès le 19 août 2026 : il n’a plus d’objet.

⛔ **La page d’accueil se mesure à UNE SEULE justification.** Les trois cartes tenaient dans une mesure, les deux volets et le bandeau de chiffres dans une autre, plus large d’un huitième : sur un grand écran, le bloc par où l’on entre dans le site était le plus étroit de la page, en retrait de cent vingt pixels de chaque côté sur ceux qui le suivent, et la colonne dessinait un sablier. Les trois blocs partagent désormais la même largeur, tenue en un seul endroit : la changer les déplace tous ensemble, et l’on ne la redonne jamais bloc par bloc. ⚠️ Ce qui vaut pour la largeur ne vaut pas pour les SEUILS : un volet de prose devient illisible bien avant qu’une tuile de chiffre ne manque de place, et les deux se replient donc à des largeurs différentes. Fondre leurs seuils, c’est ouvrir deux colonnes de trois cent soixante pixels pour y loger un nombre à deux chiffres.

⛔ **L’interligne du texte de l’accueil est RESSERRÉ** (décision de l’auteur, 27 août 2026). Le colophon composait sa prose à 1,75, soit le double de la hauteur d’œil du sérif à ce corps : les paragraphes s’y délitaient en lignes indépendantes, et l’on ne lisait plus un bloc mais une suite de lignes. Il passe à 1,55, le mot de l’auteur à 1,38, et la pyramide finale de 2,1 à 1,85 : elle garde un interligne plus large que la prose, ses lignes se lisant chacune pour elle-même, mais elle ne pouvait pas rester deux fois plus aérée que le texte qu’elle ferme. ⚠️ Seul l’interligne bouge. Ni le corps, ni l’encre, ni le blanc entre les sections, sans quoi l’on ne saurait plus ce qui a produit l’effet.

⛔ **Un fleuron ne s’annonce pas au-dessus d’un titre, il le ferme.** Le colophon ouvrait sur un ❧ posé au-dessus de « Le projet », qu’un second fleuron à filets fermait trois lignes plus bas : deux ornements pour un seul titre, et le premier butait devant le nom de la section avant qu’on sache de quoi il retourne. Le premier est retiré, celui qui SUIT le titre demeure, comme sous chaque section. C’est la règle déjà écrite pour les gravures, appliquée aux fleurons.

**Un CHIFFRE ferme la page d’accueil, et ce n’est pas le monogramme.** Sous le colophon — « en l’An de grâce MMXXVI » — se tenait le fleuron ❧. C’était un CARACTÈRE : son dessin dépendait de la police que le système voulait bien lui donner, il changeait d’une machine à l’autre, et il ne disait rien du site. À sa place vient le chiffre de Corpus Scriptura : le C et le S entrelacés, en capitales didones, gravés pour lui. ⚠️ Ce chiffre n’est PAS le monogramme du frontispice — celui-là est une lettrine gothique, celui-ci une capitale moderne. Deux dessins, deux emplois, deux fichiers, et l’on ne substitue pas l’un à l’autre. Il garde l’or que portait le fleuron : seul le dessin change.

⚠️ **Une planche livrée sur papier photographié se DÉTOURE en alpha avant d’entrer.** Le grain du papier court entre 225 et 250 de luminance : un seuil unique l’aurait gardé en entier ou mangé les bords adoucis du dessin. Le seuillage est donc une RAMPE — opaque en deçà de 96, transparent au-delà de 200, dégradé entre les deux —, le dessin est ensuite rogné à sa boîte et réduit. La planche ne sert alors que d’alpha, comme le monogramme, et prend la couleur qu’on lui donne.

⚠️ **Un ornement gardé EN RÉSERVE se recense comme les autres.** Deux fleurons — une fleur de lys, un brin de lavande — sont entrés le même jour sans qu’aucune page les appelle. Ils figurent au recensement des illustrations sous « En réserve » : une image qui dort dans le dépôt pèse dans le dépôt, et le jour où l’on s’en servira, on saura d’où elle vient.

⚠️ **Les deux lignes qui suivent le titre du frontispice tiennent le MÊME TON, à un pas d’écart.** La devise — « Lectures bibliques et patristiques » — porte le vert d’accent ; la mention qui la suit — « Somme collaborative » — portait `--cs-etiquette`, un khaki doré. Deux familles de couleur étrangères l’une à l’autre, empilées à trois lignes d’intervalle : le couple sonnait faux. ⛔ La forme d’étiquette ne commande pas le jeton d’étiquette.

⚠️ **Le pas se prend en MÊLANT l’accent au papier, jamais en écrivant une valeur.** Au Cuir, où le vert d’accent vire à l’or et le papier au brun, le même calcul rend le même rapport ; une valeur écrite aurait tenu au Clair et détonné au sombre. Et la quantité d’accent se règle pour que la ligne garde EXACTEMENT le poids qu’elle avait : on change sa famille, non sa place dans la hiérarchie.

Sur la page de titre, la marque se lace entre « Corpus » et « Scriptura », sur leur ligne, où elle se lit comme une initiale ornée. Elle ne se pose plus au-dessus du bandeau gravé, en vignette séparée. Sa hauteur se mesure en em, puisqu’elle vit dans le titre, et son calage vertical la centre sur la bande des capitales : posée sur la ligne d’écriture, une marque plus haute que les capitales surplomberait le mot de toute sa différence.

### 34.1. Le logo « CS » (19 août 2026)

L’auteur du site a arrêté un logo : un carré noir portant les capitales « CS » en linéale grasse, dans un vert d’encre (#3D6F4A), avec un bandeau du même vert qui court en marge. Le bandeau prend le bord même, sans marge noire derrière lui : une bande de 18/512e, et les lettres, larges de 80/100e du carré, exactement centrées. Deux essais écartés : un filet de 7/512e au ras du bord, trop mince pour se lire ; puis une marge noire de 22/512e posée derrière la bande, qui la détachait du carré sans rien y gagner. Il est vectorisé — `public/logo-corpus-scriptura.svg`, soixante-trois courbes pour trois kilo-octets, tracées depuis le PNG d’origine — avec une variante sans fond, `public/logo-corpus-scriptura-mono.svg`.

Ce logo est désormais l’icône du site : `app/favicon.ico`, `app/icon.png` et `app/apple-icon.png` en sont tirés. À seize pixels, le dessin s’inverse : l’aplat devient vert et les lettres se creusent en noir. À cette taille le bandeau ne vaudrait qu’un demi-pixel, et des lettres vertes sur noir se noient dans un onglet — c’est l’aplat qui donne la silhouette. Dès trente-deux pixels, le dessin normal tient et le bandeau se lit. Le même dessin sert d’icône au raccourci de bureau qui lance le serveur de développement (`public/corpus-scriptura.ico`, `demarrer-serveur.bat`).

Le monogramme gothique décrit au §34 reste en place sur la page de titre : la substitution n’a pas été demandée.

### 34.2. La marque de la citation favorite (22 août 2026)

Le Sacré-Cœur qui désignait la citation favorite est retiré. Il vivait en deux exemplaires qui ne se ressemblaient même pas : une vignette posée en tête de « Mes citations », et un dessin à quatre pièces, croix, flamme, couronne d’épines et cœur, dans la gouttière d’actions. À treize pixels les quatre pièces se confondaient en une tache, et à vingt-six la vignette se crénelait. Deux dessins pour un seul office, aucun des deux lisible.

À sa place vient une marque unique, le quadrilobe, la rosace à quatre lobes du remplage gothique. Elle se trace d’un seul trait de quatre arcs, sans une courbe à régler, et sa symétrie la rend nette à quinze pixels comme à quarante. Elle appartient à la grammaire ornementale du site plutôt qu’à un jeu de pictogrammes.

Elle ne se confond avec aucune autre marque, et c’est le critère qui l’a choisie. L’étoile dit « favori » partout ailleurs, sur les œuvres comme sur les versets, et le cœur disait « aimé ». Le quadrilobe dit « choisi ». Une même marque pour deux gestes distincts promet au lecteur une action qu’elle ne fait pas. C’est pourquoi l’étoile qui coiffait la citation favorite du profil public a cédé la place à celle de « Mes citations ».

Un seul tracé sert les deux emplois, l’emblème du filet en tête de page et le bouton de choix dans la liste. La marque du titre est le bouton que l’on ira chercher, et c’est ce qui enseigne le geste sans une ligne de mode d’emploi. Sa taille suit sa place : quinze pixels dans la gouttière, où la discrétion est de mise, vingt-deux dans le filet, où elle est l’enseigne. Sous vingt pixels les lobes s’aplatissent et la marque se lit en losange, ce qui convient à un bouton et non à un emblème. Deux géométries à lobes plus creusés ont été essayées puis écartées : elles gagnent un peu de netteté aux petites tailles, mais leurs entailles font virer la marque à la croix dès qu’elle grandit. L’ampleur des lobes vaut mieux que leur profondeur.

Remplacer la citation favorite se demande. On n’en porte qu’une à la fois, et c’est elle qui paraît sur le profil public : un clic défaisait jusqu’ici un choix sans rien dire. Désigner la première citation ne demande donc rien, et reprendre celle que l’on porte la retire sans rien demander non plus. Mais en désigner une autre quand la place est occupée ouvre une fenêtre qui met les deux citations en regard, l’ancienne et la nouvelle, avant de trancher.


## 35. Chantier Fillion — charte ortho-typographique, structure et méthode (mise à jour 28 août 2026)

### 35.0. Charte ortho-typographique Fillion — synthèse normative

Cette synthèse est la porte d’entrée normative du chantier Fillion. Elle hérite de la typographie générale du § 3 et des règles d’appels de note du § 13 ; les paragraphes suivants ne créent des dérogations que lorsqu’elles sont explicitement signalées. La couche source ou diplomatique reste toujours distincte et inchangée ; les normalisations concernent la couche éditoriale de lecture et ses projections.

**1. Espaces et caractères.** Dans la couche éditoriale Fillion : `U+00A0` avant `:` ; `U+202F` avant `; ! ?` ; `U+202F` après `«` et avant `»` ; aucune espace avant virgule, point ou points de suspension ; apostrophe typographique `’` (`U+2019`) ; points de suspension `…`. Les doubles espaces accidentelles sont réduites ; aucune espace n’est conservée immédiatement à l’intérieur des parenthèses. Les sauts de ligne intentionnels et séparateurs attestés par la source sont conservés.

**2. Guillemets, citations et appels de note.** Les guillemets français appartiennent à la phrase française et restent en romain, même lorsqu’ils encadrent une langue étrangère : `« *Jesu Christi* »`. L’appel de note suit immédiatement le passage annoté, reste à l’intérieur du guillemet fermant et précède la ponctuation conformément au § 13.4. La ponctuation des citations suit le § 3.8 ; elle n’est jamais déplacée au rendu. Lorsqu’un lemme fermé par `»` est suivi d’une nouvelle phrase explicative, la ponctuation nécessaire après le guillemet est rétablie : `« *…* ». C’est…`.

**3. Langues étrangères et italiques.** Les termes, locutions, lemmes et citations en latin ainsi que les translittérations de langues anciennes se composent en italique. Le grec écrit en caractères grecs reste en romain, conformément au § 3.6 ; seules les translittérations grecques en alphabet latin se composent en italique. Les guillemets français et la ponctuation française qui encadrent ces passages restent en romain. Les noms propres étrangers restent en romain. La couche source demeure inchangée.

**4. Casse, titres et petites capitales.** Les titres éditoriaux suivent la casse française du § 3.5, sous réserve des décisions structurelles propres à Fillion ; la formulation imprimée est conservée dans `facsimile_heading`, `source_markup` ou une provenance équivalente. Aucun titre biblique n’est composé en petites capitales. Les petites capitales attestées ou sémantiques des noms d’auteurs dans une bibliographie sont en revanche conservées ; elles ne doivent jamais être simulées par une transformation de casse.

**5. Paragraphes.** Aucun tiret artificiel n’est ajouté devant les paragraphes et aucun `::before` ne doit en recréer. Les paragraphes restent distincts, séparés par le blanc prévu par le rendu ; ils ne sont pas concaténés en une ligne continue. Une rupture de page ou de ligne matérielle ne crée pas à elle seule un paragraphe.

**Transitions de lemme dans le commentaire.** Dans le commentaire de Fillion, lorsqu’un nouveau lemme ouvre une nouvelle unité d’explication, le tiret long imprimé qui sert de séparateur n’est pas reproduit comme signe de ponctuation dans la couche éditoriale de lecture : chaque reprise de lemme ouvre un paragraphe distinct. Les tirets qui appartiennent réellement à la syntaxe d’une phrase ou d’une incise restent conservés. Cette séparation est portée par les sous-blocs éditoriaux (`editorial_normalization.blocks`) et non fabriquée par CSS ou par une expression régulière au rendu.

**6. Désabréviation.** Dans la lecture éditoriale, développer les abréviations certaines et utiles à la lecture : `l’hébr.` → `l’hébreu`, `Comp.` → `Comparer`, `h. l.` → `à cet endroit`, `c.-à-d.` → `c’est-à-dire`, `ss.` → `suivants` ou `suivantes` selon le contexte, `etc.` → `et cetera`. `cf.` reste distinct de `Comp.` : il ne devient jamais `Comparer` et se compose en italique conformément au § 3.6. Toute abréviation ambiguë demeure en `review`. La forme imprimée reste conservée dans la couche source.

**7. Références bibliques.** Les références de la couche éditoriale utilisent les abréviations françaises catholiques normatives du § 3.5.1, sauf lorsque le nom du livre est volontairement écrit en toutes lettres. Les chapitres bibliques sont en chiffres arabes. Un renvoi interne dépourvu de nom de livre reçoit le livre courant seulement lorsque ce contexte est certain : `*cf.* xv, 2` → `*cf.* Mt 15, 2`. Ne jamais convertir mécaniquement les chiffres romains d’une référence bibliographique. Toute référence biblique modernisée est contrôlée contre le canon ; une référence impossible reste en `review` tant que le témoin et le contexte ne permettent pas une correction certaine.

**8. Bibliographie.** Une note déclarée `bibliographie` se compose comme une liste : annonce conservée, une référence par ligne, corps un cran inférieur, retrait de première ligne et blancs légers ; aucun tiret, aucune puce, boîte ou bordure ne s’imprime. Les titres d’œuvres sont composés selon le § 3.5 et en italique lorsqu’ils sont individualisés. Les noms d’auteurs suivent la forme d’autorité et les petites capitales prévues par la donnée. Une forme d’autorité telle que `van Steenkiste` peut recevoir dans la donnée d’affichage la capitale initiale `Van Steenkiste` lorsqu’elle ouvre un item ; le rendu ne modifie pas la casse par heuristique.

**9. Renvois internes.** Une pagination devenue inutile lorsqu’elle ne renvoie qu’à une structure interne du texte numérique est retirée de la couche éditoriale : `voyez l’introduction`, non `voyez l’introduction, p. 18`. Une pagination qui désigne une autre ressource imprimée reste pertinente et se conserve. Aucun numéro de page ou lien interne ne doit être inventé ni codé en dur.

**10. OCR et corrections.** Ne corriger automatiquement que les anomalies univoques. Ne jamais moderniser la langue, combler une lacune par conjecture ni remplacer silencieusement une forme imprimée douteuse. Les corrections de sens, références impossibles, accords suspects et lectures OCR ambiguës exigent le fac-similé ou une preuve équivalente ; faute de preuve, conserver la réserve en `review`. La lecture directe reste obligatoire après les passes mécaniques.

**11. Stockage, projections et rendu.** Les normalisations éditoriales doivent être portées dans les données de lecture Fillion et rester cohérentes dans toutes leurs projections (`reading_text`, sous-blocs, titres, notes, chapeaux). Le rendu est un garde-fou idempotent et obéit aux métadonnées de présentation ; il ne déduit pas les styles par regex et n’applique pas de CSS global susceptible d’altérer les autres œuvres. Le témoin source n’est jamais réécrit pour satisfaire l’interface.

**12. Autorité et résolution des conflits.** Pour Fillion, le présent § 35.0 résume les règles ortho-typographiques applicables et tranche les formulations plus anciennes incompatibles à l’intérieur du § 35. Le § 3 demeure l’autorité générale pour tout point non dérogé ; le § 13 gouverne les notes et appels. Les §§ 35.1 et suivants conservent les règles détaillées de structure, présentation et méthode et doivent être lus en cohérence avec cette synthèse.

### 35.1. Chapitres bibliques redondants

Les mentions imprimées `Chapitre I`, `Chapitre II`, etc. sont conservées dans la couche source comme témoins matériels de l’édition Fillion, mais ne sont pas affichées dans le lecteur Corpus Scriptura lorsque le chapitre biblique est déjà indiqué par la navigation de la Bible. Elles ne constituent pas un niveau analytique du commentaire et ne doivent jamais devenir le parent des subdivisions `1°`, `2°`, `3°`, etc.

### 35.2. Désabréviation de l’hébreu

Dans la couche éditoriale normalisée de Fillion, `l’hébr.` devient `l’hébreu` et `Hébr.` devient `hébreu`. La transcription diplomatique demeure inchangée. Cette règle vaut pour le commentaire, les introductions et les notes.

### 35.3. Double lemme latin / français

Le commentaire de Fillion part très souvent d’un lemme latin de la Vulgate. Pour que le commentaire soit également intelligible depuis la traduction française Fillion, chaque lemme latin identifiable reçoit, lorsque la correspondance est certaine, un lemme français associé tiré exactement de la traduction française Fillion du même verset. On ne retraduit jamais le latin par la machine.

Le lemme latin reste le témoin historique et se compose en italique, entre guillemets français romains lorsqu’il s’agit d’une citation. Lorsqu’une partie du texte cité est éludée, l’omission est signalée par `[…]`, jamais par `…` ni par `...` : `« *Fili David […] Abraham* »`. Les points de suspension véritables qui appartiennent au discours et ne marquent pas une omission conservent naturellement le caractère `…`. Le lemme français se compose en romain. Les deux lemmes sont stockés séparément dans les métadonnées du commentaire avec leur ancre biblique et leur statut de correspondance. Si la correspondance n’est pas certaine, on conserve seulement le lemme latin et on soumet l’ambiguïté à révision ; on ne fabrique pas de lemme français. Un commentaire général portant sur tout un verset ou un groupe de versets ne reçoit pas artificiellement de double lemme.

### 35.3.1. Paragraphes du commentaire et transitions de lemme

Dans le commentaire de Fillion, le tiret long imprimé sert fréquemment à séparer deux unités successives d’explication. Dans la couche éditoriale de lecture, ce séparateur n’est pas reproduit comme ponctuation : chaque nouvelle unité, notamment chaque reprise de lemme latin ou grec, ouvre un paragraphe distinct. La règle vaut même lorsque l’unité suivante commence par une phrase explicative plutôt que par un lemme formel. Les tirets qui appartiennent réellement à la syntaxe d’une phrase, à une incise ou à une citation sont conservés. La séparation est matérialisée dans `editorial_normalization.blocks`, jamais par CSS, pseudo-élément ou expression régulière au rendu. La couche source ou diplomatique demeure inchangée. Matthieu constitue le modèle de composition pour cette règle.

### 35.4. La présentation vient de la donnée, jamais d’une forme reconnue au passage

Un bloc éditorial et un bloc de note peuvent déclarer comment ils se composent, et le rendu lit cette déclaration sans en sortir : `display_role` pour le rôle d’affichage d’un bloc entier, `leading_paragraph_style` pour le style imposé à son premier paragraphe, `style` pour le genre d’un bloc de note. ⛔ Aucun de ces styles ne se devine à la forme du texte. Sans la métadonnée, le paragraphe se compose comme les autres, et une expression régulière ne supplée jamais une déclaration absente.

Le vocabulaire est clos, et une valeur inconnue est ignorée au lieu d’être appliquée. `text_alignment` en particulier ne se reprend pas tel quel : porté par des blocs dont le corps est de la prose justifiée, il centrerait des paragraphes entiers. Seul le rôle d’affichage décide, et lui seul emporte son alignement.

Deux rôles sont arrêtés. Le sous-titre d’une partie n’est pas un préambule mais le chapeau de son titre, tombé dans un bloc voisin par l’ordre matériel : il se centre sous lui, garde son italique, et il n’ouvre aucun niveau au sommaire. ⛔ Il prend l’ENCRE DE SON TITRE, non celle du texte second : une encre plus claire en faisait un commentaire du titre, quand il en est la suite. ⚠️ Et le blanc qui les sépare se chiffre — mesuré avant reprise, douze pixels entre les deux boîtes et trente-cinq entre les lignes de base, de quoi lire deux choses là où il n’y en a qu’une. Le titre rend donc sa marge basse à qui le suit : il reste trois pixels, vingt-six entre les lignes de base. Le blanc ordinaire revient après le sous-titre, non entre eux. Les renvois bibliques posés sous un repère de commentaire prennent la famille typographique de ce repère, un cran plus petit, d’une encre discrète, collés au repère et non flottant entre lui et le texte ; ⛔ ni boîte, ni fond, ni bordure, ni pictogramme, et les italiques internes sont conservées. Un renvoi ponctuel qui précise une phrase reste dans sa phrase, entre parenthèses, et ne devient jamais un bloc de renvois.

Un bloc sans corps ne rend aucun paragraphe. L’axe `title` impose un corps vide, et le paragraphe fantôme que ces blocs produisaient posait un blanc sous chaque titre, qui séparait « Première partie » de son sous-titre.

### 35.4.1. Longues introductions, notes et continuité de lecture

Le style sémantique `introduction` est réservé aux préambules brefs qui se tiennent réellement à l’écart du fil. Lorsqu’une introduction de livre est longue et structurée en subdivisions, le bloc racine et son titre conservent leur fonction d’« Introduction », mais les développements placés sous les sous-titres se composent comme de la prose normale : romain, justification ordinaire, mesure normale de la colonne, sans centrage ni retrait bilatéral propre aux préambules. Dans la donnée, ces développements prennent un style de prose/commentaire du niveau correspondant (`commentaire_section` ou équivalent) ; ⛔ ils ne restent pas `introduction_section` ou `introduction_sous_section` par le seul fait qu’ils appartiennent matériellement à une introduction.

Une note de bas de page appartenant à une longue introduction suit la même logique : son contenu courant se compose comme une note normale en prose, romaine et justifiée. ⛔ L’appartenance à une introduction ne lui confère jamais le style typographique `introduction`. Exemple : « Nous avons touché plus haut, page 11-12, à la question d’authenticité. Voyez aussi notre grand commentaire, page 4-7. » est une note appelée et non un paragraphe d’introduction.

Toute note imprimée doit, lorsqu’un appel est attesté, être rendue par un véritable appel de note à son emplacement exact dans le corps ou dans le titre, puis ouverte par le mécanisme normal de note. Une note dont l’appel est résolu ne doit jamais être répétée dans un apparat flottant ou rejetée en bloc sous le titre. Si l’appel exact n’est pas établi, la note reste explicitement en `review` et aucune ancre n’est inventée. Après toute normalisation d’un titre ou d’un libellé susceptible de porter un appel — casse, `INTRODUCTION` → `Introduction`, `1°` → `1.`, ponctuation ou autre forme éditoriale — les `anchor_text` et ancres de titre doivent être révalidés et, si nécessaire, resynchronisés dans la même passe. Une correction de titre n’est pas close tant que tous les appels qui y sont attachés se résolvent encore.

La couche de lecture ne reproduit pas les blancs du fac-similé, les fins de ligne OCR, les doubles retours de transcription, les changements de page ni les limites de blocs matériels lorsqu’ils ne correspondent pas à une vraie frontière de paragraphe. Une phrase ou un paragraphe qui traverse une page ou une unité source reste continu à l’affichage. Les paragraphes réels sont matérialisés par des blocs éditoriaux distincts ; ⛔ on ne crée ni paragraphe vide, ni bloc fantôme, ni saut de ligne interne pour fabriquer un blanc. Les retours de ligne hérités de l’OCR sont supprimés de `reading_text` ; la transcription source demeure inchangée.

Pour une longue introduction déjà structurée dans une seule unité de lecture, la projection recommandée est un **conteneur de titre sans corps** suivi d’un **corps continu en prose normale** qui conserve ses titres internes et ses vrais paragraphes. Cette projection évite de laisser tout le développement sous le style `introduction_livre`, mais elle évite aussi de créer artificiellement un couple bloc-titre / bloc-corps pour chaque subdivision : cette dernière solution cumulerait les marges du titre T4 et du bloc d’information suivant et recréerait un blanc excessif avant chaque paragraphe. Le corps continu peut donc conserver ses titres T4 comme sous-blocs structurés dans `editorial_normalization.blocks`, tandis que le conteneur racine ne porte que le titre de la pièce et ses éventuels appels. Le témoin source complet reste conservé dans son unité originale ; le conteneur d’affichage peut pointer vers une unité dérivée vide. Les notes sont rattachées à la surface qui les rend réellement : note de titre sur le conteneur, notes internes sur le corps continu.

Contrôle obligatoire après toute reprise d’une longue introduction : vérifier que les paragraphes rendus et les blocs de notes ne contiennent aucun retour de ligne ou blanc artificiel ; que tous les appels attendus sont résolus ; qu’aucune note appelée ne subsiste dans l’apparat résiduel ; et que les titres, notes et développements s’enchaînent sans blanc vertical produit par un bloc vide, une ancre périmée ou une frontière matérielle. Ces contrôles portent sur la couche de lecture et ne justifient jamais la réécriture de la transcription source.

### 35.5. Deux axes de hiérarchie, et ils ne se confondent pas

Fillion superpose l’analyse de l’auteur, partie, section, § I, § II, puis 1°, 2°, 3°, et la matière du livre imprimé, chapitre I, chapitre II. La seconde traverse la première : sous le § II, le 1° précède le chapitre II et le 2° le suit. Ce n’est pas une faute de la source, c’est sa manière, et l’ordre imprimé se préserve sans jamais réordonner les titres.

Un titre porté par l’axe matériel ne commande donc pas l’axe analytique : il ne devient le parent d’aucun titre qui le suit. ⚠️ La règle vaut même quand la mention n’est pas affichée, ce qui est le cas des chapitres au § 35.1 : c’est la PLACE matérielle qui traverse les subdivisions, non son intitulé. La masquer sans la retirer de l’axe laisserait le 2° remonter sous le 1°.

⛔ L’axe vient du REGISTRE, qui le donne au style, et la présentation d’un bloc ne fait que le confirmer ou l’infléchir. Le tirer de la seule métadonnée aurait appliqué la règle à cinq titres de chapitre sur cent dix-sept, c’est-à-dire à un cinquième d’un livre : les cent douze autres auraient gardé leur mention à l’écran et adopté les subdivisions qui les suivent.

Et le parent ne se déduit jamais du seul rang du jeton : quand la donnée nomme son parent par `semantic_parent_key`, c’est ce nom qui fait foi, et la profondeur reprend l’état où ce parent l’a laissée. ⛔ Ce qui ne se rend pas n’entre pas au plan : une entrée de sommaire pointant vers une mention masquée serait une ancre sans cible.

### 35.5.1. Liminaires Fillion : casse, repères analytiques et références de portée

Dans la couche éditoriale Fillion, les têtes liminaires qui donnent le nom du livre ou la mention d’introduction se composent en casse française, jamais en capitales intégrales héritées du fac-similé : `ÉVANGILE SELON SAINT LUC` → `Évangile selon saint Luc` ; `INTRODUCTION` → `Introduction`. La forme imprimée demeure conservée dans `facsimile_heading` ou une provenance équivalente.

Le numéro imprimé ne suffit jamais, à lui seul, à créer un niveau de titre. Toutefois, une série continue de repères `1°`, `2°`, `3°`, etc. placés chacun en tête de paragraphes distincts constitue un indice structurel positif lorsqu’elle est confirmée par le contexte du témoin — notamment lorsqu’un niveau interne emploie une autre forme (`1.`, `2.`) et que les énumérations `1°`, `2°`, etc. qui ne sont pas structurelles restent inline dans un même paragraphe. Dans ce cas, tous les membres de la série appartiennent au même niveau analytique, même si certains commencent par une phrase complète plutôt que par un intitulé nominal. Les vrais headings de cette série sont normalisés à l’affichage sous la forme `1.`, `2.`, `3.`, etc.

**Règle systématique des ordinaux numériques Fillion.** Dans toute la couche éditoriale de lecture, un repère ordinal numérique imprimé sous la forme `1°`, `2°`, `3°`, etc. se rend toujours `1.`, `2.`, `3.`, etc., qu’il soit titre, début de paragraphe, élément d’une énumération inline ou renvoi à une subdivision. ⛔ Le signe `°` ne paraît jamais comme marqueur ordinal dans l’interface. La forme imprimée demeure dans le témoin source ou sa provenance. Cette règle ne concerne pas le véritable signe de degré ni les formats bibliographiques tels que `in-4°`.

**Ultime niveau numérique.** Lorsqu’un niveau numéroté possède lui-même des sous-divisions numériques et qu’aucun intitulé autonome n’impose un autre système, le niveau le plus profond se rend en numérotation décimale hiérarchique : sous `1.` viennent `1.1`, `1.2`, `1.3` ; sous `2.` viennent `2.1`, `2.2`, `2.3`, etc. Cette convention sert uniquement à distinguer visuellement deux profondeurs numériques successives dans la couche éditoriale ; la forme imprimée demeure conservée dans le témoin source ou sa provenance.

Aucune rubrique courte ne doit être inventée pour rendre la série régulière. Lorsque le témoin fournit un libellé autonome ou une ponctuation de titre, ce libellé est repris. Lorsqu’une division de même niveau commence directement par une phrase et qu’aucun titre abrégé n’est attesté, le libellé éditorial reprend mot pour mot la première phrase — ou, si le témoin marque clairement une césure interne, la proposition initiale — et le reste demeure en prose. Les sous-points (`1.`, `2.`) et les énumérations inline ne sont jamais promus pour compléter artificiellement une hiérarchie. Toute scission conserve exactement les empans du témoin source et n’altère pas `text_content`.

Lorsqu’un titre ou un chapeau analytique est suivi d’une référence biblique qui en définit la portée, la référence est placée entre parenthèses immédiatement après l’intitulé : `Quelques récits relatifs à l’enfance de Jésus (Luc 1, 1 - 2, 52).`


### 35.5.2. Sous-sections et références bibliques des titres Fillion

Dans la couche éditoriale de lecture, les marqueurs imprimés `§ I.`, `§ II.`, `§ III.`, etc. ne s’affichent pas lorsqu’ils ne font que répéter la hiérarchie déjà portée par le niveau de titre. On conserve l’intitulé descriptif qui suit, ainsi que le niveau sémantique nécessaire à la structure ; on ne modifie pas globalement le style T4 et on ne supprime pas le témoin source. Exemple : `§ I. — Prédiction de la naissance du précurseur. I, 1-25.` → `Prédiction de la naissance du précurseur (1, 1-25)`.

Les désignations structurelles de section se composent en casse française dans la couche éditoriale : `SECTION I. — LES DEUX ANNONCIATIONS` → `Section I — Les deux annonciations`. Le mot `Section` prend seulement sa capitale initiale ; l’intitulé qui suit revient à la casse française normale, sous réserve des noms propres. Le point imprimé après le chiffre romain est supprimé à l’affichage : on écrit `Section I —`, jamais `Section I. —`. Les capitales intégrales et la ponctuation imprimée restent conservées dans `facsimile_heading` ou une provenance équivalente.

Dans tous les titres et chapeaux analytiques Fillion, la référence biblique finale est normalisée dans la couche de lecture : les numéros de chapitres sont écrits en chiffres arabes, la référence est placée entre parenthèses et le nom du livre n’est pas répété lorsque le contexte du livre est sans ambiguïté. Aucun point final n’est ajouté après la parenthèse. Une plage dans un même chapitre garde le trait d’union sans espaces (`1, 1-25`) ; une plage interchapitres emploie un trait d’union simple entouré d’espaces (`3, 21 - 4, 13`). La forme imprimée reste conservée dans `facsimile_heading` ou une provenance équivalente ; `text_content` et `source_markup` ne sont jamais réécrits pour cette normalisation.

### 35.5.3. Repère romain et sous-titre descriptif

Lorsqu’un véritable titre structurel Fillion associe un repère romain à un intitulé descriptif — par exemple `§ I — Ce qu’est la Bible` ou `I. La division de la Bible` dans le témoin — la couche de lecture dissocie TYPOGRAPHIQUEMENT les deux fonctions sans créer deux niveaux hiérarchiques : le titre proprement dit est le chiffre romain seul (`I`, `II`, `III`…), sans signe `§` ni point ; l’intitulé verbal devient le sous-titre ou chapeau immédiatement rattaché au même titre. La donnée de rendu se normalise sous la forme `I — Ce qu’est la Bible`, que le lecteur décompose en titre `I` et sous-titre `Ce qu’est la Bible`. La forme imprimée intégrale demeure conservée dans le témoin ou sa provenance. Cette règle est systématique dans Fillion pour tout titre structurel de cette forme ; un repère romain isolé, sans intitulé descriptif, reste simplement un titre romain sans sous-titre.

### 35.6. Une note bibliographique se compose en liste

Une note que la donnée déclare bibliographique n’est pas un paragraphe suivi. Son annonce garde sa phrase, ses références prennent chacune leur ligne, un cran sous le corps qui les accueille, avec le retrait suspendu des bibliographies imprimées — la première ligne au bord, les suivantes légèrement rentrées —, un blanc très fin entre l’annonce et la première entrée et un blanc léger entre deux entrées.

Le tiret qui ouvre chaque ligne dans la donnée est un marqueur de la couche de rendu, au même titre que l’italique et les petites capitales : il dit « entrée de liste » et ne s’imprime pas. ⛔ Ni puce, ni tiret, ni boîte, ni fond, ni bordure, et aucune indentation qui doublerait celle de la liste.

La forme d’autorité d’un nom et sa forme d’affichage sont deux choses. Le rendu ne touche jamais à la casse stockée : « van Steenkiste » demeure la forme d’autorité des données bibliographiques, et c’est la donnée qui porte « Van Steenkiste » là où l’item commence par ce nom.

### 35.6.1. Normalisation bibliographique des notices

Dans une liste bibliographique éditoriale, la casse du fac-similé ou de l’OCR ne commande jamais l’affichage. Les titres sont ramenés à la casse française normale ; le titre individualisé de l’ouvrage se compose en italique. **Le titre et le sous-titre sont deux champs distincts de la base** — `ouvrages_bibliographiques.titre` et `ouvrages_bibliographiques.sous_titre` — mais ils constituent typographiquement UN SEUL intitulé : ils se composent tous deux en italique et se joignent par un **point** : `*Évangile selon saint Jean. Introduction critique et commentaires*`. Un sous-titre EST un sous-titre, non une apposition qu’un deux-points introduirait. ⚠️ Décision de l’auteur du 28 août 2026, qui remplace le deux-points prescrit le matin même, lequel remplaçait la virgule : ⛔ ni virgule, ni deux-points, ni l’espace insécable qui précédait celui-ci. ⚠️ Un titre qui se ferme DÉJÀ sur une ponctuation forte n’en reçoit pas une seconde, sa ponctuation attestée détachant à elle seule : `*Où en est la question biblique ? Réponse à quelques objections*`.

**La source de vérité est la donnée STRUCTURÉE, jamais un texte bibliographique précomposé.** Une liste d’ouvrages se construit champ par champ : `bible_editorial_bibliography_entries` donne l’appartenance à la pièce et le rang de la page imprimée (⚠️ non l’ordre d’affichage, qui se calcule : § 35.6.3), `ouvrages_bibliographiques` le titre, le sous-titre, le lieu et l’année, `ouvrage_contributeurs_scientifiques` et `auteurs_valeur` l’auteur normalisé, `editeurs_valeur` l’éditeur normalisé. ⛔ On ne découpe jamais une notice précomposée pour en retrouver les parties, et l’ancien texte de lecture des blocs matériels cesse d’être la source de l’affichage : il demeure en base pour la provenance et le témoin source. ⛔ La ponctuation est produite par le rendu à partir des champs présents ; elle n’est pas stockée dans la donnée, et un champ absent emporte son séparateur. **L’identité d’une entrée est `ouvrage_id`**, jamais son rang dans la liste. Un repli sur l’ancien texte n’est admis que si la liste structurée est réellement absente, et il ne se mêle jamais à elle : ou l’une, ou l’autre, jamais quelques entrées de chaque.

Lorsqu’un auteur doit être affiché, son nom de famille se compose en petites capitales sémantiques et son prénom en bas de casse. Pour les autorités antiques et médiévales qui ne se laissent pas ramener à un couple prénom/nom moderne, la forme d’autorité entière se compose en petites capitales. Dans une rubrique « Du même auteur », le nom n’est pas répété à chaque entrée : le titre de rubrique porte déjà cette information. ⛔ Les petites capitales viennent de la donnée structurée — `auteurs_valeur.prenom` et `auteurs_valeur.nom_famille` —, jamais d’une transformation heuristique de la chaîne affichée : une autorité que ce couple ne décrit pas ne se coupe pas à la première espace, elle se compose entière. Le composant bibliographique demeure GÉNÉRIQUE : c’est la pièce qui dit si l’auteur doit paraître, non le composant qui le devine.

Les éléments d’une même notice sont séparés par des virgules, et non par une succession de phrases ponctuées de points. L’ordre normal est : titre, lieu, éditeur, date, format et pagination ; le point final clôt seul la notice. Un point-virgule peut séparer deux états ou deux éditions réellement distincts.

⛔ **La description MATÉRIELLE ne s’affiche pas dans une liste d’ouvrages** : le format (`in-8°`, `in-4°`), le nombre de pages, la pagination romaine ou arabe, le nombre de planches, les figures et les dimensions sont des données de description, conservées dans la notice, et ne paraissent pas au lecteur. Une liste d’ouvrages nomme des œuvres, elle ne décrit pas des exemplaires. La forme affichée est donc : intitulé, lieu, éditeur normalisé, année, point final — `*Évangile selon saint Jean. Introduction critique et commentaires*, Paris, Lethielleux, 1887.` ⚠️ Décision de l’auteur du 28 août 2026.

Une liste d’ouvrages lue SEULE, en pièce liminaire, prend la composition du § 35.6 : un seul titre en tête, une œuvre par ligne, aucune puce ni tiret, aucun cadre, aucun fond, aucune bordure, alignement à gauche, retrait suspendu, blanc léger entre deux références, et un corps légèrement inférieur au texte de l’apparat. ⚠️ Le retrait suspendu remplace le retrait de première ligne prescrit jusque-là (décision de l’auteur du 28 août 2026).

Les chiffres romains de pagination sont toujours en capitales dans la couche éditoriale (`XIX`, `LXIV`, `VII`). Toute forme OCR ambiguë (`Lx1v`, `xn`, etc.) doit être relue et ne peut être simplement passée en capitales par transformation mécanique. Lorsqu’une pagination romaine est suivie d’une pagination arabe, le séparateur est un trait d’union sans espaces : `LXIV-388 p.`, jamais `LXIV -388 p.` ni `LXIV - 388 p.`.

Les dates, lieux, éditeurs, mentions d’édition et paginations ne sont pas repris aveuglément de l’OCR. Ils sont confrontés au fac-similé et, lorsque c’est utile, à une autorité bibliographique externe. La transcription source reste inchangée ; la couche éditoriale porte la valeur vérifiée. Toute divergence non résolue reste explicitement en `review` et n’est pas corrigée par conjecture.

### 35.6.2. Un seul style bibliographique, et il vient de la donnée

Toutes les bibliographies de l’apparat se composent de la même manière : la pièce « Du même auteur », toute pièce ou section « Bibliographie », et tout bloc que la donnée déclare bibliographique. Une seule famille de styles les sert, et l’édition, l’auteur et l’intitulé de la pièce n’y changent rien.

⛔ **Le genre ne se lit jamais dans le texte du titre.** « Du même auteur », « Bibliographie », « Ouvrages consultés » nomment des PIÈCES, non des compositions : le style vient de `presentation.style = bibliographie`, de la liste bibliographique structurée que la pièce porte, ou d’un rôle équivalent déjà présent dans la donnée. ⛔ Aucun style ne prend le nom d’une pièce, d’une édition ni d’un auteur — ni `du-meme-auteur`, ni `bibliographie-fillion`, ni `bibliographie-genese`.

**Le titre de la pièce n’est pas concerné.** « Du même auteur » ou « Bibliographie » reste un véritable titre de pièce ou de section et garde son rang dans la hiérarchie de l’apparat. ⛔ Il ne reçoit pas le style `bibliographie`, réservé aux notices placées dessous.

**Le vocabulaire de la donnée est court, stable et CLOS.** `bibliographie` désigne le paragraphe d’une notice bibliographique. Pour les fragments d’une notice structurée, et seulement lorsqu’ils répondent d’une fonction bibliographique réelle : `bibliographie-titre-ouvrage` pour le titre de l’ouvrage (italique), `bibliographie-sous-titre` pour le sous-titre (italique), `bibliographie-auteur` pour l’auteur affiché (romain) avec `bibliographie-nom-auteur` pour le nom de famille en petites capitales, et `bibliographie-donnees` pour le lieu, l’éditeur, l’année et les autres données retenues (romain). ⛔ **La ponctuation n’a aucun style propre** : elle appartient à la séquence où elle tombe et en hérite — le point qui joint le titre au sous-titre reste ainsi dans l’italique du titre.

**Une bibliographie se distingue du texte courant sans devenir un encadré** : un corps légèrement inférieur au texte de l’apparat, un interligne modérément resserré, l’alignement à gauche, un blanc discret entre deux notices, le retrait suspendu, et la largeur normale de la colonne — ⛔ jamais un bloc artificiellement étroit. ⛔ Aucun fond, aucune bordure, aucune puce, aucun tiret ajouté par la feuille : la ponctuation et les séparateurs sont produits à partir des champs structurés, jamais par le style.

**Sur une mesure étroite**, le retrait suspendu se réduit pour ne pas comprimer la ligne ; ⛔ il ne disparaît pas, et le corps ne rapetisse pas davantage : la hiérarchie bibliographique tient à l’un et à l’autre.

**Repli historique.** Une bibliographie que la donnée déclare mais qui n’est pas encore structurée prend le même cadre typographique général. ⛔ On n’en déduit ni titre, ni auteur, ni éditeur par analyse de son contenu : elle reste un paragraphe, dans le cadre de la famille, et l’on se contente de lui attribuer `presentation.style = bibliographie`.

### 35.6.3. L’ordre d’une bibliographie se CALCULE

L’ordre d’affichage d’une liste bibliographique ne se lit pas dans la donnée : il se calcule, et de la même manière pour toutes les listes. **D’abord la vedette, ensuite le titre.**

**La vedette** est le nom de famille de l’auteur lorsqu’il y en a un, le titre lorsqu’il n’y en a pas. ⛔ Une œuvre anonyme ne fait pas un bloc à part, ni en tête ni en queue : elle se range à son titre, dans la même suite alphabétique, comme un catalogue le fait. Deux homonymes se départagent par le prénom. ⛔ L’article ne se retire jamais d’un nom d’autorité : « La Taille » est un nom, non un titre précédé d’un article.

**Le titre** se range **article et déterminant initiaux ôtés** : « L’Idée centrale de la Bible » se range à I, « Les Saints Évangiles » à S, « Une histoire du canon » à H. L’accent, la casse, l’apostrophe et le trait d’union ne comptent pas — « Saint-Jean » se range comme « Saint Jean », et « Évangile » tombe entre « Essais » et « Introduction ». ⛔ Le retrait ne vaut QUE pour le classement : le titre affiché garde son article, toujours. ⛔ Un titre qui n’est QUE son article se range sous lui, faute de quoi sa clé serait vide.

⛔ **Le latin n’a pas d’article, et il est ici partout.** Les mots qui sont à la fois articles d’une langue moderne et mots latins ne sont donc pas retirés : `a` (article anglais, mais préposition latine), `de`, `in`, `ex`, `ad`, `pro` (prépositions dans les deux langues), `una` et `uno`. « A solis ortus cardine » se range à A, « De civitate Dei » à D. La liste des mots écartés est CLOSE — français, anglais, allemand — et ne s’étend qu’en connaissance de cause.

À égalité parfaite — même vedette, même prénom, même titre, même sous-titre, même année —, c’est le **rang de la page imprimée** qui départage. ⚠️ `display_order` demeure dans la donnée comme témoin du volume ; ⛔ il n’est plus l’ordre d’affichage.

### 35.7. Les guillemets d’une citation en langue étrangère restent en romain

Une citation latine ou une translittération grecque en alphabet latin enchâssée dans une phrase française se compose en italique, mais les guillemets qui l’encadrent appartiennent au français qui cite et restent en romain. On écrit donc « *Jesu Christi* » et jamais *« Jesu Christi »*. ⛔ L’italique ne se pose pas sur le conteneur qui porte les guillemets, ni la langue étrangère sur la ponctuation française qui les entoure.

**Règle grecque Fillion.** Un terme, lemme ou citation grecque écrit en caractères grecs reste en romain dans la couche éditoriale, conformément au § 3.6. Seules les translittérations du grec en alphabet latin se composent en italique. Les guillemets et la ponctuation française restent en romain. La couche source demeure inchangée.

La ponctuation stockée fait foi et ne se déplace pas au rendu. Un point-virgule que l’édition place hors des guillemets y reste ; ⛔ le rendu ne le rentre pas dans la citation, et ne recompose pas davantage l’apostrophe typographique, qui demeure U+2019 sur toutes les surfaces éditoriales françaises.



### 35.8. Méthode obligatoire de traitement, correction et clôture Fillion (26 août 2026)

Cette méthode est obligatoire pour chaque livre Fillion. Elle découle des erreurs constatées pendant la reprise de Matthieu : une passe mécanique peut être propre tout en laissant des doublons, des abréviations ou d’anciennes lectures dans une projection secondaire. ⛔ Ne jamais déclarer un livre « terminé » à partir d’un seul contrôle global ou d’une seule couche de texte.


#### 35.8.0. Cycle canonique de travail — protocole vivant

Le chantier Fillion suit désormais un cycle unique et cumulatif. Il s’applique à tout livre, introduction, commentaire, note, liminaire et paratexte Fillion. Les passes sont exécutées dans l’ordre ci-dessous ; on ne mélange pas plusieurs familles de correction dans une même passe si cela empêche d’en mesurer l’effet. Toute correction tardive qui affecte une couche déjà contrôlée rouvre cette couche et toutes les passes qui en dépendent.

Le protocole est **vivant** : lorsqu’une erreur nouvelle révèle une faiblesse de méthode, on ne corrige jamais seulement l’exemple rencontré. On définit la famille d’erreur, on recherche tous les cas analogues dans le périmètre pertinent, on les corrige ou on les classe, puis on enrichit le présent protocole si la règle est générale. Une règle nouvelle précise toujours son déclencheur, son périmètre, le contrôle attendu et la preuve de clôture. Si elle est rétroactive, les livres déjà traités susceptibles d’être touchés sont réaudités.

**Passe 0 — Préflight documentaire et état initial.** Identifier le témoin exact, le volume, les pages, le livre et les couches utilisées ; distinguer source/diplomatique et lecture éditoriale ; lister toutes les surfaces réellement rendues (`heading`, corps, sous-blocs de normalisation, notes, titres, chapeaux, bibliographies, illustrations). Ouvrir la mission dans le centre de contrôle, mesurer l’état initial en SQL, identifier les missions parallèles et effectuer les sauvegardes ciblées avant toute écriture. Aucun chiffre de suivi n’est estimé.

**Passe 1 — Structure et hiérarchie.** Reconstituer d’abord la structure attestée : livre, partie, section, sous-section, chapitre matériel, péricope, introduction, commentaire, titre, chapeau, lemme et paragraphe. Contrôler les deux axes matériel et analytique (§ 35.5), les parents sémantiques, l’ordre matériel et les corps de blocs. Un titre n’est jamais injecté dans la prose ; un bloc `title` n’a pas de corps ; un intitulé ne se répète pas comme premier paragraphe. Les introductions longues sont structurées : le conteneur/titre peut rester `introduction_livre`, mais leurs développements se composent en prose normale ; le style `introduction` reste réservé aux préambules brefs (§ 35.4.1).

**Passe 2 — Continuité de lecture, paragraphes et blancs.** Reconstituer les paragraphes selon la syntaxe, le sens et le fac-similé, non selon les fins de ligne OCR ni les changements de page. Supprimer de la couche de lecture les doubles retours, lignes blanches, ruptures de page, paragraphes vides et blocs fantômes qui créent des blancs artificiels ; conserver ces accidents uniquement dans le témoin source lorsque nécessaire. Les transitions de lemme suivent le § 35.3.1. Le premier paragraphe qui appartient à un titre doit visuellement lui être rattaché : on ne crée jamais ce rapprochement par un saut de ligne manuel, un `<br>` ou une suppression de texte, mais par la relation de composition (`leading_paragraph_style` ou équivalent). Le cumul des marges `titre + bloc suivant` doit être contrôlé ; un grand blanc entre un T4 et son développement est une anomalie de composition, non un paragraphe à inventer.

**Passe 3 — Titres, casse et références de portée.** Revoir tous les headings après stabilisation de la structure : niveau, casse française, ordinaux, ponctuation, références bibliques finales, titres de section et de péricope, formes redondantes. Appliquer notamment les §§ 35.1, 35.5.1 et 35.5.2. La forme imprimée reste dans `facsimile_heading`, `source_markup` ou une provenance équivalente. Après **toute** modification d’un heading, contrôler immédiatement toutes les notes et ancres qui le ciblent : une ancre de titre fondée sur l’ancienne graphie doit être resynchronisée dans la même passe.

**Passe 4 — Notes et apparats.** Traiter l’appareil comme un système : identité de la note, numéro, blocs, ordre, appel imprimé, cible `heading` ou `body`, offsets, texte d’ancre, rendu et état de revue. Toute note attestée doit avoir un véritable appel visible et cliquable lorsque l’appel est localisable ; une note appelée ne doit pas être répétée dans un apparat flottant. Ne jamais fabriquer un offset pour compenser une mauvaise classification. Le contenu d’une note ordinaire se compose comme prose normale de note — romain et justifié —, jamais avec le style d’une introduction longue ; seules les fonctions réelles (bibliographie, citation, référence, vers, attribution) dérogent à ce cadre. Les bibliographies suivent les §§ 35.6–35.6.3. Toute normalisation de titre, de texte ou de segmentation oblige à revalider les ancres dépendantes.

**Passe 5 — Typographie française, citations et langues.** Appliquer les règles du § 3 et de la synthèse Fillion § 35.0 : espaces U+00A0/U+202F, apostrophes, guillemets, ponctuation, points de suspension, ellipses d’omission, capitales d’insistance, incises et parenthèses. Contrôler ensuite les langues et écritures : latin et translittérations en italique lorsqu’ils ont cette fonction ; grec en caractères grecs en romain ; guillemets et ponctuation française en romain. Ne jamais déduire un italique d’un simple motif lexical lorsqu’un homographe français est possible.

**Passe 6 — Désabréviations, références et bibliographie.** Faire une passe distincte sur les abréviations, puis une passe sur les références bibliques et savantes. Les expansions sont grammaticales et contextuelles ; `cf.` reste distinct de `Comparer`. Les sigles bibliques suivent le § 3.5.1. Toute référence impossible ou incohérente est confrontée au témoin avant correction. Les notices bibliographiques utilisent la donnée structurée : auteurs d’autorité, titres/sous-titres, lieux, éditeurs et dates ; aucune description matérielle ne se glisse dans une liste d’ouvrages lorsque la charte l’exclut.

**Passe 7 — Lecture directe du témoin.** Après toutes les passes mécaniques et structurelles, lire réellement le texte dans l’ordre matériel, chapitre ou division après chapitre ou division, avec le fac-similé pour les zones sensibles. Rechercher ce que les contrôles automatiques ne voient pas : fautes OCR plausibles, omissions, doublons, mots collés, ruptures de phrase, mauvais titres, références absurdes, appels de note déplacés, faux paragraphes et anomalies de sens. Une lecture directe est une passe à part entière ; elle n’est jamais remplacée par un compteur à zéro.

**Passe 8 — Contrôle du rendu réel.** Vérifier l’interface après stabilisation des données : hiérarchie visuelle, espacements verticaux, relation titre → premier paragraphe, continuité des longues introductions, absence de blancs indésirables, notes en exposant et fenêtres de note, bibliographies, citations, retraits et comportements sur mesure étroite. Un défaut visuel est d’abord diagnostiqué comme défaut de donnée ou de relation sémantique ; le CSS global n’est modifié qu’en présence d’une règle réellement générale. Aucun saut de ligne artificiel n’est ajouté pour réparer une marge.

**Passe 9 — Intégrité et postcontrôles déterministes.** Relire l’état depuis la base après le dernier lot. Vérifier au minimum : recomposition exacte des projections ; source inchangée lorsque seule la lecture a été corrigée ; absence de corps dans les titres ; absence de heading répété ; continuité/ unicité des ordres et clés ; cohérence des parents ; absence de paragraphes vides ; typographie sans résidu ciblé ; notes/blocs/ancres sans orphelin ; appels résolus ; ancres de titre synchronisées ; références canoniques valides ; sauvegardes présentes. Tous les nombres annoncés viennent de requêtes déterministes.

**Passe 10 — Sondage indépendant et clôture.** Après la dernière correction, effectuer au moins deux sondages reproductibles répartis entre types d’objets et divisions. Toute erreur trouvée rouvre la famille correspondante : rechercher tous les analogues, corriger, rejouer les passes dépendantes et refaire les sondages. La clôture distingue au minimum : `structure close`, `continuité close`, `titres close`, `notes close`, `typographie/langues close`, `références/bibliographie close`, `lecture directe close`, `rendu contrôlé`, puis `relecture éditoriale exhaustive close`. Aucun statut humain n’est attribué automatiquement.

**Règle d’amélioration continue.** Chaque correction utilisateur qui révèle un principe réutilisable est évaluée comme candidat à la charte. Si elle est générale, elle est intégrée au § 35 ou au présent protocole dans la même passe que son application, synchronisée dans les deux emplacements normatifs, et donne lieu à un contrôle rétroactif du périmètre déjà traité. Si elle est purement locale, elle reste dans le journal de mission sans alourdir la norme. Le protocole ne s’allège jamais en supprimant une garde qui a déjà empêché une erreur réelle ; il peut être réorganisé pour éviter les doublons, mais sa couverture ne régresse pas.


#### 35.8.1. Séparer strictement témoin source et lecture éditoriale

Le témoin source ou diplomatique reste immuable. Toute modernisation typographique, désabréviation, correction de référence ou mise en forme se fait dans la couche éditoriale de lecture. Une correction conjecturale ou contextuelle ne remplace jamais silencieusement la forme imprimée : la forme source reste conservée dans `source_markup`, `facsimile_heading`, la provenance ou une sauvegarde dédiée.

Avant toute écriture, identifier toutes les surfaces susceptibles d’être rendues : `heading`, corps de lecture principal, `editorial_normalization.reading_text`, sous-blocs `editorial_normalization.blocks[].reading_text`, rendu des notes, titres et chapeaux. Une correction n’est complète que si toutes les projections qui exposent le même contenu sont cohérentes.

#### 35.8.2. Ordre obligatoire des passes

1. **Structure et hiérarchie.** Traiter d’abord chapitres, sections, sous-sections, péricopes, titres, introductions et commentaires. Un titre ne doit jamais rester injecté dans le corps ni dans un sous-bloc de commentaire. Un bloc de type `title` a un corps vide. Une introduction peut avoir un heading et un corps de prose, mais le heading n’est jamais répété comme premier paragraphe ou premier sous-bloc. Les axes matériel et analytique restent distincts selon les §§ 35.1 et 35.5.

2. **Typographie française.** Normaliser la couche éditoriale avec U+202F avant `; ! ?`, U+00A0 avant `:` et U+202F à l’intérieur des guillemets français, apostrophe U+2019, espaces et doubles espaces. Les points de suspension de la prose deviennent `…`. ⛔ Ne jamais convertir automatiquement `...` en `[…]` : `[…]` est réservé à une omission réelle dans une citation ou un lemme, vérifiée par le contexte ou le témoin.

3. **Langues étrangères et italiques.** Les mots, locutions, lemmes et citations latins ainsi que les translittérations de langues anciennes se composent en italique dans la couche éditoriale. Le grec écrit en caractères grecs reste en romain ; une translittération grecque en alphabet latin reste en italique. Les guillemets français restent en romain. Ne jamais mettre en italique par simple détection lexicale un homographe français : utiliser le paragraphe, la langue déclarée, les lemmes structurés et le contexte.

4. **Désabréviation.** Faire une passe distincte et exhaustive. Développer les abréviations intelligibles propres à la prose de lecture : `Comp.` → `Comparer`, `ss.` → `suivants` ou `suivantes` selon le nom gouvernant, `etc.` → `et cetera`, `h. l.` → `à cet endroit`, `c.-à-d.` / `C.-à-d.` → `c’est-à-dire` / `C’est-à-dire`, et les abréviations matérielles ou savantes lorsqu’elles sont certaines (`Atl. archéol.` → *Atlas archéologique*, `pl.` → `planche`, `fig.` → `figure`, etc.). L’abréviation savante `cf.` reste distincte de `Comp.` : elle n’est jamais développée en `Comparer` et se compose en italique selon le § 3.6. Les sigles bibliques ne sont pas développés mécaniquement en noms complets : ils sont normalisés vers les formes du § 3.5.1. L’expansion doit rester grammaticalement française : contrôler les accords, la capitale de début de phrase et la ponctuation après remplacement. ⛔ Une regex globale ne suffit pas. Toute abréviation ambiguë reste en `review` jusqu’à identification certaine.

5. **Références bibliques et bibliographie.** Moderniser les références bibliques en rendant toujours le livre explicite — par l’abréviation normative du § 3.5.1 ou par son nom en toutes lettres lorsque la donnée l’exige — et le chapitre en chiffres arabes. Un renvoi interne sans sigle hérite du livre courant seulement lorsque ce contexte est certain : `*cf.* xv, 2` → `*cf.* Mt 15, 2`. Ne pas convertir mécaniquement les chiffres romains bibliographiques, qui restent romains et sont harmonisés en capitales. Vérifier l’existence canonique des références modernisées. Une référence impossible doit être confrontée au témoin et au contexte avant correction ; la correction éditoriale est documentée. Les titres d’ouvrages sont composés comme tels ; les noms d’auteurs suivent la forme d’autorité et la convention de petites capitales prévue par la charte.

6. **Lemmes et ponctuation syntaxique.** Contrôler les lemmes latin/français, leur ancre canonique, leur numéro de paragraphe et leur composition. Si une explication commence après un lemme fermé par `»`, rétablir la ponctuation nécessaire après le guillemet fermant. Un commentaire général sans lemme ne reçoit jamais artificiellement un couple de lemmes.

7. **Lecture directe.** Après les passes mécaniques, lire réellement le commentaire chapitre par chapitre, puis les introductions, titres, chapeaux et notes. Cette lecture recherche les fautes OCR, accords, ponctuations, références incohérentes, mots collés, titres injectés et anomalies de sens que les regex ne peuvent pas détecter. La passe directe est distincte des passes « typographie » et « abréviations » et doit être nommée comme telle dans le suivi.

8. **Texte biblique.** Contrôler séparément les versets Fillion. Lorsque `source_markup` existe, comparer lexicalement le texte de lecture au témoin après neutralisation de la seule ponctuation et des espaces autorisés. Toute unité sans témoin stocké reste une réserve de provenance explicitement comptée ; ne jamais fabriquer un `source_markup` à partir du texte courant.

#### 35.8.2.1. Postconditions obligatoires des transformations éditoriales

Toute transformation éditoriale doit préserver ce qui, dans la source, appartient à la syntaxe autour de la chaîne remplacée. **Une expansion ne peut absorber la ponctuation de phrase.** Si une abréviation ou une référence imprimée se termine par un point qui clôt effectivement une phrase, ce point subsiste après expansion ou normalisation, y compris à l’intérieur d’un paragraphe avant une citation ou une nouvelle phrase : `etc. « … »` → `et cetera. « … »`. La même vérification vaut à la fin d’un paragraphe. En revanche, un `...` source identifié comme omission et rendu `[…]` ne reçoit pas automatiquement un point supplémentaire. Le contrôle se fait contre l’empan source exact, non par supposition typographique.

**La désabréviation doit conserver la grammaire.** Après toute expansion d’un nom abrégé, contrôler le déterminant, le nombre et l’accord : `le vers. 4` → `le verset 4`, mais `les vers. 4 et 5`, `des vers. 4-5`, `aux vers. suivants` → `les versets`, `des versets`, `aux versets`. Une substitution lexicalement correcte mais grammaticalement fautive est une correction inachevée.

**Une suite de références bibliques doit rester explicite dans la couche de lecture.** Lorsque la source abrège le livre aux références suivantes, le livre courant est répété dès qu’un nouveau chapitre commence : `Matth. III, 2 ; IV, 15` → `Matthieu 3, 2 ; Matthieu 4, 15`. Aucun chapitre biblique isolé en chiffres romains ne doit subsister après normalisation. Ce développement n’altère jamais la forme source.

**Les chiffres romains documentaires restent romains mais se composent en capitales.** Dans la couche éditoriale, numéros de livres, chapitres d’ouvrages, homélies, discours, tomes, planches et autres subdivisions bibliographiques ou matérielles se rendent `I`, `II`, `XVII`, `XCVI`, etc. Ils se distinguent des chapitres bibliques, qui sont normalisés en chiffres arabes. La normalisation porte aussi bien sur la prose que sur les notes et les headings.

**Un séparateur matériel ne termine pas un heading.** Lorsqu’un tiret imprimé ne fait que séparer un repère ou un intitulé du premier lemme/commentaire qui suit, le heading éditorial s’arrête avant ce tiret ; la forme imprimée demeure dans `facsimile_heading` ou la provenance. Le tiret n’est conservé que s’il appartient réellement à la syntaxe de l’intitulé.

Après toute transformation de ce type, le postcontrôle porte sur **toutes les surfaces rendues** — headings, blocs de lecture, notes — et recherche la famille d’erreur elle-même, pas seulement les objets modifiés.

#### 35.8.3. Contrôles structurels obligatoires après chaque passe

Les contrôles ne portent jamais seulement sur `text_content`. Ils doivent couvrir toutes les surfaces d’affichage et vérifier au minimum :

- la concaténation des sous-blocs de lecture recompose exactement le corps éditorial courant ;
- aucun premier sous-bloc ne répète le heading, même avec une ponctuation, une référence ou une formulation légèrement différente ;
- aucun bloc `title` n’a de corps non vide ;
- aucun heading n’est répété dans le corps ;
- le `reading_text` supérieur, lorsqu’il existe, est synchronisé avec le corps courant ;
- les notes affichent leur `rendering` éditorial et non l’ancienne forme diplomatique ;
- aucune ancienne abréviation ciblée, référence biblique en chapitre romain, mauvaise espace française, apostrophe droite, `...` brut, italique déséquilibré ou script étranger non composé ne subsiste dans une projection secondaire ;
- les lemmes pointent vers un paragraphe valide et vers un canon existant ;
- les séquences et clés structurelles restent continues et uniques ;
- aucun faux `verse_note` ne compense un commentaire mal classé ;
- aucune validation humaine n’est créée automatiquement.

Un contrôle d’égalité textuelle simple est insuffisant pour les doublons. Il faut aussi contrôler la structure : si une introduction possède deux sous-blocs et que le second recompose à lui seul exactement le corps principal, le premier est un résidu extérieur au corps et doit être examiné comme titre ou autre élément mal projeté.

#### 35.8.4. Sondages aléatoires reproductibles

Après les contrôles exhaustifs, effectuer au moins deux sondages pseudo-aléatoires déterministes, avec graine enregistrée, répartis entre chapitres et types d’objets : versets, commentaires, introductions, titres et notes. Un sondage n’est jamais une preuve de complétude ; il sert à découvrir les angles morts des contrôles systématiques.

⚠️ Si un sondage trouve une erreur, ne pas corriger seulement l’objet tiré. Définir la famille structurelle ou typographique de l’erreur, rechercher exhaustivement tous les objets analogues, les corriger, puis rejouer les contrôles globaux et le sondage. Toute nouvelle famille d’erreur révélant une faiblesse de méthode doit enrichir la présente charte.

#### 35.8.5. Sauvegardes et discipline d’écriture

Sauvegarder chaque objet avant une correction structurelle ou textuelle significative. Ne modifier que les champs réellement concernés. Ne jamais réécrire le témoin diplomatique pour une simple correction de lecture. Une correction de structure doit préserver l’ordre matériel, les ancres et la provenance. Après chaque lot, vérifier en SQL le nombre réel d’objets visés, modifiés et conformes ; ne jamais annoncer un chiffre estimé.

#### 35.8.6. Conditions de clôture

Employer des statuts distincts : `structure close`, `typographie close`, `désabréviation close`, `références close`, `lecture directe close`, puis seulement `relecture éditoriale exhaustive close`. ⛔ « Contrôles mécaniques à zéro » ne signifie jamais « livre terminé ».

Un livre Fillion n’est clos que lorsque toutes les passes ci-dessus sont achevées, que les projections secondaires sont synchronisées, que les contrôles structurels forts sont à zéro, que les sondages aléatoires ont été exécutés après le dernier lot de corrections et que les réserves de provenance restantes sont explicitement énumérées. Si une erreur est découverte après clôture, la mission est rouverte ; la cause méthodologique est identifiée et la règle correspondante est ajoutée à la charte avant nouvelle clôture.


### Fillion — décisions de chantier et abréviations de renvoi (25 août 2026)

- Toute décision éditoriale validée pendant la relecture Fillion doit être portée immédiatement dans `parametres.charte_ia`, dans la même passe que son application. Si la règle est rétroactive, contrôler et reprendre sans attendre les livres ou chapitres déjà traités. La couche source/diplomatique reste inchangée.
- L’abréviation savante `h. l.` signifie *hoc loco* (« à cet endroit », « sur ce passage »). Dans la couche éditoriale, ne pas conserver `h. l.` : développer en français. Pour un renvoi de Fillion à son propre commentaire, écrire `à cet endroit`. Dans une référence patristique ou bibliographique, développer de façon intelligible (`à cet endroit` / `sur ce passage`) sans inventer de pagination. Conserver la forme imprimée `h. l.` dans la couche source.


### Règle Fillion — désabréviation de *hoc loco*
Dans toute la couche éditoriale Fillion, les formes autonomes `h. l.`, `H. L.` et variantes de casse équivalentes signifient *hoc loco* et sont systématiquement développées en « à cet endroit ». La forme abrégée demeure conservée dans le témoin source. Ne jamais confondre cette abréviation avec des séquences OCR accidentelles telles que `h l’époque` ou avec une rencontre fortuite de fin et début de mots (`Joseph. Le…`). Cette règle est rétroactive sur tout le chantier Fillion.


### Chantier Fillion — récupération d’un bloc manquant et conservation des titres source (25 août 2026)

- Lorsqu’un bloc Fillion manque réellement dans l’import, un OCR secondaire ne peut servir à le réintégrer que s’il provient exactement de la même édition et du même volume, et si sa position matérielle est établie par les blocs voisins, la pagination ou une autre provenance déterministe.
- Une telle récupération reste obligatoirement en `review` et porte une provenance explicite ; `facsimile_visual_collation=false` (ou équivalent) doit rester vrai tant que les pixels du fac-similé n’ont pas été relus. Elle ne reçoit jamais un statut de collation visuelle par héritage des blocs voisins.
- L’OCR secondaire ne doit jamais écraser un bloc déjà collationné visuellement ; il sert seulement à récupérer une lacune ou à préparer une vérification.
- Lorsqu’un heading imprimé est normalisé pour l’affichage, conserver sa formulation source dans `metadata.facsimile_heading` si elle est attestée par le témoin source. Si la formulation n’est connue que par OCR secondaire, utiliser une provenance OCR explicite et ne pas la présenter comme une lecture fac-similé.
- Ces règles sont rétroactives pour toute nouvelle récupération effectuée pendant le chantier Fillion.


### Fillion — sections, translittérations et renvois internes (2026-08-25)
- Titres de section : dans une formule imprimée du type « SECTION I. — APPARITION DU PRÉCURSEUR… III, 1 — IV, 11 », le marqueur « Section I » est le titre structurel (T3) et le libellé descriptif avec sa plage biblique est un sous-titre distinct attaché (`section_subtitle`). Ne jamais fusionner titre de section et sous-titre dans un seul heading. La règle vaut pour toutes les sections analogues.
- Translittérations : toute translittération d’une langue ancienne écrite en alphabet latin (hébreu, araméen, grec, etc.) se compose en italique dans la couche éditoriale, par ex. *p’râšîm*, *saddiq*, *Kêfâ’*. Le grec écrit en caractères grecs reste en romain dans la couche éditoriale Fillion ; la couche source demeure inchangée.
- Renvois bibliques internes : un renvoi sans sigle de livre et avec chapitre en chiffres romains, par ex. « cf. xv, 2 », doit être modernisé en donnant explicitement le livre courant et le chapitre en chiffres arabes : « *cf.* Mt 15, 2 ». Ne pas effectuer de conversion romaine globale hors d’un contexte biblique explicitement identifié.


### Fillion — séparation des blocs composites chapitre / péricope / commentaire
- Si une unité source réunit matériellement un marqueur de chapitre (`CHAP. X.`), un titre analytique de péricope (`2° ...`) et un sous-commentaire numéroté (`1. ...`), ne jamais projeter ces trois fonctions dans un seul bloc.
- Conserver trois objets distincts : 1) marqueur de chapitre matériel, conservé mais masqué dans le lecteur ; 2) titre de péricope autonome ; 3) commentaire numéroté autonome.
- Le commentaire est rattaché sémantiquement au titre de péricope ; le titre de péricope est rattaché à la section ou sous-section analytique pertinente.
- Le `canon_id_start` doit correspondre au chapitre réellement signalé par la source ; ne jamais conserver par inertie l’ancrage du bloc précédent lorsqu’un `CHAP.` marque explicitement un nouveau chapitre.
- La formulation imprimée antérieure à la séparation doit rester conservée dans `facsimile_heading`, `source_markup` ou la provenance source.


### Fillion — ponctuation des lemmes et reclassification des faux appels de note
- Lorsqu’un lemme cité `« *…* »` est clos et qu’une nouvelle phrase explicative commence immédiatement après, mettre un point après le guillemet fermant, que le lemme soit en tête de paragraphe ou inséré dans une phrase : `« *Qui autem […]* ». C’est …`. Ne jamais laisser `« *…* » C’est …`, `: « *…* » Jésus …` ou une construction analogue sans ponctuation.
- Contrôler ce motif systématiquement sur les blocs déjà traités, pas seulement au fil des nouveaux chapitres.
- Typographie française : aucune ponctuation haute accolée au mot précédent. En particulier, normaliser systématiquement le point-virgule avec une espace fine insécable avant `;`.
- `c.-à-d.` / `C.-à-d.` doivent toujours être développés en `c’est-à-dire` / `C’est-à-dire` dans la couche éditoriale, partout.
- Une entrée `verse_note` dont le contenu est en réalité un `source_heading_plus_commentary` (titre numéroté de commentaire + commentaire continu de Fillion), sans véritable appel localisé dans le texte source, ne doit pas être publiée comme note de bas de page. La reclasser comme bloc de commentaire dans le flux ; conserver l’objet note source en base mais le retirer de l’exposition publique comme note, avec provenance explicite vers le bloc de remplacement.
- Un appel de note ne doit jamais servir à compenser une erreur de classification structurelle. Si l’objet est un commentaire continu, supprimer l’appel publié plutôt que chercher à lui attribuer un offset artificiel.


### Fillion — références bibliques impossibles ou corrompues
- Après modernisation, contrôler la validité canonique de toute référence biblique : un chapitre/verset inexistant (par ex. `Mt 6,35`) ne doit jamais être accepté mécaniquement.
- En cas de référence impossible, conserver la forme source dans la provenance, confronter le témoin imprimé/OCR et le contexte scripturaire, puis enregistrer explicitement la correction éditoriale et sa justification.
- Ne jamais transformer silencieusement une conjecture en transcription diplomatique. Si l’identification du locus reste incertaine, maintenir le bloc en `review` et signaler l’incertitude.

### 35.9. Le repère d’un commentaire se pose en manchette

Le repère qui ouvre un commentaire de péricope — « 59-61. Jésus est mis au tombeau. » — n’est pas un titre : il n’entre ni dans le plan d’accessibilité ni au sommaire. Il ne prend pas non plus une ligne pleine au-dessus du développement. Il se pose en manchette, au fer à gauche, et le commentaire l’habille comme le texte habille une lettrine. Le fac-similé compose ainsi : Fillion imprime son repère et enchaîne ses notes dans la foulée, sans lui donner de ligne à lui seul.

⛔ Rien ne délimite la manchette qu’un blanc : ni filet, ni fond, ni pictogramme. Le sans-serif et le demi-gras la détachent assez du serif justifié qui l’entoure, et elle se compose dans l’encre du texte second — détachée du fil, elle n’a plus besoin de s’effacer pour tenir sa place.

La manchette tient une COLONNE, et sa largeur ne suit pas son texte. ⚠️ Éprouvé au fil à plomb sur trois blocs qui se suivent : quand elle le suivait, le fer du commentaire sautait d’un bloc à l’autre et la page perdait son aplomb. Sa hauteur, en revanche, reste libre — ⛔ aucune taille imposée, c’est le texte qui la donne, et un repère d’un mot n’ouvre aucun vide sous lui. Elle se compose en PAVÉ TASSÉ : ferrée à droite, contre la gouttière, et d’une conduite serrée, plus courte que celle du commentaire, qui la fait tenir en bloc au lieu de s’étaler. Ce sont ses lignes courtes qui s’ouvrent du côté de la marge, où le blanc ne se voit pas.

⛔ Elle ne se justifie PAS, et aucune manchette ne se justifiera. La règle vient de la mesure, prise espace par espace avec un intervalle posé sur chacune : justifiée dans une colonne de sept rem, la plus large atteignait **1,609 em**, six fois le quart de cadratin, et 96 % des espaces du commentaire qui la longe dépassaient ce quart. ⚠️ Aucune propriété CSS ne borne cet étirement : c’est la mécanique même du justifié, qui répartit le manque sur les espaces d’une ligne. Une colonne étroite n’en a pas assez pour l’absorber.

La césure fait alors le travail que la justification faisait : elle REMPLIT les lignes, si bien que le bord libre reste presque droit sans qu’une seule espace ait été étirée. Elle est resserrée pour tasser davantage — un mot de cinq lettres est coupable, trois lettres de part et d’autre. L’espace de la Source Sans chassant 0,279 em, un retrait de 0,03 em la ramène au QUART DE CADRATIN. ⛔ Ne pas serrer en deçà : sous le quart, les mots se soudent.

Sa première ligne tombe sur la première ligne du commentaire. La conduite serrée lui prenait cette ligne de base ; une marge haute la lui rend, ⚠️ mesurée et non calculée — deux pixels à cette conduite, zéro lorsque les deux conduites sont égales.

Le blanc du bas vaut celui de la droite : la manchette est cernée du même blanc sur ses deux côtés libres. ⚠️ Il ne se règle pas à la même valeur pour autant. En bas, c’est la GRILLE qui fait le blanc — le texte laisse une ligne entière avant de reprendre pleine mesure — et la marge ne sert qu’à la déclencher. Portée à la valeur de la gouttière, elle en déclenchait deux partout où la conduite serrée du repère tombait juste sous une ligne du commentaire.

Deux gardes-fous. Sur une mesure étroite, où la manchette ne laisserait au commentaire qu’une trentaine de signes par ligne et creuserait le justifié de lézardes, le repère reprend toute la mesure et le texte le suit au lieu de l’habiller. Et le bloc contient son flottant, faute de quoi un commentaire plus court que sa manchette la laisserait déborder sur ce qui suit. ⛔ Ce contexte se pose par `display: flow-root`, jamais par un `container-type` : celui-ci confine la mise en page et ferait du bloc le référent des fenêtres de note, qui sont en position fixe — elles s’y trouveraient enfermées.

La disposition vaut pour les repères des rangs bas, chapitre, péricope et verset. Les rubriques de large portée — introduction, notice de livre ou de partie — gardent leur composition centrée et leur petit corps : ce ne sont pas des repères de développement mais des noms de genre éditorial.

⛔ **Rectification du 27 août 2026 : la manchette se ferre à GAUCHE, et en SÉRIF.** Ferrée à droite, chacune de ses lignes courtes commençait à une abscisse différente, et aucune ne tombait sur le fer de la page : dans une colonne où tout part du même bord, elle était la seule chose qui ne s’alignait sur rien. Elle prend donc le fer du commentaire ordinaire, et la police du texte. Le sans-serif qui la détachait s’en va avec : le demi-gras et la conduite serrée y suffisent, et une manchette qui appartient au texte n’a pas à s’en séparer par le caractère. Tout le reste du § 35.9 demeure — la colonne de largeur fixe, le pavé tassé, le refus du justifié, la césure serrée, les deux gardes-fous. ⚠️ Sur une mesure étroite, où le repère reprend déjà toute la largeur, le fer ne change plus : il est le même partout.

### 35.10. Aucun titre biblique ne se compose en petites capitales

⛔ Décision de l’auteur, 26 août 2026 : « laid et pas lisible ». Quatre rangs de titre sur six les portaient, plus les rubriques d’information. Composée à quinze pixels avec de la chasse, une ligne entière en petites capitales devient une bande grise où l’œil ne trouve plus de mot — et c’est précisément le rang qu’on lit le plus, celui des péricopes, qui en souffrait le plus.

La casse imprimée par Fillion se rend donc telle qu’elle est écrite, et les rangs se séparent autrement : le corps d’abord, puis la POSE — les rangs hauts centrés en romain, la péricope au fer en ITALIQUE. ⚠️ L’italique fait ici le travail que faisait la capitale : elle distingue sans peser, et un titre de péricope ne doit pas peser plus que ce qu’il annonce. Les rubriques suivent, et leur chasse tombe de moitié : une chasse large n’a de sens que sous des capitales.

⚠️ Cela ne touche pas les petites capitales que la SOURCE demande — un nom d’auteur dans une bibliographie, relevé comme tel dans les enrichissements du texte. Elles portent un sens, et elles ne composent jamais une ligne entière.

### 35.11. Un intervalle de références ne coupe pas un intitulé

Un intitulé se coupe en titre et chapeau sur un tiret cadratin, mais ⛔ le tiret joint aussi bien deux références de plage. « § II. Le sermon sur la montagne (5, 1 — 7, 29) » se coupait ainsi en plein milieu d’une parenthèse, dont la fermeture partait seule en chapeau : « 7, 29) ». Cent intitulés du corpus étaient dans ce cas, presque tous dans Matthieu, où la référence de plage est la règle.

La coupure exige donc que la tête DÉSIGNE une division au lieu de la décrire : moins de vingt-quatre signes, et close par un point (« § III. », « SECTION I. ») ou sans aucun chiffre (« PREMIÈRE PARTIE »). ⚠️ Mesurée sur les 2 651 intitulés du corpus, la règle change exactement les cent cas fautifs et aucun autre.

⛔ La mention de chapitre imprimée en tête d’un intitulé ne paraît pas, pour la raison qui vaut déjà au § 35.1 : la barre de navigation nomme le chapitre. Enchâssée dans l’intitulé de 58 commentaires — « CHAP. IX. — 1-2. Introduction… » — elle prenait la place du repère, lequel passait en chapeau subordonné : la mention matérielle dominait l’information utile.

### 35.12. Le texte biblique se cerne d’un blanc plus large que son apparat

Un bloc de versets ne touche pas le commentaire qui l’entoure. Mesuré avant reprise : vingt pixels au-dessus du premier verset, quatorze sous le dernier, c’est-à-dire moins que l’interligne du commentaire lui-même. Le texte biblique se lisait comme un paragraphe parmi les autres. Le blanc vaut désormais deux rem, et il est le même en haut et en bas : un bloc de versets est CERNÉ, non posé.

⛔ Les TITRES en sont exclus. Ils portent déjà leur propre blanc, plus large, et l’uniformiser le rétrécirait au lieu de l’ouvrir. ⚠️ Les marges verticales adjacentes FUSIONNENT en flux normal, la plus grande valant pour les deux : il n’y a rien à retrancher de la marge du verset, et croire l’inverse conduit à doubler le blanc.

### 35.13. L’introduction d’un livre se compose comme un titre de partie, et c’est le GENRE qui titre

« Évangile selon saint Matthieu — Introduction » se rendait en rubrique : sans-serif, demi-gras, chassée, grise. C’est le seul style de la page qui ne dise rien de la hiérarchie du livre, et il détonnait d’autant plus qu’il ouvre le premier chapitre. L’intitulé prend donc le rang de « Première partie » : le titre en grand romain centré, et le second membre en chapeau italique juste dessous, à la place et dans la forme de « L’enfance et la vie cachée de Jésus ».

⛔ C’est le GENRE qui titre, non le nom du livre (décision de l’auteur, 27 août 2026). Le lecteur sait déjà quel livre il ouvre : la barre de navigation le nomme, le volet de gauche aussi. Ce qu’il ignore, c’est qu’il a sous les yeux une introduction. Le titre dit donc ce qu’on lit, le chapeau de quoi il traite.

⚠️ La règle ne porte pas sur la POSITION, et c’est ce qui la rend juste. Fillion écrit tantôt « Évangile selon saint Matthieu — Introduction », tantôt « Introduction — 1° La personne de l’auteur », dans le même livre et à quelques lignes d’intervalle : inverser sur la place aurait retourné le second. Le genre se reconnaît sur une liste CLOSE — introduction, notice, sommaire, conclusion, préface, avant-propos, appendice, excursus, prologue, avertissement — et il remonte en titre quand il ferme l’intitulé ; s’il l’ouvre, il y est déjà. Un intitulé où le genre ne paraît d’aucun côté ne bouge pas.

⚠️ La coupure ne dépend alors plus de la longueur de la tête (§ 35.11), qui est la mesure des DÉSIGNATIONS de division : « ÉVANGILE SELON S. LUC » y passait à vingt et un signes, « Évangile selon saint Matthieu » échouait à vingt-neuf. Le même intitulé se divisait dans trois évangiles sur quatre, et la différence ne tenait qu’à l’abréviation du mot « saint ». La garde contre les intervalles de références demeure, elle : une tête qui porte un chiffre ne se coupe jamais.

### 35.14. Le sommaire de l’édition — ses pièces liminaires

### 35.14.1. Pages de titre imprimées et imprimatur — conservation sans affichage

La page de titre imprimée d’une édition est un élément du témoin matériel, non une pièce de l’apparat destinée au lecteur. Conformément au § 5.1, elle est conservée dans les données de source et ses renseignements utiles sont distribués dans les métadonnées, mais elle n’est reproduite ni dans le corps de l’œuvre, ni dans les apparats, ni dans le Sommaire. ⛔ Aucune entrée « Page de titre », aucun contenu de page de titre imprimée et aucun titre technique équivalent ne doivent apparaître dans l’interface de lecture. Cette exclusion porte sur l’affichage : elle ne justifie jamais la suppression du témoin source ni de sa provenance.

L’imprimatur suit la même règle d’affichage : le formulaire imprimé n’est ni une pièce du Sommaire ni un bloc destiné au lecteur. Les informations qu’il atteste sont conservées sous la forme d’une note éditoriale privée, brève et factuelle — lieu, date et autorité signataire lorsqu’ils sont lisibles ou attestés. ⛔ Cette note privée n’est jamais rendue dans l’interface publique. La transcription source et sa provenance demeurent conservées pour contrôle.

Les pièces liminaires qui peuvent entrer au Sommaire sont notamment « Du même auteur », dédicace, avant-propos, tableau de transcription de l’hébreu, abréviations, introduction générale, introduction du Testament et introduction du groupe de livres. Elles s’impriment avant le premier verset de la Bible ; la page de titre et l’imprimatur en sont exclus à l’affichage.

### 35.14.2. Dédicaces — restitution éditoriale

Une dédicace demeure une véritable pièce liminaire de lecture. Son titre de pièce ne s’écrit qu’une fois ; la formule dédicatoire imprimée à l’intérieur (« À Monsieur… », qualité du dédicataire, formule d’hommage) n’est pas promue en niveaux de titre supplémentaires. Elle est restituée comme composition interne, centrée et ramenée à la casse éditoriale normale lorsque le fac-similé emploie des capitales de présentation.

Le corps de la dédicace est recomposé en paragraphes réels. ⛔ Les fins de ligne OCR, césures de mots, folios, titres courants et changements de page ne créent jamais de paragraphes artificiels. Lorsqu’une phrase traverse une page imprimée, la couche de lecture rétablit sa continuité, sans modifier la transcription source. La salutation forme un paragraphe distinct ; le corps se compose en prose ; la signature et la date, lorsqu’elles existent, sont isolées et alignées à droite. Dans la couche de lecture, la signature et la date ne prennent pas de point final.

Lorsqu’une dédicace s’étend sur plusieurs pages matérielles, celles-ci ne produisent aucun blanc supplémentaire ni aucune rupture de composition : les blocs sources demeurent distincts pour la provenance, mais la couche de lecture les projette comme une seule suite logique. Une continuation matérielle ne reçoit jamais les marges externes d’une nouvelle pièce ou d’une nouvelle notice.

Les fonctions typographiques restent sémantiques : une expression étrangère se compose selon la règle des langues étrangères ; les titres d’ouvrages cités sont en italique ; une traduction française citée reste en romain entre guillemets français. Ces choix sont portés par `editorial_normalization.blocks` et leurs `inline_spans`, jamais déduits par CSS ou par analyse du texte brut. La transcription source, sa pagination et sa provenance demeurent intégralement conservées.

### 35.14.3. Avant-propos et préfaces liminaires

Un avant-propos ou une préface liminaire constitue une seule pièce logique, même lorsqu’il s’étend sur plusieurs pages matérielles. Le titre de pièce n’est écrit qu’une fois. Les coupures de page, titres courants, folios, césures de fin de ligne et autres accidents de l’OCR ne produisent ni nouveaux blocs visibles ni blancs supplémentaires dans la couche de lecture. Les unités source demeurent distinctes pour la provenance, mais leurs continuations sont projetées dans une seule suite de lecture.

Les divisions internes attestées (`I.`, `II.`, `III.`, etc.) restent dans le corps lorsqu’elles ne portent pas d’intitulé autonome ; elles ne sont pas promues en titres par le seul fait d’être numérotées. Il en va de même des sous-points numérotés : sans véritable rubrique, ils restent des paragraphes et ne sont pas promus en titres. Leur repère ordinal suit toutefois la règle systématique du § 35.5.1 : `1°`, `2°`, etc. se rendent `1.`, `2.`, etc. dans la couche de lecture, tandis que la forme imprimée demeure conservée dans la source ou sa provenance. Les paragraphes sont reconstitués selon la syntaxe et la continuité du témoin, non selon les fins de ligne de l’OCR.

Les fonctions typographiques sont portées sémantiquement : expressions étrangères et titres d’ouvrages sont composés selon leur nature. Une date finale isolée est alignée à droite et ne prend pas de point final. La transcription source reste inchangée.

### 35.14.4. Tableaux de transcription — structure et composition

Un tableau de transcription est une donnée structurée, non un paragraphe typographique. Chaque entrée conserve séparément le signe ou caractère source, son nom, sa transcription et, lorsqu’elle existe, la remarque de prononciation. L’ordre des entrées appartient à la donnée ; le rendu ne le reconstruit jamais à partir d’une chaîne précomposée.

Dans la couche de lecture, les lignes du tableau se composent au fer à gauche, de façon compacte et régulière. Une remarque courte se place entre parenthèses après la transcription ; elle ne crée pas une colonne ou un paragraphe autonome. Les remarques générales qui suivent le tableau forment en revanche des paragraphes distincts. Le témoin source, sa disposition matérielle et sa provenance restent conservés.

Les caractères hébreux demeurent en caractères hébreux et les signes de transcription ne sont ni modernisés ni remplacés sans collation certaine. Toute diacritique dont la lecture exacte n’est pas établie reste explicitement en `review` ; une table visuellement propre ne vaut jamais validation philologique.

### 35.14.5. Listes d’abréviations — références bibliographiques normalisées

Une liste d’abréviations est une table de correspondance dont chaque ligne se termine par un point. Lorsqu’un sigle renvoie à un ouvrage, l’expansion est traitée par le normalisateur bibliographique commun : auteurs sous leurs formes d’autorité, titre et sous-titre selon la norme bibliographique active, lieu, éditeur, mention d’édition lorsqu’elle est nécessaire pour identifier l’édition citée, puis date. Le rendu s’arrête à la date ; si aucune date fiable n’est établie, il s’arrête au dernier champ bibliographique vérifié.

⛔ Les données de description matérielle ne paraissent pas dans cette liste : nombre de volumes, format (`in-4°`, `in-12`, etc.), pagination, planches, figures, cartes, dimensions, mention de texte explicatif ou toute autre description d’exemplaire restent conservées dans la source ou la notice bibliographique, mais sont exclues de l’affichage. La transcription source demeure inchangée.

Chaque entrée reste une ligne autonome au fer à gauche, sous la forme `sigle — référence.` ; `LXX` n’est pas une référence bibliographique et se rend simplement `LXX — Les Septante.`

Elles se lisent désormais par un onglet « Sommaire », dans le volet de gauche, à côté des livres. ⛔ Il ne paraît que pour une édition qui porte un apparat général : une bible ordinaire n’a rien à y mettre, et l’on ne montre pas un onglet qui ouvrirait sur du blanc. Ouvrir une pièce la met À LA PLACE du texte biblique — on ouvre un volume à sa page de garde, on ne lit pas les deux à la fois — avec son nom en titre, la portée qu’elle coiffe en rubrique au-dessus, et le retour au chapitre en pied.

⛔ Ce qui entre au sommaire se reconnaît à la PORTÉE du bloc, Bible, Testament ou groupe de livres, jamais à une liste d’intitulés tenue à la main. L’introduction d’un LIVRE n’en est pas : elle ouvre son livre, et c’est là qu’on la lit.

⚠️ Les blocs se groupent en PIÈCES, sans quoi le sommaire compterait soixante-deux lignes, dont quinze pour la seule bibliographie de l’auteur. Deux blocs consécutifs font une pièce quand ils partagent leur portée et leur NOM — ce qui précède le tiret, la queue ne disant que la pagination de l’imprimé — ou quand le second est un apparat de bas de page portant la MÊME PAGE IMPRIMÉE que le premier. C’est ainsi que trente-trois « Apparat de la page N » rejoignent les dix pages d’introduction générale qu’ils annotent. Douze entrées pour soixante-deux blocs. ⚠️ La consécution compte : deux pièces homonymes séparées par d’autres matières restent distinctes.

Le nom de la pièce s’écrit UNE fois, en tête. Les blocs qui le redisent perdent leur intitulé ; ceux dont la queue titre vraiment, « Introduction générale — § I. Ce qu’est la Bible », gardent le leur.

⚠️ Le sommaire part dans la MÊME vague que les versets : il ne coûte pas un aller-retour de plus, et le texte d’une pièce ne se charge qu’à son ouverture.

**Il se compose comme le sommaire d’une ŒUVRE** (décision de l’auteur, 28 août 2026). C’est le même objet, la table des matières d’un livre, et il n’avait pas à se présenter de deux façons. ⛔ Le sérif sur pastille verte qu’il portait venait de la liste des LIVRES, laquelle n’est pas une table des matières mais un index : on y cherche un nom qu’on connaît déjà, tandis qu’un sommaire se parcourt. ⚠️ Les rangs s’apparient par la FONCTION, non par la profondeur : la pièce est ce qu’on ouvre, elle prend donc le rang du premier niveau du sommaire d’une œuvre, vert et demi-gras quand elle est ouverte ; la portée ne s’ouvre pas, elle coiffe, et prend celui des rubriques du volet, en petit, espacé et pâle. Le premier essai les avait pris pour deux niveaux emboîtés, et les pièces, seul contenu de l’onglet, s’y lisaient comme les sous-entrées d’une rubrique qui n’existe pas.

### 35.14.6. Introductions générales, testamentaires et de groupes de livres — pièce logique et appareil intégré

Une introduction de portée Bible, Testament ou groupe de livres constitue une seule pièce logique, quel que soit le nombre de pages matérielles qu’elle occupe. Son titre de pièce n’est écrit qu’une fois. Les blocs physiques de page restent conservés comme témoins de provenance, mais une seule tête de pièce est rendue ; les continuations matérielles ne produisent ni nouvelle entrée de Sommaire, ni blanc de nouvelle notice, ni répétition du titre.

La hiérarchie interne suit exclusivement les divisions attestées du témoin. Les véritables rubriques et sections reçoivent leur niveau sémantique relatif à la pièce ; un chiffre ou un ordinal placé au début d’un paragraphe ne devient pas à lui seul un titre. Lorsque le témoin établit une série structurale sans fournir de rubrique autonome, la première phrase peut servir de libellé seulement dans les conditions du § 35.5.1, sans invention éditoriale. Les ordinaux numériques se rendent toujours `1.`, `2.`, etc., la forme imprimée restant conservée en provenance.

L’apparat de bas de page est intégré à la pièce sous forme de notes structurées. Chaque note conserve son numéro ou signe imprimé, sa page source et son texte de provenance ; la couche de lecture lui attribue une numérotation continue à l’intérieur de la pièce lorsque les numéros imprimés recommencent à chaque page. L’appel est attaché au mot, groupe de mots ou titre réellement annoté et se place conformément au § 13.4, jamais dans un bloc d’apparat séparé. Après migration vérifiée, les anciens blocs d’apparat matériel cessent d’être rendus, sans être supprimés de la source. Une ancre textuelle doit être unique dans la projection logique ; toute ambiguïté demeure en `review` jusqu’à résolution.

Une introduction propre à un livre biblique appartient au livre lui-même et non au Sommaire général de l’édition. Si la même matière a été importée à la fois comme pièce liminaire matérielle et comme introduction structurée du livre, la version structurée du livre est la surface de lecture normative ; la copie liminaire reste seulement comme provenance et ne se rend pas en doublon.

La restructuration, la normalisation typographique et le placement des notes n’altèrent jamais `text_content` ni le témoin source. Une projection reconstruite depuis OCR ou collation secondaire reste en `review` tant qu’une validation documentaire plus forte n’a pas été établie.

## 36. Le modèle d’onglets

Une barre d’onglets de PAGE se compose partout de la même façon. Elles étaient trois — Bibliothèque, Communauté, catalogue des Péricopes — et se distinguaient sur quatre axes à la fois : deux polices, trois corps, deux gris d’inactif, avec ou sans parts égales, avec ou sans séparateurs. Six barres du site donnaient six combinaisons différentes, sans qu’aucune décision les sépare. C’est la dérive déjà rencontrée sur les tailles de texte, les rayons d’angle et la couleur, transposée à un composant.

**La structure.** Les onglets se partagent la mesure à parts ÉGALES, chaque libellé centré dans sa case, un filet fin entre deux cases, le filet plein dessous et le trait de l’onglet retenu POSÉ sur ce filet, jamais ajouté dessous — sans quoi la barre gagne deux pixels au premier clic. ⛔ Les parts égales ne sont pas un ornement : à largeur libre, la barre se range au fer à gauche et le filet court seul sur la moitié droite de la mesure.

⚠️ **La barre prend la mesure de CE QU’ELLE COMMANDE, jamais celle de son conteneur.** La Communauté range ses couvertures sur 46,7 rem au milieu d’un conteneur qui en fait 71 : la barre, elle, courait sur les 71 et surmontait de très loin tout ce qu’elle annonçait, ses trois libellés jetés aux quatre coins. Chaque page pose donc sa mesure et la barre s’y centre. Là où cette mesure se calcule — la largeur d’une couverture et l’écart entre deux —, elle vit dans une seule paire de valeurs dont la grille et la barre dérivent toutes deux, faute de quoi elles se sépareraient au premier réglage.

**La police est celle du CHROME, c’est-à-dire le sans.** Le sérif appartient aux textes d’œuvre, corps comme titres (§ 18) ; une barre d’onglets n’est pas du corpus, c’est de l’interface. Deux des trois barres portaient pourtant le sérif.

⛔ **L’onglet retenu change de graisse ET d’encre ET reçoit son trait.** Deux rangs ne se distinguent jamais par la seule couleur. ⚠️ Le gris de l’inactif est le plus SOMBRE de ceux qui coexistaient : un onglet est un bouton, il se lit avant qu’on le clique.

⛔ **La graisse ne déplace RIEN, et cela ne peut pas reposer sur les parts égales seules.** Dès qu’une barre n’a plus de jeu à distribuer — un volet étroit, un téléphone —, passer un libellé en 600 l’élargit et pousse ses voisins. Mesuré sur « Nouveau Testament » : 113,67 px en 400 contre 116,14 px en 600, soit près de deux pixels et demi qui se propagent à toute la barre. Chaque libellé réserve donc d’avance sa largeur en 600, par un double invisible et de hauteur nulle. C’est ce qui rend le modèle vrai par construction plutôt que par coïncidence de mise en page, et ce qui a rendu au catalogue des péricopes la graisse qu’il avait dû abandonner en mobile.

**Un onglet qui commande des PANNEAUX et un onglet qui FILTRE ne se déclarent pas pareil.** Le premier est un `tablist`, et il promet des panneaux derrière lui. Une barre qui ne fait que restreindre une même liste — le partage par testament du catalogue des péricopes — est un groupe de filtres nommé, avec `aria-pressed`. Le dessin est le même, l’annonce ne l’est pas.

⛔ **Et la liste qu’une telle barre filtre ne REDIT pas ce que la barre dit.** Le catalogue des péricopes portait, sous « Tout », une rubrique « Ancien Testament » puis « Nouveau Testament », en capitales espacées et suivies d’un filet, qui coupait en deux la course des livres. Elle ne paraissait déjà plus lorsqu’un seul testament était à l’écran — l’onglet le nommant — ; elle est maintenant retirée aussi de « Tout ». La liste court d’une seule venue, de la Genèse à l’Apocalypse. L’ordre des livres marque le passage à qui le cherche, les onglets l’isolent à qui le veut, et une barre de titre au milieu de la course n’ajoutait qu’une halte.

⚠️ Le volet « Aller à un livre » garde, lui, ses deux intitulés. Là, ils ne coupent rien : ils rangent une grille d’abréviations sur quatre colonnes, où l’ordre seul ne suffirait pas à s’orienter. Une rubrique qui ORIENTE n’est pas une rubrique qui SÉPARE.

**Ce qui reste hors du modèle, et pourquoi.** Les barres de VOLET — les onglets du panneau de lecture d’une œuvre, ceux du volet des notifications — et la barre fixe des trois volets de la page Bible en mobile appartiennent à un autre registre : elles coiffent un panneau, non une page, et la dernière se compose en capitales espacées. Les unifier avec les onglets de page reviendrait à effacer une distinction qui porte du sens. La sous-barre de l’administration, elle, a ses propres règles, tenues par le nombre de ses entrées.

⛔ **Le nom `.cs-onglet` appartient à ce modèle, et à lui seul.** Les liens de la barre de NAVIGATION portaient ce nom bien avant lui. Le jour où le modèle a été posé dans la feuille globale, ils ont hérité de tout ce qui fait une barre de page : les parts égales, le filet bas de deux pixels, le décalage d’un pixel qui pose le trait sur le filet. Un seul lien en a souffert — « Communauté », le seul enfant DIRECT du flex de la barre, les autres étant enveloppés d’un `span` pour porter leur menu déroulant —, et il s’est étalé sur toute la place restante : 204,8 px mesurés en ligne pour un mot qui en demande 95. Les onglets de la barre de navigation s’appellent depuis `.cs-nav-onglet`. ⚠️ Le style écrit EN LIGNE n’a protégé de rien : il couvrait le remplissage, le corps et l’encre, et laissait passer `flex`, `text-align` et le filet — c’est-à-dire tout ce qui déplace. Deux dessins sans rapport ne partagent pas un nom de classe.

**Ce qui SURMONTE la barre se compose aussi partout de la même façon.** Un titre de page, puis la barre, et un rythme chiffré : vingt-deux pixels au-dessus du titre, quatorze entre le titre et la barre, quatorze sous elle. Le titre s’y compose sur un interligne de 1,1 et une chasse de 0,01 em — un interligne normal lui donnait quarante-deux pixels de haut pour vingt-huit de corps, soit onze pixels de blanc que rien ne justifiait. ⛔ Et le décalage sous la barre de navigation fixe ne se repose PAS sur la page : il est posé une seule fois pour tout le site, par `#cs-corps` ; le répéter le compte deux fois.

⛔ **Aucun ornement ne s’intercale entre le titre et la barre.** La Communauté portait un losange d’or sous le sien, la Bibliothèque n’en portait pas : deux pages sœurs ne s’annoncent pas de deux façons. Le losange a été retiré le 27 août 2026. ⚠️ Il tenait à lui seul l’écart entre le titre et la barre — un ornement qui sert de cale n’est plus un ornement ; l’écart est désormais une marge chiffrée, et il se lit dans le code.

⚠️ **La MESURE, elle, ne se copie pas.** La Communauté range trois couvertures de front et prend 71 rem ; la Bibliothèque n’a que du texte à ranger et en prend 56,25. C’est le rythme vertical qui est commun aux deux, non la largeur — chaque page prend la mesure de ce qu’elle contient, et sa barre la mesure de ce qu’elle commande.

### 36.1. La gouttière de défilement se réserve toujours

Presque toutes les pages du site sont un bloc centré par une marge automatique. Le jour où le contenu cesse de dépasser, la barre de défilement disparaît, la largeur utile gagne une quinzaine de pixels et le bloc SAUTE de sept vers la droite. Le défaut se lit comme un défaut du composant qu’on vient d’actionner, alors qu’il n’en vient pas : mesuré sur la Bibliothèque, passer à « Catalogue des traductions », dont la liste est courte, déplaçait toute la page de sept pixels sans que les onglets aient bougé d’un cheveu.

La gouttière est donc réservée en permanence sur le document, qu’il y ait de quoi défiler ou non. ⚠️ Le prix est une bande vide d’une quinzaine de pixels sur les pages qui ne défilent pas ; il est moindre qu’une page qui se déplace sous les yeux du lecteur au moindre changement d’onglet.

### 36.2. Un menu de navigation DIT ce qu’il ouvre

Une liste de noms de pages n’apprend rien à qui ne connaît pas déjà le site, et « Statistiques » ou « Péricopes » surtout ne s’expliquent pas d’eux-mêmes. Chaque entrée du menu « Aller plus loin » porte donc, sous son nom, une ligne qui dit ce que la page contient, tirée de la description de cette page : ⛔ on n’y promet que ce qu’elle porte. Devant le nom vient un emblème au trait.

Les emblèmes suivent la grammaire de ceux des couvertures : une viewBox carrée, aucune couleur écrite, tout en `currentColor`, si bien qu’ils prennent l’encre de la ligne qui les accueille et suivent le thème sans être déclinés deux fois. ⛔ Aucun ne doit se confondre avec une marque déjà employée : l’étoile dit « favori », le quadrilobe « citation choisie », le cœur « soutenir », la loupe « chercher », le chevron « avancer ».

⚠️ Ils se jugent à la taille RÉELLE, autour de dix-sept pixels, jamais dans l’éditeur. Deux des cinq ont dû être redessinés à ce titre : une accolade se lisait comme une simple parenthèse, et une frise à repères comme trois petits points, indiscernable des barres voisines. C’est la leçon déjà apprise sur les emblèmes de couverture, dont cinq des neuf premières ébauches passaient pour autre chose une fois rendues.

Sur un téléphone il n’y a pas de survol, donc pas de glose : l’emblème y est le seul indice de ce que la page contient, et il accompagne l’entrée dans le panneau déplié. Le panneau garde en revanche une ligne par entrée — quinze entrées à deux lignes en feraient un rouleau.

### 36.3. La recherche rapide : sur quoi elle se mesure, et ce qu’elle montre

⛔ **Un panneau de résultats ne prend pas la mesure de son CHAMP.** Celui de la barre s’accrochait par ses deux bords au conteneur du champ, et valait donc la largeur du champ plus la loupe : 154 px mesurés en ligne à 1 280, où « Anonyme / Symboles et confessions de foi » se pliait en trois lignes. Le rapport est même inverse : le champ se resserre par paliers quand la barre manque de place, si bien que le panneau rétrécissait à mesure qu’il avait davantage à dire. Il s’accroche donc par la DROITE, au bord des outils, et se déplie vers la gauche sur la place libre du milieu de la barre — le seul côté où l’on est sûr de ne buter contre rien. Sa largeur est en rem, comme tout ce qui se mesure ici : la police racine grandit avec la fenêtre au-delà de 1 440 px, et un panneau posé en pixels resterait le même ruban à 2 400.

**Une œuvre trouvée dit son ÉDITION.** Un même titre du même auteur paraît plusieurs fois — la Cité de Dieu chez Migne en 1845 pour le latin, chez Louis Vivès en 1870-1873 pour la traduction de H. Barreau et M. Charpentier —, et un titre suivi de son auteur ne dit pas laquelle on va ouvrir. Sous l’auteur viennent donc le traducteur, la maison, la ville et l’année, composés comme à l’étagère de la bibliothèque et sur la page de titre : une phrase et des virgules, jamais une suite d’abréviations. ⚠️ Faute de traducteur, c’est la LANGUE qui désigne l’édition — « Texte original latin » — et non un blanc : une édition en langue originale n’a personne à nommer, ce qui ne la dispense pas de se distinguer de la traduction du même titre.

⚠️ **Ce qu’une recherche va chercher EN SECOND se borne à ce qu’elle montre.** Le RPC de la recherche rapide rend un titre et son auteur, et rien de plus : c’est une recherche, non un catalogue. Les colonnes de l’édition viennent d’une seconde lecture, bornée aux trois œuvres affichées, qui ne retarde pas les titres — ils sont déjà posés quand elle part. De même la table des éditeurs, qui rend aux maisons leur nom répertorié : elle n’est lue qu’à la première œuvre trouvée qui porte un éditeur, la barre étant sur toutes les pages et n’ayant pas à charger une table de référence tant qu’on ne cherche rien.

⛔ **La barre du volet de lecture de la Bible entre au modèle, et ses libellés perdent leurs CAPITALES** (décision de l’auteur, 28 août 2026). « Livres » et « Sommaire » s’y écrivaient en capitales espacées, composées à la main : deux mots criés en tête d’un volet de lecture, quand aucune autre barre du site n’en porte. C’était la sixième barre recomposée hors du modèle, ce que la présente section proscrit depuis qu’elle existe. La règle vaut pour toute barre à venir : on prend le modèle, on ne le redessine pas.

## 37. La notice d’une traduction — le bandeau et l’encart

Une notice de traduction porte DEUX images, et non une seule cadrée deux fois. Le bandeau est horizontal : il coiffe la carte, le titre s’y écrit par-dessus, et c’est lui que l’on voit quand la notice est fermée. L’encart est au format portrait : il ne paraît que dans le bloc déplié. ⛔ On ne dérive jamais l’un de l’autre. Une vue large de monastère serrée dans une boîte de deux tiers ne rend qu’une bande de ciel, et une image debout écrasée dans quatre-vingt-douze pixels de haut ne montre qu’un col : c’est exactement ce que faisait l’image unique jusqu’ici. Les deux vivent dans `traductions.photo` et `traductions.photo_encart`, se déposent séparément, se cadrent séparément — `photo_position.bandeau` et `photo_position.encart` — et se réduisent dans deux boîtes dont l’une est couchée et l’autre debout. Tant qu’une notice n’a pas reçu son portrait, le bandeau en tient lieu, cadré en portrait : elle ne se troue pas en attendant.

**Le bandeau prend TOUT son bloc, ouvert comme fermé.** Il tient la carte bord à bord, sans marge ni filet, et le titre s’écrit sur l’image même, non sur une marge. ⛔ Le cadre a été essayé puis écarté le 27 août 2026 : déplié, le bandeau reculait de dix pixels sur ses quatre côtés, le fond de la carte lui tenant lieu de passe-partout, un filet le bordant et le titre entrant avec lui. Décision de l’auteur, l’essai fait : un bandeau occupe entièrement l’espace de son bloc. L’encart en portrait, lui, demeure — c’est là, et là seulement, que la notice porte une image détachée.

**L’encre du bandeau est TOUJOURS le crème, et c’est un VOILE qui la rend lisible.** Le bandeau mesurait auparavant la luminance de sa photo pour choisir entre une encre crème et une encre noire ; le noir revenait sur les images pâles — la Segond, son lac, son ciel. ⛔ Une encre noire cernée d’un halo blanc posée sur une peinture n’est pas une composition, c’est un pis-aller : elle est écartée, et la mesure de luminance avec elle — un décodage en canevas par notice et une dépendance au CORS en moins. C’est désormais un dégradé brun très sombre, ancré à gauche et éteint avant le milieu de l’image, qui fabrique le contraste que la peinture ne promet pas. Toutes les notices reçoivent ainsi le MÊME sol, quelle que soit la peinture qui les coiffe.

⚠️ Trois réglages tiennent avec lui. Le voile est BRUN, non noir : un noir neutre posé sur une peinture ancienne la refroidit et la fait paraître grise. L’ombre du texte se réduit à UNE couche courte, le voile portant le contraste : les trois halos de vingt pixels qui la précédaient bavaient autour des lettres et se lisaient comme une salissure. Et aucune ligne ne court au-delà du voile — la mesure du bloc de texte est bornée, si bien qu’une méta trop longue, celle de la Bible française du XIIIe siècle, se plie dans le sombre au lieu de finir sur les quadrilobes de l’enluminure. L’assombrissement général de l’image, lui, redevient léger : écrasé, il éteignait la moitié droite du tableau, qu’aucune ligne ne recouvre.

⚠️ Ces valeurs vivent dans un module partagé, non dans la page. L’aperçu de cadrage de l’administration se veut une COPIE EXACTE du bandeau public : deux jeux de constantes auraient dérivé au premier réglage, et l’administrateur aurait cadré sur un rendu qui n’existe pas.

**L’encart flotte dans le texte ; il ne tient pas une colonne.** ⛔ Le volet déplié n’est pas deux colonnes. L’image y a tenu une colonne entière, collée à trois bords et séparée du texte par un filet : sa forme dépendait alors de la longueur de la notice — une bande de cent quarante sur six cents quand le commentaire était long — et il restait sous elle une bande blanche que rien ne venait remplir. L’encart a donc une proportion FIXE, deux tiers, il ne touche aucun bord, et le texte l’entoure puis reprend toute la mesure sous lui. Le bloc de texte est un contexte de formatage à lui seul, faute de quoi une notice plus courte que l’encart le laisserait dépasser hors de la carte.

⚠️ **Sous sept cents pixels, l’encart s’efface.** Sur un téléphone de trois cent soixante-quinze, la carte dispose de trois cent vingt-sept pixels : l’encart en prenait cent quarante et un, et il restait cent quarante-quatre pixels de texte JUSTIFIÉ, soit dix-sept signes par ligne. C’est la règle déjà posée pour la carte d’auteur. Le bandeau, lui, demeure : le téléphone voit donc une image des deux, et non aucune.

**Le fond de la fiche prend la TEINTE de son encart — et rien d’autre.** Le volet déplié n’est plus le blanc uni de la carte : il reçoit la teinte dominante de l’image en portrait, et sa saturation. ⛔ Il n’en reçoit PAS la clarté. La clarté appartient au THÈME, et à lui seul : très haute au Clair, très basse au Cuir, où la saturation est de surcroît divisée — à clarté basse, une même saturation pousse beaucoup plus de couleur, et le brun du thème tournait au roux. Une fiche se lit sur un fond CLAIR au Clair, quelle que soit la couleur du tableau qui la surmonte : le tableau n’a de droit que sur la teinte. La teinte se pose en ligne, en deux propriétés personnalisées ; les deux clartés sont écrites une fois pour toutes dans la feuille globale, une par thème. ⚠️ CLAIR ne veut pas dire BLANC. La clarté du Clair a d’abord été posée à 96,5 %, par crainte de salir la fiche : il n’en restait, sur le blanc de la carte, qu’un écart de six à douze valeurs sur deux cent cinquante-cinq, et l’auteur ne voyait rien paraître. À 91 % le ton se voyait enfin ; il est remonté à 95 % à mesure que l’enduit s’est épaissi, le gris de celui-ci assombrissant déjà le fond de son côté. La Bible Crampon y donne rgb(246 242 239) contre le #fff de la carte : une craie chaude, et non plus un ivoire.

**Le fond porte un ENDUIT.** Deux bruits gris se posent sur le ton : un grain serré, qui donne le sable de l’enduit, et une NUÉE très large, qui donne les inégalités de la pose. ⛔ Un seul ne suffit pas — le grain seul fait du bruit de capteur, la nuée seule fait une tache. Tous deux sont désaturés, la couleur venant de la teinte et jamais de la texture.

⛔ **C’est la NUÉE qui porte le travail, non le grain.** Posée d’abord à une fréquence de 0,014 et à six pour cent, elle laissait le fond « encore trop uniforme » : ses taches étaient plus petites que le bloc, et leur moyenne redonnait un aplat. Il faut des plaques PLUS LARGES QUE LA COLONNE DE TEXTE — la fréquence est descendue à 0,006, soit deux cents pixels — et une amplitude franche, treize pour cent, en `turbulence` plutôt qu’en `fractalNoise`, qui veine au lieu de nuager. Le grain, lui, redescend à quatre et demi : il n’est là que pour le sable. ⚠️ Le bruit étant gris, il assombrit un fond clair et ÉCLAIRCIT un fond sombre, et il se voit deux fois plus au Cuir pour la même opacité : l’enduit y est donc dessiné à part, deux fois plus discret. Aucun fichier image n’est déposé pour cela — le motif est un SVG écrit en ligne qui se répète sans couture.

⛔ **Un ton COMPLET a été essayé, puis écarté le même jour.** Teinte, saturation ET clarté prises à l’image, puis mêlées au fond par color-mix : les peintures étant sombres — elles le sont presque toutes —, le blanc de la fiche se salissait d’un beige sourd au lieu de se teinter, et la dose qui faisait paraître la plus terne des six assombrissait toutes les autres. C’est le même partage que pour l’encre écrite SUR une photographie, pris par l’autre bout : là, une couleur qui n’a pas de sol thématique se compose en dur ; ici, une clarté qui en a un se compose en jeton.

**La dominante n’est pas la moyenne des pixels** : la moyenne d’un paysage est une boue grise, les complémentaires s’y annulant. Les teintes se rangent en vingt-quatre seaux de quinze degrés, pondérées par leur saturation, gris, noirs et blancs écartés d’avance — ils sont les plus nombreux dans une photographie ancienne et n’ont pas de teinte à donner ; le seau le plus lourd donne le ton, par moyenne CIRCULAIRE, faute de quoi le milieu de deux rouges à 350° et à 10° tomberait sur le cyan. ⛔ Sa saturation est bornée TRÈS BAS, et l’écart entre les bornes est étroit : quatorze à vingt-huit pour cent. Un fond de fiche n’est pas un aplat de couleur, c’est un LAIT DE CHAUX — il porte une teinte sans porter une couleur. Les bornes ont d’abord été posées à trente-deux et soixante ; l’auteur a jugé le résultat trop vif, et il l’était : la même image y donnait un pastel là où il faut une craie teintée. Le calcul n’a lieu qu’à la PREMIÈRE ouverture d’une notice et son résultat est retenu : six décodages au chargement d’une page dont on n’ouvrira qu’une fiche ne se justifieraient pas.

## 38. La fiche « À propos de cette traduction » — au modèle de la fiche d’auteur

La fiche qui s’ouvre depuis le volet de lecture de la Bible se compose désormais comme la FICHE D’AUTEUR, et non plus pour elle-même. Décision de l’auteur, 28 août 2026. Même cadre, même en-tête, mêmes titres de section, mêmes deux colonnes : à gauche ce qui se lit, à droite ce qui le documente. Les deux fiches disent la même chose d’objets voisins, un homme et le livre qu’il a traduit, et rien ne justifiait qu’elles se présentent chacune à sa façon. Celle-ci était restée une liste d’étiquettes sous un titre.

**Elle s’ouvre sur un PORTRAIT.** C’est l’encart, l’image debout de la section 37, et jamais le bandeau : une image couchée serrée dans un cadre debout ne montre pas ce qu’un portrait montre, et le cadre est celui de la fiche d’auteur, au trait près. Les repères de la traduction, la langue, la confession et la première publication, s’écrivent sous le nom en capitales espacées, comme les dates, la langue et les traditions d’un auteur. ⛔ Ils vivaient jusqu’ici dans la section repliable : on ne range pas derrière un dépli ce qui identifie l’objet qu’on lit. Une notice sans portrait ouvre sur son seul nom, sans cadre vide.

**La notice prend la composition de la fiche d’auteur** : ses intertitres deviennent des titres de section, en sérif italique et à l’encre d’accent, et sa prose devient la prose justifiée de la vie d’un auteur. ⚠️ Une bibliographie en est une part, et elle se compose comme la prose qu’elle accompagne : laissée au navigateur, elle paraissait plus grosse que le texte qu’elle sert.

**Ce qui reste replié ne concerne plus que l’ÉDITION** : son titre, son année, son lieu, son éditeur, sa source numérique, sa graphie, sa licence, son état de vérification. Une section repliable est faite pour ce qu’on consulte, non pour ce qu’on lit. Elle tient toute la mesure, sous les deux colonnes, sa colonne d’étiquettes n’entrant pas dans une colonne de fiche.

**Les GRAVURES d’une édition paraissent dans sa fiche.** Une édition illustrée ne se dit pas seulement en prose, et le lecteur qui demande à en savoir plus a le droit de voir de quoi elle est faite. La colonne de droite en porte six, sous la chronologie quand il y a les deux. ⛔ Elles appartiennent à la FAMILLE éditoriale et non à la traduction : une édition bilingue les publie une fois pour ses deux textes, et les rattacher au français les retirerait au latin. ⛔ Six prises en échantillon RÉGULIER, jamais les six premières : les gravures suivent l’ordre du livre, et les six premières d’une bible entière ne montreraient que la Genèse. Le compte total est dit sous la mosaïque, et la fiche renvoie au texte pour les autres : une planche qu’on montre en partie se dit telle. Chaque gravure paraît ENTIÈRE dans son passe-partout, jamais recadrée, leurs formats allant du carré au double folio ; un clic l’ouvre en grand, dans un cadre clair et non sur le calque sombre, pour que sa légende garde l’encre du site.

⛔ **La chronologie d’une traduction n’avait AUCUNE date, depuis l’origine.** La frise, partagée avec la fiche d’auteur, lisait la date courte ; la vue des traductions ne porte que la date rédigée, et la colonne des dates restait donc vide sur les six chronologies du corpus. Une chronologie sans dates n’est plus une chronologie, c’est une liste. La frise lit maintenant la date courte, sinon la date rédigée. ⚠️ La trouvaille de méthode vaut au-delà de ce cas : le défaut était couvert par un changement de type en deux temps, qui promettait à la frise un champ que la vue n’a jamais eu. Une colonne qui « ne s’affiche pas » se cherche là.


### Règle de synchronisation des deux chartes

Toute modification, addition, suppression, rectification ou arbitrage apporté à la charte doit être reporté dans la même passe, avec un contenu normatif identique, dans les deux emplacements de référence : la charte Supabase (`parametres.charte_ia`) et la charte du centre de contrôle (`controle_sections`, section `qualite`). Aucune modification de charte ne peut être considérée comme achevée tant que les deux versions ne sont pas synchronisées et vérifiées. En cas de divergence, la modification est réputée incomplète : il faut relire les deux textes, déterminer la règle effectivement validée, puis remettre les deux chartes à l’identique avant de poursuivre le chantier.

### 23.6.1. Préflight de schéma et staging avant resegmentation

Avant toute mutation textuelle ou structurelle, interroger le schéma réel des colonnes touchées (`information_schema.columns`, contraintes et dépendances). Une règle historique d’écriture ne doit jamais conduire à écrire explicitement dans une colonne devenue générée. Si une colonne dérivée est déclarée `GENERATED ALWAYS`, sa valeur est recalculée par PostgreSQL dans la même mutation de la colonne source : on modifie uniquement la colonne source et l’on vérifie ensuite la valeur générée. Dans l’état actuel de `segments`, `texte_norm` est générée par `public.norm_fr(segment_texte)` ; il est donc interdit de la placer explicitement dans le `SET` tant que cette définition de schéma demeure active. Si le schéma change de nouveau, la règle d’écriture doit être réévaluée avant la première mutation.

Toute resegmentation non triviale doit être préparée hors du corpus actif, de préférence dans `internal`, puis soumise avant remplacement à des contrôles déterministes : nombre d’unités et de segments, recomposition exacte de chaque unité, validité des offsets, empreintes SHA, conservation et position des marqueurs de notes, dépendances, absence de perte textuelle et distribution des longueurs. Le remplacement du live ne se fait qu’après réussite de ces contrôles et dans une transaction unique. Les rubriques ou titres structurels sont portés par des unités de type `heading` et par la hiérarchie ; ils ne doivent pas être dupliqués comme segments de corps. Lorsqu’un chantier nécessite des insertions répétées dans l’ordre documentaire, on peut créer une seule fois des intervalles d’ordre suffisamment larges, après audit des dépendances, puis resynchroniser les références vivantes qui mémorisent cet ordre ; on évite ainsi les renumérotations globales à chaque passe et on ne compacte qu’à la clôture.

Une resegmentation qui supprime ou remplace des segments peut déclencher des suppressions en cascade dans les tables dépendantes, notamment les ancres de notes. Avant le `DELETE`, inventorier les dépendances et sauvegarder les lignes dépendantes. Si le remplacement exige de nouveaux `segment_key`, `segment_numero` ou `source_unit_id`, les ancres doivent être remappées ou recréées dans la même transaction que les nouveaux segments, puis vérifiées depuis la base avant `COMMIT`. Un `UPDATE` prévu après la suppression ne constitue pas une protection si la ligne dépendante peut déjà avoir été supprimée par cascade.

### 23.6.2. Frontières documentaires et frontières sémantiques

Une frontière produite par un OCR, un HTML, une API, un export Word ou un moteur de lecture ne vaut jamais, par elle-même, preuve d’un alinéa de l’édition. Les paragraphes, retours intentionnels et changements de niveau sont établis d’abord par le fac-similé ou par un encodage source dont la fonction documentaire est certaine. Les fins de page, de colonne, de ligne OCR et les découpages d’un extracteur ne doivent pas être promus en paragraphes.

Lorsqu’une resegmentation doit avancer avant que tous les alinéas aient pu être attestés, employer la frontière documentaire certaine la plus proche et la plus large — par exemple chapitre, section numérotée, paragraphe explicitement balisé — comme `source_unit_id`. À l’intérieur de cette unité, créer des segments sémantiques avec offsets exacts et rangs continus, sans prétendre que ces segments sont des paragraphes de la source. Le statut de la frontière documentaire encore à contrôler doit rester explicite dans les métadonnées. Une vérification ultérieure du fac-similé peut subdiviser l’unité source sans réécrire le texte.

La longueur ne décide jamais seule d’une coupure. Elle sert à repérer un segment à relire. Une coupure n’est admise qu’à une articulation syntaxique ou argumentative sûre ; un découpage à la phrase peut servir de présélection, mais les périodes longues, citations, objections, réponses et énumérations sont relues avant publication. Si le texte legacy présente une fusion, une inversion, une répétition ou une lacune à une jonction de page, la source est recollationnée avant toute resegmentation définitive.

Lorsqu’un paragraphe de lecture est créé sans correspondre à un alinéa attesté de la source, il s’agit d’une frontière éditoriale, non documentaire. La source reste découpée selon ses paragraphes attestés dans `oeuvre_texte_unites`; la couche de lecture peut subdiviser ces unités par `segments.paragraphe` pour améliorer la lisibilité. La première frontière d’un paragraphe de lecture doit conserver dans les métadonnées une origine explicite (`source` ou `editorial`) ainsi que le paragraphe source auquel elle appartient. Une frontière éditoriale ne doit jamais être présentée ultérieurement comme un alinéa du témoin.

### 35.4.3. Corps des introductions longues

Le style de composition `introduction` est réservé aux préambules brefs qui se tiennent réellement à l’écart du fil de lecture. Lorsqu’une introduction de livre est longue et structurée en plusieurs divisions, son titre ou son conteneur conserve sa nature d’introduction, mais les développements placés sous les titres analytiques se composent comme de la prose normale : romain, justification ordinaire, mesure et marges ordinaires. Dans le registre Fillion, ces développements emploient le style de rendu `commentaire_section` (I3), et non `introduction_sous_section`. Les vrais titres analytiques restent à leur niveau T4. La transcription source n’est jamais modifiée pour cette distinction de composition. Une brève introduction de péricope ou un véritable préambule court peut conserver un style `introduction_*` lorsque sa fonction éditoriale le justifie.
