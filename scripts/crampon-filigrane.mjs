// Audit + nettoyage du filigrane « www.JesusMarie.com Bible Crampon » dans la Crampon
// (TR0003), importé du site source. `--fix` applique la correction ; sans, audit seul.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const FIX = process.argv.includes('--fix');

// Filigrane, toutes graphies plausibles : « www. JesusMarie. com Bible Crampon »,
// espaces facultatifs, casse libre, avec ou sans « www »/« Bible Crampon ».
const FILIGRANE = /\s*w{0,3}\s*\.?\s*jesus\s*-?\s*marie\s*\.?\s*com\b(\s*bible\s*crampon)?\s*\.?\s*/gi;
// Détection large (pour l'audit) : toute trace de site.
const TRACE = /jesus\s*-?\s*marie|www\s*\.|https?:\/\/|\.com\b/i;

async function page(sel) {
  const o = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await sb.from('versets_v2').select(sel).eq('trad_id', 'TR0003').order('id').range(d, d + 999);
    if (error) throw error;
    o.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return o;
}

const all = await page('id, canon_id, livre, ch_orig, v_orig, texte, notes');
const touches = all.filter((r) => TRACE.test(r.texte || '') || TRACE.test(r.notes || ''));

console.log(`Crampon (TR0003) : ${all.length} versets ; ${touches.length} portent une trace de site.\n`);
const aCorriger = [];
for (const r of touches) {
  const t = r.texte || '';
  const faux = FILIGRANE.test(t); FILIGRANE.lastIndex = 0;
  // Un « .com » ou « www » qui n'est PAS le filigrane est signalé mais non touché.
  const nettoye = t.replace(FILIGRANE, ' ').replace(/\s+/g, ' ').trim().replace(/\s+([.,;:!?»])/g, '$1');
  const change = nettoye !== t;
  console.log(`── ${r.livre} ${r.ch_orig},${r.v_orig}  ${change ? '⟶ À NETTOYER' : '(trace hors filigrane, laissé)'}`);
  console.log(`   avant : …${t.slice(-90)}`);
  if (change) { console.log(`   après : …${nettoye.slice(-70)}`); aCorriger.push({ id: r.id, texte: nettoye }); }
  if ((r.notes || '') && TRACE.test(r.notes)) console.log(`   ⚠ note aussi : ${r.notes.slice(0, 80)}`);
  console.log();
}

console.log(`À corriger : ${aCorriger.length}`);
if (FIX && aCorriger.length) {
  for (const c of aCorriger) {
    const { error } = await sb.from('versets_v2').update({ texte: c.texte }).eq('id', c.id);
    console.log(error ? `  ✗ ${c.id} : ${error.message}` : `  ✓ ${c.id} nettoyé`);
  }
} else if (aCorriger.length) {
  console.log('(audit seul — relancer avec --fix pour appliquer)');
}
process.exit(0);
