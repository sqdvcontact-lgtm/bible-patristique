import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre quatrième'
const PREMIER = 2164
const DERNIER = 2239
const NB_SEGMENTS = 76
const WRITE = process.argv.includes('--write')
const DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Nombres Q. XXXI-XL'
const EMPREINTE_ATTENDUE = '5984c981bd916909d2fa15ef0a9ac0d69545e6c3d3e32edcca56ff47dee1083c'
const CHARTE_HASH = '47893c044ebab26e78149548c129fb9de3b72dde1e37c3371b60a1786240c198'
const QUESTIONS = ['Question XXXI', 'Question XXXII', 'Question XXXIII', 'Question XXXIV', 'Question XXXV', 'Question XXXVI', 'Question XXXVII', 'Question XXXVIII', 'Question XXXIX', 'Question XL']
const PREUVES = [
  ['scripts/heptateuque/img/p524.jpg', '65cc74065bd8dfee12849dc64d5dd795d420686672f01583406cac1745f60692', 'Page imprimée 516, début du lot et note ancienne Lévitique 6,25-26.'],
  ['scripts/heptateuque/img/p525.jpg', 'c0c5eb19d53fc30c4dd949e1b3275a593b9c9b709016c77046fcf4bdb331c662', 'Page imprimée 517, suite de la génisse rousse.'],
  ['scripts/heptateuque/img/p526.jpg', '9330b36e90dfe06d7f7b65992b0b75ffe830232f7ff3c32cf7244648a0636361', 'Page imprimée 518, cendres et purification.'],
  ['scripts/heptateuque/img/p527.jpg', '6433c1d018a5e8860f8faba092c6c228d1a7854b56ad741567e803d1c848ac68', 'La page imprimée 519 porte bien « quand au temps de la vie » : le [sic] du segment 2216 est justifié.'],
  ['scripts/heptateuque/img/p528.jpg', 'f5b338b5b104d5c74f565f80eaba5075c234f02d888a157f833cfe57688264f3', 'Page imprimée 520, fin de la génisse rousse et questions suivantes.'],
  ['scripts/heptateuque/img/p529.jpg', '5df79c8d8686ac623aa3f38c2a078dffe1863c24d6e42fe4440d656de99731af', 'Page imprimée 521, fin du lot et raccord avec la Question XLI.'],
]
const CORRECTIONS_TEXTE = new Map()

const LIENS = []
const add = (segmentNumero, canonId, type, motif) => LIENS.push([segmentNumero, canonId, type, motif])
const both = (segmentNumero, canonId, motif) => {
  add(segmentNumero, canonId, 1, `${motif} — citation ou référence intentionnelle.`)
  add(segmentNumero, canonId, 3, `${motif} — passage commenté ou mobilisé dans le raisonnement.`)
}
const explain = (segmentNumero, canonIds, motif) => { for (const canonId of canonIds) add(segmentNumero, canonId, 3, `${motif} (${canonId}).`) }
const NON_RESOLUS = []
const nonBiblique = (segmentNumero, motif) => NON_RESOLUS.push([segmentNumero, 4, `RÉFÉRENCE NON BIBLIQUE (traduction) : ${motif} ; cible de corpus à constituer.`])

// Question XXXI — les péchés du sanctuaire et du sacerdoce.
both(2164, 'NUM.18.1', 'Aaron et ses fils porteront les péchés du sanctuaire et de leur sacerdoce')
for (const n of [2165, 2166]) explain(n, ['NUM.18.1'], 'Le péché du sacerdoce est expliqué par les sacrifices que les prêtres offrent pour les péchés du peuple.')
both(2166, 'LEV.6.18', 'La note imprimée Lévitique 6,25 suit l’ancienne numérotation et correspond à la loi locale du sacrifice pour le péché')
both(2166, 'LEV.6.19', 'La note imprimée Lévitique 6,26 suit l’ancienne numérotation et correspond au prêtre qui mange la victime pour le péché')

// Question XXXII — les prémices de l’huile, du vin et du blé.
both(2167, 'NUM.18.12', 'Le meilleur de l’huile, du vin nouveau et du blé est donné à Aaron comme prémices')
for (const n of [2168, 2169]) explain(n, ['NUM.18.12'], 'Les termes grecs distinguant la première récolte et les prémices offertes sont analysés.')
nonBiblique(2168, 'plusieurs interprètes traduisent le grec protogennêmata par « prémices »')

