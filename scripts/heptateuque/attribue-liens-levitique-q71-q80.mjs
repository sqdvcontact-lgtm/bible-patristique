import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre troisième'
const PREMIER = 1888
const DERNIER = 1914
const NB_SEGMENTS = 27
const WRITE = process.argv.includes('--write')
const DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Lévitique Q. LXXI-LXXX'
const EMPREINTE_ATTENDUE = '9e73104c18c023164a33ffd97b66cfdb368aa3ab4774d33d6eb366100c78bfa8'
const QUESTIONS = [
  'Question LXXI', 'Question LXXII', 'Question LXXIII', 'Question LXXIV', 'Question LXXV',
  'Question LXXVI', 'Question LXXVII', 'Question LXXVIII', 'Question LXXIX', 'Question LXXX',
]
const PREUVES = [
  ['scripts/heptateuque/img/p506.jpg', 'e2338d51027dec719acbeee2f9a903b6211e4f3711cbfc62fc252565e33fb496', 'Le fac-similé, page imprimée 498, porte « peut-être » sans sic.'],
  ['scripts/heptateuque/img/p507.jpg', 'baa45f08decfe7d5633fc5fdf18ebdc4e493712994dbc42c36edf90c183cd26a', 'Le fac-similé, page imprimée 499, porte réellement « du quel » : le sic orthographique est conservé.'],
]
const CORRECTIONS_TEXTE = new Map([
  [1896, ['peut-être [<i>sic</i>]', 'peut-être']],
])

const LIENS = []
const add = (segmentNumero, canonId, type, motif) => LIENS.push([segmentNumero, canonId, type, motif])
const both = (segmentNumero, canonId, motif) => {
  add(segmentNumero, canonId, 1, `${motif} — citation ou référence intentionnelle.`)
  add(segmentNumero, canonId, 3, `${motif} — passage commenté ou mobilisé dans le raisonnement.`)
}
const explain = (segmentNumero, canonIds, motif) => {
  for (const canonId of canonIds) add(segmentNumero, canonId, 3, `${motif} (${canonId}).`)
}

// Question LXXI — incisions funéraires.
both(1888, 'LEV.19.28', 'L’interdiction de pratiquer des incisions dans la chair à l’occasion d’un mort est citée et expliquée comme coutume de deuil païenne')

// Question LXXII — les « princes » auxquels on se prostitue religieusement.
both(1889, 'LEV.20.5', 'La prostitution envers Moloch et les puissances honorées comme princes est analysée dans sa construction grammaticale')
explain(1890, ['LEV.20.5'], 'Les princes spirituels du Nouveau Testament éclairent le sens religieux de la fornication envers Moloch.')
both(1890, 'EPH.2.2', 'Le prince de la puissance de l’air est cité')
both(1890, 'JHN.12.31', 'Le prince de ce monde qui est jeté dehors est cité')
both(1890, 'JHN.14.30', 'Le prince de ce monde qui vient et ne trouve rien dans le Christ est cité')

// Question LXXIII — peine des deux adultères et sens universel du prochain.
both(1891, 'LEV.20.10', 'La peine de mort de l’homme et de la femme adultères est citée, avec attention au pluriel')
for (const n of [1892, 1893, 1894, 1895]) explain(n, ['LEV.20.10'], 'La répétition « femme d’un homme » puis « femme du prochain » est interprétée comme désignant toute femme mariée et tout homme comme prochain.')

// Question LXXIV — femme et bête mises à mort.
both(1896, 'LEV.20.16', 'La femme qui se prostitue à une bête et la bête elle-même sont condamnées à mort')
for (const n of [1897, 1898]) explain(n, ['LEV.20.16'], 'L’attribution de culpabilité à l’animal et la raison de sa mise à mort sont expliquées comme figure et effacement du souvenir du crime.')

