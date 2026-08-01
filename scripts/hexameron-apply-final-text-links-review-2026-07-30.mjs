import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const WORK = 'A0017O0001'
const APPLY = process.argv.includes('--apply')
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const replacements = new Map([
  [18, [['même\u00a0; [[1]] les autres', 'même[[1]]\u00a0; les autres']]],
  [264, [['placé\u00a0; [[15]] de même', 'placé[[15]]\u00a0; de même']]],
  [284, [['se fit le four', 'se fit le jour']]],
  [601, [['leur sûreté\u00a0; [[39]] et encore', 'leur sûreté[[39]]\u00a0; et encore']]],
  [784, [['la tête nue\u00a0; [[45]] c’est', 'la tête nue[[45]]\u00a0; c’est']]],
  [801, [['double personne\u00a0[[46]]?', 'double personne[[46]]\u00a0?']]],
  [887, [['des bêlemens\u00a0[[49]]?', 'des bêlemens[[49]]\u00a0?']]],
  [973, [['deviennent vides\u00a0; [[55]] lorsqu’elle', 'deviennent vides[[55]]\u00a0; lorsqu’elle']]],
  [1000, [['des oiseaux qui voient dans le firmament', 'des oiseaux qui volent dans le firmament']]],
  [1300, [['sans elle\u00a0; [[80]] et cela', 'sans elle[[80]]\u00a0; et cela']]],
  [1371, [['cent quatre vingt mille stades\u00a0; [[85]] parce', 'cent quatre vingt mille stades[[85]]\u00a0; parce']]],
  [1480, [['plus de trois cents ans\u00a0; [[91]] ce qui', 'plus de trois cents ans[[91]]\u00a0; ce qui']]],
  [1706, [['son propre travail\u00a0; [[95]] puisqu’il', 'son propre travail[[95]]\u00a0; puisqu’il']]],
  [1714, [['comme les cigales\u00a0; [[96]] il ne', 'comme les cigales[[96]]\u00a0; il ne']]],
  [1776, [['beaucoup plus foible\u00a0; [[97]] au lieu', 'beaucoup plus foible[[97]]\u00a0; au lieu']]],
])

const sqlLiteral = (value) => value == null ? 'null' : `'${String(value).replaceAll("'", "''")}'`
const stableHash = (rows, columns) => createHash('sha256').update(rows
  .map((row) => columns.map((column) => row[column] ?? '').join('\t')).join('\n'), 'utf8')
  .digest('hex').toUpperCase()

async function allSegments() {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('segments')
      .select('id,segment_numero,segment_texte,nature,liens_revus_le,liens_revus_par')
      .eq('id_oeuvre', WORK).order('id').range(from, from + 999)
    if (error) throw error
    rows.push(...data)
    if (data.length < 1000) return rows
  }
}

async function allLinks(segmentIds) {
  const rows = []
  for (let from = 0; from < segmentIds.length; from += 300) {
    const { data, error } = await db.from('liens_bibliques')
      .select('id,segment_id,canon_id,type,fiabilite,provenance,motif,arbitrage_requis')
      .in('segment_id', segmentIds.slice(from, from + 300))
    if (error) throw error
    rows.push(...data)
  }
  return rows
}

const beforeSegments = await allSegments()
const body = beforeSegments.filter((row) => ['texte', 'citation'].includes(row.nature))
const beforeLinks = await allLinks(beforeSegments.map((row) => row.id))
if (beforeSegments.length !== 1818 || body.length !== 1799 || beforeLinks.length !== 474) {
  throw new Error(`Préétat inattendu : segments=${beforeSegments.length}, corps=${body.length}, liens=${beforeLinks.length}`)
}
if (body.some((row) => row.liens_revus_le || row.liens_revus_par)) {
  throw new Error('Des marqueurs de relecture sont déjà présents dans le corps.')
}

const byNumber = new Map(beforeSegments.map((row) => [row.segment_numero, row]))
const textUpdates = []
for (const [segmentNumber, changes] of replacements) {
  const segment = byNumber.get(segmentNumber)
  if (!segment) throw new Error(`Segment ${segmentNumber} absent`)
  let after = segment.segment_texte
  for (const [needle, replacement] of changes) {
    const count = after.split(needle).length - 1
    if (count !== 1) throw new Error(`Segment ${segmentNumber} : occurrence ${count} pour ${JSON.stringify(needle)}`)
    after = after.replace(needle, replacement)
  }
  textUpdates.push({ ...segment, after })
}

