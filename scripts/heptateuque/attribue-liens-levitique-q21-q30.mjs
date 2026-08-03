import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const PREMIER = 1589
const DERNIER = 1659
const WRITE = process.argv.includes('--write')
const DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Lévitique Q. XXI-XXX'
const EMPREINTE_ATTENDUE = '7c773781e0baa102159696ecb8ebbcd7eff8f585ae19b39bf65dcffa718c2a71'
const QUESTIONS = ['Question XXI', 'Question XXII', 'Question XXIII', 'Question XXIV', 'Question XXV', 'Question XXVI', 'Question XXVII', 'Question XXVIII', 'Question XXIX', 'Question XXX']
const LIENS = []
const SANS_LIEN = new Set([1593, 1633, 1655])
const NON_RESOLUS = []
const CORRECTIONS_TEXTE = new Map([
  [1604, ['fils de Navë [<i>sic</i>]', 'fils de Navé']],
  [1605, ['étaient ils donc', 'étaient-ils donc']],
  [1610, ['Ce qui parait', 'Ce qui paraît']],
  [1620, ['plus cout [<i>sic</i>]', 'plus court']],
])
const add = (ns, canon, type, motif) => { for (const n of ns) LIENS.push([n, canon, type, motif]) }
const cite = (n, canon, motif) => add([n], canon, 1, motif)
const com = (ns, canon, motif) => add(ns, canon, 3, motif)
const rapproche = (ns, canon, motif) => add(ns, canon, 4, motif)
const nonBiblique = (n, motif) => NON_RESOLUS.push([n, 4, `RÉFÉRENCE NON BIBLIQUE (${motif})`])

// Question XXI — graisse interdite et destination des graisses non sacrificielles.
cite(1589, 'LEV.7.23', 'Citation explicite vérifiée de la défense de manger la graisse du bœuf, de la brebis et de la chèvre.')
cite(1589, 'LEV.7.24', 'Citation explicite vérifiée de l’usage permis de la graisse d’un animal mort ou déchiré, sans la manger.')
cite(1589, 'LEV.7.25', 'Citation explicite vérifiée de la peine frappant celui qui mange la graisse des animaux offerts au Seigneur.')
cite(1590, 'LEV.3.16', 'Référence éditoriale résolue à la formule « Toute graisse appartient au Seigneur ».')
com([1590], 'LEV.7.24', 'L’usage profane permis de la graisse des bêtes mortes ou déchirées est directement expliqué.')
com([1591], 'LEV.7.23', 'La portée de la défense de manger la graisse des animaux purs est discutée.')
com([1591], 'LEV.7.25', 'La restriction apparente aux animaux offerts en sacrifice fonde la difficulté.')
com([1592], 'LEV.3.16', 'La formule attribuant toute graisse au Seigneur est confrontée à l’usage des graisses non sacrificielles.')
com([1592], 'LEV.7.23', 'La défense alimentaire sert de point de départ à la question sur l’usage légitime de la graisse.')

// Question XXII — graisse de la poitrine et part sacerdotale des sacrifices pacifiques.
cite(1594, 'LEV.7.29', 'Référence intentionnelle vérifiée au sacrifice pacifique personnel apporté par celui qui l’offre.')
cite(1594, 'LEV.7.30', 'Référence intentionnelle vérifiée à la graisse présentée avec la poitrine.')
cite(1594, 'LEV.7.31', 'Référence intentionnelle vérifiée à la graisse brûlée et à la poitrine réservée aux prêtres.')
cite(1594, 'LEV.7.32', 'Référence intentionnelle vérifiée à la cuisse droite donnée au prêtre.')
com([1594, 1595], 'LEV.3.3', 'La graisse des entrailles prescrite dans la loi générale du sacrifice pacifique est comparée à la graisse de la poitrine.')
com([1594, 1595], 'LEV.3.4', 'Les rognons et la taie du foie de la loi générale sont confrontés à la prescription ultérieure.')
com([1595], 'LEV.7.30', 'La répétition de la graisse du foie et l’ajout de la poitrine motivent l’hypothèse d’une distinction entre sacrifices.')

