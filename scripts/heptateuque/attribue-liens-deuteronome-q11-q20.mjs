import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre cinquième'
const PREMIER = 2428
const DERNIER = 2486
const NB_SEGMENTS = 59
const WRITE = process.argv.includes('--write')
const DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Deutéronome Q. XI-XX'
const EMPREINTE_ATTENDUE = 'd2c4185f06d0140e49b846bedba0b11276332e75b82603b3277f8756a798912e'
const CHARTE_HASH = '47893c044ebab26e78149548c129fb9de3b72dde1e37c3371b60a1786240c198'
const QUESTIONS = ['Question XI', 'Question XII', 'Question XIII', 'Question XIV', 'Question XV', 'Question XVI', 'Question XVII', 'Question XVIII', 'Question XIX', 'Question XX']
const PREUVES = [
  ['scripts/heptateuque/img/p541.jpg', 'a8a72580613ff0e52b4c525f725d6e0abe9b4725c1dfd2a9f93e26676d9f560c', 'Page imprimée 533, ouverture du lot.'],
  ['scripts/heptateuque/img/p542.jpg', 'db71c9bd30e10df39a534b0322aa55846d04cfb048f036be148c7fc847c0192e', 'Page imprimée 534 : la note 648 porte Exode 34,27,28.'],
  ['scripts/heptateuque/img/p543.jpg', '07dad29bd1e6c9f04bae7740a7ca22b5e463502d025b196a5cd69d1e7c38584a', 'Page imprimée 535 : la note 653 porte Ib. 27,28 et le texte porte « consignées ».'],
  ['scripts/heptateuque/img/p544.jpg', '70dd932c629e7f7e8d543c4e1827a24a1f41684a4a99b1451ab77ef4aa6cbc26', 'Page imprimée 536, Questions XV à XIX.'],
  ['scripts/heptateuque/img/p545.jpg', '0b8c480a495aa2042dfee436ea48d1820e185b6783195b22c725bc2d55540108', 'Page imprimée 537, Question XX et raccord suivant.'],
]
const CORRECTIONS_TEXTE = new Map([[2457, ['se trouvent consignée une foule', 'se trouvent consignées une foule']]])
const CORRECTIONS_NOTES = new Map([
  [2447, ['[[648]] Exo. XXXIV, 27-29', '[[648]] Exo. XXXIV, 27, 28']],
  [2456, ['[[653]] Ib. XXVII, 28', '[[653]] Ib. 27, 28']],
])

const LIENS = []
const add = (n, canonId, type, motif) => LIENS.push([n, canonId, type, motif])
const both = (n, canonId, motif) => {
  add(n, canonId, 1, `${motif} — citation ou référence intentionnelle.`)
  add(n, canonId, 3, `${motif} — passage commenté ou mobilisé dans le raisonnement.`)
}
const explain = (n, ids, motif) => { for (const id of ids) add(n, id, 3, `${motif} (${id}).`) }
const SANS_CIBLE = []
const nonBiblique = (n, genre, motif) => SANS_CIBLE.push([n, 4, `RÉFÉRENCE NON BIBLIQUE (${genre}) : ${motif}`])

// Question XI — Loi sur pierre et Loi dans les cœurs.
both(2428, 'DEU.5.29', 'Dieu souhaite au peuple un cœur qui le craigne et garde toujours ses commandements')
explain(2429, ['DEU.5.29'], 'Le cœur capable de justice est présenté comme un don de la grâce plutôt qu’un fruit autonome de la Loi.')
both(2429, 'EZK.11.19', 'Dieu enlève le cœur de pierre et donne un cœur de chair')
both(2429, 'EZK.36.26', 'Dieu promet un cœur nouveau et remplace le cœur de pierre par un cœur de chair')
for (const id of ['EZK.11.19', 'EZK.36.26']) explain(2430, [id], 'La chair sensible et la pierre insensible expliquent la figure du cœur renouvelé.')
for (const id of ['JER.31.31', 'JER.31.32', 'JER.31.33', 'JER.31.34']) both(2431, id, 'Jérémie annonce la nouvelle alliance, la Loi écrite dans les cœurs et le pardon des péchés')
both(2432, '2CO.3.3', 'La lettre du Christ est écrite non sur des tables de pierre mais sur des tables de chair, les cœurs')
both(2433, '2CO.3.6', 'Dieu rend ses ministres capables de servir la nouvelle alliance, non de la lettre mais de l’Esprit')

