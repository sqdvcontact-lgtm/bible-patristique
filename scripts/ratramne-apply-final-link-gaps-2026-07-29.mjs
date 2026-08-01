import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const WORK = 'A0091O0001';
const EXPECTED_BEFORE = 130;
const L = [
  [320, '1CO.11.20', 2, 'Référence explicite au chapitre 11 de la première aux Corinthiens et reprise du nom apostolique « Cène du Seigneur ».'],
  [320, '1CO.11.23', 2, 'Référence explicite au même chapitre et reprise du pain dans le récit apostolique de l’institution.'],
  [483, 'LAM.4.20', 1, 'Nouvelle citation : « Le Christ Seigneur est Esprit devant notre face ».'],
  [484, 'LAM.4.20', 3, 'Interprétation de cette parole des Lamentations par la présence spirituelle du Christ dans le mystère.'],
  [487, 'LAM.4.20', 1, 'Nouvelle citation de la formule : « Le Christ, le Seigneur est Esprit devant notre face ».'],
  [519, 'JHN.6.49', 3, 'Interprétation augustinienne des pères qui mangèrent la manne et moururent, distinguant nourriture visible et réception spirituelle.'],
  [519, 'JHN.6.50', 3, 'Interprétation du pain céleste qui préserve de la mort par la vertu spirituelle du sacrement.'],
  [521, 'JHN.6.50', 1, 'Citation : le pain descendu du ciel dont celui qui mange ne mourra point.'],
  [521, 'JHN.6.50', 3, 'Explication du verset comme réception de la vertu du sacrement par le cœur, non comme simple manducation visible.'],
];

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data: segments, error: segmentError } = await db.from('segments')
  .select('id,segment_numero').eq('id_oeuvre', WORK).order('segment_numero');
if (segmentError) throw segmentError;
if (segments.length !== 568) throw new Error('Œuvre incomplète.');
const ids = segments.map((segment) => segment.id);
const targets = [...new Set(L.map(([, canonId]) => canonId))];
const { data: verses, error: verseError } = await db.from('versets_lecture').select('id_verset').in('id_verset', targets);
if (verseError) throw verseError;
if ((verses ?? []).length !== targets.length) throw new Error('Cible canonique absente.');
const live = [];
for (let i = 0; i < ids.length; i += 200) {
  const { data, error } = await db.from('liens_bibliques').select('segment_id,canon_id,type').in('segment_id', ids.slice(i, i + 200));
  if (error) throw error;
  live.push(...(data ?? []));
}
const numberById = new Map(segments.map((segment) => [segment.id, segment.segment_numero]));
const wanted = new Set(L.map(([numero, canonId, type]) => `${numero}|${canonId}|${type}`));
const liveKeys = new Set(live.map((link) => `${numberById.get(link.segment_id)}|${link.canon_id}|${link.type}`));
const present = [...wanted].filter((value) => liveKeys.has(value)).length;
if (!([EXPECTED_BEFORE, EXPECTED_BEFORE + L.length].includes(live.length))) throw new Error(`Préétat divergent : ${live.length} liens.`);
if ((live.length === EXPECTED_BEFORE && present) || (live.length === EXPECTED_BEFORE + L.length && present !== L.length)) {
  throw new Error('Passe finale partielle ou divergente.');
}
console.log(JSON.stringify({ apply: APPLY, before: live.length, additions: L.length, final: EXPECTED_BEFORE + L.length, already_applied: present === L.length }, null, 2));
if (!APPLY) process.exit(0);

const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const values = L.map(([numero, canonId, type, motif]) => `(${numero},${quote(canonId)},${type},${quote(motif)})`).join(',\n      ');
const sql = `do $ratramne$ declare n integer; begin
  perform 1 from oeuvres where id_oeuvre=${quote(WORK)} and note='[Corpus Scriptura:depublie]' for update;
  if not found then raise exception 'Œuvre absente ou publiée'; end if;
  select count(*) into n from liens_bibliques l join segments s on s.id=l.segment_id where s.id_oeuvre=${quote(WORK)};
  if n=${EXPECTED_BEFORE} then
    insert into liens_bibliques(segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis)
    select s.id,v.canon_id,v.type,'vérifié',v.motif,'lecture',false
    from (values ${values}) as v(segment_numero,canon_id,type,motif)
    join segments s on s.id_oeuvre=${quote(WORK)} and s.segment_numero=v.segment_numero;
    get diagnostics n=row_count;
    if n<>${L.length} then raise exception 'Insertions %/${L.length}',n; end if;
  elsif n<>${EXPECTED_BEFORE + L.length} then raise exception 'Préétat divergent %',n; end if;
end $ratramne$;`;
const { error: applyError } = await db.rpc('exec_sql', { sql });
if (applyError) throw applyError;
const { count, error: countError } = await db.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids);
if (countError) throw countError;
if (count !== EXPECTED_BEFORE + L.length) throw new Error(`Postcontrôle : ${count} liens.`);
console.log(JSON.stringify({ applied: true, links: count, postcheck: 'ok' }, null, 2));
