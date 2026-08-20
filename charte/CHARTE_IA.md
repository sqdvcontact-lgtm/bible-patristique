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
- Le texte en langue originale (latin, grec) reçoit la même harmonisation typographique : une espace fine insécable est ajoutée avant les deux-points, le point-virgule, le point d’exclamation et le point d’interrogation, ainsi qu’autour des guillemets, pour un couple bilingue homogène. La langue de l’édition n’est pas réécrite : l’harmonisation se fait au rendu (fonction `normaliserEspacesOriginal`, `app/lib/typographie.ts`).

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

### 5.4 Lecture assistée de la page de titre

La lecture de la page de titre peut être assistée par une intelligence artificielle de vision. Sa sortie est toujours un candidat, jamais une donnée validée : l'éditeur la relit avant tout usage, selon la doctrine du candidat exposée à la section 14.

L'assistant ne renseigne que ce qui est lisible sur la page et n'invente rien. Il rend les valeurs en forme normalisée : casse française ordinaire plutôt que capitales d'affichage, titres sans point final, graphies u et v régularisées. Cette casse est garantie par une normalisation déterministe qui n'agit que sur les champs entièrement en capitales.

L'enrichissement d'un champ non imprimé, tel que le titre original ou le nom complet de l'auteur et son identifiant, s'appuie d'abord sur le catalogue du projet, en lecture seule. À défaut de correspondance dans le catalogue, le champ reste vide. La connaissance générale du modèle ne sert jamais à combler une métadonnée.

Le traitement passe par l'abonnement, sans clé d'interface de programmation, et aucune donnée ne part sans consentement explicite. Toute clé d'accès à la base employée pour l'enrichissement demeure locale : elle n'est ni journalisée ni exportée.

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
| `introduction` | brève introduction ou argument placé en tête d’une division du corps, par exemple au début d’un chapitre |
| `apparat_critique` | partie liminaire conservée, préface, avertissement, épître dédicatoire, approbation, note longue ou autre paratexte |
| `separateur` | héritage ancien seulement ; ne plus en créer pour représenter un alinéa |
| `texte absent` | lacune matérielle signalée sans invention |

Un titre structurel n’est pas un segment de nature `titre`. Il appartient aux métadonnées ou aux `ref_niv`.

Toute nature utilisée doit être acceptée par le schéma, l’importateur, les éditeurs et le rendu. Si un élément manque, synchroniser l’application avant l’import.

Les introductions et l’apparat restent de vrais segments : ils ont un `segment_numero`, un `paragraphe` et un `rang`. Leur numérotation de paragraphes vit dans un espace distinct du corps. L’interface peut les rendre hors de la pagination ordinaire, mais leur stockage obéit aux mêmes invariants.

Les parties liminaires conservées forment un apparat critique et ne paraissent jamais dans le flux du texte. La nature `introduction` est réservée aux courts arguments ou chapeaux qui introduisent une division du corps et restent rattachés à celle-ci.

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

L’apparat critique, les parties liminaires, préfaces, épîtres dédicatoires, approbations et avertissements conservés sont segmentés selon les mêmes principes que le corps. Ils utilisent leur propre espace de paragraphes et de rangs et ne sont pas rendus dans le flux du texte.

### 13.2 Numérotation

Les appels sont écrits `[[n]]`. Chaque note possède un numéro unique, continu et global à l’échelle de l’œuvre, tous champs affichables confondus. La numérotation ne recommence ni à une partie, ni à un livre, ni à une langue, ni à l’apparat.

Les numéros du fac-similé ne sont pas repris comme identifiants de stockage. Les notes sont renumérotées dans l’ordre de lecture de l’édition numérique.

Chaque appel possède exactement une note consultable et chaque note conservée possède au moins un appel légitime. Les appels dans les titres doivent être reconnus par le même mécanisme d’affichage que ceux du corps.

### 13.3 Placement

