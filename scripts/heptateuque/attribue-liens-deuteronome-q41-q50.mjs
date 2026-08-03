import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre cinquième'
const PREMIER = 2561
const DERNIER = 2635
const NB_SEGMENTS = 75
const WRITE = process.argv.includes('--write')
const DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Deutéronome Q. XLI-L'
const EMPREINTE_ATTENDUE = 'b3cb0752ca27ebfa4d6cf54b568b4063515bb06d362d849936f5e8cbddf3f86e'
const CHARTE_HASH = '47893c044ebab26e78149548c129fb9de3b72dde1e37c3371b60a1786240c198'
const QUESTIONS = ['Question XLI', 'Question XLII', 'Question XLIII', 'Question XLIV', 'Question XLV', 'Question XLVI', 'Question XLVII', 'Question XLVIII', 'Question XLIX', 'Question L']
const PREUVES = [
  ['scripts/heptateuque/img/p550.jpg', 'b743bfc688b5a1231cef521196cc4960a5e049a74d53cfc870556ed72b681b6e', 'Page imprimée 542, ouverture du lot.'],
  ['scripts/heptateuque/img/p551.jpg', '88c0286c9f646a6f6bbdd90edc78f5f3cd85b27cde26bd26bb60661ddcfec821', 'Page imprimée 543, Questions XLI à XLIII.'],
  ['scripts/heptateuque/img/p552.jpg', 'b8e9a96ec62dc04ebdace70ee070d9222810af8d053ceaeb5d9b88a6df8a41b8', 'Page imprimée 544, Questions XLIII à XLVI.'],
  ['scripts/heptateuque/img/p553.jpg', '94e2333c8a8182817f98949e0639867d4bc499c1529d08c1e8b11e4f4dc99cae', 'Page imprimée 545 : aucun tiret devant « En effet » au segment 2602.'],
  ['scripts/heptateuque/img/p554.jpg', 'dbf9a44954e7b77b84ab80e0dede821882d5bbd78091f856fc60bbd4806a0a46', 'Page imprimée 546, Questions XLVII et XLVIII.'],
  ['scripts/heptateuque/img/p555.jpg', 'e2ccbef6598432d7cc3650c0d308599a4be82f5c6fd1f5b15892cf08c3190d18', 'Page imprimée 547, Questions XLVIII à L et raccord suivant.'],
]
const CORRECTIONS_TEXTE = new Map([[2602, ['– En effet, s’ils avaient été', 'En effet, s’ils avaient été']]])

const LIENS = []
const add = (n, c, t, m) => LIENS.push([n, c, t, m])
const both = (n, c, m) => { add(n, c, 1, `${m} — citation ou référence intentionnelle.`); add(n, c, 3, `${m} — passage commenté ou mobilisé dans le raisonnement.`) }
const explain = (n, ids, m) => { for (const id of ids) add(n, id, 3, `${m} (${id}).`) }
const SANS_CIBLE = []
const nonBiblique = (n, genre, m) => SANS_CIBLE.push([n, 4, `RÉFÉRENCE NON BIBLIQUE (${genre}) : ${m}`])

// Question XLI — le gage du débiteur pauvre.
both(2561, 'DEU.24.10', 'Le créancier ne doit pas entrer dans la maison du débiteur pour prendre un gage')
both(2561, 'DEU.24.11', 'Le créancier reste dehors et le débiteur lui apporte lui-même le gage')
both(2562, 'DEU.24.12', 'Le créancier ne doit pas dormir avec le gage du pauvre')
both(2562, 'DEU.24.13', 'Le vêtement rendu au coucher du soleil permet au pauvre de dormir et vaut justice au créancier')
for (const n of [2563]) explain(n, ['DEU.24.10', 'DEU.24.11'], 'La retenue du créancier préserve la maison du débiteur tout en maintenant l’obligation de fournir un gage.')
for (const n of [2564, 2565, 2566]) explain(n, ['DEU.24.12', 'DEU.24.13'], 'La restitution quotidienne du vêtement est expliquée comme rappel de la dette et comme miséricorde envers l’insolvable.')

