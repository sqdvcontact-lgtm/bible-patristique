import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const WRITE = process.argv.includes('--write')
const DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Genèse Q. LXXXI-XC'
const EMPREINTE_ATTENDUE = 'a16f02c92e5dac3a7a40e87c220837e97b17063097d5aa1e7a5034aac28a76c2'
const QUESTIONS = [
  'Question LXXXI', 'Question LXXXII', 'Question LXXXIII', 'Question LXXXIV', 'Question LXXXV',
  'Question LXXXVI', 'Question LXXXVII', 'Question LXXXVIII', 'Question LXXXIX', 'Question XC',
]
const SANS_LIEN = new Set()

// Manifeste établi par lecture continue des segments et des trois témoins.
// [segment_numero, canon_id, type, motif]
const LIENS = [
  [253, 'GEN.27.41', 1, 'Référence intentionnelle vérifiée aux menaces de mort qu’Ésaü formulait en son cœur.'],
  [253, 'GEN.27.41', 3, 'La formulation intérieure de la menace en Genèse 27,41 fonde la difficulté sur la connaissance de Rébecca.'],
  [253, 'GEN.27.42', 1, 'Référence intentionnelle vérifiée à l’annonce faite à Rébecca des paroles d’Ésaü.'],
  [253, 'GEN.27.42', 3, 'Question précise sur le moyen par lequel Rébecca apprit la menace rapportée en Genèse 27,42.'],
  [254, 'GEN.27.42', 3, 'La révélation de la menace à Rébecca est interprétée comme signe du mystère qui dirigeait sa conduite.'],

  [255, 'GEN.28.2', 1, 'Citation explicite vérifiée de l’ordre d’aller en Mésopotamie prendre une épouse dans la maison de Bathuel.'],
  [255, 'GEN.28.2', 3, 'La variante grecque « Fuis » de Genèse 28,2 est interprétée comme preuve qu’Isaac connaissait le danger.'],
  [255, 'GEN.27.41', 1, 'Référence intentionnelle vérifiée aux pensées meurtrières qu’Ésaü formait en lui-même.'],
  [255, 'GEN.27.41', 3, 'La menace intérieure de Genèse 27,41 est rapprochée de l’ordre de fuite donné par Isaac.'],

  [256, 'GEN.28.16', 1, 'Citation explicite vérifiée du réveil de Jacob et de la présence du Seigneur qu’il ignorait.'],
  [256, 'GEN.28.17', 1, 'Citation explicite vérifiée du lieu terrible, maison de Dieu et porte du ciel.'],
  [256, 'GEN.28.16', 3, 'Les paroles de Jacob en Genèse 28,16 sont lues comme prophétie du sanctuaire futur.'],
  [256, 'GEN.28.17', 3, 'La maison de Dieu de Genèse 28,17 est interprétée comme figure du tabernacle.'],
  [256, 'EXO.25.8', 2, 'L’ordre de dresser un sanctuaire afin que Dieu habite au milieu du peuple est absorbé dans l’explication.'],
  [256, 'EXO.25.8', 3, 'Exode 25,8 précise le tabernacle annoncé prophétiquement par la maison de Dieu.'],
  [257, 'GEN.28.17', 3, 'La porte du ciel de Genèse 28,17 est interprétée comme accès des fidèles au royaume.'],

  [258, 'GEN.28.18', 1, 'Référence intentionnelle vérifiée à la pierre dressée par Jacob et arrosée d’huile.'],
  [258, 'GEN.28.18', 3, 'L’onction de la pierre en Genèse 28,18 est interprétée comme prophétie de l’onction du Christ, non comme idolâtrie.'],

  [259, 'GEN.28.19', 1, 'Citation explicite vérifiée du nom Maison de Dieu donné au lieu auparavant appelé Luza.'],
  [259, 'GEN.28.19', 3, 'La situation de Béthel en Genèse 28,19 soulève la question de l’érection du monument près de la ville.'],
  [260, 'GEN.28.20', 1, 'Référence intentionnelle vérifiée au vœu de Jacob concernant la protection pendant son voyage.'],
  [260, 'GEN.28.21', 1, 'Référence intentionnelle vérifiée au retour heureux souhaité par Jacob.'],
  [260, 'GEN.28.22', 1, 'Référence intentionnelle vérifiée à la maison de Dieu et à la promesse de la dîme.'],
  [260, 'GEN.28.22', 3, 'Le vœu de Genèse 28,22 est interprété comme annonce prophétique d’une maison consacrée à Dieu.'],
  [260, 'GEN.35.7', 1, 'Référence intentionnelle vérifiée à l’autel que Jacob bâtit à son retour.'],
  [260, 'GEN.35.7', 3, 'L’autel bâti à Béthel en Genèse 35,7 est présenté comme accomplissement du vœu antérieur.'],
  [261, 'GEN.28.22', 3, 'La pierre appelée maison de Dieu en Genèse 28,22 est distinguée de Dieu et comprise comme signe du sanctuaire futur.'],

  [262, 'GEN.29.10', 1, 'Référence intentionnelle vérifiée à l’arrivée de Rachel et à la pierre ôtée du puits par Jacob.'],
  [262, 'GEN.29.10', 3, 'La connaissance de l’identité de Rachel en Genèse 29,10 est expliquée par un échange omis du récit.'],
  [263, 'GEN.29.10', 3, 'La demande et la réponse sous-entendues expliquent comment Jacob savait qui était Rachel en Genèse 29,10.'],

  [264, 'GEN.29.11', 1, 'Citation explicite vérifiée du baiser donné par Jacob à Rachel et de ses pleurs.'],
  [264, 'GEN.29.12', 1, 'Citation explicite vérifiée de la révélation par Jacob de sa parenté avec Rachel.'],
  [264, 'GEN.29.11', 3, 'Le baiser de Genèse 29,11 est expliqué par la coutume ancienne entre parents.'],
  [265, 'GEN.29.11', 3, 'La chronologie du baiser de Genèse 29,11 est examinée face à l’apparente qualité d’inconnu de Jacob.'],
  [265, 'GEN.29.12', 3, 'Genèse 29,12 est envisagé comme récit récapitulatif d’une présentation antérieure au baiser.'],
  [266, 'GEN.29.11', 3, 'L’ordre narratif de Genèse 29,11 est expliqué par la pratique scripturaire de la récapitulation.'],
  [266, 'GEN.29.12', 3, 'La révélation de la parenté en Genèse 29,12 peut rapporter après coup un événement déjà accompli.'],
  [266, 'GEN.2.8', 1, 'Référence intentionnelle vérifiée au jardin planté et à l’homme que Dieu y plaça.'],
  [266, 'GEN.2.8', 4, 'L’ordre narratif de Genèse 2,8 est explicitement rapproché de la récapitulation supposée dans le récit de Rachel.'],
  [266, 'GEN.2.9', 1, 'Référence intentionnelle vérifiée au développement postérieur de la formation du jardin.'],
  [266, 'GEN.2.9', 4, 'Le détail donné après l’annonce du jardin sert de parallèle thématique à l’ordre non chronologique du récit.'],

  [267, 'GEN.29.20', 1, 'Citation explicite vérifiée des sept années de service qui parurent peu de jours à Jacob par amour pour Rachel.'],
  [267, 'GEN.29.20', 3, 'Genèse 29,20 est expliqué par la légèreté des fatigues supportées sous l’effet de l’amour.'],

  [268, 'GEN.29.27', 3, 'La semaine demandée par Laban en Genèse 29,27 ouvre la difficulté sur la date du mariage avec Rachel.'],
  [268, 'GEN.29.28', 3, 'L’accomplissement de la semaine en Genèse 29,28 est distingué d’un nouveau service de sept ans avant le mariage.'],
  [269, 'GEN.29.27', 1, 'Citation explicite vérifiée de l’ordre d’achever la semaine de Lia avant de recevoir Rachel pour sept années de service.'],
  [269, 'GEN.29.27', 3, 'La semaine de Genèse 29,27 est interprétée comme les sept jours de la fête nuptiale.'],
  [270, 'GEN.29.28', 1, 'Citation explicite vérifiée de l’accomplissement de la semaine et du don de Rachel comme épouse.'],
  [270, 'GEN.29.28', 3, 'Genèse 29,28 montre que Rachel fut donnée après les sept jours de noces et avant les sept années suivantes.'],
  [271, 'GEN.29.29', 1, 'Citation explicite vérifiée du don de Balla comme servante à Rachel.'],
  [271, 'GEN.29.30', 1, 'Citation explicite vérifiée de l’union avec Rachel, de l’amour supérieur et des sept années de service suivantes.'],
  [271, 'GEN.29.30', 3, 'L’ordre des propositions en Genèse 29,30 confirme que Jacob servit sept ans après avoir épousé Rachel.'],
  [272, 'GEN.29.27', 3, 'La durée nuptiale de Genèse 29,27 est confirmée par la coutume des noces célébrées pendant sept jours.'],
  [272, 'GEN.29.28', 3, 'Le don de Rachel après la semaine en Genèse 29,28 écarte une attente supplémentaire de sept années.'],
  [272, 'GEN.29.30', 3, 'Les sept années suivantes de Genèse 29,30 sont postérieures au mariage avec Rachel.'],
  [272, 'JDG.14.10', 1, 'Référence intentionnelle vérifiée au festin nuptial de Samson conforme à la coutume des jeunes gens.'],
  [272, 'JDG.14.10', 3, 'Le festin de Samson en Juges 14,10 confirme l’existence d’une coutume nuptiale.'],
  [273, 'JDG.14.10', 1, 'Citation intentionnelle vérifiée du festin nuptial donné par Samson selon l’usage des jeunes gens.'],
  [273, 'JDG.14.12', 1, 'Référence intentionnelle vérifiée aux sept jours du festin de Samson.'],
  [273, 'JDG.14.10', 3, 'Juges 14,10 atteste que le festin de Samson était lié à ses noces et conforme à l’usage.'],
  [273, 'JDG.14.12', 3, 'Les sept jours de Juges 14,12 servent de parallèle précis à la semaine nuptiale de Lia.'],

  [274, 'GEN.16.3', 1, 'Référence intentionnelle vérifiée à Agar donnée comme épouse à Abraham.'],
  [274, 'GEN.16.3', 3, 'Genèse 16,3 fournit le premier exemple d’une concubine également appelée épouse.'],
  [274, 'GEN.25.1', 1, 'Référence intentionnelle vérifiée à Céthura appelée épouse d’Abraham.'],
  [274, 'GEN.25.1', 3, 'Genèse 25,1 fournit le cas de Céthura nommée épouse.'],
  [274, 'GEN.25.6', 1, 'Référence intentionnelle vérifiée aux fils des concubines d’Abraham.'],
  [274, 'GEN.25.6', 3, 'Genèse 25,6 permet de comprendre Céthura parmi les concubines tout en l’appelant épouse.'],
  [274, 'GEN.30.3', 1, 'Référence intentionnelle vérifiée à Rachel donnant sa servante Balla à Jacob.'],
  [274, 'GEN.30.3', 3, 'La demande de Rachel en Genèse 30,3 introduit le statut de Balla.'],
  [274, 'GEN.30.4', 1, 'Référence intentionnelle vérifiée à Balla donnée comme épouse à Jacob.'],
  [274, 'GEN.30.4', 3, 'Genèse 30,4 montre explicitement la servante Balla appelée épouse.'],
  [274, 'GEN.30.9', 1, 'Référence intentionnelle vérifiée à Zelfa, servante de Lia, donnée à Jacob.'],
  [274, 'GEN.30.9', 3, 'Genèse 30,9 fournit l’exemple parallèle de Zelfa donnée par Lia.'],
  [275, 'GEN.16.3', 3, 'Agar est classée parmi les femmes à la fois épouses et concubines à partir de Genèse 16,3.'],
  [275, 'GEN.25.1', 3, 'Céthura nommée épouse en Genèse 25,1 appartient à la synthèse terminologique.'],
  [275, 'GEN.25.6', 3, 'La désignation des concubines en Genèse 25,6 complète le statut de Céthura.'],
  [275, 'GEN.30.3', 3, 'Le don de Balla par Rachel en Genèse 30,3 participe à la distinction entre épouse et concubine.'],
  [275, 'GEN.30.4', 3, 'Balla appelée épouse en Genèse 30,4 illustre qu’une concubine peut recevoir ce nom.'],
  [275, 'GEN.30.9', 3, 'Zelfa donnée par Lia en Genèse 30,9 complète la série des épouses-concubines.'],
]

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const { data: segments, error: erreurSegments } = await supabase.from('segments')
  .select('id,segment_numero,segment_texte,notes,ref_niv1,ref_niv2,ref_niv2_texte,liens_revus_le,liens_revus_par')
  .eq('id_oeuvre', OEUVRE).eq('ref_niv1', 'Livre premier').in('ref_niv2', QUESTIONS).order('segment_numero')
