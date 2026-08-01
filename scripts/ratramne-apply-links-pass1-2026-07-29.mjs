import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const WORK = 'A0091O0001';
const DEPUBLICATION_MARKER = '[Corpus Scriptura:depublie]';
const REVIEWER = 'IA-lecture';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// [segment_numero, canon_id, type, motif]
// Chaque proposition ci-dessous résulte d'une lecture du passage et d'une
// confrontation au texte de versets_lecture. Les références des notes ne sont
// que des indices : plusieurs sont corrigées par le contenu même de la citation.
const L = [
  [147, '1CO.11.29', 1, 'Citation des mots « ne discernant point le Corps du Seigneur ».'],
  [147, '1CO.11.29', 3, 'Explication de « discerner le Corps » comme le distinguer des aliments communs et en considérer l’excellence.'],
  [176, 'ROM.6.9', 2, 'Reprise de la mort qui n’a plus d’empire sur le Christ ressuscité.'],
  [332, '1CO.1.10', 2, 'Reprise de l’exhortation apostolique à parler un même langage et à demeurer dans un même sentiment.'],
  [341, 'LUK.11.3', 2, 'Reprise de la demande du pain quotidien dans la prière dominicale.'],
  [341, 'JHN.6.51', 1, 'Citation : « Je suis le Pain vivant qui suis descendu du Ciel ».'],
  [341, 'JHN.15.1', 1, 'Citation : « Je suis le vrai cep ».'],
  [341, 'JHN.15.5', 1, 'Citation associée : les disciples sont les sarments.'],
  [355, 'HEB.11.1', 1, 'Citation de la définition de la foi comme démonstration des choses invisibles.'],
  [364, 'MAT.26.26', 1, 'Citation des paroles sur le pain : « prenez et mangez, ceci est mon Corps ».'],
  [364, 'LUK.22.20', 1, 'Citation des paroles sur le calice, nouvelle alliance dans le sang répandu pour les disciples ; la note imprimée mêle Matthieu et Marc.'],
  [384, '1CO.10.1', 1, 'Citation : les pères sous la nuée et le passage de la mer.'],
  [384, '1CO.10.2', 1, 'Citation : les pères baptisés en Moïse dans la nuée et dans la mer.'],
  [384, '1CO.10.3', 1, 'Citation : tous mangèrent la même nourriture spirituelle.'],
  [384, '1CO.10.4', 1, 'Citation : tous burent au rocher spirituel, et le rocher était le Christ.'],
  [387, '1CO.10.1', 3, 'Explication du passage de la nuée et de la mer comme figure du baptême chrétien.'],
  [387, '1CO.10.2', 3, 'Explication du baptême des pères en Moïse comme image du baptême chrétien ; la note [[99]] indique fautivement 1 Co 10,6.'],
  [390, '1CO.10.3', 2, 'Reprise de la manne appelée nourriture spirituelle par Paul.'],
  [390, '1CO.10.4', 2, 'Reprise de l’eau du rocher appelée breuvage spirituel par Paul.'],
  [392, '1CO.10.3', 3, 'Interprétation de la nourriture spirituelle comme type du mystère eucharistique à venir.'],
  [392, '1CO.10.4', 3, 'Interprétation du breuvage spirituel comme type du mystère eucharistique à venir.'],
  [396, '1CO.10.3', 2, 'Rappel introductif de la même nourriture spirituelle mangée par les pères.'],
  [396, '1CO.10.4', 1, 'Citation : « la pierre était Christ ».'],
  [399, '1CO.10.3', 1, 'Citation : les pères ont mangé la même nourriture spirituelle.'],
  [399, '1CO.10.4', 1, 'Citation : les pères ont bu le même breuvage spirituel.'],
  [402, 'PSA.77.25', 1, 'Citation : « L’homme a mangé le Pain des Anges » ; cible locale selon la numérotation grecque.'],
  [402, 'PSA.77.25', 3, 'Explication du pain des anges comme nourriture spirituelle, et non comme manne matérielle destinée aux anges.'],
  [405, 'LUK.22.19', 1, 'Citation des paroles sur le pain et du commandement de faire ceci en mémoire du Christ.'],
  [405, 'LUK.22.20', 1, 'Citation des paroles sur le calice de la nouvelle alliance dans le sang répandu.'],
  [407, 'LUK.22.19', 1, 'Nouvelle citation des paroles sur le corps donné pour les disciples.'],
  [407, 'LUK.22.20', 1, 'Nouvelle citation des paroles sur le calice de la nouvelle alliance.'],
  [410, 'JHN.6.53', 1, 'Citation : nécessité de manger la chair du Fils de l’homme et de boire son sang pour avoir la vie.'],
  [413, 'JHN.6.61', 1, 'Citation de la question du Christ : « Cela vous scandalise-t-il ? »'],
  [413, 'JHN.6.62', 1, 'Citation : le Fils de l’homme remontant où il était auparavant.'],
  [416, 'JHN.6.63', 1, 'Citation : « C’est l’esprit qui vivifie, la chair ne profite de rien ».'],
  [416, 'JHN.6.63', 3, 'Explication de la chair comprise charnellement et de sa réception mystique qui donne la vie.'],
  [417, 'JHN.6.63', 3, 'Explication de l’Esprit qui vivifie comme grâce et efficacité spirituelle du mystère.'],
  [419, 'JHN.6.53', 1, 'Citation de Jean 6,53 dans l’extrait d’Augustin.'],
  [419, 'JHN.6.53', 3, 'Interprétation augustinienne de Jean 6,53 comme figure ordonnant de participer à la passion du Seigneur.'],
  [421, 'JHN.6.66', 2, 'Rappel des disciples qui quittèrent Jésus après avoir compris ses paroles charnellement.'],
  [429, '1PE.2.21', 1, 'Citation : le Christ a souffert pour nous et nous a laissé un exemple afin de suivre ses traces.'],
  [433, 'HEB.7.26', 1, 'Citation du grand prêtre saint, innocent, sans tache et élevé au-dessus des cieux.'],
  [433, 'HEB.7.27', 1, 'Citation du sacrifice offert une fois par le Christ en s’offrant lui-même.'],
  [452, 'PSA.77.25', 1, 'Citation du psalmiste : l’homme a mangé le pain des anges.'],
  [452, 'JHN.6.49', 2, 'Reprise de la manne mangée par les pères morts au désert.'],
  [452, 'JHN.6.50', 1, 'Citation du pain descendu du ciel dont celui qui mange ne meurt pas.'],
  [452, 'JHN.6.51', 2, 'Reprise du pain vivant descendu du ciel et donnant la vie éternelle.'],
  [456, 'JHN.6.50', 1, 'Citation : celui qui mange de ce pain ne mourra jamais.'],
  [456, 'JHN.6.51', 2, 'Reprise du pain vivant descendu du ciel.'],
  [470, 'MAT.26.26', 1, 'Citation : « Ceci est mon Corps ».'],
  [471, 'PSA.33.9', 1, 'Citation : « Goûtez et voyez comme le Seigneur est doux » ; cible locale selon la numérotation grecque.'],
  [471, 'PSA.33.9', 3, 'Interprétation du goût du Seigneur comme goût spirituel, non comme sensation matérielle.'],
  [477, '1CO.10.3', 2, 'Reprise de la nourriture spirituelle des pères comme type du corps du Christ.'],
  [477, '1CO.10.4', 2, 'Reprise du breuvage spirituel des pères comme type du corps du Christ.'],
  [478, 'LAM.4.20', 1, 'Citation des Lamentations : « Le Christ Seigneur est esprit devant notre face ».'],
  [485, 'PSA.103.15', 2, 'Reprise du pain qui fortifie le cœur et du vin qui réjouit le cœur de l’homme.'],
  [485, 'PSA.103.15', 3, 'Interprétation spirituelle du cœur fortifié et réjoui par l’aliment et le breuvage.'],
  [498, 'JHN.6.55', 1, 'Citation : la chair du Christ est vraiment nourriture et son sang vraiment breuvage.'],
  [509, 'EPH.1.23', 2, 'Reprise de l’Église comme corps du Christ, inséparable de sa tête.'],
  [513, 'ROM.6.9', 1, 'Citation : le Christ ressuscité ne meurt plus et la mort n’a plus d’empire sur lui ; la note [[152]] indique fautivement Rm 6,4.'],
  [520, 'JHN.6.50', 1, 'Citation du pain descendu du ciel dont celui qui mange ne meurt pas.'],
  [520, '1CO.10.1', 1, 'Citation : les pères sous la nuée et passant la mer.'],
  [520, '1CO.10.2', 1, 'Citation : les pères baptisés en Moïse dans la nuée et la mer.'],
  [520, '1CO.10.3', 1, 'Citation de la même nourriture spirituelle.'],
  [520, '1CO.10.4', 1, 'Citation du même breuvage spirituel et de la pierre qui était le Christ.'],
  [522, 'JHN.6.61', 1, 'Citation de la question adressée aux disciples scandalisés.'],
  [522, 'JHN.6.62', 1, 'Citation du Fils de l’homme remontant où il était auparavant.'],
  [522, 'JHN.6.62', 3, 'Interprétation de l’ascension comme réponse à l’idée d’un corps distribué par morceaux.'],
  [522, 'JHN.6.63', 1, 'Citation : « C’est l’Esprit qui vivifie, la chair ne profite de rien ».'],
  [522, 'JHN.6.63', 3, 'Explication spirituelle de la chair donnée à manger et de la grâce qui ne se dévore pas avec les dents.'],
  [523, 'ROM.8.9', 1, 'Citation : celui qui n’a pas l’Esprit du Christ n’est pas au Christ.'],
  [523, 'JHN.6.63', 1, 'Citation de l’Esprit qui vivifie et des paroles qui sont esprit et vie.'],
  [523, 'JHN.6.63', 3, 'Explication : les paroles du Christ doivent être entendues spirituellement et non charnellement.'],
  [524, 'JHN.6.63', 1, 'Citation : « les paroles que je vous dis sont esprit et vie » ; la note [[167]] donne fautivement Jean 6,36.'],
  [524, 'JHN.6.63', 3, 'Explication des paroles eucharistiques comme devant être comprises spirituellement.'],
  [544, 'LUK.24.38', 1, 'Citation de la question du Ressuscité aux disciples troublés et hésitants.'],
  [544, 'LUK.24.39', 1, 'Citation : « Touchez et voyez ; un esprit n’a ni chair ni os ».'],
  [545, 'EPH.5.2', 2, 'Reprise du Christ offert pour nous à Dieu comme sacrifice de bonne odeur.'],
  [545, 'ACT.20.28', 1, 'Citation de l’exhortation aux évêques à conduire l’Église acquise par le sang de Dieu.'],
  [550, 'ISA.7.9', 1, 'Citation selon la tradition grecque et vieille latine : « Si vous ne croyez, vous n’entendez point ».'],
  [554, '1CO.12.27', 1, 'Citation : les fidèles sont le corps du Christ et ses membres.'],
  [554, '1CO.10.17', 1, 'Citation : quoique plusieurs, les fidèles ne sont qu’un pain et qu’un corps.'],
  [557, '1CO.10.17', 1, 'Citation : plusieurs en nombre, mais un seul pain et un seul corps dans le Christ.'],
  [561, 'LUK.22.19', 1, 'Citation évangélique : « Faites ceci en mémoire de moi ».'],
  [562, '1CO.11.26', 1, 'Citation : chaque fois que l’on mange ce pain et boit cette coupe, on annonce la mort du Seigneur ; la note [[180]] indique fautivement 1 Co 11,24.'],
  [563, '1CO.13.12', 1, 'Citation partielle et intentionnelle de la vision « face à face » ; la note [[182]] indique fautivement 2 Co 12.'],
  [564, 'JHN.6.63', 1, 'Citation : « C’est l’Esprit qui vivifie, la chair ne profite de rien » ; la note [[183]] indique fautivement Jérémie 6.'],
  [564, 'JHN.6.63', 3, 'Interprétation de Jean 6,63 comme réception spirituelle donnant à l’âme la vie éternelle.'],
];

