import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ROOT = 'tmp/somme-liens-audit-2026-07-29';
mkdirSync(ROOT, { recursive: true });
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const must = async (query, label) => { const { data, error } = await query; if (error) throw new Error(`${label}: ${error.message}`); return data; };
const questions = Array.from({ length: 6 }, (_, i) => `Question ${i + 70}`);
const segments = [];
for (const question of questions) {
  segments.push(...await must(
    sb.from('segments').select('*').eq('id_oeuvre', 'A0013O0002').eq('ref_niv1', 'Secunda Secundae')
      .eq('ref_niv2', question).order('segment_numero'),
    `segments ${question}`,
  ));
}
segments.sort((a, b) => a.segment_numero - b.segment_numero);
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
const output = { exported_at: new Date().toISOString(), questions, segments, links, witnesses };
writeFileSync(`${ROOT}/ss-q70-75-raw.json`, `${JSON.stringify(output, null, 2)}\n`);
const candidateIds = [
  'GEN.12.13','MAT.25.18','MAT.25.25','MAT.25.30','1TI.5.8','MAT.5.22','PRO.22.1',
  '1KI.21.10','DEU.19.15','1JN.4.1','LUK.24.25','PSA.37.14','PSA.37.15','JHN.18.23',
  'SIR.5.14','SIR.6.2','PRO.6.19',
];
const candidateWitnesses = await must(
  sb.from('versets_lecture').select('id_verset,ref,"num_TR0001","TR0001","num_TR0003","TR0003","num_TR0004","TR0004"').in('id_verset', candidateIds),
  'témoins candidats',
);
writeFileSync(`${ROOT}/ss-q70-75-candidate-witnesses.json`, `${JSON.stringify(candidateWitnesses, null, 2)}\n`);
console.log(JSON.stringify({ questions, segments: segments.length, range: [segments[0]?.segment_numero, segments.at(-1)?.segment_numero], links: links.length, targets: canonIds.length, witnesses: witnesses.length, marked: segments.filter((s) => s.liens_revus_le || s.liens_revus_par).length, by_question: Object.fromEntries(questions.map((q) => [q, segments.filter((s) => s.ref_niv2 === q).length])) }, null, 2));
