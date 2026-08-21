import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const OEUVRE = 'A0010O0001';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const must = async (promise, label) => {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
};

const oeuvre = await must(db.from('oeuvres').select('*').eq('id_oeuvre', OEUVRE).single(), 'oeuvre');
if (oeuvre.titre !== 'Les Confessions' || oeuvre.id_auteur !== 'A0010') throw new Error('Cible inattendue');
const segments = [];
for (let from = 0; ; from += 1000) {
  const page = await must(db.from('segments').select('*').eq('id_oeuvre', OEUVRE).order('segment_numero').range(from, from + 999), `segments:${from}`);
  segments.push(...page);
  if (page.length < 1000) break;
}
if (segments.length !== 4566 || segments[0]?.segment_numero !== 1 || segments.at(-1)?.segment_numero !== 4566)
  throw new Error(`Préétat segments divergent : ${segments.length}`);
const segmentIds = segments.map(({ id }) => id);
const links = [];
const commentaires = [];
const signalements = [];
for (let offset = 0; offset < segmentIds.length; offset += 250) {
  const ids = segmentIds.slice(offset, offset + 250);
  links.push(...await must(db.from('liens_bibliques').select('*').in('segment_id', ids), `liens:${offset}`));
  commentaires.push(...await must(db.from('commentaires').select('*').in('id_segment', ids), `commentaires:${offset}`));
  signalements.push(...await must(db.from('signalements').select('*').in('id_segment', ids), `signalements:${offset}`));
}
const notices = await must(db.from('catalogue_notices').select('*').eq('id_oeuvre_stable', OEUVRE).order('id'), 'notices');
const prelevements = await must(db.from('prelevements').select('*').eq('id_oeuvre', OEUVRE), 'prelevements');
const personnels = await must(db.from('oeuvres_personnelles_segments').select('*').eq('id_oeuvre', OEUVRE), 'personnels');
if (links.length || commentaires.length || signalements.length || prelevements.length || personnels.length || notices.length !== 3)
  throw new Error('Dépendances inattendues');

const backup = { exported_at: new Date().toISOString(), oeuvre, segments, liens_bibliques: links,
  catalogue_notices: notices, commentaires, signalements, prelevements, oeuvres_personnelles_segments: personnels };
const body = `${JSON.stringify(backup, null, 2)}\n`;
const root = 'tmp/confessions-removal-2026-07-29';
mkdirSync(root, { recursive: true });
const snapshot = `${root}/A0010O0001-before-delete.json`;
writeFileSync(snapshot, body);
writeFileSync(`${snapshot}.sha256`, `${createHash('sha256').update(body).digest('hex')}  A0010O0001-before-delete.json\n`);

const report = { ready: true, applied: APPLY, oeuvre: OEUVRE, titre: oeuvre.titre, segments: segments.length,
  catalogue_notices: notices.length, other_dependencies: 0, snapshot };
if (!APPLY) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

const sql = `do $delete$ declare n integer; ids bigint[]; begin
  select array_agg(id order by segment_numero) into ids from segments where id_oeuvre='${OEUVRE}';
  if coalesce(array_length(ids,1),0)<>4566 then raise exception 'segments %/4566',coalesce(array_length(ids,1),0); end if;
  select count(*) into n from oeuvres where id_oeuvre='${OEUVRE}' and titre='Les Confessions' and id_auteur='A0010';
  if n<>1 then raise exception 'oeuvre %/1',n; end if;
  select count(*) into n from catalogue_notices where id_oeuvre_stable='${OEUVRE}' and presence_sur_le_site is true;
  if n<>3 then raise exception 'notices publiées %/3',n; end if;
  select count(*) into n from liens_bibliques where segment_id=any(ids);
  if n<>0 then raise exception 'liens %/0',n; end if;
  select count(*) into n from commentaires where id_segment=any(ids);
  if n<>0 then raise exception 'commentaires %/0',n; end if;
  select count(*) into n from signalements where id_segment=any(ids);
  if n<>0 then raise exception 'signalements %/0',n; end if;
  alter table catalogue_notices disable trigger trg_protect_verified_notice;
  delete from catalogue_notices where id_oeuvre_stable='${OEUVRE}';
  get diagnostics n=row_count; if n<>3 then raise exception 'suppression notices %/3',n; end if;
  alter table catalogue_notices enable trigger trg_protect_verified_notice;
  delete from prelevements where id_oeuvre='${OEUVRE}';
  get diagnostics n=row_count; if n<>0 then raise exception 'suppression prélèvements %/0',n; end if;
  delete from oeuvres_personnelles_segments where id_oeuvre='${OEUVRE}';
  get diagnostics n=row_count; if n<>0 then raise exception 'suppression personnels %/0',n; end if;
  delete from segments where id_oeuvre='${OEUVRE}';
  get diagnostics n=row_count; if n<>4566 then raise exception 'suppression segments %/4566',n; end if;
  delete from oeuvres where id_oeuvre='${OEUVRE}';
  get diagnostics n=row_count; if n<>1 then raise exception 'suppression oeuvre %/1',n; end if;
end $delete$;`;
const { error } = await db.rpc('exec_sql', { sql });
if (error) throw new Error(`Transaction annulée : ${error.message}`);
console.log(JSON.stringify(report, null, 2));