L’appel suit immédiatement le mot, le groupe ou le signe annoté, sans espace. Devant un guillemet fermant, il reste à l’intérieur. Son déplacement ne doit pas modifier la portée de la note.

### 13.4 Structure interne et mise en forme sémantique

La mise en forme d’une note suit la fonction de ses éléments, non leur seule position dans la page. La prose de commentaire, les citations, les citations en vers et les références bibliographiques ou attributions doivent rester distinguables dans les artefacts de travail et les exports.

Lorsqu’une note contient une citation en vers, son caractère versifié est une donnée éditoriale. Conserver l’ordre des vers et leurs retours à la ligne ; un vers ne fusionne jamais avec le suivant. Le document de travail et le rendu appliquent à cette citation un style de note versifiée distinct de la prose environnante. Le balisage ou la structure qui porte cette distinction doit survivre jusqu’à la segmentation et à l’import.

Une référence bibliographique courte ou une attribution qui porte sur une citation est placée immédiatement après le passage qu’elle identifie, dans le même bloc logique. Une position isolée, centrée ou alignée à droite dans le fac-similé n’est pas reproduite lorsqu’elle relève seulement de la composition typographique. Le texte de la référence, son ordre et ses enrichissements sémantiques sont conservés.

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

Chaque unité conserve un lien stable avec la source : page pour un imprimé ; feuillet, face, colonne et ligne pour un manuscrit. Les identifiants suivent l’ordre matériel et ne sont jamais recréés pour satisfaire un comptage attendu.

Conserver, selon le cas :

- l’identité bibliographique ou la cote du témoin ;
- l’URL pérenne de la source ;
- les images réellement utilisées ;
- leurs dimensions et empreintes SHA-256 ;
- les bornes exactes du lot ;
- les scripts, conventions et rapports nécessaires à la reproduction du travail.

Ne jamais inventer une zone, une ligne ou une coordonnée absente. Une colonne vide ou partielle reste vide ou partielle.

### 14.3 Imprimés anciens

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

Réunir un mot coupé typographiquement en fin de ligne ou de page. Conserver un trait d’union lexical réel. Moderniser les caractères purement glyphiques lorsque l’identité du mot ne change pas, notamment le `s` long et certaines ligatures. Cette opération ne permet pas de moderniser l’orthographe, les désinences, le vocabulaire ou la casse porteuse de sens.

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

### 15.2 Intégrité

Pour chaque traduction, vérifier les livres, chapitres, versets, suffixes natifs, créneaux vides, versets soudés et versets scindés. Les contrôles comparent aussi le texte intégral et sa longueur, pas seulement le nombre de lignes.

### 15.3 Corrections

Une correction biblique est confrontée à l’édition source. Les cahiers de correction servent de liste de travail, non de preuve autonome. Sauvegarder les lignes touchées et vérifier que les coordonnées natives, le canon et les autres traductions n’ont pas changé accidentellement.

## 16. Auteurs, œuvres et catalogue

Les identifiants sont stables et ne sont pas recyclés. Supprimer une coquille vide ou une œuvre explicitement abandonnée exige de vérifier d’abord ses segments, liens, dépendances et statut de publication.

Publier une œuvre signifie que sa notice, son texte, sa structure et ses contrôles minimaux sont prêts. Dépublier ne détruit aucune donnée. La première date de mise en ligne reste attachée à l’édition en ligne et n’est pas réécrite lors d’une republication.

Les chiffres affichés par le site sont calculés à partir de l’état courant de la base. Ils ne sont jamais consignés en dur dans la charte.

### 16.1 Catalogue des traductions patristiques

La table `catalogue_notices` recense des traductions, éditions, témoins bibliographiques et composantes documentaires liés aux œuvres patristiques. Une notice n’est pas nécessairement un texte importable ni une œuvre publiée. Elle décrit un objet bibliographique contrôlé et conserve la trace des décisions prises sur cet objet.

