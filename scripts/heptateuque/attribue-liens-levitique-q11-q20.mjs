import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre troisième'
const PREMIER = 1533
const DERNIER = 1588
const NB_SEGMENTS = 56
const WRITE = process.argv.includes('--write')
const DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Lévitique Q. XI-XX'
const EMPREINTE_ATTENDUE = 'e2f28a281ea363937a2fd51c8433c61f2818e5b8b61d2dddea0ab8867ae9c08c'
const QUESTIONS = [
  'Question XI', 'Question XII', 'Question XIII', 'Question XIV', 'Question XV',
  'Question XVI', 'Question XVII', 'Question XVIII', 'Question XIX', 'Question XX',
]

const LIENS = []
const add = (segmentNumero, canonId, type, motif) => LIENS.push([segmentNumero, canonId, type, motif])
const both = (segmentNumero, canonId, motif) => {
  add(segmentNumero, canonId, 1, `${motif} — citation ou référence intentionnelle.`)
  add(segmentNumero, canonId, 3, `${motif} — passage commenté ou mobilisé dans le raisonnement.`)
}
const explain = (segmentNumero, canonIds, motif) => {
  for (const canonId of canonIds) add(segmentNumero, canonId, 3, `${motif} (${canonId}).`)
}

// Question XI — cendres de l’holocauste.
both(1533, 'LEV.6.4', 'Le prêtre change de vêtements et porte les cendres hors du camp en un lieu pur ; le titre suit l’ancienne numérotation 6,11')
explain(1534, ['LEV.6.4'], 'La traduction latine de l’holocauste brûlé et jeté hors du camp est examinée lexicalement.')

// Question XII — feu perpétuel.
both(1535, 'LEV.6.5', 'Le feu est entretenu sur l’autel sans s’éteindre et sert à allumer le bois du matin')
both(1535, 'LEV.6.6', 'Le feu perpétuel qui ne doit jamais s’éteindre est cité')
explain(1536, ['LEV.6.2', 'LEV.6.5', 'LEV.6.6'], 'Le feu de l’holocauste nocturne doit continuer après l’enlèvement des cendres pour consumer les victimes suivantes.')

// Question XIII — holocauste quotidien du matin et du soir.
both(1537, 'LEV.6.5', 'Le bois du matin, l’holocauste et la graisse des sacrifices pacifiques sont cités')
both(1537, 'LEV.6.6', 'Le feu perpétuel qui ne s’éteint pas conclut la citation')
explain(1538, ['LEV.6.5'], 'La répétition « le matin le matin » est interrogée comme prescription quotidienne ou horaire.')
explain(1539, ['LEV.6.5'], 'L’absence éventuelle d’une offrande privée met à l’épreuve l’interprétation d’un holocauste quotidien.')
explain(1540, ['LEV.6.5'], 'L’holocauste quotidien est compris comme la base publique sur laquelle sont placées les autres victimes.')
both(1540, 'LEV.5.7', 'Les deux tourterelles ou pigeons, l’un pour le péché et l’autre en holocauste, sont cités comme exception')
explain(1541, ['LEV.6.2', 'LEV.6.5'], 'L’holocauste brûlant toute la nuit est confronté à celui prescrit chaque matin.')
add(1541, 'EXO.29.39', 2, 'L’hypothèse d’un holocauste offert chaque soir reprend la prescription de l’agneau entre les deux soirs sans attribution explicite.')

// Question XIV — offrande du grand-prêtre au jour de son onction.
both(1542, 'LEV.6.13', 'Le don d’Aaron et de ses fils au jour de l’onction est cité selon le contenu local de l’ancienne référence 6,20')
explain(1543, ['LEV.6.13'], 'L’offrande propre au jour de l’onction du grand-prêtre est distinguée des sacrifices de consécration de l’Exode.')
both(1543, 'EXO.29.1', 'La note renvoie explicitement aux sacrifices prescrits dans l’Exode pour consacrer les prêtres')
both(1543, 'EXO.29.35', 'Les sept jours d’installation d’Aaron et de ses fils sont intentionnellement rappelés')
both(1544, 'LEV.6.13', 'Le jour de l’onction et le dixième d’épha de fleur de farine en offrande perpétuelle sont cités puis expliqués')
explain(1545, ['LEV.6.13'], 'Le caractère perpétuel est expliqué par la répétition du rite à chaque nouveau grand-prêtre.')
explain(1546, ['LEV.6.13'], 'La perpétuité est aussi comprise comme celle de la signification du sacrifice.')

