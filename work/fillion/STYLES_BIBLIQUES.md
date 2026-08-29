# Bibliothèque des styles — éditions bibliques commentées

**Destinataire : une IA qui écrit ou corrige la donnée éditoriale d’une bible commentée** (aujourd’hui la famille Fillion). Ce document dit, pour chaque style, *ce qu’il est*, *quand l’employer*, *comment il se rend*, et *où il sert déjà*.

Registre technique : `work/fillion/semantic_display_hierarchy.json` (version 1.0.0, mise à jour le **2026-08-29**, 48 styles). Le présent document en est la lecture raisonnée ; **le registre fait foi sur les valeurs, ce document sur l’usage.**

Audit de couverture : § 6, relevé du **2026-08-28** sur les 4 935 blocs éditoriaux des dix livres publiés, **corrigé le 2026-08-29**.

---

## 0. Trois axes, et le nom qualifié

Un style se déclare sur **trois axes qui ne se confondent jamais** (charte § 7.1) :

| Axe | Ce qu'il dit | Où il se déclare |
|---|---|---|
| **Le style** | ce que la chose EST | dans la donnée |
| **La surface** | OÙ elle se compose : `bible`, `bible_apparat`, `patristique`, `patristique_apparat` | par la page — ⛔ jamais sur le segment |
| **Le rang** | T1-T6 pour un titre, I1-I6 pour une information | dans la donnée |

⛔ **Le style ne se préfixe PAS par sa famille de page.** `segments.nature` vit dans `segments`, qui EST le corpus patristique ; `semantic_style` dans une table qui n'est que biblique. Le préfixe répéterait ce que la table dit déjà, et ce qui se répète dérive.

⚠️ **Mais le nom se QUALIFIE dès qu'il sort de sa table** — ici, dans une planche, dans une conversation : `patristique/verset`, `bible_apparat/commentaire_pericope`. La barre dit la surface sans l'écrire dans la donnée. C'est nécessaire : `verset` désigne deux choses, une rangée de la page Bible et une nature de segment patristique.

## 0.1. La règle qui gouverne toutes les autres

⛔ **Un style ne se devine jamais du texte.** Ni de la casse, ni du corps de caractère, ni de la ponctuation, ni de la place dans la page. Il se déclare, et il se déclare depuis le registre. `resoudreStyleSemantique` **refuse** un style inconnu : le bloc n’est alors pas rendu du tout, il n’est pas rabattu sur un paragraphe générique.

⛔ **Et depuis le 29 août 2026, LA BASE LE TIENT.** Un style hors du vocabulaire est refusé à l’écriture — table `bible_styles_semantiques` et déclencheur `bible_style_semantique_connu()` pour le paratexte, contrainte `chk_segments_nature` pour les segments. Jusque-là, un style mal orthographié entrait sans bruit et son bloc disparaissait du site sans un mot : c’est ainsi que quarante-cinq blocs étaient devenus invisibles.

⚠️ **On étend le vocabulaire, on ne le contourne pas.** Un besoin nouveau s’écrit dans `semantic_display_hierarchy.json`, puis se sème par `scripts/fillion/semer-styles-semantiques.mjs`. ⛔ Jamais un INSERT à la main. Et une faute de graphie ne devient pas un alias : les alias sont pour les noms hérités, les coquilles se corrigent dans la donnée.

---

## 1. Les quatre couches de style

Un bloc éditorial porte jusqu’à quatre déclarations indépendantes. Les confondre est l’erreur la plus fréquente.

| Couche | Où elle s’écrit | Ce qu’elle dit | Vocabulaire |
|---|---|---|---|
| **1. Style sémantique** | `semantic_style_code` du bloc | Ce que le bloc EST, et l’étendue qu’il couvre | 48 valeurs (§ 2) |
| **2. Rôle d’affichage** | `presentation` du bloc (jsonb) | Ce que la page imprimée FAISAIT de ce bloc | 6 clés lues (§ 3) |
| **3. Style de paragraphe** | `editorial_normalization.blocks[]` de l’unité source | Comment se compose CHAQUE paragraphe | `kind`, `form`, `presentation`, `inline_spans` (§ 4) |
| **4. Sous-type de notice** | `notice_subtype` du bloc | De quelle espèce est une notice | 5 valeurs (§ 5) |

