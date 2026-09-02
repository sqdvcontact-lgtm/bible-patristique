# Audit des traductions bibliques — alignement et éléments surnuméraires

**Corpus Scriptura, 19 août 2026.** Document autonome : tout ce qu'il faut pour travailler est ici, aucune connaissance préalable du dépôt n'est supposée.

---

## 1. Ce qui est demandé

Le corpus biblique du site porte cinq traductions alignées verset par verset. À l'usage, deux défauts se laissent voir : des versets **mal alignés** (le texte d'une traduction ne répond pas à celui des autres) et des versets **porteurs d'éléments surnuméraires** (numéros de l'édition source restés dans le texte, caractères parasites).

Un outil de repérage a été construit et exécuté. Ce document rend **ce qu'il a trouvé** et **ce qu'il reste à trancher**. Le travail attendu est un travail de **lecture et de décision**, cas par cas : l'outil sait dire où regarder, il ne sait pas dire ce qu'il faut écrire.

⚠️ **Aucune correction automatique.** Les nombres ci-dessous sont des files d'attente, pas des listes de choses à réécrire en lot. La raison est au §4 : un tiers environ des signalements sont des divergences textuelles légitimes, et les distinguer demande de lire.

---

## 2. Le modèle de données

### La table `versets_v2`

Une ligne = **un verset d'une édition source**. Colonnes utiles :

| Colonne | Rôle |
|---|---|
| `trad_id` | la traduction (`TR0001` … `TR0005`) |
| `livre` | code du livre (`GEN`, `PSA`, `MRK`…) |
| `ch_orig`, `v_orig`, `v_orig_suffixe` | **numérotation de l'édition source**, telle qu'imprimée |
| `texte` | le texte du verset |
| `canon_id`, `canon_id_fin` | la **case canonique** visée, sous la forme `LIVRE.CHAPITRE.VERSET` |
| `ordre_slot` | rang du fragment quand plusieurs versets source tombent dans la même case |

### Le créneau canonique

`canon_id` est la case où les cinq traductions se rejoignent. Ce n'est **pas** une relation un-pour-un :

- une traduction peut verser **plusieurs** versets source dans un même créneau (d'où `ordre_slot`) ;
- un verset source peut être **scindé** entre plusieurs créneaux (`canon_id` et `canon_id_fin`).

Comparer deux traductions, c'est donc comparer **ce qu'elles versent dans le même créneau**, après recollement. C'est ce que fait l'outil.

### Les cinq traductions

| Code | Nom | Langue | Numérotation | Lignes | Livres |
|---|---|---|---|---|---|
| `TR0001` | Bible de Sacy | français | vulgate | 36 290 | 75 |
| `TR0002` | Bible Segond | français | hébraïque | 31 189 | 66 |
| `TR0003` | Bible Crampon | français | hébraïque | 35 594 | 75 |
| `TR0004` | Vulgate clémentine | latin | vulgate | 36 004 | 75 |
| `TR0005` | Septante de Swete | grec ancien | grecque | 26 728 | 45 |

Total : **165 099 versets alignés**, répartis sur **35 593 créneaux canoniques**. Les cinq se rejoignent sur 22 488 d'entre eux.

---

## 3. Invariants — ce qu'il ne faut jamais faire

Ces règles viennent de la charte du projet. Les enfreindre abîme le corpus de façon difficilement réversible.

⛔ **`ch_orig`, `v_orig` et `v_orig_suffixe` décrivent EXCLUSIVEMENT la numérotation de l'édition source.** Ils ne se déduisent jamais de `canon_id`. Corriger un alignement, c'est changer `canon_id` / `canon_id_fin` / `ordre_slot`, **jamais** la numérotation native.

⛔ **Quand un verset source est scindé entre plusieurs créneaux, chaque fragment garde EXACTEMENT les mêmes `ch_orig`, `v_orig`, `v_orig_suffixe` que le verset d'origine.** Ne jamais inventer de suffixes `a`, `b`, `c` pour distinguer les fragments. Seul l'alignement canonique varie d'un fragment à l'autre.

⛔ **`versets_lecture` est une vue MATÉRIALISÉE**, c'est-à-dire un cache. Toute écriture dans `versets_v2` reste **invisible** sur le site tant qu'on n'a pas exécuté :

```sql
REFRESH MATERIALIZED VIEW public.versets_lecture;
```

Sans ce rafraîchissement, une correction juste paraît avoir échoué.

⛔ **Toujours sauvegarder avant d'écrire**, dans le schéma `internal` (jamais dans `public`, qui est exposé par l'API). Après écriture, contrôler que texte, canon et créneau n'ont pas bougé accidentellement.

