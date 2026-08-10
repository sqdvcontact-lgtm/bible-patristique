# RAPPORT_STRUCTURE_BOECE_PASSE4 — poeme_id + garde de césure par moteur

Auteur : La Gueule (Claude). Date : 2026-08-09. Pilote : `boece-ceriziers-1646-kraken-v2`.
Intervention limitée aux deux ajustements demandés : **fil-conducteur `poeme_id`** et **garde de
césure dépendant de la provenance du moteur**. Rendu du site et lecteur visuel **différés**. Tout
reste en **suggestions** ; rien n'est appliqué au volume avant validation humaine du pilote ; aucune
écriture dans les tables actives ; aucun entraînement ; **aucune modification de `app/`**.

## Fichiers modifiés

- `src/structure.mjs` : `annotationVide` (+`poeme_id`, `poeme_ref`) ; `annoterPoemes` (ouverture/
  fermeture des poèmes, orphelins) ; `registrePoemesProjet` ; `annoterProjet` câble le fil et attache
  `projet.poemes` / `projet.orphelins_poeme` ; `extraireStructure` porte `poeme_id`/`poeme_ref`.
- `src/projet.mjs` : `detecterCesureCandidate` (garde césure par moteur) ; export JSON ajoute `poemes`.
- `src/echange.mjs` : `poeme_id` porté dans ALTO (`<Tags>` + TAGREFS) et PAGE (`custom`).
- Tests : `test/poeme.test.mjs` (nouveau) ; `test/projet.test.mjs` (césure §4).

## Tests

**146 tests verts** (`npm test`). Ajouts : 3 pour `poeme_id` (§3.5), 7 pour la césure par moteur (§4.4).

## Schéma exact de `poeme_id`

Registre par poème (`projet.poemes` et clé `poemes` de l'export JSON) :

```
{
  "poeme_id": "poeme-<page>-<ligne>",     // identifiant TECHNIQUE stable, indépendant du libellé
  "poeme_ref": "livre-1-poesie-1",        // référence lisible, recalculable
  "poeme_titre": "POESIE I.",             // graphie validée du titre source
  "niveau_source": 2,
  "statut": "suggere|confirme",           // confirme quand le titre est role_confirme
  "titre_ligne_id": "p<page>-l<ligne>"
}
```

Par ligne (`extraireStructure`, ALTO, PAGE) : `poeme_id` + `poeme_ref` (null hors poème). L'identifiant
technique est **stable et fondé sur la position** du titre : le seul texte du titre n'est jamais utilisé
comme identifiant.

## Ouverture / fermeture et changement de page

Un titre **T2 POESIE** ouvre un poème. Il reste actif sur les vers, les continuations typographiques
et **au-delà d'un changement de page**, jusqu'au **prochain titre T2** (PROSE **ou** POESIE) ou jusqu'à
un **titre T1 (LIVRE)** qui ferme la section. Un titre **PROSE ferme** le poème ; les lignes de prose
et les hors-corps ont `poeme_id=null`. Une continuation typographique **hérite** du `poeme_id` de son
vers. Le calcul des trois retraits ne mélange jamais deux poèmes (les blocs de poésie sont bornés par
les titres). Un titre seulement suggéré crée un poème `statut=suggere` ; il devient `confirme` après
validation humaine du titre.

## Comportement lors d'un titre reclassé ou supprimé

- **Correction du libellé** (même position) : `poeme_id` **inchangé** (fondé sur la position).
- **Suppression / reclassement** d'un titre POESIE : les lignes qui perdent leur poème ne sont **jamais
  réattribuées en silence**. Elles sont **signalées orphelines** (`poeme_orphelin=true`,
  `poeme_id_ancien` conservé) et listées dans `projet.orphelins_poeme`, pour rattachement humain.

## Propagation

- **JSON** : `structure` porte `poeme_id`/`poeme_ref` par ligne ; clé `poemes` = registre.
- **ALTO** : un `<OtherTag TYPE="poeme">` par poème ; la ligne référence son poème via `TAGREFS`
  (aux côtés du rôle).
- **PAGE** : `custom="structure {… poeme:<id>;}"`.
- **TXT / Markdown / DOCX** : l'identifiant technique **n'apparaît pas** ; ces exports n'utilisent que
  le titre et la structure du poème.

## Aucune modification de `app/`

Le rendu du site (CSS de poésie, typographie de lecture) reste dans `ui/poesie.css` comme convention de
référence, non appliquée au site. `app/` **n'a pas été touché**.

## Césure — comportement par moteur

- **Kraken CATMuS-Print** : `¬` reste la marque canonique de césure ; un `-` final reste **lexical par
  défaut** ; aucun changement sur le pilote Boèce ; une conversion `-`→`¬` exige toujours une suggestion
  et une validation humaine. `detecterCesureCandidate(..., moteur_source:'kraken…')` → `null`.
- **Tesseract** : un `-` final n'est **pas** présumé lexical. `detecterCesureCandidate` produit un
  `cesure_typographique` (`glyphe_source:'-'`, `marque_ground_truth_proposee:'¬'`, `statut:'suggere'`,
  `jointure_confirmee:false`) quand les signaux sont réunis : fin lettre + `-` unique, suite en
  minuscule, même colonne, interligne normal, marge droite atteinte, pas de blanc de paragraphe.
  Exclus : double trait, tiret de dialogue, capitale en tête, blanc de paragraphe, géométrie incohérente.
- **Moteur inconnu** : même détection, `moteur_source:'inconnu'` et **confiance réduite** (0,55 vs 0,75).
- **Jamais** de conversion silencieuse ni de jointure avant validation humaine. Après confirmation :
  glyphe source `-` conservé en provenance, `¬` dans la transcription de ligne compatible CATMuS,
  fragments joints (`joindreLignes` : `ser¬`+`uante` → `seruante`) ; un trait confirmé lexical est conservé.

## Aucune migration destructive

`detecterCesureCandidate` est une fonction **pure** qui ne produit que des suggestions en mémoire ; elle
n'écrit rien, ne réécrit aucun ancien fichier et ne modifie jamais `texte_ocr_original`. À l'ouverture
d'un projet sans provenance fiable, `moteur_source` reste **`inconnu`**. Aucune écriture n'a lieu sans
action humaine.

## Cas encore indéterminés

- Distinguer automatiquement un `-` de fin de ligne réellement **lexical** d'une césure sur un lot
  Tesseract reste ambigu : la suggestion est produite, l'arbitrage est humain (refus → trait conservé).
- Sur le pilote Kraken, aucun cas de césure `-` n'est concerné (le moteur émet `¬`).

## État final du pilote avant validation humaine

Le pilote reste en **suggestions**. À faire côté humain (hors code) : validation manuelle ciblée
(dont les titres POESIE/PROSE qui pilotent `poeme_id`, et les éventuels orphelins), puis liste des faux
positifs encore ouverts. Le CER de **0,76 % sur quatre pages** est encourageant mais **l'échantillon
est trop petit** pour décrire le volume : à **ne pas extrapoler** au livre entier. Aucune règle n'est
appliquée au volume complet avant validation humaine du pilote.
