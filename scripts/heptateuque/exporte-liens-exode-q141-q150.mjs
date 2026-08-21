import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre deuxième'
const PREMIER = 1138
const DERNIER = 1169
const SORTIE = 'scripts/heptateuque/audit-reprise/liens-exode-q141-q150-lecture.json'
const CIBLES = [
  'EXO.28.1', 'EXO.28.4', 'EXO.29.4',
  'EXO.32.1', 'EXO.32.2', 'EXO.32.3', 'EXO.32.4', 'EXO.32.7', 'EXO.32.8',
  'EXO.32.10', 'EXO.32.11', 'EXO.32.12', 'EXO.32.13', 'EXO.32.14',
  'EXO.32.16', 'EXO.32.19', 'EXO.32.20', 'EXO.32.23', 'EXO.32.24',
  'EXO.32.25', 'EXO.32.27', 'EXO.32.28', 'EXO.32.31', 'EXO.32.32', 'EXO.32.35',
  'EXO.33.1', 'EXO.33.2', 'EXO.33.3',
  'WIS.3.2', 'SIR.11.14', 'ROM.11.33', 'PSA.50.11', 'PSA.51.11',
  'PSA.67.3', 'PSA.68.3',
]

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]),
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const { data: segments, error } = await sb
  .from('segments')
  .select('id,id_oeuvre,segment_numero,ref_niv1,ref_niv1_texte,ref_niv2,ref_niv2_texte,segment_texte,texte_original,notes,paragraphe,rang,page,nature,liens_revus_le,liens_revus_par')
  .eq('id_oeuvre', OEUVRE)
  .eq('ref_niv1', REF_NIV1)
  .gte('segment_numero', PREMIER)
  .lte('segment_numero', DERNIER)
  .order('segment_numero')
if (error) throw error

const ids = segments.map((segment) => segment.id)
const [{ data: liens, error: liensError }, { data: memoire, error: memoireError }] = await Promise.all([
  sb.from('liens_bibliques').select('*').in('segment_id', ids),
  sb.from('parametres').select('cle,valeur').eq('cle', 'feedback_liens_protocole').single(),
])
if (liensError || memoireError) throw liensError || memoireError

const { data: voisins, error: voisinsError } = await sb
  .from('segments')
  .select('id,segment_numero,ref_niv1,ref_niv2,ref_niv2_texte,segment_texte')
  .eq('id_oeuvre', OEUVRE)
  .gte('segment_numero', PREMIER - 1)
  .lte('segment_numero', DERNIER + 1)
  .order('segment_numero')
if (voisinsError) throw voisinsError

const { data: temoins, error: temoinsError } = await sb
  .from('versets_lecture')
  .select('id_verset,"TR0001","TR0003","TR0004"')
  .in('id_verset', CIBLES)
  .order('id_verset')
if (temoinsError) throw temoinsError

mkdirSync('scripts/heptateuque/audit-reprise', { recursive: true })
writeFileSync(SORTIE, `${JSON.stringify({
  genere_le: new Date().toISOString(),
  oeuvre: OEUVRE,
  ref_niv1: REF_NIV1,
  lot: 'Exode CXLI-CL',
  bornes: [PREMIER, DERNIER],
  liens_existants: liens,
  voisins,
  segments,
  temoins,
  feedback_liens_protocole: memoire.valeur,
}, null, 2)}\n`, 'utf8')

console.log(JSON.stringify({
  sortie: SORTIE,
  segments: segments.length,
  bornes: [segments[0]?.segment_numero, segments.at(-1)?.segment_numero],
  questions: [...new Set(segments.map((segment) => segment.ref_niv2))],
  liens_existants: liens.length,
  deja_relus: segments.filter((segment) => segment.liens_revus_le || segment.liens_revus_par).length,
  voisins: voisins.map(({ segment_numero, ref_niv1, ref_niv2 }) => ({ segment_numero, ref_niv1, ref_niv2 })),
}, null, 2))
