import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre quatrième'
const PREMIER = 2295
const DERNIER = 2351
const NB_SEGMENTS = 57
const WRITE = process.argv.includes('--write')
const DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Nombres Q. LI-LX'
const EMPREINTE_ATTENDUE = '25d8d30bbfbe43ba6795aee707f4cecbe2a7779408927304a6ff3c51e03d001a'
const CHARTE_HASH = '47893c044ebab26e78149548c129fb9de3b72dde1e37c3371b60a1786240c198'
const QUESTIONS = ['Question LI', 'Question LII', 'Question LIII', 'Question LIV', 'Question LV', 'Question LVI', 'Question LVII', 'Question LVIII', 'Question LIX', 'Question LX']
const PREUVES = [
  ['scripts/heptateuque/img/p532.jpg', 'afe4f0f3468308483eb668a20629d73d78e746dd6fad7d5ad41cfcf9d3988585', 'Page imprimée 524, ouverture du lot et Question LI.'],
  ['scripts/heptateuque/img/p533.jpg', 'd498ae91a006544984839d08d77c3b05566124776d3718ec85381095a568cc3a', 'Page imprimée 525, Questions LII à LIV.'],
  ['scripts/heptateuque/img/p534.jpg', '1b01dd4a119544403bfba47710edb5fba4d7bd25326d639f0a519c61acf55df8', 'Page imprimée 526 : « devenue illicite » au segment 2321.'],
  ['scripts/heptateuque/img/p535.jpg', 'af37963dca4e80ad67e16232b97eb0641494eaa6c5dd559ae12e489a062cb23e', 'Page imprimée 527 : « les vœux précités » au segment 2345.'],
  ['scripts/heptateuque/img/p536.jpg', 'e0969cabd022c4234a9dbad011ac595928704551c2f55a5b7cd0474230f24451', 'Page imprimée 528, fin du lot et raccord avec la Question LXI.'],
]
const CORRECTIONS_TEXTE = new Map([
  [2321, ['mais devenu illicite', 'mais devenue illicite']],
  [2345, ['les veaux précités', 'les vœux précités']],
])

const LIENS = []
const add = (n, canonId, type, motif) => LIENS.push([n, canonId, type, motif])
const both = (n, canonId, motif) => {
  add(n, canonId, 1, `${motif} — citation ou référence intentionnelle.`)
  add(n, canonId, 3, `${motif} — passage commenté ou mobilisé dans le raisonnement.`)
}
const explain = (n, canonIds, motif) => { for (const canonId of canonIds) add(n, canonId, 3, `${motif} (${canonId}).`) }
const SANS_CIBLE = []
const nonBiblique = (n, genre, motif) => SANS_CIBLE.push([n, 4, `RÉFÉRENCE NON BIBLIQUE (${genre}) : ${motif}`])

// Question LI — factus est pour factum est ut.
both(2295, 'NUM.24.2', 'L’Esprit de Dieu fut sur Balaam ; la rubrique ancienne Nombres 23,5 ne correspond pas au contenu des témoins locaux')
explain(2296, ['NUM.24.2'], 'La construction factus est est expliquée par des emplois bibliques parallèles.')
both(2296, 'JHN.1.30', 'Celui qui vient après Jean a été fait avant lui parce qu’il était avant lui')
explain(2297, ['NUM.24.2'], 'Deux psaumes illustrent la même valeur de la tournure factus est.')
both(2297, 'PSA.29.11', 'Le Seigneur est devenu le secours du psalmiste')
both(2297, 'PSA.9.10', 'Le Seigneur est devenu le refuge du pauvre ou des pécheurs')
explain(2298, ['NUM.24.2'], 'La main du Seigneur faite sur le prophète fournit un dernier parallèle grammatical.')
both(2298, 'EZK.1.3', 'La main du Seigneur fut sur Ézéchiel près du Chobar')
both(2298, 'EZK.3.22', 'La main du Seigneur fut de nouveau sur Ézéchiel dans la plaine')

