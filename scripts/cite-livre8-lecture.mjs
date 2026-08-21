// Enrichissement du livre VIII de la Cité de Dieu par lecture (Corpus Scriptura).
// Livre sur les philosophes (Platon, les démons d'Apulée, Hermès Trismégiste) : riche
// en Écriture (Rm 1, Gn 1, Ex 3, Ps 95). Le matcheur en a capté beaucoup ; ajouts de
// versets manqués et retrait de faux amis nichés dans les citations d'Hermès.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = 'A0010O0002';
const AGIT = process.argv.includes('--agit');
const MOTIF = 'Lecture Corpus Scriptura — Cité de Dieu, livre VIII';

const AJOUTS = [
  [2735, 'ROM.1.21', 1],  // « ils ne l'ont pas glorifié… cœur insensé rempli de ténèbres »
  [2736, 'ROM.1.23', 1],  // « prostitué la gloire du Dieu incorruptible à l'image de l'homme »
  [2750, 'GEN.1.1', 1],   // « Au commencement Dieu fit le ciel et la terre »
  [2752, 'GEN.1.1', 1],   // idem (repris)
  [2921, 'ROM.1.21', 2],  // reprise de Rm 1,21-23 à propos d'Hermès
  [2929, 'JER.16.20', 1], // « si l'homme se fait des dieux, ce ne sont point des dieux »
  [2931, 'ISA.19.1', 1],  // « les idoles de l'Égypte seront renversées devant le Seigneur »
  [2932, 'LUK.2.28', 2],  // Siméon et Anne connaissent l'enfant Jésus
  [2932, 'LUK.1.41', 2],  // Élisabeth le connaît en esprit
  [2956, 'PSA.113.13', 1],// « des yeux et ne voient pas »
  [2957, '1CO.10.20', 1], // « aux démons et non à Dieu offrent leurs victimes »
  [2959, 'PSA.95.5', 1],  // « tous les dieux des gentils sont des démons »
  [2965, 'JER.16.20', 2], // reprise « si l'homme se fait des dieux… »
];
const RETRAITS = [
  [2977, 'NUM.18.5'],     // « cette terre sera remplie de sépulcres » = Hermès, pas Nombres
  [2990, 'PRO.9.14'],     // « Hermès fait sa demeure dans une ville » = Hermès, pas Proverbes
  [2996, 'GAL.4.8'],      // « les dieux de la terre sont sujets à s'irriter » = Hermès, pas Galates
];

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
  const segs = (await pageAll('id, segment_numero, ref_niv1', 'segments', { id_oeuvre: OEUVRE })).filter((s) => s.ref_niv1 === 'Livre VIII');
  const parNum = new Map(segs.map((s) => [s.segment_numero, s.id]));
  const canon = new Set();
  for (const r of await pageAll('livre, ch_canon, v_canon', 'versets_canon')) canon.add(`${r.livre}.${r.ch_canon}.${r.v_canon}`);

  const ids = segs.map((s) => s.id);
  const existants = new Set();
  for (let i = 0; i < ids.length; i += 150) {
    const { data } = await sb.from('liens_bibliques').select('segment_id, canon_id').in('segment_id', ids.slice(i, i + 150));
    for (const l of data || []) existants.add(l.segment_id + '|' + l.canon_id);
  }

  const rows = []; const absents = []; const dup = [];
  for (const [num, cid, type] of AJOUTS) {
    const sid = parNum.get(num); if (!sid) { absents.push(`#${num} (segment)`); continue; }
    if (!canon.has(cid)) { absents.push(`#${num} ${cid} (hors canon)`); continue; }
    if (existants.has(sid + '|' + cid)) { dup.push(`#${num} ${cid}`); continue; }
    rows.push({ segment_id: sid, canon_id: cid, type, fiabilite: 'probable', motif: MOTIF, provenance: 'ia', arbitrage_requis: false });
  }
  let supp = 0; const introuv = [];
  for (const [num, cid] of RETRAITS) {
    const sid = parNum.get(num); if (!sid) { introuv.push(`#${num}`); continue; }
    const { data } = await sb.from('liens_bibliques').select('id').eq('segment_id', sid).eq('canon_id', cid);
    if (!data?.length) { introuv.push(`#${num} ${cid}`); continue; }
    if (AGIT) await sb.from('liens_bibliques').delete().in('id', data.map((x) => x.id));
    supp += data.length;
  }
  console.log(`ajouts prêts : ${rows.length}${dup.length ? ' · déjà présents : ' + dup.join(', ') : ''}`);
  if (absents.length) console.log('NON insérés :', absents.join(', '));
  console.log(`retraits faux amis : ${supp}${introuv.length ? ' · introuvables : ' + introuv.join(', ') : ''}`);
  if (AGIT && rows.length) {
    for (let j = 0; j < rows.length; j += 200) { const { error } = await sb.from('liens_bibliques').insert(rows.slice(j, j + 200)); if (error) console.error('INSERT', error.message); }
    console.log(`✓ insérés : ${rows.length}`);
  } else if (!AGIT) console.log('(simulation — ajouter --agit)');
}
main().catch((e) => { console.error(e); process.exit(1); });
