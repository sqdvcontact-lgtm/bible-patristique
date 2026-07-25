// ADJUDICATION DE FOND — Confessions VIII (fin) + IX (#1829-2273).
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = 'A0010O0001';
const DRY = process.argv.includes('--dry');

const PROMOUVOIR = [
  [1829,'MAT.5.3',4],[1830,'LUK.24.32',1],[1841,'LUK.14.28',1],[1846,'MAT.6.21',1],[1905,'EPH.5.8',2],
  [1906,'JHN.1.9',1],[1912,'ROM.7.17',1],[1912,'ROM.7.20',2],[1954,'MAT.19.26',3],[1960,'COL.3.5',1],
  [1992,'PSA.115.16',1],[1993,'PSA.34.3',1],[1997,'MAT.11.30',1],[1997,'MAT.11.29',1],[2009,'EPH.5.8',1],
  [2030,'PSA.67.16',2],[2042,'PSA.26.8',1],[2057,'PSA.4.2',1],[2062,'JHN.14.17',1],[2062,'JHN.14.16',2],
  [2068,'ROM.2.5',1],[2073,'JHN.1.9',1],[2083,'PSA.4.9',1],[2124,'SNG.1.3',2],[2144,'SIR.19.1',1],
  [2176,'1TI.5.10',2],[2177,'GAL.4.19',4],[2188,'WIS.7.27',3],[2192,'HEB.1.1',1],[2192,'HEB.1.2',2],
  [2195,'MAT.25.21',1],[2226,'PSA.100.1',1],[2254,'ROM.8.34',1],[2255,'MAT.6.12',2],[2259,'ROM.9.15',1],
  [2265,'COL.2.14',1],[2273,'HEB.13.14',1],
];
const SUPPRIMER = [
  [1970,'PSA.129.3',1],[1981,'ROM.13.14',1],[1984,'ROM.14.1',1],[1986,'ROM.14.1',2],[1989,'EPH.3.20',1],
  [1989,'EPH.3.20',2],[2064,'ECC.12.9',1],[2079,'1CO.15.54',1],[2080,'SIR.40.5',1],[2144,'PRO.23.9',1],
  [2248,'GAL.1.6',1],[2259,'ROM.9.15',2],
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
