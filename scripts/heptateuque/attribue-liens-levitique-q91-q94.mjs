import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre troisième'
const DEBUT = 1972
const FIN = 1986
const TOTAL_SEGMENTS = 15
const QUESTIONS = ['Question XCI', 'Question XCII', 'Question XCIII', 'Question XCIV']
const WRITE = process.argv.includes('--write')
const DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Lévitique Q. XCI-XCIV'
const EMPREINTE_ATTENDUE = '8a68e3054e64f94b356dba12d3b2f1923b120acdad1b8a13d3f10a1985639839'
const PREUVES = [
  ['scripts/heptateuque/img/p511.jpg', '12783b04386a65f9093b494f6f54fdeb15053def3ea1cf49561948147e1f5083', 'La page imprimée 503 atteste « par ce qu’il » en deux mots. Le sic orthographique est conservé.'],
  ['scripts/heptateuque/img/p512.jpg', '0443ff863cd577723e498a8aac156761d7de629bcd41aaf34aa5824f060db97d', 'La page imprimée 504 atteste « pas sage » en deux mots, ainsi que le deux-points après « Apollinaristes », le point final de la citation et l’absence de virgule entre « les » et « enfants ».'],
]
const CORRECTIONS_TEXTE = new Map([
  [1981, [
    { avant: 'Apollinaristes ces hérétiques', apres: 'Apollinaristes : ces hérétiques' },
    { avant: 'mort[[523]] » Mais', apres: 'mort[[523]]. » Mais', candidatAvant: 'mort[[523]] » Mais', candidatApres: 'mort[[523]]. » Mais' },
  ]],
  [1985, [
    { avant: 'que les, enfants', apres: 'que les enfants' },
  ]],
])

const LIENS = []
const NON_RESOLUS = []
const SANS_LIEN = new Set()
const add = (ns, canonId, type, motif) => {
  for (const numero of ns) LIENS.push([numero, canonId, type, motif])
}
const cite = (n, canonId, motif) => add([n], canonId, 1, motif)
const reprise = (n, canonId, motif) => add([n], canonId, 2, motif)
const com = (ns, canonId, motif) => add(ns, canonId, 3, motif)
const citeCom = (n, canonId, citation, commentaire) => {
  cite(n, canonId, citation)
  com([n], canonId, commentaire)
}
const nonBiblique = (n, motif) => NON_RESOLUS.push([n, 4, `RÉFÉRENCE NON BIBLIQUE ${motif}`])

// Question XCI — lectures de Lévitique 25,23-24 : profanation, perpétuité, loyer ou rachat.
citeCom(1972, 'LEV.25.24', 'Citation explicite vérifiée de la condition de rachat dans tout le pays possédé, selon les leçons « payer le loyer » ou « racheter la terre ».', 'La variante est interprétée comme redevance ou droit de rachat attaché à la possession de la terre.')
nonBiblique(1972, '(certains exemplaires bibliques non identifiés) : variante « vous rachèterez la terre » opposée à « vous payerez le loyer de votre terre » ; témoins à constituer.')
citeCom(1973, 'LEV.25.23', 'Citation explicite vérifiée des deux leçons anciennes de l’interdit de vendre la terre pour un usage profane ou d’une manière irrévocable.', 'Les deux lectures sont expliquées comme interdiction de vendre aux profanes ou à perpétuité.')
citeCom(1974, 'LEV.25.23', 'Citation explicite vérifiée de la déclaration divine « la terre est à moi ».', 'La propriété divine fonde l’obligation d’user de la terre selon le commandement.')
citeCom(1975, 'LEV.25.23', 'Citation explicite vérifiée de la condition des Israélites comme étrangers et fermiers de Dieu.', 'Les termes « étrangers » et « gens en séjour » sont développés pour montrer que le peuple ne possède pas la terre en propre.')
com([1976], 'LEV.25.23', 'La condition de l’homme comme étranger devant Dieu prolonge l’explication des Israélites locataires de la terre divine.')
cite(1976, 'JER.23.24', 'Référence explicite vérifiée, avec note ancienne, à Dieu qui remplit le ciel et la terre de sa présence.')

// Question XCII — le rachat de la terre expliqué par les cycles sabbatique et jubilaire.
citeCom(1977, 'LEV.25.24', 'Citation explicite vérifiée de la condition de rachat de la terre dans tout le pays possédé.', 'Le loyer ou rachat est interprété comme redevance payée à Dieu, véritable propriétaire de la terre.')
com([1977], 'LEV.25.4', 'Le repos forcé de la terre chaque septième année est mobilisé comme forme de redevance envers Dieu.')
com([1977], 'LEV.25.10', 'La cinquantième année de rémission, où chacun retourne dans sa propriété, éclaire la notion de rachat de la terre.')

