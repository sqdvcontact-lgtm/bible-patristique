import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre sixième'
const DEBUT = 2801
const FIN = 2882
const TOTAL_SEGMENTS = 82
const QUESTIONS = ['Question XXI', 'Question XXII', 'Question XXIII', 'Question XXIV', 'Question XXV', 'Question XXVI', 'Question XXVII', 'Question XXVIII', 'Question XXIX', 'Question XXX']
const WRITE = process.argv.includes('--write')
const DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Josué Q. XXI-XXX'
const EMPREINTE_ATTENDUE = '0435ecc180c26bc0e252adf7a90567263ac71908c7a089a22456664831073dc9'
const CHARTE = 'charte/CHARTE_IA.md'
const CHARTE_HASH = '47893c044ebab26e78149548c129fb9de3b72dde1e37c3371b60a1786240c198'
const PREUVES = [
  ['scripts/heptateuque/img/p567.jpg', '94a51e84c853464f629684c94e97843f411ca4bc422377b48fa8247f8e002302', 'Page 567 : ouverture de la Question XXI, lemma Josué 21,41-43 et suppression certaine de la virgule parasite après « quant à ».'],
  ['scripts/heptateuque/img/p568.jpg', '1b95cddd700b25841e12e4862ead29228193d1a36b0ce9c2d059dc4bc089a288', 'Page 568 : promesse à Abraham, règne de Salomon et reprise de Josué 21,41.'],
  ['scripts/heptateuque/img/p569.jpg', '6750cc1ab25c0502e506717941f26078be6de17c9b461a176111b9445a54a469', 'Page 569 : fin de XXI, Questions XXII-XXIV et références anciennes.'],
  ['scripts/heptateuque/img/p570.jpg', '861d75db58f106d5b70dd497ac1edc69c361d16829bba631da4371801e810109', 'Page 570 : Questions XXIV-XXVIII et variantes de traduction.'],
  ['scripts/heptateuque/img/p571.jpg', '55713c3b81e130a01f94702f21054b3d66e8b53e034c3fff5ada04b346e48f93', 'Page 571 : Questions XXVIII-XXX et références de Josué 24.'],
  ['scripts/heptateuque/img/p572.jpg', '2a51a3a3185ab244d79b858f7ee8de87f58c35ee7ef97e386651da2d02655b6b', 'Page 572 : note imprimée Exode XXXIV,3 et suivants, fin du Livre sixième et 2 Timothée 4,14.16.'],
]
const CORRECTIONS_TEXTE = [{
  numero: 2809,
  dbAvant: 'Mais quant à, ces villes', dbApres: 'Mais quant à ces villes',
  candidatAvant: 'Mais quant à, ces villes', candidatApres: 'Mais quant à ces villes',
  sourceAvant: 'Mais quant à, ces villes', sourceApres: 'Mais quant à ces villes',
}]
const CORRECTIONS_NOTES = [
  { numero: 2855, avant: '[[784]] Ib. XLII, 2', apres: '[[784]] Ib. CXLII, 2.' },
  { numero: 2872, avant: '[[798]] Exod. XXIV, 3, etc.', apres: '[[798]] Exod. XXXIV, 3, etc.' },
  { numero: 2882, avant: '[[801]] Ib. XVI', apres: '[[801]] Ib. 16.' },
]

const LIENS = []
const NON_RESOLUS = []
const SANS_LIEN = new Set()
const add = (numero, canonId, type, motif) => LIENS.push([numero, canonId, type, motif])
const com = (numero, canonIds, motif) => { for (const canonId of canonIds) add(numero, canonId, 3, `${motif} (${canonId}).`) }
const both = (numero, canonId, motif) => {
  add(numero, canonId, 1, `${motif} — citation ou référence intentionnelle.`)
  add(numero, canonId, 3, `${motif} — passage commenté ou mobilisé dans le raisonnement.`)
}
const nonBiblique = (numero, genre, motif) => NON_RESOLUS.push([numero, 4, `RÉFÉRENCE NON BIBLIQUE (${genre}) : ${motif} ; cible de corpus à constituer.`])

