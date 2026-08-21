import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre troisième'
const PREMIER = 1660
const DERNIER = 1738
const NB_SEGMENTS = 79
const WRITE = process.argv.includes('--write')
const DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Lévitique Q. XXXI-XL'
const EMPREINTE_ATTENDUE = '8bb0bd55071c7901999859e43e6a01eb03e4a219dc11aa16acbc0633cdd5c9fd'
const QUESTIONS = [
  'Question XXXI', 'Question XXXII', 'Question XXXIII', 'Question XXXIV', 'Question XXXV',
  'Question XXXVI', 'Question XXXVII', 'Question XXXVIII', 'Question XXXIX', 'Question XL',
]

const LIENS = []
const add = (segmentNumero, canonId, type, motif) => LIENS.push([segmentNumero, canonId, type, motif])
const both = (segmentNumero, canonId, motif) => {
  add(segmentNumero, canonId, 1, `${motif} — citation ou référence intentionnelle.`)
  add(segmentNumero, canonId, 3, `${motif} — passage commenté ou mobilisé dans le raisonnement.`)
}
const explain = (segmentNumero, canonIds, motif) => {
  for (const canonId of canonIds) add(segmentNumero, canonId, 3, `${motif} (${canonId}).`)
}

// Question XXXI — feu étranger et sanctification de Dieu dans ses prêtres.
both(1660, 'LEV.10.1', 'Nadab et Abiu présentent devant Dieu un feu étranger')
both(1660, 'LEV.10.2', 'Le feu sorti de devant Dieu consume les deux fils d’Aaron')
explain(1660, ['LEV.9.24'], 'Le feu céleste conservé sur l’autel explique pourquoi tout autre feu était interdit.')
both(1661, 'LEV.10.3', 'Dieu sera sanctifié en ceux qui l’approchent et glorifié devant le peuple')
for (const n of [1662, 1663, 1664, 1665, 1666, 1667]) explain(n, ['LEV.10.3'], 'La parole sur la sanctification de Dieu dans ses prêtres demeure le texte directeur de l’argument.')
both(1663, '1PE.4.18', 'Le juste sauvé avec peine est opposé au pécheur et à l’impie')
both(1664, 'LUK.12.48', 'On exige davantage de celui à qui davantage a été donné, et l’ignorant est peu battu')
both(1664, 'LUK.12.47', 'Le serviteur qui connaît la volonté de son maître et désobéit reçoit beaucoup de coups')
both(1665, 'WIS.6.6', 'Les petits obtiennent miséricorde, tandis que les puissants seront puissamment tourmentés')
both(1666, 'EXO.33.12', 'Moïse rappelle à Dieu qu’il lui a dit le connaître par son nom')
explain(1666, ['EXO.33.17'], 'La même parole est ensuite rapportée explicitement, ce qui fonde la comparaison avec une révélation antérieure non consignée.')

// Question XXXII — deuil interdit à Aaron et à ses fils consacrés.
both(1668, 'LEV.10.6', 'Moïse interdit aux prêtres les marques de deuil après la mort de Nadab et Abiu')
explain(1668, ['LEV.10.7'], 'La consécration et l’interdiction de sortir complètent la défense.')
for (const n of [1669, 1670, 1671]) explain(n, ['LEV.10.6'], 'La défense des marques sacerdotales de deuil est expliquée.')
explain(1670, ['LEV.10.3'], 'Le châtiment a sanctifié Dieu, motif de l’interdiction faite aux prêtres.')
explain(1671, ['LEV.10.7'], 'Les sept jours de consécration et l’interdiction de sortir motivent l’abstention des prêtres.')
both(1672, 'LEV.10.6', 'Toute la maison d’Israël peut pleurer ceux que le feu a consumés')
both(1672, 'LEV.10.7', 'Les prêtres ne doivent pas sortir, car l’huile de l’onction est sur eux')