// Question XII — le serment.
both(2434, 'DEU.6.13', 'Le commandement de jurer au nom du Seigneur interdit surtout de jurer au nom d’un autre dieu')
both(2434, 'MAT.5.34', 'Le Christ recommande de ne pas jurer du tout')
for (const n of [2435]) explain(n, ['DEU.6.13', 'MAT.5.34'], 'L’abstention de tout serment éloigne plus sûrement du parjure.')

// Question XIII — Dieu tente pour faire connaître.
both(2436, 'DEU.8.2', 'Dieu conduit et éprouve Israël dans le désert afin de faire connaître ce qui est dans son cœur')
both(2437, 'DEU.13.3', 'Dieu éprouve son peuple pour savoir s’il l’aime')
explain(2437, ['DEU.8.2'], 'La formule « afin de connaître » est interprétée à la lumière de « afin de faire connaître ».')
for (const n of [2438]) explain(n, ['DEU.8.2', 'DEU.13.3'], 'La locution hypothétique est résolue par le parallèle entre connaître et faire connaître.')

// Question XIV — justes et pécheurs des deux générations.
both(2439, 'DEU.9.6', 'La terre est donnée non à cause de la justice d’Israël, peuple à la tête dure')
explain(2439, ['DEU.1.39'], 'Les enfants qui ne savaient distinguer le bien du mal sont ceux qui entrent dans la terre promise.')
both(2440, 'DEU.9.7', 'Le contenu de la note imprimée Deutéronome 9,17 correspond au verset local 9,7 : rébellion continue depuis la sortie d’Égypte')
for (const n of [2441]) explain(n, ['DEU.9.6', 'DEU.9.7', 'DEU.9.8', 'DEU.1.39'], 'L’entrée ou la mort dans le désert ne suffit pas à classer tous les fils comme justes et tous les pères comme coupables.')
for (const id of ['1CO.10.5', '1CO.10.6', '1CO.10.7', '1CO.10.8', '1CO.10.9', '1CO.10.10']) both(2442, id, 'Paul rappelle que plusieurs, non tous, tombèrent dans les péchés du désert')
both(2442, 'DEU.9.8', 'Israël irrita encore le Seigneur à Horeb')
explain(2443, ['DEU.9.8', 'NUM.14.29', 'NUM.14.30'], 'Les coupables d’Horeb appartiennent à la génération qui meurt dans le désert, tandis que les exceptions fidèles subsistent.')

