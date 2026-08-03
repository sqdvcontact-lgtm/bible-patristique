import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const WRITE = process.argv.includes('--write')
const RELECTEUR = 'Codex (IA) — lecture intégrale Heptateuque, Genèse Q. XXXI-XL'
const SANS_LIEN = new Set()

// [segment_numero, canon_id, type, motif]
const LIENS = [
  [95, 'GEN.17.8', 1, 'Citation explicite vérifiée de la terre de Chanaan donnée en possession perpétuelle.'],
  [95, 'GEN.17.8', 3, 'Question précise sur le sens temporel ou éternel de la possession promise en Genèse 17,8.'],
  [96, 'GEN.17.8', 3, 'Examen lexical et spirituel du terme « éternel » employé en Genèse 17,8.'],
  [97, 'GEN.17.8', 3, 'Hypothèse d’un idiotisme scripturaire pour expliquer « possession éternelle » en Genèse 17,8.'],
  [98, 'GEN.17.8', 3, 'L’usage profane d’« éternellement » sert à préciser le sens linguistique de Genèse 17,8.'],
  [99, 'GEN.17.8', 3, 'Conclusion méthodologique sur l’interprétation de l’idiotisme « éternel » en Genèse 17,8.'],

  [100, 'GEN.17.16', 1, 'Citation explicite vérifiée de la promesse que des rois de peuples sortiront du fils de Sara.'],
  [100, 'GEN.17.16', 3, 'Interprétation ecclésiale ou littérale des rois promis en Genèse 17,16.'],

  [101, 'GEN.18.2', 1, 'Citation explicite vérifiée de l’apparition des trois hommes et de la prosternation d’Abraham.'],
  [101, 'GEN.18.3', 1, 'Citation explicite vérifiée de l’adresse au singulier : « Seigneur ».'],
  [101, 'GEN.18.2', 3, 'La pluralité des trois hommes de Genèse 18,2 est confrontée à l’adresse singulière.'],
  [101, 'GEN.18.3', 3, 'Question précise sur le singulier « Seigneur » de Genèse 18,3.'],
  [102, 'GEN.18.2', 3, 'Interprétation des trois hommes comme manifestation du Seigneur dans ses anges.'],
  [102, 'GEN.18.3', 3, 'L’adresse de Genèse 18,3 est interprétée comme adressée à Dieu présent dans les anges.'],
  [102, 'GEN.18.22', 1, 'Référence intentionnelle vérifiée aux deux hommes partant vers Sodome tandis qu’Abraham demeure devant le Seigneur.'],
  [102, 'GEN.19.1', 1, 'Référence intentionnelle vérifiée aux deux anges arrivant à Sodome auprès de Lot.'],
  [102, 'GEN.19.2', 1, 'Référence intentionnelle vérifiée à l’adresse de Lot aux anges comme à des seigneurs.'],

  [103, 'GEN.18.4', 1, 'Citation explicite vérifiée de l’eau offerte pour laver les pieds et du repos sous l’arbre.'],
  [103, 'GEN.18.5', 1, 'Citation explicite vérifiée du pain offert aux visiteurs.'],
  [103, 'GEN.18.4', 3, 'Question sur l’hospitalité corporelle offerte aux anges en Genèse 18,4.'],
  [103, 'GEN.18.5', 3, 'Le repas proposé en Genèse 18,5 est confronté à la nature immortelle des anges.'],

  [104, 'GEN.18.11', 1, 'Citation explicite vérifiée de la vieillesse d’Abraham et Sara et de la cessation des règles de Sara.'],
  [104, 'GEN.18.11', 3, 'Ouverture de l’explication physiologique du miracle annoncé en Genèse 18,11.'],
  [105, 'GEN.17.17', 1, 'Référence éditoriale vérifiée à l’étonnement et au rire d’Abraham devant la promesse d’un fils.'],
  [105, 'ROM.4.19', 1, 'Citation explicite vérifiée du corps d’Abraham déjà comme mort.'],
  [105, 'GEN.18.11', 3, 'La vieillesse des deux époux en Genèse 18,11 fonde le caractère miraculeux de la naissance.'],
  [105, 'GEN.17.17', 3, 'L’étonnement d’Abraham en Genèse 17,17 est expliqué par l’âge des deux époux.'],
  [105, 'ROM.4.19', 3, 'Romains 4,19 est interprété à la lumière de l’impossibilité conjointe des deux époux âgés.'],
  [106, 'ROM.4.19', 3, 'Le corps « mort » de Romains 4,19 est compris relativement à une épouse âgée, non comme impuissance absolue.'],
  [106, 'GEN.18.11', 3, 'La condition de Sara décrite en Genèse 18,11 précise le sens du miracle.'],
  [106, 'GEN.25.1', 1, 'Référence intentionnelle vérifiée au mariage ultérieur d’Abraham avec Cétura.'],
  [106, 'GEN.25.2', 1, 'Référence intentionnelle vérifiée aux enfants qu’Abraham eut de Cétura.'],
  [107, 'ROM.4.19', 3, 'Explication physiologique du sens relatif du corps « comme mort » en Romains 4,19.'],
  [108, 'GEN.18.11', 3, 'Explication physiologique de l’infécondité de Sara avancée en âge en Genèse 18,11.'],
  [109, 'GEN.18.11', 3, 'Le miracle associe les deux impossibilités corporelles décrites en Genèse 18,11.'],
  [109, 'ROM.4.19', 3, 'Le corps d’Abraham et le sein de Sara de Romains 4,19 sont interprétés conjointement.'],
  [110, 'ROM.4.19', 1, 'Citation explicite vérifiée : le corps d’Abraham était déjà « mort ».'],
  [110, 'ROM.4.19', 3, 'Refus d’une interprétation littérale absurde du mot « mort » en Romains 4,19.'],
  [111, 'ROM.4.19', 3, 'Conclusion de l’interprétation du corps d’Abraham comme mort en Romains 4,19.'],
  [111, 'GEN.18.11', 3, 'La naissance miraculeuse est rapportée à l’âge conjoint des époux décrit en Genèse 18,11.'],
  [111, 'GEN.25.1', 1, 'Référence intentionnelle vérifiée à l’union ultérieure d’Abraham avec Cétura.'],
  [111, 'GEN.25.2', 1, 'Référence intentionnelle vérifiée aux enfants ultérieurs d’Abraham et Cétura.'],

  [112, 'GEN.18.13', 1, 'Citation explicite vérifiée du reproche adressé à Sara pour son rire.'],
  [112, 'GEN.18.13', 3, 'Question précise sur le reproche du rire de Sara en Genèse 18,13.'],
  [112, 'GEN.17.17', 1, 'Référence intentionnelle vérifiée au rire antérieur d’Abraham.'],
  [112, 'GEN.17.17', 3, 'Le rire d’Abraham en Genèse 17,17 est comparé au rire de Sara.'],
  [113, 'GEN.18.13', 3, 'Le rire de Sara est interprété comme doute justifiant le reproche de Genèse 18,13.'],
  [113, 'GEN.17.17', 3, 'Le rire d’Abraham est interprété comme admiration et joie, contrairement à celui de Sara.'],

  [114, 'GEN.18.15', 1, 'Citation explicite vérifiée de la dénégation de Sara saisie de peur.'],
  [114, 'GEN.18.15', 3, 'Question sur la reconnaissance de l’interlocuteur divin malgré la dénégation de Sara.'],
  [115, 'GEN.18.15', 3, 'La dénégation de Sara est expliquée par sa méprise possible sur l’identité des visiteurs.'],
  [115, 'GEN.18.3', 3, 'L’adresse d’Abraham au Seigneur est opposée à la perception plus humaine de Sara.'],
  [116, 'GEN.18.4', 1, 'Référence intentionnelle vérifiée aux devoirs corporels d’hospitalité offerts aux visiteurs.'],
  [116, 'GEN.18.5', 1, 'Référence intentionnelle vérifiée au repas proposé aux visiteurs.'],
  [116, 'GEN.18.3', 3, 'La reconnaissance divine exprimée en Genèse 18,3 est conciliée avec une première perception humaine des visiteurs.'],
  [116, 'GEN.18.15', 3, 'La reconnaissance progressive des anges est proposée pour expliquer la scène de Genèse 18,15.'],
  [117, 'GEN.18.2', 3, 'Question finale sur les signes qui permirent d’identifier comme anges les trois hommes apparus en Genèse 18,2.'],

  [118, 'GEN.18.19', 1, 'Citation explicite vérifiée de l’instruction des enfants d’Abraham et de l’accomplissement des promesses.'],
  [119, 'GEN.18.19', 3, 'Interprétation de l’obéissance promise en Genèse 18,19 comme grâce attirant l’accomplissement des promesses.'],

  [120, 'GEN.18.21', 1, 'Citation explicite vérifiée : Dieu descendra, verra et saura si l’iniquité est consommée.'],
  [120, 'GEN.18.21', 3, 'Genèse 18,21 est interprété comme langage de colère et de menace, non comme ignorance divine.'],
  [121, 'GEN.18.21', 3, 'Explication anthropomorphique des verbes « voir » et « savoir » de Genèse 18,21.'],
  [122, 'GEN.18.21', 3, 'Conclusion : le langage humain de Genèse 18,21 s’adapte à la faiblesse humaine sans attribuer de trouble à Dieu.'],

  [123, 'GEN.18.32', 1, 'Référence intentionnelle vérifiée à la promesse de ne pas détruire Sodome si dix justes s’y trouvent.'],
  [123, 'GEN.18.32', 3, 'Question sur la portée particulière ou universelle de la promesse de Genèse 18,32.'],
  [124, 'GEN.18.32', 3, 'Genèse 18,32 est interprété comme révélation particulière de l’absence de dix justes à Sodome.'],
  [125, 'GEN.18.32', 1, 'Citation explicite vérifiée : « Si j’en trouve dix, je pardonnerai à toute la ville ».'],
  [125, 'GEN.18.32', 3, 'La promesse de Genèse 18,32 vise à manifester l’extrême corruption de Sodome.'],
  [126, 'GEN.18.32', 3, 'Dieu pouvait sauver les justes sans épargner les impies ; le chiffre de Genèse 18,32 n’est donc pas une contrainte.'],
  [127, 'GEN.18.32', 3, 'Conclusion : la condition de Genèse 18,32 souligne l’impossibilité de trouver dix justes.'],
  [128, 'JER.5.1', 1, 'Citation explicite vérifiée de la recherche d’un seul juste à Jérusalem comme condition du pardon.'],
  [128, 'JER.5.1', 3, 'Jérémie 5,1 est interprété comme manière de manifester qu’aucun juste ne pouvait être trouvé.'],
  [128, 'GEN.18.32', 3, 'Jérémie 5,1 sert de parallèle interprétatif à la condition des dix justes en Genèse 18,32.'],
]

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((ligne) => ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: segments, error: erreurSegments } = await supabase.from('segments')
  .select('id,segment_numero,segment_texte,notes,liens_revus_le,liens_revus_par')
  .eq('id_oeuvre', OEUVRE).gte('segment_numero', 95).lte('segment_numero', 128).order('segment_numero')