// Question XV — préparation de l’offrande.
both(1547, 'LEV.6.13', 'La moitié de l’offrande le matin et l’autre moitié le soir sont citées')
both(1547, 'LEV.6.14', 'La farine préparée dans l’huile, à la poêle et offerte en morceaux est citée et analysée lexicalement')
explain(1548, ['LEV.6.14'], 'La forme grammaticale et le sens des morceaux ou de la farine très fine sont examinés.')
explain(1549, ['LEV.6.14'], 'L’indétermination lexicale entre morceaux et poudre conclut l’examen de la préparation.')

// Question XVI — succession sacerdotale et loi perpétuelle.
both(1550, 'LEV.6.14', 'L’offrande en morceaux comme odeur agréable au Seigneur est citée')
both(1550, 'LEV.6.15', 'Le fils oint qui succède au grand-prêtre doit accomplir la même offrande selon une loi perpétuelle')
explain(1551, ['LEV.6.15'], 'La loi peut encore être dite perpétuelle à cause de sa signification.')

// Question XVII — offrande sacerdotale entièrement consumée.
both(1552, 'LEV.6.16', 'Toute offrande de prêtre doit être consumée entièrement et ne peut être mangée')
explain(1553, ['LEV.6.16'], '« Tout sera consumé » est confirmé comme la règle propre à l’offrande sacerdotale.')

// Question XVIII — sacrifice pour le péché mangé ou brûlé.
both(1554, 'LEV.6.19', 'Le prêtre qui offre la victime pour le péché en mange ce qui reste')
explain(1554, ['LEV.6.2'], 'Le sacrifice pour le péché est distingué de l’holocauste brûlé entièrement sur l’autel.')
both(1555, 'LEV.6.23', 'La victime dont le sang entre dans la tente pour l’expiation ne doit pas être mangée mais brûlée')
explain(1556, ['LEV.6.23'], 'L’interdiction est limitée aux sacrifices dont le sang était porté sur l’autel intérieur.')
both(1557, 'LEV.4.12', 'Le taureau offert pour le péché du prêtre est brûlé hors du camp')
both(1557, 'LEV.4.21', 'Le taureau offert pour le péché de l’assemblée est pareillement brûlé hors du camp ; la note imprimée 4,24 est fautive')
explain(1557, ['LEV.6.23'], 'La règle finale du chapitre résume les deux cas antérieurs où la victime est brûlée hors du camp.')

// Question XIX — bélier pour le délit.
both(1558, 'LEV.7.1', 'La loi du bélier offert pour le délit et son caractère très saint sont cités')
explain(1558, ['LEV.7.6'], 'Le caractère très saint est expliqué par le droit des prêtres de manger la chair restante.')