---

## 2. Couche 1 — le style sémantique du bloc

### 2.1 Deux échelles, et elles ne sont PAS interchangeables

- **`T1` à `T6` — la profondeur d’un TITRE structurel attesté.** Un titre est un intitulé imprimé qui divise le livre.
  | Jeton | Rôle |
  |---|---|
  | `T1` | titre du livre biblique (fourni par les métadonnées de page) |
  | `T2` | partie du livre |
  | `T3` | section |
  | `T4` | sous-section |
  | `T5` | chapitre biblique (axe **matériel**) ou division « § » du commentaire (axe **analytique**) |
  | `T6` | péricope |

- **`I1` à `I6` — l’étendue qu’un bloc d’INFORMATION explique.** Une information n’est pas une division : elle commente une portée.
  | Jeton | Portée |
  |---|---|
  | `I1` | le livre (et au-dessus : groupe de livres, testament, Bible entière) |
  | `I2` | une partie de livre |
  | `I3` | une section |
  | `I4` | un chapitre |
  | `I5` | une péricope |
  | `I6` | un verset |

⚠️ **La NATURE est un troisième axe, séparé.** `introduction_pericope` et `commentaire_pericope` sont tous deux `I5` et n’ont ni le même rôle ni le même rendu. Les huit natures : `title`, `introduction`, `commentary`, `notice`, `summary`, `excursus`, `conclusion`, `note`.

⛔ **Le chiffre du jeton n’est pas la balise HTML.** `baliseTitre` calcule `h1`–`h6` sur les parents **réellement présents** : une édition sans partie ni sous-section passerait de `h1` à `h5` et casserait le plan d’accessibilité. Ne jamais recopier le chiffre.

### 2.2 Les six styles de TITRE

Un titre porte son texte dans `heading` ; il n’a pas de « repère » séparé (`heading_role: none`).

| Style | Jeton | Au plan ? | Axe | Emploi | Rendu |
|---|---|---|---|---|---|
| `titre_livre` | T1 | non | analytique | Titre du livre. **Corps non rendu** (`body_block: false`) : la page le donne déjà. | — |
| `titre_partie_livre` *(alias `titre_partie`)* | T2 | **oui** | analytique | « PREMIÈRE PARTIE » | 1,4375 rem, centré, chasse 0,04 em, encre foncée |
| `titre_section_livre` *(alias `titre_section`)* | T3 | **oui** | analytique | « § II. — Le sermon sur la montagne » | 1,1875 rem, centré, chasse 0,01 em |
| `titre_sous_section` | T4 | **oui** | analytique | « 1° La personne de l’auteur » | 1,0625 rem, **au fer** |
| `titre_chapitre_livre` *(alias `titre_chapitre`)* | T5 | non | **matériel** | « CHAPITRE IX » | ⛔ **Jamais affiché** (charte § 35.1) |
| `titre_paragraphe_livre` *(alias `titre_division`)* | T5 | **oui** | analytique | « § I », « 2. L’Œuvre des six jours. I, 2-32. » | 1 rem, au fer |
| `titre_pericope` | T6 | **oui** | analytique | « 3. Ce qui suivit la mort de Jésus (27, 51-56) » | 1 rem, **italique**, au fer |

⚠️ **Deux styles au rang T5, et ils ne se rencontrent pas.** `titre_chapitre_livre` est **matériel** : il traverse la hiérarchie sans la commander, et ne paraît pas. `titre_paragraphe_livre` est **analytique** : c’est la division « § » de Fillion, entre la sous-section et la péricope — « La Création. I, 1 — II, 3. » (T4) contient « L’Œuvre des six jours », qui contient les six jours (T6). Ce rang manquait au registre jusqu’au 2026-08-29, et ses trente-quatre blocs de la Genèse ne paraissaient nulle part.

⛔ **`titre_chapitre_livre` est conservé mais invisible.** La barre de navigation nomme déjà le chapitre ; la mention imprimée n’apprenait rien. Elle reste dans la donnée comme témoin matériel, et **continue de traverser l’axe analytique** : c’est sa PLACE qui compte. Un titre matériel ne devient jamais le parent de ce qui le suit — « 2° L’adoration des Mages » relève du § II, non du chapitre II.