// Question LXXV — union avec une sœur et « connaître » au sens charnel.
both(1899, 'LEV.20.17', 'L’union avec une sœur de père ou de mère, l’exposition de sa nudité et le port du péché sont cités et expliqués')
explain(1900, ['LEV.20.17'], 'Le port du péché est interprété comme le port du châtiment du péché.')
both(1900, 'GEN.4.1', 'Adam connaît Ève, sa femme, au sens de s’unir à elle')
both(1900, 'GEN.4.17', 'Caïn connaît sa femme, deuxième emploi intentionnel signalé par la note Genèse 4,1.17.25')
both(1900, 'GEN.4.25', 'Adam connaît encore sa femme, troisième emploi intentionnel signalé par la note Genèse 4,1.17.25')

// Question LXXVI — degrés prohibés puis séparation des animaux impurs.
both(1901, 'LEV.20.20', 'L’union avec une parente par affinité et la mort sans enfants sont citées')
explain(1902, ['LEV.20.20'], 'La portée de la parenté interdite est limitée aux degrés définis par la Loi.')
explain(1902, ['LEV.18.9'], 'La loi sur la sœur de père ou de mère fournit le degré exprimé auquel Augustin compare la sœur issue des deux mêmes parents ; la femme de l’oncle maternel est précisément signalée comme omise.')
explain(1903, ['LEV.18.14', 'LEV.20.20'], 'L’interdiction de la femme de l’oncle paternel et la formule « sans enfants » sont confrontées à l’existence d’enfants naturels.')
explain(1904, ['LEV.20.20'], 'Mourir sans enfants est proposé comme exclusion des enfants de la succession légitime.')
both(1905, 'LEV.20.25', 'L’interdiction de se rendre abominable par les animaux séparés comme impurs est citée')
explain(1906, ['LEV.20.25'], 'La distinction divine est comprise comme une impureté rituelle et mystérieuse plutôt que naturelle.')

// Question LXXVII — devins et consultants.
both(1907, 'LEV.20.27', 'La mise à mort par lapidation de celui qui évoque les esprits ou pratique la divination est citée et son sujet grammatical discuté')

// Question LXXVIII — mariage et sainteté des prêtres.
both(1908, 'LEV.21.7', 'L’interdiction faite aux prêtres d’épouser une femme déshonorée ou répudiée est citée')
explain(1909, ['LEV.21.7'], 'Le passage du pluriel des prêtres au singulier du prêtre saint est expliqué comme un tour scripturaire distributif.')
both(1910, 'LEV.21.8', 'Le prêtre sanctifié offre les oblations de Dieu et est saint parce que Dieu sanctifie les prêtres ; la note imprimée Lévitique 20,25 est fautive')
explain(1910, ['LEV.21.10', 'LEV.16.2'], 'Le passage ultérieur au grand-prêtre et son accès propre au sanctuaire sont distingués de la conclusion concernant tous les prêtres.')
explain(1911, ['LEV.21.8'], 'L’offrande des oblations n’est pas réservée au grand-prêtre, mais appartient aussi aux prêtres du second rang.')
explain(1912, ['LEV.21.7'], 'La règle matrimoniale initiale s’applique à tous les prêtres.')
both(1912, 'LEV.21.13', 'Le grand-prêtre doit prendre une vierge pour femme')
both(1912, 'LEV.21.14', 'Le grand-prêtre ne peut prendre ni veuve, ni femme répudiée ou déshonorée')

// Questions LXXIX-LXXX — onction, installation et vêtements du grand-prêtre.
both(1913, 'LEV.21.10', 'Le grand-prêtre au-dessus de ses frères reçoit sur la tête l’huile d’onction')
both(1914, 'LEV.21.10', 'Les mains du grand-prêtre sont consacrées afin qu’il revête les vêtements sacrés')
explain(1914, ['EXO.28.2', 'EXO.28.41'], 'Les vêtements sacrés décrits antérieurement et leur remise lors de la consécration sont rappelés comme référent précis.')

const NON_RESOLUS = []
const SANS_LIEN = new Set()