// Question XX — distinction et emploi réciproque de péché et délit.
for (const segmentNumero of [1559, 1575, 1588]) both(segmentNumero, 'LEV.7.7', 'La loi unique du sacrifice pour le péché et pour le délit est citée comme verset directeur')
for (const segmentNumero of [1560, 1561, 1562, 1563, 1564, 1565, 1566, 1567, 1568, 1569, 1570, 1571, 1572, 1573, 1574, 1576, 1577, 1578, 1579, 1580, 1581, 1582, 1583, 1584, 1585, 1586, 1587]) {
  add(segmentNumero, 'LEV.7.7', 3, 'La distinction puis l’emploi réciproque des mots péché et délit expliquent la loi unique des deux sacrifices.')
}
both(1562, 'PSA.36.27', '« Détourne-toi du mal et fais le bien » est cité pour distinguer abandon du bien et pratique du mal')
both(1564, 'GAL.6.1', 'L’homme surpris dans une faute ou un délit est cité pour analyser le grec paraptôma')
both(1571, 'PSA.18.13', 'La question « Qui connaît ses égarements ? » est citée pour relier le délit à l’ignorance')
both(1572, 'PSA.68.6', 'Dieu connaissant la folie du psalmiste et ses fautes non cachées est cité ; la note imprimée Psaume 58,6 est fautive')
both(1573, 'GAL.6.1', 'La chute par surprise dans une faute est citée de nouveau comme effet de l’imprudence')
both(1574, 'JAS.4.17', 'Celui qui sait faire le bien et ne le fait pas commet un péché est cité comme définition')
both(1577, 'MAT.26.28', 'Le sang du Christ répandu pour la rémission des péchés est cité pour montrer que le terme inclut aussi les délits')
both(1578, 'ROM.5.16', 'La condamnation pour une faute et la justification de beaucoup de fautes sont citées pour l’emploi englobant du terme délit')
both(1579, 'LEV.4.13', 'Le péché par ignorance de toute l’assemblée est cité comme cas où délit et péché désignent la même faute')
both(1580, 'LEV.4.22', 'Le chef qui pèche involontairement et se rend coupable est cité comme second emploi des deux termes')
both(1581, 'LEV.4.27', 'La personne du peuple qui pèche involontairement et se rend coupable est citée')
both(1581, 'LEV.4.28', 'La connaissance ultérieure de son péché complète la citation mêlant délit et péché')
both(1582, 'LEV.5.4', 'Le serment inconsidéré de faire du mal ou du bien est cité')
both(1582, 'LEV.5.5', 'L’aveu du péché contracté par le serment est cité')
both(1582, 'LEV.5.6', 'L’offrande d’expiation pour le péché est citée comme exemple d’alternance terminologique')
both(1583, 'LEV.5.15', 'L’infidélité involontaire envers les choses saintes et le bélier de réparation sont cités')
both(1583, 'LEV.5.16', 'La restitution majorée et l’expiation par le prêtre sont citées')
both(1584, 'LEV.5.17', 'Celui qui pèche sans le savoir contre un précepte est cité')
both(1584, 'LEV.5.18', 'Le bélier de réparation et le pardon de l’erreur involontaire sont cités')
both(1585, 'LEV.5.19', 'La qualification finale de sacrifice de réparation et de culpabilité devant le Seigneur est citée')
both(1586, 'LEV.5.21', 'Le mensonge relatif au dépôt, au gage, au vol ou à la violence est cité selon la cible locale de l’ancienne référence Lévitique 6,1-7')
both(1586, 'LEV.5.22', 'Le déni d’un objet trouvé et le faux serment sont cités')
both(1586, 'LEV.5.23', 'La restitution de l’objet volé, ravi, confié ou trouvé est citée')
both(1587, 'LEV.5.24', 'La restitution avec un cinquième supplémentaire au propriétaire est citée')
both(1587, 'LEV.5.25', 'Le bélier sans défaut offert pour la réparation est cité')
both(1587, 'LEV.5.26', 'L’expiation par le prêtre et le pardon de toute faute concluent la citation')

