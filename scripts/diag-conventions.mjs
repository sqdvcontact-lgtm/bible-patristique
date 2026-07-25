// Diagnostic des conventions d'une œuvre avant constitution des liens :
// l'édition délimite-t-elle ses citations (guillemets) ? donne-t-elle des
// références en parenthèses ? — car la méthode d'appariement en dépend.
//   node scripts/diag-conventions.mjs A0017O0001 [A0016O0001 ...]
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const IDS = process.argv.slice(2).filter((a) => /^A\d{4}O\d{4}$/.test(a));
const clean = (t) => (t || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
// Référence biblique française en parenthèse : (Gn 1, 1) (Matth. XII, 3) (Ps. 50)
const REF_PAREN = /\((?:cf\.?\s*)?[1-4]?\s?[A-ZÉÈ][a-zéèêëîïôöûüç]{1,12}\.?\s*[IVXLCDM\d]+\s*[,.]\s*[\d–-]+[^)]{0,20}\)/;
const GUILL = /«[^»]{15,}»/;
async function pageAll(table, sel, filt) {
  const o = []; for (let de = 0; ; de += 1000) { let q = sb.from(table).select(sel).order('id').range(de, de + 999);
    if (filt) q = filt(q); const { data, error } = await q; if (error) throw error;
    o.push(...(data || [])); if (!data || data.length < 1000) break; } return o;
}
for (const id of IDS) {
  const segs = await pageAll('segments', 'id, segment_texte, nature', (q) => q.eq('id_oeuvre', id));
  const corps = segs.filter((s) => s.nature !== 'apparat_critique' && s.nature !== 'separateur');
  let g = 0, r = 0, ex = [];
  for (const s of corps) {
    const t = clean(s.segment_texte);
    const hg = GUILL.test(t), hr = REF_PAREN.test(t);
    if (hg) g++; if (hr) r++;
    if (hr && ex.length < 2) ex.push(t.slice(0, 160));
    else if (hg && ex.length < 2) ex.push(t.slice(0, 160));
  }
  const pc = (n) => corps.length ? Math.round((n / corps.length) * 100) : 0;
  console.log(`\n${id}  corps ${corps.length}  | guillemets ${g} (${pc(g)}%)  | réf. en parenthèse ${r} (${pc(r)}%)`);
  ex.forEach((e) => console.log('   ex. ' + e));
}
process.exit(0);
