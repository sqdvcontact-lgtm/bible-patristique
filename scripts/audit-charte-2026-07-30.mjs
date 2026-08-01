import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const OUT = 'audit/charte-2026-07-30';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data, error } = await db.from('parametres').select('valeur,mis_a_jour').eq('cle', 'charte_ia').single();
if (error) throw error;
const text = data.valeur;
const lines = text.split(/\r?\n/);
const headings = lines.flatMap((line, index) => {
  const match = line.match(/^(#{1,6})\s+(.+)$/);
  return match ? [{ line: index + 1, level: match[1].length, title: match[2] }] : [];
});
const exactHeadingGroups = Object.entries(Object.groupBy(headings, (heading) => heading.title))
  .filter(([, group]) => group.length > 1).map(([title, group]) => ({ title, lines: group.map((item) => item.line) }));
const numbered = headings.flatMap((heading) => {
  const match = heading.title.match(/^(?:§\s*)?(\d+(?:\.\d+)*)(?:\.?\s|\s*[—–-])/);
  return match ? [{ ...heading, number: match[1] }] : [];
});
const duplicateNumbers = Object.entries(Object.groupBy(numbered, (heading) => heading.number))
  .filter(([, group]) => group.length > 1).map(([number, group]) => ({ number, headings: group }));
const paragraphs = text.split(/\n\s*\n/).map((paragraph, index) => ({ index, text: paragraph.trim() })).filter((item) => item.text.length >= 140);
const duplicateParagraphs = Object.entries(Object.groupBy(paragraphs, (paragraph) => paragraph.text.replace(/\s+/g, ' ')))
  .filter(([, group]) => group.length > 1).map(([paragraph, group]) => ({ count: group.length, sample: paragraph.slice(0, 400), indexes: group.map((item) => item.index) }));
const lineMatches = (regex) => lines.flatMap((line, index) => regex.test(line) ? [{ line: index + 1, text: line }] : []);
const deletedWorkIds = ['A0015O0001', 'A0016O0001', 'A0044O0001', 'A0078O0001'];
const result = {
  generated_at: new Date().toISOString(),
  source_updated_at: data.mis_a_jour,
  length: text.length,
  lines: lines.length,
  sha256: createHash('sha256').update(text).digest('hex'),
  headings: { count: headings.length, exact_duplicates: exactHeadingGroups, duplicate_numbers: duplicateNumbers },
  formatting: {
    replacement_character: lineMatches(/�/u),
    suspicious_mojibake: lineMatches(/(?:Ã[\u0080-\u00ff]|Â(?=[\u0080-\u00bf\s«»])|â[€\u0080-\u00bf]|ðŸ)/u),
    literal_newline_escape: lineMatches(/\\[nr]/u),
    question_mark_inside_word: lineMatches(/[\p{L}]\?[\p{L}]/u),
    headings_over_180_chars: headings.filter((heading) => heading.title.length > 180),
  },
  duplicates: { paragraphs: duplicateParagraphs },
  stale_references: {
    deleted_works: Object.fromEntries(deletedWorkIds.map((id) => [id, lineMatches(new RegExp(id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'u'))])),
    large_numeric_snapshots: lineMatches(/\b1\d{5,}\b/u),
  },
  key_phrases: {
    group_by_paragraph_only: lineMatches(/regroupe par `paragraphe`/u),
    composite_key: lineMatches(/Clé de regroupement à l’affichage/u),
    introduction_nature: lineMatches(/Nature « introduction »/u),
    nature_lists: lineMatches(/Natures\.|NATURE_VALIDES|natures? (?:autorisées|valides|de segment)/iu),
    verified_ai_prohibition: lineMatches(/(?:IA|passe (?:automatique|mécanique)).{0,80}(?:jamais|interdit).{0,30}`vérifié`|`vérifié`.{0,80}(?:IA|automatique|mécanique)/iu),
    random_checks: lineMatches(/contrôles? aléatoires?|tirer quelques lignes|sondages? répartis/iu),
  },
};
mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/charte-active.md`, text, 'utf8');
writeFileSync(`${OUT}/audit-structure.json`, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ out: OUT, length: result.length, lines: result.lines, headings: result.headings.count, exactHeadingDuplicates: exactHeadingGroups.length, duplicateNumbers: duplicateNumbers.length, literalEscapes: result.formatting.literal_newline_escape.length, questionMarksInsideWords: result.formatting.question_mark_inside_word.length, longHeadings: result.formatting.headings_over_180_chars.length, duplicateParagraphs: duplicateParagraphs.length }, null, 2));
await db.removeAllChannels();
