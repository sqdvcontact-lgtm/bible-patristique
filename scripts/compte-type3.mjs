// Combien de liens type 3 ai-je posés (par lecture, provenance non-editeur) ? Pour
// dimensionner un re-crible « commentaire vs écho ». Sur les Confessions d'abord.
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
  const ids = (await pageAll('id')).map((s) => s.id);
  const all = [];
  for (let i = 0; i < ids.length; i += 150) {
    const batch = ids.slice(i, i + 150);
    for (let de = 0; ; de += 1000) {
      const { data } = await sb.from('liens_bibliques').select('id, type, fiabilite, motif').in('segment_id', batch).range(de, de + 999);
      all.push(...(data || [])); if (!data || data.length < 1000) break;
    }
  }
  const par = {};
  for (const l of all) { const k = 't' + l.type; par[k] = (par[k] || 0) + 1; }
  const t3 = all.filter((l) => l.type === 3);
  console.log('oeuvre', OEUVRE, '· liens', all.length, '·', JSON.stringify(par));
  console.log('type 3 :', t3.length, '(probable', t3.filter((l) => l.fiabilite === 'probable').length, '/ douteux', t3.filter((l) => l.fiabilite === 'douteux').length, ')');
}
main().catch((e) => { console.error(e); process.exit(1); });
