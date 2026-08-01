import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ROOT = 'tmp/somme-liens-audit-2026-07-29';
mkdirSync(ROOT, { recursive: true });

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function must(query, label) {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

const params = await must(
  sb.from('parametres').select('cle,valeur').in('cle', ['charte_ia', 'feedback_liens_protocole']),
  'parametres',
);
const questions = Array.from({ length: 6 }, (_, i) => `Question ${i + 34}`);
const segments = await must(
  sb.from('segments').select('*')
    .eq('id_oeuvre', 'A0013O0002')
    .eq('ref_niv1', 'Secunda Secundae')
    .in('ref_niv2', questions)
    .order('segment_numero'),
  'segments',
);
if (!segments.length) throw new Error('Aucun segment trouvé.');

const links = [];
for (let i = 0; i < segments.length; i += 100) {
  links.push(...await must(
    sb.from('liens_bibliques').select('*').in('segment_id', segments.slice(i, i + 100).map((s) => s.id)).order('id'),
    `liens ${i}`,
  ));
}

const canonIds = [...new Set(links.map((l) => l.canon_id).filter(Boolean))];
const witnesses = [];
for (let i = 0; i < canonIds.length; i += 100) {
  witnesses.push(...await must(
    sb.from('versets_lecture')
      .select('id_verset,ref,"num_TR0001","TR0001","num_TR0003","TR0003","num_TR0004","TR0004"')
      .in('id_verset', canonIds.slice(i, i + 100)),
    `témoins ${i}`,
  ));
}

writeFileSync(`${ROOT}/ss-q34-39-charte-feedback.json`, `${JSON.stringify(params, null, 2)}\n`);
writeFileSync(`${ROOT}/ss-q34-39-raw.json`, `${JSON.stringify({
  exported_at: new Date().toISOString(), questions, segments, links, witnesses,
}, null, 2)}\n`);

const candidateIds = [
  'JHN.14.6', '1JN.2.9', '1JN.3.15', 'SIR.21.2', 'SIR.6.25', 'SIR.6.26',
  'EXO.20.8', 'GAL.5.21', 'MAT.12.25', 'PHP.1.18', 'JOB.42.7', '1SA.14.1',
  'JOB.13.3', 'COL.2.19', '2KI.17.20',
];
const candidateWitnesses = await must(
  sb.from('versets_lecture')
    .select('id_verset,ref,"num_TR0001","TR0001","num_TR0003","TR0003","num_TR0004","TR0004"')
    .in('id_verset', candidateIds),
  'témoins candidats',
);
writeFileSync(`${ROOT}/ss-q34-39-candidate-witnesses.json`, `${JSON.stringify(candidateWitnesses, null, 2)}\n`);
console.log(JSON.stringify({
  questions,
  segments: segments.length,
  segment_range: [segments[0].segment_numero, segments.at(-1).segment_numero],
  links: links.length,
  canon_targets: canonIds.length,
  witnesses: witnesses.length,
  candidate_witnesses: candidateWitnesses.length,
}, null, 2));
