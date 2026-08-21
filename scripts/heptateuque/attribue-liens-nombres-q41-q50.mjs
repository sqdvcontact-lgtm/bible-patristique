import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023', REF_NIV1 = 'Livre quatrième'
const PREMIER = 2240, DERNIER = 2294, NB_SEGMENTS = 55
const WRITE = process.argv.includes('--write'), DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Nombres Q. XLI-L'
const EMPREINTE_ATTENDUE = '8d26075b50719e18bd173398a0bd0f0276aef810a27e1f2b4027366df535137d'
const QUESTIONS = ['Question XLI', 'Question XLII', 'Question XLIII', 'Question XLIV', 'Question XLV', 'Question XLVI', 'Question XLVII', 'Question XLVIII', 'Question XLIX', 'Question L']
const PREUVES = [
  ['scripts/heptateuque/img/p529.jpg', '5df79c8d8686ac623aa3f38c2a078dffe1863c24d6e42fe4440d656de99731af'],
  ['scripts/heptateuque/img/p530.jpg', '80ad3830ed776aea438eae8c0b45fd430f024b276a58d9b8a3a22b4a01db4000'],
  ['scripts/heptateuque/img/p531.jpg', '2f06c23c8465d814424ed1c6a8c3f846e29aa6fb9919582969b8fce551d354f6'],
  ['scripts/heptateuque/img/p532.jpg', 'afe4f0f3468308483eb668a20629d73d78e746dd6fad7d5ad41cfcf9d3988585'],
]
const CORRECTIONS_NOTES = new Map([[2278, ['[[599]] II Pierre, II, 15.', '[[599]] II Pierre, II, 16.']]])
const LIENS = [], SANS_CIBLE = [], SANS_LIEN = new Set()
const add = (ns, c, t, m) => { for (const n of ns) LIENS.push([n, c, t, m]) }
const cite = (n, c, m) => add([n], c, 1, m)
const fondu = (n, c, m) => add([n], c, 2, m)
const com = (ns, c, m) => add(ns, c, 3, m)
const allusion = (ns, c, m) => add(ns, c, 4, m)
const nonBiblique = (n, genre, m) => SANS_CIBLE.push([n, 4, `RÉFÉRENCE NON BIBLIQUE (${genre}) : ${m}`])

// XLI — sens de l’anathème.
cite(2240, 'NUM.21.3', 'Citation explicite d’Israël vouant à l’anathème le peuple et ses villes, et du nom donné au lieu.')
com([2240, 2241], 'NUM.21.3', 'La destruction totale impliquée par l’anathème et l’étymologie grecque du terme sont expliquées.')

// XLII — le livre non canonique des Guerres du Seigneur.
cite(2242, 'NUM.21.13', 'Citation explicite du camp établi au-delà de l’Arnon, frontière entre Moab et les Amorrhéens.')
com([2242], 'NUM.21.13', 'La frontière de l’Arnon introduit la citation ancienne dont l’autorité est ensuite discutée.')
cite(2243, 'NUM.21.14', 'Citation explicite de l’introduction et du premier membre du fragment tiré du livre des Guerres du Seigneur.')
cite(2243, 'NUM.21.15', 'Citation explicite de la suite du fragment sur les torrents de l’Arnon et la frontière de Moab.')
for (const n of [2243, 2244, 2245, 2246, 2247, 2248]) {
  com([n], 'NUM.21.14', 'Le livre des Guerres du Seigneur, extérieur au canon, et la portée de son témoignage sont examinés à partir du fragment cité.')
  com([n], 'NUM.21.15', 'Le fragment sur les torrents et les villes frontalières est interprété sans conférer une autorité canonique à son livre d’origine.')
}
nonBiblique(2243, 'écrit hors canon', 'livre des Guerres du Seigneur, cité par Nombres 21,14-15 mais absent du canon conservé')
nonBiblique(2244, 'écrits hors canon', 'livres apocryphes proposés sous des noms patriarcaux ou prophétiques et distingués du livre anonyme ici cité')
nonBiblique(2245, 'écrits hors canon', 'livres anciens des Chaldéens, des Égyptiens ou d’autres nations susceptibles d’avoir conservé le récit')
cite(2246, 'TIT.1.12', 'Référence explicite au prophète crétois dont Paul cite le témoignage sans canoniser son œuvre entière.')
cite(2246, 'ACT.17.28', 'Citation explicite du poète grec : en Dieu nous avons la vie, le mouvement et l’être.')
com([2246, 2247], 'TIT.1.12', 'Le témoignage vrai d’un auteur profane peut être repris par l’Écriture sans valider tout son livre.')
com([2246, 2247], 'ACT.17.28', 'La citation athénienne d’un poète grec illustre la liberté divine de prendre un témoignage vrai hors du canon.')
nonBiblique(2246, 'auteur profane', 'le prophète crétois cité par Paul, traditionnellement identifié à Épiménide')
nonBiblique(2246, 'auteurs profanes', 'poètes et philosophes grecs, dont l’un est cité dans le discours aux Athéniens')
nonBiblique(2248, 'écrit hors canon', 'livre national anonyme dont Nombres reprend le fragment sur la guerre du Seigneur')

