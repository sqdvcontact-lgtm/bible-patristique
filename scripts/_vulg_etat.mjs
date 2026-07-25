import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const ZONES = process.argv[2] ? JSON.parse(process.argv[2]) : [[1,19,22]];
const N = { TR0001:'Sacy', TR0004:'Vulg' };
for (const [ch, d, f] of ZONES) {
  const ids = [];
  for (let v = d; v <= f; v++) ids.push(`SIR.${ch}.${v}`);
  const { data } = await sb.from('versets_v2')
    .select('trad_id, ch_orig, v_orig, canon_id, ordre_slot, texte')
    .in('canon_id', ids).in('trad_id', ['TR0001','TR0004']);
  console.log(`\n═══ Siracide ${ch}, ${d}-${f} ═══`);
  for (const id of ids) {
    const l = (data||[]).filter(r => r.canon_id === id)
      .sort((a,b) => a.trad_id.localeCompare(b.trad_id) || (a.ordre_slot||0)-(b.ordre_slot||0));
    console.log(`\n  ── ${id} ──` + (l.length ? '' : '   (VIDE des deux côtés)'));
    for (const r of l)
      console.log(`     ${N[r.trad_id]} ${String(r.ch_orig)},${String(r.v_orig).padEnd(2)} slot ${r.ordre_slot ?? '–'} │ ${(r.texte||'(vide)').replace(/<[^>]+>/g,'').slice(0,95)}`);
  }
}
process.exit(0);
