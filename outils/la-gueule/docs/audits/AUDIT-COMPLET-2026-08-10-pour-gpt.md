# Audit complet — La Gueule (atelier OCR/HTR de Corpus Scriptura)

*État au 2026-08-10. Document autoportant, destiné à GPT. Objet : décrire exhaustivement le logiciel — architecture, fonctions, doctrine, tests, dette, limites — pour préparer la suite. 240 tests unitaires verts.*

---

## 1. Finalité et principe

**La Gueule** est un outil **local** (poste Windows de l'auteur, hors du site) qui océrise des imprimés anciens et des manuscrits pour alimenter le corpus patristique de Corpus Scriptura (site Next.js + Supabase, séparé). Il **mobilise** Kraken (HTR/OCR) et Tesseract via WSL, plus une IA de vision, sous une doctrine stricte : **il ne produit que des candidats, jamais de la donnée validée**. Le fac-similé et l'OCR brut sont immuables ; toute intervention vit dans une couche candidate tracée, réversible, exportable. **Zéro dépendance npm** (Node natif : `node:http`, `child_process`, `crypto`, `fs`, `fetch`).

Le produit central est **l'atelier de relecture** (`ui/atelier.html`, servi par `src/serve.mjs` sur `http://127.0.0.1:4599`, ouvert en fenêtre d'application Chrome). Le CLI (`bin/gueule.mjs`) ne fait que lancer le serveur (`serve`), diagnostiquer l'environnement (`doctor`) ou nettoyer (`nettoyer`).

---

## 2. Environnement d'exécution (persiste entre sessions)

