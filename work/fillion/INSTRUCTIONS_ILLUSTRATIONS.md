# Illustrations Fillion — reprise du traitement

> ⛔ **DOCUMENT HISTORIQUE, PÉRIMÉ AU 30 AOÛT 2026.** Il décrit un défaut de la
> chaîne de nettoyage, qui a été corrigé : les 43 illustrations sont refaites
> depuis les feuillets JP2 et servies en `processing_version` 4.3.0 (Marc) et
> 4.5.0 (planches du tome I). Les mesures qu'il cite — « 67,9 % de blanc absolu »,
> « il ne reste qu'un fantôme de contours brisés » — ne décrivent plus rien de ce
> qui est en ligne.
>
> **Doctrine en vigueur** : charte `parametres.charte_ia`, § 35.16 à 35.16.16.
> **Collecte du tome VII** : `COLLECTE_TOME_VII.md`, à côté.
>
> On le garde parce qu'il raconte POURQUOI la chaîne d'origine échouait, ce qui
> reste utile ; on ne s'y fie plus pour agir.

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

### 1. Deux familles, décidées d'après la planche — jamais d'après son sujet

Le traitement ne peut pas être unique. Distinguer, et enregistrer la décision dans le manifeste :

- **Gravure au trait** — le sujet est un dessin, le papier n'est qu'un support. → **PNG à fond blanc.**
- **Demi-teinte** — le sujet est rendu par une trame continue, et le fond EST le sujet. → **aucun détourage**, on garde le ton et le cadre imprimé ; l'encadrement se fait au rendu.

⛔ **Ne pas classer par sujet.** Une carte de Fillion peut être une gravure au trait — contours, noms, hachures sèches — ou une carte à teintes, dont le relief lavé et le fond de mer sont une demi-teinte. Le mot « carte » ne tranche rien ; la planche, si. Le premier jet de cette consigne rangeait « plan, carte » d'office au trait : c'était une erreur, à ne pas reconduire.

**Le tri se mesure, en deux temps.** La source n'a aucun blanc : le papier y est scanné en gris moyen, si bien qu'un simple comptage de demi-teintes ne sépare rien (71 % pour la miniature au trait, 82 % pour la photographie — indiscernables). Il faut donc :

1. étaler les niveaux comme au §2, sans seuil ni division par le fond ;
2. puis mesurer la masse de tons moyens (60-200) sur le résultat.

Relevé sur deux planches du tome VII :

| Planche | papier > 230 | tons moyens | famille |
|---|---|---|---|
| Miniature du paralytique | 52,2 % | 31,9 % | trait |
| Le Jourdain (photographie) | 13,8 % | 54,7 % | demi-teinte |

Frontière proposée : **moins de 35 % de tons moyens ⇒ trait ; 35 % et plus ⇒ demi-teinte.** À vérifier sur les onze planches avant de la figer, et à consigner dans le manifeste avec la valeur mesurée, non seulement la conclusion.

⛔ **En cas de doute, demi-teinte.** Les deux erreurs ne coûtent pas le même prix : traiter une demi-teinte comme du trait crève le ciel, comme sur le Jourdain, et rien ne le rattrape ; traiter du trait comme une demi-teinte laisse seulement un fond légèrement gris, qu'un réglage ultérieur corrige. Une planche mixte — carte à teintes, vue au trait rehaussée d'un lavis — va donc à la demi-teinte.

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

## Quand faire ce travail

⛔ **Ne pas interrompre le travail en cours pour lancer un essai tout de suite.** La reprise du traitement n'est pas une tâche à part, à mener avant tout le reste : elle s'intègre au fil de ce qui est déjà engagé.

**Le banc d'essai est déjà là** : ce sont les onze planches ratées. Elles ont leur source, leur cadrage relevé, leur dérivé publié, et l'on connaît le défaut de chacune. Rien n'est à produire pour éprouver le nouveau traitement, il suffit de les repasser et de comparer aux mesures ci-dessus. La miniature du paralytique (`fillion-t07-p0207-i01`) est le pire cas, elle sert donc de premier témoin, mais elle ne demande aucune séance dédiée.

**Puis l'intégration se fait progressivement**, au rythme du travail courant : chaque planche reprise entre dans le flux ordinaire, mesurée, classée dans sa famille et soumise avec le reste. On ne refait pas les onze d'un bloc, et l'on n'attend pas non plus qu'elles soient toutes refaites pour avancer sur le fond.
