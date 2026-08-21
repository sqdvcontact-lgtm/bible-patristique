import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const WRITE = process.argv.includes('--write')
const AJOUTS = [
  [338, 'GEN.35.4', 1, 'Référence intentionnelle vérifiée aux pendants apportés avec les idoles, rappelés explicitement par « comme on l’a dit ».'],
  [929, 'EXO.21.22', 1, 'Citation explicite vérifiée de l’indemnité payée selon la demande du mari.'],
  [1025, 'EXO.26.1', 1, 'Citation explicite vérifiée de l’ordre de faire les chérubins en ouvrage de broderie.'],
  [1066, 'EXO.28.36', 1, 'Référence intentionnelle vérifiée à l’inscription « Sainteté » ou « Sanctification du Seigneur » gravée sur l’or.'],
  [1726, 'LEV.12.4', 1, 'Citation explicite vérifiée des variantes grecques « dans son sang impur » et « dans son sang pur ».'],
  [1939, 'LUK.23.43', 3, 'La promesse du paradis au larron est mobilisée comme preuve d’une sanctification intérieure sans sacrement visible.'],
  [2019, 'NUM.4.11', 1, 'Citation explicite vérifiée de la couverture de peau d’hyacinthe étendue sur le drap.'],
  [2055, 'NUM.9.15', 1, 'Citation explicite vérifiée de la nuée couvrant le tabernacle au jour de son établissement.'],
  [2150, 'NUM.16.33', 1, 'Référence intentionnelle vérifiée à la descente vivante de Coré et des siens dans les enfers.'],
  [2150, '2PE.2.4', 3, 'Les anges pécheurs réservés dans les ténèbres sont interprétés comme une autre acception scripturaire de l’enfer.'],
  [2476, 'DEU.13.4', 3, 'La permission divine des prodiges est expliquée comme une épreuve destinée à révéler l’amour du peuple pour Dieu.'],
  [2407, 'EXO.24.18', 3, 'L’entrée de Moïse dans la nuée est interprétée comme un privilège de vision plus parfaite sans vision de la substance divine.'],
  [2448, 'DEU.10.4', 1, 'Référence intentionnelle vérifiée à l’écriture des dix paroles sur les tables par Dieu.'],
  [2448, 'EXO.34.28', 1, 'Référence intentionnelle vérifiée au passage de l’Exode dont la lecture naturelle attribue l’écriture à Moïse.'],
  [2844, 'JOS.23.14', 1, 'Citation explicite vérifiée du chemin suivi par tous ceux qui sont sur la terre.'],
  [2691, '2TI.2.21', 3, 'La citation des instruments honorables et utiles fonde la conclusion sur le salut des serviteurs châtiés temporellement.'],
  [2820, '1KI.5.1', 1, 'Citation intentionnelle vérifiée de l’expression « depuis le fleuve », identifiée à l’Euphrate.'],
  [2908, 'JDG.1.19', 1, 'Citation explicite vérifiée de Juda occupant la montagne sans pouvoir chasser les habitants de la vallée.'],
  [2914, 'JDG.1.21', 3, 'La permanence des Jébuséens avec Benjamin à Jérusalem est confrontée à leur extermination rapportée plus haut.'],
  [2914, 'JDG.1.8', 3, 'La prise et l’incendie de Jérusalem par Juda sont explicitement confrontés au maintien ultérieur des Jébuséens.'],
  [3193, 'JDG.11.7', 1, 'Citation explicite vérifiée du reproche de Jephté : haine et expulsion de la maison de son père.'],
]
const SUPPRESSIONS = [
  [2476, 'DEU.13.1', 3],
  [2562, 'DEU.24.12', 3],
  [2562, 'DEU.24.13', 3],
  [2864, 'JOS.24.25', 3],
  [2864, 'JOS.24.26', 3],
]
const RETYPAGES = [[2150, '2PE.2.4', 4, 1, 'Référence intentionnelle vérifiée aux anges pécheurs précipités dans les ténèbres et réservés au châtiment.']]
const MOTIFS = [
  [579, 'ISA.9.5', 3, 'Le titre de la Septante « Ange du grand conseil » appuie l’identification possible au Christ.'],
  [1726, null, 4, 'RÉFÉRENCE NON BIBLIQUE (tradition textuelle) : variante « dans son sang impur » attestée par certains exemplaires grecs ; témoins textuels à constituer.'],
  [1939, null, 4, 'RÉFÉRENCE NON BIBLIQUE (œuvre patristique) : renvoi à Rétractations II, 55, n. 9, au sujet du larron sanctifié sans baptême ; cible de corpus à constituer.'],
  [1964, 'LEV.25.4', 3, 'La taille de la vigne est comprise par synecdoque comme l’ensemble des travaux de culture interdits pendant l’année sabbatique.'],
  [2476, 'DEU.13.2', 3, 'La réalisation des signes annoncés par le faux prophète ne justifie ni de le suivre ni d’adorer d’autres dieux.'],
  [2476, 'DEU.13.3', 3, 'Les prodiges du faux prophète sont présentés comme permis par Dieu sans rendre son ordre licite.'],
  [2576, 'DEU.24.17', 3, 'La défense de prendre le vêtement de la veuve est interprétée dans l’égalité de protection due à l’étranger, à l’orphelin et à la veuve.'],
]
const TEXTES = [
  [43, 'du milieu du quel Nembroth', 'du milieu du quel [<i>sic</i>] Nembroth'],
  [579, '</i> ? - «', '</i> ? — «'],
  [1521, 'la même pensé [<i>sic</i>]', 'la même pensée'],
  [2114, '</i> - Pour', '</i> — Pour'],
  [2372, 'Sur l’endurcissement du cœur. - «', 'Sur l’endurcissement du cœur. — «'],
]
// Les candidats ont deja recu certaines normalisations typographiques. On ne
// leur reapplique donc que les corrections encore necessaires dans ces fichiers.
const TEXTES_CANDIDATS = [
  [43, TEXTES[0][1], TEXTES[0][2]],
  [1521, TEXTES[2][1], TEXTES[2][2]],
  [2372, 'Sur l\u2019endurcissement du c\u0153ur. \u2013 \u00ab', TEXTES[4][2]],
]
const TEXTES_SOURCES = TEXTES_CANDIDATS
const NOTES = [[538, '[[106]] Id. XXXIII, 19', '[[106]] Ibid. XXXIII, 19.']]
const NUMEROS = [...new Set([
  ...AJOUTS.map((x) => x[0]), ...SUPPRESSIONS.map((x) => x[0]), ...RETYPAGES.map((x) => x[0]),
  ...MOTIFS.map((x) => x[0]), ...TEXTES.map((x) => x[0]), ...NOTES.map((x) => x[0]),
])]
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const { data: segments, error: erreurSegments } = await db.from('segments')
  .select('id,segment_numero,segment_texte,notes').eq('id_oeuvre', OEUVRE).in('segment_numero', NUMEROS).order('segment_numero')
