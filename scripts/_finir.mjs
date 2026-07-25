import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const ECARTES = new Set(['GEN 37','NEH 7']);
const NOTE = 'Créneau repris de la Bible de Sacy : la Vulgate range en fin de chapitre ce que l’ossature ouvre au chapitre suivant (déplacement de frontière).';

const { series, isoles } = JSON.parse(readFileSync('scripts/_vulgate_decalages.json','utf8'));
const ser = series.filter(s => !ECARTES.has(s.k));

let V = [];
for (let de=0;;de+=1000){ const {data} = await sb.from('versets_v2').select('id, canon_id')
  .eq('trad_id','TR0004').order('id').range(de,de+999);
  if(!data?.length) break; V.push(...data); if(data.length<1000) break; }
const compte = f => { const m=new Map(); for(const r of V){const c=f(r); if(c) m.set(c,(m.get(c)||0)+1);} return m; };

// L'état ORIGINEL est celui du diagnostic : on repart de lui, non de la base à demi modifiée.
const origine = new Map();
for (const s of [...series,...isoles]) for (const e of s.g) origine.set(e.id, e.canon_id);
const avant = compte(r => origine.get(r.id) ?? r.canon_id);

const mvS = new Map(); for (const s of ser) for (const e of s.g) mvS.set(e.id, e.cible);
const apS = compte(r => mvS.get(r.id) ?? origine.get(r.id) ?? r.canon_id);
const trous = new Set([...avant.keys()].filter(c => !apS.has(c)));
const tetes = isoles.filter(s => s.n===1 && !ECARTES.has(s.k)).flatMap(s=>s.g).filter(e => trous.has(e.cible));
const tous = [...ser.flatMap(s=>s.g), ...tetes];
const mv = new Map(); for (const e of tous) mv.set(e.id, e.cible);

const ap = compte(r => mv.get(r.id) ?? origine.get(r.id) ?? r.canon_id);
const nouv = [...ap.entries()].filter(([c,n]) => n>1 && (avant.get(c)||0)<=1);
const aban = [...avant.keys()].filter(c => !ap.has(c));
console.log(`mouvements : ${mv.size} · collisions créées : ${nouv.length} · créneaux abandonnés : ${aban.length}`);
if (nouv.length || aban.length) { console.log('→ pas assez propre, rien écrit'); process.exit(0); }

// écriture groupée par destination
const parCible = new Map();
for (const e of tous) { let a = parCible.get(e.cible); if(!a) parCible.set(e.cible, a=[]); a.push(e.id); }
let ok = 0, lots = 0;
for (const [cible, ids] of parCible) {
  const { error } = await sb.from('versets_v2')
    .update({ canon_id: cible, alignement_verifie: false, notes: NOTE }).in('id', ids);
  if (error) console.log('ERR', cible, error.message); else { ok += ids.length; lots++; }
}
console.log(`✓ ${ok} versets recréneautés en ${lots} écritures`);
process.exit(0);