// Question XLII — responsabilité personnelle et faute des pères.
both(2567, 'DEU.24.16', 'Les pères ne meurent pas pour les enfants ni les enfants pour les pères ; chacun meurt pour son péché')
both(2567, 'EZK.18.17', 'Le prophète affirme que le fils juste ne meurt pas pour l’iniquité de son père')
both(2568, 'EXO.20.5', 'Dieu punit l’iniquité des pères jusqu’aux troisième et quatrième générations de ceux qui le haïssent')
explain(2568, ['DEU.24.16'], 'La responsabilité personnelle est conciliée avec la transmission du péché originel.')
both(2569, 'EXO.20.5', 'La note imprimée Deutéronome 24,16 est fautive : la clause « ceux qui me haïssent » appartient localement à Exode 20,5')
explain(2569, ['DEU.24.16'], 'Les enfants déjà nés ne participent à la faute paternelle que s’ils imitent leurs pères.')
add(2570, 'ROM.5.12', 2, 'La mort passée d’Adam à tous les hommes sous-tend l’explication du péché originel.')
explain(2570, ['DEU.24.16', 'EXO.20.5'], 'La génération spirituelle par la grâce délivre de la mort éternelle sans abolir la mort héritée.')
for (const n of [2571, 2572, 2573]) explain(n, ['EXO.20.5'], 'Les troisième et quatrième générations sont comprises symboliquement comme le septénaire de toutes les générations.')
both(2574, 'AMO.1.3', 'La formule prophétique « après trois et quatre crimes » désigne la totalité des iniquités')
explain(2574, ['EXO.20.5'], 'Le parallèle prophétique confirme la valeur totalisante des nombres trois et quatre.')

// Question XLIII — la véritable veuve.
both(2575, 'DEU.24.17', 'La justice ne doit pas être refusée à l’étranger, à l’orphelin et à la veuve, et le vêtement de la veuve ne doit pas être pris en gage')
for (const n of [2576, 2577]) explain(n, ['DEU.24.17'], 'La mention particulière du vêtement de la veuve est interprétée comme signe de sa pauvreté et de son absence de défenseur.')
both(2578, '1TI.5.4', 'La veuve qui a des enfants ou petits-enfants doit leur apprendre la piété familiale et la reconnaissance')
both(2578, '1TI.5.5', 'La veuve véritable et délaissée espère en Dieu et persévère dans la prière')
both(2579, '1TI.5.5', 'La vraie veuve est dépourvue de mari, de postérité et de toute ressource')
for (const n of [2580, 2581]) explain(n, ['DEU.24.17', '1TI.5.5'], 'L’interdiction de saisir le vêtement et la désolation apostolique caractérisent la pauvreté de la vraie veuve.')
both(2582, '1TI.5.6', 'La veuve qui vit dans les délices est morte quoiqu’elle paraisse vivante')
explain(2583, ['1TI.5.5', '1TI.5.6'], 'Les veuves riches et continentes ne sont pas délaissées de toute autre ressource comme la veuve véritable.')

// Question XLIV — glanage des pauvres.
both(2584, 'DEU.24.19', 'La javelle oubliée dans le champ doit rester à l’étranger, à l’orphelin et à la veuve')
both(2584, 'DEU.24.20', 'Les olives laissées après la récolte appartiennent aux indigents')
both(2584, 'DEU.24.21', 'Les raisins laissés après la vendange appartiennent aux indigents')
for (const n of [2585, 2586, 2587]) explain(n, ['DEU.24.19', 'DEU.24.20', 'DEU.24.21'], 'La Loi oblige les propriétaires à la miséricorde et interdit aux non-indigents de ravir le bien réservé aux pauvres.')

// Question XLV — toute faute est une impiété.
both(2588, 'DEU.25.1', 'Les juges justifient le juste et condamnent l’impie dans un différend')
both(2589, 'DEU.25.2', 'Le coupable est battu devant les juges selon la mesure de sa faute')
both(2589, 'DEU.25.3', 'Le nombre de coups ne doit pas dépasser quarante afin de ne pas avilir le frère')
for (const n of [2590, 2591, 2592, 2593]) explain(n, ['DEU.25.1', 'DEU.25.2', 'DEU.25.3'], 'La qualification grecque d’impiété s’applique aussi aux fautes punies d’une flagellation modérée.')
nonBiblique(2593, 'traduction', 'les Septante qualifient d’« impiété » la faute passible de verges')

