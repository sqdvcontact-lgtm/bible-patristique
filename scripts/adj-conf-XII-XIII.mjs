// ADJUDICATION DE FOND — Confessions XII-XIII (#3336-4129), allégorie de la Genèse.
// Promotion des citations verbatim (versets de Gn 1 commentés jour par jour +
// textes pauliniens tissés). Le leitmotiv récurrent GEN.1.1/1.2 reste en arbitrage.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = 'A0010O0001';
const DRY = process.argv.includes('--dry');

const PROMOUVOIR = [
  [3355,'MAT.7.7',1],[3355,'ROM.8.31',3],[3363,'GEN.1.2',2],[3364,'GEN.1.2',2],[3409,'GEN.1.6',1],
  [3433,'1TI.6.16',1],[3444,'PSA.41.4',1],[3458,'GEN.1.1',1],[3458,'GEN.1.2',2],[3465,'GEN.1.8',2],
  [3489,'SIR.1.4',1],[3495,'2CO.5.21',1],[3535,'2TI.2.14',1],[3536,'MAT.22.40',2],[3575,'GEN.1.9',1],
  [3610,'1TI.1.8',1],[3610,'1TI.1.5',2],[3614,'DEU.6.5',1],[3614,'MAT.22.39',2],[3709,'GEN.1.3',1],
  [3729,'ROM.5.5',2],[3789,'ROM.8.24',1],[3794,'ROM.12.2',1],[3795,'GAL.3.1',2],[3797,'JHN.3.29',1],
  [3798,'ROM.8.23',1],[3800,'2CO.11.3',1],[3812,'GEN.1.4',1],[3814,'1CO.4.7',1],[3814,'ROM.9.21',1],
  [3816,'ISA.34.4',1],[3820,'MAT.21.16',2],[3831,'MRK.13.31',2],[3831,'LUK.21.33',3],[3835,'1JN.3.2',1],
  [3844,'GEN.1.9',1],[3845,'GEN.1.9',1],[3846,'GEN.1.9',2],[3850,'GEN.1.11',1],[3859,'ROM.13.11',1],
  [3860,'ROM.13.12',1],[3865,'1CO.12.11',1],[3871,'ISA.1.16',1],[3876,'MAT.19.17',1],[3880,'MAT.6.21',1],
  [3887,'ACT.2.2',1],[3891,'GEN.1.20',1],[3923,'DEU.4.29',2],[3924,'ROM.12.2',1],[3931,'GAL.4.12',1],
  [3933,'SIR.3.19',1],[3939,'ROM.12.2',2],[3941,'GEN.1.26',1],[3947,'GEN.1.27',1],[3949,'COL.3.10',1],
  [3950,'1CO.2.15',1],[3951,'1CO.2.14',1],[3953,'EPH.2.10',1],[3954,'GAL.3.28',2],[3960,'MAT.7.20',1],
  [3963,'1CO.5.12',1],[3974,'GEN.1.28',1],[4008,'ROM.3.4',1],[4010,'GEN.1.29',1],[4013,'2TI.1.16',1],
  [4016,'2TI.4.16',1],[4019,'PHP.3.19',1],[4024,'PHP.4.10',1],[4032,'PHP.4.14',1],[4038,'PHP.4.17',1],
  [4042,'MAT.10.42',1],[4043,'MAT.10.41',1],[4051,'GEN.1.31',1],[4073,'1CO.2.11',1],[4075,'1CO.2.12',2],
  [4079,'MAT.10.20',1],
];
const SUPPRIMER = [];

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