if (erreurSegments) throw erreurSegments
if (segments.length !== NUMEROS.length) throw new Error('Segments de contrôle incomplets')
const parNumero = new Map(segments.map((segment) => [segment.segment_numero, segment]))
const cibles = [...new Set(AJOUTS.map((x) => x[1]))]
const { data: temoins, error: erreurTemoins } = await db.from('versets_lecture')
  .select('id_verset,"TR0001","TR0003","TR0004"').in('id_verset', cibles)
if (erreurTemoins) throw erreurTemoins
const parCible = new Map(temoins.map((temoin) => [temoin.id_verset, temoin]))
const invalides = cibles.filter((cible) => { const t = parCible.get(cible); return !t || (!t.TR0001 && !t.TR0003 && !t.TR0004) })
if (invalides.length) throw new Error(`Cibles invalides : ${invalides.join(', ')}`)
const ids = segments.map((segment) => segment.id)
const { data: liens, error: erreurLiens } = await db.from('liens_bibliques')
  .select('id,segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id', ids)
if (erreurLiens) throw erreurLiens
const liensSegment = (numero) => liens.filter((lien) => lien.segment_id === parNumero.get(numero).id)
for (const [numero, cible, type] of AJOUTS) if (liensSegment(numero).some((lien) => lien.canon_id === cible && lien.type === type)) throw new Error(`Ajout déjà présent ${numero}/${cible}/T${type}`)
for (const [numero, cible, type] of SUPPRESSIONS) if (liensSegment(numero).filter((lien) => lien.canon_id === cible && lien.type === type).length !== 1) throw new Error(`Suppression non univoque ${numero}/${cible}/T${type}`)
for (const [numero, cible, avant] of RETYPAGES) if (liensSegment(numero).filter((lien) => lien.canon_id === cible && lien.type === avant).length !== 1) throw new Error(`Retypage non univoque ${numero}/${cible}`)
for (const [numero, cible, type] of MOTIFS) if (liensSegment(numero).filter((lien) => lien.canon_id === cible && lien.type === type).length !== 1) throw new Error(`Motif non univoque ${numero}/${cible}/T${type}`)
for (const [numero, avant] of TEXTES) if (!parNumero.get(numero).segment_texte.includes(avant)) throw new Error(`Texte non synchronisable ${numero}`)
for (const [numero, avant] of NOTES) if (!parNumero.get(numero).notes?.includes(avant)) throw new Error(`Note non synchronisable ${numero}`)
console.log(JSON.stringify({ mode: WRITE ? 'écriture' : 'contrôle', echantillon: 42, ajouts: AJOUTS.length, suppressions: SUPPRESSIONS.length, retypages: RETYPAGES.length, motifs: MOTIFS.length, corrections_texte: TEXTES.length, corrections_notes: NOTES.length, anomalies_probables_non_mutees: ['2114 fusion italique et motif T3', '2324 NUM.30.5-6 T3', '2576 ajout éventuel DEU.24.17 T1'], avancement: '3262 / 3262 = 100,00 %' }, null, 2))
if (!WRITE) process.exit(0)

