import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const segments = [];
for (let from = 0; ; from += 500) {
  const { data, error } = await db.from('segments').select('id,segment_numero,segment_texte,ref_niv1,ref_niv2,ref_niv3')
    .eq('id_oeuvre', 'A0013O0002').order('segment_numero').range(from, from + 499);
  if (error) throw error;
  segments.push(...data);
  if (data.length < 500) break;
}
const linked = new Set();
for (let offset = 0; offset < segments.length; offset += 250) {
  const { data, error } = await db.from('liens_bibliques').select('segment_id')
    .in('segment_id', segments.slice(offset, offset + 250).map(({ id }) => id));
  if (error) throw error;
  for (const { segment_id } of data) linked.add(segment_id);
}
const book = String.raw`(?:Gn|Ex|Lv|Nb|Dt|Jos|Jg|Rt|1\s*S|2\s*S|1\s*R|2\s*R|1\s*Ch|2\s*Ch|Esd|Ne|Tb|Jdt|Est|1\s*M|2\s*M|Jb|Ps|Pr|Qo|Ct|Sg|Si|Is|Jr|Lm|Ba|Ez|Dn|Os|Jl|Am|Ab|Jon|Mi|Na|Ha|So|Ag|Za|Ml|Mt|Mc|Lc|Jn|Ac|Rm|1\s*Co|2\s*Co|Ga|Ep|Ph|Col|1\s*Th|2\s*Th|1\s*Tm|2\s*Tm|Tt|Phm|He|Jc|1\s*P|2\s*P|1\s*Jn|2\s*Jn|3\s*Jn|Jude|Ap)`;
const explicit = new RegExp(String.raw`\b${book}\.?\s*\d+\s*[,.:]\s*\d+`, 'giu');
const gaps = [];
for (const segment of segments) {
  if (linked.has(segment.id)) continue;
  const matches = [...segment.segment_texte.matchAll(explicit)].map((match) => match[0]);
  if (matches.length) gaps.push({ ...segment, matches });
}
for (const gap of gaps) console.log(`\n#${gap.segment_numero}|${gap.ref_niv1}/${gap.ref_niv2}/${gap.ref_niv3}|${gap.matches.join('; ')}\n${gap.segment_texte}`);
console.log(`\nEXPLICIT_UNLINKED ${gaps.length}`);
