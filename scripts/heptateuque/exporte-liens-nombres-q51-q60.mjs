import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre quatrième'
const QUESTIONS = ['Question LI', 'Question LII', 'Question LIII', 'Question LIV', 'Question LV', 'Question LVI', 'Question LVII', 'Question LVIII', 'Question LIX', 'Question LX']
const PREMIER = 2295
const DERNIER = 2351
const SORTIE = 'scripts/heptateuque/audit-reprise/liens-nombres-q51-q60-lecture.json'
const CIBLES = [
  'NUM.23.5', 'NUM.24.2', 'JHN.1.30', 'PSA.29.11', 'PSA.9.10', 'EZK.1.3', 'EZK.3.22',
  'NUM.25.1', 'NUM.25.2', 'NUM.25.3', 'NUM.25.4', 'NUM.25.5', 'NUM.25.7', 'NUM.25.8', 'NUM.25.11',
  'NUM.20.12', 'NUM.20.24', 'NUM.21.24', 'NUM.21.35', 'NUM.27.12', 'NUM.27.13', 'NUM.27.14', 'NUM.27.18', 'NUM.27.19', 'NUM.27.20', 'JHN.1.17',
  'NUM.29.7', 'NUM.30.2', 'NUM.30.3', 'NUM.30.4', 'NUM.30.5', 'NUM.30.6', 'NUM.30.7', 'NUM.30.8', 'NUM.30.9', 'NUM.30.10', 'NUM.30.11', 'NUM.30.12', 'NUM.30.13', 'NUM.30.14', 'NUM.30.15', 'NUM.30.16', 'NUM.30.17',
  '1CO.7.3', '1CO.7.4', '1CO.7.5', '1CO.7.37', '1CO.7.38', 'MAT.6.25', 'MAT.6.26', 'EXO.20.7', 'EXO.21.6',
  'NUM.31.5', 'NUM.31.6',
]
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: segments, error } = await sb.from('segments').select('id,id_oeuvre,segment_numero,ref_niv1,ref_niv1_texte,ref_niv2,ref_niv2_texte,segment_texte,texte_original,notes,paragraphe,rang,page,nature,liens_revus_le,liens_revus_par').eq('id_oeuvre', OEUVRE).eq('ref_niv1', REF_NIV1).in('ref_niv2', QUESTIONS).order('segment_numero')
if (error) throw error
if (segments.length !== DERNIER - PREMIER + 1 || segments.some((segment, index) => segment.segment_numero !== PREMIER + index)) throw new Error('Bornes ou continuité invalides')
const questionsLive = [...new Set(segments.map((segment) => segment.ref_niv2))]
if (questionsLive.join('|') !== QUESTIONS.join('|')) throw new Error(`Questions inattendues : ${questionsLive.join(', ')}`)
const empreinte = createHash('sha256').update(JSON.stringify(segments.map((segment) => [segment.id, segment.segment_numero, segment.ref_niv1, segment.ref_niv2, segment.ref_niv2_texte, segment.segment_texte, segment.notes]))).digest('hex')
const ids = segments.map((segment) => segment.id)
const [{ data: liens, error: liensError }, { data: memoire, error: memoireError }, { count: relusGlobaux, error: relusError }] = await Promise.all([
  sb.from('liens_bibliques').select('*').in('segment_id', ids),
  sb.from('parametres').select('cle,valeur').eq('cle', 'feedback_liens_protocole').single(),
  sb.from('segments').select('id', { count: 'exact', head: true }).eq('id_oeuvre', OEUVRE).not('liens_revus_le', 'is', null),
])
if (liensError || memoireError || relusError) throw liensError || memoireError || relusError
const { data: voisins, error: voisinsError } = await sb.from('segments').select('id,segment_numero,ref_niv1,ref_niv2,ref_niv2_texte,segment_texte,notes,page,liens_revus_le').eq('id_oeuvre', OEUVRE).gte('segment_numero', PREMIER - 3).lte('segment_numero', DERNIER + 3).order('segment_numero')
if (voisinsError) throw voisinsError
const { data: temoins, error: temoinsError } = CIBLES.length ? await sb.from('versets_lecture').select('id_verset,"TR0001","TR0003","TR0004"').in('id_verset', CIBLES).order('id_verset') : { data: [], error: null }
if (temoinsError) throw temoinsError
mkdirSync('scripts/heptateuque/audit-reprise', { recursive: true })
writeFileSync(SORTIE, `${JSON.stringify({ genere_le: new Date().toISOString(), oeuvre: OEUVRE, ref_niv1: REF_NIV1, lot: 'Nombres LI-LX', bornes: [PREMIER, DERNIER], relus_globaux: relusGlobaux, empreinte, liens_existants: liens, voisins, segments, temoins, feedback_liens_protocole: memoire.valeur }, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ sortie: SORTIE, segments: segments.length, bornes: [PREMIER, DERNIER], questions: questionsLive, liens_existants: liens.length, deja_relus: segments.filter((segment) => segment.liens_revus_le || segment.liens_revus_par).length, relus_globaux: relusGlobaux, empreinte, pages: [...new Set(segments.map((segment) => segment.page))], voisins: voisins.filter((segment) => segment.segment_numero < PREMIER || segment.segment_numero > DERNIER).map(({ segment_numero, ref_niv2, page, liens_revus_le }) => ({ segment_numero, ref_niv2, page, liens_revus_le })) }, null, 2))
