import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre sixième'
const QUESTIONS = ['Question XI', 'Question XII', 'Question XIII', 'Question XIV', 'Question XV', 'Question XVI', 'Question XVII', 'Question XVIII', 'Question XIX', 'Question XX']
const PREMIER = 2754
const DERNIER = 2800
const SORTIE = 'scripts/heptateuque/audit-reprise/liens-josue-q11-q20-lecture.json'
const CIBLES = [
  ...Array.from({ length: 6 }, (_, i) => `JOS.8.${i + 3}`),
  ...Array.from({ length: 18 }, (_, i) => `JOS.9.${i + 3}`),
  'JOS.10.5', 'JOS.10.6', 'JOS.10.7', 'JOS.10.8',
  'JOS.11.14', 'JOS.11.15', 'JOS.11.19', 'JOS.11.20',
  'JOS.15.63', 'JOS.16.10', 'JOS.17.12', 'JOS.17.13', 'JDG.1.35',
  ...Array.from({ length: 12 }, (_, i) => `1SA.25.${i + 22}`),
  ...Array.from({ length: 9 }, (_, i) => `2SA.21.${i + 1}`),
  '1KI.9.16', 'JOS.6.26', '1KI.16.34', 'EXO.7.3', 'EXO.7.22', 'EXO.8.15',
]
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: segments, error } = await sb.from('segments').select('id,id_oeuvre,segment_numero,ref_niv1,ref_niv1_texte,ref_niv2,ref_niv2_texte,segment_texte,texte_original,notes,paragraphe,rang,page,nature,liens_revus_le,liens_revus_par').eq('id_oeuvre', OEUVRE).eq('ref_niv1', REF_NIV1).in('ref_niv2', QUESTIONS).order('segment_numero')
if (error) throw error
if (segments.length !== DERNIER - PREMIER + 1 || segments.some((s, i) => s.segment_numero !== PREMIER + i)) throw new Error('Bornes ou continuité invalides')
const questionsLive = [...new Set(segments.map((s) => s.ref_niv2))]
if (questionsLive.join('|') !== QUESTIONS.join('|')) throw new Error(`Questions inattendues : ${questionsLive.join(', ')}`)
const empreinte = createHash('sha256').update(JSON.stringify(segments.map((s) => [s.id, s.segment_numero, s.ref_niv1, s.ref_niv2, s.ref_niv2_texte, s.segment_texte, s.notes]))).digest('hex')
const ids = segments.map((s) => s.id)
const [{ data: liens, error: liensError }, { data: memoire, error: memoireError }, { count: relusGlobaux, error: relusError }] = await Promise.all([
  sb.from('liens_bibliques').select('*').in('segment_id', ids),
  sb.from('parametres').select('cle,valeur').eq('cle', 'feedback_liens_protocole').single(),
  sb.from('segments').select('id', { count: 'exact', head: true }).eq('id_oeuvre', OEUVRE).not('liens_revus_le', 'is', null),
])
if (liensError || memoireError || relusError) throw liensError || memoireError || relusError
const { data: voisins, error: voisinsError } = await sb.from('segments').select('id,segment_numero,ref_niv1,ref_niv2,ref_niv2_texte,segment_texte,notes,page,liens_revus_le').eq('id_oeuvre', OEUVRE).gte('segment_numero', PREMIER - 3).lte('segment_numero', DERNIER + 3).order('segment_numero')
if (voisinsError) throw voisinsError
const { data: temoins, error: temoinsError } = await sb.from('versets_lecture').select('id_verset,"TR0001","TR0003","TR0004"').in('id_verset', [...new Set(CIBLES)]).order('id_verset')
if (temoinsError) throw temoinsError
mkdirSync('scripts/heptateuque/audit-reprise', { recursive: true })
writeFileSync(SORTIE, `${JSON.stringify({ genere_le: new Date().toISOString(), oeuvre: OEUVRE, ref_niv1: REF_NIV1, lot: 'Josué XI-XX', bornes: [PREMIER, DERNIER], relus_globaux: relusGlobaux, empreinte, liens_existants: liens, voisins, segments, temoins, feedback_liens_protocole: memoire.valeur }, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ sortie: SORTIE, segments: segments.length, bornes: [PREMIER, DERNIER], questions: questionsLive, liens_existants: liens.length, deja_relus: segments.filter((s) => s.liens_revus_le || s.liens_revus_par).length, relus_globaux: relusGlobaux, empreinte, cibles_demandees: [...new Set(CIBLES)].length, temoins: temoins.length, pages: [...new Set(segments.map((s) => s.page))], voisins: voisins.filter((s) => s.segment_numero < PREMIER || s.segment_numero > DERNIER).map(({ segment_numero, ref_niv2, page, liens_revus_le }) => ({ segment_numero, ref_niv2, page, liens_revus_le })) }, null, 2))
