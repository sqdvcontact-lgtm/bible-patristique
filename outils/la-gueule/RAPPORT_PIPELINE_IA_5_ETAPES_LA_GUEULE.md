# RAPPORT_PIPELINE_IA_5_ETAPES_LA_GUEULE (évolutif)

Auteur : La Gueule (Claude). Début : 2026-08-09. Chantier **phasé** (Phases A→G des consignes).
Ce rapport est **construit au fil des phases** ; les sections non encore réalisées sont marquées
**NON VÉRIFIÉ**. Doctrine réaffirmée : candidats seulement ; fac-similé et OCR brut **immuables** ;
IA jamais autorité ; aucune écriture dans les tables actives ; aucun entraînement automatique ;
aucun appel cloud sans consentement ; aucun secret dans le dépôt ; les tests n'appellent jamais le
cloud (mock). Réutilise le pipeline local existant — **aucun second pipeline**.

## 1. État Git

- Repère de départ : tag **`la-gueule-avant-pipeline-ia`** (`09212de`).
- Phase A : `b8bd2ca`.
- État final : **NON VÉRIFIÉ** (chantier en cours).

## 2. Architecture — parcours fixe en 5 étapes

`1 Diagnostic IA → 2 OCR local → 3 Contrôle IA → 4 Validation ciblée → 5 Génération locale`.
Chaque étape est persistée et versionnée ; une modification en amont périme les étapes dépendantes.

## Phase A — FAITE (modèle d'état + barre visuelle + invalidation)

- `src/workflow.mjs` (pur, testé) : `ETAPES`, `ETATS`, `nouveauWorkflow`, `assurerWorkflow`
  (compat anciens projets, états **inférés**, **non destructif**), `majEtape` (archive le run
  précédent → jamais d'écrasement silencieux), `invaliderDependances` (§5 : diagnostic/ocr_modele →
  toutes les suivantes ; ocr_page/charte/ia_modele → contrôle+validation+génération ; edition_texte →
  validation+génération ; validation → génération).