// Question XV — auteur de l’écriture des secondes tables.
for (const id of ['DEU.10.1', 'DEU.10.2']) both(2444, id, 'Dieu ordonne à Moïse de tailler deux tables et promet d’y écrire les paroles des premières')
for (const id of ['DEU.10.3', 'DEU.10.4']) both(2445, id, 'Moïse taille les tables puis le Seigneur y écrit les dix commandements')
both(2446, 'EXO.34.27', 'Dans l’Exode, Dieu commande à Moïse d’écrire les paroles de l’alliance')
both(2447, 'EXO.34.27', 'Moïse reçoit l’ordre d’écrire les paroles')
both(2447, 'EXO.34.28', 'Moïse demeure quarante jours devant Dieu et écrit les dix paroles sur les tables')
explain(2448, ['DEU.10.4', 'EXO.34.28'], 'Le Deutéronome attribue l’écriture à Dieu tandis que la lecture naturelle de l’Exode l’attribue à Moïse.')
both(2449, 'EXO.31.18', 'Les premières tables sont écrites du doigt de Dieu')
both(2449, 'EXO.34.28', 'Les secondes tables paraissent gravées par Moïse dans la lecture de l’Exode')
nonBiblique(2449, 'renvoi interne', 'renvoi explicite à la Question CLXVI du livre de l’Exode')
for (const n of [2450, 2451]) explain(n, ['EXO.31.18', 'EXO.34.28'], 'Les premières et secondes tables sont lues comme figures de la crainte de l’ancienne Alliance et de la charité de la nouvelle.')
for (const id of ['DEU.10.3', 'DEU.10.4', 'DEU.10.1', 'DEU.10.2']) both(2452, id, 'Le Deutéronome attribue explicitement au Seigneur l’écriture des secondes tables comme des premières')
explain(2453, ['DEU.10.1', 'DEU.10.2', 'DEU.10.3', 'DEU.10.4', 'EXO.34.1'], 'Les deux récits promettent une écriture divine sur les tables taillées par Moïse.')
both(2454, 'EXO.34.1', 'Dieu promet d’écrire sur les nouvelles tables les paroles des premières')
both(2455, 'EXO.34.1', 'La promesse divine « j’écrirai » est confrontée à l’ordre ultérieur donné à Moïse')
both(2455, 'EXO.34.27', 'Dieu dit à Moïse d’écrire les paroles de l’alliance')
both(2456, 'EXO.34.27', 'La note corrigée Exode 34,27-28 commence avec l’ordre d’écrire')
both(2456, 'EXO.34.28', 'Moïse demeure quarante jours et le sujet naturel du verbe écrit les dix paroles')
for (const n of [2457, 2458]) explain(n, ['EXO.34.27', 'EXO.34.28'], 'La syntaxe du récit est examinée pour déterminer si le sujet du verbe « écrivit » est Moïse ou le Seigneur.')
explain(2459, ['DEU.10.4', 'EXO.31.18', 'EXO.32.15', 'EXO.32.16'], 'L’hypothèse d’une seule écriture divine est confrontée aux premières tables, ouvrage et écriture de Dieu.')
both(2460, 'EXO.32.15', 'Moïse descend avec les deux tables écrites des deux côtés')
both(2460, 'EXO.32.16', 'Les premières tables sont l’ouvrage de Dieu et portent son écriture')
both(2461, 'EXO.31.18', 'Les tables de pierre sont écrites du doigt de Dieu')
explain(2462, ['EXO.34.1', 'DEU.10.4'], 'Les secondes tables sont taillées par Moïse mais écrites par Dieu selon sa promesse.')
explain(2463, ['DEU.10.1', 'DEU.10.2', 'DEU.10.3', 'DEU.10.4'], 'La préparation humaine et l’écriture divine figurent la coopération de la grâce et de la foi.')
both(2464, 'ROM.7.12', 'La Loi est sainte et le commandement saint, juste et bon')
both(2465, 'ROM.10.3', 'Ceux qui cherchent à établir leur propre justice ne se soumettent pas à la justice de Dieu')
both(2466, 'EXO.34.28', 'Le sens syntaxique clair attribue à Moïse l’écriture des paroles de l’alliance')
both(2467, 'EXO.34.1', 'Dieu promet d’écrire sur les secondes tables')
both(2467, 'DEU.10.4', 'Le Deutéronome rapporte l’accomplissement de l’écriture divine')
both(2467, 'PHP.2.13', 'Dieu opère dans les fidèles le vouloir et le faire selon son bon plaisir')
both(2468, 'PHP.2.12', 'Les fidèles doivent opérer leur salut avec crainte et tremblement')
explain(2468, ['PHP.2.13'], 'L’opération divine soutient la coopération humaine sans détruire le libre choix.')

