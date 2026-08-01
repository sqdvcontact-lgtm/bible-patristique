// Mise en sécurité réversible après audit : aucun lien supprimé, toutes les strates
// « editeur » et « lecture » de la Somme sont remises en arbitrage.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const OEUVRE = 'A0013O0002';
const root = 'tmp/somme-liens-audit-2026-07-29';
mkdirSync(root, { recursive: true });
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((x) => x && !x.startsWith('#')).map((x) => {
  const i = x.indexOf('='); return [x.slice(0, i), x.slice(i + 1).replace(/^['"]|['"]$/g, '')];
}));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const segments = [];
for (let start = 0; ; start += 1000) {
  const { data, error } = await sb.from('segments').select('id,segment_numero,liens_revus_le').eq('id_oeuvre', OEUVRE).order('id').range(start, start + 999);
  if (error) throw error; segments.push(...data); if (data.length < 1000) break;
}
const links = [];
for (let i = 0; i < segments.length; i += 250) {
  const { data, error } = await sb.from('liens_bibliques').select('*').in('segment_id', segments.slice(i, i + 250).map((s) => s.id)).order('id');
  if (error) throw error; links.push(...data);
}
const payload = `${JSON.stringify({ exported_at: new Date().toISOString(), oeuvre: OEUVRE, segments, links }, null, 2)}\n`;
writeFileSync(`${root}/before.json`, payload);
writeFileSync(`${root}/before.json.sha256`, `${createHash('sha256').update(payload).digest('hex')}  before.json\n`);
const ids = links.filter((l) => ['editeur', 'lecture'].includes(l.provenance) && !l.arbitrage_requis).map((l) => l.id);
const values = ids.map((id) => `(${Number(id)})`).join(',');
const sql = `do $v$ declare n integer; begin
with ids(id) as (values ${values})
update liens_bibliques l set arbitrage_requis=true from ids where l.id=ids.id and not l.arbitrage_requis;
get diagnostics n=row_count; if n<>${ids.length} then raise exception 'Attendus ${ids.length}, obtenus %',n; end if;
end $v$;`;
const { error: execError } = await sb.rpc('exec_sql', { sql });
if (execError) throw execError;
console.log(JSON.stringify({ oeuvre: OEUVRE, links_backed_up: links.length, returned_to_arbitration: ids.length, deleted: 0, backup: `${root}/before.json` }, null, 2));