// Question LII — idolâtrie, fornication et zèle de Phinées.
both(2299, 'NUM.25.4', 'Dieu ordonne de prendre les chefs du peuple et de les exposer devant lui à la face du soleil')
explain(2300, ['NUM.25.1', 'NUM.25.2', 'NUM.25.3', 'NUM.25.4'], 'La fornication avec les filles de Moab et l’idolâtrie de Béelphégor provoquent la colère et l’ordre d’exposition.')
explain(2301, ['NUM.25.4'], 'Le verbe grec de l’exposition est interprété comme un supplice exemplaire en plein jour.')
nonBiblique(2301, 'tradition textuelle', 'le texte grec porte παραδειγμάτισον, expliqué par « donne en exemple »')
explain(2302, ['NUM.25.4'], 'Les versions grecques anciennes sont confrontées sur le verbe pendre ou attacher en haut.')
nonBiblique(2302, 'traduction', 'Symmaque traduit le verbe par « attache en haut »')
nonBiblique(2302, 'traduction', 'Aquila traduit plus expressément le verbe par « pends »')
both(2303, 'NUM.25.7', 'Phinées se lève et prend son arme en voyant les coupables')
both(2303, 'NUM.25.8', 'Phinées transperce les deux coupables et la plaie cesse')
both(2303, 'NUM.25.11', 'Le zèle de Phinées détourne la colère divine d’Israël')
both(2304, 'NUM.25.4', 'La promesse que la colère se retirera si les chefs sont exposés est reprise textuellement')
explain(2305, ['NUM.25.4', 'NUM.25.7', 'NUM.25.8', 'NUM.25.11'], 'L’apaisement promis après l’exposition est confronté à celui que produit l’acte de Phinées.')
both(2306, 'NUM.25.5', 'Moïse ordonne aux juges de mettre à mort ceux de leurs proches qui se sont attachés à Béelphégor')
both(2306, 'NUM.25.7', 'Phinées accomplit son acte au moment de l’exécution des ordres')
both(2306, 'NUM.25.8', 'L’acte de Phinées fait cesser la plaie')
explain(2306, ['NUM.25.4'], 'L’apaisement obtenu aurait dispensé de livrer les chefs au supplice.')
explain(2307, ['NUM.25.1', 'NUM.25.2', 'NUM.25.3', 'NUM.25.4', 'NUM.25.5', 'NUM.25.7', 'NUM.25.8'], 'La sévérité de tout l’épisode manifeste la gravité de la fornication et de l’idolâtrie.')

// Question LIII — Moïse, Aaron et Josué comme figures.
both(2308, 'NUM.27.13', 'Moïse doit rejoindre son peuple comme Aaron son frère')
both(2308, 'NUM.27.14', 'Moïse et Aaron n’ont pas sanctifié Dieu aux eaux de contradiction')
both(2308, 'NUM.20.12', 'La sentence initiale interdit à Moïse et Aaron de faire entrer le peuple dans la terre')
nonBiblique(2308, 'renvoi interne', 'renvoi explicite à la Question XIX du même livre')
explain(2309, ['NUM.27.13', 'NUM.27.14'], 'Ni le sacerdoce d’Aaron ni la Loi de Moïse n’introduisent dans l’héritage, mais Josué, figure de Jésus et de la grâce.')
add(2309, 'JHN.1.17', 2, 'La distinction entre la Loi donnée par Moïse et la grâce venue par Jésus-Christ structure la typologie.')
both(2310, 'NUM.20.24', 'Aaron rejoint son peuple avant l’entrée d’Israël dans la terre')
explain(2310, ['NUM.21.24', 'NUM.21.35'], 'Du vivant de Moïse, Israël prend possession du pays des rois amoréens.')
explain(2310, ['NUM.27.12', 'NUM.27.13', 'NUM.27.14'], 'Moïse voit le pays mais doit mourir avant de franchir le Jourdain.')
explain(2311, ['NUM.27.13', 'NUM.27.14'], 'La permanence partielle de la Loi et la disparition du sacerdoce lévitique prolongent la lecture figurative de leur mort.')
both(2312, 'NUM.27.13', 'Moïse doit rejoindre son peuple')
both(2312, 'NUM.20.24', 'Aaron doit pareillement rejoindre son peuple')
explain(2313, ['NUM.27.13', 'NUM.27.14', 'NUM.20.24'], 'La mort et les fonctions des deux frères sont comprises comme symboles, non comme exclusion de la paix des saints.')

