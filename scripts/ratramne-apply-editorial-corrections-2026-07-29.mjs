import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const WORK = 'A0091O0001';
const NOTICE = 1937;
const ROOT = resolve('tmp/ratramne-correction-2026-07-29');
const SUBTITLE = 'OÃ¹ lâ€™on Ã©claircit tout ce qui a estÃ© dit jusquâ€™icy de plus considerable sur le TraittÃ© de Ratramne, Du Corps & du Sang du Seigneur.';
const MAIN_LEVEL = 'Du Corps & du Sang du Seigneur';
const IMMUTABLE = [
  ['C:/Corpus Scriptura/CS - Espace travail IA/Ratramne - OCR/Ratramne_FRANCAIS_EN_COURS.docx', '69C276229704F7652C31FE26D8F1C110F798AAF41B7D66072FF088F8E647BE82'],
  ['C:/Corpus Scriptura/CS - Espace travail IA/Ratramne - OCR/Ratramne_LATIN_EN_COURS.docx', 'A3901891F3EAACCCF251EEC675131C77CFC24ABE27B8C7FCF32F6E66617565B8'],
  ['C:/Corpus Scriptura/CS - Espace travail IA/Ratramne - OCR/Ratramne_BILINGUE_CONTROLE.docx', '3F8DFDB5A9111015B2157A92B7E27979FA47BC2111DA29BC01E7B0E16D46C358'],
  ['C:/Corpus Scriptura/CS - Espace travail IA/Ratramne - OCR/master/transcription.json', '831603CEAD79C45FF380282FD66F94957B6CDC4F4660D729CA7BE8C8F13A3E04'],
  ['C:/Corpus Scriptura/CS - Espace travail IA/Ratramne - OCR/source/du_corps_et_du_sang_du_seigneur_1673.pdf', '5C71131AD8C0DC555E3C57BCBA60BACE67F2F93D546AC2162BBDA80AD97CDD75'],
];

const sha = (value) => createHash('sha256').update(value).digest('hex').toUpperCase();
for (const [path, expected] of IMMUTABLE) {
  const actual = sha(readFileSync(resolve(path)));
  if (actual !== expected) throw new Error(`Source intangible modifiÃ©e : ${path}`);
}

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const must = async (query, label) => {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
};
const [work, notice, charteRow, rows] = await Promise.all([
  must(db.from('oeuvres').select('*').eq('id_oeuvre', WORK).single(), 'Å“uvre'),
  must(db.from('catalogue_notices').select('*').eq('id', NOTICE).single(), 'notice'),
  must(db.from('parametres').select('*').eq('cle', 'charte_ia').single(), 'charte'),
  must(db.from('segments').select('*').eq('id_oeuvre', WORK).order('segment_numero'), 'segments'),
]);

if (rows.length !== 568 || rows.some((row, index) => row.segment_numero !== index + 1)) throw new Error('PrÃ©Ã©tat : 568 segments contigus attendus');
if (rows[0].id !== 533163 || rows[0].ref_niv1 !== 'Page de titre' || !rows[0].segment_texte.startsWith('RATRAMNE,')) throw new Error('PrÃ©Ã©tat : page de titre inattendue');
if ([rows[0].lien_1, rows[0].lien_2, rows[0].lien_3, rows[0].lien_4].some(Boolean)) throw new Error('La page de titre porte un lien biblique');
if (work.sous_titre !== null || work.nb_signes !== 174133 || notice.id_oeuvre_stable !== WORK) throw new Error('PrÃ©Ã©tat mÃ©tadonnÃ©es divergent');

const markerRe = /\[\[(\d+)\]\]/g;
const fieldsInReadingOrder = ['ref_niv1', 'ref_niv1_texte', 'ref_niv2', 'ref_niv2_texte', 'ref_niv3', 'ref_niv3_texte', 'ref_niv4', 'ref_niv4_texte', 'segment_texte', 'texte_original'];
const noteMap = new Map();
for (const row of rows.slice(1)) {
  for (const field of fieldsInReadingOrder) {
    for (const match of String(row[field] ?? '').matchAll(markerRe)) {
      const oldNumber = Number(match[1]);
      if (!noteMap.has(oldNumber)) noteMap.set(oldNumber, noteMap.size + 1);
    }
  }
}
if (noteMap.size !== 184) throw new Error(`184 notes attendues, ${noteMap.size} trouvÃ©es`);

const replaceMarkers = (value) => value == null ? null : String(value).replace(markerRe, (_all, number) => {
  const mapped = noteMap.get(Number(number));
  if (!mapped) throw new Error(`Appel de note sans correspondance : ${number}`);
  return `[[${mapped}]]`;
});
const replaceNotes = (value) => {
  if (!value) return null;
  return String(value).split(/\r?\n/).filter(Boolean).map((line) => {
    const match = line.match(/^\[\[(\d+)\]\](.*)$/s);
    if (!match) throw new Error(`DÃ©finition de note invalide : ${line}`);
    const mapped = noteMap.get(Number(match[1]));
    if (!mapped) throw new Error(`DÃ©finition orpheline : ${match[1]}`);
    return { number: mapped, line: `[[${mapped}]]${match[2]}` };
  }).sort((a, b) => a.number - b.number).map((item) => item.line).join('\n');
};

