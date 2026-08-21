import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre troisième'
const PREMIER = 1915
const DERNIER = 1971
const NB_SEGMENTS = 57
const WRITE = process.argv.includes('--write')
const DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Lévitique Q. LXXXI-XC'
const EMPREINTE_ATTENDUE = '947a09bce3da20a87532e033f14c04291f3e1bb8cafa50f0ecbd1dee277d7a8b'
const QUESTIONS = ['Question LXXXI', 'Question LXXXII', 'Question LXXXIII', 'Question LXXXIV', 'Question LXXXV', 'Question LXXXVI', 'Question LXXXVII', 'Question LXXXVIII', 'Question LXXXIX', 'Question XC']
const PREUVES = [
  ['scripts/heptateuque/img/p508.jpg', '981973582e27e0846f88cd74c1e778530540bc3b2851d3be70bbb45488b5d604', 'Page imprimée 500 : la note porte « Lév. XVII, 11 », non « XVI, 11 ».'],
  ['scripts/heptateuque/img/p511.jpg', '12783b04386a65f9093b494f6f54fdeb15053def3ea1cf49561948147e1f5083', 'Page imprimée 503 : le texte porte « Mais il y a de l’obscurité », sans sic.'],
]
const CORRECTIONS_TEXTE = new Map([[1970, ['Mais il a y [<i>sic</i>] de l’obscurité', 'Mais il y a de l’obscurité']]])
const CORRECTIONS_NOTES = new Map([[1921, ['[[502]] Lev. XVI, 11', '[[502]] Lev. XVII, 11']]])
const LIENS = []
const NON_RESOLUS = []
const SANS_LIEN = new Set()
const add = (ns, canonId, type, motif) => { for (const n of ns) LIENS.push([n, canonId, type, motif]) }
const cite = (n, canonId, motif) => add([n], canonId, 1, motif)
const com = (ns, canonId, motif) => add(ns, canonId, 3, motif)
const nonBiblique = (n, motif) => NON_RESOLUS.push([n, 4, `RÉFÉRENCE NON BIBLIQUE (${motif})`])

// LXXXI — deuil et entrée du grand-prêtre dans le sanctuaire.
cite(1915, 'LEV.21.10', 'Référence intentionnelle au grand-prêtre oint, qui ne découvre pas sa tête et ne déchire pas ses vêtements.')
cite(1915, 'LEV.21.11', 'Référence intentionnelle à l’interdiction faite au grand-prêtre d’approcher d’un mort, même son père ou sa mère.')
cite(1916, 'JOB.1.20', 'Citation explicite de Job se levant, déchirant ses vêtements et se rasant la tête après la mort de ses enfants.')
com([1916], 'LEV.21.10', 'La conduite de Job est comparée à la règle de deuil propre au grand-prêtre.')
com([1917, 1918, 1919], 'LEV.21.11', 'La défense d’entrer auprès d’une âme morte est interprétée selon les différentes espèces de morts et de souillures.')
cite(1920, 'ROM.6.2', 'Citation explicite : ceux qui sont morts au péché ne doivent plus vivre dans le péché.')
com([1920, 1921, 1922, 1923], 'LEV.21.11', 'La mort au péché est distinguée du cadavre qui souille selon la loi, puis la défense lévitique est récapitulée.')
cite(1921, 'LEV.17.11', 'Référence éditoriale corrigée d’après le fac-similé à la vie de la chair qui est dans le sang.')
cite(1923, 'LEV.21.11', 'La prohibition d’entrer auprès de toute âme morte, y compris père et mère, est reprise explicitement.')
nonBiblique(1921, 'renvoi interne — Quest. LVII')

