import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve('tmp/ratramne-import-2026-07-29');
const EXPECTED = {
  'ratramne-segments-candidate.json': 'A4988A73F66AF33F0A8E65DF5AA124388E552C5C986848AB9258D739599583C3',
  'ratramne-alerts.json': '0DD0A28A4C88D3BA007704EF3ECAD8745FF3DC1E76DABBB26DB7C387E37ED12E',
};

const hash = (path) => createHash('sha256').update(readFileSync(path)).digest('hex').toUpperCase();

for (const [name, expected] of Object.entries(EXPECTED)) {
  const actual = hash(resolve(ROOT, name));
  if (actual !== expected) {
    throw new Error(`Visa de relecture invalide pour ${name}: attendu ${expected}, obtenu ${actual}`);
  }
}

const audit = JSON.parse(readFileSync(resolve(ROOT, 'ratramne-audit.json'), 'utf8'));
const failed = Object.entries(audit.invariants).filter(([, value]) => value !== true).map(([key]) => key);
if (failed.length) throw new Error(`Invariants en échec : ${failed.join(', ')}`);
if (audit.counts.segments !== 568 || audit.counts.bilingual_source_paragraphs !== 100) {
  throw new Error('Comptages structurels inattendus');
}
if (audit.counts.note_calls_candidate !== 184 || audit.counts.note_definitions_candidate !== 184) {
  throw new Error('Comptages de notes inattendus');
}

console.log(JSON.stringify({
  reviewed: true,
  candidate_sha256: EXPECTED['ratramne-segments-candidate.json'],
  alerts_sha256: EXPECTED['ratramne-alerts.json'],
  segments: audit.counts.segments,
  bilingual_paragraphs: audit.counts.bilingual_source_paragraphs,
  notes: audit.counts.note_calls_candidate,
  invariants: Object.keys(audit.invariants).length,
}, null, 2));