// Question XXIII — sacrifice de consécration, sacerdoce de Moïse et succession du grand prêtre.
cite(1596, 'LEV.4.3', 'Référence liminaire vérifiée au veau offert pour le péché du prêtre ayant reçu l’onction.')
cite(1597, 'LEV.8.2', 'Référence éditoriale vérifiée au taureau pour le péché prévu pour la consécration d’Aaron et de ses fils.')
cite(1597, 'LEV.8.14', 'Référence éditoriale vérifiée à l’offrande effective du taureau pour le péché lors de la consécration.')
com([1597], 'LEV.4.6', 'L’aspersion du sang devant le voile dans la loi générale est expressément comparée au rite de consécration.')
com([1597, 1598, 1599], 'LEV.4.7', 'Le sang sur l’autel des parfums et le reste au pied de l’autel des holocaustes fournissent la règle antérieure comparée.')
cite(1598, 'LEV.8.15', 'Référence éditoriale vérifiée au sang mis sur les cornes et répandu au pied de l’autel lors de la consécration.')
com([1598, 1599], 'LEV.4.6', 'L’absence d’aspersion devant le voile dans le récit de consécration est confrontée à la prescription générale.')
com([1599], 'LEV.8.15', 'Le rite effectivement accompli est interprété à la lumière des prescriptions antérieures.')
com([1600], 'LEV.4.3', 'Le prêtre ayant reçu l’onction et la plénitude du sacerdoce est le sujet de la loi générale invoquée.')
cite(1600, 'LEV.8.28', 'Référence éditoriale vérifiée aux parts déposées par Moïse sur l’autel lors de l’installation.')
cite(1600, 'LEV.8.29', 'Référence éditoriale vérifiée à la poitrine reçue par Moïse comme sa portion.')
com([1601], 'LEV.8.29', 'La « poitrine de l’imposition » reçue par Moïse est directement expliquée.')
com([1601], 'LEV.7.30', 'La graisse déposée sur l’autel est rapprochée de la loi du sacrifice pacifique.')
com([1601], 'LEV.7.31', 'La séparation entre graisse brûlée et poitrine sacerdotale éclaire le surnom discuté.')
cite(1602, 'PSA.98.6', 'Citation explicite vérifiée de Moïse et Aaron au nombre des prêtres de Dieu.')
cite(1603, 'EXO.28.2', 'Référence éditoriale vérifiée aux vêtements sacrés d’Aaron, signes de dignité et figures mystérieuses.')
com([1603], 'EXO.28.41', 'L’habillement, l’onction et la consécration d’Aaron et de ses fils fondent le signe sacerdotal évoqué.')
cite(1604, 'EXO.19.22', 'Référence sémantique vérifiée aux prêtres nommés par anticipation avant leur consécration, malgré la note imprimée Exode 19,21.')
cite(1604, 'EXO.33.11', 'Référence éditoriale vérifiée à Josué déjà nommé dans le récit antérieur.')
cite(1604, 'NUM.13.16', 'Référence sémantique vérifiée au moment où Moïse donne à Osée le nom de Josué, malgré la note imprimée Nombres 13,17.')
com([1605], 'PSA.98.6', 'La qualification simultanée de Moïse et d’Aaron comme prêtres fonde la question de leur rang respectif.')
com([1605], 'EXO.28.2', 'Le vêtement pontifical propre à Aaron est opposé à l’excellence personnelle de Moïse.')
cite(1606, 'EXO.4.16', 'Citation explicite vérifiée d’Aaron parlant au peuple à la place de Moïse et de Moïse tenant pour lui la place de Dieu.')
com([1607], 'LEV.21.10', 'La succession du grand prêtre au-dessus de ses frères est le cadre légal de la question.')
com([1607], 'NUM.20.25', 'La succession d’Éléazar après la mort d’Aaron fournit l’exemple scripturaire développé ensuite.')
com([1608], 'EXO.28.41', 'L’onction commune d’Aaron et de ses fils sous-tend l’hypothèse d’une élévation ultérieure par le vêtement.')
com([1608], 'LEV.21.10', 'L’onction et l’installation pour revêtir les vêtements sacrés caractérisent le grand prêtre successeur.')
com([1609], 'NUM.20.26', 'Moïse dépouillant Aaron pour revêtir Éléazar est l’exemple direct de l’habillement du successeur par un autre.')
com([1609], 'NUM.20.28', 'L’exécution du transfert des vêtements d’Aaron à Éléazar est directement évoquée.')
com([1610], 'EXO.28.2', 'La complexité du vêtement sacré d’Aaron motive la nécessité d’une aide pour le revêtir.')
com([1611], 'LEV.21.10', 'Le texte sur le grand prêtre pris parmi ses frères ne fixe pas une succession automatique par primogéniture.')
rapproche([1612], 'LUK.3.2', 'La mention ultérieure d’Anne et Caïphe comme grands prêtres illustre les pluralités sacerdotales évoquées.')

