import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const DEBUT = 1472
const FIN = 1532
const TOTAL_SEGMENTS = 61
const QUESTIONS = Array.from({ length: 10 }, (_, index) => `Question ${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][index]}`)
const WRITE = process.argv.includes('--write')
const DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Lévitique Q. I-X'
const EMPREINTE_ATTENDUE = '137c899c9aa0a6aefe8b050cd6c8bed3b2ba03d159c8940630c592f978a700d5'
const SANS_LIEN = new Set()
const LIENS = []
const NON_RESOLUS = []

const add = (ns, canonId, type, motif) => {
  for (const numero of ns) LIENS.push([numero, canonId, type, motif])
}
const cite = (n, canonId, motif) => add([n], canonId, 1, motif)
const com = (ns, canonId, motif) => add(ns, canonId, 3, motif)
const citeCom = (n, canonId, citation, commentaire) => {
  cite(n, canonId, citation)
  com([n], canonId, commentaire)
}
const nonBiblique = (n, motif) => NON_RESOLUS.push([n, 4, `RÉFÉRENCE NON BIBLIQUE ${motif}`])

// Question I — obligation de témoigner (Lévitique 5,1).
citeCom(1472, 'LEV.5.1', 'Citation explicite vérifiée de l’obligation faite au témoin de déclarer ce qu’il a vu ou sait.', 'Le silence coupable du témoin est expliqué comme la faute portée par Lévitique 5,1.')
com([1473, 1474, 1475, 1476, 1477], 'LEV.5.1', 'La connaissance du parjure, le devoir de dénonciation et les destinataires possibles de cette dénonciation sont directement discutés.')

// Question II — unité des fautes et du sacrifice (Lévitique 5,2-6).
citeCom(1478, 'LEV.5.2', 'Citation explicite vérifiée du contact avec le cadavre d’un animal impur.', 'Le premier cas d’impureté involontaire est examiné dans la suite des fautes énumérées.')
citeCom(1478, 'LEV.5.3', 'Citation explicite vérifiée du contact avec une impureté humaine.', 'Le contact avec une impureté humaine est intégré à la même énumération sans sacrifice encore formulé.')
citeCom(1479, 'LEV.5.4', 'Citation explicite vérifiée du serment inconsidéré de faire du mal ou du bien.', 'Le serment fait dans l’ignorance est distingué des deux cas d’impureté précédents.')
citeCom(1479, 'LEV.5.5', 'Citation explicite vérifiée de l’aveu de la faute reconnue.', 'La confession du péché clôt l’énumération avant la prescription du sacrifice.')
citeCom(1480, 'LEV.5.6', 'Citation explicite vérifiée de la brebis ou chèvre offerte pour le péché et de l’expiation sacerdotale.', 'Le sacrifice de Lévitique 5,6 est interprété comme applicable à l’ensemble des fautes précédemment énumérées.')
for (const cible of ['LEV.5.1', 'LEV.5.2', 'LEV.5.3', 'LEV.5.4', 'LEV.5.6']) {
  com([1481], cible, 'La comparaison porte sur les différents péchés énumérés et sur le sacrifice qui paraît n’être formulé qu’au terme de la série.')
}
for (const cible of ['LEV.5.1', 'LEV.5.2', 'LEV.5.3', 'LEV.5.4', 'LEV.5.5', 'LEV.5.6']) {
  com([1482], cible, 'La prescription sacrificielle finale est comprise comme commune à tous les cas successivement énumérés.')
}
com([1483, 1484, 1485], 'LEV.5.2', 'Le vocabulaire grec et latin désignant les cadavres d’animaux impurs est directement analysé.')

