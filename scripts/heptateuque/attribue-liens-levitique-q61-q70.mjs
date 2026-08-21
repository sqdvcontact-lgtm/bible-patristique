import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const DEBUT = 1845
const FIN = 1887
const TOTAL_SEGMENTS = 43
const QUESTIONS = ['Question LXI', 'Question LXII', 'Question LXIII', 'Question LXIV', 'Question LXV', 'Question LXVI', 'Question LXVII', 'Question LXVIII', 'Question LXIX', 'Question LXX']
const WRITE = process.argv.includes('--write')
const DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Lévitique Q. LXI-LXX'
const EMPREINTE_ATTENDUE = '2eae1efcc1aa5148b94c915a17175b5823135c4f44642bff2ee794ad93c446ec'
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

// Question LXI — la femme du frère et l'exception du lévirat.
citeCom(1845, 'LEV.18.16', 'Citation explicite vérifiée de l’interdit de découvrir la honte de la femme du frère.', 'La portée temporelle de l’interdit, du vivant du frère ou après sa mort, ouvre toute la question.')
com([1846, 1847, 1848, 1849, 1850], 'LEV.18.16', 'La portée de l’interdit concernant la femme du frère est discutée jusqu’à sa conciliation avec le lévirat et le divorce.')
cite(1846, 'EXO.20.14', 'Référence explicite vérifiée au commandement du Décalogue contre l’adultère.')
com([1846], 'EXO.20.14', 'L’interdit particulier est rapproché de la prohibition générale de l’adultère.')
com([1847, 1848], 'LEV.18.8', 'La femme du père sert de parallèle direct pour déterminer la portée des interdits domestiques, avant et après la mort du mari.')
nonBiblique(1848, '(coutume perse non documentée) : possibilité alléguée d’épouser certaines parentes sans mari ; référence à constituer.')
citeCom(1849, 'DEU.25.5', 'Référence explicite vérifiée, avec note, au commandement du lévirat lorsque le frère meurt sans enfant.', 'Le lévirat constitue l’exception nécessaire à l’interdit de Lévitique 18,16.')
citeCom(1850, 'MAT.19.8', 'Citation explicite vérifiée, avec note, de la permission mosaïque du divorce à cause de la dureté du cœur.', 'La permission de répudier ne rend pas licite l’union ultérieure avec la femme du frère encore vivant.')

// Question LXII — la femme et sa fille.
citeCom(1851, 'LEV.18.17', 'Citation explicite vérifiée de l’interdit portant sur une femme et sa fille.', 'Le verset est expliqué comme interdiction d’épouser à la fois la mère et la fille, donc la fille de sa femme.')

// Question LXIII — petite-fille et sœur de la femme ; précédent de Jacob.
citeCom(1852, 'LEV.18.17', 'Citation explicite vérifiée de l’interdit concernant la petite-fille née du fils ou de la fille de la femme.', 'L’extension de l’interdit à la petite-fille est directement expliquée.')
citeCom(1852, 'LEV.18.18', 'Citation explicite vérifiée de l’interdit de prendre la sœur de sa femme comme seconde épouse.', 'La clause relative à la jalousie introduit la discussion qui suit.')
com([1853, 1854], 'LEV.18.18', 'Le cas de Jacob puis la signification de la clause « à cause de la jalousie » servent à préciser l’interdit des deux sœurs.')
cite(1853, 'GEN.29.22', 'Référence intentionnelle vérifiée : la note imprimée « Gen. XXX, 22 » renvoie au festin de noces préparé par Laban en Genèse 29,22.')
cite(1853, 'GEN.29.28', 'Référence intentionnelle vérifiée : la note imprimée « Gen. XXX, 28 » renvoie à l’union de Jacob avec Rachel après la semaine de Léa, en Genèse 29,28.')
com([1853], 'GEN.29.25', 'La supercherie du premier mariage de Jacob avec Léa est explicitement invoquée dans le raisonnement.')
com([1853], 'GEN.29.30', 'La préférence de Jacob pour Rachel explique que la seconde femme fut davantage celle de son choix.')

// Question LXIV — rapports pendant l’impureté menstruelle.
citeCom(1855, 'LEV.18.19', 'Citation explicite vérifiée de l’interdit de s’approcher d’une femme pendant son impureté menstruelle.', 'La séparation mensuelle et le renouvellement de l’interdit sont directement expliqués dans toute la question.')
com([1856, 1857, 1858, 1859], 'LEV.18.19', 'La répétition, la permanence morale et la finalité de l’interdit menstruel sont discutées dans la continuité du verset.')
for (let verset = 19; verset <= 27; verset++) {
  cite(1856, `LEV.15.${verset}`, `Référence explicite vérifiée incluse dans la plage Lévitique 15,19-27 donnée par la note imprimée.`)
}
cite(1858, 'EZK.18.6', 'Référence intentionnelle restaurée d’après le fac-similé : Ézéchiel 18,6 mentionne l’abstention du juste auprès d’une femme dans son impureté.')
cite(1858, 'EZK.22.10', 'Référence intentionnelle restaurée d’après le fac-similé : Ézéchiel 22,10 dénonce l’union avec une femme pendant son impureté.')

