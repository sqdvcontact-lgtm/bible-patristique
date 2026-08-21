import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data: segment, error: segmentError } = await db.from('segments').select('id,segment_numero,segment_texte')
  .eq('id_oeuvre', 'A0013O0002').eq('segment_numero', 17238).single();
if (segmentError) throw segmentError;
const { count, error: linkError } = await db.from('liens_bibliques').select('id', { count: 'exact', head: true }).eq('segment_id', segment.id);
if (linkError) throw linkError;
if (count !== 0 || !/Ga\s*4,\s*9/i.test(segment.segment_texte)) throw new Error('Préétat divergent');
const { count: witnessCount, error: witnessError } = await db.from('versets_lecture').select('id_verset', { count: 'exact', head: true }).eq('id_verset', 'GAL.4.9');
if (witnessError) throw witnessError;
if (witnessCount !== 1) throw new Error('Cible GAL.4.9 absente');
if (!APPLY) {
  console.log(JSON.stringify({ ready: true, applied: false, segment: 17238, additions: 2 }, null, 2));
  process.exit(0);
}
const sql = `do $audit$ declare n integer; sid bigint; begin
  select id into sid from segments where id_oeuvre='A0013O0002' and segment_numero=17238 for update;
  select count(*) into n from liens_bibliques where segment_id=sid;
  if n<>0 then raise exception 'préétat divergent %',n; end if;
  insert into liens_bibliques(segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis) values
    (sid,'GAL.4.9',1,'probable','Citation explicite de Galates 4,9 sur le retour aux éléments pauvres et faibles. Cible : GAL.4.9.','lecture',false),
    (sid,'GAL.4.9',3,'probable','Interprétation de Galates 4,9 : le retour aux observances légales est rapproché de l’idolâtrie. Cible : GAL.4.9.','lecture',false);
  get diagnostics n=row_count;
  if n<>2 then raise exception 'insertions %/2',n; end if;
end $audit$;`;
const { error } = await db.rpc('exec_sql', { sql });
if (error) throw error;
console.log(JSON.stringify({ ready: true, applied: true, segment: 17238, additions: 2 }, null, 2));
