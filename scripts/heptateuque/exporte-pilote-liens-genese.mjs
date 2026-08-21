import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const SORTIE = 'scripts/heptateuque/audit-reprise/liens-pilote-genese-q1-q10.json'
const CIBLES = [
  'GEN.4.17', 'GEN.5.4', 'GEN.5.25', 'GEN.5.26', 'GEN.5.27',
  'GEN.5.28', 'GEN.7.6', 'GEN.6.4', 'MAL.3.1',
  'GEN.6.15', 'ACT.7.22', 'GEN.6.16', 'GEN.6.21',
  'GEN.7.8', 'GEN.7.9', 'GEN.7.15', 'GEN.2.7', 'GEN.7.20',
]

const env = Object.fromEntries(readFileSync('.env.local', 'utf8')
  .split(/\r?\n/)
  .map((ligne) => ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
  .filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const must = async (requete, libelle) => {
  const { data, error, count } = await requete
  if (error) throw new Error(`${libelle}: ${error.message}`)
  return { data, count }
}

const { data: segments } = await must(
  supabase.from('segments')
    .select('id,id_oeuvre,segment_numero,ref_niv1,ref_niv1_texte,ref_niv2,ref_niv2_texte,segment_texte,texte_original,notes,liens_revus_le,liens_revus_par')
    .eq('id_oeuvre', OEUVRE)
    .gte('segment_numero', 8)
    .lte('segment_numero', 31)
    .order('segment_numero'),
  'segments du pilote',
)

if (segments.length !== 24 || segments[0]?.segment_numero !== 8 || segments.at(-1)?.segment_numero !== 31) {
  throw new Error(`Lot inattendu: ${segments.length} segments, bornes ${segments[0]?.segment_numero}-${segments.at(-1)?.segment_numero}`)
}

const { data: temoins } = await must(
  supabase.from('versets_lecture')
    .select('id_verset,ref,"num_TR0001","TR0001","num_TR0003","TR0003","num_TR0004","TR0004"')
    .in('id_verset', CIBLES),
  'témoins bibliques',
)

const trouves = new Set(temoins.map((temoin) => temoin.id_verset))
const absents = CIBLES.filter((cible) => !trouves.has(cible))
if (absents.length) throw new Error(`Cibles absentes: ${absents.join(', ')}`)

const ids = segments.map((segment) => segment.id)
const { data: liensExistants } = await must(
  supabase.from('liens_bibliques').select('*').in('segment_id', ids).order('id'),
  'liens existants',
)

const dossier = {
  genere_le: new Date().toISOString(),
  oeuvre: OEUVRE,
  lot: 'Genèse — Questions I à X',
  avertissement: 'Dossier de lecture uniquement : aucune attribution automatique.',
  cibles_attendues: CIBLES,
  temoins: temoins.sort((a, b) => CIBLES.indexOf(a.id_verset) - CIBLES.indexOf(b.id_verset)),
  liens_existants: liensExistants,
  segments,
}

mkdirSync('scripts/heptateuque/audit-reprise', { recursive: true })
writeFileSync(SORTIE, `${JSON.stringify(dossier, null, 2)}\n`, 'utf8')

console.log(JSON.stringify({
  sortie: SORTIE,
  segments: segments.length,
  bornes: [segments[0].segment_numero, segments.at(-1).segment_numero],
  questions: [...new Set(segments.map((segment) => segment.ref_niv2))],
  temoins: temoins.length,
  liens_existants: liensExistants.length,
  deja_relus: segments.filter((segment) => segment.liens_revus_le).length,
}, null, 2))
