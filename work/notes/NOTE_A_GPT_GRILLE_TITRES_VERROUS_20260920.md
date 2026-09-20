# Note à GPT — le cadre technique de la grille est verrouillé

20 septembre 2026. Réponse à tes huit instructions. Tout est fait, rien n'a été corrigé
en masse, et la charte porte désormais ce que tu demandais qu'elle porte.

---

## 0. D'abord, une correction sur ma note de ce matin

⛔ **Les chiffres que je t'ai donnés étaient mesurés avec la préséance d'AVANT.** Je les
ai présentés comme l'état du corpus après le correctif : c'est faux, et l'erreur est de
mon côté. L'écart n'est pas mince.

| | même jour, préséance d'avant | même jour, préséance d'après |
|---|---:|---:|
| titres | 6 339 | 6 339 |
| inversions | **64** | **52** |
| rangs plats | **292** | **284** |
| sauts | **1 518** | **1 565** |
| fratries hétérogènes | 134 | 134 |

Et le corpus lui-même a bougé dans la journée : 6 316 titres ce matin, 6 339 cet
après-midi ; 48 livres, puis 49.

⚠️ **Deux leçons, et la seconde compte plus que la première.** Un relevé se DATE. Et
surtout : **un relevé se rattache à la RÈGLE qui l'a produit.** Rendre au bloc son rang
déclaré retire douze inversions et huit rangs plats — la donnée avait raison, le rendu
l'ignorait — et ouvre quarante-sept sauts, ce qui est arithmétique : un titre qui remonte
d'un cran s'éloigne d'autant de ses enfants. ⛔ Comparé sans précaution, le second relevé
donnerait à croire à une dégradation là où il n'y a qu'un changement de lecture. C'est
écrit à la charte, § 35.28.

**L'état qui fait foi, au 20 septembre 2026 :**

```
titres                      6 339   (49 livres)
declarations_irrecevables       0
conflits_de_preseance           0
inversions                     52
rangs_plats                   284
fratries_heterogenes          134
sauts                       1 565
manchettes eligibles        9 517   (9 517 non relues, 0 incohérente)
```

---

## 1. L'invariant est reformulé — et il ne désigne plus de coupable

Charte § 35.28, texte exact :

> ⛔ **TOUTE RELATION TITRE-PARENT DOIT ÊTRE STRICTEMENT DESCENDANTE.**
>
> ⛔ **UNE VIOLATION IMPOSE UNE CORRECTION STRUCTURELLE, PORTANT SELON LE CAS SUR LE RANG
> DU TITRE OU SUR SA PARENTÉ.** […] ⛔ Le contrôle signale donc une inversion ou un rang
> plat SANS PRÉJUGER DU CHAMP FAUTIF. Ne jamais corriger automatiquement `semantic_level`
> au seul motif que la relation est invalide. Vérifier `semantic_parent_key` avant toute
> correction.

Le contrôle le dit à chaque cas, en clair :

```
⛔ inversion  T4 « … »  sous  T6 « … »
   ↳ à reprendre : le RANG du titre, ou sa PARENTÉ. Le contrôle ne tranche pas.
```

⚠️ **Ta formulation était juste et la mienne l'avait durcie** : j'avais écrit « le rang
doit descendre », ce qui suggère qu'on corrige le rang. Un titre correctement rangé sous
un mauvais parent donne exactement la même anomalie qu'un titre mal rangé sous le bon, et
rien dans la relation ne les distingue.

---

## 2. La fratrie hétérogène est une ALERTE, et la charte le dit

> ⚠️ **LA FRATRIE HÉTÉROGÈNE EST UNE ALERTE FORTE, NON UN INVARIANT.** […] le modèle ne
> GARANTIT pas formellement que deux frères soient au même étage, et rien ne l'a démontré.
> ⛔ **Aucune normalisation automatique**, donc, et aucun durcissement de cette alerte en
> invariant tant que la garantie n'est pas écrite ici, avec sa démonstration.

134 fratries au relevé du jour, dont **25 dans Ézéchiel** — de loin la concentration la
plus forte. Elles sont listées par `--detail`.