const NON_RESOLUS = [
  [1534, 4, 'RÉFÉRENCE NON BIBLIQUE — traduction ajoutée par certains interprètes latins au terme holocarpoma ; cible de corpus à constituer.'],
  [1552, 4, 'RÉFÉRENCE NON BIBLIQUE — variante de traduction attribuée à plusieurs interprètes pour « tout sera mis dessus » ; cible de corpus à constituer.'],
  [1568, 4, 'RÉFÉRENCE NON BIBLIQUE — préférence de plusieurs traducteurs pour negligentia plutôt que delictum ; cible de corpus à constituer.'],
  [1569, 4, 'RÉFÉRENCE NON BIBLIQUE — étymologie latine de lex par legere ou eligere attribuée aux auteurs latins ; cible de corpus à constituer.'],
]
const SANS_LIEN = new Set()

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: segments, error } = await sb.from('segments').select('id,segment_numero,segment_texte,notes,ref_niv1,ref_niv2,ref_niv2_texte,liens_revus_le,liens_revus_par').eq('id_oeuvre', OEUVRE).eq('ref_niv1', REF_NIV1).in('ref_niv2', QUESTIONS).order('segment_numero')
if (error) throw error
if (segments.length !== NB_SEGMENTS || segments.some((segment, index) => segment.segment_numero !== PREMIER + index)) throw new Error('Préétat : bornes ou continuité invalides')
if ([...new Set(segments.map((segment) => segment.ref_niv2))].join('|') !== QUESTIONS.join('|')) throw new Error('Questions incomplètes ou désordonnées')
if (segments.some((segment) => segment.ref_niv1 !== REF_NIV1 || segment.liens_revus_le || segment.liens_revus_par)) throw new Error('Préétat structurel ou relecture invalide')
const empreinte = createHash('sha256').update(JSON.stringify(segments.map((segment) => [segment.id, segment.segment_numero, segment.ref_niv1, segment.ref_niv2, segment.ref_niv2_texte, segment.segment_texte, segment.notes]))).digest('hex')
if (empreinte !== EMPREINTE_ATTENDUE) throw new Error(`Préétat modifié : ${empreinte}`)

const parNumero = new Map(segments.map((segment) => [segment.segment_numero, segment]))
const numerosClasses = new Set([...LIENS, ...NON_RESOLUS].map(([segmentNumero]) => segmentNumero))
const nonClasses = segments.filter((segment) => !numerosClasses.has(segment.segment_numero) && !SANS_LIEN.has(segment.segment_numero))
if (nonClasses.length) throw new Error(`Partition incomplète : ${nonClasses.map((segment) => segment.segment_numero)}`)
if ([...SANS_LIEN].some((segmentNumero) => numerosClasses.has(segmentNumero) || !parNumero.has(segmentNumero))) throw new Error('Déclaration SANS_LIEN invalide')
if (LIENS.some(([segmentNumero, canonId, type, motif]) => !parNumero.has(segmentNumero) || !canonId || ![1, 2, 3, 4].includes(type) || !motif.trim())) throw new Error('Manifeste biblique invalide')
if (NON_RESOLUS.some(([segmentNumero, type, motif]) => !parNumero.has(segmentNumero) || type !== 4 || !motif.startsWith('RÉFÉRENCE NON BIBLIQUE'))) throw new Error('Référence sans cible invalide')
const cles = LIENS.map(([segmentNumero, canonId, type]) => `${segmentNumero}|${canonId}|${type}`)
if (new Set(cles).size !== cles.length) throw new Error('Doublon interne')

const cibles = [...new Set(LIENS.map(([, canonId]) => canonId))]
const { data: temoins, error: temoinsError } = await sb.from('versets_lecture').select('id_verset,"TR0001","TR0003","TR0004"').in('id_verset', cibles)
if (temoinsError) throw temoinsError
const temoinsParId = new Map(temoins.map((temoin) => [temoin.id_verset, temoin]))
const ciblesInvalides = cibles.filter((canonId) => { const temoin = temoinsParId.get(canonId); return !temoin || (!temoin.TR0001 && !temoin.TR0003 && !temoin.TR0004) })
if (ciblesInvalides.length) throw new Error(`Cibles invalides : ${ciblesInvalides.join(', ')}`)
const ids = segments.map((segment) => segment.id)
const { count: liensExistants, error: liensError } = await sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids)
if (liensError) throw liensError
if (liensExistants) throw new Error(`${liensExistants} liens existent déjà dans le lot`)