// XXI — possession de toute la terre promise. Le lemma 21,41-43 correspond localement à 21,43-45.
com(2801, ['JOS.21.43', 'JOS.21.44', 'JOS.21.45'], 'La question porte sur la possession du pays, le repos et l’accomplissement des promesses')
both(2802, 'JOS.21.43', 'Dieu donne à Israël tout le pays juré aux pères et le peuple l’habite')
both(2803, 'JOS.21.44', 'Dieu donne le repos et aucun ennemi n’ose résister à Israël')
both(2803, 'JOS.21.45', 'Aucune bonne parole de Dieu ne reste sans accomplissement')
for (let numero = 2804; numero <= 2825; numero++) com(numero, ['JOS.21.43'], 'L’étendue de la terre donnée à Israël et son accomplissement historique développent l’affirmation du lemma')
for (const verset of [1, 2]) both(2805, `EXO.33.${verset}`, 'Dieu promet la terre aux patriarches et nomme les sept peuples que son ange chassera')
for (const verset of [10, 11, 12, 13, 14, 15]) both(2807, `DEU.20.${verset}`, 'La loi distingue le siège des villes éloignées et le traitement de leurs habitants et de leur butin')
com(2808, ['DEU.20.15'], 'La règle précédente s’applique aux villes éloignées qui ne relèvent pas des nations promises')
for (const verset of [16, 17]) both(2809, `DEU.20.${verset}`, 'Les villes des nations données en héritage doivent être vouées à l’anathème sans survivant')
com(2810, ['DEU.20.16', 'DEU.20.17'], 'L’extermination des sept nations conditionne leur remplacement par Israël dans le pays promis')
com(2811, ['DEU.20.10', 'DEU.20.11', 'DEU.20.12', 'DEU.20.13', 'DEU.20.14', 'DEU.20.15'], 'Les nations éloignées doivent devenir tributaires si elles se soumettent, ou être vaincues si elles résistent')
for (const verset of [1, 2]) both(2812, `DEU.7.${verset}`, 'Dieu livre à Israël les sept nations plus fortes afin qu’elles soient exterminées')
both(2813, 'DEU.7.3', 'Israël ne doit conclure aucun mariage avec les sept nations')
com(2814, ['DEU.7.1', 'DEU.7.2', 'DEU.7.3'], 'Les sept nations doivent céder leur place à Israël, tandis que la Genèse en promet onze')
for (const verset of [18, 19, 20, 21]) both(2815, `GEN.15.${verset}`, 'L’alliance avec Abraham délimite le pays et énumère onze peuples promis à sa postérité')
for (const verset of [19, 20, 21]) both(2816, `1KI.9.${verset}`, 'Le règne de Salomon réalise la domination sur les survivants des peuples de Chanaan')
for (const verset of [19, 20, 21]) com(2817, [`1KI.9.${verset}`], 'Salomon rend tributaires les descendants des peuples que les Israélites n’avaient pas exterminés')
com(2818, ['1KI.9.20', '1KI.9.21'], 'La soumission au tribut remplace l’extermination prescrite des peuples survivants')
both(2819, '1KI.5.1', 'Salomon domine depuis l’Euphrate jusqu’au pays des Philistins et aux frontières d’Égypte')
com(2820, ['1KI.5.1'], 'Le fleuve oriental du royaume de Salomon est identifié à l’Euphrate et non au Jourdain')
com(2821, ['1KI.5.1', 'GEN.15.18'], 'L’extension du royaume de Salomon jusqu’à l’Égypte accomplit la limite promise à Abraham')
com(2822, ['1KI.5.1', 'GEN.15.18'], 'Les limites orientale et occidentale du royaume coïncident avec celles annoncées dans la Genèse')
com(2823, ['GEN.15.18'], 'Le fleuve d’Égypte est distingué du Nil comme frontière occidentale du pays promis')
com(2824, ['DEU.20.10', 'DEU.20.15', 'DEU.20.16', 'DEU.20.17', 'GEN.15.18'], 'Les sept nations doivent être exterminées et les peuples jusqu’à l’Euphrate assujettis ou vaincus')
com(2825, ['1KI.5.1'], 'Malgré la désobéissance d’Israël, la promesse territoriale reçoit son accomplissement sous Salomon')
both(2826, 'JOS.21.43', 'Le texte affirme que Dieu donna tout le pays juré aux pères du vivant de Josué')
both(2827, 'JOS.21.43', 'Israël possède et habite effectivement le pays au milieu des peuples survivants')
both(2827, 'JOS.21.44', 'Dieu donne à Israël le repos alentour malgré la présence de peuples survivants')
both(2828, 'JOS.21.44', 'Aucun ennemi n’ose résister en face et ceux qui combattent sont livrés à Israël')
both(2829, 'JOS.21.45', 'Toutes les bonnes paroles s’accomplissent malgré la désobéissance d’Israël')
both(2830, 'JOS.21.45', 'Les bonnes paroles sont distinguées des malédictions encore inaccomplies')
com(2830, ['JOS.21.43'], 'La donation de tout le pays reste le dernier point à interpréter')
com(2831, ['JOS.21.43'], 'Les peuples maintenus dans le pays servent d’épreuve salutaire à Israël')
com(2832, ['JOS.21.43'], 'Israël est maître même de la partie du pays laissée provisoirement comme épreuve')

