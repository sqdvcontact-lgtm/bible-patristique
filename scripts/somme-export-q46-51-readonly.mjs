import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ROOT = 'tmp/somme-liens-audit-2026-07-29';
const OEUVRE = 'A0013O0002';
const PARTIE = 'Secunda Secundae';
const QUESTIONS = Array.from({ length: 6 }, (_, index) => `Question ${index + 46}`);
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const must = async (query, label) => {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
};

const [parameters, segments] = await Promise.all([
  must(sb.from('parametres').select('cle,valeur').in('cle', ['charte_ia', 'feedback_liens_protocole']), 'paramètres'),
  must(sb.from('segments').select('id,id_oeuvre,segment_numero,segment_texte,notes,nature,ref_niv1,ref_niv2,ref_niv3,ref_niv4,liens_revus_le,liens_revus_par')
    .eq('id_oeuvre', OEUVRE).eq('ref_niv1', PARTIE).in('ref_niv2', QUESTIONS).order('segment_numero'), 'segments'),
]);
const links = [];
for (let index = 0; index < segments.length; index += 100) {
  links.push(...await must(sb.from('liens_bibliques').select('*')
    .in('segment_id', segments.slice(index, index + 100).map((segment) => segment.id)).order('id'), `liens ${index}`));
}
links.sort((a, b) => a.id - b.id);
const extraCanonIds = ['2CH.2.13', '1SA.9.20', 'SIR.6.35'];
const canonIds = [...new Set([...links.map((link) => link.canon_id).filter(Boolean), ...extraCanonIds])];
const witnesses = [];
for (let index = 0; index < canonIds.length; index += 100) {
  witnesses.push(...await must(sb.from('versets_lecture')
    .select('id_verset,ref,"num_TR0001","TR0001","num_TR0003","TR0003","num_TR0004","TR0004"')
    .in('id_verset', canonIds.slice(index, index + 100)), `témoins ${index}`));
}
mkdirSync(ROOT, { recursive: true });
const payload = {
  exported_at: new Date().toISOString(), oeuvre: OEUVRE, partie: PARTIE, questions: QUESTIONS,
  parameters: Object.fromEntries(parameters.map((row) => [row.cle, row.valeur])), segments, links, witnesses,
};
writeFileSync(`${ROOT}/ss-q46-51-snapshot-live.json`, `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify({
  segments: segments.length,
  range: [segments[0]?.segment_numero, segments.at(-1)?.segment_numero],
  links: links.length,
  witnesses: witnesses.length,
  reviewed: segments.filter((segment) => segment.liens_revus_le || segment.liens_revus_par).length,
  by_type: Object.fromEntries([1, 2, 3, 4].map((type) => [type, links.filter((link) => link.type === type).length])),
  by_reliability: Object.fromEntries([...new Set(links.map((link) => link.fiabilite))].map((value) => [value, links.filter((link) => link.fiabilite === value).length])),
}, null, 2));
