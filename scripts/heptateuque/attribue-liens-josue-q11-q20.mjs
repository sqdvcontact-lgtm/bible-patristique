import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre sixième'
const PREMIER = 2754
const DERNIER = 2800
const NB_SEGMENTS = 47
const WRITE = process.argv.includes('--write')
const DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Josué Q. XI-XX'
const EMPREINTE_ATTENDUE = '90f11c11f346ce77af3d80b9d42d489183f1226f5396886790eb9b5228010263'
const CHARTE_HASH = '47893c044ebab26e78149548c129fb9de3b72dde1e37c3371b60a1786240c198'
const QUESTIONS = ['Question XI', 'Question XII', 'Question XIII', 'Question XIV', 'Question XV', 'Question XVI', 'Question XVII', 'Question XVIII', 'Question XIX', 'Question XX']
const PREUVES = [
  ['scripts/heptateuque/img/p563.jpg', 'be4f0c18b64cc5e99a328e2c4f9ac03b521d1506aac1108ee7d1a89c8426b71b', 'Page imprimée 555, raccord amont et début de la Question XI.'],
  ['scripts/heptateuque/img/p564.jpg', '438df5d273a74367b804ea1b69898268cea125f2654f377a806d7e4dd3cf89cd', 'Page imprimée 556, Questions XI à XIII.'],
  ['scripts/heptateuque/img/p565.jpg', '73c7d42d5ae683ec5e23e07428c7ba275ae224b3bf2113513636782e7501a12c', 'Page imprimée 557, Questions XIV à XVIII.'],
  ['scripts/heptateuque/img/p566.jpg', '32a7ded360e7cdb18787f318c354f54ae8761b645d16ce8fc95eeb641675f32d', 'Page imprimée 558, Questions XVIII et XIX.'],
  ['scripts/heptateuque/img/p567.jpg', '94a51e84c853464f629684c94e97843f411ca4bc422377b48fa8247f8e002302', 'Page imprimée 559, Question XX et note 764.'],
]
const CORRECTIONS_TEXTE = new Map([[2754, ['Josué en envoyant trente mille', 'Josué, en envoyant trente mille']]])
const CORRECTIONS_NOTES = new Map([[2800, ['[[764]] Jos. XXI, 21', '[[764]] Jos. XI, 21']]])

const LIENS = []
const add = (n, c, t, m) => LIENS.push([n, c, t, m])
const both = (n, c, m) => { add(n, c, 1, `${m} — citation, référence ou reprise explicite.`); add(n, c, 3, `${m} — passage commenté ou mobilisé dans le raisonnement.`) }
const explain = (n, ids, m) => { for (const id of ids) add(n, id, 3, `${m} (${id}).`) }
const allusion = (n, ids, m) => { for (const id of ids) add(n, id, 2, `${m} (${id}).`) }
const SANS_CIBLE = []
const nonBiblique = (n, genre, m) => SANS_CIBLE.push([n, 4, `RÉFÉRENCE NON BIBLIQUE (${genre}) : ${m}`])

// Question XI — stratagème de Gaï et vérité.
for (const id of ['JOS.8.3', 'JOS.8.4', 'JOS.8.5']) both(2754, id, 'Josué envoie trente mille hommes et leur ordonne l’embuscade derrière Gaï')
for (const id of ['JOS.8.5', 'JOS.8.6', 'JOS.8.7']) both(2755, id, 'Josué décrit la fuite simulée, la poursuite hors de la ville et la sortie de l’embuscade')
both(2756, 'JOS.8.8', 'Josué ordonne d’entrer dans la ville et d’agir selon ses paroles')
explain(2756, ['JOS.8.4', 'JOS.8.5', 'JOS.8.6', 'JOS.8.7'], 'Le stratagème prescrit est soumis à la question morale du mensonge')
explain(2757, ['JOS.8.4', 'JOS.8.5', 'JOS.8.6', 'JOS.8.7', 'JOS.8.8'], 'La ruse militaire est examinée comme tromperie éventuellement justifiée par un sens mystérieux')

