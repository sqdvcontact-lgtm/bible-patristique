import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre septième'
const QUESTION = 'Question XLIX'
const DEBUT = 3160
const FIN = 3227
const TOTAL_SEGMENTS = 68
const WRITE = process.argv.includes('--write')
const DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Juges Q. XLIX-B'
const EMPREINTE_ATTENDUE = 'a1ae9b517cef03225fbb8e970b0b629997a2aae53a48d03edb213b02e5ac2348'
const CHARTE = 'charte/CHARTE_IA.md'
const CHARTE_HASH = '47893c044ebab26e78149548c129fb9de3b72dde1e37c3371b60a1786240c198'
const PREUVES = [
  ['scripts/heptateuque/img/p591.jpg', 'f4840da16798f9e38956a5a6556470ab7166c56fcff778fb1c12ddd0034b9bc6'],
  ['scripts/heptateuque/img/p592.jpg', '2be85d3a3a629f1806b2290657dce8ac22fdefc877c0edc253861f0248b01b11'],
  ['scripts/heptateuque/img/p593.jpg', '768c7f2d39d59e408c90e000dcc496d952e705521115765d3b944a4ff847a8d5'],
  ['scripts/heptateuque/img/p594.jpg', 'b88285af65ab7a6f95e625d8d2d683f5ccd700c6b1c5bca95c4f76b6fa87fa1a'],
  ['scripts/heptateuque/img/p595.jpg', '963b4cde37b96ba7969c26374488db57cf22fbcdc089df98c284de37209e12db'],
]
const CORRECTIONS_TEXTE = [{ numero: 3209, avant: '27. [<i>sic</i>] «', apres: '27. «' }]
const CORRECTIONS_NOTES = [{ numero: 3217, avant: '[[890]] Ib. XV.', apres: '[[890]] Ib. 15.' }]

const LIENS = []
const NON_RESOLUS = []
const SANS_LIEN = new Set()
const add = (numero, canonId, type, motif) => LIENS.push([numero, canonId, type, motif])
const com = (numero, canonIds, motif) => { for (const canonId of canonIds) add(numero, canonId, 3, `${motif} (${canonId}).`) }
const both = (numero, canonId, motif) => { add(numero, canonId, 1, `${motif} — citation ou référence intentionnelle.`); add(numero, canonId, 3, `${motif} — passage commenté ou mobilisé.`) }
const nonBiblique = (numero, genre, motif) => NON_RESOLUS.push([numero, 4, `RÉFÉRENCE NON BIBLIQUE (${genre}) : ${motif} ; cible de corpus à constituer.`])

// Conclusion morale du récit historique du vœu de Jephté.
for (const n of [3160, 3161]) com(n, ['JDG.11.30', 'JDG.11.31', 'JDG.11.34', 'JDG.11.35', 'JDG.11.39'], 'Le vœu, la rencontre de la fille unique et son sacrifice fondent le jugement moral')

// Lecture figurative : Jephté rejeté puis rappelé, figure du Christ.
for (let n = 3162; n <= 3170; n++) com(n, ['JDG.11.1', 'JDG.11.2', 'JDG.11.3'], 'Le rejet de Jephté par ses frères puis son séjour au pays de Tob sont lus comme figure du Christ rejeté')
both(3163, 'LUK.24.45', 'Le Christ ouvre aux disciples le sens des Écritures')
both(3163, 'LUK.24.27', 'Le Christ interprète dans toutes les Écritures ce qui le concerne')
com(3167, ['JDG.8.27', 'JDG.10.6', 'JDG.10.8'], 'L’idolâtrie et la servitude d’Israël éclairent l’image de la synagogue prostituée')
nonBiblique(3170, 'philologie onomastique', 'le nom de Jephté est expliqué comme « celui qui ouvre »')
for (let n = 3171; n <= 3176; n++) com(n, ['JDG.11.2', 'JDG.11.3'], 'L’expulsion de Jephté et sa retraite volontaire figurent la passion et la résurrection du Christ')
both(3172, 'GEN.32.24', 'Jacob demeure seul et lutte avec l’ange')
both(3172, 'GEN.32.28', 'Jacob reçoit le nom d’Israël après avoir prévalu')
both(3173, 'JHN.9.16', 'Les pharisiens accusent Jésus de ne pas observer le sabbat')
both(3174, 'JHN.8.41', 'Les adversaires de Jésus revendiquent de ne pas être nés de prostitution')
both(3176, '1CO.2.8', 'Les princes de ce siècle ont crucifié le Seigneur de gloire')
nonBiblique(3175, 'philologie onomastique', 'le pays de Tob est interprété comme désignant le bien')

