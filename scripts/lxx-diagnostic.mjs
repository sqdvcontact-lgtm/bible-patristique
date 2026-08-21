// SEPTANTE DE SWETE — diagnostic d'alignement AVANT import.
//
// Le corpus est `lxx-swete` (First1KGreek), un mot par ligne, préfixé
// `livre.chapitre.verset`. Licence CC BY-SA 4.0 : attribution ET partage à
// l'identique — à consigner dans `editions_sources` avant toute écriture.
//
// La question décisive n'est pas le format mais la NUMÉROTATION : l'ossature suit
// l'hébreu (sauf les psaumes, en grec). La Septante s'en écarte beaucoup — et
// massivement dans Jérémie, dont elle réordonne les chapitres. On mesure ici, livre
// par livre, ce qui s'aligne de soi et ce qui ne s'alignera pas.
//   node scripts/lxx-diagnostic.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const DATA = 'C:/Users/quins/OneDrive/Bureau/lxx-swete-master/lxx-swete-master/data';

// fichier Swete → code de l'ossature. `null` = hors des 73 livres : ira en apocryphes.
const CORR = {
  '01.Genesis': 'GEN', '02.Exodus': 'EXO', '03.Leviticus': 'LEV', '04.Numeri': 'NUM',
  '05.Deuteronomium': 'DEU', '06.Josue': 'JOS', '08.Judices': 'JDG', '10.Ruth': 'RUT',
  '11.Regnorum_I': '1SA', '12.Regnorum_II': '2SA', '13.Regnorum_III': '1KI', '14.Regnorum_IV': '2KI',
  '15.Paralipomenon_I': '1CH', '16.Paralipomenon_II': '2CH',
  '17.Esdras_A': null, '18.Esdras_B': 'EZR',           // Esdras B couvre Esdras + Néhémie
  '19.Esther': 'EST', '20.Judith': 'JDT', '21.Tobias': 'TOB',
  '23.Machabaeorum_i': '1MA', '24.Machabaeorum_ii': '2MA',
  '25.Machabaeorum_iii': null, '26.Machabaeorum_iv': null,
  '27.Psalmi': 'PSA', '28.Odae': null, '29.Proverbia': 'PRO', '31.Canticum': 'SNG',
  '32.Job': 'JOB', '33.Sapientia_Salomonis': 'WIS', '34.Ecclesiasticus': 'SIR',
  '35.Psalmi_Salomonis': null,
  '36.Osee': 'HOS', '37.Amos': 'AMO', '38.Michaeas': 'MIC', '39.Joel': 'JOL',
  '40.Abdias': 'OBA', '41.Jonas': 'JON', '42.Nahum': 'NAM', '43.Habacuc': 'HAB',
  '44.Sophonias': 'ZEP', '45.Aggaeus': 'HAG', '46.Zacharias': 'ZEC', '47.Malachias': 'MAL',
  '48.Isaias': 'ISA', '49.Jeremias': 'JER', '50.Baruch': 'BAR',
  '51.Threni_seu_Lamentationes': 'LAM', '52.Epistula_Jeremiae': null,
  '53.Ezechiel': 'EZK',
  '54.Susanna_translatio_Graeca': null, '55.Susanna_Theodotionis_versio': null,
  '56.Daniel_translatio_Graeca': null, '57.Daniel_Theodotionis_versio': 'DAN',
  '58.Bel_et_Draco_translatio_Graeca': null, '59.Bel_et_Draco_Theodotionis_versio': null,
};

// ossature
const canon = [];
for (let de = 0; ; de += 1000) {
  const { data } = await sb.from('versets_canon').select('id, livre, ch_canon, v_canon').order('id').range(de, de + 999);
  if (!data?.length) break; canon.push(...data); if (data.length < 1000) break;
}
const ossature = new Set(canon.map((r) => r.id));
const chapOss = {};
for (const r of canon) { chapOss[r.livre] = chapOss[r.livre] || new Set(); chapOss[r.livre].add(r.ch_canon); }

const rapport = [];
let totVersets = 0, totApoc = 0;
for (const f of readdirSync(DATA).filter((x) => x.endsWith('.txt')).sort()) {
  const base = f.replace(/\.txt$/, '');
  const code = CORR[base];
  const lignes = readFileSync(`${DATA}/${f}`, 'utf8').split(/\r?\n/).filter(Boolean);
  const versets = new Map();
  for (const l of lignes) {
    const m = l.match(/^(\d+)\.(\d+)\.(\d+)\s+(.*)$/);
    if (!m) continue;
    const k = `${+m[2]}.${+m[3]}`;
    versets.set(k, (versets.get(k) ? versets.get(k) + ' ' : '') + m[4]);
  }
  if (code === null || code === undefined) {
    totApoc += versets.size;
    rapport.push({ f: base, code: '—', n: versets.size, dans: 0, hors: versets.size, note: 'hors des 73 livres → apocryphes' });
    continue;
  }
  let dans = 0, hors = 0;
  for (const k of versets.keys()) {
    const [c, v] = k.split('.');
    if (ossature.has(`${code}.${c}.${v}`)) dans++; else hors++;
  }
  totVersets += versets.size;
  rapport.push({ f: base, code, n: versets.size, dans, hors, pct: Math.round((dans / versets.size) * 100) });
}
console.log('fichier                              code   versets  dans l’ossature   hors');
console.log('─'.repeat(80));
for (const r of rapport.sort((a, b) => (a.pct ?? -1) - (b.pct ?? -1)))
  console.log(`${r.f.padEnd(36)} ${String(r.code).padEnd(5)} ${String(r.n).padStart(7)}  ${r.pct != null ? String(r.pct).padStart(6) + ' %' : '      —'}  ${String(r.hors).padStart(6)}${r.note ? '   ' + r.note : ''}`);
console.log(`\ntotal canon : ${totVersets} versets · hors canon : ${totApoc}`);
writeFileSync('scripts/_lxx_diagnostic.json', JSON.stringify(rapport, null, 1), 'utf8');
process.exit(0);