### 2.3 Les styles d’INFORMATION : une grammaire régulière

Le nom se lit **`{nature}_{portée}`**. Les portées, de la plus large à la plus étroite :

`bible` → `testament` → `groupe_livres` → `livre` → `partie` → `section` / `sous_section` → `chapitre` → `pericope` → `verset`

Les natures disponibles : `introduction`, `commentaire`, `notice`, `sommaire`, `conclusion`, `excursus`, `transition`.

| Portée | Jeton | Styles existants |
|---|---|---|
| Bible | I1 | `introduction_bible`, `notice_bible` |
| Testament | I1 | `introduction_testament`, `notice_testament` |
| Groupe de livres | I1 | `introduction_groupe_livres`, `notice_groupe_livres` |
| Livre | I1 | `introduction_livre`, `notice_livre`, `commentaire_livre`, `sommaire_livre`, `conclusion_livre`, `excursus_livre` *(alias `excursus`)*, `transition_livre` |
| Partie | I2 | `introduction_partie` *(alias `introduction_partie_livre`)*, `commentaire_partie`, `notice_partie`, `sommaire_partie`, `conclusion_partie`, `excursus_partie` |
| Section | I3 | `introduction_section`, `introduction_sous_section`, `commentaire_section`, `notice_section`, `sommaire_section`, `conclusion_section`, `excursus_section` |
| Chapitre | I4 | `introduction_chapitre`, `commentaire_chapitre`, `notice_chapitre`, `sommaire_chapitre`, `conclusion_chapitre`, `excursus_chapitre` |
| Péricope | I5 | `introduction_pericope`, `commentaire_pericope`, `notice_pericope`, `sommaire_pericope`, `conclusion_pericope`, `excursus_pericope`, `transition_pericope` |
| Verset | I6 | `commentaire_verset`, `note_verset` |

⚠️ **Trois exceptions à connaître par cœur :**

1. **`introduction_livre` porte un vrai TITRE** (`heading_role: title`, niveau `T2`) : son intitulé — « Évangile selon saint Matthieu — Introduction » — se compose comme un titre de partie, non comme un repère.
2. **`introduction_pericope` porte un vrai titre de rang `T6`, ET entre au plan** (`heading_in_outline: true`) : le titre d’une péricope vit à l’intérieur d’un bloc d’introduction, et le sommaire doit l’y trouver.
3. **`note_verset` n’est pas un bloc de corps** (`body_block: false`, `placement: footnote_only`) : il ne se rend qu’en note.

Tous les autres portent un **repère** (`heading_role: label`) : ce n’est **pas** un titre — ni balise `h*`, ni place au plan.

### 2.4 Ce que chaque axe change au rendu

**Le jeton d’information règle le blanc** (il ne crie pas, il se lit au retrait et à la mesure) :

| Jeton | Marges | Particularité |
|---|---|---|
| I1 | 2 / 1,5 rem | + retrait de 12 % des deux côtés si nature `introduction` |
| I2 | 1,75 / 1,25 rem | idem |
| I3 | 1,5 / 1,1 rem | — |
| I4 | 1,35 / 1 rem | — |
| I5 | 1,25 / 0,9 rem | — |
| I6 | 1 / 0,75 rem | corps réduit à 0,8125 rem |

⛔ **Le retrait de 12 % tombe dans une PIÈCE lue seule** (classe `cs-bible-piece`) : l’introduction y est la page, il n’y a pas de texte biblique dont s’écarter, et le retrait ne faisait que resserrer la mesure — 23,75 rem contre les 31,25 rem de l’apparat qui la suit.

**La nature est un modificateur discret**, cumulé au jeton :

| Nature | Ce qu’elle ajoute |
|---|---|
| `title` | chiffres elzéviriens |
| `introduction` | marges larges (I1, I2), blanc généreux |
| `commentary` | romain ; aux rangs I4–I6, le repère devient une **manchette flottante** en tête du développement |
| `notice` | corps 0,78125 rem ; rendue dans un `<aside>`, à côté du fil |
| `summary` | chasse 0,01 em |
| `excursus` | corps 0,78125 rem ; `<aside>` |
| `conclusion` | italique |
| `note` | corps 0,8125 rem |