if (erreurSegments) throw erreurSegments
if (segments.length !== 23 || segments[0]?.segment_numero !== 253 || segments.at(-1)?.segment_numero !== 275) {
  throw new Error(`Préétat : lot inattendu (${segments.length}, ${segments[0]?.segment_numero}-${segments.at(-1)?.segment_numero})`)
}
if (segments.some((segment, index) => segment.segment_numero !== 253 + index)) throw new Error('Préétat : numérotation non continue')
if (segments.some((segment) => segment.ref_niv1 !== 'Livre premier' || !QUESTIONS.includes(segment.ref_niv2))) throw new Error('Préétat : fuite structurelle')
const questionsTrouvees = new Set(segments.map((segment) => segment.ref_niv2))
if (questionsTrouvees.size !== QUESTIONS.length || QUESTIONS.some((question) => !questionsTrouvees.has(question))) throw new Error('Préétat : questions incomplètes')
if (segments.some((segment) => segment.liens_revus_le || segment.liens_revus_par)) throw new Error('Préétat : un segment est déjà marqué relu')

const empreinte = createHash('sha256').update(JSON.stringify(segments.map((segment) => [
  segment.id, segment.segment_numero, segment.ref_niv1, segment.ref_niv2,
  segment.ref_niv2_texte, segment.segment_texte, segment.notes,
]))).digest('hex')
if (empreinte !== EMPREINTE_ATTENDUE) throw new Error(`Préétat : texte ou structure modifié (${empreinte})`)

