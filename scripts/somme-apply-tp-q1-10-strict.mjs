import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ROOT = 'tmp/somme-liens-audit-2026-07-29';
const raw = JSON.parse(readFileSync(`${ROOT}/tp-q1-10-raw.json`, 'utf8'));
const plan = JSON.parse(readFileSync(`${ROOT}/TP-Q1-10-DOSSIER-STRICT.json`, 'utf8'));
const APPLY = process.argv.includes('--apply');
const questions = Array.from({ length: 10 }, (_, i) => `Question ${i + 1}`);
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const canonicalize = (value) => Array.isArray(value) ? value.map(canonicalize)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]))
    : value;
const stable = (value) => JSON.stringify(canonicalize(value));
const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const literal = (value) => value == null ? 'null' : typeof value === 'number' ? String(value)
  : typeof value === 'boolean' ? (value ? 'true' : 'false') : `'${String(value).replaceAll("'", "''")}'`;
const must = async (query, label) => {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
};
const snapshot = (label, segments, links) => {
  mkdirSync(ROOT, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
  const name = `TP-Q1-10-${label}-${stamp}.json`;
  const payload = `${JSON.stringify({ segments, links }, null, 2)}\n`;
  writeFileSync(`${ROOT}/${name}`, payload);
  writeFileSync(`${ROOT}/${name}.sha256`, `${createHash('sha256').update(payload).digest('hex')}  ${name}\n`);
  return `${ROOT}/${name}`;
};
const fetchLive = async () => {
  const segments = [];
  for (let from = 0; ; from += 100) {
    const page = await must(sb.from('segments').select('*').eq('id_oeuvre', 'A0013O0002')
      .eq('ref_niv1', 'Tertia Pars').in('ref_niv2', questions).order('segment_numero').range(from, from + 99), `segments ${from}`);
    segments.push(...page);
    if (page.length < 100) break;
  }
  const links = [];
  for (let offset = 0; offset < segments.length; offset += 100) {
    const ids = segments.slice(offset, offset + 100).map((s) => s.id);
    for (let from = 0; ; from += 100) {
      const page = await must(sb.from('liens_bibliques').select('*').in('segment_id', ids).order('id').range(from, from + 99), `liens ${offset}/${from}`);
      links.push(...page);
      if (page.length < 100) break;
    }
  }
  links.sort((a, b) => a.id - b.id);
  return { segments, links };
};

if (raw.segments.length !== 708 || raw.links.length !== 242 ||
    hash(raw.segments) !== 'ae7f36084334f608ae16d3f5253da9ffdefcc3a5cd8e94758f664f81db8b86e2' ||
    hash(raw.links) !== '6528967ea042fde921230bf26a7d3a1149be63cd1223d3bd8bc82fef8ebee745') {
  throw new Error('Baseline ou empreinte inattendue');
}
if (plan.decisions.length !== 242 || plan.insertions.length !== 23 ||
    plan.summary.liens_supprimes !== 6 || plan.summary.liens_finaux_proposes !== 259) {
  throw new Error('Dossier incomplet ou comptes inattendus');
}
if (plan.controle_stratifie.length < 30 || plan.summary.controle_types_3_4 * 2 < plan.controle_stratifie.length) {
  throw new Error('Contrôle stratifié insuffisant');
}
const retained = plan.decisions.filter((d) => d.decision === 'mettre_a_jour').map((d) => ({ segment_id: d.segment_id, ...d.final }));
const planned = [...retained, ...plan.insertions];
const key = (x) => `${x.segment_id}|${x.type}|${x.canon_id ?? ''}|${x.verset_v2_id ?? ''}|${x.livre ?? ''}|${x.chapitre ?? ''}`;
if (new Set(planned.map(key)).size !== planned.length) throw new Error('cible_unique violée');
for (const item of planned) {
  const exactVerse = item.canon_id && item.verset_v2_id == null && item.livre == null && item.chapitre == null;
  const exactChapter = item.canon_id == null && item.verset_v2_id == null && item.livre && Number.isInteger(item.chapitre) && item.type === 3;
  if (!exactVerse && !exactChapter) throw new Error(`Cible finale invalide : ${key(item)}`);
}
for (const decision of plan.decisions.filter((d) => d.final)) {
  if (!decision.ancre_locale_exacte || !decision.final.motif || !decision.temoins_versets_lecture?.length ||
      decision.temoins_versets_lecture.some((w) => !w.texte)) throw new Error(`Preuve incomplète : ${decision.link_id}`);
}
for (const insertion of plan.insertions) {
  if (!insertion.ancre_locale_exacte || !insertion.motif || !insertion.temoins_versets_lecture?.length ||
      insertion.temoins_versets_lecture.some((w) => !w.texte)) throw new Error(`Preuve insertion incomplète : ${insertion.id_proposition}`);
}

const live = await fetchLive();
const before = snapshot('live-before', live.segments, live.links);
if (stable(live.segments) !== stable(raw.segments) || stable(live.links) !== stable(raw.links)) {
  throw new Error(`Préétat exact différent : ${before}`);
}
if (live.segments.some((s) => s.liens_revus_le || s.liens_revus_par)) throw new Error('Un segment est déjà marqué comme relu');
if (!APPLY) {
  console.log(JSON.stringify({
    ready: true, applied: false,
    reason: 'Garde active : --apply requis après validation humaine.',
    snapshot: before,
    pagination_segments: [100, 100, 100, 100, 100, 100, 100, 8],
    pagination_liens_par_lot: [32, 12, 21, 40, 44, 52, 37, 4],
    segments: 708, liens_avant: 242, suppressions: 6, mises_a_jour: 236,
    insertions: 23, liens_apres_attendus: 259, cible_unique: true,
    cibles_chapitre_t3: 2, cibles_verset_precises: 257,
  }, null, 2));
  process.exit(0);
}

const oldById = new Map(raw.links.map((x) => [x.id, x]));
const oldPredicate = (x) => [
  `id=${literal(x.id)}`, `segment_id=${literal(x.segment_id)}`,
  `canon_id is not distinct from ${literal(x.canon_id)}`, `verset_v2_id is not distinct from ${literal(x.verset_v2_id)}`,
  `livre is not distinct from ${literal(x.livre)}`, `chapitre is not distinct from ${literal(x.chapitre)}`,
  `type=${literal(x.type)}`, `fiabilite=${literal(x.fiabilite)}`, `motif is not distinct from ${literal(x.motif)}`,
  `provenance=${literal(x.provenance)}`, `arbitrage_requis=${literal(x.arbitrage_requis)}`,
  `created_at=${literal(x.created_at)}`, `updated_at=${literal(x.updated_at)}`,
].join(' and ');
const targetPredicate = (x) => [
  `segment_id=${literal(x.segment_id)}`, `type=${literal(x.type)}`,
  `canon_id is not distinct from ${literal(x.canon_id)}`, `verset_v2_id is not distinct from ${literal(x.verset_v2_id)}`,
  `livre is not distinct from ${literal(x.livre)}`, `chapitre is not distinct from ${literal(x.chapitre)}`,
].join(' and ');
const statements = [];
for (const decision of plan.decisions) {
  const old = oldById.get(decision.link_id);
  if (!old || stable(old) !== stable(decision.avant)) throw new Error(`Préétat de décision invalide : ${decision.link_id}`);
  if (decision.decision === 'supprimer') {
    statements.push(`delete from liens_bibliques where ${oldPredicate(old)}; if not found then raise exception 'delete ${old.id}'; end if; n_del:=n_del+1;`);
  } else {
    const f = decision.final;
    statements.push(`update liens_bibliques set canon_id=${literal(f.canon_id)},verset_v2_id=${literal(f.verset_v2_id)},livre=${literal(f.livre)},chapitre=${literal(f.chapitre)},type=${literal(f.type)},fiabilite='vérifié',motif=${literal(f.motif)},provenance='lecture',arbitrage_requis=false where ${oldPredicate(old)}; if not found then raise exception 'update ${old.id}'; end if; n_up:=n_up+1;`);
  }
}
for (const item of plan.insertions) {
  statements.push(`if exists(select 1 from liens_bibliques where ${targetPredicate(item)}) then raise exception 'cible_unique ${item.id_proposition}'; end if; insert into liens_bibliques(segment_id,canon_id,verset_v2_id,livre,chapitre,type,fiabilite,motif,provenance,arbitrage_requis) values(${literal(item.segment_id)},${literal(item.canon_id)},${literal(item.verset_v2_id)},${literal(item.livre)},${literal(item.chapitre)},${literal(item.type)},'vérifié',${literal(item.motif)},'lecture',false); n_ins:=n_ins+1;`);
}
const ids = live.segments.map((s) => s.id).join(',');
const sql = `do $audit$ declare n_up int:=0; n_del int:=0; n_ins int:=0; n_mark int:=0; n int; begin
${statements.join('\n')}
update segments set liens_revus_le=now(),liens_revus_par='IA-lecture' where id in(${ids}) and liens_revus_le is null and liens_revus_par is null;
get diagnostics n_mark=row_count;
if n_up<>236 or n_del<>6 or n_ins<>23 or n_mark<>708 then raise exception 'comptes %,%,%,%',n_up,n_del,n_ins,n_mark; end if;
select count(*) into n from liens_bibliques where segment_id in(${ids}); if n<>259 then raise exception 'total %',n; end if;
select count(*) into n from liens_bibliques where segment_id in(${ids}) and (fiabilite<>'vérifié' or provenance<>'lecture' or arbitrage_requis); if n<>0 then raise exception 'métadonnées %',n; end if;
select count(*) into n from liens_bibliques where segment_id in(${ids}) and not ((canon_id is not null and verset_v2_id is null and livre is null and chapitre is null) or (canon_id is null and verset_v2_id is null and livre is not null and chapitre is not null and type=3)); if n<>0 then raise exception 'cibles invalides %',n; end if;
select count(*) into n from (select segment_id,type,canon_id,verset_v2_id,livre,chapitre,count(*) from liens_bibliques where segment_id in(${ids}) group by 1,2,3,4,5,6 having count(*)>1) d; if n<>0 then raise exception 'doublons %',n; end if;
select count(*) into n from liens_bibliques l left join versets_canon v on v.id=l.canon_id where l.segment_id in(${ids}) and l.canon_id is not null and v.id is null; if n<>0 then raise exception 'cibles mortes %',n; end if;
end $audit$;`;
const { error } = await sb.rpc('exec_sql', { sql });
if (error) throw new Error(`Transaction annulée : ${error.message}`);
const afterLive = await fetchLive();
const after = snapshot('live-after', afterLive.segments, afterLive.links);
if (afterLive.segments.length !== 708 || afterLive.links.length !== 259 ||
    afterLive.segments.some((s) => !s.liens_revus_le || s.liens_revus_par !== 'IA-lecture') ||
    afterLive.links.some((l) => l.fiabilite !== 'vérifié' || l.provenance !== 'lecture' || l.arbitrage_requis)) {
  throw new Error('Post-contrôle invalide');
}
console.log(JSON.stringify({ applied: true, before, after, segments: 708, liens: 259 }, null, 2));
