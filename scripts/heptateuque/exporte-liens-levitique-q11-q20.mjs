import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre troisième'
const QUESTIONS = [
  'Question XI', 'Question XII', 'Question XIII', 'Question XIV', 'Question XV',
  'Question XVI', 'Question XVII', 'Question XVIII', 'Question XIX', 'Question XX',
]
const SORTIE = 'scripts/heptateuque/audit-reprise/liens-levitique-q11-q20-lecture.json'
const CIBLES = [
  'EXO.29.1', 'EXO.29.35', 'EXO.29.36', 'EXO.29.37', 'EXO.29.39',
  'LEV.4.12', 'LEV.4.13', 'LEV.4.21', 'LEV.4.22', 'LEV.4.24', 'LEV.4.27', 'LEV.4.28',
  'LEV.5.4', 'LEV.5.5', 'LEV.5.6', 'LEV.5.7', 'LEV.5.15', 'LEV.5.16', 'LEV.5.17', 'LEV.5.18', 'LEV.5.19',
  'LEV.5.20', 'LEV.5.21', 'LEV.5.22', 'LEV.5.23', 'LEV.5.24', 'LEV.5.25', 'LEV.5.26',
  'LEV.6.1', 'LEV.6.2', 'LEV.6.3', 'LEV.6.4', 'LEV.6.5', 'LEV.6.6', 'LEV.6.7',
  'LEV.6.9', 'LEV.6.11', 'LEV.6.12', 'LEV.6.13', 'LEV.6.14', 'LEV.6.15', 'LEV.6.16',
  'LEV.6.19', 'LEV.6.20', 'LEV.6.21', 'LEV.6.22', 'LEV.6.23', 'LEV.6.26', 'LEV.6.30',
  'LEV.7.1', 'LEV.7.6', 'LEV.7.7',
  'PSA.18.13', 'PSA.19.13', 'PSA.36.27', 'PSA.37.27', 'PSA.58.6', 'PSA.59.6', 'PSA.68.6', 'PSA.69.6',
  'GAL.6.1', 'JAS.4.17', 'MAT.26.28', 'ROM.5.16',
]

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
    .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]),
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: segments, error } = await sb
  .from('segments')
  .select('id,id_oeuvre,segment_numero,ref_niv1,ref_niv1_texte,ref_niv2,ref_niv2_texte,segment_texte,texte_original,notes,paragraphe,rang,page,nature,liens_revus_le,liens_revus_par')
  .eq('id_oeuvre', OEUVRE).eq('ref_niv1', REF_NIV1).in('ref_niv2', QUESTIONS).order('segment_numero')
if (error) throw error
const questionsLive = [...new Set(segments.map((segment) => segment.ref_niv2))]
if (questionsLive.length !== QUESTIONS.length || QUESTIONS.some((question) => !questionsLive.includes(question))) throw new Error(`Questions inattendues : ${questionsLive.join(', ')}`)

const ids = segments.map((segment) => segment.id)
const [{ data: liens, error: liensError }, { data: memoire, error: memoireError }] = await Promise.all([
  sb.from('liens_bibliques').select('*').in('segment_id', ids),
  sb.from('parametres').select('cle,valeur').eq('cle', 'feedback_liens_protocole').single(),
])
if (liensError || memoireError) throw liensError || memoireError
const { data: temoins, error: temoinsError } = await sb
  .from('versets_lecture').select('id_verset,"TR0001","TR0003","TR0004"').in('id_verset', CIBLES).order('id_verset')
if (temoinsError) throw temoinsError
const premiere = segments[0]?.segment_numero
const derniere = segments.at(-1)?.segment_numero
const { data: voisins, error: voisinsError } = await sb
  .from('segments').select('id,segment_numero,ref_niv1,ref_niv2,ref_niv2_texte,segment_texte')
  .eq('id_oeuvre', OEUVRE).gte('segment_numero', premiere - 1).lte('segment_numero', derniere + 1).order('segment_numero')
if (voisinsError) throw voisinsError

mkdirSync('scripts/heptateuque/audit-reprise', { recursive: true })
writeFileSync(SORTIE, `${JSON.stringify({
  genere_le: new Date().toISOString(), oeuvre: OEUVRE, ref_niv1: REF_NIV1,
  lot: 'Lévitique XI-XX', bornes: [premiere, derniere], liens_existants: liens,
  voisins, segments, temoins, feedback_liens_protocole: memoire.valeur,
}, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({
  sortie: SORTIE, segments: segments.length, bornes: [premiere, derniere], questions: questionsLive,
  liens_existants: liens.length,
  deja_relus: segments.filter((segment) => segment.liens_revus_le || segment.liens_revus_par).length,
  voisins: voisins.map(({ segment_numero, ref_niv1, ref_niv2 }) => ({ segment_numero, ref_niv1, ref_niv2 })),
}, null, 2))