// Question XXIV — « s’asseoir » au sens de demeurer.
cite(1613, 'LEV.8.35', 'Citation explicite vérifiée du séjour de sept jours et sept nuits à l’entrée de la tente.')
com([1614, 1615], 'LEV.8.35', 'Le commandement de rester sept jours est interprété comme demeurer et non conserver une posture assise.')
cite(1616, '1KI.2.38', 'Référence éditoriale vérifiée à Séméï demeurant de nombreux jours à Jérusalem, où « s’asseoir » signifie résider dans la version commentée.')

// Question XXV — γερουσία, sénat et anciens d’Israël.
cite(1617, 'LEV.9.1', 'Citation explicite vérifiée de Moïse appelant Aaron, ses fils et les anciens d’Israël.')
com([1618, 1619, 1620], 'LEV.9.1', 'Les traductions « sénat », « vieillesse », « ordre des anciens » et « anciens » portent sur le même groupe appelé par Moïse.')

// Question XXVI — premiers sacrifices d’Aaron et interprétation de la liste des victimes.
cite(1621, 'LEV.9.2', 'Référence intentionnelle vérifiée au veau pour le péché et au bélier pour l’holocauste d’Aaron.')
cite(1621, 'LEV.9.3', 'Citation explicite vérifiée aux victimes que les anciens doivent prendre pour le peuple.')
cite(1621, 'LEV.9.4', 'Citation explicite vérifiée au bœuf, au bélier pacifiques, à l’oblation et à l’apparition du Seigneur.')
com([1622, 1623, 1624, 1625], 'LEV.9.3', 'La distribution du bouc, du veau et de l’agneau entre sacrifice pour le péché et holocauste est directement analysée.')
com([1622, 1623, 1624, 1625], 'LEV.9.4', 'Le bœuf, le bélier et l’oblation destinés au sacrifice pacifique complètent la classification discutée.')
cite(1626, 'LEV.4.23', 'Référence sémantique vérifiée au bouc exigé pour le péché d’un chef, malgré la note imprimée Lévitique 4,25.')
cite(1626, 'LEV.5.18', 'Référence éditoriale vérifiée au bélier offert pour la faute involontaire d’un particulier.')
cite(1626, 'LEV.4.14', 'Référence éditoriale vérifiée au jeune taureau offert pour le péché de toute l’assemblée.')
com([1627, 1628], 'LEV.4.23', 'Le bouc pour les princes correspond au sacrifice du chef pécheur.')
com([1627, 1628], 'LEV.5.18', 'Le bélier représente les fautes particulières commises par les membres du peuple.')
com([1627, 1628], 'LEV.4.14', 'Le taureau représente le péché commis collectivement par toute l’assemblée.')
com([1629], 'LEV.9.4', 'Le bœuf et le bélier pacifiques prescrits pour tout le peuple sont directement expliqués.')
cite(1629, 'LEV.3.1', 'Référence éditoriale au gros bétail mâle ou femelle permis dans la loi générale des sacrifices pacifiques.')
cite(1629, 'LEV.3.6', 'Référence éditoriale au menu bétail mâle ou femelle permis pour le sacrifice pacifique.')
cite(1629, 'LEV.3.12', 'Référence éditoriale à la chèvre également admise comme victime pacifique.')
com([1630], 'LEV.9.4', 'Les deux victimes pacifiques du peuple, bœuf et bélier, fondent la distinction proposée entre offrande collective et individuelle.')
cite(1630, 'LEV.7.29', 'Référence sémantique vérifiée à la formule « celui qui offrira sa victime pacifique », malgré la note imprimée Lévitique 6,19.')
com([1631], 'LEV.7.30', 'L’offrande de la graisse avec la poitrine caractérise le sacrifice pacifique dit personnel.')
com([1631], 'LEV.7.32', 'La cuisse droite donnée au prêtre complète la différence avec le sacrifice public proposée par Augustin.')
nonBiblique(1631, 'renvoi interne — Livre troisième, Question XXII')
com([1632], 'LEV.8.28', 'Le sacrifice d’installation offert par Moïse pour la communauté sacerdotale est invoqué comme offrande non personnelle.')
com([1632], 'LEV.8.29', 'La poitrine reçue par Moïse rattache le raisonnement au rite collectif de l’installation.')
com([1634], 'LEV.9.3', 'Les sacrifices du peuple réunissent sacrifice pour le péché et holocauste.')
com([1634], 'LEV.9.4', 'Le sacrifice pacifique et l’oblation complètent les sacrifices commandés pour le peuple.')
com([1634, 1635], 'LEV.8.14', 'Le taureau pour le péché appartient aux sacrifices de consécration offerts pour Aaron et ses fils.')
com([1634, 1635, 1636], 'LEV.8.18', 'Le bélier de l’holocauste appartient également à la consécration sacerdotale.')
com([1634, 1635, 1636], 'LEV.8.22', 'Le bélier d’installation constitue le sacrifice de consommation propre à la consécration.')
cite(1635, 'LEV.9.2', 'Référence sémantique vérifiée au veau pour le péché et au bélier pour l’holocauste qu’Aaron offre ensuite pour lui-même.')
com([1636], 'LEV.8.33', 'Les sept jours nécessaires à l’accomplissement de l’installation expliquent son caractère non renouvelable.')

