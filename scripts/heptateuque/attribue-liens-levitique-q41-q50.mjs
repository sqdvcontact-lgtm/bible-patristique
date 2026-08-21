import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const DEBUT = 1739
const FIN = 1779
const TOTAL_SEGMENTS = 41
const QUESTIONS = ['Question XLI', 'Question XLII', 'Question XLIII', 'Question XLIV', 'Question XLV', 'Question XLVI', 'Question XLVII', 'Question XLVIII', 'Question XLIX', 'Question L']
const WRITE = process.argv.includes('--write')
const DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Lévitique Q. XLI-L'
const EMPREINTE_ATTENDUE = '8811e1ab12d9ba6cc718ee9d3f4dd597f1c4d724efa7ef7e324bc993c8b5cadb'
const SANS_LIEN = new Set()
const LIENS = []
const NON_RESOLUS = []

const add = (ns, canonId, type, motif) => {
  for (const numero of ns) LIENS.push([numero, canonId, type, motif])
}
const cite = (n, canonId, motif) => add([n], canonId, 1, motif)
const com = (ns, canonId, motif) => add(ns, canonId, 3, motif)
const citeCom = (n, canonId, citation, commentaire) => {
  cite(n, canonId, citation)
  com([n], canonId, commentaire)
}
const nonBiblique = (n, motif) => NON_RESOLUS.push([n, 4, `RÉFÉRENCE NON BIBLIQUE ${motif}`])

// Question XLI — vocabulaire de la tache lépreuse (Lévitique 13,2).
citeCom(1739, 'LEV.13.2', 'Citation explicite vérifiée de la cicatrice luisante et de la tache de couleur lépreuse.', 'Les deux membres de Lévitique 13,2 sont étudiés comme description d’un même signe cutané.')
com([1740, 1741, 1742, 1743, 1744, 1745, 1746, 1747], 'LEV.13.2', 'Le vocabulaire grec et latin de la cicatrice, de l’atteinte et de la tache est directement expliqué dans la continuité du verset.')
nonBiblique(1743, '(commentateurs non identifiés) : choix du latin maculam à la place de tactum pour traduire la marque lépreuse ; références à constituer.')
cite(1745, 'EPH.5.27', 'Citation explicite vérifiée, avec note, de l’Église sans tache ni ride.')
nonBiblique(1746, '(traducteurs latins non identifiés) : refus de conserver l’audace lexicale de la Septante pour ἁφήν ; références à constituer.')

// Question XLII — « rendre impur » signifie déclarer impur.
citeCom(1748, 'LEV.13.3', 'Citation explicite vérifiée du prêtre examinant le malade et le déclarant impur.', 'Le verbe rendu par « rendre impur » est expliqué comme une déclaration sacerdotale, non comme la cause de la maladie.')

// Question XLIII — blanc luisant et changement de la marque.
citeCom(1749, 'LEV.13.4', 'Citation explicite vérifiée de la tache blanche non enfoncée et du poil demeuré de sa couleur.', 'Le blanc luisant est rapporté à la tache cutanée et non au poil.')
citeCom(1750, 'LEV.13.7', 'Citation explicite vérifiée, avec note, de la marque qui s’étend après une première déclaration de pureté.', 'Le même terme grec σημασίαν est relevé pour désigner la marque cutanée.')
citeCom(1750, 'LEV.13.2', 'Référence explicite vérifiée, avec note, au signe initial de la plaie lépreuse.', 'Le vocabulaire de Lévitique 13,7 est comparé à celui de la première description en Lévitique 13,2.')

// Question XLIV — deuxième examen et déclaration de pureté.
citeCom(1751, 'LEV.13.5', 'Citation explicite vérifiée du second isolement de sept jours.', 'Le premier examen et la seconde période d’observation sont intégrés à l’explication de la tache qui ne s’étend pas.')
citeCom(1751, 'LEV.13.6', 'Citation explicite vérifiée de la tache devenue obscure, de la déclaration de pureté et du lavage des vêtements.', 'La formule « il purifiera » est expliquée comme « il déclarera pur ».')