---

## 4. Ce qui N'EST PAS un défaut

Ce paragraphe est le plus important du document. Chacun de ces points a été vérifié sur le corpus **avant** d'être retiré des détecteurs, et chacun aurait produit des centaines de faux signalements.

**Les italiques de Sacy.** `TR0001` porte 8 526 paires `<i>…</i>`, parfaitement équilibrées. Ce sont les **mots suppléés par le traducteur**, une convention d'édition classique. Ce n'est pas du balisage résiduel. *Conséquence pour la mesure : il faut les retirer avant de compter les caractères, sinon Sacy paraît systématiquement plus longue.*

**Les crochets de Crampon et de Sacy.** `[par l'Esprit-Saint]`, `[notre père]`, `[Nous avons entendu la parole du Seigneur…]` : additions éditoriales et variantes. Convention, pas défaut.

**Un verset qui ne finit pas par une ponctuation.** 10,4 % des versets du corpus s'arrêtent en suspens, et légitimement : la phrase se poursuit au verset suivant. Le chiffre monte à 27 % pour la Septante. **Ce signal, pris seul, ne vaut rien.**

**Les divergences textuelles réelles.** La Septante n'est pas une traduction du même texte que les Bibles hébraïques : son Jérémie est plus court et réordonné, son Esther et son Daniel portent des additions grecques, ses livres des Règnes relèvent d'une autre recension. Segond, protestante, n'a pas les deutérocanoniques. La Vulgate compte le titre des psaumes comme verset 1, d'où un décalage systématique. **Ces écarts sont la nature du corpus, pas son défaut.**

---

## 5. La méthode

Trois détecteurs, sur les 35 593 créneaux.

### 5.1 Écart de longueur, normalisé

Le nombre de caractères, comme pressenti, est le bon signal — à condition de le normaliser. Le latin est naturellement plus court que le français, le grec entre les deux. Longueur **médiane** d'un créneau, mesurée sur les 22 488 créneaux que les cinq portent ensemble :

| `TR0001` | `TR0002` | `TR0003` | `TR0004` | `TR0005` |
|---|---|---|---|---|
| 140 | 125 | 126 | 107 | 113 |

Pour chaque créneau : on divise la longueur de chaque traduction par son facteur, on prend la **médiane** des valeurs obtenues (le consensus des témoins), et on regarde qui s'en écarte. Un créneau doit être porté par **au moins trois** traductions, et son consensus dépasser **40 caractères** — en deçà, le rapport est trop bruité pour signifier quoi que ce soit.

### 5.2 Suspension, en conjonction seulement

Un verset qui ne se termine par aucune ponctuation forte. Inutilisable seul (§4). Mais **croisé** avec un écart de longueur, il enrichit fortement :

| Population | Effectif | dont suspendus |
|---|---|---|
| ensemble examiné | 162 276 | **10,4 %** |
| plus court que ses pairs (÷2) | 586 | **34,6 %** |
| plus court que ses pairs (÷3) | 149 | **36,9 %** |

C'est ce croisement qui définit le rang P1 ci-dessous.

### 5.3 Absences, partagées entre systématique et isolé

Un créneau porté par au moins trois traductions, et absent d'une quatrième **qui couvre pourtant le livre** (au moins 20 créneaux dedans). Puis, décisif : au-delà de **8 absences dans un même livre**, la cause est tenue pour **systématique** et le lot est **écarté**. Ce qui reste, éparpillé, est ce qu'il faut regarder.

---

## 6. Résultats

### 6.1 Écarts de longueur — 870 cas

| Rang | Critère | Cas | `TR0001` | `TR0002` | `TR0003` | `TR0004` | `TR0005` |
|---|---|---|---|---|---|---|---|
| **P1** | ÷2 **et** suspendu | **208** | 44 | 1 | 0 | 25 | 138 |
| **P2** | ÷3 | 97 | 20 | 3 | 4 | 11 | 59 |
| **P3** | ÷2 | 305 | 65 | 23 | 14 | 51 | 152 |
| **P4** | ×3 | 45 | 1 | 4 | 1 | 0 | 39 |
| **P5** | ×2 | 215 | 40 | 9 | 13 | 22 | 131 |