// Question XXXIII — la génisse rousse et sa lecture christologique et ecclésiale.
explain(2170, ['NUM.19.1', 'NUM.19.22'], 'La question annonce l’explication de l’ensemble de la loi de la génisse rousse.')
both(2171, 'NUM.19.1', 'Le Seigneur introduit la loi de la génisse rousse adressée à Moïse et Aaron')
for (const n of [2172, 2173, 2174, 2175, 2176, 2177, 2178, 2179, 2180]) explain(n, ['NUM.19.1'], 'La formule introductive et sa traduction grecque sont examinées avant le contenu du précepte.')
nonBiblique(2174, 'plusieurs traducteurs latins rendent la formule grecque introductive par « constitutio legis »')
both(2181, 'NUM.19.2', 'Israël doit amener une génisse rousse sans défaut et n’ayant pas porté le joug')
for (const n of [2182, 2183, 2184, 2185, 2186]) explain(n, ['NUM.19.2'], 'Les qualités de la génisse sont interprétées comme figures de la chair du Christ sans péché.')
both(2183, 'ROM.8.3', 'Dieu condamne le péché dans une chair semblable à celle du péché')
explain(2187, ['NUM.19.2'], 'L’absence de joug figure la puissance volontaire du Christ.')
both(2187, 'PSA.115.16', 'Le serviteur confesse être le fils de la servante du Seigneur')
both(2187, 'PSA.115.17', 'Le serviteur promet le sacrifice de louange après la rupture de ses liens')
both(2187, 'JHN.10.18', 'Le Christ donne volontairement sa vie et a le pouvoir de la reprendre')
both(2188, 'NUM.19.3', 'Éléazar conduit la génisse hors du camp pour qu’elle y soit immolée')
explain(2189, ['NUM.19.3'], 'L’immolation hors du camp est rapprochée de la Passion hors de la ville.')
add(2189, 'HEB.13.12', 2, 'La Passion du Christ hors de la porte éclaire typologiquement la génisse immolée hors du camp.')
both(2190, 'NUM.19.4', 'Éléazar asperge sept fois le sang de la victime devant la tente')
both(2190, 'ROM.3.25', 'Le Christ est exposé comme victime propitiatoire par la foi en son sang')
both(2190, 'EPH.1.7', 'La rédemption et la rémission des péchés sont acquises par le sang du Christ')
explain(2191, ['NUM.19.4'], 'Le nombre sept de l’aspersion est rapporté à la perfection de la purification spirituelle.')
for (const n of [2192, 2193, 2194]) explain(n, ['NUM.19.5'], 'La génisse entière, peau, chair, sang et excréments, est brûlée sous les yeux du prêtre.')
add(2193, '1PE.2.9', 2, 'Le « sacerdoce royal » explicite la participation de l’Église au sacrifice figuré.')
explain(2195, ['NUM.19.6'], 'Le bois de cèdre, l’hysope et l’écarlate sont jetés dans le feu de la génisse.')
explain(2196, ['NUM.19.6'], 'Le cèdre et l’hysope figurent la hauteur et l’abaissement du Christ.')
both(2196, 'COL.3.3', 'La vie des fidèles est cachée avec le Christ en Dieu')
both(2197, 'NUM.19.7', 'Le prêtre lave ses vêtements et son corps puis demeure impur jusqu’au soir')
both(2198, 'NUM.19.8', 'Celui qui a brûlé la génisse se lave et reste impur jusqu’au soir')
both(2199, 'NUM.19.9', 'Un homme pur recueille les cendres et les dépose hors du camp pour l’eau de purification')
explain(2200, ['NUM.19.9'], 'L’homme pur qui recueille les cendres est interprété comme une figure du Christ ressuscité et de ses reliques de paix.')
both(2200, 'PSA.36.37', 'La note imprimée renvoie à l’homme pacifique auquel restent des reliques ou une postérité')
for (const n of [2201, 2202, 2203]) explain(n, ['NUM.19.9'], 'Les cendres conservées pour la purification figurent la mémoire et le fruit durable de la Passion.')
both(2204, 'NUM.19.10', 'Celui qui recueille les cendres lave ses vêtements et la prescription vaut perpétuellement pour Israël et l’étranger')
both(2205, 'ROM.3.23', 'Tous ont péché et sont privés de la gloire de Dieu')
both(2205, 'ROM.3.24', 'Tous sont justifiés gratuitement par la grâce et la rédemption du Christ')
for (const v of ['ACT.10.44', 'ACT.10.45', 'ACT.10.46', 'ACT.10.47', 'ACT.10.48']) both(2206, v, 'L’Esprit Saint tombe sur les païens de Corneille, qui reçoivent ensuite le baptême')
explain(2207, ['NUM.19.10'], 'La loi perpétuelle commune à l’Israélite et à l’étranger préfigure l’unité des peuples purifiés.')
for (const v of ['ROM.11.16', 'ROM.11.17', 'ROM.11.18', 'ROM.11.19', 'ROM.11.20', 'ROM.11.21', 'ROM.11.22', 'ROM.11.23', 'ROM.11.24']) both(2208, v, 'Les branches sauvages greffées sur l’olivier franc illustrent l’admission des nations au peuple de Dieu')
for (const n of [2209, 2210]) explain(n, ['NUM.19.10'], 'La même purification est imposée à Israël et aux prosélytes, figure des deux peuples de l’Église.')
both(2211, 'NUM.19.11', 'Qui touche un cadavre humain demeure impur pendant sept jours')
both(2211, 'NUM.19.12', 'L’impur se purifie avec l’eau les troisième et septième jours')
explain(2212, ['NUM.19.11', 'NUM.19.12'], 'Le contact du mort et les deux jours de purification reçoivent une interprétation spirituelle.')
explain(2213, ['NUM.19.12', 'NUM.19.13'], 'Le troisième et le septième jour sont interprétés par la Résurrection et le repos eschatologique.')
both(2213, 'AMO.1.3', 'Le prophète emploie la formule numérique « pour trois crimes, même pour quatre »')
both(2214, 'NUM.19.13', 'Celui qui touche un mort sans se purifier souille la demeure du Seigneur et est retranché')
for (const n of [2215, 2216, 2217, 2218]) explain(n, ['NUM.19.13'], 'La souillure causée par le mort est rapportée au péché qui éteint la vie spirituelle.')
both(2217, '1TH.5.19', 'L’Apôtre commande de ne pas éteindre l’Esprit')
both(2219, 'NUM.19.17', 'On met de la cendre de la victime brûlée dans un vase et l’on verse dessus de l’eau vive')
both(2219, 'NUM.19.18', 'Un homme pur trempe l’hysope dans l’eau et asperge la tente et les personnes impures')
both(2220, 'NUM.19.19', 'L’homme pur asperge l’impur aux troisième et septième jours, puis celui-ci se lave')
for (const n of [2221, 2222, 2223]) explain(n, ['NUM.19.19'], 'L’aspersion, le lavage et le nombre des jours sont lus comme figure de la purification chrétienne.')
both(2223, 'ACT.15.9', 'Dieu purifie par la foi les cœurs des nations comme ceux d’Israël')
both(2224, 'NUM.19.21', 'L’aspersion est une loi perpétuelle et celui qui touche l’eau demeure impur jusqu’au soir')
both(2225, 'NUM.19.22', 'Tout ce que touche l’impur devient impur, et qui le touche demeure impur jusqu’au soir')

