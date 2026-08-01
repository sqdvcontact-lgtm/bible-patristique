import { readFileSync } from 'node:fs';
const { createClient } = await import('@supabase/supabase-js').catch(() => import('../node_modules/.ignored/@supabase/supabase-js/dist/index.mjs'));
const WORK = 'A0091O0001';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const fields = ['segment_texte','texte_original','ref_niv1','ref_niv1_texte','ref_niv2','ref_niv2_texte','ref_niv3','ref_niv3_texte','ref_niv4','ref_niv4_texte'];
const placeBeforeClosingQuote = (value) => value == null ? null : String(value)
  .replace(/([.!?…])([ \u00a0\u202f]*[»”"])[ \u00a0\u202f]*\[\[(\d+)\]\]/gu, '[[$3]]$1$2')
  .replace(/([ \u00a0\u202f]*[»”"])[ \u00a0\u202f]*\[\[(\d+)\]\]/gu, '[[$2]]$1');

const [{ data: rows, error: rowsError }, { data: charteRow, error: charteError }] = await Promise.all([
  db.from('segments').select(`id,segment_numero,${fields.join(',')}`).eq('id_oeuvre', WORK).order('segment_numero'),
  db.from('parametres').select('valeur').eq('cle', 'charte_ia').single(),
]);
if (rowsError) throw rowsError;
if (charteError) throw charteError;
const patches = [];
for (const row of rows) {
  const patch = { id: row.id };
  let changed = false;
  for (const field of fields) {
    patch[field] = placeBeforeClosingQuote(row[field]);
    if (patch[field] !== row[field]) changed = true;
  }
  if (changed) patches.push(patch);
}
if (patches.length !== 3) throw new Error(`Trois segments à corriger attendus, ${patches.length} trouvés`);
const remaining = patches.flatMap((row) => fields.filter((field) => /[»”"]\s*\[\[\d+\]\]/u.test(String(row[field] ?? ''))));
if (remaining.length) throw new Error('Un appel subsiste après un guillemet fermant dans le candidat');

const RULE = '**Placement avant le guillemet fermant - règle absolue.** Un appel de note qui porte sur un passage cité se place toujours à l’intérieur de la citation, avant le guillemet fermant et avant la ponctuation finale éventuelle qui précède ce guillemet. Forme correcte : `les sarments[[3]] »` ; forme interdite : `les sarments »[[3]]`. Un appel de note ne se place jamais après un guillemet fermant.';
let charte = charteRow.valeur;
if (charte.includes(RULE)) throw new Error('La règle est déjà présente');
const anchor = charte.indexOf('**Renum');
if (anchor < 0) throw new Error('Section de renumérotation introuvable dans la charte');
charte = `${charte.slice(0, anchor)}${RULE}\n\n${charte.slice(anchor)}`;

const payload = JSON.stringify(patches);
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const sql = `do $notes_quotes$ declare n integer; begin
  update segments s set
    segment_texte=p.segment_texte,texte_original=p.texte_original,
    ref_niv1=p.ref_niv1,ref_niv1_texte=p.ref_niv1_texte,ref_niv2=p.ref_niv2,ref_niv2_texte=p.ref_niv2_texte,
    ref_niv3=p.ref_niv3,ref_niv3_texte=p.ref_niv3_texte,ref_niv4=p.ref_niv4,ref_niv4_texte=p.ref_niv4_texte
  from jsonb_to_recordset($patches$${payload}$patches$::jsonb) as p(
    id bigint,segment_texte text,texte_original text,ref_niv1 text,ref_niv1_texte text,ref_niv2 text,ref_niv2_texte text,
    ref_niv3 text,ref_niv3_texte text,ref_niv4 text,ref_niv4_texte text)
  where s.id=p.id and s.id_oeuvre='${WORK}';
  get diagnostics n=row_count; if n<>3 then raise exception 'Trois segments attendus, % corrigés',n; end if;
  update parametres set valeur=${quote(charte)},mis_a_jour=now() where cle='charte_ia' and valeur=${quote(charteRow.valeur)};
  get diagnostics n=row_count; if n<>1 then raise exception 'Charte modifiée concurremment'; end if;
end $notes_quotes$;`;
const { error: applyError } = await db.rpc('exec_sql', { sql });
if (applyError) throw applyError;
console.log(JSON.stringify({ corrected_segments: patches.map((row) => rows.find((item) => item.id === row.id).segment_numero), moved_calls: 5, charte_updated: true, example: 'les sarments[[3]] »' }, null, 2));