// Question XII — sacs sur les épaules ou sur les ânes.
for (let v = 3; v <= 13; v += 1) add(2758, `JOS.9.${v}`, 1, `La rubrique imprimée Josué 9,3-13 désigne le récit de la ruse gabaonite (JOS.9.${v}).`)
add(2758, 'JOS.9.4', 3, 'La variante « épaules » ou « ânes » est confrontée au verset où les Gabaonites chargent leurs vieux sacs et leurs outres.')
explain(2759, ['JOS.9.4'], 'La proximité des mots grecs pour épaules et ânes explique la variante textuelle.')
explain(2760, ['JOS.9.4', 'JOS.9.13'], 'Le contexte des députés, des sacs et des outres rend la leçon « sur leurs ânes » plus vraisemblable.')
nonBiblique(2758, 'traditions textuelles', 'plusieurs exemplaires grecs et latins de Josué 9,4 portent des leçons différentes')
nonBiblique(2759, 'philologie grecque', 'comparaison des leçons ὤμοις, « épaules », et ὄνοις, « ânes »')

// Question XIII — serment aux Gabaonites.
both(2761, 'JOS.9.19', 'Les princes maintiennent le serment prêté aux Gabaonites malgré leur tromperie')
explain(2762, ['JOS.9.3', 'JOS.9.4'], 'Les Gabaonites organisent leur ruse parce qu’ils savent leur peuple menacé d’extermination.')
explain(2763, ['JOS.9.15'], 'Israël conclut une alliance jurée sur la fausse affirmation d’une origine lointaine.')
explain(2764, ['JOS.9.16', 'JOS.9.18', 'JOS.9.19', 'JOS.9.20'], 'Après la découverte du mensonge, Israël épargne les Gabaonites afin de rester fidèle au serment.')
explain(2765, ['JOS.9.14', 'JOS.9.15', 'JOS.9.19', 'JOS.9.20'], 'Dieu ne condamne ni l’absence de consultation initiale ni le maintien de l’alliance jurée.')
explain(2766, ['JOS.9.15', 'JOS.9.18', 'JOS.9.19', 'JOS.9.20'], 'La crainte sincère des Gabaonites et la fidélité d’Israël au serment expliquent la clémence accordée.')
for (let v = 1; v <= 9; v += 1) add(2766, `2SA.21.${v}`, 1, `La note 758 renvoie à la vengeance exercée contre la maison de Saül pour les Gabaonites (2SA.21.${v}).`)
explain(2767, ['JOS.9.19', 'JOS.9.20'], 'La fidélité au serment fait préférer la clémence envers des hommes pourtant menteurs.')
for (let v = 22; v <= 33; v += 1) add(2768, `1SA.25.${v}`, 1, `La note 759 déploie l’épisode où David renonce à son serment de tuer Nabal (1SA.25.${v}).`)
explain(2768, ['JOS.9.19'], 'Le serment fait aux Gabaonites est distingué d’un serment criminel qu’il vaut mieux ne pas accomplir.')

// Questions XIV et XV — secours aux Gabaonites et nom des Amorrhéens.
for (const id of ['JOS.10.5', 'JOS.10.6', 'JOS.10.7']) both(2769, id, 'Les cinq rois assiègent Gabaon, qui demande du secours, puis Josué monte de Galgala avec ses guerriers')
both(2770, 'JOS.10.8', 'Dieu assure Josué qu’aucun des rois ennemis ne lui résistera')
explain(2771, ['JOS.9.14', 'JOS.9.15', 'JOS.10.8'], 'L’intervention spontanée de Dieu confirme qu’il agréait le serment et pouvait révéler la tromperie sans être consulté.')
explain(2772, ['JOS.10.8'], 'La promesse de victoire récompense la confiance d’Israël dans l’aide divine.')
for (const id of ['JOS.10.5', 'JOS.10.6']) both(2773, id, 'Les cinq rois sont dits Jébuséens puis Amorrhéens dans le récit du siège de Gabaon')
explain(2774, ['JOS.10.5', 'JOS.10.6'], 'La version hébraïque et le contexte sont examinés pour l’appellation des cinq rois.')
allusion(2774, ['JOS.15.63'], 'Le roi de Jérusalem peut être appelé Jébuséen parce que Jérusalem est aussi Jébus.')
explain(2775, ['JOS.10.5', 'JOS.10.6'], 'Amorrhéens peut fonctionner comme nom générique tout en désignant proprement une des sept nations.')
explain(2776, ['JOS.10.5', 'JOS.10.6'], 'L’usage générique de Chanaan éclaire par analogie celui du nom Amorrhéen.')
nonBiblique(2774, 'traduction', 'comparaison avec la version faite sur l’hébreu, qui nomme constamment les cinq rois Amorrhéens')