// Questions LIV et LV — consécration et gloire de Josué.
both(2314, 'NUM.27.18', 'Dieu ordonne de prendre Josué, homme en qui réside l’Esprit, et de lui imposer la main')
both(2314, 'NUM.27.19', 'Josué est placé devant Éléazar et toute l’assemblée')
both(2314, 'NUM.27.20', 'Moïse donne à Josué ses préceptes et une part de sa gloire')
explain(2315, ['NUM.27.18'], 'L’Esprit possédé par Josué est identifié à l’Esprit Saint.')
explain(2316, ['NUM.27.18', 'NUM.27.19'], 'L’imposition des mains montre que la richesse de la grâce ne dispense pas des sacrements de consécration.')
both(2317, 'NUM.27.20', 'Moïse doit donner à Josué une part de sa gloire')
nonBiblique(2317, 'traduction', 'plusieurs interprètes latins traduisent « tu lui donneras ta gloire » au lieu de « de ta gloire »')
for (const n of [2318, 2319]) explain(n, ['NUM.27.20'], 'Josué est associé sans diminution à la gloire de Moïse.')

// Questions LVI à LVIII — vœux de l’homme et de la jeune fille.
both(2320, 'NUM.30.3', 'L’homme qui fait un vœu ou un serment doit accomplir tout ce qui est sorti de sa bouche')
explain(2321, ['NUM.30.3'], 'Le vœu rend illicite pour son auteur une abstention portant sur une chose permise par la Loi.')
both(2322, 'NUM.30.4', 'Une jeune fille dans la maison paternelle fait un vœu ou prend un engagement')
both(2322, 'NUM.30.5', 'Le silence du père ratifie les vœux et engagements de sa fille')
both(2323, 'NUM.30.6', 'L’opposition immédiate du père annule les vœux et le Seigneur pardonne à la fille')
explain(2324, ['NUM.30.4', 'NUM.30.5', 'NUM.30.6'], 'La femme encore jeune dans la maison de son père est interprétée à propos du vœu de virginité.')
both(2324, '1CO.7.37', 'L’Apôtre parle de celui qui conserve sa vierge')
both(2324, '1CO.7.38', 'L’Apôtre compare celui qui marie sa vierge et celui qui ne la marie pas')
nonBiblique(2324, 'traduction', 'plusieurs interprètes prennent « vierge » au sens abstrait de « virginité »')
explain(2325, ['NUM.30.4', 'NUM.30.5', 'NUM.30.6'], 'L’engagement contre son âme est expliqué comme abstention contre la délectation animale.')
both(2325, 'NUM.29.7', 'L’ordre d’affliger les âmes désigne le jeûne')
both(2326, 'NUM.30.6', 'Le Seigneur purifiera ou pardonnera à la fille dont le père annule le vœu')
explain(2327, ['NUM.30.6'], 'Purifier est expliqué au sens de déclarer pur ou pardonner.')
both(2327, 'EXO.20.7', 'La formule grecque ancienne « tu ne purifieras pas le coupable » correspond au commandement de ne pas tenir innocent celui qui prend le nom divin en vain')

