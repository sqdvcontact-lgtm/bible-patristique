/**
 * Application atomique du réaudit strict IIa-IIae, questions 34 à 39.
 * Ne s'exécute qu'avec : node scripts/somme-apply-ss-q34-39-strict.mjs --apply
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

if (!process.argv.includes('--apply')) {
  console.error('Refus d’exécuter sans le verrou explicite --apply.');
  process.exit(2);
}

const ROOT = 'tmp/somme-liens-audit-2026-07-29';
const PLAN_PATH = `${ROOT}/ss-q34-39-reaudit-strict.json`;
const plan = JSON.parse(readFileSync(PLAN_PATH, 'utf8'));
const OEUVRE = 'A0013O0002';
const PARTIE = 'Secunda Secundae';
const QUESTIONS = ['Question 34','Question 35','Question 36','Question 37','Question 38','Question 39'];
if (plan.oeuvre !== OEUVRE || plan.partie !== PARTIE || plan.summary?.liens_quarantaines_audites !== 105 || plan.summary?.liens_finaux !== 104) throw new Error('Plan strict inattendu.');
if (plan.decisions?.length !== 105 || plan.insertions?.length !== 1) throw new Error('Actions du plan strict incomplètes.');
if (plan.controle_aleatoire_deterministe?.taille < 15 || plan.controle_aleatoire_deterministe.resultats.some((x) => x.verdict !== 'juste')) throw new Error('Contrôle aléatoire du plan absent ou en échec.');

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
const sqlString = (value) => value === null || value === undefined ? 'null' : `'${String(value).replaceAll("'", "''")}'`;
const sqlBool = (value) => value ? 'true' : 'false';
const sqlNumber = (value) => value === null || value === undefined ? 'null' : Number(value);
const targetKey = (x) => x.canon_id ? `c:${x.canon_id}` : x.verset_v2_id ? `v:${x.verset_v2_id}` : `h:${x.livre}:${x.chapitre}`;

const segments = await must(
  sb.from('segments').select('id,id_oeuvre,segment_numero,segment_texte,ref_niv1,ref_niv2,liens_revus_le,liens_revus_par')
    .eq('id_oeuvre', OEUVRE).eq('ref_niv1', PARTIE).in('ref_niv2', QUESTIONS).order('segment_numero'),
  'segments vivants',
);
const segmentIds = segments.map((s) => s.id);
const links = [];
for (let i = 0; i < segmentIds.length; i += 100) {
  links.push(...await must(sb.from('liens_bibliques').select('*').in('segment_id', segmentIds.slice(i, i + 100)).order('id'), `liens vivants ${i}`));
}
links.sort((a, b) => a.id - b.id);

// Sauvegarde vivante obligatoire, avant toute mutation.
mkdirSync(ROOT, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const beforeName = `ss-q34-39-strict-live-before-${stamp}.json`;
const beforePayload = `${JSON.stringify({ exported_at: new Date().toISOString(), segments, links }, null, 2)}\n`;
writeFileSync(`${ROOT}/${beforeName}`, beforePayload);
writeFileSync(`${ROOT}/${beforeName}.sha256`, `${createHash('sha256').update(beforePayload).digest('hex')}  ${beforeName}\n`);

// Préconditions locales exactes sur l'état mis en quarantaine.
if (segments.length !== 212 || segments[0]?.segment_numero !== 14369 || segments.at(-1)?.segment_numero !== 14580) throw new Error(`Précondition segments. Sauvegarde : ${beforeName}`);
if (segments.some((s) => s.liens_revus_le !== null || s.liens_revus_par !== null)) throw new Error(`Une marque de lecture est revenue. Sauvegarde : ${beforeName}`);
if (links.length !== 105 || links.some((l) => l.fiabilite !== 'probable' || l.arbitrage_requis !== true)) throw new Error(`État de quarantaine des liens inattendu. Sauvegarde : ${beforeName}`);

const decisionById = new Map(plan.decisions.map((d) => [d.link_id, d]));
if (decisionById.size !== 105) throw new Error('Décisions dupliquées.');
const keys = ['id','segment_id','canon_id','verset_v2_id','livre','chapitre','type','fiabilite','motif','provenance','arbitrage_requis'];
for (const link of links) {
  const decision = decisionById.get(link.id);
  if (!decision) throw new Error(`Lien vivant non audité : ${link.id}. Sauvegarde : ${beforeName}`);
  for (const key of keys) if ((link[key] ?? null) !== (decision.before[key] ?? null)) throw new Error(`Lien ${link.id} modifié (${key}). Sauvegarde : ${beforeName}`);
}
const planSegmentText = new Map(plan.decisions.map((d) => [d.segment_id, d.segment_texte]));
for (const segment of segments) {
  const expectedText = planSegmentText.get(segment.id);
  if (expectedText !== undefined && segment.segment_texte !== expectedText) throw new Error(`Texte du segment ${segment.segment_numero} modifié. Sauvegarde : ${beforeName}`);
}

const kept = plan.decisions.filter((d) => d.decision !== 'supprimer');
const removed = plan.decisions.filter((d) => d.decision === 'supprimer');
const inserted = plan.insertions;
if (kept.length !== 103 || removed.length !== 2 || inserted.length !== 1) throw new Error('Répartition stricte inattendue.');

const finalLinks = [...kept.map((d) => d.final), ...inserted];
for (const link of finalLinks) {
  if (link.fiabilite !== 'vérifié' || link.provenance !== 'lecture' || link.arbitrage_requis !== false) throw new Error('État final non vérifié dans le plan.');
  if (!link.canon_id && !link.verset_v2_id && !(link.livre && link.chapitre)) throw new Error('Cible finale absente : le plan n’autorise aucun à constituer.');
}
const finalKeys = finalLinks.map((l) => `${l.segment_id}|${targetKey(l)}|${l.type}`);
if (new Set(finalKeys).size !== finalKeys.length) throw new Error('Doublon dans le plan final.');

const oldGuard = (b) => `id=${Number(b.id)} and segment_id=${Number(b.segment_id)}
      and canon_id is not distinct from ${sqlString(b.canon_id)}
      and verset_v2_id is not distinct from ${sqlNumber(b.verset_v2_id)}
      and livre is not distinct from ${sqlString(b.livre)}
      and chapitre is not distinct from ${sqlNumber(b.chapitre)}
      and type=${Number(b.type)} and fiabilite=${sqlString(b.fiabilite)}
      and motif is not distinct from ${sqlString(b.motif)}
      and provenance=${sqlString(b.provenance)} and arbitrage_requis=${sqlBool(b.arbitrage_requis)}`;
const targetSet = (f) => `canon_id=${sqlString(f.canon_id)}, verset_v2_id=${sqlNumber(f.verset_v2_id)}, livre=${sqlString(f.livre)}, chapitre=${sqlNumber(f.chapitre)}`;

const updateSql = kept.map((d) => `
    update liens_bibliques set ${targetSet(d.final)}, type=${Number(d.final.type)},
      fiabilite='vérifié', motif=${sqlString(d.final.motif)}, provenance='lecture', arbitrage_requis=false
    where ${oldGuard(d.before)};
    get diagnostics n=row_count;
    if n<>1 then raise exception 'Lien ${Number(d.link_id)} non actualisé : %',n; end if;`).join('\n');
const deleteSql = removed.map((d) => `
    delete from liens_bibliques where ${oldGuard(d.before)};
    get diagnostics n=row_count;
    if n<>1 then raise exception 'Lien ${Number(d.link_id)} non supprimé : %',n; end if;`).join('\n');
const insertValues = inserted.map((l) => `(${Number(l.segment_id)},${sqlString(l.canon_id)},${sqlNumber(l.verset_v2_id)},${sqlString(l.livre)},${sqlNumber(l.chapitre)},${Number(l.type)},'vérifié',${sqlString(l.motif)},'lecture',false)`).join(',');
const segmentValues = segments.map((s) => `(${Number(s.id)})`).join(',');
const segmentArray = segmentIds.map(Number).join(',');
const expectedTypes = [1,2,3,4].map((type) => [type, finalLinks.filter((l) => l.type === type).length]);

const sql = `do $strict_q34_39$
declare n integer; ts timestamptz := now();
begin
  -- Préconditions répétées dans la transaction pour fermer la fenêtre de concurrence.
  select count(*) into n from segments
  where id=any(array[${segmentArray}]::bigint[]) and id_oeuvre='${OEUVRE}' and ref_niv1='${PARTIE}'
    and ref_niv2=any(array[${QUESTIONS.map(sqlString).join(',')}]::text[])
    and liens_revus_le is null and liens_revus_par is null;
  if n<>212 then raise exception 'Précondition transactionnelle segments : %/212',n; end if;
  select count(*) into n from liens_bibliques where segment_id=any(array[${segmentArray}]::bigint[]);
  if n<>105 then raise exception 'Précondition transactionnelle liens : %/105',n; end if;

  ${deleteSql}
  ${updateSql}

  insert into liens_bibliques
    (segment_id,canon_id,verset_v2_id,livre,chapitre,type,fiabilite,motif,provenance,arbitrage_requis)
  values ${insertValues};
  get diagnostics n=row_count;
  if n<>1 then raise exception 'Insertion Ac 23,7 : %/1',n; end if;

  with ids(id) as (values ${segmentValues})
  update segments s set liens_revus_le=ts, liens_revus_par='IA-lecture'
  from ids where s.id=ids.id and s.id_oeuvre='${OEUVRE}' and s.ref_niv1='${PARTIE}'
    and s.liens_revus_le is null and s.liens_revus_par is null;
  get diagnostics n=row_count;
  if n<>212 then raise exception 'Segments marqués : %/212',n; end if;

  select count(*) into n from liens_bibliques where segment_id=any(array[${segmentArray}]::bigint[]);
  if n<>104 then raise exception 'Total final : %/104',n; end if;
  select count(*) into n from liens_bibliques where segment_id=any(array[${segmentArray}]::bigint[])
    and fiabilite='vérifié' and provenance='lecture' and arbitrage_requis=false;
  if n<>104 then raise exception 'État vérifié final : %/104',n; end if;
  select count(*) into n from liens_bibliques where segment_id=any(array[${segmentArray}]::bigint[])
    and fiabilite='à constituer';
  if n<>0 then raise exception 'Liens à constituer inattendus : %',n; end if;
  select count(*) into n from (
    select segment_id,type,coalesce('c:'||canon_id,'v:'||verset_v2_id::text,'h:'||livre||':'||chapitre::text) cible,count(*)
    from liens_bibliques where segment_id=any(array[${segmentArray}]::bigint[])
    group by segment_id,type,coalesce('c:'||canon_id,'v:'||verset_v2_id::text,'h:'||livre||':'||chapitre::text)
    having count(*)>1
  ) d;
  if n<>0 then raise exception 'Doublons finaux : %',n; end if;
  ${expectedTypes.map(([type,count]) => `select count(*) into n from liens_bibliques where segment_id=any(array[${segmentArray}]::bigint[]) and type=${type}; if n<>${count} then raise exception 'Type ${type} : %/${count}',n; end if;`).join('\n  ')}
  select count(*) into n from segments where id=any(array[${segmentArray}]::bigint[])
    and liens_revus_le=ts and liens_revus_par='IA-lecture';
  if n<>212 then raise exception 'État final segments : %/212',n; end if;
end
$strict_q34_39$;`;

const { error } = await sb.rpc('exec_sql', { sql });
if (error) throw new Error(`Transaction stricte annulée : ${error.message}. Sauvegarde : ${beforeName}`);

const afterSegments = await must(sb.from('segments').select('id,segment_numero,liens_revus_le,liens_revus_par').in('id', segmentIds).order('segment_numero'), 'post-contrôle segments');
const afterLinks = [];
for (let i = 0; i < segmentIds.length; i += 100) afterLinks.push(...await must(sb.from('liens_bibliques').select('*').in('segment_id', segmentIds.slice(i, i + 100)).order('id'), `post-contrôle liens ${i}`));
if (afterSegments.length !== 212 || afterSegments.some((s) => !s.liens_revus_le || s.liens_revus_par !== 'IA-lecture')) throw new Error('Post-contrôle segments en échec.');
if (afterLinks.length !== 104 || afterLinks.some((l) => l.fiabilite !== 'vérifié' || l.provenance !== 'lecture' || l.arbitrage_requis)) throw new Error('Post-contrôle liens en échec.');
const afterKeys = afterLinks.map((l) => `${l.segment_id}|${targetKey(l)}|${l.type}`);
if (new Set(afterKeys).size !== afterKeys.length) throw new Error('Post-contrôle doublons en échec.');

const afterName = `ss-q34-39-strict-live-after-${stamp}.json`;
const afterPayload = `${JSON.stringify({ exported_at: new Date().toISOString(), segments: afterSegments, links: afterLinks }, null, 2)}\n`;
writeFileSync(`${ROOT}/${afterName}`, afterPayload);
writeFileSync(`${ROOT}/${afterName}.sha256`, `${createHash('sha256').update(afterPayload).digest('hex')}  ${afterName}\n`);
console.log(JSON.stringify({ applied: true, segments: 212, links: 104, before: `${ROOT}/${beforeName}`, after: `${ROOT}/${afterName}` }, null, 2));