**Le repère** (`.cs-bible-info-label`) : sans-serif, 0,75 rem, demi-gras. Centré et à l’encre pleine pour I1–I2, gris pour I3, **flottant en manchette** pour un commentaire I4–I6. ⛔ Jamais de petites capitales : « pas lisible », décision de l’auteur du 2026-08-26.

---

## 3. Couche 2 — le rôle d’affichage (`presentation` du bloc)

Cette couche ne dit pas un goût de composition : elle dit **ce que la page imprimée faisait**.

### 3.1 Le vocabulaire LU — six clés, et rien d’autre

| Clé | Valeurs | Ce qu’elle fait |
|---|---|---|
| `display_role` | `part_subtitle`, `section_subtitle` | Le bloc est le CHAPEAU du titre qui précède : centré, sans retrait, collé à lui. |
| `attach_to_block_key` | clé d’un autre bloc | À quel titre ce chapeau se rattache. |
| `hierarchy_axis` | `analytic`, `material` | Confirme ou infléchit l’axe que le registre donne au style. |
| `outline_role` | texte libre (`piece`, `none`, `parallel_chapter_marker`) | Rôle au sommaire. |
| `leading_paragraph_style` | `bibliographie`, `renvois-bible` | Composition imposée au PREMIER paragraphe du bloc. |
| `leading_paragraph_attached_to_heading` | `true` | Ce premier paragraphe se colle à l’intitulé. |

### 3.2 ⛔ Les clés écrites mais NON LUES

Elles existent dans la donnée et **n’ont aucun effet**. Les écrire n’est pas une faute, mais n’attendez rien d’elles.

| Clé | Blocs | Pourquoi elle est ignorée |
|---|---|---|
| `text_alignment` | 33 | Portée par des blocs dont le corps est de la prose justifiée, elle centrerait des paragraphes entiers. **Seul le rôle d’affichage emporte son alignement.** |
| `suppress_in_reader` + `suppression_reason` | 26 | La suppression vient du REGISTRE (`redundant_with_reader_navigation`), non du bloc. |
| `spacing_before` / `spacing_after` | 19 | Le blanc vient du jeton et de la nature. |
| `entry_sequence` | 15 | L’ordre bibliographique vient des tables d’autorité. |
| `style` | 15 | Doublon de `leading_paragraph_style` ; c’est ce dernier qui est lu. |
| `subtitle_block_key` | 7 | Le lien va dans l’autre sens : c’est le chapeau qui porte `attach_to_block_key`. |
| `leading_reference_style` | 3 | Non prévu ; employer `leading_paragraph_style: renvois-bible`. |
| `content_style`, `column_order` | 1 + 1 | La table de transcription se compose depuis sa donnée structurée. |
| `piece_key`, `piece_role` | 64 | ⚠️ **Le site ne les lit pas** : `grouperPiecesLiminaires` re-déduit les pièces du nom, de la portée et de la page imprimée. Voir § 6.3. |

⚠️ Les valeurs de `display_role` autres que les deux lues — `critical_apparatus`, `piece_heading`, `piece_continuation`, `bibliography_entry` — sont ramenées à `null`.

---

## 4. Couche 3 — le style de PARAGRAPHE

Chaque unité source porte `editorial_normalization.blocks[]`. Un élément = un paragraphe rendu.

### 4.1 `kind` — ce qu’est le paragraphe

| `kind` | Emploi | Rendu | Blocs |
|---|---|---|---|
| `commentary` | le paragraphe ordinaire du commentaire | 0,78125 rem, interligne 1,3, justifié, encre seconde | 3 221 |
| `heading` | un intertitre DANS le développement | balise `h*`, rang lu dans `heading_level` (`T2`–`T6`) | 43 |
| `reference` | un renvoi qui suit le développement | corps réduit, au fer, encre seconde, collé au-dessus | 13 |
| `attribution` | une signature, une date | idem `reference` ; l’alignement vient de la présentation | 6 |
| `quotation` | une citation détachée | **italique** | 1 |
| `introduction` | un préambule interne | comme `commentary` | 1 |
| `lemma` | *(reconnu par le rendu, jamais employé)* | italique | 0 |

