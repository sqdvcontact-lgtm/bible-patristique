import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre cinquième'
const QUESTIONS = ['Question XI', 'Question XII', 'Question XIII', 'Question XIV', 'Question XV', 'Question XVI', 'Question XVII', 'Question XVIII', 'Question XIX', 'Question XX']
const PREMIER = 2428
const DERNIER = 2486
const SORTIE = 'scripts/heptateuque/audit-reprise/liens-deuteronome-q11-q20-lecture.json'
const CIBLES = [
  'DEU.1.39', 'DEU.5.29', 'DEU.6.13', 'DEU.8.2', 'DEU.9.6', 'DEU.9.7', 'DEU.9.8',
  'DEU.10.1', 'DEU.10.2', 'DEU.10.3', 'DEU.10.4', 'DEU.10.8', 'DEU.10.9', 'DEU.11.20',
  'DEU.12.11', 'DEU.12.17', 'DEU.13.1', 'DEU.13.2', 'DEU.13.3',
  'DEU.14.22', 'DEU.14.23', 'DEU.14.24', 'DEU.14.25', 'DEU.14.26', 'DEU.14.27', 'DEU.14.28', 'DEU.14.29', 'DEU.15.1',
  'EXO.31.18', 'EXO.32.15', 'EXO.32.16', 'EXO.34.1', 'EXO.34.27', 'EXO.34.28', 'EXO.34.29',
  'EZK.11.19', 'EZK.36.26', 'JER.31.31', 'JER.31.32', 'JER.31.33', 'JER.31.34',
  'MAT.5.34', '1CO.10.5', '1CO.10.6', '1CO.10.7', '1CO.10.8', '1CO.10.9', '1CO.10.10',
  '2CO.3.3', '2CO.3.6', 'ROM.7.12', 'ROM.10.3', 'PHP.2.12', 'PHP.2.13',
  'PSA.72.26', 'PSA.15.5', '1PE.2.9', 'NUM.14.29', 'NUM.14.30',
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
const { data: temoins, error: temoinsError } = CIBLES.length ? await sb.from('versets_lecture').select('id_verset,"TR0001","TR0003","TR0004"').in('id_verset', CIBLES).order('id_verset') : { data: [], error: null }
if (temoinsError) throw temoinsError
mkdirSync('scripts/heptateuque/audit-reprise', { recursive: true })
writeFileSync(SORTIE, `${JSON.stringify({ genere_le: new Date().toISOString(), oeuvre: OEUVRE, ref_niv1: REF_NIV1, lot: 'Deutéronome XI-XX', bornes: [PREMIER, DERNIER], relus_globaux: relusGlobaux, empreinte, liens_existants: liens, voisins, segments, temoins, feedback_liens_protocole: memoire.valeur }, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ sortie: SORTIE, segments: segments.length, bornes: [PREMIER, DERNIER], questions: questionsLive, liens_existants: liens.length, deja_relus: segments.filter((s) => s.liens_revus_le || s.liens_revus_par).length, relus_globaux: relusGlobaux, empreinte, pages: [...new Set(segments.map((s) => s.page))], voisins: voisins.filter((s) => s.segment_numero < PREMIER || s.segment_numero > DERNIER).map(({ segment_numero, ref_niv1, ref_niv2, page, liens_revus_le }) => ({ segment_numero, ref_niv1, ref_niv2, page, liens_revus_le })) }, null, 2))
