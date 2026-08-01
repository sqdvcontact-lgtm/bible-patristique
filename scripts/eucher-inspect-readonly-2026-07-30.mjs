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
  const { data, error, count } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return { data, count };
};

const out = 'tmp/eucher-import-2026-07-30';
mkdirSync(out, { recursive: true });
const [parameters, authors, titleWorks, authorWorks, notices, noticeSample, workSample, segmentSample] = await Promise.all([
  must(db.from('parametres').select('cle,valeur').in('cle', ['charte_ia', 'feedback_liens_protocole']), 'parametres'),
  must(db.from('auteurs').select('*').or('nom.ilike.%Eucher%,nom.ilike.%Eucheri%').order('id_auteur'), 'auteurs Eucher'),
  must(db.from('oeuvres').select('*').or('titre.ilike.%mépris du monde%,titre.ilike.%mepris du monde%').order('id_oeuvre'), 'œuvres titre'),
  must(db.from('oeuvres').select('*').eq('id_auteur', 'A0418').order('id_oeuvre'), 'œuvres auteur'),
  must(db.from('catalogue_notices').select('*').limit(5000), 'notices'),
  must(db.from('catalogue_notices').select('*').order('id', { ascending: false }).limit(5), 'échantillon notices'),
  must(db.from('oeuvres').select('*').order('id_oeuvre', { ascending: false }).limit(3), 'échantillon œuvres'),
  must(db.from('segments').select('*').order('id', { ascending: false }).limit(1), 'échantillon segments'),
]);

const charte = String(parameters.data.find((row) => row.cle === 'charte_ia')?.valeur ?? '');
writeFileSync(`${out}/charte_ia.md`, charte, 'utf8');
writeFileSync(`${out}/feedback_liens_protocole.md`, String(parameters.data.find((row) => row.cle === 'feedback_liens_protocole')?.valeur ?? ''), 'utf8');
const result = {
  charte_chars: charte.length,
  authors: authors.data,
  title_works: titleWorks.data,
  author_works: authorWorks.data,
  notices: notices.data.filter((row) => /eucher|mépris du monde|mepris du monde/i.test(JSON.stringify(row))),
  notice_columns: Object.keys(noticeSample.data[0] ?? {}),
  notice_sample: noticeSample.data,
  work_columns: Object.keys(workSample.data[0] ?? {}),
  segment_columns: Object.keys(segmentSample.data[0] ?? {}),
  work_sample: workSample.data,
};
writeFileSync(`${out}/inspection.json`, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(result, null, 2));
