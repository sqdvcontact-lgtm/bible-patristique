import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const WRITE = process.argv.includes('--write')
const RELECTEUR = 'Codex (IA) — lecture intégrale Heptateuque, Genèse Q. XXI-XXX'
const SANS_LIEN = new Set([64, 65, 94])

// [segment_numero, canon_id, type, motif]
const LIENS = [
  [47, 'GEN.11.4', 1, 'Citation explicite vérifiée du projet de bâtir une ville et une tour atteignant le ciel.'],
  [47, 'GEN.11.4', 3, 'Examen de l’impiété et de la portée réelle du projet formulé en Genèse 11,4.'],

  [48, 'GEN.11.7', 1, 'Citation explicite vérifiée : « descendons et confondons leurs langages ».'],
  [48, 'GEN.11.7', 3, 'Interprétation trinitaire du pluriel employé en Genèse 11,7.'],
  [48, 'GEN.1.26', 1, 'Citation explicite vérifiée : « Faisons l’homme à notre image et à notre ressemblance ».'],
  [48, 'GEN.1.26', 3, 'Genèse 1,26 sert de parallèle précis au pluriel divin de Genèse 11,7.'],
  [49, 'GEN.11.9', 1, 'Citation explicite vérifiée de l’action singulière du Seigneur confondant le langage de la terre.'],
  [49, 'GEN.1.27', 1, 'Citation explicite vérifiée de l’action singulière : « Dieu fit » — le témoin canonique porte « créa ».'],
  [49, 'GEN.11.7', 3, 'Le singulier de Genèse 11,9 est invoqué pour expliquer l’unité divine derrière le pluriel de Genèse 11,7.'],
  [49, 'GEN.1.26', 3, 'Le singulier de Genèse 1,27 est invoqué pour expliquer l’unité divine derrière le pluriel de Genèse 1,26.'],

  [50, 'GEN.11.12', 1, 'Citation vérifiée de la donnée chronologique d’Arphaxad ; le texte suivi conserve la leçon grecque avec Chaïnan.'],
  [50, 'GEN.11.13', 1, 'Citation vérifiée des années vécues après la naissance du descendant ; les témoins divergent sur le total.'],
  [50, 'GEN.6.3', 1, 'Citation explicite vérifiée de la limite de cent vingt ans.'],
  [50, 'GEN.11.12', 3, 'La chronologie postdiluvienne de Genèse 11,12 est confrontée à la limite de Genèse 6,3.'],
  [50, 'GEN.11.13', 3, 'La longévité postdiluvienne de Genèse 11,13 est confrontée à la limite de Genèse 6,3.'],
  [50, 'GEN.6.3', 3, 'Question sur le sens chronologique des cent vingt ans de Genèse 6,3.'],
  [51, 'GEN.11.12', 3, 'La naissance postérieure d’Arphaxad nourrit la difficulté entre Genèse 11,12 et Genèse 6,3.'],
  [51, 'GEN.11.13', 3, 'Les centaines d’années vécues par Arphaxad en Genèse 11,13 nourrissent la difficulté.'],
  [51, 'GEN.6.3', 3, 'La limite de cent vingt ans est confrontée à la longévité d’Arphaxad.'],
  [52, 'GEN.6.3', 3, 'Interprétation des cent vingt ans comme délai avant le déluge, non comme durée des vies futures.'],

  [53, 'GEN.10.21', 1, 'Citation explicite vérifiée de Sem comme père de tous les enfants d’Héber.'],
  [53, 'GEN.10.21', 3, 'Examen de Genèse 10,21 pour déterminer l’origine du nom des Hébreux.'],
  [54, 'GEN.10.21', 3, 'Poursuite de la question étymologique ouverte par Genèse 10,21 : Héber ou Abraham.'],

  [55, 'GEN.11.26', 1, 'Référence intentionnelle vérifiée à Tharé engendrant ses fils à partir de soixante-dix ans.'],
  [55, 'GEN.11.31', 1, 'Référence intentionnelle vérifiée au séjour de Tharé et des siens à Haran.'],
  [55, 'GEN.11.32', 1, 'Référence intentionnelle vérifiée aux deux cent cinq ans et à la mort de Tharé à Haran.'],
  [55, 'GEN.12.1', 1, 'Référence intentionnelle vérifiée à l’ordre donné à Abraham de quitter son pays.'],
  [55, 'GEN.12.4', 1, 'Référence intentionnelle vérifiée au départ d’Abraham de Haran à soixante-quinze ans.'],
  [56, 'GEN.11.26', 3, 'Reconstruction de l’âge de Tharé à partir de Genèse 11,26.'],
  [56, 'GEN.11.32', 3, 'Genèse 11,32 est interprété récapitulativement afin de concilier la mort de Tharé avec le départ d’Abraham.'],
  [56, 'GEN.12.1', 3, 'L’ordre de Genèse 12,1 est replacé du vivant de Tharé.'],
  [56, 'GEN.12.4', 3, 'L’âge d’Abraham en Genèse 12,4 sert au calcul chronologique.'],
  [57, 'GEN.11.32', 1, 'Citation explicite vérifiée des deux cent cinq ans de Tharé et de sa mort à Haran.'],
  [57, 'GEN.11.32', 3, 'Le séjour à Haran est distingué de la durée totale de la vie de Tharé en Genèse 11,32.'],
  [58, 'GEN.11.26', 3, 'Le calcul impossible de l’âge d’Abraham dépend de l’âge de Tharé en Genèse 11,26.'],
  [58, 'GEN.11.32', 3, 'La mort de Tharé à deux cent cinq ans en Genèse 11,32 est confrontée au départ d’Abraham.'],
  [58, 'GEN.12.1', 3, 'L’ordre de quitter Haran en Genèse 12,1 est replacé avant la mort de Tharé.'],
  [58, 'GEN.12.4', 3, 'Les soixante-quinze ans d’Abraham en Genèse 12,4 rendent nécessaire la récapitulation.'],
  [59, 'GEN.11.32', 3, 'La récapitulation résout l’ordre narratif entre la mort de Tharé et le départ d’Abraham.'],
  [59, 'GEN.12.1', 3, 'Genèse 12,1 illustre le procédé scripturaire de récapitulation.'],
  [60, 'GEN.11.26', 3, 'Une solution chronologique alternative réinterprète le point de départ des années d’Abraham.'],
  [60, 'GEN.12.4', 3, 'L’hypothèse traditionnelle vise à préserver les soixante-quinze ans de Genèse 12,4.'],
  [61, 'GEN.11.26', 1, 'Citation explicite vérifiée : Tharé avait soixante-dix ans lorsqu’il engendra Abraham, Nachor et Aran.'],
  [61, 'GEN.11.26', 3, 'Genèse 11,26 est interprété comme le commencement des naissances, non une naissance simultanée des trois fils.'],
  [62, 'GEN.11.26', 3, 'L’ordre des noms en Genèse 11,26 est expliqué par le mérite plutôt que par l’aînesse.'],
  [63, 'MAL.1.2', 1, 'Citation explicite vérifiée : « J’ai aimé Jacob ».'],
  [63, 'MAL.1.3', 1, 'Suite explicite vérifiée : « et détesté Ésaü ».'],
  [63, '1CH.4.1', 1, 'Référence intentionnelle vérifiée à Juda cité en tête de sa généalogie.'],
  [63, 'GEN.11.26', 3, 'Les précédents de Jacob et Juda justifient qu’Abraham soit nommé avant ses aînés en Genèse 11,26.'],

  [66, 'ACT.7.2', 1, 'Référence intentionnelle vérifiée à l’apparition divine en Mésopotamie avant le séjour à Haran.'],
  [66, 'ACT.7.3', 1, 'Référence intentionnelle vérifiée à l’ordre de quitter le pays et la parenté.'],
  [66, 'GEN.12.1', 1, 'Référence éditoriale vérifiée à l’ordre parallèle rapporté en Genèse 12,1.'],
  [66, 'ACT.7.2', 3, 'Le lieu et le moment de l’apparition rapportée en Actes 7,2 sont confrontés au récit de la Genèse.'],
  [66, 'ACT.7.3', 3, 'L’ordre d’Actes 7,3 est comparé précisément à Genèse 12,1.'],
  [66, 'GEN.12.1', 3, 'Genèse 12,1 est confronté au placement chronologique donné par Étienne.'],
  [67, 'ACT.7.4', 1, 'Citation explicite vérifiée du départ de Chaldée, du séjour à Haran et du transfert après la mort du père.'],
  [67, 'ACT.7.4', 3, 'Actes 7,4 crée la difficulté principale pour l’explication par récapitulation.'],
  [68, 'ACT.7.4', 1, 'Reprise explicite vérifiée du séjour à Haran et du transfert après la mort du père.'],
  [68, 'ACT.7.4', 3, 'Analyse de l’accomplissement différé de l’ordre divin dans Actes 7,4.'],
  [69, 'GEN.12.4', 1, 'Référence intentionnelle vérifiée aux soixante-quinze ans d’Abraham lors de sa sortie de Haran.'],
  [69, 'GEN.12.4', 3, 'La donnée d’âge de Genèse 12,4 maintient la difficulté chronologique.'],
  [70, 'ACT.7.4', 1, 'Citation explicite vérifiée du départ du pays des Chaldéens et du séjour à Haran.'],
  [70, 'ACT.7.4', 3, 'Interprétation récapitulative de la première phrase d’Actes 7,4.'],
  [71, 'ACT.7.4', 1, 'Citation explicite vérifiée du transfert depuis Haran après la mort du père.'],
  [71, 'ACT.7.4', 3, 'Le transfert d’Actes 7,4 est distingué du moment de la sortie de Haran.'],
  [72, 'ACT.7.4', 1, 'Citation explicite vérifiée : « De là Dieu le fit passer en cette région ».'],
  [72, 'ACT.7.4', 3, 'Analyse grammaticale d’Actes 7,4 : être transféré ou établi n’équivaut pas nécessairement à sortir alors de Haran.'],
  [73, 'ACT.7.4', 3, 'Conclusion sur le sens du transfert d’Abraham dans la terre de Chanaan en Actes 7,4.'],
  [73, 'ACT.7.5', 3, 'La promesse de possession à la postérité en Actes 7,5 sert à dater l’établissement d’Abraham.'],
  [74, 'ACT.7.5', 3, 'Délimitation de la postérité héritière de la promesse mentionnée en Actes 7,5.'],
  [75, 'ACT.7.4', 3, 'Conclusion récapitulative sur l’établissement d’Abraham dans le pays.'],
  [75, 'ACT.7.5', 3, 'La naissance de la postérité héritière est intégrée à l’explication de la promesse d’Actes 7,5.'],

  [76, 'GEN.12.12', 1, 'Citation explicite vérifiée de la crainte d’Abraham devant la réaction des Égyptiens.'],
  [76, 'GEN.12.13', 1, 'Référence intentionnelle vérifiée à la demande de présenter Sara comme sa sœur.'],
  [76, 'GEN.12.14', 1, 'Citation explicite vérifiée de l’entrée en Égypte et de la beauté remarquée de Sara.'],
  [76, 'GEN.12.12', 3, 'Ouverture de l’examen moral de la crainte exprimée en Genèse 12,12.'],
  [76, 'GEN.12.13', 3, 'Question précise sur la dissimulation prescrite en Genèse 12,13.'],
  [76, 'GEN.12.14', 3, 'L’entrée en Égypte de Genèse 12,14 situe la conduite examinée.'],
  [77, 'GEN.12.13', 3, 'Discussion morale de la demande d’Abraham en Genèse 12,13 : prudence ou défaillance de foi.'],
  [77, 'GEN.12.15', 3, 'Le séjour de Sara dans la maison de Pharaon en Genèse 12,15 est discuté sans supposer sa souillure.'],
  [78, 'GEN.12.17', 1, 'Référence intentionnelle vérifiée aux plaies infligées par Dieu à Pharaon.'],
  [78, 'GEN.12.17', 3, 'Les préparatifs de cour sont invoqués pour placer les plaies de Genèse 12,17 avant toute atteinte à Sara.'],
  [79, 'GEN.12.19', 1, 'Référence intentionnelle vérifiée à la restitution de Sara à Abraham.'],
  [79, 'GEN.12.13', 3, 'La présentation de Sara comme sœur en Genèse 12,13 est interprétée comme prudence sans mensonge.'],
  [79, 'GEN.20.12', 1, 'Référence intentionnelle vérifiée à la précision qu’Abraham et Sara étaient réellement frère et sœur.'],
  [79, 'GEN.20.12', 3, 'Genèse 20,12 fonde l’affirmation qu’Abraham ne mentait pas en appelant Sara sa sœur.'],
  [80, 'GEN.12.13', 3, 'La précaution de Genèse 12,13 est justifiée comme action humaine évitant de tenter Dieu.'],

  [81, 'GEN.13.10', 1, 'Référence intentionnelle vérifiée à la comparaison de la plaine arrosée avec le paradis et l’Égypte.'],
  [81, 'GEN.13.10', 3, 'Genèse 13,10 est interprété comme preuve d’un paradis terrestre véritable.'],
  [82, 'GEN.13.10', 1, 'Citation explicite vérifiée : la contrée était « comme le paradis de Dieu ».'],
  [82, 'GEN.13.10', 3, 'La comparaison de Genèse 13,10 réfute une lecture exclusivement allégorique des arbres du paradis.'],

  [83, 'GEN.13.14', 1, 'Citation explicite vérifiée de l’ordre de regarder vers les quatre points cardinaux.'],
  [83, 'GEN.13.15', 1, 'Suite explicite vérifiée de la promesse du pays à Abraham et à sa postérité.'],
  [83, 'GEN.13.14', 3, 'Question sur la portée géographique du regard demandé en Genèse 13,14.'],
  [83, 'GEN.13.15', 3, 'Question sur l’étendue du pays promis en Genèse 13,15.'],
  [84, 'GEN.13.15', 1, 'Citation explicite vérifiée : « Je te donnerai la terre que tu vois ».'],
  [84, 'GEN.13.15', 3, 'La promesse de Genèse 13,15 est distinguée d’une mesure limitée au seul rayon visuel.'],
  [85, 'GEN.13.15', 3, 'Le territoire visible est interprété comme partie principale d’un don plus étendu.'],
  [86, 'GEN.13.17', 1, 'Citation explicite vérifiée de l’ordre de parcourir le pays dans sa longueur et sa largeur.'],
  [86, 'GEN.13.17', 3, 'Genèse 13,17 confirme que la promesse dépasse ce qui était visible depuis un seul point.'],
  [87, 'GEN.13.17', 3, 'Explication de l’ordre de parcourir le pays donné en Genèse 13,17.'],
  [88, 'GEN.13.15', 3, 'La terre promise en Genèse 13,15 est appliquée d’abord à la postérité charnelle.'],
  [88, 'GEN.13.16', 1, 'Référence intentionnelle vérifiée à une postérité si nombreuse qu’elle ne peut être comptée.'],
  [88, 'GEN.13.16', 3, 'La postérité innombrable de Genèse 13,16 est distinguée de la seule possession terrestre.'],
  [88, 'GEN.22.17', 1, 'Référence intentionnelle vérifiée à la postérité « comme le sable de la mer ».'],

  [89, 'GEN.14.13', 1, 'Citation vérifiée d’Abraham l’Hébreu ; le texte suivi développe le sens « d’au-delà du fleuve ».'],
  [89, 'GEN.14.13', 3, 'Examen étymologique du qualificatif d’Abraham en Genèse 14,13.'],
  [90, 'JOS.24.15', 1, 'Citation explicite vérifiée des dieux servis par les pères au-delà du fleuve.'],
  [90, 'GEN.14.13', 3, 'Josué 24,15 est invoqué pour expliquer le surnom d’Abraham en Genèse 14,13.'],

  [91, 'GEN.15.12', 1, 'Citation explicite vérifiée de la grande épouvante d’Abraham au coucher du soleil.'],
  [91, 'GEN.15.12', 3, 'Question philosophique et morale sur la frayeur du sage à partir de Genèse 15,12.'],
  [92, 'GEN.15.12', 3, 'Le récit du philosophe effrayé sert d’analogie à la peur d’Abraham en Genèse 15,12.'],
  [93, 'GEN.15.12', 3, 'La distinction stoïcienne entre émotion première et trouble dominé explique Genèse 15,12.'],
]

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((ligne) => ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: segments, error: erreurSegments } = await supabase.from('segments')
  .select('id,segment_numero,segment_texte,notes,liens_revus_le,liens_revus_par')
  .eq('id_oeuvre', OEUVRE).gte('segment_numero', 47).lte('segment_numero', 94).order('segment_numero')
