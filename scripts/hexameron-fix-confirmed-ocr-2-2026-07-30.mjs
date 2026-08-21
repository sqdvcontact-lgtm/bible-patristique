import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const OEUVRE = 'A0017O0001';
const APPLY = process.argv.includes('--apply');
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const corrections = new Map([
  [46, [['ne peut atteigne', 'ne peut atteindre']]],
  [199, [['Les ténèbres, dit l’Écriture, courraient', 'Les ténèbres, dit l’Écriture, couvroient']]],
  [232, [['ne dépendent pas de nous', 'ne dépendoit pas de nous']]],
  [253, [
    ['elle approchait puis du sens', 'elle approchoit plus du sens'],
    ['ce sens énergique, échauffait et fécondoit', 'ce sens énergique, échauffoit et fécondoit'],
    ['d’une volatile qui couve', 'd’une volatille qui couve'],
  ]],
  [264, [['souillant l’huile de sa bouche', 'soufflant l’huile de sa bouche']]],
  [500, [['Mais ayant que cet ordre', 'Mais avant que cet ordre']]],
  [525, [['qu’elles étoient dispensées dans plusieurs', 'qu’elles étoient dispersées dans plusieurs']]],
  [545, [['sont contenais dans un espace', 'sont contenus dans un espace']]],
  [586, [['dans le calma le plus tranquille', 'dans le calme le plus tranquille']]],
  [814, [['El ne me dites pas', 'Et ne me dites pas']]],
  [1080, [['d’une grande et caste étendue', 'd’une grande et vaste étendue']]],
  [1110, [['disent-ils, lest peu profonde', 'disent-ils, est peu profonde']]],
  [1195, [['lorsqu’ayant ù vous plaindre de voire prochain', 'lorsqu’ayant à vous plaindre de votre prochain']]],
  [1250, [['la cire sur les Heurs', 'la cire sur les fleurs']]],
  [1335, [
    ['qu’éprouve cet animai', 'qu’éprouve cet animal'],
    ['prenez De là une idée', 'prenez de-là une idée'],
  ]],
  [1360, [['venu sans l’esprit', 'venu dans l’esprit']]],
  [1435, [
    ['On voit dans les bêles', 'On voit dans les bêtes'],
    ['Dieu qui les a créées à compensé', 'Dieu qui les a créées a compensé'],
  ]],
  [1548, [
    ['C’est pour pela', 'C’est pour cela'],
    ['disoit à Dieu La science', 'disoit à Dieu : La science'],
  ]],
  [1550, [['La science de notre nature', 'La science de votre nature']]],
  [1581, [['ni imité en puissance', 'ni limité en puissance']]],
  [1585, [['Le corps se toit', 'Le corps se voit']]],
  [1596, [
    ['Tout ce qui sous manque', 'Tout ce qui nous manque'],
    ['nous le possédions avec avantage', 'nous le possédons avec avantage'],
  ]],
  [1604, [['l’homme inférieur se renouvelle', 'l’homme intérieur se renouvelle']]],
  [1645, [['une prison ont les barreaux', 'une prison dont les barreaux']]],
  [1650, [['la raison de nomme', 'la raison de l’homme']]],
  [1654, [['celui qui traversent rapidement', 'celui qui traversoit rapidement']]],
  [1657, [
    ['N’avez-vous pas vit encore', 'N’avez-vous pas vu encore'],
    ['disposées à terre Ainsi', 'disposées à terre ? Ainsi'],
    ['les appâts que Monime apprête', 'les appâts que l’homme apprête'],
  ]],
  [1682, [['Être fait à sa ressemblance, tenait', 'Être fait à sa ressemblance, tenoit']]],
  [1687, [['comme faisait partie de notre substance', 'comme faisant partie de notre substance']]],
  [1691, [['par des mœurs sûres', 'par des mœurs pures']]],
  [1694, [['sur les bons et sur les médians', 'sur les bons et sur les méchans']]],
  [1712, [['Si vous considères la matière', 'Si vous considérez la matière']]],
  [1742, [['les regards que nous portons sur elles', 'les regards que nous portons sur elle']]],
  [1745, [['nos mains le louchent', 'nos mains le touchent']]],
  [1746, [
    ['dont vous ayez été formé', 'dont vous avez été formé'],
    ['des sentiments modestes', 'des sentimens modestes'],
    ['raccompagnent par honneur', 'l’accompagnent par honneur'],
    ['n’en soyez pas humilie', 'n’en soyez pas humilié'],
  ]],
  [1759, [['des qualités activée', 'des qualités actives']]],
  [1770, [['qui en effacer aient la beauté', 'qui en effaceroient la beauté']]],
  [1772, [['Un seul ne suffisait pas', 'Un seul ne suffisoit pas']]],
  [1780, [['la cristalloïde', 'la chrystalloïde']]],
  [1792, [['l’eau qui les mouillèrent', 'l’eau qui les mouilleroit']]],
]);

async function fetchAll() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('segments')
      .select('id,segment_numero,segment_texte').eq('id_oeuvre', OEUVRE)
      .order('segment_numero').range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

const before = await fetchAll();
const byNumber = new Map(before.map((row) => [row.segment_numero, row]));
const proposal = [];
for (const [segmentNumero, replacements] of corrections) {
  const row = byNumber.get(segmentNumero);
  if (!row) throw new Error(`Segment absent : ${segmentNumero}`);
  let after = row.segment_texte;
  for (const [needle, replacement] of replacements) {
    const occurrences = after.split(needle).length - 1;
    if (occurrences !== 1) throw new Error(`Garde segment ${segmentNumero} : ${JSON.stringify(needle)}, occurrence=${occurrences}`);
    after = after.replace(needle, replacement);
  }
  proposal.push({ id: row.id, segmentNumero, before: row.segment_texte, after });
}

console.log(JSON.stringify({ apply: APPLY, segments: proposal.length,
  remplacements: [...corrections.values()].reduce((total, rows) => total + rows.length, 0) }, null, 2));
if (!APPLY) process.exit(0);

for (const row of proposal) {
  const { data, error } = await db.from('segments').update({ segment_texte: row.after })
    .eq('id', row.id).eq('segment_texte', row.before).select('id');
  if (error) throw error;
  if (data.length !== 1) throw new Error(`Écriture segment ${row.segmentNumero} : ${data.length} ligne`);
}

const after = await fetchAll();
const afterByNumber = new Map(after.map((row) => [row.segment_numero, row]));
for (const row of proposal) {
  if (afterByNumber.get(row.segmentNumero)?.segment_texte !== row.after) {
    throw new Error(`Post-contrôle segment ${row.segmentNumero} échoué`);
  }
}
const hash = createHash('sha256').update(after
  .map((s) => `${s.id}\t${s.segment_numero}\t${s.segment_texte ?? ''}`).join('\n'), 'utf8')
  .digest('hex').toUpperCase();
console.log(JSON.stringify({ ok: true, segments: proposal.length, texte_hash: hash }, null, 2));