// Question III — sens des formules de Lévitique 5,4-6 et parallèles scripturaires.
citeCom(1486, 'LEV.5.4', 'Citation explicite vérifiée du serment formulé avec les lèvres pour faire du bien ou du mal.', 'Le verbe distinguere est étudié comme terme technique de formulation précise du serment.')
cite(1487, 'PSA.65.13', 'Citation explicite vérifiée du vœu dont le psalmiste promet de s’acquitter.')
cite(1487, 'PSA.65.14', 'Citation explicite vérifiée des vœux formulés par les lèvres, selon la note Psaume 65,13-14.')
cite(1487, 'EZK.3.18', 'Citation explicite vérifiée de l’avertissement à adresser au méchant condamné à mourir.')
cite(1487, 'NUM.30.4', 'Citation explicite vérifiée du vœu précis d’une jeune fille demeurant dans la maison de son père.')
com([1488], 'LEV.5.4', 'Distinguere est défini comme la formulation qui détermine précisément l’objet du serment.')
citeCom(1489, 'LEV.5.4', 'Reformulation citationnelle vérifiée du serment de faire du mal ou du bien et de sa reconnaissance ultérieure.', 'Les propositions de Lévitique 5,4 sont réordonnées et expliquées grammaticalement.')
citeCom(1489, 'LEV.5.5', 'Reformulation citationnelle vérifiée de l’aveu du péché commis.', 'La construction latine de l’aveu est expliquée comme locution scripturaire.')
citeCom(1490, 'LEV.5.5', 'Citation explicite vérifiée de l’aveu fait contre son propre péché.', 'Les mots « contre lui » sont interprétés comme l’accusation de sa faute par le coupable lui-même.')
citeCom(1490, 'LEV.5.6', 'Citation explicite vérifiée de la jeune brebis femelle offerte pour le péché.', 'La formule sacrificielle ouvre l’analyse des redondances de genre et d’espèce.')
com([1491], 'LEV.5.6', 'Les expressions « femelle », « parmi les chèvres » et « parmi les brebis » sont expliquées comme tours propres au texte sacré.')
for (const cible of ['LEV.5.2', 'LEV.5.3', 'LEV.5.4']) {
  com([1492, 1493, 1494, 1495, 1496], cible, 'L’ordre entre ignorance, connaissance et culpabilité dans les trois cas parallèles est discuté comme une inversion propre au langage scripturaire.')
}
citeCom(1497, 'LEV.5.2', 'Recomposition citationnelle vérifiée du contact avec le cadavre d’un animal impur.', 'La proposition est rétablie dans l’ordre logique : faute commise dans l’ignorance, puis reconnue.')
citeCom(1497, 'LEV.5.3', 'Recomposition citationnelle vérifiée du contact avec une impureté humaine.', 'Le second cas est rétabli selon le même ordre logique.')

// Question IV — offrande des oiseaux par le pauvre.
citeCom(1498, 'LEV.5.7', 'Citation explicite vérifiée des deux oiseaux offerts par celui qui ne peut fournir une brebis.', 'La distinction entre l’oiseau pour le péché et celui offert en holocauste résout la difficulté précédente.')
com([1499], 'LEV.5.7', 'Les deux oiseaux sont interprétés comme l’association nécessaire du sacrifice pour le péché et de l’holocauste.')
citeCom(1499, 'LEV.1.14', 'Référence explicite vérifiée, avec note, à l’holocauste d’un seul oiseau.', 'L’unique oiseau de l’holocauste ordinaire est opposé aux deux oiseaux de Lévitique 5,7.')
citeCom(1500, 'LEV.4.35', 'Citation explicite vérifiée, avec note, de l’offrande posée sur les sacrifices consumés sur l’autel.', 'L’ordre des sacrifices est comparé à celui des deux oiseaux offerts pour la faute.')
com([1500], 'LEV.5.8', 'Le premier oiseau est expressément offert pour le péché.')
com([1500], 'LEV.5.10', 'Le second oiseau est ensuite offert en holocauste.')

