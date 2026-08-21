import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const ROOT = resolve('tmp/eucher-import-2026-07-30');
const OLD_ID = 'A0418O0002';
const NEW_ID = 'A0418O0003';
const INSTRUCTIONS_NOTICE_ID = 2756;
const EUCHER_NOTICE_ID = 2982;
const TRANSLATION_ID = 'TR_FR_1672_ARNAULD_DANDILLY_DE_CONTEMPTU_MUNDI';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const must = async (query, label) => {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data ?? [];
};
const stable = (value) => Array.isArray(value)
  ? value.map(stable)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]))
    : value;
const json = (value) => `${JSON.stringify(stable(value), null, 2)}\n`;
const sha = (value) => createHash('sha256').update(value).digest('hex').toUpperCase();
const candidate = JSON.parse(readFileSync(resolve(ROOT, 'eucher-segments-candidate.json'), 'utf8'));
const columns = Object.keys(candidate[0]);
const canonical = (rows) => rows.map((row) => Object.fromEntries(columns.map((key) => [key, row[key] ?? null])))
  .sort((a, b) => a.segment_numero - b.segment_numero);
const countLinks = async (rows) => {
  let count = 0;
  const ids = rows.map((row) => row.id);
  for (let i = 0; i < ids.length; i += 200) {
    count += (await must(db.from('liens_bibliques').select('id').in('segment_id', ids.slice(i, i + 200)), 'liens')).length;
  }
  return count;
};

const [oldWorks, newWorks, oldSegments, newSegments, relevantNotices, targetNotices] = await Promise.all([
  must(db.from('oeuvres').select('*').eq('id_oeuvre', OLD_ID), 'ancienne œuvre'),
  must(db.from('oeuvres').select('*').eq('id_oeuvre', NEW_ID), 'œuvre cible'),
  must(db.from('segments').select('*').eq('id_oeuvre', OLD_ID).order('segment_numero').range(0, 999), 'anciens segments'),
  must(db.from('segments').select('*').eq('id_oeuvre', NEW_ID).order('segment_numero').range(0, 999), 'segments cible'),
  must(db.from('catalogue_notices').select('*').in('id', [INSTRUCTIONS_NOTICE_ID, EUCHER_NOTICE_ID]).order('id'), 'notices source'),
  must(db.from('catalogue_notices').select('*').eq('id_oeuvre_stable', NEW_ID), 'notices cible'),
]);
if (newWorks.length || newSegments.length || targetNotices.length) throw new Error(`${NEW_ID} n’est pas entièrement libre.`);
if (oldWorks.length !== 1 || oldWorks[0].titre !== 'Du mépris du monde' || oldSegments.length !== 625) throw new Error('L’état source est inattendu.');
const instructions = relevantNotices.find((row) => row.id === INSTRUCTIONS_NOTICE_ID);
const eucher = relevantNotices.find((row) => row.id === EUCHER_NOTICE_ID);
if (instructions?.titre_stable !== 'Instructions' || instructions.id_oeuvre_stable !== OLD_ID) throw new Error('Notice Instructions inattendue.');
if (eucher?.titre_stable !== 'Du mépris du monde' || eucher.id_oeuvre_stable !== OLD_ID || eucher.id_traduction !== TRANSLATION_ID) throw new Error('Notice Eucher inattendue.');
const expectedOld = candidate.map((row) => ({ ...row, id_oeuvre: OLD_ID }));
if (json(canonical(oldSegments)) !== json(canonical(expectedOld))) throw new Error('Les segments ne correspondent pas exactement au candidat corrigé.');
if (await countLinks(oldSegments) !== 0) throw new Error('Des liens bibliques existent : migration interrompue.');

const timestamp = new Date().toISOString().replaceAll(':', '-');
const snapshot = resolve(ROOT, `eucher-before-second-id-fix-${timestamp}.json`);
const snapshotBody = json({ captured_at: new Date().toISOString(), work: oldWorks[0], notices: relevantNotices, segments: oldSegments, target_notices: targetNotices });
writeFileSync(snapshot, snapshotBody, 'utf8');
writeFileSync(`${snapshot}.sha256`, `${sha(snapshotBody)}  ${snapshot.split(/[\\/]/).at(-1)}\n`, 'utf8');

