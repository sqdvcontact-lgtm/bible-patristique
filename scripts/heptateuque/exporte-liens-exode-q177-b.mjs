import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre deuxième'
const PREMIER_CONTEXTE = 1349
const DERNIER_CONTEXTE = 1417
const PREMIER = 1354
const DERNIER = 1412
const SORTIE = 'scripts/heptateuque/audit-reprise/liens-exode-q177-b-lecture.json'
const CIBLES = [
  'EXO.26.1', 'EXO.26.2', 'EXO.26.7', 'EXO.26.8', 'EXO.26.9',
  'EXO.26.12', 'EXO.26.13', 'EXO.26.18', 'EXO.26.20', 'EXO.26.22',
  'EXO.26.23', 'EXO.26.25', 'EXO.26.36', 'EXO.26.37',
  'EXO.27.1', 'EXO.27.9', 'EXO.27.10', 'EXO.27.11', 'EXO.27.12',
  'EXO.27.13', 'EXO.27.14', 'EXO.27.15', 'EXO.27.16', 'EXO.27.18',
  'EXO.30.18', 'EXO.30.19', 'EXO.30.20', 'EXO.30.21',
  'EXO.38.9', 'EXO.38.10', 'EXO.38.11', 'EXO.38.12', 'EXO.38.13',
  'EXO.38.14', 'EXO.38.15', 'EXO.38.16', 'EXO.38.17', 'EXO.38.18', 'EXO.38.19',
]

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]),
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const { data: questionComplete, error: questionError } = await sb
  .from('segments')
  .select('segment_numero,ref_niv1,ref_niv2,ref_niv2_texte')
  .eq('id_oeuvre', OEUVRE)
  .eq('ref_niv1', REF_NIV1)
  .eq('ref_niv2', 'Question CLXXVII')
  .order('segment_numero')
if (questionError) throw questionError

const { data: contexte, error } = await sb
  .from('segments')
  .select('id,id_oeuvre,segment_numero,ref_niv1,ref_niv1_texte,ref_niv2,ref_niv2_texte,segment_texte,texte_original,notes,paragraphe,rang,page,nature,liens_revus_le,liens_revus_par')
  .eq('id_oeuvre', OEUVRE)
  .eq('ref_niv1', REF_NIV1)
  .gte('segment_numero', PREMIER_CONTEXTE)
  .lte('segment_numero', DERNIER_CONTEXTE)
  .order('segment_numero')
if (error) throw error

const segments = contexte.filter((segment) => segment.segment_numero >= PREMIER && segment.segment_numero <= DERNIER)
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

mkdirSync('scripts/heptateuque/audit-reprise', { recursive: true })
writeFileSync(SORTIE, `${JSON.stringify({
  genere_le: new Date().toISOString(), oeuvre: OEUVRE, ref_niv1: REF_NIV1,
  lot: 'Exode CLXXVII — sous-passe B', bornes_manifeste: [PREMIER, DERNIER],
  bornes_contexte: [PREMIER_CONTEXTE, DERNIER_CONTEXTE], liens_existants: liens,
  question_complete: questionComplete, contexte, segments, temoins, feedback_liens_protocole: memoire.valeur,
}, null, 2)}\n`, 'utf8')

console.log(JSON.stringify({
  sortie: SORTIE, segments: segments.length,
  bornes_manifeste: [segments[0]?.segment_numero, segments.at(-1)?.segment_numero],
  bornes_contexte: [contexte[0]?.segment_numero, contexte.at(-1)?.segment_numero],
  questions_contexte: [...new Set(contexte.map((segment) => segment.ref_niv2))],
  question_complete: [questionComplete[0]?.segment_numero, questionComplete.at(-1)?.segment_numero, questionComplete[0]?.ref_niv2_texte],
  liens_existants: liens.length,
  deja_relus: segments.filter((segment) => segment.liens_revus_le || segment.liens_revus_par).length,
}, null, 2))
