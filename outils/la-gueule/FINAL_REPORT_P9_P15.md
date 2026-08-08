# RAPPORT FINAL — Phase P9 à P15 (validation de La Gueule)

Date : 2026-08-08. Toute affirmation non directement testée est marquée **[non vérifié]**.
Doctrine respectée : travail cantonné à `outils/la-gueule`, candidats uniquement, aucune
écriture en base active, Bible 899 / versets_* / TR0001–TR0005 non touchés, aucune graphie
modernisée fabriquée, **aucun entraînement lancé**.

---

## 1. État Git initial et final

- **Initial** : `outils/la-gueule/` **entièrement non versionné** (`?? ./`), sur la branche
  `confort-lecture` (dépôt `C:/Corpus Scriptura/bible-patristique`).
- **Final** : 3 commits + 1 tag, plus des modifications P10/P14 en attente de commit.
  - `3e8c382` — La Gueule : consolidation P1–P8 (45 fichiers). **tag `la-gueule-p8`**.
  - `9998617` — P9 : suite de tests d'intégration réelle.
  - `c887309` — P15 : durcissement sécurité du serveur local.
  - En attente : `.gitignore`, `src/projet.mjs` (garde donnée), `test/projet.test.mjs`,
    dossier `bancs/` (P10/P11/P14). Le projet contaminé et son sidecar sont sous `projets/`
    (gitignoré) : marqués mais non versionnés (voulu).
- **Rien versionné hors périmètre** : PDF, projets, exports, sorties, modèles — exclus par
  `.gitignore`. Vérifié.

## 2. Fichiers modifiés / ajoutés (P9–P15)

- **P9** : `integration/integration.itest.mjs` (nouv.), `integration/fixtures/boece-p143.pdf`
  (nouv., fixture réelle), `integration/fixtures/MANIFEST.json` (nouv.), `package.json`
  (script `test:integration`).
- **P15** : `src/serve.mjs` (gardes Host/Origin, restriction de chemin, plafond upload,
  noms durcis), `bin/gueule.mjs` (commande `nettoyer`), `integration/integration.itest.mjs`
  (6 tests de sécurité).
- **P10** : `projets/boece-ceriziers-1646-candidat.json` (champ `_garde`, gitignoré),
  `projets/…INTERDIT.md` (sidecar), `src/projet.mjs` (garde `interdit_entrainement`),
  `test/projet.test.mjs` (test de la garde), `bancs/boece-ceriziers-1646-test-v1/selection.json`,
  `bancs/ocr-brut-banc-v1.mjs`, `.gitignore` (images de banc).
