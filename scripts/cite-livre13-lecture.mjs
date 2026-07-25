// Enrichissement du livre XIII de la Cité de Dieu par lecture (Corpus Scriptura).
// La chute d'Adam et la mort. Très riche (Genèse 2-3, Romains 8, 1 Corinthiens 15).
// Beaucoup capté ; nombreux ajouts (récit de Gn 3, Jn 20,22, 1 Co 10,4) et faux amis
// abondants (confusions autour d'« esprit/souffle » et de versets voisins).
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = 'A0010O0002';
const AGIT = process.argv.includes('--agit');
const MOTIF = 'Lecture Corpus Scriptura — Cité de Dieu, livre XIII';

const AJOUTS = [
  [4542, 'MAT.10.39', 1], // « qui perdra sa vie pour moi la trouvera »
  [4546, 'JHN.3.8', 2],   // « cet Esprit qui souffle où il veut »
  [4580, 'SIR.11.30', 1], // « ne louez personne avant sa mort »
  [4582, 'PSA.6.6', 1],   // « il n'est personne dans la mort qui se souvienne de vous »
  [4594, 'GEN.2.17', 1],  // « du jour que vous en mangerez, vous mourrez »
  [4597, 'GEN.3.7', 2],   // les feuilles de figuier (nudité)
  [4601, 'GAL.5.17', 1],  // « la chair convoite contre l'esprit »
  [4611, 'GEN.3.9', 1],   // « Adam, où es-tu ? »
  [4612, 'GEN.3.19', 1],  // « vous êtes terre, et vous retournerez en terre »
  [4615, 'GEN.3.19', 2],  // reprise
  [4619, 'WIS.9.15', 2],  // « le corps corruptible appesantit l'âme » (rappelé)
  [4682, 'PRO.3.18', 1],  // « c'est un arbre de vie pour ceux qui l'embrassent »
  [4685, 'GAL.4.24', 2],  // Agar et Sara, figure des deux Testaments
  [4686, '1CO.10.4', 1],  // « la pierre était Jésus-Christ »
  [4692, 'PSA.41.7', 1],  // « mon âme, s'étant tournée vers elle-même, est tombée… »
  [4692, 'PSA.58.10', 1], // « Seigneur, je ne mettrai plus ma force qu'en vous »
  [4697, 'TOB.12.19', 1], // « vous m'avez vu manger… qu'avec vos yeux » (l'ange à Tobie)
  [4723, 'ROM.8.24', 1],  // « nous sommes sauvés par l'espérance »
  [4733, 'JHN.20.22', 1], // « recevez le Saint-Esprit »
  [4735, 'GEN.2.7', 1],   // « Dieu créa l'homme poussière de la terre »
  [4754, 'ISA.57.16', 1], // « j'ai fait tout souffle » (Isaïe)
  [4756, '1CO.2.11', 1],  // « qui connaît ce qui est en l'homme sinon l'esprit de l'homme »
  [4760, 'JHN.4.24', 1],  // « Dieu est esprit »
  [4761, 'GEN.2.7', 2],   // reprise « Dieu souffla contre la face de l'homme »
  [4764, 'GEN.7.22', 2],  // « tout ce qui a esprit de vie… périt » (déluge)
];
const RETRAITS = [
  [4692, 'DAN.11.19'],    // « mon âme… » = Ps 41,7 / 58,10 (le Psalmiste), pas Daniel
  [4697, 'SIR.3.22'],     // « l'ange à Tobie » = Tobie 12,19, pas Siracide
  [4723, '2CO.13.6'],     // « sauvés par l'espérance » = Rm 8,24, pas 2 Co 13,6
  [4735, 'JOB.38.38'],    // « poussière de la terre » = Gn 2,7, pas Job 38,38
  [4756, '1CO.6.17'],     // « ce qui est en l'homme… » = 1 Co 2,11, pas 1 Co 6,17
  [4761, 'JOB.33.4'],     // « Dieu souffla… » = Gn 2,7, pas Job 33,4
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
  const segs = (await pageAll('id, segment_numero, ref_niv1', 'segments', { id_oeuvre: OEUVRE })).filter((s) => s.ref_niv1 === 'Livre XIII');
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