// XXII — résistance des ennemis et exception de Dan.
both(2833, 'JOS.21.44', 'L’affirmation qu’aucun ennemi ne résista est confrontée au cas de la tribu de Dan')
both(2833, 'JDG.1.34', 'Les Amorhéens contraignent les fils de Dan à rester dans la montagne et leur interdisent la plaine')
nonBiblique(2833, 'tradition textuelle', 'le cas de Dan est attribué par la note à Josué 19,48 suivant les Septante, mais son contenu correspond à Juges 1,34 dans le canon local')
com(2834, ['JOS.21.44'], 'L’énoncé général admet une exception tribale selon une règle déjà appliquée ailleurs')
nonBiblique(2834, 'renvoi interne', 'renvoi explicite à la Question CXVII des Questions sur la Genèse')
com(2835, ['JOS.21.44', 'JDG.1.34'], 'Les onze tribus représentent le peuple entier malgré l’exception mystérieuse de Dan')
com(2836, ['JDG.1.34'], 'La situation particulière de Dan est rapprochée de la bénédiction prophétique de Jacob')
both(2836, 'GEN.49.17', 'Dan est comparé par Jacob à un serpent sur le chemin, interprété ici en relation avec l’Antéchrist')
com(2837, ['JOS.21.44'], 'L’absence de résistance vaut pour la guerre commune sous un chef unique avant le partage tribal')

// XXIII — sacrifices des saluts et unicité du Sauveur.
both(2838, 'JOS.22.23', 'Les sacrifices pacifiques ou sacrifices des saluts sont discutés à partir du pluriel du texte')
both(2838, 'LUK.2.30', 'Le Christ est appelé le salut de Dieu contemplé par Syméon')
com(2839, ['JOS.22.23'], 'Le pluriel des saluts est confronté à l’unicité du Seigneur et Sauveur')
both(2839, '1CO.8.6', 'Les chrétiens n’ont qu’un seul Seigneur, Jésus-Christ')
both(2839, 'PSA.104.15', 'Dieu interdit de toucher à ses christs, nom donné par grâce à plusieurs')

// XXIV — retourner par le chemin de toute la terre.
both(2840, 'JOS.23.14', 'Josué annonce qu’il va par le chemin de toute la terre à l’approche de sa mort')
nonBiblique(2840, 'version biblique', 'la version faite sur l’hébreu porte « j’entre dans le chemin »')
nonBiblique(2840, 'version biblique', 'la version des Septante porte « je retourne par le chemin »')
for (let numero = 2841; numero <= 2845; numero++) com(numero, ['JOS.23.14'], 'Les sens corporel et spirituel du retour par le chemin de toute la terre sont examinés')
both(2841, 'GEN.3.19', 'L’homme retourne à la terre dont il a été tiré')
both(2842, 'ECC.12.7', 'L’esprit retourne à Dieu qui l’a donné')
both(2843, 'PSA.77.39', 'Certains hommes sont un souffle qui passe et ne revient point')
nonBiblique(2844, 'tradition textuelle', 'discussion du choix du traducteur latin et du sens possible du grec ἀποτρέχω')
both(2845, 'GEN.24.51', 'Les parents de Rébecca disent au serviteur d’Abraham de la prendre et de retourner')

// XXV — toute la terre et la postérité véritable d’Abraham.
both(2846, 'JOS.24.3', 'Dieu tire Abraham d’au-delà du fleuve et le conduit dans la terre')
nonBiblique(2846, 'version biblique', 'les Septante portent « toute la terre »')
nonBiblique(2846, 'version biblique', 'la version faite sur l’hébreu porte « la terre de Chanaan »')
com(2847, ['JOS.24.3'], 'Toute la terre est interprétée prophétiquement comme la promesse accomplie dans le Christ et l’Église')
add(2847, 'GAL.3.29', 2, 'L’Église appartenant au Christ comme véritable postérité d’Abraham reprend la doctrine de Galates 3,29.')
add(2847, 'ROM.9.8', 2, 'La distinction entre enfants de la promesse et enfants de la chair reprend Romains 9,8.')

// XXVI — fermer les portes constitue un acte de guerre.
both(2848, 'JOS.24.11', 'Les habitants de Jéricho font la guerre à Israël en fermant leurs portes et en se retranchant')
for (const numero of [2849, 2850]) com(numero, ['JOS.24.11'], 'La guerre est définie par l’hostilité armée même en l’absence de bataille continuelle')