const patches = rows.slice(1).map((row) => {
  const oldNumber = row.segment_numero;
  const patch = {
    id: row.id,
    segment_numero: oldNumber - 1,
    segment_texte: replaceMarkers(row.segment_texte),
    texte_original: replaceMarkers(row.texte_original),
    ref_niv1: replaceMarkers(row.ref_niv1),
    ref_niv2: replaceMarkers(row.ref_niv2),
    ref_niv3: replaceMarkers(row.ref_niv3),
    ref_niv4: replaceMarkers(row.ref_niv4),
    ref_niv1_texte: replaceMarkers(row.ref_niv1_texte),
    ref_niv2_texte: replaceMarkers(row.ref_niv2_texte),
    ref_niv3_texte: replaceMarkers(row.ref_niv3_texte),
    ref_niv4_texte: replaceMarkers(row.ref_niv4_texte),
    notes: replaceNotes(row.notes),
  };
  if (oldNumber >= 2 && oldNumber <= 324) patch.ref_niv1_texte = null;
  if (oldNumber >= 328) {
    patch.ref_niv1 = MAIN_LEVEL;
    patch.ref_niv1_texte = null;
    patch.ref_niv2_texte = null;
    patch.ref_niv2 = oldNumber <= 335
      ? replaceMarkers('PrÃ©face au roy Charles[[78]].')
      : oldNumber >= 451 ? 'Seconde partie' : null;
  }
  return patch;
});
const noteDefinitions = patches.flatMap((row) => [...String(row.notes ?? '').matchAll(markerRe)].map((match) => Number(match[1])));
const noteCalls = patches.flatMap((row) => fieldsInReadingOrder.flatMap((field) => [...String(row[field] ?? '').matchAll(markerRe)].map((match) => Number(match[1]))));
const expectedSequence = Array.from({ length: 184 }, (_, index) => index + 1);
if (JSON.stringify([...new Set(noteCalls)].sort((a, b) => a - b)) !== JSON.stringify(expectedSequence)
  || JSON.stringify([...noteDefinitions].sort((a, b) => a - b)) !== JSON.stringify(expectedSequence)) {
  throw new Error('La renumÃ©rotation ne produit pas une bijection 1-184');
}

const charteTitleRule = '**Page de titre bibliographique.** La page de titre matÃ©rielle dâ€™une Ã©dition nâ€™est jamais reproduite dans les segments ni dans les niveaux de titre. Elle sert uniquement Ã Ã©tablir les mÃ©tadonnÃ©es bibliographiques (`titre`, `sous_titre`, auteur, traducteur, Ã©diteur, lieu, date, etc.). Un faux-titre ou une page de titre ne devient donc ni `apparat_critique`, ni `ref_niv1`, ni segment. Cette exclusion ne concerne pas les titres de parties ou de sections effectivement placÃ©s dans le corps de lâ€™Å“uvre.';
const charteNoteNew = '**RenumÃ©rotation sÃ©quentielle et unicitÃ© Ã lâ€™Ã©chelle de lâ€™Å“uvre.** Les notes sont renumÃ©rotÃ©es dans lâ€™ordre de lecture des segments produits, indÃ©pendamment de la numÃ©rotation de la source : premiÃ¨re note rencontrÃ©e = `[[1]]`, deuxiÃ¨me = `[[2]]`, etc. La sÃ©quence est unique, continue et globale pour lâ€™Å“uvre entiÃ¨re, tous champs affichables confondus (`segment_texte`, `texte_original`, titres et sous-titres de niveaux). Aucun numÃ©ro ne peut Ãªtre repris ou rÃ©initialisÃ© Ã lâ€™entrÃ©e dâ€™une partie, dâ€™un livre, dâ€™une langue ou dâ€™un apparat. Les numÃ©ros imprimÃ©s dans le fac-similÃ© ne sont jamais conservÃ©s comme identifiants de stockage.';
let charte = charteRow.valeur;
if (charte.includes(charteTitleRule) || charte.includes(charteNoteNew)) throw new Error('Charte dÃ©jÃ corrigÃ©e : script non applicable Ã ce prÃ©Ã©tat');
const titleStart = charte.indexOf('**Identit');
const noteStart = charte.indexOf('**Renum');
const noteEnd = charte.indexOf('\n\n**Colonne', noteStart);
if (titleStart < 0 || noteStart < 0 || noteEnd < 0) throw new Error(`Ancres de charte introuvables : titre=${titleStart}, notes=${noteStart}, fin=${noteEnd}`);
charte = `${charte.slice(0, noteStart)}${charteNoteNew}${charte.slice(noteEnd)}`;
const titleStartAfterNote = charte.indexOf('**Identit');
charte = `${charte.slice(0, titleStartAfterNote)}${charteTitleRule}\n\n${charte.slice(titleStartAfterNote)}`;