### 4.2 `form` — la matière du paragraphe

| `form` | Rendu | Blocs |
|---|---|---|
| `prose` | `white-space: pre-wrap`, justifié | 3 270 |
| `bibliography_entry` | entrée d’une liste bibliographique | 15 |
| `verse` | *(reconnu : `pre-line`, interligne 1,6, au fer)* | 0 |

### 4.3 `presentation` du paragraphe — DEUX clés, lues celles-là

`text_align` (`left`, `center`, `right`, `justify`) et `font_style` (`normal`, `italic`). ⚠️ **Ne pas confondre avec `text_alignment` du BLOC**, qui n’est pas lu (§ 3.2).

### 4.4 `inline_spans` — les fonctions typographiques

⛔ Sémantiques, jamais déduites du texte ni posées en CSS.

| `kind` | `rendering` | Emploi | Spans |
|---|---|---|---|
| `foreign_expression` | `italic` | grec, latin, hébreu translittéré… | 347 |
| `abbreviation` | `italic` | abréviation latine | 153 |
| `bibliographic_title` | `italic` | titre d’ouvrage cité | 31 |
| `modern_author` | `small_caps` | nom d’auteur moderne | 6 |
| `quotation` | `quotation_italic` | citation en ligne | 1 |
| `historical_author` | *(prévu, jamais employé)* | — | 0 |
| `biblical_reference` | *(prévu, jamais employé)* | — | 0 |

### 4.5 L’INTERTITRE DIVISÉ

Un intertitre porte souvent sa **désignation** puis son **objet** : « I — Ce qu’est la Bible ». Il se compose en titre et chapeau, par `diviserIntitule`.

- La coupure se fait au **tiret entouré d’espaces**. Un tiret collé appartient au mot : « Jésus-Christ » ne coupe rien.
- La tête doit **désigner** une division : elle se ferme sur un point (« § I. »), ou ne porte **aucun chiffre arabe** (« I », « TROISIÈME PARTIE »). Un intervalle de références — « La Création. I, 1 — II, 3. » — n’est jamais coupé.
- ⛔ Un intertitre qui porte un `inline_span` ou un appel de note **n’est pas coupé** : leurs offsets pointent dans le texte entier.
- La paire **retombe sur son rang** : les trois rangs hauts la centrent, les bas la laissent au fer. L’alignement reconstruit du fac-similé décrivait UNE ligne et ne s’applique plus.

---

## 5. Couche 4 — le sous-type d’une notice

`notice_subtype` précise l’espèce d’une notice, sans changer son style.

| Sous-type | Emploi | Blocs | Publics |
|---|---|---|---|
| `critical_apparatus` | apparat de bas de page | 19 | 0 |
| `bibliography` | liste d’ouvrages | 15 | 15 |
| `editorial_matter` | matière éditoriale | 6 | 1 |
| `sigla` | table de sigles | 1 | 1 |
| `transcription_table` | table de transcription | 1 | 1 |

---

## 6. Audit du corpus — 2026-08-28

### 6.1 Couverture

**4 935 blocs**, **10 livres**, **25 styles employés** sur les 48 du registre. 4 893 blocs publics. ✅ **Zéro bloc hors vocabulaire** depuis la correction du 2026-08-29.

| Livre | Blocs | Styles |
|---|---|---|
| Genèse | 1 008 | 18 |
| Exode | 496 | 11 |
| Lévitique | 433 | 11 |
| Nombres | 524 | 11 |
| Deutéronome | 451 | 12 |
| Matthieu | 521 | 13 |
| Marc | 335 | 11 |
| Luc | 542 | 13 |
| Jean | 306 | 11 |
| Actes | 319 | 10 |

### 6.2 Matrice livre × style

