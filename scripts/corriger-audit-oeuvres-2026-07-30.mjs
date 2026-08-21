import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const ROOT = 'audit/oeuvres-global-2026-07-30';
const EMPTY_WORK_IDS = ['A0016O0001', 'A0044O0001', 'A0078O0001', 'A0015O0001'];
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const audit = JSON.parse(readFileSync(`${ROOT}/audit-global.json`, 'utf8'));

const must = async (query, label) => {
  const result = await query;
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result;
};

const { data: emptyWorks } = await must(
  db.from('oeuvres').select('*').in('id_oeuvre', EMPTY_WORK_IDS).order('id_oeuvre'),
  'lecture des œuvres à supprimer',
);
if (emptyWorks.length !== EMPTY_WORK_IDS.length) throw new Error('Une fiche à supprimer est absente : arrêt.');
if (emptyWorks.some((work) => work.date_mise_en_ligne != null)) throw new Error('Une fiche à supprimer est publiée : arrêt.');
const { count: emptyWorkSegments } = await must(
  db.from('segments').select('id', { count: 'exact', head: true }).in('id_oeuvre', EMPTY_WORK_IDS),
  'contrôle des segments des œuvres à supprimer',
);
if (emptyWorkSegments !== 0) throw new Error(`Les fiches à supprimer contiennent ${emptyWorkSegments} segment(s) : arrêt.`);

const candidateNumbers = new Map();
for (const work of audit.works) {
  const set = new Set([
    ...work.typography.apostrophe_space,
    ...work.typography.hyphen_space,
    ...work.typography.note_after_closing_quote,
  ]);
  if (set.size) candidateNumbers.set(work.id_oeuvre, set);
}

const candidateRows = [];
for (const [idOeuvre, numbers] of candidateNumbers) {
  const list = [...numbers];
  for (let offset = 0; offset < list.length; offset += 100) {
    const { data } = await must(
      db.from('segments').select('id,id_oeuvre,segment_numero,segment_texte,nature,ref_niv1,ref_niv2,paragraphe,rang')
        .eq('id_oeuvre', idOeuvre).in('segment_numero', list.slice(offset, offset + 100)),
      `lecture des candidats ${idOeuvre}`,
    );
    candidateRows.push(...data);
  }
}