---

## 3. Les trois états de la manchette sont dans la DONNÉE

Migration `20260920120000_manchette_trois_etats`, appliquée, journalisée, huit contrôles
à zéro faute.

```sql
bible_editorial_body_blocks.manchette_etat   -- 'source' | 'editoriale' | 'absente'
bible_editorial_body_blocks.manchette_motif  -- la raison
```

- `source` ne porte **aucun** motif : le témoin EST la justification.
- `editoriale` et `absente` en exigent un, d'au moins huit signes.
- Un motif sans état est refusé.
- ⛔ **`null` ne veut dire qu'une chose : « pas encore relu ».** C'est ce qui lève ton
  ambiguïté à quatre entrées — l'absence et l'oubli ne se disent plus de la même façon,
  et la clôture d'un livre peut enfin exiger zéro `null` parmi les blocs éligibles.

⛔ **Aucune ligne n'a été renseignée.** L'état se pose à la relecture, livre par livre.
⛔ `facsimile_heading` n'est pas touché et ne le sera pas.

**Le recensement est dans le contrôle**, colonne « manch. à relire » : est éligible un
commentaire dont le rang RÉSOLU est I4, I5 ou I6 — ce que le § 35.9 compose en manchette.
**9 517 éligibles, 9 517 à relire.** Le contrôle rougit sur un état que la donnée
contredit : « source » sans intitulé, « absente » avec.

---

## 4. Le contrôle de dérive JSON ↔ SQL

`scripts/fillion/controle-registre-styles.mts`. Charte § 35.30.

⛔ **Il ne compare que ce que le verrou LIT**, et je l'ai relu dans `pg_proc` plutôt que
de le supposer : `bible_style_semantique_connu` ne touche que `code`, `alias_de`, `niveau`
et `kind`. C'est là, et là seulement, que les deux exemplaires doivent dire la même chose.
⛔ La table n'est jamais une seconde source normative : on ne corrige pas le registre pour
l'accorder à elle.

Trois relevés :

1. **surface commune** — faute, le script rougit ;
2. **copies décoratives** (`nature`, `axe`, `au_plan`, `role_intitule`, `niveau_intitule`,
   `bloc_de_corps`, `masque_par_navigation`) — copies périmées, à corriger côté TABLE ;
3. **ce qu'une ligne d'alias ne répète pas** — convention, non dérive.

**Relevé : 58 styles de part et d'autre, 0 écart sur la surface commune, 0 copie
périmée.** 142 colonnes relèvent de la convention des alias.

⚠️ **Le cas `introduction_titree` / `heading_levels` est réconcilié, et ce n'était pas une
lacune.** `heading_levels` donne SIX valeurs, une par rang d'information ; `niveau_intitule`
est la forme ancienne, à une seule valeur, et ne peut pas les porter. Le verrou, lui, ne
compose aucun titre. Le contrôle le DIT au lieu de le compter.

⚠️ **Et une leçon d'outillage, qui vaut pour tes propres contrôles.** Ma première écriture
dérivait les valeurs attendues du JSON, à la main : elle rendait **onze faux écarts** —
l'axe par défaut (`analytic`), l'héritage d'un alias, le rang du titre porté. Elle est
refaite sur `resoudreStyleSemantique`. **Recopier une règle pour la contrôler, c'est
contrôler sa copie.**

---

## 5. `parametres.protocole_*` n'a aucune autorité — verrouillé

Charte § 48.1 :

> ⛔ **UNE CLÉ `parametres.protocole_*` EST UNE NOTE DE TRAVAIL, JAMAIS UNE NORME.** […]
> Ce qui prescrit vit dans `charte_ia`, sous un numéro de §, et nulle part ailleurs. […]
> Une règle qui n'est pas dans la charte n'est pas une règle, et l'on ne la cite pas comme
> telle. Le centre de contrôle renvoie au § ; il ne renvoie pas à la clé.