`id_ligne` identifie la notice : il est unique, stable, jamais recyclé. `id_oeuvre_stable` rattache la notice à l’œuvre canonique. `id_traduction` identifie une traduction déterminée d’une œuvre déterminée. Un même `id_traduction` ne peut appartenir qu’à une seule notice active, c’est-à-dire non refusée administrativement. Un recueil commun à plusieurs auteurs reçoit donc un identifiant distinct pour chaque couple œuvre–traduction, même si le traducteur, l’édition et le volume sont communs.

Lorsqu’une traduction s’étend sur plusieurs volumes, une notice canonique peut regrouper l’ensemble. Un volume sans traduction autonome ne conserve pas d’`id_traduction` propre : il est relié à la notice canonique comme composante ou comme notice regroupée.

### 16.2 Statuts contrôlés et notes

Les statuts sont séparés de leur justification. Les colonnes terminées par `_code` ne contiennent que les valeurs contrôlées ci-dessous ; les colonnes terminées par `_note` conservent les explications, réserves, sources, décisions et détails bibliographiques. Une phrase libre ne doit jamais être inscrite dans une colonne de code. Un cas incertain reçoit `A_CONTROLER` ou `NON_DETERMINE` ; il n’est pas classé par intuition.

- `decision_import_code` : `IMPORTE`, `IMPORTER`, `IMPORT_PARTIEL`, `A_CONTROLER`, `BIBLIOGRAPHIE`, `CONSERVER`, `ECARTER`, `NON_DETERMINE`.
- `verification_code` : `NON_VERIFIE`, `REPERAGE`, `NOTICE_VERIFIEE`, `EXEMPLAIRE_VERIFIE`, `TEXTE_VERIFIE`, `CONTROLE_COMPLET`, `CONTROLE_NEGATIF`.
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
- `CONTROLE_NEGATIF` : la recherche a établi l’absence, la fausse attribution, le doublon ou l’inadéquation de l’objet recherché.

La présence d’une URL ne suffit jamais à promouvoir une notice. Toute promotion à `TEXTE_VERIFIE` exige une note indiquant ce qui a été contrôlé et par rapport à quelle édition. Un statut supérieur remplace le statut inférieur ; les détails des étapes précédentes demeurent dans `verification_note` et les notes de source.

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

### 16.7 Traducteurs et formes d’autorité

Le champ `traducteur` conserve la formulation bibliographique ou éditoriale rencontrée dans la source, y compris les réserves, responsabilités secondaires et indications de répartition. `traducteur_uniformise` ne contient que la forme d’autorité retenue pour le ou les traducteurs : un nom pour une personne, plusieurs noms séparés par ` ; ` lorsqu’ils partagent la responsabilité. Les mentions de direction, édition, introduction, révision, annotation ou mise en ligne ne sont pas intégrées à ce champ.

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

## 17. Écritures, droits et sécurité

Les écritures sensibles passent par du code serveur qui vérifie le rôle de l’utilisateur. Le client ne constitue jamais une preuve d’autorisation. Les clés de service ne sont ni envoyées au navigateur, ni inscrites dans les journaux, ni copiées dans les documents.

Les comptes sont réservés aux personnes qui participent au projet. Les inscriptions seront ouvertes lors du lancement du site. Il est toutefois possible de demander un accès anticipé depuis la page de contact.

Les politiques RLS, routes administratives et fonctions `SECURITY DEFINER` suivent le moindre privilège. Une opération d’administration doit avoir un périmètre explicite et un résultat vérifiable.

Une lecture accessible sans authentification ne diffuse jamais les identifiants ni les données personnelles d’autres utilisateurs. Les décomptes, votes, classements et autres agrégats sont servis par une fonction agrégée `SECURITY DEFINER` ou par une vue qui ne renvoie que des totaux, et la politique de lecture des tables concernées reste restreinte aux lignes propres à chaque utilisateur. Charger les lignes individuelles pour les recompter côté client est proscrit.

