import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre quatrième'
const PREMIER = 1987
const DERNIER = 2034
const NB_SEGMENTS = 48
const WRITE = process.argv.includes('--write')
const DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Nombres Q. I-X'
const EMPREINTE_ATTENDUE = 'e780ff4e6c5422e837bfc4dc2055d28edcc108b83427ab5ade0c973b42122214'
const QUESTIONS = ['Question I', 'Question II', 'Question III', 'Question IV', 'Question V', 'Question VI', 'Question VII', 'Question VIII', 'Question IX', 'Question X']
const PREUVES = [
  ['scripts/heptateuque/img/p513.jpg', '585ef2835375244449d5ed16d346c12324a286ffebceb5bff9dea11195a68668', 'La page imprimée 505 ne comporte aucun blanc interne après l’ouverture de l’italique dans « leurs parentés ».'],
]
const CORRECTIONS_TEXTE = new Map([[1991, ['<i> leurs parentés', '<i>leurs parentés']]])

const LIENS = []
const add = (segmentNumero, canonId, type, motif) => LIENS.push([segmentNumero, canonId, type, motif])
const both = (segmentNumero, canonId, motif) => {
  add(segmentNumero, canonId, 1, `${motif} — citation ou référence intentionnelle.`)
  add(segmentNumero, canonId, 3, `${motif} — passage commenté ou mobilisé dans le raisonnement.`)
}
const explain = (segmentNumero, canonIds, motif) => { for (const canonId of canonIds) add(segmentNumero, canonId, 3, `${motif} (${canonId}).`) }
const NON_RESOLUS = []
const nonBiblique = (segmentNumero, motif) => NON_RESOLUS.push([segmentNumero, 4, `RÉFÉRENCE NON BIBLIQUE — ${motif} ; cible de corpus à constituer.`])

// Question I — chefs des tribus et chefs de milliers.
both(1987, 'NUM.1.4', 'Dieu ordonne qu’un chef de maison patriarcale soit choisi dans chaque tribu')
both(1987, 'NUM.1.16', 'Les princes des tribus sont appelés chefs des milliers d’Israël')
nonBiblique(1987, 'un certain nombre d’interprètes latins rendent le grec « kiliarques » par « tribuns »')
both(1988, 'EXO.18.21', 'Jéthro conseille à Moïse d’établir des chefs de milliers, centaines, cinquantaines et dizaines')
both(1988, 'EXO.18.25', 'Moïse exécute le conseil et établit les quatre degrés de chefs')
explain(1989, ['NUM.1.4', 'NUM.1.16'], 'Le chef unique de chaque tribu commande non mille hommes seulement, mais les milliers de sa tribu.')
explain(1990, ['EXO.18.25', 'NUM.1.16'], 'Le même nom grec s’applique aux chefs de mille de l’Exode et aux chefs des milliers tribaux des Nombres.')

// Question II — formules du recensement et symbolisme de quatre, cinq et vingt.
both(1991, 'NUM.1.20', 'La formule du recensement selon familles, maisons, noms, sexe et âge est citée comme modèle répété pour chaque tribu')
explain(1991, ['NUM.1.45'], 'La récapitulation de tous les recensés selon leurs maisons patriarcales confirme la portée générale de la formule.')
for (const n of [1992, 1993, 1994, 1995, 1996, 1997]) explain(n, ['NUM.1.20', 'NUM.1.45'], 'Les cinq désignations généalogiques et les quatre qualifications militaires de la formule répétée sont analysées symboliquement.')
explain(1998, ['NUM.1.20'], 'L’âge militaire de vingt ans est interprété comme le produit des nombres quatre et cinq.')
add(1998, 'DEU.5.32', 2, 'La formule de l’âge qui ne penche ni à droite ni à gauche reprend la prescription de ne se détourner d’aucun côté.')
explain(1999, ['NUM.1.20'], 'Les cinq livres de l’ancienne Alliance et les quatre Évangiles donnent une lecture spirituelle des nombres présents dans le recensement.')

// Question III — l’Israélite non lévite appelé étranger.
both(2000, 'NUM.1.51', 'Les Lévites démontent et dressent la Demeure, et l’étranger qui approche est mis à mort')
explain(2001, ['NUM.1.51'], 'Le mot grec traduit par étranger est étudié comme désignant ici un Israélite d’une autre tribu plutôt qu’un homme d’une autre nation.')

