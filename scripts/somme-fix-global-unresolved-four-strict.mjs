import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const ROOT = 'tmp/somme-liens-audit-2026-07-29';
const ids = [59097, 59098, 88686, 88687];
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const must = async (query, label) => {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
};
const live = () => must(sb.from('liens_bibliques').select('*').in('id', ids).order('id'), 'liens');
const snapshot = (label, rows) => {
  mkdirSync(ROOT, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
  const name = `GLOBAL-UNRESOLVED-FOUR-${label}-${stamp}.json`;
  const body = `${JSON.stringify(rows, null, 2)}\n`;
  writeFileSync(`${ROOT}/${name}`, body);
  writeFileSync(`${ROOT}/${name}.sha256`, `${createHash('sha256').update(body).digest('hex')}  ${name}\n`);
  return `${ROOT}/${name}`;
};
const rows = await live();
const before = snapshot('live-before', rows);
const byId = new Map(rows.map((row) => [row.id, row]));
const done = rows.length === 2 && [59097, 59098].every((id) => {
  const row = byId.get(id);
  return row?.canon_id == null && row?.verset_v2_id == null && row?.livre === 'EXO'
    && row?.chapitre === 20 && row?.type === 3 && row?.fiabilite === 'vérifié'
    && row?.provenance === 'lecture' && row?.arbitrage_requis === false && row?.motif?.trim();
});
const exact = rows.length === 4 && ids.every((id) => {
  const row = byId.get(id);
  return row && row.canon_id == null && row.verset_v2_id == null && row.livre == null
    && row.chapitre == null && row.type === 4 && row.fiabilite === 'à constituer'
    && row.provenance === 'lecture' && row.arbitrage_requis === true;
});
if (!exact && !done) throw new Error(`État divergent : ${before}`);
if (!APPLY) {
  console.log(JSON.stringify({ ready: true, applied: false, noop_if_applied: done, before,
    updates: [59097, 59098], deletes: [88686, 88687],
    rationale: 'Décalogue entier => EXO 20 T3 ; Judas multi-locus sans indice => retrait du graphe actif.' }, null, 2));
  process.exit(0);
}
if (done) {
  console.log(JSON.stringify({ applied: false, noop: true, before }, null, 2));
  process.exit(0);
}
const sql = `set local statement_timeout='120s';
do $audit$ declare n integer; begin
  perform 1 from liens_bibliques where id=any(array[59097,59098,88686,88687]::bigint[]) for update;
  select count(*) into n from liens_bibliques where id=any(array[59097,59098,88686,88687]::bigint[])
    and canon_id is null and verset_v2_id is null and livre is null and chapitre is null
    and type=4 and fiabilite='à constituer' and provenance='lecture' and arbitrage_requis;
  if n<>4 then raise exception 'préétat %/4',n; end if;
  update liens_bibliques set canon_id=null,verset_v2_id=null,livre='EXO',chapitre=20,type=3,
    fiabilite='vérifié',motif='Le Décalogue entier est mobilisé comme unité législative pour classer l’aumône ou la correction fraternelle parmi les préceptes.',
    provenance='lecture',arbitrage_requis=false where id in(59097,59098);
  get diagnostics n=row_count; if n<>2 then raise exception 'updates %/2',n; end if;
  delete from liens_bibliques where id in(88686,88687);
  get diagnostics n=row_count; if n<>2 then raise exception 'deletes %/2',n; end if;
  select count(*) into n from liens_bibliques where id in(59097,59098)
    and canon_id is null and verset_v2_id is null and livre='EXO' and chapitre=20
    and type=3 and fiabilite='vérifié' and provenance='lecture' and not arbitrage_requis and btrim(motif)<>'';
  if n<>2 then raise exception 'postétat %/2',n; end if;
  select count(*) into n from versets_canon where livre='EXO' and ch_canon=20;
  if n=0 then raise exception 'chapitre EXO 20 absent'; end if;
end $audit$;`;
const { error } = await sb.rpc('exec_sql', { sql });
if (error) throw new Error(`Transaction annulée : ${error.message}`);
const afterRows = await live();
const after = snapshot('live-after', afterRows);
if (afterRows.length !== 2) throw new Error(`Postétat divergent : ${after}`);
console.log(JSON.stringify({ applied: true, before, after, updates: 2, deletes: 2 }, null, 2));
