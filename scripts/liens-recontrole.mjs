// RECONTRÔLE EXHAUSTIF DES LIENS D'UNE ŒUVRE (protocole liens, chantier 26/07/2026).
// Contrairement au sondage aléatoire (`liens-controle.mjs`), celui-ci sort TOUS les
// liens d'une œuvre, chacun avec l'extrait du segment ET le texte du verset cible,
// pour que je les LISE un par un et reclasse le type si besoin.
//
// Motif : type 2 (paraphrase fondue) quasi absent du corpus (30/19426) — signe que
// j'ai versé des paraphrases fondues en type 1 ou type 4. Voir la fiche
// feedback_types_discriminateur : frontière type 2 (mots du verset repris) vs type 4
// (motif SANS reprise verbale) vs type 3 (explique le verset).
//
//   node scripts/liens-recontrole.mjs A0010O0055            (toute l'œuvre)
//   node scripts/liens-recontrole.mjs A0013O0002 --type 4   (une strate)
//   node scripts/liens-recontrole.mjs A0017O0001 --de 200 --a 260
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const arg = (nom, def) => { const i = process.argv.indexOf(nom); return i >= 0 ? process.argv[i + 1] : def }
const OEUVRE = process.argv.find(a => /^A\d{4}O\d{4}$/.test(a))
const TYPE = arg('--type', null), PROV = arg('--prov', null)
const DE = +arg('--de', 0), A = +arg('--a', 1e9)
if (!OEUVRE) { console.error('usage : node scripts/liens-recontrole.mjs <id_oeuvre> [--type 1..4] [--prov ia|editeur|lecture] [--de N --a M]'); process.exit(1) }

// Segments de l'œuvre.
const segs = new Map()
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from('segments')
    .select('id, segment_numero, ref_niv1, ref_niv2, segment_texte, texte_original, nature')
    .eq('id_oeuvre', OEUVRE).order('id').range(from, from + 999)
  if (error) { console.error(error); process.exit(1) }
  if (!data?.length) break
  for (const s of data) segs.set(s.id, s)
  if (data.length < 1000) break
}
const ids = [...segs.keys()]

// Liens de l'œuvre.
let liens = []
for (let i = 0; i < ids.length; i += 300) {
  let q = sb.from('liens_bibliques')
    .select('id, segment_id, canon_id, verset_v2_id, livre, chapitre, type, fiabilite, provenance, motif, arbitrage_requis')
    .in('segment_id', ids.slice(i, i + 300))
  if (TYPE) q = q.eq('type', +TYPE)
  if (PROV) q = q.eq('provenance', PROV)
  const { data, error } = await q
  if (error) { console.error(error); process.exit(1) }
  liens.push(...(data ?? []))
}
// Ordonner par segment_numero puis type.
liens.sort((a, b) => (segs.get(a.segment_id)?.segment_numero - segs.get(b.segment_id)?.segment_numero) || a.type - b.type)
liens = liens.filter(l => { const n = segs.get(l.segment_id)?.segment_numero ?? 0; return n >= DE && n <= A })

// Textes des versets cibles (Crampon TR0003, Sacy TR0001, Segond TR0002).
const canons = [...new Set(liens.map(l => l.canon_id).filter(Boolean))]
const versets = new Map()
for (let i = 0; i < canons.length; i += 200) {
  const { data } = await sb.from('versets_lecture').select('id_verset, "TR0003", "TR0001", "TR0002"').in('id_verset', canons.slice(i, i + 200))
  for (const v of data ?? []) versets.set(v.id_verset, v)
}
const clean = t => String(t || '').replace(/\s+/g, ' ').trim()

console.log(`\n═══ RECONTRÔLE — ${OEUVRE} · ${liens.length} liens${TYPE ? ` · type=${TYPE}` : ''}${PROV ? ` · prov=${PROV}` : ''} ═══`)
console.log('Pour chaque lien : le segment reprend-il les MOTS du verset (→ t1/t2) ? explique-t-il le verset (→ t3) ? ou n\'en garde-t-il que le motif (→ t4) ?\n')
let cur = null
for (const l of liens) {
  const s = segs.get(l.segment_id)
  if (cur !== l.segment_id) {
    cur = l.segment_id
    console.log(`\n──── #${s?.segment_numero} ${s?.ref_niv1 ?? ''}${s?.ref_niv2 ? '/' + s.ref_niv2 : ''} [${s?.nature}] ────`)
    console.log(`SEG: ${clean(s?.segment_texte).slice(0, 320)}`)
    if (s?.texte_original && clean(s.texte_original) !== clean(s.segment_texte))
      console.log(`ORIG: ${clean(s.texte_original).slice(0, 200)}`)
  }
  const v = versets.get(l.canon_id)
  const cible = l.canon_id
    ? `${l.canon_id} — ${clean(v?.TR0003 || v?.TR0001 || v?.TR0002 || '(verset introuvable)').slice(0, 180)}`
    : l.verset_v2_id ? `surnuméraire v2#${l.verset_v2_id}` : `${l.livre} ch.${l.chapitre} (chapitre entier)`
  console.log(`  • [t${l.type} ${l.fiabilite} ${l.provenance}${l.arbitrage_requis ? ' ARB' : ''}] id=${l.id}`)
  console.log(`    cible : ${cible}`)
  console.log(`    motif : ${clean(l.motif) || '—'}`)
}
console.log(`\n${liens.length} liens listés.`)