// Question XXXIII — abstinence de vin pendant le service et discernement sacerdotal.
both(1673, 'LEV.10.8', 'Dieu adresse directement à Aaron la prescription sacerdotale')
both(1673, 'LEV.10.9', 'Les prêtres ne boiront ni vin ni boisson fermentée lorsqu’ils entreront dans le tabernacle')
for (const n of [1674, 1675, 1676, 1677, 1678, 1679]) explain(n, ['LEV.10.9'], 'La portée temporelle de l’interdiction du vin pendant le ministère est discutée.')
explain(1675, ['LEV.24.3', 'LEV.24.4', 'LEV.24.8'], 'Le service des lampes et des pains déposés devant Dieu fonde l’objection sur l’entrée régulière dans le sanctuaire.')
explain(1676, ['EXO.30.7', 'EXO.30.8'], 'L’encens offert matin et soir fonde l’objection sur le service quotidien du grand-prêtre.')
explain(1676, ['LEV.16.2', 'LEV.16.14'], 'L’entrée annuelle avec le sang au-delà du voile est distinguée du service quotidien de l’encens.')
both(1680, 'LEV.10.9', 'La loi perpétuelle conclut l’interdiction du vin')
both(1680, 'LEV.10.10', 'Les prêtres doivent distinguer le saint du profane et le pur de l’impur')
both(1680, 'LEV.10.11', 'Les prêtres doivent enseigner les ordonnances données par Moïse')
explain(1681, ['LEV.10.10'], 'Le discernement entre saint, profane, pur et impur est analysé.')
explain(1682, ['LEV.10.10', 'LEV.10.11'], 'Le discernement sacerdotal est appliqué à la fois aux personnes, aux choses et à l’enseignement de la Loi.')

// Question XXXIV — poitrine balancée et cuisse prélevée.
both(1683, 'LEV.10.14', 'La poitrine balancée et la cuisse prélevée sont mangées en lieu pur par la famille sacerdotale')
explain(1684, ['LEV.10.14'], 'Les deux noms des portions sacerdotales sont comparés lexicalement.')
explain(1685, ['LEV.10.14', 'LEV.7.30', 'LEV.7.31', 'LEV.7.32'], 'La poitrine balancée et la cuisse prélevée sont distinguées par leur geste rituel et leur destination.')

// Question XXXV — sacrifices pacifiques et vocabulaire du salut.
for (const n of [1686, 1687, 1688, 1689, 1690]) explain(n, ['LEV.10.14'], 'L’expression appliquée aux sacrifices pacifiques est étudiée sous l’angle de la chose salutaire et du salut.')
both(1688, 'PSA.64.6', 'Le Dieu de nos saluts est invoqué pour expliquer le génitif pluriel grec')
explain(1689, ['PSA.64.6'], 'Le pluriel des saluts ou santés éclaire le vocabulaire des sacrifices salutaires.')
both(1690, 'PSA.115.13', 'Le psalmiste prend le calice du salut')
both(1690, 'LUK.2.30', 'Siméon déclare avoir vu le salut de Dieu')