if (!APPLY) {
  console.log(JSON.stringify({ ready: true, apply: false, old_id: OLD_ID, new_id: NEW_ID, target_notices: targetNotices.length, snapshot }, null, 2));
  process.exit(0);
}
const sql = `do $eucher_rekey$
declare n integer;
begin
  lock table oeuvres, segments, catalogue_notices in share row exclusive mode;
  if exists(select 1 from oeuvres where id_oeuvre='${NEW_ID}')
     or exists(select 1 from segments where id_oeuvre='${NEW_ID}')
     or exists(select 1 from catalogue_notices where id_oeuvre_stable='${NEW_ID}') then
    raise exception '${NEW_ID} n est plus entièrement libre';
  end if;
  select count(*) into n from oeuvres where id_oeuvre='${OLD_ID}' and titre='Du mépris du monde';
  if n<>1 then raise exception 'Œuvre source inattendue : %', n; end if;
  select count(*) into n from segments where id_oeuvre='${OLD_ID}';
  if n<>625 then raise exception 'Segments source inattendus : %', n; end if;
  update oeuvres set id_oeuvre='${NEW_ID}' where id_oeuvre='${OLD_ID}' and titre='Du mépris du monde';
  get diagnostics n=row_count;
  if n<>1 then raise exception 'Œuvre non renommée : %', n; end if;
  update segments set id_oeuvre='${NEW_ID}' where id_oeuvre='${OLD_ID}';
  get diagnostics n=row_count;
  if n<>625 then raise exception 'Segments non renommés : %', n; end if;
  update catalogue_notices set id_oeuvre_stable='${NEW_ID}', presence_sur_le_site=true
    where id=${EUCHER_NOTICE_ID} and titre_stable='Du mépris du monde' and id_traduction='${TRANSLATION_ID}' and id_oeuvre_stable='${OLD_ID}';
  get diagnostics n=row_count;
  if n<>1 then raise exception 'Notice Eucher non renommée : %', n; end if;
  update catalogue_notices set presence_sur_le_site=false
    where id=${INSTRUCTIONS_NOTICE_ID} and titre_stable='Instructions' and id_oeuvre_stable='${OLD_ID}';
  get diagnostics n=row_count;
  if n<>1 then raise exception 'Notice Instructions non dépubliée : %', n; end if;
end $eucher_rekey$;`;
writeFileSync(resolve(ROOT, 'eucher-fix-second-id-collision-transaction.sql'), sql, 'utf8');
writeFileSync(resolve(ROOT, 'eucher-fix-second-id-collision-transaction.sql.sha256'), `${sha(sql)}  eucher-fix-second-id-collision-transaction.sql\n`, 'utf8');
const { error } = await db.rpc('exec_sql', { sql });
if (error) throw new Error(`Transaction annulée : ${error.message}`);

const [postOldWorks, postOldSegments, postWorks, postSegments, postNotices, postTargetNotices] = await Promise.all([
  must(db.from('oeuvres').select('*').eq('id_oeuvre', OLD_ID), 'ancienne œuvre après'),
  must(db.from('segments').select('*').eq('id_oeuvre', OLD_ID), 'anciens segments après'),
  must(db.from('oeuvres').select('*').eq('id_oeuvre', NEW_ID), 'œuvre après'),
  must(db.from('segments').select('*').eq('id_oeuvre', NEW_ID).order('segment_numero').range(0, 999), 'segments après'),
  must(db.from('catalogue_notices').select('*').in('id', [INSTRUCTIONS_NOTICE_ID, EUCHER_NOTICE_ID]).order('id'), 'notices après'),
  must(db.from('catalogue_notices').select('*').eq('id_oeuvre_stable', NEW_ID), 'notices cible après'),
]);
const postInstructions = postNotices.find((row) => row.id === INSTRUCTIONS_NOTICE_ID);
const postEucher = postNotices.find((row) => row.id === EUCHER_NOTICE_ID);
const links = await countLinks(postSegments);
const checks = {
  old_work_absent: postOldWorks.length === 0,
  old_segments_absent: postOldSegments.length === 0,
  one_new_work: postWorks.length === 1 && postWorks[0].titre === 'Du mépris du monde',
  exact_candidate: json(canonical(postSegments)) === json(canonical(candidate)),
  one_target_notice: postTargetNotices.length === 1 && postTargetNotices[0].id === EUCHER_NOTICE_ID,
  eucher_published: postEucher?.id_oeuvre_stable === NEW_ID && postEucher.presence_sur_le_site === true,
  instructions_retained_unpublished: postInstructions?.id_oeuvre_stable === OLD_ID && postInstructions.presence_sur_le_site === false,
  no_biblical_links: links === 0,
};
const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([key]) => key);
const report = { applied_at: new Date().toISOString(), old_id: OLD_ID, new_id: NEW_ID, checks, failed, segments: postSegments.length, links, candidate_sha256: sha(json(canonical(candidate))), database_sha256: sha(json(canonical(postSegments))), snapshot };
writeFileSync(resolve(ROOT, 'eucher-second-id-fix-report.json'), json(report), 'utf8');
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exitCode = 2;
