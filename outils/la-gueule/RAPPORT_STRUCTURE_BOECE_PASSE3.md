# RAPPORT_STRUCTURE_BOECE_PASSE3 — décisions éditoriales passe 3

Auteur : La Gueule (Claude). Date : 2026-08-09. Pilote : `boece-ceriziers-1646-kraken-v2`.
Tout reste en **suggestions** ; rien n'est appliqué au volume avant validation humaine du pilote.
Aucun entraînement lancé. Aucune écriture dans les tables actives. Aucune dépendance nouvelle.

## Ce qui est FAIT (modèle de données + fonctions pures + garde-fous + tests)

Cette passe pose le **socle de données et de logique** des décisions Q1–Q5 et l'**architecture** du
lecteur IA. Le câblage d'interface (menus, zoom, boutons) et la **propagation complète aux exports**
ALTO/PAGE/JSON des nouvelles métadonnées de page, ainsi que le **rendu côté site** (`app/`, autre
périmètre), sont explicitement **mis en attente** (voir « Encore désactivé »). L'ordre de GPT est
respecté : données d'abord, propagation et UI ensuite.

## Fichiers modifiés / ajoutés

- `src/typographie.mjs` (nouveau) : `appliquerTypographieLecture`, `espacementDiplomatique`, `contientFine`.
- `src/vision.mjs` (nouveau) : architecture du lecteur IA (schéma de sortie, garde-fous ; aucun appel).
- `src/structure.mjs` : `corrigerLettrine`, `integrerInitiale` (Q1) ; `paginationSource`,
  `paginationInferree`, `metadonneesPage` (Q4).
- `src/projet.mjs` : `joindreLignes` réécrite (Q2), `suggererCesure` (Q2) ; garde-fou U+202F dans
  `altoEntrainement` et l'export d'entraînement (Q3).
- `src/modeles.mjs` : `normaliserTypographie` (déjà là) ; `bancs/evaluer-banc.mjs` rapporte
  **CER strict** (référence) et **CER secondaire** (espacement + césure neutralisés).
- `ui/poesie.css` (nouveau) : convention CSS de référence pour la poésie (périmètre site).
- Tests : `test/typographie.test.mjs`, `test/passe3.test.mjs` (nouveaux) ; `test/modeles.test.mjs`,
  `test/projet.test.mjs`, `test/structure.test.mjs` (ajouts Q1/Q2).

## Résultat des tests

**133 tests verts** (`npm test`). Ajouts passe 3 : Q3 (6), Q2 (5), Q1 (5), Q4 (3), IA (6), typographie de
comparaison (1). Les 110 tests antérieurs restent verts.

## Q1 — corrections de lettrine

### Schéma final (`corrigerLettrine`)
Champs produits : `type_correction`, `nature:'lettrine'`, `texte_ocr`, `texte_valide`,
`visible_dans_source`, `origine_lecture`, `validation:'humaine'`, `certitude`, `bbox_source`,
`restitution_editoriale`, `afficher_marque_critique`, et `interdit_entrainement` (posé au besoin).
`integrerInitiale(ligne, initiale)` = `initiale + ligne`, **sans crochets** dans la lecture publique.

### Cas classés `omission_ocr` (CAS A — lettre VISIBLE, OCR l'a omise)
- « oy » + validation « M » → texte « Moy » ; `afficher_marque_critique:false` ; aucune marque publique.
- « Euripe » + « L' » → « L'Euripe ».
Intégré au texte corrigé. **Éligible au ground-truth seulement si le crop montre la lettrine.**

### Cas classés `restitution_editoriale` (CAS B — lettre NON lisible, conjecturée)
- `visible_dans_source:false` → `origine_lecture:'conjecture'`, `certitude:'probable'`,
  `afficher_marque_critique:true`, `interdit_entrainement:true`. **Jamais** au ground-truth OCR.

