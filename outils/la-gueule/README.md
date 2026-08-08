# La Gueule

Petit orchestrateur **maison** d'OCR/HTR de Corpus Scriptura. Il *mobilise* Kraken (et Tesseract, poppler, ImageMagick…) pour transformer des **fac-similés** en **brouillons** de transcription — jamais en texte validé. Il applique la doctrine de la charte, section **§14 « OCR, HTR et transcription patrimoniale »**, à chaque étape.

> Un moteur d'OCR ou de HTR produit un brouillon. Il ne produit jamais, à lui seul, un texte éditorial validé. Le fac-similé fait autorité. — *charte §14*

## Ce que fait (et ne fait pas) La Gueule

- **Fait** : enrôler une source avec sa traçabilité (empreinte SHA-256, dimensions réelles, cote, bornes) ; lancer un moteur ; assembler un brouillon structuré (feuillet / face / colonne / ligne) ; appliquer les **contrôles** de la doctrine ; empaqueter un **candidat**.
- **Ne fait pas** : décider de la lecture, corriger d'après une autre Bible ou le sens attendu, inventer une ligne ou une coordonnée, écrire dans le TEI **actif**, fabriquer une graphie modernisée. Ces interdits sont inscrits dans le code (`src/config.mjs`) et rappelés à l'exécution.

## Pipeline

```
ingest → segment → recognize → assemble → control → package
```

1. **ingest** — empreinte + dimensions + cote/URL + bornes (§14.2).
2. **segment** — Kraken repère régions et lignes → coordonnées **réelles** du témoin.
3. **recognize** — Kraken/Tesseract → brouillon ligne à ligne.
4. **assemble** — brouillon structuré, avec `unclear`/`gap` là où le moteur doute (§14.5).
5. **control** — comptages réconciliés (feuillets ≠ faces ≠ colonnes ≠ lignes), compteurs `unclear`/`gap`, sondages répartis, alerte « relecture invraisemblable » (§14.8-14.10).
6. **package** — **candidat** + manifeste + empreintes ; jamais l'actif (§14.9).

## Architecture

- `bin/gueule.mjs` — la CLI (`run`, `control`, `ingest`, `doctor`).
- `src/pipeline.mjs` — l'enchaînement des étapes ; sortie en candidat.
- `src/engines.mjs` — les moteurs derrière une même interface : `mock` (simulation), `kraken`, `tesseract`.
- `src/runner.mjs` — exécute le moteur là où il vit : `local`, `wsl` (Windows → Linux), `docker`.
- `src/trace.mjs` — empreintes, dimensions d'image (PNG/JPEG, sans dépendance), manifestes.
- `src/control.mjs` — les contrôles de la doctrine.
- `src/draft.mjs` — le modèle de brouillon (calqué sur `bible_source_*`).

Aucune dépendance : Node ≥ 20 suffit (Node 24 présent). Les moteurs, eux, sont externes.

## Prérequis pour les moteurs réels (tout est gratuit)

Kraken est écrit en Python et vise Linux/macOS. Sous Windows, on l'héberge dans **WSL2 + Ubuntu** (gratuit) :

```bash
# Côté Windows (PowerShell admin, une fois — nécessite un redémarrage) :
wsl --install

# Puis dans Ubuntu :
pipx install kraken        # ou : python -m venv .venv && . .venv/bin/activate && pip install kraken
sudo apt install -y tesseract-ocr tesseract-ocr-fra poppler-utils imagemagick
# Récupérer un modèle de reconnaissance (.mlmodel) adapté au témoin.
```

Sans rien installer, La Gueule tourne en moteur **`mock`** : le pipeline, la traçabilité et les contrôles s'exécutent à vide.

## Usage

```bash
cd outils/la-gueule

# Diagnostiquer l'environnement :
node bin/gueule.mjs doctor

# Démo à vide (moteur mock) :
npm run demo

# Traçabilité seule d'un lot d'images :
node bin/gueule.mjs ingest ../../public/manuscrits/bible-899/f057r_a.png

# Pipeline réel (une fois Kraken installé dans WSL) :
node bin/gueule.mjs run f057r_a.png \
  --kind manuscrit --source bible-899 --feuillet 57 --face r \
  --engine kraken --runner wsl --model modele.mlmodel --out sorties/bible-899
```

## Feuille de route

- **v0 (ici)** : charpente, moteur `mock`, traçabilité, contrôles, sortie candidate.
- **v1** : brancher Kraken via WSL (segmentation + reconnaissance), parseur ALTO/PageXML complet.
- **v2** : atelier de relecture (image ⇄ brouillon, encodage `unclear`/`gap`/`abbr`), passerelle vers les couches candidates du modèle éditorial.
- **v3** : entraînement de modèles (`ketos`) sur les mains d'écriture du corpus.

Rien de ce qui est produit ici n'entre dans l'actif sans relecture humaine.
