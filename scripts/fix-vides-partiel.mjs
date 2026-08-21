// Correction de tous les vrais vides TR0001 (hors PSA déjà traités et livres entiers absents)
// Sources : https://fr.wikisource.org/wiki/Bible_Sacy/* (édition Sacy Wikisource)
// Quand le numéro de verset diffère entre DB (numérotation protestante) et Sacy (Vulgate),
// on préfixe le texte avec une note entre parenthèses.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))


const sb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
)

// [livre, chapitre, verset, texte TR0001]
const corrections = [
  // === GENÈSE ===
  // GEN 5:32 — Sacy Gn ch5 v31 (dernier verset, Sacy incorpore v32 à la fin de v31)
  ['GEN', 5, 32, "Or Noé ayant cinq cents ans, engendra Sem, Cham et Japheth."],
  // GEN 49:33 — Sacy Gn ch49 v32 (offset -1)
  ['GEN', 49, 33, "(Genèse 49, 32 dans l'édition de Sacy) Après avoir achevé de donner ses ordres et ses instructions à ses enfants, il joignit ses pieds sur son lit, et mourut ; et il fut réuni avec son peuple."],
  // GEN 50:26 — Sacy Gn ch50 v25 (offset -1)
  ['GEN', 50, 26, "(Genèse 50, 25 dans l'édition de Sacy) Il mourut ensuite, âgé de cent dix ans accomplis ; et son corps ayant été embaumé, fut mis dans un cercueil en Égypte."],

  // === EXODE ===
  // EXO 8:25-28 — Sacy Exode ch8, même numérotation (erreurs d'import)
  ['EXO', 8, 25, "Alors Pharaon appela Moïse et Aaron, et leur dit : Allez sacrifier à votre Dieu dans ce pays-ci."],
  ['EXO', 8, 26, "Moïse répondit : Cela ne peut point se faire : car nous sacrifierions au Seigneur, notre Dieu, des animaux dont la mort paraîtrait une abomination aux Egyptiens. Si nous tuons devant les yeux des Egyptiens ce qu'ils adorent, ils nous lapideront."],
  ['EXO', 8, 27, "Nous irons dans le désert trois journées de chemin, et nous sacrifierons au Seigneur, notre Dieu, comme il nous l'a commandé."],
  ['EXO', 8, 28, "Et Pharaon lui dit : Je vous laisserai aller dans le désert pour sacrifier au Seigneur, votre Dieu ; mais n'allez donc pas plus loin : priez Dieu pour moi."],

  // === LÉVITIQUE ===
  // LEV 6:17-23 — Sacy Lév ch6, même numérotation (erreurs d'import)
  ['LEV', 6, 17, "On ne mettra point de levain dans cette farine, parce qu'on en prendra une partie qu'on offrira comme un encens au Seigneur. Ce sera donc une chose très-sainte, comme ce qui s'offre pour le péché et pour la faute ;"],
  ['LEV', 6, 18, "et il n'y aura que les mâles de la race d'Aaron qui en mangeront. Ce sera là une loi éternelle touchant les sacrifices du Seigneur, qui passera parmi vous de race en race ; Que tous ceux qui toucheront à ces choses soient saints et purs."],
  ['LEV', 6, 19, "Le Seigneur parla encore à Moïse, et lui dit :"],
  ['LEV', 6, 20, "Voici l'oblation d'Aaron et de ses fils, qu'ils doivent offrir au Seigneur le jour de leur onction : Ils offriront pour sacrifice perpétuel la dixième partie d'un éphi de fleur de farine, la moitié le matin et l'autre moitié le soir."],
  ['LEV', 6, 21, "Elle sera mêlée avec l'huile, et se cuira dans la poêle. Le prêtre qui aura succédé légitimement à son père, l'offrira toute chaude pour être d'une odeur très-agréable au Seigneur,"],
  ['LEV', 6, 22, "et elle brûlera tout entière sur l'autel."],
  ['LEV', 6, 23, "Car tous les sacrifices des prêtres seront consumés par le feu, et personne n'en mangera."],
  // LEV 26:46 — Sacy Lév ch26 v45 (dernier verset incorporé)
  ['LEV', 26, 46, "(Lévitique 26, 45 dans l'édition de Sacy) Ce sont là les ordonnances, les préceptes, et les lois que le Seigneur donna par Moïse sur la montagne de Sinaï, comme un pacte entre lui et les enfants d'Israël."],

  // === NOMBRES ===
  // NUM 11:35 — Sacy Nb ch11 v34 (offset -1)
  ['NUM', 11, 35, "(Nombres 11, 34 dans l'édition de Sacy) C'est pourquoi ce lieu fut appelé, les Sépulcres de concupiscence, parce qu'ils y ensevelirent le peuple qui avait désiré de la chair. Et étant sortis des Sépulcres de concupiscence, ils vinrent à Haséroth, où ils demeurèrent."],
  // NUM 12:16 — Sacy Nb ch13 premier verset (franchit la frontière de chapitre)
  ['NUM', 12, 16, "(Nombres 13 dans l'édition de Sacy) Après cela le peuple partit de Haséroth, et alla dresser ses tentes dans le désert de Pharan."],

  // === JOB ===
  // JOB 42:17 — Sacy Job ch42 v16 (dernier verset incorporé)
  ['JOB', 42, 17, "et il mourut fort âgé et plein de jours."],

  // === CANTIQUE DES CANTIQUES ===
  // SNG 1:17 — Sacy Cantique ch1 v16 (offset -1)
  ['SNG', 1, 17, "(Cantique 1, 16 dans l'édition de Sacy) les solives de nos maisons sont de cèdre, nos lambris sont de cyprès."],
  // SNG 7:14 — Sacy Cantique ch7 v13 (offset -1)
  ['SNG', 7, 14, "(Cantique 7, 13 dans l'édition de Sacy) Les mandragores ont répandu leur odeur : nous avons toutes sortes de fruits à nos portes. Je vous ai gardé, ô mon bien-aimé ! les nouveaux et les anciens."],

  // === ISAÏE ===
  // ISA 9:20 — même numérotation (erreur d'import)
  ['ISA', 9, 20, "Il ira à droite, et la faim le tourmentera ; il ira à gauche, et ce qu'il aura mangé, ne le rassasiera point ; chacun dévorera la chair de son bras. Manassé dévorera Ephraïm, et Ephraïm Manassé ; et l'un et l'autre se soulèveront contre Juda."],

  // === JÉRÉMIE ===
  // JER 37:21 — Sacy Jér ch37 v20 (offset -1)
  ['JER', 37, 21, "(Jérémie 37, 20 dans l'édition de Sacy) Le roi Sédécias ordonna donc que Jérémie fût mis dans le vestibule de la prison, et qu'on lui donnât tous les jours un pain, outre les viandes ordinaires, jusqu'à ce que tout le pain de la ville fût consumé ; et Jérémie demeura pendant ce temps dans le vestibule de la prison."],

  // === ÉZÉCHIEL ===
  // EZK 2:10 — même numérotation (erreur d'import)
  ['EZK', 2, 10, "Alors j'eus cette vision : Tout d'un coup une main s'avança vers moi, laquelle tenait un livre roulé : elle étendit devant moi ce livre, qui était écrit dedans et dehors, et on y avait écrit des plaintes lugubres, des cantiques, et des malédictions."],
  // EZK 18:19 — même numérotation (erreur d'import)
  ['EZK', 18, 19, "Si vous dites : Pourquoi le fils n'a-t-il pas porté l'iniquité de son père ? C'est parce que le fils a agi selon l'équité et la justice ; qu'il a gardé tous mes préceptes, et qu'il les a pratiqués : c'est pourquoi il vivra très-certainement."],
  // EZK 20:40 — même numérotation (erreur d'import)
  ['EZK', 20, 40, "je ferai, dit le Seigneur Dieu, que toute la maison d'Israël me servira sur ma montagne sainte, sur la haute montagne d'Israël : ils me serviront tous dans la terre en laquelle ils me seront agréables ; et c'est là que j'accepterai vos prémices et les offrandes de vos décimes, dans tout le culte saint que vous me rendrez."],
  // EZK 21:33-37 — Sacy Ez ch21 v28-32 (décalage numérotation section Ammon)
  ['EZK', 21, 33, "(Ézéchiel 21, 28 dans l'édition de Sacy) Et vous, fils de l'homme, prophétisez et dites : Voici ce que dit le Seigneur Dieu aux enfants d'Ammon, pour répondre à leurs insultes : Vous leur direz : Epée, épée, sors du fourreau pour verser le sang : sois tranchante et claire, pour tuer et pour briller."],
  ['EZK', 21, 34, "(Ézéchiel 21, 29 dans l'édition de Sacy) Pendant que les enfants d'Ammon n'ont que des visions fausses, et que leurs devins ne leur disent que des mensonges, sors, épée, pour tomber tout d'un coup sur la tête des impies, et les couvrir de plaies au jour qui a été marqué pour la punition de leurs injustices."],
  ['EZK', 21, 35, "(Ézéchiel 21, 30 dans l'édition de Sacy) Apres cela, ô épée ! rentre dans ton fourreau au lieu où tu as été créée, et je te jugerai dans la terre de ta naissance."],
  ['EZK', 21, 36, "(Ézéchiel 21, 31 dans l'édition de Sacy) Je répandrai mon indignation sur toi ; j'allumerai contre toi le feu de ma fureur ; et je t'abandonnerai entre les mains des hommes insensés qui ont conspiré ta mort."],
  ['EZK', 21, 37, "(Ézéchiel 21, 32 dans l'édition de Sacy) Tu seras la pâture du feu, la terre nagera dans ton sang, et ton nom tombera dans un éternel oubli : car c'est moi qui ai parlé, moi qui suis le Seigneur."],
  // EZK 27:33 — même numérotation (erreur d'import)
  ['EZK', 27, 33, "O Tyr ! qui par votre grand commerce sur la mer, avez comblé de biens tant de nations différentes, qui par la multitude de vos richesses, et par l'abondance de vos peuples, avez enrichi les rois de la terre ;"],
  // EZK 34:23 — même numérotation (erreur d'import)
  ['EZK', 34, 23, "Je susciterai sur elles le Pasteur Unique pour les paître, David, mon serviteur ; lui-même aura soin de les paître, et il leur tiendra lui-même lieu de Pasteur."],

  // === OSÉE ===
  // HOS 2:25 — Sacy Osée ch2 v24 (offset -1)
  ['HOS', 2, 25, "(Osée 2, 24 dans l'édition de Sacy) et je dirai à celui que j'appelais, Non-mon-peuple : Vous êtes mon peuple. Et il me dira : Vous êtes mon Dieu."],
  // HOS 12:15 — Sacy Osée ch12 v14 (offset -1)
  ['HOS', 12, 15, "(Osée 12, 14 dans l'édition de Sacy) Cependant je n'ai trouvé dans Éphraïm que de l'amertume et des sujets de m'irriter contre lui : c'est pourquoi le sang qu'il a répandu retombera sur lui, et son Seigneur le couvrira de l'opprobre qu'il a mérité."],

  // === MICHÉE ===
  // MIC 4:14 — Sacy Michée ch4 v13 (offset -1)
  ['MIC', 4, 14, "(Michée 4, 13 dans l'édition de Sacy) Levez-vous, fille de sion, et foulez la paille : car je vous donnerai une corne de fer, je vous donnerai des ongles d'airain, et vous briserez plusieurs peuples ; vous immolerez au Seigneur ce qu'ils ont ravi aux autres, et vous consacrerez au Dieu de toute la terre ce qu'ils ont de plus précieux."],

  // === NAHUM ===
  // NAM 2:14 — Sacy Nahum ch2 v13 (offset -1)
  ['NAM', 2, 14, "(Nahum 2, 13 dans l'édition de Sacy) Je viens à vous, dit le Seigneur des armées : je mettrai le feu à vos chariots, et je les réduirai en poudre : l'épée dévorera vos jeunes lions : je vous arracherai tout ce que vous aviez pris aux autres ; et on n'entendra plus la voix insolente des ambassadeurs que vous envoyiez."],

  // === AGGÉE ===
  // HAG 1:15 — Sacy Aggée ch1 v14 (offset -1)
  ['HAG', 1, 15, "(Aggée 1, 14 dans l'édition de Sacy) En même temps le Seigneur suscita l'esprit de Zorobabel, fils de Salathiel, chef de Juda ; l'esprit de Jésus, fils de Josédec, grand prêtre, et l'esprit de tous ceux qui étaient restés du peuple ; et ils se mirent à travailler à la maison du Seigneur des armées, leur Dieu."],

  // === NÉHÉMIE ===
  // NEH 3:32 — Sacy Néhémias ch3 v31 (offset -1)
  ['NEH', 3, 32, "(Néhémias 3, 31 dans l'édition de Sacy) Les orfèvres et les marchands bâtirent à la porte du troupeau le long de la chambre de l'angle."],
  // NEH 12:47 — Sacy Néhémias ch12 v46 (offset -1)
  ['NEH', 12, 47, "(Néhémias 12, 46 dans l'édition de Sacy) Tout le peuple d'Israël eut donc soin du temps de Zorobabel et du temps de Néhémias, de donner aux chantres et aux portiers leur portion chaque jour. Ils donnaient aussi aux Lévites ce qui leur était dû des choses saintes ; et les Lévites donnaient de même aux enfants d'Aaron la part sainte qui leur était destinée."],

  // === JUGES ===
  // JDG 21:25 — Sacy Juges ch21 v24 (fin du verset, offset -1)
  ['JDG', 21, 25, "(Juges 21, 24 dans l'édition de Sacy) En ce temps-là il n'y avait point de roi dans Israël ; mais chacun faisait ce qu'il jugeait à propos."],

  // === ECCLÉSIASTE ===
  // ECC 6:12 — Sacy Ecclésiaste ch6 v11 (offset -1)
  ['ECC', 6, 12, "(Ecclésiaste 6, 11 dans l'édition de Sacy) On discourt beaucoup, on se répand en beaucoup de paroles dans la dispute ; et ce n'est que vanité."],

  // === I PARALIPOMÈNES ===
  // 1CH 11:47 — Sacy I Paralipomènes ch11 v46 (offset -1)
  ['1CH', 11, 47, "(I Paralipomènes 11, 46 dans l'édition de Sacy) Eliel, de Mahumi, avec Jéribaï et Josaïa, enfants d'Elnaëm ; et Jethma, de Moab ; Eliel, et Obed et jasiel, de Masobia."],
  // 1CH 20:8 — Sacy I Paralipomènes ch20 v7 (offset -1)
  ['1CH', 20, 8, "(I Paralipomènes 20, 7 dans l'édition de Sacy) Ce sont là les enfants des géants qui se trouvèrent à Geth, et qui furent tués par David et par ses gens."],

  // === II PARALIPOMÈNES ===
  // 2CH 13:23 — Sacy II Paralipomènes ch13 v22 (offset -1)
  ['2CH', 13, 23, "(II Paralipomènes 13, 22 dans l'édition de Sacy) Pour le reste des paroles, des mœurs et des actions d'Abia, il a été très-exactement écrit dans le livre du prophète Addo."],

  // === ACTES DES APÔTRES ===
  // ACT 7:60 — Sacy Actes ch7 v59 (offset -1)
  ['ACT', 7, 60, "(Actes 7, 59 dans l'édition de Sacy) S'étant mis ensuite à genoux, il s'écria à haute voix : Seigneur ! ne leur imputez point ce péché. Après cette parole il s'endormit au Seigneur. Or Saul avait consenti comme les autres à la mort d'Étienne."],
  // ACT 14:28 — Sacy Actes ch14 v27 (offset -1)
  ['ACT', 14, 28, "(Actes 14, 27 dans l'édition de Sacy) Et ils demeurèrent là assez longtemps avec les disciples."],

  // === HÉBREUX ===
  // HEB 9:5 — même numérotation (erreur d'import)
  ['HEB', 9, 5, "Au-dessus de l'arche il y avait des chérubins pleins de gloire, qui couvraient le propitiatoire de leurs ailes. Mais ce n'est pas ici le lieu de parler de tout ceci en détail."],
  // HEB 9:27 — même numérotation (erreur d'import)
  ['HEB', 9, 27, "Et comme il est arrêté que les hommes meurent une fois, et qu'ensuite ils soient jugés :"],

  // === PHILIPPIENS ===
  // PHP 2:16 — même numérotation (erreur d'import)
  ['PHP', 2, 16, "portant en vous la parole de vie, pour m'être un sujet de gloire au jour de Jésus-Christ, comme n'ayant pas couru en vain, ni travaillé en vain."],
  // PHP 2:26 — même numérotation (erreur d'import)
  ['PHP', 2, 26, "parce qu'il désirait de vous voir tous ; et il était fort en peine de ce que vous aviez su sa maladie."],

  // === II CORINTHIENS ===
  // 2CO 1:24 — Sacy II Cor ch1 v23 (offset -1)
  ['2CO', 1, 24, "(II Corinthiens 1, 23 dans l'édition de Sacy) Pour moi, je prends Dieu à témoin, et je veux bien qu'il me punisse si je ne dis la vérité, que ç'a été pour vous épargner que je n'ai point encore voulu aller à Corinthe. Ce n'est pas que nous dominions sur votre foi ; mais nous tâchons au contraire de contribuer à votre joie, puisque vous demeurez fermes dans la foi."],

  // === ÉPHÉSIENS ===
  // EPH 3:7 — même numérotation (erreur d'import)
  ['EPH', 3, 7, "dont j'ai été fait le ministre par le don de la grâce de Dieu, qui m'a été conférée par l'efficace de sa puissance."],

  // === I PIERRE ===
  // 1PE 3:7 — même numérotation (erreur d'import)
  ['1PE', 3, 7, "Et vous de même, maris, vivez sagement avec vos femmes, les traitant avec honneur et avec discrétion, comme le sexe le plus faible, et considérant qu'elles sont avec vous heritières de la grâce qui donne la vie ; afin qu'il ne se trouve en vous aucun empêchement à la prière."],

  // === III JEAN ===
  // 3JN 1:15 — même numérotation (erreur d'import)
  ['3JN', 1, 15, "La paix soit avec vous ! Vos amis d'ici vous saluent. Saluez nos amis de ma part, chacun en particulier."],

  // === APOCALYPSE ===
  // REV 12:18 — même numérotation (erreur d'import)
  ['REV', 12, 18, "Et il s'arrêta sur le sable de la mer."],
]

