import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ROOT = 'tmp/somme-liens-audit-2026-07-29';
const parts = ['Prima Pars', 'Prima Secundae', 'Secunda Secundae', 'Tertia Pars'];
mkdirSync(ROOT, { recursive: true });
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const must = async (query, label) => { const { data, error } = await query; if (error) throw new Error(`${label}: ${error.message}`); return data; };
const parameterRows = await must(db.from('parametres').select('cle,valeur,mis_a_jour').in('cle', ['charte_ia', 'feedback_liens_protocole']), 'parametres');
const parameters = Object.fromEntries(parameterRows.map((row) => [row.cle, {
  mis_a_jour: row.mis_a_jour,
  sha256: createHash('sha256').update(String(row.valeur || '')).digest('hex'),
}]));
const allSegments = [];
const pagination = [];
for (const part of parts) for (let from = 0; ; from += 1000) {
  const page = await must(db.from('segments').select('*').eq('id_oeuvre', 'A0013O0002').eq('ref_niv1', part)
    .order('segment_numero').range(from, from + 999), `${part}:${from}`);
  allSegments.push(...page);
  pagination.push({ objet: 'segments-source', part, from, lignes: page.length });
  if (page.length < 1000) break;
}
const segments = allSegments.filter((segment) => !/^Question [0-9]+$/.test(String(segment.ref_niv2 || '')))
  .sort((left, right) => left.segment_numero - right.segment_numero);
const links = [];
for (let offset = 0; offset < segments.length; offset += 100) for (let from = 0; ; from += 100) {
  const page = await must(db.from('liens_bibliques').select('*').in('segment_id', segments.slice(offset, offset + 100).map((segment) => segment.id))
    .order('id').range(from, from + 99), `liens:${offset}:${from}`);
  links.push(...page);
  pagination.push({ objet: 'liens', lot: offset, from, lignes: page.length });
  if (page.length < 100) break;
}
links.sort((left, right) => left.id - right.id);
const canonIds = [...new Set(links.map((link) => link.canon_id).filter(Boolean))];
const witnesses = canonIds.length ? await must(db.from('versets_lecture')
  .select('id_verset,ref,"num_TR0001","TR0001","num_TR0003","TR0003","num_TR0004","TR0004"').in('id_verset', canonIds), 'témoins') : [];
const specialIds = [...new Set(links.map((link) => link.verset_v2_id).filter(Boolean))];
const specialV2 = specialIds.length ? await must(db.from('versets_v2').select('*').in('id', specialIds), 'v2') : [];
const raw = { exported_at: new Date().toISOString(), parts, scope_rule: 'ref_niv2 ne matche pas ^Question [0-9]+$', parameters, pagination, segments, links, witnesses, special_v2: specialV2 };
writeFileSync(`${ROOT}/hors-questions-raw.json`, `${JSON.stringify(raw, null, 2)}\n`);
console.log(JSON.stringify({
  source_segments: allSegments.length, segments: segments.length, range: [segments[0]?.segment_numero, segments.at(-1)?.segment_numero],
  links: links.length, witnesses: witnesses.length, special_v2: specialV2.length,
  marked: segments.filter((segment) => segment.liens_revus_par === 'IA-lecture' && segment.liens_revus_le).length,
  unmarked: segments.filter((segment) => !(segment.liens_revus_par === 'IA-lecture' && segment.liens_revus_le)).map((segment) => segment.segment_numero),
  types: Object.fromEntries([1, 2, 3, 4].map((type) => [type, links.filter((link) => link.type === type).length])),
  by_part: Object.fromEntries(parts.map((part) => [part, segments.filter((segment) => segment.ref_niv1 === part).length])),
}, null, 2));
