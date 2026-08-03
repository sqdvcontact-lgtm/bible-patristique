import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre premier'
const PREMIER_SEGMENT = 336
const DERNIER_SEGMENT = 375
const NB_SEGMENTS = 40
const EMPREINTE_TEXTE = 'b26ac023c74c0436ff97c08b6f397c22f0f0d81ba753f5751bcdf90e28e3a632'
const WRITE = process.argv.includes('--write')
const RELECTEUR = 'Codex (IA) — lecture intégrale Heptateuque, Genèse Q. CXI-CXX'
const QUESTIONS_ATTENDUES = [
  'Question CXI', 'Question CXII', 'Question CXIII', 'Question CXIV', 'Question CXV',
  'Question CXVI', 'Question CXVII', 'Question CXVIII', 'Question CXIX', 'Question CXX',
]

// Partition exhaustive : chaque segment du lot figure dans LIENS ou SANS_LIEN.
const SANS_LIEN = new Set()

// Manifeste établi après lecture de chaque segment et confrontation aux témoins
// TR0001, TR0003 et TR0004. Format : [segment_numero, canon_id, type, motif].
const LIENS = [
  [336, 'GEN.35.2', 1, 'Citation explicite vérifiée de l’ordre de rejeter les dieux étrangers avant la montée à Béthel.'],
  [336, 'GEN.35.4', 1, 'Citation explicite vérifiée des dieux étrangers et des pendants d’oreilles remis à Jacob.'],
  [336, 'GEN.35.4', 3, 'La présence des pendants d’oreilles parmi les objets enfouis ouvre la question de leur fonction idolâtrique.'],
  [337, 'GEN.35.4', 3, 'Les pendants de Genèse 35,4 sont interprétés comme amulettes plutôt que comme simples ornements.'],
  [338, 'GEN.24.47', 1, 'Référence intentionnelle vérifiée aux pendants donnés à Rébecca par le serviteur d’Abraham.'],
  [338, 'GEN.35.4', 3, 'Le précédent de Rébecca distingue l’ornement licite des amulettes idolâtriques de Genèse 35,4.'],

  [339, 'GEN.35.5', 1, 'Citation explicite vérifiée de la terreur divine répandue sur les villes et de l’absence de poursuite.'],
  [339, 'GEN.35.5', 3, 'La crainte de Genèse 35,5 est attribuée à l’action de Dieu fidèle à ses promesses envers Jacob.'],

  [340, 'GEN.35.6', 1, 'Citation explicite vérifiée de l’arrivée de Jacob à Luz, appelée Béthel, en Chanaan.'],
  [340, 'GEN.28.19', 1, 'Référence éditoriale vérifiée au premier récit où la ville est nommée Luz et reçoit le nom de Béthel ; « Ulammaüs » reflète une variante grecque.'],
  [340, 'GEN.35.15', 1, 'Référence éditoriale vérifiée au renouvellement du nom Béthel.'],
  [340, 'GEN.35.6', 3, 'Les différents noms de la ville mentionnée en Genèse 35,6 sont recensés et comparés.'],
  [340, 'GEN.28.19', 3, 'Genèse 28,19 fournit le premier état du rapport entre Luz et Béthel.'],
  [340, 'GEN.35.15', 3, 'Genèse 35,15 fournit le renouvellement du nom Béthel.'],
  [341, 'GEN.35.6', 3, 'La pluralité des noms géographiques est donnée comme explication générale de Genèse 35,6.'],

  [342, 'GEN.35.9', 1, 'Référence intentionnelle vérifiée à la nouvelle apparition de Dieu à Jacob après son retour.'],
  [342, 'GEN.35.10', 1, 'Citation explicite vérifiée du changement de Jacob en Israël.'],
  [342, 'GEN.32.29', 1, 'Référence intentionnelle vérifiée à la première attribution du nom Israël ; la note imprimée « Gen. XXXII, 28 » vise le créneau local 32,29.'],
  [342, 'GEN.35.10', 3, 'La seconde attribution du nom Israël en Genèse 35,10 confirme la promesse attachée à ce nom.'],
  [342, 'GEN.32.29', 3, 'La première attribution de Genèse 32,29 est comparée à sa confirmation ultérieure.'],
  [343, 'GEN.35.10', 1, 'Citation explicite vérifiée de la formule « tu ne seras plus appelé Jacob, mais Israël ».'],
  [343, 'GEN.32.29', 1, 'Référence éditoriale vérifiée à la même formule lors du combat de Jacob.'],
  [343, 'GEN.35.10', 3, 'Le maintien ultérieur du nom Jacob est confronté à la formule absolue de Genèse 35,10.'],
  [343, 'GEN.32.29', 3, 'La répétition de la formule en Genèse 32,29 renforce le paradoxe des deux noms conservés.'],
  [344, 'GEN.35.10', 3, 'Le nom Israël de Genèse 35,10 est rapporté à la promesse d’une vision future et d’un renouvellement total.'],
  [344, 'GEN.32.29', 3, 'La première attribution du nom Israël participe à la même interprétation eschatologique.'],

  [345, 'GEN.35.11', 1, 'Citation explicite vérifiée de la nation et de l’assemblée de nations qui sortiront de Jacob.'],
  [345, 'GEN.35.11', 3, 'Les peuples de Genèse 35,11 sont distingués selon la chair et selon la foi.'],
  [346, 'GEN.35.11', 3, 'La pluralité de Genèse 35,11 est interprétée comme pouvant viser les nations venues à la foi.'],

  [347, 'GEN.35.13', 1, 'Citation explicite vérifiée de Dieu remontant du lieu où il avait parlé à Jacob.'],
  [347, 'GEN.35.14', 1, 'Citation explicite vérifiée du monument, de la libation et de l’huile versée par Jacob.'],
  [347, 'GEN.35.15', 1, 'Citation explicite vérifiée du nom Béthel donné au lieu.'],
  [347, 'GEN.28.18', 1, 'Référence intentionnelle vérifiée au premier monument de pierre oint d’huile.'],
  [347, 'GEN.28.19', 1, 'Référence intentionnelle vérifiée au premier emploi du nom Béthel.'],
  [347, 'GEN.35.14', 3, 'Le rite de Genèse 35,14 est comparé au monument antérieur et distingué d’un sacrifice idolâtrique.'],
  [347, 'GEN.28.18', 3, 'Genèse 28,18 fournit le précédent que le texte peut rappeler ou répéter.'],
  [347, 'GEN.35.15', 3, 'Le nom renouvelé en Genèse 35,15 participe à la question de la répétition du récit.'],
  [347, 'GEN.28.19', 3, 'Le premier nom Béthel de Genèse 28,19 est comparé au second.'],
  [348, 'GEN.35.14', 3, 'L’offrande faite sur la pierre en Genèse 35,14 est distinguée d’un sacrifice adressé à la pierre.'],
  [348, 'GEN.28.18', 3, 'Le premier monument de Genèse 28,18 est inclus dans la même défense contre l’accusation d’idolâtrie.'],

  [349, 'GEN.35.26', 1, 'Citation explicite vérifiée des fils de Jacob dits nés en Mésopotamie.'],
  [349, 'GEN.35.16', 1, 'Référence intentionnelle vérifiée au départ de Béthel et au voyage vers Éphrata.'],
  [349, 'GEN.35.18', 1, 'Référence intentionnelle vérifiée à la naissance de Benjamin au cours de ce voyage.'],
  [352, 'MAT.1.20', 1, 'Citation explicite vérifiée de ce qui est né ou formé en Marie par le Saint-Esprit.'],
  [353, 'GEN.31.41', 1, 'Référence intentionnelle vérifiée aux vingt années de service de Jacob, dont quatorze pour les deux filles de Laban.'],
  [353, 'GEN.29.20', 1, 'Référence intentionnelle vérifiée aux sept premières années servies pour Rachel.'],
  [353, 'GEN.29.21', 1, 'Référence intentionnelle vérifiée au mariage demandé seulement après l’accomplissement de ces sept années.'],
  [355, 'GEN.34.25', 1, 'Référence intentionnelle vérifiée à Siméon et Lévi entrant dans la ville et tuant tous les mâles.'],
  [355, 'GEN.34.27', 1, 'Référence intentionnelle vérifiée au pillage et à la prise de la ville par les fils de Jacob.'],
  [360, '1CO.15.5', 1, 'Citation explicite vérifiée de l’apparition aux Douze ; la note « 1Co. XV, 6 » vise le créneau local 15,5.'],
  [360, '1CO.15.5', 3, 'Le maintien du nom « les Douze » après la mort de Judas est analysé comme synecdoque.'],
  [361, '1CO.15.5', 3, 'L’article grec et la variante onze/douze précisent l’identification du groupe apostolique en 1 Corinthiens 15,5.'],
  [361, 'JHN.6.70', 1, 'Citation explicite vérifiée de la question « ne vous ai-je pas choisis, vous les Douze ? ».'],
  [361, 'JHN.6.70', 3, 'Le nombre des Douze en Jean 6,70 est examiné comme emploi synecdochique.'],
  [362, 'JHN.6.70', 1, 'Citation explicite vérifiée de la seconde proposition : « l’un de vous est un démon » ; la note « Jn. VI, 71 » est décalée.'],
  [362, 'JHN.6.70', 3, 'La présence de Judas parmi les Douze est distinguée de l’élection des bons.'],
  [363, 'JHN.13.18', 1, 'Citation explicite vérifiée : « Je ne parle pas de vous tous ; je sais ceux que j’ai choisis ».'],
  [363, 'JHN.13.18', 3, 'Jean 13,18 est interprété comme déclaration que les bons seuls appartiennent à l’élection.'],
  [363, 'JHN.6.70', 3, 'Jean 13,18 sert à préciser le sens de « choisis » en Jean 6,70.'],
  [364, 'JHN.6.70', 3, 'La formule des Douze en Jean 6,70 est finalement expliquée par synecdoque.'],
  [365, 'GEN.34.6', 1, 'Référence intentionnelle vérifiée à Hémor venant parler à Jacob.'],
  [365, 'GEN.34.7', 1, 'Référence intentionnelle vérifiée aux fils de Jacob revenus des champs.'],
  [365, 'GEN.34.8', 1, 'Citation explicite vérifiée de la demande d’Hémor : « donnez-lui votre fille pour épouse ».'],
  [365, 'GEN.34.8', 3, 'Le pluriel « votre fille » adressé au père et aux frères est étudié comme synecdoque.'],
  [366, 'GEN.34.8', 3, 'La fille de Jacob appelée « votre fille » illustre l’inclusion des frères sous la personne du père.'],
  [366, 'GEN.27.9', 1, 'Citation explicite vérifiée, selon la leçon « cours vers les brebis », des deux chevreaux pris au troupeau.'],
  [366, 'GEN.27.9', 3, 'Le nom de la partie principale du troupeau inclut les chèvres par synecdoque.'],
  [367, 'GEN.27.9', 3, 'La présence conjointe des brebis et des chevreaux explique la synecdoque de Genèse 27,9.'],
  [368, 'GEN.35.26', 1, 'Citation explicite vérifiée de la conclusion disant les fils de Jacob nés en Mésopotamie de Syrie.'],
  ...Array.from({ length: 20 }, (_, index) => [
    349 + index, 'GEN.35.26', 3,
    `Le segment ${349 + index} appartient à l’explication continue, par chronologie puis synecdoque, de la formule de Genèse 35,26 incluant Benjamin.`,
  ]),

  [369, 'GEN.35.29', 1, 'Référence intentionnelle vérifiée au récit de la mort d’Isaac qui précède la généalogie d’Ésaü.'],
  [369, 'GEN.36.1', 1, 'Référence intentionnelle vérifiée à l’ouverture de la généalogie d’Ésaü, appelé Édom.'],
  [369, 'GEN.36.2', 1, 'Référence intentionnelle vérifiée au dénombrement des femmes d’Ésaü.'],
  [369, 'GEN.36.3', 1, 'Référence intentionnelle vérifiée à Basemath, troisième femme d’Ésaü.'],
  [369, 'GEN.36.4', 1, 'Référence intentionnelle vérifiée aux premiers fils d’Ésaü.'],
  [369, 'GEN.36.5', 1, 'Référence intentionnelle vérifiée aux autres fils d’Ésaü nés en Chanaan.'],
  [369, 'GEN.36.1', 3, 'La généalogie ouverte en Genèse 36,1 est interprétée comme reprise récapitulative antérieure à la mort d’Isaac.'],
  [370, 'GEN.25.26', 1, 'Référence intentionnelle vérifiée à Isaac âgé de soixante ans lors de la naissance des jumeaux.'],
  [370, 'GEN.35.28', 1, 'Référence intentionnelle vérifiée aux cent quatre-vingts années de la vie d’Isaac.'],
  [370, 'GEN.35.29', 3, 'L’âge d’Isaac à sa mort permet de calculer que ses fils avaient cent vingt ans.'],
  [370, 'GEN.36.1', 3, 'Le calcul chronologique confirme que les naissances de Genèse 36 ne sont pas postérieures à la mort d’Isaac.'],

  [371, 'GEN.36.6', 1, 'Référence intentionnelle vérifiée au départ d’Ésaü loin de Jacob avec sa maison et ses biens.'],
  [371, 'GEN.36.7', 1, 'Référence intentionnelle vérifiée à l’impossibilité pour les deux frères très riches de demeurer ensemble.'],
  [371, 'GEN.32.4', 1, 'Référence intentionnelle vérifiée à Ésaü déjà établi au pays de Séir lors du retour de Jacob.'],
  [371, 'GEN.36.6', 3, 'Le départ de Genèse 36,6 est distingué d’un premier établissement antérieur au mont Séir.'],
  [371, 'GEN.36.7', 3, 'La richesse donnée en Genèse 36,7 explique le second départ d’Ésaü.'],
  [372, 'GEN.36.6', 3, 'Plusieurs motifs sont proposés pour expliquer un premier départ d’Ésaü vers Séir avant Genèse 36,6.'],
  [372, 'GEN.27.41', 1, 'Référence intentionnelle vérifiée à la haine d’Ésaü après la bénédiction reçue par Jacob.'],
  [372, 'GEN.26.35', 1, 'Référence intentionnelle vérifiée à l’aversion d’Isaac et Rébecca envers les femmes d’Ésaü.'],
  [373, 'GEN.32.4', 1, 'Référence intentionnelle vérifiée au premier séjour d’Ésaü dans le pays de Séir.'],
  [373, 'GEN.33.4', 1, 'Référence intentionnelle vérifiée à la réconciliation des deux frères au retour de Jacob.'],
  [373, 'GEN.33.16', 1, 'Référence intentionnelle vérifiée au retour d’Ésaü vers Séir après la rencontre.'],
  [373, 'GEN.35.29', 1, 'Référence intentionnelle vérifiée à Ésaü et Jacob ensevelissant ensemble leur père.'],
  [373, 'GEN.36.7', 1, 'Référence intentionnelle vérifiée aux richesses que le pays ne pouvait contenir.'],
  [373, 'GEN.36.8', 1, 'Référence intentionnelle vérifiée à l’établissement final d’Ésaü au mont Séir.'],
  [373, 'GEN.36.6', 3, 'Le départ de Genèse 36,6 est reconstruit comme second retrait d’Ésaü à Séir.'],
  [373, 'GEN.36.7', 3, 'L’abondance des biens en Genèse 36,7 fournit la cause du second retrait.'],
  [373, 'GEN.36.8', 3, 'Genèse 36,8 est interprété comme établissement définitif après la mort d’Isaac.'],

  [374, 'GEN.36.21', 1, 'Citation explicite vérifiée des princes horréens fils de Séir dans le pays d’Édom.'],
  [374, 'GEN.36.21', 3, 'L’expression « pays d’Édom » en Genèse 36,21 est expliquée comme emploi du nom connu au temps du narrateur.'],
  [375, 'GEN.36.1', 1, 'Référence intentionnelle vérifiée à l’identification d’Ésaü avec Édom.'],
  [375, 'GEN.36.8', 1, 'Référence intentionnelle vérifiée à la même identification au moment de l’établissement en Séir.'],
  [375, 'GEN.36.21', 3, 'Le pays reçoit rétrospectivement le nom d’Édom à cause d’Ésaü et de sa descendance.'],
  [375, 'GEN.36.1', 3, 'Genèse 36,1 fonde l’étymologie historique reliant Ésaü, Édom et les Iduméens.'],
]

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((ligne) => ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const { data: segments, error: erreurSegments } = await supabase.from('segments')
  .select('id,segment_numero,ref_niv1,ref_niv2,ref_niv2_texte,segment_texte,texte_original,notes,nature,liens_revus_le,liens_revus_par')
  .eq('id_oeuvre', OEUVRE).eq('ref_niv1', REF_NIV1)
  .gte('segment_numero', PREMIER_SEGMENT).lte('segment_numero', DERNIER_SEGMENT).order('segment_numero')
if (erreurSegments) throw erreurSegments
if (segments.length !== NB_SEGMENTS || segments[0]?.segment_numero !== PREMIER_SEGMENT || segments.at(-1)?.segment_numero !== DERNIER_SEGMENT) {
  throw new Error(`Préétat : lot inattendu (${segments.length} segments)`)
}
const empreinte = createHash('sha256').update(segments.map((segment) => JSON.stringify([
  segment.id, segment.segment_numero, segment.ref_niv1, segment.ref_niv2,
  segment.ref_niv2_texte, segment.segment_texte, segment.texte_original,
  segment.notes, segment.nature,
])).join('\n')).digest('hex')
if (empreinte !== EMPREINTE_TEXTE) throw new Error(`Le texte lu a changé : ${empreinte}`)
const questions = [...new Set(segments.map((segment) => segment.ref_niv2))]
if (JSON.stringify(questions) !== JSON.stringify(QUESTIONS_ATTENDUES)) throw new Error(`Questions inattendues : ${questions.join(', ')}`)
if (segments.some((segment) => segment.liens_revus_le || segment.liens_revus_par)) throw new Error('Un segment est déjà marqué relu')

const parNumero = new Map(segments.map((segment) => [segment.segment_numero, segment]))
const numerosLies = new Set(LIENS.map(([numero]) => numero))
const nonClasses = segments.filter((segment) => !numerosLies.has(segment.segment_numero) && !SANS_LIEN.has(segment.segment_numero))
if (nonClasses.length) throw new Error(`Segments non classés : ${nonClasses.map((segment) => segment.segment_numero).join(', ')}`)
if ([...SANS_LIEN].some((numero) => numerosLies.has(numero) || !parNumero.has(numero))) throw new Error('Déclaration SANS_LIEN incohérente')
if (LIENS.some(([numero, canon, type, motif]) => !parNumero.has(numero) || !canon || ![1, 2, 3, 4].includes(type) || !motif?.trim())) {
  throw new Error('Lien interne incomplet ou invalide')
}
const cles = LIENS.map(([numero, canon, type]) => `${numero}|${canon}|${type}`)
if (new Set(cles).size !== cles.length) throw new Error('Doublon interne segment/cible/type')

const cibles = [...new Set(LIENS.map(([, canon]) => canon))]
const { data: temoins, error: erreurTemoins } = await supabase.from('versets_lecture')
  .select('id_verset,ref,"TR0001","TR0003","TR0004"').in('id_verset', cibles)
if (erreurTemoins) throw erreurTemoins
const parCible = new Map(temoins.map((temoin) => [temoin.id_verset, temoin]))
const absents = cibles.filter((cible) => !parCible.has(cible))
if (absents.length) throw new Error(`Cibles absentes : ${absents.join(', ')}`)
const sansTemoin = cibles.filter((cible) => {
  const temoin = parCible.get(cible)
  return ![temoin.TR0001, temoin.TR0003, temoin.TR0004].some((texte) => texte?.trim())
})
if (sansTemoin.length) throw new Error(`Cibles sans témoin lisible : ${sansTemoin.join(', ')}`)

const ids = segments.map((segment) => segment.id)
const { count: existants, error: erreurExistants } = await supabase.from('liens_bibliques')
  .select('id', { count: 'exact', head: true }).in('segment_id', ids)
if (erreurExistants) throw erreurExistants
if (existants) throw new Error(`${existants} lien(s) existe(nt) déjà dans le lot`)

const types = LIENS.reduce((compte, [, , type]) => ({ ...compte, [type]: (compte[type] ?? 0) + 1 }), {})
console.log(JSON.stringify({
  mode: WRITE ? 'écriture' : 'contrôle', oeuvre: OEUVRE, ref_niv1: REF_NIV1,
  questions, segments: NB_SEGMENTS, bornes: [PREMIER_SEGMENT, DERNIER_SEGMENT],
  empreinte, liens: LIENS.length, sans_lien: [...SANS_LIEN],
  cibles_distinctes: cibles.length, cibles, types,
}, null, 2))
if (!WRITE) process.exit(0)

const q = (valeur) => `'${String(valeur).replaceAll("'", "''")}'`
const valeurs = LIENS.map(([numero, canon, type, motif]) =>
  `(${parNumero.get(numero).id},${q(canon)},${type},'vérifié',${q(motif)},'lecture',false)`).join(',\n    ')
const idSql = ids.join(',')
const sql = `do $passe$ declare n integer; begin
  if exists(select 1 from liens_bibliques where segment_id in (${idSql})) then raise exception 'Liens déjà présents'; end if;
  if exists(select 1 from segments where id in (${idSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Marques déjà présentes'; end if;
  insert into liens_bibliques(segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis) values ${valeurs};
  get diagnostics n=row_count; if n<>${LIENS.length} then raise exception 'Liens %/${LIENS.length}',n; end if;
  update segments set liens_revus_le=now(),liens_revus_par=${q(RELECTEUR)} where id in (${idSql});
  get diagnostics n=row_count; if n<>${NB_SEGMENTS} then raise exception 'Segments %/${NB_SEGMENTS}',n; end if;
end $passe$;`
const { error: erreurEcriture } = await supabase.rpc('exec_sql', { sql })
if (erreurEcriture) throw erreurEcriture

const [{ data: liensApres, error: e1 }, { data: segmentsApres, error: e2 }] = await Promise.all([
  supabase.from('liens_bibliques').select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id', ids),
  supabase.from('segments').select('id,liens_revus_le,liens_revus_par').in('id', ids),
])
if (e1) throw e1
if (e2) throw e2
const clesApres = new Set(liensApres.map((lien) => `${lien.segment_id}|${lien.canon_id}|${lien.type}`))
const clesAttendues = new Set(LIENS.map(([numero, canon, type]) => `${parNumero.get(numero).id}|${canon}|${type}`))
if (liensApres.length !== LIENS.length || clesApres.size !== clesAttendues.size || [...clesAttendues].some((cle) => !clesApres.has(cle))) {
  throw new Error(`Postétat liens invalide : ${liensApres.length}/${LIENS.length}`)
}
if (liensApres.some((lien) => lien.fiabilite !== 'vérifié' || lien.provenance !== 'lecture' || lien.arbitrage_requis || !lien.motif?.trim())) {
  throw new Error('Postétat éditorial invalide')
}
if (segmentsApres.length !== NB_SEGMENTS || segmentsApres.some((segment) => !segment.liens_revus_le || segment.liens_revus_par !== RELECTEUR)) {
  throw new Error(`Postétat relecture invalide : ${segmentsApres.length}/${NB_SEGMENTS}`)
}
console.log(`✓ ${liensApres.length} liens vérifiés écrits ; ${segmentsApres.length} segments marqués relus`)
