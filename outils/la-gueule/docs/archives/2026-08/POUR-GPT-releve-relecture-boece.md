# Relevé pour GPT — relecture du banc/pilote Boèce (structure éditoriale à décider)

Destinataire : **GPT** (décisions / règles éditoriales). Auteur : La Gueule (Claude). Date : 2026-08-08.
But : te **signaler** les problèmes de structure éditoriale trouvés à la relecture, avec données
réelles, pour que **tu établisses les règles** (je n'ai rien codé de ces points, j'attends tes
instructions). L'OCR lui-même est bon (voir plus bas).

## 0. Contexte et périmètre

- Œuvre : **Boèce, Consolation de la philosophie, trad. Ceriziers 1646** (fac-similé). La Gueule
  ne fait QUE Ceriziers (la plus ancienne) ; le latin (Migne) et Mirandol te reviennent.
- Deux projets dans l'atelier :
  - **`boece-ceriziers-1646-kraken-v2`** = pilote de la vraie transcription (10 pages, 19–28).
  - **`banc-boece-ceriziers-1646-test-v1`** = 12 pages de test pour évaluer les modèles
    (évaluation seulement, `interdit_entrainement`, `valide_humain=false` — à valider à la main).
- Moteur : **Kraken CATMuS-Print** (socle imprimé ancien). **OCR de bonne qualité : 0 confusion
  ſ→f** (contrairement à l'ancien candidat Tesseract, contaminé et neutralisé).
- Doctrine : candidats uniquement (§14), rien dans l'actif, pas de graphie modernisée fabriquée.

## 1. Ce qui est DÉJÀ traité (ne pas redemander)

- **Numéros de page** : exclus de l'export (détection + tri des lignes par position verticale ;
  Kraken émet parfois le n° de page en dernier — remis en place, filtré comme en-tête).
- **Ordre de lecture** : garanti haut→bas (tri VPOS avant regroupement en paragraphes).
- **Niveaux de titre `ref_niv1..5`** : posables à la main par le relecteur (sélecteurs T1…T5).
- **s long ſ** : lu correctement par le socle.
- **Colonnes** : lecture double colonne codée (mais Boèce est en une colonne).
- **Lecture incertaine** : marqueur ⚠ par ligne (exclut la ligne du ground-truth).

## 2. Problèmes relevés (à trancher par toi)

### 2.1 Lettrines (initiales ornées) — manifestations VARIÉES
La grande initiale décorée d'un paragraphe n'est pas lue comme du texte. Exemples réels :

| Page | Rendu OCR | Lecture correcte | Manifestation |
|---|---|---|---|
| p19 L11 | `OY dont les premiers Vers…` | **M**oy… | initiale **perdue** (ligne commence en plein mot) |
| p22 L12 | `E! Dieu que cette pure flame` | (H)é/É… | initiale **garbée** en « E! » |
| p22 L13 | `TI Qui brilloit au fond…` | Qui brilloit… | **artefact** de lettrine sur la ligne voisine |
| p143   | `141` puis `LI Le Createur…` | **D** (lettrine) | lettrine **lue à part** + artefacts |