// Question LIX — vœux des femmes mariées, veuves ou répudiées.
both(2328, 'NUM.30.7', 'Une femme se marie alors que des vœux et engagements pèsent sur elle')
both(2328, 'NUM.30.8', 'Le silence du mari le jour où il apprend les vœux les laisse subsister')
both(2329, 'NUM.30.9', 'Le désaveu immédiat du mari annule les vœux et le Seigneur pardonne à la femme')
for (const n of [2330, 2331]) explain(n, ['NUM.30.7', 'NUM.30.8', 'NUM.30.9'], 'L’autorité successive du père puis du mari détermine la validité des vœux antérieurs au mariage.')
both(2332, 'NUM.30.10', 'Les vœux de la veuve et de la femme répudiée demeurent obligatoires')
explain(2333, ['NUM.30.11'], 'Le texte passe ensuite au vœu fait par une femme dans la maison de son mari.')
both(2334, 'NUM.30.11', 'La femme mariée fait dans la maison de son mari un vœu ou une promesse avec serment')
both(2334, 'NUM.30.12', 'Le silence du mari laisse subsister les vœux et engagements')
both(2335, 'NUM.30.13', 'Le rejet immédiat du mari annule les vœux et le Seigneur pardonne à la femme')
both(2336, 'NUM.30.14', 'Le mari peut ratifier ou rejeter les vœux et serments qui affligent l’âme')
both(2336, 'NUM.30.15', 'Le silence gardé de jour en jour ratifie les engagements connus')
both(2337, 'NUM.30.16', 'Le mari qui annule tardivement les engagements porte l’iniquité de sa femme')
explain(2338, ['NUM.30.14', 'NUM.30.15', 'NUM.30.16'], 'L’obéissance de la femme demeure, tandis que le mari porte le péché de son revirement tardif.')
explain(2339, ['NUM.30.16'], 'Le retrait tardif de l’autorisation fait retomber le péché sur le mari sans autoriser la désobéissance.')
explain(2340, ['NUM.30.14'], 'La question demande si les vœux qui affligent l’âme comprennent l’abstinence du devoir conjugal.')
both(2341, 'MAT.6.25', 'La note imprimée Matthieu 6,26 correspond sémantiquement au verset local 6,25 : la vie ou l’âme est plus que la nourriture')
both(2341, 'NUM.29.7', 'L’ordre d’affliger les âmes est cité comme prescription du jeûne')
explain(2342, ['NUM.30.14'], 'Pour ces vœux, la Loi donne au mari le pouvoir de ratifier ou d’annuler.')
both(2343, '1CO.7.3', 'Le mari et la femme doivent mutuellement se rendre le devoir conjugal')
both(2344, '1CO.7.4', 'Les époux exercent une autorité réciproque sur le corps de l’autre')
explain(2345, ['1CO.7.3', '1CO.7.4', 'NUM.30.14'], 'L’égalité conjugale enseignée par l’Apôtre distingue le devoir conjugal des vœux soumis principalement au mari.')
explain(2346, ['NUM.30.14'], 'La dissymétrie de la loi des vœux ne peut régir la décision conjugale commune.')
add(2346, '1CO.7.5', 2, 'L’abstinence conjugale décidée d’un commun accord éclaire la volonté concertée des époux.')
both(2347, 'EXO.21.6', 'L’obligation de percer l’oreille de l’esclave est citée comme justification ancienne non observée à la lettre')
explain(2347, ['NUM.30.17'], 'Les lois entre mari et femme, père et fille, sont dites justifications et reçoivent un sens figuré.')
for (const n of [2348, 2349]) explain(n, ['NUM.30.14', 'NUM.30.17'], 'La raison, figurée par le mari, doit approuver ou rejeter les abstinences et gouverner les mouvements du corps.')

// Question LX — la force accompagnant les combattants.
both(2350, 'NUM.31.5', 'Mille combattants sont levés dans chaque tribu, soit douze mille hommes')
both(2350, 'NUM.31.6', 'Moïse envoie au combat mille hommes de chaque tribu avec ce que la version grecque appelle leur force')
for (const n of [2351]) explain(n, ['NUM.31.5', 'NUM.31.6'], 'La force des Israélites est comprise comme ce qui soutient et entretient leurs forces.')

