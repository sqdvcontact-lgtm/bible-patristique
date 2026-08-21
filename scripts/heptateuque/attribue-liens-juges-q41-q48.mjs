import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre septième'
const DEBUT = 3036
const FIN = 3091
const TOTAL_SEGMENTS = 56
const QUESTIONS = ['Question XLI', 'Question XLII', 'Question XLIII', 'Question XLIV', 'Question XLV', 'Question XLVI', 'Question XLVII', 'Question XLVIII']
const WRITE = process.argv.includes('--write')
const DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Juges Q. XLI-XLVIII'
const EMPREINTE_ATTENDUE = '36b5d57280c7510ebd387aee8f97242e3602e67cac088dec4ce31f4d22e5e01b'
const CHARTE = 'charte/CHARTE_IA.md'
const CHARTE_HASH = '47893c044ebab26e78149548c129fb9de3b72dde1e37c3371b60a1786240c198'
const PREUVES = [
  ['scripts/heptateuque/img/p583.jpg', 'cf45dbdb7a9bfefa9fa19e771b9afe107dc1dab551d3cc87432ab746a8f65b6b', 'Questions XLI et début XLII ; éphod de Gédéon et espace typographique du titre interrogatif.'],
  ['scripts/heptateuque/img/p584.jpg', '6d24d2de24f590f0fb87acda2de366e25b937af152ac5644e2d212aff9e89369', 'Fin de XLI, Questions XLII-XLIV et références à Juges 8-9.'],
  ['scripts/heptateuque/img/p585.jpg', 'bdc617e7f35f807b10c73271abdd942d433410783da9f516770b0febd1196b9a', 'Questions XLIV-XLVII, psaume 42 et comparaison évangélique de l’aube.'],
  ['scripts/heptateuque/img/p586.jpg', 'd3afbcecce0233ec6ebcaf57f146165dee8d49a8f2b5ad33b9436af084497972', 'Fin de XLVII, Question XLVIII et raccord avec la Question XLIX.'],
]
const CORRECTIONS_TEXTE = [{
  numero: 3036,
  dbAvant: '</i>? - On demande', dbApres: '</i> ? – On demande',
  candidatAvant: '</i>? – On demande', candidatApres: '</i> ? – On demande',
  sourceAvant: '</i>? – On demande', sourceApres: '</i> ? – On demande',
}]
const CORRECTIONS_NOTES = [{ numero: 3039, avant: '[[836]] 1Sa. II, 18,', apres: '[[836]] 1Sa. II, 18.' }]

const LIENS = []
const NON_RESOLUS = []
const SANS_LIEN = new Set()
const add = (numero, canonId, type, motif) => LIENS.push([numero, canonId, type, motif])
const com = (numero, canonIds, motif) => { for (const canonId of canonIds) add(numero, canonId, 3, `${motif} (${canonId}).`) }
const both = (numero, canonId, motif) => {
  add(numero, canonId, 1, `${motif} — citation ou référence intentionnelle.`)
  add(numero, canonId, 3, `${motif} — passage commenté ou mobilisé dans le raisonnement.`)
}
const nonBiblique = (numero, genre, motif) => NON_RESOLUS.push([numero, 4, `RÉFÉRENCE NON BIBLIQUE (${genre}) : ${motif} ; cible de corpus à constituer.`])