// Questions XXXIV–XL.
both(2226, 'NUM.19.16', 'Le contact d’un homme tué, d’un mort, d’un ossement ou d’un tombeau rend impur sept jours')
explain(2227, ['NUM.19.16'], 'La conjonction grecque est comprise distributivement entre les quatre causes de souillure.')
both(2228, 'NUM.20.11', 'Moïse frappe deux fois le rocher et il en sort une eau abondante')
both(2228, '1CO.10.4', 'Le rocher spirituel qui suivait Israël était le Christ')
for (const n of [2229, 2230]) explain(n, ['NUM.20.11', '1CO.10.4'], 'La verge et les deux coups portés au rocher sont interprétés par la croix et la Passion du Christ-rocher.')
both(2231, 'NUM.20.13', 'Aux eaux de contradiction, Dieu est sanctifié parmi les enfants d’Israël')
explain(2232, ['NUM.20.13'], 'La sanctification de Dieu au lieu de la sanctification du peuple est expliquée par la manifestation de sa sainteté.')
explain(2233, ['NUM.20.13'], 'La contradiction aux eaux devient signe de discernement et de manifestation des pensées.')
both(2233, 'LUK.2.34', 'Le Christ est établi comme signe auquel on contredira')
both(2234, 'NUM.20.17', 'Israël promet de ne pas boire l’eau des puits d’Édom')
both(2234, 'NUM.20.19', 'Israël propose ensuite de payer l’eau bue par les hommes et les troupeaux')
both(2235, 'NUM.20.17', 'La route royale sera suivie sans détour à droite ni à gauche')
both(2236, 'NUM.20.24', 'Aaron meurt parce qu’il a contredit l’ordre divin aux eaux de contradiction')
explain(2236, ['NUM.20.13'], 'Le nom des eaux de contradiction rattache explicitement la faute d’Aaron à l’épisode antérieur.')
both(2237, 'NUM.21.2', 'Israël voue les villes des Cananéens à l’anathème si Dieu livre le peuple ennemi')
explain(2238, ['NUM.21.2'], 'L’anathème des villes est distingué de l’anathème doctrinal prononcé par l’Apôtre.')
both(2238, 'GAL.1.8', 'Quiconque annonce un autre Évangile doit être anathème')
explain(2239, ['NUM.21.2'], 'L’étymologie grecque du mot anathème est appliquée aux villes vouées à Dieu.')

