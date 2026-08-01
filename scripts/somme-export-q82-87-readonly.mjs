import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ROOT = 'tmp/somme-liens-audit-2026-07-29';
mkdirSync(ROOT, { recursive: true });
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Variables Supabase absentes.');
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const must = async (query, label) => {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
};

const questions = Array.from({ length: 6 }, (_, index) => `Question ${82 + index}`);
const segments = [];
for (const question of questions) {
  segments.push(...await must(sb.from('segments').select('*')
    .eq('id_oeuvre', 'A0013O0002').eq('ref_niv1', 'Secunda Secundae').eq('ref_niv2', question)
    .order('segment_numero'), question));
}
segments.sort((a, b) => a.segment_numero - b.segment_numero);
const links = [];
for (let index = 0; index < segments.length; index += 100) {
  links.push(...await must(sb.from('liens_bibliques').select('*')
    .in('segment_id', segments.slice(index, index + 100).map((segment) => segment.id)).order('id'), `liens ${index}`));
}
links.sort((a, b) => a.id - b.id);
const ids = [...new Set(links.map((link) => link.canon_id).filter(Boolean))];
const witnesses = [];
for (let index = 0; index < ids.length; index += 100) {
  witnesses.push(...await must(sb.from('versets_lecture')
    .select('id_verset,ref,"num_TR0001","TR0001","num_TR0003","TR0003","num_TR0004","TR0004"')
    .in('id_verset', ids.slice(index, index + 100)), `temoins ${index}`));
}
const payload = { exported_at: new Date().toISOString(), questions, segments, links, witnesses };
writeFileSync(`${ROOT}/ss-q82-87-snapshot-live.json`, `${JSON.stringify(payload, null, 2)}\n`);
const candidateIds = [
  '2CH.29.31','EXO.35.29','1SA.15.29','PSA.9.38','ROM.8.26','2MA.15.14','MAT.6.9','MAT.6.10','MAT.6.11','MAT.6.12','MAT.6.13',
  'ROM.15.4','1JN.4.19','2CO.12.8','LUK.18.13','1KI.1.23','PSA.67.34','2PE.1.4','EXO.22.19','DEU.26.2','DEU.26.4',
  'DEU.26.10','1TI.4.4','MAT.15.6','MAL.1.14','EXO.23.15','1CH.29.14','LEV.27.32','GEN.28.22','DEU.14.28','DEU.14.29',
  'LUK.11.41','2CO.3.8','NUM.18.26','1TI.2.1','2CO.1.11','GEN.14.20','NUM.18.23','DEU.5.5','EXO.26.27','REV.22.9','JOS.5.14',
  'MAT.5.3','MAT.5.4','MAT.5.5','MAT.5.6','MAT.5.7','MAT.5.8','MAT.5.9','1SA.1.13','GEN.18.3','DEU.26.3',
  'EXO.21.37','GEN.22.9',
];
const candidateWitnesses = await must(sb.from('versets_lecture')
  .select('id_verset,ref,"num_TR0001","TR0001","num_TR0003","TR0003","num_TR0004","TR0004"')
  .in('id_verset', candidateIds), 'temoins candidats');
writeFileSync(`${ROOT}/ss-q82-87-candidate-witnesses.json`, `${JSON.stringify(candidateWitnesses, null, 2)}\n`);
console.log(JSON.stringify({
  segments: segments.length,
  range: [segments[0]?.segment_numero, segments.at(-1)?.segment_numero],
  links: links.length,
  witnesses: witnesses.length,
  marked: segments.filter((segment) => segment.liens_revus_le || segment.liens_revus_par).length,
  by_question: Object.fromEntries(questions.map((question) => [question, segments.filter((segment) => segment.ref_niv2 === question).length])),
}, null, 2));
