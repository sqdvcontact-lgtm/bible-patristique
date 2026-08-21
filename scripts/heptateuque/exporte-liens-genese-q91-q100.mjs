import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const SORTIE = 'scripts/heptateuque/audit-reprise/liens-genese-q91-q100-lecture.json'
const QUESTIONS = [
  'Question XCI', 'Question XCII', 'Question XCIII', 'Question XCIV', 'Question XCV',
  'Question XCVI', 'Question XCVII', 'Question XCVIII', 'Question XCIX', 'Question C',
]
const CIBLES = [
  'GEN.30.13', 'GEN.30.14', 'GEN.30.30',
  'GEN.30.37', 'GEN.30.38', 'GEN.30.39', 'GEN.30.40', 'GEN.30.41', 'GEN.30.42',
  'GEN.31.7', 'GEN.31.9', 'GEN.31.24', 'GEN.31.30', 'GEN.31.41', 'GEN.31.42',
  'GEN.31.45', 'GEN.31.47', 'GEN.31.48', 'GEN.31.49', 'GEN.31.50', 'GEN.31.53',
]

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((ligne) => ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const { data: segments, error: erreurSegments } = await supabase.from('segments')
  .select('id,id_oeuvre,segment_numero,ref_niv1,ref_niv2,ref_niv2_texte,segment_texte,texte_original,notes,liens_revus_le,liens_revus_par')
  .eq('id_oeuvre', OEUVRE).eq('ref_niv1', 'Livre premier').in('ref_niv2', QUESTIONS).order('segment_numero')
if (erreurSegments) throw erreurSegments
if (segments.length !== 28 || segments[0]?.segment_numero !== 276 || segments.at(-1)?.segment_numero !== 303) {
  throw new Error(`Lot inattendu : ${segments.length}, ${segments[0]?.segment_numero}-${segments.at(-1)?.segment_numero}`)
}
const questionsTrouvees = [...new Set(segments.map((segment) => segment.ref_niv2))]
if (questionsTrouvees.length !== QUESTIONS.length || QUESTIONS.some((question) => !questionsTrouvees.includes(question))) {
  throw new Error(`Questions inattendues : ${questionsTrouvees.join(', ')}`)
}
const ids = segments.map((segment) => segment.id)
const { data: liensExistants, error: erreurLiens } = await supabase.from('liens_bibliques').select('*').in('segment_id', ids).order('id')
if (erreurLiens) throw erreurLiens
const { data: temoins, error: erreurTemoins } = await supabase.from('versets_lecture')
  .select('id_verset,ref,"num_TR0001","TR0001","num_TR0003","TR0003","num_TR0004","TR0004"').in('id_verset', CIBLES)
if (erreurTemoins) throw erreurTemoins
const trouves = new Set(temoins.map((temoin) => temoin.id_verset))
const absents = CIBLES.filter((cible) => !trouves.has(cible))
if (absents.length) throw new Error(`Cibles absentes : ${absents.join(', ')}`)

mkdirSync('scripts/heptateuque/audit-reprise', { recursive: true })
writeFileSync(SORTIE, `${JSON.stringify({
  genere_le: new Date().toISOString(), oeuvre: OEUVRE, lot: 'Genèse - Questions XCI à C',
  avertissement: 'Dossier de lecture : toute cible doit être vérifiée dans les trois témoins.',
  cibles_candidates: CIBLES,
  temoins: temoins.sort((a, b) => CIBLES.indexOf(a.id_verset) - CIBLES.indexOf(b.id_verset)),
  liens_existants: liensExistants, segments,
}, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({
  sortie: SORTIE, segments: segments.length, bornes: [276, 303], questions: questionsTrouvees,
  liens_existants: liensExistants.length, temoins: temoins.length,
  deja_relus: segments.filter((segment) => segment.liens_revus_le).length,
}, null, 2))