// XLIII — le puits annoncé sans récit antérieur conservé.
cite(2249, 'NUM.21.16', 'Citation explicite de l’ordre divin de rassembler le peuple au puits pour lui donner de l’eau.')
com([2249, 2250], 'NUM.21.16', 'L’allusion apparente à un récit antérieur absent est expliquée par la plainte du peuple et la découverte de l’eau en ce lieu.')

// XLIV — conquête juste du pays de Séhon et contraste avec Édom.
cite(2251, 'NUM.21.24', 'Citation explicite de la victoire d’Israël et de la prise du pays de Séhon depuis l’Arnon jusqu’au Jaboc.')
cite(2251, 'NUM.21.25', 'Citation explicite de la prise des villes amoréennes et de l’installation d’Israël à Hésebon.')
com([2251, 2252, 2253], 'NUM.21.24', 'La conquête guerrière du territoire amoréen est jugée licite parce que le passage pacifique avait été refusé.')
com([2251, 2252], 'NUM.21.25', 'La conservation des villes et du butin montre qu’elles n’avaient pas été vouées à l’anathème.')
com([2253], 'NUM.21.22', 'La demande d’un passage inoffensif par la route royale fonde l’argument du droit des nations.')
com([2253], 'NUM.21.23', 'Le refus de Séhon et son attaque contre Israël expliquent le caractère défensif de la guerre.')
cite(2254, 'NUM.20.21', 'Référence explicite au refus d’Édom et au détour d’Israël, sans guerre contre les descendants d’Ésaü.')
com([2254], 'NUM.21.24', 'La conquête promise du territoire amoréen est opposée au respect du territoire d’Édom.')

// XLV — poètes nommés inventeurs d’énigmes.
cite(2255, 'NUM.21.27', 'Citation explicite de l’introduction du chant par ceux qui proposent des énigmes, puis de l’appel à venir à Hésebon.')
for (const n of [2255, 2256]) for (const v of [27, 28, 29, 30]) com([n], `NUM.21.${v}`, 'Le poème sur la victoire de Séhon et la défaite de Moab sert à identifier les inventeurs d’énigmes comme poètes.')
com([2257], 'NUM.21.27', 'La nécessité d’une expression figurée pour former une énigme conclut l’explication du nom donné aux poètes.')
nonBiblique(2255, 'auteurs profanes', 'poètes anciens anonymes introduits dans le texte biblique comme ceux qui proposent des énigmes')
nonBiblique(2256, 'auteurs profanes', 'auteurs anonymes de l’hymne sur la guerre des Amorrhéens contre Moab et la victoire de Séhon')