for (const [path, hash] of PREUVES) {
  const obtenu = createHash('sha256').update(readFileSync(path)).digest('hex')
  if (obtenu !== hash) throw new Error(`Preuve fac-similé modifiée : ${path} (${obtenu})`)
}
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: segments, error } = await sb.from('segments').select('id,segment_numero,segment_texte,notes,ref_niv1,ref_niv2,ref_niv2_texte,liens_revus_le,liens_revus_par').eq('id_oeuvre', OEUVRE).eq('ref_niv1', REF_NIV1).in('ref_niv2', QUESTIONS).order('segment_numero')
if (error) throw error
if (segments.length !== NB_SEGMENTS || segments.some((segment, index) => segment.segment_numero !== PREMIER + index)) throw new Error('Préétat : bornes ou continuité invalides')
if ([...new Set(segments.map((segment) => segment.ref_niv2))].join('|') !== QUESTIONS.join('|')) throw new Error('Questions incomplètes ou désordonnées')
if (segments.some((segment) => segment.ref_niv1 !== REF_NIV1 || segment.liens_revus_le || segment.liens_revus_par)) throw new Error('Préétat structurel ou relecture invalide')
for (const [segmentNumero, [avant]] of CORRECTIONS_TEXTE) {
  const segment = segments.find((item) => item.segment_numero === segmentNumero)
  if (!segment?.segment_texte.includes(avant)) throw new Error(`Précondition de correction invalide au segment ${segmentNumero}`)
}
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

const candidatsPath = 'scripts/heptateuque/segmentation-candidate/segments-candidate.json'
const sourceMapPath = 'scripts/heptateuque/segmentation-candidate/source-map.json'
const candidats = JSON.parse(readFileSync(candidatsPath, 'utf8'))
const sourceMap = JSON.parse(readFileSync(sourceMapPath, 'utf8'))
for (const [segmentNumero, [avant, apres]] of CORRECTIONS_TEXTE) {
  const candidat = candidats.find((item) => item.segment_numero === segmentNumero)
  if (!candidat?.segment_texte.includes(avant)) throw new Error(`Candidat non synchronisable au segment ${segmentNumero}`)
  candidat.segment_texte = candidat.segment_texte.replace(avant, apres)
  const sources = sourceMap.filter((item) => item.first_segment_numero <= segmentNumero && item.last_segment_numero >= segmentNumero && item.source_clean?.includes(avant))
  if (sources.length !== 1) throw new Error(`Source-map non synchronisable au segment ${segmentNumero} : ${sources.length}`)
  sources[0].source_clean = sources[0].source_clean.replace(avant, apres)
}

const TOTAL = LIENS.length + NON_RESOLUS.length
const types = LIENS.reduce((compte, [, , type]) => { compte[type] = (compte[type] ?? 0) + 1; return compte }, {})
for (const [, type] of NON_RESOLUS) types[type] = (types[type] ?? 0) + 1
const liensParQuestion = Object.fromEntries(QUESTIONS.map((question) => {
  const numeros = new Set(segments.filter((segment) => segment.ref_niv2 === question).map((segment) => segment.segment_numero))
  return [question, [...LIENS, ...NON_RESOLUS].filter(([segmentNumero]) => numeros.has(segmentNumero)).length]
}))
const pct = (n) => `${n} / 3262 = ${(100 * n / 3262).toFixed(2).replace('.', ',')} %`
console.log(JSON.stringify({ mode: WRITE ? 'écriture' : 'contrôle', lot: 'Lévitique LXXI-LXXX', ref_niv1: REF_NIV1, bornes: [PREMIER, DERNIER], segments: segments.length, corrections_ocr: CORRECTIONS_TEXTE.size, preuves_fac_simile: PREUVES.map(([path, , constat]) => ({ path, constat })), liens_bibliques: LIENS.length, sans_cible_a_constituer: NON_RESOLUS.length, total_liens: TOTAL, sans_lien: [...SANS_LIEN], cibles_distinctes: cibles.length, types, liens_par_question: liensParQuestion, empreinte, avancement_actuel: pct(relusGlobaux), avancement_potentiel_apres_ecriture: pct(relusGlobaux + NB_SEGMENTS) }, null, 2))
if (DETAIL) for (const [segmentNumero, canonId, type, motif] of LIENS) { const temoin = temoinsParId.get(canonId); console.log({ segmentNumero, canonId, type, motif, segment: parNumero.get(segmentNumero).segment_texte, temoin: temoin.TR0003 || temoin.TR0001 || temoin.TR0004 }) }
if (!WRITE) process.exit(0)

