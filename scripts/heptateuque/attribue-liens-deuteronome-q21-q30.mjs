import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre cinquième'
const DEBUT = 2487
const FIN = 2520
const TOTAL_SEGMENTS = 34
const QUESTIONS = ['Question XXI', 'Question XXII', 'Question XXIII', 'Question XXIV', 'Question XXV', 'Question XXVI', 'Question XXVII', 'Question XXVIII', 'Question XXIX', 'Question XXX']
const WRITE = process.argv.includes('--write')
const DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Deutéronome Q. XXI-XXX'
const EMPREINTE_ATTENDUE = 'a88fa7ee99031aca5f0bcf85badcc5243a6d8f137cbd103a1e83139137f799d1'
const CHARTE = 'charte/CHARTE_IA.md'
const CHARTE_HASH = '47893c044ebab26e78149548c129fb9de3b72dde1e37c3371b60a1786240c198'
const PREUVES = [
  ['scripts/heptateuque/img/p545.jpg', '0b8c480a495aa2042dfee436ea48d1820e185b6783195b22c725bc2d55540108', 'La page imprimée 537 confirme les Questions XXI-XXIII et leurs en-têtes Deutéronome 15,9, 15,12 et 15,19.'],
  ['scripts/heptateuque/img/p546.jpg', '663546b9dd0f85588f1c1555b9a0833aff8d23109f3d52f0a34cf429abb615f1', 'La page imprimée 538 porte « de là πρωτότοκον » et la note « Ib. 15 » pour le premier-né de toute créature.'],
  ['scripts/heptateuque/img/p547.jpg', '2412e63d78449e02dfe520fd8759b08d72e010aa5ff1a29ad4d3808bf87da1c0', 'La page imprimée 539 confirme les Questions XXVI-XXX et les anciennes notes I, II et III Rois.'],
  ['scripts/heptateuque/img/p548.jpg', 'f8aaf6e828efc8e139c60b940197a97dfaf3dcaa0deb17769458d520f43999c3', 'La page imprimée 540 confirme la fin de la Question XXX et le raccord avec la Question XXXI.'],
]
const CORRECTIONS_TEXTE = [{
  numero: 2492,
  dbAvant: 'femme ; de la <i>πρωτότοκον</i>', dbApres: 'femme ; de là <i>πρωτότοκον</i>',
  candidatAvant: 'femme ; de la <i>πρωτότοκον</i>', candidatApres: 'femme ; de là <i>πρωτότοκον</i>',
  sourceAvant: 'femme ; de la <i>πρωτότοκον</i>', sourceApres: 'femme ; de là <i>πρωτότοκον</i>',
}]
const CORRECTIONS_NOTES = [{ numero: 2496, avant: '[[666]] Ib. XVI', apres: '[[666]] Ib. 15.' }]

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
const nonBiblique = (numero, genre, motif) => NON_RESOLUS.push([numero, 4, `RÉFÉRENCE NON BIBLIQUE (${genre}) : ${motif} ; cible de corpus à constituer.`])

// Question XXI — pensée cachée contre le prêt à l’approche de la remise.
both(2487, 'DEU.15.9', 'La pensée impie refuse le prêt au frère pauvre parce que la septième année de remise approche')
com(2488, ['DEU.15.1', 'DEU.15.8', 'DEU.15.9'], 'La pensée cachée refuse le prêt que Dieu prescrit alors même que la dette devra être remise')
com(2489, ['DEU.15.1', 'DEU.15.8', 'DEU.15.9'], 'Le refus de donner avant la remise rend contradictoire toute prétention à remettre généreusement la dette')

// Question XXII — septième année personnelle de l’esclave et année générale de remise.
both(2490, 'DEU.15.12', 'L’Hébreu vendu sert six ans et recouvre la liberté la septième année à compter de son achat')
com(2490, ['DEU.15.1'], 'La libération de l’esclave est distinguée de l’année générale de remise revenant tous les sept ans')

