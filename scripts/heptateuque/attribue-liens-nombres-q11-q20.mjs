import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre quatrième'
const DEBUT = 2035
const FIN = 2107
const TOTAL_SEGMENTS = 73
const QUESTIONS = ['Question XI', 'Question XII', 'Question XIII', 'Question XIV', 'Question XV', 'Question XVI', 'Question XVII', 'Question XVIII', 'Question XIX', 'Question XX']
const WRITE = process.argv.includes('--write')
const DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Nombres Q. XI-XX'
const EMPREINTE_ATTENDUE = '7d2d1568056e20a9f9366716ae3c3dcfc9cb122d46355a7b41aa214f92a4ac35'
const PREUVES = [
  ['scripts/heptateuque/img/p516.jpg', 'e639bbc9489e42f9e09805eef50659c428a4efe58f7b449587702e727504d04b', 'La page imprimée 508 porte bien les renvois fautifs « Lév. VI, 16, 17 » et « Lév. IX, 15 » ; le contenu renvoie à Nombres 6 et 9.'],
  ['scripts/heptateuque/img/p519.jpg', '6e4257e372c8c3c91d546aa5345f79cdcdc1896068e7243c513c7add739cd900', 'La page imprimée 511 confirme les notes anciennes I Corinthiens 2, Luc 1, IV Rois 2 et Nombres 20.'],
  ['scripts/heptateuque/img/p520.jpg', '11b63b6c000da0b2b1c58e21045db4d58b5b9e5441f48a7adac6227709468082', 'La page imprimée 512 porte « II Paralip. XXIV, 9-14 », numérotation fautive résolue par le récit en 2 Chroniques 14,9-14.'],
]

const LIENS = []
const NON_RESOLUS = []
const SANS_LIEN = new Set()
const add = (numero, canonId, type, motif) => LIENS.push([numero, canonId, type, motif])
const cite = (numero, canonId, motif) => add(numero, canonId, 1, motif)
const com = (numero, canonIds, motif) => {
  for (const canonId of canonIds) add(numero, canonId, 3, `${motif} (${canonId}).`)
}
const both = (numero, canonId, motif) => {
  add(numero, canonId, 1, `${motif} — citation ou référence intentionnelle.`)
  add(numero, canonId, 3, `${motif} — passage commenté ou mobilisé dans le raisonnement.`)
}
const nonBiblique = (numero, genre, motif) => NON_RESOLUS.push([numero, 4, `RÉFÉRENCE NON BIBLIQUE (${genre}) : ${motif} ; cible de corpus à constituer.`])

// Question XI — serment d’imprécation contre la femme soupçonnée.
both(2035, 'NUM.5.21', 'Le prêtre adjure la femme et demande que le Seigneur fasse d’elle une malédiction et une exécration')
both(2036, 'NUM.5.21', 'La formule de malédiction est répétée puis expliquée comme serment imprécatoire servant d’exemple')

// Question XII — la victime reçoit le nom du sacrifice auquel elle est destinée.
both(2037, 'NUM.6.14', 'L’agneau d’holocauste et la brebis offerte pour le péché sont cités')
for (const verset of [15, 16, 17]) cite(2037, `NUM.6.${verset}`, 'Référence explicite comprise dans la plage Nombres 6,14-17 donnée par le titre de la question')
nonBiblique(2037, 'traduction', 'plusieurs interprètes latins refusent le littéral in peccatum et lui préfèrent pro peccato')
com(2038, ['NUM.6.14'], 'La brebis offerte pour le péché porte elle-même le nom de péché, selon la destination de la victime')
both(2038, '2CO.5.21', 'Le Christ qui ne connaissait pas le péché a été fait péché pour nous, c’est-à-dire victime pour le péché')
com(2039, ['NUM.6.14', 'NUM.6.17'], 'L’agneau est appelé holocauste, la brebis péché et le bélier salut, selon leurs sacrifices respectifs')
com(2040, ['NUM.6.16', 'NUM.6.17'], 'La suite appelle explicitement la brebis sacrifice pour le péché et le bélier sacrifice pacifique ; le renvoi imprimé Lév. VI,16-17 est fautif')