// XLI — nature de l’éphod fabriqué par Gédéon et caractère idolâtrique du culte.
both(3036, 'JDG.8.26', 'Les dépouilles d’or de Madian servent de matière à l’éphod de Gédéon')
both(3036, 'JDG.8.27', 'Gédéon fabrique et dresse l’éphod qui devient scandale pour Israël et sa maison')
com(3037, ['JDG.8.26', 'JDG.8.27'], 'Les noms grec et latin du vêtement sacerdotal servent à déterminer la nature matérielle de l’éphod')
nonBiblique(3037, 'tradition textuelle', 'la plupart des interprètes et les équivalents grecs ἐπένδυμα, ἐπωμίς et latin super humerale identifient l’éphod à un vêtement porté sur les épaules')
both(3038, 'JDG.8.26', 'Le poids de mille sept cents sicles et les autres dépouilles de Madian sont cités')
both(3038, 'JDG.8.27', 'Gédéon fait un éphod, le dresse à Éphra et Israël se prostitue auprès de lui')
com(3039, ['JDG.8.26', 'JDG.8.27'], 'La quantité d’or employée rend problématique l’identification à un simple vêtement')
both(3039, '1SA.2.18', 'Samuel enfant sert devant le Seigneur revêtu d’un éphod de lin')
for (let numero = 3040; numero <= 3052; numero++) com(numero, ['JDG.8.27'], 'La fabrication, l’érection et le culte de l’éphod sont interprétés comme un sanctuaire illicite hors du tabernacle')
both(3047, 'EXO.28.6', 'L’éphod sacerdotal doit être composé d’or, d’hyacinthe, de pourpre, d’écarlate et de fin lin')
nonBiblique(3048, 'version biblique', 'les Septante formulent « Gédéon en fit un éphod », suggérant que l’ensemble des dépouilles fut employé')
nonBiblique(3050, 'version biblique', 'la version faite sur l’hébreu porte « avec cela Gédéon fit un éphod »')
nonBiblique(3050, 'version biblique', 'les Septante emploient une forme distincte du mot hébreu pour désigner l’éphod')
both(3051, '1SA.2.18', 'L’éphod de lin reçu par Samuel enfant est distingué du riche vêtement du grand-prêtre')
nonBiblique(3051, 'philologie hébraïque', 'les connaisseurs de l’hébreu corrigent éphudbar en éphud-bat et l’expliquent comme éphod de lin')
com(3053, ['JDG.8.27'], 'Le scandale de l’éphod atteint Gédéon et sa maison jusque dans la perte de ses fils')
both(3053, 'JDG.9.5', 'Abimélech tue sur une même pierre les soixante-dix fils de Gédéon')

// XLII — ordre narratif de l’éphod et des quarante années de paix.
both(3054, 'JDG.8.27', 'Le scandale idolâtrique de l’éphod est confronté aux années de paix')
both(3054, 'JDG.8.28', 'La terre demeure en repos quarante ans pendant les jours de Gédéon')
for (let numero = 3055; numero <= 3058; numero++) com(numero, ['JDG.8.27', 'JDG.8.28'], 'Le récit anticipé de l’éphod est distingué chronologiquement du résumé des quarante années de paix')

// XLIII — idolâtrie après la mort de Gédéon.
both(3059, 'JDG.8.33', 'Après la mort de Gédéon, Israël se détourne vers les Baalim et prend Baalbérith pour dieu')
com(3060, ['JDG.8.33', 'JDG.8.27'], 'L’idolâtrie envers Baalbérith est jugée plus grave que le culte illicite de l’éphod')
com(3061, ['JDG.8.33', 'JDG.8.27'], 'La patience de Dieu envers l’éphod est opposée aux iniquités postérieures plus manifestes')
com(3062, ['JDG.8.33'], 'La manifeste idolâtrie postérieure ne doit pas rester impunie')

// XLIV — ponctuation et force de la menace du buisson.
both(3063, 'JDG.9.14', 'Les arbres invitent le buisson à devenir leur roi')
both(3063, 'JDG.9.15', 'Le buisson propose son ombre et menace de brûler les cèdres du Liban')
for (const numero of [3064, 3065, 3066]) com(numero, ['JDG.9.15'], 'La ponctuation et le mode verbal de la menace du buisson sont expliqués')

// XLV — envoi ou permission de l’esprit mauvais.
both(3067, 'JDG.9.23', 'Dieu envoie un esprit mauvais entre Abimélech et les habitants de Sichem')
com(3068, ['JDG.9.23'], 'Le verbe latin et grec « envoyer » est examiné pour distinguer ordre et permission')
both(3068, 'PSA.42.3', 'Le psalmiste demande à Dieu d’envoyer sa lumière et sa vérité')
nonBiblique(3068, 'tradition textuelle', 'les interprètes latins rendent diversement le grec ἐξαπέστειλεν par « envoya » ou « laissa partir »')
com(3069, ['JDG.9.23'], 'Dieu peut laisser agir ou envoyer un esprit mauvais comme instrument de juste vengeance')
nonBiblique(3069, 'tradition textuelle', 'certains interprètes rendent ἐξαπέστειλεν par « il mit au-dedans d’eux »')

