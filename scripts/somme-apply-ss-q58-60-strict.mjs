import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ROOT = 'tmp/somme-liens-audit-2026-07-29';
const rawAll = JSON.parse(readFileSync(`${ROOT}/SS-Q58-63-RAW.json`, 'utf8'));
const plan = JSON.parse(readFileSync(`${ROOT}/SS-Q58-60-DOSSIER-STRICT.json`, 'utf8'));
const APPLY = process.argv.includes('--apply');
const questions = ['Question 58', 'Question 59', 'Question 60'];
const rawSegments = rawAll.segments.filter((segment) => questions.includes(segment.ref_niv2));
const rawSegmentIds = new Set(rawSegments.map((segment) => segment.id));
const rawLinks = rawAll.links.filter((link) => rawSegmentIds.has(link.segment_id)).sort((a, b) => a.id - b.id);
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
const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const snapshot = (label, segments, links) => {
  mkdirSync(ROOT, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
  const name = `Q58-60-${label}-${stamp}.json`;
  const payload = `${JSON.stringify({ segments, links }, null, 2)}\n`;
  writeFileSync(`${ROOT}/${name}`, payload);
  writeFileSync(`${ROOT}/${name}.sha256`, `${createHash('sha256').update(payload).digest('hex')}  ${name}\n`);
  return `${ROOT}/${name}`;
};

const fetchLive = async () => {
  const segments = [];
  for (let from = 0; ; from += 100) {
    const page = await must(
      sb.from('segments').select('*').eq('id_oeuvre', 'A0013O0002').eq('ref_niv1', 'Secunda Secundae')
        .in('ref_niv2', questions).order('segment_numero').range(from, from + 99),
      `segments live page ${from / 100 + 1}`,
    );
    segments.push(...page);
    if (page.length < 100) break;
  }
  const links = [];
  for (let offset = 0; offset < segments.length; offset += 100) {
    const ids = segments.slice(offset, offset + 100).map((segment) => segment.id);
    for (let from = 0; ; from += 100) {
      const page = await must(
        sb.from('liens_bibliques').select('*').in('segment_id', ids).order('id').range(from, from + 99),
        `liens live segments ${offset}-${offset + ids.length - 1}, page ${from / 100 + 1}`,
      );
      links.push(...page);
      if (page.length < 100) break;
    }
  }
  links.sort((a, b) => a.id - b.id);
  return { segments, links };
};

if (rawSegments.length !== 203 || rawLinks.length !== 34) throw new Error('Baseline brute inattendue.');
if (hash(rawSegments) !== 'c6f13da51c97d5da07c78dd80fd2aaec8e59ed534dd3a0d0b6f7d4804a41446b') throw new Error('Hash segments baseline inattendu.');
if (hash(rawLinks) !== '25c34df3094487432b0a144b5ee4a795784874fb65a740f1105bc5569a111585') throw new Error('Hash liens baseline inattendu.');
if (plan.decisions.length !== 34 || plan.insertions.length !== 20) throw new Error('Dossier incomplet.');
if (plan.summary.liens_finaux_proposes !== 53) throw new Error('Total final du dossier inattendu.');
if (plan.controle_stratifie.length < 15 || plan.controle_stratifie.filter((item) => item.type === 3 || item.type === 4).length < 5) throw new Error('Contrôle stratifié insuffisant.');
for (const item of [...plan.decisions, ...plan.insertions]) {
  if (!item.ancre_locale_exacte || item.temoins_versets_lecture?.length !== 3) throw new Error('Preuve locale ou témoins incomplets.');
  if (item.temoins_versets_lecture.some((witness) => !['TR0001', 'TR0003', 'TR0004'].includes(witness.edition) || !witness.texte)) throw new Error('Témoin versets_lecture invalide.');
}

const live = await fetchLive();
const before = snapshot('live-before', live.segments, live.links);
if (stable(live.segments) !== stable(rawSegments) || stable(live.links) !== stable(rawLinks)) {
  throw new Error(`Préétat exact différent du corpus audité. Snapshot : ${before}`);
}
if (live.segments.some((segment) => segment.liens_revus_le || segment.liens_revus_par)) throw new Error('Au moins un segment est déjà marqué comme revu.');

if (!APPLY) {
  console.log(JSON.stringify({
    ready: true,
    applied: false,
    reason: 'Garde active : relancer explicitement avec --apply après validation humaine.',
    snapshot: before,
    pagination_segments: [100, 100, 3],
    pagination_liens: [34],
    segments: 203,
    liens_avant: 34,
    mises_a_jour: 33,
    suppressions: 1,
    insertions: 20,
    liens_apres_attendus: 53,
  }, null, 2));
  process.exit(0);
}

const oldById = new Map(rawLinks.map((link) => [link.id, link]));
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
  `created_at=${literal(link.created_at)}`,
  `updated_at=${literal(link.updated_at)}`,
].join(' and ');
const targetPredicate = (item) => [
  `segment_id=${literal(item.segment_id)}`,
  `type=${literal(item.type)}`,
  `canon_id is not distinct from ${literal(item.canon_id)}`,
  `verset_v2_id is not distinct from ${literal(item.verset_v2_id)}`,
  `livre is not distinct from ${literal(item.livre)}`,
  `chapitre is not distinct from ${literal(item.chapitre)}`,
].join(' and ');
const statements = [];
for (const decision of plan.decisions) {
  const previous = oldById.get(decision.link_id);
  if (!previous || stable(previous) !== stable(decision.avant)) throw new Error(`Préétat de décision invalide : ${decision.link_id}`);
  if (decision.decision === 'supprimer') {
    statements.push(`delete from liens_bibliques where ${predicate(previous)}; if not found then raise exception 'delete ${previous.id}'; end if; n_del:=n_del+1;`);
    continue;
  }
  const final = decision.final;
  statements.push(`update liens_bibliques set canon_id=${literal(final.canon_id)},verset_v2_id=null,livre=${literal(final.livre)},chapitre=${literal(final.chapitre)},type=${literal(final.type)},fiabilite='vérifié',motif=${literal(final.motif)},provenance='lecture',arbitrage_requis=false where ${predicate(previous)}; if not found then raise exception 'update ${previous.id}'; end if; n_up:=n_up+1;`);
}
for (const item of plan.insertions) {
  statements.push(`if exists(select 1 from liens_bibliques where ${targetPredicate(item)}) then raise exception 'doublon insertion ${item.id_proposition}'; end if; insert into liens_bibliques(segment_id,canon_id,verset_v2_id,livre,chapitre,type,fiabilite,motif,provenance,arbitrage_requis) values(${literal(item.segment_id)},${literal(item.canon_id)},null,null,null,${literal(item.type)},'vérifié',${literal(item.motif)},'lecture',false); n_ins:=n_ins+1;`);
}