if (erreurSegments) throw erreurSegments
if (segments.length !== 48 || segments[0]?.segment_numero !== 47 || segments.at(-1)?.segment_numero !== 94) throw new Error(`Préétat : ${segments.length} segments`)
if (segments.some((segment) => segment.liens_revus_le || segment.liens_revus_par)) throw new Error('Un segment est déjà marqué relu')

const parNumero = new Map(segments.map((segment) => [segment.segment_numero, segment]))
const numerosLies = new Set(LIENS.map(([numero]) => numero))
const nonClasses = segments.filter((segment) => !numerosLies.has(segment.segment_numero) && !SANS_LIEN.has(segment.segment_numero))
if (nonClasses.length) throw new Error(`Segments ni liés ni déclarés sans lien : ${nonClasses.map((segment) => segment.segment_numero).join(', ')}`)
const fauxSansLien = [...SANS_LIEN].filter((numero) => numerosLies.has(numero) || !parNumero.has(numero))
if (fauxSansLien.length) throw new Error(`Déclaration sans lien incohérente : ${fauxSansLien.join(', ')}`)
const cles = LIENS.map(([numero, canon, type]) => `${numero}|${canon}|${type}`)
if (new Set(cles).size !== cles.length) throw new Error('Doublon interne')

const cibles = [...new Set(LIENS.map(([, canon]) => canon))]
const { data: temoins, error: erreurTemoins } = await supabase.from('versets_lecture').select('id_verset').in('id_verset', cibles)
if (erreurTemoins) throw erreurTemoins
const presents = new Set(temoins.map((temoin) => temoin.id_verset))
const absents = cibles.filter((cible) => !presents.has(cible))
if (absents.length) throw new Error(`Cibles absentes : ${absents.join(', ')}`)

