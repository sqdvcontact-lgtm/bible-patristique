import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { createClient } from '@supabase/supabase-js'

const APPLY = process.argv.includes('--apply')
const TARGETS = [
  { id: 'A0010O0004', title: 'Discours sur les Psaumes', segments: 64599, links: 10554 },
  { id: 'A0010O0002', title: 'La Cité de Dieu', segments: 9486, links: 0 },
]
const PRESERVED = 'A0012O0002'
const ROOT = 'audit/oeuvres-supprimees-2026-08-02'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const must = async (promise, label) => {
  const { data, error } = await promise
  if (error) throw new Error(`${label}: ${error.message}`)
  return data
}
async function all(table, select = '*', configure = null, order = 'id') {
  const rows = []
  for (let from = 0; ; from += 1000) {
    let query = db.from(table).select(select).range(from, from + 999)
    if (configure) query = configure(query)
    if (order) query = query.order(order)
    const page = await must(query, `${table}:${from}`)
    rows.push(...page)
    if (page.length < 1000) return rows
  }
}

const ids = TARGETS.map((target) => target.id)
const works = await must(db.from('oeuvres').select('*').in('id_oeuvre', [...ids, PRESERVED]).order('id_oeuvre'), 'oeuvres')
for (const target of TARGETS) {
  const work = works.find((row) => row.id_oeuvre === target.id)
  if (!work || work.titre !== target.title) throw new Error(`Cible inattendue : ${target.id}`)
}
const preserved = works.find((row) => row.id_oeuvre === PRESERVED)
if (!preserved || preserved.titre !== 'Doctrine des Apôtres') throw new Error('La Doctrine des Apôtres ne peut pas être verrouillée')

const segments = await all('segments', '*', (query) => query.in('id_oeuvre', ids), 'id')
for (const target of TARGETS) {
  const rows = segments.filter((row) => row.id_oeuvre === target.id)
  if (rows.length !== target.segments) throw new Error(`${target.id}: ${rows.length}/${target.segments} segments`)
}
const segmentIds = segments.map((row) => row.id)
const segmentSet = new Set(segmentIds)
const links = []
for (let offset = 0; offset < segmentIds.length; offset += 200) {
  links.push(...await must(db.from('liens_bibliques').select('*').in('segment_id', segmentIds.slice(offset, offset + 200)), `liens:${offset}`))
}
for (const target of TARGETS) {
  const workSegments = new Set(segments.filter((row) => row.id_oeuvre === target.id).map((row) => row.id))
  const count = links.filter((row) => workSegments.has(row.segment_id)).length
  if (count !== target.links) throw new Error(`${target.id}: ${count}/${target.links} liens`)
}

const [allComments, allReports, notices, withdrawals, personalSegments] = await Promise.all([
  all('commentaires'),
  all('signalements'),
  all('catalogue_notices', '*', (query) => query.in('id_oeuvre_stable', ids)),
  all('prelevements', '*', (query) => query.in('id_oeuvre', ids)),
  all('oeuvres_personnelles_segments', '*', (query) => query.in('id_oeuvre', ids)),
])
const comments = allComments.filter((row) => segmentSet.has(row.id_segment))
const reports = allReports.filter((row) => segmentSet.has(row.id_segment))
const commentIds = new Set(comments.map((row) => row.id))
const externalReplies = allComments.filter((row) => commentIds.has(row.reponse_a) && !commentIds.has(row.id))
if (externalReplies.length) throw new Error(`${externalReplies.length} réponse(s) externe(s) dépendent des commentaires ciblés`)

const snapshot = {
  exported_at: new Date().toISOString(),
  targets: TARGETS,
  preserved_work: preserved,
  oeuvres: works.filter((row) => ids.includes(row.id_oeuvre)),
  segments,
  liens_bibliques: links,
  catalogue_notices: notices,
  commentaires: comments,
  signalements: reports,
  prelevements: withdrawals,
  oeuvres_personnelles_segments: personalSegments,
}
const body = `${JSON.stringify(snapshot, null, 2)}\n`
mkdirSync(ROOT, { recursive: true })
const snapshotPath = `${ROOT}/psaumes-cite-de-dieu-avant-suppression.json.gz`
writeFileSync(snapshotPath, gzipSync(Buffer.from(body, 'utf8'), { level: 9 }))
writeFileSync(`${snapshotPath}.sha256`, `${createHash('sha256').update(body).digest('hex')}  contenu-json-decompresse\n`, 'utf8')