// Question XCIII — « l’âme » de Dieu, son immutabilité et l’âme humaine du Christ.
citeCom(1978, 'LEV.26.11', 'Citation explicite vérifiée de la demeure établie par Dieu et de son âme qui ne prend pas son peuple en abomination.', 'L’âme de Dieu est interprétée comme sa volonté, non comme une partie d’un être composé.')
cite(1978, 'ISA.57.16', 'Citation explicite vérifiée, avec note ancienne, de Dieu comme créateur des souffles ou des âmes.')
com([1979, 1980, 1981], 'LEV.26.11', 'La mention de l’âme de Dieu est expliquée analogiquement, puis distinguée de l’âme créée et changeante de l’homme.')
cite(1980, 'JAS.1.17', 'Référence explicite vérifiée, avec note, à l’absence de changement et de vicissitude en Dieu.')
reprise(1980, 'JHN.4.24', 'La formule exacte « Dieu est esprit » est reprise sans référence ni développement direct du verset johannique.')
cite(1981, '1TI.2.5', 'Citation explicite vérifiée, avec note, de l’unique médiateur entre Dieu et les hommes, le Christ Jésus fait homme.')
citeCom(1981, 'MAT.26.38', 'Citation explicite vérifiée de « Mon âme est triste jusqu’à la mort » ; la note imprimée Matthieu 25,38 est numériquement fautive.', 'La parole du Christ est invoquée contre les Apollinaristes comme preuve manifeste de son âme humaine.')

// Question XCIV — portée hyperbolique de la menace du glaive.
citeCom(1982, 'LEV.26.33', 'Citation explicite vérifiée de la dispersion parmi les nations, du glaive et de la désolation du pays et des villes.', 'La menace du glaive qui anéantit ouvre la difficulté sur la survie dans le pays des ennemis.')
citeCom(1982, 'LEV.26.34', 'Citation explicite vérifiée de la terre qui jouit de ses sabbats pendant sa désolation, tandis que le peuple est chez ses ennemis.', 'La survie en pays ennemi est mise en tension avec la formule d’anéantissement par le glaive.')
com([1983], 'LEV.26.33', 'La question demande comment le glaive peut anéantir ceux qui ont été dispersés parmi les nations ennemies.')
com([1983], 'LEV.26.34', 'Le séjour des survivants dans le pays de leurs ennemis fonde l’objection adressée à la menace d’anéantissement.')
citeCom(1984, 'LEV.26.33', 'Citation explicite vérifiée, sous la paraphrase « Le glaive vous consumera », de la menace du glaive poursuivant les dispersés.', '« Consumer » est proposé comme manière de dire « faire mourir » sans impliquer la disparition de tous.')
citeCom(1984, 'LEV.26.36', 'Citation explicite vérifiée des survivants auxquels Dieu met l’épouvante dans le cœur ; la note imprimée 26,33-34 est fautive.', 'L’existence même de survivants en 26,36 résout partiellement l’apparente totalité de l’anéantissement.')
citeCom(1985, 'LEV.26.33', 'Citation explicite vérifiée, reprise sous la forme « il vous consumera », de la menace du glaive.', 'La totalité apparente de la menace est proposée comme hyperbole biblique.')
cite(1985, 'GEN.22.17', 'Référence explicite vérifiée à la postérité d’Abraham multipliée comme le sable du rivage de la mer.')
cite(1985, 'GEN.32.13', 'Référence intentionnelle vérifiée par le contenu : la note ancienne Genèse 32,12 vise dans le canon local Genèse 32,13, où la postérité est comparée au sable de la mer.')
citeCom(1986, 'LEV.26.36', 'Citation explicite vérifiée du bruit d’une feuille agitée qui poursuit et effraie les survivants.', 'La formule est expliquée comme manière hyperbolique d’exprimer une épouvante extrême devant les moindres choses.')

