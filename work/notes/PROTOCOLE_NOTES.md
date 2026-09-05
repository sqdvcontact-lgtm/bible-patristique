# Protocole de révision des NOTES — une œuvre à la fois

Écrit POUR LES IA qui produisent ou corrigent l'appareil de notes, sur le modèle de
`work/fillion/STYLES_BIBLIQUES.md`. La doctrine fait foi (charte `parametres.charte_ia`,
§§ 3.5.1, 3.8, 7.1, 7.6, 8, 13.8 à 13.12) ; ce document dit **comment on s'y prend**, dans
quel ordre, et ce qu'on ne fait surtout pas.

⚠️ **État : v4, 5 septembre 2026.** La v1 ouvrait sur « le site compose, la base
conserve » : **l'auteur l'a corrigé le jour même**, et la v2 avec (voir § 0). La v4 reporte
les **treize arbitrages** rendus le 5 septembre sur les douze questions de
`work/notes/QUESTIONS_NOTES_20260905.txt` : ils vivent dans la charte, § 13.12, et ce
document dit où chacun s'applique. ⛔ **Une seule question reste ouverte** : sur quoi fendre
le bloc à trois têtes de Faivre (§ 6.1). Tout le reste est applicable.

---

## 0. La règle qui commande toutes les autres

⛔ **LA PONCTUATION, LA TYPOGRAPHIE ET LES ABRÉVIATIONS SE NORMALISENT DANS LA DONNÉE.**
La forme normalisée EST la note ; la leçon imprimée se conserve en `metadata` (charte
§ 8.1), elle ne tient plus le champ `text`.

⚠️ **La règle du § 3.2 — « au rendu, sans réécrire la donnée » — NE S'APPLIQUE PAS ICI, et
c'est la leçon d'une rectification.** Elle a été posée pour le TEXTE DE CORPUS, qui est un
témoin : la graphie d'Arnauld d'Andilly ou de Knöll fait preuve, et l'on ne touche pas à
un témoin. **Une note n'est pas un témoin, c'est un appareil que NOUS constituons** — nous
en fixons la numérotation, le type, l'ordre et les renvois. La transposer sans y penser
laissait le champ `text` durablement incomplet : une note sans point final le restait dans
tout export, toute copie, toute surface qui ne passe pas par le composant de lecture, et
le point n'existait que le temps d'un affichage.

⛔ **QUATRE EXCEPTIONS, ET ELLES SE NOMMENT** — tout ce dont la FORME fait témoignage :

1. **l'apparat critique** (7 379 blocs, charte § 22) — notation philologique rendue telle
   quelle : ni ponctuation ajoutée, ni sigle développé, ni référence normalisée ;
2. **toute citation dont la GRAPHIE fait preuve** — leçon ancienne, orthographe attestée,
   latin cité pour sa lettre ;
3. **la transcription diplomatique** (Bible 899 et tout témoin manuscrit) ;
4. **le texte reproduit d'un document daté** — privilège, imprimatur, approbation, dont la
   ponctuation appartient à la pièce.

⚠️ **Le rendu ne disparaît pas, il devient un FILET.** `terminerNote`,
`normaliserReferencesDansTexte` et `normaliserTypographieLecture` sont **idempotentes** :
sur une donnée déjà normalisée elles ne font rien, sur un import qui aurait manqué la
passe elles rattrapent. ⛔ Les retirer ferait dépendre l'affichage de la qualité d'une
campagne.

⚠️ **Ce que le rendu garde pour lui, et pour de bon** — ce qui n'appartient pas au texte
de la note : l'**italique de la langue**, le **type de note**, le **numéro affiché**, la
**mise à la ligne d'une référence par rang**, l'**appel**. Aucun de ces cinq ne s'écrit
dans `text`.

---

## 1. Les trois AXES d'un bloc de note

Charte § 7.1, appliquée aux notes. ⛔ Ne pas les confondre : c'est en les mêlant qu'un
vocabulaire de styles double de taille sans rien dire de plus.

| Axe | Ce qu'il dit | Où il vit |
|---|---|---|
| **NATURE** | ce que le bloc EST | `texte_note_blocs.kind` |
| **FORME** | prose ou vers | `texte_note_blocs.form` |
| **TYPE** | qui parle | `metadata.editorial_role` |

### 1.1 Les natures (charte § 13.10)

