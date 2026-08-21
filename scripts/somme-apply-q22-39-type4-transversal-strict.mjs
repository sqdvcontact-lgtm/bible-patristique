import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ROOT = 'tmp/somme-liens-audit-2026-07-29';
const raw = JSON.parse(readFileSync(`${ROOT}/SS-Q22-39-TYPE4-LIVE.json`, 'utf8'));
const plan = JSON.parse(readFileSync(`${ROOT}/SS-Q22-39-TYPE4-TRANSVERSAL.json`, 'utf8'));
const APPLY = process.argv.includes('--apply');
const questions = Array.from({ length: 18 }, (_, i) => `Question ${i + 22}`);
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const must = async (query, label) => {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
};
const canonical = (value) => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])])) : value;
const stable = (value) => JSON.stringify(canonical(value));
const literal = (value) => value == null ? 'null' : typeof value === 'number' ? String(value)
  : typeof value === 'boolean' ? value ? 'true' : 'false' : `'${String(value).replaceAll("'", "''")}'`;
const snapshot = (label, payload) => {
  mkdirSync(ROOT, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
  const name = `Q22-39-type4-${label}-${stamp}.json`;
  const text = `${JSON.stringify(payload, null, 2)}\n`;
  writeFileSync(`${ROOT}/${name}`, text);
  writeFileSync(`${ROOT}/${name}.sha256`, `${createHash('sha256').update(text).digest('hex')}  ${name}\n`);
  return `${ROOT}/${name}`;
};
const fetchLive = async () => {
  const segments = [];
  for (const question of questions) {
    segments.push(...await must(
      sb.from('segments').select('*').eq('id_oeuvre', 'A0013O0002').eq('ref_niv1', 'Secunda Secundae')
        .eq('ref_niv2', question).order('segment_numero'),
      `segments ${question}`,
    ));
  }
  segments.sort((a, b) => a.segment_numero - b.segment_numero);
  const type4 = [];
  for (let i = 0; i < segments.length; i += 100) {
    type4.push(...await must(
      sb.from('liens_bibliques').select('*').in('segment_id', segments.slice(i, i + 100).map((s) => s.id))
        .eq('type', 4).eq('fiabilite', 'vérifié').order('id'),
      `types 4 ${i}`,
    ));
  }
  type4.sort((a, b) => a.id - b.id);
  const affectedIds = [...new Set(type4.map((l) => l.segment_id))];
  const affectedLinks = affectedIds.length ? await must(
    sb.from('liens_bibliques').select('*').in('segment_id', affectedIds).order('id'),
    'liens des segments affectés',
  ) : [];
  return { segments, type4, affectedLinks };
};

if (raw.segments.length !== 1100 || raw.links.length !== 12 || raw.all_links_on_affected_segments.length !== 19) throw new Error('Baseline incomplète.');
if (plan.decisions.length !== 12 || plan.summary.controles_exhaustifs !== 12) throw new Error('Audit non exhaustif.');
if (plan.decisions.filter((d) => d.decision === 'retyper').length !== 5 || plan.decisions.filter((d) => d.decision === 'supprimer').length !== 1) throw new Error('Plan de mutation inattendu.');
if (plan.decisions.some((d) => !d.ancre_locale_exacte || !d.temoins_versets_lecture?.length)) throw new Error('Preuve d’audit manquante.');

const live = await fetchLive();
const before = snapshot('live-before', live);
if (stable(live.segments) !== stable(raw.segments) || stable(live.type4) !== stable(raw.links)
  || stable(live.affectedLinks) !== stable(raw.all_links_on_affected_segments)) {
  throw new Error(`Préétat différent du corpus audité. Snapshot : ${before}`);
}
if (!APPLY) {
  console.log(JSON.stringify({ ready: true, applied: false, snapshot: before, garde: 'Relancer avec --apply après validation humaine.', retypes: 5, suppressions: 1, type4_finaux_attendus: 6 }, null, 2));
  process.exit(0);
}

const old = new Map(raw.links.map((l) => [l.id, l]));
const predicate = (l) => [
  `id=${literal(l.id)}`, `segment_id=${literal(l.segment_id)}`,
  `canon_id is not distinct from ${literal(l.canon_id)}`, `verset_v2_id is not distinct from ${literal(l.verset_v2_id)}`,
  `livre is not distinct from ${literal(l.livre)}`, `chapitre is not distinct from ${literal(l.chapitre)}`,
  `type=${literal(l.type)}`, `fiabilite=${literal(l.fiabilite)}`,
  `motif is not distinct from ${literal(l.motif)}`, `provenance=${literal(l.provenance)}`,
  `arbitrage_requis=${literal(l.arbitrage_requis)}`,
].join(' and ');
const statements = [];
for (const d of plan.decisions) {
  if (d.decision === 'conserver') continue;
  const previous = old.get(d.link_id);
  if (!previous) throw new Error(`Lien absent : ${d.link_id}`);
  if (d.decision === 'supprimer') {
    statements.push(`delete from liens_bibliques where ${predicate(previous)}; if not found then raise exception 'delete ${d.link_id}'; end if; n_del:=n_del+1;`);
  } else {
    const motif = `${d.raison} Contrôle transversal type 4 : ancre et témoin consignés dans SS-Q22-39-TYPE4-TRANSVERSAL.json.`;
    statements.push(`update liens_bibliques set type=${literal(d.type_final)},motif=${literal(motif)},updated_at=now() where ${predicate(previous)}; if not found then raise exception 'retype ${d.link_id}'; end if; n_up:=n_up+1;`);
  }
}
const scopeIds = raw.segments.map((s) => s.id).join(',');
const sql = `do $audit$
declare n_up int:=0; n_del int:=0; n int;
begin
${statements.join('\n')}
if n_up<>5 or n_del<>1 then raise exception 'comptes mutations %, %',n_up,n_del; end if;
select count(*) into n from liens_bibliques where segment_id in(${scopeIds}) and type=4 and fiabilite='vérifié';
if n<>6 then raise exception 'types 4 finaux %',n; end if;
select count(*) into n from (
  select segment_id,type,canon_id,verset_v2_id,livre,chapitre,count(*)
  from liens_bibliques where segment_id in(${scopeIds})
  group by 1,2,3,4,5,6 having count(*)>1
) duplicates;
if n<>0 then raise exception 'doublons finaux %',n; end if;
end $audit$;`;
const { error } = await sb.rpc('exec_sql', { sql });
if (error) throw new Error(`Transaction annulée : ${error.message}`);
const after = await fetchLive();
const afterPath = snapshot('live-after', after);
if (after.segments.length !== 1100 || after.type4.length !== 6) throw new Error('Contrôle post-transaction inattendu.');
console.log(JSON.stringify({ applied: true, before, after: afterPath, type4_finaux: 6 }, null, 2));
