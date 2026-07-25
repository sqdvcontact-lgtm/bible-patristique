// Passe sémantique RAISONNÉE — Augustin, « Les Confessions » (A0010O0001).
// PILOTE : Livre I, chapitres I-IV (segments 1-40).
//
// Les Confessions ne CITENT presque jamais franchement : Augustin tisse l'Écriture
// dans sa prière. C'est le terrain des types 3 (commentaire) et 4 (écho), quasi
// absents jusqu'ici. Raisonnement appliqué segment par segment :
//   1. cite un verset (guillemets / formule) → type 1
//   2. dit quelque chose d'un verset (l'explique, l'applique) → type 3 (même s'il
//      ne le cite pas ; un verset cité PUIS commenté porte 1 ET 3)
//   3. fait écho sans citer → type 4, SEULEMENT si (a) ancre précise vers UN
//      passage, (b) intention plausible, (c) pas déjà cité, (d) raison écrite.
// Écho = douteux + arbitrage par principe (jugement). Psaumes donnés en héb.,
// convertis vers l'ossature grecque.

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = 'A0010O0001';
const P = 'probable', D = 'douteux';

// [ cible, type, fiabilite, motif ]  — cible : canon direct, ou {psH:[chHeb,vHeb]}
const LIENS = {
  1:  [['PSA.145.3', 1, P, 'Cite Ps 145 (144), 3 : « Vous êtes grand, Seigneur, digne de louanges ; grande est votre puissance ».', { psH: [145, 3] }],
       ['PSA.147.5', 1, P, 'Cite Ps 147 (146), 5 : « il n’est point de mesure à votre sagesse ».', { psH: [147, 5] }]],
  2:  [['JAS.4.6', 2, D, 'REPRISE (mots fondus dans la phrase) : « vous résistez aux superbes » coule les mots de « Deus superbis resistit » — Jc 4, 6 (cf. 1 P 5, 5 ; Pr 3, 34).'],
       ['GEN.2.7', 4, D, 'ÉCHO thématique : « être de boue, promenant sa mortalité » renvoie à l’homme formé du limon — Gn 2, 7 (cf. Jb 10, 9). Résonance d’idée (fragilité, poussière), pas emprunt verbal.']],
  10: [['ROM.10.14', 1, P, 'Cite Rm 10, 14 : « comment croire, sans apôtre [prédicateur] ? ».'],
       ['PSA.22.27', 1, P, 'Cite Ps 22 (21), 27 : « Ceux-là loueront le Seigneur, qui le recherchent ».', { psH: [22, 27] }]],
  11: [['PSA.22.27', 3, P, 'COMMENTE Ps 22 (21), 27 cité au segment précédent : « le cherchant, ils le trouveront, et le trouvant, ils le loueront » — Augustin déploie la chaîne chercher→trouver→louer.', { psH: [22, 27] }]],
  21: [['PSA.139.8', 1, P, 'Cite Ps 139 (138), 8 : « si je descends en enfer, je vous y trouve ».', { psH: [139, 8] }]],
  23: [['ROM.11.36', 1, P, 'Cite Rm 11, 36 : « de qui, par qui et en qui toutes choses sont ».']],
  25: [['JER.23.24', 1, P, 'Cite Jr 23, 24 : « C’est moi qui remplis le ciel et la terre ».']],
  26: [['JER.23.24', 3, P, 'COMMENTE Jr 23, 24 : « Êtes-vous contenu par le ciel et la terre parce que vous les remplissez ? » — le chapitre III interroge le « remplir » du verset cité.']],
  31: [['JER.23.24', 3, P, 'COMMENTE Jr 23, 24 : « Remplissant tout, est-ce de vous tout entier que vous remplissez toutes choses ? ».']],
  35: [['PSA.18.32', 1, P, 'Cite Ps 18 (17), 32 : « quel autre Seigneur que le Seigneur ? quel autre Dieu que notre Dieu ? ».', { psH: [18, 32] }]],
  45: [['PSA.35.3', 1, P, 'Cite Ps 35 (34), 3 : « Je suis ton salut ».', { psH: [35, 3] }]],
  52: [['PSA.35.3', 1, P, 'Cite Ps 35 (34), 3 : « dites à mon âme : Je suis ton salut » (repris).', { psH: [35, 3] }]],
  59: [['PSA.19.13', 1, P, 'Cite Ps 19 (18), 13-14 : « Purifiez-moi de mes secrètes souillures… n’imputez pas celles d’autrui à votre serviteur ».', { psH: [19, 13] }],
       ['PSA.116.10', 1, P, 'Cite Ps 116 (115), 10 : « Je crois, c’est pourquoi je parle » (cf. 2 Co 4, 13).', { psH: [116, 10] }]],
  62: [['PSA.27.12', 1, P, 'Cite Ps 27 (26), 12 : « mon iniquité ne mente à elle-même ».', { psH: [27, 12] }]],
  63: [['PSA.130.3', 1, P, 'Cite Ps 130 (129), 3 : « si vous pesez les iniquités, Seigneur, Seigneur, qui pourra tenir ? ».', { psH: [130, 3] }]],
  64: [['GEN.18.27', 2, D, 'REPRISE : « moi, terre et cendre » coule les mots d’Abraham « je ne suis que poussière et cendre » — Gn 18, 27.']],
  93: [['MAT.11.25', 2, D, 'REPRISE : « Seigneur du ciel et de la terre » — titre emprunté à Mt 11, 25 (cf. Ac 17, 24).']],
  98: [['MAL.3.6', 2, D, 'REPRISE : « vous êtes le Très-Haut, et vous ne changez pas » — les mots de « Ego Dominus et non mutor », Ml 3, 6.']],
  101:[['PSA.102.28', 2, P, 'REPRISE : « Mais vous, vous êtes le même… vos années ne manquent point » — Ps 102 (101), 28 (cf. He 1, 12).', { psH: [102, 28] }]],
  107:[['JOB.14.4', 1, P, 'Cite Jb 14, 4-5 : « personne n’est pur de péchés devant vous, pas même l’enfant dont la vie sur la terre est d’un jour ».']],
  115:[['JOB.14.4', 3, P, 'COMMENTE Jb 14, 4 : « la faiblesse du corps au premier âge est innocente, l’âme ne l’est pas » — Augustin en tire la doctrine du péché dès l’enfance.']],
  126:[['PSA.51.7', 1, P, 'Cite Ps 51 (50), 7 : « j’ai été conçu en iniquité, le sein de ma mère m’a nourri dans le péché ».', { psH: [51, 7] }],
       ['PSA.51.7', 3, P, 'COMMENTE Ps 51 (50), 7 : « où donc et quand fut-il innocent ? » — l’aveu sert la doctrine du péché originel.', { psH: [51, 7] }]],
  176:[['GEN.1.27', 4, D, 'ÉCHO : « le limon informe » / « l’image divine » renvoie à l’homme fait à l’image de Dieu et du limon — Gn 1, 27 (cf. Gn 2, 7). Résonance, non emprunt verbal.']],
  182:[['MAT.10.30', 1, P, 'Cite Mt 10, 30 : « vous qui savez le compte des cheveux de notre tête ».']],
  194:[['JAS.4.4', 2, P, 'REPRISE : « l’amour de ce monde est un divorce adultère d’avec vous » reformule Jc 4, 4 (« l’amitié du monde est inimitié contre Dieu »).']],
  196:[['GEN.3.19', 2, P, 'REPRISE : « terre retournant à la terre » — les mots de « tu es poussière et tu retourneras à la poussière », Gn 3, 19.']],
  256:[['PSA.86.15', 1, P, 'Cite Ps 86 (85), 15 : « patient, miséricordieux et vrai ».', { psH: [86, 15] }]],
  257:[['PSA.27.8', 1, P, 'Cite Ps 27 (26), 8 : « J’ai cherché votre visage ; votre visage, Seigneur, je le chercherai toujours ».', { psH: [27, 8] }]],
  283:[['MAT.19.14', 1, P, 'Cite Mt 19, 14 : « Le royaume des cieux est à ceux qui leur ressemblent » (cf. Mt 18, 3).']],

  // ── Livre II ───────────────────────────────────────────────────────────────
  309:[['1CO.7.1', 1, P, 'Cite 1 Co 7, 1 : « Il est bon à l’homme de ne point toucher de femme ».'],
       ['1CO.7.28', 1, P, 'Cite 1 Co 7, 28 : « Ils souffriront des tribulations dans leur chair, et moi je vous les épargne ».'],
       ['1CO.7.32', 1, P, 'Cite 1 Co 7, 32-33 : « Celui qui est sans femme pense aux choses de Dieu… celui qui est lié pense aux choses du monde ».']],
  310:[['MAT.19.12', 2, D, 'REPRISE : « eunuque de volonté en vue du royaume des cieux » — les mots de Mt 19, 12 fondus dans la phrase.']],
  313:[['PSA.94.20', 1, P, 'Cite Ps 94 (93), 20 : « qui faites entrer la douleur dans le précepte ».', { psH: [94, 20] }],
       ['DEU.32.39', 1, P, 'Cite Dt 32, 39 : « qui frappez pour guérir, qui tuez pour nous empêcher de mourir » (cf. Jb 5, 18).']],
  328:[['1CO.3.16', 2, D, 'REPRISE : « vous aviez commencé votre temple… votre sainte habitation » — l’âme temple de Dieu, 1 Co 3, 16 (cf. 6, 19).']],
  348:[['PSA.73.7', 1, P, 'Cite Ps 73 (72), 7 : « Et mon iniquité naissait comme de mon embonpoint ».', { psH: [73, 7] }]],
  349:[['EXO.20.15', 3, P, 'COMMENTE Ex 20, 15 : « Le larcin est condamné par votre loi divine » — Augustin applique le précepte « tu ne voleras pas ».'],
       ['ROM.2.15', 2, D, 'REPRISE : « cette loi écrite au cœur des hommes que leur iniquité n’efface pas » — Rm 2, 15.']],
  406:[['PSA.73.27', 2, D, 'REPRISE : « l’âme devient adultère lorsque, détournée de vous » — Ps 73 (72), 27 (« qui fornicantur abs te »).', { psH: [73, 27] }]],
  416:[['PSA.116.12', 1, P, 'Cite Ps 116 (115), 12 : « Que rendrai-je au Seigneur… ? ».', { psH: [116, 12] }]],
  439:[['PSA.19.12', 1, P, 'Cite Ps 19 (18), 12 : « Oh ! qui peut sonder l’abîme des péchés ? » (« delicta quis intellegit »).', { psH: [19, 12] }]],
  451:[['MAT.25.21', 1, P, 'Cite Mt 25, 21 : « entre dans la joie de son Seigneur ».']],
  453:[['LUK.15.14', 4, D, 'ÉCHO : « je suis devenu à moi-même une contrée d’indigence » — la « région lointaine » du fils prodigue affamé, Lc 15, 14. Résonance narrative.']],

  // ── Livre III ──────────────────────────────────────────────────────────────
  492:[['LUK.15.4', 4, D, 'ÉCHO : « Pauvre brebis égarée de votre troupeau » — la brebis perdue, Lc 15, 4 (cf. Ps 119, 176). Résonance.']],
  523:[['COL.2.8', 1, P, 'Cite Col 2, 8 : « Prenez garde que personne ne vous surprenne par la philosophie… selon les traditions des hommes… et non selon le Christ ».'],
       ['COL.2.9', 1, P, 'Cite Col 2, 9 : « car en lui habite corporellement toute la plénitude de la divinité ».']],
  554:[['LUK.15.16', 2, D, 'REPRISE : « sevré même du gland dont je paissais les pourceaux » — les mots du fils prodigue, Lc 15, 16.']],
  563:[['PRO.9.17', 1, P, 'Cite Pr 9, 17 (la Folie) : « le pain caché est plus agréable et les eaux dérobées sont plus douces ».']],
  569:[['JHN.4.24', 1, P, 'Cite Jn 4, 24 : « Dieu est un esprit ».']],
  571:[['GEN.1.27', 1, P, 'Cite Gn 1, 27 : « nous sommes faits à son image ».'],
       ['GEN.1.27', 3, P, 'COMMENTE Gn 1, 27 : « en quel sens l’Écriture a raison de dire que nous sommes faits à son image » — Augustin cherche ce qu’est l’image de Dieu en l’homme.']],
  588:[['MAT.22.37', 2, P, 'REPRISE : « aimer Dieu de tout son cœur, de toute son âme, de tout son esprit, et son prochain comme soi-même » — Mt 22, 37-39 (Dt 6, 5 ; Lv 19, 18).']],
  603:[['PSA.144.9', 2, D, 'REPRISE : « l’harmonie des dix cordes, le psaltérion de votre décalogue » — Ps 144 (143), 9 (« psalterio decem chordarum »), allégorie du décalogue.', { psH: [144, 9] }]],
  608:[['ACT.26.14', 2, P, 'REPRISE : « regimbent contre l’aiguillon » — Ac 26, 14 (« durum est contra stimulum calcitrare »).']],
  628:[['PSA.144.7', 2, D, 'REPRISE : « vous avez étendu votre main d’en-haut, et de ces profondes ténèbres vous avez retiré mon âme » — Ps 144 (143), 7.', { psH: [144, 7] }]],
  589:[['GEN.19.5', 4, D, 'ÉCHO : « les crimes contre nature, tels que ceux de Sodome » — renvoi au péché de Sodome, Gn 19, 5.']],

  // ── Livre IV ───────────────────────────────────────────────────────────────
  668:[['PSA.4.3', 1, P, 'Cite Ps 4, 3 : « ces amateurs de vanité, ces chercheurs de mensonge ».', { psH: [4, 3] }]],
  681:[['PSA.41.5', 1, P, 'Cite Ps 41 (40), 5 : « Ayez pitié de moi, guérissez mon âme, parce que j’ai péché contre vous ».', { psH: [41, 5] }]],
  682:[['JHN.5.14', 1, P, 'Cite Jn 5, 14 : « Voilà que tu es guéri ; garde-toi de pécher désormais, de peur qu’il ne t’arrive pis ».']],
  686:[['PSA.51.19', 1, P, 'Cite Ps 51 (50), 19 : « vous ne méprisez pas un cœur contrit et humilié » (avec « rendez à chacun selon ses œuvres »).', { psH: [51, 19] }]],
  689:[['JAS.4.6', 1, P, 'Cite Jc 4, 6 : « qui résistez aux superbes et faites grâce aux humbles » (cf. 1 P 5, 5).']],
  705:[['ROM.5.5', 1, P, 'Cite Rm 5, 5 : « par la charité, dont le Saint-Esprit, votre don, comble nos cœurs ».']],
  727:[['PSA.42.6', 1, P, 'Cite Ps 42 (41), 6 : « pourquoi elle était triste et me troublait ainsi » (« Espère en Dieu »).', { psH: [42, 6] }]],
  787:[['PSA.80.8', 1, P, 'Cite Ps 80 (79), 8 : « Dieu des vertus, convertissez-nous, montrez-nous votre face, et nous serons sauvés ».', { psH: [80, 8] }]],
  820:[['ACT.17.27', 2, D, 'REPRISE : « il n’est pas loin de ses créatures » — Ac 17, 27 (« non longe est ab unoquoque nostrum »).']],
  823:[['ISA.46.8', 1, P, 'Cite Is 46, 8 : « Revenez à votre cœur, hommes de péchés ».']],
  834:[['PSA.19.6', 1, P, 'Cite Ps 19 (18), 6 : « il est sorti comme l’époux de sa couche, et comme un géant qui dévore sa carrière ».', { psH: [19, 6] }]],
  838:[['JHN.1.10', 1, P, 'Cite Jn 1, 10 : « car le monde a été fait par lui ; et il était dans ce monde ».'],
       ['1TI.1.15', 1, P, 'Cite 1 Tm 1, 15 : « et dans ce monde il est venu sauver les pécheurs ».']],
  839:[['PSA.4.3', 1, P, 'Cite Ps 4, 3 : « Fils des hommes, jusques à quand porterez-vous un cœur appesanti ? ».', { psH: [4, 3] }]],
  867:[['MAT.10.30', 1, P, 'Cite Mt 10, 30 : « l’homme, dont les cheveux mêmes vous sont comptés ».']],
  877:[['PSA.72.18', 1, P, 'Cite Ps 72 (71), 18 : « seul auteur de tant de merveilles ».', { psH: [72, 18] }]],
  890:[['PSA.18.29', 1, P, 'Cite Ps 18 (17), 29 : « C’est vous qui allumez ma lampe… qui éclairez mes ténèbres ».', { psH: [18, 29] }],
       ['JHN.1.9', 1, P, 'Cite Jn 1, 9 : « la vraie lumière qui éclaire tout homme venant au monde ».']],
  902:[['PSA.51.10', 1, P, 'Cite Ps 51 (50), 10 : « mes os ne tressaillaient pas, n’étant point encore humiliés ».', { psH: [51, 10] }]],
  913:[['GEN.3.18', 1, P, 'Cite Gn 3, 18-19 : « la terre me produisait des chardons et des ronces ; au prix de mes sueurs gagner mon pain ».']],
  920:[['LUK.15.13', 1, P, 'Cite Lc 15, 13 : « je suis allé dans une terre étrangère » (le fils prodigue).']],
  928:[['PSA.17.8', 1, P, 'Cite Ps 17 (16), 8 : « espérons en l’abri de vos ailes ; protégez-nous ».', { psH: [17, 8] }]],
  929:[['ISA.46.4', 1, P, 'Cite Is 46, 4 : « et vous nous porterez jusqu’aux cheveux blancs ».']],

  // ── Livre V ────────────────────────────────────────────────────────────────
  937:[['PSA.35.10', 1, P, 'Cite Ps 35 (34), 10 : « Seigneur, qui est semblable à vous ? ».', { psH: [35, 10] }]],
  939:[['PSA.19.7', 1, P, 'Cite Ps 19 (18), 7 : « personne ne se peut dérober à votre chaleur ».', { psH: [19, 7] }]],
  947:[['PSA.139.7', 1, P, 'Cite Ps 139 (138), 7 : « Où ont-ils fui, en fuyant votre face ? ».', { psH: [139, 7] }]],
  949:[['WIS.11.25', 1, P, 'Cite Sg 11, 25 : « vous n’abandonnez rien de ce que vous avez fait ».']],
  965:[['PSA.138.6', 1, P, 'Cite Ps 138 (137), 6 : « vous approchez votre regard des abaissements et vous l’éloignez des hauteurs ».', { psH: [138, 6] }]],
  975:[['PSA.147.5', 1, P, 'Cite Ps 147 (146), 5 : « votre sagesse seule exclut le nombre ».', { psH: [147, 5] }]],
  976:[['1CO.1.30', 2, P, 'REPRISE : « votre Fils s’est fait notre sagesse, notre justice et notre sanctification » — 1 Co 1, 30.'],
       ['MAT.17.27', 2, D, 'REPRISE : « il a payé le tribut à César » — Mt 17, 27 (cf. 22, 21).']],
  978:[['ROM.1.21', 1, P, 'Cite Rm 1, 21 : « et les ténèbres ont envahi la folie de leur cœur ».']],
  982:[['ROM.1.23', 1, P, 'Cite Rm 1, 23 : « ils transforment la gloire du Dieu incorruptible en l’image de l’homme corruptible… ».'],
       ['ROM.1.25', 1, P, 'Cite Rm 1, 25 : « ils adorent et servent la créature de préférence au Créateur ».']],
  992:[['WIS.11.21', 1, P, 'Cite Sg 11, 21 : « selon la mesure, le nombre et le poids ».']],
  995:[['JOB.28.28', 1, P, 'Cite Jb 28, 28 : « Voici la science, c’est la piété ».']],
  1004:[['EPH.4.13', 1, P, 'Cite Ep 4, 13-14 : « jusqu’à ce que le nouvel homme… cesse de flotter à tout vent de doctrine ».']],
  1046:[['PSA.37.23', 1, P, 'Cite Ps 37 (36), 23 : « le Seigneur dirige les pas de l’homme, et lui fait vouloir son chemin ».', { psH: [37, 23] }]],
  1059:[['PSA.142.6', 1, P, 'Cite Ps 142 (141), 6 : « mon espérance et mon héritage dans la terre des vivants ».', { psH: [142, 6] }]],
  1076:[['1CO.15.22', 1, P, 'Cite 1 Co 15, 22 : « nous fait tous mourir en Adam ».']],
  1103:[['PSA.141.3', 1, P, 'Cite Ps 141 (140), 3-4 : « placez la sentinelle à l’entrée de ma bouche… que mon cœur ne se laisse pas glisser aux paroles de malice ».', { psH: [141, 3] }]],
  1140:[['PSA.4.8', 1, P, 'Cite Ps 4, 8 : « la pure substance de votre froment, la joie de vos huiles… de votre vin ».', { psH: [4, 8] }]],

  // ── Livre VI (couche lecture : le matcheur a pris les citations longues) ─────
  1171:[['LUK.7.14', 1, P, 'Cite Lc 7, 14 : « Jeune homme, je te l’ordonne, lève-toi ! » (le fils de la veuve de Naïm).'],
       ['LUK.7.15', 1, P, 'Cite Lc 7, 15 : « reprenant la vie et la parole, fût rendu par vous à sa mère » (filet de rappel).']],
  1176:[['JHN.4.14', 1, P, 'Cite Jn 4, 14 : « la source d’eau vive qui court jusqu’à la vie éternelle ».']],
  1202:[['GEN.1.26', 3, P, 'COMMENTE Gn 1, 26 : « vous n’avez point de forme corporelle, et pourtant vous avez fait l’homme à votre image » — que signifie l’image de Dieu.']],
  1208:[['2CO.3.6', 1, P, 'Cite 2 Co 3, 6 : « La lettre tue et l’esprit vivifie ».']],
  1281:[['PRO.9.8', 1, P, 'Cite Pr 9, 8 : « Reprends le sage et il t’aimera ».']],
  1288:[['ISA.29.13', 2, D, 'REPRISE : « était loin de leur cœur » — Is 29, 13 (« le cœur loin de moi », cf. Mt 15, 8).']],
  1336:[['LUK.16.10', 1, P, 'Cite Lc 16, 10-12 : « qui est fidèle dans les petites choses l’est dans les grandes… ».'],
       ['LUK.16.12', 1, P, 'Cite Lc 16, 12 : « qui vous rendra celui qui est à vous ? » (3e membre, complété par le filet de rappel).']],
  1377:[['WIS.8.21', 1, P, 'Cite Sg 8, 21 : « Nul n’est chaste, si vous ne lui en donnez la force ».']],
  1385:[['GEN.3.1', 4, D, 'ÉCHO : « le serpent, par ma bouche, parlait à Alypius… les doux pièges » — la tentation du serpent, Gn 3, 1.']],
  1391:[['SIR.3.27', 1, P, 'Cite Si 3, 27 : « qui aime le péril y tombe ».']],
  1408:[['PSA.145.15', 1, P, 'Cite Ps 145 (144), 15 : « nous donner la nourriture au temps marqué ».', { psH: [145, 15] }],
       ['PSA.145.16', 1, P, 'Cite Ps 145 (144), 16 : « ouvrir la main… combler nos âmes de bénédiction ».', { psH: [145, 16] }]],
  1426:[['ISA.46.4', 1, P, 'Cite Is 46, 4 : « Courez, je vous soutiendrai… je vous conduirai au but ».']],

  // ── Livre VII (couche lecture ; le matcheur a pris Jn 1, Ph 2, Rm 7 longs) ───
  1543:[['JOB.15.26', 1, P, 'Cite Jb 15, 26 : « je me suis élancé contre mon Seigneur sous le bouclier d’un cœur endurci ».']],
  1563:[['ROM.1.21', 1, P, 'Cite Rm 1, 21-22 : « s’ils connaissent Dieu, ils ne le glorifient pas… se proclamant sages, ils deviennent fous ».']],
  1565:[['GEN.25.34', 4, D, 'ÉCHO : « le mets d’Égypte qui fait perdre à Ésaü son droit d’aînesse » — Gn 25, 34.']],
  1567:[['ROM.9.12', 2, D, 'REPRISE : « lever l’opprobre de Jacob, soumettre l’aîné au plus jeune » — Rm 9, 12 (Gn 25, 23).']],
  1568:[['EXO.12.35', 2, D, 'REPRISE : « l’or que votre peuple emporta de la maison de servitude » — les dépouilles d’Égypte, Ex 12, 35.']],
  1581:[['PSA.39.12', 1, P, 'Cite Ps 39 (38), 12 : « vous aviez fait sécher mon âme comme l’araignée ».', { psH: [39, 12] }]],
  1583:[['EXO.3.14', 1, P, 'Cite Ex 3, 14 : « je suis celui qui est ».']],
  1590:[['PSA.73.28', 1, P, 'Cite Ps 73 (72), 28 : « il m’est bon de m’attacher à Dieu ».', { psH: [73, 28] }]],
  1592:[['PSA.16.2', 1, P, 'Cite Ps 16 (15), 2 : « vous êtes mon Seigneur, parce que vous n’avez pas besoin de mes biens ».', { psH: [16, 2] }]],
  1606:[['GEN.1.31', 1, P, 'Cite Gn 1, 31 : « vous avez fait tout très bon ».']],
  1618:[['PSA.119.37', 1, P, 'Cite Ps 119 (118), 37 : « clos mes yeux pour qu’ils ne vissent plus la vanité ».', { psH: [119, 37] }]],
  1672:[['1CO.4.7', 1, P, 'Cite 1 Co 4, 7 : « Qu’a-t-il, en effet, qu’il n’ait reçu ? ».']],
  1684:[['PSA.91.13', 4, D, 'ÉCHO : « leur prince, tout ensemble lion et dragon » — Ps 91 (90), 13 (cf. 1 P 5, 8).', { psH: [91, 13] }]],
  1687:[['1CO.15.9', 2, P, 'REPRISE : « le moindre de vos apôtres » — Paul, 1 Co 15, 9.']],

  // ── Livre VIII (la conversion, « Tolle, lege ») ─────────────────────────────
  1689:[['PSA.116.16', 1, P, 'Cite Ps 116 (115), 16-17 : « Vous avez brisé mes liens ; mon cœur vous sacrifie un sacrifice de louange ».', { psH: [116, 16] }]],
  1692:[['1CO.13.12', 1, P, 'Cite 1 Co 13, 12 : « quoiqu’elle ne m’apparût qu’en énigme et comme en un miroir ».']],
  1694:[['1CO.5.7', 2, D, 'REPRISE : « mon cœur était à purifier du vieux levain » — 1 Co 5, 7-8.']],
  1701:[['PSA.26.8', 1, P, 'Cite Ps 26 (25), 8 : « la beauté de votre maison que j’aimais ».', { psH: [26, 8] }]],
  1711:[['MAT.13.46', 1, P, 'Cite Mt 13, 46 : « la perle précieuse qu’il fallait acheter au prix de tous mes biens ».']],
  1727:[['PSA.29.5', 4, D, 'ÉCHO : « ces cèdres du Liban que Dieu n’avait pas encore brisés » — Ps 29 (28), 5.', { psH: [29, 5] }]],
  1728:[['MAT.10.33', 1, P, 'Cite Mt 10, 33 : « d’être désavoué du Christ… s’il craignait de le confesser devant les hommes » (cf. Lc 12, 9).']],
  1745:[['LUK.15.8', 2, D, 'REPRISE : « la drachme rendue à votre trésor par la femme qui l’a retrouvée » — Lc 15, 8.']],
  1746:[['LUK.15.24', 1, P, 'Cite Lc 15, 24 : « votre Fils était mort, et il est ressuscité, il était perdu et il est retrouvé ».']],
  1773:[['ACT.13.9', 2, P, 'REPRISE : « de Saul, voulut s’appeler Paul » — Ac 13, 9.']],
  1776:[['MAT.12.29', 2, D, 'REPRISE : « le fort enchaîné par notre Roi… ses vases conquis » — Mt 12, 29 (cf. 2 Tm 2, 21).']],
  1779:[['WIS.10.21', 1, P, 'Cite Sg 10, 21 : « qui donne l’éloquence à la langue de l’enfant ».']],
  1786:[['GAL.5.17', 1, P, 'Cite Ga 5, 17 : « La chair convoite contre l’esprit et l’esprit contre la chair ».']],
  1907:[['PSA.34.6', 1, P, 'Cite Ps 34 (33), 6 : « approchez de lui, recevez sa lumière et votre visage ne rougira plus ».', { psH: [34, 6] }]],
  1960:[['COL.3.5', 2, P, 'REPRISE : « Sois sourd à la voix de ces membres de terre, afin de les mortifier » — Col 3, 5.']],
  1970:[['PSA.79.8', 1, P, 'Cite Ps 79 (78), 8 : « Ne gardez pas souvenir de mes iniquités passées » (avec « jusques à quand, Seigneur ? », Ps 6, 4).', { psH: [79, 8] }]],
  1978:[['MAT.19.21', 1, P, 'Cite Mt 19, 21 (l’appel d’Antoine) : « Va, vends ce que tu as, donne-le aux pauvres… viens, suis-moi ».']],
  1981:[['ROM.13.13', 1, P, 'Cite Rm 13, 13 (le « Tolle, lege ») : « Ne vivez pas dans les festins, les débauches… ».'],
       ['ROM.13.14', 1, P, 'Cite Rm 13, 14 : « revêtez-vous de Notre-Seigneur Jésus-Christ, et ne faites pas de votre sensualité une providence charnelle ».']],
  1986:[['ROM.14.1', 1, P, 'Cite Rm 14, 1 : « Assistez le faible dans la foi ».']],
  1989:[['EPH.3.20', 1, P, 'Cite Ep 3, 20 : « ô vous qui êtes puissant à exaucer au-delà de nos demandes, au-delà de nos pensées ».']],

  // ── Livre IX (baptême, Ps 4 commenté, mort de Monique) ──────────────────────
  1997:[['MAT.11.30', 2, P, 'REPRISE : « incliner ma tête sous votre aimable joug, et mes épaules sous votre léger fardeau » — Mt 11, 30.']],
  2007:[['PSA.120.4', 1, P, 'Cite Ps 120 (119), 4 : « flèches perçantes et charbons dévorants ».', { psH: [120, 4] }]],
  2030:[['PSA.68.16', 2, D, 'REPRISE : « sur votre montagne, la montagne opime, la montagne féconde » — Ps 68 (67), 16.', { psH: [68, 16] }]],
  2035:[['LUK.16.22', 2, P, 'REPRISE : « il vit au sein d’Abraham » — Lc 16, 22.']],
  2057:[['PSA.4.2', 1, P, 'Cite Ps 4, 2 : « Je vous ai invoqué… j’étais dans la tribulation, et vous m’avez dilaté ».', { psH: [4, 2] }]],
  2064:[['JHN.7.39', 1, P, 'Cite Jn 7, 39 : « avant la gloire de Jésus, l’Esprit n’était pas encore donné ».']],
  2065:[['PSA.4.4', 3, P, 'COMMENTE Ps 4, 4 : « Apprenez que le Seigneur a exalté son Saint » — Augustin l’applique à la Résurrection et à sa propre conversion.', { psH: [4, 4] }]],
  2067:[['PSA.4.5', 3, P, 'COMMENTE Ps 4, 5 : « Entrez en fureur, mais sans pécher » — l’emportement contre le passé qui dérobe l’avenir au péché.', { psH: [4, 5] }]],
  2072:[['PSA.4.7', 3, P, 'COMMENTE Ps 4, 7 : « La lumière de votre visage s’est imprimée dans l’homme » — nous ne sommes pas la lumière mais éclairés par elle.', { psH: [4, 7] }]],
  2079:[['PSA.4.9', 1, P, 'Cite Ps 4, 9 : « Oh ! dans sa paix ! oh ! dans lui-même ! ».', { psH: [4, 9] }]],
  2081:[['1CO.15.54', 1, P, 'Cite 1 Co 15, 54 : « La mort est engloutie dans la victoire ».']],
  2083:[['PSA.4.9', 1, P, 'Cite Ps 4, 9 : « vous m’avez affermi, Seigneur, dans la simplicité de l’espérance » (« singulariter in spe »).', { psH: [4, 9] }]],
  2182:[['PSA.36.10', 2, P, 'REPRISE : « fontaine de vie qui réside en vous » — Ps 36 (35), 10.', { psH: [36, 10] }]],
  2196:[['1CO.15.51', 1, P, 'Cite 1 Co 15, 51 : « nous ressusciterons tous, sans néanmoins être tous changés ».']],
  2226:[['PSA.101.1', 1, P, 'Cite Ps 101 (100), 1 : « Je chanterai, Seigneur, vos miséricordes et vos jugements » (psaume chanté à la mort de Monique).', { psH: [101, 1] }]],
  2248:[['MAT.5.22', 1, P, 'Cite Mt 5, 22 : « Celui qui appelle son frère insensé est passible du feu ».']],
  2252:[['1CO.1.31', 2, P, 'REPRISE : « comme celui qui se glorifie se glorifierait dans le Seigneur » — 1 Co 1, 31.']],
  2254:[['ROM.8.34', 2, P, 'REPRISE : « assis à votre droite, sans cesse il intercède pour nous » — Rm 8, 34.']],
  2256:[['PSA.143.2', 1, P, 'Cite Ps 143 (142), 2 : « n’entrez pas avec elle en jugement ».', { psH: [143, 2] }]],
  2257:[['JAS.2.13', 1, P, 'Cite Jc 2, 13 : « Que votre miséricorde s’élève au-dessus de votre justice ».']],
  2259:[['ROM.9.15', 2, D, 'REPRISE : « vous qui avez pitié de qui il vous plaît de faire grâce » — Rm 9, 15 (Ex 33, 19).']],
  2265:[['COL.2.14', 2, P, 'REPRISE : « la cédule qui nous était contraire » effacée — Col 2, 14.']],

  // ── Livre X (la mémoire ; couche lecture aux passages scripturaires) ─────────
  2280:[['JHN.3.21', 1, P, 'Cite Jn 3, 21 : « celui qui accomplit la vérité arrive à la lumière ».']],
  2314:[['PSA.144.8', 1, P, 'Cite Ps 144 (143), 8 : « le fils de l’étranger, dont la bouche parle le mensonge, dont la main est une main d’iniquité ».', { psH: [144, 8] }]],
  2320:[['PSA.51.3', 1, P, 'Cite Ps 51 (50), 3 : « ayez pitié de moi, selon la grandeur de votre miséricorde ».', { psH: [51, 3] }]],
  2334:[['1CO.10.13', 1, P, 'Cite 1 Co 10, 13 : « fidèle, vous ne permettez pas que nous soyons tentés au-delà de nos forces ».']],
  2648:[['JOB.7.1', 1, P, 'Cite Jb 7, 1 : « N’est-ce pas une tentation continuelle que la vie de l’homme sur la terre ? ».']],
  2728:[['JHN.16.33', 2, P, 'REPRISE : « celui qui a vaincu le siècle intercède pour mes péchés » — Jn 16, 33.']],
  2919:[['JHN.10.18', 1, P, 'Cite Jn 10, 18 : « ayant la puissance de quitter son âme et la puissance de la reprendre ».']],
  2921:[['PSA.103.3', 1, P, 'Cite Ps 103 (102), 3 : « vous guérirez toutes mes langueurs ».', { psH: [103, 3] }]],
  2925:[['2CO.5.15', 1, P, 'Cite 2 Co 5, 15 : « Le Christ est mort pour tous, afin que ceux qui vivent ne vivent plus à eux-mêmes ».']],
  2926:[['PSA.55.23', 2, P, 'REPRISE : « je jette tous mes soucis en votre sein » — Ps 55 (54), 23 (cf. 1 P 5, 7).', { psH: [55, 23] }]],
  2928:[['COL.2.3', 1, P, 'Cite Col 2, 3 : « en qui sont cachés tous les trésors de la sagesse et de la science ».']],

  // ── Livre XI (le temps ; ouverture = commentaire de Gn 1, 1) ─────────────────
  2935:[['MAT.6.8', 1, P, 'Cite Mt 6, 8 : « Votre Père sait ce qu’il vous faut, avant même que vous lui demandiez rien ».']],
  2937:[['MAT.5.3', 2, D, 'REPRISE : « la pauvreté volontaire, la douceur, le besoin de la justice, l’amour des larmes… la paix » — les béatitudes, Mt 5, 3-9.']],
  2946:[['ROM.10.12', 2, P, 'REPRISE : « vous êtes riche pour tous ceux qui vous invoquent » — Rm 10, 12 (avec « je suis indigent et pauvre », Ps 85, 1).']],
  2947:[['ROM.2.29', 2, D, 'REPRISE : « la circoncision du cœur et des lèvres » — Rm 2, 29 (cf. Dt 30, 6).']],
  2952:[['PSA.74.16', 1, P, 'Cite Ps 74 (73), 16 : « À vous est le jour, à vous est la nuit ».', { psH: [74, 16] }]],
  2964:[['MAT.6.33', 1, P, 'Cite Mt 6, 33 : « données par surcroît à qui cherche votre royaume et votre justice ».']],
  2966:[['PSA.119.85', 1, P, 'Cite Ps 119 (118), 85 : « Les impies m’ont raconté leur ivresse ; mais qu’est-ce auprès de votre loi ? ».', { psH: [119, 85] }]],
  2968:[['PSA.80.18', 2, D, 'REPRISE : « l’homme de votre droite, fils de l’homme » — Ps 80 (79), 18.', { psH: [80, 18] }]],
  2971:[['JHN.5.46', 1, P, 'Cite Jn 5, 46 : « Moïse a écrit de lui ».']],
  2972:[['GEN.1.1', 1, P, 'Cite Gn 1, 1 : « dans le principe, vous avez créé le ciel et la terre ».'],
       ['GEN.1.1', 3, P, 'COMMENTE Gn 1, 1 : tout le livre cherche à entendre « comment, dans le principe, vous avez créé le ciel et la terre ».']],

  // ── Livre XII (le « ciel du ciel », la matière informe : Gn 1, 1-2) ──────────
  3358:[['PSA.113.24', 3, P, 'COMMENTE Ps 113, 24 : « Le ciel du ciel est au Seigneur, et il a donné la terre aux enfants des hommes » — le leitmotiv du livre XII (le ciel intelligible).']],
  3363:[['GEN.1.2', 3, P, 'COMMENTE Gn 1, 2 : « Or la terre était invisible et informe » — Augustin y lit la matière primitive sans forme.']],
  3395:[['ISA.6.3', 2, P, 'REPRISE : « le même, toujours le même ; saint, saint, saint ; Seigneur, Dieu tout-puissant » — Is 6, 3 (cf. Ap 4, 8).']],
  3409:[['PSA.32.9', 2, D, 'REPRISE : « création d’un mot : Qu’il soit ! et il fut » — Ps 33 (32), 9 (« dixit et facta sunt »).', { psH: [33, 9] }]],
  3668:[['1TI.1.8', 2, D, 'REPRISE : « faire un légitime usage de la loi, en la rapportant au précepte de l’amour » — 1 Tm 1, 8 (cf. 1, 5).']],
  3679:[['PSA.142.10', 2, D, 'REPRISE : « votre Esprit-Saint, mon guide vers la terre des vivants » — Ps 143 (142), 10.', { psH: [143, 10] }]],

  // ── Livre XIII (allégorie spirituelle des jours de la Genèse) ────────────────
  3708:[['2CO.5.21', 2, P, 'REPRISE : « nous serons justice dans votre Fils » — 2 Co 5, 21 (« ut efficeremur iustitia Dei in ipso »).']],
  3709:[['GEN.1.3', 3, P, 'COMMENTE Gn 1, 3 : « Que la lumière soit, et la lumière fut » — appliqué à la créature spirituelle illuminée.']],
  3716:[['GEN.1.2', 3, P, 'COMMENTE Gn 1, 2 : « votre Esprit saint était porté au-dessus des eaux » — l’Esprit qui fait reposer en soi.']],
  3729:[['EPH.3.19', 1, P, 'Cite Ep 3, 19 : « la science suréminente de la charité du Christ ».']],
  3741:[['ISA.58.10', 1, P, 'Cite Is 58, 10 : « notre nuit rayonne comme le jour à son midi ».']],
  4103:[['GEN.1.14', 3, P, 'COMMENTE Gn 1, 14 : les luminaires du firmament = les saints comblés de dons spirituels, dépositaires du Verbe de vie.']],
  4113:[['GEN.2.2', 3, P, 'COMMENTE Gn 2, 2-3 : le septième jour sanctifié, sans soir — figure du sabbat de la vie éternelle.']],

  // ── Vie de saint Augustin par Possidius (apparat critique) ──────────────────
  4138:[['TOB.12.7', 1, P, 'Cite Tb 12, 7 (parole de l’ange) : « il est bon de tenir caché le secret du roi, mais il est glorieux de publier les œuvres du Seigneur ».']],
  4152:[['LUK.12.32', 1, P, 'Cite Lc 12, 32-33 : « Ne craignez pas, petit troupeau… Vendez ce que vous possédez et donnez-le en aumônes ».'],
       ['LUK.12.33', 1, P, 'Cite Lc 12, 33 : « faites-vous une bourse qui ne vieillisse point et un trésor dans le ciel qui ne s’épuise point ».']],
  4154:[['1CO.3.12', 2, P, 'REPRISE : « non un édifice de bois, de foin et de paille, mais d’or, d’argent et de pierres précieuses » — 1 Co 3, 12.']],
  4158:[['PSA.1.2', 2, P, 'REPRISE : « méditant la loi du Seigneur jour et nuit » — Ps 1, 2.']],
  4163:[['2TI.2.21', 2, P, 'REPRISE : « vase pur, vase d’honneur utile au Seigneur et prêt à toute bonne œuvre » — 2 Tm 2, 21.']],
  4178:[['MAT.5.15', 2, P, 'REPRISE : « cette lampe… élevée sur le chandelier » — Mt 5, 15.']],
  4182:[['1PE.3.15', 1, P, 'Cite 1 P 3, 15 : « prêt à rendre à tout venant raison de la foi et de l’espérance ».'],
       ['TIT.1.9', 1, P, 'Cite Tt 1, 9 : « puissant à enseigner selon la doctrine et à réduire les contradicteurs ».']],
  4480:[['MAT.10.23', 1, P, 'Cite Mt 10, 23 : « Lorsqu’on vous persécutera dans une ville, fuyez dans une autre ».']],
  4485:[['1JN.3.16', 1, P, 'Cite 1 Jn 3, 16 : « Comme le Christ a donné sa vie pour nous, nous devons donner notre vie pour nos frères ».']],
  4495:[['JHN.10.12', 1, P, 'Cite Jn 10, 12-13 : « le mercenaire voit venir le loup et s’enfuit, parce qu’il n’a nul souci des brebis ».']],
  4501:[['1CO.8.11', 2, P, 'REPRISE : « ton frère plus faible périra, ton frère pour qui le Christ est mort » — 1 Co 8, 11 (cf. Rm 14, 15).']],
  4503:[['2CO.11.29', 1, P, 'Cite 2 Co 11, 29 : « Qui est faible sans que je m’affaiblisse ? qui est scandalisé sans que je brûle ? ».']],
  4507:[['1PE.2.5', 2, P, 'REPRISE : « les pierres vivantes » — 1 P 2, 5.']],
  4515:[['MAT.26.39', 2, P, 'REPRISE : « s’il est impossible que ce calice passe en se détournant d’eux » — Mt 26, 39.']],
  4516:[['PHP.1.23', 1, P, 'Cite Ph 1, 23-24 : « partagé entre deux désirs : être dissous pour être avec le Christ… ou demeurer dans cette chair ».']],
  4521:[['2SA.21.17', 1, P, 'Cite 2 S 21, 17 : « de peur que le flambeau d’Israël ne vînt à s’éteindre » (David).']],
  4562:[['MAT.13.52', 1, P, 'Cite Mt 13, 52 : « tirant de son trésor des choses nouvelles et des choses anciennes ».']],
  4563:[['JAS.2.12', 1, P, 'Cite Jc 2, 12 : « Parlez ainsi et faites de même ».'],
       ['MAT.5.19', 1, P, 'Cite Mt 5, 19 : « Celui qui aura fait et enseigné sera appelé grand dans le royaume des cieux ».']],
};

