import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const WORK = 'A0091O0001';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: rows, error } = await db.from('segments').select('id,segment_numero,ref_niv2,ref_niv2_texte,notes')
  .eq('id_oeuvre', WORK).gte('segment_numero', 327).lte('segment_numero', 334).order('segment_numero');
if (error) throw error;
if (rows.length !== 8 || rows.some((row) => row.ref_niv2 !== 'PrÃ©face au roy Charles[[76]].')) throw new Error('PrÃ©Ã©tat de la prÃ©face divergent');
if (!String(rows[0].notes ?? '').includes('[[76]]')) throw new Error(`Note 76 absente du premier segment de la prÃ©face : ${rows[0].notes}`);
console.log(JSON.stringify({ apply: APPLY, segments: rows.length, title: 'PrÃ©face', subtitle: 'Au roy Charles[[76]].' }, null, 2));
if (!APPLY) process.exit(0);

const sql = `do $preface$ declare n integer; begin
  select count(*) into n from segments where id_oeuvre='${WORK}' and segment_numero between 327 and 334 and ref_niv2='PrÃ©face au roy Charles[[76]].';
  if n<>8 then raise exception 'PrÃ©Ã©tat divergent : %',n; end if;
  update segments set ref_niv2='PrÃ©face', ref_niv2_texte=case when segment_numero=327 then 'Au roy Charles[[76]].' else null end
  where id_oeuvre='${WORK}' and segment_numero between 327 and 334;
  get diagnostics n=row_count;
  if n<>8 then raise exception '8 segments attendus, % mis Ã jour',n; end if;
end $preface$;`;
const { error: applyError } = await db.rpc('exec_sql', { sql });
if (applyError) throw applyError;
const { data: post, error: postError } = await db.from('segments').select('segment_numero,ref_niv2,ref_niv2_texte')
  .eq('id_oeuvre', WORK).gte('segment_numero', 327).lte('segment_numero', 334).order('segment_numero');
if (postError) throw postError;
if (post.some((row, index) => row.ref_niv2 !== 'PrÃ©face' || row.ref_niv2_texte !== (index === 0 ? 'Au roy Charles[[76]].' : null))) throw new Error('PostcontrÃ´le en Ã©chec');
console.log(JSON.stringify({ applied: true, postcheck: 'ok' }, null, 2));