// Question XIII — formule introductive de la loi des Lévites.
cite(2041, 'NUM.8.23', 'Citation explicite de la formule « Le Seigneur parla à Moïse et lui dit »')
both(2041, 'NUM.8.24', 'La formule « Ceci est pour les Lévites » est expliquée comme établissement de leur règle de service')
nonBiblique(2041, 'traduction', 'd’autres traducteurs donnent « Voici la Loi pour les Lévites »')

// Question XIV — service actif jusqu’à cinquante ans puis garde du tabernacle.
for (const verset of [24, 25, 26]) both(2042, `NUM.8.${verset}`, 'La prescription sur l’entrée en service à vingt-cinq ans, la retraite à cinquante ans et l’assistance aux frères est citée intégralement')
com(2043, ['NUM.8.25', 'NUM.8.26'], 'La transposition grammaticale est résolue en attribuant la garde au Lévite quinquagénaire et le service actif à son frère plus jeune')
both(2044, 'NUM.8.25', 'La cessation du service à cinquante ans est replacée dans l’ordre syntaxique proposé')
both(2044, 'NUM.8.26', 'La garde du tabernacle sans reprise des anciennes fonctions est replacée dans l’ordre syntaxique proposé')
com(2045, ['NUM.8.26'], 'L’infinitif latin custodire est expliqué comme un futur déterminé, custodiet')

// Question XV — Pâque différée pour impureté ou voyage.
both(2046, 'NUM.9.6', 'Les Israélites impurs à cause d’un cadavre ne peuvent célébrer la Pâque au jour fixé')
com(2046, ['NUM.9.7'], 'La demande des hommes impurs sur la manière de présenter l’offrande pascale est rapportée')
com(2046, ['NUM.19.11', 'NUM.19.12'], 'L’impureté contractée auprès d’un mort et la purification de sept jours expliquent l’empêchement pascal')
com(2047, ['NUM.9.8', 'NUM.9.9'], 'Moïse consulte le Seigneur avant de transmettre la règle de la Pâque différée')
com(2047, ['NUM.9.10', 'NUM.9.11'], 'L’impureté ou le long voyage autorisent la célébration au second mois, le quatorzième jour')
com(2048, ['NUM.9.10', 'NUM.9.11'], 'La règle du second mois est prolongée par raisonnement aux empêchements semblables survenant ensuite')