// XLVI — point du jour et lever du soleil.
both(3070, 'JDG.9.32', 'Zébul ordonne de se lever de nuit et de dresser des embuscades dans la campagne')
both(3070, 'JDG.9.33', 'L’attaque doit commencer le matin au lever du soleil')
for (let numero = 3071; numero <= 3077; numero++) com(numero, ['JDG.9.33'], 'Le matin, le point du jour et le lever du soleil du conseil de Zébul sont distingués puis conciliés')
nonBiblique(3071, 'tradition textuelle', 'les exemplaires latins portent maturabis ou manicabis tandis que le grec exprime « tu te lèveras au point du jour »')
nonBiblique(3072, 'philologie latine', 'discussion étymologique et lexicale des formes maturabis et manicabis')
nonBiblique(3073, 'philologie grecque', 'le grec ὄρθρος est défini comme le temps précédant le lever du soleil')
both(3076, 'MRK.16.2', 'Les femmes viennent au tombeau de très grand matin, le soleil étant déjà levé')
both(3076, 'JHN.20.1', 'Marie Madeleine vient au tombeau quand les ténèbres subsistent encore')
add(3077, 'GEN.1.3', 2, 'La lumière primitive créée avant le soleil reprend le premier commandement créateur de la lumière.')
add(3077, 'GEN.1.14', 2, 'La création des luminaires au quatrième jour est évoquée pour distinguer leur lumière de la lumière primitive.')
add(3077, 'GEN.1.16', 2, 'Le grand et le petit luminaire créés au quatrième jour constituent le soleil et la lune évoqués.')
add(3077, 'GEN.1.19', 2, 'La mention explicite du quatrième jour reprend la conclusion du récit des luminaires.')

// XLVII — syntaxe et généalogie de Thola.
both(3078, 'JDG.10.1', 'Thola fils de Phua, parent d’Abimélech et homme d’Issachar, se lève pour sauver Israël')
for (let numero = 3079; numero <= 3085; numero++) com(numero, ['JDG.10.1'], 'La construction « fils du frère du père » et la différence tribale entre Thola et Abimélech sont expliquées généalogiquement')
nonBiblique(3080, 'version biblique', 'la version faite sur l’hébreu confirme que Thola était fils de l’oncle d’Abimélech')
both(3083, '1SA.18.27', 'Saül de Benjamin donne sa fille Michol à David de Juda')
both(3083, '2CH.22.11', 'Josabeth fille du roi Joram et femme du prêtre Joïada unit les tribus de Juda et de Lévi')
both(3084, 'LUK.1.36', 'L’Évangile affirme la parenté de Marie et d’Élisabeth, pourtant issue de la famille d’Aaron')
com(3085, ['LUK.1.36'], 'La parenté de Marie et d’Élisabeth fonde l’affirmation d’une ascendance royale et sacerdotale du Christ')

// XLVIII — Chamos et la possession du pays.
both(3086, 'JDG.11.24', 'Jephté oppose ce que Chamos est censé donner à Ammon à ce que le Seigneur donne réellement à Israël')
for (let numero = 3087; numero <= 3091; numero++) com(numero, ['JDG.11.24'], 'Les différentes traductions de la possession attribuée à Chamos sont interprétées sans lui reconnaître un pouvoir réel')
nonBiblique(3087, 'tradition textuelle', 'certains interprètes latins rendent que Chamos a donné le pays en héritage à ses adorateurs')
nonBiblique(3088, 'tradition textuelle', 'd’autres exemplaires portent que Chamos a lui-même possédé le pays')
both(3088, 'DEU.32.8', 'La répartition des nations par le Très-Haut est rapprochée de leur tutelle angélique dans la tradition grecque')
nonBiblique(3088, 'version biblique', 'la note invoque explicitement la leçon des Septante de Deutéronome 32,8 sur les anges préposés aux nations')
nonBiblique(3090, 'version biblique', 'le texte grec ajoute « pour toi » afin de rapporter la possession de Chamos à la croyance du roi ammonite')