// Question XXXVI — portions sacerdotales et rites du premier jour.
both(1691, 'LEV.10.15', 'La poitrine et la cuisse appartiennent par loi perpétuelle à Aaron, à ses fils et à ses filles')
both(1691, 'LEV.10.14', 'Le droit de manger la poitrine et la cuisse est expressément étendu aux fils et aux filles d’Aaron')
explain(1692, ['LEV.10.16', 'LEV.6.19'], 'Moïse cherche le bouc brûlé, alors que la loi ordinaire prescrivait au prêtre de manger la victime pour le péché.')
both(1693, 'LEV.10.19', 'Aaron justifie de ne pas manger la victime après le malheur qui l’a frappé')
both(1694, 'LEV.10.20', 'Moïse entend la réponse d’Aaron et l’approuve')
explain(1695, ['LEV.10.16', 'LEV.10.17', 'LEV.10.18', 'LEV.10.19', 'LEV.10.20', 'LEV.6.19'], 'L’exception inspirée du premier jour est distinguée de la règle ordinaire imposant aux prêtres de manger la victime.')
explain(1696, ['LEV.10.16', 'LEV.10.18', 'LEV.4.7', 'LEV.4.12', 'LEV.4.18', 'LEV.4.21'], 'Le bouc recherché est distingué des victimes dont le sang était porté sur l’autel intérieur et qui étaient entièrement brûlées.')
explain(1697, ['LEV.10.16', 'LEV.10.19', 'LEV.10.20'], 'La réponse d’Aaron au sujet du bouc est étendue au bélier et reçue par Moïse.')
both(1698, 'LEV.4.12', 'Le taureau offert pour le péché du prêtre est brûlé hors du camp')
both(1698, 'LEV.4.21', 'Le taureau offert pour le péché de l’assemblée est brûlé hors du camp')
explain(1698, ['LEV.10.16'], 'Le sort du bouc consumé est comparé aux deux taureaux prescrits antérieurement.')
both(1699, 'LEV.10.16', 'Moïse constate que le bouc pour le péché a été entièrement consumé')
both(1699, 'LEV.10.17', 'Moïse demande pourquoi la victime n’a pas été mangée dans le lieu saint')
both(1700, 'LEV.10.17', 'La victime très sainte est donnée aux prêtres pour porter le péché du peuple')
both(1700, 'LEV.10.18', 'Le sang n’ayant pas été porté dans le sanctuaire, la victime devait être mangée')
explain(1701, ['LEV.10.18', 'LEV.6.19'], 'La règle du sang non porté dans le sanctuaire explique pourquoi le bouc devait être mangé par les prêtres.')
explain(1702, ['LEV.10.19', 'LEV.10.20'], 'La réponse d’Aaron explique l’exception du bouc entièrement consumé et l’approbation de Moïse.')
both(1703, 'LEV.9.3', 'Le peuple doit présenter un bouc, un veau et un agneau')
both(1703, 'LEV.9.4', 'Un bœuf et un bélier sont ajoutés pour le sacrifice pacifique')
explain(1704, ['LEV.9.15', 'LEV.9.16', 'LEV.9.17', 'LEV.9.18'], 'Le récit effectif des sacrifices du peuple est confronté à la liste initiale des victimes.')
for (const n of [1705, 1706]) explain(n, ['LEV.9.3', 'LEV.9.4'], 'L’hypothèse identifie le veau et le bélier nommés dans la liste aux victimes du sacrifice pacifique.')
both(1707, 'LEV.9.15', 'Aaron offre un bouc pour le péché du peuple')
both(1707, 'LEV.4.13', 'La loi envisage le péché involontaire de toute l’assemblée')
both(1707, 'LEV.4.14', 'L’assemblée doit offrir un jeune taureau pour son péché')
both(1707, 'LEV.4.3', 'Le prêtre oint doit également offrir un jeune taureau pour son péché')
both(1708, 'LEV.8.14', 'Moïse présente un taureau pour le péché d’Aaron lors de la consécration')
both(1708, 'LEV.9.8', 'Aaron offre un taureau pour son propre péché')
explain(1708, ['LEV.4.3', 'LEV.4.14', 'LEV.9.15'], 'La loi des taureaux pour le prêtre et le peuple est opposée au bouc effectivement offert pour le peuple.')
explain(1709, ['LEV.9.3'], 'Le veau et le bélier sont grammaticalement rattachés au sacrifice pour le péché avec le bouc.')
explain(1710, ['LEV.4.23', 'LEV.5.15', 'LEV.4.14'], 'Le bouc du chef, le bélier de l’individu et le taureau de l’assemblée expliquent les trois victimes proposées.')
explain(1711, ['LEV.9.3', 'LEV.9.15'], 'La mention du seul bouc dans l’exécution est comprise comme une partie mise pour toutes les victimes du péché.')

