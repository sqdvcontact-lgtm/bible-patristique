import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const root = 'tmp/somme-liens-audit-2026-07-29';
mkdirSync(root, { recursive: true });
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((x) => x && !x.startsWith('#')).map((x) => {
  const i = x.indexOf('='); return [x.slice(0, i), x.slice(i + 1).replace(/^['"]|['"]$/g, '')];
}));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data: segments, error: segmentError } = await sb.from('segments').select('*').eq('id_oeuvre', 'A0013O0002')
  .gte('segment_numero', 13408).lte('segment_numero', 13413).order('segment_numero');
if (segmentError) throw segmentError;
if (segments.length !== 6 || segments.some((s) => s.ref_niv2 !== 'Question 19' || s.liens_revus_le)) throw new Error('Préétat segments Q19');
const { data: links, error: linkError } = await sb.from('liens_bibliques').select('*').in('segment_id', segments.map((s) => s.id)).order('id');
if (linkError) throw linkError;
if (links.length !== 2 || !links.some((l) => l.id === 54391 && l.canon_id === 'PSA.19.8') || !links.some((l) => l.id === 59087 && l.livre === 'MAT' && l.chapitre === 5)) throw new Error('Préétat liens Q19');
const payload = `${JSON.stringify({ exported_at: new Date().toISOString(), segments, links }, null, 2)}\n`;
writeFileSync(`${root}/ss-q19-fin-before.json`, payload);
writeFileSync(`${root}/ss-q19-fin-before.json.sha256`, `${createHash('sha256').update(payload).digest('hex')}  ss-q19-fin-before.json\n`);
const additions = [
  [428953, 'MAT.5.3', 'Commentaire de la pauvreté d’esprit comme effet du don de crainte.'],
  [428954, 'MAT.5.3', 'Commentaire de la première Béatitude, la pauvreté d’esprit.'],
  [428955, 'MAT.5.3', 'Commentaire de la pauvreté d’esprit rapportée directement au don de crainte.'],
  [428955, 'MAT.5.5', 'Commentaire de la Béatitude des larmes, rapportée au don de crainte par conséquence.'],
  [428956, 'MAT.5.3', 'Commentaire de la première Béatitude comme retrait des biens extérieurs.'],
];
const q = (v) => `'${String(v).replaceAll("'", "''")}'`;
const inserts = additions.map(([segment, canon, motif]) => `insert into liens_bibliques(segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis) values(${segment},${q(canon)},3,'vérifié',${q(motif)},'lecture',false);`).join('\n');
const segValues = segments.map((s) => `(${s.id})`).join(',');
const sql = `do $v$ declare n integer; begin
update liens_bibliques set fiabilite='vérifié',provenance='lecture',arbitrage_requis=false,motif='Citation directe vérifiée : « ceux-ci se confient dans les chars… » (Ps 19,8).' where id=54391 and canon_id='PSA.19.8'; if not found then raise exception 'Ps 19,8'; end if;
update liens_bibliques set fiabilite='vérifié',provenance='lecture',arbitrage_requis=false,motif='Commentaire d’ensemble des Béatitudes, spécialement de la pauvreté d’esprit (Mt 5).' where id=59087 and livre='MAT' and chapitre=5; if not found then raise exception 'Mt 5 chapitre'; end if;
${inserts}
with ids(id) as (values ${segValues}) update segments s set liens_revus_le=now() from ids where s.id=ids.id and s.liens_revus_le is null;
get diagnostics n=row_count; if n<>6 then raise exception 'Segments Q19 %',n; end if;
end $v$;`;
const { error: execError } = await sb.rpc('exec_sql', { sql });
if (execError) throw execError;
console.log(JSON.stringify({ question: 'Secunda Secundae 19, fin', segments_read: 6, links_verified: 2, links_added: 5 }, null, 2));