Une invariante métier qui doit tenir quelle que soit la voie d’écriture est garantie par un déclencheur en base, non par la seule politique RLS ni par le seul code applicatif, qui ne couvrent pas toutes les voies. Cela vaut notamment pour les interdits d’auto-publication, d’auto-validation et d’auto-attribution.

Le corpus est une base de données protégée : droit *sui generis* du producteur (investissement substantiel de constitution, de vérification et de présentation) et droit d’auteur sur les textes éditoriaux originaux (notices, chapeaux, traductions, présentation). Son extraction ou sa réutilisation substantielle n’est pas autorisée. La fouille de textes et de données à des fins d’entraînement est expressément réservée (opt-out TDM, art. L122-5-3 CPI), par des moyens lisibles par machine tenus cohérents entre eux : `robots.txt` refusant les robots d’IA connus, réservation `/.well-known/tdmrep.json`, en-tête `X-Robots-Tag: noai`, et le `proxy` (verrou serveur) qui bloque (403) les agents d’aspiration qui s’annoncent. Ces signaux ne visent que les robots déclarés : la protection de fond reste l’accès fermé (authentification) contre l’aspiration anonyme, complété au besoin par une limitation de débit et une détection comportementale.

## 18. Interface de lecture

L’interface rend fidèlement les titres, notes, paragraphes, textes originaux et appareils stockés. Elle ne compense pas des données manquantes par des heuristiques invisibles. Réciproquement, une entrée marquée non publique ou inexacte en base n’est jamais présentée au lecteur, ni affichée ni proposée comme correspondance de recherche.

Les couleurs de l’interface proviennent des tokens sémantiques définis dans `app/globals.css` (`--cs-fond`, `--cs-bord`, `--cs-texte-*`, `--cs-encre`, `--cs-danger`, `--cs-or`, `--cs-vert`) : c’est la source unique de la palette, ancrée sur les teintes historiques du site. Aucune couleur d’interface n’est écrite en dur, hormis les attributs de présentation SVG (`fill=`/`stroke=`), qu’une variable CSS ne résout pas. Une référence visuelle de la palette est tenue à part : « Palette d’harmonie », https://claude.ai/code/artifact/8f55e9a1-0339-4da5-ac20-c4712c6e5b42.

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


### 26.21 Suivi canonique de l’avancement des notices

Les règles de calcul appartiennent à la présente charte ; les chiffres datés ne doivent pas y être recopiés. L’état vivant unique du chantier des notices Raulx est conservé dans `public.parametres`, sous la clé `avancement_notices_raulx`.

Le périmètre de calcul est dynamique : toutes les lignes de `public.catalogue_notices` satisfaisant `auteur ILIKE ''Augustin d%Hippone'' AND editeur = ''L. Guérin & Cie''`. Le dénominateur est toujours le nombre de lignes actuellement compris dans ce périmètre ; le nombre 91 constaté le 3 août 2026 n’est pas figé.

Au début de toute reprise de ce chantier :

1. lire `charte_ia`, puis `avancement_notices_raulx` ;
2. recalculer les indicateurs directement depuis `catalogue_notices` ;
3. signaler toute divergence entre l’état enregistré et la base ;
4. présenter les indicateurs dans l’ordre fixe défini ci-dessous.

À la fin de chaque passe :

1. recalculer tous les indicateurs ;
2. écraser la valeur de la même clé `avancement_notices_raulx` et mettre à jour `mis_a_jour` ;
3. ne jamais créer de clé parallèle, de second bilan canonique ni de dénominateur manuel.

Chaque indicateur est présenté avec son numérateur, son dénominateur et un pourcentage arrondi à une décimale :