| Style | GEN | EXO | LEV | NUM | DEU | MAT | MRK | LUK | JHN | ACT | Total |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| `commentaire_pericope` | 391 | 201 | 141 | 203 | 134 | 299 | 191 | 305 | 160 | 144 | **2 169** |
| `titre_pericope` | 138 | 122 | 101 | 120 | 126 | 34 | 21 | 75 | 58 | 84 | **879** |
| `commentaire_verset` | 260 | 64 | 60 | 44 | 34 | · | · | · | · | · | **462** |
| `introduction_pericope` | · | · | · | · | · | 90 | 59 | 80 | 25 | 3 | **257** |
| `commentaire_chapitre` | · | 45 | 54 | 65 | 93 | · | · | · | · | · | **257** |
| `titre_sous_section` | 21 | 24 | 29 | 30 | 22 | 24 | 20 | 25 | 15 | 33 | **243** |
| `commentaire_section` | 69 | 24 | 30 | 33 | 19 | 6 | 7 | · | · | · | **188** |
| `titre_chapitre_livre` | · | · | · | · | · | 28 | 16 | 24 | 21 | 28 | **117** |
| `introduction_sous_section` | 10 | 6 | 8 | 13 | 12 | 13 | · | 6 | 3 | 16 | **87** |
| `titre_section_livre` | 16 | 3 | 5 | 9 | 2 | 7 | 6 | 12 | 7 | 6 | **73** |
| `introduction_section` | · | · | · | · | · | 13 | 8 | 3 | 9 | 2 | **35** |
| `titre_paragraphe_livre` | 34 | · | · | · | · | · | · | · | · | · | **34** |
| `notice_bible` | 33 | · | · | · | · | · | · | · | · | · | **33** |
| `titre_partie_livre` | 2 | 3 | 2 | 3 | 4 | 3 | 3 | 4 | 4 | 2 | **30** |
| `introduction_partie` | · | · | · | · | · | 3 | 3 | 5 | 3 | · | **14** |
| `introduction_bible` | 13 | · | · | · | · | · | · | · | · | · | **13** |
| `introduction_livre` | 4 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | **13** |
| `commentaire_partie` | 2 | 3 | 2 | 3 | 2 | · | · | · | · | · | **12** |

| `introduction_testament` | 4 | · | · | · | · | · | · | · | · | · | **4** |
| `notice_testament` | 4 | · | · | · | · | · | · | · | · | · | **4** |
| `commentaire_livre` | · | · | · | 2 | · | · | · | 1 | · | · | **3** |
| `notice_livre` | 3 | · | · | · | · | · | · | · | · | · | **3** |
| `introduction_groupe_livres` | 2 | · | · | · | · | · | · | · | · | · | **2** |
| `notice_groupe_livres` | 2 | · | · | · | · | · | · | · | · | · | **2** |
| `introduction_chapitre` | · | · | · | · | · | · | · | 1 | · | · | **1** |

*(Les blocs liminaires — page de titre, « Du même auteur », imprimatur, dédicace, avant-propos, table de transcription, abréviations, introduction générale — sont rattachés à la Genèse, qui ouvre le tome. D’où ses 18 styles.)*

### 6.3 ✅ Ce qui ne s’affichait pas — corrigé le 2026-08-29

**Quarante-cinq blocs portaient un style que le registre ignorait**, et `resoudreStyleSemantique` les refuse : ils ne paraissaient nulle part, en silence.

| Style écrit | Blocs | Livre | Ce qu’il est devenu |
|---|--:|---|---|
| `titre_division` | 34 | Genèse | → `titre_paragraphe_livre`. Le rang manquait au registre : c’est la division « § » de Fillion, T5 sur l’axe analytique. L’ancien nom y reste comme ALIAS, filet pour ce qui aurait échappé. |
| `introduction_subsection` | 11 | Matthieu | → `introduction_sous_section`. Une coquille à moitié anglaise. ⛔ Non versée aux alias : une faute ne devient pas du vocabulaire. |

⛔ **Et le trou est bouché.** `semantic_style` était la seule chose non contrainte de la table, quand `block_kind`, `scope_kind`, `notice_subtype`, `placement` et `validation_status` l’étaient toutes. Depuis le 2026-08-29, un déclencheur refuse à l’écriture tout style hors de `bible_styles_semantiques`. ⚠️ Il valide le code EFFECTIF : celui de la métadonnée, ou celui que dérive le couple `block_kind` × `scope_kind` — lequel peut être faux tout seul, `transition` × `chapter` donnant un `transition_chapitre` que le registre ne connaît pas.

**117 blocs restent volontairement masqués** : les `titre_chapitre_livre`, que la barre de navigation redit déjà.