// Question XLV — observation pendant deux semaines et signes opposés.
citeCom(1752, 'LEV.13.7', 'Citation explicite vérifiée de la marque qui s’étend après que le malade a été vu pour être déclaré pur.', 'Le retour devant le prêtre est expliqué comme conséquence du changement de la marque.')
citeCom(1752, 'LEV.13.8', 'Citation explicite vérifiée du second examen et de la déclaration de lèpre.', 'Le prêtre déclare impur l’homme dont la marque s’est étendue.')
com([1753], 'LEV.13.8', 'La formule « rendre impur » est de nouveau interprétée comme déclaration sacerdotale.')
com([1754], 'LEV.13.3', 'La blancheur du poil et l’enfoncement de la peau sont repris comme signes certains de lèpre.')
com([1754], 'LEV.13.4', 'La tache blanche sans dépression ni poil blanc ouvre au contraire la période d’observation.')
com([1754], 'LEV.13.5', 'Le premier examen après sept jours est replacé dans la règle d’épreuve progressive.')
com([1754], 'LEV.13.6', 'Le second examen permet la déclaration de pureté si la tache est devenue obscure et ne s’est pas étendue.')
citeCom(1755, 'LEV.13.4', 'Citation explicite vérifiée, avec note, de la tache blanche sans dépression et sans poil devenu blanc.', 'Les signes insuffisants conduisent à un premier isolement de sept jours.')
citeCom(1755, 'LEV.13.5', 'Citation explicite vérifiée du premier examen au septième jour, malgré la note imprimée « Ib. VI ».', 'L’absence de changement lors du premier examen commande un second isolement.')
citeCom(1756, 'LEV.13.5', 'Citation explicite vérifiée du second isolement de sept jours.', 'Les sept autres jours sont distingués de la première période d’observation.')
citeCom(1756, 'LEV.13.6', 'Citation explicite vérifiée du second examen et de la tache devenue obscure.', 'La disparition de la blancheur luisante fonde la déclaration de pureté.')
com([1757], 'LEV.13.6', 'La déclaration de pureté est expliquée par l’absence de lèpre au terme de la double observation.')
citeCom(1758, 'LEV.13.6', 'Citation explicite vérifiée, avec note, de la dartre non lépreuse, du lavage des vêtements et de la pureté.', 'Le lavage est maintenu même lorsque le signe n’a pas évolué en lèpre.')

// Question XLVI — extension secondaire de la marque.
citeCom(1759, 'LEV.13.7', 'Citation explicite vérifiée de la marque qui s’étend après la première présentation au prêtre.', 'Le changement après un état sain relatif est interprété comme rechute.')
citeCom(1759, 'LEV.13.8', 'Citation explicite vérifiée du nouvel examen et de la déclaration de lèpre.', 'L’extension de la marque suffit à la déclaration d’impureté.')
com([1760, 1761], 'LEV.13.7', 'La modification de la marque après la première constatation est expliquée comme rechute caractéristique.')
com([1760, 1761], 'LEV.13.8', 'Le changement de couleur suffit à constater la lèpre sans attendre dépression de la peau et blancheur du poil.')