| Nature | Ce que c'est | Blocs au 5 sept. 2026 |
|---|---|---|
| `reference` | un renvoi, biblique ou bibliographique | 11 916 |
| `commentary` | la prose de la note | 12 008 |
| `lemma` | le mot ou la phrase commentés, que la note reprend | 126 |
| `quotation` | un passage cité | 115 |
| `translation` | la traduction du passage cité | 76 |
| `attribution` | l'attribution d'une citation | 17 |
| **`source_locator`** *(neuve)* | la coordonnée de la note dans le livre imprimé | ~396 |
| **`internal_cross_reference`** *(neuve)* | le renvoi à une autre note, ou ailleurs dans la même œuvre | ~79 |

⛔ **La LONGUEUR n'est pas une nature.** 2 958 blocs de commentaire tiennent en
quatre-vingts signes, 62 dépassent deux mille : c'est le même acte éditorial, et la
composition s'adapte à la mesure sans qu'on nomme deux styles.

⛔ **Une note DE note n'est pas une nature** — c'est une relation, et
`texte_note_relations` existe pour cela (35 blocs concernés).

⚠️ **Le ~116 annoncé jusqu'ici pour `internal_cross_reference` était le compte d'AUTRE
CHOSE** : 116 blocs ouvrent sur « ibid. » ou « id. », ce qui relève de la passe 6. Ceux qui
ouvrent sur « Voy. », « Voir » ou « Consulter » sont **79** — et le mot d'ouverture ne suffit
de toute façon pas à les classer (§ 6.2).

### 1.2 Les types (charte §§ 13.8 et 13.12.1)

`author_note`, `translator_note`, `source_editorial_note`, `corpus_editorial_note`,
`critical_apparatus`. ✅ Le type paraît sur **toutes** les notes, sans exception.

⛔ **Les repères qui permettent de RECONNAÎTRE chacun vivent dans la charte, § 13.12.1**, à
la demande de l'auteur : c'est là qu'on les lit avant de commencer, et il n'y en a pas
d'autre exemplaire.

✅ **Le rendu l'annonce depuis le 5 septembre 2026** (`app/lib/typeNote.ts`) : l'en-tête de
la fenêtre de note dit « Note du traducteur 12 », et « Note » tant qu'aucun type n'est posé.
La passe 4 n'a donc plus qu'à ÉCRIRE la donnée : le jour où un bloc reçoit son
`editorial_role`, la note le dit d'elle-même. ⚠️ Le libellé exige l'UNANIMITÉ des blocs
d'une note : une note mixte s'annonce « Note », mieux valant cela qu'une attribution à
demi fausse.

---

## 2. L'ordre des opérations, œuvre par œuvre

```
0. RELEVÉ        — on mesure avant de toucher                      (aucune écriture)
1. SAUVEGARDE    — l'appareil entier de l'œuvre, dans internal.
2. PROPRETÉ      — préfixes, ponctuation, typographie, italiques OCR  (mécanique)
3. NATURES       — la fonction de chaque bloc, et les blocs à fendre (structure)
4. TYPE          — qui parle                                        (jugement)
5. LANGUE        — quel fragment est latin, grec                    (jugement)
6. RENVOIS       — ibid., id., références sans auteur               (recherche)
7. CATALOGUE     — les œuvres citées entrent au catalogue           (recherche)
8. NUMÉROTATION  — le numéro affiché                                (calcul)
9. CLÔTURE       — contrôles, et on rend la main
```

⚠️ **Une passe se joue sur UNE œuvre**, jamais sur le corpus entier : une campagne qui
touche quarante-sept textes à la fois ne se relit pas, et la charte § 8.1 exige une
relecture depuis la base après chaque écriture.

---

## 3. Passe 0 — le RELEVÉ

```bash
npx tsx tmp/audit-notes.mts
```

⛔ Il fait passer le corpus par **les vraies fonctions du site**, jamais par une copie de
leurs règles. Un audit qui rejouerait la normalisation de mémoire mesurerait un site
imaginaire.

On relève, pour l'œuvre : notes, blocs, part d'apparat ; natures et formes employées ;
langues ; blocs sans type ; résidu de références non conformes, classé ; numéro le plus
haut.

---

## 4. Passe 1 — la SAUVEGARDE

