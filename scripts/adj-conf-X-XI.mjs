// ADJUDICATION DE FOND — Confessions X + XI (#2275-3334).
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = 'A0010O0001';
const DRY = process.argv.includes('--dry');

const PROMOUVOIR = [
  [2275,'1CO.13.12',1],[2276,'EPH.5.27',1],[2288,'ROM.4.5',2],[2298,'1CO.13.7',3],[2321,'PHP.2.12',1],
  [2329,'1CO.4.3',1],[2330,'1CO.2.11',1],[2333,'1CO.13.12',1],[2334,'1CO.10.13',1],[2336,'ISA.58.10',1],
  [2340,'ROM.1.20',2],[2341,'ROM.9.15',1],[2363,'ROM.1.20',1],[2364,'ROM.1.25',1],[2589,'GAL.5.17',1],
  [2589,'GAL.5.16',1],[2601,'JHN.12.35',1],[2660,'WIS.8.21',1],[2665,'1JN.2.16',1],[2686,'1CO.9.27',1],
  [2696,'LUK.21.34',1],[2704,'SIR.18.30',1],[2705,'1CO.8.8',1],[2706,'PHP.4.11',1],[2706,'PHP.4.12',2],
  [2706,'PHP.4.13',3],[2712,'1CO.1.31',2],[2713,'SIR.23.6',1],[2715,'TIT.1.15',1],[2715,'1TI.4.4',3],
  [2786,'1JN.2.16',1],[2825,'MAT.11.30',2],[2831,'ISA.14.13',1],[2831,'ISA.14.14',2],[2831,'ISA.14.15',3],
  [2832,'LUK.12.32',1],[2906,'2CO.11.14',1],[2911,'ROM.6.23',1],[2913,'1TI.2.5',1],[2916,'JHN.1.1',1],
  [2917,'JHN.3.16',1],[2918,'ROM.8.32',1],[2919,'PHP.2.8',2],[2921,'ROM.8.34',1],[2937,'MAT.5.3',1],
  [2937,'MAT.5.4',2],[2937,'MAT.5.5',3],[2937,'MAT.5.6',4],[2946,'PSA.69.6',1],[2947,'ROM.2.29',2],
  [2967,'MAT.7.7',1],[2968,'PSA.79.18',2],[2969,'JHN.1.3',1],[2970,'COL.2.3',1],[3002,'MAT.3.17',1],
  [3005,'JHN.1.1',3],[3027,'JHN.1.1',1],[3027,'JHN.1.3',3],[3066,'PSA.101.28',1],[3198,'MAT.7.11',1],
  [3202,'2CO.4.13',1],[3219,'GEN.1.14',1],[3231,'JOS.10.13',1],[3325,'PSA.62.4',1],[3327,'PSA.30.11',1],
];
const SUPPRIMER = [
  [2326,'1CO.4.3',1],[2351,'NUM.15.22',1],[2648,'JOB.7.1',1],[2648,'JOB.7.1',2],[2665,'1JN.2.16',2],
  [2685,'1CO.15.53',1],[2696,'1SA.6.6',1],[2704,'SIR.18.30',2],[2704,'1CO.8.8',1],[2935,'MAT.6.8',1],
  [2935,'MAT.6.8',2],[2937,'MAT.5.3',2],[3001,'MAT.19.11',1],[3031,'PSA.102.5',1],[3204,'JDT.7.25',1],
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
