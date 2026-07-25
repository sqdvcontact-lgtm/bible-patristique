// Correction ponctuelle : « limon informe … image divine » (Confessions) — le lien
// vers GEN.1.27 était en type 3 (commentaire) ; c'est un écho thématique (type 4).
// Augustin n'explique ni n'affirme rien SUR Gn 1,27, il en fait résonner l'image.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = 'A0010O0001';
const AGIT = process.argv.includes('--agit');

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
  const cibles = segs.filter((s) => /limon informe/i.test((s.segment_texte || '')));
  for (const s of cibles) {
    console.log(`#${s.segment_numero} :`, s.segment_texte.replace(/<[^>]+>/g, '').slice(0, 160));
    const { data } = await sb.from('liens_bibliques').select('id, canon_id, type, fiabilite').eq('segment_id', s.id);
    for (const l of data || []) console.log(`   lien ${l.canon_id} type ${l.type} (${l.fiabilite}) id=${l.id}`);
    if (AGIT) {
      const gn = (data || []).filter((l) => l.canon_id === 'GEN.1.27' && l.type === 3);
      for (const l of gn) { await sb.from('liens_bibliques').update({ type: 4 }).eq('id', l.id); console.log('   → GEN.1.27 passé en type 4'); }
    }
  }
  if (!AGIT) console.log('(simulation — ajouter --agit)');
}
main().catch((e) => { console.error(e); process.exit(1); });
