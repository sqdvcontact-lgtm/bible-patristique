/**
 * Application atomique de l’audit IIa-IIae, questions 46 à 51.
 * Ce fichier est un livrable non exécuté. Il refuse toute mutation sans --apply.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

if (!process.argv.includes('--apply')) {
  console.error('Refus d’exécuter sans le verrou explicite --apply.');
  process.exit(2);
}

const ROOT = 'tmp/somme-liens-audit-2026-07-29';
const SNAPSHOT_PATH = `${ROOT}/ss-q46-51-snapshot-live.json`;
const PLAN_PATH = `${ROOT}/Q46-51-AUDIT-EXHAUSTIF.json`;
const snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8'));
const plan = JSON.parse(readFileSync(PLAN_PATH, 'utf8'));
const OEUVRE = 'A0013O0002';
const PARTIE = 'Secunda Secundae';
const QUESTIONS = Array.from({ length: 6 }, (_, index) => `Question ${index + 46}`);
if (plan.oeuvre !== OEUVRE || plan.partie !== PARTIE || plan.summary?.segments_relus !== 307 || plan.summary?.liens_finaux !== 36) throw new Error('Plan strict inattendu.');
if (plan.decisions_liens_existants?.length !== 27 || plan.insertions?.length !== 9 || plan.segments_audites?.length !== 307) throw new Error('Plan strict incomplet.');
if (plan.controle_deterministe_stratifie?.taille !== 20 || plan.controle_deterministe_stratifie.part_types_3_4 < 6 || plan.controle_deterministe_stratifie.resultats.some((item) => item.verdict !== 'juste')) throw new Error('Contrôle déterministe absent ou insuffisant.');

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
const md5 = (value) => createHash('md5').update(String(value ?? ''), 'utf8').digest('hex');
const targetKey = (link) => link.canon_id ? `c:${link.canon_id}` : link.verset_v2_id ? `v:${link.verset_v2_id}` : link.livre ? `h:${link.livre}:${link.chapitre}` : 'sans-cible';

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
const beforeName = `ss-q46-51-live-before-${stamp}.json`;
const beforePayload = `${JSON.stringify({ exported_at: new Date().toISOString(), ...live }, null, 2)}\n`;
writeFileSync(`${ROOT}/${beforeName}`, beforePayload);
writeFileSync(`${ROOT}/${beforeName}.sha256`, `${createHash('sha256').update(beforePayload).digest('hex')}  ${beforeName}\n`);

if (live.segments.length !== 307 || live.segments[0]?.segment_numero !== 14868 || live.segments.at(-1)?.segment_numero !== 15174) throw new Error(`Précondition segments inattendue. Sauvegarde : ${beforeName}`);
if (live.links.length !== 27) throw new Error(`Précondition liens inattendue. Sauvegarde : ${beforeName}`);
if (stableJson(live.segments) !== stableJson(snapshot.segments) || stableJson(live.links) !== stableJson(snapshot.links)) throw new Error(`L’état vivant diffère du snapshot audité. Sauvegarde : ${beforeName}`);

const decisions = plan.decisions_liens_existants;
const insertions = plan.insertions;
const finalLinks = [...decisions.map((decision) => decision.final), ...insertions];
if (finalLinks.some((link) => !link.canon_id || !['probable', 'vérifié'].includes(link.fiabilite) || link.provenance !== 'lecture' || link.arbitrage_requis !== false)) throw new Error('Le plan ne respecte pas les états de la charte.');
if (finalLinks.some((link) => !link.motif || !link.segment_id)) throw new Error('Motif ou segment absent du plan.');
const finalKeys = finalLinks.map((link) => `${link.segment_id}|${targetKey(link)}|${link.type}`);
if (new Set(finalKeys).size !== finalKeys.length) throw new Error('Doublon dans le plan final.');
if (finalLinks.filter((link) => link.type === 1).length !== 28 || finalLinks.filter((link) => link.type === 3).length !== 8 || finalLinks.some((link) => link.type === 2 || link.type === 4)) throw new Error('Répartition typologique inattendue.');

const witnessIds = new Set(snapshot.witnesses.map((witness) => witness.id_verset));
if (finalLinks.some((link) => !witnessIds.has(link.canon_id))) throw new Error('Une cible finale ne possède pas de témoin dans le snapshot.');
const decisionById = new Map(decisions.map((decision) => [decision.link_id, decision]));
if (decisionById.size !== 27 || snapshot.links.some((link) => !decisionById.has(link.id))) throw new Error('Couverture des liens existants incomplète.');
const auditSegmentIds = new Set(plan.segments_audites.map((item) => item.id));
if (auditSegmentIds.size !== 307 || live.segments.some((segment) => !auditSegmentIds.has(segment.id))) throw new Error('Couverture des segments incomplète.');

const oldGuard = (before) => `id=${Number(before.id)} and segment_id=${Number(before.segment_id)}
      and canon_id is not distinct from ${sqlString(before.canon_id)}
      and verset_v2_id is not distinct from ${sqlNumber(before.verset_v2_id)}
      and livre is not distinct from ${sqlString(before.livre)}
      and chapitre is not distinct from ${sqlNumber(before.chapitre)}
      and type=${Number(before.type)} and fiabilite=${sqlString(before.fiabilite)}
      and motif is not distinct from ${sqlString(before.motif)}
      and provenance=${sqlString(before.provenance)} and arbitrage_requis=${sqlBool(before.arbitrage_requis)}`;
const targetSet = (final) => `canon_id=${sqlString(final.canon_id)}, verset_v2_id=${sqlNumber(final.verset_v2_id)}, livre=${sqlString(final.livre)}, chapitre=${sqlNumber(final.chapitre)}`;
const updateSql = decisions.map((decision) => `
    update liens_bibliques set ${targetSet(decision.final)}, type=${Number(decision.final.type)},
      fiabilite='vérifié', motif=${sqlString(decision.final.motif)}, provenance='lecture', arbitrage_requis=false
    where ${oldGuard(decision.before)};
    get diagnostics n=row_count;
    if n<>1 then raise exception 'Lien ${Number(decision.link_id)} non actualisé : %',n; end if;`).join('\n');
const insertValues = insertions.map((link) => `(${Number(link.segment_id)},${sqlString(link.canon_id)},null,null,null,${Number(link.type)},'vérifié',${sqlString(link.motif)},'lecture',false)`).join(',');
const insertionGuards = insertions.map((link) => `(${Number(link.segment_id)},${sqlString(link.canon_id)},${Number(link.type)})`).join(',');
const segmentIds = live.segments.map((segment) => Number(segment.id));
const segmentArray = segmentIds.join(',');
const segmentExpected = live.segments.map((segment) => `(${Number(segment.id)},${sqlString(md5(segment.segment_texte))},${sqlString(segment.liens_revus_le)},${sqlString(segment.liens_revus_par)})`).join(',');

const sql = `do $strict_q46_51$
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
  if n<>307 then raise exception 'Précondition transactionnelle segments : %/307',n; end if;
  select count(*) into n from liens_bibliques where segment_id=any(array[${segmentArray}]::bigint[]);
  if n<>27 then raise exception 'Précondition transactionnelle liens : %/27',n; end if;

  ${updateSql}

  -- Garde explicite contre tout doublon des neuf ajouts, après normalisation
  -- des 27 liens existants et avant la moindre insertion.
  with proposed(segment_id,canon_id,type) as (values ${insertionGuards})
  select count(*) into n
  from proposed p
  join liens_bibliques l on l.segment_id=p.segment_id
    and l.canon_id=p.canon_id and l.type=p.type;
  if n<>0 then raise exception 'Ajouts déjà présents après normalisation : %',n; end if;

  insert into liens_bibliques
    (segment_id,canon_id,verset_v2_id,livre,chapitre,type,fiabilite,motif,provenance,arbitrage_requis)
  values ${insertValues};
  get diagnostics n=row_count;
  if n<>9 then raise exception 'Insertions : %/9',n; end if;

  update segments set liens_revus_le=ts, liens_revus_par='IA-lecture'
  where id=any(array[${segmentArray}]::bigint[])
    and liens_revus_le is null and liens_revus_par is null;
  get diagnostics n=row_count;
  if n<>307 then raise exception 'Segments marqués : %/307',n; end if;

  select count(*) into n from liens_bibliques where segment_id=any(array[${segmentArray}]::bigint[]);
  if n<>36 then raise exception 'Total final : %/36',n; end if;
  select count(*) into n from liens_bibliques where segment_id=any(array[${segmentArray}]::bigint[])
    and fiabilite='vérifié' and provenance='lecture' and arbitrage_requis=false;
  if n<>36 then raise exception 'État éditorial final : %/36',n; end if;
  select count(*) into n from liens_bibliques where segment_id=any(array[${segmentArray}]::bigint[]) and type=1;
  if n<>28 then raise exception 'Type 1 : %/28',n; end if;
  select count(*) into n from liens_bibliques where segment_id=any(array[${segmentArray}]::bigint[]) and type=3;
  if n<>8 then raise exception 'Type 3 : %/8',n; end if;
  select count(*) into n from liens_bibliques where segment_id=any(array[${segmentArray}]::bigint[]) and type in (2,4);
  if n<>0 then raise exception 'Types 2/4 inattendus : %',n; end if;
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
$strict_q46_51$;`;

const { error } = await sb.rpc('exec_sql', { sql });
if (error) throw new Error(`Transaction stricte annulée : ${error.message}. Sauvegarde : ${beforeName}`);

const after = await fetchLive();
if (after.segments.length !== 307 || after.segments.some((segment) => !segment.liens_revus_le || segment.liens_revus_par !== 'IA-lecture')) throw new Error('Post-contrôle segments en échec.');
if (after.links.length !== 36 || after.links.some((link) => link.fiabilite !== 'vérifié' || link.provenance !== 'lecture' || link.arbitrage_requis)) throw new Error('Post-contrôle liens en échec.');
const afterKeys = after.links.map((link) => `${link.segment_id}|${targetKey(link)}|${link.type}`);
if (new Set(afterKeys).size !== afterKeys.length) throw new Error('Post-contrôle doublons en échec.');
const afterName = `ss-q46-51-live-after-${stamp}.json`;
const afterPayload = `${JSON.stringify({ exported_at: new Date().toISOString(), ...after }, null, 2)}\n`;
writeFileSync(`${ROOT}/${afterName}`, afterPayload);
writeFileSync(`${ROOT}/${afterName}.sha256`, `${createHash('sha256').update(afterPayload).digest('hex')}  ${afterName}\n`);
console.log(JSON.stringify({ applied: true, segments: 307, links: 36, before: `${ROOT}/${beforeName}`, after: `${ROOT}/${afterName}` }, null, 2));
