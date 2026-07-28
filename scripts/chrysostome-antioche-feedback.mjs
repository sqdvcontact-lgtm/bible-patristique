// Répare et complète la mémoire de travail propre aux Homélies au peuple
// d'Antioche. Le texte est conservé ici en UTF-8 pour éviter la dégradation des
// accents produite par un ancien script envoyé à Node via le pipeline PowerShell.

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((ligne) => ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const CLE = 'feedback_liens_protocole'

const { data, error } = await sb.from('parametres').select('valeur').eq('cle', CLE).single()
if (error) throw error
let valeur = String(data.valeur ?? '')

// Retirer la version mojibakée, située à la fin de la mémoire.
const debutCorrompu = valeur.indexOf('### 2026-07-28 ? Hom?lies au peuple')
if (debutCorrompu >= 0) valeur = valeur.slice(0, debutCorrompu).trimEnd()

const titre = '### 2026-07-28 — Homélies au peuple d’Antioche : notes anciennes à résoudre par le contenu'
if (!valeur.includes(titre)) valeur += `


${titre}

- Un appareil ancien peut être parfaitement reconstruit matériellement (ici 384 appels pour 384 définitions) tout en donnant seulement le livre et le chapitre, avec des chiffres fautifs. La note atteste alors le renvoi éditorial, non la cible canonique exacte : identifier les versets par la formulation du passage et les contrôler dans \`versets_lecture\`.
- Résoudre « Ibid. » dans la séquence éditoriale, puis vérifier le résultat sémantiquement. Exemple : après 1 Co 4,17, l’édition imprime « Ibid. 14 » pour une reprise qui correspond en réalité à 1 Co 16,10.
- Quand une coupure de segment place l’appel de note à la fin du segment précédent mais le contenu biblique dans le suivant, rattacher le lien au segment porteur du contenu ; conserver dans le motif le numéro de note et signaler cette frontière.
- Les éditions parallèles annotées sont d’excellents témoins de contrôle, jamais une substitution à la vérification dans l’ossature locale. Dans l’Homélie I, elles ont permis d’identifier « Cor. 7 » = 1 Co 4,17 et « Dan. 5 » = Dn 3,17-18.
- Homélie I : 163 segments lus, 73 liens (13 type 1, 25 type 2, 35 type 3) ; sondage 15/15 juste.

#### Homélie II

- Un lemme réellement commenté sur une longue séquence doit rester attaché à chacun des segments de cette séquence. Ici, 1 Tm 6,17 structure les segments 284 à 342 ; les rattacher tous rend visible le commentaire continu, sans étendre le lien aux applications qui ne visent plus précisément le verset.
- Une référence au seul chapitre ne justifie pas le choix arbitraire d’un verset. La note [[49]] « Prov. 12 », appliquée au travail opposé à l’oisiveté, reste « à constituer » : Pr 12,11, 12,24 et 12,27 sont tous plausibles.
- Les notes fautives repérées par le contenu sont : [[43]] « Ps. 33 » = Ps 38,7 ; [[47]] « Eccl. 2 » = Qo 5,11 ; [[48]] « Gen. 1 » = Gn 2,15. La note [[45]] « Gen. 18 » tombe trois segments avant le développement sur l’hospitalité d’Abraham : le lien suit le contenu, non la coupure de page.
- Le contrôle par strate est nécessaire quand une catégorie domine le lot : le sondage global était saturé de commentaires sur 1 Tm 6,17. Le contrôle exhaustif des types 1 a détecté Jr 9,10 comme cible erronée et l’a corrigée en Jr 9,9.
- Homélie II : 152 segments lus, 110 liens (14 type 1, 8 type 2, 83 type 3, 5 type 4), dont un à constituer. Après correction, contrôle exhaustif des 27 citations des Homélies I-II : 27/27 justes.
`

const titreHom3 = '#### Homélie III'
if (!valeur.includes(titreHom3)) valeur += `

${titreHom3}

- Les notes peuvent être non seulement fautives mais croisées : [[70]] « Hier. 14 » et [[71]] « Joël. 2 » sont matériellement inversées. Le contenu rétablit Jl 1,18-20 puis Jr 14,5-6 ; Jl 2,16 apparaît ensuite sans appel correctement placé.
- Une citation composite doit être distribuée entre ses sources réelles. Les segments 403-404 joignent Pr 19,12, Is 65,25 et Is 11,6-7 ; conserver un seul chapitre sous prétexte qu’une seule note est imprimée aurait perdu deux sources distinctes.
- Les désignations anciennes exigent une recherche textuelle : « Psal. 00 » correspond à Ps 100,5 et « Eccl. 19 » désigne ici l’Ecclésiastique/Siracide 19,10, non Qohélet.
- Une édition parallèle peut suivre une forme scripturaire différente de la cible canonique locale. Le témoin moderne attribue à Jl 1,17 une formule animale conforme à la Septante, mais le segment français et le verset local ne coïncident pas assez : le lien a été retiré au contrôle. Toujours comparer la formulation du segment à la cible effectivement affichée sur le site.
- Les déplacements d’appel peuvent franchir plusieurs segments : [[53]] « Gen. 29 » tombe au segment 385, alors que la chaleur, le froid et l’insomnie de Jacob sont au segment 383 et identifient Gn 31,40. Le lien suit le contenu, et le motif conserve la trace du déplacement.
- Homélie III : 146 segments lus, 74 liens (38 type 1, 15 type 2, 18 type 3, 3 type 4). Le contrôle exhaustif a entraîné un retrait (Jl 1,17) et le déplacement de Jon 3,10 du segment 429 au segment 430.
`

const ancienBilanHom1 = '- Homélie I : 163 segments lus, 73 liens (13 type 1, 25 type 2, 35 type 3) ; sondage 15/15 juste.'
const nouveauBilanHom1 = '- Homélie I : 163 segments lus, 216 liens (13 type 1, 25 type 2, 178 type 3) après reprise du commentaire continu de 1 Tm 5,23.'
if (valeur.includes(ancienBilanHom1)) valeur = valeur.replace(ancienBilanHom1, nouveauBilanHom1)

const titreRepriseHom1 = '#### Reprise de contrôle de l’Homélie I — commentaire continu de 1 Tm 5,23'
if (!valeur.includes(titreRepriseHom1)) valeur += `

${titreRepriseHom1}

- L’homélie annonce expressément qu’elle emploiera « tout le discours » à 1 Tm 5,23. La première passe avait relié la citation et quelques explications locales, mais avait perdu la continuité argumentative : c’était une sous-constitution, malgré un sondage techniquement juste des liens déjà présents.
- Le commentaire suivi commence au segment 68, où le lemme est cité et choisi comme sujet, et s’achève au segment 212 avec l’application sur la patience dans l’infortune. Le segment 213 ouvre explicitement un sujet autonome contre le blasphème ; cette transition discursive fixe la frontière et interdit d’étendre le lemme jusqu’à la fin par simple appartenance à la même homélie.
- Chaque segment 68 à 212 porte désormais le type 3 vers 1 Tm 5,23, y compris les excursus sur la vertu de Timothée, la sobriété et les huit raisons des souffrances des saints : chacun joue un rôle dans la question précise soulevée par « tes fréquentes maladies » et par le recours au vin plutôt qu’à une guérison miraculeuse.
- Règle nouvelle de contrôle : pour toute homélie annoncée « sur une parole », relever le premier et le dernier segment du commentaire principal, puis auditer les trous entre ces bornes. Un segment sans lien au lemme doit être justifié par une rupture réelle du raisonnement ; les seules répétitions lexicales et notes éditoriales ne suffisent pas à mesurer la couverture.
- Le contrôle par sondage vérifie la justesse des liens présents, mais ne mesure pas leur rappel. Il doit être complété, pour un commentaire suivi, par un contrôle de couverture segment par segment entre les bornes du lemme.
- Bilan corrigé de l’Homélie I : 163 segments lus, 216 liens (13 type 1, 25 type 2, 178 type 3), soit 143 commentaires ajoutés. Le segment 126 signalé par l’utilisateur porte maintenant 1 Tm 5,23 en type 3.
`

const titreHom4 = '#### Homélie IV'
if (!valeur.includes(titreHom4)) valeur += `

${titreHom4}

- Un développement narratif peut commenter une péricope entière sans avoir un lemme versifié unique. Dans ce cas, poser le chapitre comme cible de type 3 sur chacun des segments réellement consacrés à la péricope, puis ajouter les versets précis pour les citations et paraphrases locales. Daniel 3 structure ainsi sans interruption les segments 569 à 603.
- La continuité ne doit pas être prolongée mécaniquement à travers une parenthèse autonome. Le bloc sur Job occupe 553-555 puis 557-560, mais le segment 556 cite et développe Rm 5,3-4 : le sondage a fait retirer de ce segment les deux liens généraux vers Job 1-2. Contrôler non seulement les trous d’un commentaire suivi, mais aussi ses interruptions réelles.
- Une abréviation biblique peut être corrompue par l’OCR au point de sembler patristique : [[97]] « Lact. 19 » est ici « Act. 19 », confirmé par les linges de Paul en Ac 19,12 ; le « Ibid. 5 » suivant vise Ac 5,15 et l’ombre de Pierre. Toujours tester une correction paléographique contre le contenu avant de créer une cible.
- La numérotation de Daniel 3 varie fortement selon les traditions à cause des additions grecques. Ne jamais transposer directement le numéro d’une édition moderne : la conservation des vêtements se trouve dans la cible locale Dn 3,94, non Dn 3,27. Rechercher la formulation dans \`versets_lecture\`.
- Une chaîne de notes psalmiques peut être à la fois déplacée et matériellement fausse. Aux segments 613-615, les images « glaive tranchant », « vie et mort », « bouche pleine d’amertume », « cœur double », « aspic sourd » et « oreille inclinée » ont été résolues séparément par leur formulation ; la cible « vie et mort au pouvoir de la langue » est Pr 18,21 malgré la note imprimée « Psal. 9 ».
- Homélie IV : 103 segments lus, 92 liens (16 type 1, 15 type 2, 58 type 3, 3 type 4). Le premier sondage a détecté et corrigé la sur-extension de Job au segment 556.
`

const titreHom5 = '#### Homélie V'
if (!valeur.includes(titreHom5)) valeur += `

${titreHom5}

- Une référence éditoriale atteste la cible, jamais le type. Le contrôle exhaustif des citations a fait reclasser six liens de type 1 en type 2 : dans la traduction française, 1 Co 2,9, Rm 8,22-23, Ps 33,22 et les deux reprises de Jon 3,4 sont fondus dans la syntaxe de Chrysostome, même lorsque le témoin moderne les imprime comme discours direct.
- Une note correcte peut masquer une seconde source non annotée. La note [[117]] « Jean 11 » vise Jn 11,25 au segment 661, mais le segment 660 reprend d’abord « morte quoique vivante » de 1 Tm 5,6. Après chaque note résolue, relire au moins le segment précédent et le suivant pour repérer les citations adjacentes que l’appareil n’a pas relevées.
- Les numéros fautifs « 1 Cor. 4 » ont deux solutions différentes selon le contenu : [[116]] = 1 Co 11,1 (« soyez mes imitateurs »), tandis que [[122]] = 1 Co 14,20 (« enfants quant à la malice »). Une même coquille imprimée ne doit jamais entraîner une correction uniforme.
- Une divergence de leçon n’empêche pas l’identification sémantique. La menace de Ninive porte « trois jours » chez Chrysostome et dans la Septante, mais le créneau canonique local Jon 3,4 affiche « quarante jours » : le canon_id reste Jon 3,4, avec la variante explicitée dans le motif.
- Les commentaires continus ont été bornés par leurs transitions réelles : Job 1-2 aux segments 627-646, Lc 16 aux segments 669-671, Gn 4 aux segments 674-676, Jon 3 aux segments 710-730 avec reprise 740-741, et Jon 1 aux segments 731-739 avec synthèse 741. Le contrôle de couverture donne 76/76 cibles de chapitre attendues, sans trou.
- Homélie V : 149 segments lus, 137 liens (10 type 1, 25 type 2, 98 type 3, 4 type 4). Le sondage final n’a révélé aucune nouvelle erreur.
`

const titreHom6 = '#### Homélie VI'
if (!valeur.includes(titreHom6)) valeur += `

${titreHom6}

- Une édition parallèle annotée peut révéler des références que l’appareil français omet, mais il faut ensuite vérifier que la formulation subsiste réellement dans la traduction étudiée. Cette double lecture a retrouvé Qo 1,9, 1 Co 15,31, Si 4,3 et Mt 25,35 ; elle a écarté Is 26,12 et Dt 6,7, dont les phrases correspondantes ont été supprimées ou trop transformées en français.
- Une note fautive peut viser une citation composite. [[142]] « Job 3 » doit être corrigée en Jb 1,21, mais le même segment enchaîne aussi 1 Tm 6,7 sans second appel : toujours découper chaque proposition biblique avant d’attribuer une cible unique à la note.
- Deux témoins peuvent proposer des cibles parallèles sans être mutuellement exclusifs. Au segment 868, [[148]] « Sap. 1 » atteste Sg 1,3, tandis que le texte grec transmis par l’édition moderne cite plus littéralement Is 59,2. Conserver les deux liens avec un motif qui distingue le témoin éditorial de la formule source est plus fidèle qu’une correction silencieuse.
- Les notes de chapitre sur Jonas ne dispensent pas de distribuer le commentaire entre les épisodes réellement invoqués : ordre de partir (Jon 1,2 et 3,2), menace (3,4), poisson (2,1 et 2,11), pénitence de Ninive (3,5). Un chapitre entier ne doit pas être posé quand le passage n’en mobilise que quelques scènes déterminées.
- La numérotation locale de Daniel 3 a de nouveau été vérifiée par le texte : « serviteurs du Très-Haut, sortez » = Dn 3,93 et la bénédiction de Nabuchodonosor = Dn 3,95. La note [[147]] « Dan. 1 » est corrigée en Dn 3,18 par le refus explicite de servir les dieux du roi.
- Même au milieu d’un long commentaire narratif, une parenthèse autonome doit rester visible : Daniel 3 couvre 844-853 puis 855-867, mais pas 854, consacré entièrement à Job. Inversement, la comparaison avec Job ne s’étend pas au segment 855, qui est déjà revenu aux actions de Nabuchodonosor.
- Une formule synoptique sans indice discriminant doit rester sans cible : « fruits dignes de pénitence » au segment 893 peut venir de Mt 3,8 ou de Lc 3,8. Elle est consignée « à constituer » plutôt que dupliquée arbitrairement.
- Homélie VI : 119 segments lus, 71 liens (6 type 1, 15 type 2, 45 type 3, 5 type 4), dont un à constituer. Les six citations de type 1 ont été contrôlées exhaustivement ; Daniel 3 couvre 23 segments sur 23 attendus, avec l’interruption justifiée du segment 854.
`

const bilanHom6 = '- Homélie VI : 119 segments lus, 71 liens (6 type 1, 15 type 2, 45 type 3, 5 type 4), dont un à constituer. Les six citations de type 1 ont été contrôlées exhaustivement ; Daniel 3 couvre 23 segments sur 23 attendus, avec l’interruption justifiée du segment 854.'
if (!valeur.includes(bilanHom6)) valeur += `\n${bilanHom6}\n`

const titreHom7 = '#### Homélie VII'
if (!valeur.includes(titreHom7)) valeur += `

${titreHom7}

- La reconstruction éditoriale doit réancrer matériellement les appels, pas seulement retrouver leurs cibles. Les huit appels [[150]] à [[157]] ont été replacés à la fin des propositions documentées ; appels et définitions sont désormais en bijection 8/8.
- Un appel peut avoir glissé de plusieurs segments et son chiffre avoir été corrompu. [[156]] « Isaie 4 », attaché sans sens aux difficultés sur le Sinaï, documente la citation d’Is 6,1-3 aux segments 949-950 : le contenu, la séquence des notes et un témoin annoté convergent vers « Isaie 6 ».
- Une note au seul chapitre ne transforme pas un commentaire précis en commentaire du chapitre entier. « Gen. 1 » et « Gen. 3 » ont été distribués sur Gn 1,1, Gn 1,26, Gn 3,6 et Gn 3,8-9 ; aucune cible de chapitre n’a été ajoutée, puisque Chrysostome n’explique pas l’ensemble de ces chapitres.
- La vérification sémantique d’une citation doit aussi contrôler le texte patristique affiché : l’OCR avait changé « n’engendre que des esclaves » en « des éclairs » dans Ga 4,24, et le premier « Saint » d’Is 6,3 en « Caint ». Ces corruptions ont été corrigées avant validation des liens.
- L’édition parallèle a retrouvé des références non notées dans le français : Rm 5,12, Ps 106,16, He 12,9 et Jn 7,11. Elles n’ont été retenues qu’après comparaison avec les formulations réellement conservées dans les segments.
- Homélie VII : 64 segments lus, 51 liens (11 type 1, 6 type 2, 33 type 3, 1 type 4). Les onze citations ont été contrôlées exhaustivement et les deux commentaires suivis couvrent exactement Gn 1,1/Gn 1,26 puis Gn 3,6/Gn 3,8-9.
`

const titreHom8 = '#### Homélie VIII'
if (!valeur.includes(titreHom8)) valeur += `

${titreHom8}

- Une référence marginale peut survivre dans le corps sans avoir été intégrée à la séquence numérique des notes. « Genes. I. » coupait la citation au segment 959 ; elle est devenue la note [[G1]], sans renuméroter les centaines de notes suivantes. Les clés stockées n’ont pas à être les numéros affichés, puisque l’interface renumérote les appels dans leur ordre d’apparition.
- Le parseur et le rendu des notes limitaient les clés à deux caractères, rendant inactifs tous les appels [[100]] et suivants. Ils acceptent désormais les clés alphanumériques de longueur quelconque ; un test direct confirme la lecture simultanée de [[99]], [[158]] et [[G1]].
- Une chaîne de notes serrée doit être reconstruite globalement avant de replacer chaque appel. Aux segments 980-982, les renvois vers 4 R 2, Dn 3, 4 R 6, Ex 14 et Ac 19 avaient glissé ou s’étaient croisés entre le manteau, les chaussures, le fer, la verge et les vêtements. Retirer d’abord tous les appels de la zone évite qu’un marqueur encore présent casse l’ancre du suivant.
- Les anciens livres des Règnes exigent d’identifier le personnage avant de corriger le numéro : Achab et Élie relèvent de 3 R 18 = 1 R 18 canonique ; le manteau d’Élie et le miracle du fer relèvent de 4 R 2 et 4 R 6 = 2 R 2 et 2 R 6.
- La note [[163]] « Dan. 3.22 » ne peut pas être transposée numériquement : la chaussure des trois jeunes gens épargnée par les flammes correspond sémantiquement au créneau local Dn 3,94, qui décrit leurs vêtements demeurés intacts.
- Un verset bref peut structurer un développement beaucoup plus long que sa citation. Pr 28,1 gouverne les segments 976-991 : conscience fuyante de l’impie, assurance d’Élie, puissance des saints enchaînés et armes spirituelles du juste. La couverture a été établie par le raisonnement, non par répétition lexicale.
- Lors du contrôle, la conversion du geôlier a été resserrée d’Ac 16,31 vers Ac 16,34 : le segment décrit le résultat (« gagné à Jésus-Christ »), non l’impératif « crois au Seigneur Jésus ».
- Homélie VIII : 64 segments lus, 68 liens (8 type 1, 16 type 2, 41 type 3, 3 type 4). Les huit citations ont été contrôlées exhaustivement ; les quatorze appels et leurs quatorze définitions sont en bijection.
`

const titreHom9 = '#### Homélie IX'
if (!valeur.includes(titreHom9)) valeur += `

${titreHom9}

- Une traduction ancienne peut condenser ou supprimer les citations exactes tout en conservant les références marginales. Aux segments 1077-1081, le témoin parallèle cite Ps 23,2, Ps 135,6, Jb 26,7, Ps 94,4 et de nouveau Ps 23,2 ; le français les résume en « passages de l’Écriture ». Les liens sont donc des reprises/commentaires, non des types 1 artificiels.
- Les chaînes marginales doivent être rapprochées de la structure argumentative avant tout réancrage. [[181]] « Psal. 23 » se trouvait devant le développement sur le feu, mais clôt en réalité la série des trois preuves scripturaires concernant le fondement de la terre au segment 1081.
- Deux références marginales non numérotées avaient été absorbées par l’OCR : « Jean 13 » au segment 1033 et « Matth. 5 » au segment 1098. Elles sont devenues [[J1]] et [[M1]], sans renuméroter les notes 171-184 ; appels et définitions sont en bijection 16/16.
- Le numéro du Psaume et celui du verset imprimés ne doivent jamais être transposés. « Psal. 18 » correspond sémantiquement à PSA.18.2 dans l’ossature locale (« Les cieux racontent la gloire de Dieu »), tandis que les créneaux PSA.19.* portent un autre psaume. La recherche textuelle a aussi rétabli « Ibid. 135 » en PSA.135.6, et non PSA.136.6.
- Une homélie annoncée comme commentaire d’une parole doit être couverte jusqu’à sa véritable application finale. Ps 18,2 gouverne les segments 1055-1098 : description des cieux, des saisons, de la terre sur les eaux, du soleil, de la mer et des éléments, puis appel à glorifier Dieu par la conduite chrétienne.
- Une allusion manifestement scripturaire mais multi-locus reste déclarée en base : « séparé de corps, présent en esprit » (1 Co 5,3 ou Col 2,5) et la semence sur les rochers et les épines (Mt 13, Mc 4 ou Lc 8) demeurent « à constituer ».
- Homélie IX : 88 segments lus, 107 liens (4 type 1, 20 type 2, 82 type 3, 1 type 4), dont deux à constituer. Le sondage ciblé de douze liens et le contrôle exhaustif des quatre types 1 n’ont révélé aucune erreur ; la couverture de Ps 18,2 est continue sur 44 segments.
`

const titreHom10 = '#### Homélie X'
if (!valeur.includes(titreHom10)) valeur += `

${titreHom10}

- Une bijection formelle entre appels et définitions ne suffit pas à garantir la réalité des notes. Sur la page 178, l’unique mention marginale « Ibid. 18 » avait été scindée par l’OCR en deux notes fictivement distinctes, « Ibid. » et « Psal. 1. ». Le fac-similé a permis de supprimer la note fantôme [[201]] et de rétablir une seule note [[200]] « Ibid. 18 ».
- Une chaîne marginale dégradée doit être reconstruite à la fois par le fac-similé et par le contenu biblique. La série des pages 177-179 a rétabli « Act. 14 » à la place de « Matt. 14 », « Eccli. 43 » à la place d’« Eccli. 42 », « Jerem. 23 » à la place de « Jerem. 3 » et « Luc 18 » à la place de « Luc 13 ».
- La position verticale d’une référence marginale ne suffit pas à déterminer son ancre. Dans la série sur le soleil, Ps 18,2 annonce la gloire divine, Ps 103,5 évoque la terre fondée, Ps 101,26-27 oppose les cieux périssables à Dieu qui demeure, Ps 18,6 compare le soleil à l’époux et au géant, et Si 43,4 décrit son éclat. Le rattachement a été fait phrase par phrase.
- La lecture intégrale reste nécessaire même lorsque les notes imprimées paraissent nombreuses. Elle a retrouvé sans note propre 2 Tm 4,20 dans « Trophime malade à Milet », Ex 16,4 dans la manne tombée au désert et Rm 8,18 puis 8,21 autour de la note générale « Rom. 8 ».
- Une allusion générique à plusieurs épisodes ne doit pas être forcée vers un seul locus. Les Apôtres qui « ressuscitent les morts » peuvent renvoyer à Ac 9,40 ou Ac 20,10 ; les prodiges de Moïse sur l’air, la mer, la terre et les pierres condensent plusieurs récits. Ces deux cas restent explicitement « à constituer ».
- La reprise annoncée d’une matière précédente peut gouverner une homélie entière. Ps 18,2 demeure le lemme continu des segments 1126-1194 : ordre et beauté de la création manifestent le Créateur, tandis que ses faiblesses empêchent de la diviniser.
- Homélie X : 94 segments lus, 118 liens (20 type 1, 17 type 2, 81 type 3), dont deux à constituer. Le contrôle par sondage et le contrôle exhaustif des vingt types 1 n’ont révélé aucune erreur ; les références éditoriales forment une bijection de 26 appels et 26 définitions après suppression de la note fantôme.
`

const titreHom11 = '#### Homélie XI'
if (!valeur.includes(titreHom11)) valeur += `

${titreHom11}

- Il faut distinguer une corruption d’OCR d’une erreur réellement imprimée. Le fac-similé porte « Ezech. 28 », devenu « Ezech. 18 » dans la base : la note est réparée. Il porte en revanche réellement « 2. Cor. 12 » devant la citation de 1 Co 12,21 : la forme fautive de l’édition reste dans la note, tandis que le lien vise la cible sémantique correcte.
- Une référence marginale absorbée dans le corps doit devenir une note même lorsqu’elle est éditorialement fausse. « Exod. y. » au segment 1214 est bien « Exod. 5 » sur le fac-similé ; la phrase « ils ne l’écoutèrent point à cause de leur affliction et de leurs travaux » correspond pourtant à Ex 6,9. L’appel [[E1]] conserve « Exod. 5 » et le lien vise Ex 6,9.
- Une note de chapitre peut couvrir plusieurs propositions qu’il faut distribuer. [[212]] « Job 2 » devient trois reprises distinctes de Jb 2,11-13 : venue des amis, cris et vêtements déchirés, puis silence devant la douleur extrême. [[216]] « Esaie 14 » couvre de même Is 14,13-14, tandis que [[217]] « Ibid. » documente Is 14,11.
- Un commentaire sur la création peut continuer à travers plusieurs homélies sans répéter son lemme. L’Homélie XI reprend explicitement au segment 1220 le principe de beauté et de faiblesse de la création ; Ps 18,2 gouverne donc 1220-1274. Le début de l’Homélie XII confirme rétrospectivement qu’il s’agissait du troisième jour consacré à cette parole.
- À l’intérieur d’un commentaire principal, des sous-commentaires peuvent être continus et se chevaucher : Gn 3,5 structure 1223-1233 sur l’orgueil et la mortalité ; Gn 2,7 structure 1234-1252 sur le corps façonné d’une matière humble ; Gn 1,28 structure 1253-1268 sur la domination rationnelle de l’homme sur les animaux.
- Le rappel final contre les serments vise encore le commandement évangélique de Mt 5,34. Sa couverture commence avec l’annonce du commandement au segment 1275 et s’achève avec la préparation à la communion pascale au segment 1282 ; Is 58,4-5 et 2 Co 6,14-15 sont des appuis locaux à l’intérieur de ce bloc.
- Homélie XI : 79 segments lus, 139 liens (11 type 1, 9 type 2, 118 type 3, 1 type 4). Le sondage et le contrôle exhaustif des onze citations n’ont révélé aucune erreur ; les références éditoriales forment une bijection de 11 appels et 11 définitions.
`

const titreHom12 = '#### Homélie XII'
if (!valeur.includes(titreHom12)) valeur += `

${titreHom12}

- Une référence marginale et la phrase qu’elle documentait peuvent connaître des sorts différents dans une traduction. Le fac-similé conserve « Esaie 1 » dans la chaîne des animaux, tandis que le français omet le bœuf et l’âne d’Is 1,3 présents dans le témoin parallèle : conserver la note et poser un type 4 explicite rend cette lacune éditoriale visible sans inventer une citation locale.
- Dans une chaîne serrée, il faut identifier chaque référence par son image avant de suivre l’ordre des marqueurs OCR. Sur la page 202, « Matt. 10 » vise la simplicité de la colombe (Mt 10,16), « Matt. 6 » les oiseaux nourris par le Père (Mt 6,26), et « Hier. 8 » l’hirondelle et la tourterelle (Jr 8,7). L’OCR avait croisé ces appels entre deux segments.
- Une référence composite peut perdre sa seconde moitié. Le fac-similé porte « Psal. 13. & 139. » devant le venin du serpent ; la base ne conservait que « Psal. 13. ». Restaurer toute la note conduit à deux reprises distinctes, Ps 13,3 et Ps 139,4, confirmées par le texte local.
- Les références imprimées fautives doivent être séparées des corruptions d’OCR. « Eccles. 7 », « Deut. 24 », « Genes. 2 », « Rom. 3 » et « Matt. 18 » sont conservés dans les notes faute de preuve matérielle contraire, mais les liens visent respectivement Si 3,22, Dt 5,15, Gn 3,12-13, Rm 2,14-16 et Mt 25,26-27 d’après la formulation. En revanche, « Matt. 19 » a été corrigé en « Matt. 10 » parce que le fac-similé le montre.
- Des références marginales absorbées peuvent avoir glissé loin de leur proposition. « Ibid. » a été extrait du segment 1352 et rattaché à Rm 2,12 ; « Rom. 1 » a été déplacé vers le segment 1358, où se trouve la reprise de Rm 1,32. Leur position OCR ne devait pas primer sur l’enchaînement paulinien.
- Le thème de la loi naturelle doit être reconnu comme un commentaire continu, non comme une collection de citations isolées. Rm 2,15 gouverne les segments 1330-1366 : connaissance spontanée du bien et du mal, conscience d’Adam et de Caïn, puis démonstration explicite de Paul. Les versets voisins de Rm 1-2 forment des sous-commentaires plus courts, bornés par les transitions du raisonnement.
- Homélie XII : 99 segments lus, 214 liens (28 type 1, 19 type 2, 166 type 3, 1 type 4). Le sondage propre à l’homélie est juste à 15/15 et les vingt-huit citations ont été contrôlées exhaustivement ; les références éditoriales forment une bijection de 30 appels et 30 définitions.
`

const titreHom13 = '#### Homélie XIII'
if (!valeur.includes(titreHom13)) valeur += `

${titreHom13}

- Le texte accessible et le fac-similé doivent être confrontés jusque dans les références marginales courtes. L’OCR avait transformé « Tob. 4 » en la note [[253]] « Job. 4 », réduit « Eccles. 13 » à « Eccles: ui: » dans le corps et « Matt. 18 » à « Mattus ». L’image a permis de rétablir Tb 4,16, Si 13,15 et Mt 18,12-13 sans conjecture paléographique.
- Une référence peut disparaître entièrement de l’import. « 1. Cor. 5 » est visible dans la marge de la page 222 devant l’unique fornicateur de Corinthe, mais n’avait laissé ni appel ni définition en base. La comparaison phrase par phrase avec le fac-similé est donc nécessaire même quand la suite numérique des notes paraît complète.
- Deux notes contiguës peuvent avoir glissé ensemble tout en conservant leur ordre. Sur la page 223, « Eccl. 29 » accompagne l’impossibilité d’accomplir des œuvres méritoires à la place d’autrui, et « Rom. 2 » la responsabilité de chacun devant Dieu. Elles ont été réunies au segment 1452, avec deux appels distincts.
- Une référence réellement imprimée n’autorise pas une cible arbitraire. Aucun verset de Qohélet ou de Siracide 29 ne correspond assez à l’impossibilité de transférer ses mérites : [[254]] « Eccl. 29 » est conservée en note et déclarée « à constituer » sans cible. Le manque devient visible dans l’outil éditorial sans fabriquer un rapprochement.
- Un commentaire peut reprendre explicitement le développement de l’homélie précédente sans répéter sa citation principale. « Nous la retoucherons aujourd’hui » prolonge la loi naturelle de Rm 2,15 sur les segments 1417-1441 ; la continuité inter-homélies est confirmée par cette annonce, puis bornée par le retour aux serments.
- Les références perdues ne sont pas nécessairement des citations. La brebis perdue (Mt 18,12-13), l’unique fornicateur de Corinthe (1 Co 5,1) et la responsabilité selon les œuvres (Rm 2,6) sont fondues dans l’argument : leur présence marginale atteste la cible, tandis que la lecture impose le type 2 et, lorsque Chrysostome les applique, le type 3.
- Homélie XIII : 74 segments lus, 81 liens (6 type 1, 8 type 2, 67 type 3), dont un à constituer. Le sondage propre à l’homélie est juste à 15/15 et les six citations ont été contrôlées exhaustivement ; les références éditoriales forment une bijection de 10 appels et 10 définitions.
`

const titreHom14 = '#### Homélie XIV'
if (!valeur.includes(titreHom14)) valeur += `

${titreHom14}

- Une référence imprimée fautive doit rester littéralement fidèle dans la note, tandis que le lien doit suivre la formulation biblique. « Psal. 39 » accompagne en réalité Ps 93,19 et « 2. Cor. 2 » accompagne 2 Co 1,8-9 : le fac-similé confirme que ces deux erreurs appartiennent à l’édition, non à l’OCR.
- La position matérielle d’une référence marginale ne suffit pas à créer un lien local. Un « 1. Reg. 14 » apparaît au sommet de la page 226 à côté de la continuation de 2 Co 1 ; il est conservé par un appel [[R1]], mais aucun lien vers 1 S 14 n’est posé à cet endroit. Les liens de 1 S 14 commencent seulement avec le récit de Jonathan.
- La comparaison de chaque page permet de récupérer les références entièrement absorbées par le corps. « Genes. 22 » était devenu le fantôme OCR « Genesazen » au milieu de la phrase sur Isaac : il faut nettoyer ce résidu, restaurer la note [[G1]] et viser Gn 22,12.
- Les erreurs de chapitre doivent être décidées sur l’image, non par ressemblance typographique. Le fac-similé corrige [[260]] de « 1. Reg. 1 » en « 1. Reg. 14 », [[263]] de « LReg.14 » en « 1. Reg. 14 » et [[268]] de « Eccl. 27 » en « Eccl. 23 » ; cette dernière citation correspond exactement à Si 23,10.
- Une longue narration biblique gagne à recevoir un commentaire de chapitre continu, puis seulement les versets localement cités ou repris. 1 Samuel 14 gouverne trois blocs séparés par les digressions sur Jephté, Isaac et les Madianites ; ces digressions doivent interrompre le chapitre principal au lieu d’être artificiellement englobées.
- Un détail historique proche mais non identique doit rester un écho. Chrysostome parle des Madianites plaçant leurs filles devant l’armée, alors que Nb 25,1 parle des filles de Moab et Nb 31,16 attribue leur séduction au conseil de Balaam : Nb 31,16 est donc un type 4, non une citation ni une reprise littérale.
- Homélie XIV : 100 segments lus, 263 liens (21 type 1, 19 type 2, 222 type 3, 1 type 4). Le contrôle obligatoire a été exécuté et les vingt-et-une citations ont été vérifiées exhaustivement ; les références éditoriales forment une bijection de 15 appels et 15 définitions.
`

const titreHom15 = '#### Homélie XV'
if (!valeur.includes(titreHom15)) valeur += `

${titreHom15}

- Une référence peut appartenir au sommaire éditorial plutôt qu’au corps de l’homélie. Le fac-similé porte réellement « Philem. » à côté de la phrase du sommaire sur la marche au milieu des pièges. Comme le sommaire n’a pas de champ de notes propre, [[P1]] est déplacée vers la reprise effective de cette phrase au segment 1585, à côté de [[272]] « Eccles. 9 » ; la forme fautive « Philem. » reste littéralement conservée.
- Une note tronquée doit être complétée d’après l’image avant de distribuer ses cibles. [[271]] ne porte pas seulement « Eccles. 1 », mais « Eccles. 1. & 12. » : la sentence « Vanité des vanités » produit donc deux citations, Qo 1,2 et Qo 12,8.
- Deux témoins peuvent conserver la référence tout en supprimant la proposition citée. [[277]] « 1. Tim. 5 » renvoie à 1 Tm 5,6, mais la traduction française omet « celle qui vit dans les délices est morte quoiqu’elle vive » ; [[279]] « Prov. 6 » renvoie à Pr 6,2, mais omet les lèvres prises par leurs propres paroles. La note reste, et un type 4 documente la trace éditoriale sans inventer un type 1 local.
- Les réclames de bas de page peuvent entrer dans le corps comme répétitions. « toujours victorieux, victorieux, dans la pauvreté » provenait de la réclame « victorieux » au bas de la page 248, répétée normalement en tête de la page 249 : supprimer le premier doublon restaure le texte sans modernisation conjecturale.
- Un chapitre imprimé peut être matériellement faux alors que la formulation est sûre. [[270]] « Eccl. 6 » accompagne la maison de deuil préférable à la maison de joie, qui correspond à Qo 7,2. La note conserve « Eccl. 6 » et le lien vise Qo 7,2.
- Une narration grecque peut différer du texte local sans changer la cible. Za 5,1-4 est rendu par une « faulx volante » dans Chrysostome, là où l’ossature locale affiche un rouleau volant ; l’ordre de la vision, les dimensions et la maison consumée établissent néanmoins la citation, et Za 5 reçoit aussi une cible de chapitre pour le commentaire continu.
- Homélie XV : 86 segments lus, 123 liens (12 type 1, 5 type 2, 104 type 3, 2 type 4). Le contrôle obligatoire et le contrôle exhaustif des douze citations n’ont révélé aucune erreur ; les références éditoriales forment une bijection de 15 appels et 15 définitions.
`

const { error: erreurUpdate } = await sb.from('parametres').update({
  valeur,
  mis_a_jour: new Date().toISOString(),
}).eq('cle', CLE)
if (erreurUpdate) throw erreurUpdate

const { data: verif, error: erreurVerif } = await sb.from('parametres').select('valeur').eq('cle', CLE).single()
if (erreurVerif) throw erreurVerif
if (!String(verif.valeur).includes(titre) || !String(verif.valeur).includes(titreHom3) || !String(verif.valeur).includes(titreRepriseHom1) || !String(verif.valeur).includes(titreHom4) || !String(verif.valeur).includes(titreHom5) || !String(verif.valeur).includes(titreHom6) || !String(verif.valeur).includes(bilanHom6) || !String(verif.valeur).includes(titreHom7) || !String(verif.valeur).includes(titreHom8) || !String(verif.valeur).includes(titreHom9) || !String(verif.valeur).includes(titreHom10) || !String(verif.valeur).includes(titreHom11) || !String(verif.valeur).includes(titreHom12) || !String(verif.valeur).includes(titreHom13) || !String(verif.valeur).includes(titreHom14) || !String(verif.valeur).includes(titreHom15) || String(verif.valeur).includes('Hom?lies au peuple'))
  throw new Error('La mémoire UTF-8 n’a pas été réparée correctement')
console.log('✓ mémoire feedback_liens_protocole réparée et complétée en UTF-8')
