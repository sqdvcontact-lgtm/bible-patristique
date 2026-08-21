import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const WORK_ID = 'A0010O0001'
const BOOK = 'Livre second'
const OUT = 'tmp/confessions-links-2026-07-30/book-02'
const WRITE = process.argv.includes('--write')
const VERIFIED = 'vérifié'
mkdirSync(OUT, { recursive: true })

// [segment_numero, canon_id, type, motif]
// Chaque entrée résulte d'une lecture conjointe du français, du latin CSEL local
// et du verset cible dans versets_lecture. L'index CCEL n'a servi que de repérage.
const L = [
  [966, 'GEN.3.18', 4, 'Les épines de la concupiscence, absentes du paradis, font écho aux épines produites par la terre après la chute.'],
  [970, '1CO.7.28', 1, 'Première citation expressément attribuée à l’Apôtre : les personnes mariées auront des afflictions dans la chair.'],
  [971, '1CO.7.1', 1, 'Suite de la citation apostolique : il est bon à l’homme de ne pas toucher de femme.'],
  [972, '1CO.7.32', 1, 'Citation annoncée par « un peu après » : l’homme sans femme se soucie des choses de Dieu et de lui plaire.'],
  [973, '1CO.7.33', 1, 'Suite immédiate de la citation : l’homme marié se soucie du monde et de plaire à sa femme.'],
  [975, 'MAT.19.12', 2, 'La privation volontaire des plaisirs charnels pour le royaume des Cieux reprend la parole sur ceux qui se rendent eunuques pour ce royaume.'],
  [985, 'PSA.93.20', 1, 'Citation annoncée du prophète : Dieu façonne une peine dans le précepte.'],
  [986, 'DEU.32.39', 2, 'Reprise intégrée de la parole divine qui blesse et guérit.'],
  [987, 'DEU.32.39', 2, 'Reformulation paradoxale de la parole divine qui fait mourir et fait vivre.'],
  [1007, 'PSA.129.1', 2, 'L’abîme de misère depuis lequel le cri monte vers Dieu reprend le début du De profundis.'],
  [1017, '1CO.3.9', 4, 'Le cœur décrit comme le champ dont Dieu est le maître évoque l’image paulinienne du champ cultivé par Dieu.'],
  [1022, 'GEN.3.18', 4, 'Les épines et les ronces des désirs impurs prolongent l’image des épines produites après la chute.'],
  [1029, 'ROM.1.25', 2, 'L’oubli du Créateur au profit de l’amour de la créature reprend l’opposition paulinienne entre Créateur et créature.'],
  [1032, '1CO.3.16', 2, 'Le cœur devenu temple où demeure l’Esprit reprend directement l’image paulinienne du temple habité par l’Esprit de Dieu.'],
  [1052, 'PSA.115.16', 2, 'Augustin se nomme serviteur de Dieu et fils de sa servante dans les termes du psaume.'],
  [1068, 'JER.51.6', 2, 'La mère sortie du milieu de Babylone reprend l’injonction prophétique de fuir du milieu de Babylone.'],
  [1092, 'PSA.72.7', 1, 'La formule expressément présentée comme terme sacré de l’Écriture reprend l’iniquité surgie comme de la graisse.'],
  [1093, 'EXO.20.15', 3, 'Le précepte du Décalogue interdisant le vol est appliqué au larcin d’Augustin et rapporté à la loi gravée sur pierre.'],
  [1094, 'ROM.2.15', 2, 'La loi plus ancienne écrite au fond des cœurs reprend la formulation paulinienne de la loi écrite dans les cœurs.'],
  [1237, 'PSA.72.27', 2, 'L’âme adultère qui se sépare de Dieu reprend ceux qui se prostituent en s’éloignant de lui.'],
  [1257, 'PSA.115.12', 2, 'Sous la traduction libre sur la reconnaissance due à la miséricorde, le latin reprend « Que rendrai-je au Seigneur ? ».'],
  [1283, 'ROM.6.21', 2, 'La question sur l’avantage tiré des actions dont Augustin rougit reprend la question paulinienne sur leur fruit.'],
  [1306, 'PSA.18.13', 1, 'Citation annoncée comme oracle de l’Écriture : qui peut comprendre les péchés ?'],
  [1338, 'MAT.25.21', 2, 'Entrer en Dieu est formulé par la reprise d’entrer dans la joie de son Seigneur.'],
]

