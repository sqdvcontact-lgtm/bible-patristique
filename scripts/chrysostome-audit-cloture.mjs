import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { corrigerTypographie } from './typographie.mjs';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(x => x && !x.startsWith('#')).map(x => {
  const i = x.indexOf('=');
  return [x.slice(0, i), x.slice(i + 1).replace(/^['"]|['"]$/g, '')];
}));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const rows = [];
for (let start = 0; ; start += 1000) {
  const { data, error } = await supabase.from('segments').select('*').eq('id_oeuvre', 'A0014O0038').order('segment_numero').range(start, start + 999);
  if (error) throw error;
  rows.push(...data);
  if (data.length < 1000) break;
}

const tests = [
  ['mojibake', /[ÃÂ�]/],
  ['caractère de remplacement', /�/],
  ['mot immédiatement répété', /\b([A-Za-zÀ-ÿœŒ]{2,})\s+\1\b/i],
  ['espace avant virgule', /\s+,/],
  ['noms divins soudés', /JesusChrist|SaintEsprit|NôtreSeigneur/i],
  ['I/J mal lu devant C.', /\b[Il]\. C\./],
  ['marqueur de note', /\[\[[A-Za-z]*\d+\]\]/],
];

console.log(`segments=${rows.length}`);
console.log(`sequence=${rows.every((row, i) => row.segment_numero === i + 1)}`);
console.log(`vides_texte=${rows.filter(row => !String(row.segment_texte ?? '').trim()).length}`);
console.log(`vides_niv1=${rows.filter(row => !row.ref_niv1).length}`);
console.log(`vides_niv2=${rows.filter(row => !row.ref_niv2).length}`);
console.log(`vides_paragraphe=${rows.filter(row => row.paragraphe == null).length}`);
console.log(`vides_rang=${rows.filter(row => row.rang == null).length}`);
for (const [name, regex] of tests) {
  const hits = rows.filter(row => regex.test(row.segment_texte));
  console.log(`${name}=${hits.length}${hits.length ? ` (${hits.map(row => `S${row.segment_numero}`).join(',')})` : ''}`);
  if (name === 'mot immédiatement répété') for (const row of hits) {
    const match = row.segment_texte.match(regex);
    const at = match?.index ?? 0;
    console.log(`  S${row.segment_numero}: ${row.segment_texte.slice(Math.max(0, at - 35), at + (match?.[0].length ?? 0) + 35)}`);
  }
}
const typographie = rows.map(row => ({ row, texte: corrigerTypographie(row.segment_texte) })).filter(item => item.texte !== item.row.segment_texte);
console.log(`typographie_residuelle=${typographie.length}`);
for (const { row, texte } of typographie) console.log(`  S${row.segment_numero}\n  - ${row.segment_texte}\n  + ${texte}`);
const unusual = /[ãõñòìũĩ]/i;
const unusualRows = rows.filter(row => unusual.test(row.segment_texte));
console.log(`caracteres_suspects=${unusualRows.length} (${unusualRows.map(row => `S${row.segment_numero}`).join(',')})`);
for (const row of unusualRows) console.log(`  S${row.segment_numero}: ${row.segment_texte}`);

const keys = value => [...String(value ?? '').matchAll(/\[\[([A-Za-z0-9]+)\]\]/g)].map(match => match[1]);
const calls = rows.flatMap(row => keys(row.segment_texte).map(key => ({ key, segment: row.segment_numero })));
const definitions = rows.flatMap(row => keys(row.notes).map(key => ({ key, segment: row.segment_numero })));
const callKeys = new Set(calls.map(item => item.key));
const definitionKeys = new Set(definitions.map(item => item.key));
const missingDefinitions = calls.filter(item => !definitionKeys.has(item.key));
const orphanDefinitions = definitions.filter(item => !callKeys.has(item.key));
const duplicateCalls = [...callKeys].filter(key => calls.filter(item => item.key === key).length > 1);
const duplicateDefinitions = [...definitionKeys].filter(key => definitions.filter(item => item.key === key).length > 1);
console.log(`notes_appels=${calls.length} notes_definitions=${definitions.length}`);
console.log(`notes_sans_definition=${missingDefinitions.length} definitions_sans_appel=${orphanDefinitions.length}`);
console.log(`appels_dupliques=${duplicateCalls.length} definitions_dupliquees=${duplicateDefinitions.length}`);
if (duplicateCalls.length) console.log(`cles_dupliquees=${duplicateCalls.map(key => `${key}:appels(${calls.filter(item => item.key === key).map(item => `S${item.segment}`).join(',')})/definitions(${definitions.filter(item => item.key === key).map(item => `S${item.segment}`).join(',')})`).join(' ; ')}`);

const segmentIds = rows.map(row => row.id);
const links = [];
for (let start = 0; start < segmentIds.length; start += 300) {
  const { data, error } = await supabase.from('liens_bibliques').select('id,segment_id,canon_id,livre,chapitre,type,fiabilite,provenance').in('segment_id', segmentIds.slice(start, start + 300));
  if (error) throw error;
  links.push(...data);
}
const linkTypes = Object.fromEntries([1, 2, 3, 4].map(type => [type, links.filter(link => link.type === type).length]));
const linkReliability = Object.fromEntries([...new Set(links.map(link => link.fiabilite))].sort().map(value => [value, links.filter(link => link.fiabilite === value).length]));
const invalidLinks = links.filter(link => ![1, 2, 3, 4].includes(link.type) || (link.fiabilite !== 'à constituer' && !link.canon_id && !(link.livre && link.chapitre)));
console.log(`liens=${links.length} types=${JSON.stringify(linkTypes)} fiabilites=${JSON.stringify(linkReliability)}`);
console.log(`liens_structure_invalide=${invalidLinks.length}`);

const { data: oeuvre, error: oeuvreError } = await supabase.from('oeuvres').select('*').eq('id_oeuvre', 'A0014O0038').maybeSingle();
console.log(`notice=${oeuvreError ? `ERREUR ${oeuvreError.message}` : JSON.stringify(oeuvre)}`);
