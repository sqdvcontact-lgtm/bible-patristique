import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre quatrième'
const QUESTIONS = ['Question XXXI', 'Question XXXII', 'Question XXXIII', 'Question XXXIV', 'Question XXXV', 'Question XXXVI', 'Question XXXVII', 'Question XXXVIII', 'Question XXXIX', 'Question XL']
const PREMIER = 2164
const DERNIER = 2239
const SORTIE = 'scripts/heptateuque/audit-reprise/liens-nombres-q31-q40-lecture.json'
const CIBLES = [
  'LEV.6.18', 'LEV.6.19',
  'NUM.18.1', 'NUM.18.12',
  'NUM.19.1', 'NUM.19.2', 'NUM.19.3', 'NUM.19.4', 'NUM.19.5', 'NUM.19.6', 'NUM.19.7', 'NUM.19.8', 'NUM.19.9', 'NUM.19.10', 'NUM.19.11', 'NUM.19.12', 'NUM.19.13', 'NUM.19.14', 'NUM.19.15', 'NUM.19.16', 'NUM.19.17', 'NUM.19.18', 'NUM.19.19', 'NUM.19.20', 'NUM.19.21', 'NUM.19.22',
  'NUM.20.11', 'NUM.20.13', 'NUM.20.17', 'NUM.20.19', 'NUM.20.24', 'NUM.21.2',
  'PSA.36.37', 'PSA.115.16', 'PSA.115.17', 'AMO.1.3',
  'MAT.27.32', 'HEB.13.12', 'JHN.10.18', 'LUK.2.34',
  'ACT.10.44', 'ACT.10.45', 'ACT.10.46', 'ACT.10.47', 'ACT.10.48', 'ACT.15.9',
  'ROM.3.23', 'ROM.3.24', 'ROM.3.25', 'ROM.8.3', 'ROM.11.16', 'ROM.11.17', 'ROM.11.18', 'ROM.11.19', 'ROM.11.20', 'ROM.11.21', 'ROM.11.22', 'ROM.11.23', 'ROM.11.24',
  '1CO.10.4', 'GAL.1.8', 'EPH.1.7', 'COL.3.3', '1TH.5.19', '1PE.2.9',
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
writeFileSync(SORTIE, `${JSON.stringify({ genere_le: new Date().toISOString(), oeuvre: OEUVRE, ref_niv1: REF_NIV1, lot: 'Nombres XXXI-XL', bornes: [PREMIER, DERNIER], relus_globaux: relusGlobaux, empreinte, liens_existants: liens, voisins, segments, temoins, feedback_liens_protocole: memoire.valeur }, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ sortie: SORTIE, segments: segments.length, bornes: [PREMIER, DERNIER], questions: questionsLive, liens_existants: liens.length, deja_relus: segments.filter((segment) => segment.liens_revus_le || segment.liens_revus_par).length, relus_globaux: relusGlobaux, empreinte, pages: [...new Set(segments.map((segment) => segment.page))], voisins: voisins.filter((segment) => segment.segment_numero < PREMIER || segment.segment_numero > DERNIER).map(({ segment_numero, ref_niv2, page, liens_revus_le }) => ({ segment_numero, ref_niv2, page, liens_revus_le })) }, null, 2))