// Questions XXXVII-XXXVIII — impureté des récipients et animaux vivipares.
both(1712, 'LEV.11.33', 'Le vase de terre touché par un cadavre impur devient impur et doit être brisé')
both(1712, 'LEV.11.34', 'La nourriture préparée avec l’eau d’un récipient impur devient impure')
explain(1712, ['LEV.11.32'], 'Le contexte porte sur le contact avec les cadavres des animaux impurs.')
explain(1713, ['LEV.11.33', 'LEV.11.34'], 'L’eau qui souille la nourriture est celle du vase contaminé par un cadavre impur.')
both(1714, 'LEV.11.47', 'La distinction entre animaux qui se mangent et qui ne se mangent pas est citée puis étudiée lexicalement')
explain(1715, ['LEV.11.47'], 'Le mot grec est expliqué comme désignant les animaux qui engendrent des petits vivants plutôt que des œufs.')

// Question XXXIX — sanctuaire accessible aux femmes.
both(1716, 'LEV.12.4', 'La femme en purification ne doit toucher aucune chose sainte ni entrer dans le sanctuaire')
explain(1717, ['LEV.12.4', 'LEV.16.2'], 'Le sanctuaire interdit à la femme est distingué de l’espace au-delà du voile réservé au grand-prêtre.')
explain(1718, ['LEV.12.4'], 'Le sanctuaire est interprété comme le parvis de l’autel.')
both(1718, 'LEV.6.19', 'La victime pour le péché est mangée dans le lieu saint, défini comme le parvis de la tente ; la note imprimée 6,26 suit l’ancienne numérotation')
explain(1719, ['LEV.12.4'], 'L’entrée habituelle des femmes dans le parvis pour apporter leurs dons explique l’interdiction temporaire.')

