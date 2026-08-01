# Charte éditoriale et technique de Corpus Scriptura

Cette charte est la seule version normative. Elle décrit l’état voulu du corpus, de la base et des procédures. Les journaux de chantier, bilans chiffrés, listes d’œuvres traitées et anciennes décisions ne lui appartiennent pas.

En cas de divergence entre une habitude, un script ancien et cette charte, la charte prévaut. Si le schéma de base ou le code ne permet pas encore d’appliquer une règle, on corrige d’abord l’outil. On ne dégrade jamais les données pour les adapter à un outil obsolète.

## 1. Principes directeurs

### 1.1 Fidélité

Le corpus publie des éditions identifiées. Il conserve leurs mots, leur ordre, leur langue et leurs particularités significatives. On corrige une faute certaine d’OCR ou une coquille manifeste en la confrontant à la source. On ne modernise ni le vocabulaire, ni la syntaxe, ni l’orthographe historique par convenance.

Une forme surprenante n’est pas une erreur par elle-même. En cas de doute, consulter le fac-similé ou le document source, conserver la leçon attestée et signaler l’incertitude dans le dossier de travail.

### 1.2 Complétude

L’objectif est une œuvre intégrale. Les contrôles portent sur les commencements, les fins, les changements de page, les divisions, les notes et les endroits où l’OCR saute facilement une ligne. Une lacune matérielle ne se comble pas par invention.

### 1.3 Séparation des phases

Le travail éditorial et la constitution des liens bibliques sont deux phases distinctes.

1. La phase A établit le texte, les métadonnées, la structure, les paragraphes, les rangs, les pages, les notes et, le cas échéant, le texte original parallèle.
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

### 2.3 Répertoire autorisé

Le dépôt de travail est `C:\Corpus Scriptura\bible-patristique`. Les sources peuvent être lues à leur emplacement explicite, mais les artefacts, sauvegardes et scripts du chantier sont conservés dans le dépôt.

Ne jamais utiliser OneDrive comme espace de travail, de cache, de sauvegarde ou de synchronisation. Un fichier explicitement fourni sur un chemin OneDrive peut être lu comme source, mais il doit être copié dans un dossier de travail local avant traitement.

### 2.4 Concurrence

Plusieurs agents ou applications peuvent travailler dans le dépôt. Préserver les modifications étrangères, éviter les réécritures globales sans nécessité et borner chaque script à l’œuvre ou aux lignes visées. Les mises à jour protégées comparent l’état attendu avant d’écrire.

## 3. Typographie et enrichissement

### 3.1 Règle générale

La typographie éditoriale est harmonisée sans réécrire la langue de l’édition. Les corrections mécaniques sont admises seulement lorsqu’elles sont univoques. Toute règle à faux positifs possibles exige une vérification contextuelle.

### 3.2 Espaces et ponctuation françaises

- Employer une espace insécable `U+00A0` avant les deux-points.
- Employer une espace fine insécable `U+202F` avant le point-virgule, le point d’exclamation et le point d’interrogation.
- Employer une espace insécable après le guillemet ouvrant `«` et avant le guillemet fermant `»`.
- Ne pas ajouter d’espace avant la virgule, le point ou les points de suspension.
- Conserver l’apostrophe typographique `’` dans le texte français normalisé.

Les espaces de bord des segments sont supprimées. La recomposition d’un paragraphe insère une espace simple entre deux segments, sauf lorsqu’un signe ou un balisage exige une jonction différente et contrôlée.

### 3.3 Guillemets

Le premier niveau français emploie `« … »`. Une citation enchâssée emploie `“ … ”` ou la forme attestée par l’édition si elle est cohérente. Les guillemets droits issus de l’OCR sont corrigés.

Un appel de note appartient au passage annoté et se place toujours avant le guillemet fermant : `les sarments[[3]] »`. Il ne se place jamais après `»`, `”` ou `"`.

### 3.4 Tirets et traits d’union

Le tiret demi-cadratin `–` sert aux incises et aux répliques lorsque l’édition en emploie. Le trait d’union `-` reste réservé aux mots composés, aux formes grammaticales et aux intervalles qui l’exigent. Le tiret cadratin `—` n’est conservé que s’il appartient réellement à l’édition ou à une convention spécifique documentée.

### 3.5 Titres