// Questions XVI à XVIII.
both(2469, 'DEU.10.8', 'La tribu de Lévi est séparée pour porter l’arche et servir en présence du Seigneur')
both(2469, 'DEU.10.9', 'Lévi n’a pas de part territoriale parce que le Seigneur est son partage')
explain(2470, ['DEU.10.8', 'DEU.10.9'], 'La tribu de Lévi figure le sacerdoce royal et universel de la nouvelle Alliance.')
both(2470, 'PSA.72.26', 'Le psalmiste proclame que Dieu est son partage')
both(2470, 'PSA.15.5', 'Le Seigneur est la portion de l’héritage et de la coupe du psalmiste')
add(2470, '1PE.2.9', 2, 'Le sacerdoce royal appliqué au peuple de la nouvelle Alliance explicite la figure lévitique.')
both(2471, 'DEU.11.20', 'Les paroles divines doivent être écrites sur les poteaux des maisons et sur les portes')
explain(2472, ['DEU.11.20'], 'L’ordre est interprété comme une hyperbole plutôt que comme une inscription matérielle exhaustive.')
both(2473, 'DEU.12.17', 'Le contenu attribué par la rubrique ancienne à Deutéronome 12,11 correspond au verset local 12,17 : interdiction de manger dans les villes dîmes et premiers-nés')
explain(2473, ['DEU.12.11'], 'Le lieu choisi pour le culte est celui où les offrandes, dîmes et prémices doivent être apportées.')

// Question XIX — les faux prophètes et l’épreuve permise.
for (const id of ['DEU.13.1', 'DEU.13.2', 'DEU.13.3']) both(2474, id, 'Le faux prophète dont le signe s’accomplit ne doit pas être suivi, car Dieu éprouve ainsi l’amour de son peuple')
explain(2475, ['DEU.13.3'], 'La formule « pour savoir » est rapportée au peuple que Dieu fait parvenir à la connaissance de lui-même.')
nonBiblique(2475, 'traduction', 'plusieurs interprètes latins rendent « pour savoir » par « afin qu’il sache »')
for (const n of [2476, 2477]) explain(n, ['DEU.13.1', 'DEU.13.2', 'DEU.13.3'], 'Les prodiges des faux prophètes sont permis comme épreuve destinée à faire connaître l’amour du peuple pour Dieu.')

// Question XX — la dîme de la troisième année.
both(2478, 'DEU.14.28', 'La dîme de la troisième année est mise en réserve dans les villes')
both(2478, 'DEU.14.29', 'Le Lévite, l’étranger, l’orphelin et la veuve mangent cette dîme et se rassasient')
for (const n of [2479]) explain(n, ['DEU.14.28', 'DEU.14.29'], 'La dîme locale est entièrement destinée aux personnes sans part ni ressources.')
explain(2480, ['DEU.14.22', 'DEU.14.23', 'DEU.14.24', 'DEU.14.25', 'DEU.14.26', 'DEU.14.27', 'DEU.14.28', 'DEU.14.29'], 'La dîme consommée au sanctuaire est distinguée de celle de la troisième année mise en réserve dans les villes.')
nonBiblique(2480, 'tradition textuelle', 'la version faite sur l’hébreu distingue plus nettement les deux dîmes')
both(2481, 'DEU.14.28', 'La version sur l’hébreu dit explicitement « la troisième année » et « une autre dîme »')
both(2481, 'DEU.14.29', 'La dîme est réservée dans les murailles au Lévite, à l’étranger, à l’orphelin et à la veuve')
nonBiblique(2481, 'traduction', 'citation développée de la version faite sur l’hébreu')
explain(2482, ['DEU.14.28'], 'La formulation « la troisième année » est comparée au grec « au bout de trois ans ».')
nonBiblique(2482, 'traduction', 'la version des Septante porte « au bout de trois ans »')
explain(2483, ['DEU.14.22', 'DEU.14.23', 'DEU.14.28'], 'Le mot « autre » prouve que la dîme locale diffère de celle consommée au lieu choisi.')
explain(2484, ['DEU.14.28', 'DEU.14.29'], 'La dîme de la troisième année est déposée dans les murailles et consommée par les personnes démunies.')
for (const n of [2485]) explain(n, ['DEU.14.28', 'DEU.14.29'], 'Le bénéfice de cette dîme revient exclusivement à ceux qui n’ont rien, en particulier aux Lévites.')
both(2486, 'DEU.15.1', 'La septième année est l’année de la remise')
explain(2486, ['DEU.14.28'], 'La formule de la septième année éclaire « au bout de trois ans » comme une révolution sans années intercalaires.')

