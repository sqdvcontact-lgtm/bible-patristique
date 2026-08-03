import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre quatrième'
const PREMIER = 2108
const DERNIER = 2163
const NB_SEGMENTS = 56
const WRITE = process.argv.includes('--write')
const DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Nombres Q. XXI-XXX'
const EMPREINTE_ATTENDUE = 'e290d5a456c3c604358f90dc8ad5feadf78f59f8bcb47e7bd84acacdd445f515'
const QUESTIONS = ['Question XXI', 'Question XXII', 'Question XXIII', 'Question XXIV', 'Question XXV', 'Question XXVI', 'Question XXVII', 'Question XXVIII', 'Question XXIX', 'Question XXX']
const PREUVES = [
  ['scripts/heptateuque/img/p520.jpg', '11b63b6c000da0b2b1c58e21045db4d58b5b9e5441f48a7adac6227709468082'],
  ['scripts/heptateuque/img/p521.jpg', '099a79f8615ac58f51053542e58f52d6c1102d985b8a5f7face5c96238b20f04'],
  ['scripts/heptateuque/img/p522.jpg', '94b1979755f9115a93b472e65ebdf358a92880d174098a23a25a65b12415be79'],
  ['scripts/heptateuque/img/p523.jpg', '9f909fa2799e76ed7116b6e4ee4b9fccf95835172eef6725cdb17e22bf2b2759'],
  ['scripts/heptateuque/img/p524.jpg', '65cc74065bd8dfee12849dc64d5dd795d420686672f01583406cac1745f60692'],
]
const LIENS = []
const SANS_CIBLE = []
const SANS_LIEN = new Set()
const add = (ns, canonId, type, motif) => { for (const n of ns) LIENS.push([n, canonId, type, motif]) }
const cite = (n, canonId, motif) => add([n], canonId, 1, motif)
const fondu = (n, canonId, motif) => add([n], canonId, 2, motif)
const com = (ns, canonId, motif) => add(ns, canonId, 3, motif)
const allusion = (ns, canonId, motif) => add(ns, canonId, 4, motif)
const nonBiblique = (n, genre, motif) => SANS_CIBLE.push([n, 4, `RÉFÉRENCE NON BIBLIQUE (${genre}) : ${motif}`])
const bibliqueNonResolue = (n, motif) => SANS_CIBLE.push([n, 1, `CITATION BIBLIQUE NON RÉSOLUE (${motif})`])

// XXI — exploration du pays de Chanaan.
cite(2108, 'NUM.13.17', 'Citation explicite de l’ordre de monter par le désert sur la montagne pour explorer le pays.')
cite(2108, 'NUM.13.18', 'Citation explicite de l’examen du peuple, fort ou faible, peu nombreux ou considérable.')
com([2108, 2109, 2110], 'NUM.13.17', 'La montagne est expliquée comme le pays élevé que les espions devaient parcourir, non comme un simple poste d’observation.')
com([2108, 2109, 2110], 'NUM.13.18', 'La force du peuple est interprétée au moyen de son nombre et de l’exploration effective du pays.')
com([2110, 2111], 'NUM.13.19', 'L’examen minutieux des villes ouvertes ou fortifiées montre que les espions ont pénétré dans le pays.')
com([2111], 'NUM.13.21', 'Le parcours du pays par les espions fonde la critique d’une observation limitée au sommet d’une montagne.')
com([2111, 2112], 'NUM.13.23', 'La branche de vigne et sa grappe rapportées de la vallée sont mobilisées pour décrire le relief exploré.')
com([2111, 2112], 'NUM.13.24', 'Le nom de vallée d’Escol, donné en souvenir de la grappe, est explicitement rappelé.')

