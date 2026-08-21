// La Vulgate adopte l'alignement ARBITRÉ de Sacy, là où il diffère du sien.
//
// Sacy traduit la Vulgate : quand son placement s'écarte de celui de la Vulgate,
// c'est qu'il a été arbitré (inversions, scissions, créneaux sautés) tandis que la
// Vulgate n'a reçu qu'un alignement par identité. On reporte, chapitre par chapitre,
// avec le contrôle d'usage : aucune collision créée, aucun créneau abandonné.
//   node scripts/vulgate-suit-sacy.mjs SIR:17 [--dry]
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.argv.includes('--dry');
const CIBLES = process.argv.slice(2).filter(a=>/^[A-Z0-9]{3}:\d+$/.test(a));

for (const c of CIBLES) {
  const [livre, ch] = c.split(':');
  const { data: S } = await sb.from('versets_v2').select('v_orig, canon_id')
    .eq('trad_id','TR0001').eq('livre',livre).eq('ch_orig',+ch).order('v_orig');
  const { data: V } = await sb.from('versets_v2').select('id, v_orig, canon_id')
    .eq('trad_id','TR0004').eq('livre',livre).eq('ch_orig',+ch).order('v_orig');
  // premier créneau que Sacy donne à chaque numéro de verset
  const cible = new Map();
  for (const s of S||[]) if (s.canon_id && !cible.has(s.v_orig)) cible.set(s.v_orig, s.canon_id);

  const avant = new Set((V||[]).map(r=>r.canon_id).filter(Boolean));
  const mv = [];
  for (const r of V||[]) {
    const t = cible.get(r.v_orig);
    if (t && t !== r.canon_id) mv.push({ ...r, vers: t });
  }
  const apres = new Set((V||[]).map(r => mv.find(m=>m.id===r.id)?.vers ?? r.canon_id).filter(Boolean));
  const doublons = (() => { const m=new Map(); for(const r of V||[]){const c2=mv.find(x=>x.id===r.id)?.vers ?? r.canon_id; if(c2) m.set(c2,(m.get(c2)||0)+1);} return [...m.values()].filter(n=>n>1).length; })();
  const perdus = [...avant].filter(x=>!apres.has(x));
  console.log(`\n${livre} ${ch} — ${mv.length} versets à déplacer`);
  console.log(`   créneaux à double occupant après : ${doublons} · créneaux abandonnés : ${perdus.length}${perdus.length?'  '+perdus.join(' '):''}`);
  for (const m of mv.slice(0,12)) console.log(`     v.${String(m.v_orig).padEnd(3)} ${m.canon_id} → ${m.vers}`);
  if (DRY || perdus.length) { if(perdus.length) console.log('   → créneaux abandonnés : on n’écrit pas'); continue; }
  let n=0;
  for (const m of mv) {
    const { error } = await sb.from('versets_v2').update({ canon_id:m.vers, alignement_verifie:false,
      notes:'Créneau repris de la Bible de Sacy, dont l’alignement a été arbitré ici (inversions et scissions propres à ce chapitre) ; la Vulgate n’avait qu’un alignement par identité.' }).eq('id', m.id);
    if (!error) n++;
  }
  console.log(`   ✓ ${n} déplacés`);
}
if (DRY) console.log('\n(--dry : rien écrit)');
process.exit(0);
