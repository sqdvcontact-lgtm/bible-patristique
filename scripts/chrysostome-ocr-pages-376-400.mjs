import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(x => x && !x.startsWith('#')).map(x => {
  const i = x.indexOf('=');
  return [x.slice(0, i), x.slice(i + 1).replace(/^['"]|['"]$/g, '')];
}));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const apply = process.argv.includes('--apply');

const fixes = new Map([
  [2429, [['desincerité', 'de sincerité']]],
  [2421, [['de certams jours', 'de certains jours']]],
  [2431, [['tirer dũ profit', 'tirer du profit']]],
  [2433, [['il se faut\u00a0; entretenir', 'il se faut entretenir'], ['ce qu’il fautpenser', 'ce qu’il faut penser']]],
  [2435, [['un thresor mestimable', 'un thresor inestimable']]],
  [2442, [['glorifient votre Pere', 'glorifient vôtre Pere']]],
  [2445, [['aller a l’Eglise', 'aller à l’Eglise']]],
  [2446, [['vous allez a l’Eglise', 'vous allez à l’Eglise']]],
  [2448, [['par des troupes, de débauchez', 'par des troupes de débauchez']]],
  [2454, [['estimable en soy. &', 'estimable en soy, &'], ['veritablès richesses', 'veritables richesses']]],
  [2455, [['vous en fferez', 'vous en ferez']]],
  [2456, [['On votis dira', 'On vous dira'], ['discours si Chrêtient', 'discours si Chrêtiens']]],
  [2461, [['l’amour de la vertuz', 'l’amour de la vertu.'], ['j’ay eudu respect', 'j’ay eu du respect']]],
  [2464, [['un voifin dans', 'un voisin dans']]],
  [2467, [['le voicy\u00a0: De S. Jean Chrysostome. Ne contractez', 'le voicy\u00a0: Ne contractez']]],
  [2471, [['d’où viennent\u00a0: les immenses', 'd’où viennent les immenses'], ['fait a celuy-cy', 'fait à celuy-cy']]],
  [2472, [['celuyla qui croyoit', 'celuy-là qui croyoit']]],
  [2474, [['ou celle de vôtre prochain', 'ou celles de vôtre prochain'], ['envie a la bonne fortune', 'envie à la bonne fortune']]],
  [2476, [['rien delplus miserable', 'rien de plus miserable'], ['on s’affligeant', 'en s’affligeant'], ['de son\u00a0: prochain', 'de son prochain']]],
  [2477, [['de grands\u00a0:', 'de grands']]],
  [2480, [['Car s’ilaccorde', 'Car s’il accorde'], ['d’un verre\u00a0: d’eau', 'd’un verre d’eau'], ['leurs passiõs', 'leurs passions']]],
  [2482, [['nos chaus, sures', 'nos chaussures']]],
  [2483, [['licence effrenće', 'licence effrenée']]],
  [2484, [['demarche de Eccles l’homme', 'demarche de l’homme']]],
  [2488, [['rapporter a Dieu', 'rapporter à Dieu']]],
  [2489, [['pouvonsnous', 'pouvons-nous'], ['nos chaulsures', 'nos chaussures']]],
  [2501, [["jusqu’a nos ventes", 'jusqu’à nos ventes']]],
  [2503, [['Comme a tous momens', 'Comme à tous momens']]],
  [2510, [['vousmêmes', 'vous-mêmes']]],
  [2511, [['vanité, lambition', 'vanité, l’ambition']]],
  [2512, [['Peut, on assez', 'Peut-on assez']]],
  [2519, [['tant de lumicres', 'tant de lumieres']]],
  [2520, [['vos esclaues', 'vos esclaves']]],
  [2522, [['je vous enfeigneray', 'je vous enseigneray'], ['point étre distrait', 'point être distrait']]],
  [2523, [['ont eté établies', 'ont esté établies']]],
  [2533, [['c’est celuylà', 'c’est celuy-là']]],
  [2535, [['Tous ces genslà', 'Tous ces gens-là']]],
  [2536, [['des negiigences', 'des negligences'], ['cette expiaciòn Judaïque', 'cette expiation Judaïque'], ["n’ôtoit pas, les crimes", "n’ôtoit pas les crimes"]]],
  [2542, [['avez vous esté', 'avez-vous esté']]],
  [2547, [['le Seigneur exemt', 'le Seigneur exempt']]],
  [2548, [['de saint Jean Pourquoy', 'de saint Jean. Pourquoy']]],
  [2550, [['au lourdain', 'au Iourdain'], ['les peuples a faire', 'les peuples à faire']]],
  [2557, [['plûtost qne celle', 'plûtost que celle']]],
  [2558, [['c’est celuy. là', 'c’est celuy-là']]],
  [2564, [['ont justisie Dieu', 'ont justifié Dieu']]],
  [2566, [['cette dete', 'cette dette']]],
  [2572, [['courent a cette table', 'courent à cette table'], ["d’égard a la pureté", "d’égard à la pureté"]]],
  [2573, [['a nettoye nettoyé ses forfaits', 'a nettoyé ses forfaits']]],
]);

const { data, error } = await supabase.from('segments').select('id,segment_numero,segment_texte').eq('id_oeuvre', 'A0014O0038').gte('segment_numero', 2421).lte('segment_numero', 2573).order('segment_numero');
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
