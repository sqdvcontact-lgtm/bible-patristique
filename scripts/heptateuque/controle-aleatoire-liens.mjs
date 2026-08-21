import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const GRAINE = '2026-08-02|heptateuque|controle-aleatoire-v1'
const LIVRES = [
  ['Livre premier', 1, 570],
  ['Livre deuxième', 571, 1471],
  ['Livre troisième', 1472, 1986],
  ['Livre quatrième', 1987, 2370],
  ['Livre cinquième', 2371, 2689],
  ['Livre sixième', 2690, 2882],
  ['Livre septième', 2883, 3262],
]
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function toutesLesPages(construire, taille = 1000) {
  const lignes = []
  for (let debut = 0; ; debut += taille) {
    const { data, error } = await construire().range(debut, debut + taille - 1)
    if (error) throw error
    lignes.push(...data)
    if (data.length < taille) return lignes
  }
}

const segments = await toutesLesPages(() => db.from('segments')
  .select('id,segment_numero,segment_texte,notes,ref_niv1,ref_niv2,ref_niv2_texte,paragraphe')
  .eq('id_oeuvre', OEUVRE).order('segment_numero'))
const score = (numero) => createHash('sha256').update(`${GRAINE}|${numero}`).digest('hex')
const echantillon = LIVRES.flatMap(([livre, debut, fin]) => segments
  .filter((segment) => segment.segment_numero >= debut && segment.segment_numero <= fin)
  .sort((a, b) => score(a.segment_numero).localeCompare(score(b.segment_numero)))
  .slice(0, 6).map((segment) => ({ ...segment, livre, score: score(segment.segment_numero) })))

const liens = []
for (let i = 0; i < echantillon.length; i += 20) {
  const ids = echantillon.slice(i, i + 20).map((segment) => segment.id)
  liens.push(...await toutesLesPages(() => db.from('liens_bibliques')
    .select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis')
    .in('segment_id', ids).order('segment_id')))
}
const cibles = [...new Set(liens.map((lien) => lien.canon_id).filter(Boolean))]
const temoins = []
for (let i = 0; i < cibles.length; i += 100) {
  const { data, error } = await db.from('versets_lecture')
    .select('id_verset,"TR0001","TR0003","TR0004"').in('id_verset', cibles.slice(i, i + 100))
  if (error) throw error
  temoins.push(...data)
}
const temoinsParId = new Map(temoins.map((temoin) => [temoin.id_verset, temoin]))
const liensParSegment = new Map()
for (const lien of liens) {
  const liste = liensParSegment.get(lien.segment_id) ?? []
  liste.push({ ...lien, temoin: lien.canon_id ? temoinsParId.get(lien.canon_id) ?? null : null })
  liensParSegment.set(lien.segment_id, liste)
}
const rapport = {
  generated_at: new Date().toISOString(),
  graine: GRAINE,
  methode: 'Six segments par livre, classés par SHA-256(graine|segment_numero).',
  population: segments.length,
  echantillon: echantillon.length,
  segments: echantillon.map((segment) => ({ ...segment, liens: liensParSegment.get(segment.id) ?? [] })),
}
mkdirSync('scripts/heptateuque/audit-reprise', { recursive: true })
const sortie = 'scripts/heptateuque/audit-reprise/controle-aleatoire-2026-08-02.json'
writeFileSync(sortie, `${JSON.stringify(rapport, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ sortie, graine: GRAINE, echantillon: rapport.echantillon,
  numeros: rapport.segments.map((segment) => segment.segment_numero) }, null, 2))