mkdirSync(ROOT, { recursive: true });
const snapshot = { captured_at: new Date().toISOString(), work, notice, charte: charteRow, segments: rows };
writeFileSync(resolve(ROOT, 'prestate.json'), `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
writeFileSync(resolve(ROOT, 'note-map.json'), `${JSON.stringify(Object.fromEntries(noteMap), null, 2)}\n`, 'utf8');

console.log(JSON.stringify({ apply: APPLY, segments_before: 568, segments_after: 567, notes: 184, subtitle: SUBTITLE, main_level: MAIN_LEVEL, title_note: patches.find((row) => row.id === 533490)?.ref_niv2 ?? patches.find((row) => row.segment_numero === 327)?.ref_niv2, charte_update: true }, null, 2));
if (!APPLY) process.exit(0);

const payload = JSON.stringify(patches);
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const sql = `do $ratramne_correction$
declare n integer;
begin
  perform 1 from oeuvres where id_oeuvre=${quote(WORK)} and sous_titre is null and nb_signes=174133 for update;
  if not found then raise exception 'PrÃ©Ã©tat oeuvre divergent'; end if;
  select count(*) into n from segments where id_oeuvre=${quote(WORK)};
  if n<>568 then raise exception '568 segments attendus, % trouvÃ©s',n; end if;
  if not exists(select 1 from segments where id=533163 and id_oeuvre=${quote(WORK)} and segment_numero=1 and ref_niv1='Page de titre') then
    raise exception 'Page de titre cible absente';
  end if;
  delete from segments where id=533163 and id_oeuvre=${quote(WORK)};
  update segments set segment_numero=segment_numero+1000 where id_oeuvre=${quote(WORK)};
  update segments s set
    segment_numero=p.segment_numero, segment_texte=p.segment_texte, texte_original=p.texte_original,
    ref_niv1=p.ref_niv1, ref_niv2=p.ref_niv2, ref_niv3=p.ref_niv3, ref_niv4=p.ref_niv4,
    ref_niv1_texte=p.ref_niv1_texte, ref_niv2_texte=p.ref_niv2_texte,
    ref_niv3_texte=p.ref_niv3_texte, ref_niv4_texte=p.ref_niv4_texte, notes=p.notes
  from jsonb_to_recordset($patches$${payload}$patches$::jsonb) as p(
    id bigint, segment_numero integer, segment_texte text, texte_original text,
    ref_niv1 text, ref_niv2 text, ref_niv3 text, ref_niv4 text,
    ref_niv1_texte text, ref_niv2_texte text, ref_niv3_texte text, ref_niv4_texte text, notes text)
  where s.id=p.id and s.id_oeuvre=${quote(WORK)};
  get diagnostics n=row_count;
  if n<>567 then raise exception '567 segments Ã mettre Ã jour, % traitÃ©s',n; end if;
  update oeuvres set sous_titre=${quote(SUBTITLE)}, nb_signes=(select sum(length(segment_texte)) from segments where id_oeuvre=${quote(WORK)}) where id_oeuvre=${quote(WORK)};
  update parametres set valeur=${quote(charte)}, mis_a_jour=now() where cle='charte_ia' and valeur=${quote(charteRow.valeur)};
  get diagnostics n=row_count;
  if n<>1 then raise exception 'Charte modifiÃ©e concurremment'; end if;
  select count(*) into n from segments where id_oeuvre=${quote(WORK)};
  if n<>567 then raise exception 'PostÃ©tat segments invalide : %',n; end if;
end $ratramne_correction$;`;
const { error: applyError } = await db.rpc('exec_sql', { sql });
if (applyError) throw new Error(`Transaction annulÃ©e : ${applyError.message}`);

const [postWork, postRows, postCharte] = await Promise.all([
  must(db.from('oeuvres').select('*').eq('id_oeuvre', WORK).single(), 'post Å“uvre'),
  must(db.from('segments').select('*').eq('id_oeuvre', WORK).order('segment_numero'), 'post segments'),
  must(db.from('parametres').select('*').eq('cle', 'charte_ia').single(), 'post charte'),
]);
if (postRows.length !== 567 || postRows.some((row, index) => row.segment_numero !== index + 1)) throw new Error('PostcontrÃ´le de continuitÃ© en Ã©chec');
if (postWork.sous_titre !== SUBTITLE || postRows[0].ref_niv1 !== 'Advertissement' || postRows.some((row) => row.ref_niv1 === 'Page de titre' || row.ref_niv1 === 'PremiÃ¨re partie')) throw new Error('PostcontrÃ´le Ã©ditorial en Ã©chec');
if (!postCharte.valeur.includes(charteTitleRule) || !postCharte.valeur.includes(charteNoteNew)) throw new Error('PostcontrÃ´le de charte en Ã©chec');
writeFileSync(resolve(ROOT, 'poststate.json'), `${JSON.stringify({ captured_at: new Date().toISOString(), work: postWork, charte: postCharte, segments: postRows }, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ applied: true, segments: 567, nb_signes: postWork.nb_signes, first_level: postRows[0].ref_niv1, main_structure: [...new Set(postRows.filter((row) => row.segment_numero >= 327).map((row) => `${row.ref_niv1} > ${row.ref_niv2 ?? '(sans titre ajoutÃ©)'}`))], charte_updated: true }, null, 2));
