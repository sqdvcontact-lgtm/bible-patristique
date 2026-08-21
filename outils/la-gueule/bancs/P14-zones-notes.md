# P14 — Zones de page (notes, colonnes, marginalia) : architecture, PAS d'heuristique activée

> Règle : ne rien programmer à l'aveugle. Aucune détection automatique n'est activée
> par défaut. Ce document prépare l'architecture et dit précisément quel échantillon manque.

## Ce qui a été trouvé dans les documents présents

Inspection réelle (rendus 2026-08-08) :

- **Notes de bas de page : PRÉSENTES** dans `incoming/Homelies_saint_Basile.pdf`.
  Exemple certain : PDF p.60 (page imprimée 30, « DISCOURS SUR LA LECTURE ») porte
  un **appel de note « (1) »** dans le corps (« Sardanapale (1) ») et la **note**
  correspondante en bas de page, en petit corps, séparée du texte par un blanc :
  « (1) Sardanapale, roi d'Assyrie… ». → **échantillon exploitable** pour la détection
  de zone « note de bas de page » et d'« appel de note ».
- **Références bibliques en ligne** (Basile p.90 : « (Ps. 61. 11.) », « (Is. 40. 6.) »).
  Ce ne sont PAS des notes de bas de page ; elles sont déjà traitées par `notes.mjs`
  (recensement → appels `[[N]]`). Ne pas les confondre avec l'apparat.

## Ce qui MANQUE (ne pas inventer de règles)

- **Texte sur plusieurs colonnes** : AUCUN échantillon (Basile et Boèce sont en une colonne).
  Manque : une édition **à double colonne**, typiquement une **Migne (PL/PG)**. La lecture
  double colonne est déjà codée et testée (P8d), mais elle n'a pas encore été éprouvée sur
  un vrai deux-colonnes → fournir une page Migne pour la valider.
- **Marginalia** (notes en marge) : AUCUN échantillon dans le dossier. Manque : une source
  portant des **notes marginales** (beaucoup d'imprimés d'Ancien Régime en ont ; le Boèce
  Ceriziers n'en montre pas sur les pages vues). Ne rien coder tant qu'un échantillon réel
  n'est pas disponible.

## Architecture prévue (types de région) — NON ACTIVÉE

Chaque ligne / région recevra, à terme, un **type de zone** parmi :

| type            | description                                   |
|-----------------|-----------------------------------------------|
| `texte`         | texte principal (défaut)                      |
| `titre`         | titre de structure (ref_niv — déjà en place)  |
| `titre_courant` | titre courant (déjà détecté, exclu de l'export)|
| `numero_page`   | numéro de page (déjà détecté via estEntete)   |
| `note`          | note de bas de page                           |
| `marginalia`    | note marginale                                |
| `decoratif`     | ornement / lettrine / non-texte               |
| `incertain`     | région douteuse, à trancher par l'humain      |

Principes imposés :

1. **Suggestion, jamais décision** : toute détection de zone est une PROPOSITION
   modifiable par l'utilisateur dans l'atelier (comme les sélecteurs de titre T1..T5).
2. **Rien par défaut** : aucune heuristique n'est activée tant qu'elle n'a pas été
   évaluée sur un **jeu annoté** de pages réelles.
3. **Mesures d'évaluation** (à produire sur le jeu annoté, quand il existera) :
   faux positifs, faux négatifs, précision, rappel, et **nombre de pages dont l'ordre
   de lecture est modifié à tort**. Une heuristique n'est retenue que si elle n'introduit
   pas de régression sur les bonnes pages (même exigence que P5).

## Jeu annoté à constituer (prochaine étape, avec échantillons réels)

- **Notes de bas de page** : annoter ~6–10 pages de Basile portant des notes (dont PDF p.60),
  en marquant, par page : zone de texte principal vs zone de notes (frontière = blanc + petit
  corps), et les appels de notes dans le corps.
- **Double colonne** : dès qu'une page Migne est fournie, annoter les deux colonnes + l'ordre.
- **Marginalia** : dès qu'une source en comporte, annoter les marges.

Tant que ces jeux annotés n'existent pas, **aucune détection de note/colonne/marginalia
n'est écrite ni activée**.
