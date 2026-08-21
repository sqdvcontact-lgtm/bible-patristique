import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ROOT = 'tmp/somme-liens-audit-2026-07-29';
const raw = JSON.parse(readFileSync(`${ROOT}/ss-q70-75-raw.json`, 'utf8'));
const plan = JSON.parse(readFileSync(`${ROOT}/SS-Q70-75-DOSSIER-STRICT.json`, 'utf8'));
const APPLY = process.argv.includes('--apply');
const questions = Array.from({ length: 6 }, (_, i) => `Question ${i + 70}`);
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const must = async (query, label) => { const { data, error } = await query; if (error) throw new Error(`${label}: ${error.message}`); return data; };
const canonical = (v) => Array.isArray(v) ? v.map(canonical) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonical(v[k])])) : v;
const stable = (v) => JSON.stringify(canonical(v));
const literal = (v) => v == null ? 'null' : typeof v === 'number' ? String(v) : typeof v === 'boolean' ? v ? 'true' : 'false' : `'${String(v).replaceAll("'", "''")}'`;
const snapshot = (label, payload) => {
  mkdirSync(ROOT, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
  const name = `Q70-75-${label}-${stamp}.json`;
  const text = `${JSON.stringify(payload, null, 2)}\n`;
  writeFileSync(`${ROOT}/${name}`, text);
  writeFileSync(`${ROOT}/${name}.sha256`, `${createHash('sha256').update(text).digest('hex')}  ${name}\n`);
  return `${ROOT}/${name}`;
};
const fetchLive = async () => {
  const segments = [];
  for (const question of questions) {
    segments.push(...await must(sb.from('segments').select('*').eq('id_oeuvre', 'A0013O0002').eq('ref_niv1', 'Secunda Secundae').eq('ref_niv2', question).order('segment_numero'), `segments ${question}`));
  }
  segments.sort((a, b) => a.segment_numero - b.segment_numero);
  const links = [];
  for (let i = 0; i < segments.length; i += 100) {
    links.push(...await must(sb.from('liens_bibliques').select('*').in('segment_id', segments.slice(i, i + 100).map((s) => s.id)).order('id'), `liens ${i}`));
  }
  links.sort((a, b) => a.id - b.id);
  return { segments, links };
};

if (raw.segments.length !== 191 || raw.links.length !== 72 || plan.decisions.length !== 72 || plan.insertions.length !== 46) throw new Error('Dossier ou baseline incomplet.');
if (plan.summary.liens_finaux_verifies_proposes !== 112 || plan.controle_stratifie.length < 20 || plan.controle_stratifie.filter((x) => x.type >= 3).length < 8) throw new Error('Contrôles du dossier insuffisants.');
for (const item of [...plan.decisions, ...plan.insertions]) if (!item.ancre_locale_exacte || !item.temoins_versets_lecture?.length) throw new Error('Ancre ou témoin absent.');

const live = await fetchLive();
const before = snapshot('live-before', live);
if (stable(live.segments) !== stable(raw.segments) || stable(live.links) !== stable(raw.links)) throw new Error(`Préétat exact différent. Snapshot : ${before}`);
if (live.segments.some((s) => s.liens_revus_le || s.liens_revus_par)) throw new Error('Segments déjà marqués.');
if (!APPLY) {
  console.log(JSON.stringify({ ready: true, applied: false, garde: 'Relancer avec --apply après validation humaine.', snapshot: before, segments: 191, liens_avant: 72, mises_a_jour: 66, suppressions: 6, insertions: 46, liens_apres_attendus: 112 }, null, 2));
  process.exit(0);
}

const old = new Map(raw.links.map((l) => [l.id, l]));
const predicate = (l) => [
  `id=${literal(l.id)}`, `segment_id=${literal(l.segment_id)}`, `canon_id is not distinct from ${literal(l.canon_id)}`,
  `verset_v2_id is not distinct from ${literal(l.verset_v2_id)}`, `livre is not distinct from ${literal(l.livre)}`,
  `chapitre is not distinct from ${literal(l.chapitre)}`, `type=${literal(l.type)}`, `fiabilite=${literal(l.fiabilite)}`,
  `motif is not distinct from ${literal(l.motif)}`, `provenance=${literal(l.provenance)}`, `arbitrage_requis=${literal(l.arbitrage_requis)}`,
].join(' and ');
const statements = [];
for (const d of plan.decisions) {
  const previous = old.get(d.link_id);
  if (!previous) throw new Error(`Lien absent ${d.link_id}`);
  if (d.decision === 'supprimer') {
    statements.push(`delete from liens_bibliques where ${predicate(previous)}; if not found then raise exception 'delete ${d.link_id}'; end if; n_del:=n_del+1;`);
  } else {
    const f = d.final;
    statements.push(`update liens_bibliques set canon_id=${literal(f.canon_id)},verset_v2_id=null,livre=null,chapitre=null,type=${literal(f.type)},fiabilite='vérifié',motif=${literal(f.motif)},provenance='lecture',arbitrage_requis=false where ${predicate(previous)}; if not found then raise exception 'update ${d.link_id}'; end if; n_up:=n_up+1;`);
  }
}
for (const a of plan.insertions) {
  statements.push(`insert into liens_bibliques(segment_id,canon_id,verset_v2_id,livre,chapitre,type,fiabilite,motif,provenance,arbitrage_requis) values(${literal(a.segment_id)},${literal(a.canon_id)},null,null,null,${literal(a.type)},'vérifié',${literal(a.motif)},'lecture',false); n_ins:=n_ins+1;`);
}
const ids = live.segments.map((s) => s.id).join(',');
const sql = `do $audit$
declare n_up int:=0; n_del int:=0; n_ins int:=0; n_mark int:=0; n int;
begin
${statements.join('\n')}
update segments set liens_revus_le=now(),liens_revus_par='IA-lecture' where id in(${ids}) and liens_revus_le is null and liens_revus_par is null;
get diagnostics n_mark=row_count;
if n_up<>66 or n_del<>6 or n_ins<>46 or n_mark<>191 then raise exception 'comptes %,%,%,%',n_up,n_del,n_ins,n_mark; end if;
select count(*) into n from liens_bibliques where segment_id in(${ids}); if n<>112 then raise exception 'total final %',n; end if;
select count(*) into n from liens_bibliques where segment_id in(${ids}) and (fiabilite<>'vérifié' or provenance<>'lecture' or arbitrage_requis); if n<>0 then raise exception 'métadonnées non vérifiées %',n; end if;
select count(*) into n from (select segment_id,type,canon_id,verset_v2_id,livre,chapitre,count(*) from liens_bibliques where segment_id in(${ids}) group by 1,2,3,4,5,6 having count(*)>1) duplicates;
if n<>0 then raise exception 'doublons finaux %',n; end if;
end $audit$;`;
const { error } = await sb.rpc('exec_sql', { sql });
if (error) throw new Error(`Transaction annulée : ${error.message}`);
const afterLive = await fetchLive();
const after = snapshot('live-after', afterLive);
if (afterLive.segments.length !== 191 || afterLive.links.length !== 112) throw new Error('Contrôle post-transaction inattendu.');
if (afterLive.segments.some((s) => !s.liens_revus_le || s.liens_revus_par !== 'IA-lecture')) throw new Error('Marquage incomplet.');
console.log(JSON.stringify({ applied: true, before, after, segments: 191, liens: 112 }, null, 2));