const parNumero = new Map(segments.map((segment) => [segment.segment_numero, segment]))
const numerosLies = new Set(LIENS.map(([numero]) => numero))
const nonClasses = segments.filter((segment) => !numerosLies.has(segment.segment_numero) && !SANS_LIEN.has(segment.segment_numero))
if (nonClasses.length) throw new Error(`Partition incomplète : ${nonClasses.map((segment) => segment.segment_numero).join(', ')}`)
if ([...SANS_LIEN].some((numero) => numerosLies.has(numero) || !parNumero.has(numero))) throw new Error('Déclaration SANS_LIEN incohérente')
if (LIENS.some(([numero, canon, type, motif]) => !parNumero.has(numero) || !canon || ![1, 2, 3, 4].includes(type) || !motif.trim())) throw new Error('Manifeste invalide')
const cles = LIENS.map(([numero, canon, type]) => `${numero}|${canon}|${type}`)
if (new Set(cles).size !== cles.length) throw new Error('Doublon interne segment/cible/type')

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
const { count: existants, error: erreurExistants } = await supabase.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids)
if (erreurExistants) throw erreurExistants
if (existants) throw new Error(`Préétat : ${existants} lien(s) existe(nt) déjà`)
const types = LIENS.reduce((compte, [, , type]) => ({ ...compte, [type]: (compte[type] ?? 0) + 1 }), {})
console.log(JSON.stringify({ mode: WRITE ? 'écriture' : 'contrôle', lot: 'Genèse LXXXI-XC', bornes: [253, 275], segments: segments.length, liens: LIENS.length, sans_lien: [...SANS_LIEN], cibles_distinctes: cibles.length, types, empreinte }, null, 2))