// Question XXIII — enfanté, engendré et premier-né.
both(2491, 'DEU.15.19', 'Tout mâle premier-né des bœufs et des brebis est consacré au Seigneur')
for (let numero = 2492; numero <= 2500; numero++) com(numero, ['DEU.15.19'], 'La distinction entre premier enfanté et premier engendré développe le sens du premier-né consacré dans le lemme')
com(2494, ['EXO.13.2'], 'La loi du premier-né qui ouvre le sein maternel fonde la distinction entre l’enfantement de la mère et l’engendrement du père')
both(2495, 'COL.1.18', 'Le Christ est appelé premier-né d’entre les morts, expression grecque de premier enfanté')
both(2496, 'COL.1.15', 'Le Christ est le premier-né de toute créature ; la note imprimée porte Colossiens 1,15 et non 1,16')
both(2496, '2CO.5.17', 'Celui qui est dans le Christ est une nouvelle créature')
com(2497, ['COL.1.18'], 'Le Christ ressuscité le premier constitue les prémices de la création nouvelle')
both(2497, 'ROM.6.9', 'Le Christ ressuscité ne meurt plus et la mort n’a plus d’empire sur lui')
both(2498, 'PRO.31.2', 'La variante des Septante « mon fils premier-né » est attribuée aux Proverbes 31,2, numérotés aussi au chapitre 24 dans la tradition grecque')
com(2499, ['PRO.31.2'], 'L’hypothèse que le Père s’adresse au Christ interprète le premier-né comme l’unique engendré consubstantiel')

// Question XXIV — brebis, chèvres et bœufs de la Pâque.
both(2501, 'DEU.16.2', 'La Pâque est immolée au Seigneur avec des brebis et des bœufs')
com(2501, ['EXO.12.5'], 'La prescription pascale antérieure de prendre un agneau ou un chevreau crée la difficulté sur la mention des bœufs')
com(2502, ['DEU.16.2', 'EXO.12.5'], 'La conjonction entre brebis et chèvres est interprétée pour exclure l’offrande d’un chevreau comme victime pascale')
com(2503, ['DEU.16.2', 'NUM.28.19'], 'Les bœufs de Deutéronome 16,2 sont rapprochés des jeunes taureaux offerts pendant les jours des azymes')

// Question XXV — calcul commun des sept semaines jusqu’à la Pentecôte.
for (const verset of [9, 10, 11]) both(2504, `DEU.16.${verset}`, 'Le commandement de compter sept semaines depuis la faucille, de célébrer la fête et de se réjouir devant le Seigneur est cité')
com(2505, ['DEU.16.9', 'DEU.16.10', 'DEU.16.11'], 'Un calcul individuel depuis chaque moisson est rejeté parce qu’il empêcherait la célébration commune de la fête des semaines')
com(2506, ['DEU.16.9', 'DEU.16.10', 'DEU.16.11'], 'Le calcul commun est fixé de la Pâque à la publication de la Loi au Sinaï')
add(2506, 'EXO.19.1', 2, 'L’arrivée d’Israël au Sinaï au troisième mois fournit le repère narratif de la cinquantaine après la Pâque.')
add(2506, 'EXO.20.1', 2, 'La proclamation divine de la Loi au Sinaï est le terme donné au calcul de la Pentecôte.')

// Question XXVI — permission conditionnelle d’établir un roi.
both(2507, 'DEU.17.14', 'Le peuple envisage d’établir un roi comme les nations voisines après son entrée dans la terre')
both(2507, 'DEU.17.15', 'Le roi doit être choisi par Dieu parmi les frères et ne peut être un étranger')
com(2508, ['DEU.17.14', 'DEU.17.15'], 'La loi est comprise comme une concession au désir du peuple plutôt que comme un commandement d’avoir un roi')
both(2508, '1SA.8.7', 'Le désir d’un roi déplaît à Dieu parce que le peuple rejette sa royauté')
com(2509, ['DEU.17.15'], 'Le roi choisi doit être un frère tiré du peuple, et « ne pourras » est expliqué comme « ne devras »')

// Question XXVII — pluralité des femmes royales et égarement de Salomon.
both(2510, 'DEU.17.17', 'Le roi ne doit multiplier ni les femmes qui égarent son cœur, ni l’or et l’argent')
both(2510, '2SA.5.13', 'David prit encore plusieurs femmes et concubines à Jérusalem')
com(2511, ['DEU.17.17'], 'La pluralité modérée de David est distinguée de la multitude interdite illustrée par Salomon')
for (const verset of [1, 2, 3, 4]) both(2511, `1KI.11.${verset}`, 'La multitude des femmes étrangères de Salomon et l’égarement de son cœur montrent sa transgression')
both(2512, 'DEU.17.17', 'La clause « de peur que son cœur ne s’égare » est interprétée comme visant spécialement les femmes étrangères')
both(2512, '1KI.11.4', 'Les femmes de Salomon détournent son cœur vers les dieux étrangers')
com(2513, ['DEU.17.17'], 'La portée générale de la défense subsiste même si les nombreuses femmes appartiennent à la nation du roi')