// Question XL — purification de la femme après l’accouchement.
both(1720, 'LEV.12.2', 'La femme ayant enfanté un garçon est impure pendant sept jours')
both(1720, 'LEV.12.3', 'Le fils est circoncis le huitième jour')
both(1720, 'LEV.12.4', 'La mère demeure trente-trois jours dans le sang de sa purification et ne touche pas aux choses saintes')
explain(1721, ['LEV.12.2', 'LEV.12.4'], 'La différence entre les sept jours d’impureté et les trente-trois jours de purification est interrogée.')
explain(1722, ['LEV.12.2', 'LEV.12.4'], 'La femme souille tout contact pendant sept jours, mais s’abstient seulement du sanctuaire pendant les trente-trois suivants.')
both(1723, 'LEV.15.19', 'L’impureté menstruelle de la femme dure sept jours')
for (const id of ['LEV.15.20', 'LEV.15.21', 'LEV.15.22', 'LEV.15.23']) explain(1723, [id], 'Les objets touchés pendant l’impureté deviennent eux-mêmes impurs.')
explain(1723, ['LEV.12.2'], 'La purification après l’accouchement est rapprochée de l’impureté menstruelle.')
explain(1724, ['LEV.15.19'], 'La séparation de la femme pendant sept jours vise à éviter la propagation de l’impureté.')
both(1725, 'LEV.12.5', 'Pour la naissance d’une fille, les quatorze jours d’impureté et les soixante-six jours de purification sont cités')
explain(1725, ['LEV.12.2', 'LEV.12.4'], 'Les durées prévues pour un garçon sont comparées aux durées doublées pour une fille.')
explain(1726, ['LEV.12.4'], 'La variante « sang impur » est confrontée à la leçon « sang de sa purification ».')
both(1727, 'LEV.12.6', 'Après la purification, la mère apporte un agneau en holocauste et un oiseau pour le péché')
both(1728, 'LEV.12.7', 'Le prêtre offre les victimes, fait l’expiation et purifie la mère de son flux')
both(1728, 'LEV.12.8', 'La femme pauvre offre deux tourterelles ou deux pigeons, l’un en holocauste et l’autre pour le péché')
explain(1729, ['LEV.12.6', 'LEV.12.8'], 'Les conjonctions et le nombre des victimes établissent la leçon correcte de l’offrande prescrite.')
both(1730, 'ROM.5.16', 'La condamnation est venue d’un seul péché, selon la formulation citée')
both(1730, 'ROM.5.12', 'Le péché est entré dans le monde par un seul homme et la mort par le péché')
explain(1730, ['LEV.12.7'], 'Le sacrifice pour le péché de la femme est interprété à la lumière de l’héritage d’Adam.')
both(1731, 'PSA.50.7', 'Le psalmiste affirme avoir été conçu dans l’iniquité et dans le péché')
explain(1731, ['LEV.12.7'], 'La purification sacrificielle de la mère plutôt que de l’enfant est interrogée.')
explain(1732, ['LEV.12.7', 'PSA.50.7'], 'La purification de la mère et celle du fruit né de son sang sont rattachées à la transmission du péché.')
explain(1733, ['LEV.12.6', 'LEV.12.7'], 'La formule « pour un fils ou pour une fille » est examinée quant à l’effet du sacrifice sur l’enfant.')
explain(1734, ['LEV.12.6'], 'La construction grammaticale de « pour un fils ou pour une fille » est discutée.')
both(1735, 'LUK.2.27', 'Les parents apportent Jésus au Temple pour accomplir à son égard la coutume de la Loi')
explain(1735, ['LEV.12.6', 'LEV.12.8'], 'La présentation de Jésus confirme que la prescription et l’offrande concernent aussi l’enfant.')
both(1736, 'MAT.3.13', 'Jésus vient vers Jean pour recevoir le baptême malgré son innocence')
both(1736, 'MRK.1.4', 'Le baptême de Jean est un baptême de pénitence pour la rémission des péchés')
explain(1737, ['LEV.12.6'], 'La traduction « pour un fils ou pour une fille » est défendue contre « à l’occasion d’un fils ou d’une fille ».')
both(1738, 'LUK.2.24', 'Les parents de Jésus offrent une paire de tourterelles ou deux pigeons')
explain(1738, ['LEV.12.8'], 'L’offrande évangélique est identifiée à celle que le Lévitique permet aux pauvres à la place d’un agneau.')

const NON_RESOLUS = [
  [1714, 4, 'RÉFÉRENCE NON BIBLIQUE — choix de traduction attribué collectivement à « nos interprètes » pour le grec zôogonounta ; cible de corpus à constituer.'],
  [1726, 4, 'RÉFÉRENCE NON BIBLIQUE — variante « dans son sang impur » attestée par certains exemplaires grecs ; témoins textuels à constituer.'],
  [1729, 4, 'RÉFÉRENCE NON BIBLIQUE — leçon fautive avec « ou » attribuée à quelques exemplaires, opposée à la leçon avec « et » ; témoins textuels à constituer.'],
  [1737, 4, 'RÉFÉRENCE NON BIBLIQUE — choix de plusieurs traducteurs entre « à l’occasion de » et « pour » en Lévitique 12,6 ; cible de corpus à constituer.'],
]
const SANS_LIEN = new Set()

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: segments, error } = await sb.from('segments').select('id,segment_numero,segment_texte,notes,ref_niv1,ref_niv2,ref_niv2_texte,liens_revus_le,liens_revus_par').eq('id_oeuvre', OEUVRE).eq('ref_niv1', REF_NIV1).in('ref_niv2', QUESTIONS).order('segment_numero')
if (error) throw error
if (segments.length !== NB_SEGMENTS || segments.some((segment, index) => segment.segment_numero !== PREMIER + index)) throw new Error('Préétat : bornes ou continuité invalides')
if ([...new Set(segments.map((segment) => segment.ref_niv2))].join('|') !== QUESTIONS.join('|')) throw new Error('Questions incomplètes ou désordonnées')
if (segments.some((segment) => segment.ref_niv1 !== REF_NIV1 || segment.liens_revus_le || segment.liens_revus_par)) throw new Error('Préétat structurel ou relecture invalide')
const empreinte = createHash('sha256').update(JSON.stringify(segments.map((segment) => [segment.id, segment.segment_numero, segment.ref_niv1, segment.ref_niv2, segment.ref_niv2_texte, segment.segment_texte, segment.notes]))).digest('hex')
if (empreinte !== EMPREINTE_ATTENDUE) throw new Error(`Préétat modifié : ${empreinte}`)

