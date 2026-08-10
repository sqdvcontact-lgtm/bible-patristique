# La Gueule

Atelier **local** d'OCR/HTR de Corpus Scriptura. Il océrise des **fac-similés** (imprimés anciens, manuscrits) et les transforme en **brouillons candidats** de transcription — jamais en texte validé. Il applique la doctrine de la charte, **§14 « OCR, HTR et transcription patrimoniale »** et **§31 « Atelier La Gueule »**, à chaque étape. **Aucune dépendance npm** (Node natif ≥ 20).

> Un moteur d'OCR ou de HTR produit un brouillon. Il ne produit jamais, à lui seul, un texte éditorial validé. Le fac-similé fait autorité. — *charte §14*

## Ce que fait (et ne fait pas)

- **Fait** : enrôler une source avec sa traçabilité (SHA-256, dimensions réelles) ; océriser par page ou par plage (Kraken/Tesseract via WSL) ; lire les métadonnées de la page de titre par IA et enrichir depuis le catalogue ; **relire chaque page par IA** et proposer des corrections + reclassements ; laisser l'humain valider les seuls cas ambigus ; exporter des **candidats** (JSON, DOCX, SQL, TXT, Markdown, ALTO, PAGE XML) + un jeu d'entraînement Kraken.
- **Ne fait pas** : décider de la lecture à ta place, corriger d'après une autre source ou le sens attendu, inventer une ligne ou une coordonnée, écrire dans les **tables actives** du site, moderniser une graphie. La sortie est toujours un **candidat** : l'OCR brut (`ocr0`) et le fac-similé restent immuables ; l'état éditorial courant (`dip`) est réversible et tracé.

## Le produit : l'atelier

Le cœur est **l'atelier de relecture** (`ui/atelier.html`), servi par `src/serve.mjs` sur `http://127.0.0.1:4599`, ouvert en fenêtre d'application. Volet gauche à onglets (Métadonnées / Prétraitement / Réglage OCR / **Contrôle** / Export), image cible au centre (boîtes ALTO), texte éditable à droite. Le pilotage du contrôle se fait dans l'onglet **Contrôle**.

**Lancement** : double-clic sur `redemarrer-la-gueule.bat` (tue le serveur sur 4599 et relance avec le bon fournisseur IA), ou le raccourci bureau, ou `npm run serve`. ⚠️ Recharger la page ≠ redémarrer le serveur (node détaché) : après une modif de code, redémarre le serveur PUIS recharge à fond (Ctrl+Maj+R). **Ctrl+S** enregistre le projet.

## Pipeline en 5 étapes

```
Diagnostic IA → OCR local → Contrôle IA → Validation ciblée → Génération locale
```

1. **Diagnostic IA** — métadonnées de la page de titre (Opus) + enrichissement catalogue (lecture seule) + choix du moteur (Tesseract vs Kraken-print, auto-détecté) + périmètre proposé.
2. **OCR local** — Kraken/Tesseract par page ou par plage ; sauvegarde après chaque page, reprise, relance des erreurs. Complétude mesurée sur le **lot** de travail, pas sur le document entier.
3. **Contrôle IA** — passe déterministe (confiance, doublons, pages inutiles) + **relecture IA par page** (corrections de texte + reclassements de rôle). Ne traite que les pages océrisées.
4. **Validation ciblée** — les corrections que l'IA juge « certaines » sont appliquées automatiquement ; seuls les cas ambigus (réécriture, reclassement, risque élevé) sont soumis ; familles de flags par échantillonnage. Page courte = avertissement, pas blocage.
5. **Génération locale** — exports déterministes de l'état candidat ; aucune IA. État de livraison : `FINAL_CANDIDAT` / `…AVEC_RÉSERVES` / `CANDIDAT_INCOMPLET`.

## Architecture (modules `src/`)

