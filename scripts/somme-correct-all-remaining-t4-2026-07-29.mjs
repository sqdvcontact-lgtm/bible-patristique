import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const OEUVRE = 'A0013O0002';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Reprises verbales suffisamment distinctives pour dépasser la simple évocation.
const t2 = new Set([
  93249, 93263, 56911, 58129, 58216, 58227, 90739, 90755,
]);

// Interprétations, applications, typologies ou inférences portant précisément sur le passage.
const t3 = new Set([
  93610, 92250, 92251, 92937, 92977, 93061, 93066, 54701, 54778, 54779,
  55255, 89110, 56262, 56782, 89857, 89859, 89860, 89861, 57088, 89871,
  89872, 89873, 57118, 57500, 57701, 89925, 57753, 90014, 57826, 57827,
  90027, 90028, 57873, 57874, 57875, 59465, 57880, 59466, 58003, 58066,
  58097, 58125, 90074, 58139, 58318, 58511, 59505, 58553, 58554, 58567,
  58579, 58585, 58625, 58626, 90136, 90265, 90266, 90278, 90286, 90318,
  90319, 90323, 90326, 90327, 90333, 90338, 90342, 90348, 90351, 90357,
  90640, 90641, 95791, 95792, 95793, 90723, 90729, 90736, 90738, 90741,
  90742, 90747, 90753, 90791, 90792, 90793, 90838, 90908, 90932, 90972,
  90973, 90978, 90979, 90993,
]);

const ids = [...t2, ...t3];
if (ids.length !== new Set(ids).size) throw new Error('Décisions dupliquées');

const scope = [];
for (let from = 0; ; from += 500) {
  const { data, error } = await db.from('segments').select('id').eq('id_oeuvre', OEUVRE).order('id').range(from, from + 499);
  if (error) throw error;
  scope.push(...data);
  if (data.length < 500) break;
}
const scopeIds = scope.map(({ id }) => id);
const current = [];
for (let offset = 0; offset < scopeIds.length; offset += 250) {
  const { data, error } = await db.from('liens_bibliques').select('id,segment_id,type,fiabilite,provenance,arbitrage_requis,canon_id')
    .in('segment_id', scopeIds.slice(offset, offset + 250)).eq('type', 4).order('id');
  if (error) throw error;
  current.push(...data);
}
if (current.length !== 169) throw new Error(`Préétat divergent : ${current.length} T4 au lieu de 169`);
const byId = new Map(current.map((row) => [row.id, row]));
for (const id of ids) {
  const row = byId.get(id);
  if (!row || row.fiabilite !== 'probable' || row.provenance !== 'lecture' || row.arbitrage_requis)
    throw new Error(`Préétat divergent pour le lien ${id}`);
}

const updates = ids.map((id) => {
  const type = t2.has(id) ? 2 : 3;
  const target = byId.get(id).canon_id;
  return {
    id,
    type,
    motif: type === 2
      ? `Reprise verbale reconnaissable du passage biblique. Cible : ${target}.`
      : `Interprétation ou application précise du passage biblique dans l’argument. Cible : ${target}.`,
  };
});

const report = {
  ready: true,
  applied: APPLY,
  audited_t4: current.length,
  reclassified_t2: t2.size,
  reclassified_t3: t3.size,
  retained_true_t4: current.length - updates.length,
};
if (!APPLY) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

const payload = JSON.stringify(updates).replaceAll("'", "''");
const sql = `do $audit$ declare n integer; begin
  perform 1 from liens_bibliques where id=any(array[${current.map(({ id }) => id).join(',')}]::bigint[]) for update;
  select count(*) into n from liens_bibliques where id=any(array[${current.map(({ id }) => id).join(',')}]::bigint[]) and type=4 and fiabilite='probable' and provenance='lecture' and not arbitrage_requis;
  if n<>169 then raise exception 'préétat T4 divergent %/169',n; end if;
  update liens_bibliques l set type=x.type,motif=x.motif
  from jsonb_to_recordset('${payload}'::jsonb) x(id bigint,type integer,motif text)
  where l.id=x.id;
  get diagnostics n=row_count;
  if n<>${updates.length} then raise exception 'reclassements %/${updates.length}',n; end if;
end $audit$;`;
const { error: applyError } = await db.rpc('exec_sql', { sql });
if (applyError) throw applyError;
console.log(JSON.stringify(report, null, 2));
