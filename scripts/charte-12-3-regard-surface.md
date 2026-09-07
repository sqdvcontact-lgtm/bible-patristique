
### 12.3 UNE COLONNE EN REGARD SE COMPOSE SUR LA SURFACE QUI REND LE TEXTE

Relevé de l'auteur le 7 septembre 2026, sur le *Manuel pour mon fils* de Dhuoda : « je
sais pas pourquoi j'ai pas le lien entre le latin et le français ». Il n'y avait rien à
réparer dans la donnée.

**Ce qui était mesuré** : l'œuvre est ouverte, ses deux textes sont publics et publiés,
le latin de Bondurand 1887 porte 809 segments et la traduction française treize.
L'ensemble d'alignement `A0176O0001:BONDURAND1887-CSIA2026:LA-FR:PARAGRAPH` existe, il
est sain, il couvre EXACTEMENT les treize segments traduits en cinq groupes, et un
second ensemble, plus grossier, est `retired` et correctement écarté. La paire de
lecture se calculait juste, `enRegardSurPlace` valait vrai, et le menu offrait
« Français & latin ». Le lecteur n'obtenait qu'une colonne.

⛔ **LA CAUSE EST LA SURFACE, ET ELLE SE COMPTE AU CHEMIN DE RENDU.** Les treize
segments français sont tous de nature `introduction` — la traduction a commencé par les
prolégomènes, et le typage est juste. Or l'introduction se rend hors des groupes, par un
chemin à elle (§ 7.4), et ce chemin ne composait AUCUNE colonne en regard : la grille ne
vit que dans la boucle des groupes, laquelle écarte les segments d'introduction et rend
`null` sur un groupe qui n'en porte pas d'autres. Le texte passait donc tout entier par
une surface qui n'avait jamais appris à mettre quoi que ce soit en face de lui.

⚠️ **C'est le défaut du § 7.4 pris par l'autre bout, et le même jour.** Cette surface a
reçu le VERS le matin, elle n'avait toujours pas reçu le BILINGUE le soir. **Une surface
nouvelle hérite de toutes les questions des autres**, et l'on ne peut pas se contenter
de lui donner ce qui manquait la dernière fois.

⛔ **UNE GARDE QUI VÉRIFIE LA DONNÉE NE VÉRIFIE PAS LE RENDU.** La paire de lecture
avait été écrite pour empêcher exactement ce symptôme, bouton allumé et une seule
colonne, et elle n'y pouvait rien : elle contrôle qu'une colonne PEUT se composer,
jamais que la surface qui rend ce texte SAIT la composer. La distinction est générale :
une condition d'affichage nomme la donnée, elle ne nomme pas la surface.

**Ce que la règle prescrit désormais.**

- ⛔ **Le CORPS et l'ENCRE d'une colonne en regard viennent de la SURFACE**, jamais d'une
  valeur recopiée d'ailleurs. Une colonne SEULE prend le gabarit du français qu'elle
  remplace ; une colonne EN REGARD descend d'un rang, pour que l'œil sache laquelle des
  deux il lit. Ce qui SÉPARE les deux colonnes reste la police, le change de caractère,
  mieux qu'un filet.
- ⛔ **L'encre d'un argument ne peut pas être celle d'un original de CORPS, et c'est
  mesuré.** L'échelle du Clair est `--cs-texte` #3a3530, `--cs-original` #575048,
  `--cs-texte-second` #6b6560 : l'encre de l'original est plus FONCÉE que celle d'un
  argument. En regard du corps elle s'efface ; en regard d'un argument elle pèserait
  davantage que le français qu'elle accompagne. Et au Cuir elle ne s'inverse pas
  (#e6ded0 › #cdc2ab › #bdb3a0), si bien que le même jeton dirait deux choses contraires
  selon le thème, ce qui est le défaut relevé sur `--cs-danger-fonce`, transposé à
  l'envers. Un argument garde donc SON encre des deux côtés.
- ⛔ **Dans une grille en regard, le blanc appartient à la RANGÉE, non à la cellule.**
  Les deux colonnes doivent rester de niveau : un blanc posé par le seul français
  pousserait le français et laisserait l'original en arrière.
- ⚠️ **Hors grille, on n'enveloppe rien.** Une boîte de plus autour de chaque bloc ferait
  une géométrie que la lecture ordinaire n'a jamais eue, et c'est elle qui est le cas de
  presque tout le corpus.

⚠️ **CE QUI RESTE, ET QUI N'EST PAS DU RENDU.** La traduction ne couvre que les
prolégomènes : treize segments contre 690 de corps latin. La grille réparée ne met donc
en regard que le prologue et l'épigramme, et l'alignement le dit lui-même, qui se
déclare traduction incrémentale. **Une surface qui sait composer ne remplace pas un
texte qui n'existe pas encore**, et les deux questions ne se répondent pas au même
endroit.
