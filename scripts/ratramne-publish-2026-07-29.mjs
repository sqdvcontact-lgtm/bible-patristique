import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const WORK = 'A0091O0001';
const NOTICE = 1937;
const MARKER = '[Corpus Scriptura:depublie]';
const PUBLIC_NOTE = 'Édition bilingue latin-français. Le latin est aligné par paragraphe dans texte_original.';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: work, error: workError } = await db.from('oeuvres').select('id_oeuvre,note').eq('id_oeuvre', WORK).single();
if (workError) throw workError;
if (![MARKER, PUBLIC_NOTE].includes(work.note)) throw new Error(`Note d’œuvre inattendue : ${work.note}`);
const { data: notice, error: noticeError } = await db.from('catalogue_notices').select('id,presence_sur_le_site').eq('id', NOTICE).single();
if (noticeError) throw noticeError;
const { data: segments, error: segmentError } = await db.from('segments')
  .select('id,liens_revus_le,liens_revus_par').eq('id_oeuvre', WORK);
if (segmentError) throw segmentError;
if (segments.length !== 568 || segments.some((segment) => !segment.liens_revus_le || segment.liens_revus_par !== 'IA-lecture')) {
  throw new Error('Lecture intégrale non attestée sur les 568 segments.');
}
const ids = segments.map((segment) => segment.id);
const links = [];
for (let i = 0; i < ids.length; i += 200) {
  const { data, error } = await db.from('liens_bibliques')
    .select('id,fiabilite,provenance,arbitrage_requis,motif').in('segment_id', ids.slice(i, i + 200));
  if (error) throw error;
  links.push(...(data ?? []));
}
if (links.length !== 139 || links.some((link) => link.fiabilite !== 'vérifié'
  || link.provenance !== 'lecture' || link.arbitrage_requis !== false || !link.motif?.trim())) {
  throw new Error('Corpus de liens incomplet ou non conforme.');
}
console.log(JSON.stringify({ apply: APPLY, ready: true, already_published: work.note === PUBLIC_NOTE && notice.presence_sur_le_site === true, segments: 568, links: 139 }, null, 2));
if (!APPLY) process.exit(0);

const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const sql = `do $ratramne$ declare n integer; begin
  perform 1 from oeuvres where id_oeuvre=${quote(WORK)} and note in (${quote(MARKER)},${quote(PUBLIC_NOTE)}) for update;
  if not found then raise exception 'Préétat de publication divergent'; end if;
  select count(*) into n from segments where id_oeuvre=${quote(WORK)} and liens_revus_le is not null and liens_revus_par='IA-lecture';
  if n<>568 then raise exception 'Lecture incomplète %/568',n; end if;
  select count(*) into n from liens_bibliques l join segments s on s.id=l.segment_id
  where s.id_oeuvre=${quote(WORK)} and l.fiabilite='vérifié' and l.provenance='lecture'
    and l.arbitrage_requis=false and nullif(trim(l.motif),'') is not null;
  if n<>139 then raise exception 'Liens conformes %/139',n; end if;
  update oeuvres set note=${quote(PUBLIC_NOTE)} where id_oeuvre=${quote(WORK)};
  update catalogue_notices set presence_sur_le_site=true where id=${NOTICE} and id_oeuvre_stable=${quote(WORK)};
  get diagnostics n=row_count;
  if n<>1 then raise exception 'Notice non publiée'; end if;
end $ratramne$;`;
const { error: applyError } = await db.rpc('exec_sql', { sql });
if (applyError) throw applyError;
const { data: finalWork, error: finalWorkError } = await db.from('oeuvres').select('note').eq('id_oeuvre', WORK).single();
if (finalWorkError) throw finalWorkError;
const { data: finalNotice, error: finalNoticeError } = await db.from('catalogue_notices').select('presence_sur_le_site').eq('id', NOTICE).single();
if (finalNoticeError) throw finalNoticeError;
if (finalWork.note !== PUBLIC_NOTE || finalNotice.presence_sur_le_site !== true) throw new Error('Postcontrôle de publication en échec.');
console.log(JSON.stringify({ applied: true, published: true, postcheck: 'ok' }, null, 2));
