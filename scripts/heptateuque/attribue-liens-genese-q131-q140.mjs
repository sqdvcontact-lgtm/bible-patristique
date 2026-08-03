import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const WRITE = process.argv.includes('--write')
const DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Genèse Q. CXXXI-CXL'
const EMPREINTE_ATTENDUE = '9cf31363452b594838771e03f5e9533cd20235e93ad7d46532991c0ce1678668'
// Deux identifiants portent des coquilles de l’édition, conservées avec sic.
const QUESTIONS = ['Question CXXI [<i>sic</i>]', 'Question CXXXII', 'Question CXXX [<i>sic</i>]', 'Question CXXXIV', 'Question CXXXV', 'Question CXXXVI', 'Question CXXXVII', 'Question CXXXVIII', 'Question CXXXIX', 'Question CXL']
const SANS_LIEN = new Set()

// [segment_numero, canon_id, type, motif]
const LIENS = [
  [416, 'GEN.40.16', 1, 'Citation explicite vérifiée des trois corbeilles de pain ou de farine portées par le grand panetier.'],
  [416, 'GEN.40.16', 3, 'Question lexicale précise sur la matière des pains de Genèse 40,16 selon les témoins latin et grec.'],
  [417, 'GEN.40.16', 1, 'Référence intentionnelle vérifiée aux trois corbeilles de pains d’orge.'],
  [417, 'GEN.40.16', 3, 'Les pains ordinaires de Genèse 40,16 sont conciliés avec le contenu de la corbeille supérieure.'],
  [417, 'GEN.40.17', 1, 'Référence intentionnelle vérifiée aux pâtisseries de toute espèce placées dans la corbeille supérieure.'],
  [417, 'GEN.40.17', 3, 'Genèse 40,17 précise la différence entre pains ordinaires et pâtisseries destinées à Pharaon.'],

  [418, 'GEN.41.1', 1, 'Citation explicite vérifiée de Pharaon se tenant sur ou près du fleuve dans son songe.'],
  [418, 'GEN.41.1', 3, 'La préposition de Genèse 41,1 est expliquée au sens de « près du fleuve ».'],
  [418, 'GEN.24.13', 1, 'Citation explicite vérifiée du serviteur d’Abraham se tenant sur ou près de la fontaine.'],
  [418, 'GEN.24.13', 3, 'Genèse 24,13 fournit un parallèle grammatical à la formule du songe de Pharaon.'],
  [418, 'PSA.23.2', 1, 'Citation explicite vérifiée du Psaume 23,2 selon la numérotation grecque : la terre établie sur les eaux.'],
  [418, 'PSA.23.2', 3, 'Le Psaume 23,2 est interprété comme élévation de la terre au-dessus des eaux, non comme flottaison.'],
  [419, 'PSA.23.2', 3, 'La terre au-dessus des eaux en Psaume 23,2 est expliquée par sa fonction d’habitat terrestre.'],

  [420, 'GEN.41.30', 1, 'Citation explicite vérifiée de l’oubli de l’abondance pendant la famine à venir.'],
  [420, 'GEN.41.30', 3, 'Le futur de Genèse 41,30 est rapporté au moment où Joseph parle, non à une abondance postérieure à la famine.'],
  [421, 'GEN.41.2', 2, 'Les vaches grasses signifiant l’abondance sont reprises sans citation formelle.'],
  [421, 'GEN.41.3', 2, 'Les vaches maigres signifiant la famine sont reprises sans citation formelle.'],
  [421, 'GEN.41.5', 2, 'Les beaux épis signifiant l’abondance sont absorbés dans l’explication.'],
  [421, 'GEN.41.6', 2, 'Les épis maigres signifiant la famine sont absorbés dans l’explication.'],
  [421, 'GEN.41.30', 3, 'Les images du songe éclairent l’oubli de l’abondance annoncé en Genèse 41,30.'],

  [422, 'GEN.41.38', 1, 'Citation explicite vérifiée de Pharaon reconnaissant en Joseph l’Esprit de Dieu.'],
  [422, 'GEN.41.38', 3, 'Genèse 41,38 est recensé comme troisième mention de l’Esprit de Dieu dans la Genèse.'],
  [423, 'GEN.1.2', 1, 'Citation explicite vérifiée de l’Esprit de Dieu porté sur les eaux.'],
  [423, 'GEN.6.3', 1, 'Citation explicite vérifiée de l’Esprit de Dieu ne demeurant pas dans les hommes de chair.'],
  [423, 'GEN.41.38', 1, 'Référence intentionnelle vérifiée à l’Esprit de Dieu reconnu en Joseph par Pharaon.'],
  [423, 'GEN.1.2', 3, 'Genèse 1,2 est identifié comme première occurrence de l’Esprit de Dieu.'],
  [423, 'GEN.6.3', 3, 'Genèse 6,3 est identifié comme deuxième occurrence de l’Esprit de Dieu.'],
  [423, 'GEN.41.38', 3, 'Genèse 41,38 complète la comparaison des trois mentions sans employer encore le titre Esprit-Saint.'],

  [424, 'GEN.41.45', 1, 'Citation explicite vérifiée du surnom égyptien donné à Joseph par Pharaon.'],
  [424, 'GEN.41.45', 3, 'Le surnom de Genèse 41,45 est interprété comme « révélateur des secrets » ou « Sauveur du monde ».'],

  [425, 'GEN.41.45', 1, 'Citation explicite vérifiée du mariage de Joseph avec Aseneth, fille de Putiphar, prêtre d’Héliopolis.'],
  [425, 'GEN.41.45', 3, 'L’identité du Putiphar de Genèse 41,45 avec l’ancien maître de Joseph est mise en question.'],
  [425, 'GEN.39.1', 1, 'Référence intentionnelle vérifiée au Putiphar qui acheta Joseph comme esclave.'],
  [425, 'GEN.39.1', 3, 'Genèse 39,1 fournit le terme de comparaison pour distinguer ou identifier les deux Putiphar.'],
  [426, 'GEN.41.45', 3, 'L’absence de rappel de l’ancien esclavage favorise l’hypothèse d’un autre Putiphar en Genèse 41,45.'],
  [426, 'GEN.39.1', 3, 'Le statut d’ancien maître décrit en Genèse 39,1 aurait constitué un détail remarquable si le beau-père était le même homme.'],
  [427, 'GEN.39.1', 1, 'Référence intentionnelle vérifiée à Putiphar qualifié d’eunuque dans la tradition latine.'],
  [427, 'GEN.39.7', 1, 'Référence intentionnelle vérifiée à la femme du maître de Joseph.'],
  [427, 'GEN.39.1', 3, 'La qualification d’eunuque en Genèse 39,1 est conciliée avec l’existence d’une épouse et d’une fille possibles.'],
  [427, 'GEN.39.7', 3, 'La femme mentionnée en Genèse 39,7 sert d’objection à une compréhension absolue du mot eunuque.'],
  [428, 'GEN.39.1', 1, 'Référence intentionnelle vérifiée au titre militaire ou domestique porté par l’ancien maître de Joseph.'],
  [428, 'GEN.41.45', 1, 'Référence intentionnelle vérifiée au titre de prêtre d’Héliopolis porté par le beau-père de Joseph.'],
  [428, 'GEN.39.1', 3, 'Le titre de Genèse 39,1 est confronté à la dignité sacerdotale de l’autre récit.'],
  [428, 'GEN.41.45', 3, 'Genèse 41,45 pourrait désigner une seconde charge du même homme, hypothèse jugée difficile.'],
  [429, 'GEN.39.1', 3, 'La charge antérieure de Genèse 39,1 est distinguée d’une dignité religieuse mise ultérieurement en relief.'],
  [429, 'GEN.41.45', 3, 'Le titre sacerdotal de Genèse 41,45 est interprété dans le contexte de l’élévation de Joseph.'],
  [430, 'GEN.40.3', 1, 'Référence intentionnelle vérifiée à la prison située dans la maison du chef des gardes.'],
  [430, 'GEN.40.3', 3, 'La responsabilité carcérale de Genèse 40,3 rend difficile son cumul avec le sacerdoce d’Héliopolis.'],
  [430, 'GEN.41.45', 3, 'La charge sacerdotale de Genèse 41,45 est jugée peu compatible avec les fonctions pénitentiaires.'],
  [431, 'GEN.41.45', 3, 'La précision « prêtre de la ville du soleil » en Genèse 41,45 implique un ministère à Héliopolis.'],
  [432, 'GEN.39.1', 3, 'Les fonctions militaires de l’ancien Putiphar en Genèse 39,1 sont jugées incompatibles avec le service exclusif des temples.'],
  [432, 'GEN.41.45', 3, 'Le sacerdoce d’Héliopolis en Genèse 41,45 renforce l’hypothèse de deux hommes distincts.'],
  [433, 'GEN.39.1', 3, 'L’identité de l’ancien maître de Joseph demeure ouverte sans conséquence doctrinale.'],
  [433, 'GEN.41.45', 3, 'L’identité du beau-père nommé en Genèse 41,45 demeure une question historique indifférente à la foi.'],

  [434, 'GEN.41.49', 1, 'Citation explicite vérifiée du froment amassé comme le sable de la mer et devenu innombrable.'],
  [434, 'GEN.41.49', 3, 'Question précise sur le sens de l’hyperbole « il n’y avait plus de nombre » en Genèse 41,49.'],
  [435, 'GEN.41.49', 3, 'L’innombrable de Genèse 41,49 est interprété comme dépassement des noms de nombres usuels, non comme quantité infinie.'],
  [436, 'GEN.41.49', 3, 'La formule de Genèse 41,49 est admise comme hyperbole.'],

  [437, 'GEN.42.6', 1, 'Référence intentionnelle vérifiée aux frères de Joseph se prosternant devant lui.'],
  [437, 'GEN.42.9', 1, 'Citation explicite vérifiée de Joseph se souvenant de ses anciens songes.'],
  [437, 'GEN.37.7', 1, 'Référence intentionnelle vérifiée au songe des gerbes des frères se prosternant devant celle de Joseph.'],
  [437, 'GEN.37.9', 1, 'Référence intentionnelle vérifiée au songe du soleil, de la lune et des onze étoiles.'],
  [437, 'GEN.37.10', 1, 'Référence intentionnelle vérifiée au reproche du père de Joseph sur l’accomplissement du second songe.'],
  [437, 'GEN.35.19', 1, 'Référence intentionnelle vérifiée à la mort antérieure de Rachel, mère de Joseph.'],
  [437, 'GEN.42.6', 3, 'La prosternation des frères en Genèse 42,6 accomplit directement le songe des gerbes.'],
  [437, 'GEN.42.9', 3, 'Le souvenir de Genèse 42,9 ouvre la recherche d’un accomplissement plus élevé des songes.'],
  [437, 'GEN.37.7', 3, 'Le songe des gerbes de Genèse 37,7 trouve un accomplissement historique dans les frères prosternés.'],
  [437, 'GEN.37.9', 3, 'Le songe du soleil et de la lune de Genèse 37,9 ne peut être accompli littéralement de la même manière.'],
  [437, 'GEN.37.10', 3, 'Le reproche de Genèse 37,10 fonde la difficulté sur le père vivant et la mère déjà morte.'],
  [437, 'GEN.35.19', 3, 'La mort de Rachel en Genèse 35,19 empêche un accomplissement littéral du songe par la mère de Joseph.'],

  [438, 'GEN.42.15', 1, 'Citation explicite vérifiée du serment par le salut de Pharaon et de l’arrivée exigée du plus jeune frère.'],
  [438, 'GEN.42.15', 3, 'Question morale précise sur le serment prononcé par Joseph en Genèse 42,15.'],
  [439, 'GEN.42.15', 3, 'Le serment de Genèse 42,15 est examiné à la lumière de la fidélité habituelle de Joseph.'],
  [439, 'GEN.39.1', 3, 'La fidélité de Joseph envers son premier maître est rappelée à partir de son esclavage décrit en Genèse 39,1.'],
  [440, 'GEN.42.15', 1, 'Citation explicite vérifiée de la condition interdisant la sortie avant l’arrivée de Benjamin.'],
  [440, 'GEN.42.15', 3, 'La condition de Genèse 42,15 est interprétée distributivement et non comme rétention de tous les frères.'],
  [440, 'GEN.42.19', 1, 'Référence intentionnelle vérifiée à la décision de retenir un seul frère en prison.'],
  [440, 'GEN.42.20', 1, 'Référence intentionnelle vérifiée à l’ordre de ramener Benjamin.'],
  [440, 'GEN.42.24', 1, 'Référence intentionnelle vérifiée à Siméon retenu et lié devant ses frères.'],
  [441, 'GEN.42.15', 3, 'La condition de Genèse 42,15 ne pouvait viser tous les frères, puisque certains devaient chercher Benjamin.'],
  [441, 'GEN.42.16', 3, 'L’envoi d’un frère en Genèse 42,16 confirme que la menace n’était pas collective au sens strict.'],
  [442, 'GEN.42.16', 1, 'Citation explicite vérifiée du second serment conditionnel sur la vérité des frères et leur qualité d’espions.'],
  [442, 'GEN.42.16', 3, 'Le second serment de Genèse 42,16 rend plus pressante la question du parjure.'],
  [443, 'GEN.42.16', 3, 'La formule « vous êtes des espions » est interprétée comme dignité du châtiment réservé aux espions.'],
  [444, 'GEN.42.16', 3, 'Une comparaison juridique explique pourquoi le serment conditionnel de Genèse 42,16 ne contient rien de faux.'],
  [445, 'GEN.42.16', 3, 'La condition de Genèse 42,16 est examinée malgré la différence logique entre mensonge et espionnage.'],
  [446, 'GEN.42.16', 3, '« Vous êtes des espions » en Genèse 42,16 est expliqué au sens de « vous serez considérés comme des espions ».'],
  [447, '1KI.18.24', 1, 'Citation explicite vérifiée d’Élie : le dieu qui répondra par le feu sera reconnu pour Dieu.'],
  [447, '1KI.18.24', 3, '1 Rois 18,24 fournit un parallèle grammatical où « sera » signifie « sera reconnu comme ».'],
  [447, 'GEN.42.16', 3, 'Le parallèle d’Élie confirme la lecture attributive de la formule « vous êtes des espions ».'],

  [448, 'GEN.42.21', 1, 'Référence intentionnelle vérifiée au repentir des frères pour le mal commis envers Joseph.'],
  [448, 'GEN.42.22', 1, 'Référence intentionnelle vérifiée à l’interprétation du danger comme châtiment du sang de Joseph.'],
  [448, 'GEN.42.23', 1, 'Citation explicite vérifiée de l’ignorance des frères : Joseph comprenait malgré l’interprète.'],
  [448, 'GEN.42.23', 3, 'Question précise sur la fonction de l’interprète dans Genèse 42,23.'],
  [449, 'GEN.42.23', 3, 'L’interprète de Genèse 42,23 est expliqué comme intermédiaire feignant que Joseph ignorait leur langue.'],
]

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: segments, error: erreurSegments } = await supabase.from('segments').select('id,segment_numero,segment_texte,notes,ref_niv1,ref_niv2,ref_niv2_texte,liens_revus_le,liens_revus_par').eq('id_oeuvre', OEUVRE).eq('ref_niv1', 'Livre premier').gte('segment_numero', 416).lte('segment_numero', 449).order('segment_numero')
if (erreurSegments) throw erreurSegments
if (segments.length !== 34 || segments[0]?.segment_numero !== 416 || segments.at(-1)?.segment_numero !== 449) throw new Error(`Préétat : lot inattendu (${segments.length}, ${segments[0]?.segment_numero}-${segments.at(-1)?.segment_numero})`)
if (segments.some((segment, index) => segment.segment_numero !== 416 + index)) throw new Error('Préétat : numérotation non continue')
if (segments.some((segment) => segment.ref_niv1 !== 'Livre premier' || !QUESTIONS.includes(segment.ref_niv2))) throw new Error('Préétat : fuite structurelle')
const questionsTrouvees = [...new Set(segments.map((segment) => segment.ref_niv2))]
if (JSON.stringify(questionsTrouvees) !== JSON.stringify(QUESTIONS)) throw new Error(`Préétat : questions inattendues (${questionsTrouvees.join(', ')})`)
if (segments.some((segment) => segment.liens_revus_le || segment.liens_revus_par)) throw new Error('Préétat : un segment est déjà marqué relu')
const empreinte = createHash('sha256').update(JSON.stringify(segments.map((segment) => [segment.id, segment.segment_numero, segment.ref_niv1, segment.ref_niv2, segment.ref_niv2_texte, segment.segment_texte, segment.notes]))).digest('hex')
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
const { data: temoins, error: erreurTemoins } = await supabase.from('versets_lecture').select('id_verset,ref,"TR0001","TR0003","TR0004"').in('id_verset', cibles)
if (erreurTemoins) throw erreurTemoins
const parCible = new Map(temoins.map((temoin) => [temoin.id_verset, temoin]))
const absents = cibles.filter((cible) => !parCible.has(cible))
if (absents.length) throw new Error(`Cibles absentes : ${absents.join(', ')}`)
const sansTexte = cibles.filter((cible) => { const temoin = parCible.get(cible); return !temoin.TR0001 && !temoin.TR0003 && !temoin.TR0004 })
if (sansTexte.length) throw new Error(`Cibles sans témoin lisible : ${sansTexte.join(', ')}`)
const ids = segments.map((segment) => segment.id)
const { count: existants, error: erreurExistants } = await supabase.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids)
if (erreurExistants) throw erreurExistants
if (existants) throw new Error(`Préétat : ${existants} lien(s) existe(nt) déjà`)
const types = LIENS.reduce((count, [, , type]) => ({ ...count, [type]: (count[type] ?? 0) + 1 }), {})
console.log(JSON.stringify({ mode: WRITE ? 'écriture' : 'contrôle', lot: 'Genèse CXXXI-CXL', bornes: [416, 449], questions_live: QUESTIONS, segments: segments.length, liens: LIENS.length, sans_lien: [...SANS_LIEN], cibles_distinctes: cibles.length, types, empreinte }, null, 2))
if (DETAIL) for (const [numero, canon, type, motif] of LIENS) { const temoin = parCible.get(canon); console.log(JSON.stringify({ segment_numero: numero, canon_id: canon, type, motif, segment_texte: parNumero.get(numero).segment_texte, temoin: temoin.TR0003 || temoin.TR0001 || temoin.TR0004 }, null, 2)) }
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