// LXXXII — sortie du sanctuaire, souillure et encens quotidien.
cite(1924, 'LEV.21.12', 'Citation explicite de l’interdiction faite au grand-prêtre de sortir du sanctuaire et de profaner les choses saintes.')
cite(1924, 'LEV.8.33', 'Référence éditoriale à l’interdiction de sortir de l’entrée de la tente pendant les jours de consécration.')
com([1924, 1925], 'LEV.21.12', 'La sortie du sanctuaire est interprétée en relation avec l’onction et la continuité du ministère sacerdotal.')
cite(1925, 'LEV.15.16', 'Référence éditoriale à l’impureté produite par une émission séminale et à l’ablution prescrite.')
cite(1925, 'EXO.30.7', 'Référence éditoriale à l’encens aromatique brûlé par Aaron chaque matin.')
cite(1925, 'EXO.30.8', 'Référence éditoriale à l’encens perpétuel brûlé lorsque les lampes sont allumées le soir.')
com([1926, 1927], 'EXO.30.7', 'L’obligation quotidienne de brûler l’encens le matin est discutée malgré les souillures accidentelles.')
com([1926, 1927], 'EXO.30.8', 'L’obligation quotidienne de brûler l’encens le soir est discutée malgré les souillures accidentelles.')
com([1927, 1928], 'LEV.15.16', 'La souillure corporelle invoquée comme difficulté est rapportée à la règle de purification.')
com([1928], 'LEV.22.3', 'L’interdiction d’approcher des choses saintes en état d’impureté résout la portée de la règle.')
nonBiblique(1926, 'œuvre patristique — II Rétractations, ch. 55, n. 9')

// LXXXIII — succession sacerdotale et mort d’Aaron.
com([1929], 'LEV.21.10', 'Le grand-prêtre successeur de son père est identifié par l’onction et la consécration de ses mains.')
com([1929], 'LEV.21.11', 'La mort du père du grand-prêtre fournit le cas précis de la défense de s’approcher d’un cadavre.')
cite(1930, 'EXO.30.7', 'Le service quotidien de l’encens du matin est invoqué pour montrer la continuité nécessaire du sacerdoce.')
cite(1930, 'EXO.30.8', 'Le service quotidien de l’encens du soir est invoqué pour montrer la continuité nécessaire du sacerdoce.')
cite(1931, 'NUM.20.26', 'Référence éditoriale au dépouillement des vêtements d’Aaron et à leur remise à Éléazar avant sa mort.')
cite(1931, 'NUM.20.28', 'Référence éditoriale à la mort d’Aaron après le transfert de ses vêtements sacerdotaux à Éléazar.')
cite(1931, 'NUM.20.29', 'Référence éditoriale au deuil du peuple après la mort d’Aaron.')

// LXXXIV — Dieu sanctifie les prêtres, extérieurement et intérieurement.
cite(1932, 'LEV.21.8', 'Référence sémantique à l’ordre de tenir le prêtre pour saint, car Dieu qui sanctifie est saint.')
cite(1932, 'LEV.21.15', 'Référence sémantique à Dieu qui sanctifie le grand-prêtre, malgré la note imprimée inadéquate Exode 29,24.')
com([1933, 1934, 1935], 'LEV.21.8', 'La sanctification visible par le ministère de Moïse et la sanctification invisible par Dieu sont distinguées.')
com([1933, 1934, 1935], 'LEV.21.15', 'La formule où Dieu sanctifie le prêtre fonde l’analyse du signe extérieur et de la grâce intérieure.')
cite(1936, 'ACT.8.13', 'Référence explicite à Simon le magicien qui crut et reçut le baptême, signe visible de sanctification.')
cite(1936, 'ACT.8.21', 'Référence sémantique au cœur de Simon qui n’était pas droit devant Dieu, preuve de l’absence de sanctification intérieure.')
com([1937], 'LEV.21.8', 'Le ministère visible de Moïse est rapporté à l’action invisible de Dieu qui sanctifie.')
com([1937], 'LEV.21.15', 'Dieu demeure l’auteur de la sanctification intérieure dont le rite extérieur est le signe.')
cite(1938, 'MAT.3.11', 'Citation explicite de Jean qui baptise dans l’eau et annonce celui qui baptisera dans l’Esprit-Saint et le feu.')
cite(1938, 'MAT.3.14', 'Référence explicite à Jean déclarant qu’il doit lui-même être baptisé par le Christ.')
cite(1939, 'LUK.23.43', 'Citation explicite de la promesse du paradis faite au larron, exemple de sanctification sans sacrement visible.')
nonBiblique(1939, 'œuvre patristique — 2 Rétractations, 55, n. 9')
com([1940, 1941], 'LEV.21.8', 'La sanctification sacramentelle visible et la grâce invisible sont récapitulées sous l’action de Dieu.')
com([1940, 1941], 'LEV.21.15', 'La parole « je suis le Seigneur qui le sanctifie » est expliquée comme l’action intérieure de Dieu.')
for (const verse of [44, 45, 46, 47, 48]) cite(1942, `ACT.10.${verse}`, 'Référence éditoriale au don de l’Esprit reçu par Corneille et les siens avant leur baptême d’eau.')

