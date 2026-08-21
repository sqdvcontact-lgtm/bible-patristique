import { createClient } from '@supabase/supabase-js'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const WRITE = process.argv.includes('--write')
const OUT = 'tmp/eucher-links-2026-07-30'
const ids = [96015, 96016, 96019]
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(line => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(match => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const must = async (query, label) => {
  const { data, error } = await query
  if (error) throw new Error(`${label}: ${error.message}`)
  return data ?? []
}

const before = await must(db.from('liens_bibliques')
  .select('id,segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('id', ids).order('id'), 'liens')
if (before.length !== 3) throw new Error(`Précondition rompue : ${before.length}/3 liens`)
const expected = new Map([
  [96015, ['2CO.5.20', 2, 'douteux', true]],
  [96016, ['EPH.6.10', 4, 'douteux', true]],
  [96019, ['MAL.3.1', 1, 'douteux', true]],
])
for (const row of before) {
  const [canon, type, reliability, arbitration] = expected.get(row.id)
  if (row.canon_id !== canon || row.type !== type || row.fiabilite !== reliability || row.arbitrage_requis !== arbitration) {
    throw new Error(`Précondition rompue pour ${row.id}: ${JSON.stringify(row)}`)
  }
}
const target = await must(db.from('versets_lecture').select('id_verset,"TR0001","TR0003","TR0004"').eq('id_verset', 'EPH.6.20'), 'EPH.6.20')
if (target.length !== 1 || !/l[ée]gation|ambassad/i.test(`${target[0].TR0001} ${target[0].TR0003}`)) throw new Error('EPH.6.20 non confirmé par le contenu')

const changes = [
  {
    id: 96015,
    values: {
      fiabilite: 'vérifié', arbitrage_requis: false,
      motif: 'Le latin de l’œuvre reprend explicitement la fonction d’ambassadeur : « legatione apud vos fungimur » ; la traduction française en conserve l’exhortation.',
    },
  },
  {
    id: 96016,
    values: {
      canon_id: 'EPH.6.20', type: 2, fiabilite: 'vérifié', arbitrage_requis: false,
      motif: 'Le latin imprime Éphésiens 6, 20 et reprend « legatione apud vos fungimur », formulation de l’ambassadeur intégrée au discours. La note française « Eph. 6. 10 » est conservée comme leçon de l’édition.',
    },
  },
  {
    id: 96019,
    values: {
      fiabilite: 'vérifié', arbitrage_requis: false,
      motif: 'Le français et le latin de l’édition attribuent tous deux cette citation à Malachie 3, 1 ; le latin porte « Preparemus, ut scriptum est, ad exitum vias nostras ».',
    },
  },
]
mkdirSync(OUT, { recursive: true })
writeFileSync(`${OUT}/before-final-link-fix.json`, `${JSON.stringify({ created_at: new Date().toISOString(), before, changes, target: target[0] }, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ mode: WRITE ? 'write' : 'dry', before, changes }, null, 2))
if (!WRITE) process.exit(0)

for (const change of changes) {
  const current = before.find(row => row.id === change.id)
  const { data, error } = await db.from('liens_bibliques').update(change.values)
    .eq('id', change.id).eq('canon_id', current.canon_id).eq('type', current.type)
    .eq('fiabilite', current.fiabilite).eq('arbitrage_requis', current.arbitrage_requis)
    .select('id')
  if (error) throw error
  if (data.length !== 1) throw new Error(`Écriture concurrente refusée pour ${change.id}`)
}
const after = await must(db.from('liens_bibliques')
  .select('id,segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('id', ids).order('id'), 'vérification')
console.log(JSON.stringify({ mode: 'written-and-verified', after }, null, 2))