⛔ **Dans `internal`, jamais dans `public`** (AGENTS.md, « Schéma public = surface
d'attaque ») : une table de sauvegarde posée dans `public` est servie par l'API à tout
compte connecté.

```sql
create table internal.backup_notes_<id_texte>_<AAAAMMJJ> as
select * from public.texte_note_blocs where id_texte = '<id_texte>';
-- et de même pour texte_notes, texte_note_ancres, texte_note_relations
```

On écrit dans la même campagne le retour arrière (`sql/rollback_…`), et on le relit.

---

## 5. Passe 2 — la PROPRETÉ (mécanique, réversible)

### 5.1 Le préfixe « Référence imprimée : » n'est pas du texte de note

⚠️ **Le compte a été REPRIS** : ce protocole annonçait 3 622 blocs, la base en rend
**4 883**, dans **27 textes**, presque tous chez Jeannin et Bareille. Aucun ne devient vide
une fois le préfixe retiré. ⚠️ La passe 0 impose de toute façon de remesurer avant d'écrire.

Le lecteur voit ce préfixe. C'est une PROVENANCE, et une provenance vit dans `metadata`.

- retirer `^Référence imprimée\s*:\s*` du `text` ;
- poser `metadata.provenance_note = 'reference_imprimee'` ;
- ⚠️ ne rien retirer d'autre : ce qui suit est la référence, telle qu'imprimée.

✅ **Le renvoi passe ENSUITE par le normaliseur, comme les autres** (arbitré le 5 septembre
2026, charte § 13.12, décision 2). ⛔ La provenance dit d'OÙ vient le renvoi, jamais qu'il
doive garder sa graphie : sans quoi le site écrirait « Ps. 5, 8. » sur ces 4 883 blocs et
« Ps 5, 8 » partout ailleurs, pour la même référence. La leçon imprimée se conserve en
`metadata`, ce qui rend la provenance vérifiable au lieu d'en faire une étiquette.

### 5.2 La ponctuation finale entre dans la donnée

**6 431 notes sur 16 408 (39 %)** n'en portent aucune. On applique `terminerNote` **à la
dernière pièce de la note**, et l'on écrit le résultat.

⛔ **À la DERNIÈRE pièce, jamais à chaque bloc** : une note de quatre blocs ne prend qu'un
point final. C'est ce que fait le rendu, et la donnée doit dire la même chose.

### 5.3 La typographie et les abréviations bibliques

On applique `normaliserTypographieLecture` (espaces § 3.2, ponctuation des citations
§ 3.8) et, sur les blocs `reference`, `normaliserReferencesDansTexte` (abréviation
normative espacée, chapitre en chiffres arabes, virgule avant le verset).

⚠️ **La leçon imprimée se conserve avant d'écrire, mais PAS sur tout changement** (arbitré
le 5 septembre 2026, charte § 13.12, décision 3) : `metadata.forme_imprimee` reçoit le
`text` d'origine dès que le changement DÉPASSE la typographie — ponctuation finale ajoutée,
abréviation développée, référence recomposée. ⛔ Jamais pour une espace fine :
`normaliserTypographieLecture` ne change pas la longueur d'un texte, et conserver une leçon
pour cela ferait de `metadata` un double du champ `text` sur des milliers de blocs, sans
qu'aucune preuve y gagne.

⛔ **Les quatre exceptions du § 0 ne passent par aucune de ces trois étapes.**

### 5.4 Les italiques de l'OCR deviennent des MARQUEURS

✅ **Arbitré le 5 septembre 2026** (charte § 13.12, décision 1). **420 blocs** de cinq textes
portent dans `metadata.enrichments` les italiques, petites capitales et exposants relevés
sur la page imprimée — **3 569 empans ancrés par offset** — et **aucune ligne du site ne les
lit**. Ils se convertissent en `*italique*`, `++petites capitales++` et `^^exposant^^`,
écrits dans le `text`, que `rendreTexteEnrichi` compose déjà.

| Texte | Blocs | Empans |
|---|---:|---:|
| `A0044O0003TFR-V11` (Cyrille, Faivre) | 370 | 3 092 |
| Faivre, Catéchèses mystagogiques | 29 | 307 |
| Faivre, Homélie sur le paralytique | 10 | 105 |
| `A0044O0004TFR01` | 9 | 46 |
| Faivre, Homélie de la Présentation | 2 | 19 |

- **406 blocs sur 420 (96,7 %)** se convertissent sans réserve, et aucun de ces textes ne
  porte déjà `*`, `+`, `^` ni `<i>` ;
