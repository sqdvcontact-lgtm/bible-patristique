// Audit final en lecture seule de TR0004 à partir de l'export figé et de l'OSIS CrossWire.
import { readFileSync, writeFileSync } from 'node:fs';

const root = 'tmp/vulgate-preflight-2026-07-29';
const rows = JSON.parse(readFileSync(`${root}/TR0004-final-verified.json`, 'utf8'));
const osisBuffer = readFileSync(`${root}/source/VulgClementine-export.osis.xml`);
const osis = osisBuffer[0] === 0xff && osisBuffer[1] === 0xfe
  ? osisBuffer.subarray(2).toString('utf16le')
  : osisBuffer.toString('utf8').replace(/^\uFEFF/, '');

const books = {
  Gen:'GEN', Exod:'EXO', Lev:'LEV', Num:'NUM', Deut:'DEU', Josh:'JOS', Judg:'JDG', Ruth:'RUT',
  '1Sam':'1SA', '2Sam':'2SA', '1Kgs':'1KI', '2Kgs':'2KI', '1Chr':'1CH', '2Chr':'2CH', Ezra:'EZR', Neh:'NEH',
  Tob:'TOB', Jdt:'JDT', Esth:'EST', Job:'JOB', Ps:'PSA', Prov:'PRO', Eccl:'ECC', Song:'SNG', Wis:'WIS', Sir:'SIR',
  Isa:'ISA', Jer:'JER', Lam:'LAM', Bar:'BAR', Ezek:'EZK', Dan:'DAN', Hos:'HOS', Joel:'JOL', Amos:'AMO',
  Obad:'OBA', Jonah:'JON', Mic:'MIC', Nah:'NAM', Hab:'HAB', Zeph:'ZEP', Hag:'HAG', Zech:'ZEC', Mal:'MAL',
  '1Macc':'1MA', '2Macc':'2MA', Matt:'MAT', Mark:'MRK', Luke:'LUK', John:'JHN', Acts:'ACT', Rom:'ROM',
  '1Cor':'1CO', '2Cor':'2CO', Gal:'GAL', Eph:'EPH', Phil:'PHP', Col:'COL', '1Thess':'1TH', '2Thess':'2TH',
  '1Tim':'1TI', '2Tim':'2TI', Titus:'TIT', Phlm:'PHM', Heb:'HEB', Jas:'JAS', '1Pet':'1PE', '2Pet':'2PE',
  '1John':'1JN', '2John':'2JN', '3John':'3JN', Jude:'JUD', Rev:'REV',
};
const decode = (s) => s.replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>')
  .replaceAll('&quot;', '"').replaceAll('&apos;', "'");
const normalize = (s) => decode(String(s ?? '').replace(/<[^>]+>/g, ' '))
  .normalize('NFC').replace(/[\s\u00a0\u202f]+/g, ' ').replace(/\s+([:;!?])/g, ' $1').trim();
const source = new Map();
for (const m of osis.matchAll(/<verse\s+osisID="([^.]+)\.(\d+)\.(\d+)"[^>]*>([\s\S]*?)<\/verse>/g)) {
  const livre = books[m[1]];
  if (!livre) throw new Error(`Livre OSIS non mappé : ${m[1]}`);
  source.set(`${livre}.${Number(m[2])}.${Number(m[3])}`, normalize(m[4]));
}

const groups = new Map();
for (const row of rows) {
  const key = `${row.livre}.${row.ch_orig}.${row.v_orig}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(row);
}
const orderSourceFragments = (a, b) => String(a.v_orig_suffixe ?? '').localeCompare(String(b.v_orig_suffixe ?? ''), 'en');
const reconstructed = new Map([...groups].map(([key, group]) => [key, normalize([...group].sort(orderSourceFragments).map((r) => r.texte).join(' '))]));
const sourceMissingInDb = [...source.keys()].filter((key) => !groups.has(key));
const dbMissingInSource = [...groups.keys()].filter((key) => !source.has(key));
const textDifferences = [...source].filter(([key, text]) => reconstructed.get(key) !== text).map(([key, text]) => ({
  key, source: text, database: reconstructed.get(key),
}));

const splitGroups = [...groups].filter(([, group]) => group.length > 1);
const suffixViolations = splitGroups.filter(([, group]) => group.some((row) => row.v_orig_suffixe != null)).map(([key, group]) => ({
  key, rows: group.map((row) => ({ id: row.id, suffix: row.v_orig_suffixe, canon_id: row.canon_id, ordre_slot: row.ordre_slot })),
}));
const canonicalSlots = new Map();
for (const row of rows.filter((row) => row.canon_id)) {
  if (!canonicalSlots.has(row.canon_id)) canonicalSlots.set(row.canon_id, []);
  canonicalSlots.get(row.canon_id).push(row);
}
const rankErrors = [...canonicalSlots].filter(([, group]) => {
  const actual = group.map((row) => row.ordre_slot).sort((a, b) => a - b);
  return actual.some((rank, index) => rank !== index + 1);
});
const textChecks = {
  empty: rows.filter((r) => !String(r.texte ?? '').trim()).map((r) => r.id),
  replacement_character: rows.filter((r) => r.texte?.includes('\uFFFD')).map((r) => r.id),
  html: rows.filter((r) => /<[^>]+>/.test(r.texte ?? '')).map((r) => r.id),
  controls: rows.filter((r) => /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(r.texte ?? '')).map((r) => r.id),
  double_ascii_spaces: rows.filter((r) => / {2,}/.test(r.texte ?? '')).map((r) => r.id),
  leading_or_trailing_spaces: rows.filter((r) => r.texte !== r.texte?.trim()).map((r) => r.id),
  non_nfc: rows.filter((r) => r.texte !== r.texte?.normalize('NFC')).map((r) => r.id),
};

const report = {
  generated_at: new Date().toISOString(), mode: 'read_only',
  counts: {
    rows: rows.length, source_verses: source.size, native_reference_groups: groups.size,
    books: new Set(rows.map((r) => r.livre)).size,
    verified: rows.filter((r) => r.alignement_verifie).length,
    unverified: rows.filter((r) => !r.alignement_verifie).length,
    canonical: rows.filter((r) => r.canon_id).length,
    outside_canonical: rows.filter((r) => !r.canon_id).length,
    split_native_reference_groups: splitGroups.length,
    suffixed_rows: rows.filter((r) => r.v_orig_suffixe != null).length,
    subscriptions: rows.filter((r) => r.est_suscription).length,
  },
  integrity: {
    duplicate_ids: rows.length - new Set(rows.map((r) => r.id)).size,
    canon_id_fin: rows.filter((r) => r.canon_id_fin != null).length,
    source_missing_in_database: sourceMissingInDb.length,
    database_missing_in_source: dbMissingInSource.length,
    reconstructed_text_differences: textDifferences.length,
    rank_errors: rankErrors.length,
    text_checks: Object.fromEntries(Object.entries(textChecks).map(([key, value]) => [key, value.length])),
  },
  charter_findings: {
    invented_native_suffix_groups: suffixViolations.length,
    explanation: 'AGENTS.md impose que les fragments d’un même verset source conservent le même v_orig_suffixe. Les suffixes a/b/c/d actuellement employés pour distinguer les fragments sont donc non conformes.',
  },
  details: { sourceMissingInDb, dbMissingInSource, textDifferences, rankErrors, suffixViolations, textChecks },
};
writeFileSync(`${root}/AUDIT-FINAL-TR0004.json`, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ counts: report.counts, integrity: report.integrity, charter_findings: report.charter_findings }, null, 2));