const parNumero = new Map(segments.map((segment) => [segment.segment_numero, segment]))
const numerosClasses = new Set([...LIENS, ...NON_RESOLUS].map(([segmentNumero]) => segmentNumero))
const nonClasses = segments.filter((segment) => !numerosClasses.has(segment.segment_numero) && !SANS_LIEN.has(segment.segment_numero))
if (nonClasses.length) throw new Error(`Partition incomplète : ${nonClasses.map((segment) => segment.segment_numero)}`)
if ([...SANS_LIEN].some((segmentNumero) => numerosClasses.has(segmentNumero) || !parNumero.has(segmentNumero))) throw new Error('Déclaration SANS_LIEN invalide')
if (LIENS.some(([segmentNumero, canonId, type, motif]) => !parNumero.has(segmentNumero) || !canonId || ![1, 2, 3, 4].includes(type) || !motif.trim())) throw new Error('Manifeste biblique invalide')
if (NON_RESOLUS.some(([segmentNumero, type, motif]) => !parNumero.has(segmentNumero) || type !== 4 || !motif.startsWith('RÉFÉRENCE NON BIBLIQUE'))) throw new Error('Référence sans cible invalide')
const cles = LIENS.map(([segmentNumero, canonId, type]) => `${segmentNumero}|${canonId}|${type}`)
if (new Set(cles).size !== cles.length) throw new Error('Doublon interne')

const cibles = [...new Set(LIENS.map(([, canonId]) => canonId))]
const { data: temoins, error: temoinsError } = await sb.from('versets_lecture').select('id_verset,"TR0001","TR0003","TR0004"').in('id_verset', cibles)
if (temoinsError) throw temoinsError
const temoinsParId = new Map(temoins.map((temoin) => [temoin.id_verset, temoin]))
const ciblesInvalides = cibles.filter((canonId) => { const temoin = temoinsParId.get(canonId); return !temoin || (!temoin.TR0001 && !temoin.TR0003 && !temoin.TR0004) })
if (ciblesInvalides.length) throw new Error(`Cibles invalides : ${ciblesInvalides.join(', ')}`)
const ids = segments.map((segment) => segment.id)
const [{ count: liensExistants, error: liensError }, { count: relusGlobaux, error: relusError }] = await Promise.all([
  sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  sb.from('segments').select('id', { count: 'exact', head: true }).eq('id_oeuvre', OEUVRE).not('liens_revus_le', 'is', null),
])
if (liensError || relusError) throw liensError || relusError
if (liensExistants) throw new Error(`${liensExistants} liens existent déjà dans le lot`)

