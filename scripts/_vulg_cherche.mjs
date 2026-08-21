import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const FRAG = [
  'rami illius longævi', 'Qui timetis Dominum, diligite',
  'custodiunt mandata illius, et patientiam',
  'Cor ingrediens duas vias', 'Sapiens cor et intelligibile',
  'Ne reverearis proximum tuum', 'Humiliare Deo, et exspecta',
  'Noli esse humilis in sapientia', 'adjecit mandata et præcepta sua',
  'nam duplicia mala invenies', 'sed quæ præcepit tibi Deus',
  'utile est mori sine filiis', 'qui comitatur cum viro iniquo',
  'Non dicas : A Deo abscondar',
];
let rows = [];
for (let de=0;;de+=1000){
  const {data} = await sb.from('versets_v2').select('id, livre, ch_orig, v_orig, canon_id, ordre_slot, texte')
    .eq('trad_id','TR0004').eq('livre','SIR').order('id').range(de,de+999);
  if(!data?.length) break; rows.push(...data); if(data.length<1000) break;
}
console.log(`Vulgate — Siracide : ${rows.length} versets\n`);
for (const f of FRAG) {
  const hit = rows.filter(r => (r.texte||'').includes(f));
  if (!hit.length) { console.log(`✗ INTROUVABLE : « ${f} »`); continue; }
  for (const h of hit)
    console.log(`  Vulg ${String(h.ch_orig).padStart(2)},${String(h.v_orig).padStart(2)} → ${String(h.canon_id).padEnd(11)} slot ${h.ordre_slot}  « ${h.texte.slice(0,62)} »`);
}
process.exit(0);