if (createHash('sha256').update(readFileSync(CHARTE)).digest('hex') !== CHARTE_HASH) throw Error('Charte modifiée depuis la préparation du lot')
for (const [path, hash] of PREUVES) if (createHash('sha256').update(readFileSync(path)).digest('hex') !== hash) throw Error(`Preuve fac-similé modifiée : ${path}`)
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).map(line => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: bruts, error: e0 } = await sb.from('segments').select('id,id_oeuvre,segment_numero,ref_niv1,ref_niv2,ref_niv2_texte,segment_texte,texte_original,notes,nature,liens_revus_le,liens_revus_par').eq('id_oeuvre', OEUVRE).gte('segment_numero', DEBUT - 1).lte('segment_numero', FIN + 1).order('segment_numero')
if (e0) throw e0
const voisinAvant = bruts.find(s => s.segment_numero === DEBUT - 1)
const voisinApres = bruts.find(s => s.segment_numero === FIN + 1)
if (voisinAvant?.ref_niv1 !== REF_NIV1 || voisinAvant?.ref_niv2 !== 'Question XL') throw Error('Raccord amont invalide')
if (voisinApres?.ref_niv1 !== REF_NIV1 || voisinApres?.ref_niv2 !== 'Question XLIX') throw Error('Raccord aval invalide')
const segments = bruts.filter(s => s.segment_numero >= DEBUT && s.segment_numero <= FIN)
if (segments.length !== TOTAL_SEGMENTS || segments.some((s, i) => s.segment_numero !== DEBUT + i) || segments.some(s => s.ref_niv1 !== REF_NIV1 || !QUESTIONS.includes(s.ref_niv2)) || [...new Set(segments.map(s => s.ref_niv2))].join('|') !== QUESTIONS.join('|')) throw Error('Préétat structurel invalide')
if (segments.some(s => s.liens_revus_le || s.liens_revus_par)) throw Error('Lot déjà relu')
const empreinte = createHash('sha256').update(JSON.stringify(segments.map(s => [s.id, s.segment_numero, s.ref_niv1, s.ref_niv2, s.ref_niv2_texte, s.segment_texte, s.texte_original, s.notes, s.nature]))).digest('hex')
if (empreinte !== EMPREINTE_ATTENDUE) throw Error(`Empreinte inattendue : ${empreinte}`)
const parNumero = new Map(segments.map(s => [s.segment_numero, s]))
for (const c of CORRECTIONS_TEXTE) if (!parNumero.get(c.numero)?.segment_texte.includes(c.dbAvant) || parNumero.get(c.numero).segment_texte.includes(c.dbApres)) throw Error(`Précondition texte invalide au segment ${c.numero}`)
for (const c of CORRECTIONS_NOTES) if (!parNumero.get(c.numero)?.notes?.includes(c.avant) || parNumero.get(c.numero).notes.includes(c.apres)) throw Error(`Précondition note invalide au segment ${c.numero}`)
const numerosClasses = new Set([...LIENS, ...NON_RESOLUS].map(l => l[0]))
const nonClasses = segments.filter(s => !numerosClasses.has(s.segment_numero) && !SANS_LIEN.has(s.segment_numero))
if (nonClasses.length) throw Error(`Segments non classés : ${nonClasses.map(s => s.segment_numero).join(', ')}`)
if ([...SANS_LIEN].some(n => numerosClasses.has(n) || !parNumero.has(n))) throw Error('Déclaration SANS_LIEN invalide')
if (LIENS.some(([n, c, t, m]) => !parNumero.has(n) || !c || ![1, 2, 3, 4].includes(t) || !m.trim())) throw Error('Lien biblique invalide')
if (NON_RESOLUS.some(([n, t, m]) => !parNumero.has(n) || t !== 4 || !m.startsWith('RÉFÉRENCE NON BIBLIQUE'))) throw Error('Référence non biblique invalide')
const cles = LIENS.map(([n, c, t]) => `${n}|${c}|${t}`)
if (new Set(cles).size !== cles.length) throw Error('Doublon interne dans le manifeste')
const cibles = [...new Set(LIENS.map(([, c]) => c))]
const { data: versets, error: e1 } = await sb.from('versets_lecture').select('id_verset,TR0001,TR0003,TR0004').in('id_verset', cibles)
if (e1) throw e1
const parCible = new Map(versets.map(v => [v.id_verset, v]))
const absentes = cibles.filter(c => !parCible.has(c))
if (absentes.length) throw Error(`Cibles absentes : ${absentes.join(', ')}`)
const sansTemoin = cibles.filter(c => { const v = parCible.get(c); return !v.TR0001 && !v.TR0003 && !v.TR0004 })
if (sansTemoin.length) throw Error(`Cibles sans témoin local : ${sansTemoin.join(', ')}`)
const ids = segments.map(s => s.id)
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
for (const c of CORRECTIONS_TEXTE) {
  const candidat = candidats.find(s => s.segment_numero === c.numero)
  if (!candidat?.segment_texte.includes(c.candidatAvant) || candidat.segment_texte.includes(c.candidatApres)) throw Error(`Candidat texte non synchronisable au segment ${c.numero}`)
  candidat.segment_texte = candidat.segment_texte.replace(c.candidatAvant, c.candidatApres)
  const sources = sourceMap.filter(s => s.first_segment_numero <= c.numero && s.last_segment_numero >= c.numero && s.source_clean?.includes(c.sourceAvant))
  if (sources.length !== 1) throw Error(`Source-map non synchronisable au segment ${c.numero} : ${sources.length}`)
  sources[0].source_clean = sources[0].source_clean.replace(c.sourceAvant, c.sourceApres)
}
for (const c of CORRECTIONS_NOTES) {
  const candidat = candidats.find(s => s.segment_numero === c.numero)
  if (!candidat?.notes?.includes(c.avant) || candidat.notes.includes(c.apres)) throw Error(`Candidat note non synchronisable au segment ${c.numero}`)
  candidat.notes = candidat.notes.replace(c.avant, c.apres)
}
const total = LIENS.length + NON_RESOLUS.length
const types = LIENS.reduce((a, l) => { a[l[2]] = (a[l[2]] || 0) + 1; return a }, {})
for (const [, type] of NON_RESOLUS) types[type] = (types[type] || 0) + 1
const liensParQuestion = Object.fromEntries(QUESTIONS.map(q => { const ns = new Set(segments.filter(s => s.ref_niv2 === q).map(s => s.segment_numero)); return [q, [...LIENS, ...NON_RESOLUS].filter(([n]) => ns.has(n)).length] }))
const sondage = QUESTIONS.map((q, i) => { const ss = segments.filter(s => s.ref_niv2 === q); return ss[(i * 7 + 3) % ss.length].segment_numero })
if (sondage.length !== QUESTIONS.length || new Set(sondage).size !== sondage.length || sondage.some(n => !numerosClasses.has(n))) throw Error('Sondage déterministe invalide')
const pct = n => `${n} / 3262 = ${(100 * n / 3262).toFixed(2).replace('.', ',')} %`
console.log(JSON.stringify({ mode: WRITE ? 'écriture' : 'contrôle', lot: 'Juges XLI-XLVIII', bornes: [DEBUT, FIN], voisins: { avant: [voisinAvant.segment_numero, voisinAvant.ref_niv2], apres: [voisinApres.segment_numero, voisinApres.ref_niv2] }, segments: TOTAL_SEGMENTS, corrections_texte: CORRECTIONS_TEXTE.length, corrections_notes: CORRECTIONS_NOTES.length, liens: total, liens_bibliques: LIENS.length, sans_cible_a_constituer: NON_RESOLUS.length, sans_lien: [...SANS_LIEN], cibles_distinctes: cibles.length, types, liens_par_question: liensParQuestion, sondage, empreinte, anciennes_numerotations_arbitrees: ['Psaume 42,3 vérifié en PSA.42.3', 'Marc 16,2 et Jean 20,1 distingués pour grand matin et ténèbres', 'Deutéronome 32,8 : lien local conservé, leçon angélique des Septante consignée séparément'], sic: 'aucun sic dans le lot ; aucune anomalie numérique, syntaxique ou de ponctuation n’en reçoit', avancement_actuel: pct(relusGlobaux), avancement_apres_ecriture_ulterieure: pct(relusGlobaux + TOTAL_SEGMENTS) }, null, 2))
if (DETAIL) {
  for (const [numero, canonId, type, motif] of LIENS) console.log({ numero, canonId, type, motif, segment: parNumero.get(numero).segment_texte, ...parCible.get(canonId) })
  for (const [numero, type, motif] of NON_RESOLUS) console.log({ numero, canonId: null, type, motif, segment: parNumero.get(numero).segment_texte })
}
if (!WRITE) process.exit(0)

