// Enrichissement du livre XXI de la Cité de Dieu par lecture (Corpus Scriptura).
// Le supplice éternel des méchants : possibilité de corps souffrant sans mourir (feu,
// aimant, chaux, chair du paon…), puis réfutation des opinions miséricordistes et du feu
// purgatoire (1 Co 3). Livre surtout argumentatif, le matcheur y a bien tenu ; peu d'ajouts.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = 'A0010O0002';
const AGIT = process.argv.includes('--agit');
const MOTIF = 'Lecture Corpus Scriptura — Cité de Dieu, livre XXI';

const AJOUTS = [
  [8338, 'LUK.16.24', 1],  // « je suis torturé dans cette flamme » (le mauvais riche)
  [8457, 'JOS.10.13', 1],  // le soleil s'arrête au commandement de Josué
  [8474, 'ROM.11.24', 1],  // « l'olivier sauvage enté contre nature sur le bon olivier »
  [8483, 'PRO.25.20', 1],  // « comme la teigne le vêtement… la tristesse le cœur » (en place de Os 5,12)
  [8494, '1CO.13.9', 1],   // « nous ne savons qu'en partie »
  [8512, 'EXO.21.24', 1],  // « œil pour œil, dent pour dent »
  [8548, 'JOB.7.1', 1],    // « la vie de l'homme sur la terre est une tentation » (en place de Ac 17,25)
  [8557, '2TI.2.19', 1],   // « Dieu connaît ceux qui sont à lui »
  [8601, 'ROM.11.32', 1],  // « Dieu a permis que tous tombent dans l'infidélité »
  [8613, '1CO.3.11', 1], [8614, '1CO.3.12', 1], [8615, '1CO.3.15', 1], // le feu qui éprouve
  [8632, '2PE.2.4', 1],    // « Dieu n'a pas épargné les anges… les prisons de l'enfer »
  [8657, 'MAT.12.32', 1],  // « ni en cette vie ni dans l'autre »
  [8665, 'MAT.5.45', 1],   // « il fait lever son soleil sur les bons et les méchants »
  [8679, '1JN.4.18', 1],   // « l'amour parfait bannit la crainte »
  [8767, 'MAT.3.8', 1],    // « faites de dignes fruits de pénitence »
  [8773, 'SIR.14.5', 1],   // « à qui sera bon celui qui est mauvais pour lui-même ? » (en place de Pr 3,27)
  [8778, 'MAT.25.45', 1],  // « au moindre des miens, c'est à moi que vous avez manqué »
  [8784, 'MAT.5.22', 1],   // « celui qui dit à son frère : Fou ! »
  [8804, '1CO.7.25', 1],   // « j'ai obtenu miséricorde pour être fidèle »
  [8815, 'MAT.13.8', 1],   // « trente, soixante, cent pour un »
];
const RETRAITS = [
  [8483, 'HOS.5.12'],  // « comme la teigne… » = Pr 25,20
  [8548, 'ACT.17.25'], // « la vie de l'homme est une tentation » = Jb 7,1
  [8773, 'PRO.3.27'],  // « à qui sera bon le méchant pour soi ? » = Si 14,5
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
  const segs = (await pageAll('id, segment_numero, ref_niv1', 'segments', { id_oeuvre: OEUVRE })).filter((s) => s.ref_niv1 === 'Livre XXI');
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
