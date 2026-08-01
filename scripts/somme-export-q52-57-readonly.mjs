import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ROOT = 'tmp/somme-liens-audit-2026-07-29';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const must = async (query, label) => {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
};
const questions = Array.from({ length: 6 }, (_, i) => `Question ${i + 52}`);
const segments = await must(
  sb.from('segments').select('*').eq('id_oeuvre', 'A0013O0002').eq('ref_niv1', 'Secunda Secundae')
    .in('ref_niv2', questions).order('segment_numero'),
  'segments',
);
const links = [];
for (let i = 0; i < segments.length; i += 100) {
  links.push(...await must(sb.from('liens_bibliques').select('*').in('segment_id', segments.slice(i, i + 100).map((s) => s.id)).order('id'), `liens ${i}`));
}
links.sort((a, b) => a.id - b.id);
const canonIds = [...new Set(links.map((l) => l.canon_id).filter(Boolean))];
const witnesses = [];
for (let i = 0; i < canonIds.length; i += 100) {
  witnesses.push(...await must(
    sb.from('versets_lecture').select('id_verset,ref,"num_TR0001","TR0001","num_TR0003","TR0003","num_TR0004","TR0004"').in('id_verset', canonIds.slice(i, i + 100)),
    `témoins ${i}`,
  ));
}
writeFileSync(`${ROOT}/ss-q52-57-raw.json`, `${JSON.stringify({ exported_at: new Date().toISOString(), questions, segments, links, witnesses }, null, 2)}\n`);
const candidateIds = [
  '1MA.2.65','MAT.5.7','SIR.20.7','SIR.7.31','SIR.7.34','SIR.7.36','SIR.26.28','SIR.26.29',
  'ACT.11.28','ACT.11.29','MAT.6.34','ROM.8.7','PRO.4.25','LEV.19.13',
  'EXO.20.1','EXO.20.2','EXO.20.3','EXO.20.17',
];
const candidateWitnesses = await must(
  sb.from('versets_lecture').select('id_verset,ref,"num_TR0001","TR0001","num_TR0003","TR0003","num_TR0004","TR0004"').in('id_verset', candidateIds),
  'témoins candidats',
);
writeFileSync(`${ROOT}/ss-q52-57-candidate-witnesses.json`, `${JSON.stringify(candidateWitnesses, null, 2)}\n`);
console.log(JSON.stringify({
  questions,
  segments: segments.length,
  range: segments.length ? [segments[0].segment_numero, segments.at(-1).segment_numero] : null,
  links: links.length,
  targets: canonIds.length,
  witnesses: witnesses.length,
  candidate_witnesses: candidateWitnesses.length,
  marked: segments.filter((s) => s.liens_revus_le || s.liens_revus_par).length,
  by_question: Object.fromEntries(questions.map((q) => [q, segments.filter((s) => s.ref_niv2 === q).length])),
}, null, 2));
