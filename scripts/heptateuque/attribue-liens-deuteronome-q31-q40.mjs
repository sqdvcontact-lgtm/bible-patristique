import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre cinquième'
const PREMIER = 2521
const DERNIER = 2560
const NB_SEGMENTS = 40
const WRITE = process.argv.includes('--write')
const DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Deutéronome Q. XXXI-XL'
const EMPREINTE_ATTENDUE = '717eb4dc9019f7cb259fe3e4a196456d28a198ac4f762f9bdb53a787d5b5b913'
const CHARTE_HASH = '47893c044ebab26e78149548c129fb9de3b72dde1e37c3371b60a1786240c198'
const QUESTIONS = ['Question XXXI', 'Question XXXII', 'Question XXXIII', 'Question XXXIV', 'Question XXXV', 'Question XXXVI', 'Question XXXVII', 'Question XXXVIII', 'Question XXXIX', 'Question XL']
const PREUVES = [
  ['scripts/heptateuque/img/p548.jpg', 'f8aaf6e828efc8e139c60b940197a97dfaf3dcaa0deb17769458d520f43999c3', 'Page imprimée 540 : Questions XXXI à XXXIV, avec le début des citations de Deutéronome 20 et 22.'],
  ['scripts/heptateuque/img/p549.jpg', '59ec7b46a5c124e56c35d001a859f60ce5b6add91472d920987fad5b22647beb', 'Page imprimée 541 : Questions XXXIV à XXXVII et anciennes références I Rois/Deutéronome.'],
  ['scripts/heptateuque/img/p550.jpg', 'b743bfc688b5a1231cef521196cc4960a5e049a74d53cfc870556ed72b681b6e', 'Page imprimée 542 : Questions XXXVII à XL et raccord avec la Question XLI.'],
]
const CORRECTIONS_TEXTE = new Map([
  [2526, ['l’homme » c’est-à-dire', 'l’homme, » c’est-à-dire']],
  [2559, ['« Dépouillez-vous du vieil homme dont ces autres mots forment le commentaire : Que celui qui dérobait, ne dérobe plus', '« Dépouillez-vous du vieil homme, » dont ces autres mots forment le commentaire : « Que celui qui dérobait, ne dérobe plus']],
])
const CORRECTIONS_CANDIDAT = new Map([
  [2526, ['l’homme » c’est-à-dire', 'l’homme, » c’est-à-dire']],
  [2559, ['« Dépouillez-vous du vieil homme dont ces autres mots forment le commentaire :  Que celui qui dérobait, ne dérobe plus', '« Dépouillez-vous du vieil homme, » dont ces autres mots forment le commentaire : « Que celui qui dérobait, ne dérobe plus']],
])

const LIENS = []
const add = (n, canon, type, motif) => LIENS.push([n, canon, type, motif])
const cite = (n, canon, motif) => add(n, canon, 1, motif)
const com = (ns, canon, motif) => { for (const n of ns) add(n, canon, 3, motif) }
const allusion = (n, canon, motif) => add(n, canon, 2, motif)
const SANS_CIBLE = []
const nonBiblique = (n, genre, motif) => SANS_CIBLE.push([n, 4, `RÉFÉRENCE NON BIBLIQUE (${genre}) : ${motif}`])

// XXXI — exemptions avant le combat.
cite(2521, 'DEU.20.5', 'Citation explicite de l’homme ayant bâti une maison neuve sans en avoir pris possession, autorisé à retourner chez lui avant le combat.')
cite(2522, 'DEU.20.6', 'Citation explicite de l’homme ayant planté une vigne sans en avoir encore goûté les fruits, autorisé à retourner chez lui.')
cite(2522, 'DEU.20.7', 'Début de la citation explicite concernant l’homme fiancé qui n’a pas encore épousé sa fiancée.')
cite(2523, 'DEU.20.7', 'Fin de la citation explicite concernant l’homme fiancé autorisé à retourner chez lui avant le combat.')
for (const canon of ['DEU.20.5', 'DEU.20.6', 'DEU.20.7']) com([2523, 2524, 2525], canon, 'Les trois exemptions sont expliquées comme une épreuve du courage et du détachement des soldats avant le combat.')

