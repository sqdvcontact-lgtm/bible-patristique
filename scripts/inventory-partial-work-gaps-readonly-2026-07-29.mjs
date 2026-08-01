import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
for (const oeuvre of ['A0014O0001', 'A0014O0038']) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('segments').select('segment_numero,ref_niv1,ref_niv2,ref_niv3,nature,segment_texte')
      .eq('id_oeuvre', oeuvre).is('liens_revus_le', null).order('segment_numero').range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  const groups = {};
  for (const row of rows) {
    const key = `${row.ref_niv1 ?? '∅'} | ${row.ref_niv2 ?? '∅'} | ${row.nature ?? '∅'}`;
    (groups[key] ??= []).push(row.segment_numero);
  }
  console.log(JSON.stringify({ oeuvre, unreviewed: rows.length, groups,
    samples: rows.slice(0, 8).map((row) => ({ numero: row.segment_numero, niv1: row.ref_niv1, niv2: row.ref_niv2, nature: row.nature, texte: row.segment_texte.slice(0, 180) })) }, null, 2));
}
