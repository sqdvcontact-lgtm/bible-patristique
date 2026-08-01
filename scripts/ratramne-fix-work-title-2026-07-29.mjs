import { readFileSync } from 'node:fs';

const { createClient } = await import('@supabase/supabase-js').catch(() => import('../node_modules/.ignored/@supabase/supabase-js/dist/index.mjs'));
const WORK = 'A0091O0001';
const OLD_TITLE = 'Du corps et du sang du Seigneur';
const TITLE = 'Du Corps & du Sang du Seigneur';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: work, error: workError } = await db.from('oeuvres').select('titre').eq('id_oeuvre', WORK).single();
if (workError) throw workError;
if (![OLD_TITLE, TITLE].includes(work.titre)) throw new Error(`Titre inattendu : ${work.titre}`);
if (work.titre === OLD_TITLE) {
  const { error } = await db.from('oeuvres').update({ titre: TITLE }).eq('id_oeuvre', WORK).eq('titre', OLD_TITLE);
  if (error) throw error;
}
const { data: levels, error: levelsError } = await db.from('segments')
  .select('ref_niv1,ref_niv2,ref_niv3,ref_niv4').eq('id_oeuvre', WORK);
if (levelsError) throw levelsError;
if (levels.some((row) => [row.ref_niv1, row.ref_niv2, row.ref_niv3, row.ref_niv4].includes(TITLE))) {
  throw new Error('Le titre de l’œuvre subsiste dans un niveau structurel');
}
const { data: post, error: postError } = await db.from('oeuvres').select('titre').eq('id_oeuvre', WORK).single();
if (postError) throw postError;
if (post.titre !== TITLE) throw new Error('Postcontrôle du titre en échec');
console.log(JSON.stringify({ title: post.titre, present_in_structural_levels: false }, null, 2));
