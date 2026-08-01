import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ROOT = 'tmp/somme-liens-audit-2026-07-29';
const raw = JSON.parse(readFileSync(`${ROOT}/pp-q81-end-raw.json`, 'utf8'));
const plan = JSON.parse(readFileSync(`${ROOT}/PP-Q81-119-DOSSIER-STRICT.json`, 'utf8'));
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const questions = Array.from({ length: 39 }, (_, i) => `Question ${81 + i}`);
const must = async (query, label) => {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
};
const canonical = (value) => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map((k) => [k, canonical(value[k])]))
    : value;
const stable = (value) => JSON.stringify(canonical(value));
const sha = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

// Réexport live paginé, strictement en lecture seule.
const segments = [];
for (const question of questions) {
  for (let from = 0; ; from += 100) {
    const page = await must(sb.from('segments').select('*')
      .eq('id_oeuvre', 'A0013O0002').eq('ref_niv1', 'Prima Pars').eq('ref_niv2', question)
      .order('segment_numero').range(from, from + 99), `${question}:${from}`);
    segments.push(...page);
    if (page.length < 100) break;
  }
}
segments.sort((a, b) => a.segment_numero - b.segment_numero);
const links = [];
for (let i = 0; i < segments.length; i += 100) {
  links.push(...await must(sb.from('liens_bibliques').select('*')
    .in('segment_id', segments.slice(i, i + 100).map((s) => s.id)).order('id'), `liens:${i}`));
}
links.sort((a, b) => a.id - b.id);

if (stable(segments) !== stable(raw.segments) || stable(links) !== stable(raw.links)) throw new Error('Préétat live différent de l’export audité.');
if (sha(raw.segments) !== plan.preetat_exact.segments_sha256 || sha(raw.links) !== plan.preetat_exact.liens_sha256) throw new Error('Empreinte du dossier incohérente.');

const fields = (x) => ({
  segment_id: x.segment_id,
  canon_id: x.canon_id,
  verset_v2_id: x.verset_v2_id,
  livre: x.livre,
  chapitre: x.chapitre,
  type: x.type,
  fiabilite: x.fiabilite,
  motif: x.motif,
  provenance: x.provenance,
  arbitrage_requis: x.arbitrage_requis,
});
const key = (x) => `${x.segment_id}|${x.type}|${x.canon_id ?? ''}|${x.verset_v2_id ?? ''}|${x.livre ?? ''}|${x.chapitre ?? ''}`;
for (const decision of plan.decisions) {
  if (!decision.ancre_locale_exacte || decision.link_id == null) throw new Error(`Décision incomplète ${decision.link_id}`);
  if (decision.final) {
    const f = decision.final;
    const exclusive = Number(Boolean(f.canon_id)) + Number(Boolean(f.verset_v2_id)) + Number(Boolean(f.livre && f.chapitre));
    if (exclusive !== 1 || f.fiabilite !== 'vérifié' || f.provenance !== 'lecture' || f.arbitrage_requis || !f.motif || !decision.temoins_versets_lecture?.length) throw new Error(`Décision finale invalide ${decision.link_id}`);
  }
}
for (const addition of plan.insertions) {
  const exclusive = Number(Boolean(addition.canon_id)) + Number(Boolean(addition.verset_v2_id)) + Number(Boolean(addition.livre && addition.chapitre));
  if (!addition.ancre_locale_exacte || !addition.motif || !addition.temoins_versets_lecture?.length || addition.fiabilite !== 'vérifié' || addition.provenance !== 'lecture' || addition.arbitrage_requis || exclusive !== 1) throw new Error(`Ajout invalide ${addition.id_proposition}`);
}

function simulate(input) {
  const byId = new Map(input.filter((x) => x.id > 0).map((x) => [x.id, { ...x }]));
  const syntheticAlready = input.filter((x) => x.id < 0).map((x) => ({ ...x }));
  for (const decision of plan.decisions) {
    if (decision.decision === 'supprimer') byId.delete(decision.link_id);
    else byId.set(decision.link_id, { id: decision.link_id, ...fields({ segment_id: decision.segment_id, ...decision.final }) });
  }
  const out = [...byId.values(), ...syntheticAlready];
  const keys = new Set(out.map(key));
  let synthetic = Math.min(-1, ...out.map((x) => x.id ?? 0)) - 1;
  for (const addition of plan.insertions) {
    const k = key(addition);
    if (!keys.has(k)) {
      out.push({ id: synthetic--, ...fields(addition) });
      keys.add(k);
    }
  }
  return out.sort((a, b) => a.segment_id - b.segment_id || key(a).localeCompare(key(b)));
}

const once = simulate(links);
const twice = simulate(once);
const normalize = (items) => items.map(({ id, ...x }) => x).sort((a, b) => key(a).localeCompare(key(b)));
if (stable(normalize(once)) !== stable(normalize(twice))) throw new Error('Simulation non idempotente.');
if (new Set(once.map(key)).size !== once.length) throw new Error('Doublon final.');
if (once.length !== plan.summary.liens_finaux_proposes || plan.decisions.length !== 368 || plan.insertions.length !== 2 || plan.lecture_segments.length !== 1874) throw new Error('Comptes dossier/dry-run incohérents.');
if (plan.summary.controle_stratifie < 30 || plan.summary.controle_difficile_types_3_4 * 2 < plan.summary.controle_stratifie) throw new Error('Contrôle difficile insuffisant.');

const result = {
  ready: true,
  applied: false,
  database_mode: 'lecture seule',
  live_prestate_exact: true,
  atomic_strategy_prepared: 'transaction unique : scope relationnel verrouillé, 30 DELETE logiques dans le desired state, remplacement bulk 368→340 liens, marqueurs des 1 874 segments assertés sans UPDATE ; rollback sur toute erreur',
  segments: segments.length,
  links_before: links.length,
  updates: plan.decisions.filter((d) => d.final).length,
  deletes: plan.summary.suppressions,
  inserts_max: plan.insertions.length,
  links_after_simulation: once.length,
  idempotence_simulation: 'deuxième passage = no-op sémantique',
  targets_exclusive: true,
  chapter_targets: plan.summary.liens_chapitre_finaux,
  duplicates: 0,
  control: { total: plan.summary.controle_stratifie, difficult_types_3_4: plan.summary.controle_difficile_types_3_4 },
};
writeFileSync(`${ROOT}/PP-Q81-119-DRY-RUN.json`, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