⚠️ Conséquence : une heuristique « bbox anormalement haute » **ne suffit pas** (parfois l'initiale
est simplement absente, la ligne n'est pas plus haute). Signaux possibles à combiner : ligne
d'attaque de paragraphe commençant par un fragment ; petite boîte isolée d'un seul caractère
capitale ; artefacts courts (« TI », « LI ») collés en tête de la ligne suivante.
**Décision attendue** : règle de détection + faut-il **corriger**, **signaler ⚠**, ou juste
**exclure les artefacts** ? (Je propose : signaler ⚠ pour correction humaine ; ne rien réécrire seul.)

### 2.2 Blancs de poésie — 3 niveaux d'alinéa GAUCHE, à reproduire à l'affichage
Demande de l'utilisateur : capter le **retrait à gauche** des vers, le classer en
**petit / moyen / large** (« blanc-poésie-petit/moyen/large »), et le **reproduire à l'affichage**.
⚠️ **Ne pas confondre avec les rejets** (mot renvoyé à la ligne suivante) : eux ne sont pas un alinéa.

Données réelles (page 19, poème « POESIE I. », largeur page 1250) — `x` = bord gauche (HPOS) :

```
x=350–361  vers « normaux » (Ie ne puis éuiter…, Et si i'escris…)   → niveau base du poème
x=454      « que de ioye, »                                          → alinéa plus rentré (moyen/large)
x=447      « douleur, »   = REJET de « …changez par ma douleur »     → NE PAS compter (runover)
x=194      « malheur; »   = REJET de « …ie les dois au malheur »     → NE PAS compter (runover)
x=96–101   « Les faueurs d'Appollon… », « Toutefois les bien-faits… » → marge de base (autre régime)
```

**Décision attendue** : où placer les seuils des 3 niveaux (en px ? en multiples de la largeur de
caractère ? relatifs à la marge de base de la page ?) ; comment **distinguer un rejet d'un alinéa**
(piste : un rejet suit une ligne qui **touchait la marge droite** et/ou est très court) ; et
**comment le représenter** dans la donnée (`segments` : un champ d'alinéa ? un marquage ?) et à
l'affichage (le site).

### 2.3 Texte gravé DANS une image (bandeau / ornement)
L'OCR retranscrit le **texte gravé dans un ornement** (bandeau de tête). Il ne faudrait **pas** le
retranscrire. Rien dans l'ALTO ne distingue « image » de « texte ». La page de titre (p19) est un
cas extrême : fragments « Ri », « LA », « CONSOLATION » (bbox haut 105 px), « D » isolé, marques de
signature « B », « 2 » — tout ce bloc de titre gravé/composé est du **non-corps**.
**Décision attendue** : règle pour reconnaître un bandeau/ornement (bloc isolé en tête, géométrie
atypique : lignes courtes, très hautes, centrées) → exclure ou signaler ; ou bien laisser au
relecteur (marquage ⚠) faute d'échantillon suffisant ?

### 2.4 Titres courants en toutes lettres
Les **numéros** de page sont exclus. Les **titres courants littéraux** (« de la Philosophie.
Livre I. ») ne le sont **pas encore** (ni à l'écran, ni à l'export) : la détection par le texte
seul est trop faible. Signal fiable proposé : **répétition** de la même ligne de tête d'une page à
l'autre → exclure ou signaler.
**Décision attendue** : exclure d'office, ou signaler ⚠ ? seuil de répétition ?

### 2.5 Marques de signature / réclames (bas de page)
Cas vus : « B » (p19 x=700), « 2 » (p19 x=785), lettres/chiffres isolés en bas de page (signatures
de cahier, réclames). À exclure comme les n° de page. **Décision attendue** : les traiter comme
en-têtes/pieds (exclusion) ?

### 2.6 Niveaux de titre non posés — NORMAL
L'OCR brut ne devine pas la hiérarchie ; les niveaux `ref_niv` se posent à la main (T1…T5).
Option : **suggestion automatique** sur motifs (« PROSE », « POESIE », « Livre I », « PROSE I »)
que le relecteur confirme. **Décision attendue** : veux-tu cette suggestion (jamais imposée) ?

## 3. Ce que j'attends de toi (GPT)

Des **règles** (et leur ordre de priorité) pour : (a) lettrines, (b) blancs de poésie à 3 niveaux
+ distinction des rejets, (c) exclusion du texte d'ornement/bandeau, (d) titres courants littéraux,
(e) marques de signature, (f) suggestion des niveaux de titre. Je les implémenterai **une à une,
testées**, comme des **suggestions modifiables** (jamais d'imposition), sans rien activer par défaut
avant évaluation sur pages réelles (mêmes garde-fous que P5/P14). Rien n'entre dans l'actif.
