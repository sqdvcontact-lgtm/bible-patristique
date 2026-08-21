import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const R = 'tmp/somme-liens-audit-2026-07-29'
const raw = JSON.parse(readFileSync(`${R}/supp-q81-end-raw.json`, 'utf8'))
const plan = JSON.parse(readFileSync(`${R}/SUPPLEMENT-Q81-99-DOSSIER-STRICT.json`, 'utf8'))
const APPLY = process.argv.includes('--apply')
const questions = Array.from({ length: 20 }, (_, i) => `Question ${81 + i}`)
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const must = async (query, label) => { const { data, error } = await query; if (error) throw new Error(`${label}: ${error.message}`); return data }
const canonical = (v) => Array.isArray(v) ? v.map(canonical) : v && typeof v === 'object'
  ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonical(v[k])])) : v
const stable = (v) => JSON.stringify(canonical(v))
const lit = (v) => v == null ? 'null' : typeof v === 'number' ? `${v}` : typeof v === 'boolean'
  ? (v ? 'true' : 'false') : `'${String(v).replaceAll("'", "''")}'`
const fields = (x) => ({ segment_id: x.segment_id, canon_id: x.canon_id, verset_v2_id: x.verset_v2_id, livre: x.livre, chapitre: x.chapitre, type: x.type, fiabilite: x.fiabilite, motif: x.motif, provenance: x.provenance, arbitrage_requis: x.arbitrage_requis })
const tuple = (x) => stable(fields(x))
const sqlString = (value) => `'${String(value).replaceAll("'", "''")}'`
const sqlJson = (value) => `${sqlString(JSON.stringify(value))}::jsonb`

function snapshot(label, payload) {
  mkdirSync(R, { recursive: true })
  const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
  const name = `SUPPLEMENT-Q81-99-${label}-${stamp}.json`
  const body = JSON.stringify(payload, null, 2) + '\n'
  writeFileSync(`${R}/${name}`, body)
  writeFileSync(`${R}/${name}.sha256`, `${createHash('sha256').update(body).digest('hex')}  ${name}\n`)
  return `${R}/${name}`
}
async function live() {
  const segments = []
  for (const question of questions) for (let from = 0; ; from += 100) {
    const page = await must(sb.from('segments').select('*').eq('id_oeuvre', 'A0013O0002').eq('ref_niv1', 'Supplément').eq('ref_niv2', question).order('segment_numero').range(from, from + 99), `${question}:${from}`)
    segments.push(...page)
    if (page.length < 100) break
  }
  segments.sort((a, b) => a.segment_numero - b.segment_numero)
  const links = []
  for (let off = 0; off < segments.length; off += 100) for (let from = 0; ; from += 100) {
    const page = await must(sb.from('liens_bibliques').select('*').in('segment_id', segments.slice(off, off + 100).map((s) => s.id)).order('id').range(from, from + 99), `liens:${off}:${from}`)
    links.push(...page)
    if (page.length < 100) break
  }
  links.sort((a, b) => a.id - b.id)
  return { segments, links }
}
const desired = () => [...plan.decisions.map((d) => ({ segment_id: d.segment_id, ...d.final })), ...plan.insertions]
const isDesired = (state) => state.segments.length === 1138 && state.links.length === 358
  && state.segments.every((s) => s.liens_revus_le && s.liens_revus_par)
  && stable(state.links.map(tuple).sort()) === stable(desired().map(tuple).sort())

if (raw.segments.length !== 1138 || raw.links.length !== 62 || plan.decisions.length !== 62
  || plan.insertions.length !== 296 || plan.summary.liens_finaux_proposes !== 358
  || plan.audit_chapitres.length !== 3 || plan.audit_t4.length !== 22
  || plan.controle_stratifie.length !== 60 || plan.controle_stratifie.filter((x) => Number(x.type) >= 3).length !== 30
  || plan.bornes_exactes.derniere_question !== 'Question 99' || plan.bornes_exactes.dernier_segment_numero !== 32367
  || plan.bornes_exactes.question_100_segments !== 0) throw new Error('Dossier incomplet ou bornes divergentes')
