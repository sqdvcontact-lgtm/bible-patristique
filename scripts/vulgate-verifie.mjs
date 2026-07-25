// VÉRIFICATION DE L'ALIGNEMENT CLÉMENTINE ↔ SACY — structurelle d'abord.
//
// Leçon d'une première tentative ratée : noter le recouvrement lexical latin/
// français ne marche PAS (« Fiat lux » / « Que la lumière soit » : 0 mot commun,
// alignement pourtant parfait). Le cognat latin-français diverge trop vite.
//
// Ce qui est fiable, dans l'ordre :
//   1. STRUCTURE — Sacy traduit la Clémentine verset par verset. Si un chapitre
//      a le MÊME NOMBRE de versets des deux côtés, la jointure (livre, ch, v) est
//      bonne par construction. Les chapitres à compte différent sont les seuls
//      lieux possibles de décalage.
//   2. NOMS PROPRES — seul recouvrement lexical qui traverse les deux langues
//      (Cain/Caïn, Henoch, Lamech). Confirme, là où il y en a.
//
// Sortie : la LISTE COURTE des chapitres à arbitrer, et rien d'autre.
//   node scripts/vulgate-verifie.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map((l)=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m)=>[m[1],m[2].replace(/^["']|["']$/g,'')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const apparies = JSON.parse(readFileSync('scripts/_vulgate_apparies.json','utf8'));
const orphelins = JSON.parse(readFileSync('scripts/_vulgate_orphelins.json','utf8'));

async function pageAll(t,sel,f){const o=[];for(let de=0;;de+=1000){let q=sb.from(t).select(sel).order('id').range(de,de+999);if(f)q=f(q);const{data,error}=await q;if(error)throw error;o.push(...(data||[]));if(!data||data.length<1000)break;}return o;}
const sacy = await pageAll('versets_v2','livre, ch_orig, v_orig',(q)=>q.eq('trad_id','TR0001'));

// ── 1. comparaison des comptes de versets, chapitre par chapitre ────────────
const cLat = new Map(), cFr = new Map();
for (const a of apparies) cLat.set(`${a.livre}|${a.ch}`, (cLat.get(`${a.livre}|${a.ch}`)||0)+1);
for (const o of orphelins) cLat.set(`${o.livre}|${o.ch}`, (cLat.get(`${o.livre}|${o.ch}`)||0)+1);
for (const s of sacy) cFr.set(`${s.livre}|${s.ch_orig}`, (cFr.get(`${s.livre}|${s.ch_orig}`)||0)+1);

const chapitres = [...cLat.keys()];
const concordants = [], divergents = [];
for (const k of chapitres) {
  const a = cLat.get(k)||0, b = cFr.get(k)||0;
  (a === b ? concordants : divergents).push({ ch:k, latin:a, sacy:b, ecart:a-b });
}
console.log(`chapitres : ${chapitres.length}`);
console.log(`  compte IDENTIQUE (alignement sûr par construction) : ${concordants.length} (${(concordants.length/chapitres.length*100).toFixed(1)} %)`);
console.log(`  compte DIFFÉRENT (à arbitrer)                      : ${divergents.length}`);

const versetsSurs = concordants.reduce((n,c)=>n+c.latin,0);
console.log(`\nversets couverts par un chapitre sûr : ${versetsSurs} / 35809 (${(versetsSurs/35809*100).toFixed(1)} %)`);

// ── 2. noms propres : confirmation indépendante sur les chapitres « sûrs » ──
const propres = (s, latin) => {
  const t = (s||'').replace(/<[^>]+>/g,' ');
  const out = new Set();
  for (const m of t.matchAll(/(?<![.!?:»]\s)\b([A-ZÉÈÀÎÔÜ][a-zéèêëàâîïôöûüç]{2,})/g)) {
    const w = m[1].normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/j/g,'i').replace(/y/g,'i');
    out.add(w.slice(0,4));
  }
  return out;
};
let avecNoms=0, confirmes=0;
for (const a of apparies) {
  const L = propres(a.texte), F = propres(a.fr);
  if (L.size < 1 || F.size < 1) continue;
  avecNoms++;
  let i=0; for (const t of L) if (F.has(t)) i++;
  if (i / Math.min(L.size,F.size) >= 0.5) confirmes++;
}
console.log(`\nconfirmation par noms propres : ${confirmes} / ${avecNoms} versets qui en portent (${(confirmes/avecNoms*100).toFixed(1)} %)`);

// ── 3. la liste courte ──────────────────────────────────────────────────────
divergents.sort((a,b)=>Math.abs(b.ecart)-Math.abs(a.ecart));
const parLivre = {};
for (const d of divergents) parLivre[d.ch.split('|')[0]] = (parLivre[d.ch.split('|')[0]]||0)+1;
console.log(`\nchapitres à arbitrer, par livre :`);
console.log('  ' + Object.entries(parLivre).sort((a,b)=>b[1]-a[1]).map(([k,n])=>`${k} ${n}`).join(' · '));
console.log(`\nles 15 écarts les plus larges :`);
for (const d of divergents.slice(0,15)) console.log(`  ${d.ch.padEnd(10)} latin ${String(d.latin).padStart(3)} · Sacy ${String(d.sacy).padStart(3)} · écart ${d.ecart>0?'+':''}${d.ecart}`);
writeFileSync('scripts/_vulgate_chapitres_a_arbitrer.json', JSON.stringify(divergents), 'utf8');
console.log(`\n(liste complète : scripts/_vulgate_chapitres_a_arbitrer.json)`);
process.exit(0);