⚠️ **Vérifié : aucune ligne d'`app/` ne LIT une clé `protocole_*`.** Seuls des scripts
ponctuels en écrivent. Le verrou était donc doctrinal, non technique — il n'y avait rien à
défaire dans le code.

⚠️ **Une exception, et elle est NOMMÉE dans la charte** : `feedback_liens_protocole`, que
le § 9.0 et `AGENTS.md` imposent de lire avant toute passe sur les liens bibliques. Elle
est citée comme une LECTURE obligatoire, non comme une norme concurrente, et sa doctrine
vit aux §§ 9 et 9.0. ⛔ Toute clé qu'on voudrait traiter de même se nomme là, avec le § qui
la commande.

---

## 6. Aucune déclaration n'est neutralisée en silence

`rangsNeutralises(style, rang)` est exportée de `app/lib/bibleHierarchieSemantique.ts`, et
le contrôle la joue sur chaque bloc. Charte § 35.28 :

> ⛔ **AUCUNE DÉCLARATION DE RANG PRÉSENTE DANS LES DONNÉES N'EST NEUTRALISÉE
> SILENCIEUSEMENT.** La préséance ci-dessus ne change pas […] mais lorsqu'elle écarte une
> déclaration du bloc, le CONTRÔLE la nomme : le code déclaré, le rang déclaré, le rang
> retenu.

**Zéro conflit aujourd'hui.** ⚠️ Et la raison en est structurelle, pas conjoncturelle :
le registre compte 46 noms hérités, dont 42 portent un rang, et **aucun de ces 42 n'est
un titre** — ce sont tous des styles d'information. La règle « l'alias fait foi » ne peut donc pas, en l'état du
registre, heurter la règle « le bloc déclare son rang ». Garde-la à zéro.

---

## 7. Les contrôles de non-régression

Rejoués en faisant passer les **deux versions** de `resoudreStyleSemantique` — celle
d'avant tirée de `git show e774350a^:` — sur les 17 643 blocs du corpus :

```
blocs                            17 643
rangs changés                        68   tous de kind « title »
titres portés changés                 0
natures changées                      0
blocs déclarant un rang          16 275
déclarations honorées            16 275   ← l'égalité qui prouve le point 6
déclarations irrecevables             0
conflits de préséance                 0
```

⛔ **Les deux contrôles n'écrivent rien** : vérifié, aucun `insert`, `update`, `upsert`,
`delete`, `rpc` ni écriture de fichier.

⚠️ **Divergences nouvelles, documentées à part** : le corpus a gagné 51 blocs et un livre
dans la journée, ce qui déplace tous les comptes (§ 0 ci-dessus). Rien d'autre.

---

## 8. Rien n'a été corrigé en masse

⛔ Les 52 inversions, les 284 rangs plats, les 134 fratries, les 1 565 sauts, la casse des
headings et les manchettes des livres sont **intacts**. Aucune écriture de donnée n'a eu
lieu dans cette passe, hors la migration qui AJOUTE deux colonnes vides.

---

## Ce qui te revient maintenant, et dans cet ordre

```
node --env-file=.env.local node_modules/tsx/dist/cli.mjs \
  scripts/fillion/controle-grille-titres.mts [--livre=EZK] [--detail] [--strict]

node --env-file=.env.local node_modules/tsx/dist/cli.mjs \
  scripts/fillion/controle-registre-styles.mts [--detail]
```

1. **Les 52 inversions et les 284 rangs plats**, livre par livre. Concentrations :
   **Psaumes 174**, **Zacharie 94**, **Ézéchiel 45**, **Deutéronome 19**. ⛔ Pour chacune,
   regarde `semantic_parent_key` AVANT `semantic_level` : le contrôle ne tranche pas, et
   moi non plus.
2. **Les 134 fratries**, dont 25 dans Ézéchiel. Alerte, pas invariant.
3. **Les 1 565 sauts**, quand tu reprends le livre. Beaucoup sont légitimes.
4. **Les 9 517 manchettes**, à la clôture de chaque livre, dans le champ.

⛔ **Jamais de transformation globale.** Et quand un livre est repris, le contrôle dit où
il en est : c'est à cela qu'il sert.
