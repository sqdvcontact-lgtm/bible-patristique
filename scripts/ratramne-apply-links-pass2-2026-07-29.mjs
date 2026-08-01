import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const WORK = 'A0091O0001';
const REVIEWER = 'IA-lecture';
const MARKER = '[Corpus Scriptura:depublie]';
const EXPECTED_BEFORE = 88;

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Complément issu de la lecture suivie de toutes les subdivisions qui ne
// portaient pas nécessairement de guillemets ni de notes bibliques.
const L = [
  [70, 'MAT.15.17', 2, 'Reprise de la parole du Seigneur sur ce qui entre dans la bouche, descend dans le ventre et est soumis à l’évacuation.'],
  [89, 'JHN.20.15', 2, 'Rappel de Marie-Madeleine prenant Jésus ressuscité pour le jardinier.'],
  [89, 'LUK.24.18', 2, 'Rappel des disciples d’Emmaüs prenant Jésus pour un étranger à Jérusalem.'],
  [89, 'MAT.14.26', 2, 'Rappel des disciples prenant Jésus marchant sur la mer pour un fantôme.'],
  [236, 'PHP.2.7', 2, 'Reprise du Christ vu sur la croix dans la condition ou forme de serviteur.'],
  [250, 'JHN.6.51', 1, 'Citation : le Christ est le pain vivant descendu du ciel.'],
  [333, '1CO.1.10', 2, 'Nouvelle reprise de l’exhortation apostolique à demeurer dans un même sentiment et à parler de même.'],
  [385, '1CO.10.1', 3, 'Explication de la mer et de la nuée comme figures sacramentelles.'],
  [385, '1CO.10.2', 3, 'Explication du baptême des pères dans la nuée et dans la mer.'],
  [386, '1CO.10.2', 2, 'Reprise explicite de la parole apostolique sur les pères baptisés dans la nuée et la mer.'],
  [388, '1CO.10.1', 3, 'Explication de la nuée et de la mer comme réalités matérielles accompagnées de la grâce invisible.'],
  [388, '1CO.10.2', 3, 'Explication de leur vertu baptismale par la grâce sanctifiante de l’Esprit.'],
  [389, '1CO.10.1', 3, 'Suite de l’explication de la nuée et de la mer : forme visible et vertu spirituelle.'],
  [389, '1CO.10.2', 3, 'Suite de l’explication du baptême figuré : la vertu spirituelle n’est visible qu’à l’esprit.'],
  [394, '1CO.10.3', 3, 'Explication de l’unique Christ nourrissant déjà Israël dans la nourriture spirituelle.'],
  [394, '1CO.10.4', 3, 'Explication de l’unique Christ abreuvant déjà Israël dans le désert.'],
  [397, '1CO.10.4', 3, 'Explication de la pierre spirituelle comme présence figurée du Christ abreuvant Israël.'],
  [401, '1CO.10.3', 3, 'Interprétation de la manne tombée du ciel comme corps du Christ.'],
  [401, '1CO.10.4', 3, 'Interprétation de l’eau sortie du rocher comme sang du Christ.'],
  [403, 'PSA.77.25', 3, 'Explication du pain des anges à la fois par la manne et par le mystère eucharistique.'],
  [404, 'PSA.77.25', 3, 'Suite de l’explication : le Christ est la nourriture spirituelle des fidèles et des anges.'],
  [406, 'LUK.22.19', 3, 'Explication du mystère du corps déjà accompli par le Christ avant sa passion.'],
  [406, 'LUK.22.20', 3, 'Explication du mystère du sang déjà accompli par le Christ avant sa passion.'],
  [408, 'LUK.22.19', 3, 'Suite du raisonnement sur le pain changé sacramentellement avant que le corps du Christ souffre.'],
  [408, 'LUK.22.20', 3, 'Suite du raisonnement sur le vin changé sacramentellement avant que le sang du Christ soit répandu.'],
  [409, '1CO.10.3', 3, 'Parallèle entre l’institution et la manne comprise comme chair du Christ avant la passion.'],
  [409, '1CO.10.4', 3, 'Parallèle entre l’institution et l’eau du rocher comprise comme sang du Christ avant la passion.'],
  [414, 'JHN.6.62', 3, 'Interprétation de l’ascension du Fils de l’homme comme réfutation d’une manducation corporelle.'],
  [415, 'JHN.6.62', 3, 'Suite de l’interprétation : l’ascension du corps entier conduit à comprendre la manducation mystique.'],
  [431, 'PRO.23.1', 1, 'Citation : à la table d’un grand, prendre garde à ce qui est servi devant soi.'],
  [432, 'PRO.23.1', 3, 'Interprétation de la table du grand comme participation au sacrifice et méditation du corps et du sang du Seigneur.'],
  [466, 'MAT.26.26', 1, 'Citation des paroles de l’institution : « Ceci est mon Corps ».'],
  [490, 'LUK.11.3', 2, 'Reprise du pain quotidien demandé chaque jour par les fidèles.'],
  [495, 'JHN.19.34', 2, 'Rappel du sang qui coula du côté du Christ.'],
  [496, 'JHN.19.34', 2, 'Reprise du vrai sang sorti du vrai corps du Christ transpercé.'],
  [498, 'JHN.19.34', 2, 'Reprise du sang tiré du côté du Christ par la lance du soldat.'],
  [500, 'JHN.19.34', 3, 'Le sang sorti sous le coup de lance sert à distinguer le sang corporel du sang reçu spirituellement.'],
  [502, 'JHN.19.34', 2, 'Rappel de la chair crucifiée et du sang répandu par le coup de lance.'],
  [525, 'JHN.6.61', 3, 'Explication du scandale des disciples devant les paroles sur la chair et le sang.'],
  [525, 'JHN.6.63', 3, 'Explication du passage de la chair à l’Esprit et des sens à la foi.'],
  [559, 'JHN.10.30', 1, 'Citation : le Fils et le Père ne sont qu’un.'],
  [559, 'COL.2.9', 2, 'Reprise de la plénitude de la divinité qui réside dans le Christ homme.'],
];