// Question IV — gardes ou veilles des Lévites.
both(2002, 'NUM.3.5', 'Le Seigneur introduit l’ordre donné à Moïse au sujet de la tribu de Lévi')
both(2002, 'NUM.3.6', 'La tribu de Lévi est placée devant Aaron afin de le servir')
both(2002, 'NUM.3.7', 'Les Lévites ont la garde d’Aaron et de l’assemblée devant la tente')
explain(2003, ['NUM.3.7'], 'Le mot grec de la garde lévitique est interprété comme des veilles militaires organisées par tours.')
nonBiblique(2003, 'les traducteurs sont répartis entre les rendus latins custodias et excubias, auxquels Augustin préfère vigiliae')
both(2004, 'MAT.14.25', 'Le Christ vient à la quatrième veille de la nuit en marchant sur la mer')
nonBiblique(2004, 'les interprètes sont collectivement crédités du rendu de phylakas par vigilias dans d’autres passages')
for (const n of [2005, 2006]) explain(n, ['NUM.3.7'], 'La garde des Lévites est comprise comme leur participation aux tours de veille du camp, malgré leur service du tabernacle.')

// Question V — mort de l’étranger qui usurpe le service sacré.
both(2007, 'NUM.3.10', 'Aaron et ses fils exercent le sacerdoce, et l’étranger qui approche est puni de mort')
both(2007, 'LEV.6.11', 'Quiconque touche l’offrande très sainte est sanctifié ; la note imprimée Lévitique 6,18 suit l’ancienne numérotation')
explain(2008, ['NUM.3.10', 'LEV.6.11'], 'Toucher est distingué selon qu’il signifie usurper une fonction sacrée ou entrer en contact avec une offrande sainte.')

// Question VI — substitution des Lévites aux premiers-nés.
both(2009, 'NUM.3.12', 'Dieu prend les Lévites à la place de tous les premiers-nés d’Israël')
both(2009, 'NUM.3.46', 'Deux cent soixante-treize premiers-nés dépassent le nombre des Lévites')
both(2009, 'NUM.3.47', 'Les premiers-nés surnuméraires sont rachetés à cinq sicles par tête')
explain(2010, ['NUM.3.41', 'NUM.3.45'], 'Le bétail des Lévites est pris à la place des premiers-nés du bétail d’Israël.')
both(2010, 'EXO.13.13', 'Les premiers-nés impurs sont rachetés par substitution d’un agneau, et les premiers-nés humains doivent aussi être rachetés')
for (const n of [2011, 2012, 2013]) explain(n, ['NUM.3.12', 'NUM.3.13', 'NUM.3.41', 'NUM.3.45'], 'La descendance des Lévites et de leur bétail appartient déjà à Dieu et ne peut servir de nouvel échange pour les premiers-nés futurs.')
both(2013, 'EXO.13.2', 'Tout premier-né des hommes et des animaux est consacré à Dieu et lui appartient')

// Question VII — pain perpétuel sur la table.
both(2014, 'NUM.4.7', 'Lors du transport, le pain perpétuel demeure sur la table des pains de proposition')
explain(2014, ['LEV.24.8'], 'Le renouvellement régulier des pains devant Dieu explique la permanence de la table couverte, non l’identité matérielle des pains.')
explain(2015, ['NUM.4.7', 'LEV.24.8'], 'Toujours qualifie la présence de pains sur la table, non la conservation indéfinie des mêmes pains.')

// Question VIII — couverture de l’autel d’or.
both(2016, 'NUM.4.11', 'Le drap violet posé sur l’autel d’or puis recouvert d’une peau est cité dans sa construction difficile')
nonBiblique(2016, 'les interprètes latins sont crédités de l’identification d’une locution bizarre et inachevée')
explain(2017, ['NUM.4.11'], 'Le refus de certains traducteurs et leur reformulation par « envelopper l’autel » sont discutés contre la lettre du passage.')
nonBiblique(2017, 'les interprètes latins refusant la construction littérale proposent une autre traduction')
for (const n of [2018, 2019]) explain(n, ['NUM.4.11'], 'Les deux couvertures successives, le drap puis la peau, résolvent la difficulté de construction.')

// Question IX — confession et restitution avec un cinquième.
both(2020, 'NUM.5.6', 'L’homme ou la femme qui lèse le prochain se rend coupable envers Dieu')
both(2020, 'NUM.5.7', 'Le coupable confesse son péché, restitue le capital et ajoute un cinquième')
both(2021, 'NUM.5.8', 'À défaut de proche du lésé, la restitution revient à Dieu et au prêtre, outre le bélier expiatoire')
explain(2022, ['NUM.5.7', 'NUM.5.8'], 'La restitution monétaire, le cinquième supplémentaire et le bélier sont distingués et additionnés.')
for (const n of [2023, 2024, 2025, 2026, 2027]) explain(n, ['NUM.5.8'], 'La restitution au proche, à défaut au Seigneur puis au prêtre, et l’idiotisme « à lui-même » sont expliqués dans leur ordre juridique.')