// Question XVI — commentaire suivi de la colonne de nuée, Nombres 9,15-23.
for (const verset of [15, 16]) both(2049, `NUM.9.${verset}`, 'La nuée sur la Demeure le jour et son apparence de feu pendant la nuit sont citées ; le renvoi imprimé Lév. IX,15 est fautif')
for (const verset of [17, 18]) both(2050, `NUM.9.${verset}`, 'Le départ et le campement selon le mouvement de la nuée et le commandement du Seigneur sont cités')
for (const verset of [18, 19]) both(2051, `NUM.9.${verset}`, 'Le peuple demeure campé tant que la nuée repose sur la Demeure, même plusieurs jours')
both(2052, 'NUM.9.20', 'Le campement puis le départ au commandement du Seigneur après un petit nombre de jours sont cités')
for (const verset of [21, 22]) both(2053, `NUM.9.${verset}`, 'Les départs après une nuit et les longues stations d’un jour ou d’un mois sont cités')
both(2054, 'NUM.9.23', 'Le départ, la garde et l’ordre transmis par la main de Moïse concluent la citation suivie')
com(2055, ['NUM.9.15'], 'La maison du témoignage est identifiée au tabernacle couvert par la nuée')
both(2056, 'NUM.9.16', 'La permanence de la nuée le jour et de l’apparence du feu la nuit est reprise avec les notes anciennes Ib. XVI-XVII')
com(2057, ['NUM.9.17'], 'La particule et est supprimée mentalement pour clarifier le départ après le retrait de la nuée')
both(2058, 'NUM.9.17', 'Le retrait et l’arrêt de la nuée déterminent respectivement le départ et le campement')
both(2059, 'NUM.9.18', 'Le campement et le départ au commandement du Seigneur sont cités comme règle générale')
com(2060, ['NUM.9.18'], 'Le signal de la nuée est expliqué comme le commandement du Seigneur')
com(2061, ['NUM.9.18'], 'Le passage du récit au futur dans « camperont » et « lèveront » est analysé comme locution insolite')
cite(2062, 'PSA.21.17', 'Citation explicite vérifiée du psaume au prétérit prophétique : « Ils ont percé mes mains et mes pieds »')
cite(2062, 'ISA.53.7', 'Citation explicite vérifiée d’Isaïe au prétérit prophétique : le serviteur conduit comme une brebis au sacrifice')
for (const verset of [18, 19]) both(2063, `NUM.9.${verset}`, 'La durée du campement sous la nuée est citée pour exclure une alternance uniforme entre jour et nuit')
com(2064, ['NUM.9.19'], 'Observer la garde de Dieu signifie obéir à l’ordre de demeurer dans le camp')
both(2065, 'NUM.9.20', 'Le petit nombre de jours et le départ au commandement du Seigneur sont repris et expliqués')
com(2066, ['NUM.9.20'], 'La voix et le commandement du Seigneur sont interprétés comme le signal transmis par la nuée')
com(2067, ['NUM.9.20', 'NUM.9.23'], 'La voix peut aussi désigner l’ordre verbal donné à Moïse, par lequel Israël connaissait le sens du signal')
com(2068, ['NUM.9.21'], 'La possibilité d’un départ nocturne est introduite comme difficulté encore ouverte')
both(2069, 'NUM.9.21', 'La nuée demeurée du soir au matin puis élevée le matin donne le signal du départ diurne ; le renvoi imprimé Lév. IX,21 est fautif')
com(2070, ['NUM.9.21'], 'La suppression de la conjonction copulative rétablit la construction du départ au matin')
both(2071, 'NUM.9.21', 'La nuée peut aussi s’élever pendant la nuit et provoquer un départ immédiat')
com(2072, ['NUM.9.21'], 'L’ordre latin vel nocte et si est analysé comme une transposition grammaticale')
com(2073, ['NUM.9.21'], 'Deux réordonnancements équivalents rendent intelligible le départ nocturne')
com(2074, ['NUM.9.22'], 'La question distingue la marche nocturne du campement diurne sous une nuée immobile')
both(2075, 'NUM.9.22', 'Le jour, le mois ou la longue durée sous la nuée imposent de rester dans le camp ; le renvoi imprimé Lév. IX,22 est fautif')
com(2076, ['NUM.9.21', 'NUM.9.22'], 'Le départ nocturne et la longue station diurne sont articulés pour expliquer « le jour ou le mois de jour »')
com(2077, ['NUM.9.22'], 'La locution « mois de jour » est interprétée comme excluant les nuits du calcul envisagé')
com(2078, ['NUM.9.22'], 'La nuée abondante qui couvre la Demeure impose le maintien du camp')
both(2079, 'NUM.9.23', 'Le départ et la garde selon le commandement transmis par Moïse sont cités en conclusion')
com(2080, ['NUM.9.23'], 'Le retour au passé et l’idiotisme « par la main de Moïse » sont expliqués')

// Question XVII — sonnerie non signalétique lorsque le peuple est déjà assemblé.
both(2081, 'NUM.10.7', 'La trompette sonne après l’assemblée du peuple, sans être alors un signal de départ ou d’action')
com(2082, ['NUM.10.7'], 'La sonnerie devient un signe spirituel pour le lecteur du Nouveau Testament qui en comprend la raison')