// XXVII — les guêpes envoyées devant Israël.
both(2851, 'JOS.24.12', 'Dieu envoie des guêpes devant Israël pour chasser ses ennemis')
both(2851, 'WIS.12.8', 'La Sagesse mentionne également l’envoi de guêpes comme précurseurs de l’armée divine')
com(2852, ['JOS.24.12'], 'Les guêpes peuvent désigner métaphoriquement les traits de la peur ou des esprits invisibles')
both(2852, 'PSA.77.49', 'Le psalmiste appelle mauvais anges les messagers de la colère divine')
com(2853, ['JOS.24.12'], 'Le silence du récit n’exclut pas l’envoi historique de véritables guêpes')

// XXVIII — incapacité de servir Dieu sans sa miséricorde.
both(2854, 'JOS.24.19', 'Josué déclare au peuple qu’il ne peut servir le Seigneur parce que Dieu est saint')
com(2855, ['JOS.24.19'], 'Le peuple devait choisir le service divin en plaçant sa confiance dans la miséricorde de Dieu')
both(2855, 'PSA.142.2', 'Nul vivant ne sera justifié si Dieu entre en jugement avec son serviteur')
com(2856, ['JOS.24.19'], 'La présomption d’une fidélité irréprochable explique l’avertissement de Josué')
both(2856, 'ROM.10.3', 'Israël cherche à établir sa propre justice sans se soumettre à celle de Dieu')
com(2857, ['JOS.24.19'], 'La Loi révèle l’incapacité humaine avant la surabondance de la grâce dans le Christ')
both(2857, 'ROM.5.20', 'La Loi survient afin que le péché abonde')
both(2857, 'ROM.5.21', 'La grâce surabonde et règne par Jésus-Christ pour la vie éternelle')
both(2857, 'ROM.10.4', 'Le Christ est la fin de la Loi pour la justification de tout croyant')

// XXIX — ôter les dieux étrangers du cœur.
both(2858, 'JOS.24.23', 'Josué ordonne d’ôter les dieux étrangers et de tourner le cœur vers le Seigneur')
com(2859, ['JOS.24.23'], 'L’ordre ne suppose pas nécessairement la conservation matérielle d’idoles parmi les Israélites')
add(2859, 'JOS.7.1', 2, 'Le larcin d’Achan dans l’anathème et la colère suscitée contre Israël sont rappelés sans référence explicite.')
add(2859, 'JOS.7.5', 2, 'Le châtiment collectif consécutif au larcin d’Achan est évoqué comme contraste avec la situation présente.')
com(2860, ['JOS.24.23'], 'L’ordre de Josué est comparé à celui de Jacob d’abandonner les idoles rapportées de Mésopotamie')
both(2860, 'GEN.31.19', 'Rachel dérobe les idoles de son père Laban')
both(2860, 'GEN.35.2', 'Jacob ordonne aux siens d’ôter les dieux étrangers')
both(2860, 'GEN.35.4', 'Les membres de la maison de Jacob remettent leurs dieux étrangers au patriarche')
for (const numero of [2861, 2862, 2863]) com(numero, ['JOS.24.23'], 'Les dieux étrangers sont interprétés comme les fausses représentations de Dieu présentes dans le cœur')
both(2863, '2CO.5.6', 'Les fidèles demeurent éloignés du Seigneur tant qu’ils habitent dans le corps')
both(2863, 'PSA.115.11', 'Tout homme est sujet à l’erreur ou menteur')
both(2863, '1CO.13.12', 'La connaissance présente en miroir et en énigme cédera à la vision face à face')

