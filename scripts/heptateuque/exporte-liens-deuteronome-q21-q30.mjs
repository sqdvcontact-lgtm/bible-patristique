import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre cinquième'
const QUESTIONS = ['Question XXI', 'Question XXII', 'Question XXIII', 'Question XXIV', 'Question XXV', 'Question XXVI', 'Question XXVII', 'Question XXVIII', 'Question XXIX', 'Question XXX']
const PREMIER = 2487
const DERNIER = 2520
const SORTIE = 'scripts/heptateuque/audit-reprise/liens-deuteronome-q21-q30-lecture.json'
const CIBLES = [
  'DEU.15.1', ...Array.from({ length: 6 }, (_, i) => `DEU.15.${i + 7}`), 'DEU.15.19',
  'EXO.13.2', 'COL.1.15', 'COL.1.18', '2CO.5.17', 'ROM.6.9', 'PRO.31.2',
  'DEU.16.2', 'DEU.16.9', 'DEU.16.10', 'DEU.16.11', 'EXO.12.5', 'EXO.19.1', 'EXO.20.1', 'NUM.28.19',
  'DEU.17.14', 'DEU.17.15', 'DEU.17.17', '1SA.8.7', '2SA.5.13',
  '1KI.11.1', '1KI.11.2', '1KI.11.3', '1KI.11.4',
  'DEU.18.6', 'DEU.18.7', 'DEU.18.8', 'DEU.18.10', 'DEU.18.11', 'DEU.18.14', 'DEU.18.15',
  'DEU.14.27', 'DEU.14.28', 'DEU.14.29',
  'JDG.6.37', 'JDG.6.38', 'JDG.6.39', 'JDG.6.40', 'NUM.17.23', 'DEU.20.4',
]
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: segments, error } = await sb.from('segments').select('id,id_oeuvre,segment_numero,ref_niv1,ref_niv1_texte,ref_niv2,ref_niv2_texte,segment_texte,texte_original,notes,paragraphe,rang,page,nature,liens_revus_le,liens_revus_par').eq('id_oeuvre', OEUVRE).eq('ref_niv1', REF_NIV1).in('ref_niv2', QUESTIONS).order('segment_numero')
if (error) throw error
if (segments.length !== DERNIER - PREMIER + 1 || segments.some((s, i) => s.segment_numero !== PREMIER + i)) throw new Error('Bornes ou continuité invalides')
const questionsLive = [...new Set(segments.map((s) => s.ref_niv2))]
if (questionsLive.join('|') !== QUESTIONS.join('|')) throw new Error(`Questions inattendues : ${questionsLive.join(', ')}`)
const empreinte = createHash('sha256').update(JSON.stringify(segments.map((s) => [s.id, s.segment_numero, s.ref_niv1, s.ref_niv2, s.ref_niv2_texte, s.segment_texte, s.texte_original, s.notes, s.nature]))).digest('hex')
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
writeFileSync(SORTIE, `${JSON.stringify({ genere_le: new Date().toISOString(), oeuvre: OEUVRE, ref_niv1: REF_NIV1, lot: 'Deutéronome XXI-XXX', bornes: [PREMIER, DERNIER], relus_globaux: relusGlobaux, empreinte, liens_existants: liens, voisins, segments, temoins, feedback_liens_protocole: memoire.valeur }, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ sortie: SORTIE, segments: segments.length, bornes: [PREMIER, DERNIER], questions: questionsLive, liens_existants: liens.length, deja_relus: segments.filter((s) => s.liens_revus_le || s.liens_revus_par).length, relus_globaux: relusGlobaux, empreinte, pages: [...new Set(segments.map((s) => s.page))], voisins: voisins.filter((s) => s.segment_numero < PREMIER || s.segment_numero > DERNIER).map(({ segment_numero, ref_niv1, ref_niv2, page, liens_revus_le }) => ({ segment_numero, ref_niv1, ref_niv2, page, liens_revus_le })) }, null, 2))