// XXXII — vêtement masculin et armes.
cite(2526, 'DEU.22.5', 'Citation explicite de l’interdiction faite à la femme de porter les vêtements de l’homme.')
com([2526], 'DEU.22.5', 'L’interdiction est interprétée comme visant les vêtements de guerre et les armes.')
nonBiblique(2526, 'interprètes non identifiés', 'plusieurs interprètes traduisent la prescription comme une interdiction pour la femme de porter des vêtements de guerre ou des armes ; cible de corpus à constituer.')

// XXXIII — accusation de non-virginité et faux témoignage.
for (const canon of ['DEU.22.13', 'DEU.22.14', 'DEU.22.15', 'DEU.22.16', 'DEU.22.17']) cite(2527, canon, 'Citation continue de la procédure ouverte par l’accusation du mari et de la production des preuves de virginité devant les anciens.')
for (const canon of ['DEU.22.17', 'DEU.22.18', 'DEU.22.19']) cite(2528, canon, 'Suite de la citation : déploiement du vêtement, châtiment et amende du mari, maintien définitif du mariage.')
for (const canon of ['DEU.22.20', 'DEU.22.21']) cite(2529, canon, 'Fin de la citation : condamnation de la jeune femme si l’accusation est reconnue véritable.')
for (const canon of ['DEU.22.18', 'DEU.22.19', 'DEU.22.20', 'DEU.22.21']) com([2530], canon, 'La différence entre la peine du mari calomniateur et celle de la femme reconnue coupable est explicitement analysée.')
com([2531], 'DEU.19.19', 'La règle générale infligeant au faux témoin la peine qu’il voulait faire subir à l’accusé est rappelée.')
com([2531], 'DEU.19.21', 'La peine de mort envisagée pour le faux témoin suppose le principe vie pour vie de la loi du talion.')

// XXXIV — l’homme ayant déshonoré une vierge.
cite(2532, 'DEU.22.28', 'Citation explicite de la saisie d’une vierge non fiancée et de la découverte des deux personnes.')
cite(2532, 'DEU.22.29', 'Citation explicite de l’amende, du mariage imposé et de l’interdiction définitive de répudier la jeune femme.')
com([2533, 2534], 'DEU.22.29', 'L’interdiction de répudier est examinée comme peine et comme garantie contre un mariage simulé.')
cite(2534, 'DEU.24.1', 'La note éditoriale renvoie explicitement à la permission mosaïque de remettre une lettre de divorce et de renvoyer sa femme.')
cite(2535, 'DEU.22.19', 'La note éditoriale renvoie explicitement à la même interdiction de répudier dans le cas de l’accusation mensongère de non-virginité.')
com([2535], 'DEU.22.19', 'Le droit reconnu à la femme accusée à tort est rapproché de celui de la vierge déshonorée.')