// XXX.1 — alliance, pierre témoin et typologie christologique.
both(2864, 'JOS.24.25', 'Josué conclut une alliance avec le peuple et lui donne loi et justice à Sichem')
both(2864, 'JOS.24.26', 'Josué écrit les paroles dans le livre de la Loi et place une grande pierre sous un arbre')
both(2865, 'JOS.24.27', 'La pierre sert de témoin parce qu’elle a entendu les paroles du Seigneur')
com(2866, ['JOS.24.27'], 'L’audition attribuée à la pierre appelle une interprétation spirituelle')
both(2866, 'PSA.113.14', 'Les idoles ont des oreilles et n’entendent point')
com(2867, ['JOS.24.27'], 'La pierre témoin est interprétée comme figure du Christ rejeté par les incrédules')
both(2867, '1PE.2.8', 'Le Christ est pierre d’achoppement et rocher de scandale pour les incrédules')
both(2867, 'PSA.117.22', 'La pierre rejetée par les architectes devient la tête de l’angle')
com(2868, ['JOS.24.27'], 'La pierre de Josué est rapprochée du rocher qui abreuve Israël et figure le Christ')
both(2868, 'EXO.17.6', 'Moïse frappe le rocher et l’eau en jaillit pour désaltérer le peuple')
both(2868, '1CO.10.4', 'La pierre spirituelle qui accompagne les pères est identifiée au Christ')
com(2869, ['JOS.24.27'], 'Les couteaux de pierre de la circoncision prolongent la typologie christologique de la pierre')
add(2869, 'JOS.5.2', 2, 'Les couteaux de pierre pris par Josué pour circoncire Israël sont rappelés comme symbole mystérieux.')
add(2869, 'JOS.5.3', 2, 'La circoncision d’Israël avec les couteaux de pierre est évoquée sans citation formelle.')
com(2870, ['JOS.24.27'], 'La pierre témoigne spirituellement contre les Juifs infidèles et menteurs')
both(2870, 'PSA.80.16', 'Les ennemis du Seigneur lui rendent un culte menteur')
both(2871, 'JOS.24.25', 'L’alliance conclue par Josué est distinguée de l’Alliance mosaïque déjà donnée')
com(2872, ['JOS.24.25'], 'L’alliance de Josué figure le Nouveau Testament comme la seconde Loi et les secondes tables')
add(2872, 'EXO.34.1', 2, 'Les nouvelles tables taillées à l’image des premières figurent le renouvellement de l’Alliance.')
both(2872, 'EXO.34.4', 'Moïse taille les secondes tables de pierre qui remplacent celles qu’il avait brisées')
com(2873, ['JOS.24.26', 'JOS.24.27'], 'Le bois du térébinthe avec la pierre reprend la figure de la verge et du rocher')
add(2873, 'EXO.17.6', 2, 'La verge appliquée au rocher pour faire sortir l’eau est reprise comme parallèle typologique du bois et de la pierre.')
com(2874, ['JOS.24.26'], 'La pierre placée sous le térébinthe figure l’abaissement du Christ sous la croix et le mystère encore voilé')
nonBiblique(2874, 'version biblique', 'les Septante identifient l’arbre de Josué à un térébinthe')
nonBiblique(2874, 'tradition textuelle', 'd’autres interprètes identifient l’arbre de Josué à un chêne')

// XXX.2 — peuples non exterminés par faiblesse plutôt que par malice.
for (const numero of [2875, 2877, 2878, 2879, 2880, 2881, 2882]) com(numero, ['JOS.17.13'], 'La soumission des Chananéens au tribut sans extermination est expliquée par la crainte et la faiblesse d’Israël')
both(2876, 'JOS.17.13', 'Israël devenu plus fort rend les Chananéens tributaires sans les exterminer entièrement')
both(2882, '2TI.4.14', 'Paul demande que le Seigneur rende à Alexandre le chaudronnier selon ses œuvres mauvaises')
both(2882, '2TI.4.16', 'Paul demande que l’abandon subi lors de sa première défense ne soit pas imputé à ceux qui ont eu peur')

