// ADJUDICATION DE LECTURE — Didachè (A0012O0002), travail de fond.
// Catéchisme-mosaïque : chaque parole a plusieurs candidats (parole + parallèles
// synoptiques + source AT). On PROMEUT les citations verbatim sûres, on SUPPRIME
// les doublons exacts (même verset en plusieurs types) ; les PARALLÈLES restent en
// arbitrage (choisir Mt/Lc ou NT/AT est un vrai arbitrage).
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = 'A0012O0002';
const DRY = process.argv.includes('--dry');

const PROMOUVOIR = [
  [2, 'DEU.6.5', 2], [2, 'LEV.19.18', 3], [2, 'TOB.4.15', 1],       // double commandement + règle d'or
  [3, 'MAT.5.46', 4], [3, 'LUK.6.28', 2],                            // aimer/prier pour les ennemis
  [5, 'MAT.5.40', 2], [5, 'MAT.5.42', 3], [5, 'MAT.5.41', 4],        // tunique / deux milles / donne
  [10, 'EXO.20.14', 2], [10, 'EXO.20.15', 3],                        // décalogue (adultère, vol)
  [39, 'DEU.4.2', 1],                                                // sans ajouter ni retrancher
  [53, 'MAT.6.10', 3], [53, 'MAT.6.11', 4],                          // oraison dominicale (verbatim)
  [63, 'ACT.17.24', 1],                                             // « créé l'univers »
  [99, 'MAT.24.44', 1],                                             // soyez prêts, ignorez l'heure
  [104, 'MAT.24.10', 2],                                            // beaucoup se scandaliseront
  [107, 'DAN.7.13', 1],                                             // venant sur les nuées
];
const SUPPRIMER = [ // doublons exacts (même verset, type superflu)
  [2, 'TOB.4.15', 4], [3, 'MAT.5.44', 3], [6, 'MAT.5.42', 2], [10, 'EXO.20.17', 4],
  [39, 'DEU.13.1', 3], [53, 'MAT.6.9', 2], [85, 'MAT.10.10', 2], [86, 'MAT.10.10', 2],
  [94, 'MAL.1.14', 2], [99, 'MAT.24.44', 3], [107, 'DAN.7.13', 3],
  // parallèles synoptiques purs redondants avec la source primaire déjà probable
  [3, 'LUK.6.27', 1], [6, 'LUK.6.30', 1], [7, 'LUK.12.59', 2], [85, 'LUK.10.7', 1], [86, 'LUK.10.7', 1],
];

async function main() {
  const { data: segs } = await sb.from('segments').select('id, segment_numero').eq('id_oeuvre', OEUVRE);
  const parNum = new Map(segs.map((s) => [s.segment_numero, s.id]));
  let prom = 0, supp = 0; const absents = [];
  for (const [num, canon, type] of PROMOUVOIR) {
    const sid = parNum.get(num); if (!sid) { absents.push(`P#${num}`); continue; }
    const { data } = await sb.from('liens_bibliques').select('id').eq('segment_id', sid).eq('canon_id', canon).eq('type', type);
    if (!data?.length) { absents.push(`P#${num} ${canon}/t${type}`); continue; }
    if (!DRY) await sb.from('liens_bibliques').update({ fiabilite: 'probable', arbitrage_requis: false }).in('id', data.map((x) => x.id));
    prom += data.length;
  }
  for (const [num, canon, type] of SUPPRIMER) {
    const sid = parNum.get(num); if (!sid) { absents.push(`S#${num}`); continue; }
    const { data } = await sb.from('liens_bibliques').select('id').eq('segment_id', sid).eq('canon_id', canon).eq('type', type);
    if (!data?.length) { absents.push(`S#${num} ${canon}/t${type}`); continue; }
    if (!DRY) await sb.from('liens_bibliques').delete().in('id', data.map((x) => x.id));
    supp += data.length;
  }
  console.log(`${DRY ? '(--dry) ' : ''}promus : ${prom} · supprimés : ${supp}`);
  if (absents.length) console.log('introuvables :', absents.join(', '));
}
main().catch((e) => { console.error(e); process.exit(1); });
