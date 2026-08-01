import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const ROOT = resolve('tmp/eucher-import-2026-07-30');
const OLD_ID = 'A0418O0001';
const NEW_ID = 'A0418O0002';
const OLD_NOTICE_ID = 2755;
const EUCHER_NOTICE_ID = 2982;
const EUCHER_TRANSLATION = 'TR_FR_1672_ARNAULD_DANDILLY_DE_CONTEMPTU_MUNDI';
const CORRECTIONS = new Map([
  [59, ['A. Darrera Curé de saint André.', 'A. Debreda Curé de saint André.']],
  [61, ['Gremet Curé de saint Benoist.', 'Grenet Curé de saint Benoist.']],
  [62, ['N. Gorillon Curé de saint Laurent.', 'N. Gobillon Curé de saint Laurent.']],
]);

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
const lit = (value) => value === null ? 'null' : `'${String(value).replaceAll("'", "''")}'`;
const candidate = JSON.parse(readFileSync(resolve(ROOT, 'eucher-segments-candidate.json'), 'utf8'));
const columns = Object.keys(candidate[0]);
const canonical = (rows) => rows.map((row) => Object.fromEntries(columns.map((key) => [key, row[key] ?? null])))
  .sort((a, b) => a.segment_numero - b.segment_numero);
const linkCount = async (rows) => {
  let count = 0;
  const ids = rows.map((row) => row.id);
  for (let i = 0; i < ids.length; i += 200) {
    count += (await must(db.from('liens_bibliques').select('id').in('segment_id', ids.slice(i, i + 200)), 'liens')).length;
  }
  return count;
};

const [oldWorks, newWorks, oldSegments, newSegments, notices] = await Promise.all([
  must(db.from('oeuvres').select('*').eq('id_oeuvre', OLD_ID), 'ancienne œuvre'),
  must(db.from('oeuvres').select('*').eq('id_oeuvre', NEW_ID), 'nouvelle œuvre'),
  must(db.from('segments').select('*').eq('id_oeuvre', OLD_ID).order('segment_numero').range(0, 999), 'anciens segments'),
  must(db.from('segments').select('*').eq('id_oeuvre', NEW_ID).order('segment_numero').range(0, 999), 'nouveaux segments'),
  must(db.from('catalogue_notices').select('*').in('id', [OLD_NOTICE_ID, EUCHER_NOTICE_ID]).order('id'), 'notices'),
]);
if (oldWorks.length !== 1 || oldWorks[0].titre !== 'Du mépris du monde') throw new Error('L’ancienne œuvre n’est pas dans l’état attendu.');
if (newWorks.length || newSegments.length) throw new Error(`${NEW_ID} n’est plus libre.`);
if (oldSegments.length !== 625) throw new Error(`625 anciens segments attendus, ${oldSegments.length} trouvés.`);
if (notices.length !== 2) throw new Error('Les deux notices attendues sont absentes ou dupliquées.');
const oldNotice = notices.find((row) => row.id === OLD_NOTICE_ID);
const eucherNotice = notices.find((row) => row.id === EUCHER_NOTICE_ID);
if (oldNotice?.titre_stable !== 'Clés pour l’intelligence spirituelle' || oldNotice.id_oeuvre_stable !== OLD_ID) {
  throw new Error('La notice historique des Clés est inattendue.');
}
if (eucherNotice?.titre_stable !== 'Du mépris du monde' || eucherNotice.id_traduction !== EUCHER_TRANSLATION
    || eucherNotice.id_oeuvre_stable !== OLD_ID) {
  throw new Error('La notice de Du mépris du monde est inattendue.');
}
const linksBefore = await linkCount(oldSegments);
if (linksBefore !== 0) throw new Error(`Migration interrompue : ${linksBefore} lien(s) biblique(s) existent.`);

const expectedOld = candidate.map((row) => {
  const previous = structuredClone(row);
  previous.id_oeuvre = OLD_ID;
  const correction = CORRECTIONS.get(previous.segment_numero);
  if (correction) previous.segment_texte = correction[0];
  return previous;
});
if (json(canonical(oldSegments)) !== json(canonical(expectedOld))) {
  throw new Error('L’état éditorial vivant diffère du candidat autrement que par les trois corrections prévues.');
}

const capturedAt = new Date().toISOString().replaceAll(':', '-');
const snapshotPath = resolve(ROOT, `eucher-before-id-signature-fix-${capturedAt}.json`);
const snapshotBody = json({ captured_at: new Date().toISOString(), old_work: oldWorks[0], notices, segments: oldSegments, biblical_links: linksBefore });
writeFileSync(snapshotPath, snapshotBody, 'utf8');
writeFileSync(`${snapshotPath}.sha256`, `${sha(snapshotBody)}  ${snapshotPath.split(/[\\/]/).at(-1)}\n`, 'utf8');

if (!APPLY) {
  console.log(JSON.stringify({ ready: true, apply: false, old_id: OLD_ID, new_id: NEW_ID, segments: 625, corrections: [...CORRECTIONS.keys()], snapshot: snapshotPath }, null, 2));
  process.exit(0);
}

const correctionSql = [...CORRECTIONS].map(([numero, [oldText, newText]]) => `
  update segments set segment_texte=${lit(newText)}
    where id_oeuvre=${lit(NEW_ID)} and segment_numero=${numero} and segment_texte=${lit(oldText)};
  get diagnostics n=row_count;
  if n<>1 then raise exception 'Correction signature ${numero} non appliquée : %', n; end if;`).join('');
