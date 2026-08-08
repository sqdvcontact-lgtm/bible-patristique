# RAPPORT_STRUCTURE_BOECE_PASSE2 — structure éditoriale, 2ᵉ passe

Auteur : La Gueule (Claude). Date : 2026-08-08. Suggestions seulement, source jamais modifiée,
rien activé pour le reste du volume avant validation humaine du pilote.

## Fichiers modifiés

- `src/structure.mjs` : champ `regle` au modèle ; `detecterRegionTitre` (région/paratexte/ornement) ;
  `detecterReclames` réécrit (coin bas-droite, exclusions, comparaison page suivante, tolérance
  lettrine, scores de confiance) ; `analyserVolume` réordonné en 2 phases selon l'ordre §1 ;
  garde-région sur les numéros de page.
- `test/structure.test.mjs` : tests de non-régression + acceptation §6.
- `ui/atelier.html` : libellé « marque de cahier » pour les signatures + infobulle ; menu 3 choix
  réservé aux lettrines/artefacts ; confirmation des `_candidate` (paratexte/ornement/réclame) par
  dépouillement du suffixe.

## Tests ajoutés et résultats

**108 tests verts** (23 dans `structure.test.mjs`). Ajouts de cette passe :
- §6.1 non-régression numéral de titre (« I. » avant « PROSE. » → titre T2, jamais lettrine).
- §6.2 région de titre p19 (données réelles).
- §6.3 réclame bas-droite (fixture 2 pages sûres) + cas géométrique non confirmé.
- §6.4 filigrane (« Digitized by Google » → bruit ; « 00gl. » seul → jamais bruit auto).

## Seuils effectivement employés

- **Région de titre** : score ≥ 4. Signaux : +2 (≥3 lignes centrées, |centre−W/2| < 0,20 W) ;
  +2 (motif lexical CONSOLATION/PHILOSOPHIE/LIVRE/PROSE/POESIE/DE LA) ; +1 (majorité < 65 % W) ;
  +1 (hauteurs variables > 0,8× médiane) ; +1 (fragments ≤ 2 caractères) ; +1 (aucun paragraphe
  avant la fin). Fin de région : avant le 1ᵉʳ titre de section (POESIE/PROSE + numéral) ou 2 lignes
  de corps consécutives. Classement interne : **centré + lettres → paratexte_titre_candidate**,
  sinon **ornement_candidate**.
- **Numéro de page** : garde-région (un nombre dans une région de titre n'est jamais promu folio) ;
  géométrie haut/bas conservée pour les folios hors région. *(La cohérence séquentielle multi-pages
  §3.1 reste une amélioration ultérieure — voir « fonctions désactivées ».)*
- **Réclame** : bas > 80 % H ou sous la dernière ligne de corps ; bord droit ≥ 82 % W ou centre
  > 72 % W ; largeur ≤ 35 % W ; 1–4 mots ; 2–30 caractères. Exclus : chiffres seuls, romains isolés,
  1–4 alphanumériques (signature), motifs Google. Similarité (comparaison normalisée, ſ→s) : ≥ 0,90
  = confiance forte ; 0,78–0,90 + géométrie forte = moyenne (⚠) ; < 0,78 = `reclame_candidate_geometrique`.

## Pages et lignes testées

p19 (région, réel), p20/p21 (réclame, fixture consécutive sûre), et le **pilote réel** entier.

## Classification obtenue pour chaque fragment de p19 (pilote réel)

| Ligne | Rôle suggéré |
|---|---|
| « LA », « CONSOLATION », « DE LA », « PHILOSOPHIE. », « LIVRE PREMIER. » | **paratexte_titre_candidate** |
| « Ri », « 8 », « (2 », (ligne vide) | **ornement_candidate** |
| « D » (isolé, y=1314, HORS de la région, dans le poème) | artefact_candidate |
| « POESIE I. » (titre de section, après la région) | **titre / T2** (non absorbé) |

## Pourquoi « 8 » n'est plus numero_page

« 8 » [348,159] se trouve **dans** la region_titre_candidate (avant « POESIE I. ») et n'est pas
centré → classé **ornement_candidate**. La détection de numéro de page s'applique **après** la
région et **saute** les lignes déjà hors-corps (garde-région §3.2). Il n'existe d'ailleurs aucun
vrai folio sur cette page de titre.

## Résultat de la détection de « d'artifice »

- **Fixture consécutive sûre** (p20→p21, test §6.3) : « d'artifice » [1018,1802,156,65] →
  **reclame** ; page cible 21 ; ligne cible « d'artifice, & sa robe estoit… » ; **similarité 1,0**.
  La signature « B » placée plus bas n'est PAS choisie.
- **Pilote réel** (pages sélectionnées 19–28, non toutes consécutives) : « d'artifice » →
  **reclame_candidate_geometrique** (géométrie seule) ; page cible 21 ; ligne cible « chargez d'vne
  noirce… » ; **similarité 0,12** → **non confirmée** (conforme à §4.5 : sans page suivante sûre, on
  ne confirme jamais). « B », « F1 », « 5 », « 20 », « 00gl. » ne sont jamais retenus comme réclames.

## Faux positifs / faux négatifs / indéterminés

- **Faux positifs** : « D » isolé (p19) classé artefact au lieu d'ornement — hors de la région, donc
  traité par le détecteur de lettrines/artefacts ; les deux restent hors-corps, la décision humaine
  tranche. Aucun autre FP sur les cas testés.
- **Faux négatifs** : sur le pilote, les réclames restent au stade **géométrique** faute de pages
  réellement consécutives (attendu). À revalider sur un lot consécutif sûr.
- **Indéterminés** : « 00gl. » (filigrane garbé) → aucun rôle (indetermine), jamais bruit auto.

## Incidence sur les exports et le ground-truth

- Corps (JSON `segments`, TXT, Markdown, DOCX, SQL) : exclut les lignes hors-corps **confirmées**
  (paratexte_titre, ornement, bruit, titre_courant, signature, réclame) — jamais de la source.
- Rôles + preuves propagés dans l'export JSON (`extraireStructure`) et dans ALTO (`<Tags>`/TAGREFS)
  et PAGE (`custom`).
- Ground-truth : les rôles hors-corps confirmés sont exclus des données d'entraînement ; les
  lettrines restent `interdit_entrainement`. Rien n'est supprimé ni fusionné automatiquement.

## Fonctions encore désactivées par défaut

Toutes les suggestions restent des **propositions** (`statut: 'suggere'`) ; rien n'est appliqué sans
`role_confirme` humain, et **aucune règle n'est appliquée au reste du volume** avant validation du
pilote. Amélioration différée : **cohérence séquentielle multi-pages des folios (§3.1)** — la
garde-région et la géométrie sont en place ; la vérification de séquence/répétition inter-pages
reste à ajouter pour durcir encore `numero_page` hors région.
