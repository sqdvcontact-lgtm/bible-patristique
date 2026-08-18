# Rapport — correction et consolidation du pipeline La Gueule

*Exécution du plan d'action du 2026-08-09 (OCR → contrôle IA → validation → export). Document autoportant.*
*Convention : toute affirmation non testée porte la mention **NON VÉRIFIÉ**.*

## Résumé

Les deux verrous qui empêchaient le pipeline de fonctionner réellement sont levés :
1. **Une correction acceptée modifie désormais le texte candidat** et se retrouve dans tous les exports, l'OCR brut restant intact (Phase 1).
2. **La complétude OCR se mesure sur le lot traité**, plus sur les 589 pages du PDF : un lot de 10 pages est « terminé » et débloque le contrôle (Phase 2).

Ajouts : reclassement des lignes non textuelles (Phase 3), validation sans fausse famille (Phase 4), blocages d'export proportionnés (Phase 5), retrait du tri IA du parcours (Phase 6), état de livraison relié au lot (Phase 7), test d'intégration de bout en bout (Phase 8).

**Tests : 235, tous verts** (`node --test`). Aucune écriture dans une table active du site.

## État par phase

| Phase | Objet | État |
|---|---|---|
| 0 | Figer l'état | ✅ baseline (211 tests au départ) |
| 1 | Corrections effectives dans le texte candidat | ✅ |
| 2 | Périmètre de travail (lot ≠ document) | ✅ |
| 3 | Reclassement des rôles par l'IA | ✅ |
| 4 | Validation ciblée sans fausse famille | ✅ (auto-application R0/R1 et échantillonnage extensible : **partiel**) |
| 5 | Blocages d'export proportionnés | ✅ |
| 6 | Retrait du tri IA du parcours | ✅ |
| 7 | Rebranchement des étapes (lot → livraison) | ✅ (interface à onglets du plan : **non faite**) |
| 8 | Tests unitaires + intégration | ✅ (intégration via faux fournisseur, sans CLI) |
| 9 | Pilote Basile en direct | **NON VÉRIFIÉ** — à exécuter par l'utilisateur (CLI d'abonnement + PDF) |
| 10 | Pilote étendu | **NON VÉRIFIÉ** — idem |
| 11 | Documentation / livraison | ✅ (ce rapport) |

## Modèle de données (ajouts)