if (erreurSegments) throw erreurSegments
if (segments.length !== 34 || segments[0]?.segment_numero !== 95 || segments.at(-1)?.segment_numero !== 128) throw new Error(`Préétat : ${segments.length} segments`)
if (segments.some((segment) => segment.liens_revus_le || segment.liens_revus_par)) throw new Error('Un segment est déjà marqué relu')
const parNumero = new Map(segments.map((segment) => [segment.segment_numero, segment]))
const numerosLies = new Set(LIENS.map(([numero]) => numero))
const nonClasses = segments.filter((segment) => !numerosLies.has(segment.segment_numero) && !SANS_LIEN.has(segment.segment_numero))
if (nonClasses.length) throw new Error(`Segments non classés : ${nonClasses.map((segment) => segment.segment_numero).join(', ')}`)
if ([...SANS_LIEN].some((numero) => numerosLies.has(numero) || !parNumero.has(numero))) throw new Error('Déclaration sans lien incohérente')
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
console.log(JSON.stringify({ mode: WRITE ? 'écriture' : 'contrôle', segments: 34, liens: LIENS.length, sans_lien: [...SANS_LIEN], cibles_distinctes: cibles.length, types }, null, 2))
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
  get diagnostics n=row_count; if n<>34 then raise exception 'Segments %/34',n; end if;
end $passe$;`
const { error: erreurEcriture } = await supabase.rpc('exec_sql', { sql })
if (erreurEcriture) throw erreurEcriture
const [{ count: liensApres, error: e1 }, { count: relusApres, error: e2 }] = await Promise.all([
  supabase.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  supabase.from('segments').select('id', { count: 'exact', head: true }).in('id', ids).not('liens_revus_le', 'is', null),
])
if (e1) throw e1
if (e2) throw e2
if (liensApres !== LIENS.length || relusApres !== 34) throw new Error(`Postétat invalide : ${liensApres}/${relusApres}`)
console.log(`✓ ${liensApres} liens vérifiés écrits ; ${relusApres} segments marqués relus`)