if (createHash('sha256').update(readFileSync(CHARTE)).digest('hex') !== CHARTE_HASH) throw Error('Charte modifiée depuis la préparation du lot')
for (const [path, hash] of PREUVES) if (createHash('sha256').update(readFileSync(path)).digest('hex') !== hash) throw Error(`Preuve fac-similé modifiée : ${path}`)
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).map(line => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: bruts, error: e0 } = await sb.from('segments').select('id,id_oeuvre,segment_numero,ref_niv1,ref_niv2,ref_niv2_texte,segment_texte,texte_original,notes,nature,liens_revus_le,liens_revus_par').eq('id_oeuvre', OEUVRE).gte('segment_numero', DEBUT - 1).lte('segment_numero', FIN + 1).order('segment_numero')
if (e0) throw e0
const voisinAvant = bruts.find(s => s.segment_numero === DEBUT - 1)
const voisinApres = bruts.find(s => s.segment_numero === FIN + 1)
if (voisinAvant?.ref_niv1 !== REF_NIV1 || voisinAvant?.ref_niv2 !== 'Question XX') throw Error('Raccord amont invalide')
if (voisinApres?.ref_niv1 !== 'Livre septième' || voisinApres?.ref_niv2 !== 'Question I') throw Error('Raccord aval invalide')
const segments = bruts.filter(s => s.segment_numero >= DEBUT && s.segment_numero <= FIN)
if (segments.length !== TOTAL_SEGMENTS || segments.some((s, i) => s.segment_numero !== DEBUT + i) || segments.some(s => s.ref_niv1 !== REF_NIV1 || !QUESTIONS.includes(s.ref_niv2)) || [...new Set(segments.map(s => s.ref_niv2))].join('|') !== QUESTIONS.join('|')) throw Error('Préétat structurel invalide')
if (segments.some(s => s.liens_revus_le || s.liens_revus_par)) throw Error('Lot déjà relu')
const empreinte = createHash('sha256').update(JSON.stringify(segments.map(s => [s.id, s.segment_numero, s.ref_niv1, s.ref_niv2, s.ref_niv2_texte, s.segment_texte, s.texte_original, s.notes, s.nature]))).digest('hex')
if (empreinte !== EMPREINTE_ATTENDUE) throw Error(`Empreinte inattendue : ${empreinte}`)
const parNumero = new Map(segments.map(s => [s.segment_numero, s]))
for (const c of CORRECTIONS_TEXTE) if (!parNumero.get(c.numero)?.segment_texte.includes(c.dbAvant) || parNumero.get(c.numero).segment_texte.includes(c.dbApres)) throw Error(`Précondition texte invalide au segment ${c.numero}`)
for (const c of CORRECTIONS_NOTES) if (!parNumero.get(c.numero)?.notes?.includes(c.avant) || parNumero.get(c.numero).notes.includes(c.apres)) throw Error(`Précondition note invalide au segment ${c.numero}`)
const numerosClasses = new Set([...LIENS, ...NON_RESOLUS].map(l => l[0]))
const nonClasses = segments.filter(s => !numerosClasses.has(s.segment_numero) && !SANS_LIEN.has(s.segment_numero))
if (nonClasses.length) throw Error(`Segments non classés : ${nonClasses.map(s => s.segment_numero).join(', ')}`)
if ([...SANS_LIEN].some(n => numerosClasses.has(n) || !parNumero.has(n))) throw Error('Déclaration SANS_LIEN invalide')
if (LIENS.some(([n, c, t, m]) => !parNumero.has(n) || !c || ![1, 2, 3, 4].includes(t) || !m.trim())) throw Error('Lien biblique invalide')
if (NON_RESOLUS.some(([n, t, m]) => !parNumero.has(n) || t !== 4 || !m.startsWith('RÉFÉRENCE NON BIBLIQUE'))) throw Error('Référence non biblique invalide')
const cles = LIENS.map(([n, c, t]) => `${n}|${c}|${t}`)
if (new Set(cles).size !== cles.length) throw Error('Doublon interne dans le manifeste')
const cibles = [...new Set(LIENS.map(([, c]) => c))]
const { data: versets, error: e1 } = await sb.from('versets_lecture').select('id_verset,TR0001,TR0003,TR0004').in('id_verset', cibles)
if (e1) throw e1
const parCible = new Map(versets.map(v => [v.id_verset, v]))
const absentes = cibles.filter(c => !parCible.has(c))
if (absentes.length) throw Error(`Cibles absentes : ${absentes.join(', ')}`)
const sansTemoin = cibles.filter(c => { const v = parCible.get(c); return !v.TR0001 && !v.TR0003 && !v.TR0004 })
if (sansTemoin.length) throw Error(`Cibles sans témoin local : ${sansTemoin.join(', ')}`)
if (!parCible.get('JOS.21.43')?.TR0001 || !parCible.get('JOS.21.44')?.TR0003 || !parCible.get('JOS.21.44')?.TR0004 || !parCible.get('JOS.21.45')?.TR0003 || !parCible.get('JOS.21.45')?.TR0004) throw Error('Crénelage conclusif de Josué 21 inattendu')
const ids = segments.map(s => s.id)
const [{ count: liensExistants, error: e2 }, { count: relusGlobaux, error: e3 }] = await Promise.all([
  sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  sb.from('segments').select('id', { count: 'exact', head: true }).eq('id_oeuvre', OEUVRE).not('liens_revus_le', 'is', null),
])
if (e2 || e3) throw (e2 || e3)
if (liensExistants) throw Error(`${liensExistants} liens préexistants dans le lot`)
const candidatsPath = 'scripts/heptateuque/segmentation-candidate/segments-candidate.json'
const sourceMapPath = 'scripts/heptateuque/segmentation-candidate/source-map.json'
const candidats = JSON.parse(readFileSync(candidatsPath, 'utf8'))
const sourceMap = JSON.parse(readFileSync(sourceMapPath, 'utf8'))
for (const c of CORRECTIONS_TEXTE) {
  const candidat = candidats.find(s => s.segment_numero === c.numero)
  if (!candidat?.segment_texte.includes(c.candidatAvant) || candidat.segment_texte.includes(c.candidatApres)) throw Error(`Candidat texte non synchronisable au segment ${c.numero}`)
  candidat.segment_texte = candidat.segment_texte.replace(c.candidatAvant, c.candidatApres)
  const sources = sourceMap.filter(s => s.first_segment_numero <= c.numero && s.last_segment_numero >= c.numero && s.source_clean?.includes(c.sourceAvant))
  if (sources.length !== 1) throw Error(`Source-map non synchronisable au segment ${c.numero} : ${sources.length}`)
  sources[0].source_clean = sources[0].source_clean.replace(c.sourceAvant, c.sourceApres)
}
for (const c of CORRECTIONS_NOTES) {
  const candidat = candidats.find(s => s.segment_numero === c.numero)
  if (!candidat?.notes?.includes(c.avant) || candidat.notes.includes(c.apres)) throw Error(`Candidat note non synchronisable au segment ${c.numero}`)
  candidat.notes = candidat.notes.replace(c.avant, c.apres)
}
const total = LIENS.length + NON_RESOLUS.length
const types = LIENS.reduce((a, l) => { a[l[2]] = (a[l[2]] || 0) + 1; return a }, {})
for (const [, type] of NON_RESOLUS) types[type] = (types[type] || 0) + 1
const liensParQuestion = Object.fromEntries(QUESTIONS.map(q => { const ns = new Set(segments.filter(s => s.ref_niv2 === q).map(s => s.segment_numero)); return [q, [...LIENS, ...NON_RESOLUS].filter(([n]) => ns.has(n)).length] }))
const pct = n => `${n} / 3262 = ${(100 * n / 3262).toFixed(2).replace('.', ',')} %`
console.log(JSON.stringify({ mode: WRITE ? 'écriture' : 'contrôle', lot: 'Josué XXI-XXX', bornes: [DEBUT, FIN], voisins: { avant: [voisinAvant.segment_numero, voisinAvant.ref_niv2], apres: [voisinApres.segment_numero, voisinApres.ref_niv1, voisinApres.ref_niv2] }, segments: TOTAL_SEGMENTS, corrections_texte: CORRECTIONS_TEXTE.length, corrections_notes: CORRECTIONS_NOTES.length, liens: total, liens_bibliques: LIENS.length, sans_cible_a_constituer: NON_RESOLUS.length, sans_lien: [...SANS_LIEN], cibles_distinctes: cibles.length, types, liens_par_question: liensParQuestion, empreinte, anciennes_numerotations_arbitrees: ['Josué 21,41-43 imprimé → JOS.21.43-45 selon le contenu local', 'Josué 19,48 LXX → JDG.1.34 selon le contenu', 'Psaume 104,16 imprimé → PSA.104.15', 'Psaume 113,6 imprimé → PSA.113.14', '1 Pierre 2,6 imprimé → 1PE.2.8', '1 Corinthiens 13,13 imprimé → 1CO.13.12', 'Exode 34,3 et suivants → EXO.34.1 et EXO.34.4 pour les secondes tables'], sic: 'aucun sic dans le lot ; aucune anomalie numérique, syntaxique ou de ponctuation n’en reçoit', avancement_actuel: pct(relusGlobaux), avancement_apres_ecriture_ulterieure: pct(relusGlobaux + TOTAL_SEGMENTS) }, null, 2))
if (DETAIL) {
  for (const [numero, canonId, type, motif] of LIENS) console.log({ numero, canonId, type, motif, segment: parNumero.get(numero).segment_texte, ...parCible.get(canonId) })
  for (const [numero, type, motif] of NON_RESOLUS) console.log({ numero, canonId: null, type, motif, segment: parNumero.get(numero).segment_texte })
}
if (!WRITE) process.exit(0)

