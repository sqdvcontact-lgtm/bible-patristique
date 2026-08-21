import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const WORK = 'A0091O0001';
const SUBTITLE = 'O\u00f9 l\u2019on \u00e9claircit tout ce qui a est\u00e9 dit jusqu\u2019icy de plus considerable sur le Traitt\u00e9 de Ratramne, Du Corps & du Sang du Seigneur.';
const PREFACE = 'Pr\u00e9face';
const TITLE_RULE = '**Page de titre bibliographique.** La page de titre mat\u00e9rielle d\u2019une \u00e9dition n\u2019est jamais reproduite dans les segments ni dans les niveaux de titre. Elle sert uniquement \u00e0 \u00e9tablir les m\u00e9tadonn\u00e9es bibliographiques (`titre`, `sous_titre`, auteur, traducteur, \u00e9diteur, lieu, date, etc.). Un faux-titre ou une page de titre ne devient donc ni `apparat_critique`, ni `ref_niv1`, ni segment. Cette exclusion ne concerne pas les titres de parties ou de sections effectivement plac\u00e9s dans le corps de l\u2019\u0153uvre.';
const NOTE_RULE = '**Renum\u00e9rotation s\u00e9quentielle et unicit\u00e9 \u00e0 l\u2019\u00e9chelle de l\u2019\u0153uvre.** Les notes sont renum\u00e9rot\u00e9es dans l\u2019ordre de lecture des segments produits, ind\u00e9pendamment de la num\u00e9rotation de la source : premi\u00e8re note rencontr\u00e9e = `[[1]]`, deuxi\u00e8me = `[[2]]`, etc. La s\u00e9quence est unique, continue et globale pour l\u2019\u0153uvre enti\u00e8re, tous champs affichables confondus (`segment_texte`, `texte_original`, titres et sous-titres de niveaux). Aucun num\u00e9ro ne peut \u00eatre repris ou r\u00e9initialis\u00e9 \u00e0 l\u2019entr\u00e9e d\u2019une partie, d\u2019un livre, d\u2019une langue ou d\u2019un apparat. Les num\u00e9ros imprim\u00e9s dans le fac-simil\u00e9 ne sont jamais conserv\u00e9s comme identifiants de stockage.';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const [workResult, rowsResult, charteResult] = await Promise.all([
  db.from('oeuvres').select('sous_titre').eq('id_oeuvre', WORK).single(),
  db.from('segments').select('segment_numero,ref_niv2,ref_niv2_texte').eq('id_oeuvre', WORK).gte('segment_numero', 327).lte('segment_numero', 334).order('segment_numero'),
  db.from('parametres').select('valeur').eq('cle', 'charte_ia').single(),
]);
for (const result of [workResult, rowsResult, charteResult]) if (result.error) throw result.error;
if (!workResult.data.sous_titre.includes('Ã') || rowsResult.data.some((row) => !row.ref_niv2.includes('Ã'))) throw new Error('Le préétat mojibake attendu n’est pas présent');

let charte = charteResult.data.valeur;
const titleStart = charte.indexOf('**Page de titre bibliographique.**');
const titleEnd = charte.indexOf('\n\n**Identit', titleStart);
const noteStart = charte.indexOf('**Renum');
const noteEnd = charte.indexOf('\n\n**Colonne', noteStart);
if ([titleStart, titleEnd, noteStart, noteEnd].some((index) => index < 0)) throw new Error('Bornes de réparation de la charte introuvables');
charte = `${charte.slice(0, titleStart)}${TITLE_RULE}${charte.slice(titleEnd)}`;
const repairedNoteStart = charte.indexOf('**Renum');
const repairedNoteEnd = charte.indexOf('\n\n**Colonne', repairedNoteStart);
charte = `${charte.slice(0, repairedNoteStart)}${NOTE_RULE}${charte.slice(repairedNoteEnd)}`;

const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const sql = `do $encoding$ declare n integer; begin
  update oeuvres set sous_titre=${quote(SUBTITLE)} where id_oeuvre='${WORK}' and sous_titre like '%Ã%';
  get diagnostics n=row_count; if n<>1 then raise exception 'Sous-titre non réparé'; end if;
  update segments set ref_niv2=${quote(PREFACE)} where id_oeuvre='${WORK}' and segment_numero between 327 and 334 and ref_niv2 like '%Ã%';
  get diagnostics n=row_count; if n<>8 then raise exception 'Préface non réparée : %',n; end if;
  update parametres set valeur=${quote(charte)},mis_a_jour=now() where cle='charte_ia' and valeur=${quote(charteResult.data.valeur)};
  get diagnostics n=row_count; if n<>1 then raise exception 'Charte non réparée'; end if;
end $encoding$;`;
const { error } = await db.rpc('exec_sql', { sql });
if (error) throw error;

const [postWork, postRows, postCharte] = await Promise.all([
  db.from('oeuvres').select('sous_titre').eq('id_oeuvre', WORK).single(),
  db.from('segments').select('ref_niv2').eq('id_oeuvre', WORK).gte('segment_numero', 327).lte('segment_numero', 334),
  db.from('parametres').select('valeur').eq('cle', 'charte_ia').single(),
]);
for (const result of [postWork, postRows, postCharte]) if (result.error) throw result.error;
if (postWork.data.sous_titre !== SUBTITLE || postRows.data.some((row) => row.ref_niv2 !== PREFACE)
  || !postCharte.data.valeur.includes(TITLE_RULE) || !postCharte.data.valeur.includes(NOTE_RULE)) throw new Error('Postcontrôle Unicode en échec');
console.log(JSON.stringify({ repaired: true, subtitle: postWork.data.sous_titre, preface: PREFACE, charte: true }, null, 2));
