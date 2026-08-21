import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ROOT = 'tmp/somme-liens-audit-2026-07-29';
const PAGE = 100;
const questions = Array.from({ length: 40 }, (_, i) => `Question ${1 + i}`);
mkdirSync(ROOT, { recursive: true });

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]),
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const must = async (query, label) => {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
};

const settings = await must(
  sb.from('parametres').select('cle,valeur,mis_a_jour').in('cle', ['charte_ia', 'feedback_liens_protocole']),
  'parametres',
);
const parameters = Object.fromEntries(settings.map((row) => [row.cle, {
  mis_a_jour: row.mis_a_jour,
  sha256: createHash('sha256').update(String(row.valeur ?? '')).digest('hex'),
}]));

const segments = [];
const pagination = [];
for (const question of questions) {
  for (let from = 0; ; from += PAGE) {
    const page = await must(
      sb.from('segments').select('*')
        .eq('id_oeuvre', 'A0013O0002')
        .eq('ref_niv1', 'Prima Pars')
        .eq('ref_niv2', question)
        .order('segment_numero')
        .range(from, from + PAGE - 1),
      `${question}:${from}`,
    );
    segments.push(...page);
    pagination.push({ objet: 'segments', question, from, to: from + PAGE - 1, lignes: page.length });
    if (page.length < PAGE) break;
  }
}
segments.sort((a, b) => a.segment_numero - b.segment_numero);

const links = [];
for (let offset = 0; offset < segments.length; offset += PAGE) {
  const segmentIds = segments.slice(offset, offset + PAGE).map((segment) => segment.id);
  for (let from = 0; ; from += PAGE) {
    const page = await must(
      sb.from('liens_bibliques').select('*').in('segment_id', segmentIds).order('id').range(from, from + PAGE - 1),
      `liens:${offset}:${from}`,
    );
    links.push(...page);
    pagination.push({ objet: 'liens', lot_segments: offset, from, to: from + PAGE - 1, lignes: page.length });
    if (page.length < PAGE) break;
  }
}
links.sort((a, b) => a.id - b.id);

const canonIds = [...new Set(links.map((link) => link.canon_id).filter(Boolean))];
const witnesses = [];
const witnessColumns = 'id_verset,ref,"num_TR0001","TR0001","num_TR0003","TR0003","num_TR0004","TR0004"';
for (let from = 0; from < canonIds.length; from += PAGE) {
  witnesses.push(...await must(
    sb.from('versets_lecture').select(witnessColumns).in('id_verset', canonIds.slice(from, from + PAGE)),
    `temoins:${from}`,
  ));
}

const specialIds = [...new Set(links.map((link) => link.verset_v2_id).filter(Boolean))];
const specialV2 = [];
for (let from = 0; from < specialIds.length; from += PAGE) {
  specialV2.push(...await must(
    sb.from('versets_v2').select('id,trad_id,livre,ch_orig,v_orig,v_orig_suffixe,canon_id,texte').in('id', specialIds.slice(from, from + PAGE)),
    `versets_v2:${from}`,
  ));
}

const raw = {
  exported_at: new Date().toISOString(), questions, parameters, pagination,
  segments, links, witnesses, special_v2: specialV2,
};
writeFileSync(`${ROOT}/pp-q1-40-raw.json`, `${JSON.stringify(raw, null, 2)}\n`);

console.log(JSON.stringify({
  segments: segments.length,
  range: [segments[0]?.segment_numero, segments.at(-1)?.segment_numero],
  links: links.length,
  witnesses: witnesses.length,
  special_v2: specialV2.length,
  marked_local: segments.filter((segment) => segment.liens_revus_le || segment.liens_revus_par).length,
  by_question: Object.fromEntries(questions.map((question) => [question, segments.filter((segment) => segment.ref_niv2 === question).length])),
  types: Object.fromEntries([1, 2, 3, 4].map((type) => [type, links.filter((link) => link.type === type).length])),
  special_targets: links.filter((link) => link.verset_v2_id || link.livre || link.chapitre).length,
  pagination, parameters,
}, null, 2));
