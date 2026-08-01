import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const ROOT = 'tmp/somme-liens-audit-2026-07-29'
const snapshot = JSON.parse(readFileSync(`${ROOT}/Q40-57-TYPE4-LIVE.json`, 'utf8'))
const plan = JSON.parse(readFileSync(`${ROOT}/Q40-57-TYPE4-PLAN-STRICT.json`, 'utf8'))
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .filter((x) => x && !x.startsWith('#')).map((x) => {
    const i = x.indexOf('=')
    return [x.slice(0, i), x.slice(i + 1).replace(/^["']|["']$/g, '')]
  }))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const lit = (v) => v == null ? 'null' : typeof v === 'number' ? String(v)
  : typeof v === 'boolean' ? (v ? 'true' : 'false') : `'${String(v).replaceAll("'", "''")}'`
const ids = plan.decisions.map((d) => d.link_id)
const oldById = new Map(snapshot.all_links.map((l) => [l.id, l]))
const predicate = (l) => [
  `id=${l.id}`, `segment_id=${l.segment_id}`, `canon_id is not distinct from ${lit(l.canon_id)}`,
  `verset_v2_id is not distinct from ${l.verset_v2_id == null ? 'null::uuid' : `${lit(l.verset_v2_id)}::uuid`}`,
  `livre is not distinct from ${lit(l.livre)}`, `chapitre is not distinct from ${lit(l.chapitre)}`,
  `type=${l.type}`, `fiabilite=${lit(l.fiabilite)}`, `motif is not distinct from ${lit(l.motif)}`,
  `provenance=${lit(l.provenance)}`, `arbitrage_requis=${lit(l.arbitrage_requis)}`,
].join(' and ')

if (plan.decisions.length !== 20 || plan.summary.ajouts || plan.summary.suppressions)
  throw new Error('Plan invalide')
const { data: live, error: liveError } = await sb.from('liens_bibliques').select('*').in('id', ids).order('id')
if (liveError) throw liveError
const expected = ids.map((id) => oldById.get(id)).sort((a, b) => a.id - b.id)
if (JSON.stringify(live) !== JSON.stringify(expected)) throw new Error('Préétat ciblé différent')
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const backupName = `Q40-57-type4-before-${stamp}.json`
const payload = `${JSON.stringify({ links: live }, null, 2)}\n`
writeFileSync(`${ROOT}/${backupName}`, payload)
writeFileSync(`${ROOT}/${backupName}.sha256`, `${createHash('sha256').update(payload).digest('hex')}  ${backupName}\n`)

for (const decision of plan.decisions) {
  const duplicate = snapshot.all_links.find((l) => l.id !== decision.link_id && l.segment_id === decision.segment_id &&
    l.canon_id === decision.canon_id && l.type === decision.type_final)
  if (duplicate) throw new Error(`Doublon projeté ${decision.link_id}/${duplicate.id}`)
}
const statements = plan.decisions.map((d) => {
  const old = oldById.get(d.link_id)
  return `update liens_bibliques set canon_id=${lit(d.canon_id)},type=${d.type_final},fiabilite='vérifié',provenance='lecture',arbitrage_requis=false,motif=${lit(d.motif_final)} where ${predicate(old)}; get diagnostics c=row_count; if c<>1 then raise exception 'lien ${d.link_id}: %',c; end if; n:=n+1;`
}).join('\n')
const segmentIds = [...new Set(plan.decisions.map((d) => d.segment_id))].join(',')
const sql = `do $x$ declare n int:=0; c int; begin
  perform 1 from liens_bibliques where id in(${ids.join(',')}) order by id for update;
  get diagnostics c=row_count; if c<>20 then raise exception 'verrou %/20',c; end if;
  ${statements}
  if n<>20 then raise exception 'count %/20',n; end if;
  select count(*) into c from (
    select segment_id,type,canon_id,count(*) from liens_bibliques where segment_id in(${segmentIds})
    group by 1,2,3 having count(*)>1
  ) d;
  if c<>0 then raise exception 'duplicates %',c; end if;
end $x$;`
const { error: applyError } = await sb.rpc('exec_sql', { sql })
if (applyError) throw applyError

const { data: after, error: afterError } = await sb.from('liens_bibliques').select('*').in('id', ids)
if (afterError) throw afterError
for (const decision of plan.decisions) {
  const link = after.find((l) => l.id === decision.link_id)
  if (!link || link.canon_id !== decision.canon_id || link.type !== decision.type_final ||
      link.fiabilite !== 'vérifié' || link.provenance !== 'lecture' || link.arbitrage_requis)
    throw new Error(`Post-contrôle ${decision.link_id}`)
}
console.log(JSON.stringify({ applied: true, updated: 20, backup: `${ROOT}/${backupName}` }, null, 2))