// Questions V-VI — « âme » et faute contre les choses saintes.
citeCom(1501, 'LEV.5.15', 'Citation intentionnelle vérifiée de la formulation où « âme » désigne la personne qui pèche par ignorance, selon la tradition textuelle commentée.', 'Le mot anima est expliqué comme synonyme d’homme dans la loi sur la faute envers les choses saintes.')
citeCom(1502, 'LEV.5.15', 'Citation explicite vérifiée de la faute involontaire commise contre les choses saintes du Seigneur.', 'La nature de cette faute est recherchée à partir de la restitution prescrite ensuite.')
citeCom(1502, 'LEV.5.16', 'Citation explicite vérifiée de la restitution augmentée d’un cinquième.', 'La restitution permet d’identifier la faute comme appropriation d’une chose réservée au sanctuaire.')
com([1503], 'LEV.5.15', 'Le péché contre les choses saintes est interprété comme une prise involontaire de prémices ou d’oblations réservées.')
com([1503], 'LEV.5.16', 'La restitution et le cinquième en sus confirment l’interprétation patrimoniale de la faute.')

// Question VII — faute générale dans le service du Seigneur.
for (const cible of ['LEV.5.17', 'LEV.5.18', 'LEV.5.19']) {
  citeCom(1504, cible, 'Citation explicite vérifiée de cet élément de la loi sur la faute commise par ignorance devant le Seigneur.', 'La prescription du bélier et la formule « devant le Seigneur » sont directement examinées.')
}
for (const cible of ['LEV.5.17', 'LEV.5.18', 'LEV.5.19']) {
  com([1505], cible, 'Cette loi générale est comparée aux lois antérieures sur les péchés d’ignorance afin d’en déterminer la différence.')
}
com([1505], 'LEV.4.2', 'La prescription générale de Lévitique 4,2 sert de terme de comparaison à la nouvelle loi.')
com([1506], 'LEV.5.17', 'Le caractère apparemment général de la faute est maintenu dans la recherche de son sacrifice propre.')
com([1506], 'LEV.5.18', 'Le bélier prescrit est comparé aux victimes des autres péchés d’ignorance.')
for (const [cible, objet] of [
  ['LEV.4.3', 'le taureau offert pour le péché du prêtre'],
  ['LEV.4.14', 'le taureau offert pour le péché de l’assemblée'],
  ['LEV.4.23', 'le bouc offert pour le péché du prince'],
  ['LEV.4.28', 'la chèvre offerte pour le péché d’un particulier'],
  ['LEV.4.32', 'la brebis femelle offerte pour le péché d’un particulier'],
]) {
  citeCom(1507, cible, `Référence intentionnelle vérifiée à ${objet}.`, 'Les victimes réglées selon la qualité des personnes sont comparées au bélier de Lévitique 5,18.')
}
for (const [cible, objet] of [
  ['LEV.5.1', 'le silence gardé sur le serment'],
  ['LEV.5.2', 'le contact avec un cadavre animal impur'],
  ['LEV.5.3', 'le contact avec une impureté humaine'],
  ['LEV.5.4', 'le serment inconsidéré'],
  ['LEV.5.6', 'la brebis ou chèvre offerte pour ces fautes'],
  ['LEV.5.7', 'les deux oiseaux offerts par le pauvre'],
  ['LEV.5.11', 'la fleur de farine offerte à défaut des oiseaux'],
  ['LEV.5.15', 'le bélier pour la faute envers les choses saintes'],
  ['LEV.5.16', 'la restitution augmentée d’un cinquième'],
]) {
  citeCom(1508, cible, `Référence intentionnelle vérifiée à ${objet}.`, 'Les espèces particulières de fautes et leurs sacrifices propres sont récapitulés pour les distinguer de la loi générale.')
}
citeCom(1509, 'LEV.5.17', 'Citation explicite vérifiée de la faute générale commise contre un commandement du Seigneur.', 'La généralité de Lévitique 5,17 est confrontée aux formules parallèles du chapitre 4.')
com([1509], 'LEV.5.18', 'Le bélier est opposé à la chèvre ou à la brebis prévues par la loi générale antérieure.')
for (const cible of ['LEV.4.13', 'LEV.4.22', 'LEV.4.27']) {
  citeCom(1509, cible, 'Référence explicite vérifiée, selon la note Lévitique 4,13.22 « etc. », à une des formulations parallèles du péché contre les commandements.', 'La formulation du péché d’ignorance est comparée à celle de Lévitique 5,17.')
}
citeCom(1510, 'LEV.5.19', 'Citation explicite vérifiée de la formule « il a commis un délit devant le Seigneur ».', 'Les mots « devant le Seigneur » sont interprétés comme désignant une faute dans le service du tabernacle.')
citeCom(1511, 'LEV.5.15', 'Citation explicite vérifiée du péché contre les choses saintes.', 'La première faute envers le sanctuaire est rappelée pour éclairer la formule générale suivante.')
citeCom(1511, 'LEV.5.16', 'Référence intentionnelle vérifiée à la restitution prescrite pour la chose sainte appropriée.', 'La restitution fonde l’interprétation de la faute comme appropriation d’une chose sainte.')
for (const cible of ['LEV.5.15', 'LEV.5.16', 'LEV.5.17', 'LEV.5.18']) {
  com([1512], cible, 'Les deux lois voisines sont distinguées comme appropriation d’une chose sainte et autres fautes involontaires dans le culte, toutes deux expiées par un bélier.')
}
com([1513], 'LEV.5.19', 'La formule « devant le Seigneur » est généralisée aux sacrifices, prémices et oblations du service divin.')