// Les compagnons de Jephté et les pécheurs rassemblés autour du Christ.
for (let n = 3177; n <= 3180; n++) com(n, ['JDG.11.3'], 'Les hommes sans ressources rassemblés autour de Jephté figurent les pécheurs accueillis par le Christ')
both(3177, 'MAT.9.11', 'Jésus mange avec les publicains et les pécheurs')
both(3177, 'MAT.9.12', 'Le médecin vient pour les malades')
both(3178, 'ISA.53.12', 'Le Serviteur est compté parmi les criminels')
both(3178, 'LUK.23.33', 'Jésus est crucifié avec deux malfaiteurs')
both(3178, 'LUK.23.43', 'Le malfaiteur reçoit la promesse du paradis')
both(3180, 'PSA.50.15', 'Les pécheurs se convertiront après avoir appris les voies de Dieu')

// Retour des anciens : conversion future d’Israël.
for (let n = 3181; n <= 3186; n++) com(n, ['JDG.11.4', 'JDG.11.5', 'JDG.11.6'], 'Les anciens de Galaad rappelant Jephté figurent Israël revenant au Christ rejeté')
for (let v = 22; v <= 38; v++) both(3183, `ACT.2.${v}`, 'La prédication de Pierre à Israël, son appel à la pénitence et le baptême sont expressément invoqués')
add(3184, 'ROM.11.25', 2, 'L’endurcissement partiel d’Israël jusqu’à l’entrée des nations éclaire la conversion finale annoncée.')
add(3184, 'ROM.11.26', 2, 'L’annonce que tout Israël sera sauvé est reprise dans l’interprétation eschatologique.')
nonBiblique(3185, 'philologie onomastique', 'Galaad est interprété comme le monceau du témoignage')

// Ammon, reproche de Jephté et parallèle de Joseph.
for (let n = 3187; n <= 3189; n++) com(n, ['JDG.11.4', 'JDG.11.5', 'JDG.11.6'], 'La guerre d’Ammon et le rappel de Jephté sont interprétés spirituellement')
both(3189, 'MAT.25.30', 'Le serviteur inutile est jeté dans les ténèbres extérieures')
nonBiblique(3187, 'philologie onomastique', 'Ammon est interprété comme le peuple de l’affliction')
both(3190, 'JDG.11.7', 'Jephté reproche aux anciens de l’avoir haï et chassé')
both(3191, 'GEN.37.28', 'Joseph vendu par ses frères fournit le parallèle du juste rejeté')
com(3191, ['GEN.42.3', 'GEN.42.6', 'GEN.44.18'], 'Les frères de Joseph reviennent ensuite vers celui qu’ils avaient vendu')
for (let n = 3192; n <= 3194; n++) com(n, ['JDG.11.7', 'JDG.11.8'], 'Le retour d’Israël vers Jephté figure son retour au Christ')
both(3194, 'LUK.1.33', 'Le règne du Christ sur la maison de Jacob n’aura pas de fin')

// Jephté chef et juge, figure de la royauté du Christ.
for (let n = 3195; n <= 3201; n++) com(n, ['JDG.11.8', 'JDG.11.9', 'JDG.11.10', 'JDG.11.11'], 'La promesse d’établir Jephté comme chef et sa comparution devant le Seigneur sont commentées')
both(3197, 'JDG.8.22', 'Israël propose à Gédéon de régner')
both(3197, 'JDG.8.23', 'Gédéon refuse la royauté au profit du Seigneur')
both(3197, '1SA.10.1', 'Saül reçoit l’onction comme chef du peuple')
both(3197, 'DEU.17.14', 'La demande d’un roi comme les nations est rappelée')
both(3198, 'JHN.19.19', 'Pilate fait écrire le titre royal de Jésus')
both(3198, 'JHN.19.22', 'Pilate maintient ce qu’il a écrit')
both(3199, '1CO.11.3', 'Le Christ est présenté comme tête de l’homme')
both(3199, 'EPH.5.23', 'Le Christ est tête de l’Église, sens exact du passage malgré l’ancienne référence imprimée Éphésiens 5,21')
both(3200, 'JDG.12.7', 'Jephté juge Israël six ans')