// Les cinq appels de notes bibliques du lot (six versets cibles) doivent avoir
// une cible de type 1.
const notesAttendues = [[48, 'GEN.1.26'], [63, 'MAL.1.2'], [63, 'MAL.1.3'], [63, '1CH.4.1'], [66, 'GEN.12.1'], [67, 'ACT.7.4']]
for (const [numero, canon] of notesAttendues) {
  if (!LIENS.some(([n, c, type]) => n === numero && c === canon && type === 1)) throw new Error(`Note biblique oubliée : #${numero} ${canon}`)
}

const ids = segments.map((segment) => segment.id)
const { count: existants, error: erreurExistants } = await supabase.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids)
if (erreurExistants) throw erreurExistants
if (existants) throw new Error(`${existants} lien(s) existe(nt) déjà`)
const types = LIENS.reduce((compte, [, , type]) => ({ ...compte, [type]: (compte[type] ?? 0) + 1 }), {})
console.log(JSON.stringify({ mode: WRITE ? 'écriture' : 'contrôle', segments: 48, liens: LIENS.length, sans_lien: [...SANS_LIEN], cibles_distinctes: cibles.length, types }, null, 2))
if (!WRITE) process.exit(0)

const q = (valeur) => `'${String(valeur).replaceAll("'", "''")}'`
const valeurs = LIENS.map(([numero, canon, type, motif]) => `(${parNumero.get(numero).id},${q(canon)},${type},'vérifié',${q(motif)},'lecture',false)`).join(',\n    ')
const idSql = ids.join(',')
const sql = `do $passe$
declare n integer;
begin
  if exists(select 1 from liens_bibliques where segment_id in (${idSql})) then raise exception 'Liens déjà présents'; end if;
  if exists(select 1 from segments where id in (${idSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Marques déjà présentes'; end if;
  insert into liens_bibliques(segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis) values ${valeurs};
  get diagnostics n=row_count; if n<>${LIENS.length} then raise exception 'Liens %/${LIENS.length}',n; end if;
  update segments set liens_revus_le=now(),liens_revus_par=${q(RELECTEUR)} where id in (${idSql});
  get diagnostics n=row_count; if n<>48 then raise exception 'Segments %/48',n; end if;
end $passe$;`
const { error: erreurEcriture } = await supabase.rpc('exec_sql', { sql })
if (erreurEcriture) throw erreurEcriture
const [{ count: liensApres, error: e1 }, { count: relusApres, error: e2 }] = await Promise.all([
  supabase.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  supabase.from('segments').select('id', { count: 'exact', head: true }).in('id', ids).not('liens_revus_le', 'is', null),
])
if (e1) throw e1
if (e2) throw e2
if (liensApres !== LIENS.length || relusApres !== 48) throw new Error(`Postétat invalide : ${liensApres}/${relusApres}`)
console.log(`✓ ${liensApres} liens vérifiés écrits ; ${relusApres} segments marqués relus`)