// LXXXV-LXXXVI — abstention et impuretés des prêtres.
cite(1943, 'LEV.22.1', 'Référence intentionnelle à la parole du Seigneur qui introduit la règle sur les choses saintes.')
cite(1943, 'LEV.22.2', 'Citation explicite de l’ordre donné aux prêtres de s’abstenir des choses saintes offertes par Israël.')
cite(1944, 'LEV.22.3', 'Citation explicite de l’exclusion du prêtre qui s’approche des choses saintes dans son impureté.')
com([1945], 'LEV.22.3', 'La portée temporelle de l’exclusion du prêtre impur est expliquée.')
cite(1946, 'EXO.30.7', 'Le service matinal de l’encens est confronté à l’interdiction temporaire faite au prêtre impur.')
cite(1946, 'EXO.30.8', 'Le service vespéral de l’encens est confronté à l’interdiction temporaire faite au prêtre impur.')
cite(1946, 'LEV.15.16', 'L’émission séminale sert d’exemple d’impureté sacerdotale passagère.')
com([1946, 1947, 1948], 'LEV.22.3', 'L’abstention des choses saintes est comprise comme temporaire, jusqu’à purification, et non comme déposition définitive.')
com([1947, 1948], 'LEV.22.2', 'Le verbe s’abstenir est expliqué par l’éloignement provisoire des offrandes saintes.')
cite(1949, 'LEV.22.4', 'Citation explicite des impuretés qui interdisent au prêtre de manger les choses saintes jusqu’à purification.')
com([1949], 'LEV.22.4', 'La durée de l’abstention du prêtre lépreux ou atteint d’un flux est directement expliquée.')

// LXXXVII-LXXXVIII — blasphème et homicide.
cite(1950, 'LEV.24.15', 'Citation explicite de l’homme qui maudit son Dieu et porte son péché.')
cite(1950, 'LEV.24.16', 'Citation explicite de la peine de mort prononcée contre celui qui blasphème le nom du Seigneur.')
com([1951, 1952], 'LEV.24.15', 'Le port du péché et la distinction entre malédiction et blasphème sont analysés.')
com([1951, 1952], 'LEV.24.16', 'La peine du blasphème est expliquée selon la gravité de l’atteinte au nom divin.')
cite(1953, 'LEV.24.17', 'Citation explicite de la peine de mort contre celui qui frappe à mort une âme humaine.')
cite(1953, 'MAT.10.28', 'Citation explicite de la distinction entre ceux qui tuent le corps et Dieu qui peut perdre l’âme et le corps.')
com([1954, 1955, 1956], 'LEV.24.17', 'Le mot âme est expliqué ici comme la vie corporelle ôtée par l’homicide, non comme l’âme immortelle.')

// LXXXIX — sabbat de la terre.
cite(1957, 'LEV.25.2', 'Citation explicite du sabbat que la terre doit observer après l’entrée dans le pays promis.')
cite(1957, 'LEV.25.3', 'Citation explicite des six années de semailles et de taille de la vigne.')
cite(1957, 'LEV.25.4', 'Citation explicite de la septième année, sabbat de repos pour la terre.')
com([1958], 'LEV.25.2', 'Le repos sabbatique de la terre est étudié comme règle agricole et figure spirituelle.')
com([1958, 1959], 'LEV.25.4', 'L’interdiction de travailler la terre la septième année est interprétée dans sa portée pratique.')
cite(1960, 'LEV.25.2', 'La formule du sabbat de la terre est reprise pour en examiner le sens littéral.')
cite(1960, 'LEV.25.5', 'Référence intentionnelle à l’interdiction de moissonner ce qui pousse spontanément pendant l’année sabbatique.')
cite(1961, 'LEV.25.6', 'Citation intentionnelle de la récolte sabbatique donnée en nourriture au maître, au serviteur et à l’étranger.')
cite(1961, 'LEV.25.7', 'Référence intentionnelle à la récolte donnée aussi au bétail et aux animaux du pays.')
cite(1962, 'LEV.25.3', 'Les six années de culture sont reprises comme terme de la comparaison avec la septième année.')
cite(1962, 'LEV.25.4', 'Le repos intégral de la septième année est repris comme objet de la difficulté.')
cite(1963, 'LEV.25.4', 'La défense de semer et de tailler pendant l’année sabbatique est explicitement discutée.')
com([1964, 1965], 'LEV.25.4', 'Les travaux interdits et la possibilité de vivre des productions spontanées pendant le sabbat sont précisés.')
cite(1966, 'LEV.25.6', 'La production spontanée de l’année sabbatique est identifiée à la nourriture commune prévue par la loi.')
cite(1966, 'LEV.25.7', 'La destination de la production aux animaux est incluse dans l’explication de l’usage permis.')
com([1967], 'LEV.25.6', 'La nourriture de l’année sabbatique conclut la distinction entre culture interdite et consommation permise.')