const summary = {
  ready: true,
  applied: APPLY,
  deleted: TARGETS.map(({ id, title }) => ({ id, title })),
  preserved: { id: preserved.id_oeuvre, title: preserved.titre },
  counts: {
    works: 2, segments: segments.length, links: links.length, notices: notices.length,
    comments: comments.length, reports: reports.length, withdrawals: withdrawals.length,
    personal_segments: personalSegments.length,
  },
  recoverable_snapshot: snapshotPath,
}
if (!APPLY) {
  console.log(JSON.stringify(summary, null, 2))
  process.exit(0)
}

const lit = (value) => `'${String(value).replaceAll("'", "''")}'`
const idList = ids.map(lit).join(',')
const sql = `do $delete$ declare n integer; begin
  select count(*) into n from oeuvres where id_oeuvre in (${idList});
  if n<>2 then raise exception 'oeuvres %/2',n; end if;
  select count(*) into n from oeuvres where id_oeuvre=${lit(PRESERVED)} and titre='Doctrine des Apôtres';
  if n<>1 then raise exception 'Doctrine des Apôtres non verrouillée'; end if;
  select count(*) into n from segments where id_oeuvre in (${idList});
  if n<>${segments.length} then raise exception 'segments %/${segments.length}',n; end if;
  select count(*) into n from liens_bibliques where segment_id in (select id from segments where id_oeuvre in (${idList}));
  if n<>${links.length} then raise exception 'liens %/${links.length}',n; end if;
  select count(*) into n from catalogue_notices where id_oeuvre_stable in (${idList});
  if n<>${notices.length} then raise exception 'notices %/${notices.length}',n; end if;
  delete from liens_bibliques where segment_id in (select id from segments where id_oeuvre in (${idList}));
  get diagnostics n=row_count; if n<>${links.length} then raise exception 'suppression liens %/${links.length}',n; end if;
  delete from commentaires where id_segment in (select id from segments where id_oeuvre in (${idList}));
  get diagnostics n=row_count; if n<>${comments.length} then raise exception 'suppression commentaires %/${comments.length}',n; end if;
  delete from signalements where id_segment in (select id from segments where id_oeuvre in (${idList}));
  get diagnostics n=row_count; if n<>${reports.length} then raise exception 'suppression signalements %/${reports.length}',n; end if;
  delete from prelevements where id_oeuvre in (${idList});
  get diagnostics n=row_count; if n<>${withdrawals.length} then raise exception 'suppression prélèvements %/${withdrawals.length}',n; end if;
  delete from oeuvres_personnelles_segments where id_oeuvre in (${idList});
  get diagnostics n=row_count; if n<>${personalSegments.length} then raise exception 'suppression personnels %/${personalSegments.length}',n; end if;
  alter table catalogue_notices disable trigger trg_protect_verified_notice;
  delete from catalogue_notices where id_oeuvre_stable in (${idList});
  get diagnostics n=row_count; if n<>${notices.length} then raise exception 'suppression notices %/${notices.length}',n; end if;
  alter table catalogue_notices enable trigger trg_protect_verified_notice;
  delete from segments where id_oeuvre in (${idList});
  get diagnostics n=row_count; if n<>${segments.length} then raise exception 'suppression segments %/${segments.length}',n; end if;
  delete from oeuvres where id_oeuvre in (${idList});
  get diagnostics n=row_count; if n<>2 then raise exception 'suppression oeuvres %/2',n; end if;
end $delete$;`
const { error } = await db.rpc('exec_sql', { sql })
if (error) throw new Error(`Transaction annulée : ${error.message}`)

const [deletedWorks, remainingSegments, remainingLinks, preservedAfter] = await Promise.all([
  must(db.from('oeuvres').select('id_oeuvre').in('id_oeuvre', ids), 'post-œuvres'),
  must(db.from('segments').select('id').in('id_oeuvre', ids).limit(1), 'post-segments'),
  must(db.from('liens_bibliques').select('id').in('segment_id', segmentIds.slice(0, 200)).limit(1), 'post-liens-échantillon'),
  must(db.from('oeuvres').select('id_oeuvre,titre').eq('id_oeuvre', PRESERVED).single(), 'post-Doctrine'),
])
if (deletedWorks.length || remainingSegments.length || remainingLinks.length || preservedAfter.titre !== 'Doctrine des Apôtres') {
  throw new Error('Postcontrôle inattendu')
}
console.log(JSON.stringify({ ...summary, applied: true, postcheck: 'suppression complète confirmée ; Doctrine des Apôtres conservée' }, null, 2))