// XXXV — Ammonites, Moabites et admission de Ruth.
cite(2536, 'DEU.23.4', 'Citation explicite de l’exclusion de l’Ammonite et du Moabite jusqu’à la dixième génération et à jamais ; cible sémantique malgré l’ancienne numérotation imprimée.')
cite(2536, 'RUT.1.22', 'La note éditoriale identifie explicitement Ruth la Moabite revenant à Bethléem avec Noémi.')
cite(2536, 'MAT.1.5', 'La note éditoriale identifie explicitement Ruth dans la généalogie charnelle du Christ.')
com([2536, 2537, 2539, 2540, 2541, 2542], 'DEU.23.4', 'L’exclusion jusqu’à la dixième génération et à jamais est confrontée à l’admission de Ruth et interprétée selon les générations ou selon le sexe.')
cite(2537, 'GEN.19.37', 'La note éditoriale renvoie explicitement à la naissance de Moab, fils de Lot et père des Moabites.')
cite(2537, 'GEN.19.38', 'La note éditoriale renvoie explicitement à la naissance de Ben-Ammi, fils de Lot et père des Ammonites.')
for (const canon of ['MAT.1.2', 'MAT.1.3', 'MAT.1.4', 'MAT.1.5']) allusion(2538, canon, 'La liste d’Abraham à Salmon puis Booz et Ruth reprend la généalogie évangélique du Christ.')
allusion(2538, 'RUT.4.13', 'Le mariage de Booz avec Ruth et la naissance de leur fils reprennent explicitement l’épisode final du livre de Ruth.')
cite(2541, 'NUM.31.17', 'La note éditoriale renvoie explicitement à l’ordre de tuer les enfants mâles et les femmes ayant connu un homme.')
cite(2541, 'NUM.31.18', 'La note éditoriale renvoie explicitement à l’ordre d’épargner les jeunes filles n’ayant pas connu d’homme.')
com([2544], 'NUM.31.17', 'La différence de traitement entre les hommes, les femmes coupables et les vierges est mobilisée pour expliquer l’admission des femmes étrangères.')
com([2544], 'NUM.31.18', 'La conservation de la vie des vierges est interprétée comme absence d’imputation des griefs adressés au peuple ennemi.')
cite(2543, 'DEU.23.5', 'Citation explicite du refus du pain et de l’eau et de l’appel à Balaam pour maudire Israël ; cible sémantique malgré l’ancienne étendue imprimée.')
com([2542, 2544], 'DEU.23.5', 'Les griefs motivant l’exclusion des Moabites et des Ammonites sont distingués de la conduite des femmes épargnées.')

// XXXVI — esclave réfugié et exemple de David chez Achis.
cite(2545, 'DEU.23.16', 'Citation explicite de l’interdiction de livrer à son maître l’esclave réfugié ; cible sémantique malgré l’ancienne numérotation imprimée 23,15.')
com([2545, 2546, 2547], 'DEU.23.16', 'L’esclave fugitif est interprété comme l’étranger réfugié auprès d’Israël et soustrait à son ancien roi.')
cite(2547, '1SA.21.11', 'La note ancienne I Rois 20,10 vise sémantiquement David fuyant Saül et se rendant auprès d’Achis, roi de Geth.')
cite(2547, 'DEU.23.17', 'Citation explicite du droit du transfuge à demeurer où il lui plaît ; cible sémantique malgré l’ancienne numérotation imprimée 23,16.')
com([2547], 'DEU.23.17', 'La liberté de résidence du réfugié confirme qu’il ne doit pas être livré à son ancien maître.')

// XXXVII — défense de la prostitution.
cite(2548, 'DEU.23.18', 'Citation explicite de l’interdiction de la prostitution féminine et masculine en Israël ; cible sémantique malgré l’ancienne numérotation imprimée 23,17.')
com([2549, 2550], 'DEU.23.18', 'La prescription est expliquée comme une défense de la fornication et du commerce sexuel hors mariage.')
cite(2550, 'EXO.20.14', 'La note éditoriale renvoie explicitement au commandement du Décalogue contre l’adultère.')
nonBiblique(2550, 'renvoi interne', 'renvoi explicite d’Augustin à la Question LXXI, 4 des Questions sur l’Exode ; cible intertextuelle à constituer.')

// XXXVIII — salaire de la prostitution et prix du chien.
cite(2551, 'DEU.23.19', 'Citation explicite de l’interdiction d’offrir dans la maison du Seigneur le salaire de la prostitution ou le prix du chien ; cible sémantique malgré l’ancienne numérotation imprimée 23,18.')
com([2551, 2552, 2553, 2554], 'DEU.23.19', 'L’abomination commune aux deux revenus et l’étendue de l’interdiction concernant le chien sont examinées.')
allusion(2552, 'NUM.18.15', 'Le rachat des premiers-nés d’animaux impurs est le précepte précis auquel est opposé le prix du chien.')
com([2554], 'DEU.23.18', 'La défense immédiatement précédente de la prostitution explique la mention du salaire qui ne peut expier ce vice au temple.')

