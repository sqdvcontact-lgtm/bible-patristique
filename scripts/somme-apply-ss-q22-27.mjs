/**
 * Application atomique de l'audit de la Somme, Secunda Secundae, questions 22-27.
 *
 * IMPORTANT : ce script n'est pas exécuté lors de sa génération. À son lancement il :
 * 1. exporte et signe l'état live AVANT toute précondition et toute écriture ;
 * 2. exige l'identité exacte des 550 segments et des 139 liens avec l'export audité ;
 * 3. applique dans un seul bloc PostgreSQL les 10 suppressions, 129 validations ou
 *    corrections, 19 ajouts et le marquage des 550 segments ;
 * 4. contrôle le post-état et l'absence de doublons.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const OEUVRE = 'A0013O0002';
const PARTIE = 'Secunda Secundae';
const QUESTIONS = Array.from({ length: 6 }, (_, i) => `Question ${i + 22}`);
const ROOT = 'tmp/somme-liens-audit-2026-07-29';
const SOURCE_PATH = `${ROOT}/ss-q22-27-source.json`;
const PROPOSALS_PATH = `${ROOT}/SS-Q22-27-PROPOSITIONS.json`;

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .filter((line) => line && !line.startsWith('#')).map((line) => {
    const i = line.indexOf('=');
    return [line.slice(0, i), line.slice(i + 1).replace(/^["']|["']$/g, '')];
  }));
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Variables Supabase absentes');
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const source = JSON.parse(readFileSync(SOURCE_PATH, 'utf8'));
const proposals = JSON.parse(readFileSync(PROPOSALS_PATH, 'utf8'));

const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
};
const stable = (value) => JSON.stringify(canonical(value));
const sqlLiteral = (value) => {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return `'${String(value).replaceAll("'", "''")}'`;
};
const same = (actual, expected, label) => {
  if (stable(actual) !== stable(expected)) throw new Error(`Précondition exacte non satisfaite : ${label}`);
};

if (source.segments.length !== 550 || source.links.length !== 139) throw new Error('Fichiers d’audit incomplets');
if (proposals.segments_lus !== 550 || proposals.liens_existants !== 139) throw new Error('Bilan de propositions inattendu');
const actions = proposals.actions;
const deletions = actions.filter((a) => a.action === 'supprimer');
const corrections = actions.filter((a) => a.action === 'corriger');
const additions = actions.filter((a) => a.action === 'ajouter');
if (deletions.length !== 10 || corrections.length !== 12 || additions.length !== 19) throw new Error('Nombre d’actions inattendu');
if (new Set(actions.filter((a) => a.lien_id).map((a) => a.lien_id)).size !== 22) throw new Error('Lien traité plusieurs fois');

// Lecture live et sauvegarde AVANT toute précondition ou écriture.
const { data: liveSegments, error: segmentError } = await sb.from('segments').select('*')
  .eq('id_oeuvre', OEUVRE).eq('ref_niv1', PARTIE).in('ref_niv2', QUESTIONS).order('segment_numero');
if (segmentError) throw segmentError;
const liveSegmentIds = liveSegments.map((s) => s.id);
const { data: liveLinks, error: linkError } = await sb.from('liens_bibliques').select('*')
  .in('segment_id', liveSegmentIds).order('segment_id').order('type').order('id');
if (linkError) throw linkError;
mkdirSync(ROOT, { recursive: true });
const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
const backupName = `SS-Q22-27-live-before-${stamp}.json`;
const backupPayload = `${JSON.stringify({ exported_at: new Date().toISOString(), oeuvre: OEUVRE, partie: PARTIE, questions: QUESTIONS, segments: liveSegments, links: liveLinks }, null, 2)}\n`;
writeFileSync(`${ROOT}/${backupName}`, backupPayload);
writeFileSync(`${ROOT}/${backupName}.sha256`, `${createHash('sha256').update(backupPayload).digest('hex')}  ${backupName}\n`);

// Préconditions exactes : aucun texte, niveau, marquage ou lien n'a changé depuis l'audit.
same([...liveSegments].sort((a, b) => a.id - b.id), [...source.segments].sort((a, b) => a.id - b.id), '550 segments');
same([...liveLinks].sort((a, b) => a.id - b.id), [...source.links].sort((a, b) => a.id - b.id), '139 liens');
if (liveSegments.some((s) => s.id_oeuvre !== OEUVRE || s.ref_niv1 !== PARTIE || !QUESTIONS.includes(s.ref_niv2))) throw new Error('Segment hors périmètre');
if (liveSegments.some((s) => s.liens_revus_le !== null || s.liens_revus_par !== null)) throw new Error('Un segment a déjà été marqué relu');

const sourceLinkById = new Map(source.links.map((link) => [link.id, link]));
const deletedIds = new Set(deletions.map((a) => a.lien_id));
const correctionById = new Map(corrections.map((a) => [a.lien_id, a]));
const retained = source.links.filter((link) => !deletedIds.has(link.id));
if (retained.length !== 129) throw new Error('Nombre de liens conservés inattendu');

// Toutes les nouvelles cibles doivent exister dans la vue sémantiquement contrôlée.
const targetIds = [...new Set([
  ...corrections.map((a) => a.nouveau.cible),
  ...additions.map((a) => a.nouveau.cible),
].filter(Boolean))];
const { data: targetRows, error: targetError } = await sb.from('versets_lecture').select('id_verset').in('id_verset', targetIds);
if (targetError) throw targetError;
const foundTargets = new Set(targetRows.map((row) => row.id_verset));
const missingTargets = targetIds.filter((id) => !foundTargets.has(id));
if (missingTargets.length) throw new Error(`Cibles absentes : ${missingTargets.join(', ')}`);

const exactLinkPredicate = (link) => [
  `id=${sqlLiteral(link.id)}`,
  `segment_id=${sqlLiteral(link.segment_id)}`,
  `canon_id is not distinct from ${sqlLiteral(link.canon_id)}`,
  `verset_v2_id is not distinct from ${sqlLiteral(link.verset_v2_id)}`,
  `livre is not distinct from ${sqlLiteral(link.livre)}`,
  `chapitre is not distinct from ${sqlLiteral(link.chapitre)}`,
  `type=${sqlLiteral(link.type)}`,
  `fiabilite=${sqlLiteral(link.fiabilite)}`,
  `motif is not distinct from ${sqlLiteral(link.motif)}`,
  `provenance=${sqlLiteral(link.provenance)}`,
  `arbitrage_requis=${sqlLiteral(link.arbitrage_requis)}`,
].join(' and ');

const statements = [];
for (const action of deletions) {
  const old = sourceLinkById.get(action.lien_id);
  if (!old) throw new Error(`Lien à supprimer absent de l'export : ${action.lien_id}`);
  statements.push(`delete from liens_bibliques where ${exactLinkPredicate(old)}; if not found then raise exception 'Suppression refusée : lien ${old.id}'; end if; n_delete := n_delete + 1;`);
}
for (const old of retained) {
  const correction = correctionById.get(old.id);
  const next = correction?.nouveau;
  const set = correction
    ? `canon_id=${sqlLiteral(next.cible)},verset_v2_id=null,livre=null,chapitre=null,type=${sqlLiteral(next.type)},fiabilite='vérifié',provenance='lecture',arbitrage_requis=false,motif=${sqlLiteral(next.motif)}`
    : `fiabilite='vérifié',provenance='lecture',arbitrage_requis=false`;
  statements.push(`update liens_bibliques set ${set} where ${exactLinkPredicate(old)}; if not found then raise exception 'Validation refusée : lien ${old.id}'; end if; n_update := n_update + 1;`);
}
for (const action of additions) {
  const next = action.nouveau;
  statements.push(`insert into liens_bibliques(segment_id,canon_id,verset_v2_id,livre,chapitre,type,fiabilite,motif,provenance,arbitrage_requis) values (${sqlLiteral(action.segment_id)},${sqlLiteral(next.cible)},null,null,null,${sqlLiteral(next.type)},'vérifié',${sqlLiteral(next.motif)},'lecture',false); n_insert := n_insert + 1;`);
}
const segmentIdSql = liveSegmentIds.map(sqlLiteral).join(',');
const sql = `do $apply$
declare n_delete integer := 0; n_update integer := 0; n_insert integer := 0; n_mark integer := 0; n integer;
begin
${statements.join('\n')}
update segments set liens_revus_le=now(), liens_revus_par='IA-lecture'
where id in (${segmentIdSql}) and id_oeuvre=${sqlLiteral(OEUVRE)} and ref_niv1=${sqlLiteral(PARTIE)}
  and ref_niv2 in (${QUESTIONS.map(sqlLiteral).join(',')}) and liens_revus_le is null and liens_revus_par is null;
get diagnostics n_mark = row_count;
if n_delete <> 10 or n_update <> 129 or n_insert <> 19 or n_mark <> 550 then
  raise exception 'Comptes atomiques inattendus delete=%, update=%, insert=%, segments=%', n_delete,n_update,n_insert,n_mark;
end if;
select count(*) into n from liens_bibliques where segment_id in (${segmentIdSql});
if n <> 148 then raise exception 'Post-compte liens inattendu : %', n; end if;
select count(*) into n from (
  select segment_id,type,canon_id,verset_v2_id,livre,chapitre,count(*)
  from liens_bibliques where segment_id in (${segmentIdSql})
  group by segment_id,type,canon_id,verset_v2_id,livre,chapitre having count(*) > 1
) d;
if n <> 0 then raise exception 'Doublons post-application : %', n; end if;
select count(*) into n from liens_bibliques where segment_id in (${segmentIdSql})
  and (fiabilite <> 'vérifié' or provenance <> 'lecture' or arbitrage_requis);
if n <> 0 then raise exception 'Liens non validés après application : %', n; end if;
end $apply$;`;

// Un seul appel RPC : le bloc DO est atomique ; toute assertion annule toutes les écritures.
const { error: execError } = await sb.rpc('exec_sql', { sql });
if (execError) throw execError;

// Contrôle indépendant du post-état.
const { data: afterSegments, error: afterSegmentError } = await sb.from('segments').select('id,liens_revus_le,liens_revus_par')
  .in('id', liveSegmentIds).order('id');
if (afterSegmentError) throw afterSegmentError;
const { data: afterLinks, error: afterLinkError } = await sb.from('liens_bibliques').select('*')
  .in('segment_id', liveSegmentIds).order('segment_id').order('type').order('id');
if (afterLinkError) throw afterLinkError;
if (afterSegments.length !== 550 || afterSegments.some((s) => !s.liens_revus_le || s.liens_revus_par !== 'IA-lecture')) throw new Error('Contrôle final des segments échoué');
if (afterLinks.length !== 148 || afterLinks.some((l) => l.fiabilite !== 'vérifié' || l.provenance !== 'lecture' || l.arbitrage_requis)) throw new Error('Contrôle final des liens échoué');
const duplicateKeys = new Set();
for (const link of afterLinks) {
  const key = stable([link.segment_id, link.type, link.canon_id, link.verset_v2_id, link.livre, link.chapitre]);
  if (duplicateKeys.has(key)) throw new Error(`Doublon final : ${key}`);
  duplicateKeys.add(key);
}
for (const id of deletedIds) if (afterLinks.some((l) => l.id === id)) throw new Error(`Suppression non appliquée : ${id}`);
for (const action of corrections) {
  const row = afterLinks.find((l) => l.id === action.lien_id);
  if (!row || row.canon_id !== action.nouveau.cible || row.type !== action.nouveau.type) throw new Error(`Correction non appliquée : ${action.lien_id}`);
}
for (const action of additions) {
  if (!afterLinks.some((l) => l.segment_id === action.segment_id && l.canon_id === action.nouveau.cible && l.type === action.nouveau.type)) throw new Error(`Ajout non retrouvé : segment ${action.segment_id}`);
}
console.log(JSON.stringify({
  applied: true,
  backup: `${ROOT}/${backupName}`,
  segments_marked: 550,
  links_deleted: 10,
  links_validated_or_corrected: 129,
  links_inserted: 19,
  final_links: 148,
  duplicates: 0,
}, null, 2));
