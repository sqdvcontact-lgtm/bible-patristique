import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const WRITE = process.argv.includes('--write')
const RELECTEUR = 'Codex (IA) — lecture intégrale Heptateuque, Genèse Q. LI-LX'
const DEBUT = 149
const FIN = 185
const SANS_LIEN = new Set()

// Manifeste établi par lecture continue des dix questions et confrontation
// sémantique avec les trois témoins de versets_lecture.
// [segment_numero, canon_id, type, motif]
const LIENS = [
  [149, 'GEN.21.10', 1, 'Citation explicite vérifiée de l’ordre de Sara de chasser la servante et son fils.'],
  [149, 'GEN.21.10', 3, 'Question précise sur la portée prophétique des paroles de Sara en Genèse 21,10.'],
  [149, 'GEN.21.11', 1, 'Référence intentionnelle vérifiée à la peine éprouvée par Abraham à cause de son fils.'],
  [149, 'GEN.21.11', 3, 'La tristesse d’Abraham en Genèse 21,11 fonde la difficulté examinée.'],
  [150, 'GEN.21.10', 3, 'Deux hypothèses expliquent comment Sara put prononcer prophétiquement l’ordre de Genèse 21,10.'],
  [150, 'GEN.21.11', 3, 'L’affection paternelle explique la peine d’Abraham rapportée en Genèse 21,11.'],
  [150, 'GEN.21.12', 1, 'Référence intentionnelle vérifiée à l’instruction ultérieure donnée par Dieu à Abraham.'],
  [150, 'GEN.21.12', 3, 'L’intervention divine de Genèse 21,12 est distinguée de la première parole de Sara.'],

  [151, 'GEN.21.13', 1, 'Référence intentionnelle vérifiée à Ismaël comme descendance d’Abraham.'],
  [151, 'GEN.21.13', 3, 'Genèse 21,13 est interprété par la distinction paulinienne entre chair et promesse.'],
  [151, 'GEN.21.12', 1, 'Citation scripturaire intentionnelle vérifiée : la descendance portant le nom d’Abraham sortira d’Isaac.'],
  [151, 'ROM.9.7', 1, 'Citation explicite vérifiée de Romains 9,7 sur la descendance appelée en Isaac.'],
  [151, 'ROM.9.8', 1, 'Citation explicite vérifiée de Romains 9,8 sur les enfants de la chair et de la promesse.'],
  [151, 'ROM.9.7', 3, 'L’interprétation apostolique de Romains 9,7 précise la filiation propre d’Isaac.'],
  [151, 'ROM.9.8', 3, 'La distinction de Romains 9,8 explique le statut respectif d’Ismaël et d’Isaac.'],
  [152, 'GEN.21.12', 3, 'Isaac est dit fils propre au sens de la descendance promise en Genèse 21,12.'],
  [152, 'GEN.21.13', 3, 'La filiation charnelle d’Ismaël en Genèse 21,13 est opposée à celle d’Isaac.'],
  [152, 'ROM.9.7', 3, 'Conclusion précise de la distinction paulinienne entre la descendance charnelle et Isaac.'],
  [152, 'ROM.9.8', 3, 'Isaac est qualifié fils de la promesse conformément à Romains 9,8.'],

  [153, 'GEN.21.14', 1, 'Citation explicite vérifiée du renvoi d’Agar avec le pain, l’outre et l’enfant.'],
  [153, 'GEN.21.14', 3, 'Question grammaticale précise sur ce qui fut placé sur les épaules d’Agar en Genèse 21,14.'],
  [154, 'GEN.17.25', 1, 'Référence intentionnelle vérifiée à la circoncision d’Ismaël à treize ans.'],
  [154, 'GEN.17.1', 1, 'Référence intentionnelle vérifiée aux quatre-vingt-dix-neuf ans d’Abraham.'],
  [154, 'GEN.21.5', 1, 'Référence intentionnelle vérifiée aux cent ans d’Abraham lors de la naissance d’Isaac.'],
  [154, 'GEN.21.8', 1, 'Référence intentionnelle vérifiée au sevrage d’Isaac.'],
  [154, 'GEN.21.9', 1, 'Référence intentionnelle vérifiée au jeu d’Ismaël avec Isaac.'],
  [154, 'GEN.21.14', 3, 'Le calcul de l’âge d’Ismaël sert à résoudre la difficulté de Genèse 21,14.'],
  [155, 'GEN.17.25', 1, 'Référence intentionnelle vérifiée à l’âge minimal d’Ismaël après sa circoncision.'],
  [155, 'GEN.21.8', 1, 'Référence intentionnelle vérifiée à l’hypothèse chronologique antérieure au sevrage d’Isaac.'],
  [155, 'GEN.21.9', 1, 'Référence intentionnelle vérifiée au jeu d’Ismaël avec Isaac.'],
  [155, 'GEN.21.14', 3, 'Même en récapitulation, l’âge d’Ismaël interdit de comprendre Genèse 21,14 comme son port sur les épaules.'],
  [156, 'GEN.21.14', 3, 'Résolution syntaxique précise de Genèse 21,14 par le verbe « donna ».'],
  [157, 'GEN.21.14', 3, 'Le complément « et l’enfant » de Genèse 21,14 dépend de « donna », non de « mit sur les épaules ».'],

  [158, 'GEN.21.15', 1, 'Citation explicite vérifiée de l’épuisement de l’eau et de l’abandon de l’enfant sous un arbre.'],
  [158, 'GEN.21.16', 1, 'Citation explicite vérifiée de l’éloignement d’Agar à une portée d’arc.'],
  [159, 'GEN.21.17', 1, 'Citation explicite vérifiée de la voix de l’enfant entendue par Dieu et de l’appel de l’ange.'],
  [159, 'GEN.21.18', 1, 'Citation explicite vérifiée de l’ordre de prendre l’enfant par la main et de la promesse d’un grand peuple.'],
  [160, 'GEN.21.15', 3, 'Question précise sur le sens d’« abandonner » l’enfant sous l’arbre en Genèse 21,15.'],
  [160, 'GEN.21.17', 1, 'Citation explicite vérifiée, selon la tradition suivie, des pleurs de l’enfant.'],
  [160, 'GEN.21.17', 3, 'Les pleurs de l’enfant servent à discuter son âge et sa situation en Genèse 21,17.'],
  [161, 'GEN.21.15', 3, 'L’abandon de Genèse 21,15 est interprété comme éloignement désespéré, non comme port physique.'],
  [161, 'PSA.30.23', 1, 'Citation explicite vérifiée du Psaume 30,23 selon la numérotation grecque de l’édition.'],
  [162, 'GEN.21.15', 3, 'Le langage ordinaire éclaire le verbe employé pour l’abandon d’Ismaël en Genèse 21,15.'],
  [162, 'GEN.21.16', 3, 'L’éloignement d’Agar en Genèse 21,16 est développé comme dissimulation hors de la vue de son fils.'],
  [163, 'GEN.21.17', 3, 'Les pleurs d’Ismaël en Genèse 21,17 sont expliqués par l’absence prolongée de sa mère.'],
  [164, 'GEN.21.18', 1, 'Citation explicite vérifiée de l’ordre « Prends l’enfant ».'],
  [164, 'GEN.21.18', 3, 'L’ordre de Genèse 21,18 est interprété comme rejoindre un compagnon et le tenir par la main.'],

  [165, 'GEN.21.22', 1, 'Citation explicite vérifiée de l’arrivée d’Abimélech « dans ce temps-là ».'],
  [165, 'GEN.21.22', 3, 'La formule chronologique de Genèse 21,22 ouvre la question de la date du puits.'],
  [165, 'GEN.21.27', 1, 'Référence intentionnelle vérifiée à l’alliance conclue entre Abraham et Abimélech.'],
  [165, 'GEN.21.31', 1, 'Référence intentionnelle vérifiée au nom de Bersabée tiré du serment.'],
  [165, 'GEN.21.31', 3, 'La dénomination du puits en Genèse 21,31 est confrontée au récit antérieur d’Agar.'],
  [166, 'GEN.21.14', 1, 'Référence intentionnelle vérifiée à l’errance d’Agar dans le désert de Bersabée.'],
  [166, 'GEN.21.27', 1, 'Référence intentionnelle vérifiée à l’alliance ultérieure d’Abraham et Abimélech.'],
  [166, 'GEN.21.31', 1, 'Référence intentionnelle vérifiée au serment donnant son nom à Bersabée.'],
  [166, 'GEN.21.14', 3, 'L’anticipation du nom Bersabée en Genèse 21,14 crée la difficulté chronologique.'],
  [166, 'GEN.21.31', 3, 'Le serment de Genèse 21,31 est comparé à l’emploi antérieur du toponyme.'],
  [167, 'GEN.21.14', 3, 'L’errance déjà située à Bersabée en Genèse 21,14 est examinée comme possible anticipation.'],
  [167, 'GEN.21.22', 3, 'L’entrevue introduite en Genèse 21,22 est envisagée comme une récapitulation.'],
  [167, 'GEN.21.31', 3, 'La formation du nom en Genèse 21,31 est replacée avant le récit d’Agar dans l’hypothèse récapitulative.'],
  [168, 'GEN.21.14', 3, 'Le toponyme de Genèse 21,14 est expliqué comme une dénomination employée rétrospectivement par l’auteur.'],
  [168, 'GEN.21.31', 3, 'Le nom établi par le serment de Genèse 21,31 peut être anticipé dans la narration.'],
  [169, 'GEN.21.19', 1, 'Référence intentionnelle vérifiée au puits qu’Agar vit de ses propres yeux.'],
  [169, 'GEN.21.14', 3, 'L’emploi de Bersabée dans le récit d’Agar demeure explicable par une dénomination postérieure.'],
  [169, 'GEN.21.19', 3, 'L’identité éventuelle du puits vu par Agar en Genèse 21,19 commande l’hypothèse de récapitulation.'],
  [169, 'GEN.21.31', 3, 'Le puits nommé après le serment en Genèse 21,31 est confronté au puits vu par Agar.'],
  [170, 'GEN.21.19', 3, 'L’existence possible du puits à l’insu d’Agar précise la lecture de Genèse 21,19.'],
  [170, 'GEN.21.30', 3, 'Le puits creusé par Abraham en Genèse 21,30 est supposé pouvoir être éloigné de son habitation.'],

  [171, 'GEN.21.33', 1, 'Référence intentionnelle vérifiée à la plantation d’Abraham auprès de Bersabée.'],
  [171, 'GEN.21.33', 3, 'La plantation de Genèse 21,33 est confrontée à l’absence d’héritage foncier.'],
  [171, 'ACT.7.5', 1, 'Citation explicite vérifiée d’Actes 7,5 : Abraham ne reçut pas même un pied de terre.'],
  [171, 'ACT.7.5', 3, 'Actes 7,5 fournit la difficulté doctrinale résolue par la distinction entre achat et don.'],
  [172, 'GEN.21.33', 3, 'La plantation de Genèse 21,33 est expliquée par une acquisition distincte de l’héritage promis.'],
  [172, 'ACT.7.5', 3, 'L’héritage nié en Actes 7,5 est compris comme don divin, non comme achat.'],
  [172, 'GEN.21.28', 1, 'Référence intentionnelle vérifiée aux sept jeunes brebis mises à part.'],
  [172, 'GEN.21.30', 1, 'Référence intentionnelle vérifiée aux sept jeunes brebis reçues en témoignage du puits creusé.'],
  [172, 'GEN.21.28', 3, 'Les sept brebis de Genèse 21,28 sont interprétées comme prix de l’espace entourant le puits.'],
  [172, 'GEN.21.30', 3, 'Le témoignage relatif au puits en Genèse 21,30 est compris comme acquisition du terrain voisin.'],

  [173, 'GEN.22.1', 1, 'Citation explicite vérifiée : « Dieu tenta Abraham ».'],
  [173, 'GEN.22.1', 3, 'Le verbe « tenter » de Genèse 22,1 est interprété au sens d’éprouver.'],
  [173, 'JAS.1.13', 1, 'Citation intentionnelle vérifiée de Jacques 1,13 : Dieu ne tente personne.'],
  [173, 'JAS.1.13', 3, 'Jacques 1,13 est distingué de Genèse 22,1 comme tentation qui pousse au péché.'],
  [174, '1TH.3.5', 1, 'Citation explicite vérifiée de la crainte que le tentateur ne tente les fidèles.'],
  [174, 'DEU.13.4', 1, 'Citation explicite vérifiée du Deutéronome : Dieu éprouve pour savoir si son peuple l’aime.'],
  [174, 'DEU.13.4', 3, 'Le « savoir » de Deutéronome 13,4 est interprété comme faire connaître à l’homme son amour.'],
  [174, 'GEN.22.1', 3, 'L’épreuve d’Abraham en Genèse 22,1 est éclairée par la distinction entre éprouver et pousser au péché.'],

  [175, 'GEN.22.12', 1, 'Citation explicite vérifiée de l’ordre de ne pas toucher l’enfant et de la crainte de Dieu désormais connue.'],
  [175, 'GEN.22.12', 3, '« Je connais maintenant » en Genèse 22,12 est interprété comme « je te fais connaître ».'],
  [176, 'GEN.22.14', 1, 'Citation explicite vérifiée du nom donné au lieu et de la parole sur la montagne.'],
  [176, 'GEN.22.14', 3, 'Le verbe « voir » de Genèse 22,14 est expliqué causalement au sens de « faire voir ».'],

  [177, 'GEN.22.12', 1, 'Citation explicite vérifiée : Abraham n’a pas épargné son fils pour l’ange qui parle.'],
  [177, 'GEN.22.12', 3, 'Question christologique précise sur l’identité du locuteur de Genèse 22,12.'],
  [178, 'ISA.9.5', 1, 'Citation explicite vérifiée d’Isaïe 9,5 selon la Septante : « l’Ange du grand conseil ».'],
  [178, 'ISA.9.5', 3, 'Le titre d’Isaïe 9,5 selon la Septante appuie l’identification possible de l’ange au Christ.'],
  [178, 'GEN.22.12', 3, 'Deux interprétations du locuteur angélique de Genèse 22,12 sont proposées.'],
  [179, 'GEN.22.15', 1, 'Citation explicite vérifiée du second appel de l’ange du Seigneur depuis le ciel.'],
  [179, 'GEN.22.16', 1, 'Citation explicite vérifiée du serment prêté par Dieu en son propre nom.'],
  [179, 'GEN.22.15', 3, 'Le second appel de Genèse 22,15 est invoqué pour distinguer l’ange de Dieu.'],
  [179, 'GEN.22.16', 3, 'La formule « dit le Seigneur » de Genèse 22,16 est interprétée comme parole divine transmise par l’ange.'],
  [180, 'PSA.2.7', 1, 'Citation explicite vérifiée : « Le Seigneur m’a dit : Tu es mon Fils ».'],
  [180, 'PSA.2.7', 3, 'Le Psaume 2,7 est lu comme prophétie du Christ parlant dans la forme d’esclave.'],
  [180, 'PHP.2.7', 2, 'La formule paulinienne de Philippiens 2,7 sur la forme d’esclave est absorbée dans le raisonnement christologique.'],
  [181, 'JHN.20.17', 1, 'Citation explicite vérifiée de Jean 20,17 : « mon Père et votre Père ; mon Dieu et votre Dieu ».'],
  [181, 'JHN.20.17', 3, 'Jean 20,17 est examiné pour distinguer l’appellation « Dieu » de l’appellation « Seigneur ».'],
  [182, 'PSA.109.1', 1, 'Citation explicite vérifiée du Psaume 109,1 selon la numérotation grecque : « Le Seigneur a dit à mon Seigneur ».'],
  [182, 'PSA.109.1', 3, 'Le Psaume 109,1 est interprété comme parole de David sur le Père et le Fils.'],
  [183, 'GEN.19.24', 1, 'Citation explicite vérifiée : le Seigneur fit pleuvoir de la part du Seigneur.'],
  [183, 'GEN.19.24', 3, 'Genèse 19,24 est interprété comme désignant le Fils agissant de la part du Père.'],

  [184, 'GEN.22.21', 1, 'Référence intentionnelle vérifiée à Camuel, père des Syriens, dans la généalogie de Melcha.'],
  [184, 'GEN.22.21', 3, 'La désignation de Camuel comme père des Syriens en Genèse 22,21 est expliquée comme addition rétrospective.'],
  [185, 'GEN.22.21', 3, 'Conclusion sur l’intervention rétrospective de l’auteur dans la formulation de Genèse 22,21.'],
]

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((ligne) => ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: segments, error: erreurSegments } = await supabase.from('segments')
  .select('id,segment_numero,segment_texte,notes,ref_niv1,ref_niv2,liens_revus_le,liens_revus_par')
  .eq('id_oeuvre', OEUVRE).eq('ref_niv1', 'Livre premier')
  .gte('segment_numero', DEBUT).lte('segment_numero', FIN).order('segment_numero')