- **14 blocs** ont des empans qui se CHEVAUCHENT : on les relit un par un ;
- ⚠️ **on rejoint d'abord les empans que l'OCR a coupés en fin de LIGNE IMPRIMÉE** — deux
  empans séparés d'au plus un signe n'en font qu'un. Sans ce recollement, un enrichissement
  qui court sur deux lignes se marque deux fois, au milieu d'un mot ;
- ⛔ **on convertit AVANT toute écriture qui pourrait RACCOURCIR le texte.** Mesuré : la
  passe 2 telle qu'elle est écrite ne déplacerait aucun de ces 3 569 empans (0 déplacé,
  écart de longueur maximal 0 signe) — mais c'est une chance, non une garantie :
  `normaliserTypographieLecture` préserve la longueur par construction, et ces blocs ne
  portent aucune référence que le normaliseur sache réécrire. Une passe future qui
  raccourcirait l'un de ces textes les invaliderait EN SILENCE.

---

## 6. Passe 3 — les NATURES (structure)

C'est la passe la plus rentable de l'appareil, et la plus délicate : elle **fend** des
blocs.

### 6.1 Le bloc à trois têtes de Faivre

**396 blocs** portent, agglomérés dans un seul `commentary` :

```
(V) pag. 178. — Avec les démons les plus féroces et les plus opiniâtres. On peut consulter…
└──────┬─────┘   └────────────────────┬──────────────────────────────┘ └────────┬────────┘
 source_locator                     lemma                                  commentary
```

Trois natures, trois blocs, trois `rank`. La coordonnée se termine au tiret cadratin ;
⛔ **ce qui borne le LEMME n'est pas tranché**, et l'auteur en a demandé une séance à part
(charte § 13.12.3). Rien ne se fend tant qu'elle n'a pas eu lieu.

⛔ **La règle de PONCTUATION écrite ici fabrique de FAUX LEMMES**, et la donnée offre mieux.
Mesuré le 5 septembre 2026 sur les 396 blocs :

- une italique de l'OCR **ouvre juste après le tiret** dans **378 blocs (95,5 %)** ;
- **16** n'en portent aucune : ils ouvrent directement sur le commentaire, et la règle de
  ponctuation y couperait au hasard (« (G) pag. 140. — Tout ce paragraphe a été cité par
  Théodoret… ») ;
- **2** n'ont pas de tiret cadratin ;
- une fois rejoints les empans que l'OCR coupe en fin de LIGNE IMPRIMÉE (24 blocs),
  **345 sur 378 (91,3 %) se ferment sur une ponctuation forte**, celle-ci comprise DANS
  l'italique, comme l'imprimeur l'a composée ;
- des 33 restants, la plupart se ferment sur des points de suspension ou une virgule que
  l'édition compose ainsi ; **trois seulement sont de vraies bavures**, où l'OCR a italisé un
  mot du commentaire en plus du lemme.

⚠️ **Cette passe DÉPEND de la 5.4** : les italiques converties en marqueurs, le fendage se
lit dans le texte lui-même et non dans des offsets.

### 6.2 Les renvois internes

**79 blocs** ouvrent sur « Voy. », « Voir » ou « Consulter » — dont 41 rangés aujourd'hui en
`reference` et 38 en `commentary`. Ils prennent `internal_cross_reference` **quand ils
désignent un autre endroit de la MÊME œuvre** : ils ne pointent alors hors de rien, et
`reference` les composerait comme un renvoi bibliographique, avec un auteur et un titre
qu'ils n'ont pas.

