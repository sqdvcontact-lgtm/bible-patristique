import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre deuxième'
const QUESTIONS = [
  'Question CXI', 'Question CXII', 'Question CXIII', 'Question CXIV', 'Question CXV',
  'Question CXVI', 'Question CXVII', 'Question CXVIII', 'Question CXIX', 'Question CXX',
]
const SORTIE = 'scripts/heptateuque/audit-reprise/liens-exode-q111-q120-lecture.json'
const CIBLES = [
  'EXO.20.26', 'EXO.26.25', 'EXO.26.33', 'EXO.26.35', 'EXO.27.1', 'EXO.27.2',
  'EXO.27.4', 'EXO.27.5', 'EXO.27.8',
  'EXO.28.3', 'EXO.28.4', 'EXO.28.9', 'EXO.28.10', 'EXO.28.15', 'EXO.28.16',
  'EXO.28.22', 'EXO.28.30', 'EXO.28.31', 'EXO.28.32', 'EXO.28.35',
  'EXO.28.36', 'EXO.28.38', 'HEB.5.14', 'HEB.9.1', 'HEB.9.2',
  'HEB.9.3', 'HEB.9.4', 'HEB.9.5', 'HEB.9.6', 'HEB.9.7',
  'HEB.9.8', 'HEB.9.9', 'HEB.9.10', 'HEB.9.11', 'HEB.9.12',
  'HEB.7.27', 'PSA.11.7', 'PSA.12.7', 'TIT.2.7', '2TI.2.2',
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
const [{ data: liens, error: liensError }, { data: memoire, error: memoireError }] = await Promise.all([
  sb.from('liens_bibliques').select('*').in('segment_id', ids),
  sb.from('parametres').select('cle,valeur').eq('cle', 'feedback_liens_protocole').single(),
])
if (liensError || memoireError) throw liensError || memoireError

const { data: temoins, error: temoinsError } = await sb
  .from('versets_lecture')
  .select('id_verset,"TR0001","TR0003","TR0004"')
  .in('id_verset', CIBLES)
  .order('id_verset')
if (temoinsError) throw temoinsError

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
  lot: 'Exode CXI-CXX',
  bornes: [premiere, derniere],
  liens_existants: liens,
  voisins,
  segments,
  temoins,
  feedback_liens_protocole: memoire.valeur,
}, null, 2)}\n`, 'utf8')

console.log(JSON.stringify({
  sortie: SORTIE,
  segments: segments.length,
  bornes: [premiere, derniere],
  questions: questionsLive,
  liens_existants: liens.length,
  deja_relus: segments.filter((segment) => segment.liens_revus_le || segment.liens_revus_par).length,
  voisins: voisins.map(({ segment_numero, ref_niv1, ref_niv2 }) => ({ segment_numero, ref_niv1, ref_niv2 })),
}, null, 2))