// Question XVIII — participation des soixante-dix anciens au même Esprit de grâce.
both(2083, 'NUM.11.17', 'Dieu prend de l’esprit qui est sur Moïse pour le mettre sur les anciens chargés avec lui du peuple')
nonBiblique(2083, 'traduction', 'la plupart des traducteurs latins lisent « de ton esprit qui est en toi » au lieu de « de l’esprit qui est sur toi »')
com(2084, ['NUM.11.17'], 'La mauvaise traduction pourrait faire croire à un partage de l’esprit humain ou de l’âme de Moïse')
both(2084, '1CO.2.11', 'L’esprit de l’homme connaît ce qui est dans l’homme, et l’Esprit de Dieu ce qui est en Dieu')
com(2085, ['NUM.11.17'], 'La distinction paulinienne entre esprit humain et Esprit divin éclaire l’esprit communiqué aux anciens')
both(2085, '1CO.2.11', 'La citation commencée au segment précédent est achevée avec la connaissance propre à l’Esprit de Dieu')
both(2085, '1CO.2.12', 'L’Esprit reçu de Dieu est opposé à l’esprit du monde')
com(2086, ['NUM.11.17'], 'Une lecture possible de « ton esprit » comme Esprit de Dieu devenu nôtre est examinée')
both(2086, 'LUK.1.17', 'Jean marche dans l’esprit et la puissance d’Élie')
nonBiblique(2086, 'commentaire', 'certains commentateurs comprennent « de ton esprit » comme l’Esprit de Dieu devenu l’esprit de Moïse')
com(2087, ['NUM.11.17'], 'Le cas d’Élie et Élisée sert à exclure le transport d’une âme humaine')
both(2087, '2KI.2.15', 'Les fils des prophètes constatent que l’esprit d’Élie repose sur Élisée ; IV Rois correspond à 2 Rois dans le canon local')
nonBiblique(2087, 'œuvre patristique', 'renvoi explicite au chapitre 35 du traité De l’âme de Tertullien, à propos de la transmigration')
com(2088, ['NUM.11.17', 'LUK.1.17', '2KI.2.15'], 'Le même Esprit de Dieu opère des merveilles semblables sans quitter Élie ni se diviser entre ses serviteurs')
com(2089, ['NUM.11.17'], 'L’Esprit, parce qu’il est Dieu, peut habiter parfaitement en tous sans diminution')
both(2090, 'NUM.11.17', 'La leçon exacte « de l’esprit qui est sur toi » résout la question : les anciens participent au même Esprit sans diminuer les dons de Moïse')

// Question XIX — interrogation de Moïse et comparaison avec Marie, Zacharie et le rocher.
both(2091, 'NUM.11.21', 'Moïse rappelle les six cent mille hommes du peuple auxquels Dieu promet de la chair pendant un mois')
both(2091, 'NUM.11.22', 'Moïse demande si brebis, bœufs et poissons suffiront à nourrir le peuple')
com(2092, ['NUM.11.21', 'NUM.11.22', 'NUM.11.23'], 'La question de Moïse est examinée comme doute possible ou simple interrogation sur la manière du prodige')
cite(2092, 'NUM.20.10', 'Référence explicite au doute reproché à Moïse devant le rocher')
both(2093, 'NUM.11.23', 'La réponse « La main du Seigneur ne pourra-t-elle y suffire ? » est discutée comme reproche apparent')
com(2094, ['NUM.11.23'], 'La réponse divine est comprise comme refus de dévoiler d’avance la manière du prodige')
both(2094, 'LUK.1.34', 'Marie demande comment l’événement arrivera puisqu’elle ne connaît point d’homme')
com(2095, ['NUM.11.23', 'LUK.1.34'], 'La demande sur le moyen d’accomplissement est distinguée d’un manque de foi en la toute-puissance')
com(2096, ['NUM.11.23'], 'La réponse à Marie est rapprochée de la toute-puissance exprimée dans la réponse à Moïse')
both(2096, 'LUK.1.35', 'L’Esprit-Saint vient sur Marie et la puissance du Très-Haut la couvre de son ombre')
for (const verset of [18, 19, 20]) cite(2097, `LUK.1.${verset}`, 'Référence explicite comprise dans la plage Luc 1,18-20 sur l’incrédulité et le mutisme de Zacharie')
com(2097, ['LUK.1.18', 'LUK.1.20'], 'Zacharie est repris et privé de parole parce que sa question procédait d’un manque de foi')
com(2097, ['NUM.11.23'], 'Le jugement divin des cœurs permet de distinguer la question de Moïse de celle de Zacharie')
com(2098, ['NUM.11.23'], 'Le doute réel au rocher sert de contraste au simple désir de connaître la manière du prodige des cailles')
both(2098, 'NUM.20.10', 'Moïse dit aux rebelles : « Ferons-nous sortir pour vous de l’eau de cette pierre ? »')
com(2099, ['NUM.11.23'], 'Le miracle du rocher est relu pour identifier le doute que Dieu seul a révélé')
both(2099, 'NUM.20.10', 'Moïse rassemble le peuple et prononce la parole devant le rocher')
both(2099, 'NUM.20.11', 'Moïse frappe deux fois la pierre et l’eau en sort en abondance')
com(2100, ['NUM.11.23'], 'Une interprétation favorable de la parole au rocher est proposée avant d’être écartée par le jugement divin')
both(2100, 'NUM.20.10', 'La question « Ferons-nous sortir… ? » est comprise provisoirement comme défi adressé à l’incrédulité du peuple')
com(2101, ['NUM.11.23'], 'Le sens intérieur des paroles ne peut être décidé sans la révélation de Dieu qui connaît le cœur')
both(2101, 'NUM.20.10', 'L’adresse « Écoutez-moi, incrédules » est reprise pour soutenir l’interprétation favorable')
com(2102, ['NUM.11.23'], 'Le blâme explicite au rocher confirme par contraste l’absence de punition lors de la question sur la chair promise')
both(2102, 'NUM.20.12', 'Dieu reproche à Moïse et Aaron de ne pas avoir cru et leur interdit d’introduire le peuple dans la terre')
com(2103, ['NUM.11.23', 'NUM.20.10', 'NUM.20.11', 'NUM.20.12'], 'La défiance secrète de Moïse au rocher est reconnue par le châtiment divin, malgré l’accomplissement du miracle')
com(2104, ['NUM.11.21', 'NUM.11.22', 'NUM.11.23'], 'La conclusion distingue la demande confiante sur la manière du prodige de la défiance punie au rocher')