⛔ **LE MOT D'OUVERTURE NE DÉCIDE DE RIEN** (arbitré le 5 septembre 2026, charte § 13.12,
décision 4). Sur ces 79 blocs, les uns renvoient à Paul Monceaux et à la *Revue d'histoire
ecclésiastique*, donc hors de l'œuvre ; les autres à « la note L, tome I, p. 131 » ou à
« Cat. XIV, note N ». **Sept seulement nomment explicitement une note.** On les lit un par
un : « il faut systématiquement faire un contrôle logique ; il faut que l'IA regarde de près
ce qui est écrit et réfléchisse ; on ne peut pas automatiser » (l'auteur). ⚠️ La règle écrite
se tirera de cette lecture — est interne le renvoi qui nomme une note, un tome ou un chapitre
de l'œuvre, et rien d'autre — mais elle vient APRÈS, non avant.

### 6.3 ✅ L'ACCUEIL EST POSÉ — on peut semer

⛔ **La charte d'abord, la donnée ensuite** (§ 7.6). L'ordre est : la charte, la contrainte
de la base, le vocabulaire du code, la composition, l'épreuve à l'écran — et **seulement
ensuite** on sème. ⛔ Jamais un `insert` qui poserait une nature que rien ne sait rendre :
le bloc ne paraîtrait nulle part, en silence — c'est le défaut que ce dépôt a déjà payé
quatre fois avec `NATURES_CORPS`.

**Les cinq premiers pas sont faits (5 septembre 2026).** Semer est désormais permis.

| # | Ce qui est en place | Où |
|---|---|---|
| 1 | la charte définit les natures et leurs quatre familles | §§ 13.10 et 13.11 |
| 2 | la contrainte accepte les huit natures | `texte_note_blocs_kind_check`, migration `sql/20260905_natures_bloc_note.sql` |
| 3 | le vocabulaire du code, source unique | `app/lib/naturesNote.ts` |
| 4 | le rendu compose les deux natures neuves | `ContenuNoteStructuree.tsx` |
| 5 | tests de composition | `ContenuNoteStructuree.natures.test.tsx` |

⚠️ **Le retour arrière ne vaut que TANT QUE RIEN N'EST SEMÉ** :
`sql/rollback_natures_bloc_note_20260905.sql` échoue dès qu'un bloc porte l'une des deux
natures neuves, et c'est voulu — ce qu'on fait alors de ces blocs ne se décide pas dans un
fichier de rollback.

⚠️ **Ce que la composition fait déjà, et qu'il ne faut pas refaire dans la donnée** : un
bloc d'`ancrage` placé EN TÊTE d'une note ne fait pas paragraphe, il se compose sur la
ligne du propos, en repère discret. Fendre le bloc de Faivre en trois ne se verra donc pas
en lecture : la note gardera l'aspect qu'elle a sur la page imprimée.

---

## 7. Passe 4 — le TYPE de la note (jugement)

⚠️ **16 873 blocs sur 24 264 (69 %) n'en portent aucun.** C'est le plus gros manque de
l'appareil.

**Comment on tranche.** La responsabilité RÉELLE du passage, jamais sa position (§ 13.2).

- la voix de l'auteur ancien → `author_note` ;
- « nous avons traduit », un choix de traduction, une adresse au lecteur français →
  `translator_note` ;
- la note savante de l'édition (Migne, Vivès, Bareille, Faivre, Knöll…) →
  `source_editorial_note` ;
- ce que NOUS ajoutons → `corpus_editorial_note`.

⚠️ **136 notes disent déjà leur type dans leur texte** (« (Note du Traducteur.) »). Elles
amorcent le lot, et **la mention en clair se retire du texte une fois le type posé** —
sans quoi le lecteur la lira deux fois.

⛔ **Un type faux est pire qu'un type absent** : il attribue à un Père une remarque de son
traducteur du XIXe siècle. Le doute laisse la note sans type et se signale.

**La méthode, arbitrée le 5 septembre 2026 : EN LOT PAR TEXTE, SAUF EXCEPTIONS NOMMÉES.**
Une édition a un responsable, et ses notes sont de lui. Mesuré en cherchant les notes qui
trahissent une seconde voix (« nous avons traduit », « le traducteur », « nous croyons ») :

- **34 textes, 10 348 blocs** n'en portent AUCUNE : ils se traitent d'un coup, soit 61 % du
  manque ;
- **10 textes, 6 525 blocs** en portent au moins une : ils demandent la lecture.

Les plus lourds : Cité de Dieu latine 3 758 blocs (0 voix tierce), Cyrille de Jérusalem
1 834 (148), Chrysostome sur les Psaumes 1 828 (1), Cité de Dieu française 1 806 (3), Manuel
pour mon fils 1 536 (0), Chrysostome sur la Genèse 1 318 (0).

⛔ **Sortent du lot pour être jugés à part** : les blocs qui disent « nous », ceux qui
nomment le traducteur, ceux qui portent déjà leur type en clair. Un sondage de contrôle ferme
chaque texte.

---

## 8. Passe 5 — la LANGUE

⚠️ **3 805 blocs sur 3 808 déclarés latins (99,9 %) ne portent aucune marque d'italique.**
Deux cas :

- **le bloc ENTIER est latin** — `language = 'la'` le dit déjà, et **c'est au rendu de
  l'italiser**. ✅ Arbitré, et SERVI depuis le 5 septembre 2026 (`estBlocEnLatin`) :
  **italique quelle que soit la longueur**, y compris les 27 blocs qui dépassent 900
  signes. Rien à écrire pour ce cas. ⛔ Le grec ne suit pas : son alphabet le distingue déjà,
  et l'italique y déforme la lettre. ⛔ L'apparat critique ne suit pas non plus : latin de
  bout en bout, l'italiser ne distinguerait rien.
- **le latin ENCHÂSSÉ dans une note française** — le plus fréquent et le plus coûteux.
  ✅ **Arbitré le 5 septembre 2026** : « il faut simplement le mettre en italique » (charte
  § 13.12.2). Aucune donnée ne dit où il commence : c'est une écriture, par marqueur
  d'italique, et une LECTURE — jamais un dictionnaire de mots courts, qui italiserait du
  français à chaque page. ⚠️ Une abréviation de renvoi (« ibid. », « id. », « op. cit. »,
  « cf. », « passim ») n'est pas du latin CITÉ : c'est une convention bibliographique, et
  elle ne s'italise pas. ⛔ Ne pas cumuler avec l'italique du bloc entier : un bloc
  `language = 'la'` est italisé au RENDU et son texte ne porte aucun marqueur. ⚠️ Sur les
  cinq textes de la passe 5.4, l'imprimeur a déjà fait le travail — 2 341 empans dans le seul
  `A0044O0003TFR-V11`, dont une part est du latin.

⛔ **On n'italise pas une citation FRANÇAISE** : l'italique dit ici la langue, les
guillemets disent la citation (§ 3.8).

---

## 9. Passe 6 — les RENVOIS INTERNES (recherche)

**692 renvois** de la forme `ibid.`, `Ibid. 25.`, `Ibidem. 7.`, `SALLUSTE, ibid.`, `Id.`

⛔ **Un renvoi ne se résout pas de mémoire.** On remonte la chaîne :

1. trouver la note qui PRÉCÈDE dans l'ordre de lecture — c'est ce que `ibid.` désigne ;
2. si elle est elle-même un `ibid.`, remonter jusqu'à la première qui NOMME l'œuvre ;
3. si la chaîne sort de la division sans rien nommer, ou si le rattachement est douteux,
   **on s'arrête et on signale** ;
4. écrire la référence complète, et conserver la forme imprimée en `metadata`.

⚠️ **La chaîne se rompt souvent au changement de division** : `Ibid.` en tête d'une
homélie renvoie à la dernière note de la précédente, ce qui n'a plus de sens quand on lit
chapitre par chapitre. C'est précisément pourquoi ces renvois doivent être résolus.

**Exemple mesuré.** « Voir, Lettre 92, 6 ; CXLVII, 36. » ne dit ni l'auteur, ni l'édition,
ni même que les deux numéros relèvent de la même correspondance. Le travail est
documentaire, non typographique, et se fait **avec le fac-similé sous les yeux**.

✅ **Ce qu'on fait des ORPHELINS, arbitré le 5 septembre 2026** (charte § 13.12, décisions 8
et 9). Mesuré sur les 116 blocs qui ouvrent sur « ibid. » ou « id. » : la note qui précède
immédiatement nomme une œuvre dans **43 cas (37 %)** ; il faut remonter de deux à douze notes
dans **60** ; et **13 ne se résolvent par aucun moyen mécanique**. La marche pour ces treize,
dans cet ordre :