// Question XLVII — lèpre invétérée, couverture totale et chair vive.
citeCom(1762, 'LEV.13.9', 'Citation explicite vérifiée de l’homme atteint d’une plaie de lèpre amené au prêtre.', 'La nouvelle espèce de lèpre ouvre l’analyse de la maladie invétérée.')
citeCom(1762, 'LEV.13.10', 'Citation explicite vérifiée de la tumeur blanche, du poil blanchi et de la chair vive.', 'La construction de la phrase grecque décrivant les transformations de la peau et du cheveu est directement expliquée.')
com([1763, 1764], 'LEV.13.10', 'La suppression d’une conjonction et le rétablissement de l’ordre syntaxique clarifient le blanchiment du cheveu et la cicatrice.')
citeCom(1765, 'LEV.13.11', 'Citation explicite vérifiée, avec note, de la lèpre invétérée déclarée impure sans isolement.', 'L’absence d’isolement est expliquée par la certitude immédiate des signes.')
com([1766], 'LEV.13.11', 'La blancheur simultanée de la peau et des poils rend inutile l’épreuve de deux semaines.')
citeCom(1767, 'LEV.13.13', 'Référence intentionnelle vérifiée à la déclaration de pureté lorsque toute la peau est devenue blanche.', 'L’uniformité de la couleur sur tout le corps est opposée au retour de chair vive.')
citeCom(1767, 'LEV.13.14', 'Citation explicite vérifiée, avec note, de la chair vive qui reparaît et rend l’homme impur.', 'La variation de couleur est identifiée comme indice du mal.')
citeCom(1767, 'LEV.13.16', 'Citation explicite vérifiée, avec note, de la chair vive redevenue blanche.', 'Le retour à une blancheur uniforme prépare la nouvelle déclaration de pureté.')
citeCom(1768, 'LEV.13.16', 'Citation explicite vérifiée de la chair vive qui change et redevient blanche.', 'La transformation vers le blanc est suivie d’une nouvelle présentation au prêtre.')
citeCom(1768, 'LEV.13.17', 'Citation explicite vérifiée, avec note, du prêtre déclarant pur celui dont la plaie est devenue blanche.', 'Le blanchiment intégral est directement expliqué comme disparition de la diversité de couleur.')
com([1769, 1770, 1771], 'LEV.13.16', 'Le verbe « redevenir » est analysé pour déterminer comment la chair vive redevient blanche.')
com([1769, 1770, 1771], 'LEV.13.17', 'La déclaration finale de pureté est fondée sur l’uniformité blanche de la peau.')

// Question XLVIII — le nétheq de la tête et le terme θραῦσμα.
citeCom(1772, 'LEV.13.30', 'Référence intentionnelle vérifiée à la plaie de la tête ou de la barbe, plus profonde et accompagnée d’un poil jaunâtre.', 'Le terme grec θραῦσμα est interrogé comme désignation d’une atteinte sans douleur ni secousse.')
com([1773], 'LEV.13.30', '« Ébranlement » est proposé comme synonyme d’atteinte pour désigner cette impureté de la tête.')

// Question XLIX — lèpre des vêtements et autres ouvrages textiles.
citeCom(1774, 'LEV.13.47', 'Citation explicite vérifiée de la lèpre apparaissant dans un vêtement de laine ou de lin.', 'La mention initiale des vêtements est distinguée de l’énumération plus générale qui suit.')
citeCom(1774, 'LEV.13.48', 'Citation explicite vérifiée de la chaîne, de la trame, de la peau et des ouvrages faits de peau.', 'La portée de l’énumération des matières et objets est directement discutée.')
com([1775, 1776], 'LEV.13.47', 'Les vêtements de laine et de lin sont compris comme première catégorie particulière.')
com([1775, 1776], 'LEV.13.48', 'La chaîne, la trame et les autres objets étendent ensuite la prescription à tous les ouvrages de laine ou de lin.')

