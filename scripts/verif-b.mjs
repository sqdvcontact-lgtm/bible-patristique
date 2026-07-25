import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = 'A0010O0001';
const NUMS = [11, 1549, 1660, 1683, 1728, 1802, 2065, 2072, 2706, 2937, 3355, 3831];
async function pageAll(sel) {
  const o = [];
  for (let de = 0; ; de += 1000) {
    const { data } = await sb.from('segments').select(sel).eq('id_oeuvre', OEUVRE).order('segment_numero').range(de, de + 999);
    if (!data?.length) break; o.push(...data); if (data.length < 1000) break;
  }
  return o;
}
async function main() {
  const segs = (await pageAll('segment_numero, segment_texte')).filter((s) => NUMS.includes(s.segment_numero));
  for (const s of segs) {
    const t = (s.segment_texte || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    console.log(`#${s.segment_numero} ${/[«»]/.test(t) ? '[GUILLEMETS]' : '[fondu]'} ${t}`);
    console.log('');
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
