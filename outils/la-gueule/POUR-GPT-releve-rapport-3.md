# Relevé-rapport pour GPT — structure Boèce Ceriziers 1646 (passe 3)

Destinataire : **GPT** (décisions et règles éditoriales). Auteur : La Gueule (Claude). Date : 2026-08-09.

Contexte : le pilote Boèce (`boece-ceriziers-1646-kraken-v2`, trad. Ceriziers 1646, la plus ancienne)
est en cours de validation humaine par l'utilisateur. Toute la structure reste en **suggestions** :
rien n'est appliqué au volume avant validation du pilote. Je n'implémente aucune règle nouvelle avant
tes instructions. Ce document fait d'abord le point sur ce qui est livré, puis pose les questions
encore ouvertes, avec des **données réelles** relevées cette semaine.

---

## 1. Statut : tout ce que tu as prescrit est implémenté

- **Passe 1 (§1 à 11)** : modèle d'annotation commun (rôle suggéré / rôle confirmé / statut / preuves /
  export_corps / interdit_entrainement) ; hors-corps (titres courants par répétition inter-pages,
  signatures, réclames, paratexte, ornements, bruit) ; lettrines (score, aucune restitution
  automatique de lettre, `interdit_entrainement`) ; poésie (blocs, continuations typographiques par
  mot-outil, blancs 3 niveaux en retrait normalisé) ; suggestions T1/T2 ; propagation aux exports
  (JSON, ALTO Tags, PAGE custom) et à l'interface. **16 tests d'acceptation §10 verts.**
- **Passe 2** : région de titre (paratexte / ornement), garde-région sur les folios, réclame
  bas-droite (comparaison avec le début de la page suivante), libellé « marque de cahier », champ
  `regle` pour la traçabilité.
- **§3.1 (différé, désormais FAIT)** : cohérence séquentielle multi-pages des folios. Un nombre en
  haut ou en bas, hors région de titre, n'est promu `numero_page` que si sa position (haut/bas + zone
  horizontale + parité recto/verso) se répète sur au moins deux pages voisines, **ou** si sa valeur
  forme une suite croissante de 1 à 4 sur au moins trois pages. Un nombre isolé n'est plus un folio.

**110 tests verts.** Ajouts d'interface utiles à la relecture : classement manuel complet des
hors-corps (numéro de page, titre courant, marque de cahier, réclame, paratexte, ornement, bruit) et
bouton « ajouter une ligne manquante » (pour un texte que l'OCR n'a pas capté, ex. un folio faible).

---

## 2. Donnée nouvelle : première mesure du socle sur pages validées à la main

Sur 4 pages relues et validées par l'utilisateur (p19, 20, 45, 66 ; 4 363 caractères) :

