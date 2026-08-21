# Sources Fillion - premier inventaire

Date du contrôle : 20 août 2026

## Ensemble retenu

Internet Archive expose huit volumes continus sous les identifiants `lasaintebibletex01fill` à `lasaintebibletex08fill`. Chaque volume fournit :

- le fac-similé PDF ;
- un OCR texte ;
- un XML DjVu avec coordonnées de mots ;
- un manifeste IIIF donnant accès aux images de pages.

L'ensemble est explicitement mélangé : tome I, 2e édition ; tomes II-III, 7e édition ; tomes IV et VI-VII, 8e édition ; tome V, 6e édition ; tome VIII, 9e édition. Les dates relevées sont 1894, 1922, 1924 et 1925. Cette hétérogénéité est conservée volume par volume dans `registre_sources.csv`.

## Correction bibliographique déjà acquise

La notice Internet Archive donne 1889 pour le tome I et le résumé IIIF donne également une date erronée. Le fac-similé de la page de titre porte sans ambiguïté :

- « Deuxième édition » ;
- Paris, Letouzey et Ané ;
- 1894.

La page de titre prévaut sur la métadonnée de catalogue. Le registre conserve l'anomalie dans la note bibliographique au lieu de la masquer.

## Pilote Marc

Le tome VII a été téléchargé en zone temporaire :

- fichier : `tmp/pdfs/fillion/lasaintebibletex07fill.pdf` ;
- taille : 86 388 821 octets ;
- 846 pages PDF ;
- SHA-256 : `36636793eb22df2edfd6675bb5388204e016414f917f99929c1723df9adce608`.

Les pages PDF 195 à 200 ont été rendues et contrôlées visuellement. Elles montrent :

- l'introduction à Marc aux pages PDF 195-198 ;
- le début du chapitre I à la page PDF 199 ;
- la suite de Marc 1, 2-7 à la page PDF 200 ;
- le français à gauche et le latin à droite dans l'imprimé ;
- le commentaire exégétique sous le texte biblique ;
- des notes propres à l'introduction au bas de ses pages.

Le site pourra réordonner les deux textes en latin-français sans altérer l'ordre matériel enregistré dans la provenance.

## Conséquence de structure

L'inspection confirme la distinction décidée :

- l'introduction entière est un bloc de corps `introduction_livre` ;
- les titres « Première partie » et « Section I » sont des blocs de corps ;
- un commentaire annoncé pour Marc 1, 2-4 est un commentaire de plage placé avant la plage ;
- le commentaire annoncé pour Marc 1, 1 est une note de verset ;
- les références infrapaginales de l'introduction appartiennent à l'introduction et ne doivent pas être transformées en notes de verset.

Ce dernier cas exige un petit complément au modèle : un apparat interne aux blocs du corps, distinct de `bible_verse_notes`.