// Question XXVIII — service et part du Lévite venu de loin.
for (const verset of [6, 7, 8]) both(2514, `DEU.18.${verset}`, 'Le Lévite venu d’une ville d’Israël sert au lieu choisi et reçoit une part égale outre le produit de sa vente ; l’en-tête 18,7-8 omet le début local en 18,6')
com(2515, ['DEU.18.6', 'DEU.18.7', 'DEU.18.8'], 'La vente est interprétée comme celle des dîmes, prémices ou troupeaux du Lévite habitant loin du sanctuaire')
com(2516, ['DEU.18.8'], 'La part familiale du Lévite est expliquée selon la succession aux droits de ses parents')
com(2516, ['DEU.14.27', 'DEU.14.28', 'DEU.14.29'], 'La part des dîmes due au Lévite dans sa ville éclaire les biens qu’il peut vendre avant de venir servir')

// Question XXIX — faux prodiges, signes divins et anciennes numérotations.
both(2517, 'DEU.18.10', 'L’interdiction des augures est le commandement effectivement discuté malgré l’en-tête imprimé Deutéronome 18,11')
for (const verset of [37, 38, 39, 40]) both(2517, `JDG.6.${verset}`, 'Le double signe de la toison de Gédéon, tour à tour humide puis sèche, est cité comme miracle divin à interpréter')
both(2517, 'NUM.17.23', 'La verge d’Aaron fleurit et produit des amandes ; l’ancienne note Nombres 17,8 correspond au créneau local 17,23')
nonBiblique(2517, 'renvoi interne', 'Augustin rappelle avoir déjà expliqué la signification de la toison de Gédéon et de la verge d’Aaron, sans localiser ici cette explication')
com(2518, ['DEU.18.10', 'DEU.18.11', 'DEU.18.14', 'DEU.18.15'], 'Les divinations et faux prodiges interdits sont distingués des révélations prophétiques données par Dieu')

// Question XXX — coopération humaine au secours divin.
both(2519, 'DEU.20.4', 'Dieu marche avec son peuple, combat ses ennemis et le sauve ; ce secours appelle la coopération humaine')
both(2520, 'DEU.20.4', 'La formule « Dieu combattra avec vous » est reprise pour enseigner que les hommes doivent aussi faire leur devoir')

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
if (voisinAvant?.ref_niv1 !== REF_NIV1 || voisinAvant?.ref_niv2 !== 'Question XX') throw Error('Raccord amont invalide')
if (voisinApres?.ref_niv1 !== REF_NIV1 || voisinApres?.ref_niv2 !== 'Question XXXI') throw Error('Raccord aval invalide')
const segments = bruts.filter(segment => segment.segment_numero >= DEBUT && segment.segment_numero <= FIN)
if (segments.length !== TOTAL_SEGMENTS || segments.some((segment, index) => segment.segment_numero !== DEBUT + index) || segments.some(segment => segment.ref_niv1 !== REF_NIV1 || !QUESTIONS.includes(segment.ref_niv2)) || [...new Set(segments.map(segment => segment.ref_niv2))].join('|') !== QUESTIONS.join('|')) throw Error('Préétat structurel invalide')
if (segments.some(segment => segment.liens_revus_le || segment.liens_revus_par)) throw Error('Lot déjà relu')
const empreinte = createHash('sha256').update(JSON.stringify(segments.map(segment => [segment.id, segment.segment_numero, segment.ref_niv1, segment.ref_niv2, segment.ref_niv2_texte, segment.segment_texte, segment.texte_original, segment.notes, segment.nature]))).digest('hex')
if (empreinte !== EMPREINTE_ATTENDUE) throw Error(`Empreinte inattendue : ${empreinte}`)

