
### 38.28 Le ROUGE de la Polyglotte dit « à vérifier », il ne dit pas « on en a parlé »

Relevé structurel du 2026-09-07, et règle fixée le même jour.

⛔ **UNE LIGNE NE SE TEINT QUE SI SON POINT EST OUVERT.** `points_sensibles` est à la fois
un journal — ce qu'on a trouvé, ce qu'on a corrigé — et une file de travail, et le filtre
« Lignes problématiques » ne sert que la seconde. Un point clos (corrigé, documenté,
constaté, résolu, vérifié, validé) a été traité : le rendre rouge use le seul signal dont
l'administrateur dispose pour retrouver ce qui l'attend. La liste comptait déjà 121 points
clos sur 210 quand le relevé structurel l'a portée à 634 ; sans ce partage, le rouge aurait
cessé de désigner quoi que ce soit.

⚠️ **Le LIBELLÉ, lui, se nourrit de TOUS les points**, et l'infobulle de la marge paraît
désormais sur un chapitre dont le point est clos. Un point corrigé garde tout son pouvoir
d'explication quand il a cessé d'être une tâche : c'est là que se lit pourquoi telle case
est vide. Ce qu'on retire est la teinte, jamais le savoir.

⚠️ **La liste nomme les statuts CLOS, non les statuts ouverts.** Un statut qu'on n'aurait
pas prévu tombe alors du côté rouge, c'est-à-dire du côté qui se voit. Une valeur inconnue
mérite un regard, pas un silence.

⛔ **Le rose garde sa priorité** : un cas qui a RÉSISTÉ à la correction est plus précis
qu'un point simplement à vérifier, et il reste ouvert.

### 38.28.1 Le RELEVÉ STRUCTUREL — ce qu'on cherche, et ce qu'on n'y cherche pas

`scripts/audit-structure-versets.mjs` regarde l'OSSATURE quand `audit-versets.mjs` regarde
le TEXTE. Il ne présuppose aucune liste de traductions : il audite toutes celles que porte
`versets_v2`, l'AELF et la Bible du XIIIe siècle comprises, que l'outil de 2026-08 ignorait
parce que sa table de facteurs de longueur ne nommait que les cinq bibles historiques.

Cinq constats, et ils ne se valent pas :

- **le créneau ABSENT** d'une traduction qui couvre pourtant le livre, trois témoins au
  moins le portant ;
- le **REGROUPEMENT** : plusieurs versets de l'édition source dans un même créneau ;
- la **SCISSION** : un verset source étalé sur plusieurs créneaux ;
- le **SURNUMÉRAIRE** : un verset source qu'aucun créneau ne reçoit ;
- le **DÉCALAGE** : une numérotation d'origine qui rompt le régime de son chapitre.

⛔ **UN ÉCART CONSTANT N'EST PAS UN DÉFAUT, ET LE DÉTECTEUR NE DOIT JAMAIS LE DIRE.**
`ch_orig` et `v_orig` décrivent la numérotation de l'édition source : la Vulgate compte le
titre du psaume comme verset premier, et tout le psautier s'en trouve décalé d'un cran.
Ce qui se lit est la RUPTURE de cet écart à l'intérieur d'un chapitre — l'écart le plus
porté fait le régime, et l'on ne signale que ce qui s'en écarte. Mesuré : 3 138 versets
hors de leur régime avant cette règle, 2 145 après, et les 993 de différence étaient des
chapitres entiers rangés sous un régime que rien ne dominait.

⚠️ **Un chapitre dont aucun écart ne tient la moitié des versets n'a pas de régime** : on
rend le CHAPITRE, non chacun de ses versets. Soixante-dix chapitres sont dans ce cas, et
désigner au hasard la moitié de leurs versets aurait été une réponse en l'air.

⚠️ **On ne mesure l'écart que sur les créneaux UN-POUR-UN** : un regroupement ou une
scission fait varier la numérotation par construction, et les compter là ferait signaler
deux fois la même chose.

⛔ **UN SURNUMÉRAIRE N'A PAS DE RÉFÉRENCE CANONIQUE, ET L'ON NE LUI EN INVENTE PAS.** C'est
sa définition. Lui donner une référence que la Polyglotte relit teindrait le créneau qui
porte par hasard le même numéro dans l'édition : sa désignation reste donc en clair, et ses
coordonnées d'origine vont aux notes, où rien ne les prend pour du canon.

⚠️ **Le partage systématique / isolé se fait à HUIT occurrences dans un même livre**, le
seuil de l'audit de 2026-08. Au-delà, la cause est tenue pour systématique — recension
différente, canon plus court, numérotation propre — et le lot se documente au lieu de se
corriger. C'est ce partage qui rend un relevé de 5 040 versets utilisable.

### 38.28.2 Ce que le relevé du 2026-09-07 a trouvé

**5 040 couples (traduction, créneau) portent au moins un défaut d'ossature**, en 424 cas :
1 742 créneaux absents, 1 131 regroupés, 1 128 surnuméraires, 31 scindés, 2 145 décalés et
70 chapitres sans régime. Trois cent six cas font la file à examiner, cent dix-huit se
documentent.

⚠️ **Deux traductions n'avaient JAMAIS été auditées** : l'AELF (337 absences, 306
surnuméraires) et la traduction moderne du témoin de 1899 (539 absences, 181
surnuméraires), toutes deux entrées au corpus après l'audit d'août. Un outil qui nomme ses
traductions dans une constante cesse de voir le corpus dès qu'il grandit.

⚠️ **Le décalage de Sacy que la liste consignait dès juillet 2026 se retrouve tout seul** :
la suscription non numérotée y rompt le régime de son psaume, et le détecteur la relève au
même endroit. Une règle qui redécouvre ce qu'on savait déjà est une règle qu'on peut croire
sur ce qu'on ne savait pas.

⛔ **Le relevé PROPOSE, il ne corrige rien.** Ni le texte, ni `canon_id`, ni la numérotation
native n'ont été touchés. Le versement dans `points_sensibles` est un geste séparé
(`scripts/points-sensibles-verser-audit-structure.mjs`), et chaque ligne versée porte sa
provenance dans ses notes : le lot entier se retrouve et se retire d'une requête, ce qui
est la condition pour qu'une passe automatique n'abîme jamais les points écrits à la main.