// Question X — conciliation avec les restitutions doubles, quadruples et quintuples.
both(2028, 'EXO.21.37', 'Le voleur d’un bœuf ou d’un agneau égorgé ou vendu restitue cinq bœufs ou quatre agneaux ; l’ancienne référence imprimée Exode 22,1 correspond au verset local 21,37')
both(2028, 'EXO.22.3', 'La bête volée retrouvée vivante entraîne une restitution au double ; l’ancienne référence imprimée Exode 22,4 correspond au verset local 22,3')
explain(2029, ['EXO.21.37', 'EXO.22.3', 'NUM.5.7'], 'Les peines du double, du quadruple et du quintuple sont confrontées au capital augmenté d’un cinquième.')
for (const n of [2030, 2031, 2032]) explain(n, ['NUM.5.6', 'NUM.5.7'], 'La faute involontaire ou humaine est distinguée du vol prémédité par la restitution limitée au principal et au cinquième.')
for (const n of [2033, 2034]) explain(n, ['NUM.5.6', 'NUM.5.7', 'EXO.22.3'], 'L’aveu spontané explique l’atténuation par rapport au voleur surpris ou convaincu, tenu au double.')

const SANS_LIEN = new Set()
for (const [path, hash] of PREUVES) {
  const obtenu = createHash('sha256').update(readFileSync(path)).digest('hex')
  if (obtenu !== hash) throw new Error(`Preuve fac-similé modifiée : ${path} (${obtenu})`)
}
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: segments, error } = await sb.from('segments').select('id,segment_numero,segment_texte,notes,ref_niv1,ref_niv2,ref_niv2_texte,liens_revus_le,liens_revus_par').eq('id_oeuvre', OEUVRE).eq('ref_niv1', REF_NIV1).in('ref_niv2', QUESTIONS).order('segment_numero')
if (error) throw error
if (segments.length !== NB_SEGMENTS || segments.some((segment, index) => segment.segment_numero !== PREMIER + index)) throw new Error('Préétat : bornes ou continuité invalides')
if ([...new Set(segments.map((segment) => segment.ref_niv2))].join('|') !== QUESTIONS.join('|')) throw new Error('Questions incomplètes ou désordonnées')
if (segments.some((segment) => segment.ref_niv1 !== REF_NIV1 || segment.liens_revus_le || segment.liens_revus_par)) throw new Error('Préétat structurel ou relecture invalide')
for (const [segmentNumero, [avant]] of CORRECTIONS_TEXTE) {
  const segment = segments.find((item) => item.segment_numero === segmentNumero)
  if (!segment?.segment_texte.includes(avant)) throw new Error(`Précondition de correction invalide au segment ${segmentNumero}`)
}
const empreinte = createHash('sha256').update(JSON.stringify(segments.map((segment) => [segment.id, segment.segment_numero, segment.ref_niv1, segment.ref_niv2, segment.ref_niv2_texte, segment.segment_texte, segment.notes]))).digest('hex')
if (empreinte !== EMPREINTE_ATTENDUE) throw new Error(`Préétat modifié : ${empreinte}`)
const parNumero = new Map(segments.map((segment) => [segment.segment_numero, segment]))
const numerosClasses = new Set([...LIENS, ...NON_RESOLUS].map(([segmentNumero]) => segmentNumero))
const nonClasses = segments.filter((segment) => !numerosClasses.has(segment.segment_numero) && !SANS_LIEN.has(segment.segment_numero))
if (nonClasses.length) throw new Error(`Partition incomplète : ${nonClasses.map((segment) => segment.segment_numero)}`)
if ([...SANS_LIEN].some((segmentNumero) => numerosClasses.has(segmentNumero) || !parNumero.has(segmentNumero))) throw new Error('Déclaration SANS_LIEN invalide')
if (LIENS.some(([segmentNumero, canonId, type, motif]) => !parNumero.has(segmentNumero) || !canonId || ![1, 2, 3, 4].includes(type) || !motif.trim())) throw new Error('Manifeste biblique invalide')
if (NON_RESOLUS.some(([segmentNumero, type, motif]) => !parNumero.has(segmentNumero) || type !== 4 || !motif.startsWith('RÉFÉRENCE NON BIBLIQUE'))) throw new Error('Référence sans cible invalide')
const cles = LIENS.map(([segmentNumero, canonId, type]) => `${segmentNumero}|${canonId}|${type}`)
if (new Set(cles).size !== cles.length) throw new Error('Doublon interne')
const cibles = [...new Set(LIENS.map(([, canonId]) => canonId))]
const { data: temoins, error: temoinsError } = await sb.from('versets_lecture').select('id_verset,"TR0001","TR0003","TR0004"').in('id_verset', cibles)
if (temoinsError) throw temoinsError
const temoinsParId = new Map(temoins.map((temoin) => [temoin.id_verset, temoin]))
const ciblesInvalides = cibles.filter((canonId) => { const temoin = temoinsParId.get(canonId); return !temoin || (!temoin.TR0001 && !temoin.TR0003 && !temoin.TR0004) })
if (ciblesInvalides.length) throw new Error(`Cibles invalides : ${ciblesInvalides.join(', ')}`)
const ids = segments.map((segment) => segment.id)
const [{ count: liensExistants, error: liensError }, { count: relusGlobaux, error: relusError }] = await Promise.all([
  sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  sb.from('segments').select('id', { count: 'exact', head: true }).eq('id_oeuvre', OEUVRE).not('liens_revus_le', 'is', null),
])
if (liensError || relusError) throw liensError || relusError
if (liensExistants) throw new Error(`${liensExistants} liens existent déjà dans le lot`)

