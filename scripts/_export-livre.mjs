// Export d'un livre de la Cité de Dieu vers le scratchpad, avec liens existants.
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = 'A0010O0002';
const LIVRE = process.argv[2];          // ex. "Livre XVII"
const OUT = process.argv[3];            // chemin de sortie
async function pageAll(sel, tbl, filt) {
  const o = [];
  for (let de = 0; ; de += 1000) {
    let q = sb.from(tbl).select(sel).order('id').range(de, de + 999);
    for (const [k, v] of Object.entries(filt || {})) q = q.eq(k, v);
    const { data } = await q; if (!data?.length) break; o.push(...data); if (data.length < 1000) break;
  }
  return o;
}
const segs = (await pageAll('id, segment_numero, ref_niv1, ref_niv2', 'segments', { id_oeuvre: OEUVRE }))
  .filter((s) => s.ref_niv1 === LIVRE).sort((a, b) => a.segment_numero - b.segment_numero);
const ids = segs.map((s) => s.id);
const textes = new Map();
for (let i = 0; i < ids.length; i += 150) {
  const { data } = await sb.from('segments').select('id, segment_texte, ref_niv3').in('id', ids.slice(i, i + 150));
  for (const r of data || []) textes.set(r.id, r);
}
for (const s of segs) { const r = textes.get(s.id) || {}; s.texte = r.segment_texte; s.ref3 = r.ref_niv3; }
const liens = new Map();
for (let i = 0; i < ids.length; i += 150) {
  const { data } = await sb.from('liens_bibliques').select('segment_id, canon_id, type').in('segment_id', ids.slice(i, i + 150));
  for (const l of data || []) { (liens.get(l.segment_id) || liens.set(l.segment_id, []).get(l.segment_id)).push(`${l.canon_id}/t${l.type}`); }
}
const lignes = segs.map((s) => {
  const tags = (liens.get(s.id) || []).sort();
  const t = tags.length ? `{${tags.join(' ')}} ` : '';
  return `#${s.segment_numero} [${s.ref_niv2 || ''} ${s.ref3 || ''}] ${t}${(s.texte || '').replace(/\s+/g, ' ').trim()}`;
});
writeFileSync(OUT, lignes.join('\n'), 'utf8');
console.log(`${segs.length} segments → ${OUT}`);
