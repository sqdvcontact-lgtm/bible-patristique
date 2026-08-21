import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const root = 'tmp/vulgate-preflight-2026-07-29';
const fixes = [
  ['c28ba018-ff51-42a3-bf99-9470dc1c9814', 'et Azarias, Esdras, et Mosollam', 'et Azarias, Esdras, et Mosollam,'],
  ['97d96276-dc00-4a35-af5a-9d95063bf7aa', 'Vixit autem Job post hæc centum quadraginta annis, et vidit filios suos, et filios filiorum suorum usque ad quartam generationem', 'Vixit autem Job post hæc centum quadraginta annis, et vidit filios suos, et filios filiorum suorum usque ad quartam generationem :'],
  ['671b7630-f614-409f-a575-2717a2388783', 'In allocutione enim desiderii ascendit illis de mari ortygometra', 'In allocutione enim desiderii ascendit illis de mari ortygometra :'],
  ['c9e10adf-00bb-465a-aa38-73b544ccd52b', 'Initium sapientiæ timor Domini : et cum fidelibus in vulva concreatus est', 'Initium sapientiæ timor Domini : et cum fidelibus in vulva concreatus est :'],
  ['ece93b11-a36c-4ca5-a32f-940e36dc7d63', 'et si defecerit sensu, veniam da, et ne spernas eum in virtute tua', 'et si defecerit sensu, veniam da, et ne spernas eum in virtute tua :'],
  ['94ee7314-18fa-499a-bfc8-871060613614', 'Cibabit illum pane vitæ et intellectus, et aqua sapientiæ salutaris potabit illum', 'Cibabit illum pane vitæ et intellectus, et aqua sapientiæ salutaris potabit illum :'],
  ['03c4eb6b-420d-4211-be64-35a2e149c262', 'Et sicut sexcenta millia peditum, qui congregati sunt in duritia cordis sui', 'Et sicut sexcenta millia peditum, qui congregati sunt in duritia cordis sui :'],
];
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((x) => x && !x.startsWith('#')).map((x) => {
  const i = x.indexOf('='); return [x.slice(0, i), x.slice(i + 1).replace(/^['"]|['"]$/g, '')];
}));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const ids = fixes.map(([id]) => id);
const { data, error } = await sb.from('versets_v2').select('*').in('id', ids).order('id');
if (error) throw error;
if (data.length !== 7) throw new Error(`Préétat incomplet : ${data.length}/7`);
for (const [id, before] of fixes) {
  const row = data.find((item) => item.id === id);
  if (!row || row.trad_id !== 'TR0004' || row.texte !== before) throw new Error(`Précondition textuelle échouée : ${id}`);
}
const payload = `${JSON.stringify({ exported_at: new Date().toISOString(), rows: data }, null, 2)}\n`;
writeFileSync(`${root}/TR0004-seven-punctuation-before.json`, payload);
writeFileSync(`${root}/TR0004-seven-punctuation-before.json.sha256`, `${createHash('sha256').update(payload).digest('hex')}  TR0004-seven-punctuation-before.json\n`);
const q = (value) => `'${String(value).replaceAll("'", "''")}'`;
const statements = fixes.map(([id, before, after]) => `update versets_v2 set texte=${q(after)} where id=${q(id)}::uuid and trad_id='TR0004' and texte=${q(before)}; get diagnostics n=row_count; if n<>1 then raise exception 'Précondition %',${q(id)}; end if;`).join('\n');
const sql = `do $v$ declare n integer; begin
${statements}
select count(*) into n from versets_v2 where trad_id='TR0004'; if n<>36004 then raise exception 'Total %',n; end if;
select count(*) into n from versets_v2 where trad_id='TR0004' and alignement_verifie; if n<>36004 then raise exception 'Vérifiées %',n; end if;
end $v$;`;
const { error: execError } = await sb.rpc('exec_sql', { sql });
if (execError) throw execError;
console.log(JSON.stringify({ corrected: 7, total: 36004, verified: 36004, backup: `${root}/TR0004-seven-punctuation-before.json` }, null, 2));