// Question XLVI — lévirat et les deux généalogies de Joseph.
both(2594, 'DEU.25.5', 'Le frère doit épouser la veuve de son frère mort sans enfant')
both(2594, 'DEU.25.6', 'Le premier-né est rattaché au nom du défunt afin que ce nom ne soit pas effacé d’Israël')
for (const n of [2595, 2597, 2598, 2599]) explain(n, ['DEU.25.5', 'DEU.25.6'], 'Le nom du défunt est interprété comme filiation légale, héritage et conservation de sa mémoire plutôt que comme nom propre transmis.')
both(2596, 'MAT.1.16', 'Matthieu dit que Jacob engendra Joseph')
both(2596, 'LUK.3.23', 'Luc présente Joseph comme fils d’Héli')
nonBiblique(2596, 'ouvrage patristique', 'renvoi au livre II, chapitre 3, de l’Accord des Évangélistes')
for (const id of ['RUT.4.5', 'RUT.4.10', 'RUT.4.17']) both(2600, id, 'Booz épouse Ruth afin de relever le nom du défunt, et le fils né d’elle est reconnu dans cette lignée')
explain(2600, ['DEU.25.5', 'DEU.25.6'], 'Le cas de Booz illustre l’extension du lévirat au plus proche parent.')
both(2601, 'MAT.1.16', 'La généalogie de Matthieu fournit un père de Joseph')
both(2601, 'LUK.3.23', 'La généalogie de Luc fournit un autre père de Joseph')
explain(2601, ['DEU.25.5', 'DEU.25.6'], 'Le lévirat offre une seconde solution à la double paternité de Joseph.')
both(2602, 'MAT.1.15', 'Matthieu fait de Matthan le grand-père de Joseph')
both(2602, 'LUK.3.24', 'Luc place Matthat, fils de Lévi, parmi les ascendants immédiats de Joseph')
for (const n of [2603, 2604]) explain(n, ['MAT.1.15', 'MAT.1.16', 'LUK.3.23', 'LUK.3.24'], 'Les noms et filiations immédiates diffèrent trop pour être ramenés à une simple faute de copie.')
both(2605, 'MAT.1.12', 'Matthieu rattache Zorobabel à Salathiel')
both(2605, 'MAT.1.13', 'La généalogie matthéenne poursuit la descendance de Zorobabel')
both(2605, 'LUK.3.27', 'Luc donne aussi Salathiel pour père de Zorobabel')
both(2606, 'MAT.1.6', 'Matthieu descend de David par Salomon')
both(2606, 'MAT.1.12', 'Matthieu fait descendre Salathiel de Jéchonias')
both(2606, 'LUK.3.27', 'Luc fait descendre Salathiel de Néri')
both(2606, 'LUK.3.31', 'Luc remonte à David par Nathan')
for (const n of [2607, 2608, 2609, 2610]) explain(n, ['MAT.1.6', 'MAT.1.12', 'MAT.1.16', 'LUK.3.23', 'LUK.3.27', 'LUK.3.31'], 'Les deux lignées divergentes jusqu’à David sont examinées comme filiation naturelle, légale ou adoptive de Joseph.')
nonBiblique(2609, 'renvoi interne', 'renvoi non localisé à une remarque antérieure sur l’absence des femmes à la place des hommes dans les généalogies')
nonBiblique(2610, 'ouvrage patristique', 'renvoi au livre II des Rétractations, chapitre 55, numéro 3')

// Questions XLVII et XLVIII.
both(2611, 'DEU.26.13', 'L’Israélite atteste avoir donné les biens consacrés selon le commandement')
both(2611, 'DEU.26.14', 'Il atteste n’avoir rien donné de ces biens à un mort')
explain(2612, ['DEU.26.14'], 'La clause sur le mort est interprétée comme interdiction des repas funèbres païens.')
both(2613, 'DEU.28.14', 'Israël ne doit s’écarter ni à droite ni à gauche pour suivre les dieux étrangers')
explain(2614, ['DEU.28.14', 'PRO.4.27'], 'Se détourner à droite signifie s’attribuer le bien qui appartient à la grâce de Dieu.')
both(2615, 'PRO.4.27', 'Les Proverbes interdisent de se détourner à droite ou à gauche et opposent les voies droites aux voies de perdition')
both(2616, 'PSA.1.6', 'Le Seigneur connaît la voie des justes')
both(2616, 'PRO.4.27', 'Dieu lui-même dirige la course et conduit en paix')
for (const n of [2617]) explain(n, ['PRO.4.27', 'PSA.1.6'], 'La voie droite est bonne mais son bien doit être attribué à la grâce qui dirige.')
for (const n of [2618, 2619, 2620, 2621, 2622, 2623]) explain(n, ['DEU.28.14'], 'La syntaxe de droite et gauche, puis son sens figuré, sont distingués du commandement spécial de fuir les faux dieux.')
for (const id of ['PSA.143.8', 'PSA.143.9', 'PSA.143.10', 'PSA.143.11', 'PSA.143.12', 'PSA.143.13', 'PSA.143.14', 'PSA.143.15']) both(2624, id, 'La plage imprimée Psaume 143,8-15 oppose la droite d’iniquité et les biens temporels au bonheur du peuple dont Dieu est le Seigneur')
explain(2625, ['PSA.143.8', 'PSA.143.15'], 'Le mensonge et le faux bonheur sont opposés au bonheur du peuple qui a le Seigneur pour Dieu.')
for (const n of [2626, 2627]) explain(n, ['DEU.28.14', 'PSA.143.8', 'PSA.143.15'], 'La vraie droite est la justice ; aucun dieu étranger ne doit être invoqué pour les biens ou contre les maux, temporels ou éternels.')

