import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre deuxième'
const QUESTIONS = [
  'Question XI', 'Question XII', 'Question XII [<i>sic</i>]', 'Question XIV', 'Question XV',
  'Question XVI', 'Question XVII', 'Question XVIII', 'Question XIX', 'Question XX',
]
const SORTIE = 'scripts/heptateuque/audit-reprise/liens-exode-q11-q20-lecture.json'
const CIBLES = [
  'EXO.4.14', 'EXO.4.15', 'EXO.4.16', 'EXO.4.20', 'EXO.4.24', 'EXO.4.25', 'EXO.4.26',
  'GEN.17.14',
  'PSA.85.1', 'PSA.85.2', 'PSA.86.1', 'PSA.86.2', 'PSA.87.1', 'PSA.87.2',
  'PSA.146.2', 'PSA.147.2',
  'EXO.18.1', 'EXO.18.2', 'EXO.18.5',
  'EXO.3.17', 'EXO.3.18', 'EXO.3.19', 'EXO.5.1', 'EXO.5.2', 'EXO.5.3',
  'EXO.5.22', 'EXO.5.23', 'EXO.6.1',
  'EXO.6.14', 'EXO.6.15', 'EXO.6.16', 'EXO.6.17', 'EXO.6.18', 'EXO.6.19',
  'EXO.6.20', 'EXO.6.21', 'EXO.6.22', 'EXO.6.23', 'EXO.6.24', 'EXO.6.25', 'EXO.6.26',
  'GEN.46.8', 'GEN.46.9', 'GEN.46.10', 'GEN.46.11', 'GEN.46.27', 'ACT.7.14',
  'EXO.6.30', 'EXO.7.1', 'EXO.7.3', 'EXO.7.9', 'EXO.7.10',
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

const questionSet = [...new Set(segments.map((segment) => segment.ref_niv2))]
if (questionSet.length !== QUESTIONS.length || QUESTIONS.some((question) => !questionSet.includes(question))) {
  throw new Error(`Questions inattendues : ${questionSet.join(', ')}`)
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
writeFileSync(
  SORTIE,
  `${JSON.stringify({
    genere_le: new Date().toISOString(),
    oeuvre: OEUVRE,
    ref_niv1: REF_NIV1,
    lot: 'Exode XI-XX',
    bornes: [premiere, derniere],
    cibles_candidates: CIBLES,
    cibles_absentes: ciblesAbsentes,
    temoins: CIBLES.map((canonId) => temoinsParId.get(canonId)).filter(Boolean),
    liens_existants: liens,
    voisins,
    segments,
    feedback_liens_protocole: memoire.valeur,
  }, null, 2)}\n`,
  'utf8',
)

console.log(JSON.stringify({
  sortie: SORTIE,
  segments: segments.length,
  bornes: [premiere, derniere],
  questions: questionSet,
  liens_existants: liens.length,
  deja_relus: segments.filter((segment) => segment.liens_revus_le || segment.liens_revus_par).length,
  temoins: temoins.length,
  cibles_absentes: ciblesAbsentes,
  voisins: voisins.map(({ segment_numero, ref_niv1, ref_niv2 }) => ({ segment_numero, ref_niv1, ref_niv2 })),
}, null, 2))