const SANS_LIEN = new Set()
const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')
if (sha256('charte/CHARTE_IA.md') !== CHARTE_HASH) throw new Error('Charte modifiée : relire avant toute exécution')
for (const [path, hash] of PREUVES) if (sha256(path) !== hash) throw new Error(`Preuve fac-similé modifiée : ${path}`)
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: segments, error } = await sb.from('segments').select('id,segment_numero,segment_texte,notes,ref_niv1,ref_niv2,ref_niv2_texte,liens_revus_le,liens_revus_par').eq('id_oeuvre', OEUVRE).eq('ref_niv1', REF_NIV1).in('ref_niv2', QUESTIONS).order('segment_numero')
if (error) throw error
if (segments.length !== NB_SEGMENTS || segments.some((s, i) => s.segment_numero !== PREMIER + i)) throw new Error('Préétat : bornes ou continuité invalides')
if ([...new Set(segments.map((s) => s.ref_niv2))].join('|') !== QUESTIONS.join('|')) throw new Error('Questions incomplètes ou désordonnées')
if (segments.some((s) => s.ref_niv1 !== REF_NIV1 || s.liens_revus_le || s.liens_revus_par)) throw new Error('Préétat structurel ou relecture invalide')
for (const [n, [avant]] of CORRECTIONS_TEXTE) if (!segments.find((s) => s.segment_numero === n)?.segment_texte.includes(avant)) throw new Error(`Précondition texte invalide au segment ${n}`)
for (const [n, [avant]] of CORRECTIONS_NOTES) if (!segments.find((s) => s.segment_numero === n)?.notes?.includes(avant)) throw new Error(`Précondition note invalide au segment ${n}`)
const empreinte = createHash('sha256').update(JSON.stringify(segments.map((s) => [s.id, s.segment_numero, s.ref_niv1, s.ref_niv2, s.ref_niv2_texte, s.segment_texte, s.notes]))).digest('hex')
if (empreinte !== EMPREINTE_ATTENDUE) throw new Error(`Préétat modifié : ${empreinte}`)
const parNumero = new Map(segments.map((s) => [s.segment_numero, s]))
const classes = new Set([...LIENS, ...SANS_CIBLE].map(([n]) => n))
const nonClasses = segments.filter((s) => !classes.has(s.segment_numero) && !SANS_LIEN.has(s.segment_numero))
if (nonClasses.length) throw new Error(`Partition incomplète : ${nonClasses.map((s) => s.segment_numero)}`)
if ([...SANS_LIEN].some((n) => classes.has(n) || !parNumero.has(n))) throw new Error('SANS_LIEN invalide')
if (LIENS.some(([n, c, t, m]) => !parNumero.has(n) || !c || ![1, 2, 3, 4].includes(t) || !m.trim())) throw new Error('Manifeste biblique invalide')
if (SANS_CIBLE.some(([n, t, m]) => !parNumero.has(n) || t !== 4 || !m.startsWith('RÉFÉRENCE NON BIBLIQUE'))) throw new Error('Référence sans cible invalide')
const cles = LIENS.map(([n, c, t]) => `${n}|${c}|${t}`)
if (new Set(cles).size !== cles.length) throw new Error('Doublon interne')
const cibles = [...new Set(LIENS.map(([, c]) => c))]
const { data: temoins, error: temoinsError } = await sb.from('versets_lecture').select('id_verset,"TR0001","TR0003","TR0004"').in('id_verset', cibles)
if (temoinsError) throw temoinsError
const temoinsParId = new Map(temoins.map((t) => [t.id_verset, t]))
const invalides = cibles.filter((c) => { const t = temoinsParId.get(c); return !t || (!t.TR0001 && !t.TR0003 && !t.TR0004) })
if (invalides.length) throw new Error(`Cibles invalides : ${invalides.join(', ')}`)
const ids = segments.map((s) => s.id)
const [{ count: liensExistants, error: liensError }, { count: relusGlobaux, error: relusError }] = await Promise.all([
  sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  sb.from('segments').select('id', { count: 'exact', head: true }).eq('id_oeuvre', OEUVRE).not('liens_revus_le', 'is', null),
])
if (liensError || relusError) throw liensError || relusError
if (liensExistants) throw new Error(`${liensExistants} liens existent déjà dans le lot`)