const SANS_LIEN = new Set()
const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')
if (sha256('charte/CHARTE_IA.md') !== CHARTE_HASH) throw new Error('Charte modifiée : relire avant toute exécution')
for (const [path, hash] of PREUVES) if (sha256(path) !== hash) throw new Error(`Preuve fac-similé modifiée : ${path}`)
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
console.log(JSON.stringify({ mode: WRITE ? 'écriture' : 'contrôle', lot: 'Nombres XXXI-XL', ref_niv1: REF_NIV1, bornes: [PREMIER, DERNIER], segments: segments.length, corrections_ocr: CORRECTIONS_TEXTE.size, sic_confirmes: [2216], preuves_fac_simile: PREUVES.map(([path, , constat]) => ({ path, constat })), liens_bibliques: LIENS.length, sans_cible_a_constituer: NON_RESOLUS.length, total_liens: TOTAL, sans_lien: [...SANS_LIEN], cibles_distinctes: cibles.length, types, liens_par_question: liensParQuestion, empreinte, charte_hash: CHARTE_HASH, avancement_actuel: pct(relusGlobaux), avancement_potentiel_apres_ecriture: pct(relusGlobaux + NB_SEGMENTS) }, null, 2))
if (DETAIL) for (const [segmentNumero, canonId, type, motif] of LIENS) { const temoin = temoinsParId.get(canonId); console.log({ segmentNumero, canonId, type, motif, segment: parNumero.get(segmentNumero).segment_texte, temoin: temoin.TR0003 || temoin.TR0001 || temoin.TR0004 }) }
if (!WRITE) process.exit(0)

const horodatage = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
const sauvegardePath = `scripts/heptateuque/audit-reprise/sauvegarde-nombres-q31-q40-${horodatage}.json`
mkdirSync('scripts/heptateuque/audit-reprise', { recursive: true })
writeFileSync(sauvegardePath, `${JSON.stringify({ oeuvre: OEUVRE, bornes: [PREMIER, DERNIER], empreinte, segments, liens_existants: [] }, null, 2)}\n`, 'utf8')
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`
const valeurs = [
  ...LIENS.map(([segmentNumero, canonId, type, motif]) => `(${parNumero.get(segmentNumero).id}, ${quote(canonId)}, ${type}, 'vérifié', ${quote(motif)}, 'lecture', false)`),
  ...NON_RESOLUS.map(([segmentNumero, type, motif]) => `(${parNumero.get(segmentNumero).id}, null, ${type}, 'à constituer', ${quote(motif)}, 'lecture', true)`),
].join(',\n    ')
const idSql = ids.join(', ')
const sql = `
do $p$
declare n integer;
begin
  if exists (select 1 from liens_bibliques where segment_id in (${idSql})) then raise exception 'Liens présents'; end if;
  if exists (select 1 from segments where id in (${idSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Déjà relu'; end if;
  insert into liens_bibliques (segment_id, canon_id, type, fiabilite, motif, provenance, arbitrage_requis) values
    ${valeurs};
  get diagnostics n = row_count;
  if n <> ${TOTAL} then raise exception 'Liens insérés : %', n; end if;
  update segments set liens_revus_le = now(), liens_revus_par = ${quote(RELECTEUR)} where id in (${idSql});
  get diagnostics n = row_count;
  if n <> ${NB_SEGMENTS} then raise exception 'Segments relus : %', n; end if;
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
if (liensApres !== TOTAL || relusApres !== NB_SEGMENTS || audit.some((lien) => !lien.motif || lien.provenance !== 'lecture' || (lien.canon_id ? (lien.fiabilite !== 'vérifié' || lien.arbitrage_requis) : (lien.fiabilite !== 'à constituer' || !lien.arbitrage_requis || lien.type !== 4)))) throw new Error('Postcontrôle invalide')
const clesApres = audit.map((lien) => `${lien.segment_id}|${lien.canon_id ?? 'sans-cible'}|${lien.type}|${lien.motif}`)
if (new Set(clesApres).size !== clesApres.length) throw new Error('Doublon dans le postétat')
console.log(`✓ ${liensApres} liens ; ${relusApres} segments relus ; sauvegarde ${sauvegardePath}`)