const key = (row) => `${row.segment_numero}|${row.canon_id}|${row.type}`;
const expectedKeys = new Set(L.map(([segment_numero, canon_id, type]) => key({ segment_numero, canon_id, type })));
if (expectedKeys.size !== L.length) throw new Error('Doublon dans le relevé éditorial.');

const { data: segments, error: segmentError } = await db.from('segments')
  .select('id,segment_numero,rang,segment_texte,liens_revus_le,liens_revus_par')
  .eq('id_oeuvre', WORK).order('segment_numero');
if (segmentError) throw segmentError;
if (segments.length !== 568) throw new Error(`568 segments attendus, ${segments.length} trouvés.`);
const byNumber = new Map(segments.map((segment) => [segment.segment_numero, segment]));
const missingSegments = [...new Set(L.map(([numero]) => numero))].filter((numero) => !byNumber.has(numero));
if (missingSegments.length) throw new Error(`Segments absents : ${missingSegments.join(', ')}`);

const targets = [...new Set(L.map(([, canonId]) => canonId))];
const { data: verses, error: verseError } = await db.from('versets_lecture')
  .select('id_verset').in('id_verset', targets);
if (verseError) throw verseError;
const presentTargets = new Set((verses ?? []).map((row) => row.id_verset));
const missingTargets = targets.filter((target) => !presentTargets.has(target));
if (missingTargets.length) throw new Error(`Cibles canoniques absentes : ${missingTargets.join(', ')}`);