// XLVI — distinction des Moabites et des Madianites.
com([2258, 2259], 'NUM.22.2', 'La survie du royaume moabite après la victoire de Séhon est déduite de la présence de Balac.')
com([2258], 'NUM.22.5', 'L’envoi de messagers à Balaam pour l’appeler à maudire Israël est rappelé comme cadre du récit.')
com([2258], 'NUM.22.6', 'La demande faite à Balaam de maudire Israël est explicitement résumée.')
cite(2259, 'NUM.22.4', 'Citation explicite de Moab avertissant les anciens de Madian que le peuple va dévorer les alentours.')
com([2259, 2260], 'NUM.22.4', 'Moab et Madian sont expliqués comme deux peuples voisins associés contre un danger commun.')
cite(2260, 'GEN.19.37', 'Référence explicite à la naissance de Moab, fils de Lot et de sa fille aînée.')
cite(2260, 'GEN.25.2', 'Référence explicite à la naissance de Madian, fils d’Abraham et de Céthura.')

// XLVII — divinations et révélations accordées au pervers Balaam.
cite(2261, 'NUM.22.7', 'Citation explicite des anciens portant dans leurs mains le salaire ou les instruments de divination destinés à Balaam.')
com([2261, 2262], 'NUM.22.7', 'Les divinations dans les mains des envoyés sont interprétées comme salaire ou instruments rituels du devin.')
cite(2263, 'NUM.22.9', 'Citation explicite de Dieu venant à Balaam et lui demandant quels hommes se trouvent auprès de lui.')
com([2263, 2264, 2265, 2267], 'NUM.22.9', 'La venue nocturne de Dieu auprès d’un homme pervers est examinée comme révélation possible, même hors d’un songe explicite.')
cite(2264, 'NUM.22.13', 'Référence explicite à Balaam se levant le matin, indice que la révélation eut lieu pendant la nuit.')
allusion([2266], 'LUK.12.16', 'La parabole du riche dont les terres avaient beaucoup rapporté fournit un cas analogue de parole divine à un réprouvé.')
allusion([2266], 'LUK.12.18', 'Le riche projetant de détruire ses greniers et d’en bâtir de plus grands est explicitement rappelé.')
cite(2266, 'LUK.12.20', 'Citation explicite de Dieu disant au riche : Insensé, cette nuit ton âme sera reprise ; pour qui sera ce que tu as amassé ?')
com([2267], 'LUK.12.20', 'La parole adressée au riche montre qu’une révélation divine ne garantit pas la justice de celui qui la reçoit.')

// XLVIII — cupidité, départ, ânesse et prophétie de Balaam.
cite(2268, 'NUM.22.18', 'Citation explicite de Balaam refusant de transgresser la parole de Dieu même pour une maison pleine d’or et d’argent.')
com([2268], 'NUM.22.18', 'La réponse irréprochable de Balaam est opposée à la cupidité manifestée dans la suite.')
cite(2269, 'NUM.22.12', 'Citation explicite de l’interdiction initiale : ne pas partir et ne pas maudire le peuple béni.')
com([2269, 2270, 2271], 'NUM.22.12', 'L’ordre divin déjà formulé rend coupable la nouvelle consultation provoquée par l’appât des présents.')
cite(2271, 'NUM.22.19', 'Citation explicite de Balaam invitant les nouveaux ambassadeurs à rester la nuit pour obtenir une nouvelle réponse.')
com([2271], 'NUM.22.19', 'La demande d’une seconde réponse divine révèle la cupidité de Balaam.')
for (const v of [22, 23, 28, 32, 35]) com([2272], `NUM.22.${v}`, 'Le récit de l’ânesse et de l’ange est interprété comme réprimande divine de l’avarice obstinée de Balaam.')
cite(2273, 'NUM.22.20', 'Citation explicite de Dieu autorisant Balaam à partir sous condition de ne dire que la parole reçue.')
cite(2273, 'NUM.22.21', 'Citation explicite de Balaam se levant, sellant son ânesse et partant avec les princes de Moab.')
com([2274], 'NUM.22.20', 'L’autorisation conditionnelle est confrontée à l’absence de nouvelle consultation de Balaam au matin.')
com([2274], 'NUM.22.21', 'Le départ immédiat de Balaam manifeste sa cupidité contenue seulement par la crainte.')
cite(2275, 'NUM.22.22', 'Citation explicite de la colère de Dieu et de l’ange se plaçant sur le chemin pour arrêter Balaam.')
for (const v of [22, 23, 24, 25, 26, 27, 28]) com([2275], `NUM.22.${v}`, 'Le récit poursuivi jusqu’à la parole de l’ânesse est désigné comme la réprimande opposée au départ cupide de Balaam.')
for (const v of [28, 29, 30, 31, 32, 33]) com([2276], `NUM.22.${v}`, 'La conversation avec l’ânesse puis l’apparition et le reproche de l’ange sont analysés comme prodige humiliant Balaam.')
cite(2277, 'NUM.22.35', 'Référence explicite à la permission finale de continuer, sous l’obligation de ne prononcer que la parole divine.')
allusion([2277], 'NUM.24.2', 'L’Esprit de Dieu venant sur Balaam explique que la prophétie éclatante ne dépendait pas de son caprice.')
cite(2278, '2PE.2.15', 'Citation explicite de ceux qui suivent la voie de Balaam, fils de Béor, amateur du salaire de l’iniquité ; cible sémantique malgré l’ancien numéro 2,16.')