const candidatsPath = 'scripts/heptateuque/segmentation-candidate/segments-candidate.json'
const sourceMapPath = 'scripts/heptateuque/segmentation-candidate/source-map.json'
const candidats = JSON.parse(readFileSync(candidatsPath, 'utf8'))
const sourceMap = JSON.parse(readFileSync(sourceMapPath, 'utf8'))
for (const [segmentNumero, [avant, apres]] of CORRECTIONS_TEXTE) {
  const candidat = candidats.find((item) => item.segment_numero === segmentNumero)
  if (!candidat?.segment_texte.includes(avant)) throw new Error(`Candidat non synchronisable au segment ${segmentNumero}`)
  candidat.segment_texte = candidat.segment_texte.replace(avant, apres)
  const sources = sourceMap.filter((item) => item.first_segment_numero <= segmentNumero && item.last_segment_numero >= segmentNumero && item.source_clean?.includes(avant))
  if (sources.length !== 1) throw new Error(`Source-map non synchronisable au segment ${segmentNumero} : ${sources.length}`)
  sources[0].source_clean = sources[0].source_clean.replace(avant, apres)
}
const TOTAL = LIENS.length + NON_RESOLUS.length
const types = LIENS.reduce((compte, [, , type]) => { compte[type] = (compte[type] ?? 0) + 1; return compte }, {})
for (const [, type] of NON_RESOLUS) types[type] = (types[type] ?? 0) + 1
const liensParQuestion = Object.fromEntries(QUESTIONS.map((question) => {
  const numeros = new Set(segments.filter((segment) => segment.ref_niv2 === question).map((segment) => segment.segment_numero))
  return [question, [...LIENS, ...NON_RESOLUS].filter(([segmentNumero]) => numeros.has(segmentNumero)).length]
}))
const pct = (n) => `${n} / 3262 = ${(100 * n / 3262).toFixed(2).replace('.', ',')} %`
console.log(JSON.stringify({ mode: WRITE ? 'écriture' : 'contrôle', lot: 'Nombres I-X', ref_niv1: REF_NIV1, bornes: [PREMIER, DERNIER], segments: segments.length, corrections_ocr: CORRECTIONS_TEXTE.size, preuves_fac_simile: PREUVES.map(([path, , constat]) => ({ path, constat })), liens_bibliques: LIENS.length, sans_cible_a_constituer: NON_RESOLUS.length, total_liens: TOTAL, sans_lien: [...SANS_LIEN], cibles_distinctes: cibles.length, types, liens_par_question: liensParQuestion, empreinte, avancement_actuel: pct(relusGlobaux), avancement_potentiel_apres_ecriture: pct(relusGlobaux + NB_SEGMENTS) }, null, 2))
if (DETAIL) for (const [segmentNumero, canonId, type, motif] of LIENS) { const temoin = temoinsParId.get(canonId); console.log({ segmentNumero, canonId, type, motif, segment: parNumero.get(segmentNumero).segment_texte, temoin: temoin.TR0003 || temoin.TR0001 || temoin.TR0004 }) }
if (!WRITE) process.exit(0)

