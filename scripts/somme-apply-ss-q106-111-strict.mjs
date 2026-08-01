import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ROOT = 'tmp/somme-liens-audit-2026-07-29';
const raw = JSON.parse(readFileSync(`${ROOT}/ss-q106-111-raw.json`, 'utf8'));
const plan = JSON.parse(readFileSync(`${ROOT}/SS-Q106-111-DOSSIER-STRICT.json`, 'utf8'));
const APPLY = process.argv.includes('--apply');
const questions = Array.from({ length: 6 }, (_, index) => `Question ${106 + index}`);
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const must = async (query, label) => { const { data, error } = await query; if (error) throw new Error(`${label}: ${error.message}`); return data; };
const canonical = (value) => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])])) : value;
const stable = (value) => JSON.stringify(canonical(value));
const literal = (value) => value == null ? 'null' : typeof value === 'number' ? `${value}` : typeof value === 'boolean' ? value ? 'true' : 'false' : `'${String(value).replaceAll("'", "''")}'`;

function snapshot(label, payload) {
  mkdirSync(ROOT, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
  const name = `Q106-111-${label}-${stamp}.json`;
  const text = `${JSON.stringify(payload, null, 2)}\n`;
  writeFileSync(`${ROOT}/${name}`, text);
  writeFileSync(`${ROOT}/${name}.sha256`, `${createHash('sha256').update(text).digest('hex')}  ${name}\n`);
  return `${ROOT}/${name}`;
}

async function readLive() {
  const segments = [];
  for (const question of questions) {
    for (let from = 0; ; from += 100) {
      const page = await must(sb.from('segments').select('*').eq('id_oeuvre', 'A0013O0002').eq('ref_niv1', 'Secunda Secundae').eq('ref_niv2', question).order('segment_numero').range(from, from + 99), `${question} ${from}`);
      segments.push(...page);
      if (page.length < 100) break;
    }
  }
  segments.sort((a, b) => a.segment_numero - b.segment_numero);
  const links = [];
  for (let from = 0; from < segments.length; from += 100) links.push(...await must(sb.from('liens_bibliques').select('*').in('segment_id', segments.slice(from, from + 100).map((segment) => segment.id)).order('id'), `liens ${from}`));
  links.sort((a, b) => a.id - b.id);
  return { segments, links };
}

if (raw.segments.length !== 270 || raw.links.length !== 60 || plan.decisions.length !== 60 || plan.insertions.length !== 34 || plan.summary.liens_finaux_proposes !== 94) throw new Error('Dossier incomplet.');
if (plan.controle_stratifie.length !== 24 || plan.controle_stratifie.filter((item) => item.type === 3 || item.type === 4).length !== 12) throw new Error('Contrôle stratifié incomplet.');
for (const item of [...plan.decisions, ...plan.insertions]) {
  if (!item.ancre_locale_exacte || !item.temoins_versets_lecture?.length) throw new Error('Preuve absente.');
  const final = item.final ?? item;
  if (!final.canon_id || final.verset_v2_id || final.livre || final.chapitre) throw new Error('cible_unique violée dans le plan.');
}

const beforeLive = await readLive();
const beforePath = snapshot('live-before', beforeLive);
if (stable(beforeLive.segments) !== stable(raw.segments) || stable(beforeLive.links) !== stable(raw.links)) throw new Error(`Préétat différent : ${beforePath}`);
if (beforeLive.segments.some((segment) => segment.liens_revus_le || segment.liens_revus_par)) throw new Error('Segments déjà marqués.');
if (!APPLY) {
  console.log(JSON.stringify({ ready: true, applied: false, database_mode: 'lecture seule', guard: '--apply requis ; option volontairement non exécutée', before: beforePath, segments: 270, updates: 60, inserts: 34, final: 94, checks: ['préétat exact', 'cible_unique', 'doublons', 'cibles mortes'] }, null, 2));
  process.exit(0);
}

const oldById = new Map(raw.links.map((link) => [link.id, link]));
const exactPredicate = (link) => Object.entries(link).map(([column, value]) => `${column} is not distinct from ${literal(value)}`).join(' and ');
const statements = [];
for (const decision of plan.decisions) {
  const old = oldById.get(decision.link_id);
  if (!old) throw new Error(`Lien initial absent : ${decision.link_id}`);
  const final = decision.final;
  statements.push(`update liens_bibliques set canon_id=${literal(final.canon_id)},verset_v2_id=null,livre=null,chapitre=null,type=${final.type},fiabilite='vérifié',motif=${literal(final.motif)},provenance='lecture',arbitrage_requis=false where ${exactPredicate(old)};if not found then raise exception 'update ${old.id}: prestate mismatch';end if;n_up:=n_up+1;`);
}
for (const insertion of plan.insertions) {
  const duplicate = `segment_id=${insertion.segment_id} and type=${insertion.type} and canon_id is not distinct from ${literal(insertion.canon_id)} and verset_v2_id is null and livre is null and chapitre is null`;
  statements.push(`if exists(select 1 from liens_bibliques where ${duplicate})then raise exception 'duplicate before insert ${insertion.id_proposition}';end if;insert into liens_bibliques(segment_id,canon_id,verset_v2_id,livre,chapitre,type,fiabilite,motif,provenance,arbitrage_requis)values(${insertion.segment_id},${literal(insertion.canon_id)},null,null,null,${insertion.type},'vérifié',${literal(insertion.motif)},'lecture',false);n_ins:=n_ins+1;`);
}
const segmentIds = beforeLive.segments.map((segment) => segment.id).join(',');
const sql = `do $audit$declare n_up int:=0;n_ins int:=0;n_mark int:=0;n int;begin
${statements.join('\n')}
update segments set liens_revus_le=now(),liens_revus_par='IA-lecture' where id in(${segmentIds}) and liens_revus_le is null and liens_revus_par is null;get diagnostics n_mark=row_count;
if n_up<>60 or n_ins<>34 or n_mark<>270 then raise exception 'counts %,%,%',n_up,n_ins,n_mark;end if;
select count(*) into n from liens_bibliques where segment_id in(${segmentIds});if n<>94 then raise exception 'final count %',n;end if;
select count(*) into n from liens_bibliques where segment_id in(${segmentIds}) and(canon_id is null or verset_v2_id is not null or livre is not null or chapitre is not null);if n<>0 then raise exception 'cible_unique %',n;end if;
select count(*) into n from(select segment_id,type,canon_id,verset_v2_id,livre,chapitre,count(*) from liens_bibliques where segment_id in(${segmentIds}) group by 1,2,3,4,5,6 having count(*)>1)d;if n<>0 then raise exception 'duplicates %',n;end if;
select count(*) into n from liens_bibliques l where l.segment_id in(${segmentIds}) and not exists(select 1 from versets_lecture v where v.id_verset=l.canon_id);if n<>0 then raise exception 'dead targets %',n;end if;
select count(*) into n from liens_bibliques where segment_id in(${segmentIds}) and(fiabilite<>'vérifié' or provenance<>'lecture' or arbitrage_requis);if n<>0 then raise exception 'metadata %',n;end if;
end$audit$;`;
const { error } = await sb.rpc('exec_sql', { sql });
if (error) throw new Error(`Transaction annulée : ${error.message}`);
const afterLive = await readLive();
const afterPath = snapshot('live-after', afterLive);
if (afterLive.segments.length !== 270 || afterLive.links.length !== 94) throw new Error(`Postétat inattendu : ${afterPath}`);
console.log(JSON.stringify({ applied: true, before: beforePath, after: afterPath, segments: 270, links: 94 }, null, 2));