const candidatsPath = 'scripts/heptateuque/segmentation-candidate/segments-candidate.json'
const sourceMapPath = 'scripts/heptateuque/segmentation-candidate/source-map.json'
const candidats = JSON.parse(readFileSync(candidatsPath, 'utf8'))
const sourceMap = JSON.parse(readFileSync(sourceMapPath, 'utf8'))
for (const [n, [avant, apres]] of CORRECTIONS_TEXTE) {
  const candidat = candidats.find((x) => x.segment_numero === n)
  if (!candidat?.segment_texte.includes(avant)) throw new Error(`Candidat texte non synchronisable au segment ${n}`)
  candidat.segment_texte = candidat.segment_texte.replace(avant, apres)
  const sources = sourceMap.filter((x) => x.first_segment_numero <= n && x.last_segment_numero >= n && x.source_clean?.includes(avant))
  if (sources.length !== 1) throw new Error(`Source-map non synchronisable au segment ${n} : ${sources.length}`)
  sources[0].source_clean = sources[0].source_clean.replace(avant, apres)
}
for (const [n, [avant, apres]] of CORRECTIONS_NOTES) {
  const candidat = candidats.find((x) => x.segment_numero === n)
  if (!candidat?.notes?.includes(avant)) throw new Error(`Candidat note non synchronisable au segment ${n}`)
  candidat.notes = candidat.notes.replace(avant, apres)
}
const TOTAL = LIENS.length + SANS_CIBLE.length
const types = LIENS.reduce((o, [, , t]) => { o[t] = (o[t] ?? 0) + 1; return o }, {})
for (const [, t] of SANS_CIBLE) types[t] = (types[t] ?? 0) + 1
const parQuestion = Object.fromEntries(QUESTIONS.map((q) => { const nums = new Set(segments.filter((s) => s.ref_niv2 === q).map((s) => s.segment_numero)); return [q, [...LIENS, ...SANS_CIBLE].filter(([n]) => nums.has(n)).length] }))
const pct = (n) => `${n} / 3262 = ${(100 * n / 3262).toFixed(2).replace('.', ',')} %`
console.log(JSON.stringify({ mode: WRITE ? 'écriture' : 'contrôle', lot: 'Deutéronome XI-XX', bornes: [PREMIER, DERNIER], segments: NB_SEGMENTS, corrections_texte: CORRECTIONS_TEXTE.size, corrections_notes: CORRECTIONS_NOTES.size, sic_confirmes: 0, liens_bibliques: LIENS.length, references_non_bibliques: SANS_CIBLE.length, total_liens: TOTAL, sans_lien: [...SANS_LIEN], cibles_distinctes: cibles.length, types, liens_par_question: parQuestion, empreinte, charte_hash: CHARTE_HASH, avancement_actuel: pct(relusGlobaux), avancement_potentiel_apres_ecriture: pct(relusGlobaux + NB_SEGMENTS) }, null, 2))
if (DETAIL) for (const [n, c, t, motif] of LIENS) { const temoin = temoinsParId.get(c); console.log({ n, c, t, motif, segment: parNumero.get(n).segment_texte, temoin: temoin.TR0003 || temoin.TR0001 || temoin.TR0004 }) }
if (!WRITE) process.exit(0)

const horodatage = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
const sauvegardePath = `scripts/heptateuque/audit-reprise/sauvegarde-deuteronome-q11-q20-${horodatage}.json`
mkdirSync('scripts/heptateuque/audit-reprise', { recursive: true })
writeFileSync(sauvegardePath, `${JSON.stringify({ oeuvre: OEUVRE, bornes: [PREMIER, DERNIER], empreinte, segments, liens_existants: [] }, null, 2)}\n`, 'utf8')
const quote = (v) => `'${String(v).replaceAll("'", "''")}'`
const valeurs = [...LIENS.map(([n, c, t, m]) => `(${parNumero.get(n).id}, ${quote(c)}, ${t}, 'vérifié', ${quote(m)}, 'lecture', false)`), ...SANS_CIBLE.map(([n, t, m]) => `(${parNumero.get(n).id}, null, ${t}, 'à constituer', ${quote(m)}, 'lecture', true)`)].join(',\n    ')
const idSql = ids.join(', ')
const correctionsTexteSql = [...CORRECTIONS_TEXTE].map(([n, [avant, apres]]) => `update segments set segment_texte = replace(segment_texte, ${quote(avant)}, ${quote(apres)}) where id = ${parNumero.get(n).id} and segment_texte like ${quote(`%${avant}%`)};
  get diagnostics n = row_count; if n <> 1 then raise exception 'Correction texte ${n}: %/1', n; end if;`).join('\n  ')
