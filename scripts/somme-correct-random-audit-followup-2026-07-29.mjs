import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const ROOT = 'tmp/somme-liens-audit-2026-07-29';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const must = async (query, label) => {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
};
const sqlString = (value) => `'${String(value).replaceAll("'", "''")}'`;
const sqlJson = (value) => `${sqlString(JSON.stringify(value))}::jsonb`;
function snapshot(label, rows) {
  mkdirSync(ROOT, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
  const name = `SOMME-RANDOM-AUDIT-FOLLOWUP-${label}-${stamp}.json`;
  const body = `${JSON.stringify(rows, null, 2)}\n`;
  writeFileSync(`${ROOT}/${name}`, body);
  writeFileSync(`${ROOT}/${name}.sha256`, `${createHash('sha256').update(body).digest('hex')}  ${name}\n`);
  return `${ROOT}/${name}`;
}

const type1 = new Set([94571, 94585, 94681]);
const type2 = new Set([94563, 94565, 94596, 94609, 94614, 94615, 94619, 94641, 94652, 94653,
  94663, 94673, 94683, 94693, 94841, 94847, 94853, 94869, 94932, 95134, 95383]);
const type3 = new Set([94558, 94587, 94591, 94606, 94613, 94631, 94632, 94637, 94662, 94689,
  94698, 94860, 94862, 94863, 94871, 94889, 94901, 95373, 95376, 95377, 95388, 95421,
  95422, 95424, 95447, 95448, 90582, 90583, 90584, 90585, 90586]);
const deletes = new Set([94836, 94908]);
const keepT4 = new Set([94666, 95423]);
const ids = [...type1, ...type2, ...type3, ...deletes, ...keepT4].sort((a, b) => a - b);
if (new Set(ids).size !== 59) throw new Error(`Dossier incomplet: ${new Set(ids).size}/59`);
const rows = await must(db.from('liens_bibliques').select('*').in('id', ids).order('id'), 'liens ciblés');
const before = snapshot('live-before', rows);
if (rows.length !== ids.length) throw new Error(`Liens absents: ${rows.length}/${ids.length}; ${before}`);
for (const row of rows) {
  if (row.type !== 4 || row.fiabilite !== 'probable' || row.provenance !== 'lecture' || row.arbitrage_requis)
    throw new Error(`Préétat divergent lien ${row.id}; ${before}`);
}
const segmentIds = [...new Set(rows.map((row) => row.segment_id))];
const segments = await must(db.from('segments').select('id,segment_numero,ref_niv1,ref_niv2,ref_niv3,segment_texte,texte_original')
  .in('id', segmentIds).order('segment_numero'), 'segments ciblés');
const segById = new Map(segments.map((segment) => [segment.id, segment]));
const reasons = new Map([
  [11476, 'Application de Romains 13,1 à l’ordre voulu par la sagesse divine.'],
  [11493, 'Reprise de la prescription détaillant l’immolation des oiseaux.'],
  [11497, 'Reprise de la règle sur la consommation des victimes pacifiques.'],
  [11506, 'Citation explicite du Christ s’offrant en victime d’agréable odeur.'],
  [11542, 'Citation explicite de l’ordre donné à Abraham d’offrir son fils sur la montagne indiquée.'],
  [11548, 'Interprétation d’Éphésiens 3,5 sur la révélation plus explicite des mystères dans la nouvelle alliance.'],
  [11554, 'Interprétation de la fumée des parfums comme signe de la sainteté et de la prière des saints.'],
  [11555, 'Reprise narrative de David mangeant les pains réservés aux prêtres.'],
  [11563, 'Commentaire d’ensemble des solennités prescrites aux chapitres 28 et 29 des Nombres.'],
  [11566, 'Application du progrès de vertu en vertu jusqu’à la vision de Dieu.'],
  [11568, 'Reprise de la prescription de manger l’agneau pascal à la hâte.'],
  [11573, 'Discussion d’ensemble du rite de purification décrit en Lévitique 14.'],
  [11574, 'Reprise de l’aspersion et du rasage prescrits pour la purification des lévites.'],
  [11575, 'Reprise de l’introduction au rite de consécration des lévites.'],
  [11578, 'Reprise de l’exclusion de l’incirconcis de la manducation pascale.'],
  [11595, 'Interprétation de l’image d’Israël comme vache rétive et du culte des veaux de Bethaven.'],
  [11614, 'Interprétation du vêtement d’Aaron comme représentation du monde.'],
  [11620, 'Reprise paraphrastique de l’impuissance de ceux qui ne tuent que le corps.'],
  [11626, 'Reprise des interdictions portant sur les objets idolâtriques et sur l’hygiène du camp.'],
  [11628, 'Discussion d’ensemble des interdictions sacerdotales de Lévitique 21.'],
  [11650, 'Interprétation figurative du droit du prédicateur à recevoir sa subsistance.'],
  [11653, 'Reprise narrative des prêtres de Baal se faisant des incisions avec des épées et des lances.'],
  [11666, 'Reprise des rites de consécration des prêtres par le sang et l’huile.'],
  [11673, 'Interprétation des sacrifices pour le péché de Lévitique 4 et 5 comme profession de foi au Christ.'],
  [11675, 'Citation explicite de la purification de la chair obtenue par le sang des victimes.'],
  [11679, 'Reprise narrative de l’ordre donné au lépreux guéri d’accomplir les offrandes légales.'],
  [11686, 'Interprétation du voile déchiré comme signe de l’achèvement des figures légales.'],
  [11690, 'Reprise narrative de Paul faisant circoncire Timothée.'],
  [11698, 'Interprétation de la faute de Pierre et de la réprimande de Paul.'],
  [11878, 'Reprise de l’opposition paulinienne entre loi des œuvres et loi de la foi.'],
  [11882, 'Reprise de la comparaison de la loi ancienne à un pédagogue.'],
  [11890, 'Reprise narrative du Christ touchant et purifiant le lépreux.'],
  [11896, 'Interprétation de l’accomplissement évangélique du précepte sur le serment.'],
  [11898, 'Interprétation des préceptes sur le serment et la répudiation, selon Augustin.'],
  [11899, 'Interprétation des réponses évangéliques par lesquelles le Christ justifie ses œuvres le jour du sabbat.'],
  [11910, 'Reprise des bénédictions temporelles promises à l’observance de l’ancienne loi.'],
  [11911, 'Interprétation de l’enseignement du Christ sur la répudiation.'],
  [11935, 'Reprise narrative des guérisons opérées par les Apôtres au moyen d’onctions d’huile.'],
  [11940, 'Interprétation du droit apostolique de vivre de la prédication.'],
  [11953, 'Commentaire de la porte étroite comme effort requis pour pratiquer l’Évangile.'],
  [11968, 'Application de la triple convoitise johannique aux trois renoncements des conseils évangéliques.'],
  [12071, 'Reprise de la surabondance du don du Christ par rapport à la faute d’Adam.'],
  [30498, 'Application de la parole d’Abraham au mauvais riche à la mémoire des âmes séparées.'],
  [30516, 'Application du feu préparé au démon et à ses anges à la peine des âmes séparées.'],
  [30629, 'Application de la prière pour les morts à l’efficacité des suffrages des vivants.'],
  [30660, 'Application du sacrifice de Judas Maccabée à la possibilité de secourir certains morts.'],
  [30711, 'Application de la joie des anges à l’accroissement de joie des élus pour le bien des vivants.'],
]);
const updates = rows.filter((row) => type1.has(row.id) || type2.has(row.id) || type3.has(row.id)).map((row) => {
  const number = segById.get(row.segment_id).segment_numero;
  const type = type1.has(row.id) ? 1 : type2.has(row.id) ? 2 : 3;
  const reason = reasons.get(number);
  if (!reason) throw new Error(`Motif absent lien ${row.id} segment ${number}`);
  return { id: row.id, type, motif: `${reason} Cible : ${row.canon_id ?? `${row.livre}.${row.chapitre}`}.` };
});
if (updates.length !== 55 || deletes.size !== 2 || keepT4.size !== 2) throw new Error('Comptes de décisions invalides');
const result = { ready: true, applied: false, before, audited: ids.length, updates: updates.length,
  deletes: deletes.size, true_t4_retained: keepT4.size,
  type_counts_after: { 1: type1.size, 2: type2.size, 3: type3.size, 4: keepT4.size } };
if (!APPLY) {
  writeFileSync(`${ROOT}/SOMME-RANDOM-AUDIT-FOLLOWUP-DRY-RUN.json`, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}
const sql = `set local statement_timeout='120s'; do $audit$ declare n integer; begin
  perform 1 from liens_bibliques where id=any(array[${ids.join(',')}]::bigint[]) for update;
  select count(*) into n from liens_bibliques where id=any(array[${ids.join(',')}]::bigint[])
    and type=4 and fiabilite='probable' and provenance='lecture' and not arbitrage_requis;
  if n<>${ids.length} then raise exception 'préétat %/${ids.length}',n; end if;
  update liens_bibliques l set type=x.type,motif=x.motif
    from jsonb_to_recordset(${sqlJson(updates)}) x(id bigint,type integer,motif text) where l.id=x.id;
  get diagnostics n=row_count; if n<>${updates.length} then raise exception 'updates %/${updates.length}',n; end if;
  delete from liens_bibliques where id=any(array[${[...deletes].join(',')}]::bigint[]);
  get diagnostics n=row_count; if n<>${deletes.size} then raise exception 'deletes %/${deletes.size}',n; end if;
  select count(*) into n from liens_bibliques where id=any(array[${[...keepT4].join(',')}]::bigint[]) and type=4;
  if n<>${keepT4.size} then raise exception 'T4 conservés %/${keepT4.size}',n; end if;
  select count(*) into n from (select segment_id,type,canon_id,verset_v2_id,livre,chapitre,count(*)
    from liens_bibliques where segment_id in (select id from segments where id_oeuvre='A0013O0002')
    group by 1,2,3,4,5,6 having count(*)>1) d;
  if n<>0 then raise exception 'doublons %',n; end if;
end $audit$;`;
const { error } = await db.rpc('exec_sql', { sql });
if (error) throw new Error(`Transaction annulée: ${error.message}`);
const after = await must(db.from('liens_bibliques').select('*').in('id', [...updates.map((row) => row.id), ...keepT4]).order('id'), 'postétat');
const afterFile = snapshot('live-after', after);
if (after.length !== updates.length + keepT4.size) throw new Error(`Postétat divergent: ${afterFile}`);
console.log(JSON.stringify({ ...result, ready: false, applied: true, after: afterFile }, null, 2));