const TOTAL = LIENS.length + NON_RESOLUS.length
const types = LIENS.reduce((compte, [, , type]) => { compte[type] = (compte[type] ?? 0) + 1; return compte }, {})
for (const [, type] of NON_RESOLUS) types[type] = (types[type] ?? 0) + 1
const liensParQuestion = Object.fromEntries(QUESTIONS.map((question) => {
  const numeros = new Set(segments.filter((segment) => segment.ref_niv2 === question).map((segment) => segment.segment_numero))
  return [question, [...LIENS, ...NON_RESOLUS].filter(([segmentNumero]) => numeros.has(segmentNumero)).length]
}))
console.log(JSON.stringify({
  mode: WRITE ? 'écriture' : 'contrôle', lot: 'Lévitique XI-XX', ref_niv1: REF_NIV1,
  bornes: [PREMIER, DERNIER], segments: segments.length, liens_bibliques: LIENS.length,
  sans_cible_a_constituer: NON_RESOLUS.length, total_liens: TOTAL, sans_lien: [...SANS_LIEN],
  cibles_distinctes: cibles.length, types, liens_par_question: liensParQuestion, empreinte,
  avancement_actuel: '1412 / 3262 = 43,29 %', avancement_potentiel_apres_ecriture: '1468 / 3262 = 45,00 %',
}, null, 2))
if (DETAIL) for (const [segmentNumero, canonId, type, motif] of LIENS) { const temoin = temoinsParId.get(canonId); console.log({ segmentNumero, canonId, type, motif, segment: parNumero.get(segmentNumero).segment_texte, temoin: temoin.TR0003 || temoin.TR0001 || temoin.TR0004 }) }
if (!WRITE) process.exit(0)

const quote = (value) => `'${String(value).replaceAll("'", "''")}'`
const valeurs = [
  ...LIENS.map(([segmentNumero, canonId, type, motif]) => `(${parNumero.get(segmentNumero).id}, ${quote(canonId)}, ${type}, 'vérifié', ${quote(motif)}, 'lecture', false)`),
  ...NON_RESOLUS.map(([segmentNumero, type, motif]) => `(${parNumero.get(segmentNumero).id}, null, ${type}, 'à constituer', ${quote(motif)}, 'lecture', true)`),
].join(',\n    ')
const idSql = ids.join(', ')
const sql = `
do $p$
declare
  n integer;
begin
  if exists (
    select 1 from liens_bibliques where segment_id in (${idSql})
  ) then
    raise exception 'Liens présents';
  end if;
  if exists (
    select 1 from segments where id in (${idSql})
      and (liens_revus_le is not null or liens_revus_par is not null)
  ) then
    raise exception 'Déjà relu';
  end if;
  insert into liens_bibliques (segment_id, canon_id, type, fiabilite, motif, provenance, arbitrage_requis) values
    ${valeurs};
  get diagnostics n = row_count;
  if n <> ${TOTAL} then
    raise exception 'Liens insérés : %', n;
  end if;
  update segments set liens_revus_le = now(), liens_revus_par = ${quote(RELECTEUR)} where id in (${idSql});
  get diagnostics n = row_count;
  if n <> ${NB_SEGMENTS} then
    raise exception 'Segments relus : %', n;
  end if;
end
$p$;
`
const { error: writeError } = await sb.rpc('exec_sql', { sql })
if (writeError) throw writeError
const [{ count: liensApres, error: e1 }, { count: relusApres, error: e2 }, { data: audit, error: e3 }] = await Promise.all([
  sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  sb.from('segments').select('id', { count: 'exact', head: true }).in('id', ids).not('liens_revus_le', 'is', null),
  sb.from('liens_bibliques').select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id', ids),
])
if (e1 || e2 || e3) throw e1 || e2 || e3
if (liensApres !== TOTAL || relusApres !== NB_SEGMENTS || audit.some((lien) => !lien.motif || lien.provenance !== 'lecture' || (lien.canon_id ? (lien.fiabilite !== 'vérifié' || lien.arbitrage_requis) : (lien.fiabilite !== 'à constituer' || !lien.arbitrage_requis || lien.type !== 4 || !lien.motif.startsWith('RÉFÉRENCE NON BIBLIQUE'))))) throw new Error('Postcontrôle invalide')
const clesApres = audit.map((lien) => `${lien.segment_id}|${lien.canon_id ?? 'sans-cible'}|${lien.type}|${lien.motif}`)
if (new Set(clesApres).size !== clesApres.length) throw new Error('Doublon dans le postétat')
console.log(`✓ ${liensApres} liens ; ${relusApres} segments relus`)