**Le côté court est le signal fort. Le côté long demande un œil.** Une traduction beaucoup plus brève que ses pairs est presque toujours tronquée ; une traduction beaucoup plus longue est souvent la Septante, qui diverge réellement (elle porte 39 des 45 cas P4).

Quelques cas P1, pour montrer ce que l'outil attrape :

| Créneau | Trad. | Longueur | Attendue | Texte |
|---|---|---|---|---|
| `2SA.17.20` | Sacy | 35 | 264 | « Les gens d'Absalon étant venus dans » |
| `LEV.5.23` | Vulgate | 17 | 144 | « convicta delicti, » |
| `LEV.5.23` | Sacy | 29 | 188 | « étant convaincu de son peché, » |
| `NUM.15.11` | Vulgate | 10 | 70 | « Sic facies » |
| `EXO.30.10` | Sacy | 38 | 231 | « Aaron priera une fois l'an sur les cor… » |

⚠️ **Noter `LEV.5.23`, signalé pour DEUX traductions à la fois.** Quand un même créneau est court chez plusieurs témoins indépendants, ce n'est probablement pas une troncature du texte mais un **découpage canonique fautif** : la case elle-même est mal placée. Ces cas sont les plus intéressants et les plus rapides à trancher.

### 6.2 Éléments surnuméraires — 247 cas

| Marque | Cas | Traduction |
|---|---|---|
| numéro d'édition source **collé dans le texte** | 235 | `TR0005` |
| **caractère de contrôle** invisible | 9 | `TR0005` |
| numéro de verset **resté en tête** | 5 | `TR0005` |

*(249 marques pour 247 versets : deux versets du Siracide en portent deux à la fois.)*

Tous dans la Septante, et le motif est parlant :

- `2MA.15.36` — « …τήνδε τὴν ἡμέραν· **(37)**ἔχειν δὲ ἐπίσημ… »
- `DAN.5.2` — « καὶ πίνων **(2)**Βαλτασὰρ εἶπεν… »
- `AMO.8.1` — « **(1)**Οὕτως ἔδειξέν μοι κύριος… »

Le `(37)` au milieu de `2MA.15.36` **est le numéro du verset suivant** : deux versets de l'édition source ont été concaténés dans une seule ligne, sans que la frontière soit coupée. Ce ne sont donc pas de simples scories de texte, mais **la trace visible d'un défaut de segmentation**. Les traiter revient à scinder la ligne, ce qui touche à l'alignement : relire le §3 avant.

Cinq versets portent en outre leur numéro en tête (`1CH.16.10`, `DAN.3.59`, `EXO.38.24`, `EZK.44.20`, `WIS.18.24`). Le même défaut avait déjà été trouvé et corrigé chez Sacy en août 2026, sur environ 180 versets ; celui-ci en est le résidu grec. `EXO.38.24` mérite un regard particulier : il commence par « 1 » alors qu'il vise le verset 24.

Neuf versets grecs portent enfin un **caractère de contrôle** au milieu du texte : `2CH.32.21`, `EST.2.3`, `EZK.32.3`, `PSA.21.1`, `PSA.88.22`, `PSA.118.41`, `SIR.45.19`, `SIR.47.23`, `SIR.48.6`. Invisibles à l'écran, ils faussent les recherches et les comparaisons de chaînes.

⚠️ Ce sont tous des contrôles **C1** : U+0081, U+008D, U+009A, U+009C. C'est une signature, celle d'une conversion d'encodage mal passée, et non un hasard. Elle mérite d'être remontée à la source : un import qui a laissé ces neuf-là a pu en altérer d'autres de façon moins visible. À noter que le détecteur les avait d'abord **manqués**, sa classe étant bornée à U+007F : une règle qui ne couvre que la plage C0 laisse passer exactement ce genre de résidu.

### 6.3 Créneaux absents — 943 cas, dont 81 à examiner

**862 relèvent d'une cause systématique et sont à écarter** :

