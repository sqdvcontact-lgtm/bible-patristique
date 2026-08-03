import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre troisième'
const QUESTIONS = [
  'Question LXXI', 'Question LXXII', 'Question LXXIII', 'Question LXXIV', 'Question LXXV',
  'Question LXXVI', 'Question LXXVII', 'Question LXXVIII', 'Question LXXIX', 'Question LXXX',
]
const PREMIER = 1888
const DERNIER = 1914
const SORTIE = 'scripts/heptateuque/audit-reprise/liens-levitique-q71-q80-lecture.json'
const CIBLES = [
  'GEN.4.1', 'GEN.4.17', 'GEN.4.25',
  'EXO.28.2', 'EXO.28.41',
  'LEV.16.2', 'LEV.18.9', 'LEV.18.12', 'LEV.18.13', 'LEV.18.14',
  'LEV.19.28', 'LEV.20.5', 'LEV.20.10', 'LEV.20.16', 'LEV.20.17', 'LEV.20.19', 'LEV.20.20', 'LEV.20.25', 'LEV.20.27',
  'LEV.21.7', 'LEV.21.8', 'LEV.21.10', 'LEV.21.13', 'LEV.21.14',
  'EPH.2.2', 'JHN.12.31', 'JHN.14.30', 'HEB.9.7',
]

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: segments, error } = await sb.from('segments')
  .select('id,id_oeuvre,segment_numero,ref_niv1,ref_niv1_texte,ref_niv2,ref_niv2_texte,segment_texte,texte_original,notes,paragraphe,rang,page,nature,liens_revus_le,liens_revus_par')
  .eq('id_oeuvre', OEUVRE).eq('ref_niv1', REF_NIV1).in('ref_niv2', QUESTIONS).order('segment_numero')
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
const { data: voisins, error: voisinsError } = await sb.from('segments')
  .select('id,segment_numero,ref_niv1,ref_niv2,ref_niv2_texte,segment_texte,notes,page,liens_revus_le')
  .eq('id_oeuvre', OEUVRE).gte('segment_numero', PREMIER - 2).lte('segment_numero', DERNIER + 2).order('segment_numero')
if (voisinsError) throw voisinsError
const { data: temoins, error: temoinsError } = CIBLES.length
  ? await sb.from('versets_lecture').select('id_verset,"TR0001","TR0003","TR0004"').in('id_verset', CIBLES).order('id_verset')
  : { data: [], error: null }
if (temoinsError) throw temoinsError

mkdirSync('scripts/heptateuque/audit-reprise', { recursive: true })
writeFileSync(SORTIE, `${JSON.stringify({ genere_le: new Date().toISOString(), oeuvre: OEUVRE, ref_niv1: REF_NIV1, lot: 'Lévitique LXXI-LXXX', bornes: [PREMIER, DERNIER], relus_globaux: relusGlobaux, empreinte, liens_existants: liens, voisins, segments, temoins, feedback_liens_protocole: memoire.valeur }, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ sortie: SORTIE, segments: segments.length, bornes: [PREMIER, DERNIER], questions: questionsLive, liens_existants: liens.length, deja_relus: segments.filter((segment) => segment.liens_revus_le || segment.liens_revus_par).length, relus_globaux: relusGlobaux, empreinte, pages: [...new Set(segments.map((segment) => segment.page))], voisins: voisins.filter((segment) => segment.segment_numero < PREMIER || segment.segment_numero > DERNIER).map(({ segment_numero, ref_niv2, page, liens_revus_le }) => ({ segment_numero, ref_niv2, page, liens_revus_le })) }, null, 2))