- **P11** : `bancs/evaluer-banc.mjs` (harnais d'évaluation reproductible, refuse un banc non validé).
- **P14** : `bancs/P14-zones-notes.md` (architecture + échantillons manquants).

## 3. Commandes exécutées (principales)

- `git add outils/la-gueule … ; git commit ; git tag la-gueule-p8`
- `npm test` (unitaire), `npm run test:integration` (intégration)
- `pdfseparate -f 143 -l 143` (fixture), `sha256sum` (empreinte)
- `node bin/gueule.mjs nettoyer` (purge)
- `node bancs/ocr-brut-banc-v1.mjs` (OCR brut du banc, **en cours** en arrière-plan)
- `pdftoppm` (rendus d'inspection Basile pour P14)

## 4. Tests unitaires

**82 / 82 réussis** (`npm test`, fonctions pures). +3 depuis P8 : garde
`exporterEntrainement` (refus `interdit_entrainement`), `construireManifesteBanc`
(ne compte que `valide_humain`), `exporterBanc` (refus si non validé).

## 5. Tests d'intégration

**20 / 20 exécutés et réussis** (`npm run test:integration`), WSL + moteurs présents.
Classification honnête : si un outil manque, le test concerné est **NON EXÉCUTÉ (sauté
avec cause)**, jamais faux-réussi (comportement vérifié : à froid, les tests WSL se
sautaient ; corrigé par détection au moment du test avec réchauffage).

Couverture réelle : accueil HTTP, `/api/doctor`, Node→WSL, **OCR Tesseract** et **OCR
Kraken CATMuS-Print** d'une vraie page (assertion : le ſ est lu « Philosophie »), repli
GPU→CPU présent, arrêt de tâche, persistance corrections + états, export quintuple +
ALTO/PAGE + entraînement, `/tmp/lg.*` nettoyés, « aucun client base active dans src/ »,
et 6 tests de sécurité (voir §12).

**Non couvert automatiquement** (client) : la boucle complète reprise-après-interruption /
relance-des-pages-en-erreur vit dans l'atelier (JavaScript navigateur). La **persistance
serveur** qui la sous-tend est testée ; la boucle client a été vérifiée manuellement plus
tôt. **[non vérifié en automatisation]**.

## 6. Pages et fixtures employées

- **Fixture intégration** : `integration/fixtures/boece-p143.pdf` — Boèce Ceriziers 1646,
  page 143. SHA-256 `d32c8d7b2d455404c4c448fc8d8d3c54cac0c1c825717b77b6e6589adeaf6cb3`,
  88 221 octets (MANIFEST.json).
- **Banc** : 12 pages de Boèce (19, 20, 45, 66, 88, 100, 120, 140, 142, **143**, 144, 155),
  cf. `bancs/boece-ceriziers-1646-test-v1/selection.json`.
- **P14** : rendus d'inspection Basile PDF p.60 (notes de bas de page) et p.90 (réf. en ligne).

## 7. État du banc d'essai

- Sélection définie (12 pages, page 143 incluse). **Usage évaluation seulement**,
  `interdit_entrainement`.
- **État 1 (OCR brut)** au socle **Kraken CATMuS-Print** : **en cours de génération** en
  arrière-plan → projet `banc-boece-ceriziers-1646-test-v1` (`_garde.valide_humain=false`).
  Au moment de la rédaction : pages 19, 20, 45 faites (~45 s/page). **[à confirmer à la fin]**.
- **État 2 (corrigé)** et **État 3 (valide_humain)** : **NON FAITS — travail humain requis.**
  Aucune donnée `valide_humain` n'existe. Le dossier final `bancs/…/` sera constitué **après**
  validation humaine.
- **Outillage prêt et vérifié** : parcours de validation dans l'atelier (marqueur « lecture
  incertaine » par ligne + « Valider (humain) » par page/ligne), et **`exporterBanc`** (endpoint
  `/api/export/banc` + bouton) qui produit `bancs/<nom>/` (images + ALTO corrigé + manifeste
  SHA-256 + états + moteur/modèle/date) et **REFUSE** un banc non `valide_humain`. Vérifié en
  navigateur : refus sans production ni validation. `projetActuel()` préserve `_garde`.

## 8. Validations humaines encore nécessaires (bloquantes)

1. **Corriger et valider à la main** les 12 pages du banc dans l'atelier (états 2 puis 3).
   Une correction automatique n'est PAS une validation humaine.
2. **Confirmer la représentativité** de la sélection (zones, mises en page, qualité).
3. **Décider** de l'inscription des mesures au registre (voir §9), après catégorisation des erreurs.

## 9. Mesures CER/WER réellement valides

**AUCUNE à ce jour.** Raison : pas de banc validé humainement. La mesure provisoire du
2026-08-08 (socle Kraken ~14 % de CER sur la page 143) est faite **contre une référence
contaminée** (Tesseract, ſ→f) : elle **ne vaut pas** et n'est pas inscrite. `modeles/registre.json`
garde `cer: null` pour les deux socles. Le harnais `bancs/evaluer-banc.mjs` produira des mesures
valides **quand** le banc sera validé, et **n'écrit pas** le registre automatiquement.

## 10. Benchmark du mode Kraken par lot (P13)

**NON EXÉCUTÉ.** Seule la **base A** (pipeline actuel, un processus par page) est mesurée en
passant, via l'OCR du banc : **~41–45 s/page** (Kraken CATMuS-Print, 300 DPI, GPU+repli).
Les variantes **B** (processus persistant / lot) et **C** (segmentation groupée) restent à
implémenter et à mesurer sur les mêmes 10 pages. **[non vérifié]** — à faire, avec temps réels.

## 11. État des notes et marginalia (P14)

- **Notes de bas de page : échantillon RÉEL trouvé** dans Basile (PDF p.60 : appel « (1) » +
  note en pied). Exploitable pour un futur jeu annoté.
- **Double colonne : AUCUN échantillon** (Basile et Boèce en une colonne). La lecture double
  colonne (P8d) reste **non éprouvée sur un vrai deux-colonnes** → fournir une page **Migne**.
- **Marginalia : AUCUN échantillon** → fournir une source à notes marginales.
- **Aucune heuristique de zone n'est écrite ni activée.** Architecture (types de région)
  définie dans `bancs/P14-zones-notes.md`. La détection sera une **suggestion** modifiable,
  activée seulement après évaluation (faux positifs/négatifs, précision, rappel, pages dont
  l'ordre de lecture change à tort).

## 12. Contrôles de sécurité (P15)

Implémentés **et testés** (6 tests d'intégration) :

- `/api/fichier` + entrées PDF (`pdf-info`, `metadonnees`, `ocr`, `comparer`, `ocr-bilingue`)
  **restreints au dossier de travail** → traversée de chemin bloquée (403). Vérifié.
- **Host/Origin non local → 403** (anti DNS-rebinding, anti cross-site). Vérifié.
- Serveur lié à **127.0.0.1 uniquement** (jamais exposé au réseau). Vérifié.
- **Type de téléversement** restreint (PDF + images) → 400 sinon. Vérifié.
- **Plafond d'upload 400 Mo** : refus sur Content-Length + coupe-circuit de flux.
  **[testé partiellement]** — le refus par type est testé ; le refus par taille réelle de
  400 Mo n'est pas envoyé en test (trop volumineux) : logique revue par lecture de code.
- **Noms de fichiers durcis** (`basename`, `[\w.-]`, sans point de tête). Vérifié par revue.
- **Purge contrôlée** : `gueule nettoyer` (sorties/atelier + `/tmp/lg.*` ; `--incoming`,
  `--exports` sur demande ; `projets/` jamais touché). Exécuté (200 images, 180 Mo).
- **Absence de secrets** dans les fichiers versionnables : recherche effectuée, rien trouvé.
- **Disque presque plein** : les écritures échouent dans le `try/catch` global du serveur →
  réponse 500 propre, pas de crash. **[non testé spécifiquement — comportement générique]**.

## 13. Défauts encore ouverts

- Pas de banc validé → pas de CER/WER valides ni de comparaison de socles (§7–9).
- Benchmark Kraken par lot non fait (§10).
- Double colonne non éprouvée sur un vrai échantillon ; notes/marginalia non détectées (§11).
- Refus d'upload par taille réelle non testé de bout en bout (§12).
- Boucle client reprise/relance non couverte par l'automatisation (§5).
- Projet **Boèce kraken-v2** (P12) non constitué comme tel : l'OCR du banc en tient lieu de
  pilote partiel (Kraken sur Boèce, 27–35 lignes/page), mais le pilote de 10 pages avec bilan
  formel (ordre, titres courants, césures, reprise) reste à faire.

## 14. Prochaine étape recommandée

1. **Laisser finir l'OCR brut du banc**, puis **corriger et valider à la main** les 12 pages
   dans l'atelier (états 2–3). C'est le verrou de tout le reste.
2. Lancer `node bancs/evaluer-banc.mjs banc-boece-ceriziers-1646-test-v1` → CER/WER valides ;
   catégoriser les erreurs ; décider (humain) de l'inscription au registre.
3. Constituer **Boèce kraken-v2** (P12) : pilote 10 pages, bilan, puis volume complet si pas
   de régression.
4. Mesurer le **mode Kraken par lot** (P13, variantes B/C) avec temps réels.
5. Fournir une page **Migne** (double colonne) et une source à **marginalia** pour éprouver
   P8d et construire le jeu annoté P14.

---

### Résumé honnête

Fait et vérifié : **P9** (gel Git + suite d'intégration réelle, 20/20) et **P15** (sécurité,
6 tests). **P10** : fichier contaminé neutralisé (marqueurs + garde de code testée) et banc
échafaudé. **P14** : échantillon de notes trouvé, architecture posée, rien activé à l'aveugle.
**P11** : harnais prêt, en attente d'un banc validé. **P12/P13** et la **validation humaine
du banc** : à faire — ils exigent des runs dédiés et une relecture humaine, non simulables.
Aucun entraînement n'a été lancé ; aucun CER non valide n'a été inscrit.