const horodatage = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
const sauvegardePath = `scripts/heptateuque/audit-reprise/sauvegarde-levitique-q71-q80-${horodatage}.json`
mkdirSync('scripts/heptateuque/audit-reprise', { recursive: true })
writeFileSync(sauvegardePath, `${JSON.stringify({ oeuvre: OEUVRE, bornes: [PREMIER, DERNIER], empreinte, segments, liens_existants: [] }, null, 2)}\n`, 'utf8')
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`
const valeurs = [
  ...LIENS.map(([segmentNumero, canonId, type, motif]) => `(${parNumero.get(segmentNumero).id}, ${quote(canonId)}, ${type}, 'vérifié', ${quote(motif)}, 'lecture', false)`),
  ...NON_RESOLUS.map(([segmentNumero, type, motif]) => `(${parNumero.get(segmentNumero).id}, null, ${type}, 'à constituer', ${quote(motif)}, 'lecture', true)`),
].join(',\n    ')
const idSql = ids.join(', ')
const correctionsSql = [...CORRECTIONS_TEXTE].map(([segmentNumero, [avant, apres]]) => {
  const id = parNumero.get(segmentNumero).id
  return `update segments set segment_texte = replace(segment_texte, ${quote(avant)}, ${quote(apres)}) where id = ${id} and segment_texte like ${quote(`%${avant}%`)};
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Correction OCR segment ${segmentNumero}: %/1', n; end if;`
}).join('\n  ')
const sql = `
do $p$
declare
  n integer;
begin
  if exists (select 1 from liens_bibliques where segment_id in (${idSql})) then
    raise exception 'Liens présents';
  end if;
  if exists (select 1 from segments where id in (${idSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then
    raise exception 'Déjà relu';
  end if;
  ${correctionsSql}
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
const [{ count: liensApres, error: e1 }, { count: relusApres, error: e2 }, { data: audit, error: e3 }, { data: textesApres, error: e4 }] = await Promise.all([
  sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  sb.from('segments').select('id', { count: 'exact', head: true }).in('id', ids).not('liens_revus_le', 'is', null),
  sb.from('liens_bibliques').select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id', ids),
  sb.from('segments').select('segment_numero,segment_texte').in('id', ids),
])
if (e1 || e2 || e3 || e4) throw e1 || e2 || e3 || e4
const textesParNumero = new Map(textesApres.map((segment) => [segment.segment_numero, segment.segment_texte]))
const correctionInvalide = [...CORRECTIONS_TEXTE].some(([segmentNumero, [avant, apres]]) => textesParNumero.get(segmentNumero).includes(avant) || !textesParNumero.get(segmentNumero).includes(apres))
if (liensApres !== TOTAL || relusApres !== NB_SEGMENTS || correctionInvalide || audit.some((lien) => !lien.motif || lien.provenance !== 'lecture' || (lien.canon_id ? (lien.fiabilite !== 'vérifié' || lien.arbitrage_requis) : (lien.fiabilite !== 'à constituer' || !lien.arbitrage_requis || lien.type !== 4 || !lien.motif.startsWith('RÉFÉRENCE NON BIBLIQUE'))))) throw new Error('Postcontrôle invalide')
const clesApres = audit.map((lien) => `${lien.segment_id}|${lien.canon_id ?? 'sans-cible'}|${lien.type}|${lien.motif}`)
if (new Set(clesApres).size !== clesApres.length) throw new Error('Doublon dans le postétat')
writeFileSync(candidatsPath, `${JSON.stringify(candidats, null, 2)}\n`, 'utf8')
writeFileSync(sourceMapPath, `${JSON.stringify(sourceMap, null, 2)}\n`, 'utf8')
console.log(`✓ ${liensApres} liens ; ${relusApres} segments relus ; sauvegarde ${sauvegardePath}`)