const horodatage = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
const sauvegardePath = `scripts/heptateuque/audit-reprise/sauvegarde-josue-q21-q30-${horodatage}.json`
mkdirSync('scripts/heptateuque/audit-reprise', { recursive: true })
writeFileSync(sauvegardePath, `${JSON.stringify({ oeuvre: OEUVRE, bornes: [DEBUT, FIN], empreinte, segments, liens_existants: [] }, null, 2)}\n`, 'utf8')
const quote = value => `'${String(value).replaceAll("'", "''")}'`
const valeurs = [...LIENS.map(([n, c, t, m]) => `(${parNumero.get(n).id}, ${quote(c)}, ${t}, 'vérifié', ${quote(m)}, 'lecture', false)`), ...NON_RESOLUS.map(([n, t, m]) => `(${parNumero.get(n).id}, null, ${t}, 'à constituer', ${quote(m)}, 'lecture', true)`)].join(',\n    ')
const idsSql = ids.join(', ')
const correctionsTexteSql = CORRECTIONS_TEXTE.map(c => `update segments set segment_texte = replace(segment_texte, ${quote(c.dbAvant)}, ${quote(c.dbApres)}) where id = ${parNumero.get(c.numero).id} and segment_texte like ${quote(`%${c.dbAvant}%`)};
  get diagnostics n = row_count; if n <> 1 then raise exception 'Correction texte segment ${c.numero}: %/1', n; end if;`).join('\n  ')
