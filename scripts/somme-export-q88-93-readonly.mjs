import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ROOT = 'tmp/somme-liens-audit-2026-07-29';
const PAGE_SIZE = 100;
mkdirSync(ROOT, { recursive: true });

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const must = async (query, label) => {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
};

const questions = Array.from({ length: 6 }, (_, index) => `Question ${88 + index}`);
const segments = [];
const pagination = [];
for (const question of questions) {
  for (let from = 0; ; from += PAGE_SIZE) {
    const page = await must(sb.from('segments').select('*')
      .eq('id_oeuvre', 'A0013O0002').eq('ref_niv1', 'Secunda Secundae').eq('ref_niv2', question)
      .order('segment_numero').range(from, from + PAGE_SIZE - 1), `${question} page ${from / PAGE_SIZE + 1}`);
    segments.push(...page);
    pagination.push({ objet: 'segments', question, from, to: from + PAGE_SIZE - 1, lignes: page.length });
    if (page.length < PAGE_SIZE) break;
  }
}
segments.sort((a, b) => a.segment_numero - b.segment_numero);

const links = [];
for (let from = 0; from < segments.length; from += PAGE_SIZE) {
  const page = await must(sb.from('liens_bibliques').select('*')
    .in('segment_id', segments.slice(from, from + PAGE_SIZE).map((segment) => segment.id)).order('id'), `liens ${from}`);
  links.push(...page);
  pagination.push({ objet: 'liens_bibliques', segments_from: from, segments_to: Math.min(from + PAGE_SIZE - 1, segments.length - 1), lignes: page.length });
}
links.sort((a, b) => a.id - b.id);

const witnessColumns = 'id_verset,ref,"num_TR0001","TR0001","num_TR0003","TR0003","num_TR0004","TR0004"';
const ids = [...new Set(links.map((link) => link.canon_id).filter(Boolean))];
const witnesses = [];
for (let from = 0; from < ids.length; from += PAGE_SIZE) {
  witnesses.push(...await must(sb.from('versets_lecture').select(witnessColumns)
    .in('id_verset', ids.slice(from, from + PAGE_SIZE)), `witnesses ${from}`));
}
const candidateIds = [
  'LEV.27.11', 'LEV.27.28', 'EXO.23.13', 'MAT.11.11', 'SIR.32.19', 'PSA.143.8',
  '1SA.16.7', 'ECC.5.3', 'SIR.23.11', 'MAT.14.7', 'MAT.14.10', 'LUK.10.19',
  'MRK.1.25', 'SIR.43.30', 'JOL.3.5',
];
const candidateWitnesses = await must(sb.from('versets_lecture').select(witnessColumns)
  .in('id_verset', candidateIds).order('id_verset'), 'candidate witnesses');

writeFileSync(`${ROOT}/ss-q88-93-candidate-witnesses.json`, `${JSON.stringify(candidateWitnesses, null, 2)}\n`);
writeFileSync(`${ROOT}/ss-q88-93-raw.json`, `${JSON.stringify({
  exported_at: new Date().toISOString(), questions, pagination, segments, links, witnesses,
}, null, 2)}\n`);
console.log(JSON.stringify({
  segments: segments.length,
  range: [segments[0]?.segment_numero, segments.at(-1)?.segment_numero],
  links: links.length,
  witnesses: witnesses.length,
  candidate_witnesses: candidateWitnesses.length,
  marked: segments.filter((segment) => segment.liens_revus_le || segment.liens_revus_par).length,
  by_question: Object.fromEntries(questions.map((question) => [question, segments.filter((segment) => segment.ref_niv2 === question).length])),
  pagination,
}, null, 2));