- **WSL2 + Ubuntu 24.04**, utilisateur root, 16 cœurs. **Kraken 7.1** (`/opt/la-gueule/venv`), **Tesseract 5.3.4** (+fra +lat), poppler (pdftoppm/pdfinfo), ImageMagick. Installés par `scripts/installer-wsl.sh`.
- **Modèles Kraken** : CATMuS Medieval (manuscrits médiévaux), **CATMuS-Print** (`catmus-print-fondue-large.mlmodel`, imprimés anciens à s long ſ).
- **Ponts Windows→WSL délicats** : les espaces de `C:\Corpus Scriptura` cassent le quoting ; la solution robuste est de passer chaque chemin en **variable d'environnement listée dans `WSLENV=VAR/p`** (WSL traduit en `/mnt/…`). `/mnt/c` est lent (9p) → Kraken lit/écrit en natif `/root` puis recopie. Forcer `WSL_UTF8=1`.
- **Fragilité WSL** : après veille/pression mémoire, WSL peut planter (`E_UNEXPECTED`) → fausse bannière « Outils manquants » + OCR qui échoue en ~1 s. Remède : `wsl --shutdown`.
- **IA sur ABONNEMENT, pas l'API payante** : le fournisseur `claude-local` pilote le **CLI Claude Code local** (`claude -p --output-format json --allowedTools Read`, image lue par CHEMIN) authentifié par `claude setup-token` sur le compte Pro. ⚠️ **`ANTHROPIC_API_KEY` court-circuite l'abonnement** (le CLI l'utilise en priorité → « Credit balance is too low ») : le provider la retire de l'environnement du CLI (`envSansCleApi`).
- **Modèles IA** : `LG_AI_MODEL_VISION` = Opus (lecture de page de titre, tri) ; `LG_AI_MODEL_CONTROLE` = Sonnet (relecture/contrôle) ; `LG_AI_MODEL_DIAGNOSTIC` = Haiku (jamais pour lire).
- **Redémarrage — PIÈGE** : recharger la page ≠ redémarrer le serveur (node détaché sur 4599 garde l'ancien code). `redemarrer-la-gueule.bat` tue le process du port et relance avec les bons `LG_AI_*` et `ANTHROPIC_API_KEY` vidée. Un onglet déjà ouvert doit être **rechargé à fond (Ctrl+Maj+R)** après un redémarrage serveur.

---

## 3. Architecture — inventaire des modules

Racine : `outils/la-gueule/`. `src/` = logique ; `src/ia/` = tout ce qui touche l'IA ; `ui/` = interface ; `test/` = tests `node:test` ; `bin/` = CLI ; `bancs/` = évaluation modèles ; `integration/` = test d'intégration serveur.

### 3.1 Noyau OCR & données

| Fichier | LOC | Rôle |
|---|---|---|
| `src/wsl.mjs` | 263 | Pont Node→WSL. `runBash(script, envVars, {timeoutMs})` (spawn async, WSLENV), `ocrPage`, `rendrePage`, `rendrePlanches`, `pdfNbPages`, `pdfInfo`, `choisirFichier`, `annulerTaches`. Validation stricte des paramètres (entiers bornés, langues en liste blanche, modèle `.mlmodel`) — anti-injection shell. |
| `src/alto.mjs` | 43 | `parseAlto` : ALTO → lignes {texte, bbox [x0,y0,x1,y1], confiance WC}, exclut `<Glyph>`, décode entités. Analyseur ALTO UNIQUE (partagé). |
| `src/projet.mjs` | 490 | Cœur : `construireSegments` (lignes→segments, applique structure `ref_niv`, colonnes, hors-corps, notes), `grouperParagraphes`, `joindreLignes`, exports (`exporterTout`, `exporterSegments`, `exporterEntrainement`, `exporterPagesXml`, `exporterBanc`), persistance projet (`sauvegarderProjet`/`chargerProjet`/`listerProjets`), ALTO d'entraînement, provenance §14. |
| `src/metadonnees.mjs` | 188 | `parserMetadonnees` (parseur hors-ligne : titre, auteur, traducteur, éditeur, ville, dates romaines, langues), helpers de casse (`normaliserCasseChamp`, `casseTitre`, `casseNominale`), `typographieProbable` (auto-détection Tesseract vs Kraken-print par livre), `titreSansAuteur`. |
| `src/notes.mjs` | 38 | `recenserReferences` : références bibliques entre parenthèses DANS le texte → appels `[[N]]` (compteur global) + champ `notes`. Ne normalise pas la graphie. |
| `src/bilingue.mjs` | 74 | `detecterLangue` (fr/la), `numeroSection`, `apparierParagraphes` (résync par n° de section, repli sur l'ordre). |
| `src/colonnes.mjs` | 63 | `detecterColonnes`/`segmenterColonnes` (double colonne type Migne ; gouttière centrale). Mono-colonne = comportement inchangé. |
| `src/typographie.mjs` | 39 | Normalisation d'espaces (partagé avec le site). |

### 3.2 Structure éditoriale (le plus gros module)

| Fichier | LOC | Rôle |
|---|---|---|
| `src/structure.mjs` | 861 | Détection structurelle : `ROLES`, `annotationVide`, lettrines (`detecterLettrines`, `corrigerLettrine`, `integrerInitiale`), titres courants (`detecterTitresCourants`), numéros de page/folios (`detecterNumeroPage`, `detecterFoliosVolume`), signatures (`detecterSignature`), réclames (`detecterReclames`), régions de titre/ornement (`detecterRegionTitre`), poésie (`analyserBlocPoesie`, `classerBlancsPoesie`, `annoterPoemes`), niveaux de titre (`suggererNiveauTitre`). **`ROLES_HORS_CORPS`** + **`estHorsCorpsConfirme`** (utilisé par les exports pour écarter du corps). `annoterProjet`, `extraireStructure`, `metadonneesPagesProjet`, `registrePoemesProjet`. |

### 3.3 Exports

| Fichier | LOC | Rôle |
|---|---|---|
| `src/zip.mjs` | 87 | ZIP (CRC-32, méthode STORE) sans dépendance. |
| `src/docx.mjs` | 96 | `construireDocx` : OOXML (styles Title/Subtitle/Heading1-5 avec outlineLvl, Normal, Original, Apparat, Note). |
| `src/sql.mjs` | 67 | `construireSqlSupabase` : `begin/commit`, upsert `oeuvres`, insert `segments` (schéma réel, id identité omis, `marquage_source`), en-tête « CANDIDAT à relire ». |
| `src/texte.mjs` | 98 | `construireTexte` (TXT) + `construireMarkdown` (titres selon `ref_niv`). |
| `src/echange.mjs` | 104 | `altoPage` (ALTO v4) + `pageXml` (PAGE PRImA 2019) — formats d'échange eScriptorium/Transkribus. |

### 3.4 Modèles & évaluation

| Fichier | LOC | Rôle |
|---|---|---|
| `src/modeles.mjs` | 175 | `distanceEdition` (Levenshtein), `tauxErreur` (CER/WER), `evaluerModele`, `comparerQualite` (n'adopte que si CER nettement plus bas), registre de modèles versionné. |
| `bancs/*` | — | Scripts d'évaluation (banc socle, diff, pilote Kraken v2). `modeles/registre.json` versionné. |

### 3.5 IA (`src/ia/`)

| Fichier | LOC | Rôle |
|---|---|---|
| `fournisseur.mjs` | 66 | Abstraction : `choisirFournisseur(env)` (claude-local / anthropic / mock), `appelerIA(fournisseur, tache, charge, opts)` (validation de schéma, cache, ne lève jamais), `validerSortieIA`. |
| `claude-local.mjs` | 161 | Provider CLI abonnement. Méthodes : `diagnostiquer` (métadonnées), `triage` (tri de planches), `relecturePage` (relecture par page → corrections + classifications). `envSansCleApi`, spawn via `cmd.exe /c` sur Windows. |
| `claude.mjs` | 62 | Provider API (clé + crédits) — squelette, non utilisé en pratique (le circuit réel est local). |
| `mock.mjs` | 30 | Provider hors-ligne (s'abstient). Utilisé par les tests. |
| `prompt.mjs` | 201 | Tous les prompts versionnés : `SYSTEME` (diplomatique), `SYSTEME_META` (catalographe), `consigneMetadonnees`, `consigneTriage`, **`consigneRelecturePage`** (corrections + `certitude` + classifications), `messagesLettrine`/`messagesCorrection`/`messagesRelecturePage`. |
| `controle.mjs` | 264 | Contrôle. `controlerDeterministe` (confiance faible, vides, doublons, charabia, pages ignorables ; **ne traite que les pages ayant des `lignes`**), `ligneCharabia`, `pageIgnorable`, `intervention` (schéma provenance §15), `niveauRisque` (R0-R4), **`controlerPageIA`** (relecture par page), **`interventionsDepuisRelecture`** (corrections + `certitude`), **`interventionsReclassement`** (rôles). |
| `validation.mjs` | 158 | Validation ciblée. `classerValidation` (buckets : `auto_texte`, `corrections`, `critiques`, `familles`, `avertissements`, `blocages`, `non_resolus`, `automatiques`), `aPayloadConcret`, `distanceEdition`, `estCorrectionSimple`, **`estAutoApplicable`** (verdict IA prioritaire + garde-fou), `grouperFamilles`, `echantillonner`, `regleEchantillonnage`, `admissibleGroundTruth`. |
| `generation.mjs` | 49 | `etatLivraison(validation, lot)` (`FINAL_CANDIDAT` / `…AVEC_RESERVES` / `CANDIDAT_INCOMPLET`), `rapportGeneration` (provenance + périmètre). |
| `enrichissement.mjs` | 155 | Enrichissement métadonnées depuis Supabase (lecture seule). `enrichirDepuisBase` (œuvre d'abord via `choisirOeuvre` resserré, auteur dérivé de l'id_auteur de l'œuvre), `choisirAuteur`, `langueDeTitre`, `parserEnv`. |
| `diagnostic.mjs` | 69 | `pagesEchantillon` (échantillon représentatif, jamais tout le livre), `construireProfil`, `regimePourPage`, `pageAnormale`. |
| `crop.mjs` | 58 | `cropBase64`, `cheminPngDepuisUrl`, `pdfPageBase64`, `imageFichierBase64`. |
| `consentement.mjs` | 46 | `etatFournisseur`, `lireConsentement`/`ecrireConsentement`, `consentementActif` (consentement cloud §14.6, lié au fournisseur). |

### 3.6 Correction & périmètre (chantier 2026-08-10)

| Fichier | LOC | Rôle |
|---|---|---|
| `src/corrections.mjs` | 142 | Matérialise les corrections dans le texte candidat. `appliquerCorrection` (écrit `dip`, préserve `ocr0`, journalise, détecte le CONFLIT jamais écrasé, idempotent), `annulerCorrection`, **`appliquerReclassement`**/`annulerReclassement` (pose `role_confirme`, recalcule `export_corps`), `appliquerGroupe`, `appliquerDansProjet`, `entreeCorrection`. |
| `src/perimetre.mjs` | 23 | `completudeLot(lot, etats)` : complétude du lot de travail (spec pure ; l'atelier en a un miroir inline). |
| `src/workflow.mjs` | 82 | Modèle d'état du parcours 5 étapes (`ETAPES`, `ETATS`, `assurerWorkflow`, `majEtape`, `invaliderDependances`). Utilisé par `projet.mjs`. |

### 3.7 Serveur, CLI, orphelins

| Fichier | LOC | Rôle |
|---|---|---|
| `src/serve.mjs` | 495 | Serveur HTTP + tous les endpoints. Écoute **127.0.0.1 seulement** + garde **Host/Origin** (anti DNS-rebinding, `HOTES_OK`). |
| `src/runner.mjs` | 22 | `executer` (spawn hôte Windows) — sondes du doctor uniquement. |
| `bin/gueule.mjs` | 108 | CLI : `serve`, `doctor`, `nettoyer`. |
| `src/vision.mjs` | 72 | **CODE MORT** : contrat d'un lecteur de vision (passe 3), **importé nulle part** (superseded par `src/ia/`). À supprimer. |

---

## 4. Endpoints du serveur (`src/serve.mjs`)

- **Diagnostic/fichiers** : `GET /api/doctor` (sonde WSL/Kraken/Tesseract), `GET /api/pdf-info`, `GET /api/fichier?path=` (sert une image locale), `POST /api/televerser?nom=` (upload dans `incoming/`, PDF+images), `GET /api/choisir-fichier` (PowerShell, plus appelé), `POST /api/apercu` (rend une page sans OCR).
- **OCR** : `POST /api/atelier/ocr`, `POST /api/atelier/ocr-bilingue`, `POST /api/atelier/comparer` (A/B prétraitement), `POST /api/atelier/analyser`, `POST /api/atelier/stop` (annule les tâches WSL).
- **Métadonnées** : `POST /api/metadonnees` (parseur + typographie), `POST /api/ia/metadonnees` (lecture IA page de titre + enrichissement + connaissance).
- **Tri (obsolète)** : `POST /api/ia/planches`, `POST /api/ia/triage-planche` (le bouton UI a été retiré ; endpoints dormants).
- **Contrôle & validation** : `POST /api/ia/controle` (déterministe + relecture par page), `POST /api/ia/validation` (`classerValidation`), `POST /api/ia/generation` (état de livraison + rapport), `GET /api/ia/etat` + `POST /api/ia/consentement` (§14.6), `POST /api/ia/profil/save`.
- **Projet & exports** : `POST /api/projet/{save,load}`, `GET /api/projet/list`, `POST /api/export` (JSON+DOCX+SQL+TXT+MD), `POST /api/export/segments`, `POST /api/export/xml` (ALTO+PAGE), `POST /api/export/entrainement`, `POST /api/export/banc`.
- `GET /` : l'atelier.

---

## 5. Le pipeline en 5 étapes (état réel)

`Diagnostic IA → OCR local → Contrôle IA → Validation ciblée → Génération locale` (modèle d'état `workflow.mjs`, persisté, invalidation de l'aval).

1. **Diagnostic IA** — au dépôt : `pdf-info` + lecture de la page de titre (Opus) + sonde de typographie (choix Tesseract/Kraken-print par livre) + enrichissement catalogue. Métadonnées candidates (3 niveaux : page ambre > catalogue bleu > connaissance du modèle violet).
2. **OCR local** — Kraken/Tesseract par page ou par plage, persistance après chaque page, reprise auto, relance des erreurs. **Complétude mesurée sur le LOT** (périmètre), pas sur le PDF entier.
3. **Contrôle IA** — passe déterministe (locale) + **relecture IA par page** (relit l'image, propose corrections de texte + reclassements). Ne traite que les pages océrisées.
4. **Validation ciblée** — corrections **individuelles** (plus de fausse famille) ; **auto-application** des corrections que l'IA juge « certaines » (verdict + garde-fou), seul l'ambigu est soumis à l'humain. Familles de flags par échantillonnage. Piloté depuis l'**onglet « Contrôle » du volet gauche** (le grand bandeau du haut est masqué).
5. **Génération locale** — exports déterministes de l'état candidat, aucune IA. État de livraison lié au périmètre.

---

## 6. Fonctionnalités détaillées

### 6.1 OCR
Deux moteurs : Tesseract (imprimé moderne, rapide) et Kraken (manuscrits + imprimé ancien à ſ long, sortie diplomatique). Auto-détection par livre (le signal du ſ est dans le CORPS, pas la page de titre en capitales). GPU Kraken avec repli CPU (gain ~14 %). Prétraitement ImageMagick expérimental (OFF par défaut, drapeaux fixes, comparaison A/B). Bilingue (pages en regard fr/la). Double colonne (Migne).

### 6.2 Métadonnées + enrichissement
Lecture IA de la page de titre (Opus), champs = colonnes exactes de `oeuvres`. Enrichissement « base d'abord » : `choisirOeuvre` **resserré** (≥ 2 jetons communs + recouvrement ≥ 50 % — évite le faux appariement « Homélies… » → « Hexaéméron »), auteur dérivé de l'`id_auteur` de l'œuvre trouvée (lève l'homonymie « Basile »). **Sous-titre = celui de la PAGE** (jamais écrasé par le catalogue). **Genre au format base** : minuscule, plusieurs genres séparés par «  ; ». Casse charte garantie par normalisation déterministe serveur.

### 6.3 Structure
Détection et confirmation humaine des rôles (lettrines, titres courants, folios, signatures, réclames, ornements, poésie, niveaux de titre). `role_confirme` fait foi ; `ROLES_HORS_CORPS` exclus du corps mais gardés en source.

### 6.4 Contrôle → correction → export (chantier majeur 2026-08-10)
Modèle de ligne : `ocr0` (immuable) / `dip` (candidat courant, lu par les exports) / `corrections[]` (historique) / `suggestion.role_confirme`. **Corrections effectives** (accepter écrit `dip`), **conflit jamais écrasé**, **annulation**. **Périmètre de travail** (lot ≠ document). **Reclassement** (ligne non-textuelle → hors-corps, conservée en source). **Validation ciblée** avec **auto-application selon le verdict de l'IA** (`certitude` « certaine »/« incertaine ») + garde-fou distance ; repli déterministe si pas de verdict. **Onglet « Contrôle »** = seule surface (badge du nb à faire, avant→après, Valider/Refuser/Voir, navigation au clic, « ✓ N appliquées automatiquement — revoir »).

### 6.5 Exports
JSON (format `segments`), DOCX (sans dépendance), SQL Supabase (candidat à relire), TXT, Markdown, ALTO v4 + PAGE XML, **jeu d'entraînement Kraken** (images + ALTO corrigé + manifeste), **banc d'essai** (évaluation seule). Tous portent la provenance §14 (SHA-256, moteur, modèle, statut CANDIDAT). Les exports lisent `dip` et honorent `estHorsCorpsConfirme`.

---

## 7. Doctrine et sécurité

- **Couche candidate uniquement** : jamais d'écriture dans les tables actives du site (`oeuvres`, `segments`, `versets_*`). Candidat ≠ ground-truth ; le ground-truth exige une validation humaine explicite (§11.7). Ne rien inventer.
- **Immutabilité** : fac-similé + OCR brut (`ocr0`) jamais touchés ; graphie diplomatique conservée (ſ, u/v, i/j) ; aucune modernisation automatique.
- **Réseau** : serveur **127.0.0.1 seulement** + garde Host/Origin (anti DNS-rebinding). Aucun appel cloud sans **consentement** enregistré vérifié côté serveur.
- **Secrets** : `ANTHROPIC_API_KEY` retirée de l'environnement du CLI (`envSansCleApi`) ; `SUPABASE_SERVICE_ROLE_KEY` lue du `.env.local` en **lecture seule**, jamais journalisée ni exportée. Aucun secret dans les sorties.
- **Traçabilité §15** : chaque intervention porte avant/après, provenance (modèle, règle), statut, risque R0-R4, `interdit_entrainement`.
- **Fichiers du bureau OneDrive** copiés dans `incoming/` avant traitement (charte §2.3).
- Consigné : **charte Supabase §31** (+ sauvegarde `charte_ia_sauvegarde_20260810`), `AGENTS.md`, mémoire projet.

---

## 8. Tests

**240 tests `node:test`, tous verts** (`npm test`). Suites : `alto`, `bilingue`, `colonnes`, `controle` (17), `corrections` (11), `echange`, `enrichissement` (7), `export`, `generation`, `ia` (providers/mock), `integration-pipeline` (bout en bout avec faux fournisseur : contrôle → classement → application → export corrigé, source intacte), `metadonnees`, `modeles`, `notes`, `passe3`, `perimetre` (5), `poeme`, `projet`, `structure`, `texte`, `typographie`, `validation` (13), `workflow`, `wsl`. Un **test d'intégration serveur** séparé (`integration/integration.itest.mjs`, `npm run test:integration`) démarre le serveur et exerce les endpoints.

---

## 9. Interface (`ui/atelier.html`, 1431 lignes, monofichier sans import)

Volet gauche à onglets (**Métadonnées / Prétraitement / Réglage OCR / Contrôle / Export**) | image cible au centre (boîtes ALTO superposées) | texte éditable à droite (rôle par ligne via `<select>`, césures, incertitude, lettrines). Barre d'étapes en haut (5 blocs colorés, `lot X/Y · doc Z/total`). **Onglet Contrôle** = pilotage unique de la validation. Le monofichier **duplique en miroir** plusieurs fonctions pures du serveur (`appliquerCorrectionClient`, `appliquerReclassementClient`, `pageAnormaleClient`, `estEnteteC`) — pattern assumé (pas d'import possible) mais **source de divergence potentielle**.

---

## 10. Dette technique et risques (à traiter)

1. **Code mort** : `src/vision.mjs` (contrat de vision non branché, superseded par `src/ia/`) — à supprimer.
2. **Prolifération de docs** : 16 fichiers `.md` à la racine, dont beaucoup d'artefacts historiques (`POUR-CODEX`, `POUR-GPT-*`, `RAPPORT_STRUCTURE_BOECE_*`, `FINAL_REPORT_P9_P15`, `RAPPORT_PIPELINE_IA_5_ETAPES`, `CONSIGNES-CODEX-*`). À archiver dans un sous-dossier `docs/` et n'en garder qu'un canonique.
3. **Miroirs client/serveur** : la logique pure (corrections, reclassement, page anormale, entête) existe en double — une fois testée dans `src/`, une fois recopiée dans `atelier.html`. Risque de dérive. Piste : bundler `src/*` vers un `ui/lib.js` généré, ou exposer un endpoint qui applique.
4. **Endpoints dormants** : `/api/ia/planches` et `/api/ia/triage-planche` (tri IA retiré du parcours) restent exposés.
5. **Heuristiques fragiles** : détection d'ornement (le bandeau « SARA AE ASIA » n'est pas capté par `ligneCharabia`) ; auto-détection de typographie ; entêtes/folios — tous conservateurs mais faillibles. Le reclassement dépend soit du menu par ligne, soit de la proposition IA.
6. **Deux voies de test d'intégration** (`integration/*.itest.mjs` vs `test/integration-pipeline.test.mjs`) — clarifier laquelle est canonique.
7. **Robustesse WSL** : plantages après veille ; pas de reprise automatique (bannière + `wsl --shutdown` manuel).
8. **Pas d'authentification** sur le serveur local (mitigé par 127.0.0.1 + garde Host/Origin) — acceptable pour un outil mono-utilisateur, à ne pas exposer.
9. **Un seul document = un seul serveur** : pas de multi-projets concurrents ; le port 4599 est unique.

---

## 11. Points NON VÉRIFIÉ / limites connues

- **Pilotes Basile / étendu en direct** : exigent le CLI d'abonnement + le vrai PDF ; non exécutés automatiquement (le harnais de tests utilise un faux fournisseur).
- **Échantillonnage auto-extensible** (0/5 → accepter, 1 → étendre à 15) : helpers présents (`echantillonner`, `regleEchantillonnage`) mais non branchés dans le flux UI.
- **Interface à onglets Critiques/Échantillons/Historique** : non faite (un seul onglet Contrôle déroulant).
- **Auto-application R0/R1** générique : seules les corrections de TEXTE sont auto-appliquées ; les flags déterministes restent en familles.
- **Reclassements structurels** : toujours soumis à l'humain (pas d'auto-application), même si l'IA est confiante.
- **Notes en bas de page** (vraies footnotes par zone/petite fonte) : non détectées (faute d'édition-échantillon).
- **Provider API (`anthropic`)** : squelette non exercé (le circuit réel est `claude-local`).
- **Détection automatique conservatrice des bandeaux d'ornement** : proposée, pas encore posée.

---

## 12. Axes de réflexion pour la suite (questions ouvertes)

1. **Réduire encore la charge humaine** : faut-il aussi laisser l'IA juger les **reclassements** (auto-appliquer un « ornement » certain) ? Étendre le verdict `certitude` aux classifications ?
2. **Fiabilité du verdict IA** : calibrer/mesurer le taux d'auto-application correcte sur un vrai lot (le seuil et le garde-fou distance sont réglables). Prévoir un **contrôle par sondage** systématique des auto-appliquées.
3. **Suppression de la dette** : retirer `vision.mjs`, ranger les docs, régler la duplication client/serveur.
4. **Traitement à l'échelle** : mode **batch Kraken** (amortir le démarrage du process sur N pages — vrai levier de perf, cf. bench), traitement par tranches guidé par le périmètre.
5. **Détection d'ornements/bandeaux** : heuristique déterministe conservatrice (capitales + mot répété + tête de page) en complément de l'IA.
6. **Notes de bas de page** par zone géométrique.
7. **Empaquetage** : `.exe` Tauri (WebView2 présent ; manque toolchain Rust/MSVC).

---

*Fin de l'audit. Fichiers de référence : `../rapports/RAPPORT_CORRECTION_PIPELINE_LA_GUEULE.md` (livraison du dernier chantier), `../guides/ENTRAINEMENT.md` (boucle de fine-tuning), charte Supabase §14 et §31.*
