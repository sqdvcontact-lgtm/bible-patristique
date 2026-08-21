# Banc d'essai — Boèce, Ceriziers 1646 (v1)

**Usage : ÉVALUATION seulement. Jamais d'entraînement.** (`interdit_entrainement`)

Ce banc sert à mesurer la qualité des modèles OCR/HTR (CER/WER) sur des pages
**validées à la main**. Il ne doit jamais servir à entraîner un modèle (sinon on
mesurerait un modèle sur ses propres données d'entraînement — mesure faussée).

## Les trois états de chaque ligne

1. **`ocr_brut`** — sortie du moteur, non touchée (`ocr0`).
2. **`corrige`** — le texte a été corrigé à la main (`dip`), mais pas encore validé.
3. **`valide_humain`** — un humain a relu et **validé** la ligne (`valide_humain = true`).

**Seules les lignes `valide_humain` (hors « incertaines ») entrent dans le banc.**
Une correction automatique n'est PAS une validation humaine.

## Parcours dans l'atelier (http://127.0.0.1:4599/atelier.html)

1. Ouvrir le projet **`banc-boece-ceriziers-1646-test-v1`** (menu « Projets »).
   Il contient déjà l'**OCR brut** des 12 pages (socle Kraken CATMuS-Print).
2. Pour chaque page : comparer l'image (à gauche) et le texte (à droite),
   **corriger chaque ligne** fautive.
3. Une lecture douteuse : cliquer **⚠** sur la ligne (« lecture incertaine ») —
   elle sera **exclue** du banc tant qu'elle n'est pas tranchée.
4. Quand la page est relue : cliquer **« ✓ Valider (humain) »** — cela pose
   `valide_humain` sur la page et sur ses lignes (hors incertaines). Re-cliquer retire.
5. Une fois toutes les pages validées : **« Exporter le banc »** → `bancs/…/` avec
   images + ALTO corrigé + `manifeste.json` (pages, nb lignes/caractères, **SHA-256**,
   moteur/modèle, date). L'export **refuse** tant que le banc n'est pas `valide_humain`.

## État actuel

- **OCR brut : fait** (12 pages, socle Kraken CATMuS-Print, 300 DPI).
- **Correction + validation humaine : À FAIRE** (`_garde.valide_humain = false`).
- Tant que le banc n'est pas validé, `bancs/evaluer-banc.mjs` **refuse** d'évaluer,
  et aucune mesure n'est inscrite au registre des modèles.

## Ensuite

`node bancs/evaluer-banc.mjs banc-boece-ceriziers-1646-test-v1` → CER/WER par socle
(Tesseract fra vs Kraken CATMuS-Print) sur les seules lignes validées. Catégoriser les
erreurs avant toute inscription au registre (voir `ENTRAINEMENT.md`).
