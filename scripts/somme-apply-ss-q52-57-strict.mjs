import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ROOT = 'tmp/somme-liens-audit-2026-07-29';
const raw = JSON.parse(readFileSync(`${ROOT}/ss-q52-57-raw.json`, 'utf8'));
const plan = JSON.parse(readFileSync(`${ROOT}/SS-Q52-57-DOSSIER-STRICT.json`, 'utf8'));
const APPLY = process.argv.includes('--apply');
const questions = Array.from({ length: 6 }, (_, i) => `Question ${i + 52}`);
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const canonical = (value) => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]))
    : value;
const stable = (value) => JSON.stringify(canonical(value));
const literal = (value) => value == null
  ? 'null'
  : typeof value === 'number'
    ? String(value)
    : typeof value === 'boolean'
      ? value ? 'true' : 'false'
      : `'${String(value).replaceAll("'", "''")}'`;
const must = async (query, label) => {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
};
const hash = (text) => createHash('sha256').update(text).digest('hex');
const snapshot = (label, segments, links) => {
  mkdirSync(ROOT, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
  const name = `Q52-57-${label}-${stamp}.json`;
  const payload = `${JSON.stringify({ segments, links }, null, 2)}\n`;
  writeFileSync(`${ROOT}/${name}`, payload);
  writeFileSync(`${ROOT}/${name}.sha256`, `${hash(payload)}  ${name}\n`);
  return `${ROOT}/${name}`;
};
const fetchLive = async () => {
  const segments = await must(
    sb.from('segments').select('*').eq('id_oeuvre', 'A0013O0002').eq('ref_niv1', 'Secunda Secundae')
      .in('ref_niv2', questions).order('segment_numero'),
    'segments live',
  );
  const links = [];
  for (let i = 0; i < segments.length; i += 100) {
    links.push(...await must(
      sb.from('liens_bibliques').select('*').in('segment_id', segments.slice(i, i + 100).map((s) => s.id)).order('id'),
      `liens live ${i}`,
    ));
  }
  links.sort((a, b) => a.id - b.id);
  return { segments, links };
};

if (raw.segments.length !== 245 || raw.links.length !== 77) throw new Error('Baseline brute inattendue.');
if (plan.decisions.length !== 77 || plan.insertions.length !== 27) throw new Error('Dossier incomplet.');
if (plan.summary.liens_finaux_proposes !== 102) throw new Error('Total final du dossier inattendu.');
if (plan.controle_deterministe.length < 15 || plan.controle_deterministe.filter((x) => x.type >= 3).length < 7) throw new Error('Sondage insuffisant.');
for (const item of [...plan.decisions.filter((x) => x.decision !== 'supprimer'), ...plan.insertions]) {
  if (!item.ancre_locale_exacte || !item.temoins_versets_lecture?.length) throw new Error('Preuve locale ou témoin manquant.');
}

const live = await fetchLive();
const before = snapshot('live-before', live.segments, live.links);
if (stable(live.segments) !== stable(raw.segments) || stable(live.links) !== stable(raw.links)) {
  throw new Error(`Préétat exact différent du corpus audité. Snapshot : ${before}`);
}
if (live.segments.some((s) => s.liens_revus_le || s.liens_revus_par)) throw new Error('Au moins un segment est déjà marqué comme revu.');

if (!APPLY) {
  console.log(JSON.stringify({
    ready: true,
    applied: false,
    reason: 'Garde active : relancer explicitement avec --apply après validation humaine.',
    snapshot: before,
    segments: 245,
    liens_avant: 77,
    mises_a_jour: 75,
    suppressions: 2,
    insertions: 27,
    liens_apres_attendus: 102,
  }, null, 2));
  process.exit(0);
}

const old = new Map(raw.links.map((link) => [link.id, link]));
const predicate = (link) => [
  `id=${literal(link.id)}`,
  `segment_id=${literal(link.segment_id)}`,
  `canon_id is not distinct from ${literal(link.canon_id)}`,
  `verset_v2_id is not distinct from ${literal(link.verset_v2_id)}`,
  `livre is not distinct from ${literal(link.livre)}`,
  `chapitre is not distinct from ${literal(link.chapitre)}`,
  `type=${literal(link.type)}`,
  `fiabilite=${literal(link.fiabilite)}`,
  `motif is not distinct from ${literal(link.motif)}`,
  `provenance=${literal(link.provenance)}`,
  `arbitrage_requis=${literal(link.arbitrage_requis)}`,
].join(' and ');
const statements = [];
for (const decision of plan.decisions) {
  const previous = old.get(decision.link_id);
  if (!previous) throw new Error(`Lien initial absent : ${decision.link_id}`);
  if (decision.decision === 'supprimer') {
    statements.push(`delete from liens_bibliques where ${predicate(previous)}; if not found then raise exception 'delete ${previous.id}'; end if; n_del:=n_del+1;`);
    continue;
  }
  const f = decision.final;
  statements.push(`update liens_bibliques set canon_id=${literal(f.canon_id)},verset_v2_id=null,livre=${literal(f.livre)},chapitre=${literal(f.chapitre)},type=${literal(f.type)},fiabilite='vérifié',motif=${literal(f.motif)},provenance='lecture',arbitrage_requis=false where ${predicate(previous)}; if not found then raise exception 'update ${previous.id}'; end if; n_up:=n_up+1;`);
}
for (const item of plan.insertions) {
  statements.push(`insert into liens_bibliques(segment_id,canon_id,verset_v2_id,livre,chapitre,type,fiabilite,motif,provenance,arbitrage_requis) values(${literal(item.segment_id)},${literal(item.canon_id)},null,null,null,${literal(item.type)},'vérifié',${literal(item.motif)},'lecture',false); n_ins:=n_ins+1;`);
}
const segmentIds = live.segments.map((s) => s.id).join(',');
const sql = `do $audit$
declare n_up int:=0; n_del int:=0; n_ins int:=0; n_mark int:=0; n int;
begin
${statements.join('\n')}
update segments set liens_revus_le=now(),liens_revus_par='IA-lecture' where id in(${segmentIds}) and liens_revus_le is null and liens_revus_par is null;
get diagnostics n_mark=row_count;
if n_up<>75 or n_del<>2 or n_ins<>27 or n_mark<>245 then raise exception 'comptes mutation %,%,%,%',n_up,n_del,n_ins,n_mark; end if;
select count(*) into n from liens_bibliques where segment_id in(${segmentIds});
if n<>102 then raise exception 'total final %',n; end if;
select count(*) into n from liens_bibliques where segment_id in(${segmentIds}) and (fiabilite<>'vérifié' or provenance<>'lecture' or arbitrage_requis);
if n<>0 then raise exception 'liens non vérifiés %',n; end if;
select count(*) into n from (
  select segment_id,type,canon_id,verset_v2_id,livre,chapitre,count(*)
  from liens_bibliques where segment_id in(${segmentIds})
  group by 1,2,3,4,5,6 having count(*)>1
) duplicates;
if n<>0 then raise exception 'doublons finaux %',n; end if;
end $audit$;`;

const { error } = await sb.rpc('exec_sql', { sql });
if (error) throw new Error(`Transaction annulée : ${error.message}`);
const afterLive = await fetchLive();
const after = snapshot('live-after', afterLive.segments, afterLive.links);
if (afterLive.segments.length !== 245 || afterLive.links.length !== 102) throw new Error('Contrôle post-transaction inattendu.');
if (afterLive.segments.some((s) => !s.liens_revus_le || s.liens_revus_par !== 'IA-lecture')) throw new Error('Marquage post-transaction incomplet.');
if (afterLive.links.some((l) => l.fiabilite !== 'vérifié' || l.provenance !== 'lecture' || l.arbitrage_requis)) throw new Error('Métadonnées finales invalides.');
console.log(JSON.stringify({ applied: true, before, after, segments: 245, liens: 102 }, null, 2));