// XXII-XXIII — rapport des espions et exhortation de Caleb et Josué.
cite(2113, 'NUM.13.32', 'Citation septantiste intentionnelle du mauvais rapport, rendu ici par la peur rapportée du pays exploré.')
com([2113], 'NUM.13.32', 'Le génitif est expliqué comme la peur conçue par les espions devant le pays, non comme une peur éprouvée par le pays.')
cite(2114, 'NUM.14.9', 'Début de la citation explicite : le peuple du pays ne doit pas être craint et sera comme une bouchée.')
cite(2115, 'NUM.14.9', 'Suite de la citation explicite : leur temps ou leur protection s’est retiré, tandis que le Seigneur est avec Israël.')
com([2114, 2115, 2116, 2117], 'NUM.14.9', 'L’image de la bouchée et l’opposition entre le temps des impies et la présence du Seigneur sont expliquées sans quitter ce verset.')

// XXIV — péchés involontaires.
for (const n of [2118, 2119, 2120, 2121, 2122]) {
  for (const verse of [24, 25, 26, 27, 28, 29]) com([n], `NUM.15.${verse}`, 'La loi d’expiation des fautes commises par erreur est examinée pour distinguer ignorance, contrainte et volonté.')
}

// XXV — péché commis la main levée et mépris des commandements.
cite(2123, 'NUM.15.30', 'Citation explicite de la personne qui pèche la main levée, outrage Dieu et est retranchée du peuple.')
cite(2123, 'NUM.15.31', 'Citation explicite du mépris de la parole et des commandements, avec l’iniquité qui demeure sur le coupable.')
for (const n of [2123, 2124, 2125, 2126, 2127, 2128, 2129, 2130, 2131, 2132, 2133, 2134]) {
  com([n], 'NUM.15.30', 'Le péché de la main levée est expliqué comme mépris orgueilleux, distinct de l’ignorance et de la faiblesse.')
  com([n], 'NUM.15.31', 'Le retranchement, le poids du péché et le broiement du coupable sont interprétés dans la continuité du passage.')
}
com([2125, 2126], 'NUM.15.25', 'Le sacrifice expiatoire prévu pour la faute involontaire est opposé au péché orgueilleux.')
com([2125, 2126], 'NUM.15.28', 'L’expiation accordée à celui qui a péché par erreur est opposée au mépris incurable sans pénitence.')
cite(2127, 'PRO.18.3', 'Citation explicite du pécheur parvenu aux profondeurs du mal et tombant dans le mépris.')
cite(2129, 'PSA.50.19', 'Citation explicite du cœur contrit et humilié que Dieu ne méprise pas ; la cible sémantique canonique diffère du numéro moderne 51,19.')
cite(2129, 'NUM.15.30', 'Reprise explicite de l’homme coupable qui irrite ou outrage Dieu par son péché orgueilleux.')
cite(2129, 'JAS.4.6', 'Citation explicite de Dieu qui résiste aux superbes et accorde sa grâce aux humbles.')
cite(2130, 'NUM.15.30', 'Reprise explicite du retranchement de l’âme coupable hors du milieu du peuple.')
cite(2130, 'NUM.15.31', 'Reprise explicite du mépris de la parole divine et du broiement du coupable.')
cite(2131, 'NUM.15.31', 'Reprise explicite de la formule selon laquelle le péché demeure sur l’âme coupable.')
cite(2133, 'SIR.6.36', 'Citation explicite du pied qui use ou presse souvent le seuil de la porte du sage.')

// XXVI — révolte de Dathan et Abiron.
cite(2135, 'NUM.16.13', 'Citation explicite du reproche fait à Moïse d’avoir tiré le peuple d’un pays de lait et de miel pour le faire mourir au désert.')
cite(2136, 'NUM.16.14', 'Citation explicite du refus de monter et de l’expression figurée sur les yeux que Moïse voudrait arracher.')
for (const n of [2135, 2136, 2137, 2138, 2139]) {
  com([n], 'NUM.16.13', 'La réponse révoltée de Dathan et Abiron et leur refus de l’autorité de Moïse sont expliqués.')
  com([n], 'NUM.16.14', 'L’expression « arracher les yeux » et le refus de monter sont soumis à deux interprétations grammaticales.')
}
cite(2138, 'GAL.4.15', 'Citation explicite des Galates prêts, si possible, à s’arracher les yeux pour les donner à Paul.')

