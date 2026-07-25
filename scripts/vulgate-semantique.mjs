// APPARIEMENT SÉMANTIQUE LATIN ↔ FRANÇAIS, pour les versets vulgates sans créneau.
//
// Deux tentatives précédentes ont échoué (recouvrement de mots, puis « noms
// propres » mal extraits) : le latin et le français ne partagent presque aucune
// forme entière. Ce qu'ils partagent, ce sont des RACINES COURTES — scientiam/
// science, gloriam/gloire, intellectum/intelligence, honorabilis/honorable. On
// travaille donc sur les 3 premières lettres, pondérées par leur rareté (IDF),
// et l'on ne compare que dans un PÉRIMÈTRE ÉTROIT (les créneaux libres du même
// chapitre) : un signal faible suffit à trancher entre cinq candidats.
//
// SURTOUT : la méthode est VALIDÉE avant emploi, sur des versets dont on connaît
// déjà l'alignement. Si elle ne retrouve pas le bon créneau, on ne s'en sert pas.
//   node scripts/vulgate-semantique.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map((l)=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m)=>[m[1],m[2].replace(/^["']|["']$/g,'')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const norm = (s) => (s||'').replace(/<[^>]+>/g,' ').normalize('NFD').replace(/[̀-ͯ]/g,'')
  .toLowerCase().replace(/æ/g,'e').replace(/œ/g,'e').replace(/ae/g,'e')
  .replace(/j/g,'i').replace(/v/g,'u').replace(/y/g,'i').replace(/h/g,'')
  .replace(/[^a-z0-9]+/g,' ').trim();
const VIDES = new Set('et in de la le les des du un une qui que est sunt eum eius suo sua non ad ex per cum autem enim sed quod quia se ille ipse omnis omnes tuo tua meo mea nos uos ses son sa ses leur pour dans auec sur par il elle ils'.split(' '));
const racines = (s) => new Set(norm(s).split(' ').filter(m=>m.length>=4&&!VIDES.has(m)).map(m=>m.slice(0,3)));

async function pageAll(t,sel,f){const o=[];for(let de=0;;de+=1000){let q=sb.from(t).select(sel).order('id').range(de,de+999);if(f)q=f(q);const{data,error}=await q;if(error)throw error;o.push(...(data||[]));if(!data||data.length<1000)break;}return o;}

// texte français par créneau (Sacy d'abord — il traduit ce latin —, sinon Crampon)
const fr = new Map();
for (const tr of ['TR0003','TR0001']) {
  for (const r of await pageAll('versets_v2','canon_id, texte',(q)=>q.eq('trad_id',tr).not('canon_id','is',null)))
    if (r.texte) fr.set(r.canon_id, (tr==='TR0001'? r.texte : (fr.get(r.canon_id)||r.texte)));
}
const finals = JSON.parse(readFileSync('scripts/_vulgate_final.json','utf8'));
const non    = JSON.parse(readFileSync('scripts/_vulgate_non_places.json','utf8'));
const libres = JSON.parse(readFileSync('scripts/_vulgate_libres.json','utf8'));

// IDF des racines, sur l'ensemble des textes français connus
const df = new Map(); let N = 0;
for (const t of fr.values()) { N++; for (const r of racines(t)) df.set(r,(df.get(r)||0)+1); }
const idf = (r) => Math.log((N+1)/((df.get(r)||0)+1))+1;
function score(la, frTxt) {
  const A = racines(la), B = racines(frTxt);
  if (!A.size || !B.size) return 0;
  let inter = 0, tot = 0;
  for (const r of A) { const w = idf(r); tot += w; if (B.has(r)) inter += w; }
  return tot ? inter/tot : 0;
}

// ── VALIDATION : la méthode retrouve-t-elle un alignement connu ? ───────────
const parCh = new Map();
for (const f of finals) { const k=`${f.livre}|${f.ch}`; let l=parCh.get(k); if(!l)parCh.set(k,l=[]); l.push(f); }
let essais=0, reussites=0, ex=[];
for (const f of finals) {
  if (essais >= 800) break;
  const voisins = parCh.get(`${f.livre}|${f.ch}`)||[];
  if (voisins.length < 4) continue;                    // il faut de vrais concurrents
  const cands = voisins.slice(0,12).map(v=>v.canon_id);
  if (!cands.includes(f.canon_id)) continue;
  essais++;
  let best=null;
  for (const c of cands) { const s = score(f.texte, fr.get(c)||''); if(!best||s>best.s) best={c,s}; }
  if (best.c === f.canon_id) reussites++;
  else if (ex.length<3) ex.push({vrai:f.canon_id, trouve:best.c, la:f.texte.slice(0,60)});
}
const taux = reussites/essais;
console.log(`VALIDATION — le bon créneau est retrouvé ${reussites} / ${essais} fois (${(taux*100).toFixed(1)} %)`);
for (const e of ex) console.log(`   raté : vrai ${e.vrai} · trouvé ${e.trouve} · ${e.la}`);

if (taux < 0.5) { console.log('\n→ méthode NON FIABLE : on ne s’en sert pas, tout ira en surnuméraire.'); process.exit(0); }

// ── APPLICATION aux non-placés ─────────────────────────────────────────────
const libresParCh = new Map();
for (const l of libres) { const k=`${l.livre}|${l.ch_canon}`; let a=libresParCh.get(k); if(!a)libresParCh.set(k,a=[]); a.push(l.id); }
const trouves=[], surnumeraires=[];
const pris = new Set();
for (const n of non) {
  const cands = (libresParCh.get(`${n.livre}|${n.ch}`)||[]).filter(c=>!pris.has(c));
  if (!cands.length) { surnumeraires.push(n); continue; }
  let best=null, second=0;
  for (const c of cands) { const s=score(n.texte, fr.get(c)||''); if(!best||s>best.s){second=best?best.s:0;best={c,s};} else if(s>second) second=s; }
  // exigence : score net ET nettement devant le suivant
  if (best.s >= 0.30 && best.s >= second + 0.10) { pris.add(best.c); trouves.push({...n, canon_id:best.c, score:best.s}); }
  else surnumeraires.push(n);
}
console.log(`\ncorrespondance trouvée : ${trouves.length}`);
console.log(`à placer en surnuméraire : ${surnumeraires.length}`);
console.log('\n── échantillon des correspondances retenues');
for (const t of trouves.slice(0,8)) console.log(`  ${t.canon_id.padEnd(12)} ${t.score.toFixed(2)}  LA ${t.texte.slice(0,52)}\n${''.padEnd(19)}FR ${(fr.get(t.canon_id)||'').slice(0,52)}`);
writeFileSync('scripts/_vulgate_trouves.json', JSON.stringify(trouves),'utf8');
writeFileSync('scripts/_vulgate_surnumeraires.json', JSON.stringify(surnumeraires),'utf8');
process.exit(0);
