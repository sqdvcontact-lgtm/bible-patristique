import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(x => x && !x.startsWith('#')).map(x => { const i = x.indexOf('='); return [x.slice(0, i), x.slice(i + 1).replace(/^['\"]|['\"]$/g, '')]; }));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const apply = process.argv.includes('--apply');

const fixes = new Map([
  [576, [['que sut des liens', 'que sur des liens']]],
  [582, [['l’on décornast', 'l’on ordonnast']]],
  [588, [['tout lUnivers', 'tout l’Univers']]],
  [589, [['proclamoit a haute', 'proclamoit à haute']]],
  [590, [['combat qu on apprête', 'combat qu’on apprête']]],
  [595, [['ne sommesnous pas', 'ne sommes-nous pas']]],
  [597, [['contreux', 'contr’eux']]],
  [601, [['l’assûtance', 'l’assûrance']]],
  [602, [['graces a Dieu', 'graces à Dieu']]],
  [604, [['; fans cela', '; sans cela']]],
  [609, [['Et comme lors L iij qu’on coupe', 'Et comme lors qu’on coupe']]],
  [611, [['en nousmêmes', 'en nous-mêmes'], ['d’iniquite', 'd’iniquité']]],
  [613, [['glaive trenchant', 'glaive tranchant'], ['pour[[105]]. la mort', 'pour[[105]] la mort']]],
  [618, [['priant qu on', 'priant qu’on']]],
  [620, [['à furpasser', 'à surpasser']]],
  [622, [['ce poinct la reformation', 'ce poinct la reformation']]],
  [623, [['la semainé', 'la semaine']]],
  [629, [['le sieu faneux', 'le lieu fameux'], ['fouffroit ses maux', 'souffroit ses maux']]],
  [632, [['horreur a luy-même', 'horreur à luy-même']]],
  [634, [['d’éclat-que', 'd’éclat que']]],
  [635, [['ne fervoit Dieu', 'ne servoit Dieu']]],
  [637, [['Voila comme L’indigence', 'Voila comme l’indigence']]],
  [638, [['ils fe tiennent', 'ils se tiennent'], ['tout souvert de blessures', 'tout couvert de blessures']]],
  [640, [['; M ij mais', '; mais']]],
  [641, [['; jay relevé', '; j’ay relevé']]],
  [644, [['javouë', 'j’avouë'], ['servit a Job', 'servit à Job']]],
  [645, [['ce saim Homme', 'ce saint Homme']]],
  [646, [['vousesoyez', 'vous soyez']]],
  [651, [['Er pourquoy', 'Et pourquoy']]],
  [654, [['&. qu’aprés', '& qu’aprés'], ['n’est-il pas yray', 'n’est-il pas vray']]],
  [655, [['pensées pour : le ciel', 'pensées pour le ciel']]],
  [656, [['monfrere', 'mon frere']]],
  [657, [['de sop travail', 'de son travail']]],
  [658, [['exemple : &II. Soyez', 'exemple : Soyez']]],
  [663, [['d’ou vient', 'd’où vient'], ['S. Jean glo-Marc é. rieuse', 'S. Jean glorieuse']]],
  [671, [['Quel présudice', 'Quel préjudice']]],
  [673, [['criminels, font admis', 'criminels, sont admis']]],
  [675, [['Abel touffrit', 'Abel souffrit']]],
  [676, [['survêcut a la verité', 'survêcut à la verité']]],
  [678, [['lieu d’épouvente', 'lieu d’épouvante']]],
  [679, [['n y trouveroit', 'n’y trouveroit'], ['l’êtat prsent', 'l’état present']]],
  [681, [['du cnme de LezeMajesté', 'du crime de Leze-Majesté']]],
  [683, [['& éviterez, les flâmes', '& éviterez les flâmes']]],
  [687, [['Qu’estce que la mort', 'Qu’est-ce que la mort']]],
  [688, [['l’un n est pas', 'l’un n’est pas']]],
  [690, [['qu’estce qui', 'qu’est-ce qui']]],
  [695, [['ne le se, ra pas', 'ne le sera pas'], ['qu’a laver', 'qu’à laver']]],
  [696, [['d’en adoucir. l’amertume', 'd’en adoucir l’amertume']]],
]);

const { data, error } = await sb.from('segments').select('id,segment_numero,segment_texte').eq('id_oeuvre', 'A0014O0038').gte('segment_numero', 539).lte('segment_numero', 699).order('segment_numero');
if (error) throw error;
let corrections = 0; const updates = [];
for (const row of data) {
  const fs = fixes.get(row.segment_numero); if (!fs) continue;
  let text = row.segment_texte;
  for (const [from, to] of fs) {
    if (text.includes(from) && !to.includes(from)) { text = text.replace(from, to); corrections++; continue; }
    if (text.includes(to)) continue;
    throw new Error(`S${row.segment_numero}: motif absent: ${from}`);
  }
  if (text !== row.segment_texte) updates.push({ id: row.id, segment_numero: row.segment_numero, segment_texte: text });
}
console.log(JSON.stringify({ apply, corrections, segments: updates.length }, null, 2));
if (apply) for (const u of updates) { const { error: e } = await sb.from('segments').update({ segment_texte: u.segment_texte }).eq('id', u.id); if (e) throw e; console.log(`S${u.segment_numero}`); }