1. **on les dépublie** ;
2. **on cherche au cas par cas**, au besoin dans le fac-similé ;
3. **on corrige** si la réponse est trouvée ; **on reconstitue avec une note éditoriale** si
   on le peut ; **on supprime** si on ne le peut pas.

⚠️ **« Dépublier » n'existe pas encore pour une note** : `texte_note_blocs` porte
`needs_review`, qui ne masque rien par lui-même, et aucune colonne ni métadonnée lue par le
site ne retire un bloc de la lecture. Le mécanisme se pose AVANT la passe, non pendant, et il
vaudra pour tout bloc qu'on voudra retenir — non pour les seuls treize orphelins.

✅ **Un « ibid. » résolu se compose ENTIER** : le lecteur lira « Augustin, *La Cité de Dieu*,
XI, 25 » et ne lira plus « Ibid., 25 ». La forme imprimée se conserve en `metadata`.

---

## 10. Passe 7 — les ŒUVRES CITÉES au CATALOGUE (recherche)

La référence devient une DONNÉE et le site la COMPOSE — modèle de la bibliographie de
Fillion (§ 35.6.1). ⛔ On ne rédige jamais « VIRGILE, *Énéide*, livre I. » à la main.

### 10.1 ✅ La table est `ouvrages_bibliographiques` (arbitré le 5 septembre 2026)

