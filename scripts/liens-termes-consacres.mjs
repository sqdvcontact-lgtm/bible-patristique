// PASSE 3 — TERMES CONSACRÉS (charte §9.0 / liste des péricopes désignées par
// leur nom traditionnel). Un terme consacré (« les Béatitudes », « le Décalogue »)
// nomme une péricope sans la citer → lien de type 3 ou 4, JAMAIS type 1.
//
// La cible est le CHAPITRE (péricope = intervalle) : on pose un lien vers le
// chapitre entier, ce que la table sait faire (livre + chapitre). Fiabilité
// « à constituer » + arbitrage : la lecture confirmera le rapport (3 vs 4) et
// écartera les faux amis (« la béatitude » = le bonheur, ≠ les Béatitudes de Mt 5 ;
// on n'apparie que le PLURIEL, marqueur de la péricope).
//
//   node scripts/liens-termes-consacres.mjs A0013O0002 --dry [--partie="..."]
//   node scripts/liens-termes-consacres.mjs A0013O0002
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { verifierLienMecanique } from './_liens-commun.mjs'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const OEUVRE = process.argv.find(a => /^A\d{4}O\d{4}$/.test(a))
const DRY = process.argv.includes('--dry')
const PARTIE = (process.argv.find(a => a.startsWith('--partie=')) || '').split('=').slice(1).join('=') || null
if (!OEUVRE) { console.error('usage : node scripts/liens-termes-consacres.mjs <id_oeuvre> [--dry] [--partie="..."]'); process.exit(1) }

// Liste de la charte. `re` = forme(s) consacrée(s) ; `cibles` = chapitre(s) de la
// péricope. « béatitudes » au PLURIEL seulement (le singulier = le concept).
const TERMES = [
  { nom: 'les Béatitudes',            re: /b[ée]atitudes/i,                               cibles: [['MAT', 5]] },
  { nom: 'le Décalogue',              re: /d[ée]calogue|dix\s+commandements|dix\s+pr[ée]ceptes/i, cibles: [['EXO', 20]] },
  // « Notre Père » écarté : ambigu (invocation trinitaire vs prière) ; on ne
  // retient que les désignations liturgiques non équivoques de la péricope.
  { nom: "l'Oraison dominicale",      re: /oraison\s+dominicale|pater\s+noster/i, cibles: [['MAT', 6]] },
  { nom: 'le Magnificat',             re: /magnificat/i,                                  cibles: [['LUK', 1]] },
  { nom: 'le Nunc dimittis',          re: /nunc\s+dimittis/i,                             cibles: [['LUK', 2]] },
  { nom: 'le Prologue de saint Jean', re: /prologue\s+de\s+(?:saint\s+|s\.\s*)?jean|prologue\s+de\s+l['’]évangile/i, cibles: [['JHN', 1]] },
  { nom: 'le Sermon sur la montagne', re: /(?:sermon|discours)\s+sur\s+la\s+montagne/i,   cibles: [['MAT', 5], ['MAT', 6], ['MAT', 7]] },
  { nom: 'la Cène',                   re: /\bla\s+c[èe]ne\b|institution\s+de\s+l['’]eucharistie/i, cibles: [['MAT', 26]] },
]

// Ossature : le chapitre visé doit exister (un trigger le refuse sinon).
const chapitres = new Set()
for (let from = 0; ; from += 1000) {
  const { data } = await sb.from('versets_canon').select('livre, ch_canon').order('id').range(from, from + 999)
  if (!data?.length) break
  for (const r of data) chapitres.add(`${r.livre}.${r.ch_canon}`)
  if (data.length < 1000) break
}

const segs = []
for (let from = 0; ; from += 1000) {
  let q = sb.from('segments').select('id, segment_numero, segment_texte, texte_original').eq('id_oeuvre', OEUVRE).eq('nature', 'texte')
  if (PARTIE) q = q.eq('ref_niv1', PARTIE)
  const { data } = await q.order('id').range(from, from + 999)
  if (!data?.length) break; segs.push(...data); if (data.length < 1000) break
}
const ids = segs.map(s => s.id)
// Ne pas doublonner un chapitre déjà lié sur ce segment (toutes provenances/types).
const deja = new Set()
for (let i = 0; i < ids.length; i += 300) {
  const { data } = await sb.from('liens_bibliques').select('segment_id, canon_id, livre, chapitre').in('segment_id', ids.slice(i, i + 300))
  for (const l of data ?? []) deja.add(`${l.segment_id}|${l.canon_id ?? l.livre + '.' + l.chapitre}`)
}
console.log(`${segs.length} segments${PARTIE ? ` (${PARTIE})` : ''}`)

const liens = []
const parTerme = {}
for (const s of segs) {
  // On lit le texte D'ORIGINE si le corps a été nettoyé (le terme y est intact).
  const texte = String(s.texte_original ?? s.segment_texte ?? '')
  for (const t of TERMES) {
    if (!t.re.test(texte)) continue
    for (const [livre, ch] of t.cibles) {
      if (!chapitres.has(`${livre}.${ch}`)) continue
      const cle = `${s.id}|${livre}.${ch}`
      if (deja.has(cle)) continue
      deja.add(cle)
      parTerme[t.nom] = (parTerme[t.nom] ?? 0) + 1
      liens.push({
        segment_id: s.id, livre, chapitre: ch, type: 3,
        fiabilite: 'à constituer', provenance: 'ia', arbitrage_requis: true,
        motif: `Terme consacré « ${t.nom} » → péricope ${livre} ${ch} (chapitre). Type 3/4 à confirmer en lecture.`,
      })
    }
  }
}

console.log(`${liens.length} liens (termes consacrés) · ${JSON.stringify(parTerme)}`)
if (DRY) {
  for (const l of liens.slice(0, 12)) {
    const s = segs.find(x => x.id === l.segment_id)
    console.log(`  seg ${s.segment_numero}  ${l.livre}.${l.chapitre}  ${l.motif.slice(0, 52)}`)
  }
  console.log('\n(--dry : rien écrit)'); process.exit(0)
}
liens.forEach(verifierLienMecanique)   // garde-fou : t3 admis SEULEMENT en 'à constituer'
for (let i = 0; i < liens.length; i += 500) {
  const { error } = await sb.from('liens_bibliques').insert(liens.slice(i, i + 500))
  if (error) throw error
}
console.log(`\n✓ ${liens.length} liens écrits (type 3, à constituer, provenance ia)`)
