// Groupe (b) du re-crible : liens type 3 qui sont en réalité des citations (→1) ou
// des reprises fondues (→2), pas des commentaires. Si un lien du type cible existe
// déjà au même endroit (matcheur), on supprime le doublon type 3 au lieu de le muter.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = 'A0010O0001';
const AGIT = process.argv.includes('--agit');

const VERS1 = [[1728, 'LUK.12.9'], [2065, 'PSA.4.4'], [2072, 'PSA.4.7'], [2706, 'PHP.4.13'], [3355, 'ROM.8.31'], [3831, 'LUK.21.33']];
const VERS2 = [[11, 'PSA.21.27'], [1549, 'JAS.4.6'], [1660, 'ROM.1.20'], [1683, 'MAT.11.25'], [1802, 'ROM.7.25'], [2937, 'MAT.5.5']];

async function pageAll(sel) {
  const o = [];
  for (let de = 0; ; de += 1000) {
    const { data } = await sb.from('segments').select(sel).eq('id_oeuvre', OEUVRE).order('segment_numero').range(de, de + 999);
    if (!data?.length) break; o.push(...data); if (data.length < 1000) break;
  }
  return o;
}
async function traiter(parNum, liste, cible, log) {
  let mut = 0, sup = 0; const absents = [];
  for (const [num, canon] of liste) {
    const sid = parNum.get(num); if (!sid) { absents.push('#' + num); continue; }
    const { data } = await sb.from('liens_bibliques').select('id, type').eq('segment_id', sid).eq('canon_id', canon);
    const t3 = (data || []).filter((l) => l.type === 3);
    const dejaCible = (data || []).some((l) => l.type === cible);
    if (!t3.length) { absents.push('#' + num + ' ' + canon); continue; }
    if (dejaCible) { if (AGIT) await sb.from('liens_bibliques').delete().in('id', t3.map((x) => x.id)); sup += t3.length; }
    else { if (AGIT) await sb.from('liens_bibliques').update({ type: cible }).in('id', t3.map((x) => x.id)); mut += t3.length; }
  }
  console.log(`${log} → type ${cible} : ${mut} mutés, ${sup} doublons supprimés${absents.length ? ' · introuvables ' + absents.join(', ') : ''}`);
}
async function main() {
  const parNum = new Map((await pageAll('id, segment_numero')).map((s) => [s.segment_numero, s.id]));
  await traiter(parNum, VERS1, 1, 'citations');
  await traiter(parNum, VERS2, 2, 'reprises');
  if (!AGIT) console.log('(simulation — ajouter --agit)');
}
main().catch((e) => { console.error(e); process.exit(1); });