// Question VIII — portée de l’exception accordée au pauvre.
citeCom(1514, 'LEV.5.7', 'Référence intentionnelle vérifiée aux deux oiseaux offerts à défaut d’une brebis.', 'La portée générale ou particulière de l’allègement accordé au pauvre est directement examinée.')
citeCom(1514, 'LEV.5.11', 'Référence intentionnelle vérifiée à la fleur de farine offerte à défaut des deux oiseaux.', 'Le second degré de l’allègement accordé au pauvre est inclus dans la question.')
for (const [cible, objet] of [
  ['LEV.4.3', 'le taureau du prêtre'],
  ['LEV.4.14', 'le taureau de l’assemblée'],
  ['LEV.4.23', 'le bouc du prince'],
  ['LEV.5.1', 'le silence sur le serment d’autrui'],
  ['LEV.5.2', 'le contact avec un cadavre animal impur'],
  ['LEV.5.3', 'le contact avec une impureté humaine'],
  ['LEV.5.4', 'le serment inconsidéré'],
  ['LEV.5.6', 'la brebis ou chèvre prescrite pour ces fautes'],
]) {
  citeCom(1515, cible, `Référence intentionnelle vérifiée à ${objet}.`, 'Les sacrifices généraux et les trois fautes nommément désignées sont comparés pour déterminer la portée de l’exception des pauvres.')
}
com([1516], 'LEV.5.7', 'L’autorisation d’offrir des oiseaux est testée comme possible différence propre aux fautes expressément nommées.')
com([1516], 'LEV.5.11', 'L’autorisation subsidiaire d’offrir de la farine nourrit la même difficulté concernant les indigents.')
com([1516], 'LEV.4.2', 'La loi générale des péchés d’ignorance est opposée aux exceptions où l’offrande du pauvre est explicitée.')
for (const cible of ['LEV.5.6', 'LEV.5.7', 'LEV.5.11', 'LEV.4.32']) {
  com([1517], cible, 'Les différences d’âge des victimes et les substitutions par oiseaux ou farine sont examinées comme accommodements possibles à la pauvreté.')
}
for (const cible of ['LEV.4.2', 'LEV.5.1', 'LEV.5.17']) {
  com([1518], cible, 'La loi générale fondée sur la qualité des personnes est distinguée des exceptions ultérieures fondées sur des espèces de péchés.')
}
citeCom(1519, '1CO.6.18', 'Citation explicite vérifiée de la proposition selon laquelle tout péché de l’homme est hors du corps.', 'La formulation universelle de Paul sert de parallèle grammatical à une règle générale suivie d’une exception.')
citeCom(1520, '1CO.6.18', 'Citation explicite vérifiée de l’exception : celui qui commet la fornication pèche contre son propre corps.', 'L’exception paulinienne explicite la manière dont une loi générale peut réserver un cas particulier.')
citeCom(1521, '1CO.6.18', 'Reformulation citationnelle vérifiée des deux propositions sur le péché hors du corps et la fornication.', 'La phrase paulinienne est réécrite dans l’ordre explicite règle générale puis exception.')
for (const cible of ['LEV.4.2', 'LEV.5.1', 'LEV.5.17']) {
  com([1522], cible, 'La conclusion maintient dans la loi générale tous les péchés d’ignorance qui ne font pas l’objet d’une exception expressément formulée.')
}