⛔ **DEUX GARDES.**

1. **Un auteur ancien n'y reçoit JAMAIS de fiche notée** (§ 29). Sans quoi inscrire
   l'Énéide ferait basculer en `a_verifier`, par la branche `auteur_non_evalue`, la valeur
   scientifique de la notice qui la cite.
2. **Les champs d'ÉDITION restent vides** quand on ne cite que l'œuvre : `lieu`,
   `editeur`, `annee`, `isbn` décrivent un exemplaire imprimé, et l'Énéide n'en a pas. On
   les renseigne lorsque la note cite une édition précise (« trad. de V. Cousin »).

⚠️ Le `type_ouvrage` d'une œuvre ancienne est `source_primaire` — la valeur existe et
porte déjà 146 notices.

### 10.2 Ce qu'on écrit, ce que le site compose

**Écrit** : la fiche de l'œuvre ; sur le bloc, le renvoi vers elle et le **locus** (livre,
chapitre, paragraphe, vers) ; la forme imprimée en `metadata`.

**Composé** : l'auteur, le titre en italique, le locus en toutes lettres, la ponctuation,
et **une référence par ligne** quand la note en porte plusieurs — « Cité de Dieu, liv. 16,
ch. 3 ; Rétractations, liv. 2, ch. 16. » devient deux lignes, chacune sous le nom
d'Augustin.

⛔ Les abréviations `liv.`, `ch.`, `chap.`, `cap.`, `lib.` (**339 blocs**) ne se retirent
pas à la main : elles cessent d'exister dès que le locus est une donnée.

⛔ **L'auteur est TOUJOURS nommé.** 689 renvois portent un nom en capitales sans autre
contexte (« SOLIN., c. XLVII ; PLIN., lib. VIII, c. XLII. »), et beaucoup n'en portent
aucun (« cap. ix », « Géorg., II. »). Un renvoi qui ne nomme pas son auteur n'est pas une
référence : c'est une note pour qui a déjà le livre ouvert.

---

## 11. Passe 8 — la NUMÉROTATION

✅ **Le numéro AFFICHÉ recommence à chaque début de NIVEAU 1** (arbitré le 5 septembre
2026).

✅ **Le calcul est SERVI depuis le 5 septembre 2026** (`app/lib/numerotationNotes.ts`,
branché dans `app/oeuvre/[id]/page.tsx`) : il n'y a **rien à écrire en base** pour cette
passe, et il n'y aura rien à y écrire. ⚠️ La division d'une note se lit sur le `ref_niv1`
du segment ANCRÉ, jamais dans `texte_notes.book` : sur 8 580 notes des 23 729 du corpus
(36 %, dans 39 textes sur 47), les deux diffèrent.

⛔ **Le numéro INTERNE ne bouge pas.** `note_key` et `note_number` portent l'identité et
l'ordre de lecture, dont dépendent 23 569 ancres.

⛔ **L'APPARAT CRITIQUE compte à part.** Mêlé aux notes de lecture, il les noie : les
Confessions passent de **1 039** à moins de 90 par livre dès qu'on l'en sort.

⚠️ **Treize textes sur quarante-sept garderont trois chiffres** : Cité de Dieu latine
**731**, Manuel pour mon fils 443, Heptateuque 241, Catéchèses baptismales 222, les quatre
Bareille 192-210 (un seul niveau 1, rien ne change pour eux), Cité de Dieu française 172,
Du corps et du sang 140. Recommencer au CHAPITRE les mettrait tous sous cent sauf un ;
l'arbitrage a été rendu autrement, et il peut se rouvrir texte par texte.

---

## 12. Passe 9 — la CLÔTURE

Contrôles obligatoires (§ 8.1), depuis la base, après écriture :

- même nombre de notes et d'ancres qu'avant ; le nombre de BLOCS peut augmenter (passe 3) ;
- aucune note sans ancre, aucune ancre sans note, aucun doublon de `note_key` ;
- ordre des blocs continu, `rank` sans trou ;
- aucun bloc d'apparat critique touché ;
- toute nature employée est au vocabulaire, et le rendu sait la composer ;
- la sauvegarde relue et le retour arrière éprouvé ;
- **l'œuvre ouverte à l'écran**, deux ou trois notes lues dans le texte servi.