// Question LXV — adultère.
citeCom(1860, 'LEV.18.20', 'Citation explicite vérifiée de l’interdit de s’unir à la femme du prochain.', 'La répétition de l’interdit de l’adultère est directement commentée.')
citeCom(1860, 'EXO.20.14', 'Référence explicite vérifiée, avec note, au commandement du Décalogue contre l’adultère.', 'Lévitique 18,20 est présenté comme une nouvelle formulation du précepte du Décalogue.')
com([1861], 'LEV.18.20', 'La répétition est interprétée comme empêchant certains mariages même après la mort du mari.')

// Question LXVI — le « prince » de la Septante et le service cultuel.
citeCom(1862, 'LEV.18.21', 'Citation explicite vérifiée selon la leçon ancienne « servir le prince », correspondant au verset canonique relatif à Moloch.', 'Le choix de λατρεύειν est expliqué comme service cultuel rendu à un prince divinisé.')
com([1863, 1864, 1865], 'LEV.18.21', 'Le vocabulaire du service cultuel, la profanation du nom saint et la formule « Je suis le Seigneur » sont expliqués dans la continuité du verset.')
citeCom(1863, 'DEU.6.13', 'Citation explicite vérifiée, avec note ancienne, du commandement de servir Dieu seul.', 'Le service cultuel dû à Dieu seul éclaire la valeur de λατρεύειν dans Lévitique 18,21.')
cite(1864, 'LEV.11.44', 'Citation intentionnelle vérifiée de la formule « Soyez saints, parce que je suis saint ».')
cite(1865, 'LEV.11.44', 'Référence explicite vérifiée malgré la note imprimée mal ponctuée « Lev. XI, 44, 2 ; 19 ».')
cite(1865, 'LEV.19.2', 'Référence explicite vérifiée malgré la note imprimée mal ponctuée « Lev. XI, 44, 2 ; 19 ».')
cite(1865, '1PE.1.16', 'Référence explicite vérifiée de la reprise pétrinienne « Soyez saints, parce que je suis saint ».')

// Question LXVII — la terre personnifiée par ses habitants.
citeCom(1866, 'LEV.18.25', 'Citation explicite vérifiée de la terre qui a en horreur ceux qui l’habitent.', 'La personnification de la terre est expliquée par métonymie pour ses habitants.')
com([1867], 'LEV.18.25', 'La souillure et l’horreur de la terre sont rapportées aux hommes souillés ou effrayés par ces crimes.')

// Question LXVIII — vol, mensonge, calomnie et exemples bibliques.
citeCom(1868, 'LEV.19.11', 'Citation explicite vérifiée des interdits de voler, mentir et calomnier le prochain.', 'Toute la question examine la portée et les exceptions supposées de ces trois interdits.')
com([1869, 1870, 1871, 1872, 1873, 1874, 1875, 1876, 1877, 1878, 1879, 1880, 1881], 'LEV.19.11', 'Le vol, le mensonge et la calomnie sont définis et confrontés aux préceptes et exemples bibliques dans la continuité de Lévitique 19,11.')
cite(1868, 'EXO.20.15', 'Référence intentionnelle vérifiée au commandement du Décalogue contre le vol.')
cite(1869, 'EXO.20.15', 'Référence explicite incluse dans la note Exode 20,15-16 et vérifiée pour l’interdit du vol.')
citeCom(1869, 'EXO.20.16', 'Citation explicite vérifiée, avec note, de l’interdit du faux témoignage contre le prochain.', 'Le mensonge et la calomnie sont rapportés à la notion générale de faux témoignage.')
cite(1872, 'GEN.44.5', 'Référence explicite vérifiée à l’accusation de vol de la coupe de Joseph.')
cite(1872, 'GEN.42.9', 'Référence explicite vérifiée à l’accusation portée par Joseph contre ses frères, traités d’espions.')
cite(1872, 'GEN.42.14', 'Référence explicite vérifiée à la répétition de l’accusation d’espionnage par Joseph.')
cite(1875, 'EXO.20.4', 'Référence explicite vérifiée, avec note, à l’interdit de fabriquer une idole.')
cite(1875, 'EXO.20.14', 'Référence explicite vérifiée, avec note, à l’interdit de l’adultère.')
cite(1875, 'EXO.20.15', 'Référence explicite vérifiée, avec note, à l’interdit du vol.')
cite(1875, 'EXO.20.13', 'Référence explicite vérifiée, avec note, à l’interdit de tuer.')
cite(1876, 'EXO.20.15', 'Citation explicite vérifiée du commandement « Tu ne déroberas point ».')
cite(1876, 'EXO.20.13', 'Citation explicite vérifiée du commandement « Tu ne tueras point ».')
cite(1877, 'EXO.1.19', 'Référence explicite vérifiée au mensonge des sages-femmes égyptiennes.')
cite(1877, 'EXO.1.20', 'Référence explicite vérifiée à la récompense accordée par Dieu aux sages-femmes.')
cite(1877, 'JOS.2.4', 'Référence explicite vérifiée au mensonge de Rahab en faveur des espions.')
cite(1877, 'JOS.6.23', 'Référence explicite vérifiée au salut de Rahab et de sa famille.')
com([1878, 1880], 'JOS.2.4', 'Le mensonge de Rahab est discuté comme faute pardonnée en raison de la délivrance des espions.')
com([1880], 'JOS.6.23', 'Le salut de Rahab est interprété comme récompense de la délivrance des espions, non de son mensonge.')
com([1879], 'EXO.1.19', 'Le mensonge des sages-femmes est tenu pour une faute vénielle atténuée par leur bonté.')
com([1879], 'EXO.1.20', 'La récompense divine est rapportée au salut accordé aux enfants hébreux plutôt qu’au mensonge lui-même.')