// Question IX — prix du bélier, puis enlèvement des cendres.
citeCom(1523, 'LEV.5.25', 'Citation explicite vérifiée du bélier sans défaut offert à prix d’argent ; la référence imprimée Lévitique 6,6 suit la numérotation hébraïque.', 'Le mot « prix » est expliqué comme obligation d’acheter la victime, non comme équivalence avec la faute.')
com([1524], 'LEV.5.25', 'L’absence de montant déterminé est interprétée comme signe que l’achat lui-même porte une signification.')
citeCom(1525, 'LEV.5.15', 'Citation explicite vérifiée, avec note, du bélier évalué en sicles du sanctuaire.', 'Le pluriel des sicles est interprété comme excluant une victime ne valant qu’un seul sicle.')
citeCom(1526, 'LEV.5.25', 'Citation explicite vérifiée du bélier sans tache offert à prix d’argent pour le délit.', 'La formule « pour le délit » est expliquée comme désignant la finalité de l’offrande.')
citeCom(1527, 'LEV.6.3', 'Citation explicite vérifiée de l’enlèvement des restes consumés de l’holocauste ; la note Lévitique 6,10 suit la numérotation hébraïque.', 'La difficulté porte sur le nom d’holocauste donné aux cendres laissées après la combustion nocturne.')
com([1528, 1529], 'LEV.6.3', 'Les variantes grecques holocarpoma, holocaustosis et katakarposis sont examinées pour identifier les restes de cendres et de charbons.')