// XXVII — séparation des justes avant une destruction collective.
cite(2140, 'NUM.16.20', 'Citation explicite de la parole adressée par le Seigneur à Moïse et Aaron.')
cite(2140, 'NUM.16.21', 'Citation explicite de l’ordre de se retirer du milieu de l’assemblée avant sa destruction.')
com([2140, 2141, 2142, 2143, 2144], 'NUM.16.21', 'La séparation des innocents et des coupables avant un châtiment collectif est expliquée par plusieurs récits bibliques.')
allusion([2141], 'GEN.7.7', 'Noé entre dans l’arche avec toute sa maison pour échapper aux eaux du déluge.')
allusion([2141], 'GEN.19.15', 'Les anges pressent Lot de prendre sa femme et ses filles afin de ne pas périr avec la ville.')
allusion([2141], 'GEN.19.16', 'Lot et les siens sont conduits hors de Sodome avant sa destruction.')
allusion([2141], 'GEN.19.17', 'Lot reçoit l’ordre de s’éloigner et de sauver sa vie avant le feu sur Sodome.')
allusion([2141], 'EXO.14.28', 'Les eaux recouvrent les Égyptiens qui poursuivaient Israël dans la mer.')
allusion([2141], 'EXO.14.29', 'Israël marche à sec et demeure séparé de l’armée égyptienne engloutie.')
allusion([2141], 'NUM.16.24', 'Le peuple reçoit l’ordre de s’écarter des demeures de Coré, Dathan et Abiron.')
allusion([2141], 'NUM.16.26', 'Moïse commande de s’éloigner des tentes des impies pour ne pas être enveloppé dans leurs péchés.')
allusion([2141], 'NUM.16.27', 'L’assemblée se retire effectivement des alentours des tentes des rebelles.')
allusion([2142], 'NUM.21.6', 'La morsure des serpents est citée comme châtiment ciblé ne requérant pas une séparation préalable.')
for (const verse of [12, 13, 14]) allusion([2142], `NUM.17.${verse}`, 'La grande plaie qui frappe une partie déterminée du peuple illustre un châtiment ciblé.')
allusion([2142, 2143], 'GEN.7.10', 'Les eaux du déluge représentent un fléau collectif dont les justes doivent être séparés.')
allusion([2142, 2143], 'GEN.19.24', 'La pluie de feu sur Sodome représente un fléau collectif dont Lot doit être éloigné.')
allusion([2142, 2143], 'EXO.14.28', 'Les flots qui couvrent l’armée égyptienne illustrent un châtiment collectif après séparation d’Israël.')
for (const verse of [31, 32, 33]) allusion([2142, 2143], `NUM.16.${verse}`, 'La terre ouverte qui engloutit les rebelles illustre le danger collectif de l’abîme.')
fondu(2144, 'MAT.13.30', 'La séparation finale du froment et de l’ivraie, puis le feu réservé à l’ivraie, est fondue dans la conclusion d’Augustin.')
fondu(2144, 'MAT.13.43', 'Les justes brillant comme le soleil dans le royaume du Père sont repris dans la voix d’Augustin.')

// XXVIII — « in visione » et variantes grecques.
cite(2145, 'NUM.16.30', 'Citation explicite du prodige par lequel la terre s’ouvre et engloutit les rebelles.')
com([2145, 2146, 2147], 'NUM.16.30', 'La formule grecque traduite « in visione » est expliquée comme manifestation visible, non vision extatique ou fantôme.')
nonBiblique(2145, 'tradition textuelle', 'quelques traducteurs lisant χάσματι à la place de φάσματι')
nonBiblique(2147, 'tradition de traduction', 'plusieurs traducteurs rendant le mot grec par « fantôme »')

// XXIX — descente vivante aux enfers et anges déchus.
cite(2148, 'NUM.16.33', 'Citation explicite de la descente vivante des rebelles aux enfers avec tout ce qui leur appartenait.')
com([2148, 2149, 2150], 'NUM.16.32', 'L’ouverture de la terre et l’engloutissement des maisons permettent d’identifier ici un enfer terrestre.')
com([2148, 2149, 2150], 'NUM.16.33', 'La descente vivante dans les entrailles de la terre est distinguée des autres acceptions scripturaires de l’enfer.')
allusion([2150], '2PE.2.4', 'Les anges pécheurs réservés dans les ténèbres servent d’analogie à une autre acception de l’enfer.')
cite(2151, '2PE.2.4', 'Citation explicite de Dieu qui n’épargne pas les anges pécheurs et les réserve dans les ténèbres pour le jugement.')
cite(2151, 'EPH.2.2', 'Citation explicite du démon, prince de la puissance de l’air, agissant dans les incrédules.')