### Règles d'éligibilité au ground-truth
- CAS B : jamais.
- CAS A : `interdit_entrainement:true` si `crop_contient_lettrine === false` (ne jamais associer une
  transcription contenant « M »/« L' » à une image qui ne les montre pas). Sinon éligible après
  validation humaine.
- Aucune lettre n'est proposée automatiquement (ni dictionnaire ni modèle de langue) : `texte_valide`
  vient toujours de la saisie humaine. La suggestion auto reste « lettrine probable, initiale à saisir ».

## Q2 — césure de fin de ligne

### Convention retenue
- `-` / `‐` = **trait lexical** (conservé au recollage).
- `¬` = **césure typographique** de fin de ligne (marque de ground-truth CATMuS-Print ; supprimée à la
  recomposition). `⸗` **jamais** produit. La sortie brute du moteur reste intacte dans `texte_ocr_original`.

### Comportement exact de `joindreLignes`
- fin `¬` (non ambiguë) → supprime `¬`, recolle les fragments **sans blanc** (`ser¬`+`uante` → `seruante`).
- fin `-`/`‐` (non ambiguë) → **conserve** le trait, recolle sans blanc (`arc-`+`en-ciel` → `arc-en-ciel`).
- césure marquée **ambiguë** (`l.cesure.ambigu`) → **non jointe** (jonction par espace, on ne décide rien).
- sinon → jonction par une espace.
`suggererCesure(ligne, suivante)` propose de classer `-` de fin de ligne en `¬` **seulement** si la suite
commence par une minuscule ; **jamais de conversion silencieuse** (validation humaine requise).

### Mesures
`evaluer-banc.mjs` : **CER strict** (¬ et espacement comptent, mesure de référence) et **CER secondaire**
(espacement + césure neutralisés, complément). Le secondaire ne remplace jamais le strict.

## Q3 — espace avant la ponctuation haute

- **Ground-truth / diplomatique** : jamais de fine U+202F. `espacementDiplomatique` ramène une
  fine/insécable saisie par erreur à l'espace ordinaire U+0020 ; une ponctuation collée reste collée.
- **Rendu lecture** : `appliquerTypographieLecture` ajoute la fine U+202F avant « ; : ! ? » et à
  l'intérieur des guillemets — **au seul affichage** ; idempotente ; ne modifie pas le texte stocké.

### Présence / absence de U+202F par export
- ALTO d'entraînement, manifeste d'entraînement : **jamais** de U+202F (garde-fou `espacementDiplomatique`).
- ALTO/PAGE d'échange, JSON, TXT/Markdown, SQL, DOCX : **diplomatiques** → espacement source, pas de fine.
- HTML du site en mode lecture, DOCX « lecture » éventuel : fine possible **au rendu** (via
  `appliquerTypographieLecture`), sans toucher au stockage. (Câblage site = périmètre `app/`.)
Le résultat 0,64 % (secondaire) reste complémentaire du 0,76 % (strict) et ne le remplace pas.

## Q4 — folios, titres courants, marques de cahier

### Structure des métadonnées de page (`metadonneesPage`)
`{ page_pdf, pagination_source, pagination_inferree, titre_courant[], marques_cahier[], reclames[] }`.
Trois repères **jamais confondus** : `page_pdf` (index PDF), `pagination_source` (imprimée, visible),
`pagination_inferree` (déduite par séquence).

### Affichage prévu pour les folios
`paginationSource` : `export_corps:false`, `affichage_public:'marge'`. Un folio faible **ajouté à la
main** = `origine:'ajout_humain'`, `visible_dans_source:true`, hors corps mais **consultable** et
utilisable comme ancre vers le fac-similé. `paginationInferree` : `ground_truth:false`,
`affichage_public:'interface_editoriale'` — jamais présentée comme un folio réellement imprimé, jamais
de ligne source fictive.

### Titres courants et marques de cahier
`export_corps:false` ; masqués dans la lecture publique par défaut ; visibles en vue diplomatique /
détails de page ; conservés dans les exports structurés. Rôle interne `signature`, libellé d'interface
« marque de cahier ». Réclames : même principe. Distinction ground-truth **corps** (exclut ces éléments)
vs **structure/segmentation** (régions validées éligibles via un futur `eligible_entrainement_layout`,
jamais mêlé au GT du texte).

## Q5 — trois niveaux de blanc en poésie

- Données conservées : `blanc_poesie` (petit|moyen|large), `retrait_source_normalise`, `type_ligne`,
  `statut`. **Aucune valeur en pixels.** Invariant testé : une **continuation typographique n'obtient
  jamais** de `blanc_poesie` (blanc `null`).
- **Valeurs CSS** (`ui/poesie.css`, convention de référence, ajustable par le designer sans toucher aux
  données) : petit `0ch` ; moyen `clamp(3ch, 8vw, 8ch)` ; large `clamp(6ch, 14vw, 12ch)`, via variables
  `--retrait-poesie-*` sur `.poeme`.
- **Continuations typographiques** : vue LECTURE = rattachée au vers logique, sans niveau de blanc ;
  repli d'écran = retrait suspendu d'affichage (`2ch`), jamais l'apparence d'un vrai niveau. Vue
  DIPLOMATIQUE = coupure physique conservée, position restituée via `retrait_source_normalise`, sans
  symbole éditorial. Le rendu final des deux vues est du périmètre site (`app/`).

## Architecture préparée pour le lecteur IA (aucun appel réel)

`src/vision.mjs` : `sortieVision` (schéma normalisé, `statut:'candidat'`, `validation_humaine:false`),
`MODES_VISION` (`visuel_strict` / `contextuel`), `autoriserAppel` (cloud → consentement explicite),
`demanderAvisVisuel` (STUB : abstention traçable, jamais d'exception, `non_configure:true`). Le mode
`contextuel` force `inference_contextuelle:true` **et** `interdit_entrainement:true`. Le module peut
s'abstenir. **Aucune dépendance, aucun réseau, aucun fournisseur branché** (conforme au point 11 :
préparer l'architecture seulement).

## Encore désactivé / en attente (honnête)

- **Interface atelier** : le menu lettrine à **4 choix** (visible à saisir / conjecture / artefact /
  faux positif), le **zoom** sur la région de lettrine, le **bouton de suggestion de césure**, et le
  **bouton « demander un second avis visuel »** ne sont pas encore posés dans `ui/atelier.html`. La
  logique et les schémas sont prêts ; il reste le câblage.
- **Propagation aux exports** de la nouvelle structure `metadonneesPage` (folios en marge, titres
  courants/réclames en métadonnées ALTO/PAGE/JSON) : structures prêtes, écriture dans les exports à câbler.
- **Rendu site** (`app/`) : `ui/poesie.css` et `appliquerTypographieLecture` sont des **références** ;
  leur intégration au site est un chantier `app/` distinct, non traité ici.
- **`poeme_id`** : recommandé par GPT ; non encore fil-conducté dans l'analyse de bloc.

## Faux positifs / faux négatifs / indéterminés

- Q1 : risque de FP si l'humain classe en « visible » une lettre en réalité illisible (le garde-fou
  `crop_contient_lettrine` limite l'entrée au GT ; en cas de doute → CAS B, hors GT).
- Q2 : un `-` de fin de ligne réellement césure mais non converti reste **conservé** (traité comme
  lexical). C'est le comportement voulu (la conversion en `¬` est une décision humaine) ; à surveiller
  sur les données Tesseract anciennes (où `-` servait de césure) — hors périmètre du pilote Kraken.
- Q4 : une pagination inférée ne doit jamais « fuiter » en folio imprimé — garanti par
  `affichage_public:'interface_editoriale'` et `ground_truth:false`.

## Points nécessitant encore une validation humaine

- Le pilote reste à valider page par page (banc) avant tout CER officiel et avant toute application au
  volume. Les corrections de lettrine (CAS A/B), les césures ambiguës et les paginations inférées sont
  des **suggestions** à trancher à la main. Aucune règle de cette passe n'est appliquée au volume complet.
