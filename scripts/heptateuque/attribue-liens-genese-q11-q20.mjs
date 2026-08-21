import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const WRITE = process.argv.includes('--write')
const RELECTEUR = 'Codex (IA) — lecture intégrale Heptateuque, Genèse Q. XI-XX'

// [segment_numero, canon_id, type, motif] — manifeste issu de la lecture
// segment par segment et de la confrontation aux trois témoins bibliques.
const LIENS = [
  [32, 'GEN.7.24', 1, 'Citation explicite vérifiée des cent cinquante jours pendant lesquels les eaux couvrirent la terre.'],
  [32, 'GEN.7.24', 3, 'Discussion textuelle du sens de la durée des cent cinquante jours en Genèse 7,24.'],

  [33, 'GEN.8.1', 1, 'Référence intentionnelle vérifiée au vent envoyé sur la terre et à la diminution des eaux.'],
  [33, 'GEN.8.2', 1, 'Référence intentionnelle vérifiée à la fermeture des sources, des cataractes et à l’arrêt de la pluie.'],
  [33, 'GEN.8.3', 1, 'Référence intentionnelle vérifiée à la diminution des eaux au terme des cent cinquante jours.'],
  [34, 'GEN.8.1', 3, 'Analyse chronologique du vent et de la diminution des eaux mentionnés en Genèse 8,1.'],
  [34, 'GEN.8.2', 3, 'Analyse chronologique de la fermeture des sources et de l’arrêt de la pluie en Genèse 8,2.'],
  [34, 'GEN.8.3', 3, 'Analyse du rapport entre la diminution des eaux et les cent cinquante jours de Genèse 8,3.'],
  [34, 'GEN.7.12', 3, 'Le terme des quarante jours de pluie est confronté à la chronologie de la fin du déluge.'],
  [34, 'GEN.7.24', 3, 'Les cent cinquante jours de Genèse 7,24 sont distingués des quarante jours de pluie.'],

  [35, 'GEN.8.7', 1, 'Référence intentionnelle vérifiée au corbeau lâché hors de l’arche et ne revenant pas.'],
  [35, 'GEN.8.8', 1, 'Référence intentionnelle vérifiée à l’envoi ultérieur de la colombe.'],
  [35, 'GEN.8.9', 1, 'Référence intentionnelle vérifiée au retour de la colombe qui ne trouve pas où poser le pied.'],
  [35, 'GEN.8.7', 3, 'Question exégétique précise sur le sort et la subsistance du corbeau de Genèse 8,7.'],
  [35, 'GEN.8.9', 3, 'Le retour de la colombe en Genèse 8,9 sert de terme de comparaison avec le corbeau.'],
  [36, 'GEN.8.7', 3, 'Hypothèse explicative : le corbeau de Genèse 8,7 aurait pu se nourrir sur un cadavre.'],
  [36, 'GEN.8.9', 3, 'La répugnance de la colombe explique son retour rapporté en Genèse 8,9.'],

  [37, 'GEN.8.9', 3, 'Question précise sur l’impossibilité pour la colombe de poser le pied en Genèse 8,9.'],
  [37, 'GEN.8.5', 3, 'La difficulté est confrontée à l’apparition antérieure des sommets des montagnes en Genèse 8,5.'],
  [38, 'GEN.8.9', 3, 'Résolution de la difficulté du retour de la colombe en Genèse 8,9.'],
  [38, 'GEN.8.5', 3, 'Les sommets visibles en Genèse 8,5 sont interprétés comme encore humides.'],

  [39, 'GEN.8.21', 1, 'Citation explicite vérifiée de la promesse de ne plus maudire la terre ni frapper toute chair.'],
  [39, 'GEN.8.21', 3, 'Ouverture d’une interprétation de la promesse divine de Genèse 8,21.'],
  [40, 'GEN.8.21', 3, 'Interprétation typologique des bienfaits annoncés en Genèse 8,21 comme figure de la grâce nouvelle.'],

  [41, 'GEN.9.5', 1, 'Citation explicite vérifiée de la vengeance du sang humain demandée à l’homme et à son frère.'],
  [41, 'GEN.9.5', 3, 'Interprétation de « son frère » en Genèse 9,5 par l’unité d’origine de tous les hommes.'],
  [42, 'GEN.9.25', 3, 'Exégèse de la malédiction de Chanaan en Genèse 9,25 et de sa portée historique.'],

  [43, 'GEN.10.8', 1, 'Citation explicite vérifiée de Nemrod comme premier homme puissant — ou géant selon le témoin suivi — sur la terre.'],
  [43, 'GEN.10.8', 3, 'Interprétation du caractère premier de Nemrod en Genèse 10,8 après le renouvellement du genre humain.'],
  [43, 'GEN.6.4', 1, 'Référence intentionnelle vérifiée à la mention antérieure des géants en Genèse 6,4.'],
  [44, 'GEN.10.25', 1, 'Citation explicite vérifiée de la naissance de Phaleg et de la division de la terre en son temps.'],
  [44, 'GEN.10.25', 3, 'Interprétation de la division de la terre en Genèse 10,25 par la confusion des langues et des peuples.'],

  [45, 'GEN.11.1', 1, 'Citation explicite vérifiée : toute la terre avait une seule langue.'],
  [45, 'GEN.11.1', 3, 'Question sur l’unité de langue de Genèse 11,1 face au chapitre précédent.'],
  [45, 'GEN.10.5', 1, 'Référence intentionnelle vérifiée aux descendants répartis selon leurs pays, langues, familles et nations.'],
  [45, 'GEN.10.20', 1, 'Référence intentionnelle vérifiée aux fils de Cham répartis selon familles, langues, pays et nations.'],
  [45, 'GEN.10.31', 1, 'Référence intentionnelle vérifiée aux fils de Sem répartis selon familles, langues, pays et nations.'],
  [46, 'GEN.11.1', 3, 'Genèse 11,1 est expliqué comme une récapitulation d’événements antérieurs.'],
  [46, 'GEN.10.5', 3, 'La répartition linguistique de Genèse 10,5 est replacée après l’événement récapitulé en Genèse 11,1.'],
  [46, 'GEN.10.20', 3, 'La répartition linguistique de Genèse 10,20 est replacée après l’événement récapitulé en Genèse 11,1.'],
  [46, 'GEN.10.31', 3, 'La répartition linguistique de Genèse 10,31 est replacée après l’événement récapitulé en Genèse 11,1.'],
]

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((ligne) => ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const { data: segments, error: erreurSegments } = await supabase.from('segments')
  .select('id,segment_numero,liens_revus_le,liens_revus_par')
  .eq('id_oeuvre', OEUVRE).gte('segment_numero', 32).lte('segment_numero', 46).order('segment_numero')
if (erreurSegments) throw erreurSegments
if (segments.length !== 15 || segments[0]?.segment_numero !== 32 || segments.at(-1)?.segment_numero !== 46) {
  throw new Error(`Préétat inattendu : ${segments.length} segments`)
}
if (segments.some((segment) => segment.liens_revus_le || segment.liens_revus_par)) throw new Error('Un segment est déjà marqué relu')

const parNumero = new Map(segments.map((segment) => [segment.segment_numero, segment]))
if (LIENS.some(([numero]) => !parNumero.has(numero))) throw new Error('Numéro de segment absent')
const cles = LIENS.map(([numero, canon, type]) => `${numero}|${canon}|${type}`)
if (new Set(cles).size !== cles.length) throw new Error('Doublon interne dans le manifeste')
const cibles = [...new Set(LIENS.map(([, canon]) => canon))]
const { data: temoins, error: erreurTemoins } = await supabase.from('versets_lecture').select('id_verset').in('id_verset', cibles)
if (erreurTemoins) throw erreurTemoins
const presents = new Set(temoins.map((temoin) => temoin.id_verset))
const absents = cibles.filter((cible) => !presents.has(cible))
if (absents.length) throw new Error(`Cibles absentes : ${absents.join(', ')}`)
const ids = segments.map((segment) => segment.id)
const { count: existants, error: erreurExistants } = await supabase.from('liens_bibliques')
  .select('id', { count: 'exact', head: true }).in('segment_id', ids)
if (erreurExistants) throw erreurExistants
if (existants) throw new Error(`${existants} lien(s) existe(nt) déjà`)

const types = LIENS.reduce((compte, [, , type]) => ({ ...compte, [type]: (compte[type] ?? 0) + 1 }), {})
console.log(JSON.stringify({ mode: WRITE ? 'écriture' : 'contrôle', segments: 15, liens: LIENS.length, cibles_distinctes: cibles.length, types }, null, 2))
if (!WRITE) process.exit(0)

const q = (valeur) => `'${String(valeur).replaceAll("'", "''")}'`
const valeurs = LIENS.map(([numero, canon, type, motif]) =>
  `(${parNumero.get(numero).id},${q(canon)},${type},'vérifié',${q(motif)},'lecture',false)`).join(',\n    ')
const idSql = ids.join(',')
const sql = `do $passe$
declare n integer;
begin
  if exists(select 1 from liens_bibliques where segment_id in (${idSql})) then raise exception 'Liens déjà présents'; end if;
  if exists(select 1 from segments where id in (${idSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Marques déjà présentes'; end if;
  insert into liens_bibliques(segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis)
  values ${valeurs};
  get diagnostics n=row_count; if n<>${LIENS.length} then raise exception 'Liens %/${LIENS.length}',n; end if;
  update segments set liens_revus_le=now(),liens_revus_par=${q(RELECTEUR)} where id in (${idSql});
  get diagnostics n=row_count; if n<>15 then raise exception 'Segments %/15',n; end if;
end $passe$;`
const { error: erreurEcriture } = await supabase.rpc('exec_sql', { sql })
if (erreurEcriture) throw erreurEcriture
const [{ count: liensApres, error: e1 }, { count: relusApres, error: e2 }] = await Promise.all([
  supabase.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  supabase.from('segments').select('id', { count: 'exact', head: true }).in('id', ids).not('liens_revus_le', 'is', null),
])
if (e1) throw e1
if (e2) throw e2
if (liensApres !== LIENS.length || relusApres !== 15) throw new Error(`Postétat invalide : ${liensApres}/${relusApres}`)
console.log(`✓ ${liensApres} liens vérifiés écrits ; ${relusApres} segments marqués relus`)
