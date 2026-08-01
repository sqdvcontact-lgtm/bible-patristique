import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
const { createClient } = await import('@supabase/supabase-js').catch(() => import('../node_modules/.ignored/@supabase/supabase-js/dist/index.mjs'));

const WORK = 'A0091O0001';
const SUBTITLE = 'Où l’on éclaircit tout ce qui a esté dit jusqu’icy de plus considerable sur le Traitté de Ratramne, Du Corps & du Sang du Seigneur.';
const sha = (value) => createHash('sha256').update(value).digest('hex').toUpperCase();
const immutable = [
  ['C:/Corpus Scriptura/CS - Espace travail IA/Ratramne - OCR/Ratramne_FRANCAIS_EN_COURS.docx', '69C276229704F7652C31FE26D8F1C110F798AAF41B7D66072FF088F8E647BE82'],
  ['C:/Corpus Scriptura/CS - Espace travail IA/Ratramne - OCR/Ratramne_LATIN_EN_COURS.docx', 'A3901891F3EAACCCF251EEC675131C77CFC24ABE27B8C7FCF32F6E66617565B8'],
  ['C:/Corpus Scriptura/CS - Espace travail IA/Ratramne - OCR/Ratramne_BILINGUE_CONTROLE.docx', '3F8DFDB5A9111015B2157A92B7E27979FA47BC2111DA29BC01E7B0E16D46C358'],
  ['C:/Corpus Scriptura/CS - Espace travail IA/Ratramne - OCR/master/transcription.json', '831603CEAD79C45FF380282FD66F94957B6CDC4F4660D729CA7BE8C8F13A3E04'],
  ['C:/Corpus Scriptura/CS - Espace travail IA/Ratramne - OCR/source/du_corps_et_du_sang_du_seigneur_1673.pdf', '5C71131AD8C0DC555E3C57BCBA60BACE67F2F93D546AC2162BBDA80AD97CDD75'],
];
for (const [path, expected] of immutable) if (sha(readFileSync(path)) !== expected) throw new Error(`Source modifiée : ${path}`);

const master = JSON.parse(readFileSync(immutable[3][0], 'utf8'));
const lastBlock = master.parallel_blocks.at(-1);
if (lastBlock.kind !== 'end_mark' || !lastBlock.pdf_pages.includes(209) || lastBlock.french.text.trim() !== 'FIN.') throw new Error('Couverture finale du fac-similé non attestée');

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const must = async (query, label) => { const { data, error } = await query; if (error) throw new Error(`${label}: ${error.message}`); return data; };
const [work, notice, rows, charte] = await Promise.all([
  must(db.from('oeuvres').select('*').eq('id_oeuvre', WORK).single(), 'œuvre'),
  must(db.from('catalogue_notices').select('*').eq('id', 1937).single(), 'notice'),
  must(db.from('segments').select('*').eq('id_oeuvre', WORK).order('segment_numero'), 'segments'),
  must(db.from('parametres').select('*').eq('cle', 'charte_ia').single(), 'charte'),
]);
if (rows.length !== 567 || rows.some((row, index) => row.segment_numero !== index + 1)) throw new Error('Segments non contigus ou compte invalide');
const computedSigns = rows.reduce((sum, row) => sum + row.segment_texte.length, 0);
if (work.titre !== 'Du Corps & du Sang du Seigneur' || work.sous_titre !== SUBTITLE || work.nb_signes !== computedSigns) throw new Error(`Métadonnées invalides : titre=${JSON.stringify(work.titre)}, sous-titre=${JSON.stringify(work.sous_titre)}, attendu=${JSON.stringify(SUBTITLE)}, signes=${work.nb_signes}/${computedSigns}`);
if (notice.presence_sur_le_site !== true) throw new Error('Œuvre dépubliée après correction');
if (rows.some((row) => row.ref_niv1 === 'Page de titre' || row.segment_texte.startsWith('RATRAMNE,\nAUTREMENT'))) throw new Error('Page de titre encore présente');
if (rows.slice(0, 323).some((row) => row.ref_niv1 !== 'Advertissement' || row.ref_niv1_texte !== null)) throw new Error('Advertissement mal structuré');
if (rows.slice(326, 334).some((row) => row.nature !== 'apparat_critique' || row.ref_niv1 !== 'Préface' || row.ref_niv2 !== null)) throw new Error('Préface mal classée ou mal délimitée');
if (rows[326].ref_niv1_texte !== 'Au roy Charles[[76]].' || rows.slice(327, 334).some((row) => row.ref_niv1_texte !== null)) throw new Error('Titre développé de la préface invalide');
if (rows.slice(334, 449).some((row) => row.nature !== 'texte' || row.ref_niv1 !== 'Première partie' || row.ref_niv2 !== null)) throw new Error('Première partie invalide');
if (rows.slice(449).some((row) => row.nature !== 'texte' || row.ref_niv1 !== 'Seconde partie' || row.ref_niv2 !== null)) throw new Error('Seconde partie invalide');

const fields = ['ref_niv1', 'ref_niv1_texte', 'ref_niv2', 'ref_niv2_texte', 'ref_niv3', 'ref_niv3_texte', 'ref_niv4', 'ref_niv4_texte', 'segment_texte', 'texte_original'];
const calls = rows.flatMap((row) => fields.flatMap((field) => [...String(row[field] ?? '').matchAll(/\[\[(\d+)\]\]/g)].map((match) => Number(match[1]))));
const definitions = rows.flatMap((row) => [...String(row.notes ?? '').matchAll(/^\[\[(\d+)\]\]/gm)].map((match) => Number(match[1])));
if (rows.some((row) => fields.some((field) => /[»”"]\s*\[\[\d+\]\]/u.test(String(row[field] ?? ''))))) throw new Error('Un appel de note subsiste après un guillemet fermant');
const sequence = Array.from({ length: 184 }, (_, index) => index + 1);
if (calls.length !== 184 || definitions.length !== 184 || JSON.stringify(calls) !== JSON.stringify(sequence)
  || JSON.stringify([...definitions].sort((a, b) => a - b)) !== JSON.stringify(sequence)) throw new Error('Notes non bijectives ou non séquentielles');

const ids = rows.map((row) => row.id);
const links = [];
for (let index = 0; index < ids.length; index += 200) links.push(...await must(db.from('liens_bibliques').select('*').in('segment_id', ids.slice(index, index + 200)), 'liens'));
if (links.length !== 139 || links.some((link) => link.fiabilite !== 'vérifié' || link.provenance !== 'lecture' || link.arbitrage_requis !== false)) throw new Error('Liens bibliques altérés');
if (!charte.valeur.includes('Page de titre bibliographique.') || !charte.valeur.includes('unicitÃ© Ã lâ€™Ã©chelle de lâ€™Å“uvre')) {
  // Le second test garde une variante de lecture tolérante aux consoles Windows ;
  // la présence des formulations substantielles reste contrôlée ci-dessous.
  if (!charte.valeur.includes('tous champs affichables confondus') || !charte.valeur.includes('fac-similé ne sont jamais conservés')) throw new Error('Charte non mise à jour');
}

console.log(JSON.stringify({
  ok: true, segments: 567, signes: work.nb_signes, notes: 184, liens: 139,
  facsimile: { pdf_pages: 209, last_printed_page: 122, final_mark: 'FIN.' },
  structure: ['Apparat : Advertissement / Témoignages / Préface', 'Texte : Première partie / Seconde partie'],
  published: true, source_files_unchanged: true, charte_updated: true,
}, null, 2));