const correctionsNotesSql = CORRECTIONS_NOTES.map(c => `update segments set notes = replace(notes, ${quote(c.avant)}, ${quote(c.apres)}) where id = ${parNumero.get(c.numero).id} and notes like ${quote(`%${c.avant}%`)};
  get diagnostics n = row_count; if n <> 1 then raise exception 'Correction note segment ${c.numero}: %/1', n; end if;`).join('\n  ')
const sql = `do $passe$ declare n integer; begin
  if exists (select 1 from liens_bibliques where segment_id in (${idsSql})) then raise exception 'Liens déjà présents'; end if;
  if exists (select 1 from segments where id in (${idsSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Marques déjà présentes'; end if;
  if (select count(*) from segments where id in (${idsSql}) and id_oeuvre = '${OEUVRE}' and ref_niv1 = ${quote(REF_NIV1)} and ref_niv2 in (${QUESTIONS.map(quote).join(', ')}) and segment_numero between ${DEBUT} and ${FIN}) <> ${TOTAL_SEGMENTS} then raise exception 'Préconditions structurelles invalides'; end if;
  ${correctionsTexteSql}
  ${correctionsNotesSql}
  insert into liens_bibliques (segment_id, canon_id, type, fiabilite, motif, provenance, arbitrage_requis) values ${valeurs};
  get diagnostics n = row_count; if n <> ${total} then raise exception 'Liens %/${total}', n; end if;
  update segments set liens_revus_le = now(), liens_revus_par = ${quote(RELECTEUR)} where id in (${idsSql});
  get diagnostics n = row_count; if n <> ${TOTAL_SEGMENTS} then raise exception 'Segments %/${TOTAL_SEGMENTS}', n; end if;
end $passe$;`
const { error: ecritureErreur } = await sb.rpc('exec_sql', { sql })
if (ecritureErreur) throw ecritureErreur
const [{ count: liensApres, error: e4 }, { count: relusApres, error: e5 }, { data: audit, error: e6 }, { data: etatApres, error: e7 }] = await Promise.all([
  sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  sb.from('segments').select('id', { count: 'exact', head: true }).in('id', ids).not('liens_revus_le', 'is', null),
  sb.from('liens_bibliques').select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id', ids),
  sb.from('segments').select('segment_numero,segment_texte,notes').in('id', ids),
])
if (e4 || e5 || e6 || e7) throw (e4 || e5 || e6 || e7)
const post = new Map(etatApres.map(s => [s.segment_numero, s]))
const texteInvalide = CORRECTIONS_TEXTE.some(c => post.get(c.numero).segment_texte.includes(c.dbAvant) || !post.get(c.numero).segment_texte.includes(c.dbApres))
const noteInvalide = CORRECTIONS_NOTES.some(c => post.get(c.numero).notes.includes(c.avant) || !post.get(c.numero).notes.includes(c.apres))
if (liensApres !== total || relusApres !== TOTAL_SEGMENTS || texteInvalide || noteInvalide || audit.some(l => !l.motif || l.provenance !== 'lecture' || (l.canon_id ? l.fiabilite !== 'vérifié' || l.arbitrage_requis : l.fiabilite !== 'à constituer' || !l.arbitrage_requis || l.type !== 4 || !l.motif.startsWith('RÉFÉRENCE NON BIBLIQUE')))) throw Error('Postcontrôle invalide')
const clesApres = audit.map(l => `${l.segment_id}|${l.canon_id ?? 'sans-cible'}|${l.type}|${l.motif}`)
if (new Set(clesApres).size !== clesApres.length) throw Error('Doublon dans le postétat')
writeFileSync(candidatsPath, `${JSON.stringify(candidats, null, 2)}\n`, 'utf8')
writeFileSync(sourceMapPath, `${JSON.stringify(sourceMap, null, 2)}\n`, 'utf8')
console.log(`✓ ${liensApres} liens, ${relusApres} segments, sauvegarde ${sauvegardePath}`)