const candidatsPath = 'scripts/heptateuque/segmentation-candidate/segments-candidate.json'
const sourceMapPath = 'scripts/heptateuque/segmentation-candidate/source-map.json'
const candidats = JSON.parse(readFileSync(candidatsPath, 'utf8'))
const sourceMap = JSON.parse(readFileSync(sourceMapPath, 'utf8'))
for (const [numero, avant] of TEXTES_CANDIDATS) {
  const candidat = candidats.find((segment) => segment.segment_numero === numero)
  if (!candidat?.segment_texte.includes(avant)) throw new Error(`Candidat texte non synchronisable ${numero}`)
}
for (const [numero, avant] of TEXTES_SOURCES) {
  const sources = sourceMap.filter((source) => source.source_clean?.includes(avant))
  if (sources.length !== 1) throw new Error(`Source-map non synchronisable ${numero}: ${sources.length}`)
}
for (const [numero, avant] of NOTES) {
  const candidat = candidats.find((segment) => segment.segment_numero === numero)
  if (!candidat?.notes?.includes(avant)) throw new Error(`Candidat note non synchronisable ${numero}`)
}

const quote = (value) => `'${String(value).replaceAll("'", "''")}'`
const sqlTexte = TEXTES.map(([numero, avant, apres]) => `update segments set segment_texte=replace(segment_texte,${quote(avant)},${quote(apres)}) where id=${parNumero.get(numero).id} and segment_texte like ${quote(`%${avant}%`)}; get diagnostics n=row_count; if n<>1 then raise exception 'Texte ${numero}: %',n; end if;`).join('\n')
const sqlNotes = NOTES.map(([numero, avant, apres]) => `update segments set notes=replace(notes,${quote(avant)},${quote(apres)}) where id=${parNumero.get(numero).id} and notes like ${quote(`%${avant}%`)}; get diagnostics n=row_count; if n<>1 then raise exception 'Note ${numero}: %',n; end if;`).join('\n')
const sqlSuppressions = SUPPRESSIONS.map(([numero, cible, type]) => `delete from liens_bibliques where segment_id=${parNumero.get(numero).id} and canon_id=${quote(cible)} and type=${type}; get diagnostics n=row_count; if n<>1 then raise exception 'Suppression ${numero}/${cible}: %',n; end if;`).join('\n')
const sqlRetypages = RETYPAGES.map(([numero, cible, avant, apres, motif]) => `update liens_bibliques set type=${apres},motif=${quote(motif)} where segment_id=${parNumero.get(numero).id} and canon_id=${quote(cible)} and type=${avant}; get diagnostics n=row_count; if n<>1 then raise exception 'Retypage ${numero}/${cible}: %',n; end if;`).join('\n')
const sqlMotifs = MOTIFS.map(([numero, cible, type, motif]) => `update liens_bibliques set motif=${quote(motif)} where segment_id=${parNumero.get(numero).id} and ${cible ? `canon_id=${quote(cible)}` : 'canon_id is null'} and type=${type}; get diagnostics n=row_count; if n<>1 then raise exception 'Motif ${numero}: %',n; end if;`).join('\n')
const valeurs = AJOUTS.map(([numero, cible, type, motif]) => `(${parNumero.get(numero).id},${quote(cible)},${type},'vérifié',${quote(motif)},'lecture',false)`).join(',\n')
const sql = `do $p$ declare n integer; begin ${sqlTexte} ${sqlNotes} ${sqlSuppressions} ${sqlRetypages} ${sqlMotifs} insert into liens_bibliques(segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis) values ${valeurs}; get diagnostics n=row_count; if n<>${AJOUTS.length} then raise exception 'Ajouts: %',n; end if; end $p$;`
const { error: erreurEcriture } = await db.rpc('exec_sql', { sql })
if (erreurEcriture) throw erreurEcriture

for (const [numero, avant, apres] of TEXTES_CANDIDATS) {
  const candidat = candidats.find((segment) => segment.segment_numero === numero)
  candidat.segment_texte = candidat.segment_texte.replace(avant, apres)
}
for (const [, avant, apres] of TEXTES_SOURCES) {
  const source = sourceMap.find((item) => item.source_clean?.includes(avant))
  source.source_clean = source.source_clean.replace(avant, apres)
}
for (const [numero, avant, apres] of NOTES) {
  const candidat = candidats.find((segment) => segment.segment_numero === numero)
  candidat.notes = candidat.notes.replace(avant, apres)
}
writeFileSync(candidatsPath, `${JSON.stringify(candidats, null, 2)}\n`, 'utf8')
writeFileSync(sourceMapPath, `${JSON.stringify(sourceMap, null, 2)}\n`, 'utf8')
console.log('✓ corrections certaines de la passe aléatoire appliquées et candidats synchronisés')
