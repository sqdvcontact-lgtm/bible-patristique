import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre cinquième'
const DEBUT = 2636
const FIN = 2689
const TOTAL_SEGMENTS = 54
const QUESTIONS = ['Question LI', 'Question LII', 'Question LIII', 'Question LIV', 'Question LV', 'Question LVI', 'Question LVII']
const WRITE = process.argv.includes('--write')
const DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Deutéronome Q. LI-LVII'
const EMPREINTE_ATTENDUE = 'ee9b462c197ecefe6fef8a64376711633dfa087c76f763cc062868e36a0f8cf3'
const CHARTE = 'charte/CHARTE_IA.md'
const CHARTE_HASH = '47893c044ebab26e78149548c129fb9de3b72dde1e37c3371b60a1786240c198'
const PREUVES = [
  ['scripts/heptateuque/img/p555.jpg', 'e2ccbef6598432d7cc3650c0d308599a4be82f5c6fd1f5b15892cf08c3190d18', 'La page imprimée 555 confirme les Questions LI-LII et le décalage de numérotation des lemmes de Deutéronome 29.'],
  ['scripts/heptateuque/img/p556.jpg', 'fdac80ebe70c10c6580a57d6c137812c683de8ff921b0566b1ed7f16daeef9c9', 'La page imprimée 556 confirme la fin de la Question LII et les Questions LIII-LIV.'],
  ['scripts/heptateuque/img/p557.jpg', 'd2b9fcded7f1141e5c4eaec28e494da082b6782fb179cce8024bff0852338a93', 'La page imprimée 557 confirme les trois traductions de Deutéronome 32,5 et les notes bibliques de la Question LV.'],
  ['scripts/heptateuque/img/p558.jpg', '71e129d4779cc96ebdb75a836c06529d230b7957072df78d1681620050a5c3c5', 'La page imprimée 558 confirme Jérémie 14,7, Psaume 40,5, Ézéchiel 33,11 et II Rois 12,13.'],
  ['scripts/heptateuque/img/p559.jpg', '0a116e7ac7bf406d22af4bb7e270b6a160c09086a64878d13bbc37145fbd3852', 'La page imprimée 559 confirme la fin des Questions LVI-LVII et le raccord avec le livre suivant.'],
]
const CORRECTIONS_NOTES = [
  { numero: 2669, avant: '[[725]] Jer. XIV, 1', apres: '[[725]] Jer. XIV, 7.' },
  { numero: 2670, avant: '[[726]] Psa. XI, 6', apres: '[[726]] Psa. XL, 5.' },
  { numero: 2670, avant: '[[727]] Eze. XXXIII, 2', apres: '[[727]] Eze. XXXIII, 11.' },
  { numero: 2671, avant: '[[728]] 1Ro. XII, 13', apres: '[[728]] 2Sa. XII, 13.' },
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

// LI — nourriture et boisson au désert. Les lemmes imprimés sont décalés d'un verset.
both(2636, 'DEU.29.4', 'Les vêtements et chaussures d’Israël ne s’usent pas pendant quarante ans au désert')
both(2636, 'DEU.29.5', 'Israël ne mange pas de pain et ne boit ni vin ni cidre au désert')
com(2637, ['DEU.29.5'], 'L’absence de vin au désert est conciliée avec la boisson emportée à la sortie d’Égypte')
both(2637, 'EXO.32.6', 'Le peuple mange, boit puis se lève pour se divertir devant le veau d’or')
com(2638, ['DEU.29.5'], 'Le cri d’ivresse confirme que le peuple avait eu du vin avant son séjour prolongé au désert')
both(2638, 'EXO.32.18', 'Moïse distingue le chant du peuple des cris de victoire ou de défaite')

// LII — la racine d’amertume et les menaces contre l’idolâtre.
both(2639, 'DEU.29.17', 'Un homme, une femme, une famille ou une tribu peut se détourner de Dieu et devenir racine de fiel et d’amertume')
both(2640, 'DEU.29.18', 'Le pécheur se flatte de rester en paix dans l’égarement de son cœur et risque d’entraîner l’innocent')
both(2640, 'DEU.29.19', 'Dieu refuse le pardon et fait peser les malédictions de l’Alliance sur cet homme')
com(2641, ['DEU.29.17'], 'La formulation interrogative du lemme examine la possibilité qu’un membre d’Israël se détourne vers les dieux des nations')
com(2642, ['DEU.29.18'], 'La prétendue transformation des malédictions en bénédictions est l’illusion de celui qui suit les dieux des nations')
com(2643, ['DEU.29.18'], 'Le pécheur qui s’égare peut entraîner un autre membre du peuple avec lui')
com(2644, ['DEU.29.19'], 'Le pardon refusé dément l’espoir d’écarter les châtiments par une bénédiction intérieure')
com(2645, ['DEU.29.19'], 'La colère divine et toutes les malédictions écrites s’attachent au prévaricateur')
com(2646, ['DEU.29.19'], 'Toutes les malédictions signifient que le coupable n’échappera pas au supplice que la Loi lui réserve')
com(2647, ['DEU.29.18'], 'Le grec anamarṭēton désigne ici celui qui est exempt du péché particulier dont il est question')
com(2648, ['DEU.29.18'], 'L’absence de péché est expliquée relativement au péché déterminé que le texte vient de viser')
both(2648, 'JHN.15.22', 'Le Christ déclare que sans sa venue et sa parole ses auditeurs n’auraient pas ce péché d’incrédulité')
nonBiblique(2648, 'œuvre patristique', 'renvoi explicite au livre I, chapitre 10 du Contre Julien d’Augustin')
com(2649, ['DEU.29.18'], 'La pureté ou l’innocence est à nouveau limitée au péché précis considéré dans le lemme')
both(2649, 'GEN.20.6', 'Dieu sait qu’Abimélech a agi avec un cœur simple et le préserve de pécher contre lui')
both(2649, 'MAT.5.8', 'Les cœurs purs sont proclamés heureux parce qu’ils verront Dieu')

// LIII — circoncision du cœur et grâce.
both(2650, 'DEU.30.6', 'Dieu circoncit le cœur de son peuple afin qu’il l’aime et qu’il vive')

// LIV — proximité de la parole, foi, charité et œuvres.
for (const verset of [11, 12]) both(2651, `DEU.30.${verset}`, 'Le commandement n’est ni hors de portée ni dans le ciel')
for (const verset of [13, 14]) both(2652, `DEU.30.${verset}`, 'Le commandement n’est pas au-delà de la mer mais proche, dans la bouche et dans le cœur')
com(2653, ['DEU.30.11', 'DEU.30.12', 'DEU.30.13', 'DEU.30.14'], 'La proximité du commandement est interprétée comme figure des réalités spirituelles du Nouveau Testament')
both(2653, 'ROM.10.8', 'Paul applique la parole proche de la bouche et du cœur à la parole de la foi')
both(2653, 'DEU.29.21', 'La note imprimée renvoie au chapitre précédent pour les prescriptions consignées dans le livre de la Loi')
both(2654, 'DEU.30.13', 'La question de celui qui traversera la mer est le texte auquel Paul substitue la descente dans l’abîme')
both(2654, 'ROM.10.7', 'Paul demande qui descendra dans l’abîme pour ramener le Christ d’entre les morts')
com(2655, ['DEU.30.13', 'ROM.10.7'], 'La mer au-delà de laquelle on passe est interprétée comme la vie présente limitée par la mort')
both(2656, 'DEU.30.14', 'Le Deutéronome place la parole dans la bouche et le cœur et ajoute les mains dans la version commentée')
both(2656, 'ROM.10.8', 'Paul cite la parole dans la bouche et dans le cœur')
both(2656, 'ROM.10.10', 'La foi du cœur justifie et la confession de la bouche sauve')
com(2657, ['DEU.30.14'], 'L’addition des mains dans les Septante est interprétée comme symbole des œuvres inspirées par le cœur')
both(2657, 'GAL.5.6', 'La foi agit par la charité')
nonBiblique(2657, 'version biblique', 'mention explicite de la version faite sur l’hébreu, qui omet les mots « dans tes mains »')
nonBiblique(2657, 'version biblique', 'mention explicite de l’addition des Septante « dans tes mains » et interprétation de sa raison')
com(2658, ['DEU.30.14', 'GAL.5.6'], 'L’accomplissement extérieur des commandements ne suffit pas si le cœur ne participe pas à l’œuvre des mains')
com(2659, ['DEU.30.14', 'GAL.5.6'], 'La charité intérieure permet l’accomplissement véritable même lorsque le travail des mains est impossible')
both(2659, 'ROM.13.10', 'La charité est la plénitude de la Loi')
both(2659, 'LUK.2.14', 'La paix est promise aux hommes de bonne volonté')

// LV — pécher devant Dieu et pécher contre Dieu.
both(2660, 'DEU.32.5', 'Le lemme sur les enfants qui ont péché sans pécher devant Dieu reçoit trois traductions grecques')
nonBiblique(2660, 'version biblique', 'premier groupe d’interprètes : τέκνα μωμητά rendu par « enfants méprisables »')
nonBiblique(2660, 'version biblique', 'deuxième groupe d’interprètes : « enfants couverts de souillures »')
nonBiblique(2660, 'version biblique', 'troisième groupe d’interprètes : « enfants corrompus »')
for (let numero = 2661; numero <= 2673; numero++) com(numero, ['DEU.32.5'], 'La distinction entre pécher devant Dieu et pécher contre Dieu développe le lemme')
for (const canonId of ['PSA.50.6', 'JER.14.7', 'JER.14.8', 'PSA.40.5']) both(2662, canonId, 'Les confessions bibliques d’un péché commis devant Dieu sont rapprochées du lemme')
both(2663, '1SA.2.25', 'Héli distingue le péché contre un homme du péché contre Dieu')
com(2664, ['1SA.2.25'], 'Le péché des fils d’Héli contre Dieu concerne directement le culte divin')
both(2665, 'GEN.20.6', 'Dieu préserve Abimélech de pécher contre lui au sujet de Sara')
both(2667, 'PSA.50.6', 'David confesse avoir péché devant Dieu afin que Dieu soit reconnu juste')
both(2668, 'ISA.5.3', 'Dieu invite les habitants de Jérusalem à juger entre lui et sa vigne')
both(2668, 'JHN.14.30', 'Le prince de ce monde vient et ne trouve rien dans le Christ')
both(2668, 'JHN.14.31', 'Le Christ accomplit le commandement du Père et marche volontairement vers sa passion')
both(2669, 'JER.14.7', 'Jérémie confesse le péché d’Israël devant Dieu dans un esprit de pénitence')
both(2669, 'JER.14.8', 'Jérémie invoque l’unique attente et le sauveur d’Israël')
both(2670, 'PSA.40.5', 'Le psalmiste demande la guérison de son âme parce qu’il a péché devant Dieu')
both(2670, 'EZK.33.11', 'Dieu ne veut pas la mort du pécheur mais sa conversion et sa vie')
both(2671, '2SA.12.13', 'David répond à Nathan qu’il a péché contre le Seigneur et reçoit l’annonce du pardon')
both(2672, 'PSA.77.39', 'Les pécheurs impénitents sont comparés à un souffle qui passe et ne revient plus')

// LVI — bénédiction de Moïse et interprétation christologique.
both(2674, 'DEU.33.1', 'Moïse donne sa bénédiction aux enfants d’Israël avant sa mort')
both(2674, 'DEU.33.2', 'Le Seigneur vient du Sinaï, se lève de Séïr et paraît de Pharan avec les saints')
for (const verset of [3, 4, 5]) both(2675, `DEU.33.${verset}`, 'Les saints, la Loi donnée par Moïse et le prince du peuple sont cités dans la bénédiction')
com(2676, ['DEU.33.1', 'DEU.33.2', 'DEU.33.3', 'DEU.33.4', 'DEU.33.5'], 'La bénédiction entière est interprétée comme prophétie du peuple nouveau sanctifié par le Christ')
com(2677, ['DEU.33.2'], 'La venue du Sinaï et le lever depuis Séïr soulèvent la difficulté interprétative')
com(2678, ['DEU.33.4'], 'Moïse parlant de la Loi donnée par Moïse montre qu’il prophétise au nom du Christ')
com(2679, ['DEU.33.1', 'DEU.33.2', 'DEU.33.3', 'DEU.33.4', 'DEU.33.5'], 'La prophétie de la bénédiction est rapportée au peuple nouveau et aux enfants de la promesse')
both(2680, 'DEU.33.2', 'La venue du Sinaï et le lever de Séïr sont interprétés par l’épreuve du Christ et la figure du pécheur')
both(2680, 'GEN.25.25', 'Ésaü vient au monde roux et couvert de poils')
com(2681, ['DEU.33.2'], 'Le lever depuis Séïr annonce la grâce du Christ communiquée à Israël par les nations')
both(2681, 'ISA.9.2', 'La lumière brille pour ceux qui étaient assis dans les ténèbres et l’ombre de la mort')
com(2682, ['DEU.33.2'], 'Séïr et Pharan figurent les nations et l’Église par lesquelles la grâce atteint Israël')
both(2682, 'ROM.11.31', 'L’incrédulité présente des Juifs doit conduire à leur obtention de la miséricorde')
com(2683, ['DEU.33.2'], 'Cadès et les multitudes figurent les peuples changés et sanctifiés par la grâce')
both(2684, 'DEU.33.3', 'Le pardon du peuple et les saints placés dans la main du Christ sont interprétés christologiquement')
both(2684, 'ROM.10.3', 'Les hommes qui établissent leur propre justice refusent de se soumettre à la justice de Dieu')
both(2685, 'DEU.33.4', 'Le peuple reçoit la Loi donnée par Moïse lorsqu’il en comprend les paroles divines')
com(2686, ['DEU.33.4'], 'La Loi de Moïse est reçue lorsque son intelligence christologique devient accessible')
both(2686, 'JHN.5.46', 'Le Christ affirme que Moïse a écrit de lui')
add(2686, '2CO.3.16', 2, 'Le voile antique ôté lorsque le peuple se tourne vers le Seigneur reprend l’image paulinienne de 2 Corinthiens 3,16.')
com(2687, ['DEU.33.4'], 'La Loi est l’héritage céleste et éternel des assemblées de Jacob')
both(2688, 'DEU.33.5', 'Le bien-aimé règne comme prince quand les chefs des nations sont unis aux tribus d’Israël')
both(2688, 'ROM.11.25', 'L’aveuglement partiel d’Israël dure jusqu’à l’entrée de la plénitude des nations')
both(2688, 'ROM.11.26', 'Tout Israël sera sauvé après l’entrée de la plénitude des nations')
both(2688, 'ROM.15.10', 'Les nations sont invitées à se réjouir avec le peuple de Dieu')

// LVII — Joseph, le taureau et la croix.
both(2689, 'DEU.33.17', 'La beauté du premier-né semblable au taureau et ses deux cornes sont interprétées comme figure du Christ et de la croix')

if (createHash('sha256').update(readFileSync(CHARTE)).digest('hex') !== CHARTE_HASH) throw Error('Charte modifiée depuis la préparation du lot')
for (const [path, hash] of PREUVES) if (createHash('sha256').update(readFileSync(path)).digest('hex') !== hash) throw Error(`Preuve fac-similé modifiée : ${path}`)
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).map(line => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(match => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: bruts, error: e0 } = await sb.from('segments').select('id,id_oeuvre,segment_numero,ref_niv1,ref_niv2,ref_niv2_texte,segment_texte,texte_original,notes,nature,liens_revus_le,liens_revus_par').eq('id_oeuvre', OEUVRE).gte('segment_numero', DEBUT - 1).lte('segment_numero', FIN + 1).order('segment_numero')
if (e0) throw e0
const voisinAvant = bruts.find(s => s.segment_numero === DEBUT - 1)
const voisinApres = bruts.find(s => s.segment_numero === FIN + 1)
if (voisinAvant?.ref_niv1 !== REF_NIV1 || voisinAvant?.ref_niv2 !== 'Question L') throw Error('Raccord amont invalide')
if (voisinApres?.ref_niv1 !== 'Livre sixième' || voisinApres?.ref_niv2 !== 'Question I') throw Error('Raccord aval invalide')
const segments = bruts.filter(s => s.segment_numero >= DEBUT && s.segment_numero <= FIN)
if (segments.length !== TOTAL_SEGMENTS || segments.some((s, i) => s.segment_numero !== DEBUT + i) || segments.some(s => s.ref_niv1 !== REF_NIV1 || !QUESTIONS.includes(s.ref_niv2)) || [...new Set(segments.map(s => s.ref_niv2))].join('|') !== QUESTIONS.join('|')) throw Error('Préétat structurel invalide')
if (segments.some(s => s.liens_revus_le || s.liens_revus_par)) throw Error('Lot déjà relu')
const empreinte = createHash('sha256').update(JSON.stringify(segments.map(s => [s.id, s.segment_numero, s.ref_niv1, s.ref_niv2, s.ref_niv2_texte, s.segment_texte, s.texte_original, s.notes, s.nature]))).digest('hex')
if (empreinte !== EMPREINTE_ATTENDUE) throw Error(`Empreinte inattendue : ${empreinte}`)
const parNumero = new Map(segments.map(s => [s.segment_numero, s]))
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
if (cibles.some(c => { const v = parCible.get(c); return !v.TR0001 || !v.TR0003 || !v.TR0004 })) throw Error('Cible incomplète dans les trois témoins locaux')
const ids = segments.map(s => s.id)
const [{ count: liensExistants, error: e2 }, { count: relusGlobaux, error: e3 }] = await Promise.all([
  sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  sb.from('segments').select('id', { count: 'exact', head: true }).eq('id_oeuvre', OEUVRE).not('liens_revus_le', 'is', null),
])
if (e2 || e3) throw (e2 || e3)
if (liensExistants) throw Error(`${liensExistants} liens préexistants dans le lot`)
const candidatsPath = 'scripts/heptateuque/segmentation-candidate/segments-candidate.json'
const candidats = JSON.parse(readFileSync(candidatsPath, 'utf8'))
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
console.log(JSON.stringify({ mode: WRITE ? 'écriture' : 'contrôle', lot: 'Deutéronome LI-LVII', bornes: [DEBUT, FIN], voisins: { avant: [voisinAvant.segment_numero, voisinAvant.ref_niv2], apres: [voisinApres.segment_numero, voisinApres.ref_niv1, voisinApres.ref_niv2] }, segments: TOTAL_SEGMENTS, corrections_notes: CORRECTIONS_NOTES.length, liens: total, liens_bibliques: LIENS.length, sans_cible_a_constituer: NON_RESOLUS.length, sans_lien: [...SANS_LIEN], cibles_distinctes: cibles.length, types, liens_par_question: liensParQuestion, empreinte, anciennes_numerotations_arbitrees: ['Deut. 29,5-6 imprimé → DEU.29.4-5 selon le contenu des témoins locaux', 'Deut. 29,18-21 imprimé → début du passage en DEU.29.17 selon le contenu', 'Jer. XIV,1 → JER.14.7', 'Psa. XI,6 → PSA.40.5', 'Eze. XXXIII,2 → EZK.33.11', 'II Rois XII,13 → 2SA.12.13'], sic: 'aucun sic dans le lot ; aucune anomalie numérique, syntaxique ou de ponctuation n’en reçoit', avancement_actuel: pct(relusGlobaux), avancement_apres_ecriture_ulterieure: pct(relusGlobaux + TOTAL_SEGMENTS) }, null, 2))
if (DETAIL) {
  for (const [numero, canonId, type, motif] of LIENS) console.log({ numero, canonId, type, motif, segment: parNumero.get(numero).segment_texte, ...parCible.get(canonId) })
  for (const [numero, type, motif] of NON_RESOLUS) console.log({ numero, canonId: null, type, motif, segment: parNumero.get(numero).segment_texte })
}
if (!WRITE) process.exit(0)

const horodatage = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
const sauvegardePath = `scripts/heptateuque/audit-reprise/sauvegarde-deuteronome-q51-q57-${horodatage}.json`
mkdirSync('scripts/heptateuque/audit-reprise', { recursive: true })
writeFileSync(sauvegardePath, `${JSON.stringify({ oeuvre: OEUVRE, bornes: [DEBUT, FIN], empreinte, segments, liens_existants: [] }, null, 2)}\n`, 'utf8')
const quote = value => `'${String(value).replaceAll("'", "''")}'`
const valeurs = [...LIENS.map(([n, c, t, m]) => `(${parNumero.get(n).id}, ${quote(c)}, ${t}, 'vérifié', ${quote(m)}, 'lecture', false)`), ...NON_RESOLUS.map(([n, t, m]) => `(${parNumero.get(n).id}, null, ${t}, 'à constituer', ${quote(m)}, 'lecture', true)`)].join(',\n    ')
const idsSql = ids.join(', ')
const correctionsNotesSql = CORRECTIONS_NOTES.map(c => `update segments set notes = replace(notes, ${quote(c.avant)}, ${quote(c.apres)}) where id = ${parNumero.get(c.numero).id} and notes like ${quote(`%${c.avant}%`)};
  get diagnostics n = row_count; if n <> 1 then raise exception 'Correction note segment ${c.numero}: %/1', n; end if;`).join('\n  ')
const sql = `do $passe$ declare n integer; begin
  if exists (select 1 from liens_bibliques where segment_id in (${idsSql})) then raise exception 'Liens déjà présents'; end if;
  if exists (select 1 from segments where id in (${idsSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Marques déjà présentes'; end if;
  if (select count(*) from segments where id in (${idsSql}) and id_oeuvre = '${OEUVRE}' and ref_niv1 = ${quote(REF_NIV1)} and ref_niv2 in (${QUESTIONS.map(quote).join(', ')}) and segment_numero between ${DEBUT} and ${FIN}) <> ${TOTAL_SEGMENTS} then raise exception 'Préconditions structurelles invalides'; end if;
  ${correctionsNotesSql}
  insert into liens_bibliques (segment_id, canon_id, type, fiabilite, motif, provenance, arbitrage_requis) values ${valeurs};
  get diagnostics n = row_count; if n <> ${total} then raise exception 'Liens %/${total}', n; end if;
  update segments set liens_revus_le = now(), liens_revus_par = ${quote(RELECTEUR)} where id in (${idsSql});
  get diagnostics n = row_count; if n <> ${TOTAL_SEGMENTS} then raise exception 'Segments %/${TOTAL_SEGMENTS}', n; end if;
end $passe$;`
const { error: ecritureErreur } = await sb.rpc('exec_sql', { sql })
if (ecritureErreur) throw ecritureErreur
const [{ count: liensApres, error: e4 }, { count: relusApres, error: e5 }, { data: audit, error: e6 }, { data: notesApres, error: e7 }] = await Promise.all([
  sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  sb.from('segments').select('id', { count: 'exact', head: true }).in('id', ids).not('liens_revus_le', 'is', null),
  sb.from('liens_bibliques').select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id', ids),
  sb.from('segments').select('segment_numero,notes').in('id', ids),
])
if (e4 || e5 || e6 || e7) throw (e4 || e5 || e6 || e7)
const post = new Map(notesApres.map(s => [s.segment_numero, s]))
const noteInvalide = CORRECTIONS_NOTES.some(c => post.get(c.numero).notes.includes(c.avant) || !post.get(c.numero).notes.includes(c.apres))
if (liensApres !== total || relusApres !== TOTAL_SEGMENTS || noteInvalide || audit.some(l => !l.motif || l.provenance !== 'lecture' || (l.canon_id ? l.fiabilite !== 'vérifié' || l.arbitrage_requis : l.fiabilite !== 'à constituer' || !l.arbitrage_requis || l.type !== 4 || !l.motif.startsWith('RÉFÉRENCE NON BIBLIQUE')))) throw Error('Postcontrôle invalide')
const clesApres = audit.map(l => `${l.segment_id}|${l.canon_id ?? 'sans-cible'}|${l.type}|${l.motif}`)
if (new Set(clesApres).size !== clesApres.length) throw Error('Doublon dans le postétat')
writeFileSync(candidatsPath, `${JSON.stringify(candidats, null, 2)}\n`, 'utf8')
console.log(`✓ ${liensApres} liens, ${relusApres} segments, sauvegarde ${sauvegardePath}`)
