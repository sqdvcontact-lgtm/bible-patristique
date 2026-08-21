// Extrait les 82 frontières titre/corps du Psautier depuis l'export OSIS officiel,
// puis les vérifie contre les lignes TR0004 vivantes. Lecture seule de Supabase.
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const bundleDir = process.argv[2] ?? 'tmp/vulgate-preflight-2026-07-29/bundle';
const osisPath = process.argv[3] ?? 'tmp/vulgate-preflight-2026-07-29/source/VulgClementine-export.osis.xml';
const outputPath = process.argv[4] ?? 'tmp/vulgate-preflight-2026-07-29/psalm-title-actions.json';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(line => line && !line.startsWith('#')).map(line => {
  const i = line.indexOf('=');
  return [line.slice(0, i), line.slice(i + 1).replace(/^['"]|['"]$/g, '')];
}));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const package5a = JSON.parse(readFileSync(`${bundleDir}/vulgate_actions_round5a_psalm_titles_2026-07-28.json`, 'utf8'));
const osisBuffer = readFileSync(osisPath);
const osis = osisBuffer[0] === 0xff && osisBuffer[1] === 0xfe
  ? osisBuffer.subarray(2).toString('utf16le')
  : osisBuffer.toString('utf8');
const decode = value => value.replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&apos;', "'");
const plain = value => decode(value.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const comparable = value => String(value).replaceAll('\u00a0', ' ').replace(/\s+/g, ' ').trim();

const { data: rows, error } = await supabase.from('versets_v2').select('id,ch_orig,v_orig,texte,canon_id,canon_id_fin,v_orig_suffixe,est_suscription').eq('trad_id', 'TR0004').eq('livre', 'PSA').eq('v_orig', 1).order('ch_orig');
if (error) throw error;
const byPsalm = new Map(rows.map(row => [row.ch_orig, row]));
const actions = [];
for (const psalm of package5a.inventory.mixed_title_and_body_psalms) {
  const match = osis.match(new RegExp(`<verse osisID="Ps\\.${psalm}\\.1">([\\s\\S]*?)<\\/verse>`));
  if (!match) throw new Error(`Ps ${psalm}: verset OSIS introuvable`);
  const raw = match[1];
  const boundary = raw.search(/<div\s+eID=/);
  if (boundary < 0) throw new Error(`Ps ${psalm}: frontière OSIS <div eID> introuvable`);
  const titleExpected = plain(raw.slice(0, boundary));
  const bodyExpected = plain(raw.slice(boundary));
  const row = byPsalm.get(psalm);
  if (!row) throw new Error(`Ps ${psalm}: ligne vivante v_orig=1 introuvable`);
  const live = row.texte;
  const liveComparable = comparable(live);
  const titleComparable = comparable(titleExpected);
  const bodyComparable = comparable(bodyExpected);
  if (!liveComparable.startsWith(`${titleComparable} `)) throw new Error(`Ps ${psalm}: titre OSIS non reconnu au début de la ligne`);
  if (!liveComparable.endsWith(bodyComparable)) throw new Error(`Ps ${psalm}: corps OSIS non reconnu à la fin de la ligne`);
  let splitAt = titleExpected.length;
  if (comparable(live.slice(0, splitAt)) !== titleComparable) {
    splitAt = live.indexOf(bodyExpected);
    if (splitAt < 0) {
      const firstBodyWords = bodyComparable.split(' ').slice(0, 5).join(' ');
      splitAt = comparable(live).indexOf(firstBodyWords);
    }
  }
  while (splitAt < live.length && /\s/.test(live[splitAt])) splitAt++;
  const titleText = live.slice(0, splitAt).trimEnd();
  const bodyText = live.slice(splitAt);
  if (comparable(titleText) !== titleComparable || comparable(bodyText) !== bodyComparable) throw new Error(`Ps ${psalm}: coupe vivante non recomposable`);
  if (`${titleText} ${bodyText}` !== live) throw new Error(`Ps ${psalm}: recomposition exacte impossible`);
  actions.push({
    action_id: `PSA${psalm}-TITLE-BODY`, existing_uuid: row.id, ch_orig: psalm, v_orig: 1,
    current_canon: row.canon_id, title_text: titleText, body_text: bodyText,
    split_marker: bodyText.split(/\s+/).slice(0, 8).join(' '), first_suffix: 'a', second_suffix: 'b',
    existing_uuid_kept_on: 'body', new_uuid_for: 'title', recomposition_rule: "title_text + ' ' + body_text = original texte",
  });
}
if (actions.length !== 82) throw new Error(`82 actions attendues, ${actions.length}`);
writeFileSync(outputPath, JSON.stringify({ source: { module: 'VulgClementine', version: '2.0.1', osis_export: osisPath }, actions }, null, 2));
console.log(JSON.stringify({ actions: actions.length, first: actions[0], last: actions.at(-1), output: outputPath }, null, 2));