for (const [path, hash] of PREUVES) {
  const obtenu = createHash('sha256').update(readFileSync(path)).digest('hex')
  if (obtenu !== hash) throw Error(`Preuve fac-similé modifiée : ${path} (${obtenu})`)
}

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .map(line => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
    .filter(Boolean)
    .map(match => [match[1], match[2].replace(/^["']|["']$/g, '')]),
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const { data: bruts, error: e0 } = await sb
  .from('segments')
  .select('id,segment_numero,ref_niv1,ref_niv2,ref_niv2_texte,segment_texte,texte_original,notes,nature,liens_revus_le,liens_revus_par')
  .eq('id_oeuvre', OEUVRE)
  .gte('segment_numero', DEBUT - 1)
  .lte('segment_numero', FIN + 1)
  .order('segment_numero')
if (e0) throw e0

const voisinAvant = bruts.find(segment => segment.segment_numero === DEBUT - 1)
const voisinApres = bruts.find(segment => segment.segment_numero === FIN + 1)
if (voisinAvant?.ref_niv1 !== REF_NIV1 || voisinAvant?.ref_niv2 !== 'Question XC') throw Error('Raccord amont invalide')
if (voisinApres?.ref_niv1 !== 'Livre quatrième' || voisinApres?.ref_niv2 !== 'Question I') throw Error('Raccord aval invalide')

const segments = bruts.filter(segment => segment.segment_numero >= DEBUT && segment.segment_numero <= FIN)
if (
  segments.length !== TOTAL_SEGMENTS
  || segments.some((segment, index) => segment.segment_numero !== DEBUT + index)
  || segments.some(segment => segment.ref_niv1 !== REF_NIV1 || !QUESTIONS.includes(segment.ref_niv2))
  || [...new Set(segments.map(segment => segment.ref_niv2))].join('|') !== QUESTIONS.join('|')
) throw Error('Préétat structurel invalide')
if (segments.some(segment => segment.liens_revus_le || segment.liens_revus_par)) throw Error('Lot déjà relu')
for (const [numero, corrections] of CORRECTIONS_TEXTE) {
  const texte = segments.find(segment => segment.segment_numero === numero)?.segment_texte
  for (const { avant } of corrections) if (!texte?.includes(avant)) throw Error(`Précondition de correction invalide au segment ${numero} : ${avant}`)
}

const empreinte = createHash('sha256')
  .update(JSON.stringify(segments.map(segment => [segment.id, segment.segment_numero, segment.ref_niv1, segment.ref_niv2, segment.ref_niv2_texte, segment.segment_texte, segment.texte_original, segment.notes, segment.nature])))
  .digest('hex')
if (empreinte !== EMPREINTE_ATTENDUE) throw Error(`Empreinte inattendue : ${empreinte}`)

const parNumero = new Map(segments.map(segment => [segment.segment_numero, segment]))
const numerosClasses = new Set([...LIENS, ...NON_RESOLUS].map(lien => lien[0]))
const nonClasses = segments.filter(segment => !numerosClasses.has(segment.segment_numero) && !SANS_LIEN.has(segment.segment_numero))
if (nonClasses.length) throw Error(`Segments non classés : ${nonClasses.map(segment => segment.segment_numero).join(', ')}`)
if ([...SANS_LIEN].some(numero => numerosClasses.has(numero) || !parNumero.has(numero))) throw Error('Déclaration SANS_LIEN invalide')
if (LIENS.some(([numero, canonId, type, motif]) => !parNumero.has(numero) || !canonId || ![1, 2, 3, 4].includes(type) || !motif.trim())) throw Error('Lien biblique invalide dans le manifeste')
if (NON_RESOLUS.some(([numero, type, motif]) => !parNumero.has(numero) || type !== 4 || !motif.startsWith('RÉFÉRENCE NON BIBLIQUE'))) throw Error('Référence non biblique invalide dans le manifeste')
const cles = LIENS.map(([numero, canonId, type]) => `${numero}|${canonId}|${type}`)
if (new Set(cles).size !== cles.length) throw Error('Doublon interne dans le manifeste')

const cibles = [...new Set(LIENS.map(([, canonId]) => canonId))]
const { data: versets, error: e1 } = await sb.from('versets_lecture').select('id_verset,TR0001,TR0003,TR0004').in('id_verset', cibles)
if (e1) throw e1
const parCible = new Map(versets.map(verset => [verset.id_verset, verset]))
const absentes = cibles.filter(cible => !parCible.has(cible))
if (absentes.length) throw Error(`Cibles absentes : ${absentes.join(', ')}`)
if (cibles.some(cible => {
  const verset = parCible.get(cible)
  return !verset.TR0001 || !verset.TR0003 || !verset.TR0004
})) throw Error('Cible incomplète dans les trois témoins locaux')

const ids = segments.map(segment => segment.id)
const [{ count: liensExistants, error: e2 }, { count: relusGlobaux, error: e3 }] = await Promise.all([
  sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  sb.from('segments').select('id', { count: 'exact', head: true }).eq('id_oeuvre', OEUVRE).not('liens_revus_le', 'is', null),
])
if (e2 || e3) throw (e2 || e3)
if (liensExistants) throw Error(`${liensExistants} liens préexistants dans le lot`)

const candidatsPath = 'scripts/heptateuque/segmentation-candidate/segments-candidate.json'
const sourceMapPath = 'scripts/heptateuque/segmentation-candidate/source-map.json'
const candidats = JSON.parse(readFileSync(candidatsPath, 'utf8'))
const sourceMap = JSON.parse(readFileSync(sourceMapPath, 'utf8'))
for (const [numero, corrections] of CORRECTIONS_TEXTE) {
  const candidat = candidats.find(item => item.segment_numero === numero)
  if (!candidat) throw Error(`Candidat absent au segment ${numero}`)
  for (const { avant, apres, candidatAvant = avant, candidatApres = apres } of corrections) {
    if (!candidat.segment_texte.includes(candidatAvant)) throw Error(`Candidat non synchronisable au segment ${numero} : ${candidatAvant}`)
    candidat.segment_texte = candidat.segment_texte.replace(candidatAvant, candidatApres)
    const sources = sourceMap.filter(item => item.first_segment_numero <= numero && item.last_segment_numero >= numero && item.source_clean?.includes(candidatAvant))
    if (sources.length !== 1) throw Error(`Source-map non synchronisable au segment ${numero} : ${candidatAvant} (${sources.length})`)
    sources[0].source_clean = sources[0].source_clean.replace(candidatAvant, candidatApres)
  }
}

const total = LIENS.length + NON_RESOLUS.length
const types = LIENS.reduce((acc, lien) => {
  acc[lien[2]] = (acc[lien[2]] || 0) + 1
  return acc
}, {})
if (NON_RESOLUS.length) types[4] = (types[4] || 0) + NON_RESOLUS.length
const pct = n => `${n} / 3262 = ${(100 * n / 3262).toFixed(2).replace('.', ',')} %`
console.log(JSON.stringify({
  mode: WRITE ? 'écriture' : 'contrôle',
  lot: 'Lévitique XCI-XCIV',
  bornes: [DEBUT, FIN],
  voisins: { avant: [voisinAvant.segment_numero, voisinAvant.ref_niv1, voisinAvant.ref_niv2], apres: [voisinApres.segment_numero, voisinApres.ref_niv1, voisinApres.ref_niv2] },
  ref_niv1: REF_NIV1,
  questions: QUESTIONS,
  segments: TOTAL_SEGMENTS,
  corrections_ocr: [...CORRECTIONS_TEXTE.values()].reduce((n, corrections) => n + corrections.length, 0),
  preuves_fac_simile: PREUVES.map(([path, , constat]) => ({ path, constat })),
  liens: total,
  liens_bibliques: LIENS.length,
  sans_cible_a_constituer: NON_RESOLUS.length,
  sans_lien: [...SANS_LIEN],
  cibles_distinctes: cibles.length,
  types,
  empreinte,
  anciennes_numerotations_arbitrees: ['Matthieu 25,38 → MAT.26.38', 'Lévitique 26,33-34 au segment 1984 → LEV.26.36', 'Genèse 32,12 → GEN.32.13'],
  sic_fac_simile: ['segment 1976 : « par ce [sic] qu’il » confirmé', 'segment 1983 : « pas sage [sic] » confirmé'],
  avancement_actuel: pct(relusGlobaux),
  avancement_apres_ecriture_ulterieure: pct(relusGlobaux + TOTAL_SEGMENTS),
}, null, 2))

if (DETAIL) {
  for (const [numero, canonId, type, motif] of LIENS) console.log({ numero, canonId, type, motif, segment: parNumero.get(numero).segment_texte, ...parCible.get(canonId) })
  for (const [numero, type, motif] of NON_RESOLUS) console.log({ numero, canonId: null, type, motif, segment: parNumero.get(numero).segment_texte })
}
if (!WRITE) process.exit(0)

const horodatage = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
const sauvegardePath = `scripts/heptateuque/audit-reprise/sauvegarde-levitique-q91-q94-${horodatage}.json`
mkdirSync('scripts/heptateuque/audit-reprise', { recursive: true })
writeFileSync(sauvegardePath, `${JSON.stringify({ oeuvre: OEUVRE, bornes: [DEBUT, FIN], empreinte, segments, liens_existants: [] }, null, 2)}\n`, 'utf8')

const quote = value => `'${String(value).replaceAll("'", "''")}'`
const valeurs = [
  ...LIENS.map(([numero, canonId, type, motif]) => `(${parNumero.get(numero).id}, ${quote(canonId)}, ${type}, 'vérifié', ${quote(motif)}, 'lecture', false)`),
  ...NON_RESOLUS.map(([numero, type, motif]) => `(${parNumero.get(numero).id}, null, ${type}, 'à constituer', ${quote(motif)}, 'lecture', true)`),
].join(',\n    ')
const idsSql = ids.join(', ')
const correctionsSql = [...CORRECTIONS_TEXTE].flatMap(([numero, corrections]) => corrections.map(({ avant, apres }) => {
  const id = parNumero.get(numero).id
  return `update segments set segment_texte = replace(segment_texte, ${quote(avant)}, ${quote(apres)}) where id = ${id} and segment_texte like ${quote(`%${avant}%`)};
  get diagnostics n = row_count; if n <> 1 then raise exception 'Correction OCR segment ${numero}: %/1', n; end if;`
})).join('\n  ')
const sql = `do $passe$ declare n integer; begin
  if exists (select 1 from liens_bibliques where segment_id in (${idsSql})) then raise exception 'Liens déjà présents'; end if;
  if exists (select 1 from segments where id in (${idsSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Marques déjà présentes'; end if;
  if (select count(*) from segments where id in (${idsSql}) and id_oeuvre = '${OEUVRE}' and ref_niv1 = ${quote(REF_NIV1)} and ref_niv2 in (${QUESTIONS.map(quote).join(', ')}) and segment_numero between ${DEBUT} and ${FIN}) <> ${TOTAL_SEGMENTS} then raise exception 'Préconditions structurelles invalides'; end if;
  ${correctionsSql}
  insert into liens_bibliques (segment_id, canon_id, type, fiabilite, motif, provenance, arbitrage_requis) values ${valeurs};
  get diagnostics n = row_count; if n <> ${total} then raise exception 'Liens %/${total}', n; end if;
  update segments set liens_revus_le = now(), liens_revus_par = ${quote(RELECTEUR)} where id in (${idsSql});
  get diagnostics n = row_count; if n <> ${TOTAL_SEGMENTS} then raise exception 'Segments %/${TOTAL_SEGMENTS}', n; end if;
end $passe$;`

const { error: ecritureErreur } = await sb.rpc('exec_sql', { sql })
if (ecritureErreur) throw ecritureErreur
const [{ count: liensApres, error: e4 }, { count: relusApres, error: e5 }, { data: audit, error: e6 }, { data: textesApres, error: e7 }] = await Promise.all([
  sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  sb.from('segments').select('id', { count: 'exact', head: true }).in('id', ids).not('liens_revus_le', 'is', null),
  sb.from('liens_bibliques').select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id', ids),
  sb.from('segments').select('segment_numero,segment_texte').in('id', ids),
])
if (e4 || e5 || e6 || e7) throw (e4 || e5 || e6 || e7)
const textesParNumero = new Map(textesApres.map(segment => [segment.segment_numero, segment.segment_texte]))
const correctionInvalide = [...CORRECTIONS_TEXTE].some(([numero, corrections]) => corrections.some(({ avant, apres }) => textesParNumero.get(numero).includes(avant) || !textesParNumero.get(numero).includes(apres)))
if (liensApres !== total || relusApres !== TOTAL_SEGMENTS || correctionInvalide || audit.some(lien => !lien.motif || lien.provenance !== 'lecture' || (lien.canon_id ? lien.fiabilite !== 'vérifié' || lien.arbitrage_requis : lien.fiabilite !== 'à constituer' || !lien.arbitrage_requis || lien.type !== 4 || !lien.motif.startsWith('RÉFÉRENCE NON BIBLIQUE')))) throw Error('Postcontrôle invalide')
const clesApres = audit.map(lien => `${lien.segment_id}|${lien.canon_id ?? 'sans-cible'}|${lien.type}|${lien.motif}`)
if (new Set(clesApres).size !== clesApres.length) throw Error('Doublon dans le postétat')
writeFileSync(candidatsPath, `${JSON.stringify(candidats, null, 2)}\n`, 'utf8')
writeFileSync(sourceMapPath, `${JSON.stringify(sourceMap, null, 2)}\n`, 'utf8')
console.log(`✓ ${liensApres} liens, ${relusApres} segments, sauvegarde ${sauvegardePath}`)