Un titre d’œuvre, un sous-titre ou un titre de niveau ne porte pas de point final. Les points internes et les points de suspension sont conservés. Les phrases explicatives associées à un niveau, dans les champs `_texte`, ne sont pas des titres et gardent leur ponctuation.

### 3.6 Enrichissement

Conserver les italiques, gras, exposants, petites capitales et autres enrichissements s’ils sont sémantiques ou éditoriaux. Employer le balisage déjà reconnu par l’application. Un balisage ne traverse jamais une limite de segment sans être fermé puis rouvert proprement.

La présence ou l’absence de guillemets, d’italiques ou d’autres marques ne suffit pas à déduire la forme littéraire de l’œuvre.

### 3.7 Contrôles anti-faux positifs

Ne jamais corriger automatiquement, sans contexte, une espace après apostrophe, un trait d’union, une répétition de mot ou une suite de capitales. Ces formes peuvent être légitimes. Les détections de mojibake, caractères de remplacement, balises orphelines et doubles espaces servent à produire des candidats, puis à les relire.

## 4. Lacunes, absences et alignement biblique

### 4.1 Lacune d’une œuvre

Si une page ou un passage manque matériellement, chercher une source fiable du même état éditorial. Tant que le texte n’est pas retrouvé, employer la nature `texte absent` et la mention neutre `Texte manquant`. Ne jamais produire un texte vraisemblable.

### 4.2 Créneau biblique sans texte

Dans une traduction biblique, une cellule vide signifie que l’édition n’a pas de texte pour ce créneau. Elle ne doit être remplie ni par une autre traduction ni par une reconstruction automatique. La numérotation native de l’édition reste distincte de l’alignement canonique.

Lorsqu’un verset source est réparti sur plusieurs créneaux canoniques, tous les fragments conservent exactement les mêmes coordonnées natives `ch_orig`, `v_orig` et `v_orig_suffixe`. Seuls `canon_id`, `canon_id_fin` et `ordre_slot` décrivent l’alignement.

## 5. Métadonnées et page de titre

### 5.1 Page de titre imprimée

La page de titre de l’édition n’est pas reproduite dans le corps de l’œuvre ni dans l’apparat critique. Ses renseignements utiles sont distribués dans les métadonnées de l’œuvre.

Une mention d’imprimeur, de lieu ou d’année, par exemple `De l’Imprimerie d’Antoine Vitré, 1649`, est conservée dans les données bibliographiques. Elle ne devient pas un segment d’apparat.

### 5.2 Titre et sous-titre

Le titre de l’œuvre appartient à `oeuvres.titre`. Il n’est pas répété comme `ref_niv1`. Le sous-titre appartient à `oeuvres.sous_titre`, même lorsqu’il est long. Les parties, livres, traités internes, chapitres et articles commencent seulement après cette distinction.

### 5.3 Notice

La notice doit identifier au minimum l’auteur, le titre, le traducteur ou éditeur lorsque connu, la date et le lieu de publication lorsque disponibles, ainsi que la source consultée. Les attributions discutées et remarques de traduction vont dans les champs de commentaire prévus, non dans le nom du traducteur.

La notice décrit l’édition réellement transcrite. Elle ne mélange pas les informations de plusieurs témoins sans les distinguer.

## 6. Structure, niveaux, paragraphes et rangs

### 6.1 Identité d’un segment

Chaque segment possède un `id`, un `id_oeuvre` et un `segment_numero` unique dans l’œuvre. `segment_numero` donne l’ordre global de lecture et reste stable autant que possible.

Le segment est une unité de sens destinée à recevoir, au besoin, un ou plusieurs liens précis. Une longueur proche de 300 caractères est un repère, jamais une loi. La syntaxe, l’argument et la citation priment. Ne pas produire de fragments dépendants du segment suivant pour être compris.

Une citation balisée forme normalement un segment avec sa formule introductive. Une citation exceptionnellement longue peut être découpée à une articulation interne sûre. Un vers ne fusionne jamais avec le vers suivant. Dans un dialogue, un changement de locuteur crée une frontière de paragraphe ; la nature ne doit injecter aucun tiret absent de la source.

Chaque segment textuel possède aussi :

- `paragraphe`, numéro du paragraphe dans son espace textuel et sa division ;
- `rang`, position du segment dans ce paragraphe, de 1 à k ;
- `page`, page de la source lorsque l’information est disponible ;
- `nature`, fonction éditoriale du segment.

