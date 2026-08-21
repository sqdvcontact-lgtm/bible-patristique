// Reconstruction prudente des paragraphes/rangs de A0014O0038.
// Elle ne joint que les continuités syntaxiques solides et conserve les ref_niv2.
// Usage : node scripts/chrysostome-antioche-rangs-prudents.mjs [--write]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const WRITE = process.argv.includes('--write')
const OEUVRE = 'A0014O0038'
const segments = []

for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from('segments')
    .select('id,segment_numero,segment_texte,ref_niv1,ref_niv2,paragraphe,rang,controle_rang_manuel')
    .eq('id_oeuvre', OEUVRE).order('segment_numero').range(from, from + 999)
  if (error) throw error
  segments.push(...data)
  if (data.length < 1000) break
}
if (segments.length !== 2594) throw new Error(`2594 segments attendus, ${segments.length}`)

const minuscule = /^[a-zàâäéèêëîïôöùûüÿçœæ]/
const ponctuationContinuative = /[,;]\s*$/
const propositions = []
let division = null
let paragraphe = 0
let rang = 0
let precedent = null

for (const s of segments) {
  const nouvelleDivision = s.ref_niv1 !== division
  const continuer = !nouvelleDivision && precedent &&
    (minuscule.test(s.segment_texte ?? '') || ponctuationContinuative.test((precedent.segment_texte ?? '').trimEnd()))
  if (nouvelleDivision) {
    division = s.ref_niv1
    paragraphe = 1
    rang = 1
  } else if (continuer) {
    rang += 1
  } else {
    paragraphe += 1
    rang = 1
  }
  propositions.push({ ...s, nouveau_paragraphe: paragraphe, nouveau_rang: rang })
  precedent = s
}

const modifies = propositions.filter(s => s.paragraphe !== s.nouveau_paragraphe || s.rang !== s.nouveau_rang)
const groupes = new Map()
for (const s of propositions) {
  const cle = `${s.ref_niv1}\u0000${s.nouveau_paragraphe}`
  groupes.set(cle, Math.max(groupes.get(cle) ?? 0, s.nouveau_rang))
}
const tailles = [...groupes.values()]
console.log(`${modifies.length} segments à modifier sur ${segments.length}`)
console.log(`${groupes.size} paragraphes prudents · ${tailles.filter(n => n > 1).length} multi-segments · rang maximal ${Math.max(...tailles)}`)
console.log(`distribution : 1=${tailles.filter(n => n === 1).length} · 2–3=${tailles.filter(n => n >= 2 && n <= 3).length} · 4+=${tailles.filter(n => n >= 4).length}`)
if (!WRITE) process.exit(0)

mkdirSync('tmp/audit-backups', { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const backup = `tmp/audit-backups/${OEUVRE}-avant-rangs-prudents-${stamp}.json`
writeFileSync(backup, JSON.stringify(segments, null, 2))

for (let i = 0; i < modifies.length; i += 25) {
  const lot = modifies.slice(i, i + 25)
  await Promise.all(lot.map(async s => {
    const { error } = await sb.from('segments').update({
      paragraphe: s.nouveau_paragraphe,
      rang: s.nouveau_rang,
      controle_rang_manuel: 'critique',
    }).eq('id', s.id)
    if (error) throw error
  }))
}
console.log(`✓ ${modifies.length} segments écrits · sauvegarde ${backup}`)