// XLIX — differre, accuser et le diable accusateur.
cite(2279, 'NUM.22.22', 'Citation explicite de la colère divine et de l’ange dressé sur le chemin pour faire obstacle à Balaam.')
com([2279, 2280, 2281, 2282, 2283, 2284, 2285, 2286], 'NUM.22.22', 'Le verbe décrivant l’obstacle opposé par l’ange est étudié entre retard, agitation et accusation.')
cite(2281, 'NUM.22.32', 'Citation explicite du discours de l’ange : il est venu arrêter ou accuser Balaam sur son chemin.')
com([2281, 2282, 2283, 2284, 2285, 2286], 'NUM.22.32', 'La reprise du même verbe dans la bouche de l’ange permet d’en discuter le sens grec et latin.')
fondu(2283, 'REV.12.9', 'Le diable, dont le nom est expliqué comme accusateur, est intégré à la discussion à partir du dragon appelé diable et Satan.')
fondu(2283, 'REV.12.10', 'L’accusateur qui accuse jour et nuit est fondu dans l’explication étymologique, malgré la note ancienne Apocalypse 11,9-10.')
nonBiblique(2284, 'auteur profane', 'Térence, Andriaque, acte II, scène 4, cité pour l’emploi latin de differat')
nonBiblique(2285, 'auteur profane', 'suite de l’interprétation du passage de Térence où differat décrit une violente harangue accusatrice')