// Questions XVI à XVIII — extermination et endurcissement.
for (const id of ['JOS.11.14', 'JOS.11.15']) both(2777, id, 'Josué ne laisse aucun vivant et exécute sans omission les ordres transmis par Moïse')
explain(2778, ['JOS.11.14', 'JOS.11.15'], 'L’extermination est imputée à l’obéissance de Josué au commandement divin.')
explain(2779, ['JOS.11.14', 'JOS.11.15'], 'La justice du jugement divin répond au reproche de cruauté envers les Chananéens.')
both(2780, 'JOS.11.19', 'Aucune ville, sauf Gabaon, ne conclut la paix avec Israël et toutes sont prises par les armes')
explain(2781, ['JOS.11.19'], 'L’énoncé est limité aux villes attaquées par Josué et aux régions énumérées dans le contexte.')
both(2782, 'JOS.11.20', 'Dieu endurcit les peuples afin qu’ils combattent Israël et soient exterminés sans clémence')
explain(2783, ['JOS.11.20'], 'L’endurcissement des Chananéens est rapproché de celui de Pharaon.')
for (const id of ['EXO.7.3', 'EXO.7.22', 'EXO.8.15']) both(2783, id, 'La note 760 rassemble trois attestations de l’endurcissement du cœur de Pharaon')
for (const n of [2784, 2787, 2788, 2791]) explain(n, ['JOS.11.20'], 'Le dessein de l’endurcissement est expliqué par la guerre, le refus de clémence et l’obéissance de Josué.')
for (const n of [2785, 2786]) explain(n, ['JOS.11.20', 'JOS.9.15', 'JOS.9.18', 'JOS.9.19', 'JOS.9.20'], 'Le sort des peuples endurcis est comparé à la grâce obtenue par les Gabaonites grâce au serment.')
allusion(2789, ['JOS.15.63', 'JOS.16.10', 'JOS.17.12', 'JOS.17.13'], 'Du vivant de Josué, certains peuples demeurent ou deviennent tributaires parce qu’Israël ne les chasse pas entièrement.')
explain(2789, ['JOS.11.20'], 'Ces exceptions sont intégrées à l’explication de la ligue voulue contre Josué.')
allusion(2790, ['JOS.15.63', 'JOS.16.10', 'JOS.17.12', 'JOS.17.13'], 'Le partage du pays se poursuit tandis que les tribus prennent ou n’arrivent pas à prendre certains territoires.')
explain(2790, ['JOS.11.20'], 'L’âge de Josué explique qu’il ne dirige plus personnellement ces opérations.')
nonBiblique(2791, 'renvoi interne', 'annonce d’une explication ultérieure sur l’impossibilité de vaincre certains peuples')

// Question XIX — additions des Septante.
both(2792, 'JOS.16.10', 'Éphraïm ne chasse pas les Chananéens de Gazer et les rend tributaires')
both(2792, '1KI.9.16', 'L’addition raconte que Pharaon prit et brûla Gazer avant de la donner en dot à sa fille')
for (const n of [2793, 2794]) explain(n, ['1KI.9.16'], 'Le fait relatif à Pharaon est tenu pour une insertion historique plutôt que pour une prophétie.')
both(2795, '1KI.9.16', 'La note 761 identifie dans les Rois le récit de la prise de Gazer par Pharaon')
nonBiblique(2795, 'tradition textuelle', 'l’addition des Septante est défendue par leur accord et comparée à l’autorité prophétique')
explain(2796, ['1KI.9.16', 'JOS.6.26', '1KI.16.34'], 'L’absence dans la version hébraïque est constatée pour l’addition sur Gazer puis pour celle sur la reconstruction de Jéricho.')
nonBiblique(2796, 'traduction', 'comparaison de la version faite sur l’hébreu avec les additions conservées par les Septante')
both(2797, 'JOS.6.26', 'Josué maudit celui qui rebâtira Jéricho au prix de son premier-né et de son dernier fils')
both(2798, '1KI.16.34', 'Hiel de Béthel accomplit la malédiction en perdant son premier-né puis son dernier fils')
explain(2798, ['JOS.6.26'], 'L’accomplissement historique est présenté comme une interposition des Septante après l’imprécation de Josué.')

