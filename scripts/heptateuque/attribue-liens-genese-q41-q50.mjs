import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const PREMIER_SEGMENT = 129
const DERNIER_SEGMENT = 148
const NB_SEGMENTS = 20
const EMPREINTE_TEXTE = '420d94040b8e0ea29fc509bc53f1eec73aeeefc031f5711b319bfaa3ed035e98'
const WRITE = process.argv.includes('--write')
const RELECTEUR = 'Codex (IA) — lecture intégrale Heptateuque, Genèse Q. XLI-L'
const QUESTIONS_ATTENDUES = [
  'Question XLI', 'Question XLII', 'Question XLIII', 'Question XLIV', 'Question XLV',
  'Question XLVI', 'Question XLVII', 'Question XLVIII', 'Question XLIX', 'Question L',
]

// Partition exhaustive du lot : tout segment doit figurer dans LIENS ou SANS_LIEN.
const SANS_LIEN = new Set()

// Manifeste lu : [segment_numero, canon_id, type, motif].
// Les trois témoins de versets_lecture ont été confrontés au texte de chaque segment.
const LIENS = [
  [129, 'GEN.19.1', 1, 'Référence intentionnelle vérifiée à Loth allant au-devant des deux anges et se prosternant face contre terre.'],
  [129, 'GEN.19.3', 1, 'Référence intentionnelle vérifiée au festin offert par Loth aux visiteurs, qui mangèrent.'],
  [129, 'GEN.19.1', 3, 'Le comportement initial de Loth en Genèse 19,1 fonde la question de sa reconnaissance des anges.'],
  [129, 'GEN.19.3', 3, 'Le repas corporel de Genèse 19,3 est opposé à la nature angélique des visiteurs.'],
  [130, 'GEN.18.2', 1, 'Référence intentionnelle vérifiée aux trois hommes apparus à Abraham.'],
  [130, 'GEN.18.2', 3, 'L’apparition à Abraham en Genèse 18,2 sert de parallèle précis à celle de Loth.'],
  [130, 'GEN.19.1', 3, 'La manifestation divine sous une apparence mortelle explique la conduite de Loth en Genèse 19,1.'],
  [130, 'GEN.19.3', 3, 'L’apparence mortelle des anges explique le repas qui leur est offert en Genèse 19,3.'],
  [131, 'HEB.13.2', 1, 'Citation explicite vérifiée de l’hospitalité donnée à des anges sans le savoir ; la note imprimée « Heb. XII, 2 » est décalée.'],
  [131, 'GEN.19.1', 3, 'Hébreux 13,2 éclaire l’incertitude de Loth devant les anges arrivés en Genèse 19,1.'],
  [131, 'GEN.19.3', 3, 'L’hospitalité exercée sans reconnaître les anges éclaire le festin de Genèse 19,3.'],

  [132, 'GEN.19.8', 1, 'Citation explicite vérifiée de l’offre des deux filles de Loth afin de protéger ses hôtes.'],
  [132, 'GEN.19.8', 3, 'Ouverture du jugement moral porté sur la conduite de Loth en Genèse 19,8.'],
  [133, 'GEN.19.8', 3, 'Examen précis de la licéité morale de l’offre rapportée en Genèse 19,8.'],
  [134, 'GEN.19.8', 3, 'Conclusion : l’acte de Genèse 19,8 relève du trouble et ne peut faire autorité.'],

  [135, 'GEN.19.11', 1, 'Citation explicite vérifiée de l’aveuglement des hommes à la porte de la maison.'],
  [135, 'GEN.19.11', 3, 'Analyse lexicale du grec ἀορασία pour préciser la nature de l’aveuglement en Genèse 19,11.'],
  [136, 'GEN.19.11', 3, 'Le fait que les Sodomites continuent à chercher la porte précise la privation visuelle de Genèse 19,11.'],
  [136, '2KI.6.18', 4, 'Parallèle explicite avec l’aveuglement des Syriens venus chercher Élisée, même privation sélective de la vue.'],
  [137, 'GEN.19.11', 3, 'La non-reconnaissance du Ressuscité sert de second parallèle à l’aveuglement de Genèse 19,11.'],
  [137, 'LUK.24.16', 4, 'Parallèle explicite avec les yeux des disciples retenus afin qu’ils ne reconnaissent pas le Seigneur.'],

  [138, 'GEN.19.18', 1, 'Citation explicite vérifiée de la réponse de Loth au Seigneur.'],
  [138, 'GEN.19.19', 1, 'Citation explicite vérifiée de la grâce reçue et de la peur de mourir sur la montagne.'],
  [139, 'GEN.19.18', 3, 'Le refus de Loth est interprété comme un manque de confiance envers Dieu reconnu dans les anges.'],
  [139, 'GEN.19.19', 3, 'La peur exprimée en Genèse 19,19 est jugée impropre à faire autorité.'],
  [139, 'GEN.19.8', 3, 'L’offre des filles en Genèse 19,8 est rapprochée du même trouble et privée de toute valeur normative.'],

  [140, 'GEN.19.29', 1, 'Citation explicite vérifiée : Dieu se souvint d’Abraham et délivra Loth de la ruine.'],
  [140, 'GEN.19.29', 3, 'La délivrance de Genèse 19,29 est attribuée principalement aux mérites d’Abraham et sert à qualifier la justice de Loth.'],

  [141, 'GEN.19.30', 1, 'Citation explicite vérifiée de la sortie de Ségor et de l’établissement de Loth sur la montagne.'],
  [141, 'GEN.19.30', 3, 'La montagne choisie en Genèse 19,30 est comparée à celle que Loth avait auparavant refusée.'],
  [141, 'GEN.19.17', 1, 'Référence intentionnelle vérifiée à l’ordre du Seigneur de se sauver sur la montagne.'],
  [141, 'GEN.19.17', 3, 'L’ordre de Genèse 19,17 est confronté au refuge finalement choisi en Genèse 19,30.'],

  [142, 'GEN.19.30', 1, 'Citation explicite vérifiée de la peur de Loth de demeurer à Ségor.'],
  [142, 'GEN.19.30', 3, 'La peur de Genèse 19,30 manifeste la faiblesse persistante de la foi de Loth.'],
  [142, 'GEN.19.20', 1, 'Référence intentionnelle vérifiée à la petite ville choisie par Loth comme refuge.'],
  [142, 'GEN.19.20', 3, 'Le refuge demandé par Loth en Genèse 19,20 est opposé à sa crainte ultérieure d’y demeurer.'],
  [142, 'GEN.19.21', 1, 'Référence intentionnelle vérifiée à l’assurance que la ville demandée ne serait pas détruite.'],
  [142, 'GEN.19.21', 3, 'La promesse de Genèse 19,21 rend particulièrement manifeste le peu de foi dénoncé.'],

  [143, 'GEN.20.2', 1, 'Citation explicite vérifiée d’Abraham présentant Sara comme sa sœur.'],
  [143, 'GEN.20.11', 1, 'Référence intentionnelle vérifiée à la crainte d’Abraham d’être tué à cause de sa femme.'],
  [143, 'GEN.20.2', 3, 'La prise de Sara en Genèse 20,2 suscite la question de la vigueur tardive de sa beauté.'],
  [143, 'GEN.17.17', 3, 'L’âge de quatre-vingt-dix ans donné à Sara en Genèse 17,17 précise la difficulté examinée.'],
  [144, 'GEN.20.2', 3, 'La beauté encore capable de séduire explique sans difficulté le récit de Genèse 20,2.'],
  [144, 'GEN.17.17', 3, 'La vigueur de la beauté de Sara est admirée en tenant compte de l’âge indiqué en Genèse 17,17.'],

  [145, 'GEN.20.6', 1, 'Citation explicite vérifiée : Dieu a préservé Abimélech de pécher contre lui.'],
  [145, 'GEN.20.6', 3, 'La formule de Genèse 20,6 fonde l’observation que les péchés charnels sont commis contre Dieu.'],
  [145, 'GEN.20.3', 1, 'Référence intentionnelle vérifiée à l’avertissement divin qu’Abimélech avait pris la femme d’un autre.'],
  [146, 'GEN.20.3', 1, 'Citation explicite vérifiée de la menace divine : « Voilà que tu mourras ».'],
  [146, 'GEN.20.3', 3, 'La menace de mort de Genèse 20,3 est expliquée comme annonce certaine destinée à faire éviter le péché.'],

  [147, 'GEN.21.8', 1, 'Référence intentionnelle vérifiée au festin donné par Abraham le jour du sevrage d’Isaac.'],
  [147, 'GEN.21.8', 3, 'Question précise sur le sens du festin célébré au sevrage d’Isaac en Genèse 21,8.'],
  [148, 'GEN.21.8', 3, 'Le sevrage de Genèse 21,8 reçoit une interprétation spirituelle comme passage à l’homme nouveau.'],
  [148, '1CO.3.2', 1, 'Citation explicite vérifiée du lait opposé à la nourriture solide pour ceux qui sont encore charnels.'],
]

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((ligne) => ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const champsEmpreinte = 'id,segment_numero,ref_niv1,ref_niv2,ref_niv2_texte,segment_texte,texte_original,notes,nature'
const { data: segments, error: erreurSegments } = await supabase.from('segments')
  .select(`${champsEmpreinte},liens_revus_le,liens_revus_par`)
  .eq('id_oeuvre', OEUVRE).gte('segment_numero', PREMIER_SEGMENT)
  .lte('segment_numero', DERNIER_SEGMENT).order('segment_numero')
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
  mode: WRITE ? 'écriture' : 'contrôle', oeuvre: OEUVRE,
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
