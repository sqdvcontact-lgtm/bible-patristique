// Enrichissement du livre V de la Cité de Dieu par lecture (Corpus Scriptura).
// Livre doctrinal (destin, astrologie, libre arbitre, prescience, gloire romaine) :
// le matcheur a bien travaillé ; ajouts ponctuels et un faux ami (Homère/Cicéron pris
// pour Sagesse 17,20).
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = 'A0010O0002';
const AGIT = process.argv.includes('--agit');
const MOTIF = 'Lecture Corpus Scriptura — Cité de Dieu, livre V';

const AJOUTS = [
  [1571, 'GEN.25.26', 2], // Jacob et Ésaü, « le premier tenait l'autre par le pied »
  [1575, 'GEN.25.33', 2], // le droit d'aînesse perdu / acquis
  [1639, 'PSA.13.1', 1],  // « l'insensé a dit : il n'y a point de Dieu »
  [1660, 'PSA.61.12', 1], // « Dieu a parlé une fois… rendra à chacun selon ses œuvres »
  [1684, 'PSA.13.1', 2],  // reprise « l'insensé… il n'y a point de Dieu »
  [1782, 'JHN.12.43', 1], // « ils ont plus aimé la gloire des hommes que celle de Dieu »
  [1784, 'MAT.10.33', 1], // « je le renoncerai devant mon Père »
  [1793, 'MAT.6.2', 1],   // « ils ont reçu leur récompense »
];
const RETRAITS = [
  [1631, 'WIS.17.20'],    // « les volontés des hommes sont ce que les fait Jupiter » = Homère (trad. Cicéron)
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
  const segs = (await pageAll('id, segment_numero, ref_niv1', 'segments', { id_oeuvre: OEUVRE })).filter((s) => s.ref_niv1 === 'Livre V');
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