// Question XX — passage grec attribué à Josué 19,47, mais contenu de Juges 1,35.
both(2799, 'JDG.1.35', 'La citation sur les Amorrhéens demeurés à Aïalon et Salebim puis rendus tributaires correspond au contenu local de Juges 1,35')
explain(2799, ['JOS.11.20'], 'Le cas des tributaires introduit le motif de l’endurcissement des Chananéens.')
both(2800, 'JOS.11.20', 'La note imprimée Josué XI,21 vise par son contenu le verset local JOS.11.20 sur l’endurcissement et la ligue des peuples')
explain(2800, ['JDG.1.35'], 'La faiblesse ultérieure d’Israël explique pourquoi Dieu voulut que les peuples fussent vaincus sous Josué.')
nonBiblique(2799, 'tradition textuelle', 'passage attribué par la rubrique à Josué 19,47 suivant les Septante, mais correspondant à Juges 1,35 dans le canon local')

const SANS_LIEN = new Set()
const sha256 = (p) => createHash('sha256').update(readFileSync(p)).digest('hex')
if (sha256('charte/CHARTE_IA.md') !== CHARTE_HASH) throw new Error('Charte modifiée : relire avant toute exécution')
for (const [p, h] of PREUVES) if (sha256(p) !== h) throw new Error(`Preuve fac-similé modifiée : ${p}`)
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: segments, error } = await sb.from('segments').select('id,segment_numero,segment_texte,notes,ref_niv1,ref_niv2,ref_niv2_texte,liens_revus_le,liens_revus_par').eq('id_oeuvre', OEUVRE).eq('ref_niv1', REF_NIV1).in('ref_niv2', QUESTIONS).order('segment_numero')
if (error) throw error
if (segments.length !== NB_SEGMENTS || segments.some((s, i) => s.segment_numero !== PREMIER + i)) throw new Error('Préétat : bornes ou continuité invalides')
if ([...new Set(segments.map((s) => s.ref_niv2))].join('|') !== QUESTIONS.join('|')) throw new Error('Questions incomplètes ou désordonnées')
if (segments.some((s) => s.ref_niv1 !== REF_NIV1 || s.liens_revus_le || s.liens_revus_par)) throw new Error('Préétat structurel ou relecture invalide')
for (const [n, [avant]] of CORRECTIONS_TEXTE) if (!segments.find((s) => s.segment_numero === n)?.segment_texte.includes(avant)) throw new Error(`Précondition correction texte invalide au segment ${n}`)
for (const [n, [avant]] of CORRECTIONS_NOTES) if (!segments.find((s) => s.segment_numero === n)?.notes?.includes(avant)) throw new Error(`Précondition correction note invalide au segment ${n}`)
const empreinte = createHash('sha256').update(JSON.stringify(segments.map((s) => [s.id, s.segment_numero, s.ref_niv1, s.ref_niv2, s.ref_niv2_texte, s.segment_texte, s.notes]))).digest('hex')
if (empreinte !== EMPREINTE_ATTENDUE) throw new Error(`Préétat modifié : ${empreinte}`)
const parNumero = new Map(segments.map((s) => [s.segment_numero, s]))
const classes = new Set([...LIENS, ...SANS_CIBLE].map(([n]) => n))
const nonClasses = segments.filter((s) => !classes.has(s.segment_numero) && !SANS_LIEN.has(s.segment_numero))
if (nonClasses.length) throw new Error(`Partition incomplète : ${nonClasses.map((s) => s.segment_numero)}`)
if (LIENS.some(([n, c, t, m]) => !parNumero.has(n) || !c || ![1, 2, 3, 4].includes(t) || !m.trim())) throw new Error('Manifeste biblique invalide')
if (SANS_CIBLE.some(([n, t, m]) => !parNumero.has(n) || t !== 4 || !m.startsWith('RÉFÉRENCE NON BIBLIQUE'))) throw new Error('Référence sans cible invalide')
const cles = LIENS.map(([n, c, t]) => `${n}|${c}|${t}`)
if (new Set(cles).size !== cles.length) throw new Error('Doublon interne')
const cibles = [...new Set(LIENS.map(([, c]) => c))]
const { data: temoins, error: et } = await sb.from('versets_lecture').select('id_verset,"TR0001","TR0003","TR0004"').in('id_verset', cibles)
if (et) throw et
const temoinsParId = new Map(temoins.map((t) => [t.id_verset, t]))
const invalides = cibles.filter((c) => { const t = temoinsParId.get(c); return !t || (!t.TR0001 && !t.TR0003 && !t.TR0004) })
if (invalides.length) throw new Error(`Cibles invalides : ${invalides.join(', ')}`)
const ids = segments.map((s) => s.id)
const [{ count: liensExistants, error: el }, { count: relusGlobaux, error: er }] = await Promise.all([
  sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  sb.from('segments').select('id', { count: 'exact', head: true }).eq('id_oeuvre', OEUVRE).not('liens_revus_le', 'is', null),
])
if (el || er) throw el || er
if (liensExistants) throw new Error(`${liensExistants} liens existent déjà dans le lot`)
const candidatsPath = 'scripts/heptateuque/segmentation-candidate/segments-candidate.json'
const sourceMapPath = 'scripts/heptateuque/segmentation-candidate/source-map.json'
const candidats = JSON.parse(readFileSync(candidatsPath, 'utf8'))
const sourceMap = JSON.parse(readFileSync(sourceMapPath, 'utf8'))
for (const [n, [avant, apres]] of CORRECTIONS_TEXTE) {
  const candidat = candidats.find((x) => x.segment_numero === n)
  if (!candidat?.segment_texte.includes(avant)) throw new Error(`Candidat non synchronisable au segment ${n}`)
  candidat.segment_texte = candidat.segment_texte.replace(avant, apres)
  const sources = sourceMap.filter((x) => x.first_segment_numero <= n && x.last_segment_numero >= n && x.source_clean?.includes(avant))
  if (sources.length !== 1) throw new Error(`Source-map non synchronisable au segment ${n} : ${sources.length}`)
  sources[0].source_clean = sources[0].source_clean.replace(avant, apres)
}
for (const [n, [avant, apres]] of CORRECTIONS_NOTES) {
  const candidat = candidats.find((x) => x.segment_numero === n)
  if (!candidat?.notes?.includes(avant)) throw new Error(`Notes candidates non synchronisables au segment ${n}`)
  candidat.notes = candidat.notes.replace(avant, apres)
}
const TOTAL = LIENS.length + SANS_CIBLE.length
const types = LIENS.reduce((o, [, , t]) => { o[t] = (o[t] ?? 0) + 1; return o }, {})
for (const [, t] of SANS_CIBLE) types[t] = (types[t] ?? 0) + 1
const parQuestion = Object.fromEntries(QUESTIONS.map((q) => { const nums = new Set(segments.filter((s) => s.ref_niv2 === q).map((s) => s.segment_numero)); return [q, [...LIENS, ...SANS_CIBLE].filter(([n]) => nums.has(n)).length] }))
const pct = (n) => `${n} / 3262 = ${(100 * n / 3262).toFixed(2).replace('.', ',')} %`
console.log(JSON.stringify({ mode: WRITE ? 'écriture' : 'contrôle', lot: 'Josué XI-XX', bornes: [PREMIER, DERNIER], segments: NB_SEGMENTS, corrections_ocr_texte: CORRECTIONS_TEXTE.size, corrections_ocr_notes: CORRECTIONS_NOTES.size, sic_confirmes: 0, liens_bibliques: LIENS.length, references_non_bibliques: SANS_CIBLE.length, total_liens: TOTAL, sans_lien: [...SANS_LIEN], cibles_distinctes: cibles.length, types, liens_par_question: parQuestion, empreinte, charte_hash: CHARTE_HASH, avancement_actuel: pct(relusGlobaux), avancement_potentiel_apres_ecriture: pct(relusGlobaux + NB_SEGMENTS) }, null, 2))
if (DETAIL) for (const [n, c, t, motif] of LIENS) { const temoin = temoinsParId.get(c); console.log({ n, c, t, motif, segment: parNumero.get(n).segment_texte, temoin: temoin.TR0003 || temoin.TR0001 || temoin.TR0004 }) }
if (!WRITE) process.exit(0)
const horodatage = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
const sauvegardePath = `scripts/heptateuque/audit-reprise/sauvegarde-josue-q11-q20-${horodatage}.json`
mkdirSync('scripts/heptateuque/audit-reprise', { recursive: true })
writeFileSync(sauvegardePath, `${JSON.stringify({ oeuvre: OEUVRE, bornes: [PREMIER, DERNIER], empreinte, segments, liens_existants: [] }, null, 2)}\n`, 'utf8')
const quote = (v) => `'${String(v).replaceAll("'", "''")}'`
const valeurs = [...LIENS.map(([n, c, t, m]) => `(${parNumero.get(n).id}, ${quote(c)}, ${t}, 'vérifié', ${quote(m)}, 'lecture', false)`), ...SANS_CIBLE.map(([n, t, m]) => `(${parNumero.get(n).id}, null, ${t}, 'à constituer', ${quote(m)}, 'lecture', true)`)].join(',\n')
const idSql = ids.join(', ')
const correctionsTexteSql = [...CORRECTIONS_TEXTE].map(([n, [avant, apres]]) => `update segments set segment_texte=replace(segment_texte,${quote(avant)},${quote(apres)}) where id=${parNumero.get(n).id} and segment_texte like ${quote(`%${avant}%`)}; get diagnostics n=row_count; if n<>1 then raise exception 'Correction texte ${n}: %',n; end if;`).join('\n')
const correctionsNotesSql = [...CORRECTIONS_NOTES].map(([n, [avant, apres]]) => `update segments set notes=replace(notes,${quote(avant)},${quote(apres)}) where id=${parNumero.get(n).id} and notes like ${quote(`%${avant}%`)}; get diagnostics n=row_count; if n<>1 then raise exception 'Correction note ${n}: %',n; end if;`).join('\n')
const sql = `do $p$ declare n integer; begin
if exists(select 1 from liens_bibliques where segment_id in (${idSql})) then raise exception 'Liens présents'; end if;
if exists(select 1 from segments where id in (${idSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Déjà relu'; end if;
${correctionsTexteSql}
${correctionsNotesSql}
insert into liens_bibliques(segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis) values ${valeurs}; get diagnostics n=row_count; if n<>${TOTAL} then raise exception 'Liens: %',n; end if;
update segments set liens_revus_le=now(),liens_revus_par=${quote(RELECTEUR)} where id in (${idSql}); get diagnostics n=row_count; if n<>${NB_SEGMENTS} then raise exception 'Segments: %',n; end if; end $p$;`
const { error: ew } = await sb.rpc('exec_sql', { sql }); if (ew) throw ew
const [{ count: liensApres, error: e1 }, { count: relusApres, error: e2 }, { data: audit, error: e3 }, { data: textes, error: e4 }] = await Promise.all([
  sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  sb.from('segments').select('id', { count: 'exact', head: true }).in('id', ids).not('liens_revus_le', 'is', null),
  sb.from('liens_bibliques').select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id', ids),
  sb.from('segments').select('segment_numero,segment_texte,notes').in('id', ids),
]); if (e1 || e2 || e3 || e4) throw e1 || e2 || e3 || e4
const post = new Map(textes.map((s) => [s.segment_numero, s]))
const mauvaiseCorrectionTexte = [...CORRECTIONS_TEXTE].some(([n, [a, b]]) => post.get(n).segment_texte.includes(a) || !post.get(n).segment_texte.includes(b))
const mauvaiseCorrectionNotes = [...CORRECTIONS_NOTES].some(([n, [a, b]]) => post.get(n).notes.includes(a) || !post.get(n).notes.includes(b))
if (liensApres !== TOTAL || relusApres !== NB_SEGMENTS || mauvaiseCorrectionTexte || mauvaiseCorrectionNotes || audit.some((l) => !l.motif || l.provenance !== 'lecture' || (l.canon_id ? (l.fiabilite !== 'vérifié' || l.arbitrage_requis) : (l.fiabilite !== 'à constituer' || !l.arbitrage_requis || l.type !== 4)))) throw new Error('Postcontrôle invalide')
const apres = audit.map((l) => `${l.segment_id}|${l.canon_id ?? 'sans-cible'}|${l.type}|${l.motif}`)
if (new Set(apres).size !== apres.length) throw new Error('Doublon postétat')
writeFileSync(candidatsPath, `${JSON.stringify(candidats, null, 2)}\n`, 'utf8')
writeFileSync(sourceMapPath, `${JSON.stringify(sourceMap, null, 2)}\n`, 'utf8')
console.log(`✓ ${liensApres} liens ; ${relusApres} segments relus ; sauvegarde ${sauvegardePath}`)
