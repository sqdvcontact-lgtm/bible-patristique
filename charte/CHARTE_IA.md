# Charte éditoriale et technique de Corpus Scriptura

Cette charte est la seule version normative. Elle décrit l’état voulu du corpus, de la base et des procédures. Les journaux de chantier, bilans chiffrés, listes d’œuvres traitées et anciennes décisions ne lui appartiennent pas.

Elle vit dans **`parametres.charte_ia`**, et nulle part ailleurs : c’est l’unique boîte à règles. `charte/CHARTE_IA.md` n’en est qu’un miroir, régénéré par `node scripts/synchroniser-charte-supabase.mjs --pull` ; ⛔ ne jamais l’éditer à la main, une correction portée sur le miroir se perd au premier `--pull`. `AGENTS.md` porte les règles de CODE du dépôt et renvoie ici pour la doctrine.

En cas de divergence entre une habitude, un script ancien et cette charte, la charte prévaut. Si le schéma de base ou le code ne permet pas encore d’appliquer une règle, on corrige d’abord l’outil. On ne dégrade jamais les données pour les adapter à un outil obsolète.

## 1. Principes directeurs

### 1.1 Fidélité

Le corpus publie des éditions identifiées. Il conserve leurs mots, leur ordre, leur langue et leurs particularités significatives. On corrige une faute certaine d’OCR ou une coquille manifeste en la confrontant à la source. On ne modernise ni le vocabulaire, ni la syntaxe, ni l’orthographe historique par convenance.

Une forme surprenante n’est pas une erreur par elle-même. En cas de doute, consulter le fac-similé ou le document source, conserver la leçon attestée et signaler l’incertitude dans le dossier de travail.

### 1.2 Complétude

L’objectif est une œuvre intégrale. Les contrôles portent sur les commencements, les fins, les divisions, les paragraphes, les notes et les endroits où l’OCR saute facilement une ligne. Les pages du fac-similé peuvent servir de repères de contrôle sans devenir une structure conservée dans le corpus. Une lacune matérielle ne se comble pas par invention. Le marqueur éditorial de lacune `[…]` est autonome dans la composition : lorsqu’il suit un mot, une espace le précède ; lorsqu’un mot le suit, une espace les sépare. Il ne se colle jamais au mot précédent (`mot […]`, jamais `mot[…]`). Les appels de note accolés au marqueur obéissent à leur convention propre et ne suppriment pas cette espace avant la lacune.

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

**Contrôle des codepoints d’espacement.** Un audit typographique ne se contente jamais de vérifier qu’une espace est présente à une position normée : il contrôle explicitement son point de code. `U+0020`, `U+00A0` et `U+202F` sont comptés séparément. Pour les éditions soumises à la normalisation du § 3.2, on exige `U+00A0` avant le deux-points, `U+202F` avant le point-virgule, le point d’exclamation et le point d’interrogation, et `U+202F` après `«` et avant `»`. Un contrôle qui conclut seulement « espace présente » est insuffisant et ne peut clore une passe typographique ; le postcontrôle doit vérifier l’absence du mauvais codepoint aux positions concernées.

Normaliser la typographie n’autorise jamais à moderniser l’orthographe, la morphologie, le vocabulaire ou la syntaxe. Une édition qui imprime `avoit` reste `avoit`, jamais `avait`.

Les témoins médiévaux et les couches diplomatiques échappent à cette normalisation glyphique générale : ils conservent les distinctions prévues par leur convention de transcription. Les éventuelles couches développées ou modernisées restent séparées conformément au § 14.

Les espaces de bord des segments sont supprimées. Dans les éditions non diplomatiques, une double espace accidentelle est automatiquement réduite à une seule espace lorsqu’elle n’a aucune fonction documentaire. La recomposition d’un paragraphe insère une espace simple entre deux segments, sauf lorsqu’un signe, `join_before` ou un balisage exige une jonction différente et contrôlée.

**Sauts de ligne et séparateurs.** Les sauts de ligne intentionnels attestés par l’édition source sont retranscrits et conservés. Cette règle vise les retours ayant une fonction textuelle ou éditoriale — vers, énumération, prière, titre composé, rupture volontaire ou disposition significative — et non les simples fins de ligne imposées par la largeur de la page ou de la colonne. Un saut de ligne ne crée pas à lui seul un nouveau paragraphe ni un nouveau segment.

Lorsqu’une rupture est matérialisée par un astérisme, un astérisque, un fleuron ou un signe équivalent (`⁂`, `*`, etc.), le signe lui-même est retranscrit à sa position et la rupture qu’il marque est conservée. Il n’est ni supprimé comme bruit OCR, ni remplacé silencieusement par un simple blanc. Si le signe entre en conflit avec la syntaxe de balisage — notamment l’astérisque de Markdown — le stockage emploie un échappement ou une représentation littérale reconnue par l’application afin que le signe soit rendu comme caractère de la source, jamais comme italique.

**Nombres, dates, siècles et unités.** Dans le texte d’une édition source, la graphie des nombres est conservée, sauf règle explicite de normalisation. Dans les textes éditoriaux composés par Corpus Scriptura, une quantité ordinaire intégrée à la phrase s’écrit en lettres : `trois jours`, non `3 jours`. Les références, dates, mesures, pourcentages, tableaux et données techniques conservent naturellement leur notation chiffrée lorsqu’elle est requise.

⚠️ **La mention d’édition s’écrit en TOUTES LETTRES** (décision de l’auteur, 4 septembre 2026) : `deuxième édition`, jamais `2e édition` — et l’abréviation s’ouvre avec l’ordinal, `2e éd.` et `2e édit.` étant proscrits au même titre. La règle vaut pour tout ce que Corpus Scriptura compose : notices publiques, libellés d’administration, couches de LECTURE d’un apparat. ⛔ Elle ne vaut pas pour la couche SOURCE, où la graphie du témoin est conservée : « p. 510 de la 2e édit. » reste tel quel dans le texte transcrit, et ne se corrige que dans la lecture qui le double. ⚠️ Corriger un ordinal dans une couche de lecture ALLONGE la chaîne : les empans d’italique qui l’indexent (`inline_spans`) se recalculent DANS LA MÊME ÉCRITURE, depuis les intitulés eux-mêmes et non par un décalage arithmétique, puis se vérifient en relisant chaque empan. La table des ordinaux vit dans `app/lib/mentionEdition.ts`, avec ses tests ; au-delà du vingtième rang elle écrit `édition n° 24`, ⛔ jamais `24e`.

Une date éditoriale s’écrit `23 août 2026` : jour sans zéro initial, mois en toutes lettres et en bas de casse, année en chiffres arabes.

Une mention de siècle adopte partout la forme `IVe siècle` : le nombre romain est rendu en petites capitales, le `e` en exposant et le mot `siècle` est toujours écrit en entier. L’abréviation `s.` n’est pas conservée comme forme normalisée. Une forme ambiguë telle que `S.` n’est toutefois jamais développée mécaniquement : le contexte doit d’abord établir s’il s’agit de `siècle`, de `saint` ou d’une autre valeur. Les nombres romains ne sont pas composés en petites capitales hors de cet emploi des siècles. Lorsqu’un chiffre romain qualifie immédiatement un nom ou une désignation, il est précédé d’une espace insécable `U+00A0` : `Grégoire II`, `livre IV`, `tome XII`.

Les ordinaux éditoriaux suivent les formes `1er`, `1re`, `2e`, `3e`, etc., avec le suffixe `er`, `re` ou `e` composé en exposant. Les formes développées `1ère`, `2ème`, `3ème`, etc. sont proscrites dans les textes composés par Corpus Scriptura.

Les grands nombres prennent une espace fine insécable `U+202F` comme séparateur des milliers : `12 500`. Les décimales emploient la virgule française : `3,14`, jamais `3.14` dans un texte éditorial français.

Entre un nombre et un symbole ou une unité, employer une espace fine insécable `U+202F` : `25 %`, `10 km`, `5 kg`.

Les références de page emploient `p.` au singulier et `pp.` pour une plage ou plusieurs pages : `p. 12`, `pp. 12-15`. Le trait d’union est simple. L’abréviation latine `sq.` est composée en italique : `p. 12 *sq.*`.

Pour l’abréviation de numéro, ne pas employer le signe degré `°`. Composer le `o` en exposant, et `os` en exposant au pluriel ; au pluriel, les lettres `o` et `s` se suivent sans aucune espace. Une espace fine insécable `U+202F` suit l’abréviation : `nᵒ 12`, `nᵒˢ 12-15`.

Les intervalles ordinaires emploient un trait d’union simple sans espaces : `2020-2025`, `pp. 12-15`. La convention biblique interchapitres reste distincte et conserve les espaces autour du trait d’union : `Gn 1, 30 - 2, 3`.

**Abréviations et casse de la source.** Hors des règles expressément fixées par la charte — notamment les références bibliques et les siècles — les abréviations de l’édition source sont conservées. Ne jamais développer automatiquement une abréviation ambiguë. La casse des noms religieux (`Dieu`, `Seigneur`, `Écriture`, `Église`, `Apôtre`, `Prophète`, `saint`, etc.) suit l’édition reproduite ; aucune harmonisation générale ne la remplace.

**Contrôle des séquences en capitales dans les couches de lecture.** Lorsqu’une couche SOURCE diplomatique est doublée d’une couche de LECTURE, un audit de casse ne se limite jamais aux noms propres. Il balaie exhaustivement toute suite lexicale de deux capitales ou davantage, puis classe chaque occurrence. Les mots et locutions de prose dont les capitales ne portent qu’une emphase typographique du témoin sont ramenés à la casse syntaxique courante dans la LECTURE (`MONSEIGNEVR` → `Monseignevr`, `LA VEINE DES POVRPRES` → `la veine des povrpres`), sans moderniser l’orthographe ni les graphies historiques (`v/u`, `i/j`, etc.). Les sigles, chiffres romains et titres ou rubriques dont la casse source doit être restituée restent inchangés. La couche SOURCE n’est jamais modifiée par ce contrôle. Une passe de casse n’est close qu’après un second balayage exhaustif et zéro séquence non classée.

### 3.3 Guillemets

Le premier niveau français emploie `« … »`. Une citation enchâssée emploie `“ … ”` ou la forme attestée par l’édition si elle est cohérente. Les guillemets droits issus de l’OCR sont corrigés.

Lorsqu’une citation entre guillemets français constitue un énoncé autonome, fermé sur lui-même, et ne poursuit pas la syntaxe de la phrase d’accueil, son premier mot prend une majuscule : `« D’abord… »`. Une citation intégrée à la syntaxe de la phrase d’accueil conserve la minuscule requise par cette syntaxe. Cette distinction est contextuelle : la seule présence d’un deux-points ne suffit pas à conclure.\n\n**Capitale initiale après fin de phrase — règle translinguistique.** Dans toute couche éditoriale de lecture de Corpus Scriptura, quelle que soit la langue — français, latin, grec translittéré ou autre — une phrase qui commence après un point final, un point d’interrogation ou un point d’exclamation prend obligatoirement une capitale initiale. La règle vaut donc explicitement pour le latin. Elle ne s’applique ni au seul fait de commencer un segment, ni à un point abréviatif qui ne ferme pas la phrase. ⛔ La casse ne sert jamais à justifier ou à inventer la ponctuation : avant de capitaliser, établir que le signe fort appartient réellement au texte éditorial retenu. Si le témoin porte une virgule là où l’OCR ou une transcription secondaire porte un point, on corrige d’abord la ponctuation et l’on conserve la minuscule syntaxiquement requise : `… et maiores sunt, sed nox illa sit dolor :`, non `… et maiores sunt. Sed nox…`.

La ponctuation d’une citation, sa place de part et d’autre du guillemet fermant et la sortie des citations longues relèvent du § 3.8.

Un appel de note appartient au passage annoté et se place toujours avant le guillemet fermant : `les sarments[[3]] »`. Il ne se place jamais après `»`, `”` ou `"`.

Dans les textes éditoriaux de Corpus Scriptura, le terme théologique `consubstantiel` est toujours placé entre guillemets français : `« consubstantiel »`. Cette convention vaut notamment lorsqu’on nomme le terme du symbole de Nicée. Elle ne modifie jamais une citation ni le texte d’une édition source, dont la ponctuation et les guillemets sont conservés conformément au principe de fidélité.

### 3.4 Tirets et traits d’union

Le tiret demi-cadratin `–` sert aux incises et aux répliques. Une incise normalisée prend une espace insécable `U+00A0` après le tiret ouvrant et avant le tiret fermant : `– incise –`. Lorsqu’une incise est identifiée avec certitude, sa ponctuation est normalisée systématiquement sous cette forme, même si l’édition emploie des virgules ou des parenthèses : cette transformation appartient à la liste blanche typographique. Elle n’autorise toutefois aucune conversion mécanique de toutes les virgules ou parenthèses ; la nature incidente doit être établie par le contexte. Le trait d’union simple `-` reste réservé aux mots composés, aux formes grammaticales et aux intervalles qui l’exigent. Le tiret cadratin `—` n’est conservé que s’il appartient réellement à l’édition ou à une convention spécifique documentée.

**Intervalle de dates.** Un intervalle de dates s’écrit d’un simple trait d’union entre deux espaces : « 354 - 430 », « Vers 480 - 524 », « Ier - IIe siècle ». À l’écran ces deux espaces sont insécables, un trait d’union autorisant le retour à la ligne juste après lui : sans elles on lirait « 354 - » en fin de ligne et « 430 » à la suivante. La forme canonique écrite en base, elle, garde des espaces ordinaires : rien n’y réclame une insécable, et un caractère invisible s’oublie dans une colonne de texte. N’est espacé que le tiret qui sépare DEUX BORNES, reconnu à ce qui le précède — un chiffre, le mot « siècle » ou l’ordinal d’un chiffre romain ; le trait d’union de « av. J.-C. », de « Bar-le-Duc » ou d’un nom composé n’est jamais touché. La règle est tenue en un seul endroit, `app/lib/datesHistoriques.ts` (`SEPARATEUR_INTERVALLE`, `espacerIntervallesHistoriques`), et vaut pour toute date affichée, composée par le site ou lue telle quelle en base — le demi-cadratin ne s’appliquait qu’aux dates composées, si bien que « Vers 329-379 » restait collé.

### 3.5 Titres

**Fidélité de la casse des titres source.** Tout titre, sous-titre, intitulé, rubrique ou tête de niveau transcrit depuis une édition source conserve exactement la casse attestée par le témoin, au même titre que son orthographe et sa ponctuation. Le fait qu’il soit déplacé dans un champ structurel (`ref_niv1` à `ref_niv5`, `ref_nivN_texte`, `heading`, `facsimile_heading` ou équivalent) ne le transforme pas en texte composé par Corpus Scriptura. `AVERTISSEMENT` reste `AVERTISSEMENT` ; `SUR JOSEPH ET LA CONTINENCE` reste `SUR JOSEPH ET LA CONTINENCE` ; une graphie ancienne comme `Du temps de la Natiuite de Iesus Christ selon Lhumanite.` conserve ses capitales. ⛔ Aucune remise en casse française, aucune minuscule automatique et aucune accentuation de capitale ne s’appliquent à un titre source. Seules les normalisations glyphiques ou typographiques expressément autorisées par le § 3.2 pour le régime du témoin peuvent s’appliquer, sans changer la casse.

Les règles françaises de casse exposées ci-dessous s’appliquent uniquement aux titres composés ou normalisés par Corpus Scriptura qui ne transcrivent pas un intitulé du témoin : titre bibliographique normalisé d’œuvre, titre d’essai créé par l’éditeur, intitulé d’événement, libellé d’interface ou titre de notice composé par le projet. Lorsqu’un titre source est repris comme tel dans une notice ou une structure, la casse du témoin l’emporte. Cette règle de fidélité a priorité sur toute sous-charte de chantier.

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

**Portée.** La règle de casse française qui suit vaut uniquement pour les titres réellement composés par Corpus Scriptura et pour les autorités bibliographiques normalisées ; elle ne vaut jamais pour la transcription d’un titre du témoin. Dans un titre composé par le projet, **un nom commun ne prend pas la majuscule sous prétexte qu’il désigne une fête ou un temps liturgique** : on écrit `Troisième dimanche après l’Épiphanie`, `2e dimanche après la Trinité`. La majuscule ne lui revient qu’en tête de titre. Les noms de fêtes proprement dits la gardent (`l’Avent`, `l’Épiphanie`, `la Trinité`, `la Grande Semaine`).

⛔ **Un titre source conserve sa casse partout.** Cela vaut dans le corps, dans les `ref_niv`, dans les champs `_texte`, dans les headings et dans toute projection de lecture qui prétend transcrire ce titre. Déplacer un titre dans la structure ne donne aucune autorisation de le remettre en casse française.

La casse, l’orthographe et la ponctuation interne et finale d’un titre transcrit suivent l’édition source, sauf intervention éditoriale explicitement signalée créant un objet distinct du titre source. La provenance, et non le nom du champ, décide : un `ref_nivN_texte` qui transcrit un intitulé imprimé reste du texte source ; un `ref_nivN_texte` rédigé par Corpus Scriptura relève au contraire de la typographie éditoriale. Les phrases explicatives qui ne transcrivent pas un titre suivent leur propre statut.


**Composition des titres et sous-titres de division à l’écran (3 septembre 2026).** Les intitulés de niveau de la colonne de lecture, titres et sous-titres des rangs 1 à 3, se composent avec `text-wrap: balance`, comme le sommaire : le navigateur égalise les lignes d’un intitulé qui en prend plusieurs, au lieu de rejeter deux syllabes seules à la dernière (« … un commerce / impur ? »). Le texte suivi, justifié, n’est pas concerné, et l’équilibrage ne change rien à la donnée. Deux insécables s’y ajoutent à l’affichage seulement, dans `preparerTitreColophon` : un gluon U+2060 après tout trait d’union placé entre deux lettres, parce que le navigateur coupe librement après un trait d’union et rendait « a- / t-elle » ; et une espace insécable après les mots d’une ou deux lettres (à, de, et, la…), qui ne restent donc jamais seuls en fin de ligne. ⛔ Le trait d’union insécable U+2011 n’est pas employé : Source Serif 4 et Source Sans 3, telles que Google les sert, n’en ont pas le glyphe, et le navigateur l’emprunte à une police de secours. ⚠️ Un saut de ligne SAISI dans un intitulé est une frontière que l’équilibrage ne franchit pas, mais il ne rend pas chaque tronçon indépendant : le navigateur équilibre en réduisant une seule largeur commune à toutes les lignes, et dès qu’un tronçon forcé occupe une ligne entière, les tronçons suivants retombent dans l’enroulement ordinaire (mesuré sur les Questions sur l’Heptateuque, 2 007 intitulés dont 652 avec saut saisi). Des coupes conditionnelles posées à la main, activées selon la largeur du conteneur, restent possibles pour un titre rebelle, mais elles ne valent que si chaque tronçon tient sur sa ligne à chaque largeur ; on les réserve, et on ne les pose pas avant d’avoir vu l’intitulé résister aux deux règles automatiques.

### 3.5.1 Références bibliques

La notation biblique suit une convention unique dans toutes les surfaces composées ou normalisées par Corpus Scriptura. Un nom de livre écrit en toutes lettres dans l’édition source peut être conservé (`Genèse`, `Exode`, etc.). En revanche, toute abréviation biblique est ramenée à la forme française catholique normative. Le référentiel `public.abreviations_bibliques` sert à reconnaître les variantes historiques ; lorsqu’il contient plusieurs formes héritées, la liste ci-dessous décide seule de la forme d’affichage normalisée.

**Abréviations normatives.** Ancien Testament : `Gn`, `Ex`, `Lv`, `Nb`, `Dt` ; `Jos`, `Jg`, `Rt`, `1 S`, `2 S`, `1 R`, `2 R`, `1 Ch`, `2 Ch`, `Esd`, `Ne`, `Tb`, `Jdt`, `Est`, `1 M`, `2 M` ; `Jb`, `Ps`, `Pr`, `Qo`, `Ct`, `Sg`, `Si` ; `Is`, `Jr`, `Lm`, `Ba`, `Ez`, `Dn`, `Os`, `Jl`, `Am`, `Ab`, `Jon`, `Mi`, `Na`, `Ha`, `So`, `Ag`, `Za`, `Ml`. Lorsque la Lettre de Jérémie est traitée comme division autonome dans le modèle AELF du projet, employer `Lt-Jr`. Nouveau Testament : `Mt`, `Mc`, `Lc`, `Jn`, `Ac`, `Rm`, `1 Co`, `2 Co`, `Ga`, `Ep`, `Ph`, `Col`, `1 Th`, `2 Th`, `1 Tm`, `2 Tm`, `Tt`, `Phm`, `He`, `Jc`, `1 P`, `2 P`, `1 Jn`, `2 Jn`, `3 Jn`, `Jude`, `Ap`.

Les chiffres placés devant une abréviation sont séparés de celle-ci par une espace : `1 S`, `2 R`, `1 Co`, `3 Jn`.\n\n**Numérotation historique des livres des Rois.** Lorsqu’une édition source emploie l’ancienne série `I Rois` à `IV Rois`, l’ordinal imprimé est conservé et seulement modernisé en chiffre arabe dans la référence : `I Rois` → `1 R`, `II Rois` → `2 R`, `III Rois` → `3 R`, `IV Rois` → `4 R`. Cette normalisation de transcription n’anticipe pas la résolution canonique des liens bibliques, qui constitue une opération distincte.

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

**Tout terme en langue étrangère est composé en italique.** La règle vaut pour toute langue, ancienne ou moderne, et quel que soit le degré d’acclimatation du terme au français. Le latin ne fait pas exception : *a priori*, *a fortiori*, *ex nihilo*, *in fine* s’écrivent en italique, la lexicalisation supposée d’une locution n’étant pas un critère retenu. Les abréviations savantes latines s’y rangent aussi : *cf.*, *ibid.*, *op. cit.*, *et al.*, *passim*, *sic*, *circa*, *etc.* La locution latine *et cetera* est systématiquement abrégée en *etc.* dans toute couche de lecture normalisée ou composée ; elle n’est jamais développée en toutes lettres. La transcription source ou diplomatique demeure inchangée. Lorsqu’elle clôt une phrase, le point abréviatif tient aussi lieu de point final : on écrit `etc.`, jamais `etc..`. Ce parti s’écarte sciemment de l’usage de l’Imprimerie nationale, qui laisse *cf.* en romain. Il est retenu pour l’uniformité : une règle sans exception se tient mieux qu’une liste de cas.

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

**Cas particulier — citation biblique autonome suivie de sa référence.** Lorsqu’une citation biblique constitue un ensemble indépendant et qu’elle est immédiatement suivie de sa référence entre parenthèses, le point final ordinaire ne reste pas à l’intérieur des guillemets : il est retiré avant le guillemet fermant et le point de phrase est placé après la parenthèse. Exemple normatif : `« Tu as agi en secret : moi, j’agirai au grand jour et à la face du soleil que voilà » (2 R 12, 12).` Les points d’interrogation et d’exclamation qui appartiennent intrinsèquement à la citation restent avant le guillemet fermant ; la référence parenthétique est ensuite suivie du point de phrase. Dans ce contexte parenthétique, la référence est modernisée avec l’abréviation biblique normative et les chapitres en chiffres arabes ; la composition validée suit le modèle `(2 R 12, 12)`. Il n’y a jamais de virgule entre l’abréviation du livre et le chapitre : `Mt 5, 3`, `2 R 12, 7-11`, non `Mt, 5, 3` ni `2 R, 12, 7-11`. Cette règle ne s’applique pas aux citations enchâssées dans la syntaxe de la phrase ni aux parenthèses explicatives qui ne sont pas des références bibliques.\n\n**Troisième règle : la ponctuation ne se double jamais de part et d’autre du guillemet fermant.** Quand la citation est déjà close, au dedans, par un point, un point d’exclamation ou un point d’interrogation, tout signe qui suit le guillemet fermant est supprimé. Le guillemet absorbe la ponctuation de la phrase d’accueil, il ne la répète pas.

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

⛔ **La nature `verset` ne dit PAS qu’un passage est une citation biblique : elle dit que l’ÉDITION le pose verset par verset**, hors du fil de sa prose. C’est la coupure IMPRIMÉE qui la fonde, et c’est pourquoi le rendu ne la recolle pas, quand il recolle au contraire les segments d’une `citation` : effacer cette coupure-là serait effacer le verset. Une citation biblique que l’édition coule DANS sa prose — fût-elle lemme, reprise de verset ou unité autonome d’explication — reste une `citation` et se lit au fil du texte. La marque n’altère jamais la couche source : les mots, l’ordre, la ponctuation et la disposition attestée restent conservés dans `oeuvre_texte_unites`, les offsets et les métadonnées de provenance.

⚠️ **Ce paragraphe disait l’inverse jusqu’au 29 août 2026**, et autorisait la marque « même si l’édition imprimée la compose dans le fil de la prose ». Le rendu ne l’a jamais su faire : `estBlocVersets` est TOUT OU RIEN, et un verset dont le paragraphe porte aussi du commentaire se compose en prose. La donnée suivait donc une doctrine et le code une autre, écrites à un jour d’intervalle. Arbitré par l’auteur sur les chiffres du seul texte marqué, le *Commentaire sur les Psaumes* de Chrysostome (Jeannin 1865) : sur **1 109 segments marqués, DEUX suites seulement** — psaume CVIII, 2-11 et psaume CXXVI, 1-2, soit douze segments — sont vraiment posées verset par verset. Les **1 055 autres** sont des citations glissées dans la prose, dont **976 sous 200 signes** et **douze seulement** atteignant les 400 signes à partir desquels la maison laisse une citation quitter le fil. Les détacher toutes aurait fait de ce commentaire un chapelet de blocs rentrés, un tous les trois segments, et serait revenu sur la décision du 20 août 2026 sur les lemmes du *Commentaire sur Joël* : « le seuil reste à 400 et les lemmes se lisent au fil du texte ». Les 1 097 marques sont repassées en `citation`, qui dit ce qu’elles sont sans prétendre à une disposition que l’édition n’a pas.

⚠️ **Le corollaire tient au CODE, et il avait été manqué** : la lecture ordinaire exigeait le tout ou rien, la lecture en traductions parallèles faisait bloc sur la seule nature du segment. La MÊME donnée sortait donc du fil sur une surface et y restait sur l’autre. Les deux passent désormais par `estBlocVersets`, et un test le tient. C’est la règle déjà payée sur les vers — « une nature traitée sur UNE surface ne l’est nulle part » — prise par l’autre bout : **une nature ne se compose pas de deux façons.**

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

L'assistant ne renseigne que ce qui est lisible sur la page et n'invente rien. Pour tout titre ou intitulé transcrit, il conserve exactement la casse visible sur la page, y compris les capitales intégrales ou les capitales anciennes de noms communs ; aucune normalisation déterministe de casse n’est appliquée. La ponctuation finale suit la source ou la consigne éditoriale explicitement applicable. Les éventuelles régularisations glyphiques, notamment de `u` et `v`, ne sont admises que si la convention de transcription du témoin les autorise.

L'enrichissement d'un champ non imprimé, tel que le titre original ou le nom complet de l'auteur et son identifiant, s'appuie d'abord sur le catalogue du projet, en lecture seule. À défaut de correspondance dans le catalogue, le champ reste vide. La connaissance générale du modèle ne sert jamais à combler une métadonnée.

Le traitement passe par l'abonnement, sans clé d'interface de programmation, et aucune donnée ne part sans consentement explicite. Toute clé d'accès à la base employée pour l'enrichissement demeure locale : elle n'est ni journalisée ni exportée.

## 6. Structure, niveaux, paragraphes et rangs


### 6.1 Identité d’un segment

Chaque version textuelle est identifiée par `id_texte` dans `oeuvre_textes`. Chaque segment possède un `id` technique, un `id_texte`, un `id_oeuvre`, un `segment_key` stable dans la version et un `segment_numero` unique dans cette version. `segment_numero` donne l’ordre éditorial global de lecture à l’intérieur de `id_texte` ; deux versions d’une même œuvre peuvent donc employer les mêmes numéros sans se confondre.

Lorsqu’un segment dérive d’une unité source structurée, `source_unit_id` le rattache à `oeuvre_texte_unites`. Les offsets Unicode, lorsqu’ils sont disponibles, décrivent son empan dans cette unité. `segment_key` et `source_unit_id` ne sont jamais recréés pour satisfaire un affichage ou un comptage.

Le segment est une unité de sens destinée à recevoir, au besoin, un ou plusieurs liens précis. Lorsque plusieurs découpages sont également naturels, Corpus Scriptura préfère désormais le découpage le plus fin : en prose courante, viser habituellement des segments d’environ 120 à 220 caractères ; un segment autour de 250 caractères reste ordinaire si l’unité de sens le demande ; au-delà de 300 caractères, relire systématiquement et ne conserver le segment que si sa cohésion logique justifie de ne pas le scinder. Ces nombres sont des repères de travail, jamais des seuils mécaniques. La logique du texte préside toujours à la segmentation : syntaxe, mouvement de l’argument, articulation entre objection et réponse, citation et commentaire, hypothèse et conséquence, énumération ou changement réel d’unité de sens. Aucun seuil de longueur ne déclenche à lui seul une coupure. Un segment sensiblement plus long peut être conservé s’il forme une unité logique indivisible ; inversement, un segment court doit être scindé s’il réunit artificiellement plusieurs mouvements distincts. Les statistiques de longueur servent à repérer les cas à relire, non à décider de leur découpage. Ne pas produire de fragments dépendants du segment suivant pour être compris. Après toute proposition de coupe, contrôler explicitement les corrélatifs et dépendances syntaxiques qui pourraient traverser la frontière — « non seulement… mais », « de même que… ainsi », « si… alors », « comme… de même », protase/apodose ou énumération suivie de sa conclusion. Une frontière qui sépare les deux termes d’un corrélatif requis est refusée, même si elle réduit fortement la longueur.

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
| `signature` | bloc de signatures fermant un volume — approbations, censeurs, souscripteurs : une suite de lignes courtes que l’édition compose au fer à droite. ⚠️ À distinguer d’`apparat_editeur`, qui porte le paratexte rédigé quand `signature` n’en porte que les noms et les qualités |
| `rubrique` | rubrique éditoriale qui n’est pas un niveau de titre |
| `dialogue` | réplique ou bloc dialogué lorsque la distinction est utile |
| `introduction` | brève introduction ou argument placé en tête d’une division du corps |
| `apparat_auteur` | préface, digression, argument ou autre paratexte rédigé par l’auteur de l’œuvre et appartenant à sa lecture |
| `apparat_editeur` | préface ou avertissement du traducteur ou de l’éditeur, privilège, approbation et autre paratexte éditorial extérieur à l’œuvre de l’auteur |
| `apparat_critique` | valeur héritée seulement ; ne plus en créer, sauf compatibilité transitoire explicitement documentée |
| `separateur` | héritage ancien seulement ; ne plus en créer pour représenter un alinéa |
| `texte absent` | lacune matérielle signalée sans invention |

⛔ **Elles sont TREIZE, et `vers` n’en est pas.** La poésie ne se déclare pas par une
nature mais par une FORME, `segment_metadata.forme = 'vers'` (§ 7.4) : c’est la seule
écriture qui vaille aussi dans l’apparat, où la nature est déjà prise par
`apparat_critique` — c’est par là que le segment y est SÉLECTIONNÉ, et elle ne peut pas
dire en plus qu’il est en vers. La nature `vers` a existé jusqu’au 29 août 2026 ; ses
2 325 segments ont migré, et `chk_segments_nature` la refuse.

⚠️ **Un segment en vers porte donc la nature de ses FRÈRES** — ce que porte, dans le même
espace, un bloc de même fonction : `texte` dans le corps, `introduction` dans
l’introduction. Sa forme se déclare à part, sur le second axe.

Un titre structurel n’est pas un segment de nature `titre`. Il appartient aux métadonnées ou aux `ref_niv`.

Toute nature utilisée doit être acceptée par le schéma, l’importateur, les éditeurs et le rendu. Si un élément manque, synchroniser l’application avant l’import.

L’`apparat_auteur` appartient au parcours de lecture de l’œuvre : il est stocké dans l’espace textuel du corps, garde sa position documentaire et apparaît dans le texte. Il ne doit pas être relégué hors lecture sous prétexte qu’il s’agit d’une préface, d’une digression ou d’un développement liminaire.

L’`apparat_editeur` décrit une **fonction sémantique**, non un emplacement automatique. Un paratexte du traducteur, de l’éditeur, du censeur ou de l’imprimeur — préface, avertissement, épître dédicatoire, éclaircissement au lecteur, approbation, privilège, liste bibliographique ou pièce analogue — qui appartient au parcours préliminaire de l’édition est placé dans `espace_textuel = 'introduction'`, dans son ordre documentaire réel. Sa nature fonctionnelle (`apparat_editeur`, `signature`, etc.) et, lorsqu’elle existe, sa qualification bibliographique sont conservées séparément.

⛔ L’espace `apparat_critique` n’est jamais un fourre-tout pour le hors-corps. Il est réservé aux **véritables objets de soutien critique** : leçons fautives ou atypiques du témoin qu’il faut conserver comme preuve, rubriques imprimées discordantes de la structure canonique, variantes, lacunes, corrections ou autres éléments dont la fonction est de documenter l’établissement du texte plutôt que de constituer une pièce préliminaire à lire. La forme source y est conservée ; l’affichage éditorial normal ne doit pas la réinjecter dans le corps ou dans les titres par un repli implicite.

Une bibliographie ou une liste de traductions placée en tête de l’édition reste dans `espace_textuel = 'introduction'` si elle appartient matériellement aux préliminaires ; elle garde son `type_unite`/`source_kind` bibliographique et ses rattachements structurés. La nature `introduction` reste, elle, réservée aux courts arguments ou chapeaux qui introduisent une division du corps : **nature et espace textuel sont deux axes distincts**.

Les anciens objets placés dans `apparat_critique` ne sont jamais reclassés en masse par position ou par nom. Chaque pièce est qualifiée par sa fonction, son auteur éditorial, son ordre matériel et son rôle de lecture. Les notes structurées sont orthogonales à ce classement : déplacer une pièce entre espaces ne supprime, ne renumérote ni ne recrée ses notes, blocs ou ancres.

### 7.0 bis. Protocole obligatoire de reclassement documentaire

Toute correction touchant `espace_textuel`, les liminaires, la bibliographie ou l’appareil critique suit cet ordre :

1. sauvegarder les unités, segments et objets de notes concernés ;
2. inventorier les pièces dans leur ordre matériel et distinguer corps, préliminaires éditoriaux, bibliographie et véritables témoins critiques ;
3. qualifier séparément **l’espace de lecture** (`corps`, `introduction`, `apparat_critique`) et **la fonction** (`nature`, `type_unite`, `source_kind`) ;
4. déplacer seulement les objets démontrés, sans réécrire `segment_texte`, `texte_original` ni le contenu des notes pour une simple correction de classement ;
5. dans la même passe, synchroniser `oeuvre_texte_unites.espace_textuel` et la projection correspondante `segments.segment_metadata.espace_textuel` pour toutes les unités concernées ; aucune métadonnée de segment ne peut conserver l’ancien espace ;
6. préserver les titres et rubriques imprimés dans les champs source ; si deux pièces deviennent ambiguës après suppression d’un sous-titre éditorial, les distinguer dans le titre éditorial (`display_title` / `ref_niv1`) sans recréer un `display_subtitle` interdit et sans altérer le titre source ;
7. harmoniser les libellés exposables de notes (`book`, notamment `Introduction`, `Livre deuxième`, etc.) avec la casse éditoriale courante, sans changer leur identité technique ni leur numéro imprimé ;
8. relire les notes, blocs et ancres après le déplacement ;
9. exécuter les contrôles bloquants ci-dessous et relire l’état depuis la base.

**Contrôles bloquants.** La passe n’est close que si : (a) 0 désaccord subsiste entre l’espace de l’unité et celui projeté au segment ; (b) 0 combinaison inattendue de nature/espace n’est laissée sans justification ; (c) 0 note ou bloc n’est orphelin et les rangs de blocs restent uniques et continus par note ; (d) les ancres restent rattachées au bon segment ou titre ; (e) 0 `texte_norm` n’est désynchronisé ; (f) une passe purement documentaire produit 0 modification de `segment_texte` et de `texte_original` ; (g) les formes source restent conservées dans leurs champs documentaires ; (h) aucun titre, rubrique ou champ source n’est utilisé comme repli d’affichage contraire à la politique éditoriale de l’œuvre.



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

### 7.2. Un style dit une NATURE ; le rang se dit à part

Le § 7.1 pose que le style, la surface et le rang sont trois axes distincts. Le
paratexte biblique les confondait encore : sur ses quarante-huit styles, **quarante
étaient un produit croisé nature × portée** — `commentaire_pericope`,
`introduction_livre`, `notice_chapitre`, sept natures par six niveaux.

⚠️ **Or le rendu ne compose que sur le couple niveau × nature.** Un bloc reçoit deux
classes, `cs-bible-info--i5` et `cs-bible-block--commentary`, et rien d'autre : le code
du style n'est qu'une clé de recherche. Son suffixe répétait donc ce que la portée
disait déjà, et **ce qui se répète dérive**. La dérive s'était produite : le Pentateuque
et le Nouveau Testament avaient fini par employer des vocabulaires DISJOINTS pour des
fonctions voisines, l'un commentant en `commentaire_verset` et `commentaire_chapitre`,
l'autre en `introduction_pericope` et `introduction_section`.

**Ils sont quatre.** `introduction_titree` — celle qui porte son propre titre ;
`introduction` — celle qui n'en porte pas ; `commentaire` ; `notice`. Plus
`note_verset`, qui n'est pas un bloc de corps.

⚠️ **Les TITRES ne bougent pas**, et l'asymétrie est motivée. Chez eux il n'y a aucun
produit croisé : un code par rang, T1 à T6, plus le second T5 qui vit sur l'axe
matériel. Le rang EST leur identité, et les fondre en un `titre` + un rang rendrait
moins lisible précisément ce qui compte le plus, l'échelle des titres et des
sous-titres.

**Quatre natures ont été fondues, et aucune ne se distinguait par rien de visible :**

| Fondue | Dans | Ce qui l'en séparait |
|---|---|---|
| `excursus` | `notice` | **rien** — même corps, même aparté |
| `sommaire` | `introduction` | un centième d'em de chasse |
| `conclusion` | `commentaire` | une italique — or une conclusion est un commentaire PLACÉ à la fin, et la position est un axe à part |
| `transition` | `notice` | rien : elle portait déjà cette nature |

⚠️ **Aucune des quatre ne portait un seul bloc du corpus.** Le regroupement n'a donc
rien déplacé à l'écran, et c'est ce qui l'a rendu possible sans arbitrage éditorial.

⛔ **Un style d'information sans RANG est refusé**, par la base comme par le rendu. Ce
n'est pas une sévérité gratuite, c'est le sens même du regroupement : le nom dit la
nature, le rang se déclare dans `metadata.semantic_level`, et un bloc qui n'en déclare
aucun ne s'en invente pas un.

⚠️ **Les anciens codes vivent comme NOMS HÉRITÉS**, chacun portant le rang qu'il disait
dans son propre nom : `commentaire_pericope` se résout en `commentaire` + I5. La donnée
n'a rien à migrer pour continuer de paraître. ⛔ Et **le rang d'un nom hérité fait foi
contre un rang déclaré** — sans quoi le regroupement changerait la composition d'un bloc
qui n'a pas bougé.

**Ce que le relevé a trouvé au passage, et qui vaut au delà de ce chantier.** Deux
champs de la donnée disaient un fait que personne ne lisait : `metadata.semantic_level`
et `metadata.embedded_title_level` étaient écrits, exposés par la vue, et **lus par
aucune ligne du site** — le rendu prenait le rang dans le nom du style. Le même fait
était donc écrit deux fois, et les deux écritures divergeaient déjà : le même code
portait I3 sur soixante-seize blocs et I4 sur onze. ⛔ **Un champ que rien ne lit n'est
pas une réserve pour plus tard : c'est une seconde vérité qui attend de contredire la
première.**

### 7.3. Comment un style se choisit, s’écrit et se rend

Les deux paragraphes précédents disent ce qu’un style EST. Celui-ci dit comment on
s’en sert, du texte qu’on a sous les yeux jusqu’à la page composée.

#### 7.3.1. Il y a DEUX vocabulaires, et ils ne se rencontrent jamais

C’est la confusion la plus fréquente, et elle vient de ce que les deux disent des
choses voisines.

| | Le corps d’une ŒUVRE patristique | Le paratexte d’une BIBLE commentée |
|---|---|---|
| Où il vit | `segments.nature` | `bible_editorial_body_blocks.metadata.semantic_style` |
| Ce qu’il décrit | un morceau du texte de l’auteur | un bloc que l’ÉDITEUR a ajouté autour du texte sacré |
| Combien de valeurs | 14 | 12 |
| Ce qui le tient | la contrainte `chk_segments_nature` | la table `bible_styles_semantiques` et son déclencheur |
| Où on l’étend | `app/lib/naturesSegments.ts` + une migration | `work/fillion/semantic_display_hierarchy.json` + un semis |

⛔ **Une valeur de l’un n’est jamais une valeur de l’autre.** `verset` est une nature
de segment patristique ; ce n’est pas le `titre_pericope` d’une bible, et la rangée
de la page Bible n’est ni l’un ni l’autre. C’est pourquoi le nom se QUALIFIE dès qu’il
sort de sa table : on écrit `patristique/verset` et `bible_apparat/commentaire`.

⚠️ **Une nature qu’une table accepte et que le CODE ignore n’existe pas pour le
lecteur.** Ce n’est pas une composition ratée, c’est une disparition, et rien ne la
signale. Le dépôt l’a payé deux fois : `apparat_auteur` le 18 août 2026 — le
« Prologue de Rufin » évanoui —, `lemme` le 29 — quarante-sept versets de Jérôme sur
Jonas, dans une œuvre publiée, dont le commentaire s’ouvrait sur la comparaison d’une
traduction avec un verset absent. Une garde l’exige désormais : toute nature valide
doit être RANGÉE, au corps, à l’apparat, ou parmi les formes éteintes.

#### 7.3.2. Ce qu’on écrit pour un bloc de paratexte biblique

Deux champs, et chacun dit une chose :

```jsonc
"metadata": {
  "semantic_style": "commentaire",   // la NATURE — ce que le bloc EST
  "semantic_level": "I5"             // le RANG — l’étendue qu’il explique
}
```

⛔ **Un titre n’écrit PAS son rang** : son nom le porte. `titre_partie_livre` EST le
rang T2, et l’écrire une seconde fois ouvrirait la porte à ce que les deux se
contredisent — ce qui était arrivé sur vingt-quatre blocs avant la normalisation du
29 août 2026. **Chaque fait une fois, et une seule.**

Les **dix noms** que le corpus emploie, au 29 août 2026 :

| Nom | Ce que c’est | Rang |
|---|---|---|
| `titre_partie_livre` | une partie du livre | T2, dans le nom |
| `titre_section_livre` | une section | T3, dans le nom |
| `titre_sous_section` | une sous-section | T4, dans le nom |
| `titre_chapitre_livre` | la mention imprimée « CHAPITRE IX » — ⛔ jamais affichée | T5, dans le nom |
| `titre_paragraphe_livre` | la division « § » du commentaire | T5, dans le nom |
| `titre_pericope` | une péricope | T6, dans le nom |
| `introduction_titree` | une introduction qui porte son PROPRE titre | déclaré |
| `introduction` | une introduction qui n’en porte pas | déclaré |
| `commentaire` | l’explication suivie | déclaré |
| `notice` | l’appoint documentaire, rendu à côté du fil | déclaré |

S’y ajoutent `titre_livre`, que la page porte déjà dans ses métadonnées et qui ne se
rend donc pas, et `note_verset`, qui n’est pas un bloc de corps mais une note.

Les six rangs d’information, de la portée la plus large à la plus étroite : **I1** le
livre — et au-dessus, groupe de livres, testament, Bible entière —, **I2** une partie,
**I3** une section ou une sous-section, **I4** un chapitre, **I5** une péricope, **I6**
un verset.

⛔ **Les deux échelles ne s’alignent PAS**, et c’est le piège qui coûte le plus cher :
`I4` est le CHAPITRE quand `T4` est la SOUS-SECTION. Aucune arithmétique ne fait
passer de l’une à l’autre. Un sous-titre prend donc le rang du TITRE auquel il
s’accroche, jamais le sien.

#### 7.3.3. Ce que la page en fait

Le rendu ne compose que sur **deux classes** : le rang et la nature.

```
"commentaire" + I5  →  <section class="cs-bible-info--i5 cs-bible-block--commentary">
```

C’est tout, et c’est pourquoi le nom d’un style n’a pas à porter autre chose que sa
nature. Le RANG règle le blanc et le retrait ; la NATURE règle la police, l’encre et
la place — une notice sort du fil dans un aparté, un commentaire y reste avec sa
manchette, une introduction de rang haut se compose en préambule centré.

⚠️ **Le chiffre du jeton n’est pas la balise HTML.** `T3` ne veut pas dire `h3` : la
balise se calcule sur les parents RÉELLEMENT présents, sans quoi une édition sans
partie ni sous-section sauterait de `h1` à `h5` et casserait le plan
d’accessibilité.

⚠️ **Un nom HÉRITÉ se résout, il ne se réécrit pas tout seul.** `commentaire_pericope`
rend `commentaire` + I5, et la page ne change pas d’un pixel. Ces noms existent pour
que rien ne casse, non pour qu’on continue d’en écrire.

#### 7.3.4. Les trois verrous

1. **Le vocabulaire est CLOS.** Un style hors de `bible_styles_semantiques` est refusé
   à l’écriture, et une nature hors de `chk_segments_nature` aussi. Avant ce verrou,
   un style mal orthographié entrait sans bruit et son bloc disparaissait du site sans
   un mot : quarante-cinq blocs y ont été perdus.
2. **Une information sans RANG est refusée**, par la base comme par le rendu. Le nom
   dit la nature, le rang se déclare, et un bloc qui n’en déclare aucun ne s’en invente
   pas un.
3. **Le rendu REFUSE ce qu’il ne sait pas composer**, au lieu de l’aplatir en
   paragraphe générique. Un bloc mal déclaré ne paraît pas ; c’est brutal, et c’est
   voulu — une donnée fausse rendue proprement ne se corrige jamais.

#### 7.3.5. Ce qu’on ne fait jamais

⛔ **Deviner un style du texte.** Ni de la casse, ni du corps, ni de la ponctuation, ni
de la place dans la page. Fillion centre « INTRODUCTION » et justifie son corps : la
mise en page ne dit pas la fonction.

⛔ **Écrire la portée dans le nom.** `commentaire_pericope` répétait ce que le rang
dit déjà, et ce qui se répète dérive : le Pentateuque et le Nouveau Testament avaient
fini par employer des vocabulaires disjoints pour des fonctions voisines.

⛔ **Faire d’une coquille un alias.** Les alias sont pour les noms hérités ; une faute
de graphie se corrige dans la donnée. `introduction_subsection` contre
`introduction_sous_section` avait rendu onze blocs invisibles.

⛔ **Ajouter un style à la main en base.** On l’écrit dans le registre, puis on sème.
Deux vocabulaires qui divergent valent moins qu’un seul.

⛔ **Garder un champ que rien ne lit.** Ce n’est pas une réserve pour plus tard, c’est
une seconde vérité qui attend de contredire la première — `semantic_level` et
`embedded_title_level` étaient écrits, exposés par la vue, lus par personne, et
divergeaient déjà quand on les a regardés.

### 7.4. Le VERS — un style, quatre surfaces

La poésie est le premier style qui doive exister PARTOUT. Elle sert surtout le corps
des œuvres des Pères — la *Consolation* de Boèce en compte 2 305 vers —, mais un
apparat peut citer un poème, et un livre biblique peut en être un.

⛔ **Ce qui fait qu'un vers est un vers ne dépend d'AUCUNE surface.** On ne le justifie
pas ; on ne le coupe pas — on ne coupe pas un alexandrin ; il porte son alinéa
poétique, sa strophe, et un retrait de suite qui distingue une ligne trop longue du
vers d'après. Cette règle vit en un seul endroit, `styleLigneDeVers`
(`app/lib/compositionVers.ts`), et les quatre surfaces la partagent.

⚠️ **Seuls la police, le corps et l'encre appartiennent à la surface**, et vivent dans
le BLOC qui porte les lignes. C'est la même distinction que partout ailleurs : le style
dit ce que la chose est, la surface dit comment elle se compose.

| Surface | Comment on déclare le vers | Où le bloc se compose |
|---|---|---|
| Corps d'une œuvre | `segment_metadata.forme = 'vers'` | `styleBlocDeVers` |
| Apparat d'une œuvre | `segment_metadata.forme = 'vers'` **seulement** | `styleBlocDeVers` |
| Apparat d'une bible | `form: 'verse'` sur le paragraphe | `STYLE_CORPS` |
| Texte biblique | *(reste à déclarer — voir plus bas)* | `styleTexteVerset({ enVers })` |

#### Une seule écriture, et c'est l'APPARAT qui l'a imposée

⛔ **Dans l'apparat, la NATURE est déjà prise.** Un segment d'apparat vaut
`apparat_critique` — c'est par là qu'il est SÉLECTIONNÉ — et il ne peut pas dire en
plus qu'il est en vers. Il fallait donc un second axe : `segment_metadata.forme`, qui
dit la MATIÈRE d'un segment sans toucher à sa nature. C'est exactement ce que le
paratexte biblique fait depuis toujours avec son couple `kind` × `form`.

⚠️ **Et ce que l'apparat impose, le corps l'adopte.** `nature = 'vers'` a existé
jusqu'au 29 août 2026 ; elle est sortie du vocabulaire ce jour-là, et ses 2 325
segments ont migré vers la forme — 1 213 vers de Boèce chez Ceriziers, 1 092 chez
Mirandol, 20 du *Manuel* de Dhuoda. La nature retombe sur celle de leurs FRÈRES, ce que
porte un bloc de même fonction dans le même espace : `texte` dans le corps,
`introduction` dans l'introduction. Aucun n'a changé de composition.

⛔ **Garder les deux aurait été garder deux façons de dire le même fait, et deux façons
de dire un même fait divergent toujours.** Elles avaient DÉJÀ divergé : trois lecteurs
du site jugeaient le vers sur la seule nature, sans passer par `estEnVers` — la lecture
bilingue et deux endroits des traductions parallèles. Le prédicat ne lit donc plus que
la forme, et `estBlocDeVers` applique le TOUT OU RIEN : un bloc mêlant un vers et de
la prose se compose en prose.

⚠️ **Une déclaration, mais DEUX enveloppes, et il faut lire les deux.** Selon la
requête, la forme arrive à plat (`forme:segment_metadata->>forme`, comme le fait
`SELECT_SEGMENT`) ou dans la colonne `segment_metadata` entière. Ce n'est pas une
seconde façon de DÉCLARER un vers mais une seconde façon de le TRANSPORTER, et c'est
exactement là que le défaut se logeait. ⛔ Ne jamais juger un vers ailleurs que dans
`estEnVers`.

⚠️ **Ce que la levée du verrou a coûté, et qu'on ne refera pas.** La base est PARTAGÉE
entre le poste de travail et le site en ligne : la migration des données a donc rendu
faux, à la seconde même, le code DÉJÀ DÉPLOYÉ qui lisait la nature. Les traductions
parallèles de Boèce ont composé leurs vers en prose le temps que le correctif soit
poussé. C'est le piège déjà consigné pour `oeuvres_auteurs` — **on change le code
AVANT la donnée, ou bien les deux dans le même souffle.**

#### Ce que la garde impose

⛔ **Une ligne de vers est une BOÎTE, jamais un fragment en ligne.** `text-indent` ne
s'applique qu'à la PREMIÈRE ligne d'un bloc, et jamais après un saut forcé : sans
boîte, l'alinéa ne se poserait que sur le premier vers de la strophe.

⛔ **On ne DÉCOUPE pas en lignes un paragraphe qui porte une locution marquée ou un
appel de note.** Leurs offsets pointent dans le texte ENTIER, et les couper les
déplacerait. Un tel paragraphe garde son `pre-line`, qui rend les sauts sans les
indenter. C'est la même garde que sur l'intertitre divisé et sur la citation sortie.

⛔ **Un vers ne prend jamais de lettrine.** Le drop cap est un flottant : posé dans la
boîte d'une ligne, il déborde sur les suivantes, qui sont des boîtes sœurs.

⛔ **Et la lettrine n’orne que la parole de l’AUTEUR** (décision du 30 août 2026). Elle
se pose sur le premier segment de la division que sa NATURE autorise à la porter, et la
liste en est CLOSE : `texte`, `dialogue`, `introduction`, `apparat_auteur`. La `citation`
et le `lemme` sont la parole d’un autre, que l’auteur commente ; la `rubrique` est un
intertitre centré en italique, où une capitale ornée ne veut rien dire ; le `verset` a
déjà son bloc ; la `signature`, le `separateur` et le `texte absent` ne sont pas du texte
suivi. Une nature qui ne figure pas dans la liste n’attrapera pas l’ornement par
distraction. ⚠️ Sur les 8 223 divisions du corpus, 159 s’ouvraient sur autre chose que la
prose de leur auteur — 60 sur un lemme, 55 sur une citation, 41 sur une rubrique, 2 sur un
verset, 1 sur une lacune — et toutes recevaient la capitale.

⚠️ Le défaut se lisait le mieux chez Chrysostome, où chaque psaume s’ouvre sur le verset
commenté : la lettrine ornait « 1. « Nations, louez le Seigneur… » » et emportait dans son
flottant le numéro de verset et le guillemet, en petit corps collé à sa gauche — ⛔ le
préfixe de lettrine est fait pour la PONCTUATION d’ouverture, « «Vous… », jamais pour un
numéro. Et le flottant débordait sur le paragraphe suivant, qui était le verset 2 : sa
première ligne partait 63 px à droite quand le verset 1 restait au fer.

⛔ **Un paragraphe orné CONTIENT sa lettrine** (`display: flow-root`). Sans cette garde, la
règle précédente ne tient que par la longueur du paragraphe d’arrivée : un premier
paragraphe d’une seule ligne pousse le suivant de 35 px, mesuré sur épreuve. ⚠️ Un
paragraphe plus court que sa lettrine gagne alors un blanc dessous au lieu de le prêter à
son voisin — c’est le bon échange, un ornement appartenant au paragraphe qu’il ouvre.

#### L'alinéa poétique se LIT, et l'échelle en compte CINQ

⛔ **Il ne se DEVINE pas.** La règle d'avant le déduisait de la parité du rang — le
second vers du distique est rentré —, et mesurée sur Boèce elle était juste pour un
dixième des vers, fausse pour tout le reste. C'est l'océrisation qui le porte :
`segment_metadata.indent_inches` donne la position du bord gauche de chaque ligne sur
la page imprimée. ⚠️ C'est une MESURE, non un rang, et elle se rabat POÈME PAR POÈME —
deux poèmes posés à des places différentes n'ont pas la même origine, et ce qui compte
est l'écart de chaque ligne au bord gauche de SON poème.

⛔ **L'échelle compte CINQ positions, et le plafond doit les admettre toutes** : le fer,
puis `Em1` à `Em4`, un quart de pouce par cran. `RANG_MAX` a valu 3 jusqu'au
31 août 2026, soit un rang de trop peu. ⚠️ **Un plafond ne borne pas une échelle, il
ÉCRASE** : tout ce qui dépasse retombe sur le dernier rang, et deux niveaux que
l'édition distingue se composent au même retrait.

Le cas est le mètre XIV du Livre quatrième chez Mirandol, seul poème du corpus où les
quatre rentrées coexistent — 16 vers au fer, 5 à 0,25 pouce, 10 à 0,50, 4 à 0,75 et 6 à
1,00. Les six derniers se composaient comme les quatre précédents. ⛔ **Le remède n'est
pas de rabattre les mesures** : les cinq niveaux sont attestés par le témoin, et les
1 092 vers de Mirandol sont renseignés ligne à ligne depuis la recollation.

⚠️ **Un plafond fait un SECOND travail, qu'il ne faut pas lui découvrir par surprise :
il borne aussi le rabattage d'une océrisation bruitée.** Chez Ceriziers 1646, dont les
mesures sont continues — 206 valeurs de 0,003 à 0,864 pouce —, la construction des
paliers monte jusqu'au rang 6, et le passage de 3 à 4 y déplace **99 vers sur 1 213,
dans 13 poèmes**, d'un pas vers la droite. Mirandol, dont les mesures sont propres, n'en
déplace que les six vers du mètre en cause. **Un plafond plus haut ne se pose qu'après
avoir compté ce qu'il libère.**

⚠️ **La largeur se MESURE, elle ne se ressent pas** — comme celle des colonnes de la
lecture en regard (§ 12.2). Le rang 4 vaut 7,5 em de retrait, base comprise. Les 3 231
vers de Boèce rendus un par un sans enroulement : les six vers de rang 4 du mètre XIV
demandent 221 à 243 px quand la plus étroite colonne française en offre 354. Le nouveau
plafond n'ajoute aucun enroulement en lecture ordinaire ni en bilingue ; il en ajoute un
en traductions parallèles et six sur mobile, tous chez Ceriziers. ⚠️ Ce n'est pas un
hasard : une édition rentre les vers COURTS, et un retrait profond tombe donc sur une
ligne brève.

#### Le texte biblique attend sa donnée

Le Psautier est de la poésie, Job et les prophètes aussi. La page Bible les compose
pourtant en paragraphes justifiés, comme de la prose.

⛔ **Et cela ne se corrige pas au rendu.** Relevé le 29 août 2026 : sur les **2 693
versets du Psautier**, AUCUNE des quatre traductions — Sacy, Segond, Crampon, la
Vulgate — ne contient un seul saut de ligne. La coupe des stiques, qui EST le vers d'un
psaume, n'existe pas dans le corpus. ⚠️ Elle ne se devine pas davantage : couper un
verset à la ponctuation reviendrait à inventer une prosodie.

Le style est posé et éprouvé — `styleTexteVerset({ enVers })` —, la planche le montre,
et il attend que la donnée porte les stiques. **Poser un style avant sa donnée est
légitime ; deviner la donnée depuis le style ne l'est pas.**

### 7.5. Le CATALOGUE des styles — ce que chacun sert

Les deux vocabulaires, style par style, avec ce qu'il sert et ce qu'il ne sert pas.
Les chiffres sont ceux du 29 août 2026 ; ils disent l'emploi réel, non une permission.

#### 7.5.1. Les natures d'un segment patristique — `segments.nature`

| Nature | Ce qu'elle sert | ⛔ Ce qu'elle n'est pas | Segments |
|---|---|---|---|
| `texte` | la prose de l'auteur : le cas ordinaire, et le défaut | un fourre-tout — 93 % du corpus, mais un lemme ou une citation structurelle méritent leur nom | 91 116 |
| `apparat_critique` | ⛔ **HÉRITÉE** (§ 7) : un fourre-tout de paratexte — dédicaces, privilèges, gloses de vocabulaire, arguments analytiques —, rendu dans la vue d'apparat. Ne plus en créer : employer `apparat_auteur` ou `apparat_editeur` | ⛔ **PAS** l'apparat critique d'une édition savante : celui-là n'est pas une nature de segment mais un RÔLE de bloc de note (`editorial_role`), et les 7 266 entrées de Knöll vivent là. Deux choses portent le même nom | 1 295 |
| `citation` | une citation structurelle, dont le rendu RECOLLE les segments | ⛔ pas une citation en ligne : celle-là reste dans `texte` et se détache d'elle-même au delà de 400 signes | 1 221 |
| `dialogue` | une réplique, dans un texte qui en compte | ⛔ ne se sort jamais du fil : une réplique est entre guillemets sans être une citation d'auteur | 1 038 |
| `apparat_editeur` | préface du traducteur, privilège, approbation : un paratexte EXTÉRIEUR à l'œuvre | l'apparat de l'auteur, qui appartient au corps | 323 |
| `apparat_auteur` | prologue, avertissement, dédicace écrits par L'AUTEUR | ⛔ pas `apparat_editeur`, qui porte le paratexte de l'ÉDITION : celui-ci appartient au CORPS et se lit à sa place | 96 |
| `lemme` | le verset biblique qu'un commentaire pose en tête du paragraphe qu'il commente | ⛔ ne se détache pas : un lemme se lit au fil du texte (décision du 20 août 2026) | 68 |
| `rubrique` | une rubrique éditoriale qui n'est PAS un niveau de titre | un titre : elle ne prend ni balise `h*` ni place au plan | 43 |
| `introduction` | un préambule appartenant au texte | | 57 |
| `verset` | un verset d'une citation que l'ÉDITION pose verset par verset | ⛔ pas toute citation biblique : c'est la coupure IMPRIMÉE qui le fonde | 12 |
| `texte absent` | une lacune du témoin | | 1 |
| `signature` | approbations, censeurs, souscripteurs : au fer à droite, interligne resserré | | 0 |
| `separateur` | ⛔ **ÉTEINTE.** Conservée pour d'anciens exports ; ne plus en créer. | | 0 |

⛔ **Le VERS n'est PAS dans cette table, et c'est le point à retenir** : ce n'est pas
une nature mais une FORME, déclarée par `segment_metadata.forme = 'vers'` (§ 7.4).
La nature `vers` a existé jusqu'au 29 août 2026 ; ses 2 325 segments ont migré, la
contrainte la refuse, et le compte de `texte` a monté d'autant. ⚠️ Un vers reste une
ligne de MÈTRE, à ne pas confondre avec `verset`, qui est une unité de l'Écriture.

#### 7.5.2. Les styles du paratexte biblique — `metadata.semantic_style`

**Les titres.** Un code par rang : le rang EST leur identité, et il se lit dans leur nom.

| Style | Ce qu'il sert | Blocs |
|---|---|---|
| `titre_livre` (T1) | le titre du livre — ⛔ **jamais rendu** : la page le porte dans ses métadonnées | 0 |
| `titre_partie_livre` (T2) | « PREMIÈRE PARTIE » | 30 |
| `titre_section_livre` (T3) | « Section II », « Le Divin Prélude » | 68 |
| `titre_sous_section` (T4) | « 1° La personne de l'auteur » | 248 |
| `titre_chapitre_livre` (T5, axe **matériel**) | la mention imprimée « CHAPITRE IX » — ⛔ **jamais affichée**, la navigation nomme déjà le chapitre ; elle reste comme témoin | 117 |
| `titre_paragraphe_livre` (T5, axe **analytique**) | la division « § » du commentaire | 34 |
| `titre_pericope` (T6) | « 3. Ce qui suivit la mort de Jésus » | 880 |

**Les informations.** Une NATURE ; le rang se déclare à part, en `I1` à `I6`.

| Style | Ce qu'il sert | ⛔ Ce qu'il n'est pas | Blocs |
|---|---|---|---|
| `commentaire` | l'explication suivie, le style le plus employé. Aux rangs I4-I6, son repère devient une MANCHETTE flottante | 3 091 |
| `introduction_titree` | une introduction qui porte son PROPRE titre — le rang de ce titre se DÉCLARE, il ne se déduit pas | ⛔ pas un titre : c'est un bloc d'information dont l'intitulé est un titre | 270 |
| `introduction` | une introduction dont l'intitulé n'est qu'un repère. Aux rangs I1-I2 elle compose en PRÉAMBULE, centrée et rentrée ; plus bas elle appartient au fil | 156 |
| `notice` | l'appoint documentaire, rendu dans un APARTÉ, à côté du fil et jamais dedans. Sa matière se qualifie par `notice_subtype` | ⛔ pas un commentaire : celui-ci reste dans le fil | 42 |
| `note_verset` | une note de bas de page — ⛔ **pas un bloc de corps** (`placement: footnote_only`) | 0 |

**Les axes qui accompagnent un style, sans en être un.** Aucun n'est un style : ils
qualifient celui que le bloc porte déjà.

| Axe | Ce qu'il dit | Valeurs |
|---|---|---|
| `semantic_level` | le RANG d'une information | `I1` à `I6` |
| `display_role` | le RÔLE d'affichage du bloc | `sous_titre` — qui prend le rang du titre auquel il s'accroche |
| `form` (paragraphe) | la MATIÈRE du paragraphe | `prose`, `verse` |
| `leading_paragraph_style` | la composition imposée au PREMIER paragraphe d'un bloc | `bibliographie`, `renvois-bible` |
| `notice_subtype` | l'espèce d'une notice | historique, géographique, apparat critique, **bibliographie**, sigles… |
| `segment_metadata.forme` | la MATIÈRE d'un segment patristique | `vers` |

⚠️ **La BIBLIOGRAPHIE n'est pas un style, et c'est délibéré** : c'est une MATIÈRE, que
deux axes peuvent déclarer — `notice_subtype = bibliography` sur une notice entière,
`leading_paragraph_style = bibliographie` sur le premier paragraphe d'un bloc. Elle se
compose alors dans la famille `cs-apparat-bibliographie`, une seule pour tout
l'apparat (§ 35.6.2), et ses entrées se raccordent au catalogue par `ouvrage_id`
(§ 35.6.4). ⛔ Lui donner un style à elle seule aurait mis dans le NOM ce que la
matière dit déjà — c'est le produit croisé qu'on a défait.

### 7.6. Créer un style neuf

⛔ **On ne crée pas un style parce qu'un cas PARAÎT nouveau.** On en crée un en
NÉCESSITÉ EXTRÊME, ou quand l'auteur le demande. C'est une règle de prudence chèrement
apprise : le registre du paratexte biblique a compté jusqu'à **48 styles pour 13 faits**,
et quatre de ses natures ne se distinguaient par **rien de visible** — un centième d'em,
une italique, ou rien du tout.

**Les trois questions à se poser AVANT, dans cet ordre.**

1. ⛔ **Un style existant ne compose-t-il pas déjà cela ?** Si la réponse est oui, le
   style neuf ne servirait qu'à nommer une nuance que le lecteur ne verra pas.
2. ⛔ **Un AXE ne dirait-il pas la différence sans un nom de plus ?** Le rang, la forme,
   le rôle d'affichage, le sous-type, la place. C'est presque toujours la bonne réponse :
   la portée est un axe, la position en est un, la matière en est un. Un nom qui les
   incorpore fabrique un produit croisé, et un produit croisé dérive.
3. **La différence se VOIT-elle à la lecture ?** Un style qui ne change pas la
   composition n'est pas un style : c'est une note d'atelier, et sa place est ailleurs.

**Si les trois réponses imposent quand même un style neuf, l'ordre est le suivant.**

1. ⛔ **La CHARTE d'abord**, et c'est la règle que l'auteur a fixée le 29 août 2026 :
   **tout style nouveau s'explique ici AVANT d'entrer dans la donnée.** On y écrit sa
   fonction, quand l'employer, ⛔ quand NE PAS l'employer, et comment il compose. Un
   style qui entre dans la donnée sans être expliqué est un style que personne ne saura
   employer dans six mois — et deux personnes l'emploieront alors de deux façons.
2. Le REGISTRE : `work/fillion/semantic_display_hierarchy.json` pour le paratexte
   biblique, `app/lib/naturesSegments.ts` et `chk_segments_nature` pour les segments.
3. Le SEMIS en base (`scripts/fillion/semer-styles-semantiques.mjs`), jamais un INSERT
   à la main : deux vocabulaires qui divergent valent moins qu'un seul.
4. La COMPOSITION, en un seul endroit par famille, et la GARDE qui l'éprouve.
5. L'ÉPREUVE sur la planche `/admin/styles`, pour qu'on le VOIE à côté de ses voisins.

⚠️ **Et l'inverse est vrai : un style qui ne sert plus se retire.** Quatre natures
d'information ont été fondues le 29 août 2026 parce qu'aucune ne portait un seul bloc
et qu'aucune ne composait autrement. ⛔ Une grille complète n'est pas une vertu : celle
du paratexte biblique comptait 23 styles jamais employés, et c'est elle qui a permis à
deux tomes de nommer différemment la même chose.

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

### 9.4 bis. Coexistence fonctionnelle des types

Un même couple `segment + cible biblique` peut porter plusieurs liens de types différents **uniquement lorsque le segment remplit réellement plusieurs fonctions distinctes**, chacune établie par lecture et motivée séparément. Le cas canonique est une citation explicite du verset (type 1) immédiatement suivie, dans le même segment, de son interprétation ou de son application argumentative (type 3). Dans ce cas, T1 et T3 coexistent : supprimer l’un des deux ferait perdre une information réelle.

⛔ Un changement de type ne suffit jamais à justifier un second lien. Deux lignes de même type vers la même cible sont un doublon et sont interdites. Une coexistence inter-types n’est admise que si les motifs décrivent des fonctions distinctes et vérifiables dans le texte. Les postcontrôles de doublons groupent donc par `segment + cible + type` ; un couple inter-types explicitement justifié n’est pas compté comme doublon.

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

**Original embarqué à frontières divergentes.** Lorsqu’un `segments.texte_original` legacy suit une segmentation propre à la langue source, son ancrage historique ne vaut jamais alignement et le bloc n’est pas recoupé silencieusement pour imiter les paragraphes de la traduction. Le bloc complet est conservé comme unité source d’un `id_texte` original distinct ; ses segments dérivés peuvent être scindés par offsets exacts afin de respecter les frontières absolues du texte traduit définies au § 12.2. La correspondance normative réside dans `texte_alignement_ensembles`, `texte_alignements` et `texte_alignement_membres`. La colonne `texte_original` reste un repli dérivé : elle ne doit jamais imposer un faux `1:1`, ni être rafraîchie lorsqu’une précondition de projection — notamment le début au rang 1 — n’est pas satisfaite. La migration doit prouver la recomposition exacte de chaque bloc source après toute scission et conserver explicitement le statut documentaire de la transcription originale.

### 12.2 Alignement éditorial

L’alignement est sémantique. Ne jamais supposer que les paragraphes, blocs HTML, pages ou limites de chapitres de deux versions coïncident. Une correspondance de position n’est qu’un candidat.

`texte_alignement_ensembles` définit le couple de versions, le niveau d’alignement, la méthode et son statut. `texte_alignements` porte les groupes ordonnés, leur cardinalité, leur confiance, leur méthode et leur justification. `texte_alignement_membres` rattache à chaque groupe les segments des versions concernées par `id_texte` et `segment_key`.

Les cardinalités `1:1`, `1:n`, `n:1`, `n:m`, `1:0` et `0:1` sont admises lorsqu’elles décrivent réellement le rapport entre les textes. Une omission, une addition ou une divergence ne doit jamais être masquée pour obtenir artificiellement du `1:1`.

**Le groupe d’alignement est le paragraphe de la lecture bilingue.** C’est lui qui recoupe les deux colonnes, et non `paragraphe`, qui ne vaut que dans un seul texte à la fois : sur les 57 groupes de la Doctrine des Apôtres, 28 enjambent deux sections numérotées, et 4 des 1 036 groupes de la Cité de Dieu enjambent deux paragraphes.

⛔ **Entre deux ensembles posés sur la même paire de textes, c’est le plus FIN qui porte la lecture, et la finesse se COMPTE** : une ligne de `texte_alignements` vaut un groupe, et le plus grand nombre l’emporte. `alignment_level` est l’étiquette de l’éditeur, non une mesure, et ne départage qu’à finesse inconnue ou égale. La Doctrine des Apôtres l’a montré le 25 août 2026 : son ensemble étiqueté `division` apparie les sections de Funk une à une, quand son ensemble étiqueté `paragraph` en réunit jusqu’à cinq contre cinq. Le choix ne s’ouvre qu’entre le texte lu et un texte en langue originale : un alignement entre deux traductions françaises n’a rien à mettre dans une colonne de latin.

#### Le grain de l’empan — trois règles, dans cet ordre

**1. Le paragraphe de l’édition traduite fait loi.** Quand la traduction porte le paragraphage de son édition, l’alignement l’épouse : l’empan naît et meurt avec le paragraphe. ⛔ Le paragraphe est une **frontière sémantique absolue** — aucun groupe ne l’enjambe, jamais, quelque commodité qu’on trouverait à le faire du côté de l’original. La langue originale, elle, n’oppose aucune frontière : ses propres paragraphes, ses sections numérotées et ses divisions se traversent librement, puisque c’est la traduction qui se lit.

**2. À défaut de paragraphage, on pose les frontières à la main.** Une édition qui ne paragraphe pas, ou dont l’importation n’a pas retenu les alinéas, n’autorise pas pour autant l’empan long. On constitue alors des frontières aux **jonctions sémantiques** de l’ouvrage : changement d’objet, de destinataire, de mouvement de l’argument. Elles sont éditoriales, se justifient dans `texte_alignements.justification`, et ne se déduisent ni d’un compte de signes ni d’une limite de page. Mais la première tâche reste de rendre au texte traduit les paragraphes de son édition lorsque c’est l’importation qui les a perdus : la règle 1 vaut toujours mieux que la règle 2.

**3. L’empan reste bref, mais la subdivision est un remède à la longueur, non une manière de faire.** Tant que le paragraphe de l’édition traduite reste sous la limite haute, le groupe l’épouse tout entier : ⛔ **un paragraphe de 1 500 signes ou moins ne se subdivise pas.** Le repère d’environ 900 signes sert à observer le confort de lecture ; il ne déclenche aucune coupe. Ce n’est qu’au-delà de la limite haute de 1 500 signes qu’une subdivision devient admissible, à une jonction sémantique située à l’intérieur du paragraphe. Le compteur autorise alors le remède ; le sens seul place la coupe. Le cas qui a révélé ce plancher est *De la vanité des idoles* de Cyprien dans la traduction Guillon de 1837 : 45 paragraphes, aucun au-delà de 547 signes, avaient été artificiellement détaillés en 128 groupes ; l’alignement a été repris en 45 empans paragraphaires le 31 août 2026.

Le témoin est l’alignement des *Confessions* : 932 groupes pour 932 paragraphes, aucun chevauchement, 876 signes de médiane. ⛔ **Un ensemble déclaré `division` n’est pas une dispense.** Aligner question contre question ou chapitre contre chapitre est un point de départ, non un état publiable : c’est ainsi que les *Questions sur l’Heptateuque* mettent 56 585 signes en regard d’un seul bloc. Un ensemble reste `candidate` tant que son grain n’a pas été repris.

Un groupe qui enjambe deux divisions se rend en plusieurs blocs, puisque les divisions se composent séparément, chacune sous son titre. L’original ne paraît alors qu’en regard du **premier** bloc ; les suivants gardent leur grille, colonne d’en face vide, pour que la traduction ne reprenne pas toute la largeur au milieu d’un empan. Le filet, qui marque l’appariement empan par empan, ne se tire qu’au **dernier** : tiré entre deux blocs d’un même groupe, il annoncerait une frontière que l’alignement ne reconnaît pas.

Un groupe de cardinalité `1:0` — une addition du traducteur — ne met rien en regard : son bloc se compose seul, sans ouvrir une grille bilingue vide.

⚠️ La lecture bilingue n’est offerte au lecteur que si **les deux** textes sont publics : la RLS des trois tables d’alignement l’exige. Un original laissé en `review` réserve donc le bilingue à l’administration, sans que rien ne le signale au visiteur.

⛔ **Garde de clôture du bilingue.** Une version en langue originale correctement importée, même `published`, et un alignement achevé en staging ne prouvent jamais que le mode bilingue fonctionne. Une mission qui crée, reprend ou publie un couple de textes parallèles ne peut être déclarée close qu’après vérification de la chaîne **live** complète : (1) les deux `id_texte` réellement consommés par la lecture existent dans `oeuvre_textes` avec les statuts et la visibilité voulus ; (2) leurs unités et segments sont matérialisés en base active ; (3) `texte_alignement_ensembles` relie exactement ces deux textes ; (4) les groupes et membres attendus sont présents, sans membre perdu, dupliqué ni groupe vide ; (5) les recompositions des deux témoins sont exactes ; (6) la visibilité RLS correspond au public visé — deux textes publics pour le visiteur, ou accès d’administration explicitement assumé ; (7) le **chemin de lecture réellement utilisé par le site** a été contrôlé sur ce couple. Un compteur de staging, `publication_ready=true`, la présence d’un latin public ou la seule existence d’un crosswalk ne valent pas test du mode « Français–Latin ». Tant que ce contrôle de surface n’est pas passé, le centre de contrôle conserve la mission en cours.

Dans chaque ensemble, l’ordre des membres doit rester monotone dans chaque version. Un segment n’est ni perdu ni dupliqué sans justification explicite. Les limites sémantiques difficiles sont relues ; les groupes automatiques demeurent candidats tant qu’ils n’ont pas atteint le statut de contrôle prévu par le chantier.

Une divergence de limite de chapitre peut être résolue en redistribuant un fragment continu vers le groupe sémantique correspondant, à condition de conserver sa provenance, son ordre et ses unités sources. Une impossibilité réelle d’alignement est signalée, non masquée.

La propagation des liens bibliques entre versions au § 9.7 n’est permise que sur un alignement sémantique contrôlé. L’alignement ne prouve jamais, à lui seul, l’identité d’une citation ou d’une allusion.

#### La lecture EN REGARD a sa propre mesure

Deux colonnes ne tiennent pas dans la mesure d’une seule. La lecture bilingue partageait les 31,25 rem de la lecture ordinaire, ce qui laissait 266 px au français et 209 au latin. C’est assez pour de la prose serrée. C’est trop peu pour un vers, qui ne se coupe pas.

⛔ **La lecture en regard se compose donc sur 42 rem**, le rapport des colonnes étant de 1,2 pour 1 et la gouttière de 1,4 rem. Règle posée par l’auteur le 30 août 2026 : « tu peux éventuellement augmenter la largeur des colonnes ; on peut tolérer quelques retours à la ligne disgracieux, mais il faut des limites ».

⚠️ **La limite se MESURE.** Les 2 011 vers de Boèce ont été rendus un par un dans leur composition réelle, puis mesurés au navigateur. Le français en demande 302 px au neuvième dixième et 343 au quatre-vingt-dix-neuvième ; le latin 227 et 283. Dans l’ancienne mesure, **468 vers s’enroulaient, soit près d’un sur quatre**. Dans la nouvelle, il en reste **trois**.

⚠️ **Le rapport des colonnes se compte, il ne se devine pas.** Sur cette mesure, des colonnes égales laissent 33 vers enroulés, l’ancien rapport de 1,12 pour 0,88 en laisse neuf, et 1,2 pour 1 en laisse trois. Le français demande plus de place que le latin, et c’est l’inverse de ce que l’œil suppose devant un hexamètre.

⚠️ **Les trois qui restent sont irréductibles à cette échelle** : deux vers du Mirandol, et la citation grecque d’Euripide, qui demanderait à elle seule 402 px. Les faire tenir voudrait une mesure de 55 rem, où la prose ne se lirait plus. C’est la limite qu’on accepte.

⛔ **Le « Latin seul » garde 31,25 rem.** Il n’a qu’une colonne, et une colonne de 672 px n’est plus une mesure de lecture. La règle ne vaut que là où il y a deux colonnes.

⚠️ **La prose y gagne aussi** : sa colonne originale passe de 209 à 295 px. Une colonne de 209 px ne porte qu’une trentaine de signes, ce qui est en deçà de toute mesure de lecture.

#### ⛔ DEUX POÈMES NE S’ALIGNENT PAS L’UN SUR L’AUTRE

Règle posée par l’auteur le 30 août 2026 : « je ne veux pas que les textes poétiques soient alignés entre eux ; le latin, tout du long, doit respecter sa forme d’origine, sans gros blancs artificiels, et inversement ».

⛔ **La prose s’apparie empan par empan, le vers ne s’apparie pas.** Chaque empan de prose fait un rang de grille, et un rang prend la hauteur de la plus haute de ses deux cellules : trois vers français en regard d’un distique latin creusent donc un blanc au bas de la colonne latine. Le poème s’en trouve scandé de silences que l’édition n’a pas écrits, et la forme d’origine est perdue des deux côtés à la fois.

⚠️ **Ce n’est pas un défaut marginal, c’est la moitié de la page.** Mesuré sur le mètre I du Livre premier de Boèce, colonne par colonne : le français porte 437 px d’encre pour **406 px de blanc**, et le latin **435 px de blanc pour 389 px d’encre** — plus de vide que de texte. Treize trous par colonne, jusqu’à 49 px, sur un poème de quatorze groupes d’alignement. Le seul blanc voulu, celui qui sépare les deux strophes, s’y noyait.

⛔ **Un poème fait donc UN SEUL rang de grille**, la traduction dans sa colonne et la langue originale dans la sienne, chacune coulant d’un trait avec ses strophes et son seul blanc de fin. Les deux colonnes demeurent : c’est bien un texte en regard, mais le regard se fait poème contre poème, non vers contre vers.

⚠️ **L’appariement vers à vers était de toute façon une illusion.** Mirandol traduit dans un autre mètre et n’a pas le compte de lignes de Migne : ce seul poème confronte 24 vers français à 22 vers latins. Aligner ce qui ne se correspond pas ne produit pas une correspondance, mais du blanc.

⛔ **Les originaux de TOUTES les strophes suivent**, joints par un saut de ligne. C’est ce qui rend la fusion possible en regard : le latin d’une strophe vit sur son vers de rang 1, et fondre les blocs sans cette précaution n’en garderait qu’un et jetterait les autres.

⚠️ **La prose ne bouge pas.** L’empan reste son unité, avec ses bornes et son filet. La règle ne vaut que pour une suite de blocs entièrement composés de vers ; un poème d’un seul groupe repasse par le cas ordinaire, n’ayant rien à refaire.

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

`source_target` nomme toujours le champ réellement ciblé : il ne contient ni `note_key`, ni identifiant de note, ni libellé arbitraire. Quand `anchor_id` encode lui-même une cible — par exemple avec le suffixe `:segment_texte` — cette cible et `source_target` doivent être identiques. Aux longueurs déclarées, le suffixe de `anchor_text_left` et le préfixe de `anchor_text_right` coïncident exactement avec le texte placé de part et d’autre de l’offset. Une différence de casse dans une phrase témoin est corrigée dans la métadonnée témoin, jamais en déplaçant un offset qui correspond déjà au texte.\n\nAprès une resegmentation, ces fenêtres contextuelles restent des témoins de l’unité source : elles peuvent donc franchir une frontière de segment. Dans ce cas, leur validation se fait contre `oeuvre_texte_unites.clean_text`, via `source_unit_id` et `source_unit_offset_unicode`, et non en exigeant que toute la fenêtre tienne dans le seul `segment_texte`. Si le marqueur et `segment_offset_unicode` sont exacts dans le segment, une continuation de `anchor_text_right` dans le segment suivant n’est pas une ancre fautive.

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

**Un surnuméraire peut s’insérer À L’INTÉRIEUR d’un verset canonique, entre deux portions de celui-ci.** La donnée le porte sans perte : le segment canonique garde deux empans disjoints, le surnuméraire prend celui du milieu, et l’ordre matériel est dit par des `alignment_order` intercalés. La convention de frontière est celle de `GEN.EXTRA.GLOSS.25.21`, reprise par `MAT.1.EXTRA.25A` : chaque fragment porte son propre séparateur final, la reprise se joint en `join_before = 'none'`, et la couverture reste exacte, point de code par point de code. Le segment canonique reçoit alors `discontinuous: true` et `intra_verse_extra`, le surnuméraire `intra_verse: true` avec `after_text` et `before_text`.

⚠️ **LA LECTURE, ELLE, NE SAIT PAS L’INSÉRER.** L’ordre de lecture est celui des alignements, et un verset canonique n’en porte qu’un seul : le surnuméraire ne peut donc paraître qu’avant ou après le verset ENTIER, jamais entre ses deux portions. Sur Mt 1,25 le lecteur voit « et ne la conut pas desi que ele ot enfant son enfant premier ne. Et ioseph apela lenfant ihesum. » puis la glose, là où le manuscrit intercale la glose entre les deux. ⛔ On ne fabrique ni faux verset, ni suffixe, ni `canon_id` artificiel pour rattraper l’ordre à l’affichage : la donnée reste juste et la restitution demeure approchée tant que le modèle de rendu n’aura pas d’ordre INTRA-verset. `GEN.EXTRA.GLOSS.25.21` est dans le même cas depuis le 19 août 2026.

Le redécoupage d’un surnuméraire ne modifie jamais `bible_source_unit_texts`. Il agit seulement sur les segments éditoriaux, leurs mappings source et les alignements. Toute opération conserve exactement la couverture matérielle, l’ordre des unités, les empreintes des couches source et les invariants de séquence.

**Invariant bloquant — synchronisation des surnuméraires source / cible.** Toute insertion, suppression ou renumérotation d’un `alignment_order` dans une source biblique structurée impose, avant clôture, un contrôle exhaustif des positions surnuméraires de chaque cible dérivée. Pour TR0009 → TR0013, l’invariant est : même nombre de `MANUSCRIPT_EXTRA` et de lignes `versets_v2` à `canon_id IS NULL`, correspondance exacte et unique des couples `(livre, alignment_order)` ↔ `(livre, ordre_slot)`, 0 slot source seul, 0 slot cible seul et 0 doublon. Ne jamais vérifier seulement le surnuméraire nouvellement inséré : tous les surnuméraires situés après lui dans le livre peuvent être décalés, alors même que les lignes canoniques ont `ordre_slot IS NULL`. Ce contrôle est requis avant toute nouvelle recoupe structurelle.

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

Publier une œuvre signifie que sa notice, son texte, sa structure et ses contrôles minimaux sont prêts. **La publication tient à UN SEUL drapeau, `oeuvres.acces_public` (3 septembre 2026)** : c’est lui que lisent les politiques RLS, le trigger `oeuvres_depublication_textes` et toutes les listes du site. ⛔ Le marqueur `[Corpus Scriptura:depublie]` dans `oeuvres.note` n’existe plus, ni la colonne `note` : un champ de prose qui portait un drapeau de contrôle faisait perdre la note éditoriale à chaque dépublication, et le site et la base jugeaient sur deux colonnes qui pouvaient se contredire. Une œuvre en préparation, notamment un original autonome encore incomplet, reste à `acces_public = false` tant qu’elle ne doit pas paraître, et son motif s’écrit dans `acces_public_note`. Dépublier ne détruit aucune donnée. La première date de mise en ligne reste attachée à l’édition en ligne et n’est pas réécrite lors d’une republication.

Les statuts de `oeuvre_textes` continuent de qualifier les versions textuelles elles-mêmes ; ils ne remplacent pas `acces_public`, qui seul décide de la visibilité de l’œuvre dans la bibliothèque.

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

⛔ **L’aération d’un volet se mesure en rem, jamais en pixels fixes** (décision de l’auteur, 31 août 2026 : « l’écartement et l’aération des colonnes doivent être proportionnés à la taille de l’écran »). La police racine du site est fluide — seize pixels jusqu’à mille quatre cent quarante de large, vingt-deux à deux mille quatre cents —, et tout ce qui s’écrit en rem la suit. Un blanc écrit en pixels ne la suit pas : sur un grand moniteur, le texte du volet grandissait d’un tiers pendant que ses gouttières ne bougeaient pas d’un pixel, si bien que le volet se SERRAIT à mesure qu’on lui donnait de la place. ⚠️ Le remède tient en une seule écriture : chaque mesure est un `clamp` dont le plancher et le plafond sont en rem — donc suivent l’écran — et dont le terme du milieu est en `cqi` — donc suit la poignée. Une même déclaration répond alors aux DEUX axes qu’un volet connaît, quand aucune des deux unités n’y suffit seule. ⛔ Le plancher vaut exactement ce que le volet portait avant : une échelle se pose sans déplacer l’état existant, sinon ce n’est pas une échelle, c’est une refonte.

⛔ **Un volet large en dit PLUS, et ce qu’il ajoute tient ENTIER** (décision de l’auteur, 31 août 2026 : « j’aimerais avoir plus de texte biographique sur grand écran, et aucun sur petit écran »). La carte de la traduction découvre ce qu’elle porte à mesure que le volet s’élargit, et le seuil de chaque texte se MESURE, il ne se choisit pas : on compte les signes du texte, on compte ce qu’une ligne en porte à cette largeur, et le texte ne paraît qu’au-dessus de la largeur où il tiendrait coupé. ⛔ Rien ne se RETRANCHE en chemin : l’état de départ est celui du volet le plus étroit, et tout le reste s’y ajoute.

⛔ **Un texte long paraît ENTIER ou pas du tout, et la carte n’en porte qu’un** (décision de l’auteur, 2 septembre 2026 : « ne pas tronquer le premier texte ; n’afficher, d’ailleurs, que le premier texte ; limiter le nombre de caractères affichés, ou même si ce paragraphe s’affiche, en fonction de la taille de l’écran »). Le 31 août, la référence d’édition paraissait sur un nombre de lignes qui MONTAIT avec le volet — deux, trois, quatre —, et les plus longues restaient coupées à toute largeur ; la notice du traducteur, elle, était entrée dans la carte au-dessus de deux cent soixante pixels. ⚠️ La règle est désormais une seule : la feuille accorde à la référence un BUDGET de lignes qui monte avec le volet (cinq dès deux cent soixante pixels, sept à trois cents, huit à trois cent cinquante), la carte compose la référence dans une sonde invisible à la largeur du volet et compte ses lignes, et la référence paraît ENTIÈRE si elle tient dans le budget, PAS DU TOUT sinon — jamais rognée par un `line-clamp`. Une requête de conteneur ne sait pas compter les signes d’un texte : la mesure est en JavaScript (`EncartTraduction`), la politique reste dans la feuille (`--volet-ref-lignes`), et ajouter une bible n’oblige à rien. ⚠️ Le budget plafonne à huit lignes, parce que la liste des livres vit dessous : élargir encore le volet ne rend rien de plus. ⛔ La notice du traducteur a quitté la carte le même jour : elle vit dans la fiche « En savoir plus », d’où elle venait, et la carte ne porte plus qu’un texte long. *La leçon rejoint celle du 28 août : une référence tronquée n’est pas une référence courte, c’est une phrase cassée ; et quand un texte ne tient pas, on le retire, on ne le coupe pas.*

⛔ **Un volet de gauche NOMME ce qu’on lit, et ce nom EST le lien** (décision de l’auteur, 31 août 2026 : « remplacer par le nom raccourci de la traduction, par exemple “Bible Crampon” ; ne pas afficher “en savoir plus sur cette traduction”, mais ouvrir la page quand on clique sur le nom de la traduction »). La carte de la traduction disait deux fois la même chose sans jamais nommer la bible : l’étiquette « Traduction », un lien qui redisait « cette traduction », et pour seul nom celui du traducteur. Le nom de la bible tient les deux rôles à la fois — il nomme, et il ouvre la fiche. ⚠️ C’est la MÊME forme des deux côtés du site, et le même composant : le nom de l’auteur sur une page patristique, celui de la bible sur la page Bible. Un volet de gauche n’a pas deux façons de nommer ce qu’il montre. ⛔ **L’étiquette est partie elle aussi** (le même jour : « supprime le mot “Traduction” »). Elle annonçait ce que le nom disait déjà, et le volet des pages patristiques n’a jamais écrit « Auteur » au-dessus du nom de l’auteur ; les deux volets se ressemblent enfin. ⚠️ Le nom s’écrête donc par la FIN sur la largeur de la carte — « Traduction officielle liturgi… » —, et les soixante-six pixels que l’étiquette rendait se voient : le plus long des neuf noms tenait entier à quatre cents pixels de volet, il tient désormais à deux cent soixante.

⚠️ **L’ordre des questions, et c’est ici la vraie leçon.** La veille, cette même ligne avait été CONDENSÉE : le lien y était monté à côté de l’étiquette pour ne plus occuper une ligne entière, et l’on avait mesuré au pixel le libellé qui devait s’y loger. Vingt-quatre heures plus tard, le lien et l’étiquette ont disparu tous les deux. ⛔ On avait donc resserré une ligne sans avoir demandé si elle devait exister, et la mesure fine était venue avant la question simple. **Devant un objet trop dense, demander d’abord ce qui peut PARTIR, ensuite seulement comment resserrer ce qui reste.**

⛔ **Rien ne paraît AU SURVOL d’un nom** (décision de l’auteur, 31 août 2026 : « supprimer la fonction d’affichage, au survol du nom de l’auteur, d’une partie de la page auteur »). Le nom d’auteur ouvrait, après deux cent vingt millièmes de seconde de survol, une carte flottante portant le portrait, les dates, les traditions et deux cents signes de la notice — c’est-à-dire un morceau de la page qu’un clic ouvre en entier. Le survol SOULIGNE, et c’est tout : il annonce le lien, il ne le remplace pas. ⚠️ Une surface qui disparaît emporte ce qui la servait : l’écran de cadrage des portraits proposait un cadre « aperçu au survol », et un cadrage qui règle une surface inexistante ment autant qu’un cadre aux mauvaises mesures.

⚠️ **Un libellé long s’écrit en DEUX formes, et l’on n’en montre qu’une.** « En savoir plus sur cette traduction » passe à trois lignes sur un volet resserré ; « En savoir plus » y suffit. Les deux sont dans le document, la largeur choisit. ⛔ On ne coupe pas un libellé en JavaScript : il faudrait le mesurer à chaque rendu, et la mesure se ferait après la peinture. ⚠️ La règle n’a plus d’exemple dans le site : le libellé qui l’appelait a cédé la place au nom de la bible, et un nom n’a pas de forme courte — il s’écrête. Elle reste bonne pour un libellé ; mais la première question est de savoir s’il en faut un.

⚠️ **Une carte n’a pas à réserver la place de ce qu’elle ne montre pas.** La carte de la traduction gardait une hauteur minimale pour que la mise en page ne bouge jamais ; il en restait un blanc de deux lignes dès que la référence s’efface. Elle prend la hauteur de ce qu’elle porte, et rien ne bouge pour autant : la référence ne paraît ou ne disparaît qu’au geste délibéré de redimensionner le volet.

⚠️ **Un libellé ne redit pas le nom de son axe.** Sous l’étiquette « Graphie », « Graphie modernisée » et « Abréviations développées » écrivaient deux fois le même mot, et le second débordait à lui seul la largeur du volet. Ce sont des adjectifs qui qualifient la graphie : « Modernisée », « Développées », « Diplomatique ». La description en donne le sens entier. L’ensemble tombe de 181 à 83 pixels, et le gain se voit surtout sur un téléphone, où la liste des livres remonte d’autant.

**La liste de la bibliothèque.** Elle se tourne par pages de dix auteurs : une fiche fait deux cents pixels, sa liste d’œuvres dépliée bien davantage, et au-delà de dix on ne parcourt plus une bibliothèque, on fait défiler. Toute recherche et tout filtre ramènent à la première page, et l’on revient en tête de liste en tournant — rester à la même hauteur ferait tomber au milieu de la page suivante. Les flèches et le pied « Page 1 sur 2 » sont ceux du catalogue des traductions, d’un composant partagé.

**Le texte en langue d’origine, dans la liste des œuvres.** Il porte UN SEUL nom, « Texte original latin » ou « Texte original grec », que l’œuvre soit une édition en langue ancienne sans traduction ou le texte original donné en regard d’une traduction : les deux se suivent dans la même liste et mènent à la même sorte de lecture, ils ne peuvent pas s’appeler l’un « Texte latin » et l’autre « Texte original latin ». Le nom suit la langue réellement déclarée par l’œuvre, et non un partage entre le grec et « tout le reste ».

**Le blanc entre deux lignes** de cette liste est le même pour toutes — texte original, traduction, autre édition. Ce qui sépare les œuvres entre elles, c’est le filet et le retrait du groupe, non l’écart des lignes : un écart plus large ici que là ferait lire un groupement qui n’existe pas.

**Un menu déroulant ne paraît que si la main SE POSE** (décisions de l’auteur, 30 août 2026 : « je veux que le menu s’ouvre immédiatement », puis « au survol, à cette vitesse, ne pas afficher le menu déroulant ; c’est inutile et peu élégant »). Deux gestes se ressemblent et n’ont rien de commun : on POSE son curseur sur un onglet pour en voir le menu, ou on le PASSE dessus en allant ailleurs. ⛔ Les distinguer par la DURÉE mène à une impasse, dont les deux issues ont été essayées : *attendre avant de montrer* fait payer à la main sûre l’hésitation de l’autre — le menu tombe sous les doigts de qui vient de l’ouvrir, et il faut apprendre à s’arrêter pour s’en servir ; *montrer aussitôt et retirer ensuite* fait clignoter la barre à chaque traversée, ce qui est inutile et peu élégant. ⚠️ L’intention ne se lit pas dans la durée mais dans la VITESSE : une main qui file ne demande rien, une main qui se pose demande à voir — et la vitesse, elle, se connaît DÈS L’ENTRÉE, sans rien faire attendre. La règle n’a donc plus de délai : le curseur entre en filant, rien ne paraît ; il se calme sur l’onglet, le menu paraît à l’instant même ; il quitte l’ensemble formé par l’onglet et son menu, le menu tombe sans sursis. ⛔ Il n’y a plus de menu ouvert par accident à refermer, puisqu’il ne s’ouvre pas ; et rien n’attend celui qui vient le chercher, puisque la main s’immobilise et que le menu est déjà là. ⚠️ Le seuil sépare des GESTES et non des conforts, et c’est ainsi qu’il se règle : un balayage de barre court entre huit cents et trois mille pixels par seconde, quand une main qui vise un onglet passe sous trois cent cinquante quelques centièmes de seconde avant de s’arrêter. ⛔ Au clavier, le menu s’ouvre sur `:focus-visible` et non sur `:focus-within`, qui le gardait ouvert après un simple clic de souris sur l’onglet, lequel laisse le lien focalisé, le curseur parti depuis longtemps.

**Les menus d’une même barre ne font qu’une seule forme.** Même cadre, même ombre, même intertitre, même chevron sur l’onglet qui les porte ; seule la LARGEUR varie, parce que le contenu la commande. ⛔ Et une seule mécanique : deux menus voisins gouvernés l’un par une règle `:hover` de la feuille de styles, l’autre par un état de composant, finissent toujours par diverger. La barre de navigation en portait quatre ainsi partagés, dont l’un avait son propre cadre, son propre délai de fermeture, et six pixels de vide entre l’onglet et sa boîte, que le curseur devait franchir sans les voir.

**Une page de lecture ne tombe pas sur une lenteur de la base.** Le site interroge toujours la table qu’il sait filtrer par son index, et embarque l’autre. Filtrer par une ressource EMBARQUÉE oblige la base à parcourir la table porteuse tout entière : la lecture reste juste, elle devient seulement trop lente, et elle finit par franchir le délai que le serveur accorde à une requête. Le lecteur voit alors « Cette page n’a pas pu s’afficher », sur une œuvre dont rien n’était en défaut. Mesuré le 3 septembre 2026 sur la page d’une œuvre : cinq secondes contre dix millisecondes pour la même question posée dans l’autre sens. ⛔ Et le pire cas est l’œuvre qui ne porte AUCUN lien biblique, la base n’ayant alors aucune raison de s’arrêter avant la dernière ligne : c’est pourquoi la même œuvre revenait dans chaque rafale de pannes. ⚠️ Une lecture qui n’est JAMAIS rapide ne l’est pas par accident. C’est la forme de la requête qu’il faut reprendre, jamais le délai qu’il faut allonger. Le détail technique et les mesures sont dans `AGENTS.md`.

⛔ **Une lecture qui ne sert qu’à ORNER ne fait jamais tomber la page qu’elle décrit.** La sonde qui demande si une œuvre porte des liens bibliques ne renseigne qu’une phrase de sa description : elle avale son erreur et se replie sur une formule plus simple. Le chargement du TEXTE, lui, lève, et il le doit : une page servie sans ses liens serait une page fausse. ⚠️ Le prix de ce repli est qu’une lenteur ne s’y signale nulle part, et qu’on ne la trouve qu’en regardant le journal.

⛔ **Une page de lecture ne tombe pas sur une couche SECONDAIRE, et elle DIT ce qui lui manque** (décision de l’auteur, 5 septembre 2026 : « consolide le code pour que ça se produise le moins possible »). Le texte est la seule couche dont l’échec ferme la page : sans lui il n’y a rien à lire. Tout ce qui l’accompagne se charge à part : notes structurées des deux textes, renvois bibliques, versets cités et leurs traductions, original en regard, apparat critique. Quand l’une de ces couches manque, la page s’ouvre sans elle, l’échec part au journal du serveur, et un bandeau sous le frontispice nomme au lecteur ce qui manque et l’invite à recharger ; l’administrateur y lit le détail. ⛔ Ce n’est pas un repli SILENCIEUX, et le paragraphe précédent garde sa raison : une page servie sans ses renvois n’est fausse que si elle se donne pour complète. Déclarée, elle ne ment pas. ⚠️ Le chargement des liens LÈVE toujours ; c’est la page qui l’attrape et le déclare au lieu de tomber.

Le cas qui l’a imposé. Le 5 septembre 2026, pendant qu’une écriture en base reprenait les notes des Confessions, UNE ancre de note est restée un moment sans sa note. La page levait sur cette ancre (« Ancre de note structurée incomplète ») et fermait l’œuvre entière à tout lecteur, puis rouvrait d’elle-même l’écriture achevée : un quart d’heure plus tard, l’ancre était complète et aucune ancre du corpus n’était en défaut. Un import n’est pas atomique, et le lecteur ne doit pas payer l’intervalle. ⚠️ Le journal de la base ne montrait rien : la panne n’était pas une requête en échec mais une donnée en transition, et seul le journal de l’hébergeur portait le repère de la panne avec sa cause. ⛔ Une ancre incomplète est donc laissée de côté et COMPTÉE, jamais levée (§ 13.6 : l’erreur est remontée, pas tue) ; et la projection des appels qui LÈVE reste la projection de contrôle des scripts et des tests, une page emploie celle qui ne faillit pas.

⚠️ Le second cas est de la même famille, et il a sa mesure. Les liens d’un chapitre biblique se lisaient par un motif `like` sur `canon_id`, qui n’est pas « leakproof » sous la politique de lecture par ligne : la base devait juger chaque ligne de la table avant de regarder le motif, et aucun index ne pouvait servir. Mesuré : 66 236 lignes sondées pour 2 741 rendues, 2 337 ms au repos, huit secondes sous charge, quatorze réponses en échec le 4 septembre sur les métadonnées de la page Bible et d’une péricope. Deux colonnes engendrées de `canon_id`, un index, et un `=` à la place du motif : 2 773 lignes sondées, 169 ms. Le détail technique est dans `AGENTS.md`.


### 18.1 Onglet Claude — Boèce (`A0064O0001`)

**Périmètre.** Les données de Boèce sont prêtes ; les points ci-dessous sont des correctifs de lecteur. ⛔ Ne jamais réécrire le texte, les titres source, les notes ou les alignements pour contourner un défaut d’interface. Le lecteur doit consommer les couches éditoriales déjà structurées.

**Menu des versions.** Remplacer partout « Versions textuelles » par **« Traductions »**. Le menu est identique quel que soit l’`id_texte` actif. Pour les traductions françaises, composer le libellé depuis `traductions.auteur`, `traducteur_debut_annee`, `traducteur_fin_annee` et `oeuvre_textes.annee_edition`, sans chaîne codée en dur : `René de Ceriziers (1603–1662), édition de 1646` ; `Louis Judicis de Mirandol (1816–1893), édition de 1861`. Le latin reste proposé comme **« Texte original latin »** dans l’axe de langue. Il n’est grisé que lorsqu’aucun alignement direct n’existe pour la portée affichée ; pour Boèce, des alignements directs existent avec les deux traductions françaises, donc le latin doit normalement être activable depuis Ceriziers comme depuis Mirandol.

**Traductions parallèles.** ⛔ Ne plus afficher l’option, l’onglet, le bouton ou le lien « Traductions parallèles ». Le code peut rester dormant s’il est utile à une réactivation future, mais aucun chemin visible du lecteur ne doit proposer ce mode tant qu’il n’est pas réactivé explicitement.

**Titres et rubriques.** Pour Boèce, le lecteur affiche uniquement le titre de livre éditorial (`metadata.display_title`, `segment_metadata.display_title` ou `ref_niv1`). ⛔ Aucun sous-titre textuel de niveau 2 ne doit être affiché : `ref_niv2` est seulement une clé structurelle interne et ne doit pas produire un heading visible ; `display_subtitle` doit rester absent. Ne jamais utiliser `book_heading`, `source_title`, `printed_title` ou un `ref_nivN_texte` comme repli d’affichage. Chez Ceriziers, les rubriques imprimées telles que `II. POESIE.`, `II. PROSE.` ou `V. PROSE.` restent conservées uniquement dans les métadonnées source et ne doivent jamais apparaître comme titres du lecteur.

**Contrat des champs — Boèce.** Dans l’architecture actuelle de `A0064O0001`, la fonction de chaque champ est fixée et ne doit plus être déduite de sa casse. Pour les **titres de livre affichés**, `segments.ref_niv1`, `oeuvre_texte_unites.ref_niv1`, `metadata.display_title` et `segment_metadata.display_title` sont des champs éditoriaux et doivent être en casse française (`Livre premier` … `Livre cinquième`). **Aucun sous-titre éditorial n’est retenu pour Boèce** : `metadata.display_subtitle` et `segment_metadata.display_subtitle` doivent être absents ; le lecteur ne doit pas reconstituer un sous-titre à partir des champs source. Les **témoins source** restent intangibles : `oeuvre_texte_unites.book_heading`, `metadata.source_title`, `segment_metadata.source_title` et `segment_metadata.printed_title` conservent exactement la casse, la numérotation, l’orthographe et les éventuelles coquilles imprimées. Chez Ceriziers, `segment_metadata.source_title` conserve le titre de livre imprimé et `segment_metadata.printed_title` la rubrique imprimée (`II. POESIE.`, `II. PROSE.`, etc.). En revanche, `segments.ref_niv1_texte` à `segments.ref_niv5_texte` doivent rester NULL dans le corps de Boèce : ces anciennes projections dupliquent les niveaux déjà structurés et ne doivent jamais être rendues. `ref_niv2` reste l’ordinal structurel de division (chiffre romain), non un sous-titre visible. ⛔ Le lecteur ne doit jamais prendre `book_heading`, `source_title` ou `printed_title` comme libellé éditorial de remplacement, ni réafficher une projection `ref_nivN_texte`. Contrôles bloquants Boèce : 0 titre éditorial intégralement en capitales ; 0 `display_subtitle` ; 0 `ref_niv1_texte` à `ref_niv5_texte` dans le corps ; formes imprimées conservées uniquement dans les métadonnées source.

**Appareils et paratextes — état de référence du 5 septembre 2026.** Pour `TXT_A0064O0001_FR_1646_CERIZIERS`, les quatre pièces préliminaires restent toutes dans `espace_textuel = 'apparat_critique'`. Leur fonction est cependant distinguée explicitement : l’**Épître dédicatoire**, l’**Approbation de P. Dozet** et l’**Approbation de I. Godinot** sont des unités d’`apparat_critique` à part entière (`type_unite = 'apparat_critique'`). Leurs segments de prose portent `nature = 'apparat_critique'`, mais leurs trois lignes de signature conservent impérativement `nature = 'signature'` ; l’ensemble représente 3 unités / 15 segments, dont 12 segments `apparat_critique` et 3 `signature` ; leurs titres éditoriaux les distinguent, tandis que le titre source `Approbation` reste conservé pour les deux approbations. L’**Esclaircissement nécessaire à l’intelligence de cet ouvrage** demeure distinctement `apparat_editeur` (`type_unite = 'liminaire'`), soit 1 unité / 45 segments, mais dans le même espace `apparat_critique`. Les deux rubriques imprimées fautives `II. PROSE.` et `V. PROSE.` restent également dans cet espace comme soutien critique ; leurs segments portent `nature = 'apparat_critique'` tandis que `type_unite = 'rubrique'` conserve leur fonction matérielle, soit 2 unités / 2 segments avec leurs notes explicatives ; elles ne deviennent jamais des headings de lecture. L’apparat Ceriziers totalise donc 6 unités / 62 segments. ⛔ Ne jamais replacer l’Épître ou les deux Approbations en `introduction`, ni les requalifier en simple `apparat_editeur`, sans décision éditoriale explicite de l’auteur. Pour `TXT_A0064O0001_FR_1861_MIRANDOL`, les 213 unités / 443 segments préliminaires appartiennent à `introduction`, dont 142 unités bibliographiques ; aucune de cette matière ne relève de `apparat_critique`. `A0064O0001T0001` ne porte aucun faux appareil ou paratexte. Les notes restent indépendantes de ce classement : 4 chez Ceriziers et 235 chez Mirandol. Toute évolution de ces espaces doit satisfaire le protocole § 7.0 bis, notamment la synchronisation unité/segment et l’interdiction de modifier le texte pour une simple correction de classement.\n\n**Numéros de notes.** `texte_notes.note_number` reste l’identifiant numérique global et continu de la version ; il ne doit pas être renuméroté. Lorsque `printed_note_number` existe, l’interface peut et, pour Mirandol, doit l’utiliser comme **libellé visible** de l’appel et de la fenêtre de note, avec repli sur `note_number` s’il est absent. L’identité technique et la navigation restent fondées sur la note structurée et son `anchor_id`/`note_key`/`note_number`, jamais sur `printed_note_number`, qui peut se répéter. Exemple de contrôle : « Hélas ! avant le temps, le malheur m’a fait vieux ; » pointe vers la note interne globale 99 mais doit afficher le numéro imprimé **2**, non 99.

**Alignements.** ⛔ Ne pas recomposer côté client un alignement transitif par Mirandol. Employer l’ensemble direct correspondant au couple actif : `ALNSET-A0064O0001-MIR1861-CER1646`, `ALNSET-A0064O0001-MIR1861-MIG1847` ou `ALNSET-A0064O0001-CER1646-MIG1847`. Les statuts `reviewed_ai`/`uncertain` qualifient les groupes ; ils ne justifient pas de masquer toute une version.

**Tests d’acceptation pour Claude.** Ouvrir successivement Ceriziers, Mirandol et le latin : le même menu « Traductions » doit apparaître ; aucune occurrence visible de « Versions textuelles » ni « Traductions parallèles » ne doit subsister ; les livres doivent s’afficher en casse éditoriale normale ; les deux rubriques Ceriziers atypiques doivent garder leur source mais afficher III/VI correctement ; l’appel Mirandol cité ci-dessus doit montrer 2 ; le latin doit être disponible depuis les deux traductions et utiliser les alignements directs.

**Échanges techniques GPT ↔ Claude — problèmes de code à transmettre et surveiller (Bible 899, 5 septembre 2026).** Ces points ne sont pas des règles éditoriales propres à Boèce : ils forment le registre de passage des défauts de code observés pendant les contrôles de corpus. Un défaut de lecteur, de vue, de RLS ou de projection ne doit jamais être réparé en altérant les données philologiques.

- **CONFIRMÉ — confidentialité des vues.** `traductions` masque correctement une traduction privée sous le rôle `anon`, mais une vue en droits du définisseur peut contourner cette protection. `v_traductions_page` expose actuellement les métadonnées de `TR0013` alors que la ligne de `traductions` est invisible à `anon`. ⛔ Ne jamais considérer le filtrage de la table de base comme une preuve de confidentialité d’une vue dérivée. Toute vue publique de traduction doit être testée sous `anon` et filtrer explicitement l’état privé, ou employer un modèle de sécurité qui conserve la politique attendue. Ce défaut est signalé ; il n’est pas corrigé ici tant qu’une modification transversale de `v_traductions_page` n’a pas été explicitement demandée.

- **CONFIRMÉ — coordonnées de texte.** Les `start_offset` / `end_offset` de `bible_editorial_segment_sources` sont des points de code Unicode dans la couche **développée**, pas des positions de la couche diplomatique et pas des octets. ⛔ Appliquer directement ces offsets à `text_content` diplomatique coupe les mots dès qu’une abréviation développée change la longueur (`⁊` → `et`, etc.). Le défaut a été observé à `LUK.2.8` (`t en cele region` au lieu de `Et en cele region`). La projection diplomatique doit passer par le helper de base prévu à cet effet ; le client ne la réimplémente pas par `substring`.

- **CONFIRMÉ — fonctions `internal` appelées par une vue publique.** Une fonction de projection ajoutée dans `internal` a momentanément rendu `v_bible899_aelf_polyglotte` illisible sous `anon`, bien que le calcul fût correct en backend privilégié. La fonction publique indirecte a été sécurisée avec un contexte d’exécution borné et un `search_path` fixé. ⚠️ Après toute modification d’une fonction appelée depuis une vue publique, exécuter un vrai test sous `anon` ; un test `service_role` ne détecte pas ce défaut. Ne jamais ouvrir globalement le schéma `internal` au public pour contourner une erreur de permissions.

- **À SURVEILLER — `security_invoker` / droits du définisseur.** Les vues polyglottes n’emploient pas toutes le même mode de sécurité : certaines sont `security_invoker=true`, d’autres non. Ce choix doit être intentionnel. `v_bible899_aelf_polyglotte` est actuellement lisible sous `anon` pour les couches publiques attendues et ne livre pas `TR0013`; `v_bible_verse_notes` ne livre que les notes techniquement publiables et aucune note `TR0013`. Ces invariants doivent devenir des tests de régression. ⛔ Ne pas harmoniser mécaniquement les options des vues sans vérifier le contrat de lecture voulu.

- **ÉTAT COURANT — couverture Control V2 des objets éditoriaux bibliques.** Control V2 accepte `verset_v2`, `bible_editorial_segment` et `bible_verse_note_block`. Pour un bloc de note, l’identifiant d’objet est `<note_id>#<block_id>`. Les deux derniers types ne disposent toutefois pas encore d’une garde bloquante ni d’un trigger d’audit imposant automatiquement le protocole. Cette absence de garde n’autorise aucune écriture directe : toute mutation effectuée par GPT, Claude ou un autre agent doit suivre explicitement préflight → écriture ciblée → postcheck exhaustif, avec conservation des dépendances et justification de la mission. Ne jamais conclure qu’un type est « hors Control V2 » sans relire le contrat courant des fonctions `internal.controle_v2_*`.

- **RÈGLE — cohérence texte / apparat après mutation.** Toute correction de `versets_v2.texte`, de structure canonique ou de matérialisation d’un surnuméraire impose de relire les `bible_verse_note_block` qui décrivent le passage. Une note devenue fausse, périmée ou contradictoire avec la cible courante est corrigée dans la même mission sous Control V2 `bible_verse_note_block`; une note encore exacte n’est pas réécrite. `needs_review` n’est abaissé que si la difficulté qu’il signale est réellement levée. Aucun bloc d’apparat n’est corrigé par écriture directe sous prétexte que la base ne possède pas encore de garde bloquante sur cette table.

- **CONFIRMÉ — vocabulaire inline éditorial non contrôlé.** Un scan exhaustif de TR0013 montre que le texte contient, à côté des balises normées `lecture incertaine` (652 occurrences) et `lacune` (9 occurrences), plusieurs libellés humains non déclarés : `Fragment` (2 : PSA.106.17–18), `lecture difficile` (2 : PSA.106.34 ; PSA.108.24), `Suite incertaine` (2 : MAT.25.21 ; MAT.25.23), `Suite corrompue` (1 : MAT.25.24), `Restitution` (1 : MRK.11.6), `Restitution incertaine` (1 : MRK.9.2), `reprise` (1 : PSA.111.2), ainsi que `Passage altéré` et `suite corrompue` dans deux lignes surnuméraires sans `canon_id`. ⛔ Le lecteur, les parseurs et les scripts de contrôle ne doivent pas inférer une sémantique à partir de n’importe quel libellé placé avant `:` dans des crochets. Ils ne doivent notamment pas assimiler ces tokens à `[lecture incertaine : …]`. Avant publication, définir un vocabulaire contrôlé ou, de préférence, déplacer les états de traduction/restitution dans des métadonnées structurées et l’apparat. Ajouter une validation bloquante qui signale tout libellé inline non déclaré.

- **RÈGLE — candidats de glose et matérialisations existantes.** Les diagnostics `EMBEDDED_EXTRA_CANDIDATE` déjà relus et confirmés constituent la file primaire pour les gloses potentielles. Avant toute nouvelle recoupe, vérifier systématiquement si la décision a déjà été matérialisée en fragments ou en `MANUSCRIPT_EXTRA`; ne jamais redécouper un cas déjà matérialisé. Les formules lexicales telles que `ce est a dire` ne sont que des signaux de rappel et ne déclenchent jamais une séparation automatique. Le statut hors canon reste `MANUSCRIPT_EXTRA` / `manuscript_extra=true`; la nature `metadata.phenomenon='gloss'` n’est attribuée qu’après preuve philologique, avec `canonical_context` lorsqu’il est déterminable. Toute nouvelle recoupe passe sous Control V2 `bible_editorial_segment`, conserve exactement la couverture source, les incertitudes et l’ordre matériel, crée ou ajuste la ligne surnuméraire TR0013 correspondante, puis contrôle les `ordre_slot`, l’apparat et les liens.

- **RÈGLE — dette d’apparat : état courant, jamais liste historique.** La charte ne conserve pas une liste cumulative de notes autrefois obsolètes. L’état d’une dette se détermine par requête sur la note, la cible courante et les checks Control V2. Lorsqu’un audit établit qu’un bloc est périmé, le corriger sous `bible_verse_note_block`; lorsqu’il est déjà cohérent, le laisser intact. Les listes chiffrées de blocs relus ou corrigés appartiennent au centre de contrôle, pas à la charte normative.

- **CONFIRMÉ — omission canonique encadrée par des fragments partiels.** Cas `2SA.24.15–17` : la couche source vérifiée ligne par ligne passe directement de `f161r_b_l20` (« del matin tres qua tens ») à `f161r_b_l21` (« que sont cornes contre moi ») ; `2SA.24.16` est non portant. Aucun texte n’était masqué par les offsets. TR0013 avait néanmoins complété silencieusement la fin de 24,15 et le début de 24,17 d’après le latin/AELF. Règle : lorsqu’un slot non portant est encadré par des fragments tronqués, contrôler les unités source complètes et leurs offsets avant toute restitution ; si la matière n’est réellement pas transmise, ne pas remplir depuis le canon, employer la convention existante `[…]` aux frontières et conserver seulement les petites restitutions locales explicitement crochetées. Ajouter un test de régression 2SA.24.15–17 et vérifier qu’une vue/recomposition ne transforme jamais automatiquement un slot non portant en texte canonique restauré.

- **CONFIRMÉ — ordre canonique et ordre surnuméraire.** Dans `TR0013`, les cibles canoniques ont normalement `ordre_slot = NULL`; les extras manuscrits portent l’ordre matériel dans `ordre_slot`. ⛔ Une comparaison globale `source.alignment_order = target.ordre_slot` produit donc des milliers de faux décalages. Pour le canonique, contrôler par `canon_id` et cohérence `livre/ch_orig/v_orig`; pour les extras, contrôler l’ordre matériel.

- **CONFIRMÉ — incertitudes multi-versets.** `has_unclear=true` n’implique pas toujours qu’une balise commence dans la ligne : le drapeau peut être contextuel. Inversement, une plage `[lecture incertaine : …]` peut commencer dans un verset et se fermer dans le suivant. ⛔ Le code ne doit ni fabriquer une balise à partir du seul booléen, ni traiter chaque verset indépendamment, ni produire le marqueur nu `[lecture incertaine]`. Le rendu doit préserver les bornes éditoriales explicites et les chaînes transfrontalières.

- **CONFIRMÉ — délimiteurs éditoriaux mal fermés.** Une balise source peut être ouverte sans fermeture matérielle alors que la ligne suivante repart sur un texte certain ; cas observé : `EST.14.19` ouvre `[lecture incertaine : ma peor.` sans `]`, puis `EST.15.1` n’est plus `has_unclear`. ⛔ Un rendu ne doit jamais laisser une profondeur de crochet positive contaminer mécaniquement tout le reste du livre. Avant toute propagation inter-versets, vérifier la cohérence du marqueur avec `has_unclear`, les lignes voisines et la structure source ; si la fermeture manque réellement dans la donnée, signaler l’anomalie source et borner le rendu au segment philologiquement justifié plutôt que d’inventer une longue incertitude. Ajouter un test de validation des délimiteurs non fermés dans les couches recomposées.

- **CONFIRMÉ — `bible_source_units.break_no` est décalé d’une ligne.** La colonne ne dit pas ce que dit le balisage : sur les 58 312 unités de TR0009, `break_no` d’une ligne vaut l’attribut `break="no"` de la ligne SUIVANTE dans 58 306 cas. Les totaux concordent (12 259 contre 12 256), ce qui masque le décalage à tout contrôle qui se contente de compter. ⛔ Ne jamais décider une jonction de mots sur cette colonne : la source de vérité est `bible_source_unit_texts.source_markup` de la couche diplomatique. La colonne est à recalculer ou à retirer.

- **CONFIRMÉ — `join_before` fautif sur 4 476 jonctions de TR0009.** `join_before` porte le séparateur à poser AVANT l’empan courant ; il vaut `none` si et seulement si la ligne PRÉCÉDENTE porte `break="no"`, c’est-à-dire si un mot y est coupé. Sur les 55 207 jonctions décidables, celles où l’empan précédent va jusqu’au bout de sa ligne et où le courant commence au début de la sienne, **1 564 posent une espace de trop** et **2 912 en omettent une**, soit 8,1 %. Le défaut se lit à l’écran : `empresne deuant`, `laisse a en tendre`, `charnelmentcome`, `sain te marie` dans le seul Mt 1,25 ; `fistce` et `ma rie` dans Mt 1,24. Répartition la plus lourde : LUK 578, ACT 542, GEN 680, MAT 456, EXO 436, JOB 363, NUM 359, JHN 372, MRK 176. ⚠️ Les Psaumes sont propres (3 écarts sur 5 524). Les quatre jonctions du périmètre de Mt 1,25 ont été corrigées le 5 septembre 2026, à la lecture.

⛔ **LE RESTE DE LA FAMILLE NE SE RÉPARE PAS PAR RÈGLE.** La passe déterministe a été montée le jour même, puis abandonnée avant toute écriture, mesure à l’appui. Les 4 476 contradictions ont été arbitrées par un lexique bâti sur les mots INTÉRIEURS de ligne, qui ne sont jamais coupés par une fin de ligne : 17 247 formes, 318 595 occurrences. **2 635 se tranchent, et le balisage a tort 1 244 fois quand la donnée courante a tort 1 391 fois.** Ni `join_before` ni `break="no"` ne fait donc autorité : une passe fondée sur l’une ou sur l’autre corromprait à peu près autant de jonctions qu’elle en réparerait. Sur quatorze cas tirés au sort dans le sens « poser une espace », sept brisaient un mot juste — `lamoit`, `sacorde`, `anceles`, `deniers`, `demandassent`, `phelipe`, `uenanz`.

⚠️ **Le sous-ensemble sûr existe, et il est étroit.** 469 jonctions où la forme soudée est attestée, où une des deux moitiés n’est pas un mot, et où la donnée pose pourtant une espace : le lecteur y voit un mot brisé, et le remède ne fait aucun doute. Les 922 cas inverses sont probables et moins sûrs, une forme soudée rare pouvant n’être attestée nulle part ailleurs — `suruinrent` en est l’exemple. Restent 1 058 ambigus et 783 indécidables, qui demandent une lecture. Le plan et son arbitrage sont conservés dans `internal.backup_bible899_join_before_20260905_plan`, une ligne par jonction avec les deux mots, la forme soudée et leurs fréquences ; le lexique dans `internal.bible899_lexique_mots_interieurs_20260905`.

⚠️ *Une mesure qui valide une règle dans un sens ne la valide pas dans l’autre.* Le contrôle de falsification employé d’abord — 98,9 % des lignes portant `break="no"` finissent par une lettre — était juste et ne prouvait rien du cas symétrique, celui des lignes qui auraient dû le porter et ne le portent pas. C’est là que le balisage se trompe le plus.

- **CONFIRMÉ — les surnuméraires de TR0013 ne sont jamais rendus.** `chargerVersetsCanoniquesV2` (app/lib/bibleEditorialServer.ts) lit `versets_v2` par `.in('canon_id', lot)`. Une ligne surnuméraire porte `canon_id = NULL` par construction, conformément au § 15.4 : elle est donc invisible à l’unique chemin de lecture de la traduction moderne. La matière est en base, traduite et ordonnée par `ordre_slot`, mais aucune page ne la montre. Cela vaut pour les gloses de Luc, de Jean, d’Exode, de Genèse et d’Esther comme pour `MAT.1.EXTRA.25A`. ⛔ Ne pas donner de `canon_id` à ces lignes pour les faire paraître : c’est au lecteur de `versets_v2` d’aller les chercher par `(livre, ch_orig, ordre_slot)`, comme le fait déjà le chemin Bible 899 par `alignment_order`.

- **CONFIRMÉ — l’apparat ne sait pas s’ancrer sur un surnuméraire.** Les 8 630 notes de TR0013 portent toutes un `canon_id`, et aucune n’en est dépourvue. Une note qui commente une glose ne peut donc être rattachée qu’au verset canonique voisin. Sur Mt 1,25 la note `tr0013-mat-1-25-textual-01` a été réécrite pour dire la discontinuité et nommer `MAT.1.EXTRA.25A` ; c’est un pis-aller. Le modèle demande soit une ancre de segment (`bible_verse_note_anchors.target_segment_id`, aujourd’hui inutilisée pour cette source), soit un `canon_id` nullable réellement lu.

- **ÉTAT COURANT — Control V2 couvre `bible_editorial_segment` et `bible_verse_note_block`.** `internal.controle_v2_etat_liens_objet` et `internal.controle_v2_dependances` acceptent les deux types, ainsi que les tables de checks et d’audit ; l’identifiant d’un bloc de note s’écrit `<note_id>#<block_id>`. Le préflight photographie notamment alignements, empans source, empreinte de couverture, ancres et liens dépendants, puis le postcheck exhaustif se referme comme pour un verset. ⚠️ Il n’existe toujours ni garde bloquante ni trigger d’audit imposant ce protocole sur ces deux tables. Par conséquent, la discipline Control V2 est obligatoire au niveau des agents : aucune écriture directe n’est admise, même si PostgreSQL l’accepterait techniquement.

**Tests de régression à communiquer à Claude.** Sous `anon` : `TR0013` doit rester absent de `traductions`, de tout texte polyglotte et de tout apparat de travail ; l’accès direct à `versets_v2` doit rester refusé ; `v_bible899_aelf_polyglotte` doit rester exécutable et ne livrer que les couches autorisées ; toute vue de notice doit respecter l’état privé. Pour la recomposition : reconstruire les unités partagées sans perte non blanche et vérifier spécifiquement une frontière située après une expansion d’abréviation. Pour les incertitudes : tester une balise interne, une balise franchissant une frontière de verset et un `has_unclear` contextuel sans balise locale.

## 19. Modèle de données des œuvres et versions

### 19.1 `oeuvres`

`oeuvres` porte l’identité intellectuelle de l’œuvre : auteur, titres, langue originale, langue de traduction lorsqu’il s’agit d’une traduction, datation, genre, état de publication et données éditoriales générales. Une œuvre n’est pas une édition déterminée et ne doit pas absorber les métadonnées propres à plusieurs versions.

**Commentaires publics des œuvres.** `commentaire_traduction` est le champ public d’explication de l’ÉDITION, non une notice bibliographique bis ; les trois notes éditoriales de l’œuvre, ci-dessous, parlent de l’ŒUVRE. Leur absence est la norme. Ils ne contiennent une information que lorsqu’un lecteur a besoin d’une précision que les champs structurés affichés à proximité ne peuvent pas exprimer : répartition d’une œuvre entre plusieurs traducteurs, traduction indirecte, caractère partiel ou composite du texte, particularité de transmission ou de présentation réellement utile. Ils ne répètent jamais le seul nom du traducteur, l’éditeur, la collection, le lieu, la date, le numéro de tome, l’édition, la pagination ni toute autre donnée déjà structurée. Le nom d’un traducteur n’y est répété que pour expliquer une répartition ou une responsabilité qui resterait incompréhensible autrement. Chaque idée occupe sa propre ligne ; les lignes sont brèves, rédigées comme des phrases explicatives et ne prennent pas de point final. Le rendu honore ces sauts de ligne : la page de titre, comme la carte « Édition de référence » d'« À propos de cette édition », compose le commentaire en `white-space: pre-line` (corrigé le 21 août 2026 ; le front les avalait jusque-là). Les détails de travail, preuves, hésitations, variantes fines, justifications d’attribution, états de contrôle et mécanismes internes sont conservés dans `oeuvres_commentaires_prives`, jamais exposés au lecteur.

Une traduction et une **œuvre originale autonome** sont deux lignes distinctes d’`oeuvres`. L’original autonome est reconnu par `langue_trad` vide et `langue_originale` renseignée. Il garde exactement le même titre français dans `titre` que sa sœur traduite et porte le titre latin, grec ou autre dans `titre_original`. L’auteur et le titre normalisé constituent le mécanisme d’appariement ; aucun identifiant de liaison supplémentaire n’est créé.

**Les trois notes éditoriales d’une œuvre** (décision de l’auteur, 3 septembre 2026), toutes publiques, chacune à sa place : `note_editoriale_complete` dit ce que l’œuvre EST — son intérêt, sa substance — et paraît dans la fiche « À propos de cette édition » ; `note_editoriale_complement` dit les points de détail de l’œuvre telle qu’on la parcourt — un chapitre déplacé ou refondu, une attribution discutée, une transmission lacunaire — dans la même fiche, sous « Notes éditoriales » ; `note_editoriale_titre` est un résumé qui ne paraît que sur la page de titre, et qui est vide le plus souvent. Elles s’écrivent depuis le formulaire « Modifier l’œuvre » de l’administration. ⛔ Elles ne redisent pas ce que les champs structurés disent déjà, et `note_editoriale_complement` a recueilli l’ancienne `note` (dix-neuf notes en prose, que le site ne montrait nulle part) et l’ancienne `note_editoriale_secondaire`. Ce que l’auteur pense de l’édition reste dans `commentaire_traduction` ; ce qui est travail interne reste dans `oeuvres_commentaires_prives`.

**Principe de rédaction d’une note éditoriale publique.** Une note éditoriale s’adresse au lecteur de l’œuvre. Elle lui fait comprendre, en peu de phrases, une particularité intellectuelle ou documentaire que les champs structurés et la lecture du texte ne suffisent pas à expliquer : attribution discutée, constitution composite, transmission lacunaire, remaniement ou disposition inhabituelle. Elle expose concrètement la cause et la portée de la difficulté — qui a constitué le texte, quelle part revient à l’auteur, quelle forme ne vient probablement pas de lui, ou ce que la lacune change pour la lecture. Elle ne se borne jamais à une étiquette abstraite telle que « compilation incertaine ».

⛔ **Une note publique n’est jamais un rapport de chantier.** N’y paraissent ni la méthode de contrôle, ni le nombre de lectures ou de pages examinées, ni les échantillons, empreintes, statuts de validation, noms de missions, états de workflow ou conclusions techniques. Une phrase dont le sujet réel est « ce que nous avons contrôlé » plutôt que « ce que le lecteur doit comprendre de l’œuvre » est privée, même si elle est exacte. Ces éléments restent dans les métadonnées de la version (`oeuvre_textes.metadata`), dans `oeuvres_commentaires_prives` ou dans le journal du centre de contrôle. De même, une note éditoriale ne répète pas l’adresse bibliographique, la pagination, le nom du traducteur ou les autres informations déjà portées par les champs structurés.

**Typographie des titres dans la prose publique.** Dans les champs de prose rendus par `rendreTexteEnrichi` — notamment `note_editoriale_complete`, `note_editoriale_complement`, `note_editoriale_titre`, `commentaire_traduction` et les notes publiques du catalogue — tout véritable titre d’œuvre ou d’ouvrage est délimité dans la donnée par `*…*` afin d’être composé en italique. Les noms des livres sacrés restent en romain conformément au § 3.6 : on écrit ainsi `les *Rétractations*`, `les *Adnotationes in Iob*`, mais `le livre de Job`. Les champs structurés dont la valeur est elle-même un titre — `titre`, `titre_original`, `titre_edition` et leurs équivalents — ne reçoivent pas d’astérisques décoratifs : leur composant d’interface porte la mise en forme.

**Test de lecture avant publication.** Relire la note sans connaître le chantier qui l’a produite. Si elle exige de savoir ce qu’est un audit, une passe, un lot ou une validation, elle n’est pas prête. Si elle explique immédiatement au lecteur pourquoi l’œuvre se présente sous cette forme et ce que cette particularité signifie, sans redoubler la bibliographie, elle remplit sa fonction.

La visibilité de l’œuvre dans les listes suit le § 16 : `acces_public`, et lui seul.

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

`is_default` désigne la version privilégiée à l’intérieur d’un `id_oeuvre`. Une œuvre disposant de versions doit en avoir exactement une avant clôture ou publication ; cette version ne peut jamais être `retired`. `is_public` reste un indicateur de visibilité de version et doit rester cohérent avec son statut, mais il ne remplace pas `acces_public`, le drapeau de publication de l’œuvre défini au § 16.

**Complétude documentaire et transmission lacunaire.** La complétude d’une version s’évalue sur le périmètre effectivement transmis par le témoin ou l’édition de référence et annoncé par la version, non sur l’intégralité hypothétique d’une œuvre antique dont une partie est perdue. Une version peut donc être cohérente, complète sur son périmètre et techniquement publiable lorsqu’elle restitue intégralement le corpus conservé, même si l’œuvre antique n’est plus transmise qu’en partie. La lacune historique est qualifiée dans les données d’authenticité ou de transmission et, lorsqu’elle est utile au lecteur, dans `note_editoriale_complement` ; elle ne transforme pas, à elle seule, la version en import incomplet. À l’inverse, des pages, divisions ou unités attendues dans le témoin choisi mais absentes de l’import constituent une incomplétude de version et interdisent le statut `published`. Les métadonnées legacy `complete_work` et `publication_target`, lorsqu’elles subsistent, ne commandent jamais la visibilité : elles doivent respecter cette distinction et ne jamais contredire `statut`, `is_public` ni `acces_public`.

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

Les références bibliques suivent la règle du § 8 : une référence grammaticalement intégrée demeure dans la phrase ; une référence isolée est transformée en note. Leur constitution en liens reste une sous-phase explicite de la phase B.\n\n⛔ **Une référence bibliographique présente dans un apparat n’échappe jamais au normalisateur.** Qu’elle se trouve dans une note, une introduction, une liste d’ouvrages, une liste de traductions, une rubrique critique ou tout autre paratexte, son emplacement documentaire ne change pas son contrat bibliographique. Dès qu’une œuvre ou une édition est identifiable, elle passe par **Normaliser**, réemploie ou crée `ouvrages_bibliographiques`, reçoit son `ouvrage_id` et ses autorités structurées, puis se compose depuis ces données conformément aux §§ 29.0 et 35.6.1–35.6.4. La chaîne imprimée/OCR reste une provenance ; elle n’est jamais la notice publique finale. Un apparat dont une référence identifiable est encore rendue depuis une chaîne libre n’est pas conforme et ne peut être déclaré clos.

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

8. **Reprendre notes, apparats et références bibliographiques.** Contrôler l’appartenance documentaire des apparats, puis les notes comme un système complet : identité, numérotation, blocs, ancres, cible réelle, offsets, portée, ponctuation, enrichissements, références et éventuelles ancres de titre (§§ 8, 13, 22). Dans la même étape, inventorier **toute référence bibliographique rencontrée sur les surfaces rendues**, y compris hors d’une pièce intitulée « Bibliographie ». Chaque référence identifiable passe obligatoirement par l’outil **Normaliser** : recherche de doublon par clé normalisée, réemploi ou création de `ouvrages_bibliographiques`, complétion documentée des champs disponibles, rattachement à `ouvrage_id`, autorités de contributeurs et d’éditeurs, `type_ouvrage` et état de revue si nécessaire (§§ 29.0, 35.6.1, 35.6.4). Aucune note, aucun appel ni aucun apparat n’est conservé sous une forme technique redondante lorsque le modèle normatif le représente déjà. ⛔ Cette étape n’est close que si 0 référence identifiable est rendue depuis une chaîne libre lorsqu’une représentation structurée existe, 0 ouvrage identifiable reste sans recherche de correspondance, 0 doublon de notice ou d’autorité a été créé, et toute projection matérialisée est traçable à son `ouvrage_id` ou, pour un renvoi, à ses `related_ouvrage_ids`.

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

Lorsqu’une édition imprime une référence précise — livre, chapitre et verset — et que la confrontation confirme qu’elle vise bien le passage cité ou commenté, cette cible éditoriale est conservée comme lien principal. L’existence de parallèles scripturaires ne l’annule pas : ils sont signalés dans le motif ou reçoivent des liens distincts seulement s’ils sont eux-mêmes attestés. Il est interdit de remplacer une telle cible par `canon_id = null` au seul motif que la formule existe dans plusieurs passages.

Toute correction d’un `canon_id` déjà renseigné vers une autre cible, ou vers `null`, exige une sauvegarde, un préflight, la confrontation de l’édition active, du texte original lorsqu’il existe et du verset local, puis un postcheck relisant l’état final. Le motif doit conserver la distinction entre la référence imprimée, la forme textuelle reconnue et les parallèles éventuels.

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

### 29.0 Constitution obligatoire des notices bibliographiques

⛔ **Toute référence d’ouvrage rencontrée doit être normalisée, structurée et rattachée à une autorité bibliographique.** Cette obligation vaut dans tout le corpus, pas seulement dans les bibliographies de péricopes ni dans les chantiers Fillion. Une liste de traductions, une liste d’ouvrages cités, une bibliographie, une liste d’éditions, un « Du même auteur » ou toute énumération analogue est un objet bibliographique dès lors que ses lignes désignent des ouvrages ou des éditions.

Le traitement passe par l’outil **« Normaliser »** de l’administration : rechercher d’abord la fiche existante avec la clé bibliographique normalisée, la réutiliser si elle existe, et créer la fiche d’ouvrage dans `ouvrages_bibliographiques` si elle manque. La création d’une nouvelle fiche n’est permise qu’après recherche de doublon. Une variation de casse, ponctuation, abréviation, ordre des éléments, langue du titre ou forme ancienne du nom ne justifie jamais deux ouvrages distincts.

La fiche est complétée autant que les preuves le permettent : titre, sous-titre, auteur(s), traducteur(s), directeur(s), langue, lieu, éditeur, année, mention d’édition, collection, numéro de collection, ISBN si pertinent, `type_ouvrage`, provenance et commentaire de contrôle. Les autorités de personnes, d’éditeurs et de collections déjà présentes sont réutilisées et reliées. Une donnée non prouvée reste vide ou en revue ; elle n’est pas inventée pour rendre la notice plus complète.

La **nature documentaire** doit correspondre au contenu et non au titre arbitraire de la pièce : une unité qui est une entrée de bibliographie porte `type_unite = 'bibliographie'`; ses segments relèvent de `nature = 'apparat_editeur'`; la présentation bibliographique utilise le style structuré `bibliographie`. Une liste de traductions est donc traitée comme une bibliographie d’éditions/traductions, et non comme du `paratexte` générique. La catégorie scientifique de la fiche est renseignée dans `ouvrages_bibliographiques.type_ouvrage` avec le vocabulaire contrôlé existant ; elle ne se déduit pas mécaniquement du titre de la rubrique.

La chaîne imprimée ou OCR du témoin reste conservée comme **provenance source**. Elle ne dispense jamais de la normalisation et ne devient pas la notice finale si une fiche structurée existe. Lorsqu’une couche de relations bibliographiques est disponible, chaque entrée est rattachée à son `ouvrage_id`; son rang matériel reste une donnée de provenance, pas son identité.

**Contrôle bloquant de clôture :** annoncer le nombre d’entrées rencontrées, réutilisées, créées, complétées et laissées en revue ; exiger 0 entrée identifiable laissée sans recherche d’autorité, 0 doublon créé par variante de forme, 0 ouvrage structuré sans titre, 0 liste d’ouvrages laissée en paratexte générique et 0 rendu final fondé sur la chaîne brute lorsqu’une notice structurée existe. La règle détaillée de composition et de rendu se trouve au § 35.6.1.

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


## 29 bis. Le nom d’une personne — nom, prénom, pseudonyme

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

**4. Casse, titres et petites capitales.** Dans Fillion comme ailleurs, un titre qui transcrit un heading imprimé conserve exactement la casse du témoin conformément au § 3.5 ; `facsimile_heading`, `source_markup` ou une provenance équivalente servent à la preuve, non à autoriser une autre casse dans la lecture. Seuls les titres réellement composés par Corpus Scriptura suivent la casse française. Aucun titre biblique n’est composé en petites capitales. Les petites capitales attestées ou sémantiques des noms d’auteurs dans une bibliographie sont conservées ; elles ne doivent jamais être simulées par une transformation de casse.

**5. Paragraphes.** Aucun tiret artificiel n’est ajouté devant les paragraphes et aucun `::before` ne doit en recréer. Les paragraphes restent distincts, séparés par le blanc prévu par le rendu ; ils ne sont pas concaténés en une ligne continue. Une rupture de page ou de ligne matérielle ne crée pas à elle seule un paragraphe.

**Transitions de lemme dans le commentaire.** Dans le commentaire de Fillion, lorsqu’un nouveau lemme ouvre une nouvelle unité d’explication, le tiret long imprimé qui sert de séparateur n’est pas reproduit comme signe de ponctuation dans la couche éditoriale de lecture : chaque reprise de lemme ouvre un paragraphe distinct. Les tirets qui appartiennent réellement à la syntaxe d’une phrase ou d’une incise restent conservés. Cette séparation est portée par les sous-blocs éditoriaux (`editorial_normalization.blocks`) et non fabriquée par CSS ou par une expression régulière au rendu.

**6. Normalisation des abréviations.** Dans la lecture éditoriale, développer les abréviations certaines et utiles à la lecture, sauf la locution latine *et cetera*, toujours abrégée en *etc.* : `l’hébr.` → `l’hébreu`, `Comp.` → `Comparer`, `h. l.` → `à cet endroit`, `c.-à-d.` → `c’est-à-dire`, `ss.` → `suivants` ou `suivantes` selon le contexte, `et cetera` → `etc.`. `cf.` reste distinct de `Comp.` : il ne devient jamais `Comparer` et se compose en italique conformément au § 3.6. Toute abréviation ambiguë demeure en `review`. La forme imprimée reste conservée dans la couche source.

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

Dans la couche éditoriale Fillion, les têtes liminaires qui transcrivent le nom du livre ou une mention d’introduction conservent la casse imprimée : `ÉVANGILE SELON SAINT LUC` reste `ÉVANGILE SELON SAINT LUC` ; `INTRODUCTION` reste `INTRODUCTION`. Une variante en casse française n’est admise que pour un libellé distinct composé par Corpus Scriptura et ne remplace jamais le heading source.

Le numéro imprimé ne suffit jamais, à lui seul, à créer un niveau de titre. Toutefois, une série continue de repères `1°`, `2°`, `3°`, etc. placés chacun en tête de paragraphes distincts constitue un indice structurel positif lorsqu’elle est confirmée par le contexte du témoin — notamment lorsqu’un niveau interne emploie une autre forme (`1.`, `2.`) et que les énumérations `1°`, `2°`, etc. qui ne sont pas structurelles restent inline dans un même paragraphe. Dans ce cas, tous les membres de la série appartiennent au même niveau analytique, même si certains commencent par une phrase complète plutôt que par un intitulé nominal. Les vrais headings de cette série sont normalisés à l’affichage sous la forme `1.`, `2.`, `3.`, etc.

**Règle systématique des ordinaux numériques Fillion.** Dans toute la couche éditoriale de lecture, un repère ordinal numérique imprimé sous la forme `1°`, `2°`, `3°`, etc. se rend toujours `1.`, `2.`, `3.`, etc., qu’il soit titre, début de paragraphe, élément d’une énumération inline ou renvoi à une subdivision. ⛔ Le signe `°` ne paraît jamais comme marqueur ordinal dans l’interface. La forme imprimée demeure dans le témoin source ou sa provenance. Cette règle ne concerne pas le véritable signe de degré ni les formats bibliographiques tels que `in-4°`.

**Ultime niveau numérique.** Lorsqu’un niveau numéroté possède lui-même des sous-divisions numériques et qu’aucun intitulé autonome n’impose un autre système, le niveau le plus profond se rend en numérotation décimale hiérarchique : sous `1.` viennent `1.1`, `1.2`, `1.3` ; sous `2.` viennent `2.1`, `2.2`, `2.3`, etc. Cette convention sert uniquement à distinguer visuellement deux profondeurs numériques successives dans la couche éditoriale ; la forme imprimée demeure conservée dans le témoin source ou sa provenance.

Aucune rubrique courte ne doit être inventée pour rendre la série régulière. Lorsque le témoin fournit un libellé autonome ou une ponctuation de titre, ce libellé est repris. Lorsqu’une division de même niveau commence directement par une phrase et qu’aucun titre abrégé n’est attesté, le libellé éditorial reprend mot pour mot la première phrase — ou, si le témoin marque clairement une césure interne, la proposition initiale — et le reste demeure en prose. Les sous-points (`1.`, `2.`) et les énumérations inline ne sont jamais promus pour compléter artificiellement une hiérarchie. Toute scission conserve exactement les empans du témoin source et n’altère pas `text_content`.

Lorsqu’un titre ou un chapeau analytique est suivi d’une référence biblique qui en définit la portée, la référence est placée entre parenthèses immédiatement après l’intitulé : `Quelques récits relatifs à l’enfance de Jésus (Luc 1, 1 - 2, 52).`


### 35.5.2. Sous-sections et références bibliques des titres Fillion

Dans la couche éditoriale de lecture, les marqueurs imprimés `§ I.`, `§ II.`, `§ III.`, etc. ne s’affichent pas lorsqu’ils ne font que répéter la hiérarchie déjà portée par le niveau de titre. On conserve l’intitulé descriptif qui suit, ainsi que le niveau sémantique nécessaire à la structure ; on ne modifie pas globalement le style T4 et on ne supprime pas le témoin source. Exemple : `§ I. — Prédiction de la naissance du précurseur. I, 1-25.` → `Prédiction de la naissance du précurseur (1, 1-25)`.

Les désignations structurelles de section qui transcrivent un titre imprimé conservent sa formulation, sa casse et sa ponctuation : `SECTION I. — LES DEUX ANNONCIATIONS` reste `SECTION I. — LES DEUX ANNONCIATIONS`. Le repère (`Section I`, etc.) peut être analysé séparément pour la hiérarchie, mais cette analyse ne réécrit pas le titre source. Une formulation normalisée n’est possible que comme objet éditorial distinct et explicitement qualifié.

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

**Passage obligatoire par la normalisation bibliographique.** ⛔ Une ligne qui désigne une traduction, une édition, une monographie, un article, un commentaire, une source primaire ou tout autre ouvrage cité ne reste jamais une simple chaîne de paratexte. Dès qu’un tel objet est rencontré — dans une « Liste des traductions françaises », une « Liste alphabétique des ouvrages cités », une bibliographie, des « Ouvrages consultés », « Du même auteur » ou toute liste analogue — il faut passer par l’outil **« Normaliser »** de l’administration. Ce passage recherche d’abord une fiche existante au moyen de la clé bibliographique normalisée (même principe que `internal.normaliser_cle_bibliographique`) et la réutilise ; ⛔ on ne crée jamais un doublon parce que la casse, la ponctuation, l’abréviation ou l’ordre des éléments diffèrent dans le témoin. Si aucune fiche fiable n’existe, créer la fiche d’ouvrage correspondante dans `ouvrages_bibliographiques`, puis rattacher l’entrée à son `ouvrage_id`.

**Créer et compléter l’ouvrage au moment où on le rencontre.** La normalisation n’est pas un simple nettoyage typographique. Une référence identifiable doit devenir une donnée structurée. Renseigner, dans la mesure où les sources le permettent, le titre et le sous-titre, les auteurs et autres contributeurs, les traducteurs ou directeurs, la langue, le lieu, l’éditeur, l’année, la mention d’édition, la collection et son numéro, l’ISBN lorsqu’il est pertinent, le `type_ouvrage`, la provenance et les notes nécessaires. Les contributeurs et autorités existants sont réutilisés ; les relations correspondantes sont créées plutôt que répétées en texte libre. Une donnée non établie reste `null` ou en revue : ⛔ on ne complète jamais une notice par conjecture. Lorsque le fac-similé est insuffisant, confronter si possible une autorité bibliographique externe et documenter la provenance de la valeur retenue.

**Nature et structure obligatoires.** Une liste dont les entrées sont des références bibliographiques est une pièce bibliographique, même si son titre ne contient pas le mot « Bibliographie ». Dans le modèle actuel, ses unités portent `type_unite = 'bibliographie'`, les segments qui la matérialisent relèvent de `nature = 'apparat_editeur'`, et la présentation utilise le style `bibliographie` ou son équivalent structuré. Une « Liste des traductions françaises » est donc bibliographique au même titre qu’une « Liste alphabétique des ouvrages cités » : ⛔ elle ne reste pas en `type_unite = 'paratexte'` générique si ses lignes sont des notices d’éditions ou de traductions. `ouvrages_bibliographiques.type_ouvrage` reçoit la catégorie scientifique réellement appropriée parmi le vocabulaire contrôlé du projet (`source_primaire`, `edition_critique`, `commentaire_critique`, `monographie`, `introduction`, `theologie_biblique`, `histoire_reception`, `outil_philologique`, `autre_scientifique`) ; on ne crée pas une valeur ad hoc pour imiter le titre de la pièce.

**Espace documentaire ≠ normalisation bibliographique.** Le classement d’une pièce dans `introduction`, `apparat_critique`, `corps` ou toute autre surface est ORTHOGONAL à son contrat bibliographique. Déplacer une liste dans le bon `espace_textuel` ne la normalise pas et ne l’autorise jamais à retomber sur sa chaîne source. Toute unité `type_unite = 'bibliographie'`, où qu’elle soit placée, reste soumise intégralement aux §§ 29.0 et 35.6 : `ouvrage_id` comme identité, autorités normalisées, `presentation.style = bibliographie`, composition champ par champ et ponctuation générée. Les champs `espace_textuel`, `display_surface`, `clean_text`, `segment_texte` ou une chaîne `bibliographic_display_text` matérialisée ne peuvent jamais devenir la source de vérité à la place des données structurées.\n\nLorsqu’une projection textuelle est matérialisée pour compatibilité avec le lecteur, elle est exclusivement un CACHE dérivé de `ouvrage_id`. Elle porte explicitement son contrat de normalisation et sa provenance structurée, et doit être régénérée dès qu’un titre, sous-titre, contributeur, lieu, éditeur, date ou autre autorité change. Si le modèle de rendu supporte les fragments sémantiques, une notice structurée expose les rôles normalisés `bibliographie-titre-ouvrage`, `bibliographie-sous-titre`, `bibliographie-auteur`, `bibliographie-nom-auteur` et `bibliographie-donnees`; une chaîne recomposée sans ces rôles ne suffit pas à déclarer la notice conforme. La chaîne OCR/imprimée reste uniquement dans la provenance source.\n\n**Contrôle bloquant supplémentaire :** pour toute bibliographie affichée dans un apparat ou un liminaire, vérifier séparément (1) son emplacement documentaire et (2) son contrat bibliographique. Une passe ne peut être close avec « emplacement correct » si une seule entrée structurée est encore rendue depuis le brut, si un pseudo-éditeur matériel a été créé comme autorité, si un titre contient encore une mention de contributeur déjà portée par un champ dédié, ou si une projection matérialisée n’est pas traçable à son `ouvrage_id`.\n\n**Lien entre la pièce et la notice.** Lorsque la pièce utilise la couche bibliographique éditoriale, chaque entrée est rattachée à `bible_editorial_bibliography_entries.ouvrage_id` (ou à la relation structurée équivalente du contexte concerné) ; le rang matériel de la source reste une donnée de provenance, tandis que l’identité vient de l’ouvrage. Le texte bibliographique brut du témoin demeure conservé dans la couche source pour contrôle, mais il ne sert pas de notice finale et ne doit pas être recopié comme pseudo-normalisation.

**Contrôles bloquants avant clôture.** Pour toute liste bibliographique reprise : 0 entrée identifiable laissée sans recherche de correspondance ; 0 doublon de fiche créé par variation de forme ; 0 ouvrage structuré sans titre ; 0 valeur éditoriale ajoutée sans provenance lorsqu’elle n’est pas directement attestée ; 0 liste d’ouvrages laissée en paratexte générique ; 0 entrée bibliographique rendue depuis la chaîne source quand un `ouvrage_id` structuré existe. Le bilan de passe donne au minimum le nombre d’entrées rencontrées, réutilisées, créées, encore en revue, complétées éditorialement et correctement rattachées à leur nature bibliographique.

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

**Repli historique — administration seulement, jamais publication.** Une bibliographie ancienne que la donnée déclare mais qui n’est pas encore structurée peut conserver sa chaîne brute **uniquement comme provenance, témoin ou dette visible en administration**. ⛔ Ce repli n’est pas une source d’affichage public et ne permet jamais de déclarer la pièce conforme. Avant publication, toute référence identifiable passe par **Normaliser** et se rattache à `ouvrage_id` (ou à `related_ouvrage_ids` pour un véritable renvoi), puis le rendu se compose depuis les champs et autorités structurés. Si l’identification reste impossible, la chaîne source demeure en `review` avec motif explicite ; elle n’est ni analysée heuristiquement au rendu ni présentée comme une notice normalisée. `presentation.style = bibliographie` ne prouve donc jamais, à lui seul, la conformité bibliographique.

### 35.6.3. L’ordre d’une bibliographie se CALCULE

L’ordre d’affichage d’une liste bibliographique ne se lit pas dans la donnée : il se calcule, et de la même manière pour toutes les listes. **D’abord la vedette, ensuite le titre.**

**La vedette** est le nom de famille de l’auteur lorsqu’il y en a un, le titre lorsqu’il n’y en a pas. ⛔ Une œuvre anonyme ne fait pas un bloc à part, ni en tête ni en queue : elle se range à son titre, dans la même suite alphabétique, comme un catalogue le fait. Deux homonymes se départagent par le prénom. ⛔ L’article ne se retire jamais d’un nom d’autorité : « La Taille » est un nom, non un titre précédé d’un article.

**Le titre** se range **article et déterminant initiaux ôtés** : « L’Idée centrale de la Bible » se range à I, « Les Saints Évangiles » à S, « Une histoire du canon » à H. L’accent, la casse, l’apostrophe et le trait d’union ne comptent pas — « Saint-Jean » se range comme « Saint Jean », et « Évangile » tombe entre « Essais » et « Introduction ». ⛔ Le retrait ne vaut QUE pour le classement : le titre affiché garde son article, toujours. ⛔ Un titre qui n’est QUE son article se range sous lui, faute de quoi sa clé serait vide.

⛔ **Le latin n’a pas d’article, et il est ici partout.** Les mots qui sont à la fois articles d’une langue moderne et mots latins ne sont donc pas retirés : `a` (article anglais, mais préposition latine), `de`, `in`, `ex`, `ad`, `pro` (prépositions dans les deux langues), `una` et `uno`. « A solis ortus cardine » se range à A, « De civitate Dei » à D. La liste des mots écartés est CLOSE — français, anglais, allemand — et ne s’étend qu’en connaissance de cause.

À égalité parfaite — même vedette, même prénom, même titre, même sous-titre, même année —, c’est le **rang de la page imprimée** qui départage. ⚠️ `display_order` demeure dans la donnée comme témoin du volume ; ⛔ il n’est plus l’ordre d’affichage.

### 35.6.4. Catalogue bibliographique obligatoire et autorités d’éditeurs

**Toute œuvre identifiable citée dans Corpus Scriptura doit être répertoriée dans `ouvrages_bibliographiques`**, quelle que soit la surface où elle apparaît : texte ou apparat biblique, introduction, commentaire, note, bibliographie critique, sigle développé, œuvre patristique, apparat critique ou autre paratexte. Une citation n’est pas considérée comme bibliographiquement normalisée parce que son auteur et son titre ont seulement été reconnus dans une chaîne ou dans un JSON : dès que l’identité de l’œuvre est établie, la citation structurée doit pointer vers un `ouvrage_id`.

Cette obligation vaut aussi pour les œuvres antiques, médiévales ou anciennes lorsqu’aucune édition moderne précise n’est citée. Dans ce cas, on crée ou réemploie une notice au niveau documentaire réellement attesté, sans inventer lieu, éditeur, date ni édition. Si l’identification demeure incertaine, la citation reste explicitement en `review`, avec la forme source conservée et le motif de l’incertitude ; elle ne disparaît jamais silencieusement. Les références bibliques et les simples renvois internes ne sont pas des ouvrages bibliographiques et échappent à cette règle.

**L’éditeur d’une notice doit être une autorité, non une simple chaîne libre.** Lorsqu’un éditeur est identifié, `ouvrages_bibliographiques.editeur_valeur_id` doit pointer vers l’autorité correspondante dans `editeurs_valeur`. Si cette autorité existe déjà sous son nom canonique ou sous un alias, le rattachement est obligatoire : ⛔ ne pas créer de doublon. Si elle n’existe pas, créer une seule autorité canonique, y conserver les variantes utiles comme alias, puis rattacher la notice. Si l’éditeur reste douteux, conserver la forme source et le statut de révision sans fabriquer d’autorité conjecturale. `editeurs_valeur` est le référentiel bibliographique qui alimente la normalisation et la section « Éditeurs » de l’administration ; l’ancienne table `editeurs` ne constitue pas l’autorité de normalisation des notices bibliographiques.

**La rubrique de normalisation des éditeurs est exhaustive.** Toute forme non vide présente dans un champ `editeur` ou `publisher` d’une table source du corpus doit être représentée dans `editeurs_valeur`, soit comme autorité canonique, soit comme alias, soit comme candidat `a_verifier`. Cette règle vaut notamment pour `ouvrages_bibliographiques`, `catalogue_notices`, `oeuvres`, `editions_sources`, `bible_edition_components`, `propositions_oeuvres` et `sources_pericopes`. ⛔ Une forme source ne peut rester invisible au seul motif qu’elle n’a pas encore été normalisée : elle doit apparaître dans la rubrique d’administration afin de pouvoir être contrôlée, fusionnée, conservée comme variante ou exclue.

**Déclarer une variante, c’est FUSIONNER.** Dès qu’une graphie est inscrite parmi les variantes d’une autorité, elle cesse d’être une autorité : ⛔ elle ne peut pas figurer en même temps dans la liste des éditeurs normalisés. La fiche redondante est ABSORBÉE — ses propres variantes rejoignent celles de l’autorité retenue, ses rattachements (`ouvrages_bibliographiques.editeur_valeur_id`, `collections_editeurs`) lui passent AVANT que la ligne ne disparaisse, et la note de valeur académique la suit **avec sa provenance** si l’autorité retenue n’en portait aucune : un score et la source qui le justifie ne se séparent pas. ⛔ On ne se contente jamais de FILTRER l’affichage, les références resteraient accrochées à une entrée devenue fantôme. ⛔ Et l’on ne réécrit pas pour autant la donnée source (`oeuvres.editeur`, `ouvrages_bibliographiques.editeur`, `catalogue_notices.editeur`), qui est la provenance.

**Une graphie ne se rattache qu’à UNE autorité.** Une variante déjà revendiquée par une autre fiche est refusée, et le refus NOMME celle qui la porte : départager deux autorités est une décision philologique, la machine ne tranche pas. Une fiche ne se cite jamais elle-même parmi ses variantes, et deux graphies de même clé n’y figurent qu’une fois. ⚠️ Le verrou est en BASE et non dans l’écran de saisie : une graphie qui remonterait en autorité par un script ou par une requête doit échouer là aussi. La règle vaut pour les DEUX référentiels — `editeurs.variantes` pour les maisons des éditions primaires, `editeurs_valeur.aliases` pour les autorités bibliographiques — et une déclaration portée dans l’un se propage à l’autre lorsque l’autorité correspondante y existe ; ⛔ elle n’en crée aucune, ouvrir une autorité bibliographique étant un geste éditorial et non l’effet second d’un enregistrement. **Contrôle de clôture** : `public.autorites_editeurs_a_fusionner()` doit rester vide, et `public.variantes_editeurs_disputees()` nomme ce qui attend un arbitrage.

**La résolution lit la forme ENTIÈRE avant de la découper.** « Veuve Jean Camusat ; Pierre Le Petit » est UNE graphie de la maison, non deux maisons : le point-virgule y sépare deux associés, comme le « et » de la forme retenue. Découper d’abord rendait introuvable toute variante qui porte un « ; », si bien qu’une variante déclarée restait sans effet à l’affichage alors même qu’elle était en base. Le découpage en co-éditeurs n’est donc qu’un REPLI, pour la forme composée que la table ne répertorie pas.

**Le « ; » sépare deux MAISONS, il n’entre jamais dans le nom de l’une.** Deux éditeurs qui ont travaillé au même ouvrage se notent « A ; B » : c’est la norme du catalogage. ⛔ Une telle forme n’est donc pas une autorité et n’a pas sa place dans la liste des éditeurs normalisés. Elle se TRAITE : on ouvre ou l’on réemploie chaque maison — celle qui est déjà répertoriée, fût-ce sous une variante, ne se crée pas une seconde fois —, puis la forme composée disparaît. ⚠️ Une partie qui n’est pas une maison — une mention de diffusion, d’impression ou de réédition — se retire de la forme AVANT de la séparer : elle ne devient pas une autorité, et l’on aurait remplacé une fiche parasite par une autre. ⚠️ Une VARIANTE composée demeure licite, et la distinction porte : « Veuve Jean Camusat ; Pierre Le Petit » est une graphie d’une maison UNIQUE, dont l’enseigne associe deux noms ; le verrou ne regarde donc que le nom.

**À l’affichage, une coédition ne se rend jamais telle quelle.** Chaque maison se résout pour son propre compte et la barre oblique les joint, que la forme composée ait été laissée dans la table par un import ou qu’elle n’y ait jamais figuré. ⚠️ La barre, elle, ne sépare rien : elle appartient à de vrais noms de maison — « Centre Thomas More / CADIR », « Leuven University Press / Peeters » — et ne décide de rien.

**Contrôle de clôture obligatoire.** Toute passe bibliographique, y compris sur une bibliographie ancienne déjà présente dans le corpus, vérifie au minimum : (1) chaque œuvre identifiable possède ou réemploie un `ouvrage_id` ; (2) chaque éditeur identifié possède ou réemploie un `editeur_valeur_id` ; (3) aucun doublon d’œuvre ou d’autorité n’a été créé ; (4) les formes imprimées ou OCR restent conservées comme provenance lorsqu’elles diffèrent de la forme normalisée. Une bibliographie critique d’introduction — notamment chez Fillion — n’est donc pas achevée tant que ses références n’ont pas été raccordées au catalogue et aux autorités correspondantes.

### 35.6.5. UN moteur de rendu bibliographique, et la base est la source

**Décision de l’auteur du 5 septembre 2026** (mission « moteur centralisé de rendu bibliographique automatique »). Une référence bibliographique se COMPOSE depuis la base, jamais depuis un texte précomposé. Dès qu’une notice est liée à un `ouvrage_id`, le `segment_texte` qui la portait cesse d’être la source du rendu : il reste la projection de secours, la matière de la recherche et de l’export, et l’on n’y écrit rien pour l’affichage.

⛔ **Un seul moteur pour toutes les surfaces** : la liste « Du même auteur » et les bibliographies de Fillion, l’apparat d’une œuvre (la bibliographie de Mirandol chez Boèce), la bibliographie d’une péricope, la fiche d’un ouvrage dans l’administration, les introductions bibliques. Six écritures coexistaient et divergeaient ; il n’en reste qu’une, et une règle qui change là change partout. ⛔ Ne pas créer un système de plus à côté. ⛔ Ne pas recopier une référence composée dans un segment. ⛔ Ne pas enregistrer de HTML ni d’astérisques d’italique dans `ouvrages_bibliographiques`.

**Trois plans séparés.** La DONNÉE : les champs de la notice, ses contributeurs et ses éditeurs résolus sur leurs autorités, servis par la vue `v_references_bibliographiques`, que tout lecteur peut lire avec les autorités jointes. Les RÔLES : chaque fragment dit ce qu’il EST (prénom, nom de famille, titre, sous-titre, titre hôte, tomaison, pages, éditeur scientifique, traducteur, directeur, collection, lieu, éditeur, date), et la ponctuation, les liants et les guillemets n’ont pas de rôle : ils appartiennent à la séquence où ils tombent. La PRÉSENTATION : la feuille compose chaque rôle, et ses règles se pendent à l’enveloppe de la référence (`.cs-reference-bibliographique`), quelle que soit la surface qui la porte.

**La FORME d’une notice** (monographie, article de périodique, contribution à un collectif, entrée de dictionnaire) décide de sa composition, non de sa valeur scientifique. Cinq champs la portent : `forme_notice`, `titre_hote`, `tomaison`, `pages`, `date_affichee`. Une forme absente se déduit : un titre hôte fait un article ; sans hôte, une monographie. ⛔ Jamais de ville, de date ni d’éditeur inventés pour obtenir une notice « complète » : un champ absent emporte son séparateur, et la notice dit ce que la base sait.

**Typographie générée, jamais tapée.** Auteur moderne : prénom en romain, NOM DE FAMILLE en petites capitales, tiré de `auteurs_valeur.prenom` et `nom_famille` ; ⛔ jamais par découpe de la chaîne affichée, et une autorité sans rubriques, un auteur ancien, se compose ENTIER en petites capitales. Un nom en texte libre reste en romain. Titre de monographie en italique ; titre d’article ou de contribution en romain entre guillemets français à fines, puis l’hôte en italique, « dans » devant un collectif ou un dictionnaire, jamais devant un périodique. « éd. Nom », « trad. Nom », « dir. Nom ». Coéditeurs joints par la barre à fines du § 35.6.4. « p. » suivi d’une insécable, tiret demi-cadratin entre deux pages. Insécables et fines devant la haute ponctuation, apostrophe courbe, un seul point final, jamais deux espaces. Les petites capitales s’écrivent `font-variant-caps: small-caps`, ⛔ jamais par `text-transform`.

⚠️ **La police servie ne dessine pas les petites capitales.** Source Serif 4, telle que Google Fonts la livre au site (version 4.004), n’a ni `smcp` ni `c2sc` : le navigateur les synthétise en capitales réduites. L’amont Adobe (4.005) les dessine, en romain seulement ; les avoir vraies demande d’auto-héberger la police. Décision d’auteur en attente.

⚠️ **Un rendu précomposé en base est au mieux un cache, jamais une source.** `segment_metadata.bibliography_render`, que 136 segments de Boèce portent, n’est plus lu par rien : il ne peut plus contredire la base. La projection SQL qui écrit une bibliographie en texte dans les couches de lecture sert la recherche et l’export, non le rendu.

**Écriture.** Le moteur ne modifie aucun texte source. Quand la donnée se corrige, on ne touche qu’aux colonnes qui changent, en transaction, avec sauvegarde et retour en arrière ; `texte_norm` est généré depuis `segment_texte` et ne s’écrit jamais.

### 35.6.6. La référence qui SORT du site se compose du même moteur

**Décision de l’auteur du 5 septembre 2026** : uniformiser les références bibliographiques sur l’ensemble des pages, le copier-coller compris. Une référence n’est pas une affaire d’écran. Elle part au presse-papiers d’un lecteur qui va la coller dans son traitement de texte, et elle entre dans la note d’un essai. Ces deux sorties disent la MÊME référence que la page d’où elles viennent, et par le même moteur.

⛔ **Trois écritures d’une référence, et trois seulement.** Les FRAGMENTS que le moteur rend se balisent en nœuds pour l’écran, en HTML pour un collage riche, et entre astérisques pour le balisage des textes du site. Aucune ne recompose : elles disent l’italique et les petites capitales dans leur langue, et s’arrêtent là. ⛔ Hors du site, une classe arrive nue : les petites capitales s’écrivent alors en style inline, seule exception à la règle qui veut que la composition vienne de la feuille.

⚠️ **Les fragments italiques CONSÉCUTIFS se réunissent en une seule course.** Le titre, le point qui le joint à son sous-titre et le sous-titre sont trois fragments d’un seul intitulé. Balisés un à un, ils donnent `*Titre**. **Sous-titre*`, que l’enrichissement lit comme une italique fermée puis rouverte, c’est-à-dire comme rien du tout.

⚠️ **Le POINT FINAL tombe quand la phrase continue.** Le presse-papiers enchaîne « …, disponible sur le site Corpus Scriptura : “…” » et la note d’un essai ajoute son locus (§ 12) : le point du moteur tomberait au milieu. ⛔ On ne retire que le point que le MOTEUR a posé, jamais la ponctuation d’une donnée.

**Une ŒUVRE du catalogue est une notice comme une autre.** `oeuvres` n’a aucun lien vers `ouvrages_bibliographiques` et porte ses propres champs libres. Un adaptateur les nomme dans le vocabulaire du moteur, et s’arrête là : l’auteur y est une forme d’autorité et se compose donc en petites capitales, les traducteurs sont NETTOYÉS et non composés, le liant et l’énumération appartenant au moteur, et les maisons que le point-virgule du catalogue sépare se joignent par la barre à fines du § 35.6.4.

⚠️ **Ce que la mise en ordre a corrigé, et qui se voyait**, sur la citation d’une œuvre du catalogue : l’éditeur venait avant la collection, la collection paraissait toute nue au lieu de « coll. “…” », la ville suivait l’éditeur au lieu de le précéder, et deux maisons coéditrices gardaient le point-virgule d’une colonne de base.

⛔ **Le REPLI d’une surface se compose du même moteur.** La bibliographie d’une péricope dont l’entrée n’a pas d’`ouvrage_id`, ou dont la vue des références n’a pas répondu, passe ses champs libres au moteur au lieu de garder une mise en forme à elle. ⚠️ Aucune petite capitale alors : elles viennent des autorités, que seule la notice structurée porte.

⚠️ **Une seule référence se compose encore à part, et sa raison est écrite** : celle des VOLUMES SERVIS d’une bible (§ 38.4), dont les millésimes sont un texte que le catalogue des ouvrages ne saurait dire, et qui porte une mention d’édition, un dépôt, une cote et un nombre de tomes qu’une notice d’ouvrage n’a pas. Elle partage la ponctuation du moteur et le type de ses fragments. ⛔ Elle ne fonde pas une seconde norme.

### 35.7. Les guillemets d’une citation en langue étrangère restent en romain

Une citation latine ou une translittération grecque en alphabet latin enchâssée dans une phrase française se compose en italique, mais les guillemets qui l’encadrent appartiennent au français qui cite et restent en romain. On écrit donc « *Jesu Christi* » et jamais *« Jesu Christi »*. ⛔ L’italique ne se pose pas sur le conteneur qui porte les guillemets, ni la langue étrangère sur la ponctuation française qui les entoure.

**Règle grecque Fillion.** Un terme, lemme ou citation grecque écrit en caractères grecs reste en romain dans la couche éditoriale, conformément au § 3.6. Seules les translittérations du grec en alphabet latin se composent en italique. Les guillemets et la ponctuation française restent en romain. La couche source demeure inchangée.

La ponctuation stockée fait foi et ne se déplace pas au rendu. Un point-virgule que l’édition place hors des guillemets y reste ; ⛔ le rendu ne le rentre pas dans la citation, et ne recompose pas davantage l’apostrophe typographique, qui demeure U+2019 sur toutes les surfaces éditoriales françaises.



### 35.8. Méthode obligatoire de traitement, correction et clôture Fillion (26 août 2026)

Cette méthode est obligatoire pour chaque livre Fillion. Elle découle des erreurs constatées pendant la reprise de Matthieu : une passe mécanique peut être propre tout en laissant des doublons, des abréviations ou d’anciennes lectures dans une projection secondaire. ⛔ Ne jamais déclarer un livre « terminé » à partir d’un seul contrôle global ou d’une seule couche de texte.


#### 35.8.0. Cycle canonique de travail — protocole vivant

Le chantier Fillion suit un cycle unique, cumulatif et réouvrable. Il s’applique à tout livre, introduction, commentaire, note, liminaire et paratexte Fillion. Les passes sont exécutées dans l’ordre ci-dessous ; on ne mélange pas plusieurs familles de correction dans une même passe lorsque cela empêcherait d’en mesurer l’effet. Toute correction tardive qui affecte une couche déjà contrôlée rouvre cette couche et toutes les passes qui en dépendent.

Le protocole est **vivant** : lorsqu’une erreur nouvelle révèle une faiblesse de méthode, on ne corrige jamais seulement l’exemple rencontré. On définit la famille d’erreur, on recherche tous les cas analogues dans le périmètre pertinent, on les corrige ou on les classe, puis on enrichit le présent protocole si la règle est générale. Une règle nouvelle précise toujours son déclencheur, son périmètre, le contrôle attendu et la preuve de clôture. Si elle est rétroactive, les livres déjà traités susceptibles d’être touchés sont réaudités.

**Discipline d’exécution — micro-passes et lots courts.** Une passe est réalisée par micro-passes homogènes. Pour une lecture ou une correction séquentielle, le lot ordinaire couvre au plus quatre chapitres ou divisions consécutifs ; trois à quatre constituent la taille normale. Un lot plus large n’est admis que pour un audit en lecture seule, un contrôle déterministe transversal ou une transformation réellement globale dont l’invariant est explicitement vérifiable. À chaque arrêt, le bilan est chiffré depuis la base et distingue au minimum : objets relus, objets réellement modifiés, typographie, latin et grec, références, spans/enrichissements, notes et ancres, transformations/provenance et reliquats. Aucun « tout est bon » ne remplace ces contrôles.

**Cycle obligatoire de chaque micro-passe.** Avant toute écriture : relire la règle applicable, fixer le périmètre exact, prendre une sauvegarde ciblée des surfaces qui seront modifiées et établir le diagnostic en lecture seule. L’écriture est ensuite bornée aux seules données nécessaires. Lorsqu’une correction est éditoriale, le témoin source ou diplomatique reste inchangé et la transformation conserve son empan source ou sa provenance. Après **chaque** écriture, relire l’état depuis la base, recomposer la projection concernée et exécuter immédiatement les contrôles déterministes dépendants — notamment hashes, empans, transformations, notes, ancres et références. Une micro-passe qui échoue à son postcontrôle n’est pas poursuivie comme si elle était close.

**Synchronisation indivisible des projections structurées.** Toute modification d’un `reading_text` contenu dans `editorial_normalization.blocks` oblige à reconstruire, dans la même transaction, le miroir supérieur `editorial_normalization.reading_text` à partir des blocs dans leur ordre JSON, avec exactement deux sauts de ligne entre paragraphes, sauf contrat différent explicitement déclaré. ⛔ Ne jamais corriger seulement le bloc ni seulement le miroir. Après l’écriture, comparer le miroir au texte recomposé et revalider les offsets de tous les `inline_spans` du ou des paragraphes modifiés ; un span peut être conservé sans déplacement uniquement si ses bornes et le texte qu’il couvre restent exacts.

**Gel explicite du périmètre.** Lorsqu’une mission déclare les styles, natures ou la structure de présentation hors périmètre — par exemple « ne modifier ni style ni nature » — ces couches sont gelées pendant toute la mission. Sont alors interdits les changements de `nature`, rôle ou `kind`, niveaux, parents sémantiques, styles, `presentation` et projections structurelles. Un heading peut recevoir une correction textuelle ou typographique seulement si cette correction appartient explicitement à la passe en cours ; son niveau, sa fonction et sa présentation restent inchangés. Toute anomalie de classification découverte est documentée pour une mission distincte, jamais corrigée par ricochet.

**Passe 0 — Préflight documentaire et état initial.** Identifier le témoin exact, le volume, les pages, le livre et les couches utilisées ; distinguer source/diplomatique et lecture éditoriale ; lister toutes les surfaces réellement rendues (`heading`, corps, sous-blocs de normalisation, notes, titres, chapeaux, bibliographies, illustrations). Ouvrir la mission dans le centre de contrôle, mesurer l’état initial en SQL, identifier les missions parallèles, déclarer explicitement les couches gelées ou hors périmètre et effectuer les sauvegardes ciblées avant toute écriture. Aucun chiffre de suivi n’est estimé.

**Qualification explicite des statuts.** `requires_review = true` et `validation_status = review` sont des indicateurs génériques de circuit éditorial ; ils ne prouvent ni un OCR non collationné, ni une structure incertaine. Le préflight et les bilans distinguent séparément : structure sûre, lecture éditoriale complètement collationnée, collation diplomatique complète, réserve de provenance et bloc réellement non collationné. Cette qualification s’appuie sur le `collation_status` précis, le statut de transcription et la présence du témoin, jamais sur un seul booléen générique. ⛔ Ne jamais effacer un indicateur de revue pour fabriquer artificiellement un état « terminé ».

**Passe 1 — Structure et hiérarchie.** Reconstituer d’abord la structure attestée : livre, partie, section, sous-section, chapitre matériel, péricope, introduction, commentaire, titre, chapeau, lemme et paragraphe. Contrôler les deux axes matériel et analytique (§ 35.5), les parents sémantiques, l’ordre matériel et les corps de blocs. Un titre n’est jamais injecté dans la prose ; un bloc `title` n’a pas de corps ; un intitulé ne se répète pas comme premier paragraphe. Les introductions longues sont structurées : le conteneur/titre peut rester `introduction_livre`, mais leurs développements se composent en prose normale ; le style `introduction` reste réservé aux préambules brefs (§ 35.4.1). Si la structure est gelée par le périmètre de mission, cette passe devient un audit en lecture seule et les écarts sont consignés sans mutation.

**Discrimination titre, manchette et OCR.** Un bloc bref placé avant un développement, surtout s’il porte une plage telle que `1-3`, n’est pas classé comme commentaire OCR du seul fait qu’il n’a pas de corps propre. Il faut confronter sa position, sa typographie, son parent, sa portée et le fac-similé. Lorsqu’il s’agit d’un titre analytique ou d’une manchette, l’absence de corps dans le bloc de titre est normale : le texte d’accompagnement appartient aux blocs enfants ou suivants. La correction porte alors sur la projection et la hiérarchie, tandis que le témoin source reste intact. Les bilans comptent séparément les reliquats de titres et les véritables blocs de commentaire non collationnés.

**Passe 2 — Continuité de lecture, paragraphes et blancs.** Reconstituer les paragraphes selon la syntaxe, le sens et le fac-similé, non selon les fins de ligne OCR ni les changements de page. Supprimer de la couche de lecture les doubles retours, lignes blanches, ruptures de page, paragraphes vides et blocs fantômes qui créent des blancs artificiels ; conserver ces accidents uniquement dans le témoin source lorsque nécessaire. Les transitions de lemme suivent le § 35.3.1 : un tiret long qui ne sert que de séparateur entre deux unités successives d’explication devient une frontière de paragraphe, tandis qu’un vrai tiret syntaxique est conservé. Le premier paragraphe qui appartient à un titre doit visuellement lui être rattaché : on ne crée jamais ce rapprochement par un saut de ligne manuel, un `<br>` ou une suppression de texte, mais par la relation de composition (`leading_paragraph_style` ou équivalent). Le cumul des marges `titre + bloc suivant` doit être contrôlé ; un grand blanc entre un T4 et son développement est une anomalie de composition, non un paragraphe à inventer.

**Passe 3 — Titres, casse et références de portée.** Revoir tous les headings après stabilisation de la structure : niveau, fidélité de la casse au témoin, ordinaux, ponctuation, références bibliques finales, titres de section et de péricope, formes redondantes. Appliquer notamment les §§ 35.1, 35.5.1 et 35.5.2. La casse d’un heading source n’est jamais normalisée. Lorsqu’une référence biblique est transformée pour une projection éditoriale distincte, la forme imprimée du heading reste conservée intégralement dans la donnée de source ou sa provenance ; cette projection ne vaut pas transcription du titre. Après **toute** modification d’une projection de heading, contrôler immédiatement toutes les notes et ancres qui la ciblent.

**Ponctuation haute des headings.** Dans une projection éditoriale française, l’espace précédant `;`, `:`, `!` et `?` est l’espace fine insécable U+202F lorsque la charte générale prévoit une espace. Le postcontrôle recherche explicitement U+0020 et U+00A0 avant ces signes, dans tous les headings du périmètre déjà traité et pas seulement dans les objets écrits pendant le lot. La forme source demeure inchangée.

**Passe 4 — Notes et apparats.** Traiter l’appareil comme un système : identité de la note, numéro, blocs, ordre, appel imprimé, cible `heading` ou `body`, offsets, texte d’ancre, rendu et état de revue. Toute note attestée doit avoir un véritable appel visible et cliquable lorsque l’appel est localisable ; une note appelée ne doit pas être répétée dans un apparat flottant. Ne jamais fabriquer un offset pour compenser une mauvaise classification. Le contenu d’une note ordinaire se compose comme prose normale de note — romain et justifié —, jamais avec le style d’une introduction longue ; seules les fonctions réelles (bibliographie, citation, référence, vers, attribution) dérogent à ce cadre. Les bibliographies suivent les §§ 35.6–35.6.3. Toute normalisation de titre, de texte ou de segmentation oblige à revalider les ancres dépendantes dans la même micro-passe.

**Surface réelle et réancrage déterministe.** Le contrôle d’une note utilise exactement la surface rendue par le bloc, jamais un conteneur supposé universel. Selon le contrat de la donnée, cette surface peut être le texte recomposé des `editorial_normalization.blocks` et son miroir non vide, un `text_content` hérité encore normatif pour une ancienne unité, ou le `heading` lorsque l’appel porte sur un titre. Les offsets sont Unicode, à base zéro, avec borne finale exclusive. `anchor_text` doit correspondre exactement à la tranche visée et n’avoir qu’une occurrence admissible dans la surface ; zéro occurrence ou plusieurs occurrences ambiguës maintiennent la note en `review`. Un réancrage recalcule ensemble `anchor_text`, début et fin, puis vérifie la continuité des rangs `1..n`, l’unicité des rangs et l’unicité des `note_key` dans leur portée. ⛔ Ne jamais déplacer une ancre par simple delta global lorsque la typographie ou le texte intermédiaire a changé.

**Passe 5 — Typographie française, citations et langues.** Appliquer les règles du § 3 et de la synthèse Fillion § 35.0 : espaces U+00A0/U+202F, apostrophes, guillemets, ponctuation, points de suspension, ellipses d’omission, capitales d’insistance, incises et parenthèses. Contrôler ensuite les langues et écritures. Un mot, lemme ou passage latin non cité se compose en italique sans guillemets ; une citation latine directe se compose en italique **et** entre guillemets français. Toute omission interne à une citation directe se note `[…]`, jamais `…` ni `...`. Le grec écrit en caractères grecs reste en romain — par exemple `ἐν ἀρχῇ` ou `πνευματικὸν εὐαγγέλιον` — ; seules les translittérations du grec en alphabet latin se composent en italique. Les guillemets et la ponctuation française restent en romain. Ne jamais déduire un italique d’un simple motif lexical lorsqu’un homographe français est possible. Le contrôle porte également sur les notes et les headings, pas seulement sur le corps principal.

**Passe 6 — Désabréviations, références et bibliographie.** Faire une micro-passe distincte sur les abréviations, puis une autre sur les références bibliques et savantes. Les expansions sont grammaticales et contextuelles ; `cf.` reste distinct de `Comparer`. Les sigles bibliques suivent le § 3.5.1 et la forme normative ne place jamais de virgule entre le livre et le chapitre : `2 R 12, 7-11`, non `2 R, 12, 7-11`. Une référence incidente qui précise un lieu, un épisode ou une proposition se place entre parenthèses lorsqu’elle n’est pas grammaticalement intégrée à la phrase. Toute référence impossible ou incohérente est confrontée au témoin avant correction. Les notices bibliographiques utilisent la donnée structurée : auteurs d’autorité, titres/sous-titres, lieux, éditeurs et dates ; aucune description matérielle ne se glisse dans une liste d’ouvrages lorsque la charte l’exclut.

**Renvois introduits par « comparer ».** Un renvoi autonome ou une proposition incidente de type `Comparer Ap 3, 4` / `comparer Jn 8, 12` se place entre parenthèses, quelle que soit la casse du verbe. En revanche, un emploi grammatical intégré — par exemple `Il suffit de comparer le verset 58 et Mt 26, 61 pour voir…` — reste dans la phrase et n’est pas parenthésé mécaniquement. Le contrôle final est donc à la fois syntaxique et sémantique : il mesure la profondeur de parenthèses, classe séparément les renvois parenthésés, les emplois intégrés légitimes et les renvois incidents résiduels, puis exige zéro dans cette dernière catégorie. Une recherche brute de toutes les chaînes `comparer` ne suffit pas. Les abréviations comme `vers.` sont contrôlées par mot entier et leurs rares emplois non bibliographiques légitimes, tels que `jusque vers`, sont classés explicitement plutôt que réécrits.

**Passe 7 — Lecture directe du témoin.** Après toutes les passes mécaniques et structurelles, lire réellement le texte dans l’ordre matériel, chapitre ou division après chapitre ou division, par lots courts selon la discipline ci-dessus, avec le fac-similé pour les zones sensibles. Rechercher ce que les contrôles automatiques ne voient pas : fautes OCR plausibles, omissions, doublons, mots collés, ruptures de phrase, mauvais titres, références absurdes, appels de note déplacés, faux paragraphes, italiques sémantiquement faux et anomalies de sens. Une lecture directe est une passe à part entière ; elle n’est jamais remplacée par un compteur à zéro.

**Contrôle séparé du texte biblique Fillion.** Dans un commentaire biblique, les unités de texte biblique Fillion constituent une surface distincte du paratexte et du commentaire. Lorsque `source_markup` ou un témoin textuel natif existe, comparer lexicalement la lecture au témoin après neutralisation des seules différences éditoriales autorisées ; les corrections du commentaire ne doivent jamais contaminer le verset. Toute unité sans témoin stocké est comptée comme réserve de provenance et n’est pas déclarée collationnée. ⛔ Ne jamais fabriquer un `source_markup` à partir du texte courant pour satisfaire ce contrôle.

**Passe 8 — Contrôle du rendu réel.** Vérifier l’interface après stabilisation des données : hiérarchie visuelle, espacements verticaux, relation titre → premier paragraphe, continuité des longues introductions, absence de blancs indésirables, notes en exposant et fenêtres de note, bibliographies, citations, retraits et comportements sur mesure étroite. Vérifier explicitement que le grec n’est pas italique, que le latin cité/non cité est distingué correctement et que les références incidentes ou de heading ont la forme attendue. Un défaut visuel est d’abord diagnostiqué comme défaut de donnée ou de relation sémantique ; le CSS global n’est modifié qu’en présence d’une règle réellement générale. Aucun saut de ligne artificiel n’est ajouté pour réparer une marge.

**Passe 9 — Intégrité et postcontrôles déterministes.** Relire l’état depuis la base après le dernier lot. Vérifier au minimum : recomposition exacte des projections ; source inchangée lorsque seule la lecture a été corrigée ; absence de corps dans les titres ; absence de heading répété ; continuité et unicité des ordres et clés ; cohérence des parents ; absence de paragraphes vides ; typographie sans résidu ciblé ; notes/blocs/ancres sans orphelin ; appels résolus ; ancres de titre synchronisées ; spans dans leurs bornes ; transformations alignées sur leur source ; références canoniques valides ; sauvegardes présentes. Les postcontrôles sont également exécutés après chaque micro-passe d’écriture, et non seulement à la fin du livre. Tous les nombres annoncés viennent de requêtes déterministes.

**Preuve différentielle d’intégrité.** Lorsqu’une passe modifie légitimement `text_features`, une empreinte de la ligne JSON complète diffère nécessairement et ne suffit pas à prouver que la source est intacte. La sauvegarde et le postcontrôle calculent séparément une empreinte de surface source sur `text_content` et `source_markup`, puis comparent les parties non autorisées de `text_features` en excluant seulement les chemins annoncés comme modifiables. Ils vérifient aussi que les paragraphes non ciblés et tous les champs de blocs autres que ceux autorisés sont identiques. La clôture exige : empreinte source exacte, zéro champ inattendu modifié, miroir exact et spans dans leurs bornes.

**Passe 10 — Sondage indépendant et clôture.** Après la dernière correction, effectuer au moins deux sondages reproductibles répartis entre types d’objets et divisions. Toute erreur trouvée rouvre la famille correspondante : rechercher tous les analogues, corriger, rejouer les passes dépendantes et refaire les sondages. La clôture distingue au minimum : `structure close`, `continuité close`, `titres close`, `notes close`, `typographie/langues close`, `références/bibliographie close`, `lecture directe close`, `rendu contrôlé`, puis `relecture éditoriale exhaustive close`. Aucun statut humain n’est attribué automatiquement.

**Clôture transversale d’un ensemble de livres.** Lorsqu’un ensemble cohérent est traité livre après livre — notamment Matthieu, Marc, Luc et Jean — le dernier livre n’autorise pas à passer immédiatement au suivant hors ensemble. Il faut d’abord exécuter un contre-audit déterministe transversal sur **tous** les livres de l’ensemble avec l’état final courant. Ce contre-audit recherche les familles rencontrées pendant les livres successifs, compare les mêmes surfaces et ne corrige que les écarts réellement mesurés : une donnée déjà conforme n’est jamais réécrite pour uniformiser artificiellement le lot. Pour les Évangiles Fillion, cette clôture MAT–MRK–LUK–JHN précède l’ouverture d’Actes. Une erreur nouvelle rouvre la famille et les passes dépendantes dans tous les livres concernés ; un audit à zéro se clôt sans écriture redondante.

Après la clôture des Actes, un second contre-audit transversal **NT5** sur MAT–MRK–LUK–JHN–ACT est obligatoire avant de déclarer achevés les livres néotestamentaires présents. Il reprend les mêmes familles sur les cinq livres : structure, titres/manchettes, espaces de headings, blocs/miroirs/spans, notes et surfaces d’ancrage, langues, références, renvois `comparer`, statuts de collation et intégrité différentielle des sources.

**Statut des sous-articles 35.8.1–35.8.6.** Le § 35.8.0 est le **seul cycle canonique d’exécution**. Les §§ 35.8.1–35.8.6 conservent valeur de règles techniques détaillées — séparation source/lecture, postconditions, contrôles, sondages, sauvegardes et clôture — mais leur ancienne liste numérotée du § 35.8.2 ne constitue plus un second ordre de travail. En cas de différence d’ordre, de périmètre ou de formulation, le § 35.8.0 et les règles spécialisées plus récentes prévalent. Les prescriptions techniques compatibles restent obligatoires.

**Règle d’amélioration continue.** Chaque correction utilisateur qui révèle un principe réutilisable est évaluée comme candidat à la charte. Si elle est générale, elle est intégrée au § 35 ou au présent protocole dans la même passe que son application, dans l’unique charte normative `parametres.charte_ia`, et donne lieu à un contrôle rétroactif du périmètre déjà traité. La modification est consignée par la tâche de mission correspondante dans le centre de contrôle. `controle_sections.commentaire_ia` demeure une synthèse globale vivante et n’est jamais traité comme un miroir normatif de la charte ni écrasé par une mission isolée. Lorsqu’un miroir de dépôt est explicitement configuré, il est régénéré depuis Supabase après la modification ; il n’est jamais édité comme source d’autorité. Si elle est purement locale, elle reste dans le journal de mission sans alourdir la norme. Le protocole ne s’allège jamais en supprimant une garde qui a déjà empêché une erreur réelle ; il peut être réorganisé pour éviter les doublons, mais sa couverture ne régresse pas.


#### 35.8.1. Séparer strictement témoin source et lecture éditoriale

Le témoin source ou diplomatique reste immuable. Toute modernisation typographique, désabréviation, correction de référence ou mise en forme se fait dans la couche éditoriale de lecture. Une correction conjecturale ou contextuelle ne remplace jamais silencieusement la forme imprimée : la forme source reste conservée dans `source_markup`, `facsimile_heading`, la provenance ou une sauvegarde dédiée.

Avant toute écriture, identifier toutes les surfaces susceptibles d’être rendues : `heading`, corps de lecture principal, `editorial_normalization.reading_text`, sous-blocs `editorial_normalization.blocks[].reading_text`, rendu des notes, titres et chapeaux. Une correction n’est complète que si toutes les projections qui exposent le même contenu sont cohérentes.

#### 35.8.2. Ordre obligatoire des passes

1. **Structure et hiérarchie.** Traiter d’abord chapitres, sections, sous-sections, péricopes, titres, introductions et commentaires. Un titre ne doit jamais rester injecté dans le corps ni dans un sous-bloc de commentaire. Un bloc de type `title` a un corps vide. Une introduction peut avoir un heading et un corps de prose, mais le heading n’est jamais répété comme premier paragraphe ou premier sous-bloc. Les axes matériel et analytique restent distincts selon les §§ 35.1 et 35.5.

2. **Typographie française.** Normaliser la couche éditoriale avec U+202F avant `; ! ?`, U+00A0 avant `:` et U+202F à l’intérieur des guillemets français, apostrophe U+2019, espaces et doubles espaces. Les points de suspension de la prose deviennent `…`. ⛔ Ne jamais convertir automatiquement `...` en `[…]` : `[…]` est réservé à une omission réelle dans une citation ou un lemme, vérifiée par le contexte ou le témoin.

3. **Langues étrangères et italiques.** Les mots, locutions, lemmes et citations latins ainsi que les translittérations de langues anciennes se composent en italique dans la couche éditoriale. Le grec écrit en caractères grecs reste en romain ; une translittération grecque en alphabet latin reste en italique. Les guillemets français restent en romain. Ne jamais mettre en italique par simple détection lexicale un homographe français : utiliser le paragraphe, la langue déclarée, les lemmes structurés et le contexte.

4. **Normalisation des abréviations.** Faire une passe distincte et exhaustive. Développer les abréviations intelligibles propres à la prose de lecture, sauf la locution latine *et cetera*, toujours abrégée en *etc.* : `Comp.` → `Comparer`, `ss.` → `suivants` ou `suivantes` selon le nom gouvernant, `et cetera` → `etc.`, `h. l.` → `à cet endroit`, `c.-à-d.` / `C.-à-d.` → `c’est-à-dire` / `C’est-à-dire`, et les abréviations matérielles ou savantes lorsqu’elles sont certaines (`Atl. archéol.` → *Atlas archéologique*, `pl.` → `planche`, `fig.` → `figure`, etc.). L’abréviation savante `cf.` reste distincte de `Comp.` : elle n’est jamais développée en `Comparer` et se compose en italique selon le § 3.6. Les sigles bibliques ne sont pas développés mécaniquement en noms complets : ils sont normalisés vers les formes du § 3.5.1. L’expansion doit rester grammaticalement française : contrôler les accords, la capitale de début de phrase et la ponctuation après remplacement. ⛔ Une regex globale ne suffit pas. Toute abréviation ambiguë reste en `review` jusqu’à identification certaine.

5. **Références bibliques et bibliographie.** Moderniser les références bibliques en rendant toujours le livre explicite — par l’abréviation normative du § 3.5.1 ou par son nom en toutes lettres lorsque la donnée l’exige — et le chapitre en chiffres arabes. Un renvoi interne sans sigle hérite du livre courant seulement lorsque ce contexte est certain : `*cf.* xv, 2` → `*cf.* Mt 15, 2`. Ne pas convertir mécaniquement les chiffres romains bibliographiques, qui restent romains et sont harmonisés en capitales. Vérifier l’existence canonique des références modernisées. Une référence impossible doit être confrontée au témoin et au contexte avant correction ; la correction éditoriale est documentée. Les titres d’ouvrages sont composés comme tels ; les noms d’auteurs suivent la forme d’autorité et la convention de petites capitales prévue par la charte.

6. **Lemmes et ponctuation syntaxique.** Contrôler les lemmes latin/français, leur ancre canonique, leur numéro de paragraphe et leur composition. Si une explication commence après un lemme fermé par `»`, rétablir la ponctuation nécessaire après le guillemet fermant. Un commentaire général sans lemme ne reçoit jamais artificiellement un couple de lemmes.

7. **Lecture directe.** Après les passes mécaniques, lire réellement le commentaire chapitre par chapitre, puis les introductions, titres, chapeaux et notes. Cette lecture recherche les fautes OCR, accords, ponctuations, références incohérentes, mots collés, titres injectés et anomalies de sens que les regex ne peuvent pas détecter. La passe directe est distincte des passes « typographie » et « abréviations » et doit être nommée comme telle dans le suivi.

8. **Texte biblique.** Contrôler séparément les versets Fillion. Lorsque `source_markup` existe, comparer lexicalement le texte de lecture au témoin après neutralisation de la seule ponctuation et des espaces autorisés. Toute unité sans témoin stocké reste une réserve de provenance explicitement comptée ; ne jamais fabriquer un `source_markup` à partir du texte courant.

#### 35.8.2.1. Postconditions obligatoires des transformations éditoriales

Toute transformation éditoriale doit préserver ce qui, dans la source, appartient à la syntaxe autour de la chaîne remplacée. **Une expansion ne peut absorber la ponctuation de phrase.** Si une abréviation ou une référence imprimée se termine par un point qui clôt effectivement une phrase, ce point subsiste après expansion ou normalisation, y compris à l’intérieur d’un paragraphe avant une citation ou une nouvelle phrase : `etc. « … »` reste `etc. « … »` ; le point abréviatif tient lieu de point final et aucun second point n’est ajouté. La même vérification vaut à la fin d’un paragraphe. En revanche, un `...` source identifié comme omission et rendu `[…]` ne reçoit pas automatiquement un point supplémentaire. Le contrôle se fait contre l’empan source exact, non par supposition typographique.

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

⚠️ **Le PARAGRAPHE (T5) se centre, seul des rangs bas** (décision de l’auteur, 29 août 2026 : « ce niveau de titre me paraît pas bien placé »). Sa pose ne suit pas son rang mais sa DONNÉE : sur les 35 blocs visibles du corpus — tous dans la Genèse, les 117 « CHAPITRE I » ne se rendant pas (§ 35.1) —, l’intitulé n’est jamais un titre en prose mais une DÉSIGNATION seule, et son objet tombe à côté : en chapeau pour trois d’entre eux (« I — Le début de la création (1, 1-2) »), en bloc de sous-titre pour les trente-deux autres (« § I », puis « Abraham dans la terre de Chanaan et en Égypte »). Au fer, cette désignation d’une ou deux lettres pendait au bord gauche, et son objet — gris, et plus petit que le texte courant — se lisait comme une légende.

Le centre le sépare en outre de la SOUS-SECTION, dont un seul pixel de corps le distinguait : T4 et T5 s’écrivent tous deux « Section II » puis « § I », même caractère, même pose, et deux rangs voisins doivent différer sur DEUX axes au moins. ⛔ Le corps de la tête ne monte pas : il égalerait la sous-section. C’est l’OBJET qui monte d’un cran et quitte le gris, sous ses deux formes — le chapeau par la feuille, le bloc de sous-titre par `compositionSousTitre`. ⛔ Aucune chasse sur la désignation : une lettre seule ne s’espace pas, et la chasse, tombant APRÈS elle, la décalerait de l’axe. ⚠️ Un sous-titre suit toujours la pose de SON titre : centré sous T5 comme sous les rangs hauts, au fer sous T4 et T6.

### 35.11. Un intervalle de références ne coupe pas un intitulé

Un intitulé se coupe en titre et chapeau sur un tiret cadratin, mais ⛔ le tiret joint aussi bien deux références de plage. « § II. Le sermon sur la montagne (5, 1 — 7, 29) » se coupait ainsi en plein milieu d’une parenthèse, dont la fermeture partait seule en chapeau : « 7, 29) ». Cent intitulés du corpus étaient dans ce cas, presque tous dans Matthieu, où la référence de plage est la règle.

La coupure exige donc que la tête DÉSIGNE une division au lieu de la décrire : moins de vingt-quatre signes, et close par un point (« § III. », « SECTION I. ») ou sans aucun chiffre (« PREMIÈRE PARTIE »). ⚠️ Mesurée sur les 2 651 intitulés du corpus, la règle change exactement les cent cas fautifs et aucun autre.

⛔ La mention de chapitre imprimée en tête d’un intitulé ne paraît pas, pour la raison qui vaut déjà au § 35.1 : la barre de navigation nomme le chapitre. Enchâssée dans l’intitulé de 58 commentaires — « CHAP. IX. — 1-2. Introduction… » — elle prenait la place du repère, lequel passait en chapeau subordonné : la mention matérielle dominait l’information utile.

### 35.12. Le texte biblique se cerne d’un blanc plus large que son apparat

Un bloc de versets ne touche pas le commentaire qui l’entoure. Mesuré avant reprise : vingt pixels au-dessus du premier verset, quatorze sous le dernier, c’est-à-dire moins que l’interligne du commentaire lui-même. Le texte biblique se lisait comme un paragraphe parmi les autres. Le blanc vaut désormais deux rem, et il est le même en haut et en bas : un bloc de versets est CERNÉ, non posé.

⛔ Les TITRES en sont exclus. Ils portent déjà leur propre blanc, plus large, et l’uniformiser le rétrécirait au lieu de l’ouvrir. ⚠️ Les marges verticales adjacentes FUSIONNENT en flux normal, la plus grande valant pour les deux : il n’y a rien à retrancher de la marge du verset, et croire l’inverse conduit à doubler le blanc.

⛔ **Rectification du 30 août 2026 : dans l’AXE DE TEXTE, les marges ne fusionnent pas — elles s’ADDITIONNENT.** L’axe est une grille (`display: grid`), et les marges d’un enfant de grille ne s’effondrent jamais hors d’elle. Deux blocs éditoriaux voisins, chacun dans son axe, cumulent donc la marge basse du premier et la marge haute du second. Sous « 1. Le premier jour (1, 3-5) », le rang T6 annonçait 0,35 rem et le blanc en valait 25,6 : 0,35 du titre, plus 1,25 de l’introduction de section qui le suit. La fusion ne joue plus que sur une mesure ÉTROITE, où l’axe disparaît et les blocs redeviennent frères — 20 px pour le même cas, la plus grande valant seule. Mesuré sur épreuve autonome, les deux surfaces revenant à 5,6 px une fois fermées.

⚠️ Fermer le blanc sous un titre demande donc DEUX sélecteurs, un par surface. Une règle qui n’en porte qu’un ne ferme rien sur téléphone : c’était le cas de la sous-section T4 depuis le 29 août. ⚠️ Un titre dont le développement lui appartient — la sous-section T4, la péricope T6 — ferme des deux côtés, et son blanc vaut alors le MÊME quoi qu’il suive : un commentaire, une introduction, ou la première rangée de verset, laquelle ne porte aucune marge en tête. Sans quoi un même rang s’aère de deux façons selon qu’un bloc s’intercale ou non.

⛔ **Rectification du 30 août 2026 : ce blanc N’EST PAS SYMÉTRIQUE, et il ne l’a jamais dû.** Les deux valeurs étaient égales — deux rem d’abord, puis 1,1 après la reprise du 29 août — et elles ne disent pourtant pas la même chose. Celui du DESSUS est une COUTURE : le commentaire et les versets qu’il commente sont une seule unité de lecture, que l’auteur veut « plus tassée, condensée ». Celui du DESSOUS est une COUPURE : on quitte une unité pour la suivante, et l’auteur en demande « un blanc plus important ». Un seul chiffre pour les deux effaçait la frontière et creusait la couture, soit l’exact contraire de ce qu’on cherche. Il vaut désormais 0,55 rem avant les versets et 1,75 rem après.

⛔ **Et ces deux règles NE PORTAIENT PAS sur la lecture EN REGARD, sans que rien ne le dise.** Une règle de voisinage ne s’applique qu’à la surface dont on a écrit le sélecteur. La lecture bilingue n’a ni rangée de verset ni enveloppe d’axe : ses rangées sont des grilles à deux colonnes, et chaque créneau canonique enveloppe ses blocs et sa rangée dans une boîte à lui, si bien qu’un bloc n’y est JAMAIS le frère d’une rangée de verset. C’était donc la marge PROPRE du rang d’information qui faisait le blanc — 1,25 rem au-dessus, 0,9 en dessous, la même quoi qu’il l’entoure —, et la lecture en regard portait depuis l’origine le défaut que ces règles corrigent ailleurs. ⚠️ Corollaire de méthode : une seconde surface qui rend les mêmes blocs autrement ne reçoit rien d’une règle de voisinage, et rien ne le signale — ni type, ni test, ni relecture de la feuille.

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

**Elle s’ouvre sur un PORTRAIT.** C’est l’encart, l’image debout de la section 37, et jamais le bandeau : une image couchée serrée dans un cadre debout ne montre pas ce qu’un portrait montre, et le cadre est celui de la fiche d’auteur, au trait près. Une notice sans portrait ouvre sur son seul nom, sans cadre vide.

⛔ **IL N’Y A PLUS DE REPÈRES SOUS LE NOM** — « Français · Catholique · 1888 - 1904 » (décision de l’auteur, 4 septembre 2026 : « ne pas afficher »). Ils avaient été montés là le 28 août depuis la section repliable, au motif qu’on ne range pas derrière un dépli ce qui identifie l’objet qu’on lit ; c’était vrai de la langue et de la confession, moins de la date, qui était la date RÉDIGÉE de la base, avec ses points-virgules et ses annonces. Ils disaient en télégramme ce que la notice dit en prose deux centimètres plus bas, et langue comme confession se lisent entières dans le dépli.

⚠️ **LE CADRE DU PORTRAIT EST UN FLEX, et la zone d’image s’y étire.** Le bord bas du cadre se pose sur la dernière ligne qui l’habille, et la mesure lui écrit une HAUTEUR ; la zone d’image, qui tenait la sienne de son seul rapport 2/3, ne suivait pas, et la rallonge se voyait en passe-partout sous l’image — un bandeau blanc en bas là où les trois autres côtés portent cinq pixels (l’auteur, 4 septembre 2026 : « comme si elle n’entrait pas dans le bloc »). ⛔ La leçon est générale : une boîte dont on écrit la hauteur DU DEHORS doit pouvoir la transmettre à ce qu’elle contient, sans quoi la mesure se voit au lieu de se lire.

**La notice prend la composition de la fiche d’auteur** : ses intertitres deviennent des titres de section, en sérif italique et à l’encre d’accent, et sa prose devient la prose justifiée de la vie d’un auteur. ⚠️ Une bibliographie en est une part, et elle se compose comme la prose qu’elle accompagne : laissée au navigateur, elle paraissait plus grosse que le texte qu’elle sert.

**Ce qui reste replié ne concerne plus que l’ÉDITION** : son titre, son année, son lieu, son éditeur, sa source numérique, sa graphie, sa licence, son état de vérification. Une section repliable est faite pour ce qu’on consulte, non pour ce qu’on lit. Elle tient toute la mesure, sous les deux colonnes, sa colonne d’étiquettes n’entrant pas dans une colonne de fiche.

⛔ **LA FICHE NE MONTRE PAS LES GRAVURES DE L’ÉDITION** (décision de l’auteur, 4 septembre 2026 : « ne pas afficher la famille “Gravures” »). Six planches prises en échantillon régulier y ouvraient, du 28 août au 4 septembre, une mosaïque que deux requêtes portaient et qu’un clic agrandissait par-dessus la fiche. Une gravure se regarde À SA PLACE, dans le texte, où l’édition l’a mise ; une vignette en tête de fiche apprend qu’il y en a, elle n’en montre aucune. Sont partis avec la rubrique l’échantillon régulier, le passe-partout des vignettes, la planche agrandie et les deux allers-retours qu’elles coûtaient à chaque ouverture.

**L’ÉDITION UTILISÉE A SA RUBRIQUE, et ce n’est pas une bibliographie sélective** (décision de l’auteur, 4 septembre 2026 : « ce n’est pas une bibliographie sélective, mais la référence bibliographique des volumes utilisés »). La fiche portait, dans le HTML de sa notice, une liste titrée « Bibliographie sélective » dont la première entrée redisait à la main l’édition d’où le texte est tiré. La référence se compose désormais CHAMP PAR CHAMP depuis `editions_sources` — titre, sous-titre, lieu, éditeur, millésimes, nombre de tomes —, aux normes de toutes les bibliographies du site (§ 35.6.1) et dans leur famille de styles. ⛔ Sans titre d’édition en base, la rubrique ne paraît pas. ⛔ Aucun AUTEUR en tête : la fiche le nomme deux lignes plus haut, et c’est la règle déjà écrite pour « Du même auteur » — une rubrique qui établit son auteur ne le répète pas sous elle. ⚠️ Le nombre de tomes est la seule donnée matérielle admise, parce que la rubrique répond des VOLUMES ; le format, la pagination, les planches et les dimensions en restent exclus. ⚠️ Les millésimes sont un TEXTE — « 1888-1904 », « vol. I : 1909 ; vol. II : 1907 » —, et c’est pourquoi la référence ne passe pas par `ouvrages_bibliographiques`, dont l’année est un entier : un catalogue d’œuvres ne sait pas dire une collection multivolume.

**LES OUVRAGES QUE L’ÉDITION CITE ont leur rubrique, et elle ne paraît pas si elle est vide** (même décision : « une nouvelle rubrique contenant, proprement, tous les ouvrages cités dans l’édition utilisée ; c’est surtout utile pour Fillion »). Elle lit `v_bible_editorial_bibliography_entries`, la source des bibliographies de l’apparat, et se compose par le même composant : une édition ne dit pas ses auteurs de deux façons. ⚠️ Toutes pièces confondues, dédoublonnées par `ouvrage_id`, rangées par auteur puis par titre — une bibliographie d’édition ne se range pas dans l’ordre d’apparition des volumes. ⛔ Aucun repli sur le texte des blocs matériels : ce qui n’est pas catalogué n’est pas affiché, et c’est ce silence-là qui appelle le catalogage (§ 35.6.4).

**LA LICENCE DIT AUSSI CE QU’ELLE NE DONNE PAS** (même décision : « ajouter les restrictions de licence ; expliquer que le travail éditorial est protégé »). La fiche affichait « Domaine public » en une rangée d’étiquette, ce dont un lecteur conclut que tout est libre ; ce qui l’est est le TEXTE. Une rubrique « Conditions d’usage » dit désormais les deux : la licence du texte servi, avec sa mention obligatoire s’il en porte une ; puis que la transcription, la structuration des données, la segmentation, les alignements et les liens établis entre versets et textes patristiques constituent un travail éditorial original, protégé par le droit d’auteur, dont la reproduction substantielle à des fins commerciales demande une autorisation préalable, et qu’une citation reprise publiquement garde la mention de sa source. ⛔ La formule ne s’invente pas dans la fiche : elle dit en trois phrases le § 6 des conditions d’utilisation, et renvoie à cette page, qui fait foi.

⛔ **La chronologie d’une traduction n’avait AUCUNE date, depuis l’origine.** La frise, partagée avec la fiche d’auteur, lisait la date courte ; la vue des traductions ne porte que la date rédigée, et la colonne des dates restait donc vide sur les six chronologies du corpus. Une chronologie sans dates n’est plus une chronologie, c’est une liste. La frise lit maintenant la date courte, sinon la date rédigée. ⚠️ La trouvaille de méthode vaut au-delà de ce cas : le défaut était couvert par un changement de type en deux temps, qui promettait à la frise un champ que la vue n’a jamais eu. Une colonne qui « ne s’affiche pas » se cherche là.


### 38.1 La carte du volet de lecture — le nom, le traducteur, l’adresse de l’édition

La carte qui coiffe le volet de gauche de la Bible porte trois lignes, et trois seulement : le NOM de la bible, qui ouvre sa fiche ; le TRADUCTEUR, avec ses dates ; l’ADRESSE de l’édition servie. ⛔ Elle ne porte pas le relevé des tomes. Celui de Fillion dénombrait huit volumes et six millésimes ; dans un volet de deux cent cinquante pixels, il faisait un pavé au bas duquel la liste des livres commençait. Verdict de l’auteur, 3 septembre 2026 : « je veux seulement des informations sur la bible ; généralistes ». Le relevé reste dans la fiche « En savoir plus », où l’on va le chercher quand on le cherche.

**L’ADRESSE EST UNE PHRASE, et elle nomme le lieu, l’éditeur et les dates** : « D’après l’édition de Paris, Letouzey et Ané, 1888-1904 » (décision de l’auteur, 4 septembre 2026 : « doit mentionner l’éditeur, le lieu d’édition et les dates d’édition »). C’est la forme normative du libellé court d’édition, `Ville, éditeur, année` (§ 5), et l’interface y ajoute seule la formule « D’après l’édition de ». Le lieu et l’éditeur viennent d’`editions_sources` ; ⛔ ils ne se devinent jamais du nom de la bible, et un champ absent emporte son séparateur. ⚠️ C’est la DATE qui décide qu’il y a une édition à nommer : sans elle, rien ne paraît, quand bien même le lieu serait connu — la fiche d’édition du manuscrit Français 899 porte « Paris », qui est le lieu du MANUSCRIT, et la carte annoncerait sans cette garde « l’édition de Paris » là où il n’y a pas d’édition du tout.

⛔ IL N’Y A PLUS DE REPÈRES — la langue, la confession et l’année alignées derrière des points médians. Ils disaient en télégramme ce qu’EST la bible, et jamais d’où vient le texte qu’on a sous les yeux ; la phrase d’édition le dit, et se lit. Langue et confession se lisent entières dans la fiche.

⚠️ **UNE FLÈCHE COURTE SUIT LE NOM**, et c’est elle qui dit qu’il y a une fiche derrière (décision de l’auteur, 4 septembre 2026 : « ajouter un petit symbole à côté du titre pour suggérer l’existence de “À propos de cette traduction” ; une flèche propre, épurée, courte »). Rien ne l’annonçait : le nom se composait comme un titre vert, et le survol ne le soulignait qu’une fois la souris dessus. ⚠️ Elle vit dans `NomVolet`, donc aussi sous le nom d’AUTEUR des pages patristiques : c’est le même geste, et il ne s’annonce pas de deux façons. ⛔ Elle ne paraît pas quand le bouton est inactif — une œuvre sans auteur identifié n’ouvre aucune fiche, et la flèche promettrait une page qui n’existe pas. ⚠️ Elle reste HORS de l’écrêtage du nom : c’est le nom qui se coupe par la fin, jamais la flèche, sans quoi l’annonce disparaîtrait sur les noms longs — les seuls où l’on hésite. ⚠️ Le soulignement de survol se pose sur le NOM et non sur le bouton : porté par le bouton, il courait sous la flèche et la barrait par le milieu.

⛔ ON NE MESURE PAS UN TEXTE AVANT DE S’ÊTRE DEMANDÉ S’IL DOIT PARAÎTRE. Pour loger cette référence, la carte avait reçu une sonde invisible qui comptait ses lignes, un observateur qui la remesurait à chaque changement de largeur du volet, et un budget de lignes que la feuille faisait monter en trois seuils. Tout cela est parti avec le texte, et rien n’a manqué. C’est la seconde fois dans cette même carte : l’étiquette « Traduction » avait été condensée le 30 août 2026, puis supprimée le lendemain.

⚠️ La forme se prend au volet des pages patristiques, qui est le modèle : le nom en vert qui ouvre la fiche, puis ce qu’on lit, puis l’adresse de l’édition, à une seule interligne (1,35). Deux volets de lecture ne se composent pas chacun à sa façon.

### 38.2 Le volet de gauche — la recherche s’efface, le livre grisé s’explique

**LA RECHERCHE D’UN LIVRE N’EST PAS UNE BOÎTE : elle EST son bloc** (décision de l’auteur, 4 septembre 2026 : « la barre de recherche doit être plus claire, moins visible spontanément, et occuper l’ensemble du bloc où le bloc d’écriture existe actuellement »). Le champ portait un filet, un fond plus sombre que le volet et un rayon de quatre pixels, posés dans un bloc rembourré : quatre traits pour l’objet le moins employé du volet, et il se lisait avant la liste des livres qu’il commande. Le rembourrage du bloc est passé DANS le champ — même blanc, même gouttière —, si bien que rien n’a bougé de place ; ce sont le filet, le fond et le rayon qui sont partis. ⚠️ Il se donne à voir quand on s’en sert, et alors seulement : au foyer, un fond léger paraît sous lui. ⛔ Pas de filet au foyer non plus, qui redessinerait la boîte qu’on vient d’ôter. Le filet du BAS reste : c’est la séparation d’avec la liste, non l’encadrement du champ.

**UN LIVRE GRISÉ, CLIQUÉ, S’EXPLIQUE** (même décision). Le clic se perdait dans un `return` : la rangée était bien un bouton, elle répondait au survol, et son geste ne faisait rien du tout — le lecteur en concluait ce qu’il pouvait, que le site était cassé le plus souvent, puisqu’un gris n’explique rien. Une fenêtre dit maintenant que le livre ne figure pas dans la bible qu’on lit, et propose celles qui le portent ; le choix d’une autre bible mène au chapitre 1 du LIVRE DEMANDÉ, non au chapitre qu’on lisait ailleurs, qui n’a rien à voir avec lui. ⛔ Elle ne dit PAS pourquoi le livre manque : une édition partielle, un tome qui n’est pas encore importé et un livre qu’une confession ne reçoit pas se ressemblent de l’extérieur, et mieux vaut une phrase vraie qu’une raison inventée. ⚠️ Les bibles proposées se cherchent aux DEUX sources — `livres_par_traduction` pour celles qui se lisent au verset, la structure éditoriale pour les autres —, faute de quoi Fillion et la Bible 899 seraient tues. ⚠️ La fenêtre s’ouvre TOUT DE SUITE, avec ce qu’on sait déjà, et la liste arrive ensuite : un clic qui n’ouvre rien pendant une requête serait le défaut qu’on vient de corriger.

**L’EN-TÊTE DU VOLET DE DROITE NE REDIT PLUS LA RÉFÉRENCE** — « Genèse 13, 5 » (même décision : « supprimer cette indication redondante »). Le volet commente le verset qu’on vient de désigner d’un clic, à trois centimètres de là, dans une colonne qui porte déjà le nom du livre, le numéro du chapitre et le verset en surbrillance : la ligne ne disait rien que l’écran ne montrât. ⚠️ Une référence REÇUE se montre, elle : la page d’une péricope donne au volet une PLAGE canonique (« Gn 12, 1-9 ») que rien d’autre n’écrit à l’écran. Une référence qu’on DÉDUIT de ce qu’on affiche déjà ne se montre pas. ⚠️ L’en-tête vidé ne laissait qu’une bande de trente-huit pixels et son filet : il ne paraît plus que s’il a quelque chose à porter — une référence reçue, ou la flèche de repli.

### 38.3 La Bible polyglotte — le réglage, le menu, l’en-tête de colonne

Sept demandes de l’auteur du 4 septembre 2026.

⛔ **UN RÉGLAGE DE VOLET NE SE COMPOSE PAS EN BOUTONS** (« remettre en forme de façon plus élégante, sans effet “bouton” »). « Traductions visibles » alignait cinq pilules bordées et arrondies pour un réglage qu’on touche une fois par visite : cinq cadres, cinq fonds, cinq rayons, dans un volet où la liste des livres n’en porte aucun. Les valeurs se lisent en clair ; la retenue prend l’accent et la demi-graisse, les autres l’encre douce, et le survol ne fonce que ce qui n’est pas retenu. ⛔ Ni cadre, ni fond, ni rayon.

⚠️ **UNE ÉCHELLE se lit en RANG, des interrupteurs INDÉPENDANTS se lisent en COLONNE.** « Auto · 2 · 3 · 4 · 5 » est une échelle de cinq valeurs courtes dont on ne retient qu’une : le rang la donne d’un coup d’œil, et le point médian est le séparateur du site. « Lignes problématiques » et « Surnuméraires » sont deux états qu’on allume ou qu’on éteint, et longs : une option par ligne, comme le volet de la page Bible (§ 38.2). La même forme discrète sert les deux, seule la disposition change.

⛔ **UNE TRADUCTION DÉJÀ AFFICHÉE AILLEURS SE GRISE, elle ne s’annonce pas en OCRE** (« grise légèrement le bloc de l’œuvre déjà utilisée ; n’utilise pas d’ocre pour le texte qui signale ça »). L’ocre est la teinte de l’ATTENTE — « à normaliser », « brouillon » — et une colonne déjà prise n’est ni l’un ni l’autre : c’est un fait, non un défaut. Le bloc prend le fond doux, le nom l’encre grise, la mention d’échange l’encre faible ; le choix reste offert, et les deux colonnes s’échangent alors leur place. ⛔ Une FAMILLE ne se grise pas quand un seul de ses textes est affiché ailleurs : les autres restent libres, et la griser dirait le contraire. Le gris se pose sur les MEMBRES, dans leur volet.

**LE MENU SE RANGE PAR MILLÉSIME**, groupe de langue par groupe de langue, une famille prenant le millésime de son membre principal. ⛔ **On range sur la date QU’ON MONTRE, jamais sur une autre** : la première parution d’une traduction et le millésime de l’édition servie ne coïncident presque jamais — Sacy paraît de 1667 à 1696 et l’on sert l’édition de 1730, la Vulgate clémentine est de 1592 et l’on sert Madrid 1946 —, si bien qu’un menu rangé sur la première et affichant la seconde donnerait à lire 1946, 1730, 1912 dans cet ordre : il passerait pour cassé. ⛔ Une entrée SANS millésime se range à la FIN, jamais au début : on ne devine pas une date, et une date manquante ne vaut pas zéro. Le rang de la base départage deux entrées de même millésime.

**LES NOMS SE COMPOSENT**, dans le menu comme en tête de colonne : « Bible française du XIIIe siècle » y prend ses petites capitales et son exposant, un titre entre astérisques son italique. C’est le module partagé avec les notices d’auteur. ⛔ Jamais un rendu HTML sur une colonne rédigée hors du dépôt. ⚠️ La rubrique d’un volet de famille en est exemptée : elle se compose en capitales espacées, où des petites capitales seraient plus petites que ce qui les entoure.

⛔ **SOUS LE TITRE D’UNE COLONNE, C’EST LA DATE, et rien d’autre ne prend sa place** (« c’est indiqué “Texte du manuscrit” et non une date ; c’est problématique »). L’état du texte s’y substituait dès que l’édition en porte plusieurs, si bien que la Bible du XIIIe siècle était la seule colonne du tableau sans millésime — celle, précisément, dont la date importe le plus. ⚠️ L’état du texte reste NÉCESSAIRE, deux colonnes d’une même édition ne se distinguant pas autrement : il descend d’une ligne, sous la date, dans une encre plus pâle et sans la chasse du millésime — c’est une glose, pas un second repère. La date se rapproche par ailleurs du titre : elle en était écartée de huit pixels, elle l’est de trois.

⚠️ **Le « vers » ACCOLÉ au millésime part avec lui.** La notice du manuscrit Français 899 écrit « Paris, XIIIe siècle (vers 1260) » : rendre « 1260 » tout court donnerait à un témoin daté par approximation la précision d’un colophon. ⛔ Ce n’est pas une lecture de la prose : on ne prend que le qualificatif que la source a écrit devant le millésime. La dérivation et l’ordre vivent dans un module pur, éprouvé sur les dix notices réelles du corpus — lire une date dans de la prose est la partie fragile du dispositif, et elle ne s’éprouve pas depuis une page.

⛔ **PAS DE FILET AUTOUR DU TITRE quand le menu s’ouvre.** Un cadre d’un pixel posé sur un en-tête de colonne redessine une boîte là où la page n’en porte aucune, et il paraissait au CLIC de souris — une règle « focus-within » sur un bouton sans enfant focalisable n’est qu’un « focus ». Le menu ouvert garde le sol du survol : la colonne reste désignée, sans qu’un trait s’ajoute à la réglure du tableau. ⚠️ Le clavier garde son anneau, qui est la règle « focus-visible » globale du site : elle pose un contour, non un cadre intérieur.

⚠️ **ET LE SURVOL DE CE TITRE NE S’APPLIQUAIT PAS**, ce qu’aucune lecture du code ne disait. Le bouton portait son fond dans son style EN LIGNE, et une déclaration en ligne bat toujours une règle de feuille sans « important » : la règle de survol était morte depuis qu’elle avait été écrite, et l’anneau de foyer restait le seul état visible de la colonne — c’est-à-dire précisément ce que l’auteur a relevé comme malvenu. Retirer l’anneau sans voir cela aurait laissé l’en-tête sans aucun état. ⛔ **Le piège du style en ligne ne borne pas les seules média-queries : il bloque TOUTE règle de feuille sur la même propriété.** Avant de retirer un état visible, mesurer celui qui est censé le remplacer.

⛔ **RECTIFICATION DU MÊME JOUR, AU SOIR : trois de ces règles se reprennent, et toutes pour la même raison** — on avait chaque fois retiré un ornement DE TROP. ⚠️ Règle générale, qui vaut au delà de cette page : **retirer un ornement n'est pas gratuit ; il faut regarder ce qui reste**. Cinq pilules valaient mieux qu'un rang de mots, un aplat gris valait mieux qu'un ocre mais moins que rien, et une glose descendue d'une ligne vaut moins que pas de glose. La bonne mesure ne se trouve pas en enlevant tant qu'on peut.

⚠️ **L'ÉCHELLE SE COMPOSE EN CASES, sur toute la largeur du volet** (« pas de points médians moches ; plutôt de jolies cases propres sur l'ensemble de la largeur »). Cinq valeurs en clair séparées par le point médian ne se lisaient plus comme un réglage : elles se lisaient comme une ligne de texte, et rien ne disait qu'on pouvait les toucher. ⛔ Ce n'est PAS le retour des pilules, et la différence est celle d'un objet et de cinq : une pilule est un objet PAR VALEUR — cinq cadres, cinq fonds, cinq rayons —, quand un contrôle segmenté n'a qu'UN cadre et qu'UN rayon pour toutes ses cases, qui n'existent que par le filet qui les sépare. Il occupe la mesure du volet, et l'on voit d'un coup d'œil combien de valeurs il offre et laquelle est retenue. ⚠️ Les interrupteurs INDÉPENDANTS gardent leur colonne et leur clair : ils ne forment pas une échelle, et une case autour de « Lignes problématiques » en referait un bouton.

⛔ **UNE COLONNE DÉJÀ PRISE SE GRISE PAR SON TEXTE, ET PAR RIEN D'AUTRE** (« ne griser que le texte ; pas de fond gris »). L'ocre était faux — c'est la teinte de l'attente —, et le fond doux qui l'avait remplacé l'était aussi : une liste ne se lit plus quand un rang sur deux y porte son propre sol. Le fait se dit dans l'ENCRE du nom et de sa date ; le fond du menu reste d'une seule teinte, où l'accent ne désigne que la ligne retenue.

⚠️ **ET CETTE ENCRE DESCEND D’UN RANG** (« griser un peu plus le texte des non disponibles »). Le fond retiré, l'encre reste SEULE à porter le fait, et le rang qui suffisait quand un aplat l'accompagnait ne suffit plus : le nom prend l'encre du sous-titre d'une ligne ordinaire, et la ligne entière recule d'un cran. ⛔ **Pas deux rangs** : la ligne reste CLIQUABLE — la choisir échange les deux colonnes — et une ligne qu'on ne lit plus n'est plus une option ; le rang le plus ténu est d'ailleurs le plancher de l'échelle, et la date y est déjà. ⚠️ Sa hiérarchie interne tient alors par le CORPS et la POLICE, non par l'encre : un sérif de treize pixels sur un sans de dix se distingue sans qu'on l'y aide.

⚠️ **Règle générale, et c'est la rectification du même jour prise par l'autre bout : retirer un ornement DÉCHARGE ce qui reste, et ce qui reste doit alors en porter davantage.** On avait mesuré ce qu'on enlevait ; on n'avait pas remesuré ce qui restait seul. Un état qui se disait par deux moyens ne se dit pas de la même façon quand il n'en garde qu'un.

⛔ **SOUS LE NOM D'UNE COLONNE, IL N'Y A QUE LA DATE** (« “Texte du manuscrit” : ne pas l'indiquer ; seulement indiquer une date »). L'état du texte prenait d'abord la place du millésime ; on l'avait fait descendre d'une ligne dessous, en glose — il n'y est plus du tout. Un en-tête de colonne NOMME et DATE, et une troisième ligne y faisait un second repère. ⚠️ L'état du texte se lit LÀ OÙ L'ON CHOISIT, dans le volet de la famille : c'est le menu qui distingue, l'en-tête qui nomme. ⛔ Conséquence assumée : deux états d'un même témoin ouverts côte à côte portent le même en-tête.

⚠️ **UN BLOC TEINTÉ A BESOIN D'AIR DANS SA CASE.** La cellule d'en-tête n'avait aucun rembourrage vertical — mesuré, le bouton faisait soixante-neuf pixels dans une cellule de soixante-neuf —, si bien que le fond du survol et du menu ouvert courait d'un filet à l'autre et venait toucher la réglure. Un fond qui touche le bord de sa case cesse de se lire comme un ÉTAT : il se lit comme une colonne d'une autre couleur.

⛔ **UN ANNEAU DE FOYER SE POSE DEDANS DÈS QUE LE CHAMP EST SON PROPRE BLOC** (« l'encadrement vert dépasse, mord du texte, ou du texte passe dessus »). L'anneau global du site se pose à un pixel À L'EXTÉRIEUR de la boîte, ce qui convient à un champ posé DANS un bloc rembourré. Le champ de recherche des volets EST son bloc depuis qu'il en occupe toute la mesure — mesuré, 319 sur 45 dans un bloc de 319 sur 46 — et l'anneau tombait donc par-dessus le filet du bas, par-dessus le bloc voisin en haut, et sortait du volet sur les deux côtés, où il se faisait couper. Un décalage NÉGATIF le rend au champ. ⛔ On ne le retire pas : c'est le seul repère du clavier, et un champ sans filet ni fond au repos n'a rien d'autre à montrer. ⚠️ **Règle générale : quand un objet cesse d'être posé DANS un bloc pour DEVENIR le bloc, tout ce qui se dessinait autour de lui se relit.** Le rembourrage, le filet, l'ombre et l'anneau ne visaient pas la même boîte.

### 38.4 La PROVENANCE d’un texte biblique — la carte, la fiche, la chronologie

Six demandes de l’auteur du 4 septembre 2026, en seconde passe sur la page « Bible classique ».

⛔ **DANS UNE PHRASE, TOUT SE SÉPARE PAR DES VIRGULES, ET RIEN D’AUTRE** (« il faut utiliser la version normalisée ; on doit avoir “Jean Desessartz et Guillaume Desprez” ; tout séparé par des virgules »). La carte du volet rendait la co-édition telle que la base l’écrit — « Paris, Jean Desessartz ; Guillaume Desprez, 1667-1696 » —, et le point-virgule y ouvrait au milieu de la phrase un second niveau de ponctuation où l’on ne voyait plus où l’éditeur commence. Chaque maison se résout POUR SON PROPRE COMPTE dans la table de référence, et « et » les joint ; trois maisons font une énumération française. ⛔ Le point-virgule reste le séparateur normatif dans une COLONNE et dans une notice de catalogue (§ 5) : la règle ne le remplace pas partout, elle compose une énumération là où l’on écrit une phrase. ⚠️ La résolution se fait CÔTÉ SERVEUR : l’index des éditeurs n’a pas à voyager jusqu’au navigateur pour composer deux mots.

⚠️ **LA DATE D’UNE ADRESSE EST CELLE DE LA FICHE D’ÉDITION, non de la première parution.** Le lieu et l’éditeur viennent de la fiche d’édition : y prendre aussi la date est la seule façon que les trois mentions parlent du même livre. La carte de Sacy datait de 1667-1696 l’adresse de l’édition de 1730, si bien que deux maisons qui ne se sont associées qu’au siècle suivant s’y trouvaient nommées ensemble soixante ans trop tôt. ⚠️ Le champ est un TEXTE et porte parfois le détail des volumes — « vol. I : 1909 ; vol. II : 1907 ; vol. III : 1912 » : une phrase de carte en retient les deux bornes, l’énumération n’apprenant rien à qui veut savoir de quand date ce qu’il lit.

⛔ **UN TÉMOIN MANUSCRIT N’A PAS D’ÉDITION : il a un dépôt et une cote** (« aucun texte pour la bible du XIIIe siècle ; à corriger, d’après le manuscrit machin machin »). La carte se taisait pour lui, une garde de la veille refusant de nommer une « édition » là où la fiche ne porte qu’un lieu de copie. La garde était juste et la conclusion trop courte : ce n’est pas la phrase qu’il fallait taire, c’est l’autre phrase qu’il fallait écrire — « D’après le manuscrit Paris, Bibliothèque nationale de France, Français 899, vers 1260 », qui est la forme savante d’une cote. ⛔ Elle ne se DÉDUIT PAS de la prose : l’intitulé de l’édition et le nom de la source numérique portent bien la cote, mais l’en tirer par découpe serait lire une donnée dans un titre. Deux champs de plus, et c’est la COTE qui décide — pas un type à interpréter, pas une mention à reconnaître. ⚠️ Un manuscrit se nomme même sans date : sa cote l’identifie à elle seule, quand une édition sans année n’a rien à annoncer.

⛔ **UNE FICHE NE REPLIE PAS CE QU’ON VIENT Y LIRE** (« “Édition et état du texte” doit être visible sans être développé ; revoir l’ensemble avec cette nouvelle donne »). C’était la seule section repliée de la fiche « À propos de cette traduction », et le dépli cachait une REDONDANCE autant qu’un contenu : le titre, l’année, le lieu et l’éditeur y reparaissaient en rangées un cran sous une référence qui venait de les composer, et la notice rédigée de la base les disait une troisième fois. La référence devient la TÊTE de la rubrique — ce que l’édition EST —, et les rangées ne portent plus que ce qu’elle ne dit pas : ce qui a établi le texte, d’où vient sa copie numérique, sa graphie, ses particularités, son état de vérification. ⛔ La notice rédigée ne paraît plus : elle était la seconde vérité, celle qu’on avait cessé de composer. ⚠️ Trois rubriques ferment la fiche, dans cet ordre : l’édition, les ouvrages qu’elle cite, les conditions d’usage. On va de ce que l’édition EST à ce qu’on peut en faire.

⚠️ **UNE MENTION D’ÉDITION NE SE COMPOSE QUE SI ELLE APPREND QUELQUE CHOSE.** « Édition révisée » est une vraie mention de page de titre et prend sa place après l’intitulé. Deux cas la font taire, et tous deux sont dans la donnée réelle : un TÉMOIN MANUSCRIT n’en a pas — « Témoin manuscrit » est une classification, et la cote suit deux mots plus loin —, et une mention que le TITRE contient déjà ne se répète pas (« La Bible : traduction officielle liturgique »). C’est la règle du complément qui redit son titre, appliquée à l’adresse d’une édition.

⚠️ **UNE BIBLIOGRAPHIE PREND LE RETRAIT SUSPENDU, où qu’elle paraisse** (« pour la bibliographie, il faut un retrait négatif pour les secondes lignes d’un paragraphe »). Les listes que portent les notices éditoriales sont des bibliographies — « Études sur cette traduction », cinq références chez la Bible du XIIIe siècle —, et une référence de deux lignes ne se lit que si la seconde rentre : c’est ce qui sépare deux notices à l’œil. Même mesure que toutes les bibliographies du site (§ 35.6.2), et la puce part avec le retrait : une liste à puces et une bibliographie ne sont pas la même chose.

**LA CHRONOLOGIE D’UNE BIBLE SE COMPOSE COMME CELLE D’UN AUTEUR** (« ajouter une chronologie assez petite inspirée du modèle de la page auteur ; composer pour l’occasion des liens chronologiques »). ⛔ Composer une chronologie, ce n’est PAS inventer des faits datés : c’est CHOISIR et ORDONNER ce que le corpus sait déjà. On ne rattache que des événements existants, datés, sourcés et validés, et le lien porte « à contrôler » — l’interface choisit, l’auteur valide. Inventer un événement pour garnir une frise serait une décision philologique prise par une décision d’interface. ⚠️ Trois brins pour une bible : ce qui l’a FORMÉE, l’ÉDITION servie, sa RÉCEPTION, plus le CONTEXTE qui l’explique ; cinq entrées suffisent, et l’ordre est chronologique.

⛔ **DEUX VUES QUI NOMMENT LA MÊME CHOSE DOIVENT SE RÉPONDRE.** La chronologie des auteurs écrit ses types d’affichage sans accents, celle des traductions écrit « édition » et « réception » avec les leurs : DEUX brins sur trois ne trouvaient donc ni couleur ni libellé, et leurs puces tombaient sur le gris de repli. La frise ne distinguait plus ce qu’elle range, et c’est pour cela que sa légende avait été éteinte sur les traductions. ⚠️ On replie la CLÉ, on ne renomme pas la donnée : la vue dit ce qu’elle dit, et le rendu s’y accorde. La légende revient avec les couleurs — trois brins ne se devinent pas plus pour une bible que pour un Père.

⛔ **NI DÉGRADÉ, NI EMBLÈME, NI BOUTONS dans une petite fenêtre d’explication** (« je n’aime guère la mise en forme, surtout le dégradé ; le site n’a aucun dégradé ; fais simple, élégant, propre, proportionné »). La fenêtre du livre absent avait pris le cadre de la fenêtre « compte requis » : un bandeau teinté qui s’éteignait vers le bas, un livre fermé dessiné dans son anneau, et autant de cartouches bordés que de bibles proposées — trois ornements pour dire une phrase et nommer deux titres. Reste la composition que la fiche emploie déjà : une rubrique en capitales espacées, le nom en sérif, un filet, la phrase, puis une LISTE où chaque rangée n’est qu’un nom et sa flèche. ⚠️ Une fenêtre de la page Bible ne s’invente pas un dessin : elle prend celui de la page.

⚠️ **UN NOM DE BIBLE SE COMPOSE PARTOUT DE LA MÊME FAÇON** (demande de l'auteur, 2026-09-04). « Bible française du XIIIe siècle » prend ses petites capitales et son exposant dans le menu central de la page Bible, dans la liste qu'il déploie, dans la fiche « À propos de cette traduction » et dans la référence de son édition — comme elle les prend déjà dans le menu de la Polyglotte et dans les notices d'auteur. Un titre entre astérisques y prend son italique. C'est le module partagé, et il n'y a pas deux façons d'écrire un nom selon l'écran où il paraît. ⛔ Les DATES d'un intitulé se composent AVEC lui : elles en étaient sorties, si bien que « (XIIIe siècle) » restait en chiffres ordinaires dans la fiche même de la bible qui porte ce siècle dans son nom.

⛔ **DANS UNE RÉFÉRENCE BIBLIOGRAPHIQUE, ON NE COMPOSE QUE LES SIÈCLES.** Un fragment de notice porte déjà son rôle — intitulé, nom d'autorité, données —, et c'est le RÔLE qui décide de son italique et de ses petites capitales. Y ajouter la composition des astérisques poserait un italique DANS un fragment déjà italique, où il ne se verrait pas, et ferait décider par le texte ce que la donnée nomme.

⚠️ **À GAUCHE CE QU'ON LIT, À DROITE CE QUI LE DOCUMENTE — et la colonne de droite va jusqu'en bas** (« peut-on envisager que “Édition et état du texte” soit sous la chronologie ? proprement ? »). La rubrique tenait toute la mesure, SOUS les deux colonnes ; or une frise de cinq entrées s'arrête à mi-hauteur d'une notice qui continue, et la fiche montrait donc un grand vide à droite avec sa rubrique reléguée dessous. Elle remplit ce vide, où elle est à sa place. ⚠️ Ses rangées y EMPILENT l'étiquette et sa valeur : une colonne d'étiquettes de 8,5 rem ne laisserait pas cent soixante-dix pixels à la valeur dans une colonne étroite. C'est la forme que la fiche d'édition emploie déjà, et c'est le MÊME composant — une rangée recopiée à deux endroits ne reste identique que par accident.

⚠️ **L'INTERLIGNE D'UNE BIBLIOGRAPHIE EST SERRÉ, LE BLANC ENTRE DEUX NOTICES EST LARGE** (« réduire légèrement l'interligne ; augmenter légèrement le blanc entre deux œuvres »). Une bibliographie n'est pas de la prose : les lignes d'une même référence se lisent d'un trait, tandis que deux références sont deux objets. Le blanc doit donc être plus grand ENTRE les entrées qu'à l'intérieur de l'une d'elles — sans quoi la liste se lit comme un paragraphe, et le retrait suspendu reste seul à dire où commence la suivante. ⛔ La mesure vaut pour TOUTE la famille, l'apparat des bibles comme les listes des notices : il n'y a qu'une composition bibliographique sur le site.

⛔ **LA CARTE DE TRADUCTION SE COMPOSE EN SANS** (citant la carte de Segond : « Louis Segond (1810-1885) D’après l’édition de Paris, Société biblique britannique et étrangère, 1910 // sans sérif »). Elle avait pris la SERIF du volet des œuvres, dont elle est copiée ; mais ce volet-là surmonte un texte en serif, et sa carte est de la même encre que ce qu’elle annonce. Celle-ci surmonte une LISTE DE LIVRES, qui est en sans, et le nom de la bible qui la coiffe l’est aussi : la serif y faisait deux régimes dans une carte de trois lignes. ⚠️ **Règle générale : UNE CARTE DE VOLET PREND LA POLICE DE CE QU’ELLE SURMONTE, non celle du volet dont on l’a copiée.** Que deux volets se ressemblent ne dit rien de ce qu’ils annoncent, et c’est ce qu’ils annoncent qui décide. ⚠️ La divergence avec le volet des œuvres est donc assumée : ce n’est pas la même page.

### 38.5 Le RAIL d’un volet replié — un seul dessin, et il nomme l’action

Demande de l’auteur du 4 septembre 2026 : « remettre en place le système permettant de fermer un volet gauche ou droite ; ajouter un titre clair sur la barre quand elle est fermée ».

⚠️ **UN VOLET DE LECTURE SE FERME, ET CE QUI RESTE DE LUI EST UN RAIL** : une bande de trente pixels, un chevron en tête, et le nom de l’action écrit en hauteur, dans le sens d’un dos de livre français. Les deux volets de la page Bible — les livres à gauche, les commentaires à droite — et le volet de la Polyglotte le partagent. ⛔ Il y en avait TROIS, voisins et déjà divergents : celui de la Polyglotte portait le passage lu, celui des livres écrivait son nom de bas en haut, celui des Pères de haut en bas et deux crans plus petit. Un seul composant désormais. ⚠️ Le rail se FONCE au survol : une surface qui ne porte ni cadre ni fond propre n’a pas d’autre façon de dire qu’on peut la toucher.

⚠️ **LE RAIL NOMME L’ACTION, JAMAIS LE CONTENU.** « Commentaires » écrit sur une bande fermée décrit ce qu’on ne voit pas ; « Ouvrir les commentaires » dit ce qu’un clic fera, et c’est la seule chose qu’un rail ait à dire. ⚠️ Un repère peut s’y ajouter EN SECOND, dans le sérif de lecture et sans capitales : la Polyglotte y garde le passage ouvert, que le tableau ne nomme plus une fois le volet replié.

⛔ **UN RÉGLAGE DE DISPOSITION MOBILE NE DÉCIDE JAMAIS D’UN CONTRÔLE DE BUREAU**, et c’est la vraie leçon de cette reprise. Le système existait : les deux volets savaient se replier, rail compris. C’est la FLÈCHE qui les repliait qui avait disparu, gardée par une condition sur la présentation mobile — « en onglets ou en tiroir » — juste sur un téléphone, où les onglets font office de navigation, et sans objet sur un bureau. La page Bible passant « onglets » en toutes circonstances, le bureau perdait un contrôle pour une raison qui ne le regardait pas, et rien dans le rendu ne le montrait. **Une condition d’affichage nomme d’abord la surface qu’elle vise.**

⛔ **UN CONTRÔLE DE VOLET NE DÉPEND NI DE L’ONGLET QU’ON REGARDE, NI DE SA PLACE.** La flèche vivait dans la rangée du champ de recherche ; sous l’onglet « Sommaire » ce champ n’a pas d’objet — il cherche des LIVRES — et la rangée disparaissait avec lui, emportant le seul moyen de fermer le volet. Elle paraît désormais tant qu’elle porte la flèche, réduite alors au fer à droite. ⚠️ Et elle se pose EN TÊTE, sous les onglets : rendue après une liste qui prend toute la hauteur restante, elle tombait à deux mille pixels de l’endroit où elle se trouve sous l’autre onglet, et un contrôle qui change de bout d’écran ne s’apprend jamais.

⛔ **UN CONTRÔLE NE SE RANGE PAS DANS UN OBJET QUI EN PORTE DÉJÀ.** La flèche qui replie le volet de gauche vivait au bout du CHAMP DE RECHERCHE, et l'auteur l'a cherchée sans la voir : à cet endroit, un chevron de quatorze pixels se lit comme une marque du champ — une croix d'effacement, une loupe —, non comme un contrôle du volet. Elle se pose dans le COIN INTÉRIEUR du volet, au bout de la ligne du nom, là où celui de la Polyglotte se tient depuis toujours et où le volet de droite porte le sien : le nom à gauche, le repli à sa droite, et il pointe vers le bord où le volet va se ranger. ⚠️ Il ne se confond pas avec la flèche qui annonce une fiche : celle-là suit le TEXTE, à l'intérieur du lien ; celui-ci se tient au BORD de la carte.

⚠️ **ET UN CONTRÔLE DE QUATORZE PIXELS NE PREND PAS L'ENCRE LA PLUS TÉNUE DE L'ÉCHELLE.** Un rang au-dessus, et l'accent au survol, qui dit qu'on peut le toucher. ⛔ La couleur se déclare dans la FEUILLE : posée en style en ligne, elle battrait la règle de survol — le piège est payé quatre fois dans ce dépôt.

⛔ **UNE RUBRIQUE NE REDIT PAS CE QUE LA FICHE PORTE EN TÊTE.** « Responsable de l'édition » quitte « Édition et état du texte » (« fait un peu tache ; supprimer ») : il portait le plus souvent le nom déjà écrit deux centimètres plus haut — « Louis-Claude Fillion ; édition numérique : Corpus Scriptura » sous « Traduction de Louis-Claude Fillion ». ⚠️ Le champ reste LU : il nomme le responsable d'une ÉDITION CRITIQUE dans l'intitulé qui suit le nom, là où il apprend quelque chose.

⚠️ **LE RAIL CENTRE SON TEXTE, ET SON CHEVRON RESTE EN TÊTE** (« centrer verticalement le texte ; réduire un peu la taille de police »). Un rail fait toute la hauteur de la lecture : le libellé posé sous le chevron pendait en haut d’une bande de huit cents pixels, quand un dos de livre porte son titre au milieu. ⛔ Le chevron, lui, ne descend pas avec lui — il est là où l’œil arrive, et c’est la cible qu’on vise, non le mot. ⚠️ Le groupe se centre d’un BLOC, le libellé et le repère ensemble : les centrer chacun pour soi détacherait le passage lu du nom qu’il accompagne.

⚠️ **Et son texte descend d’un rang** — le libellé de onze pixels à dix et demi, le repère de onze et demi à onze. Sur une bande de trente pixels de large, un texte plus menu se lit encore et pèse moins : la contrainte n’est pas la lisibilité mais l’encombrement, un rail devant se faire oublier tant qu’on ne le cherche pas.

### 38.6 La COULEUR d’un corpus se prend là où le lecteur l’a déjà vue

Demande de l’auteur du 4 septembre 2026 : « dans la barre de recherche, recherche, résultats qui s’affichent, etc., utiliser plutôt le maroquin de la page d’accueil pour les résultats liés à la patristique ».

⛔ **UNE MATIÈRE NE SE NOMME PAS DE DEUX FAÇONS SELON L’ÉCRAN.** Les Pères portaient un POURPRE DE RUBRIQUE dans la recherche et un MAROQUIN sur la page d’accueil, dont le carton est une reliure rouge depuis le 31 août. Chacune des deux teintes se défendait pour elle-même, et c’est le piège : le lecteur, lui, n’a pas deux Patristiques. La couleur d’un corpus se prend donc là où il l’a déjà rencontrée, et l’accueil est la première page de toutes. ⚠️ Le pourpre n’était pas faux — il tenait ses écarts et sa lisibilité ; il n’était simplement nulle part ailleurs sur le site.

⚠️ **Une teinte reprise garde son RANG là où elle peut, et le change là où elle doit.** L’aplat de la rubrique prend la teinte du carton telle quelle : c’est le même office, un fond coloré qui porte un texte clair. L’ENCRE du Cuir ne le peut pas, les deux teintes du carton y étant sombres quand il faut là une encre CLAIRE ; c’est alors le même maroquin monté au rang d’encre, teinte tenue. ⛔ Ce qui se transpose est la TEINTE, jamais la valeur.

⚠️ **Et la reprise se paie en profondeur, ce qui est assumé.** Le maroquin est plus sombre que le vert de l’Écriture et que l’or de la Communauté — L* 23,6 contre 41,3 et 41,9 — si bien que la bande des Pères se lit plus sombre que les deux autres. C’est le caractère d’un maroquin, non un écart à corriger : sur l’accueil, les cartons de la Bible et des Pères sont tous deux à cette profondeur, « maroquin vert et maroquin rouge, les deux reliures d’un même ensemble ». ⛔ L’éclaircir pour l’aligner sur ses sœurs, ce serait le reprendre à l’accueil, qui est justement d’où il vient.

⚠️ **Les deux exemplaires restent LITTÉRAUX, et se renvoient l’un à l’autre.** Le carton est une gamme DESSINÉE, le jeton une teinte de RÔLE, et la charte les tient séparés depuis le jour où des jetons d’encre ont fait s’inverser les cartons en Cuir. Chacun porte donc sa valeur en clair, et un renvoi vers l’autre : reteinter le carton sans reteinter les jetons ferait dire deux choses au même corpus.

### 38.7 Une page de lecture s’ouvre sur un TEXTE, et elle s’y ouvre en fondu

Deux demandes de l’auteur du 4 septembre 2026 : « supprimer le dessin et afficher soit le dernier emplacement de lecture de l’utilisateur — il faut donc l’enregistrer — soit la Genèse » ; « à l’ouverture de la page, que ce soit en Polyglotte ou en Classique, faire un affichage plus doux que le texte qui apparaît brutalement ».

⛔ **UNE PAGE DE LECTURE NE S’OUVRE PAS SUR UN ÉCRAN D’ATTENTE.** La Polyglotte montrait la tour de Babel ruinée et l’invite « Ouvrez un livre » tant qu’aucun livre n’était choisi : une gravure pour tout contenu, et un geste à faire avant de lire quoi que ce soit. Elle s’ouvre désormais sur un texte, toujours — le dernier passage lu, à défaut celui de la Bible classique, à défaut la Genèse. ⚠️ La gravure ne disparaît pas du dépôt : elle passe en RÉSERVE, où l’inventaire des illustrations la garde avec son histoire.

⚠️ **LE LECTEUR N’A QU’UNE LECTURE EN COURS, MÊME S’IL LA MÈNE SUR DEUX PAGES.** La Polyglotte retient sa propre place, mais sa PREMIÈRE visite s’ouvre là où la Bible classique en était : ouvrir sur un livre choisi pour lui quand on sait où il lisait serait le renvoyer au commencement. La Genèse ne sert que le tout premier passage. ⛔ Et l’on ne retient JAMAIS « le livre entier » : c’est un geste explicite et coûteux — les Psaumes entiers sur quatre colonnes — et une ouverture de page doit être brève ; un livre entier laissé à la dernière visite rouvre à son premier chapitre.

⛔ **DEUX PAGES S’OUVRENT EN FONDU, ET PAS PAR LE MÊME CHEMIN : C’EST LA PROVENANCE DU TEXTE QUI DÉCIDE.** Le texte de la Bible classique est rendu par le SERVEUR, donc peint avant même que la page s’anime : son fondu se déclare dans le rendu — le HTML servi le porte — et joue dès la première peinture. ⚠️ Poser ce fondu après coup ferait DISPARAÎTRE un texte déjà lisible pour le ramener, c’est-à-dire pire que le défaut qu’on corrige. Le texte de la Polyglotte, lui, vient du NAVIGATEUR : rien n’est à l’écran avant lui, et c’est l’arrivée déjà en place qui se joue — la première n’avait simplement pas de départ pour l’appeler.

⚠️ **L’ouverture n’est pas ÉCHELONNÉE, à la différence d’une arrivée**, et ce n’est pas un choix de goût : le rang d’un bloc se mesure dans le navigateur, ce qui est trop tard pour une page dont le serveur a déjà peint le texte. La colonne entière paraît d’un seul fondu. ⛔ Et ce fondu ne porte QUE l’opacité, quand celui d’une arrivée translate de six pixels : une transformation ferait de la colonne le bloc conteneur des cellules d’actions posées en position fixe.

⚠️ **Une place retenue se relit dans UN SEUL module.** Les deux clés vivaient à la main dans les pages qui les écrivent et dans celles qui les lisent ; le cœur en est désormais pur et prouvé sans navigateur, et le contrôle du livre demandé se fait contre la liste RÉELLEMENT servie — un code retenu de longue date peut avoir disparu du canon offert, et la page doit ouvrir tout de même.

### 38.8 Le volet patristique se lit EN FRANÇAIS, et d’un trait

Cinq demandes de l’auteur du 4 septembre 2026, au soir.

⚠️ **LE FRANÇAIS OUVRE TOUTE LECTURE EN REGARD** (« sur le Français – Ancien français : le français doit toujours être à gauche »). La règle valait pour Fillion depuis le 20 août ; elle vaut pour toute famille éditoriale. ⛔ C’est une DONNÉE — l’ordre des membres —, jamais une constante du code, et les deux ordres étant sous contrainte d’unicité, l’échange passe par un rang temporaire.

⛔ **LA GOUTTIÈRE D’UN VERSET NE PORTE QUE SA RÉFÉRENCE** (« je trouve “ACT 1,22” comme référence biblique : c’est une erreur ; on indique seulement “1, 22”, avec l’espace et sans le nom abrégé du livre »). La page dit déjà quel livre on lit, en titre et dans le volet. ⚠️ Le code venait d’un REPLI, non d’une donnée voulue : la référence seule vit dans une métadonnée que 28 656 segments portent, et les 18 197 autres retombaient sur le LIBELLÉ humain du segment, qui porte son livre. On corrige à l’affichage ; la donnée reste ce qu’elle est.

⚠️ **UN EXTRAIT PATRISTIQUE COMMENCE PAR UNE CAPITALE**, à l’affichage seul (« toute référence patristique citée dans le volet de droite doit comporter une majuscule en début de phrase »). Un extrait commence là où le lien le prend, c’est-à-dire souvent au milieu d’une phrase de l’édition, et il se lit alors comme une phrase amputée. ⛔ La capitalisation ne change JAMAIS la longueur du texte : les appels de note s’y posent par offset.

⛔ **ON NE SERT PAS DU LATIN À QUI VIENT LIRE LES PÈRES EN FRANÇAIS** (« dans le volet de droite, toujours afficher une traduction française, la plus récente »). Un lien biblique désigne parfois un texte en langue originale — 2 468 segments liés sur 39 823, six œuvres, toutes pourvues d’un français public et d’un alignement qui l’y relie. ⛔ Re-pointer les liens serait le remède le plus simple et le plus faux : le lien a été établi sur le LATIN. La correspondance se fait à l’affichage, par les tables d’alignement, qui sont faites pour cela.

⛔ **ET LA CARDINALITÉ DU GROUPE DÉCIDE, car on n’invente aucune correspondance.** L’alignement est au PARAGRAPHE et rarement un pour un : mesuré, La Cité de Dieu compte 1 039 groupes dont 802 aux effectifs inégaux, 4,8 latins pour 6,0 français en moyenne et 22 au plus. À effectifs ÉGAUX, le nième latin répond au nième français et la contrepartie est un seul paragraphe ; à effectifs INÉGAUX, on rend TOUT l’empan français du groupe. ⚠️ Choisir le premier, ou le nième « à peu près », donnerait un passage que le lien ne désigne pas : une erreur de philologie présentée comme une citation, ce qui est pire qu’un latin qu’on ne lit pas. ⚠️ Le prix est visible et assumé : un empan inégal peut faire une occurrence de plusieurs milliers de signes là où les autres en font trois cents.

⚠️ **LES CITATIONS D’UNE MÊME ŒUVRE SE RÉUNISSENT, L’ÉLISION MARQUÉE D’UN « […] »** (« regrouper les citations d’une même œuvre patristique — seulement, non biblique — comme c’est déjà le cas pour les segments qui se suivent ; il faut remplacer l’élision par un « […] » et que l’élision soit de taille raisonnable, disons au maximum 500 caractères »). ⛔ **On ne réunit que ce qu’on peut MESURER** : un écart se juge en signes élidés, non en nombre de segments — une édition en découpe un en dix, une autre en fait un seul —, il faut donc connaître le texte élidé, c’est-à-dire l’avoir lu. Un écart dont un seul segment manque à l’appel ne se réunit pas : un « […] » qui cacherait une quantité inconnue ne dit rien au lecteur.

⛔ **ET L’ON NE RÉUNIT QUE DANS UN MÊME TEXTE, non dans une même œuvre.** Une œuvre en porte plusieurs — La Cité de Dieu son latin et son français, tous deux liés à des versets — et leurs numéros de segment se recouvrent : le regroupement collait un paragraphe latin à un paragraphe français dès que leurs numéros se suivaient, et le défaut était là depuis l’origine du regroupement. ⚠️ Rien de tout cela ne concerne les VERSETS bibliques : une suite de versets se réunit déjà, et par une tout autre règle — elle garde ses bornes, et une élision y ferait disparaître un verset sans le dire.

### 38.9 Le DOMINO de l’ouverture, et les BLANCS de la justification

Quatre demandes de l’auteur du 4 septembre 2026, sur la Polyglotte.

⚠️ **À L’OUVERTURE, LE TEXTE TOMBE EN DOMINO** — colonne par colonne, de gauche à droite (« peut-on imaginer que le texte s’affiche progressivement, colonne par colonne, pour donner un effet de domino ? ça peut être joli, mais il faut que ce soit rapide »). C’est le dispositif d’arrivée déjà en place, dont le rang se prend sur la COLONNE au lieu de la hauteur. ⚠️ Le pas DOUBLE : cinq colonnes au pas ordinaire se joueraient en cent vingt millisecondes, et la chute ne se verrait pas. ⛔ Et cela À L’OUVERTURE SEULEMENT : la même chute jouée à chaque chapitre tourné cesserait d’être un accueil pour devenir une attente ; les arrivées suivantes gardent la chute ligne par ligne, qui suit la lecture.

⛔ **UN CLIC QUI NE FAIT RIEN DE PLUS QUE LE SURVOL EST UN CLIC PERDU** (« quand je clique sur le nom d’une traduction qui a un menu déroulant secondaire, ne pas bloquer le clic : afficher la première traduction du menu déroulant »). Cliquer une édition à plusieurs textes ne faisait que déployer le volet, que le survol déployait déjà. Le clic choisit désormais le PREMIER texte, celui que le volet met en tête, et le volet reste ouvert pour en prendre un autre. ⚠️ Le clavier suit le clic : Entrée et Espace choisissent, la flèche déploie — un clavier qui n’aurait plus que le déploiement n’atteindrait jamais le premier texte.

⛔ **LE FLOTTANT QUI OUVRE UN VERSET NE PREND PAS SUR LE TEXTE** (« affiner encore la densité du texte, les césures, renvois, pour éviter les blancs ignobles et contre-natures entre mots »). Mesuré sur la page servie : la lettrine de référence valait 28,8 pixels et sa marge 8, soit 12 % de la mesure — et sur soixante-sept blancs de plus de trois espaces, SOIXANTE étaient sur la ligne qu’elle rétrécit. ⚠️ **La cause d’un blanc ignoble n’est presque jamais la césure : c’est une ligne trop courte.** Une marge gauche négative range le flottant dans le rembourrage de la cellule, qui perd d’autant : le texte retrouve sa mesure pleine dès la première ligne, et le repère reste où l’œil le cherche.

⛔ **RECTIFICATION DU MÊME JOUR, ET ELLE PORTE SUR LES DEUX MOITIÉS DE CETTE RÈGLE** (relevé de l’auteur le soir même : « la référence canonique dans la cellule de chaque verset, celle qui est grise, doit être alignée en marge gauche avec le texte contenu dans la même cellule »). Le flottant est rendu au **FER DU TEXTE**. Mesuré sur la page servie, la marge négative le posait à **−10,00 px** du fer, sur les quarante-huit cellules relevées et sans une exception : chaque verset ouvrait donc sur un repère en saillie, et le bord gauche de la colonne était ragué d’un bout à l’autre.

⛔ **ET LE GAIN N’EN ÉTAIT PAS UN**, mesuré avant et après sur la même page : le plus grand blanc passe de **5,47 à 4,86** espaces naturelles, le neuvième décile de 2,78 à 2,66, et les blancs de plus du triple de **147 à 123**. Rendre le fer au texte n’aggrave pas la justification, il l’améliore d’un cheveu. ⚠️ **Ce qui coûte à la justification est la LARGEUR d’un flottant, non sa POSITION** : la première ligne perd les mêmes pixels de mesure quel que soit le côté où on le range. C’est un RAISONNEMENT, non une mesure, qui avait conclu l’inverse le matin — *une règle tirée d’un raisonnement se vérifie avant d’être écrite, et celle-ci n’aura vécu qu’une matinée.*

⛔ **UN VOILE D’ATTENTE COUVRE TOUT CE QUI ATTEND, EN-TÊTE COMPRIS** (même relevé : « quand on charge un texte, le fond change légèrement de couleur ; c’est ok, mais il faut aussi qu’il change au niveau des en-têtes de colonne »). Il ne couvrait que le corps du tableau : la teinte s’arrêtait net sous le filet, et la bande qui porte le nom des éditions — c’est-à-dire ce qu’on vient précisément de changer — restait la seule chose qui ne bougeait pas. La page se donnait comme à moitié en attente.

⚠️ **C’EST LE BLOC POSITIONNÉ QUI DÉCIDE DE CE QU’UN VOILE COUVRE**, puisqu’un voile s’étend à son parent positionné et à rien d’autre. Le remonter d’un cran suffit, et le corps garde le sien, dont dépendent les cellules d’actions. ⚠️ Un en-tête COLLANT porte un rang d’empilement : le voile monte plus haut que lui et le recouvre donc, à l’arrêt comme au défilement — sans lui prendre ses événements de pointeur, car on doit pouvoir changer une colonne pendant qu’une autre charge. ⛔ Et l’ANNEAU ne bouge pas d’un pixel : il vit dans un enfant collant sous l’en-tête, dont la boîte est bornée par la hauteur restante, que le voile plus haut ne change pas.

⛔ **ET UNE ESPACE ÉTROITE AGGRAVE LA JUSTIFICATION AU LIEU DE LA SERVIR.** La justification ajoute le MÊME blanc absolu quelle que soit l’espace de départ : resserrer l’espace naturelle ne resserre donc que les lignes déjà justes, et rend l’écart plus criant partout ailleurs. ⚠️ C’est le contraire de ce qu’on croit en la resserrant pour gagner en densité. Mesuré : l’espace remontée d’un demi-cran, le plus grand blanc d’une page passe de 7,5 à 5,6 fois l’espace naturelle, et les blancs de plus du double tombent d’un quart. ⛔ La densité n’y perd rien, le flottant rendu au texte raccourcissant la page d’autant.

⚠️ **Ce qui a été mesuré et ÉCARTÉ, pour n’y pas revenir.** « text-wrap: pretty » fait PIRE sur du texte justifié — le plus grand blanc y triple. Un plafond de césure plus permissif (« hyphenate-limit-chars ») ne change rien du tout. Et une césure française posée à la main sur les mots longs ne gagne presque rien : le dictionnaire du navigateur fait déjà le travail — sans lui, les blancs de plus du double augmentent de moitié —, et ce qui reste est fait de NOMS PROPRES, qu’aucune règle ne coupe sans risque. ⛔ Un blanc résiduel dans une colonne étroite n’est pas un défaut de réglage : c’est le prix d’une colonne étroite justifiée, et l’on ne le paie pas en inventant des coupures.

### 38.10 La lecture EN REGARD — la référence des deux côtés, le verset cliquable

Cinq demandes de l’auteur du 4 septembre 2026, sur la page « Bible classique ».

⚠️ **LA RÉFÉRENCE PARAÎT DES DEUX CÔTÉS** (« la référence biblique doit apparaître des deux côtés : français, et ancien français »). Une édition ne dit sa numérotation PROPRE que lorsqu’elle DIFFÈRE du canon : la colonne qui n’en a pas portait donc une gouttière vide, et le lecteur n’avait de numéro que d’un bord. Elle retombe sur la référence canonique, « 3, 1 », composée comme la native — chiffres arabes, espace après la virgule, jamais le code du livre. ⛔ Ce repli ne prétend pas être une numérotation d’édition : il dit le CRÉNEAU, c’est-à-dire ce que les deux colonnes ont en commun.

⛔ **CLIQUER UN VERSET OUVRE SON APPARAT, ET LA CIBLE EST LA RANGÉE** (« permettre de cliquer sur un verset pour afficher les liens patristiques, sur l’AF et le Français »). Les deux colonnes d’une rangée sont le MÊME verset canonique, et le volet de droite se charge sur ce créneau : il n’y a rien à départager entre elles, et cliquer l’une ou l’autre ouvre le même apparat. ⚠️ Une rangée dont une colonne est vide se clique aussi — l’apparat tient au créneau, non à ce que telle édition en porte. ⚠️ Un second clic relâche, et les teintes sont celles de la lecture simple, pour que le geste se reconnaisse d’une lecture à l’autre. ⛔ Aucun comptage de lecture ici : les lignes d’une segmentation éditoriale ne visent pas la table des versets, et la lecture simple s’en abstient déjà pour elles. ⚠️ L’appel de note, lui, arrête le clic : ouvrir une note ne sélectionne pas le verset qui la porte.

⛔ **UNE MARQUE POSÉE SUR UNE RANGÉE NE DÉPLACE RIEN.** Le fond du survol déborde de quelques pixels sur les côtés, et ce débord se prend en marge NÉGATIVE : pris en rembourrage, il rétrécirait les colonnes, et le fer du texte des versets cesserait de répondre à celui de l’appareil, que la feuille déduit des mêmes mesures. ⚠️ Et il se déclare dans la FEUILLE, jamais en style en ligne — une déclaration en ligne bat toute règle de feuille sans passe-droit, et c’est ainsi qu’un survol meurt sans que rien ne le dise.

⛔ **UNE ÉLISION QUI SUIT UNE PONCTUATION FORTE OUVRE UNE PHRASE** (« à l’affichage, afficher une majuscule après une élision précédée par une ponctuation forte »). Ce qu’on élide entre deux phrases, ce sont des phrases entières : la suivante commence donc comme une phrase, et prend la capitale. ⛔ Rien ne change après un deux-points, un point-virgule ou une virgule, où la phrase n’était pas finie. ⚠️ Le guillemet et la parenthèse fermants ne rompent pas la ponctuation forte : « Il le dit. » finit bien une phrase. ⚠️ C’est la règle de l’initiale d’un extrait, et la même main : elle ne change jamais la longueur du texte, les appels de note s’y posant par décompte de signes.

⛔ **UN ÉTAT QU’ON TRAVERSE NE SE COMPOSE PAS COMME UNE PAGE DE TITRE** (« ouvrir Bible classique soit sur la Genèse, soit sur le dernier livre ouvert par l’utilisateur ; supprimer le dessin »). La barre rouvre désormais la Bible où l’on en était — le dernier livre lu, la Genèse à la première visite — et la gravure des ruines quitte l’écran qui dit qu’une traduction ne comporte pas le livre demandé. Elle y disait bien ce qu’il fallait ; mais l’écran se rencontre plus souvent depuis que la barre rouvre un livre qui n’est pas toujours dans la bible qu’on retrouve, et une planche de soixante pour cent de la hauteur y devient une cérémonie pour un passage. La mention seule reste. ⛔ Et la planche passe en RÉSERVE dans l’inventaire des illustrations : une gravure qu’on cesse de poser se déclasse, elle ne s’oublie pas.

⛔ **LES RÉFÉRENCES DU PASSAGE QU’ON QUITTE S’EFFACENT AUSSITÔT** (« quand je change de segment, au moment du chargement, supprimer immédiatement, de façon smooth, les références déjà affichées ; afficher un petit symbole de chargement »). Le volet gardait la liste précédente sous un mot « Chargement… » : on lisait donc, une seconde durant, l’apparat d’un verset qu’on venait de quitter, et rien ne disait que ce n’était plus le bon. ⚠️ La PLACE, elle, reste : retirer la liste du flux ferait sauter le volet au clic, puis sauter de nouveau à l’arrivée. ⚠️ Et la marque d’attente ne se pose que là où l’on attend vraiment — le volet de la page Bible va chercher ses liens, celui d’une page d’œuvre les a reçus avec sa tranche de texte et ne montre qu’un fondu.

### 38.11 Le CHAPITRE vient de l’ossature, et la COLONNE se charge seule

Huit points de l’auteur du 4 septembre 2026, sur la Bible polyglotte.

⛔ **LE NOMBRE DE CHAPITRES VIENT DE L’OSSATURE, jamais d’une table écrite à la main** (« le Siracide ne contient qu’un chapitre ; c’est normal ? »). Elle ne portait que les soixante-six livres protocanoniques, et tout deutérocanonique y retombait sur UN chapitre : le Siracide en a cinquante et un, la Sagesse dix-neuf, les deux livres des Maccabées seize et quinze, Tobie quatorze, Judith seize, Baruch six — quelque vingt-deux mille versets que le volet n’offrait pas d’ouvrir, sur les DEUX pages de lecture. ⚠️ Et elle avait déjà DÉRIVÉ sur ce qu’elle prétendait couvrir : Joël y valait trois chapitres pour quatre, Daniel quatorze pour douze. Elle existait en TROIS exemplaires. C’est la règle déjà payée sur les natures de segment et sur le sommaire d’une œuvre, prise par un troisième bout : **une liste recopiée finit toujours par coûter du texte au lecteur.**

⛔ **UN LIVRE QU’ON NE PEUT PAS OUVRIR NE SE LISTE PAS** (« j’ai un Esther (grec) qui s’affiche dans le sommaire : ça doit disparaître »). Le tableau se compose sur les créneaux canoniques : un livre que l’ossature ne porte pas s’ouvre donc sur une page vide, et l’offrir est un cul-de-sac. ⚠️ La règle vaut pour tous, non pour celui qu’on a nommé : la Lettre de Jérémie et les douze écrits non canoniques encore à charger s’en vont avec lui, et leur rubrique disparaît faute d’entrées. ⛔ Le raisonnement d’avant — « ce sont de vraies œuvres à charger, gardons-leur leur place » — est abandonné : une promesse qui ne s’ouvre pas se lit comme une panne.

⛔ **CHANGER UNE COLONNE NE RECHARGE PAS LA TABLE** (« quand je change de traduction sur une colonne, il ne faut pas tout recharger ; seulement le texte de cette colonne »). L’attente était GLOBALE : elle voilait le tableau entier et rejouait le passage, quand les autres colonnes n’avaient pas bougé et que leur texte était déjà en mémoire. Mêmes livres et même chapitre : la table ne bouge plus, et seule la colonne neuve dit qu’elle arrive. ⚠️ Elle le DIT, au lieu de se donner pour absente : « Absent de cette traduction » sur une colonne qui charge est un mensonge d’une seconde, et c’est celui que le lecteur retient.

⛔ **UNE MARQUE D’ATTENTE SE CENTRE SUR LA PART VISIBLE DE SON BLOC**, et cette part ne commence pas toujours sous la barre de navigation : la Polyglotte pose au-dessus de son tableau un en-tête collant de soixante-douze pixels, sous lequel rien ne se lit. Mesuré sur la page servie, l’anneau tombait trente-six pixels à côté du centre. ⚠️ La LARGEUR n’a jamais demandé de réglage : le voile couvre son bloc, et l’anneau s’y centre. ⚠️ Et le bloc garde la hauteur du tableau tant que rien n’est chargé, sans quoi l’anneau se centrerait dans une bande de douze rem posée en haut d’un écran vide.

⚠️ **Les marges d’une colonne s’ouvrent, l’interligne se resserre** (« augmenter légèrement les marges, y compris pour le numéro de référence non canonique » ; « resserrer très très légèrement l’interligne »). Gouttière de dix à treize pixels, blanc de sept-huit à huit-neuf, interligne de 1,36 à 1,34. ⛔ Et le numéro d’origine reprend trois pixels contre la réglure, qu’il TOUCHAIT : sa marge négative valait exactement la gouttière. Les trois mesures sont nommées une fois et se répondent — elles s’étaient déjà désaccordées.

⛔ **UN CURSEUR QUI PROMET UNE EXPLICATION DOIT EN AVOIR UNE** (« au survol de "Absent de cette traduction" j’ai un curseur avec un point d’interrogation, mais aucun texte ne s’affiche ; ça n’a donc aucun sens »). L’infobulle disait « cette traduction ne porte pas ce verset », c’est-à-dire la mention elle-même en d’autres mots. La mention se suffit : c’est ce pour quoi elle a été écrite, et le curseur s’en va. ⚠️ Là où l’infobulle dit vraiment quelque chose de plus — pourquoi une case deutérocanonique est vide —, les deux restent.

### 38.12 Un état qui ne VARIE pas n’informe pas, et ce qui est PRÉREMPLI est figé

Trois points de l’auteur du 4 septembre 2026, sur l’onglet « Catalogue des traductions ».

⛔ **UN ÉTAT QUI NE VARIE PAS N’INFORME PAS : ON LE RETIRE.** La mention « ✦ Référence en cours de vérification » paraissait sur **2 488 notices sur 2 499** — les onze autres seules disaient autre chose, et le troisième état, « Non vérifié », n’existait sur aucune. Elle ne distinguait donc rien, et jetait sur tout le catalogue un doute qu’aucune de ces références ne méritait. ⚠️ La tentation est de la RAFFINER — un degré de vérification plus fin, un statut d’import — et l’auteur l’a écartée : « rien de spécial ; en fait, il faut tout bonnement supprimer ». Une ligne qui dit la même chose partout coûte de la place et de l’attention sans rien rendre ; on la retire plutôt que de la farder. ⛔ Et les colonnes qui la servaient cessent d’être demandées : un champ que rien ne lit finit par contredire ce qu’on affiche.

⛔ **UNE ABRÉVIATION QU’IL FAUT SURVOLER POUR LA COMPRENDRE N’EST PAS UNE ÉCONOMIE.** « DP » tenait deux signes et demandait un geste, et son infobulle ne faisait que développer le sigle : deux gestes pour deux mots. « Domaine public » s’écrit en toutes lettres, sans infobulle et sans curseur d’aide. ⚠️ C’est la même règle que celle de la case vide de la Polyglotte, prise par l’autre bout : là on retirait une infobulle qui ne disait rien de plus que le texte ; ici on écrit le texte pour n’avoir plus besoin d’infobulle.

⛔ **CE QUI EST PRÉREMPLI EST FIGÉ.** Une proposition d’œuvre lancée depuis une notice du catalogue en porte l’auteur et le titre : ils SONT la notice, et les laisser modifiables laissait partir une proposition qui ne désignait plus la ligne qu’on avait sous les yeux — l’équipe éditoriale recevait une œuvre sans savoir d’où elle venait. ⚠️ Le verrou se déduit de ce qui a été PASSÉ, non d’un drapeau : le formulaire ouvert seul, qui ne préremplit rien, reste entièrement libre. ⛔ Un champ figé n’est ni grisé ni « en lecture seule » : c’est une VALEUR qu’on montre, non une saisie qu’on refuse, et elle se compose comme une valeur — dans le cadre du champ, pour que la colonne garde son aplomb. ⚠️ Et l’on dit UNE fois pourquoi ces cases ne s’ouvrent pas : un champ figé sans un mot se lit comme un champ en panne.

### 38.13 Les deux SÉRIES du Budé — l’hommage est discret par sa TAILLE, non par sa pâleur

Demande de l’auteur du 4 septembre 2026 : « pour rendre hommage discrètement aux Budé, mettre le petit encart contenant les initiales de l’auteur en couleurs ; en rouge pour les latins, en jaune pour les grecs ; s’inspirer des couleurs Budé et adapter à l’harmonie du site ». La Collection des Universités de France relie ses volumes grecs en jaune safran et ses latins en rouge : sur un rayon, la série se lit avant le titre.

⛔ **L’HOMMAGE EST DISCRET PAR SA TAILLE, NON PAR SA PÂLEUR.** Un premier jeu de teintes lavées a été mesuré puis écarté : ΔE 9,7 entre les deux séries, et 5,0 entre le rouge et la case NEUTRE — on ne les aurait distinguées ni l’une de l’autre, ni d’une case sans couleur. Or ce qui fait le Budé, c’est justement qu’on reconnaît la série de loin. Les teintes sont donc franches, et c’est le CARRÉ qui est petit : quarante-quatre pixels dans une carte de trois cent cinquante. ⚠️ La règle vaut au delà de ce cas : *délaver une couleur pour la rendre discrète, c’est lui retirer ce qu’on lui demandait de dire.*

⛔ **ET CE NE SONT PAS DES COULEURS DE PLUS DANS LA PALETTE.** Elles tombent sur les axes que le site a déjà : le rouge est à 37° de teinte, entre le danger confirmé (31°) et le danger (48°), et sa chroma est celle du premier ; le safran est à 81°, la teinte de la lacune (82°) et de l’or (83°), monté en clarté et en chroma jusqu’au rang d’un aplat. Mesuré : ΔE 51,8 entre les deux séries, 72,9 et 61,6 avec la case neutre — on ne les confond avec rien.

⛔ **CE SONT DES JETONS À ELLES, non deux jetons de rôle réemployés.** Une série de collection n’est ni un danger ni un apparat, et un jeton de RÔLE prêté à une CATÉGORIE finit par changer sous elle le jour où le rôle bouge. ⚠️ En Cuir, elles GARDENT leur teinte — ce sont des catégories encodées par la couleur, comme la frise de l’histoire et les catégories de modération, et les rabattre au monochrome effacerait ce qu’elles disent. Elles s’y RELISENT pourtant : le rouge descend d’un cran, le safran de sept, le second étant seul à risquer l’éclat sur une page sombre.

⛔ **LÀ OÙ LA COLLECTION SE TAIT, LA CASE SE TAIT.** Le Budé ne connaît que ces deux séries : le syriaque, l’arménien, l’arabe et le copte gardent la teinte neutre du site. ⚠️ Et un corpus que les DEUX séries se disputent n’en reçoit aucune — les Actes des martyrs anciens portent quinze notices latines et seize grecques, les Apophtegmes deux et trois : les colorer serait mentir. Une langue TIERCE, elle, ne conteste rien : un auteur latin dont une œuvre n’est conservée qu’en syriaque reste de la série latine. Mesuré sur les 417 auteurs du catalogue : 196 latins, 154 grecs, 5 partagés, 62 d’une autre langue ou sans langue.

⚠️ **La langue se prend sur la PREMIÈRE nommée**, le champ étant du texte libre qui porte souvent une chaîne de transmission : « grec ; version latine de Rufin », « grec perdu ; version syriaque conservée ». L’original ouvre la phrase, et c’est lui qui décide — une œuvre grecque conservée en latin reste grecque. ⛔ On ne cherche pas la langue ailleurs que dans la tête : « ancien français » ne doit pas devenir du latin parce que le mot y paraîtrait plus loin.

⚠️ **Une information portée par la seule COULEUR n’est lisible que de qui connaît le code** : la case porte donc aussi son mot, « Œuvres en latin », « Œuvres en grec ». Ce n’est pas l’infobulle en l’air du § 38.12 : celle-ci dit ce que la couleur seule ne peut pas dire.

⛔ **ET LA TROISIÈME CASE N’EST PAS UN GRIS VIDE — c’est un VÉLIN** (demande de l’auteur, le jour même : « j’aimerais au moins des tons un peu plus nobles, plutôt que ce gris vide »). Le volume broché posé entre deux reliures : là où la collection se tait, la case ne prétend rien, mais elle le dit comme une DÉCISION et non comme une donnée manquante. ⚠️ Et le gris n’était pas seulement vide : mesuré, les initiales n’y rendaient que **2,25** de contraste au Clair et 4,09 en Cuir, pour 4,5 exigés à cette taille — le gris de bordure portait l’encre la plus ténue de l’échelle, et cela depuis toujours. Le défaut est antérieur à la couleur des séries ; il se voyait d’autant plus depuis qu’il voisinait deux cases lisibles. 7,12 et 6,70 désormais.

⛔ **ET SURTOUT PAS LE VERT**, essayé et écarté. Le jeton de l’Écriture vaut EXACTEMENT la teinte du vert du site : deux choses différentes auraient été vertes sur le même site, et un carré vert aurait dit « biblique » devant un Père syriaque. Le vert est en outre l’ACCENT, celui qui signifie « actif, c’est ici » : l’exception aurait crié plus fort que la règle. ⚠️ Et un vert PÂLE, pour éviter cela, retombait dans le piège des teintes lavées — ΔE 5,5 de l’ancien gris, on ne l’aurait pas vu.

⚠️ **LE VÉLIN SE DISTINGUE DES DEUX SÉRIES PAR LA CHROMA, NON PAR LA TEINTE** : 15,3 contre 53,8 et 60,9. Une MATIÈRE, non une couleur — et c’est ce qui l’empêche de se lire comme une troisième série, alors même qu’il partage l’axe chaud du safran (84° contre 81°). ⛔ La règle vaut au delà de ce cas : *quand on veut marquer sans classer, on baisse la chroma, jamais la lisibilité.* Mesuré : ΔE 25,8 de la carte, contre 8,8 pour l’ancien gris, qui s’y noyait.

### 38.14 Une RÉFÉRENCE emprunte le strut de son texte, et un FILTRE qui ne compte pas ne sert à rien

⛔ **CE QUI ALIGNE UNE RÉFÉRENCE SUR SA LIGNE DE TEXTE, C'EST UN RAPPORT, NON UN NOMBRE** (relevé de l'auteur, 2026-09-04 : « aligner la référence en marge de gauche avec le texte »). Mesuré sur la Polyglotte servie : la référence canonique en marge ET le numéro d'origine en lettrine tombaient tous deux **2,40 px au-dessus** de la ligne de base du verset. La règle est qu'une référence EMPRUNTE le strut de la cellule qu'elle accompagne — même police, même corps, même interligne, même blanc du haut —, et que son numéro se compose en plus petit DANS cette boîte : un enfant en ligne plus petit se pose sur la ligne de base du strut sans la déplacer. Les deux écarts tombent à 0,00.

⚠️ **LA POLICE COMPTE AUTANT QUE LE CORPS.** L'ascendante d'une sans n'est pas celle d'une sérif : c'est ce qui restait de travers — huit dixièmes de pixel — quand le corps, l'interligne et le rembourrage s'accordaient déjà. Le strut se prend donc dans la police du TEXTE, et la police du numéro ne vit que sur l'enfant qui le porte.

⛔ **ET UN RÉGLAGE EN PIXELS NE PEUT PAS COMPENSER UNE DIFFÉRENCE MESURÉE EN REM.** L'ancien dispositif était un interligne absolu et un rembourrage calibrés une fois au navigateur, avec le tableau des écarts consigné en commentaire. Il n'était juste qu'à une SEULE taille de police racine — le site en a une fluide, de 16 à 22 — et il s'est déréglé le jour même où le blanc de la cellule est passé de 7 à 8 px et l'interligne de 1,36 à 1,34. ⚠️ Le commentaire disait pourtant « à remesurer si l'un des deux corps ou l'interligne change » : *une consigne de remesure est le signe qu'on a posé un nombre là où il fallait poser un rapport.*

⚠️ **UN BLANC DE LISTE SE MESURE DANS L'ENCRE, NON DANS LES BOÎTES** (relevé de l'auteur sur la Bibliothèque : « je devine un déséquilibre ; éloigner un peu la première ligne du titre, et rapprocher les lignes entre elles »). En marges, les trois écarts valaient un pixel et paraissaient égaux ; d'encre à encre, il y avait **4,0 px entre le titre et sa première édition et 8,7 px entre deux éditions** — les sœurs s'écartaient deux fois plus qu'elles ne s'écartaient de leur propre titre, et la liste ne se lisait pas comme un bloc. Les libellés étant plus petits que leur ligne, le demi-interligne ajoute près de deux pixels qu'un calcul en marges ne voit pas. ⛔ Le blanc d'après-titre et le blanc d'entre lignes sont donc DEUX mesures, non une.

⛔ **UN FILTRE DIT CE QU'IL AJOUTERAIT, ou il ne sert à rien.** Chaque pastille porte le nombre d'auteurs qu'elle rendrait, compté sur la recherche et tous les AUTRES filtres, jamais le sien : c'est ainsi qu'une facette dit ce qu'elle ajoute, et non ce qui reste une fois qu'elle a agi. ⚠️ Et une facette qui ne rendrait RIEN ne se montre pas — sauf si elle est active : *on ne cache jamais un filtre qui agit*, sans quoi le lecteur ne saurait plus pourquoi sa liste est courte. ⛔ La période, seule des trois facettes, ne se dérivait pas des données : ses cinq empans s'affichaient toujours, et l'on pouvait cliquer un siècle que la bibliothèque ne porte pas.

⛔ **ET UNE FACETTE N'A PAS BESOIN D'UNE COULEUR À ELLE.** Les trois axes portaient trois teintes — brun, bleu, vert —, ce qui faisait de la couleur une décoration : la rubrique au-dessus de chaque rang dit déjà de quel axe il s'agit. Le bleu était en outre la seule teinte froide de l'écran, hors de la bande du Cuir. ⚠️ Ce n'est pas contraire au § 38.13 : là, la couleur EST l'information — elle dit la série d'une œuvre, que rien d'autre ne dit ; ici, elle répétait une étiquette déjà écrite.

⚠️ **Les espaces fines : rien à faire, et c'est mesuré.** Le tableau porte bien l'insécable pleine chasse devant le deux-points et la fine insécable devant le point-virgule — relevé sur un chapitre servi : 21 U+00A0 et 18 U+202F —, et Source Serif les rend à leur juste chasse, 2,04 px contre 4,06 pour une espace ordinaire, soit 14,6 % du cadratin contre 29,1. Elles ne tombent donc ni à la lecture ni à l'affichage.

### 38.15 Une FICHE dit ce que le LECTEUR peut en faire, jamais ce que l’ATELIER en sait

Quatre demandes de l’auteur du 2026-09-04, sur la fiche « En savoir plus sur cette traduction ». Elles disent toutes la même chose par quatre bouts : **une fiche publique n’est pas un carnet de travail**, et ce qu’un lecteur ne peut pas employer ne doit pas lui être montré.

⛔ **UN ÉTAT DE TRAVAIL N’EST PAS UN RENSEIGNEMENT** (« VérificationContrôle en cours // ne pas afficher »). La rangée disait « Contrôle en cours » sur **six bibles sur neuf**, et il fallait cliquer un mot souligné de pointillés pour apprendre ce qu’elle recouvrait : « Corpus intégralement aligné ; collation imprimée à poursuivre ». C’est l’état de NOTRE travail, pas une propriété du texte qu’on lit. ⚠️ Conséquence assumée : `statut_corpus_public` et `lacunes_publiques` ne paraissent désormais NULLE PART sur le site. Le seul de leurs contenus qui soit un fait de lecteur — l’Ecclésiaste absent de la Septante — a été porté dans la notice de l’édition, où il ouvre le propos.

⛔ **UN RENVOI À UN ARTICLE NUMÉROTÉ N’EST PAS UNE EXPLICATION** (« Conditions d’utilisation, § 6 // supprimer »). Il envoyait chercher ailleurs ce que les deux paragraphes venaient de dire en clair, et il le disait dans la langue d’un acte. La page des conditions reste au pied du site, où on la cherche quand on la cherche.

⛔ **UNE ADRESSE, UN OBJET** (« Source numériqueeBible.org / BibleNLP corpus (fra-fraLSG) · Voir la source // remettre en forme pour faire au plus clair »). La rangée en alignait trois pour une seule adresse : le nom, un point médian, et un lien dont le libellé — « Voir la source » — redisait l’étiquette de sa propre rangée. On hésitait donc sur ce qu’on cliquait. **Le nom EST la source : il mène à elle**, et rien ne l’accompagne. ⚠️ Le nom se rend toujours, lien ou pas : un composant qui ne rend rien sur une adresse malformée emporterait le nom avec elle.

⛔ **UNE NOTICE NE NOMME AUCUN OBJET DE LA BASE.** Celle de la Segond disait : « Numérotation hébraïque/protestante (alignée sur versets_canon via ch_heb/v_heb) […] Texte aligné verset par verset sur le vref eBible. » Trois noms d’objets internes en deux phrases, dans une fiche que le lecteur ouvre pour savoir quelle Bible il lit. Partent avec eux : la balise `<i>` de la Sacy, et les « 75 codes techniques dans la base » de la Crampon.

⛔ **ET ELLE NE PORTE PAS DE JOURNAL DE TRAVAIL.** La Vulgate publiait ses comptes d’alignement — « 36 004 lignes ; 35 721 rattachées à l’ossature ; […] 36 004 alignements vérifiés » —, la Septante une décision datée avec son motif juridique et son renvoi à la charte, plus deux voies de rattrapage. Ce sont des pièces d’atelier ; elles se tiennent à l’atelier.

⚠️ **HIÉRARCHISER, C’EST METTRE EN TÊTE CE QUI SERT LE LECTEUR.** La notice de la Septante ouvrait sur son format d’import — « un mot par ligne dans la source, réassemblé au verset » — et gardait pour la fin, après un tiret cadratin, la seule chose qui change sa lecture : **l’Ecclésiaste manque**. Elle ouvre maintenant dessus. L’ordre d’une notice suit l’importance, jamais l’ordre où l’import a rencontré les faits.

⛔ **CE QU’UNE RANGÉE DIT DÉJÀ NE SE REDIT PAS.** La Segond annonçait sa numérotation hébraïque dans sa notice, deux centimètres sous la rangée « Numérotation — Hébraïque ». Une notice ne porte que ce qui n’a pas de rangée à soi. C’est la règle du complément de titre (§ 3.8) transposée à une fiche.

⚠️ **RIEN DU FOND N’EST PERDU, et c’est la condition.** Chaque fait éditorial est conservé : les deux recensions de Daniel, Suzanne et Bel, la lacune de l’Ecclésiaste et son motif, les italiques de la Sacy relevées sur le fac-similé, les deux cent quatre-vingt-trois lignes de la Vulgate hors du découpage canonique, les suscriptions de la Crampon comptées comme premier verset. On a réécrit la formulation, jamais le fond. Mesuré : la Septante passe de 897 à 519 signes, la Segond de 198 à 159, la Vulgate de 399 à 379 ; la Sacy MONTE de 208 à 320, parce qu’expliquer une italique coûte plus de mots que de nommer une balise.

⚠️ **UNE PROSE NE SE COMPOSE PAS COMME UNE ÉTIQUETTE.** « Particularités » porte quatre phrases dans une rangée dessinée pour un mot : la valeur y prend l’interligne et la césure d’un paragraphe, non celui d’une étiquette de 0,5 rem. ⛔ Sans justification : la colonne fait environ 314 px, soit quarante-cinq signes par ligne, et le justifié y creuse les blancs que le § 38.9 apprend à fermer.

⚠️ **ET LA NORME FRANÇAISE SE POSE AU RENDU, ici comme partout** (§ 3.2). Mesuré le même jour : les cinq notices bibliques ne portaient QUE des espaces ordinaires (U+0020), guillemets et deux-points compris — la fiche les servait telles quelles, faute de passer par la normalisation. Les champs de prose y passent désormais. ⛔ On n’écrit donc pas de fine dans la donnée : elle resterait la seule table du site à en porter.

### 38.16 Un CHOIX ne s’offre que s’il en est UN

Relevé de l’auteur sur le volet de la page Œuvre, 2026-09-04 : « Éditions de ce texte : je constate pas mal de problèmes. Souvent, on a deux fois la même édition qui s’affiche, le texte latin ou d’origine n’est pas sous la bonne édition, etc. Fais un audit. Je veux que ce choix s’affiche seulement si on a le choix entre deux éditions différentes pour une même langue. »

⛔ **DEUX MENUS POUR UNE SEULE QUESTION EN FONT UN DE TROP.** Le volet en portait deux, avec deux intitulés et deux règles : « Édition » listait les ŒUVRES SŒURS — des lignes d’`oeuvres` au même titre normalisé —, « Éditions de ce texte » les TEXTES de l’œuvre courante. Le lecteur, lui, ne choisit pas entre deux sortes d’identifiants : il choisit une édition. Ils n’en font plus qu’un. ⚠️ Et celui des œuvres sœurs ne s’était **jamais ouvert** : aucune œuvre publiée ne partage son titre normalisé avec une autre, la seule paire — La Cité de Dieu et son latin de Migne — ayant été dépubliée le 2026-08-26. *Un menu qu’on n’a jamais vu s’ouvrir n’est pas une réserve pour plus tard : c’est une seconde règle qui attend de contredire la première.*

⛔ **UN INSTANTANÉ DE TRAVAIL N’EST PAS UNE ÉDITION.** `oeuvre_textes` garde les états d’avant une reprise — `TXT_A0010O0100_FR_1866_JOYEUX_PRE_RESEG_20260903` à côté de `TXT_A0010O0100_LEGACY`, même traducteur, même millésime, même mention d’édition. Ils portent `is_public = false`, et le menu les offrait pourtant : la politique de lecture de la table dit `is_admin() OR (is_public AND …)`. ⚠️ **Le défaut était donc invisible depuis un compte de lecteur, et visible depuis le seul compte qui regarde la page tous les jours.** C’est la forme la plus coûteuse d’un défaut : celui que le propriétaire du site est seul à voir, et qu’il finit par prendre pour l’état normal des choses.

⚠️ **CE QU’ON LIT PARAÎT TOUJOURS, fût-il à l’atelier.** Un menu qui tairait la ligne courante mentirait sur l’endroit où l’on se trouve. C’est déjà la règle du menu des bibles, où le catalogue ne liste que les bibles lisibles mais liste toujours celle qu’on lit.

⛔ **DEUX EXEMPLAIRES D’UNE MÊME ÉDITION SE FONDENT EN UN.** Ce qui identifie une édition est le TRADUCTEUR, le MILLÉSIME et la MENTION D’ÉDITION — jamais l’identifiant du texte. Deux lignes qui ne diffèrent que par lui sont deux exemplaires d’une seule édition, et le lecteur qui les voit côte à côte n’a aucun moyen de choisir. Les Homélies sur l’Hexaéméron portent ainsi **deux fois le même Migne 1857** en grec. ⚠️ L’exemplaire retenu est celui qu’on LIT, sinon celui qui fait défaut, sinon celui qui est publié.

⛔ **ET LE TRI SE FAIT SUR LA LANGUE, non sur l’original.** La règle d’avant comparait « ceci EST le texte original » à « je LIS le texte original », ce qui n’est pas la même question : un texte sans traducteur dans une langue tierce tombait du mauvais côté. La langue vient du TEXTE qu’on lit, et d’abord de lui ; ⚠️ une version qui n’en déclare aucune ne se range sous aucune, et le menu se tait plutôt que de deviner.

⚠️ **APRÈS QUOI UNE SEULE ŒUVRE DU CORPUS OFFRE ENCORE CE CHOIX** : la Consolation de la philosophie, en français, entre Ceriziers 1646 et Mirandol 1861. C’est le résultat attendu et non un effet de bord — le site n’a qu’un texte par langue partout ailleurs. *Un menu qui ne paraît presque jamais n’est pas un menu inutile : c’est un menu qui dit la vérité sur ce que le corpus contient.*

⛔ **UN MÊME GESTE SE PRÉSENTE DE LA MÊME FAÇON DES DEUX CÔTÉS DU SITE** (même relevé : « mettre à jour la mise en forme de Lecture et Éditions de ce texte pour correspondre à la mise en forme qu’on trouve dans Bible classique »). Choisir comment on lit ce qu’on a sous les yeux est le même geste sur la Bible et sur une œuvre : il prend donc la même rubrique en casse ordinaire et la même option par ligne, sur la pastille verte de la liste. La page Œuvre portait encore l’étiquette en capitales espacées et les boutons encadrés d’un filet, c’est-à-dire la forme d’avant la décision du 28 août 2026, restée là parce qu’elle vivait dans un autre fichier. ⚠️ Il n’y a plus qu’une seule définition, et les deux jetons de l’ancienne sont retirés : une forme qu’on garde « au cas où » est une divergence qui attend.

⚠️ **Un seul écart demeure, et il est motivé** : la page Œuvre garde son témoin d’attente au bout de chaque ligne de « Lecture ». « Latin » y vise une AUTRE adresse, donc un rendu serveur entier, quand les axes de la Bible se règlent le plus souvent sur place.

⛔ **UNE LIGNE DE MENU RÉPOND À UNE SEULE QUESTION** — quelle édition je lis —, et rien d’autre (relevé de l’auteur, le soir même : « ne pas afficher les dates de vie et de mort de l’auteur dans l’onglet de choix de la traduction dans le volet gauche »). « Traduction par René de Ceriziers (1603–1662), 1646 » portait DEUX empans de dates sur la même ligne, dont l’un ne dit rien de l’édition, et l’œil hésitait sur ce que le millésime désignait. ⚠️ **La fiche « À propos de cette édition » est l’endroit d’une notice ; un volet de lecture est l’endroit d’un choix.** Ce qui documente une édition et ce qui la désigne ne se composent pas au même endroit, et la même ligne ne peut pas faire les deux.

⚠️ **La donnée reste en base**, et c’est l’AFFICHAGE qui s’en passe : les dates vivent dans `metadata`, portées par les deux seuls textes du corpus à les avoir. ⛔ Mais la fonction qui les lisait est retirée, et la donnée a quitté la SIGNATURE du libellé — *une signature qui ne reçoit plus ce qu’elle ne doit plus afficher est une garde plus sûre qu’un test*, et une fonction que plus rien n’appelle est une seconde vérité qui attend.

### 38.17 Une NOTIFICATION est une lettre, et un BLOC ne se pose pas dans un BLOC

Cinq relevés de l’auteur sur le volet des notifications, 2026-09-04 : « ne pas faire un bloc dans un bloc ; utiliser tout l’espace disponible » ; « se passer du bandeau vert sur le côté gauche » ; « chaque ligne a un niveau de hiérarchie, ça brouille tout : simplifier » ; « un message de validation doit être vert ; un message de refus doit être rouge (maroquin ?) ; un message basique reste grisâtre » ; « pas de "archiver" ; au survol, s’affiche "archiver" ».

⛔ **UN BLOC NE SE POSE PAS DANS UN BLOC.** Chaque notification était une CARTE — fond propre, filet, coins arrondis, rembourrage — posée dans un volet qui a déjà tout cela. Deux cadres emboîtés, et une gouttière perdue de chaque côté pour un volet de 26 rem : le texte y perdait le sixième de sa mesure sans rien y gagner. ⚠️ **Une liste dans un cadre se compose en RANGÉES**, pleine largeur, séparées d’un filet, et son rembourrage est celui de l’en-tête du cadre — sans quoi les fers ne tombent pas au même endroit. ⛔ Et pas de bandeau au flanc : il disait « nouvelle », ce que l’onglet dit déjà, et il rentrait le texte de trois pixels de plus.

⛔ **UNE NOTIFICATION PORTE QUATRE CHOSES : expéditeur, objet, message, date**, et un lien au bas. C’est le modèle de la LETTRE, et il suffit. Elle en portait SIX, sur six rangs typographiques — un titre en capitales vertes, l’objet en sérif, la date, un « À propos : … » en italique, une ligne « Message de X », le corps. ⚠️ **Trois de ces six disaient la même chose sous trois formes** : « Publication acceptée », puis « Votre publication a été acceptée et publiée. », et le titre du document ailleurs. *Un rang de plus n’ajoute pas un renseignement : il ajoute une hésitation sur l’ordre de lecture.*

⛔ **LE CORPS EST VIDE QUAND L’OBJET DIT TOUT.** Une phrase par défaut qui paraphrase l’objet est pire qu’une ligne absente : elle occupe le rang où l’on cherche ce que la modération a réellement écrit. Le message ne paraît donc que s’il porte des mots de quelqu’un.

⛔ **LE TON EST UNE COULEUR, non un titre.** Vert pour une validation, l’encre du danger confirmé pour un refus, gris pour le reste : la couleur dit en un coup d’œil ce que six mots en capitales disaient à la ligne au-dessus. ⚠️ **Elle ne colore QUE l’objet** — un rang coloré parmi trois se lit ; trois rangs colorés ne se lisent plus. ⚠️ Et « à revoir » se range avec les REFUS : la publication n’a pas été acceptée en l’état, et le lecteur a quelque chose à faire.

⛔ **LE MAROQUIN NE SERT PAS AU REFUS, et la question méritait d’être tranchée.** Il est `--cs-peres` : il DIT un domaine du corpus, sur la page de recherche comme sur le carton de l’accueil, et le prêter à un rôle d’interface le ferait dire deux choses. C’est `--cs-danger-fonce` qui convient, l’encre du danger CONFIRMÉ, déjà transposée dans les deux thèmes. *Une teinte qui encode une catégorie ne se prête pas à un rôle, et l’inverse est déjà écrit au § « Palette ».*

⛔ **UNE ACTION QUI NE VIENT QU’AU SURVOL EST HORS D’ATTEINTE.** « Archiver » ne paraît plus qu’au survol, comme demandé — mais aussi au FOYER et sur un écran TACTILE, où rien ne se survole. C’est la règle déjà payée sur la gouttière d’actions des prélèvements. ⚠️ Et il garde sa PLACE quand il ne se voit pas — opacité, non `display` — sans quoi la ligne se recomposerait sous le curseur au moment même où on le vise.

⚠️ **Un lien ne s’écrit que s’il mène quelque part.** « Aller au commentaire » se composait depuis toujours et ne paraissait jamais : la notification ne portait pas d’adresse. Elle la tire maintenant de `id_verset`, ⛔ sans traduction imposée — la page biblique choisit alors celle du lecteur, et il retrouve son verset dans SA bible.

### Règle d’autorité et de journalisation de la charte

`parametres.charte_ia` est l’unique version normative de la charte. Le fichier `charte/CHARTE_IA.md` n’est qu’un miroir régénéré depuis cette source et ne se modifie jamais directement. Le centre de contrôle (`controle_sections`) n’est pas une seconde charte : `commentaire_ia` conserve la synthèse globale actuelle de la section et `todos` le journal des missions. Une évolution de protocole est écrite dans `parametres.charte_ia`, puis son effet de chantier est consigné dans la mission concernée lorsque cela est utile ; on n’injecte jamais le texte intégral de la charte dans le centre de contrôle. Une divergence entre la charte normative et son miroir de dépôt se résout par régénération du miroir depuis Supabase, jamais par une seconde édition concurrente.

### 23.6.1. Préflight de schéma et staging avant resegmentation

Avant toute mutation textuelle ou structurelle, interroger le schéma réel des colonnes touchées (`information_schema.columns`, contraintes et dépendances). Une règle historique d’écriture ne doit jamais conduire à écrire explicitement dans une colonne devenue générée. Si une colonne dérivée est déclarée `GENERATED ALWAYS`, sa valeur est recalculée par PostgreSQL dans la même mutation de la colonne source : on modifie uniquement la colonne source et l’on vérifie ensuite la valeur générée. Dans l’état actuel de `segments`, `texte_norm` est générée par `public.norm_fr(segment_texte)` ; il est donc interdit de la placer explicitement dans le `SET` tant que cette définition de schéma demeure active. Si le schéma change de nouveau, la règle d’écriture doit être réévaluée avant la première mutation.

**Identifiants générés et colonnes `IDENTITY`.** Le préflight de schéma contrôle aussi `is_identity`, `identity_generation`, la valeur par défaut et la séquence éventuelle de toute clé insérée. Une clé déclarée `GENERATED ALWAYS AS IDENTITY` n’est jamais traitée comme une colonne libre au seul motif qu’une séquence est connue : appeler `nextval()` ne rend pas licite une insertion explicite. Par défaut, laisser PostgreSQL produire l’identifiant et récupérer le mapping par `INSERT ... RETURNING`. `OVERRIDING SYSTEM VALUE` n’est admis que lorsqu’un identifiant déjà réservé ou une correspondance de staging doit réellement être conservé, avec sauvegarde, justification explicite et vérification d’unicité avant et après écriture.

Toute resegmentation non triviale doit être préparée hors du corpus actif, de préférence dans `internal`, puis soumise avant remplacement à des contrôles déterministes : nombre d’unités et de segments, recomposition exacte de chaque unité, validité des offsets, empreintes SHA, conservation et position des marqueurs de notes, dépendances, absence de perte textuelle et distribution des longueurs. Le remplacement du live ne se fait qu’après réussite de ces contrôles et dans une transaction unique. Les rubriques ou titres structurels sont portés par des unités de type `heading` et par la hiérarchie ; ils ne doivent pas être dupliqués comme segments de corps. Lorsqu’un chantier nécessite des insertions répétées dans l’ordre documentaire, on peut créer une seule fois des intervalles d’ordre suffisamment larges, après audit des dépendances, puis resynchroniser les références vivantes qui mémorisent cet ordre ; on évite ainsi les renumérotations globales à chaque passe et on ne compacte qu’à la clôture. Après toute renumérotation de segments, rechercher explicitement les tables qui mémorisent un `segment_numero` en plus d’un identifiant stable (`segment_id`, `segment_key` ou équivalent) — notamment `prelevements` — et recalculer ce numéro dénormalisé depuis l’identifiant stable. La passe n’est conforme que si le contrôle final ne trouve aucun écart entre le numéro mémorisé et le segment vivant.

Une resegmentation qui supprime ou remplace des segments peut déclencher des suppressions en cascade dans les tables dépendantes, notamment les ancres de notes. Avant le `DELETE`, inventorier les dépendances et sauvegarder les lignes dépendantes. Si le remplacement exige de nouveaux `segment_key`, `segment_numero` ou `source_unit_id`, les ancres doivent être remappées ou recréées dans la même transaction que les nouveaux segments, puis vérifiées depuis la base avant `COMMIT`. Un `UPDATE` prévu après la suppression ne constitue pas une protection si la ligne dépendante peut déjà avoir été supprimée par cascade.

### 23.6.2. Frontières documentaires et frontières sémantiques

Une frontière produite par un OCR, un HTML, une API, un export Word ou un moteur de lecture ne vaut jamais, par elle-même, preuve d’un alinéa de l’édition. Les paragraphes, retours intentionnels et changements de niveau sont établis d’abord par le fac-similé ou par un encodage source dont la fonction documentaire est certaine. Les fins de page, de colonne, de ligne OCR et les découpages d’un extracteur ne doivent pas être promus en paragraphes.

Lorsqu’une resegmentation doit avancer avant que tous les alinéas aient pu être attestés, employer la frontière documentaire certaine la plus proche et la plus large — par exemple chapitre, section numérotée, paragraphe explicitement balisé — comme `source_unit_id`. À l’intérieur de cette unité, créer des segments sémantiques avec offsets exacts et rangs continus, sans prétendre que ces segments sont des paragraphes de la source. Le statut de la frontière documentaire encore à contrôler doit rester explicite dans les métadonnées. Une vérification ultérieure du fac-similé peut subdiviser l’unité source sans réécrire le texte.

La longueur ne décide jamais seule d’une coupure. Elle sert à repérer un segment à relire. Une coupure n’est admise qu’à une articulation syntaxique ou argumentative sûre ; un découpage à la phrase peut servir de présélection, mais les périodes longues, citations, objections, réponses et énumérations sont relues avant publication. Si le texte legacy présente une fusion, une inversion, une répétition ou une lacune à une jonction de page, la source est recollationnée avant toute resegmentation définitive.

Lorsqu’un paragraphe de lecture est créé sans correspondre à un alinéa attesté de la source, il s’agit d’une frontière éditoriale, non documentaire. La source reste découpée selon ses paragraphes attestés dans `oeuvre_texte_unites`; la couche de lecture peut subdiviser ces unités par `segments.paragraphe` pour améliorer la lisibilité. La première frontière d’un paragraphe de lecture doit conserver dans les métadonnées une origine explicite (`source` ou `editorial`) ainsi que le paragraphe source auquel elle appartient. Une frontière éditoriale ne doit jamais être présentée ultérieurement comme un alinéa du témoin.

### 35.15. L’apparat n’a qu’UN gris de titre, et la sous-section est un titre centré

Quatre remarques de l’auteur sur la Fillion lue en regard, le 30 août 2026, et un principe qui les tient : **une page qui porte déjà quatre rangs de gris n’en accueille pas un cinquième.** Le commentaire, la manchette, le français et le latin en tiennent quatre ; les titres y ajoutaient un vert.

⛔ **On ne transforme pas un STYLE DE RENDU pour corriger une DONNÉE mal rangée.** Le matin du 30 août, la sous-section était passée au corps de l’apparat et à l’italique parce que la grande introduction « Ancien Testament » la montrait trop lourde. Le diagnostic était faux, et l’auteur l’a corrigé le soir même : ce qui déplaisait dans cette pièce, ce sont les PARAGRAPHES qui y portent ce rang, non le rang lui-même. La correction est donc à faire dans la pièce, et le rang garde la composition qui convient aux dix-neuf autres sous-sections du corpus.

**La sous-section est un titre CENTRÉ** — dix-sept pixels, demi-graisse, romain. ⚠️ Sa distinction d’avec le paragraphe ne peut plus être la POSE, les deux se centrant : ce sont le CORPS et la GRAISSE. Le 29 août, c’était le centre qui les séparait ; poser une distinction sur un axe, c’est s’interdire de l’employer ailleurs, et il faut alors en trouver deux autres.

⛔ **Le chapeau d’une sous-section est en ROMAIN, seul chapeau du jeu à l’être.** Elle touche presque toujours un titre de péricope, qui la suit à quatre pixels et se compose en italique de seize : un chapeau italique de seize donnait deux lignes que rien ne séparait, sinon leur axe, et la paire se lisait comme une seule composition mal coupée. Il monte en outre à seize pixels, un cran au-dessus de celui du paragraphe — la ligne où l’on lit la sous-section ne peut pas être plus petite que le titre qu’elle domine. Le sous-titre tombé dans un bloc voisin suit, corps pour corps : les deux formes d’une même paire doivent se ressembler.

**L’ENCRE DES RANGS DE L’APPARAT.** Les rangs de sous-section, de paragraphe et de péricope quittent le vert des titres pour l’échelle de gris chauds, au MILIEU EXACT du corps de l’apparat qu’ils dominent et du texte biblique qu’ils annoncent (décision de l’auteur : « légèrement plus foncé que le texte des commentaires ; et légèrement plus clair que le texte des versets »). Mesuré au navigateur : L\* 43,2 · 29,6 · 15,1, soit deux crans de 13,6 et 14,5, et un contraste de 8,64 sur le papier. ⚠️ Les trois rangs hauts — livre, partie, section — gardent le vert : la coupure tombe entre les rangs qui coiffent une PIÈCE et ceux qui vivent dans le fil d’un chapitre. ⚠️ Au Cuir la bande est trois fois plus étroite (crans de 7,4 et 7,0) : là, l’encre ne fait que confirmer une hiérarchie que le corps, la pose et l’italique portent déjà.

⚠️ **Une couleur peut être JUSTE et paraître fausse : c’était la GRAISSE.** L’auteur demandait que la manchette « soit dans la couleur du texte des commentaires ». Elle y était depuis toujours — la même valeur mesurée sur le repère et sur le paragraphe qu’il coiffe — et il y lisait pourtant un gris de plus. À douze pixels, le demi-gras hérité de la rubrique posait assez d’encre par ligne pour se lire comme un quatrième rang. ⛔ **Avant de changer une teinte que quelqu’un dit fausse, la MESURER** : c’est parfois le poids, le corps ou l’interligne, et retoucher la teinte alors n’ajoute qu’un gris à une échelle qui en avait déjà trop.

### 35.16. Les gravures de Fillion — trois régimes, et ce que chacun fait du papier

Une gravure se tire du **feuillet JP2** de l'archive, jamais de la page composée du PDF, dont la compression à contenu mixte a détruit la demi-teinte. Trois régimes, décidés par la **largeur imprimée** sur la page à deux colonnes de Fillion : une gravure qui tient dans une colonne est une **vignette**, une gravure qui les enjambe est une **scène**, une page entière est une **planche hors-texte**. Le régime se dérive, il ne se saisit pas.

#### 35.16.1. La rampe alpha se mesure aux deux bouts, et sur cette gravure-ci

Une gravure au trait se détoure : son dessin passe dans la couche alpha, et l'encre se repose au rendu, de sorte qu'un seul fichier sert le papier et le cuir. Mais la rampe qui convertit le gris en alpha doit être bornée par deux valeurs MESURÉES sur la gravure, non par deux valeurs supposées.

**En haut, le papier n'atteint jamais le blanc absolu.** Il a un grain, et le verso transparaît. Une rampe qui part du blanc donne donc à tout le papier un alpha faible mais non nul : mesuré sur le « Modius ou boisseau romain », la moyenne des quatre coins valait 4,8 sur 255, pour un maximum de 16. Un voile uniforme ne se voit pas en lui-même, mais ses bords dessinent le rectangle de la découpe, et les caractères du verso y deviennent lisibles parce qu'ils ont une forme. C'est ce que l'auteur a relevé sur la page servie.

**En bas, l'encre doit atteindre l'opaque.** Prendre l'amplitude sur l'encre du site, et non sur l'encre de la gravure, laisse le gros du trait entre 40 et 120 d'alpha : la gravure paraît grise et molle.

Le plancher se prend sur la dispersion propre du papier, mesurée du côté clair de son pic, le seul flanc qui ne soit mêlé à aucune encre, puisque rien n'est plus clair que le papier ; le pic étant symétrique, sa demi-largeur haute donne son pied bas. Le plafond est le niveau sous lequel se tiennent deux pour cent des pixels, c'est-à-dire l'encre pleine.

On ne cherche pas une vallée entre le papier et l'encre : sur une gravure sur bois, la hachure peuple tout le registre, et il n'y en a pas.

L'alpha se calcule sur le gris brut, jamais sur une image déjà étalée. Les deux opérations font le même travail, et l'étalement, en plaquant tout le papier sur le blanc, détruit le flanc que la rampe doit mesurer.

#### 35.16.2. Une photogravure ne se détoure pas : elle se cadre

Une scène qui enjambe les deux colonnes est une photogravure en ton continu, dont l'encre couvre tout le champ. Mesuré sur les deux vues de Marc, la surface réellement transparente y valait trois pour cent, quand une gravure au trait en rend quatre-vingt-cinq à quatre-vingt-quatorze. La détourer revient à poser sur la page un rectangle d'encre à peine ajouré, dont le seul effet visible est d'en montrer les bords ; sur le thème sombre, elle disparaît.

Une photogravure garde donc son papier, comme une planche hors-texte, et se rogne en dedans du filet gravé que Fillion imprime autour d'elle. On ne conserve pas ce filet : il est irrégulier et écaillé aux angles, et un cadre imprimé de travers posé dans un cadre du site en fait deux. Le site pose le sien, droit.

Le filet se lit dans le profil de luminance moyenne au bord, où le papier laisse place à un creux net avant l'image. Un seuil compté en pixels sombres n'y suffit pas : à pleine résolution le filet est gris et fin.

#### 35.16.3. Une vignette se compose dans le commentaire qui couvre son verset

Décision de l'auteur du 30 août 2026 : le texte doit habiller les illustrations, tantôt à droite, tantôt à gauche.

Une illustration ancrée sur un verset est posée entre deux versets, sur son propre axe, où elle n'a rien à contourner. L'ancre ne bouge pas pour autant : elle dit où la gravure est imprimée dans le volume, c'est une donnée de provenance, et la déplacer pour obtenir un rendu serait réécrire le témoin. C'est la composition qui la fond dans la prose qui l'entoure, exactement comme le fait la page de Fillion, dont les deux colonnes sont du commentaire.

Le bloc porteur est le dernier bloc de prose que la page a posé avant d'arriver à la gravure. On ne refait pas de son côté un classement canonique : ce serait se donner une seconde vérité, qui dérivera de la première.

Les vignettes alternent d'un bord à l'autre le long du chapitre. Toutes du même côté, la colonne se déséquilibre.

Le seuil au-dessous duquel un bloc ne peut pas habiller se calcule sur la hauteur du flottant ; ce n'est pas une constante. Un seuil fixe écarte une gravure basse dans un commentaire court et laisse passer une gravure haute dans un commentaire à peine plus long. Le calcul se fonde sur trois mesures prises au navigateur, sur la composition réelle : la largeur du flottant, la piste de texte qui lui reste, et le nombre de signes qu'une ligne y porte. On retient le bas de la fourchette, car sous-estimer la piste revient à exiger plus de texte, donc à ne jamais poser un flottant qui dépasse ; et l'on ajoute deux lignes, pour que l'habillage se lise comme voulu. Un texte qui s'arrête au ras du flottant a l'air de l'avoir subi.

Une scène cadrée et une planche hors-texte ne s'habillent jamais. Une scène large coupée par de la prose ne se lit plus.

#### 35.16.4. Une vignette franchit la manchette, et à gauche elle prend sa colonne

Le repère d'un commentaire est lui aussi un flottant de gauche, large de sept rem. Une vignette qui flotte sans en tenir compte se range à côté de lui, et les deux ensemble ne laissent au texte que deux cent quinze pixels de piste, où le justifié se creuse de lézardes. Le flottant se dégage donc des deux côtés, car à droite aussi la manchette rognait la piste ; celle-ci revient alors à la mesure sur laquelle le seuil d'habillage est calculé.

À gauche, la vignette prend la colonne de la manchette, et non sa part de la colonne de lecture. Plus large que le repère, elle fait sauter le fer du texte d'un paragraphe à l'autre dans un même bloc. Rangée dans la colonne du repère, elle appartient à la grille de la page au lieu de la contrarier, et le bord gauche du texte ne bouge plus. Les deux mesures, la colonne et sa gouttière, se nomment et se lisent des deux côtés : recopiées, elles divergeraient.

Une épreuve dont la feuille est recopiée ment. Celle qui a servi ici ignorait que la manchette flotte, et le cas gauche y paraissait bon alors qu'il était mauvais. Une épreuve de mise en page lit la feuille du site telle quelle, et se photographie à la largeur d'un écran de bureau : sous sept cents pixels de fenêtre, les règles mobiles défont l'habillage et la manchette, ce qui n'a rien à voir avec ce que l'on veut juger.

#### 35.16.5. Le flou d'une gravure réduite est sa hachure, et aucun traitement ne la rend

Le trait est déjà mou dans la source. Mesurée sur les feuillets JP2, la largeur de transition d'un bord — le nombre de pixels pour passer de neuf dixièmes à un dixième de la plage locale — vaut quatre pixels ; dans le fichier servi elle vaut un pixel. Les bords sont donc aussi francs qu'une image matricielle le permet, et ce que l'on prend pour du flou n'en est pas.

Ce que l'œil lit comme du flou est la hachure du graveur, moyennée par la réduction. Elle occupe environ un sixième de la surface d'une vignette sous forme d'alpha intermédiaire. Et la preuve qu'il s'agit bien de hachure et non d'un lavis étalé : une courbe pondérée par la platitude du voisinage, qui creuse ce qui est plat et respecte ce qui a du gradient, ne trouve presque rien à corriger. À la taille servie, plus rien n'est plat.

Cinq voies ont été éprouvées et mesurées, et quatre sont à écarter définitivement. Le bruit ajouté ne fait pas reculer la bouillie de gris d'un point : il monte l'énergie de bord et la granularité, c'est-à-dire qu'il ajoute du haut de spectre là où il n'y a rien à articuler. Il simule la netteté, il ne la rend pas. Un accroissement de la netteté par masque flou augmente la part des gris intermédiaires au lieu de la réduire, ses halos étant eux-mêmes des gris intermédiaires. L'égalisation locale d'histogramme fait bouillir la matière et tache les ciels des photogravures. L'aplanissement du fond par maximum glissant ramène le voile et augmente la bouillie. La réduction en lumière linéaire n'a aucun effet mesurable, la rampe alpha étant mesurée image par image et absorbant le décalage global.

Seule une courbe en S sur l'alpha fait reculer la bouillie, et elle a un prix : elle efface les partiels les plus faibles, dans une proportion qui croît avec sa fermeté. C'est un arbitrage d'auteur, non un réglage technique, et il se prend sur une planche montrant les états à la taille où le lecteur voit la gravure.

Le vrai levier n'est pas le traitement mais la taille d'affichage. Une vignette posée à cent cinquante pixels ne peut pas porter plus de détail que cent cinquante pixels n'en autorisent, quelle que soit la finesse de la source. Fillion imprime ses petits objets à une part de sa colonne plus grande que celle que le site leur donne ; les agrandir rendrait à la fois la proportion imprimée et le détail.

Enfin, la réduction d'une planche tournée se compte après sa rotation : sa largeur servie est celle de sa hauteur d'origine. Un relevé fait sur la découpe non tournée donne un rapport de réduction faux, et sous-estime de beaucoup ce que la mise à la taille servie retire.

#### 35.16.6. Un fac-similé ne se complète pas : ce que deux modèles d'IA font vraiment d'une gravure

Deux modèles ont été éprouvés sur les gravures de Fillion, à la demande de l'auteur : un détrameur à l'échelle un, et un agrandisseur génératif de la famille Real-ESRGAN. Les deux sont à écarter, et pour deux raisons différentes qu'il importe de ne pas confondre.

Le détrameur ne transfère pas. Il est entraîné sur des trames d'impression régulières et mécaniques, alors que la hachure d'une gravure sur bois est tracée à la main : son pas varie du simple au triple, elle emprunte deux directions, et elle suit les formes du sujet. Sur une photogravure, le modèle transforme les lignes fines en gros traits ondulés ; sur un dessin au trait, il pâlit et lisse au point d'effacer des lignes. Mesuré à la taille servie, il rend moins de bords francs que la source et moins d'encre franche : il retire de la matière au lieu d'en dégager.

L'agrandisseur génératif, lui, fonctionne — et c'est ce qui le rend dangereux. À la taille où le lecteur voit l'image, il rend un dessin nettement plus net et plus noir que le nôtre. Mais le compte des bords francs le condamne : il en produit près des trois quarts en plus de ce que le témoin porte. Ces bords-là, personne ne les a gravés. À l'agrandissement, le procédé donne un œil et sa pupille à un visage que la source n'esquisse qu'en trois traits pâles, et il installe un paysage là où le graveur n'avait mis qu'une masse hachurée.

La distinction qui commande n'est donc pas « avec ou sans intelligence artificielle », mais retirer un porteur ou inventer du dessin. Retirer une trame et rendre le ton continu qu'elle encode reste une lecture du témoin, et c'est ce que faisait un atelier de photogravure. Rendre net un trait que la source ne porte pas, c'est choisir ce trait à la place du graveur, et le lecteur croira l'avoir lu de l'édition. Sur ce point la doctrine ne transige pas plus que sur un verset : on ne restitue pas ce qu'on n'a pas lu.

Une réserve subsiste, et elle vaut même pour un détramage réussi : sur une gravure faite d'après une photographie, la hachure est la main du graveur, non un artefact d'impression. La retirer, c'est tenter de remonter à la photographie et effacer le graveur. C'est un arbitrage éditorial, et il ne se prend pas au nom de la netteté.

Enfin, une remarque de méthode sur la sécurité. Un fichier de poids au format PyTorch est un pickle, dont la lecture peut exécuter du code. La bibliothèque que ComfyUI emploie pour charger ces modèles passe par un dépickleur restreint dont la liste blanche ne compte que les primitives de reconstruction de tenseurs ; tout autre appel est refusé. C'est la seule raison pour laquelle un modèle de provenance faible a pu être essayé sans risque. Un modèle sans licence déclarée ne peut de toute façon pas servir une image publiée.

#### 35.16.7. Le rattrapage se règle sur ce que le NAVIGATEUR rend

Une gravure se sert au double de sa taille d'affichage (§ 35.16.5). Sur un écran
ordinaire, le navigateur en fait donc une **seconde réduction**, avec son propre
filtre et sans aucun rattrapage de netteté : ⛔ **le lecteur ne voit jamais le
fichier que nous écrivons, il voit cette réduction-là.** Un réglage pris sur le
fichier servi se règle sur une image que personne ne regarde.

Mesuré le 30 août 2026 sur les neuf gravures au trait de Marc, en énergie de bord
APRÈS la seconde réduction, 100 % valant ce que notre propre réduction rendrait :

| rattrapage | trait restitué |
|---|---:|
| σ 0,6 (m2 2) | **83 %** |
| σ 1,0 (m2 3) | 90 % |
| σ 1,2 (m2 3) | 92 % |
| σ 1,4 (m2 3) | 97 % |
| **σ 1,6 (m2 3)** | **99 %** |

⛔ **Le remède n'est pas de rattraper plus FORT, mais plus LARGE.** À σ 0,6, monter
l'amplitude de 2 à 4 ne rend qu'un point : le rattrapage étroit renforce des
fréquences qui se trouvent au-dessus de la coupure de la seconde réduction, et
qu'elle jette donc aussitôt. C'est le rayon, non la force, qui décide de ce qui
survit.

⛔ **Et il ne vaut QUE pour le trait.** Sur une photogravure en ton continu, σ 1,6
fait bouillir la feuillée et granule les ciels : le défaut déjà consigné du
contraste local (§ 35.16.5), rencontré par une autre porte. Les planches cadrées
gardent le rattrapage étroit.

⛔ **ET LE RATTRAPAGE NE SERT JAMAIS À MESURER LA RAMPE.** La rampe est une mesure
de TONS ; le rattrapage n'est qu'un conditionnement de SORTIE. Les mêler les fait
interférer, et le défaut est retors : un rattrapage large creuse la queue sombre
de l'histogramme, donc le point d'encre, pris au 2e centile, **tombe avec elle** —
mesuré, de 119 à 77 sur le paralytique et de 104 à 62 sur le démoniaque — la rampe
s'élargit d'autant, et **tous les demi-tons s'éclaircissent**. Les neuf gravures y
perdaient de 5 à 19 % de leur densité d'encre. La rampe se mesure donc sur la
réduction NON rattrapée, et ne s'applique qu'ensuite au gris rattrapé.

⚠️ **Et la densité se mesure elle aussi APRÈS la seconde réduction**, rapportée au
témoin — la source réduite d'un trait à la taille d'affichage, sur une échelle
neutre. Prise sur le fichier servi, elle décrit une image que personne ne regarde
et le rattrapage y paraît ajouter jusqu'à 46 % d'encre que la seconde réduction
reprend aussitôt.

| chaîne | densité VUE, rapportée au témoin |
|---|---:|
| rattrapage étroit (σ 0,6) | **×0,90** |
| σ 1,6, rampe COUPLÉE | ×0,83 |
| σ 1,6, rampe DÉCOUPLÉE | **×1,03** |
| + la couture du § 35.16.8 | ×1,08 |

⚠️ L'ancienne chaîne servait donc **10 % d'encre de moins que le témoin**, ce qui
était une part de la mollesse relevée ; et la première version du rattrapage large,
faute de découplage, en servait 17 % de moins — l'auteur a vu le démoniaque pâlir
le jour même.

#### 35.16.8. Recoudre un trait que la RÉDUCTION a dilué

⛔ **Ce n'est pas une exception au § 35.16.6, c'est son revers.** Deux choses très
différentes s'appellent « un trait qui manque » :

- **un trait que la SOURCE n'a plus** — bois usé, encrage pauvre. Le rétablir,
  c'est dessiner à la place du graveur, et cela reste proscrit ;
- **un trait que NOTRE chaîne a dilué.** Un trait fin qui traverse un pixel en
  diagonale n'en couvre qu'une fraction : la moyenne de la réduction rend un gris
  pâle, et la courbe en S achève de le pousser au papier. Le trait est pourtant
  là, franc, dans le scan. Lui rendre son poids ne dessine rien : **on cesse
  seulement de retirer ce que le témoin porte.**

**Trois verrous, et il faut les trois :**

1. ⛔ **On ne coud qu'un CREUX** — un pixel tenu par de l'encre des DEUX côtés sur
   un même axe, à un ou deux pixels. Un trait qui s'arrête ne se prolonge jamais ;
   seul se referme ce qui était déjà tenu aux deux bouts.
2. ⛔ **Le plafond est le SCAN**, par le gris le plus sombre qu'il porte sous le
   pixel. Là où aucun trait ne passe, ce minimum est clair et rien ne bouge.
3. ⛔ **On ne dépasse pas le trait lui-même** : jamais plus que le plus faible des
   deux bords qui tiennent le creux.

⚠️ **Un premier plafond avait été pris sur la rampe NUE**, l'alpha d'avant la
courbe. Il ne peut rien faire, et c'est arithmétique : la courbe ne mordant que
sous 0,5, la rampe nue y vaut au plus 0,47. Mesuré, 1,15 % de la surface était
touchée et **zéro** trait rejoint. C'est le minimum du scan qu'il faut, parce que
c'est la RÉDUCTION, et non la courbe, qui a dilué le trait.

Effet mesuré, en fragments du dessin — deux bouts d'un même trait séparés par un
trou comptent pour deux : paralytique **604 → 559**, hémorrhoïsse **740 → 611**,
médecin **179 → 164**. De 0,09 % à 3,37 % de la surface est touchée.

#### 35.16.9. Une gravure se juge à la taille d'AFFICHAGE, jamais au double

⚠️ Corollaire de méthode, et il a coûté une demi-journée de conclusions fausses.
Toutes les planches de contrôle d'une gravure la rendent volontiers au double,
qui est la taille du FICHIER ; un trait y paraît franc qui, ramené à 200 px par le
navigateur, se moyenne en gris. C'est là que vit le « flou », et nulle part
ailleurs.

⛔ **Une planche de contrôle compose donc à la taille d'affichage, puis agrandit au
PLUS PROCHE VOISIN** — qui ne réinvente aucun pixel — et fait subir à l'image la
seconde réduction du navigateur avant de la montrer.

⚠️ Jugé au double, le paralytique paraissait avoir perdu son modelé ; rendu à ses
200 px réels, il est **plus net et plus lisible que le scan brut**, le lavis du
témoin n'étant à cette taille que du gris. La conclusion inverse avait été
annoncée, puis retirée le jour même.

#### 35.16.10. L'encre d'une gravure n'est pas celle d'un titre

⛔ Une vignette détourée ne s'affiche pas, elle DÉCOUPE : son dessin est dans la
couche alpha et **la couleur vient de la page**. Elle prenait `--cs-encre`,
c'est-à-dire le **vert des titres** — et une gravure sur bois n'a jamais été tirée
en vert. Relevé par l'auteur le 30 août 2026.

Le jeton est désormais **`--cs-gravure`** : au Clair l'encre de la famille,
`#22211e`, celle des ornements, mesurée sur la tour de Babel ruinée et déjà écrite
dans les fichiers par la chaîne ; en Cuir la valeur MESURÉE du filtre d'inversion
des ornements, `#a69f93`, de sorte qu'une gravure et un cul-de-lampe portent la
même encre sur le même sol.

⚠️ **Les fichiers, eux, étaient neutres** : écart maximal d'UN niveau sur 255 entre
les trois canaux. Une teinte qu'on croit voir dans une image se cherche d'abord
dans ce que la PAGE lui applique.

#### 35.16.11. Une photogravure se CREUSE, elle ne se recadre pas une seconde fois

L'étalement porte déjà le papier au blanc et l'encre au noir : la plage est
entière. Et pourtant le rendu reste **gris** — moyenne 143 sur le Jourdain, 127 sur
la synagogue —, parce que l'essentiel du dessin d'une photogravure vit dans les
demi-tons, non dans ses extrêmes.

⛔ Un second étalement ne rendrait donc rien, les deux bouts étant pris. C'est une
COURBE qu'il faut, et une simple puissance suffit :

| γ | moyenne (Jourdain) | blanc pur | noir pur |
|---:|---:|---:|---:|
| 1 | 142,6 | 2,45 % | 4,14 % |
| **1,4** | **122,1** | **2,45 %** | **4,33 %** |
| 1,6 | 113,8 | 2,45 % | 4,61 % |

⚠️ **Le blanc ne bouge pas et le noir gagne deux dixièmes de point** : on creuse
sans rien écrêter, ce qu'un étalement plus dur ferait perdre. À 1,6 la feuillée la
plus sombre commence à se fermer ; d'où 1,4.

⛔ **Le MASTER reste neutre** : il ne porte que l'étalement, qui est une remise à
l'échelle et non un parti. C'est de lui qu'on repartirait pour changer le ton, et
un ton cuit dans le master se composerait au suivant.

⛔ Et la courbe ne vaut QUE pour la photogravure : une gravure au trait n'a pas de
demi-tons à creuser, son alpha venant d'une rampe qui a déjà ses deux bornes
mesurées.

#### 35.16.12. DEUX BORNES pour toute illustration, quel que soit son régime

⛔ Jusqu'au 30 août 2026, seule la VIGNETTE avait des bornes : une scène valait
0,90 de la colonne et une planche 1, **deux valeurs fixes qui échappaient à toute
borne**. La colonne portait donc des gravures de 200 à 500 px, et les plus grandes
écrasaient le texte qu'elles accompagnent.

Le régime donne désormais une part NOMINALE, que deux bornes rabattent — et c'est
le seul endroit où la taille se décide :

| | part |
|---|---:|
| plancher, toute illustration | **0,36** (180 px) |
| plafond d'une VIGNETTE | 0,56 (280 px) |
| une SCÈNE cadrée | 0,78 (390 px) |
| plafond, toute illustration | **0,88** (440 px) |

⚠️ **Ce que les bornes réduisent, ce sont les EXTRÊMES.** Entre elles, la part suit
toujours la largeur imprimée par Fillion : le médecin garde ses 40 %, la barque ses
45 %. La règle du § 35.16.5 n'est pas défaite, elle est encadrée.

⚠️ **Trouvaille au passage, NON traitée** : les 32 planches du tome I sont servies à
**3,2×** leur taille d'affichage — 3,64× depuis que le plafond les rabat — là où la
règle veut le double au plus. Le défaut est ANTÉRIEUR à ces bornes et tient à leur
chaîne d'origine ; il se corrige en refabriquant ces trente-deux fichiers, ce qui
est un chantier à part.

#### 35.16.13. Le ton continu prend un rattrapage plus large, mais BRIDÉ

Le § 35.16.7 réservait le rattrapage large au TRAIT et laissait le ton continu à
σ 0,6, au motif que σ 1,6 fait bouillir la feuillée d'une photogravure. ⚠️ Seule la
valeur qui DÉBORDE avait été éprouvée : **une borne se trouve en encadrant, non en
refusant le premier essai qui rate.** La limite est entre 1,3 et 1,6.

⛔ **ET LES DEUX OSCILLATIONS SE BRIDENT.** Un rattrapage large creuse de part et
d'autre de chaque bord ; sur une masse de demi-tons ces creux butent sur zéro, et
le gain se paie en **ombres crevées**. Mesuré sur le Jourdain, le noir pur passait
de 4,07 % à 12,44 %, c'est-à-dire un huitième de la feuillée perdu.

| réglage | blanc pur | noir pur | bord vu |
|---|---:|---:|---:|
| σ 0,6 (le témoin) | 2,01 % | 4,07 % | 127,8 |
| σ 1,3 sans bride | 4,32 % | 6,89 % | 144,4 |
| **σ 1,3 · y2 4 · y3 5** | **1,34 %** | **1,53 %** | **130,1** |

⚠️ La bride reprend l'essentiel du gain de bord — il venait justement des
oscillations qu'on écrête — et le réglage retenu reste **meilleur que le témoin sur
les trois mesures à la fois**. C'est cela qui le fait choisir, non le chiffre de
bord seul. ⛔ Un réglage qui gagne sur une mesure en perdant sur deux autres n'est
pas un gain.

⛔ **Et l'on creuse les tons EN DERNIER** (§ 35.16.11). La puissance passée AVANT
le rattrapage portait le noir pur à 12,44 %, passée après à 6,89 %, bridée à
1,53 % : le rattrapage doit travailler sur une image que la puissance n'a pas
encore assombrie.

⚠️ **Une énergie de bord mesurée à travers un intermédiaire WebP est FAUSSE**, et
de huit points : le bruit de compression est du haut de spectre, que l'opérateur
compte comme du dessin. Toute mesure de netteté se prend sur du PNG.

#### 35.16.14. Une PLANCHE hors-texte se sert au double, elle aussi

⛔ Les 32 planches du tome I étaient servies à **3,64×** leur taille d'affichage —
1 273 à 1 600 px pour 440 —, parce que `detourer-gravures.mjs` les SAUTE (« une
planche ne se détoure jamais ») et les laissait telles que leur chaîne d'origine
les avait faites. C'est exactement le défaut que la règle du double existe pour
empêcher : deux réductions successives moyennent le trait en un gris mou.

**`scripts/fillion/reduire-planches.mjs`** les redérive à 880 px. Mesuré, le trait
rendu passe de **78 % à 85 %** de ce que notre propre réduction donnerait, et le
poids des 32 de **16,5 Mio à 6,1**.

⛔ **On repart du MASTER, jamais du fichier servi** : celui-ci porte déjà une
réduction et un rattrapage, et redériver depuis lui les empilerait. C'est ce à quoi
sert un master, et c'est pourquoi il reste neutre (§ 35.16.11).

⚠️ **Le ton des planches n'est PAS touché**, et c'est délibéré : leurs moyennes vont
de 119 à 205 — sujets et papier différents de ceux du tome VII —, et la puissance
du § 35.16.11 y serait posée sans avoir regardé chacune. **Question ouverte.**

⚠️ Corollaire : tout changement du plafond du § 35.16.12 oblige à rejouer ce
script, sans quoi la page composerait à une taille et le fichier serait fabriqué
pour une autre.

#### 35.16.15. L'EXPORT d'une illustration : deux exemplaires, et ce que la base en dit

Tout ce qui précède décide de ce qu'une gravure DOIT être. Cette section dit
comment elle sort de l'atelier — et chacune de ses règles a été payée.

**Deux exemplaires, et ils ne servent pas la même chose.**

| exemplaire | forme | ce qu'il porte |
|---|---|---|
| `master` | PNG, seau `bible-illustrations-master` | le tirage NEUTRE, à pleine définition |
| `web` | WebP q90, seau `bible-illustrations-web` | ce qu'on SERT, avec tous les partis |

⛔ **Le master ne porte AUCUN parti** : ni puissance de ton, ni rattrapage, ni
réduction d'affichage. Il ne porte que ce qui est une remise à l'échelle — le
recadrage et l'étalement des niveaux. C'est de lui qu'on repartira le jour où un
réglage change, et un parti cuit dedans se composerait au suivant.

⛔ **ON REDÉRIVE TOUJOURS DEPUIS LE MASTER, JAMAIS DEPUIS LE FICHIER SERVI.**
Celui-ci porte déjà une réduction et un rattrapage : repartir de lui les
EMPILE. C'est la règle qui a présidé à la reprise des 32 planches (§ 35.16.14).

**⛔ LA BASE DOIT DIRE CE QUI EST SERVI.** `bible_edition_asset_files` porte, par
exemplaire, les dimensions, le poids, l'empreinte, le profil et la version de
traitement. Remplacer un fichier sans les reporter laisse la page composer sur les
anciennes : l'épreuve du 30 août 2026 a rendu le Jourdain EN PORTRAIT, sa
proportion étant lue dans une ligne périmée. **Le report se fait au même passage
que le dépôt, jamais plus tard.**

⛔ **Et la version de traitement BOUGE dès que la chaîne bouge.** Sans quoi deux
fichiers faits différemment se donnent pour identiques, et l'on ne sait plus lequel
porte quoi. Le 30 août 2026 elle est passée de 4.0.0 à 4.3.0 en une journée, à
chaque changement de la chaîne. ⚠️ Les masters des planches sont restés en 1.2.0 :
c'est juste, on ne les a pas refaits — **une version ne se hausse que sur ce qu'on
a réellement rejoué.**

**⚠️ LE SEAU POSE `no-cache`, LE NAVIGATEUR GARDE QUAND MÊME.** Remplacer un fichier
à la même adresse laisse un lecteur sur l'ancien tant qu'il n'a pas rechargé de
force. Pour juger sur épreuve, un profil de navigateur vidé ; pour PROUVER que le
seau sert bien les octets neufs, comparer le `content-length` de la réponse au
`byte_size` de la base. Deux nombres égaux, et la question est close.

**⛔ UN EXPORT NE SE CROIT PAS SUR PAROLE : ON INTERROGE LE VRAI CHARGEUR.** Trouver
les lignes en base ne prouve rien sur ce que le lecteur voit — c'est le défaut des
« Opuscules », dont les neuf tests passaient pendant que la section restait
invisible. On appelle donc la fonction que la page appelle.

⚠️ **Et le contrôle lui-même se contrôle, PAR UN TÉMOIN dont on sait la réponse.**
Le 30 août 2026, un contrôle des planches du Pentateuque a rendu ZÉRO illustration,
et j'ai annoncé qu'on ne les voyait pas. Il passait un identifiant de créneau qui
n'existe pas dans `versets_canon`, et rendait donc zéro partout — **y compris sur
Marc, dont les gravures sont en ligne.** C'est ce témoin, et lui seul, qui a
démasqué le contrôle. Un contrôle sans témoin ne se contrôle pas lui-même.

⚠️ **Rejouer la chaîne quand une mesure d'AFFICHAGE change.** La taille servie vaut
le double de la taille affichée (§ 35.16.5) : toucher aux bornes du § 35.16.12 sans
refabriquer laisse la page composer à une taille et les fichiers faits pour une
autre. C'est exactement le défaut que ces bornes existent pour empêcher.

⚠️ **Ce qui n'est PAS exporté.** Les feuillets JP2 et le PDF de l'archive restent
hors du dépôt, dans `tmp/` : ce sont des sources, l'archive en fait foi, et le
dépôt n'a pas à porter des gigaoctets qu'un déploiement redéploierait. Voir la
règle des fac-similés de la Bible 899, qui a coûté 1,89 Go et 404 sur 85 % des
folios avant d'être posée.

⛔ **UN OBJET DÉCLARÉ ESSAI TECHNIQUE NE SE SERT PAS AU LECTEUR, et il ne SE
SERVAIT PAS.** Les 43 illustrations de la famille Fillion portaient toutes
`metadata.test_only = true`, `validation_status = 'review'` et
`requires_review = true` — et `is_public = true`. J'en ai conclu qu'elles étaient
servies, et que la contradiction attendait un arbitrage. **C'était faux, et le
§ 35.16.21 dit comment on l'a su** : `is_public` est nécessaire et ne suffit pas,
`bible_technical_publication_allowed` refusant précisément un `test_only`. Il n'y
avait pas de contradiction : le drapeau faisait son office, et aucune gravure
n'atteignait personne.

#### 35.16.16. Le papier se nettoie CHIRURGICALEMENT

« Les illustrations grandes de la Genèse sont un peu crasseuses » (l'auteur,
30 août 2026). Elles l'étaient, et cela se mesure : les 32 planches du tome I
viennent d'une chaîne qui ne posait **aucun étalement**. Leur pic de papier
plafonne à 225-245 au lieu de 255, il n'est pas le MÊME d'une planche à l'autre, et
— c'est le fait qui explique l'impression — **il est plus sombre que le
passe-partout du site**, qui vaut 237. Un tirage plus sombre que son montage se lit
comme sale, quelle que soit la qualité du dessin.

**⛔ AUCUNE DES DEUX BORNES NE SUFFIT SEULE.** L'étalement au PIC ne perd rien mais
laisse la moucheture et l'AGGRAVE même : le grain du papier est SOUS le pic, et il
s'en écarte à mesure que le pic monte au blanc. Le PLANCHER — celui de la rampe
alpha (§ 35.16.1), la demi-largeur du pic prise de son côté CLAIR — nettoie
parfaitement, et **mange le trait clair** : 11 % de l'encre en moyenne, jusqu'à 17 %
sur les gravures au trait FIN, dont les traits minces ont justement des valeurs
claires.

⛔ **LA SORTIE EST DANS LE VOISINAGE, NON DANS LE NIVEAU.** Un trait clair est
TOUJOURS bordé de trait plus sombre ; le papier ouvert, jamais. On part donc de
l'étalement au pic, et l'on ne pousse au blanc que les pixels clairs **sans aucune
encre alentour** — trois pixels suffisent. Le plancher garde son office, mais comme
CRITÈRE : il dit ce qui est du papier, il ne dit pas ce qu'on blanchit.

Mesuré sur les huit planches extrêmes, les deux critères ensemble :

| | moucheture du papier | encre gardée |
|---|---:|---:|
| plancher DUR | 0,77 | ×0,87 |
| plancher plus haut | 0,99 | ×0,91 |
| **CHIRURGICAL** | **0,47** | **×0,95** |

⛔ **Il gagne sur les DEUX à la fois, et c'est cela qui le choisit** — la même règle
qu'au § 35.16.13. Une planche parfaitement propre dont le trait a fondu n'est pas un
gain. Sur les 32 : moucheture moyenne 1,12 contre 4,4 à 7,4 avant traitement, encre
à ×0,96 du témoin, de ×0,89 à ×1,03.

⛔ **ET C'EST LE TÉMOIN QUI L'A DIT, PAS L'ŒIL.** Le plancher dur a été posé, servi,
et contrôlé à l'œil sur les quatre cas extrêmes — la plus sale, la plus claire, la
photographique, la composite : le dessin y paraissait entier dans les quatre. Il
manquait pourtant un dixième de l'encre. **Une perte diffuse et proportionnelle ne
se voit pas** ; elle se mesure en comparant la densité d'encre du fichier servi à
celle du master réduit à la même taille, sur une échelle neutre.

⚠️ Corollaire, et il vaut au delà des images : **l'œil tranche ce qui se voit — une
teinte, un empâtement, un blanc crevé — et il ne tranche pas ce qui est
PROPORTIONNEL.** Les deux contrôles sont nécessaires, et aucun ne remplace l'autre.

⚠️ **Deux compteurs se sont trompés en chemin**, et pour la même raison : ils
mêlaient le dessin au papier. Un compteur de « clairs perdus » annonçait jusqu'à
61 % de perte là où l'œil n'en voyait aucune, et un drapeau de « planche lavée » en
signalait onze sur trente-deux, alors qu'il mesurait le GENRE de la gravure — une
gravure au trait fin a une encre claire parce que ses traits sont MINCES, et la
noircir serait une falsification (§ 35.16.6).

⚠️ **Le blanc de papier est une remise à l'ÉCHELLE, non un parti** : c'est ce qui
l'autorise là où la puissance de ton du § 35.16.11 reste, elle, en attente. La
distinction est celle du master (§ 35.16.15) : un master porte le recadrage et
l'étalement, jamais un choix.

⚠️ **Les masters des planches du tome I ne portent PAS cet étalement**, à la
différence de ceux du tome VII, et l'on ne peut pas le leur donner : les feuillets
JP2 de ce tome ne sont pas sur le disque. Dette connue ; le script étant
déterministe, une redérivation le repose à l'identique.

⚠️ **Un contrôle d'octets pris à l'instant du dépôt lit le CACHE DE BORD.** La
vérification du § 35.16.15 a signalé une discordance sur une planche — 282 410
octets en base contre 372 446 servis — qui n'existait pas : l'objet, relu par
l'API de stockage, concordait au sha256 près. Le contrôle se refait **après** le
dépôt, et une discordance isolée se confirme sur l'objet avant d'être crue.

#### 35.16.17. LE RÉGIME EST ÉCRIT DEUX FOIS, ET LES DEUX ONT DIVERGÉ

⛔ **Une règle recopiée dans deux fichiers ne reste la même que par accident, et
c’est vrai d’une RÈGLE comme d’une mesure.** Le § 35.16.4 a fait lire la légende
imprimée à la chaîne d’image le 30 août 2026. La page, elle, décidait encore sur la
seule largeur, et l’a fait un jour de plus.

Conséquence, mesurée le 31 août : **dix-neuf gravures larges AU TRAIT** — le massacre
des Innocents d’après un ivoire du Vᵉ siècle, Jésus séparant les brebis et les boucs
d’après un bas-relief, le plan cavalier du temple d’Hérode — étaient FABRIQUÉES
détourées et COMPOSÉES comme des photogravures. Deux effets, tous deux invisibles au
dépôt :

- leur encre ne passait plus par `--cs-gravure`, la page les rendant en `<img>` au
  lieu d’un masque : elles restaient **noires sur le cuir** ;
- elles étaient servies à **1,43 fois** leur taille d’affichage au lieu de deux.

⚠️ **Rien ne pouvait le dire.** Les deux écritures sont justes chacune de son côté,
les types passent, les tests passent, et relire l’une ou l’autre ne montre rien.
`app/lib/partIllustration.test.ts` tenait déjà les BORNES accordées ; il tient
désormais la RÈGLE, motif de reconnaissance compris, **tiré de la source du script**
et non recopié. Éprouvée dans les deux sens : la garde devient rouge sur le motif
comme sur le seuil, et revient au vert la divergence défaite.

#### 35.16.18. LA PART SUIT LA LARGEUR IMPRIMÉE, ET LE RÉGIME NE DÉCIDE QUE DU DÉTOURAGE

⛔ **Deux parts FIXES restaient, et la seconde a survécu à la correction de la
première.** Le § 35.16.13 a retiré la part fixe des vignettes le 30 août, parce
qu’elle aplatissait un rapport de 1 à 3 et jetait jusqu’à 4,7 fois la résolution
linéaire. `PART_AU_FIL` faisait exactement la même chose au même endroit : 78 % de
la colonne pour toute photogravure, quand Fillion les imprime de **69 à 90 %**.

Elle est retirée. **La part suit la largeur imprimée pour tout, bornée par le
plancher et le plafond** ; seule une planche hors-texte prend le plafond sans
regarder sa découpe, celle-ci étant la page entière du volume et ne disant donc
rien. Le régime ne décide plus que du DÉTOURAGE, ce que le § 35.16.5 énonçait déjà
sans que le code le suive.

⛔ **Et le PLAFOND DE VIGNETTE suppose une gravure qui TIENT DANS UNE COLONNE**,
comme son commentaire le dit. Les dix-neuf larges au trait redevenant des vignettes,
il les aurait plafonnées à 56 % : un plan du temple imprimé sur 88 % se serait
retrouvé plus petit que la photogravure d’à côté, imprimée aussi large. Il ne mord
plus au-delà du seuil des deux colonnes.

#### 35.16.19. LA LÉGENDE SE TROMPE TROIS FOIS, ET LE RÉGIME SE FORCE PAR LA DONNÉE

Le § 35.16.4 annonçait que les gravures sans mention de procédé « retombent au
trait, ce qui est le parti le moins coûteux ». Le contrôle intégral du 31 août 2026
a regardé les cent soixante-seize une à une, et le parti coûte : **trois gravures
sont des demi-teintes que la règle détourait.**

| gravure | légende imprimée | pourquoi la règle échoue |
|---|---|---|
| Intérieur de l’église la Nativité | ne nomme qu’un lieu | pas de mention de procédé |
| Cour d’une maison de l’Orient | ne nomme qu’un lieu | pas de mention de procédé |
| Olivier de Gethsémani | « (D’après une photographie.) » | **58 % de large, sous le seuil de 60** |

⚠️ La troisième est la plus instructive : sa légende est parfaite, et c’est la
LARGEUR qui la manque, de deux points. La largeur est un bon indice du procédé —
Fillion ne donne la pleine mesure qu’à ses vues — et elle n’en est pas la preuve.

⛔ **Détourer une demi-teinte SE VOIT** : les tons s’écrasent, les clairs
blanchissent, la trame de points crève, et le bord rectangulaire de la découpe
apparaît. C’est l’inverse du pari du § 35.16.4, et il faut le corriger dans l’autre
sens : un dessin cadré passe inaperçu, une photographie détourée saute aux yeux.

**Le régime se force donc dans `metadata.regime`**, lu par `regimeIllustration` et
par la chaîne. C’est le jour que le commentaire du type annonçait depuis l’origine :
« la colonne viendra le jour où l’on voudra forcer un cas contre la mesure. » Le
forçage porte sa provenance et son motif ; une valeur inconnue est ignorée, une
coquille dans un champ libre ne devant pas changer la composition d’une page.

⚠️ **`v_bible_edition_assets` n’exposait pas `metadata`** : le forçage n’aurait
jamais atteint la page, qui lit les actifs par cette vue et par elle seule.
Exactement le piège de `metadata.presentation` sur la vue des blocs de corps
(§ 35.4). **Une métadonnée doit être EXPOSÉE pour être lue, et rien ne signale
qu’elle ne l’est pas.**

#### 35.16.20. LA MASSE DU PIC DE PAPIER — la mesure qui désigne, sans trancher

Le § 35.16.4 dit qu’aucune mesure de pixel ne sépare la demi-teinte du bois gravé,
et nomme les deux qui avaient échoué : la trame au bord du trait, et la part que le
détourage rend transparente. Une troisième les sépare, et elle est simple.

**Une gravure au trait est de l’encre POSÉE SUR DU PAPIER** : le pic clair de son
histogramme est le papier lui-même, un plateau massif. **Une demi-teinte est une
TRAME qui couvre tout le champ**, y compris les clairs : son pic se disperse. On
mesure donc la part de la surface qui tient à deux niveaux du pic. Relevé sur les
176 gravures du tome VII :

| famille | masse du pic |
|---|---|
| demi-teintes | **2,7 à 9,2 %** |
| bois gravés | **10,4 à 44 %** |

Elle a désigné exactement les trois que la légende manquait, et aucune autre.

⛔ **Elle ne remplace pas la légende pour autant, et l’écart dit pourquoi : un
point.** Un corpus qui grandit le comblera. Elle sert à savoir OÙ REGARDER, la
décision restant à l’œil et à la donnée. ⚠️ Le PIC seul, lui, ne sépare rien : les
deux familles s’étendent de 148 à 205.

⚠️ **Ni les coins ni la confrontation au scan ne mesurent un voile** sur un fichier
détouré : il est ROGNÉ sur son dessin, l’encre touche donc souvent le bord, et les
deux géométries ne coïncident plus. Deux mesures fausses avant la bonne — la
première donnait 30 et 19 aux gravures de Marc, qui sont en ligne et contrôlées à
l’œil depuis un mois. **Un voile est PLAT** : il se lit dans le seul histogramme
d’alpha, à la plus forte concentration sur une valeur unique entre 3 et 40. Mesurée
ainsi, elle vaut 0,53 % en médiane et ne dépasse 3 % que trois fois, à un alpha de
3 à 7 : il n’y a **aucun voile** dans le corpus.
#### 35.16.21. RIEN N'ATTEIGNAIT LE LECTEUR, ET LA CLÉ DE SERVICE LE CACHAIT

⛔ **UN CONTRÔLE MENÉ AVEC LA CLÉ DE SERVICE NE DIT RIEN DE CE QUE LE LECTEUR
REÇOIT.** Le § 35.16.15 pose déjà la règle pour le RENDU ; elle vaut un cran plus
haut, pour la PUBLICATION, et je l'ai manquée là. Relevé le 31 août 2026, après
un audit intégral mené la veille : **aucune illustration de Fillion n'a jamais
atteint un lecteur**, et son commentaire non plus.

La chaîne des politiques tombait sur un seul fait, deux crans au-dessus de ce
qu'on regardait. Les **sept `bible_text_sources` de la famille** portaient
`metadata.test_only = true`, et leurs codes le disaient sans détour :
`fillion-t01-pentateuch-test`, `fillion-t07-gospels-acts-test`,
`fillion-t02-joshua-test`. Elles étaient donc invisibles ; sans elles
`bible_edition_member_sources` l'était aussi ; et les politiques des
illustrations comme des blocs de corps ont toutes besoin de lire un
`member_source`.

⚠️ **LA RLS S'APPLIQUE DANS LE SOUS-SELECT D'UNE POLITIQUE.** Une table que
l'appelant ne peut pas lire rend le `EXISTS` vide, et la politique échoue **sans
rien dire** : aucune erreur, zéro ligne, et le rôle de service qui voit tout.
C'est ce qui rend ce défaut si difficile à voir, et c'est pourquoi il faut
l'éprouver au lieu de le lire.

⚠️ **Et la charte le prescrivait déjà**, sous « Tout périmètre déclaré privé ou
`test_only` reçoit un test RLS réel » : *exécuter une lecture sous le rôle `anon`
sur les sources, segments, blocs, notes, assets et fichiers concernés.* Je ne
l'avais pas fait, et j'ai rapporté à l'auteur une contradiction là où il y avait
une porte fermée.

**La bonne épreuve, et elle tient en deux gestes.** D'abord compter table par
table ce que voit la CLÉ ANONYME contre ce que voit le service — un écart nomme
le maillon. Puis appeler le VRAI chargeur (`loadBibleEditionChapter`) avec la clé
anonyme, sur des chapitres dont on connaît la réponse. ⛔ Un compteur ne suffit
pas : un `count` sur une vue peut mentir là où une lecture de lignes dit vrai.

⚠️ **Et le relevé se PAGINE.** `versets_canon` compte 1 533 versets pour la
Genèse, 1 151 pour Luc ; PostgREST en rend mille. Un balayage non paginé perd les
derniers chapitres de chaque livre **sans rien dire**, et déclare orphelines les
vingt et une gravures qui s'y trouvent. C'est le même piège que sur les tables de
notes (§ 13.6), et il n'est pas réservé à celles-là.

**Ouverture du 31 août 2026** (décision de l'auteur). Le drapeau levé sur les sept
sources, le lecteur reçoit : **208 illustrations sur 99 chapitres**, 5 431 blocs
de commentaire, 37 notes de verset, sur ACT DEU EXO GEN JHN JOS LEV LUK MAT MRK
NUM. Les masters restent privés, et le seau refuse leur adresse publique.

⚠️ **Les deux affirmations posées ne sont pas de même nature, et le schéma le
sait.** Le FICHIER passe en `validated` : c'est technique, et c'est vérifié. Un
ACTIF reste en `review` et passe par la voie que la base ouvre pour cela,
`technical_publication_override` avec `editorial_validation_claimed = false`. Les
ancres et les légendes sont le travail d'un autre ; on n'écrit pas qu'on a validé
ce qu'on n'a pas relu (§ 11.7).

⚠️ Une garde SQL impose l'ordre : **le dérivé web d'abord, l'actif ensuite.** Bien
vu — une illustration déclarée publique sans fichier servi serait une promesse en
l'air. Et la base refuse un `UPDATE` sans `WHERE` : la portée se NOMME, par le
code de la famille et non par un identifiant recopié.

⚠️ Le `source_code` garde son suffixe `-test`, et c'est délibéré : c'est
l'identifiant de la source, le renommer déplacerait ce à quoi elle est jointe. Il
ne décidait de rien ; seul le drapeau décidait.
#### 35.16.22. DEUX POLITIQUES PEUVENT EXIGER DU MÊME DRAPEAU DES VALEURS OPPOSÉES

⛔ Le § 35.16.21 a levé `test_only` sur les sept sources, et les gravures sont
parties. **Quelques heures plus tard, un livre s’annonçait disponible et
n’ouvrait sur aucun texte.**

`bible_canonical_alignments_public_read` ouvre une seconde branche pour les
alignements encore en REVUE : elle les sert au lecteur quand l’édition est
publiée techniquement, validation éditoriale non revendiquée. L’intention est la
bonne, et c’est celle du § 35.16.21. Mais elle exigeait **en outre**
`metadata->>'test_only' = 'true'` sur la source — quand
`bible_technical_publication_allowed`, dont dépendent les illustrations, les
blocs de corps et les sources elles-mêmes, refuse précisément un `test_only`.

**Aucun état ne satisfaisait les deux.** Le drapeau posé, rien ne paraissait ; le
drapeau retiré, les alignements en revue tombaient. La contradiction dormait tant
que la porte du dessus était fermée : c’est l’ouverture qui l’a réveillée.

⚠️ **C’est l’ÉCART ENTRE LES LIVRES qui a nommé la cause**, et c’est la bonne
manière de chercher. Les Évangiles passaient, le Pentateuque et Josué tombaient.
Les premiers portent 4 767 alignements **vérifiés**, les seconds 6 539 par membre
**en revue**. Un même traitement, deux résultats : la différence est dans la
donnée, et il suffit alors de la lire.

⚠️ **Sans alignement canonique, la page rend ses rangées et n’a rien à y
mettre** : le chapitre a ses créneaux, la liste des livres les déclare
disponibles, et le texte manque. Un livre disponible et VIDE est donc le symptôme
d’un défaut d’ALIGNEMENT, non de texte — le texte, lui, était lisible.

**La règle.** Avant de changer un drapeau de publication, chercher **toutes** les
politiques qui le lisent, et dans quel SENS :

```sql
select c.relname, p.polname, pg_get_expr(p.polqual, p.polrelid)
from pg_policy p join pg_class c on c.oid = p.polrelid
where pg_get_expr(p.polqual, p.polrelid) like '%<le drapeau>%';
```

Sur `test_only`, la requête rend trois lignes : deux le refusent, une l’exigeait.
⛔ Une seule suffit pour qu’aucun état ne soit tenable, et rien ne le signale —
ni erreur, ni ligne manquante, seulement du texte qui n’arrive pas.
#### 35.16.23. LE RÉGIME ET LA PART SONT ÉCRITS PAR LA CHAÎNE, LUS PAR LA PAGE (2026-09-03)

**Le constat.** Le corpus portait 233 illustrations, non plus 43, et la page de
lecture DÉRIVAIT encore le régime de composition et la part de colonne à chaque
affichage, à partir de trois champs de l'actif : le genre (`asset_kind`), la
découpe (`source_crop_box`) et la légende imprimée. Cela a tenu tant qu'une seule
chaîne remplissait ces champs. Le lot de 1 Samuel (25 actifs, chaîne de GPT,
31 août 2026) posait `plate` sur vingt-trois vignettes — le script de charge
rangeait en planche tout ce qui n'était ni ornement ni plan —, gardait la largeur
imprimée dans `metadata.source.crop_width_ratio_of_page`, où rien ne la lisait,
et portait une catégorisation à dix étiquettes libres (`metadata.composition_regime` :
« vignette-naturaliste-en-colonne », « figure-en-ligne-large », « cul-de-lampe-decoratif »…)
que rien ne lisait non plus. La page rangeait donc les vingt-trois en hors-texte :
une lyre sur une monnaie, imprimée à un cinquième de page, s'affichait à la largeur
de son fichier, soit le double de la taille prévue, dans un passe-partout, et,
détourée mais rendue en image opaque, disparaissait sur le Cuir. Sur les 208
gravures des Évangiles et du Pentateuque, la règle était respectée à quelques
pixels près : ⚠️ **le hasard des tailles ne venait pas de la règle, mais de ce
qu'elle se recalculait à chaque lecture sur des champs que chaque lot remplit à
sa façon.**

**La règle, désormais.** `bible_edition_assets` porte deux colonnes NON NULLES et
contraintes par la base : `regime`, parmi `vignette`, `au-fil` et `hors-texte`, et
`part_colonne`, la part du bloc de lecture (500 px) que la gravure occupe, de 0,36
à 0,88. ⛔ **C'est la chaîne qui les écrit, une fois, et la page qui les lit.**

- la règle vit dans **`scripts/fillion/regime-gravure.mjs`**, et nulle part
  ailleurs : la largeur imprimée (boîte normalisée, ou bornes absolues et largeur
  de page, ou rapport rangé dans les métadonnées de 1 Samuel), la légende de
  Fillion (« photographie » ou non), le régime forcé de `metadata.regime`, et les
  bornes 0,36 · 0,56 · 0,88. Vitest l'éprouve (`regime-gravure.test.mjs`) ;
- un actif **qui a déjà un fichier servi** prend le régime que ce fichier RÉALISE,
  lu sur son profil de traitement : détouré → vignette (masque, encre reposée au
  rendu), cadré → au-fil (opaque, papier gardé), planche → hors-texte. Composer
  autrement que le fichier n'est fabriqué rend un aplat d'encre ou un rectangle de
  papier. Deux photogravures de 1 Samuel sans « photographie » dans leur légende
  n'existent que par leur fichier ;
- un actif **nouveau** prend la règle de la largeur imprimée et de la légende ;
  les scripts de charge l'obtiennent par `regimeEtPart(...)` et l'insèrent avec
  l'actif. ⛔ **Un script qui l'oublie échoue à l'insertion, et c'est voulu** ;
- `scripts/fillion/inscrire-regime-gravures.mjs` recalcule les deux valeurs par la
  règle et dit où la base s'en écarte (`--ecrire` pour inscrire). Contrôle du
  3 septembre 2026 : 233 actifs, 0 écart ;
- la page lit les deux colonnes par `regimeEtPartDeLActif` (`app/lib/bibleEdition.ts`)
  et **s'arrête** sur un actif qui ne les porte pas, en le nommant. ⛔ Aucune
  borne, aucun seuil de largeur, aucune lecture de légende ne doit reparaître dans
  `app/` ; la chaîne d'image (`detourer-gravures.mjs`) lit les mêmes colonnes, si
  bien qu'un fichier ne peut plus être fabriqué pour un régime et composé pour un
  autre ;
- ⛔ **toute chaîne d'import, GPT compris, écrit ces deux colonnes dans CE
  vocabulaire.** `metadata.composition_regime` et `metadata.regime` ne sont plus
  lus par la page ; le second reste une consigne pour la chaîne quand la légende
  ne dit pas le procédé.

**Ce que la taille n'est pas.** Une catégorie de CONTENU (objet, scène, vue, plan)
ne décide pas de la taille : c'est Fillion qui l'a décidée, par la largeur qu'il a
donnée à chaque gravure — le boisseau à un cinquième de page, la scène de deuil à
plus de la moitié. Une classe par sujet aplatirait ce rapport, et c'est ce que le
premier jet à 30 % faisait (§ 35.16.5).

**Corrigé le même jour.** Le genre des vingt-trois « planches » de 1 Samuel est
`illustration` ; leurs régimes et parts sont écrits ; la migration
`20260903213000_bible_edition_assets_regime_part_colonne` et son contrôle
(`supabase/controles/`) les portent, et la vue `v_bible_edition_assets` expose les
deux colonnes.

⚠️ **Décision en attente de l'auteur** : si, sur Matthieu ou Luc, les tailles
paraissent encore hasardeuses, ce n'est plus un défaut de données mais la règle
continue elle-même (deux gravures voisines à 59 et 61 % de page sortent à 56 et
61 % de colonne). Cinq paliers fixes — 36, 45, 56, 70, 88 % — rendraient les
tailles intentionnelles en gardant l'ordre de Fillion, au prix d'une refabrication
des fichiers dont le palier monte. À juger sur 1 Samuel corrigé.

### 35.17. L'ÉCHELLE DES BLANCS — un blanc ne dit que son RAPPORT aux autres

Mesurée dans la page rendue le 30 août 2026, la hiérarchie de la Bible commentée ne se lisait pas, et c'est le BLANC qui manquait à la dire. Les six rangs de titre tenaient tous entre 33 et 56 pixels, et l'ordre y était ROMPU deux fois : la sous-section (T4) recevait 33 px, c'est-à-dire exactement autant qu'un simple changement d'unité de commentaire et moins que la péricope (T6) qu'elle domine ; « Première partie », la plus haute division du livre, en recevait 53, moins que « Livre I » qui lui est subordonné. Six rangs dans un mouchoir, et deux inversés.

⛔ **Le blanc d'un rang se NOMME, il ne se somme pas.** Chaque valeur naissait de la rencontre accidentelle de deux marges, celle du titre et celle du bloc qui le précède, si bien qu'un même rang s'ouvrait de deux façons selon ce qui tombait devant lui : un titre de péricope recevait 46 px après une introduction et 33 après une rangée de verset. L'échelle vit désormais dans des jetons (`--cs-blanc-*`), la marge de ce qui précède un titre se ferme, et le rang décide seul.

**Elle se compte en LIGNES de l'apparat** (16,25 px), seule unité que la page donne à l'œil, et progresse d'environ un quart à chaque rang.

| ce qui s'ouvre | blanc |
|---|---:|
| deux versets d'un même passage | 8 px |
| la COUTURE — du commentaire aux versets qu'il commente | 9 px |
| d'une unité de commentaire à la suivante | 41 px |
| une péricope | 64 px |
| un paragraphe, un chapitre | 80 px |
| une sous-section | 100 px |
| une section | 124 px |
| une partie | 152 px |
| le livre | 184 px |

⛔ **Ne pas resserrer l'échelle** : deux rangs qui diffèrent de moins d'un cinquième ne se distinguent pas, et c'est ainsi qu'elle s'était aplatie. ⚠️ Le seul écart franc est celui qui sépare la coupure d'unité du premier rang de titre, 41 contre 64, et il est voulu : changer d'unité n'est pas changer de péricope, et les deux valaient 33 px l'un comme l'autre.

⛔ **LA COUTURE ET LA COUPURE NE VALENT PAS LE MÊME CHIFFRE** (§ 35.12), et leur RAPPORT compte plus que leurs valeurs. Elles valaient 12 et 33, soit 2,75, dans une page où tout est du même sérif justifié au même corps et où 33 px ne font que deux lignes : la coupure ne se lisait pas, et le lecteur n'avait aucun moyen de voir où un commentaire finissait et où le suivant commençait. Elles valent 9 et 41, soit 4,5. La couture se ferme à peine au-dessus du blanc qui sépare deux versets : le commentaire et ses versets sont une seule unité de lecture, et il n'y a pas de raison qu'un change de nature s'aère plus qu'un change de verset.

#### 35.17.1. Un bloc qui PORTE un titre s'ouvre au rang de ce titre

Une péricope se dit de deux façons chez Fillion : par un bloc `titre_pericope`, qui EST un titre, et par un `introduction_titree`, bloc d'information qui porte son titre au-dedans. Le premier prenait le blanc de son rang, le second celui d'un simple changement d'unité — 64 px contre 41 pour la même chose. **268 blocs du corpus sont dans ce cas**, dont deux dans le seul Matthieu 5.

⚠️ Le titre porté n'a pas de marge propre, le bloc l'espaçant déjà : c'est donc au BLOC de prendre le rang, et la règle ne fait que lui dire lequel.

⛔ **Un bloc de TITRE en est exclu, et ce n'est pas une subtilité.** Il porte lui aussi son intitulé, et l'intitulé y répète la classe de rang du bloc : la règle l'attrapait donc, avec un rang qui se trouvait juste. Elle n'en était pas moins fausse — sa spécificité écrasait EN SILENCE la réduction mobile des rangs hauts, et « Première partie » gardait ses 152 px sur un téléphone. Un bloc de titre porte son rang dans ses propres classes ; il n'a pas besoin qu'on le lui dise.

#### 35.17.2. Deux titres qui se suivent ne s'ouvrent pas deux fois

Une pile de titres est UNE composition d'ouverture : le premier porte le blanc de son rang, les suivants s'y rangent. Sans cette règle, un chapitre qui ouvre à la fois une partie, une section et un paragraphe — c'est le cas de la Genèse 2 — empilait 356 px de blanc pur avant son premier mot. ⚠️ Un sous-titre y compte comme un titre : il est le chapeau de celui qu'il continue, et le rang qui le suit ne recommence pas davantage après lui.

⚠️ **Et le PREMIER bloc d'un chapitre n'a rien à séparer.** Le blanc d'un rang dit qu'on quitte ce qui précède ; en tête de chapitre il n'y a rien à quitter, et la barre de navigation porte déjà son filet. Sans cette exception, Matthieu 5 s'ouvrait sur 120 px de vide.

#### 35.17.3. Une règle de blanc porte sur TROIS surfaces, et l'oublier ne se voit pas

Corollaire de la rectification du § 35.12, et il vaut pour toute règle de voisinage. La Bible commentée se rend de trois façons — pleine mesure, mesure étroite, lecture en regard — et les trois n'ont pas le même balisage : en pleine mesure un bloc vit dans une enveloppe d'axe, en mesure étroite il redevient le frère direct d'une rangée de verset, en lecture en regard il vit dans une boîte de créneau où il n'a ni axe ni rangée pour voisins.

⛔ **La couture et la coupure ne portaient donc que sur la pleine mesure.** Sur un téléphone, c'est-à-dire là où l'on en a le plus besoin puisque la colonne y est la plus étroite, rien ne faisait voir un groupe ; il en allait de même de la lecture en regard. Rien ne le signalait : ni les types, ni les tests, ni la relecture de la feuille. **Une règle de blanc s'écrit pour les trois surfaces, ou elle n'est écrite pour aucune.**

⚠️ L'échelle se resserre en revanche sur un TÉLÉPHONE, où elle se compte en écrans et non en lignes : les rangs hauts y prendraient jusqu'au quart d'un écran pour un blanc qu'on traverse au pouce. L'ORDRE des rangs, lui, ne bouge pas — c'est lui qui porte la hiérarchie, non les valeurs.

#### 35.17.4. Une PIÈCE liminaire garde une échelle plus serrée

Ses titres coiffent des sections de prose qui se suivent page après page — l'introduction « Ancien Testament » en range dix dans un seul bloc, avec onze paragraphes et quatre listes —, et non des divisions du livre. L'échelle du fil y ouvrirait un demi-écran entre deux paragraphes, et jusqu'à cent pixels avant « 3. Livres prophétiques (17 livres) », qui est le sous-titre d'une liste. ⛔ L'intertitre DIVISÉ y garde ses quatre rem : c'est lui qui sépare deux sections d'une pièce, et la règle resserrée, plus spécifique, les lui reprendrait en silence.

#### 35.17.5. Un bloc de SUITE ne rouvre pas le blanc de son rang

⛔ **Deux blocs d’information de même rang et de même nature qui se suivent, le second sans intitulé, sont deux PARAGRAPHES d’un même développement, et se séparent du blanc d’un paragraphe** (relevé de l’auteur, 3 septembre 2026, sur l’introduction de la Genèse : « les blancs entre les paragraphes de même style sont trop importants »). La donnée coupe une introduction ou un commentaire en autant de blocs que de paragraphes ; chacun rouvrait le blanc de son rang, deux rem et quart en regard, près de trois en lecture simple, là où deux paragraphes composés dans un même bloc ne s’écartent que d’un quart de rem, le blanc que l’auteur a fixé le 29 août pour deux paragraphes d’un même style. Mesuré dans le corpus public : mille cinq cents paires de commentaires de péricope, cent cinquante de commentaires de verset, soixante-dix de paragraphes d’introduction. La suite se reconnaît à la donnée (`estSuiteDuBloc` : même rang, même nature après résolution du registre, aucun intitulé), jamais au texte, et se porte sur le bloc (`data-suite`) ; la feuille lui retire sa marge haute et à son prédécesseur sa marge basse, sur les trois surfaces, et il reste le blanc du dernier paragraphe. Un intitulé, une manchette, une gravure entre deux blocs rompent la suite : ils rompent déjà le développement.

⚠️ **Le blanc sous une sous-section vaut 0,6 rem, non 0,4, et la fratrie ne le donnait pas.** Sur la grille de l’axe, le titre et le bloc qui le porte reçoivent tous deux la marge basse du rang, et rien n’y fusionne ; dans la fratrie de la mesure étroite et de la lecture en regard, tout fusionne, et le blanc tombait à 0,2 rem (relevé de l’auteur sous « Les sources de la Genèse » : « il faut plus de blanc après ce style »). La fratrie reçoit désormais 0,6 rem, et les deux surfaces se valent.

### 35.18. L’appareil en regard garde la MESURE de la lecture simple

⛔ **En lecture Latin-français, un bloc de l’appareil sort des colonnes, mais il ne prend pas toute leur largeur** (décision de l’auteur, 3 septembre 2026, revenant sur celle du 20 août : « toute la largeur, c’est trop, pas naturel pour un corps de texte ; il faut, pour ces styles-là, réduire la largeur maximale »). Le 20 août, on avait sorti introductions, commentaires et notices des colonnes pour qu’une colonne vide ne leur fasse pas face ; on les avait du même geste étalés sur les 52 rem des deux colonnes. Mesuré sur un écran de 2 560 pixels, racine 22 : le paragraphe d’introduction de la Genèse y faisait cent vingt-quatre signes par ligne, contre quatre-vingt-trois dans la lecture simple, et tout l’appareil se composait sur cette largeur, titres et gravures compris.

L’appareil a d’abord pris la mesure du bloc de lecture simple, 31,25 rem, centrée sur la colonne ; devant le résultat, l’auteur a tranché le même jour : « les versets dépassent trop ; élargir le corps du texte, et réduire la largeur des versets bibliques, harmonieusement ». La règle est celle de la lecture simple, où le retrait désigne le verset. Les versets prennent la mesure de la PAGE, 38,75 rem, au lieu des 52 rem des œuvres, et se posent sur l’axe du texte, celui du titre du chapitre. L’appareil est bordé par le FER DU TEXTE des versets : la mesure de la page moins, de chaque côté, la colonne du numéro et sa gouttière, soit 34,9 rem. Les numéros pendent dans la marge de l’appareil, à gauche comme à droite, et la page n’a qu’un fer. Mesuré sur un écran de 2 560 pixels : les versets passent de 1 144 à 853 pixels, l’appareil de 688 à 768, et le fer de l’appareil tombe sur celui du texte français au pixel près. Une gravure y retrouve sa taille, sa part se calculant sur son conteneur. La mesure se pose sur le bloc lui-même, qui reste frère de ses voisins : les règles de voisinage des titres — le blanc sous un titre qui se referme, deux titres qui ne s’ouvrent pas deux fois — portent sur des frères, et une enveloppe posée autour de chaque bloc les coupait en silence (relevé de l’auteur le soir même : 1,5 rem sous un titre de péricope au lieu de 0,5, 4 rem entre deux titres au lieu de 2,25). Une gravure et la série des notes, qu’aucune règle de voisinage ne nomme, prennent une enveloppe de même mesure (`.cs-bible-regard`). Les deux mesures dont tout cela se déduit sont nommées une seule fois (`--regard-numero`, `--regard-numero-gouttiere`), pour que les deux fers ne se séparent pas au premier réglage. ⚠️ Une enveloppe est une surface de plus, et une règle de blanc ne la connaît pas : c’est le § 35.17.3 pris par un quatrième bout.

⚠️ Deux colonnes de commentaire à la manière du fac-similé de Fillion ont été maquettées le même jour, sur la page réelle, et écartées : elles remplissaient la largeur, quand la largeur elle-même était le défaut. ⚠️ Sur téléphone, où les colonnes sont empilées à la largeur de l’écran, rien ne se borne.

### 35.4.3. Corps des introductions longues

Le style de composition `introduction` est réservé aux préambules brefs qui se tiennent réellement à l’écart du fil de lecture. Lorsqu’une introduction de livre est longue et structurée en plusieurs divisions, son titre ou son conteneur conserve sa nature d’introduction, mais les développements placés sous les titres analytiques se composent comme de la prose normale : romain, justification ordinaire, mesure et marges ordinaires. Dans le registre Fillion, ces développements emploient le style de rendu `commentaire_section` (I3), et non `introduction_sous_section`. Les vrais titres analytiques restent à leur niveau T4. La transcription source n’est jamais modifiée pour cette distinction de composition. Une brève introduction de péricope ou un véritable préambule court peut conserver un style `introduction_*` lorsque sa fonction éditoriale le justifie.


**Numéros de verset hors guillemets.** Les numéros de verset éditoriaux notés entre parenthèses ne font pas partie du texte cité et doivent être placés hors des guillemets : `« texte » (7)`, jamais `« texte (7) »`. Si plusieurs numéros scandent une citation continue, fermer puis rouvrir les guillemets autour de chaque repère. Le point final ordinaire se place après le numéro : `« texte » (7).` Les signes `?` et `!` intrinsèques à la citation restent avant le guillemet fermant : `« texte ? » (7)`.

### Contrôle de clôture après resegmentation ou projection

Une clôture d’œuvre ne repose jamais sur les seuls totaux globaux. Après toute resegmentation, projection de titres ou reprise de liens, effectuer aussi les contrôles suivants :

- **Ponctuation par paragraphe.** Vérifier l’équilibre des guillemets et des parenthèses à l’échelle de chaque paragraphe éditorial. Un équilibre global peut masquer deux paragraphes fautifs qui se compensent. Une référence biblique, une parenthèse ou une citation ne doit jamais être coupée par une frontière de paragraphe artificielle.
- **Continuités inter-unités.** Une coupure de page, d’OCR ou d’unité source ne crée pas d’espace si elle tombe au milieu d’un mot, d’un nombre ou d’une plage de référence. Conserver chaque caractère dans son unité source ; employer `join_before = ''` lorsque le rendu doit concaténer les deux fragments. Ne jamais déplacer un caractère vers une autre unité uniquement pour embellir le segment.
- **Analyses projetées en N2.** Reconstituer chaque item imprimé de l’ANALYSE avant de le projeter. Une ligne ou une unité source peut contenir la fin de l’item précédent et le début du suivant. La concordance du numéro seul ne suffit pas : contrôler le libellé complet et sa continuation matérielle.
- **Majuscules accentuées.** Le contrôle porte sur toute la couche de lecture ET sur les titres projetés, non sur les seuls incipits. Les formes françaises `É`, `À`, `È`, `Ê`, `Î`, `Ô`, etc. sont obligatoires quand la minuscule correspondante est accentuée. Les sigles, translittérations et vrais noms non accentués sont exclus par contexte, jamais par une règle aveugle.
- **Références `Ibid.`.** Dans la couche de lecture finale, développer `Ibid.` dès que sa cible a été résolue et vérifiée. Résoudre d’abord le livre, le chapitre et la versification par la source et le contenu ; n’expanser jamais un `Ibid.` encore ambigu. Le texte visible et le lien canonique doivent rester concordants.
- **Unicité et coexistence fonctionnelle des liens.** Appliquer la règle du § 9.4 bis : pour un même couple `segment × cible biblique`, un seul lien est admis par type. La coexistence de types différents n’est admise que si le segment remplit réellement plusieurs fonctions distinctes, chacune motivée séparément. Une citation explicite du verset intégrée à son commentaire peut donc porter T1 + T3 ; sinon conserver seulement le type qui décrit la fonction réellement exercée.
- **Offsets de provenance.** Une égalité après `norm_fr` est un indice de contrôle, jamais une preuve suffisante pour écrire des offsets Unicode bruts. Écrire `source_start_offset_unicode` / `source_end_offset_unicode` seulement lorsque les positions sont exactes et déterministes dans le témoin brut, ou qu’une méthode de bornage validée établit sans ambiguïté les limites. Les coupures de mot éditorialement recollées entre deux unités restent documentées sans offsets inventés.\n- **Couverture d’une unité source.** Un écart entre `source_end_offset_unicode` d’un segment et `source_start_offset_unicode` du suivant n’est pas automatiquement un trou. Lire le sous-texte source correspondant : une espace simple ou un séparateur intentionnel de paragraphe (`\\n\\n`) peut rester hors empans tout en appartenant à la structure de recomposition. Un audit de couverture échoue sur du texte source non blanc laissé découvert, un chevauchement, des bornes invalides, ou un séparateur inexpliqué incompatible avec la structure — jamais sur la seule existence d’un intervalle numérique.
- **Métadonnées finales.** Après les dernières mutations structurelles, recalculer depuis les tables live les nombres de segments, unités et signes, les statuts de phase et les indicateurs de publication. Les drapeaux œuvre/texte ne doivent pas contredire une note éditoriale explicite de non-publication.
- **Niveaux de validation.** Distinguer strictement contrôle mécanique, relecture IA et validation humaine. Aucun marqueur IA ou mécanique ne permet de déduire `validated_human=true` ou `controle_verifie=true`.


## Césures de mots entre unités source — règle normative

Une césure typographique/OCR située à la frontière de deux unités source ne doit jamais être absorbée artificiellement par une seule unité de lecture. Les deux fragments lexicaux restent rattachés à leurs unités source respectives et sont réunis au rendu par `join_before = ''`. Le trait de césure de fin de ligne/page est un signe matériel du témoin : il n’entre pas dans le mot normalisé. Les guillemets de continuation ajoutés par l’OCR ou par la mise en page ne sont pas réinjectés s’ils ne correspondent pas à un nouveau guillemet sémantique. Avant toute correction, contrôler les deux unités voisines ; ne jamais reconstruire un mot à partir d’une seule unité si le second fragment appartient à la suivante. Exemples validés : `représente-` + `t-il` → `représente-t-il` ; `mou-` + `vements` → `mouvements` ; `si-` + `gnalé` → `signalé`.


### Transposition de lignes dans une transcription OCR source
Lorsqu’une unité source OCR contient des lignes ou fragments matériellement transposés, on ne force jamais des offsets continus contre cet ordre corrompu. Les segments concernés restent sans bornes jusqu’à correction de la transcription diplomatique à partir du fac-similé. Une transcription secondaire peut corroborer l’ordre attendu, mais ne remplace pas le fac-similé lorsqu’il faut réécrire la couche source. La réserve doit être documentée au niveau de l’unité et chiffrée au centre de contrôle.

### Règle — transposition de lignes OCR et provenance
Lorsqu’une unité OCR présente des lignes ou fragments matériellement transposés, ne jamais fabriquer des offsets discontinus ni forcer un alignement sur le texte éditorial. Revenir au fac-similé, corriger d’abord l’unité source dans l’ordre attesté, documenter la correction, puis seulement recalculer les offsets des segments. La source corrigée devient la base de provenance ; le texte de lecture n’est pas réécrit s’il était déjà conforme au fac-similé.


### 23.12. Validation humaine par couche

La validation humaine est **attachée à la couche réellement vérifiée** et ne se propage jamais automatiquement entre objets. `oeuvre_texte_unites.metadata.validated_human=true` atteste la transcription ou l’unité source telle qu’elle a été contrôlée ; il ne vaut pas validation de la segmentation, des raccords, de la normalisation éditoriale ni du contenu de chaque `segments.segment_texte` dérivé. Inversement, `segments.controle_verifie=true` atteste le segment éditorial contrôlé et n’autorise pas à déclarer l’unité source entière validée si elle ne l’est pas déjà.

Les bilans chiffrent séparément ces deux couches et, si nécessaire, leur intersection. ⛔ Aucun drapeau humain n’est hérité, extrapolé ou créé par une passe IA, même lorsque la recomposition source/lecture est exacte.\n\n`segments.segment_metadata.validated_human`, lorsqu’il subsiste dans des imports anciens, est une métadonnée historique non canonique : pour la validation humaine du segment, seule `segments.controle_verifie` fait foi. Ne pas synchroniser ce drapeau JSON automatiquement, ni dans un sens ni dans l’autre. Une divergence historique entre les deux champs doit être documentée ; elle n’autorise jamais une passe IA à créer ou retirer une validation humaine.

#### 35.8.7. Matrice de clôture et contrôles transversaux obligatoires

**Le dénominateur de clôture vient toujours de l’état live.** Avant tout bilan `n/n`, la passe finale reconstruit depuis la base l’inventaire courant du périmètre, par source, membre d’édition, livre, langue, `block_kind`, statut public/source-only et surface effectivement rendue. Un sous-lot ciblé doit être nommé comme tel : quatre chapeaux contrôlés ne deviennent jamais « 4/4 introductions » si l’inventaire live comporte d’autres blocs d’introduction. Aucun compteur historique, staging ancien ou todo antérieur ne remplace ce dénominateur.

**La clôture utilise une matrice de surfaces.** Le rapport final distingue au minimum, lorsqu’ils existent : témoin/source ; texte biblique par langue ; titres et sous-titres ; corps racine ; sous-blocs de lecture ; notes, blocs et ancres ; illustrations et fichiers ; bibliographie structurée ; alignements canoniques ; vues/projections réellement consommées par le lecteur. Chaque ligne de la matrice donne son dénominateur live, le nombre contrôlé et les réserves. Une mission portant seulement sur l’apparat ou le commentaire ne clôt pas par implication le texte biblique, les images, l’alignement ou une langue parallèle.

**Égalité obligatoire des projections dérivées.** Après toute mutation d’un texte ou d’une normalisation, le `reading_text` racine doit être exactement la recomposition ordonnée des `reading_text` de ses sous-blocs avec de vrais séparateurs de paragraphes ; les séquences littérales d’échappement `\\n`, `\\r` ou `\\t` sont interdites dans toute surface rendue. Les transformations et enrichissements doivent rester dans leurs bornes et viser exactement leur chaîne source ou leur chaîne de lecture. Dans la même micro-passe, recalculer depuis l’état live toutes les métadonnées dérivées applicables : SHA, `source_characters`, `paragraph_count`, dernier offset, empreintes de correction et compteurs analogues. Un SHA exact n’excuse jamais une longueur ou une recomposition périmée.

**Titre, repère et sous-titre forment une seule fonction structurelle.** Lorsqu’un titre imprimé associe un repère (`Livre I`, `Section I`, `§ I`, etc.) à un intitulé descriptif et éventuellement à une portée, le modèle de lecture ne crée jamais un titre amputé suivi d’un faux bloc de commentaire contenant le sous-titre. Le témoin complet est conservé dans `facsimile_heading` ou une provenance équivalente ; la tête éditoriale porte le repère normalisé et son intitulé selon les §§ 35.5.2–35.5.3. Un bloc autonome qui ne fait que répéter le sous-titre est une dette structurelle à supprimer du rendu après vérification des dépendances.

**Les marqueurs imprimés résiduels sont recherchés après toute fusion ou reconstruction.** Le postcontrôle balaie le corps racine et les sous-blocs à la recherche de `Chap.`, numéros de versets ou de plages, lettres de sous-verset et autres repères susceptibles d’avoir été absorbés au milieu d’un paragraphe. Chaque candidat est comparé à la structure source : un vrai repère de commentaire est extrait ou documenté ; une énumération sémantique réelle reste dans la prose. ⛔ Aucune suppression par expression régulière sans classification contextuelle.

**La clôture typographique est une matrice de codepoints et de langues.** Pour chaque catégorie rendue — texte biblique, commentaire, introduction, heading et note — compter séparément les U+0020, U+00A0 et U+202F aux positions normées, ainsi que les apostrophes ASCII, guillemets non conformes, ellipses ASCII et ordinaux numériques. Les compteurs doivent être à zéro sauf exception explicitement motivée. La passe langues produit en outre un inventaire des `inline_spans` par langue et fonction et vérifie la couverture des lemmes, locutions, translittérations et titres d’œuvres réellement étrangers ; le grec en caractères grecs reste en romain et ne doit chevaucher aucun span italique. Une simple lecture visuelle ne remplace pas ces contrôles.

**Un crosswalk vérifié est une preuve, jamais une autorité absolue sur un autre témoin.** L’alignement canonique du témoin courant est confronté au texte et aux frontières réellement imprimées. Si un témoin distribue sur un même verset une matière que le crosswalk de référence sépare ailleurs, la correspondance propre au témoin peut différer, à condition d’être justifiée et de préserver la couverture. ⛔ Ne jamais copier en masse des cibles ou un statut `verified` depuis un crosswalk sans contrôle des frontières du témoin courant.

**Vérification du mapping et collation textuelle sont deux statuts distincts.** La couverture complète de l’ossature canonique, même vérifiée, ne prouve ni l’exactitude lexicale ni la collation visuelle du texte biblique. Pour chaque langue du témoin, le bilan sépare : unités présentes, unités alignées, unités collationnées au fac-similé, unités encore candidates et mappings vérifiés. Une colonne parallèle — notamment latin/français — est auditée comme un témoin à part entière ; l’achèvement du commentaire ne la valide pas.

**Le contrat des vues et du lecteur fait partie de l’intégrité.** La passe 9 vérifie non seulement les métadonnées stockées, mais aussi les champs réellement lus par les vues/RPC/composants servant le corpus. Une valeur correcte rangée sous une clé que la vue ne consulte pas est une donnée fonctionnellement absente. Les clés de statut, niveau, parenté, présentation et collation exposées par la projection doivent être comparées à leur source normative avant clôture.

**Tout périmètre déclaré privé ou `test_only` reçoit un test RLS réel.** Depuis un contexte privilégié, exécuter une lecture sous le rôle `anon` sur les sources, segments/blocs, notes, assets et fichiers concernés. Si une ligne interdite au public est visible, la mention « privé », une route applicative protégée ou un champ `test_only=true` ne suffisent pas : la clôture de confidentialité est refusée jusqu’à correction de la politique ou des statuts. Une correction RLS transversale qui toucherait d’autres livres ou missions est isolée et ne se fait jamais par ricochet depuis un audit local.

**Réserve de transcription et anomalie du témoin sont comptées séparément.** Une leçon imprimée fautive mais confirmée, une attribution patristique douteuse ou un renvoi source impossible peut être textuellement clos tout en conservant un `source_integrity_note`. Le rapport distingue donc : réserves encore ouvertes sur la transcription ; anomalies du témoin confirmées et conservées ; notes critiques d’attribution. `requires_review=false` ne doit jamais effacer cette information critique.

**Les illustrations entrent dans la matrice de clôture.** Pour chaque asset : identité, ordre, ancrage, page imprimée, page source, crop, provenance, famille graphique, fichier dérivé, dimensions et SHA sont contrôlés. `alt_text` et légende éditoriale sont présents lorsqu’ils sont nécessaires. Un contrôle automatique de traitement d’image ou un `PASS` technique ne vaut pas validation visuelle du cadrage ni validation humaine de la planche.

**La formule de clôture nomme exactement ce qui est clos.** On peut déclarer « apparat clos », « mapping canonique clos » ou « commentaire collationné » si ces matrices sont conformes. ⛔ On ne déclare pas un livre globalement « clos » tant qu’une surface applicable de la matrice demeure en attente — notamment texte biblique d’une langue, titres/sous-titres, typographie, vue de projection, assets ou confidentialité. Les dettes restantes sont chiffrées depuis la base et deviennent des tâches distinctes, sans réécrire l’historique de la mission déjà achevée.

## 39. La mesure d’audience

**Le site se mesure LUI-MÊME.** Depuis le 31 août 2026, la fréquentation est relevée par le site et enregistrée dans sa propre base. Aucun outil tiers n’intervient. Google Analytics, employé jusque-là, est retiré, et le bandeau de consentement qui l’accompagnait avec lui.

### 39.1 Pourquoi la maison plutôt qu’un outil

Trois raisons, dans l’ordre où elles pèsent.

**La jointure.** Les seules statistiques qui servent à décider quelque chose ici sont celles que le modèle de données du site peut produire : quelles œuvres sont ouvertes puis abandonnées, quels versets sont lus alors qu’aucun lien patristique ne les porte encore, si ceux qui ouvrent un compte lisent davantage. Un outil externe range ses chiffres dans un silo qu’on ne croisera jamais avec `oeuvres`, `segments` ou `profils`. Il répond à des questions générales quand celles du site sont particulières.

**L’exactitude.** Un outil tiers qui dépose un traceur exige le consentement, et ne compte donc que les visiteurs qui l’accordent. L’écart n’est ni connu ni corrigeable : aucune règle de trois ne reconstitue ceux qu’on n’a pas vus.

**La durée.** Google Analytics efface ses données détaillées au bout de deux mois, quatorze au maximum. Une bibliothèque a vocation à durer plus que cela.

### 39.2 Ce que la mesure s’interdit

Une mesure d’audience anonyme, strictement limitée au site, non recoupée et non transmise est dispensée de consentement. C’est le régime que le site a choisi, et il oblige.

- ⛔ L’adresse IP n’est jamais conservée. Elle sert à calculer une empreinte hachée dont le sel change chaque jour : un visiteur se reconnaît sur la journée et redevient inconnu le lendemain.
- ⛔ Aucune vue n’est rattachée à un compte. On note qu’une session était ouverte, jamais laquelle.
- ⛔ Les termes tapés dans la recherche ne sont pas consignés, ni par le chemin, ni par le référent, dont seul l’hôte est gardé.
- ⛔ Rien n’est transmis à un tiers, et rien ne quitte l’hébergement du site.
- ⛔ Les données sont supprimées au bout de vingt-cinq mois, et cette borne est tenue par un travail périodique en base, non par une intention.

⛔ **Un compte ADMINISTRATEUR n’est pas compté non plus, où qu’il lise.** Écarter les pages d’administration sans écarter celui qui les ouvre ne tenait qu’à moitié : la règle est que l’auteur du site n’est pas son propre public, et elle vaut sur les pages publiques comme sur l’administration. Une mesure qui compte l’auteur mesure son travail, non son audience.

⚠️ **Le compte de démonstration partagé et les invités de la bêta restent comptés**, faute d’une décision. Ce sont les seuls lecteurs que le site ait aujourd’hui, et les écarter viderait la mesure ; mais le compte de démonstration est aussi l’auteur sous un autre chapeau. À trancher avant l’ouverture, pas après.

**Ajouter un traceur tiers, c’est remettre un bandeau.** La décision se prend alors comme telle, en pesant ce que le visiteur y perd, et la page Confidentialité se reprend le même jour. Ce n’est pas un réglage technique.

### 39.3 Où l’on regarde

Deux écrans, et ils ne disent pas la même chose.

**« Statistiques du corpus »** (`/admin/controle/statistiques`) dit l’état du TRAVAIL : œuvres, qualité des segments, péricopes, bibliographie, chronologie. On l’ouvre pour savoir ce qui reste à faire.

**« Audience »** (`/admin/audience`) dit ce que le site REÇOIT : visites, provenance, comptes, lectures. On l’ouvre pour savoir qui vient et ce qu’il lit.

Un chiffre nouveau se pose sur l’un ou sur l’autre, jamais sur les deux, et jamais sur celui qui ne l’attend pas.

### 39.4 Ce que la maison ne sait pas faire

**Les mots tapés dans un moteur ne viennent pas de là.** Ils viennent de la Search Console, qui est gratuite, ne demande aucun consentement puisqu’elle ne relève rien chez le visiteur, et se consulte chez Google. Le jour où le référencement deviendra le sujet, on décidera s’il vaut la peine d’en rapatrier les chiffres dans la page. Tant que le site est fermé, non.

⛔ **Elle ne sait pas dire « visiteurs uniques sur le mois », et ne le dira jamais.** L’empreinte tourne chaque jour : au delà de la journée, on ne compte plus des gens mais des occasions. Le site annonce donc des visiteurs PAR JOUR, jamais un cumul de visiteurs sur une période. C’est le prix de l’anonymat, il est payé sciemment, et un chiffre qui prétendrait le contraire serait faux. La règle vaut au delà de l’audience : **une empreinte qui tourne borne le grain auquel on peut compter des personnes.**

⚠️ **Elle ne distingue pas une page OUVERTE d’une page LUE**, et c’est pourtant le seul signal qui compte vraiment sur une bibliothèque : cent ouvertures quittées en dix secondes ne disent pas ce que disent cent lectures. Un second signal envoyé au bout d’un moment suffirait à les séparer. Écarté pour l’instant, la mesure devant rester sobre ; à rouvrir si la question se pose à l’ouverture.

**Le compteur maison n’est pas juste au dixième près.** Il attrape quelques robots et il en manque. Il reste plus juste qu’une mesure amputée du consentement, et il faut le dire plutôt que d’afficher une précision qu’on n’a pas.


## 40. L’espace du lecteur — ce qui se RÈGLE, ce qui se GAGNE

Refonte du 1er septembre 2026, à la demande de l’auteur. La page du compte tenait en un seul rouleau de 978 lignes qui mêlait trois natures : la vitrine, les préférences de lecture et l’administration du compte. Elle se lit maintenant sous une colonne, et la colonne se coupe en DEUX groupes — « Mon parcours », qu’on revient voir, et « Réglages », qu’on n’ouvre que trois fois dans la vie d’un compte. ⛔ La séparation n’est pas un rangement : Restivo et van de Rijt (PLoS ONE, 2012) ont distribué au hasard des récompenses purement symboliques à des contributeurs de Wikipédia, et mesuré +60 % de productivité, effet encore sensible trois mois après, mais **uniquement chez les déjà très actifs**. Ce qui retient un lecteur fidèle et ce qui accueille un nouveau venu ne sont pas le même objet, et ne se rangent donc pas au même rayon.

⚠️ Trois requêtes de cette page visaient des colonnes qui n’existent pas — `essais.auteur_id`, `essais.cree_le`, `profils.membre_depuis` — et échouaient EN SILENCE, faute de lire `error` : la carte « Publications » était vide en production depuis toujours. C’est le défaut déjà consigné pour `favoris_oeuvres`, reproduit dix lignes plus bas dans le même fichier. **Un panneau discret journalise son erreur**, sans quoi rien ne distingue « vide » de « cassé ».

### 40.1 Le PORTRAIT est une référence, jamais une adresse

Le lecteur prend pour visage un Père de l’Église ou un traducteur du corpus, choisi parmi les illustrations que la bibliothèque porte déjà. ⛔ On ne retient qu’une RÉFÉRENCE — « auteur:A0010 », « traduction:TR0002 » — et l’adresse se fabrique à la lecture. La page écrivait auparavant une URL complète depuis le navigateur : la politique RLS borne la LIGNE qu’un lecteur modifie, jamais la VALEUR qu’il y écrit, si bien que n’importe quelle adresse extérieure y passait et que la page publique la servait ensuite à tous ses visiteurs, lesquels allaient chercher une image sur un serveur tiers sans le savoir. Le format est borné en base par une contrainte, et le NOM du visage se résout de même : une copie du nom serait aussi falsifiable que l’ancienne adresse.

⛔ **On ne DEVINE pas le stock.** La modale demandait les soixante premiers auteurs et tentait « A####.jpg » pour chacun en masquant les 404 : le seau n’en porte que dix-neuf, donc quarante et une requêtes tombaient à chaque ouverture. Une route serveur liste le stock réel — le listage d’un seau n’est ouvert qu’aux administrateurs, quand bien même les fichiers se téléchargent librement.

⚠️ Un traducteur prend son ENCART, jamais son bandeau : le bandeau est couché (§ 37), il ne donnerait dans un rond qu’une bande de ciel. Une traduction sans encart n’est donc pas proposée. Et le cadrage de départ est celui que la bibliothèque a déjà réglé pour la fiche de l’auteur (`auteurs.photo_position`), borné à la course du curseur : personne n’a à recadrer ce qui l’a été.

### 40.2 Le PARCOURS D’ENTRÉE enseigne, il ne paie pas

Dix gestes qui font le tour du site, et qui apprennent les gestes par lesquels un lecteur garde ce qu’il lit. ⛔ **Aucun point.** La liste qu’il remplace annonçait « +2 pts » pour la présentation, « +1 pt » pour un passage et « +1 pt » pour un favori : aucun de ces trois points n’existait dans la formule du rang, soit trois promesses fausses sur cinq. Elles ne reviendront pas sous une autre forme — Deci, Koestner et Ryan (Psychological Bulletin, 1999) mesurent sur 128 expériences que la récompense tangible et attendue MINE la motivation qu’elle prétend soutenir (d ≈ −0,36 pour celles conditionnées à l’achèvement), quand le retour purement informationnel la soutient.

**Trois étapes sont acquises à l’arrivée, et le motif se DIT.** Nunes et Drèze (2006) ont distribué 300 cartes de fidélité : une carte de dix cases dont deux sont déjà tamponnées obtient 34 % de complétion contre 19 % pour une carte de huit cases vierges, à effort rigoureusement égal. ⚠️ L’effet DISPARAÎT quand l’avance n’est pas justifiée : le motif affiché n’est donc pas une politesse, c’est la condition pour qu’elle porte.

⚠️ **On annonce le plus petit des deux nombres** (Koo et Fishbach) : « 3 sur 10 » tant qu’on est loin, « il vous en reste deux » dès qu’on approche. C’est précisément le moment où le lecteur décide d’aller au bout.

⛔ **Tout se DÉDUIT de la base** : rien n’est stocké, donc rien ne peut se désynchroniser. L’ancienne liste se refermait dans le stockage local, si bien qu’elle disparaissait sur un navigateur et reparaissait sur un autre.

### 40.3 On ne TRACE rien : ce qui se compte est ce qu’on MARQUE

⛔ **On ne trace RIEN** (décision de l’auteur, 1er septembre 2026). Tout ce qui se compte se bâtit sur ce que le lecteur MARQUE de lui-même : un passage prélevé, une œuvre mise en bibliothèque, un commentaire validé. Quatre raisons, dans l’ordre où elles pèsent. Une ouverture de page ne prouve pas une lecture, et une case qu’on sait imméritée dévalue tout le tableau ; un geste volontaire, lui, prouve. Un tableau qui se remplit tout seul se comble sans qu’on ait creusé aucun écart, et la curiosité s’éteint avec eux. Une trace automatique fait qu’on se sait observé, et l’on finit par lire pour le compteur — sur un corpus religieux, le temps passé sur un passage est en outre une donnée intime. Enfin elle ne coûte rien : aucune table, aucune écriture, aucun chantier préalable.

⛔ **AUCUN LIBELLÉ NE DIT « LU ».** Une case se gagne en retenant, non en parcourant : elle se nomme par ce qu’on a fait, jamais par ce qu’on a vu passer. Un lecteur qui lit sans rien marquer a un tableau vide, et c’est juste.

⚠️ Le choix ne ferme aucune porte : si une vraie mesure de lecture devient nécessaire, on ajoutera la trace et le tableau se nourrira des deux sources.

⛔ **La carte « Ce que j’ai retenu » est RETIRÉE**, le jour même où elle fut écrite (« en l’état, ça ne fonctionnerait pas du tout », mot de l’auteur). Elle rendait en prose ce qu’un lecteur avait marqué, siècle par siècle, en ne montrant jamais que le plus petit écart ; le tableau de cases dit la même matière, et la dit mieux. ⛔ On ne remet pas une seconde vue par-dessus : deux surfaces qui décrivent le même fait divergent au premier réglage, et la seconde finit par faire autorité contre la première.

### 40.4 Les HAUTS FAITS : un TABLEAU DE CASES à collectionner

⛔ **La forme est un TABLEAU, jamais une liste en prose** (décision de l’auteur, 1er septembre 2026 : « un grand tableau de cases à collectionner, dans différents tons harmonieux »). Une case par degré, rangée sous sa série, et **deux états seulement** : validée, non validée. On voit d’un regard ce qu’on tient et ce qu’on n’a pas, ce qu’aucune liste ne montre.

Six séries, vingt et un degrés. Chacun rend une NOTICE de trois lignes qui apprend quelque chose de vrai sur le corpus — les florilèges, la chaîne exégétique, la Glossa ordinaria — et jamais un décompte. C’est le seul retour qui soit de la même étoffe que la lecture, donc le seul qui ne s’y substitue pas. ⛔ Aucun degré n’ouvre de droit, d’accès ni de fonction : un haut fait est un nom, pas une monnaie.

⛔ **La page met en avant la série dont le degré suivant est le PLUS PROCHE**, jamais le degré supérieur de celle qu’on vient d’achever. Anderson, Huttenlocher, Kleinberg et Leskovec (WWW 2013) ont mesuré sur plusieurs millions de comptes Stack Overflow que l’activité s’accélère fortement à l’approche d’un badge, puis s’effondre après l’obtention et retourne au niveau de base. ⚠️ Le remède n’est PAS un palier lointain : le gradient de Kivetz est nul à distance jugée infinie, et un degré hors de portée masque la clôture au lieu de l’éviter. Ce sont des séries DÉCALÉES qu’il faut, dont l’une est toujours à un ou deux pas. Un dernier degré rare se calibre pour qu’une poignée l’atteigne, jamais personne.

⛔ **Le corpus PLAFONNE les collections.** Quarante-cinq œuvres publiées, quinze auteurs, une dizaine de siècles au 1er septembre 2026 : un palier écrit « cinquante Pères » n’est pas rare, il est IMPOSSIBLE, et un haut fait impossible est un défaut, non un défi. Les derniers degrés s’expriment donc en PART du corpus et se recalculent seuls quand le fonds grandit.

⚠️ **Les paliers extrêmes vont sur la LECTURE, jamais sur la production.** Un dernier degré à deux cents commentaires pousse au volume, et sur un site savant c’est le mauvais incitatif — le seul danger réel du système. Un dernier degré sur l’exploration du corpus ne pousse qu’à lire davantage.

⛔ **Les seuils et les notices vivent en BASE, jamais dans le code** : c’est la condition pour les recalibrer après l’ouverture, sur la distribution réelle. Le code ne sait que compter. La rareté ne s’affiche qu’au-delà de cinquante lecteurs : « obtenu par un lecteur sur six » ne dit rien de la difficulté, seulement de la jeunesse du site.

⛔ **Une obtention ne se REPREND jamais**, même si le compteur redescend : une perte démotive plus qu’un gain ne motive. Elle se constate côté serveur, la table n’ayant aucune politique d’écriture pour un compte ordinaire — c’est la leçon du portrait, prise par l’autre bout.

⛔ **UNE CASE NON VALIDÉE EST SOBRE ET LAIDE**, et c’est le mot de l’auteur. Fond de page, encre grise, aucun ton, aucun relief : elle n’a rien de la case gagnée et ne cherche pas à plaire. C’est le contraste qui fait la collection ; une grille où tout se ressemble ne donne rien à compléter.

**Elle porte en revanche son AVANCEMENT chiffré** — « 55 / 100 » — sous un filet mince qui le redouble. C’est ce qui réconcilie le tableau avec Loewenstein (1994), pour qui la curiosité naît d’un écart PERÇU et s’éteint quand l’écart est trop grand : vingt et une cases vides découragent, mais on ne les regarde pas ensemble, on regarde l’écart d’UNE case, petit et dénombrable. ⚠️ Le compte se BORNE à son seuil : une case gagnée n’affiche jamais « 143 / 100 », qui ferait du dépassement un accomplissement de plus.

**Les TONS viennent des trois familles du corpus** — `--cs-ecriture`, `--cs-peres`, `--cs-communaute` — et non d’une gamme inventée pour l’occasion : c’est la palette qui range déjà les résultats de recherche et les rubriques de la barre. Une case gagnée prend un lavis de l’encre de sa famille, d’autant plus soutenu que le degré est haut, obtenu par `color-mix` et non par quatre jetons de plus. ⛔ Le ton dit DE QUOI la case est faite, jamais sa rareté : une couleur qui encoderait la difficulté ferait un second classement par-dessus les points.

⛔ **Les POINTS disent la difficulté, ils ne s’échangent contre rien.** Chaque haut fait en vaut selon son degré, et le total se lit en tête du tableau. ⚠️ Ce n’est pas une monnaie, et ce n’en deviendra pas une : le § 40.6 le tranche, et un point qui ouvrirait un droit rendrait TANGIBLE une récompense qui doit rester informationnelle (Deci, Koestner et Ryan, 1999). Ils servent à comparer deux cases entre elles, et à rien d’autre.

⛔ **La NOTICE ne se lit qu’une fois la case gagnée.** C’est ce qui en fait une récompense et non une consigne : lisible d’avance, elle deviendrait la description d’une tâche à accomplir, et le haut fait cesserait d’être un nom pour devenir un devoir.

#### 40.4.1 Les ANNONCES : deux formes, et l’on n’annonce pas chaque pas

Demande de l’auteur, 1er septembre 2026 : « de petites notifications quand on avance vers l’accomplissement d’un objectif ; et une belle notification quand on termine un haut fait ».

⛔ **DEUX PALIERS PAR CASE AU PLUS** — la moitié du chemin, puis le dernier pas — et jamais deux fois le même. Une vignette à chaque prélèvement serait insupportable, et une notification qu’on subit cesse d’être lue, comme une garde durablement rouge (§ 30). ⚠️ Sous un seuil de quatre, la moitié ne s’annonce pas : « 2 sur 4 » n’est pas une nouvelle.

**L’obtention l’emporte sur le palier** : une case qui vient de tomber ne s’annonce pas comme étant à mi-chemin. La belle annonce porte le nom du haut fait, ses points et sa NOTICE — le retour de fond arrive au moment où la case tombe, non plus tard dans un tableau qu’il faudrait aller ouvrir.

⚠️ **Rien ne s’écrit en base pour cela.** Ce qui a déjà été annoncé vit dans le stockage local du navigateur, comme les notifications archivées du site : une annonce est un fait d’ÉCRAN, pas un fait de corpus, et le pire qu’un stockage vidé puisse faire est de la remontrer une fois. ⛔ On retient AVANT de montrer, sans quoi une annonce interrompue — page fermée, onglet changé — reviendrait à chaque chargement.

⛔ **La vérification ne part pas à chaque page tournée** : une fois par session, puis sur le GESTE d’un lecteur. Sept points d’écriture l’émettent, les six prélèvements et l’ajout d’un favori. ⚠️ Le RETRAIT d’un favori ne signale rien : aucune case ne recule, une obtention étant acquise pour de bon.

### 40.5 Le RANG mesure la lecture, non la conversation

Il se gagnait en commentant : un point par commentaire, quatre s’il était validé, deux par mention reçue, quinze par essai. Sur un site dont l’objet est la lecture des Pères, c’est un contresens — le lecteur silencieux qui a parcouru quarante œuvres en sait plus que le commentateur prolixe — et c’était du même coup le seul danger sérieux du système : le commentaire creux posté pour faire monter un compteur. ⚠️ La modération existe : ce qui se compte encore ne compte que le VALIDÉ.

Il se lit désormais sur une PART : combien d’auteurs le lecteur a retenus, sur combien la bibliothèque en donne à lire. Un rapport et non un total, donc un rang qui monte avec le corpus et ne vieillit pas.

⚠️ **SIX degrés et non trois** — Catéchumène, Auditeur, Disciple, Familier, Lettré, Docteur. Les anciens seuils, Disciple à 50 points et Docteur à 300, laissaient un désert de 250 points où le gradient ne joue plus : on n’accélère qu’à l’approche, et un but à deux cent cinquante pas n’est pas une approche. Rapportés à quinze auteurs, les degrés tombent à 1, 3, 5, 8 et 12 : jamais plus de quatre pas de l’un à l’autre.

⛔ **Aucun n’emprunte aux ordres sacrés** : ce sont des états d’étude, non des degrés de cléricature. « Lecteur » est écarté pour la même raison, et parce que le site appelle déjà tout le monde ainsi.

⛔ **Le remplacement se fait PARTOUT d’un coup**, commentaires publics compris : deux rangs concurrents sur deux pages voisines ne diraient plus rien ni l’un ni l’autre.

### 40.6 Ce que la gratification doit être

⛔ **Elle est INTELLECTUELLE, jamais une monnaie** (décision de l’auteur, 1er septembre 2026). Gruber, Gelman et Ranganath (Neuron, 2014) ont montré que l’état de curiosité active le circuit dopaminergique de la récompense et l’hippocampe, et que ce qui s’y apprend se retient mieux, y compris ce qui n’était pas visé : l’information EST une récompense, au sens le plus littéral. On n’a donc pas besoin de points pour gratifier ; il faut produire de la curiosité, c’est-à-dire ouvrir de petits écarts de savoir et les combler.

Le collectionnable est le CORPUS lui-même, non le point. Le lecteur ne collectionne pas des jetons : il collectionne des Pères, et il sait à la fin lesquels il connaît.

⚠️ Sailer et Homner (2020) mesurent des effets réels mais modestes de la ludification (g = 0,49 sur le cognitif, 0,36 sur le motivationnel, 0,25 sur le comportemental), et les deux éléments qui ressortent sont la FICTION — l’univers narratif — et l’association de l’émulation et de la collaboration. Ici la fiction est déjà là, et meilleure que celle d’aucun autre site : les Pères, les siècles, les degrés d’étude. C’est le facteur actif, pas l’ornement — un haut fait se nomme « La chaîne » ou « Le concert », jamais « Lecture niveau 3 ».


### 40.7 La MARQUE DE MÉCÈNE : une gratitude, jamais un grade

⛔ **ELLE N’EST PAS UN HAUT FAIT, et elle n’entrera jamais dans le tableau** (décision de l’auteur, 3 septembre 2026). Les vingt et un degrés du § 40.4 se déduisent tous de marques de LECTURE, et il y est écrit qu’un haut fait est un nom, pas une monnaie. Une case qui s’achète ferait perdre au tableau entier ce qui le rend lisible : plus personne ne saurait dire quelles cases se lisent et quelles cases se paient, et le doute porterait sur les vingt et une. La marque vit donc À CÔTÉ : aucun point, aucune série, aucune rareté, aucun effet sur le rang.

⛔ **Elle n’ouvre NI DROIT, NI ACCÈS, NI FONCTION.** C’est déjà la règle des hauts faits, et elle vaut ici à plus forte raison : la page « Soutenir le projet » promet un site « ouvert à tous, sans abonnement ni registre », et un don qui ouvrirait une porte ferait de cette promesse une réclame. Le mécène lit ce que lit le visiteur.

**Sa forme est celle du COLOPHON DU BIENFAITEUR.** Les manuscrits nomment qui a payé la copie, et c’est le registre du site. Le signe est un GRAIN, celui que le semeur de la page « Soutenir » confie au sillon : le donateur est le semeur, et le corpus est ce qui germe.

⛔ **IL N’Y A QU’UN SEUL SIGNE, et il ne se gradue pas.** Un signe qui suivrait le montant afficherait publiquement le prix de chacun : il gênerait les grands dons autant qu’il découragerait les petits, et il rendrait une page de profil lisible comme un relevé. ⚠️ Corollaire, et c’est ce qui rend la règle tenable : **AUCUN MONTANT N’EST JAMAIS CONSERVÉ.** PayPal tient ce livre-là ; le site ne retient que le FAIT du don. Une donnée financière qu’on ne garde pas est une donnée qu’on n’a pas à protéger.

**La marque paraît PARTOUT OÙ LE PSEUDONYME PARAÎT** (décision de l’auteur, 3 septembre 2026) : commentaires d’un verset, d’une œuvre ou d’un essai, couverture d’une publication, page de profil, messagerie. ⚠️ Elle n’est NOMMÉE en toutes lettres qu’à un seul endroit, sur la page de profil, sous le millésime : « Lecteur depuis 2026 · Mécène depuis 2026 ». Une infobulle suffit à la souris et n’existe pas sur un téléphone ; lue une fois, la marque se reconnaît ensuite partout.

⚠️ **Elle prend l’encre de la surface qui la porte.** L’or de la charte est mesuré pour un fond clair : sur l’en-tête vert sombre d’un profil, c’est sa version pâle qui sert, et sur la couverture d’une publication c’est l’encre du carton, qui n’a qu’une seule encre. La marque se reconnaît à sa FORME, non à sa couleur.

⚠️ **Le lecteur peut la retirer** (`pub_mecene`), comme il retire son rang ou ses favoris. Un don n’oblige personne à être vu donnant.

**Elle SE DÉDUIT du registre des dons**, à la date du plus ancien don rattaché, et ne se pose jamais à la main. Rattacher, détacher ou effacer un don suffit, et les deux tables ne peuvent pas se contredire. ⛔ Elle ne s’écrit pas depuis un navigateur : la politique RLS borne la LIGNE qu’un lecteur modifie, jamais la VALEUR qu’il y écrit, si bien qu’un lecteur se décernerait la marque par un simple `update` sur sa propre ligne. C’est le déclencheur `profils_garde_colonnes` qui la retient, comme il retient déjà `est_admin`, `acces_beta` et `points`.

⚠️ **Le rattachement se fait À LA MAIN, et c’est un choix.** PayPal ne rend qu’un nom et une adresse électronique : rien qui pointe vers un compte du site. La notification automatique demande un réglage dont on n’a pas besoin pour quelques dons, et elle retomberait de toute façon sur une comparaison d’adresses approximative. On inscrit le don tel que PayPal le donne, on cherche le compte sur son pseudonyme ou sur l’une de ses adresses, on rattache : trente secondes. La référence de transaction est déjà en base pour le jour où le flux justifiera d’automatiser, et son unicité empêchera de compter deux fois le même don.

⚠️ **Le donateur dont l’adresse de paiement diffère de celle de son compte est INTROUVABLE**, et il faut donc le lui dire : la page « Soutenir » l’invite à se signaler par la page de contact. ⛔ Ce mot vient APRÈS le bouton, en petit, et jamais avant : une page qui annonce sa récompense avant son objet vend un badge au lieu de demander un soutien, et Deci, Koestner et Ryan (1999) mesurent que la récompense attendue mine le geste même qu’elle prétend soutenir. La gratitude se constate après coup, elle ne se promet pas.


⚠️ **LE DON S’INSCRIT SEUL** (décision de l’auteur, 3 septembre 2026 : « ce serait plus simple si c’était automatique »). PayPal notifie le site à chaque paiement encaissé : le don entre au registre, et la marque se pose dans la seconde dès que l’adresse du paiement est celle de la connexion du lecteur ou celle qu’il affiche sur sa page. Le rattachement à la main demeure, et il n’est pas un vestige : il sert le donateur qui paie depuis une TROISIÈME adresse, que le site n’a jamais vue. Rien ne peut deviner qu’elle est la sienne ; son don s’inscrit tout de même, sans compte, et attend une main. ⛔ L’automatique ne supprime pas ce cas, il le réduit à un résidu.

⛔ **UNE NOTIFICATION SE VÉRIFIE AVANT D’ÊTRE CRUE.** L’adresse qui la reçoit est publique par nécessité, PayPal devant l’atteindre : une notification qu’on croirait sur parole laisserait n’importe qui se déclarer donateur et prendre la marque. C’est la faille par laquelle tout compte se faisait administrateur avant le 2 septembre, sous une autre forme. Rien n’est écrit avant que PayPal ait confirmé sa propre signature. ⚠️ Et l’on ne va pas chercher le certificat soi-même : son adresse vient de la requête, donc de qui l’envoie, et une vérification qui suit une adresse fournie par celui qu’elle contrôle ne contrôle rien.

⛔ **SEUL UN PAIEMENT ENCAISSÉ fait un don.** Une commande seulement approuvée porte l’identité du donateur et non la certitude qu’il a payé : l’inscrire ferait entrer des paiements abandonnés, et le lecteur porterait la marque sans avoir donné. L’identité se va chercher sur la commande, elle ne s’y prend pas.

⛔ **LE REGISTRE NE PERD JAMAIS UN DON.** Un don dont on ne sait lire ni le nom ni l’adresse s’inscrit tout de même, avec sa référence de transaction, et attend. Un don qu’on n’inscrirait pas parce qu’un champ manque serait un don perdu, et personne ne le saurait. Le rejeu, lui, ne coûte rien : PayPal renvoie ses notifications tant qu’il n’a pas eu de réponse, et l’unicité de la référence fait que rien n’est compté deux fois.

⚠️ **LE SILENCE DOIT SE VOIR.** Une réception qui s’arrête ne dit rien : plus aucun don n’arrive, ce que rend aussi bien un site où personne ne donne. L’administration affiche donc la date de la dernière notification vérifiée, et elle l’affiche pour toute notification, même celles qu’on n’inscrit pas : ce qu’on veut savoir est que la liaison VIT. ⛔ Mais on ne crie pas à la panne sur un silence, une alerte qui se trompe cessant d’être lue : on dit ce qu’on sait, et l’auteur juge.

⛔ **UN REMBOURSEMENT NE RETIRE PAS LA MARQUE**, et ce n’est pas un oubli : une gratitude constatée ne se reprend pas par un automate. Si le cas se présente, l’auteur efface le don du registre et la marque suit, comme pour n’importe quelle correction.

⚠️ **Le lien de don n’est PAS touché.** Y glisser un jeton qui désignerait le lecteur connecté fermerait le troisième cas, et la notification le rendrait ; mais le bouton est hébergé chez PayPal, rien ne dit qu’il laisse passer une variable ajoutée, et un bouton de don cassé coûterait infiniment plus que ce cas ne coûte. On lit le marqueur s’il vient, on ne l’écrit pas sans avoir pu l’éprouver.


⛔ **LA VOIE EST L’IPN, ET NON LE WEBHOOK** (constaté le 3 septembre 2026). Le webhook exige un compte PayPal **Business** : le tableau de bord développeur refuse l’onglet « Live » à un compte personnel et n’y sert que le bac à sable. L’auteur a tranché le jour même : « je ne passerai pas en compte Business ». C’est donc la notification instantanée de paiement qui porte les dons — elle vit dans les réglages du compte, non dans l’espace développeur, et elle est ouverte à un compte personnel.

⚠️ **Et c’est la meilleure des deux, ici.** Elle ne demande aucune clé d’API, rien de secret à garder, et son message porte DIRECTEMENT l’adresse et le nom du donateur, quand l’encaissement d’un webhook oblige à aller chercher la commande. Le seul renseignement nécessaire est l’adresse du compte qui reçoit les dons, qui n’est pas un secret. ⛔ Le webhook reste écrit et dort : le jour où le compte changerait de nature, il n’y aurait rien à réécrire.

⛔ **DEUX CONTRÔLES, ET IL EN FAUT DEUX.** PayPal valide qu’un message est AUTHENTIQUE, en le lui renvoyant tel quel ; il ne dit pas qu’il m’était DESTINÉ, et un message authentique adressé à un autre marchand se valide tout aussi bien. Sans le second contrôle — l’adresse qui reçoit est-elle la mienne —, n’importe qui se donnerait un euro à lui-même et me réexpédierait le message pour prendre la marque. C’est pourquoi la réception reste ÉTEINTE tant que l’adresse du receveur n’est pas renseignée : on refuse ce qu’on ne sait pas juger, on ne l’accepte pas faute de mieux.

⚠️ **PayPal donne l’IPN pour ancien et le retirera un jour.** Ce jour-là il s’arrêtera, et sans un mot. C’est exactement pourquoi l’administration affiche la date de la dernière notification reçue : le silence doit se voir. Ce n’est pas une raison de s’en priver aujourd’hui — c’en est une de savoir qu’on le surveille.

### 40.8 La SIGNATURE d’une publication : un pseudonyme, un nom, ou rien

Trois façons de signer, choisies dans l’éditeur et changeables à tout moment par l’auteur : le pseudonyme, qui est la règle ; le nom réel, quand le profil en porte un ; et l’anonymat, ajouté le 3 septembre 2026. Deux colonnes les portent, `essais.afficher_nom_reel` et `essais.anonyme`, et la contrainte `essais_signature_exclusive` refuse qu’elles soient vraies ensemble. ⛔ La résolution du nom vit en UN seul endroit, `app/lib/signatureEssai.ts` : la liste, la page, l’administration et le PDF l’appellent, aucun ne la recopie. Elle était recopiée trois fois, et trois copies ne restent identiques que par accident.

⛔ **Anonyme veut dire que RIEN, nulle part, ne relie la publication au compte.** Taire le nom ne suffisait pas : la marque de mécène, la page publique du lecteur, qui liste ses publications, et le décompte d’essais de `classement_utilisateurs` disaient encore qui écrit. Tous trois se taisent désormais sur une publication anonyme, et l’identifiant de l’auteur ne part plus vers le navigateur. L’administration, elle, voit l’auteur, suivi de « (anonyme) » : la modération doit savoir à qui elle parle, et savoir ne pas le nommer en public.

⛔ **Un booléen en base n’aurait rien caché.** La colonne `user_id` était lisible par tout compte sur toute publication publiée, et `classement_utilisateurs` comme `lecture_utilisateurs` traduisent publiquement un identifiant en pseudonyme. Une politique de ligne ne sait pas cacher une colonne. La lecture publique passe donc par la vue `essais_publies`, qui rend `user_id` NUL quand la publication est anonyme ; la table elle-même ne se lit plus qu’en propriétaire ou en administrateur. La vue est en DEFINER à dessein, et en `security_barrier` : c’est la troisième exception à la règle `security_invoker` du paragraphe « Schéma public » d’AGENTS.md. ⚠️ La base étant partagée, la fermeture de la table s’applique APRÈS le déploiement du site sur la vue, en seconde migration (`20260903230000`).

⚠️ **Quatre défauts trouvés en chemin, réparés le même jour.** « Supprimer » dans « Mes écrits » ne supprimait rien : aucune politique DELETE, la RLS refusant en silence, et l’erreur n’était pas lue. Le rang des commentateurs d’une publication lisait encore `classement_utilisateurs` avec des colonnes qui n’y sont pas, si bien que tout commentateur y paraissait « Catéchumène » depuis le 1er septembre (§ 40.5). La couverture choisie par l’auteur était lue en base et jamais passée au carton du rayon : chaque publication retombait sur la couleur tirée de son identifiant. Et la sauvegarde de l’éditeur lisait la couverture sans l’avoir dans ses dépendances, si bien qu’un brouillon enregistré juste après le choix gardait la couverture d’avant. Un cinquième, hors du périmètre mais grave : la vue `mecenes_publics`, créée le matin même, laissait INSERT, UPDATE et DELETE à `authenticated` sur une vue DEFINER auto-modifiable, c’est-à-dire le droit d’effacer les profils des mécènes en contournant la RLS. Révoqué dans l’heure. Une vue de lecture ne porte pas de droit d’écriture, et la règle vaut le jour où l’on crée la vue.


### 38.18 La recherche de PÉRICOPES se limite au titre, aux appellations et à la référence

Demande de l’auteur, le 4 septembre 2026 : « limiter la recherche dans les péricopes au titre, appellations, références ». Trois choses sont nommées ; la barre de recherche en servait deux, et mal.

⛔ **Une RESSEMBLANCE n’est ni un titre, ni une appellation, ni une référence.** La recherche retenait un nom dès que sa parenté de trigrammes atteignait 0,22 — 0,30 sous quatre signes —, c’est-à-dire sur une proximité de lettres, sans qu’un seul mot cherché y figure. Mesuré sur vingt termes courants, quatre-vingt-deux résultats : cinq ne portaient pas le terme, et ils se glissaient sous les vrais sans que rien ne dise pourquoi ils étaient là. « Noces » rendait « Nativité », par « Noël », et « Le Déluge », par « Noé » ; « brebis perdue » rendait « La drachme perdue » et « Pais mes brebis » ; « samaritaine » rendait « Le bon Samaritain ». Après correction : aucun sur soixante-dix-sept.

⚠️ **La ressemblance survit en SECOURS, et là seulement.** Elle rattrape une faute de frappe — « nocse de cana » retrouve les Noces de Cana, « multiplicaton des pains » la multiplication des pains —, ce que personne n’a demandé de retirer. Elle ne s’exécute que si la recherche stricte ne rend RIEN : tant qu’un seul nom porte le terme, elle est éteinte, et la largeur qu’on lui reproche n’existe plus. *Une voie de secours ne se juge pas sur ce qu’elle rend, mais sur le moment où elle s’ouvre.*

⛔ **Ce qu’une consigne ÉNUMÈRE, on le sert en entier.** La référence était le seul des trois termes que la barre ne servait pas du tout : « Mt 5 » n’y trouvait aucune péricope, quand le catalogue le sert depuis toujours. La consigne dit « limiter », et l’on a donc aussi ajouté — parce qu’une des trois choses nommées manquait. Les deux surfaces de recherche disent enfin la même chose du même corpus.

⛔ **Le code d’un livre se comprend CÔTÉ SITE, jamais en SQL.** La table des noms et des abréviations bibliques vit dans un seul module, et la base ne reçoit qu’un code de livre et deux nombres. Une seconde liste écrite en SQL divergerait au premier livre ajouté.

⛔ **Un NOM DE LIVRE SEUL n’est pas une référence.** « Matthieu » n’ouvre pas la voie de la référence : une référence est chiffrée. Le catalogue, qui a la place de les montrer, réunit le livre et les titres qui portent le mot ; une barre de recherche n’a que huit rangs, où les cinquante-deux péricopes de Matthieu chasseraient tout le reste.

⚠️ **Ce qui n’a pas bougé, et pourquoi.** Les huit usages de nom du corpus — titre principal, descriptif, équivalent, référence, paraphrase, élargi, populaire inexact, contextuel — restent tous cherchés. Un nom masqué sert à TROUVER une péricope sans jamais s’afficher à sa place : c’est la règle déjà écrite ailleurs (« baleine » mène à « Jonas et le grand poisson », jamais à « Jonas dans la baleine »), et la restreindre reviendrait à retirer au lecteur les mots par lesquels il cherche vraiment.

### 38.19 La page des RÉSULTATS — le volet, le mot trouvé, la Polyglotte

⛔ **Le dernier volet du site prend la forme des autres.** Il portait ses rubriques en capitales espacées, son mode de recherche dans un contrôle segmenté encadré d’un filet, son champ dans une boîte à rayon et à ombre, et ses deux menus dans des cadres : autant d’objets encadrés dans le seul volet du site qui n’avait pas été repris. Il prend la forme des volets de lecture — rubrique en casse ordinaire, une option par ligne sur pastille verte, champ sans cadre, menu dépouillé. ⚠️ Les deux axes qui portent NEUF bibles gardent un menu : neuf lignes ne se posent pas dans un volet, et la règle de l’option par ligne n’a jamais visé que des axes de deux ou trois états.

⚠️ **Une page de résultats a un TITRE, elle aussi.** Celle-ci n’avait aucun titre de niveau 1 : son nom était une étiquette de trois quarts de rem, plus pâle et plus petite que la première rubrique en dessous.

⛔ **Le mot trouvé se marque par la GRAISSE, et par rien d’autre** (« ne pas surligner en jaune les termes trouvés ; le gras suffit »). Le jaune était la troisième teinte à occuper cette place : un vert l’avait précédé, retiré parce qu’il disait « Bible » au milieu d’un résultat patristique. Le raisonnement qui l’avait posé distinguait les deux surfaces — dans une liste déroulante on sait ce qu’on vient de taper, sur une page de prose on cherche le mot des yeux —, et il était juste pour la liste et faux pour la page : sur un paragraphe qui porte le mot cinq fois, cinq pastilles à rayon et à rembourrage font que le texte cesse de se lire comme un texte. La graisse, sur une encre d’un rang plus profonde, le détache sans le peindre. ⚠️ La balise reste : elle DIT que le mot répond à la recherche, ce qu’aucune graisse ne dit à qui n’y voit pas ; c’est sa peinture, que le navigateur pose en jaune par défaut, qu’il faut éteindre.

⛔ **Deux surfaces qui portent les MÊMES noms de classe doivent porter la même composition.** La Polyglotte de la page des résultats annonçait dans son commentaire des classes « reprises telles quelles de la page de lecture ». Elles ne l’étaient plus : sans de douze pixels contre une sérif de quatorze, référence canonique enfermée dans une colonne bordée et centrée au lieu d’accompagner le verset en marge, numéro d’édition centré dans son étui au lieu de se poser sur la ligne de base du texte, et trois teintes écrites à la main là où la page de lecture emploie des jetons. La composition vit désormais dans la feuille commune : une déclaration, deux surfaces, et chaque page n’ajoute que ce qui lui appartient — ses filets, et le fond d’un verset dont la traduction affichée ne porte pas le mot.

⚠️ **Un commentaire qui promet une identité ne la maintient pas.** C’est la troisième fois que le dépôt paie cette leçon, après les deux copies de la forme des volets et les trois surligneurs de la barre de recherche. Une forme recopiée ne reste identique que par accident, et le commentaire qui l’affirme vieillit plus vite que le code qu’il décrit.


### 38.20 Un mode qu’on n’emploiera jamais se RETIRE, il ne se répare pas

Décision de l’auteur, le 5 septembre 2026 : « à l’échelle, on pourra jamais l’utiliser ; supprime ça ». La frise de l’histoire de l’Église avait deux dispositions — la liste, et une frise « à l’échelle » où chaque famille tenait une colonne, chaque événement une barre proportionnelle à sa durée, le tout posé sur un axe temporel réel. Elle n’en a plus qu’une.

⛔ **Trois partis avaient été mis devant l’auteur la veille**, après mesure : la barre seule avec l’intitulé au survol, les couloirs plafonnés, ou le retrait du mode. C’est le troisième qui est arbitré, et c’est le seul qui referme la question au lieu de la déplacer. *Un écran qu’on garde en se promettant de le régler un jour est une dette qui ne se voit pas dans un compte.*

⚠️ **Ce que la mesure avait déjà dit.** La frise partait en largeur pour des raisons qui ne devaient rien à la chronologie : un bloc réserve la hauteur de son TEXTE, si bien qu’une famille dense ouvre autant de couloirs qu’elle a d’événements dont les intitulés se chevauchent. Ce sont les titres qui décidaient de la largeur, non la simultanéité — et c’est pour cela qu’aucun réglage de l’axe n’aurait suffi.

⛔ **Et la donnée ne portait pas non plus ce que la barre promettait.** Mesuré le 5 septembre 2026 sur les 1 170 repères de la frise : tous portent une date de fin, mais **456 seulement — 39 % — couvrent un empan réel** ; les 714 autres sont des points, où la fin égale le début. Près de deux repères sur trois se rendaient donc par une barre de hauteur minimale, c’est-à-dire par une barre qui ne dit rien. ⚠️ Le fait est consigné parce qu’il resservira : le jour où l’on reproposera une vue chronologique — ici ou ailleurs —, c’est par lui qu’il faudra commencer.

⚠️ **Une première rédaction de cette note affirmait que la date de fin était “le plus souvent absente”.** Elle ne l’est jamais : la colonne est renseignée sur les 1 170 repères. Le raisonnement était juste — un repère sans durée n’a rien à mettre à l’échelle — et le fait invoqué était faux. C’est la règle du § 38.9 prise par un autre bout : **une règle tirée d’un raisonnement se vérifie avant d’être écrite**, et un commentaire de code n’en est pas dispensé.


### 13.8 La NORMALISATION des notes — ce que le site compose, ce que la base porte

Chantier ouvert le 5 septembre 2026 à la demande de l’auteur (« normaliser l’ensemble des notes »). Le mode opératoire, passe par passe, vit dans `work/notes/PROTOCOLE_NOTES.md` ; ce qui suit est la doctrine.

⛔ **LE SITE COMPOSE, LA BASE CONSERVE.** C’est la règle du § 3.2 appliquée aux notes, et elle décide de tout le reste : on ne réécrit une donnée que lorsque le rendu ne PEUT pas la composer — parce que l’information manque, parce qu’elle est fausse, ou parce qu’elle n’est pas là où le rendu la cherche.

⚠️ **Mesuré avant d’écrire une seule ligne : une bonne moitié de ce qu’on croit à corriger l’est déjà.** Sur les 16 408 notes hors apparat, **6 431 (39 %) n’ont aucune ponctuation finale dans la donnée**, et `terminerNote` les termine toutes ; **3 392 renvois bibliques sur 11 916** sont réécrits à l’affichage par `normaliserReferencesDansTexte`. Les corriger en base serait du travail perdu, et pire : ce serait effacer la leçon imprimée que le § 8.1 demande de conserver.

⛔ **L’APPARAT CRITIQUE reste hors de toute passe de normalisation** — 7 379 blocs, 30 % de l’appareil. Ni ponctuation ajoutée, ni référence normalisée, ni typographie de lecture, ni italique (§ 22).

**Quatre points arbitrés par l’auteur le 5 septembre 2026.**

⛔ **1. Le numéro AFFICHÉ recommence à chaque début de NIVEAU 1**, et le numéro INTERNE ne bouge pas. `note_key` et `note_number` portent l’identité et l’ordre de lecture, dont dépendent 23 569 ancres. ⚠️ **Cette décision RECTIFIE le § 13.3**, qui dit encore que « la numérotation ne recommence ni à une partie, ni à un livre, ni à un espace textuel » : la règle valait pour un numéro unique, et il y en a désormais deux. La Bible faisait déjà ainsi, et sa règle cesse d’être une exception.

⛔ **L’apparat critique forme sa propre série de numéros.** Mêlé aux notes de lecture, il les noie : les Confessions passent de **1 039** à moins de 90 par livre dès qu’on l’en sort — leur gros numéro était l’apparat de Knöll, non l’appareil de lecture. ⚠️ Treize textes sur quarante-sept garderont malgré tout trois chiffres, la Cité de Dieu latine en tête avec **731** dans un seul livre ; c’est une conséquence connue de l’arbitrage, non un défaut.

⛔ **2. Les œuvres CITÉES en note entrent dans `ouvrages_bibliographiques`**, le catalogue des ouvrages, et la référence se COMPOSE depuis ses champs — jamais rédigée à la main dans un bloc. C’est le modèle du § 35.6.1, étendu aux notes. **Deux gardes** : un auteur ancien n’y reçoit jamais de fiche notée (§ 29), sans quoi inscrire l’Énéide dégraderait la valeur scientifique de la notice qui la cite ; et les champs d’édition (lieu, éditeur, année, ISBN) restent vides tant qu’on ne cite que l’œuvre.

⛔ **3. Un bloc de note entièrement LATIN se compose en italique, quelle que soit sa longueur** — y compris les 27 blocs qui dépassent 900 signes. ⚠️ Le grec ne suit pas : son alphabet le distingue déjà, et l’italique y déforme la lettre au lieu de changer la graisse. ⚠️ Le latin ENCHÂSSÉ dans une note française est un cas distinct : aucune donnée ne dit où il commence, et il demande une écriture.

⛔ **4. Le type de note paraît sur TOUTES les notes, sans exception** — auteur, traducteur, éditeur de la source, Corpus Scriptura. ⚠️ Il se répète donc des milliers de fois, et **c’est la forme qui doit en tenir compte** : la mention est la chose la plus discrète de la note, jamais une étiquette encadrée ni une ligne à elle. ⛔ Elle vit dans `metadata.editorial_role`, jamais dans le texte du bloc : les 136 « (Note du Traducteur.) » écrits en clair dans le corpus se retirent à mesure que le type se pose.

⚠️ **69 % des blocs (16 873 sur 24 264) ne déclarent aucun type** : c’est le plus gros manque de l’appareil, et rien ne peut s’afficher tant qu’il n’est pas posé. ⛔ **Un type faux est pire qu’un type absent** — il attribue à un Père une remarque de son traducteur du XIXe siècle. Le doute laisse la note sans type et se signale.

### 13.8.1 Deux corruptions du normaliseur, trouvées en le mesurant

Le 5 septembre 2026, les 11 916 renvois du corpus ont été passés par `normaliserReferencesDansTexte` elle-même — jamais par une copie de ses règles. Deux défauts en sont sortis, tous deux visibles du lecteur.

⛔ **Le point n’est un séparateur chapitre/verset que s’il est SUIVI D’UN BLANC.** La fonction acceptait tout point, si bien que « Gn 1.5 » — qui désigne les CHAPITRES 1 et 5 (§ 3.5.1) — devenait « Gn 1, 5 », le chapitre 1 verset 5. **Elle changeait le sens de la référence.** Le blanc sépare les deux cas : une édition ancienne écrit « Psal. 65. 29 » avec un blanc, l’énumération de chapitres s’écrit sans.

⛔ **Le point final ne se mange pas quand un CHIFFRE le suit.** « (Lc 7, 11.15) » — les versets 11 et 15 — rendait « (Lc 7, 1115) » : le point était consommé comme ponctuation de fin et les deux nombres se collaient. **216 blocs de neuf textes**, et le lecteur y lisait un verset qui n’existe pas.

⚠️ **Corollaire de méthode, et c’est le troisième du même ordre cette semaine** : une fonction de normalisation ne se juge pas sur ses tests, mais sur le CORPUS qu’elle traite. Les dix-sept tests de ce module passaient tous, et aucun ne portait sur un point suivi d’un chiffre.

⚠️ **Reste connu, non corrigé** : **1 716 renvois** gardent un chapitre romain parce qu’il est écrit en MINUSCULES (« Matth. x, 22 », « Ps. xv, 2 »), et le motif n’accepte que les capitales. L’étendre est un élargissement de la reconnaissance, non une correction : il attend une décision.


### 13.9 RECTIFICATION du § 13.8 — la ponctuation et la typographie se normalisent DANS LA DONNÉE

Le § 13.8 ouvrait sur « le site compose, la base conserve », et l’auteur l’a corrigé le jour même : « il faut corriger dans les données des informations importantes, et notamment la ponctuation ; sauf évidemment pour certains écrits spécifiques ; mais la règle veut qu’on normalise la ponctuation et la typo ».

⛔ **LA RÈGLE EST DONC L’INVERSE, ET ELLE VAUT POUR L’APPAREIL DE NOTES.** La ponctuation, la typographie et les abréviations bibliques se normalisent **dans la donnée**. La forme normalisée EST la note ; la leçon imprimée se conserve en `metadata` (§ 8.1), elle ne tient plus le champ `text`.

⚠️ **Pourquoi la règle du § 3.2 ne s’applique pas ici, et c’est la leçon de la rectification.** « Au rendu, sans réécrire la donnée » a été posé pour le TEXTE DE CORPUS, qui est un témoin : la graphie d’Arnauld d’Andilly ou de Knöll fait preuve, et l’on ne touche pas à un témoin. **Une note n’est pas un témoin, c’est un appareil que nous constituons** — nous en fixons la numérotation, le type, l’ordre et les renvois. La transposer sans y penser laissait le champ `text` durablement incomplet : une note sans point final le restait dans tout export, toute copie, toute surface qui ne passe pas par le composant de lecture, et le point n’existait que le temps d’un affichage.

⛔ **QUATRE EXCEPTIONS, ET ELLES SE NOMMENT.** Ce sont les « écrits spécifiques » de la consigne, c’est-à-dire tout ce dont la FORME fait témoignage :

1. **l’apparat critique** (7 379 blocs, § 22) — une notation philologique se rend telle quelle : ni ponctuation ajoutée, ni sigle développé, ni référence normalisée ;
2. **toute citation dont la GRAPHIE fait preuve** — une leçon ancienne, une orthographe attestée, un latin cité pour sa lettre ;
3. **la transcription diplomatique** (Bible 899 et tout témoin manuscrit) ;
4. **le texte reproduit d’un document daté** — privilège, imprimatur, approbation, dont la ponctuation appartient à la pièce.

⚠️ **Le rendu ne disparaît pas pour autant, il devient un FILET.** `terminerNote`, `normaliserReferencesDansTexte` et `normaliserTypographieLecture` sont **idempotentes** : sur une donnée déjà normalisée elles ne font rien, et sur un import qui aurait manqué la passe elles rattrapent. ⛔ Les retirer serait faire dépendre l’affichage de la qualité d’une campagne.

⚠️ **Ce que le rendu garde pour lui, et pour de bon** : ce qui n’appartient pas au texte de la note — l’italique de la langue, le type de note, le numéro affiché, la mise à la ligne d’une référence par rang, l’appel. Aucun de ces quatre ne s’écrit dans `text`.

### 13.10 Les NATURES d’un bloc de note

Demande de l’auteur du 5 septembre 2026 : « il faut aussi mettre en place des “natures” pour constituer des styles dans les notes ». Une note se compose de blocs, et chaque bloc a une FONCTION : c’est elle qui décide de sa composition, comme la nature d’un segment décide de la sienne (§ 7.1).

⛔ **Les trois axes du § 7.1 valent ici**, et il ne faut pas les confondre : la **NATURE** dit ce que le bloc EST (`kind`) ; la **FORME** dit s’il est prose ou vers (`form`) ; le **TYPE** dit qui parle (`metadata.editorial_role`, § 13.8). ⛔ Une nature ne se préfixe pas par sa surface : `texte_note_blocs` EST la table des notes, et le redire dans la valeur serait la dérive que le § 7.1 ferme.

**Le vocabulaire, arrêté sur mesure du corpus au 5 septembre 2026 :**

| Nature | Ce que c’est | Blocs |
|---|---|---|
| `reference` | un renvoi, biblique ou bibliographique | 11 916 |
| `commentary` | la prose de la note | 12 008 |
| `lemma` | le mot ou la phrase commentés, que la note reprend avant de la commenter | 126 |
| `quotation` | un passage cité | 115 |
| `translation` | la traduction du passage cité | 76 |
| `attribution` | l’attribution d’une citation | 17 |
| **`source_locator`** *(neuve)* | la coordonnée de la note dans le livre imprimé | ~396 |
| **`internal_cross_reference`** *(neuve)* | le renvoi à une AUTRE note, ou à un autre endroit de la même œuvre | ~116 |

⛔ **DEUX NATURES SEULEMENT SONT CRÉÉES, et chacune répond aux trois questions du § 7.6.**

**`source_locator`** — « (V) pag. 178. — », « (DD) pag. 185. — ». Aucune nature existante ne le compose : ce n’est ni un renvoi bibliographique, ni de la prose, ni un lemme, mais une COORDONNÉE dans l’exemplaire imprimé — la lettre d’appel de l’édition et sa page. Il se voit à la lecture : aujourd’hui il ouvre le paragraphe dans la même face que le commentaire, et le lecteur le prend pour le début de la note. Il se compose en repère discret, jamais en prose.

**`internal_cross_reference`** — « Voyez la note I, p. 150 », « Voy. Catéch. XIV, 9 ». `reference` le composerait comme un renvoi BIBLIOGRAPHIQUE, avec auteur et titre tirés du catalogue ; or il ne pointe hors de rien : il désigne un autre endroit du même livre. La distinction n’est pas cosmétique, c’est ce qui permettra de le rendre CLIQUABLE le jour où les notes se lieront entre elles.

⛔ **CE QU’ON NE CRÉE PAS, et pourquoi.** Une note de note — « (1) Hieronymus (de Viris Illustr.) » — ne reçoit pas de nature : c’est une RELATION entre deux blocs, et `texte_note_relations` existe pour cela (§ 8.1). Créer une nature reviendrait à dire dans le vocabulaire des fonctions ce que le modèle dit déjà dans celui des liens.

⛔ **Et la LONGUEUR n’est pas une nature.** 2 958 blocs de commentaire tiennent en quatre-vingts signes, 62 en dépassent deux mille : c’est le même acte éditorial, et la composition s’adapte à la mesure sans qu’on ait à nommer deux styles. La charte l’a déjà tranché pour les segments ; on ne rouvre pas.

⚠️ **`lemma` existe et ne sert qu’à UNE œuvre** (126 blocs, un seul texte). Chez Faivre, le lemme est noyé dans le bloc de commentaire, derrière la coordonnée : « (V) pag. 178. — *Avec les démons les plus féroces* … ». Les 396 blocs de cette forme portent donc **trois** natures agglomérées, et c’est la passe la plus rentable de l’appareil.

⛔ **LA CHARTE D’ABORD, LA DONNÉE ENSUITE** (§ 7.6) : le vocabulaire est fixé ici, il entre dans la contrainte de la base, puis on sème, puis on compose, puis on éprouve. ⛔ Jamais un `insert` à la main qui poserait une nature que rien ne sait rendre.


### 13.11 Les QUATRE FAMILLES de natures, et ce qu'elles commandent

Les huit natures du § 13.10 ne forment pas une liste plate. Chacune appartient à une **FAMILLE**, qui dit ce que le bloc FAIT dans l'économie de la note — et c'est la famille, non la nature, qui commande la composition.

⚠️ **Pourquoi une famille plutôt que huit règles.** Une liste plate oblige à trancher huit fois, et rien n'y empêche deux natures voisines de recevoir deux compositions sans raison. La famille pose la règle une seule fois : **deux natures d'une même famille se composent de même, sauf raison NOMMÉE ; deux natures de familles différentes ne se composent jamais de même.** C'est en les rangeant qu'on a vu ce qui sépare réellement les deux renvois : non pas leur forme, qui est la même, mais leur DESTINATION.

| Famille | Ce que le bloc fait | Natures | Ce qu'elle commande à la composition |
|---|---|---|---|
| **ancrage** | ce à quoi la note TIENT | `lemma`, `source_locator` | discret, et en tête, sur la ligne du propos |
| **propos** | ce que la note DIT d'elle-même | `commentary` | la prose ordinaire, pleine mesure |
| **témoignage** | ce qu'elle RAPPORTE d'un tiers | `quotation`, `translation`, `attribution` | les marques de la citation : langue, retrait, filet |
| **renvoi** | ce vers quoi elle ENVOIE | `reference`, `internal_cross_reference` | la destination décide de la normalisation |

⛔ **L'ANCRAGE EN TÊTE NE FAIT PAS PARAGRAPHE.** Chez Faivre, « (V) pag. 178. — *Avec les démons les plus féroces* — On peut consulter… » tient sur **un seul paragraphe imprimé**. La passe 3 du protocole le fend en trois blocs, parce que ce sont trois fonctions ; mais fendre est une opération de STRUCTURE, et *une opération de structure ne doit pas se voir en lecture*. Les blocs d'ancrage qui OUVRENT une note se composent donc sur la ligne du propos, en repère discret, et non empilés au-dessus de lui. ⚠️ **En tête seulement** : un lemme qui reparaît au milieu d'une note y joue un autre rôle, et une note faite du seul ancrage se rend seule plutôt que de disparaître.

⛔ **DANS LA FAMILLE DU RENVOI, C'EST LA DESTINATION QUI COMMANDE.** Un renvoi vers le DEHORS (`reference`) se normalise : il a un auteur, un titre, un locus, et le site sait les composer. Un renvoi vers le DEDANS (`internal_cross_reference`) ne le peut pas — il n'a ni auteur ni titre — et le lui appliquer serait une CORRUPTION, non une maladresse : dans « Voyez la note I, p. 150 », le « I » est un numéro de note, que `normaliserReferencesDansTexte` convertirait en chapitre arabe. *Deux blocs de même apparence, deux traitements opposés : c'est la nature qui les départage, et rien d'autre ne le pouvait.*

⛔ **UNE NATURE INCONNUE NE FAIT PAS DISPARAÎTRE SON BLOC.** Le vocabulaire se lit avec indulgence : une valeur hors liste retombe sur `commentary` et le bloc reste LISIBLE, fût-ce sans sa composition propre. ⚠️ C'est le contraire du défaut payé quatre fois avec `NATURES_CORPS`, où le bloc s'évanouissait en silence. *Un vocabulaire en avance sur son rendu est un désagrément ; un texte qui manque à la page est une perte.*

### 13.11.1 Ce que le CODE porte depuis le 5 septembre 2026

⛔ **Le vocabulaire a une SOURCE UNIQUE, et elle est double par nécessité** : `app/lib/naturesNote.ts` et la contrainte `texte_note_blocs_kind_check`. Les deux se modifient ENSEMBLE, dans l'ordre du § 7.6 — la charte, la contrainte, le vocabulaire du code, la composition, l'épreuve à l'écran, et *seulement ensuite* on sème. Migration `sql/20260905_natures_bloc_note.sql`, retour arrière en regard.

⛔ **Le NUMÉRO AFFICHÉ se calcule à la lecture, jamais en base** (`app/lib/numerotationNotes.ts`) : `note_number` reste l'identité et l'ordre de lecture, dont dépendent 23 569 ancres, et `texte_note_ancres.marker` vaut exactement `[[note_number]]` — renuméroter en base, ce serait réécrire les deux et perdre l'ancrage.

⚠️ **La division d'une note ne se lit PAS dans `texte_notes.book`, qui la porte pourtant.** Mesuré le 5 septembre 2026 : sur les 23 729 notes du corpus, **8 580 (36 %, dans 39 textes sur 47) ont un `book` différent du `ref_niv1` du segment qu'elles ancrent** ; sur `A0044O0003TFR-V11`, les 1 830 notes diffèrent sans une seule exception. `book` est une métadonnée d'IMPORT ; la division est une propriété du texte SERVI. **C'est l'ancre qui fait foi**, et les 747 notes dont l'ancre ne porte aucun niveau 1 forment une série à part, comme les liminaires dans la numérotation des paragraphes.

⛔ **Le TYPE s'annonce dans l'en-tête de la fenêtre de note, et nulle part ailleurs** (`app/lib/typeNote.ts`) : « Note du traducteur 12 », « Apparat critique 7 ». ⚠️ **Il exige l'unanimité des blocs** : une note mixte — le commentaire de l'édition, puis le renvoi que NOUS ajoutons — n'annonce rien, car *mieux vaut « Note » qu'une attribution à demi fausse*. Le libellé nomme une RESPONSABILITÉ, jamais une position dans la page : « note de l'édition », et non « note de l'éditeur », que la maison d'édition et l'éditeur scientifique se disputent en français.

⛔ **L'ITALIQUE DE LA LANGUE ne porte que sur le bloc ENTIER**, celui dont `language` déclare la langue. Le latin ENCHÂSSÉ dans une note française — le cas le plus fréquent et le plus coûteux — n'est pas de ce ressort : aucune donnée ne dit où il commence, et le deviner au rendu italiserait du français. Il s'écrit par marqueur, dans le texte, à la passe 5.


### 13.12 Ce que l’auteur a TRANCHÉ le 5 septembre 2026

Douze questions posées dans `work/notes/QUESTIONS_NOTES_20260905.txt`, toutes MESURÉES sur le corpus réel avant d’être posées, et par les fonctions du site elles-mêmes plutôt que par une copie de leurs règles. Ce qui suit est la réponse de l’auteur : elle commande les passes du protocole. ⚠️ Aucune donnée n’a été écrite le jour de l’arbitrage — la charte d’abord (§ 7.6), la donnée ensuite.

**1. LES ITALIQUES DE L’OCR DEVIENNENT DES MARQUEURS.** 420 blocs de cinq textes portent dans `metadata.enrichments` les italiques, petites capitales et exposants relevés sur la page imprimée : **3 569 empans ancrés par offset**, et **aucune ligne du site ne les lit**. Ils se convertissent en `*italique*`, `++petites capitales++` et `^^exposant^^`, écrits dans le texte, que `rendreTexteEnrichi` compose déjà. ⚠️ Mesuré : **406 blocs sur 420 (96,7 %)** se convertissent sans réserve ; aucun de ces textes ne porte déjà `*`, `+`, `^` ni `<i>` ; **14 blocs** ont des empans qui se chevauchent et se relisent un par un. ⛔ C’est le § 13.11.1 pris par l’autre bout : *un champ que rien ne lit n’est pas une réserve pour plus tard, c’est une seconde vérité qui attend de contredire la première* — et celle-ci est le SEUL témoin des italiques de Faivre.

**2. UN RENVOI « RÉFÉRENCE IMPRIMÉE : » SE NORMALISE COMME LES AUTRES.** 4 883 blocs de 27 textes ouvrent sur ce préfixe (le protocole en annonçait 3 622, et le chiffre est rectifié) ; il se retire, `metadata.provenance_note` dit d’où vient le renvoi, et le texte passe par le normaliseur comme le reste du corpus. ⛔ **La provenance dit d’OÙ vient un renvoi, jamais qu’il doive garder sa graphie** : sans quoi le site écrirait « Ps. 5, 8. » ici et « Ps 5, 8 » partout ailleurs, pour la même référence. La leçon imprimée se conserve en `metadata`, ce qui rend la provenance vérifiable au lieu d’en faire une étiquette.

**3. LA LEÇON IMPRIMÉE SE CONSERVE QUAND LE CHANGEMENT DÉPASSE LA TYPOGRAPHIE**, et seulement alors : ponctuation finale ajoutée, abréviation développée, référence recomposée. ⛔ Jamais pour une espace fine. `normaliserTypographieLecture` ne change pas la longueur d’un texte, elle convertit un type d’espace ; conserver une leçon pour cela ferait de `metadata` un double du champ `text` sur des milliers de blocs, sans qu’aucune preuve y gagne. ⚠️ Repères mesurés : 6 431 notes sur 16 408 (39 %) reçoivent une ponctuation finale, 3 392 renvois sur 11 916 sont recomposés — ce sont ces blocs-là qui gardent leur leçon.

**4. UN RENVOI INTERNE SE RECONNAÎT À LA LECTURE, JAMAIS À SON MOT D’OUVERTURE.** Sur les 79 blocs qui ouvrent par « Voy. », « Voir » ou « Consulter », les uns renvoient à Paul Monceaux et à la *Revue d’histoire ecclésiastique*, donc hors de l’œuvre ; les autres à « la note L, tome I, p. 131 ». **Sept seulement nomment une note.** ⛔ « Il faut systématiquement faire un contrôle logique. Il faut que l’IA regarde de près ce qui est écrit et réfléchisse. On ne peut pas automatiser » (l’auteur). D’autant moins que ce renvoi devra un jour DÉSIGNER un segment de la même œuvre, parfois lointain : une cible fausse coûte plus qu’une cible absente.

**5. LE TYPE DE NOTE S’ATTRIBUE AU CAS PAR CAS**, et la charte porte la liste des types pour que l’identification ait une ligne directrice (§ 13.12.1). ⚠️ 16 873 blocs sur 24 264 (69 %) n’en portent aucun : c’est le plus gros manque de l’appareil.

**6. LA MENTION « (NOTE DU TRADUCTEUR.) » ÉCRITE EN CLAIR SE RETIRE** dès que le type est posé — 136 notes. « On transpose cette information dans la case dédiée » (l’auteur, confirmant le § 13.8). ⛔ Sans quoi le lecteur la lit deux fois, l’en-tête de la fenêtre l’annonçant déjà.

**7. LE LATIN ENCHÂSSÉ SE MET EN ITALIQUE** (§ 13.12.2).

**8. UN « IBID. » SANS AMONT SE DÉPUBLIE, PUIS SE CHERCHE.** 116 blocs ouvrent sur « ibid. » ou « id. » ; en remontant l’ordre de lecture, 43 trouvent leur œuvre dans la note qui précède, 60 en remontant de deux à douze notes, et **13 ne se résolvent par aucun moyen mécanique**. La marche arrêtée par l’auteur, dans cet ordre : **on les dépublie ; on cherche ensuite au cas par cas, au besoin dans le fac-similé ; on corrige si la réponse est trouvée, on reconstitue avec une note éditoriale si on le peut, on supprime si on ne le peut pas.** ⚠️ « Dépublier » n’existe pas encore pour une note : voir § 13.12.3.

**9. UN « IBID. » RÉSOLU SE COMPOSE ENTIER.** Le lecteur lira « Augustin, *La Cité de Dieu*, XI, 25 » et ne lira plus jamais « Ibid., 25 ». La forme imprimée se conserve en `metadata`, la règle 3 s’appliquant : le changement dépasse de loin la typographie.

**10. DES DEUX NOMS D’UNE MÊME MÉTADONNÉE, LE PLUS RÉPANDU SURVIT.** `human_validated` (14 000 blocs) contre `validated_human` (5 662) ; `reference_normalized` (1 682) contre `normalised_reference` (1 032). ⚠️ L’unification est sans risque, et c’est mesuré : les **901 blocs qui portent les deux premiers s’accordent tous**, sans une seule contradiction, et les deux seconds ne se rencontrent jamais sur un même bloc. ⛔ Et le nom retenu est déjà celui que le code lit (`lireMetadonneesBlocNote`) : le plus répandu n’est pas le plus régulier, mais il est le seul qui ne demande pas de toucher au rendu.

**11. LE MOTIF DU NORMALISEUR RECONNAÎT LE CHAPITRE ROMAIN EN MINUSCULES.** ⚠️ **Le § 13.8.1 annonce 1 716 renvois : le chiffre est FAUX**, et la mesure du 5 septembre 2026 le rectifie — **355 occurrences** de la forme « <mot>. <romain minuscule>, <nombre> », dans 355 blocs et 14 textes, dont **223 seulement seraient réécrites**. ⛔ Le risque est borné par le motif lui-même : il n’agit que si le mot qui précède résout vers un livre du référentiel, et « Cor. » (58 occurrences), « Ibid. » (26), « Thess. » et « Eccl. » en sont volontairement absents comme équivoques. Vérifié sur la vraie fonction : « Cor. XV, 22 » et « Ibid. V, 12 » ne bougent pas. ⚠️ Chaque bloc touché se signale, pour un contrôle par sondage.

✅ **SERVI le 5 septembre 2026**, et la mesure sur le corpus a fait paraître une borne que la charte ne portait pas. Le motif élargi rend **264 réécritures neuves et n’en perd aucune** ; les 235 formes distinctes ont été relues une par une, et toutes sont justes.

⛔ **AUCUN LIVRE DU CANON N’A PLUS DE 150 CHAPITRES**, le Psautier étant le plus long. Un nombre au-delà ne désigne donc rien : c’est le signe que le motif a lu comme un chiffre romain ce qui n’en est pas un. Sans cette borne, l’élargissement fabriquait **six corruptions** — « na m. 2 » rendu « Na 1000, 2 », et « Psalm. 77. » rendu « Ps 1000, 77 », où le « m » d’un mot est pris pour mille. ⚠️ Elle ne coûte rien à l’existant : des 4 038 réécritures d’avant, **pas une** ne dépassait 150.

⚠️ **LE MOTIF RECULE DANS LE MOT QUI PRÉCÈDE, et il faut le lui laisser.** C’est ce recul qui rend « Abdi. 1 » lisible — « Abd » et « i » font Abdias, chapitre 1, et le livre n’en a qu’un. Le lui interdire par un groupe atomique paraissait le remède au « Psalm. 77 » ; mesuré, cela coûterait **treize réécritures justes** et n’écarterait aucune corruption que la borne n’écarte déjà. *Une garde se choisit sur ce qu’elle coûte, non sur ce qu’elle a l’air de protéger.*

⚠️ **Trois sources sont elles-mêmes fautives, et le normaliseur les recopie fidèlement** : « I Cor. xxv, 24 » (la première épître aux Corinthiens n’a que seize chapitres), « I Thess. vi, 12 » (cinq chapitres), « Ap. v, 15 » (le chapitre 5 n’a que quatorze versets). ⛔ On ne CORRIGE pas une référence : on la recompose. Ce sont trois cas pour le sondage, non trois défauts du motif.

**12. LE RÉFÉRENTIEL D’ABRÉVIATIONS ACCUEILLE LES VARIANTES NON ÉQUIVOQUES**, une à une, chacune vérifiée sur ses occurrences réelles : « Ephés. », « Ephes. », « Math. », « Galat. », « Apocal. », « Nomb. », « Sag. ». ⛔ Les équivoques restent dehors, et la charte l’a déjà tranché : « Cor. », « Thess. », « Eccl. », « Tim. », « Par. ».

**13. LE JOURNAL D’ATELIER DE `metadata` RESTE EN BASE, MAIS LA PAGE CESSE DE LE TRANSPORTER.** `metadata` porte plus de 150 clés distinctes, pour l’essentiel un journal de travail daté (`facsimile_pixel_review_20260903`, `p3_canonicalization_audit_20260904`…), et **554 blocs y portent une copie complète d’un bloc** — `text`, `kind`, `form`, `rank`, `language` et le reste, tous à 554. Le site n’en lit que quatre scalaires, mais le `jsonb` ENTIER voyage jusqu’au navigateur, pour 24 264 blocs. ⛔ **On restreint donc la LECTURE aux clés qu’on projette** : gain sans arbitrage, sans toucher une donnée. ⚠️ Le journal lui-même appartient à GPT, et l’auteur ajoute qu’**il faut le supprimer s’il ne sert à rien** : la décision lui revient. ⛔ Les 554 copies de bloc, elles, sont une seconde vérité au sens de la charte et se regardent à part.

### 13.12.1 Les CINQ TYPES de note, et comment les reconnaître

Demandé par l’auteur le 5 septembre 2026 : « Il faut évidemment lister les types de notes dans la charte pour que GPT, qui fera ce travail d’identification, ait une ligne directrice. » Le type vit dans `metadata.editorial_role`, jamais dans le texte du bloc.

| `editorial_role` | Ce qu’il dit | Ce que le lecteur voit |
|---|---|---|
| `author_note` | la note est de l’AUTEUR ancien lui-même | Note de l’auteur |
| `translator_note` | elle est du TRADUCTEUR | Note du traducteur |
| `source_editorial_note` | elle est de l’ÉDITION dont le texte est tiré | Note de l’édition |
| `corpus_editorial_note` | elle est de NOUS | Note de Corpus Scriptura |
| `critical_apparatus` | c’est une entrée d’apparat critique (§ 22) | Apparat critique |
| *(absent)* | on ne sait pas | Note |

**Les repères, dans l’ordre où ils tranchent :**

- `translator_note` — elle parle de la LANGUE et de son propre travail : « nous avons traduit », « le mot grec », « notre version », « littéralement ». C’est la seule voix qui se justifie d’un choix de mot.
- `source_editorial_note` — elle DOCUMENTE : elle date, situe, identifie un personnage, renvoie à la littérature savante, cite une édition. C’est le cas ORDINAIRE d’une édition du XIXe siècle, et donc le lot par défaut d’un texte entier.
- `author_note` — elle parle depuis le temps de l’ŒUVRE : elle renvoie à un autre endroit du même ouvrage, elle ne peut nommer aucun auteur postérieur. ⛔ Ne pas la confondre avec le fait que l’auteur parle dans le TEXTE : ce qui est en cause est qui a écrit la NOTE.
- `corpus_editorial_note` — **elle n’existe que si nous l’avons écrite.** ⛔ Jamais attribuée à une note importée, si utile soit-elle.
- `critical_apparatus` — la notation philologique, hors de toute passe de normalisation (§ 13.9, § 22).

**La méthode, arrêtée avec l’auteur : EN LOT PAR TEXTE, SAUF EXCEPTIONS NOMMÉES.** Une édition a un responsable, et ses notes sont de lui. Mesuré en cherchant les notes qui trahissent une seconde voix : **34 textes (10 348 blocs) n’en portent aucune** et se traitent d’un coup ; **10 textes (6 525 blocs) en portent au moins une** et demandent la lecture. Sortent du lot pour être jugés à part : les blocs qui disent « nous », ceux qui nomment le traducteur, ceux qui portent déjà leur type en clair. Un sondage de contrôle ferme chaque texte.

⛔ **UN TYPE FAUX EST PIRE QU’UN TYPE ABSENT** : il attribue à un Père une remarque de son traducteur du XIXe siècle. Le doute laisse la note sans type, et se signale.

⚠️ **Le type se pose sur le BLOC ; la note ne l’ANNONCE que si tous ses blocs s’accordent** (§ 13.11.1). Une note mixte — le commentaire de l’édition, puis le renvoi que nous ajoutons — n’annonce rien, et vaut mieux ainsi.

⚠️ **« Note de l’édition », et non « note de l’éditeur »** : le libellé nomme une RESPONSABILITÉ, et « éditeur » se dispute en français entre la maison qui publie et le savant qui établit.

### 13.12.2 L’ITALIQUE du latin enchâssé

⛔ **Le latin cité DANS une note française se compose en italique.** Décision de l’auteur du 5 septembre 2026 : « Il faut simplement le mettre en italique. GPT s’en chargera. » Le § 13.8 réglait le bloc entièrement latin ; celui-ci règle le cas le plus fréquent, et le plus coûteux.

- ⛔ **Il s’écrit par MARQUEUR, dans le texte** (`*…*`), jamais par un offset ni par une devinette au rendu. Aucune donnée ne dit où le latin commence : le deviner italiserait du français, et la charte a déjà écarté cette voie (§ 13.11.1).
- ⛔ **C’est une LECTURE, non une passe mécanique.** On ne reconnaît pas une langue à un dictionnaire de mots courts, et une phrase française porte assez de mots d’origine latine pour qu’un automate s’y trompe à chaque page.
- ⚠️ **Une abréviation de renvoi n’est pas du latin CITÉ** : « ibid. », « id. », « op. cit. », « cf. », « passim » sont des conventions bibliographiques et ne s’italisent pas. Ce qui s’italise est ce que l’auteur ou l’éditeur CITE en latin.
- ⛔ **Ne pas cumuler avec l’italique de la langue.** Un bloc entièrement latin est italisé au RENDU, sur `language = 'la'`, et son texte ne porte aucun marqueur : l’écrire des deux façons ne se verrait pas à l’écran et laisserait deux vérités.
- ⚠️ **Le grec ne suit pas** : son alphabet le distingue déjà, et l’italique y déforme la lettre au lieu de changer la graisse (§ 13.8).
- ⚠️ **Sur les cinq textes enrichis, l’imprimeur a déjà fait le travail** : la règle 1 rend l’italique de Faivre, dont une part est du latin — 2 341 empans dans le seul `A0044O0003TFR-V11`. Ailleurs, il faut lire.

### 13.12.3 Ce qui reste OUVERT

⚠️ **LA FENTE DU BLOC À TROIS TÊTES ATTEND UNE SÉANCE À PART.** 396 blocs de Faivre agglomèrent dans un seul paragraphe une coordonnée imprimée, un lemme et un commentaire : « (V) pag. 178. — Avec les démons les plus féroces. On peut consulter… ». La passe 3 les fend en trois blocs, et la question est de savoir SUR QUOI. Fendre sur la PONCTUATION est une supposition : on parie que la première phrase après le tiret est le lemme. Fendre sur l’ITALIQUE est un fait relevé : Faivre imprime son lemme en italique, et l’OCR en a gardé les bornes. Mesuré : **une italique ouvre juste après le tiret dans 378 blocs sur 396 (95,5 %)** ; et une fois rejoints les empans que l’OCR coupe en fin de LIGNE IMPRIMÉE (24 blocs sont dans ce cas), **345 sur 378 (91,3 %) se ferment sur une ponctuation forte, celle-ci comprise DANS l’italique**, comme l’imprimeur l’a composée. ⛔ Rien ne s’écrit tant que l’auteur n’a pas tranché : « C’est un cas particulier. On va en discuter spécialement ensemble. »

⚠️ **« DÉPUBLIER » N’EXISTE PAS ENCORE POUR UNE NOTE**, et la décision 8 le demande. `texte_note_blocs` porte `needs_review`, que la charte tient pour un signal de prudence et qui ne masque rien par lui-même ; aucune colonne, aucune métadonnée lue par le site ne retire un bloc de la lecture. ⛔ Le mécanisme se pose AVANT la passe, non pendant, et il vaudra pour tout bloc qu’on voudra retenir — non pour les seuls treize « ibid. » orphelins.

⚠️ **Le RENVOI INTERNE reste un texte, non un lien.** La nature `internal_cross_reference` existe (§ 13.10) et sépare déjà ce qui pointe au dedans de ce qui pointe au dehors ; mais rien ne DÉSIGNE encore le segment ou la note visés. La décision 4 le prépare — on lit, on juge, on range — et la cible se posera quand le modèle saura la porter.

### 38.21 La LACUNE du témoin garde ses CROCHETS, et les met en forme

Demande de l’auteur, 2026-09-05 : « les “lacunes” doivent être mises en forme : corps légèrement plus petit, léger espace avant et après les crochets, ocre ou maroquin ». Elles s’imprimaient BRUTES dans la traduction moderne de la Bible du XIIIᵉ siècle, où la donnée écrit « […] » quarante-six fois et « [lacune : motif] » neuf fois.

⛔ **Le manque se dit ENTRE CROCHETS**, dans les DEUX membres de l’édition. C’est le signe que la philologie donne depuis toujours à ce qu’un témoin a perdu, et c’est celui que la donnée écrit déjà ; les chevrons « ⟨ Lacune ⟩ » de la colonne du manuscrit y reviennent, de sorte que le même fait se dise du même signe des deux côtés d’une seule édition. Le motif exact — déchirure, fin du manuscrit — reste à l’infobulle, jamais à l’écran.

**La forme** : un cran sous le texte qui l’entoure (0,85 em), l’OCRE des absences, et un léger air de part et d’autre. ⚠️ **Cet air est une MARGE, non une espace du texte.** Une espace serait une occasion de couper la ligne entre le crochet et le mot qui le précède, et elle s’emporterait en copiant le verset ; la marque se garde d’ailleurs d’un seul tenant. ⚠️ La FINE insécable demeure, et pour son seul office : quand la lacune coupe un MOT (« por[…]er »), elle sépare la marque du fragment resté collé, sans l’attacher ni le détacher comme un mot entier.

⛔ **UNE TRADUCTION NON RECOMPOSÉE NE PASSE PAS PAR LE TOKENISEUR DU TÉMOIN.** Celui-ci tolère un crochet fermant orphelin, parce que la recomposition par créneau canonique coupe un marqueur en deux ; la traduction moderne, elle, porte QUATRE-VINGT-CINQ RESTITUTIONS entre crochets (« il [m’exauça] »), qui sont l’usage philologique et doivent s’imprimer telles quelles. Le tokeniseur y verrait autant de fermetures et griserait tout ce qui les précède. On ne reconnaît donc, dans un texte non recomposé, que la LACUNE, et par PAIRES COMPLÈTES.

⚠️ **Le crochet fermant d’une lacune nue n’est pas une fermeture orpheline**, et c’est le défaut que la mise en forme a fait paraître : un verset qui s’ouvre sur « […] » basculait TOUT ENTIER en lecture incertaine. Le début d’un verset se juge donc sur le premier TOKEN, jamais sur la première occurrence d’un crochet.

⚠️ **RESTE À TRANCHER, et c’est une affaire de DONNÉE.** Six cent cinquante-deux versets de cette traduction portent « [lecture incertaine : … ] » et s’impriment bruts, avec une douzaine d’étiquettes de plus que le vocabulaire du témoin ne connaît pas — « lecture difficile », « Fragment », « Suite incertaine », « Suite corrompue », « Restitution incertaine », « Passage altéré », « reprise ». Les rendre demande de savoir les distinguer d’une restitution, ce qui ne se devine pas ; et soixante versets y portent des crochets déséquilibrés, donc des marqueurs à cheval. ⛔ Rien n’a été fait de ce côté sans arbitrage.

### 38.22 Le panneau de FILTRES — la rubrique en marge, et un filtre qui agit se MONTRE

Demande de l’auteur, 2026-09-05 : revoir les filtres de la bibliothèque, en termes esthétiques et pratiques.

⛔ **UNE RUBRIQUE DE FACETTE SE POSE EN MARGE, ELLE NE COIFFE PAS SON RANG.** Les trois rubriques se posaient en bannière CENTRÉE au-dessus de leurs pastilles : trois titres empilés faisaient du panneau une page de titre à trois titres, et chacun coûtait une ligne entière pour un mot de neuf pixels. ⛔ Et les pastilles centrées n’offraient AUCUN BORD GAUCHE où l’œil revienne — cinq larges, deux étroites, sept larges, chaque rang ragué des deux côtés. La rubrique passe donc au fer à droite d’une colonne étroite, les pastilles au fer à gauche, et le panneau perd deux cinquièmes de sa hauteur sans rien retrancher.

⚠️ **Elle se pose sur la LIGNE DE BASE de la première pastille, jamais sur le milieu de sa boîte** : deux corps différents centrés l’un sur l’autre font flotter le plus petit au-dessus de la ligne de l’autre. C’est la grille qui l’aligne, sans un pixel écrit — la règle est déjà celle du lien de la carte de traduction (§ 38.5).

⛔ **UN FILTRE QUI AGIT SE MONTRE.** Refermer le panneau ne laissait qu’une pastille de compte sur le bouton : on savait qu’il agissait deux filtres, jamais LESQUELS, et « Effacer » devenait hors d’atteinte. Les filtres retenus se rappellent donc sous la barre de recherche, chacun retirable d’un clic. C’est la même règle qui garde déjà visible, dans le panneau, une facette active qui ne rendrait rien : *on ne cache jamais un filtre qui agit, sans quoi le lecteur ne sait plus pourquoi sa liste est courte.* ⚠️ Ce rappel ne se double pas du panneau OUVERT, qui montre déjà les mêmes pastilles à l’état actif.

⛔ **ET LE BOUTON CESSE DE COMPTER CE QUE LES JETONS NOMMENT** : « ❷ » se lisait à quarante pixels des deux jetons, soit deux comptes de la même chose sur une seule ligne, dont l’un ne dit pas lesquels. Ce que le bouton doit encore porter — qu’un filtre agit — son encre et son filet le disent.

**La page ne disait nulle part combien d’auteurs répondent** : seul le pied « Page 1 sur 3 » le laissait deviner, et le total ne se lisait qu’en tournant les pages jusqu’au bout. Une ligne discrète le dit dès qu’une recherche ou un filtre restreint la liste — « Trois auteurs sur quinze » —, et elle donne le total au passage. ⛔ Elle ne paraît PAS quand rien ne restreint : un compte qui ne bouge jamais n’est pas une information (§ 38.12).

⚠️ **« Tout effacer » se range sous la COLONNE DES PASTILLES**, non au bord du panneau : posé au fer à gauche sous trois rangs qui commencent cinq rem plus loin, il ne se rattachait à rien et faisait un objet de plus en bas d’écran.

⚠️ **La forme de la pastille s’écrit UNE fois** et sert les deux surfaces, celle où l’on choisit et celle où l’on retire : deux définitions d’un même objet divergent au premier réglage. Et son COMPTE se lit — il était deux rangs sous son libellé et à demi effacé, quand c’est lui qui dit qu’un filtre ne servira à rien avant qu’on l’essaie.

### 38.23 Des requêtes qui ne s’ATTENDENT pas partent ENSEMBLE

Relevé de l’auteur, 2026-09-05 : « le temps d’affichage me paraît un peu lent » sur l’onglet « Catalogue des traductions ». Mesuré : **1 807 ms** avant que la liste paraisse, en **quatre allers-retours EN SÉRIE** — la session, puis trois pages de notices, puis les votes — dont **aucun n’avait besoin de ce que le précédent rapportait**. Lancés ensemble : **932 ms**.

⛔ **Une cascade se juge sur les DÉPENDANCES, non sur l’ordre où l’on a écrit les lignes.** C’est la règle déjà payée sur la page Bible (§ « le coût, c’est le NOMBRE d’allers-retours ») et sur la page d’œuvre ; elle vaut à l’identique pour une liste chargée par le navigateur. Une requête n’attend que ce qu’elle CONSOMME.

⚠️ **Le plafond de PostgREST est de mille lignes, et il ne se contourne pas** : pour 2 499 notices, trois pages sont inévitables. Ce qui ne l’était pas, c’est qu’elles s’attendent.

⛔ **Une page SPÉCULÉE au-delà de la fin n’est pas gratuite.** Une pagination par tranche ne sait jamais d’avance combien de pages elle aura : demander une vague en parallèle, c’est parier. Or sur une vue qui CALCULE ses colonnes, le nœud de calcul s’exécute pour toutes les lignes jusqu’à la borne haute avant de n’en rendre aucune — mesuré, 569 ms pour une page qui ne rendrait rien. La vague se taille donc sur la liste qu’on charge, jamais « large pour être tranquille », et l’on n’en demande une seconde que si la dernière page revenue était PLEINE, c’est-à-dire sur une preuve.

⛔ **ON NE DEMANDE PAS DEUX MILLE CINQ CENTS IDENTIFIANTS POUR EN RAPPORTER TROIS.** La table des votes en compte trois, et sa politique de lecture est déjà publique : la clause `in.(…)` pesait douze kilo-octets d’adresse. ⚠️ Et elle était plus fragile qu’il n’y paraît — PostgREST renvoie l’adresse ENTIÈRE dans son en-tête de réponse, si bien qu’un client node refuse déjà la réponse pour dépassement d’en-tête. Un navigateur tolère davantage ; la clause était à un millier de notices de casser, et sans un mot. C’est la règle des lots d’une clause `in`, prise par l’autre bout : *quand le filtre coûte plus cher que ce qu’il écarte, on ne filtre pas.*

⛔ **UNE PANNE SE DIT.** Les quatre requêtes de cet onglet ne lisaient jamais leur `error` : un échec s’y rendait « Aucun auteur ne correspond à ces critères », c’est-à-dire un catalogue vide donné pour un catalogue sans réponse. C’est la règle déjà écrite pour la carte « Bibliothèque » du compte — *un panneau discret journalise son erreur, sans quoi rien ne distingue « vide » de « cassé »* — et le remède est le même : le chargeur lève, la page le dit, et propose de réessayer.

⚠️ **Ce que l’audit a démenti, et qui vaut d’être écrit.** Le regroupement de 2 499 notices à chaque rendu — deux mille `localeCompare` en français, sans collateur réemployé — était le premier suspect. Mesuré : **3 ms**, et un `Intl.Collator` gardé sous la main n’y change rien, le moteur le mettant déjà en cache. *Un soupçon de lenteur se mesure avant d’être corrigé : celui-là aurait coûté une refonte pour trois millisecondes.*

⚠️ **Et ce qui reste, qui est de la BASE.** Les trois colonnes de date de la vue du catalogue coûtent à elles seules **1,3 s** sur les trois pages : cinq fonctions PL/pgSQL, aucune sous-expression partagée — la même est calculée deux fois par ligne — pour 515 dates distinctes sur 2 499 lignes. Deux barrières d’optimisation suffiraient à la faire tomber de 597 à 148 ms, le planificateur y ajoutant de lui-même un cache par valeur. Éprouvé, à l’identique au caractère près sur les 2 645 lignes ; non appliqué, faute d’arbitrage.

⚠️ **Comment on mesure une liste chargée par le NAVIGATEUR** : depuis le poste, en rejouant ses requêtes exactes. Le chemin réseau est le même que celui du lecteur, puisque c’est son navigateur qui parle à la base — à la différence d’une page servie, où il faut mesurer en ligne (§ 18).

### 38.24 La fiche d’une ŒUVRE porte une FRISE, et un sommaire vide ne paraît pas

Trois demandes de l’auteur, 2026-09-05.

⛔ **LA FICHE D’UNE ŒUVRE PORTE UNE CHRONOLOGIE, ET C’EST CELLE DE SON AUTEUR.** Il n’y en a pas d’autre : douze événements sur 1 346 nomment une œuvre, **un seul par œuvre**, et une frise d’un point n’est pas une frise. Mais la question qu’on pose à cette fenêtre — *où ce livre tombe-t-il ?* — se répond précisément là, entre la naissance et la mort de celui qui l’a écrite.

⚠️ **La ligne qui nomme l’œuvre lue s’y DÉTACHE**, à l’accent et à la graisse — le marqueur de l’entrée active d’un sommaire, et rien de plus. Sans elle, la fiche de l’œuvre montrerait la fiche de l’auteur et ne répondrait à rien. ⛔ La chronologie OUVRE la colonne de droite, comme dans la fiche d’une traduction : on situe avant de documenter ; et elle ne paraît pas quand l’auteur n’en a pas.

⚠️ **Le champ existait et rien ne le lisait.** Les deux vues de chronologie portent `oeuvre_id` depuis l’origine ; aucune ligne du site ne l’avait jamais demandé. *Un champ qu’aucune surface ne lit n’est pas une réserve pour plus tard : c’est une porte qu’on a oublié d’ouvrir.*

⛔ **UN SOMMAIRE QUI N’A RIEN À SOMMER NE PARAÎT PAS.** Le volet de lecture posait la rubrique « SOMMAIRE » et, dessous, la mention « Texte complet » : une rubrique qui annonce une table des matières, et une ligne qui dit qu’il n’y en a pas. Deux objets pour rien, et ils s’en vont ensemble. L’apparat critique prend alors toute la hauteur du volet, son plafond de moitié ne partageant plus avec personne.

⚠️ **La règle porte sur le CONTENU, non sur le mode de lecture**, et la distinction n’est pas de forme. Le cas se rencontre aujourd’hui en TEXTE ENTIER — une seule œuvre publique, « De la vanité des idoles » — mais un texte sans niveaux le rendrait tout aussi absurde ailleurs. ⛔ Et l’on ne retire pas le sommaire du mode « texte entier » : **vingt-trois œuvres s’y lisent AVEC le leur**, dont l’Apologétique (52 chapitres) et les Homélies sur la Genèse (68), où il est la seule navigation — c’est même son unique office là, puisque tout est déjà chargé dans la page.

⛔ **UNE SOURCE NUMÉRIQUE NE DONNE QUE LE NOM DU SITE** (« toujours illisible ; se contenter de donner le nom du site »). Le champ n’est pas un nom mais une PHRASE — le site, puis ce qu’on y a pris : « eBible.org — corpus BibleNLP, édition fra-fraLSG » —, et dans la colonne étroite d’une fiche elle ne se lit pas.

⛔ **Et ce nom n’est PAS l’hôte de l’adresse.** Trois des sept sources du corpus sont hébergées sur un même dépôt public, où le lecteur ne reconnaîtrait aucun des trois sites. C’est le DÉBUT du nom qui nomme, la suite qui précise ; l’hôte ne sert que de dernier repli, quand aucun nom n’est écrit. ⚠️ La coupe se fait sur un séparateur EXPLICITE — le tiret, ou l’incise « , d’après … » —, jamais sur une position ni sur la première virgule : « Gallica, Bibliothèque nationale de France » porte la sienne dans son nom même.
