import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const ROOT = resolve('tmp/eucher-import-2026-07-30');
const WORK_ID = 'A0418O0003';
const BODY_NATURES = ['texte', 'citation'];
const candidate = JSON.parse(readFileSync(resolve(ROOT, 'eucher-segments-candidate.json'), 'utf8'));
const columns = Object.keys(candidate[0]);
const stable = (value) => Array.isArray(value)
  ? value.map(stable)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]))
    : value;
const json = (value) => `${JSON.stringify(stable(value), null, 2)}\n`;
const sha = (value) => createHash('sha256').update(value).digest('hex').toUpperCase();
const canonical = (rows) => rows.map((row) => Object.fromEntries(columns.map((key) => [key, row[key] ?? null])))
  .sort((a, b) => a.segment_numero - b.segment_numero);
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
const [works, live] = await Promise.all([
  must(db.from('oeuvres').select('*').eq('id_oeuvre', WORK_ID), 'œuvre'),
  must(db.from('segments').select('*').eq('id_oeuvre', WORK_ID).order('segment_numero').range(0, 999), 'segments'),
]);
if (works.length !== 1 || works[0].titre !== 'Du mépris du monde') throw new Error('Œuvre inattendue.');
if (live.length !== 625) throw new Error(`625 segments attendus, ${live.length} trouvés.`);
let links = [];
for (let index = 0; index < live.length; index += 200) {
  links.push(...await must(db.from('liens_bibliques').select('id,segment_id')
    .in('segment_id', live.slice(index, index + 200).map((row) => row.id)), 'liens candidats'));
}
if (links.length !== 0) throw new Error(`Des liens bibliques existent déjà (${links.length}) : migration interrompue.`);

const expectedOld = candidate.map((row) => {
  const old = structuredClone(row);
  if (BODY_NATURES.includes(old.nature)) {
    const article = Number(old.ref_niv1);
    old.ref_niv1 = null;
    old.paragraphe = article < 57
      ? article
      : article === 57
        ? (old.paragraphe === 1 ? 57 : 58)
        : article + 1;
  }
  return old;
});
if (json(canonical(live)) !== json(canonical(expectedOld))) {
  throw new Error('La base diffère du préétat attendu : aucune écriture effectuée.');
}
const bodyCandidate = candidate.filter((row) => BODY_NATURES.includes(row.nature));
const updates = bodyCandidate.map((row) => ({
  segment_numero: row.segment_numero,
  ref_niv1: row.ref_niv1,
  paragraphe: row.paragraphe,
}));
if (updates.length !== 547) throw new Error(`547 segments du corps attendus, ${updates.length} trouvés.`);
const levels = [...new Set(updates.map((row) => row.ref_niv1))];
if (json(levels) !== json(Array.from({ length: 60 }, (_, index) => String(index + 1)))) throw new Error('Niveaux candidats incomplets ou mal ordonnés.');

const snapshot = resolve(ROOT, `eucher-before-heading-level-fix-${new Date().toISOString().replaceAll(':', '-')}.json`);
const snapshotBody = json({ captured_at: new Date().toISOString(), work: works[0], segments: live, links });
writeFileSync(snapshot, snapshotBody, 'utf8');
writeFileSync(`${snapshot}.sha256`, `${sha(snapshotBody)}  ${snapshot.split(/[\\/]/).at(-1)}\n`, 'utf8');
if (!APPLY) {
  console.log(JSON.stringify({ ready: true, apply: false, work_id: WORK_ID, body_segments: updates.length, levels: levels.length, snapshot }, null, 2));
  process.exit(0);
}

const payload = JSON.stringify(updates);
const sql = `do $eucher_headings$
declare n integer;
begin
  lock table oeuvres, segments in share row exclusive mode;
  select count(*) into n from segments
    where id_oeuvre='${WORK_ID}' and nature in ('texte','citation') and ref_niv1 is null;
  if n<>547 then raise exception 'Préétat des niveaux inattendu : %', n; end if;
  update segments s
    set ref_niv1=x.ref_niv1, paragraphe=x.paragraphe
    from jsonb_to_recordset($levels$${payload}$levels$::jsonb)
      as x(segment_numero integer, ref_niv1 text, paragraphe integer)
    where s.id_oeuvre='${WORK_ID}' and s.segment_numero=x.segment_numero
      and s.nature in ('texte','citation');
  get diagnostics n=row_count;
  if n<>547 then raise exception 'Mise à jour incomplète : %', n; end if;
  update oeuvres set profondeur_sommaire=1, niveaux_sommaire=1, niveaux_corps=1
    where id_oeuvre='${WORK_ID}';
  get diagnostics n=row_count;
  if n<>1 then raise exception 'Configuration de l œuvre non mise à jour : %', n; end if;
  select count(distinct ref_niv1) into n from segments
    where id_oeuvre='${WORK_ID}' and nature in ('texte','citation');
  if n<>60 then raise exception 'Nombre de niveaux final invalide : %', n; end if;
end $eucher_headings$;`;
writeFileSync(resolve(ROOT, 'eucher-fix-heading-levels-transaction.sql'), sql, 'utf8');
writeFileSync(resolve(ROOT, 'eucher-fix-heading-levels-transaction.sql.sha256'), `${sha(sql)}  eucher-fix-heading-levels-transaction.sql\n`, 'utf8');
const { error } = await db.rpc('exec_sql', { sql });
if (error) throw new Error(`Transaction annulée : ${error.message}`);

const [postWorks, postSegments, niv1Rows] = await Promise.all([
  must(db.from('oeuvres').select('*').eq('id_oeuvre', WORK_ID), 'œuvre après'),
  must(db.from('segments').select('*').eq('id_oeuvre', WORK_ID).order('segment_numero').range(0, 999), 'segments après'),
  must(db.rpc('get_niv1_list', { p_id_oeuvre: WORK_ID }), 'sommaire RPC'),
]);
const postLevels = niv1Rows.map((row) => row.ref_niv1).filter(Boolean);
const apparatusLevels = new Set(['Abrégé de la vie de saint Eucher', 'Avertissement', 'Approbation des docteurs', 'Extrait du privilège du Roy']);
const postBodyLevels = postLevels.filter((level) => !apparatusLevels.has(level));
const checks = {
  exact_candidate: json(canonical(postSegments)) === json(canonical(candidate)),
  sixty_levels_in_order: json(postBodyLevels) === json(levels),
  summary_depth_one: postWorks[0]?.niveaux_sommaire === 1 && postWorks[0]?.profondeur_sommaire === 1,
  body_depth_one: postWorks[0]?.niveaux_corps === 1,
  article_57_two_paragraphs: json([...new Set(postSegments.filter((row) => BODY_NATURES.includes(row.nature) && row.ref_niv1 === '57').map((row) => row.paragraphe))]) === json([1, 2]),
};
const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([key]) => key);
const report = { applied_at: new Date().toISOString(), work_id: WORK_ID, checks, failed, segments: postSegments.length, all_levels: postLevels, body_levels: postBodyLevels, candidate_sha256: sha(json(canonical(candidate))), database_sha256: sha(json(canonical(postSegments))), snapshot };
writeFileSync(resolve(ROOT, 'eucher-heading-levels-fix-report.json'), json(report), 'utf8');
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exitCode = 2;
