import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre sixième'
const QUESTIONS = ['Question XXI', 'Question XXII', 'Question XXIII', 'Question XXIV', 'Question XXV', 'Question XXVI', 'Question XXVII', 'Question XXVIII', 'Question XXIX', 'Question XXX']
const PREMIER = 2801
const DERNIER = 2882
const SORTIE = 'scripts/heptateuque/audit-reprise/liens-josue-q21-q30-lecture.json'
const CIBLES = [
  ...Array.from({ length: 6 }, (_, i) => `JOS.21.${i + 40}`),
  'EXO.33.1', 'EXO.33.2', ...Array.from({ length: 8 }, (_, i) => `DEU.20.${i + 10}`),
  'DEU.7.1', 'DEU.7.2', 'DEU.7.3', 'GEN.15.18', 'GEN.15.19', 'GEN.15.20', 'GEN.15.21',
  '1KI.9.19', '1KI.9.20', '1KI.9.21', '1KI.4.21', '1KI.5.1', 'JDG.1.34', 'JDG.1.35', 'GEN.49.17',
  'JOS.22.23', 'LUK.2.30', '1CO.8.6', 'PSA.104.15',
  'JOS.23.14', 'GEN.3.19', 'ECC.12.7', 'PSA.77.39', 'GEN.24.51',
  'JOS.24.3', 'GAL.3.29', 'ROM.9.8', 'JOS.24.11', 'JOS.24.12', 'WIS.12.8', 'PSA.77.49',
  'JOS.24.19', 'PSA.142.2', 'ROM.10.3', 'ROM.5.20', 'ROM.5.21', 'ROM.10.4',
  'JOS.24.23', 'JOS.7.1', 'JOS.7.5', 'GEN.31.19', 'GEN.35.2', 'GEN.35.4', '2CO.5.6', 'PSA.115.11', '1CO.13.12', '1CO.13.13',
  'JOS.24.25', 'JOS.24.26', 'JOS.24.27', ...Array.from({ length: 10 }, (_, i) => `PSA.113.${i + 9}`), ...Array.from({ length: 10 }, (_, i) => `PSA.115.${i + 1}`), '1PE.2.6', '1PE.2.7', '1PE.2.8',
  'PSA.117.22', 'EXO.17.6', '1CO.10.4', 'JOS.5.2', 'JOS.5.3', 'PSA.80.16',
  'EXO.24.3', 'EXO.34.1', 'EXO.34.3', 'EXO.34.4', 'EXO.34.28', 'JOS.17.13', '2TI.4.14', '2TI.4.16',
]
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).map(line => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: segments, error } = await sb.from('segments').select('id,id_oeuvre,segment_numero,ref_niv1,ref_niv1_texte,ref_niv2,ref_niv2_texte,segment_texte,texte_original,notes,paragraphe,rang,page,nature,liens_revus_le,liens_revus_par').eq('id_oeuvre', OEUVRE).eq('ref_niv1', REF_NIV1).in('ref_niv2', QUESTIONS).order('segment_numero')
if (error) throw error
if (segments.length !== DERNIER - PREMIER + 1 || segments.some((s, i) => s.segment_numero !== PREMIER + i)) throw Error('Bornes ou continuité invalides')
const questionsLive = [...new Set(segments.map(s => s.ref_niv2))]
if (questionsLive.join('|') !== QUESTIONS.join('|')) throw Error(`Questions inattendues : ${questionsLive.join(', ')}`)
const empreinte = createHash('sha256').update(JSON.stringify(segments.map(s => [s.id, s.segment_numero, s.ref_niv1, s.ref_niv2, s.ref_niv2_texte, s.segment_texte, s.texte_original, s.notes, s.nature]))).digest('hex')
const ids = segments.map(s => s.id)
const [{ data: liens, error: liensError }, { data: memoire, error: memoireError }, { count: relusGlobaux, error: relusError }] = await Promise.all([
  sb.from('liens_bibliques').select('*').in('segment_id', ids),
  sb.from('parametres').select('cle,valeur').eq('cle', 'feedback_liens_protocole').single(),
  sb.from('segments').select('id', { count: 'exact', head: true }).eq('id_oeuvre', OEUVRE).not('liens_revus_le', 'is', null),
])
if (liensError || memoireError || relusError) throw liensError || memoireError || relusError
const { data: voisins, error: voisinsError } = await sb.from('segments').select('id,segment_numero,ref_niv1,ref_niv2,ref_niv2_texte,segment_texte,notes,page,liens_revus_le').eq('id_oeuvre', OEUVRE).gte('segment_numero', PREMIER - 3).lte('segment_numero', DERNIER + 3).order('segment_numero')
if (voisinsError) throw voisinsError
let temoins = []
if (CIBLES.length) {
  const { data, error: temoinsError } = await sb.from('versets_lecture').select('id_verset,TR0001,TR0003,TR0004').in('id_verset', [...new Set(CIBLES)]).order('id_verset')
  if (temoinsError) throw temoinsError
  temoins = data
}
mkdirSync('scripts/heptateuque/audit-reprise', { recursive: true })
writeFileSync(SORTIE, `${JSON.stringify({ genere_le: new Date().toISOString(), oeuvre: OEUVRE, ref_niv1: REF_NIV1, lot: 'Josué XXI-XXX', bornes: [PREMIER, DERNIER], relus_globaux: relusGlobaux, empreinte, liens_existants: liens, voisins, segments, temoins, feedback_liens_protocole: memoire.valeur }, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ sortie: SORTIE, segments: segments.length, bornes: [PREMIER, DERNIER], questions: questionsLive, liens_existants: liens.length, deja_relus: segments.filter(s => s.liens_revus_le || s.liens_revus_par).length, relus_globaux: relusGlobaux, empreinte, pages: [...new Set(segments.map(s => s.page))], voisins: voisins.filter(s => s.segment_numero < PREMIER || s.segment_numero > DERNIER).map(({ segment_numero, ref_niv1, ref_niv2, page, liens_revus_le }) => ({ segment_numero, ref_niv1, ref_niv2, page, liens_revus_le })) }, null, 2))