// XXXIX — retrancher le méchant ou le mal.
cite(2555, 'DEU.24.7', 'Citation explicite de la mort du ravisseur d’un frère et de la formule « ôter le méchant du milieu de vous ».')
cite(2555, '1CO.5.12', 'Début de la citation explicite de l’Apôtre sur le jugement de ceux du dehors et de ceux du dedans.')
cite(2556, '1CO.5.12', 'Fin de la citation explicite sur le jugement de ceux qui sont dans l’Église.')
cite(2556, '1CO.5.13', 'Citation explicite de l’ordre apostolique de retrancher le méchant du milieu de la communauté.')
com([2556, 2557], 'DEU.24.7', 'La formule légale de retranchement par la mort est rapprochée de l’excommunication ecclésiale.')
com([2556, 2557, 2558], '1CO.5.13', 'Le masculin grec de « méchant » est analysé pour privilégier l’exclusion de l’homme coupable plutôt que l’arrachement abstrait du mal.')
cite(2559, 'EPH.4.22', 'Citation explicite de l’ordre de se dépouiller du vieil homme.')
cite(2559, 'EPH.4.28', 'Citation explicite de l’ordre adressé à celui qui dérobait de ne plus dérober.')

// XL — prêtres lévitiques.
cite(2560, 'DEU.24.8', 'Citation explicite de l’observance de toute la loi enseignée par les prêtres lévitiques.')
com([2560], 'DEU.24.8', 'La désignation des prêtres lévitiques fonde la distinction entre tous les prêtres, qui sont Lévites, et les Lévites non prêtres.')