const SANS_LIEN = new Set()
const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')
if (sha256('charte/CHARTE_IA.md') !== CHARTE_HASH) throw new Error('Charte modifiée : relire avant toute exécution')
for (const [path, hash] of PREUVES) if (sha256(path) !== hash) throw new Error(`Preuve fac-similé modifiée : ${path}`)
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: segments, error } = await sb.from('segments').select('id,segment_numero,segment_texte,notes,ref_niv1,ref_niv2,ref_niv2_texte,liens_revus_le,liens_revus_par').eq('id_oeuvre', OEUVRE).eq('ref_niv1', REF_NIV1).in('ref_niv2', QUESTIONS).order('segment_numero')
if (error) throw error
if (segments.length !== NB_SEGMENTS || segments.some((s, i) => s.segment_numero !== PREMIER + i)) throw new Error('Préétat : bornes ou continuité invalides')
if ([...new Set(segments.map((s) => s.ref_niv2))].join('|') !== QUESTIONS.join('|')) throw new Error('Questions incomplètes ou désordonnées')
if (segments.some((s) => s.ref_niv1 !== REF_NIV1 || s.liens_revus_le || s.liens_revus_par)) throw new Error('Préétat structurel ou relecture invalide')
for (const [n, [avant]] of CORRECTIONS_TEXTE) if (!segments.find((s) => s.segment_numero === n)?.segment_texte.includes(avant)) throw new Error(`Précondition de correction invalide au segment ${n}`)
const empreinte = createHash('sha256').update(JSON.stringify(segments.map((s) => [s.id, s.segment_numero, s.ref_niv1, s.ref_niv2, s.ref_niv2_texte, s.segment_texte, s.notes]))).digest('hex')
if (empreinte !== EMPREINTE_ATTENDUE) throw new Error(`Préétat modifié : ${empreinte}`)
const parNumero = new Map(segments.map((s) => [s.segment_numero, s]))
const numerosClasses = new Set([...LIENS, ...SANS_CIBLE].map(([n]) => n))
const nonClasses = segments.filter((s) => !numerosClasses.has(s.segment_numero) && !SANS_LIEN.has(s.segment_numero))
if (nonClasses.length) throw new Error(`Partition incomplète : ${nonClasses.map((s) => s.segment_numero)}`)
if ([...SANS_LIEN].some((n) => numerosClasses.has(n) || !parNumero.has(n))) throw new Error('Déclaration SANS_LIEN invalide')
if (LIENS.some(([n, c, t, m]) => !parNumero.has(n) || !c || ![1, 2, 3, 4].includes(t) || !m.trim())) throw new Error('Manifeste biblique invalide')
if (SANS_CIBLE.some(([n, t, m]) => !parNumero.has(n) || t !== 4 || !m.startsWith('RÉFÉRENCE NON BIBLIQUE'))) throw new Error('Référence sans cible invalide')
const cles = LIENS.map(([n, c, t]) => `${n}|${c}|${t}`)
if (new Set(cles).size !== cles.length) throw new Error('Doublon interne')
const cibles = [...new Set(LIENS.map(([, c]) => c))]
const { data: temoins, error: temoinsError } = await sb.from('versets_lecture').select('id_verset,"TR0001","TR0003","TR0004"').in('id_verset', cibles)
if (temoinsError) throw temoinsError
const temoinsParId = new Map(temoins.map((t) => [t.id_verset, t]))
const ciblesInvalides = cibles.filter((c) => { const t = temoinsParId.get(c); return !t || (!t.TR0001 && !t.TR0003 && !t.TR0004) })
if (ciblesInvalides.length) throw new Error(`Cibles invalides : ${ciblesInvalides.join(', ')}`)
const ids = segments.map((s) => s.id)
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
for (const [n, [avant, apres]] of CORRECTIONS_TEXTE) {
  const candidat = candidats.find((x) => x.segment_numero === n)
  if (!candidat?.segment_texte.includes(avant)) throw new Error(`Candidat non synchronisable au segment ${n}`)
  candidat.segment_texte = candidat.segment_texte.replace(avant, apres)
  const sources = sourceMap.filter((x) => x.first_segment_numero <= n && x.last_segment_numero >= n && x.source_clean?.includes(avant))
  if (sources.length !== 1) throw new Error(`Source-map non synchronisable au segment ${n} : ${sources.length}`)
  sources[0].source_clean = sources[0].source_clean.replace(avant, apres)
}
const TOTAL = LIENS.length + SANS_CIBLE.length
const types = LIENS.reduce((o, [, , t]) => { o[t] = (o[t] ?? 0) + 1; return o }, {})
for (const [, t] of SANS_CIBLE) types[t] = (types[t] ?? 0) + 1
const liensParQuestion = Object.fromEntries(QUESTIONS.map((q) => {
  const nums = new Set(segments.filter((s) => s.ref_niv2 === q).map((s) => s.segment_numero))
  return [q, [...LIENS, ...SANS_CIBLE].filter(([n]) => nums.has(n)).length]
}))
const pct = (n) => `${n} / 3262 = ${(100 * n / 3262).toFixed(2).replace('.', ',')} %`
console.log(JSON.stringify({ mode: WRITE ? 'écriture' : 'contrôle', lot: 'Nombres LI-LX', bornes: [PREMIER, DERNIER], segments: NB_SEGMENTS, corrections_ocr: CORRECTIONS_TEXTE.size, sic_confirmes: 0, liens_bibliques: LIENS.length, references_non_bibliques: SANS_CIBLE.length, total_liens: TOTAL, sans_lien: [...SANS_LIEN], cibles_distinctes: cibles.length, types, liens_par_question: liensParQuestion, empreinte, charte_hash: CHARTE_HASH, avancement_actuel: pct(relusGlobaux), avancement_potentiel_apres_ecriture: pct(relusGlobaux + NB_SEGMENTS) }, null, 2))
if (DETAIL) for (const [n, c, t, motif] of LIENS) { const temoin = temoinsParId.get(c); console.log({ n, c, t, motif, segment: parNumero.get(n).segment_texte, temoin: temoin.TR0003 || temoin.TR0001 || temoin.TR0004 }) }
if (!WRITE) process.exit(0)