async function main() {
  console.log(`=== CORRECTION ${corrections.length} VIDES TR0001 (hors PSA) ===\n`)
  let ok = 0, err = 0

  for (const [livre, chapitre, verset, texte] of corrections) {
    const { error } = await sb.from('versets')
      .update({ TR0001: texte })
      .eq('livre', livre)
      .eq('chapitre', chapitre)
      .eq('verset', verset)
    if (error) {
      console.error(`  ✗ ${livre} ${chapitre}:${verset} — ${error.message}`)
      err++
    } else {
      console.log(`  ✓ ${livre} ${chapitre}:${verset}`)
      ok++
    }
  }

  console.log(`\n→ ${ok}/${corrections.length} versets corrigés, ${err} erreurs`)

  // Vérification finale : compter les vrais vides restants
  let allVides = [], from = 0
  while (true) {
    const { data } = await sb.from('versets')
      .select('livre,chapitre,verset,TR0002')
      .or('TR0001.is.null,TR0001.eq.')
      .order('livre').order('chapitre').order('verset')
      .range(from, from + 999)
    allVides = allVides.concat(data)
    if (data.length < 1000) break
    from += 1000
  }
  const livresEntiers = ['1MA','2ES','SIR','JDT','1ES','WIS','EZA','LJE','S3Y','SUS','BEL','MAN','PS2','ODA','3MA','2MA','4MA','BAR','TOB','ESG','JUB','ENO','PSS']
  const videsPartiels = allVides.filter(v => !livresEntiers.includes(v.livre))
  const vraisVides = videsPartiels.filter(v => v.TR0002)
  console.log(`\n=== VRAIS VIDES RESTANTS : ${vraisVides.length} ===`)
  for (const v of vraisVides) {
    console.log(`  ${v.livre} ${v.chapitre}:${v.verset}`)
  }
}

main().catch(console.error)