Un paragraphe source peut contenir plusieurs segments pour permettre des liens fins. À l’affichage continu, ces segments sont recomposés dans l’ordre des rangs et forment un seul paragraphe visible.

La clé de regroupement n’est jamais `paragraphe` seul. Elle comprend :

1. `id_oeuvre` ;
2. l’espace textuel, parmi corps, introduction et apparat critique ;
3. les `ref_niv` qui délimitent réellement l’unité ;
4. `paragraphe`.

Un libellé visible `§ n` qui répète seulement le numéro de paragraphe ne crée pas une division supplémentaire. Une nature `citation` enchâssée reste dans l’espace du corps. Deux groupes non contigus ne sont jamais fusionnés mécaniquement sous prétexte qu’ils portent le même numéro.

Dans chaque clé composite, les rangs sont des entiers strictement positifs, uniques, continus et ordonnés `1…k`. Tous les segments d’un paragraphe à un seul segment portent `rang = 1`.

La numérotation des paragraphes suit la source lorsqu’elle existe. À défaut, elle est séquentielle dans chaque division. Dans un commentaire sélectif, elle peut reprendre le numéro du verset commenté ; des lacunes sont alors normales et ne doivent pas être comblées. Une œuvre ancienne dont paragraphes et rangs sont absents n’est jamais normalisée en copiant mécaniquement `segment_numero` ou une valeur constante : reprendre la source ou consigner la dette.

### 6.2 Niveaux de titre

Les champs `ref_niv1` à `ref_niv5` décrivent la structure éditoriale réelle de l’œuvre. Leur sens dépend de l’édition : partie, livre, homélie, chapitre, question, article ou autre division attestée. Le niveau 2 n’est donc pas nécessairement un paragraphe.

Le paragraphe appartient exclusivement à la colonne `paragraphe`. Il ne doit pas être recréé dans un `ref_niv`.

Les niveaux sont décidés après examen du sommaire et du fac-similé. Un niveau ne peut être inventé pour satisfaire l’interface. Le sommaire de l’application doit être construit à partir des niveaux réellement présents.

`ref_nivN` contient l’étiquette courte ou la clé du niveau. `ref_nivN_texte` contient, s’il existe, un complément éditorial ou un chapeau associé. Les appels de note sont admis et doivent être rendus consultables dans les titres et les champs `_texte`.

### 6.3 Modes d’affichage

L’interface offre un mode structuré qui navigue selon les niveaux disponibles et un mode texte intégral paginé qui ignore le découpage par `ref_niv1`. Ce second mode est nécessaire lorsque le premier niveau est trop fin ou ne représente pas une unité de lecture autonome.

Changer de mode ne change ni les données ni les paragraphes. La pagination d’interface n’est pas la pagination de la source.

### 6.4 Changements de page

Un changement de page ne crée ni paragraphe ni segment à lui seul. La colonne `page` indique la page où commence le segment. Si une phrase traverse une page, elle reste continue.

## 7. Natures de segment

Le vocabulaire éditorial autorisé est :

| Valeur | Usage |
|---|---|
| `texte` | prose principale |
| `citation` | citation longue ou bloc cité, lorsqu’une distinction d’affichage est utile |
| `lemme` | fragment cité servant de point de départ au commentaire |
| `vers` | versification réellement présente |
| `rubrique` | rubrique éditoriale qui n’est pas un niveau de titre |
| `dialogue` | réplique ou bloc dialogué lorsque la distinction est utile |
| `introduction` | texte liminaire conservé avant le corps |
| `apparat_critique` | préface éditoriale, avertissement, approbation, note longue ou autre paratexte conservé |
| `separateur` | héritage ancien seulement ; ne plus en créer pour représenter un alinéa |
| `texte absent` | lacune matérielle signalée sans invention |

Un titre structurel n’est pas un segment de nature `titre`. Il appartient aux métadonnées ou aux `ref_niv`.

Toute nature utilisée doit être acceptée par le schéma, l’importateur, les éditeurs et le rendu. Si un élément manque, synchroniser l’application avant l’import.

Les introductions et l’apparat restent de vrais segments : ils ont un `segment_numero`, un `paragraphe` et un `rang`. Leur numérotation de paragraphes vit dans un espace distinct du corps. L’interface peut les rendre hors de la pagination ordinaire, mais leur stockage obéit aux mêmes invariants.

