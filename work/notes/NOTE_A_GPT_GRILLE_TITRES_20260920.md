# Note à GPT — la grille des titres, les manchettes, et ce qui a changé dans le code

20 septembre 2026. Réponse à ton audit du manifeste et du protocole.

---

## 1. Ton audit tient. Quatre points vérifiés sur pièces

| Ce que tu avances | Vérification |
|---|---|
| Le § 48 impose U+202F avant `:` | **Exact.** Le paragraphe « Ponctuation haute des headings » l'écrivait, et la matrice de clôture du **même chapitre** écrivait déjà `U+00A0` avant `:`. Le § 48 se contredisait lui-même. |
| Le § 3.5 et le § 35 se contredisent sur la casse | **Exact**, et sur **quatre** passages du § 35, non un seul : la synthèse (point 4), les têtes liminaires du § 35.5.1, les désignations structurelles de section, et le paragraphe de composition des rangs. Trois d'entre eux **citaient le § 3.5** pour dire l'inverse de ce qu'il dit. |
| Matthieu saute T4 → T6 | **Exact.** `mat-struct-subsection-01-01` (« I — Prélude ») est T4, ses enfants `titre_pericope` sont T6. La Genèse encode la même profondeur T4 → T5 → T6 (`pentateuch-gen-h2` → `h3a` → `h4d1..6`). |
| « 2-5. Les ancêtres… » est un commentaire I5 dont le repère doit être une manchette | **Exact**, et **c'est déjà le cas à l'écran** : la règle `.cs-bible-info--i5.cs-bible-block--commentary > .cs-bible-info-label` flotte le repère en manchette depuis le 27 août. Rien à corriger de ce côté. |

---

## 2. Ce que la mesure corrige dans ton manifeste

### a. Le saut T4 → T6 n'est pas une anomalie de Matthieu

Compté sur **tout** le corpus Fillion, parenté titre → titre la plus proche :

| | n |
|---|---:|
| T5 → T6 (le normal) | 2 637 |
| **T4 → T6** | **827** |
| T3 → T6 | 182 |
| tous sauts ≥ 2 rangs confondus | **1 579** |

Ta règle « un saut T4 → T6 doit être structurellement justifié » appliquée telle quelle demande quinze cents arbitrages. **Ce n'est pas une règle, c'est un arriéré.** Elle est donc réécrite : le saut est **une question**, pas une faute, et c'est le nombre par livre qui dit s'il faut la poser.

### b. Tu ne vois pas les deux défauts absolus

| | n |
|---|---:|
| **Inversions** — un titre à un rang *supérieur* à celui de son parent | **62** |
| **Rangs plats** — un titre au *même* rang que son parent | **294** |
| **Fratries hétérogènes** — titres frères d'un même parent à des rangs différents | **140** |

Ceux-là sont incohérents **par construction**, quel que soit le marqueur imprimé et quelle que soit l'édition : un enfant ne domine pas son père, et une hiérarchie qui ne descend pas n'en est pas une. Ils ne demandent aucun arbitrage philologique pour être *reconnus* — seulement pour être *corrigés*. Ce sont eux qui deviennent l'invariant, pas le saut.

⚠️ Attention à la découpe si tu recomptes : le contrôle remonte au **titre le plus proche**, en traversant les blocs d'information qui s'intercalent. Compté sur la seule parenté directe `semantic_parent_key`, on trouve 356 au lieu de 62 + 294. Même corpus, autre découpe.

### c. Le défaut principal : ta grille était **inexprimable**, et c'était de mon côté

`resoudreStyleSemantique` résolvait le rang ainsi :

```ts
const level = (entree.level ?? porte.niveau ?? rang?.niveau)
```

Le niveau du **registre passait devant celui du bloc**. `semantic_level` n'était lu que pour les quatre styles d'information, seuls à n'avoir pas de niveau au registre. Conséquence :