// Ambassade, discours diplomatique, Esprit et itinéraire.
for (let n = 3202; n <= 3203; n++) com(n, ['JDG.11.12', 'JDG.11.13', 'JDG.11.14', 'JDG.11.27', 'JDG.11.28'], 'L’ambassade pacifique et le discours de Jephté au roi d’Ammon sont suivis et expliqués')
both(3202, 'ROM.12.18', 'Il faut vivre en paix avec tous autant qu’il dépend de soi')
both(3203, '2TI.2.19', 'Le Seigneur connaît ceux qui sont à lui')
for (let n = 3204; n <= 3208; n++) com(n, ['JDG.11.29'], 'L’Esprit du Seigneur sur Jephté et son passage par Galaad, Manassé et Maspha sont interprétés')
both(3207, '2CO.12.7', 'Une écharde empêche Paul de s’élever à cause de la grandeur des révélations')
nonBiblique(3207, 'philologie onomastique', 'Galaad, Manassé et Maspha reçoivent une interprétation spirituelle fondée sur leurs noms')

// Vœu, fille unique et figure nuptiale de l’Église.
for (let n = 3210; n <= 3213; n++) com(n, ['JDG.11.30', 'JDG.11.31', 'JDG.11.34', 'JDG.11.35'], 'Le vœu de Jephté, la venue de sa fille unique et la douleur du père sont commentés')
both(3209, 'JDG.11.30', 'Jephté fait un vœu au Seigneur')
both(3209, 'JDG.11.31', 'Jephté promet comme holocauste celui qui sortira de sa maison')
both(3214, 'EPH.5.31', 'L’homme quittera père et mère et s’attachera à son épouse')
both(3214, 'EPH.5.32', 'Le grand mystère est rapporté au Christ et à l’Église')
for (let n = 3215; n <= 3217; n++) com(n, ['JDG.11.34', 'JDG.11.35', 'JDG.11.37', 'JDG.11.39'], 'La fille vierge de Jephté devient figure de l’Église')
both(3216, 'MAT.9.20', 'La femme touche la frange du vêtement de Jésus')
both(3216, 'MAT.9.22', 'Jésus appelle la femme « ma fille » et loue sa foi')
both(3217, 'MAT.9.15', 'Les fils de l’époux ne peuvent jeûner tant que l’époux est avec eux')
both(3218, '2CO.11.2', 'L’Église est présentée au Christ comme une vierge chaste, sens exact malgré l’ancienne référence imprimée 2 Corinthiens 10,1-2')
both(3218, '1CO.15.54', 'La mort est engloutie dans la victoire')
both(3218, '1CO.15.24', 'Le Christ remet le royaume à Dieu le Père')

// Deux mois, six âges, deux Adam et commémoration annuelle.
for (let n = 3219; n <= 3222; n++) com(n, ['JDG.11.37', 'JDG.11.38', 'JDG.11.39'], 'Les deux mois accordés à la fille de Jephté sont interprétés comme soixante jours et six âges')
both(3221, 'MAT.6.12', 'La prière quotidienne demande le pardon des offenses')
add(3222, '1CO.15.21', 2, 'L’opposition entre la mort venue par un homme et la résurrection venue par un homme soutient les deux Adam.')
add(3222, '1CO.15.22', 2, 'Tous meurent en Adam et tous revivront dans le Christ.')
for (let n = 3223; n <= 3225; n++) com(n, ['JDG.11.39', 'JDG.11.40'], 'La commémoration annuelle de quatre jours pour la fille de Jephté est expliquée historiquement')

// Défaite d’Éphraïm et six années de judicature.
both(3226, 'JDG.12.4', 'Jephté rassemble Galaad et combat Éphraïm')
both(3226, 'JDG.12.6', 'Quarante-deux mille Éphraïmites périssent aux gués du Jourdain')
both(3226, 'LUK.19.27', 'Les ennemis du roi sont mis à mort devant lui')
com(3227, ['JDG.12.6', 'JDG.12.7'], 'Les quarante-deux mille morts et les six années de judicature sont rapportés aux six âges')