const SANS_LIEN = new Set()
const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')
if (sha256('charte/CHARTE_IA.md') !== CHARTE_HASH) throw new Error('Charte modifiée : relire avant toute exécution')
for (const [path, hash] of PREUVES) if (sha256(path) !== hash) throw new Error(`Preuve fac-similé modifiée : ${path}`)
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: segments, error } = await sb.from('segments').select('id,segment_numero,segment_texte,notes,ref_niv1,ref_niv2,ref_niv2_texte,liens_revus_le,liens_revus_par').eq('id_oeuvre', OEUVRE).eq('ref_niv1', REF_NIV1).in('ref_niv2', QUESTIONS).order('segment_numero')
if (error) throw error
if (segments.length !== NB_SEGMENTS || segments.some((segment, index) => segment.segment_numero !== PREMIER + index)) throw new Error('Préétat : bornes ou continuité invalides')
if ([...new Set(segments.map((segment) => segment.ref_niv2))].join('|') !== QUESTIONS.join('|')) throw new Error('Questions incomplètes ou désordonnées')
if (segments.some((segment) => segment.ref_niv1 !== REF_NIV1 || segment.liens_revus_le || segment.liens_revus_par)) throw new Error('Préétat structurel ou relecture invalide')
for (const [n, [avant]] of CORRECTIONS_TEXTE) if (!segments.find((segment) => segment.segment_numero === n)?.segment_texte.includes(avant)) throw new Error(`Précondition correction texte invalide ${n} : ${JSON.stringify(segments.find((segment) => segment.segment_numero === n)?.segment_texte)}`)
const empreinte = createHash('sha256').update(JSON.stringify(segments.map((segment) => [segment.id, segment.segment_numero, segment.ref_niv1, segment.ref_niv2, segment.ref_niv2_texte, segment.segment_texte, segment.notes]))).digest('hex')
if (empreinte !== EMPREINTE_ATTENDUE) throw new Error(`Préétat modifié : ${empreinte}`)
const parNumero = new Map(segments.map((segment) => [segment.segment_numero, segment]))
const numerosClasses = new Set([...LIENS, ...SANS_CIBLE].map(([n]) => n))
const nonClasses = segments.filter((segment) => !numerosClasses.has(segment.segment_numero) && !SANS_LIEN.has(segment.segment_numero))
if (nonClasses.length) throw new Error(`Partition incomplète : ${nonClasses.map((segment) => segment.segment_numero)}`)
if ([...SANS_LIEN].some((n) => numerosClasses.has(n) || !parNumero.has(n))) throw new Error('Déclaration SANS_LIEN invalide')
if (LIENS.some(([n, canon, type, motif]) => !parNumero.has(n) || !canon || ![1, 2, 3, 4].includes(type) || !motif.trim())) throw new Error('Manifeste biblique invalide')
if (SANS_CIBLE.some(([n, type, motif]) => !parNumero.has(n) || type !== 4 || !/^RÉFÉRENCE NON BIBLIQUE \([^)]+\) : .+/.test(motif))) throw new Error('Référence sans cible invalide')
const cles = LIENS.map(([n, canon, type]) => `${n}|${canon}|${type}`)
if (new Set(cles).size !== cles.length) throw new Error('Doublon interne')
const cibles = [...new Set(LIENS.map(([, canon]) => canon))]
const { data: temoins, error: temoinsError } = await sb.from('versets_lecture').select('id_verset,"TR0001","TR0003","TR0004"').in('id_verset', cibles)
if (temoinsError) throw temoinsError
const temoinsParId = new Map(temoins.map((temoin) => [temoin.id_verset, temoin]))
const ciblesInvalides = cibles.filter((canon) => { const temoin = temoinsParId.get(canon); return !temoin || (!temoin.TR0001 && !temoin.TR0003 && !temoin.TR0004) })
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
for (const segment of segments) {
  const candidat = candidats.find((item) => item.segment_numero === segment.segment_numero)
  if (!candidat || candidat.ref_niv1 !== segment.ref_niv1 || candidat.ref_niv2 !== segment.ref_niv2) throw new Error(`Candidat structurellement désynchronisé ${segment.segment_numero}`)
}
for (const [n, [avant, apres]] of CORRECTIONS_CANDIDAT) {
  const candidat = candidats.find((item) => item.segment_numero === n)
  if (!candidat?.segment_texte.includes(avant)) throw new Error(`Candidat texte non synchronisable ${n}`)
  candidat.segment_texte = candidat.segment_texte.replace(avant, apres)
  const sources = sourceMap.filter((item) => item.first_segment_numero <= n && item.last_segment_numero >= n && item.source_clean?.includes(avant))
  if (sources.length !== 1) throw new Error(`Source-map non synchronisable ${n} : ${sources.length}`)
  sources[0].source_clean = sources[0].source_clean.replace(avant, apres)
}

const TOTAL = LIENS.length + SANS_CIBLE.length
const types = LIENS.reduce((compte, [, , type]) => { compte[type] = (compte[type] ?? 0) + 1; return compte }, {})
for (const [, type] of SANS_CIBLE) types[type] = (types[type] ?? 0) + 1
const liensParQuestion = Object.fromEntries(QUESTIONS.map((question) => {
  const numeros = new Set(segments.filter((segment) => segment.ref_niv2 === question).map((segment) => segment.segment_numero))
  return [question, [...LIENS, ...SANS_CIBLE].filter(([n]) => numeros.has(n)).length]
}))
const pct = (n) => `${n} / 3262 = ${(100 * n / 3262).toFixed(2).replace('.', ',')} %`
console.log(JSON.stringify({ mode: WRITE ? 'écriture' : 'contrôle', lot: 'Deutéronome XXXI-XL', bornes: [PREMIER, DERNIER], segments: NB_SEGMENTS, corrections_ocr: CORRECTIONS_TEXTE.size, sic_confirmes: 0, liens_bibliques: LIENS.length, references_non_bibliques: SANS_CIBLE.length, total_liens: TOTAL, sans_lien: [...SANS_LIEN], cibles_distinctes: cibles.length, types, liens_par_question: liensParQuestion, empreinte, charte_hash: CHARTE_HASH, avancement_actuel: pct(relusGlobaux), avancement_potentiel_apres_ecriture: pct(relusGlobaux + NB_SEGMENTS) }, null, 2))
if (DETAIL) for (const [n, canon, type, motif] of LIENS) { const temoin = temoinsParId.get(canon); console.log({ n, canon, type, motif, segment: parNumero.get(n).segment_texte, temoin: temoin.TR0003 || temoin.TR0001 || temoin.TR0004 }) }
if (!WRITE) process.exit(0)

