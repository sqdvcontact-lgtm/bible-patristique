import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ROOT = 'tmp/somme-liens-audit-2026-07-29';
const raw = JSON.parse(readFileSync(`${ROOT}/ss-q171-176-raw.json`, 'utf8'));
const plan = JSON.parse(readFileSync(`${ROOT}/SS-Q171-176-DOSSIER-STRICT.json`, 'utf8'));
const APPLY = process.argv.includes('--apply');
const questions = Array.from({ length: 6 }, (_, i) => `Question ${171 + i}`);
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).map((x) => x.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const canon = (v) => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])) : v;
const stable = (v) => JSON.stringify(canon(v));
const hash = (v) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const lit = (v) => v == null ? 'null' : typeof v === 'number' ? String(v) : typeof v === 'boolean' ? (v ? 'true' : 'false') : `'${String(v).replaceAll("'", "''")}'`;
const must = async (q, label) => { const { data, error } = await q; if (error) throw new Error(`${label}: ${error.message}`); return data; };
const snapshot = (label, segments, links) => { mkdirSync(ROOT, { recursive: true }); const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-'); const name = `Q171-176-${label}-${stamp}.json`; const payload = `${JSON.stringify({ segments, links }, null, 2)}\n`; writeFileSync(`${ROOT}/${name}`, payload); writeFileSync(`${ROOT}/${name}.sha256`, `${createHash('sha256').update(payload).digest('hex')}  ${name}\n`); return `${ROOT}/${name}`; };
const fetchLive = async () => {
  const segments = [];
  for (let from = 0; ; from += 100) { const page = await must(sb.from('segments').select('*').eq('id_oeuvre', 'A0013O0002').eq('ref_niv1', 'Secunda Secundae').in('ref_niv2', questions).order('segment_numero').range(from, from + 99), `segments ${from}`); segments.push(...page); if (page.length < 100) break; }
  const links = [];
  for (let off = 0; off < segments.length; off += 100) { const ids = segments.slice(off, off + 100).map((s) => s.id); for (let from = 0; ; from += 100) { const page = await must(sb.from('liens_bibliques').select('*').in('segment_id', ids).order('id').range(from, from + 99), `liens ${off}/${from}`); links.push(...page); if (page.length < 100) break; } }
  links.sort((a, b) => a.id - b.id);
  return { segments, links };
};

if (raw.segments.length !== 319 || raw.links.length !== 143 || hash(raw.segments) !== '9d0f1bfbc37b7da6fbc2294a6f7bdd7fe14369f159536afcf96a6912efc57fac' || hash(raw.links) !== '3d612eb9723979007961f2b211eebdeac1613671213a8aa91a20299e37d150c6') throw new Error('Baseline/hash inattendu');
if (plan.decisions.length !== 143 || plan.insertions.length !== 85 || plan.summary.liens_finaux_proposes !== 227 || plan.summary.liens_supprimes !== 1) throw new Error('Dossier incomplet');
if (plan.controle_stratifie.length < 24 || plan.controle_stratifie.filter((x) => x.type === 3 || x.type === 4).length * 2 < plan.controle_stratifie.length) throw new Error('Contrôle stratifié insuffisant');
const retained = plan.decisions.filter((d) => d.decision !== 'supprimer').map((d) => ({ segment_id: d.segment_id, ...d.final }));
const planned = [...retained, ...plan.insertions];
const uniqueKey = (x) => `${x.segment_id}|${x.type}|${x.canon_id ?? ''}|${x.verset_v2_id ?? ''}|${x.livre ?? ''}|${x.chapitre ?? ''}`;
if (new Set(planned.map(uniqueKey)).size !== planned.length) throw new Error('cible_unique violée');
for (const x of planned) if (x.canon_id && (x.verset_v2_id != null || x.livre != null || x.chapitre != null)) throw new Error('Secondaire non nul avec canon_id');
for (const d of plan.decisions) if (!d.ancre_locale_exacte || (d.decision !== 'supprimer' && (!d.final?.motif || !d.temoins_versets_lecture?.length || d.temoins_versets_lecture.some((w) => !w.texte)))) throw new Error(`Preuve décision incomplète ${d.link_id}`);
for (const x of plan.insertions) if (!x.ancre_locale_exacte || !x.motif || !x.temoins_versets_lecture?.length || x.temoins_versets_lecture.some((w) => !w.texte)) throw new Error(`Preuve insertion incomplète ${x.id_proposition}`);

const live = await fetchLive();
const before = snapshot('live-before', live.segments, live.links);
if (stable(live.segments) !== stable(raw.segments) || stable(live.links) !== stable(raw.links)) throw new Error(`Préétat exact différent : ${before}`);
if (live.segments.some((s) => s.liens_revus_le || s.liens_revus_par)) throw new Error('Segment déjà marqué');
if (!APPLY) { console.log(JSON.stringify({ ready: true, applied: false, reason: 'Garde active : --apply requis après validation humaine.', snapshot: before, pagination_segments: [100, 100, 100, 19], pagination_liens_par_lot: [48, 34, 46, 15], segments: 319, liens_avant: 143, mises_a_jour: 142, suppressions: 1, insertions: 85, liens_apres_attendus: 227, cible_unique: true }, null, 2)); process.exit(0); }

const oldById = new Map(raw.links.map((x) => [x.id, x]));
const predicate = (x) => [`id=${lit(x.id)}`, `segment_id=${lit(x.segment_id)}`, `canon_id is not distinct from ${lit(x.canon_id)}`, `verset_v2_id is not distinct from ${lit(x.verset_v2_id)}`, `livre is not distinct from ${lit(x.livre)}`, `chapitre is not distinct from ${lit(x.chapitre)}`, `type=${lit(x.type)}`, `fiabilite=${lit(x.fiabilite)}`, `motif is not distinct from ${lit(x.motif)}`, `provenance=${lit(x.provenance)}`, `arbitrage_requis=${lit(x.arbitrage_requis)}`, `created_at=${lit(x.created_at)}`, `updated_at=${lit(x.updated_at)}`].join(' and ');
const targetPredicate = (x) => [`segment_id=${lit(x.segment_id)}`, `type=${lit(x.type)}`, `canon_id is not distinct from ${lit(x.canon_id)}`, `verset_v2_id is not distinct from ${lit(x.verset_v2_id)}`, `livre is not distinct from ${lit(x.livre)}`, `chapitre is not distinct from ${lit(x.chapitre)}`].join(' and ');
const statements = [];
for (const d of plan.decisions) {
  const old = oldById.get(d.link_id);
  if (!old || stable(old) !== stable(d.avant)) throw new Error(`Préétat décision ${d.link_id}`);
  if (d.decision === 'supprimer') statements.push(`delete from liens_bibliques where ${predicate(old)};if not found then raise exception 'delete ${old.id}';end if;n_del:=n_del+1;`);
  else { const f = d.final; statements.push(`update liens_bibliques set canon_id=${lit(f.canon_id)},verset_v2_id=${lit(f.verset_v2_id)},livre=${lit(f.livre)},chapitre=${lit(f.chapitre)},type=${lit(f.type)},fiabilite='vérifié',motif=${lit(f.motif)},provenance='lecture',arbitrage_requis=false where ${predicate(old)};if not found then raise exception 'update ${old.id}';end if;n_up:=n_up+1;`); }
}
for (const x of plan.insertions) statements.push(`if exists(select 1 from liens_bibliques where ${targetPredicate(x)})then raise exception 'cible_unique ${x.id_proposition}';end if;insert into liens_bibliques(segment_id,canon_id,verset_v2_id,livre,chapitre,type,fiabilite,motif,provenance,arbitrage_requis)values(${lit(x.segment_id)},${lit(x.canon_id)},${lit(x.verset_v2_id)},${lit(x.livre)},${lit(x.chapitre)},${lit(x.type)},'vérifié',${lit(x.motif)},'lecture',false);n_ins:=n_ins+1;`);
const ids = live.segments.map((s) => s.id).join(',');
const sql = `do $audit$ declare n_up int:=0;n_del int:=0;n_ins int:=0;n_mark int:=0;n int;begin ${statements.join('\n')} update segments set liens_revus_le=now(),liens_revus_par='IA-lecture' where id in(${ids})and liens_revus_le is null and liens_revus_par is null;get diagnostics n_mark=row_count;if n_up<>142 or n_del<>1 or n_ins<>85 or n_mark<>319 then raise exception 'comptes %,%,%,%',n_up,n_del,n_ins,n_mark;end if;select count(*)into n from liens_bibliques where segment_id in(${ids});if n<>227 then raise exception 'total %',n;end if;select count(*)into n from liens_bibliques where segment_id in(${ids})and(fiabilite<>'vérifié'or provenance<>'lecture'or arbitrage_requis);if n<>0 then raise exception 'métadonnées %',n;end if;select count(*)into n from liens_bibliques where segment_id in(${ids})and canon_id is not null and(verset_v2_id is not null or livre is not null or chapitre is not null);if n<>0 then raise exception 'cible_unique/secondaires %',n;end if;select count(*)into n from(select segment_id,type,canon_id,verset_v2_id,livre,chapitre,count(*)from liens_bibliques where segment_id in(${ids})group by 1,2,3,4,5,6 having count(*)>1)d;if n<>0 then raise exception 'doublons %',n;end if;select count(*)into n from liens_bibliques l left join versets_canon v on v.id=l.canon_id where l.segment_id in(${ids})and l.canon_id is not null and v.id is null;if n<>0 then raise exception 'cibles mortes %',n;end if;select count(*)into n from liens_bibliques where segment_id in(${ids})and type=4;if n<>0 then raise exception 'T4 résiduels %',n;end if;end $audit$;`;
const { error } = await sb.rpc('exec_sql', { sql });
if (error) throw new Error(`Transaction annulée : ${error.message}`);
const afterLive = await fetchLive();
const after = snapshot('live-after', afterLive.segments, afterLive.links);
if (afterLive.segments.length !== 319 || afterLive.links.length !== 227 || afterLive.segments.some((s) => !s.liens_revus_le || s.liens_revus_par !== 'IA-lecture') || afterLive.links.some((l) => l.fiabilite !== 'vérifié' || l.provenance !== 'lecture' || l.arbitrage_requis) || afterLive.links.some((l) => l.type === 4)) throw new Error('Post-contrôle invalide');
console.log(JSON.stringify({ applied: true, before, after, segments: 319, liens: 227 }, null, 2));