// L — disposition du chemin, des vignes et des rencontres avec l’ange.
cite(2287, 'NUM.22.23', 'Citation explicite de l’ânesse voyant l’ange armé, quittant le chemin pour les champs et frappée par Balaam.')
com([2287, 2288, 2289], 'NUM.22.23', 'Les champs précédant les vignes et le retour forcé de l’ânesse dans le chemin sont replacés dans la topographie du récit.')
cite(2288, 'NUM.22.24', 'Citation explicite de l’ange se tenant entre les vignes, avec une muraille de chaque côté.')
com([2288, 2289, 2290], 'NUM.22.24', 'La position de l’ange dans un sillon de vigne est distinguée du chemin bordé par les deux murs.')
cite(2290, 'NUM.22.25', 'Citation explicite de l’ânesse se serrant contre le mur et pressant le pied de Balaam.')
com([2289, 2290, 2291], 'NUM.22.25', 'Le mur contre lequel l’ânesse se serre est identifié comme celui de la vigne opposée à l’ange.')
cite(2291, 'NUM.22.25', 'Reprise explicite du pied de Balaam pressé contre le mur et des coups redoublés.')
cite(2291, 'NUM.22.26', 'Citation explicite de l’ange avançant dans un lieu étroit sans issue à droite ni à gauche.')
com([2291, 2292], 'NUM.22.26', 'Le lieu resserré explique l’impossibilité pour l’ânesse de se détourner ou de se serrer contre un mur.')
cite(2292, 'NUM.22.27', 'Citation explicite de l’ânesse s’affaissant sous Balaam à la vue de l’ange.')
com([2292, 2293, 2294], 'NUM.22.27', 'L’arrêt de l’ânesse et la colère de Balaam préparent le prodige de sa parole.')
cite(2293, 'NUM.22.27', 'Reprise explicite de Balaam frappant son ânesse avec un bâton dans sa colère.')
cite(2293, 'NUM.22.28', 'Citation explicite de Dieu ouvrant la bouche de l’ânesse et de sa question sur les trois coups.')
cite(2293, 'NUM.22.29', 'Citation explicite de Balaam répondant à l’ânesse et menaçant de la transpercer avec une épée.')
com([2293, 2294], 'NUM.22.28', 'La parole miraculeuse de l’ânesse est expliquée comme parole voulue par Dieu sans transformation de sa nature.')
com([2293, 2294], 'NUM.22.29', 'La réponse immédiate de Balaam manifeste une passion qui l’empêche de s’étonner du prodige.')
fondu(2294, '1CO.1.27', 'Dieu choisissant ce qui est insensé pour confondre les sages est intégré à l’interprétation figurative de l’ânesse.')
allusion([2294], 'GAL.4.28', 'L’autre enfant de la promesse désigne l’Israël spirituel à la manière des enfants de la promesse en Isaac.')
allusion([2294], 'ROM.9.6', 'La distinction entre Israël charnel et véritable Israël éclaire l’expression « Israël spirituel et véritable ».')

