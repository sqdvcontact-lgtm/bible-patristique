# Illustrations Fillion — reprise du traitement

## Ce qui ne va pas

Les planches publiées sont inutilisables. Le défaut n'est ni dans le cadrage, qui est juste, ni dans la source, qui est excellente : il est dans l'étape de nettoyage de `scripts/fillion/process_illustrations.py`.

Mesure de la même planche, « Le Jourdain » (`fillion-t07-p0202-i01`), extraite de la source puis telle qu'elle est servie :

| | blanc pur | tons moyens (60-200) |
|---|---|---|
| Source, cadrage identique | 0,0 % | 83,4 % |
| Fichier publié | 31,0 % | 30,2 % |

Les deux tiers des demi-teintes ont disparu. Sur la miniature du paralytique (`fillion-t07-p0207-i01`), c'est pire : **67,9 % de blanc absolu et 13,5 % de tons moyens**. Il ne reste qu'un fantôme de contours brisés.

⛔ **La source n'est pas en cause.** La page IIIF fait 2455 × 4088, le rendu du PDF 2450 × 4084 : même définition, à cinq pixels près. La planche source a ses hachures intactes, son cadre net et son papier continu.

## Les trois causes, dans le code

1. **`normalized_gray`** — `valeurs × 248 / fond_flouté`. Une correction de champ plat, juste pour du texte gris sur papier jauni, mais appliquée à une planche elle divise chaque grande plage sombre par sa propre obscurité et la blanchit. C'est ce qui a effacé la miniature.

2. **`values[values >= 230] = 255`** — un seuil dur. Il brûle le papier, mais aussi les hachures fines, les ciels et tout ce qui est clair. Et il produit un fond `#fff` qui jure sur le crème de la page.

3. **`thumbnail(..., LANCZOS)`** de 2820 à 1600 px sans passe-bas préalable. Sur une trame de hachures serrées, les lignes battent contre la grille de pixels : c'est la moire visible dans l'eau et le ciel.

Le fond du problème est un contresens : le pipeline traite une planche gravée comme un trait noir sur fond blanc, alors que c'est une image en demi-teintes.

## Ce qui est demandé

### 1. Deux familles, décidées d'après la source

Le traitement ne peut pas être unique. Distinguer, et enregistrer la décision dans le manifeste :

- **Gravure au trait** — bas-relief, ivoire, miniature, objet, plan, carte. Le sujet est un dessin, le papier n'est qu'un support. → **PNG à fond blanc.**
- **Demi-teinte** — photographie, vue, paysage, tout ce qui est rendu par une trame continue. Le fond EST le sujet. → **aucun détourage**, on garde le ton et le cadre imprimé ; l'encadrement se fait au rendu.

⛔ Ne jamais détourer une demi-teinte. C'est ce qui a crevé le ciel du Jourdain.

### 2. Le fond blanc s'obtient par les NIVEAUX, jamais par un seuil

Pour une gravure au trait :

- relever le point blanc sur le papier réel de la planche, pas sur une constante ;
- étaler les niveaux entre ce point et le noir le plus dense, en écrêtant au plus 0,5 % à chaque bout ;
- laisser une rampe douce vers le blanc : les hachures les plus fines doivent survivre ;
- supprimer la division par le fond flouté, ou la réserver à une correction très faible, mesurée.

**Critère mesurable** : après traitement, la planche doit conserver **au moins 55 %** de la masse de tons moyens de sa source. Le contrôle doit refuser un actif qui tombe en dessous, et le signaler plutôt que de le publier.

### 3. Réduire sans moirer

Toute réduction supérieure à 1,5× passe par un filtre passe-bas, ou par une moyenne de surface. Le dérivé web doit valoir **au moins deux fois** la largeur à laquelle il sera affiché, faute de quoi le navigateur refait le même dégât.

### 4. Prendre la source la moins compressée

À définition égale, le PDF est environ cinq fois plus compressé que les JP2 : 82 Mo contre 420 Mo pour `_jp2.zip`, 550 Mo pour `_orig_jp2.tar` sur le tome VII. Sur une hachure fine, cela compte. Travailler depuis les JP2 ou depuis l'API IIIF en pleine résolution plutôt que depuis le PDF.

### 5. Proportion et emplacement viennent du fichier d'origine

- **La proportion est celle de la planche**, telle qu'elle est imprimée. Ne jamais recadrer vers un gabarit, ne jamais compléter, ne jamais rogner le filet du cadre.
- **L'emplacement se relève dans la source** : page, ordre dans la page, et ce que la planche interrompt dans le texte — le verset ou le paragraphe qui la précède. Il ne se devine pas d'après le sujet de l'image.
- Enregistrer la rotation appliquée quand une planche est imprimée en travers, plutôt que de la déduire au rendu.
- Le cadrage normalisé et la taille de page sont déjà enregistrés dans `source_crop_box` : c'est le bon modèle, le garder.

### 6. S'intégrer au texte sans l'enlaidir

La page de lecture est crème, composée en sérif, sur une mesure étroite. Une planche doit s'y poser, non s'y coller :

- un fond blanc pur sur un fond crème fait une tache ; pour une gravure au trait, préférer un blanc qui s'accorde au papier de la page, ou un fond transparent ;
- une demi-teinte reçoit un encadrement discret au rendu, qui lui tient lieu de bord ;
- la légende imprimée reste distincte de la légende éditoriale ;
- l'image ne dépasse jamais la mesure du texte.

## Contrôles à passer avant publication

Le contrôle existant vérifie les empreintes et les dimensions. Il doit aussi refuser :

1. une demi-teinte dont le blanc pur dépasse **2 %** ;
2. une planche qui a perdu plus de **45 %** de ses tons moyens par rapport à sa source ;
3. un dérivé web dont la largeur est inférieure au double de la largeur d'affichage ;
4. un actif sans famille déclarée — trait ou demi-teinte ;
5. un actif dont le cadre imprimé est coupé par le cadrage.

Chaque refus est signalé et laisse l'actif en revue. Aucun actif ne se publie sur un score : la validation reste humaine.

## Ordre proposé

Refaire **une seule** planche d'abord, la miniature du paralytique (`fillion-t07-p0207-i01`), qui est le pire cas, et la soumettre avant de reprendre les dix autres.
