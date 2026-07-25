// LIENS DE L'HEXAÉMÉRON (Basile, A0017O0001) — d'après les références de l'édition.
//
// Le texte importé en base a perdu presque toutes ses références (7 seulement),
// mais l'édition en ligne (remacle.org) les porte : 88 en clair, « (Gen. 1. 20) ».
// On les relève là, puis on retrouve le segment correspondant DANS NOTRE BASE par
// recouvrement du contexte — appariement français/français, donc fiable, à la
// différence du latin/français.
//
// NUMÉROTATION DES PSAUMES : cette édition ancienne cite à la GRECQUE, comme notre
// ossature (vérifié : « Ps. 106, 26 » = « Ils montaient jusqu'aux cieux » = PSA.106.26).
// Ne PAS appliquer la conversion hébreu→grec des éditions modernes : elle décalerait
// chaque psaume d'un cran, silencieusement.
//
//   node scripts/liens-hexameron.mjs --dry
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map((l)=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m)=>[m[1],m[2].replace(/^["']|["']$/g,'')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = 'A0017O0001';
const DRY = process.argv.includes('--dry');

const normaliser = (s)=>String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[\s.]/g,'');
const ROM = { i:1,v:5,x:10,l:50,c:100,d:500,m:1000 };
function versEntier(s){const t=String(s).trim().toLowerCase();
  if(/^\d+$/.test(t))return +t; if(!/^[ivxlcdm]+$/.test(t))return null;
  let n=0; for(let k=0;k<t.length;k++){const a=ROM[t[k]],b=ROM[t[k+1]]; n+=b&&a<b?-a:a;} return n||null;}

const ABREV = new Map();
for(let from=0;;from+=1000){const{data,error}=await sb.from('abreviations_bibliques').select('forme, livre').order('forme').range(from,from+999);
  if(error)throw error; if(!data?.length)break; for(const r of data)ABREV.set(r.forme,r.livre); if(data.length<1000)break;}
function codeLivre(rangBrut,nomBrut){
  const nom=normaliser(nomBrut); if(!nom)return null;
  const rang=rangBrut?versEntier(rangBrut):null;
  if(rang){const e=ABREV.get(`${rang}${nom}`); if(e)return e;}
  const base=ABREV.get(nom); if(!base)return null;
  if(!rang)return base;
  const m=base.match(/^([1-4])(.+)$/); return m?`${rang}${m[2]}`:null;
}
const canon=new Set();
for(let from=0;;from+=1000){const{data}=await sb.from('versets_canon').select('id').order('id').range(from,from+999);
  if(!data?.length)break; for(const r of data)canon.add(r.id); if(data.length<1000)break;}

// ── 1. relever les références sur la page de l'édition ─────────────────────
const txt = readFileSync('scripts/_remacle_hexameron.txt','utf8');
const RE_PAREN = /\([^)]{4,120}\)/g;
const RE_REF = /(?:^|[\s—–-])(?:([1-4]|[IVX]{1,3})\s*\.?\s*)?([A-ZÉÈ][a-zéèêëï]{1,9})\s*\.?\s*([IVXLC]+|\d{1,3})\s*[.,]\s*(\d{1,3})/g;
const releves = [];
for (const m of txt.matchAll(RE_PAREN)) {
  const bloc = m[0];
  for (const r of bloc.matchAll(RE_REF)) {
    const livre = codeLivre(r[1], r[2]);
    const ch = versEntier(r[3]), v = versEntier(r[4]);
    if (!livre || !ch || !v) continue;
    const id = `${livre}.${ch}.${v}`;
    if (!canon.has(id)) { releves.push({ id, brut:bloc, ctx:null, hors:true }); continue; }
    const ctx = txt.slice(Math.max(0, m.index-400), m.index).replace(/\s+/g,' ');
    releves.push({ id, brut:bloc.replace(/\s+/g,' '), ctx });
  }
}
const hors = releves.filter(r=>r.hors);
const bons = releves.filter(r=>!r.hors);
console.log(`références relevées : ${releves.length}  (hors ossature : ${hors.length})`);

// ── 2. retrouver le segment dans notre base ────────────────────────────────
let segs=[];
for(let de=0;;de+=1000){const{data}=await sb.from('segments').select('id, segment_numero, segment_texte, nature').eq('id_oeuvre',OEUVRE).order('segment_numero').range(de,de+999);
  if(!data?.length)break; segs.push(...data); if(data.length<1000)break;}
segs = segs.filter(s=>s.nature!=='separateur');
const mots=(s)=>(s||'').replace(/<[^>]+>/g,' ').normalize('NFD').replace(/[̀-ͯ]/g,'')
  .toLowerCase().replace(/[^a-z0-9]+/g,' ').split(' ').filter(w=>w.length>3);
const VIDES=new Set('dans pour avec cette leur nous vous elle sont mais comme tout tous plus dont ainsi meme aussi tres etre avoir fait faire quand alors point donc chose'.split(' '));
const sac=(s)=>new Set(mots(s).filter(w=>!VIDES.has(w)));
const sacsSeg = segs.map(s=>({ ...s, sac: sac(s.segment_texte) }));

function meilleurSegment(ctx){
  const C = sac(ctx); if (C.size < 5) return null;
  let best=null;
  for (const s of sacsSeg) {
    if (s.sac.size < 4) continue;
    let i=0; for (const w of s.sac) if (C.has(w)) i++;
    const sc = i / Math.min(s.sac.size, C.size);
    if (!best || sc > best.sc) best = { seg:s, sc };
  }
  return best;
}
// Texte français des versets visés, pour contrôler que la référence dit vrai.
const cibles = [...new Set(bons.map(r=>r.id))];
const frVerset = new Map();
for (let i=0;i<cibles.length;i+=100) {
  const { data } = await sb.from('versets_v2').select('canon_id, texte')
    .in('canon_id', cibles.slice(i,i+100)).in('trad_id', ['TR0001','TR0003']);
  for (const r of data||[]) if (r.texte) frVerset.set(r.canon_id, (frVerset.get(r.canon_id)||'')+' '+r.texte);
}

const liens=[], faibles=[];
for (const r of bons) {
  const b = meilleurSegment(r.ctx);
  if (!b || b.sc < 0.30) { faibles.push({ ...r, sc:b?b.sc:0 }); continue; }
  // CONTRÔLE DU CONTENU. Une référence peut tomber sur un créneau qui existe sans
  // dire ce que le Père cite (« Eccl. 1, 14 » → ECC.1.14, alors que la phrase est
  // en Qo 2, 14) : le créneau valide ne proteste pas. Ici la comparaison est
  // français/français, donc fiable — on mesure ce que le verset a de commun avec
  // le passage qui l'introduit.
  const V = sac(frVerset.get(r.id)||''), C = sac(r.ctx);
  let n=0; for (const w of V) if (C.has(w)) n++;
  const conf = V.size ? n/V.size : null;
  liens.push({ segment_id:b.seg.id, num:b.seg.segment_numero, canon_id:r.id, sc:b.sc, conf, brut:r.brut });
}
const confirmes = liens.filter(l=>l.conf!==null && l.conf>=0.20);
const aVoir     = liens.filter(l=>!(l.conf!==null && l.conf>=0.20));
console.log(`\ncontrôle du contenu : ${confirmes.length} confirmés · ${aVoir.length} à vérifier`);
console.log(`segment retrouvé (recouvrement ≥ 0.30) : ${liens.length}`);
console.log(`contexte non retrouvé                  : ${faibles.length}`);
console.log('\n── à vérifier (le verset visé ne se retrouve pas dans le passage)');
for (const l of aVoir.slice(0,20)) console.log(`  #${String(l.num).padStart(4)} → ${l.canon_id.padEnd(12)} ${l.conf===null?'—':l.conf.toFixed(2)}  ${l.brut}`);
if (faibles.length) console.log('\n── non retrouvés : ' + faibles.slice(0,10).map(f=>f.brut).join(' · '));
if (hors.length) console.log('\n── hors ossature : ' + [...new Set(hors.map(h=>h.id))].slice(0,10).join(' · '));
writeFileSync('scripts/_hexameron_liens.json', JSON.stringify(liens),'utf8');
if (DRY) { console.log('\n(--dry : rien écrit)'); process.exit(0); }

// ── 3. écriture ────────────────────────────────────────────────────────────
const ids=[...new Set(liens.map(l=>l.segment_id))];
const deja=new Set();
for(let i=0;i<ids.length;i+=300){const{data}=await sb.from('liens_bibliques').select('segment_id, canon_id, type').in('segment_id',ids.slice(i,i+300));
  for(const l of data||[]) if(l.canon_id) deja.add(`${l.segment_id}|${l.canon_id}|${l.type}`);}
const vus=new Set();
const aEcrire=liens.filter(l=>{const c=`${l.segment_id}|${l.canon_id}|1`; if(deja.has(c)||vus.has(c))return false; vus.add(c); return true;})
  .map(l=>({ segment_id:l.segment_id, canon_id:l.canon_id, type:1, fiabilite: l.conf!==null && l.conf>=0.20 ? 'probable' : 'douteux', provenance:'editeur',
             arbitrage_requis: !(l.conf!==null && l.conf>=0.20),
             motif:`Référence donnée par l'édition (remacle.org, éd. Auger) : ${l.brut}.` }));
for(let i=0;i<aEcrire.length;i+=200){const{error}=await sb.from('liens_bibliques').insert(aEcrire.slice(i,i+200)); if(error)throw error;}
console.log(`\n✓ ${aEcrire.length} liens écrits · ${liens.length-aEcrire.length} déjà présents`);
process.exit(0);
