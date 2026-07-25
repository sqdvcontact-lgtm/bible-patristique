// Enrichissement du livre XIX de la Cité de Dieu par lecture (Corpus Scriptura).
// Livre philosophique : le souverain bien (288 sectes de Varron), la paix, l'ordre,
// la vraie justice (Rome n'est pas une vraie république), la fin des deux cités.
// Pauvre en Écriture ; le matcheur a bien capté. Peu d'ajouts, deux faux amis nets :
// Is 66,13 mis pour le Ps 147 ; Lc 8,55 pour une phrase de Cicéron (âme/corps).
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = 'A0010O0002';
const AGIT = process.argv.includes('--agit');
const MOTIF = 'Lecture Corpus Scriptura — Cité de Dieu, livre XIX';

const AJOUTS = [
  [7298, 'ROM.1.17', 1],   // « le juste vit de la foi »
  [7302, 'PSA.93.11', 1],  // « le Seigneur sait que les pensées des hommes sont vaines » (par un prophète)
  [7361, 'MIC.7.6', 1],    // « les ennemis de l'homme, ce sont les habitants de sa maison »
  [7376, 'PSA.24.17', 1],  // « délivrez-moi de mes nécessités »
  [7409, 'PSA.147.12', 1], // « Jérusalem, louez le Seigneur » (en place de Is 66,13)
  [7409, 'PSA.147.14', 1], // « c'est lui qui a établi la paix comme votre fin »
  [7486, '2CO.5.7', 1],    // « marcher par la foi et non par la claire vision »
  [7534, '1CO.13.9', 1],   // « notre science ici-bas est toute partielle »
  [7622, 'PSA.95.5', 1],   // « tous les dieux des Gentils sont des démons »
  [7646, 'PSA.143.15', 1], // « heureux le peuple qui a son Seigneur en son Dieu »
];
const RETRAITS = [
  [7409, 'ISA.66.13'],     // « Jérusalem, loue le Seigneur… la paix pour ta fin » = Ps 147,12-14
  [7568, 'LUK.8.55'],      // « l'âme commande au corps, la raison aux passions » = Cicéron (République), non biblique
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
  const segs = (await pageAll('id, segment_numero, ref_niv1', 'segments', { id_oeuvre: OEUVRE })).filter((s) => s.ref_niv1 === 'Livre XIX');
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
