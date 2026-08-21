import { readFileSync } from 'node:fs';
const { createClient } = await import('@supabase/supabase-js').catch(() => import('../node_modules/.ignored/@supabase/supabase-js/dist/index.mjs'));
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data, error } = await db.from('segments').select('id,segment_numero,segment_texte,texte_original,ref_niv1,ref_niv1_texte,ref_niv2,ref_niv2_texte,ref_niv3,ref_niv3_texte,ref_niv4,ref_niv4_texte').eq('id_oeuvre', 'A0091O0001').order('segment_numero');
if (error) throw error;
const fields = ['segment_texte','texte_original','ref_niv1','ref_niv1_texte','ref_niv2','ref_niv2_texte','ref_niv3','ref_niv3_texte','ref_niv4','ref_niv4_texte'];
const hits = [];
for (const row of data) for (const field of fields) {
  const value = String(row[field] ?? '');
  for (const match of value.matchAll(/.{0,70}[»”"]\s*\[\[\d+\]\].{0,30}/gu)) hits.push({ segment: row.segment_numero, id: row.id, field, excerpt: match[0] });
}
console.log(JSON.stringify({ count: hits.length, hits }, null, 2));
