import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const OUT = 'audit/oeuvres-global-2026-07-30';
const audit = JSON.parse(readFileSync(`${OUT}/audit-global.json`, 'utf8'));
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const dossiers = [];
for (const work of audit.works) {
  const numbers = new Set([
    ...work.typography.mojibake,
    ...work.typography.replacement_character,
    ...work.typography.control_characters,
    ...work.typography.continuation_marker,
    ...work.typography.apostrophe_space,
    ...work.typography.hyphen_space,
    ...work.typography.note_after_closing_quote,
    ...work.typography.immediate_repeated_words.map((item) => item.segment_numero),
  ]);
  const rows = [];
  const list = [...numbers];
  for (let offset = 0; offset < list.length; offset += 100) {
    const { data, error } = await db.from('segments').select('id,segment_numero,segment_texte,nature,ref_niv1,ref_niv2,paragraphe,rang')
      .eq('id_oeuvre', work.id_oeuvre).in('segment_numero', list.slice(offset, offset + 100)).order('segment_numero');
    if (error) throw error;
    rows.push(...data);
  }
  const byNumber = new Map(rows.map((row) => [row.segment_numero, row]));
  dossiers.push({
    id_oeuvre: work.id_oeuvre, titre: work.titre,
    candidates: {
      mojibake: work.typography.mojibake.map((number) => byNumber.get(number)),
      replacement_character: work.typography.replacement_character.map((number) => byNumber.get(number)),
      control_characters: work.typography.control_characters.map((number) => byNumber.get(number)),
      continuation_marker: work.typography.continuation_marker.map((number) => byNumber.get(number)),
      apostrophe_space: work.typography.apostrophe_space.map((number) => byNumber.get(number)),
      hyphen_space: work.typography.hyphen_space.map((number) => byNumber.get(number)),
      note_after_closing_quote: work.typography.note_after_closing_quote.map((number) => byNumber.get(number)),
      immediate_repeated_words: work.typography.immediate_repeated_words.map((item) => ({ ...item, row: byNumber.get(item.segment_numero) })),
    },
    structural_summary: {
      missing_paragraph: work.structure.missing_paragraph.length,
      missing_rank: work.structure.missing_rank.length,
      paragraph_rank_errors: work.structure.paragraph_rank_errors.length,
      paragraph_rank_error_samples: work.structure.paragraph_rank_errors.slice(0, 12),
    },
  });
}
writeFileSync(`${OUT}/candidats-textuels-et-structurels.json`, `${JSON.stringify(dossiers, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(dossiers.filter((work) => Object.values(work.candidates).some((rows) => rows.length)).map((work) => ({ id: work.id_oeuvre, title: work.titre, counts: Object.fromEntries(Object.entries(work.candidates).map(([key, rows]) => [key, rows.length])) })), null, 2));