// Question X — holocauste nocturne et feu non éteint (Lévitique 6,2 local = 6,9 hébreu).
citeCom(1530, 'LEV.6.2', 'Citation explicite vérifiée de la loi de l’holocauste brûlant toute la nuit et du feu entretenu sur l’autel.', 'La construction de la phrase et l’insistance sur le feu nocturne sont directement analysées.')
citeCom(1531, 'LEV.6.2', 'Reprise citationnelle vérifiée de l’holocauste sur le brasier toute la nuit et du feu brûlant sur l’autel.', 'La suppression hypothétique de la conjonction « et » sert à expliquer la syntaxe du verset.')
citeCom(1532, 'LEV.6.2', 'Citation explicite vérifiée des mots « il ne s’éteindra point » et « toute la nuit ».', 'La seconde formule est comprise comme répétition insistante de l’ordre déjà donné.')

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .map(line => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
    .filter(Boolean)
    .map(match => [match[1], match[2].replace(/^["']|["']$/g, '')]),
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const { data: bruts, error: e0 } = await sb
  .from('segments')
  .select('id,segment_numero,ref_niv1,ref_niv2,ref_niv2_texte,segment_texte,texte_original,notes,nature,liens_revus_le,liens_revus_par')
  .eq('id_oeuvre', OEUVRE)
  .gte('segment_numero', DEBUT - 1)
  .lte('segment_numero', FIN + 1)
  .order('segment_numero')
if (e0) throw e0

const voisinAvant = bruts.find(segment => segment.segment_numero === DEBUT - 1)
const voisinApres = bruts.find(segment => segment.segment_numero === FIN + 1)
if (voisinAvant?.ref_niv1 !== 'Livre deuxième' || voisinAvant?.ref_niv2 !== 'Question CLXXVII') throw Error('Raccord amont invalide')
if (voisinApres?.ref_niv1 !== 'Livre troisième' || voisinApres?.ref_niv2 !== 'Question XI') throw Error('Raccord aval invalide')

const segments = bruts.filter(segment => segment.segment_numero >= DEBUT && segment.segment_numero <= FIN)
if (
  segments.length !== TOTAL_SEGMENTS
  || segments.some((segment, index) => segment.segment_numero !== DEBUT + index)
  || segments.some(segment => segment.ref_niv1 !== 'Livre troisième' || !QUESTIONS.includes(segment.ref_niv2))
  || [...new Set(segments.map(segment => segment.ref_niv2))].join('|') !== QUESTIONS.join('|')
) throw Error('Préétat structurel invalide')
if (segments.some(segment => segment.liens_revus_le || segment.liens_revus_par)) throw Error('Lot déjà relu')

const empreinte = createHash('sha256')
  .update(JSON.stringify(segments.map(segment => [segment.id, segment.segment_numero, segment.ref_niv1, segment.ref_niv2, segment.ref_niv2_texte, segment.segment_texte, segment.texte_original, segment.notes, segment.nature])))
  .digest('hex')
if (empreinte !== EMPREINTE_ATTENDUE) throw Error(`Empreinte inattendue : ${empreinte}`)

const parNumero = new Map(segments.map(segment => [segment.segment_numero, segment]))
const numerosClasses = new Set([...LIENS, ...NON_RESOLUS].map(lien => lien[0]))
const nonClasses = segments.filter(segment => !numerosClasses.has(segment.segment_numero) && !SANS_LIEN.has(segment.segment_numero))
if (nonClasses.length) throw Error(`Segments non classés : ${nonClasses.map(segment => segment.segment_numero).join(', ')}`)
if (LIENS.some(([numero, canonId, type, motif]) => !parNumero.has(numero) || !canonId || ![1, 2, 3, 4].includes(type) || !motif.trim())) throw Error('Lien biblique invalide dans le manifeste')
if (NON_RESOLUS.some(([numero, type, motif]) => !parNumero.has(numero) || type !== 4 || !motif.startsWith('RÉFÉRENCE NON BIBLIQUE'))) throw Error('Référence non biblique invalide dans le manifeste')
const cles = LIENS.map(([numero, canonId, type]) => `${numero}|${canonId}|${type}`)
const vues = new Set()
const doublons = cles.filter(cle => vues.has(cle) || !vues.add(cle))
if (doublons.length) throw Error(`Doublons dans le manifeste : ${doublons.join(', ')}`)

const cibles = [...new Set(LIENS.map(([, canonId]) => canonId))]
const { data: versets, error: e1 } = await sb.from('versets_lecture').select('id_verset,TR0001,TR0003,TR0004').in('id_verset', cibles)
if (e1) throw e1
const parCible = new Map(versets.map(verset => [verset.id_verset, verset]))
const absentes = cibles.filter(cible => !parCible.has(cible))
if (absentes.length) throw Error(`Cibles absentes : ${absentes.join(', ')}`)
if (cibles.some(cible => {
  const verset = parCible.get(cible)
  return !verset.TR0001 && !verset.TR0003 && !verset.TR0004
})) throw Error('Cible sans aucun des trois témoins locaux')

const ids = segments.map(segment => segment.id)
const { count: liensExistants, error: e2 } = await sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids)
if (e2) throw e2
if (liensExistants) throw Error(`${liensExistants} liens préexistants dans le lot`)

const total = LIENS.length + NON_RESOLUS.length
const types = LIENS.reduce((acc, lien) => {
  acc[lien[2]] = (acc[lien[2]] || 0) + 1
  return acc
}, {})
if (NON_RESOLUS.length) types[4] = (types[4] || 0) + NON_RESOLUS.length
console.log(JSON.stringify({
  mode: WRITE ? 'écriture' : 'contrôle',
  lot: 'Lévitique I-X',
  bornes: [DEBUT, FIN],
  voisins: { avant: [voisinAvant.segment_numero, voisinAvant.ref_niv1, voisinAvant.ref_niv2], apres: [voisinApres.segment_numero, voisinApres.ref_niv1, voisinApres.ref_niv2] },
  ref_niv1: 'Livre troisième',
  questions: QUESTIONS,
  segments: TOTAL_SEGMENTS,
  liens: total,
  liens_bibliques: LIENS.length,
  sans_cible_a_constituer: NON_RESOLUS.length,
  sans_lien: [...SANS_LIEN],
  cibles_distinctes: cibles.length,
  types,
  empreinte,
  avancement_actuel: '1412 / 3262 = 43,29 %',
  avancement_apres_ecriture_ulterieure: '1473 / 3262 = 45,16 %',
}, null, 2))

if (DETAIL) {
  for (const [numero, canonId, type, motif] of LIENS) console.log({ numero, canonId, type, motif, segment: parNumero.get(numero).segment_texte, ...parCible.get(canonId) })
  for (const [numero, type, motif] of NON_RESOLUS) console.log({ numero, canonId: null, type, motif, segment: parNumero.get(numero).segment_texte })
}
if (!WRITE) process.exit(0)

const quote = value => `'${String(value).replaceAll("'", "''")}'`
const valeurs = [
  ...LIENS.map(([numero, canonId, type, motif]) => `(${parNumero.get(numero).id}, ${quote(canonId)}, ${type}, 'vérifié', ${quote(motif)}, 'lecture', false)`),
  ...NON_RESOLUS.map(([numero, type, motif]) => `(${parNumero.get(numero).id}, null, ${type}, 'à constituer', ${quote(motif)}, 'lecture', true)`),
].join(',\n    ')
const idsSql = ids.join(', ')
const sql = `do $passe$ declare n integer; begin
  if exists (select 1 from liens_bibliques where segment_id in (${idsSql})) then raise exception 'Liens déjà présents'; end if;
  if exists (select 1 from segments where id in (${idsSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Marques déjà présentes'; end if;
  if (select count(*) from segments where id in (${idsSql}) and id_oeuvre = '${OEUVRE}' and ref_niv1 = 'Livre troisième' and ref_niv2 in (${QUESTIONS.map(quote).join(', ')}) and segment_numero between ${DEBUT} and ${FIN}) <> ${TOTAL_SEGMENTS} then raise exception 'Préconditions structurelles invalides'; end if;
  insert into liens_bibliques (segment_id, canon_id, type, fiabilite, motif, provenance, arbitrage_requis) values ${valeurs};
  get diagnostics n = row_count; if n <> ${total} then raise exception 'Liens %/${total}', n; end if;
  update segments set liens_revus_le = now(), liens_revus_par = ${quote(RELECTEUR)} where id in (${idsSql});
  get diagnostics n = row_count; if n <> ${TOTAL_SEGMENTS} then raise exception 'Segments %/${TOTAL_SEGMENTS}', n; end if;
end $passe$;`

const { error: ecritureErreur } = await sb.rpc('exec_sql', { sql })
if (ecritureErreur) throw ecritureErreur
const [{ count: liensApres, error: e3 }, { count: relusApres, error: e4 }, { data: audit, error: e5 }] = await Promise.all([
  sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  sb.from('segments').select('id', { count: 'exact', head: true }).in('id', ids).not('liens_revus_le', 'is', null),
  sb.from('liens_bibliques').select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id', ids),
])
if (e3 || e4 || e5) throw (e3 || e4 || e5)
if (liensApres !== total || relusApres !== TOTAL_SEGMENTS || audit.some(lien => !lien.motif || lien.provenance !== 'lecture' || (lien.canon_id ? lien.fiabilite !== 'vérifié' || lien.arbitrage_requis : lien.fiabilite !== 'à constituer' || !lien.arbitrage_requis || lien.type !== 4 || !lien.motif.startsWith('RÉFÉRENCE NON BIBLIQUE')))) throw Error('Postcontrôle invalide')
console.log(`✓ ${liensApres} liens, ${relusApres} segments`)
