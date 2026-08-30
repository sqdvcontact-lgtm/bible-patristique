# Collecte des gravures du tome VII — consignes

> **Partage des rôles.** GPT collecte la matière et l'inscrit en base. Claude
> reprend ensuite à l'optimisation : c'est `scripts/fillion/detourer-gravures.mjs`
> qui fabriquera les fichiers servis, et lui seul. ⛔ **Ne produire ici NI master
> NI fichier web.**

## 1. Ce qui manque

Onze livres portent l'apparat de Fillion ; **cinq n'ont aucune gravure**, alors que
leur texte est publié :

| livre | blocs d'apparat | gravures | tome |
|---|---:|---:|---|
| Matthieu | 521 | 0 | VII |
| Luc | 543 | 0 | VII |
| Jean | 306 | 0 | VII |
| Actes | 319 | 0 | VII |
| Josué | 577 | 0 | **II** |

**191 pages du tome VII portent une illustration**, relevées par un balayage
antérieur : `tmp/pdfs/fillion/overnight-illustration-audit-60dpi/` en garde le
rendu, un fichier par page, et sa liste **saute exactement les pages de Marc**,
déjà traitées.

**La liste de travail est `COLLECTE_TOME_VII_PAGES.json`**, à côté : une entrée par
page, avec son feuillet, sa page imprimée, son livre et le titre courant d'où le
livre a été lu.

| livre | pages illustrées |
|---|---:|
| Matthieu | 61 |
| Luc | 72 |
| Jean | 52 |
| indécis | 6 |

⚠️ **Le livre se lit dans le TITRE COURANT**, non dans la page imprimée : le tome I
et le tome VII partagent les mêmes numéros, si bien qu'une page 211 est aussi bien
la Genèse que saint Marc. 137 pages ont été lues à leur titre, 48 comblées par la
continuité — une page entourée de deux pages du même livre lui appartient — et
**6 restent indécises**, à trancher à l'œil. Le relevé est
`tmp/livre-des-pages.py`.

⛔ **LES ACTES NE SONT PAS DANS CE TOME.** Il s'arrête à Jean XXI : aucune page
d'Actes n'apparaît, ni au titre courant ni en fin de volume. Leurs gravures sont
dans un autre volume — la famille déclare onze composants, dont un tome VIII — et
son archive n'est pas sur le disque.

⚠️ **Josué relève du tome II**, dont aucun feuillet n'est là non plus. Les deux
sont hors de cette collecte.

## 2. Où est la matière, et sous quelle forme

| | |
|---|---|
| feuillets | `tmp/pdfs/fillion/lasaintebibletex07fill_jp2.zip` — **854 feuillets, 0000 à 0853, sans un trou** |
| déjà extraits | `tmp/pdfs/fillion/jp2_t07/…_jp2/` — 230 seulement, un sous-ensemble |
| déjà décodés | `tmp/jp2-png/fNNN.png` — les 11 de Marc |
| OCR | `tmp/pdfs/fillion/lasaintebibletex07fill_djvu.xml`, 47 Mo, boîtes de mots par page |
| PDF | `tmp/pdfs/fillion/lasaintebibletex07fill.pdf` |

Décodage d'un feuillet (ImageMagick, dans WSL — il n'y en a pas sous Windows) :

```bash
wsl -e bash -lc 'convert <feuillet>.jp2 tmp/jp2-png/fNNN.png'
```

⚠️ **Un chemin accentué passe mal à travers WSL** : travailler sous un chemin ASCII.

### Les deux décalages, à ne pas confondre

- **feuillet → page OCR : +1.** Le feuillet `_0219.jp2` est la page OCR n° 220.
  Vérifié : la page OCR y fait **2455 × 4088**, exactement le format du feuillet,
  si bien que les boîtes de mots tombent sans aucune mise à l'échelle.
- **feuillet → page IMPRIMÉE : −2.** Le feuillet 219 porte la page 217. Constant
  sur les onze de Marc.

## 3. Le repérage

`scripts/fillion/reperer-gravures-en-texte.py` (Python de ComfyUI, qui a numpy et
PIL : `D:\ComfyUI_windows_portable\python_embeded\python.exe`).

```
python scripts/fillion/reperer-gravures-en-texte.py 294 297 305 ...
```

Il rend, dans `tmp/reperage2/` : `boites.json` (boîtes **normalisées**, fractions
de la page) et une planche de contrôle par page.

**Calibré sur les onze pages de Marc, dont les boîtes sont en base** : la bonne
gravure sort au **rang 1 sur les onze**, et la boîte s'accorde à **±1 % de la page
sur neuf**. Les deux écarts restants portent sur l'ÉTENDUE — un élément voisin
au-dessus — et demandent un œil.

⛔ **NE PAS employer `process_illustrations.detect_candidates` pour ces pages-ci.**
Il masque le texte reconnu par l'OCR et garde le reste : bon pour les planches
HORS-TEXTE du tome I, où l'OCR ne lit rien. Sur une gravure **en plein texte**,
l'OCR pose de faux mots sur la hachure — de 24 à 511 par page — et le masque
efface la gravure avec eux. Éprouvé sur le témoin : **1 page retrouvée sur 11**, et
c'est la seule où l'OCR ne pose aucun mot sur la gravure. La confiance ne sépare
pas ces faux mots des vrais, médiane 30 des deux côtés.

## 4. Les pièges déjà payés