const sql = `do $eucher_fix$
declare n integer;
begin
  lock table oeuvres, segments, catalogue_notices in share row exclusive mode;
  if exists(select 1 from oeuvres where id_oeuvre=${lit(NEW_ID)})
     or exists(select 1 from segments where id_oeuvre=${lit(NEW_ID)}) then
    raise exception '${NEW_ID} n est plus libre';
  end if;
  select count(*) into n from oeuvres where id_oeuvre=${lit(OLD_ID)} and titre='Du mépris du monde';
  if n<>1 then raise exception 'Œuvre source inattendue : %', n; end if;
  select count(*) into n from segments where id_oeuvre=${lit(OLD_ID)};
  if n<>625 then raise exception 'Segments source inattendus : %', n; end if;
  update oeuvres set id_oeuvre=${lit(NEW_ID)} where id_oeuvre=${lit(OLD_ID)} and titre='Du mépris du monde';
  get diagnostics n=row_count;
  if n<>1 then raise exception 'Renommage œuvre non appliqué : %', n; end if;
  update segments set id_oeuvre=${lit(NEW_ID)} where id_oeuvre=${lit(OLD_ID)};
  get diagnostics n=row_count;
  if n<>625 then raise exception 'Renommage segments incomplet : %', n; end if;
  ${correctionSql}
  update catalogue_notices set id_oeuvre_stable=${lit(NEW_ID)}, presence_sur_le_site=true
    where id=${EUCHER_NOTICE_ID} and titre_stable='Du mépris du monde' and id_traduction=${lit(EUCHER_TRANSLATION)}
      and id_oeuvre_stable=${lit(OLD_ID)};
  get diagnostics n=row_count;
  if n<>1 then raise exception 'Notice Eucher non migrée : %', n; end if;
  update catalogue_notices set presence_sur_le_site=false
    where id=${OLD_NOTICE_ID} and titre_stable='Clés pour l’intelligence spirituelle' and id_oeuvre_stable=${lit(OLD_ID)};
  get diagnostics n=row_count;
  if n<>1 then raise exception 'Notice des Clés non dépubliée : %', n; end if;
  select count(*) into n from segments where id_oeuvre=${lit(NEW_ID)};
  if n<>625 then raise exception 'Postétat segments invalide : %', n; end if;
  if exists(select 1 from oeuvres where id_oeuvre=${lit(OLD_ID)})
     or exists(select 1 from segments where id_oeuvre=${lit(OLD_ID)}) then
    raise exception 'Ancien identifiant encore porté par l œuvre importée';
  end if;
end $eucher_fix$;`;
writeFileSync(resolve(ROOT, 'eucher-fix-id-signatures-transaction.sql'), sql, 'utf8');
writeFileSync(resolve(ROOT, 'eucher-fix-id-signatures-transaction.sql.sha256'), `${sha(sql)}  eucher-fix-id-signatures-transaction.sql\n`, 'utf8');
const { error } = await db.rpc('exec_sql', { sql });
if (error) throw new Error(`Transaction annulée : ${error.message}`);

const [postOldWorks, postOldSegments, postWorks, postSegments, postNotices] = await Promise.all([
  must(db.from('oeuvres').select('*').eq('id_oeuvre', OLD_ID), 'ancienne œuvre après'),
  must(db.from('segments').select('*').eq('id_oeuvre', OLD_ID), 'anciens segments après'),
  must(db.from('oeuvres').select('*').eq('id_oeuvre', NEW_ID), 'nouvelle œuvre après'),
  must(db.from('segments').select('*').eq('id_oeuvre', NEW_ID).order('segment_numero').range(0, 999), 'nouveaux segments après'),
  must(db.from('catalogue_notices').select('*').in('id', [OLD_NOTICE_ID, EUCHER_NOTICE_ID]).order('id'), 'notices après'),
]);
const linksAfter = await linkCount(postSegments);
const postOldNotice = postNotices.find((row) => row.id === OLD_NOTICE_ID);
const postEucherNotice = postNotices.find((row) => row.id === EUCHER_NOTICE_ID);
const checks = {
  old_work_absent: postOldWorks.length === 0,
  old_segments_absent: postOldSegments.length === 0,
  one_new_work: postWorks.length === 1 && postWorks[0].titre === 'Du mépris du monde',
  exact_candidate: json(canonical(postSegments)) === json(canonical(candidate)),
  eucher_notice_migrated_and_published: postEucherNotice?.id_oeuvre_stable === NEW_ID && postEucherNotice.presence_sur_le_site === true,
  keys_notice_retained_and_unpublished: postOldNotice?.id_oeuvre_stable === OLD_ID && postOldNotice.presence_sur_le_site === false,
  no_biblical_links: linksAfter === 0,
};
const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([key]) => key);
const report = { applied_at: new Date().toISOString(), old_id: OLD_ID, new_id: NEW_ID, checks, failed, segments: postSegments.length, links: linksAfter, candidate_sha256: sha(json(canonical(candidate))), database_sha256: sha(json(canonical(postSegments))), snapshot: snapshotPath };
writeFileSync(resolve(ROOT, 'eucher-id-signatures-fix-report.json'), json(report), 'utf8');
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exitCode = 2;
