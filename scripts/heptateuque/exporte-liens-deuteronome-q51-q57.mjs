import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre cinquième'
const QUESTIONS = ['Question LI', 'Question LII', 'Question LIII', 'Question LIV', 'Question LV', 'Question LVI', 'Question LVII']
const PREMIER = 2636
const DERNIER = 2689
const SORTIE = 'scripts/heptateuque/audit-reprise/liens-deuteronome-q51-q57-lecture.json'
const CIBLES = [
  'DEU.29.4', 'DEU.29.5', 'DEU.29.6', 'EXO.32.6', 'EXO.32.18',
  'DEU.29.17', 'DEU.29.18', 'DEU.29.19', 'DEU.29.20', 'DEU.29.21', 'JHN.15.22', 'GEN.20.6', 'MAT.5.8',
  'DEU.30.6', 'DEU.30.11', 'DEU.30.12', 'DEU.30.13', 'DEU.30.14',
  'ROM.10.7', 'ROM.10.8', 'ROM.10.10', 'GAL.5.6', 'ROM.13.10', 'LUK.2.14',
  'DEU.32.5', 'PSA.50.6', 'JER.14.7', 'JER.14.8', 'PSA.40.5', '1SA.2.25',
  'ISA.5.3', 'JHN.14.30', 'JHN.14.31', 'EZK.33.11', '2SA.12.13', 'PSA.77.39',
  'DEU.33.1', 'DEU.33.2', 'DEU.33.3', 'DEU.33.4', 'DEU.33.5', 'DEU.33.17',
  'GEN.25.25', 'ISA.9.2', 'ROM.11.31', 'ROM.10.3', 'JHN.5.46', '2CO.3.16',
  'ROM.11.25', 'ROM.11.26', 'ROM.15.10',
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
writeFileSync(SORTIE, `${JSON.stringify({ genere_le: new Date().toISOString(), oeuvre: OEUVRE, ref_niv1: REF_NIV1, lot: 'Deutéronome LI-LVII', bornes: [PREMIER, DERNIER], relus_globaux: relusGlobaux, empreinte, liens_existants: liens, voisins, segments, temoins, feedback_liens_protocole: memoire.valeur }, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ sortie: SORTIE, segments: segments.length, bornes: [PREMIER, DERNIER], questions: questionsLive, liens_existants: liens.length, deja_relus: segments.filter((s) => s.liens_revus_le || s.liens_revus_par).length, relus_globaux: relusGlobaux, empreinte, pages: [...new Set(segments.map((s) => s.page))], voisins: voisins.filter((s) => s.segment_numero < PREMIER || s.segment_numero > DERNIER).map(({ segment_numero, ref_niv1, ref_niv2, page, liens_revus_le }) => ({ segment_numero, ref_niv1, ref_niv2, page, liens_revus_le })) }, null, 2))
