// ADJUDICATION DE FOND — Confessions Livres I-III (A0010O0001), base psaumes purgée.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = 'A0010O0001';
const DRY = process.argv.includes('--dry');

const PROMOUVOIR = [
  [2, 'JAS.4.6', 2], [5, 'MAT.11.28', 1], [11, 'MAT.7.7', 1], [13, 'ROM.10.14', 1], [13, 'ROM.10.17', 2],
  [40, '1CO.4.7', 1], [46, 'MAT.11.28', 1], [46, 'JHN.14.23', 3], [64, 'GEN.18.27', 2], [93, 'MAT.11.25', 2],
  [98, 'MAL.3.6', 2], [140, 'ROM.5.12', 1], [140, '1CO.15.22', 2], [164, 'GAL.4.26', 1], [176, 'GEN.1.27', 3],
  [193, 'JHN.6.35', 1], [193, 'JHN.8.12', 2], [260, 'LUK.15.13', 1], [260, 'LUK.15.12', 2], [266, 'TOB.4.16', 2],
  [291, '1JN.2.15', 1], [291, '1JN.2.16', 2], [295, 'LUK.15.18', 1], [295, 'LUK.15.20', 2], [300, '1JN.2.16', 1],
  [309, '1CO.7.33', 1], [310, 'MAT.19.12', 2], [349, 'ROM.2.15', 2], [367, '1JN.2.15', 1], [396, 'MAT.11.28', 1],
  [407, 'JAS.4.6', 1], [418, '1CO.15.10', 1], [418, 'EPH.2.8', 2], [431, '2CO.4.6', 3], [453, 'LUK.15.17', 2],
  [541, 'JAS.1.17', 1], [571, 'GEN.1.26', 1], [628, 'COL.1.13', 2], [641, 'EPH.5.8', 2],
];
const SUPPRIMER = [
  [2, 'JAS.4.6', 1], [23, 'ROM.11.36', 2], [107, '1TI.5.22', 1], [176, 'GEN.1.27', 4], [282, 'MAT.19.14', 1],
  [309, 'MAT.19.12', 1], [309, '1CO.7.28', 2], [313, 'DEU.32.39', 2], [328, '1CO.3.16', 2], [349, 'ROM.2.15', 3],
  [453, 'LUK.15.14', 4], [492, 'LUK.15.4', 4], [523, 'COL.2.8', 2], [554, 'LUK.15.16', 2], [571, 'GEN.1.27', 2],
  [589, 'GEN.19.5', 4],
];

async function pageAll() {
  const o = [];
  for (let de = 0; ; de += 1000) {
    const { data } = await sb.from('segments').select('id, segment_numero').eq('id_oeuvre', OEUVRE).order('segment_numero').range(de, de + 999);
    if (!data?.length) break; o.push(...data); if (data.length < 1000) break;
  }
  return o;
}
async function main() {
  const segs = await pageAll();
  const parNum = new Map(segs.map((s) => [s.segment_numero, s.id]));
  let prom = 0, supp = 0; const absents = [];
  for (const [num, canon, type] of PROMOUVOIR) {
    const sid = parNum.get(num); if (!sid) { absents.push(`P#${num}`); continue; }
    const { data } = await sb.from('liens_bibliques').select('id').eq('segment_id', sid).eq('canon_id', canon).eq('type', type).eq('fiabilite', 'douteux');
    if (!data?.length) { absents.push(`P#${num} ${canon}/t${type}`); continue; }
    if (!DRY) await sb.from('liens_bibliques').update({ fiabilite: 'probable', arbitrage_requis: false }).in('id', data.map((x) => x.id));
    prom += data.length;
  }
  for (const [num, canon, type] of SUPPRIMER) {
    const sid = parNum.get(num); if (!sid) { absents.push(`S#${num}`); continue; }
    const { data } = await sb.from('liens_bibliques').select('id').eq('segment_id', sid).eq('canon_id', canon).eq('type', type).eq('fiabilite', 'douteux');
    if (!data?.length) { absents.push(`S#${num} ${canon}/t${type}`); continue; }
    if (!DRY) await sb.from('liens_bibliques').delete().in('id', data.map((x) => x.id));
    supp += data.length;
  }
  console.log(`${DRY ? '(--dry) ' : ''}promus : ${prom} · supprimés : ${supp}`);
  if (absents.length) console.log('introuvables :', absents.join(', '));
}
main().catch((e) => { console.error(e); process.exit(1); });