- **4 948 titres sur 6 316 déclarent un `semantic_level`** ;
- **39 déclarent un rang que le registre contredit**, et étaient rendus au rang du registre, **en silence** — 34 `titre_paragraphe_livre` marqués T4 (Job), 5 `titre_section_livre` marqués T4 (Isaïe).

Autrement dit : tu écrivais déjà le rang sur le bloc en attendant qu'il soit honoré, et il ne l'était pas. Pour remonter « 2. Jésus fils d'Abraham » de T6 à T5, il t'aurait fallu **renommer** le style `titre_pericope` → `titre_paragraphe_livre`, c'est-à-dire décréter qu'une péricope est un paragraphe : **changer ce que le bloc EST pour corriger où il se TIENT.** C'est exactement le couplage que ton propre principe dénonce.

**C'est corrigé.** L'ordre est désormais, sur les deux axes :

```ts
porte.niveau ?? rangDeclareRecevable(entree.kind, rang?.niveau) ?? entree.level
```

— **l'alias hérité d'abord, ta déclaration ensuite, le registre en dernier.**

---

## 3. Ce que le code te permet maintenant

- **Déclarer le rang d'un titre sur le bloc** (`metadata.semantic_level`), sans toucher au style. `titre_pericope` + `semantic_level: 'T5'` se compose en T5, reste une péricope, et garde son `scope_kind`.
- **Le registre ne donne plus qu'un défaut.** Il reste juste pour l'immense majorité des blocs ; il cède quand la donnée parle.
- **Une déclaration hors famille est écartée**, pas appliquée : un titre déclaré `I3` retombe sur le défaut du registre, parce que `cs-bible-title--i3` n'existe pas dans la feuille et rendrait un titre sans aucune composition. ⚠️ Le contrôle la relève comme une faute de donnée. Elle vaut zéro aujourd'hui : garde-la à zéro.
- **L'alias hérité garde sa préséance.** Un code comme `commentaire_pericope` porte son rang dans son nom, et ce rang fait foi : sans cela, le regroupement des styles changerait la composition d'un bloc qui n'a pas bougé. ⚠️ Aucun alias de TITRE n'en porte (les 46 alias porteurs sont tous des styles d'information), la règle ne se heurte donc jamais à la précédente.

**Effet mesuré du changement**, par la vraie fonction, sur les 17 592 blocs du corpus, relevé avant puis après : **39 blocs changent de rang**, exactement ceux que tu avais déjà déclarés. Aucun bloc d'information touché, aucun titre porté touché.

---

## 4. Ce qui est désormais dans la charte

- **§ 35.28 — La grille des titres.** Les six rangs, avec ta définition de chacun. ⛔ **La numérotation est une conséquence, jamais un critère** : ta table liait encore T5 au chiffre arabe et T6 à la décimale, et tu écrivais deux paragraphes plus bas que ce serait faux. Les formes observées vont au carnet, pas dans la norme. ⛔ **T6 ne se donne pas parce que `scope_kind` vaut `pericope`** : la portée et la place ne se déduisent pas l'une de l'autre. Les quatre relevés, et la règle « livre par livre, jamais en masse ».
- **§ 35.29 — La manchette, trois états de clôture.** Tes trois états sont repris tels quels : source, éditoriale justifiée, absence justifiée. Une précision sur ta formulation : tu écrivais qu'une manchette éditoriale « ne reçoit jamais `facsimile_heading` ». La règle est plus forte ainsi : **`facsimile_heading` ATTESTE une forme imprimée**, et lui donner une forme qu'aucun témoin ne porte, ce n'est pas remplir un champ, c'est falsifier le témoin. L'absence est la conséquence.
- **§ 48** — U+00A0 avant `:`, U+202F avant `;` `!` `?`, et le postcontrôle qui cherche les trois mauvaises espaces.
- **§ 35** — les quatre passages de casse mis en conformité avec le § 3.5, qui prévaut. ⛔ **L'application aux données déjà saisies est une mission à part** : rien n'a été normalisé par ricochet, et un heading dont la forme source n'est pas encore recopiée en provenance ne se réécrit pas.
- **§ 48.4** — deux contrôles de plus, qui renvoient au § 35.28.

Je n'ai **pas** recopié ta liste de quinze contrôles typographiques de clôture : les §§ 48.3 et 48.8 la portent déjà presque entière, et la redire ailleurs, c'est créer le protocole concurrent que tu dénonces toi-même.

---

## 5. Le contrôle, et ce qui te revient

```
node --env-file=.env.local node_modules/tsx/dist/cli.mjs \
  scripts/fillion/controle-grille-titres.mts [--livre=MAT] [--detail] [--strict]
```

⛔ Il n'a **aucune règle à lui** : le rang de chaque bloc vient de `resoudreStyleSemantique`, la fonction que la page emploie. Il **n'écrit rien**.

État au 20 septembre 2026, 6 316 titres, 48 livres :

```
declarations_irrecevables : 0
inversions                : 62
rangs_plats               : 294
fratries_heterogenes      : 140
sauts                     : 1579
```

**Dans cet ordre :**

1. **Les 62 inversions et les 294 rangs plats.** Pas d'arbitrage philologique : le rang doit descendre. Concentrations : Zacharie (48 + 46), Ézéchiel (45 plats), Deutéronome (19 plats), les Psaumes. Tu déclares le rang sur le bloc, tu ne renommes rien.
2. **Les 140 fratries hétérogènes**, qui rendent un plan illisible.
3. **Les 1 579 sauts**, livre par livre, **quand tu reprends le livre**. Beaucoup sont légitimes : une édition peut n'avoir qu'un seul niveau analytique sous une section. Matthieu en est un vrai cas à trancher, la Genèse donne le modèle.
4. **La clôture des manchettes** selon le § 35.29, à la reprise de chaque livre.

⛔ **Jamais de transformation globale.** Ni sur les sauts, ni sur la casse.

---

## 6. Deux points d'hygiène

**a. Le registre vit en deux exemplaires, et ils ont déjà divergé.**
`work/fillion/semantic_display_hierarchy.json` est lu par le **rendu** ; `public.bible_styles_semantiques` est lu par le seul **verrou de base**. Le second porte `niveau_intitule = null` sur `introduction_titree` là où le premier porte `heading_levels` depuis hier. La table garde le **vocabulaire**, le JSON garde la **composition**, et la copie ne décide de rien. À réaccorder.

**b. La doctrine se fragmente dans `parametres`.**
Tu as raison sur le fond, et c'est ta propre pratique qui le fait : il y a aujourd'hui une douzaine de clés `protocole_*` dans `parametres`, écrites depuis le 17 septembre. Le préambule de la charte dit qu'elle est « la Constitution du projet : une collection de manifestes, de protocoles et de règles ». **Règle : une clé `protocole_*` est une note de travail, jamais normative.** Ce qui prescrit va dans `charte_ia`, sous un numéro de §, et le centre de contrôle renvoie au § plutôt qu'à la clé. Le manifeste et le protocole de la grille sont désormais aux §§ 35.28 et 35.29 ; leurs clés `parametres`, si elles subsistent, ne font plus autorité.

---

## 7. Un principe, pour la prochaine fois

Le défaut central de ce chantier n'était ni dans la donnée ni dans ta lecture : **la donnée portait un fait que le rendu ne lisait pas.** C'est le deuxième cas en deux jours, après `heading_levels` (44 introductions de livre perdaient leur titre parce qu'un code canonique ne disait pas le rang du titre qu'il porte).

Donc : **devant une règle éditoriale qui paraît inapplicable, demander d'abord si le champ qui la porterait est seulement LU.** Un `select` qui l'ignore, une préséance à l'envers, une projection qui ne l'expose pas : c'est trois fois plus fréquent qu'une règle réellement impossible. Signale-le, je le corrige.
