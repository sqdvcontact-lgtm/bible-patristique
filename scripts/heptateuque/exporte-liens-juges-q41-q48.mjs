import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre septième'
const QUESTIONS = ['Question XLI', 'Question XLII', 'Question XLIII', 'Question XLIV', 'Question XLV', 'Question XLVI', 'Question XLVII', 'Question XLVIII']
const PREMIER = 3036
const DERNIER = 3091
const SORTIE = 'scripts/heptateuque/audit-reprise/liens-juges-q41-q48-lecture.json'
const CIBLES = [
  'JDG.8.26', 'JDG.8.27', 'JDG.8.28', '1SA.2.18', 'EXO.28.6', 'JDG.9.5', 'JDG.8.33',
  'JDG.9.14', 'JDG.9.15', 'JDG.9.23', 'PSA.42.3', 'PSA.43.3',
  'JDG.9.32', 'JDG.9.33', 'MRK.16.2', 'JHN.20.1', 'GEN.1.3', 'GEN.1.4', 'GEN.1.5', 'GEN.1.14', 'GEN.1.15', 'GEN.1.16', 'GEN.1.17', 'GEN.1.18', 'GEN.1.19',
  'JDG.10.1', '1SA.18.27', '2CH.22.11', 'LUK.1.36', 'JDG.11.24', 'DEU.32.8',
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
writeFileSync(SORTIE, `${JSON.stringify({ genere_le: new Date().toISOString(), oeuvre: OEUVRE, ref_niv1: REF_NIV1, lot: 'Juges XLI-XLVIII', bornes: [PREMIER, DERNIER], relus_globaux: relusGlobaux, empreinte, liens_existants: liens, voisins, segments, temoins, feedback_liens_protocole: memoire.valeur }, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ sortie: SORTIE, segments: segments.length, bornes: [PREMIER, DERNIER], questions: questionsLive, liens_existants: liens.length, deja_relus: segments.filter(s => s.liens_revus_le || s.liens_revus_par).length, relus_globaux: relusGlobaux, empreinte, pages: [...new Set(segments.map(s => s.page))], voisins: voisins.filter(s => s.segment_numero < PREMIER || s.segment_numero > DERNIER).map(({ segment_numero, ref_niv1, ref_niv2, page, liens_revus_le }) => ({ segment_numero, ref_niv1, ref_niv2, page, liens_revus_le })) }, null, 2))
