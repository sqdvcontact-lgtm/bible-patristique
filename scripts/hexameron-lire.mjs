// LECTURE DE L'HEXAÉMÉRON — dumper par homélie (division ref_niv1).
// Sort chaque segment (numéro + texte) avec les cibles DÉJÀ posées (amorce
// éditoriale « à constituer »), pour que je LISE et qualifie le rapport
// (types 1/2/3/4). C'est MON travail ; l'utilisateur contrôle les lots.
//
//   node scripts/hexameron-lire.mjs "Première homélie"
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const NIV1 = process.argv[2]
if (!NIV1) { console.error('usage : node scripts/hexameron-lire.mjs "Première homélie"'); process.exit(1) }

const segs = []
for (let from = 0; ; from += 1000) {
  const { data } = await sb.from('segments').select('id, segment_numero, ref_niv2, segment_texte, texte_original')
    .eq('id_oeuvre', 'A0017O0001').eq('nature', 'texte').eq('ref_niv1', NIV1).order('segment_numero').range(from, from + 999)
  if (!data?.length) break
  segs.push(...data); if (data.length < 1000) break
}
const liens = new Map()
for (let i = 0; i < segs.length; i += 300) {
  const { data } = await sb.from('liens_bibliques').select('segment_id, canon_id, livre, chapitre, type, fiabilite')
    .in('segment_id', segs.slice(i, i + 300).map(s => s.id))
  for (const l of data ?? []) { (liens.get(l.segment_id) ?? liens.set(l.segment_id, []).get(l.segment_id)).push(l) }
}
console.log(`### ${NIV1} — ${segs.length} segments\n`)
for (const s of segs) {
  const ls = (liens.get(s.id) ?? []).map(l => `${l.canon_id ?? l.livre + '.ch' + l.chapitre}[t${l.type}/${l.fiabilite}]`).join(' ')
  console.log(`#${s.segment_numero}${ls ? '  «' + ls + '»' : ''}\n${(s.texte_original ?? s.segment_texte).replace(/\s+/g, ' ').trim()}\n`)
}