## 8. Références bibliques présentes dans le texte

Une référence imprimée, une manchette ou un appel éditorial est d’abord une donnée de la source. Avant tout nettoyage visuel, elle doit être préservée dans la transcription ou consignée comme candidat de lien.

Pendant la phase A, les références restent dans le texte si leur retrait n’est pas explicitement prévu par le modèle d’affichage. Elles ne sont jamais supprimées avant extraction. Leur présence ne suffit pas à créer un lien vérifié : le numéro imprimé, l’abréviation et la cible doivent être contrôlés.

Les références dans les notes et l’apparat sont conservées. Elles ne génèrent pas automatiquement de liens pendant la phase A. Une passe distincte peut les traiter ultérieurement.

Les noms de livres suivent la table canonique du projet. Une abréviation non reconnue est résolue par le contexte et ajoutée au référentiel seulement si son sens est stable.

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

## 11. Format d’échange et import des œuvres

### 11.1 Colonnes d’un segment

Le format d’échange des segments comprend au minimum :

`id_oeuvre`, `segment_numero`, `segment_texte`, `ref_niv1` à `ref_niv5`, `ref_niv1_texte` à `ref_niv5_texte`, `paragraphe`, `rang`, `page`, `nature`, `notes`, `texte_original`.

Les colonnes de contrôle présentes dans le schéma peuvent être ajoutées lorsque le chantier les renseigne. Les liens bibliques ne sont pas importés dans ces colonnes : ils suivent leur propre phase et leur propre table.

Le CSV est encodé en UTF-8. Les retours de ligne internes, guillemets et séparateurs sont échappés selon la norme CSV. Un import ne doit jamais perdre silencieusement une colonne inconnue : il la refuse ou la signale avant écriture.

### 11.2 Préparation

Avant import :

1. valider l’identifiant de l’auteur et celui de l’œuvre ;
2. vérifier que l’œuvre cible n’existe pas avec des données à préserver ;
3. contrôler les métadonnées et la hiérarchie ;
4. contrôler l’unicité et l’ordre de `segment_numero` ;
5. contrôler les clés de paragraphes et les rangs ;
6. vérifier les notes et leur numérotation globale ;
7. recomposer le texte pour détecter pertes, doublons et inversions ;
8. effectuer des sondages contre la source.

### 11.3 Écriture

Importer par lots bornés. Une erreur arrête l’opération et déclenche le retour arrière du seul périmètre créé par l’import. Ne jamais supprimer une œuvre préexistante pour contourner un conflit d’identifiant.

Après import, relire toutes les colonnes critiques depuis la base et comparer les décomptes, les empreintes textuelles et des passages répartis.

## 12. Textes originaux parallèles

### 12.1 Principe

Le texte original grec ou latin est conservé sans traduction, normalisation ni réécriture. L’édition originale utilisée est identifiée dans les métadonnées ou la notice.

### 12.2 Alignement éditorial

Ne jamais supposer que les paragraphes, blocs HTML ou limites de chapitres de l’original coïncident avec ceux de la traduction. L’automatique ne produit que des candidats. L’alignement final est sémantique, avec relecture systématique des limites, des cas extrêmes et de sondages répartis.

Pour un paragraphe traduit réparti sur plusieurs segments, `texte_original` est placé uniquement sur le segment de `rang = 1`. Les rangs suivants restent à `null`. L’original associé au corpus doit se recomposer exactement, sans perte, duplication, normalisation ni changement d’ordre.

Une divergence de limite de chapitre peut être résolue en redistribuant le fragment continu vers le paragraphe traduit correspondant, à condition de conserver sa provenance et son ordre. Une impossibilité réelle d’alignement est signalée, non masquée par une association arbitraire.

## 13. Notes et apparat critique

### 13.1 Conservation

Les notes de l’édition sont conservées, sauf exclusion éditoriale explicite. Leur texte doit rester consultable depuis le corps, les titres, les sous-titres et les champs de niveau.

L’apparat critique, les préfaces éditoriales, approbations et avertissements conservés sont segmentés selon les mêmes principes que le corps. Ils utilisent leur propre espace de paragraphes et de rangs.

### 13.2 Numérotation

Les appels sont écrits `[[n]]`. Chaque note possède un numéro unique, continu et global à l’échelle de l’œuvre, tous champs affichables confondus. La numérotation ne recommence ni à une partie, ni à un livre, ni à une langue, ni à l’apparat.

