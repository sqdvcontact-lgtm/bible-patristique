# Protocole de révision des NOTES — une œuvre à la fois

Écrit POUR LES IA qui produisent ou corrigent l'appareil de notes, sur le modèle de
`work/fillion/STYLES_BIBLIQUES.md`. La doctrine fait foi (charte `parametres.charte_ia`,
§§ 3.5.1, 3.8, 7.1, 7.6, 8, 13.8 à 13.10) ; ce document dit **comment on s'y prend**, dans
quel ordre, et ce qu'on ne fait surtout pas.

⚠️ **État : v3, 5 septembre 2026.** La v1 ouvrait sur « le site compose, la base
conserve » : **l'auteur l'a corrigé le jour même**, et la v2 avec (voir § 0). Les cinq
points qui commandaient le travail sont arbitrés et datés. Le protocole est applicable en
entier.

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
| **`internal_cross_reference`** *(neuve)* | le renvoi à une autre note, ou ailleurs dans la même œuvre | ~116 |

⛔ **La LONGUEUR n'est pas une nature.** 2 958 blocs de commentaire tiennent en
quatre-vingts signes, 62 dépassent deux mille : c'est le même acte éditorial, et la
composition s'adapte à la mesure sans qu'on nomme deux styles.

⛔ **Une note DE note n'est pas une nature** — c'est une relation, et
`texte_note_relations` existe pour cela (35 blocs concernés).

### 1.2 Les types (charte § 13.8)

`author_note`, `translator_note`, `source_editorial_note`, `corpus_editorial_note`,
`critical_apparatus`. ✅ Le type paraît sur **toutes** les notes, sans exception.

---

## 2. L'ordre des opérations, œuvre par œuvre

```
0. RELEVÉ        — on mesure avant de toucher                      (aucune écriture)
1. SAUVEGARDE    — l'appareil entier de l'œuvre, dans internal.
2. PROPRETÉ      — préfixes, ponctuation, typographie, abréviations (mécanique)
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

**3 622 blocs** le portent, et le lecteur le voit. C'est une PROVENANCE, et une provenance
vit dans `metadata`.

- retirer `^Référence imprimée\s*:\s*` du `text` ;
- poser `metadata.provenance_note = 'reference_imprimee'` ;
- ⚠️ ne rien retirer d'autre : ce qui suit est la référence, telle qu'imprimée.

### 5.2 La ponctuation finale entre dans la donnée

**6 431 notes sur 16 408 (39 %)** n'en portent aucune. On applique `terminerNote` **à la
dernière pièce de la note**, et l'on écrit le résultat.

⛔ **À la DERNIÈRE pièce, jamais à chaque bloc** : une note de quatre blocs ne prend qu'un
point final. C'est ce que fait le rendu, et la donnée doit dire la même chose.

### 5.3 La typographie et les abréviations bibliques

On applique `normaliserTypographieLecture` (espaces § 3.2, ponctuation des citations
§ 3.8) et, sur les blocs `reference`, `normaliserReferencesDansTexte` (abréviation
normative espacée, chapitre en chiffres arabes, virgule avant le verset).

⚠️ **La leçon imprimée se conserve avant d'écrire** : `metadata.forme_imprimee` reçoit le
`text` d'origine dès qu'il change.

⛔ **Les quatre exceptions du § 0 ne passent par aucune de ces trois étapes.**

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

Trois natures, trois blocs, trois `rank`. ⚠️ On ne devine pas la frontière : la
coordonnée se termine au tiret cadratin, le lemme à la première ponctuation forte qui
suit — **et si l'un des deux repères manque, on ne fend pas**, on signale.

### 6.2 Les renvois internes

**~116 blocs** ouvrent sur « Voy. », « Voir », « Consulter », ou nomment une autre note
(« Voyez la note I, p. 150 »). Ils prennent `internal_cross_reference` : ils ne pointent
hors de rien, et `reference` les composerait comme un renvoi bibliographique, avec un
auteur et un titre qu'ils n'ont pas.

### 6.3 Avant de semer une nature neuve

⛔ **La charte d'abord, la donnée ensuite** (§ 7.6). Le vocabulaire est fixé en charte
§ 13.10 ; il entre dans la contrainte de la base ; **puis** on sème ; **puis** on compose ;
**puis** on éprouve à l'écran. ⛔ Jamais un `insert` qui poserait une nature que rien ne
sait rendre : le bloc ne paraîtrait nulle part, en silence — c'est le défaut que ce dépôt
a déjà payé quatre fois avec `NATURES_CORPS`.

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

---

## 8. Passe 5 — la LANGUE

⚠️ **3 805 blocs sur 3 808 déclarés latins (99,9 %) ne portent aucune marque d'italique.**
Deux cas :

- **le bloc ENTIER est latin** — `language = 'la'` le dit déjà, et **c'est au rendu de
  l'italiser**. ✅ Arbitré : **italique quelle que soit la longueur**, y compris les 27
  blocs qui dépassent 900 signes. ⛔ Le grec ne suit pas : son alphabet le distingue déjà,
  et l'italique y déforme la lettre. ⛔ L'apparat critique ne suit pas non plus : latin de
  bout en bout, l'italiser ne distinguerait rien.
- **le latin ENCHÂSSÉ dans une note française** — le plus fréquent et le plus coûteux.
  Aucune donnée ne dit où il commence : c'est une écriture, par marqueur d'italique.

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

## 13. Ce que le protocole NE couvre pas encore

- `segments.notes` (**2 456**) et `versets_v2.notes` (**3 641**) : notes libres, hors du
  modèle structuré, dette explicite du § 8.1. Elles ne se normalisent pas avant migration.
- `bible_verse_notes` (**8 695**) et `bible_editorial_body_block_notes` (**371**) : notes
  de Fillion, doctrine et numérotation propres (§ 35). Hors de ce protocole.
- **1 716 renvois** gardent un chapitre romain en MINUSCULES (« Matth. x, 22 »), que le
  motif de `RE_RENVOI` n'accepte pas. Élargir la reconnaissance attend une décision.
- Les **métadonnées ont dérivé** : `human_validated` (14 000) et `validated_human` (5 662)
  disent la même chose sous deux noms ; `reference_normalized` (1 682) et
  `normalised_reference` (1 032) aussi. À unifier, dans une passe à part.
