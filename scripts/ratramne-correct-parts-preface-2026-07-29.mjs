import { readFileSync } from 'node:fs';

const { createClient } = await import('@supabase/supabase-js').catch(() => import('../node_modules/.ignored/@supabase/supabase-js/dist/index.mjs'));
const WORK = 'A0091O0001';
const PREFACE = 'Pr\u00e9face';
const PREFACE_SUBTITLE = 'Au roy Charles[[76]].';
const FIRST = 'Premi\u00e8re partie';
const SECOND = 'Seconde partie';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: rows, error } = await db.from('segments')
  .select('id,segment_numero,nature,ref_niv1,ref_niv1_texte,ref_niv2,ref_niv2_texte,notes')
  .eq('id_oeuvre', WORK).gte('segment_numero', 327).order('segment_numero');
if (error) throw error;
if (rows.length !== 241 || rows[0].segment_numero !== 327 || rows.at(-1).segment_numero !== 567) throw new Error('Plage Ratramne inattendue');
if (rows.slice(0, 8).some((row) => row.nature !== 'texte' || row.ref_niv2 !== PREFACE)) throw new Error('Préétat de la préface divergent');
if (rows.slice(8, 123).some((row) => row.nature !== 'texte' || row.ref_niv2 !== null)) throw new Error('Préétat de la première partie divergent');
if (rows.slice(123).some((row) => row.nature !== 'texte' || row.ref_niv2 !== SECOND)) throw new Error('Préétat de la seconde partie divergent');
if (!String(rows[0].notes ?? '').includes('[[76]]')) throw new Error('Note de titre 76 absente');

const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const sql = `do $parts$ declare n integer; begin
  select count(*) into n from segments where id_oeuvre='${WORK}' and segment_numero between 327 and 334 and nature='texte' and ref_niv2=${quote(PREFACE)};
  if n<>8 then raise exception 'Préface : préétat divergent %',n; end if;
  update segments set nature='apparat_critique', ref_niv1=${quote(PREFACE)},
    ref_niv1_texte=case when segment_numero=327 then ${quote(PREFACE_SUBTITLE)} else null end,
    ref_niv2=null, ref_niv2_texte=null
  where id_oeuvre='${WORK}' and segment_numero between 327 and 334;
  get diagnostics n=row_count; if n<>8 then raise exception 'Préface : 8 lignes attendues, %',n; end if;

  update segments set ref_niv1=${quote(FIRST)},ref_niv1_texte=null,ref_niv2=null,ref_niv2_texte=null
  where id_oeuvre='${WORK}' and segment_numero between 335 and 449 and nature='texte';
  get diagnostics n=row_count; if n<>115 then raise exception 'Première partie : 115 lignes attendues, %',n; end if;

  update segments set ref_niv1=${quote(SECOND)},ref_niv1_texte=null,ref_niv2=null,ref_niv2_texte=null
  where id_oeuvre='${WORK}' and segment_numero between 450 and 567 and nature='texte';
  get diagnostics n=row_count; if n<>118 then raise exception 'Seconde partie : 118 lignes attendues, %',n; end if;
end $parts$;`;
const { error: applyError } = await db.rpc('exec_sql', { sql });
if (applyError) throw applyError;

const { data: post, error: postError } = await db.from('segments')
  .select('segment_numero,nature,ref_niv1,ref_niv1_texte,ref_niv2,ref_niv2_texte,notes')
  .eq('id_oeuvre', WORK).gte('segment_numero', 327).order('segment_numero');
if (postError) throw postError;
if (post.slice(0, 8).some((row, index) => row.nature !== 'apparat_critique' || row.ref_niv1 !== PREFACE
  || row.ref_niv1_texte !== (index === 0 ? PREFACE_SUBTITLE : null) || row.ref_niv2 !== null)) throw new Error('Postcontrôle de la préface en échec');
if (post.slice(8, 123).some((row) => row.ref_niv1 !== FIRST || row.ref_niv2 !== null)
  || post.slice(123).some((row) => row.ref_niv1 !== SECOND || row.ref_niv2 !== null)) throw new Error('Postcontrôle des parties en échec');
console.log(JSON.stringify({ corrected: true, apparatus: { title: PREFACE, subtitle: PREFACE_SUBTITLE, segments: 8 }, text: { first_part_segments: 115, second_part_segments: 118 } }, null, 2));