// XXX — encensoirs consacrés, succession d’Éléazar et chronologie biblique.
cite(2152, 'NUM.17.1', 'Citation explicite de la parole du Seigneur à Moïse qui introduit l’ordre concernant les encensoirs.')
cite(2152, 'NUM.17.2', 'Citation explicite de l’ordre donné à Éléazar de retirer les encensoirs et d’en disperser le feu.')
cite(2152, 'NUM.17.3', 'Citation explicite des encensoirs sanctifiés, transformés en lames pour l’autel et en avertissement pour Israël.')
com([2152, 2153, 2154, 2156], 'NUM.17.2', 'Le choix d’Éléazar comme destinataire est expliqué par sa qualité de successeur d’Aaron et par l’ordre sacerdotal.')
com([2152, 2157, 2158, 2159], 'NUM.17.3', 'La sanctification des encensoirs par la mort des pécheurs et leur valeur d’avertissement sont précisément expliquées.')
cite(2155, 'NUM.17.4', 'Citation explicite d’Éléazar prenant les encensoirs d’airain et les transformant en revêtement pour l’autel.')
cite(2155, 'NUM.17.5', 'Citation explicite du mémorial interdisant à tout étranger à la race d’Aaron d’offrir l’encens.')
com([2155], 'NUM.17.4', 'L’action d’Éléazar matérialise l’ordre reçu et manifeste son rôle sacerdotal.')
com([2155], 'NUM.17.5', 'Le revêtement de l’autel avertit Israël contre l’usurpation du sacerdoce d’Aaron.')
com([2160], 'NUM.17.3', 'Le revêtement d’airain de l’autel est replacé dans une discussion sur l’ordre non chronologique des livres.')
allusion([2160], 'EXO.27.2', 'La prescription de revêtir d’airain l’autel est rapprochée rétrospectivement des lames tirées des encensoirs.')
com([2161], 'NUM.17.23', 'La verge d’Aaron qui fleurit et produit des amandes est citée comme événement raconté ultérieurement dans les Nombres.')
com([2161], 'NUM.17.25', 'L’ordre de conserver la verge devant le témoignage est mobilisé dans la discussion chronologique.')
allusion([2161], 'EXO.16.34', 'La manne déposée devant le témoignage dans l’Exode participe à la conflation chronologique analysée.')
allusion([2161], 'HEB.9.4', 'La verge d’Aaron et la manne réunies dans l’arche correspondent au contenu explicitement énuméré par l’Épître aux Hébreux.')
bibliqueNonResolue(2161, 'attribution explicite à l’Exode, chapitre XXVI, d’un ordre d’enfermer la verge d’Aaron dans l’arche avec la manne, absent des témoins canoniques')
com([2162, 2163], 'EXO.40.17', 'La date effective de l’érection du tabernacle, premier jour du premier mois de la deuxième année, fonde l’argument chronologique malgré la note imprimée 40,15.')
com([2162, 2163], 'NUM.1.1', 'L’ouverture des Nombres au premier jour du deuxième mois de la deuxième année établit le caractère rétrospectif du récit.')