- `src/projet.mjs` : `chargerProjet` appelle `assurerWorkflow` ; l'export/persistance porte `workflow`.
- `ui/atelier.html` : barre `#barreEtapes` persistante (5 étapes, badges d'état, étape active),
  rendue au chargement d'un projet ; `projetActuel` inclut `workflow`.
- Tests : `test/workflow.test.mjs` (5) — structure, inférence non destructive, non-écrasement,
  invalidation, protection des étapes non commencées. **151 tests verts.** Barre vérifiée au navigateur.

## Phases suivantes — PLANIFIÉES (NON VÉRIFIÉ)

- **Phase B — Diagnostic IA — CŒUR FAIT** (`99bd6e5`) : `src/ia/fournisseur.mjs` (abstraction +
  `choisirFournisseur` par env + `validerSortieIA` [rejette la prose] + `cleCache` + consentement +
  `appelerIA` [cache, validation, ne lève jamais]) ; `src/ia/mock.mjs` (hors-ligne, s'abstient) ;
  `src/ia/claude.mjs` (squelette `fetch` natif, `LG_AI_MODEL_*`, clé `ANTHROPIC_API_KEY` jamais au
  dépôt ni dans les sorties ; s'abstient sans clé/consentement/modèle ; jamais d'appel en test) ;
  `src/ia/diagnostic.mjs` (`pagesEchantillon`, `construireProfil`, prétraitement inactif par défaut).
  11 tests. **Fin de Phase B (`21495e1`)** : le diagnostic est l'**étape 1** câblée — `analyser()`
  construit un profil (moteur conseillé, régimes, phénomènes, prétraitement inactif), l'écrit
  (`profils-traitement/<nom>-profil-v1.json` via `/api/ia/profil/save`) et fait **avancer le workflow**
  (diagnostic → terminé, OCR local → prêt) ; la barre 5 étapes le reflète ; étape 1 cliquable. Vérifié.
  **Phase B complète.** *(À enrichir plus tard : appel IA `diagnostiquer` réel derrière consentement,
  écran de consentement dédié.)*
- **Phase C — OCR local dans le workflow — FAITE (`20423a2`)** : `regimePourPage(profil, page)`
  (moteur/modèle selon le régime dont la plage contient la page) et `pageAnormale(lignes)` (signale
  vide/court, §7.2). `ocr()` consulte le régime (kraken-print vs tesseract) ; après chaque OCR,
  `apresOcrWorkflow` fait avancer la barre (OCR local terminé → Contrôle IA prêt) et périme l'aval ;
  pages anormales marquées. Réutilise `wsl.mjs` (reprise/états/arrêt inchangés) — aucun second
  pipeline. 2 tests.
- **Phase D — Contrôle IA — CŒUR FAIT (`c5f726e`)** : registres versionnés (extraits de la doctrine
  existante, provenance conservée) `controles/charte-ocr.json`, `catalogue-erreurs-ocr.jsonl`
  (24 erreurs types), `profils-editions.json` (Ceriziers 1646). `src/ia/controle.mjs` :
  `intervention` (provenance §15, original jamais écrasé), `niveauRisque` (R0-R4, §10),
  `chargerCatalogue`, `controlerDeterministe` (sans IA : confiance faible / lignes vides / doublons /
  pages anormales → findings + compteurs, ne modifie pas le projet). Endpoint `/api/ia/controle` +
  étape 3 câblée (compteurs, avance du workflow). 4 tests. **RESTE Phase D** : contrôles IA VISUELS
  (lettrines, titres, corrections OCR par crop) derrière clé + consentement (mock s'abstient) ; revue
  globale du livre ; écriture des corrections retenues dans la couche candidate.
- **Phase E — Validation ciblée — FAITE (`e91ad93`)** : `src/ia/validation.mjs` — `STATUTS`,
  `admissibleGroundTruth` (§11.7), `grouperFamilles` (risque = max), `echantillonner` (moins sûrs
  d'abord, étalé, déterministe), `regleEchantillonnage` (0→accepter / 1→étendre 15 / ≥2→détaillé),
  `classerValidation` (R4→blocage, R3→critique, indéterminé→non résolu, R0-R2→familles, déterministe→
  auto). Endpoint `/api/ia/validation` + étape 4 (panneau familles/critiques/blocages, « Accepter la
  famille », blocage → export « complet » interdit). 5 tests, vérifié au navigateur. **RESTE** : écran
  détaillé par onglets (§13.4), présentation crop/avant/après des occurrences, annulation fine.
- **Phase F — Génération locale** : relier les exports existants ; rapports ; versions ; états de
  livraison (`FINAL_CANDIDAT` / `…_AVEC_RESERVES` / `CANDIDAT_INCOMPLET`) ; SHA256SUMS ; aucune IA à
  cette étape.
- **Phase G — Pilote Boèce** : exécuter le parcours ; mesurer erreurs, faux positifs, nombre de
  décisions humaines ; ne pas lancer le volume complet avant validation du pilote.

## Garde-fous déjà en place (rappel)

OCR brut / `texte_ocr_original` / ALTO brut immuables ; corrections en couche candidate distincte
(passe 3) ; provenance des corrections (lettrines, césure) ; `src/vision.mjs` = architecture sans
appel ; banc d'évaluation séparé du ground-truth ; consentement cloud requis (`autoriserAppel`).

## Limites et prochaine étape recommandée

Chantier volumineux mené **par phases**. Prochaine étape : **Phase B** (abstraction fournisseur + mock
+ Claude configurable + diagnostic), en gardant les tests hors-cloud. Rien n'est appliqué au volume
complet avant validation humaine du pilote. Toute section « NON VÉRIFIÉ » ci-dessus reste à réaliser.