⚠️ **Le dernier point n'est pas une politesse.** Ce dépôt a déjà vu une section entière
rester invisible en ligne pendant que ses neuf tests passaient.

---

## 13. Passes À PART (hors de la marche œuvre par œuvre)

Quatre décisions du 5 septembre 2026 ne se jouent pas œuvre par œuvre : elles portent sur le
corpus entier, ou sur le code.

### 13.1 Le motif du normaliseur accepte le chapitre romain en MINUSCULES

✅ **Arbitré** (charte § 13.12, décision 11). ⚠️ **Le chiffre de 1 716 annoncé jusqu'ici était
FAUX** : mesuré en passant chaque cas par la vraie fonction, il y a **355 occurrences** de la
forme « <mot>. <romain minuscule>, <nombre> », dans 355 blocs et 14 textes, dont **223
seulement seraient réécrites**.

⛔ Le risque est borné par le motif lui-même : il n'agit que si le mot qui précède résout vers
un livre du référentiel. « Cor. » (58 occurrences), « Ibid. » (26), « Thess. » et « Eccl. »
en sont volontairement absents comme équivoques et restent intacts — vérifié sur la vraie
fonction : « Cor. XV, 22 » et « Ibid. V, 12 » ne bougent pas. Un caractère à changer dans
`RE_RENVOI` (`app/lib/referenceNote.ts`), plus des tests de non-régression sur les cas
laissés intacts. ⚠️ Chaque bloc touché se signale, pour un contrôle par sondage.

### 13.2 Le référentiel accueille les variantes NON ÉQUIVOQUES

✅ **Arbitré** (décision 12), une à une, chacune vérifiée sur ses occurrences réelles :
« Ephés. » (3), « Ephes. » (1), « Math. » (2), « Galat. » (1), « Apocal. » (1), « Nomb. » (2),
« Sag. » (2). ⛔ Restent dehors, équivoques : « Cor. » (58), « Thess. » (6), « Eccl. » (4),
« Tim. » (2), « Par. » (1).

### 13.3 Les métadonnées se réunissent sous UN nom

✅ **Arbitré** (décision 10) : `human_validated` (14 000 blocs) l'emporte sur
`validated_human` (5 662), `reference_normalized` (1 682) sur `normalised_reference`
(1 032). ⚠️ Sans risque, et c'est mesuré : les **901 blocs qui portent les deux premiers
s'accordent tous**, sans une contradiction, et les deux seconds ne se rencontrent jamais sur
un même bloc. Le nom retenu est déjà celui que lit `lireMetadonneesBlocNote`.

### 13.4 La page cesse de transporter le journal d'atelier

✅ **Arbitré** (décision 13) : `metadata` porte plus de 150 clés distinctes, pour l'essentiel
un journal de travail daté, et **554 blocs y portent une copie complète d'un bloc** (`text`,
`kind`, `form`, `rank`, `language`… toutes à 554). Le site n'en lit que quatre
scalaires, mais le `jsonb` ENTIER voyage jusqu'au navigateur, pour 24 264 blocs. ⛔ **On
restreint la LECTURE aux clés projetées** : gain sans arbitrage, sans toucher une donnée.
⚠️ Le journal appartient à GPT, et il se supprime s'il ne sert à rien — la décision lui
revient. Les 554 copies de bloc, elles, sont une seconde vérité et se regardent à part.

---

## 14. Ce que le protocole NE couvre pas encore

- `segments.notes` (**2 456**) et `versets_v2.notes` (**3 641**) : notes libres, hors du
  modèle structuré, dette explicite du § 8.1. Elles ne se normalisent pas avant migration.
- `bible_verse_notes` (**8 695**) et `bible_editorial_body_block_notes` (**371**) : notes
  de Fillion, doctrine et numérotation propres (§ 35). Hors de ce protocole.
- **La FENTE du bloc à trois têtes de Faivre** (§ 6.1) : sur quoi borner le lemme n'est pas
  tranché, et l'auteur en a demandé une séance à part.
- **« Dépublier » une note** (§ 9) : la décision est prise, le mécanisme n'existe pas.
- **Le renvoi interne reste un TEXTE, non un lien** : `internal_cross_reference` sépare ce
  qui pointe au dedans de ce qui pointe au dehors, mais rien ne DÉSIGNE encore la note ou le
  segment visés. La lecture de la passe 3 le prépare ; la cible se posera quand le modèle
  saura la porter.
