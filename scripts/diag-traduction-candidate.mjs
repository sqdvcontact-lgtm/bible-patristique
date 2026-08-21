// Que rapporterait une traduction supplémentaire ? — mesure AVANT import.
//
// Charge les traductions déjà en base + une (ou plusieurs) traduction candidate
// lue sur disque, et compare, citation par citation, le meilleur score atteint
// avec et sans la candidate. Trois chiffres, dans l'ordre d'utilité :
//   · SAUVÉS   : citation auparavant sous le seuil, désormais appariable
//   · PROMUS   : citation « douteuse » (0,35-0,55) qui passe « probable » (≥ 0,55)
//   · gagne    : citations où la candidate donne le meilleur texte
//
// Mesure lexicale pure (meilleur score atteignable), indépendante du choix du
// verset : elle dit si la candidate PARLE comme le traducteur du Père.
//   node scripts/diag-traduction-candidate.mjs A0011O2988 A0015O0001
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRES = process.argv.slice(2).filter((a) => /^A\d{4}O\d{4}$/.test(a));
const BD = 'C:/Users/quins/OneDrive/Bureau/bible_databases-master/bible_databases-master/sources/fr';
const CANDIDATES = [
  ['Genève 1669',   `${BD}/FreGeneve1669/FreGeneve1669-osis.json`],
  ['Martin 1744',   `${BD}/FreBDM1744/FreBDM1744-osis.json`],
  ['Bible Annotée', `${BD}/FreBBB/FreBBB-osis.json`],
  ['Synodale 1921', `${BD}/FreSynodale1921/FreSynodale1921-osis.json`],
  ['Darby',         `${BD}/FreJND/FreJND-osis.json`],
];
const SEUIL_BAS = 0.35, SEUIL_SUR = 0.55, MIN_COMMUNS = 3, MIN_MOTS = 5;
const ancienne = (m) => m.replace(/oi/g,'ai').replace(/([bcdfgjklmnpqrstvxz])ans$/,'$1ants');
const mots = (s) => (s||'').replace(/<[^>]+>/g,' ').normalize('NFD').replace(/[̀-ͯ]/g,'')
  .toLowerCase().replace(/[^a-z0-9]+/g,' ').split(' ').filter((m)=>m.length>2).map((m)=>ancienne(m).slice(0,5));
const VIDES = new Set('les des que qui pour dans avec est son sur plus tout tous par une aux ses leur ils elle vous nous mais comme cette ces pas ont sont lui de du la le et en un il ce sa car point donc quand dont fait faire avoir etre'.split(' '));
const toks = (s) => new Set(mots(s).filter((m)=>!VIDES.has(m)));
async function pageAll(t, sel, f){const o=[];for(let de=0;;de+=1000){let q=sb.from(t).select(sel).range(de,de+999);if(f)q=f(q);const{data,error}=await q;if(error)throw error;o.push(...(data||[]));if(!data||data.length<1000)break;}return o;}

// ── corpus de référence (ce que nous avons déjà) ────────────────────────────
const base = [];
for (const v of await pageAll('versets_v2','canon_id, texte',(q)=>q.not('canon_id','is',null).not('texte','is',null))) {
  const t = toks(v.texte); if (t.size) base.push(t);
}
// ── candidates lues sur disque ──────────────────────────────────────────────
const cands = [];
for (const [nom, chemin] of CANDIDATES) {
  let j; try { j = JSON.parse(readFileSync(chemin,'utf8')); } catch { console.log(`(absent : ${nom})`); continue; }
  const l = [];
  for (const b of j.books||[]) for (const c of b.chapters||[]) for (const v of c.verses||[]) {
    const t = toks(v.text); if (t.size) l.push(t);
  }
  cands.push({ nom, docs: l });
}
console.log(`référence : ${base.length} versets · candidates : ${cands.map(c=>c.nom+' '+c.docs.length).join(' | ')}\n`);

// index inversé commun (token → liste de {jeu, idx})
function faireIndex(jeux) {
  const df = new Map(), tot = jeux.reduce((a,j)=>a+j.length,0);
  for (const j of jeux) for (const d of j) for (const t of d) df.set(t,(df.get(t)||0)+1);
  const idf = (t)=>Math.log((tot+1)/((df.get(t)||0)+1))+1;
  const plafond = tot*0.06, idx = new Map();
  jeux.forEach((j,nj)=>j.forEach((d,i)=>{ for(const t of d){ if((df.get(t)||0)>plafond) continue;
    let a=idx.get(t); if(!a) idx.set(t,a=[]); a.push([nj,i]); }}));
  const poids = jeux.map(j=>j.map(d=>{let w=0;for(const t of d)w+=idf(t);return w;}));
  return { idf, idx, poids, df, plafond };
}
const jeux = [base, ...cands.map(c=>c.docs)];
const { idf, idx, poids, df, plafond } = faireIndex(jeux);

for (const OEUVRE of OEUVRES) {
  const segs = await pageAll('segments','id, segment_texte',(q)=>q.eq('id_oeuvre',OEUVRE));
  const spans = [];
  for (const s of segs) for (const m of String(s.segment_texte||'').replace(/<[^>]+>/g,' ').matchAll(/«([^»]{4,400})»/g)) {
    const t = toks(m[1]); if (mots(m[1]).filter(x=>!VIDES.has(x)).length >= MIN_MOTS) spans.push(t);
  }
  const res = cands.map(c=>({nom:c.nom, gagne:0, sauves:0, promus:0}));
  for (const sp of spans) {
    const acc = new Map();
    for (const t of sp){ const l=idx.get(t); if(!l) continue; const w=idf(t);
      for (const [nj,i] of l){ const k=nj+':'+i; const e=acc.get(k)||{w:0,n:0,nj,i}; e.w+=w; e.n+=1; acc.set(k,e);} }
    let pq=0; for (const t of sp) if((df.get(t)||0)<=plafond) pq+=idf(t);
    const meilleurs = new Array(jeux.length).fill(0);
    for (const e of acc.values()){ if(e.n<MIN_COMMUNS) continue;
      const rec=e.w/poids[e.nj][e.i], pr=pq?e.w/pq:0; const f=(rec+pr)?(2*rec*pr)/(rec+pr):0;
      if (f>meilleurs[e.nj]) meilleurs[e.nj]=f; }
    const ref = meilleurs[0];
    cands.forEach((c,k)=>{ const sc=meilleurs[k+1]; const r=res[k];
      if (sc>ref) r.gagne++;
      if (ref<SEUIL_BAS && sc>=SEUIL_BAS) r.sauves++;
      if (ref>=SEUIL_BAS && ref<SEUIL_SUR && sc>=SEUIL_SUR) r.promus++; });
  }
  console.log(`${OEUVRE} — ${spans.length} citations`);
  for (const r of res) console.log(`  ${r.nom.padEnd(15)} SAUVÉS ${String(r.sauves).padStart(3)} · PROMUS ${String(r.promus).padStart(3)} · meilleure que nos 3 : ${r.gagne}`);
  console.log();
}
process.exit(0);