const TOTAL = LIENS.length + NON_RESOLUS.length
const types = LIENS.reduce((compte, [, , type]) => { compte[type] = (compte[type] ?? 0) + 1; return compte }, {})
for (const [, type] of NON_RESOLUS) types[type] = (types[type] ?? 0) + 1
const liensParQuestion = Object.fromEntries(QUESTIONS.map((question) => {
  const numeros = new Set(segments.filter((segment) => segment.ref_niv2 === question).map((segment) => segment.segment_numero))
  return [question, [...LIENS, ...NON_RESOLUS].filter(([segmentNumero]) => numeros.has(segmentNumero)).length]
}))
const pct = (n) => `${n} / 3262 = ${(100 * n / 3262).toFixed(2).replace('.', ',')} %`
console.log(JSON.stringify({
  mode: WRITE ? 'écriture' : 'contrôle', lot: 'Lévitique XXXI-XL', ref_niv1: REF_NIV1,
  bornes: [PREMIER, DERNIER], segments: segments.length, liens_bibliques: LIENS.length,
  sans_cible_a_constituer: NON_RESOLUS.length, total_liens: TOTAL, sans_lien: [...SANS_LIEN],
  cibles_distinctes: cibles.length, types, liens_par_question: liensParQuestion, empreinte,
  avancement_actuel: pct(relusGlobaux), avancement_potentiel_apres_ecriture: pct(relusGlobaux + NB_SEGMENTS),
}, null, 2))
if (DETAIL) for (const [segmentNumero, canonId, type, motif] of LIENS) { const temoin = temoinsParId.get(canonId); console.log({ segmentNumero, canonId, type, motif, segment: parNumero.get(segmentNumero).segment_texte, temoin: temoin.TR0003 || temoin.TR0001 || temoin.TR0004 }) }
if (!WRITE) process.exit(0)

const quote = (value) => `'${String(value).replaceAll("'", "''")}'`
const valeurs = [
  ...LIENS.map(([segmentNumero, canonId, type, motif]) => `(${parNumero.get(segmentNumero).id}, ${quote(canonId)}, ${type}, 'vérifié', ${quote(motif)}, 'lecture', false)`),
  ...NON_RESOLUS.map(([segmentNumero, type, motif]) => `(${parNumero.get(segmentNumero).id}, null, ${type}, 'à constituer', ${quote(motif)}, 'lecture', true)`),
].join(',\n    ')
const idSql = ids.join(', ')
const sql = `
do $p$
declare
  n integer;
begin
  if exists (
    select 1 from liens_bibliques where segment_id in (${idSql})
  ) then
    raise exception 'Liens présents';
  end if;
  if exists (
    select 1 from segments where id in (${idSql})
      and (liens_revus_le is not null or liens_revus_par is not null)
  ) then
    raise exception 'Déjà relu';
  end if;
  insert into liens_bibliques (segment_id, canon_id, type, fiabilite, motif, provenance, arbitrage_requis) values
    ${valeurs};
  get diagnostics n = row_count;
  if n <> ${TOTAL} then
    raise exception 'Liens insérés : %', n;
  end if;
  update segments set liens_revus_le = now(), liens_revus_par = ${quote(RELECTEUR)} where id in (${idSql});
  get diagnostics n = row_count;
  if n <> ${NB_SEGMENTS} then
    raise exception 'Segments relus : %', n;
  end if;
end
$p$;
`
const { error: writeError } = await sb.rpc('exec_sql', { sql })
if (writeError) throw writeError
const [{ count: liensApres, error: e1 }, { count: relusApres, error: e2 }, { data: audit, error: e3 }] = await Promise.all([
  sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  sb.from('segments').select('id', { count: 'exact', head: true }).in('id', ids).not('liens_revus_le', 'is', null),
  sb.from('liens_bibliques').select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id', ids),
])
if (e1 || e2 || e3) throw e1 || e2 || e3
if (liensApres !== TOTAL || relusApres !== NB_SEGMENTS || audit.some((lien) => !lien.motif || lien.provenance !== 'lecture' || (lien.canon_id ? (lien.fiabilite !== 'vérifié' || lien.arbitrage_requis) : (lien.fiabilite !== 'à constituer' || !lien.arbitrage_requis || lien.type !== 4 || !lien.motif.startsWith('RÉFÉRENCE NON BIBLIQUE'))))) throw new Error('Postcontrôle invalide')
const clesApres = audit.map((lien) => `${lien.segment_id}|${lien.canon_id ?? 'sans-cible'}|${lien.type}|${lien.motif}`)
if (new Set(clesApres).size !== clesApres.length) throw new Error('Doublon dans le postétat')
console.log(`✓ ${liensApres} liens ; ${relusApres} segments relus`)
