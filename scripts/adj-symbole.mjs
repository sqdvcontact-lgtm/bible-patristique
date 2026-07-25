// ADJUDICATION DE LECTURE — Du Symbole (A0010O0055), travail de fond.
// Relecture des 52 segments contre tous leurs candidats (dont le filet porté).
// PROMOUVOIR : douteux confirmés par la lecture → probable, arbitrage levé.
// SUPPRIMER  : faux appariements ou redondances.
// Le reste des douteux demeure en arbitrage (incertitude réelle).
//   [segment_numero, canon_id, type]

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = 'A0010O0055';
const DRY = process.argv.includes('--dry');

const PROMOUVOIR = [
  [5, 'ROM.5.12', 3], [6, '1JN.3.5', 2], [6, 'ROM.5.12', 3], [7, 'JHN.1.1', 1], [7, 'JHN.1.18', 2],
  [9, 'JHN.10.30', 1], [16, 'JHN.10.30', 1], [16, 'JHN.1.1', 2], [17, 'PHP.2.6', 1], [18, 'MAT.1.18', 1],
  [19, 'PSA.115.12', 1], [19, 'ROM.5.6', 2], [20, 'JHN.1.1', 1], [25, 'JHN.10.17', 1], [26, '2TI.4.7', 3],
  [28, 'JOB.42.10', 2], [30, 'GEN.3.1', 1], [30, 'JOB.2.9', 2], [33, 'PSA.74.8', 1], [40, 'MAT.25.31', 1],
  [41, 'MAT.25.31', 1], [43, 'ACT.7.47', 1], [44, '1CO.15.36', 2], [45, '1CO.6.19', 1], [46, '1CO.3.17', 1],
  [50, 'MAT.6.9', 1], [50, 'JHN.3.5', 1], [50, 'ACT.2.38', 2], [52, 'EPH.5.23', 1], [52, 'JHN.11.43', 3],
];
const SUPPRIMER = [
  [4, 'GEN.1.1', 1], [4, 'COL.1.16', 2], [5, 'GEN.3.1', 2], [6, '1PE.2.22', 1], [13, 'JHN.5.19', 1],
  [25, 'PHP.2.6', 2], [26, 'ROM.6.9', 1], [33, '1SA.2.7', 1], [33, 'JOB.1.21', 2], [37, 'PSA.20.2', 1],
  [37, 'MAT.27.46', 2], [37, 'ROM.6.9', 3], [38, '1KI.2.38', 1], [40, 'MAT.25.34', 2], [40, 'MAT.25.41', 3],
  [43, 'ACT.7.48', 2], [43, '1CO.12.24', 4], [50, 'MAT.6.9', 3],
];

async function main() {
  const { data: segs } = await sb.from('segments').select('id, segment_numero').eq('id_oeuvre', OEUVRE);
  const parNum = new Map(segs.map((s) => [s.segment_numero, s.id]));
  let prom = 0, supp = 0, absents = [];
  for (const [num, canon, type] of PROMOUVOIR) {
    const sid = parNum.get(num); if (!sid) { absents.push(`P #${num}`); continue; }
    const { data } = await sb.from('liens_bibliques').select('id').eq('segment_id', sid).eq('canon_id', canon).eq('type', type);
    if (!data?.length) { absents.push(`P #${num} ${canon}/t${type}`); continue; }
    if (!DRY) await sb.from('liens_bibliques').update({ fiabilite: 'probable', arbitrage_requis: false }).in('id', data.map((x) => x.id));
    prom += data.length;
  }
  for (const [num, canon, type] of SUPPRIMER) {
    const sid = parNum.get(num); if (!sid) { absents.push(`S #${num}`); continue; }
    const { data } = await sb.from('liens_bibliques').select('id').eq('segment_id', sid).eq('canon_id', canon).eq('type', type);
    if (!data?.length) { absents.push(`S #${num} ${canon}/t${type}`); continue; }
    if (!DRY) await sb.from('liens_bibliques').delete().in('id', data.map((x) => x.id));
    supp += data.length;
  }
  console.log(`${DRY ? '(--dry) ' : ''}promus : ${prom} · supprimés : ${supp}`);
  if (absents.length) console.log('introuvables :', absents.join(', '));
}
main().catch((e) => { console.error(e); process.exit(1); });