// [segment_numero, type, motif]
const UNRESOLVED = [
  [1009, 2, 'La formule latine « vita ex fide est » condense une parole transmise en Ha 2,4 et reprise en Rm 1,17, Ga 3,11 et He 10,38 ; le contexte ne permet pas de choisir un locus.'],
  [1037, 2, 'La formule latine « tergum et non faciem » est commune à Jr 2,27 et Jr 32,33 ; aucun indice local ne permet de choisir entre les deux emplois.'],
]

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(line => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(match => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const must = async (query, label) => {
  const { data, error } = await query
  if (error) throw new Error(`${label}: ${error.message}`)
  return data ?? []
}
const segments = await must(db.from('segments')
  .select('id,segment_numero,segment_texte,nature,ref_niv1,ref_niv2,paragraphe,rang,liens_revus_le,liens_revus_par')
  .eq('id_oeuvre', WORK_ID).eq('ref_niv1', BOOK).in('nature', ['texte', 'citation']).order('segment_numero'), 'segments')
if (segments.length !== 421 || segments[0]?.segment_numero !== 922 || segments.at(-1)?.segment_numero !== 1342) {
  throw new Error(`Précondition segments rompue : ${segments.length}, ${segments[0]?.segment_numero}-${segments.at(-1)?.segment_numero}`)
}
const byNumber = new Map(segments.map(row => [row.segment_numero, row]))
const existing = []
for (let offset = 0; offset < segments.length; offset += 250) {
  existing.push(...await must(db.from('liens_bibliques').select('*')
    .in('segment_id', segments.slice(offset, offset + 250).map(row => row.id)), `liens:${offset}`))
}
if (existing.length) throw new Error(`Précondition rompue : ${existing.length} liens existent déjà dans le livre II`)
const targets = [...new Set(L.map(row => row[1]))]
const witnesses = []
for (let offset = 0; offset < targets.length; offset += 250) {
  witnesses.push(...await must(db.from('versets_lecture').select('id_verset')
    .in('id_verset', targets.slice(offset, offset + 250)), `cibles:${offset}`))
}
const found = new Set(witnesses.map(row => row.id_verset))
const missing = targets.filter(target => !found.has(target))
if (missing.length) throw new Error(`Cibles absentes : ${missing.join(', ')}`)

const rows = [
  ...L.map(([number, canon_id, type, motif]) => ({
    segment_id: byNumber.get(number)?.id, canon_id, verset_v2_id: null, livre: null, chapitre: null,
    type, fiabilite: VERIFIED, motif, provenance: 'lecture', arbitrage_requis: false,
  })),
  ...UNRESOLVED.map(([number, type, motif]) => ({
    segment_id: byNumber.get(number)?.id, canon_id: null, verset_v2_id: null, livre: null, chapitre: null,
    type, fiabilite: 'à constituer', motif, provenance: 'lecture', arbitrage_requis: true,
  })),
]
if (rows.some(row => !row.segment_id)) throw new Error('Un segment visé est absent')
const key = row => `${row.segment_id}|${row.canon_id ?? ''}|${row.type}|${row.motif}`
if (new Set(rows.map(key)).size !== rows.length) throw new Error('Doublon interne')
const snapshot = {
  work_id: WORK_ID, book: BOOK, created_at: new Date().toISOString(), segments,
  proposed_links: rows,
  text_hash: createHash('sha256').update(segments.map(row => `${row.segment_numero}\t${row.segment_texte}`).join('\n')).digest('hex').toUpperCase(),
}
writeFileSync(`${OUT}/pre-write.json`, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({
  mode: WRITE ? 'write' : 'dry', segments: segments.length, links: rows.length,
  types: rows.reduce((acc, row) => ({ ...acc, [row.type]: (acc[row.type] ?? 0) + 1 }), {}),
  unresolved: UNRESOLVED.length, text_hash: snapshot.text_hash,
}, null, 2))
if (!WRITE) process.exit(0)
for (let offset = 0; offset < rows.length; offset += 100) {
  await must(db.from('liens_bibliques').insert(rows.slice(offset, offset + 100)), `insert:${offset}`)
}
const reviewedAt = new Date().toISOString()
for (let offset = 0; offset < segments.length; offset += 200) {
  await must(db.from('segments').update({ liens_revus_le: reviewedAt, liens_revus_par: 'IA-lecture' })
    .in('id', segments.slice(offset, offset + 200).map(row => row.id)), `review:${offset}`)
}
console.log(`Livre II écrit : ${rows.length} liens ; ${segments.length} segments marqués relus.`)
