import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre septième'
const QUESTION = 'Question XLIX'
const PREMIER = 3160
const DERNIER = 3227
const CONTEXTE_DEBUT = 3155
const CONTEXTE_FIN = 3233
const SORTIE = 'scripts/heptateuque/audit-reprise/liens-juges-q49-b-lecture.json'
const CIBLES = []
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).map(line => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: contexte, error } = await sb.from('segments').select('id,id_oeuvre,segment_numero,ref_niv1,ref_niv1_texte,ref_niv2,ref_niv2_texte,segment_texte,texte_original,notes,paragraphe,rang,page,nature,liens_revus_le,liens_revus_par').eq('id_oeuvre', OEUVRE).gte('segment_numero', CONTEXTE_DEBUT).lte('segment_numero', CONTEXTE_FIN).order('segment_numero')
if (error) throw error
if (contexte.length !== CONTEXTE_FIN - CONTEXTE_DEBUT + 1 || contexte.some((s, i) => s.segment_numero !== CONTEXTE_DEBUT + i)) throw Error('Contexte incomplet')
const segments = contexte.filter(s => s.segment_numero >= PREMIER && s.segment_numero <= DERNIER)
if (segments.length !== DERNIER - PREMIER + 1 || segments.some((s, i) => s.segment_numero !== PREMIER + i) || segments.some(s => s.ref_niv1 !== REF_NIV1 || s.ref_niv2 !== QUESTION)) throw Error('Bornes ou structure invalides')
const empreinte = createHash('sha256').update(JSON.stringify(segments.map(s => [s.id, s.segment_numero, s.ref_niv1, s.ref_niv2, s.ref_niv2_texte, s.segment_texte, s.texte_original, s.notes, s.nature]))).digest('hex')
const ids = segments.map(s => s.id)
const [{ data: liens, error: liensError }, { data: memoire, error: memoireError }, { count: relusGlobaux, error: relusError }] = await Promise.all([
  sb.from('liens_bibliques').select('*').in('segment_id', ids),
  sb.from('parametres').select('cle,valeur').eq('cle', 'feedback_liens_protocole').single(),
  sb.from('segments').select('id', { count: 'exact', head: true }).eq('id_oeuvre', OEUVRE).not('liens_revus_le', 'is', null),
])
if (liensError || memoireError || relusError) throw liensError || memoireError || relusError
let temoins = []
if (CIBLES.length) {
  const { data, error: temoinsError } = await sb.from('versets_lecture').select('id_verset,TR0001,TR0003,TR0004').in('id_verset', [...new Set(CIBLES)]).order('id_verset')
  if (temoinsError) throw temoinsError
  temoins = data
}
mkdirSync('scripts/heptateuque/audit-reprise', { recursive: true })
writeFileSync(SORTIE, `${JSON.stringify({ genere_le: new Date().toISOString(), oeuvre: OEUVRE, ref_niv1: REF_NIV1, lot: 'Juges XLIX-B', bornes: [PREMIER, DERNIER], contexte_bornes: [CONTEXTE_DEBUT, CONTEXTE_FIN], relus_globaux: relusGlobaux, empreinte, liens_existants: liens, contexte, segments, temoins, feedback_liens_protocole: memoire.valeur }, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ sortie: SORTIE, segments: segments.length, bornes: [PREMIER, DERNIER], contexte_bornes: [CONTEXTE_DEBUT, CONTEXTE_FIN], liens_existants: liens.length, deja_relus: segments.filter(s => s.liens_revus_le || s.liens_revus_par).length, relus_globaux: relusGlobaux, empreinte, pages: [...new Set(segments.map(s => s.page))], raccords: contexte.filter(s => s.segment_numero < PREMIER || s.segment_numero > DERNIER).map(({ segment_numero, ref_niv1, ref_niv2, page, liens_revus_le }) => ({ segment_numero, ref_niv1, ref_niv2, page, liens_revus_le })) }, null, 2))