const correctionsNotesSql = [...CORRECTIONS_NOTES].map(([n, [avant, apres]]) => `update segments set notes = replace(notes, ${quote(avant)}, ${quote(apres)}) where id = ${parNumero.get(n).id} and notes like ${quote(`%${avant}%`)};
  get diagnostics n = row_count; if n <> 1 then raise exception 'Correction note ${n}: %/1', n; end if;`).join('\n  ')
const sql = `do $p$ declare n integer; begin
  if exists (select 1 from liens_bibliques where segment_id in (${idSql})) then raise exception 'Liens présents'; end if;
  if exists (select 1 from segments where id in (${idSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Déjà relu'; end if;
  ${correctionsTexteSql}
  ${correctionsNotesSql}
  insert into liens_bibliques (segment_id, canon_id, type, fiabilite, motif, provenance, arbitrage_requis) values ${valeurs};
  get diagnostics n = row_count; if n <> ${TOTAL} then raise exception 'Liens insérés : %', n; end if;
  update segments set liens_revus_le = now(), liens_revus_par = ${quote(RELECTEUR)} where id in (${idSql});
  get diagnostics n = row_count; if n <> ${NB_SEGMENTS} then raise exception 'Segments relus : %', n; end if;
end $p$;`
const { error: writeError } = await sb.rpc('exec_sql', { sql })
if (writeError) throw writeError
const [{ count: liensApres, error: e1 }, { count: relusApres, error: e2 }, { data: audit, error: e3 }, { data: textesApres, error: e4 }] = await Promise.all([
  sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  sb.from('segments').select('id', { count: 'exact', head: true }).in('id', ids).not('liens_revus_le', 'is', null),
  sb.from('liens_bibliques').select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id', ids),
  sb.from('segments').select('segment_numero,segment_texte,notes').in('id', ids),
])
if (e1 || e2 || e3 || e4) throw e1 || e2 || e3 || e4
const post = new Map(textesApres.map((s) => [s.segment_numero, s]))
const correctionTexteInvalide = [...CORRECTIONS_TEXTE].some(([n, [avant, apres]]) => post.get(n).segment_texte.includes(avant) || !post.get(n).segment_texte.includes(apres))
const correctionNoteInvalide = [...CORRECTIONS_NOTES].some(([n, [avant, apres]]) => post.get(n).notes.includes(avant) || !post.get(n).notes.includes(apres))
if (liensApres !== TOTAL || relusApres !== NB_SEGMENTS || correctionTexteInvalide || correctionNoteInvalide || audit.some((l) => !l.motif || l.provenance !== 'lecture' || (l.canon_id ? (l.fiabilite !== 'vérifié' || l.arbitrage_requis) : (l.fiabilite !== 'à constituer' || !l.arbitrage_requis || l.type !== 4)))) throw new Error('Postcontrôle invalide')
const clesApres = audit.map((l) => `${l.segment_id}|${l.canon_id ?? 'sans-cible'}|${l.type}|${l.motif}`)
if (new Set(clesApres).size !== clesApres.length) throw new Error('Doublon dans le postétat')
writeFileSync(candidatsPath, `${JSON.stringify(candidats, null, 2)}\n`, 'utf8')
writeFileSync(sourceMapPath, `${JSON.stringify(sourceMap, null, 2)}\n`, 'utf8')
console.log(`✓ ${liensApres} liens ; ${relusApres} segments relus ; sauvegarde ${sauvegardePath}`)