const horodatage = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
const sauvegardePath = `scripts/heptateuque/audit-reprise/sauvegarde-deuteronome-q31-q40-${horodatage}.json`
mkdirSync('scripts/heptateuque/audit-reprise', { recursive: true })
writeFileSync(sauvegardePath, `${JSON.stringify({ oeuvre: OEUVRE, bornes: [PREMIER, DERNIER], empreinte, segments, liens_existants: [] }, null, 2)}\n`, 'utf8')
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`
const valeurs = [
  ...LIENS.map(([n, canon, type, motif]) => `(${parNumero.get(n).id}, ${quote(canon)}, ${type}, 'vérifié', ${quote(motif)}, 'lecture', false)`),
  ...SANS_CIBLE.map(([n, type, motif]) => `(${parNumero.get(n).id}, null, ${type}, 'à constituer', ${quote(motif)}, 'lecture', true)`),
].join(',\n    ')
const idSql = ids.join(', ')
const correctionsSql = [...CORRECTIONS_TEXTE].map(([n, [avant, apres]]) => `update segments set segment_texte = replace(segment_texte, ${quote(avant)}, ${quote(apres)}) where id = ${parNumero.get(n).id} and segment_texte like ${quote(`%${avant}%`)};
  get diagnostics n = row_count; if n <> 1 then raise exception 'Correction texte ${n}: %/1', n; end if;`).join('\n  ')
const sql = `do $p$ declare n integer; begin
  if exists (select 1 from liens_bibliques where segment_id in (${idSql})) then raise exception 'Liens présents'; end if;
  if exists (select 1 from segments where id in (${idSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Déjà relu'; end if;
  ${correctionsSql}
  insert into liens_bibliques (segment_id, canon_id, type, fiabilite, motif, provenance, arbitrage_requis) values
    ${valeurs};
  get diagnostics n = row_count; if n <> ${TOTAL} then raise exception 'Liens insérés : %', n; end if;
  update segments set liens_revus_le = now(), liens_revus_par = ${quote(RELECTEUR)} where id in (${idSql});
  get diagnostics n = row_count; if n <> ${NB_SEGMENTS} then raise exception 'Segments relus : %', n; end if;
end $p$;`
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
const correctionInvalide = [...CORRECTIONS_TEXTE].some(([n, [avant, apres]]) => textesParNumero.get(n).includes(avant) || !textesParNumero.get(n).includes(apres))
if (liensApres !== TOTAL || relusApres !== NB_SEGMENTS || correctionInvalide || audit.some((lien) => !lien.motif || lien.provenance !== 'lecture' || (lien.canon_id ? (lien.fiabilite !== 'vérifié' || lien.arbitrage_requis) : (lien.fiabilite !== 'à constituer' || !lien.arbitrage_requis || lien.type !== 4 || !/^RÉFÉRENCE NON BIBLIQUE \([^)]+\) : .+/.test(lien.motif))))) throw new Error('Postcontrôle invalide')
const clesApres = audit.map((lien) => `${lien.segment_id}|${lien.canon_id ?? 'sans-cible'}|${lien.type}|${lien.motif}`)
if (new Set(clesApres).size !== clesApres.length) throw new Error('Doublon dans le postétat')
writeFileSync(candidatsPath, `${JSON.stringify(candidats, null, 2)}\n`, 'utf8')
writeFileSync(sourceMapPath, `${JSON.stringify(sourceMap, null, 2)}\n`, 'utf8')
console.log(`✓ ${liensApres} liens ; ${relusApres} segments relus ; sauvegarde ${sauvegardePath}`)
