import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const APPLY = process.argv.includes('--apply');
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const t2 = new Set([94283, 94532, 94534, 94548, 94814, 94815, 94816, 95158]);
const t3 = new Set([94282, 94342, 94352, 94377, 94447, 94473, 94503, 94508, 94516, 94517, 94531, 94706, 95431]);
const keep = new Set([94373, 94374, 94375, 94995, 95054]);
const ids = [...t2, ...t3, ...keep];
const { data: rows, error } = await db.from('liens_bibliques').select('*').in('id', ids).order('id');
if (error) throw error;
if (rows.length !== 26 || rows.some((row) => row.type !== 4 || row.fiabilite !== 'probable' || row.provenance !== 'lecture' || row.arbitrage_requis))
  throw new Error(`Préétat divergent: ${JSON.stringify(rows)}`);
const reasons = {
  94282: 'Interprétation de 1 Thessaloniciens 4,15 sur le sort de ceux qui seront vivants à l’avènement du Seigneur.',
  94283: 'Reprise de la supériorité du don du Christ sur la faute d’Adam.',
  94342: 'Interprétation de la Sagesse établie dès l’éternité comme raison divine et loi éternelle.',
  94352: 'Interprétation de la loi ancienne comme pédagogie de l’enfance ordonnée à la perfection évangélique.',
  94377: 'Application des vices contre nature à l’effacement des préceptes secondaires de la loi naturelle.',
  94447: 'Interprétation de la circoncision comme sceau de la justice de la foi et signe de la promesse.',
  94473: 'Interprétation de la loi ancienne comme pédagogie adaptée à un peuple encore imparfait.',
  94503: 'Interprétation par le Christ des œuvres nécessaires qui ne violent pas le sabbat.',
  94508: 'Interprétation par le Christ des œuvres nécessaires qui ne violent pas le sabbat.',
  94516: 'Commentaire de Lévitique 24 comme complément du Décalogue contre le blasphème.',
  94517: 'Commentaire de Deutéronome 13 comme complément du Décalogue contre l’enseignement idolâtrique.',
  94531: 'Interprétation de la formule paulinienne selon laquelle celui qui accomplit les préceptes vivra par eux.',
  94532: 'Reprise de la prescription des franges aux pans des vêtements.',
  94534: 'Reprise de la prescription des lampes alimentées par l’huile d’olive.',
  94548: 'Reprise des offrandes et des dons rituels mentionnés en Hébreux 9,9.',
  94706: 'Interprétation de la loi comme pédagogue conduisant au Christ et de la cessation de son statut obligatoire.',
  94814: 'Reprise du commandement missionnaire adressé à toutes les nations.',
  94815: 'Reprise du commandement de prêcher l’Évangile à toute créature.',
  94816: 'Reprise de la domination confiée à l’homme sur les créatures.',
  95158: 'Reprise du mandat de peupler la terre et d’exercer la domination sur les êtres vivants.',
  95431: 'Application d’ensemble des bénédictions temporelles de Deutéronome 28 à la question du mérite.',
};
const updates = rows.filter((row) => !keep.has(row.id)).map((row) => ({ id: row.id, type: t2.has(row.id) ? 2 : 3,
  motif: `${reasons[row.id]} Cible : ${row.canon_id ?? `${row.livre}.${row.chapitre}`}.` }));
if (updates.length !== 21 || updates.some((row) => !reasons[row.id])) throw new Error('Dossier incomplet');
if (!APPLY) {
  console.log(JSON.stringify({ ready: true, applied: false, audited: 26, updates: 21, true_t4_retained: 5 }, null, 2));
  process.exit(0);
}
const payload = JSON.stringify(updates).replaceAll("'", "''");
const sql = `do $audit$ declare n integer; begin
  perform 1 from liens_bibliques where id=any(array[${ids.join(',')}]::bigint[]) for update;
  select count(*) into n from liens_bibliques where id=any(array[${ids.join(',')}]::bigint[]) and type=4 and fiabilite='probable' and provenance='lecture' and not arbitrage_requis;
  if n<>26 then raise exception 'préétat %/26',n; end if;
  update liens_bibliques l set type=x.type,motif=x.motif from jsonb_to_recordset('${payload}'::jsonb) x(id bigint,type integer,motif text) where l.id=x.id;
  get diagnostics n=row_count; if n<>21 then raise exception 'updates %/21',n; end if;
  select count(*) into n from liens_bibliques where id=any(array[${[...keep].join(',')}]::bigint[]) and type=4;
  if n<>5 then raise exception 'T4 conservés %/5',n; end if;
end $audit$;`;
const { error: applyError } = await db.rpc('exec_sql', { sql });
if (applyError) throw applyError;
console.log(JSON.stringify({ applied: true, updates: 21, true_t4_retained: 5 }, null, 2));
