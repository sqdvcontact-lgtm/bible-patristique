import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre quatrième'
const DEBUT = 2352
const FIN = 2370
const TOTAL_SEGMENTS = 19
const QUESTIONS = ['Question LXI', 'Question LXII', 'Question LXIII', 'Question LXIV', 'Question LXV']
const WRITE = process.argv.includes('--write')
const DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Nombres Q. LXI-LXV'
const EMPREINTE_ATTENDUE = 'b7f1db9c6b1760f3f694778d903aee3e21f0d690b524e067e9572bb7cb927066'
const CHARTE = 'charte/CHARTE_IA.md'
const CHARTE_HASH = '47893c044ebab26e78149548c129fb9de3b72dde1e37c3371b60a1786240c198'
const PREUVES = [
  ['scripts/heptateuque/img/p536.jpg', 'e0969cabd022c4234a9dbad011ac595928704551c2f55a5b7cd0474230f24451', 'La page imprimée 528 confirme les Questions LXI-LXIII, la ponctuation du titre de LXI, la virgule de « chez lui, » et l’espace avant le deux-points après « leur force ».'],
  ['scripts/heptateuque/img/p537.jpg', '66f4db9b850a22ef15c92f2d346802971e6fce48d16d23d1aa93e2564e7d0e25', 'La page imprimée 529 confirme la fin de LXIII, les Questions LXIV-LXV et les en-têtes fautifs « XXXV, 14, 12 » et « XXXV, 19, 12 ».'],
]
const CORRECTIONS = [
  {
    numero: 2352,
    dbAvant: '</i>? - L’Écriture', dbApres: '</i> ? – L’Écriture',
    candidatAvant: '</i>? – L’Écriture', candidatApres: '</i> ? – L’Écriture',
    sourceAvant: '</i>? – L’Écriture', sourceApres: '</i> ? – L’Écriture',
  },
  {
    numero: 2356,
    dbAvant: 'mais « chez lui » c’est-à-dire', dbApres: 'mais « chez lui, » c’est-à-dire',
    candidatAvant: 'mais « chez lui » c’est-à-dire', candidatApres: 'mais « chez lui, » c’est-à-dire',
    sourceAvant: 'mais « chez lui » c’est-à-dire', sourceApres: 'mais « chez lui, » c’est-à-dire',
  },
  {
    numero: 2358,
    dbAvant: '<i>leur force</i>: »', dbApres: '<i>leur force</i> : »',
    candidatAvant: '<i>leur force</i>: »', candidatApres: '<i>leur force</i> : »',
    sourceAvant: '<i>leur force</i>: »', sourceApres: '<i>leur force</i> : »',
  },
]

const LIENS = []
const NON_RESOLUS = []
const SANS_LIEN = new Set()
const add = (numero, canonId, type, motif) => LIENS.push([numero, canonId, type, motif])
const cite = (numero, canonId, motif) => add(numero, canonId, 1, motif)
const com = (numero, canonIds, motif) => { for (const canonId of canonIds) add(numero, canonId, 3, `${motif} (${canonId}).`) }
const both = (numero, canonId, motif) => {
  add(numero, canonId, 1, `${motif} — citation ou référence intentionnelle.`)
  add(numero, canonId, 3, `${motif} — passage commenté ou mobilisé dans le raisonnement.`)
}

// Question LXI — mort de Balaam et sens de son retour « en son lieu ».
both(2352, 'NUM.31.8', 'Balaam est tué par l’épée avec les cinq rois de Madian')
both(2353, 'NUM.24.25', 'Balaam se lève et retourne en son lieu, tandis que Balac retourne chez lui')
com(2353, ['NUM.31.8'], 'La mort ultérieure de Balaam parmi les Madianites crée la difficulté que la question cherche à concilier')
com(2354, ['NUM.24.25', 'NUM.31.8'], 'L’hypothèse d’un retour de Balaam en Mésopotamie est confrontée à sa présence lors de la bataille contre Madian')
com(2355, ['NUM.24.25'], 'Le retour « en son lieu » est interprété comme le retour au logement provisoire de Balaam après les sacrifices')
com(2356, ['NUM.24.25'], 'La différence entre « en son lieu » pour Balaam et « chez lui » pour Balac est expliquée par leur statut d’étranger et de souverain')
com(2357, ['NUM.24.25'], 'La conclusion grammaticale réserve « chez lui » à celui qui revient dans sa propre maison')

