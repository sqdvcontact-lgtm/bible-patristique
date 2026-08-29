# Atelier Fillion

Ce dossier reçoit les artefacts locaux du chantier Fillion. Les fac-similés restent les sources d’autorité. Aucun fichier placé ici ne devient publiable par sa seule présence.

## Ordre de travail

1. enregistrer chaque volume dans le registre des sources ;
2. calculer son empreinte SHA-256 ;
3. relever les pages présentes, absentes, répétées ou illisibles ;
4. produire les images ou extractions de travail ;
5. séparer texte latin, traduction française, blocs du corps, notes et illustrations ;
6. classer chaque bloc avec un niveau de confiance ;
7. conserver les références natives ;
8. proposer l’alignement canonique sans modifier les coordonnées natives ;
9. valider humainement les limites, les notes et les illustrations ;
10. produire un lot importable et un rapport de contrôle ;
11. clôturer l’OCR du livre par une simulation, puis supprimer les seuls caches et rendus reproductibles devenus inutiles.

## Clôture et nettoyage de l’OCR d’un livre

Le nettoyage est une étape obligatoire de fin de livre. « OCR terminé » signifie ici que l’extraction, la structuration, la collation nécessaire et les contrôles de lecture sont achevés, et qu’aucun travail restant ne dépend des fichiers temporaires. La seule fin d’une commande Tesseract ne suffit pas.

Le script `scripts/fillion/close-fillion-book-ocr.mjs` refuse toute suppression tant que :

- le manifeste ne porte pas `status = ocr_complete` et `cleanup_authorized = true` ;
- un contrôle de fin d’OCR échoue ;
- l’empreinte SHA-256 d’un résultat final protégé ne correspond pas ;
- une cible sort de `tmp/` ou de `work/fillion/` ;
- une cible n’a pas son marqueur `.fillion-ocr-disposable.json` ;
- une source, un artefact final, le manifeste ou le rapport se trouverait dans la suppression.

Chaque répertoire reproductible doit porter un marqueur de cette forme :

```json
{
  "schema_version": 1,
  "book_id": "GEN",
  "category": "full_page_render_cache",
  "reproducible": true,
  "recreate_with": "commande exacte permettant de reconstruire ce répertoire"
}
```

Un fichier temporaire isolé peut être déclaré avec `mode = file` seulement s’il
se trouve sous `tmp/`, appartient à la catégorie `scratch` et porte l’extension
`.zip`. Son marqueur latéral se nomme `<fichier>.fillion-ocr-disposable.json` et
ajoute `target_path`, `target_bytes` et `target_sha256`. L’outil recalcule ces
deux dernières valeurs avant toute suppression, puis efface ensemble le fichier
et son marqueur. Cette forme évite de viser le répertoire commun qui peut contenir
d’autres sources de travail encore utiles.

Les catégories admises sont `full_page_render_cache`, `crop_image_cache`, `ocr_engine_cache`, `scratch` et `replaced_control_render`. Les fac-similés, OCR bruts servant de témoin, résultats structurés, manifestes, rapports, empreintes, illustrations finales et preuves visuelles encore utiles ne sont jamais des cibles de nettoyage.

Le modèle de manifeste est `work/fillion/OCR_CLEANUP_MANIFEST.template.json`. La clôture se joue en deux temps :

```powershell
npm run fillion:ocr:close -- --manifest work/fillion/<livre>/ocr_cleanup_manifest.json
npm run fillion:ocr:close -- --manifest work/fillion/<livre>/ocr_cleanup_manifest.json --apply
```

La première commande ne supprime rien et produit un rapport de simulation. Après lecture de ce rapport, la seconde supprime les cibles annoncées, vérifie leur disparition et écrit un rapport final dans le dossier `ocr_cleanup_reports` du livre. Ce rapport conserve le nombre de fichiers, le volume libéré, un inventaire et son empreinte.

## Illustrations

Le pipeline `scripts/fillion/process_illustrations.py` part du PDF et de son XML DjVu OCR. Il masque les zones de texte reconnues, repère les régions graphiques, extrait les candidats à la résolution source et remet automatiquement à l’horizontale les planches hors texte qui satisfont la règle conservatrice du profil 1.1.0, puis produit :

- un master PNG en niveaux de gris, sans perte et non public ;
- un dérivé WebP limité à 1 600 px, qualité 90, destiné au site ;
- un manifeste JSON avec page, recadrage, profil, dimensions, poids et SHA-256 ;
- une planche de contrôle comparant la découpe source, le master et le dérivé web.

Le PDF reste l’autorité. La détection et le nettoyage ne confèrent jamais le statut `valide`. Les candidats ambigus, les recadrages proches du texte et les illustrations comportant plusieurs sujets distincts restent `a_valider`.

Après une production, `scripts/fillion/validate_illustration_manifests.py` recalcule les empreintes, relit les dimensions et vérifie récursivement toutes les paires master/web d’un lot, sans modifier les fichiers :

```powershell
python scripts/fillion/validate_illustration_manifests.py work/fillion/pilot_illustrations
```

## États admis

- `inventorie` : source décrite et hachée ;
- `a_preparer` : images ou pagination à préparer ;
- `ocr_candidat` : transcription automatique non relue ;
- `structure_candidate` : blocs classés automatiquement ;
- `a_valider` : arbitrage humain nécessaire ;
- `valide` : texte et structure confrontés au fac-similé ;
- `pret_import` : contrôles techniques réussis ;
- `importe` : relu depuis la base ;
- `publie` : visible après validation explicite.

Le statut `vérifié` n’est jamais déduit d’un score de confiance.
