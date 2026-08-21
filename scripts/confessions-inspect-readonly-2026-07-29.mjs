import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8')
  .split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
  .filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const must = async (query, label) => {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
};

const out = 'tmp/confessions-import-2026-07-29';
mkdirSync(out, { recursive: true });
const parameters = await must(db.from('parametres').select('cle,valeur').in('cle', ['charte_ia', 'feedback_liens_protocole']), 'parametres');
for (const row of parameters) writeFileSync(`${out}/${row.cle}.md`, String(row.valeur ?? ''), 'utf8');
const charte = String(parameters.find((row) => row.cle === 'charte_ia')?.valeur ?? '');
const headings = [...charte.matchAll(/^#{1,6}\s+([^\r\n]+)/gm)].map((match) => ({ index: match.index, title: match[1] }));
const wanted = /^(?:2|3|5|6|7|12|22|23)(?:\.|\b)/;
const sections = headings
  .map((heading, index) => ({ ...heading, end: headings[index + 1]?.index ?? charte.length }))
  .filter((heading) => wanted.test(heading.title))
  .map((heading) => charte.slice(heading.index, heading.end).trim());

const [authors, matchingWorks, augustineWorks, ratramne, introductions, apparatus, notices, targetNotice, targetSegments] = await Promise.all([
  must(db.from('auteurs').select('*').ilike('nom', '%Augustin%'), 'auteurs Augustin'),
  must(db.from('oeuvres').select('*').ilike('titre', '%Confession%'), 'oeuvres Confessions'),
  must(db.from('oeuvres').select('*').like('id_oeuvre', 'A0010O%').order('id_oeuvre'), 'oeuvres A0010'),
  must(db.from('oeuvres').select('*').eq('id_oeuvre', 'A0091O0001'), 'oeuvre Ratramne'),
  must(db.from('segments').select('*').eq('id_oeuvre', 'A0091O0001').eq('nature', 'introduction').order('segment_numero').limit(8), 'introductions Ratramne'),
  must(db.from('segments').select('*').eq('id_oeuvre', 'A0091O0001').eq('nature', 'apparat_critique').order('segment_numero').limit(8), 'apparat Ratramne'),
  must(db.from('catalogue_notices').select('*').limit(5000), 'notices'),
  must(db.from('catalogue_notices').select('*').eq('id', 2), 'notice cible'),
  must(db.from('segments').select('id,segment_numero', { count: 'exact' }).eq('id_oeuvre', 'A0010O0001').order('segment_numero').range(0, 4), 'segments cible'),
]);

const result = {
  charte_chars: charte.length,
  sections,
  authors,
  matchingWorks,
  augustineWorks,
  ratramne,
  introductions,
  apparatus,
  notices: notices.filter((row) => JSON.stringify(row).toLocaleLowerCase('fr').includes('confession')),
  targetNotice,
  targetSegments,
};
writeFileSync(`${out}/inspection.json`, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(result, null, 2));
