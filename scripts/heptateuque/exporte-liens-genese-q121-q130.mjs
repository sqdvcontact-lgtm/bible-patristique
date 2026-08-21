import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const SORTIE = 'scripts/heptateuque/audit-reprise/liens-genese-q121-q130-lecture.json'
const QUESTIONS = [
  'Question CXXI', 'Question CXXII', 'Question CXXIII', 'Question CXXIV', 'Question CXXV',
  'Question CXXVI', 'Question CXXVII', 'Question CXXVIII', 'Question CXXIX', 'Question CXXX',
]
const plage = (livre, chapitre, debut, fin) => Array.from({ length: fin - debut + 1 }, (_, i) => `${livre}.${chapitre}.${debut + i}`)
const CIBLES = [
  ...plage('GEN', 36, 31, 39), ...plage('MAT', 1, 1, 17), ...plage('LUK', 3, 23, 38), ...plage('NUM', 22, 2, 6),
  'GEN.35.28', 'GEN.35.29', 'GEN.25.26', 'GEN.37.1', 'GEN.37.2', ...plage('GEN', 37, 5, 11), 'GEN.37.28',
  'GEN.41.46', 'GEN.41.53', 'GEN.45.6', 'GEN.47.9', 'PHP.2.9', 'PHP.2.10',
  'GEN.16.15', 'GEN.25.2', 'GEN.25.6', 'GEN.37.35', 'GEN.37.36', '2KI.25.8',
  ...plage('GEN', 38, 1, 3), ...plage('GEN', 38, 6, 11), ...plage('GEN', 38, 14, 18), 'GEN.38.26', 'GEN.39.1',
]
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((ligne) => ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: segments, error } = await supabase.from('segments')
  .select('id,id_oeuvre,segment_numero,ref_niv1,ref_niv2,ref_niv2_texte,segment_texte,texte_original,notes,liens_revus_le,liens_revus_par')
  .eq('id_oeuvre', OEUVRE).eq('ref_niv1', 'Livre premier').in('ref_niv2', QUESTIONS).order('segment_numero')
if (error) throw error
if (segments.length !== 40 || segments[0]?.segment_numero !== 376 || segments.at(-1)?.segment_numero !== 415) throw new Error('Lot inattendu')
const qs = [...new Set(segments.map((s) => s.ref_niv2))]
if (qs.length !== 10 || QUESTIONS.some((q) => !qs.includes(q))) throw new Error('Questions inattendues')
const ids = segments.map((s) => s.id)
const { data: liensExistants, error: e2 } = await supabase.from('liens_bibliques').select('*').in('segment_id', ids)
if (e2) throw e2
const { data: temoins, error: e3 } = await supabase.from('versets_lecture')
  .select('id_verset,ref,"TR0001","TR0003","TR0004"').in('id_verset', CIBLES)
if (e3) throw e3
const presents = new Set(temoins.map((t) => t.id_verset))
const absents = CIBLES.filter((c) => !presents.has(c))
if (absents.length) throw new Error(`Cibles absentes : ${absents.join(', ')}`)
mkdirSync('scripts/heptateuque/audit-reprise', { recursive: true })
writeFileSync(SORTIE, `${JSON.stringify({ genere_le: new Date().toISOString(), oeuvre: OEUVRE, lot: 'Genèse CXXI-CXXX', cibles_candidates: CIBLES, temoins: temoins.sort((a,b)=>CIBLES.indexOf(a.id_verset)-CIBLES.indexOf(b.id_verset)), liens_existants: liensExistants, segments }, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ sortie: SORTIE, segments: segments.length, bornes: [376, 415], questions: qs, temoins: temoins.length, liens_existants: liensExistants.length, deja_relus: segments.filter((s) => s.liens_revus_le).length }, null, 2))