for (const [path, hash] of PREUVES) if (createHash('sha256').update(readFileSync(path)).digest('hex') !== hash) throw new Error(`Fac-similé modifié : ${path}`)
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: segments, error } = await sb.from('segments').select('id,segment_numero,segment_texte,notes,ref_niv1,ref_niv2,ref_niv2_texte,liens_revus_le,liens_revus_par').eq('id_oeuvre', OEUVRE).eq('ref_niv1', REF_NIV1).in('ref_niv2', QUESTIONS).order('segment_numero')
if (error) throw error
if (segments.length !== NB_SEGMENTS || segments.some((s, i) => s.segment_numero !== PREMIER + i)) throw new Error('Préétat : bornes ou continuité invalides')
if ([...new Set(segments.map((s) => s.ref_niv2))].join('|') !== QUESTIONS.join('|')) throw new Error('Questions incomplètes ou désordonnées')
if (segments.some((s) => s.ref_niv1 !== REF_NIV1 || s.liens_revus_le || s.liens_revus_par)) throw new Error('Préétat structurel ou relecture invalide')
for (const [n, [avant]] of CORRECTIONS_NOTES) if (!segments.find((s) => s.segment_numero === n)?.notes?.includes(avant)) throw new Error(`Précondition note invalide ${n}`)
const empreinte = createHash('sha256').update(JSON.stringify(segments.map((s) => [s.id, s.segment_numero, s.ref_niv1, s.ref_niv2, s.ref_niv2_texte, s.segment_texte, s.notes]))).digest('hex')
if (empreinte !== EMPREINTE_ATTENDUE) throw new Error(`Préétat modifié : ${empreinte}`)
const parNumero = new Map(segments.map((s) => [s.segment_numero, s]))
const classes = new Set([...LIENS, ...SANS_CIBLE].map(([n]) => n))
const nonClasses = segments.filter((s) => !classes.has(s.segment_numero) && !SANS_LIEN.has(s.segment_numero))
if (nonClasses.length) throw new Error(`Partition incomplète : ${nonClasses.map((s) => s.segment_numero)}`)
if ([...SANS_LIEN].some((n) => classes.has(n) || !parNumero.has(n))) throw new Error('SANS_LIEN invalide')
if (LIENS.some(([n, c, t, m]) => !parNumero.has(n) || !c || ![1, 2, 3, 4].includes(t) || !m.trim())) throw new Error('Manifeste biblique invalide')
if (SANS_CIBLE.some(([n, t, m]) => !parNumero.has(n) || t !== 4 || !/^RÉFÉRENCE NON BIBLIQUE \([^)]+\) : .+/.test(m))) throw new Error('Référence sans cible invalide')
const cles = LIENS.map(([n, c, t]) => `${n}|${c}|${t}`)
if (new Set(cles).size !== cles.length) throw new Error('Doublon interne')
const cibles = [...new Set(LIENS.map(([, c]) => c))]
const { data: temoins, error: te } = await sb.from('versets_lecture').select('id_verset,"TR0001","TR0003","TR0004"').in('id_verset', cibles)
if (te) throw te
const tm = new Map(temoins.map((v) => [v.id_verset, v]))
const invalides = cibles.filter((c) => { const v = tm.get(c); return !v || (!v.TR0001 && !v.TR0003 && !v.TR0004) })
if (invalides.length) throw new Error(`Cibles invalides : ${invalides}`)
const ids = segments.map((s) => s.id)
const [{ count: ex, error: ee }, { count: relusGlobaux, error: er }] = await Promise.all([
  sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  sb.from('segments').select('id', { count: 'exact', head: true }).eq('id_oeuvre', OEUVRE).not('liens_revus_le', 'is', null),
])
if (ee || er) throw ee || er
if (ex) throw new Error(`${ex} liens existent déjà dans le lot`)
const candidatsPath = 'scripts/heptateuque/segmentation-candidate/segments-candidate.json'
const candidats = JSON.parse(readFileSync(candidatsPath, 'utf8'))
for (const s of segments) { const c = candidats.find((x) => x.segment_numero === s.segment_numero); if (!c || c.ref_niv1 !== s.ref_niv1 || c.ref_niv2 !== s.ref_niv2) throw new Error(`Candidat structurellement désynchronisé ${s.segment_numero}`) }
for (const [n, [avant, apres]] of CORRECTIONS_NOTES) {
  const c = candidats.find((x) => x.segment_numero === n)
  if (!c?.notes?.includes(avant)) throw new Error(`Candidat note non synchronisable ${n}`)
  c.notes = c.notes.replace(avant, apres)
}
const TOTAL = LIENS.length + SANS_CIBLE.length
const types = LIENS.reduce((a, x) => { a[x[2]] = (a[x[2]] ?? 0) + 1; return a }, {})
for (const [, type] of SANS_CIBLE) types[type] = (types[type] ?? 0) + 1
const pct = (n) => `${n} / 3262 = ${(100 * n / 3262).toFixed(2).replace('.', ',')} %`
console.log(JSON.stringify({ mode: WRITE ? 'écriture' : 'contrôle', lot: 'Nombres XLI-L', bornes: [PREMIER, DERNIER], segments: NB_SEGMENTS, corrections_notes: CORRECTIONS_NOTES.size, liens_cibles: LIENS.length, references_non_bibliques: SANS_CIBLE.length, total_liens: TOTAL, sans_lien: [...SANS_LIEN], cibles_distinctes: cibles.length, types, empreinte, avancement_actuel: pct(relusGlobaux), avancement_potentiel_apres_ecriture: pct(relusGlobaux + NB_SEGMENTS) }, null, 2))
if (DETAIL) for (const [n, c, t, m] of LIENS) { const v = tm.get(c); console.log({ n, c, t, m, segment: parNumero.get(n).segment_texte, temoin: v.TR0003 || v.TR0001 || v.TR0004 }) }
if (!WRITE) process.exit(0)

