// Re-crible des liens type 3 « probable » des Confessions (cf. feedback_type3_commentaire).
// VERS4 : vrais échos, rétrogradés en type 4. VERS1 : en réalité des citations verbatim,
// remontés en type 1 (lien plus fort qu'un écho). --agit pour appliquer.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = 'A0010O0001';
const AGIT = process.argv.includes('--agit');

// [segment_numero, canon_id] → type cible
const VERS4 = [[46, 'JHN.14.23'], [1682, 'MAT.11.29'], [1643, 'PHP.2.8'], [1954, 'MAT.19.26'], [2831, 'ISA.14.15']];

async function pageAll(sel) {
  const o = [];
  for (let de = 0; ; de += 1000) {
    const { data } = await sb.from('segments').select(sel).eq('id_oeuvre', OEUVRE).order('segment_numero').range(de, de + 999);
    if (!data?.length) break; o.push(...data); if (data.length < 1000) break;
  }
  return o;
}
async function main() {
  const parNum = new Map((await pageAll('id, segment_numero')).map((s) => [s.segment_numero, s.id]));
  let n = 0; const absents = [];
  for (const [num, canon] of VERS4) {
    const sid = parNum.get(num); if (!sid) { absents.push('#' + num); continue; }
    const { data } = await sb.from('liens_bibliques').select('id').eq('segment_id', sid).eq('canon_id', canon).eq('type', 3);
    if (!data?.length) { absents.push('#' + num + ' ' + canon); continue; }
    if (AGIT) await sb.from('liens_bibliques').update({ type: 4 }).in('id', data.map((x) => x.id));
    n += data.length;
  }
  console.log(`${AGIT ? '' : '(simulation) '}type 3 → 4 : ${n}`);
  if (absents.length) console.log('introuvables :', absents.join(', '));
}
main().catch((e) => { console.error(e); process.exit(1); });
