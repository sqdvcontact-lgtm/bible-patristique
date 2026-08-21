import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const SORTIE = 'scripts/heptateuque/audit-reprise/liens-genese-q61-q70-lecture.json'
const QUESTIONS = [
  'Question LXI', 'Question LXII', 'Question LXIII', 'Question LXIV', 'Question LXV',
  'Question LXVI', 'Question LXVII', 'Question LXVIII', 'Question LXIX', 'Question LXX',
]
const CIBLES = [
  'GEN.23.7', 'DEU.6.13', 'DEU.10.20', 'REV.19.10', 'REV.22.9',
  'GEN.24.1', 'GEN.24.2', 'GEN.24.3', 'GEN.24.4', 'GEN.24.7', 'GEN.24.8',
  'GEN.24.12', 'GEN.24.13', 'GEN.24.14', 'DEU.6.16', 'MAT.4.5', 'MAT.4.6', 'MAT.4.7',
  'JDG.6.17', 'JDG.6.36', 'JDG.6.37', 'JDG.6.38', 'JDG.6.39', 'JDG.6.40',
  'ISA.7.11', 'ISA.7.12',
  'GEN.24.37', 'GEN.24.38', 'GEN.24.41', 'GEN.24.42', 'GEN.24.43', 'GEN.24.44', 'GEN.24.45', 'GEN.24.46',
  'GEN.24.49', 'GEN.24.51', 'GEN.24.60', 'GEN.24.63',
  'GEN.22.17', 'GEN.25.1', 'GEN.25.2', 'GEN.25.3', 'GEN.25.4', 'GEN.25.5', 'GEN.25.6', 'GEN.25.8',
  'GEN.18.11', 'ROM.4.19', 'GAL.4.22', 'GAL.4.23', 'GAL.4.24', 'GAL.4.28', 'ROM.9.8',
]

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((ligne) => ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const { data: segments, error: erreurSegments } = await supabase.from('segments')
  .select('id,id_oeuvre,segment_numero,ref_niv1,ref_niv2,ref_niv2_texte,segment_texte,texte_original,notes,liens_revus_le,liens_revus_par')
  .eq('id_oeuvre', OEUVRE).eq('ref_niv1', 'Livre premier').in('ref_niv2', QUESTIONS).order('segment_numero')
if (erreurSegments) throw erreurSegments
if (!segments.length) throw new Error('Aucun segment trouvé')
const questionsTrouvees = [...new Set(segments.map((segment) => segment.ref_niv2))]
if (questionsTrouvees.length !== QUESTIONS.length || QUESTIONS.some((question) => !questionsTrouvees.includes(question))) {
  throw new Error(`Questions inattendues : ${questionsTrouvees.join(', ')}`)
}

const ids = segments.map((segment) => segment.id)
const { data: liensExistants, error: erreurLiens } = await supabase.from('liens_bibliques')
  .select('*').in('segment_id', ids).order('id')
if (erreurLiens) throw erreurLiens

const { data: temoins, error: erreurTemoins } = await supabase.from('versets_lecture')
  .select('id_verset,ref,"num_TR0001","TR0001","num_TR0003","TR0003","num_TR0004","TR0004"')
  .in('id_verset', CIBLES)
if (erreurTemoins) throw erreurTemoins
const trouves = new Set(temoins.map((temoin) => temoin.id_verset))
const absents = CIBLES.filter((cible) => !trouves.has(cible))
if (absents.length) throw new Error(`Cibles absentes : ${absents.join(', ')}`)

mkdirSync('scripts/heptateuque/audit-reprise', { recursive: true })
writeFileSync(SORTIE, `${JSON.stringify({
  genere_le: new Date().toISOString(), oeuvre: OEUVRE,
  lot: 'Genèse - Questions LXI à LXX',
  avertissement: 'Dossier de lecture. Toute cible doit être vérifiée dans versets_lecture avant attribution.',
  cibles_candidates: CIBLES,
  temoins: temoins.sort((a, b) => CIBLES.indexOf(a.id_verset) - CIBLES.indexOf(b.id_verset)),
  liens_existants: liensExistants,
  segments,
}, null, 2)}\n`, 'utf8')

console.log(JSON.stringify({
  sortie: SORTIE,
  segments: segments.length,
  bornes: [segments[0].segment_numero, segments.at(-1).segment_numero],
  questions: questionsTrouvees,
  liens_existants: liensExistants.length,
  temoins: temoins.length,
  deja_relus: segments.filter((segment) => segment.liens_revus_le).length,
}, null, 2))
