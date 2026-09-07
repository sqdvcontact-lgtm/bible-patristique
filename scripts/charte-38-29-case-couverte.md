
### 38.29 Une case COUVERTE n’est pas une case vide

Contrôle philologique du 2026-09-07, sur les créneaux que le relevé structurel donnait pour
absents.

⛔ **UN VERSET ÉTALÉ PORTE TOUS LES CRÉNEAUX QU’IL COUVRE, ET PAS SEULEMENT LE PREMIER.**
`canon_id` dit où il commence, `canon_id_fin` où il finit, et ce qui est entre les deux
n’est pas absent. La règle vaut pour qui LIT cette donnée comme pour qui la mesure :

- **le relevé** l’ignorait et annonçait 28 absences qui n’en étaient pas — dont Nb 15, 14
  et 15, 16, que la Vulgate couvre bel et bien d’un seul verset. Corrigé : 1 714 absences
  au lieu de 1 742, 62 isolées au lieu de 66 ;
- **la Polyglotte** ne lisait pas cette colonne du tout, et écrivait « Absent de cette
  traduction » sur **32 cellules** que l’édition porte. Trois d’entre elles étaient dans la
  colonne de l’AELF, c’est-à-dire dans la référence même de l’ossature.

⚠️ **La case couverte renvoie au verset où le texte se lit, elle ne le RÉPÈTE pas** : un
verset ne se lit qu’une fois. Et elle y renvoie dans la numérotation de l’ÉDITION, jamais
par le numéro du canon (§ 15.1.2).

⛔ **UN EMPAN DONT LA FIN PRÉCÈDE LE DÉPART EST UNE DONNÉE FAUTIVE, ET L’ON NE DEVINE PAS
L’INTENTION** : la ligne ne couvre alors que son créneau de départ, ni plus ni moins.

⚠️ **Corollaire de méthode, et il est plus large que ce cas** : une colonne d’alignement que
personne ne lit finit par ne plus rien vouloir dire. `versets_v2.canon_id_fin` était
renseignée, exacte, documentée par la charte — et aucune surface du site ne la demandait.
La donnée était juste et l’écran mentait. *Avant de conclure qu’un texte manque, vérifier
que la surface qui le dit sait lire ce qui le porte.*

### 38.29.1 Ce que le contrôle des cinq divergences a établi

Cinq créneaux manquaient à DEUX témoins indépendants à la fois, ce qui fait soupçonner la
case plutôt que le texte. Confrontation faite, **l’alignement était juste dans les cinq
cas**, et l’absence est une divergence réelle de la tradition vulgate, que les comptes de
versets natifs confirment :

| créneau | ce que dit l’édition |
|---|---|
| `GEN.49.32` | Gn 49 compte 32 versets dans la Vulgate et chez Sacy, 33 au canon ; leur v. 32 répond au v. 33 |
| `EXO.40.14` | leur v. 13 couvre les v. 13 et 15 du canon ; le v. 14 n’a pas d’équivalent |
| `NUM.15.12` | leurs v. 11 et 12 répondent ensemble au v. 11 du canon |
| `SIR.22.17` | l’Ecclésiastique latin relève d’une autre recension : 33 versets au chapitre contre 27 |
| `SNG.1.1` | l’édition ne numérote pas le titre du livre ; son v. 1 répond au v. 2, et le chapitre compte 16 versets contre 17 |

⛔ **Rien n’a été réaligné là où l’alignement était juste**, et rien n’a été ajouté dans une
case vide. Chacune de ces cinq divergences a reçu une **note éditoriale courte** sur la
première ligne où la numérotation diverge — celle que le lecteur voit —, qui nomme la
référence native et la correspondance TOL/AELF sans déclarer fautive une tradition qui est
seulement différente. ⚠️ Deux de ces lignes portaient déjà une note : elle a été ALLONGÉE,
jamais réécrite.

### 38.29.2 Deux empans manquaient à l’AELF elle-même

⛔ **Sg 9, 18 et 1 M 12, 53 de la TOL/AELF couvrent chacun DEUX créneaux du canon**, et ne
le déclaraient pas : la colonne de la référence était vide en Sg 9, 19 et en 1 M 12, 54.
Mesuré : l’AELF compte 18 versets en Sg 9 quand l’ossature en compte 19, et 53 en 1 M 12
quand l’ossature en compte 54 ; le texte de son verset porte, mot pour mot, ce que les
autres traductions rangent dans le créneau suivant.

⚠️ **C’est un champ d’ALIGNEMENT, et le § 15.1.1 permet expressément de le corriger** : « la
référence native AELF doit rester reconstructible et inchangée. Les champs d’alignement
peuvent être corrigés ; le texte de `TR0012` ne doit pas l’être. » Le texte, la
numérotation native et l’ordre n’ont pas bougé — postcheck à zéro sur les deux lignes.

⚠️ **L’ossature et l’AELF ne coïncident donc pas partout**, ce que la charte signale déjà
comme une dette ouverte. Ces deux cas la documentent d’un exemple mesuré : ce ne sont pas
des versets manquants, ce sont des versets réunis.