if (DETAIL) {
  for (const [numero, canon, type, motif] of LIENS) {
    const segment = parNumero.get(numero)
    const temoin = parCible.get(canon)
    console.log(JSON.stringify({ segment_numero: numero, type, canon_id: canon, motif, segment_texte: segment.segment_texte, temoin: temoin.TR0003 || temoin.TR0001 || temoin.TR0004 }, null, 2))
  }
}
if (!WRITE) process.exit(0)

const q = (value) => `'${String(value).replaceAll("'", "''")}'`
const values = LIENS.map(([numero, canon, type, motif]) => `(${parNumero.get(numero).id},${q(canon)},${type},'vérifié',${q(motif)},'lecture',false)`).join(',\n    ')
const idSql = ids.join(',')
const sql = `do $passe$ declare n integer; begin
  if exists(select 1 from liens_bibliques where segment_id in (${idSql})) then raise exception 'Liens déjà présents'; end if;
  if exists(select 1 from segments where id in (${idSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Marques déjà présentes'; end if;
  insert into liens_bibliques(segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis) values ${values};
  get diagnostics n=row_count; if n<>${LIENS.length} then raise exception 'Liens %/${LIENS.length}',n; end if;
  update segments set liens_revus_le=now(),liens_revus_par=${q(RELECTEUR)} where id in (${idSql});
  get diagnostics n=row_count; if n<>${segments.length} then raise exception 'Segments %/${segments.length}',n; end if;
end $passe$;`
const { error: erreurEcriture } = await supabase.rpc('exec_sql', { sql })
if (erreurEcriture) throw erreurEcriture

const [{ count: liensApres, error: e1 }, { count: relusApres, error: e2 }, { data: auditLiens, error: e3 }] = await Promise.all([
  supabase.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  supabase.from('segments').select('id', { count: 'exact', head: true }).in('id', ids).not('liens_revus_le', 'is', null),
  supabase.from('liens_bibliques').select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id', ids),
])
if (e1) throw e1
if (e2) throw e2
if (e3) throw e3
if (liensApres !== LIENS.length || relusApres !== segments.length) throw new Error(`Postétat invalide : ${liensApres}/${relusApres}`)
if (auditLiens.some((link) => !link.canon_id || !link.motif || link.fiabilite !== 'vérifié' || link.provenance !== 'lecture' || link.arbitrage_requis)) throw new Error('Postcontrôle qualitatif invalide')
const clesApres = auditLiens.map((link) => `${link.segment_id}|${link.canon_id}|${link.type}`)
if (new Set(clesApres).size !== clesApres.length) throw new Error('Postcontrôle : doublon détecté')
console.log(`✓ ${liensApres} liens vérifiés écrits ; ${relusApres} segments marqués relus`)