const horodatage = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
const sauvegardePath = `scripts/heptateuque/audit-reprise/sauvegarde-nombres-q51-q60-${horodatage}.json`
mkdirSync('scripts/heptateuque/audit-reprise', { recursive: true })
writeFileSync(sauvegardePath, `${JSON.stringify({ oeuvre: OEUVRE, bornes: [PREMIER, DERNIER], empreinte, segments, liens_existants: [] }, null, 2)}\n`, 'utf8')
const quote = (v) => `'${String(v).replaceAll("'", "''")}'`
const valeurs = [...LIENS.map(([n, c, t, m]) => `(${parNumero.get(n).id}, ${quote(c)}, ${t}, 'vérifié', ${quote(m)}, 'lecture', false)`), ...SANS_CIBLE.map(([n, t, m]) => `(${parNumero.get(n).id}, null, ${t}, 'à constituer', ${quote(m)}, 'lecture', true)`)].join(',\n    ')
const idSql = ids.join(', ')
const correctionsSql = [...CORRECTIONS_TEXTE].map(([n, [avant, apres]]) => `update segments set segment_texte = replace(segment_texte, ${quote(avant)}, ${quote(apres)}) where id = ${parNumero.get(n).id} and segment_texte like ${quote(`%${avant}%`)};
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Correction OCR segment ${n}: %/1', n; end if;`).join('\n  ')
const sql = `do $p$
declare n integer;
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
const textesParNumero = new Map(textesApres.map((s) => [s.segment_numero, s.segment_texte]))
const correctionInvalide = [...CORRECTIONS_TEXTE].some(([n, [avant, apres]]) => textesParNumero.get(n).includes(avant) || !textesParNumero.get(n).includes(apres))
if (liensApres !== TOTAL || relusApres !== NB_SEGMENTS || correctionInvalide || audit.some((l) => !l.motif || l.provenance !== 'lecture' || (l.canon_id ? (l.fiabilite !== 'vérifié' || l.arbitrage_requis) : (l.fiabilite !== 'à constituer' || !l.arbitrage_requis || l.type !== 4)))) throw new Error('Postcontrôle invalide')
const clesApres = audit.map((l) => `${l.segment_id}|${l.canon_id ?? 'sans-cible'}|${l.type}|${l.motif}`)
if (new Set(clesApres).size !== clesApres.length) throw new Error('Doublon dans le postétat')
writeFileSync(candidatsPath, `${JSON.stringify(candidats, null, 2)}\n`, 'utf8')
writeFileSync(sourceMapPath, `${JSON.stringify(sourceMap, null, 2)}\n`, 'utf8')
console.log(`✓ ${liensApres} liens ; ${relusApres} segments relus ; sauvegarde ${sauvegardePath}`)