- **`ligne.ocr0`** : OCR original, immuable (déjà posé à l'OCR). **`ligne.dip`** : état éditorial candidat courant, lu par TOUS les exports.
- **`ligne.corrections[]`** : historique par ligne — `{id, type, avant, apres, origine, modele, regle, statut, validation_humaine, annulee, date}`. Types : `correction_ocr`, `reclassement_role`.
- **`ligne.suggestion.role_confirme`** : rôle qui fait foi (vocabulaire de `structure.mjs`) ; `export_corps` recalculé.
- **`projet.perimetre = {pages:[…]}`** : le lot de travail (pages engagées), persisté.
- **finding `severite`** : `information | avertissement | critique | bloquant` (Phase 5).

## Fonctions centrales créées

- `src/corrections.mjs` — `appliquerCorrection`, `annulerCorrection`, `appliquerReclassement`, `annulerReclassement`, `appliquerGroupe`, `appliquerDansProjet`. Écrit `dip`/`role_confirme`, préserve `ocr0`, journalise, **détecte les conflits** (jamais d'écrasement silencieux), idempotent, annulable.
- `src/perimetre.mjs` — `completudeLot(lot, etats)` : spec pure de la complétude d'un lot (l'atelier en garde un miroir inline `lotPages`/`apresOcrWorkflow`).
- `src/ia/controle.mjs` — `controlerPageIA` (relecture par page), `interventionsDepuisRelecture` (corrections), `interventionsReclassement` (rôles).
- `src/ia/validation.mjs` — `aPayloadConcret` + `classerValidation` refondu (bacs `corrections` individuel, `avertissements`).

## Ce qui a changé, par sujet

- **Application / annulation / conflits** : une correction acceptée écrit `dip` (ex. `bommes`→`hommes`) ; `ocr0` jamais touché ; l'annulation restaure la valeur précédente ; une modification humaine passée entre-temps déclenche un **conflit** signalé, jamais écrasé.
- **Périmètre et progression** : l'étape « OCR local » affiche `lot X/Y · doc Z/589` ; « terminé » dès que le lot est complet (pages faites + exclues), « terminé avec erreurs » si des pages ont échoué, « en cours » sinon. Les vieux projets (sans périmètre) sont recalculés au chargement.
- **Actions structurelles de l'IA** : la relecture peut proposer `reclasser_role` (ornement, titre courant, folio, signature, réclame, bruit). Accepté → `role_confirme` posé, ligne exclue du corps exporté (TXT/MD/DOCX/SQL) mais **conservée en source** (ALTO/PAGE/JSON) ; texte et OCR intacts.
- **Suppression de `relecture_page` comme famille** : les corrections de texte et les reclassements sont des **objets individuels** relus un à un (avant → après, image en regard) ; les familles ne regroupent plus que des *flags* homogènes (confiance faible, page ignorable…).
- **Familles / cohortes / échantillonnage** : helpers `echantillonner` (les moins sûrs d'abord, étalés) et `regleEchantillonnage` (0/5 → accepter, 1 → étendre à 15, ≥2 → détaillé) présents. **Partiel** : ils ne pilotent pas encore l'auto-extension dans l'UI.
- **Politique de blocage** : une page courte (titre, faux-titre, fin de chapitre) est un **avertissement**, plus un blocage. État de livraison : `CANDIDAT_INCOMPLET` (pages du périmètre non traitées / blocage réel) · `FINAL_CANDIDAT_AVEC_RÉSERVES` (erreurs / avertissements / critiques) · `FINAL_CANDIDAT`.
- **Sort du tri IA** : bouton « Trier les pages (IA) » retiré du parcours principal (lent, source de coquilles). Fonction et endpoints laissés dormants. La détection des pages inutiles se fait après OCR (contrôle déterministe : garde, « Google », ornement).

## Résultats des tests

`node --test` → **235 tests, 0 échec**. Suites clés :
- `corrections.test.mjs` (11) — application, ocr0 intact, conflit, idempotence, annulation, groupe, reclassement.
- `perimetre.test.mjs` (5) — lot terminé sur 10/589, erreur ≠ en cours, exclusion, priorité.
- `validation.test.mjs` (10) — 41 corrections → 41 objets, aucune fausse famille, avertissements non bloquants.
- `controle.test.mjs` — relecture, reclassement, page courte = avertissement, coquilles hors contrôle.
- `generation.test.mjs` — états de livraison selon lot / réserves.
- `integration-pipeline.test.mjs` (1) — **bout en bout** : contrôle (faux fournisseur) → classement → application → export corrigé, ornement écarté, source intacte.

## Contenu des exports

Les exports lisent `dip` (état candidat) : une correction acceptée apparaît dans TXT / Markdown / DOCX / JSON / SQL. Les lignes reclassées hors-corps sont exclues du corps (via `estHorsCorpsConfirme`) mais restent dans ALTO / PAGE / JSON. L'OCR original (`ocr0`) est exporté comme champ d'origine dans les formats structurés.

## Absence d'écriture active — confirmé

Aucune fonction ajoutée n'écrit dans les tables du site (`oeuvres`, `segments`, `versets_*`). La Gueule ne produit que des **candidats** (statut `applique_candidate` ; le ground-truth exige une validation humaine explicite). Le seul accès Supabase reste l'enrichissement **en lecture seule** du catalogue (métadonnées). La clé `ANTHROPIC_API_KEY` est retirée de l'environnement du CLI (usage abonnement).

## Pilote Basile — procédure (à exécuter par l'utilisateur) — NON VÉRIFIÉ

1. Recharger le projet Basile → l'étape « OCR local » doit afficher `lot 10/10 · doc 10/589 · terminé` et « Contrôle IA » cliquable (plus de « 579 manquantes »).
2. « Contrôler l'OCR (IA) » → la validation liste les corrections **individuelles** (`bommes→hommes`, `seulemeni→seulement`…) et, le cas échéant, le reclassement du filet gravé en `ornement`.
3. Accepter quelques corrections + le reclassement → le texte se corrige à l'écran ; les pages courtes sont des avertissements, plus des blocages.
4. Exporter → vérifier que le texte livré porte les corrections et exclut l'ornement ; l'état de livraison est `FINAL_CANDIDAT_AVEC_RÉSERVES` (avertissements) ou `FINAL_CANDIDAT`.
5. Relever : nombre de corrections, appliquées, refusées, conflits ; clics nécessaires ; périmètre couvert.

## Limites et points non vérifiés

- **Pilotes Basile et étendu (Phases 9-10)** : NON VÉRIFIÉ — nécessitent le CLI d'abonnement et le PDF réel, hors de portée d'exécution automatique.
- **Auto-application R0/R1 sans clic et échantillonnage auto-extensible (Phase 4.3-4.4)** : helpers présents, non branchés dans le flux UI.
- **Interface à onglets (Critiques / Échantillons / Historique)** : l'UI reste un panneau déroulant unique.
- **Diagnostic local échantillonné en remplacement du tri IA (Phase 6.2)** : non ajouté ; on s'appuie sur la détection déterministe post-OCR.
- **Provider API (`anthropic`)** : la relecture par page passe des `messages` mais n'a pas été exécutée (le circuit réel est `claude-local`).
- **État Git** : hors du périmètre de vérification de cette session.
