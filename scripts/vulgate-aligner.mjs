// ALIGNEMENT DE LA VULGATE CLÉMENTINE — par Sacy, non à l'aveugle.
//
// Sacy (TR0001) est traduit DE la Clémentine et porte déjà, pour chaque verset,
// sa numérotation vulgate (ch_orig/v_orig) ET son créneau d'ossature (canon_id).
// L'alignement du latin s'en déduit donc par jointure exacte (livre, ch, v) :
// on ne devine rien, on hérite d'un alignement déjà relu.
//
// Ce script ne fait que MESURER et RAPPORTER (aucune écriture) : il dit combien
// de versets se placent seuls, et isole ceux qui demandent un arbitrage humain.
//   node scripts/vulgate-aligner.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const SRC = 'C:/Users/quins/OneDrive/Bureau/bible_databases-master/bible_databases-master/sources/la/VulgClementine/VulgClementine-osis.json';

const OSIS = { Genesis:'GEN',Exodus:'EXO',Leviticus:'LEV',Numbers:'NUM',Deuteronomy:'DEU',Joshua:'JOS',Judges:'JDG',Ruth:'RUT','I Samuel':'1SA','II Samuel':'2SA','I Kings':'1KI','II Kings':'2KI','I Chronicles':'1CH','II Chronicles':'2CH',Ezra:'EZR',Nehemiah:'NEH',Tobit:'TOB',Judith:'JDT',Esther:'EST',Job:'JOB',Psalms:'PSA',Proverbs:'PRO',Ecclesiastes:'ECC','Song of Solomon':'SNG',Wisdom:'WIS',Sirach:'SIR',Isaiah:'ISA',Jeremiah:'JER',Lamentations:'LAM',Baruch:'BAR',Ezekiel:'EZK',Daniel:'DAN',Hosea:'HOS',Joel:'JOL',Amos:'AMO',Obadiah:'OBA',Jonah:'JON',Micah:'MIC',Nahum:'NAM',Habakkuk:'HAB',Zephaniah:'ZEP',Haggai:'HAG',Zechariah:'ZEC',Malachi:'MAL','I Maccabees':'1MA','II Maccabees':'2MA',Matthew:'MAT',Mark:'MRK',Luke:'LUK',John:'JHN',Acts:'ACT',Romans:'ROM','I Corinthians':'1CO','II Corinthians':'2CO',Galatians:'GAL',Ephesians:'EPH',Philippians:'PHP',Colossians:'COL','I Thessalonians':'1TH','II Thessalonians':'2TH','I Timothy':'1TI','II Timothy':'2TI',Titus:'TIT',Philemon:'PHM',Hebrews:'HEB',James:'JAS','I Peter':'1PE','II Peter':'2PE','I John':'1JN','II John':'2JN','III John':'3JN',Jude:'JUD','Revelation of John':'REV' };
const HORS_CANON = ['Prayer of Manasses','I Esdras','II Esdras','Additional Psalm','Laodiceans'];

const nettoie = (t) => (t||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();

async function pageAll(t, sel, f){const o=[];for(let de=0;;de+=1000){let q=sb.from(t).select(sel).order('id').range(de,de+999);if(f)q=f(q);const{data,error}=await q;if(error)throw error;o.push(...(data||[]));if(!data||data.length<1000)break;}return o;}

const j = JSON.parse(readFileSync(SRC,'utf8'));
const latin = [];
for (const b of j.books) {
  if (HORS_CANON.includes(b.name)) continue;
  const livre = OSIS[b.name]; if (!livre) { console.log('!! livre non mappé :', b.name); continue; }
  for (const c of b.chapters||[]) for (const v of c.verses||[]) {
    const t = nettoie(v.text); if (t) latin.push({ livre, ch: c.chapter, v: v.verse, texte: t });
  }
}
console.log(`Clémentine (canon 73) : ${latin.length} versets`);

const sacy = await pageAll('versets_v2','livre, ch_orig, v_orig, v_orig_suffixe, canon_id, texte',(q)=>q.eq('trad_id','TR0001'));
const parCle = new Map();
for (const s of sacy) parCle.set(`${s.livre}|${s.ch_orig}|${s.v_orig}`, s);
console.log(`Sacy : ${sacy.length} versets`);

const apparies = [], orphelins = [];
for (const l of latin) {
  const s = parCle.get(`${l.livre}|${l.ch}|${l.v}`);
  if (s && s.canon_id) apparies.push({ ...l, canon_id: s.canon_id, fr: s.texte });
  else orphelins.push(l);
}
console.log(`\n→ placés par Sacy   : ${apparies.length} (${(apparies.length/latin.length*100).toFixed(1)} %)`);
console.log(`→ sans correspondant : ${orphelins.length}`);

// où sont les orphelins ?
const parLivre = {};
for (const o of orphelins) parLivre[o.livre] = (parLivre[o.livre]||0)+1;
const tri = Object.entries(parLivre).sort((a,b)=>b[1]-a[1]);
console.log('\nOrphelins par livre :');
for (const [k,n] of tri.slice(0,25)) console.log(`  ${k.padEnd(5)} ${n}`);
writeFileSync('scripts/_vulgate_orphelins.json', JSON.stringify(orphelins), 'utf8');
writeFileSync('scripts/_vulgate_apparies.json', JSON.stringify(apparies), 'utf8');
console.log('\n(écrit : scripts/_vulgate_orphelins.json, _vulgate_apparies.json — rien en base)');
process.exit(0);
