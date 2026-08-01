import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ROOT = 'tmp/somme-liens-audit-2026-07-29';
const raw = JSON.parse(readFileSync(`${ROOT}/ss-q1-7-raw.json`, 'utf8'));
const plan = JSON.parse(readFileSync(`${ROOT}/SECUNDA-SECUNDAE-Q1-7-DOSSIER-STRICT.json`, 'utf8'));
const APPLY = process.argv.includes('--apply');
const questions = Array.from({ length: 7 }, (_, index) => `Question ${index + 1}`);
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const must = async (query, label) => { const { data, error } = await query; if (error) throw new Error(`${label}: ${error.message}`); return data; };
const canonical = (value) => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])])) : value;
const stable = (value) => JSON.stringify(canonical(value));
const literal = (value) => value == null ? 'null' : typeof value === 'number' ? `${value}` : typeof value === 'boolean'
  ? (value ? 'true' : 'false') : `'${String(value).replaceAll("'", "''")}'`;
const fields = (link) => ({
  segment_id: link.segment_id, canon_id: link.canon_id, verset_v2_id: link.verset_v2_id,
  livre: link.livre, chapitre: link.chapitre, type: link.type, fiabilite: link.fiabilite,
  motif: link.motif, provenance: link.provenance, arbitrage_requis: link.arbitrage_requis,
});
const tuple = (link) => stable(fields(link));
const snapshot = (label, payload) => {
  mkdirSync(ROOT, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
  const name = `SECUNDA-SECUNDAE-Q1-7-${label}-${stamp}.json`;
  const body = `${JSON.stringify(payload, null, 2)}\n`;
  writeFileSync(`${ROOT}/${name}`, body);
  writeFileSync(`${ROOT}/${name}.sha256`, `${createHash('sha256').update(body).digest('hex')}  ${name}\n`);
  return `${ROOT}/${name}`;
};

async function live() {
  const segments = [];
  for (const question of questions) for (let from = 0; ; from += 100) {
    const page = await must(sb.from('segments').select('*').eq('id_oeuvre', 'A0013O0002')
      .eq('ref_niv1', 'Secunda Secundae').eq('ref_niv2', question).order('segment_numero').range(from, from + 99), `${question}:${from}`);
    segments.push(...page);
    if (page.length < 100) break;
  }
  segments.sort((a, b) => a.segment_numero - b.segment_numero);
  const links = [];
  for (let offset = 0; offset < segments.length; offset += 100) for (let from = 0; ; from += 100) {
    const page = await must(sb.from('liens_bibliques').select('*')
      .in('segment_id', segments.slice(offset, offset + 100).map((segment) => segment.id))
      .order('id').range(from, from + 99), `liens:${offset}:${from}`);
    links.push(...page);
    if (page.length < 100) break;
  }
  links.sort((a, b) => a.id - b.id);
  return { segments, links };
}

const desired = plan.decisions.filter((decision) => decision.final).map((decision) => fields(decision.final));
const isDesired = (state) => state.segments.length === 376 && state.links.length === 167
  && stable(state.links.map(tuple).sort()) === stable(desired.map(tuple).sort());
if (raw.segments.length !== 376 || raw.links.length !== 137 || plan.decisions.length !== 168
  || plan.summary.liens_finaux_proposes !== 167 || plan.summary.suppressions !== 1 || plan.summary.ajouts !== 31
  || plan.summary.segments_a_marquer !== 0 || plan.summary.controle_stratifie < 30
  || plan.summary.controle_difficile * 2 < plan.summary.controle_stratifie) throw new Error('Dossier incomplet ou incohérent');
for (const decision of plan.decisions) {
  if (!decision.ancre_locale_exacte) throw new Error(`Ancre absente : ${decision.decision_id}`);
  if (!decision.final) continue;
  const final = decision.final;
  const targetCount = [final.canon_id, final.verset_v2_id, final.livre && final.chapitre].filter(Boolean).length;
  if (targetCount !== 1 || final.fiabilite !== 'vérifié' || final.provenance !== 'lecture'
    || final.arbitrage_requis || !final.motif || !decision.temoins?.length) throw new Error(`Décision invalide : ${decision.decision_id}`);
}
const desiredKeys = desired.map((link) => `${link.segment_id}|${link.type}|${link.canon_id || ''}|${link.verset_v2_id || ''}|${link.livre || ''}|${link.chapitre || ''}`);
if (desiredKeys.length !== new Set(desiredKeys).size) throw new Error('Doublon dans le plan');

const state = await live();
const before = snapshot('live-before', state);
const exact = stable(state.segments) === stable(raw.segments) && stable(state.links) === stable(raw.links);
const done = isDesired(state);
if (!exact && !done) throw new Error(`État live concurrent : ${before}`);
const ids = state.segments.map((segment) => segment.id);
const preRows = raw.links.map((link) => ({ id: link.id, ...fields(link) }));
const transaction = `set local statement_timeout='120s';
do $audit$ declare
n int;
scope_ids bigint[] := array[${ids.join(',')}]::bigint[];
expected_before jsonb := ${literal(JSON.stringify(preRows))}::jsonb;
expected_after jsonb := ${literal(JSON.stringify(desired))}::jsonb;
begin
perform 1 from segments where id=any(scope_ids) for update;
get diagnostics n = row_count;
if n<>376 then raise exception 'préétat segments %, attendu 376',n; end if;
perform 1 from liens_bibliques where segment_id=any(scope_ids) for update;
get diagnostics n = row_count;
if n<>137 then raise exception 'préétat verrouillé liens %, attendu 137',n; end if;
with expected as (
  select id,segment_id,canon_id,verset_v2_id,livre,chapitre,type,fiabilite,motif,provenance,arbitrage_requis
  from jsonb_to_recordset(expected_before) as x(id bigint,segment_id bigint,canon_id text,verset_v2_id uuid,livre text,chapitre int,type int,fiabilite text,motif text,provenance text,arbitrage_requis boolean)
)
select count(*) into n from expected e join liens_bibliques l on l.id=e.id and l.segment_id=e.segment_id
  and l.canon_id is not distinct from e.canon_id and l.verset_v2_id is not distinct from e.verset_v2_id
  and l.livre is not distinct from e.livre and l.chapitre is not distinct from e.chapitre
  and l.type is not distinct from e.type and l.fiabilite::text is not distinct from e.fiabilite
  and l.motif is not distinct from e.motif and l.provenance::text is not distinct from e.provenance
  and l.arbitrage_requis is not distinct from e.arbitrage_requis;
if n<>137 then raise exception 'préétat contenu liens %, attendu 137',n; end if;
delete from liens_bibliques where segment_id=any(scope_ids);
get diagnostics n = row_count;
if n<>137 then raise exception 'suppression périmètre %, attendu 137',n; end if;
insert into liens_bibliques(segment_id,canon_id,verset_v2_id,livre,chapitre,type,fiabilite,motif,provenance,arbitrage_requis)
select segment_id,canon_id,verset_v2_id,livre,chapitre,type,fiabilite,motif,provenance,arbitrage_requis
from jsonb_to_recordset(expected_after) as x(segment_id bigint,canon_id text,verset_v2_id uuid,livre text,chapitre int,type int,fiabilite text,motif text,provenance text,arbitrage_requis boolean);
get diagnostics n = row_count;
if n<>167 then raise exception 'insertion finale %, attendu 167',n; end if;
select count(*) into n from segments where id=any(scope_ids) and liens_revus_le is not null and liens_revus_par='IA-lecture';
if n<>376 then raise exception 'marqueurs segments %/376',n; end if;
select count(*) into n from liens_bibliques where segment_id=any(scope_ids); if n<>167 then raise exception 'liens finaux %',n; end if;
select count(*) into n from liens_bibliques where segment_id=any(scope_ids) and ((canon_id is not null)::int+(verset_v2_id is not null)::int+((livre is not null and chapitre is not null))::int)<>1; if n<>0 then raise exception 'cibles exclusives %',n; end if;
select count(*) into n from (select segment_id,type,coalesce(canon_id,''),coalesce(verset_v2_id::text,''),coalesce(livre,''),coalesce(chapitre::text,''),count(*) from liens_bibliques where segment_id=any(scope_ids) group by 1,2,3,4,5,6 having count(*)>1) d; if n<>0 then raise exception 'doublons %',n; end if;
select count(*) into n from liens_bibliques l where l.segment_id=any(scope_ids) and l.canon_id is not null and not exists(select 1 from versets_lecture v where v.id_verset=l.canon_id); if n<>0 then raise exception 'cibles canoniques mortes %',n; end if;
select count(*) into n from liens_bibliques l where l.segment_id=any(scope_ids) and l.verset_v2_id is not null and not exists(select 1 from versets_v2 v where v.id=l.verset_v2_id); if n<>0 then raise exception 'cibles v2 mortes %',n; end if;
select count(*) into n from liens_bibliques l where l.segment_id=any(scope_ids) and l.livre is not null and l.chapitre is not null and not exists(select 1 from versets_lecture v where v.id_verset like l.livre||'.'||l.chapitre::text||'.%'); if n<>0 then raise exception 'cibles chapitre mortes %',n; end if;
select count(*) into n from liens_bibliques where segment_id=any(scope_ids) and (fiabilite<>'vérifié' or provenance<>'lecture' or arbitrage_requis or motif is null or btrim(motif)=''); if n<>0 then raise exception 'métadonnées %',n; end if;
with expected as (
  select segment_id,canon_id,verset_v2_id,livre,chapitre,type,fiabilite,motif,provenance,arbitrage_requis
  from jsonb_to_recordset(expected_after) as x(segment_id bigint,canon_id text,verset_v2_id uuid,livre text,chapitre int,type int,fiabilite text,motif text,provenance text,arbitrage_requis boolean)
), actual as (
  select segment_id::bigint,canon_id,verset_v2_id,livre,chapitre,type,fiabilite::text,motif,provenance::text,arbitrage_requis
  from liens_bibliques where segment_id=any(scope_ids)
)
select count(*) into n from ((select * from actual except all select * from expected) union all (select * from expected except all select * from actual)) delta;
if n<>0 then raise exception 'postétat exact divergent : % ligne(s)',n; end if;
end $audit$;`;

if (!APPLY) {
  console.log(JSON.stringify({
    ready: true, applied: false, noop_if_applied: done, database_mode: 'lecture seule',
    guard: '--apply requis ; option non exécutée', atomicite: 'transaction unique via exec_sql',
    before, prestate_exact: exact, segments: 376,
    bulk_strategy: ['pré-check live exact hors transaction', 'verrouillage relationnel du scope et garde des 137 liens',
      'DELETE ensembliste du périmètre', 'INSERT JSON recordset de 167 lignes',
      'assertion sans UPDATE des 376 segments déjà marqués IA-lecture'],
    deletes_scope: 137, inserts: 167, final: 167, transaction_bytes: Buffer.byteLength(transaction, 'utf8'),
    checks: ['préétat exact', 'pagination complète', 'cibles exclusives', 'doublons', 'cibles vivantes',
      'métadonnées vérifiées', '36 contrôles dont 18 difficiles', 'snapshots SHA-256'],
  }, null, 2));
  process.exit(0);
}
if (done) { console.log(JSON.stringify({ applied: false, noop: true, before, segments: 376, links: 167 }, null, 2)); process.exit(0); }
const { error } = await sb.rpc('exec_sql', { sql: transaction });
if (error) throw new Error(`Transaction annulée : ${error.message}`);
const afterLive = await live();
const after = snapshot('live-after', afterLive);
if (!isDesired(afterLive)) throw new Error(`Postétat non conforme : ${after}`);
console.log(JSON.stringify({ applied: true, before, after, segments: 376, links: 167 }, null, 2));