const horodatage = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
const sauvegardePath = `scripts/heptateuque/audit-reprise/sauvegarde-nombres-q1-q10-${horodatage}.json`
mkdirSync('scripts/heptateuque/audit-reprise', { recursive: true })
writeFileSync(sauvegardePath, `${JSON.stringify({ oeuvre: OEUVRE, bornes: [PREMIER, DERNIER], empreinte, segments, liens_existants: [] }, null, 2)}\n`, 'utf8')
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`
const valeurs = [
  ...LIENS.map(([segmentNumero, canonId, type, motif]) => `(${parNumero.get(segmentNumero).id}, ${quote(canonId)}, ${type}, 'vérifié', ${quote(motif)}, 'lecture', false)`),
  ...NON_RESOLUS.map(([segmentNumero, type, motif]) => `(${parNumero.get(segmentNumero).id}, null, ${type}, 'à constituer', ${quote(motif)}, 'lecture', true)`),
].join(',\n    ')
const idSql = ids.join(', ')
const correctionsSql = [...CORRECTIONS_TEXTE].map(([segmentNumero, [avant, apres]]) => {
  const id = parNumero.get(segmentNumero).id
  return `update segments set segment_texte = replace(segment_texte, ${quote(avant)}, ${quote(apres)}) where id = ${id} and segment_texte like ${quote(`%${avant}%`)};
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Correction OCR segment ${segmentNumero}: %/1', n; end if;`
}).join('\n  ')
const sql = `
do $p$
declare
  n integer;
begin
  if exists (select 1 from liens_bibliques where segment_id in (${idSql})) then raise exception 'Liens présents'; end if;
  if exists (select 1 from segments where id in (${idSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Déjà relu'; end if;
  ${correctionsSql}
  insert into liens_bibliques (segment_id, canon_id, type, fiabilite, motif, provenance, arbitrage_requis) values
    ${valeurs};
  get diagnostics n = row_count;
  if n <> ${TOTAL} then raise exception 'Liens insérés : %', n; end if;
  update segments set liens_revus_le = now(), liens_revus_par = ${quote(RELECTEUR)} where id in (${idSql});
  get diagnostics n = row_count;
  if n <> ${NB_SEGMENTS} then raise exception 'Segments relus : %', n; end if;
end
$p$;
`
const { error: writeError } = await sb.rpc('exec_sql', { sql })
if (writeError) throw writeError
const [{ count: liensApres, error: e1 }, { count: relusApres, error: e2 }, { data: audit, error: e3 }, { data: textesApres, error: e4 }] = await Promise.all([
  sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  sb.from('segments').select('id', { count: 'exact', head: true }).in('id', ids).not('liens_revus_le', 'is', null),
  sb.from('liens_bibliques').select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id', ids),
  sb.from('segments').select('segment_numero,segment_texte').in('id', ids),
])
if (e1 || e2 || e3 || e4) throw e1 || e2 || e3 || e4
const textesParNumero = new Map(textesApres.map((segment) => [segment.segment_numero, segment.segment_texte]))
const correctionInvalide = [...CORRECTIONS_TEXTE].some(([segmentNumero, [avant, apres]]) => textesParNumero.get(segmentNumero).includes(avant) || !textesParNumero.get(segmentNumero).includes(apres))
if (liensApres !== TOTAL || relusApres !== NB_SEGMENTS || correctionInvalide || audit.some((lien) => !lien.motif || lien.provenance !== 'lecture' || (lien.canon_id ? (lien.fiabilite !== 'vérifié' || lien.arbitrage_requis) : (lien.fiabilite !== 'à constituer' || !lien.arbitrage_requis || lien.type !== 4 || !lien.motif.startsWith('RÉFÉRENCE NON BIBLIQUE'))))) throw new Error('Postcontrôle invalide')
const clesApres = audit.map((lien) => `${lien.segment_id}|${lien.canon_id ?? 'sans-cible'}|${lien.type}|${lien.motif}`)
if (new Set(clesApres).size !== clesApres.length) throw new Error('Doublon dans le postétat')
writeFileSync(candidatsPath, `${JSON.stringify(candidats, null, 2)}\n`, 'utf8')
writeFileSync(sourceMapPath, `${JSON.stringify(sourceMap, null, 2)}\n`, 'utf8')
console.log(`✓ ${liensApres} liens ; ${relusApres} segments relus ; sauvegarde ${sauvegardePath}`)