if (createHash('sha256').update(readFileSync(CHARTE)).digest('hex') !== CHARTE_HASH) throw Error('Charte modifiée depuis la préparation du lot')
for (const [path, hash] of PREUVES) if (createHash('sha256').update(readFileSync(path)).digest('hex') !== hash) throw Error(`Fac-similé modifié : ${path}`)
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).map(line => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: bruts, error: e0 } = await sb.from('segments').select('id,id_oeuvre,segment_numero,ref_niv1,ref_niv2,ref_niv2_texte,segment_texte,texte_original,notes,nature,liens_revus_le,liens_revus_par').eq('id_oeuvre', OEUVRE).gte('segment_numero', 3155).lte('segment_numero', 3233).order('segment_numero')
if (e0) throw e0
if (bruts.length !== 79 || bruts.some((s, i) => s.segment_numero !== 3155 + i)) throw Error('Contexte incomplet')
if (bruts.filter(s => s.segment_numero >= 3155 && s.segment_numero <= 3159).some(s => s.ref_niv2 !== QUESTION)) throw Error('Raccord amont invalide')
const aval = bruts.filter(s => s.segment_numero >= 3228)
if (aval.slice(0, 2).some(s => s.ref_niv2 !== 'Question L') || aval.slice(2).some(s => s.ref_niv2 !== 'Question LI')) throw Error('Raccord aval invalide')
const segments = bruts.filter(s => s.segment_numero >= DEBUT && s.segment_numero <= FIN)
if (segments.length !== TOTAL_SEGMENTS || segments.some((s, i) => s.segment_numero !== DEBUT + i) || segments.some(s => s.ref_niv1 !== REF_NIV1 || s.ref_niv2 !== QUESTION)) throw Error('Préétat structurel invalide')
if (segments.some(s => s.liens_revus_le || s.liens_revus_par)) throw Error('Lot déjà relu')
const empreinte = createHash('sha256').update(JSON.stringify(segments.map(s => [s.id, s.segment_numero, s.ref_niv1, s.ref_niv2, s.ref_niv2_texte, s.segment_texte, s.texte_original, s.notes, s.nature]))).digest('hex')
if (empreinte !== EMPREINTE_ATTENDUE) throw Error(`Empreinte inattendue : ${empreinte}`)
const parNumero = new Map(segments.map(s => [s.segment_numero, s]))
for (const c of CORRECTIONS_TEXTE) if (!parNumero.get(c.numero)?.segment_texte.includes(c.avant) || parNumero.get(c.numero).segment_texte.includes(c.apres)) throw Error(`Précondition texte ${c.numero}`)
for (const c of CORRECTIONS_NOTES) if (!parNumero.get(c.numero)?.notes?.includes(c.avant) || parNumero.get(c.numero).notes.includes(c.apres)) throw Error(`Précondition note ${c.numero}`)
const numerosClasses = new Set([...LIENS, ...NON_RESOLUS].map(l => l[0]))
const nonClasses = segments.filter(s => !numerosClasses.has(s.segment_numero) && !SANS_LIEN.has(s.segment_numero))
if (nonClasses.length) throw Error(`Segments non classés : ${nonClasses.map(s => s.segment_numero).join(', ')}`)
if (LIENS.some(([n, c, t, m]) => !parNumero.has(n) || !c || ![1, 2, 3, 4].includes(t) || !m.trim())) throw Error('Lien biblique invalide')
const cles = LIENS.map(([n, c, t]) => `${n}|${c}|${t}`)
if (new Set(cles).size !== cles.length) throw Error(`Doublon interne : ${cles.filter((c, i) => cles.indexOf(c) !== i).join(', ')}`)
const cibles = [...new Set(LIENS.map(([, c]) => c))]
const { data: versets, error: e1 } = await sb.from('versets_lecture').select('id_verset,TR0001,TR0003,TR0004').in('id_verset', cibles)
if (e1) throw e1
const parCible = new Map(versets.map(v => [v.id_verset, v]))
const absentes = cibles.filter(c => !parCible.has(c))
if (absentes.length) throw Error(`Cibles absentes : ${absentes.join(', ')}`)
const sansTemoin = cibles.filter(c => { const v = parCible.get(c); return !v.TR0001 && !v.TR0003 && !v.TR0004 })
if (sansTemoin.length) throw Error(`Cibles sans témoin : ${sansTemoin.join(', ')}`)
const ids = segments.map(s => s.id)
const [{ count: liensExistants, error: e2 }, { count: relusGlobaux, error: e3 }] = await Promise.all([
  sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  sb.from('segments').select('id', { count: 'exact', head: true }).eq('id_oeuvre', OEUVRE).not('liens_revus_le', 'is', null),
])
if (e2 || e3) throw e2 || e3
if (liensExistants) throw Error(`${liensExistants} liens préexistants`)
const candidatsPath = 'scripts/heptateuque/segmentation-candidate/segments-candidate.json'
const sourceMapPath = 'scripts/heptateuque/segmentation-candidate/source-map.json'
const candidats = JSON.parse(readFileSync(candidatsPath, 'utf8'))
const sourceMap = JSON.parse(readFileSync(sourceMapPath, 'utf8'))
for (const c of CORRECTIONS_TEXTE) {
  const candidat = candidats.find(s => s.segment_numero === c.numero)
  if (!candidat?.segment_texte.includes(c.avant) || candidat.segment_texte.includes(c.apres)) throw Error(`Candidat texte non synchronisable ${c.numero}`)
  candidat.segment_texte = candidat.segment_texte.replace(c.avant, c.apres)
  const sources = sourceMap.filter(s => s.first_segment_numero <= c.numero && s.last_segment_numero >= c.numero && s.source_clean?.includes(c.avant))
  if (sources.length !== 1) throw Error(`Source-map non synchronisable ${c.numero}: ${sources.length}`)
  sources[0].source_clean = sources[0].source_clean.replace(c.avant, c.apres)
}
for (const c of CORRECTIONS_NOTES) {
  const candidat = candidats.find(s => s.segment_numero === c.numero)
  if (!candidat?.notes?.includes(c.avant) || candidat.notes.includes(c.apres)) throw Error(`Candidat note non synchronisable ${c.numero}`)
  candidat.notes = candidat.notes.replace(c.avant, c.apres)
}
const total = LIENS.length + NON_RESOLUS.length
const types = LIENS.reduce((a, l) => { a[l[2]] = (a[l[2]] || 0) + 1; return a }, {})
for (const [, type] of NON_RESOLUS) types[type] = (types[type] || 0) + 1
const sondage = [3160, 3170, 3180, 3190, 3200, 3210, 3220, 3227]
if (sondage.some(n => !numerosClasses.has(n))) throw Error('Sondage invalide')
const pct = n => `${n} / 3262 = ${(100 * n / 3262).toFixed(2).replace('.', ',')} %`
console.log(JSON.stringify({ mode: WRITE ? 'écriture' : 'contrôle', lot: 'Juges XLIX-B', bornes: [DEBUT, FIN], segments: TOTAL_SEGMENTS, corrections_texte: CORRECTIONS_TEXTE.length, corrections_notes: CORRECTIONS_NOTES.length, liens: total, liens_bibliques: LIENS.length, sans_cible_a_constituer: NON_RESOLUS.length, cibles_distinctes: cibles.length, types, sondage, empreinte, sic: 'retrait au segment 3209 du sic numérique hérité et non conforme ; aucun ajout, aucune coquille orthographique imprimée certaine', anciennes_numerotations_arbitrees: ['Éphésiens 5,21 imprimé : cible sémantique EPH.5.23', 'Ib. XV OCR corrigé en Ib. 15, cible MAT.9.15', 'II Corinthiens X,1-2 imprimé : cible sémantique 2CO.11.2'], avancement_actuel: pct(relusGlobaux), avancement_apres_ecriture_ulterieure: pct(relusGlobaux + TOTAL_SEGMENTS) }, null, 2))
if (DETAIL) for (const [numero, canonId, type, motif] of LIENS) console.log({ numero, canonId, type, motif, segment: parNumero.get(numero).segment_texte, ...parCible.get(canonId) })
if (!WRITE) process.exit(0)

