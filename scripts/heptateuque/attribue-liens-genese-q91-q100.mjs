import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const WRITE = process.argv.includes('--write')
const DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Genèse Q. XCI-C'
const EMPREINTE_ATTENDUE = 'c960e807ff831394c96c85dad00e47ecc5181b0647e8a03e34c12ad0ff819699'
const QUESTIONS = [
  'Question XCI', 'Question XCII', 'Question XCIII', 'Question XCIV', 'Question XCV',
  'Question XCVI', 'Question XCVII', 'Question XCVIII', 'Question XCIX', 'Question C',
]

// Partition exhaustive : chacun des segments 276-303 porte au moins un lien.
const SANS_LIEN = new Set()

// [segment_numero, type, motif] - références manifestes qui ne visent pas la Bible.
const NON_RESOLUS = [
  [281, 4, 'RÉFÉRENCE NON BIBLIQUE (auteur profane) : Hippocrate est cité pour un récit conservé dans ses livres médicaux ; œuvre et passage non précisés.'],
]

// [segment_numero, canon_id, type, motif]
const LIENS = [
  [276, 'GEN.30.13', 1, 'Citation explicite vérifiée de Lia se disant heureuse ou bienheureuse à la naissance d’Aser.'],
  [276, 'GEN.30.13', 3, 'Question lexicale sur le grec « eutukhe » et la notion de bonne fortune en Genèse 30,13.'],
  [277, 'GEN.30.13', 3, 'La notion de fortune employée en Genèse 30,13 est expliquée sans en faire une divinité.'],
  [278, 'GEN.30.13', 3, 'L’emploi de « fortune » est rapporté à l’habitude païenne de Lia et non à l’autorité de Jacob.'],

  [279, 'GEN.30.30', 1, 'Citation explicite vérifiée : le Seigneur a béni Laban depuis l’arrivée de Jacob.'],
  [279, 'GEN.30.30', 3, 'L’expression « dans ma démarche » est interprétée comme « depuis mon arrivée ».'],

  [280, 'GEN.30.37', 2, 'L’écorçage des branches de plusieurs arbres est repris dans le discours de l’auteur.'],
  [280, 'GEN.30.37', 3, 'La préparation de branches de couleurs variées ouvre l’explication du procédé de Jacob.'],
  [280, 'GEN.30.38', 2, 'Les branches placées devant les troupeaux aux abreuvoirs sont reprises dans le discours.'],
  [280, 'GEN.30.38', 3, 'La vue des branches au moment de la conception est examinée comme cause naturelle possible.'],
  [280, 'GEN.30.39', 2, 'La naissance de petits tachetés après la contemplation des branches est reprise dans le discours.'],
  [280, 'GEN.30.39', 3, 'La couleur des petits de Genèse 30,39 est expliquée par l’impression visuelle au moment de la conception.'],
  [281, 'GEN.30.38', 3, 'L’exemple médical d’une impression visuelle au moment de la conception éclaire le procédé de Jacob.'],
  [281, 'GEN.30.39', 3, 'Le récit hippocratique est introduit comme parallèle naturel à la naissance des animaux tachetés.'],
  [282, 'GEN.30.38', 3, 'La découverte d’une peinture ressemblante achève l’analogie avec la contemplation des branches.'],
  [282, 'GEN.30.39', 3, 'L’exemple médical confirme la possibilité d’une ressemblance produite par une image contemplée.'],
  [283, 'GEN.30.37', 3, 'La présence de trois espèces d’arbres en Genèse 30,37 est jugée inutile à la seule variété des couleurs.'],
  [283, 'GEN.30.39', 3, 'La multiplication d’animaux tachetés est distinguée de la diversité botanique des branches.'],
  [284, 'GEN.30.37', 3, 'Le choix et l’écorçage des branches sont interprétés comme un acte prophétique.'],
  [284, 'GEN.30.38', 3, 'La disposition des branches est rapportée à une révélation spirituelle plutôt qu’à une supercherie.'],
  [284, 'GEN.30.39', 3, 'Le résultat obtenu sur les troupeaux est intégré au sens figuré de l’acte de Jacob.'],
  [284, 'GEN.30.40', 3, 'La séparation des troupeaux participe à l’examen moral et prophétique de la conduite de Jacob.'],
  [284, 'GEN.30.41', 3, 'Le placement sélectif des branches est interprété comme une conduite révélée.'],
  [284, 'GEN.30.42', 3, 'L’omission des branches pour la seconde portée contribue à écarter l’accusation d’injustice.'],
  [285, 'GEN.30.42', 2, 'L’absence de branches lors de la seconde portée est reprise dans le raisonnement de l’auteur.'],
  [285, 'GEN.30.42', 3, 'Genèse 30,42 est interprété comme une limite volontaire empêchant Jacob de tout recueillir.'],
  [286, 'GEN.30.42', 1, 'Citation explicite vérifiée de la leçon des Septante : après la première portée, Jacob ne plaçait plus les branches.'],
  [286, 'GEN.30.42', 3, 'La variante de Genèse 30,42 est expliquée comme respect de la justice envers Laban.'],

  [287, 'GEN.31.30', 1, 'Citation explicite vérifiée de la plainte de Laban au sujet de ses dieux dérobés.'],
  [287, 'GEN.31.30', 3, 'La première mention des dieux des nations est relevée et distinguée des mentions antérieures de Dieu.'],

  [288, 'GEN.31.41', 1, 'Citation explicite vérifiée de la récompense changée dix fois, selon la leçon ancienne « dix jeunes brebis ».'],
  [288, 'GEN.31.41', 3, 'Question précise sur les dix changements de salaire mentionnés en Genèse 31,41.'],
  [288, 'GEN.31.7', 1, 'Référence intentionnelle vérifiée au même reproche adressé auparavant aux filles de Laban.'],
  [288, 'GEN.31.7', 3, 'Genèse 31,7 est confronté à Genèse 31,41 pour reconstituer les changements non racontés.'],
  [289, 'GEN.31.7', 1, 'Citation explicite vérifiée de la récompense changée dix fois par Laban.'],
  [289, 'GEN.31.7', 3, 'Les changements de convention sont reconstruits pour expliquer Genèse 31,7.'],
  [290, 'GEN.31.7', 3, 'L’alternance frauduleuse des conventions explique les dix changements de salaire.'],
  [290, 'GEN.31.41', 3, 'Le procédé attribué à Laban précise le reproche formulé directement en Genèse 31,41.'],
  [290, 'GEN.30.37', 3, 'La reprise ou l’abandon des branches dépend de la convention de couleur imposée par Laban.'],
  [290, 'GEN.30.38', 3, 'La présence des branches devant les troupeaux est mobilisée dans la reconstruction des portées.'],
  [290, 'GEN.30.39', 3, 'La naissance d’animaux tachetés explique l’alternance des conventions de Laban.'],
  [290, 'GEN.30.42', 3, 'L’absence de branches pour certaines portées complète la reconstruction des changements de salaire.'],
  [291, 'GEN.31.7', 1, 'Citation explicite vérifiée des dix changements de récompense racontés aux filles de Laban.'],
  [291, 'GEN.31.7', 3, 'L’aide de Dieu mentionnée en Genèse 31,7 explique l’échec des supercheries de Laban.'],
  [291, 'GEN.31.41', 1, 'Citation explicite vérifiée du reproche adressé ensuite directement à Laban.'],
  [291, 'GEN.31.41', 3, 'Les deux formulations des dix changements sont interprétées comme une même déloyauté sans profit pour Laban.'],
  [292, 'GEN.31.7', 3, 'Les « dix agneaux » de la leçon ancienne sont interprétés comme dix saisons de mise bas.'],
  [292, 'GEN.31.41', 3, 'Les six années de service de Genèse 31,41 fournissent le cadre du calcul des dix portées.'],
  [293, 'GEN.31.7', 3, 'La première année ne fournit qu’une portée sous le nouveau contrat, première étape du calcul de dix.'],
  [293, 'GEN.31.41', 3, 'Le service de six ans pour les troupeaux est réparti selon les saisons de mise bas.'],
  [294, 'GEN.31.7', 3, 'Une portée la première et la dernière année, deux les quatre années intermédiaires, expliquent le nombre dix.'],
  [294, 'GEN.31.41', 3, 'Le calcul des dix portées est rapporté aux six années de service mentionnées en Genèse 31,41.'],
  [295, 'GEN.31.7', 3, 'L’emploi métonymique des agneaux pour les saisons explique la leçon ancienne de Genèse 31,7.'],
  [295, 'GEN.31.41', 3, 'L’analogie des moissons et vendanges éclaire les dix changements répartis sur six années.'],
  [296, 'GEN.31.7', 3, 'La possibilité de deux portées annuelles confirme matériellement l’interprétation des dix saisons.'],
  [296, 'GEN.31.41', 3, 'La fécondité locale soutient le calcul des dix portées pendant les six années de service.'],

  [297, 'GEN.31.45', 1, 'Citation explicite vérifiée de la pierre dressée par Jacob comme monument.'],
  [297, 'GEN.31.45', 3, 'Le monument de Genèse 31,45 est expliqué comme mémorial et non objet d’un culte divin.'],

  [298, 'GEN.31.47', 1, 'Référence intentionnelle vérifiée aux deux noms donnés au monceau par Laban et Jacob.'],
  [298, 'GEN.31.47', 3, 'La différence des deux noms de Genèse 31,47 est expliquée par les propriétés du syriaque et de l’hébreu.'],
  [298, 'GEN.31.48', 3, 'Le sens de monceau témoin en Genèse 31,48 sert de terme commun aux deux langues.'],
  [299, 'GEN.31.48', 1, 'Citation explicite vérifiée de l’explication du nom : le monceau rend témoignage.'],
  [299, 'GEN.31.48', 3, 'La formule de Genèse 31,48 est interprétée comme traduction moyenne convenant aux deux langues.'],
  [299, 'GEN.31.47', 3, 'Les deux noms de Genèse 31,47 sont rapprochés par leur sens commun.'],

  [300, 'GEN.31.48', 1, 'Citation explicite vérifiée du monceau établi comme témoin entre Laban et Jacob.'],
  [300, 'GEN.31.48', 3, 'L’ordre des propositions relatives au monceau témoin est examiné.'],
  [300, 'GEN.31.49', 1, 'Citation explicite vérifiée de la demande que Dieu regarde et juge entre Laban et Jacob.'],
  [300, 'GEN.31.49', 3, 'La mention de la vision est réordonnée pour expliquer l’invocation du jugement divin.'],
  [301, 'GEN.31.24', 2, 'L’interdiction divine donnée à Laban en songe est reprise dans le discours de l’auteur.'],
  [301, 'GEN.31.24', 3, 'La vision de Genèse 31,24 identifie celle à laquelle l’interprétation précédente fait allusion.'],
  [301, 'GEN.31.49', 3, 'La vision antérieure explique l’appel de Laban au jugement de Dieu en Genèse 31,49.'],

  [302, 'GEN.31.50', 1, 'Citation explicite vérifiée de l’affirmation que personne d’autre n’est avec eux comme témoin.'],
  [302, 'GEN.31.50', 3, 'Deux sens sont proposés pour l’absence de tiers en présence du témoignage de Dieu.'],

  [303, 'GEN.31.53', 1, 'Citation explicite vérifiée du serment de Jacob par la crainte de son père Isaac.'],
  [303, 'GEN.31.53', 3, 'La crainte d’Isaac en Genèse 31,53 est interprétée comme la crainte qu’Isaac avait de Dieu.'],
  [303, 'GEN.31.42', 1, 'Citation explicite vérifiée de la formule antérieure : Dieu d’Abraham et crainte d’Isaac.'],
  [303, 'GEN.31.42', 3, 'Genèse 31,42 confirme que « crainte d’Isaac » désigne le Dieu craint par Isaac.'],
]

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((ligne) => ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const { data: segments, error: erreurSegments } = await supabase.from('segments')
  .select('id,segment_numero,segment_texte,notes,ref_niv1,ref_niv2,ref_niv2_texte,liens_revus_le,liens_revus_par')
  .eq('id_oeuvre', OEUVRE).eq('ref_niv1', 'Livre premier').in('ref_niv2', QUESTIONS).order('segment_numero')
if (erreurSegments) throw erreurSegments
if (segments.length !== 28 || segments[0]?.segment_numero !== 276 || segments.at(-1)?.segment_numero !== 303) {
  throw new Error(`Préétat : lot inattendu (${segments.length}, ${segments[0]?.segment_numero}-${segments.at(-1)?.segment_numero})`)
}
if (segments.some((segment, index) => segment.segment_numero !== 276 + index)) throw new Error('Préétat : numérotation non continue')
if (segments.some((segment) => segment.ref_niv1 !== 'Livre premier' || !QUESTIONS.includes(segment.ref_niv2))) {
  throw new Error('Préétat : fuite structurelle hors Genèse XCI-C')
}
const questionsTrouvees = new Set(segments.map((segment) => segment.ref_niv2))
if (questionsTrouvees.size !== QUESTIONS.length || QUESTIONS.some((question) => !questionsTrouvees.has(question))) {
  throw new Error('Préétat : les dix questions attendues ne sont pas toutes présentes')
}
if (segments.some((segment) => segment.liens_revus_le || segment.liens_revus_par)) throw new Error('Préétat : un segment est déjà marqué relu')

const empreinte = createHash('sha256').update(JSON.stringify(segments.map((segment) => [
  segment.id, segment.segment_numero, segment.ref_niv1, segment.ref_niv2,
  segment.ref_niv2_texte, segment.segment_texte, segment.notes,
]))).digest('hex')
if (empreinte !== EMPREINTE_ATTENDUE) throw new Error(`Préétat : texte ou structure modifié (${empreinte})`)

const parNumero = new Map(segments.map((segment) => [segment.segment_numero, segment]))
const numerosLies = new Set([...LIENS, ...NON_RESOLUS].map(([numero]) => numero))
const nonClasses = segments.filter((segment) => !numerosLies.has(segment.segment_numero) && !SANS_LIEN.has(segment.segment_numero))
if (nonClasses.length) throw new Error(`Partition incomplète : ${nonClasses.map((segment) => segment.segment_numero).join(', ')}`)
if ([...SANS_LIEN].some((numero) => numerosLies.has(numero) || !parNumero.has(numero))) throw new Error('Déclaration SANS_LIEN incohérente')
if (LIENS.some(([numero, canon, type, motif]) => !parNumero.has(numero) || !canon || ![1, 2, 3, 4].includes(type) || !motif.trim())) {
  throw new Error('Manifeste invalide')
}
if (NON_RESOLUS.some(([numero, type, motif]) => !parNumero.has(numero) || ![1, 2, 3, 4].includes(type) || !motif.startsWith('RÉFÉRENCE NON BIBLIQUE'))) {
  throw new Error('Manifeste sans cible invalide')
}
const cles = LIENS.map(([numero, canon, type]) => `${numero}|${canon}|${type}`)
if (new Set(cles).size !== cles.length) throw new Error('Doublon interne segment/cible/type')
const clesSansCible = NON_RESOLUS.map(([numero, type, motif]) => `${numero}|sans-cible|${type}|${motif}`)
if (new Set(clesSansCible).size !== clesSansCible.length) throw new Error('Doublon interne sans cible')

const cibles = [...new Set(LIENS.map(([, canon]) => canon))]
const { data: temoins, error: erreurTemoins } = await supabase.from('versets_lecture')
  .select('id_verset,ref,"TR0001","TR0003","TR0004"').in('id_verset', cibles)
if (erreurTemoins) throw erreurTemoins
const parCible = new Map(temoins.map((temoin) => [temoin.id_verset, temoin]))
const absents = cibles.filter((cible) => !parCible.has(cible))
if (absents.length) throw new Error(`Cibles absentes : ${absents.join(', ')}`)
const sansTexte = cibles.filter((cible) => {
  const temoin = parCible.get(cible)
  return !temoin.TR0001 && !temoin.TR0003 && !temoin.TR0004
})
if (sansTexte.length) throw new Error(`Cibles sans témoin lisible : ${sansTexte.join(', ')}`)

const ids = segments.map((segment) => segment.id)
const { count: existants, error: erreurExistants } = await supabase.from('liens_bibliques')
  .select('id', { count: 'exact', head: true }).in('segment_id', ids)
if (erreurExistants) throw erreurExistants
if (existants) throw new Error(`Préétat : ${existants} lien(s) existe(nt) déjà`)

const TOTAL_LIENS = LIENS.length + NON_RESOLUS.length
const types = [...LIENS, ...NON_RESOLUS].reduce((compte, ligne) => {
  const type = ligne.length === 4 ? ligne[2] : ligne[1]
  return { ...compte, [type]: (compte[type] ?? 0) + 1 }
}, {})
console.log(JSON.stringify({
  mode: WRITE ? 'écriture' : 'contrôle', lot: 'Genèse XCI-C', bornes: [276, 303],
  segments: segments.length, liens: TOTAL_LIENS, sans_lien: [...SANS_LIEN],
  sans_cible_a_constituer: NON_RESOLUS.length, cibles_distinctes: cibles.length, types, empreinte,
}, null, 2))

if (DETAIL) {
  for (const [numero, canon, type, motif] of LIENS) {
    const segment = parNumero.get(numero)
    const temoin = parCible.get(canon)
    console.log(JSON.stringify({
      segment_numero: numero, type, canon_id: canon, motif,
      segment_texte: segment.segment_texte,
      temoin: temoin.TR0003 || temoin.TR0001 || temoin.TR0004,
    }, null, 2))
  }
  for (const [numero, type, motif] of NON_RESOLUS) {
    console.log(JSON.stringify({
      segment_numero: numero, type, canon_id: null, fiabilite: 'à constituer', motif,
      segment_texte: parNumero.get(numero).segment_texte,
    }, null, 2))
  }
}

if (!WRITE) process.exit(0)

const q = (valeur) => `'${String(valeur).replaceAll("'", "''")}'`
const valeurs = [
  ...LIENS.map(([numero, canon, type, motif]) =>
    `(${parNumero.get(numero).id},${q(canon)},${type},'vérifié',${q(motif)},'lecture',false)`),
  ...NON_RESOLUS.map(([numero, type, motif]) =>
    `(${parNumero.get(numero).id},null,${type},'à constituer',${q(motif)},'lecture',true)`),
].join(',\n    ')
const idSql = ids.join(',')
const sql = `do $passe$ declare n integer; begin
  if exists(select 1 from liens_bibliques where segment_id in (${idSql})) then raise exception 'Liens déjà présents'; end if;
  if exists(select 1 from segments where id in (${idSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Marques déjà présentes'; end if;
  insert into liens_bibliques(segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis) values ${valeurs};
  get diagnostics n=row_count; if n<>${TOTAL_LIENS} then raise exception 'Liens %/${TOTAL_LIENS}',n; end if;
  update segments set liens_revus_le=now(),liens_revus_par=${q(RELECTEUR)} where id in (${idSql});
  get diagnostics n=row_count; if n<>${segments.length} then raise exception 'Segments %/${segments.length}',n; end if;
end $passe$;`
const { error: erreurEcriture } = await supabase.rpc('exec_sql', { sql })
if (erreurEcriture) throw erreurEcriture

const [{ count: liensApres, error: e1 }, { count: relusApres, error: e2 }, { data: auditLiens, error: e3 }] = await Promise.all([
  supabase.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  supabase.from('segments').select('id', { count: 'exact', head: true }).in('id', ids).not('liens_revus_le', 'is', null),
  supabase.from('liens_bibliques').select('segment_id,canon_id,verset_v2_id,livre,chapitre,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id', ids),
])
if (e1) throw e1
if (e2) throw e2
if (e3) throw e3
if (liensApres !== TOTAL_LIENS || relusApres !== segments.length) throw new Error(`Postétat invalide : ${liensApres}/${relusApres}`)
if (auditLiens.some((lien) => {
  if (!lien.motif || lien.provenance !== 'lecture') return true
  if (lien.canon_id) return lien.fiabilite !== 'vérifié' || lien.arbitrage_requis
  return lien.verset_v2_id || lien.livre || lien.chapitre || lien.fiabilite !== 'à constituer' || !lien.arbitrage_requis || !lien.motif.startsWith('RÉFÉRENCE NON BIBLIQUE')
})) {
  throw new Error('Postcontrôle qualitatif invalide')
}
const clesApres = auditLiens.map((lien) => lien.canon_id
  ? `${lien.segment_id}|${lien.canon_id}|${lien.type}`
  : `${lien.segment_id}|sans-cible|${lien.type}|${lien.motif}`)
if (new Set(clesApres).size !== clesApres.length) throw new Error('Postcontrôle : doublon détecté')
console.log(`✓ ${liensApres} liens vérifiés écrits ; ${relusApres} segments marqués relus`)
