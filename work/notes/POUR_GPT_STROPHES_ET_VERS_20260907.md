# Pour GPT — la strophe et la lineation des vers (7 septembre 2026)

Passation de Claude. Le rendu est corrigé et déployé ; ce qui suit relève des **données**,
donc de toi. Rien n'a été écrit en base : ni `segments`, ni `segment_metadata`.

---

## 1. Ce qui a été corrigé côté rendu — pour que tu ne cherches pas un défaut résolu

L'auteur signalait que les vers du *Manuel pour mon fils* de Dhuoda ne s'affichaient pas
correctement. Ce n'était pas la donnée : c'était une **cinquième surface de rendu** que la
charte § 7.4 ne connaissait pas.

L'argument hissé en tête d'une division (`nature = 'introduction'`) se rend **hors des
groupes**, par une branche à lui, et cette branche ignorait `segment_metadata.forme = 'vers'`.
Les 79 vers de l'*Epigramma* s'y composaient donc en **prose justifiée et césurée**, un bloc
par vers. Le poème demande pourtant qu'on lise l'initiale de chaque vers — « Lector qui cupis
formulam hanc nosse, capita perquiras apta versorum » —, et la justification détruisait
précisément cela.

Corrigé : la branche refait le poème (`fusionnerBlocs`) et chaque ligne prend la géométrie
partagée du vers (`styleLigneDeVers`). Charte § 7.4 et `AGENTS.md` mis à jour, garde
`app/lib/versCinqSurfaces.test.ts` portée de quatre à cinq surfaces, spécimen ajouté à
`/admin/styles`.

⚠️ **La note d'`AGENTS.md` qui réclamait la re-segmentation de Dhuoda est SOLDÉE** : ses 79
vers d'introduction, 56 de corps et 19 de citation sont bien des lignes, jointes par un
`join_before` qui porte le saut. Merci — c'était le préalable.

---

## 2. Ce qui te revient : `stanza_before` est nul sur 602 vers, dans cinq textes

Mesuré le 2026-09-07 : **2 907 segments portent `forme = 'vers'`**, dont **602 sans
`stanza_before`**. `ouvreStrophe` retombe alors sur un changement de `paragraphe`.

| texte | espace / nature | vers | sans marque |
|---|---|---:|---:|
| `A0064O0001T0001` — Boèce, latin de Migne | corps / texte | 429 | **429** |
| `TXT_A0176O0001_1887_BONDURAND` — Dhuoda | introduction | 79 | **79** |
| `TXT_A0176O0001_1887_BONDURAND` | corps / texte | 56 | **56** |
| `TXT_A0176O0001_1887_BONDURAND` | corps / citation | 19 | **19** |
| `A0010O0001T0002` — Confessions, français | corps / citation | 8 | **8** |
| `TXT_A0064O0001_FR_1861_MIRANDOL` | apparat / apparat_editeur | 7 | **7** |
| `TXT_A0047O0034_FR_1604_MOREL` — Discours 38 | introduction / apparat_editeur | 4 | **4** |
| `TXT_A0064O0001_FR_1646_CERIZIERS` | corps / texte | 1 213 | 0 |
| `TXT_A0064O0001_FR_1861_MIRANDOL` | corps / texte | 1 092 | 0 |

⛔ **Et les 2 305 marques renseignées ne se valent pas.** `stanza_before_source` tranche :
celles de **Ceriziers ont été LUES sur la page** (1 210 sans provenance, 3 corrigées sur le
fac-similé) ; les **1 092 de Mirandol portent `derive_paragraphe`** — déduites du `paragraphe`
par la passe du 2026-08-23, donc un repli matérialisé, non un témoignage.

Le corpus n'a donc **qu'un seul témoin attesté**.

---

## 3. Le faisceau : ce que `paragraphe` produit, comparé à ce qu'on a lu

Relevé par `scripts/strophes-controle.mts`, qui rejoue `ouvreStrophe`, `estEnVers` et
`marqueStrophe` — les fonctions du site, jamais une copie — et compte les **frontières
ouvertes** : les strophes posées après une ligne qui **ne ferme pas sa phrase**.

| provenance de la marque | strophes | ouvertes | part |
|---|---:|---:|---:|
| Ceriziers — **lue sur la page** | 78 | 6 | **7,7 %** |
| Mirandol — `derive_paragraphe` | 34 | 16 | 47,1 % |
| Boèce latin — repli sur `paragraphe` | 34 | 15 | 44,1 % |
| Dhuoda, introduction — repli | 17 | 8 | 47,1 % |
| Confessions, citations — repli | 7 | 7 | 100 % |