const segmentIdList = live.segments.map((segment) => segment.id).join(',');
const sql = `do $audit$
declare n_up int:=0; n_del int:=0; n_ins int:=0; n_mark int:=0; n int;
begin
${statements.join('\n')}
update segments set liens_revus_le=now(),liens_revus_par='IA-lecture' where id in(${segmentIdList}) and liens_revus_le is null and liens_revus_par is null;
get diagnostics n_mark=row_count;
if n_up<>33 or n_del<>1 or n_ins<>20 or n_mark<>203 then raise exception 'comptes mutation %,%,%,%',n_up,n_del,n_ins,n_mark; end if;
select count(*) into n from liens_bibliques where segment_id in(${segmentIdList});
if n<>53 then raise exception 'total final %',n; end if;
select count(*) into n from liens_bibliques where segment_id in(${segmentIdList}) and (fiabilite<>'vérifié' or provenance<>'lecture' or arbitrage_requis);
if n<>0 then raise exception 'métadonnées finales invalides %',n; end if;
select count(*) into n from (
  select segment_id,type,canon_id,verset_v2_id,livre,chapitre,count(*)
  from liens_bibliques where segment_id in(${segmentIdList})
  group by 1,2,3,4,5,6 having count(*)>1
) duplicates;
if n<>0 then raise exception 'doublons finaux %',n; end if;
select count(*) into n from liens_bibliques l left join versets_canon v on v.id=l.canon_id where l.segment_id in(${segmentIdList}) and l.canon_id is not null and v.id is null;
if n<>0 then raise exception 'cibles mortes %',n; end if;
end $audit$;`;

const { error } = await sb.rpc('exec_sql', { sql });
if (error) throw new Error(`Transaction annulée : ${error.message}`);
const afterLive = await fetchLive();
const after = snapshot('live-after', afterLive.segments, afterLive.links);
if (afterLive.segments.length !== 203 || afterLive.links.length !== 53) throw new Error('Contrôle post-transaction inattendu.');
if (afterLive.segments.some((segment) => !segment.liens_revus_le || segment.liens_revus_par !== 'IA-lecture')) throw new Error('Marquage post-transaction incomplet.');
if (afterLive.links.some((link) => link.fiabilite !== 'vérifié' || link.provenance !== 'lecture' || link.arbitrage_requis)) throw new Error('Métadonnées finales invalides.');
console.log(JSON.stringify({ applied: true, before, after, segments: 203, liens: 53 }, null, 2));