Les numéros du fac-similé ne sont pas repris comme identifiants de stockage. Les notes sont renumérotées dans l’ordre de lecture de l’édition numérique.

Chaque appel possède exactement une note consultable et chaque note conservée possède au moins un appel légitime. Les appels dans les titres doivent être reconnus par le même mécanisme d’affichage que ceux du corps.

### 13.3 Placement

L’appel suit immédiatement le mot, le groupe ou le signe annoté, sans espace. Devant un guillemet fermant, il reste à l’intérieur. Son déplacement ne doit pas modifier la portée de la note.

## 14. OCR et relecture page par page

### 14.1 Extraction

Extraire le texte page par page en conservant un lien explicite entre page source et segments. Si le PDF contient une couche texte, la comparer à l’image. Si elle est mauvaise, effectuer un OCR contrôlé sur les pages concernées.

### 14.2 Relecture

La relecture vérifie notamment :

- lignes omises, répétées ou inversées ;
- mots coupés en fin de ligne ou de page ;
- confusions de caractères, ligatures et accents ;
- guillemets, apostrophes, ponctuation et espaces ;
- changements d’alinéa ;
- titres et niveaux ;
- appels et textes de notes ;
- italiques et autres enrichissements ;
- début et fin de chaque division.

Une passe page par page reste utile même après un bon OCR, car les erreurs de structure et les omissions ne sont pas toujours visibles par recherche automatique. De grands lots sont possibles si chaque page garde sa traçabilité et si des contrôles intermédiaires sont effectués.

### 14.3 Mot coupé

Réunir un mot coupé typographiquement en fin de ligne ou de page. Conserver un trait d’union lexical réel. En cas d’hésitation, consulter le contexte et un dictionnaire historique avant de décider.

Moderniser les caractères purement glyphiques lorsque l’identité du mot ne change pas : `s` long, ligatures et variantes de fonte. Cette opération ne permet pas de moderniser l’orthographe, les désinences, le vocabulaire ou la casse porteuse de sens.

## 15. Corpus biblique et traductions

### 15.1 Un créneau canonique, une lecture d’édition

L’ossature canonique sert à aligner les traductions. Elle ne remplace pas leur numérotation native. Une traduction ne reçoit dans un créneau que le texte attesté par son édition.

### 15.2 Intégrité

Pour chaque traduction, vérifier les livres, chapitres, versets, suffixes natifs, créneaux vides, versets soudés et versets scindés. Les contrôles comparent aussi le texte intégral et sa longueur, pas seulement le nombre de lignes.

### 15.3 Corrections

Une correction biblique est confrontée à l’édition source. Les cahiers de correction servent de liste de travail, non de preuve autonome. Sauvegarder les lignes touchées et vérifier que les coordonnées natives, le canon et les autres traductions n’ont pas changé accidentellement.

## 16. Auteurs, œuvres et catalogue

Les identifiants sont stables et ne sont pas recyclés. Supprimer une coquille vide ou une œuvre explicitement abandonnée exige de vérifier d’abord ses segments, liens, dépendances et statut de publication.

Publier une œuvre signifie que sa notice, son texte, sa structure et ses contrôles minimaux sont prêts. Dépublier ne détruit aucune donnée. La première date de mise en ligne reste attachée à l’édition en ligne et n’est pas réécrite lors d’une republication.

Les chiffres affichés par le site sont calculés à partir de l’état courant de la base. Ils ne sont jamais consignés en dur dans la charte.

## 17. Écritures, droits et sécurité

Les écritures sensibles passent par du code serveur qui vérifie le rôle de l’utilisateur. Le client ne constitue jamais une preuve d’autorisation. Les clés de service ne sont ni envoyées au navigateur, ni inscrites dans les journaux, ni copiées dans les documents.

Les comptes sont réservés aux personnes qui participent au projet. Les inscriptions seront ouvertes lors du lancement du site. Il est toutefois possible de demander un accès anticipé depuis la page de contact.

Les politiques RLS, routes administratives et fonctions `SECURITY DEFINER` suivent le moindre privilège. Une opération d’administration doit avoir un périmètre explicite et un résultat vérifiable.

## 18. Interface de lecture

L’interface rend fidèlement les titres, notes, paragraphes, textes originaux et appareils stockés. Elle ne compense pas des données manquantes par des heuristiques invisibles.