// Questions XLIX et L — décalage de numérotation au chapitre 29.
both(2628, 'DEU.28.69', 'La rubrique ancienne Deutéronome 29,1 correspond au verset local 28,69 : alliance au pays de Moab outre celle d’Horeb')
explain(2629, ['DEU.28.69'], 'L’alliance de Moab répète la première Loi sans constituer un second Ancien Testament.')
explain(2630, ['DEU.28.69'], 'Les emplois multiples du mot alliance ne créent pas autant de Testaments distincts.')
both(2630, 'GEN.17.4', 'Dieu parle de son alliance avec Abraham à propos de la circoncision')
both(2630, 'GEN.9.9', 'Dieu établit auparavant son alliance avec Noé et sa postérité')
both(2631, 'DEU.29.1', 'La rubrique ancienne 29,2 correspond au verset local 29,1 : actes de Dieu contre Pharaon vus par Israël')
both(2631, 'DEU.29.2', 'La rubrique ancienne 29,3 correspond au verset local 29,2 : grandes épreuves, signes et prodiges vus de leurs yeux')
both(2632, 'DEU.29.3', 'La rubrique ancienne 29,4 correspond au verset local 29,3 : Dieu n’a pas donné un cœur, des yeux et des oreilles capables de comprendre')
explain(2632, ['DEU.29.1', 'DEU.29.2'], 'La vision corporelle des signes est confrontée à l’absence de vision intérieure.')
for (const n of [2633, 2634, 2635]) explain(n, ['DEU.29.3'], 'Le cœur, les yeux et les oreilles désignent l’intelligence et l’obéissance, dons de Dieu dont la privation demeure imputable à la faute humaine.')