// Question LXIX — principe général de ne pas nuire.
citeCom(1882, 'LEV.19.13', 'Citation explicite vérifiée du commandement de ne pas nuire au prochain.', 'Le précepte est expliqué comme principe général résumant les interdits envers autrui.')
citeCom(1883, 'LEV.19.13', 'Citation explicite vérifiée de l’interdit de ravir qui suit dans le même verset.', 'Le rapt est interdit lorsqu’il nuit, mais peut être requis pour empêcher un mal immédiat.')

// Question LXX — correction fraternelle et vengeance.
citeCom(1884, 'LEV.19.17', 'Citation explicite vérifiée de l’interdit de haïr son frère et du devoir de reprendre son prochain.', 'La correction fraternelle est étudiée comme devoir qui empêche de participer au péché du prochain.')
citeCom(1884, 'LEV.19.18', 'Citation explicite vérifiée de la clause ancienne « ta main n’est pas vengée » immédiatement rattachée à la correction.', 'La clause est interrogée comme interdiction de la vengeance plutôt que comme absence de punition.')
com([1885], 'LEV.19.17', 'La reprise du prochain est expliquée comme acte de charité sans haine intérieure.')
com([1886, 1887], 'LEV.19.18', 'Le désir de vengeance et la variante « ta main ne se vengera pas » sont expliqués dans la continuité de l’interdit de se venger.')
cite(1887, 'LEV.19.18', 'Citation explicite vérifiée de l’interdit ancien de se mettre en colère contre les enfants de son peuple ; la note Exode 20,4,14-15,13 est une répétition parasite et n’est pas attribuée ici.')
nonBiblique(1887, '(plusieurs exemplaires bibliques non identifiés) : variante « Et ta main ne se vengera pas » ; témoins à constituer.')

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
if (voisinAvant?.ref_niv1 !== 'Livre troisième' || voisinAvant?.ref_niv2 !== 'Question LX') throw Error('Raccord amont invalide')
if (voisinApres?.ref_niv1 !== 'Livre troisième' || voisinApres?.ref_niv2 !== 'Question LXXI') throw Error('Raccord aval invalide')

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
  lot: 'Lévitique LXI-LXX',
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
  sic_verifie_fac_simile: ['segment 1876 : « nous avons donné [sic] » est imprimé ainsi, page scan 505 (page imprimée 497)'],
  anciennes_numerotations_arbitrees: ['segment 1853 : Gen. XXX,22,28 → Genèse 29,22 et 29,28', 'segment 1858 : Lev. XVIII,6 ;22,10 → Ézéchiel 18,6 et 22,10', 'segment 1865 : Lev. XI,44,2 ;19 ;1Pi.1,16 → Lévitique 11,44 ; 19,2 ; 1 Pierre 1,16', 'segment 1887 : note Exode répétée parasite, non attribuée'],
  avancement_actuel: '1779 / 3262 = 54,54 %',
  avancement_apres_ecriture_ulterieure: '1822 / 3262 = 55,86 %',
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
