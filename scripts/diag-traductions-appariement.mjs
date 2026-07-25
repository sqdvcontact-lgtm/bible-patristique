// Quelle traduction fait tomber juste ? — mesure de la contribution MARGINALE de
// chaque traduction à l'appariement des citations. Répond à : « ajouter une
// traduction servirait-il à constituer les liens ? »
//
// Pour chaque citation délimitée d'une œuvre, on calcule le meilleur score
// atteignable (a) avec toutes les traductions, (b) en retirant chacune d'elles.
// L'écart = ce que cette traduction apporte, et qu'aucune autre ne remplace.
//   node scripts/diag-traductions-appariement.mjs A0011O2988 A0015O0001
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRES = process.argv.slice(2).filter((a) => /^A\d{4}O\d{4}$/.test(a));
const SEUIL_BAS = 0.35, MIN_TOKENS_COMMUNS = 3, MIN_MOTS_QUOTE = 5;
const ancienneGraphie = (m) => m.replace(/oi/g, 'ai').replace(/([bcdfgjklmnpqrstvxz])ans$/, '$1ants');
const mots = (s) => (s || '').replace(/<[^>]+>/g, ' ').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter((m) => m.length > 2).map((m) => ancienneGraphie(m).slice(0, 5));
const VIDES = new Set(['les','des','que','qui','pour','dans','avec','est','son','sur','plus','tout','tous','par','une','aux','ses','leur','ils','elle','vous','nous','mais','comme','cette','ces','pas','ont','sont','lui','ne','se','de','du','la','le','et','en','un','il','ce','sa','car','point','donc','quand','dont','fait','faire','avoir','etre']);
const contentTokens = (s) => mots(s).filter((m) => !VIDES.has(m));
async function pageAll(t, sel, f) { const o=[]; for(let de=0;;de+=1000){let q=sb.from(t).select(sel).range(de,de+999); if(f)q=f(q); const{data,error}=await q; if(error)throw error; o.push(...(data||[])); if(!data||data.length<1000)break;} return o; }

const versets = await pageAll('versets_v2', 'canon_id, texte, trad_id', (q) => q.not('canon_id','is',null).not('texte','is',null));
const docs = [], df = new Map();
for (const v of versets) { const toks = new Set(contentTokens(v.texte)); if (!toks.size) continue;
  docs.push({ canon: v.canon_id, trad: v.trad_id, toks }); for (const t of toks) df.set(t,(df.get(t)||0)+1); }
const N = docs.length, idf = (t) => Math.log((N+1)/((df.get(t)||0)+1))+1;
const PLAFOND = N*0.06, index = new Map();
docs.forEach((d,i)=>{ for(const t of d.toks){ if((df.get(t)||0)>PLAFOND) continue; let a=index.get(t); if(!a)index.set(t,a=[]); a.push(i);} });
const poidsDoc = docs.map((d)=>{let w=0; for(const t of d.toks) w+=idf(t); return w;});
const TRADS = [...new Set(docs.map(d=>d.trad))].sort();

for (const OEUVRE of OEUVRES) {
  const segs = await pageAll('segments','id, segment_texte',(q)=>q.eq('id_oeuvre',OEUVRE));
  const spans = [];
  for (const s of segs) for (const m of String(s.segment_texte||'').replace(/<[^>]+>/g,' ').matchAll(/«([^»]{4,400})»/g)) {
    const toks = contentTokens(m[1]); if (toks.length < MIN_MOTS_QUOTE) continue; spans.push(new Set(toks)); }
  // gagnant par traduction + meilleur score en excluant chaque traduction
  const gagne = {}, perdus = {}; for (const t of TRADS){gagne[t]=0;perdus[t]=0;}
  let retenus = 0;
  for (const sp of spans) {
    const acc = new Map();
    for (const t of sp) { const lst = index.get(t); if(!lst) continue; const w = idf(t);
      for (const i of lst){ const e=acc.get(i)||{w:0,n:0}; e.w+=w; e.n+=1; acc.set(i,e);} }
    let pq = 0; for (const t of sp) if ((df.get(t)||0)<=PLAFOND) pq += idf(t);
    const f = (i,e)=>{ const rec=e.w/poidsDoc[i], pr=pq?e.w/pq:0; return (rec+pr)?(2*rec*pr)/(rec+pr):0; };
    let best=null, parTrad={}; for(const t of TRADS) parTrad[t]=null;
    for (const [i,e] of acc){ if(e.n<MIN_TOKENS_COMMUNS) continue; const sc=f(i,e);
      if(!best||sc>best.sc) best={sc,i,trad:docs[i].trad};
      const d=docs[i].trad; if(parTrad[d]===null||sc>parTrad[d]) parTrad[d]=sc; }
    if(!best||best.sc<SEUIL_BAS) continue;
    retenus++; gagne[best.trad]++;
    // sans la traduction gagnante, le lien serait-il perdu ?
    let sansElle = 0; for(const t of TRADS) if(t!==best.trad && parTrad[t]!==null) sansElle = Math.max(sansElle, parTrad[t]);
    if (sansElle < SEUIL_BAS) perdus[best.trad]++;
  }
  console.log(`\n${OEUVRE} — ${spans.length} citations, ${retenus} appariées`);
  for (const t of TRADS) console.log(`  ${t}  gagne ${String(gagne[t]).padStart(4)} (${Math.round(gagne[t]/retenus*100)}%)  · liens PERDUS sans elle : ${perdus[t]}`);
}
process.exit(0);