// Question XXVII — ordre des sacrifices et détail des sacrifices pacifiques.
cite(1637, 'LEV.9.7', 'Citation explicite vérifiée de l’ordre donné à Aaron d’offrir son sacrifice pour le péché puis son holocauste.')
cite(1637, 'LEV.4.35', 'Référence éditoriale vérifiée à la graisse du sacrifice pour le péché placée sur les sacrifices consumés sur l’autel.')
cite(1637, 'LEV.5.8', 'Référence sémantique vérifiée à l’ordre expressément fixé pour les oiseaux : la victime pour le péché en premier.')
com([1638, 1639, 1640], 'LEV.9.7', 'L’ordre verbal entre sacrifice pour le péché et holocauste est confronté à l’ordre d’exécution.')
com([1639, 1640], 'LEV.9.8', 'Aaron commence effectivement par le veau du sacrifice pour son propre péché.')
com([1639, 1640], 'LEV.9.12', 'L’holocauste est offert après le sacrifice pour le péché dans le récit de l’exécution.')
cite(1641, 'LEV.4.35', 'Citation explicite vérifiée de la graisse du sacrifice pour le péché déposée sur les sacrifices faits par le feu au Seigneur.')
com([1642], 'LEV.3.5', 'Dans le sacrifice pacifique de gros bétail, les graisses sont expressément placées par-dessus l’holocauste.')
com([1642], 'LEV.4.35', 'Dans le sacrifice pour le péché d’une brebis, la graisse est placée sur les sacrifices déjà consumés.')
cite(1643, 'LEV.9.15', 'Référence éditoriale vérifiée au seul bouc explicitement mentionné pour le péché du peuple.')
com([1643], 'LEV.9.16', 'L’holocauste du peuple est mentionné sans reprise détaillée de l’agneau prescrit.')
com([1643], 'LEV.9.3', 'La liste initiale des victimes du peuple permet de constater les omissions du récit d’exécution.')
cite(1644, 'LEV.9.18', 'Citation explicite vérifiée du taureau et du bélier pacifiques et de leur sang répandu autour de l’autel.')
cite(1645, 'LEV.9.19', 'Citation explicite vérifiée des parties grasses du taureau et du bélier.')
cite(1645, 'LEV.9.20', 'Citation explicite vérifiée des graisses posées sur les poitrines puis consumées sur l’autel.')
cite(1645, 'LEV.9.21', 'Citation explicite vérifiée des poitrines et de la cuisse droite balancées par Aaron.')
com([1646], 'LEV.9.19', 'Le pluriel des deux reins et les autres variations de nombre sont expliqués pour chacune des deux victimes.')
com([1647, 1648], 'LEV.9.20', 'La formule des graisses placées sur les poitrines est interprétée comme séparation avant la combustion.')
com([1647, 1648, 1649], 'LEV.9.21', 'Les poitrines et la cuisse réservées au prêtre expliquent le singulier collectif final.')