for (const d of plan.decisions) if (!d.ancre_locale_exacte || !d.temoins_versets_lecture.length || !d.final.canon_id || d.final.verset_v2_id || d.final.livre || d.final.chapitre) throw new Error(`Décision invalide ${d.link_id}`)
for (const a of plan.insertions) if (!a.ancre_locale_exacte || !a.temoins_versets_lecture.length || !a.canon_id || a.verset_v2_id || a.livre || a.chapitre) throw new Error(`Ajout invalide ${a.id_proposition}`)

const state = await live()
const before = snapshot('live-before', state)
const exact = stable(state.segments) === stable(raw.segments) && stable(state.links) === stable(raw.links)
const done = isDesired(state)
if (!exact && !done) throw new Error(`État divergent : ${before}`)
if (!APPLY) {
  console.log(JSON.stringify({
    ready: true, applied: false, noop_if_applied: done, database_mode: 'lecture seule',
    guard: '--apply requis ; option non exécutée', before,
    atomicite: 'transaction unique, remplacement bulk du scope',
    preetat_exact: exact, questions: '81-99 ; 100 vide', last_segment: 32367,
    segments: 1138, delete_scope: 62, insert_bulk: 358, update_segments_bulk: 1138,
    checks: ['préétat/postétat idempotent', 'garde transactionnelle du préétat', 'cibles canoniques exclusives', 'aucun doublon', 'aucune cible morte', 'métadonnées complètes', '3 cibles de chapitre reciblées', '22 T4 audités', '60 contrôles dont 30 difficiles'],
  }, null, 2))
  process.exit(0)
}
if (done) { console.log(JSON.stringify({ applied: false, noop: true, before, links: 358 }, null, 2)); process.exit(0) }

const segmentIds = state.segments.map((segment) => segment.id)
const expectedSegments = raw.segments.map((segment) => ({
  id: segment.id,
  segment_numero: segment.segment_numero,
  liens_revus_le: segment.liens_revus_le,
  liens_revus_par: segment.liens_revus_par,
}))
const desiredBulk = desired().map((link) => ({
  segment_id: link.segment_id,
  canon_id: link.canon_id,
  type: link.type,
  fiabilite: link.fiabilite,
  motif: link.motif,
  provenance: link.provenance,
  arbitrage_requis: link.arbitrage_requis,
}))