const unique = new Set(L.map(([numero, canonId, type]) => `${numero}|${canonId}|${type}`));
if (unique.size !== L.length) throw new Error('Doublon dans le complément de lecture.');
const { data: segments, error: segmentError } = await db.from('segments')
  .select('id,segment_numero').eq('id_oeuvre', WORK).order('segment_numero');
if (segmentError) throw segmentError;
if (segments.length !== 568) throw new Error(`568 segments attendus, ${segments.length} trouvés.`);
const byNumber = new Map(segments.map((segment) => [segment.segment_numero, segment.id]));
if (L.some(([numero]) => !byNumber.has(numero))) throw new Error('Segment du complément absent.');

const targets = [...new Set(L.map(([, canonId]) => canonId))];
const { data: verses, error: verseError } = await db.from('versets_lecture').select('id_verset').in('id_verset', targets);
if (verseError) throw verseError;
const present = new Set((verses ?? []).map((verse) => verse.id_verset));
const missing = targets.filter((target) => !present.has(target));
if (missing.length) throw new Error(`Cibles absentes : ${missing.join(', ')}`);

const ids = segments.map((segment) => segment.id);
const live = [];
for (let i = 0; i < ids.length; i += 200) {
  const { data, error } = await db.from('liens_bibliques').select('segment_id,canon_id,type').in('segment_id', ids.slice(i, i + 200));
  if (error) throw error;
  live.push(...(data ?? []));
}
const numberById = new Map(segments.map((segment) => [segment.id, segment.segment_numero]));
const liveKeys = new Set(live.map((row) => `${numberById.get(row.segment_id)}|${row.canon_id}|${row.type}`));
const additionsAlreadyPresent = [...unique].filter((item) => liveKeys.has(item)).length;
if (!([EXPECTED_BEFORE, EXPECTED_BEFORE + L.length].includes(live.length))) {
  throw new Error(`Préétat divergent : ${live.length} liens au lieu de ${EXPECTED_BEFORE} ou ${EXPECTED_BEFORE + L.length}.`);
}
if (live.length === EXPECTED_BEFORE && additionsAlreadyPresent !== 0) throw new Error('Complément partiellement présent.');
if (live.length === EXPECTED_BEFORE + L.length && additionsAlreadyPresent !== L.length) throw new Error('Complément final divergent.');

const report = {
  work: WORK,
  apply: APPLY,
  before_links: live.length,
  additions: L.length,
  final_links: EXPECTED_BEFORE + L.length,
  types: Object.fromEntries([1, 2, 3, 4].map((type) => [type, L.filter(([, , value]) => value === type).length])),
  already_applied: additionsAlreadyPresent === L.length,
  segments_to_mark_reviewed: segments.length,
};
console.log(JSON.stringify(report, null, 2));
if (!APPLY) process.exit(0);

const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const values = L.map(([numero, canonId, type, motif]) =>
  `(${numero},${quote(canonId)},${type},${quote(motif)})`).join(',\n      ');
const sql = `do $ratramne$
declare n integer;
begin
  perform 1 from oeuvres where id_oeuvre=${quote(WORK)} and note=${quote(MARKER)} for update;
  if not found then raise exception 'Œuvre absente ou non dépubliée'; end if;
  select count(*) into n from segments where id_oeuvre=${quote(WORK)};
  if n<>568 then raise exception 'Segments inattendus : %', n; end if;
  select count(*) into n from liens_bibliques l join segments s on s.id=l.segment_id where s.id_oeuvre=${quote(WORK)};
  if n=${EXPECTED_BEFORE} then
    insert into liens_bibliques(segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis)
    select s.id,v.canon_id,v.type,'vérifié',v.motif,'lecture',false
    from (values
      ${values}
    ) as v(segment_numero,canon_id,type,motif)
    join segments s on s.id_oeuvre=${quote(WORK)} and s.segment_numero=v.segment_numero;
    get diagnostics n=row_count;
    if n<>${L.length} then raise exception 'Insertions incomplètes : %/${L.length}', n; end if;
  elsif n<>${EXPECTED_BEFORE + L.length} then
    raise exception 'Préétat divergent : % liens', n;
  end if;
  update segments set liens_revus_le=now(), liens_revus_par=${quote(REVIEWER)} where id_oeuvre=${quote(WORK)};
  get diagnostics n=row_count;
  if n<>568 then raise exception 'Marquage de lecture incomplet : %/568', n; end if;
  update catalogue_notices set presence_sur_le_site=false where id_oeuvre_stable=${quote(WORK)};
end $ratramne$;`;
const { error: applyError } = await db.rpc('exec_sql', { sql });
if (applyError) throw applyError;

const { count: linkCount, error: linkCountError } = await db.from('liens_bibliques')
  .select('id', { count: 'exact', head: true }).in('segment_id', ids);
if (linkCountError) throw linkCountError;
const { count: reviewCount, error: reviewCountError } = await db.from('segments')
  .select('id', { count: 'exact', head: true }).eq('id_oeuvre', WORK).eq('liens_revus_par', REVIEWER).not('liens_revus_le', 'is', null);
if (reviewCountError) throw reviewCountError;
if (linkCount !== EXPECTED_BEFORE + L.length || reviewCount !== 568) {
  throw new Error(`Postcontrôle en échec : liens=${linkCount}, segments relus=${reviewCount}.`);
}
console.log(JSON.stringify({ ...report, applied: true, postcheck: 'ok' }, null, 2));
