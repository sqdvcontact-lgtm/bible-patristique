import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const R = 'tmp/somme-liens-audit-2026-07-29';
const raw = JSON.parse(readFileSync(`${R}/tp-q11-20-raw.json`, 'utf8'));
const plan = JSON.parse(readFileSync(`${R}/TP-Q11-20-DOSSIER-STRICT.json`, 'utf8'));
const APPLY = process.argv.includes('--apply');
const questions = Array.from({ length: 10 }, (_, i) => `Question ${11 + i}`);
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(x => x.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const must = async (q, label) => { const { data, error } = await q; if (error) throw new Error(`${label}: ${error.message}`); return data; };
const canon = v => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v;
const stable = v => JSON.stringify(canon(v));
const lit = v => v == null ? 'null' : typeof v === 'number' ? `${v}` : typeof v === 'boolean' ? (v ? 'true' : 'false') : `'${String(v).replaceAll("'", "''")}'`;
const fields = x => ({ segment_id: x.segment_id, canon_id: x.canon_id, verset_v2_id: x.verset_v2_id, livre: x.livre, chapitre: x.chapitre, type: x.type, fiabilite: x.fiabilite, motif: x.motif, provenance: x.provenance, arbitrage_requis: x.arbitrage_requis });
const tuple = x => stable(fields(x));

function snapshot(label, payload) {
  mkdirSync(R, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
  const name = `TP-Q11-20-${label}-${stamp}.json`, body = JSON.stringify(payload, null, 2) + '\n';
  writeFileSync(`${R}/${name}`, body); writeFileSync(`${R}/${name}.sha256`, `${createHash('sha256').update(body).digest('hex')}  ${name}\n`);
  return `${R}/${name}`;
}
async function live() {
  const segments = [];
  for (const q of questions) for (let from = 0; ; from += 100) {
    const page = await must(sb.from('segments').select('*').eq('id_oeuvre', 'A0013O0002').eq('ref_niv1', 'Tertia Pars').eq('ref_niv2', q).order('segment_numero').range(from, from + 99), `${q} ${from}`);
    segments.push(...page); if (page.length < 100) break;
  }
  segments.sort((a, b) => a.segment_numero - b.segment_numero);
  const links = [];
  for (let from = 0; from < segments.length; from += 100) links.push(...await must(sb.from('liens_bibliques').select('*').in('segment_id', segments.slice(from, from + 100).map(s => s.id)).order('id'), `liens ${from}`));
  links.sort((a, b) => a.id - b.id); return { segments, links };
}
function desiredRows() {
  return [...plan.decisions.filter(d => d.decision !== 'supprimer').map(d => ({ segment_id: d.segment_id, ...d.final })), ...plan.insertions];
}
function isDesired(state) {
  if (state.segments.length !== 582 || state.links.length !== 149 || state.segments.some(s => !s.liens_revus_le || !s.liens_revus_par)) return false;
  const a = state.links.map(tuple).sort(), b = desiredRows().map(tuple).sort(); return stable(a) === stable(b);
}
if (raw.segments.length !== 582 || raw.links.length !== 126 || plan.decisions.length !== 126 || plan.insertions.length !== 25 || plan.summary.liens_finaux_proposes !== 149) throw new Error('Dossier incomplet');
if (plan.controle_stratifie.length !== 30 || plan.controle_stratifie.filter(x => x.type >= 3).length !== 15) throw new Error('Contrôle stratifié incomplet');
for (const d of plan.decisions) if (!d.ancre_locale_exacte || (d.decision !== 'supprimer' && (!d.temoins_versets_lecture?.length || !d.final.canon_id || d.final.verset_v2_id || d.final.livre || d.final.chapitre))) throw new Error(`Décision incomplète ${d.link_id}`);
for (const a of plan.insertions) if (!a.ancre_locale_exacte || !a.temoins_versets_lecture?.length || !a.canon_id || a.verset_v2_id || a.livre || a.chapitre) throw new Error(`Ajout incomplet ${a.id_proposition}`);

const beforeLive = await live(), before = snapshot('live-before', beforeLive);
const exactRaw = stable(beforeLive.segments) === stable(raw.segments) && stable(beforeLive.links) === stable(raw.links);
const alreadyDesired = isDesired(beforeLive);
if (!exactRaw && !alreadyDesired) throw new Error(`État live ni préétat exporté ni état final idempotent : ${before}`);
if (!APPLY) {
  console.log(JSON.stringify({ ready: true, applied: false, noop_if_applied: alreadyDesired, database_mode: 'lecture seule', guard: '--apply requis ; option non exécutée', before, segments: 582, updates: 124, deletes: 2, inserts_max: 25, final: 149, checks: ['export paginé exact', 'préétat ou état final idempotent', 'cible canonique exclusive', 'doublons', 'cibles mortes', 'métadonnées', '30 contrôles dont 15 T3/T4'] }, null, 2));
  process.exit(0);
}
if (alreadyDesired) { console.log(JSON.stringify({ applied: false, noop: true, before, links: 149 }, null, 2)); process.exit(0); }

const pred = row => Object.entries(row).map(([k, v]) => `${k} is not distinct from ${lit(v)}`).join(' and ');
const sqls = [];
for (const d of plan.decisions) {
  if (d.decision === 'supprimer') { sqls.push(`delete from liens_bibliques where id=${d.link_id} and ${pred(d.avant)};`); continue; }
  const f = d.final;
  sqls.push(`update liens_bibliques set canon_id=${lit(f.canon_id)},verset_v2_id=null,livre=null,chapitre=null,type=${f.type},fiabilite='vérifié',motif=${lit(f.motif)},provenance='lecture',arbitrage_requis=false where id=${d.link_id} and (${pred(d.avant)} or ${pred({ id: d.link_id, ...fields({ segment_id: d.segment_id, ...f }) })});`);
}
for (const a of plan.insertions) {
  const k = `segment_id=${a.segment_id} and type=${a.type} and canon_id=${lit(a.canon_id)} and verset_v2_id is null and livre is null and chapitre is null`;
  sqls.push(`if not exists(select 1 from liens_bibliques where ${k}) then insert into liens_bibliques(segment_id,canon_id,verset_v2_id,livre,chapitre,type,fiabilite,motif,provenance,arbitrage_requis) values(${a.segment_id},${lit(a.canon_id)},null,null,null,${a.type},'vérifié',${lit(a.motif)},'lecture',false); end if;`);
}
const ids = beforeLive.segments.map(s => s.id).join(',');
const sql = `do $audit$ declare n int; begin ${sqls.join('\n')} update segments set liens_revus_le=coalesce(liens_revus_le,now()),liens_revus_par=coalesce(liens_revus_par,'IA-lecture') where id in(${ids}); select count(*) into n from liens_bibliques where segment_id in(${ids}); if n<>149 then raise exception 'final %',n; end if; select count(*) into n from liens_bibliques where segment_id in(${ids}) and (canon_id is null or verset_v2_id is not null or livre is not null or chapitre is not null); if n<>0 then raise exception 'cible exclusive %',n; end if; select count(*) into n from (select segment_id,type,canon_id,verset_v2_id,livre,chapitre,count(*) from liens_bibliques where segment_id in(${ids}) group by 1,2,3,4,5,6 having count(*)>1)d; if n<>0 then raise exception 'doublons %',n; end if; select count(*) into n from liens_bibliques l where l.segment_id in(${ids}) and not exists(select 1 from versets_lecture v where v.id_verset=l.canon_id); if n<>0 then raise exception 'cibles mortes %',n; end if; end $audit$;`;
const { error } = await sb.rpc('exec_sql', { sql }); if (error) throw new Error(`Transaction annulée : ${error.message}`);
const afterLive = await live(), after = snapshot('live-after', afterLive); if (!isDesired(afterLive)) throw new Error(`Postétat non conforme : ${after}`);
console.log(JSON.stringify({ applied: true, before, after, segments: 582, links: 149 }, null, 2));
