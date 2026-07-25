// Détecteur de faux amis dans la Somme : compare le verset TAGUÉ à la (aux) référence(s)
// biblique(s) que Thomas écrit lui-même dans le segment (« Lc 24, 39 », « Rm 11, 6 »…).
// Un lien de type 1 dont le LIVRE tagué n'apparaît nulle part dans les références citées par
// le segment est un faux ami quasi certain (le matcheur a apparié un verset par thème).
// LECTURE SEULE : produit la liste, ne modifie rien.
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = 'A0013O0002';

// Abréviations françaises → code OSIS (celles que Thomas emploie, deutéro compris).
const ABR = {
  Gn:'GEN', Ex:'EXO', Lv:'LEV', Nb:'NUM', Dt:'DEU', Jos:'JOS', Jg:'JDG', Rt:'RUT',
  '1S':'1SA','2S':'2SA','1R':'1KI','2R':'2KI','1Ch':'1CH','2Ch':'2CH',
  Esd:'EZR', 'Né':'NEH', Est:'EST', Jb:'JOB', Ps:'PSA', Pr:'PRO', Qo:'ECC', Ec:'ECC', Ct:'SNG',
  Sg:'WIS', Si:'SIR', Eccli:'SIR',
  Is:'ISA', Jr:'JER', Lm:'LAM', Ba:'BAR', Ez:'EZK', Dn:'DAN',
  Os:'HOS', Jl:'JOL', Am:'AMO', Ab:'OBA', Jon:'JON', Mi:'MIC', Na:'NAM', Ha:'HAB', So:'ZEP', Ag:'HAG', Za:'ZEC', Ml:'MAL',
  Tb:'TOB', Jdt:'JDT', '1M':'1MA','2M':'2MA',
  Mt:'MAT', Mc:'MRK', Lc:'LUK', Jn:'JHN', Ac:'ACT', Rm:'ROM',
  '1Co':'1CO','2Co':'2CO', Ga:'GAL', Ep:'EPH', Ph:'PHP', Col:'COL',
  '1Th':'1TH','2Th':'2TH','1Tm':'1TI','2Tm':'2TI', Tt:'TIT', Phm:'PHM', He:'HEB', Jc:'JAS',
  '1P':'1PE','2P':'2PE','1Jn':'1JN','2Jn':'2JN','3Jn':'3JN', Jude:'JUD', Ap:'REV',
};
// Regex des abréviations : on autorise une espace après un préfixe numérique (« 1 Co », « 2 P »).
const abrPat = Object.keys(ABR).sort((a, b) => b.length - a.length)
  .map((a) => a.replace(/^(\d)(.+)$/, '$1\\s?$2').replace(/([A-Za-zÀ-ÿ])/g, (c) => c))
  .join('|');
const RE = new RegExp(`(?:^|[\\s(])(${abrPat})\\s+(\\d+)\\s*,\\s*(\\d+)`, 'g');
const cleAbr = (t) => t.replace(/\s/g, '');   // « 1 Co » → « 1Co »

function livresCites(texte) {
  const set = new Set();       // « GEN.17 » (livre.chapitre)
  const livres = new Set();    // « GEN »
  let m;
  RE.lastIndex = 0;
  while ((m = RE.exec(texte))) {
    const osis = ABR[cleAbr(m[1])];
    if (!osis) continue;
    set.add(`${osis}.${m[2]}`);
    livres.add(osis);
  }
  return { set, livres };
}

async function pageAll(sel, tbl, filt) {
  const o = [];
  for (let de = 0; ; de += 1000) {
    let q = sb.from(tbl).select(sel).order('id').range(de, de + 999);
    for (const [k, v] of Object.entries(filt || {})) q = q.eq(k, v);
    const { data } = await q; if (!data?.length) break; o.push(...data); if (data.length < 1000) break;
  }
  return o;
}

async function main() {
  const segs = await pageAll('id', 'segments', { id_oeuvre: OEUVRE });
  const segSet = new Set(segs.map((s) => s.id));
  const liens = [];
  for (let de = 0; ; de += 1000) {
    const { data } = await sb.from('liens_bibliques').select('id, segment_id, canon_id, type, fiabilite').order('id').range(de, de + 999);
    if (!data?.length) break;
    liens.push(...data.filter((l) => segSet.has(l.segment_id) && l.canon_id && l.type === 1));
    if (data.length < 1000) break;
  }
  console.log(`liens type 1 constitués : ${liens.length}`);

  const segIds = [...new Set(liens.map((l) => l.segment_id))];
  const segTxt = new Map();
  for (let i = 0; i < segIds.length; i += 150) {
    const { data } = await sb.from('segments').select('id, segment_texte, ref_niv1, ref_niv2, ref_niv3').in('id', segIds.slice(i, i + 150));
    for (const r of data || []) segTxt.set(r.id, r);
  }

  let avecRef = 0, sansRef = 0;
  const fauxAmis = [];      // livre tagué absent des références citées
  const bonLivreAutreCh = []; // bon livre mais chapitre différent (à vérifier)
  for (const l of liens) {
    const sg = segTxt.get(l.segment_id); if (!sg) continue;
    const { set, livres } = livresCites(sg.segment_texte || '');
    if (!livres.size) { sansRef++; continue; }
    avecRef++;
    const [bk, ch] = l.canon_id.split('.');
    if (set.has(`${bk}.${ch}`)) continue;         // le verset tagué correspond à une réf citée → OK
    if (livres.has(bk)) { bonLivreAutreCh.push({ ...l, refs: [...set].join(' ') }); continue; }
    fauxAmis.push({ id: l.id, canon: l.canon_id, seg: l.segment_id, fia: l.fiabilite, refs: [...set].join(' '),
      ref: `${sg.ref_niv1 || ''} ${sg.ref_niv2 || ''} ${sg.ref_niv3 || ''}`.trim() });
  }
  console.log(`type 1 avec référence explicite dans le texte : ${avecRef}  (sans réf. parsable : ${sansRef})`);
  console.log(`\n→ FAUX AMIS probables (livre tagué absent des réfs citées) : ${fauxAmis.length}`);
  console.log(`   bon livre, chapitre différent (à vérifier) : ${bonLivreAutreCh.length}`);
  console.log('\néchantillon de faux amis :');
  for (const f of fauxAmis.slice(0, 18)) console.log(`   ${f.canon.padEnd(11)} taguré ; le segment cite : ${f.refs}`);
  writeFileSync('scripts/_somme-fauxamis.json', JSON.stringify(fauxAmis), 'utf8');
  console.log(`\nliste complète → scripts/_somme-fauxamis.json (${fauxAmis.length})`);
}
main().catch((e) => { console.error(e); process.exit(1); });
