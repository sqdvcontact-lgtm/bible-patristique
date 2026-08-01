import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const OEUVRE = 'A0017O0001';
const APPLY = process.argv.includes('--apply');
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const corrections = [
  [92, 'les rayons du soleil réchauffent', 'les rayons du soleil l’échauffent'],
  [144, 'pour Fart et la sagesse', 'pour l’art et la sagesse'],
  [297, 'ce court période s’achève dans espace d’un jour', 'cette courte période s’achève dans l’espace d’un jour'],
  [443, 'Tel est encore ce passage Ils montent jusqu’aux deux.', 'Tel est encore ce passage : Ils montent jusqu’aux cieux.'],
  [458, 'C’est pour cela, disent-il,', 'C’est pour cela, disent-ils,'],
  [785, 'la douleur devoir ceux qui m’écoutent ne point profiter démon instruction', 'la douleur de voir ceux qui m’écoutent ne point profiter de mon instruction'],
  [841, 'l’air chargé de vapeurs ou tirant à nos yeux', 'l’air chargé de vapeurs offrant à nos yeux'],
  [874, 'ces prétendus sa-vans', 'ces prétendus savans'],
  [907, 'd’un juge-nient juste', 'd’un jugement juste'],
  [995, 'nous tien pouvons prendre', 'nous n’en pouvons prendre'],
  [1026, 'qui la l’envoient', 'qui la renvoient'],
  [1027, 'qui n’appartient au à eux', 'qui n’appartient qu’à eux'],
  [1274, 'elles l’entourent, réchauffent de leurs propres ailes, et lut fournissent', 'elles l’entourent, l’échauffent de leurs propres ailes, et lui fournissent'],
  [1317, 'beaucoup del intelligence humaine', 'beaucoup de l’intelligence humaine'],
  [1401, 'qui remportent sur lui par la vitesse', 'qui l’emportent sur lui par la vitesse'],
  [1436, 'au sortir de retable', 'au sortir de l’étable'],
  [1450, 'lorsque les meurtres étoient récents', 'lorsque le meurtre étoit récent'],
  [1482, 'plus admirables que renfoncement des vallées', 'plus admirables que l’enfoncement des vallées'],
  [1491, 'au-dedans d’eux-mêmes, médisent On nous enseigne', 'au-dedans d’eux-mêmes, me disent : On nous enseigne'],
  [1506, 'Tant qu’il ne parois soit pas encore', 'Tant qu’il ne paroissoit pas encore'],
  [1519, 'une mime chose ; qui ma vu a vu mon Père', 'une même chose ; qui m’a vu a vu mon Père'],
];

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
const proposal = corrections.map(([segmentNumero, needle, replacement]) => {
  const row = byNumber.get(segmentNumero);
  if (!row) throw new Error(`Segment absent : ${segmentNumero}`);
  const occurrences = row.segment_texte.split(needle).length - 1;
  if (occurrences !== 1) throw new Error(`Garde segment ${segmentNumero} : occurrence=${occurrences}`);
  return { id: row.id, segmentNumero, before: row.segment_texte, after: row.segment_texte.replace(needle, replacement) };
});

console.log(JSON.stringify({ apply: APPLY, segments: proposal.length,
  changements: proposal.map(({ segmentNumero, before: oldText, after }) => ({ segmentNumero, before: oldText, after })) }, null, 2));
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