const SANS_LIEN = new Set()
const sha256 = (p) => createHash('sha256').update(readFileSync(p)).digest('hex')
if (sha256('charte/CHARTE_IA.md') !== CHARTE_HASH) throw new Error('Charte modifiée : relire avant toute exécution')
for (const [p, h] of PREUVES) if (sha256(p) !== h) throw new Error(`Preuve fac-similé modifiée : ${p}`)
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: segments, error } = await sb.from('segments').select('id,segment_numero,segment_texte,notes,ref_niv1,ref_niv2,ref_niv2_texte,liens_revus_le,liens_revus_par').eq('id_oeuvre', OEUVRE).eq('ref_niv1', REF_NIV1).in('ref_niv2', QUESTIONS).order('segment_numero')
if (error) throw error
if (segments.length !== NB_SEGMENTS || segments.some((s, i) => s.segment_numero !== PREMIER + i)) throw new Error('Préétat : bornes ou continuité invalides')
if ([...new Set(segments.map((s) => s.ref_niv2))].join('|') !== QUESTIONS.join('|')) throw new Error('Questions incomplètes ou désordonnées')
if (segments.some((s) => s.ref_niv1 !== REF_NIV1 || s.liens_revus_le || s.liens_revus_par)) throw new Error('Préétat structurel ou relecture invalide')
for (const [n, [avant]] of CORRECTIONS_TEXTE) if (!segments.find((s) => s.segment_numero === n)?.segment_texte.includes(avant)) throw new Error(`Précondition correction invalide au segment ${n}`)
const empreinte = createHash('sha256').update(JSON.stringify(segments.map((s) => [s.id, s.segment_numero, s.ref_niv1, s.ref_niv2, s.ref_niv2_texte, s.segment_texte, s.notes]))).digest('hex')
if (empreinte !== EMPREINTE_ATTENDUE) throw new Error(`Préétat modifié : ${empreinte}`)
const parNumero = new Map(segments.map((s) => [s.segment_numero, s]))
const classes = new Set([...LIENS, ...SANS_CIBLE].map(([n]) => n))
const nonClasses = segments.filter((s) => !classes.has(s.segment_numero) && !SANS_LIEN.has(s.segment_numero))
if (nonClasses.length) throw new Error(`Partition incomplète : ${nonClasses.map((s) => s.segment_numero)}`)
if (LIENS.some(([n, c, t, m]) => !parNumero.has(n) || !c || ![1, 2, 3, 4].includes(t) || !m.trim())) throw new Error('Manifeste biblique invalide')
if (SANS_CIBLE.some(([n, t, m]) => !parNumero.has(n) || t !== 4 || !m.startsWith('RÉFÉRENCE NON BIBLIQUE'))) throw new Error('Référence sans cible invalide')
const cles = LIENS.map(([n, c, t]) => `${n}|${c}|${t}`)
if (new Set(cles).size !== cles.length) throw new Error('Doublon interne')
const cibles = [...new Set(LIENS.map(([, c]) => c))]
const { data: temoins, error: et } = await sb.from('versets_lecture').select('id_verset,"TR0001","TR0003","TR0004"').in('id_verset', cibles)
if (et) throw et
const temoinsParId = new Map(temoins.map((t) => [t.id_verset, t]))
const invalides = cibles.filter((c) => { const t = temoinsParId.get(c); return !t || (!t.TR0001 && !t.TR0003 && !t.TR0004) })
if (invalides.length) throw new Error(`Cibles invalides : ${invalides.join(', ')}`)
const ids = segments.map((s) => s.id)
const [{ count: liensExistants, error: el }, { count: relusGlobaux, error: er }] = await Promise.all([
  sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  sb.from('segments').select('id', { count: 'exact', head: true }).eq('id_oeuvre', OEUVRE).not('liens_revus_le', 'is', null),
])
if (el || er) throw el || er
if (liensExistants) throw new Error(`${liensExistants} liens existent déjà dans le lot`)
const candidatsPath = 'scripts/heptateuque/segmentation-candidate/segments-candidate.json'
const sourceMapPath = 'scripts/heptateuque/segmentation-candidate/source-map.json'
const candidats = JSON.parse(readFileSync(candidatsPath, 'utf8'))
const sourceMap = JSON.parse(readFileSync(sourceMapPath, 'utf8'))
for (const [n, [avant, apres]] of CORRECTIONS_TEXTE) {
  const candidat = candidats.find((x) => x.segment_numero === n)
  if (!candidat?.segment_texte.includes(avant)) throw new Error(`Candidat non synchronisable au segment ${n}`)
  candidat.segment_texte = candidat.segment_texte.replace(avant, apres)
  const sources = sourceMap.filter((x) => x.first_segment_numero <= n && x.last_segment_numero >= n && x.source_clean?.includes(avant))
  if (sources.length !== 1) throw new Error(`Source-map non synchronisable au segment ${n} : ${sources.length}`)
  sources[0].source_clean = sources[0].source_clean.replace(avant, apres)
}
const TOTAL = LIENS.length + SANS_CIBLE.length
const types = LIENS.reduce((o, [, , t]) => { o[t] = (o[t] ?? 0) + 1; return o }, {})
for (const [, t] of SANS_CIBLE) types[t] = (types[t] ?? 0) + 1
const parQuestion = Object.fromEntries(QUESTIONS.map((q) => { const nums = new Set(segments.filter((s) => s.ref_niv2 === q).map((s) => s.segment_numero)); return [q, [...LIENS, ...SANS_CIBLE].filter(([n]) => nums.has(n)).length] }))
const pct = (n) => `${n} / 3262 = ${(100 * n / 3262).toFixed(2).replace('.', ',')} %`
console.log(JSON.stringify({ mode: WRITE ? 'écriture' : 'contrôle', lot: 'Deutéronome XLI-L', bornes: [PREMIER, DERNIER], segments: NB_SEGMENTS, corrections_ocr: CORRECTIONS_TEXTE.size, sic_confirmes: 0, liens_bibliques: LIENS.length, references_non_bibliques: SANS_CIBLE.length, total_liens: TOTAL, sans_lien: [...SANS_LIEN], cibles_distinctes: cibles.length, types, liens_par_question: parQuestion, empreinte, charte_hash: CHARTE_HASH, avancement_actuel: pct(relusGlobaux), avancement_potentiel_apres_ecriture: pct(relusGlobaux + NB_SEGMENTS) }, null, 2))
if (DETAIL) for (const [n, c, t, motif] of LIENS) { const temoin = temoinsParId.get(c); console.log({ n, c, t, motif, segment: parNumero.get(n).segment_texte, temoin: temoin.TR0003 || temoin.TR0001 || temoin.TR0004 }) }
if (!WRITE) process.exit(0)
const horodatage = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
const sauvegardePath = `scripts/heptateuque/audit-reprise/sauvegarde-deuteronome-q41-q50-${horodatage}.json`
mkdirSync('scripts/heptateuque/audit-reprise', { recursive: true })
writeFileSync(sauvegardePath, `${JSON.stringify({ oeuvre: OEUVRE, bornes: [PREMIER, DERNIER], empreinte, segments, liens_existants: [] }, null, 2)}\n`, 'utf8')
const quote = (v) => `'${String(v).replaceAll("'", "''")}'`
const valeurs = [...LIENS.map(([n, c, t, m]) => `(${parNumero.get(n).id}, ${quote(c)}, ${t}, 'vérifié', ${quote(m)}, 'lecture', false)`), ...SANS_CIBLE.map(([n, t, m]) => `(${parNumero.get(n).id}, null, ${t}, 'à constituer', ${quote(m)}, 'lecture', true)`)].join(',\n')
const idSql = ids.join(', ')
const correctionsSql = [...CORRECTIONS_TEXTE].map(([n, [avant, apres]]) => `update segments set segment_texte=replace(segment_texte,${quote(avant)},${quote(apres)}) where id=${parNumero.get(n).id} and segment_texte like ${quote(`%${avant}%`)}; get diagnostics n=row_count; if n<>1 then raise exception 'Correction ${n}: %',n; end if;`).join('\n')
const sql = `do $p$ declare n integer; begin
if exists(select 1 from liens_bibliques where segment_id in (${idSql})) then raise exception 'Liens présents'; end if;
if exists(select 1 from segments where id in (${idSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Déjà relu'; end if;
${correctionsSql}
insert into liens_bibliques(segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis) values ${valeurs}; get diagnostics n=row_count; if n<>${TOTAL} then raise exception 'Liens: %',n; end if;
update segments set liens_revus_le=now(),liens_revus_par=${quote(RELECTEUR)} where id in (${idSql}); get diagnostics n=row_count; if n<>${NB_SEGMENTS} then raise exception 'Segments: %',n; end if; end $p$;`
const { error: ew } = await sb.rpc('exec_sql', { sql }); if (ew) throw ew
const [{ count: liensApres, error: e1 }, { count: relusApres, error: e2 }, { data: audit, error: e3 }, { data: textes, error: e4 }] = await Promise.all([
  sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids), sb.from('segments').select('id', { count: 'exact', head: true }).in('id', ids).not('liens_revus_le', 'is', null), sb.from('liens_bibliques').select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id', ids), sb.from('segments').select('segment_numero,segment_texte').in('id', ids),
]); if (e1 || e2 || e3 || e4) throw e1 || e2 || e3 || e4
const post = new Map(textes.map((s) => [s.segment_numero, s.segment_texte])); const mauvaiseCorrection = [...CORRECTIONS_TEXTE].some(([n, [a, b]]) => post.get(n).includes(a) || !post.get(n).includes(b))
if (liensApres !== TOTAL || relusApres !== NB_SEGMENTS || mauvaiseCorrection || audit.some((l) => !l.motif || l.provenance !== 'lecture' || (l.canon_id ? (l.fiabilite !== 'vérifié' || l.arbitrage_requis) : (l.fiabilite !== 'à constituer' || !l.arbitrage_requis || l.type !== 4)))) throw new Error('Postcontrôle invalide')
const apres = audit.map((l) => `${l.segment_id}|${l.canon_id ?? 'sans-cible'}|${l.type}|${l.motif}`); if (new Set(apres).size !== apres.length) throw new Error('Doublon postétat')
writeFileSync(candidatsPath, `${JSON.stringify(candidats, null, 2)}\n`, 'utf8'); writeFileSync(sourceMapPath, `${JSON.stringify(sourceMap, null, 2)}\n`, 'utf8')
console.log(`✓ ${liensApres} liens ; ${relusApres} segments relus ; sauvegarde ${sauvegardePath}`)
