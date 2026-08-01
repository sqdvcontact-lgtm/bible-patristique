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
const { data: segments, error: segmentError } = await sb.from('segments').select('*').eq('id_oeuvre', OEUVRE)
  .eq('ref_niv1', 'Secunda Secundae').eq('ref_niv2', 'Question 20').order('segment_numero');
if (segmentError) throw segmentError;
if (segments.length !== 34 || segments[0].segment_numero !== 13414 || segments.at(-1).segment_numero !== 13447 || segments.some((s) => s.liens_revus_le)) {
  throw new Error('Préétat inattendu des segments de la question 20');
}
const segmentIds = segments.map((s) => s.id);
const { data: links, error: linkError } = await sb.from('liens_bibliques').select('*').in('segment_id', segmentIds).order('id');
if (linkError) throw linkError;
if (links.length !== 9 || links.some((l) => l.type !== 1)) throw new Error('Préétat inattendu des liens de la question 20');
const wrong = links.find((l) => l.id === 54393);
if (!wrong || wrong.canon_id !== 'EPH.4.15') throw new Error('Lien Éphésiens inattendu');
const payload = `${JSON.stringify({ exported_at: new Date().toISOString(), segments, links }, null, 2)}\n`;
writeFileSync(`${root}/ss-q20-before.json`, payload);
writeFileSync(`${root}/ss-q20-before.json.sha256`, `${createHash('sha256').update(payload).digest('hex')}  ss-q20-before.json\n`);
const linkIds = links.map((l) => `(${Number(l.id)})`).join(',');
const segIds = segmentIds.map((id) => `(${Number(id)})`).join(',');
const sql = `do $v$ declare n integer; begin
update liens_bibliques set canon_id='EPH.4.19', motif='Citation directe vérifiée : « qui, de désespoir, se sont livrés… » (Ep 4,19 ; la cible 4,15 était erronée)', provenance='lecture', fiabilite='vérifié', arbitrage_requis=false where id=54393 and canon_id='EPH.4.15';
if not found then raise exception 'Précondition Éphésiens'; end if;
with ids(id) as (values ${linkIds}) update liens_bibliques l set provenance='lecture',fiabilite='vérifié',arbitrage_requis=false from ids where l.id=ids.id;
get diagnostics n=row_count; if n<>9 then raise exception 'Liens Q20 : %',n; end if;
with ids(id) as (values ${segIds}) update segments s set liens_revus_le=now() from ids where s.id=ids.id and s.liens_revus_le is null;
get diagnostics n=row_count; if n<>34 then raise exception 'Segments Q20 : %',n; end if;
end $v$;`;
const { error: execError } = await sb.rpc('exec_sql', { sql });
if (execError) throw execError;
console.log(JSON.stringify({ question: 'Secunda Secundae 20', segments_read: 34, links_verified: 9, targets_corrected: 1, target: 'EPH.4.19' }, null, 2));
