// ALIGNEMENT FINAL DE LA CLÉMENTINE — trois règles, dans cet ordre.
//
//  1. IDENTITÉ   — l'ossature est en numérotation vulgate (vérifié : elle ne
//     s'écarte de l'hébreu que dans les Psaumes, et c'est pour y suivre le grec).
//     Un verset latin (livre, ch, v) va donc au créneau de même nom.
//  2. DÉBORDEMENT — quand la Vulgate coupe le chapitre un cran plus loin (Nb 16/17,
//     1 Ch 5/6, 1 R 4/5…), le surplus d'un chapitre remplit le déficit du suivant.
//  3. SACY        — pour ce que les deux premières laissent (Tobie, Judith, Siracide :
//     recension latine propre), on hérite du placement de Sacy, qui traduit la même
//     Vulgate et dont l'alignement est déjà arbitré.
//     JAMAIS sur les Psaumes : Sacy y numérote la suscription 0, la Vulgate 1.
//
// Contrôle final : aucun créneau ne doit être servi deux fois.
//   node scripts/vulgate-aligne-final.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map((l)=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m)=>[m[1],m[2].replace(/^["']|["']$/g,'')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const resolus = JSON.parse(readFileSync('scripts/_vulgate_resolus.json','utf8'));   // règles 1 et 2
const tous    = [...JSON.parse(readFileSync('scripts/_vulgate_apparies.json','utf8')),
                 ...JSON.parse(readFileSync('scripts/_vulgate_orphelins.json','utf8'))];

const dejaPlace = new Set(resolus.map(r=>`${r.livre}|${r.ch}|${r.v}`));
const prisCanon = new Set(resolus.map(r=>r.canon_id));
const reste = tous.filter(l=>!dejaPlace.has(`${l.livre}|${l.ch}|${l.v}`));
console.log(`placés par identité + débordement : ${resolus.length}`);
console.log(`restant à placer                  : ${reste.length}`);

// règle 3 : héritage de Sacy (hors Psaumes)
let sacy=[];
for(let de=0;;de+=1000){const{data}=await sb.from('versets_v2').select('livre,ch_orig,v_orig,canon_id').eq('trad_id','TR0001').order('id').range(de,de+999);if(!data?.length)break;sacy.push(...data);if(data.length<1000)break;}
const parSacy=new Map();
for(const s of sacy) if(s.canon_id) parSacy.set(`${s.livre}|${s.ch_orig}|${s.v_orig}`, s.canon_id);

const finals=[...resolus]; const nonPlaces=[];
let viaSacy=0, refusesDoublon=0;
for (const l of reste) {
  if (l.livre === 'PSA') { nonPlaces.push({...l, cause:'Psaumes — Sacy inapplicable (suscription)'}); continue; }
  const c = parSacy.get(`${l.livre}|${l.ch}|${l.v}`);
  if (!c) { nonPlaces.push({...l, cause:'aucun créneau'}); continue; }
  if (prisCanon.has(c)) { refusesDoublon++; nonPlaces.push({...l, cause:'créneau déjà servi'}); continue; }
  prisCanon.add(c); finals.push({...l, canon_id:c}); viaSacy++;
}
console.log(`  · récupérés par Sacy : ${viaSacy}  (refusés pour doublon : ${refusesDoublon})`);

const compte=new Map(); for(const f of finals) compte.set(f.canon_id,(compte.get(f.canon_id)||0)+1);
const doublons=[...compte.entries()].filter(([,n])=>n>1);
console.log(`\nTOTAL PLACÉ : ${finals.length} / ${tous.length} (${(finals.length/tous.length*100).toFixed(1)} %)`);
console.log(`créneaux en doublon : ${doublons.length}`);
console.log(`non placés          : ${nonPlaces.length}`);
const pl={}; for(const n of nonPlaces) pl[n.livre]=(pl[n.livre]||0)+1;
console.log('  '+Object.entries(pl).sort((a,b)=>b[1]-a[1]).map(([k,n])=>k+' '+n).join(' · '));
writeFileSync('scripts/_vulgate_final.json', JSON.stringify(finals),'utf8');
writeFileSync('scripts/_vulgate_non_places.json', JSON.stringify(nonPlaces),'utf8');
process.exit(0);