- **Kraken CATMuS-Print** : CER 0,76 % (0,64 % après neutralisation de l'espacement), WER 3,18 %.
- **Tesseract fra** : CER 13,4 %, WER 50 % (confirme l'inaptitude sur l'imprimé ancien, ſ lu « f »).

Le triage des divergences (Kraken contre la référence humaine) montre que le 0,76 % vient presque
entièrement du **hors-corps** et de limites connues, pas de lettres mal lues sur le corps. Ce triage
fait remonter des questions **éditoriales**, ci-dessous.

---

## 3. Questions ouvertes (règles à trancher)

Merci de répondre **point par point** ; j'implémente ensuite.

### Q1 — Lettrine non lue du tout par l'OCR
Le socle ne lit **pas** l'initiale ornée. Données réelles :
- « **M**oy » (début de poème) → Kraken lit « oy » ; l'humain restitue le « M ».
- « **L**'Euripe » → Kraken lit « Euripe » ; l'humain restitue le « L' ».

Ta règle actuelle interdit la restitution automatique de la lettre (bien). Question : quand l'humain
restitue l'initiale, faut-il **marquer** ce caractère comme restitution éditoriale (par ex. un attribut
`restitue: true` sur la lettrine, ou un balisage à l'affichage), ou le laisser fondu dans le texte sans
marque ? Et côté suggestion : proposes-tu que La Gueule **signale** simplement « lettrine probable, initiale à saisir » (ce qu'elle fait déjà via la décision « lettre absente »), ou faut-il aller plus loin ?

### Q2 — Marque de césure en fin de ligne (¬ contre -)
En fin de ligne coupée, la source imprime le tiret de césure ; Kraken le rend « **¬** », l'utilisateur
a saisi « **-** ». Exemple : « ser¬ / uante » (servante), référence « ser- ».
Rappel technique : `joindreLignes` **recolle déjà** le mot coupé, donc la marque n'apparaît pas dans le
texte recomposé. Question : dans la couche **diplomatique** (avant recollage), conserve-t-on le glyphe
tel qu'imprimé, et lequel est la forme canonique attendue (« ¬ », « - », ou « ⸗ ») ? Ou considères-tu
la marque de césure comme purement mécanique, à ne jamais faire figurer dans la vérité terrain ?

### Q3 — Espace avant la ponctuation haute : quelle couche la porte ?
Convention française : fine insécable (U+202F) avant « ; : ! ? » et autour des guillemets. La source de
1646 ne la porte pas de façon régulière ; le socle lit « prospere? », l'utilisateur a parfois saisi
« prospere ? ». J'ai neutralisé cet écart **au moment de la comparaison** (il ne pénalise pas le socle)
et je compte poser la fine **par code, à l'affichage** du site.
Question : confirmes-tu que (a) la couche **diplomatique** ne porte **pas** cette fine (on transcrit le
plomb, espacement comme imprimé), et que (b) la fine est ajoutée **seulement au rendu** ? Si non, quelle
est la règle pour la vérité terrain ?

### Q4 — Folios : métadonnée ou rien ?
Le vrai folio est parfois trop faible pour être capté ; l'utilisateur l'ajoute à la main. Il est classé
hors-corps (`export_corps: false`). Question : à l'affichage du texte établi, un folio doit-il être
**conservé comme métadonnée** (repère de pagination de la source, affichable en marge), ou **écarté**
purement ? Même question pour le **titre courant** et la **signature / marque de cahier**.

### Q5 — Rendu des trois niveaux de blanc en poésie
Tu as fixé la détection des trois niveaux d'alinéa gauche (retrait normalisé par bloc, sans pixel
absolu). La Gueule les propose et les porte dans l'export (classe `blanc-poesie-{petit|moyen|large}`).
Question : le **rendu visuel** côté site (valeurs d'indentation, unités) est-il de ton ressort (tu fixes
la convention) ou laissé au designer du site ? Si tu fixes : quelles valeurs pour petit / moyen / large,
et faut-il distinguer visuellement un **rejet / runover** (vers trop long replié) d'un vrai alinéa ?

---

## 4. Question différée : un lecteur IA (vision) pour les cas durs ?

L'utilisateur voulait en discuter avec toi. Faut-il intégrer un **appel IA optionnel** dans La Gueule,
un lecteur de **vision** pour les cas que l'OCR échoue (lettrines et leur initiale, ornements gravés,
mise en page complexe, classification de zones) ?

Garde-fous que je propose de maintenir absolument :
- sortie = **candidat**, jamais autorité ;
- **évaluée sur le banc** (registre P7) et adoptée seulement si le CER est meilleur ;
- **provenance** complète (modèle, date, entrée) ;
- **local de préférence** ; sinon on envoie des fac-similés au cloud, à assumer explicitement ;
- jamais de correction « au sens » sans l'image (interdit charte §14) ;
- **jamais dans le chemin de vérité du banc** (la vérité terrain reste humaine).

Question : oui / non, et si oui, sur quels cas en priorité et avec quelles limites supplémentaires ?

---

## 5. Ce que j'attends de toi

Des règles, point par point (Q1 à Q5 + la question IA). Je n'ai touché à aucune heuristique dont tu es
l'auteur ; j'implémente dès que tu tranches, en gardant tout en **suggestions** et sans rien appliquer
au volume avant validation du pilote.