// XC — la terre appartient au Seigneur.
cite(1968, 'LEV.25.23', 'Citation explicite de l’interdiction de vendre la terre à perpétuité, parce qu’elle appartient au Seigneur.')
com([1968, 1969, 1970], 'LEV.25.23', 'Les variantes de traduction sur la propriété divine de la terre sont comparées et expliquées.')
cite(1971, 'LEV.25.23', 'La déclaration « la terre est à moi » est reprise pour conclure l’examen des variantes.')
com([1971], 'LEV.25.23', 'La propriété du Seigneur fonde l’interdiction de l’aliénation définitive de la terre.')
nonBiblique(1968, 'tradition textuelle — autres exemplaires et variantes de traduction non identifiés')

for (const [path, hash] of PREUVES) if (createHash('sha256').update(readFileSync(path)).digest('hex') !== hash) throw new Error(`Preuve fac-similé modifiée : ${path}`)
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: segments, error } = await sb.from('segments').select('id,segment_numero,segment_texte,notes,ref_niv1,ref_niv2,ref_niv2_texte,liens_revus_le,liens_revus_par').eq('id_oeuvre', OEUVRE).eq('ref_niv1', REF_NIV1).in('ref_niv2', QUESTIONS).order('segment_numero')
if (error) throw error
if (segments.length !== NB_SEGMENTS || segments.some((segment, index) => segment.segment_numero !== PREMIER + index)) throw new Error('Préétat : bornes ou continuité invalides')
if ([...new Set(segments.map((segment) => segment.ref_niv2))].join('|') !== QUESTIONS.join('|')) throw new Error('Questions incomplètes ou désordonnées')
if (segments.some((segment) => segment.ref_niv1 !== REF_NIV1 || segment.liens_revus_le || segment.liens_revus_par)) throw new Error('Préétat structurel ou relecture invalide')
for (const [numero, [avant]] of CORRECTIONS_TEXTE) if (!segments.find((s) => s.segment_numero === numero)?.segment_texte.includes(avant)) throw new Error(`Précondition texte invalide ${numero}`)
for (const [numero, [avant]] of CORRECTIONS_NOTES) if (!segments.find((s) => s.segment_numero === numero)?.notes?.includes(avant)) throw new Error(`Précondition note invalide ${numero}`)
const empreinte = createHash('sha256').update(JSON.stringify(segments.map((s) => [s.id, s.segment_numero, s.ref_niv1, s.ref_niv2, s.ref_niv2_texte, s.segment_texte, s.notes]))).digest('hex')
if (empreinte !== EMPREINTE_ATTENDUE) throw new Error(`Préétat modifié : ${empreinte}`)
const parNumero = new Map(segments.map((s) => [s.segment_numero, s]))
const classes = new Set([...LIENS, ...NON_RESOLUS].map(([n]) => n))
const nonClasses = segments.filter((s) => !classes.has(s.segment_numero) && !SANS_LIEN.has(s.segment_numero))
if (nonClasses.length) throw new Error(`Partition incomplète : ${nonClasses.map((s) => s.segment_numero)}`)
if ([...SANS_LIEN].some((n) => classes.has(n) || !parNumero.has(n))) throw new Error('SANS_LIEN invalide')
if (LIENS.some(([n, c, t, m]) => !parNumero.has(n) || !c || ![1, 2, 3, 4].includes(t) || !m.trim())) throw new Error('Manifeste biblique invalide')
if (NON_RESOLUS.some(([n, t, m]) => !parNumero.has(n) || t !== 4 || !m.startsWith('RÉFÉRENCE NON BIBLIQUE'))) throw new Error('Référence sans cible invalide')
const cles = LIENS.map(([n, c, t]) => `${n}|${c}|${t}`)
if (new Set(cles).size !== cles.length) throw new Error('Doublon interne')
const cibles = [...new Set(LIENS.map(([, c]) => c))]
const { data: temoins, error: temoinsError } = await sb.from('versets_lecture').select('id_verset,"TR0001","TR0003","TR0004"').in('id_verset', cibles)
if (temoinsError) throw temoinsError
const temoinsParId = new Map(temoins.map((v) => [v.id_verset, v]))
const ciblesInvalides = cibles.filter((c) => { const v = temoinsParId.get(c); return !v || (!v.TR0001 && !v.TR0003 && !v.TR0004) })
if (ciblesInvalides.length) throw new Error(`Cibles invalides : ${ciblesInvalides}`)
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
for (const [numero, [avant, apres]] of CORRECTIONS_TEXTE) {
  const candidat = candidats.find((x) => x.segment_numero === numero)
  if (!candidat?.segment_texte.includes(avant)) throw new Error(`Candidat texte non synchronisable ${numero}`)
  candidat.segment_texte = candidat.segment_texte.replace(avant, apres)
  const sources = sourceMap.filter((x) => x.first_segment_numero <= numero && x.last_segment_numero >= numero && x.source_clean?.includes(avant))
  if (sources.length !== 1) throw new Error(`Source-map non synchronisable ${numero} : ${sources.length}`)
  sources[0].source_clean = sources[0].source_clean.replace(avant, apres)
}
for (const [numero, [avant, apres]] of CORRECTIONS_NOTES) {
  const candidat = candidats.find((x) => x.segment_numero === numero)
  if (!candidat?.notes?.includes(avant)) throw new Error(`Candidat note non synchronisable ${numero}`)
  candidat.notes = candidat.notes.replace(avant, apres)
}
const TOTAL = LIENS.length + NON_RESOLUS.length
const types = LIENS.reduce((a, x) => { a[x[2]] = (a[x[2]] ?? 0) + 1; return a }, {})
for (const [, type] of NON_RESOLUS) types[type] = (types[type] ?? 0) + 1
const pct = (n) => `${n} / 3262 = ${(100 * n / 3262).toFixed(2).replace('.', ',')} %`
console.log(JSON.stringify({ mode: WRITE ? 'écriture' : 'contrôle', lot: 'Lévitique LXXXI-XC', bornes: [PREMIER, DERNIER], segments: NB_SEGMENTS, corrections_texte: CORRECTIONS_TEXTE.size, corrections_notes: CORRECTIONS_NOTES.size, liens_bibliques: LIENS.length, sans_cible_a_constituer: NON_RESOLUS.length, total_liens: TOTAL, sans_lien: [...SANS_LIEN], cibles_distinctes: cibles.length, types, empreinte, avancement_actuel: pct(relusGlobaux), avancement_potentiel_apres_ecriture: pct(relusGlobaux + NB_SEGMENTS) }, null, 2))
if (DETAIL) for (const [n, c, t, m] of LIENS) { const v = temoinsParId.get(c); console.log({ n, c, t, m, segment: parNumero.get(n).segment_texte, temoin: v.TR0003 || v.TR0001 || v.TR0004 }) }
if (!WRITE) process.exit(0)

