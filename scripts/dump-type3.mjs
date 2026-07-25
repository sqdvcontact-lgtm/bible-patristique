// Dump des liens type 3 « probable » (posés par moi) avec texte du segment, pour
// re-crible commentaire-doctrinal vs écho-thématique.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = process.argv[2] || 'A0010O0001';

async function pageAll(sel) {
  const o = [];
  for (let de = 0; ; de += 1000) {
    const { data } = await sb.from('segments').select(sel).eq('id_oeuvre', OEUVRE).order('segment_numero').range(de, de + 999);
    if (!data?.length) break; o.push(...data); if (data.length < 1000) break;
  }
  return o;
}
async function main() {
  const segs = await pageAll('id, segment_numero, segment_texte');
  const byId = new Map(segs.map((s) => [s.id, s]));
  const ids = segs.map((s) => s.id);
  const all = [];
  for (let i = 0; i < ids.length; i += 150) {
    const batch = ids.slice(i, i + 150);
    for (let de = 0; ; de += 1000) {
      const { data } = await sb.from('liens_bibliques').select('id, segment_id, canon_id, type, fiabilite').in('segment_id', batch).range(de, de + 999);
      all.push(...(data || [])); if (!data || data.length < 1000) break;
    }
  }
  const t3 = all.filter((l) => l.type === 3 && l.fiabilite === 'probable')
    .sort((a, b) => byId.get(a.segment_id).segment_numero - byId.get(b.segment_id).segment_numero);
  for (const l of t3) {
    const s = byId.get(l.segment_id);
    const txt = (s.segment_texte || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    console.log(`#${s.segment_numero} [${l.canon_id}] ${txt.slice(0, 220)}`);
  }
  console.log('\nTOTAL', t3.length);
}
main().catch((e) => { console.error(e); process.exit(1); });
