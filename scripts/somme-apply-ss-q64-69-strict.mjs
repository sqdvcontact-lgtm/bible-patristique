/**
 * Application atomique de l'audit IIa-IIae, questions 64 a 69.
 * Livrable volontairement non execute : toute mutation exige --apply.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

if (!process.argv.includes('--apply')) {
  console.error('Refus d\'executer sans le verrou explicite --apply.');
  process.exit(2);
}

const ROOT = 'tmp/somme-liens-audit-2026-07-29';
const SNAPSHOT_PATH = `${ROOT}/ss-q64-69-snapshot-live.json`;
const PLAN_PATH = `${ROOT}/Q64-69-AUDIT-EXHAUSTIF.json`;
const snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8'));
const plan = JSON.parse(readFileSync(PLAN_PATH, 'utf8'));
const OEUVRE = 'A0013O0002';
const PARTIE = 'Secunda Secundae';
const QUESTIONS = Array.from({ length: 6 }, (_, index) => `Question ${index + 64}`);
const EXPECTED = { segments: 307, existing: 97, kept: 95, deleted: 2, inserted: 56, final: 151 };
const EXPECTED_TYPES = new Map([[1, 104], [2, 21], [3, 25], [4, 1]]);

if (plan.oeuvre !== OEUVRE || plan.partie !== PARTIE || plan.summary?.segments_relus !== EXPECTED.segments || plan.summary?.liens_finaux !== EXPECTED.final) throw new Error('Plan strict inattendu.');
if (plan.decisions_liens_existants?.length !== EXPECTED.existing || plan.insertions?.length !== EXPECTED.inserted || plan.segments_audites?.length !== EXPECTED.segments) throw new Error('Plan strict incomplet.');
if (plan.controle_deterministe_stratifie?.taille < 20 || plan.controle_deterministe_stratifie.part_types_3_4 < 10 || plan.controle_deterministe_stratifie.resultats.some((item) => item.verdict !== 'juste')) throw new Error('Controle deterministe absent ou insuffisant.');

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Variables Supabase absentes.');
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const must = async (query, label) => {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
};
const stable = (value) => {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
};
const stableJson = (value) => JSON.stringify(stable(value));
const sqlString = (value) => value === null || value === undefined ? 'null' : `'${String(value).replaceAll("'", "''")}'`;
const sqlBool = (value) => value ? 'true' : 'false';
const sqlNumber = (value) => value === null || value === undefined ? 'null' : Number(value);
const sqlTimestamp = (value) => value === null || value === undefined ? 'null' : `${sqlString(value)}::timestamptz`;
const md5 = (value) => createHash('md5').update(String(value ?? ''), 'utf8').digest('hex');
const targetKey = (link) => link.canon_id ? `c:${link.canon_id}` : link.verset_v2_id ? `v:${link.verset_v2_id}` : link.livre ? `h:${link.livre}:${link.chapitre}` : 'sans-cible';
const finalKey = (link) => `${link.segment_id}|${targetKey(link)}|${link.type}`;

const fetchLive = async () => {
  const segments = await must(sb.from('segments')
    .select('id,id_oeuvre,segment_numero,segment_texte,notes,nature,ref_niv1,ref_niv2,ref_niv3,ref_niv4,liens_revus_le,liens_revus_par')
    .eq('id_oeuvre', OEUVRE).eq('ref_niv1', PARTIE).in('ref_niv2', QUESTIONS).order('segment_numero'), 'segments vivants');
  const links = [];
  for (let index = 0; index < segments.length; index += 100) {
    links.push(...await must(sb.from('liens_bibliques').select('*')
      .in('segment_id', segments.slice(index, index + 100).map((segment) => segment.id)).order('id'), `liens vivants ${index}`));
  }
  links.sort((a, b) => a.id - b.id);
  return { segments, links };
};

const live = await fetchLive();
mkdirSync(ROOT, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const beforeName = `ss-q64-69-live-before-${stamp}.json`;
const beforePayload = `${JSON.stringify({ exported_at: new Date().toISOString(), ...live }, null, 2)}\n`;
writeFileSync(`${ROOT}/${beforeName}`, beforePayload);
writeFileSync(`${ROOT}/${beforeName}.sha256`, `${createHash('sha256').update(beforePayload).digest('hex')}  ${beforeName}\n`);

if (live.segments.length !== EXPECTED.segments || live.segments[0]?.segment_numero !== 15778 || live.segments.at(-1)?.segment_numero !== 16084) throw new Error(`Precondition segments inattendue. Sauvegarde : ${beforeName}`);
if (live.links.length !== EXPECTED.existing) throw new Error(`Precondition liens inattendue. Sauvegarde : ${beforeName}`);
if (stableJson(live.segments) !== stableJson(snapshot.segments) || stableJson(live.links) !== stableJson(snapshot.links)) throw new Error(`L'etat vivant differe du snapshot audite. Sauvegarde : ${beforeName}`);

const decisions = plan.decisions_liens_existants;
const kept = decisions.filter((decision) => decision.final);
const deleted = decisions.filter((decision) => !decision.final);
const insertions = plan.insertions;
const finalLinks = [...kept.map((decision) => decision.final), ...insertions];
if (kept.length !== EXPECTED.kept || deleted.length !== EXPECTED.deleted) throw new Error('Repartition conserver/supprimer inattendue.');
if (finalLinks.some((link) => !link.canon_id || !['probable', 'vérifié'].includes(link.fiabilite) || link.provenance !== 'lecture' || link.arbitrage_requis !== false)) throw new Error('Le plan ne respecte pas les etats de la charte.');
if (finalLinks.some((link) => !link.motif || !link.segment_id)) throw new Error('Motif ou segment absent du plan.');
const finalKeys = finalLinks.map(finalKey);
if (new Set(finalKeys).size !== finalKeys.length) throw new Error('Doublon dans le plan final.');
for (const [type, count] of EXPECTED_TYPES) if (finalLinks.filter((link) => link.type === type).length !== count) throw new Error(`Repartition T${type} inattendue.`);

const witnessIds = new Set(snapshot.witnesses.map((witness) => witness.id_verset));
if (finalLinks.some((link) => !witnessIds.has(link.canon_id))) throw new Error('Une cible finale ne possede pas de temoin dans le snapshot.');
const decisionById = new Map(decisions.map((decision) => [decision.link_id, decision]));
if (decisionById.size !== EXPECTED.existing || snapshot.links.some((link) => !decisionById.has(link.id))) throw new Error('Couverture des liens existants incomplete.');
const auditSegmentIds = new Set(plan.segments_audites.map((item) => item.id));
if (auditSegmentIds.size !== EXPECTED.segments || live.segments.some((segment) => !auditSegmentIds.has(segment.id))) throw new Error('Couverture des segments incomplete.');
for (const record of [...kept, ...insertions]) {
  if (!record.ancre_locale_exacte || !record.segment_texte?.includes(record.ancre_locale_exacte)) throw new Error(`Ancre locale invalide : ${record.link_id ?? record.segment_numero}.`);
  if (record.concordance?.verdict !== 'concordant' || !record.concordance?.texte_temoin) throw new Error(`Temoin non concordant : ${record.link_id ?? record.segment_numero}.`);
}

const oldGuard = (before) => `id=${Number(before.id)} and segment_id=${Number(before.segment_id)}
      and canon_id is not distinct from ${sqlString(before.canon_id)}
      and verset_v2_id is not distinct from ${sqlNumber(before.verset_v2_id)}
      and livre is not distinct from ${sqlString(before.livre)}
      and chapitre is not distinct from ${sqlNumber(before.chapitre)}
      and type=${Number(before.type)} and fiabilite=${sqlString(before.fiabilite)}
      and motif is not distinct from ${sqlString(before.motif)}
      and provenance=${sqlString(before.provenance)} and arbitrage_requis=${sqlBool(before.arbitrage_requis)}
      and created_at is not distinct from ${sqlTimestamp(before.created_at)}
      and updated_at is not distinct from ${sqlTimestamp(before.updated_at)}`;
const targetSet = (final) => `canon_id=${sqlString(final.canon_id)}, verset_v2_id=${sqlNumber(final.verset_v2_id)}, livre=${sqlString(final.livre)}, chapitre=${sqlNumber(final.chapitre)}`;
const deleteSql = deleted.map((decision) => `
    delete from liens_bibliques where ${oldGuard(decision.before)};
    get diagnostics n=row_count;
    if n<>1 then raise exception 'Lien ${Number(decision.link_id)} non supprime : %',n; end if;`).join('\n');
const updateSql = kept.map((decision) => `
    update liens_bibliques set ${targetSet(decision.final)}, type=${Number(decision.final.type)},
      fiabilite='vérifié', motif=${sqlString(decision.final.motif)}, provenance='lecture', arbitrage_requis=false
    where ${oldGuard(decision.before)};
    get diagnostics n=row_count;
    if n<>1 then raise exception 'Lien ${Number(decision.link_id)} non actualise : %',n; end if;`).join('\n');
const insertValues = insertions.map((link) => `(${Number(link.segment_id)},${sqlString(link.canon_id)},null,null,null,${Number(link.type)},'vérifié',${sqlString(link.motif)},'lecture',false)`).join(',');
const insertionGuards = insertions.map((link) => `(${Number(link.segment_id)},${sqlString(link.canon_id)},${Number(link.type)})`).join(',');
const segmentIds = live.segments.map((segment) => Number(segment.id));
const segmentArray = segmentIds.join(',');
const segmentExpected = live.segments.map((segment) => `(${Number(segment.id)},${sqlString(md5(segment.segment_texte))},${sqlTimestamp(segment.liens_revus_le)},${sqlString(segment.liens_revus_par)})`).join(',');

const sql = `do $strict_q64_69$
declare n integer; ts timestamptz := now();
begin
  perform 1 from segments where id=any(array[${segmentArray}]::bigint[]) for update;
  perform 1 from liens_bibliques where segment_id=any(array[${segmentArray}]::bigint[]) for update;

  with expected(id,text_md5,revus_le,revus_par) as (values ${segmentExpected})
  select count(*) into n from expected e join segments s on s.id=e.id
  where md5(s.segment_texte)=e.text_md5
    and s.liens_revus_le is not distinct from e.revus_le::timestamptz
    and s.liens_revus_par is not distinct from e.revus_par::text
    and s.id_oeuvre='${OEUVRE}' and s.ref_niv1='${PARTIE}'
    and s.ref_niv2=any(array[${QUESTIONS.map(sqlString).join(',')}]::text[]);
  if n<>${EXPECTED.segments} then raise exception 'Precondition transactionnelle segments : %/${EXPECTED.segments}',n; end if;
  select count(*) into n from liens_bibliques where segment_id=any(array[${segmentArray}]::bigint[]);
  if n<>${EXPECTED.existing} then raise exception 'Precondition transactionnelle liens : %/${EXPECTED.existing}',n; end if;

  ${deleteSql}
  ${updateSql}

  -- Garde explicite anti-doublon apres normalisation et avant insertion.
  with proposed(segment_id,canon_id,type) as (values ${insertionGuards})
  select count(*) into n from proposed p join liens_bibliques l
    on l.segment_id=p.segment_id and l.canon_id=p.canon_id and l.type=p.type;
  if n<>0 then raise exception 'Ajouts deja presents apres normalisation : %',n; end if;

  insert into liens_bibliques
    (segment_id,canon_id,verset_v2_id,livre,chapitre,type,fiabilite,motif,provenance,arbitrage_requis)
  values ${insertValues};
  get diagnostics n=row_count;
  if n<>${EXPECTED.inserted} then raise exception 'Insertions : %/${EXPECTED.inserted}',n; end if;

  update segments set liens_revus_le=ts, liens_revus_par='IA-lecture'
  where id=any(array[${segmentArray}]::bigint[])
    and liens_revus_le is null and liens_revus_par is null;
  get diagnostics n=row_count;
  if n<>${EXPECTED.segments} then raise exception 'Segments marques : %/${EXPECTED.segments}',n; end if;

  select count(*) into n from liens_bibliques where segment_id=any(array[${segmentArray}]::bigint[]);
  if n<>${EXPECTED.final} then raise exception 'Total final : %/${EXPECTED.final}',n; end if;
  select count(*) into n from liens_bibliques where segment_id=any(array[${segmentArray}]::bigint[])
    and fiabilite='vérifié' and provenance='lecture' and arbitrage_requis=false;
  if n<>${EXPECTED.final} then raise exception 'Etat editorial final : %/${EXPECTED.final}',n; end if;
  ${[...EXPECTED_TYPES].map(([type, count]) => `select count(*) into n from liens_bibliques where segment_id=any(array[${segmentArray}]::bigint[]) and type=${type};
  if n<>${count} then raise exception 'Type ${type} : %/${count}',n; end if;`).join('\n  ')}
  select count(*) into n from liens_bibliques where segment_id=any(array[${segmentArray}]::bigint[]) and canon_id is null;
  if n<>0 then raise exception 'Cibles absentes inattendues : %',n; end if;
  select count(*) into n from (
    select segment_id,type,coalesce('c:'||canon_id,'v:'||verset_v2_id::text,'h:'||livre||':'||chapitre::text) cible,count(*)
    from liens_bibliques where segment_id=any(array[${segmentArray}]::bigint[])
    group by segment_id,type,coalesce('c:'||canon_id,'v:'||verset_v2_id::text,'h:'||livre||':'||chapitre::text)
    having count(*)>1
  ) duplicates;
  if n<>0 then raise exception 'Doublons finaux : %',n; end if;
end
$strict_q64_69$;`;

const { error } = await sb.rpc('exec_sql', { sql });
if (error) throw new Error(`Transaction stricte annulee : ${error.message}. Sauvegarde : ${beforeName}`);

const after = await fetchLive();
if (after.segments.length !== EXPECTED.segments || after.segments.some((segment) => !segment.liens_revus_le || segment.liens_revus_par !== 'IA-lecture')) throw new Error('Post-controle segments en echec.');
if (after.links.length !== EXPECTED.final || after.links.some((link) => link.fiabilite !== 'vérifié' || link.provenance !== 'lecture' || link.arbitrage_requis)) throw new Error('Post-controle liens en echec.');
const afterKeys = after.links.map(finalKey).sort();
if (stableJson(afterKeys) !== stableJson([...finalKeys].sort())) throw new Error('Post-controle du plan final en echec.');
const afterName = `ss-q64-69-live-after-${stamp}.json`;
const afterPayload = `${JSON.stringify({ exported_at: new Date().toISOString(), ...after }, null, 2)}\n`;
writeFileSync(`${ROOT}/${afterName}`, afterPayload);
writeFileSync(`${ROOT}/${afterName}.sha256`, `${createHash('sha256').update(afterPayload).digest('hex')}  ${afterName}\n`);
console.log(JSON.stringify({ applied: true, segments: EXPECTED.segments, links: EXPECTED.final, before: `${ROOT}/${beforeName}`, after: `${ROOT}/${afterName}` }, null, 2));