const ELISIONS = new Set(['l', 'd', 'j', 'm', 'n', 's', 't', 'c', 'qu', 'jusqu', 'lorsqu', 'puisqu', 'quoiqu']);
const normalizeCertainTypography = (text) => text
  .replace(/\b([\p{L}]+)’ +(?=[\p{L}])/gu, (_match, word) => ELISIONS.has(word.toLocaleLowerCase('fr')) ? `${word}’` : `${word} `)
  .replace(/\b([\p{L}]+)- +(?=[\p{L}])/gu, (_match, word) => word.toLocaleLowerCase('fr') === 'aimer' ? `${word} ` : `${word}-`)
  .replace(/([\s\u00a0]*)([»”"])\s*\[\[(\d+)\]\]/gu, '[[$3]]$1$2');

const updatesById = new Map();
for (const row of candidateRows) {
  const next = normalizeCertainTypography(row.segment_texte);
  if (next !== row.segment_texte) updatesById.set(row.id, { ...row, next, reasons: ['typographie certaine'] });
}

const explicitCorrections = [
  { id_oeuvre: 'A0010O0004', segment_numero: 19264, old: 'pouf consommer', next: 'pour consommer', reason: 'OCR certain par parallélisme' },
  { id_oeuvre: 'A0010O0004', segment_numero: 25312, old: 'ce chai de Dieu', next: 'ce char de Dieu', reason: 'OCR certain' },
  { id_oeuvre: 'A0010O0004', segment_numero: 43485, old: 'de verset leurs eaux', next: 'de verser leurs eaux', reason: 'OCR certain' },
  { id_oeuvre: 'A0010O0004', segment_numero: 51926, old: 'c’est un autour mal réglé', next: 'c’est un amour mal réglé', reason: 'OCR certain' },
  { id_oeuvre: 'A0010O0002', segment_numero: 5969, old: 'par, la grâce', next: 'par la grâce', reason: 'virgule OCR parasite' },
  { id_oeuvre: 'A0013O0002', segment_numero: 8191, old: 'provient de que que transmutation', next: 'provient de quelque transmutation', reason: 'soudure OCR certaine' },
  { id_oeuvre: 'A0013O0002', segment_numero: 13432, old: 'la haine est est un péché', next: 'la haine est un péché', reason: 'mot répété' },
  { id_oeuvre: 'A0013O0002', segment_numero: 17283, old: 'd’avium inspection inspection des oiseaux', next: 'd’avium inspectio, inspection des oiseaux', reason: 'locution latine et mot répété' },
];
for (const correction of explicitCorrections) {
  const { data: row } = await must(
    db.from('segments').select('id,id_oeuvre,segment_numero,segment_texte,nature,ref_niv1,ref_niv2,paragraphe,rang')
      .eq('id_oeuvre', correction.id_oeuvre).eq('segment_numero', correction.segment_numero).single(),
    `lecture correction ${correction.id_oeuvre}/${correction.segment_numero}`,
  );
  const current = updatesById.get(row.id)?.next ?? row.segment_texte;
  if (!current.includes(correction.old)) throw new Error(`Texte attendu absent dans ${correction.id_oeuvre}/${correction.segment_numero} : arrêt.`);
  updatesById.set(row.id, {
    ...row,
    next: current.replace(correction.old, correction.next),
    reasons: [...(updatesById.get(row.id)?.reasons ?? []), correction.reason],
  });
}

const { data: antiocheIntroductions } = await must(
  db.from('segments').select('id,id_oeuvre,segment_numero,segment_texte,nature,ref_niv1,ref_niv2,paragraphe,rang')
    .eq('id_oeuvre', 'A0014O0038').eq('nature', 'introduction').order('segment_numero'),
  'lecture des introductions d’Antioche',
);
if (antiocheIntroductions.length !== 24 || antiocheIntroductions.some((row) => row.paragraphe != null || row.rang != null)) {
  throw new Error('État inattendu des 24 introductions d’Antioche : arrêt.');
}

const backup = {
  generated_at: new Date().toISOString(),
  mode: APPLY ? 'before_apply' : 'dry_run',
  empty_works: emptyWorks,
  empty_work_segment_count: emptyWorkSegments,
  text_updates: [...updatesById.values()].map(({ next, reasons, ...before }) => ({ before, after: next, reasons })),
  antioche_introductions: antiocheIntroductions,
};
mkdirSync(ROOT, { recursive: true });
const backupPath = `${ROOT}/${APPLY ? 'sauvegarde-avant-corrections' : 'simulation-corrections'}.json`;
writeFileSync(backupPath, `${JSON.stringify(backup, null, 2)}\n`, 'utf8');

if (!APPLY) {
  console.log(JSON.stringify({ mode: 'dry_run', backupPath, deleteWorks: emptyWorks.map((row) => row.id_oeuvre), textUpdates: updatesById.size, antiocheIntroductions: antiocheIntroductions.length }, null, 2));
  process.exit(0);
}

for (const row of updatesById.values()) {
  const { data } = await must(
    db.from('segments').update({ segment_texte: row.next }).eq('id', row.id).eq('segment_texte', row.segment_texte).select('id'),
    `mise à jour du segment ${row.id_oeuvre}/${row.segment_numero}`,
  );
  if (data.length !== 1) throw new Error(`Garde concurrente déclenchée pour ${row.id_oeuvre}/${row.segment_numero} : arrêt.`);
}

const antiocheIds = antiocheIntroductions.map((row) => row.id);
const { data: updatedIntroductions } = await must(
  db.from('segments').update({ paragraphe: 1, rang: 1 }).in('id', antiocheIds).is('paragraphe', null).is('rang', null).select('id'),
  'mise à jour des introductions d’Antioche',
);
if (updatedIntroductions.length !== 24) throw new Error(`Seulement ${updatedIntroductions.length}/24 introductions d’Antioche mises à jour.`);

// Même ordre que la route d’administration : les segments d’abord, puis la fiche.
await must(db.from('segments').delete().in('id_oeuvre', EMPTY_WORK_IDS), 'suppression préventive des segments vides');
const { data: deletedWorks } = await must(
  db.from('oeuvres').delete().in('id_oeuvre', EMPTY_WORK_IDS).select('id_oeuvre'),
  'suppression des quatre fiches vides',
);
if (deletedWorks.length !== 4) throw new Error(`Seulement ${deletedWorks.length}/4 fiches supprimées.`);

console.log(JSON.stringify({ mode: 'applied', backupPath, deletedWorks: deletedWorks.map((row) => row.id_oeuvre).sort(), textUpdates: updatesById.size, antiocheIntroductions: updatedIntroductions.length }, null, 2));
