// RÉSOLUTION AUTOMATIQUE DES FRONTIÈRES DE CHAPITRE (Vulgate ↔ ossature).
//
// La Vulgate et l'hébreu placent parfois la coupure de chapitre à un verset près :
// Nb 16 vulgate contient 15 versets que l'hébreu ouvre au ch. 17 ; de même 1 Ch 5/6,
// 1 R 4/5, Jl 3/4. Cela se voit à ce que le SURPLUS d'un chapitre égale exactement
// le DÉFICIT du suivant. On peut donc reporter le débordement sans rien deviner,
// et le contrôler : chaque créneau doit être couvert une fois et une seule.
//   node scripts/vulgate-resout-debordements.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map((l)=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m)=>[m[1],m[2].replace(/^["']|["']$/g,'')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const lat = [...JSON.parse(readFileSync('scripts/_vulgate_apparies.json','utf8')),
             ...JSON.parse(readFileSync('scripts/_vulgate_orphelins.json','utf8'))];
let c = [];
for (let de=0;;de+=1000){const{data}=await sb.from('versets_canon').select('livre,ch_canon,v_canon').order('id').range(de,de+999);if(!data?.length)break;c.push(...data);if(data.length<1000)break;}
const oss = new Map();
for (const r of c){const k=r.livre+'|'+r.ch_canon;let s=oss.get(k);if(!s)oss.set(k,s=new Set());s.add(r.v_canon);}
const la = new Map();
for (const l of lat){const k=l.livre+'|'+l.ch;let s=la.get(k);if(!s)la.set(k,s=new Map());s.set(l.v,l);}

const resolus = [];      // {livre, ch, v, canon_id}
const restants = [];     // chapitres non résolus
let sursDirect = 0;

for (const [k, S] of la) {
  const [livre, chS] = k.split('|'); const ch = +chS;
  const O = oss.get(k);
  if (!O) { restants.push({ ch:k, cause:'chapitre absent de l’ossature' }); continue; }
  const surplus = [...S.keys()].filter(v=>!O.has(v)).sort((a,b)=>a-b);
  const manque  = [...O].filter(v=>!S.has(v)).sort((a,b)=>a-b);
  if (!surplus.length && !manque.length) {
    for (const [v, l] of S) resolus.push({ ...l, canon_id: `${livre}.${ch}.${v}` });
    sursDirect += S.size; continue;
  }
  // débordement sur le chapitre suivant ?
  const kSuiv = `${livre}|${ch+1}`;
  const Ssuiv = la.get(kSuiv), Osuiv = oss.get(kSuiv);
  if (surplus.length && !manque.length && Ssuiv && Osuiv) {
    const manqueSuiv = [...Osuiv].filter(v=>!Ssuiv.has(v)).sort((a,b)=>a-b);
    if (manqueSuiv.length === surplus.length) {
      // le surplus de ce chapitre remplit, dans l'ordre, les créneaux manquants du suivant
      for (const [v, l] of S) {
        const i = surplus.indexOf(v);
        resolus.push({ ...l, canon_id: i === -1 ? `${livre}.${ch}.${v}` : `${livre}.${ch+1}.${manqueSuiv[i]}` });
      }
      // et le chapitre suivant se décale d'autant
      const libres = [...Osuiv].filter(v=>!manqueSuiv.includes(v)).sort((a,b)=>a-b);
      const vSuiv = [...Ssuiv.keys()].sort((a,b)=>a-b);
      if (libres.length === vSuiv.length) {
        vSuiv.forEach((v,i)=>resolus.push({ ...Ssuiv.get(v), canon_id: `${livre}.${ch+1}.${libres[i]}` }));
        la.delete(kSuiv);   // traité
        continue;
      }
    }
  }
  restants.push({ ch:k, latin:S.size, ossature:O.size, surplus:surplus.length, manque:manque.length });
}

// contrôle : chaque créneau couvert une fois et une seule ?
const compte = new Map();
for (const r of resolus) compte.set(r.canon_id,(compte.get(r.canon_id)||0)+1);
const doublons = [...compte.entries()].filter(([,n])=>n>1);

console.log(`versets placés      : ${resolus.length} / ${lat.length} (${(resolus.length/lat.length*100).toFixed(1)} %)`);
console.log(`  · par identité    : ${sursDirect}`);
console.log(`  · par débordement : ${resolus.length - sursDirect}`);
console.log(`créneaux en doublon : ${doublons.length}${doublons.length?' → '+doublons.slice(0,5).map(d=>d[0]).join(', '):''}`);
console.log(`\nchapitres restants  : ${restants.length}`);
const pl = {}; for (const r of restants) pl[r.ch.split('|')[0]] = (pl[r.ch.split('|')[0]]||0)+1;
console.log('  ' + Object.entries(pl).sort((a,b)=>b[1]-a[1]).map(([k,n])=>k+' '+n).join(' · '));
writeFileSync('scripts/_vulgate_resolus.json', JSON.stringify(resolus),'utf8');
writeFileSync('scripts/_vulgate_restants.json', JSON.stringify(restants),'utf8');
process.exit(0);