const horodatage = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
const sauvegardePath = `scripts/heptateuque/audit-reprise/sauvegarde-juges-q41-q48-${horodatage}.json`
mkdirSync('scripts/heptateuque/audit-reprise', { recursive: true })
writeFileSync(sauvegardePath, `${JSON.stringify({ oeuvre: OEUVRE, bornes: [DEBUT, FIN], empreinte, segments, liens_existants: [] }, null, 2)}\n`, 'utf8')
const quote = value => `'${String(value).replaceAll("'", "''")}'`
const valeurs = [...LIENS.map(([n, c, t, m]) => `(${parNumero.get(n).id}, ${quote(c)}, ${t}, 'vérifié', ${quote(m)}, 'lecture', false)`), ...NON_RESOLUS.map(([n, t, m]) => `(${parNumero.get(n).id}, null, ${t}, 'à constituer', ${quote(m)}, 'lecture', true)`)].join(',\n    ')
const idsSql = ids.join(', ')
const correctionsTexteSql = CORRECTIONS_TEXTE.map(c => `update segments set segment_texte = replace(segment_texte, ${quote(c.dbAvant)}, ${quote(c.dbApres)}) where id = ${parNumero.get(c.numero).id} and segment_texte like ${quote(`%${c.dbAvant}%`)};
  get diagnostics n = row_count; if n <> 1 then raise exception 'Correction texte segment ${c.numero}: %/1', n; end if;`).join('\n  ')
