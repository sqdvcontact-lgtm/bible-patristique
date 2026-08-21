// Enrichissement du livre I de la Cité de Dieu par lecture (Corpus Scriptura).
// Le matcheur n'avait posé que types 1 et 4 ; la lecture ajoute citations et reprises
// qu'il a manquées, corrige le type quand il se trompe, et retire ses faux amis.
// Chaque cible est validée contre versets_canon. --agit pour écrire.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = 'A0010O0002';
const AGIT = process.argv.includes('--agit');
const MOTIF = 'Lecture Corpus Scriptura — Cité de Dieu, livre I';

// [segment_numero, canon_id, type]
const AJOUTS = [
  [118, 'EZK.33.8', 1],   // le veilleur : « je demanderai compte de sa vie »
  [125, '1TI.6.6', 1], [125, '1TI.6.8', 1], // « grande richesse que la piété… rien apporté en ce monde »
  [126, '1TI.6.9', 1],    // « ceux qui veulent devenir riches tombent… »
  [127, '1TI.6.10', 1],   // « l'amour des richesses est la racine de tous les maux »
  [134, '1TI.6.17', 1], [134, '1TI.6.18', 1], // « recommandez aux riches de ce monde… »
  [161, 'LUK.16.20', 2],  // le bon pauvre couvert d'ulcères / mauvais riche
  [163, 'LUK.21.18', 2],  // « pas un seul cheveu de leur tête »
  [173, 'LUK.16.22', 2],  // les anges le portent dans le sein d'Abraham
  [182, 'TOB.2.9', 2],    // Tobie ensevelit les morts
  [183, 'MAT.26.12', 2],  // la femme au parfum, « pour l'ensevelir »
  [184, 'MAT.27.59', 2],  // descente de croix, linceul, tombeau
  [192, 'DAN.1.6', 2],    // Daniel et les captifs de Babylone
  [193, 'JON.2.1', 2],    // Jonas dans la baleine
  [225, 'MAT.27.5', 2],   // Judas se pend
  [272, 'EXO.20.13', 1],  // « Tu ne tueras point » (le matcheur n'a vu que le faux témoignage)
  [282, 'GEN.22.10', 2],  // Abraham prêt à immoler Isaac
  [283, 'JDG.11.39', 2],  // Jephté et sa fille
  [284, 'JDG.16.30', 2],  // Samson s'enseveli avec les ennemis
  [296, 'MAT.10.23', 2],  // « fuir de ville en ville »
  [305, 'JOB.2.10', 2],   // Job aime mieux souffrir que mourir
  [336, '1CO.2.11', 1],   // « nul ne sait ce qui est dans l'homme sinon l'esprit de l'homme »
  [342, 'SIR.3.27', 1],   // « celui qui aime le péril y tombera »
  [353, 'ROM.11.33', 1],  // « impénétrables ses jugements, insondables ses voies »
  [369, 'PSA.41.11', 2],  // « Où est ton Dieu ? »
];
// faux amis du matcheur à retirer : [segment_numero, canon_id]
const RETRAITS = [
  [74, '1CH.14.12'],   // anecdote de Fabius sur des dieux païens : pas l'Écriture
  [336, 'WIS.15.16'],  // remplacé par 1CO.2.11
];

async function pageAll(sel, tbl, filt) {
  const o = [];
  for (let de = 0; ; de += 1000) {
    let q = sb.from(tbl).select(sel).range(de, de + 999);
    for (const [k, v] of Object.entries(filt || {})) q = q.eq(k, v);
    const { data } = await q; if (!data?.length) break; o.push(...data); if (data.length < 1000) break;
  }
  return o;
}
async function main() {
  const segs = (await pageAll('id, segment_numero, ref_niv1', 'segments', { id_oeuvre: OEUVRE })).filter((s) => s.ref_niv1 === 'Livre I');
  const parNum = new Map(segs.map((s) => [s.segment_numero, s.id]));
  const canon = new Set();
  for (let de = 0; ; de += 1000) {
    const { data } = await sb.from('versets_canon').select('livre, ch_canon, v_canon').order('id').range(de, de + 999);
    if (!data?.length) break; for (const r of data) canon.add(`${r.livre}.${r.ch_canon}.${r.v_canon}`); if (data.length < 1000) break;
  }

  // liens existants du livre I pour dédoublonnage
  const ids = segs.map((s) => s.id);
  const existants = new Set();
  for (let i = 0; i < ids.length; i += 150) {
    const b = ids.slice(i, i + 150);
    const { data } = await sb.from('liens_bibliques').select('segment_id, canon_id').in('segment_id', b);
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