const horodatage = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
const sauvegardePath = `scripts/heptateuque/audit-reprise/sauvegarde-juges-q49-b-${horodatage}.json`
mkdirSync('scripts/heptateuque/audit-reprise', { recursive: true })
writeFileSync(sauvegardePath, `${JSON.stringify({ oeuvre: OEUVRE, bornes: [DEBUT, FIN], empreinte, segments, liens_existants: [] }, null, 2)}\n`, 'utf8')
const quote = value => `'${String(value).replaceAll("'", "''")}'`
const valeurs = [...LIENS.map(([n, c, t, m]) => `(${parNumero.get(n).id}, ${quote(c)}, ${t}, 'vérifié', ${quote(m)}, 'lecture', false)`), ...NON_RESOLUS.map(([n, t, m]) => `(${parNumero.get(n).id}, null, ${t}, 'à constituer', ${quote(m)}, 'lecture', true)`)].join(',\n    ')
const idsSql = ids.join(', ')
const correctionsTexteSql = CORRECTIONS_TEXTE.map(c => `update segments set segment_texte = replace(segment_texte, ${quote(c.avant)}, ${quote(c.apres)}) where id = ${parNumero.get(c.numero).id} and segment_texte like ${quote(`%${c.avant}%`)}; get diagnostics n = row_count; if n <> 1 then raise exception 'Correction texte ${c.numero}: %/1', n; end if;`).join('\n  ')
const correctionsNotesSql = CORRECTIONS_NOTES.map(c => `update segments set notes = replace(notes, ${quote(c.avant)}, ${quote(c.apres)}) where id = ${parNumero.get(c.numero).id} and notes like ${quote(`%${c.avant}%`)}; get diagnostics n = row_count; if n <> 1 then raise exception 'Correction note ${c.numero}: %/1', n; end if;`).join('\n  ')
const sql = `do $passe$ declare n integer; begin
  if exists (select 1 from liens_bibliques where segment_id in (${idsSql})) then raise exception 'Liens déjà présents'; end if;
  if exists (select 1 from segments where id in (${idsSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Marques déjà présentes'; end if;
  if (select count(*) from segments where id in (${idsSql}) and id_oeuvre = '${OEUVRE}' and ref_niv1 = ${quote(REF_NIV1)} and ref_niv2 = ${quote(QUESTION)} and segment_numero between ${DEBUT} and ${FIN}) <> ${TOTAL_SEGMENTS} then raise exception 'Préconditions structurelles invalides'; end if;
  ${correctionsTexteSql}
  ${correctionsNotesSql}
  insert into liens_bibliques (segment_id, canon_id, type, fiabilite, motif, provenance, arbitrage_requis) values ${valeurs};
  get diagnostics n = row_count; if n <> ${total} then raise exception 'Liens %/${total}', n; end if;
  update segments set liens_revus_le = now(), liens_revus_par = ${quote(RELECTEUR)} where id in (${idsSql});
  get diagnostics n = row_count; if n <> ${TOTAL_SEGMENTS} then raise exception 'Segments %/${TOTAL_SEGMENTS}', n; end if;
end $passe$;`
const { error: ecritureErreur } = await sb.rpc('exec_sql', { sql })
if (ecritureErreur) throw ecritureErreur
const [{ count: liensApres, error: e4 }, { count: relusApres, error: e5 }, { data: audit, error: e6 }, { data: etatApres, error: e7 }] = await Promise.all([
  sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  sb.from('segments').select('id', { count: 'exact', head: true }).in('id', ids).not('liens_revus_le', 'is', null),
  sb.from('liens_bibliques').select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id', ids),
  sb.from('segments').select('segment_numero,segment_texte,notes').in('id', ids),
])
if (e4 || e5 || e6 || e7) throw e4 || e5 || e6 || e7
const post = new Map(etatApres.map(s => [s.segment_numero, s]))
if (liensApres !== total || relusApres !== TOTAL_SEGMENTS || CORRECTIONS_TEXTE.some(c => post.get(c.numero).segment_texte.includes(c.avant) || !post.get(c.numero).segment_texte.includes(c.apres)) || CORRECTIONS_NOTES.some(c => post.get(c.numero).notes.includes(c.avant) || !post.get(c.numero).notes.includes(c.apres)) || audit.some(l => !l.motif || l.provenance !== 'lecture' || (l.canon_id ? l.fiabilite !== 'vérifié' || l.arbitrage_requis : l.fiabilite !== 'à constituer' || !l.arbitrage_requis || l.type !== 4))) throw Error('Postcontrôle invalide')
writeFileSync(candidatsPath, `${JSON.stringify(candidats, null, 2)}\n`, 'utf8')
writeFileSync(sourceMapPath, `${JSON.stringify(sourceMap, null, 2)}\n`, 'utf8')
console.log(`✓ ${liensApres} liens, ${relusApres} segments, sauvegarde ${sauvegardePath}`)
