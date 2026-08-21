# Inventaire matériel des huit volumes Fillion

Date du contrôle : 20 août 2026
Méthode : page de titre lue à l'image sur le fac-similé, empreinte SHA-256 calculée sur le PDF téléchargé en flux.

## Ce que porte chaque volume

| Tome | Édition | Année | Adresse de l'éditeur | Images | Octets | SHA-256 (début) |
|---|---|---|---|---|---|---|
| I | Deuxième | 1894 | rue du Vieux-Colombier, 17 | 770 | 76 511 283 | `05b23bc771e8` |
| II | Septième | 1922 | 87, boul. Raspail | 700 | 53 153 610 | `5bbe4769c477` |
| III | Septième | 1922 | 87, boul. Raspail | 650 | 49 789 974 | `6ac6e793693f` |
| IV | Huitième | 1924 | 87, boul. Raspail | 658 | 66 048 393 | `5cdc230e86a3` |
| V | Sixième | 1922 | 87, boul. Raspail | 838 | 64 852 554 | `486db2ed5650` |
| VI | Huitième | 1924 | 87, boul. Raspail | 922 | 70 370 232 | `d4baf3de468d` |
| VII | Huitième | 1924 | 87, boul. Raspail | 848 | 86 388 821 | `36636793eb22` |
| VIII | Neuvième | 1925 | 87, boul. Raspail | 916 | 95 279 238 | `ddc0b80ab7c1` |

Les mentions d'édition et les millésimes de l'inventaire précédent sont **tous confirmés**, aucun n'a dû être corrigé. Le tome VI, jusqu'ici donné d'après la notice de l'ensemble, et le tome VII, dont l'OCR de la page de titre est illisible (« iiL itii:mi: i:i)iriox » pour « HUITIÈME ÉDITION »), le sont désormais par l'image.

L'empreinte du tome VII retrouve au caractère près celle relevée le matin même par un autre chemin.

## L'empreinte se vérifie contre celle du fournisseur

`scripts/fillion/hash-volumes.mjs` télécharge chaque PDF en flux, calcule SHA-256 **et** MD5 au même passage, puis jette le fichier : la charte demande une empreinte, pas 536 Mo de copies. Le MD5 recalculé est confronté à celui que déclare Internet Archive.

Les huit concordent. C'est ce qui atteste que le fichier haché est bien celui que la notice décrit, et non un transfert tronqué. Une discordance interdirait d'inscrire l'empreinte en provenance.

## D'où vient la date fautive de 1889

L'audit du matin avait relevé que la notice du tome I portait 1889 au lieu de 1894. Le contrôle des huit notices montre que **les huit portent 1889**, et donne la cause : les huit volumes partagent une seule cote de bibliothèque, `BS229 .F5 1889`, et un seul enregistrement OCLC. La date du catalogue est celle de la cote de l'ensemble ; elle ne décrit **aucun** des huit millésimes réels, qui s'échelonnent de 1894 à 1925.

Ce n'est donc pas une erreur isolée à corriger sur un volume, mais une propriété de la notice de l'ensemble. Elle est consignée volume par volume dans `metadata.anomalie_catalogue`.

## Deux exemplaires, non un

L'ensemble numérisé n'est pas un jeu homogène.

- **Tome I** : aucun ex-libris de communauté, mais une **signature manuscrite datée 1895**, et l'adresse ancienne de l'éditeur, rue du Vieux-Colombier. C'est un exemplaire distinct.
- **Tomes II à VIII** : ex-libris manuscrit « Ursulines de Rimouski » et **cotes qui se suivent**, 7706 à 7712. Ces sept volumes forment une suite continue, provenant d'une même bibliothèque.

Les cotes des tomes II à V se lisent sans hésitation ; celles des tomes VI à VIII sont d'une écriture plus rapide et restent probables, ce que la base consigne par `cote_lecture_certaine`.

Tous ont ensuite rejoint la **Kelly Library, St. Michael's College, University of Toronto** — d'où le tampon qui paraît sur le faux-titre du tome VIII —, et c'est de là qu'ils ont été numérisés, au centre uoft, avec le concours de l'Université d'Ottawa.

Conséquence éditoriale : la notice affichée au lecteur ne doit pas seulement dire que les **éditions** diffèrent, mais que le tome I ne vient pas du même exemplaire que les sept autres.

## Ce qui reste à faire sur ces volumes

Le contrôle matériel page à page — pages absentes, répétées, illisibles — n'est pas fait. Le registre le porte toujours comme tel : l'inventaire établit l'identité et l'intégrité du fichier, pas l'état de chaque feuillet.