// Question L — peau destinée au travail et parallèle de 1 Samuel 20,19.
citeCom(1777, 'LEV.13.48', 'Citation explicite vérifiée de la peau ou de tout ouvrage fait de peau.', 'L’adjectif grec ἐργασίμῳ est expliqué comme « destiné au travail » plutôt que simplement « travaillé ».')
nonBiblique(1777, '(interprètes non identifiés) : traduction de ἐργασίμῳ par « peau travaillée » au lieu de « peau de travail » ; références à constituer.')
com([1778, 1779], 'LEV.13.48', 'La comparaison lexicale confirme qu’il s’agit d’une peau destinée à un usage laborieux plutôt qu’à la seule ornementation.')
cite(1778, '1SA.20.19', 'Citation explicite vérifiée, avec note ancienne « I Rois 20,19 », du jour de travail mentionné par Jonathan à David.')

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .map(line => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
    .filter(Boolean)
    .map(match => [match[1], match[2].replace(/^["']|["']$/g, '')]),
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const { data: bruts, error: e0 } = await sb
  .from('segments')
  .select('id,segment_numero,ref_niv1,ref_niv2,ref_niv2_texte,segment_texte,texte_original,notes,nature,liens_revus_le,liens_revus_par')
  .eq('id_oeuvre', OEUVRE)
  .gte('segment_numero', DEBUT - 1)
  .lte('segment_numero', FIN + 1)
  .order('segment_numero')
if (e0) throw e0

const voisinAvant = bruts.find(segment => segment.segment_numero === DEBUT - 1)
const voisinApres = bruts.find(segment => segment.segment_numero === FIN + 1)
if (voisinAvant?.ref_niv1 !== 'Livre troisième' || voisinAvant?.ref_niv2 !== 'Question XL') throw Error('Raccord amont invalide')
if (voisinApres?.ref_niv1 !== 'Livre troisième' || voisinApres?.ref_niv2 !== 'Question LI') throw Error('Raccord aval invalide')

const segments = bruts.filter(segment => segment.segment_numero >= DEBUT && segment.segment_numero <= FIN)
if (
  segments.length !== TOTAL_SEGMENTS
  || segments.some((segment, index) => segment.segment_numero !== DEBUT + index)
  || segments.some(segment => segment.ref_niv1 !== 'Livre troisième' || !QUESTIONS.includes(segment.ref_niv2))
  || [...new Set(segments.map(segment => segment.ref_niv2))].join('|') !== QUESTIONS.join('|')
) throw Error('Préétat structurel invalide')
if (segments.some(segment => segment.liens_revus_le || segment.liens_revus_par)) throw Error('Lot déjà relu')

const empreinte = createHash('sha256')
  .update(JSON.stringify(segments.map(segment => [segment.id, segment.segment_numero, segment.ref_niv1, segment.ref_niv2, segment.ref_niv2_texte, segment.segment_texte, segment.texte_original, segment.notes, segment.nature])))
  .digest('hex')
if (empreinte !== EMPREINTE_ATTENDUE) throw Error(`Empreinte inattendue : ${empreinte}`)

const parNumero = new Map(segments.map(segment => [segment.segment_numero, segment]))
const numerosClasses = new Set([...LIENS, ...NON_RESOLUS].map(lien => lien[0]))
const nonClasses = segments.filter(segment => !numerosClasses.has(segment.segment_numero) && !SANS_LIEN.has(segment.segment_numero))
if (nonClasses.length) throw Error(`Segments non classés : ${nonClasses.map(segment => segment.segment_numero).join(', ')}`)
if (LIENS.some(([numero, canonId, type, motif]) => !parNumero.has(numero) || !canonId || ![1, 2, 3, 4].includes(type) || !motif.trim())) throw Error('Lien biblique invalide dans le manifeste')
if (NON_RESOLUS.some(([numero, type, motif]) => !parNumero.has(numero) || type !== 4 || !motif.startsWith('RÉFÉRENCE NON BIBLIQUE'))) throw Error('Référence non biblique invalide dans le manifeste')
const cles = LIENS.map(([numero, canonId, type]) => `${numero}|${canonId}|${type}`)
const vues = new Set()
const doublons = cles.filter(cle => vues.has(cle) || !vues.add(cle))
if (doublons.length) throw Error(`Doublons dans le manifeste : ${doublons.join(', ')}`)

const cibles = [...new Set(LIENS.map(([, canonId]) => canonId))]
const { data: versets, error: e1 } = await sb.from('versets_lecture').select('id_verset,TR0001,TR0003,TR0004').in('id_verset', cibles)
if (e1) throw e1
const parCible = new Map(versets.map(verset => [verset.id_verset, verset]))
const absentes = cibles.filter(cible => !parCible.has(cible))
if (absentes.length) throw Error(`Cibles absentes : ${absentes.join(', ')}`)
if (cibles.some(cible => {
  const verset = parCible.get(cible)
  return !verset.TR0001 || !verset.TR0003 || !verset.TR0004
})) throw Error('Cible incomplète dans les trois témoins locaux')

const ids = segments.map(segment => segment.id)
const { count: liensExistants, error: e2 } = await sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids)
if (e2) throw e2
if (liensExistants) throw Error(`${liensExistants} liens préexistants dans le lot`)

const total = LIENS.length + NON_RESOLUS.length
const types = LIENS.reduce((acc, lien) => {
  acc[lien[2]] = (acc[lien[2]] || 0) + 1
  return acc
}, {})
if (NON_RESOLUS.length) types[4] = (types[4] || 0) + NON_RESOLUS.length
console.log(JSON.stringify({
  mode: WRITE ? 'écriture' : 'contrôle',
  lot: 'Lévitique XLI-L',
  bornes: [DEBUT, FIN],
  voisins: { avant: [voisinAvant.segment_numero, voisinAvant.ref_niv2], apres: [voisinApres.segment_numero, voisinApres.ref_niv2] },
  ref_niv1: 'Livre troisième',
  questions: QUESTIONS,
  segments: TOTAL_SEGMENTS,
  liens: total,
  liens_bibliques: LIENS.length,
  sans_cible_a_constituer: NON_RESOLUS.length,
  sans_lien: [...SANS_LIEN],
  cibles_distinctes: cibles.length,
  types,
  empreinte,
  sic_a_arbitrer: ['Question XLVII : référence numérique 13, 9-7 [sic]', 'segment 1764 : accord « un chevelure [sic] »'],
  avancement_actuel: '1588 / 3262 = 48,68 %',
  avancement_apres_ecriture_ulterieure: '1629 / 3262 = 49,94 %',
}, null, 2))

if (DETAIL) {
  for (const [numero, canonId, type, motif] of LIENS) console.log({ numero, canonId, type, motif, segment: parNumero.get(numero).segment_texte, ...parCible.get(canonId) })
  for (const [numero, type, motif] of NON_RESOLUS) console.log({ numero, canonId: null, type, motif, segment: parNumero.get(numero).segment_texte })
}
if (!WRITE) process.exit(0)

const quote = value => `'${String(value).replaceAll("'", "''")}'`
const valeurs = [
  ...LIENS.map(([numero, canonId, type, motif]) => `(${parNumero.get(numero).id}, ${quote(canonId)}, ${type}, 'vérifié', ${quote(motif)}, 'lecture', false)`),
  ...NON_RESOLUS.map(([numero, type, motif]) => `(${parNumero.get(numero).id}, null, ${type}, 'à constituer', ${quote(motif)}, 'lecture', true)`),
].join(',\n    ')
const idsSql = ids.join(', ')
const sql = `do $passe$ declare n integer; begin
  if exists (select 1 from liens_bibliques where segment_id in (${idsSql})) then raise exception 'Liens déjà présents'; end if;
  if exists (select 1 from segments where id in (${idsSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Marques déjà présentes'; end if;
  if (select count(*) from segments where id in (${idsSql}) and id_oeuvre = '${OEUVRE}' and ref_niv1 = 'Livre troisième' and ref_niv2 in (${QUESTIONS.map(quote).join(', ')}) and segment_numero between ${DEBUT} and ${FIN}) <> ${TOTAL_SEGMENTS} then raise exception 'Préconditions structurelles invalides'; end if;
  insert into liens_bibliques (segment_id, canon_id, type, fiabilite, motif, provenance, arbitrage_requis) values ${valeurs};
  get diagnostics n = row_count; if n <> ${total} then raise exception 'Liens %/${total}', n; end if;
  update segments set liens_revus_le = now(), liens_revus_par = ${quote(RELECTEUR)} where id in (${idsSql});
  get diagnostics n = row_count; if n <> ${TOTAL_SEGMENTS} then raise exception 'Segments %/${TOTAL_SEGMENTS}', n; end if;
end $passe$;`

const { error: ecritureErreur } = await sb.rpc('exec_sql', { sql })
if (ecritureErreur) throw ecritureErreur
const [{ count: liensApres, error: e3 }, { count: relusApres, error: e4 }, { data: audit, error: e5 }] = await Promise.all([
  sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  sb.from('segments').select('id', { count: 'exact', head: true }).in('id', ids).not('liens_revus_le', 'is', null),
  sb.from('liens_bibliques').select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id', ids),
])
if (e3 || e4 || e5) throw (e3 || e4 || e5)
if (liensApres !== total || relusApres !== TOTAL_SEGMENTS || audit.some(lien => !lien.motif || lien.provenance !== 'lecture' || (lien.canon_id ? lien.fiabilite !== 'vérifié' || lien.arbitrage_requis : lien.fiabilite !== 'à constituer' || !lien.arbitrage_requis || lien.type !== 4 || !lien.motif.startsWith('RÉFÉRENCE NON BIBLIQUE')))) throw Error('Postcontrôle invalide')
console.log(`✓ ${liensApres} liens, ${relusApres} segments`)