1. **Contrôle bibliographique** : `verification_code` appartient à `NOTICE_VERIFIEE`, `EXEMPLAIRE_VERIFIE` ou `TEXTE_VERIFIE`.
2. **Texte formellement vérifié** : `verification_code = TEXTE_VERIFIE`.
3. **Texte intégral lié** : `url_texte_integral` est renseignée et non vide.
4. **Source individualisée** : `source_note` est renseignée et différente de la formule générique `Une ou plusieurs sources externes sont renseignées dans url_source.`
5. **Autorité du traducteur close** : `traducteur_status_code` est renseigné et différent de `A_CONTROLER`.
6. **Avancement global strict** : les conditions 1, 3, 4 et 5 sont simultanément remplies. Cet indicateur est le seul pourcentage global ; il ne remplace jamais les cinq indicateurs détaillés.

L’absence de texte autonome en ligne ne remet pas en cause le contrôle bibliographique d’une notice lorsque le fac-similé a été vérifié. De même, une attribution textuelle certaine peut rester ouverte sur le plan biographique. Ces dimensions ne doivent jamais être confondues.

## 27. Entretien de la charte

Une nouvelle règle doit être générale, testable et compatible avec les autres sections. Elle remplace la règle antérieure au lieu de s’ajouter comme amendement contradictoire.

Avant publication d’une nouvelle version :

1. sauvegarder la valeur active de `parametres.charte_ia` ;
2. vérifier les renvois de sections utilisés par le code et les consignes du dépôt ;
3. rechercher doublons de titres, valeurs obsolètes, chemins interdits, échappements littéraux et caractères corrompus ;
4. vérifier la cohérence avec le schéma et les importateurs ;
5. publier par mise à jour gardée ;
6. relire la valeur depuis la base et comparer son empreinte au fichier source.

Les exemples propres à une œuvre, les décisions datées et les statistiques vont dans des rapports séparés. La charte ne contient pas d’annexe historique.


## 28. Suivi permanent de l’avancement des notices

### 28.1 Emplacement unique

L’état d’avancement des travaux sur les notices est conservé sous la clé `public.parametres.suivi_avancement_notices`. Cette clé constitue le point de reprise unique. Les pourcentages annoncés en conversation, dans un rapport ou dans un journal ne font pas autorité s’ils ne correspondent pas au dernier relevé inscrit à cet emplacement.

Avant toute nouvelle passe sur les notices, relire cette clé. Après toute passe ayant modifié des notices, recalculer les indicateurs depuis `public.catalogue_notices`, puis remplacer le relevé existant dans cette même clé. Ne jamais créer une nouvelle clé d’avancement pour une passe ordinaire.

### 28.2 Indicateurs obligatoires

Le relevé contient toujours le périmètre et son dénominateur, la date de calcul, les effectifs et les pourcentages suivants :

1. **Contrôle bibliographique** : `verification_code` vaut `NOTICE_VERIFIEE`, `EXEMPLAIRE_VERIFIE`, `TEXTE_VERIFIE` ou `CONTROLE_COMPLET`.
2. **Texte vérifié** : `verification_code` vaut `TEXTE_VERIFIE` ou `CONTROLE_COMPLET`.
3. **Source individualisée** : `source_note` est renseignée et diffère de la formule générique « Une ou plusieurs sources externes sont renseignées dans url_source. ».
4. **Autorité close** : `traducteur_status_code` est renseigné et différent de `A_CONTROLER`.
5. **Texte lié** : `url_texte_integral` est renseignée.
6. **Clôture stricte** : les conditions 1, 3, 4 et 5 sont simultanément remplies.

Les indicateurs restent distincts. Le pourcentage de clôture stricte ne remplace jamais le taux de contrôle bibliographique. Toute variation du périmètre doit être signalée et entraîne le recalcul du dénominateur.

### 28.3 Règle de reprise

À la reprise, annoncer le dernier état enregistré, vérifier qu’il correspond encore aux données, puis poursuivre à partir des lignes qui empêchent la progression de l’indicateur visé. La clé d’avancement doit également nommer les principaux reliquats afin d’éviter de recommencer une recherche déjà close.


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


## 30. Suivi de l'avancement — le centre de contrôle