⚠️ **Les pièces liminaires sont re-déduites au lieu d’être lues.** 64 blocs déclarent `piece_key` (douze pièces nommées : `page-de-titre`, `du-meme-auteur`, `imprimatur-1888`, `imprimatur-1904`, `dedicace-vigouroux`, `avant-propos`, `transcription-hebreu`, `principales-abreviations`, `introduction-generale`, `ancien-testament`, `pentateuque`, `genese`) et `piece_role` (`head`, `continuation`, `apparatus`, `entry`). Le site ne les lit pas : `grouperPiecesLiminaires` reconstruit le groupement à partir du nom, de la portée et de la page imprimée. Cela marche aujourd’hui, mais une donnée explicite vaut mieux qu’une heuristique.

### 6.4 ⚠️ Deux vocabulaires pour un même corpus

La même fonction éditoriale ne porte pas le même style selon le tome. **La donnée est cohérente en elle-même, mais elle n’est pas comparable d’un livre à l’autre.**

| Fonction | Pentateuque (GEN-DEU) | Nouveau Testament (MAT-ACT) |
|---|---|---|
| Ouvrir une péricope | `titre_pericope` (607) | `introduction_pericope` (257) + `titre_pericope` (272) |
| Commenter verset par verset | `commentaire_verset` (462) | *aucun* |
| Commenter un chapitre | `commentaire_chapitre` (257) | *aucun* |
| Marquer le chapitre imprimé | *aucun* | `titre_chapitre_livre` (117) |
| Introduire une section | *aucun* | `introduction_section` (35) |
| Introduire une partie | *aucun* | `introduction_partie` (14) |
| Commenter une partie | `commentaire_partie` (12) | *aucun* |

Ce n’est pas nécessairement une faute : Fillion ne compose pas le Pentateuque comme les Évangiles. Mais avant d’en tirer une statistique ou une règle, **vérifier que la question porte sur la même chose des deux côtés**.

### 6.5 Styles jamais employés — 23 sur 48

`titre_livre`, `sommaire_livre`, `conclusion_livre`, `excursus_livre`, `transition_livre`, `notice_partie`, `sommaire_partie`, `conclusion_partie`, `excursus_partie`, `notice_section`, `sommaire_section`, `conclusion_section`, `excursus_section`, `notice_chapitre`, `sommaire_chapitre`, `conclusion_chapitre`, `excursus_chapitre`, `notice_pericope`, `sommaire_pericope`, `conclusion_pericope`, `excursus_pericope`, `transition_pericope`, `note_verset`.

Le registre a été posé en grille complète (nature × portée). Ces styles sont **valides et prêts** ; leur absence dit seulement que le corpus publié n’en a pas eu besoin. ⛔ Ne pas les supprimer : la grille se lit d’un coup d’œil, et une grille trouée ne se lit plus.

---

## 7. Les huit règles d’or

1. ⛔ **Un style ne se devine pas.** Il vient du registre. Un style inconnu fait disparaître son bloc, en silence.
2. ⛔ **Le nom du style s’écrit en français.** `introduction_sous_section`, jamais `introduction_subsection`.
3. ⛔ **Le vocabulaire est CLOS, et la base le tient.** Un style hors de `bible_styles_semantiques` est refusé à l’écriture. On l’ÉTEND — dans le registre, puis en semant — on ne le contourne pas, et une coquille ne devient jamais un alias.
4. ⚠️ **Le jeton n’est pas la balise.** `T3` ne veut pas dire `h3`.
5. ⚠️ **La nature est un axe à part.** `introduction_pericope` et `commentaire_pericope` sont tous deux `I5`.
6. ⛔ **Un titre matériel (`titre_chapitre_livre`) ne devient jamais le parent de ce qui le suit.**
7. ⛔ **Le rendu ne lit que six clés de `presentation`.** Tout le reste est écrit pour mémoire, sans effet — `text_alignment` en premier lieu.
8. ⚠️ **Trois couches, trois vocabulaires.** Le style du BLOC (`semantic_style_code`), le rôle d’AFFICHAGE (`presentation`), le style du PARAGRAPHE (`editorial_normalization.blocks[].kind`). Ne jamais écrire l’un à la place de l’autre.
