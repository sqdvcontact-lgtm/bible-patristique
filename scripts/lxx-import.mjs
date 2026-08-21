// IMPORT DE LA SEPTANTE DE SWETE (TR0005).
//
// Source : lxx-swete (Nathan D. Smith), d'après le First1KGreek de l'Open Greek and
// Latin Project — texte de H. B. Swete, « The Old Testament in Greek according to
// the Septuagint » (Cambridge, 1909-1912).
//
// ⚠ LICENCE **CC BY-SA 4.0** : attribution ET partage à l'identique. Ce n'est pas
// le domaine public. Consigné dans `editions_sources` ; l'obligation de partage à
// l'identique engage le site s'il publie ce texte.
//
// Format : un mot par ligne, préfixé `livre.chapitre.verset`. On réassemble.
//
// ALIGNEMENT — la Septante numérote autrement que l'ossature, qui suit l'hébreu
// (sauf les psaumes, en grec). Règle appliquée, conforme à ce qui a été établi pour
// la Vulgate le 24/07 : un verset dont l'ossature n'a pas le créneau est porté
// SANS créneau (`canon_id = null`), jamais logé de force chez son voisin.
//
//   node scripts/lxx-import.mjs --dry
import { readFileSync, readdirSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.argv.includes('--dry');
const TR = 'TR0005';
const DATA = 'C:/Users/quins/OneDrive/Bureau/lxx-swete-master/lxx-swete-master/data';

// fichier → code de l'ossature (canon), ou code de livre hors canon.
const CANON = {
  '01.Genesis': 'GEN', '02.Exodus': 'EXO', '03.Leviticus': 'LEV', '04.Numeri': 'NUM',
  '05.Deuteronomium': 'DEU', '06.Josue': 'JOS', '08.Judices': 'JDG', '10.Ruth': 'RUT',
  '11.Regnorum_I': '1SA', '12.Regnorum_II': '2SA', '13.Regnorum_III': '1KI', '14.Regnorum_IV': '2KI',
  '15.Paralipomenon_I': '1CH', '16.Paralipomenon_II': '2CH', '18.Esdras_B': 'EZR+NEH',
  '19.Esther': 'EST', '20.Judith': 'JDT', '21.Tobias': 'TOB',
  '23.Machabaeorum_i': '1MA', '24.Machabaeorum_ii': '2MA', '27.Psalmi': 'PSA',
  '29.Proverbia': 'PRO', '31.Canticum': 'SNG', '32.Job': 'JOB',
  '33.Sapientia_Salomonis': 'WIS', '34.Ecclesiasticus': 'SIR',
  '36.Osee': 'HOS', '37.Amos': 'AMO', '38.Michaeas': 'MIC', '39.Joel': 'JOL',
  '40.Abdias': 'OBA', '41.Jonas': 'JON', '42.Nahum': 'NAM', '43.Habacuc': 'HAB',
  '44.Sophonias': 'ZEP', '45.Aggaeus': 'HAG', '46.Zacharias': 'ZEC', '47.Malachias': 'MAL',
  '48.Isaias': 'ISA', '49.Jeremias': 'JER', '50.Baruch': 'BAR',
  '51.Threni_seu_Lamentationes': 'LAM', '53.Ezechiel': 'EZK',
  '57.Daniel_Theodotionis_versio': 'DAN',   // version reçue par l'Église
};
// hors des 73 livres → table des apocryphes, avec leur code déclaré dans `livres`
const HORS = {
  '17.Esdras_A': ['1ES', 'Esdras A (3 Esdras)'],
  '25.Machabaeorum_iii': ['3MA', '3 Maccabées'],
  '26.Machabaeorum_iv': ['4MA', '4 Maccabées'],
  '28.Odae': ['ODA', 'Odes'],
  '35.Psalmi_Salomonis': ['PSS', 'Psaumes de Salomon'],
  '52.Epistula_Jeremiae': ['LJE', 'Lettre de Jérémie'],
  '54.Susanna_translatio_Graeca': ['SUS', 'Suzanne — vieux grec'],
  '55.Susanna_Theodotionis_versio': ['SUS', 'Suzanne — version de Théodotion'],
  '56.Daniel_translatio_Graeca': ['DAG', 'Daniel — vieux grec (version distincte de Théodotion)'],
  '58.Bel_et_Draco_translatio_Graeca': ['BEL', 'Bel et le dragon — vieux grec'],
  '59.Bel_et_Draco_Theodotionis_versio': ['BEL', 'Bel et le dragon — version de Théodotion'],
};

function lireFichier(base) {
  const versets = new Map();
  for (const l of readFileSync(`${DATA}/${base}.txt`, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^(\d+)\.(\d+)\.(\d+)\s+(.*)$/);
    if (!m) continue;
    const k = `${+m[2]}|${+m[3]}`;
    versets.set(k, (versets.has(k) ? versets.get(k) + ' ' : '') + m[4]);
  }
  return versets;
}

const canon = new Set();
for (let de = 0; ; de += 1000) {
  const { data } = await sb.from('versets_canon').select('id').order('id').range(de, de + 999);
  if (!data?.length) break; for (const r of data) canon.add(r.id); if (data.length < 1000) break;
}

const lignes = [], apocryphes = [];
for (const base of Object.keys(CANON)) {
  const v = lireFichier(base);
  for (const [k, texte] of v) {
    let [ch, ver] = k.split('|').map(Number);
    let livre = CANON[base];
    if (livre === 'EZR+NEH') {                    // Esdras B : 1-10 = Esdras, 11-23 = Néhémie
      if (ch <= 10) livre = 'EZR';
      else { livre = 'NEH'; ch -= 10; }
    }
    const id = `${livre}.${ch}.${ver}`;
    lignes.push({
      trad_id: TR, livre, ch_orig: ch, v_orig: ver, texte,
      canon_id: canon.has(id) ? id : null, ordre_slot: canon.has(id) ? 1 : null,
      alignement_verifie: false,
      notes: canon.has(id) ? null : 'Verset de la Septante sans créneau dans l’ossature (numérotation grecque distincte) — laissé surnuméraire.',
    });
  }
}
for (const base of Object.keys(HORS)) {
  const [code, nom] = HORS[base];
  const v = lireFichier(base);
  for (const [k, texte] of v) {
    const [ch, ver] = k.split('|').map(Number);
    apocryphes.push({ trad_id: TR, livre: code, chapitre: ch, verset: ver, texte, notes: nom });
  }
}
const sansCreneau = lignes.filter((r) => !r.canon_id).length;
console.log(`canon      : ${lignes.length} versets · dont ${sansCreneau} sans créneau (${Math.round(sansCreneau / lignes.length * 100)} %)`);
console.log(`hors canon : ${apocryphes.length} versets · ${[...new Set(apocryphes.map((a) => a.livre))].join(' ')}`);
if (DRY) { console.log('\n(--dry : rien écrit)'); process.exit(0); }

await sb.from('traductions').upsert({
  trad_id: TR, nom: 'Septante de Swete', auteur: 'Henry Barclay Swete', dates: '1835-1917',
  langue: 'Grec', confession: 'Édition critique', ordre: 5, est_referent: false,
  date_publication: '1909-1912', schema_numerotation: 'grec',
  source_edition: 'The Old Testament in Greek according to the Septuagint, Cambridge University Press, 1909-1912',
  source_url: 'https://github.com/nathansmith/lxx-swete',
  bio_courte: "Bibliste anglais, professeur de théologie à Cambridge, Henry Barclay Swete donna de la Septante une édition critique qui fit longtemps autorité, fondée sur le Vaticanus et complétée par les autres grands onciaux.",
}, { onConflict: 'trad_id' });

await sb.from('editions_sources').insert({
  trad_id: TR,
  titre_edition: 'The Old Testament in Greek according to the Septuagint',
  traducteur: 'Édition critique de Henry Barclay Swete (1835-1917)',
  editeur: 'Cambridge University Press', annee_edition: '1909-1912', lieu_edition: 'Cambridge',
  langue: 'Grec ancien', confession: 'Édition critique, non confessionnelle',
  source_type: 'corpus numérique',
  source_nom: 'lxx-swete (Nathan D. Smith), d’après le First1KGreek de l’Open Greek and Latin Project',
  source_url: 'https://github.com/nathansmith/lxx-swete',
  licence: 'CC BY-SA 4.0 — attribution ET partage à l’identique. Le texte grec et ses annotations ne sont PAS dans le domaine public : toute publication doit citer la source et se placer sous la même licence.',
  graphie: 'Grec polytonique, capitales conservées aux incipits comme dans l’édition',
  date_extraction: new Date().toISOString().slice(0, 10),
  particularites: 'Un mot par ligne dans la source, réassemblé au verset. Esdras B recouvre Esdras (ch. 1-10) et Néhémie (ch. 11-23), scindé à l’import. Daniel, Suzanne et Bel existent en deux recensions : la version de Théodotion — celle que l’Église a reçue — est portée au canon, le vieux grec en apocryphes. Les versets sans créneau dans l’ossature restent sans créneau, jamais logés chez leur voisin.',
  integrite_verifiee: false,
});

await sb.from('versets_v2').delete().eq('trad_id', TR);
await sb.from('versets_apocryphes').delete().eq('trad_id', TR);
let n = 0;
for (let i = 0; i < lignes.length; i += 500) {
  const { error } = await sb.from('versets_v2').insert(lignes.slice(i, i + 500));
  if (error) { console.error('ERREUR', i, error.message); break; }
  n += Math.min(500, lignes.length - i);
}
console.log(`✓ ${n} versets en versets_v2`);
let m = 0;
for (let i = 0; i < apocryphes.length; i += 500) {
  const { error } = await sb.from('versets_apocryphes').insert(apocryphes.slice(i, i + 500));
  if (error) { console.error('ERREUR apocryphes', error.message); break; }
  m += Math.min(500, apocryphes.length - i);
}
console.log(`✓ ${m} versets en versets_apocryphes`);
process.exit(0);