const DRY = process.argv.includes('--dry');

// FAUX APPARIEMENTS DU MATCHEUR repérés à la lecture : [segment_numero, canon_id
// erroné]. La lecture pose le bon lien ; ceci retire le mauvais (motif
// « Appariement de la citation »). Enrichir cette liste à chaque relecture.
const CORRECTIONS = [
  [1563, '1CO.3.20'], // « se proclamant sages, ils deviennent fous » = Rm 1, 22, non 1 Co 3, 20
  [1907, 'PSA.88.16'], // « approchez de lui… votre visage ne rougira plus » = Ps 33, 6, non Ps 88, 16
];

async function nettoyerCorrections(sb) {
  const segs = [];
  for (let de = 0; ; de += 1000) {
    const { data } = await sb.from('segments').select('id, segment_numero').eq('id_oeuvre', OEUVRE).order('segment_numero').range(de, de + 999);
    if (!data?.length) break;
    segs.push(...data);
    if (data.length < 1000) break;
  }
  const parNum = new Map(segs.map((s) => [s.segment_numero, s.id]));
  let supprimes = 0;
  for (const [num, canon] of CORRECTIONS) {
    const sid = parNum.get(num);
    if (!sid) continue;
    const { data } = await sb.from('liens_bibliques').select('id, motif')
      .eq('segment_id', sid).eq('canon_id', canon);
    const ids = (data || []).filter((l) => (l.motif || '').startsWith('Appariement de la citation')).map((l) => l.id);
    if (ids.length && !DRY) { await sb.from('liens_bibliques').delete().in('id', ids); }
    supprimes += ids.length;
  }
  if (supprimes) console.log(`${DRY ? '(--dry) ' : ''}faux appariements du matcheur retirés : ${supprimes}`);
}