// Question XXVIII — descente d’Aaron et accès à l’autel.
cite(1650, 'LEV.9.22', 'Citation explicite vérifiée d’Aaron bénissant le peuple puis descendant après les sacrifices.')
com([1651, 1656], 'LEV.9.22', 'Le verbe « descendit » implique une position élevée pendant le ministère à l’autel.')
com([1652, 1654, 1656], 'EXO.27.1', 'La hauteur de trois coudées de l’autel rend nécessaire le moyen d’élévation discuté.')
nonBiblique(1652, 'renvoi interne — Livre deuxième, Question CXIII')
com([1653, 1654], 'EXO.20.26', 'La défense de monter à l’autel par des degrés adhérents, afin de ne pas découvrir la nudité, est directement expliquée.')

// Questions XXIX-XXX — réaction du peuple et origine du feu.
cite(1657, 'LEV.9.24', 'Citation explicite vérifiée de la réaction du peuple devant le feu divin, avec discussion du grec ἐξέστη.')
cite(1658, 'LEV.9.24', 'Citation explicite vérifiée du feu sorti de devant le Seigneur et consumant l’holocauste et les graisses.')
com([1658, 1659], 'LEV.9.24', 'L’expression « sortit du Seigneur » est examinée comme ordre divin ou provenance du lieu de l’arche, sans localisation de Dieu.')

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).map((x) => x.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: bruts, error: e0 } = await sb.from('segments').select('id,segment_numero,segment_texte,notes,ref_niv1,ref_niv2,ref_niv2_texte,liens_revus_le,liens_revus_par').eq('id_oeuvre', OEUVRE).gte('segment_numero', PREMIER).lte('segment_numero', DERNIER).order('segment_numero')
if (e0) throw e0
const segments = bruts.filter((s) => s.ref_niv1 === 'Livre troisième' && QUESTIONS.includes(s.ref_niv2))
if (segments.length !== 71 || segments.some((s, i) => s.segment_numero !== PREMIER + i) || [...new Set(segments.map((s) => s.ref_niv2))].join('|') !== QUESTIONS.join('|')) throw Error('Préétat structurel invalide')
if (segments.some((s) => s.liens_revus_le || s.liens_revus_par)) throw Error('Déjà relu')
for (const [n, [avant]] of CORRECTIONS_TEXTE) {
  const segment = segments.find((s) => s.segment_numero === n)
  if (!segment?.segment_texte.includes(avant)) throw Error(`Précondition de correction invalide au segment ${n}`)
}
const empreinte = createHash('sha256').update(JSON.stringify(segments.map((s) => [s.id, s.segment_numero, s.ref_niv1, s.ref_niv2, s.ref_niv2_texte, s.segment_texte, s.notes]))).digest('hex')
if (empreinte !== EMPREINTE_ATTENDUE) throw Error(`Empreinte ${empreinte}`)
const parNumero = new Map(segments.map((s) => [s.segment_numero, s]))
const classes = new Set([...LIENS, ...NON_RESOLUS].map((x) => x[0]))
const nonClasses = segments.filter((s) => !classes.has(s.segment_numero) && !SANS_LIEN.has(s.segment_numero))
if (nonClasses.length) throw Error(`Non classés ${nonClasses.map((x) => x.segment_numero)}`)
if (LIENS.some(([n, c, t, m]) => !parNumero.has(n) || !c || ![1, 2, 3, 4].includes(t) || !m.trim())) throw Error('Manifeste de liens invalide')
if (NON_RESOLUS.some(([n, t, m]) => !parNumero.has(n) || t !== 4 || !m.startsWith('RÉFÉRENCE NON BIBLIQUE'))) throw Error('Manifeste non biblique invalide')
const keys = LIENS.map((x) => `${x[0]}|${x[1]}|${x[2]}`)
const vus = new Set()
const doublons = keys.filter((k) => vus.has(k) || !vus.add(k))
if (doublons.length) throw Error(`Doublons ${doublons}`)
const cibles = [...new Set(LIENS.map((x) => x[1]))]
const { data: temoins, error: e1 } = await sb.from('versets_lecture').select('id_verset,TR0001,TR0003,TR0004').in('id_verset', cibles)
if (e1) throw e1
const temoinsParCible = new Map(temoins.map((v) => [v.id_verset, v]))
const absentes = cibles.filter((c) => !temoinsParCible.has(c))
if (absentes.length) throw Error(`Cibles absentes ${absentes}`)
const ids = segments.map((s) => s.id)
const { count: existants, error: e2 } = await sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids)
if (e2) throw e2
if (existants) throw Error(`${existants} liens existants`)
const total = LIENS.length + NON_RESOLUS.length
const types = LIENS.reduce((a, x) => { a[x[2]] = (a[x[2]] || 0) + 1; return a }, {})
if (NON_RESOLUS.length) types[4] = (types[4] || 0) + NON_RESOLUS.length
console.log(JSON.stringify({ mode: WRITE ? 'écriture' : 'contrôle', lot: 'Lévitique XXI-XXX', bornes: [PREMIER, DERNIER], segments: segments.length, corrections_ocr: CORRECTIONS_TEXTE.size, liens: total, sans_cible_a_constituer: NON_RESOLUS.length, sans_lien: [...SANS_LIEN], cibles_distinctes: cibles.length, types, empreinte, avancement_actuel: '45,10 %' }, null, 2))
if (DETAIL) {
  for (const [n, c, t, m] of LIENS) console.log({ n, c, t, m, segment: parNumero.get(n).segment_texte, temoin: temoinsParCible.get(c).TR0003 || temoinsParCible.get(c).TR0001 || temoinsParCible.get(c).TR0004 })
  for (const [n, t, m] of NON_RESOLUS) console.log({ n, c: null, t, m, segment: parNumero.get(n).segment_texte })
}
const candidatsPath = 'scripts/heptateuque/segmentation-candidate/segments-candidate.json'
const sourceMapPath = 'scripts/heptateuque/segmentation-candidate/source-map.json'
const candidats = JSON.parse(readFileSync(candidatsPath, 'utf8'))
for (const [n, [avant, apres]] of CORRECTIONS_TEXTE) {
  const candidat = candidats.find((s) => s.segment_numero === n)
  if (!candidat?.segment_texte.includes(avant)) throw Error(`Candidat non synchronisable au segment ${n}`)
  candidat.segment_texte = candidat.segment_texte.replace(avant, apres)
}
const sourceMap = JSON.parse(readFileSync(sourceMapPath, 'utf8'))
for (const [n, [avant, apres]] of CORRECTIONS_TEXTE) {
  const candidatsSource = sourceMap.filter((s) => s.source_clean?.includes(avant))
  if (candidatsSource.length !== 1) throw Error(`Source-map non synchronisable pour le segment ${n}: ${candidatsSource.length}`)
  candidatsSource[0].source_clean = candidatsSource[0].source_clean.replace(avant, apres)
}
if (!WRITE) process.exit(0)