Le sommaire reflète les niveaux réellement présents. Les notes sont consultables dans tous les champs affichables. Les grandes œuvres se chargent par tranches sans réordonner les segments. L’ordre de référence est toujours `segment_numero`.

Les préférences d’affichage, dont le mode texte intégral, ne modifient jamais les données. Les pages de lecture restent utilisables sur desktop et mobile selon les règles du dépôt.

## 19. Modèle de données des œuvres

### 19.1 `oeuvres`

La table porte l’identité de l’œuvre, son auteur, ses titres, sa langue, ses données bibliographiques, son état de publication, sa notice et ses commentaires éditoriaux. Les champs spécialisés sont préférés aux concaténations ambiguës.

### 19.2 `segments`

La table porte le texte et sa structure. Les colonnes normatives principales sont celles du §11.1, complétées par les champs de contrôle du schéma. Les colonnes historiques de liens ne doivent plus être alimentées.

### 19.3 `liens_bibliques`

Chaque ligne associe un segment à une cible canonique et porte au minimum le type, la fiabilité, la provenance, le motif et l’état d’arbitrage. Une contrainte d’unicité doit empêcher les doublons exacts sans interdire plusieurs cibles légitimes pour un même segment.

### 19.4 Autorité du schéma

Avant de générer un import ou une migration, interroger le schéma actuel. Une liste de colonnes copiée depuis un ancien script n’est jamais une autorité. Tout changement de modèle est accompagné d’une migration versionnée, d’une mise à jour des importateurs et de tests.

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
- cohérence des pages et des limites de source ;
- présence du texte original seulement aux rangs autorisés ;
- invariants propres aux liens, s’ils font partie du périmètre.

Un contrôle doit distinguer erreur certaine, anomalie à examiner et dette connue. Il ne transforme pas une absence de donnée ancienne en erreur si la source n’a pas encore été reprise.

## 21. Contrôles aléatoires

Pendant une correction, une segmentation ou un import, effectuer périodiquement des sondages répartis entre le début, le milieu, la fin et les différentes divisions. Conserver la graine ou la liste des éléments tirés.

Comparer chaque échantillon à la source sur le texte, les paragraphes, les rangs, les titres, les pages, les notes et les enrichissements. Pour les liens, comparer aussi le contexte et la cible biblique.

Une erreur découverte n’est jamais corrigée isolément. Examiner les pages voisines et tous les éléments produits par la même règle depuis le précédent sondage. Augmenter la taille du contrôle si l’erreur peut être systématique.

Un dernier audit indépendant et des sondages finaux sont requis avant de déclarer l’œuvre propre.

## 22. Contrôle de l’apparat critique

L’apparat est contrôlé comme un corpus à part entière. Il doit avoir ses paragraphes et rangs, ses notes consultables, ses niveaux éventuels et sa place exacte dans l’ordre de lecture.

Ne pas confondre données bibliographiques, page de titre et apparat. Ne pas transformer une préface de l’auteur en préface éditoriale, ni l’inverse, sans preuve de l’édition.

Les références bibliques présentes dans l’apparat restent conservées. Leur constitution en liens est une sous-phase explicite de la phase B.

## 23. Protocole de modification

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

Avant toute mutation substantielle, exporter les lignes concernées avec leurs identifiants et toutes les colonnes susceptibles d’être touchées. La sauvegarde est datée, locale, lisible et placée dans `audit/` ou `tmp/`. Elle n’est pas stockée sur OneDrive.

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

## 26. Entretien de la charte

Une nouvelle règle doit être générale, testable et compatible avec les autres sections. Elle remplace la règle antérieure au lieu de s’ajouter comme amendement contradictoire.

Avant publication d’une nouvelle version :

1. sauvegarder la valeur active de `parametres.charte_ia` ;
2. vérifier les renvois de sections utilisés par le code et les consignes du dépôt ;
3. rechercher doublons de titres, valeurs obsolètes, chemins interdits, échappements littéraux et caractères corrompus ;
4. vérifier la cohérence avec le schéma et les importateurs ;
5. publier par mise à jour gardée ;
6. relire la valeur depuis la base et comparer son empreinte au fichier source.

Les exemples propres à une œuvre, les décisions datées et les statistiques vont dans des rapports séparés. La charte ne contient pas d’annexe historique.