if (erreurSegments) throw erreurSegments
if (segments.length !== 37 || segments[0]?.segment_numero !== DEBUT || segments.at(-1)?.segment_numero !== FIN) throw new Error(`Préétat : ${segments.length} segments`)
if (segments.some((segment) => segment.liens_revus_le || segment.liens_revus_par)) throw new Error('Un segment est déjà marqué relu')
const questions = [...new Set(segments.map((segment) => segment.ref_niv2))]
const attendues = ['Question LI', 'Question LII', 'Question LIII', 'Question LIV', 'Question LV', 'Question LVI', 'Question LVII', 'Question LVIII', 'Question LIX', 'Question LX']
if (JSON.stringify(questions) !== JSON.stringify(attendues)) throw new Error(`Questions inattendues : ${questions.join(', ')}`)
const parNumero = new Map(segments.map((segment) => [segment.segment_numero, segment]))
const numerosLies = new Set(LIENS.map(([numero]) => numero))
const nonClasses = segments.filter((segment) => !numerosLies.has(segment.segment_numero) && !SANS_LIEN.has(segment.segment_numero))
if (nonClasses.length) throw new Error(`Segments non classés : ${nonClasses.map((segment) => segment.segment_numero).join(', ')}`)
if ([...SANS_LIEN].some((numero) => numerosLies.has(numero) || !parNumero.has(numero))) throw new Error('Déclaration sans lien incohérente')
if (LIENS.some(([numero, canon, type, motif]) => !parNumero.has(numero) || !canon || ![1, 2, 3, 4].includes(type) || !motif.trim())) throw new Error('Ligne de manifeste invalide')
const cles = LIENS.map(([numero, canon, type]) => `${numero}|${canon}|${type}`)
if (new Set(cles).size !== cles.length) throw new Error('Doublon interne')
const cibles = [...new Set(LIENS.map(([, canon]) => canon))]
const { data: temoins, error: erreurTemoins } = await supabase.from('versets_lecture').select('id_verset').in('id_verset', cibles)
if (erreurTemoins) throw erreurTemoins
const presents = new Set(temoins.map((temoin) => temoin.id_verset))
const absents = cibles.filter((cible) => !presents.has(cible))
if (absents.length) throw new Error(`Cibles absentes : ${absents.join(', ')}`)
const ids = segments.map((segment) => segment.id)
const { count: existants, error: erreurExistants } = await supabase.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids)
if (erreurExistants) throw erreurExistants
if (existants) throw new Error(`${existants} lien(s) existe(nt) déjà`)
const types = LIENS.reduce((compte, [, , type]) => ({ ...compte, [type]: (compte[type] ?? 0) + 1 }), {})
console.log(JSON.stringify({ mode: WRITE ? 'écriture' : 'contrôle', questions, segments: segments.length, liens: LIENS.length, sans_lien: [...SANS_LIEN], cibles_distinctes: cibles.length, types }, null, 2))
if (!WRITE) process.exit(0)

