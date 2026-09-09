# Pour GPT — l'axe du TYPE d'une note (9 septembre 2026)

Passation de Claude. Le rendu et la charte sont faits ; ce qui suit est de la **donnée**,
donc de toi. ⛔ **Rien n'a été écrit dans `texte_note_blocs`.**

---

## 1. Ce qui est déjà fait — pour que tu ne cherches pas un défaut résolu

- **Le lemme ne se compose plus comme la coordonnée.** Tous deux sont de la famille
  `ancrage` et s'ouvrent sur la ligne du propos, mais le lemme est un mot de l'œuvre et
  la coordonnée un repère de l'appareil : la reprise passe en **italique**, la coordonnée
  garde le gris réduit. C'est la « raison nommée » du § 13.11, écrite au **§ 13.11.2**.
  ⚠️ Cela vaut *avant* que la passe 3 fende les 396 blocs de Faivre, qui les poseront
  côte à côte sur la même ligne.
- **Le renvoi interne peut suivre sa cible en ligne.** Le rendu ne rattachait que
  `reference` et `attribution` ; un `internal_cross_reference` posé avec
  `rendering = 'inline_after_target'` aurait fait paragraphe **en silence**. Tu peux
  désormais le poser sans piège.
- **Un contrôle existe** : `node scripts/controle-roles-notes.mjs`. Il lit le vocabulaire
  dans `app/lib/typeNote.ts` (jamais une copie) et liste les rôles que le site ne sait pas
  lire, texte par texte.

---

## 2. Ce qui te revient — 1 037 blocs portent un rôle que rien ne lit

`libelleTypeNote` rend « Note » sur toute valeur inconnue, exactement comme sur une note
jamais typée : **le défaut n'a aucun symptôme**, et c'est pour cela qu'il a duré.

### a. `translation_note` → `translator_note` — 258 blocs, `TXT_A0176O0001_FR_IA_2026`

Le code lit `translator_note`, qui a **0 bloc** ; la base porte `translation_note`, qui en a
258. C'est la décision 10 (§ 13.12) portée aux rôles : **des deux noms, le survivant est
celui que le code lit.** Les 258 notes sont unanimes — tous leurs blocs portent ce rôle —,
donc chacune s'annoncera « Note du traducteur » dès le renommage, au lieu de « Note ».

⚠️ **L'arbitrage est à la charte (§ 13.12.4) : `translator_note`, et non
`corpus_editorial_note`.** C'est notre propre traduction, mais le type nomme une FONCTION
dans l'édition, non la maison qui la publie. Sinon `corpus_editorial_note` absorberait tout
ce que nous produisons et l'axe cesserait de distinguer.

⛔ **Relis avant de renommer en lot.** Au moins un bloc parle de l'état du texte et non
d'un choix de mot : « Toute la période sur Lucifer est grammaticalement altérée. Bondurand
c[orrige]… ». Celui-là est une note de l'édition, pas du traducteur, et *un type faux est
pire qu'un type absent*.

### b. `source_marginalia` — 659 blocs, six textes → `metadata.provenance_note`

Ce rôle déclare la manchette imprimée. Or la manchette du site ne lui doit rien : elle
reconnaît ses renvois à leur **forme**, une note qui n'est qu'un renvoi. Mesuré : des
**383 notes** qui le portent, **312 passent déjà en manchette** sans qu'il soit lu une fois.

Il quitte donc l'axe du type — mais **retirer n'est pas supprimer** : ce qu'il dit de la
provenance passe dans `metadata.provenance_note`, le champ que la décision 2 institue et
qui ne porte **aucune valeur** aujourd'hui. Ensuite seulement, `editorial_role` se libère.

⚠️ Deux suites : les **71 notes** que la manchette ne prend pas (elles portent autre chose
qu'un renvoi) demandent d'être regardées ; et ces six textes se retrouvent alors **sans
aucun type**, à traiter en lot par la méthode du § 13.12.1 — Bareille est un traducteur du
XIXe, ses notes sont selon toute apparence `source_editorial_note`.

### c. `reference_biblique_detachee` — 120 blocs, `TXT_A0014O0098_FR_1865_JEANNIN`

Un nom français au milieu d'un vocabulaire anglais, et surtout : il nomme une
**disposition**, non un locuteur. Ce qu'il dit du détachement s'écrit dans `rendering` ;
l'axe du type doit le rendre. Ces 120 blocs sont déjà `kind = 'reference'`.

---

## 3. Ce qui reste OUVERT, et que je n'ai pas touché

⚠️ **`rendering` est un axe sans vocabulaire.** Là où `kind` a une contrainte SQL et une
source unique, la colonne voisine accepte n'importe quoi : **7 787 blocs en portent un, le
rendu n'en lit que 79** (`inline_after_target`, `manual_line_break_in_verse`). Le reste est
de l'étiquette d'import — `markdown` 4 641, `reference_biblique_imprimee_non_liee` 1 702,
`word_paragraph` 516, `note_editoriale_imprimee` 409, `plain` 265, `word_footnote` 78,
`Footnote Verse` 70 — et **26 blocs portent la chaîne `{}`**, qui n'est le nom de rien.

Trois choses y sont mêlées : le format du texte source, l'outil dont il vient, la
disposition voulue. ⛔ Ne pose pas de contrainte tant qu'elles ne sont pas démêlées : elle
ferait échouer les imports au lieu de les corriger. Charte § 13.12.4.

---

## 4. Quand tu as fini

```
node scripts/controle-roles-notes.mjs
```

Il doit finir sur « ✅ Aucun rôle hors vocabulaire ». Tant qu'il sort en échec, des notes
s'annoncent « Note » alors que la base sait qui parle.
