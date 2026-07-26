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
if (!OEUVRE) { console.error('usage : node scripts/liens-controle.mjs <id_oeuvre> [--prov ia|editeur|lecture] [--fiab probable|douteux|...] [--type 1..4] [-n 15]'); process.exit(1) }

// Segments de l'œuvre (pour restreindre les liens et récupérer le texte).
const segs = new Map()
for (let from = 0; ; from += 1000) {
  const { data } = await sb.from('segments').select('id, segment_numero, ref_niv1, ref_niv2, segment_texte, texte_original')
    .eq('id_oeuvre', OEUVRE).eq('nature', 'texte').order('id').range(from, from + 999)
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
  for (const v of data ?? []) versets.set(v.id_verset, v.TR0003 || v.TR0001 || v.TR0004 || '')
}

const citation = t => (String(t || '').match(/«\s*([^»]{6,110})/) || [, null])[1]
console.log(`\n═══ CONTRÔLE — ${OEUVRE} · ${echantillon.length}/${liens.length} liens${PROV ? ` · prov=${PROV}` : ''}${FIAB ? ` · fiab=${FIAB}` : ''}${TYPE ? ` · type=${TYPE}` : ''} ═══\n`)
for (const l of echantillon) {
  const s = segs.get(l.segment_id)
  const src = s?.texte_original ?? s?.segment_texte ?? ''
  const cite = citation(src)
  const cible = l.canon_id ? (versets.get(l.canon_id) ?? '(verset introuvable)') : `${l.livre} ch.${l.chapitre} (chapitre)`
  console.log(`• ${s?.ref_niv1 ?? '?'}${s?.ref_niv2 ? '/' + s.ref_niv2 : ''} #${s?.segment_numero}  [t${l.type} ${l.fiabilite} ${l.provenance}]`)
  console.log(`   segment : ${cite ? '« ' + cite + ' »' : src.replace(/\s+/g, ' ').slice(0, 100)}`)
  console.log(`   → ${l.canon_id ?? l.livre + '.' + l.chapitre} : ${String(cible).replace(/\s+/g, ' ').slice(0, 100)}\n`)
}
console.log(`À LIRE : pour chacun, la citation du segment correspond-elle au verset cible, et le type est-il juste ? Noter le taux d'erreur avant de poursuivre.`)
