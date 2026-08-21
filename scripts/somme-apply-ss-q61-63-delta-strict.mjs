import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ROOT = 'tmp/somme-liens-audit-2026-07-29';
const baseline = JSON.parse(readFileSync(`${ROOT}/SS-Q61-63-LIVE-CURRENT.json`, 'utf8'));
const plan = JSON.parse(readFileSync(`${ROOT}/SS-Q61-63-DOSSIER-STRICT.json`, 'utf8'));
const APPLY = process.argv.includes('--apply');
const questions = ['Question 61', 'Question 62', 'Question 63'];
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const canonical = (value) => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])])) : value;
const stable = (value) => JSON.stringify(canonical(value));
const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const literal = (value) => value == null ? 'null' : typeof value === 'number' ? String(value)
  : typeof value === 'boolean' ? value ? 'true' : 'false' : `'${String(value).replaceAll("'", "''")}'`;
const must = async (query, label) => { const { data, error } = await query; if (error) throw new Error(`${label}: ${error.message}`); return data; };
const fetchLive = async () => {
  const segments = [];
  for (let from = 0; ; from += 100) {
    const page = await must(sb.from('segments').select('*').eq('id_oeuvre', 'A0013O0002').eq('ref_niv1', 'Secunda Secundae')
      .in('ref_niv2', questions).order('segment_numero').range(from, from + 99), `segments page ${from / 100 + 1}`);
    segments.push(...page); if (page.length < 100) break;
  }
  const links = [];
  for (let offset = 0; offset < segments.length; offset += 100) {
    const ids = segments.slice(offset, offset + 100).map((segment) => segment.id);
    for (let from = 0; ; from += 100) {
      const page = await must(sb.from('liens_bibliques').select('*').in('segment_id', ids).order('id').range(from, from + 99), `liens lot ${offset} page ${from / 100 + 1}`);
      links.push(...page); if (page.length < 100) break;
    }
  }
  links.sort((a, b) => a.id - b.id);
  return { segments, links };
};

if (baseline.segments.length !== 155 || baseline.links.length !== 56) throw new Error('Baseline courante inattendue.');
if (hash(baseline.segments) !== '9bb54ec9f1bf3963a586fd22fa5c61d0fbb63cec32773fc1fda6febc67ad7736') throw new Error('Hash segments courant inattendu.');
if (hash(baseline.links) !== 'db7a4a12b79a4dc7a3476da4bfbf62c9a6a5fde0c0f5c0a126f791c0b2f5c8f0') throw new Error('Hash liens courant inattendu.');
if (plan.decisions.length !== 56 || plan.insertions.length !== 1 || plan.summary.liens_finaux_proposes !== 57) throw new Error('Plan delta incomplet.');
if (plan.decisions.filter((item) => item.decision === 'mettre_a_jour').length !== 1 || plan.decisions.find((item) => item.decision === 'mettre_a_jour')?.link_id !== 54949) throw new Error('Delta de correction inattendu.');
if (plan.controle_stratifie.length < 15 || plan.controle_stratifie.filter((item) => item.type === 3 || item.type === 4).length < 5) throw new Error('Contrôle insuffisant.');
for (const item of [...plan.decisions, ...plan.insertions]) if (!item.ancre_locale_exacte || item.temoins_versets_lecture?.length !== 3) throw new Error('Preuves incomplètes.');

const live = await fetchLive();
if (stable(live.segments) !== stable(baseline.segments) || stable(live.links) !== stable(baseline.links)) throw new Error('Préétat exact courant modifié ; transaction interdite.');
if (live.segments.some((segment) => !segment.liens_revus_le || segment.liens_revus_par !== 'IA-lecture')) throw new Error('Marquage courant inattendu.');
if (!APPLY) {
  const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
  const name = `Q61-63-delta-live-before-${stamp}.json`;
  writeFileSync(`${ROOT}/${name}`, `${JSON.stringify(live, null, 2)}\n`);
  console.log(JSON.stringify({ ready: true, applied: false, reason: 'Garde active : relancer explicitement avec --apply après validation humaine.', snapshot: `${ROOT}/${name}`,
    segments: 155, liens_avant: 56, mises_a_jour: 1, insertions: 1, liens_apres_attendus: 57 }, null, 2));
  process.exit(0);
}

const decision = plan.decisions.find((item) => item.link_id === 54949);
const insertion = plan.insertions[0];
const old = decision.avant;
const predicate = [
  `id=${literal(old.id)}`, `segment_id=${literal(old.segment_id)}`, `canon_id is not distinct from ${literal(old.canon_id)}`,
  `verset_v2_id is not distinct from ${literal(old.verset_v2_id)}`, `livre is not distinct from ${literal(old.livre)}`,
  `chapitre is not distinct from ${literal(old.chapitre)}`, `type=${literal(old.type)}`, `fiabilite=${literal(old.fiabilite)}`,
  `motif is not distinct from ${literal(old.motif)}`, `provenance=${literal(old.provenance)}`,
  `arbitrage_requis=${literal(old.arbitrage_requis)}`, `created_at=${literal(old.created_at)}`, `updated_at=${literal(old.updated_at)}`,
].join(' and ');
const duplicatePredicate = [
  `segment_id=${literal(insertion.segment_id)}`, `type=${literal(insertion.type)}`,
  `canon_id is not distinct from ${literal(insertion.canon_id)}`, `verset_v2_id is null`, `livre is null`, `chapitre is null`,
].join(' and ');
const f = decision.final;
const sql = `do $audit$
declare n_up int:=0; n_ins int:=0; n int;
begin
update liens_bibliques set canon_id=${literal(f.canon_id)},verset_v2_id=null,livre=null,chapitre=null,type=1,fiabilite='vérifié',motif=${literal(f.motif)},provenance='lecture',arbitrage_requis=false where ${predicate};
if not found then raise exception 'update 54949'; end if; n_up:=n_up+1;
if exists(select 1 from liens_bibliques where ${duplicatePredicate}) then raise exception 'doublon insertion delta'; end if;
insert into liens_bibliques(segment_id,canon_id,verset_v2_id,livre,chapitre,type,fiabilite,motif,provenance,arbitrage_requis)
values(${literal(insertion.segment_id)},${literal(insertion.canon_id)},null,null,null,3,'vérifié',${literal(insertion.motif)},'lecture',false); n_ins:=n_ins+1;
if n_up<>1 or n_ins<>1 then raise exception 'comptes mutation %, %',n_up,n_ins; end if;
select count(*) into n from liens_bibliques where segment_id in(${live.segments.map((segment) => segment.id).join(',')}); if n<>57 then raise exception 'total final %',n; end if;
select count(*) into n from (select segment_id,type,canon_id,verset_v2_id,livre,chapitre,count(*) from liens_bibliques where segment_id in(${live.segments.map((segment) => segment.id).join(',')}) group by 1,2,3,4,5,6 having count(*)>1) duplicates; if n<>0 then raise exception 'doublons finaux %',n; end if;
end $audit$;`;
const { error } = await sb.rpc('exec_sql', { sql });
if (error) throw new Error(`Transaction annulée : ${error.message}`);
const after = await fetchLive();
if (after.links.length !== 57) throw new Error('Total post-transaction inattendu.');
console.log(JSON.stringify({ applied: true, segments: 155, liens: 57 }, null, 2));