| Trad. | Livre | Créneaux | Cause |
|---|---|---|---|
| `TR0002` | EST | 108 | additions grecques d'Esther, absentes d'une bible protestante |
| `TR0005` | EST | 106 | recension grecque différente |
| `TR0005` | JER | 75 | Jérémie LXX, plus court et réordonné |
| `TR0005` | BAR | 72 | Baruch |
| `TR0004` | PSA | **69** | **décalage de numérotation des titres de psaumes** |
| `TR0002` | DAN | 67 | additions grecques de Daniel |
| `TR0005` | EXO, TOB, 1KI, 1SA… | 64, 55, 48, 44 | divergences de recension |

Le cas `TR0004` / `PSA` est le seul de cette liste qui soit **une vraie question éditoriale** plutôt qu'une divergence textuelle : 69 créneaux, tous dans les Psaumes, tous manquants à la Vulgate alors que les quatre autres traductions les portent. La cause est connue (dans la Vulgate, le titre du psaume est le verset 1, ce qui décale tout le psaume d'un cran). **Une seule décision d'alignement règle les 69 cas** : c'est le meilleur rapport effort/résultat de tout cet audit.

**81 cas isolés**, eux, n'ont pas d'explication systématique :

| Traduction | Cas |
|---|---|
| `TR0005` Septante | 56 |
| `TR0001` Sacy | 21 |
| `TR0004` Vulgate | 4 |

Les 21 de Sacy sont les plus suspects : ce sont des versets ordinaires, qu'une bible française complète possède certainement. Exemples : `GEN.50.23`, `JDG.21.25` (le dernier verset des Juges), `JOS.21.44`, `JOS.21.45`, `LEV.26.46`, `NUM.11.35`, `EXO.40.15`, `1CH.20.8`. **Le texte existe très probablement dans Sacy, mais rattaché à un autre créneau** — fondu dans le verset voisin. C'est exactement la « mauvaise correspondance » décrite au départ.

---

## 7. La file de travail, par ordre de rendement

1. **`TR0004` / Psaumes, 69 créneaux.** Une seule règle de numérotation à trancher, 69 cas réglés d'un coup.
2. **Les 21 absences isolées de Sacy.** Vérifier dans l'édition source où est passé le texte : il est presque sûrement collé au verset voisin. Correction = redécoupage du créneau, sans jamais toucher à `v_orig`.
3. **Les 208 cas P1.** Lire le verset, le comparer à ses voisins. Deux issues distinctes : texte réellement tronqué à l'import (il faut le retrouver dans la source), ou créneau mal placé (il faut le déplacer). Commencer par les créneaux signalés chez **plusieurs traductions à la fois**, comme `LEV.5.23` : le défaut y est dans la case, pas dans le texte.
4. **Les 235 numéros collés de la Septante.** Défaut de segmentation. Chaque cas est une ligne à scinder en deux versets, avec les précautions du §3.
5. **Les 9 caractères de contrôle et les 5 numéros en tête.** Nettoyage simple, sans conséquence sur l'alignement. À faire en premier si l'on veut un gain immédiat.
6. **Les 45 cas P4 (beaucoup trop longs).** À lire, sans a priori : 39 sont dans la Septante et beaucoup seront légitimes.

---

## 8. Rejouer l'audit

L'outil vit dans le dépôt et ne modifie rien :

```bash
node scripts/audit-versets.mjs                 # rapport complet dans audit/
node scripts/audit-versets.mjs --trad TR0001   # une seule traduction
node scripts/audit-versets.mjs --n 60          # plus d'exemples par rubrique
node scripts/audit-versets.mjs --recalibrer    # recalcule les facteurs de longueur
```

Il produit `audit/audit-versets-<date>.md` (le rapport lisible) et `audit/audit-versets-<date>.csv` (tous les cas, pour trier et cocher).

Les règles et les seuils sont isolés dans `scripts/_audit-versets-regles.mjs`, module pur couvert par 23 tests (`npm test`). **Discuter un seuil ne demande pas de relancer l'audit** : il se change là, et les tests disent aussitôt ce que cela déplace.

⚠️ **Après un import ou une correction de corpus, relancer `--recalibrer` avant l'audit** : les facteurs de longueur sont mesurés sur l'état du corpus, et un lot nouvellement importé les déplace.
