import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre deuxième'
const QUESTIONS = [
  'Question LXI', 'Question LXII', 'Question LXIII', 'Question LXIV', 'Question LXV',
  'Question LXVI', 'Question LXVII', 'Question LXVIII', 'Question LXIX', 'Question LXX',
]
const SORTIE = 'scripts/heptateuque/audit-reprise/liens-exode-q61-q70-lecture.json'
const CIBLES = [
  'EXO.16.33', 'EXO.16.34', 'EXO.16.35',
  'JOS.5.10', 'JOS.5.11', 'JOS.5.12',
  'EXO.12.38', 'EXO.16.3', 'EXO.16.13', 'NUM.11.4', 'NUM.11.5', 'NUM.11.31',
  'EXO.15.27', 'EXO.16.1',
  'EXO.17.5', 'EXO.7.19', 'EXO.7.20', 'EXO.14.16', 'EXO.14.21', 'EXO.4.16',
  'EXO.17.9', 'EXO.7.9', 'EXO.4.17', 'EXO.4.20', 'LUK.1.17', 'ROM.10.3', '1CO.4.7',
  'EXO.18.7', 'EXO.18.10', 'EXO.18.11', 'EXO.18.12', 'EXO.18.15', 'EXO.18.16',
  'EXO.18.18', 'EXO.18.19', 'EXO.18.20', 'EXO.18.21', 'EXO.18.24', 'EXO.18.25',
  'SIR.11.10', 'JOB.1.1', 'GEN.23.7',
  'EXO.19.1', 'EXO.19.2', 'EXO.19.3', 'EXO.19.10', 'EXO.19.11', 'EXO.20.1', 'EXO.31.18',
  'EXO.12.6', 'EXO.12.7', 'EXO.12.8',
  'ACT.2.1', 'ACT.2.2', 'ACT.2.3', 'ACT.2.4', '1PE.1.19', '1CO.5.7',
  'LUK.11.20', 'MAT.12.28',
]

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]),
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const { data: segments, error } = await sb
  .from('segments')
  .select('id,id_oeuvre,segment_numero,ref_niv1,ref_niv1_texte,ref_niv2,ref_niv2_texte,segment_texte,texte_original,notes,paragraphe,rang,page,nature,liens_revus_le,liens_revus_par')
  .eq('id_oeuvre', OEUVRE)
  .eq('ref_niv1', REF_NIV1)
  .in('ref_niv2', QUESTIONS)
  .order('segment_numero')
if (error) throw error

const questionsLive = [...new Set(segments.map((segment) => segment.ref_niv2))]
if (questionsLive.length !== QUESTIONS.length || QUESTIONS.some((question) => !questionsLive.includes(question))) {
  throw new Error(`Questions inattendues : ${questionsLive.join(', ')}`)
}

const ids = segments.map((segment) => segment.id)
const [
  { data: liens, error: liensError },
  { data: memoire, error: memoireError },
  { data: temoins, error: temoinsError },
] = await Promise.all([
  sb.from('liens_bibliques').select('*').in('segment_id', ids),
  sb.from('parametres').select('cle,valeur').eq('cle', 'feedback_liens_protocole').single(),
  sb.from('versets_lecture').select('id_verset,ref,"TR0001","TR0003","TR0004"').in('id_verset', CIBLES),
])
if (liensError || memoireError || temoinsError) throw liensError || memoireError || temoinsError
const temoinsParId = new Map(temoins.map((temoin) => [temoin.id_verset, temoin]))
const ciblesAbsentes = CIBLES.filter((canonId) => !temoinsParId.has(canonId))

const premiere = segments[0]?.segment_numero
const derniere = segments.at(-1)?.segment_numero
const { data: voisins, error: voisinsError } = await sb
  .from('segments')
  .select('id,segment_numero,ref_niv1,ref_niv2,ref_niv2_texte,segment_texte')
  .eq('id_oeuvre', OEUVRE)
  .gte('segment_numero', premiere - 1)
  .lte('segment_numero', derniere + 1)
  .order('segment_numero')
if (voisinsError) throw voisinsError

mkdirSync('scripts/heptateuque/audit-reprise', { recursive: true })
writeFileSync(SORTIE, `${JSON.stringify({
  genere_le: new Date().toISOString(),
  oeuvre: OEUVRE,
  ref_niv1: REF_NIV1,
  lot: 'Exode LXI-LXX',
  bornes: [premiere, derniere],
  cibles_candidates: CIBLES,
  cibles_absentes: ciblesAbsentes,
  temoins: CIBLES.map((canonId) => temoinsParId.get(canonId)).filter(Boolean),
  liens_existants: liens,
  voisins,
  segments,
  feedback_liens_protocole: memoire.valeur,
}, null, 2)}\n`, 'utf8')

console.log(JSON.stringify({
  sortie: SORTIE,
  segments: segments.length,
  bornes: [premiere, derniere],
  questions: questionsLive,
  liens_existants: liens.length,
  deja_relus: segments.filter((segment) => segment.liens_revus_le || segment.liens_revus_par).length,
  temoins: temoins.length,
  cibles_absentes: ciblesAbsentes,
  voisins: voisins.map(({ segment_numero, ref_niv1, ref_niv2 }) => ({ segment_numero, ref_niv1, ref_niv2 })),
}, null, 2))