// Question XX — femme couschite de Moïse et ancienne référence des Paralipomènes.
both(2105, 'NUM.12.1', 'La femme couschite de Moïse est identifiée ou distinguée de la fille madianite de Jéthro')
com(2106, ['NUM.12.1'], 'La femme couschite est tenue pour la fille de Jéthro, les Madianites étant rapprochés des Ethiopiens')
for (let verset = 9; verset <= 14; verset++) cite(2106, `2CH.14.${verset}`, 'Référence intentionnelle comprise dans la plage imprimée II Paralipomènes 24,9-14, qui vise en réalité le récit des Ethiopiens en 2 Chroniques 14,9-14')
com(2107, ['NUM.12.1'], 'Les changements de noms des peuples servent à expliquer l’appellation couschite de la femme madianite de Moïse')
com(2107, ['2CH.14.11', '2CH.14.12', '2CH.14.13', '2CH.14.14'], 'La défaite et la poursuite des Ethiopiens dans le récit des Paralipomènes sont mobilisées ; le texte d’Augustin attribue aussi erronément la bataille à Josaphat')

for (const [path, hash] of PREUVES) {
  const obtenu = createHash('sha256').update(readFileSync(path)).digest('hex')
  if (obtenu !== hash) throw Error(`Preuve fac-similé modifiée : ${path} (${obtenu})`)
}

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).map(line => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(match => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: bruts, error: e0 } = await sb.from('segments').select('id,segment_numero,ref_niv1,ref_niv2,ref_niv2_texte,segment_texte,texte_original,notes,nature,liens_revus_le,liens_revus_par').eq('id_oeuvre', OEUVRE).gte('segment_numero', DEBUT - 1).lte('segment_numero', FIN + 1).order('segment_numero')
if (e0) throw e0
const voisinAvant = bruts.find(segment => segment.segment_numero === DEBUT - 1)
const voisinApres = bruts.find(segment => segment.segment_numero === FIN + 1)
if (voisinAvant?.ref_niv1 !== REF_NIV1 || voisinAvant?.ref_niv2 !== 'Question X') throw Error('Raccord amont invalide')
if (voisinApres?.ref_niv1 !== REF_NIV1 || voisinApres?.ref_niv2 !== 'Question XXI') throw Error('Raccord aval invalide')
const segments = bruts.filter(segment => segment.segment_numero >= DEBUT && segment.segment_numero <= FIN)
if (segments.length !== TOTAL_SEGMENTS || segments.some((segment, index) => segment.segment_numero !== DEBUT + index) || segments.some(segment => segment.ref_niv1 !== REF_NIV1 || !QUESTIONS.includes(segment.ref_niv2)) || [...new Set(segments.map(segment => segment.ref_niv2))].join('|') !== QUESTIONS.join('|')) throw Error('Préétat structurel invalide')
if (segments.some(segment => segment.liens_revus_le || segment.liens_revus_par)) throw Error('Lot déjà relu')
const empreinte = createHash('sha256').update(JSON.stringify(segments.map(segment => [segment.id, segment.segment_numero, segment.ref_niv1, segment.ref_niv2, segment.ref_niv2_texte, segment.segment_texte, segment.texte_original, segment.notes, segment.nature]))).digest('hex')
if (empreinte !== EMPREINTE_ATTENDUE) throw Error(`Empreinte inattendue : ${empreinte}`)

const parNumero = new Map(segments.map(segment => [segment.segment_numero, segment]))
const numerosClasses = new Set([...LIENS, ...NON_RESOLUS].map(lien => lien[0]))
const nonClasses = segments.filter(segment => !numerosClasses.has(segment.segment_numero) && !SANS_LIEN.has(segment.segment_numero))
if (nonClasses.length) throw Error(`Segments non classés : ${nonClasses.map(segment => segment.segment_numero).join(', ')}`)
if ([...SANS_LIEN].some(numero => numerosClasses.has(numero) || !parNumero.has(numero))) throw Error('Déclaration SANS_LIEN invalide')
if (LIENS.some(([numero, canonId, type, motif]) => !parNumero.has(numero) || !canonId || ![1, 2, 3, 4].includes(type) || !motif.trim())) throw Error('Lien biblique invalide')
if (NON_RESOLUS.some(([numero, type, motif]) => !parNumero.has(numero) || type !== 4 || !motif.startsWith('RÉFÉRENCE NON BIBLIQUE'))) throw Error('Référence non biblique invalide')
const cles = LIENS.map(([numero, canonId, type]) => `${numero}|${canonId}|${type}`)
if (new Set(cles).size !== cles.length) throw Error('Doublon interne dans le manifeste')

const cibles = [...new Set(LIENS.map(([, canonId]) => canonId))]
const { data: versets, error: e1 } = await sb.from('versets_lecture').select('id_verset,TR0001,TR0003,TR0004').in('id_verset', cibles)
if (e1) throw e1
const parCible = new Map(versets.map(verset => [verset.id_verset, verset]))
const absentes = cibles.filter(cible => !parCible.has(cible))
if (absentes.length) throw Error(`Cibles absentes : ${absentes.join(', ')}`)
if (cibles.some(cible => { const verset = parCible.get(cible); return !verset.TR0001 || !verset.TR0003 || !verset.TR0004 })) throw Error('Cible incomplète dans les trois témoins locaux')
const ids = segments.map(segment => segment.id)
const [{ count: liensExistants, error: e2 }, { count: relusGlobaux, error: e3 }] = await Promise.all([
  sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  sb.from('segments').select('id', { count: 'exact', head: true }).eq('id_oeuvre', OEUVRE).not('liens_revus_le', 'is', null),
])
if (e2 || e3) throw (e2 || e3)
if (liensExistants) throw Error(`${liensExistants} liens préexistants dans le lot`)

const total = LIENS.length + NON_RESOLUS.length
const types = LIENS.reduce((acc, lien) => { acc[lien[2]] = (acc[lien[2]] || 0) + 1; return acc }, {})
if (NON_RESOLUS.length) types[4] = (types[4] || 0) + NON_RESOLUS.length
const pct = n => `${n} / 3262 = ${(100 * n / 3262).toFixed(2).replace('.', ',')} %`
console.log(JSON.stringify({ mode: WRITE ? 'écriture' : 'contrôle', lot: 'Nombres XI-XX', bornes: [DEBUT, FIN], voisins: { avant: [voisinAvant.segment_numero, voisinAvant.ref_niv2], apres: [voisinApres.segment_numero, voisinApres.ref_niv2] }, ref_niv1: REF_NIV1, questions: QUESTIONS, segments: TOTAL_SEGMENTS, corrections_ocr: 0, preuves_fac_simile: PREUVES.map(([path, , constat]) => ({ path, constat })), liens: total, liens_bibliques: LIENS.length, sans_cible_a_constituer: NON_RESOLUS.length, sans_lien: [...SANS_LIEN], cibles_distinctes: cibles.length, types, empreinte, anciennes_numerotations_arbitrees: ['Lév. VI,16-17 → NUM.6.16-17', 'Lév. IX,15-22 → NUM.9.15-22', 'IV Rois II,15 → 2KI.2.15', 'II Paralip. XXIV,9-14 → 2CH.14.9-14'], sic: 'aucun sic dans le lot ; aucune anomalie numérique n’en reçoit', avancement_actuel: pct(relusGlobaux), avancement_apres_ecriture_ulterieure: pct(relusGlobaux + TOTAL_SEGMENTS) }, null, 2))
if (DETAIL) {
  for (const [numero, canonId, type, motif] of LIENS) console.log({ numero, canonId, type, motif, segment: parNumero.get(numero).segment_texte, ...parCible.get(canonId) })
  for (const [numero, type, motif] of NON_RESOLUS) console.log({ numero, canonId: null, type, motif, segment: parNumero.get(numero).segment_texte })
}
if (!WRITE) process.exit(0)

const horodatage = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
const sauvegardePath = `scripts/heptateuque/audit-reprise/sauvegarde-nombres-q11-q20-${horodatage}.json`
mkdirSync('scripts/heptateuque/audit-reprise', { recursive: true })
writeFileSync(sauvegardePath, `${JSON.stringify({ oeuvre: OEUVRE, bornes: [DEBUT, FIN], empreinte, segments, liens_existants: [] }, null, 2)}\n`, 'utf8')
const quote = value => `'${String(value).replaceAll("'", "''")}'`
const valeurs = [...LIENS.map(([numero, canonId, type, motif]) => `(${parNumero.get(numero).id}, ${quote(canonId)}, ${type}, 'vérifié', ${quote(motif)}, 'lecture', false)`), ...NON_RESOLUS.map(([numero, type, motif]) => `(${parNumero.get(numero).id}, null, ${type}, 'à constituer', ${quote(motif)}, 'lecture', true)`)].join(',\n    ')
const idsSql = ids.join(', ')
const sql = `do $passe$ declare n integer; begin
  if exists (select 1 from liens_bibliques where segment_id in (${idsSql})) then raise exception 'Liens déjà présents'; end if;
  if exists (select 1 from segments where id in (${idsSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Marques déjà présentes'; end if;
  if (select count(*) from segments where id in (${idsSql}) and id_oeuvre = '${OEUVRE}' and ref_niv1 = ${quote(REF_NIV1)} and ref_niv2 in (${QUESTIONS.map(quote).join(', ')}) and segment_numero between ${DEBUT} and ${FIN}) <> ${TOTAL_SEGMENTS} then raise exception 'Préconditions structurelles invalides'; end if;
  insert into liens_bibliques (segment_id, canon_id, type, fiabilite, motif, provenance, arbitrage_requis) values ${valeurs};
  get diagnostics n = row_count; if n <> ${total} then raise exception 'Liens %/${total}', n; end if;
  update segments set liens_revus_le = now(), liens_revus_par = ${quote(RELECTEUR)} where id in (${idsSql});
  get diagnostics n = row_count; if n <> ${TOTAL_SEGMENTS} then raise exception 'Segments %/${TOTAL_SEGMENTS}', n; end if;
end $passe$;`
const { error: ecritureErreur } = await sb.rpc('exec_sql', { sql })
if (ecritureErreur) throw ecritureErreur
const [{ count: liensApres, error: e4 }, { count: relusApres, error: e5 }, { data: audit, error: e6 }] = await Promise.all([
  sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  sb.from('segments').select('id', { count: 'exact', head: true }).in('id', ids).not('liens_revus_le', 'is', null),
  sb.from('liens_bibliques').select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id', ids),
])
if (e4 || e5 || e6) throw (e4 || e5 || e6)
if (liensApres !== total || relusApres !== TOTAL_SEGMENTS || audit.some(lien => !lien.motif || lien.provenance !== 'lecture' || (lien.canon_id ? lien.fiabilite !== 'vérifié' || lien.arbitrage_requis : lien.fiabilite !== 'à constituer' || !lien.arbitrage_requis || lien.type !== 4 || !lien.motif.startsWith('RÉFÉRENCE NON BIBLIQUE')))) throw Error('Postcontrôle invalide')
const clesApres = audit.map(lien => `${lien.segment_id}|${lien.canon_id ?? 'sans-cible'}|${lien.type}|${lien.motif}`)
if (new Set(clesApres).size !== clesApres.length) throw Error('Doublon dans le postétat')
console.log(`✓ ${liensApres} liens, ${relusApres} segments, sauvegarde ${sauvegardePath}`)
