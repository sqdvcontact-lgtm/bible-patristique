// Confirmation FORTE des liens portés « seuls » de la Somme : le livre ET le
// chapitre du lien sont-ils nommés dans le texte du segment ? (--promeut pour agir)
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = 'A0013O0002';
const PROMEUT = process.argv.includes('--promeut');

const NOMS = {
  GEN: /gen[eè]se|\bgn\b/, EXO: /exode/, LEV: /l[eé]vitique/, NUM: /nombres/, DEU: /deut[eé]ronome/,
  JOS: /josu[eé]/, PSA: /psaume|\bps\b/, PRO: /proverbe/, ECC: /eccl[eé]siaste/, SNG: /cantique/,
  SIR: /eccl[eé]siastique|siracide/, WIS: /sagesse/, ISA: /isa[iï]e/, JER: /j[eé]r[eé]mie/, EZK: /[eé]z[eé]chiel/,
  DAN: /daniel/, JOB: /\bjob\b/, TOB: /tobie/, MAT: /matth?ieu|\bmt\b/, MRK: /\bmarc\b/, LUK: /\bluc\b/,
  JHN: /(?<![12]\s)(?:jean|\bjn\b)/, ACT: /\bactes\b/, ROM: /romains|\brm\b/, GAL: /galates/,
  EPH: /[eé]ph[eé]siens/, PHP: /philippiens/, COL: /colossiens/, HEB: /h[eé]breux/, JAS: /jacques/,
  REV: /apocalypse/, MAL: /malachie/, ZEC: /zacharie/,
  '1CO': /1\s*co/, '2CO': /2\s*co/, '1JN': /1\s*(?:jn|jean)/, '1PE': /1\s*(?:p|pierre)/,
  '1TI': /1\s*tim/, '2TI': /2\s*tim/, '1TH': /1\s*th/, '2TH': /2\s*th/, '1KI': /(?:1\s*rois|3\s*rois)/,
  '2KI': /(?:2\s*rois|4\s*rois)/, '1SA': /1\s*sam/, '2SA': /2\s*sam/,
};

async function pageAll(sel) {
  const o = [];
  for (let de = 0; ; de += 1000) {
    const { data } = await sb.from('segments').select(sel).eq('id_oeuvre', OEUVRE).order('segment_numero').range(de, de + 999);
    if (!data?.length) break; o.push(...data); if (data.length < 1000) break;
  }
  return o;
}

async function main() {
  const segs = await pageAll('id, segment_texte');
  const byId = new Map(segs.map((s) => [s.id, s]));
  const ids = segs.map((s) => s.id);
  const all = [];
  for (let i = 0; i < ids.length; i += 150) {
    const batch = ids.slice(i, i + 150);
    for (let de = 0; ; de += 1000) {
      const { data } = await sb.from('liens_bibliques').select('id, segment_id, canon_id, fiabilite, motif').in('segment_id', batch).range(de, de + 999);
      all.push(...(data || [])); if (!data || data.length < 1000) break;
    }
  }
  const indep = new Set();
  for (const l of all) if (l.canon_id && !(l.motif || '').startsWith('Filet de rappel')) indep.add(l.segment_id + '|' + l.canon_id);
  const seuls = all.filter((l) => l.canon_id && l.fiabilite === 'douteux' && (l.motif || '').startsWith('Filet de rappel') && !indep.has(l.segment_id + '|' + l.canon_id));

  const fort = [];
  for (const l of seuls) {
    const [b, ch] = l.canon_id.split('.');
    const re = NOMS[b]; if (!re) continue;
    const t = ((byId.get(l.segment_id).segment_texte) || '').replace(/<[^>]+>/g, ' ').toLowerCase();
    if (!re.test(t)) continue;
    // chapitre présent dans une référence : "(3," ou "3, 8" ou "(3 ,"
    const chRe = new RegExp('\\(\\s*' + ch + '\\s*[,.]|\\b' + ch + '\\s*,\\s*\\d');
    if (chRe.test(t)) fort.push(l.id);
  }
  console.log(`portés seuls : ${seuls.length}`);
  console.log(`CONFIRMÉS FORT (livre + chapitre nommés) : ${fort.length} (${Math.round(100 * fort.length / seuls.length)}%)`);
  if (PROMEUT) {
    let n = 0;
    for (let j = 0; j < fort.length; j += 200) { await sb.from('liens_bibliques').update({ fiabilite: 'probable', arbitrage_requis: false }).in('id', fort.slice(j, j + 200)); n += fort.slice(j, j + 200).length; }
    console.log(`✓ promus : ${n}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