- **OCR & données** : `wsl.mjs` (pont Node→WSL, OCR), `alto.mjs` (parse ALTO), `projet.mjs` (segments, exports, persistance), `metadonnees.mjs` (parseur + typographie), `notes.mjs`, `bilingue.mjs`, `colonnes.mjs`, `typographie.mjs`.
- **Structure éditoriale** : `structure.mjs` (rôles, lettrines, titres courants, folios, signatures, réclames, poésie, hors-corps).
- **Exports** : `zip.mjs`, `docx.mjs`, `sql.mjs`, `texte.mjs` (TXT/MD), `echange.mjs` (ALTO/PAGE).
- **Correction & workflow** : `corrections.mjs` (appliquer/annuler/reclasser, conflits), `perimetre.mjs`, `workflow.mjs`.
- **IA** (`src/ia/`) : `fournisseur.mjs` (abstraction), `claude-local.mjs` (CLI abonnement), `claude.mjs` (API, squelette), `mock.mjs`, `prompt.mjs`, `controle.mjs` (contrôle + relecture par page), `validation.mjs` (validation ciblée), `generation.mjs`, `enrichissement.mjs` (catalogue Supabase, lecture seule), `diagnostic.mjs`, `crop.mjs`, `consentement.mjs`.
- **Serveur & CLI** : `serve.mjs` (HTTP, endpoints ; écoute **127.0.0.1 seulement** + garde Host/Origin), `bin/gueule.mjs` (`serve` / `doctor` / `nettoyer`), `runner.mjs` (sondes hôte du doctor).
- **Évaluation** : `modeles.mjs` (CER/WER, registre versionné) + `bancs/`.

## Moteurs & IA

- **WSL2 + Ubuntu** héberge **Kraken** (manuscrits : CATMuS Medieval ; imprimés anciens à ſ long : CATMuS-Print) et **Tesseract** (imprimé moderne), + poppler + ImageMagick. Installation : `scripts/installer-wsl.sh`. Sans WSL, La Gueule tourne en fournisseur **mock** (le pipeline et les contrôles s'exécutent à vide).
- **IA sur ABONNEMENT** : le fournisseur `claude-local` pilote le **CLI Claude Code local** (`claude -p`) authentifié par abonnement — **jamais l'API payante**. ⚠️ `ANTHROPIC_API_KEY` doit rester **hors** de l'environnement du CLI (sinon « Credit balance is too low ») ; La Gueule la retire (`envSansCleApi`). Modèles : Opus (lecture), Sonnet (relecture/contrôle), Haiku (diagnostic léger — jamais pour lire).

## Doctrine & sécurité

Couche **candidate** uniquement ; jamais d'écriture dans les tables actives (`oeuvres`, `segments`, `versets_*`). Le ground-truth exige une validation humaine explicite. Graphie diplomatique conservée (ſ, u/v, i/j). Serveur local (127.0.0.1) + garde Host/Origin (anti DNS-rebinding). Aucun appel cloud sans consentement enregistré. `SUPABASE_SERVICE_ROLE_KEY` lue du `.env.local` en lecture seule, jamais journalisée ni exportée.

## Tests

- **`npm test`** = `node --test` : suites unitaires (`test/*.test.mjs`) sur la logique pure — OCR/ALTO, structure, corrections/annulation/reclassement, périmètre, validation, génération, exports, fournisseurs IA (mock), plus **`test/integration-pipeline.test.mjs`** (pipeline **en processus**, avec un faux fournisseur : contrôle → classement → application → export corrigé, source intacte). Rapide, sans réseau ni WSL.
- **`npm run test:integration`** = `integration/integration.itest.mjs` : test d'intégration **du serveur** (démarre `serve`, exerce les endpoints, vérifie les gardes réseau et la doctrine « aucun client de base active dans `src/` »). Les deux suites sont **complémentaires** : l'une valide la logique du pipeline en isolation, l'autre le serveur réel et ses invariants de sécurité.

Rien de ce qui est produit ici n'entre dans l'actif sans relecture humaine.