const segmentIds = segments.map((segment) => segment.id);
const existing = [];
for (let i = 0; i < segmentIds.length; i += 200) {
  const { data, error } = await db.from('liens_bibliques')
    .select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis')
    .in('segment_id', segmentIds.slice(i, i + 200));
  if (error) throw error;
  existing.push(...(data ?? []));
}
const numberById = new Map(segments.map((segment) => [segment.id, segment.segment_numero]));
const existingKeys = new Set(existing.map((row) => key({
  segment_numero: numberById.get(row.segment_id), canon_id: row.canon_id, type: row.type,
})));
if (existing.length && (existing.length !== L.length || [...expectedKeys].some((item) => !existingKeys.has(item)))) {
  throw new Error(`Préétat divergent : ${existing.length} liens présents, mais ils ne correspondent pas exactement au relevé.`);
}

const linkedNumbers = new Set(L.map(([numero]) => numero));
const reviewed = segments.filter((segment) => segment.rang === 1 || linkedNumbers.has(segment.segment_numero));
const report = {
  work: WORK,
  apply: APPLY,
  links_expected: L.length,
  linked_segments: linkedNumbers.size,
  reviewed_segments: reviewed.length,
  reviewed_rank_1: reviewed.filter((segment) => segment.rang === 1).length,
  targets: targets.length,
  types: Object.fromEntries([1, 2, 3, 4].map((type) => [type, L.filter(([, , value]) => value === type).length])),
  already_applied: existing.length === L.length,
};
console.log(JSON.stringify(report, null, 2));
if (!APPLY) process.exit(0);