Avant d'entreprendre un travail sur le corpus, il faut toujours regarder où nous en sommes. Le centre de contrôle, page d'administration `/admin/controle`, réunit en un seul endroit l'état d'avancement de chaque domaine : corpus et traductions, qualité du texte, catalogue, péricopes, bibliographie, chronologie. Chaque domaine y porte ses chiffres réels, une barre d'avancement, une note de synthèse et la liste des tâches restantes.

Le consulter est la première étape de toute séance de travail. Il montre ce qui progresse, ce qui stagne et ce qui reste à faire, et il évite de rouvrir un chantier déjà traité ou d'en oublier un autre. Les chiffres sont calculés en direct, à l'exception de la qualité du texte, lue sur un cache rafraîchi à la demande.

Les notes et les listes de tâches de cette page sont tenues à jour par l'assistant. Après une avancée notable dans un domaine, il actualise la note correspondante et coche les tâches accomplies, afin que la page reflète toujours l'état véritable du travail. Sources techniques : la fonction `controle_tableau_bord()` pour les chiffres, la table `controle_sections` pour les notes et les tâches.


## 31. Atelier La Gueule — contrôle, correction et validation ciblée

L'atelier La Gueule océrise les imprimés et les manuscrits pour alimenter le corpus. Tout ce qu'il produit est un candidat, jamais une donnée validée. Le fac-similé et la transcription brute de la machine restent immuables : toute intervention agit dans une couche candidate tracée, réversible et exportable. La transcription brute est conservée à côté de l'état éditorial courant, qui est seul lu par les exports.

### 31.1 Contrôle assisté, page par page

Après l'océrisation, un contrôle relit chaque page traitée. Une passe déterministe et locale signale les anomalies simples : confiance faible, lignes vides, doublons, pages inutiles. Une passe assistée relit l'image de la page et propose deux sortes d'interventions : des corrections de texte, et des reclassements de rôle pour les éléments qui ne sont pas du texte d'œuvre. Le contrôle ne porte que sur les pages effectivement océrisées. Il ne part vers un service distant qu'avec le consentement enregistré, et sans jamais transmettre de secret.

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


## 32. Centralisation des DOCX finaux

Tout DOCX déclaré final, définitif ou validé dans le cadre de Corpus Scriptura est **copié**, après ses contrôles de clôture, dans le dossier `CS - Docx` du Bureau de l’utilisateur. Sur le poste Windows de Sébastien, l’emplacement courant est `D:\OneDrive\Bureau\CS - Docx`.

Cette opération est une copie et jamais un déplacement : le fichier source demeure intact à son emplacement de production ou d’archive. Avant la copie, distinguer l’état final courant des candidats, brouillons, intermédiaires, rendus de contrôle, extractions d’archives et versions finales désormais remplacées. Lorsqu’un même document existe à plusieurs emplacements avec la même empreinte, une seule copie est conservée dans `CS - Docx`.

Après la copie, vérifier l’égalité SHA-256 entre la source retenue et la copie. Le dossier `CS - Docx` constitue un accès pratique aux livrables Word finaux ; il ne remplace ni les archives de preuve, ni les sources autoritatives, ni les scripts de retour arrière.


## 33. Éditions bibliques commentées — hiérarchies d’affichage

### 33.1 Deux échelles, et elles ne sont pas interchangeables

Une édition biblique commentée porte deux hiérarchies distinctes, qu’il ne faut ni confondre ni fondre en une seule.

`T1` à `T6` disent la **profondeur d’un titre structurel attesté** : `T1` le livre biblique, `T2` la partie, `T3` la section, `T4` la sous-section, `T5` le chapitre, `T6` la péricope.

`I1` à `I6` disent l’**étendue qu’un bloc d’information explique** : `I1` le livre, `I2` la partie, `I3` la section, `I4` le chapitre, `I5` la péricope, `I6` le verset.