const horodatage = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
const sauvegardePath = `scripts/heptateuque/audit-reprise/sauvegarde-nombres-q41-q50-${horodatage}.json`
mkdirSync('scripts/heptateuque/audit-reprise', { recursive: true })
writeFileSync(sauvegardePath, `${JSON.stringify({ oeuvre: OEUVRE, bornes: [PREMIER, DERNIER], empreinte, segments, liens_existants: [] }, null, 2)}\n`, 'utf8')
const quote = (v) => `'${String(v).replaceAll("'", "''")}'`
const valeurs = [...LIENS.map(([n, c, t, m]) => `(${parNumero.get(n).id}, ${quote(c)}, ${t}, 'vérifié', ${quote(m)}, 'lecture', false)`), ...SANS_CIBLE.map(([n, t, m]) => `(${parNumero.get(n).id}, null, ${t}, 'à constituer', ${quote(m)}, 'lecture', true)`) ].join(',\n    ')
const idSql = ids.join(', ')
const correctionsNotesSql = [...CORRECTIONS_NOTES].map(([n, [avant, apres]]) => `update segments set notes = replace(notes, ${quote(avant)}, ${quote(apres)}) where id = ${parNumero.get(n).id} and notes like ${quote(`%${avant}%`)};\n  get diagnostics n = row_count; if n <> 1 then raise exception 'Correction note ${n}: %/1', n; end if;`).join('\n  ')
const sql = `do $p$ declare n integer; begin
  if exists (select 1 from liens_bibliques where segment_id in (${idSql})) then raise exception 'Liens présents'; end if;
  if exists (select 1 from segments where id in (${idSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Déjà relu'; end if;
  ${correctionsNotesSql}
  insert into liens_bibliques (segment_id, canon_id, type, fiabilite, motif, provenance, arbitrage_requis) values
    ${valeurs};
  get diagnostics n = row_count; if n <> ${TOTAL} then raise exception 'Liens insérés : %', n; end if;
  update segments set liens_revus_le = now(), liens_revus_par = ${quote(RELECTEUR)} where id in (${idSql});
  get diagnostics n = row_count; if n <> ${NB_SEGMENTS} then raise exception 'Segments relus : %', n; end if;
end $p$;`
const { error: ew } = await sb.rpc('exec_sql', { sql })
if (ew) throw ew
const [{ count: la, error: e1 }, { count: ra, error: e2 }, { data: audit, error: e3 }, { data: apres, error: e4 }] = await Promise.all([
  sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  sb.from('segments').select('id', { count: 'exact', head: true }).in('id', ids).not('liens_revus_le', 'is', null),
  sb.from('liens_bibliques').select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id', ids),
  sb.from('segments').select('segment_numero,notes').in('id', ids),
])
if (e1 || e2 || e3 || e4) throw e1 || e2 || e3 || e4
const am = new Map(apres.map((s) => [s.segment_numero, s.notes]))
const correctionInvalide = [...CORRECTIONS_NOTES].some(([n, [avant, nv]]) => am.get(n).includes(avant) || !am.get(n).includes(nv))
if (la !== TOTAL || ra !== NB_SEGMENTS || correctionInvalide || audit.some((l) => !l.motif || l.provenance !== 'lecture' || (l.canon_id ? (l.fiabilite !== 'vérifié' || l.arbitrage_requis) : (l.fiabilite !== 'à constituer' || !l.arbitrage_requis || l.type !== 4 || !/^RÉFÉRENCE NON BIBLIQUE \([^)]+\) : .+/.test(l.motif))))) throw new Error('Postcontrôle invalide')
const ca = audit.map((l) => `${l.segment_id}|${l.canon_id ?? 'sans-cible'}|${l.type}|${l.motif}`)
if (new Set(ca).size !== ca.length) throw new Error('Doublon dans le postétat')
writeFileSync(candidatsPath, `${JSON.stringify(candidats, null, 2)}\n`, 'utf8')
console.log(`✓ ${la} liens ; ${ra} segments relus ; sauvegarde ${sauvegardePath}`)