// Question LXII — virtus comme provisions qui soutiennent les forces.
both(2358, 'NUM.31.9', 'Les Israélites prennent les femmes, les troupeaux, les meubles et les biens de Madian, interprétés ici comme leur force')
com(2359, ['NUM.31.5', 'NUM.31.6'], 'Le passage précédent sur les mille hommes envoyés par tribu est relu selon la variante « avec leur force », comprise comme leurs provisions')
cite(2360, 'ISA.3.1', 'Citation explicite de la menace d’ôter la force du pain et la force de l’eau')
com(2360, ['NUM.31.5', 'NUM.31.6', 'NUM.31.9'], 'Les soldats envoyés par milliers avec leurs provisions reçoivent ensuite les provisions pillées aux Madianites')

// Question LXIII — conseil de Balaam et séduction de Phogor.
both(2361, 'NUM.31.15', 'Moïse reproche d’avoir laissé la vie à toutes les femmes de Madian')
both(2361, 'NUM.31.16', 'Les femmes ont séduit Israël selon le conseil de Balaam dans l’affaire de Phogor')
com(2362, ['NUM.31.16'], 'Le conseil perfide de Balaam est tenu pour certain bien que son moment ne soit pas raconté auparavant')
com(2362, ['NUM.25.1', 'NUM.25.2', 'NUM.25.3'], 'La fornication avec les filles de Moab, leurs sacrifices idolâtriques et l’attachement à Phogor explicitent la séduction évoquée')
com(2363, ['NUM.24.25', 'NUM.31.8'], 'L’incertitude sur le lieu où Balaam retourna laisse possible sa présence ultérieure auprès des Madianites')

// Question LXIV — jugement préalable à l’admission dans une ville de refuge.
both(2364, 'NUM.35.12', 'La ville protège le meurtrier contre le vengeur du sang jusqu’à sa comparution devant l’assemblée ; le premier numéro imprimé 35,14 est étranger à la citation')
com(2365, ['NUM.35.11', 'NUM.35.25', 'NUM.35.28'], 'Le meurtrier involontaire demeure dans la ville de refuge jusqu’à la mort du grand-prêtre, après laquelle il peut retourner librement chez lui')
both(2366, 'NUM.35.12', 'La comparution devant l’assemblée est reprise pour expliquer qu’un jugement doit établir le caractère involontaire du meurtre')
com(2366, ['NUM.35.24', 'NUM.35.25'], 'L’assemblée juge la cause puis ramène dans la ville de refuge celui qu’elle reconnaît innocent de meurtre volontaire')

// Question LXV — meurtrier volontaire jugé, puis livré au vengeur du sang.
both(2367, 'NUM.35.19', 'Le vengeur du sang met à mort le meurtrier lorsqu’il le rencontre')
both(2367, 'NUM.35.12', 'La référence jointe au jugement devant l’assemblée empêche de comprendre 35,19 comme une exécution sans procès')
com(2368, ['NUM.35.11', 'NUM.35.12', 'NUM.35.26', 'NUM.35.27'], 'Avant le jugement le meurtrier gagne une ville de refuge ; même involontaire, il peut être tué sans faute par le vengeur s’il est trouvé hors de ses limites')
com(2369, ['NUM.35.19', 'NUM.35.24', 'NUM.35.25'], 'Après examen judiciaire, le coupable volontaire ne bénéficie plus du refuge et peut être mis à mort par le vengeur du sang')
com(2370, ['NUM.35.19', 'NUM.35.24', 'NUM.35.25'], 'Le jugement déjà rendu sur l’homicide volontaire rend inutile une nouvelle procédure avant l’exécution')