const q = (v) => `'${String(v).replaceAll("'", "''")}'`
const valeurs = [
  ...LIENS.map(([n, c, t, m]) => `(${parNumero.get(n).id}, ${q(c)}, ${t}, 'vérifié', ${q(m)}, 'lecture', false)`),
  ...NON_RESOLUS.map(([n, t, m]) => `(${parNumero.get(n).id}, null, ${t}, 'à constituer', ${q(m)}, 'lecture', true)`),
].join(',\n    ')
const idSql = ids.join(', ')
const correctionsSql = [...CORRECTIONS_TEXTE].map(([n, [avant, apres]]) => {
  const id = parNumero.get(n).id
  return `update segments set segment_texte = replace(segment_texte, ${q(avant)}, ${q(apres)}) where id = ${id} and segment_texte like ${q(`%${avant}%`)};\n  get diagnostics n = row_count; if n <> 1 then raise exception 'Correction OCR segment ${n}: %/1', n; end if;`
}).join('\n  ')
const sql = `do $passe$ declare n integer; begin
  if exists (select 1 from liens_bibliques where segment_id in (${idSql})) then raise exception 'Liens déjà présents'; end if;
  if exists (select 1 from segments where id in (${idSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Marques déjà présentes'; end if;
  ${correctionsSql}
  insert into liens_bibliques (segment_id, canon_id, type, fiabilite, motif, provenance, arbitrage_requis) values ${valeurs};
  get diagnostics n = row_count; if n <> ${total} then raise exception 'Liens %/${total}', n; end if;
  update segments set liens_revus_le = now(), liens_revus_par = ${q(RELECTEUR)} where id in (${idSql});
  get diagnostics n = row_count; if n <> 71 then raise exception 'Segments %/71', n; end if;
end $passe$;`
const { error: ew } = await sb.rpc('exec_sql', { sql })
if (ew) throw ew
const [{ count: liensApres, error: ea }, { count: revusApres, error: eb }, { data: audit, error: ec }, { data: textesApres, error: ed }] = await Promise.all([
  sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  sb.from('segments').select('id', { count: 'exact', head: true }).in('id', ids).not('liens_revus_le', 'is', null),
  sb.from('liens_bibliques').select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id', ids),
  sb.from('segments').select('segment_numero,segment_texte').in('id', ids),
])
if (ea || eb || ec || ed) throw (ea || eb || ec || ed)
const textesParNumero = new Map(textesApres.map((s) => [s.segment_numero, s.segment_texte]))
const correctionInvalide = [...CORRECTIONS_TEXTE].some(([n, [avant, apres]]) => textesParNumero.get(n).includes(avant) || !textesParNumero.get(n).includes(apres))
if (liensApres !== total || revusApres !== 71 || correctionInvalide || audit.some((x) => !x.motif || x.provenance !== 'lecture' || (x.canon_id ? (x.fiabilite !== 'vérifié' || x.arbitrage_requis) : (x.fiabilite !== 'à constituer' || !x.arbitrage_requis || x.type !== 4 || !x.motif.startsWith('RÉFÉRENCE NON BIBLIQUE'))))) throw Error('Postcontrôle invalide')
writeFileSync(candidatsPath, `${JSON.stringify(candidats, null, 2)}\n`, 'utf8')
writeFileSync(sourceMapPath, `${JSON.stringify(sourceMap, null, 2)}\n`, 'utf8')
console.log(`✓ ${liensApres} liens, ${revusApres} segments`)
