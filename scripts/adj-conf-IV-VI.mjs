// ADJUDICATION DE FOND — Confessions Livres IV-VI (A0010O0001).
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = 'A0010O0001';
const DRY = process.argv.includes('--dry');

const PROMOUVOIR = [
  [686, 'ROM.2.6', 1], [788, 'MAT.11.28', 1], [802, 'JOB.38.11', 2], [820, 'ACT.17.27', 2], [825, 'MAT.11.28', 1],
  [889, 'JHN.1.9', 1], [892, 'JAS.4.6', 1], [913, 'GEN.3.19', 2], [955, 'LUK.15.20', 1], [976, 'MAT.17.27', 2],
  [980, 'ROM.1.22', 2], [989, 'ROM.1.21', 1], [1004, 'EPH.4.14', 2], [1077, 'COL.2.14', 1], [1077, 'EPH.2.15', 2],
  [1288, 'ISA.29.13', 2], [1336, 'LUK.16.11', 1],
];
const SUPPRIMER = [
  [685, 'MAT.16.27', 2], [704, 'ROM.5.5', 1], [705, 'PHM.1.7', 1], [823, 'ISA.46.8', 2], [838, '1TI.1.15', 2],
  [839, 'LEV.5.19', 1], [890, 'JHN.1.9', 2], [912, 'GEN.3.18', 1], [912, 'GEN.3.19', 2], [949, 'WIS.11.25', 2],
  [965, 'PRO.5.8', 1], [975, 'MAT.22.21', 2], [975, '1CO.1.30', 3], [980, 'ROM.1.21', 1], [982, 'ROM.1.23', 2],
  [994, 'JOB.28.28', 1], [996, 'MAT.13.45', 1], [996, 'MAT.13.46', 2], [1170, 'LUK.7.14', 1], [1170, 'LUK.7.15', 2],
  [1171, 'JON.3.2', 1], [1176, 'JHN.4.14', 1], [1176, 'JHN.4.14', 2], [1177, 'JHN.4.14', 1], [1280, 'PRO.9.8', 1],
  [1336, 'LUK.16.11', 2], [1336, 'LUK.16.12', 3], [1426, 'ISA.46.4', 2],
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
  const parNum = new Map((await pageAll()).map((s) => [s.segment_numero, s.id]));
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
