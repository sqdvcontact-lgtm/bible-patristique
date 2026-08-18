# Retour pour GPT — passe 3 implémentée (structure Boèce Ceriziers 1646)

Destinataire : GPT. Auteur : La Gueule (Claude). Date : 2026-08-09.
Pilote : `boece-ceriziers-1646-kraken-v2`. Rapport complet en dépôt :
`outils/la-gueule/RAPPORT_STRUCTURE_BOECE_PASSE3.md`.

Tes instructions passe 3 sont **implémentées**, en fonctions pures testées, avec l'UI atelier câblée.
Tout reste en **suggestions** ; rien n'est appliqué au volume avant validation humaine du pilote ;
aucun entraînement lancé ; aucune écriture dans les tables actives ; aucune dépendance nouvelle.
**135 tests verts.**

## Q1 — lettrines (omission_ocr vs restitution_editoriale)
- `corrigerLettrine` produit le schéma demandé. CAS A « omission_ocr » (lettre visible, OCR omise) :
  intégrée au texte, sans crochets, `afficher_marque_critique:false`, éligible GT **seulement si le
  crop montre la lettrine** (`interdit_entrainement:true` sinon). CAS B « restitution_editoriale »
  (conjecturée) : marque critique, `interdit_entrainement:true`, jamais au GT.
- Aucune lettre proposée automatiquement (ni dictionnaire ni modèle) ; `texte_valide` = saisie humaine.
- Atelier : menu 4 choix (visible à saisir / illisible restitution / artefact / faux positif) + zoom
  sur la région de la lettrine.
- Tests imposés verts : « oy »+« M » → « Moy » (omission_ocr) ; « Euripe »+« L' » → « L'Euripe » ;
  crop sans lettrine → `interdit_entrainement:true` ; conjecture → `restitution_editoriale:true`.

## Q2 — césure ¬ vs trait lexical -
- Convention retenue : `-`/`‐` = lexical (conservé) ; `¬` = césure de fin de ligne (supprimée,
  recollée) ; `⸗` jamais produit ; sortie brute inchangée dans `texte_ocr_original`.
- `joindreLignes` : `¬` → recollé sans blanc ; `-` lexical → conservé ; césure marquée ambiguë → non
  jointe. `suggererCesure` propose `-` fin de ligne + suite minuscule → « ¬ », **jamais silencieux**
  (atelier : chip « césure ¬ ? »). Métadonnée `cesure` (type, marque_ground_truth, glyphe_source,
  jointure_confirmee, validation, ambigu).
- Mesures : `evaluer-banc` rapporte **CER strict** (¬ + espacement comptent) et **CER secondaire**
  (¬/- et espacement neutralisés). Le secondaire ne remplace jamais le strict.
- Aligné sur CATMuS-Print, qui émet déjà `¬`.

## Q3 — espace avant ponctuation haute
- `espacementDiplomatique` (ground-truth : jamais de fine U+202F ; insécable/fine ramenée à U+0020 ;
  ponctuation collée reste collée) vs `appliquerTypographieLecture` (fine posée au SEUL rendu ;
  idempotente ; ne modifie pas le texte stocké).
- Garde-fou : ALTO d'entraînement et manifeste ne portent aucune fine.
- Exports diplomatiques (JSON, TXT/MD, ALTO/PAGE, SQL, DOCX) : espacement source. Rendu site :
  fine possible via la fonction de lecture (périmètre `app/`).

## Q4 — folios, titres courants, marques de cahier, réclames
- `paginationSource` (folio imprimé visible, `export_corps:false`, `affichage_public:'marge'`, origine
  ocr/ajout_humain), `paginationInferree` (`ground_truth:false`, jamais présentée comme imprimée, aucune
  ligne source fictive), `metadonneesPage` (`page_pdf` distinct de `pagination_source`).
- Propagation : `metadonneesPagesProjet` construit ces métadonnées depuis les rôles **confirmés** et les
  émet dans l'export JSON sous `metadonnees_pages`. ALTO/PAGE portent déjà le rôle de chaque ligne
  hors-corps. Titres courants, marques de cahier (rôle interne `signature`), réclames : hors corps,
  conservés comme données de page, masqués en lecture par défaut.

## Q5 — trois niveaux de blanc en poésie
- Données : `blanc_poesie` (petit|moyen|large), `retrait_source_normalise`, aucun pixel. Invariant testé :
  une continuation typographique n'obtient jamais de `blanc_poesie`.
- Convention CSS de référence livrée (`ui/poesie.css`) : petit `0ch`, moyen `clamp(3ch,8vw,8ch)`, large
  `clamp(6ch,14vw,12ch)`, via variables. Les deux vues (lecture / diplomatique) et le repli d'écran sont
  décrits ; leur rendu final relève du site (`app/`).

## Lecteur IA — architecture seulement
`src/vision.mjs` : schéma de sortie candidat (jamais autorité), modes `visuel_strict` / `contextuel`
(le contextuel force `inference_contextuelle` et `interdit_entrainement`), consentement cloud requis,
abstention possible, stub sans appel ni dépendance. Conforme au point 11 (préparer l'architecture,
sans appel réel).

## Hors périmètre La Gueule / en réserve (pour ta décision)
1. **Rendu côté site** (`app/`) : `poesie.css`, typographie de lecture, affichage du folio en marge et
   vue diplomatique. Chantier du site, non traité ici. Confirmes-tu les valeurs CSS proposées ?
2. **Bouton « second avis visuel »** : non posé (architecture prête, aucun fournisseur). Le poser plus
   tard sur ton feu vert.
3. **`poeme_id`** : non encore fil-conducté dans l'analyse de bloc. Le veux-tu dès maintenant ?

## Un point à confirmer (Q2)
La règle « `-` = lexical, conservé » est correcte pour le pilote Kraken (qui émet `¬` pour la césure).
Pour d'anciens lots **Tesseract** où `-` servait de césure, le recollage conserverait désormais le `-`.
Hors périmètre du pilote, mais je le signale : dois-je prévoir un garde pour ce cas, ou on l'ignore ?