const sql = `
do $atomic$
declare
  n integer;
begin
  perform 1
  from segments
  where id = any(array[${segmentIds.join(',')}]::bigint[])
  for update;

  select count(*) into n
  from jsonb_array_elements(${sqlJson(expectedSegments)}) expected
  join segments current on current.id = (expected->>'id')::bigint
  where current.segment_numero is not distinct from (expected->>'segment_numero')::integer
    and current.liens_revus_le is not distinct from (expected->>'liens_revus_le')::timestamptz
    and current.liens_revus_par is not distinct from expected->>'liens_revus_par';
  if n <> 1138 then raise exception 'préétat segments divergent: %/1138', n; end if;

  perform 1
  from liens_bibliques
  where segment_id = any(array[${segmentIds.join(',')}]::bigint[])
  for update;

  select count(*) into n
  from liens_bibliques
  where segment_id = any(array[${segmentIds.join(',')}]::bigint[]);
  if n <> 62 then raise exception 'préétat liens, cardinal divergent: %/62', n; end if;

  select count(*) into n
  from jsonb_array_elements(${sqlJson(raw.links)}) expected
  join liens_bibliques current on current.id = (expected->>'id')::bigint
  where current.segment_id is not distinct from (expected->>'segment_id')::bigint
    and current.canon_id is not distinct from expected->>'canon_id'
    and current.verset_v2_id is not distinct from (expected->>'verset_v2_id')::uuid
    and current.livre is not distinct from expected->>'livre'
    and current.chapitre is not distinct from (expected->>'chapitre')::integer
    and current.type is not distinct from (expected->>'type')::integer
    and current.fiabilite is not distinct from expected->>'fiabilite'
    and current.motif is not distinct from expected->>'motif'
    and current.provenance is not distinct from expected->>'provenance'
    and current.created_at is not distinct from (expected->>'created_at')::timestamptz
    and current.updated_at is not distinct from (expected->>'updated_at')::timestamptz
    and current.arbitrage_requis is not distinct from (expected->>'arbitrage_requis')::boolean;
  if n <> 62 then raise exception 'préétat liens, contenu divergent: %/62', n; end if;

  delete from liens_bibliques
  where segment_id = any(array[${segmentIds.join(',')}]::bigint[]);
  get diagnostics n = row_count;
  if n <> 62 then raise exception 'suppression scope incomplète: %/62', n; end if;

  insert into liens_bibliques (
    segment_id, canon_id, verset_v2_id, livre, chapitre, type,
    fiabilite, motif, provenance, arbitrage_requis
  )
  select
    value.segment_id, value.canon_id, null, null, null, value.type,
    value.fiabilite, value.motif, value.provenance, value.arbitrage_requis
  from jsonb_to_recordset(${sqlJson(desiredBulk)}) as value(
    segment_id bigint, canon_id text, type integer, fiabilite text,
    motif text, provenance text, arbitrage_requis boolean
  );
  get diagnostics n = row_count;
  if n <> 358 then raise exception 'insertion bulk incomplète: %/358', n; end if;

  update segments
  set liens_revus_le = coalesce(liens_revus_le, now()),
      liens_revus_par = coalesce(liens_revus_par, 'IA-lecture')
  where id = any(array[${segmentIds.join(',')}]::bigint[]);
  get diagnostics n = row_count;
  if n <> 1138 then raise exception 'mise à jour segments incomplète: %/1138', n; end if;

  select count(*) into n
  from liens_bibliques
  where segment_id = any(array[${segmentIds.join(',')}]::bigint[]);
  if n <> 358 then raise exception 'total final: %/358', n; end if;

  select count(*) into n
  from jsonb_to_recordset(${sqlJson(desiredBulk)}) as expected(
    segment_id bigint, canon_id text, type integer, fiabilite text,
    motif text, provenance text, arbitrage_requis boolean
  )
  join liens_bibliques current
    on current.segment_id = expected.segment_id
   and current.canon_id = expected.canon_id
   and current.type = expected.type
  where current.verset_v2_id is null
    and current.livre is null
    and current.chapitre is null
    and current.fiabilite is not distinct from expected.fiabilite
    and current.motif is not distinct from expected.motif
    and current.provenance is not distinct from expected.provenance
    and current.arbitrage_requis is not distinct from expected.arbitrage_requis;
  if n <> 358 then raise exception 'contenu final: %/358', n; end if;

  select count(*) into n
  from (
    select segment_id, type, canon_id, count(*)
    from liens_bibliques
    where segment_id = any(array[${segmentIds.join(',')}]::bigint[])
    group by 1, 2, 3
    having count(*) > 1
  ) duplicates;
  if n <> 0 then raise exception 'doublons finaux: %', n; end if;

  select count(*) into n
  from liens_bibliques link
  where link.segment_id = any(array[${segmentIds.join(',')}]::bigint[])
    and (link.canon_id is null or link.verset_v2_id is not null or link.livre is not null or link.chapitre is not null);
  if n <> 0 then raise exception 'cibles non exclusives: %', n; end if;

  select count(*) into n
  from liens_bibliques link
  where link.segment_id = any(array[${segmentIds.join(',')}]::bigint[])
    and not exists (select 1 from versets_lecture verse where verse.id_verset = link.canon_id);
  if n <> 0 then raise exception 'cibles mortes: %', n; end if;

  select count(*) into n
  from segments
  where id = any(array[${segmentIds.join(',')}]::bigint[])
    and (liens_revus_le is null or liens_revus_par is null);
  if n <> 0 then raise exception 'métadonnées segments: %', n; end if;
end
$atomic$;
`
const { error } = await sb.rpc('exec_sql', { sql })
if (error) throw new Error(`Transaction : ${error.message}`)
const afterLive = await live()
const after = snapshot('live-after', afterLive)
if (!isDesired(afterLive)) throw new Error(`Postétat divergent : ${after}`)
console.log(JSON.stringify({ applied: true, before, after, segments: 1138, links: 358 }, null, 2))
