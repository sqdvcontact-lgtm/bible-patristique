// CONTRÔLE PAR SONDAGE (charte §9.0 / protocole liens) — à lancer à la FIN de
// chaque passe, et périodiquement pendant une longue lecture. Tire des liens AU
// HASARD et sort, pour chacun, l'extrait du segment (citation) + le verset cible,
// pour que je les LISE et juge : la cible est-elle la bonne ? le type est-il juste ?
// But : s'apercevoir d'une erreur systématique TOUT DE SUITE, pas après 10 000 liens.
//
//   node scripts/liens-controle.mjs A0010O0004 -n 15
//   node scripts/liens-controle.mjs A0013O0002 --prov ia --fiab douteux
//   node scripts/liens-controle.mjs A0010O0004 --type 1 --fiab probable -n 20
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const arg = (nom, def) => { const i = process.argv.indexOf(nom); return i >= 0 ? process.argv[i + 1] : def }
const OEUVRE = process.argv.find(a => /^A\d{4}O\d{4}$/.test(a))
const N = +arg('-n', arg('--n', 15))
const PROV = arg('--prov', null), FIAB = arg('--fiab', null), TYPE = arg('--type', null)
const QFROM = +(arg('--q-from', 0)), QTO = +(arg('--q-to', 0))
const NIV1 = arg('--niv1', null)
if (!OEUVRE) { console.error('usage : node scripts/liens-controle.mjs <id_oeuvre> [--prov ia|editeur|lecture] [--fiab probable|douteux|...] [--type 1..4] [-n 15]'); process.exit(1) }

// Segments de l'œuvre (pour restreindre les liens et récupérer le texte).
const segs = new Map()
for (let from = 0; ; from += 1000) {
  let query = sb.from('segments').select('id, segment_numero, ref_niv1, ref_niv2, segment_texte, texte_original')
    .eq('id_oeuvre', OEUVRE).in('nature', ['texte', 'citation']).order('id').range(from, from + 999)
  if (NIV1) query = query.eq('ref_niv1', NIV1)
  if (QFROM && QTO) query = query.in('ref_niv2', Array.from({ length: QTO - QFROM + 1 }, (_, i) => `Question ${QFROM + i}`))
  const { data } = await query
  if (!data?.length) break
  for (const s of data) segs.set(s.id, s)
  if (data.length < 1000) break
}
const ids = [...segs.keys()]

// Liens de l'œuvre (filtrés par strate), tirés au hasard.
const liens = []
for (let i = 0; i < ids.length; i += 300) {
  let q = sb.from('liens_bibliques').select('id, segment_id, canon_id, livre, chapitre, type, fiabilite, provenance')
    .in('segment_id', ids.slice(i, i + 300))
  if (PROV) q = q.eq('provenance', PROV)
  if (FIAB) q = q.eq('fiabilite', FIAB)
  if (TYPE) q = q.eq('type', +TYPE)
  const { data } = await q
  liens.push(...(data ?? []))
}
if (!liens.length) { console.log('Aucun lien pour cette strate.'); process.exit(0) }
for (let i = liens.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[liens[i], liens[j]] = [liens[j], liens[i]] }
const echantillon = liens.slice(0, N)

// Textes des versets cibles.
const canons = [...new Set(echantillon.map(l => l.canon_id).filter(Boolean))]
const versets = new Map()
for (let i = 0; i < canons.length; i += 200) {
  const { data } = await sb.from('versets_lecture').select('id_verset, "TR0003", "TR0001", "TR0004"').in('id_verset', canons.slice(i, i + 200))
  for (const v of data ?? []) versets.set(v.id_verset, v)
}

// Un segment peut contenir plusieurs citations. Ne jamais afficher aveuglément la
// première face à toutes les cibles : choisir l'ancre dont le vocabulaire recoupe
// le mieux le verset, puis conserver assez de contexte pour contrôler les types 3/4.
const stop = new Set('avec dans pour plus cette comme mais donc ainsi sont avoir être elle elles nous vous leur leurs tout tous toute toutes une des les que qui par sur aux ses ces est car'.split(' '))
const tokens = value => new Set(String(value || '').normalize('NFD').replace(/\p{Diacritic}/gu, '')
  .toLowerCase().match(/[a-z]{3,}/g)?.filter(w => !stop.has(w)) ?? [])
const bestWitness = (texte, witnesses) => {
  if (!witnesses) return { label: '?', text: '(verset introuvable)' }
  const sourceTokens = tokens(texte)
  return ['TR0001', 'TR0003', 'TR0004'].map(label => ({ label, text: witnesses[label] || '' }))
    .filter(x => x.text).map(x => ({ ...x, score: [...tokens(x.text)].filter(w => sourceTokens.has(w)).length }))
    .sort((a, b) => b.score - a.score)[0]
}
const citation = (texte, cible) => {
  const quotes = [...String(texte || '').matchAll(/«\s*([^»]{6,500})\s*»/g)].map(m => m[1])
  if (!quotes.length) return null
  const wanted = tokens(cible)
  const ranked = quotes.map(q => ({ q, score: [...tokens(q)].filter(w => wanted.has(w)).length }))
    .sort((a, b) => b.score - a.score)
  return ranked[0].score >= 2 ? ranked[0].q : null
}
console.log(`\n═══ CONTRÔLE — ${OEUVRE} · ${echantillon.length}/${liens.length} liens${PROV ? ` · prov=${PROV}` : ''}${FIAB ? ` · fiab=${FIAB}` : ''}${TYPE ? ` · type=${TYPE}` : ''} ═══\n`)
for (const l of echantillon) {
  const s = segs.get(l.segment_id)
  const src = s?.texte_original ?? s?.segment_texte ?? ''
  const witness = l.canon_id ? bestWitness(src, versets.get(l.canon_id)) : null
  const cible = witness?.text ?? `${l.livre} ch.${l.chapitre} (chapitre)`
  const cite = citation(src, cible)
  const contexte = src.replace(/\s+/g, ' ').slice(0, 420)
  console.log(`• ${s?.ref_niv1 ?? '?'}${s?.ref_niv2 ? '/' + s.ref_niv2 : ''} #${s?.segment_numero}  [t${l.type} ${l.fiabilite} ${l.provenance}]`)
  console.log(`   ancre   : ${cite ? '« ' + cite + ' »' : '(pas d’ancre littérale sûre — lire le contexte)'}`)
  console.log(`   contexte: ${contexte}`)
  console.log(`   → ${l.canon_id ?? l.livre + '.' + l.chapitre}${witness ? ` [${witness.label}]` : ''} : ${String(cible).replace(/\s+/g, ' ').slice(0, 220)}\n`)
}
console.log(`À LIRE : pour chacun, la citation du segment correspond-elle au verset cible, et le type est-il juste ? Noter le taux d'erreur avant de poursuivre.`)
