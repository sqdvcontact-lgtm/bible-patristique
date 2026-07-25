// ADJUDICATION DE FOND — Confessions VII + début VIII (#1454-1805).
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = 'A0010O0001';
const DRY = process.argv.includes('--dry');

const PROMOUVOIR = [
  [1457,'JAS.1.14',1],[1457,'JAS.1.15',2],[1464,'ROM.7.18',1],[1464,'ROM.7.19',2],[1489,'GEN.1.31',3],
  [1504,'JHN.1.4',1],[1549,'JAS.4.6',3],[1550,'JHN.1.9',1],[1554,'JHN.1.14',1],[1555,'PHP.2.6',1],
  [1556,'PHP.2.10',1],[1556,'PHP.2.8',2],[1558,'JHN.1.16',1],[1559,'ROM.8.32',1],[1559,'ROM.5.6',2],
  [1564,'ROM.1.23',1],[1567,'ROM.9.12',2],[1568,'EXO.12.35',2],[1569,'ACT.17.28',1],[1570,'ROM.1.25',1],
  [1586,'ROM.1.20',1],[1592,'PSA.15.2',1],[1631,'ROM.1.20',1],[1634,'JHN.1.9',1],[1636,'ROM.1.20',1],
  [1638,'JHN.14.6',2],[1640,'JHN.1.14',1],[1640,'JHN.1.3',3],[1642,'JHN.1.1',1],[1642,'JHN.1.2',2],
  [1643,'PHP.2.7',2],[1643,'PHP.2.8',3],[1659,'1CO.11.19',1],[1660,'ROM.1.20',3],[1664,'ROM.1.22',1],
  [1673,'ROM.7.23',1],[1673,'ROM.7.22',1],[1676,'ROM.7.24',2],[1677,'COL.2.14',1],[1680,'PSA.61.2',1],
  [1681,'MAT.11.28',1],[1682,'MAT.11.29',3],[1683,'MAT.11.25',3],[1684,'EPH.6.12',2],[1687,'1CO.15.9',1],
  [1687,'HAB.3.2',2],[1689,'PSA.115.17',1],[1694,'1CO.5.7',2],[1701,'PSA.25.8',1],[1703,'1CO.7.7',1],
  [1705,'MAT.19.12',1],[1706,'WIS.13.1',1],[1707,'JHN.1.3',1],[1708,'ROM.1.21',1],[1710,'ROM.1.22',1],
  [1710,'JOB.28.28',1],[1711,'MAT.13.46',1],[1714,'COL.2.8',2],[1728,'LUK.12.9',3],[1744,'LUK.15.7',2],
  [1745,'LUK.15.8',2],[1746,'LUK.15.32',1],[1759,'LUK.15.32',2],[1772,'1CO.1.27',1],[1772,'1CO.1.28',2],
  [1776,'MAT.12.29',2],[1790,'ROM.7.19',1],[1802,'ROM.7.22',4],[1802,'ROM.7.23',1],[1802,'ROM.7.24',2],
  [1802,'ROM.7.25',3],[1803,'ROM.7.17',1],[1803,'ROM.7.20',2],[1804,'ROM.7.24',1],
];
const SUPPRIMER = [
  [1542,'JOB.15.26',1],[1559,'2MA.1.17',1],[1563,'MAT.11.29',1],[1568,'ACT.17.28',2],[1580,'ECC.4.5',1],
  [1612,'MAT.24.29',1],[1674,'JOB.35.7',1],[1676,'PRO.3.6',1],[1676,'ACT.13.28',1],[1705,'WIS.13.1',2],
  [1710,'MAT.13.46',3],[1777,'WIS.10.21',1],
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