Le titre d’une péricope est donc `T6`, et ce qui l’explique est `I5`. La nature du bloc — introduction, commentaire, notice, sommaire, excursus, conclusion — est un **modificateur séparé du niveau** : `introduction_pericope` et `commentaire_pericope` sont tous deux `I5` et n’ont pourtant ni le même rôle ni le même rendu.

⛔ **Un niveau ne se déduit jamais de la casse, du corps de caractère ou de la ponctuation du texte source.** Une édition compose ses titres comme elle l’entend ; la typographie est un indice de transcription, jamais une donnée de structure.

Les niveaux absents ne s’inventent pas. Une édition sans partie ni sous-section n’en reçoit pas pour satisfaire l’interface — même règle qu’au § 6.2 pour les œuvres.

### 33.2 Le registre fait foi

Le registre machine est `work/fillion/semantic_display_hierarchy.json`. Il porte, pour chaque style sémantique : son échelle, son jeton, sa nature, sa présence au plan, son emplacement, le rôle de son intitulé, et ses alias anciens.

⛔ **Un style absent du registre est REFUSÉ**, à l’import comme au rendu, et signalé dans le centre de contrôle. Il n’est jamais aplati en paragraphe générique : un bloc qui disparaîtrait en silence est pire qu’un bloc mal classé, parce que rien ne le signale.

L’alias ancien `titre_section` se résout vers `titre_section_livre`. Le contrôle du registre et du thème est `scripts/fillion/validate_semantic_display_hierarchy.mjs`, à passer avant toute intégration.

### 33.3 Rendu

Le jeton commande la **classe** (`cs-bible-title--t*`, `cs-bible-info--i*`), le modificateur de nature commande la seconde classe (`cs-bible-block--*`). Les douze jetons existent dans le thème même si un volume n’en emploie qu’une partie : un tome plus structuré doit s’accueillir sans retoucher le rendu.

⛔ **La balise `h1`-`h6` ne se recopie pas depuis le chiffre du jeton.** Elle se calcule sur le parent réellement présent, faute de quoi une édition sans partie ni sous-section passerait de `h1` à `h5` et sauterait trois rangs du plan d’accessibilité. La classe reste stable, la balise s’adapte.

⛔ **Deux niveaux voisins se distinguent autrement que par la seule couleur** : le corps, la graisse, l’italique, le retrait. Une différence portée par la teinte seule disparaît pour qui ne la distingue pas, et à l’impression.

Le titre du livre, `T1`, vient des métadonnées de page : un bloc de corps qui le répéterait n’est pas rendu.

Une **note de verset** est `I6` et son emplacement est `footnote_only` : appel dans le verset, contenu au bas de l’unité de lecture. ⛔ Elle ne devient jamais un encadré du corps.

**Cas mixtes.** Un bloc peut porter un intitulé et un développement ; ils restent **deux éléments distincts** et ne se concatènent jamais en un seul paragraphe.

- `introduction_pericope` : l’intitulé **est** le titre de la péricope, `T6`, inscrit au plan ; le développement est l’information `I5` placée avant la péricope.
- `commentaire_pericope` : l’intitulé n’est qu’un **repère interne**, exclu du plan et sans balise de titre. ⛔ Un commentaire de péricope ne paraît jamais au sommaire.
- Introductions de livre ou de section, notices, sommaires et excursus : leur intitulé est un libellé d’information, non un niveau de structure supplémentaire, sauf donnée explicite contraire.

Les premiers fichiers de revue emploient `heading`, les paratextes candidats `source_heading`. Les deux se normalisent vers une même propriété de rendu **sans perdre la forme source**.

En lecture latin-français, un bloc commun à l’édition se rend sur toute la largeur, un bloc propre à un membre dans sa colonne, et **les niveaux sont identiques dans les deux modes**. Sur mobile, l’ordre reste titre, information, texte biblique : un bloc du corps ne devient jamais une note parce que l’écran est étroit.