for (const [path, hash] of PREUVES) if (createHash('sha256').update(readFileSync(path)).digest('hex') !== hash) throw new Error(`Fac-similé modifié : ${path}`)
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: segments, error } = await sb.from('segments').select('id,segment_numero,segment_texte,notes,ref_niv1,ref_niv2,ref_niv2_texte,liens_revus_le,liens_revus_par').eq('id_oeuvre', OEUVRE).eq('ref_niv1', REF_NIV1).in('ref_niv2', QUESTIONS).order('segment_numero')
if (error) throw error
if (segments.length !== NB_SEGMENTS || segments.some((s, i) => s.segment_numero !== PREMIER + i)) throw new Error('Préétat : bornes ou continuité invalides')
if ([...new Set(segments.map((s) => s.ref_niv2))].join('|') !== QUESTIONS.join('|')) throw new Error('Questions incomplètes ou désordonnées')
if (segments.some((s) => s.ref_niv1 !== REF_NIV1 || s.liens_revus_le || s.liens_revus_par)) throw new Error('Préétat structurel ou relecture invalide')
const empreinte = createHash('sha256').update(JSON.stringify(segments.map((s) => [s.id, s.segment_numero, s.ref_niv1, s.ref_niv2, s.ref_niv2_texte, s.segment_texte, s.notes]))).digest('hex')
if (empreinte !== EMPREINTE_ATTENDUE) throw new Error(`Préétat modifié : ${empreinte}`)
const parNumero = new Map(segments.map((s) => [s.segment_numero, s]))
const classes = new Set([...LIENS, ...SANS_CIBLE].map(([n]) => n))
const nonClasses = segments.filter((s) => !classes.has(s.segment_numero) && !SANS_LIEN.has(s.segment_numero))
if (nonClasses.length) throw new Error(`Partition incomplète : ${nonClasses.map((s) => s.segment_numero)}`)
if ([...SANS_LIEN].some((n) => classes.has(n) || !parNumero.has(n))) throw new Error('SANS_LIEN invalide')
if (LIENS.some(([n, c, t, m]) => !parNumero.has(n) || !c || ![1, 2, 3, 4].includes(t) || !m.trim())) throw new Error('Manifeste biblique invalide')
if (SANS_CIBLE.some(([n, t, m]) => !parNumero.has(n) || ![1, 2, 3, 4].includes(t) || !(m.startsWith('RÉFÉRENCE NON BIBLIQUE') || m.startsWith('CITATION BIBLIQUE NON RÉSOLUE')))) throw new Error('Référence sans cible invalide')
const cles = LIENS.map(([n, c, t]) => `${n}|${c}|${t}`)
if (new Set(cles).size !== cles.length) throw new Error('Doublon interne')
const cibles = [...new Set(LIENS.map(([, c]) => c))]
const { data: temoins, error: temoinsError } = await sb.from('versets_lecture').select('id_verset,"TR0001","TR0003","TR0004"').in('id_verset', cibles)
if (temoinsError) throw temoinsError
const temoinsParId = new Map(temoins.map((v) => [v.id_verset, v]))
const invalides = cibles.filter((c) => { const v = temoinsParId.get(c); return !v || (!v.TR0001 && !v.TR0003 && !v.TR0004) })
if (invalides.length) throw new Error(`Cibles invalides : ${invalides}`)
const ids = segments.map((s) => s.id)
const [{ count: liensExistants, error: liensError }, { count: relusGlobaux, error: relusError }] = await Promise.all([
  sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  sb.from('segments').select('id', { count: 'exact', head: true }).eq('id_oeuvre', OEUVRE).not('liens_revus_le', 'is', null),
])
if (liensError || relusError) throw liensError || relusError
if (liensExistants) throw new Error(`${liensExistants} liens existent déjà dans le lot`)
const candidats = JSON.parse(readFileSync('scripts/heptateuque/segmentation-candidate/segments-candidate.json', 'utf8'))
for (const s of segments) {
  const c = candidats.find((x) => x.segment_numero === s.segment_numero)
  if (!c || c.ref_niv1 !== s.ref_niv1 || c.ref_niv2 !== s.ref_niv2) throw new Error(`Candidat structurellement désynchronisé ${s.segment_numero}`)
}
const TOTAL = LIENS.length + SANS_CIBLE.length
const types = LIENS.reduce((a, x) => { a[x[2]] = (a[x[2]] ?? 0) + 1; return a }, {})
for (const [, type] of SANS_CIBLE) types[type] = (types[type] ?? 0) + 1
const pct = (n) => `${n} / 3262 = ${(100 * n / 3262).toFixed(2).replace('.', ',')} %`
console.log(JSON.stringify({ mode: WRITE ? 'écriture' : 'contrôle', lot: 'Nombres XXI-XXX', bornes: [PREMIER, DERNIER], segments: NB_SEGMENTS, corrections: 0, liens_cibles: LIENS.length, references_non_bibliques: SANS_CIBLE.filter((x) => x[2].startsWith('RÉFÉRENCE NON BIBLIQUE')).length, citations_bibliques_non_resolues: SANS_CIBLE.filter((x) => x[2].startsWith('CITATION BIBLIQUE NON RÉSOLUE')).length, total_liens: TOTAL, sans_lien: [...SANS_LIEN], cibles_distinctes: cibles.length, types, empreinte, avancement_actuel: pct(relusGlobaux), avancement_potentiel_apres_ecriture: pct(relusGlobaux + NB_SEGMENTS) }, null, 2))
if (DETAIL) for (const [n, c, t, m] of LIENS) { const v = temoinsParId.get(c); console.log({ n, c, t, m, segment: parNumero.get(n).segment_texte, temoin: v.TR0003 || v.TR0001 || v.TR0004 }) }
if (!WRITE) process.exit(0)

