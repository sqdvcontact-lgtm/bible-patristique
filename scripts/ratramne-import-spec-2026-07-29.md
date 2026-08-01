# Ratramne 1673 - spécification d'import

État : spécification de travail avant import. Aucun fichier Word n'est une source éditable.

## Sources et invariants

- Source de transformation : `C:\Corpus Scriptura\CS - Espace travail IA\Ratramne - OCR\master\transcription.json`.
- Source de contrôle : `C:\Corpus Scriptura\CS - Espace travail IA\Ratramne - OCR\source\du_corps_et_du_sang_du_seigneur_1673.pdf`.
- Les trois DOCX du chantier sont des livrables intangibles. Le constructeur vérifie leurs empreintes SHA-256 au démarrage et s'arrête si l'une diffère.
- Tous les artefacts générés vont dans `tmp/ratramne-import-2026-07-29`. Aucun artefact n'est écrit dans le chantier OCR.
- L'import cible l'auteur `A0091`, l'œuvre `A0091O0001` et la notice 1673 `catalogue_notices.id = 1937`.
- L'œuvre reste non publiée jusqu'à la fin de l'audit en base, de la recette bilingue et de la campagne de liens.

## Lecture structurelle

### Apparat éditorial

1. La page de titre bibliographique sert au contrôle des métadonnées, mais n'est pas importée.
2. *Advertissement* : 128 paragraphes français, 74 notes.
3. *Témoignages* : deux sections et deux paragraphes, une note.

Ces éléments portent `nature = apparat_critique`. Leur numérotation de paragraphe est séquentielle à l'intérieur de chaque division.

### Texte de l'œuvre

- Préface : blocs `RAT-TXT-0002` et `RAT-TXT-0003`, classés dans l'apparat critique sous l'intitulé imprimé « Préface au roy Charles ».
- Première partie : blocs `RAT-TXT-0004` à `RAT-TXT-0049`. Son existence structurelle est établie par l'intitulé imprimé « Seconde partie » qui ouvre le bloc suivant, même si le fac-similé n'imprime pas symétriquement « Première partie ».
- Seconde partie : blocs `RAT-TXT-0051` à `RAT-TXT-0102`, soit 52 paragraphes bilingues.
- `RAT-TXT-0103` conserve le colophon `FIN.`.

Chaque bloc bilingue constitue exactement un paragraphe source. La segmentation française crée des unités de sens à l'intérieur de ce paragraphe :

- `paragraphe` : numéro séquentiel dans la partie ;
- `rang` : position du segment français dans le paragraphe ;
- `segment_texte` : segment français ;
- `texte_original` : paragraphe latin complet, uniquement sur le rang 1 ;
- aucun texte latin n'est distribué ni dupliqué sur les rangs suivants.

La segmentation automatique n'est qu'une proposition. Toute coupure après point-virgule ou deux-points, tout segment long et toute ponctuation ambiguë est inscrit dans le fichier d'alertes pour lecture humaine.

## Notes

- Le maître contient 140 notes françaises et 44 notes latines, soit 184 notes.
- Les marqueurs internes `[[FN_...]]` sont convertis en une séquence globale `[[1]]` à `[[184]]`, selon l'ordre d'affichage dans l'œuvre et sans reprendre les numéros du fac-similé.
- Une définition est placée dans `notes` sur le segment qui porte l'appel.
- Les appels latins sont recherchés dans `texte_original` du rang 1.
- Les trois notes des titres (`FN_LAT_001`, `FN_LAT_002`, `FN_FR_001`) restent des notes de titre. Elles ne sont pas déplacées dans la première phrase. Leur représentation dans les champs de niveau et leur affichage constituent une extension contrôlée du lecteur.

## Hiérarchie proposée

| Nature | `ref_niv1` | `ref_niv2` |
|---|---|---|
| apparat | `Advertissement` | vide |
| apparat | `Témoignages` | `Témoignage I` / `Témoignage II` |
| apparat | `Préface` | vide |
| texte | `Première partie` | vide |
| texte | `Seconde partie` | vide |

Les intitulés développés des témoignages vont dans `ref_niv2_texte`. La préface porte `Au roy Charles[[N]].` dans `ref_niv2_texte` sur son premier segment ; l'appel renvoie à la note éditoriale correspondante.

## Garde-fous avant écriture Supabase

1. Empreintes des cinq sources inchangées.
2. 100 paragraphes bilingues, sans latin ni français manquant.
3. 184 appels et 184 définitions après prise en compte des notes de titre.
4. Aucun marqueur `[[FN_...]]` résiduel.
5. Aucun segment vide hors séparateur explicite.
6. `segment_numero` continu et unique.
7. `paragraphe` continu par division ; `rang` continu à partir de 1.
8. Latin présent seulement au rang 1.
9. CSV et JSON canoniques dotés d'une empreinte SHA-256.
10. Script d'application inactif sans option explicite `--apply`, transactionnel et idempotent.
11. Sauvegarde du préétat de `oeuvres`, `segments` et `catalogue_notices` avant insertion.
12. Notice 1937 maintenue hors publication jusqu'à la recette finale.

## Liens bibliques

L'import structurel ne fabrique aucun lien. La campagne de liens intervient après l'audit en base et relit alors les §§ 8, 9, 24 et 25 de la charte ainsi que la mémoire active `feedback_liens_protocole`. Les liens nouveaux sont écrits dans `liens_bibliques`, jamais seulement dans les colonnes historiques `lien_1` à `lien_4`.