⛔ **LE PDF N'EST PAS UNE SOURCE D'IMAGE.** C'est une compression à contenu mixte :
un fond JPX à 134 ppp et un masque de trait JBIG2 à 1 bit. Il rend un fil de fer
sans matière. Il sert à TROUVER, jamais à RENDRE. Le feuillet JP2 seul rend une
gravure. (Charte § 35.16.)

⛔ **La boîte s'écrit NORMALISÉE**, en fractions de la page, dans
`source_crop_box.normalized` — `[gauche, haut, droite, bas]`. C'est cette forme que
la chaîne de rendu applique au feuillet. Les quatre entiers `left/top/right/bottom`
peuvent l'accompagner, mais c'est `normalized` qui fait foi.

⚠️ **Une planche TOURNÉE se redresse**, dans le sens horaire, quand elle couvre au
moins 30 % de la page ET qu'elle est nettement verticale **en pixels** — jamais en
fractions de page, celle-ci étant elle-même portrait. La chaîne de rendu s'en
charge ; il suffit que la boîte soit juste.

## 5. Ce qu'il faut écrire, ligne par ligne

Dans `bible_edition_assets`, sur le modèle de `fillion-t07-p0213-i01` :

| colonne | valeur |
|---|---|
| `asset_key` | `fillion-t07-pNNNN-iKK`, NNNN = **feuillet**, KK = rang sur la page |
| `asset_kind` | `illustration` (une gravure en plein texte ; `plate` est réservé au hors-texte) |
| `family_id` | `317d14e6-15f2-44ae-b6f6-39f7809a9c03` |
| `applies_to` | `family` — la gravure appartient à l'ÉDITION, pas à une langue |
| `source_page_index` | le **feuillet** |
| `printed_page` | le feuillet **moins 2**, en texte |
| `source_crop_box` | `{ normalized: [g,h,d,b], … }` |
| `printed_caption` | la légende **transcrite** de la page, telle qu'imprimée |
| `editorial_caption` | ⛔ **laisser `null`** — voir plus bas |
| `alt_text` | une description de ce que la gravure MONTRE, pour qui ne la voit pas |
| `semantic_scope_kind` | `verse` |
| `scope_book_code`, `canon_id_start` | l'ancre, voir plus bas |
| `placement` | `after` (la gravure suit le verset qu'elle accompagne) |
| `detected_automatically` | `true` |
| `detection_profile` | le nom et la version de l'outil employé |
| `requires_review` | `true` |
| `validation_status` | `review` |
| `is_public` | ⛔ **`false`** — voir § 7 |

### L'ancre

⛔ **L'emplacement matériel est la donnée primaire ; l'ancre sémantique est
FACULTATIVE et relue** (charte). Elle se propose sans se forcer : l'apparat de la
même **page imprimée** est déjà en base, avec ses bornes canoniques, et il donne
donc le verset de la page. Une gravure dont l'ancre reste douteuse s'inscrit
**sans** `canon_id_start` plutôt qu'avec un verset inventé — elle ne paraîtra pas,
et c'est le bon état d'attente.

### Les légendes

- `printed_caption` se **transcrit**, à la lettre, avec sa ponctuation et ses
  parenthèses : « Jésus dans une barque avec les quatre évangélistes. (Bas-relief
  d'un tombeau.) ».
- ⛔ `editorial_caption` **ne s'invente pas**. C'est une écriture de l'auteur du
  site ; la page affiche `editorial_caption ?? printed_caption`, donc laisser
  `null` ne prive de rien.

## 6. ⛔ Ce qu'il ne faut PAS faire

- **fabriquer les fichiers** master ou web : c'est `detourer-gravures.mjs`, ensuite ;
- **poser `is_public = true`** ;
- **toucher aux 43 actifs existants**, tous à jour en `processing_version` 4.3.0
  (Marc) et 4.5.0 (planches du tome I) ;
- **rédiger une légende éditoriale** ;
- **rendre depuis le PDF**.

## 7. L'arbitrage en attente

Les 43 actifs existants portent `metadata.test_only = true`,
`validation_status = 'review'` et `requires_review = true` — **et**
`is_public = true`. Ils sont donc servis au lecteur alors qu'ils se déclarent
essais techniques. La contradiction attend l'auteur. En attendant, **toute ligne
neuve s'inscrit `is_public = false`** : on n'élargit pas un état qu'on n'a pas
tranché.

## 8. Le contrôle, avant de dire que c'est fait

⛔ **Trouver les lignes en base ne prouve rien sur ce que le lecteur voit.** On
appelle la fonction que la page appelle — `loadBibleEditionChapter` et
`canonDuChapitre` de `app/lib/bibleEditionServer.ts` — et l'on compte les
illustrations qu'elle rend.

⚠️ **Et le contrôle porte un TÉMOIN dont on connaît la réponse.** Un contrôle des
planches du Pentateuque a rendu zéro le 30 août 2026 : il demandait un `canon_id`
qui n'existe pas dans `versets_canon`, et rendait donc zéro **partout**, y compris
sur Marc, dont les gravures sont en ligne. C'est ce témoin qui l'a démasqué.
`canonIds` attend l'`id` de `versets_canon`. Harnais : `tmp/verifier-planches.mts`.

## 9. Ce que Claude reprend ensuite

La chaîne d'optimisation, déjà écrite et éprouvée : rampe alpha mesurée aux deux
bouts, courbe, couture des creux, rattrapage réglé sur la seconde réduction du
navigateur, bornes d'affichage, nettoyage chirurgical du papier, report en base.
Doctrine complète : charte `parametres.charte_ia`, **§ 35.16 à 35.16.16**.