const horodatage = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
const sauvegardePath = `scripts/heptateuque/audit-reprise/sauvegarde-levitique-q81-q90-${horodatage}.json`
mkdirSync('scripts/heptateuque/audit-reprise', { recursive: true })
writeFileSync(sauvegardePath, `${JSON.stringify({ oeuvre: OEUVRE, bornes: [PREMIER, DERNIER], empreinte, segments, liens_existants: [] }, null, 2)}\n`, 'utf8')
const quote = (v) => `'${String(v).replaceAll("'", "''")}'`
const valeurs = [...LIENS.map(([n, c, t, m]) => `(${parNumero.get(n).id}, ${quote(c)}, ${t}, 'vérifié', ${quote(m)}, 'lecture', false)`), ...NON_RESOLUS.map(([n, t, m]) => `(${parNumero.get(n).id}, null, ${t}, 'à constituer', ${quote(m)}, 'lecture', true)`) ].join(',\n    ')
const idSql = ids.join(', ')
const correctionsTexteSql = [...CORRECTIONS_TEXTE].map(([n, [avant, apres]]) => `update segments set segment_texte = replace(segment_texte, ${quote(avant)}, ${quote(apres)}) where id = ${parNumero.get(n).id} and segment_texte like ${quote(`%${avant}%`)};\n  get diagnostics n = row_count; if n <> 1 then raise exception 'Correction texte ${n}: %/1', n; end if;`).join('\n  ')
const correctionsNotesSql = [...CORRECTIONS_NOTES].map(([n, [avant, apres]]) => `update segments set notes = replace(notes, ${quote(avant)}, ${quote(apres)}) where id = ${parNumero.get(n).id} and notes like ${quote(`%${avant}%`)};\n  get diagnostics n = row_count; if n <> 1 then raise exception 'Correction note ${n}: %/1', n; end if;`).join('\n  ')
const sql = `do $p$ declare n integer; begin
  if exists (select 1 from liens_bibliques where segment_id in (${idSql})) then raise exception 'Liens présents'; end if;
  if exists (select 1 from segments where id in (${idSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Déjà relu'; end if;
  ${correctionsTexteSql}
  ${correctionsNotesSql}
  insert into liens_bibliques (segment_id, canon_id, type, fiabilite, motif, provenance, arbitrage_requis) values
    ${valeurs};
  get diagnostics n = row_count; if n <> ${TOTAL} then raise exception 'Liens insérés : %', n; end if;
  update segments set liens_revus_le = now(), liens_revus_par = ${quote(RELECTEUR)} where id in (${idSql});
  get diagnostics n = row_count; if n <> ${NB_SEGMENTS} then raise exception 'Segments relus : %', n; end if;
end $p$;`
const { error: writeError } = await sb.rpc('exec_sql', { sql })
if (writeError) throw writeError
const [{ count: liensApres, error: e1 }, { count: relusApres, error: e2 }, { data: audit, error: e3 }, { data: apres, error: e4 }] = await Promise.all([
  sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  sb.from('segments').select('id', { count: 'exact', head: true }).in('id', ids).not('liens_revus_le', 'is', null),
  sb.from('liens_bibliques').select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id', ids),
  sb.from('segments').select('segment_numero,segment_texte,notes').in('id', ids),
])
if (e1 || e2 || e3 || e4) throw e1 || e2 || e3 || e4
const am = new Map(apres.map((s) => [s.segment_numero, s]))
const correctionTexteInvalide = [...CORRECTIONS_TEXTE].some(([n, [avant, nv]]) => am.get(n).segment_texte.includes(avant) || !am.get(n).segment_texte.includes(nv))
const correctionNoteInvalide = [...CORRECTIONS_NOTES].some(([n, [avant, nv]]) => am.get(n).notes.includes(avant) || !am.get(n).notes.includes(nv))
if (liensApres !== TOTAL || relusApres !== NB_SEGMENTS || correctionTexteInvalide || correctionNoteInvalide || audit.some((l) => !l.motif || l.provenance !== 'lecture' || (l.canon_id ? (l.fiabilite !== 'vérifié' || l.arbitrage_requis) : (l.fiabilite !== 'à constituer' || !l.arbitrage_requis || l.type !== 4 || !l.motif.startsWith('RÉFÉRENCE NON BIBLIQUE'))))) throw new Error('Postcontrôle invalide')
const clesApres = audit.map((l) => `${l.segment_id}|${l.canon_id ?? 'sans-cible'}|${l.type}|${l.motif}`)
if (new Set(clesApres).size !== clesApres.length) throw new Error('Doublon dans le postétat')
writeFileSync(candidatsPath, `${JSON.stringify(candidats, null, 2)}\n`, 'utf8')
writeFileSync(sourceMapPath, `${JSON.stringify(sourceMap, null, 2)}\n`, 'utf8')
console.log(`✓ ${liensApres} liens ; ${relusApres} segments relus ; sauvegarde ${sauvegardePath}`)
