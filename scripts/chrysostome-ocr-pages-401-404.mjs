import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(x => x && !x.startsWith('#')).map(x => {
  const i = x.indexOf('=');
  return [x.slice(0, i), x.slice(i + 1).replace(/^['"]|['"]$/g, '')];
}));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const apply = process.argv.includes('--apply');

const fixes = new Map([
  [2575, [['un desordre ou vous tombez', 'un desordre où vous tombez']]],
  [2580, [['deroit-ce de l’estat', 'seroit-ce de l’estat']]],
  [2581, [['vous étes au milieu', 'vous êtes au milieu'], ['Aussi l. C. nous donne', 'Aussi J. C. nous donne']]],
  [2584, [['A quoy pensezvous', 'À quoy pensez-vous']]],
  [2586, [['m’oblige a ne le pas taire', 'm’oblige à ne le pas taire']]],
  [2588, [['le loup, le devora', 'le loup le devora']]],
]);

const { data, error } = await supabase.from('segments').select('id,segment_numero,segment_texte').eq('id_oeuvre', 'A0014O0038').gte('segment_numero', 2573).lte('segment_numero', 2594).order('segment_numero');
if (error) throw error;
let corrections = 0;
const updates = [];
for (const row of data) {
  const rowFixes = fixes.get(row.segment_numero);
  if (!rowFixes) continue;
  let text = row.segment_texte;
  for (const [before, after] of rowFixes) {
    if (text.includes(after)) continue;
    if (text.includes(before)) {
      text = text.replace(before, after);
      corrections++;
      continue;
    }
    throw new Error(`S${row.segment_numero}: motif absent: ${before}`);
  }
  if (text !== row.segment_texte) updates.push({ id: row.id, segment_numero: row.segment_numero, segment_texte: text });
}
console.log(JSON.stringify({ apply, corrections, segments: updates.length }, null, 2));
if (apply) {
  for (const update of updates) {
    const { error: updateError } = await supabase.from('segments').update({ segment_texte: update.segment_texte }).eq('id', update.id);
    if (updateError) throw updateError;
    console.log(`S${update.segment_numero}`);
  }
}