async function main() {
  await nettoyerCorrections(sb);
  const heb = new Map();
  const canonSet = new Set();
  for (let de = 0; ; de += 1000) {
    const { data } = await sb.from('versets_canon').select('id, livre, ch_heb, v_heb').order('id').range(de, de + 999);
    if (!data?.length) break;
    for (const r of data) { canonSet.add(r.id); if (r.ch_heb != null) heb.set(`${r.livre}.${r.ch_heb}.${r.v_heb}`, r.id); }
    if (data.length < 1000) break;
  }
  const segs = [];
  for (let de = 0; ; de += 1000) {
    const { data } = await sb.from('segments').select('id, segment_numero').eq('id_oeuvre', OEUVRE).order('segment_numero').range(de, de + 999);
    if (!data?.length) break;
    segs.push(...data);
    if (data.length < 1000) break;
  }
  const parNum = new Map(segs.map((s) => [s.segment_numero, s.id]));
  const ids = [...new Set(Object.keys(LIENS).map((n) => parNum.get(Number(n))))].filter(Boolean);
  const deja = new Set();
  const { data: ex } = await sb.from('liens_bibliques').select('segment_id, canon_id, type').in('segment_id', ids);
  for (const l of ex || []) if (l.canon_id) deja.add(`${l.segment_id}|${l.canon_id}|${l.type}`);

  const liens = []; const vus = new Set(); const manques = [];
  for (const [num, liste] of Object.entries(LIENS)) {
    const sid = parNum.get(Number(num));
    if (!sid) { manques.push(`segment #${num} introuvable`); continue; }
    for (const [canonDefaut, type, fiab, motif, conv] of liste) {
      const canon = conv?.psH ? heb.get(`PSA.${conv.psH[0]}.${conv.psH[1]}`) : canonDefaut;
      if (!canon || !canonSet.has(canon)) { manques.push(`#${num} → ${conv?.psH ? 'PSA héb ' + conv.psH.join(':') : canonDefaut} (hors ossature)`); continue; }
      const cle = `${sid}|${canon}|${type}`;
      if (deja.has(cle) || vus.has(cle)) continue;
      vus.add(cle);
      liens.push({ segment_id: sid, canon_id: canon, type, fiabilite: fiab, provenance: 'ia', arbitrage_requis: fiab === D, motif });
    }
  }
  const c = (t) => liens.filter((l) => l.type === t).length;
  const bilan = `${liens.length} liens — 1 citation : ${c(1)}, 2 reprise : ${c(2)}, 3 commentaire : ${c(3)}, 4 écho : ${c(4)}`;
  if (manques.length) console.log('⚠ CIBLES NON RÉSOLUES :\n  ' + manques.join('\n  '));
  if (DRY) { console.log(`(--dry) ${bilan} — rien écrit.`); return; }
  if (liens.length) { const { error } = await sb.from('liens_bibliques').insert(liens); if (error) throw error; }
  console.log(`✓ ${bilan}.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