const psalmSegment = byNumber.get(354)
const psalmLink = beforeLinks.filter((row) => row.segment_id === psalmSegment.id && row.canon_id === 'PSA.148.4')
if (psalmLink.length !== 1 || psalmLink[0].type !== 4 || psalmLink[0].fiabilite !== 'douteux') {
  throw new Error(`Lien Ps 148,4 inattendu au segment 354 : ${JSON.stringify(psalmLink)}`)
}
if (beforeLinks.some((row) => row.segment_id === psalmSegment.id && row.canon_id === 'PSA.148.4' && row.type === 1)) {
  throw new Error('Un lien T1 Ps 148,4 existe déjà au segment 354.')
}

console.log(JSON.stringify({
  apply: APPLY,
  text_updates: textUpdates.length,
  ocr_corrections: [284, 1000],
  note_call_placements: textUpdates.length - 2,
  link_reclassification: { segment: 354, canon_id: 'PSA.148.4', from: 't4/douteux', to: 't1/probable' },
  reviewed_body_segments: body.length,
  before_text_hash: stableHash(beforeSegments, ['id', 'segment_numero', 'segment_texte']),
  before_links_hash: stableHash(beforeLinks.sort((a, b) => a.id - b.id), ['id', 'segment_id', 'canon_id', 'type', 'fiabilite', 'motif']),
}, null, 2))
if (!APPLY) process.exit(0)

const statements = []
for (const row of textUpdates) {
  statements.push(`
    update segments set segment_texte=${sqlLiteral(row.after)}
    where id=${row.id} and id_oeuvre=${sqlLiteral(WORK)} and segment_texte=${sqlLiteral(row.segment_texte)};
    get diagnostics n=row_count;
    if n<>1 then raise exception 'Mise à jour texte segment ${row.segment_numero}: %', n; end if;`)
}
statements.push(`
  update liens_bibliques set
    type=1,
    fiabilite='probable',
    arbitrage_requis=false,
    motif='Citation explicite attribuée au Psalmiste : « les cieux des cieux » (Ps 148, 4)'
  where id=${psalmLink[0].id} and segment_id=${psalmSegment.id} and canon_id='PSA.148.4'
    and type=4 and fiabilite='douteux' and arbitrage_requis=true;
  get diagnostics n=row_count;
  if n<>1 then raise exception 'Reclassement Ps 148,4: %', n; end if;

  select count(*) into n from liens_bibliques l join segments s on s.id=l.segment_id
  where s.id_oeuvre=${sqlLiteral(WORK)};
  if n<>474 then raise exception 'Postcontrôle liens: %/474', n; end if;`)

const sql = `do $audit$ declare n integer; begin ${statements.join('\n')} end $audit$;`
const { error } = await db.rpc('exec_sql', { sql })
if (error) throw error

const reviewedAt = new Date().toISOString()
for (let from = 0; from < body.length; from += 200) {
  const batch = body.slice(from, from + 200)
  const { data, error: reviewError } = await db.from('segments')
    .update({ liens_revus_le: reviewedAt, liens_revus_par: 'IA-lecture' })
    .in('id', batch.map((row) => row.id))
    .is('liens_revus_le', null).is('liens_revus_par', null).select('id')
  if (reviewError) throw reviewError
  if (data.length !== batch.length) {
    throw new Error(`Marquage de relecture lot ${from}: ${data.length}/${batch.length}`)
  }
}

const afterSegments = await allSegments()
const afterLinks = await allLinks(afterSegments.map((row) => row.id))
const afterByNumber = new Map(afterSegments.map((row) => [row.segment_numero, row]))
for (const update of textUpdates) {
  if (afterByNumber.get(update.segment_numero)?.segment_texte !== update.after) {
    throw new Error(`Postcontrôle texte segment ${update.segment_numero}`)
  }
}
const finalPsalm = afterLinks.find((row) => row.id === psalmLink[0].id)
if (finalPsalm.type !== 1 || finalPsalm.fiabilite !== 'probable' || finalPsalm.arbitrage_requis) {
  throw new Error('Postcontrôle du lien Ps 148,4 en échec')
}
console.log(JSON.stringify({
  applied: true,
  segments: afterSegments.length,
  reviewed: afterSegments.filter((row) => ['texte', 'citation'].includes(row.nature) && row.liens_revus_par === 'IA-lecture').length,
  links: afterLinks.length,
  after_text_hash: stableHash(afterSegments, ['id', 'segment_numero', 'segment_texte']),
  after_links_hash: stableHash(afterLinks.sort((a, b) => a.id - b.id), ['id', 'segment_id', 'canon_id', 'type', 'fiabilite', 'motif']),
}, null, 2))
