import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const root = 'tmp/vulgate-preflight-2026-07-29';
const dossier = JSON.parse(readFileSync(`${root}/TR0004-philology-final-12.json`, 'utf8'));
const ids = dossier.map((x) => x.vulgate.id);
if (ids.length !== 12 || new Set(ids).size !== 12) throw new Error('Lot final invalide');

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((x) => x && !x.startsWith('#')).map((x) => {
    const i = x.indexOf('=');
    return [x.slice(0, i), x.slice(i + 1).replace(/^['"]|['"]$/g, '')];
  }),
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data, error } = await sb.from('versets_v2').select('*').in('id', ids).order('id');
if (error) throw error;
if (data.length !== 12 || data.some((x) => x.trad_id !== 'TR0004' || x.alignement_verifie)) {
  throw new Error('Préétat final inattendu');
}

const payload = `${JSON.stringify({ exported_at: new Date().toISOString(), rows: data }, null, 2)}\n`;
writeFileSync(`${root}/TR0004-final-12-before.json`, payload);
writeFileSync(
  `${root}/TR0004-final-12-before.json.sha256`,
  `${createHash('sha256').update(payload).digest('hex')}  TR0004-final-12-before.json\n`,
);

const values = ids.map((id) => `('${id}'::uuid)`).join(',');
const sql = `do $v$ declare n integer; begin
with ids(id) as (values ${values})
update versets_v2 v set alignement_verifie=true from ids
where v.id=ids.id and v.trad_id='TR0004' and not v.alignement_verifie;
get diagnostics n=row_count;
if n<>12 then raise exception '12 attendues, %',n; end if;
select count(*) into n from versets_v2 where trad_id='TR0004';
if n<>36004 then raise exception 'Total %',n; end if;
select count(*) into n from versets_v2 where trad_id='TR0004' and alignement_verifie;
if n<>36004 then raise exception 'Vérifiées %',n; end if;
select count(*) into n from versets_v2 where trad_id='TR0004' and not alignement_verifie;
if n<>0 then raise exception 'Résiduelles %',n; end if;
select count(*) into n from versets_v2 where trad_id='TR0004' and canon_id is not null;
if n<>35721 then raise exception 'Canoniques %',n; end if;
update editions_sources
set particularites=replace(particularites,
  '35 992 alignements vérifiés ; 12 restent à contrôler.',
  '36 004 alignements vérifiés ; aucun alignement ne reste à contrôler.')
where trad_id='TR0004'
  and particularites like '%35 992 alignements vérifiés ; 12 restent à contrôler.%';
if not found then raise exception 'Notice'; end if;
end $v$;`;
const { error: execError } = await sb.rpc('exec_sql', { sql });
if (execError) throw execError;
console.log(JSON.stringify({ validated: 12, total: 36004, verified: 36004, residual: 0, canonical: 35721 }, null, 2));
