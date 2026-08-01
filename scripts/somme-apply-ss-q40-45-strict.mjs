import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const ROOT = 'tmp/somme-liens-audit-2026-07-29'
const raw = JSON.parse(readFileSync(`${ROOT}/ss-q40-45-raw.json`, 'utf8'))
const plan = JSON.parse(readFileSync(`${ROOT}/SS-Q40-45-DOSSIER-STRICT.json`, 'utf8'))
const questions = Array.from({ length: 6 }, (_, i) => `Question ${40 + i}`)
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .filter((x) => x && !x.startsWith('#')).map((x) => {
    const i = x.indexOf('=')
    return [x.slice(0, i), x.slice(i + 1).replace(/^["']|["']$/g, '')]
  }))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const canonical = (v) => Array.isArray(v) ? v.map(canonical)
  : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonical(v[k])])) : v
const stable = (v) => JSON.stringify(canonical(v))
const lit = (v) => v == null ? 'null' : typeof v === 'number' ? String(v)
  : typeof v === 'boolean' ? (v ? 'true' : 'false') : `'${String(v).replaceAll("'", "''")}'`

if (raw.segments.length !== 287 || raw.links.length !== 130 || plan.decisions.length !== 130 ||
    plan.insertions.length !== 0 || plan.controle_deterministe.length < 15 ||
    plan.controle_deterministe.some((x) => x.verdict !== 'juste')) throw new Error('Plan incomplet')

const { data: segments, error: segmentError } = await sb.from('segments').select('*')
  .eq('id_oeuvre', 'A0013O0002').eq('ref_niv1', 'Secunda Secundae').in('ref_niv2', questions).order('segment_numero')
if (segmentError) throw segmentError
const segmentIds = segments.map((s) => s.id)
const { data: links, error: linkError } = await sb.from('liens_bibliques').select('*').in('segment_id', segmentIds).order('id')
if (linkError) throw linkError

mkdirSync(ROOT, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const backupName = `Q40-45-live-before-${stamp}.json`
const payload = `${JSON.stringify({ segments, links }, null, 2)}\n`
writeFileSync(`${ROOT}/${backupName}`, payload)
writeFileSync(`${ROOT}/${backupName}.sha256`, `${createHash('sha256').update(payload).digest('hex')}  ${backupName}\n`)
if (stable(segments) !== stable(raw.segments) || stable(links) !== stable([...raw.links].sort((a, b) => a.id - b.id)))
  throw new Error('Préétat exact différent')
if (segments.some((s) => s.liens_revus_le || s.liens_revus_par)) throw new Error('Segments déjà marqués')

const oldById = new Map(raw.links.map((l) => [l.id, l]))
const predicate = (l) => [
  `id=${lit(l.id)}`, `segment_id=${lit(l.segment_id)}`,
  `canon_id is not distinct from ${lit(l.canon_id)}`,
  `verset_v2_id is not distinct from ${l.verset_v2_id == null ? 'null::uuid' : `${lit(l.verset_v2_id)}::uuid`}`,
  `livre is not distinct from ${lit(l.livre)}`, `chapitre is not distinct from ${lit(l.chapitre)}`,
  `type=${lit(l.type)}`, `fiabilite=${lit(l.fiabilite)}`,
  `motif is not distinct from ${lit(l.motif)}`, `provenance=${lit(l.provenance)}`,
  `arbitrage_requis=${lit(l.arbitrage_requis)}`,
].join(' and ')
const statements = []
for (const decision of plan.decisions) {
  const old = oldById.get(decision.link_id)
  if (!old) throw new Error(`Lien absent du préétat : ${decision.link_id}`)
  if (decision.decision === 'supprimer') {
    statements.push(`delete from liens_bibliques where ${predicate(old)}; get diagnostics n=row_count; if n<>1 then raise exception 'delete ${old.id}: %',n; end if; n_del:=n_del+1;`)
  } else {
    const f = decision.final
    statements.push(`update liens_bibliques set canon_id=${lit(f.canon_id)},verset_v2_id=null,livre=null,chapitre=null,type=${lit(f.type)},fiabilite='vérifié',motif=${lit(f.motif)},provenance='lecture',arbitrage_requis=false where ${predicate(old)}; get diagnostics n=row_count; if n<>1 then raise exception 'update ${old.id}: %',n; end if; n_up:=n_up+1;`)
  }
}
const list = segmentIds.join(',')
const sql = `do $q$ declare n_up int:=0; n_del int:=0; n_mark int:=0; n int; begin
  perform 1 from segments where id in(${list}) order by id for update;
  get diagnostics n=row_count; if n<>287 then raise exception 'segments verrouillés %/287',n; end if;
  perform 1 from liens_bibliques where segment_id in(${list}) order by id for update;
  get diagnostics n=row_count; if n<>130 then raise exception 'liens verrouillés %/130',n; end if;
  ${statements.join('\n')}
  update segments set liens_revus_le=now(),liens_revus_par='IA-lecture'
    where id in(${list}) and liens_revus_le is null and liens_revus_par is null;
  get diagnostics n_mark=row_count;
  if n_up<>128 or n_del<>2 or n_mark<>287 then raise exception 'comptes %,%,%',n_up,n_del,n_mark; end if;
  select count(*) into n from liens_bibliques where segment_id in(${list});
  if n<>128 then raise exception 'total final %/128',n; end if;
  select count(*) into n from liens_bibliques where segment_id in(${list})
    and fiabilite='vérifié' and provenance='lecture' and not arbitrage_requis;
  if n<>128 then raise exception 'état final %/128',n; end if;
  select count(*) into n from (
    select segment_id,type,canon_id,verset_v2_id,livre,chapitre,count(*)
    from liens_bibliques where segment_id in(${list}) group by 1,2,3,4,5,6 having count(*)>1
  ) d;
  if n<>0 then raise exception 'doublons %',n; end if;
end $q$;`
const { error: applyError } = await sb.rpc('exec_sql', { sql })
if (applyError) throw applyError

const { data: afterSegments, error: afterSegmentError } = await sb.from('segments')
  .select('id,liens_revus_le,liens_revus_par').in('id', segmentIds)
if (afterSegmentError) throw afterSegmentError
const { data: afterLinks, error: afterLinkError } = await sb.from('liens_bibliques').select('*').in('segment_id', segmentIds)
if (afterLinkError) throw afterLinkError
if (afterSegments.length !== 287 || afterSegments.some((s) => !s.liens_revus_le || s.liens_revus_par !== 'IA-lecture'))
  throw new Error('Post-contrôle segments échoué')
if (afterLinks.length !== 128 || afterLinks.some((l) => l.fiabilite !== 'vérifié' || l.provenance !== 'lecture' || l.arbitrage_requis))
  throw new Error('Post-contrôle liens échoué')
console.log(JSON.stringify({ applied: true, backup: `${ROOT}/${backupName}`, segments: 287, links: 128, duplicates: 0 }, null, 2))