**Tout ce qui vient de `paragraphe` pose une frontière sur deux au milieu d'une phrase ; la
seule édition dont les strophes ont été lues en pose une sur treize.** L'enjambement d'une
strophe à l'autre existe — Ceriziers le prouve, six fois — mais il y reste l'exception.

⛔ **Ce n'est pas une preuve.** Ce faisceau ne dit pas où sont les strophes de ces cinq
textes ; il dit que `paragraphe` ne les porte vraisemblablement pas. L'arbitrage est
philologique, et il t'appartient.

⚠️ **Deux raisonnements faux ont été tenus avant ce tableau, et retirés** : que
l'irrégularité des groupes trahissait la fiction (Ceriziers, attesté, va de 1 à 66 vers), puis
que les marques de Mirandol étaient attestées. On lit `stanza_before_source` avant de comparer.

Pour rejouer :

```
node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/strophes-controle.mts
node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/strophes-controle.mts --detail A0010O0001T0002
```

---

## 4. Un cas certain : les 8 vers cités dans les Confessions

`A0010O0001T0002`, `espace_textuel = corps`, `nature = citation`, segments 5917 à 5924.
Chacun porte un **`paragraphe` différent**, si bien que le repli en fait **huit strophes d'un
seul vers** — un blanc entre chaque ligne d'un poème qui n'est qu'une période :

> … Dieu dont le pouvoir par un art sans pareil / Regle des feux du Ciel l'inconstante
> carriere : / Qui fais briller le jour d'une vive lumiere, / Et respans sur la nuit les
> charmes du sommeil ; / Afin qu'un doux repos se glissant dans nos veines / Délasse le corps
> foible apres ses longs travaux ; / Que de l'ame abbatuë il enchante les maux, …

Les huit frontières tombent après une virgule ou un point-virgule. Aucune lecture ne rend cela.

---

## 5. Un défaut de SEGMENTATION, sur un texte publié

`A0064O0001T0001` — le latin de Boèce (Migne), **public et lisible seul** par le mode
« Latin ». **310 de ses 429 segments en vers contiennent un saut de ligne**, 490 en tout :

> `Vitrea dudum,\nParque serenis\nUnda diebus,`

C'est exactement le défaut que Dhuoda portait avant sa re-segmentation : un segment y porte
plusieurs vers.

⚠️ **Il ne se voit que d'un côté.** En lecture EN REGARD, la colonne originale passe par
`lignesDeVers`, qui découpe sur le saut : chaque vers y a sa boîte. Lu **seul**, le segment
passe par la composition ordinaire, et ni `styleBlocDeVers` ni `styleLigneDeVers` ne portent
`white-space` — les sauts retombent en espaces et les vers se recollent sur une ligne.

Deux façons d'en sortir, et elles ne sont pas équivalentes :

- **la re-segmentation** (ton domaine) : un segment = un vers, `join_before` portant le saut,
  comme Dhuoda l'a reçue. C'est la voie que la charte § 7.4 prescrit ;
- **un correctif de rendu** (le mien) : découper par `lignesDeVers` et rendre une boîte par
  vers. ⛔ Pas `white-space: pre-line` : `text-indent` ne s'applique qu'à la première ligne
  d'un bloc et jamais après un saut forcé, si bien que l'alinéa et le retrait de suite ne
  serviraient que le premier vers du segment.

Le second masquerait le premier sans le résoudre. Dis-moi si tu prends la re-segmentation ;
sinon je poserai le correctif de rendu, qui vaut de toute façon comme filet.

---

## 6. Ce que la charte demande, pour mémoire

§ 7.4 : **un import de vers renseigne `stanza_before` sur CHAQUE ligne, `false` compris.**
`false` veut dire « l'édition a répondu non », `null` veut dire « l'édition n'a rien dit », et
seul le second retombe sur le `paragraphe` — c'est cette distinction qui porte tout le filet.

Et toute valeur qui ne vient pas de l'import porte sa provenance dans
`stanza_before_source` : `derive_paragraphe`, `corrige_facsimile_p19`, ou le nom de la passe
qui l'a posée. Sans elle, on ne sait plus dans six mois ce qu'on a lu et ce qu'on a inféré —
c'est exactement l'erreur que je viens de commettre sur Mirandol.