const q = (valeur) => `'${String(valeur).replaceAll("'", "''")}'`
const valeurs = LIENS.map(([numero, canon, type, motif]) => `(${parNumero.get(numero).id},${q(canon)},${type},'vérifié',${q(motif)},'lecture',false)`).join(',\n    ')
const idSql = ids.join(',')
const sql = `do $passe$ declare n integer; begin
  if exists(select 1 from liens_bibliques where segment_id in (${idSql})) then raise exception 'Liens déjà présents'; end if;
  if exists(select 1 from segments where id in (${idSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Marques déjà présentes'; end if;
  insert into liens_bibliques(segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis) values ${valeurs};
  get diagnostics n=row_count; if n<>${LIENS.length} then raise exception 'Liens %/${LIENS.length}',n; end if;
  update segments set liens_revus_le=now(),liens_revus_par=${q(RELECTEUR)} where id in (${idSql});
  get diagnostics n=row_count; if n<>${segments.length} then raise exception 'Segments %/${segments.length}',n; end if;
end $passe$;`
const { error: erreurEcriture } = await supabase.rpc('exec_sql', { sql })
if (erreurEcriture) throw erreurEcriture
const [{ count: liensApres, error: e1 }, { count: relusApres, error: e2 }] = await Promise.all([
  supabase.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  supabase.from('segments').select('id', { count: 'exact', head: true }).in('id', ids).not('liens_revus_le', 'is', null),
])
if (e1) throw e1
if (e2) throw e2
if (liensApres !== LIENS.length || relusApres !== segments.length) throw new Error(`Postétat invalide : ${liensApres}/${relusApres}`)
console.log(`✓ ${liensApres} liens vérifiés écrits ; ${relusApres} segments marqués relus`)