const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const values = L.map(([numero, canonId, type, motif]) =>
  `(${numero},${quote(canonId)},${type},${quote(motif)})`).join(',\n      ');
const reviewedNumbers = reviewed.map((segment) => segment.segment_numero).join(',');
const sql = `do $ratramne$
declare n integer;
begin
  perform 1 from oeuvres where id_oeuvre=${quote(WORK)} for update;
  if not found then raise exception 'Œuvre Ratramne absente'; end if;
  select count(*) into n from segments where id_oeuvre=${quote(WORK)};
  if n<>568 then raise exception 'Segments inattendus : %', n; end if;

  select count(*) into n
  from liens_bibliques l join segments s on s.id=l.segment_id
  where s.id_oeuvre=${quote(WORK)};
  if n=0 then
    insert into liens_bibliques(segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis)
    select s.id,v.canon_id,v.type,'vérifié',v.motif,'lecture',false
    from (values
      ${values}
    ) as v(segment_numero,canon_id,type,motif)
    join segments s on s.id_oeuvre=${quote(WORK)} and s.segment_numero=v.segment_numero;
    get diagnostics n=row_count;
    if n<>${L.length} then raise exception 'Insertions incomplètes : %/${L.length}', n; end if;
  elsif n<>${L.length} then
    raise exception 'Préétat divergent : % liens', n;
  end if;

  update segments set liens_revus_le=now(), liens_revus_par=${quote(REVIEWER)}
  where id_oeuvre=${quote(WORK)} and segment_numero in (${reviewedNumbers});
  get diagnostics n=row_count;
  if n<>${reviewed.length} then raise exception 'Marquage de lecture incomplet : %/${reviewed.length}', n; end if;

  update oeuvres set note=${quote(DEPUBLICATION_MARKER)} where id_oeuvre=${quote(WORK)};
  update catalogue_notices set presence_sur_le_site=false where id_oeuvre_stable=${quote(WORK)};
end $ratramne$;`;
const { error: applyError } = await db.rpc('exec_sql', { sql });
if (applyError) throw applyError;

const { data: liveLinks, error: liveLinkError } = await db.from('liens_bibliques')
  .select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis')
  .in('segment_id', segmentIds);
if (liveLinkError) throw liveLinkError;
const { data: liveWork, error: workError } = await db.from('oeuvres').select('note').eq('id_oeuvre', WORK).single();
if (workError) throw workError;
const { count: reviewedCount, error: reviewedError } = await db.from('segments')
  .select('id', { count: 'exact', head: true }).eq('id_oeuvre', WORK).eq('liens_revus_par', REVIEWER);
if (reviewedError) throw reviewedError;
const failures = (liveLinks ?? []).filter((row) =>
  row.fiabilite !== 'vérifié' || row.provenance !== 'lecture' || row.arbitrage_requis !== false || !row.motif);
if ((liveLinks ?? []).length !== L.length || failures.length || reviewedCount !== reviewed.length || liveWork.note !== DEPUBLICATION_MARKER) {
  throw new Error(`Postcontrôle en échec : liens=${liveLinks?.length}, anomalies=${failures.length}, revus=${reviewedCount}, dépublié=${liveWork.note === DEPUBLICATION_MARKER}`);
}
console.log(JSON.stringify({ ...report, applied: true, postcheck: 'ok', unpublished: true }, null, 2));
