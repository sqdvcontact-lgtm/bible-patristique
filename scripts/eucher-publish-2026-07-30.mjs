import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const WORK_ID = 'A0418O0003';
const EXPECTED_SEGMENTS = 625;
const EXPECTED_NOTES = 22;
const MARKER = '[Corpus Scriptura:depublie]';
const ROOT = resolve('tmp/eucher-import-2026-07-30');
const metadata = JSON.parse(readFileSync(resolve(ROOT, 'eucher-metadata-candidate.json'), 'utf8'));
const PUBLIC_NOTE = metadata.oeuvre_apres_publication.note;
const TRANSLATION_ID = metadata.catalogue_notice.id_traduction;
const FINAL_DECISION = 'Importé — texte français complet, structuré et contrôlé ; constitution des liens bibliques différée.';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Variables Supabase absentes.');
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const must = async (query, label) => {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
};
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const countNoteDefinitions = (rows) => rows.reduce((total, row) => {
  const matches = String(row.notes ?? '').match(/\[\[\d+\]\]/g);
  return total + (matches?.length ?? 0);
}, 0);

const [works, notices, segments] = await Promise.all([
  must(db.from('oeuvres').select('id_oeuvre,note,date_mise_en_ligne').eq('id_oeuvre', WORK_ID), 'œuvre'),
  must(db.from('catalogue_notices').select('id,id_ligne,id_oeuvre_stable,id_traduction,presence_sur_le_site,decision_import')
    .eq('id_oeuvre_stable', WORK_ID).eq('id_traduction', TRANSLATION_ID), 'notice'),
  must(db.from('segments').select('id,notes,lien_1,lien_2,lien_3,lien_4,liens_revus_le,liens_revus_par')
    .eq('id_oeuvre', WORK_ID), 'segments'),
]);
if (works.length !== 1 || notices.length !== 1 || segments.length !== EXPECTED_SEGMENTS) throw new Error('Import dépublié incomplet.');
if (![MARKER, PUBLIC_NOTE].includes(works[0].note)) throw new Error('Note d’œuvre inattendue.');
if (countNoteDefinitions(segments) !== EXPECTED_NOTES) throw new Error('Jeu de notes incomplet.');
if (segments.some((row) => row.lien_1 || row.lien_2 || row.lien_3 || row.lien_4 || row.liens_revus_le || row.liens_revus_par)) {
  throw new Error('État de liens inattendu avant publication.');
}
const ids = segments.map((row) => row.id);
let linkCount = 0;
for (let i = 0; i < ids.length; i += 200) {
  const rows = await must(db.from('liens_bibliques').select('id').in('segment_id', ids.slice(i, i + 200)), 'liens bibliques');
  linkCount += rows.length;
}
if (linkCount !== 0) throw new Error('Des liens bibliques ont été créés prématurément.');

const alreadyPublished = works[0].note === PUBLIC_NOTE && notices[0].presence_sur_le_site === true && works[0].date_mise_en_ligne;
console.log(JSON.stringify({
  apply: APPLY,
  ready: true,
  already_published: Boolean(alreadyPublished),
  work: WORK_ID,
  notice: notices[0].id_ligne,
  segments: segments.length,
  notes: countNoteDefinitions(segments),
  links: linkCount,
}, null, 2));
if (!APPLY || alreadyPublished) process.exit(0);
if (notices[0].presence_sur_le_site !== false || works[0].note !== MARKER || works[0].date_mise_en_ligne !== null) {
  throw new Error('Préétat de publication divergent.');
}

const sql = `do $eucher_publish$
declare n integer;
begin
  perform 1 from oeuvres where id_oeuvre=${quote(WORK_ID)} and note=${quote(MARKER)} and date_mise_en_ligne is null for update;
  if not found then raise exception 'Préétat de publication divergent'; end if;
  select count(*) into n from segments where id_oeuvre=${quote(WORK_ID)};
  if n<>${EXPECTED_SEGMENTS} then raise exception 'Segments incomplets : %',n; end if;
  select count(*) into n from segments where id_oeuvre=${quote(WORK_ID)} and
    (lien_1 is not null or lien_2 is not null or lien_3 is not null or lien_4 is not null
      or liens_revus_le is not null or liens_revus_par is not null);
  if n<>0 then raise exception 'État de liens prématuré : %',n; end if;
  select count(*) into n from liens_bibliques l join segments s on s.id=l.segment_id where s.id_oeuvre=${quote(WORK_ID)};
  if n<>0 then raise exception 'Liens bibliques prématurés : %',n; end if;
  update oeuvres set note=${quote(PUBLIC_NOTE)}, date_mise_en_ligne=now() where id_oeuvre=${quote(WORK_ID)};
  select count(*) into n from catalogue_notices
    where id_oeuvre_stable=${quote(WORK_ID)} and id_traduction=${quote(TRANSLATION_ID)} and presence_sur_le_site=true;
  if n<>1 then raise exception 'Le déclencheur de publication n a pas visé exactement une notice : %',n; end if;
  update catalogue_notices set presence_sur_le_site=true, decision_import=${quote(FINAL_DECISION)}
    where id_oeuvre_stable=${quote(WORK_ID)} and id_traduction=${quote(TRANSLATION_ID)};
  get diagnostics n=row_count;
  if n<>1 then raise exception 'Notice non publiée'; end if;
end $eucher_publish$;`;
const { error } = await db.rpc('exec_sql', { sql });
if (error) throw new Error(`Publication annulée : ${error.message}`);

const [finalWork, finalNotice] = await Promise.all([
  must(db.from('oeuvres').select('note,date_mise_en_ligne').eq('id_oeuvre', WORK_ID).single(), 'œuvre publiée'),
  must(db.from('catalogue_notices').select('presence_sur_le_site,decision_import').eq('id', notices[0].id).single(), 'notice publiée'),
]);
if (finalWork.note !== PUBLIC_NOTE || !finalWork.date_mise_en_ligne
  || finalNotice.presence_sur_le_site !== true || finalNotice.decision_import !== FINAL_DECISION) {
  throw new Error('Postcontrôle de publication en échec.');
}
console.log(JSON.stringify({ applied: true, published: true, date_mise_en_ligne: finalWork.date_mise_en_ligne, links: 0 }, null, 2));