const horodatage = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
const sauvegardePath = `scripts/heptateuque/audit-reprise/sauvegarde-nombres-q21-q30-${horodatage}.json`
mkdirSync('scripts/heptateuque/audit-reprise', { recursive: true })
writeFileSync(sauvegardePath, `${JSON.stringify({ oeuvre: OEUVRE, bornes: [PREMIER, DERNIER], empreinte, segments, liens_existants: [] }, null, 2)}\n`, 'utf8')
const quote = (v) => `'${String(v).replaceAll("'", "''")}'`
const valeurs = [...LIENS.map(([n, c, t, m]) => `(${parNumero.get(n).id}, ${quote(c)}, ${t}, 'vérifié', ${quote(m)}, 'lecture', false)`), ...SANS_CIBLE.map(([n, t, m]) => `(${parNumero.get(n).id}, null, ${t}, 'à constituer', ${quote(m)}, 'lecture', true)`) ].join(',\n    ')
const idSql = ids.join(', ')
const sql = `do $p$ declare n integer; begin
  if exists (select 1 from liens_bibliques where segment_id in (${idSql})) then raise exception 'Liens présents'; end if;
  if exists (select 1 from segments where id in (${idSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Déjà relu'; end if;
  insert into liens_bibliques (segment_id, canon_id, type, fiabilite, motif, provenance, arbitrage_requis) values
    ${valeurs};
  get diagnostics n = row_count; if n <> ${TOTAL} then raise exception 'Liens insérés : %', n; end if;
  update segments set liens_revus_le = now(), liens_revus_par = ${quote(RELECTEUR)} where id in (${idSql});
  get diagnostics n = row_count; if n <> ${NB_SEGMENTS} then raise exception 'Segments relus : %', n; end if;
end $p$;`
const { error: writeError } = await sb.rpc('exec_sql', { sql })
if (writeError) throw writeError
const [{ count: liensApres, error: e1 }, { count: relusApres, error: e2 }, { data: audit, error: e3 }] = await Promise.all([
  sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  sb.from('segments').select('id', { count: 'exact', head: true }).in('id', ids).not('liens_revus_le', 'is', null),
  sb.from('liens_bibliques').select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id', ids),
])
if (e1 || e2 || e3) throw e1 || e2 || e3
if (liensApres !== TOTAL || relusApres !== NB_SEGMENTS || audit.some((l) => !l.motif || l.provenance !== 'lecture' || (l.canon_id ? (l.fiabilite !== 'vérifié' || l.arbitrage_requis) : (l.fiabilite !== 'à constituer' || !l.arbitrage_requis)))) throw new Error('Postcontrôle invalide')
const clesApres = audit.map((l) => `${l.segment_id}|${l.canon_id ?? 'sans-cible'}|${l.type}|${l.motif}`)
if (new Set(clesApres).size !== clesApres.length) throw new Error('Doublon dans le postétat')
console.log(`✓ ${liensApres} liens ; ${relusApres} segments relus ; sauvegarde ${sauvegardePath}`)