const correctionsNotesSql = CORRECTIONS_NOTES.map(c => `update segments set notes = replace(notes, ${quote(c.avant)}, ${quote(c.apres)}) where id = ${parNumero.get(c.numero).id} and notes like ${quote(`%${c.avant}%`)};
  get diagnostics n = row_count; if n <> 1 then raise exception 'Correction note segment ${c.numero}: %/1', n; end if;`).join('\n  ')
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
const [{ count: liensApres, error: e4 }, { count: relusApres, error: e5 }, { data: audit, error: e6 }, { data: etatApres, error: e7 }] = await Promise.all([
  sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  sb.from('segments').select('id', { count: 'exact', head: true }).in('id', ids).not('liens_revus_le', 'is', null),
  sb.from('liens_bibliques').select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id', ids),
  sb.from('segments').select('segment_numero,segment_texte,notes').in('id', ids),
])
if (e4 || e5 || e6 || e7) throw (e4 || e5 || e6 || e7)
const post = new Map(etatApres.map(s => [s.segment_numero, s]))
const texteInvalide = CORRECTIONS_TEXTE.some(c => post.get(c.numero).segment_texte.includes(c.dbAvant) || !post.get(c.numero).segment_texte.includes(c.dbApres))
const noteInvalide = CORRECTIONS_NOTES.some(c => post.get(c.numero).notes.includes(c.avant) || !post.get(c.numero).notes.includes(c.apres))
if (liensApres !== total || relusApres !== TOTAL_SEGMENTS || texteInvalide || noteInvalide || audit.some(l => !l.motif || l.provenance !== 'lecture' || (l.canon_id ? l.fiabilite !== 'vérifié' || l.arbitrage_requis : l.fiabilite !== 'à constituer' || !l.arbitrage_requis || l.type !== 4 || !l.motif.startsWith('RÉFÉRENCE NON BIBLIQUE')))) throw Error('Postcontrôle invalide')
const clesApres = audit.map(l => `${l.segment_id}|${l.canon_id ?? 'sans-cible'}|${l.type}|${l.motif}`)
if (new Set(clesApres).size !== clesApres.length) throw Error('Doublon dans le postétat')
writeFileSync(candidatsPath, `${JSON.stringify(candidats, null, 2)}\n`, 'utf8')
writeFileSync(sourceMapPath, `${JSON.stringify(sourceMap, null, 2)}\n`, 'utf8')
console.log(`✓ ${liensApres} liens, ${relusApres} segments, sauvegarde ${sauvegardePath}`)
