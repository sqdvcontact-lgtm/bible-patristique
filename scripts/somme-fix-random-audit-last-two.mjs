import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const APPLY = process.argv.includes('--apply');
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const patches = [
  { id: 95220, type: 2, motif: 'Reprise, par l’intermédiaire de Gratien, de la règle évangélique demandant de faire à autrui ce que l’on voudrait recevoir. Cible : MAT.7.12.' },
  { id: 90726, type: 3, motif: 'Interprétation du repas du Ressuscité comme démonstration volontaire de la permanence de sa nature humaine. Cible : LUK.24.43.' },
];
const { data: before, error } = await db.from('liens_bibliques').select('*').in('id', patches.map((row) => row.id)).order('id');
if (error) throw error;
if (before.length !== 2 || before.some((row) => row.type !== 4 || row.fiabilite !== 'probable' || row.provenance !== 'lecture' || row.arbitrage_requis))
  throw new Error(`Préétat divergent: ${JSON.stringify(before)}`);
if (!APPLY) {
  console.log(JSON.stringify({ ready: true, applied: false, patches }, null, 2));
  process.exit(0);
}
const sql = `do $audit$ declare n integer; begin
  perform 1 from liens_bibliques where id in (95220,90726) for update;
  select count(*) into n from liens_bibliques where id in (95220,90726) and type=4 and fiabilite='probable' and provenance='lecture' and not arbitrage_requis;
  if n<>2 then raise exception 'préétat %/2',n; end if;
  update liens_bibliques l set type=x.type,motif=x.motif
  from jsonb_to_recordset('${JSON.stringify(patches).replaceAll("'", "''")}'::jsonb) x(id bigint,type integer,motif text) where l.id=x.id;
  get diagnostics n=row_count; if n<>2 then raise exception 'updates %/2',n; end if;
end $audit$;`;
const { error: applyError } = await db.rpc('exec_sql', { sql });
if (applyError) throw applyError;
console.log(JSON.stringify({ applied: true, patches: 2 }, null, 2));