const parNumero = new Map(segments.map(segment => [segment.segment_numero, segment]))
for (const correction of CORRECTIONS_TEXTE) {
  const texte = parNumero.get(correction.numero)?.segment_texte
  if (!texte?.includes(correction.dbAvant) || texte.includes(correction.dbApres)) throw Error(`Précondition texte invalide au segment ${correction.numero}`)
}
for (const correction of CORRECTIONS_NOTES) {
  const notes = parNumero.get(correction.numero)?.notes
  if (!notes?.includes(correction.avant) || notes.includes(correction.apres)) throw Error(`Précondition note invalide au segment ${correction.numero}`)
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
for (const correction of CORRECTIONS_TEXTE) {
  const candidat = candidats.find(item => item.segment_numero === correction.numero)
  if (!candidat?.segment_texte.includes(correction.candidatAvant) || candidat.segment_texte.includes(correction.candidatApres)) throw Error(`Candidat texte non synchronisable au segment ${correction.numero}`)
  candidat.segment_texte = candidat.segment_texte.replace(correction.candidatAvant, correction.candidatApres)
  const sources = sourceMap.filter(item => item.first_segment_numero <= correction.numero && item.last_segment_numero >= correction.numero && item.source_clean?.includes(correction.sourceAvant))
  if (sources.length !== 1) throw Error(`Source-map non synchronisable au segment ${correction.numero} : ${sources.length}`)
  sources[0].source_clean = sources[0].source_clean.replace(correction.sourceAvant, correction.sourceApres)
}
for (const correction of CORRECTIONS_NOTES) {
  const candidat = candidats.find(item => item.segment_numero === correction.numero)
  if (!candidat?.notes?.includes(correction.avant) || candidat.notes.includes(correction.apres)) throw Error(`Candidat note non synchronisable au segment ${correction.numero}`)
  candidat.notes = candidat.notes.replace(correction.avant, correction.apres)
}

const total = LIENS.length + NON_RESOLUS.length
const types = LIENS.reduce((acc, lien) => { acc[lien[2]] = (acc[lien[2]] || 0) + 1; return acc }, {})
for (const [, type] of NON_RESOLUS) types[type] = (types[type] || 0) + 1
const liensParQuestion = Object.fromEntries(QUESTIONS.map(question => {
  const numeros = new Set(segments.filter(segment => segment.ref_niv2 === question).map(segment => segment.segment_numero))
  return [question, [...LIENS, ...NON_RESOLUS].filter(([numero]) => numeros.has(numero)).length]
}))
const pct = n => `${n} / 3262 = ${(100 * n / 3262).toFixed(2).replace('.', ',')} %`
console.log(JSON.stringify({ mode: WRITE ? 'écriture' : 'contrôle', lot: 'Deutéronome XXI-XXX', bornes: [DEBUT, FIN], voisins: { avant: [voisinAvant.segment_numero, voisinAvant.ref_niv2], apres: [voisinApres.segment_numero, voisinApres.ref_niv2] }, ref_niv1: REF_NIV1, questions: QUESTIONS, segments: TOTAL_SEGMENTS, corrections_texte: CORRECTIONS_TEXTE.length, corrections_notes: CORRECTIONS_NOTES.length, preuves_fac_simile: PREUVES.map(([path, , constat]) => ({ path, constat })), liens: total, liens_bibliques: LIENS.length, sans_cible_a_constituer: NON_RESOLUS.length, sans_lien: [...SANS_LIEN], cibles_distinctes: cibles.length, types, liens_par_question: liensParQuestion, empreinte, anciennes_numerotations_arbitrees: ['Ib. XVI → COL.1.15 (note imprimée Ib. 15)', 'Prov. XXXI ou 24 LXX → PRO.31.2', 'Deut. XVIII,7-8 → DEU.18.6-8', 'Deut. XVIII,11 → DEU.18.10 pour les augures', 'Nomb. XVII,8 → NUM.17.23'], sic: 'aucun sic dans le lot ; aucune anomalie numérique, syntaxique ou de ponctuation n’en reçoit', avancement_actuel: pct(relusGlobaux), avancement_apres_ecriture_ulterieure: pct(relusGlobaux + TOTAL_SEGMENTS) }, null, 2))
if (DETAIL) {
  for (const [numero, canonId, type, motif] of LIENS) console.log({ numero, canonId, type, motif, segment: parNumero.get(numero).segment_texte, ...parCible.get(canonId) })
  for (const [numero, type, motif] of NON_RESOLUS) console.log({ numero, canonId: null, type, motif, segment: parNumero.get(numero).segment_texte })
}
if (!WRITE) process.exit(0)

const horodatage = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
const sauvegardePath = `scripts/heptateuque/audit-reprise/sauvegarde-deuteronome-q21-q30-${horodatage}.json`
mkdirSync('scripts/heptateuque/audit-reprise', { recursive: true })
writeFileSync(sauvegardePath, `${JSON.stringify({ oeuvre: OEUVRE, bornes: [DEBUT, FIN], empreinte, segments, liens_existants: [] }, null, 2)}\n`, 'utf8')
const quote = value => `'${String(value).replaceAll("'", "''")}'`
const valeurs = [...LIENS.map(([numero, canonId, type, motif]) => `(${parNumero.get(numero).id}, ${quote(canonId)}, ${type}, 'vérifié', ${quote(motif)}, 'lecture', false)`), ...NON_RESOLUS.map(([numero, type, motif]) => `(${parNumero.get(numero).id}, null, ${type}, 'à constituer', ${quote(motif)}, 'lecture', true)`)].join(',\n    ')
const idsSql = ids.join(', ')
const correctionsTexteSql = CORRECTIONS_TEXTE.map(correction => {
  const id = parNumero.get(correction.numero).id
  return `update segments set segment_texte = replace(segment_texte, ${quote(correction.dbAvant)}, ${quote(correction.dbApres)}) where id = ${id} and segment_texte like ${quote(`%${correction.dbAvant}%`)};
  get diagnostics n = row_count; if n <> 1 then raise exception 'Correction texte segment ${correction.numero}: %/1', n; end if;`
}).join('\n  ')
const correctionsNotesSql = CORRECTIONS_NOTES.map(correction => {
  const id = parNumero.get(correction.numero).id
  return `update segments set notes = replace(notes, ${quote(correction.avant)}, ${quote(correction.apres)}) where id = ${id} and notes like ${quote(`%${correction.avant}%`)};
  get diagnostics n = row_count; if n <> 1 then raise exception 'Correction note segment ${correction.numero}: %/1', n; end if;`
}).join('\n  ')
const sql = `do $passe$ declare n integer; begin
  if exists (select 1 from liens_bibliques where segment_id in (${idsSql})) then raise exception 'Liens déjà présents'; end if;
  if exists (select 1 from segments where id in (${idsSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Marques déjà présentes'; end if;
  if (select count(*) from segments where id in (${idsSql}) and id_oeuvre = '${OEUVRE}' and ref_niv1 = ${quote(REF_NIV1)} and ref_niv2 in (${QUESTIONS.map(quote).join(', ')}) and segment_numero between ${DEBUT} and ${FIN}) <> ${TOTAL_SEGMENTS} then raise exception 'Préconditions structurelles invalides'; end if;
  ${correctionsTexteSql}
  ${correctionsNotesSql}
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
  sb.from('segments').select('segment_numero,segment_texte,notes').in('id', ids),
])
if (e4 || e5 || e6 || e7) throw (e4 || e5 || e6 || e7)
const post = new Map(textesApres.map(segment => [segment.segment_numero, segment]))
const texteInvalide = CORRECTIONS_TEXTE.some(correction => post.get(correction.numero).segment_texte.includes(correction.dbAvant) || !post.get(correction.numero).segment_texte.includes(correction.dbApres))
const noteInvalide = CORRECTIONS_NOTES.some(correction => post.get(correction.numero).notes.includes(correction.avant) || !post.get(correction.numero).notes.includes(correction.apres))
if (liensApres !== total || relusApres !== TOTAL_SEGMENTS || texteInvalide || noteInvalide || audit.some(lien => !lien.motif || lien.provenance !== 'lecture' || (lien.canon_id ? lien.fiabilite !== 'vérifié' || lien.arbitrage_requis : lien.fiabilite !== 'à constituer' || !lien.arbitrage_requis || lien.type !== 4 || !lien.motif.startsWith('RÉFÉRENCE NON BIBLIQUE')))) throw Error('Postcontrôle invalide')
const clesApres = audit.map(lien => `${lien.segment_id}|${lien.canon_id ?? 'sans-cible'}|${lien.type}|${lien.motif}`)
if (new Set(clesApres).size !== clesApres.length) throw Error('Doublon dans le postétat')
writeFileSync(candidatsPath, `${JSON.stringify(candidats, null, 2)}\n`, 'utf8')
writeFileSync(sourceMapPath, `${JSON.stringify(sourceMap, null, 2)}\n`, 'utf8')
console.log(`✓ ${liensApres} liens, ${relusApres} segments, sauvegarde ${sauvegardePath}`)