if (createHash('sha256').update(readFileSync(CHARTE)).digest('hex') !== CHARTE_HASH) throw Error('Charte modifiée depuis la préparation du lot')
for (const [path, hash] of PREUVES) {
  const obtenu = createHash('sha256').update(readFileSync(path)).digest('hex')
  if (obtenu !== hash) throw Error(`Preuve fac-similé modifiée : ${path} (${obtenu})`)
}

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).map(line => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(match => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: bruts, error: e0 } = await sb.from('segments').select('id,id_oeuvre,segment_numero,ref_niv1,ref_niv2,ref_niv2_texte,segment_texte,texte_original,notes,nature,liens_revus_le,liens_revus_par').eq('id_oeuvre', OEUVRE).gte('segment_numero', DEBUT - 1).lte('segment_numero', FIN + 1).order('segment_numero')
if (e0) throw e0
const voisinAvant = bruts.find(segment => segment.segment_numero === DEBUT - 1)
const voisinApres = bruts.find(segment => segment.segment_numero === FIN + 1)
if (voisinAvant?.ref_niv1 !== REF_NIV1 || voisinAvant?.ref_niv2 !== 'Question LX') throw Error('Raccord amont invalide')
if (voisinApres?.ref_niv1 !== 'Livre cinquième' || voisinApres?.ref_niv2 !== 'Question I') throw Error('Raccord aval invalide')
const segments = bruts.filter(segment => segment.segment_numero >= DEBUT && segment.segment_numero <= FIN)
if (segments.length !== TOTAL_SEGMENTS || segments.some((segment, index) => segment.segment_numero !== DEBUT + index) || segments.some(segment => segment.ref_niv1 !== REF_NIV1 || !QUESTIONS.includes(segment.ref_niv2)) || [...new Set(segments.map(segment => segment.ref_niv2))].join('|') !== QUESTIONS.join('|')) throw Error('Préétat structurel invalide')
if (segments.some(segment => segment.liens_revus_le || segment.liens_revus_par)) throw Error('Lot déjà relu')
const empreinte = createHash('sha256').update(JSON.stringify(segments.map(segment => [segment.id, segment.segment_numero, segment.ref_niv1, segment.ref_niv2, segment.ref_niv2_texte, segment.segment_texte, segment.texte_original, segment.notes, segment.nature]))).digest('hex')
if (empreinte !== EMPREINTE_ATTENDUE) throw Error(`Empreinte inattendue : ${empreinte}`)

const parNumero = new Map(segments.map(segment => [segment.segment_numero, segment]))
for (const correction of CORRECTIONS) {
  const texte = parNumero.get(correction.numero)?.segment_texte
  if (!texte?.includes(correction.dbAvant) || texte.includes(correction.dbApres)) throw Error(`Précondition de correction invalide au segment ${correction.numero}`)
}
const numerosClasses = new Set([...LIENS, ...NON_RESOLUS].map(lien => lien[0]))
const nonClasses = segments.filter(segment => !numerosClasses.has(segment.segment_numero) && !SANS_LIEN.has(segment.segment_numero))
if (nonClasses.length) throw Error(`Segments non classés : ${nonClasses.map(segment => segment.segment_numero).join(', ')}`)
if ([...SANS_LIEN].some(numero => numerosClasses.has(numero) || !parNumero.has(numero))) throw Error('Déclaration SANS_LIEN invalide')
if (LIENS.some(([numero, canonId, type, motif]) => !parNumero.has(numero) || !canonId || ![1, 2, 3, 4].includes(type) || !motif.trim())) throw Error('Lien biblique invalide')
if (NON_RESOLUS.some(([numero, type, motif]) => !parNumero.has(numero) || type !== 4 || !motif.startsWith('RÉFÉRENCE NON BIBLIQUE'))) throw Error('Référence non biblique invalide')
const cles = LIENS.map(([numero, canonId, type]) => `${numero}|${canonId}|${type}`)
if (new Set(cles).size !== cles.length) throw Error('Doublon interne dans le manifeste')

const cibles = [...new Set(LIENS.map(([, canonId]) => canonId))]
const { data: versets, error: e1 } = await sb.from('versets_lecture').select('id_verset,TR0001,TR0003,TR0004').in('id_verset', cibles)
if (e1) throw e1
const parCible = new Map(versets.map(verset => [verset.id_verset, verset]))
const absentes = cibles.filter(cible => !parCible.has(cible))
if (absentes.length) throw Error(`Cibles absentes : ${absentes.join(', ')}`)
if (cibles.some(cible => { const verset = parCible.get(cible); return !verset.TR0001 || !verset.TR0003 || !verset.TR0004 })) throw Error('Cible incomplète dans les trois témoins locaux')
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
for (const correction of CORRECTIONS) {
  const candidat = candidats.find(item => item.segment_numero === correction.numero)
  if (!candidat?.segment_texte.includes(correction.candidatAvant) || candidat.segment_texte.includes(correction.candidatApres)) throw Error(`Candidat non synchronisable au segment ${correction.numero}`)
  candidat.segment_texte = candidat.segment_texte.replace(correction.candidatAvant, correction.candidatApres)
  const sources = sourceMap.filter(item => item.first_segment_numero <= correction.numero && item.last_segment_numero >= correction.numero && item.source_clean?.includes(correction.sourceAvant))
  if (sources.length !== 1) throw Error(`Source-map non synchronisable au segment ${correction.numero} : ${sources.length}`)
  sources[0].source_clean = sources[0].source_clean.replace(correction.sourceAvant, correction.sourceApres)
}

const total = LIENS.length + NON_RESOLUS.length
const types = LIENS.reduce((acc, lien) => { acc[lien[2]] = (acc[lien[2]] || 0) + 1; return acc }, {})
for (const [, type] of NON_RESOLUS) types[type] = (types[type] || 0) + 1
const liensParQuestion = Object.fromEntries(QUESTIONS.map(question => {
  const numeros = new Set(segments.filter(segment => segment.ref_niv2 === question).map(segment => segment.segment_numero))
  return [question, [...LIENS, ...NON_RESOLUS].filter(([numero]) => numeros.has(numero)).length]
}))
const pct = n => `${n} / 3262 = ${(100 * n / 3262).toFixed(2).replace('.', ',')} %`
console.log(JSON.stringify({ mode: WRITE ? 'écriture' : 'contrôle', lot: 'Nombres LXI-LXV', bornes: [DEBUT, FIN], voisins: { avant: [voisinAvant.segment_numero, voisinAvant.ref_niv1, voisinAvant.ref_niv2], apres: [voisinApres.segment_numero, voisinApres.ref_niv1, voisinApres.ref_niv2] }, ref_niv1: REF_NIV1, questions: QUESTIONS, segments: TOTAL_SEGMENTS, corrections_typographiques: CORRECTIONS.length, preuves_fac_simile: PREUVES.map(([path, , constat]) => ({ path, constat })), liens: total, liens_bibliques: LIENS.length, sans_cible_a_constituer: NON_RESOLUS.length, sans_lien: [...SANS_LIEN], cibles_distinctes: cibles.length, types, liens_par_question: liensParQuestion, empreinte, anciennes_numerotations_arbitrees: ['Nombres 35,14,12 → NUM.35.12 (35,14 écarté par le contenu)', 'Nombres 35,19,12 → NUM.35.19 + NUM.35.12'], sic: 'aucun sic dans le lot ; aucune anomalie numérique ou typographique n’en reçoit', avancement_actuel: pct(relusGlobaux), avancement_apres_ecriture_ulterieure: pct(relusGlobaux + TOTAL_SEGMENTS) }, null, 2))
if (DETAIL) {
  for (const [numero, canonId, type, motif] of LIENS) console.log({ numero, canonId, type, motif, segment: parNumero.get(numero).segment_texte, ...parCible.get(canonId) })
  for (const [numero, type, motif] of NON_RESOLUS) console.log({ numero, canonId: null, type, motif, segment: parNumero.get(numero).segment_texte })
}
if (!WRITE) process.exit(0)

const horodatage = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
const sauvegardePath = `scripts/heptateuque/audit-reprise/sauvegarde-nombres-q61-q65-${horodatage}.json`
mkdirSync('scripts/heptateuque/audit-reprise', { recursive: true })
writeFileSync(sauvegardePath, `${JSON.stringify({ oeuvre: OEUVRE, bornes: [DEBUT, FIN], empreinte, segments, liens_existants: [] }, null, 2)}\n`, 'utf8')
const quote = value => `'${String(value).replaceAll("'", "''")}'`
const valeurs = [...LIENS.map(([numero, canonId, type, motif]) => `(${parNumero.get(numero).id}, ${quote(canonId)}, ${type}, 'vérifié', ${quote(motif)}, 'lecture', false)`), ...NON_RESOLUS.map(([numero, type, motif]) => `(${parNumero.get(numero).id}, null, ${type}, 'à constituer', ${quote(motif)}, 'lecture', true)`)].join(',\n    ')
const idsSql = ids.join(', ')
const correctionsSql = CORRECTIONS.map(correction => {
  const id = parNumero.get(correction.numero).id
  return `update segments set segment_texte = replace(segment_texte, ${quote(correction.dbAvant)}, ${quote(correction.dbApres)}) where id = ${id} and segment_texte like ${quote(`%${correction.dbAvant}%`)};
  get diagnostics n = row_count; if n <> 1 then raise exception 'Correction segment ${correction.numero}: %/1', n; end if;`
}).join('\n  ')
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
const correctionInvalide = CORRECTIONS.some(correction => textesParNumero.get(correction.numero).includes(correction.dbAvant) || !textesParNumero.get(correction.numero).includes(correction.dbApres))
if (liensApres !== total || relusApres !== TOTAL_SEGMENTS || correctionInvalide || audit.some(lien => !lien.motif || lien.provenance !== 'lecture' || (lien.canon_id ? lien.fiabilite !== 'vérifié' || lien.arbitrage_requis : lien.fiabilite !== 'à constituer' || !lien.arbitrage_requis || lien.type !== 4 || !lien.motif.startsWith('RÉFÉRENCE NON BIBLIQUE')))) throw Error('Postcontrôle invalide')
const clesApres = audit.map(lien => `${lien.segment_id}|${lien.canon_id ?? 'sans-cible'}|${lien.type}|${lien.motif}`)
if (new Set(clesApres).size !== clesApres.length) throw Error('Doublon dans le postétat')
writeFileSync(candidatsPath, `${JSON.stringify(candidats, null, 2)}\n`, 'utf8')
writeFileSync(sourceMapPath, `${JSON.stringify(sourceMap, null, 2)}\n`, 'utf8')
console.log(`✓ ${liensApres} liens, ${relusApres} segments, sauvegarde ${sauvegardePath}`)
